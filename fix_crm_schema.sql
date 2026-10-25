-- ============================================================================
-- CredSmart CRM Database Alignment & Schema Fix
-- Run on Ubuntu PostgreSQL: docker exec -i postgres-db psql -U postgres -d app_db < fix_crm_schema.sql
-- ============================================================================

-- 1. Memberships status column and organization alignment
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.org_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.org_memberships ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS org_id UUID;
UPDATE public.organization_memberships SET status = 'active' WHERE status IS NULL;
UPDATE public.org_memberships SET status = 'active' WHERE status IS NULL;
UPDATE public.org_memberships SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE public.organization_memberships SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;

-- 2. CRM Roles Table
CREATE TABLE IF NOT EXISTS public.crm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT '#1D4ED8',
  icon VARCHAR(50) DEFAULT 'Shield',
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crm_roles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.crm_roles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.crm_roles ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT '#1D4ED8';
ALTER TABLE public.crm_roles ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Shield';
ALTER TABLE public.crm_roles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
UPDATE public.crm_roles SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE public.crm_roles SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

-- 3. CRM Permissions Table
CREATE TABLE IF NOT EXISTS public.crm_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)
);

-- 4. CRM Role Permissions (Legacy/Alternative string mapping)
CREATE TABLE IF NOT EXISTS public.crm_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_crm_role_permissions_role_perm UNIQUE (role_id, permission)
);

-- 5. CRM Staff Roles (Junction table)
CREATE TABLE IF NOT EXISTS public.crm_staff_roles (
  staff_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (staff_id, role_id)
);

-- 6. CRM Staff Assignments
CREATE TABLE IF NOT EXISTS public.crm_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  user_id UUID NOT NULL,
  staff_id UUID,
  role_id UUID REFERENCES public.crm_roles(id) ON DELETE SET NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS staff_id UUID;
UPDATE public.crm_staff_assignments SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE public.crm_staff_assignments SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE public.crm_staff_assignments SET user_id = staff_id WHERE user_id IS NULL AND staff_id IS NOT NULL;
UPDATE public.crm_staff_assignments SET staff_id = user_id WHERE staff_id IS NULL AND user_id IS NOT NULL;

-- Unique constraint for ON CONFLICT (user_id, org_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_staff_assignments_user_org 
  ON public.crm_staff_assignments(user_id, org_id);

-- 7. CRM Broadcasts Table
CREATE TABLE IF NOT EXISTS public.crm_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crm_broadcasts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 7b. CRM Meetings Table
CREATE TABLE IF NOT EXISTS public.crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  agenda TEXT DEFAULT '',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time VARCHAR(50) DEFAULT '10:00 AM',
  duration_minutes INTEGER DEFAULT 30,
  host_name VARCHAR(255) DEFAULT 'Host',
  room_code VARCHAR(100) DEFAULT 'room-01',
  attendees_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'upcoming',
  department VARCHAR(100) DEFAULT 'General',
  created_by UUID,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.crm_meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_crm_meetings_org_date ON public.crm_meetings(org_id, scheduled_date);

-- 8. CRM Attendance Table
CREATE TABLE IF NOT EXISTS public.crm_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  user_id UUID,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Staff Tasks Table & Verification Columns
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  assigned_to UUID,
  assigned_by UUID,
  created_by UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'normal',
  requires_proof BOOLEAN DEFAULT FALSE,
  proof_required BOOLEAN DEFAULT FALSE,
  proof_notes TEXT,
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  review_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_notes TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS review_feedback TEXT;

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_crm_roles_org_id ON public.crm_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_permissions_role_id ON public.crm_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_org_user ON public.crm_staff_assignments(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_status ON public.staff_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_broadcasts_org_active ON public.crm_broadcasts(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_date ON public.crm_attendance(org_id, date);

-- 11. CRM Geolocations Table
CREATE TABLE IF NOT EXISTS public.crm_geolocations (
  id VARCHAR(100) PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  name VARCHAR(255) NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  radius_meters NUMERIC(10, 2) DEFAULT 150,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_org ON public.crm_geolocations(org_id);

-- 12. CRM Attendance Requests Table
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id VARCHAR(100) PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID,
  staff_id UUID,
  user_id UUID,
  attendance_id VARCHAR(100),
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  requested_status VARCHAR(50) DEFAULT 'present',
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewer_id UUID,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_org_status ON public.crm_attendance_requests(org_id, status);

