import { supabase } from "@/integrations/supabase/client";
import { BusinessDocument, DocumentMetrics, SalesDocumentType, PurchaseDocumentType, DocumentStatus } from "@/types/documents";

const STORAGE_KEY_PREFIX = "credsmart_docs_";

export function normalizeDocumentBillingFields<T extends Partial<BusinessDocument>>(doc: T): T & Pick<BusinessDocument, "billingAddress" | "billingPincode" | "billingPlaceOfSupply"> {
  const safePartyAddress = (doc.partyAddress || "").trim();
  const safeBillingAddress = (doc.billingAddress || safePartyAddress).trim();
  const safeBillingPincode = (doc.billingPincode || "").trim();
  const safeBillingPlaceOfSupply = (doc.billingPlaceOfSupply || doc.placeOfSupply || "27-Maharashtra").trim();

  return {
    ...doc,
    partyAddress: safePartyAddress || undefined,
    billingAddress: safeBillingAddress || undefined,
    billingPincode: safeBillingPincode || undefined,
    billingPlaceOfSupply: safeBillingPlaceOfSupply || undefined,
  } as T & Pick<BusinessDocument, "billingAddress" | "billingPincode" | "billingPlaceOfSupply">;
}

type CustomerSummary = {
  name?: string | null;
  phone?: string | null;
  gstin?: string | null;
};

type SalesRow = {
  id: string;
  invoice_number?: string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  payment_method?: string | null;
  created_at?: string | null;
  customer_id?: string | null;
  customers?: CustomerSummary | null;
  tax?: number | string | null;
  total?: number | string | null;
};

type PurchaseInvoiceRow = {
  id: string;
  invoice_number?: string | null;
  total_amount?: number | string | null;
  tax_amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  notes?: string | null;
  supplier_id?: string | null;
  suppliers?: CustomerSummary | null;
};

type PurchaseReturnRow = {
  id: string;
  return_number?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  reason?: string | null;
  created_at?: string | null;
  supplier_id?: string | null;
  suppliers?: CustomerSummary | null;
};

function getStorageKey(orgId: string, docType: string): string {
  return `${STORAGE_KEY_PREFIX}${orgId}_${docType}`;
}

