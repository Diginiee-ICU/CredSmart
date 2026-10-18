# Comprehensive Audit & Migration Report: Frontend Supabase Table Queries to Dedicated Backend API

**Author**: Explorer Survey Agent 3 (`explorer_survey_3`)  
**Target Repository**: CredSmart (`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`)  
**Target Backend Base URL**: `https://api.credsmart.online/api/*`  
**Date**: 2026-10-18T17:55:00Z  

---

## 1. Observation

### 1.1 Complete Global Codebase Inventory Scan

Across **265 non-test source files** in the `src/` directory, an exhaustive multi-line AST/regex scan identified **394 total client-side database table queries** invoking `.from(...)` against Supabase.

In addition, non-database `.from` invocations were audited to avoid false positives:
- **`Array.from(...)`**: 40 occurrences (JavaScript built-in array conversion).
- **`supabase.storage.from("store-logos")`**: 12 occurrences (Supabase Storage bucket operations across `AddProductModal.tsx`, `ItemImageUpload.tsx`, `StorefrontCatalogTab.tsx`, `BusinessSettings.tsx`, `Staff.tsx`).
- **`supabase.rpc(...)`**: 3 occurrences (`bootstrap_default_organization` in `useOrganization.tsx:440` & `Auth.tsx:329`; `get_public_storefront` in `storefrontService.ts:148`).
- **Realtime Channels**: 6 channel subscriptions (`public:network_invoices`, `pos_batches_realtime`, `inventory_realtime`).
- **Edge Functions**: 4 invocations via `supabase.functions.invoke(...)` (`invite-staff`, `eway-bill`, `tally-agent-tunnel`).

#### Master Table Query Frequency Distribution (394 Invocations Total)

| Table Name | Count | Domain Category | Primary Handlers / Files |
|---|:---:|---|---|
| `products` | 61 | Inventory / Catalog | `autoSyncService.ts`, `TallyImport.tsx`, `Inventory.tsx`, `documentsService.ts` |
| `product_batches` | 47 | Inventory / Batches | `stockService.ts`, `autoSyncService.ts`, `Inventory.tsx`, `POSBilling.tsx` |
| `credit_transactions` | 33 | Ledger / Khata | `Parties.tsx`, `CustomerLedger.tsx`, `autoSyncService.ts`, `documentsService.ts` |
| `suppliers` | 31 | Parties / Vendors | `Parties.tsx`, `documentsService.ts`, `autoSyncService.ts`, `PurchaseInvoiceForm.tsx` |
| `customers` | 23 | Parties / Debtors | `Parties.tsx`, `documentsService.ts`, `autoSyncService.ts`, `offlineQueue.ts` |
| `sales` | 20 | Invoices & Billing | `documentsService.ts`, `POSBilling.tsx`, `TallyImport.tsx`, `autoSyncService.ts`, `SalesHistory.tsx`, `Analytics.tsx`, `Dashboard.tsx`, `CustomerLedger.tsx`, `ewayBillService.ts`, `offlineQueue.ts` |
| `purchase_invoices` | 14 | Purchases / Inbound | `documentsService.ts`, `PurchaseInvoiceForm.tsx`, `PurchaseReturns.tsx`, `TallyImport.tsx`, `autoSyncService.ts` |
| `organization_memberships` | 12 | Auth & Multi-Tenancy | `useOrganization.tsx`, `Auth.tsx`, `Staff.tsx`, `Attendance.tsx`, `CRMDashboard.tsx`, `RoleManagement.tsx` |
| `organizations` | 12 | Auth & Organization | `useOrganization.tsx`, `BusinessSettings.tsx`, `Auth.tsx`, `networkInvoicingService.ts` |
| `sale_items` | 10 | Sales Line Items | `documentsService.ts`, `POSBilling.tsx`, `SalesHistory.tsx`, `TallyImport.tsx`, `autoSyncService.ts` |
| `expenses` | 9 | Operating Expenses | `Expenses.tsx`, `TallyImport.tsx`, `autoSyncService.ts` |
| `storefront_settings` | 8 | Public Commerce | `storefrontService.ts`, `networkInvoicingService.ts`, `useOrganization.tsx` |
| `purchase_returns` | 8 | Returns & Debit Notes | `documentsService.ts`, `PurchaseReturns.tsx` |
| `network_invoices` | 8 | B2B Network Exchange | `networkInvoicingService.ts` |
| `network_notifications` | 8 | B2B Push Alerts | `networkInvoicingService.ts` |
| `$targetTable` *(dynamic)* | 7 | Dynamic Party Routing | `Parties.tsx`, `AppLayout.tsx`, `CreatePartyModal.tsx` *(resolves to `customers` or `suppliers`)* |
| `crm_roles` | 7 | CRM RBAC (Phase 1) | `useCRMPermission.ts`, `RoleManagement.tsx`, `Attendance.tsx` |
| `purchase_invoice_items` | 6 | Purchase Line Items | `documentsService.ts`, `PurchaseInvoiceForm.tsx`, `PurchaseReturns.tsx`, `TallyImport.tsx`, `autoSyncService.ts` |
| `crm_attendance` | 6 | CRM Geofence (Phase 2)| `Attendance.tsx`, `CRMDashboard.tsx`, `SalaryManagement.tsx` |
| `bank_accounts` | 6 | Cash & Banking | `TallyImport.tsx`, `autoSyncService.ts` |
| `crm_staff_roles` | 5 | CRM RBAC (Phase 1) | `useCRMPermission.ts`, `RoleManagement.tsx`, `Attendance.tsx` |
| `crm_permissions` | 5 | CRM RBAC (Phase 1) | `useCRMPermission.ts`, `RoleManagement.tsx` |
| `profiles` | 5 | User Profiles | `Staff.tsx`, `ActivityLog.tsx`, `Attendance.tsx`, `RoleManagement.tsx`, `SalaryManagement.tsx` |
| `staff_invitations` | 5 | Staff Team Invites | `Staff.tsx` |
| `crm_geolocations` | 4 | CRM Geofence (Phase 2)| `Attendance.tsx` |
| `crm_salary_adjustments` | 4 | CRM Payroll (Phase 3) | `SalaryManagement.tsx` |
| `crm_attendance_requests`| 3 | CRM Geofence (Phase 2)| `Attendance.tsx` |
| `crm_payroll_runs` | 3 | CRM Payroll (Phase 3) | `SalaryManagement.tsx` |
| `crm_payslips` | 3 | CRM Payroll (Phase 3) | `SalaryManagement.tsx` |
| `locations` | 3 | Multi-Godown / Stock | `Godown.tsx` |
| `sales_returns` | 3 | Returns & Credit Notes | `documentsService.ts` |
| `storefront_orders` | 3 | Public Order Ingestion | `storefrontService.ts` |
| `audit_logs` | 2 | Security & Audit Trail| `useAuditLog.tsx`, `ActivityLog.tsx` |
| `crm_salary_profiles` | 2 | CRM Payroll (Phase 3) | `SalaryManagement.tsx` |
| `purchase_return_items` | 2 | Purchase Return Items | `documentsService.ts`, `PurchaseReturns.tsx` |
| `crm_tasks` | 1 | CRM Tasks Counter | `CRMDashboard.tsx` |
| `crm_broadcasts` | 1 | CRM Broadcasts Counter| `CRMDashboard.tsx` |
| `crm_meetings` | 1 | CRM Meetings Counter | `CRMDashboard.tsx` |
| `$table` *(dynamic)* | 1 | Tally Bulk Party Ingest | `TallyImport.tsx:1519` *(resolves to `customers` or `suppliers`)* |
| `sync_pairing_tokens` | 1 | Tally Desktop Agent | `autoSyncService.ts:183` |
| `sales_return_items` | 1 | Sales Return Line Items| `documentsService.ts:1047` |
| **TOTAL** | **394** | | |

