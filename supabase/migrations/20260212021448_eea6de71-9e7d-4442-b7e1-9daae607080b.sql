
-- Create audit_logs table for staff activity tracking
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Members can view logs for their org
CREATE POLICY "Members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_org_access(organization_id));

-- Any org member can insert audit logs
CREATE POLICY "Members can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (has_org_access(organization_id));

-- Create index for fast lookups
CREATE INDEX idx_audit_logs_org_created ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id);
