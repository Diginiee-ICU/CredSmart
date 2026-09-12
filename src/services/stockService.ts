import { supabase } from "@/integrations/supabase/client";
import { BusinessDocument, DocumentLineItem } from "@/types/documents";

export interface StockItemPayload {
  productId?: string;
  productName?: string;
  barcode?: string;
  batchNumber?: string;
  quantity: number;
  rate?: number;
  costPrice?: number;
  mrp?: number;
  expiryDate?: string;
  unit?: string;
  altUnit?: string;
  altQty?: number;
  altUnitConversion?: number;
}

// Document types that decrease inventory stock on creation
const DEDUCT_ON_CREATE_TYPES = new Set([
  "sales_invoice",
  "delivery_challan",
  "pos_sale",
  "purchase_return",
  "debit_note",
]);

// Document types that increase inventory stock on creation
const ADD_ON_CREATE_TYPES = new Set([
  "purchase_invoice",
  "sales_return",
  "credit_note",
]);

// Document types that do not alter physical stock
const NON_INVENTORY_TYPES = new Set([
  "quotation",
  "proforma_invoice",
  "purchase_order",
  "estimate",
]);

/**
 * Resolves or finds a product in Supabase by productId, productName or barcode
 */
async function resolveProductId(
  orgId: string,
  item: StockItemPayload
): Promise<string | null> {
  if (item.productId && item.productId.trim().length > 0) {
    return item.productId.trim();
  }

  const cleanName = (item.productName || "").trim();
  if (!cleanName && !item.barcode) return null;

  try {
    // 1. Try matching by barcode if available
    if (item.barcode && item.barcode.trim().length > 0) {
      const { data: byBarcode } = await supabase
        .from("products")
        .select("id")
        .eq("organization_id", orgId)
        .eq("barcode", item.barcode.trim())
        .limit(1)
        .maybeSingle();

      if (byBarcode?.id) return byBarcode.id;
    }

    // 2. Try matching by product name (case-insensitive)
    if (cleanName) {
      const { data: byName } = await supabase
        .from("products")
        .select("id")
        .eq("organization_id", orgId)
        .ilike("name", cleanName)
        .limit(1)
        .maybeSingle();

      if (byName?.id) return byName.id;
    }
  } catch (err) {
    console.warn("Error resolving product for stock adjustment:", err);
  }

  return null;
}

/**
 * Dispatches a global event so all contexts, POS tabs, and inventory screens refresh their stock
 */
export function notifyStockUpdated(orgId?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("credsmart:stock_updated", {
        detail: { orgId, timestamp: Date.now() },
      })
    );
  }
}

