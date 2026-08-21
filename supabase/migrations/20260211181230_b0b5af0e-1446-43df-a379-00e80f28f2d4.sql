
-- Create staff invitations table
CREATE TABLE public.staff_invitations (
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

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Members can view invitations for their org
CREATE POLICY "Members can view invitations"
ON public.staff_invitations
FOR SELECT
USING (has_org_access(organization_id));

-- Owners/managers can create invitations
CREATE POLICY "Owners/managers can create invitations"
ON public.staff_invitations
FOR INSERT
WITH CHECK (is_org_owner_or_manager(organization_id));

-- Owners/managers can update invitations (cancel, etc.)
CREATE POLICY "Owners/managers can update invitations"
ON public.staff_invitations
FOR UPDATE
USING (is_org_owner_or_manager(organization_id));

-- Owners/managers can delete invitations
CREATE POLICY "Owners/managers can delete invitations"
ON public.staff_invitations
FOR DELETE
USING (is_org_owner_or_manager(organization_id));

-- Create function to auto-accept invitation on user signup
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Find pending invitations for this user's email
  FOR inv IN
    SELECT id, organization_id, role
    FROM public.staff_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    -- Create membership
    INSERT INTO public.organization_memberships (organization_id, user_id, role)
    VALUES (inv.organization_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;

    -- Mark invitation as accepted
    UPDATE public.staff_invitations
    SET status = 'accepted'
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert to auto-accept invitations
CREATE TRIGGER on_auth_user_created_accept_invitations
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_invitation_acceptance();
