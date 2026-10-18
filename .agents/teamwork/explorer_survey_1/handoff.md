# Handoff Report: Products & Inventory Domain Survey & Centralized API Architecture

**Agent**: `explorer_survey_1`  
**Date**: 2026-10-18T18:10:00Z  
**Project**: Frontend Supabase Table Query Migration to Dedicated Backend API (`https://api.credsmart.online/api/*`)  
**Domain Under Audit**: Products & Inventory, Auth Session Architecture, Centralized API Client

---

## 1. Observation

### 1.1 Existing Supabase Auth & Session Architecture
- **Supabase Client Initialization** (`src/integrations/supabase/client.ts:11-17`):
  ```typescript
  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  ```
  - Direct observation: `storage: localStorage`, `persistSession: true`, and `autoRefreshToken: true` are enabled.
  - The browser `localStorage` holds the persistent Supabase session key formatted as `sb-${projectId}-auth-token`.
  - Calling `await supabase.auth.getSession()` retrieves the active session object containing `session.access_token` (JWT string), `session.refresh_token`, and `session.expires_at`.
  - When `autoRefreshToken: true` is enabled, `@supabase/supabase-js` transparently checks expiration before returning from `getSession()`. If expired, it triggers an HTTP refresh call against Supabase auth and resolves with the fresh token.

- **React Auth Provider & Hook** (`src/hooks/useAuth.tsx:38-65`):
  ```typescript
  // Line 38:
  const result = await supabase.auth.getSession();
  const sess = (result as any)?.data?.session ?? null;
  // Line 58:
  const onAuth = supabase.auth.onAuthStateChange((_event, s) => {
    if (isMounted) {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    }
  });
  ```
  - `AuthProvider` wraps the entire application in `src/App.tsx`.
  - React components access `const { session, user } = useAuth()`.
  - Non-React code (services, standalone utilities, background queues) can safely and directly invoke `supabase.auth.getSession()`.

- **Organization Context Isolation** (`src/hooks/useOrganization.tsx:6, 128-130`):
  - Active organization is stored in `localStorage.getItem("credsmart_active_org_id")` and managed via `useOrganization()`.
  - Almost every table query in the codebase explicitly filters by `.eq("organization_id", orgId)`.

---

