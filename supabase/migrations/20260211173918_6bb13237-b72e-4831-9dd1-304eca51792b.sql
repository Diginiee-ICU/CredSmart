
-- Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'store_owner', 'manager', 'cashier');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Locations
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Organization memberships (role assignments)
CREATE TABLE public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'cashier',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, role, location_id)
);
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- Products (parent items)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  barcode TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT DEFAULT '',
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Product batches (child items with pricing)
CREATE TABLE public.product_batches (
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

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Organizations policies
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT TO authenticated USING (public.has_org_access(id));
CREATE POLICY "Authenticated can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners/managers can update orgs" ON public.organizations FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(id));
CREATE POLICY "Owners/managers can delete orgs" ON public.organizations FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(id));

-- Locations policies
CREATE POLICY "Members can view locations" ON public.locations FOR SELECT TO authenticated USING (public.has_org_access(organization_id));
CREATE POLICY "Owners/managers can create locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update locations" ON public.locations FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete locations" ON public.locations FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

-- Memberships policies
CREATE POLICY "Members can view memberships" ON public.organization_memberships FOR SELECT TO authenticated USING (public.has_org_access(organization_id));
CREATE POLICY "Owners/managers can create memberships" ON public.organization_memberships FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update memberships" ON public.organization_memberships FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete memberships" ON public.organization_memberships FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

-- Products policies
CREATE POLICY "Members can view products" ON public.products FOR SELECT TO authenticated USING (public.has_org_access(organization_id));
CREATE POLICY "Owners/managers can create products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update products" ON public.products FOR UPDATE TO authenticated USING (public.is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete products" ON public.products FOR DELETE TO authenticated USING (public.is_org_owner_or_manager(organization_id));

-- Product batches policies
CREATE POLICY "Members can view batches" ON public.product_batches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_org_access(p.organization_id)));
CREATE POLICY "Owners/managers can create batches" ON public.product_batches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));
CREATE POLICY "Owners/managers can update batches" ON public.product_batches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));
CREATE POLICY "Owners/managers can delete batches" ON public.product_batches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_org_owner_or_manager(p.organization_id)));

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
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

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON public.product_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
