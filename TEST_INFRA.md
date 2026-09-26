# Test Infrastructure & Specification Matrix

## 1. Test Philosophy

The CredSmart Tally Ingestion & Live Sync test suite follows an **opaque-box, requirement-driven testing philosophy**.

- **Opaque-Box Verification**: Tests validate observable system behaviors, data transformations, database payloads, and API contracts rather than private implementation details. Tests interact with public entrypoints (`parseTallyXml`, `autoDetectAndParseTally`, `executeDirectSyncIngestion`, `getDefaultSyncConfig`, `getSyncConfig`, `saveSyncConfig`, `TALLY_EXPORT_DAYBOOK_XML`, `TALLY_EXPORT_MASTERS_XML`).
- **Authoritative Requirement Derivation**: Every test case derives its expected behavior and schema criteria directly from `ORIGINAL_REQUEST.md` (Requirements R1, R2, R3 and Acceptance Criteria) and `PROJECT.md` (Feature Inventory & Interface Contracts).
- **Schema Strictness**: All database operations against Supabase tables (`products`, `product_batches`, `customers`, `suppliers`, `credit_transactions`, `sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`) are strictly validated against `src/integrations/supabase/types.ts`.
- **Zero-False-Positive Guarantee**: Tests do not use facade assertions (e.g. `expect(true).toBe(true)`). Each assertion checks concrete payload fields, math precision, signed polarity, and storage integrity.
- **Progressive Testability & Independence**: Every test is completely isolated and self-contained, setting up its own fixtures, resetting localStorage and mock states, and avoiding execution-order dependencies.

---

## 2. Feature Inventory Mapping

Mapping of all 18 features from `PROJECT.md § Feature Inventory` to their test tier, verification targets, and acceptance criteria:

