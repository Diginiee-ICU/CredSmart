const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== PRODUCT BATCHES ====================

// GET /api/product-batches (supports ?product_id= or ?product_ids=UUID,UUID)
router.get('/product-batches', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { product_id, product_ids } = req.query;
    let query = 'SELECT * FROM product_batches WHERE (org_id = $1 OR organization_id = $1)';
    const params = [orgId];

    const targetIds = [];
    if (product_id) targetIds.push(String(product_id).trim());
    if (product_ids) {
      if (Array.isArray(product_ids)) {
        targetIds.push(...product_ids.map(s => String(s).trim()));
      } else {
        targetIds.push(...String(product_ids).split(',').map(s => s.trim()).filter(Boolean));
      }
    }

    if (targetIds.length === 1) {
      params.push(targetIds[0]);
      query += ` AND product_id = $${params.length}`;
    } else if (targetIds.length > 1) {
      params.push(targetIds);
      query += ` AND product_id = ANY($${params.length}::uuid[])`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get product-batches error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/product-batches
router.post('/product-batches', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const {
      product_id,
      godown_id,
      location_id,
      batch_number,
      expiry_date,
      quantity = 0,
      stock = 0,
      purchase_price = 0,
      cost_price = 0,
      selling_price = 0,
      mrp = 0,
    } = req.body;

    const effQty = quantity || stock || 0;
    const effCost = purchase_price || cost_price || 0;
    const effGodown = godown_id || location_id || null;

    const result = await pool.query(
      `INSERT INTO product_batches (
        org_id, organization_id, product_id, godown_id, location_id,
        batch_number, expiry_date, quantity, stock, purchase_price, cost_price, selling_price, mrp
      ) VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $6, $7, $7, $8, $9)
      RETURNING *`,
      [orgId, product_id, effGodown, batch_number, expiry_date, effQty, effCost, selling_price, mrp]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product-batch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/product-batches/bulk
router.post('/product-batches/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const rawBatches = req.body.batches || req.body.items || (Array.isArray(req.body) ? req.body : []);
    if (!Array.isArray(rawBatches) || rawBatches.length === 0) {
      return res.status(200).json({ success: true, count: 0, batches: [] });
    }

    await client.query('BEGIN');
    const inserted = [];

    for (const b of rawBatches) {
      const productId = b.product_id || b.productId;
      const godownId = b.godown_id || b.location_id || b.locationId || null;
      const batchNum = b.batch_number || b.batchNumber || '';
      const expDate = b.expiry_date || b.expiryDate || null;
      const qty = Number(b.quantity ?? b.stock ?? b.current_stock ?? b.currentStock ?? 0) || 0;
      const cost = Number(b.purchase_price ?? b.cost_price ?? b.costPrice ?? 0) || 0;
      const mrpVal = Number(b.mrp ?? 0) || 0;
      const sellPrice = Number(b.selling_price ?? b.sellingPrice ?? mrpVal) || mrpVal;

      if (b.id) {
        const resB = await client.query(
          `INSERT INTO product_batches (
            id, org_id, organization_id, product_id, godown_id, location_id,
            batch_number, expiry_date, quantity, stock, purchase_price, cost_price, selling_price, mrp, updated_at
          ) VALUES ($1, $2, $2, $3, $4, $4, $5, $6, $7, $7, $8, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            godown_id = EXCLUDED.godown_id,
            location_id = EXCLUDED.location_id,
            batch_number = EXCLUDED.batch_number,
            expiry_date = EXCLUDED.expiry_date,
            quantity = EXCLUDED.quantity,
            stock = EXCLUDED.stock,
            purchase_price = EXCLUDED.purchase_price,
            cost_price = EXCLUDED.cost_price,
            selling_price = EXCLUDED.selling_price,
            mrp = EXCLUDED.mrp,
            updated_at = NOW()
          RETURNING *`,
          [b.id, orgId, productId, godownId, batchNum, expDate, qty, cost, sellPrice, mrpVal]
        );
        inserted.push(resB.rows[0]);
      } else {
        const resB = await client.query(
          `INSERT INTO product_batches (
            org_id, organization_id, product_id, godown_id, location_id,
            batch_number, expiry_date, quantity, stock, purchase_price, cost_price, selling_price, mrp
          ) VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $6, $7, $7, $8, $9)
          RETURNING *`,
          [orgId, productId, godownId, batchNum, expDate, qty, cost, sellPrice, mrpVal]
        );
        inserted.push(resB.rows[0]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, count: inserted.length, batches: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk product-batches error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/product-batches/bulk-delete
router.post('/product-batches/bulk-delete', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const productIds = req.body.product_ids || req.body.productIds || [];
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const result = await pool.query(
      `DELETE FROM product_batches
       WHERE product_id = ANY($1::uuid[]) AND (org_id = $2 OR organization_id = $2)
       RETURNING id`,
      [productIds, orgId]
    );
    return res.json({ success: true, deletedCount: result.rowCount });
  } catch (err) {
    console.error('Bulk delete product-batches error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/product-batches/:id
router.put('/product-batches/:id', async (req, res) => {
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
      `UPDATE product_batches SET ${setClauses} WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING *`,
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
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM product_batches WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust-stock
router.post('/inventory/adjust-stock', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { batch_id, delta, reason } = req.body;
    if (!batch_id || delta === undefined) {
      return res.status(400).json({ error: 'batch_id and delta are required' });
    }

    const result = await pool.query(
      `UPDATE product_batches
       SET quantity = quantity + $1, stock = COALESCE(stock, quantity) + $1, updated_at = NOW()
       WHERE id = $2 AND (org_id = $3 OR organization_id = $3)
       RETURNING *`,
      [delta, batch_id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product batch not found' });
    }
    return res.json({ success: true, batch: result.rows[0], reason });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
