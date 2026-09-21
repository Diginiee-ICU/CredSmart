BEGIN;

-- 1. Ensure recipient columns exist on network_notifications for direct querying
ALTER TABLE public.network_notifications ADD COLUMN IF NOT EXISTS recipient_phone TEXT DEFAULT '';
ALTER TABLE public.network_notifications ADD COLUMN IF NOT EXISTS recipient_gstin TEXT DEFAULT '';
ALTER TABLE public.network_notifications ADD COLUMN IF NOT EXISTS recipient_org_name TEXT DEFAULT '';

-- 2. Indexes for fast real-time lookups
CREATE INDEX IF NOT EXISTS idx_network_notifications_phone ON public.network_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_notifications_gstin ON public.network_notifications(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_notifications_org_name ON public.network_notifications(recipient_org_name);

-- 3. Update network_notifications RLS Policies
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
  WITH CHECK (
    auth.role() = 'authenticated'
  );

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

-- 4. Update network_invoices RLS Policies so matching recipients can view invoices even if recipient_org_id was pending
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

COMMIT;
