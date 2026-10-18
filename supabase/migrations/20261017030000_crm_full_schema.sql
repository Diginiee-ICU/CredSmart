BEGIN;

-- ============================================================================
-- Migration: 20261017030000_crm_full_schema.sql
-- Description: CredSmart CRM — Full Schema (Phases 1, 2 & 3 consolidated)
--
-- Sections:
--   PHASE 1 — Custom Configurable RBAC
--     Tables:  crm_roles, crm_permissions, crm_staff_roles
--     Seed:    Super Admin role + 14 permission grants per org
--
--   PHASE 2 — Attendance & Geo Location Engine
--     Tables:  crm_geolocations, crm_attendance, crm_attendance_requests
--
--   PHASE 3 — Salary Management & Payroll Engine
--     Tables:  crm_salary_profiles, crm_payroll_runs, crm_payslips,
--              crm_salary_adjustments
--
-- All statements are fully idempotent:
--   CREATE TABLE IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   DROP POLICY IF EXISTS before every CREATE POLICY
--   DROP TRIGGER IF EXISTS before every CREATE TRIGGER
--   ON CONFLICT DO NOTHING for seed data
-- ============================================================================


-- ============================================================================
-- ░░░░░░░░░░░░░░░░░░░░░░░░░░  PHASE 1: RBAC  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P1-1. Table: public.crm_roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_roles (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#1D4ED8',
  icon         TEXT        NOT NULL DEFAULT 'User',
  is_super_admin BOOLEAN   NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_roles_org ON public.crm_roles(org_id);

-- ----------------------------------------------------------------------------
-- P1-2. Table: public.crm_permissions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_permissions (
  id       UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id  UUID    NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  module   TEXT    NOT NULL,
  action   TEXT    NOT NULL,
  allowed  BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_crm_permissions_role ON public.crm_permissions(role_id);

-- ----------------------------------------------------------------------------
-- P1-3. Table: public.crm_staff_roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_staff_roles (
  staff_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_staff ON public.crm_staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_role  ON public.crm_staff_roles(role_id);

-- ----------------------------------------------------------------------------
-- P1-4. Enable RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_staff_roles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- P1-5. RLS Policies: crm_roles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Organization members can view crm roles"      ON public.crm_roles;
DROP POLICY IF EXISTS "Owners and managers can insert crm roles"     ON public.crm_roles;
DROP POLICY IF EXISTS "Owners and managers can update crm roles"     ON public.crm_roles;
DROP POLICY IF EXISTS "Owners and managers can delete crm roles"     ON public.crm_roles;

CREATE POLICY "Organization members can view crm roles"
  ON public.crm_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Owners and managers can insert crm roles"
  ON public.crm_roles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

CREATE POLICY "Owners and managers can update crm roles"
  ON public.crm_roles FOR UPDATE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

CREATE POLICY "Owners and managers can delete crm roles"
  ON public.crm_roles FOR DELETE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

-- ----------------------------------------------------------------------------
-- P1-6. RLS Policies: crm_permissions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Organization members can view crm permissions"              ON public.crm_permissions;
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions insert"      ON public.crm_permissions;
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions update"      ON public.crm_permissions;
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions delete"      ON public.crm_permissions;

CREATE POLICY "Organization members can view crm permissions"
  ON public.crm_permissions FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id AND has_org_access(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm permissions insert"
  ON public.crm_permissions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm permissions update"
  ON public.crm_permissions FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm permissions delete"
  ON public.crm_permissions FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

-- ----------------------------------------------------------------------------
-- P1-7. RLS Policies: crm_staff_roles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Organization members can view crm staff roles"              ON public.crm_staff_roles;
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles insert"      ON public.crm_staff_roles;
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles update"      ON public.crm_staff_roles;
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles delete"      ON public.crm_staff_roles;

CREATE POLICY "Organization members can view crm staff roles"
  ON public.crm_staff_roles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id AND has_org_access(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm staff roles insert"
  ON public.crm_staff_roles FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm staff roles update"
  ON public.crm_staff_roles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

CREATE POLICY "Owners and managers can manage crm staff roles delete"
  ON public.crm_staff_roles FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)
    )
  );

-- ----------------------------------------------------------------------------
-- P1-8. Function: seed_crm_super_admin_for_org
--   Seeds a Super Admin role with all 14 module/action permission grants
--   for a given organization. Safe to call multiple times (idempotent).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_crm_super_admin_for_org(_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id          UUID;
  v_module           TEXT;
  v_action           TEXT;
  v_modules_actions  TEXT[][] := ARRAY[
    ARRAY['attendance',   'view'],
    ARRAY['attendance',   'edit'],
    ARRAY['salary',       'view'],
    ARRAY['salary',       'edit'],
    ARRAY['salary',       'approve'],
    ARRAY['tasks',        'view'],
    ARRAY['tasks',        'create'],
    ARRAY['tasks',        'approve'],
    ARRAY['meetings',     'view'],
    ARRAY['meetings',     'create'],
    ARRAY['broadcasts',   'view'],
    ARRAY['broadcasts',   'send'],
    ARRAY['ai_assistant', 'access'],
    ARRAY['support',      'view'],
    ARRAY['support',      'manage']
  ];
  i INT;
BEGIN
  SELECT id INTO v_role_id
  FROM public.crm_roles
  WHERE org_id = _org_id AND is_super_admin = true
  LIMIT 1;

  IF v_role_id IS NULL THEN
    INSERT INTO public.crm_roles (org_id, name, color, icon, is_super_admin)
    VALUES (_org_id, 'Super Admin', '#1D4ED8', 'Crown', true)
    RETURNING id INTO v_role_id;
  END IF;

  FOR i IN 1..array_length(v_modules_actions, 1) LOOP
    v_module := v_modules_actions[i][1];
    v_action := v_modules_actions[i][2];

    INSERT INTO public.crm_permissions (role_id, module, action, allowed)
    VALUES (v_role_id, v_module, v_action, true)
    ON CONFLICT (role_id, module, action) DO NOTHING;
  END LOOP;

  RETURN v_role_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- P1-9. Trigger: auto-seed Super Admin on new organization
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_organization_crm_seed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_crm_super_admin_for_org(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_crm_super_admin ON public.organizations;
CREATE TRIGGER trigger_seed_crm_super_admin
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization_crm_seed();

-- Backfill for existing organizations
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_crm_super_admin_for_org(r.id);
  END LOOP;
END;
$$;


-- ============================================================================
-- ░░░░░░░░░░░░░░░░░░  PHASE 2: ATTENDANCE & GEO LOCATION  ░░░░░░░░░░░░░░░░░░
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P2-1. Table: public.crm_geolocations
--   Stores authorized company sites, branches, and job-site perimeters.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_geolocations (
  id             UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID             NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name           TEXT             NOT NULL,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  radius_meters  INTEGER          NOT NULL DEFAULT 150,
  is_active      BOOLEAN          NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_geolocations_org    ON public.crm_geolocations(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_active ON public.crm_geolocations(org_id, is_active);

-- ----------------------------------------------------------------------------
-- P2-2. Table: public.crm_attendance
--   One record per staff member per day. Captures GPS clock-in/out coordinates,
--   geofence verification result, work duration, and overtime minutes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_attendance (
  id                          UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                      UUID             NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id                    UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                        DATE             NOT NULL DEFAULT CURRENT_DATE,
  clock_in                    TIMESTAMPTZ,
  clock_out                   TIMESTAMPTZ,
  clock_in_latitude           DOUBLE PRECISION,
  clock_in_longitude          DOUBLE PRECISION,
  clock_in_accuracy           DOUBLE PRECISION,
  clock_out_latitude          DOUBLE PRECISION,
  clock_out_longitude         DOUBLE PRECISION,
  clock_out_accuracy          DOUBLE PRECISION,
  clock_in_location_id        UUID             REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  clock_out_location_id       UUID             REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  status                      TEXT             NOT NULL DEFAULT 'present'
                                CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
  verification_method         TEXT             NOT NULL DEFAULT 'geo_verified'
                                CHECK (verification_method IN ('geo_verified', 'manual', 'regularized')),
  is_within_geofence          BOOLEAN          NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes       INTEGER          NOT NULL DEFAULT 0,
  overtime_minutes            INTEGER          NOT NULL DEFAULT 0,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_date       ON public.crm_attendance(org_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_staff_date     ON public.crm_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_status         ON public.crm_attendance(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_in_loc   ON public.crm_attendance(clock_in_location_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_out_loc  ON public.crm_attendance(clock_out_location_id);

DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- P2-3. Table: public.crm_attendance_requests
--   Regularisation / manual correction requests submitted by staff.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id               UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id        UUID        REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  date                 DATE        NOT NULL,
  requested_clock_in   TIMESTAMPTZ,
  requested_clock_out  TIMESTAMPTZ,
  requested_status     TEXT        NOT NULL DEFAULT 'present'
                         CHECK (requested_status IN ('present', 'absent', 'half_day', 'on_leave')),
  reason               TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes       TEXT,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_org    ON public.crm_attendance_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_staff  ON public.crm_attendance_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_status ON public.crm_attendance_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_att    ON public.crm_attendance_requests(attendance_id);

DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- P2-4. Enable RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_geolocations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_requests  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- P2-5. RLS Policies: crm_geolocations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm geolocations"   ON public.crm_geolocations;
DROP POLICY IF EXISTS "Members can insert crm geolocations" ON public.crm_geolocations;
DROP POLICY IF EXISTS "Members can update crm geolocations" ON public.crm_geolocations;
DROP POLICY IF EXISTS "Members can delete crm geolocations" ON public.crm_geolocations;

CREATE POLICY "Members can view crm geolocations"
  ON public.crm_geolocations FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm geolocations"
  ON public.crm_geolocations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm geolocations"
  ON public.crm_geolocations FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm geolocations"
  ON public.crm_geolocations FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- P2-6. RLS Policies: crm_attendance
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance"   ON public.crm_attendance;
DROP POLICY IF EXISTS "Members can insert crm attendance" ON public.crm_attendance;
DROP POLICY IF EXISTS "Members can update crm attendance" ON public.crm_attendance;
DROP POLICY IF EXISTS "Members can delete crm attendance" ON public.crm_attendance;

CREATE POLICY "Members can view crm attendance"
  ON public.crm_attendance FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm attendance"
  ON public.crm_attendance FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm attendance"
  ON public.crm_attendance FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm attendance"
  ON public.crm_attendance FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- P2-7. RLS Policies: crm_attendance_requests
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance requests"   ON public.crm_attendance_requests;
DROP POLICY IF EXISTS "Members can insert crm attendance requests" ON public.crm_attendance_requests;
DROP POLICY IF EXISTS "Members can update crm attendance requests" ON public.crm_attendance_requests;
DROP POLICY IF EXISTS "Members can delete crm attendance requests" ON public.crm_attendance_requests;

CREATE POLICY "Members can view crm attendance requests"
  ON public.crm_attendance_requests FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm attendance requests"
  ON public.crm_attendance_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm attendance requests"
  ON public.crm_attendance_requests FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm attendance requests"
  ON public.crm_attendance_requests FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));


-- ============================================================================
-- ░░░░░░░░░░░░░░░  PHASE 3: SALARY MANAGEMENT & PAYROLL ENGINE  ░░░░░░░░░░░░
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P3-1. Table: public.crm_salary_profiles
--   One record per staff member per organization.
--   Defines base compensation, statutory deduction rates, and leave quota.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_salary_profiles (
  id                     UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                 UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id               UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salary_type            TEXT           NOT NULL DEFAULT 'monthly'
                           CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  base_amount            NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  currency               TEXT           NOT NULL DEFAULT 'INR',
  allowed_leaves_per_month INTEGER      NOT NULL DEFAULT 2,
  hourly_overtime_rate   NUMERIC(10,2)  DEFAULT 0.00,
  pf_deduction_percent   NUMERIC(5,2)   DEFAULT 0.00,
  esi_deduction_percent  NUMERIC(5,2)   DEFAULT 0.00,
  is_active              BOOLEAN        NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org    ON public.crm_salary_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_staff  ON public.crm_salary_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_active ON public.crm_salary_profiles(org_id, is_active);

DROP TRIGGER IF EXISTS update_crm_salary_profiles_updated_at ON public.crm_salary_profiles;
CREATE TRIGGER update_crm_salary_profiles_updated_at
  BEFORE UPDATE ON public.crm_salary_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- P3-2. Table: public.crm_payroll_runs
--   Tracks the lifecycle of each monthly payroll execution per organization.
--   status: draft → locked → disbursed
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_payroll_runs (
  id           UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month_year   TEXT           NOT NULL,   -- format: 'YYYY-MM'
  status       TEXT           NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'locked', 'disbursed')),
  total_payout NUMERIC(14,2)  DEFAULT 0.00,
  staff_count  INTEGER        DEFAULT 0,
  locked_by    UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at    TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_org_month  ON public.crm_payroll_runs(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_status     ON public.crm_payroll_runs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_locked_by  ON public.crm_payroll_runs(locked_by);

DROP TRIGGER IF EXISTS update_crm_payroll_runs_updated_at ON public.crm_payroll_runs;
CREATE TRIGGER update_crm_payroll_runs_updated_at
  BEFORE UPDATE ON public.crm_payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- P3-3. Table: public.crm_payslips
--   Individual payslip record per staff per month, linked to a payroll run.
--   Stores a full snapshot of the salary profile at calculation time (JSONB).
--
--   Net salary formula:
--     net = (base_amount - lop_deduction) + overtime_amount + bonus_amount
--           - pf_deduction - esi_deduction - advance_deduction
--     net is always clamped to 0 (never negative).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_payslips (
  id                       UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                   UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_run_id           UUID           NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE,
  staff_id                 UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year               TEXT           NOT NULL,
  salary_profile_snapshot  JSONB          NOT NULL,  -- snapshot at run-time
  working_days_in_month    INTEGER        NOT NULL,
  present_days             INTEGER        NOT NULL DEFAULT 0,
  absent_days              INTEGER        NOT NULL DEFAULT 0,
  half_days                INTEGER        NOT NULL DEFAULT 0,
  lop_days                 NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
  overtime_minutes         INTEGER        NOT NULL DEFAULT 0,
  gross_salary             NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  lop_deduction            NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  overtime_amount          NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  pf_deduction             NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  esi_deduction            NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  advance_deduction        NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  bonus_amount             NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  net_salary               NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
  payment_status           TEXT           NOT NULL DEFAULT 'pending'
                             CHECK (payment_status IN ('pending', 'paid', 'partial')),
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_crm_payslips_org             ON public.crm_payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_payroll_run     ON public.crm_payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_staff_month     ON public.crm_payslips(staff_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_payment_status  ON public.crm_payslips(org_id, payment_status);

DROP TRIGGER IF EXISTS update_crm_payslips_updated_at ON public.crm_payslips;
CREATE TRIGGER update_crm_payslips_updated_at
  BEFORE UPDATE ON public.crm_payslips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- P3-4. Table: public.crm_salary_adjustments
--   Ledger for advances, bonuses, disciplinary deductions, and loan repayments.
--   Approved entries are automatically included in the next payroll run.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_salary_adjustments (
  id            UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id      UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT           NOT NULL
                  CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment')),
  amount        NUMERIC(12,2)  NOT NULL,
  description   TEXT,
  month_year    TEXT,           -- NULL = deduct in the very next payroll run
  status        TEXT           NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'deducted', 'rejected')),
  requested_by  UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by   UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_org    ON public.crm_salary_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_staff  ON public.crm_salary_adjustments(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_status ON public.crm_salary_adjustments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_month  ON public.crm_salary_adjustments(org_id, month_year);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_type   ON public.crm_salary_adjustments(org_id, type);

-- ----------------------------------------------------------------------------
-- P3-5. Enable RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_salary_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payroll_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payslips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_salary_adjustments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- P3-6. RLS Policies: crm_salary_profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm salary profiles"   ON public.crm_salary_profiles;
DROP POLICY IF EXISTS "Members can insert crm salary profiles" ON public.crm_salary_profiles;
DROP POLICY IF EXISTS "Members can update crm salary profiles" ON public.crm_salary_profiles;
DROP POLICY IF EXISTS "Members can delete crm salary profiles" ON public.crm_salary_profiles;

CREATE POLICY "Members can view crm salary profiles"
  ON public.crm_salary_profiles FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm salary profiles"
  ON public.crm_salary_profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm salary profiles"
  ON public.crm_salary_profiles FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm salary profiles"
  ON public.crm_salary_profiles FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- P3-7. RLS Policies: crm_payroll_runs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm payroll runs"   ON public.crm_payroll_runs;
DROP POLICY IF EXISTS "Members can insert crm payroll runs" ON public.crm_payroll_runs;
DROP POLICY IF EXISTS "Members can update crm payroll runs" ON public.crm_payroll_runs;
DROP POLICY IF EXISTS "Members can delete crm payroll runs" ON public.crm_payroll_runs;

CREATE POLICY "Members can view crm payroll runs"
  ON public.crm_payroll_runs FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm payroll runs"
  ON public.crm_payroll_runs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm payroll runs"
  ON public.crm_payroll_runs FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm payroll runs"
  ON public.crm_payroll_runs FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- P3-8. RLS Policies: crm_payslips
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm payslips"   ON public.crm_payslips;
DROP POLICY IF EXISTS "Members can insert crm payslips" ON public.crm_payslips;
DROP POLICY IF EXISTS "Members can update crm payslips" ON public.crm_payslips;
DROP POLICY IF EXISTS "Members can delete crm payslips" ON public.crm_payslips;

CREATE POLICY "Members can view crm payslips"
  ON public.crm_payslips FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm payslips"
  ON public.crm_payslips FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm payslips"
  ON public.crm_payslips FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm payslips"
  ON public.crm_payslips FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- P3-9. RLS Policies: crm_salary_adjustments
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm salary adjustments"   ON public.crm_salary_adjustments;
DROP POLICY IF EXISTS "Members can insert crm salary adjustments" ON public.crm_salary_adjustments;
DROP POLICY IF EXISTS "Members can update crm salary adjustments" ON public.crm_salary_adjustments;
DROP POLICY IF EXISTS "Members can delete crm salary adjustments" ON public.crm_salary_adjustments;

CREATE POLICY "Members can view crm salary adjustments"
  ON public.crm_salary_adjustments FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm salary adjustments"
  ON public.crm_salary_adjustments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm salary adjustments"
  ON public.crm_salary_adjustments FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can delete crm salary adjustments"
  ON public.crm_salary_adjustments FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));


COMMIT;
