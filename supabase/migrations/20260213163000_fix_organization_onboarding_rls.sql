-- Ensure onboarding can create an organization + owner membership safely.

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members can view memberships" ON public.organization_memberships;
CREATE POLICY "Members can view memberships"
ON public.organization_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_org_access(organization_id));

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

  SELECT om.organization_id
  INTO v_org_id
  FROM public.organization_memberships om
  WHERE om.user_id = auth.uid()
  ORDER BY om.created_at DESC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      business_type,
      address,
      phone,
      email,
      gstin,
      pan,
      tax_rate,
      invoice_prefix,
      logo_url
    )
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

REVOKE ALL ON FUNCTION public.bootstrap_organization(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.bootstrap_organization(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text
) TO authenticated;
