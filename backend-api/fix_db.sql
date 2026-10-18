-- CredSmart Database Alignment Migration: Ensures Dual Column Support (org_id + organization_id)
-- Run this inside postgres-db: docker exec -i postgres-db psql -U postgres -d app_db -f /tmp/fix_db.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== 1. ORGANIZATIONS ====================
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

-- ==================== 2. MEMBERSHIPS ====================
-- Ensure organization_memberships has both columns
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE organization_memberships SET org_id = organization_id WHERE org_id IS NULL;
UPDATE organization_memberships SET organization_id = org_id WHERE organization_id IS NULL;

-- Ensure org_memberships table also exists and is synchronized
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID,
  organization_id UUID,
  role VARCHAR(50) DEFAULT 'owner',
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);
ALTER TABLE org_memberships ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE org_memberships ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE org_memberships SET org_id = organization_id WHERE org_id IS NULL;
UPDATE org_memberships SET organization_id = org_id WHERE organization_id IS NULL;

-- Cross-sync between organization_memberships and org_memberships
INSERT INTO org_memberships (id, user_id, org_id, organization_id, role, created_at)
SELECT id, user_id, COALESCE(org_id, organization_id), COALESCE(organization_id, org_id), role::text, created_at
FROM organization_memberships
ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role;

-- ==================== 3. PRODUCTS ====================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
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
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE products SET org_id = organization_id WHERE org_id IS NULL;
UPDATE products SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 4. PRODUCT BATCHES ====================
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS godown_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS stock NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS mrp NUMERIC(15,2) DEFAULT 0;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE product_batches SET org_id = organization_id WHERE org_id IS NULL;
UPDATE product_batches SET organization_id = org_id WHERE organization_id IS NULL;
UPDATE product_batches SET quantity = stock WHERE quantity = 0 AND stock > 0;
UPDATE product_batches SET purchase_price = cost_price WHERE purchase_price = 0 AND cost_price > 0;

-- ==================== 5. CUSTOMERS (PARTIES) ====================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'receivable';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE customers SET org_id = organization_id WHERE org_id IS NULL;
UPDATE customers SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 6. SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_period_days INT DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type VARCHAR(20) DEFAULT 'payable';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE suppliers SET org_id = organization_id WHERE org_id IS NULL;
UPDATE suppliers SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 7. CREDIT TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  party_id UUID,
  party_type VARCHAR(50) DEFAULT 'customer',
  amount NUMERIC DEFAULT 0,
  type VARCHAR(50) DEFAULT 'credit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100) DEFAULT '';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE credit_transactions ALTER COLUMN created_by DROP NOT NULL;
UPDATE credit_transactions SET org_id = organization_id WHERE org_id IS NULL;
UPDATE credit_transactions SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 8. SALES ====================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  total_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE sales SET org_id = organization_id WHERE org_id IS NULL;
UPDATE sales SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 9. SALE ITEMS ====================
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS organization_id UUID;
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
UPDATE sale_items SET org_id = organization_id WHERE org_id IS NULL;
UPDATE sale_items SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 10. PURCHASE INVOICES ====================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  total_amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE purchase_invoices SET org_id = organization_id WHERE org_id IS NULL;
UPDATE purchase_invoices SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 11. PURCHASE INVOICE ITEMS ====================
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE purchase_invoice_items ADD COLUMN IF NOT EXISTS organization_id UUID;
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
UPDATE purchase_invoice_items SET org_id = organization_id WHERE org_id IS NULL;
UPDATE purchase_invoice_items SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 12. STOREFRONT SETTINGS ====================
CREATE TABLE IF NOT EXISTS storefront_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  organization_id UUID,
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
UPDATE storefront_settings SET org_id = organization_id WHERE org_id IS NULL;
UPDATE storefront_settings SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 13. GODOWNS / LOCATIONS ====================
CREATE TABLE IF NOT EXISTS godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  organization_id UUID,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE godowns ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE godowns ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE godowns SET org_id = organization_id WHERE org_id IS NULL;
UPDATE godowns SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 14. BANK ACCOUNTS ====================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  organization_id UUID,
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
UPDATE bank_accounts SET org_id = organization_id WHERE org_id IS NULL;
UPDATE bank_accounts SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 15. INVOICE SEQUENCES ====================
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE,
  organization_id UUID,
  sales_prefix VARCHAR(20) DEFAULT 'INV',
  sales_counter INT DEFAULT 0,
  purchase_prefix VARCHAR(20) DEFAULT 'PUR',
  purchase_counter INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoice_sequences ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE invoice_sequences ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE invoice_sequences SET org_id = organization_id WHERE org_id IS NULL;
UPDATE invoice_sequences SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 16. PARTY WISE PRICES ====================
CREATE TABLE IF NOT EXISTS party_wise_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  organization_id UUID,
  party_type VARCHAR(50),
  party_id UUID,
  product_id UUID,
  price NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE party_wise_prices ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE party_wise_prices ADD COLUMN IF NOT EXISTS organization_id UUID;
UPDATE party_wise_prices SET org_id = organization_id WHERE org_id IS NULL;
UPDATE party_wise_prices SET organization_id = org_id WHERE organization_id IS NULL;

-- ==================== 17. EXPENSES ====================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  organization_id UUID,
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
UPDATE expenses SET org_id = organization_id WHERE org_id IS NULL;
UPDATE expenses SET organization_id = org_id WHERE organization_id IS NULL;

COMMIT;