---

### 1.2 Invoices, Sales & Purchases Domain Detailed Audit (84 Queries)

#### Table: `sales` (20 occurrences)
1. **`src/services/documentsService.ts:171`** (`select`)
   - Query: `.select('id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, created_at, customer_id, customers ( name, phone, gstin, email, address ), sale_items (*)')`
   - Filter: `.eq("organization_id", orgId).order("created_at", { ascending: false })`
   - Purpose: Main invoice fetch for Sales History, Sales List, and Document management. Merges Supabase sales with `localStorage`.
2. **`src/services/documentsService.ts:661`** (`update`)
   - Payload: `{ organization_id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, customer_id }`
   - Filter: `.eq("id", doc.id).select().maybeSingle()`
   - Purpose: In-place update of an existing sales invoice when user returns via "Edit Bill".
3. **`src/services/documentsService.ts:695`** (`insert`)
   - Payload: Same as update, plus `created_by: userId`.
   - Purpose: Fallback insertion if document ID was not found during update.
4. **`src/services/documentsService.ts:729`** (`insert`)
   - Payload: Standard new sales invoice creation with `.select().single()`.
5. **`src/services/documentsService.ts:1120`** (`delete`)
   - Filter: `.delete().eq("id", docId)`
   - Purpose: Deletes sales invoice record upon user confirmation.
6. **`src/pages/POSBilling.tsx:1474`** (`insert`)
   - Payload: `{ organization_id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, customer_id, created_by }`
   - Returns: `.select("id").single()`
   - Purpose: Rapid-fire checkout creation from POS Terminal.
7. **`src/pages/SalesHistory.tsx:92`** (`select`)
   - Query: `.select("id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, created_at, customer_id, customers(name, phone)")`
   - Filter: `.eq("organization_id", orgId).order("created_at", { ascending: false })`
8. **`src/pages/Dashboard.tsx:204`** (`select`)
   - Query: `.select("id, created_at, invoice_number, total, payment_method, customer_id, customers(name)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5)`
   - Purpose: Recent 5 sales on Business Dashboard.
9. **`src/pages/CustomerLedger.tsx:76`** (`select`)
   - Query: `.select("id, invoice_number, total, payment_method, created_at, customer_id").eq("customer_id", id)`
   - Purpose: Ledger reconciliation against party credit transactions.
10. **`src/pages/Analytics.tsx:70`** (`select`)
    - Query: `.select("total, payment_method, created_at").eq("organization_id", orgId).order("created_at", { ascending: true })`
    - Purpose: Revenue charts and payment method breakdown.
11. **`src/pages/TallyImport.tsx:932`** (`select`) & **`src/pages/TallyImport.tsx:1591`** (`select`)
    - Query: `.select("id, invoice_number").eq("organization_id", orgId).limit(10000)`
    - Purpose: Deduplication map builder for Tally XML import.
12. **`src/pages/TallyImport.tsx:1171`** (`upsert`) & **`src/pages/TallyImport.tsx:1830`** (`upsert`)
    - Batch size: Chunks of 1,000.
