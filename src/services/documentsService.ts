import { invoicesApi } from "@/services/invoicesApi";
import { BusinessDocument, DocumentMetrics, SalesDocumentType, PurchaseDocumentType, DocumentStatus } from "@/types/documents";
import { stockService } from "@/services/stockService";
import { productsApi } from "@/services/productsApi";
import { partiesApi } from "@/services/partiesApi";

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
  email?: string | null;
  address?: string | null;
};

type SaleItemRow = {
  id: string;
  product_id?: string | null;
  product_name: string;
  batch_id?: string | null;
  batch_number?: string | null;
  mrp?: number | string | null;
  quantity?: number | null;
  line_total?: number | string | null;
};

type SalesRow = {
  id: string;
  invoice_number?: string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  discount_label?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
  customer_id?: string | null;
  customers?: CustomerSummary | null;
  tax?: number | string | null;
  total?: number | string | null;
  sale_items?: SaleItemRow[] | null;
};

type PurchaseInvoiceItemRow = {
  id: string;
  product_id?: string | null;
  batch_number?: string | null;
  quantity?: number | null;
  cost_price?: number | string | null;
  mrp?: number | string | null;
  expiry_date?: string | null;
  products?: {
    name?: string | null;
    barcode?: string | null;
    sku?: string | null;
  } | null;
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
  purchase_invoice_items?: PurchaseInvoiceItemRow[] | null;
};

type PurchaseReturnItemRow = {
  id: string;
  product_id?: string | null;
  batch_number?: string | null;
  quantity?: number | null;
  cost_price?: number | string | null;
  products?: {
    name?: string | null;
  } | null;
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
  purchase_return_items?: PurchaseReturnItemRow[] | null;
};

function getStorageKey(orgId: string, docType: string): string {
  return `${STORAGE_KEY_PREFIX}${orgId}_${docType}`;
}

