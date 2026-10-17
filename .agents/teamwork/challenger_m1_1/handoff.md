# Empirical Stress-Test Report — CRM Phase 2 Milestone 1: Attendance Database Migration & Types

**Agent**: `challenger_m1_1`  
**Role**: Empirical Challenger (critic, specialist)  
**Target Milestone**: CRM Phase 2 Milestone 1: Database Migration & TypeScript Types  
**Date**: 2026-10-17  
**Overall Verdict**: **ISSUES_FOUND** (1 Medium Severity Finding: Missing Database CHECK Constraints; 1 Minor Finding: Nullability Divergence in Domain Types; DDL Syntax & Idempotency CONFIRMED)

---

## 1. Observation

1. **Target Migration Script (`supabase/migrations/20261017010000_create_crm_attendance_tables.sql`)**:
   - Lines 1–181: Wrapped in transactional block `BEGIN; ... COMMIT;`.
   - Lines 15–24: `public.crm_geolocations` declared with `CREATE TABLE IF NOT EXISTS` and primary key `id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`.
   - Lines 32–57: `public.crm_attendance` declared with `CREATE TABLE IF NOT EXISTS`, foreign keys referencing `public.organizations(id)`, `auth.users(id)`, and `public.crm_geolocations(id)`.
   - Line 56: `CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)`.
   - Lines 75–91: `public.crm_attendance_requests` declared with `CREATE TABLE IF NOT EXISTS`, foreign keys referencing `public.organizations(id)`, `auth.users(id)`, and `public.crm_attendance(id)`.
   - Lines 26–27, 59–63, 93–96: 11 total indexes, each declared with `CREATE INDEX IF NOT EXISTS`.
   - Lines 66–70, 99–103: 2 triggers (`update_crm_attendance_updated_at` and `update_crm_attendance_requests_updated_at`), each preceded by `DROP TRIGGER IF EXISTS <trigger_name> ON <table_name>;`.
   - Lines 108–110: RLS enabled on all 3 tables with `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.
   - Lines 115–180: 12 RLS policies (SELECT, INSERT, UPDATE, DELETE for each of the 3 tables), each preceded by `DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;`.

2. **Column Constraints and Defaults in SQL Migration**:
   - `crm_attendance.status` (line 47):
     ```sql
     status TEXT NOT NULL DEFAULT 'present',
     ```
     *Observation*: The default `'present'` is set. However, there is no `CHECK (status IN ('present', 'absent', 'half_day', 'on_leave'))` constraint.
   - `crm_attendance.verification_method` (line 48):
     ```sql
     verification_method TEXT NOT NULL DEFAULT 'geo_verified',
     ```
     *Observation*: The default `'geo_verified'` is set. However, there is no `CHECK (verification_method IN ('geo_verified', 'manual', 'regularized'))` constraint.
   - `crm_attendance_requests.status` (line 85):
     ```sql
     status TEXT NOT NULL DEFAULT 'pending',
     ```
     *Observation*: The default `'pending'` is set. However, there is no `CHECK (status IN ('pending', 'approved', 'rejected'))` constraint.
   - `crm_attendance_requests.requested_status` (line 83):
     ```sql
     requested_status TEXT NOT NULL DEFAULT 'present',
     ```
     *Observation*: The default `'present'` is set. However, there is no `CHECK (requested_status IN ('present', 'absent', 'half_day', 'on_leave'))` constraint.
   - `crm_attendance.work_duration_minutes` & `overtime_minutes` (lines 51–52):
     ```sql
     work_duration_minutes INTEGER DEFAULT 0,
     overtime_minutes INTEGER DEFAULT 0,
     ```
     *Observation*: Defined with `DEFAULT 0`, but lacking `NOT NULL`.

3. **TypeScript Types (`src/types/crmAttendance.ts` and `src/integrations/supabase/types.ts`)**:
   - In `src/types/crmAttendance.ts`:
     - Line 7: `export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";`
     - Line 9: `export type AttendanceVerificationMethod = "geo_verified" | "manual" | "regularized";`
     - Line 11: `export type AttendanceRequestStatus = "pending" | "approved" | "rejected";`
     - Lines 45–46: `work_duration_minutes: number;` and `overtime_minutes: number;` (typed as non-nullable `number`).
   - In `src/integrations/supabase/types.ts`:
     - Lines 124, 129: `overtime_minutes: number | null` and `work_duration_minutes: number | null` (reflecting database nullability).

4. **Empirical Test Suite Execution (`src/test/crmAttendanceMigrationStress.test.ts`)**:
   - Executed `npm.cmd test -- src/test/crmAttendanceMigrationStress.test.ts`:
     ```
     ✓ src/test/crmAttendanceMigrationStress.test.ts (30 tests) 39ms
     Test Files  1 passed (1)
          Tests  30 passed (30)
       Duration  3.96s
     ```
   - Executed `cmd /c npx tsc --noEmit`:
     ```
     Exit code: 0 (Zero TypeScript compilation errors)
     ```
   - Executed `npm.cmd test -- src/test/crmPermissionRbac.test.ts`:
     ```
     ✓ src/test/crmPermissionRbac.test.ts (26 tests) 2994ms
     Test Files  1 passed (1)
          Tests  26 passed (26)
     ```

---

## 2. Logic Chain

1. **Task 1 — DDL Syntax Validation (CONFIRMED)**:
   - *Premise*: Valid DDL requires balanced lexical delimiters, proper statement terminators, recognized keywords, and complete foreign key target specifications.
   - *Evidence (Observation 1, 4)*: The empirical test harness tokenized 27 statements across `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`. Semicolons terminate every statement, single/double quotes and parentheses are strictly balanced (open 54, close 54), transaction boundaries (`BEGIN;` and `COMMIT;`) are present, and all foreign key relationships reference valid target schemas (`public.organizations(id)`, `auth.users(id)`, `public.crm_geolocations(id)`, `public.crm_attendance(id)`).
   - *Deduction*: Syntax validity is 100% verified.

