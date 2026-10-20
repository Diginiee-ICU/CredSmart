#!/bin/bash
set -e

echo "========================================================"
echo "🚀 CredSmart Complete Backend API & Database Deployer"
echo "========================================================"

SERVER_DIR="$HOME/server"
API_DIR="$SERVER_DIR/api"
SRC_DIR="$API_DIR/src"
ROUTES_DIR="$SRC_DIR/routes"
MIDDLEWARE_DIR="$SRC_DIR/middleware"

mkdir -p "$ROUTES_DIR" "$MIDDLEWARE_DIR" "$SERVER_DIR/uploads"

# 1. Update .env with JWT_SECRET if not already present
if ! grep -q "JWT_SECRET=" "$SERVER_DIR/.env" 2>/dev/null; then
    RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "credsmart_super_secret_jwt_key_2026")
    echo "JWT_SECRET=$RANDOM_SECRET" >> "$SERVER_DIR/.env"
    echo "🔑 Generated JWT_SECRET in .env"
fi

if ! grep -q "API_BASE_URL=" "$SERVER_DIR/.env" 2>/dev/null; then
    echo "API_BASE_URL=https://api.credsmart.online" >> "$SERVER_DIR/.env"
fi

# Detect DB name from .env or default to app_db
DB_NAME=$(grep -E "^POSTGRES_DB=" "$SERVER_DIR/.env" 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "app_db")
if [ -z "$DB_NAME" ]; then
    DB_NAME="app_db"
fi

echo "📊 Target Database: $DB_NAME"