export function notifyDocumentChange(
  orgId: string,
  docType: string,
  action: "save" | "delete",
  doc?: BusinessDocument
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("credsmart_documents_updated", {
        detail: { orgId, docType, action, doc, timestamp: Date.now() },
      })
    );
    window.dispatchEvent(
      new CustomEvent("credsmart_network_update", {
        detail: { type: "DOCUMENT_CHANGED", orgId, docType, action, doc, timestamp: Date.now() },
      })
    );
  }
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

    // If fetching standard sales invoices, also query `sales` and merge
    if (docType === "sales_invoice") {
      try {
        const { data: sales, error } = await invoicesApi.getSales(orgId, {
          sort: "created_at",
          order: "desc",
        });

        if (!error && sales) {
          const supabaseDocs: BusinessDocument[] = (sales as SalesRow[]).map((s) => {
            const customer = s.customers;
            const isEstimate = s.payment_method?.toLowerCase() === "estimate";
            const mappedItems: DocumentLineItem[] = (s.sale_items && s.sale_items.length > 0)
              ? s.sale_items.map((it, idx) => {
                  const qty = Number(it.quantity || 1);
                  const rate = Number(it.mrp || 0);
                  const lineTot = Number(it.line_total || (qty * rate));
                  return {
                    id: it.id || `sale_item_${idx}`,
                    productId: it.product_id || undefined,
                    productName: it.product_name || "Product Item",
                    batchNumber: it.batch_number || it.batch_id || undefined,
                    quantity: qty,
                    unit: "PCS",
                    rate: rate,
                    discountPercent: 0,
                    discountAmount: 0,
                    taxRate: 0,
                    taxableAmount: lineTot,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    lineTotal: lineTot,
                  };
                })
              : [];

            return {
              id: s.id,
              organizationId: orgId,
              docType: isEstimate ? "quotation" : "sales_invoice",
              documentNumber: s.invoice_number || `INV-${s.id.slice(0, 6)}`,
              partyId: s.customer_id,
              partyName: customer?.name || "Cash Customer",
              partyPhone: customer?.phone || "",
              partyGstin: customer?.gstin || "",
              partyEmail: customer?.email || undefined,
              partyAddress: customer?.address || undefined,
              docDate: s.created_at ? s.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              dueDate: s.created_at ? s.created_at.split("T")[0] : undefined,
              items: mappedItems,
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

          // Merge supabaseDocs with localDocs (avoiding duplicate IDs and preserving full item lists)
          const merged = [...localDocs];
          for (const sDoc of supabaseDocs) {
            const existingIndex = merged.findIndex((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber);
            if (existingIndex === -1) {
              merged.push(sDoc);
            } else {
              // If existing local doc has empty items but Supabase has items, update items
              if (merged[existingIndex].items.length === 0 && sDoc.items.length > 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  items: sDoc.items,
                  subtotal: sDoc.subtotal || merged[existingIndex].subtotal,
                  grandTotal: sDoc.grandTotal || merged[existingIndex].grandTotal,
                };
              }
            }
          }
          // Sort descending by date
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      } catch (err) {
        console.warn("Supabase sales fetch error:", err);
      }
    }

    // If fetching sales return or credit note, also query `sales_returns` and merge
    if (docType === "sales_return" || docType === "credit_note") {
      try {
        const { data: returns, error } = await invoicesApi.getSalesReturns(orgId);

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
        const { data, error } = await invoicesApi.getPurchaseInvoices(orgId);

        if (!error && data) {
          const supabaseDocs: BusinessDocument[] = (data as PurchaseInvoiceRow[]).map((inv) => {
            const supplier = inv.suppliers;
            const total = Number(inv.total_amount || 0);
            const mappedItems: DocumentLineItem[] = (inv.purchase_invoice_items && inv.purchase_invoice_items.length > 0)
              ? inv.purchase_invoice_items.map((piItem, idx) => {
                  const qty = Number(piItem.quantity || 1);
                  const rate = Number(piItem.cost_price ?? piItem.mrp ?? 0);
                  const lineTot = qty * rate;
                  const prodName = piItem.products?.name || "Purchase Item";
                  return {
                    id: piItem.id || `pi_item_${idx}`,
                    productId: piItem.product_id || undefined,
                    productName: prodName,
                    barcode: piItem.products?.barcode || undefined,
                    batchNumber: piItem.batch_number || "BATCH-01",
                    expiryDate: piItem.expiry_date || undefined,
                    quantity: qty,
                    unit: "PCS",
                    rate: rate,
                    discountPercent: 0,
                    discountAmount: 0,
                    taxRate: 0,
                    taxableAmount: lineTot,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    lineTotal: lineTot,
                  };
                })
              : [];

            return {
              id: inv.id,
              organizationId: orgId,
              docType: "purchase_invoice",
              documentNumber: inv.invoice_number || `PI-${inv.id.slice(0, 6)}`,
              partyId: inv.supplier_id,
              partyName: supplier?.name || "Unknown Supplier",
              partyPhone: supplier?.phone || "",
              partyGstin: supplier?.gstin || "",
              partyEmail: supplier?.email || undefined,
              partyAddress: supplier?.address || undefined,
              docDate: inv.created_at ? inv.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              dueDate: undefined,
              items: mappedItems,
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
            const existingIndex = merged.findIndex((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber);
            if (existingIndex === -1) {
              merged.push(sDoc);
            } else {
              if (merged[existingIndex].items.length === 0 && sDoc.items.length > 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  items: sDoc.items,
                  subtotal: sDoc.subtotal || merged[existingIndex].subtotal,
                  grandTotal: sDoc.grandTotal || merged[existingIndex].grandTotal,
                };
              }
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
        const { data, error } = await invoicesApi.getPurchaseReturns(orgId);

        if (!error && data) {
          const supabaseDocs: BusinessDocument[] = (data as PurchaseReturnRow[]).map((ret) => {
            const mappedItems: DocumentLineItem[] = (ret.purchase_return_items && ret.purchase_return_items.length > 0)
              ? ret.purchase_return_items.map((pri, idx) => {
                  const qty = Number(pri.quantity || 1);
                  const rate = Number(pri.cost_price || 0);
                  const lineTot = qty * rate;
                  const pName = pri.products?.name || "Return Item";
                  return {
                    id: pri.id || `pri_item_${idx}`,
                    productId: pri.product_id || undefined,
                    productName: pName,
                    batchNumber: pri.batch_number || "BATCH-01",
                    quantity: qty,
                    unit: "PCS",
                    rate: rate,
                    discountPercent: 0,
                    discountAmount: 0,
                    taxRate: 0,
                    taxableAmount: lineTot,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    lineTotal: lineTot,
                  };
                })
              : [];

            return {
              id: ret.id,
              organizationId: orgId,
              docType: docType,
              documentNumber: ret.return_number || `DN-${ret.id.slice(0, 6)}`,
              partyId: ret.supplier_id,
              partyName: ret.suppliers?.name || "Unknown Supplier",
              partyPhone: ret.suppliers?.phone || "",
              partyGstin: ret.suppliers?.gstin || "",
              partyEmail: ret.suppliers?.email || undefined,
              partyAddress: ret.suppliers?.address || undefined,
              docDate: ret.created_at ? ret.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
              items: mappedItems,
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
            };
          });

          const merged = [...localDocs];
          for (const sDoc of supabaseDocs) {
            const existingIndex = merged.findIndex((d) => d.id === sDoc.id || d.documentNumber === sDoc.documentNumber);
            if (existingIndex === -1) {
              merged.push(sDoc);
            } else {
              if (merged[existingIndex].items.length === 0 && sDoc.items.length > 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  items: sDoc.items,
                  subtotal: sDoc.subtotal || merged[existingIndex].subtotal,
                  grandTotal: sDoc.grandTotal || merged[existingIndex].grandTotal,
                };
              }
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
  async saveDocument(rawDoc: BusinessDocument | (Omit<BusinessDocument, "id"> & { id?: string }), userId?: string): Promise<BusinessDocument> {
    if (!rawDoc.id) {
      rawDoc.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    const doc = rawDoc as BusinessDocument;
    const orgId = doc.organizationId;
    const docType = doc.docType;

    // 1. If standard sales invoice, attempt saving to Supabase sales table
    if (docType === "sales_invoice" && userId) {
      try {
        const isExistingSupabaseSale = Boolean(doc.id && !doc.id.startsWith("doc_"));

        if (isExistingSupabaseSale) {
          const { data: saleData, error: saleErr } = await invoicesApi.updateSale(
            doc.id,
            {
              organization_id: orgId,
              invoice_number: doc.documentNumber,
              subtotal: doc.subtotal,
              discount_amount: doc.discountTotal,
              discount_label: doc.discountTotal > 0 ? "Discount" : null,
              tax: doc.taxTotal,
              total: doc.grandTotal,
              payment_method: doc.paymentMethod || "Cash",
              customer_id: doc.partyId || null,
            },
            orgId
          );

          if (!saleErr && saleData) {
            // Delete existing line items and re-insert updated items
            await invoicesApi.deleteSaleItemsBySaleId(doc.id, orgId);
            if (doc.items.length > 0) {
              const saleItems = doc.items.map((it) => ({
                sale_id: doc.id,
                product_name: it.productName,
                product_id: it.productId || null,
                batch_number: it.batchNumber || null,
                mrp: it.rate,
                quantity: it.quantity,
                line_total: it.lineTotal,
              }));
              await invoicesApi.createSaleItems(saleItems, orgId);
            }
          } else if (!saleData && !saleErr) {
            // Fallback: If not found in sales by ID, insert as new
            const { data: newSaleData, error: newSaleErr } = await invoicesApi.createSale(
              {
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
              },
              orgId
            );

            if (!newSaleErr && newSaleData) {
              doc.id = newSaleData.id;
              if (doc.items.length > 0) {
                const saleItems = doc.items.map((it) => ({
                  sale_id: newSaleData.id,
                  product_name: it.productName,
                  product_id: it.productId || null,
                  batch_number: it.batchNumber || null,
                  mrp: it.rate,
                  quantity: it.quantity,
                  line_total: it.lineTotal,
                }));
                await invoicesApi.createSaleItems(saleItems, orgId);
              }
            }
          }
        } else {
          const mappedSaleItems = doc.items.map((it) => ({
            product_name: it.productName,
            product_id: it.productId || null,
            batch_number: it.batchNumber || null,
            mrp: it.rate,
            rate: it.rate,
            quantity: it.quantity,
            total: it.lineTotal,
            line_total: it.lineTotal,
          }));

          const { data: saleData, error: saleErr } = await invoicesApi.createSale(
            {
              organization_id: orgId,
              invoice_number: doc.documentNumber,
              subtotal: doc.subtotal,
              discount_amount: doc.discountTotal,
              discount_label: doc.discountTotal > 0 ? "Discount" : null,
              tax: doc.taxTotal,
              tax_amount: doc.taxTotal,
              total: doc.grandTotal,
              total_amount: doc.grandTotal,
              payment_method: doc.paymentMethod || "Cash",
              created_by: userId,
              customer_id: doc.partyId || null,
              customer_name: doc.partyName || "",
              customer_phone: doc.partyPhone || "",
              customer_gstin: doc.partyGstin || "",
              items: mappedSaleItems as any,
            },
            orgId
          );

          if (!saleErr && saleData) {
            doc.id = saleData.id;
          }
        }
      } catch (err) {
        console.warn("Supabase sales save fallback to local storage:", err);
      }
    }

    // 2. If purchase invoice, attempt saving to Supabase purchase_invoices
    if (docType === "purchase_invoice" && userId) {
      try {
        // Resolve or create supplier in suppliers table to satisfy NOT NULL foreign key constraint
        let resolvedSupplierId: string | null = null;
        if (doc.partyId) {
          const { data: suppCheck } = await partiesApi.getSupplierById(doc.partyId, orgId);
          if (suppCheck?.id) resolvedSupplierId = doc.partyId;
        }

        if (!resolvedSupplierId && (doc.partyPhone || doc.partyName)) {
          const { data: existingSuppliers } = await partiesApi.getSuppliers(orgId, {
            search: doc.partyPhone || doc.partyName,
          });
          if (existingSuppliers && existingSuppliers.length > 0) {
            resolvedSupplierId = existingSuppliers[0].id || null;
          }
        }

        // If supplier doesn't exist in Supabase suppliers table, auto-create it
        if (!resolvedSupplierId) {
          const { data: newSupp } = await partiesApi.createSupplier(
            {
              organization_id: orgId,
              name: doc.partyName || "Supplier",
              phone: doc.partyPhone || "",
              email: doc.partyEmail || "",
              gstin: doc.partyGstin || "",
              address: doc.partyAddress || "",
            },
            orgId
          );
          if (newSupp?.id) resolvedSupplierId = newSupp.id;
        }

        if (resolvedSupplierId) {
          const { data: piData, error: piErr } = await invoicesApi.createPurchaseInvoice(
            {
              organization_id: orgId,
              supplier_id: resolvedSupplierId,
              invoice_number: doc.documentNumber,
              total_amount: doc.grandTotal,
              status: doc.status === "paid" ? "received" : "sent",
              notes: doc.notes || null,
              created_by: userId,
            },
            orgId
          );

          if (!piErr && piData) {
            doc.id = piData.id;
            if (doc.items.length > 0) {
              const piItems = [];
              for (const it of doc.items) {
                let pId = it.productId;
                if (pId) {
                  const { data: prodCheck } = await productsApi.getProductById(pId, orgId);
                  if (!prodCheck) pId = undefined;
                }
                if (!pId) {
                  const { data: existingProducts } = await productsApi.getProducts(orgId);
                  const prodMatch = (existingProducts || []).find(
                    (p) => p.name?.toLowerCase().trim() === it.productName.trim().toLowerCase()
                  );
                  pId = prodMatch?.id;
                }
                if (!pId) {
                  const { data: newProd } = await productsApi.createProduct({
                    name: it.productName.trim(),
                    category: "General",
                    sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
                  }, orgId);
                  pId = newProd?.id;
                }

                if (pId) {
                  piItems.push({
                    purchase_invoice_id: piData.id,
                    product_id: pId,
                    quantity: it.quantity,
                    cost_price: it.rate,
                    mrp: it.rate,
                    batch_number: it.batchNumber || "BATCH-01",
                    expiry_date: it.expiryDate || null,
                  });
                }
              }
              if (piItems.length > 0) {
                await invoicesApi.createPurchaseInvoiceItems(piItems, orgId);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Supabase purchase invoice save fallback to local storage:", err);
      }
    }

    // 2b. If purchase return or debit note, attempt saving to Supabase purchase_returns
    if ((docType === "purchase_return" || docType === "debit_note") && userId) {
      try {
        let resolvedSupplierId: string | null = null;
        if (doc.partyId) {
          const { data: suppCheck } = await partiesApi.getSupplierById(doc.partyId, orgId);
          if (suppCheck?.id) resolvedSupplierId = doc.partyId;
        }
        if (!resolvedSupplierId && doc.partyName) {
          const { data: existingSuppliers } = await partiesApi.getSuppliers(orgId, {
            search: doc.partyName,
          });
          if (existingSuppliers && existingSuppliers.length > 0) {
            resolvedSupplierId = existingSuppliers[0].id || null;
          }
        }
        if (!resolvedSupplierId) {
          const { data: newSupp } = await partiesApi.createSupplier(
            {
              organization_id: orgId,
              name: doc.partyName || "Supplier",
              phone: doc.partyPhone || "",
              email: doc.partyEmail || "",
              gstin: doc.partyGstin || "",
              address: doc.partyAddress || "",
            },
            orgId
          );
          if (newSupp?.id) resolvedSupplierId = newSupp.id;
        }

        if (resolvedSupplierId) {
          const { data: prData, error: prErr } = await invoicesApi.createPurchaseReturn(
            {
              organization_id: orgId,
              supplier_id: resolvedSupplierId,
              purchase_id: doc.convertedFromId || null,
              return_number: doc.documentNumber,
              reason: doc.returnReason || doc.notes || "Purchase Return",
              total_amount: doc.grandTotal,
              status: doc.status === "paid" || doc.status === "completed" ? "completed" : "draft",
              created_by: userId,
            },
            orgId
          );

          if (!prErr && prData) {
            doc.id = prData.id;
            if (doc.items.length > 0) {
              const prItems = [];
              for (const it of doc.items) {
                let pId = it.productId;
                if (!pId) {
                  const { data: existingProducts } = await productsApi.getProducts(orgId);
                  const pMatch = (existingProducts || []).find(
                    (p) => p.name?.toLowerCase().trim() === it.productName.trim().toLowerCase()
                  );
                  pId = pMatch?.id;
                }
                if (pId) {
                  prItems.push({
                    purchase_return_id: prData.id,
                    product_id: pId,
                    batch_number: it.batchNumber || "BATCH-01",
                    quantity: it.quantity,
                    cost_price: it.rate,
                  });
                }
              }
              if (prItems.length > 0) {
                await invoicesApi.createPurchaseReturnItems(prItems, orgId);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Supabase purchase return save fallback to local storage:", err);
      }
    }

    // 3. If sales return or credit note, attempt saving to Supabase sales_returns
    if ((docType === "sales_return" || docType === "credit_note") && userId) {
      try {
        const { data: srData, error: srErr } = await invoicesApi.createSalesReturn(
          {
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
          },
          orgId
        );

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
            await invoicesApi.createSalesReturnItems(srItems, orgId);
          }

          // If store credit / ledger settlement and customer is linked, record in credit_transactions
          if (doc.settlementMode === "store_credit" && doc.partyId && doc.grandTotal > 0) {
            await partiesApi.recordCreditTransaction({
              organization_id: orgId,
              party_type: "customer",
              party_id: doc.partyId,
              amount: doc.grandTotal,
              type: "payment", // Reduces customer's udhar khata (credit balance)
              reference_id: srData.id,
              description: `Credit Note #${doc.documentNumber} - ${doc.returnReason || "Sales Return"}`,
              created_by: userId,
            }, orgId);
          }
        }
      } catch (err) {
        console.warn("Supabase sales return save fallback to local storage:", err);
      }
    }

    // If sales invoice was cancelled, propagate cancellation to network invoice
    if (docType === "sales_invoice" && doc.status === "cancelled") {
      try {
        const { networkInvoicingService } = await import("@/services/networkInvoicingService");
        await networkInvoicingService.cancelNetworkInvoice(doc.documentNumber, orgId);
      } catch { /* empty */ }
    }

    // 4. Save / Update in Local Storage cache
    const existingList = this.getLocalDocuments(orgId, docType);
    const index = existingList.findIndex(
      (d) => d.id === doc.id || (doc.documentNumber && d.documentNumber === doc.documentNumber)
    );
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

    notifyDocumentChange(orgId, docType, "save", doc);
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
        await invoicesApi.deleteSale(docId, orgId);
      } catch (error) {
        console.warn("Failed to delete sales document from Supabase:", error);
      }
      if (targetDoc) {
        try {
          const { networkInvoicingService } = await import("@/services/networkInvoicingService");
          await networkInvoicingService.cancelNetworkInvoice(targetDoc.documentNumber, orgId);
        } catch { /* empty */ }
      }
    }

    // If purchase invoice
    if (docType === "purchase_invoice") {
      try {
        await invoicesApi.deletePurchaseInvoice(docId, orgId);
      } catch (error) {
        console.warn("Failed to delete purchase document from Supabase:", error);
      }
    }

    // If sales return or credit note
    if (docType === "sales_return" || docType === "credit_note") {
      try {
        await invoicesApi.deleteSalesReturn(docId, orgId);
        // Also remove associated credit_transactions entry
        await partiesApi.deleteCreditTransactionsByReference(docId, orgId);
      } catch (error) {
        console.warn("Failed to delete sales return document from Supabase:", error);
      }
    }

    // If purchase return or debit note
    if (docType === "purchase_return" || docType === "debit_note") {
      try {
        await invoicesApi.deletePurchaseReturn(docId, orgId);
      } catch (error) {
        console.warn("Failed to delete purchase return document from Supabase:", error);
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

    notifyDocumentChange(orgId, docType, "delete", targetDoc);
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
