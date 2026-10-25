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
  'users', 'profiles', 'organizations', 'org_memberships', 'organization_memberships', 'products', 'product_batches',
  'godowns', 'locations', 'stock_transfers', 'customers', 'suppliers', 'credit_transactions',
  'bank_accounts', 'party_wise_prices', 'sales', 'sale_items',
  'purchase_invoices', 'purchase_invoice_items', 'expenses', 'sales_returns',
  'purchase_returns', 'activity_logs', 'storefront_settings', 'storefront_orders',
  'crm_roles', 'crm_role_permissions', 'crm_permissions', 'crm_staff_assignments', 'crm_staff_roles',
  'attendance_records', 'crm_attendance', 'crm_attendance_requests', 'crm_geolocations',
  'salary_profiles', 'crm_salary_profiles', 'payroll_records', 'crm_payroll_runs', 'crm_payslips',
  'crm_salary_adjustments', 'customer_tickets', 'staff_tasks', 'invoice_sequences',
  'network_invoices', 'network_notifications', 'crm_broadcasts'
]);

const TABLES_WITHOUT_ORG_ID = new Set([
  'users', 'profiles', 'crm_permissions', 'crm_role_permissions', 'crm_staff_roles'
]);

function splitClauses(str) {
  const result = [];
  let current = '';
  let inParen = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') inParen = true;
    else if (char === ')') inParen = false;
    else if (char === ',' && !inParen) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseOrParam(orQuery, params) {
  if (!orQuery) return null;
  const rawOr = String(orQuery).replace(/^\((.*)\)$/, '$1');
  const clauses = splitClauses(rawOr);
  const sqlParts = [];

  for (const clause of clauses) {
    const parts = clause.split('.');
    if (parts.length >= 3) {
      const col = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
      const op = parts[1].toLowerCase();
      const val = parts.slice(2).join('.');
      if (col) {
        if (op === 'eq') {
          params.push(val);
          sqlParts.push(`"${col}" = $${params.length}`);
        } else if (op === 'neq') {
          params.push(val);
          sqlParts.push(`"${col}" != $${params.length}`);
        } else if (op === 'ilike') {
          params.push(val);
          sqlParts.push(`"${col}" ILIKE $${params.length}`);
        } else if (op === 'like') {
          params.push(val);
          sqlParts.push(`"${col}" LIKE $${params.length}`);
        } else if (op === 'gt') {
          params.push(val);
          sqlParts.push(`"${col}" > $${params.length}`);
        } else if (op === 'gte') {
          params.push(val);
          sqlParts.push(`"${col}" >= $${params.length}`);
        } else if (op === 'lt') {
          params.push(val);
          sqlParts.push(`"${col}" < $${params.length}`);
        } else if (op === 'lte') {
          params.push(val);
          sqlParts.push(`"${col}" <= $${params.length}`);
        } else if (op === 'is' && val === 'null') {
          sqlParts.push(`"${col}" IS NULL`);
        } else if ((op === 'not' && val === 'is.null') || (op === 'is' && (val === 'not.null' || val === 'not null'))) {
          sqlParts.push(`"${col}" IS NOT NULL`);
        } else if (op === 'in' && val.startsWith('(') && val.endsWith(')')) {
          const inVals = val.slice(1, -1).split(',').map(v => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          if (inVals.length > 0) {
            const phs = inVals.map(v => { params.push(v); return `$${params.length}`; }).join(', ');
            sqlParts.push(`"${col}" IN (${phs})`);
          }
        } else {
          params.push(val);
          sqlParts.push(`"${col}" = $${params.length}`);
        }
      }
    }
  }

  return sqlParts.length > 0 ? `(${sqlParts.join(' OR ')})` : null;
}

// GET /rest/v1/:table
router.get('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Table '${table}' not accessible via REST passthrough` });
    }
    const actualTable = table === 'profiles' ? 'users' : table;

    const orgId = req.orgId || req.query.org_id;
    const selectCols = req.query.select || '*';
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const order = req.query.order;

    let projection = '*';
    if (selectCols && selectCols !== '*') {
      const cols = selectCols.split(',').map(c => c.trim()).filter(Boolean);
      const safeCols = cols.filter(c => /^[a-zA-Z0-9_]+$/.test(c)).map(c => `"${c}"`);
      if (safeCols.length > 0) {
        projection = safeCols.join(', ');
      }
    }

    let query = `SELECT ${projection} FROM "${actualTable}" WHERE 1=1`;
    const params = [];

    // PostgREST OR filter parsing
    if (req.query.or) {
      const orSql = parseOrParam(req.query.or, params);
      if (orSql) {
        query += ` AND ${orSql}`;
      }
    }

    // Tenant Scoping
    if (table === 'network_invoices') {
      if (!req.query.or && orgId) {
        params.push(orgId);
        query += ` AND (sender_org_id = $${params.length} OR recipient_org_id = $${params.length})`;
      }
    } else if (table === 'network_notifications') {
      if (!req.query.or && orgId) {
        params.push(orgId);
        query += ` AND recipient_org_id = $${params.length}`;
      }
    } else if (!TABLES_WITHOUT_ORG_ID.has(table)) {
      if (orgId) {
        params.push(orgId);
        query += ` AND (org_id = $${params.length} OR organization_id = $${params.length} OR org_id IS NULL)`;
      }
    }

    // Process equality and PostgREST operator filters from query params
    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or', 'org_id'].includes(key)) continue;
      const col = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!col) continue;

      if (typeof value === 'string' && value.includes('.')) {
        const [op, ...rest] = value.split('.');
        const val = rest.join('.');
        if (op === 'eq') {
          params.push(val);
          query += ` AND "${col}" = $${params.length}`;
        } else if (op === 'neq') {
          params.push(val);
          query += ` AND "${col}" != $${params.length}`;
        } else if (op === 'in') {
          const inVals = val.replace(/^\((.*)\)$/, '$1').split(',').map(v => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
          if (inVals.length > 0) {
            const phs = inVals.map(v => { params.push(v); return `$${params.length}`; }).join(', ');
            query += ` AND "${col}" IN (${phs})`;
          }
        } else if (op === 'ilike') {
          params.push(val);
          query += ` AND "${col}" ILIKE $${params.length}`;
        } else if (op === 'like') {
          params.push(val);
          query += ` AND "${col}" LIKE $${params.length}`;
        } else if (op === 'is' && val === 'null') {
          query += ` AND "${col}" IS NULL`;
        } else if ((op === 'not' && val === 'is.null') || (op === 'is' && (val === 'not.null' || val === 'not null'))) {
          query += ` AND "${col}" IS NOT NULL`;
        } else {
          params.push(value);
          query += ` AND "${col}" = $${params.length}`;
        }
      } else {
        params.push(value);
        query += ` AND "${col}" = $${params.length}`;
      }
    }

    if (order) {
      const orderClauses = order.split(',').map(o => o.trim()).filter(Boolean);
      const orderParts = [];
      for (const o of orderClauses) {
        const [col, dir] = o.split('.');
        const safeCol = col ? col.replace(/[^a-zA-Z0-9_]/g, '') : '';
        if (safeCol) {
          orderParts.push(`"${safeCol}" ${String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`);
        }
      }
      if (orderParts.length > 0) {
        query += ` ORDER BY ${orderParts.join(', ')}`;
      }
    }

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    if (err.code === '42P01') {
      // 42P01: undefined_table in PostgreSQL - return empty array gracefully
      console.warn(`Table '${req.params.table}' does not exist in DB yet:`, err.message);
      return res.json([]);
    }
    if (err.code === '42703') {
      // 42703: undefined_column in PostgreSQL (e.g. status on organization_memberships)
      console.warn(`Column not found in table '${req.params.table}', falling back:`, err.message);
      try {
        const fallbackRes = await pool.query(`SELECT * FROM "${req.params.table}" LIMIT 100`);
        return res.json(fallbackRes.rows);
      } catch {
        return res.json([]);
      }
    }
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
    const actualTable = table === 'profiles' ? 'users' : table;

    const orgId = req.orgId || req.body?.org_id;
    const isArray = Array.isArray(req.body);
    const rawItems = isArray ? req.body : [req.body];

    if (rawItems.length === 0) {
      return res.status(201).json(isArray ? [] : null);
    }

    const insertedRows = [];
    for (const item of rawItems) {
      const body = { ...item };
      if (orgId && !body.org_id && !['users', 'profiles', 'network_invoices', 'network_notifications'].includes(table)) {
        body.org_id = orgId;
      }

      const cols = Object.keys(body).filter(k => /^[a-zA-Z0-9_]+$/.test(k));
      if (cols.length === 0) continue;

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => body[c]);

      const result = await pool.query(
        `INSERT INTO "${actualTable}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      if (result.rows.length > 0) {
        insertedRows.push(result.rows[0]);
      }
    }

    return res.status(201).json(isArray ? insertedRows : (insertedRows[0] || null));
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
    const actualTable = table === 'profiles' ? 'users' : table;

    const updates = { ...req.body };
    const fields = Object.keys(updates).filter(k => /^[a-zA-Z0-9_]+$/.test(k));
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    let query = `UPDATE "${actualTable}" SET `;
    const params = [];

    fields.forEach((f, i) => {
      params.push(updates[f]);
      query += `"${f}" = $${params.length}${i < fields.length - 1 ? ', ' : ''}`;
    });

    query += ' WHERE 1=1';

    if (req.query.or) {
      const orSql = parseOrParam(req.query.or, params);
      if (orSql) {
        query += ` AND ${orSql}`;
      }
    }

    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or'].includes(key)) continue;
      const col = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!col) continue;

      if (typeof value === 'string' && value.includes('.')) {
        const [op, ...rest] = value.split('.');
        const val = rest.join('.');
        if (op === 'eq') {
          params.push(val);
          query += ` AND "${col}" = $${params.length}`;
        } else {
          params.push(value);
          query += ` AND "${col}" = $${params.length}`;
        }
      } else {
        params.push(value);
        query += ` AND "${col}" = $${params.length}`;
      }
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
    const actualTable = table === 'profiles' ? 'users' : table;

    let query = `DELETE FROM "${actualTable}" WHERE 1=1`;
    const params = [];

    if (req.query.or) {
      const orSql = parseOrParam(req.query.or, params);
      if (orSql) {
        query += ` AND ${orSql}`;
      }
    }

    for (const [key, value] of Object.entries(req.query)) {
      if (['select', 'limit', 'order', 'or'].includes(key)) continue;
      const col = key.replace(/[^a-zA-Z0-9_]/g, '');
      if (!col) continue;

      if (typeof value === 'string' && value.includes('.')) {
        const [op, ...rest] = value.split('.');
        const val = rest.join('.');
        if (op === 'eq') {
          params.push(val);
          query += ` AND "${col}" = $${params.length}`;
        } else {
          params.push(value);
          query += ` AND "${col}" = $${params.length}`;
        }
      } else {
        params.push(value);
        query += ` AND "${col}" = $${params.length}`;
      }
    }

    query += ' RETURNING *';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
