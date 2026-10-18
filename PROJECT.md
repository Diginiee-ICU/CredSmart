# Project: Frontend Supabase Table Query Migration to Dedicated Backend API

## Architecture
- **Dedicated Backend API Base URL**: `https://api.credsmart.online/api`
- **Centralized Client Layer**: `src/lib/apiClient.ts`
  - Encapsulates standard `fetch()` calls.
  - Automatically retrieves active Supabase session token via `supabase.auth.getSession()`.
  - Attaches `Authorization: Bearer <session.access_token>`.
  - Attaches `x-organization-id` header when organization context is available.
  - Handles token refresh transparently on 401 Unauthorized via `supabase.auth.refreshSession()`.
  - Normalizes responses into `{ data: T | null, error: ApiError | null }`, preserving exact shape parity for frontend consumers.
- **Migration Scope**: Eliminate all direct `supabase.from(...)` table query calls across 265 application files and 33 tables. Supabase Storage (`supabase.storage.from`) and Supabase Realtime Channels (`supabase.channel`) are preserved or abstracted.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Centralized API Client | Core HTTP wrapper with base URL, token injection, error normalization, retry logic | M1 | survey |
| 2 | Auth Token Interceptor | Automatic JWT retrieval from active session & Bearer propagation | M1 | survey |
| 3 | Products & Inventory Query Migration | Migrate products and product_batches queries to `/api/products/*` | M2 | survey |
| 4 | Batch Management & Stock Adjustments | Stock adjust, batch lookup, and barcode queries to `/api/product-batches/*` | M2 | survey |
| 5 | Customers & Debtors Migration | Customer listing, CRUD, search, and selection queries to `/api/customers/*` | M3 | survey |
| 6 | Suppliers & Creditors Migration | Supplier listing, CRUD, search, and purchase integration to `/api/suppliers/*` | M3 | survey |
| 7 | Party Khata & Credit Transactions | Ledger balance queries, opening balances, and payments to `/api/credit-transactions/*` | M3 | survey |
| 8 | Bank & Cash Accounts Migration | Bank accounts and cash ledgers migration to `/api/bank-accounts/*` | M3 | survey |
| 9 | Sales Invoices & Line Items | Sales creation, in-place edit, history, and line items to `/api/sales/*` | M4 | survey |
| 10 | Purchase Invoices & Line Items | Purchase orders, drafts, line items, and status updates to `/api/purchases/*` | M4 | survey |
| 11 | Returns, Notes & Expenses | Sales/purchase returns and operating expenses to `/api/returns/*`, `/api/expenses/*` | M4 | survey |
| 12 | Organizations & Memberships | Tenant creation, organization switching, and staff roles to `/api/organizations/*` | M5 | survey |
| 13 | Profiles & Staff Invitations | User profiles, invitations, godowns, and audit logs to `/api/settings/*` | M5 | survey |
| 14 | CRM Modules Migration | CRM Roles, Attendance/Geofence, and Payroll queries to `/api/crm/*` | M5 | survey |
| 15 | Static Grep & Build Acceptance | AST/Grep scan verifying 0 table queries and clean build | M6 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Centralized API Client & Auth Interceptor | `src/lib/apiClient.ts`, token propagation, error normalization, tests | none | DONE |
| 2 | M2: Products & Inventory Domain Migration | `products`, `product_batches` queries across 21 files | M1 | DONE |
| 3 | M3: Customers, Suppliers & Parties Migration | `customers`, `suppliers`, `credit_transactions`, `bank_accounts` across 11 files | M1 | DONE |
| 4 | M4: Invoices, Sales, Purchases & Expenses | `sales`, `sale_items`, `purchase_invoices`, `expenses`, `returns` across 12 files | M1 | DONE |
| 5 | M5: Settings, Organizations & CRM Migration | `organizations`, `profiles`, `staff_invitations`, `crm_*` across 15 files | M1 | DONE |
| 6 | M6: E2E Verification & Final Audit | Automated static grep scan, `npm run build`, full regression audit | M2, M3, M4, M5 | DONE |

## Interface Contracts

