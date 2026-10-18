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
      `SELECT o.*, COALESCE(m.role, 'owner') as user_role
       FROM organizations o
       LEFT JOIN (
         SELECT org_id, user_id, role FROM org_memberships
         UNION
         SELECT organization_id as org_id, user_id, role FROM organization_memberships
       ) m ON m.org_id = o.id AND m.user_id = $1
       ORDER BY o.created_at ASC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get organizations error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id
router.get('/organizations/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    return res.json(result.rows[0]);
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
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role) VALUES ($1, $2, $2, 'owner')`,
      [req.user.id, org.id]
    );

    await client.query(
      `INSERT INTO invoice_sequences (org_id, organization_id, sales_prefix, sales_counter, purchase_prefix, purchase_counter)
       VALUES ($1, $1, 'INV', 0, 'PUR', 0)
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
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 2}`).join(', ');
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

// ==================== ORGANIZATION MEMBERSHIPS ====================

const getMembershipsHandler = async (req, res) => {
  try {
    const { user_id, organization_id, org_id } = req.query;
    const targetOrg = organization_id || org_id || req.orgId;

    let query = `
      SELECT m.*, u.email, u.full_name, u.phone, u.avatar_url
      FROM org_memberships m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      params.push(user_id);
      query += ` AND m.user_id = $${params.length}`;
    }
    if (targetOrg) {
      params.push(targetOrg);
      query += ` AND (m.org_id = $${params.length} OR m.organization_id = $${params.length})`;
    }

    query += ' ORDER BY m.created_at ASC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get memberships error:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.get('/organization-memberships', getMembershipsHandler);
router.get('/memberships', getMembershipsHandler);

router.post('/organization-memberships', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { user_id, role = 'staff', invited_by } = req.body;
    const result = await pool.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role, invited_by)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [user_id, orgId, role, invited_by || req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/organization-memberships/upsert', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { user_id, role = 'staff' } = req.body;
    const result = await pool.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role, invited_by)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [user_id, orgId, role, req.user.id]
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/organization-memberships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const result = await pool.query(
      'UPDATE org_memberships SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Membership not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/organization-memberships/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM org_memberships WHERE id = $1', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== PROFILES ====================

router.get('/profiles/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = $1', [req.params.userId]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = $1', [req.user.id]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/profiles/:userId', async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const result = await pool.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         avatar_url = COALESCE($3, avatar_url),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, full_name, phone, avatar_url`,
      [full_name, phone, avatar_url, req.params.userId]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== STOREFRONT SETTINGS ====================

const getStorefrontHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json(null);
    const result = await pool.query(
      'SELECT * FROM storefront_settings WHERE org_id = $1 OR organization_id = $1 LIMIT 1',
      [orgId]
    );
    return res.json(result.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const saveStorefrontHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { store_name, store_slug, banner_url, description, is_active = true, theme_color } = req.body;
    const result = await pool.query(
      `INSERT INTO storefront_settings (org_id, organization_id, store_name, store_slug, banner_url, description, is_active, theme_color)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (store_slug)
       DO UPDATE SET
         store_name = EXCLUDED.store_name,
         banner_url = EXCLUDED.banner_url,
         description = EXCLUDED.description,
         is_active = EXCLUDED.is_active,
         theme_color = EXCLUDED.theme_color,
         updated_at = NOW()
       RETURNING *`,
      [orgId, store_name, store_slug || `store-${orgId?.slice(0, 8)}`, banner_url, description, is_active, theme_color]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/storefront-settings', getStorefrontHandler);
router.get('/storefront', getStorefrontHandler);
router.post('/storefront-settings', saveStorefrontHandler);
router.post('/storefront', saveStorefrontHandler);
router.put('/storefront-settings', saveStorefrontHandler);
router.put('/storefront', saveStorefrontHandler);

// ==================== LOCATIONS / GODOWNS ====================

const getLocationsHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);
    const result = await pool.query(
      'SELECT * FROM godowns WHERE org_id = $1 OR organization_id = $1 ORDER BY is_default DESC, name ASC',
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.get('/locations', getLocationsHandler);
router.get('/godowns', getLocationsHandler);

router.post('/locations', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { name, address = '', is_default = false } = req.body;
    const result = await pool.query(
      `INSERT INTO godowns (org_id, organization_id, name, address, is_default)
       VALUES ($1, $1, $2, $3, $4)
       RETURNING *`,
      [orgId, name, address, is_default]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.post('/godowns', async (req, res) => {
  return router.handle({ ...req, url: '/locations', method: 'POST' }, res);
});

router.put('/locations/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { name, address, is_default } = req.body;
    const result = await pool.query(
      `UPDATE godowns SET name = COALESCE($1, name), address = COALESCE($2, address), is_default = COALESCE($3, is_default)
       WHERE id = $4 AND (org_id = $5 OR organization_id = $5)
       RETURNING *`,
      [name, address, is_default, req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/locations/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM godowns WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
