# Milestone M2 Challenger Report: AST / Grep Compliance Verification

**Challenger Agent**: `challenger_m2_2`  
**Milestone**: M2 — Products & Inventory Domain Query Migration  
**Artifacts under Test**:  
- Project Specification: `PROJECT.md`  
- Frontend Application Codebase: `src/`  
- Migration E2E Suite: `src/test/e2eApiMigration.test.ts`  
- Independent Challenger AST Suite: `src/test/m2GrepAstChallenger.test.ts`  
**Gate Verdict**: **APPROVE**  
**Date**: 2026-10-18T19:11:00Z  

---

## 1. Observation

Direct empirical observations, tool executions, and file inspection outputs:

### 1.1 Direct Ripgrep / Static Scans for Table Queries
- Scanned all non-test TypeScript/TSX source files across `src/` for queries targeting `products` and `product_batches`:
  - Query: `\.from\(\s*["'`]products["'`]\s*\)`
    * Application files (`src/` excluding `src/test/`): **0 matches**
    * Test files: Found only in `src/test/tallyE2E.test.ts` (mockDb) and `src/test/e2eApiMigration.test.ts` (sample strings inside scanner unit tests).
  - Query: `\.from\(\s*["'`]product_batches["'`]\s*\)`
    * Application files (`src/` excluding `src/test/`): **0 matches**
    * Test files: Found only in `src/test/tallyE2E.test.ts` (mockDb) and `src/test/e2eApiMigration.test.ts` (scanner switch-case branch).
  - Storage bucket preservation:
    * `src/components/storefront/StorefrontCatalogTab.tsx`: Preserves `supabase.storage.from("store-logos")` for binary logo asset uploads while containing zero table queries for `products`.

### 1.2 Verification of 21 Migrated M2 Application Files
Each of the 21 target files identified in the M2 migration scope was checked for `productsApi` consumption and zero `supabase.from("products" | "product_batches")` calls:
1. `src/context/ProductsContext.tsx` — Consumes `productsApi.getProducts`, zero direct table queries.
2. `src/pages/Items.tsx` — Consumes `productsApi`, zero direct table queries.
3. `src/pages/ItemMaster.tsx` — Consumes `productsApi`, zero direct table queries.
4. `src/pages/Inventory.tsx` — Consumes `productsApi`, zero direct table queries.
5. `src/services/stockService.ts` — Consumes `productsApi`, zero direct table queries.
6. `src/pages/POSBilling.tsx` — Consumes `productsApi`, zero direct table queries.
7. `src/pages/BarcodeGenerator.tsx` — Consumes `productsApi`, zero direct table queries.
8. `src/pages/PurchaseReturns.tsx` — Consumes `productsApi`, zero direct table queries.
9. `src/components/storefront/StorefrontCatalogTab.tsx` — Consumes `productsApi`, zero direct table queries.
10. `src/services/storefrontService.ts` — Consumes `productsApi`, zero direct table queries.
11. `src/utils/offlineQueue.ts` — Consumes `productsApi`, zero direct table queries.
12. `src/components/items/QuickCreateItemModal.tsx` — Consumes `productsApi`, zero direct table queries.
13. `src/components/PurchaseInvoiceForm.tsx` — Consumes `productsApi`, zero direct table queries.
14. `src/components/AppLayout.tsx` — Consumes `productsApi`, zero direct table queries.
15. `src/pages/Dashboard.tsx` — Consumes `productsApi`, zero direct table queries.
16. `src/hooks/useOrganization.tsx` — Consumes `productsApi`, zero direct table queries.
17. `src/pages/Auth.tsx` — Consumes `productsApi`, zero direct table queries.
18. `src/services/documentsService.ts` — Consumes `productsApi`, zero direct table queries.
19. `src/services/networkInvoicingService.ts` — Consumes `productsApi`, zero direct table queries.
20. `src/services/autoSyncService.ts` — Consumes `productsApi`, zero direct table queries.
21. `src/pages/TallyImport.tsx` — Consumes `productsApi`, zero direct table queries.

### 1.3 Execution of Verification Test Suites & Static Check
1. **TypeScript Typecheck**:
   - Command: `cmd /c npx tsc --noEmit`
   - Result: Exited with code 0 (0 errors).
2. **E2E Migration Test Suite**:
   - Command: `cmd /c npx vitest run src/test/e2eApiMigration.test.ts`
   - Output verbatim:
     ```
     ✓ src/test/e2eApiMigration.test.ts (43 tests) 2027ms
     Test Files  1 passed (1)
          Tests  43 passed (43)
     ```
3. **Independent Challenger AST Test Suite**:
   - Implemented in: `src/test/m2GrepAstChallenger.test.ts`
   - Command: `cmd /c npx vitest run src/test/m2GrepAstChallenger.test.ts`
   - Output verbatim:
     ```
     ✓ src/test/m2GrepAstChallenger.test.ts (7 tests) 598ms
     Test Files  1 passed (1)
          Tests  7 passed (7)
     ```
4. **Combined Test Verification**:
   - Command: `cmd /c npx vitest run src/test/e2eApiMigration.test.ts src/test/m2GrepAstChallenger.test.ts`
   - Output: 2 passed test files, 50 passed tests (100% pass rate).
5. **API Client Unit Suite**:
   - Command: `cmd /c npx vitest run src/test/apiClient.test.ts`
   - Output: 53 passed tests out of 53.

---

## 2. Logic Chain

1. **AST & Grep Completeness (Observation 1.1 & 1.2)**:
   - Application code across all 267 production `.ts` and `.tsx` source files in `src/` was traversed recursively.
   - Both single-line and multi-line regex patterns matching `(?:supabase|client|\bdb)\s*\.?\s*from\s*\(\s*["'`]\s*(products|product_batches)\s*["'`]\s*\)` were evaluated against every file.
   - Result is 0 violations. This proves that all direct Supabase client queries for the `products` and `product_batches` database tables have been eliminated from application code.

2. **Integration with Centralized API Layer (Observation 1.2 & 1.3)**:
   - `src/services/productsApi.ts` interfaces directly with `apiClient`, `apiGet`, `apiPost`, `apiPut`, and `apiDelete`.
   - Inspection confirms `productsApi.ts` does not contain recursive direct table queries.
   - All 21 target files consume `productsApi` methods (`getProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkImport`, `adjustStock`, `getBatches`, `createBatch`, `updateBatch`, `deleteBatch`, `bulkUpsertBatches`, `checkBarcodeUnique`).

3. **Compiler and Behavioral Parity (Observation 1.3)**:
   - `tsc --noEmit` verifies strict compile-time type safety with zero type errors across all migrated call sites and signatures.
   - `vitest run src/test/e2eApiMigration.test.ts` validates Tier 1 (features 1–10), Tier 2 (boundary & corner cases), Tier 3 (cross-domain contract parity), and Tier 4 (static AST grep scanner).
   - `vitest run src/test/m2GrepAstChallenger.test.ts` provides adversarial verification with 7 dedicated assertion steps.

---

## 3. Caveats

- Direct Supabase table queries for unmigrated domains (`customers`, `suppliers`, `credit_transactions`, `sales`, `purchase_invoices`, `organizations`, `crm_*`) remain present in application code, as scheduled for subsequent Milestones (M3, M4, M5).
- Storage bucket access via `supabase.storage.from("store-logos")` in `StorefrontCatalogTab.tsx` is preserved as intended for binary file handling.

---

## 4. Conclusion

**Gate Verdict**: **APPROVE**

Milestone 2 (M2: Products & Inventory Domain Query Migration) satisfies all acceptance criteria:
1. **0 direct table queries** exist for `products` or `product_batches` across all production application code files in `src/`.
2. All 21 target files are properly integrated with `src/services/productsApi.ts`.
3. `cmd /c npx vitest run src/test/e2eApiMigration.test.ts` passes 43/43 tests (100%).
4. `cmd /c npx tsc --noEmit` exits with code 0 (zero errors).
5. Independent challenger test harness `src/test/m2GrepAstChallenger.test.ts` passes 7/7 tests (100%).

---

## 5. Verification Method

To independently reproduce and verify this verdict:

1. **Run E2E Migration Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/e2eApiMigration.test.ts
   ```
   *Expected*: 43 tests pass (100% pass rate).

2. **Run Challenger AST & Grep Scan Suite**:
   ```powershell
   cmd /c npx vitest run src/test/m2GrepAstChallenger.test.ts
   ```
   *Expected*: 7 tests pass (100% pass rate).

3. **Run TypeScript Strict Compiler Check**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Exits with code 0 and zero compilation errors.

4. **Invalidation Conditions**:
   - Any match for `supabase.from("products")` or `supabase.from("product_batches")` in any non-test file under `src/`.
   - Any test failure in `e2eApiMigration.test.ts` or `m2GrepAstChallenger.test.ts`.
   - Any type error in `tsc --noEmit`.
