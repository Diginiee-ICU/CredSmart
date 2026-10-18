# Original User Request

## Initial Request — 2026-09-25T21:42:28Z

Fix and expand CredSmart's Tally Live Sync and File Import pipelines to synchronize and import all financial entities—including Invoices & Vouchers (Sales, Purchases, Receipts, Payments, Expenses, Notes) with item line details, Bank Accounts, and Cash in Hand—beyond just Items and Parties.

Working directory: c:/Users/Rudra/Desktop/Git/CredSmart
Integrity mode: development

## Requirements

### R1. Comprehensive Tally Entity Synchronization & Ingestion
The system must parse, ingest, and persist all primary accounting entities from Tally Prime / ERP 9 exports and live sync streams:
- **Products & Inventory**: Stock items, standard rates, opening stock, units of measurement, GST rates, HSN codes, and batch allocations in `products` and `product_batches`.
- **Parties & Khata Balances**: Sundry Debtors as `customers`, Sundry Creditors as `suppliers`, with contact details, GSTIN, and opening balances correctly recorded in `credit_transactions`.
- **Bank & Cash Accounts**: Bank accounts and Cash-in-Hand ledger balances stored in `bank_accounts` (and localStorage fallbacks) and kept in sync with the Cash & Bank views.
- **Invoices & Vouchers**: Full transactional records:
  - Sales invoices persisted to `sales` with line items in `sale_items`.
  - Purchase invoices persisted to `purchase_invoices` with line items in `purchase_invoice_items`.
  - Customer receipts and vendor payments recorded as payment transactions in `credit_transactions`.
  - Operating expenses recorded in `expenses`.

### R2. Query Protocols & Historical Date-Range Support
Day Book XML queries to Tally must provide configurable date boundaries (`SVFROMDATE` and `SVTODATE`) to ensure historical transaction records are returned rather than only the current active day.

### R3. User Interface Controls & Full Entity Visibility
The Auto-Sync dashboard and File Import modals must expose explicit controls and status indicators for all entity types (Items, Parties, Balances, Invoices/Vouchers, and Bank/Cash), with safe defaults enabling full synchronization.

## Verification Resources

- Existing test suite in `src/test/tallyImport.test.ts` and `src/test/tallyBridge.test.ts`.
- Database schema definitions in `src/integrations/supabase/types.ts`.
- Cash and bank storage keys defined in `src/pages/CashAndBank.tsx`.

## Acceptance Criteria

### Master Data Integrity
- [ ] Stock items are parsed and upserted into `products` and `product_batches` with valid SKUs, prices, GST, and units.
- [ ] Customers and suppliers are parsed and upserted into `customers` and `suppliers`.
- [ ] Party opening balances are inserted into `credit_transactions` matching the database schema (`party_id`, `party_type`, `amount`, `type: "opening_balance"`, `description`, `reference_id`, `organization_id`, `created_by`).

### Bank & Cash Account Ingestion
- [ ] Bank accounts from Tally are stored in `bank_accounts` (or localStorage key `credsmart_bank_accounts_{orgId}`).
- [ ] Cash-in-hand ledger balance is stored in `credsmart_cash_in_hand_{orgId}`.
- [ ] Bank accounts are imported when using both Live Sync and `<TallyImportModal>`.

### Vouchers & Transaction Ingestion
- [ ] Sales vouchers create entries in `sales` and corresponding item entries in `sale_items`.
- [ ] Purchase vouchers create entries in `purchase_invoices` and corresponding item entries in `purchase_invoice_items`.
- [ ] Customer receipts and supplier payments create corresponding `payment` records in `credit_transactions`.
- [ ] Indirect/Direct expenses create entries in `expenses`.

### Live Sync & UI Verification
- [ ] `TALLY_EXPORT_DAYBOOK_XML` includes `<SVFROMDATE>` and `<SVTODATE>` parameters.
- [ ] Auto-sync UI renders checkboxes for all entity types (Items, Parties, Balances, Vouchers, and Banks), and sync stats accurately display records ingested for each.
- [ ] Vitest test suite passes with zero regressions.


## 2026-10-13T20:00:31Z

Redesign the master GST invoice layout in CredSmart to match the new enterprise visual specification in `Correction/New folder/New Invoice.jpeg`, replacing the legacy boxed format from `Correction/New folder/Old Invoice.jpeg` across web invoice previews and single-page PDF generation.

Working directory: c:\Users\bishn\Documents\GitHub\CredSmart
Integrity mode: development

Reference Material:
- Target design reference: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg`
- Legacy layout reference: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\Old Invoice.jpeg`

## Requirements