### 1.2 Database Schema for Products & Inventory Domain
- Defined in `supabase/migrations/20261018000000_credsmart_full_schema.sql:401-443`:
  1. **`public.products`**:
     - Columns: `id UUID`, `organization_id UUID`, `barcode TEXT`, `sku TEXT`, `name TEXT`, `brand TEXT`, `category TEXT`, `tags JSONB`, `image_url TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
     - Observation: There are **no separate tables** for `categories`, `units`, `barcodes`, or `pricing`.
     - `category`, `brand`, `barcode`, and `sku` are first-class text columns on `products`.
     - `tags JSONB` stores extended item metadata:
       ```json
       {
         "unit": "PCS",
         "alt_unit": "BOX",
         "alt_unit_conversion": 10,
         "selling_price": 150.00,
         "purchase_price": 100.00,
         "mrp": 150.00,
         "stock": 50,
         "gst_rate": 18,
         "hsn_code": "8471",
         "min_stock_alert": 5,
         "is_in_catalogue": true,
         "is_featured": false
       }
       ```
  2. **`public.product_batches`**:
     - Columns: `id UUID`, `product_id UUID REFERENCES products(id) ON DELETE CASCADE`, `location_id UUID`, `batch_number TEXT`, `cost_price NUMERIC(12,2)`, `mrp NUMERIC(12,2)`, `stock INTEGER`, `expiry_date DATE`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
     - Unique constraint: `idx_product_batches_product_batch` on `(product_id, batch_number)`.
     - Batch-level stock and pricing: Each product has one or more batches (default `"BATCH-01"` or `"INIT-BATCH"`). The total stock of a product is the sum of `stock` across all child batches.

---

### 1.3 Complete Inventory of Direct Supabase Query Call Sites
Across `src/`, exactly **21 files** contain direct `supabase.from("products")` or `supabase.from("product_batches")` queries, totaling **60 distinct query call sites**.

| # | File Path | Line(s) | Table Name | Operation | Query Filters / Arguments | Payload / Return Structure |
|---|---|---|---|---|---|---|
| 1 | `src/context/ProductsContext.tsx` | 133–140 | `products` | `SELECT` | `.eq("organization_id", effectiveOrg).order("name")` | Selects `id, name, barcode, sku, category, brand, image_url, tags, product_batches(...)`. Hydrates global state. |
| 2 | `src/pages/Items.tsx` | 278–289 | `products` | `UPDATE` | `.eq("id", editingItem.id)` | Payload: `{ name, sku, barcode, category, brand, image_url, tags }` |
| 3 | `src/pages/Items.tsx` | 293–297 | `product_batches` | `SELECT` | `.eq("product_id", editingItem.id).limit(1)` | Checks if initial batch exists for editing product. |
| 4 | `src/pages/Items.tsx` | 300–307 | `product_batches` | `UPDATE` | `.eq("id", existingBatches[0].id)` | Payload: `{ cost_price, mrp, stock }` |
| 5 | `src/pages/Items.tsx` | 309–317 | `product_batches` | `INSERT` | None | Payload: `{ product_id, batch_number: "BATCH-01", cost_price, mrp, stock }` |
| 6 | `src/pages/Items.tsx` | 325–338 | `products` | `INSERT` | `.select().single()` | Payload: `{ organization_id, name, sku, barcode, category, brand, image_url, tags }` |
| 7 | `src/pages/Items.tsx` | 345–353 | `product_batches` | `INSERT` | None | Payload: `{ product_id: newProd.id, batch_number, cost_price, mrp, stock, expiry_date }` |
| 8 | `src/pages/Items.tsx` | 439–452 | `products` | `INSERT` | `.select().single()` | Bulk import loop. Payload: `{ organization_id, name, brand, category, barcode, sku, image_url, tags }` |
| 9 | `src/pages/Items.tsx` | 455–462 | `product_batches` | `INSERT` | None | Bulk import loop batch. Payload: `{ product_id: newProd.id, batch_number: "BATCH-01", cost_price, mrp, stock }` |
| 10 | `src/pages/Items.tsx` | 483 | `products` | `DELETE` | `.eq("id", item.id)` | Deletes single product. |
| 11 | `src/pages/Items.tsx` | 498 | `product_batches` | `DELETE` | `.in("product_id", ids)` | Bulk delete batches for selected products. |
| 12 | `src/pages/Items.tsx` | 499 | `products` | `DELETE` | `.in("id", ids)` | Bulk delete products. |
| 13 | `src/pages/Items.tsx` | 540 | `product_batches` | `SELECT` | `.eq("product_id", adjustingItem.id).limit(1)` | Quick adjust batch lookup. |
| 14 | `src/pages/Items.tsx` | 542 | `product_batches` | `UPDATE` | `.eq("id", batches[0].id)` | Quick adjust stock update. Payload: `{ stock: newStock }` |
| 15 | `src/pages/Items.tsx` | 544–550 | `product_batches` | `INSERT` | None | Quick adjust create initial batch if none existed. |
| 16 | `src/pages/ItemMaster.tsx` | 81–85 | `products` | `SELECT` | `.eq("organization_id", orgId).order("name")` | Selects `id, name, brand, category, barcode, sku, image_url, tags`. |
| 17 | `src/pages/ItemMaster.tsx` | 99–103 | `product_batches` | `SELECT` | `.in("product_id", prodIds)` | Selects `id, product_id, mrp, stock, cost_price, batch_number, expiry_date`. |
| 18 | `src/pages/ItemMaster.tsx` | 156–161 | `products` | `SELECT` | `.eq("organization_id", orgId).eq("barcode", barcodeToSave).maybeSingle()` | Duplicate barcode check on create. |
| 19 | `src/pages/ItemMaster.tsx` | 173–186 | `products` | `INSERT` | `.select("id").single()` | Create product. Payload: `{ name, brand, category, barcode, sku, organization_id, tags, image_url }`. |
| 20 | `src/pages/ItemMaster.tsx` | 216 | `product_batches` | `INSERT` | None | Initial batches array insert. |
| 21 | `src/pages/ItemMaster.tsx` | 236–242 | `products` | `SELECT` | `.eq("organization_id", orgId).eq("barcode", barcodeToSave).neq("id", id).maybeSingle()` | Duplicate barcode check on update. |
| 22 | `src/pages/ItemMaster.tsx` | 254–264 | `products` | `UPDATE` | `.eq("id", id)` | Update product metadata. |
| 23 | `src/pages/ItemMaster.tsx` | 271–274 | `product_batches` | `SELECT` | `.eq("product_id", id)` | Existing batches for product reconciliation. |
| 24 | `src/pages/ItemMaster.tsx` | 291 | `product_batches` | `UPDATE` | `.eq("id", b.id)` | Update batch in edit loop. |
| 25 | `src/pages/ItemMaster.tsx` | 293 | `product_batches` | `INSERT` | `.select("id").single()` | Insert new batch in edit loop. |
| 26 | `src/pages/ItemMaster.tsx` | 301 | `product_batches` | `DELETE` | `.in("id", toDelete)` | Delete removed batches. |
| 27 | `src/pages/ItemMaster.tsx` | 333–337 | `products` | `INSERT` | `.select("id, name")` | Bulk web scraped products import. |
| 28 | `src/pages/ItemMaster.tsx` | 351 | `product_batches` | `INSERT` | None | Bulk batches insert for imported items. |
| 29 | `src/pages/ItemMaster.tsx` | 390 | `product_batches` | `DELETE` | `.eq("product_id", id)` | Delete product batches before item deletion. |
| 30 | `src/pages/ItemMaster.tsx` | 393 | `products` | `DELETE` | `.eq("id", id)` | Delete single product. |
| 31 | `src/pages/ItemMaster.tsx` | 426 | `product_batches` | `DELETE` | `.in("product_id", ids)` | Bulk delete product batches. |
| 32 | `src/pages/ItemMaster.tsx` | 429 | `products` | `DELETE` | `.in("id", ids)` | Bulk delete products. |
| 33 | `src/pages/ItemMaster.tsx` | 449 | `products` | `UPDATE` | `.in("id", ids)` | Bulk edit field (category/brand) for selected products. |
| 34 | `src/pages/Inventory.tsx` | 100–104 | `products` | `SELECT` | `.eq("organization_id", orgId).order("name")` | Selects `id, name, brand, category, barcode, tags`. |
| 35 | `src/pages/Inventory.tsx` | 118–121 | `product_batches` | `SELECT` | `.in("product_id", prodIds)` | Selects `id, product_id, batch_number, cost_price, mrp, stock, expiry_date`. |
| 36 | `src/pages/Inventory.tsx` | 196–206 | `product_batches` | `INSERT` | `.select("id").single()` | Create initial batch on 0 inventory stock adjust. |
| 37 | `src/pages/Inventory.tsx` | 255–259 | `product_batches` | `UPDATE` | `.eq("id", batch.id)` | Stock adjustment by batch ID. Payload: `{ stock: newStock }`. |
| 38 | `src/pages/Inventory.tsx` | 332–339 | `product_batches` | `UPDATE` | `.eq("id", data.batchId)` | Inline Excel edit mode: updates batch stock, mrp, cost_price. |
| 39 | `src/pages/Inventory.tsx` | 343–353 | `product_batches` | `INSERT` | None | Inline Excel edit mode: creates initial batch if none existed. |
| 40 | `src/pages/POSBilling.tsx` | 475–479 | `products` | `SELECT` | `.eq("organization_id", orgId).order("name")` | Selects product details for POS checkout catalog. |
| 41 | `src/pages/POSBilling.tsx` | 490–493 | `product_batches` | `SELECT` | `.in("product_id", prodIds)` | Selects batches for POS products. |
| 42 | `src/pages/POSBilling.tsx` | 1260–1270 | `products` | `INSERT` | `.select().single()` | Fast create product during POS transaction. |
| 43 | `src/pages/POSBilling.tsx` | 1273–1279 | `product_batches` | `INSERT` | None | Create batch for fast-created POS product. |
| 44 | `src/pages/POSBilling.tsx` | 1508–1510 | `product_batches` | `UPDATE` | `.eq("id", ci.batch.id)` | Deduct batch stock on POS bill completion. |
| 45 | `src/pages/BarcodeGenerator.tsx` | 101–105 | `products` | `SELECT` | `.eq("organization_id", orgId).order("name")` | Loads products for barcode sheet printing. |
| 46 | `src/pages/BarcodeGenerator.tsx` | 123–126 | `product_batches` | `SELECT` | `.in("product_id", prodIds)` | Loads batch pricing/stock for barcode labels. |
| 47 | `src/pages/PurchaseReturns.tsx` | 167–171 | `products` | `SELECT` | `.eq("organization_id", orgId).order("name")` | Loads products with nested `product_batches` for return invoice item selection. |
| 48 | `src/components/items/QuickCreateItemModal.tsx` | 182–195 | `products` | `INSERT` | `.select().single()` | Quick create modal from billing/invoice screen. |
| 49 | `src/components/items/QuickCreateItemModal.tsx` | 205–211 | `product_batches` | `INSERT` | None | Initial batch for quick created item. |
| 50 | `src/components/PurchaseInvoiceForm.tsx` | 131–138 | `products` | `SELECT` | `.eq("organization_id", organizationId).order("name")` | Selects products with nested `product_batches`. |
| 51 | `src/components/storefront/StorefrontCatalogTab.tsx` | 86–89 | `products` | `UPDATE` | `.eq("id", product.id)` | Update visibility in online storefront catalog (`tags.show_in_catalogue`). |
| 52 | `src/components/storefront/StorefrontCatalogTab.tsx` | 111–114 | `products` | `UPDATE` | `.eq("id", product.id)` | Update featured flag in storefront (`tags.is_featured`). |
| 53 | `src/components/storefront/StorefrontCatalogTab.tsx` | 157–160 | `products` | `UPDATE` | `.eq("id", product.id)` | Update storefront product image in `tags`. |
| 54 | `src/components/storefront/StorefrontCatalogTab.tsx` | 184–187 | `products` | `UPDATE` | `.eq("id", p.id)` | Bulk set storefront visibility in loop. |
| 55 | `src/services/storefrontService.ts` | 174–177 | `products` | `SELECT` | `.eq("organization_id", store.organization_id)` | Selects products with `product_batches(mrp, cost_price, stock)` for public store. |
| 56 | `src/services/stockService.ts` | 128–134 | `products` | `SELECT` | `.eq("organization_id", orgId).eq("id", cleanId).limit(1).maybeSingle()` | Validate product belongs to tenant before stock deduction. |
| 57 | `src/services/stockService.ts` | 155–161 | `products` | `SELECT` | `.eq("organization_id", orgId).eq("barcode", cleanBarcode).limit(1).maybeSingle()` | Lookup product by barcode for stock sync. |
| 58 | `src/services/stockService.ts` | 168–174 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", cleanName).limit(1).maybeSingle()` | Lookup product by name for stock sync. |
| 59 | `src/services/stockService.ts` | 228–232 | `product_batches` | `SELECT` | `.eq("product_id", productId).order("created_at", { ascending: true })` | Fetch batches for FIFO stock deduction. |
| 60 | `src/services/stockService.ts` | 255–262 | `product_batches` | `UPDATE` | `.eq("id", targetBatch.id)` | Update batch stock after deduction. |
| 61 | `src/services/stockService.ts` | 265–274 | `product_batches` | `INSERT` | None | Create initial batch if none existed during deduction. |
| 62 | `src/services/stockService.ts` | 279–282 | `product_batches` | `SELECT` | `.eq("product_id", productId)` | Fetch all batch stocks to recompute total product stock. |
| 63 | `src/services/stockService.ts` | 289–293 | `products` | `SELECT` | `.eq("id", productId).maybeSingle()` | Fetch product tags before stock synchronization. |
| 64 | `src/services/stockService.ts` | 297–303 | `products` | `UPDATE` | `.eq("id", productId)` | Sync total stock into `products.tags.stock`. |
| 65 | `src/services/stockService.ts` | 358–369 | `products` | `INSERT` | `.select("id, name, barcode, sku, category, tags").maybeSingle()` | Auto-create product on purchase stock add. |
| 66 | `src/services/stockService.ts` | 418–422 | `product_batches` | `SELECT` | `.eq("product_id", productId)` | Fetch batches to match batch number on purchase stock add. |
| 67 | `src/services/stockService.ts` | 433–442 | `product_batches` | `UPDATE` | `.eq("id", matchedBatch.id)` | Add stock to existing batch. |
| 68 | `src/services/stockService.ts` | 445–455 | `product_batches` | `INSERT` | None | Create new batch with added stock. |
| 69 | `src/services/stockService.ts` | 460–464 | `product_batches` | `SELECT` | `.eq("product_id", productId)` | Re-fetch all batches to calculate new total stock. |
| 70 | `src/services/stockService.ts` | 470–474 | `products` | `SELECT` | `.eq("id", productId).maybeSingle()` | Fetch product tags before total stock update. |
| 71 | `src/services/stockService.ts` | 479–487 | `products` | `UPDATE` | `.eq("id", productId)` | Update `products.tags.stock` after stock addition. |
| 72 | `src/services/documentsService.ts` | 844–849 | `products` | `SELECT` | `.eq("id", pId).maybeSingle()` | Check if product exists when saving purchase invoice. |
| 73 | `src/services/documentsService.ts` | 852–858 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", it.productName.trim()).maybeSingle()` | Match product by name for purchase line item. |
| 74 | `src/services/documentsService.ts` | 861–871 | `products` | `INSERT` | `.select("id").maybeSingle()` | Auto-create product record for new purchase invoice line item. |
| 75 | `src/services/documentsService.ts` | 957–963 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", it.productName.trim()).maybeSingle()` | Match product by name for purchase return line item. |
| 76 | `src/services/networkInvoicingService.ts` | 1327–1335 | `products` | `SELECT` | `.eq("organization_id", recipientOrg.id).eq("barcode", cleanBarcode).limit(1).maybeSingle()` | Cross-tenant network invoice inward barcode match. |
| 77 | `src/services/networkInvoicingService.ts` | 1344–1352 | `products` | `SELECT` | `.eq("organization_id", recipientOrg.id).ilike("name", cleanName).limit(1).maybeSingle()` | Cross-tenant network invoice inward name match. |
| 78 | `src/services/networkInvoicingService.ts` | 1393–1405 | `products` | `INSERT` | `.select("id, name, barcode, sku, category, tags").maybeSingle()` | Auto-create product in recipient organization inventory. |
| 79 | `src/services/autoSyncService.ts` | 484 | `products` | `SELECT` | `.eq("organization_id", orgId).limit(10000)` | Tally Live Sync pre-fetch existing products. |
| 80 | `src/services/autoSyncService.ts` | 590 | `products` | `UPSERT` | Chunked 1000 items | Upsert updated products from Tally Prime sync. |
| 81 | `src/services/autoSyncService.ts` | 598 | `products` | `INSERT` | Chunked 1000 items, `.select("id, name")` | Insert new products from Tally Prime sync. |
| 82 | `src/services/autoSyncService.ts` | 620 | `product_batches` | `SELECT` | `.in("product_id", productIdsToUpdate)` | Fetch existing batches for Tally updated products. |
| 83 | `src/services/autoSyncService.ts` | 650 | `product_batches` | `UPSERT` | Chunked 1000 items | Upsert batches for Tally synced items. |
| 84 | `src/services/autoSyncService.ts` | 880 | `products` | `INSERT` | `[newProduct]` | Auto-create product for unmapped voucher line item. |
| 85 | `src/services/autoSyncService.ts` | 885 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", item.itemName).limit(1).maybeSingle()` | Fallback lookup for voucher line item product. |
| 86 | `src/pages/TallyImport.tsx` | 621 | `products` | `SELECT` | `.eq("organization_id", orgId)` | File import pre-fetch existing products. |
| 87 | `src/pages/TallyImport.tsx` | 695 | `products` | `UPSERT` | Chunked 1000 items, `.select("id, name")` | Upsert products from XML/Excel import. |
| 88 | `src/pages/TallyImport.tsx` | 718 | `product_batches` | `SELECT` | `.in("product_id", ...)` | Fetch batches for imported products. |
| 89 | `src/pages/TallyImport.tsx` | 727 | `product_batches` | `UPSERT` | Chunked 1000 items | Upsert batches for imported products. |
| 90 | `src/pages/TallyImport.tsx` | 1232–1243 | `products` | `INSERT` | `.select("id, name").single()` | Auto-create item during voucher XML parse. |
| 91 | `src/pages/TallyImport.tsx` | 1248 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", itemName).limit(1).maybeSingle()` | Fallback product check during voucher XML parse. |
| 92 | `src/pages/TallyImport.tsx` | 1364 | `products` | `SELECT` | `.eq("organization_id", orgId)` | Universal Data Importer products pre-fetch. |
| 93 | `src/pages/TallyImport.tsx` | 1423 | `products` | `UPSERT` | Chunked 1000 items, `.select("id, name")` | Universal Data Importer upsert products. |
| 94 | `src/pages/TallyImport.tsx` | 1442 | `product_batches` | `SELECT` | `.in("product_id", ...)` | Universal Data Importer pre-fetch batches. |
| 95 | `src/pages/TallyImport.tsx` | 1446 | `product_batches` | `UPSERT` | Chunked 1000 items | Universal Data Importer upsert batches. |
| 96 | `src/pages/TallyImport.tsx` | 1593 | `products` | `SELECT` | `.eq("organization_id", orgId).limit(10000)` | Day Book voucher batch ingestion products pre-fetch. |
| 97 | `src/pages/TallyImport.tsx` | 1889–1900 | `products` | `INSERT` | `.select("id").single()` | Auto-create product for voucher item during Day Book parse. |
| 98 | `src/pages/TallyImport.tsx` | 1905 | `products` | `SELECT` | `.eq("organization_id", orgId).ilike("name", itemName).limit(1).maybeSingle()` | Fallback check for voucher product in Day Book parse. |
| 99 | `src/hooks/useOrganization.tsx` | 319–330 | `products` | `INSERT` | Array insert, `.select("id, name, barcode")` | Seed initial demo products for new business signup. |
| 100 | `src/hooks/useOrganization.tsx` | 362 | `product_batches` | `INSERT` | Array insert | Seed initial demo batches for new business signup. |
| 101 | `src/pages/Auth.tsx` | 241–245 | `products` | `SELECT` | `.eq("organization_id", orgId)` | Check existing seed products on onboarding complete. |
| 102 | `src/pages/Auth.tsx` | 266–277 | `products` | `INSERT` | Array insert, `.select("id, name, barcode")` | Insert onboarding seed products. |
| 103 | `src/pages/Auth.tsx` | 305–307 | `product_batches` | `INSERT` | Array insert | Insert onboarding seed batches. |
| 104 | `src/pages/Dashboard.tsx` | 1217–1238 | `products` | `INSERT` | `.select().single()` | Create item modal on Dashboard. |
| 105 | `src/pages/Dashboard.tsx` | 1241–1248 | `product_batches` | `INSERT` | None | Create batch on Dashboard item create. |
| 106 | `src/components/AppLayout.tsx` | 808–829 | `products` | `INSERT` | `.select().single()` | Global AppShell top-bar create item shortcut. |
| 107 | `src/components/AppLayout.tsx` | 832–839 | `product_batches` | `INSERT` | None | Global AppShell create item batch. |
| 108 | `src/utils/offlineQueue.ts` | 138–142 | `product_batches` | `UPDATE` | `.eq("id", item.payload.batchId)` | Offline replay of queued stock adjustments. |

