-- ============================================================================
-- CredSmart — Full Schema (Single Consolidated Migration)
-- Generated: 2026-10-18
--
-- This file combines all 24 individual migration files in chronological order.
-- It is fully idempotent where possible (IF NOT EXISTS, DROP IF EXISTS, etc.)
-- and wrapped in a single transaction.
--
-- Tables created (in order):
--   Core:        organizations, locations, profiles, organization_memberships
--   Inventory:   products, product_batches
--   Purchasing:  suppliers, purchase_invoices, purchase_invoice_items,
--                purchase_returns, purchase_return_items
--   Sales:       sales, sale_items, customers, credit_transactions,
--                sales_returns, sales_return_items
--   Ledger:      audit_logs, expenses
--   B2B Network: network_invoices, network_notifications
--   Storefront:  storefront_settings, storefront_orders
--   Tally Sync:  sync_pairing_tokens, staff_invitations
--   CRM RBAC:    crm_roles, crm_permissions, crm_staff_roles
--   CRM Attend:  crm_geolocations, crm_attendance, crm_attendance_requests
--   CRM Payroll: crm_salary_profiles, crm_payroll_runs, crm_payslips,
--                crm_salary_adjustments
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 0: PREREQUISITES (EXTENSIONS, SCHEMAS, ROLES, & STUB TABLES/FUNCTIONS)
-- Ensures full compatibility with both raw PostgreSQL and Supabase environments.
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Roles required by Supabase RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- 4. Auth Users Table (if not provided by Supabase GoTrue)
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Helper Auth Functions (if not provided by Supabase environment)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'authenticated');
$$;

-- 6. Storage Tables (if not provided by Supabase Storage)
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  public BOOLEAN DEFAULT false,
  avif_autodetection BOOLEAN DEFAULT false,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 1: ENUMS & CORE TABLES
-- Source: 20260211173918_*.sql
-- ============================================================================

-- Role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'store_owner', 'manager', 'cashier');
  END IF;
END $$;

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  pan TEXT DEFAULT '',
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  invoice_prefix TEXT DEFAULT 'INV',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organization memberships (role assignments)
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'cashier',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, role, location_id)
);
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: HELPER FUNCTIONS
-- Source: 20260211173918_*.sql
-- ============================================================================

-- Helper: check org membership
CREATE OR REPLACE FUNCTION public.has_org_access(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid() AND organization_id = _org_id
  );
$$;

-- Helper: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Helper: check org owner or manager
CREATE OR REPLACE FUNCTION public.is_org_owner_or_manager(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid() AND organization_id = _org_id
      AND role IN ('super_admin', 'store_owner', 'manager')
  );
$$;

-- updated_at generic trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: CORE TABLE RLS POLICIES & TRIGGERS
-- Source: 20260211173918_*.sql, 20260213163000_*.sql
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Organizations policies
DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT TO authenticated USING (public.has_org_access(id));
DROP POLICY IF EXISTS "Authenticated can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Owners/managers can update orgs" ON public.organizations;
CREATE POLICY "Owners/managers can update orgs" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(id));
DROP POLICY IF EXISTS "Owners/managers can delete orgs" ON public.organizations;
CREATE POLICY "Owners/managers can delete orgs" ON public.organizations FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(id));