### R1. Enterprise Invoice Visual Redesign
Redesign the master invoice layout to achieve pixel-perfect fidelity with `New Invoice.jpeg`:
1. Clean unboxed header with large bold `TAX INVOICE` on the left and stacked right-aligned metadata (`Invoice No.`, `Invoice Date`, `Due Date`).
2. Full-width cyan/blue horizontal accent divider line beneath header.
3. Dual equal-width side-by-side pods for `FROM` (Seller) and `BILL TO` (Buyer) with light-blue header ribbons and complete address/tax details.
4. Uppercase `ITEM DETAILS` section heading above the table.
5. Solid dark navy table header (`bg-[#0c324e]`) with white typography (`S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`).
6. Right-aligned financial summary breakdown with taxable value, GST (5%), soft blue rounded total highlight pill, and received/balance amount.
7. Clean unboxed `Amount in words` line.
8. Dual side-by-side bordered cards for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY` with light-blue header ribbons.
9. Minimalist footer note: `Thank you for your business.`

### R2. PDF Export & Print Engine Parity
Ensure the off-screen capture and PDF download pipeline in `downloadExactInvoice.ts` renders the redesigned invoice template with 100% fidelity, maintaining exact single-page A4 aspect ratio and sharp vector typography without clipping or distortion.

### R3. Full System Compatibility & Zero Regressions
Preserve complete backward compatibility for all document types (`sales_invoice`, `pos_invoice`, `purchase_invoice`, `quotation`, `proforma_invoice`, `credit_note`, `debit_note`), multi-unit calculations, and custom company settings without introducing regressions.

## Acceptance Criteria

### Visual & Structural Fidelity
- [ ] Header renders large bold TAX INVOICE title with cleanly stacked metadata on the right and cyan accent line.
- [ ] Dual FROM and BILL TO pods render side-by-side with light-blue ribbon headers and full contact/tax info.
- [ ] Items table features ITEM DETAILS title and solid dark navy header row with white text.
- [ ] Totals section displays right-aligned breakdown with soft blue rounded total pill and received amount.
- [ ] Amount in words renders clearly below summary totals.
- [ ] Bank Account Details and Authorised Signatory render as two side-by-side bordered cards with light-blue header ribbons.
- [ ] Footer renders "Thank you for your business."

### PDF & Print Rendering
- [ ] Downloaded PDF from `downloadExactInvoicePdf` fits exactly onto a single A4 page with clean margins and zero visual clipping.

### Code Quality & Production Standards
- [ ] Zero TypeScript compiler errors across all modified components (`tsc --noEmit`).
- [ ] Existing invoice calculations and test suites pass with 100% success rate.


## 2026-10-13T21:57:56Z

The system underwent a server restart. Please resume execution of the master GST invoice redesign project from your last checkpoint. Check current subagent/orchestrator state, verify Milestone 1 test status, and proceed with Milestone 2 implementation and verification as planned.


## 2026-10-14T06:45:25Z

Add prominent, touch-friendly Edit triggers to the Mobile Invoice Success screen (`MobileInvoiceSuccessView.tsx`) in CredSmart, including a dedicated circular Edit button in the quick action row and a dual-button sticky footer (`Edit Bill` + `Done`), ensuring seamless return to the mobile invoice editor with zero regressions.

Working directory: c:\Users\bishn\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Quick Action Row Edit Button
Add a dedicated circular `Edit` action button to the action row in `MobileInvoiceSuccessView.tsx` alongside `Print`, `Download`, `Share`, and `E-Way Bill`:
- Circular container styled consistently with existing purple/indigo action circles (`w-12 h-12 rounded-full border-2 border-indigo-200 bg-indigo-50/60`).
- Features the `Edit2` pen icon with an "Edit" label below.
- Binds cleanly to the `onEdit` prop.

### R2. Dual-Action Sticky Footer
Refactor the sticky bottom bar in `MobileInvoiceSuccessView.tsx` from a single full-width button to a dual-action flex row:
- **Left button (`Edit Bill`)**: Styled as an outline/soft button (`bg-indigo-50 border border-indigo-200 text-indigo-700`) with an `Edit2` icon, triggering `onEdit`.
- **Right button (`Done`)**: Styled as the primary filled button (`bg-indigo-600 text-white`), triggering `onClose`.
- Full touch targets with safe area inset support (`pb-[max(1rem,env(safe-area-inset-bottom))]`).

### R3. Seamless State Transition & Zero Regressions
Ensure tapping either edit trigger transitions immediately back to `MobileCreateInvoice.tsx` via `setMobileSuccessInvoice(null)` in `SalesInvoiceModal.tsx`, keeping all entered line items, party details, discounts, and totals fully intact for further editing.

## Acceptance Criteria

### UI & Interaction
- [ ] Circular `Edit` action button renders in the Action Buttons row and executes `onEdit` on tap.
- [ ] Sticky footer displays side-by-side `Edit Bill` and `Done` buttons.
- [ ] Clicking `Edit Bill` or the circular `Edit` button transitions back to the mobile invoice editor without dropping entered invoice data.
- [ ] Clicking `Done` closes the invoice modal and returns to the parent sales page.

### Code Quality & Standards
- [ ] Zero TypeScript compiler errors across all modified files (`tsc --noEmit`).
- [ ] All 219+ existing Vitest test suites continue to pass with 100% success rate.
- [ ] Unit tests added for `MobileInvoiceSuccessView` verifying edit trigger callbacks and dual-footer rendering.


## 2026-10-14T09:50:17Z

Complete all remaining lifecycle actions from the mobile billing & success workflow in CredSmart: implement in-place invoice updates when returning via Edit (preventing duplicate invoices), fix mobile `Save & New` sequence reset, implement confirmed invoice deletion from the success screen, and wire the header More menu with WhatsApp direct sharing.

Working directory: c:\Users\bishn\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. In-Place Update Lifecycle on Re-Edit (Prevent Duplicate Invoices)
When a user clicks "Edit" or "Edit Bill" from `MobileInvoiceSuccessView.tsx`:
- `SalesInvoiceModal.tsx` transitions back to `MobileCreateInvoice.tsx`.
- The saved invoice's ID (`saved.id`) must be preserved in active editing state (`activeSavedDocId` or updating `editingDoc`).
- When the user modifies line items, party details, or amounts and taps "Generate Bill" again, `handleSave` must pass the existing document ID so `documentsService.saveDocument` executes an **in-place update** rather than inserting a duplicate record into the database.
- Provide clear visual toast feedback: "Invoice #[number] updated successfully!"

### R2. Mobile "Save & New" Engine & Sequence Reset
Fix the conditional block in `SalesInvoiceModal.tsx:1163`:
- Currently, `if (window.innerWidth < 1024)` forces `setMobileSuccessInvoice(saved)` unconditionally, starving the `else if (saveAndNew)` branch.
- When `saveAndNew` is true on mobile:
  - Persist the saved invoice to the database.
  - Reset form fields: clear party selection, reset line items to a single blank row, reset payment amounts.
  - Automatically bump the invoice sequence number (e.g. `INV-139` → `INV-140`).
  - Display a success toast: "Invoice #[number] created! Ready for next bill."
  - Remain on `MobileCreateInvoice` ready for rapid-fire billing.

### R3. Safe Invoice Deletion with Confirmation
Implement full deletion lifecycle in `MobileInvoiceSuccessView.tsx` and `SalesInvoiceModal.tsx`:
- Clicking the header `Trash2` icon on the success screen opens a sleek mobile confirmation bottom-sheet / alert dialog: "Delete this invoice? This action cannot be undone."
- On confirmation, invoke `documentsService.deleteDocument(invoice.id)`.
- Reset active invoice state (`setMobileSuccessInvoice(null)`), close the modal, and show toast: "Invoice #[number] deleted".

### R4. Header More Menu & Direct WhatsApp Share
- Wire the 3-dots `MoreVertical` button on `MobileInvoiceSuccessView.tsx`:
  - Open a touch-friendly bottom sheet or dropdown menu with options:
    - **Duplicate / Copy Bill**: Loads invoice items into a new bill with next sequence number.
    - **Share via WhatsApp**: Directly opens `https://wa.me/?text=...` with pre-filled invoice summary and link.
    - **Download Thermal Receipt / PDF**: Instant print/download trigger.
    - **Cancel / Void Invoice**: Allows marking invoice status as cancelled.

