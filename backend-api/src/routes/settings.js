const express = require('express');
const pool = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Middleware: allow optional auth for public storefront reading and orders, require auth for tenant settings
router.use((req, res, next) => {
  if (req.path.startsWith('/storefront')) {
    return optionalAuth(req, res, next);
  }
  return authenticate(req, res, next);
});

// ==================== ORGANIZATIONS ====================

// GET /api/organizations
router.get('/organizations', async (req, res) => {
  try {
    let result;
    try {
      result = await pool.query(
        `SELECT o.*, COALESCE(m.role, 'owner') as user_role
         FROM organizations o
         LEFT JOIN (
           SELECT org_id, user_id, role FROM org_memberships
           UNION
           SELECT organization_id as org_id, user_id, role FROM organization_memberships
         ) m ON (m.org_id = o.id) AND m.user_id = $1
         ORDER BY o.created_at ASC`,
        [req.user.id]
      );
    } catch (_unionErr) {
      result = await pool.query(
        `SELECT o.*, COALESCE(m.role, 'owner') as user_role
         FROM organizations o
         LEFT JOIN org_memberships m ON (m.org_id = o.id) AND m.user_id = $1
         ORDER BY o.created_at ASC`,
        [req.user.id]
      );
    }
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

    let rows = [];
    let queryErr = null;

    // Try org_memberships first
    try {
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
        try {
          const testRes = await pool.query(query + ` AND (m.org_id = $${params.length} OR m.organization_id = $${params.length}) ORDER BY m.created_at ASC`, params);
          rows = testRes.rows;
        } catch (_colErr) {
          const testRes = await pool.query(query + ` AND m.org_id = $${params.length} ORDER BY m.created_at ASC`, params);
          rows = testRes.rows;
        }
      } else {
        query += ' ORDER BY m.created_at ASC';
        const res1 = await pool.query(query, params);
        rows = res1.rows;
      }
    } catch (err1) {
      queryErr = err1;
      // Fallback: try organization_memberships
      try {
        let query2 = `
          SELECT m.*, u.email, u.full_name, u.phone, u.avatar_url
          FROM organization_memberships m
          LEFT JOIN users u ON u.id = m.user_id
          WHERE 1=1
        `;
        const params2 = [];
        if (user_id) {
          params2.push(user_id);
          query2 += ` AND m.user_id = $${params2.length}`;
        }
        if (targetOrg) {
          params2.push(targetOrg);
          query2 += ` AND m.organization_id = $${params2.length}`;
        }
        query2 += ' ORDER BY m.created_at ASC';
        const res2 = await pool.query(query2, params2);
        rows = res2.rows;
        queryErr = null;
      } catch (err2) {
        console.error('Get memberships fallback error:', err2);
      }
    }

    if (queryErr && rows.length === 0) {
      console.warn('Membership query warning:', queryErr.message);
      return res.json([]);
    }

    const normalized = rows.map(r => ({
      ...r,
      org_id: r.org_id || r.organization_id,
      organization_id: r.organization_id || r.org_id,
    }));

    return res.json(normalized);
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

const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''));

const getStorefrontHandler = async (req, res) => {
  try {
    const target = req.params.orgId || req.params.slug || req.orgId || req.query.org_id || req.query.organization_id || req.query.slug;
    if (!target) return res.json(null);

    let result;
    if (isUuid(target)) {
      result = await pool.query(
        'SELECT * FROM storefront_settings WHERE org_id = $1 OR organization_id = $1 OR store_slug = $1 LIMIT 1',
        [target]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM storefront_settings WHERE store_slug = $1 OR store_name = $1 LIMIT 1',
        [target]
      );
    }
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Get storefront settings error:', err);
    return res.status(500).json({ error: err.message });
  }
};