-- Locations policies
DROP POLICY IF EXISTS "Members can view locations" ON public.locations;
CREATE POLICY "Members can view locations" ON public.locations FOR SELECT TO authenticated USING (public.has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create locations" ON public.locations;
CREATE POLICY "Owners/managers can create locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update locations" ON public.locations;
CREATE POLICY "Owners/managers can update locations" ON public.locations FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete locations" ON public.locations;
CREATE POLICY "Owners/managers can delete locations" ON public.locations FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

-- Memberships policies
DROP POLICY IF EXISTS "Members can view memberships" ON public.organization_memberships;
CREATE POLICY "Members can view memberships" ON public.organization_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create memberships" ON public.organization_memberships;
CREATE POLICY "Owners/managers can create memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update memberships" ON public.organization_memberships;
CREATE POLICY "Owners/managers can update memberships" ON public.organization_memberships FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete memberships" ON public.organization_memberships;
CREATE POLICY "Owners/managers can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

-- Updated_at triggers for core tables
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign store_owner when creating an org
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create organization';
  END IF;
  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'store_owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- Bootstrap organization function
CREATE OR REPLACE FUNCTION public.bootstrap_organization(
  p_name text,
  p_business_type text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_gstin text DEFAULT NULL,
  p_pan text DEFAULT NULL,
  p_tax_rate numeric DEFAULT NULL,
  p_invoice_prefix text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
RETURNS TABLE (organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to bootstrap organization';
  END IF;
  SELECT om.organization_id INTO v_org_id
  FROM public.organization_memberships om
  WHERE om.user_id = auth.uid()
  ORDER BY om.created_at DESC
  LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, business_type, address, phone, email, gstin, pan, tax_rate, invoice_prefix, logo_url)
    VALUES (
      COALESCE(NULLIF(trim(p_name), ''), 'My Store'),
      COALESCE(NULLIF(trim(p_business_type), ''), 'General Store'),
      COALESCE(p_address, ''),
      COALESCE(p_phone, ''),
      COALESCE(p_email, ''),
      COALESCE(p_gstin, ''),
      COALESCE(p_pan, ''),
      COALESCE(p_tax_rate, 18),
      COALESCE(NULLIF(trim(p_invoice_prefix), ''), 'INV'),
      COALESCE(p_logo_url, '')
    )
    RETURNING id INTO v_org_id;
    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (v_org_id, auth.uid(), 'store_owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN QUERY SELECT v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_organization(text,text,text,text,text,text,text,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_organization(text,text,text,text,text,text,text,numeric,text,text) TO authenticated;

-- ============================================================================
-- SECTION 4: STORAGE BUCKET
-- Source: 20260211175828_*.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'store-logos');

-- ============================================================================
-- SECTION 5: PRODUCTS & INVENTORY
-- Source: 20260211173918_*.sql, 20260212030950_*.sql
-- ============================================================================

-- Products (parent items)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  barcode TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  tags JSONB DEFAULT '{}',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view products" ON public.products;
CREATE POLICY "Members can view products" ON public.products FOR SELECT TO authenticated USING (public.has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create products" ON public.products;
CREATE POLICY "Owners/managers can create products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update products" ON public.products;
CREATE POLICY "Owners/managers can update products" ON public.products FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete products" ON public.products;
CREATE POLICY "Owners/managers can delete products" ON public.products FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Product batches (child items with pricing)
CREATE TABLE IF NOT EXISTS public.product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL DEFAULT '',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_product_batch ON public.product_batches(product_id, batch_number);

DROP POLICY IF EXISTS "Members can view batches" ON public.product_batches;
CREATE POLICY "Members can view batches" ON public.product_batches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_access(p.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can create batches" ON public.product_batches;
CREATE POLICY "Owners/managers can create batches" ON public.product_batches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can update batches" ON public.product_batches;
CREATE POLICY "Owners/managers can update batches" ON public.product_batches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can delete batches" ON public.product_batches;
CREATE POLICY "Owners/managers can delete batches" ON public.product_batches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));

DROP TRIGGER IF EXISTS update_product_batches_updated_at ON public.product_batches;
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON public.product_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- SECTION 6: STAFF INVITATIONS
-- Source: 20260211181230_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'cashier',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (organization_id, email, status)
);
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view invitations" ON public.staff_invitations;
CREATE POLICY "Members can view invitations" ON public.staff_invitations FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create invitations" ON public.staff_invitations;
CREATE POLICY "Owners/managers can create invitations" ON public.staff_invitations FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update invitations" ON public.staff_invitations;
CREATE POLICY "Owners/managers can update invitations" ON public.staff_invitations FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete invitations" ON public.staff_invitations;
CREATE POLICY "Owners/managers can delete invitations" ON public.staff_invitations FOR DELETE USING (is_org_owner_or_manager(organization_id));

CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, organization_id, role
    FROM public.staff_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (inv.organization_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.staff_invitations SET status = 'accepted' WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_accept_invitations ON auth.users;
CREATE TRIGGER on_auth_user_created_accept_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_acceptance();

-- ============================================================================
-- SECTION 7: SUPPLIERS & PURCHASE INVOICES
-- Source: 20260211182507_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  trade_name TEXT,
  pan TEXT,
  pincode TEXT,
  shipping_address TEXT,
  custom_fields JSONB,
  credit_limit NUMERIC,
  credit_period_days INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view suppliers" ON public.suppliers;
CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create suppliers" ON public.suppliers;
CREATE POLICY "Owners/managers can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update suppliers" ON public.suppliers;
CREATE POLICY "Owners/managers can update suppliers" ON public.suppliers FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete suppliers" ON public.suppliers;
CREATE POLICY "Owners/managers can delete suppliers" ON public.suppliers FOR DELETE USING (is_org_owner_or_manager(organization_id));

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers (organization_id);

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'partial')),
  notes TEXT DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Members can view purchase invoices" ON public.purchase_invoices FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Owners/managers can create purchase invoices" ON public.purchase_invoices FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Owners/managers can update purchase invoices" ON public.purchase_invoices FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete purchase invoices" ON public.purchase_invoices;