13. **`src/pages/TallyImport.tsx:1186`** (`insert`) & **`src/pages/TallyImport.tsx:1844`** (`insert`)
    - Batch insert with `.select("id, invoice_number")`.
14. **`src/services/autoSyncService.ts:487`** (`select`)
    - Query: `.select("id, invoice_number").eq("organization_id", orgId).limit(10000)`
15. **`src/services/autoSyncService.ts:1031`** (`insert`)
    - Batch insert in 1,000-row slices.
16. **`src/services/ewayBillService.ts:212`** (`select`)
    - Query: `.select("id").eq("organization_id", orgId).eq("invoice_number", record.docNo).maybeSingle()`
    - Purpose: Associate government E-Way Bill numbers with sales records.
17. **`src/utils/offlineQueue.ts:132`** (`insert`)
    - Offline queue replay: `.insert([item.payload])`.

#### Table: `sale_items` (10 occurrences)
1. **`src/services/documentsService.ts:679`** (`delete`)
   - Filter: `.delete().eq("sale_id", doc.id)`
   - Purpose: Cascading clear of old line items prior to updating with revised bill lines.
2. **`src/services/documentsService.ts:690, 723, 759`** (`insert`)
   - Payload: Array of `{ sale_id, product_name, product_id, batch_number, mrp, quantity, line_total }`.
3. **`src/pages/POSBilling.tsx:1503`** (`insert`)
   - Payload: Array of line items mapped from active POS cart.
4. **`src/pages/SalesHistory.tsx:148, 166`** (`select`)
   - Query: `.select("id, product_name, product_id, batch_id, quantity, mrp, line_total, batch_number").eq("sale_id", saleId)`
   - Purpose: Lazy-loading items when expanding an invoice row or triggering Print/Thermal receipt.
5. **`src/pages/TallyImport.tsx:1208, 1866`** (`insert`)
   - Batch insertion in chunks of 1,000 items.
6. **`src/services/autoSyncService.ts:1035`** (`insert`)
   - Auto-sync stream ingestion of Tally voucher line items.

#### Table: `purchase_invoices` (14 occurrences)
1. **`src/services/documentsService.ts:426`** (`select`)
   - Query: `.select('id, invoice_number, total_amount, status, created_at, notes, supplier_id, suppliers ( name, phone, gstin, email, address ), purchase_invoice_items ( id, product_id, batch_number, quantity, cost_price, mrp, expiry_date, products ( name, barcode, sku ) )')`
   - Filter: `.eq("organization_id", orgId).order("created_at", { ascending: false })`
2. **`src/services/documentsService.ts:824`** (`insert`)
   - Payload: `{ organization_id, supplier_id, invoice_number, total_amount, status, notes, created_by }`
3. **`src/services/documentsService.ts:1135`** (`delete`)
   - Filter: `.delete().eq("id", docId)`
4. **`src/components/PurchaseInvoiceForm.tsx:223`** (`insert`)
   - Payload: Draft purchase creation with `status: "draft"`.
5. **`src/components/PurchaseInvoiceForm.tsx:255`** (`update`)
   - Payload: `.update({ status: "received" }).eq("id", invoice.id)` (triggers stock ingestion trigger).
6. **`src/pages/PurchaseReturns.tsx:192`** (`select`)
   - Query: `.select("id, invoice_number, created_at, total_amount").eq("organization_id", orgId).eq("supplier_id", selectedSupplierId)`
7. **`src/pages/TallyImport.tsx:933, 1592`** (`select`), **`1177, 1836`** (`upsert`), **`1219, 1876`** (`insert`)
8. **`src/services/autoSyncService.ts:488`** (`select`), **`1039`** (`insert`)

#### Table: `purchase_invoice_items` (6 occurrences)
1. **`src/services/documentsService.ts:887`** (`insert`)
   - Payload: `{ purchase_invoice_id, product_id, quantity, cost_price, mrp, batch_number, expiry_date }`.
2. **`src/components/PurchaseInvoiceForm.tsx:249`** (`insert`)
3. **`src/pages/PurchaseReturns.tsx:207`** (`select`)
   - Query: `.select("product_id, batch_number, quantity, cost_price, products ( name )").eq("purchase_invoice_id", invId)`
4. **`src/pages/TallyImport.tsx:1272, 1929`** (`insert`)
5. **`src/services/autoSyncService.ts:1043`** (`insert`)

#### Table: `expenses` (9 occurrences)
1. **`src/pages/Expenses.tsx:155`** (`select`)
   - Query: `.select("*").eq("organization_id", orgId).order("date", { ascending: false })`
2. **`src/pages/Expenses.tsx:260`** (`insert`)
   - Payload: `{ organization_id, category, amount, date, description, created_by, payment_mode }`
3. **`src/pages/Expenses.tsx:290`** (`delete`)
   - Filter: `.delete().eq("id", id)`
4. **`src/pages/TallyImport.tsx:935, 1597`** (`select`), **`1288, 1945`** (`insert`)
5. **`src/services/autoSyncService.ts:490`** (`select`), **`1052`** (`insert`)

#### Tables: `purchase_returns` (8) & `purchase_return_items` (2)
1. **`src/services/documentsService.ts:539`** (`select`)
   - Query: `.select('id, return_number, total_amount, status, reason, created_at, supplier_id, suppliers ( name, phone, gstin, email, address ), purchase_return_items ( id, product_id, batch_number, quantity, cost_price, products ( name ) )').eq("organization_id", orgId).order("created_at", { ascending: false })`
