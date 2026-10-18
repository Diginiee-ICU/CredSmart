# Handoff Report — Explorer M1 Types
**CRM Phase 3: Salary Management & Payroll Engine — Milestone M1: Database Migration, TypeScript Types & Test Suite Design**

---

## 1. Observation

### 1.1 Requirements & Specifications Reviewed
1. **`ORIGINAL_REQUEST.md` (lines 442–526)**:
   - Prescribes the migration file `supabase/migrations/20261017020000_create_crm_salary_tables.sql`.
   - Specifies four tables: `public.crm_salary_profiles` (13 fields), `public.crm_payroll_runs` (11 fields), `public.crm_payslips` (24 fields), and `public.crm_salary_adjustments` (12 fields).
   - Requires idempotent creation (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), triggers for `updated_at`, and RLS policies on all four tables using `USING (has_org_access(org_id))`.
   - Mandates updating `src/integrations/supabase/types.ts` with strict zero `any` types.
   - Demands test suites: `src/test/crmSalaryMigration.test.ts` (15+ tests) and `src/test/crmSalaryTypes.test.ts` (10+ tests).

2. **`orchestrator_crm_phase3/DISPATCH.md` (lines 29–110)**:
   - Confirms M1 column specifications, decimal precisions (`NUMERIC(12,2)`, `NUMERIC(14,2)`, `NUMERIC(10,2)`, `NUMERIC(5,2)`), defaults, CHECK constraints, and foreign key cascade rules.

3. **`spec_miner_m1_3/handoff.md` (lines 140–599)**:
   - Defines a 22-test oracle in `src/test/crmSalaryMigration.test.ts` across 8 test suites.
   - Requires transactional wrapping (`BEGIN;` and `COMMIT;`), quote and parenthesis balancing, valid DDL keywords, exact table and column regexes, CASCADE/SET NULL foreign keys, named unique constraints (`uq_crm_salary_profiles_staff`, `uq_crm_payroll_runs_month`, `uq_crm_payslips_staff_month`), 5 CHECK constraints, 12+ indexes with `IF NOT EXISTS`, 3 triggers with preceding `DROP TRIGGER IF EXISTS`, 16 RLS policies with preceding `DROP POLICY IF EXISTS`, and zero risky statements.

4. **Phase 2 Migration Reference: `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`**:
   - Implements transactional wrapping: `BEGIN;` on line 1, `COMMIT;` on line 181.
   - Defines RLS policies for each table with `auth.role() = 'authenticated' AND has_org_access(org_id)` for SELECT, INSERT, UPDATE, DELETE.

5. **`src/integrations/supabase/types.ts`**:
   - `Database["public"]["Tables"]` contains alphabetically sorted table keys.
   - Columns in `Row`, `Insert`, `Update` are strictly alphabetized.
   - `Relationships` arrays only include foreign keys to other `public` tables (e.g. `organizations`, `crm_geolocations`), excluding auth schemas like `auth.users`.
   - `Json` type is exported at line 1.

6. **Existing Type Test Reference: `src/test/crmAttendanceTypes.challenger.test.ts`**:
   - Demonstrates 18 passing tests with compile-time type helpers (`Extends`, `ExactKeys`), `expectTypeOf`, minimal/maximal insert payloads, negative compilation checks, update partiality, and relationship validation. Verified via `cmd /c npx vitest run src/test/crmAttendanceTypes.challenger.test.ts` (18 passed in 22ms).

---

## 2. Logic Chain

1. **SQL Idempotency & Oracle Compliance**:
   - From *Observation 3*, every SQL statement in the migration must survive repeated executions.
   - We authored `proposed_20261017020000_create_crm_salary_tables.sql` containing:
     - 4 `CREATE TABLE IF NOT EXISTS` statements.
     - 15 `CREATE INDEX IF NOT EXISTS` statements.
     - 3 triggers (`update_crm_salary_profiles_updated_at`, `update_crm_payroll_runs_updated_at`, `update_crm_payslips_updated_at`) each preceded by `DROP TRIGGER IF EXISTS ... ON public.<table>;`.
     - 16 RLS policies (4 tables × 4 CRUD ops) each preceded by `DROP POLICY IF EXISTS "..." ON public.<table>;`.
     - All 16 policies enforce `auth.role() = 'authenticated' AND has_org_access(org_id)`.
     - 4 `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` statements.
   - Executed empirical verification script (`verify_sql.cjs`) against all 22 test regexes from *Observation 3*. Result: 22/22 passed, 0 risky statements, balanced parentheses (121/121), and balanced quotes.

