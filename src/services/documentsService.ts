import { supabase } from "@/integrations/supabase/client";
import { BusinessDocument, DocumentMetrics, SalesDocumentType, PurchaseDocumentType, DocumentStatus } from "@/types/documents";
import { stockService } from "@/services/stockService";

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

    // If fetching sales return or credit note, also query Supabase `sales_returns` and merge
    if (docType === "sales_return" || docType === "credit_note") {
      try {
        const { data: returns, error } = await supabase
          .from("sales_returns")
          .select(`
            *,
            sales_return_items (*)
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (!error && returns) {
          interface RawReturnItem {
            id: string;
            product_id?: string | null;
            product_name?: string | null;
            batch_number?: string | null;
            quantity?: number | null;
            unit?: string | null;
            alt_unit?: string | null;
            alt_qty?: number | null;
            alt_unit_conversion?: number | null;
            rate?: number | null;
            tax_rate?: number | null;
            discount_percent?: number | null;
            discount_amount?: number | null;
            taxable_amount?: number | null;
            cgst_amount?: number | null;
            sgst_amount?: number | null;
            igst_amount?: number | null;
            line_total?: number | null;
            return_reason?: string | null;
          }

          interface RawSalesReturn {
            id: string;
            return_number?: string | null;
            original_invoice_number?: string | null;
            original_invoice_date?: string | null;
            reason?: string | null;
            return_action?: BusinessDocument["returnAction"];
            settlement_mode?: BusinessDocument["settlementMode"];
            customer_id?: string | null;
            customer_name?: string | null;
            customer_phone?: string | null;
            customer_gstin?: string | null;
            customer_address?: string | null;
            place_of_supply?: string | null;
            return_date?: string | null;
            created_at: string;
            subtotal?: number | null;
            discount_amount?: number | null;
            taxable_amount?: number | null;
            cgst_amount?: number | null;
            sgst_amount?: number | null;
            igst_amount?: number | null;
            tax_amount?: number | null;
            round_off?: number | null;
            total_amount?: number | null;
            status?: string | null;
            notes?: string | null;
            sales_return_items?: RawReturnItem[];
          }

          const supabaseDocs: BusinessDocument[] = (returns as unknown as RawSalesReturn[]).map((r) => {
            const items = (r.sales_return_items || []).map((it) => ({
              id: it.id,
              productId: it.product_id || undefined,
              productName: it.product_name || "Returned Item",
              batchNumber: it.batch_number || "BATCH-01",
              quantity: Number(it.quantity || 1),
              unit: it.unit || "PCS",
              altUnit: it.alt_unit || undefined,
              altQty: it.alt_qty != null ? Number(it.alt_qty) : undefined,
              altUnitConversion: it.alt_unit_conversion != null ? Number(it.alt_unit_conversion) : undefined,
              rate: Number(it.rate || 0),
              taxRate: Number(it.tax_rate || 0),
              discountPercent: Number(it.discount_percent || 0),
              discountAmount: Number(it.discount_amount || 0),
              taxableAmount: Number(it.taxable_amount || 0),
              cgstAmount: Number(it.cgst_amount || 0),
              sgstAmount: Number(it.sgst_amount || 0),
              igstAmount: Number(it.igst_amount || 0),
              lineTotal: Number(it.line_total || 0),
              returnReason: it.return_reason || undefined,
            }));

            const total = Number(r.total_amount || 0);
            return {
              id: r.id,
              organizationId: orgId,
              docType: docType,
              documentNumber: r.return_number || `SR-${r.id.slice(0, 6)}`,
              referenceNumber: r.original_invoice_number || undefined,
              originalInvoiceNumber: r.original_invoice_number || undefined,
              originalInvoiceDate: r.original_invoice_date || undefined,
              returnReason: r.reason || undefined,
              returnAction: r.return_action || "return_to_stock",
              settlementMode: r.settlement_mode || "store_credit",
              partyId: r.customer_id || undefined,
              partyName: r.customer_name || "Walk-in Customer",
              partyPhone: r.customer_phone || "",
              partyGstin: r.customer_gstin || "",
              partyAddress: r.customer_address || "",
              placeOfSupply: r.place_of_supply || "27-Maharashtra",
              docDate: r.return_date || (r.created_at ? r.created_at.split("T")[0] : new Date().toISOString().split("T")[0]),
              items,
              subtotal: Number(r.subtotal || 0),
              discountTotal: Number(r.discount_amount || 0),
              taxableTotal: Number(r.taxable_amount || 0),
              cgstTotal: Number(r.cgst_amount || 0),
              sgstTotal: Number(r.sgst_amount || 0),
              igstTotal: Number(r.igst_amount || 0),
              taxTotal: Number(r.tax_amount || 0),
              roundOff: Number(r.round_off || 0),
              grandTotal: total,
              paidAmount: total,
              balanceDue: 0,
              status: (r.status === "completed" ? "paid" : r.status === "cancelled" ? "cancelled" : "draft") as DocumentStatus,
              notes: r.notes || "",
              created_at: r.created_at,
              updated_at: r.updated_at,
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
        console.warn("Supabase sales return fetch error:", err);
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
            const total = Number(inv.total_amount || 0);
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
              subtotal: total,
              discountTotal: 0,
              taxableTotal: total,
              cgstTotal: 0,
              sgstTotal: 0,
              igstTotal: 0,
              taxTotal: 0,
              roundOff: 0,
              grandTotal: total,
              paidAmount: inv.status === "received" ? total : 0,
              balanceDue: inv.status === "received" ? 0 : total,
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
    if (!doc.id) {
      doc.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
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
    // Note: partyId may be a customer UUID (unified party list) or supplier UUID
    // We try to resolve it against suppliers table; if it fails (customer ID), save without supplier_id FK
    if (docType === "purchase_invoice" && userId) {
      try {
        // Check if partyId exists in suppliers table
        let resolvedSupplierId: string | null = null;
        if (doc.partyId) {
          const { data: suppCheck } = await supabase
            .from("suppliers")
            .select("id")
            .eq("id", doc.partyId)
            .maybeSingle();
          if (suppCheck) resolvedSupplierId = doc.partyId;
        }

        const { data: piData, error: piErr } = await supabase
          .from("purchase_invoices")
          .insert({
            organization_id: orgId,
            supplier_id: resolvedSupplierId, // null if party is a customer, not a supplier
            invoice_number: doc.documentNumber,
            total_amount: doc.grandTotal,
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

    // 3. If sales return or credit note, attempt saving to Supabase sales_returns
    if ((docType === "sales_return" || docType === "credit_note") && userId) {
      try {
        const { data: srData, error: srErr } = await supabase
          .from("sales_returns")
          .insert({
            organization_id: orgId,
            sale_id: doc.convertedFromId || null,
            customer_id: doc.partyId || null,
            customer_name: doc.partyName || "Walk-in Customer",
            customer_phone: doc.partyPhone || "",
            customer_gstin: doc.partyGstin || "",
            customer_address: doc.partyAddress || "",
            place_of_supply: doc.placeOfSupply || "27-Maharashtra",
            return_number: doc.documentNumber,
            original_invoice_number: doc.originalInvoiceNumber || doc.referenceNumber || "",
            original_invoice_date: doc.originalInvoiceDate || null,
            return_date: doc.docDate || new Date().toISOString().split("T")[0],
            reason: doc.returnReason || doc.notes || "Sales Return",
            return_action: doc.returnAction || "return_to_stock",
            settlement_mode: doc.settlementMode || "store_credit",
            subtotal: doc.subtotal,
            discount_amount: doc.discountTotal,
            taxable_amount: doc.taxableTotal,
            cgst_amount: doc.cgstTotal,
            sgst_amount: doc.sgstTotal,
            igst_amount: doc.igstTotal,
            tax_amount: doc.taxTotal,
            round_off: doc.roundOff || 0,
            total_amount: doc.grandTotal,
            status: doc.status === "cancelled" ? "cancelled" : "completed",
            notes: doc.notes || "",
            created_by: userId,
          })
          .select()
          .single();

        if (!srErr && srData) {
          doc.id = srData.id;
          if (doc.items.length > 0) {
            const srItems = doc.items.map((it) => ({
              sales_return_id: srData.id,
              product_id: it.productId || null,
              product_name: it.productName,
              batch_number: it.batchNumber || "BATCH-01",
              quantity: it.quantity,
              unit: it.unit || "PCS",
              alt_unit: it.altUnit || null,
              alt_qty: it.altQty != null ? it.altQty : null,
              alt_unit_conversion: it.altUnitConversion != null ? it.altUnitConversion : null,
              rate: it.rate,
              tax_rate: it.taxRate || 0,
              discount_percent: it.discountPercent || 0,
              discount_amount: it.discountAmount || 0,
              taxable_amount: it.taxableAmount || 0,
              cgst_amount: it.cgstAmount || 0,
              sgst_amount: it.sgstAmount || 0,
              igst_amount: it.igstAmount || 0,
              line_total: it.lineTotal,
              return_reason: it.returnReason || null,
            }));
            await supabase.from("sales_return_items").insert(srItems);
          }

          // If store credit / ledger settlement and customer is linked, record in credit_transactions
          if (doc.settlementMode === "store_credit" && doc.partyId && doc.grandTotal > 0) {
            await supabase.from("credit_transactions").insert({
              organization_id: orgId,
              party_type: "customer",
              party_id: doc.partyId,
              amount: doc.grandTotal,
              type: "payment", // Reduces customer's udhar khata (credit balance)
              reference_id: srData.id,
              description: `Credit Note #${doc.documentNumber} - ${doc.returnReason || "Sales Return"}`,
              created_by: userId,
            });
          }
        }
      } catch (err) {
        console.warn("Supabase sales return save fallback to local storage:", err);
      }
    }

    // 4. Save / Update in Local Storage cache
    const existingList = this.getLocalDocuments(orgId, docType);
    const index = existingList.findIndex((d) => d.id === doc.id);
    const previousDoc = index >= 0 ? existingList[index] : undefined;

    if (index >= 0) {
      existingList[index] = { ...doc, updated_at: new Date().toISOString() };
    } else {
      existingList.unshift(doc);
    }

    this.saveLocalDocuments(orgId, docType, existingList);

    // 5. Update Inventory Stock (Deduct on sales/challan, Add on purchases/credit returns)
    // If returnAction is scrap_damaged, skip adding to stock so damaged/expired goods are not resold
    if (doc.returnAction !== "scrap_damaged") {
      try {
        if (previousDoc) {
          await stockService.handleDocumentStock(doc, "update", previousDoc);
        } else {
          await stockService.handleDocumentStock(doc, "create");
        }
      } catch (stockErr) {
        console.warn("Stock handling notice in saveDocument:", stockErr);
      }
    }

    return doc;
  },

  // Delete Document
  async deleteDocument(orgId: string, docType: string, docId: string): Promise<boolean> {
    const list = this.getLocalDocuments(orgId, docType);
    const targetDoc = list.find((d) => d.id === docId);
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

    // If sales return or credit note
    if (docType === "sales_return" || docType === "credit_note") {
      try {
        await supabase.from("sales_returns").delete().eq("id", docId);
        // Also remove associated credit_transactions entry
        await supabase.from("credit_transactions").delete().eq("reference_id", docId);
      } catch (error) {
        console.warn("Failed to delete sales return document from Supabase:", error);
      }
    }

    // Revert inventory stock effect on document deletion
    if (targetDoc && targetDoc.returnAction !== "scrap_damaged") {
      try {
        await stockService.handleDocumentStock(targetDoc, "delete");
      } catch (stockErr) {
        console.warn("Stock revert notice in deleteDocument:", stockErr);
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
