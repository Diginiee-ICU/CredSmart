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
CREATE POLICY "Members can view own sync tokens"
  ON public.sync_pairing_tokens FOR SELECT
  USING (user_id = auth.uid() AND has_org_access(organization_id));

DROP POLICY IF EXISTS "Owners and managers can create sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can create sync tokens"
  ON public.sync_pairing_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));

DROP POLICY IF EXISTS "Owners and managers can update sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can update sync tokens"
  ON public.sync_pairing_tokens FOR UPDATE
  USING (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));

DROP POLICY IF EXISTS "Owners and managers can delete sync tokens" ON public.sync_pairing_tokens;
CREATE POLICY "Owners and managers can delete sync tokens"
  ON public.sync_pairing_tokens FOR DELETE
  USING (user_id = auth.uid() AND is_org_owner_or_manager(organization_id));