# Spec Miner M1-3 Task Assignment

## Mission
Analyze existing migration tests in the codebase (e.g. `src/test/crmAttendanceMigration.test.ts`, `src/test/crmRbacMigration.test.ts`, or any other SQL migration tests).
Discover what assertions, parsing logic, regex checks, constraint validations, and schema invariant checks are used to test migrations in Vitest without necessarily running a live PostgreSQL database.
Design the complete specification and test plan for `src/test/crmSalaryMigration.test.ts` (15+ tests), covering:
1. File existence and naming convention (`20261017020000_create_crm_salary_tables.sql`)
2. Idempotency guarantees (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)
3. Table definitions and required columns for all 4 tables
4. Constraint definitions (CHECK constraints, foreign keys with ON DELETE CASCADE/SET NULL, UNIQUE constraints)
5. RLS enablement and policy checks (`has_org_access(org_id)`)
6. Updated_at triggers and index coverage

## Key Files to Read
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY - read first)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3\DISPATCH.md`
- `src/test/crm*`
- `supabase/migrations/*`

## Output
Write your findings to `.agents/teamwork/spec_miner_m1_3/handoff.md`.
Include:
1. Test architecture pattern used in existing migration tests.
2. List of 15+ specific test cases for `crmSalaryMigration.test.ts`.
3. Invariants that must be strictly enforced.


## 2026-10-18T09:02:54Z
[Message from a6c6970e-7c4c-4a2f-b5be-d02fc8860e0a]
You are Spec Miner M1-3 for CredSmart CRM Phase 3: Salary Management & Payroll Engine.
Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_m1_3`.
Your assignment is in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_m1_3\DISPATCH.md`.

MANDATORY FIRST STEP: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work.
Also read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3\DISPATCH.md`.

Investigate existing migration tests in `src/test/` (such as `src/test/crmAttendanceMigration.test.ts`, `src/test/crmRbacMigration.test.ts`, etc.).
Extract the exact patterns, regexes, and assertion strategies used for testing migrations without a live DB in Vitest.
Design the complete test suite specification for `src/test/crmSalaryMigration.test.ts` (15+ tests) verifying file naming, transaction wrapping, idempotency, column names/types, foreign keys, CHECK constraints, UNIQUE constraints, RLS policies, and triggers.
Write your findings and test specifications to `.agents/teamwork/spec_miner_m1_3/handoff.md`.
Use `send_message` to report back when done.
