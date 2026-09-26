# Orchestration Plan: CredSmart Tally Ingestion & Live Sync Expansion

## Objective
Fix and expand CredSmart's Tally Live Sync and File Import pipelines to synchronize and import all financial entities—including Invoices & Vouchers (Sales, Purchases, Receipts, Payments, Expenses, Notes) with item line details, Bank Accounts, and Cash in Hand—beyond just Items and Parties.

## Phase 0: Survey & Specification Mining
- Spawn 3 parallel investigators:
  1. `teamwork_preview_spec_miner_survey_1`: Mine Tally XML requirements, DayBook XML export formats (`TALLY_EXPORT_DAYBOOK_XML`), `<SVFROMDATE>` / `<SVTODATE>`, voucher schemas, item lines, ledgers, and existing parser in `src/utils/tally/` and `src/services/tally/`.
  2. `teamwork_preview_explorer_survey_2`: Explore database schema (`src/integrations/supabase/types.ts`), tables (`products`, `product_batches`, `customers`, `suppliers`, `credit_transactions`, `bank_accounts`, `sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`), localStorage fallbacks, and storage keys (`src/pages/CashAndBank.tsx`).
  3. `teamwork_preview_explorer_survey_3`: Explore UI components (`<TallyImportModal>`, Auto-sync dashboard, checkboxes, sync stats, state flows) and existing test suites (`src/test/tallyImport.test.ts`, `src/test/tallyBridge.test.ts`, etc.).
- Synthesize all findings into `PROJECT.md` with full architecture, feature inventory, milestone definitions, interface contracts, and code layout.

## Phase 1: Dual Track Launch
- Track A (E2E Testing Track): Spawn E2E Testing Orchestrator / Test Writer to create opaque-box test suites (Tiers 1-4) covering all features from `PROJECT.md § Feature Inventory`. Publishes `TEST_READY.md`.
- Track B (Implementation Track):
  - Milestone 1: Tally XML DayBook & Master Ingestion Parser (Vouchers, Line Items, Bank/Cash, Date Boundaries).
  - Milestone 2: Bank & Cash Accounts & Balances Pipeline (Supabase + localStorage fallback `credsmart_bank_accounts_{orgId}` and `credsmart_cash_in_hand_{orgId}`).
  - Milestone 3: Vouchers & Transaction Ingestion (Sales & Sale Items, Purchase & Purchase Items, Receipts, Payments, Expenses in credit_transactions & expenses).
  - Milestone 4: UI Controls & Auto-Sync Dashboard Updates (Checkboxes, stats, modals, live sync defaults).

## Phase 2: Implementation Iteration Loops
- For each milestone:
  - Spawn Explorers to analyze specific failure/tasks
  - Spawn Worker to implement changes and verify unit builds/tests
  - Spawn Reviewers to review code correctness, robustness, and style
  - Spawn Challengers to adversarially test functionality
  - Spawn Forensic Auditor to enforce zero-tolerance integrity
  - Evaluate Gate in `GATE_STATUS.md`

## Phase 3: Final Integration & E2E Test Suite Pass (Tiers 1-4)
- Run complete test suite via `TEST_READY.md`.
- Ensure 100% tests pass without regressions.

## Phase 4: Adversarial Coverage Hardening (Tier 5)
- Challenger-driven white-box adversarial stress testing.

## Phase 5: Synthesis & Reporting
- Generate comprehensive report for user with changes, verification, and audit sign-off.
