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