---

## 2. Logic Chain

1. **Session & Auth Propagation**:
   - *From Observation 1.1*: `src/integrations/supabase/client.ts` uses `@supabase/supabase-js` with `persistSession: true` and `autoRefreshToken: true`.
   - *Step 1*: When any frontend request needs to communicate with `https://api.credsmart.online/api/*`, calling `(await supabase.auth.getSession()).data.session?.access_token` guarantees an active, unexpired JWT.
   - *Step 2*: Because `supabase.auth.getSession()` is an asynchronous function independent of React lifecycle hooks, it can be executed inside a centralized HTTP client utility (`apiClient.ts`).
   - *Step 3*: If a backend response returns HTTP `401 Unauthorized`, `apiClient` can execute `await supabase.auth.refreshSession()`. Upon success, it repeats the initial fetch call once. If refresh fails, it clears local state and redirects to `/auth`.

2. **Schema & Domain Scope Clarity**:
   - *From Observation 1.2*: Postgres schema defines `products` and `product_batches`. There are no database tables for `categories`, `units`, or `pricing`.
   - *Step 1*: Categories, barcodes, units, and base prices are columns/JSONB attributes of `products`.
   - *Step 2*: Stock quantities and multi-tier pricing reside on `product_batches`.
   - *Step 3*: Therefore, backend endpoints only need to manage `/api/products` (with optional batch child array) and `/api/product-batches` (or a dedicated `/api/inventory/adjust-stock` RPC endpoint), completely fulfilling the entire domain requirement.

