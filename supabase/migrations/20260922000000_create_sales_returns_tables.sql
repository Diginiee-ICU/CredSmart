-- Sales returns / credit notes table
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_gstin TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  place_of_supply TEXT DEFAULT '27-Maharashtra',
  return_number TEXT NOT NULL DEFAULT '',
  original_invoice_number TEXT DEFAULT '',
  original_invoice_date DATE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT DEFAULT '',
  return_action TEXT NOT NULL DEFAULT 'return_to_stock' CHECK (return_action IN ('return_to_stock', 'scrap_damaged')),
  settlement_mode TEXT NOT NULL DEFAULT 'store_credit' CHECK (settlement_mode IN ('store_credit', 'cash_refund', 'upi_refund', 'bank_refund', 'unsettled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  round_off NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_returns
CREATE POLICY "Members can view sales returns" ON public.sales_returns
  FOR SELECT USING (has_org_access(organization_id));

CREATE POLICY "Members can create sales returns" ON public.sales_returns
  FOR INSERT WITH CHECK (has_org_access(organization_id));

CREATE POLICY "Members can update sales returns" ON public.sales_returns
  FOR UPDATE USING (has_org_access(organization_id));

CREATE POLICY "Members can delete sales returns" ON public.sales_returns
  FOR DELETE USING (has_org_access(organization_id));

CREATE TRIGGER update_sales_returns_updated_at
  BEFORE UPDATE ON public.sales_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Sales return line items table
CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  batch_number TEXT NOT NULL DEFAULT 'BATCH-01',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'PCS',
  alt_unit TEXT,
  alt_qty NUMERIC,
  alt_unit_conversion NUMERIC,
  rate NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  return_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_return_items
CREATE POLICY "Members can view sales return items" ON public.sales_return_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales_returns sr
      WHERE sr.id = sales_return_items.sales_return_id
        AND has_org_access(sr.organization_id)
    )
  );

CREATE POLICY "Members can create sales return items" ON public.sales_return_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales_returns sr
      WHERE sr.id = sales_return_items.sales_return_id
        AND has_org_access(sr.organization_id)
    )
  );

CREATE POLICY "Members can update sales return items" ON public.sales_return_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sales_returns sr
      WHERE sr.id = sales_return_items.sales_return_id
        AND has_org_access(sr.organization_id)
    )
  );

CREATE POLICY "Members can delete sales return items" ON public.sales_return_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sales_returns sr
      WHERE sr.id = sales_return_items.sales_return_id
        AND has_org_access(sr.organization_id)
    )
  );
