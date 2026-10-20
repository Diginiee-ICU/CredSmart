# Scope: Production Fixes Across Database, Backend, Frontend & Deployment

## Architecture
- **Database Layer**: PostgreSQL 16 on Docker container (`postgres-db`), database `app_db`.
  - Schema alignment script: Root `fix_db.sql` and `backend-api/fix_db.sql`. Universal `sync_org_id_and_organization_id()` trigger attached to all 42 tenant tables for zero-overhead, zero-downtime bidirectional synchronization. Full column complement on `customers` and `suppliers`. Composite B-tree performance indexes on tenant IDs and primary filters.
- **Backend API Layer**: Node.js / Express in `backend-api/` container.
  - Route modules: `invoices.js`, `settings.js`, `parties.js`, `products.js`.
  - Line items endpoints (`POST /api/sale-items`, `DELETE /api/sale-items`, `DELETE /api/sale-items/sale/:saleId`).
  - Bulk endpoints (`POST /api/sales/bulk`).
  - Atomic sale+items transaction in `POST /api/sales` and `PUT /api/sales/:id`.
  - Storefront alias `/api/storefront-settings` -> `/api/storefront`.
  - Resilient membership queries and sanitized party creation.
- **Frontend App Layer**: React 18 + Vite + TypeScript PWA.
  - Fast billing: Decoupled PDF generation from mobile click path, unawaited background network invoicing, single-call sale+items persistence in `documentsService.ts`.
  - Cache hydration & visibility: Optimistic local cache fallback with warning toast, immediate in-memory state reflection upon creation in `ProductsContext.tsx`, `Customers.tsx`, and `Parties.tsx`.
- **Deployment Layer**: Automated script `deploy-fix.sh` targeting Ubuntu server (`woodzire@credsmart:~/server`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dual Org Column Sync | Bidirectional trigger sync of `org_id` and `organization_id` on all 42 tables | M1 | R1 |
| 2 | Complete Party Columns | Add `gstin`, `city`, `state`, `trade_name`, `shipping_address`, `category`, `credit_limit`, `credit_period_days`, `custom_fields`, `opening_balance`, `balance_type`, `is_active` | M1 | R1 |
| 3 | Query & Filter Indexes | Composite B-tree indexes on tenant IDs, barcodes, skus, phones, sales dates | M1 | R1 |
| 4 | Membership Table Sync | Dual synchronization between `org_memberships` and `organization_memberships` | M1 | R1 |
| 5 | Bulk Line Items API | `POST /api/sale-items` with batching and stock decrement | M2 | R2 |
| 6 | Line Items Deletion API | `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId` | M2 | R2 |
| 7 | Bulk Sales API | `POST /api/sales/bulk` bulk sales insertion | M2 | R2 |
| 8 | Sales Field Normalization | Accept both `total`/`total_amount` and `tax`/`tax_amount` | M2 | R2 |
| 9 | Atomic Sale + Items Transaction | In `POST /api/sales` and `PUT /api/sales/:id`, atomic sale+items SQL transaction | M2 | R2 |
| 10 | Storefront Route Alias | Alias `/api/storefront-settings` to `/api/storefront` with public slug lookup | M2 | R2 |
| 11 | Membership Query Resiliency | Resilient query helper for `org_memberships`/`organization_memberships` | M2 | R2 |
| 12 | Party Creation Sanitization | Sanitize missing fields and numeric strings (`""` -> 0) in `POST /customers` & `POST /suppliers` | M2 | R2 |
| 13 | Decouple Heavy PDF on Bill Gen | Remove synchronous `html2canvas` PDF generation on Mobile "Generate Bill" | M3 | R3 |
| 14 | Async Network Invoicing | Fire `sendSalesInvoiceToNetwork` as unawaited background task | M3 | R3 |
| 15 | Single-Call Sale + Items Save | Update `documentsService.saveDocument` to send sale and items in 1 network call | M3 | R3 |
| 16 | Resilient Local Cache Fallback | Retain cached data with non-blocking warning toast on transient network errors | M4 | R4 |
| 17 | Instant In-Memory List Update | Immediately prepend created items/parties in local React state and localStorage | M4 | R4 |
| 18 | One-Click Deployment Script | `deploy-fix.sh` automating file copy, db migration, container rebuild, healthcheck | M5 | R5 |
| 19 | Full E2E & Regressions Check | Run typecheck, unit tests, and validation audits | M5 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Live DB Schema Alignment | `fix_db.sql` dual columns, party schema, indexes | none | IN_PROGRESS |
| 2 | M2: Backend Route Completion & Parity | `backend-api/src/routes/invoices.js`, `settings.js`, `parties.js` | M1 | PLANNED |
| 3 | M3: Lightning-Fast Bill Generation (<500ms) | `SalesInvoiceModal.tsx`, `MobileCreateInvoice.tsx`, `documentsService.ts` | M2 | PLANNED |
| 4 | M4: List Visibility & Frontend Cache Hydration | `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, `documentsService.ts` | M2 | PLANNED |
| 5 | M5: Deployment Script & Verification | `deploy-fix.sh`, tests, typechecks, healthchecks | M1, M2, M3, M4 | PLANNED |