3. **Response Parity & Non-Breaking Migrations**:
   - *From Observation 1.3*: Frontend components handle responses in the shape `{ data, error }`, e.g.:
     ```typescript
     const { data, error } = await ...;
     if (error) { toast.error(error.message); return; }
     ```
   - *Step 1*: Designing the centralized `apiClient` to always return `{ data: T | null, error: { message: string, code?: string } | null }` ensures that existing UI state machines (toasts, loading spinners, optimistic updates) do not require structural rewrites.
   - *Step 2*: `ProductsContext.tsx` is the primary hub for products in React (`useProducts()`). Replacing its internal query with `productsApi.getAll(effectiveOrg)` immediately migrates `SalesInvoiceModal.tsx`, `PurchaseInvoiceModal.tsx`, `POSBilling.tsx`, and all line-item components that consume `useProducts()`.

---

## 3. Caveats

1. **Remote Backend Network Availability**:
   - When probing `https://api.credsmart.online/api/health`, DNS/connectivity depends on environment network mode. In offline / local development mode, client-side fallback to `localStorage.getItem("credsmart_cached_products_${orgId}")` must remain intact.
2. **Bulk Ingestion Endpoints**:
   - Tally sync and file imports (`autoSyncService.ts`, `TallyImport.tsx`) process up to 10,000 products and batches in chunks of 1,000. The backend `/api/products/bulk` endpoint must support arrays of up to 1,000 items with idempotency (e.g. upsert on `(organization_id, name)` or `(organization_id, barcode)`).
