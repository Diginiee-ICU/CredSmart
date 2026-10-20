# BRIEFING — 2026-10-20T10:49:30Z

## Mission
Investigate database schema across supabase/migrations/ and src/integrations/supabase/types.ts for all tables regarding org_id vs organization_id, missing columns in customers and suppliers, query indexes, and how to write an idempotent fix_db.sql for PostgreSQL 16.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1
- Original parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: exploration_and_survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes or modify application source code
- All analysis and reports written to working directory (.agents/teamwork/explorer_survey_1/)
- Provide evidence chain with exact file paths and line numbers
- Write comprehensive handoff.md with 5-component protocol

## Current Parent
- Conversation ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Updated: 2026-10-20T10:45:15Z

## Investigation State
- **Explored paths**:
  - `supabase/migrations/20261018000000_credsmart_full_schema.sql`, `20260825_add_party_extended_fields.sql`, and all 25 migration files
  - `src/integrations/supabase/types.ts`
  - `backend-api/schema.sql`, `backend-api/fix_db.sql`, `backend-api/add_indexes.sql`, `backend-api/deploy-all.sh`
  - `backend-api/src/routes/products.js`, `parties.js`, `invoices.js`, `settings.js`, `inventory.js`, `crm.js`, `rpc.js`, `auth.js`
  - `backend-api/src/middleware/auth.js`
  - `src/services/partiesApi.ts`, `src/services/documentsService.ts`, `src/types/parties.ts`, `src/components/parties/CreatePartyModal.tsx`
- **Key findings**:
  - Identified root cause of HTTP 500 entity creation failures: explicit dual-column `INSERT` statements in backend routes (e.g. `INSERT INTO products (org_id, organization_id, ...)`) against tables that only possessed `organization_id` (Supabase schema) or only `org_id` (backend schema).
  - PostgreSQL 16 generated columns cannot be used because they are read-only and disallow explicit insert values, and cannot be bidirectional.
  - Selected and designed the universal `BEFORE INSERT OR UPDATE` trigger `sync_org_id_and_organization_id()` for zero-downtime, zero-query-overhead bidirectional synchronization.
  - Detailed 20 required columns for `customers` and `suppliers` matching the `parties.js` contract.
  - Formulated composite B-Tree indexes for tenant + search/order queries (`org_id, barcode`, `org_id, sku`, `org_id, phone`, `org_id, sale_date DESC, created_at DESC`).
  - Authored complete, idempotent PostgreSQL 16 `fix_db.sql` blueprint.
- **Unexplored areas**:
  - Implementation of backend route adjustments (R2), frontend billing speed optimizations (R3), and offline cache hydration (R4) to be completed by respective specialist agents.

## Key Decisions Made
- Use universal `BEFORE INSERT OR UPDATE` trigger function instead of generated columns or views to achieve 100% zero-downtime bidirectional compatibility across PostgreSQL 16.
- Enforce both `org_id` and `organization_id` on all 42 tenant-scoped tables with automatic backfilling.

## Artifact Index
- `DISPATCH.md` — Record of incoming dispatch messages
- `BRIEFING.md` — Persistent situational memory
- `progress.md` — Liveness and execution heartbeat
- `analysis.md` — In-depth architectural analysis and table comparison
- `handoff.md` — Comprehensive 5-component survey report and full `fix_db.sql` code
