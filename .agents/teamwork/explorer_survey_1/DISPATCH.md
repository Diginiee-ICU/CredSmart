# Dispatch: Database Schema & Migrations Explorer (Survey 1)

Read:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`)
- Database migrations in `supabase/migrations/`
- Schema types in `src/integrations/supabase/types.ts`
- Any existing SQL scripts or Docker PostgreSQL setup in `backend-api/` or root

Investigate:
1. All tables in the database schema: check whether they use `org_id` or `organization_id` or both.
2. How to achieve seamless, zero-downtime bidirectional synchronization between `org_id` and `organization_id` in PostgreSQL 16 (e.g. generated columns or triggers).
3. The exact schema of `customers` and `suppliers`, missing columns (`trade_name`, `shipping_address`, `category`, `credit_period_days`, `custom_fields`), data types, and default values.
4. Indexes needed for performance on tenant IDs (`org_id`, `organization_id`) and query filters (`barcode`, `sku`, `phone`, `sale_date`, `created_at`).
5. Ensure `fix_db.sql` will be fully idempotent (runnable repeatedly without error or data loss).

Deliverable:
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_1/handoff.md`.


## 2026-10-20T10:45:15Z
You are Explorer Survey 1. Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1`. Read `DISPATCH.md` in your working directory and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`).
Investigate the database schema across `supabase/migrations/` and `src/integrations/supabase/types.ts` for all tables regarding `org_id` vs `organization_id`, missing columns in `customers` and `suppliers`, query indexes, and how to write an idempotent `fix_db.sql` for PostgreSQL 16.
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_1/handoff.md` and send a message back when done.