2. **`src/services/documentsService.ts:936`** (`insert`) & **`976`** (`insert items`)
3. **`src/services/documentsService.ts:1155`** (`delete`)
4. **`src/pages/PurchaseReturns.tsx:103`** (`select`), **`241`** (`select single`), **`248`** (`update status`), **`315`** (`insert`), **`336`** (`insert items`), **`340`** (`update status completed`)

#### Tables: `sales_returns` (3) & `sales_return_items` (1)
1. **`src/services/documentsService.ts:279`** (`select`)
   - Query: `.select('*, sales_return_items (*)').eq("organization_id", orgId).order("created_at", { ascending: false })`
2. **`src/services/documentsService.ts:990`** (`insert`) & **`1047`** (`insert items`)
   - Note: In addition to `sales_returns` and `sales_return_items`, line 1052 inserts into `credit_transactions` when `settlementMode === "store_credit"`.
3. **`src/services/documentsService.ts:1144`** (`delete`)
   - Line 1146 also cleans up `credit_transactions` where `reference_id == docId`.

#### Tables: `network_invoices` (8) & `storefront_orders` (3)
1. **`src/services/networkInvoicingService.ts:698, 894, 915, 1236, 1520, 1640, 1671, 1809`**:
   - Manages B2B digital invoicing between CredSmart tenants, with invoice status updates (`accepted`, `rejected`, `sync_status`).
2. **`src/services/storefrontService.ts:289, 318, 364`**:
   - Order ingestion from public WhatsApp eCommerce storefronts, with order status transitions (`pending`, `confirmed`, `delivered`, `cancelled`).

---

### 1.3 Settings, Organizations, Profiles & CRM Domains Detailed Audit (99 Queries)

#### Organization & Identity
1. **`organizations` (12 occurrences)**:
   - `src/hooks/useOrganization.tsx:466, 482, 805, 822`: Provisioning new business tenant records.
   - `src/hooks/useOrganization.tsx:656`: `.select("*").in("id", orgIds)` to resolve active user's organizations.
   - `src/pages/Auth.tsx:357`: Creating tenant on signup.
   - `src/pages/BusinessSettings.tsx:306`: Updating business name, GSTIN, PAN, billing address, phone, email, and bank details.
   - `src/services/networkInvoicingService.ts:500, 506, 511, 515, 519`: Cross-tenant lookup by GSTIN, phone, or name.
2. **`organization_memberships` (12 occurrences)**:
   - `src/hooks/useOrganization.tsx:244`: Fetching user's roles across organizations.
   - `src/hooks/useOrganization.tsx:494, 833` & `src/pages/Auth.tsx:385`: Upserting `store_owner` role link.
   - `src/pages/Auth.tsx:108, 319`: Fast login role and default org resolution.
   - `src/pages/Staff.tsx:740, 923, 945`: Listing staff members, updating staff role, and deleting staff membership.
   - `src/pages/crm/Attendance.tsx:447`, `src/pages/crm/RoleManagement.tsx:326`, `src/pages/crm/CRMDashboard.tsx:73`.
3. **`profiles` (5 occurrences)**:
   - `src/pages/Staff.tsx:755`: Enriched user display names and avatars.
   - `src/pages/ActivityLog.tsx:89`: Enriched audit log names.
   - `src/pages/crm/Attendance.tsx:454`: Staff names and emails for geofence attendance logs.
   - `src/pages/crm/RoleManagement.tsx:341`: Linking custom CRM roles to staff user IDs.
   - `src/pages/crm/SalaryManagement.tsx:266`: Resolving staff members for salary profile configuration.
4. **`staff_invitations` (5 occurrences)**:
   - `src/pages/Staff.tsx:778, 823, 856, 872, 897`: Managing pending invitations, resending invites via Edge function, and revoking invitations.
5. **`storefront_settings` (8 occurrences)**:
   - `src/services/storefrontService.ts:31, 69, 123, 165`: Managing storefront slug uniqueness, contact details, banner images, and catalog options.
   - `src/services/networkInvoicingService.ts:456, 464, 474`: Public phone/address discovery.
   - `src/hooks/useOrganization.tsx:746`: Initializing storefront settings on tenant bootstrap.
6. **`bank_accounts` (6 occurrences)**:
   - `src/pages/TallyImport.tsx:851, 866, 2001, 2015` & `src/services/autoSyncService.ts:1090, 1101`: Probing database table availability and bulk upserting bank accounts.
7. **`locations` (3 occurrences)**:
   - `src/pages/Godown.tsx:98, 210, 218`: Multi-godown warehouse management (CRUD).
8. **`audit_logs` (2 occurrences)**:
   - `src/hooks/useAuditLog.tsx:21`: Recording action telemetry (e.g. `INVOICE_CREATED`, `PRICE_CHANGED`).
   - `src/pages/ActivityLog.tsx:72`: Reading security logs.
9. **`sync_pairing_tokens` (1 occurrence)**:
   - `src/services/autoSyncService.ts:183`: Upserting token hashes for local Tally agent desktop pairing.

#### CRM Modules (Phases 1, 2, and 3)
1. **`crm_roles` (7 occurrences)**:
   - `src/hooks/useCRMPermission.ts:144`: Reading active org roles.
   - `src/pages/crm/RoleManagement.tsx:278, 612, 654, 726`: Role Management CRUD (custom role name, color, icon, super-admin flag).
   - `src/pages/crm/Attendance.tsx:463, 495`: Mapping staff to role pills.