## Acceptance Criteria

### Lifecycle & State Fidelity
- [ ] Editing an invoice from the success screen and clicking "Generate Bill" updates the existing invoice without creating duplicate records.
- [ ] Tapping "Save & New" on mobile saves the invoice, increments the invoice number, resets form fields, and stays in editor mode.
- [ ] Tapping "Trash" on success screen displays confirmation and deletes the record from database upon confirm.
- [ ] Header 3-dots menu opens mobile action sheet with Duplicate, WhatsApp Share, and Void options.
- [ ] WhatsApp share button triggers WhatsApp URL scheme (`https://wa.me/` or `whatsapp://send`) with formatted text summary.

### Code Quality & Standards
- [ ] Zero TypeScript compiler errors across all modified files (`tsc --noEmit`).
- [ ] 100% test pass rate across `src/test/MobileInvoiceSuccessView*.test.tsx`.
- [ ] Unit tests added for update-on-edit, save-and-new, delete confirmation, and WhatsApp sharing.
- [ ] Zero regressions to desktop invoice modal flows.


## 2026-10-14T12:07:00Z

Server restarted. Please resume execution, complete final verification (tsc --noEmit and test suite validation), and run the Victory Audit to finalize.


## 2026-10-17T00:24:04Z

Build a fully integrated CRM Tab — Phase 1: Foundation, CRM Shell & Custom Role-Based Access — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform. All UI must be polished, production-quality, matching the existing CredSmart mobile + desktop design standards, using a custom CRM design system housed in src/components/crm/. Roles are fully configurable by business owner (not fixed — no hard-coded roles).

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: benchmark (no restrictions — any approach that works)

## Tech Stack Context

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend/DB: Supabase (existing client in src/integrations/supabase/)
- Auth: Supabase Auth (existing useAuth.tsx hook)
- App shell: src/components/AppSidebar.tsx, src/components/AppLayout.tsx
- Routing: React Router in src/App.tsx
- Existing pages: Dashboard, Sales, POS, Inventory, Parties, Reports, CashBank, Staff, Settings
- Existing Staff page: src/pages/Staff.tsx (extend/integrate where relevant, do NOT replace)
- Brand colors: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981
- Custom CRM components go in: src/components/crm/
- CRM pages go in: src/pages/crm/
- Supabase migrations go in: supabase/migrations/

## Requirements

### R1. CRM Tab & Navigation Shell
Add a "CRM" tab to AppSidebar.tsx with sub-navigation for all future CRM features (placeholder nav items for: Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support). The CRM shell must be fully responsive (mobile + desktop). Create src/pages/crm/CRMDashboard.tsx as the CRM landing page with a summary card grid showing: staff count, today's attendance count, pending tasks, unread broadcasts, and upcoming meetings. Each card queries Supabase for live data. Add the CRM route to src/App.tsx and src/components/routes.ts.

