# Handoff Report: Frontend Supabase Query Migration Survey (Parties, Khata, Cash & Bank)

**Agent**: explorer_survey_2  
**Recipient**: Orchestrator (73ee3452-ffda-43b4-83da-c3ca2006c47f)  
**Date**: 2026-10-18T17:48:00Z  
**Type**: Hard Handoff (Investigation Complete)  
**Analysis Reference**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\analysis.md`

---

## 1. Observation

A systematic ripgrep and AST audit across `src/` identified direct client-side Supabase table queries (`supabase.from(...)`) touching customers, suppliers, parties, credit transactions, party-wise prices, opening balances, and bank accounts.

### 1.1 Direct Query Call Locations & Operations

1. **Customers Domain (`public.customers`)**:
   - `src/pages/Customers.tsx:223` (`SELECT`), `src/pages/Customers.tsx:357` (`UPDATE`), `src/pages/Customers.tsx:377` (`INSERT`), `src/pages/Customers.tsx:399` (`DELETE`).
   - `src/pages/Parties.tsx:144` (`SELECT`), `src/pages/Parties.tsx:390` (`UPDATE` via `targetTable`), `src/pages/Parties.tsx:422` (`INSERT` via `targetTable`), `src/pages/Parties.tsx:497` (`INSERT` via `targetTable`), `src/pages/Parties.tsx:544` (`DELETE`), `src/pages/Parties.tsx:597` (`DELETE` via `targetTable`).
   - `src/pages/CustomerLedger.tsx:59` (`SELECT` single customer).
   - `src/pages/POSBilling.tsx:568` (`SELECT`), `src/pages/POSBilling.tsx:1345` (`INSERT` quick add).
   - `src/components/SalesInvoiceModal.tsx:434` (`SELECT`), `src/components/SalesInvoiceModal.tsx:1002` (`INSERT` quick add).
   - `src/components/PurchaseInvoiceModal.tsx:512` (`SELECT`), `src/components/PurchaseInvoiceModal.tsx:1051` (`INSERT` quick add).
   - `src/components/AppLayout.tsx:871` (`INSERT` via `targetTable`).
   - `src/components/invoices/mobile/CreatePartyModal.tsx:93` (`INSERT` via `targetTable`).
   - `src/pages/Dashboard.tsx:1281` (`INSERT` via `targetTable`).
   - `src/services/autoSyncService.ts:485` (`SELECT`), `src/services/autoSyncService.ts:691` (`UPSERT` chunk of 1000), `src/services/autoSyncService.ts:926` (`INSERT`).
   - `src/pages/TallyImport.tsx:622, 1473, 1594` (`SELECT`), `src/pages/TallyImport.tsx:775` (`UPSERT`), `src/pages/TallyImport.tsx:1073, 1731` (`INSERT`), `src/pages/TallyImport.tsx:1519` (`UPSERT` via `table`).
   - `src/utils/offlineQueue.ts:135` (`INSERT` offline replay).

2. **Suppliers Domain (`public.suppliers`)**:
   - `src/pages/Suppliers.tsx:167` (`SELECT`), `src/pages/Suppliers.tsx:334` (`UPDATE`), `src/pages/Suppliers.tsx:354` (`INSERT`), `src/pages/Suppliers.tsx:377` (`DELETE`).
   - `src/pages/Parties.tsx:150` (`SELECT`), `src/pages/Parties.tsx:542` (`DELETE`).
   - `src/pages/PurchaseReturns.tsx:153` (`SELECT`).
   - `src/components/PurchaseInvoiceModal.tsx:519` (`SELECT`).
   - `src/components/PurchaseInvoiceForm.tsx:111` (`SELECT`), `src/components/PurchaseInvoiceForm.tsx:148` (`INSERT`).
   - `src/services/documentsService.ts:775, 786, 797, 808` (`SELECT` probe & `INSERT`), `src/services/documentsService.ts:903, 911, 920` (`SELECT` probe & `INSERT`).
   - `src/services/networkInvoicingService.ts:1264, 1281` (`SELECT` & `INSERT` auto-creates supplier).
   - `src/services/autoSyncService.ts:486` (`SELECT`), `src/services/autoSyncService.ts:716` (`UPSERT`), `src/services/autoSyncService.ts:840, 982` (`INSERT`).
   - `src/pages/TallyImport.tsx:623, 1474, 1595` (`SELECT`), `src/pages/TallyImport.tsx:808` (`UPSERT`), `src/pages/TallyImport.tsx:1030, 1122, 1688, 1781` (`INSERT`).

3. **Credit Transactions & Khata Domain (`public.credit_transactions`)**:
   - `src/pages/Customers.tsx:116` (`SELECT` limit 15), `src/pages/Customers.tsx:236` (`SELECT` balance aggregate), `src/pages/Customers.tsx:419` (`SELECT` limit 20), `src/pages/Customers.tsx:445` (`INSERT`).
   - `src/pages/Suppliers.tsx:180` (`SELECT` balance aggregate), `src/pages/Suppliers.tsx:403` (`SELECT` limit 20), `src/pages/Suppliers.tsx:429` (`INSERT`).
   - `src/pages/Parties.tsx:156` (`SELECT` all org transactions), `src/pages/Parties.tsx:444, 510` (`INSERT` opening balance), `src/pages/Parties.tsx:596` (`UPDATE` party_id reassign).
   - `src/pages/CustomerLedger.tsx:68` (`SELECT` all party transactions sorted asc).
   - `src/pages/Dashboard.tsx:179` (`SELECT` dashboard aggregates), `src/pages/Dashboard.tsx:1287` (`INSERT` opening balance).
   - `src/pages/POSBilling.tsx:1518` (`INSERT` credit sale).
   - `src/components/SalesInvoiceModal.tsx:440` (`SELECT` customer balance map).
   - `src/components/PurchaseInvoiceModal.tsx:526` (`SELECT` supplier balance map).
   - `src/components/AppLayout.tsx:877` (`INSERT` opening balance).
   - `src/components/invoices/mobile/CreatePartyModal.tsx:103` (`INSERT` opening balance).
   - `src/services/documentsService.ts:1052` (`INSERT` sales return store credit), `src/services/documentsService.ts:1146` (`DELETE` sales return reference).
   - `src/pages/PurchaseReturns.tsx:257, 345` (`INSERT` supplier debit note).
   - `src/services/autoSyncService.ts:489` (`SELECT` reference_id), `src/services/autoSyncService.ts:744, 1047` (`INSERT` batches).
   - `src/pages/TallyImport.tsx:839, 1281, 1552, 1938` (`INSERT` batches), `src/pages/TallyImport.tsx:934, 1596` (`SELECT` reference_ids).
   - `src/utils/offlineQueue.ts:145` (`INSERT` offline replay).

4. **Party-Wise Prices & Product Catalogue Restrictions**:
   - Configured in `src/components/parties/CreatePartyModal.tsx:597-608` and `src/types/parties.ts:18-37`.
   - Stored inside `custom_fields` JSON column on `customers` and `suppliers` as:
     `custom_fields: { keepSamePrice: boolean, keepSameInventory: boolean, customItems: PartyCustomItem[] }`.
   - Read and honored in `src/components/SalesInvoiceModal.tsx:276-285, 460-470, 1364-1374` and `src/components/PurchaseInvoiceModal.tsx:247-258, 1367-1376`.

5. **Cash & Bank Domain (`public.bank_accounts` & Local Ledgers)**:
   - Direct database probe and upsert: `src/services/autoSyncService.ts:1090, 1101` and `src/pages/TallyImport.tsx:851, 866, 2001, 2015`.
   - Core financial ledger UI: `src/pages/CashAndBank.tsx` stores accounts and transactions in `localStorage`:
     - `credsmart_bank_accounts_${orgId}`
     - `credsmart_bank_txns_${orgId}`
     - `credsmart_cash_in_hand_${orgId}`
     - `credsmart_unlinked_balance_${orgId}`
   - Action triggers: Add/Reduce money, Transfer money, Add/Edit/Delete Bank account, Delete/Edit transaction.

---

## 2. Logic Chain

1. **Direct PostgREST Elimination**:
   - The original request mandates replacing all direct `supabase.from(...)` client calls with `fetch()` requests directed to `https://api.credsmart.online/api/*`.
   - In our audit (Observation 1.1), 52 distinct invocations were found across `customers`, `suppliers`, and `credit_transactions`, plus 4 table probes/upserts on `bank_accounts`.
   - Replacing each call requires a centralized client that automatically retrieves the Supabase JWT access token via `supabase.auth.getSession()` and injects `Authorization: Bearer <token>`.

