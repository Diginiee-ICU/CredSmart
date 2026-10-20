const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ==================== INVOICE SEQUENCES ====================

router.get('/sales/next-sequence', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
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

router.get('/sales', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.json([]);

    const { customer_id, start_date, end_date, payment_status } = req.query;
    let query = 'SELECT * FROM sales WHERE (org_id = $1 OR organization_id = $1)';
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

router.get('/sales/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const saleRes = await pool.query(
      'SELECT * FROM sales WHERE id = $1 AND (org_id = $2 OR organization_id = $2)',
      [req.params.id, orgId]
    );
    if (saleRes.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const itemsRes = await pool.query(
      'SELECT * FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2) ORDER BY created_at ASC',
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

router.post('/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const effectiveTotal = req.body.total_amount != null ? req.body.total_amount : (req.body.total != null ? req.body.total : (req.body.grand_total != null ? req.body.grand_total : 0));
    const effectiveTax = req.body.tax_amount != null ? req.body.tax_amount : (req.body.tax != null ? req.body.tax : 0);
    const effectiveDiscount = req.body.discount_amount != null ? req.body.discount_amount : (req.body.discount != null ? req.body.discount : 0);
    const effectivePaid = req.body.paid_amount != null ? req.body.paid_amount : (req.body.amount_paid != null ? req.body.amount_paid : (req.body.payment_status === 'paid' ? effectiveTotal : 0));
    const paymentStatus = req.body.payment_status || (Number(effectivePaid) >= Number(effectiveTotal) && Number(effectiveTotal) > 0 ? 'paid' : (Number(effectivePaid) > 0 ? 'partial' : 'unpaid'));

    const {
      id: customId,
      invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
      sale_date = new Date(), subtotal = 0, payment_method = 'cash', notes,
      items: rawItems, sale_items: altItems
    } = req.body;
    const items = rawItems || altItems || [];

    await client.query('BEGIN');

    let saleRes;
    if (customId) {
      saleRes = await client.query(
        `INSERT INTO sales (
          id, org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
          sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
          payment_method, payment_status, notes, created_by
        ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          invoice_number = EXCLUDED.invoice_number,
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          customer_gstin = EXCLUDED.customer_gstin,
          sale_date = EXCLUDED.sale_date,
          subtotal = EXCLUDED.subtotal,
          discount_amount = EXCLUDED.discount_amount,
          tax_amount = EXCLUDED.tax_amount,
          total_amount = EXCLUDED.total_amount,
          paid_amount = EXCLUDED.paid_amount,
          payment_method = EXCLUDED.payment_method,
          payment_status = EXCLUDED.payment_status,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *`,
        [
          customId, orgId, invoice_number, customer_id || null, customer_name || '', customer_phone || '', customer_gstin || '',
          sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
          payment_method, paymentStatus, notes || null, req.user?.id || null
        ]
      );
    } else {
      saleRes = await client.query(
        `INSERT INTO sales (
          org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
          sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
          payment_method, payment_status, notes, created_by
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          orgId, invoice_number, customer_id || null, customer_name || '', customer_phone || '', customer_gstin || '',
          sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
          payment_method, paymentStatus, notes || null, req.user?.id || null
        ]
      );
    }
    const sale = saleRes.rows[0];

    if (customId) {
      await client.query('DELETE FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2)', [sale.id, orgId]);
    }

    const insertedItems = [];
    for (const item of items) {
      const pId = item.product_id || item.productId || null;
      const pName = item.product_name || item.productName || item.name || 'Unnamed Item';
      const sku = item.sku || null;
      const hsn = item.hsn_code || item.hsn || null;
      const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
      const unit = item.unit || 'pcs';
      const rate = Number(item.rate ?? item.price ?? item.unit_price ?? item.mrp ?? 0) || 0;
      const discPct = Number(item.discount_percent ?? item.discount_percentage ?? item.discountPercent ?? 0) || 0;
      const discAmt = Number(item.discount_amount ?? item.discountAmount ?? 0) || 0;
      const gstRate = Number(item.gst_rate ?? item.tax_rate ?? item.taxRate ?? 0) || 0;
      const gstAmt = Number(item.gst_amount ?? item.tax_amount ?? item.taxAmount ?? 0) || 0;
      const total = Number(item.total ?? item.line_total ?? item.lineTotal ?? (qty * rate)) || 0;
      const batchId = item.batch_id || item.batchId || null;

      const itemRes = await client.query(
        `INSERT INTO sale_items (
          sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
          quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          sale.id, orgId, pId, pName, sku, hsn,
          qty, unit, rate, discPct, discAmt, gstRate, gstAmt, total, batchId
        ]
      );
      insertedItems.push(itemRes.rows[0]);

      if (batchId) {
        await client.query(
          `UPDATE product_batches SET quantity = quantity - $1, stock = stock - $1, updated_at = NOW() WHERE id = $2 AND (org_id = $3 OR organization_id = $3)`,
          [qty, batchId, orgId]
        );
      }
    }

    const unpaidAmount = Number(effectiveTotal) - Number(effectivePaid);
    if (unpaidAmount > 0 && customer_id) {
      await client.query(
        `INSERT INTO credit_transactions (org_id, organization_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
         VALUES ($1, $1, 'customer', $2, 'credit', $3, $4, $5, 'sale', $6)`,
        [orgId, customer_id, unpaidAmount, `Invoice ${invoice_number || sale.id}`, sale.id, req.user?.id || null]
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

// POST /api/sales/bulk
router.post('/sales/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const rawItems = req.body.items || (Array.isArray(req.body) ? req.body : [req.body]);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(201).json({ success: true, count: 0, data: [] });
    }

    await client.query('BEGIN');
    const insertedSales = [];

    for (const item of rawItems) {
      const effectiveTotal = item.total_amount != null ? item.total_amount : (item.total != null ? item.total : (item.grand_total != null ? item.grand_total : 0));
      const effectiveTax = item.tax_amount != null ? item.tax_amount : (item.tax != null ? item.tax : 0);
      const effectiveDiscount = item.discount_amount != null ? item.discount_amount : (item.discount != null ? item.discount : 0);
      const effectivePaid = item.paid_amount != null ? item.paid_amount : (item.amount_paid != null ? item.amount_paid : (item.payment_status === 'paid' ? effectiveTotal : 0));
      const paymentStatus = item.payment_status || (Number(effectivePaid) >= Number(effectiveTotal) && Number(effectiveTotal) > 0 ? 'paid' : (Number(effectivePaid) > 0 ? 'partial' : 'unpaid'));

      let saleRes;
      if (item.id) {
        saleRes = await client.query(
          `INSERT INTO sales (
            id, org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
            sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
            payment_method, payment_status, notes, created_by
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            invoice_number = EXCLUDED.invoice_number,
            customer_id = EXCLUDED.customer_id,
            customer_name = EXCLUDED.customer_name,
            customer_phone = EXCLUDED.customer_phone,
            customer_gstin = EXCLUDED.customer_gstin,
            sale_date = EXCLUDED.sale_date,
            subtotal = EXCLUDED.subtotal,
            discount_amount = EXCLUDED.discount_amount,
            tax_amount = EXCLUDED.tax_amount,
            total_amount = EXCLUDED.total_amount,
            paid_amount = EXCLUDED.paid_amount,
            payment_method = EXCLUDED.payment_method,
            payment_status = EXCLUDED.payment_status,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING *`,
          [
            item.id, orgId, item.invoice_number, item.customer_id || null, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
            item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
            item.payment_method || 'cash', paymentStatus, item.notes || null, req.user?.id || null
          ]
        );
      } else {
        saleRes = await client.query(
          `INSERT INTO sales (
            org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
            sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
            payment_method, payment_status, notes, created_by
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            orgId, item.invoice_number, item.customer_id || null, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
            item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
            item.payment_method || 'cash', paymentStatus, item.notes || null, req.user?.id || null
          ]
        );
      }

      const sale = saleRes.rows[0];
      const lineItems = item.items || item.sale_items || [];
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        if (item.id) {
          await client.query('DELETE FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2)', [sale.id, orgId]);
        }
        for (const line of lineItems) {
          const pId = line.product_id || line.productId || null;
          const pName = line.product_name || line.productName || line.name || 'Unnamed Item';
          const sku = line.sku || null;
          const hsn = line.hsn_code || line.hsn || null;
          const qty = Number(line.quantity ?? line.qty ?? 1) || 1;
          const unit = line.unit || 'pcs';
          const rate = Number(line.rate ?? line.price ?? line.unit_price ?? line.mrp ?? 0) || 0;
          const discPct = Number(line.discount_percent ?? line.discount_percentage ?? line.discountPercent ?? 0) || 0;
          const discAmt = Number(line.discount_amount ?? line.discountAmount ?? 0) || 0;
          const gstRate = Number(line.gst_rate ?? line.tax_rate ?? line.taxRate ?? 0) || 0;
          const gstAmt = Number(line.gst_amount ?? line.tax_amount ?? line.taxAmount ?? 0) || 0;
          const total = Number(line.total ?? line.line_total ?? line.lineTotal ?? (qty * rate)) || 0;
          const batchId = line.batch_id || line.batchId || null;

          await client.query(
            `INSERT INTO sale_items (
              sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
              quantity, unit, rate, discount_percent, discount_amount,
              gst_rate, gst_amount, total, batch_id
            ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [sale.id, orgId, pId, pName, sku, hsn, qty, unit, rate, discPct, discAmt, gstRate, gstAmt, total, batchId]
          );
        }
      }

      insertedSales.push(sale);
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, count: insertedSales.length, data: insertedSales });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk sales error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/sales/:id
router.put('/sales/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { id } = req.params;
    const effectiveTotal = req.body.total_amount != null ? req.body.total_amount : (req.body.total != null ? req.body.total : (req.body.grand_total != null ? req.body.grand_total : 0));
    const effectiveTax = req.body.tax_amount != null ? req.body.tax_amount : (req.body.tax != null ? req.body.tax : 0);
    const effectiveDiscount = req.body.discount_amount != null ? req.body.discount_amount : (req.body.discount != null ? req.body.discount : 0);
    const effectivePaid = req.body.paid_amount != null ? req.body.paid_amount : (req.body.amount_paid != null ? req.body.amount_paid : 0);
    const {
      invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
      sale_date, subtotal, payment_method, payment_status, notes, items, sale_items
    } = req.body;
    const lineItems = items || sale_items;

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE sales SET
        invoice_number = COALESCE($1, invoice_number),
        customer_id = COALESCE($2, customer_id),
        customer_name = COALESCE($3, customer_name),
        customer_phone = COALESCE($4, customer_phone),
        customer_gstin = COALESCE($5, customer_gstin),
        sale_date = COALESCE($6, sale_date),
        subtotal = COALESCE($7, subtotal),
        discount_amount = COALESCE($8, discount_amount),
        tax_amount = COALESCE($9, tax_amount),
        total_amount = COALESCE($10, total_amount),
        paid_amount = COALESCE($11, paid_amount),
        payment_method = COALESCE($12, payment_method),
        payment_status = COALESCE($13, payment_status),
        notes = COALESCE($14, notes),
        updated_at = NOW()
      WHERE id = $15 AND (org_id = $16 OR organization_id = $16)
      RETURNING *`,
      [
        invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
        sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
        payment_method, payment_status, notes, id, orgId
      ]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sale not found' });
    }
    const sale = updateRes.rows[0];

    let insertedItems = [];
    if (lineItems && Array.isArray(lineItems)) {
      await client.query('DELETE FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2)', [id, orgId]);
      for (const item of lineItems) {
        const pId = item.product_id || item.productId || null;
        const pName = item.product_name || item.productName || item.name || 'Unnamed Item';
        const sku = item.sku || null;
        const hsn = item.hsn_code || item.hsn || null;
        const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
        const unit = item.unit || 'pcs';
        const rate = Number(item.rate ?? item.price ?? item.unit_price ?? item.mrp ?? 0) || 0;
        const discPct = Number(item.discount_percent ?? item.discount_percentage ?? item.discountPercent ?? 0) || 0;
        const discAmt = Number(item.discount_amount ?? item.discountAmount ?? 0) || 0;
        const gstRate = Number(item.gst_rate ?? item.tax_rate ?? item.taxRate ?? 0) || 0;
        const gstAmt = Number(item.gst_amount ?? item.tax_amount ?? item.taxAmount ?? 0) || 0;
        const total = Number(item.total ?? item.line_total ?? item.lineTotal ?? (qty * rate)) || 0;
        const batchId = item.batch_id || item.batchId || null;

        const itemRes = await client.query(
          `INSERT INTO sale_items (
            sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
            quantity, unit, rate, discount_percent, discount_amount,
            gst_rate, gst_amount, total, batch_id
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [id, orgId, pId, pName, sku, hsn, qty, unit, rate, discPct, discAmt, gstRate, gstAmt, total, batchId]
        );
        insertedItems.push(itemRes.rows[0]);
      }
    } else {
      const itemsRes = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
      insertedItems = itemsRes.rows;
    }

    await client.query('COMMIT');
    return res.json({ ...sale, items: insertedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/sales/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    await pool.query('DELETE FROM sales WHERE id = $1 AND (org_id = $2 OR organization_id = $2)', [req.params.id, orgId]);
    return res.json({ success: true, id: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================== SALE ITEMS ====================

router.get('/sale-items', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { sale_id } = req.query;
    let query = 'SELECT * FROM sale_items WHERE 1=1';
    const params = [];

    if (orgId) {
      params.push(orgId);
      query += ` AND (org_id = $${params.length} OR organization_id = $${params.length})`;
    }
    if (sale_id) {
      params.push(sale_id);
      query += ` AND sale_id = $${params.length}`;
    }

    query += ' ORDER BY created_at ASC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sale-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const items = req.body.items || (Array.isArray(req.body) ? req.body : [req.body]);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(201).json({ success: true, count: 0, data: [] });
    }

    await client.query('BEGIN');
    const insertedItems = [];

    for (const item of items) {
      const saleId = item.sale_id || item.saleId;
      const pId = item.product_id || item.productId || null;
      const pName = item.product_name || item.productName || item.name || 'Unnamed Item';
      const sku = item.sku || null;
      const hsn = item.hsn_code || item.hsn || null;
      const qty = Number(item.quantity ?? item.qty ?? 1) || 1;
      const unit = item.unit || 'pcs';
      const rate = Number(item.rate ?? item.price ?? item.unit_price ?? item.mrp ?? 0) || 0;
      const discPct = Number(item.discount_percent ?? item.discount_percentage ?? item.discountPercent ?? 0) || 0;
      const discAmt = Number(item.discount_amount ?? item.discountAmount ?? 0) || 0;
      const gstRate = Number(item.gst_rate ?? item.tax_rate ?? item.taxRate ?? 0) || 0;
      const gstAmt = Number(item.gst_amount ?? item.tax_amount ?? item.taxAmount ?? 0) || 0;
      const total = Number(item.total ?? item.line_total ?? item.lineTotal ?? (qty * rate)) || 0;
      const batchId = item.batch_id || item.batchId || null;

      const itemRes = await client.query(
        `INSERT INTO sale_items (
          sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
          quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [saleId, orgId, pId, pName, sku, hsn, qty, unit, rate, discPct, discAmt, gstRate, gstAmt, total, batchId]
      );
      insertedItems.push(itemRes.rows[0]);

      if (batchId) {
        await client.query(
          `UPDATE product_batches SET quantity = quantity - $1, stock = stock - $1, updated_at = NOW() WHERE id = $2 AND (org_id = $3 OR organization_id = $3)`,
          [qty, batchId, orgId]
        );
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, count: insertedItems.length, data: insertedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create sale-items error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

const deleteSaleItemsHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id || req.body?.organization_id;
    const saleId = req.params.saleId || req.query.sale_id || req.body?.sale_id;
    const itemId = req.params.id || req.query.id || req.body?.id;

    if (saleId) {
      let q = 'DELETE FROM sale_items WHERE sale_id = $1';
      const p = [saleId];
      if (orgId) {
        p.push(orgId);
        q += ` AND (org_id = $2 OR organization_id = $2)`;
      }
      await pool.query(q, p);
      return res.json({ success: true, sale_id: saleId });
    }

    if (itemId) {
      let q = 'DELETE FROM sale_items WHERE id = $1';
      const p = [itemId];
      if (orgId) {
        p.push(orgId);
        q += ` AND (org_id = $2 OR organization_id = $2)`;
      }
      await pool.query(q, p);
      return res.json({ success: true, id: itemId });
    }

    return res.status(400).json({ error: 'sale_id or id is required to delete sale-items' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

router.delete('/sale-items/sale/:saleId', deleteSaleItemsHandler);
router.delete('/sale-items/:id', deleteSaleItemsHandler);
router.delete('/sale-items', deleteSaleItemsHandler);

// ==================== PURCHASE INVOICES ====================

const getPurchasesHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const { supplier_id } = req.query;
    let query = 'SELECT * FROM purchase_invoices WHERE (org_id = $1 OR organization_id = $1)';
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
};

router.get('/purchase-invoices', getPurchasesHandler);
router.get('/purchases', getPurchasesHandler);

router.post('/purchase-invoices', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const {
      invoice_number, supplier_id, supplier_name, supplier_gstin,
      purchase_date = new Date(), subtotal = 0, discount_amount = 0,
      tax_amount = 0, total_amount = 0, paid_amount = 0,
      payment_method = 'cash', payment_status = 'unpaid', notes, items = []
    } = req.body;

    await client.query('BEGIN');

    const purchaseRes = await client.query(
      `INSERT INTO purchase_invoices (
        org_id, organization_id, invoice_number, supplier_id, supplier_name, supplier_gstin,
        purchase_date, subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, payment_method, payment_status, notes, created_by
      ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
          purchase_invoice_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
          quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          purchase.id, orgId, item.product_id, item.product_name, item.sku, item.hsn_code,
          item.quantity || 1, item.unit || 'pcs', item.rate || 0,
          item.discount_percent || 0, item.discount_amount || 0,
          item.gst_rate || 0, item.gst_amount || 0, item.total || 0, item.batch_id
        ]
      );
      insertedItems.push(itemRes.rows[0]);
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

module.exports = router;
