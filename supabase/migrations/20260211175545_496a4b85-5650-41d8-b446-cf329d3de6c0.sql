
-- Add onboarding fields to organizations
ALTER TABLE public.organizations
  ADD COLUMN business_type TEXT DEFAULT '',
  ADD COLUMN address TEXT DEFAULT '',
  ADD COLUMN phone TEXT DEFAULT '',
  ADD COLUMN email TEXT DEFAULT '';
