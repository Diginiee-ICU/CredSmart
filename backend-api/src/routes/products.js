const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);

    const { search, category, is_active } = req.query;
    let query = 'SELECT * FROM products WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length} OR barcode ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === true);
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get products error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { barcode } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE (org_id = $1 OR organization_id = $1) AND barcode = $2 LIMIT 1',
      [orgId, barcode]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found with specified barcode' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/bulk
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const products = req.body.products || [];
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    await client.query('BEGIN');
    const inserted = [];

    for (const p of products) {
      const resP = await client.query(
        `INSERT INTO products (
          org_id, organization_id, name, sku, barcode, description, category, unit,
          purchase_price, selling_price, mrp, gst_rate, hsn_code,
          is_service, track_inventory, low_stock_alert, image_url, is_active
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          orgId, p.name, p.sku || '', p.barcode || '', p.description || '', p.category || '', p.unit || 'pcs',
          p.purchase_price || 0, p.selling_price || 0, p.mrp || 0, p.gst_rate || 0, p.hsn_code || '',
          p.is_service || false, p.track_inventory !== false, p.low_stock_alert || 5, p.image_url || '', p.is_active !== false
        ]
      );
      inserted.push(resP.rows[0]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ count: inserted.length, products: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const {
      name, sku = '', barcode = '', description = '', category = '', unit = 'pcs',
      purchase_price = 0, selling_price = 0, mrp = 0, gst_rate = 0, hsn_code = '',
      is_service = false, track_inventory = true, low_stock_alert = 5, image_url = '',
      is_active = true,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const result = await pool.query(
      `INSERT INTO products (
        org_id, organization_id, name, sku, barcode, description, category, unit,
        purchase_price, selling_price, mrp, gst_rate, hsn_code,
        is_service, track_inventory, low_stock_alert, image_url, is_active
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        orgId, name, sku, barcode, description, category, unit,
        purchase_price, selling_price, mrp, gst_rate, hsn_code,
        is_service, track_inventory, low_stock_alert, image_url, is_active
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND (org_id = $2 OR organization_id = $2)',
      [req.params.id, orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
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
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE products SET ${setClauses} WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING *`,
      [id, orgId, ...values]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id',
      [req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
