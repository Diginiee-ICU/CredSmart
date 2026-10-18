const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    if (!orgId) return res.json([]);

    const { search, category, is_active } = req.query;
    let query = 'SELECT * FROM products WHERE org_id = $1';
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
    const orgId = req.orgId || req.query.org_id;
    const { barcode } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE org_id = $1 AND barcode = $2 LIMIT 1',
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

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND org_id = $2',
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

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      name, sku, barcode, description, category, unit = 'pcs',
      purchase_price = 0, selling_price = 0, mrp = 0,
      gst_rate = 0, hsn_code, is_service = false,
      track_inventory = true, low_stock_alert = 5, image_url, is_active = true
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const result = await pool.query(
      `INSERT INTO products (
        org_id, name, sku, barcode, description, category, unit,
        purchase_price, selling_price, mrp, gst_rate, hsn_code,
        is_service, track_inventory, low_stock_alert, image_url, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE products SET ${setClauses} WHERE id = $1 AND org_id = $2 RETURNING *`,
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
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/bulk
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id;
    const items = req.body.products || req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array of products is required' });
    }

    await client.query('BEGIN');
    const created = [];
    for (const item of items) {
      const resItem = await client.query(
        `INSERT INTO products (
          org_id, name, sku, barcode, description, category, unit,
          purchase_price, selling_price, mrp, gst_rate, hsn_code,
          is_service, track_inventory, low_stock_alert, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          orgId, item.name, item.sku, item.barcode, item.description, item.category, item.unit || 'pcs',
          item.purchase_price || 0, item.selling_price || 0, item.mrp || 0,
          item.gst_rate || 0, item.hsn_code, item.is_service || false,
          item.track_inventory !== false, item.low_stock_alert || 5, item.is_active !== false
        ]
      );
      created.push(resItem.rows[0]);
    }
    await client.query('COMMIT');
    return res.json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/product-batches
router.get('/product-batches', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { product_id } = req.query;
    let query = 'SELECT * FROM product_batches WHERE org_id = $1';
    const params = [orgId];

    if (product_id) {
      params.push(product_id);
      query += ` AND product_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/product-batches
router.post('/product-batches', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { product_id, godown_id, batch_number, expiry_date, quantity = 0, purchase_price = 0, selling_price = 0 } = req.body;
    if (!product_id || !batch_number) {
      return res.status(400).json({ error: 'product_id and batch_number are required' });
    }

    const result = await pool.query(
      `INSERT INTO product_batches (org_id, product_id, godown_id, batch_number, expiry_date, quantity, purchase_price, selling_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, product_id, godown_id, batch_number, expiry_date, quantity, purchase_price, selling_price]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/product-batches/:id
router.put('/product-batches/:id', async (req, res) => {
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
      `UPDATE product_batches SET ${setClauses} WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, orgId, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/product-batches/:id
router.delete('/product-batches/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'DELETE FROM product_batches WHERE id = $1 AND org_id = $2 RETURNING id',
      [req.params.id, orgId]
    );
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust-stock
router.post('/adjust-stock', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { batch_id, delta, reason } = req.body;
    if (!batch_id || delta === undefined) {
      return res.status(400).json({ error: 'batch_id and delta are required' });
    }

    const result = await pool.query(
      `UPDATE product_batches
       SET quantity = quantity + $1, updated_at = NOW()
       WHERE id = $2 AND org_id = $3
       RETURNING *`,
      [Number(delta), batch_id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    return res.json({ success: true, batch: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
