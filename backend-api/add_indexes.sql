-- CredSmart Performance Boost: Database B-Tree Indexing & Statistics Update
-- Run inside postgres-db: docker exec -i postgres-db psql -U postgres -d app_db < ~/server/add_indexes.sql

BEGIN;

-- 1. Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- 2. Customers (Parties) Indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- 3. Suppliers Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);

-- 4. Credit Transactions (Khata Ledger) Indexes
CREATE INDEX IF NOT EXISTS idx_credit_trans_org_id ON credit_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_trans_organization_id ON credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_trans_party ON credit_transactions(party_id, party_type);
CREATE INDEX IF NOT EXISTS idx_credit_trans_created_at ON credit_transactions(created_at DESC);

-- 5. Sales & Sale Items Indexes
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_prod_id ON sale_items(product_id);

-- 6. Purchase Invoices & Items Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_id ON purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_organization_id ON purchase_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_invoice_items(purchase_invoice_id);

-- 7. Product Batches Indexes
CREATE INDEX IF NOT EXISTS idx_product_batches_org_id ON product_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_organization_id ON product_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_prod ON product_batches(product_id);

-- 8. Memberships Indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org ON organization_memberships(organization_id);

-- 9. Godowns / Locations & Bank Accounts
CREATE INDEX IF NOT EXISTS idx_godowns_org_id ON godowns(org_id);
CREATE INDEX IF NOT EXISTS idx_godowns_organization_id ON godowns(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_id ON bank_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization_id ON bank_accounts(organization_id);

COMMIT;

-- Recompute Planner Statistics for instant index path selection
ANALYZE products;
ANALYZE customers;
ANALYZE suppliers;
ANALYZE sales;
ANALYZE sale_items;
ANALYZE credit_transactions;
ANALYZE purchase_invoices;
ANALYZE product_batches;
ANALYZE org_memberships;
ANALYZE organization_memberships;
