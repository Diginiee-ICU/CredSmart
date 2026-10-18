# Reviewer & Adversarial Critic Handoff Report: Milestone 1 (Phase 3)

**Role**: Reviewer M1-2 (`reviewer`, `critic`)  
**Target Milestone**: CRM Phase 3: Salary Management & Payroll Engine — Milestone 1 (Database Migration & TypeScript Types)  
**Deliverables Reviewed**:
1. `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
2. `src/integrations/supabase/types.ts`
3. `src/types/crmPayroll.ts`
4. `src/test/crmSalaryMigration.test.ts`
5. `src/test/crmSalaryTypes.test.ts`
6. `worker_m1_1/handoff.md`

**Verdict**: **APPROVE**  
**Integrity Assessment**: **NO INTEGRITY VIOLATIONS DETECTED** (Zero hardcoded test result shortcuts, zero dummy/facade implementations, genuine type-sound logic, genuine schema contracts).

---

## 1. Observation

### 1.1 Database Migration Schema (`supabase/migrations/20261017020000_create_crm_salary_tables.sql`)
- Lines 1–240: Entire DDL transaction is wrapped in `BEGIN;` (line 1) and `COMMIT;` (line 240).
- Lines 16–31: `public.crm_salary_profiles` is created with `IF NOT EXISTS` containing 13 columns:
  - `id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`
  - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
  - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly'))`
  - `base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `currency TEXT NOT NULL DEFAULT 'INR'`
  - `allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2`
  - `hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00`
  - `pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
  - `esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
  - `is_active BOOLEAN NOT NULL DEFAULT true`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Constraint: `CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)`
  - Indexes: 3 indexes created with `CREATE INDEX IF NOT EXISTS` (`idx_crm_salary_profiles_org`, `idx_crm_salary_profiles_staff`, `idx_crm_salary_profiles_active`).
  - Trigger: `update_crm_salary_profiles_updated_at` preceded by `DROP TRIGGER IF EXISTS` executing `public.update_updated_at()`.
- Lines 47–60: `public.crm_payroll_runs` created with `IF NOT EXISTS` containing 11 columns:
  - `id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`
  - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
  - `month_year TEXT NOT NULL`
  - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed'))`
  - `total_payout NUMERIC(14,2) DEFAULT 0.00`
  - `staff_count INTEGER DEFAULT 0`
  - `locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
  - `locked_at TIMESTAMPTZ`
  - `notes TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Constraint: `CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)`
  - Indexes: 3 indexes created with `IF NOT EXISTS` (`idx_crm_payroll_runs_org_month`, `idx_crm_payroll_runs_status`, `idx_crm_payroll_runs_locked_by`).
  - Trigger: `update_crm_payroll_runs_updated_at` preceded by `DROP TRIGGER IF EXISTS`.
- Lines 76–102: `public.crm_payslips` created with `IF NOT EXISTS` containing 24 columns:
  - `id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`
  - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
  - `payroll_run_id UUID NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE`
  - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `month_year TEXT NOT NULL`
  - `salary_profile_snapshot JSONB NOT NULL`
  - `working_days_in_month INTEGER NOT NULL`
  - `present_days INTEGER NOT NULL DEFAULT 0`
  - `absent_days INTEGER NOT NULL DEFAULT 0`
  - `half_days INTEGER NOT NULL DEFAULT 0`
  - `lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00`
  - `overtime_minutes INTEGER NOT NULL DEFAULT 0`
  - `gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial'))`
  - `paid_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Constraint: `CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)`
  - Indexes: 4 indexes created with `IF NOT EXISTS` (`idx_crm_payslips_org`, `idx_crm_payslips_payroll_run`, `idx_crm_payslips_staff_month`, `idx_crm_payslips_payment_status`).
  - Trigger: `update_crm_payslips_updated_at` preceded by `DROP TRIGGER IF EXISTS`.
- Lines 119–132: `public.crm_salary_adjustments` created with `IF NOT EXISTS` containing 12 columns:
  - `id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`
  - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
  - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `type TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment'))`
  - `amount NUMERIC(12,2) NOT NULL`
  - `description TEXT`
  - `month_year TEXT`
  - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected'))`
  - `requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
  - `approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
  - `approved_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Indexes: 5 indexes created with `IF NOT EXISTS` (`idx_crm_salary_adjustments_org`, `idx_crm_salary_adjustments_staff`, `idx_crm_salary_adjustments_status`, `idx_crm_salary_adjustments_month`, `idx_crm_salary_adjustments_type`).
- Lines 143–238: RLS enabled on all 4 tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`). All 16 CRUD policies enforce `auth.role() = 'authenticated' AND has_org_access(org_id)`. Every policy is preceded by `DROP POLICY IF EXISTS`.

