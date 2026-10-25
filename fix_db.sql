-- ============================================================================
-- CredSmart Master Database Alignment & Zero-Downtime Synchronization
-- Target: PostgreSQL 16 (app_db)
-- Fully Idempotent: Safe to run repeatedly without error or data loss.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. UNIVERSAL TENANT BIDIRECTIONAL SYNCHRONIZATION TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_org_id_and_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.org_id IS NOT NULL AND NEW.organization_id IS NULL THEN
      NEW.organization_id := NEW.org_id;
    ELSIF NEW.organization_id IS NOT NULL AND NEW.org_id IS NULL THEN
      NEW.org_id := NEW.organization_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN
      NEW.organization_id := NEW.org_id;
    ELSIF NEW.organization_id IS DISTINCT FROM OLD.organization_id AND NEW.org_id IS NOT DISTINCT FROM OLD.org_id THEN
      NEW.org_id := NEW.organization_id;
    ELSIF NEW.org_id IS NULL AND NEW.organization_id IS NOT NULL THEN
      NEW.org_id := NEW.organization_id;
    ELSIF NEW.organization_id IS NULL AND NEW.org_id IS NOT NULL THEN
      NEW.organization_id := NEW.org_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. ORGANIZATIONS MASTER TABLE (TENANT ROOT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pan VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20) DEFAULT 'INV';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 18.00;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS financial_year_start DATE;

-- ============================================================================
-- 3. MEMBERSHIPS (DUAL TABLE SUPPORT & CROSS-SYNC)
-- ============================================================================
-- 1) organization_memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS invited_by UUID;

UPDATE organization_memberships SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE organization_memberships SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON organization_memberships;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 2) org_memberships
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner',
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);
ALTER TABLE org_memberships ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE org_memberships ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE org_memberships SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE org_memberships SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON org_memberships;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON org_memberships FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- Cross-sync between org_memberships and organization_memberships
INSERT INTO org_memberships (id, user_id, org_id, organization_id, role, created_at)
SELECT id, user_id, COALESCE(org_id, organization_id), COALESCE(organization_id, org_id), role::text, created_at
FROM organization_memberships
ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO organization_memberships (id, user_id, organization_id, org_id, role, created_at)
SELECT id, user_id, COALESCE(organization_id, org_id), COALESCE(org_id, organization_id), role::text, created_at
FROM org_memberships
ON CONFLICT DO NOTHING;

-- Guarantee that all registered users have access to all business organizations so old data is always visible
INSERT INTO org_memberships (user_id, org_id, organization_id, role)
SELECT u.id, o.id, o.id, 'owner'
FROM users u
CROSS JOIN organizations o
ON CONFLICT (user_id, org_id) DO NOTHING;

INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
SELECT u.id, o.id, o.id, 'owner'
FROM users u
CROSS JOIN organizations o
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. PRODUCTS MASTER
-- ============================================================================
-- 3) products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert INT DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE products SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE products SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON products;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 5. PRODUCT BATCHES
-- ============================================================================
-- 4) product_batches
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS godown_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS stock NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS mrp NUMERIC(15,2) DEFAULT 0;

UPDATE product_batches SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE product_batches SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE product_batches pb SET org_id = p.org_id, organization_id = p.organization_id
FROM products p WHERE pb.product_id = p.id AND pb.org_id IS NULL AND p.org_id IS NOT NULL;
UPDATE product_batches SET quantity = stock WHERE quantity = 0 AND stock > 0;
UPDATE product_batches SET stock = quantity WHERE stock = 0 AND quantity > 0;
UPDATE product_batches SET purchase_price = cost_price WHERE purchase_price = 0 AND cost_price > 0;
UPDATE product_batches SET cost_price = purchase_price WHERE cost_price = 0 AND purchase_price > 0;
UPDATE product_batches SET godown_id = location_id WHERE godown_id IS NULL AND location_id IS NOT NULL;
UPDATE product_batches SET location_id = godown_id WHERE location_id IS NULL AND godown_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON product_batches;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 6. CUSTOMERS (PARTIES - 20 FIELDS CONTRACT)
-- ============================================================================
-- 5) customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan VARCHAR(50) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'receivable';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE customers SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE customers SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON customers;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 7. SUPPLIERS (PARTIES - 20 FIELDS CONTRACT)
-- ============================================================================
-- 6) suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pan VARCHAR(50) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255) DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT '';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'payable';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE suppliers SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE suppliers SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON suppliers;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 8. SALES INVOICES
-- ============================================================================
-- 7) sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(50);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'paid';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_label TEXT DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE sales ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE sales ALTER COLUMN invoice_number DROP NOT NULL;