2. **Party-Wise Prices Architecture**:
   - Party-wise custom prices are not a separate database table in the existing schema; they are serialized into `custom_fields.customItems` (Observation 1.1.4).
   - Therefore, the REST endpoint `/api/customers` and `/api/suppliers` must accept and return `custom_fields` (or explicitly expose `customItems`, `keepSamePrice`, and `keepSameInventory`), preserving exact contract parity without requiring schema migrations.

3. **Balance Calculation & Khata Reconciliation**:
   - Currently, multiple components (`Customers.tsx`, `Suppliers.tsx`, `Parties.tsx`, `SalesInvoiceModal.tsx`) perform a manual client-side join: fetching all `credit_transactions` and iterating over them to sum balances (Observation 1.1.3).
   - By enabling the backend endpoint `GET /api/customers?include_balance=true` and `GET /api/suppliers?include_balance=true` to return pre-computed `balance` fields, network payload size and client CPU cycles are reduced while keeping exact state parity with `party.balance`.

4. **Cash & Bank Backend Unification**:
   - Currently, `CashAndBank.tsx` runs primarily on `localStorage`, while Tally sync services probe `bank_accounts` table in Supabase (Observation 1.1.5).
   - Transitioning `bank_accounts`, `bank_transactions`, and `cash_in_hand` to `https://api.credsmart.online/api/bank-accounts` and `/api/bank-transactions` establishes true multi-device persistence and reconciles live Tally sync with the Cash & Bank UI.

