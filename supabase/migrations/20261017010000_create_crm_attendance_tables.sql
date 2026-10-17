BEGIN;

-- ============================================================================
-- Migration: 20261017010000_create_crm_attendance_tables.sql
-- Description: CRM Phase 2: Attendance & Geo Location Attendance Engine
-- Tables:
--   1. public.crm_geolocations
--   2. public.crm_attendance
--   3. public.crm_attendance_requests
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.crm_geolocations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_geolocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_geolocations_org ON public.crm_geolocations(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_active ON public.crm_geolocations(org_id, is_active);

-- ----------------------------------------------------------------------------
-- 2. Table: public.crm_attendance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  clock_in_latitude DOUBLE PRECISION,
  clock_in_longitude DOUBLE PRECISION,
  clock_in_accuracy DOUBLE PRECISION,
  clock_out_latitude DOUBLE PRECISION,
  clock_out_longitude DOUBLE PRECISION,
  clock_out_accuracy DOUBLE PRECISION,
  clock_in_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  clock_out_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
  verification_method TEXT NOT NULL DEFAULT 'geo_verified' CHECK (verification_method IN ('geo_verified', 'manual', 'regularized')),
  is_within_geofence BOOLEAN NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_date ON public.crm_attendance(org_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_staff_date ON public.crm_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_status ON public.crm_attendance(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_in_loc ON public.crm_attendance(clock_in_location_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_out_loc ON public.crm_attendance(clock_out_location_id);

-- Attach updated_at trigger to crm_attendance
DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Table: public.crm_attendance_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  requested_status TEXT NOT NULL DEFAULT 'present' CHECK (requested_status IN ('present', 'absent', 'half_day', 'on_leave')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_org ON public.crm_attendance_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_staff ON public.crm_attendance_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_status ON public.crm_attendance_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_att ON public.crm_attendance_requests(attendance_id);

-- Attach updated_at trigger to crm_attendance_requests
DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_geolocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_requests ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. RLS Policies: public.crm_geolocations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can view crm geolocations"
  ON public.crm_geolocations FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can insert crm geolocations"
  ON public.crm_geolocations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can update crm geolocations"
  ON public.crm_geolocations FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can delete crm geolocations"
  ON public.crm_geolocations FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 6. RLS Policies: public.crm_attendance
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can view crm attendance"
  ON public.crm_attendance FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can insert crm attendance"
  ON public.crm_attendance FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can update crm attendance"
  ON public.crm_attendance FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can delete crm attendance"
  ON public.crm_attendance FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 7. RLS Policies: public.crm_attendance_requests
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can view crm attendance requests"
  ON public.crm_attendance_requests FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can insert crm attendance requests"
  ON public.crm_attendance_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can update crm attendance requests"
  ON public.crm_attendance_requests FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can delete crm attendance requests"
  ON public.crm_attendance_requests FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

COMMIT;