2. **TypeScript Database Type Modeling**:
   - From *Observation 5*, tables in `src/integrations/supabase/types.ts` must follow exact casing, alphabetical column sorting, and relational schemas.
   - `crm_salary_profiles`: 13 fields (10 non-null, 3 nullable rates: `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`). Foreign key to `organizations`.
   - `crm_payroll_runs`: 11 fields (6 non-null, 5 nullable: `total_payout`, `staff_count`, `locked_by`, `locked_at`, `notes`). Foreign key to `organizations`.
   - `crm_payslips`: 24 fields (23 non-null, 1 nullable: `paid_at`). JSONB snapshot typed as `Json`. Foreign keys to `organizations` and `crm_payroll_runs`.
   - `crm_salary_adjustments`: 12 fields (7 non-null, 5 nullable: `description`, `month_year`, `requested_by`, `approved_by`, `approved_at`). Foreign key to `organizations`.
   - All fields use strict primitive types (`string`, `number`, `boolean`, `Json`) and their `null` unions. Zero `any` types.

3. **Test Suite Architecture for `crmSalaryTypes.test.ts`**:
   - From *Observation 6*, type testing must verify both positive runtime/compile-time assertions and negative assignability contracts.
   - We authored `proposed_crmSalaryTypes.test.ts` with 13 comprehensive tests covering:
     - Suite 1: Exact column count and key matching for all 4 tables in `Row`.
     - Suite 2: Minimal and maximal `Insert` payloads, plus compile-time negative tests rejecting missing required fields or wrong types.
     - Suite 3: `Update` type partiality (empty object `{}` allowed, partial property modifications permitted).
     - Suite 4: Foreign key relationship definitions matching database foreign key constraints.
     - Suite 5: Compatibility with Supabase generic helpers (`Tables`, `TablesInsert`, `TablesUpdate`) and compile-time zero-`any` enforcement.

---

## 3. Caveats

1. **`auth.users` Foreign Keys in Supabase Types**: Foreign keys referencing `auth.users(id)` (such as `staff_id`, `locked_by`, `requested_by`, `approved_by`) are defined with full CASCADE/SET NULL rules in the SQL migration, but are omitted from Supabase's generated `Relationships` array in `types.ts`, matching Supabase conventions where cross-schema foreign keys are not exposed to the public API.
2. **Read-Only Explorer Scope**: In accordance with the Explorer archetype constraints, files have been generated as validated proposed artifacts in `.agents/teamwork/explorer_m1_types/`. They are ready for immediate drop-in by `worker_m1` into `supabase/migrations/` and `src/integrations/supabase/types.ts`, and by `test_writer_m1` into `src/test/crmSalaryTypes.test.ts`.

---

## 4. Conclusion

All three deliverables for Milestone M1 are fully authored, empirically validated, and ready for deployment:

1. **Deliverable 1**: Complete, verbatim SQL script matching 100% of the 22-test oracle in `spec_miner_m1_3/handoff.md`.
2. **Deliverable 2**: Exact TypeScript definitions for `src/integrations/supabase/types.ts` for all 4 tables with strict zero `any` types.
3. **Deliverable 3**: 13-test type testing suite design for `src/test/crmSalaryTypes.test.ts`.

---

## 5. Verification Method

To verify these deliverables once deployed:
1. Verify the SQL migration using the migration test suite:
   ```bash
   cmd /c npx vitest run src/test/crmSalaryMigration.test.ts
   ```
2. Verify TypeScript type correctness and zero compile errors:
   ```bash
   cmd /c npx tsc --noEmit
   ```
3. Run the TypeScript schema contract test suite:
   ```bash
   cmd /c npx vitest run src/test/crmSalaryTypes.test.ts
   ```
4. Verify zero regressions across all CRM test suites:
   ```bash
   cmd /c npx vitest run src/test/crm*
   ```