### R2. Custom Configurable Role System
Implement a full role management system:
- A Role Management page (src/pages/crm/RoleManagement.tsx) where the super-admin can: create custom roles with a name, color, and icon; define per-role permissions across all CRM modules (attendance view/edit, salary view/edit, tasks view/create/approve, meetings view/create, broadcasts send/view, AI assistant access, support tickets view/manage); assign roles to staff members; promote/demote users.
- Supabase tables: crm_roles (id, org_id, name, color, icon, is_super_admin, created_at) and crm_permissions (id, role_id, module, action, allowed). Seed a super_admin role automatically via migration.
- crm_staff_roles table (staff_id, role_id, assigned_by, assigned_at) linking existing auth users to CRM roles.
- Role assignment UI with searchable staff list and role dropdown.
- No hard-coded roles anywhere in the codebase — all roles are user-defined.

### R3. CRM Design System Bootstrap
Create src/components/crm/ with the following reusable, fully documented components (inline JSDoc on every component and prop):
- CRMCard: a styled card wrapper with CredSmart brand tokens
- CRMBadge: a status/label badge with variant support (success, warning, error, info, neutral)
- CRMDataTable: a sortable, filterable, paginated data table with column config prop
- CRMPageHeader: page header with title, subtitle, breadcrumb, and action slot
- CRMStatCard: stat card with icon, value, label, trend indicator (up/down/neutral)
- CRMPermissionGate: a React component that renders children only if the current user has the required permission; if not, renders null and fires a "Not Authorized" toast
- CRMRolePill: a colored pill showing a role name with its configured color
- Export all from src/components/crm/index.ts

### R4. Reusable Skill File
Create .agents/skills/crm-rbac-skill/SKILL.md with YAML frontmatter (name: crm-rbac-skill, description: ...). The SKILL.md must document:
- The Supabase schema for crm_roles, crm_permissions, crm_staff_roles
- How CRMPermissionGate is used in subsequent phases
- The pattern for checking permissions in page components (usePermission hook)
- How to add new CRM modules/permissions as new phases are built
- Migration patterns and naming conventions
- The CredSmart brand color tokens and CRM component usage guide
This skill is for future sub-agents building Phases 2–6.

## Acceptance Criteria

### Navigation & Shell
- [ ] A "CRM" item appears in AppSidebar.tsx on all screen sizes
- [ ] Mobile: CRM tab collapses correctly into the mobile hamburger menu without breaking existing nav
- [ ] CRM sub-navigation renders placeholder links for all 8 future sections
- [ ] Navigating to /crm renders CRMDashboard.tsx with no runtime errors
- [ ] CRM route is guarded: unauthenticated users are redirected to /auth

### Role Management
- [ ] Super-admin can create a new custom role with name, color, icon via the Role Management UI
- [ ] Per-role permissions can be toggled for each module+action and are persisted to Supabase
- [ ] Staff can be searched and assigned a role from the Role Management page
- [ ] CRMPermissionGate correctly blocks rendering for users missing the required permission
- [ ] CRMPermissionGate fires a toast notification when access is denied
- [ ] crm_roles and crm_permissions tables are created via idempotent Supabase migration
- [ ] super_admin role is seeded automatically with all permissions enabled

### Design System
- [ ] All 7 CRM components exist in src/components/crm/ and export from index.ts
- [ ] CRMDataTable renders sortable columns, pagination controls, and a search filter
- [ ] CRMStatCard shows icon, numeric value, label, and a trend arrow (up/down)
- [ ] All components follow CredSmart brand tokens (Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981)
- [ ] Every component has inline JSDoc

