import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";
import type { Party, PartyCustomItem } from "@/types/parties";

export type { Party, PartyCustomItem };

export interface Customer {
  id?: string;
  organization_id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  trade_name?: string | null;
  pan?: string | null;
  pincode?: string | null;
  shipping_address?: string | null;
  category?: string | null;
  credit_limit?: number | null;
  credit_period_days?: number | null;
  custom_fields?: Record<string, unknown> | null;
  balance?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Supplier {
  id?: string;
  organization_id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  trade_name?: string | null;
  pan?: string | null;
  pincode?: string | null;
  shipping_address?: string | null;
  category?: string | null;
  credit_limit?: number | null;
  credit_period_days?: number | null;
  custom_fields?: Record<string, unknown> | null;
  balance?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CreditTransaction {
  id?: string;
  organization_id?: string;
  party_id: string;
  party_type: "customer" | "supplier";
  amount: number;
  type: "credit" | "payment" | "opening_balance";
  description?: string | null;
  reference_id?: string | null;
  created_by?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface BankAccount {
  id?: string;
  organization_id?: string;
  name?: string;
  bank_name?: string;
  bankName?: string;
  account_holder_name?: string;
  accountHolderName?: string;
  account_number?: string;
  accountNumber?: string;
  ifsc_code?: string;
  ifscCode?: string;
  account_type?: string;
  accountType?: string;
  balance?: number;
  is_primary?: boolean;
  isDefault?: boolean;
  upi_id?: string;
  upiId?: string;
  created_by?: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface BankTransaction {
  id?: string;
  organization_id?: string;
  date: string;
  type: "money_in" | "money_out" | "transfer";
  account_id?: string;
  accountId: string;
  target_account_id?: string;
  targetAccountId?: string;
  amount: number;
  payment_mode?: string;
  paymentMode: string;
  party_name?: string;
  partyName?: string;
  category?: string;
  reference_no?: string;
  referenceNo?: string;
  notes?: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface BulkImportResult {
  inserted: number;
  updated: number;
  count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all customers for an organization.
 * Endpoint: GET /customers?organization_id=...
 */
export async function getCustomers(
  orgId: string,
  options?: {
    search?: string;
    limit?: number;
    include_balance?: boolean;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<ApiResponse<Customer[]>> {
  return apiGet<Customer[]>(
    "/customers",
    {
      organization_id: orgId,
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.include_balance ? { include_balance: true } : {}),
      ...(options?.sort ? { sort: options.sort } : {}),
      ...(options?.order ? { order: options.order } : {}),
    },
    { organizationId: orgId }
  );
}

/**
 * Fetch a single customer by ID.
 * Endpoint: GET /customers/:id
 */
export async function getCustomerById(
  id: string,
  orgId?: string
): Promise<ApiResponse<Customer>> {
  return apiGet<Customer>(`/customers/${id}`, {}, { organizationId: orgId });
}

/**
 * Create a new customer.
 * Endpoint: POST /customers
 */
export async function createCustomer(
  payload: Partial<Customer>,
  orgId?: string
): Promise<ApiResponse<Customer>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<Customer>("/customers", body, { organizationId: effectiveOrg });
}

/**
 * Update an existing customer.
 * Endpoint: PUT /customers/:id
 */
export async function updateCustomer(
  id: string,
  payload: Partial<Customer>,
  orgId?: string
): Promise<ApiResponse<Customer>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<Customer>(`/customers/${id}`, payload, { organizationId: effectiveOrg });
}

/**
 * Upsert or save a customer (creates if no id, updates if id provided).
 */
export async function saveCustomer(
  customer: Partial<Customer>,
  orgId?: string
): Promise<ApiResponse<Customer>> {
  if (customer.id) {
    return updateCustomer(customer.id, customer, orgId);
  }
  return createCustomer(customer, orgId);
}

/**
 * Delete a customer by ID.
 * Endpoint: DELETE /customers/:id
 */
export async function deleteCustomer(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/customers/${id}`, {
    organizationId: orgId,
  });
}

/**
 * Bulk import / upsert customers.
 * Endpoint: POST /customers/bulk
 */
export async function bulkImportCustomers(
  items: Partial<Customer>[],
  strategy = "overwrite",
  orgId?: string
): Promise<ApiResponse<BulkImportResult>> {
  return apiPost<BulkImportResult>(
    "/customers/bulk",
    {
      items,
      strategy,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export const bulkUpsertCustomers = async (
  items: Partial<Customer>[],
  orgId?: string
): Promise<ApiResponse<{ count: number; success: boolean }>> => {
  const res = await bulkImportCustomers(items, "overwrite", orgId);
  return {
    data: res.data ? { count: res.data.count ?? (res.data.inserted + res.data.updated), success: true } : null,
    error: res.error,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIERS API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all suppliers for an organization.
 * Endpoint: GET /suppliers?organization_id=...
 */
export async function getSuppliers(
  orgId: string,
  options?: {
    search?: string;
    limit?: number;
    include_balance?: boolean;
    sort?: string;
    order?: "asc" | "desc";
  }
): Promise<ApiResponse<Supplier[]>> {
  return apiGet<Supplier[]>(
    "/suppliers",
    {
      organization_id: orgId,
      ...(options?.search ? { search: options.search } : {}),
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.include_balance ? { include_balance: true } : {}),
      ...(options?.sort ? { sort: options.sort } : {}),
      ...(options?.order ? { order: options.order } : {}),
    },
    { organizationId: orgId }
  );
}

/**
 * Fetch a single supplier by ID.
 * Endpoint: GET /suppliers/:id
 */
export async function getSupplierById(
  id: string,
  orgId?: string
): Promise<ApiResponse<Supplier>> {
  return apiGet<Supplier>(`/suppliers/${id}`, {}, { organizationId: orgId });
}

/**
 * Create a new supplier.
 * Endpoint: POST /suppliers
 */
export async function createSupplier(
  payload: Partial<Supplier>,
  orgId?: string
): Promise<ApiResponse<Supplier>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<Supplier>("/suppliers", body, { organizationId: effectiveOrg });
}

/**
 * Update an existing supplier.
 * Endpoint: PUT /suppliers/:id
 */
export async function updateSupplier(
  id: string,
  payload: Partial<Supplier>,
  orgId?: string
): Promise<ApiResponse<Supplier>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPut<Supplier>(`/suppliers/${id}`, payload, { organizationId: effectiveOrg });
}

/**
 * Upsert or save a supplier (creates if no id, updates if id provided).
 */
export async function saveSupplier(
  supplier: Partial<Supplier>,
  orgId?: string
): Promise<ApiResponse<Supplier>> {
  if (supplier.id) {
    return updateSupplier(supplier.id, supplier, orgId);
  }
  return createSupplier(supplier, orgId);
}

/**
 * Delete a supplier by ID.
 * Endpoint: DELETE /suppliers/:id
 */
export async function deleteSupplier(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/suppliers/${id}`, {
    organizationId: orgId,
  });
}

/**
 * Bulk import / upsert suppliers.
 * Endpoint: POST /suppliers/bulk
 */
export async function bulkImportSuppliers(
  items: Partial<Supplier>[],
  strategy = "overwrite",
  orgId?: string
): Promise<ApiResponse<BulkImportResult>> {
  return apiPost<BulkImportResult>(
    "/suppliers/bulk",
    {
      items,
      strategy,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

export const bulkUpsertSuppliers = async (
  items: Partial<Supplier>[],
  orgId?: string
): Promise<ApiResponse<{ count: number; success: boolean }>> => {
  const res = await bulkImportSuppliers(items, "overwrite", orgId);
  return {
    data: res.data ? { count: res.data.count ?? (res.data.inserted + res.data.updated), success: true } : null,
    error: res.error,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC / UNIFIED PARTIES (CUSTOMERS & SUPPLIERS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic insert or update for dynamic targetTable ("customers" | "suppliers").
 */
export async function savePartyRecord(
  table: "customers" | "suppliers" | string,
  payload: Record<string, unknown>,
  id?: string,
  orgId?: string
): Promise<ApiResponse<any>> {
  const cleanTable = table === "suppliers" ? "suppliers" : "customers";
  if (id || payload.id) {
    const targetId = (id || payload.id) as string;
    return apiPut(`/${cleanTable}/${targetId}`, payload, { organizationId: orgId });
  }
  return apiPost(`/${cleanTable}`, payload, { organizationId: orgId });
}

export async function deletePartyRecord(
  table: "customers" | "suppliers" | string,
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  const cleanTable = table === "suppliers" ? "suppliers" : "customers";
  return apiDelete<{ success: boolean }>(`/${cleanTable}/${id}`, { organizationId: orgId });
}

/**
 * Merge duplicate parties tool.
 * Endpoint: POST /parties/merge
 */
export async function mergeParties(
  primaryId: string,
  duplicateIds: string[],
  partyType = "customer",
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiPost<{ success: boolean }>(
    "/parties/merge",
    {
      primary_id: primaryId,
      duplicate_ids: duplicateIds,
      party_type: partyType,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREDIT TRANSACTIONS & KHATA LEDGER API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch credit transactions for an organization or party.
 * Endpoint: GET /credit-transactions?organization_id=...
 */
export async function getCreditTransactions(
  params: {
    orgId?: string;
    organization_id?: string;
    partyId?: string;
    party_id?: string;
    partyType?: string;
    party_type?: string;
    limit?: number;
    referenceId?: string;
    reference_id?: string;
    order?: "asc" | "desc";
    sort?: string;
  }
): Promise<ApiResponse<CreditTransaction[]>> {
  const effectiveOrg = params.orgId || params.organization_id;
  const partyId = params.partyId || params.party_id;
  const partyType = params.partyType || params.party_type;
  const refId = params.referenceId || params.reference_id;

  return apiGet<CreditTransaction[]>(
    "/credit-transactions",
    {
      ...(effectiveOrg ? { organization_id: effectiveOrg } : {}),
      ...(partyId ? { party_id: partyId } : {}),
      ...(partyType ? { party_type: partyType } : {}),
      ...(refId ? { reference_id: refId } : {}),
      ...(params.limit !== undefined ? { limit: params.limit } : {}),
      ...(params.order ? { order: params.order } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
    },
    { organizationId: effectiveOrg }
  );
}

/**
 * Record a credit or payment transaction.
 * Endpoint: POST /credit-transactions
 */
export async function recordCreditTransaction(
  payload: Partial<CreditTransaction>,
  orgId?: string
): Promise<ApiResponse<CreditTransaction>> {
  const effectiveOrg = payload.organization_id || orgId;
  const body = {
    ...payload,
    organization_id: effectiveOrg,
  };
  return apiPost<CreditTransaction>("/credit-transactions", body, {
    organizationId: effectiveOrg,
  });
}

export const createCreditTransaction = recordCreditTransaction;

/**
 * Bulk insert credit transactions.
 * Endpoint: POST /credit-transactions/bulk
 */
export async function bulkInsertCreditTransactions(
  items: Partial<CreditTransaction>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/credit-transactions/bulk",
    {
      items,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Delete credit transactions by reference_id (e.g. invoice or return deletion).
 * Endpoint: DELETE /credit-transactions/reference/:refId
 */
export async function deleteCreditTransactionsByReference(
  referenceId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(
    `/credit-transactions/reference/${referenceId}`,
    { organizationId: orgId }
  );
}

/**
 * Reassign credit transactions from one party to another (used during party merge).
 * Endpoint: PUT /credit-transactions/reassign
 */
export async function reassignCreditTransactions(
  fromPartyId: string,
  toPartyId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiPut<{ success: boolean }>(
    "/credit-transactions/reassign",
    {
      from_party_id: fromPartyId,
      to_party_id: toPartyId,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK ACCOUNTS & LEDGERS API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch bank accounts for an organization.
 * Endpoint: GET /bank-accounts?organization_id=...
 */
export async function getBankAccounts(
  orgId: string
): Promise<ApiResponse<BankAccount[]>> {
  return apiGet<BankAccount[]>(
    "/bank-accounts",
    { organization_id: orgId },
    { organizationId: orgId }
  );
}

/**
 * Create a new bank account.
 * Endpoint: POST /bank-accounts
 */
export async function createBankAccount(
  account: Partial<BankAccount>,
  orgId?: string
): Promise<ApiResponse<BankAccount>> {
  const effectiveOrg = account.organization_id || orgId;
  const body = {
    ...account,
    organization_id: effectiveOrg,
  };
  return apiPost<BankAccount>("/bank-accounts", body, {
    organizationId: effectiveOrg,
  });
}

/**
 * Update an existing bank account.
 * Endpoint: PUT /bank-accounts/:id
 */
export async function updateBankAccount(
  id: string,
  account: Partial<BankAccount>,
  orgId?: string
): Promise<ApiResponse<BankAccount>> {
  const effectiveOrg = account.organization_id || orgId;
  return apiPut<BankAccount>(`/bank-accounts/${id}`, account, {
    organizationId: effectiveOrg,
  });
}

/**
 * Save bank account (create or update).
 */
export async function saveBankAccount(
  account: Partial<BankAccount>,
  orgId?: string
): Promise<ApiResponse<BankAccount>> {
  if (account.id) {
    return updateBankAccount(account.id, account, orgId);
  }
  return createBankAccount(account, orgId);
}

/**
 * Delete a bank account by ID.
 * Endpoint: DELETE /bank-accounts/:id
 */
export async function deleteBankAccount(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/bank-accounts/${id}`, {
    organizationId: orgId,
  });
}

/**
 * Bulk upsert bank accounts.
 * Endpoint: POST /bank-accounts/bulk
 */
export async function bulkUpsertBankAccounts(
  accounts: Partial<BankAccount>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/bank-accounts/bulk",
    {
      accounts,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Update cash in hand ledger balance.
 * Endpoint: PUT /bank-accounts/cash-in-hand
 */
export async function updateCashInHand(
  amount: number,
  orgId?: string
): Promise<ApiResponse<{ success: boolean; balance: number }>> {
  return apiPut<{ success: boolean; balance: number }>(
    "/bank-accounts/cash-in-hand",
    {
      amount,
      organization_id: orgId,
    },
    { organizationId: orgId }
  );
}

/**
 * Fetch bank & cash transactions.
 * Endpoint: GET /bank-transactions?organization_id=...
 */
export async function getBankTransactions(
  params: {
    orgId: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }
): Promise<ApiResponse<BankTransaction[]>> {
  return apiGet<BankTransaction[]>(
    "/bank-transactions",
    {
      organization_id: params.orgId,
      ...(params.accountId ? { account_id: params.accountId } : {}),
      ...(params.startDate ? { start_date: params.startDate } : {}),
      ...(params.endDate ? { end_date: params.endDate } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.page ? { page: params.page } : {}),
    },
    { organizationId: params.orgId }
  );
}

/**
 * Record a bank transaction (money in, money out, or transfer).
 * Endpoint: POST /bank-transactions
 */
export async function recordBankTransaction(
  transaction: Record<string, unknown>,
  orgId?: string
): Promise<ApiResponse<BankTransaction>> {
  return apiPost<BankTransaction>("/bank-transactions", transaction, {
    organizationId: orgId,
  });
}

/**
 * Delete a bank transaction.
 * Endpoint: DELETE /bank-transactions/:id
 */
export async function deleteBankTransaction(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/bank-transactions/${id}`, {
    organizationId: orgId,
  });
}

/**
 * Centralized parties API namespace.
 */
export const partiesApi = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  saveCustomer,
  deleteCustomer,
  bulkImportCustomers,
  bulkUpsertCustomers,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  saveSupplier,
  deleteSupplier,
  bulkImportSuppliers,
  bulkUpsertSuppliers,
  savePartyRecord,
  deletePartyRecord,
  mergeParties,
  getCreditTransactions,
  recordCreditTransaction,
  createCreditTransaction,
  bulkInsertCreditTransactions,
  deleteCreditTransactionsByReference,
  reassignCreditTransactions,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  saveBankAccount,
  deleteBankAccount,
  bulkUpsertBankAccounts,
  updateCashInHand,
  getBankTransactions,
  recordBankTransaction,
  deleteBankTransaction,
};

export default partiesApi;