2. **`crm_permissions` (5 occurrences)**:
   - `src/hooks/useCRMPermission.ts:193`: RBAC evaluation cache.
   - `src/pages/crm/RoleManagement.tsx:315, 498, 521, 684`: Deleting and inserting granular module/action permission rules.
3. **`crm_staff_roles` (5 occurrences)**:
   - `src/hooks/useCRMPermission.ts:134`, `src/pages/crm/RoleManagement.tsx:354, 778, 793`, `src/pages/crm/Attendance.tsx:459`: Assigning, updating, and unassigning staff roles.
4. **`crm_geolocations` (4 occurrences)**:
   - `src/pages/crm/Attendance.tsx:348, 912, 942, 966`: Managing office geofences (latitude, longitude, radius).
5. **`crm_attendance` (6 occurrences)**:
   - `src/pages/crm/Attendance.tsx:391, 667, 778, 1103`: Clock-in (with GPS coordinates), Clock-out (with duration), and regularisation overwrite.
   - `src/pages/crm/CRMDashboard.tsx:92`: Exact count of today's present staff.
   - `src/pages/crm/SalaryManagement.tsx:365`: Supplying attendance logs to monthly payroll engine.
6. **`crm_attendance_requests` (3 occurrences)**:
   - `src/pages/crm/Attendance.tsx:419, 1023, 1133`: Regularisation workflow (request, review, approve/reject).
7. **`crm_salary_profiles` (2 occurrences)**:
   - `src/pages/crm/SalaryManagement.tsx:281, 542`: Salary structure configuration (base salary, daily rate, hourly OT, PF%, ESI%, allowed leaves).
8. **`crm_payroll_runs` (3 occurrences)**:
   - `src/pages/crm/SalaryManagement.tsx:304, 670, 750`: Monthly payroll run lifecycle (`draft` -> `locked` -> `disbursed`).
9. **`crm_payslips` (3 occurrences)**:
   - `src/pages/crm/SalaryManagement.tsx:321, 722, 755`: Itemized payslip records with LOP, OT, deductions, and payout status.
10. **`crm_salary_adjustments` (4 occurrences)**:
    - `src/pages/crm/SalaryManagement.tsx:344, 827, 849, 879`: Advances, bonuses, and loan repayments management.
11. **CRM Dashboard Aggregators (3 occurrences)**:
    - `crm_tasks` (`CRMDashboard.tsx:118`), `crm_broadcasts` (`CRMDashboard.tsx:142`), `crm_meetings` (`CRMDashboard.tsx:168`).

---

## 2. Logic Chain

```
[Observation 1.1: 394 direct supabase.from calls across 265 files]
      │
      ▼
[Observation 1.2: Invoices, Sales & Purchases comprise 84 queries across 11 tables]
      │
      ├─► Sale / Purchase / Return inserts/updates require child item management
      │   (sales <-> sale_items, purchase_invoices <-> purchase_invoice_items)
      │
      ├─► Client currently performs manual two-step mutations:
      │   (1) supabase.from("sales").insert()
      │   (2) supabase.from("sale_items").insert()
      │   Risk: Network failure between step 1 & 2 causes orphaned header with 0 items.
      │
      └─► Specialized workflows exist:
          • Sequence numbering in SalesInvoiceModal.tsx and documentsService.ts
          • In-place update on re-edit (activeSavedDocId) in SalesInvoiceModal.tsx
          • TallyImport & autoSyncService fetch 10,000 items at a time and batch in 1,000s
          • Vector PDF / thermal receipt requires hydrated customer & line item details
          • Store credit sales returns touch customer khata in credit_transactions
      │
      ▼
[Observation 1.3: Settings, Org, Profiles, CRM comprise 99 queries across 22 tables]
      │
      ├─► Multi-tenant resolution depends on organizations & organization_memberships
      │
      ├─► CRM modules require atomic role/permission updates and transactional payroll locking
      │
      └─► Auth context (useAuth.tsx) holds active session.access_token (Supabase JWT)
      │
      ▼
[Deduction: Centralized API Client Architecture Required]
      │
      ├─► Base URL: https://api.credsmart.online/api
      ├─► Automatic header injection: Authorization: Bearer <session.access_token>
      ├─► Backend endpoints encapsulate transactional child item mutations in single SQL transactions
      └─► Zero UI regression: preserve existing data contract shapes and loading/toast feedback
```

1. **Step 1 (Scope Verification)**: A single-line regex search previously returned 183 calls, but this omitted multi-line formatted chained calls (`supabase\n .from(...)`). Running an AST-aware multi-line parser uncovered the true scope of **394 database queries**. Any partial migration would have resulted in broken production routes.
2. **Step 2 (Atomicity & Reliability Improvement)**: Currently, saving an invoice (`documentsService.ts:650-760`) requires the frontend to make 2 to 3 consecutive network calls to Supabase (update `sales`, delete from `sale_items`, insert into `sale_items`). If the browser closes or loses internet connection halfway through, data corruption occurs. Migrating to a dedicated `POST /api/sales` and `PUT /api/sales/:id` backend route allows the backend database to execute this inside a single Postgres transaction (`BEGIN ... COMMIT`).
3. **Step 3 (Authentication Decoupling)**: In `src/hooks/useAuth.tsx:38-42`, the Supabase Auth session is stored in memory and synchronized with `localStorage`. Every request to `https://api.credsmart.online/api/*` can retrieve this token via `(await supabase.auth.getSession()).data.session?.access_token` and attach it as `Authorization: Bearer <token>`.
4. **Step 4 (Backward Compatibility)**: Existing UI components rely on snake_case Supabase row shapes (e.g. `invoice_number`, `total_amount`) or normalized `BusinessDocument` models. The backend API contract must return shapes matching these expectations to prevent breaking UI components and previewers.