---

## 3. Caveats

1. **Realtime Channels in CustomerLedger**:
   - `CustomerLedger.tsx:112-129` subscribes to Supabase Realtime channel `ledger_realtime_${id}` for postgres changes on `customers`, `sales`, and `credit_transactions`. If client-side Supabase subscriptions are disabled or backend does not emit postgres changes, the existing window events (`credsmart:parties_updated`, `credsmart_documents_updated`) must continue to be dispatched on mutation.
2. **Offline Queue Sync**:
   - `src/utils/offlineQueue.ts` contains replay handlers for `"customer"` and `"credit_payment"`. When migrating, these offline replay handlers must route through `apiClient.ts` rather than `supabase.from(...)`.
3. **External API Availability**:
   - The audit assumes the backend API server at `https://api.credsmart.online/api/*` adheres to standard REST conventions or will be implemented to match the endpoints detailed in `analysis.md`. A fallback configuration (`VITE_BACKEND_API_URL`) should be supported.

---

## 4. Conclusion

1. **Party & Khata Queries are Fully Mappable**:
   Every direct query on `customers`, `suppliers`, and `credit_transactions` maps cleanly to 5 primary REST resources:
   - `/api/customers` (CRUD + `/bulk`)
   - `/api/suppliers` (CRUD + `/bulk`)
   - `/api/parties` (Unified view + `/merge`)
   - `/api/credit-transactions` (Query, create, bulk insert, delete by reference)
   - `/api/bank-accounts` & `/api/bank-transactions` (Full accounts and transactional ledger)
2. **Data Contracts are 100% Preserved**:
   No changes are required to component state hooks, loading states, or toast notifications. `Party`, `Customer`, `Supplier`, and `CreditTransaction` TypeScript interfaces remain identical.
3. **High-Throughput Batch Endpoints Required**:
   Tally sync (`autoSyncService.ts`) and file import (`TallyImport.tsx`) process records in chunks of 1000. The backend endpoints `/api/customers/bulk`, `/api/suppliers/bulk`, and `/api/credit-transactions/bulk` are mandatory to prevent rate-limiting or synchronous bottlenecks.

---

## 5. Verification Method

To independently verify the audit findings and validate the migration once implemented:

1. **Verify No Direct Supabase Calls Remain in Scope**:
   Run ripgrep from project root:
   ```powershell
   rg -n 'supabase\s*\.\s*from\(\s*["''](customers|suppliers|parties|credit_transactions|bank_accounts)["'']\)' src/
   ```
   *Expected result post-migration*: 0 matches in frontend source files.

2. **Verify Dynamic Table Calls Replaced**:
   ```powershell
   rg -n '\.from\(targetTable\)' src/
   ```
   *Expected result post-migration*: 0 matches.

3. **Verify TypeScript Compilation**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected result*: Exits with 0 errors.

4. **Verify Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/tally*.test.ts
   ```
   *Expected result*: All existing Tally and party test suites pass without regression.