CREATE POLICY "Owners/managers can delete purchase invoices" ON public.purchase_invoices FOR DELETE USING (is_org_owner_or_manager(organization_id));

DROP TRIGGER IF EXISTS update_purchase_invoices_updated_at ON public.purchase_invoices;
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view purchase invoice items" ON public.purchase_invoice_items;
CREATE POLICY "Members can view purchase invoice items" ON public.purchase_invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND has_org_access(pi.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can create purchase invoice items" ON public.purchase_invoice_items;
CREATE POLICY "Owners/managers can create purchase invoice items" ON public.purchase_invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can update purchase invoice items" ON public.purchase_invoice_items;
CREATE POLICY "Owners/managers can update purchase invoice items" ON public.purchase_invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can delete purchase invoice items" ON public.purchase_invoice_items;
CREATE POLICY "Owners/managers can delete purchase invoice items" ON public.purchase_invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));

CREATE OR REPLACE FUNCTION public.handle_purchase_receive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    INSERT INTO public.product_batches (product_id, batch_number, cost_price, mrp, stock, expiry_date)
    SELECT pii.product_id, pii.batch_number, pii.cost_price, pii.mrp, pii.quantity, pii.expiry_date
    FROM public.purchase_invoice_items pii
    WHERE pii.purchase_invoice_id = NEW.id
    ON CONFLICT (product_id, batch_number) DO UPDATE
      SET stock = product_batches.stock + EXCLUDED.stock,
          cost_price = EXCLUDED.cost_price,
          mrp = EXCLUDED.mrp,
          expiry_date = EXCLUDED.expiry_date,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_purchase_receive ON public.purchase_invoices;
CREATE TRIGGER trigger_purchase_receive
  BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_receive();

-- ============================================================================
-- SECTION 8: PURCHASE RETURNS
-- Source: 20260211183012_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_invoice_id UUID REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  return_number TEXT NOT NULL DEFAULT '',
  reason TEXT DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view purchase returns" ON public.purchase_returns;
CREATE POLICY "Members can view purchase returns" ON public.purchase_returns FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create purchase returns" ON public.purchase_returns;
CREATE POLICY "Owners/managers can create purchase returns" ON public.purchase_returns FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update purchase returns" ON public.purchase_returns;
CREATE POLICY "Owners/managers can update purchase returns" ON public.purchase_returns FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete purchase returns" ON public.purchase_returns;
CREATE POLICY "Owners/managers can delete purchase returns" ON public.purchase_returns FOR DELETE USING (is_org_owner_or_manager(organization_id));

DROP TRIGGER IF EXISTS update_purchase_returns_updated_at ON public.purchase_returns;
CREATE TRIGGER update_purchase_returns_updated_at BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view return items" ON public.purchase_return_items;
CREATE POLICY "Members can view return items" ON public.purchase_return_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.purchase_returns pr WHERE pr.id = purchase_return_items.purchase_return_id AND has_org_access(pr.organization_id)));
DROP POLICY IF EXISTS "Owners/managers can create return items" ON public.purchase_return_items;
CREATE POLICY "Owners/managers can create return items" ON public.purchase_return_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_returns pr WHERE pr.id = purchase_return_items.purchase_return_id AND is_org_owner_or_manager(pr.organization_id)));

CREATE OR REPLACE FUNCTION public.handle_purchase_return_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.product_batches pb
    SET stock = GREATEST(pb.stock - pri.quantity, 0), updated_at = now()
    FROM public.purchase_return_items pri
    WHERE pri.purchase_return_id = NEW.id
      AND pb.product_id = pri.product_id
      AND pb.batch_number = pri.batch_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_purchase_return_complete ON public.purchase_returns;
CREATE TRIGGER trigger_purchase_return_complete
  BEFORE UPDATE ON public.purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_return_complete();

-- ============================================================================
-- SECTION 9: CUSTOMERS, SALES & CREDIT TRANSACTIONS
-- Source: 20260211182754_*.sql, 20260211184741_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  trade_name TEXT,
  pan TEXT,
  pincode TEXT,
  shipping_address TEXT,
  custom_fields JSONB,
  credit_limit NUMERIC,
  credit_period_days INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view customers" ON public.customers;
