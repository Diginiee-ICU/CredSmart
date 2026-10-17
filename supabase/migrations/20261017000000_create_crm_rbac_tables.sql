BEGIN;

-- ============================================================================
-- Migration: 20261017000000_create_crm_rbac_tables.sql
-- Description: Custom Configurable Role-Based Access Control (RBAC) System
-- Tables: public.crm_roles, public.crm_permissions, public.crm_staff_roles
-- Automatic Seeding: Super Admin role with 14 module/action permissions
-- ============================================================================

-- 1. Create crm_roles Table
CREATE TABLE IF NOT EXISTS public.crm_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1D4ED8',
  icon TEXT NOT NULL DEFAULT 'User',
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_roles_org ON public.crm_roles(org_id);

-- 2. Create crm_permissions Table
CREATE TABLE IF NOT EXISTS public.crm_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_crm_permissions_role ON public.crm_permissions(role_id);

-- 3. Create crm_staff_roles Table (assigns auth users to CRM roles)
CREATE TABLE IF NOT EXISTS public.crm_staff_roles (
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_staff ON public.crm_staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_role ON public.crm_staff_roles(role_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_staff_roles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for crm_roles
DROP POLICY IF EXISTS "Organization members can view crm roles" ON public.crm_roles;
CREATE POLICY "Organization members can view crm roles"
  ON public.crm_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Owners and managers can insert crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can insert crm roles"
  ON public.crm_roles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

DROP POLICY IF EXISTS "Owners and managers can update crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can update crm roles"
  ON public.crm_roles FOR UPDATE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

DROP POLICY IF EXISTS "Owners and managers can delete crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can delete crm roles"
  ON public.crm_roles FOR DELETE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

-- 6. RLS Policies for crm_permissions
DROP POLICY IF EXISTS "Organization members can view crm permissions" ON public.crm_permissions;
CREATE POLICY "Organization members can view crm permissions"
  ON public.crm_permissions FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id
        AND has_org_access(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm permissions insert" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions insert"
  ON public.crm_permissions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm permissions update" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions update"
  ON public.crm_permissions FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm permissions delete" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions delete"
  ON public.crm_permissions FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_permissions.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

-- 7. RLS Policies for crm_staff_roles
DROP POLICY IF EXISTS "Organization members can view crm staff roles" ON public.crm_staff_roles;
CREATE POLICY "Organization members can view crm staff roles"
  ON public.crm_staff_roles FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id
        AND has_org_access(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles insert" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles insert"
  ON public.crm_staff_roles FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles update" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles update"
  ON public.crm_staff_roles FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles delete" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles delete"
  ON public.crm_staff_roles FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.crm_roles r
      WHERE r.id = crm_staff_roles.role_id
        AND is_org_owner_or_manager(r.org_id)
    )
  );

-- 8. Stored Procedure: seed_crm_super_admin_for_org
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
  -- Look for existing super_admin role for this organization
  SELECT id INTO v_role_id
  FROM public.crm_roles
  WHERE org_id = _org_id AND is_super_admin = true
  LIMIT 1;

  IF v_role_id IS NULL THEN
    INSERT INTO public.crm_roles (org_id, name, color, icon, is_super_admin)
    VALUES (_org_id, 'Super Admin', '#1D4ED8', 'Crown', true)
    RETURNING id INTO v_role_id;
  END IF;

  -- Populate all 14 permissions across 7 modules
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

-- 9. Trigger for New Organizations
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

-- 10. Seed Super Admin for All Existing Organizations
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