### Dashboard
- [ ] CRMDashboard shows 5 stat cards (staff count, today's attendance, pending tasks, unread broadcasts, upcoming meetings) with live Supabase queries
- [ ] Dashboard is responsive at 375px, 768px, and 1280px

### Code Quality
- [ ] Zero TypeScript errors (strict mode, no `any` types in CRM files)
- [ ] Zero ESLint errors in all new/modified files
- [ ] No existing protected routes (/dashboard, /sales, /pos, /purchases, /inventory, /parties, /reports, /cash-bank, /settings) are broken
- [ ] crm-rbac-skill SKILL.md exists at .agents/skills/crm-rbac-skill/SKILL.md with full content
- [ ] usePermission hook is created in src/hooks/useCRMPermission.ts and exported


## 2026-10-17T08:52:11Z

Build a fully integrated CRM Tab — Phase 2: Attendance & Geo Location Attendance — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform. All UI must be polished, production-quality, matching the existing CredSmart mobile + desktop design standards, using the custom CRM design system in src/components/crm/ and RBAC integration from Phase 1.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: benchmark (no restrictions — any approach that works)

## Tech Stack & Phase 1 Foundations
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend/DB: Supabase (client in src/integrations/supabase/)
- Auth: Supabase Auth (existing useAuth.tsx hook)
- App shell: src/components/AppSidebar.tsx, src/components/AppLayout.tsx, src/config/routes.ts
- CRM Design System: src/components/crm/ (CRMCard, CRMBadge, CRMDataTable, CRMPageHeader, CRMStatCard, CRMPermissionGate, CRMRolePill)
- RBAC Hook: src/hooks/useCRMPermission.ts (useCRMPermission, usePermission)
- Reusable Skill Guide: .agents/skills/crm-rbac-skill/SKILL.md (read this before starting)
- Brand colors: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981, Gold #F59E0B

## Requirements

### R1. Database Schema & Idempotent Migration
Create `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` containing:
1. `public.crm_geolocations`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `name TEXT NOT NULL`
   - `latitude DOUBLE PRECISION NOT NULL`
   - `longitude DOUBLE PRECISION NOT NULL`
   - `radius_meters INTEGER NOT NULL DEFAULT 150`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
2. `public.crm_attendance`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `date DATE NOT NULL DEFAULT CURRENT_DATE`
   - `clock_in TIMESTAMPTZ`
   - `clock_out TIMESTAMPTZ`
   - `clock_in_latitude DOUBLE PRECISION`
   - `clock_in_longitude DOUBLE PRECISION`
   - `clock_in_accuracy DOUBLE PRECISION`
   - `clock_out_latitude DOUBLE PRECISION`
   - `clock_out_longitude DOUBLE PRECISION`
   - `clock_out_accuracy DOUBLE PRECISION`
   - `clock_in_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL`
   - `clock_out_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL`
   - `status TEXT NOT NULL DEFAULT 'present'` ('present', 'absent', 'half_day', 'on_leave')
   - `verification_method TEXT NOT NULL DEFAULT 'geo_verified'` ('geo_verified', 'manual', 'regularized')
   - `is_within_geofence BOOLEAN NOT NULL DEFAULT true`
   - `distance_from_office_meters DOUBLE PRECISION`
   - `work_duration_minutes INTEGER DEFAULT 0`
   - `overtime_minutes INTEGER DEFAULT 0`
   - `notes TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)`
3. `public.crm_attendance_requests`:
   - For regularisation / manual correction with status ('pending', 'approved', 'rejected').
4. Enable RLS on all tables with `has_org_access(org_id)` policy.
5. Update `src/integrations/supabase/types.ts` with these new table definitions.

### R2. Geo Location Calculation Engine
Create `src/utils/crmGeoUtils.ts`:
- Haversine distance formula calculating exact distance in meters between `(lat1, lon1)` and `(lat2, lon2)`
- `isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)`
- Geolocation API wrapper with timeout, high accuracy flag, and clean error handling
- Geolocation mock helpers for test suites

### R3. Attendance UI & Clock-In Hub
Create `src/pages/crm/Attendance.tsx`:
- Staff Clock-In / Clock-Out pod:
  - Live digital time display, shift info, and single touch-optimized button (Clock In Emerald `#10B981` / Clock Out Orange `#FF6A00`)
  - Live GPS status indicator ("Acquiring GPS...", "Within Geofence ✓", "Outside Geofence ⚠️")
  - Distance radar / map preview indicator showing office center and user position
  - Work timer showing elapsed time for today's session
- Admin Attendance Oversight:
  - Daily Attendance Table using `CRMDataTable` with date filter, staff search, role filter, status badge
  - Geofence Management Modal: add/edit office locations (name, lat, lon, radius)
  - Regularisation approval drawer/modal
- Gated using `CRMPermissionGate` and `useCRMPermission("attendance", "view")`

### R4. Attendance Reports & PDF Export
- Monthly attendance breakdown: Present days, Absent, Half day, Overtime hours
- Formatted PDF export using `jsPDF` matching CredSmart design tokens
- CSV export for payroll processing

### R5. Wire Routes & Update CRMDashboard
- Wire `ROUTE_PATHS.crmAttendance` in `src/App.tsx` pointing to `Attendance.tsx`
- In `src/pages/crm/CRMDashboard.tsx`, update the Attendance stat card to query `crm_attendance` for today's real attendance count

### R6. Reusable Skill Documentation
Create `.agents/skills/crm-attendance-skill/SKILL.md` documenting:
- Database schema for attendance & geolocations
- Haversine calculation guidelines
- Shift calculation rules (overtime, late arrival, half day)
- Pattern for consuming attendance data in Phase 3 (Salary & Payroll calculation)
- Permissions matrix for attendance module

### Acceptance Criteria
- [ ] Database migration is idempotent with IF NOT EXISTS and RLS
- [ ] TypeScript types updated in `src/integrations/supabase/types.ts`
- [ ] `src/utils/crmGeoUtils.ts` Haversine formula implemented and tested
- [ ] Staff can clock in/out with live elapsed timer
- [ ] GPS coordinates captured on clock in/out
- [ ] Geofence check correctly marks attendance as "Geo-Verified ✓" or "Manual ⚠️"
- [ ] Admin can view logs in `CRMDataTable` and manage geofences
- [ ] Monthly PDF report downloads cleanly
- [ ] Responsive design verified on mobile (375px) and desktop
- [ ] `tsc --noEmit` exits with 0 errors
- [ ] All new tests pass with 0 failures
- [ ] `.agents/skills/crm-attendance-skill/SKILL.md` authored and committed


## 2026-10-18T08:57:37Z

Build a fully integrated CRM Tab — Phase 3: Salary Management & Payroll Engine — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform. All UI must be polished, production-quality, matching the existing CredSmart mobile + desktop design standards, using the custom CRM design system in src/components/crm/ and RBAC integration from Phase 1.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: benchmark (no restrictions — any approach that works)

## CRITICAL: Read These Skill Files First (Before Writing Any Code)

1. Read `.agents/skills/crm-rbac-skill/SKILL.md` — Phase 1 RBAC patterns, useCRMPermission hook, CRMPermissionGate usage
2. Read `.agents/skills/crm-attendance-skill/SKILL.md` — Phase 2 attendance data schema, Haversine engine, shift rules, and the Phase 3 payroll integration contract (LOP formulas, overtime reconciliation)

## Tech Stack & Phase 1+2 Foundations
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend/DB: Supabase (client in src/integrations/supabase/)
- Auth: Supabase Auth (existing useAuth.tsx hook)
- App shell: src/components/AppSidebar.tsx, src/components/AppLayout.tsx, src/config/routes.ts
- CRM Design System: src/components/crm/ (CRMCard, CRMBadge, CRMDataTable, CRMPageHeader, CRMStatCard, CRMPermissionGate, CRMRolePill)
- RBAC Hook: src/hooks/useCRMPermission.ts
- Phase 2 Attendance tables: `crm_attendance`, `crm_geolocations`, `crm_attendance_requests` (already exist in supabase/migrations/20261017010000_...)
- Brand colors: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981, Gold #F59E0B
- Route path `ROUTE_PATHS.crmSalary` is already defined in src/config/routes.ts as '/crm/salary'

## Milestone Structure (7 Milestones)

### M1: Database Schema & Idempotent Migration

Create `supabase/migrations/20261017020000_create_crm_salary_tables.sql`:

1. `public.crm_salary_profiles`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly'))`
   - `base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `currency TEXT NOT NULL DEFAULT 'INR'`
   - `allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2`
   - `hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00`
   - `pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)`

2. `public.crm_payroll_runs`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL` (format: 'YYYY-MM', e.g. '2026-10')
   - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed'))`
   - `total_payout NUMERIC(14,2) DEFAULT 0.00`
   - `staff_count INTEGER DEFAULT 0`
   - `locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `locked_at TIMESTAMPTZ`
   - `notes TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)`

3. `public.crm_payslips`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `payroll_run_id UUID NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL`
   - `salary_profile_snapshot JSONB NOT NULL` (snapshot of crm_salary_profiles at time of payroll)
   - `working_days_in_month INTEGER NOT NULL`
   - `present_days INTEGER NOT NULL DEFAULT 0`
   - `absent_days INTEGER NOT NULL DEFAULT 0`
   - `half_days INTEGER NOT NULL DEFAULT 0`
   - `lop_days NUMERIC(5,2) NOT NULL DEFAULT 0` (loss of pay days = max(0, absent_days - allowed_leaves))
   - `overtime_minutes INTEGER NOT NULL DEFAULT 0`
   - `gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial'))`
   - `paid_at TIMESTAMPTZ`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)`

4. `public.crm_salary_adjustments`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `type TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment'))`
   - `amount NUMERIC(12,2) NOT NULL`
   - `description TEXT`
   - `month_year TEXT` (if null, deducted in the next payroll run)
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected'))`
   - `requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_at TIMESTAMPTZ`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