CREATE POLICY "Members can view customers" ON public.customers FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create customers" ON public.customers;
CREATE POLICY "Owners/managers can create customers" ON public.customers FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update customers" ON public.customers;
CREATE POLICY "Owners/managers can update customers" ON public.customers FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete customers" ON public.customers;
CREATE POLICY "Owners/managers can delete customers" ON public.customers FOR DELETE USING (is_org_owner_or_manager(organization_id));

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  customer_id UUID REFERENCES public.customers(id),
  invoice_number TEXT NOT NULL DEFAULT '',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  discount_label TEXT DEFAULT '',
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view sales" ON public.sales;
CREATE POLICY "Members can view sales" ON public.sales FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Members can create sales" ON public.sales;
CREATE POLICY "Members can create sales" ON public.sales FOR INSERT WITH CHECK (has_org_access(organization_id));

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  batch_id TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  mrp NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view sale items" ON public.sale_items;
CREATE POLICY "Members can view sale items" ON public.sale_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND has_org_access(s.organization_id)));
DROP POLICY IF EXISTS "Members can create sale items" ON public.sale_items;
CREATE POLICY "Members can create sale items" ON public.sale_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND has_org_access(s.organization_id)));

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
  party_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
  description TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view credit transactions" ON public.credit_transactions;
CREATE POLICY "Members can view credit transactions" ON public.credit_transactions FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners/managers can create credit transactions" ON public.credit_transactions;
CREATE POLICY "Owners/managers can create credit transactions" ON public.credit_transactions FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update credit transactions" ON public.credit_transactions;
CREATE POLICY "Owners/managers can update credit transactions" ON public.credit_transactions FOR UPDATE USING (is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete credit transactions" ON public.credit_transactions;
CREATE POLICY "Owners/managers can delete credit transactions" ON public.credit_transactions FOR DELETE USING (is_org_owner_or_manager(organization_id));

-- ============================================================================
-- SECTION 10: AUDIT LOGS & EXPENSES
-- Source: 20260212021448_*.sql, 20260830_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view audit logs" ON public.audit_logs;
CREATE POLICY "Members can view audit logs" ON public.audit_logs FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Members can create audit logs" ON public.audit_logs;
CREATE POLICY "Members can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (has_org_access(organization_id));

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs (user_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  expense_number TEXT,
  party_name TEXT DEFAULT 'General Expense Payee',
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  payment_method TEXT DEFAULT 'Cash',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

DROP POLICY IF EXISTS "Users can view expenses for their organization" ON public.expenses;
CREATE POLICY "Users can view expenses for their organization" ON public.expenses FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Users can create expenses for their organization" ON public.expenses;
CREATE POLICY "Users can create expenses for their organization" ON public.expenses FOR INSERT WITH CHECK (has_org_access(organization_id));
DROP POLICY IF EXISTS "Users can update expenses for their organization" ON public.expenses;
CREATE POLICY "Users can update expenses for their organization" ON public.expenses FOR UPDATE USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Users can delete expenses for their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses for their organization" ON public.expenses FOR DELETE USING (has_org_access(organization_id));

-- ============================================================================
-- SECTION 11: B2B NETWORK INVOICES & NOTIFICATIONS
-- Source: 20260827_*.sql, 20260920_*.sql, 20260922010000_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.network_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_org_name TEXT NOT NULL,
  sender_org_phone TEXT DEFAULT '',
  sender_org_email TEXT DEFAULT '',
  sender_org_gstin TEXT DEFAULT '',
  sender_org_address TEXT DEFAULT '',
  sender_user_id UUID,
  recipient_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  recipient_org_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  recipient_gstin TEXT DEFAULT '',
  recipient_address TEXT DEFAULT '',
  invoice_number TEXT NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'Credit',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  purchase_invoice_id UUID,
  purchase_invoice_number TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_network_invoices_sender ON public.network_invoices(sender_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient ON public.network_invoices(recipient_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_phone ON public.network_invoices(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_gstin ON public.network_invoices(recipient_gstin);
ALTER TABLE public.network_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender and recipient org members can view network invoices" ON public.network_invoices;
CREATE POLICY "Sender and recipient org members can view network invoices"
  ON public.network_invoices FOR SELECT
  USING (
    has_org_access(sender_org_id) OR
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id)) OR
    (
      EXISTS (
        SELECT 1 FROM public.organizations o
        JOIN public.organization_memberships m ON m.organization_id = o.id
        WHERE m.user_id = auth.uid()
          AND (
            (o.phone IS NOT NULL AND o.phone <> '' AND network_invoices.recipient_phone ILIKE '%' || RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) || '%') OR
            (o.gstin IS NOT NULL AND o.gstin <> '' AND UPPER(network_invoices.recipient_gstin) = UPPER(o.gstin)) OR
            (o.name IS NOT NULL AND o.name <> '' AND network_invoices.recipient_org_name ILIKE '%' || o.name || '%')
          )
      )
    )
  );

DROP POLICY IF EXISTS "Sender org members can create network invoices" ON public.network_invoices;
CREATE POLICY "Sender org members can create network invoices"
  ON public.network_invoices FOR INSERT
  WITH CHECK (has_org_access(sender_org_id));

DROP POLICY IF EXISTS "Sender and recipient org members can update network invoices" ON public.network_invoices;
CREATE POLICY "Sender and recipient org members can update network invoices"
  ON public.network_invoices FOR UPDATE
  USING (
    has_org_access(sender_org_id) OR
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id))
  );