3. **Storage vs Database Separation**:
   - Image uploads in `ItemImageUpload.tsx`, `AddProductModal.tsx`, and `StorefrontCatalogTab.tsx` use `supabase.storage.from("store-logos")`. Image file upload is a Storage bucket operation, not a table query; the image *URL* is stored in `products.image_url` / `tags.image_url`. Only the table query updating the product record with the URL belongs to the table migration scope.

---

## 4. Conclusion & Recommendations

### 4.1 Recommended Centralized API Client Architecture

#### A. Core API Client (`src/lib/apiClient.ts`)
```typescript
import { supabase } from "@/integrations/supabase/client";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.credsmart.online/api";

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string; code?: string; details?: unknown } | null;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  organizationId?: string;
  skipAuth?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, params, organizationId, skipAuth, headers = {}, ...customConfig } = options;

  // 1. Build Query Parameters
  const url = new URL(
    endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  );
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v));
    });
  }

  // 2. Prepare Headers
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type") && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  requestHeaders.set("Accept", "application/json");

  // Attach Active Organization ID
  const activeOrg =
    organizationId ||
    localStorage.getItem("credsmart_active_org_id") ||
    undefined;
  if (activeOrg) {
    requestHeaders.set("x-organization-id", activeOrg);
  }

  // 3. Attach Supabase JWT Bearer Token
  if (!skipAuth) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    } catch (err) {
      console.warn("Could not retrieve session token for API call:", err);
    }
  }

  // 4. Execute Fetch Request with 401 Token Refresh & Single Retry
  const execute = async (): Promise<Response> => {
    return fetch(url.toString(), {
      ...customConfig,
      headers: requestHeaders,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  };

  try {
    let response = await execute();

    // If 401 Unauthorized, attempt token refresh and retry once
    if (response.status === 401 && !skipAuth) {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData.session?.access_token) {
        requestHeaders.set("Authorization", `Bearer ${refreshData.session.access_token}`);
        response = await execute();
      }
    }

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText || `Request failed with status ${response.status}` };
      }
      return {
        data: null,
        error: {
          message: errorData?.error?.message || errorData?.message || "An unexpected API error occurred",
          code: errorData?.error?.code || `HTTP_${response.status}`,
          details: errorData,
        },
      };
    }

    // 204 No Content
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const json = await response.json();
    // Handle both { data: ... } wrapped and direct payload returns
    const data = (json && typeof json === "object" && "data" in json) ? json.data : json;
    return { data: data as T, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network request failed";
    return {
      data: null,
      error: { message, code: "NETWORK_ERROR", details: err },
    };
  }
}
```

