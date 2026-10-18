const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== RPC DISPATCHER ====================

// POST /rpc/:fn
router.post('/rpc/:fn', async (req, res) => {
  try {
    const { fn } = req.params;
    const orgId = req.orgId || req.body.org_id;
    const args = req.body || {};

    // Built-in dashboard statistics function
    if (fn === 'get_dashboard_stats') {
      const salesRes = await pool.query(
        'SELECT COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as invoice_count FROM sales WHERE org_id = $1',
        [orgId]
      );
      const customersRes = await pool.query(
        'SELECT COUNT(*) as customer_count FROM customers WHERE org_id = $1',
        [orgId]
      );
      const productsRes = await pool.query(
        'SELECT COUNT(*) as product_count FROM products WHERE org_id = $1',
        [orgId]
      );

      return res.json({
        total_sales: Number(salesRes.rows[0]?.total_sales || 0),
        invoice_count: Number(salesRes.rows[0]?.invoice_count || 0),
        customer_count: Number(customersRes.rows[0]?.customer_count || 0),
        product_count: Number(productsRes.rows[0]?.product_count || 0),
      });
    }

    return res.json({ success: true, fn, args });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GENERIC REST PASSTHROUGH ====================

const ALLOWED_TABLES = new Set([
  'users', 'organizations', 'org_memberships', 'products', 'product_batches',
  'godowns', 'stock_transfers', 'customers', 'suppliers', 'credit_transactions',
  'bank_accounts', 'party_wise_prices', 'sales', 'sale_items',
  'purchase_invoices', 'purchase_invoice_items', 'expenses', 'sales_returns',
  'purchase_returns', 'activity_logs', 'storefront_settings', 'storefront_orders',
  'crm_roles', 'crm_role_permissions', 'crm_staff_assignments', 'attendance_records',
  'salary_profiles', 'payroll_records', 'customer_tickets', 'staff_tasks', 'invoice_sequences'
]);

// GET /rest/v1/:table
router.get('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not accessible via REST passthrough` });
    }

    const orgId = req.orgId || req.query.org_id;
    const selectCols = req.query.select || '*';
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const order = req.query.order;

    let query = `SELECT ${selectCols === '*' ? '*' : selectCols.split(',').map(c => `"${c.trim()}"`).join(', ')} FROM "${table}" WHERE 1=1`;
    const params = [];

    // Filter by organization if table has org_id
    if (orgId && table !== 'users') {
      params.push(orgId);
      query += ` AND (org_id = $${params.length} OR org_id IS NULL)`;
    }

    // Process equality filters from query params
    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or', 'org_id'].includes(key)) continue;
      params.push(value);
      query += ` AND "${key}" = $${params.length}`;
    }

    if (order) {
      const [col, dir] = order.split('.');
      query += ` ORDER BY "${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    }

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /rest/v1/:table
router.post('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not accessible` });
    }

    const orgId = req.orgId || req.body.org_id;
    const body = { ...req.body };
    if (orgId && !body.org_id && table !== 'users') {
      body.org_id = orgId;
    }

    const cols = Object.keys(body);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map(c => body[c]);

    const result = await pool.query(
      `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /rest/v1/:table
router.patch('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not accessible` });
    }

    const updates = { ...req.body };
    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    let query = `UPDATE "${table}" SET `;
    const params = [];

    fields.forEach((f, i) => {
      params.push(updates[f]);
      query += `"${f}" = $${params.length}${i < fields.length - 1 ? ', ' : ''}`;
    });

    query += ' WHERE 1=1';
    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or'].includes(key)) continue;
      params.push(value);
      query += ` AND "${key}" = $${params.length}`;
    }

    query += ' RETURNING *';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /rest/v1/:table
router.delete('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not accessible` });
    }

    let query = `DELETE FROM "${table}" WHERE 1=1`;
    const params = [];

    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or'].includes(key)) continue;
      params.push(value);
      query += ` AND "${key}" = $${params.length}`;
    }

    query += ' RETURNING *';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
