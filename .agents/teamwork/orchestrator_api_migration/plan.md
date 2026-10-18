# Project Plan: Frontend Supabase Table Query Migration to Dedicated Backend API

## Objective
Migrate all direct frontend Supabase table queries (`supabase.from(...)`) across all domains to standard fetch calls communicating with the dedicated backend API (`https://api.credsmart.online/api/*`), attaching active session Bearer tokens, and preserving full UI and contract parity.

## Phases

### Phase 0: Codebase Survey & Feature Inventory Mapping
- Spawn 3 Explorers in parallel to map every direct `supabase.from(...)` call across `src/`:
  - Explorer 1: Products, Inventory, Categories, Units, Barcodes, Pricing
  - Explorer 2: Parties, Customers, Suppliers, Khata, Credit Transactions
  - Explorer 3: Invoices, Sales, Purchases, Settings, Ledgers, Bank/Cash, Expenses, CRM & Miscellaneous
- Synthesize findings into `PROJECT.md § Feature Inventory` and code layout mapping.

### Phase 1: M1 - Centralized API Client & Auth Interceptor
- Establish centralized HTTP client (`src/lib/apiClient.ts` or similar) pointing to `https://api.credsmart.online/api`.
- Implement automatic bearer token retrieval from active Supabase session.
- Normalize request methods (GET, POST, PUT, DELETE, PATCH), query params, headers, and error formats.
- Verify with unit tests.

### Phase 2: M2 - Products & Inventory Domain Migration
- Migrate all direct table queries for products, inventory, batches, stock adjustments, categories, etc. to use the backend API client.
- Preserve response shapes, error toasts, and loading states.
- Worker -> Reviewer -> Challenger -> Auditor verification.

### Phase 3: M3 - Customers, Suppliers & Parties Domain Migration
- Migrate all direct table queries for customers, suppliers, parties, opening balances, and credit transactions.
- Preserve full UI state parity and verify zero regressions.
- Worker -> Reviewer -> Challenger -> Auditor verification.

### Phase 4: M4 - Invoices, Sales & Vouchers Domain Migration
- Migrate sales invoices, sales items, purchase invoices, purchase items, and voucher transactions.
- Verify calculations, sequences, PDF generation triggers, and CRUD operations.
- Worker -> Reviewer -> Challenger -> Auditor verification.

### Phase 5: M5 - Settings, Ledgers, Cash/Bank & Misc Domain Migration
- Migrate organization settings, user profiles, cash/bank accounts, expenses, and any remaining CRM table queries.
- Ensure all remaining `supabase.from(...)` table calls are eliminated from frontend application code.
- Worker -> Reviewer -> Challenger -> Auditor verification.

### Phase 6: E2E Verification & Static Grep Scan
- Run automated grep/AST scan verifying 0 direct `supabase.from(...)` query calls in frontend code.
- Verify `npm run build` succeeds cleanly with 0 TypeScript/compilation errors.
- Run complete test suite and final forensic audit.