CREATE TABLE IF NOT EXISTS public.network_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_user_id UUID,
  recipient_phone TEXT DEFAULT '',
  recipient_gstin TEXT DEFAULT '',
  recipient_org_name TEXT DEFAULT '',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  action_status TEXT NOT NULL DEFAULT 'pending' CHECK (action_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  network_invoice_id UUID REFERENCES public.network_invoices(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_network_notifications_recipient ON public.network_notifications(recipient_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_notifications_phone ON public.network_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_notifications_gstin ON public.network_notifications(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_notifications_org_name ON public.network_notifications(recipient_org_name);
ALTER TABLE public.network_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can view network notifications"
  ON public.network_notifications FOR SELECT
  USING (
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id)) OR
    (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()) OR
    (
      EXISTS (
        SELECT 1 FROM public.organizations o
        JOIN public.organization_memberships m ON m.organization_id = o.id
        WHERE m.user_id = auth.uid()
          AND (
            (o.phone IS NOT NULL AND o.phone <> '' AND network_notifications.recipient_phone ILIKE '%' || RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) || '%') OR
            (o.gstin IS NOT NULL AND o.gstin <> '' AND UPPER(network_notifications.recipient_gstin) = UPPER(o.gstin)) OR
            (o.name IS NOT NULL AND o.name <> '' AND network_notifications.recipient_org_name ILIKE '%' || o.name || '%')
          )
      )
    )
  );

DROP POLICY IF EXISTS "Organization members can create network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can create network notifications"
  ON public.network_notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Organization members can update network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can update network notifications"
  ON public.network_notifications FOR UPDATE
  USING (
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id)) OR
    (
      EXISTS (
        SELECT 1 FROM public.organizations o
        JOIN public.organization_memberships m ON m.organization_id = o.id
        WHERE m.user_id = auth.uid()
          AND (
            (o.phone IS NOT NULL AND o.phone <> '' AND network_notifications.recipient_phone ILIKE '%' || RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) || '%') OR
            (o.gstin IS NOT NULL AND o.gstin <> '' AND UPPER(network_notifications.recipient_gstin) = UPPER(o.gstin)) OR
            (o.name IS NOT NULL AND o.name <> '' AND network_notifications.recipient_org_name ILIKE '%' || o.name || '%')
          )
      )
    )
  );

-- ============================================================================
-- SECTION 12: STOREFRONT
-- Source: 20260921000000_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.storefront_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  store_name TEXT NOT NULL DEFAULT '',
  tagline TEXT DEFAULT '',
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  theme_color TEXT DEFAULT '#FF6A00',
  minimum_order_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_charges NUMERIC NOT NULL DEFAULT 0,
  free_delivery_above NUMERIC NOT NULL DEFAULT 0,
  enable_home_delivery BOOLEAN NOT NULL DEFAULT true,
  enable_store_pickup BOOLEAN NOT NULL DEFAULT true,
  custom_announcement TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_storefront_organization_id UNIQUE (organization_id),
  CONSTRAINT uq_storefront_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_storefront_settings_slug ON public.storefront_settings(slug);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_org ON public.storefront_settings(organization_id);

CREATE TABLE IF NOT EXISTS public.storefront_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT DEFAULT '',
  delivery_type TEXT NOT NULL DEFAULT 'home_delivery' CHECK (delivery_type IN ('home_delivery', 'store_pickup')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'direct')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_org_created ON public.storefront_orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON public.storefront_orders(status);

ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view enabled storefronts" ON public.storefront_settings;
CREATE POLICY "Public can view enabled storefronts" ON public.storefront_settings FOR SELECT
  USING (is_enabled = true OR (auth.role() = 'authenticated' AND has_org_access(organization_id)));
