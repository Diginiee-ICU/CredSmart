# Database Migration Blueprint: CRM Phase 3 Salary Management & Payroll Engine

## Executive Summary
This report delivers the comprehensive architectural blueprint for `supabase/migrations/20261017020000_create_crm_salary_tables.sql`, establishing the 4 core database tables required for CredSmart CRM Phase 3:
1. `public.crm_salary_profiles` — Staff compensation configurations and statutory deductions
2. `public.crm_payroll_runs` — Monthly organization-wide payroll execution lifecycle
3. `public.crm_payslips` — Immutable per-staff payslip records and attendance-driven calculations
4. `public.crm_salary_adjustments` — Advances, bonuses, ad-hoc deductions, and loan repayments

---

## 1. Observation
1. **Existing Migrations**:
   - `supabase/migrations/20261017000000_create_crm_rbac_tables.sql` established the RBAC layer: `crm_roles`, `crm_permissions`, and `crm_staff_roles`. It defined `seed_crm_super_admin_for_org(_org_id UUID)` which currently seeds `['salary', 'view']` and `['salary', 'edit']`.
   - `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` established the Phase 2 layer: `crm_geolocations`, `crm_attendance`, and `crm_attendance_requests`. All tables enforce `has_org_access(org_id)` RLS, use `update_updated_at()` triggers, and conform to `BEGIN; ... COMMIT;` transaction wrapping.
   - Vitest test `src/test/crmAttendanceMigrationStress.test.ts` confirms 31/31 passing tests, proving the standard DDL patterns: `IF NOT EXISTS` for tables/indexes, preceding `DROP POLICY IF EXISTS`, and preceding `DROP TRIGGER IF EXISTS`.

2. **Phase 3 Requirements**:
   - Per `ORIGINAL_REQUEST.md` (lines 442-525) and `orchestrator_crm_phase3_gen2/DISPATCH.md` (lines 30-111), the migration must create:
     - `crm_salary_profiles`: unique on `(org_id, staff_id)`, check on `salary_type IN ('monthly', 'daily', 'hourly')`.
     - `crm_payroll_runs`: unique on `(org_id, month_year)`, check on `status IN ('draft', 'locked', 'disbursed')`.
     - `crm_payslips`: unique on `(org_id, staff_id, month_year)`, check on `payment_status IN ('pending', 'paid', 'partial')`, stores `salary_profile_snapshot JSONB`.
     - `crm_salary_adjustments`: check on `type IN ('advance', 'bonus', 'deduction', 'loan_repayment')`, check on `status IN ('pending', 'approved', 'deducted', 'rejected')`.
   - All tables must enable Row Level Security (RLS) with policy `USING (has_org_access(org_id))` for SELECT, INSERT, UPDATE, DELETE.
   - RBAC requirements for Phase 3 UI require `useCRMPermission('salary', 'approve')` for locking payroll and approving advances/deductions.

3. **Database Types & Integration**:
   - `src/integrations/supabase/types.ts` contains database Row, Insert, Update, and Relationship interfaces.
   - `src/types/crmAttendance.ts` contains the domain type interfaces for Phase 2. A parallel `src/types/crmSalary.ts` or `src/utils/crmPayrollUtils.ts` must export strict domain models.

---

## 2. Logic Chain
1. **Idempotency & Resilience**:
   - In automated deployment and development environments, migrations may be executed repeatedly. Therefore, every table definition MUST use `CREATE TABLE IF NOT EXISTS`, every index MUST use `CREATE INDEX IF NOT EXISTS`, and every policy and trigger MUST be preceded by a corresponding `DROP ... IF EXISTS`.
   - Wrapping the entire script in `BEGIN;` and `COMMIT;` guarantees that migration steps execute atomically without leaving partial tables if a connection fails.

2. **Referential Integrity & Cascading**:
   - Tenant isolation is paramount: every table references `public.organizations(id) ON DELETE CASCADE`. If an organization is removed, all associated salary profiles, payroll runs, payslips, and adjustments are cleaned up immediately.
   - Staff references point to `auth.users(id) ON DELETE CASCADE`.
   - Audit references (`locked_by`, `requested_by`, `approved_by`) point to `auth.users(id) ON DELETE SET NULL` to preserve historical financial records even if a managerial account is deleted.
   - Payslip to payroll run link: `payroll_run_id REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE`. If a draft run is deleted, its uncommitted payslips are safely removed.

