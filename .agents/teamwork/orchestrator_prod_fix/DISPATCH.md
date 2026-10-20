# Orchestrator Dispatch: Production Fixes

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_prod_fix`

## Authoritative User Request
Refer to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`).

## Mission Objectives
Resolve critical production issues where:
1. No data is being stored across products, customers/parties, and invoices.
2. Entity creation endpoints fail with 500 errors (e.g. `column "org_id" does not exist`).
3. Existing and newly created items, parties, and customers are not visible in list/table views.
4. Bill generation hangs or takes excessive time (several seconds) due to synchronous PDF rendering, unbatched queries, and blocking network dispatches.

Server target: Ubuntu server (`woodzire@credsmart:~/server`), `postgres-db`, `backend-api` container

## Requirements Summary
- **R1. Live Database Schema Alignment & Resilient Migrations**:
  - `fix_db.sql`: ensure every table has both `org_id` and `organization_id` bidirectionally synchronized (generated/stored triggers or columns), missing columns in `customers` and `suppliers` (`trade_name`, `shipping_address`, `category`, `credit_period_days`, `custom_fields`), indexes on tenant IDs and primary query filters (`barcode`, `sku`, `phone`, `sale_date`, `created_at`). Safe to run repeatedly on PostgreSQL 16 without errors or data loss.
- **R2. Backend Route Completion & Full Contract Parity**:
  - In `backend-api/src/routes/invoices.js`:
    - `POST /api/sale-items` (bulk line item insert with batching).
    - `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId`.
    - `POST /api/sales/bulk` (bulk sales insertion).
    - Normalize field names in `POST /api/sales` so both `total` and `total_amount`, `tax` and `tax_amount` are accepted.
    - Support receiving `items` directly in `POST /api/sales` to insert sale + items in a single atomic SQL transaction.
  - In `backend-api/src/routes/settings.js`:
    - Alias `/api/storefront-settings` to `/api/storefront` so frontend calls never 404.
    - Fix membership queries to safely handle cases where either `org_id` or `organization_id` is queried without throwing runtime column errors.
  - In `backend-api/src/routes/parties.js`:
    - Ensure `POST /customers` and `POST /suppliers` gracefully sanitize missing fields and return complete 201 records.
- **R3. Lightning-Fast Bill Generation (< 500ms)**:
  - In `SalesInvoiceModal.tsx` & `MobileCreateInvoice.tsx`:
    - Decouple heavy `downloadExactInvoicePdf` (`html2canvas`) from the "Generate Bill" click flow on mobile; transition instantly to `MobileInvoiceSuccessView` and allow downloading/printing on demand.
    - Run `networkInvoicingService.sendSalesInvoiceToNetwork` asynchronously as a non-blocking background task (`void sendSalesInvoiceToNetwork(...)`) instead of awaiting it on the main save thread.
    - In `documentsService.saveDocument`, send the sale AND its items together in a single API call when creating or updating, avoiding multiple sequential network round-trips.
- **R4. List Visibility & Frontend Cache Hydration**:
  - In `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts`:
    - Fall back to local cached data with a non-blocking toast warning if the cloud API encounters a transient network error, rather than clearing the state to empty arrays.
    - Normalize and display all created items and parties immediately in memory upon successful creation.
- **R5. One-Click Automated Server Deployment Script**:
  - Clean deployment script (`deploy-fix.sh`) and instructions to copy updated `backend-api` files to `~/server/api/`, run `docker exec -i postgres-db psql -U postgres -d app_db < fix_db.sql`, rebuild/restart `backend-api` container via `docker compose up -d --build api`, and verify health via `curl http://localhost:3000/health`.

## Orchestration Guidelines
- Decompose work into clear milestones.
- Spawn specialist workers/reviewers/challengers.
- Track progress continuously in your working directory's `progress.md` and `BRIEFING.md`.
- Ensure tests, type checks, and verifications pass.


## 2026-10-20T10:41:35Z
You are the Project Orchestrator for resolving critical production issues across database schema, backend API routes, fast bill generation, frontend cache hydration/visibility, and server deployment scripts.
Your working directory is: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_prod_fix`
Read your instructions in `DISPATCH.md` in your working directory and the verbatim user request in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.
Maintain your BRIEFING.md, plan.md, and progress.md in your working directory.
Orchestrate specialists to execute all requirements R1 through R5, verify thoroughly, and report completion back when ready.
