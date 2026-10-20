import { productsApi } from "@/services/productsApi";
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

// Local Storage Cached Products Helpers for offline & cross-tenant resolution
export interface LocalCachedProduct {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string;
  category?: string;
  brand?: string | null;
  unit?: string;
  altUnit?: string;
  altUnitConversion?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  mrp?: number;
  stock?: number;
  currentStock?: number;
  tags?: Record<string, unknown>;
  product_batches?: Array<{
    id: string;
    batch_number: string;
    cost_price?: number;
    mrp: number;
    stock: number;
    expiry_date: string | null;
  }>;
}

export function getLocalCachedProducts(orgId: string): LocalCachedProduct[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined" || !orgId) return [];
  try {
    const raw = localStorage.getItem(`credsmart_cached_products_${orgId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedProducts(orgId: string, products: LocalCachedProduct[]): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined" || !orgId) return;
  try {
    localStorage.setItem(`credsmart_cached_products_${orgId}`, JSON.stringify(products));
  } catch { /* empty */ }
}

export function addOrUpdateLocalCachedProduct(orgId: string, product: Partial<LocalCachedProduct> & { id: string; name: string }): void {
  const list = getLocalCachedProducts(orgId);
  const idx = list.findIndex((p) => p.id === product.id || (product.barcode && p.barcode === product.barcode));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...product };
  } else {
    list.unshift(product as LocalCachedProduct);
  }
  saveLocalCachedProducts(orgId, list);
}

/**
 * Generates a valid RFC4122 v4 UUID for fallback IDs to prevent Postgres 22P02 UUID syntax errors
 */
export function generateSafeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch { /* empty */ }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolves or finds a product in Supabase (or local cache) by productId, productName or barcode.
 * CRITICAL: If productId is passed, it validates that the product actually belongs to orgId.
 * This prevents cross-tenant product ID pollution from B2B network invoices.
 */
async function resolveProductId(
  orgId: string,
  item: StockItemPayload
): Promise<string | null> {
  // 1. If productId is provided, verify it belongs to this specific orgId
  if (item.productId && item.productId.trim().length > 0) {
    const cleanId = item.productId.trim();
    try {
      const { data: matched } = await productsApi.getProductById(cleanId, orgId);
      if (matched?.id) return matched.id;
    } catch {
      // ignore network errors
    }

    // Check local cache for org products
    const localCached = getLocalCachedProducts(orgId);
    if (localCached.some((p) => p.id === cleanId)) {
      return cleanId;
    }
  }

  const cleanName = (item.productName || "").trim();
  const cleanBarcode = (item.barcode || "").trim();
  if (!cleanName && !cleanBarcode) return null;

  try {
    // 2. Try matching by barcode
    if (cleanBarcode) {
      const { data: prods } = await productsApi.getProducts(orgId, { barcode: cleanBarcode });
      const byBarcode = prods?.find((p) => p.barcode === cleanBarcode);
      if (byBarcode?.id) return byBarcode.id;
    }

    // 3. Try matching by product name (case-insensitive)
    if (cleanName) {
      const { data: prods } = await productsApi.getProducts(orgId, { search: cleanName });
      const byName = prods?.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (byName?.id) return byName.id;
    }
  } catch (err) {
    console.warn("Error resolving product for stock adjustment:", err);
  }

  // 4. Fallback to local storage cache if Supabase is offline / unreachable
  const localList = getLocalCachedProducts(orgId);
  if (cleanBarcode) {
    const f = localList.find((p) => p.barcode === cleanBarcode);
    if (f?.id) return f.id;
  }
  if (cleanName) {
    const f = localList.find((p) => (p.name || "").trim().toLowerCase() === cleanName.toLowerCase());
    if (f?.id) return f.id;
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

    // 1. Immediately update local product cache so UI reflects deduction instantaneously
    for (const item of items) {
      try {
        const cachedProducts = getLocalCachedProducts(orgId);
        const match = cachedProducts.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            (item.barcode && p.barcode === item.barcode) ||
            (item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
        );
        if (match) {
          const qtyToDeduct = Math.max(1, Number(item.quantity) || 1);
          const currentStock = Number(match.currentStock ?? match.stock ?? 0);
          const newStock = Math.max(0, currentStock - qtyToDeduct);
          addOrUpdateLocalCachedProduct(orgId, {
            ...match,
            currentStock: newStock,
            stock: newStock,
          });
        }
      } catch { /* empty */ }
    }
    notifyStockUpdated(orgId);

    // 2. Concurrently sync batch updates to backend/database in the background
    const syncBatches = async () => {
      await Promise.allSettled(
        items.map(async (item) => {
          const qtyToDeduct = Math.max(1, Number(item.quantity) || 1);
          const productId = await resolveProductId(orgId, item);
          if (!productId) return;

          try {
            // Fetch existing batches for this product
            const { data: batches, error: batchErr } = await productsApi.getBatches([productId], orgId);

            if (batchErr) {
              console.warn(`Failed to fetch batches for product ${productId}:`, batchErr);
              return;
            }

            if (batches && batches.length > 0) {
              // If specific batch requested, find it; otherwise pick first batch with stock > 0, or the first batch
              let targetBatch = item.batchNumber
                ? batches.find(
                    (b) =>
                      (b.batch_number || b.batchNumber || "").toLowerCase().trim() ===
                      item.batchNumber?.toLowerCase().trim()
                  )
                : undefined;

              if (!targetBatch) {
                targetBatch = batches.find((b) => Number(b.stock) > 0) || batches[0];
              }

              const currentStock = Number(targetBatch.stock) || 0;
              const newStock = Math.max(0, currentStock - qtyToDeduct);

              if (targetBatch.id) {
                await productsApi.updateBatch(
                  targetBatch.id,
                  { stock: newStock },
                  orgId
                );
              }
            } else {
              // No batch existed; create initial batch with 0 stock
              await productsApi.createBatch(
                {
                  product_id: productId,
                  batch_number: item.batchNumber?.trim() || "BATCH-01",
                  cost_price: Number(item.costPrice || item.rate || 0),
                  mrp: Number(item.mrp || item.rate || 0),
                  stock: 0,
                },
                orgId
              );
            }

            // Sync total stock in products.tags and local cache
            try {
              const { data: allBatches } = await productsApi.getBatches([productId], orgId);

              const totalStock = (allBatches || []).reduce(
                (sum, b) => sum + (Number(b.stock) || 0),
                0
              );

              const { data: prodRecord } = await productsApi.getProductById(productId, orgId);

              if (prodRecord) {
                const currentTags = (prodRecord.tags && typeof prodRecord.tags === "object" ? prodRecord.tags : {}) as Record<string, unknown>;
                await productsApi.updateProduct(
                  productId,
                  { tags: { ...currentTags, stock: totalStock } },
                  orgId
                );

                addOrUpdateLocalCachedProduct(orgId, {
                  id: productId,
                  name: prodRecord.name,
                  barcode: prodRecord.barcode,
                  sku: prodRecord.sku || undefined,
                  category: prodRecord.category || undefined,
                  tags: { ...currentTags, stock: totalStock },
                  currentStock: totalStock,
                  stock: totalStock,
                });
              }
            } catch { /* empty */ }
          } catch (err) {
            console.warn(`Deduct stock exception for product ${productId} (${reason}):`, err);
          }
        })
      );
    };

    syncBatches().catch((err) => console.warn("Stock sync background notice:", err));
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

    // 1. Immediately update local product cache so UI reflects addition instantaneously
    for (const item of items) {
      try {
        const cachedProducts = getLocalCachedProducts(orgId);
        const match = cachedProducts.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            (item.barcode && p.barcode === item.barcode) ||
            (item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
        );
        const qtyToAdd = Math.max(1, Number(item.quantity) || 1);
        if (match) {
          const currentStock = Number(match.currentStock ?? match.stock ?? 0);
          const newStock = currentStock + qtyToAdd;
          addOrUpdateLocalCachedProduct(orgId, {
            ...match,
            currentStock: newStock,
            stock: newStock,
          });
        } else if (item.productName && item.productName.trim().length > 0) {
          const cleanName = item.productName.trim();
          const cleanBarcode = item.barcode?.trim() || undefined;
          const pId = item.productId || generateSafeUuid();
          const rateVal = Number(item.costPrice || item.rate || 0);
          const mrpVal = Number(item.mrp || item.rate || 0);
          addOrUpdateLocalCachedProduct(orgId, {
            id: pId,
            name: cleanName,
            barcode: cleanBarcode,
            stock: qtyToAdd,
            currentStock: qtyToAdd,
            unit: (item.unit || "PCS").toUpperCase(),
            sellingPrice: mrpVal,
            purchasePrice: rateVal,
            mrp: mrpVal,
            tags: {
              stock: qtyToAdd,
              mrp: mrpVal,
              selling_price: mrpVal,
              purchase_price: rateVal,
              unit: (item.unit || "PCS").toUpperCase(),
            },
          });
        }
      } catch { /* empty */ }
    }

    notifyStockUpdated(orgId);

    // 2. Concurrently sync batch updates to backend/database in the background
    const syncBatches = async () => {
      await Promise.allSettled(
        items.map(async (item) => {
          const qtyToAdd = Math.max(1, Number(item.quantity) || 1);
        let productId = await resolveProductId(orgId, item);

        // If product doesn't exist yet in inventory (e.g. newly purchased item), create it
        if (!productId && item.productName && item.productName.trim().length > 0) {
          try {
            const cleanName = item.productName.trim();
            const cleanBarcode = item.barcode?.trim() || null;
            const generatedSku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const sp = Number(item.mrp || item.rate || 0);
            const pp = Number(item.costPrice || item.rate || 0);
            const tagsPayload = {
              unit: (item.unit || "PCS").toUpperCase(),
              alt_unit: item.altUnit,
              alt_unit_conversion: item.altUnitConversion,
              selling_price: sp,
              purchase_price: pp,
              mrp: sp,
              stock: qtyToAdd,
              min_stock_alert: 5,
            };

            const { data: newProd, error: prodCreateErr } = await productsApi.createProduct(
              {
                organization_id: orgId,
                name: cleanName,
                barcode: cleanBarcode,
                category: "General",
                sku: generatedSku,
                tags: tagsPayload,
              },
              orgId
            );

            if (!prodCreateErr && newProd?.id) {
              productId = newProd.id;
            } else {
              // Local fallback UUID for offline / demo mode
              productId = generateSafeUuid();
            }

            // Store newly created product into local cache immediately
            addOrUpdateLocalCachedProduct(orgId, {
              id: productId,
              name: cleanName,
              barcode: cleanBarcode,
              sku: generatedSku,
              category: "General",
              unit: (item.unit || "PCS").toUpperCase(),
              altUnit: item.altUnit,
              altUnitConversion: item.altUnitConversion,
              sellingPrice: sp,
              purchasePrice: pp,
              mrp: sp,
              stock: qtyToAdd,
              currentStock: qtyToAdd,
              tags: tagsPayload,
              product_batches: [
                {
                  id: `batch_${Date.now()}`,
                  batch_number: item.batchNumber?.trim() || "BATCH-01",
                  cost_price: pp,
                  mrp: sp,
                  stock: qtyToAdd,
                  expiry_date: item.expiryDate || null,
                },
              ],
            });
          } catch (createErr) {
            console.warn("Failed to auto-create product during purchase stock add:", createErr);
          }
        }

        if (!productId) return;

        try {
          const batchNum = item.batchNumber?.trim() || "BATCH-01";
          const costVal = Number(item.costPrice || item.rate || 0);
          const mrpVal = Number(item.mrp || item.rate || 0);

          // Check if batch already exists
          const { data: existingBatches } = await productsApi.getBatches([productId], orgId);

          const matchedBatch = existingBatches?.find(
            (b) => (b.batch_number || b.batchNumber || "").toLowerCase().trim() === batchNum.toLowerCase().trim()
          );

          let finalBatchStock = qtyToAdd;
          if (matchedBatch && matchedBatch.id) {
            const currentStock = Number(matchedBatch.stock) || 0;
            finalBatchStock = currentStock + qtyToAdd;

            await productsApi.updateBatch(
              matchedBatch.id,
              {
                stock: finalBatchStock,
                cost_price: costVal > 0 ? costVal : matchedBatch.cost_price,
                mrp: mrpVal > 0 ? mrpVal : matchedBatch.mrp,
                expiry_date: item.expiryDate || matchedBatch.expiry_date,
              },
              orgId
            );
          } else {
            // Create new batch with added stock
            await productsApi.createBatch(
              {
                product_id: productId,
                batch_number: batchNum,
                cost_price: costVal,
                mrp: mrpVal,
                expiry_date: item.expiryDate || null,
                stock: qtyToAdd,
              },
              orgId
            );
          }

          // Sync total stock into products.tags and local cache
          try {
            const { data: allBatches } = await productsApi.getBatches([productId], orgId);

            const totalStock = (allBatches || []).reduce(
              (sum, b) => sum + (Number(b.stock) || 0),
              0
            );

            const { data: prodRec } = await productsApi.getProductById(productId, orgId);

            if (prodRec) {
              const currentTags = (prodRec.tags && typeof prodRec.tags === "object" ? prodRec.tags : {}) as Record<string, unknown>;
              await productsApi.updateProduct(
                productId,
                {
                  tags: {
                    ...currentTags,
                    stock: totalStock,
                  },
                },
                orgId
              );

              addOrUpdateLocalCachedProduct(orgId, {
                id: productId,
                name: prodRec.name,
                barcode: prodRec.barcode,
                sku: prodRec.sku || undefined,
                category: prodRec.category || undefined,
                stock: totalStock,
                currentStock: totalStock,
                tags: { ...currentTags, stock: totalStock },
                product_batches: allBatches?.map((b) => ({
                  id: b.id,
                  batch_number: b.batch_number,
                  cost_price: Number(b.cost_price) || costVal,
                  mrp: Number(b.mrp) || mrpVal,
                  stock: Number(b.stock) || 0,
                  expiry_date: b.expiry_date,
                })),
              });
            } else {
              const localList = getLocalCachedProducts(orgId);
              const target = localList.find((p) => p.id === productId || (item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()));
              if (target) {
                const currentStock = Number(target.currentStock ?? target.stock ?? 0);
                const newStock = Math.max(currentStock, qtyToAdd);
                addOrUpdateLocalCachedProduct(orgId, {
                  ...target,
                  stock: newStock,
                  currentStock: newStock,
                });
              }
            }
          } catch (tagErr) {
            console.warn(`Tags stock sync notice for product ${productId}:`, tagErr);
          }
        } catch (err) {
          console.warn(`Add stock exception for product ${productId} (${reason}):`, err);
          // Fallback for local cache stock increment
          const localList = getLocalCachedProducts(orgId);
          const target = localList.find((p) => p.id === productId);
          if (target) {
            const newStock = (target.stock || 0) + qtyToAdd;
            addOrUpdateLocalCachedProduct(orgId, {
              ...target,
              stock: newStock,
              currentStock: newStock,
            });
          } else {
            addOrUpdateLocalCachedProduct(orgId, {
              id: productId,
              name: item.productName || "Product",
              barcode: item.barcode || undefined,
              stock: qtyToAdd,
              currentStock: qtyToAdd,
              tags: {
                stock: qtyToAdd,
                mrp: mrpVal,
                selling_price: mrpVal,
                purchase_price: costVal,
                unit: item.unit || "PCS",
              },
            });
          }
        }
      })
    );
  };

  syncBatches().catch((err) => console.warn("Stock addition sync background notice:", err));
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
