
-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view customers" ON public.customers FOR SELECT USING (has_org_access(organization_id));
CREATE POLICY "Owners/managers can create customers" ON public.customers FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update customers" ON public.customers FOR UPDATE USING (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete customers" ON public.customers FOR DELETE USING (is_org_owner_or_manager(organization_id));

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Credit transactions table (works for both suppliers and customers)
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
  party_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
  description TEXT DEFAULT '',
  reference_id TEXT DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit transactions" ON public.credit_transactions FOR SELECT USING (has_org_access(organization_id));
CREATE POLICY "Owners/managers can create credit transactions" ON public.credit_transactions FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update credit transactions" ON public.credit_transactions FOR UPDATE USING (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete credit transactions" ON public.credit_transactions FOR DELETE USING (is_org_owner_or_manager(organization_id));

-- Add customer_id to sales table for linking sales to customers
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);
