BEGIN;

-- 1. Helper Function to Discover / Lookup Network Organizations for B2B Invoicing
-- Security definer allows searching registered merchant identities by phone, GSTIN, or name
-- across tenant boundaries without leaking sensitive financial records.
CREATE OR REPLACE FUNCTION public.lookup_network_organization(
  p_query TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_exclude_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  business_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.phone, o.email, o.gstin, o.address, o.business_type
  FROM public.organizations o
  WHERE (p_exclude_org_id IS NULL OR o.id <> p_exclude_org_id)
    AND (
      (p_gstin IS NOT NULL AND p_gstin <> '' AND UPPER(o.gstin) = UPPER(p_gstin))
      OR (p_phone IS NOT NULL AND p_phone <> '' AND RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g'), 10))
      OR (p_query IS NOT NULL AND LENGTH(TRIM(p_query)) >= 3 AND (o.name ILIKE '%' || TRIM(p_query) || '%' OR TRIM(p_query) ILIKE '%' || o.name || '%'))
    )
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_network_organization(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 2. Update network_notifications RLS Policies
-- Supports bidirectional name matching and standardized 10-digit phone matching
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
            (o.phone IS NOT NULL AND o.phone <> '' AND network_notifications.recipient_phone IS NOT NULL AND network_notifications.recipient_phone <> '' AND RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(network_notifications.recipient_phone, '[^0-9]', '', 'g'), 10)) OR
            (o.gstin IS NOT NULL AND o.gstin <> '' AND UPPER(network_notifications.recipient_gstin) = UPPER(o.gstin)) OR
            (o.name IS NOT NULL AND o.name <> '' AND network_notifications.recipient_org_name IS NOT NULL AND network_notifications.recipient_org_name <> '' AND (network_notifications.recipient_org_name ILIKE '%' || o.name || '%' OR o.name ILIKE '%' || network_notifications.recipient_org_name || '%'))
          )
      )
    )
  );

-- 3. Update network_invoices RLS Policies
-- Allows matching recipients to view invoices by ID, 10-digit phone, GSTIN, or bidirectional name matching
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
            (o.phone IS NOT NULL AND o.phone <> '' AND network_invoices.recipient_phone IS NOT NULL AND network_invoices.recipient_phone <> '' AND RIGHT(REGEXP_REPLACE(o.phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(network_invoices.recipient_phone, '[^0-9]', '', 'g'), 10)) OR
            (o.gstin IS NOT NULL AND o.gstin <> '' AND UPPER(network_invoices.recipient_gstin) = UPPER(o.gstin)) OR
            (o.name IS NOT NULL AND o.name <> '' AND network_invoices.recipient_org_name IS NOT NULL AND network_invoices.recipient_org_name <> '' AND (network_invoices.recipient_org_name ILIKE '%' || o.name || '%' OR o.name ILIKE '%' || network_invoices.recipient_org_name || '%'))
          )
      )
    )
  );

COMMIT;
