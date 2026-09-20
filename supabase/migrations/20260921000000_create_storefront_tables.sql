BEGIN;

-- 1. Create Storefront Settings Table
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

-- 2. Create Storefront Orders Table (tracks orders placed from online catalogue)
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

-- 3. Enable RLS
ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Storefront Settings
DROP POLICY IF EXISTS "Public can view enabled storefronts" ON public.storefront_settings;
CREATE POLICY "Public can view enabled storefronts"
  ON public.storefront_settings FOR SELECT
  USING (is_enabled = true OR (auth.role() = 'authenticated' AND has_org_access(organization_id)));

DROP POLICY IF EXISTS "Owners/managers can insert storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can insert storefront settings"
  ON public.storefront_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));

DROP POLICY IF EXISTS "Owners/managers can update storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can update storefront settings"
  ON public.storefront_settings FOR UPDATE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));

DROP POLICY IF EXISTS "Owners/managers can delete storefront settings" ON public.storefront_settings;
CREATE POLICY "Owners/managers can delete storefront settings"
  ON public.storefront_settings FOR DELETE
  USING (auth.role() = 'authenticated' AND is_org_owner_or_manager(organization_id));

-- 5. RLS Policies for Storefront Orders
DROP POLICY IF EXISTS "Public can insert storefront orders" ON public.storefront_orders;
CREATE POLICY "Public can insert storefront orders"
  ON public.storefront_orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Organization members can view storefront orders" ON public.storefront_orders;
CREATE POLICY "Organization members can view storefront orders"
  ON public.storefront_orders FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(organization_id));

DROP POLICY IF EXISTS "Organization members can update storefront orders" ON public.storefront_orders;
CREATE POLICY "Organization members can update storefront orders"
  ON public.storefront_orders FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(organization_id));

-- 6. Trigger for updated_at
CREATE TRIGGER update_storefront_settings_updated_at
  BEFORE UPDATE ON public.storefront_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_storefront_orders_updated_at
  BEFORE UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. Secure Public RPC: get_public_storefront
CREATE OR REPLACE FUNCTION public.get_public_storefront(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_products JSONB;
BEGIN
  -- Retrieve enabled storefront by slug
  SELECT * INTO v_settings
  FROM public.storefront_settings
  WHERE slug = LOWER(TRIM(p_slug)) AND is_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Aggregate published products with public pricing & batch stock
  SELECT COALESCE(jsonb_agg(prod_row), '[]'::jsonb) INTO v_products
  FROM (
    SELECT
      p.id,
      p.name,
      p.barcode,
      p.sku,
      p.category,
      p.brand,
      COALESCE(p.tags->>'image_url', p.tags->>'imageUrl', '') AS image_url,
      COALESCE(p.tags->>'unit', 'PCS') AS unit,
      COALESCE((p.tags->>'is_featured')::boolean, false) AS is_featured,
      COALESCE((p.tags->>'selling_price')::numeric, pb.mrp, 0) AS selling_price,
      COALESCE((p.tags->>'mrp')::numeric, pb.mrp, 0) AS mrp,
      COALESCE(pb.total_stock, 0) AS current_stock,
      p.created_at
    FROM public.products p
    LEFT JOIN (
      SELECT
        product_id,
        MAX(mrp) AS mrp,
        SUM(stock) AS total_stock
      FROM public.product_batches
      GROUP BY product_id
    ) pb ON pb.product_id = p.id
    WHERE p.organization_id = v_settings.organization_id
      AND (
        (p.tags->>'is_in_catalogue') IS NULL
        OR (p.tags->>'is_in_catalogue')::boolean = true
        OR (p.tags->>'show_in_catalogue')::boolean = true
      )
    ORDER BY is_featured DESC, p.name ASC
  ) prod_row;

  RETURN jsonb_build_object(
    'store', to_jsonb(v_settings),
    'products', v_products
  );
END;
$$;

COMMIT;