5. RLS: Enable RLS on all 4 tables. Add policy: `USING (has_org_access(org_id))` for SELECT/INSERT/UPDATE/DELETE.

6. All tables use `CREATE TABLE IF NOT EXISTS`. All indexes use `CREATE INDEX IF NOT EXISTS`.

Also update `src/integrations/supabase/types.ts` with these new table definitions (follow the same pattern used for Phase 2 attendance types).

Write tests:
- `src/test/crmSalaryMigration.test.ts` — 15+ tests verifying migration schema contracts, type validation, constraint logic
- `src/test/crmSalaryTypes.test.ts` — 10+ tests verifying TypeScript type completeness

### M2: Payroll Calculation Engine

Create `src/utils/crmPayrollUtils.ts` with the following exported functions:

```typescript
// Calculate working days in a month (excluding Sundays by default, or custom weekends)
export function getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number

// Compute daily rate from monthly salary
export function getDailyRate(baseSalary: number, workingDays: number): number

// Compute LOP days = max(0, absentDays - allowedLeaves)
export function computeLopDays(absentDays: number, allowedLeaves: number): number

// Compute overtime amount from overtime minutes
export function computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number

// Compute PF deduction
export function computePfDeduction(grossSalary: number, pfPercent: number): number

// Compute ESI deduction
export function computeEsiDeduction(grossSalary: number, esiPercent: number): number

// Main net pay formula:
// net = (baseSalary - lopDeduction) + overtimeAmount + bonusAmount - pfDeduction - esiDeduction - advanceDeduction
// lopDeduction = dailyRate * lopDays
export function computeNetSalary(params: {
  baseSalary: number;
  dailyRate: number;
  lopDays: number;
  overtimeAmount: number;
  bonusAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceDeduction: number;
}): number

// Generate complete payslip data from attendance records and salary profile
export function generatePayslipData(params: {
  staffId: string;
  monthYear: string;
  salaryProfile: CrmSalaryProfile;
  attendanceRecords: CrmAttendanceRecord[];
  adjustments: CrmSalaryAdjustment[];
}): PayslipComputedData
```