export const stockService = {
  /**
   * Deduct stock for a list of items (e.g. Sales Invoice, POS Sale, Debit Note)
   */
  async deductStock(
    orgId: string,
    items: StockItemPayload[],
    reason = "Stock Deduction"
  ): Promise<void> {
    if (!orgId || !items || items.length === 0) return;

    for (const item of items) {
      const qtyToDeduct = Math.max(1, Number(item.quantity) || 1);
      const productId = await resolveProductId(orgId, item);
      if (!productId) continue;

      try {
        // Fetch existing batches for this product
        const { data: batches, error: batchErr } = await supabase
          .from("product_batches")
          .select("id, batch_number, stock, mrp, cost_price, expiry_date")
          .eq("product_id", productId)
          .order("created_at", { ascending: true });

        if (batchErr) {
          console.warn(`Failed to fetch batches for product ${productId}:`, batchErr);
          continue;
        }

        if (batches && batches.length > 0) {
          // If specific batch requested, find it; otherwise pick first batch with stock > 0, or the first batch
          let targetBatch = item.batchNumber
            ? batches.find(
                (b) =>
                  b.batch_number.toLowerCase().trim() ===
                  item.batchNumber?.toLowerCase().trim()
              )
            : undefined;

          if (!targetBatch) {
            targetBatch = batches.find((b) => Number(b.stock) > 0) || batches[0];
          }

          const currentStock = Number(targetBatch.stock) || 0;
          const newStock = Math.max(0, currentStock - qtyToDeduct);

          await supabase
            .from("product_batches")
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetBatch.id)
            .throwOnError();
        } else {
          // No batch existed; create initial batch with 0 stock
          await supabase
            .from("product_batches")
            .insert({
              product_id: productId,
              batch_number: item.batchNumber?.trim() || "BATCH-01",
              cost_price: Number(item.costPrice || item.rate || 0),
              mrp: Number(item.mrp || item.rate || 0),
              stock: 0,
            })
            .throwOnError();
        }
      } catch (err) {
        console.warn(`Deduct stock exception for product ${productId} (${reason}):`, err);
      }
    }

    notifyStockUpdated(orgId);
  },

  /**
   * Add stock for a list of items (e.g. Purchase Invoice, Sales Return / Credit Note)
   */
  async addStock(
    orgId: string,
    items: StockItemPayload[],
    reason = "Stock Addition"
  ): Promise<void> {
    if (!orgId || !items || items.length === 0) return;

    for (const item of items) {
      const qtyToAdd = Math.max(1, Number(item.quantity) || 1);
      let productId = await resolveProductId(orgId, item);

      // If product doesn't exist yet in inventory (e.g. newly purchased item), create it
      if (!productId && item.productName && item.productName.trim().length > 0) {
        try {
          const { data: newProd, error: prodCreateErr } = await supabase
            .from("products")
            .insert({
              organization_id: orgId,
              name: item.productName.trim(),
              barcode: item.barcode || null,
              category: "General",
              tags: {
                unit: item.unit || "PCS",
                selling_price: Number(item.mrp || item.rate || 0),
                purchase_price: Number(item.costPrice || item.rate || 0),
                mrp: Number(item.mrp || item.rate || 0),
                stock: qtyToAdd,
              },
            })
            .select("id")
            .single();

          if (!prodCreateErr && newProd?.id) {
            productId = newProd.id;
          }
        } catch (createErr) {
          console.warn("Failed to auto-create product during purchase stock add:", createErr);
        }
      }

      if (!productId) continue;

      try {
        const batchNum = item.batchNumber?.trim() || "BATCH-01";
        const costVal = Number(item.costPrice || item.rate || 0);
        const mrpVal = Number(item.mrp || item.rate || 0);

        // Check if batch already exists
        const { data: existingBatches } = await supabase
          .from("product_batches")
          .select("id, batch_number, stock, cost_price, mrp, expiry_date")
          .eq("product_id", productId);

        const matchedBatch = existingBatches?.find(
          (b) => b.batch_number.toLowerCase().trim() === batchNum.toLowerCase().trim()
        );

        if (matchedBatch) {
          const currentStock = Number(matchedBatch.stock) || 0;
          const newStock = currentStock + qtyToAdd;

          await supabase
            .from("product_batches")
            .update({
              stock: newStock,
              cost_price: costVal > 0 ? costVal : matchedBatch.cost_price,
              mrp: mrpVal > 0 ? mrpVal : matchedBatch.mrp,
              expiry_date: item.expiryDate || matchedBatch.expiry_date,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchedBatch.id)
            .throwOnError();
        } else {
          // Create new batch with added stock
          await supabase
            .from("product_batches")
            .insert({
              product_id: productId,
              batch_number: batchNum,
              cost_price: costVal,
              mrp: mrpVal,
              expiry_date: item.expiryDate || null,
              stock: qtyToAdd,
            })
            .throwOnError();
        }
      } catch (err) {
        console.warn(`Add stock exception for product ${productId} (${reason}):`, err);
      }
    }

    notifyStockUpdated(orgId);
  },

  /**
   * Automatically handles stock addition/deduction based on Document Type and Action (create, update, delete)
   */
  async handleDocumentStock(
    doc: BusinessDocument,
    action: "create" | "update" | "delete",
    previousDoc?: BusinessDocument
  ): Promise<void> {
    if (!doc || !doc.organizationId || !doc.items || doc.items.length === 0) {
      return;
    }

    const docType = doc.docType;
    if (NON_INVENTORY_TYPES.has(docType)) {
      return;
    }

    const orgId = doc.organizationId;
    const currentPayload: StockItemPayload[] = doc.items.map((it: DocumentLineItem) => ({
      productId: it.productId,
      productName: it.productName,
      barcode: it.barcode,
      batchNumber: it.batchNumber,
      quantity: Number(it.quantity) || 1,
      rate: it.rate,
      costPrice: it.rate,
      mrp: it.rate,
      expiryDate: it.expiryDate,
      unit: it.unit,
      altUnit: it.altUnit,
      altQty: it.altQty,
      altUnitConversion: it.altUnitConversion,
    }));

    if (action === "create") {
      if (DEDUCT_ON_CREATE_TYPES.has(docType)) {
        await this.deductStock(
          orgId,
          currentPayload,
          `Document Create: ${docType} #${doc.documentNumber}`
        );
      } else if (ADD_ON_CREATE_TYPES.has(docType)) {
        await this.addStock(
          orgId,
          currentPayload,
          `Document Create: ${docType} #${doc.documentNumber}`
        );
      }
    } else if (action === "delete") {
      // Revert the stock effect when a document is deleted/cancelled
      if (DEDUCT_ON_CREATE_TYPES.has(docType)) {
        // Revert deduction by adding stock back
        await this.addStock(
          orgId,
          currentPayload,
          `Document Delete/Revert: ${docType} #${doc.documentNumber}`
        );
      } else if (ADD_ON_CREATE_TYPES.has(docType)) {
        // Revert addition by deducting stock
        await this.deductStock(
          orgId,
          currentPayload,
          `Document Delete/Revert: ${docType} #${doc.documentNumber}`
        );
      }
    } else if (action === "update" && previousDoc) {
      // Revert old document stock first, then apply new document stock
      await this.handleDocumentStock(previousDoc, "delete");
      await this.handleDocumentStock(doc, "create");
    }
  },
};