3. **Check Constraints & Data Integrity**:
   - Monetary values (`base_amount`, `gross_salary`, `net_salary`, etc.) must be non-negative (`>= 0`).
   - Deduction percentages (`pf_deduction_percent`, `esi_deduction_percent`) must be bounded between `0.00` and `100.00`.
   - Adjustment amounts must be strictly positive (`amount > 0`).
   - `month_year` formats must follow ISO year-month: `^[0-9]{4}-(0[1-9]|1[0-2])$`.
   - Enums are enforced via PostgreSQL `CHECK (field IN (...))` to align with project conventions without requiring custom Postgres ENUM types that complicate migrations.

4. **RBAC Extension**:
   - Phase 1 seeded `['salary', 'view']` and `['salary', 'edit']`.
   - Phase 3 Milestone 3 requires `['salary', 'approve']` for payroll run locking and advance approval.
   - Following `crm-rbac-skill/SKILL.md` Section 5, `seed_crm_super_admin_for_org` is idempotently updated to include `['salary', 'approve']`, and executed for all existing organizations with `ON CONFLICT DO NOTHING`.

---

## 3. Caveats
- Assumptions:
  - The PostgreSQL function `public.update_updated_at()` already exists in the database (verified from `20261017010000_create_crm_attendance_tables.sql`).
  - The helper function `public.has_org_access(org_id UUID)` already exists in the database (verified from `20260211173918` and `20261017000000`).
- Areas Not Investigated:
  - Automated direct bank disbursement APIs (Phase 3 currently manages disbursement states inside the app and exports payslip PDFs and CSVs; banking gateway integration is out of scope).

---

## 4. Conclusion & SQL Blueprint

