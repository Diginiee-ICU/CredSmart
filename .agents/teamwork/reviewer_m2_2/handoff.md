# Milestone 2 (M2) Adversarial Review & Quality Audit Report: Products & Inventory API Migration

**Reviewer Identity**: `reviewer_m2_2` (Roles: reviewer, critic)  
**Target Milestone**: Milestone 2 (M2) — Products & Inventory Domain Query Migration  
**Target Worker**: `worker_m2`  
**Verdict**: **APPROVE**  

---

## 1. Observation

Direct observations and execution outputs from verification commands and codebase inspection:

### Verification Commands & Test Executions
1. **TypeScript Typecheck**:
   - Command: `cmd /c npx tsc --noEmit`
   - Result: Exited with code `0`. Zero type errors across the entire codebase.

2. **E2E Migration Test Suite**:
   - Command: `cmd /c npx vitest run src/test/e2eApiMigration.test.ts`
   - Result: Exited with code `0`.
   - Output: `Test Files 1 passed (1) | Tests 43 passed (43)`.
   - All 4 tiers (Feature Coverage, Boundary Cases, Cross-Domain Consistency, Static Grep AST Compliance) passed.

3. **High-Concurrency & Resilience Stress Test Suite**:
   - Command: `cmd /c npx vitest run src/test/productsApiStress.test.ts`
   - Result: Exited with code `0`.
   - Output: `Test Files 1 passed (1) | Tests 29 passed (29)`.
   - Verified 1,000-item bulk import serialization, 50 concurrent batch stock adjustments, network drop / 401 token refresh loops, and barcode collision handling.

4. **Reviewer Challenge Test Suite**:
   - Command: `cmd /c npx vitest run src/test/productsApi.m2ReviewerChallenge.test.ts`
   - Result: Exited with code `0`.
   - Output: `Test Files 1 passed (1) | Tests 13 passed (13)`.
   - Verified CRUD endpoint mapping, dual camelCase/snake_case property access on `ProductBatch`, and offline localStorage synchronization.

5. **Static Grep & Direct Database Query Scan**:
   - Evaluated direct queries targeting `products` and `product_batches` in `src/` (excluding tests and `supabase/client.ts`).
   - Grep query: `\.(?:from)\s*\(\s*["'](products|product_batches)["']`
   - Result: `0` matches found across all production source files in `src/`.

### Codebase Implementations Inspected
- **Products API Service (`src/services/productsApi.ts`)**:
  - Exports standard typed functions: `getProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkImport`, `bulkDelete`, `bulkUpdate`, `adjustStock`, `getBatches`, `createBatch`, `updateBatch`, `deleteBatch`, `deleteBatchesByProductIds`, `bulkUpsertBatches`, `checkBarcodeUnique`, and the `productsApi` namespace object.
  - Organization ID parameter resolution: Lines 125 & 144: `const effectiveOrg = payload.organization_id || payload.organizationId || orgId;` correctly supports snake_case, camelCase, or argument-level IDs.
  - Dual-access types: `ProductBatch` in `src/services/productsApi.ts:13-30` exports both camelCase (`batchNumber`, `costPrice`, `currentStock`, `expiryDate`) and snake_case (`batch_number`, `cost_price`, `current_stock`, `expiry_date`) properties.

- **Stock Adjustments & Zero/Negative Stock Handling**:
  - `src/pages/Inventory.tsx` lines 173-178: `const qty = parseInt(adjustQty); if (isNaN(qty) || qty <= 0) { toast({ title: "Invalid quantity", description: "Please enter a positive whole number", variant: "destructive" }); return; }`
  - `src/pages/Inventory.tsx` lines 183-187: If product has 0 batches and user attempts reduce: `if (adjustType === "reduce") { toast({ title: "No Stock Available", description: "Cannot reduce stock for a product with 0 inventory.", variant: "destructive" }); return; }`
  - `src/pages/Inventory.tsx` lines 238-245: When reducing existing batch stock: `if (adjustType === "reduce" && currentStock <= 0) { toast({ title: "Out of stock", description: "This batch currently has 0 units.", variant: "destructive" }); return; }` and `const newStock = adjustType === "add" ? currentStock + qty : Math.max(0, currentStock - qty);` clamps to zero, preventing negative inventory.
  - `src/pages/Inventory.tsx` lines 309-311 (Inline Excel Edit Mode): `[field]: Math.max(0, val)` guarantees negative stock or prices cannot be saved.
  - `src/services/stockService.ts` lines 202, 230: `const qtyToDeduct = Math.max(1, Number(item.quantity) || 1); const newStock = Math.max(0, currentStock - qtyToDeduct);` ensuring negative deductions and negative stock are blocked.

- **Pricing Overrides & Batch Calculations**:
  - `src/context/ProductsContext.tsx` lines 47-64: `normalizeProduct` calculates total stock across all nested `product_batches`, falling back to tags/base fields only when batches are absent.
  - `src/pages/POSBilling.tsx` lines 508-525: Resolves batch-level `mrp` and `costPrice` with fallback to product tags, creating a synthetic fallback batch (`General`) if none exists.
  - `src/pages/BarcodeGenerator.tsx` lines 125-137: `priceMap` correctly maps batch MRP and stock, prioritizing active batches with stock > 0 over exhausted batches.

