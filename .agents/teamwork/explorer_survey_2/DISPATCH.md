# Dispatch: Backend API Routes Explorer (Survey 2)

Read:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`)
- All files in `backend-api/` (routes, database connector, server entry points)

Investigate:
1. `backend-api/src/routes/invoices.js`:
   - How sales are inserted.
   - Missing endpoints: `POST /api/sale-items` (bulk line item insert with batching), `DELETE /api/sale-items`, `DELETE /api/sale-items/sale/:saleId`, `POST /api/sales/bulk`.
   - Normalizing `total`/`total_amount` and `tax`/`tax_amount`.
   - How `POST /api/sales` can receive `items` and insert both sale + items in a single atomic SQL transaction.
2. `backend-api/src/routes/settings.js`:
   - Aliasing `/api/storefront-settings` to `/api/storefront`.
   - How membership queries handle `org_id` vs `organization_id` queries without runtime errors.
3. `backend-api/src/routes/parties.js`:
   - How `POST /customers` and `POST /suppliers` handle missing fields and return 201 records.
4. Deployment context:
   - Review Dockerfile, docker-compose.yml, environment variables, server structure.

Deliverable:
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_2/handoff.md`.

## 2026-10-20T10:45:15Z
You are Explorer Survey 2. Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2`. Read `DISPATCH.md` in your working directory and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`).
Investigate `backend-api/` (routes `invoices.js`, `settings.js`, `parties.js`, db connection, server entry points).
Analyze what's required for:
1. `POST /api/sale-items` bulk line items with batching.
2. `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId`.
3. `POST /api/sales/bulk`.
4. Normalizing `total`/`total_amount` and `tax`/`tax_amount` in `POST /api/sales`.
5. Atomic sale + items transaction in `POST /api/sales`.
6. Aliasing `/api/storefront-settings` to `/api/storefront`.
7. Membership query handling for `org_id` and `organization_id`.
8. Sanitizing `POST /customers` and `POST /suppliers` to return 201 records.
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_2/handoff.md` and send a message back when done.