### Client ↔ Dedicated Backend API
- **Base URL**: `https://api.credsmart.online/api`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <Supabase_JWT>`
  - `x-organization-id: <active_org_uuid>`
- **Response Shape**:
  ```typescript
  export interface ApiResponse<T> {
    data: T | null;
    error: {
      message: string;
      code?: string;
      status?: number;
    } | null;
  }
  ```

### Products Domain ↔ API Client (`src/services/productsApi.ts`)
- `getProducts(orgId: string): Promise<ApiResponse<ProductCatalogOption[]>>`
- `getProductById(id: string): Promise<ApiResponse<ProductCatalogOption>>`
- `createProduct(payload: SaveProductPayload): Promise<ApiResponse<ProductCatalogOption>>`
- `updateProduct(id: string, payload: Partial<SaveProductPayload>): Promise<ApiResponse<ProductCatalogOption>>`
- `deleteProduct(id: string, orgId?: string): Promise<ApiResponse<{ success: boolean }>>`
- `bulkImport(items: SaveProductPayload[], strategy?: string, orgId?: string): Promise<ApiResponse<{ inserted: number; updated: number }>>`
- `adjustStock(params: { productId: string; batchId?: string; adjustType: "add" | "reduce" | "set"; quantity: number; reason?: string; orgId?: string }): Promise<ApiResponse<{ batch: ProductBatch; totalStock: number }>>`

### Parties Domain ↔ API Client (`src/services/partiesApi.ts`)
- `getCustomers(orgId: string, options?: { include_balance?: boolean }): Promise<ApiResponse<Customer[]>>`
- `saveCustomer(customer: Partial<Customer>): Promise<ApiResponse<Customer>>`
- `deleteCustomer(id: string): Promise<ApiResponse<{ success: boolean }>>`
- `getSuppliers(orgId: string, options?: { include_balance?: boolean }): Promise<ApiResponse<Supplier[]>>`
- `saveSupplier(supplier: Partial<Supplier>): Promise<ApiResponse<Supplier>>`
- `deleteSupplier(id: string): Promise<ApiResponse<{ success: boolean }>>`
- `getCreditTransactions(params: { orgId: string; partyId?: string; partyType?: string }): Promise<ApiResponse<CreditTransaction[]>>`
- `recordCreditTransaction(transaction: Partial<CreditTransaction>): Promise<ApiResponse<CreditTransaction>>`

### Invoices Domain ↔ API Client (`src/services/invoicesApi.ts`)
- `getSales(orgId: string): Promise<ApiResponse<SalesRecord[]>>`
- `saveSale(saleData: CreateSalePayload): Promise<ApiResponse<SalesRecord>>`
- `updateSale(id: string, saleData: UpdateSalePayload): Promise<ApiResponse<SalesRecord>>`
- `deleteSale(id: string): Promise<ApiResponse<{ success: boolean }>>`
- `getNextSequence(orgId: string, prefix?: string): Promise<ApiResponse<{ nextSequence: string; fullNumber: string }>>`
- `getPurchases(orgId: string): Promise<ApiResponse<PurchaseInvoiceRecord[]>>`
- `savePurchase(purchaseData: CreatePurchasePayload): Promise<ApiResponse<PurchaseInvoiceRecord>>`
- `deletePurchase(id: string): Promise<ApiResponse<{ success: boolean }>>`
- `getExpenses(orgId: string): Promise<ApiResponse<ExpenseRecord[]>>`
- `saveExpense(expenseData: CreateExpensePayload): Promise<ApiResponse<ExpenseRecord>>`
- `deleteExpense(id: string): Promise<ApiResponse<{ success: boolean }>>`

## Code Layout
- `src/lib/apiClient.ts` — Core HTTP fetch client with token injector & error normalizer
- `src/services/productsApi.ts` — Products, batches, and inventory API service
- `src/services/partiesApi.ts` — Customers, suppliers, khata, and bank accounts API service
- `src/services/invoicesApi.ts` — Sales, purchases, expenses, and returns API service
- `src/services/settingsApi.ts` — Organizations, memberships, staff, and CRM API service
- `src/test/apiClient.test.ts` — API client unit tests
- `src/test/e2eApiMigration.test.ts` — E2E validation test suite