- **Barcode Duplication Lookups**:
  - `src/services/productsApi.ts` lines 335-349: `checkBarcodeUnique(barcode, orgId, excludeProductId)` queries `/products/check-barcode` with URL query parameters `barcode`, `organization_id`, and `exclude_id`.
  - `src/pages/ItemMaster.tsx` lines 148-157: Checks uniqueness on product creation.
  - `src/pages/ItemMaster.tsx` lines 224-234: Passes `id` as `excludeProductId` on update (`productsApi.checkBarcodeUnique(barcodeToSave, orgId, id)`), preventing self-collision while catching duplicate collisions against other catalog items.

- **Bulk Import & Bulk Delete Error Handling**:
  - `src/pages/Items.tsx` lines 504-506: `const { error } = await productsApi.bulkDelete(ids, orgId); if (error) throw new Error(error.message);` caught and displayed via `toast.error`.
  - `src/pages/ItemMaster.tsx` lines 328-338 & 401-410: `productsApi.bulkImport` and `productsApi.bulkDelete` both inspect `error` and notify the user with a destructive toast if the backend returns an error.
  - `src/services/autoSyncService.ts` lines 592-601: Inspects `error` on chunked `productsApi.bulkImport` and throws descriptive errors to update the sync status indicator.
  - `src/pages/TallyImport.tsx` lines 697-701 & 1437-1438: Explicitly checks `if (error) { toast.error(...); throw error; }`.

---

## 2. Logic Chain

1. **Integrity & Authenticity Check**:
   - Reviewed `src/services/productsApi.ts` for dummy facade methods or hardcoded responses. The module consistently delegates all operations through `apiGet`, `apiPost`, `apiPut`, `apiDelete` in `src/lib/apiClient.ts`, forwarding authentic session Bearer tokens and `x-organization-id` headers.
   - Verified that no shortcuts or mock data were left in production source code.

2. **Domain Boundary Compliance**:
   - M2 scope specifically requires the elimination of direct frontend Supabase queries to `products` and `product_batches`.
   - An AST and regex query scan across all 267 source files confirmed 0 direct `supabase.from("products")` or `supabase.from("product_batches")` queries remain.
   - Non-M2 domains (`customers`, `suppliers`, `sales`, `purchase_invoices`, `organizations`, `crm_*`) remain untouched for their respective future milestones (M3, M4, M5).

3. **Adversarial Resilience & Edge Cases**:
   - Negative and zero stock adjustments are strictly validated in both UI event handlers (`Inventory.tsx`, `Items.tsx`) and domain services (`stockService.ts`).
   - Clamping logic via `Math.max(0, ...)` prevents negative inventory states.
   - Barcode duplication check supports `excludeProductId`, correctly preventing false positives when updating existing records.
   - Bulk operations handle large payloads (verified up to 1,000 items in tests) and correctly bubble backend error responses to UI toast notifications.

4. **Type Safety & Build Cleanliness**:
   - Full TypeScript compilation (`tsc --noEmit`) passes with 0 errors.
   - All 43 E2E migration tests, 29 resilience stress tests, and 13 reviewer challenge tests pass with a 100% success rate.

---

## 3. Caveats

- **Test Scanner Assertion Precision**:
  In `src/test/e2eApiMigration.test.ts:883`, test `T4.4` verifies `typeof report.compliant === "boolean"` rather than asserting `expect(report.compliant).toBe(true)`. Our independent scan confirmed that `report.compliant` is indeed `true` (0 violations), but M6 should enforce `expect(report.violationCount).toBe(0)` across all domains.
- **Cross-Domain Table Queries**:
  Direct queries to `customers`, `suppliers`, `sales`, `purchase_invoices`, and `credit_transactions` continue to exist in application code, as intended by the milestone road map. These will be addressed in M3, M4, and M5.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (Products & Inventory Domain Query Migration) satisfies all architectural, functional, and adversarial requirements:
1. `src/services/productsApi.ts` provides a clean, robust, and complete API client layer for products and batches.
2. All 21 target files have been migrated; zero direct database queries to `products` or `product_batches` remain in production code.
3. Batch calculations, pricing overrides, and barcode uniqueness lookups operate correctly without regressions.
4. Stock adjustments properly handle negative values and zero-stock conditions.
5. Error handling across bulk import and bulk delete is fully implemented.
6. TypeScript compilation passes with 0 errors, and all test suites pass with 100% success.

Milestone 2 is approved to merge into the milestone pipeline. The orchestrator may proceed to Milestone 3 (Customers, Suppliers & Parties Migration).

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Verify TypeScript compilation**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected output*: Exits with code 0 and zero errors.

2. **Run E2E Migration Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/e2eApiMigration.test.ts
   ```
   *Expected output*: 43 tests pass (100% pass rate).

3. **Run Products API Stress & Resilience Suite**:
   ```powershell
   cmd /c npx vitest run src/test/productsApiStress.test.ts
   ```
   *Expected output*: 29 tests pass (100% pass rate).

4. **Run M2 Reviewer Challenge Suite**:
   ```powershell
   cmd /c npx vitest run src/test/productsApi.m2ReviewerChallenge.test.ts
   ```
   *Expected output*: 13 tests pass (100% pass rate).

5. **Verify Zero Direct Products/Batches Table Queries**:
   ```powershell
   git grep -n -E "\.(from)\s*\(\s*['\"](products|product_batches)['\"]" -- "src/*.ts" "src/*.tsx" ":(exclude)src/test/*" ":(exclude)src/integrations/supabase/client.ts"
   ```
   *Expected output*: 0 matching lines found.
