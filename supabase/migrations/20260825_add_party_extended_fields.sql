-- Migration: add extended party fields to customers and suppliers
-- Run with: supabase db push OR psql -f this_file.sql -d <your_database_url>

BEGIN;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS credit_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS credit_period_days INTEGER,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- OPTIONAL: add indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers (organization_id);

COMMIT;

-- Notes:
-- 1) If your project enforces strict RLS policies, ensure the authenticated role has insert/update privileges on these new columns.
-- 2) If you use the Supabase Migrations system, prefer adding this SQL as a timestamped migration file matching your conventions.
-- 3) You may want to add defaults or constraints (e.g., NOT NULL) only after backfilling values.