DROP POLICY IF EXISTS "Owners/managers can insert storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can insert storefront settings" ON public.storefront_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can update storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can update storefront settings" ON public.storefront_settings FOR UPDATE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners/managers can delete storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can delete storefront settings" ON public.storefront_settings FOR DELETE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));

DROP POLICY IF EXISTS "Public can insert storefront orders" ON public.storefront_orders;
CREATE POLICY "Public can insert storefront orders" ON public.storefront_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Organization members can view storefront orders" ON public.storefront_orders;
CREATE POLICY "Organization members can view storefront orders" ON public.storefront_orders FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(organization_id));
DROP POLICY IF EXISTS "Organization members can update storefront orders" ON public.storefront_orders;
CREATE POLICY "Organization members can update storefront orders" ON public.storefront_orders FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(organization_id));

DROP TRIGGER IF EXISTS update_storefront_settings_updated_at ON public.storefront_settings;
CREATE TRIGGER update_storefront_settings_updated_at
  BEFORE UPDATE ON public.storefront_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_storefront_orders_updated_at ON public.storefront_orders;
CREATE TRIGGER update_storefront_orders_updated_at
  BEFORE UPDATE ON public.storefront_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.get_public_storefront(p_slug TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_products JSONB;
BEGIN
  SELECT * INTO v_settings FROM public.storefront_settings
  WHERE slug = LOWER(TRIM(p_slug)) AND is_enabled = true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(prod_row), '[]'::jsonb) INTO v_products
  FROM (
    SELECT
      p.id, p.name, p.barcode, p.sku, p.category, p.brand,
      COALESCE(p.tags->>'image_url', p.tags->>'imageUrl', '') AS image_url,
      COALESCE(p.tags->>'unit', 'PCS') AS unit,
      COALESCE((p.tags->>'is_featured')::boolean, false) AS is_featured,
      COALESCE((p.tags->>'selling_price')::numeric, pb.mrp, 0) AS selling_price,
      COALESCE((p.tags->>'mrp')::numeric, pb.mrp, 0) AS mrp,
      COALESCE(pb.total_stock, 0) AS current_stock,
      p.created_at
    FROM public.products p
    LEFT JOIN (
      SELECT product_id, MAX(mrp) AS mrp, SUM(stock) AS total_stock
      FROM public.product_batches GROUP BY product_id
    ) pb ON pb.product_id = p.id
    WHERE p.organization_id = v_settings.organization_id
      AND (
        (p.tags->>'is_in_catalogue') IS NULL OR
        (p.tags->>'is_in_catalogue')::boolean = true OR
        (p.tags->>'show_in_catalogue')::boolean = true
      )
    ORDER BY is_featured DESC, p.name ASC
  ) prod_row;
  RETURN jsonb_build_object('store', to_jsonb(v_settings), 'products', v_products);
END;
$$;

-- ============================================================================
-- SECTION 13: SALES RETURNS
-- Source: 20260922000000_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_gstin TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  place_of_supply TEXT DEFAULT '27-Maharashtra',
  return_number TEXT NOT NULL DEFAULT '',
  original_invoice_number TEXT DEFAULT '',
  original_invoice_date DATE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT DEFAULT '',
  return_action TEXT NOT NULL DEFAULT 'return_to_stock' CHECK (return_action IN ('return_to_stock', 'scrap_damaged')),
  settlement_mode TEXT NOT NULL DEFAULT 'store_credit' CHECK (settlement_mode IN ('store_credit', 'cash_refund', 'upi_refund', 'bank_refund', 'unsettled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  round_off NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view sales returns" ON public.sales_returns;
CREATE POLICY "Members can view sales returns" ON public.sales_returns FOR SELECT USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Members can create sales returns" ON public.sales_returns;
CREATE POLICY "Members can create sales returns" ON public.sales_returns FOR INSERT WITH CHECK (has_org_access(organization_id));
DROP POLICY IF EXISTS "Members can update sales returns" ON public.sales_returns;
CREATE POLICY "Members can update sales returns" ON public.sales_returns FOR UPDATE USING (has_org_access(organization_id));
DROP POLICY IF EXISTS "Members can delete sales returns" ON public.sales_returns;
CREATE POLICY "Members can delete sales returns" ON public.sales_returns FOR DELETE USING (has_org_access(organization_id));

DROP TRIGGER IF EXISTS update_sales_returns_updated_at ON public.sales_returns;
CREATE TRIGGER update_sales_returns_updated_at
  BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  batch_number TEXT NOT NULL DEFAULT 'BATCH-01',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'PCS',
  alt_unit TEXT,
  alt_qty NUMERIC,
  alt_unit_conversion NUMERIC,
  rate NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  return_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view sales return items" ON public.sales_return_items;
CREATE POLICY "Members can view sales return items" ON public.sales_return_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sales_returns sr WHERE sr.id = sales_return_items.sales_return_id AND has_org_access(sr.organization_id)));
DROP POLICY IF EXISTS "Members can create sales return items" ON public.sales_return_items;
CREATE POLICY "Members can create sales return items" ON public.sales_return_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_returns sr WHERE sr.id = sales_return_items.sales_return_id AND has_org_access(sr.organization_id)));
DROP POLICY IF EXISTS "Members can update sales return items" ON public.sales_return_items;
CREATE POLICY "Members can update sales return items" ON public.sales_return_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.sales_returns sr WHERE sr.id = sales_return_items.sales_return_id AND has_org_access(sr.organization_id)));
DROP POLICY IF EXISTS "Members can delete sales return items" ON public.sales_return_items;
CREATE POLICY "Members can delete sales return items" ON public.sales_return_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sales_returns sr WHERE sr.id = sales_return_items.sales_return_id AND has_org_access(sr.organization_id)));

