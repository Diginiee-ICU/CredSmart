## 2026-10-18T18:31:54Z
You are worker_m2. Your working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Reference Specifications & Survey Reports:
- Project specification: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
- Products & Inventory Survey Audit: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md (and analysis.md)
- Centralized API Client: src/lib/apiClient.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 2 (M2) — Products & Inventory Domain Query Migration:
1. Create `src/services/productsApi.ts`:
   - Use `apiClient`, `apiGet`, `apiPost`, `apiPut`, `apiDelete` from `src/lib/apiClient.ts`.
   - Implement typed functions for all product and batch operations:
     * `getProducts(orgId)` -> `GET /products?organization_id=...`
     * `getProductById(id)` -> `GET /products/:id`
     * `createProduct(payload)` -> `POST /products`
     * `updateProduct(id, payload)` -> `PUT /products/:id`
     * `deleteProduct(id, orgId)` -> `DELETE /products/:id`
     * `bulkImport(items, strategy, orgId)` -> `POST /products/bulk`
     * `bulkDelete(ids, orgId)` -> `POST /products/bulk-delete`
     * `bulkUpdate(ids, update, orgId)` -> `POST /products/bulk-update`
     * `adjustStock(params)` -> `POST /inventory/adjust-stock`
     * `getBatches(productIds)` -> `GET /product-batches?product_ids=...`
     * `updateBatch(batchId, payload)` -> `PUT /product-batches/:batchId`
   - Maintain full TypeScript typing (`ProductCatalogOption`, `ProductBatch`, `SaveProductPayload`).
2. Migrate frontend query call sites in the Products & Inventory domain:
   - `src/context/ProductsContext.tsx`: Replace direct `supabase.from("products").select(...)` with `productsApi.getProducts(...)`. Retain `localStorage` caching (`credsmart_cached_products_${orgId}`) for offline responsiveness.
   - `src/pages/Items.tsx` & `src/pages/ItemMaster.tsx`: Replace all direct queries with `productsApi` methods for single/bulk create, update, delete, batch lookup, and stock adjustments.
   - `src/pages/Inventory.tsx`: Replace direct batch and product queries with `productsApi.getProducts`, `productsApi.adjustStock`, and `productsApi.updateBatch`.
   - `src/services/stockService.ts`: Replace direct `supabase.from("product_batches")` mutations with `productsApi` batch adjustments.
   - In `POSBilling.tsx`, `BarcodeGenerator.tsx`, `PurchaseReturns.tsx`, `storefrontService.ts`, `StorefrontCatalogTab.tsx`, `TallyImport.tsx`, `autoSyncService.ts`, `offlineQueue.ts`: Migrate product/batch table queries to `productsApi`.
3. Verification:
   - Run `cmd /c npx tsc --noEmit` to ensure 0 TypeScript compilation errors.
   - Run `cmd /c npx vitest run src/test/e2eApiMigration.test.ts` to verify product domain migration tests pass.

Write your complete handoff report to:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md
When done, notify the orchestrator with send_message to recipient 73ee3452-ffda-43b4-83da-c3ca2006c47f.
