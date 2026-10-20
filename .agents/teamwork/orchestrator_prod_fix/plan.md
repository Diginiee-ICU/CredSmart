# Execution Plan: Production Fixes (R1–R5)

## Objectives
Resolve critical production issues affecting database schema synchronization, backend API endpoints, fast bill generation on mobile and desktop, frontend cache persistence/visibility, and automated server deployment.

## Milestones

### Milestone 1: Live Database Schema Alignment & Resilient Migrations (R1)
- **Goal**: Author `fix_db.sql` that:
  - Ensures every table has both `org_id` and `organization_id` bidirectionally synchronized (triggers or columns).
  - Ensures all missing columns in `customers` and `suppliers` exist (`trade_name`, `shipping_address`, `category`, `credit_period_days`, `custom_fields`).
  - Ensures indexes on tenant IDs and primary query filters (`barcode`, `sku`, `phone`, `sale_date`, `created_at`).
  - Idempotent and safe to execute repeatedly on PostgreSQL 16 without errors or data loss.
- **Verification**: SQL syntax test, schema inspection, idempotency test.

### Milestone 2: Backend Route Completion & Full Contract Parity (R2)
- **Goal**: In `backend-api`:
  - `routes/invoices.js`:
    - Implement `POST /api/sale-items` (bulk line item insert with batching).
    - Implement `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId`.
    - Implement `POST /api/sales/bulk` (bulk sales insertion).
    - Normalize field names in `POST /api/sales` (`total`/`total_amount`, `tax`/`tax_amount`).
    - Support receiving `items` directly in `POST /api/sales` to insert sale + items in a single atomic SQL transaction.
  - `routes/settings.js`:
    - Alias `/api/storefront-settings` to `/api/storefront`.
    - Fix membership queries to safely handle `org_id` or `organization_id` queries.
  - `routes/parties.js`:
    - Ensure `POST /customers` and `POST /suppliers` sanitize missing fields and return 201 records.
- **Verification**: Route unit/integration tests, response shape checks, 201/200 HTTP status verification.

### Milestone 3: Lightning-Fast Bill Generation (< 500ms) (R3)
- **Goal**:
  - In `SalesInvoiceModal.tsx` & `MobileCreateInvoice.tsx`:
    - Decouple heavy `downloadExactInvoicePdf` (`html2canvas`) from the "Generate Bill" click flow on mobile; transition instantly to `MobileInvoiceSuccessView` and allow downloading/printing on demand.
    - Run `networkInvoicingService.sendSalesInvoiceToNetwork` asynchronously as a non-blocking background task (`void sendSalesInvoiceToNetwork(...)`).
  - In `documentsService.saveDocument`:
    - Send sale and its items together in a single API call when creating or updating, avoiding multiple sequential network round-trips.
- **Verification**: Performance benchmarks, modal transition tests, single API payload tests.

### Milestone 4: List Visibility & Frontend Cache Hydration (R4)
- **Goal**:
  - In `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts`:
    - Fall back to local cached data with a non-blocking toast warning if cloud API encounters transient network errors, rather than clearing state to empty arrays.
    - Normalize and display all created items and parties immediately in memory upon successful creation.
- **Verification**: Cache fallback tests, offline/network error simulation tests, in-memory immediate update verification.

### Milestone 5: Automated Server Deployment Script & E2E Acceptance (R5)
- **Goal**:
  - Create `deploy-fix.sh` and deployment instructions:
    - Copies updated `backend-api` files into `~/server/api/`.
    - Executes `docker exec -i postgres-db psql -U postgres -d app_db < fix_db.sql`.
    - Rebuilds and restarts the `backend-api` container via `docker compose up -d --build api`.
    - Verifies health via `curl http://localhost:3000/health`.
  - Comprehensive end-to-end verification and testing suite execution.
- **Verification**: Script linting, dry-run validation, full suite regression testing (`tsc --noEmit`, vitest suites).