-- ============================================================================
-- SECTION 14: TALLY SYNC PAIRING TOKENS
-- Source: 20260922020000_*.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_pairing_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sync_pairing_tokens_org_idx ON public.sync_pairing_tokens(organization_id);
ALTER TABLE public.sync_pairing_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Members can view own sync tokens" ON public.sync_pairing_tokens FOR SELECT
  USING (user_id = auth.uid() AND has_org_access(organization_id));
DROP POLICY IF EXISTS "Owners and managers can create sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can create sync tokens" ON public.sync_pairing_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners and managers can update sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can update sync tokens" ON public.sync_pairing_tokens FOR UPDATE
  USING (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));
DROP POLICY IF EXISTS "Owners and managers can delete sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can delete sync tokens" ON public.sync_pairing_tokens FOR DELETE
  USING (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));

-- ============================================================================
-- SECTION 15: CRM RBAC — ROLES, PERMISSIONS, STAFF ROLES
-- Source: 20261017000000_*.sql
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS public.crm_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)
);
CREATE INDEX IF NOT EXISTS idx_crm_permissions_role ON public.crm_permissions(role_id);

CREATE TABLE IF NOT EXISTS public.crm_staff_roles (
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_staff ON public.crm_staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_roles_role ON public.crm_staff_roles(role_id);

ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view crm roles" ON public.crm_roles;
CREATE POLICY "Organization members can view crm roles" ON public.crm_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Owners and managers can insert crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can insert crm roles" ON public.crm_roles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));
DROP POLICY IF EXISTS "Owners and managers can update crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can update crm roles" ON public.crm_roles FOR UPDATE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));
DROP POLICY IF EXISTS "Owners and managers can delete crm roles" ON public.crm_roles;
CREATE POLICY "Owners and managers can delete crm roles" ON public.crm_roles FOR DELETE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(org_id));

DROP POLICY IF EXISTS "Organization members can view crm permissions" ON public.crm_permissions;
CREATE POLICY "Organization members can view crm permissions" ON public.crm_permissions FOR SELECT
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_permissions.role_id AND has_org_access(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions insert" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions insert" ON public.crm_permissions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions update" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions update" ON public.crm_permissions FOR UPDATE
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm permissions delete" ON public.crm_permissions;
CREATE POLICY "Owners and managers can manage crm permissions delete" ON public.crm_permissions FOR DELETE
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_permissions.role_id AND is_org_owner_or_manager(r.org_id)));

DROP POLICY IF EXISTS "Organization members can view crm staff roles" ON public.crm_staff_roles;
CREATE POLICY "Organization members can view crm staff roles" ON public.crm_staff_roles FOR SELECT
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_staff_roles.role_id AND has_org_access(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles insert" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles insert" ON public.crm_staff_roles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles update" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles update" ON public.crm_staff_roles FOR UPDATE
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)));
DROP POLICY IF EXISTS "Owners and managers can manage crm staff roles delete" ON public.crm_staff_roles;
CREATE POLICY "Owners and managers can manage crm staff roles delete" ON public.crm_staff_roles FOR DELETE
  USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.crm_roles r WHERE r.id = crm_staff_roles.role_id AND is_org_owner_or_manager(r.org_id)));

