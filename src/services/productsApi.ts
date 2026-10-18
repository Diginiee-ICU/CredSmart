import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";
import type { ProductCatalogOption } from "@/context/ProductsContext";

export type { ProductCatalogOption };

export interface ProductBatch {
  id?: string;
  product_id?: string;
  productId?: string;
  batch_number?: string;
  batchNumber?: string;
  cost_price?: number;
  costPrice?: number;
  mrp?: number;
  stock?: number;
  current_stock?: number;
  currentStock?: number;
  expiry_date?: string | null;
  expiryDate?: string | null;
  location_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveProductPayload {
  id?: string;
  organization_id?: string;
  organizationId?: string;
  name: string;
  brand?: string | null;
  category?: string;
  barcode?: string | null;
  sku?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  tags?: Record<string, unknown>;
  batches?: ProductBatch[];
  product_batches?: ProductBatch[];
  [key: string]: unknown;
}

export interface StockAdjustmentParams {
  productId: string;
  batchId?: string;
  adjustType: "add" | "reduce" | "set";
  quantity: number;
  reason?: string;
  orgId?: string;
  batchNumber?: string;
  costPrice?: number;
  mrp?: number;
  expiryDate?: string | null;
}

export interface BulkImportResult {
  inserted: number;
  updated: number;
  count?: number;
}

export interface BulkDeleteResult {
  success: boolean;
  deletedCount?: number;
}

export interface BulkUpdateResult {
  success: boolean;
  updatedCount?: number;
}

/**
 * Fetch all products for an organization with their nested batches.
 * Endpoint: GET /products?organization_id=...
 */
export async function getProducts(
  orgId: string,
  options?: {
    search?: string;
    barcode?: string;
    category?: string;
    limit?: number;
    page?: number;
  }
): Promise<ApiResponse<ProductCatalogOption[]>> {
  return apiGet<ProductCatalogOption[]>(
    "/products",
    {
      organization_id: orgId,
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.barcode ? { barcode: options.barcode } : {}),
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.limit ? { limit: options.limit } : {}),
      ...(options?.page ? { page: options.page } : {}),
    },
    { organizationId: orgId }
  );
}

/**
 * Fetch a single product by ID.
 * Endpoint: GET /products/:id
 */
export async function getProductById(
  id: string,
  orgId?: string
): Promise<ApiResponse<ProductCatalogOption>> {
  return apiGet<ProductCatalogOption>(`/products/${id}`, {}, { organizationId: orgId });
}

/**
 * Create a new product.
 * Endpoint: POST /products
 */
export async function createProduct(
  payload: SaveProductPayload,
  orgId?: string
): Promise<ApiResponse<ProductCatalogOption>> {
  const effectiveOrg = payload.organization_id || payload.organizationId || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<ProductCatalogOption>("/products", body, {
    organizationId: effectiveOrg,
  });
}

/**
 * Update an existing product.
 * Endpoint: PUT /products/:id
 */
export async function updateProduct(
  id: string,
  payload: Partial<SaveProductPayload>,
  orgId?: string
): Promise<ApiResponse<ProductCatalogOption>> {
  const effectiveOrg = payload.organization_id || payload.organizationId || orgId;
  return apiPut<ProductCatalogOption>(`/products/${id}`, payload, {
    organizationId: effectiveOrg,
  });
}

/**
 * Delete a product by ID.
 * Endpoint: DELETE /products/:id
 */