export const documentsService = {
  // Get local custom documents for any type
  getLocalDocuments(orgId: string, docType: string): BusinessDocument[] {
    try {
      const data = localStorage.getItem(getStorageKey(orgId, docType));
      if (!data) return [];

      const parsed = JSON.parse(data) as BusinessDocument[];
      const normalized = parsed.map((doc) => normalizeDocumentBillingFields(doc));
      const changed = normalized.some((doc, index) => {
        const original = parsed[index];
        return JSON.stringify(doc) !== JSON.stringify(original);
      });
      if (changed) {
        this.saveLocalDocuments(orgId, docType, normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  },

  saveLocalDocuments(orgId: string, docType: string, docs: BusinessDocument[]) {
    try {
      localStorage.setItem(getStorageKey(orgId, docType), JSON.stringify(docs));
    } catch (error) {
      console.error("Failed to save local docs:", error);
    }
  },

  // Unified fetch for Sales Documents
  async fetchSalesDocuments(orgId: string, docType: SalesDocumentType): Promise<BusinessDocument[]> {
    if (!orgId) return [];

    const localDocs = this.getLocalDocuments(orgId, docType);

    // If fetching standard sales invoices, also query Supabase `sales` and merge
    if (docType === "sales_invoice") {
      try {
        const { data: sales, error } = await supabase
          .from("sales")
          .select(`
            id,
            invoice_number,
            subtotal,
            discount_amount,
            discount_label,
            tax,
            total,
            payment_method,
            created_at,
            customer_id,
            customers ( name, phone )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (!error && sales) {
          const supabaseDocs: BusinessDocument[] = (sales as SalesRow[]).map((s) => {
            const customer = s.customers;
            const isEstimate = s.payment_method?.toLowerCase() === "estimate";
            return {
              id: s.id,
              organizationId: orgId,
              docType: isEstimate ? "quotation" : "sales_invoice",
              documentNumber: s.invoice_number || `INV-${s.id.slice(0, 6)}`,
              partyId: s.customer_id,
              partyName: customer?.name || "Cash Customer",
              partyPhone: customer?.phone || "",
              partyGstin: customer?.gstin || "",
              docDate: s.created_at ? s.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              dueDate: s.created_at ? s.created_at.split("T")[0] : undefined,
              items: [],
              subtotal: Number(s.subtotal || 0),
              discountTotal: Number(s.discount_amount || 0),
              taxableTotal: Number((s.subtotal || 0) - (s.discount_amount || 0)),
              cgstTotal: Number((s.tax || 0) / 2),
              sgstTotal: Number((s.tax || 0) / 2),
              igstTotal: 0,
              taxTotal: Number(s.tax || 0),
              roundOff: 0,
              grandTotal: Number(s.total || 0),
              paidAmount: Number(s.total || 0),
              balanceDue: 0,
              status: "paid" as DocumentStatus,
              paymentMethod: s.payment_method || "Cash",
              created_at: s.created_at,
            };
          });

          // Merge supabaseDocs with localDocs (avoiding duplicate IDs)
          const merged = [...localDocs];
          for (const sDoc of supabaseDocs) {
            if (!merged.some((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber)) {
              merged.push(sDoc);
            }
          }
          // Sort descending by date
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn("Supabase sales fetch error:", err);
      }
    }

    return localDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Unified fetch for Purchase Documents
  async fetchPurchaseDocuments(orgId: string, docType: PurchaseDocumentType): Promise<BusinessDocument[]> {
    if (!orgId) return [];

    const localDocs = this.getLocalDocuments(orgId, docType);

    if (docType === "purchase_invoice") {
      try {
        const { data, error } = await supabase
          .from("purchase_invoices")
          .select(`
            id,
            invoice_number,
            total_amount,
            tax_amount,
            status,
            created_at,
            notes,
            supplier_id,
            suppliers ( name, phone, gstin )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const supabaseDocs: BusinessDocument[] = (data as PurchaseInvoiceRow[]).map((inv) => {
            const supplier = inv.suppliers;
            return {
              id: inv.id,
              organizationId: orgId,
              docType: "purchase_invoice",
              documentNumber: inv.invoice_number || `PI-${inv.id.slice(0, 6)}`,
              partyId: inv.supplier_id,
              partyName: supplier?.name || "Unknown Supplier",
              partyPhone: supplier?.phone || "",
              partyGstin: supplier?.gstin || "",
              docDate: inv.created_at ? inv.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              dueDate: undefined,
              items: [],
              subtotal: Number(inv.total_amount || 0) - Number(inv.tax_amount || 0),
              discountTotal: 0,
              taxableTotal: Number(inv.total_amount || 0) - Number(inv.tax_amount || 0),
              cgstTotal: Number((inv.tax_amount || 0) / 2),
              sgstTotal: Number((inv.tax_amount || 0) / 2),
              igstTotal: 0,
              taxTotal: Number(inv.tax_amount || 0),
              roundOff: 0,
              grandTotal: Number(inv.total_amount || 0),
              paidAmount: inv.status === "received" ? Number(inv.total_amount || 0) : 0,
              balanceDue: inv.status === "received" ? 0 : Number(inv.total_amount || 0),
              status: (inv.status === "received" ? "paid" : inv.status === "draft" ? "draft" : "unpaid") as DocumentStatus,
              notes: inv.notes || "",
              created_at: inv.created_at,
            };
          });

          const merged = [...localDocs];
          for (const sDoc of supabaseDocs) {
            if (!merged.some((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber)) {
              merged.push(sDoc);
            }
          }
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn("Supabase purchase invoices fetch error:", err);
      }
    }

    if (docType === "purchase_return" || docType === "debit_note") {
      try {
        const { data, error } = await supabase
          .from("purchase_returns")
          .select(`
            id,
            return_number,
            total_amount,
            status,
            reason,
            created_at,
            supplier_id,
            suppliers ( name, phone, gstin )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const supabaseDocs: BusinessDocument[] = (data as PurchaseReturnRow[]).map((ret) => ({
            id: ret.id,
            organizationId: orgId,
            docType: docType,
            documentNumber: ret.return_number || `DN-${ret.id.slice(0, 6)}`,
            partyId: ret.supplier_id,
            partyName: ret.suppliers?.name || "Unknown Supplier",
            partyPhone: ret.suppliers?.phone || "",
            partyGstin: ret.suppliers?.gstin || "",
            docDate: ret.created_at ? ret.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
            items: [],
            subtotal: Number(ret.total_amount || 0),
            discountTotal: 0,
            taxableTotal: Number(ret.total_amount || 0),
            cgstTotal: 0,
            sgstTotal: 0,
            igstTotal: 0,
            taxTotal: 0,
            roundOff: 0,
            grandTotal: Number(ret.total_amount || 0),
            paidAmount: Number(ret.total_amount || 0),
            balanceDue: 0,
            status: ret.status === "completed" ? "paid" : "draft",
            notes: ret.reason || "",
            created_at: ret.created_at,
          }));

          const merged = [...localDocs];
          for (const sDoc of supabaseDocs) {
            if (!merged.some((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber)) {
              merged.push(sDoc);
            }
          }
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn("Supabase purchase returns fetch error:", err);
      }
    }

    return localDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Save or Update Document
  async saveDocument(doc: BusinessDocument, userId?: string): Promise<BusinessDocument> {
    const orgId = doc.organizationId;
    const docType = doc.docType;

    // 1. If standard sales invoice, attempt saving to Supabase sales table
    if (docType === "sales_invoice" && userId) {
      try {
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .insert({
            organization_id: orgId,
            invoice_number: doc.documentNumber,
            subtotal: doc.subtotal,
            discount_amount: doc.discountTotal,
            discount_label: doc.discountTotal > 0 ? "Discount" : null,
            tax: doc.taxTotal,
            total: doc.grandTotal,
            payment_method: doc.paymentMethod || "Cash",
            created_by: userId,
            customer_id: doc.partyId || null,
          })
          .select()
          .single();

        if (!saleErr && saleData) {
          doc.id = saleData.id;

          // Save items
          if (doc.items.length > 0) {
            const saleItems = doc.items.map((it) => ({
              sale_id: saleData.id,
              product_name: it.productName,
              product_id: it.productId || null,
              batch_number: it.batchNumber || null,
              mrp: it.rate,
              quantity: it.quantity,
              line_total: it.lineTotal,
            }));
            await supabase.from("sale_items").insert(saleItems);
          }
        }
      } catch (err) {
        console.warn("Supabase sales save fallback to local storage:", err);
      }
    }

    // 2. If purchase invoice, attempt saving to Supabase purchase_invoices
    if (docType === "purchase_invoice" && userId && doc.partyId) {
      try {
        const { data: piData, error: piErr } = await supabase
          .from("purchase_invoices")
          .insert({
            organization_id: orgId,
            supplier_id: doc.partyId,
            invoice_number: doc.documentNumber,
            total_amount: doc.grandTotal,
            tax_amount: doc.taxTotal,
            status: doc.status === "paid" ? "received" : "sent",
            notes: doc.notes || null,
            created_by: userId,
          })
          .select()
          .single();

        if (!piErr && piData) {
          doc.id = piData.id;
          if (doc.items.length > 0) {
            const piItems = doc.items.map((it) => ({
              purchase_invoice_id: piData.id,
              product_id: it.productId || null,
              quantity: it.quantity,
              cost_price: it.rate,
              mrp: it.rate,
              batch_number: it.batchNumber || "BATCH-01",
              expiry_date: it.expiryDate || null,
            }));
            await supabase.from("purchase_invoice_items").insert(piItems);
          }
        }
      } catch (err) {
        console.warn("Supabase purchase invoice save fallback to local storage:", err);
      }
    }

    // 3. Save / Update in Local Storage cache
    const existingList = this.getLocalDocuments(orgId, docType);
    const index = existingList.findIndex((d) => d.id === doc.id || d.documentNumber === doc.documentNumber);

    if (index >= 0) {
      existingList[index] = { ...doc, updated_at: new Date().toISOString() };
    } else {
      existingList.unshift(doc);
    }

    this.saveLocalDocuments(orgId, docType, existingList);
    return doc;
  },

  // Delete Document
  async deleteDocument(orgId: string, docType: string, docId: string): Promise<boolean> {
    const list = this.getLocalDocuments(orgId, docType);
    const updated = list.filter((d) => d.id !== docId);
    this.saveLocalDocuments(orgId, docType, updated);

    // If sales invoice
    if (docType === "sales_invoice") {
      try {
        await supabase.from("sales").delete().eq("id", docId);
      } catch (error) {
        console.warn("Failed to delete sales document from Supabase:", error);
      }
    }

    // If purchase invoice
    if (docType === "purchase_invoice") {
      try {
        await supabase.from("purchase_invoices").delete().eq("id", docId);
      } catch (error) {
        console.warn("Failed to delete purchase document from Supabase:", error);
      }
    }

    return true;
  },

  // Calculate Metrics for a document list
  calculateMetrics(docs: BusinessDocument[]): DocumentMetrics {
    let totalAmount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let cancelledAmount = 0;
    const totalCount = docs.length;
    let paidCount = 0;
    let unpaidCount = 0;
    let cancelledCount = 0;

    for (const doc of docs) {
      if (doc.status === "cancelled") {
        cancelledAmount += doc.grandTotal;
        cancelledCount++;
      } else {
        totalAmount += doc.grandTotal;
        paidAmount += doc.paidAmount || (doc.status === "paid" ? doc.grandTotal : 0);
        const unpaid = (doc.grandTotal || 0) - (doc.paidAmount || (doc.status === "paid" ? doc.grandTotal : 0));
        unpaidAmount += Math.max(0, unpaid);

        if (doc.status === "paid") paidCount++;
        else unpaidCount++;
      }
    }

    return {
      totalAmount,
      paidAmount,
      unpaidAmount,
      cancelledAmount,
      totalCount,
      paidCount,
      unpaidCount,
      cancelledCount,
    };
  },

  // Generate Next Document Number
  getNextDocumentNumber(prefix: string, count: number): string {
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(3, "0");
    return `${prefix}${year}-${seq}`;
  },
};