CREATE OR REPLACE FUNCTION public.seed_crm_super_admin_for_org(_org_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_module TEXT;
  v_action TEXT;
  v_modules_actions TEXT[][] := ARRAY[
    ARRAY['attendance', 'view'], ARRAY['attendance', 'edit'],
    ARRAY['salary', 'view'],     ARRAY['salary', 'edit'],
    ARRAY['tasks', 'view'],      ARRAY['tasks', 'create'],   ARRAY['tasks', 'approve'],
    ARRAY['meetings', 'view'],   ARRAY['meetings', 'create'],
    ARRAY['broadcasts', 'view'], ARRAY['broadcasts', 'send'],
    ARRAY['ai_assistant', 'access'],
    ARRAY['support', 'view'],    ARRAY['support', 'manage']
  ];
  i INT;
BEGIN
  SELECT id INTO v_role_id FROM public.crm_roles WHERE org_id = _org_id AND is_super_admin = true LIMIT 1;
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

CREATE OR REPLACE FUNCTION public.handle_new_organization_crm_seed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

-- Seed Super Admin for all existing organizations
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_crm_super_admin_for_org(r.id);
  END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 16: CRM ATTENDANCE & GEO LOCATION
-- Source: 20261017010000_*.sql
-- ============================================================================

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

DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.crm_geolocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can view crm geolocations" ON public.crm_geolocations FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can insert crm geolocations" ON public.crm_geolocations FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can update crm geolocations" ON public.crm_geolocations FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can delete crm geolocations" ON public.crm_geolocations FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can view crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can view crm attendance" ON public.crm_attendance FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can insert crm attendance" ON public.crm_attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can update crm attendance" ON public.crm_attendance FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can delete crm attendance" ON public.crm_attendance FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can view crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can view crm attendance requests" ON public.crm_attendance_requests FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can insert crm attendance requests" ON public.crm_attendance_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can update crm attendance requests" ON public.crm_attendance_requests FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can delete crm attendance requests" ON public.crm_attendance_requests FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ============================================================================
-- SECTION 17: CRM SALARY & PAYROLL
-- Source: 20261017020000_*.sql
-- ============================================================================

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

DROP TRIGGER IF EXISTS update_crm_salary_profiles_updated_at ON public.crm_salary_profiles;
CREATE TRIGGER update_crm_salary_profiles_updated_at
  BEFORE UPDATE ON public.crm_salary_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS update_crm_payroll_runs_updated_at ON public.crm_payroll_runs;
CREATE TRIGGER update_crm_payroll_runs_updated_at
  BEFORE UPDATE ON public.crm_payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

DROP TRIGGER IF EXISTS update_crm_payslips_updated_at ON public.crm_payslips;
CREATE TRIGGER update_crm_payslips_updated_at
  BEFORE UPDATE ON public.crm_payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

ALTER TABLE public.crm_salary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_salary_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can view crm salary profiles" ON public.crm_salary_profiles FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can insert crm salary profiles" ON public.crm_salary_profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can update crm salary profiles" ON public.crm_salary_profiles FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm salary profiles" ON public.crm_salary_profiles;
CREATE POLICY "Members can delete crm salary profiles" ON public.crm_salary_profiles FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can view crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can view crm payroll runs" ON public.crm_payroll_runs FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can insert crm payroll runs" ON public.crm_payroll_runs FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can update crm payroll runs" ON public.crm_payroll_runs FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm payroll runs" ON public.crm_payroll_runs;
CREATE POLICY "Members can delete crm payroll runs" ON public.crm_payroll_runs FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can view crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can view crm payslips" ON public.crm_payslips FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can insert crm payslips" ON public.crm_payslips FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can update crm payslips" ON public.crm_payslips FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm payslips" ON public.crm_payslips;
CREATE POLICY "Members can delete crm payslips" ON public.crm_payslips FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can view crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can view crm salary adjustments" ON public.crm_salary_adjustments FOR SELECT USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can insert crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can insert crm salary adjustments" ON public.crm_salary_adjustments FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can update crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can update crm salary adjustments" ON public.crm_salary_adjustments FOR UPDATE USING (auth.role() = 'authenticated' AND has_org_access(org_id));
DROP POLICY IF EXISTS "Members can delete crm salary adjustments" ON public.crm_salary_adjustments;
CREATE POLICY "Members can delete crm salary adjustments" ON public.crm_salary_adjustments FOR DELETE USING (auth.role() = 'authenticated' AND has_org_access(org_id));

COMMIT;