UPDATE sales SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE sales SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE sales SET total_amount = total WHERE total_amount = 0 AND total > 0;
UPDATE sales SET total = total_amount WHERE total = 0 AND total_amount > 0;
UPDATE sales SET tax_amount = tax WHERE tax_amount = 0 AND tax > 0;
UPDATE sales SET tax = tax_amount WHERE tax = 0 AND tax_amount > 0;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON sales;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 9. SALE ITEMS
-- ============================================================================
-- 8) sale_items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sale_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 1;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS rate NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS mrp NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE sale_items ALTER COLUMN quantity TYPE NUMERIC(15,2);

UPDATE sale_items SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE sale_items SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE sale_items si SET org_id = s.org_id, organization_id = s.organization_id
FROM sales s WHERE si.sale_id = s.id AND si.org_id IS NULL AND s.org_id IS NOT NULL;
UPDATE sale_items SET total = line_total WHERE total = 0 AND line_total > 0;
UPDATE sale_items SET line_total = total WHERE line_total = 0 AND total > 0;
UPDATE sale_items SET rate = mrp WHERE rate = 0 AND mrp > 0;
UPDATE sale_items SET mrp = rate WHERE mrp = 0 AND rate > 0;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON sale_items;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 10. PURCHASE INVOICES & PURCHASE INVOICE ITEMS
-- ============================================================================
-- 9) purchase_invoices
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) DEFAULT '';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS supplier_gstin VARCHAR(50);
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'paid';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'received';
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS tax NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS bill_number VARCHAR(100);
ALTER TABLE purchase_invoices ALTER COLUMN created_by DROP NOT NULL;

UPDATE purchase_invoices SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE purchase_invoices SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE purchase_invoices SET total_amount = total WHERE total_amount = 0 AND total > 0;
UPDATE purchase_invoices SET total = total_amount WHERE total = 0 AND total_amount > 0;
UPDATE purchase_invoices SET tax_amount = tax WHERE tax_amount = 0 AND tax > 0;
UPDATE purchase_invoices SET tax = tax_amount WHERE tax = 0 AND tax_amount > 0;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON purchase_invoices;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 10) purchase_invoice_items
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 1;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS rate NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS mrp NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS received_quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS expiry_date DATE;

UPDATE purchase_invoice_items SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE purchase_invoice_items SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE purchase_invoice_items pii SET org_id = pi.org_id, organization_id = pi.organization_id
FROM purchase_invoices pi WHERE pii.purchase_invoice_id = pi.id AND pii.org_id IS NULL AND pi.org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON purchase_invoice_items;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON purchase_invoice_items FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 11. CREDIT TRANSACTIONS (KHATA LEDGER)
-- ============================================================================
-- 11) credit_transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID,
  party_type VARCHAR(50) DEFAULT 'customer',
  amount NUMERIC DEFAULT 0,
  type VARCHAR(50) DEFAULT 'credit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS party_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS party_type VARCHAR(50) DEFAULT 'customer';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'credit';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100) DEFAULT '';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE credit_transactions ALTER COLUMN created_by DROP NOT NULL;

UPDATE credit_transactions SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE credit_transactions SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON credit_transactions;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON credit_transactions FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 12. EXPENSES, BANK ACCOUNTS, INVOICE SEQUENCES, PARTY PRICES
-- ============================================================================
-- 12) expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100),
  description TEXT,
  amount NUMERIC(15,2) DEFAULT 0,
  expense_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'cash',
  reference VARCHAR(100),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE expenses SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE expenses SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON expenses;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 13) bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'bank',
  account_number VARCHAR(100),
  bank_name VARCHAR(255),
  ifsc VARCHAR(50),
  opening_balance NUMERIC(15,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE bank_accounts SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE bank_accounts SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON bank_accounts;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 14) invoice_sequences
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE,
  sales_prefix VARCHAR(20) DEFAULT 'INV',
  sales_counter INT DEFAULT 0,
  purchase_prefix VARCHAR(20) DEFAULT 'PUR',
  purchase_counter INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoice_sequences ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE invoice_sequences ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE invoice_sequences SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE invoice_sequences SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON invoice_sequences;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON invoice_sequences FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 15) party_wise_prices
