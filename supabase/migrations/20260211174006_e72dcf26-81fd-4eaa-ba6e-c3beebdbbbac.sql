
-- Fix: Restrict org creation - user must be authenticated (already is), and we'll handle
-- auto-assigning store_owner role via a trigger when org is created
DROP POLICY "Authenticated can create orgs" ON public.organizations;

-- More descriptive policy - still allows any authenticated user to create orgs (needed for onboarding)
CREATE POLICY "Authenticated users can create orgs" ON public.organizations 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-assign store_owner role when creating an org
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'store_owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();