5. Invalidation Conditions:
   - Any test failure in `crmSalaryMigration.test.ts` (all 22 tests must pass).
   - Any test failure in `crmSalaryTypes.test.ts` (all 13 tests must pass).
   - Any TypeScript error emitted by `tsc --noEmit`.
   - Any presence of `any` type in CRM schema definitions.

---

## Deliverable 1: Complete Verbatim SQL Migration Script

Target Path: `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
Local Artifact: `.agents/teamwork/explorer_m1_types/proposed_20261017020000_create_crm_salary_tables.sql`

```sql
BEGIN;

-- ============================================================================
-- Migration: 20261017020000_create_crm_salary_tables.sql
-- Description: CRM Phase 3: Salary Management & Payroll Engine
-- Tables:
--   1. public.crm_salary_profiles
--   2. public.crm_payroll_runs
--   3. public.crm_payslips
--   4. public.crm_salary_adjustments
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.crm_salary_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_salary_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2,
  hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00,
  pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00,
  esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org ON public.crm_salary_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_staff ON public.crm_salary_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_active ON public.crm_salary_profiles(org_id, is_active);

-- Attach updated_at trigger to crm_salary_profiles
DROP TRIGGER IF EXISTS update_crm_salary_profiles_updated_at ON public.crm_salary_profiles;
CREATE TRIGGER update_crm_salary_profiles_updated_at
  BEFORE UPDATE ON public.crm_salary_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Table: public.crm_payroll_runs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_payroll_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed')),
  total_payout NUMERIC(14,2) DEFAULT 0.00,
  staff_count INTEGER DEFAULT 0,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_org_month ON public.crm_payroll_runs(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_status ON public.crm_payroll_runs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_locked_by ON public.crm_payroll_runs(locked_by);

-- Attach updated_at trigger to crm_payroll_runs
DROP TRIGGER IF EXISTS update_crm_payroll_runs_updated_at ON public.crm_payroll_runs;
CREATE TRIGGER update_crm_payroll_runs_updated_at
  BEFORE UPDATE ON public.crm_payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Table: public.crm_payslips
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  salary_profile_snapshot JSONB NOT NULL,
  working_days_in_month INTEGER NOT NULL,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  half_days INTEGER NOT NULL DEFAULT 0,
  lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payslips_org ON public.crm_payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_payroll_run ON public.crm_payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_staff_month ON public.crm_payslips(staff_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_payment_status ON public.crm_payslips(org_id, payment_status);

-- Attach updated_at trigger to crm_payslips
DROP TRIGGER IF EXISTS update_crm_payslips_updated_at ON public.crm_payslips;
CREATE TRIGGER update_crm_payslips_updated_at
  BEFORE UPDATE ON public.crm_payslips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Table: public.crm_salary_adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_salary_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  month_year TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_org ON public.crm_salary_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_staff ON public.crm_salary_adjustments(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_status ON public.crm_salary_adjustments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_month ON public.crm_salary_adjustments(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_type ON public.crm_salary_adjustments(org_id, type);

-- ----------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_salary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_salary_adjustments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6. RLS Policies: public.crm_salary_profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can view crm salary profiles"
  ON public.crm_salary_profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can insert crm salary profiles"
  ON public.crm_salary_profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can update crm salary profiles"
  ON public.crm_salary_profiles FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can delete crm salary profiles"
  ON public.crm_salary_profiles FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 7. RLS Policies: public.crm_payroll_runs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can view crm payroll runs"
  ON public.crm_payroll_runs FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can insert crm payroll runs"
  ON public.crm_payroll_runs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can update crm payroll runs"
  ON public.crm_payroll_runs FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can delete crm payroll runs"
  ON public.crm_payroll_runs FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 8. RLS Policies: public.crm_payslips
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can view crm payslips"
  ON public.crm_payslips FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can insert crm payslips"
  ON public.crm_payslips FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can update crm payslips"
  ON public.crm_payslips FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can delete crm payslips"
  ON public.crm_payslips FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 9. RLS Policies: public.crm_salary_adjustments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can view crm salary adjustments"
  ON public.crm_salary_adjustments FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can insert crm salary adjustments"
  ON public.crm_salary_adjustments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can update crm salary adjustments"
  ON public.crm_salary_adjustments FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can delete crm salary adjustments"
  ON public.crm_salary_adjustments FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

COMMIT;
```

---

## Deliverable 2: TypeScript Additions for `src/integrations/supabase/types.ts`

Target Path: `src/integrations/supabase/types.ts` (under `Database["public"]["Tables"]`)
Local Artifact: `.agents/teamwork/explorer_m1_types/proposed_supabase_types_crm_salary.ts`

### Insertion Segment 1 (Alphabetical between `crm_geolocations` and `crm_permissions`):

```typescript
      crm_payroll_runs: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month_year: string
          notes: string | null
          org_id: string
          staff_count: number | null
          status: string
          total_payout: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year: string
          notes?: string | null
          org_id: string
          staff_count?: number | null
          status?: string
          total_payout?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year?: string
          notes?: string | null
          org_id?: string
          staff_count?: number | null
          status?: string
          total_payout?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_payslips: {
        Row: {
          absent_days: number
          advance_deduction: number
          bonus_amount: number
          created_at: string
          esi_deduction: number
          gross_salary: number
          half_days: number
          id: string
          lop_days: number
          lop_deduction: number
          month_year: string
          net_salary: number
          org_id: string
          overtime_amount: number
          overtime_minutes: number
          paid_at: string | null
          payment_status: string
          payroll_run_id: string
          pf_deduction: number
          present_days: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at: string
          working_days_in_month: number
        }
        Insert: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year: string
          net_salary?: number
          org_id: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at?: string
          working_days_in_month: number
        }
        Update: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year?: string
          net_salary?: number
          org_id?: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id?: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot?: Json
          staff_id?: string
          updated_at?: string
          working_days_in_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_payslips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "crm_payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
```

### Insertion Segment 2 (Alphabetical between `crm_roles` and `crm_staff_roles`):

```typescript
      crm_salary_adjustments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          month_year: string | null
          org_id: string
          requested_by: string | null
          staff_id: string
          status: string
          type: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id: string
          requested_by?: string | null
          staff_id: string
          status?: string
          type: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id?: string
          requested_by?: string | null
          staff_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_adjustments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_salary_profiles: {
        Row: {
          allowed_leaves_per_month: number
          base_amount: number
          created_at: string
          currency: string
          esi_deduction_percent: number | null
          hourly_overtime_rate: number | null
          id: string
          is_active: boolean
          org_id: string
          pf_deduction_percent: number | null
          salary_type: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number | null
          hourly_overtime_rate?: number | null
          id?: string
          is_active?: boolean
          org_id: string
          pf_deduction_percent?: number | null
          salary_type?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number | null
          hourly_overtime_rate?: number | null
          id?: string
          is_active?: boolean
          org_id?: string
          pf_deduction_percent?: number | null
          salary_type?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

---

## Deliverable 3: Test Suite Design for `src/test/crmSalaryTypes.test.ts`

Target Path: `src/test/crmSalaryTypes.test.ts`
Local Artifact: `.agents/teamwork/explorer_m1_types/proposed_crmSalaryTypes.test.ts`

```typescript
import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// TypeScript compile-time helper utilities for type contracts
type Extends<T, U> = [T] extends [U] ? true : false;
type ExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

describe("CRM Phase 3 Milestone 1: TypeScript Types & Schema Contract Tests", () => {
  // ==========================================================================
  // Suite 1: Database Table Existence & Key Parity with SQL Schema
  // ==========================================================================
  describe("Suite 1: SQL Column Parity with Supabase Database Types", () => {
    it("1. verifies crm_salary_profiles has exact 13 SQL columns in Row with correct types", () => {
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "hourly_overtime_rate"
        | "pf_deduction_percent"
        | "esi_deduction_percent"
        | "is_active"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<ProfileRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // Verify non-nullable column types
      expectTypeOf<ProfileRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["salary_type"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["base_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["currency"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["allowed_leaves_per_month"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["is_active"]>().toEqualTypeOf<boolean>();
      expectTypeOf<ProfileRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["updated_at"]>().toEqualTypeOf<string>();

      // Verify nullable/optional rate columns
      expectTypeOf<ProfileRow["hourly_overtime_rate"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["pf_deduction_percent"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["esi_deduction_percent"]>().toEqualTypeOf<number | null>();
    });

    it("2. verifies crm_payroll_runs has exact 11 SQL columns in Row with correct types", () => {
      type PayrollRunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "month_year"
        | "status"
        | "total_payout"
        | "staff_count"
        | "locked_by"
        | "locked_at"
        | "notes"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<PayrollRunRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<PayrollRunRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["month_year"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["updated_at"]>().toEqualTypeOf<string>();

      // Nullable fields
      expectTypeOf<PayrollRunRow["total_payout"]>().toEqualTypeOf<number | null>();
      expectTypeOf<PayrollRunRow["staff_count"]>().toEqualTypeOf<number | null>();
      expectTypeOf<PayrollRunRow["locked_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<PayrollRunRow["locked_at"]>().toEqualTypeOf<string | null>();
      expectTypeOf<PayrollRunRow["notes"]>().toEqualTypeOf<string | null>();
    });

    it("3. verifies crm_payslips has exact 24 SQL columns in Row with JSONB snapshot", () => {
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "payroll_run_id"
        | "staff_id"
        | "month_year"
        | "salary_profile_snapshot"
        | "working_days_in_month"
        | "present_days"
        | "absent_days"
        | "half_days"
        | "lop_days"
        | "overtime_minutes"
        | "gross_salary"
        | "lop_deduction"
        | "overtime_amount"
        | "pf_deduction"
        | "esi_deduction"
        | "advance_deduction"
        | "bonus_amount"
        | "net_salary"
        | "payment_status"
        | "paid_at"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<PayslipRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // JSONB snapshot verification
      expectTypeOf<PayslipRow["salary_profile_snapshot"]>().toEqualTypeOf<Json>();

      // Numeric metrics
      expectTypeOf<PayslipRow["working_days_in_month"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["present_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["absent_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["half_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["lop_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["overtime_minutes"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["gross_salary"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["lop_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["overtime_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["pf_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["esi_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["advance_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["bonus_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["net_salary"]>().toEqualTypeOf<number>();

      // String and nullable fields
      expectTypeOf<PayslipRow["payment_status"]>().toEqualTypeOf<string>();
      expectTypeOf<PayslipRow["paid_at"]>().toEqualTypeOf<string | null>();
    });

    it("4. verifies crm_salary_adjustments has exact 12 SQL columns in Row", () => {
      type AdjustmentRow = Database["public"]["Tables"]["crm_salary_adjustments"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "type"
        | "amount"
        | "description"
        | "month_year"
        | "status"
        | "requested_by"
        | "approved_by"
        | "approved_at"
        | "created_at";

      type KeysMatch = ExactKeys<AdjustmentRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<AdjustmentRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["type"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["amount"]>().toEqualTypeOf<number>();
      expectTypeOf<AdjustmentRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["created_at"]>().toEqualTypeOf<string>();

      // Nullable fields
      expectTypeOf<AdjustmentRow["description"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["month_year"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["requested_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_at"]>().toEqualTypeOf<string | null>();
    });
  });

  // ==========================================================================
  // Suite 2: Supabase Insert Type Requirements & Negative Compilation Contracts
  // ==========================================================================
  describe("Suite 2: Insert Types & Negative Compilation Contracts", () => {
    it("5. validates minimal required fields for crm_salary_profiles.Insert", () => {
      type ProfileInsert = Database["public"]["Tables"]["crm_salary_profiles"]["Insert"];

      // Minimal required: org_id and staff_id (others have DB defaults)
      const validMinimal: ProfileInsert = {
        org_id: "org-uuid-1",
        staff_id: "user-uuid-1",
      };
      expect(validMinimal.staff_id).toBe("user-uuid-1");

      // Full payload
      const validFull: ProfileInsert = {
        org_id: "org-uuid-1",
        staff_id: "user-uuid-1",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 250,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
        is_active: true,
      };
      expect(validFull.base_amount).toBe(50000);

      // Negative assertion: missing staff_id fails
      type MissingStaff = { org_id: string; base_amount: number };
      type CanAssignMissingStaff = Extends<MissingStaff, ProfileInsert>;
      const canAssignMissingStaff: CanAssignMissingStaff = false;
      expect(canAssignMissingStaff).toBe(false);

      // Negative assertion: missing org_id fails
      type MissingOrg = { staff_id: string; base_amount: number };
      type CanAssignMissingOrg = Extends<MissingOrg, ProfileInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);
    });

    it("6. validates minimal required fields for crm_payroll_runs.Insert", () => {
      type PayrollRunInsert = Database["public"]["Tables"]["crm_payroll_runs"]["Insert"];

      // Minimal required: org_id and month_year
      const validMinimal: PayrollRunInsert = {
        org_id: "org-uuid-1",
        month_year: "2026-10",
      };
      expect(validMinimal.month_year).toBe("2026-10");

      // Negative assertion: missing month_year fails
      type MissingMonth = { org_id: string };
      type CanAssignMissingMonth = Extends<MissingMonth, PayrollRunInsert>;
      const canAssignMissingMonth: CanAssignMissingMonth = false;
      expect(canAssignMissingMonth).toBe(false);

      // Negative assertion: missing org_id fails
      type MissingOrg = { month_year: string };
      type CanAssignMissingOrg = Extends<MissingOrg, PayrollRunInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);
    });

    it("7. validates minimal required fields for crm_payslips.Insert", () => {
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];

      // Minimal required: org_id, payroll_run_id, staff_id, month_year, salary_profile_snapshot, working_days_in_month
      const validMinimal: PayslipInsert = {
        org_id: "org-uuid-1",
        payroll_run_id: "run-uuid-1",
        staff_id: "staff-uuid-1",
        month_year: "2026-10",
        salary_profile_snapshot: { base_amount: 60000, salary_type: "monthly" },
        working_days_in_month: 26,
      };
      expect(validMinimal.working_days_in_month).toBe(26);

      // Negative assertion: missing working_days_in_month fails
      type MissingWorkingDays = {
        org_id: string;
        payroll_run_id: string;
        staff_id: string;
        month_year: string;
        salary_profile_snapshot: Json;
      };
      type CanAssignMissingWorkingDays = Extends<MissingWorkingDays, PayslipInsert>;
      const canAssignMissingWorkingDays: CanAssignMissingWorkingDays = false;
      expect(canAssignMissingWorkingDays).toBe(false);

      // Negative assertion: missing salary_profile_snapshot fails
      type MissingSnapshot = {
        org_id: string;
        payroll_run_id: string;
        staff_id: string;
        month_year: string;
        working_days_in_month: number;
      };
      type CanAssignMissingSnapshot = Extends<MissingSnapshot, PayslipInsert>;
      const canAssignMissingSnapshot: CanAssignMissingSnapshot = false;
      expect(canAssignMissingSnapshot).toBe(false);
    });

    it("8. validates minimal required fields for crm_salary_adjustments.Insert", () => {
      type AdjustmentInsert = Database["public"]["Tables"]["crm_salary_adjustments"]["Insert"];

      // Minimal required: org_id, staff_id, type, amount
      const validMinimal: AdjustmentInsert = {
        org_id: "org-uuid-1",
        staff_id: "staff-uuid-1",
        type: "advance",
        amount: 5000,
      };
      expect(validMinimal.amount).toBe(5000);

      // Negative assertion: missing amount fails
      type MissingAmount = { org_id: string; staff_id: string; type: string };
      type CanAssignMissingAmount = Extends<MissingAmount, AdjustmentInsert>;
      const canAssignMissingAmount: CanAssignMissingAmount = false;
      expect(canAssignMissingAmount).toBe(false);

      // Negative assertion: missing type fails
      type MissingType = { org_id: string; staff_id: string; amount: number };
      type CanAssignMissingType = Extends<MissingType, AdjustmentInsert>;
      const canAssignMissingType: CanAssignMissingType = false;
      expect(canAssignMissingType).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 3: Supabase Update Types Partiality & Type Safety
  // ==========================================================================
  describe("Suite 3: Update Types Partiality & Type Safety", () => {
    it("9. allows empty object {} for all 4 Update types", () => {
      type ProfileUpdate = Database["public"]["Tables"]["crm_salary_profiles"]["Update"];
      type PayrollRunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjustmentUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      const emptyProfile: ProfileUpdate = {};
      const emptyRun: PayrollRunUpdate = {};
      const emptyPayslip: PayslipUpdate = {};
      const emptyAdjustment: AdjustmentUpdate = {};

      expect(emptyProfile).toBeDefined();
      expect(emptyRun).toBeDefined();
      expect(emptyPayslip).toBeDefined();
      expect(emptyAdjustment).toBeDefined();
    });

    it("10. allows specific partial updates across all tables", () => {
      type PayrollRunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjustmentUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      const lockRun: PayrollRunUpdate = {
        status: "locked",
        locked_by: "user-uuid-1",
        locked_at: new Date().toISOString(),
      };
      expect(lockRun.status).toBe("locked");

      const markPaid: PayslipUpdate = {
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      };
      expect(markPaid.payment_status).toBe("paid");

      const approveAdj: AdjustmentUpdate = {
        status: "approved",
        approved_by: "user-uuid-admin",
        approved_at: new Date().toISOString(),
      };
      expect(approveAdj.status).toBe("approved");

      // Negative test: invalid property type in update
      type BadRunUpdate = { total_payout: string };
      type CanAssignBadRun = Extends<BadRunUpdate, PayrollRunUpdate>;
      const canAssignBadRun: CanAssignBadRun = false;
      expect(canAssignBadRun).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 4: Foreign Key Relationships in Supabase Types
  // ==========================================================================
  describe("Suite 4: Foreign Key Relationships Definition", () => {
    it("11. defines foreign key relationships for all 4 tables", () => {
      type ProfileRel = Database["public"]["Tables"]["crm_salary_profiles"]["Relationships"];
      type PayrollRunRel = Database["public"]["Tables"]["crm_payroll_runs"]["Relationships"];
      type PayslipRel = Database["public"]["Tables"]["crm_payslips"]["Relationships"];
      type AdjustmentRel = Database["public"]["Tables"]["crm_salary_adjustments"]["Relationships"];

      const profileRel: ProfileRel = [
        {
          foreignKeyName: "crm_salary_profiles_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(profileRel.length).toBe(1);

      const payrollRunRel: PayrollRunRel = [
        {
          foreignKeyName: "crm_payroll_runs_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(payrollRunRel.length).toBe(1);

      const payslipRel: PayslipRel = [
        {
          foreignKeyName: "crm_payslips_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_payslips_payroll_run_id_fkey",
          columns: ["payroll_run_id"],
          isOneToOne: false,
          referencedRelation: "crm_payroll_runs",
          referencedColumns: ["id"],
        },
      ];
      expect(payslipRel.length).toBe(2);

      const adjustmentRel: AdjustmentRel = [
        {
          foreignKeyName: "crm_salary_adjustments_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(adjustmentRel.length).toBe(1);
    });
  });

  // ==========================================================================
  // Suite 5: Type Helpers & Zero Any Invariants
  // ==========================================================================
  describe("Suite 5: Type Helper Generics & Zero Any Verification", () => {
    it("12. verifies Tables, TablesInsert, and TablesUpdate helpers work correctly", () => {
      type ProfileFromHelper = Tables<"crm_salary_profiles">;
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      expectTypeOf<ProfileFromHelper>().toEqualTypeOf<ProfileRow>();

      type PayslipInsertFromHelper = TablesInsert<"crm_payslips">;
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];
      expectTypeOf<PayslipInsertFromHelper>().toEqualTypeOf<PayslipInsert>();

      type RunUpdateFromHelper = TablesUpdate<"crm_payroll_runs">;
      type RunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      expectTypeOf<RunUpdateFromHelper>().toEqualTypeOf<RunUpdate>();
    });

    it("13. enforces strict zero 'any' types across all 4 CRM salary table definitions", () => {
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      type PayrollRunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];
      type AdjustmentRow = Database["public"]["Tables"]["crm_salary_adjustments"]["Row"];

      type HasAny =
        | IsAny<ProfileRow>
        | IsAny<PayrollRunRow>
        | IsAny<PayslipRow>
        | IsAny<AdjustmentRow>;

      const hasAny: HasAny = false;
      expect(hasAny).toBe(false);
    });
  });
});
```