const saveStorefrontHandler = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const {
      store_name,
      name,
      store_slug,
      slug,
      banner_url,
      description,
      is_active,
      is_enabled,
      theme_color,
      whatsapp_number,
      contact_phone,
      logo_url,
      tagline,
      address,
      city,
      state,
      pincode,
      upi_id,
      minimum_order_amount,
      delivery_charges,
      free_delivery_above,
      enable_home_delivery,
      enable_store_pickup,
      custom_announcement,
      social_links,
    } = req.body;

    const effName = store_name || name || 'My Business Store';
    const rawSlug = store_slug || slug;
    const effSlug = (rawSlug && String(rawSlug).trim())
      ? String(rawSlug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : `store-${String(orgId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
    const effActive = is_active !== undefined ? Boolean(is_active) : (is_enabled !== undefined ? Boolean(is_enabled) : true);

    // 1. Check if record already exists for this org
    let existing;
    try {
      existing = await pool.query(
        'SELECT id, store_slug, slug FROM storefront_settings WHERE org_id = $1 OR organization_id = $1 LIMIT 1',
        [orgId]
      );
    } catch (_qErr) {
      existing = await pool.query(
        'SELECT id, store_slug FROM storefront_settings WHERE org_id = $1 OR organization_id = $1 LIMIT 1',
        [orgId]
      );
    }

    let row;
    if (existing.rows.length > 0) {
      const existingId = existing.rows[0].id;
      let finalSlug = effSlug;
      try {
        const slugCheck = await pool.query(
          'SELECT id FROM storefront_settings WHERE (store_slug = $1 OR slug = $1) AND id != $2 LIMIT 1',
          [finalSlug, existingId]
        );
        if (slugCheck.rows.length > 0) {
          finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
        }
      } catch (_sErr) {}

      try {
        // Try full update with all columns
        const updateRes = await pool.query(
          `UPDATE storefront_settings SET
             store_name = COALESCE($1, store_name),
             store_slug = COALESCE($2, store_slug),
             slug = COALESCE($2, slug),
             banner_url = COALESCE($3, banner_url),
             description = COALESCE($4, description),
             is_active = COALESCE($5, is_active),
             is_enabled = COALESCE($5, is_enabled),
             theme_color = COALESCE($6, theme_color),
             whatsapp_number = COALESCE($7, whatsapp_number),
             contact_phone = COALESCE($8, contact_phone),
             logo_url = COALESCE($9, logo_url),
             tagline = COALESCE($10, tagline),
             address = COALESCE($11, address),
             city = COALESCE($12, city),
             state = COALESCE($13, state),
             pincode = COALESCE($14, pincode),
             upi_id = COALESCE($15, upi_id),
             minimum_order_amount = COALESCE($16, minimum_order_amount),
             delivery_charges = COALESCE($17, delivery_charges),
             free_delivery_above = COALESCE($18, free_delivery_above),
             enable_home_delivery = COALESCE($19, enable_home_delivery),
             enable_store_pickup = COALESCE($20, enable_store_pickup),
             custom_announcement = COALESCE($21, custom_announcement),
             social_links = COALESCE($22, social_links),
             updated_at = NOW()
           WHERE id = $23
           RETURNING *`,
          [
            effName, finalSlug, banner_url, description, effActive, theme_color,
            whatsapp_number, contact_phone, logo_url, tagline, address, city, state, pincode,
            upi_id, minimum_order_amount, delivery_charges, free_delivery_above,
            enable_home_delivery, enable_store_pickup, custom_announcement,
            social_links ? JSON.stringify(social_links) : null,
            existingId
          ]
        );
        row = updateRes.rows[0];
      } catch (colErr) {
        // Fallback for minimal schema before fix_db.sql is run
        const fallbackRes = await pool.query(
          `UPDATE storefront_settings SET
             store_name = COALESCE($1, store_name),
             store_slug = COALESCE($2, store_slug),
             banner_url = COALESCE($3, banner_url),
             description = COALESCE($4, description),
             is_active = COALESCE($5, is_active),
             theme_color = COALESCE($6, theme_color),
             updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [effName, finalSlug, banner_url, description, effActive, theme_color, existingId]
        );
        row = fallbackRes.rows[0];
      }
    } else {
      let finalSlug = effSlug;
      try {
        const slugCheck = await pool.query(
          'SELECT id FROM storefront_settings WHERE store_slug = $1 OR slug = $1 LIMIT 1',
          [finalSlug]
        );
        if (slugCheck.rows.length > 0) {
          finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
        }
      } catch (_sErr) {}

      try {
        // Full insert
        const insertRes = await pool.query(
          `INSERT INTO storefront_settings (
             org_id, organization_id, store_name, store_slug, slug,
             banner_url, description, is_active, is_enabled, theme_color,
             whatsapp_number, contact_phone, logo_url, tagline, address, city, state, pincode,
             upi_id, minimum_order_amount, delivery_charges, free_delivery_above,
             enable_home_delivery, enable_store_pickup, custom_announcement, social_links
           ) VALUES (
             $1, $1, $2, $3, $3,
             $4, $5, $6, $6, $7,
             $8, $9, $10, $11, $12, $13, $14, $15,
             $16, $17, $18, $19,
             $20, $21, $22, $23
           ) RETURNING *`,
          [
            orgId, effName, finalSlug,
            banner_url, description, effActive, theme_color,
            whatsapp_number, contact_phone, logo_url, tagline, address, city, state, pincode,
            upi_id, minimum_order_amount, delivery_charges, free_delivery_above,
            enable_home_delivery, enable_store_pickup, custom_announcement,
            social_links ? JSON.stringify(social_links) : '{}'
          ]
        );
        row = insertRes.rows[0];
      } catch (colErr) {
        // Fallback insert with core columns
        const fallbackInsert = await pool.query(
          `INSERT INTO storefront_settings (
             org_id, organization_id, store_name, store_slug, banner_url, description, is_active, theme_color
           ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [orgId, effName, finalSlug, banner_url, description, effActive, theme_color]
        );
        row = fallbackInsert.rows[0];
      }
    }

    const normalized = {
      ...row,
      organization_id: row.org_id || row.organization_id || orgId,
      slug: row.store_slug || row.slug || effSlug,
      store_slug: row.store_slug || row.slug || effSlug,
      is_enabled: row.is_active !== undefined ? row.is_active : row.is_enabled,
      is_active: row.is_active !== undefined ? row.is_active : row.is_enabled,
    };
    return res.json(normalized);
  } catch (err) {
    console.error('Save storefront error:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.get('/storefront-settings', getStorefrontHandler);
router.get('/storefront', getStorefrontHandler);
router.get('/storefront-settings/:orgId', getStorefrontHandler);
router.get('/storefront/:orgId', getStorefrontHandler);
router.post('/storefront-settings', saveStorefrontHandler);
router.post('/storefront', saveStorefrontHandler);
router.put('/storefront-settings', saveStorefrontHandler);
router.put('/storefront', saveStorefrontHandler);
router.patch('/storefront-settings', saveStorefrontHandler);
router.patch('/storefront', saveStorefrontHandler);

// ==================== STOREFRONT ORDERS ====================

// GET /api/storefront-orders
const getStorefrontOrdersHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);
    const { limit = 50, status } = req.query;
    let query = 'SELECT * FROM storefront_orders WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit) || 50);

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get storefront orders error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/storefront-orders
const createStorefrontOrderHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const {
      customer_name,
      customer_phone,
      customer_address,
      items,
      total_amount = 0,
      status = 'pending',
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO storefront_orders (org_id, organization_id, customer_name, customer_phone, customer_address, items, total_amount, status, notes)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, customer_name, customer_phone, customer_address, JSON.stringify(items || []), total_amount, status, notes]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create storefront order error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/storefront-orders/:id
const updateStorefrontOrderHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { status, notes } = req.body;
    const result = await pool.query(
      `UPDATE storefront_orders
       SET status = COALESCE($1, status), notes = COALESCE($2, notes)
       WHERE id = $3 AND (org_id = $4 OR organization_id = $4)
       RETURNING *`,
      [status, notes, req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update storefront order error:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.get('/storefront-orders', getStorefrontOrdersHandler);
router.get('/storefront/orders', getStorefrontOrdersHandler);
router.post('/storefront-orders', createStorefrontOrderHandler);
router.post('/storefront/orders', createStorefrontOrderHandler);
router.put('/storefront-orders/:id', updateStorefrontOrderHandler);
router.put('/storefront/orders/:id', updateStorefrontOrderHandler);
router.patch('/storefront-orders/:id', updateStorefrontOrderHandler);
router.patch('/storefront/orders/:id', updateStorefrontOrderHandler);

// ==================== AUDIT / ACTIVITY LOGS ====================

router.get('/audit-logs', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT * FROM activity_logs
       WHERE (org_id = $1 OR organization_id = $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, Number(limit) || 50, Number(offset) || 0]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Get audit-logs error:', err);
    return res.json([]);
  }
});

router.post('/audit-logs', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const {
      user_id = req.user?.id,
      action,
      entity_type,
      resource_type,
      entity_id,
      resource_id,
      details,
    } = req.body;

    const effType = entity_type || resource_type || 'system';
    const effId = entity_id || resource_id || null;

    const result = await pool.query(
      `INSERT INTO activity_logs (org_id, organization_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, user_id, action, effType, effId, JSON.stringify(details || {})]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create audit-log error:', err);
    return res.status(201).json({ success: true });
  }
});

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
