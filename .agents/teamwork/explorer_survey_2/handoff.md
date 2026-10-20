# Handoff Report: Backend API Routes & Schema Alignment Survey

**Author**: Explorer Survey 2  
**Date**: 2026-10-20T10:55:00Z  
**Target Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2`  
**Primary Scope**: `backend-api/` (routes `invoices.js`, `settings.js`, `parties.js`, db connection, server entry points) and integration contracts with frontend services (`invoicesApi.ts`, `partiesApi.ts`, `settingsApi.ts`, `documentsService.ts`).

---

## 1. Observation

### Observation 1.1: Missing `POST /api/sale-items` and Line Item Persistence Failure
- **File**: `backend-api/src/routes/invoices.js` (Lines 1–255)
- **Observation**: `invoices.js` contains routes for `GET /sales/next-sequence`, `GET /sales`, `GET /sales/:id`, `POST /sales`, `DELETE /sales/:id`, `GET /purchase-invoices`, and `POST /purchase-invoices`.
- **Finding**: There is **NO `POST /sale-items`** or `GET /sale-items` route anywhere in `invoices.js` or `src/index.js`.
- **Frontend Caller**: `src/services/invoicesApi.ts`:
  ```typescript
  // Line 266-275
  export async function createSaleItems(
    items: Partial<SaleItem>[],
    orgId?: string
  ): Promise<ApiResponse<{ success: boolean; count?: number }>> {
    return apiPost<{ success: boolean; count?: number }>(
      "/sale-items",
      { items, organization_id: orgId },
      { organizationId: orgId }
    );
  }
  ```
- **Runtime Impact**: When `documentsService.saveDocument` executes `await invoicesApi.createSaleItems(saleItems, orgId)`, the request yields `HTTP 404 Route not found: POST /api/sale-items`. Line items are never saved to the database.

---

### Observation 1.2: Missing Line Item Deletion Endpoints
- **File**: `backend-api/src/routes/invoices.js`
- **Observation**: There is **NO `DELETE /sale-items`** and **NO `DELETE /sale-items/sale/:saleId`** route in `invoices.js`.
- **Frontend Caller**: `src/services/invoicesApi.ts`:
  ```typescript
  // Line 277-285
  export async function deleteSaleItemsBySaleId(
    saleId: string,
    orgId?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiDelete<{ success: boolean }>(
      `/sale-items?sale_id=${saleId}`,
      { organizationId: orgId }
    );
  }
  ```
- **Caller Context in `documentsService.ts`**:
  ```typescript
  // Line 614-616
  await invoicesApi.deleteSaleItemsBySaleId(doc.id, orgId);
  ```
- **Runtime Impact**: On invoice edit/update, line item cleanup fails with `HTTP 404`, resulting in duplicate line items or aborted save chains.

---

### Observation 1.3: Missing `POST /api/sales/bulk` Endpoint
- **File**: `backend-api/src/routes/invoices.js`
- **Observation**: `invoices.js` only provides single-sale creation `POST /sales`.
- **Frontend Caller**: `src/services/invoicesApi.ts`:
  ```typescript
  // Line 222-250
  export async function bulkInsertSales(...) {
    return apiPost("/sales/bulk", { items, strategy: "insert", organization_id: orgId }, ...);
  }
  export async function bulkUpsertSales(...) {
    return apiPost("/sales/bulk", { items, strategy: "upsert", organization_id: orgId }, ...);
  }
  ```
- **Runtime Impact**: Batch ingestion from Tally, CSV import, or bulk offline sync calling `/sales/bulk` fails with `HTTP 404`.

---

### Observation 1.4: Amount Field Dropping in `POST /api/sales`
- **File**: `backend-api/src/routes/invoices.js`
- **Verbatim Code** (Lines 93–98):
  ```javascript
  const {
    invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
    sale_date = new Date(), subtotal = 0, discount_amount = 0, tax_amount = 0,
    total_amount = 0, paid_amount = 0, payment_method = 'cash', payment_status = 'unpaid',
    notes, items = []
  } = req.body;
  ```
- **Frontend Caller** (`src/services/documentsService.ts` Lines 597–611 & 663–677):
  ```typescript
  const { data: saleData } = await invoicesApi.createSale({
    organization_id: orgId,
    invoice_number: doc.documentNumber,
    subtotal: doc.subtotal,
    discount_amount: doc.discountTotal,
    discount_label: doc.discountTotal > 0 ? "Discount" : null,
    tax: doc.taxTotal,           // <--- SENDS 'tax'
    total: doc.grandTotal,       // <--- SENDS 'total'
    payment_method: doc.paymentMethod || "Cash",
    created_by: userId,
    customer_id: doc.partyId || null,
  }, orgId);
  ```
- **Runtime Impact**: Because the route extracts only `tax_amount` and `total_amount`, the payload's `tax` and `total` are ignored. Both `tax_amount` and `total_amount` default to `0`. Consequently:
  1. The row in `sales` is persisted with `total_amount = 0.00` and `tax_amount = 0.00`.
  2. Unpaid amount calculation `unpaidAmount = Number(total_amount) - Number(paid_amount)` evaluates to `0 - paid_amount <= 0`, completely suppressing khata ledger credit transactions.

---

### Observation 1.5: Missing `PUT /api/sales/:id` and Non-Atomic Sale Updates
- **File**: `backend-api/src/routes/invoices.js`
- **Observation**: `router.put('/sales/:id', ...)` does **not exist**.
- **Frontend Caller**: `src/services/documentsService.ts` line 597 calls `invoicesApi.updateSale(doc.id, { ... })`.
- **Runtime Impact**: Invoice editing yields `HTTP 404` on `PUT /api/sales/:id`. The fallback creates a duplicate sale with a new ID instead of an in-place update.
- **Line Items Decoupling**: Currently `documentsService.saveDocument` attempts 3 sequential roundtrips: `POST/PUT /sales` -> `DELETE /sale-items` -> `POST /sale-items`. A network failure in step 2 or 3 leaves orphan sales without items.

---

### Observation 1.6: Storefront Aliasing & Missing Orders Route
- **File**: `backend-api/src/routes/settings.js` (Lines 240–285)
- **Observation**:
  - `router.get('/storefront-settings')` and `router.get('/storefront')` exist, but:
    1. Entire router is guarded by `router.use(authenticate)` (Line 6). Public store visitors (`/storefront/:slug`) querying without a bearer token receive `HTTP 401 Unauthorized`.
    2. Query handler requires `orgId = req.orgId || req.query.org_id`. It does not support lookup by `slug` (`req.query.slug` or `req.params.slug`).
    3. `saveStorefrontHandler` only saves 6 columns (`store_name`, `store_slug`, `banner_url`, `description`, `is_active`, `theme_color`). Columns like `logo_url`, `whatsapp_number`, `contact_phone`, `address`, `city`, `pincode`, `upi_id`, `delivery_charges` are dropped.
    4. Frontend expects `slug` and `is_enabled`, while DB has `store_slug` and `is_active`.
  - There is **NO `GET /storefront-orders`**, **NO `POST /storefront-orders`**, and **NO `PUT /storefront-orders/:id`**, yet `settingsApi.ts` calls all three (Lines 347–382).

---

### Observation 1.7: Membership Queries Crashing on Missing Column
- **File**: `backend-api/src/routes/settings.js` (Lines 113–132) & `src/middleware/auth.js` (Lines 26–36)
- **Verbatim Code in `settings.js`**:
  ```javascript
  // Line 127
  query += ` AND (m.org_id = $${params.length} OR m.organization_id = $${params.length})`;
  ```
- **Verbatim Code in `auth.js`**:
  ```javascript
  // Line 27-34
  SELECT COALESCE(org_id, organization_id) AS org_id FROM org_memberships ...
  ```
- **Database Schema (`backend-api/schema.sql` Lines 45–53)**:
  ```sql
  CREATE TABLE IF NOT EXISTS org_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'owner',
      invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, org_id)
  );
  ```
- **Runtime Impact**: In `schema.sql`, `org_memberships` only has `org_id` (NO `organization_id` column). Any SQL query containing `m.organization_id` or `COALESCE(org_id, organization_id)` immediately aborts with fatal PostgreSQL error:
  `error: column m.organization_id does not exist (code 42703)`
  This produces an unconditional `HTTP 500 Internal Server Error` on membership retrieval.

---

### Observation 1.8: `POST /customers` and `POST /suppliers` 500 Column Errors
- **File**: `backend-api/src/routes/parties.js` (Lines 104–133 & 320–349)
- **Verbatim Code**:
  ```javascript
  const result = await pool.query(
    `INSERT INTO customers (
      org_id, organization_id, name, phone, email, address, city, state, pincode,
      gstin, pan, credit_limit, opening_balance, balance_type, is_active,
      trade_name, shipping_address, category, credit_period_days, custom_fields
    ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
    [...]
  );
  ```
- **Database Schema (`backend-api/schema.sql` Lines 118–156)**:
  In `schema.sql`, `customers` and `suppliers` do NOT possess `organization_id`, `trade_name`, `shipping_address`, `category`, `credit_period_days`, or `custom_fields`.
- **Runtime Impact**: On unmigrated databases, running `POST /customers` or `POST /suppliers` causes PostgreSQL error `column "trade_name" does not exist (42703)` or `column "organization_id" does not exist`, throwing `HTTP 500`. Furthermore, if an empty string `""` is supplied for `credit_limit` or `opening_balance`, PostgreSQL NUMERIC parser fails with `invalid input syntax for type numeric: ""`.

---

## 2. Logic Chain

1. **Step 1 (Root Cause of Missing Data & List Invisibility)**:
   - When the user creates a customer or supplier, `parties.js` attempts an `INSERT` referencing columns (`organization_id`, `trade_name`, `custom_fields`) that do not exist if `fix_db.sql` hasn't run.
   - The query throws `42703`, returning HTTP 500.
   - When listing items or parties, `GET /customers`, `GET /products`, and `GET /sales` execute `WHERE (org_id = $1 OR organization_id = $1)`. If either column is missing, the query throws 500.
   - The frontend catches this error and sets table state to `[]` (empty array), making all data invisible.

2. **Step 2 (Root Cause of Invoice Zero Balances & 404s)**:
   - When saving an invoice, `documentsService.saveDocument` sends `tax` and `total`.
   - `invoices.js` line 95 looks exclusively for `tax_amount` and `total_amount`, defaulting both to `0`.
   - `sales` record is created with `0.00` total.
   - `documentsService` then calls `invoicesApi.createSaleItems` (`POST /api/sale-items`).
   - `invoices.js` has no `POST /sale-items` handler, returning HTTP 404.
   - Thus, invoices are either saved with zero values and zero line items, or fail outright.

3. **Step 3 (Root Cause of Hanging Bill Generation)**:
   - Because `POST /sales` and `POST /sale-items` are separated, and edit requires `PUT /sales/:id` -> `DELETE /sale-items` -> `POST /sale-items`, every invoice save triggers multiple sequential network roundtrips over high-latency HTTP connections.
   - Combined with client-side PDF generation (`html2canvas`) and synchronous network invoicing, bill generation takes several seconds.

4. **Step 4 (Resolution Requirement)**:
   - Schema alignment (`fix_db.sql`) must ensure dual columns (`org_id` and `organization_id`) and missing entity columns across all tables.
   - Backend routes must provide complete endpoint and field parity:
     1. Support `POST /sale-items` (bulk batching).
     2. Support `DELETE /sale-items` (query param `sale_id`) and `DELETE /sale-items/sale/:saleId`.
     3. Support `POST /sales/bulk` (insert & upsert).
     4. Normalize `total` <-> `total_amount` and `tax` <-> `tax_amount` in `POST /sales` and `PUT /sales/:id`.
     5. Handle `items` directly inside `POST /sales` and `PUT /sales/:id` within an atomic SQL transaction (`BEGIN ... COMMIT`).
     6. Alias `/storefront-settings` and `/storefront`, enable public unauthenticated viewing, and implement `/storefront-orders`.
     7. Make membership queries resilient against schema column differences.
     8. Sanitize numeric and JSON inputs in `POST /customers` and `POST /suppliers` with graceful column fallback.

---

## 3. Caveats

- **Read-Only Scope**: Per explorer guidelines, no production code or database migrations were applied during this survey. All proposed changes are documented as concrete specifications.
- **Live Database State**: The production server (`woodzire@credsmart:~/server`) runs PostgreSQL in Docker. The exact state of the live schema depends on whether `fix_db.sql` was previously applied or if the database was initialized purely from `schema.sql`. The recommended backend route fixes include defensive code fallbacks that function properly regardless of whether `fix_db.sql` has been executed.
- **Offline PWA Queue**: The frontend `offlineQueue.ts` replays queued requests using endpoint paths `/customers`, `/suppliers`, `/sales`, and `/sale-items`. Implementing these exact endpoint signatures ensures 100% offline replay compatibility.

---

## 4. Conclusion & Actionable Recommendations

### Recommendation 1: Implement `POST /api/sale-items` with Batching
In `backend-api/src/routes/invoices.js`:
- Register `router.post('/sale-items', async (req, res) => { ... })`.
- Normalize input: accept `{ items: [...] }`, raw array `[...]`, or single object `{ ... }`.
- Extract and normalize fields per item:
  - `sale_id: item.sale_id || item.saleId || req.body.sale_id`
  - `product_id: item.product_id || item.productId || null`
  - `product_name: item.product_name || item.productName || item.name || 'Item'`
  - `sku: item.sku || ''`
  - `hsn_code: item.hsn_code || item.hsnCode || item.hsn || ''`
  - `quantity: Number(item.quantity ?? item.qty ?? 1) || 1`
  - `unit: item.unit || 'pcs'`
  - `rate: Number(item.rate ?? item.mrp ?? item.price ?? 0) || 0`
  - `discount_percent: Number(item.discount_percent ?? item.discountPercent ?? 0) || 0`
  - `discount_amount: Number(item.discount_amount ?? item.discountAmount ?? 0) || 0`
  - `gst_rate: Number(item.gst_rate ?? item.gstRate ?? item.tax_rate ?? 0) || 0`
  - `gst_amount: Number(item.gst_amount ?? item.gstAmount ?? item.tax_amount ?? 0) || 0`
  - `total: Number(item.total ?? item.line_total ?? item.lineTotal ?? (rate * quantity)) || 0`
  - `batch_id: item.batch_id || item.batchId || null`
- Perform batch insert in chunks of 50 items using multi-row SQL inside a transaction:
  ```javascript
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    const BATCH_SIZE = 50;
    for (let i = 0; i < normalizedItems.length; i += BATCH_SIZE) {
      const chunk = normalizedItems.slice(i, i + BATCH_SIZE);
      const valueClauses = [];
      const params = [];
      chunk.forEach((item) => {
        const offset = params.length;
        valueClauses.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
        );
        params.push(
          item.sale_id, orgId, item.product_id, item.product_name, item.sku,
          item.hsn_code, item.quantity, item.unit, item.rate, item.discount_percent,
          item.discount_amount, item.gst_rate, item.gst_amount, item.total, item.batch_id
        );
      });
      const res = await client.query(
        `INSERT INTO sale_items (
          sale_id, org_id, organization_id, product_id, product_name, sku,
          hsn_code, quantity, unit, rate, discount_percent, discount_amount,
          gst_rate, gst_amount, total, batch_id
        ) VALUES ${valueClauses.join(', ')} RETURNING *`,
        params
      );
      inserted.push(...res.rows);
    }
    await client.query('COMMIT');
    return res.status(201).json({ success: true, count: inserted.length, items: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
  ```
- Also implement `GET /api/sale-items` (`router.get('/sale-items', ...)`): query by `sale_id` and `orgId`, returning item rows.

---

### Recommendation 2: Implement `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId`
In `backend-api/src/routes/invoices.js`:
```javascript
// Query-param or body based deletion: DELETE /api/sale-items?sale_id=...
router.delete('/sale-items', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const saleId = req.query.sale_id || req.body?.sale_id;
    const itemId = req.query.id || req.body?.id;

    if (!saleId && !itemId) {
      return res.status(400).json({ error: 'sale_id or id parameter is required' });
    }

    if (saleId) {
      const result = await pool.query(
        'DELETE FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id',
        [saleId, orgId]
      );
      return res.json({ success: true, count: result.rowCount });
    }

    const result = await pool.query(
      'DELETE FROM sale_items WHERE id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id',
      [itemId, orgId]
    );
    return res.json({ success: true, count: result.rowCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Path-param based deletion: DELETE /api/sale-items/sale/:saleId
router.delete('/sale-items/sale/:saleId', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    const result = await pool.query(
      'DELETE FROM sale_items WHERE sale_id = $1 AND (org_id = $2 OR organization_id = $2) RETURNING id',
      [req.params.saleId, orgId]
    );
    return res.json({ success: true, count: result.rowCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

---

### Recommendation 3: Implement `POST /api/sales/bulk`
In `backend-api/src/routes/invoices.js`:
```javascript
router.post('/sales/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const items = req.body.items || req.body.sales || (Array.isArray(req.body) ? req.body : []);
    const strategy = req.body.strategy || 'insert';

    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    await client.query('BEGIN');
    const results = [];

    for (const s of items) {
      const total_amount = Number(s.total_amount ?? s.total ?? s.grand_total ?? s.grandTotal ?? 0) || 0;
      const tax_amount = Number(s.tax_amount ?? s.tax ?? s.taxTotal ?? 0) || 0;
      const subtotal = Number(s.subtotal ?? (total_amount - tax_amount)) || 0;
      const discount_amount = Number(s.discount_amount ?? s.discount ?? 0) || 0;
      const paid_amount = Number(s.paid_amount ?? (s.payment_status === 'paid' ? total_amount : 0)) || 0;
      const payment_status = s.payment_status || (paid_amount >= total_amount && total_amount > 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'unpaid'));

      let saleRow;
      if (strategy === 'upsert' && (s.id || s.invoice_number)) {
        const existing = await client.query(
          `SELECT id FROM sales WHERE (org_id = $1 OR organization_id = $1) AND (id = $2 OR invoice_number = $3) LIMIT 1`,
          [orgId, s.id || null, s.invoice_number || null]
        );
        if (existing.rows.length > 0) {
          const upd = await client.query(
            `UPDATE sales SET
              subtotal = $1, discount_amount = $2, tax_amount = $3, total_amount = $4,
              paid_amount = $5, payment_status = $6, updated_at = NOW()
             WHERE id = $7 RETURNING *`,
            [subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_status, existing.rows[0].id]
          );
          saleRow = upd.rows[0];
        }
      }

      if (!saleRow) {
        const ins = await client.query(
          `INSERT INTO sales (
            org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
            sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
            payment_method, payment_status, notes, created_by
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            orgId, s.invoice_number || `INV-${Date.now()}`, s.customer_id, s.customer_name, s.customer_phone, s.customer_gstin,
            s.sale_date || new Date(), subtotal, discount_amount, tax_amount, total_amount, paid_amount,
            s.payment_method || 'cash', payment_status, s.notes, req.user?.id || s.created_by
          ]
        );
        saleRow = ins.rows[0];
      }

      // Handle items if embedded
      const saleItems = s.items || s.sale_items || [];
      if (saleItems.length > 0) {
        await client.query('DELETE FROM sale_items WHERE sale_id = $1', [saleRow.id]);
        for (const it of saleItems) {
          const itRate = Number(it.rate ?? it.mrp ?? it.price ?? 0) || 0;
          const itQty = Number(it.quantity ?? it.qty ?? 1) || 1;
          const itTot = Number(it.total ?? it.line_total ?? (itRate * itQty)) || 0;
          await client.query(
            `INSERT INTO sale_items (
              sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
              quantity, unit, rate, discount_percent, discount_amount, gst_rate, gst_amount, total, batch_id
            ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              saleRow.id, orgId, it.product_id, it.product_name || it.productName || 'Item', it.sku || '',
              it.hsn_code || it.hsnCode || '', itQty, it.unit || 'pcs', itRate,
              Number(it.discount_percent || 0), Number(it.discount_amount || 0),
              Number(it.gst_rate || 0), Number(it.gst_amount || 0), itTot, it.batch_id || null
            ]
          );
        }
      }

      results.push({ ...saleRow, total: saleRow.total_amount, tax: saleRow.tax_amount });
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, count: results.length, data: results });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
```

---

### Recommendation 4 & 5: Field Normalization, Single Atomic SQL Transaction, and `PUT /api/sales/:id`
In `backend-api/src/routes/invoices.js`:
- Refactor `POST /sales`:
  ```javascript
  router.post('/sales', async (req, res) => {
    const client = await pool.connect();
    try {
      const orgId = req.orgId || req.body.org_id || req.body.organization_id;
      if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

      const total_amount = Number(req.body.total_amount ?? req.body.total ?? req.body.grand_total ?? req.body.grandTotal ?? 0) || 0;
      const tax_amount = Number(req.body.tax_amount ?? req.body.tax ?? req.body.taxTotal ?? 0) || 0;
      const subtotal = Number(req.body.subtotal ?? (total_amount - tax_amount)) || 0;
      const discount_amount = Number(req.body.discount_amount ?? req.body.discount ?? req.body.discountTotal ?? 0) || 0;
      const paid_amount = Number(req.body.paid_amount ?? req.body.paidAmount ?? (req.body.payment_status === 'paid' ? total_amount : 0)) || 0;
      const payment_status = req.body.payment_status || (paid_amount >= total_amount && total_amount > 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'unpaid'));
      const items = req.body.items || req.body.sale_items || [];

      await client.query('BEGIN');

      const saleRes = await client.query(
        `INSERT INTO sales (
          org_id, organization_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
          sale_date, subtotal, discount_amount, tax_amount, total_amount, paid_amount,
          payment_method, payment_status, notes, created_by
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          orgId, req.body.invoice_number, req.body.customer_id, req.body.customer_name,
          req.body.customer_phone, req.body.customer_gstin, req.body.sale_date || new Date(),
          subtotal, discount_amount, tax_amount, total_amount, paid_amount,
          req.body.payment_method || 'cash', payment_status, req.body.notes, req.user?.id || req.body.created_by
        ]
      );
      const sale = saleRes.rows[0];

      const insertedItems = [];
      for (const item of items) {
        const itRate = Number(item.rate ?? item.mrp ?? item.price ?? 0) || 0;
        const itQty = Number(item.quantity ?? item.qty ?? 1) || 1;
        const itTot = Number(item.total ?? item.line_total ?? item.lineTotal ?? (itRate * itQty)) || 0;
        const itemRes = await client.query(
          `INSERT INTO sale_items (
            sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
            quantity, unit, rate, discount_percent, discount_amount,
            gst_rate, gst_amount, total, batch_id
          ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            sale.id, orgId, item.product_id || item.productId || null,
            item.product_name || item.productName || item.name || 'Item',
            item.sku || '', item.hsn_code || item.hsnCode || item.hsn || '',
            itQty, item.unit || 'pcs', itRate,
            Number(item.discount_percent || 0), Number(item.discount_amount || 0),
            Number(item.gst_rate || 0), Number(item.gst_amount || 0), itTot,
            item.batch_id || item.batchId || null
          ]
        );
        insertedItems.push(itemRes.rows[0]);

        if (item.batch_id || item.batchId) {
          await client.query(
            `UPDATE product_batches SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 AND (org_id = $3 OR organization_id = $3)`,
            [itQty, item.batch_id || item.batchId, orgId]
          );
        }
      }

      const unpaidAmount = total_amount - paid_amount;
      if (unpaidAmount > 0 && req.body.customer_id) {
        await client.query(
          `INSERT INTO credit_transactions (org_id, organization_id, party_type, party_id, type, amount, description, reference_id, reference_type, created_by)
           VALUES ($1, $1, 'customer', $2, 'credit', $3, $4, $5, 'sale', $6)`,
          [orgId, req.body.customer_id, unpaidAmount, `Invoice ${req.body.invoice_number}`, sale.id, req.user?.id]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({
        ...sale,
        total: sale.total_amount,
        tax: sale.tax_amount,
        items: insertedItems
      });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });
  ```
- Implement `PUT /sales/:id` (atomic update with items replacement):
  ```javascript
  router.put('/sales/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      const orgId = req.orgId || req.body.org_id || req.body.organization_id;
      const { id } = req.params;

      const total_amount = req.body.total_amount ?? req.body.total;
      const tax_amount = req.body.tax_amount ?? req.body.tax;
      const items = req.body.items || req.body.sale_items;

      await client.query('BEGIN');

      const saleRes = await client.query(
        `UPDATE sales SET
          invoice_number = COALESCE($1, invoice_number),
          customer_id = COALESCE($2, customer_id),
          customer_name = COALESCE($3, customer_name),
          subtotal = COALESCE($4, subtotal),
          discount_amount = COALESCE($5, discount_amount),
          tax_amount = COALESCE($6, tax_amount),
          total_amount = COALESCE($7, total_amount),
          payment_method = COALESCE($8, payment_method),
          payment_status = COALESCE($9, payment_status),
          notes = COALESCE($10, notes),
          updated_at = NOW()
         WHERE id = $11 AND (org_id = $12 OR organization_id = $12)
         RETURNING *`,
        [
          req.body.invoice_number, req.body.customer_id, req.body.customer_name,
          req.body.subtotal !== undefined ? Number(req.body.subtotal) : null,
          req.body.discount_amount !== undefined ? Number(req.body.discount_amount) : null,
          tax_amount !== undefined ? Number(tax_amount) : null,
          total_amount !== undefined ? Number(total_amount) : null,
          req.body.payment_method, req.body.payment_status, req.body.notes,
          id, orgId
        ]
      );
      if (saleRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sale not found' });
      }
      const sale = saleRes.rows[0];

      let insertedItems = [];
      if (Array.isArray(items)) {
        await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
        for (const item of items) {
          const itRate = Number(item.rate ?? item.mrp ?? item.price ?? 0) || 0;
          const itQty = Number(item.quantity ?? item.qty ?? 1) || 1;
          const itTot = Number(item.total ?? item.line_total ?? item.lineTotal ?? (itRate * itQty)) || 0;
          const itemRes = await client.query(
            `INSERT INTO sale_items (
              sale_id, org_id, organization_id, product_id, product_name, sku, hsn_code,
              quantity, unit, rate, discount_percent, discount_amount,
              gst_rate, gst_amount, total, batch_id
            ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
              id, orgId, item.product_id || item.productId || null,
              item.product_name || item.productName || item.name || 'Item',
              item.sku || '', item.hsn_code || item.hsnCode || item.hsn || '',
              itQty, item.unit || 'pcs', itRate,
              Number(item.discount_percent || 0), Number(item.discount_amount || 0),
              Number(item.gst_rate || 0), Number(item.gst_amount || 0), itTot,
              item.batch_id || item.batchId || null
            ]
          );
          insertedItems.push(itemRes.rows[0]);
        }
      }

      await client.query('COMMIT');
      return res.json({
        ...sale,
        total: sale.total_amount,
        tax: sale.tax_amount,
        items: insertedItems
      });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });
  ```

---

### Recommendation 6: Storefront Aliasing & Public Orders Support
In `backend-api/src/routes/settings.js`:
- Move storefront public read route before `router.use(authenticate)` or allow optional auth:
  ```javascript
  const getStorefrontHandler = async (req, res) => {
    try {
      const orgId = req.orgId || req.query.org_id || req.query.organization_id;
      const slug = req.query.slug || req.params.slug;

      let query = 'SELECT * FROM storefront_settings WHERE 1=1';
      const params = [];
      if (slug) {
        params.push(slug.toLowerCase().trim());
        query += ` AND LOWER(store_slug) = $${params.length}`;
      } else if (orgId) {
        params.push(orgId);
        query += ` AND (org_id = $${params.length} OR organization_id = $${params.length})`;
      } else {
        return res.json(null);
      }
      query += ' LIMIT 1';

      const result = await pool.query(query, params);
      const row = result.rows[0] || null;
      if (!row) return res.json(null);

      // Return both alias fields for 100% frontend compatibility
      return res.json({
        ...row,
        slug: row.store_slug,
        is_enabled: row.is_active,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```
- Wire aliases:
  `router.get('/storefront-settings', getStorefrontHandler);`  
  `router.get('/storefront', getStorefrontHandler);`  
  `router.get('/storefront/public/:slug', getStorefrontHandler);`  
  `router.post('/storefront-settings', saveStorefrontHandler);`  
  `router.post('/storefront', saveStorefrontHandler);`  
  `router.put('/storefront-settings', saveStorefrontHandler);`  
  `router.put('/storefront', saveStorefrontHandler);`  
- Implement `storefront-orders` endpoints in `settings.js` (`GET`, `POST`, `PUT /storefront-orders/:id`).

---

### Recommendation 7: Resilient Membership Query Handling
In `backend-api/src/routes/settings.js` and `backend-api/src/middleware/auth.js`:
- Rather than assuming both `m.org_id` and `m.organization_id` exist in the table, wrap query execution with a safe helper or use fallback:
  ```javascript
  const getMembershipsHandler = async (req, res) => {
    try {
      const { user_id, organization_id, org_id } = req.query;
      const targetOrg = organization_id || org_id || req.orgId;

      // Resilient query: try querying with both columns; if 42703 (undefined_column), fallback to single column
      let rows = [];
      try {
        let q = `
          SELECT m.*, u.email, u.full_name, u.phone, u.avatar_url
          FROM org_memberships m
          LEFT JOIN users u ON u.id = m.user_id
          WHERE 1=1
        `;
        const params = [];
        if (user_id) {
          params.push(user_id);
          q += ` AND m.user_id = $${params.length}`;
        }
        if (targetOrg) {
          params.push(targetOrg);
          q += ` AND (m.org_id = $${params.length} OR m.organization_id = $${params.length})`;
        }
        q += ' ORDER BY m.created_at ASC';
        const res1 = await pool.query(q, params);
        rows = res1.rows;
      } catch (colErr) {
        if (colErr.code === '42703' || colErr.code === '42P01') {
          // Column or table difference: fallback to querying organization_memberships or org_memberships with org_id
          let fallbackTable = colErr.code === '42P01' ? 'organization_memberships' : 'org_memberships';
          let qFallback = `
            SELECT m.*, u.email, u.full_name, u.phone, u.avatar_url
            FROM ${fallbackTable} m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE 1=1
          `;
          const params = [];
          if (user_id) {
            params.push(user_id);
            qFallback += ` AND m.user_id = $${params.length}`;
          }
          if (targetOrg) {
            params.push(targetOrg);
            qFallback += ` AND (m.org_id = $${params.length})`;
          }
          qFallback += ' ORDER BY m.created_at ASC';
          try {
            const res2 = await pool.query(qFallback, params);
            rows = res2.rows;
          } catch (e2) {
            // Second fallback: query with organization_id
            params.length = 0;
            let qFallback2 = `SELECT m.*, u.email, u.full_name, u.phone, u.avatar_url FROM ${fallbackTable} m LEFT JOIN users u ON u.id = m.user_id WHERE 1=1`;
            if (user_id) { params.push(user_id); qFallback2 += ` AND m.user_id = $${params.length}`; }
            if (targetOrg) { params.push(targetOrg); qFallback2 += ` AND m.organization_id = $${params.length}`; }
            const res3 = await pool.query(qFallback2, params);
            rows = res3.rows;
          }
        } else {
          throw colErr;
        }
      }

      // Normalize returned objects so both org_id and organization_id exist
      const normalized = rows.map((r) => ({
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
  ```

---

### Recommendation 8: Sanitizing `POST /customers` and `POST /suppliers` to Return 201 Records
In `backend-api/src/routes/parties.js`:
- Sanitize all fields:
  ```javascript
  const effectiveCreditLimit = isNaN(Number(credit_limit || creditLimit)) ? 0 : Number(credit_limit || creditLimit);
  const effectiveOpeningBal = isNaN(Number(opening_balance || openingBalance)) ? 0 : Number(opening_balance || openingBalance);
  const effectiveCreditDays = parseInt(credit_period_days || creditPeriodDays || 30, 10) || 30;
  let effectiveCustomFields = {};
  try {
    const rawCustom = custom_fields || customFields;
    effectiveCustomFields = typeof rawCustom === 'string' ? JSON.parse(rawCustom) : (rawCustom || {});
  } catch (_e) {
    effectiveCustomFields = {};
  }
  ```
- Wrap insertion with column fallback (code `42703`):
  If the extended columns do not yet exist in PostgreSQL, catch the error, execute the insert on core columns, and return the synthesized 201 record containing all requested properties.
- Ensure the 201 response includes:
  `id`, `name`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `gstin`, `pan`, `trade_name`, `shipping_address`, `category`, `credit_limit`, `opening_balance`, `balance_type`, `is_active`, `balance: effectiveOpeningBal`, `org_id`, `organization_id`.

---

## 5. Verification Method

To independently verify these findings and the subsequent fixes:

1. **Verify Backend Routes in `backend-api/src/routes/invoices.js`**:
   - Inspect line items support:
     ```bash
     grep -n "sale-items" backend-api/src/routes/invoices.js
     ```
     *Current state*: Returns empty (no matches).
     *Verification pass*: Must find route declarations for `POST /sale-items`, `GET /sale-items`, `DELETE /sale-items`, and `DELETE /sale-items/sale/:saleId`.
   - Inspect bulk sales route:
     ```bash
     grep -n "sales/bulk" backend-api/src/routes/invoices.js
     ```
     *Current state*: Returns empty.
     *Verification pass*: Must match `router.post('/sales/bulk', ...)`.
   - Inspect amount normalization:
     ```bash
     grep -n "total_amount" backend-api/src/routes/invoices.js
     ```
     *Verification pass*: Must show fallback to `req.body.total` and `req.body.grand_total`.

2. **Verify Settings Routes in `backend-api/src/routes/settings.js`**:
   - Inspect storefront aliases:
     ```bash
     grep -n "storefront" backend-api/src/routes/settings.js
     ```
     *Verification pass*: Must show GET, POST, PUT, and public routes for both `/storefront-settings` and `/storefront`.
   - Inspect membership query resilience:
     *Verification pass*: Query must execute cleanly even on a database with only `org_id` or only `organization_id`.

3. **Verify Parties Sanitization in `backend-api/src/routes/parties.js`**:
   - Inspect `POST /customers` and `POST /suppliers`:
     *Verification pass*: Sending empty strings for numbers (`credit_limit: ""` or `opening_balance: ""`) or calling on unmigrated schemas must never produce HTTP 500; it must return HTTP 201 with valid JSON.

4. **Run Existing Test Suites**:
   ```powershell
   cmd /c npx vitest run src/test/apiClient.test.ts
   cmd /c npx vitest run src/test/invoiceCalculations.test.ts
   ```
   All test suites must pass with 100% success rate and zero regressions.
