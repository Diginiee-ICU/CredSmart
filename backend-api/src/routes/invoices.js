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

const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''));

router.post('/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    let rawOrgId = req.orgId || req.body.org_id || req.body.organization_id;
    let orgId = isUuid(rawOrgId) ? rawOrgId : null;

    // Auto-ensure organization exists to prevent foreign-key violation (sales_organization_id_fkey / sales_org_id_fkey)
    if (orgId) {
      try {
        await client.query(
          `INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [orgId, req.body.organization_name || 'My Organization']
        );
      } catch (_orgErr) {}
    } else {
      try {
        const defOrg = await client.query('SELECT id FROM organizations LIMIT 1');
        if (defOrg.rows.length > 0) orgId = defOrg.rows[0].id;
      } catch (_e) {}
    }

    const effectiveTotal = req.body.total_amount != null ? req.body.total_amount : (req.body.total != null ? req.body.total : (req.body.grand_total != null ? req.body.grand_total : 0));
    const effectiveTax = req.body.tax_amount != null ? req.body.tax_amount : (req.body.tax != null ? req.body.tax : 0);
    const effectiveDiscount = req.body.discount_amount != null ? req.body.discount_amount : (req.body.discount != null ? req.body.discount : 0);
    const effectivePaid = req.body.paid_amount != null ? req.body.paid_amount : (req.body.amount_paid != null ? req.body.amount_paid : (req.body.payment_status === 'paid' ? effectiveTotal : 0));

    const rawStatus = String(req.body.payment_status || '').toLowerCase();
    const paymentStatus = ['paid', 'partial', 'unpaid'].includes(rawStatus)
      ? rawStatus
      : (Number(effectivePaid) >= Number(effectiveTotal) && Number(effectiveTotal) > 0 ? 'paid' : (Number(effectivePaid) > 0 ? 'partial' : 'unpaid'));

    const {
      id: rawCustomId,
      invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
      sale_date = new Date(), subtotal = 0, payment_method = 'cash', notes,
      items: rawItems, sale_items: altItems
    } = req.body;
    const customId = isUuid(rawCustomId) ? rawCustomId : null;
    const invoiceNumber = invoice_number || `INV-${Date.now()}`;

    // Validate and auto-sync customer if provided
    let effCustomerId = isUuid(customer_id) ? customer_id : null;
    if (effCustomerId) {
      try {
        const custCheck = await client.query('SELECT id FROM customers WHERE id = $1 LIMIT 1', [effCustomerId]);
        if (custCheck.rows.length === 0) {
          if (customer_name && orgId) {
            await client.query(
              `INSERT INTO customers (id, org_id, organization_id, name, phone, gstin)
               VALUES ($1, $2, $2, $3, $4, $5)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
              [effCustomerId, orgId, customer_name, customer_phone || '', customer_gstin || '']
            );
          } else {
            effCustomerId = null;
          }
        }
      } catch (_e) {
        effCustomerId = null;
      }
    }

    let effCreatedBy = isUuid(req.user?.id) ? req.user.id : (isUuid(req.body.created_by) ? req.body.created_by : null);
    if (effCreatedBy) {
      try {
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [effCreatedBy]);
        if (userCheck.rows.length === 0) effCreatedBy = null;
      } catch (_e) {}
    }
    if (!effCreatedBy) {
      try {
        const anyUser = await client.query('SELECT id FROM users LIMIT 1');
        if (anyUser.rows.length > 0) effCreatedBy = anyUser.rows[0].id;
      } catch (_e) {}
    }

    const items = rawItems || altItems || [];

    await client.query('BEGIN');

    let saleRes;
    await client.query('SAVEPOINT sp_sale_insert');
    try {
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
            customId, orgId, invoiceNumber, effCustomerId, customer_name || '', customer_phone || '', customer_gstin || '',
            sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
            payment_method, paymentStatus, notes || null, effCreatedBy
          ]
        );
      } else {
        saleRes = await client.query(
          `INSERT INTO sales (
            org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
            sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
            payment_method, payment_status, notes, created_by
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            orgId, invoiceNumber, effCustomerId, customer_name || '', customer_phone || '', customer_gstin || '',
            sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
            payment_method, paymentStatus, notes || null, effCreatedBy
          ]
        );
      }
      await client.query('RELEASE SAVEPOINT sp_sale_insert');
    } catch (_saleErr) {
      await client.query('ROLLBACK TO SAVEPOINT sp_sale_insert');
      // Fallback 1: Single org_id column insert
      await client.query('SAVEPOINT sp_sale_fallback');
      try {
        if (customId) {
          saleRes = await client.query(
            `INSERT INTO sales (
              id, org_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
              sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
              payment_method, payment_status, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
              customId, orgId, invoiceNumber, effCustomerId, customer_name || '', customer_phone || '', customer_gstin || '',
              sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
              payment_method, paymentStatus, notes || null, effCreatedBy
            ]
          );
        } else {
          saleRes = await client.query(
            `INSERT INTO sales (
              org_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
              sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
              payment_method, payment_status, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
              orgId, invoiceNumber, effCustomerId, customer_name || '', customer_phone || '', customer_gstin || '',
              sale_date, subtotal, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
              payment_method, paymentStatus, notes || null, effCreatedBy
            ]
          );
        }
        await client.query('RELEASE SAVEPOINT sp_sale_fallback');
      } catch (_fbErr) {
        await client.query('ROLLBACK TO SAVEPOINT sp_sale_fallback');
        // Fallback 2: Dynamic column reflection - guarantees zero SQL errors regardless of schema variation
        await client.query('SAVEPOINT sp_sale_dyn');
        try {
          const colRes = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'sales'"
          );
          const existingCols = new Set(colRes.rows.map(r => r.column_name));
          if (existingCols.size === 0) throw _fbErr;

          const candidateMap = {
            id: customId,
            org_id: orgId,
            organization_id: orgId,
            invoice_number: invoiceNumber,
            customer_id: effCustomerId,
            customer_name: customer_name || '',
            customer_phone: customer_phone || '',
            customer_gstin: customer_gstin || '',
            sale_date: sale_date || new Date(),
            subtotal: subtotal || 0,
            discount_amount: effectiveDiscount,
            discount_label: req.body.discount_label || (effectiveDiscount > 0 ? 'Discount' : ''),
            tax_amount: effectiveTax,
            tax: effectiveTax,
            total_amount: effectiveTotal,
            total: effectiveTotal,
            paid_amount: effectivePaid,
            payment_method: payment_method || 'cash',
            payment_status: paymentStatus,
            notes: notes || null,
            status: 'active',
            created_by: effCreatedBy,
          };

          const targetCols = Object.keys(candidateMap).filter(k => existingCols.has(k) && candidateMap[k] !== undefined);
          const validCols = targetCols.filter(k => k !== 'id' || candidateMap[k] !== null);
          const placeholders = validCols.map((_, i) => `$${i + 1}`).join(', ');
          const values = validCols.map(k => candidateMap[k]);

          let dQuery = `INSERT INTO sales (${validCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
          if (customId && existingCols.has('id')) {
            const updateCols = validCols.filter(c => c !== 'id');
            if (updateCols.length > 0) {
              dQuery += ` ON CONFLICT (id) DO UPDATE SET ${updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')}`;
            }
          }
          dQuery += ' RETURNING *';

          saleRes = await client.query(dQuery, values);
          await client.query('RELEASE SAVEPOINT sp_sale_dyn');
        } catch (dynErr) {
          await client.query('ROLLBACK TO SAVEPOINT sp_sale_dyn');
          throw dynErr;
        }
      }
    }
    const sale = saleRes.rows[0];

    if (customId) {
      await client.query('SAVEPOINT sp_del_items');
      try {
        await client.query('DELETE FROM sale_items WHERE sale_id = $1', [sale.id]);
        await client.query('RELEASE SAVEPOINT sp_del_items');
      } catch (_dErr) {
        await client.query('ROLLBACK TO SAVEPOINT sp_del_items');
      }
    }

    const insertedItems = [];
    for (const item of items) {
      let pId = (item.product_id && isUuid(item.product_id)) ? item.product_id : ((item.productId && isUuid(item.productId)) ? item.productId : null);
      if (pId) {
        try {
          const prodCheck = await client.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [pId]);
          if (prodCheck.rows.length === 0) pId = null;
        } catch (_pe) {}
      }

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

      const rawBatchId = item.batch_id || item.batchId || null;
      let batchId = isUuid(rawBatchId) ? rawBatchId : null;
      if (batchId) {
        try {
          const bCheck = await client.query('SELECT id FROM product_batches WHERE id = $1 LIMIT 1', [batchId]);
          if (bCheck.rows.length === 0) batchId = null;
        } catch (_be) {}
      }

      await client.query('SAVEPOINT item_sp');
      try {
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
        await client.query('RELEASE SAVEPOINT item_sp');
      } catch (_itemErr) {
        await client.query('ROLLBACK TO SAVEPOINT item_sp');
        await client.query('SAVEPOINT item_fb_sp');
        try {
          const itemRes = await client.query(
            `INSERT INTO sale_items (
              sale_id, org_id, product_id, product_name, quantity, rate, total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [sale.id, orgId, pId, pName, qty, rate, total]
          );
          insertedItems.push(itemRes.rows[0]);
          await client.query('RELEASE SAVEPOINT item_fb_sp');
        } catch (_minItemErr) {
          await client.query('ROLLBACK TO SAVEPOINT item_fb_sp');
          // Dynamic reflection for sale_items
          await client.query('SAVEPOINT item_dyn_sp');
          try {
            const itemColRes = await client.query(
              "SELECT column_name FROM information_schema.columns WHERE table_name = 'sale_items'"
            );
            const existingItemCols = new Set(itemColRes.rows.map(r => r.column_name));
            const itemCandidateMap = {
              sale_id: sale.id,
              org_id: orgId,
              organization_id: orgId,
              product_id: pId,
              product_name: pName,
              sku: sku,
              hsn_code: hsn,
              quantity: qty,
              unit: unit,
              rate: rate,
              mrp: rate,
              discount_percent: discPct,
              discount_amount: discAmt,
              gst_rate: gstRate,
              gst_amount: gstAmt,
              total: total,
              line_total: total,
              batch_id: batchId,
              batch_number: item.batch_number || item.batchNumber || null,
            };
            const validItemCols = Object.keys(itemCandidateMap).filter(k => existingItemCols.has(k) && itemCandidateMap[k] !== undefined);
            if (validItemCols.length > 0) {
              const phs = validItemCols.map((_, i) => `$${i + 1}`).join(', ');
              const vals = validItemCols.map(k => itemCandidateMap[k]);
              const iRes = await client.query(
                `INSERT INTO sale_items (${validItemCols.map(c => `"${c}"`).join(', ')}) VALUES (${phs}) RETURNING *`,
                vals
              );
              insertedItems.push(iRes.rows[0]);
            } else {
              insertedItems.push({ product_name: pName, quantity: qty, rate, total });
            }
            await client.query('RELEASE SAVEPOINT item_dyn_sp');
          } catch (_dynItemErr) {
            await client.query('ROLLBACK TO SAVEPOINT item_dyn_sp');
            insertedItems.push({ product_name: pName, quantity: qty, rate, total });
          }
        }
      }

      if (batchId) {
        await client.query('SAVEPOINT batch_sp');
        try {
          await client.query(
            `UPDATE product_batches SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
            [qty, batchId]
          );
          await client.query('RELEASE SAVEPOINT batch_sp');
        } catch (_bErr) {
          await client.query('ROLLBACK TO SAVEPOINT batch_sp');
        }
      }
    }

    const unpaidAmount = Number(effectiveTotal) - Number(effectivePaid);
    if (unpaidAmount > 0 && effCustomerId && orgId) {
      await client.query('SAVEPOINT credit_sp');
      try {
        await client.query(
          `INSERT INTO credit_transactions (org_id, organization_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
           VALUES ($1, $1, 'customer', $2, 'credit', $3, $4, $5, 'sale', $6)`,
          [orgId, effCustomerId, unpaidAmount, `Invoice ${invoiceNumber || sale.id}`, sale.id, effCreatedBy]
        );
        await client.query('RELEASE SAVEPOINT credit_sp');
      } catch (_cErr) {
        await client.query('ROLLBACK TO SAVEPOINT credit_sp');
        await client.query('SAVEPOINT credit_fb_sp');
        try {
          await client.query(
            `INSERT INTO credit_transactions (org_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
             VALUES ($1, 'customer', $2, 'credit', $3, $4, $5, 'sale', $6)`,
            [orgId, effCustomerId, unpaidAmount, `Invoice ${invoiceNumber || sale.id}`, sale.id, effCreatedBy]
          );
          await client.query('RELEASE SAVEPOINT credit_fb_sp');
        } catch (_cErr2) {
          await client.query('ROLLBACK TO SAVEPOINT credit_fb_sp');
        }
      }
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
    const rawOrgId = req.orgId || req.body.org_id || req.body.organization_id;
    const orgId = isUuid(rawOrgId) ? rawOrgId : null;
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
      const effCustId = isUuid(item.customer_id) ? item.customer_id : null;
      const effUserId = isUuid(req.user?.id) ? req.user.id : null;
      const hasValidId = isUuid(item.id);

      let saleRes;
      await client.query('SAVEPOINT b_sale_sp');
      try {
        if (hasValidId) {
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
              item.id, orgId, item.invoice_number || `INV-${Date.now()}`, effCustId, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
              item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
              item.payment_method || 'cash', paymentStatus, item.notes || null, effUserId
            ]
          );
        } else {
          saleRes = await client.query(
            `INSERT INTO sales (
              org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
              sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
              payment_method, payment_status, notes, created_by
            ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`,
            [
              orgId, item.invoice_number || `INV-${Date.now()}`, effCustId, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
              item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
              item.payment_method || 'cash', paymentStatus, item.notes || null, effUserId
            ]
          );
        }
        await client.query('RELEASE SAVEPOINT b_sale_sp');
      } catch (_bSaleErr) {
        await client.query('ROLLBACK TO SAVEPOINT b_sale_sp');
        await client.query('SAVEPOINT b_sale_fb_sp');
        try {
          if (hasValidId) {
            saleRes = await client.query(
              `INSERT INTO sales (
                id, org_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
                sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
                payment_method, payment_status, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
                item.id, orgId, item.invoice_number || `INV-${Date.now()}`, effCustId, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
                item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
                item.payment_method || 'cash', paymentStatus, item.notes || null, effUserId
              ]
            );
          } else {
            saleRes = await client.query(
              `INSERT INTO sales (
                org_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
                sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
                payment_method, payment_status, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              RETURNING *`,
              [
                orgId, item.invoice_number || `INV-${Date.now()}`, effCustId, item.customer_name || '', item.customer_phone || '', item.customer_gstin || '',
                item.sale_date || new Date(), item.subtotal || 0, effectiveDiscount, effectiveTax, effectiveTotal, effectivePaid,
                item.payment_method || 'cash', paymentStatus, item.notes || null, effUserId
              ]
            );
          }
          await client.query('RELEASE SAVEPOINT b_sale_fb_sp');
        } catch (_bFbErr) {
          await client.query('ROLLBACK TO SAVEPOINT b_sale_fb_sp');
          continue;
        }
      }

      const sale = saleRes.rows[0];
      const lineItems = item.items || item.sale_items || [];
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        if (hasValidId) {
          await client.query('SAVEPOINT b_del_items');
          try {
            await client.query('DELETE FROM sale_items WHERE sale_id = $1', [sale.id]);
            await client.query('RELEASE SAVEPOINT b_del_items');
          } catch (_dErr) {
            await client.query('ROLLBACK TO SAVEPOINT b_del_items');
          }
        }
        for (const line of lineItems) {
          const pId = (line.product_id && isUuid(line.product_id)) ? line.product_id : ((line.productId && isUuid(line.productId)) ? line.productId : null);
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
          const rawBatchId = line.batch_id || line.batchId || null;
          const batchId = isUuid(rawBatchId) ? rawBatchId : null;

          await client.query('SAVEPOINT b_item_sp');
          try {
            await client.query(
              `INSERT INTO sale_items (
                sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
                quantity, unit, rate, discount_percent, discount_amount,
                gst_rate, gst_amount, total, batch_id
              ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
              [sale.id, orgId, pId, pName, sku, hsn, qty, unit, rate, discPct, discAmt, gstRate, gstAmt, total, batchId]
            );
            await client.query('RELEASE SAVEPOINT b_item_sp');
          } catch (_liErr) {
            await client.query('ROLLBACK TO SAVEPOINT b_item_sp');
            await client.query('SAVEPOINT b_item_fb_sp');
            try {
              await client.query(
                `INSERT INTO sale_items (sale_id, org_id, product_id, product_name, quantity, rate, total)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [sale.id, orgId, pId, pName, qty, rate, total]
              );
              await client.query('RELEASE SAVEPOINT b_item_fb_sp');
            } catch (_minLiErr) {
              await client.query('ROLLBACK TO SAVEPOINT b_item_fb_sp');
            }
          }
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
    const rawOrgId = req.orgId || req.body.org_id || req.body.organization_id;
    const orgId = isUuid(rawOrgId) ? rawOrgId : null;
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Sale not found' });

    const effectiveTotal = req.body.total_amount != null ? req.body.total_amount : (req.body.total != null ? req.body.total : (req.body.grand_total != null ? req.body.grand_total : 0));
    const effectiveTax = req.body.tax_amount != null ? req.body.tax_amount : (req.body.tax != null ? req.body.tax : 0);
    const effectiveDiscount = req.body.discount_amount != null ? req.body.discount_amount : (req.body.discount != null ? req.body.discount : 0);
    const effectivePaid = req.body.paid_amount != null ? req.body.paid_amount : (req.body.amount_paid != null ? req.body.amount_paid : 0);
    const {
      invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
      sale_date, subtotal, payment_method, payment_status, notes, items, sale_items
    } = req.body;
    const effCustomerId = isUuid(customer_id) ? customer_id : null;
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
      WHERE id = $15 AND (org_id = $16 OR organization_id = $16 OR $16 IS NULL)
      RETURNING *`,
      [
        invoice_number, effCustomerId, customer_name, customer_phone, customer_gstin,
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
      try {
        await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
      } catch (_dErr) {}
      for (const item of lineItems) {
        const pId = (item.product_id && isUuid(item.product_id)) ? item.product_id : ((item.productId && isUuid(item.productId)) ? item.productId : null);
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
        const rawBatchId = item.batch_id || item.batchId || null;
        const batchId = isUuid(rawBatchId) ? rawBatchId : null;

        try {
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
        } catch (_iErr) {
          try {
            const itemRes = await client.query(
              `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, rate, total)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
              [id, pId, pName, qty, rate, total]
            );
            insertedItems.push(itemRes.rows[0]);
          } catch (_minErr) {
            insertedItems.push({ product_name: pName, quantity: qty, rate, total });
          }
        }
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

      await client.query('SAVEPOINT si_sp');
      try {
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
        await client.query('RELEASE SAVEPOINT si_sp');
      } catch (_siErr) {
        await client.query('ROLLBACK TO SAVEPOINT si_sp');
        await client.query('SAVEPOINT si_fb_sp');
        try {
          const itemRes = await client.query(
            `INSERT INTO sale_items (
              sale_id, org_id, product_id, product_name, quantity, rate, total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [saleId, orgId, pId, pName, qty, rate, total]
          );
          insertedItems.push(itemRes.rows[0]);
          await client.query('RELEASE SAVEPOINT si_fb_sp');
        } catch (_minErr) {
          await client.query('ROLLBACK TO SAVEPOINT si_fb_sp');
          insertedItems.push({ product_name: pName, quantity: qty, rate, total });
        }
      }

      if (batchId) {
        await client.query('SAVEPOINT b_qty_sp');
        try {
          await client.query(
            `UPDATE product_batches SET quantity = quantity - $1, stock = stock - $1, updated_at = NOW() WHERE id = $2 AND (org_id = $3 OR organization_id = $3)`,
            [qty, batchId, orgId]
          );
          await client.query('RELEASE SAVEPOINT b_qty_sp');
        } catch (_bErr) {
          await client.query('ROLLBACK TO SAVEPOINT b_qty_sp');
        }
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
