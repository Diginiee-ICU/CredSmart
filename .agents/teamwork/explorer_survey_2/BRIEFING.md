# BRIEFING — 2026-10-20T10:55:00Z

## Mission
Investigate `backend-api/` routes (`invoices.js`, `settings.js`, `parties.js`, db connection, server entry points) and analyze implementation requirements for 8 core backend endpoints, data sanitization, schema alignment, and transaction guarantees.

## 🔒 My Identity
- Archetype: explorer
- Roles: CRM Phase 2 UI infrastructure & design system survey explorer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- Original parent: 1beca3ca-d4b2-4508-99a0-6c9d39936bfb
- Milestone: CRM Phase 2 Survey & UI Infrastructure Analysis
- Updated Archetype: explorer
- Updated Roles: Frontend Supabase Table Query Migration Survey Explorer (Parties, Khata, Cash & Bank, Ledgers)
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- New parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: Survey & Audit for Frontend Supabase Query Migration to Dedicated Backend API
- Latest Parent: 47768107-cdc6-46b5-a415-7ea52564fffb
- Latest Roles: Backend API Routes & Schema Alignment Survey Explorer (Invoices, Settings, Parties, DB)
- Latest Milestone: Production Fix Survey 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files
- Document how src/pages/crm/Attendance.tsx should be constructed to conform 100% with CRM design system, mobile responsiveness, and permission gating
- Write detailed analysis report to analysis.md and create self-contained handoff.md
- Focus on Customers, Suppliers, Parties, Credit Transactions, Party-wise Prices, Opening Balances, Khata records, Bank Accounts, Cash Ledgers, and Bank Transactions
- Read-only audit of all direct `supabase.from(...)` queries for these domains
- Read-only audit of `backend-api/` (invoices.js, settings.js, parties.js, db.js, index.js)
- Analyze requirements 1-8 without committing source changes

## Current Parent
- Conversation ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Updated: 2026-10-20T10:55:00Z

## Investigation State
- **Explored paths**:
  - `backend-api/src/index.js` (Express configuration, compression, route mounting, cache)
  - `backend-api/src/db.js` (pg Pool configuration)
  - `backend-api/src/routes/invoices.js` (sales, purchases, sequences)
  - `backend-api/src/routes/settings.js` (organizations, memberships, storefront-settings, locations)
  - `backend-api/src/routes/parties.js` (customers, suppliers, credit_transactions, bank_accounts)
  - `backend-api/src/routes/products.js`, `inventory.js`, `rpc.js`, `auth.js`
  - `backend-api/schema.sql`, `fix_db.sql`, `add_indexes.sql`, `deploy-all.sh`, `setup.sh`
  - `src/services/invoicesApi.ts`, `partiesApi.ts`, `settingsApi.ts`, `documentsService.ts`, `storefrontService.ts`
- **Key findings**:
  1. `POST /api/sale-items` completely missing from `invoices.js`. Line items fail with 404 when saved separately. Needs bulk batching with multi-row SQL.
  2. `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId` completely missing. Edit bill re-save fails to clean previous line items.
  3. `POST /api/sales/bulk` missing. Batch invoice sync from Tally or imports fails.
  4. `POST /api/sales` drops amounts when frontend sends `total` and `tax` instead of `total_amount` and `tax_amount`. Invoices saved with 0 amount.
  5. `POST /api/sales` must support atomic sale + items insert in single transaction. `PUT /api/sales/:id` is missing and must be added with atomic item replacement.
  6. `/storefront-settings` and `/storefront` alias need public unauthenticated access for customer viewing and support for `/storefront-orders`.
  7. Membership queries throw 500 column errors when `org_id` or `organization_id` is missing in database table. Resilient query helper needed.
  8. `POST /customers` and `POST /suppliers` crash with 500 if new columns (`trade_name`, `custom_fields`, etc.) are absent in Postgres or empty string is passed for numeric columns. Needs sanitization and fallback.
- **Unexplored areas**: None. Backend route survey is comprehensive.

## Key Decisions Made
- Recommending parameterized multi-row batching for `POST /api/sale-items`.
- Normalizing dual naming across all invoice and party fields (`total` <-> `total_amount`, `tax` <-> `tax_amount`, `slug` <-> `store_slug`).
- Designing fallback column recovery in `parties.js` and `settings.js` so endpoints succeed even before `fix_db.sql` is executed.
- Recommending single network call for `saveDocument` (sale + items together).

## Artifact Index
- `handoff.md` — 5-component handoff report for orchestrator and implementers
- `progress.md` — Heartbeat and step tracking
- `DISPATCH.md` — Stored dispatch instructions