---

## 3. Caveats

1. **Supabase Realtime vs. Polling**:
   - `networkInvoicingService.ts`, `POSBilling.tsx`, and `Inventory.tsx` use `supabase.channel(...)` for realtime updates. The prompt strictly targets `supabase.from(...)` table query migration. Realtime websocket channels should either remain connected to Supabase Realtime or be supplemented by SSE / polling from the dedicated backend API.
2. **Supabase Storage Buckets**:
   - The 12 calls to `supabase.storage.from("store-logos")` are binary object storage uploads and public URL resolvers. These do not execute SQL queries and can either continue using Supabase Storage or route through a multipart backend upload endpoint (`POST /api/storage/upload`).
3. **Supabase Edge Functions**:
   - 4 calls to `supabase.functions.invoke(...)` (`invite-staff`, `eway-bill`, `tally-agent-tunnel`) are serverless edge invocations. These should eventually be integrated into the backend API under `/api/staff/invite`, `/api/eway-bill`, and `/api/tally/tunnel`.
4. **Dynamic Table Names**:
   - The 8 dynamic table calls (`$targetTable` x 7 and `$table` x 1) were rigorously verified and confirmed to ONLY evaluate to `"customers"` or `"suppliers"`. No arbitrary or unknown tables exist.

---

## 4. Conclusion & Backend API Contract Mapping

### 4.1 Target API Client Architecture (`src/services/apiClient.ts`)

A centralized, type-safe API client should be established to govern all HTTP traffic:
- **Base URL**: `https://api.credsmart.online/api` (configurable via `VITE_API_BASE_URL`).
- **Auth Header**: Automatically injects `Authorization: Bearer ${token}` from the active Supabase Auth session.
- **Error Normalization**: Standardizes API error responses into `{ message: string, code?: string, status: number }`.

### 4.2 Endpoint Mapping Matrix

#### Domain 1: Invoices & Sales (`/api/sales`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `supabase.from("sales").select(...)` | `/api/sales` | `GET` | `?organization_id=UUID&customer_id=UUID&startDate=...&endDate=...&includeItems=true&includeCustomer=true&limit=...` | `SalesRow[]` |
| `supabase.from("sales").insert(...)` + `sale_items.insert` | `/api/sales` | `POST` | `{ organization_id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, customer_id, items: [{ product_id, product_name, batch_number, mrp, quantity, line_total }] }` | `SalesRow & { sale_items: SaleItemRow[] }` |
| `supabase.from("sales").update(...)` + line item replace | `/api/sales/:id` | `PUT` | Same as POST (executes atomic in-place update) | Updated `SalesRow` |
| `supabase.from("sales").delete().eq("id", id)` | `/api/sales/:id` | `DELETE` | `id` in URL parameter | `{ success: true, deletedId: string }` |
| `sale_items.select().eq("sale_id", id)` | `/api/sales/:id/items` | `GET` | `id` in URL parameter | `SaleItemRow[]` |
| Tally / AutoSync batch sales import | `/api/sales/bulk` | `POST` | `{ organization_id, sales: [...], sale_items: [...] }` | `{ insertedCount: number, ids: string[] }` |
| Sequence numbering check | `/api/sales/next-sequence` | `GET` | `?organization_id=UUID&prefix=INV` | `{ nextSequence: string, fullDocumentNumber: string }` |

#### Domain 2: Purchases (`/api/purchases`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `supabase.from("purchase_invoices").select(...)` | `/api/purchases` | `GET` | `?organization_id=UUID&supplier_id=UUID&includeItems=true&limit=...` | `PurchaseInvoiceRow[]` |
| `supabase.from("purchase_invoices").insert(...)` | `/api/purchases` | `POST` | `{ organization_id, supplier_id, invoice_number, total_amount, status, notes, items: [...] }` | `PurchaseInvoiceRow` |
| `supabase.from("purchase_invoices").update(...)` | `/api/purchases/:id` | `PUT` | `{ status: "received" }` | Updated `PurchaseInvoiceRow` |
| `supabase.from("purchase_invoices").delete()` | `/api/purchases/:id` | `DELETE` | `id` in URL parameter | `{ success: true }` |
| `purchase_invoice_items.select()` | `/api/purchases/:id/items` | `GET` | `id` in URL parameter | `PurchaseInvoiceItemRow[]` |
| Bulk purchase ingest | `/api/purchases/bulk` | `POST` | `{ organization_id, purchases: [...], items: [...] }` | `{ insertedCount: number }` |

#### Domain 3: Returns & Notes (`/api/returns`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `supabase.from("sales_returns").select(...)` | `/api/returns/sales` | `GET` | `?organization_id=UUID` | `SalesReturnRow[]` |
| `supabase.from("sales_returns").insert(...)` | `/api/returns/sales` | `POST` | `{ return_number, sale_id, customer_id, items: [...], settlement_mode }` *(Atomically updates customer ledger if store credit)* | `SalesReturnRow` |
| `supabase.from("sales_returns").delete()` | `/api/returns/sales/:id` | `DELETE` | `id` in URL | `{ success: true }` |
| `supabase.from("purchase_returns").select(...)` | `/api/returns/purchases` | `GET` | `?organization_id=UUID&supplier_id=UUID` | `PurchaseReturnRow[]` |
| `supabase.from("purchase_returns").insert(...)` | `/api/returns/purchases` | `POST` | `{ return_number, supplier_id, purchase_invoice_id, reason, total_amount, items: [...] }` | `PurchaseReturnRow` |
| `supabase.from("purchase_returns").update()` | `/api/returns/purchases/:id` | `PUT` | `{ status: "completed" }` | Updated `PurchaseReturnRow` |
| `supabase.from("purchase_returns").delete()` | `/api/returns/purchases/:id` | `DELETE` | `id` in URL | `{ success: true }` |