### 4.1 SQL Migration Blueprint (`supabase/migrations/20261017020000_create_crm_salary_tables.sql`)

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
-- Permissions:
--   Updates seed_crm_super_admin_for_org to include ['salary', 'approve']
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.crm_salary_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_salary_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (base_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2 CHECK (allowed_leaves_per_month >= 0),
  hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00 CHECK (hourly_overtime_rate >= 0),
  pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (pf_deduction_percent >= 0 AND pf_deduction_percent <= 100),
  esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (esi_deduction_percent >= 0 AND esi_deduction_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org ON public.crm_salary_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_staff ON public.crm_salary_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_active ON public.crm_salary_profiles(org_id, is_active);

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
  month_year TEXT NOT NULL CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed')),
  total_payout NUMERIC(14,2) DEFAULT 0.00 CHECK (total_payout >= 0),
  staff_count INTEGER DEFAULT 0 CHECK (staff_count >= 0),
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_org ON public.crm_payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_org_month ON public.crm_payroll_runs(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_status ON public.crm_payroll_runs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_locked_by ON public.crm_payroll_runs(locked_by);

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
  month_year TEXT NOT NULL CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  salary_profile_snapshot JSONB NOT NULL,
  working_days_in_month INTEGER NOT NULL CHECK (working_days_in_month >= 0),
  present_days INTEGER NOT NULL DEFAULT 0 CHECK (present_days >= 0),
  absent_days INTEGER NOT NULL DEFAULT 0 CHECK (absent_days >= 0),
  half_days INTEGER NOT NULL DEFAULT 0 CHECK (half_days >= 0),
  lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (lop_days >= 0),
  overtime_minutes INTEGER NOT NULL DEFAULT 0 CHECK (overtime_minutes >= 0),
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (gross_salary >= 0),
  lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (lop_deduction >= 0),
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (overtime_amount >= 0),
  pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (pf_deduction >= 0),
  esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (esi_deduction >= 0),
  advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (advance_deduction >= 0),
  bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (bonus_amount >= 0),
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_salary >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payslips_org ON public.crm_payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_run ON public.crm_payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_staff_month ON public.crm_payslips(staff_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_org_month ON public.crm_payslips(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_status ON public.crm_payslips(org_id, payment_status);

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
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  month_year TEXT CHECK (month_year IS NULL OR month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_org ON public.crm_salary_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_staff ON public.crm_salary_adjustments(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_status ON public.crm_salary_adjustments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_month ON public.crm_salary_adjustments(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_type ON public.crm_salary_adjustments(type);

DROP TRIGGER IF EXISTS update_crm_salary_adjustments_updated_at ON public.crm_salary_adjustments;
CREATE TRIGGER update_crm_salary_adjustments_updated_at
  BEFORE UPDATE ON public.crm_salary_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Enablement
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

-- ----------------------------------------------------------------------------
-- 10. RBAC Seeding Extension: Add ['salary', 'approve']
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_crm_super_admin_for_org(_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_module TEXT;
  v_action TEXT;
  v_modules_actions TEXT[][] := ARRAY[
    ARRAY['attendance', 'view'],
    ARRAY['attendance', 'edit'],
    ARRAY['salary', 'view'],
    ARRAY['salary', 'edit'],
    ARRAY['salary', 'approve'],
    ARRAY['tasks', 'view'],
    ARRAY['tasks', 'create'],
    ARRAY['tasks', 'approve'],
    ARRAY['meetings', 'view'],
    ARRAY['meetings', 'create'],
    ARRAY['broadcasts', 'view'],
    ARRAY['broadcasts', 'send'],
    ARRAY['ai_assistant', 'access'],
    ARRAY['support', 'view'],
    ARRAY['support', 'manage']
  ];
  i INT;
BEGIN
  -- Find or create super_admin role
  SELECT id INTO v_role_id
  FROM public.crm_roles
  WHERE org_id = _org_id AND is_super_admin = true
  LIMIT 1;

  IF v_role_id IS NULL THEN
    INSERT INTO public.crm_roles (org_id, name, color, icon, is_super_admin)
    VALUES (_org_id, 'Super Admin', '#1D4ED8', 'Crown', true)
    RETURNING id INTO v_role_id;
  END IF;

  -- Ensure all permissions are granted
  FOR i IN 1..array_length(v_modules_actions, 1) LOOP
    v_module := v_modules_actions[i][1];
    v_action := v_modules_actions[i][2];

    INSERT INTO public.crm_permissions (role_id, module, action, allowed)
    VALUES (v_role_id, v_module, v_action, true)
    ON CONFLICT (role_id, module, action)
    DO NOTHING;
  END LOOP;

  RETURN v_role_id;
END;
$$;

-- Seed for all existing organizations
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_crm_super_admin_for_org(r.id);
  END LOOP;
END;
$$;

COMMIT;
```

---

### 4.2 TypeScript Schema Definitions for `src/integrations/supabase/types.ts`

These definitions must be added to `Database["public"]["Tables"]`:

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
          staff_count: number
          status: string
          total_payout: number
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
          staff_count?: number
          status?: string
          total_payout?: number
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
          staff_count?: number
          status?: string
          total_payout?: number
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          esi_deduction_percent: number
          hourly_overtime_rate: number
          id: string
          is_active: boolean
          org_id: string
          pf_deduction_percent: number
          salary_type: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number
          hourly_overtime_rate?: number
          id?: string
          is_active?: boolean
          org_id: string
          pf_deduction_percent?: number
          salary_type?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number
          hourly_overtime_rate?: number
          id?: string
          is_active?: boolean
          org_id?: string
          pf_deduction_percent?: number
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

### 4.3 Domain Type Definitions (`src/types/crmSalary.ts` / `src/utils/crmPayrollUtils.ts`)

```typescript
export type SalaryType = "monthly" | "daily" | "hourly";
export type PayrollRunStatus = "draft" | "locked" | "disbursed";
export type PayslipPaymentStatus = "pending" | "paid" | "partial";
export type SalaryAdjustmentType = "advance" | "bonus" | "deduction" | "loan_repayment";
export type SalaryAdjustmentStatus = "pending" | "approved" | "deducted" | "rejected";

export interface CrmSalaryProfile {
  id: string;
  org_id: string;
  staff_id: string;
  salary_type: SalaryType;
  base_amount: number;
  currency: string;
  allowed_leaves_per_month: number;
  hourly_overtime_rate: number;
  pf_deduction_percent: number;
  esi_deduction_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmPayrollRun {
  id: string;
  org_id: string;
  month_year: string;
  status: PayrollRunStatus;
  total_payout: number;
  staff_count: number;
  locked_by: string | null;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPayslip {
  id: string;
  org_id: string;
  payroll_run_id: string;
  staff_id: string;
  month_year: string;
  salary_profile_snapshot: Record<string, unknown>;
  working_days_in_month: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  lop_days: number;
  overtime_minutes: number;
  gross_salary: number;
  lop_deduction: number;
  overtime_amount: number;
  pf_deduction: number;
  esi_deduction: number;
  advance_deduction: number;
  bonus_amount: number;
  net_salary: number;
  payment_status: PayslipPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmSalaryAdjustment {
  id: string;
  org_id: string;
  staff_id: string;
  type: SalaryAdjustmentType;
  amount: number;
  description: string | null;
  month_year: string | null;
  status: SalaryAdjustmentStatus;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 5. Verification Method

### 5.1 Proposed Test Suites
To verify this migration and its types, the test writer should implement two test suites:

1. `src/test/crmSalaryMigration.test.ts` (15+ tests):
   - **T1: Syntax & Wrapping**:
     - File exists and is non-empty.
     - Script starts with `BEGIN;` and ends with `COMMIT;`.
     - Parentheses, single quotes, and double quotes are balanced.
   - **T2: Table & Column DDL**:
     - All 4 tables exist with `CREATE TABLE IF NOT EXISTS public.<name>`.
     - Primary keys are UUID with `DEFAULT gen_random_uuid() PRIMARY KEY`.
     - Foreign keys reference `public.organizations(id) ON DELETE CASCADE` and `auth.users(id) ON DELETE CASCADE`.
   - **T3: Constraints & Unique Keys**:
     - `uq_crm_salary_profiles_staff` on `(org_id, staff_id)`.
     - `uq_crm_payroll_runs_month` on `(org_id, month_year)`.
     - `uq_crm_payslips_staff_month` on `(org_id, staff_id, month_year)`.
     - Check constraints on salary_type, payroll status, payment status, adjustment type, adjustment status.
   - **T4: Idempotency & Triggers**:
     - All indexes use `CREATE INDEX IF NOT EXISTS`.
     - All 4 triggers preceded by `DROP TRIGGER IF EXISTS`.
     - All 16 policies preceded by `DROP POLICY IF EXISTS`.
   - **T5: RLS Security**:
     - `ENABLE ROW LEVEL SECURITY` called on all 4 tables.
     - All 16 policies require `auth.role() = 'authenticated'` and `has_org_access(org_id)`.

2. `src/test/crmSalaryTypes.test.ts` (10+ tests):
   - Type verification of `Database["public"]["Tables"]` for all 4 tables (`Row`, `Insert`, `Update`).
   - Domain type assignability checks for `CrmSalaryProfile`, `CrmPayrollRun`, `CrmPayslip`, and `CrmSalaryAdjustment`.
   - Union string literal checks for `SalaryType`, `PayrollRunStatus`, `PayslipPaymentStatus`, `SalaryAdjustmentType`, `SalaryAdjustmentStatus`.

### 5.2 Verification Commands
```bash
# Typecheck to confirm zero compile errors
cmd /c npx tsc --noEmit

# Run migration and types tests
cmd /c npx vitest run src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts

# Confirm zero regression on existing Phase 1 & 2 tests
cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts
```

### 5.3 Invalidation Conditions
- If column names deviate between migration SQL and Supabase types (e.g. `monthYear` instead of `month_year`).
- If numeric monetary columns are declared as `FLOAT` or `DOUBLE PRECISION` rather than exact `NUMERIC(12,2)` / `NUMERIC(14,2)` (floating point drift in payroll).
- If any table omits `IF NOT EXISTS` or triggers omit `DROP TRIGGER IF EXISTS`, breaking repeated execution.