| # | Feature | Milestone | Description | Test Suite Target | Verification Criteria |
|---|---------|-----------|-------------|-------------------|-----------------------|
| 1 | DayBook XML Date Range Support | M1 | `TALLY_EXPORT_DAYBOOK_XML` includes `<SVFROMDATE>` and `<SVTODATE>` to extract full historical records | Tier 1.1, Tier 2.1 | Query contains `<SVFROMDATE>` and `<SVTODATE>` tags; historical vouchers returned |
| 2 | SyncConfig & Scope Expansion | M1 | `SyncConfig.syncScope` includes `banks: boolean`, with safe defaults enabling all 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`) | Tier 1.2, Tier 2.2 | `getDefaultSyncConfig` initializes all 5 flags; `SyncConfig` type safety |
| 3 | Sync Metrics & Audit Expansion | M1 | `SyncConfig.lastSyncStats`, audit logs, and execution results track counts for all 5 entities | Tier 1.3, Tier 2.3 | `SyncExecutionResult` & `SyncAuditLog` accurately count items, parties, vouchers, banks, balances |
| 4 | Stock Items & Batches Ingestion | M2 | Stock items and batch allocations upserted to `products` (with SKU, UOM, GST, prices in `tags`) and `product_batches` | Tier 1.4, Tier 2.4 | Table `products` contains tags with `selling_price`, `purchase_price`, `mrp`, `gst_rate`, `hsn_code`; `product_batches` contains batch rows |
| 5 | Customers & Suppliers Ingestion | M2 | Sundry Debtors upserted to `customers` and Sundry Creditors upserted to `suppliers` with contacts and GSTIN | Tier 1.5, Tier 2.5 | Debtors stored in `customers`, Creditors stored in `suppliers` with GSTIN, phone, address |
| 6 | Party Opening Balances Ingestion | M2 | Opening balances inserted into `credit_transactions` matching database schema (`party_id`, `party_type`, `amount`, `type`, `description`, `reference_id`, `organization_id`, `created_by`) | Tier 1.6, Tier 2.6 | Conforms to Supabase `credit_transactions` schema; eliminates erroneous `customer_id`/`supplier_id` columns |
| 7 | Bank Accounts Persistence | M2 | Bank accounts ingested to `bank_accounts` (or localStorage key `credsmart_bank_accounts_{orgId}`) in both live sync and modal import | Tier 1.7, Tier 2.7 | Extracted bank accounts saved to localStorage key `credsmart_bank_accounts_{orgId}` with valid `BankAccount` structure |
| 8 | Cash-in-Hand Balance Persistence | M2 | Cash-in-hand balance saved to `credsmart_cash_in_hand_{orgId}` and triggers `credsmart_bank_updated` event | Tier 1.8, Tier 2.8 | Extracted cash saved to `credsmart_cash_in_hand_{orgId}`; custom event dispatched |
| 9 | Sales Vouchers & Line Items | M3 | Sales vouchers create header entries in `sales` and line item entries in `sale_items` with quantity, rate, line total | Tier 1.9, Tier 2.9 | Headers in `sales`, line items in `sale_items` with `line_total = quantity * rate` and linked `product_id` |
| 10 | Purchase Invoices & Line Items | M3 | Purchase vouchers create entries in `purchase_invoices` and items in `purchase_invoice_items`, auto-resolving missing suppliers/products | Tier 1.10, Tier 2.10 | Headers in `purchase_invoices`, line items in `purchase_invoice_items`; auto-creates missing vendor stub |
| 11 | Customer Receipts Ingestion | M3 | Customer receipts create `payment` records in `credit_transactions` linked to the customer | Tier 1.11, Tier 2.11 | Entries in `credit_transactions` with `party_type: 'customer'`, `type: 'payment'`, `reference_id: voucherNumber` |
| 12 | Vendor Payments Ingestion | M3 | Vendor payments create `payment` records in `credit_transactions` linked to the supplier | Tier 1.12, Tier 2.12 | Entries in `credit_transactions` with `party_type: 'supplier'`, `type: 'payment'`, `reference_id: voucherNumber` |
| 13 | Operating Expenses Ingestion | M3 | Direct/indirect expense vouchers create entries in `expenses` and localStorage fallback | Tier 1.13, Tier 2.13 | Entries in `expenses` with `category`, `amount`, `date`, `expense_number`, `created_by` |
| 14 | TallyImportModal Callback Wiring | M4 | `TallyImportModal` mounted in `TallyImport.tsx` passes and executes `onImportBankAccounts` | Tier 1.14, Tier 2.14 | Callback signature verified; invocation triggers bank and cash persistence |
| 15 | Auto-Sync Scope Checkboxes UI | M4 | Dashboard renders toggle checkboxes for all 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`) | Tier 1.15, Tier 2.15 | Scope configuration state toggles correctly across all 5 discrete entity switches |
| 16 | Auto-Sync Dashboard Stats UI | M4 | Dashboard displays stat cards for all 5 entity types | Tier 1.16, Tier 2.16 | Sync statistics state correctly renders metrics for all 5 entity types |
| 17 | E2E Test Suite (Tiers 1-4) | E2E Track & M5 | Comprehensive opaque-box test suite covering feature tests, boundaries, pairwise combinations, and real-world workflows | All Tiers | Vitest test runner executes `src/test/tallyE2E.test.ts` with 0 failures |
| 18 | Coverage Hardening (Tier 5) | M5 | Adversarial test cases verifying edge cases, parser sanitization, and regression freedom | Tier 2, Tier 3, Tier 4 | Malformed XML, unescaped ampersands, extreme numbers, zero division, concurrency |

---

## 3. Test Architecture

- **Test Runner**: Vitest (v3.2.4)
- **Primary Test Suite**: `src/test/tallyE2E.test.ts`
- **Environment**: jsdom / Node.js
- **Execution Command**: `npx vitest run src/test/tallyE2E.test.ts`
- **Pass/Fail Semantics**:
  - **Pass**: All assertions verify exact expected properties, schema shapes, mathematical totals, and side-effect dispatches. Zero unexpected exceptions.
  - **Fail**: Any schema discrepancy (e.g. unknown column inserted, missing required column, unhandled voucher type, unescaped XML entity, or incorrect balance polarity) triggers an immediate test failure.
