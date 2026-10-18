const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== INVOICE SEQUENCES ====================

// GET /api/sales/next-sequence
router.get('/sales/next-sequence', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      `INSERT INTO invoice_sequences (org_id, sales_prefix, sales_counter)
       VALUES ($1, 'INV', 1)
       ON CONFLICT (org_id)
       DO UPDATE SET sales_counter = invoice_sequences.sales_counter + 1, updated_at = NOW()
       RETURNING sales_prefix, sales_counter`,
      [orgId]
    );
    const row = result.rows[0];
    const prefix = row.sales_prefix || 'INV';
    const counter = String(row.sales_counter).padStart(4, '0');
    return res.json({ invoice_number: `${prefix}-${counter}`, prefix, counter: row.sales_counter });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SALES INVOICES ====================

// GET /api/sales
router.get('/sales', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    if (!orgId) return res.json([]);

    const { customer_id, start_date, end_date, payment_status } = req.query;
    let query = 'SELECT * FROM sales WHERE org_id = $1';
    const params = [orgId];

    if (customer_id) {
      params.push(customer_id);
      query += ` AND customer_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND sale_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND sale_date <= $${params.length}`;
    }
    if (payment_status) {
      params.push(payment_status);
      query += ` AND payment_status = $${params.length}`;
    }

    query += ' ORDER BY sale_date DESC, created_at DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/:id
router.get('/sales/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const saleRes = await pool.query(
      'SELECT * FROM sales WHERE id = $1 AND org_id = $2',
      [req.params.id, orgId]
    );
    if (saleRes.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const itemsRes = await pool.query(
      'SELECT * FROM sale_items WHERE sale_id = $1 AND org_id = $2 ORDER BY created_at ASC',
      [req.params.id, orgId]
    );

    return res.json({
      ...saleRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sales
router.post('/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
      sale_date = new Date(), subtotal = 0, discount_amount = 0, tax_amount = 0,
      total_amount = 0, paid_amount = 0, payment_method = 'cash', payment_status = 'unpaid',
      notes, items = []
    } = req.body;

    await client.query('BEGIN');

    // Insert sale
    const saleRes = await client.query(
      `INSERT INTO sales (
        org_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
        sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
        payment_method, payment_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        orgId, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
        sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
        payment_method, payment_status, notes, req.user?.id
      ]
    );
    const sale = saleRes.rows[0];

    // Insert line items & decrement stock
    const insertedItems = [];
    for (const item of items) {
      const itemRes = await client.query(
        `INSERT INTO sale_items (
          sale_id, org_id, product_id, product_name, sku, hsn_code,
          quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          sale.id, orgId, item.product_id, item.product_name, item.sku, item.hsn_code,
          item.quantity || 1, item.unit || 'pcs', item.rate || 0,
          item.discount_percent || 0, item.discount_amount || 0,
          item.gst_rate || 0, item.gst_amount || 0, item.total || 0, item.batch_id
        ]
      );
      insertedItems.push(itemRes.rows[0]);

      // If batch specified, decrement batch stock
      if (item.batch_id) {
        await client.query(
          `UPDATE product_batches SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 AND org_id = $3`,
          [Number(item.quantity || 1), item.batch_id, orgId]
        );
      }
    }

    // If partial or unpaid and customer_id exists, record credit transaction (Udhar)
    const unpaidAmount = Number(total_amount) - Number(paid_amount);
    if (unpaidAmount > 0 && customer_id) {
      await client.query(
        `INSERT INTO credit_transactions (org_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
         VALUES ($1, 'customer', $2, 'credit', $3, $4, $5, 'sale', $6)`,
        [orgId, customer_id, unpaidAmount, `Invoice ${invoice_number}`, sale.id, req.user?.id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ ...sale, items: insertedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/sales/:id
router.delete('/sales/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    await pool.query('DELETE FROM sales WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/sale-items
router.get('/sale-items', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { sale_id } = req.query;
    let query = 'SELECT * FROM sale_items WHERE org_id = $1';
    const params = [orgId];

    if (sale_id) {
      params.push(sale_id);
      query += ` AND sale_id = $${params.length}`;
    }
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== PURCHASES ====================

// GET /api/purchases
router.get('/purchases', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const { supplier_id } = req.query;
    let query = 'SELECT * FROM purchase_invoices WHERE org_id = $1';
    const params = [orgId];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND supplier_id = $${params.length}`;
    }
    query += ' ORDER BY purchase_date DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/purchases
router.post('/purchases', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id;
    const {
      invoice_number, supplier_id, supplier_name, supplier_gstin,
      purchase_date = new Date(), subtotal = 0, discount_amount = 0,
      tax_amount = 0, total_amount = 0, paid_amount = 0,
      payment_method = 'cash', payment_status = 'unpaid', notes, items = []
    } = req.body;

    await client.query('BEGIN');

    const purchaseRes = await client.query(
      `INSERT INTO purchase_invoices (
        org_id, invoice_number, supplier_id, supplier_name, supplier_gstin,
        purchase_date, subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_method, payment_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        orgId, invoice_number, supplier_id, supplier_name, supplier_gstin,
        purchase_date, subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_method, payment_status, notes, req.user?.id
      ]
    );
    const purchase = purchaseRes.rows[0];

    const insertedItems = [];
    for (const item of items) {
      const itemRes = await client.query(
        `INSERT INTO purchase_invoice_items (
          purchase_invoice_id, org_id, product_id, product_name, sku, hsn_code,
          quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          purchase.id, orgId, item.product_id, item.product_name, item.sku, item.hsn_code,
          item.quantity || 1, item.unit || 'pcs', item.rate || 0,
          item.discount_percent || 0, item.discount_amount || 0,
          item.gst_rate || 0, item.gst_amount || 0, item.total || 0, item.batch_id
        ]
      );
      insertedItems.push(itemRes.rows[0]);

      // Increase batch stock if batch_id provided
      if (item.batch_id) {
        await client.query(
          `UPDATE product_batches SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 AND org_id = $3`,
          [Number(item.quantity || 1), item.batch_id, orgId]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ ...purchase, items: insertedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================== EXPENSES ====================

// GET /api/expenses
router.get('/expenses', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query(
      'SELECT * FROM expenses WHERE org_id = $1 ORDER BY expense_date DESC',
      [orgId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/expenses', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { category, description, amount, expense_date = new Date(), payment_method = 'cash', reference } = req.body;

    const result = await pool.query(
      `INSERT INTO expenses (org_id, category, description, amount, expense_date, payment_method, reference, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, category, description, amount, expense_date, payment_method, reference, req.user?.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    await pool.query('DELETE FROM expenses WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== RETURNS ====================

// GET /api/returns/sales
router.get('/returns/sales', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM sales_returns WHERE org_id = $1 ORDER BY return_date DESC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/returns/sales
router.post('/returns/sales', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { sale_id, customer_id, return_date = new Date(), total_amount, reason, status = 'completed' } = req.body;

    const result = await pool.query(
      `INSERT INTO sales_returns (org_id, sale_id, customer_id, return_date, total_amount, reason, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, sale_id, customer_id, return_date, total_amount, reason, status, req.user?.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/returns/purchases
router.get('/returns/purchases', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id;
    const result = await pool.query('SELECT * FROM purchase_returns WHERE org_id = $1 ORDER BY return_date DESC', [orgId]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/returns/purchases
router.post('/returns/purchases', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id;
    const { purchase_invoice_id, supplier_id, return_date = new Date(), total_amount, reason, status = 'completed' } = req.body;

    const result = await pool.query(
      `INSERT INTO purchase_returns (org_id, purchase_invoice_id, supplier_id, return_date, total_amount, reason, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [orgId, purchase_invoice_id, supplier_id, return_date, total_amount, reason, status, req.user?.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
