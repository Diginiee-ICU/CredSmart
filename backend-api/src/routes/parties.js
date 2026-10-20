const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== CUSTOMERS ====================

// GET /api/customers
router.get('/customers', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);

    const { search, is_active, sort = 'name', order = 'asc' } = req.query;
    let query = 'SELECT * FROM customers WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR gstin ILIKE $${params.length} OR trade_name ILIKE $${params.length})`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    const safeSort = ['name', 'created_at', 'balance', 'opening_balance'].includes(sort) ? sort : 'name';
    const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${safeSort} ${safeOrder}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/customers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1 AND (org_id = $2 OR organization_id = $2)',
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
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const {
      name,
      phone = '',
      email = '',
      address = '',
      city = '',
      state = '',
      pincode = '',
      gstin = '',
      pan = '',
      credit_limit,
      creditLimit,
      opening_balance,
      openingBalance,
      balance_type,
      balanceType,
      is_active,
      trade_name,
      tradeName,
      shipping_address,
      shippingAddress,
      category,
      credit_period_days,
      creditPeriodDays,
      custom_fields,
      customFields,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const effectiveName = String(name).trim();
    const effectivePhone = phone != null ? String(phone).trim() : '';
    const effectiveEmail = email != null ? String(email).trim() : '';
    const effectiveAddress = address != null ? String(address).trim() : '';
    const effectiveCity = city != null ? String(city).trim() : '';
    const effectiveState = state != null ? String(state).trim() : '';
    const effectivePincode = pincode != null ? String(pincode).trim() : '';
    const effectiveGstin = gstin != null ? String(gstin).trim().toUpperCase() : '';
    const effectivePan = pan != null ? String(pan).trim().toUpperCase() : '';
    const effectiveTradeName = String(trade_name || tradeName || '').trim();
    const effectiveShipping = String(shipping_address || shippingAddress || '').trim();
    const effectiveCategory = String(category || 'General').trim();
    const effectiveCreditLimit = Number(credit_limit ?? creditLimit ?? 0) || 0;
    const effectiveOpeningBal = Number(opening_balance ?? openingBalance ?? 0) || 0;
    const effectiveCreditDays = parseInt(String(credit_period_days ?? creditPeriodDays ?? 30), 10) || 30;
    const effectiveBalType = String(balance_type || balanceType || 'receivable').toLowerCase();
    const effectiveIsActive = is_active !== false;
    const rawCustomFields = custom_fields || customFields || {};
    let effectiveCustomFields;
    try {
      effectiveCustomFields = typeof rawCustomFields === 'object' && rawCustomFields !== null ? rawCustomFields : JSON.parse(String(rawCustomFields || '{}'));
    } catch {
      effectiveCustomFields = {};
    }

    let row;
    try {
      const result = await pool.query(
        `INSERT INTO customers (
          org_id, organization_id, name, phone, email, address, city, state, pincode,
          gstin, pan, credit_limit, opening_balance, balance_type, is_active,
          trade_name, shipping_address, category, credit_period_days, custom_fields
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          orgId,
          effectiveName,
          effectivePhone,
          effectiveEmail,
          effectiveAddress,
          effectiveCity,
          effectiveState,
          effectivePincode,
          effectiveGstin,
          effectivePan,
          effectiveCreditLimit,
          effectiveOpeningBal,
          effectiveBalType,
          effectiveIsActive,
          effectiveTradeName,
          effectiveShipping,
          effectiveCategory,
          effectiveCreditDays,
          JSON.stringify(effectiveCustomFields),
        ]
      );
      row = result.rows[0];
    } catch (_colErr) {
      // Fallback if extended columns do not exist yet in live DB
      const fallbackResult = await pool.query(
        `INSERT INTO customers (
          org_id, organization_id, name, phone, email, address, city, state, pincode,
          gstin, pan, credit_limit, opening_balance, balance_type, is_active
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          orgId,
          effectiveName,
          effectivePhone,
          effectiveEmail,
          effectiveAddress,
          effectiveCity,
          effectiveState,
          effectivePincode,
          effectiveGstin,
          effectivePan,
          effectiveCreditLimit,
          effectiveOpeningBal,
          effectiveBalType,
          effectiveIsActive,
        ]
      );
      row = fallbackResult.rows[0];
    }

    return res.status(201).json({
      id: row.id,
      org_id: row.org_id || row.organization_id || orgId,
      organization_id: row.organization_id || row.org_id || orgId,
      name: row.name || effectiveName,
      phone: row.phone || effectivePhone,
      email: row.email || effectiveEmail,
      address: row.address || effectiveAddress,
      city: row.city || effectiveCity,
      state: row.state || effectiveState,
      pincode: row.pincode || effectivePincode,
      gstin: row.gstin || effectiveGstin,
      pan: row.pan || effectivePan,
      trade_name: row.trade_name || effectiveTradeName,
      tradeName: row.trade_name || effectiveTradeName,
      shipping_address: row.shipping_address || effectiveShipping,
      shippingAddress: row.shipping_address || effectiveShipping,
      category: row.category || effectiveCategory,
      credit_limit: Number(row.credit_limit ?? effectiveCreditLimit),
      creditLimit: Number(row.credit_limit ?? effectiveCreditLimit),
      credit_period_days: Number(row.credit_period_days ?? effectiveCreditDays),
      creditPeriodDays: Number(row.credit_period_days ?? effectiveCreditDays),
      opening_balance: Number(row.opening_balance ?? effectiveOpeningBal),
      openingBalance: Number(row.opening_balance ?? effectiveOpeningBal),
      balance: Number(row.opening_balance ?? effectiveOpeningBal),
      balance_type: row.balance_type || effectiveBalType,
      balanceType: row.balance_type || effectiveBalType,
      is_active: row.is_active !== false,
      custom_fields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields || '{}') : (row.custom_fields || effectiveCustomFields),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create customer error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/bulk
router.post('/customers/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.organization_id || req.body.org_id;
    const items = req.body.items || [];
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;
      if (item.id) {
        await client.query(
          `UPDATE customers SET
            name = $1, phone = $2, email = $3, address = $4, gstin = $5,
            trade_name = $6, updated_at = NOW()
           WHERE id = $7 AND (org_id = $8 OR organization_id = $8)`,
          [item.name.trim(), item.phone || '', item.email || '', item.address || '', item.gstin || '', item.trade_name || item.tradeName || '', item.id, orgId]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO customers (org_id, organization_id, name, phone, email, address, gstin, trade_name)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7)`,
          [orgId, item.name.trim(), item.phone || '', item.email || '', item.address || '', item.gstin || '', item.trade_name || item.tradeName || '']
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ inserted, updated, count: inserted + updated, success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/customers/:id
router.put('/customers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    delete updates.organization_id;
    delete updates.org_id;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
    const values = fields.map(f => typeof updates[f] === 'object' && updates[f] !== null ? JSON.stringify(updates[f]) : updates[f]);

    const result = await pool.query(
      `UPDATE customers SET ${setClauses} WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING *`,
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
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM customers WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SUPPLIERS ====================

// GET /api/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);

    const { search, is_active, sort = 'name', order = 'asc' } = req.query;
    let query = 'SELECT * FROM suppliers WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR gstin ILIKE $${params.length} OR trade_name ILIKE $${params.length})`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    const safeSort = ['name', 'created_at', 'balance', 'opening_balance'].includes(sort) ? sort : 'name';
    const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${safeSort} ${safeOrder}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/suppliers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1 AND (org_id = $2 OR organization_id = $2)',
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
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const {
      name,
      phone = '',
      email = '',
      address = '',
      city = '',
      state = '',
      pincode = '',
      gstin = '',
      pan = '',
      credit_limit,
      creditLimit,
      opening_balance,
      openingBalance,
      balance_type,
      balanceType,
      is_active,
      trade_name,
      tradeName,
      shipping_address,
      shippingAddress,
      category,
      credit_period_days,
      creditPeriodDays,
      custom_fields,
      customFields,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const effectiveName = String(name).trim();
    const effectivePhone = phone != null ? String(phone).trim() : '';
    const effectiveEmail = email != null ? String(email).trim() : '';
    const effectiveAddress = address != null ? String(address).trim() : '';
    const effectiveCity = city != null ? String(city).trim() : '';
    const effectiveState = state != null ? String(state).trim() : '';
    const effectivePincode = pincode != null ? String(pincode).trim() : '';
    const effectiveGstin = gstin != null ? String(gstin).trim().toUpperCase() : '';
    const effectivePan = pan != null ? String(pan).trim().toUpperCase() : '';
    const effectiveTradeName = String(trade_name || tradeName || '').trim();
    const effectiveShipping = String(shipping_address || shippingAddress || '').trim();
    const effectiveCategory = String(category || 'General').trim();
    const effectiveCreditLimit = Number(credit_limit ?? creditLimit ?? 0) || 0;
    const effectiveOpeningBal = Number(opening_balance ?? openingBalance ?? 0) || 0;
    const effectiveCreditDays = parseInt(String(credit_period_days ?? creditPeriodDays ?? 30), 10) || 30;
    const effectiveBalType = String(balance_type || balanceType || 'payable').toLowerCase();
    const effectiveIsActive = is_active !== false;
    const rawCustomFields = custom_fields || customFields || {};
    let effectiveCustomFields;
    try {
      effectiveCustomFields = typeof rawCustomFields === 'object' && rawCustomFields !== null ? rawCustomFields : JSON.parse(String(rawCustomFields || '{}'));
    } catch {
      effectiveCustomFields = {};
    }

    let row;
    try {
      const result = await pool.query(
        `INSERT INTO suppliers (
          org_id, organization_id, name, phone, email, address, city, state, pincode,
          gstin, pan, credit_limit, opening_balance, balance_type, is_active,
          trade_name, shipping_address, category, credit_period_days, custom_fields
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          orgId,
          effectiveName,
          effectivePhone,
          effectiveEmail,
          effectiveAddress,
          effectiveCity,
          effectiveState,
          effectivePincode,
          effectiveGstin,
          effectivePan,
          effectiveCreditLimit,
          effectiveOpeningBal,
          effectiveBalType,
          effectiveIsActive,
          effectiveTradeName,
          effectiveShipping,
          effectiveCategory,
          effectiveCreditDays,
          JSON.stringify(effectiveCustomFields),
        ]
      );
      row = result.rows[0];
    } catch (_colErr) {
      // Fallback if extended columns do not exist yet in live DB
      const fallbackResult = await pool.query(
        `INSERT INTO suppliers (
          org_id, organization_id, name, phone, email, address, city, state, pincode,
          gstin, pan, credit_limit, opening_balance, balance_type, is_active
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          orgId,
          effectiveName,
          effectivePhone,
          effectiveEmail,
          effectiveAddress,
          effectiveCity,
          effectiveState,
          effectivePincode,
          effectiveGstin,
          effectivePan,
          effectiveCreditLimit,
          effectiveOpeningBal,
          effectiveBalType,
          effectiveIsActive,
        ]
      );
      row = fallbackResult.rows[0];
    }

    return res.status(201).json({
      id: row.id,
      org_id: row.org_id || row.organization_id || orgId,
      organization_id: row.organization_id || row.org_id || orgId,
      name: row.name || effectiveName,
      phone: row.phone || effectivePhone,
      email: row.email || effectiveEmail,
      address: row.address || effectiveAddress,
      city: row.city || effectiveCity,
      state: row.state || effectiveState,
      pincode: row.pincode || effectivePincode,
      gstin: row.gstin || effectiveGstin,
      pan: row.pan || effectivePan,
      trade_name: row.trade_name || effectiveTradeName,
      tradeName: row.trade_name || effectiveTradeName,
      shipping_address: row.shipping_address || effectiveShipping,
      shippingAddress: row.shipping_address || effectiveShipping,
      category: row.category || effectiveCategory,
      credit_limit: Number(row.credit_limit ?? effectiveCreditLimit),
      creditLimit: Number(row.credit_limit ?? effectiveCreditLimit),
      credit_period_days: Number(row.credit_period_days ?? effectiveCreditDays),
      creditPeriodDays: Number(row.credit_period_days ?? effectiveCreditDays),
      opening_balance: Number(row.opening_balance ?? effectiveOpeningBal),
      openingBalance: Number(row.opening_balance ?? effectiveOpeningBal),
      balance: Number(row.opening_balance ?? effectiveOpeningBal),
      balance_type: row.balance_type || effectiveBalType,
      balanceType: row.balance_type || effectiveBalType,
      is_active: row.is_active !== false,
      custom_fields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields || '{}') : (row.custom_fields || effectiveCustomFields),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create supplier error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers/bulk
router.post('/suppliers/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.organization_id || req.body.org_id;
    const items = req.body.items || [];
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;
      if (item.id) {
        await client.query(
          `UPDATE suppliers SET
            name = $1, phone = $2, email = $3, address = $4, gstin = $5,
            trade_name = $6, updated_at = NOW()
           WHERE id = $7 AND (org_id = $8 OR organization_id = $8)`,
          [item.name.trim(), item.phone || '', item.email || '', item.address || '', item.gstin || '', item.trade_name || item.tradeName || '', item.id, orgId]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO suppliers (org_id, organization_id, name, phone, email, address, gstin, trade_name)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7)`,
          [orgId, item.name.trim(), item.phone || '', item.email || '', item.address || '', item.gstin || '', item.trade_name || item.tradeName || '']
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ inserted, updated, count: inserted + updated, success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/suppliers/:id
router.put('/suppliers/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    delete updates.organization_id;
    delete updates.org_id;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
    const values = fields.map(f => typeof updates[f] === 'object' && updates[f] !== null ? JSON.stringify(updates[f]) : updates[f]);

    const result = await pool.query(
      `UPDATE suppliers SET ${setClauses} WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING *`,
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
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM suppliers WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GENERIC PARTIES ====================

// GET /api/parties (Union of customers & suppliers)
router.get('/parties', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);

    const customersRes = await pool.query(
      `SELECT id, name, phone, email, address, city, state, pincode, gstin, pan,
              trade_name, shipping_address, category, credit_limit, credit_period_days,
              opening_balance, balance_type, is_active, 'customer' as party_type, created_at
       FROM customers WHERE (org_id = $1 OR organization_id = $1)`,
      [orgId]
    );
    const suppliersRes = await pool.query(
      `SELECT id, name, phone, email, address, city, state, pincode, gstin, pan,
              trade_name, shipping_address, category, credit_limit, credit_period_days,
              opening_balance, balance_type, is_active, 'supplier' as party_type, created_at
       FROM suppliers WHERE (org_id = $1 OR organization_id = $1)`,
      [orgId]
    );

    const parties = [...customersRes.rows, ...suppliersRes.rows].sort((a, b) => a.name.localeCompare(b.name));
    return res.json(parties);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/parties (Unified create route)
router.post('/parties', async (req, res) => {
  const isSupplier = req.body.party_type === 'supplier' || req.body.partyType === 'supplier';
  if (isSupplier) {
    return router.handle({ ...req, url: '/suppliers', method: 'POST' }, res);
  }
  return router.handle({ ...req, url: '/customers', method: 'POST' }, res);
});

// ==================== CREDIT TRANSACTIONS ====================

// GET /api/credit-transactions
router.get('/credit-transactions', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { party_id, party_type, order = 'desc' } = req.query;

    let query = 'SELECT * FROM credit_transactions WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];

    if (party_id) {
      params.push(party_id);
      query += ` AND party_id = $${params.length}`;
    }
    if (party_type) {
      params.push(party_type);
      query += ` AND party_type = $${params.length}`;
    }

    const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY created_at ${safeOrder}`;
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/credit-transactions
router.post('/credit-transactions', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const {
      party_type = 'customer',
      party_id,
      type = 'credit',
      amount = 0,
      description = 'Opening balance',
      reference_id = '',
      reference_type = '',
    } = req.body;

    const result = await pool.query(
      `INSERT INTO credit_transactions (
        org_id, organization_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [orgId, party_type, party_id, type, amount, description, reference_id, reference_type, req.user?.id || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create credit transaction error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==================== BANK ACCOUNTS ====================

router.get('/bank-accounts', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'SELECT * FROM bank_accounts WHERE (org_id = $1 OR organization_id = $1) ORDER BY is_default DESC, name ASC',
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/bank-accounts', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { name, type = 'bank', account_number, bank_name, ifsc, opening_balance = 0, is_default = false } = req.body;
    const result = await pool.query(
      `INSERT INTO bank_accounts (org_id, organization_id, name, type, account_number, bank_name, ifsc, opening_balance, is_default)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orgId, name, type, account_number, bank_name, ifsc, opening_balance, is_default]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/bank-accounts/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM bank_accounts WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