### 1.2 Supabase Schema Types (`src/integrations/supabase/types.ts`)
- Lines 315–364: `crm_payroll_runs` definition under `Database["public"]["Tables"]` containing exact Row, Insert, Update, and Relationships (`crm_payroll_runs_org_id_fkey`).
- Lines 365–460: `crm_payslips` definition under `Database["public"]["Tables"]` containing exact Row (24 columns), Insert, Update, and Relationships (`crm_payslips_org_id_fkey`, `crm_payslips_payroll_run_id_fkey`).
- Lines 531–583: `crm_salary_adjustments` definition with Row (12 columns), Insert, Update, and Relationships (`crm_salary_adjustments_org_id_fkey`).
- Lines 584–639: `crm_salary_profiles` definition with Row (13 columns), Insert, Update, and Relationships (`crm_salary_profiles_org_id_fkey`).

### 1.3 Domain Types Contract (`src/types/crmPayroll.ts`)
- Lines 13–24: Strict union literal types: `SalaryType`, `PayrollRunStatus`, `PayslipPaymentStatus` (alias `PaymentStatus`), `SalaryAdjustmentType` (alias `AdjustmentType`), `SalaryAdjustmentStatus` (alias `AdjustmentStatus`).
- Lines 30–39: `CrmSalaryProfileSnapshot` (alias `SalaryProfileSnapshot`) with 7 core rate and configuration parameters.
- Lines 45–132: Strongly typed domain interfaces `CrmSalaryProfile` (alias `CRMSalaryProfile`), `CrmPayrollRun` (alias `CRMPayrollRun`), `CrmPayslip` (alias `CRMPayslip`), and `CrmSalaryAdjustment` (alias `CRMSalaryAdjustment`) with optional UI display enrichments.
- Lines 138–164: Explicit calculation engine contracts `CrmAttendanceRecord` (alias `CrmAttendanceRecordForPayroll`) and `PayslipComputedData` matching Milestone M2 requirements verbatim. Zero `any` types present.

### 1.4 Independent Verification Execution Results
- Command: `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts`
  - Output:
    ```
    ✓ src/test/crmSalaryTypes.test.ts (20 tests)
    ✓ src/test/crmSalaryMigration.test.ts (22 tests)
    Test Files  2 passed (2)
    Tests       42 passed (42)
    Duration    5.79s
    ```
- Command: `cmd /c npx tsc --noEmit`
  - Output:
    ```
    Process exited with code 0 (0 compilation errors).
    ```
- Command: `cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts src/test/crmAttendanceTypes.challenger.test.ts src/test/crmPermissionRbac.test.ts`
  - Output:
    ```
    ✓ src/test/crmAttendanceMigrationStress.test.ts (31 tests)
    ✓ src/test/crmAttendanceTypes.challenger.test.ts (18 tests)
    ✓ src/test/crmPermissionRbac.test.ts (26 tests)
    Test Files  3 passed (3)
    Tests       75 passed (75)
    Duration    9.00s
    ```
- Full Suite Audit: `cmd /c npx vitest run crm`
  - Result: 21 of 22 test files passed (405 tests passed).
  - The 1 failing file was `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx` (3 tests failing).
  - Diagnostic Investigation: The failure was caused by a static date constant `const TODAY = "2026-10-17"` written during Phase 2. Because the test executed on `2026-10-18`, `Attendance.tsx` defaulted `selectedDate` to `2026-10-18`, leaving the mock records from `2026-10-17` filtered out. This is a pre-existing date-drift bug in the Phase 2 test file, unrelated to Phase 3 Milestone 1 deliverables.

---

## 2. Logic Chain

1. **Idempotency & Replay Safety (Supports Conclusion to Approve Migration)**:
   - Observation 1.1 shows all 4 tables use `CREATE TABLE IF NOT EXISTS`, all 15 indexes use `CREATE INDEX IF NOT EXISTS`, all 3 triggers use `DROP TRIGGER IF EXISTS`, and all 16 RLS policies use `DROP POLICY IF EXISTS`.
   - Wrapping the entire script in `BEGIN; ... COMMIT;` ensures atomic execution in transactional databases. Re-executing the migration in any CI or staging pipeline will not result in naming collisions or partial schema application.