All computations must be: pure functions (no side effects), use `Math.round(x * 100) / 100` for 2-decimal precision, handle edge cases (zero salary, zero working days, negative values clamped to 0).

Export TypeScript interfaces:
```typescript
export interface CrmSalaryProfile { /* all fields from crm_salary_profiles */ }
export interface CrmAttendanceRecord { /* subset from crm_attendance used for payroll */ }
export interface CrmSalaryAdjustment { /* all fields from crm_salary_adjustments */ }
export interface PayslipComputedData {
  staffId: string;
  monthYear: string;
  workingDaysInMonth: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lopDays: number;
  overtimeMinutes: number;
  grossSalary: number;
  lopDeduction: number;
  overtimeAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceDeduction: number;
  bonusAmount: number;
  netSalary: number;
}
```

Write tests:
- `src/test/crmPayrollUtils.test.ts` — 25+ tests: edge cases (0 salary, 0 LOP, max overtime, advance > net, half-day logic, PF+ESI stacking, full month absent)
- `src/test/crmPayrollUtils.stress.test.ts` — 15+ mathematical stress tests verifying formula accuracy across different salary types

### M3: Salary Management UI Page

Create `src/pages/crm/SalaryManagement.tsx` (full polished page):

**Tab 1 — Salary Profiles** (default tab):
- Table of all staff with their salary profile (using `CRMDataTable` with search/filter)
- Columns: Staff Name, Role, Salary Type, Base Amount (₹), PF%, ESI%, Allowed Leaves, Status
- "Configure" action per row → opens a slide-over drawer with full edit form
- "Add New Profile" button → opens create form in drawer
- Form fields: Salary Type (monthly/daily/hourly), Base Amount, Currency (INR), Allowed Leaves/Month, Hourly Overtime Rate, PF%, ESI%
- Save persists to `crm_salary_profiles` via Supabase

**Tab 2 — Payroll Run** (admin only, gated with `useCRMPermission('salary', 'approve')`):
- Month picker (default: current month)
- "Generate Payroll" button → calls `generatePayslipData` for each staff member and renders a preview table
- Preview table columns: Staff Name, Present Days, Absent, LOP Days, Gross, Deductions, Net Pay (₹)
- Summary totals bar: Total Staff, Total Payout, Total Deductions
- "Lock Payroll" button (disabled if status='locked') → sets payroll run status='locked', saves all payslips
- "Mark as Disbursed" button (enabled only if locked) → sets status='disbursed'
- Warning toast if any staff has no salary profile configured

**Tab 3 — Advances & Deductions**:
- Table of all `crm_salary_adjustments` with type badge (advance=Gold, bonus=Emerald, deduction=Orange, loan=Blue)
- "Record Advance" button → opens form (staff search, amount, description, month)
- Approve/Reject actions for pending items (gated with `useCRMPermission('salary', 'approve')`)
- Approved advances auto-show in next payroll calculation as `advanceDeduction`

**Tab 4 — My Payslips** (staff self-service, visible to all authenticated CRM users):
- Grid of past payslips for the logged-in staff member
- Each card: Month, Net Pay, Status badge (pending/paid/partial), Download PDF button

**Design requirements**:
- Full mobile responsiveness (375px, 768px, 1280px)
- All CRM brand tokens (Navy `#0F172A`, Orange `#FF6A00`, Blue `#1D4ED8`, Emerald `#10B981`, Gold `#F59E0B`)
- Use `CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPermissionGate`, `CRMStatCard` from `src/components/crm/`
- Gated top-level with `useCRMPermission('salary', 'view')`
- Loading skeletons using shadcn Skeleton component during data fetch
- Error boundary toast on Supabase errors

Write tests:
- `src/test/crmSalaryManagement.test.tsx` — 20+ tests: render, tab switching, form validation, permission gating, loading states
- `src/test/crmSalaryManagementAdmin.test.tsx` — 12+ tests: payroll run generation, lock/disburse flow, advance approval

### M4: Vector Payslip PDF Generator

Create `src/utils/crmPayslipPdf.ts`:

- `generatePayslipPDF(payslip: PayslipComputedData, staffName: string, orgName: string): void`
- Uses `jsPDF` (already in package.json from Phase 2)
- NO autotable plugin — use pure vector jsPDF primitives (rect, line, text)
- Layout:
  - Header: CredSmart logo area (Navy rect), Org Name, "PAYSLIP" title, Month/Year
  - Employee section: Name, Staff ID, Designation, Salary Type
  - Earnings table: Base Salary, Overtime Amount, Bonus (right-aligned ₹)
  - Deductions table: LOP Deduction, PF, ESI, Advance Deduction (right-aligned ₹)
  - Summary box: Gross Earnings, Total Deductions, **Net Payable** (bold, larger font)
  - Footer: Generated on date, "This is a computer-generated payslip. No signature required."
- Color usage: Navy `#0F172A` header, Orange `#FF6A00` section titles, Emerald `#10B981` net pay highlight
- Strict zero `any` types

Write tests:
- `src/test/crmPayslipPdf.test.ts` — 15+ tests: PDF content verification, correct ₹ formatting, zero-deduction payslip, max deduction payslip, edge cases

### M5: Route Wiring & Dashboard Integration