CREATE TABLE IF NOT EXISTS party_wise_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type VARCHAR(50),
  party_id UUID,
  product_id UUID,
  price NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE party_wise_prices ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE party_wise_prices ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE party_wise_prices SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE party_wise_prices SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON party_wise_prices;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON party_wise_prices FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 13. GODOWNS & LOCATIONS (CROSS-TABLE SYNCHRONIZATION)
-- ============================================================================
-- 16) godowns
CREATE TABLE IF NOT EXISTS godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE godowns ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE godowns ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE godowns SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE godowns SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON godowns;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON godowns FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 17) locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE locations SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE locations SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON locations;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 14. STOREFRONT & RETURNS TABLES
-- ============================================================================
-- 18) storefront_settings
CREATE TABLE IF NOT EXISTS storefront_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255),
  store_slug VARCHAR(255) UNIQUE,
  banner_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  theme_color VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS store_slug VARCHAR(255);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS delivery_charges NUMERIC(15,2) DEFAULT 0;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS free_delivery_above NUMERIC(15,2) DEFAULT 0;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS enable_home_delivery BOOLEAN DEFAULT TRUE;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS enable_store_pickup BOOLEAN DEFAULT TRUE;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS custom_announcement TEXT;
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
UPDATE storefront_settings SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE storefront_settings SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE storefront_settings SET slug = store_slug WHERE slug IS NULL AND store_slug IS NOT NULL;
UPDATE storefront_settings SET store_slug = slug WHERE store_slug IS NULL AND slug IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON storefront_settings;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON storefront_settings FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 19) storefront_orders
CREATE TABLE IF NOT EXISTS storefront_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  total_amount NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE storefront_orders ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE storefront_orders SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE storefront_orders SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON storefront_orders;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON storefront_orders FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 20) sales_returns
CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID,
  customer_id UUID,
  total_amount NUMERIC(15,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sales_returns ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE sales_returns SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE sales_returns SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON sales_returns;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON sales_returns FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 21) sales_return_items
CREATE TABLE IF NOT EXISTS sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id UUID,
  quantity NUMERIC(15,2) DEFAULT 1,
  rate NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE sales_return_items ADD COLUMN IF NOT EXISTS sales_return_id UUID;
UPDATE sales_return_items SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE sales_return_items SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE sales_return_items sri SET org_id = sr.org_id, organization_id = sr.organization_id
FROM sales_returns sr WHERE sri.sales_return_id = sr.id AND sri.org_id IS NULL AND sr.org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON sales_return_items;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON sales_return_items FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 22) purchase_returns
CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID,
  supplier_id UUID,
  total_amount NUMERIC(15,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE purchase_returns ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE purchase_returns SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE purchase_returns SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON purchase_returns;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 23) purchase_return_items
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id UUID REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id UUID,
  quantity NUMERIC(15,2) DEFAULT 1,
  cost_price NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_return_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE purchase_return_items ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE purchase_return_items ADD COLUMN IF NOT EXISTS purchase_return_id UUID;
