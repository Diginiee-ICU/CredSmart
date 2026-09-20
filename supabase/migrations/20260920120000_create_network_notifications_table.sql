BEGIN;

CREATE TABLE IF NOT EXISTS public.network_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  action_status TEXT NOT NULL DEFAULT 'pending' CHECK (action_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  network_invoice_id UUID REFERENCES public.network_invoices(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_network_notifications_recipient
  ON public.network_notifications(recipient_org_id, created_at DESC);

ALTER TABLE public.network_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization members can view network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can view network notifications"
  ON public.network_notifications FOR SELECT
  USING (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id));

DROP POLICY IF EXISTS "Organization members can create network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can create network notifications"
  ON public.network_notifications FOR INSERT
  WITH CHECK (
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id)) OR
    (
      network_invoice_id IS NOT NULL AND
      EXISTS (
        SELECT 1
        FROM public.network_invoices ni
        WHERE ni.id = network_notifications.network_invoice_id
          AND (
            has_org_access(ni.sender_org_id) OR
            has_org_access(ni.recipient_org_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS "Organization members can update network notifications" ON public.network_notifications;
CREATE POLICY "Organization members can update network notifications"
  ON public.network_notifications FOR UPDATE
  USING (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id));

COMMIT;