1. In `src/App.tsx`: Wire `/crm/salary` route pointing to `SalaryManagement.tsx` under the ProtectedRoute + AppLayout wrapper. Follow the exact same pattern used for the `/crm/attendance` route that was added in Phase 2.

2. In `src/pages/crm/CRMDashboard.tsx`: Add/update the Salary stat card to show the count of payroll runs this month from `crm_payroll_runs`. If the stat card already exists as a placeholder, update it with a live Supabase query.

Write test:
- `src/test/crmSalaryRouteWiring.test.tsx` — Verify route `/crm/salary` renders SalaryManagement and is protected

### M6: Reusable Skill Documentation

Create `.agents/skills/crm-salary-skill/SKILL.md` with YAML frontmatter. Document:
- Full database schema for all 4 salary tables with column names, types, constraints
- Net pay formula and all computation helper function signatures from `crmPayrollUtils.ts`
- How to consume `crm_payslips` data in Phase 4 (Task Notifications) and Phase 5 (Broadcasting)
- LOP day computation rules: `lopDays = Math.max(0, absentDays - allowedLeaves)`
- Phase 4 integration contract: task_notifications can be triggered on payroll lock events
- Phase 5 integration contract: payroll disbursement can trigger broadcasts to affected staff
- RBAC permissions matrix for salary module (view/edit/approve)
- Working day calculation conventions (Sunday exclusion default)
- jsPDF payslip layout spec for future extensions
- Migration naming convention: next migration should be `20261017030000_create_crm_task_tables.sql`

### M7: Final E2E Hardening

1. Run `cmd /c npx tsc --noEmit` — fix ALL TypeScript errors before reporting done. Zero `any` types allowed in any CRM file.
2. Run `cmd /c npx vitest run src/test/crmSalary* src/test/crmPayroll*` — ALL tests must pass.
3. Run `cmd /c npx vitest run src/test/crm*` — verify no regression in Phase 1 & 2 tests.
4. Verify `SalaryManagement.tsx` renders all 4 tabs without errors.
5. Verify `crmPayrollUtils.ts` handles edge case: staff with 0 working days in month (should produce 0 net salary without division by zero).
6. Verify `generatePayslipPDF` does not throw on empty/zero payslip data.
7. Report final test count: X/Y tests passing.

## Key Constraints
- Zero TypeScript `any` types anywhere in CRM files
- Zero ESLint errors
- All SQL migrations are idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- `cmd /c npx` for all CLI commands (PowerShell execution policy)
- Import from `src/components/crm/` design system — never inline duplicate components
- All monetary amounts formatted as ₹X,XX,XXX.XX (Indian numeral system)
- All Supabase queries must handle loading + error states
- Mobile-first responsive design

## Acceptance Criteria — Phase 3
- [ ] Database migration `20261017020000_create_crm_salary_tables.sql` is idempotent with IF NOT EXISTS and RLS
- [ ] Supabase types updated in `src/integrations/supabase/types.ts`
- [ ] `crmPayrollUtils.ts` accurately computes net pay and LOP based on Phase 2 attendance records
- [ ] Admin can configure salary profiles for staff members
- [ ] Admin can execute monthly payroll run and lock it
- [ ] Staff can view and download their own PDF payslips
- [ ] Advance requests auto-deduct from the next payroll calculation
- [ ] `tsc --noEmit` exits with 0 errors
- [ ] All Phase 3 tests pass
- [ ] No regression in Phase 1 & 2 tests
- [ ] Reusable skill `.agents/skills/crm-salary-skill/SKILL.md` authored and committed


## 2026-10-18T17:29:31Z

Migrate all direct frontend Supabase table queries to standard fetch requests communicating with the dedicated backend API (https://api.credsmart.online/api/*), securing endpoints with active session tokens and preserving complete UI and data contract parity.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Frontend Table Query Migration
Replace all direct client-side Supabase table queries (e.g. `supabase.from(...)`) across all application domains (including products, customers/parties, invoices, settings, and ledgers) with standard `fetch()` requests directed to `https://api.credsmart.online/api/*`.

### R2. Session Authentication & Header Propagation
Ensure every backend API call that requires authentication automatically retrieves the active session token (e.g., Supabase JWT) and forwards it in standard HTTP headers (`Authorization: Bearer <token>`), handling session expiration gracefully.

### R3. Response Contract & State Parity
Preserve all existing data contract shapes, component interfaces, error handling, loading states, and mutation workflows so that end-user features continue functioning seamlessly without UI regressions.

### R4. Centralized API Client Architecture
Provide a clean, maintainable API client layer or utility with base URL configuration (defaulting to `https://api.credsmart.online/api`) that encapsulates request headers, JSON serialization, and error normalization.

## Acceptance Criteria

### Static Verification & Build
- [ ] Automated grep/AST scan confirms zero `supabase.from(...)` table query calls remain in frontend application code for migrated resources.
- [ ] The frontend application builds cleanly via `npm run build` with zero TypeScript or syntax compilation errors.

### Runtime & API Parity
- [ ] Network requests for products, parties, invoices, and other data resources target `https://api.credsmart.online/api/*` via standard HTTP methods (GET, POST, PUT, DELETE).
- [ ] Protected endpoints consistently attach the active session's Bearer token.
- [ ] Response handling correctly parses backend payload structures, preserving loading indicators, toast notifications, and error boundary behaviors.
