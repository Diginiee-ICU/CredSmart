# Task Assignment: Worker M1-1 (Database Migration & TypeScript Types Implementation)

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_1
Target Milestone: M1 — Database Schema & Migration

## Input Artifacts
- ORIGINAL_REQUEST.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- Explorer M1-1 Schema Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_1\handoff.md
- Explorer M1-2 Types Specification: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_2\handoff.md
- Explorer M1-3 Test Suite Architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_3\handoff.md

## Exclusive Write Ownership
You own and may ONLY edit/create these files:
- `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
- `src/integrations/supabase/types.ts`
- `src/types/crmPayroll.ts`
- `src/test/crmSalaryMigration.test.ts`
- `src/test/crmSalaryTypes.test.ts`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables & Acceptance Criteria
1. Create `supabase/migrations/20261017020000_create_crm_salary_tables.sql` with all 4 tables, idempotency (`IF NOT EXISTS`, preceding `DROP POLICY IF EXISTS`), indexes, triggers, and RLS policies (`has_org_access(org_id)`).
2. Update `src/integrations/supabase/types.ts` to include the 4 tables in `Database["public"]["Tables"]` in alphabetical order with exact nullability, defaults, and relationships.
3. Create `src/types/crmPayroll.ts` with domain interfaces and literal union types.
4. Implement `src/test/crmSalaryMigration.test.ts` (15+ passing tests).
5. Implement `src/test/crmSalaryTypes.test.ts` (10+ passing tests).
6. Run `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts`.
7. Run `cmd /c npx vitest run src/test/crmAttendance* src/test/crmRbac*` to ensure ZERO regressions.
8. Run `cmd /c npx tsc --noEmit` to ensure 0 TypeScript errors.
9. Write `handoff.md` with complete evidence and test results.

## 2026-10-18T09:46:25Z
[Message] timestamp=2026-10-18T09:46:25Z sender=caf7924e-19e5-4a1d-ae03-b43c66838dd3 priority=MESSAGE_PRIORITY_HIGH content=You are Worker M1-1 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_1.
Your task assignment is in c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_1\DISPATCH.md.

Read these files before implementing:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_1\handoff.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_2\handoff.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_3\handoff.md

Exclusive Write Ownership:
- `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
- `src/integrations/supabase/types.ts`
- `src/types/crmPayroll.ts`
- `src/test/crmSalaryMigration.test.ts`
- `src/test/crmSalaryTypes.test.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the following steps:
1. Create `supabase/migrations/20261017020000_create_crm_salary_tables.sql` following Explorer M1-1's exact blueprint with idempotency, check constraints, RLS policies, indexes, and triggers.
2. Update `src/integrations/supabase/types.ts` following Explorer M1-2's blueprint.
3. Create `src/types/crmPayroll.ts` with domain types.
4. Implement `src/test/crmSalaryMigration.test.ts` and `src/test/crmSalaryTypes.test.ts` following Explorer M1-3's test suite architecture.
5. Execute tests: `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts`.
6. Verify no regressions on existing tests: `cmd /c npx vitest run src/test/crmAttendance* src/test/crmRbac*`.
7. Verify TypeScript: `cmd /c npx tsc --noEmit`.
8. Write `handoff.md` in your working directory documenting implementation, test commands, and exact test results.
9. Send a message back to the orchestrator (caller) with a summary of results.