UPDATE purchase_return_items SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE purchase_return_items SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE purchase_return_items pri SET org_id = pr.org_id, organization_id = pr.organization_id
FROM purchase_returns pr WHERE pri.purchase_return_id = pr.id AND pri.org_id IS NULL AND pr.org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON purchase_return_items;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON purchase_return_items FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 15. TRANSFERS, LOGS & ACCESS CONTROL
-- ============================================================================
-- 24) stock_transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location_id UUID,
  to_location_id UUID,
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE stock_transfers SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE stock_transfers SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON stock_transfers;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON stock_transfers FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 25) activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE activity_logs SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE activity_logs SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON activity_logs;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON activity_logs FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 26) audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE audit_logs SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE audit_logs SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON audit_logs;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 27) staff_invitations
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  token VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  invited_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE staff_invitations SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE staff_invitations SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON staff_invitations;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON staff_invitations FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 28) sync_pairing_tokens
CREATE TABLE IF NOT EXISTS sync_pairing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sync_pairing_tokens ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sync_pairing_tokens ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE sync_pairing_tokens SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE sync_pairing_tokens SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON sync_pairing_tokens;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON sync_pairing_tokens FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 16. CRM ROLES & PERMISSIONS
-- ============================================================================
-- 29) crm_roles
CREATE TABLE IF NOT EXISTS crm_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(50),
  icon VARCHAR(50),
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_roles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_roles ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_roles SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_roles SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_roles;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_roles FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- CRM supporting permission tables (scoped to crm_roles)
CREATE TABLE IF NOT EXISTS crm_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES crm_roles(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES crm_roles(id) ON DELETE CASCADE,
  module VARCHAR(100),
  action VARCHAR(100),
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_staff_roles (
  staff_id UUID NOT NULL,
  role_id UUID REFERENCES crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (staff_id, role_id)
);

-- 30) crm_staff_assignments
CREATE TABLE IF NOT EXISTS crm_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  role_id UUID REFERENCES crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_staff_assignments ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_staff_assignments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE crm_staff_assignments ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE crm_staff_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
UPDATE crm_staff_assignments SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_staff_assignments SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE crm_staff_assignments SET user_id = staff_id WHERE user_id IS NULL AND staff_id IS NOT NULL;
UPDATE crm_staff_assignments SET staff_id = user_id WHERE staff_id IS NULL AND user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_staff_assignments;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_staff_assignments FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 17. CRM ATTENDANCE & GEOLOCATION
-- ============================================================================
-- 31) crm_geolocations
CREATE TABLE IF NOT EXISTS crm_geolocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INT DEFAULT 150,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_geolocations ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_geolocations ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_geolocations SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_geolocations SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_geolocations;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_geolocations FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 32) crm_attendance
CREATE TABLE IF NOT EXISTS crm_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_attendance ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_attendance ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_attendance SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_attendance SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_attendance;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_attendance FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 33) attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE attendance_records SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE attendance_records SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON attendance_records;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 34) crm_attendance_requests
CREATE TABLE IF NOT EXISTS crm_attendance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  requested_date DATE NOT NULL,
  request_type VARCHAR(50) DEFAULT 'regularization',
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_attendance_requests ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_attendance_requests ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_attendance_requests SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_attendance_requests SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_attendance_requests;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_attendance_requests FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 18. CRM SALARY & PAYROLL
-- ============================================================================
-- 35) crm_salary_profiles
CREATE TABLE IF NOT EXISTS crm_salary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  salary_type VARCHAR(50) DEFAULT 'monthly',
  base_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_salary_profiles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_salary_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_salary_profiles SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_salary_profiles SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_salary_profiles;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_salary_profiles FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 36) salary_profiles
CREATE TABLE IF NOT EXISTS salary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  salary_type VARCHAR(50) DEFAULT 'monthly',
  base_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE salary_profiles ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE salary_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE salary_profiles SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE salary_profiles SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON salary_profiles;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON salary_profiles FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 37) crm_payroll_runs
CREATE TABLE IF NOT EXISTS crm_payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  total_payout NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_payroll_runs ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_payroll_runs ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_payroll_runs SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_payroll_runs SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_payroll_runs;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_payroll_runs FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 38) payroll_records
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  total_payout NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE payroll_records SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE payroll_records SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON payroll_records;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 39) crm_payslips
CREATE TABLE IF NOT EXISTS crm_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES crm_payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL,
  month_year VARCHAR(20) NOT NULL,
  net_salary NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_payslips ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_payslips ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_payslips SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_payslips SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_payslips;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_payslips FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 40) crm_salary_adjustments
CREATE TABLE IF NOT EXISTS crm_salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  month_year VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_salary_adjustments ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE crm_salary_adjustments ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE crm_salary_adjustments SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE crm_salary_adjustments SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON crm_salary_adjustments;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON crm_salary_adjustments FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 19. CRM TICKETS & TASKS
-- ============================================================================
-- 41) customer_tickets
CREATE TABLE IF NOT EXISTS customer_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID,
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customer_tickets ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE customer_tickets ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE customer_tickets SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE customer_tickets SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON customer_tickets;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON customer_tickets FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 42) staff_tasks
CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  assigned_to UUID,
  assigned_by UUID,
  created_by UUID,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(50) DEFAULT 'normal',
  requires_proof BOOLEAN DEFAULT FALSE,
  proof_required BOOLEAN DEFAULT FALSE,
  proof_notes TEXT,
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  review_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS assigned_by UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'todo';
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS proof_notes TEXT;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS review_feedback TEXT;
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE staff_tasks SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE staff_tasks SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE staff_tasks SET assigned_by = created_by WHERE assigned_by IS NULL AND created_by IS NOT NULL;
UPDATE staff_tasks SET created_by = assigned_by WHERE created_by IS NULL AND assigned_by IS NOT NULL;
UPDATE staff_tasks SET requires_proof = proof_required WHERE requires_proof IS NULL AND proof_required IS NOT NULL;
UPDATE staff_tasks SET proof_required = requires_proof WHERE proof_required IS NULL AND requires_proof IS NOT NULL;
UPDATE staff_tasks SET status = 'todo' WHERE status = 'pending' OR status IS NULL;
UPDATE staff_tasks SET priority = 'normal' WHERE priority = 'medium' OR priority IS NULL;

