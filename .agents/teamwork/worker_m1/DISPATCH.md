# Worker M1 Task Assignment: Database Schema, Migration & Supabase Types

## Mission
Implement Milestone M1 for CredSmart CRM Phase 3: Salary Management & Payroll Engine.
You own the following files exclusively:
1. `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
2. `src/integrations/supabase/types.ts`
3. `src/test/crmSalaryMigration.test.ts`
4. `src/test/crmSalaryTypes.test.ts`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Inputs & Specifications
Read the following files before writing any code:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3\DISPATCH.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_m1_3\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_types\handoff.md`
- Reference SQL artifact: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_types\proposed_20261017020000_create_crm_salary_tables.sql`
- Reference Type Test artifact: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_types\proposed_crmSalaryTypes.test.ts`

## Step-by-Step Instructions
1. Create `supabase/migrations/20261017020000_create_crm_salary_tables.sql` with the complete, verified SQL from `explorer_m1_types/handoff.md` Deliverable 1. Ensure `BEGIN;` at start, `COMMIT;` at end, all tables have `IF NOT EXISTS`, all 15 indexes have `IF NOT EXISTS`, all 3 triggers have `DROP TRIGGER IF EXISTS`, all 16 policies have `DROP POLICY IF EXISTS`, RLS enabled, and constraints named.
2. Update `src/integrations/supabase/types.ts` inserting the 4 new tables:
   - Insert `crm_payroll_runs` and `crm_payslips` in alphabetical order (between `crm_geolocations` and `crm_permissions`).
   - Insert `crm_salary_adjustments` and `crm_salary_profiles` in alphabetical order (between `crm_roles` and `crm_staff_roles`).
   - Ensure strict typing, matching Deliverable 2 in `explorer_m1_types/handoff.md`. Strict zero `any` types.
3. Create `src/test/crmSalaryMigration.test.ts` containing all 22 tests specified in `spec_miner_m1_3/handoff.md`.
4. Create `src/test/crmSalaryTypes.test.ts` containing all 13 tests specified in `explorer_m1_types/handoff.md`.
5. Run verification commands:
   - `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts` (all 22 pass)
   - `cmd /c npx vitest run src/test/crmSalaryTypes.test.ts` (all 13 pass)
   - `cmd /c npx tsc --noEmit` (zero errors)
   - `cmd /c npx vitest run src/test/crm*` (zero regressions across Phase 1 & 2 tests)

## Output Requirements
Write your detailed handoff report to `.agents/teamwork/worker_m1/handoff.md` documenting:
- Files modified/created
- Test execution output and passing counts
- Verification results
- Exit code and confirmation
Use `send_message` to notify the orchestrator when completed.


## 2026-10-18T09:44:43Z
You are Worker M1 for CredSmart CRM Phase 3: Salary Management & Payroll Engine.
Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1`.
Your detailed assignment is at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\DISPATCH.md`.

MANDATORY FIRST STEP: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work.
Also read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3\DISPATCH.md`, `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_m1_3\handoff.md`, and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_types\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
You exclusively own:
- `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
- `src/integrations/supabase/types.ts`
- `src/test/crmSalaryMigration.test.ts`
- `src/test/crmSalaryTypes.test.ts`

Implement the migration, types, and both test suites.
Run the tests:
- `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts`
- `cmd /c npx vitest run src/test/crmSalaryTypes.test.ts`
- `cmd /c npx tsc --noEmit`
- `cmd /c npx vitest run src/test/crm*`

Write your complete handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md`.
Use `send_message` to report back when done.
