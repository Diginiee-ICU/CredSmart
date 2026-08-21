
-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view suppliers" ON public.suppliers FOR SELECT USING (has_org_access(organization_id));
CREATE POLICY "Owners/managers can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update suppliers" ON public.suppliers FOR UPDATE USING (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete suppliers" ON public.suppliers FOR DELETE USING (is_org_owner_or_manager(organization_id));

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Purchase invoices table
CREATE TABLE public.purchase_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'partial')),
  notes TEXT DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchase invoices" ON public.purchase_invoices FOR SELECT USING (has_org_access(organization_id));
CREATE POLICY "Owners/managers can create purchase invoices" ON public.purchase_invoices FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update purchase invoices" ON public.purchase_invoices FOR UPDATE USING (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete purchase invoices" ON public.purchase_invoices FOR DELETE USING (is_org_owner_or_manager(organization_id));

CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Purchase invoice items table
CREATE TABLE public.purchase_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchase invoice items" ON public.purchase_invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND has_org_access(pi.organization_id)));
CREATE POLICY "Owners/managers can create purchase invoice items" ON public.purchase_invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));
CREATE POLICY "Owners/managers can update purchase invoice items" ON public.purchase_invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));
CREATE POLICY "Owners/managers can delete purchase invoice items" ON public.purchase_invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.purchase_invoices pi WHERE pi.id = purchase_invoice_items.purchase_invoice_id AND is_org_owner_or_manager(pi.organization_id)));

-- Function to auto-update stock when purchase invoice is marked as received
CREATE OR REPLACE FUNCTION public.handle_purchase_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process when status changes to 'received'
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- For each line item, upsert into product_batches
    INSERT INTO public.product_batches (product_id, batch_number, cost_price, mrp, stock, expiry_date)
    SELECT
      pii.product_id,
      pii.batch_number,
      pii.cost_price,
      pii.mrp,
      pii.quantity,
      pii.expiry_date
    FROM public.purchase_invoice_items pii
    WHERE pii.purchase_invoice_id = NEW.id
    ON CONFLICT (product_id, batch_number) DO UPDATE
      SET stock = product_batches.stock + EXCLUDED.stock,
          cost_price = EXCLUDED.cost_price,
          mrp = EXCLUDED.mrp,
          expiry_date = EXCLUDED.expiry_date,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- We need a unique constraint on product_batches for the upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_product_batch ON public.product_batches(product_id, batch_number);

CREATE TRIGGER trigger_purchase_receive
  BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_receive();