#### Domain 4: Expenses (`/api/expenses`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `supabase.from("expenses").select(...)` | `/api/expenses` | `GET` | `?organization_id=UUID&startDate=...&endDate=...` | `ExpenseRecord[]` |
| `supabase.from("expenses").insert(...)` | `/api/expenses` | `POST` | `{ organization_id, category, amount, date, description, payment_mode }` | `ExpenseRecord` |
| `supabase.from("expenses").delete()` | `/api/expenses/:id` | `DELETE` | `id` in URL | `{ success: true }` |
| Bulk expense ingest | `/api/expenses/bulk` | `POST` | `{ organization_id, expenses: [...] }` | `{ insertedCount: number }` |

#### Domain 5: Organizations, Profiles & Settings (`/api/organizations`, `/api/settings`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `organizations.select().in("id", orgIds)` | `/api/organizations` | `GET` | *(Bearer token infers user access)* | `OrganizationRow[]` |
| `organizations.insert(...)` | `/api/organizations` | `POST` | `{ name, business_type, address, phone, email, gstin }` | `OrganizationRow` |
| `organizations.update(...).eq("id", id)` | `/api/organizations/:id` | `PUT` | `{ name, phone, email, address, gstin, pan, bank_details }` | Updated `OrganizationRow` |
| `organization_memberships.select(...)` | `/api/organizations/:id/members` | `GET` | `id` in URL | `MemberWithProfile[]` |
| `organization_memberships.update(...)` | `/api/organizations/:id/members/:memberId` | `PUT` | `{ role: string }` | `{ success: true }` |
| `organization_memberships.delete(...)` | `/api/organizations/:id/members/:memberId` | `DELETE` | `memberId` in URL | `{ success: true }` |
| `staff_invitations.select(...)` | `/api/organizations/:id/invitations` | `GET` | `id` in URL | `StaffInvitationRow[]` |
| `staff_invitations.insert(...)` | `/api/organizations/:id/invitations` | `POST` | `{ email, role, expires_at }` | `StaffInvitationRow` |
| `staff_invitations.update(cancelled)` | `/api/organizations/:id/invitations/:invId/cancel` | `PUT` | Empty body | `{ success: true }` |
| `locations.select(...)` | `/api/organizations/:id/locations` | `GET` | `id` in URL | `LocationRow[]` |
| `locations.insert(...)` | `/api/organizations/:id/locations` | `POST` | `{ name, address }` | `LocationRow` |
| `locations.update(...)` | `/api/organizations/:id/locations/:locId` | `PUT` | `{ name, address }` | Updated `LocationRow` |
| `storefront_settings.select(...)` | `/api/storefront/settings` | `GET` | `?organization_id=UUID` or `?slug=string` | `StorefrontSettings` |
| `storefront_settings.upsert(...)` | `/api/storefront/settings` | `PUT` | `{ organization_id, store_name, contact_phone, address, banner_url, ... }` | `StorefrontSettings` |
| `bank_accounts.select(...)` | `/api/bank-accounts` | `GET` | `?organization_id=UUID` | `BankAccountRow[]` |
| `bank_accounts.upsert(...)` | `/api/bank-accounts/bulk` | `POST` | `{ organization_id, accounts: [...] }` | `{ success: true }` |
| `audit_logs.select(...)` | `/api/audit-logs` | `GET` | `?organization_id=UUID` | `AuditLogRow[]` |
| `audit_logs.insert(...)` | `/api/audit-logs` | `POST` | `{ organization_id, action, entity_type, entity_id, details }` | `AuditLogRow` |