# 2. Write schema.sql and execute into postgres-db
cat << 'EOSQL' > "$SERVER_DIR/schema.sql"
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    pan VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    logo_url TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    financial_year_start DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'owner',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'pcs',
    purchase_price NUMERIC(15,2) DEFAULT 0,
    selling_price NUMERIC(15,2) DEFAULT 0,
    mrp NUMERIC(15,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    hsn_code VARCHAR(50),
    is_service BOOLEAN DEFAULT FALSE,
    track_inventory BOOLEAN DEFAULT TRUE,
    low_stock_alert INT DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS godowns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    godown_id UUID REFERENCES godowns(id) ON DELETE SET NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quantity NUMERIC(15,2) DEFAULT 0,
    purchase_price NUMERIC(15,2) DEFAULT 0,
    selling_price NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    from_godown_id UUID REFERENCES godowns(id) ON DELETE SET NULL,
    to_godown_id UUID REFERENCES godowns(id) ON DELETE SET NULL,
    quantity NUMERIC(15,2) NOT NULL,
    notes TEXT,
    transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gstin VARCHAR(50),
    pan VARCHAR(50),
    credit_limit NUMERIC(15,2) DEFAULT 0,
    opening_balance NUMERIC(15,2) DEFAULT 0,
    balance_type VARCHAR(20) DEFAULT 'receivable',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gstin VARCHAR(50),
    pan VARCHAR(50),
    opening_balance NUMERIC(15,2) DEFAULT 0,
    balance_type VARCHAR(20) DEFAULT 'payable',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    party_type VARCHAR(20) CHECK (party_type IN ('customer', 'supplier')),
    party_id UUID NOT NULL,
    type VARCHAR(20) CHECK (type IN ('credit', 'debit', 'payment')),
    amount NUMERIC(15,2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'bank' CHECK (type IN ('bank', 'cash', 'wallet')),
    account_number VARCHAR(100),
    bank_name VARCHAR(100),
    ifsc VARCHAR(50),
    opening_balance NUMERIC(15,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS party_wise_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    party_type VARCHAR(20) DEFAULT 'customer',
    party_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(party_id, product_id)
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_gstin VARCHAR(50),
    sale_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    discount_label TEXT DEFAULT '',
    tax_amount NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    hsn_code VARCHAR(50),
    quantity NUMERIC(15,2) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'pcs',
    rate NUMERIC(15,2) DEFAULT 0,
    mrp NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    gst_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    line_total NUMERIC(15,2) DEFAULT 0,
    batch_number VARCHAR(100),
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    bill_number VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name VARCHAR(255),
    supplier_gstin VARCHAR(50),
    purchase_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    hsn_code VARCHAR(50),
    quantity NUMERIC(15,2) DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'pcs',
    rate NUMERIC(15,2) DEFAULT 0,
    cost_price NUMERIC(15,2) DEFAULT 0,
    unit_price NUMERIC(15,2) DEFAULT 0,
    mrp NUMERIC(15,2) DEFAULT 0,
    received_quantity NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    gst_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    batch_number VARCHAR(100),
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100),
    description TEXT,
    amount NUMERIC(15,2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference VARCHAR(100),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(15,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    total_amount NUMERIC(15,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storefront_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    store_name VARCHAR(255),
    store_slug VARCHAR(255) UNIQUE,
    banner_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    theme_color VARCHAR(50) DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storefront_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    items JSONB,
    total_amount NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS crm_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES crm_roles(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission)
);

CREATE TABLE IF NOT EXISTS crm_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES crm_roles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    notes TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS salary_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    base_salary NUMERIC(15,2) DEFAULT 0,
    allowances NUMERIC(15,2) DEFAULT 0,
    deductions NUMERIC(15,2) DEFAULT 0,
    effective_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month INT NOT NULL,
    year INT NOT NULL,
    base_salary NUMERIC(15,2) DEFAULT 0,
    allowances NUMERIC(15,2) DEFAULT 0,
    deductions NUMERIC(15,2) DEFAULT 0,
    advance NUMERIC(15,2) DEFAULT 0,
    net_salary NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

CREATE TABLE IF NOT EXISTS customer_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    sales_prefix VARCHAR(20) DEFAULT 'INV',
    sales_counter INT DEFAULT 0,
    purchase_prefix VARCHAR(20) DEFAULT 'PUR',
    purchase_counter INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. B2B Network Invoices Table
CREATE TABLE IF NOT EXISTS network_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_network_invoices_sender ON network_invoices(sender_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient ON network_invoices(recipient_org_id);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_phone ON network_invoices(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_invoices_recipient_gstin ON network_invoices(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_invoices_created_at ON network_invoices(created_at DESC);

-- 34. B2B Network Notifications Table
CREATE TABLE IF NOT EXISTS network_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_network_notifications_recipient ON network_notifications(recipient_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_notifications_phone ON network_notifications(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_network_notifications_gstin ON network_notifications(recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_network_notifications_org_name ON network_notifications(recipient_org_name);
EOSQL

echo "Applying schema to $DB_NAME in container postgres-db..."
docker exec -i postgres-db psql -U postgres -d "$DB_NAME" < "$SERVER_DIR/schema.sql"
echo "✅ Database schema applied successfully."

# 3. Write index.js (root)
cat << 'EOF' > "$API_DIR/index.js"
require('./src/index.js');
EOF

# 4. Write src/db.js
cat << 'EOF' > "$SRC_DIR/db.js"
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = pool;
EOF

# 5. Write src/middleware/auth.js
cat << 'EOF' > "$MIDDLEWARE_DIR/auth.js"
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'credsmart_jwt_secret_key_2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    const orgHeader = req.headers['x-organization-id'];
    if (orgHeader && orgHeader !== 'undefined' && orgHeader !== 'null') {
      req.orgId = orgHeader;
    } else if (decoded.orgId) {
      req.orgId = decoded.orgId;
    } else {
      const memberRes = await pool.query(
        'SELECT org_id FROM org_memberships WHERE user_id = $1 LIMIT 1',
        [decoded.id]
      );
      if (memberRes.rows.length > 0) {
        req.orgId = memberRes.rows[0].org_id;
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.orgId = req.headers['x-organization-id'] || decoded.orgId;
    }
  } catch (err) {
    // Ignore invalid in optional auth
  }
  next();
};

module.exports = { authenticate, optionalAuth, JWT_SECRET };
EOF

echo "✅ Database & Middleware configured."
echo "Writing route files..."