2. **Referential Integrity & Historical Audit Safety (Supports Relational Correctness)**:
   - Tenant boundaries are strictly enforced via `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`.
   - User entity links use `ON DELETE CASCADE` for primary actors (`staff_id`).
   - Audit trail actors (`locked_by` on `crm_payroll_runs`, `requested_by` and `approved_by` on `crm_salary_adjustments`) strictly use `ON DELETE SET NULL`. If an administrative employee is deleted, historical payroll run locks and advance approvals remain intact for statutory accounting and financial audit compliance.
   - Deleting a `crm_payroll_runs` row cascades to `crm_payslips` via `ON DELETE CASCADE`, preventing orphaned payslips.

3. **Check Constraint Integrity & Precision (Supports Domain Conformance)**:
   - Financial figures are stored using `NUMERIC(12,2)` and `NUMERIC(14,2)` rather than floating point numbers, eliminating rounding drift in monetary calculations.
   - Check constraints enforce enum-like values at the database level: `salary_type` (`monthly`, `daily`, `hourly`), `status` (`draft`, `locked`, `disbursed`), `payment_status` (`pending`, `paid`, `partial`), `type` (`advance`, `bonus`, `deduction`, `loan_repayment`), and adjustment `status` (`pending`, `approved`, `deducted`, `rejected`).

4. **Multi-Tenant Constraint Isolation (Supports Multi-Tenant Safety)**:
   - `uq_crm_salary_profiles_staff` is keyed by `(org_id, staff_id)`.
   - `uq_crm_payroll_runs_month` is keyed by `(org_id, month_year)`.
   - `uq_crm_payslips_staff_month` is keyed by `(org_id, staff_id, month_year)`.
   - None of the unique constraints are globally scoped, preventing multi-tenant collisions when multiple organizations operate in the same shared database cluster.

5. **Type Soundness & Ergonomics (Supports Type-Level Safety)**:
   - Observation 1.2 and 1.3 show all 4 tables are declared with exact property types in `src/integrations/supabase/types.ts`.
   - `src/types/crmPayroll.ts` exports both canonical (`Crm*`) and legacy/alias (`CRM*`) names, as well as domain models that allow UI components to bind `staff_name`, `staff_email`, `role_name`, etc.
   - Observation 1.4 confirms `tsc --noEmit` exits with 0 errors and zero `any` types.

6. **Integrity & Anti-Cheat Validation (Supports Ethical & Engineering Standards)**:
   - Both test suites (`crmSalaryMigration.test.ts` and `crmSalaryTypes.test.ts`) inspect genuine SQL syntax, parse DDL statements, verify balanced parens/quotes, check AST/types via `expectTypeOf`, and assert negative assignability via TypeScript compiler primitives (`Extends<A, B>`).
   - There are no hardcoded mocks pretending to be database tables, no bypassed assertions, and no simulated facades.

---

## 3. Caveats

1. **Pre-Existing Phase 2 Date-Drift Test**:
   - `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx` (authored during Phase 2) hardcodes `const TODAY = "2026-10-17"`. When executed on `2026-10-18`, 3 assertions timed out because `Attendance.tsx` defaults `selectedDate` to the current date (`2026-10-18`). This is not a regression from Phase 3 (which touched zero attendance files).
   - In accordance with key reviewer constraints ("Review-only — do NOT modify implementation code" and "Report any failures as findings — do NOT fix them yourself"), this has been flagged as a finding for the Phase 2 test suite.
2. **RBAC Permission Matrix Action Seeding for Milestone 3**:
   - In Phase 1's `20261017000000_create_crm_rbac_tables.sql`, the super admin role was seeded with `('salary', 'view')` and `('salary', 'edit')`. Milestone 3 requirements specify `useCRMPermission('salary', 'approve')` for locking payroll and approving advances. Because super admins bypass permissions unconditionally, super admins can already approve payroll; however, when Worker M3 builds the Salary Management UI and Role Management views, `{ id: "approve", label: "Approve Payroll & Advances" }` should be formally added to `CRM_MODULES` in `RoleManagement.tsx`.

---

## 4. Conclusion

Milestone 1 is **FULLY VERIFIED** and **APPROVED**:
- `supabase/migrations/20261017020000_create_crm_salary_tables.sql` implements all 4 tables with complete column specifications, default values, check constraints, composite unique constraints, cascading foreign keys, RLS policies, indexes, and triggers.
- `src/integrations/supabase/types.ts` accurately maps all 4 tables into Supabase client types.
- `src/types/crmPayroll.ts` defines all domain entities, calculation contracts, and union types with zero `any` types.
- 42 out of 42 Milestone 1 unit tests pass.
- 75 out of 75 Phase 1 & 2 regression tests pass with zero regressions.
- `tsc --noEmit` exits with 0 compiler errors.
- Milestone 1 is ready for handoff to Worker M2 (Payroll Calculation Engine).