export async function deleteProduct(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/products/${id}`, {
    organizationId: orgId,
  });
}

/**
 * Bulk import / upsert products.
 * Endpoint: POST /products/bulk
 */
export async function bulkImport(
  items: SaveProductPayload[],
  strategy = "overwrite",
  orgId?: string
): Promise<ApiResponse<BulkImportResult>> {
  return apiPost<BulkImportResult>(
    "/products/bulk",
    {
      items,
      strategy,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Bulk delete products by IDs.
 * Endpoint: POST /products/bulk-delete
 */
export async function bulkDelete(
  ids: string[],
  orgId?: string
): Promise<ApiResponse<BulkDeleteResult>> {
  return apiPost<BulkDeleteResult>(
    "/products/bulk-delete",
    {
      ids,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export const bulkDeleteProducts = bulkDelete;

/**
 * Bulk update products by IDs.
 * Endpoint: POST /products/bulk-update
 */
export async function bulkUpdate(
  ids: string[],
  update: Record<string, unknown>,
  orgId?: string
): Promise<ApiResponse<BulkUpdateResult>> {
  return apiPost<BulkUpdateResult>(
    "/products/bulk-update",
    {
      ids,
      update,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export const bulkUpdateProducts = bulkUpdate;

/**
 * Adjust stock for a product / batch.
 * Endpoint: POST /inventory/adjust-stock
 */
export async function adjustStock(
  params: StockAdjustmentParams
): Promise<ApiResponse<{ batch: ProductBatch; totalStock: number }>> {
  return apiPost<{ batch: ProductBatch; totalStock: number }>(
    "/inventory/adjust-stock",
    params,
    { organizationId: params.orgId }
  );
}

/**
 * Fetch batches for one or more product IDs.
 * Endpoint: GET /product-batches?product_ids=...
 */
export async function getBatches(
  productIds: string[] | string,
  orgId?: string
): Promise<ApiResponse<ProductBatch[]>> {
  const idsParam = Array.isArray(productIds) ? productIds.join(",") : productIds;
  return apiGet<ProductBatch[]>(
    "/product-batches",
    { product_ids: idsParam },
    { organizationId: orgId }
  );
}

/**
 * Create a new product batch.
 * Endpoint: POST /product-batches
 */
export async function createBatch(
  payload: ProductBatch,
  orgId?: string
): Promise<ApiResponse<ProductBatch>> {
  return apiPost<ProductBatch>("/product-batches", payload, {
    organizationId: orgId,
  });
}

/**
 * Update an existing product batch.
 * Endpoint: PUT /product-batches/:batchId
 */
export async function updateBatch(
  batchId: string,
  payload: Partial<ProductBatch>,
  orgId?: string
): Promise<ApiResponse<ProductBatch>> {
  return apiPut<ProductBatch>(`/product-batches/${batchId}`, payload, {
    organizationId: orgId,
  });
}

/**
 * Delete a product batch by ID.
 * Endpoint: DELETE /product-batches/:batchId
 */
export async function deleteBatch(
  batchId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/product-batches/${batchId}`, {
    organizationId: orgId,
  });
}

/**
 * Delete batches belonging to specific product IDs.
 * Endpoint: POST /product-batches/bulk-delete
 */
export async function deleteBatchesByProductIds(
  productIds: string[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; deletedCount?: number }>> {
  return apiPost<{ success: boolean; deletedCount?: number }>(
    "/product-batches/bulk-delete",
    {
      product_ids: productIds,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Bulk upsert batches.
 * Endpoint: POST /product-batches/bulk
 */
export async function bulkUpsertBatches(
  batches: ProductBatch[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/product-batches/bulk",
    {
      batches,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Check if a barcode is available or already in use.
 * Endpoint: GET /products/check-barcode?barcode=...&organization_id=...
 */
export async function checkBarcodeUnique(
  barcode: string,
  orgId: string,
  excludeProductId?: string
): Promise<ApiResponse<{ available: boolean; existingProduct?: ProductCatalogOption | null }>> {
  return apiGet<{ available: boolean; existingProduct?: ProductCatalogOption | null }>(
    "/products/check-barcode",
    {
      barcode,
      organization_id: orgId,
      ...(excludeProductId ? { exclude_id: excludeProductId } : {}),
    },
    { organizationId: orgId }
  );
}

/**
 * Centralized products & inventory API service namespace object.
 */
export const productsApi = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImport,
  bulkDelete,
  bulkDeleteProducts,
  bulkUpdate,
  bulkUpdateProducts,
  adjustStock,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  deleteBatchesByProductIds,
  bulkUpsertBatches,
  checkBarcodeUnique,
};

export default productsApi;
