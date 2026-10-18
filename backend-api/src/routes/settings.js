const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== ORGANIZATIONS ====================

// GET /api/organizations
router.get('/organizations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, m.role as user_role
       FROM organizations o
       JOIN org_memberships m ON m.org_id = o.id
       WHERE m.user_id = $1
       ORDER BY o.created_at ASC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations
router.post('/organizations', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, gstin, pan, phone, email, address, city, state, pincode, logo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required' });

    await client.query('BEGIN');
    const orgRes = await client.query(
      `INSERT INTO organizations (name, gstin, pan, phone, email, address, city, state, pincode, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, gstin, pan, phone, email, address, city, state, pincode, logo_url]
    );
    const org = orgRes.rows[0];

    await client.query(
      `INSERT INTO org_memberships (user_id, org_id, role) VALUES ($1, $2, 'owner')`,
      [req.user.id, org.id]
    );

    await client.query(
      `INSERT INTO invoice_sequences (org_id, sales_prefix, sales_counter, purchase_prefix, purchase_counter)
       VALUES ($1, 'INV', 0, 'PUR', 0)
       ON CONFLICT (org_id) DO NOTHING`,
      [org.id]
    );

    await client.query('COMMIT');
    return res.status(201).json(org);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/organizations/:id
router.put('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE organizations SET ${setClauses} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== MEMBERSHIPS ====================

// GET /api/memberships
router.get('/memberships', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      `SELECT m.id, m.user_id, m.org_id, m.role, m.created_at,
              u.email, u.full_name, u.phone, u.avatar_url
       FROM org_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.org_id = $1
       ORDER BY m.created_at ASC`,
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/memberships
router.post('/memberships', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { email, role = 'staff' } = req.body;

    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not registered yet' });
    }

    const targetUserId = userRes.rows[0].id;
    const result = await pool.query(
      `INSERT INTO org_memberships (user_id, org_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [targetUserId, orgId, role, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/memberships/:id
router.delete('/memberships/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM org_memberships WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== PROFILES ====================

// GET /api/profiles
router.get('/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = $1', [req.user.id]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/profiles/:id
router.put('/profiles/:id', async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), avatar_url = COALESCE($3, avatar_url), updated_at = NOW()
       WHERE id = $4 RETURNING id, email, full_name, phone, avatar_url`,
      [full_name, phone, avatar_url, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== GODOWNS / WAREHOUSES ====================

// GET /api/godowns
router.get('/godowns', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM godowns WHERE org_id = $1 ORDER BY is_default DESC, name ASC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/godowns
router.post('/godowns', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { name, address, is_default = false } = req.body;
    const result = await pool.query(
      `INSERT INTO godowns (org_id, name, address, is_default) VALUES ($1, $2, $3, $4) RETURNING *`,
      [orgId, name, address, is_default]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== STOCK TRANSFERS ====================

// GET /api/stock-transfers
router.get('/stock-transfers', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM stock_transfers WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/stock-transfers
router.post('/stock-transfers', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { product_id, from_godown_id, to_godown_id, quantity, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO stock_transfers (org_id, product_id, from_godown_id, to_godown_id, quantity, notes, transferred_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [orgId, product_id, from_godown_id, to_godown_id, quantity, notes, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== ACTIVITY LOGS ====================

// GET /api/activity-logs
router.get('/activity-logs', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM activity_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 100', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/activity-logs
router.post('/activity-logs', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { action, entity_type, entity_id, details } = req.body;
    const result = await pool.query(
      `INSERT INTO activity_logs (org_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [orgId, req.user?.id, action, entity_type, entity_id, details ? JSON.stringify(details) : null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== STOREFRONT ====================

// GET /api/storefront
router.get('/storefront', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM storefront_settings WHERE org_id = $1 LIMIT 1', [orgId]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/storefront
router.put('/storefront', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { store_name, store_slug, banner_url, description, is_active = true, theme_color = '#4F46E5' } = req.body;
    const result = await pool.query(
      `INSERT INTO storefront_settings (org_id, store_name, store_slug, banner_url, description, is_active, theme_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (org_id)
       DO UPDATE SET store_name = EXCLUDED.store_name, store_slug = EXCLUDED.store_slug,
                     banner_url = EXCLUDED.banner_url, description = EXCLUDED.description,
                     is_active = EXCLUDED.is_active, theme_color = EXCLUDED.theme_color, updated_at = NOW()
       RETURNING *`,
      [orgId, store_name, store_slug, banner_url, description, is_active, theme_color]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
