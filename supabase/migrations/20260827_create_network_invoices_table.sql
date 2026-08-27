-- Migration: Create network_invoices and network_notifications tables for B2B invoice sync
-- Run with: supabase db push OR psql -f this_file.sql -d <your_database_url>

BEGIN;

CREATE TABLE IF NOT EXISTS public.network_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_org_name TEXT NOT NULL,
  sender_org_phone TEXT DEFAULT '',
  sender_org_email TEXT DEFAULT '',
  sender_org_gstin TEXT DEFAULT '',
  sender_org_address TEXT DEFAULT '',
  sender_user_id UUID,
  
  recipient_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  recipient_org_name TEXT NOT NULL,
  recipient_phone TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  recipient_gstin TEXT DEFAULT '',
  recipient_address TEXT DEFAULT '',

  invoice_number TEXT NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'Credit',

  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  purchase_invoice_id UUID,
  purchase_invoice_number TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_network_invoices_sender ON public.network_invoices(sender_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient ON public.network_invoices(recipient_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_phone ON public.network_invoices(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_gstin ON public.network_invoices(recipient_gstin);

ALTER TABLE public.network_invoices ENABLE ROW LEVEL SECURITY;

-- Allow members of sender or recipient organizations to read invoices
CREATE POLICY "Sender and recipient org members can view network invoices"
  ON public.network_invoices FOR SELECT
  USING (
    has_org_access(sender_org_id) OR
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id))
  );

-- Allow authenticated members to create network invoices from their organization
CREATE POLICY "Sender org members can create network invoices"
  ON public.network_invoices FOR INSERT
  WITH CHECK (has_org_access(sender_org_id));

-- Allow sender or recipient org members to update network invoices (e.g. approve/reject)
CREATE POLICY "Sender and recipient org members can update network invoices"
  ON public.network_invoices FOR UPDATE
  USING (
    has_org_access(sender_org_id) OR
    (recipient_org_id IS NOT NULL AND has_org_access(recipient_org_id))
  );

COMMIT;