---

## 5. Verification Method

To independently verify this milestone:

```powershell
# 1. Run Milestone 1 Migration & Type Tests (42 passed)
cmd /c npx vitest run src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts

# 2. Run Phase 1 & 2 Core Regression Test Suites (75 passed)
cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts src/test/crmAttendanceTypes.challenger.test.ts src/test/crmPermissionRbac.test.ts

# 3. Verify TypeScript Compilation (0 errors)
cmd /c npx tsc --noEmit
```

### Invalidation Conditions:
- Any modification to column names or nullability in `supabase/migrations/20261017020000_create_crm_salary_tables.sql` without updating `src/integrations/supabase/types.ts`.
- Introduction of `any` types into `src/types/crmPayroll.ts`.
- Altering the composite unique constraints `uq_crm_salary_profiles_staff`, `uq_crm_payroll_runs_month`, or `uq_crm_payslips_staff_month` away from their `org_id` scoping.

---

## Quality Review Report

### Review Summary
**Verdict**: **APPROVE**

### Findings

#### [Minor] Finding 1: Phase 2 Challenger Test Brittle Date Hardcoding
- **What**: In `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx`, `const TODAY = "2026-10-17"` is hardcoded instead of dynamic or mocked via `vi.setSystemTime()`.
- **Where**: `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx:69-70`
- **Why**: As soon as the calendar date progressed to `2026-10-18`, `Attendance.tsx` defaulted the filter date to `2026-10-18`, hiding records dated `2026-10-17` and causing 3 test timeouts.
- **Suggestion**: Use `const TODAY = new Date().toISOString().split("T")[0]` (matching `crmAttendanceRoleFilterStress.test.tsx:142`) or use Vitest's `vi.useFakeTimers()` / `vi.setSystemTime(new Date("2026-10-17T12:00:00Z"))`.

#### [Minor] Finding 2: RBAC Matrix Consideration for Milestone 3
- **What**: Milestone 3 requires `useCRMPermission('salary', 'approve')` for payroll lock and advance approval.
- **Where**: `src/pages/crm/RoleManagement.tsx:100-108`
- **Why**: Currently `CRM_MODULES` in `RoleManagement.tsx` defines `salary` with actions `view` and `edit`.
- **Suggestion**: When Worker M3 implements the UI, add `{ id: "approve", label: "Approve Payroll & Advances" }` to the `salary` module definition so custom roles can be granted granular approval permissions.

### Verified Claims
- Idempotent migration with 4 tables, 15 indexes, 3 triggers, 16 RLS policies → verified via AST analysis and `crmSalaryMigration.test.ts` → **PASS**
- Supabase types matching SQL schema with 0 discrepancies → verified via `crmSalaryTypes.test.ts` and `tsc --noEmit` → **PASS**
- Zero `any` types in `src/types/crmPayroll.ts` → verified via `IsAny<T>` compiler utility → **PASS**
- Phase 1 & 2 core regression test suites pass → verified via vitest (75/75 tests passed) → **PASS**

### Coverage Gaps
- Live Supabase cloud migration: Not run in CI environment; verified via SQL parser oracle. Risk level: low.

---

## Adversarial Challenge Report

### Challenge Summary
**Overall Risk Assessment**: **LOW**

### Challenges

#### [Low] Challenge 1: Historical Data Preservation on User Account Deletion
- **Assumption challenged**: Administrative user deletion (`locked_by`, `requested_by`, `approved_by`) might break relational integrity or delete audit trails.
- **Attack scenario**: An organization super-admin approves an advance or locks a payroll run, and subsequently leaves the organization (user account deleted).
- **Result**: `ON DELETE SET NULL` on `locked_by`, `requested_by`, and `approved_by` foreign keys ensures the payroll run and salary adjustment records remain preserved in the database with nullified actor IDs rather than triggering cascading deletion of financial data.
- **Verdict**: Robust.

#### [Low] Challenge 2: Re-running Migration in Production
- **Assumption challenged**: Migration script replay could fail with `relation already exists` or `policy already exists`.
- **Attack scenario**: Running `20261017020000_create_crm_salary_tables.sql` multiple times against the same PostgreSQL database.
- **Result**: Every `CREATE TABLE` and `CREATE INDEX` uses `IF NOT EXISTS`. Every `CREATE TRIGGER` and `CREATE POLICY` is preceded by `DROP TRIGGER IF EXISTS` and `DROP POLICY IF EXISTS`.
- **Verdict**: Robust.