---

#### B. Domain Products API Service (`src/services/productsApi.ts`)
```typescript
import { apiClient, ApiResponse } from "@/lib/apiClient";
import { ProductCatalogOption } from "@/context/ProductsContext";

export interface ProductBatch {
  id?: string;
  product_id?: string;
  batch_number: string;
  cost_price: number;
  mrp: number;
  stock: number;
  expiry_date?: string | null;
}

export interface SaveProductPayload {
  organization_id: string;
  name: string;
  brand?: string | null;
  category?: string;
  barcode?: string | null;
  sku?: string;
  image_url?: string | null;
  tags?: Record<string, unknown>;
  batches?: ProductBatch[];
}

export const productsApi = {
  // 1. Fetch all products for an organization
  async getProducts(orgId: string): Promise<ApiResponse<ProductCatalogOption[]>> {
    return apiClient<ProductCatalogOption[]>("/products", {
      method: "GET",
      params: { organization_id: orgId },
      organizationId: orgId,
    });
  },

  // 2. Fetch single product by ID
  async getProductById(id: string): Promise<ApiResponse<ProductCatalogOption>> {
    return apiClient<ProductCatalogOption>(`/products/${id}`, { method: "GET" });
  },

  // 3. Create a product (with initial batches)
  async createProduct(payload: SaveProductPayload): Promise<ApiResponse<ProductCatalogOption>> {
    return apiClient<ProductCatalogOption>("/products", {
      method: "POST",
      body: payload,
      organizationId: payload.organization_id,
    });
  },

  // 4. Update a product
  async updateProduct(id: string, payload: Partial<SaveProductPayload>): Promise<ApiResponse<ProductCatalogOption>> {
    return apiClient<ProductCatalogOption>(`/products/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  // 5. Delete a product
  async deleteProduct(id: string, orgId?: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient<{ success: boolean }>(`/products/${id}`, {
      method: "DELETE",
      organizationId: orgId,
    });
  },

  // 6. Bulk delete products
  async bulkDeleteProducts(ids: string[], orgId?: string): Promise<ApiResponse<{ success: boolean; deletedCount: number }>> {
    return apiClient("/products/bulk-delete", {
      method: "POST",
      body: { ids },
      organizationId: orgId,
    });
  },

  // 7. Bulk update products
  async bulkUpdateProducts(ids: string[], update: Record<string, unknown>, orgId?: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient("/products/bulk-update", {
      method: "POST",
      body: { ids, update },
      organizationId: orgId,
    });
  },

  // 8. Bulk import / upsert products
  async bulkImport(items: SaveProductPayload[], strategy = "overwrite", orgId?: string): Promise<ApiResponse<{ inserted: number; updated: number }>> {
    return apiClient("/products/bulk", {
      method: "POST",
      body: { items, strategy },
      organizationId: orgId,
    });
  },

  // 9. Batch management
  async getBatches(productIds: string[]): Promise<ApiResponse<ProductBatch[]>> {
    return apiClient<ProductBatch[]>("/product-batches", {
      method: "GET",
      params: { product_ids: productIds.join(",") },
    });
  },

  async updateBatch(batchId: string, payload: Partial<ProductBatch>): Promise<ApiResponse<ProductBatch>> {
    return apiClient<ProductBatch>(`/product-batches/${batchId}`, {
      method: "PUT",
      body: payload,
    });
  },

  async adjustStock(params: {
    productId: string;
    batchId?: string;
    adjustType: "add" | "reduce" | "set";
    quantity: number;
    reason?: string;
    orgId?: string;
  }): Promise<ApiResponse<{ batch: ProductBatch; totalStock: number }>> {
    return apiClient("/inventory/adjust-stock", {
      method: "POST",
      body: params,
      organizationId: params.orgId,
    });
  },
};
```

---

### 4.2 Step-by-Step Migration Execution Plan

1. **Phase 1: Foundation (Client & API Service)**
   - Create `src/lib/apiClient.ts` with Supabase JWT bearer injection and refresh handling.
   - Create `src/services/productsApi.ts` implementing the complete domain operations.
   - Add unit tests verifying `apiClient` headers, query serialization, and error parsing.

2. **Phase 2: Global State Migration (`ProductsContext.tsx`)**
   - Replace `supabase.from("products").select(...)` with `productsApi.getProducts(effectiveOrg)`.
   - Preserve `localStorage` caching (`credsmart_cached_products_${effectiveOrg}`) to maintain 100% offline and cross-tab responsiveness.
   - Verify that POS, Invoices, and Catalog instantly reflect backend data through the context.

3. **Phase 3: Catalog Management Pages (`Items.tsx` & `ItemMaster.tsx`)**
   - Replace all `supabase.from("products")` and `supabase.from("product_batches")` queries in `src/pages/Items.tsx` and `src/pages/ItemMaster.tsx` with `productsApi.*`.
   - Migrate single and bulk CRUD, duplicate barcode checks, and bulk edit functions.

4. **Phase 4: Inventory & Operations (`Inventory.tsx`, `POSBilling.tsx`, `BarcodeGenerator.tsx`)**
   - In `Inventory.tsx`: replace product batch queries and inline Excel editing with `productsApi.getProducts` and `productsApi.adjustStock` / `productsApi.updateBatch`.
   - In `POSBilling.tsx`: replace fast product create and checkout stock deduction.
   - In `BarcodeGenerator.tsx` and `PurchaseReturns.tsx`: migrate read-only catalog queries.

5. **Phase 5: Supporting Services & Import Pipelines**
   - In `stockService.ts`: replace direct batch updates with `productsApi.adjustStock` and `productsApi.updateBatch`.
   - In `storefrontService.ts` and `StorefrontCatalogTab.tsx`: replace product visibility updates.
   - In `autoSyncService.ts` and `TallyImport.tsx`: replace batch upserts with `productsApi.bulkImport`.
   - In `Auth.tsx`, `Dashboard.tsx`, `AppLayout.tsx`, `useOrganization.tsx`: replace demo seed product creation with `productsApi.createProduct` or `productsApi.bulkImport`.

6. **Phase 6: Static AST Verification & Regression Testing**
   - Run grep check: verify zero `supabase.from("products")` or `supabase.from("product_batches")` remains in `src/`.
   - Run `npx tsc --noEmit` to ensure zero compilation or type regressions.
   - Run `npx vitest run` to ensure existing invoice calculation and UI tests pass.

---

## 5. Verification Method

To independently verify the observations and findings in this survey:

1. **Verify Supabase Auth & Session Configuration**:
   - Inspect `src/integrations/supabase/client.ts` lines 11–17 to confirm `persistSession: true` and `autoRefreshToken: true`.
   - Inspect `src/hooks/useAuth.tsx` lines 38–65 to confirm session retrieval and listener patterns.

2. **Verify Products & Inventory Table Names**:
   - Inspect `supabase/migrations/20261018000000_credsmart_full_schema.sql` lines 401–444 to confirm that only `products` and `product_batches` are defined (no `categories` or `units` tables).

3. **Verify Products Domain Query Locations**:
   - Run ripgrep on `src/`:
     ```bash
     rg 'from\("products"\)' src/
     rg 'from\("product_batches"\)' src/
     ```
   - Confirm all matches correspond directly to the audit table in Section 1.3.

4. **Verify Frontend Compilation Baseline**:
   - Run `cmd /c npx tsc --noEmit` to confirm current project TypeScript health.