2. **Task 2 — Idempotency Test (CONFIRMED)**:
   - *Premise*: An idempotent database migration must be executable consecutively without producing errors (no duplicate table creation, index collision, trigger recreation conflict, or duplicate policy error).
   - *Evidence (Observation 1, 4)*: All 3 tables use `CREATE TABLE IF NOT EXISTS`. All 11 indexes use `CREATE INDEX IF NOT EXISTS`. Both triggers are preceded by `DROP TRIGGER IF EXISTS`. All 12 RLS policies are preceded by `DROP POLICY IF EXISTS`. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is a safe, repeatable PostgreSQL command.
   - *Deduction*: Running the entire script twice in succession produces zero collisions or unhandled errors.

3. **Task 3 — Status Constraints and Defaults Alignment (ISSUES_FOUND)**:
   - *Premise*: Requirement R1 and Dispatch Task 3 require status constraints and defaults to align with `'present'`, `'absent'`, `'half_day'`, `'on_leave'` and verification methods `'geo_verified'`, `'manual'`, `'regularized'`.
   - *Evidence (Observation 2, 4)*:
     - Defaults (`'present'`, `'geo_verified'`, `'pending'`, `150`) are present and align with the specification.
     - However, **CHECK constraints are completely missing** from the table definitions.
     - In other CredSmart tables (e.g. `sales_returns`, `suppliers`, `purchase_returns`, `storefront`, `network_notifications`), enum-like columns consistently use `CHECK (col IN (...))`. In this migration, `status` and `verification_method` are unrestricted `TEXT`.
     - *Risk / Blast Radius*: While TypeScript interfaces (`AttendanceStatus`) prevent invalid strings at compile-time in client code, any direct database write, raw Supabase client query with type casts, edge functions, or database functions can insert arbitrary or misspelled status strings (e.g., `'leave'`, `'sick'`, `'present '`), bypassing UI assumptions.
   - *Evidence (Observation 2, 3)*:
     - In `crm_attendance`, `work_duration_minutes` and `overtime_minutes` omit `NOT NULL` in SQL, resulting in `number | null` in `src/integrations/supabase/types.ts`. However, `src/types/crmAttendance.ts` types them as strict `number`. If a record in the database contains `null`, arithmetic or UI formatting operations on `record.work_duration_minutes` could encounter unexpected runtime behavior.

---

## 3. Caveats

1. **Local vs Cloud Database Execution**: No live Supabase / PostgreSQL service is running locally; tests were conducted using strict AST, tokenizer, lexical parsers, regex oracles, and type checking via Vitest.
2. **RLS Policy Breadth**: All 12 policies enforce `auth.role() = 'authenticated' AND has_org_access(org_id)` per requirement R1.4. While this meets the prompt requirement, it permits any organization member to execute write/delete operations at the PostgreSQL level. Granular permissions (e.g. prohibiting employees from editing geofences or updating other employees' attendance) must be enforced by `CRMPermissionGate` and `useCRMPermission` in application code.

---

## 4. Conclusion

**Verdict**: **ISSUES_FOUND**

### Summary of Findings:
| Finding ID | Component | Severity | Description | Recommendation |
|---|---|---|---|---|
| **ISSUE-M1-01** | `crm_attendance.status` | **Medium** | Missing DB-level `CHECK (status IN ('present', 'absent', 'half_day', 'on_leave'))` | Add CHECK constraint to SQL migration |
| **ISSUE-M1-02** | `crm_attendance.verification_method` | **Medium** | Missing DB-level `CHECK (verification_method IN ('geo_verified', 'manual', 'regularized'))` | Add CHECK constraint to SQL migration |
| **ISSUE-M1-03** | `crm_attendance_requests.status` | **Low** | Missing DB-level `CHECK (status IN ('pending', 'approved', 'rejected'))` | Add CHECK constraint to SQL migration |
| **ISSUE-M1-04** | `crmAttendance.ts` | **Low** | `work_duration_minutes` & `overtime_minutes` typed as non-nullable `number` but nullable in SQL/Supabase types | Add `NOT NULL DEFAULT 0` in SQL or type as `number \| null` in domain interface |

### Status of Core Tasks:
- **1. Syntax Validation**: **CONFIRMED** (0 syntax errors, 0 unbalanced delimiters, all foreign keys and triggers valid).
- **2. Idempotency Test**: **CONFIRMED** (100% guarded via `IF NOT EXISTS` and `DROP ... IF EXISTS`).
- **3. Status Constraints & Defaults**: **ISSUES_FOUND** (Defaults confirmed; CHECK constraints missing).

---

## 5. Verification Method

To independently verify these findings:

1. **Run the Empirical Stress Test Suite**:
   ```cmd
   npm.cmd test -- src/test/crmAttendanceMigrationStress.test.ts
   ```
   *Expected outcome*: 30 tests pass, confirming syntax validity, idempotency, default alignments, and asserting the absence of SQL CHECK constraints.

2. **Run TypeScript Strict Mode Compiler**:
   ```cmd
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0.

3. **Run Existing Regression Tests**:
   ```cmd
   npm.cmd test -- src/test/crmPermissionRbac.test.ts
   ```
   *Expected outcome*: 26/26 tests pass.

4. **Inspect Code Locations**:
   - `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` (lines 47–48, 51–52, 83, 85)
   - `src/types/crmAttendance.ts` (lines 7, 9, 11, 45, 46)
   - `src/integrations/supabase/types.ts` (lines 105–314)
