
-- Purchase returns / debit notes table
CREATE TABLE public.purchase_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchase_invoice_id UUID REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  return_number TEXT NOT NULL DEFAULT '',
  reason TEXT DEFAULT '',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchase returns" ON public.purchase_returns FOR SELECT USING (has_org_access(organization_id));
CREATE POLICY "Owners/managers can create purchase returns" ON public.purchase_returns FOR INSERT WITH CHECK (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can update purchase returns" ON public.purchase_returns FOR UPDATE USING (is_org_owner_or_manager(organization_id));
CREATE POLICY "Owners/managers can delete purchase returns" ON public.purchase_returns FOR DELETE USING (is_org_owner_or_manager(organization_id));

CREATE TRIGGER update_purchase_returns_updated_at BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Purchase return items
CREATE TABLE public.purchase_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view return items" ON public.purchase_return_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.purchase_returns pr WHERE pr.id = purchase_return_items.purchase_return_id AND has_org_access(pr.organization_id)));
CREATE POLICY "Owners/managers can create return items" ON public.purchase_return_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_returns pr WHERE pr.id = purchase_return_items.purchase_return_id AND is_org_owner_or_manager(pr.organization_id)));

-- Trigger to reverse stock when return is completed
CREATE OR REPLACE FUNCTION public.handle_purchase_return_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.product_batches pb
    SET stock = GREATEST(pb.stock - pri.quantity, 0),
        updated_at = now()
    FROM public.purchase_return_items pri
    WHERE pri.purchase_return_id = NEW.id
      AND pb.product_id = pri.product_id
      AND pb.batch_number = pri.batch_number;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_purchase_return_complete
  BEFORE UPDATE ON public.purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_return_complete();