- **Harness & Isolation**:
  - In-memory Supabase Table Spy: Captures all table calls (`products`, `product_batches`, `customers`, `suppliers`, `credit_transactions`, `sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`) and validates payloads against TypeScript schema contracts.
  - LocalStorage Sandbox: Fresh virtual storage keyed per organization ID (`credsmart_bank_accounts_{orgId}`, `credsmart_cash_in_hand_{orgId}`, `credsmart_auto_sync_config_{orgId}`).
  - Window Event Observer: Tracks `credsmart_bank_updated`, `credsmart:parties_updated`, `credsmart_network_update`.

---

## 4. Real-World Application Scenarios (Tier 4)

Tier 4 tests model end-to-end multi-entity accounting workflows that reflect real-world Indian business operations:

1. **Scenario 1: Full Retail Business Sync (Supermarket / Kirana)**
   - Initial master sync: 50+ stock items across FMCG, Grocery, Dairy with GST slabs (0%, 5%, 12%, 18%).
   - Customer Debtors & Vendor Creditors with debit/credit opening balances.
   - Daybook transaction sync: POS cash sales, B2B credit sales with item lines, customer receipts settling earlier credit sales, petty cash daily expenses (tea, cleaning, delivery).
   - Ingestion updates inventory levels, customer khata balances, and cash-in-hand register.

2. **Scenario 2: Manufacturing & Supply Chain Purchase-to-Sales Cycle**
   - Purchase phase: Raw material supplier master created; purchase invoice with multiple raw material line items, batch allocations, and expiry dates.
   - Expense phase: Factory electricity, factory freight, and machine maintenance vouchers.
   - Sales phase: Finished goods items created; wholesale sales invoice to distributor with batch tracking and GST split (CGST + SGST).
   - Settlement phase: Vendor payment voucher via HDFC Bank and customer receipt voucher via SBI Bank.
   - Verifies complete end-to-end ledger integrity and double-entry consistency across all CredSmart tables.

3. **Scenario 3: Multi-Bank & Cash In-Hand Reconciliation**
   - Ingestion of multiple distinct bank ledgers: HDFC Current Account, SBI Cash Credit Account, ICICI Tax Account.
   - Cash ledgers: Main Cash Drawer, Petrol/Conveyance Petty Cash.
   - Cross-account transfers (Contra vouchers: Cash deposited into HDFC, Bank withdrawal to Petty Cash).
   - Verifies bank balances update accurately in `credsmart_bank_accounts_{orgId}` without overwriting unrelated accounts, and total cash-in-hand reflects aggregated physical cash.

---

## 5. Coverage Thresholds

| Test Tier | Scope & Focus | Minimum Test Target | Planned Tests |
|-----------|---------------|---------------------|---------------|
| **Tier 1: Feature Coverage** | Every feature (1-16) tested across happy-path contracts | >=5 tests per feature domain (16 domains) | **85+ tests** |
| **Tier 2: Boundary & Corner Cases** | Edge cases, missing tags, negative quantities, special characters, extreme values | >=5 tests per feature domain | **45+ tests** |
| **Tier 3: Pairwise Cross-Feature** | Cross-feature interactions (Inventory + Khata, Sales + Receipt settlement, Multi-bank + Vouchers) | Comprehensive combinations | **15+ tests** |
| **Tier 4: Real-World Scenarios** | Multi-step full enterprise business workflows | 3 comprehensive scenarios | **3 deep multi-step workflows (15+ sub-assertions)** |
| **Total Test Suite** | Full End-to-End Suite | **>= 150 assertions** | **160+ assertions** |

---

## 6. Directory and Artifact Layout

- `TEST_INFRA.md` (Project root) — Test philosophy, feature mapping, architecture, tier thresholds.
- `src/test/tallyE2E.test.ts` — Comprehensive opaque-box E2E test suite.
- `TEST_READY.md` (Project root) — Test runner commands, execution instructions, tier status, and feature verification checklist.
- `.agents/teamwork/test_writer_e2e_1/handoff.md` — 5-Component handoff report.
