-- Migration: Create public.expenses table for expense tracking
-- Execute in Supabase SQL Editor or via `supabase db push`

BEGIN;

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  expense_number TEXT,
  party_name TEXT DEFAULT 'General Expense Payee',
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  payment_method TEXT DEFAULT 'Cash',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view expenses for their organization" ON public.expenses;
CREATE POLICY "Users can view expenses for their organization"
  ON public.expenses FOR SELECT
  USING (has_org_access(organization_id));

DROP POLICY IF EXISTS "Users can create expenses for their organization" ON public.expenses;
CREATE POLICY "Users can create expenses for their organization"
  ON public.expenses FOR INSERT
  WITH CHECK (has_org_access(organization_id));

DROP POLICY IF EXISTS "Users can update expenses for their organization" ON public.expenses;
CREATE POLICY "Users can update expenses for their organization"
  ON public.expenses FOR UPDATE
  USING (has_org_access(organization_id));

DROP POLICY IF EXISTS "Users can delete expenses for their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses for their organization"
  ON public.expenses FOR DELETE
  USING (has_org_access(organization_id));

COMMIT;