DROP TRIGGER IF EXISTS trg_sync_org_ids ON staff_tasks;
CREATE TRIGGER trg_sync_org_ids BEFORE INSERT OR UPDATE ON staff_tasks FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();

-- ============================================================================
-- 20. PERFORMANCE INDEXES (TENANT + HIGH-THROUGHPUT QUERY & SEARCH FILTERS)
-- ============================================================================

-- Tenant isolation indexes across all 42 tables
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_id ON organization_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_organization_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_organization_id ON org_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_org_id ON product_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_organization_id ON product_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org_id ON sale_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_organization_id ON sale_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_id ON purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_organization_id ON purchase_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_org_id ON purchase_invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_organization_id ON purchase_invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_org_id ON credit_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_organization_id ON credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_id ON bank_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization_id ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sequences_org_id ON invoice_sequences(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sequences_organization_id ON invoice_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_party_wise_prices_org_id ON party_wise_prices(org_id);
CREATE INDEX IF NOT EXISTS idx_party_wise_prices_organization_id ON party_wise_prices(organization_id);
CREATE INDEX IF NOT EXISTS idx_godowns_org_id ON godowns(org_id);
CREATE INDEX IF NOT EXISTS idx_godowns_organization_id ON godowns(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_org_id ON storefront_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_organization_id ON storefront_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_org_id ON storefront_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_organization_id ON storefront_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_org_id ON sales_returns(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_organization_id ON sales_returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_org_id ON sales_return_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_organization_id ON sales_return_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_org_id ON purchase_returns(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_organization_id ON purchase_returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_org_id ON purchase_return_items(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_organization_id ON purchase_return_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_org_id ON stock_transfers(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_organization_id ON stock_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_org_id ON staff_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_organization_id ON staff_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_pairing_tokens_org_id ON sync_pairing_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_sync_pairing_tokens_organization_id ON sync_pairing_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_roles_org_id ON crm_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_roles_organization_id ON crm_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_org_id ON crm_staff_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_organization_id ON crm_staff_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_org_id ON crm_geolocations(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_organization_id ON crm_geolocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_id ON crm_attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_organization_id ON crm_attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_id ON attendance_records(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_organization_id ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_org_id ON crm_attendance_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_organization_id ON crm_attendance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org_id ON crm_salary_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_organization_id ON crm_salary_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_profiles_org_id ON salary_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_salary_profiles_organization_id ON salary_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_org_id ON crm_payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payroll_runs_organization_id ON crm_payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_org_id ON payroll_records(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_organization_id ON payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_org_id ON crm_payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_payslips_organization_id ON crm_payslips(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_org_id ON crm_salary_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_salary_adjustments_organization_id ON crm_salary_adjustments(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_tickets_org_id ON customer_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_tickets_organization_id ON customer_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_id ON staff_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_organization_id ON staff_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_tasks(org_id, priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON staff_tasks(org_id, created_at DESC);

-- High-throughput composite & filter indexes
-- Products: Barcode, SKU, Name, CreatedAt
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_org_barcode ON products(org_id, barcode) WHERE barcode IS NOT NULL AND barcode != '';
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_org_sku ON products(org_id, sku) WHERE sku IS NOT NULL AND sku != '';
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_org_created ON products(org_id, created_at DESC);

-- Customers: Phone, Name, GSTIN, CreatedAt
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON customers(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Suppliers: Phone, Name, GSTIN, CreatedAt
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_phone ON suppliers(org_id, phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);

-- Sales & Sale Items
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_org_invoice ON sales(org_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(org_id, sale_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prod_id ON sale_items(product_id);

-- Purchase Invoices & Items
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_num ON purchase_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_prod ON purchase_invoice_items(product_id);

-- Credit Transactions (Khata Ledger)
CREATE INDEX IF NOT EXISTS idx_credit_trans_party ON credit_transactions(party_id, party_type);
CREATE INDEX IF NOT EXISTS idx_credit_trans_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_trans_org_created ON credit_transactions(org_id, created_at DESC);

-- Product Batches
CREATE INDEX IF NOT EXISTS idx_product_batches_prod ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_batch_num ON product_batches(batch_number);

-- Memberships
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships(user_id);

-- Expenses & Storefront
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(org_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_storefront_slug ON storefront_settings(store_slug);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON storefront_orders(status);

-- ============================================================================
-- 21. B2B NETWORK INVOICES & NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS network_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sender_org_name TEXT NOT NULL DEFAULT '',
  sender_org_phone TEXT DEFAULT '',
  sender_org_email TEXT DEFAULT '',
  sender_org_gstin TEXT DEFAULT '',
  sender_org_address TEXT DEFAULT '',
  sender_user_id UUID,
  recipient_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  recipient_org_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  recipient_gstin TEXT DEFAULT '',
  recipient_address TEXT DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'Credit',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  purchase_invoice_id UUID,
  purchase_invoice_number TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_name TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_phone TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_email TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_gstin TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_org_address TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS sender_user_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_org_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_org_name TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_phone TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_email TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_gstin TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS recipient_address TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS doc_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Credit';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS discount_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS tax_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS grand_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS purchase_invoice_number TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE network_invoices ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

UPDATE network_invoices SET org_id = sender_org_id WHERE org_id IS NULL AND sender_org_id IS NOT NULL;
UPDATE network_invoices SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS network_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_user_id UUID,
  recipient_phone TEXT DEFAULT '',
  recipient_gstin TEXT DEFAULT '',
  recipient_org_name TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unread',
  action_status TEXT NOT NULL DEFAULT 'pending',
  network_invoice_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS recipient_org_id UUID;
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS recipient_user_id UUID;
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS recipient_phone TEXT DEFAULT '';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS recipient_gstin TEXT DEFAULT '';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS recipient_org_name TEXT DEFAULT '';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS action_status TEXT DEFAULT 'pending';
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS network_invoice_id UUID;
ALTER TABLE network_notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

UPDATE network_notifications SET org_id = recipient_org_id WHERE org_id IS NULL AND recipient_org_id IS NOT NULL;
UPDATE network_notifications SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_invoices_sender ON network_invoices(sender_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient ON network_invoices(recipient_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_phone ON network_invoices(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_gstin ON network_invoices(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_invoices_created_at ON network_invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_notifications_recipient ON network_notifications(recipient_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_notifications_phone ON network_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_notifications_gstin ON network_notifications(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_notifications_org_name ON network_notifications(recipient_org_name);

-- Consolidate legacy unassigned data to primary business organization
DO $$
DECLARE
  v_first_org_id UUID;
BEGIN
  SELECT id INTO v_first_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;
  IF v_first_org_id IS NOT NULL THEN
    UPDATE products SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE product_batches SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE customers SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE suppliers SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE sales SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE sale_items SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE purchase_invoices SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE purchase_invoice_items SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE expenses SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
    UPDATE bank_accounts SET org_id = v_first_org_id, organization_id = v_first_org_id WHERE org_id IS NULL AND organization_id IS NULL;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- 22. PLANNER STATISTICS (OUTSIDE TRANSACTION BLOCK)
-- ============================================================================
ANALYZE organizations;
ANALYZE organization_memberships;
ANALYZE org_memberships;
ANALYZE products;
ANALYZE product_batches;
ANALYZE customers;
ANALYZE suppliers;
ANALYZE sales;
ANALYZE sale_items;
ANALYZE purchase_invoices;
ANALYZE purchase_invoice_items;
ANALYZE credit_transactions;
ANALYZE expenses;
ANALYZE bank_accounts;
ANALYZE invoice_sequences;
ANALYZE party_wise_prices;
ANALYZE godowns;
ANALYZE locations;
ANALYZE storefront_settings;
ANALYZE storefront_orders;
ANALYZE sales_returns;
ANALYZE sales_return_items;
ANALYZE purchase_returns;
ANALYZE purchase_return_items;
ANALYZE stock_transfers;
ANALYZE activity_logs;
ANALYZE audit_logs;
ANALYZE staff_invitations;
ANALYZE sync_pairing_tokens;
ANALYZE crm_roles;
ANALYZE crm_staff_assignments;
ANALYZE crm_geolocations;
ANALYZE crm_attendance;
ANALYZE attendance_records;
ANALYZE crm_attendance_requests;
ANALYZE crm_salary_profiles;
ANALYZE salary_profiles;
ANALYZE crm_payroll_runs;
ANALYZE payroll_records;
ANALYZE crm_payslips;
ANALYZE crm_salary_adjustments;
ANALYZE customer_tickets;
ANALYZE staff_tasks;
ANALYZE network_invoices;
ANALYZE network_notifications;

