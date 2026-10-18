import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_name: string;
  product_id?: string | null;
  batch_id?: string | null;
  batch_number?: string | null;
  mrp?: number | string | null;
  quantity?: number | null;
  line_total?: number | string | null;
  [key: string]: unknown;
}

export interface CustomerSummary {
  name?: string | null;
  phone?: string | null;
  gstin?: string | null;
  email?: string | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface Sale {
  id: string;
  organization_id?: string;
  invoice_number?: string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  discount_label?: string | null;
  payment_method?: string | null;
  tax?: number | string | null;
  total?: number | string | null;
  total_amount?: number | string | null;
  customer_id?: string | null;
  customers?: CustomerSummary | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  sale_items?: SaleItem[] | null;
  items?: SaleItem[] | null;
  created_by?: string | null;
  created_at?: string | null;
  notes?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface PurchaseInvoiceItem {
  id?: string;
  purchase_invoice_id?: string;
  product_id?: string | null;
  product_name?: string;
  batch_number?: string | null;
  quantity?: number | null;
  received_quantity?: number | null;
  unit_price?: number | string | null;
  cost_price?: number | string | null;
  mrp?: number | string | null;
  total?: number | string | null;
  expiry_date?: string | null;
  [key: string]: unknown;
}

export interface SupplierSummary {
  name?: string | null;
  phone?: string | null;
  gstin?: string | null;
  email?: string | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface PurchaseInvoice {
  id: string;
  organization_id?: string;
  invoice_number?: string | null;
  bill_number?: string | null;
  supplier_id?: string | null;
  suppliers?: SupplierSummary | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total_amount?: number | string | null;
  total?: number | string | null;
  payment_method?: string | null;
  status?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  purchase_invoice_items?: PurchaseInvoiceItem[] | null;
  items?: PurchaseInvoiceItem[] | null;
  [key: string]: unknown;
}

export interface SalesReturn {
  id: string;
  organization_id?: string;
  return_number?: string | null;
  sale_id?: string | null;
  customer_id?: string | null;
  reason?: string | null;
  refund_amount?: number | string | null;
  amount?: number | string | null;
  items?: unknown;
  status?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface PurchaseReturn {
  id: string;
  organization_id?: string;
  return_number?: string | null;
  purchase_id?: string | null;
  supplier_id?: string | null;
  reason?: string | null;
  refund_amount?: number | string | null;
  amount?: number | string | null;
  items?: unknown;
  status?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface Expense {
  id: string;
  organization_id?: string;
  expense_number?: string | null;
  category: string;
  party_name?: string | null;
  amount: number;
  date?: string;
  description?: string | null;
  payment_method?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES & SALE ITEMS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getSales(
  orgId: string,
  options?: {
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    customerId?: string;
    invoiceNumber?: string;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<ApiResponse<Sale[]>> {
  return apiGet<Sale[]>(
    "/sales",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.startDate ? { start_date: options.startDate } : {}),
      ...(options?.endDate ? { end_date: options.endDate } : {}),
      ...(options?.customerId ? { customer_id: options.customerId } : {}),
      ...(options?.invoiceNumber ? { invoice_number: options.invoiceNumber } : {}),
      ...(options?.sort ? { sort: options.sort } : {}),
      ...(options?.order ? { order: options.order } : {}),
    },
    { organizationId: orgId }
  );
}

export async function getSaleById(
  id: string,
  orgId?: string
): Promise<ApiResponse<Sale>> {
  return apiGet<Sale>(`/sales/${id}`, {}, { organizationId: orgId });
}

export async function createSale(
  payload: Partial<Sale>,
  orgId?: string
): Promise<ApiResponse<Sale>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<Sale>("/sales", body, { organizationId: effectiveOrg });
}

export async function updateSale(
  id: string,
  payload: Partial<Sale>,
  orgId?: string
): Promise<ApiResponse<Sale>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<Sale>(`/sales/${id}`, payload, { organizationId: effectiveOrg });
}

export async function deleteSale(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/sales/${id}`, {
    organizationId: orgId,
  });
}

export async function bulkInsertSales(
  items: Partial<Sale>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number; data?: Sale[] }>> {
  return apiPost<{ success: boolean; count?: number; data?: Sale[] }>(
    "/sales/bulk",
    {
      items,
      strategy: "insert",
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export async function bulkUpsertSales(
  items: Partial<Sale>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number; data?: Sale[] }>> {
  return apiPost<{ success: boolean; count?: number; data?: Sale[] }>(
    "/sales/bulk",
    {
      items,
      strategy: "upsert",
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export async function getSaleItems(
  saleId?: string,
  orgId?: string
): Promise<ApiResponse<SaleItem[]>> {
  return apiGet<SaleItem[]>(
    "/sale-items",
    {
      ...(saleId ? { sale_id: saleId } : {}),
      ...(orgId ? { organization_id: orgId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createSaleItems(
  items: Partial<SaleItem>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/sale-items",
    { items, organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function deleteSaleItemsBySaleId(
  saleId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(
    `/sale-items?sale_id=${saleId}`,
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE INVOICES & PURCHASE ITEMS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getPurchaseInvoices(
  orgId: string,
  options?: {
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    supplierId?: string;
    invoiceNumber?: string;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<ApiResponse<PurchaseInvoice[]>> {
  return apiGet<PurchaseInvoice[]>(
    "/purchase-invoices",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.startDate ? { start_date: options.startDate } : {}),
      ...(options?.endDate ? { end_date: options.endDate } : {}),
      ...(options?.supplierId ? { supplier_id: options.supplierId } : {}),
      ...(options?.invoiceNumber ? { invoice_number: options.invoiceNumber } : {}),
      ...(options?.sort ? { sort: options.sort } : {}),
      ...(options?.order ? { order: options.order } : {}),
    },
    { organizationId: orgId }
  );
}

export async function getPurchaseInvoiceById(
  id: string,
  orgId?: string
): Promise<ApiResponse<PurchaseInvoice>> {
  return apiGet<PurchaseInvoice>(
    `/purchase-invoices/${id}`,
    {},
    { organizationId: orgId }
  );
}

export async function createPurchaseInvoice(
  payload: Partial<PurchaseInvoice>,
  orgId?: string
): Promise<ApiResponse<PurchaseInvoice>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<PurchaseInvoice>("/purchase-invoices", body, {
    organizationId: effectiveOrg,
  });
}

export async function updatePurchaseInvoice(
  id: string,
  payload: Partial<PurchaseInvoice>,
  orgId?: string
): Promise<ApiResponse<PurchaseInvoice>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<PurchaseInvoice>(`/purchase-invoices/${id}`, payload, {
    organizationId: effectiveOrg,
  });
}

export async function deletePurchaseInvoice(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/purchase-invoices/${id}`, {
    organizationId: orgId,
  });
}

export async function bulkInsertPurchaseInvoices(
  items: Partial<PurchaseInvoice>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number; data?: PurchaseInvoice[] }>> {
  return apiPost<{ success: boolean; count?: number; data?: PurchaseInvoice[] }>(
    "/purchase-invoices/bulk",
    {
      items,
      strategy: "insert",
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export async function bulkUpsertPurchaseInvoices(
  items: Partial<PurchaseInvoice>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number; data?: PurchaseInvoice[] }>> {
  return apiPost<{ success: boolean; count?: number; data?: PurchaseInvoice[] }>(
    "/purchase-invoices/bulk",
    {
      items,
      strategy: "upsert",
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export async function getPurchaseInvoiceItems(
  invoiceId?: string,
  orgId?: string
): Promise<ApiResponse<PurchaseInvoiceItem[]>> {
  return apiGet<PurchaseInvoiceItem[]>(
    "/purchase-invoice-items",
    {
      ...(invoiceId ? { purchase_invoice_id: invoiceId } : {}),
      ...(orgId ? { organization_id: orgId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createPurchaseInvoiceItems(
  items: Partial<PurchaseInvoiceItem>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/purchase-invoice-items",
    { items, organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function deletePurchaseInvoiceItemsByInvoiceId(
  invoiceId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(
    `/purchase-invoice-items?purchase_invoice_id=${invoiceId}`,
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES & PURCHASE RETURNS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesReturns(
  orgId: string,
  options?: { limit?: number; search?: string }
): Promise<ApiResponse<SalesReturn[]>> {
  return apiGet<SalesReturn[]>(
    "/sales-returns",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.search ? { search: options.search } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createSalesReturn(
  payload: Partial<SalesReturn>,
  orgId?: string
): Promise<ApiResponse<SalesReturn>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<SalesReturn>("/sales-returns", body, {
    organizationId: effectiveOrg,
  });
}

export async function updateSalesReturn(
  id: string,
  payload: Partial<SalesReturn>,
  orgId?: string
): Promise<ApiResponse<SalesReturn>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<SalesReturn>(`/sales-returns/${id}`, payload, {
    organizationId: effectiveOrg,
  });
}

export async function deleteSalesReturn(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/sales-returns/${id}`, {
    organizationId: orgId,
  });
}

export async function createSalesReturnItems(
  items: Record<string, unknown>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/sales-return-items",
    { items, organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function getPurchaseReturns(
  orgId: string,
  options?: { limit?: number; search?: string; status?: string }
): Promise<ApiResponse<PurchaseReturn[]>> {
  return apiGet<PurchaseReturn[]>(
    "/purchase-returns",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createPurchaseReturn(
  payload: Partial<PurchaseReturn>,
  orgId?: string
): Promise<ApiResponse<PurchaseReturn>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<PurchaseReturn>("/purchase-returns", body, {
    organizationId: effectiveOrg,
  });
}

export async function updatePurchaseReturn(
  id: string,
  payload: Partial<PurchaseReturn>,
  orgId?: string
): Promise<ApiResponse<PurchaseReturn>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<PurchaseReturn>(`/purchase-returns/${id}`, payload, {
    organizationId: effectiveOrg,
  });
}

export async function deletePurchaseReturn(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/purchase-returns/${id}`, {
    organizationId: orgId,
  });
}

export async function createPurchaseReturnItems(
  items: Record<string, unknown>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/purchase-return-items",
    { items, organization_id: orgId },
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES API
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenses(
  orgId: string,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<ApiResponse<Expense[]>> {
  return apiGet<Expense[]>(
    "/expenses",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.startDate ? { start_date: options.startDate } : {}),
      ...(options?.endDate ? { end_date: options.endDate } : {}),
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.sort ? { sort: options.sort } : {}),
      ...(options?.order ? { order: options.order } : {}),
    },
    { organizationId: orgId }
  );
}

export async function getExpenseById(
  id: string,
  orgId?: string
): Promise<ApiResponse<Expense>> {
  return apiGet<Expense>(`/expenses/${id}`, {}, { organizationId: orgId });
}

export async function createExpense(
  payload: Partial<Expense>,
  orgId?: string
): Promise<ApiResponse<Expense>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<Expense>("/expenses", body, { organizationId: effectiveOrg });
}

export async function updateExpense(
  id: string,
  payload: Partial<Expense>,
  orgId?: string
): Promise<ApiResponse<Expense>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<Expense>(`/expenses/${id}`, payload, { organizationId: effectiveOrg });
}

export async function deleteExpense(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/expenses/${id}`, {
    organizationId: orgId,
  });
}

export async function bulkInsertExpenses(
  items: Partial<Expense>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/expenses/bulk",
    {
      items,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL INVOICES API NAMESPACE
// ─────────────────────────────────────────────────────────────────────────────

export const invoicesApi = {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
  bulkInsertSales,
  bulkUpsertSales,
  getSaleItems,
  createSaleItems,
  deleteSaleItemsBySaleId,
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  bulkInsertPurchaseInvoices,
  bulkUpsertPurchaseInvoices,
  getPurchaseInvoiceItems,
  createPurchaseInvoiceItems,
  deletePurchaseInvoiceItemsByInvoiceId,
  getSalesReturns,
  createSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
  createSalesReturnItems,
  getPurchaseReturns,
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  createPurchaseReturnItems,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkInsertExpenses,
};

export default invoicesApi;
