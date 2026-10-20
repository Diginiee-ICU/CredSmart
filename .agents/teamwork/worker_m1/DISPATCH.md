# Dispatch: Milestone 1 Worker — Live Database Schema Alignment & Idempotent fix_db.sql

Read:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`)
- Explorer Survey 1 findings: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md` and `analysis.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_prod_fix\SCOPE.md`

Your Exclusive File Ownership:
- `fix_db.sql` (at repository root)
- `backend-api/fix_db.sql`
- `src/test/fixDbSchema.test.ts`

Objectives:
1. Implement the complete, fully idempotent `fix_db.sql` script at project root `fix_db.sql` and mirror it in `backend-api/fix_db.sql`.
   - Universal bidirectional trigger `sync_org_id_and_organization_id()` attached to all 42 tenant-scoped tables.
   - Dual table synchronization between `org_memberships` and `organization_memberships`.
   - Complete column coverage for `customers` and `suppliers` (all 20 fields matching backend contracts, with safe defaults).
   - Columns for `products`, `product_batches`, `sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `credit_transactions`, `expenses`, `bank_accounts`, `invoice_sequences`, `party_wise_prices`, `godowns`, `locations`, `storefront_settings`, `storefront_orders`, `sales_returns`, `purchase_returns`, `crm_*` tables.
   - Composite B-Tree indexes on tenant IDs and high-throughput query filters (`org_id, barcode`, `org_id, sku`, `org_id, phone`, `org_id, sale_date DESC, created_at DESC`).
   - Run inside `BEGIN; ... COMMIT;` with `ANALYZE` commands outside the transaction block.
   - Idempotent and clean execution on PostgreSQL 16.
2. Create unit / validation tests in `src/test/fixDbSchema.test.ts` verifying:
   - All 42 tables have both `org_id` and `organization_id` column definitions and triggers in `fix_db.sql`.
   - All 20 customer/supplier fields are declared with default values.
   - All performance indexes exist with `IF NOT EXISTS`.
   - Trigger function logic correctly implements bidirectional assignment.
3. Run the test suite (`cmd /c npx vitest run src/test/fixDbSchema.test.ts`) and verify all tests pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Deliverable:
Write your complete implementation report to `.agents/teamwork/worker_m1/handoff.md` and send a message back when done.

## 2026-10-20T11:04:33Z
You are Worker M1. Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1`.
Read `DISPATCH.md` in your working directory and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.
Read Explorer Survey 1's findings at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`.
Implement the complete, idempotent `fix_db.sql` at root and in `backend-api/fix_db.sql`.
Create unit/contract tests in `src/test/fixDbSchema.test.ts` to test all triggers, tables, columns, and indexes.
Run tests via `cmd /c npx vitest run src/test/fixDbSchema.test.ts`.
Write your completion report to `.agents/teamwork/worker_m1/handoff.md` and send a message back when done.