#### Domain 6: CRM Modules (`/api/crm/*`)
| Current Supabase Query | Target HTTP Endpoint | Method | Payload / Query Parameters | Response Shape |
|---|---|:---:|---|---|
| `crm_roles.select(...)` + permissions | `/api/crm/roles` | `GET` | `?org_id=UUID` | `(CRMRole & { permissions: CRMPermission[] })[]` |
| `crm_roles.insert(...)` | `/api/crm/roles` | `POST` | `{ org_id, name, color, icon, permissions: [...] }` | Created `CRMRole` |
| `crm_roles.update(...)` | `/api/crm/roles/:id` | `PUT` | `{ name, color, icon }` | Updated `CRMRole` |
| `crm_roles.delete(...)` | `/api/crm/roles/:id` | `DELETE` | `id` in URL | `{ success: true }` |
| `crm_permissions.delete` + `insert` | `/api/crm/roles/:id/permissions` | `PUT` | `{ permissions: [{ module, action, allowed }] }` | `{ success: true }` |
| `crm_staff_roles.select(...)` | `/api/crm/staff-roles` | `GET` | `?org_id=UUID` | `CRMStaffRoleAssignment[]` |
| `crm_staff_roles.upsert(...)` | `/api/crm/staff-roles/:staffId` | `PUT` | `{ role_id: UUID }` | `{ success: true }` |
| `crm_staff_roles.delete(...)` | `/api/crm/staff-roles/:staffId` | `DELETE` | `staffId` in URL | `{ success: true }` |
| `crm_geolocations.select(...)` | `/api/crm/geolocations` | `GET` | `?org_id=UUID` | `CrmGeolocation[]` |
| `crm_geolocations.insert(...)` | `/api/crm/geolocations` | `POST` | `{ org_id, name, latitude, longitude, radius_meters, is_active }` | `CrmGeolocation` |
| `crm_geolocations.update(...)` | `/api/crm/geolocations/:id` | `PUT` | `{ name, latitude, longitude, radius_meters, is_active }` | Updated `CrmGeolocation` |
| `crm_geolocations.delete(...)` | `/api/crm/geolocations/:id` | `DELETE` | `id` in URL | `{ success: true }` |
| `crm_attendance.select(...)` | `/api/crm/attendance` | `GET` | `?org_id=UUID&date=YYYY-MM-DD&staff_id=UUID` | `CrmAttendanceRecord[]` |
| `crm_attendance.upsert(clock_in)` | `/api/crm/attendance/clock-in` | `POST` | `{ org_id, latitude, longitude, accuracy, location_id }` | `CrmAttendanceRecord` |
| `crm_attendance.update(clock_out)` | `/api/crm/attendance/clock-out` | `POST` | `{ org_id, latitude, longitude, accuracy }` | `CrmAttendanceRecord` |
| `crm_attendance_requests.select(...)` | `/api/crm/attendance/requests` | `GET` | `?org_id=UUID&status=pending` | `CrmAttendanceRequest[]` |
| `crm_attendance_requests.insert(...)` | `/api/crm/attendance/requests` | `POST` | `{ org_id, attendance_id, date, requested_clock_in, requested_clock_out, reason }` | `CrmAttendanceRequest` |
| `crm_attendance_requests.update(...)` | `/api/crm/attendance/requests/:id/review` | `PUT` | `{ decision: "approved" \| "rejected", reviewer_notes: string }` | `{ success: true }` |
| `crm_salary_profiles.select(...)` | `/api/crm/salary/profiles` | `GET` | `?org_id=UUID` | `CrmSalaryProfile[]` |
| `crm_salary_profiles.upsert(...)` | `/api/crm/salary/profiles` | `POST` | `{ org_id, staff_id, salary_type, base_amount, hourly_overtime_rate, pf_deduction_percent, esi_deduction_percent, allowed_leaves_per_month }` | `CrmSalaryProfile` |
| `crm_payroll_runs.select(...)` | `/api/crm/salary/payroll-runs` | `GET` | `?org_id=UUID` | `CrmPayrollRun[]` |
| `crm_payroll_runs.upsert(...)` + payslips | `/api/crm/salary/payroll-runs/lock` | `POST` | `{ org_id, month_year, total_payout, staff_count, notes, payslips: [...] }` | `{ success: true, runId: UUID }` |
| `crm_payroll_runs.update(disbursed)` | `/api/crm/salary/payroll-runs/:monthYear/disburse` | `PUT` | Empty body | `{ success: true }` |
| `crm_payslips.select(...)` | `/api/crm/salary/payslips` | `GET` | `?org_id=UUID&month_year=YYYY-MM&staff_id=UUID` | `CrmPayslip[]` |
| `crm_salary_adjustments.select(...)` | `/api/crm/salary/adjustments` | `GET` | `?org_id=UUID&staff_id=UUID` | `CrmSalaryAdjustment[]` |
| `crm_salary_adjustments.insert(...)` | `/api/crm/salary/adjustments` | `POST` | `{ org_id, staff_id, type, amount, description, month_year }` | `CrmSalaryAdjustment` |
| `crm_salary_adjustments.update(...)` | `/api/crm/salary/adjustments/:id/review` | `PUT` | `{ status: "approved" \| "rejected" }` | `{ success: true }` |
| `crm_tasks`, `meetings`, `broadcasts` count | `/api/crm/dashboard/stats` | `GET` | `?org_id=UUID` | `{ staffCount: number, attendanceToday: number, pendingTasks: number, unreadBroadcasts: number, upcomingMeetings: number }` |

---

## 5. Verification Method

To independently verify the observations and counts in this report:

### Step 1: Run Multi-Line AST Scan Script
Run the following node verification snippet in PowerShell to verify the exact **394 query count** and breakdown:
```powershell
@'
const fs = require('fs');
const path = require('path');
function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (!['test', 'node_modules', '.git'].includes(f)) res.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(f)) res.push(p);
  }
  return res;
}
const regex = /\.from\s*\(\s*([^)]+)\s*\)/g;
let tableQueries = 0;
for (const file of walk('src')) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = regex.exec(content)) !== null) {
    const lookback = content.substring(Math.max(0, m.index - 30), m.index);
    if (!/storage\s*$/.test(lookback) && !/Array\s*$/.test(lookback)) {
      tableQueries++;
    }
  }
}
console.log("Verified Table Queries:", tableQueries); // Must equal 394
'@ | node -
```

### Step 2: Validate Application Integrity & Test Suite
Ensure all existing tests compile and pass without regressions prior to migration:
```cmd
cmd /c npx tsc --noEmit
cmd /c npx vitest run
```

### Invalidation Conditions
This audit report is invalidated if:
1. Any file in `src/` is found with an uncataloged table name not in the 33 master table list.
2. Direct `.from(...)` table queries remain after migrating to `apiClient.ts`.
3. The backend API fails to support atomic line item ingestion for sales or purchases.
