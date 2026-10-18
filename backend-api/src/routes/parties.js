const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== CUSTOMERS ====================

// GET /api/customers
router.get('/customers', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    if (!orgId) return res.json([]);

    const { search, is_active } = req.query;
    let query = 'SELECT * FROM customers WHERE org_id = $1';
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR gstin ILIKE $${params.length})`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/customers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND org_id = $2',
      [req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/customers', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      name, phone, email, address, city, state, pincode,
      gstin, pan, credit_limit = 0, opening_balance = 0,
      balance_type = 'receivable', is_active = true
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const result = await pool.query(
      `INSERT INTO customers (
        org_id, name, phone, email, address, city, state, pincode,
        gstin, pan, credit_limit, opening_balance, balance_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [orgId, name, phone, email, address, city, state, pincode, gstin, pan, credit_limit, opening_balance, balance_type, is_active]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/customers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE customers SET ${setClauses} WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, orgId, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/customers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, orgId]
    );
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SUPPLIERS ====================

// GET /api/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    if (!orgId) return res.json([]);

    const { search, is_active } = req.query;
    let query = 'SELECT * FROM suppliers WHERE org_id = $1';
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR gstin ILIKE $${params.length})`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/suppliers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1 AND org_id = $2',
      [req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      name, phone, email, address, city, state, pincode,
      gstin, pan, opening_balance = 0, balance_type = 'payable', is_active = true
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const result = await pool.query(
      `INSERT INTO suppliers (
        org_id, name, phone, email, address, city, state, pincode,
        gstin, pan, opening_balance, balance_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [orgId, name, phone, email, address, city, state, pincode, gstin, pan, opening_balance, balance_type, is_active]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id
router.put('/suppliers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE suppliers SET ${setClauses} WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, orgId, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'DELETE FROM suppliers WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, orgId]
    );
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== UNIFIED PARTIES ====================

// GET /api/parties
router.get('/parties', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    if (!orgId) return res.json([]);

    const customersRes = await pool.query(
      "SELECT id, name, phone, email, address, city, state, pincode, gstin, pan, opening_balance, balance_type, is_active, 'customer' as party_type, created_at FROM customers WHERE org_id = $1",
      [orgId]
    );
    const suppliersRes = await pool.query(
      "SELECT id, name, phone, email, address, city, state, pincode, gstin, pan, opening_balance, balance_type, is_active, 'supplier' as party_type, created_at FROM suppliers WHERE org_id = $1",
      [orgId]
    );

    const parties = [...customersRes.rows, ...suppliersRes.rows].sort((a, b) => a.name.localeCompare(b.name));
    return res.json(parties);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== CREDIT TRANSACTIONS (KHATA) ====================

// GET /api/credit-transactions
router.get('/credit-transactions', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { party_id, party_type } = req.query;

    let query = 'SELECT * FROM credit_transactions WHERE org_id = $1';
    const params = [orgId];

    if (party_id) {
      params.push(party_id);
      query += ` AND party_id = $${params.length}`;
    }
    if (party_type) {
      params.push(party_type);
      query += ` AND party_type = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/credit-transactions
router.post('/credit-transactions', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { party_type, party_id, type, amount, description, reference_id, reference_type } = req.body;

    if (!party_id || !type || amount === undefined) {
      return res.status(400).json({ error: 'party_id, type, and amount are required' });
    }

    const result = await pool.query(
      `INSERT INTO credit_transactions (org_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orgId, party_type || 'customer', party_id, type, amount, description, reference_id, reference_type, req.user?.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== BANK ACCOUNTS ====================

// GET /api/bank-accounts
router.get('/bank-accounts', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'SELECT * FROM bank_accounts WHERE org_id = $1 ORDER BY is_default DESC, name ASC',
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/bank-accounts
router.post('/bank-accounts', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { name, type = 'bank', account_number, bank_name, ifsc, opening_balance = 0, is_default = false } = req.body;

    const result = await pool.query(
      `INSERT INTO bank_accounts (org_id, name, type, account_number, bank_name, ifsc, opening_balance, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, name, type, account_number, bank_name, ifsc, opening_balance, is_default]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/bank-accounts/:id
router.put('/bank-accounts/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;

    const fields = Object.keys(updates);
    const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE bank_accounts SET ${setClauses} WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, orgId, ...values]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bank-accounts/:id
router.delete('/bank-accounts/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    await pool.query('DELETE FROM bank_accounts WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== PARTY WISE PRICES ====================

// GET /api/party-wise-prices
router.get('/party-wise-prices', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { party_id } = req.query;

    let query = 'SELECT * FROM party_wise_prices WHERE org_id = $1';
    const params = [orgId];

    if (party_id) {
      params.push(party_id);
      query += ` AND party_id = $${params.length}`;
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/party-wise-prices
router.post('/party-wise-prices', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { party_id, product_id, price, party_type = 'customer' } = req.body;

    const result = await pool.query(
      `INSERT INTO party_wise_prices (org_id, party_type, party_id, product_id, price)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (party_id, product_id)
       DO UPDATE SET price = EXCLUDED.price
       RETURNING *`,
      [orgId, party_type, party_id, product_id, price]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/party-wise-prices/:id
router.delete('/party-wise-prices/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    await pool.query('DELETE FROM party_wise_prices WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
