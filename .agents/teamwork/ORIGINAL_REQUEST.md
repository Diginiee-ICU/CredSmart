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


## 2026-10-20T10:39:14Z

Resolve critical production issues where:
1. No data is being stored across products, customers/parties, and invoices.
2. Entity creation endpoints fail with 500 errors (e.g. `column "org_id" does not exist`).
3. Existing and newly created items, parties, and customers are not visible in list/table views.
4. Bill generation hangs or takes excessive time (several seconds) due to synchronous PDF rendering, unbatched queries, and blocking network dispatches.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Server target: Ubuntu server (`woodzire@credsmart:~/server`), `postgres-db`, `backend-api` container

## Requirements

### R1. Live Database Schema Alignment & Resilient Migrations
- Provide an automated, idempotent SQL migration script (`fix_db.sql`) that:
  - Ensures every table has both `org_id` AND `organization_id` columns, bidirectionally synchronized.
  - Ensures all missing columns in `customers` and `suppliers` exist (`trade_name`, `shipping_address`, `category`, `credit_period_days`, `custom_fields`).
  - Ensures all indexes exist on tenant IDs and primary query filters (`barcode`, `sku`, `phone`, `sale_date`, `created_at`).
  - Is safe to run repeatedly on PostgreSQL 16 without errors or data loss.

### R2. Backend Route Completion & Full Contract Parity
- In `backend-api/src/routes/invoices.js`:
  - Implement `POST /api/sale-items` (bulk line item insert with batching).
  - Implement `DELETE /api/sale-items` and `DELETE /api/sale-items/sale/:saleId`.
  - Implement `POST /api/sales/bulk` (bulk sales insertion).
  - Normalize field names in `POST /api/sales` so both `total` and `total_amount`, `tax` and `tax_amount` are accepted.
  - Support receiving `items` directly in `POST /api/sales` to insert sale + items in a single atomic SQL transaction.
- In `backend-api/src/routes/settings.js`:
  - Alias `/api/storefront-settings` to `/api/storefront` so frontend calls never 404.
  - Fix membership queries to safely handle cases where either `org_id` or `organization_id` is queried without throwing runtime column errors.
- In `backend-api/src/routes/parties.js`:
  - Ensure `POST /customers` and `POST /suppliers` gracefully sanitize missing fields and return complete 201 records.

### R3. Lightning-Fast Bill Generation (< 500ms)
- In `SalesInvoiceModal.tsx` & `MobileCreateInvoice.tsx`:
  - Decouple heavy `downloadExactInvoicePdf` (`html2canvas`) from the "Generate Bill" click flow on mobile; transition instantly to `MobileInvoiceSuccessView` and allow downloading/printing on demand.
  - Run `networkInvoicingService.sendSalesInvoiceToNetwork` asynchronously as a non-blocking background task (`void sendSalesInvoiceToNetwork(...)`) instead of awaiting it on the main save thread.
  - In `documentsService.saveDocument`, send the sale AND its items together in a single API call when creating or updating, avoiding multiple sequential network round-trips.

### R4. List Visibility & Frontend Cache Hydration
- Ensure `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts`:
  - Fall back to local cached data with a non-blocking toast warning if the cloud API encounters a transient network error, rather than clearing the state to empty arrays.
  - Normalize and display all created items and parties immediately in memory upon successful creation.

### R5. One-Click Automated Server Deployment Script
- Provide a clean deployment script (`deploy-fix.sh`) and instructions that:
  - Copies updated `backend-api` files into `~/server/api/`.
  - Runs `docker exec -i postgres-db psql -U postgres -d app_db < fix_db.sql`.
  - Rebuilds and restarts the `backend-api` container: `docker compose up -d --build api`.
  - Tests health via `curl http://localhost:3000/health`.

## Acceptance Criteria
- [ ] Database migration executes cleanly on the server with 0 errors.
- [ ] `POST /api/customers`, `POST /api/products`, and `POST /api/sales` return HTTP 201 with stored records.
- [ ] `GET /api/products`, `GET /api/customers`, `GET /api/parties`, and `GET /api/sales` return full arrays without 500 errors.
- [ ] Bill generation on mobile transitions to the success screen in under 500ms without freezing the UI.
- [ ] All created items, parties, and customers are immediately visible in their respective list views and persist across page reloads.


## 2026-10-21T00:05:26Z

Complete from-scratch mobile view redesign of CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic. Redesigns the global mobile shell, floating bottom navigation dock, Dashboard, Tally import banner, 2x2 financial ledger cards, quick actions, POS billing touch layout, invoice lists, and inventory cards, strictly preserving 100% desktop invariance.

Working directory: c:/Users/bishn/OneDrive/Documents/GitHub/CredSmart
Integrity mode: development

## Requirements

### R1. Desktop Invariance (Zero Regression)
All desktop views, tables, sidebars, modals, and keyboard shortcuts (`hidden md:flex`, `hidden md:block`, `md:grid`, etc.) must remain 100% untouched and functional. All new mobile design code must be strictly isolated to mobile breakpoints (`block md:hidden` or `isMobile`).

### R2. Clean High-Density Retail Minimal Design System (Stripe / Shopify POS Style)
- **Visual Language**: High-contrast typography, borderless or hairline-bordered clean cards, high information density with zero wasted whitespace, crisp monospaced currency formatting (₹), and refined color accents (emerald for paid, amber for pending, indigo/slate for primary actions).
- **Touch Ergonomics**: All interactive elements must satisfy minimum 44×44px hit targets. Primary actions placed in the bottom thumb zone with haptic feedback styling (`active:scale-[0.98] transition-transform`).
- **Safe Area Inset Handling**: Full support for iOS notch/home indicator and Android navigation bars using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

### R3. Mobile Shell & Floating Bottom Navigation Dock
- **Top Mobile Header**: Compact header featuring store name/switcher, live cloud sync status pill, instant search trigger, notification center bell with unread badge, and profile avatar.
- **Floating Bottom Dock**: 5 native-feeling touch tabs:
  1. `Home` (Dashboard)
  2. `Sales` (Invoices & Receipts)
  3. `POS Billing` (Elevated center pill with prominent icon and subtle shadow)
  4. `Items` (Catalog & Inventory)
  5. `Purchases` (Suppliers & Inward Bills)
- Viewport content container must have bottom padding `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` to prevent content obstruction.

### R4. Dashboard Mobile Experience From Scratch
- **Store Greeting & Status**: Dynamic time-of-day greeting ("Good Morning / Afternoon, [Store Name]") with live sync heartbeat indicator.
- **Tally 1-Click Auto Import Banner**: Minimal, compact banner with emerald accent, clear value statement, and a full-width touch button with search icon.
- **High-Density Financial Ledger Summary Grid**: 2x2 compact card layout replacing oversized cards:
  - `TO COLLECT`: Total receivables ₹ amount, customer count.
  - `TO PAY`: Total payables ₹ amount, supplier count.
  - `CASH & BANK`: Reconciled liquidity across cash and bank accounts.
  - `TODAY'S SALES`: Real-time daily turnover with sales invoice count.
- **Quick Action Strip**: Horizontal swipeable chip row for fast single-tap operations (+ Invoice, + Item, + Customer, 📷 Barcode Scan, 📊 Day Summary).
- **Recent Activity Feed**: Mobile transaction rows with party initials avatar, invoice number, payment status pill, date, and ₹ amount.

### R5. Code Health & Test Suite Integrity
- Clean up any ESLint regex or type warnings in mobile components.
- Zero TypeScript compiler errors (`tsc --noEmit`).
- All 188+ Vitest unit, lifecycle, and adversarial test suites must pass without regression.

## Acceptance Criteria

### Layout & Visual Criteria
- [ ] Viewport `< 768px` renders the new Clean High-Density Retail Minimal mobile interface.
- [ ] Viewport `>= 768px` preserves existing desktop interface with 100% pixel parity.
- [ ] Bottom navigation dock remains fixed and accessible with 5 distinct touch targets.
- [ ] Financial metrics on Dashboard fit comfortably within the top viewport without excessive scrolling.
- [ ] Tally banner is compact, legible, and does not cause horizontal layout overflow.

### Verification & Testing Criteria
- [ ] `node node_modules/typescript/bin/tsc --noEmit` exits with code 0.
- [ ] All Vitest test suites (`src/test/billingLifecycleEngine.test.ts`, `src/test/MobileInvoiceSuccessView.test.tsx`, `src/test/networkInvoicing.test.ts`, etc.) exit with code 0.


## 2026-10-21T07:31:34Z

# Teamwork Project Prompt

This is a single self-contained fix; keep it small and focused.

Production-grade resolution, architectural hardening, and verification of four core invoicing & sync systems in CredSmart: B2B network synchronization, notification de-duplication, default paid invoice status, and mobile invoice success theme rendering.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Default Sales Invoices to 'Paid' Status
New retail sales invoices generated in CredSmart (using Cash, UPI, Card, Net Banking, or Cheque) must default to `status: "paid"`, with `markAsFullyPaid: true`, `paidAmount: grandTotal`, and `balanceDue: 0`. Only invoices created with `paymentMethod === "Credit"` or with explicit partial payments should default to `unpaid` or `partial`. Both live preview calculations and document persistence must reflect this consistently.

### R2. Mobile Invoice Success View Relayout & Real Theme Rendering
The mobile invoice creation success screen (`MobileInvoiceSuccessView`) must place the summary card (Party Name, bold ₹ Total, Paid pill) and the 5 primary action buttons (`Edit`, `Print`, `Download`, `Share WhatsApp`, `E-Way Bill`) directly above the fold without requiring any vertical scrolling. The previous dummy skeleton must be replaced by the authentic `UnifiedInvoiceRenderer` matching the active store settings, brand color palette, and selected invoice theme.

### R3. Streamline & Deduplicate On-Screen Toast Notifications
Creating an invoice must not trigger stacked or simultaneous toast notifications. Mute the redundant secondary network dispatch toast (`⚡ Sales Invoice shared with...`). On mobile viewports, suppress floating foreground save toasts when the full-screen `MobileInvoiceSuccessView` opens. Add a 10-second deduplication cache to realtime incoming invoice and notification alerts in `useNetworkInvoices` across DOM, BroadcastChannel, and Supabase CDC transports. Add `{ silent?: boolean }` to PDF downloads to avoid disruptive intermediate toasts.

### R4. B2B Network Sync Engine Hardening & Organization Discovery
Resolve network invoice delivery failures between independent organizations. In `findConnectedOrganization`, query the public Supabase `organizations` directory by phone, GSTIN, and organization name. Store recipient phone numbers in normalized 10-digit format upon insert. In `getInvoicesForOrg` and `getNotificationsForOrg`, support resilient PostgREST query clauses (both exact and `ilike` pattern matching). Ensure runtime utility `isUuid` is strictly defined and exported to prevent silent database insertion failures.

## Verification Resources
- Automated test suites:
  - `src/test/networkInvoicing.test.ts` (Phone normalization, B2B dispatch, rejection, and auto-purchase creation)
  - `src/test/MobileInvoiceSuccessView.test.tsx` (R1 quick action buttons, R2 dual-action sticky footer, R4 more menu)
  - `src/test/MobileInvoiceSuccessView.challenge.test.tsx` (Zero grand total formatting, document types, high volume line items)
  - `src/test/MobileInvoiceSuccessView.challenger.test.tsx` (Child target event bubbling, viewport constraints)
  - `src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx` (WhatsApp direct share formatting, phone normalization matrix)
  - `src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx` (Safe deletion lifecycle)
  - `src/test/billingLifecycleEngine.test.ts` (Payment calculations, tax calculations, balance due)

## Acceptance Criteria

### Invoicing & Payment
- [ ] Invoices created with Cash/UPI save with `status: "paid"`, `paidAmount: grandTotal`, and `balanceDue: 0` without manual user input.
- [ ] `livePreviewDocument` reflects `status: "paid"` dynamically when creating new sales bills.
- [ ] Switching payment method to "Credit" sets `markAsFullyPaid: false` and `amountReceived: 0`.

### Mobile View & UX
- [ ] Activity Summary and all 5 action buttons (`Edit`, `Print`, `Download`, `Share`, `E-Way Bill`) are immediately visible above the fold on mobile viewports (< 768px).
- [ ] True invoice theme design renders via `UnifiedInvoiceRenderer` with store details, GST table, and active theme badge.
- [ ] All 72 unit tests across `MobileInvoiceSuccessView` test suites pass with zero failures.

### Notification Consolidation
- [ ] Creating a bill produces at most 1 single clean toast on desktop and zero redundant toast popups on mobile.
- [ ] Secondary `⚡ Sales Invoice shared with...` toast is eliminated from the save flow.
- [ ] Realtime events do not trigger duplicate chime or notification popups within a 10-second window.

### Network Sync Reliability
- [ ] `isUuid` validator is exported and tested, ensuring Supabase database insertions succeed.
- [ ] Cross-organization lookup finds external organizations in Supabase by phone or GSTIN.
- [ ] `networkInvoicing.test.ts` passes 13/13 tests cleanly.
- [ ] TypeScript validation (`tsc --noEmit`) passes with 0 errors across the codebase.


## 2026-10-21T10:52:12Z

# Teamwork Project Prompt

Comprehensive, production-grade redesign of the core CredSmart application across both Desktop and Mobile viewports (Dashboard, Sales, Purchases, Items/Inventory, Parties, and the full CRM suite) into a unified, clean, high-density Stripe/Linear aesthetic with crisp typography, hairline borders, and high contrast, while strictly keeping the Create Invoice flow 100% untouched.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Executive ERP Dashboard (`src/pages/Dashboard.tsx`)
Redesign the primary store dashboard for both desktop and mobile viewports:
- **High-Density Metric Grid**: High-contrast cards for `TO COLLECT`, `TO PAY`, `CASH & BANK`, and `TODAY'S SALES` with monospaced Indian Rupee (`₹`) numerals, trend indicators, and color accents (Cyan/Blue, Orange/Rose, Amber/Gold, Emerald).
- **Dismissible Tally Banner**: Compact, hairline-bordered banner with an explicit close button and 1-tap scan action.
- **Quick Action Bar**: Sleek pills for frequent operations (`+ Sale Bill`, `+ New Item`, `+ Customer`, `Day Book`, `Barcode Scan`).
- **Recent Ledger Feed**: High-density transaction list displaying customer name, invoice #, relative date, payment status chip, and bold total.

### R2. Sales & Invoicing Hub (`src/pages/Sales.tsx`)
Overhaul the Sales transactions interface across desktop and mobile:
- **Desktop View**: High-density data table with sortable columns, custom date range filter, quick status tabs (`All`, `Paid`, `Unpaid / Due`, `Quotations`, `Returns`), search bar, and inline action icons (PDF download, WhatsApp share, edit, delete).
- **Mobile View**: High-density touch card stream with bold amounts, clickable payment status badges, and quick-action bottom sheet.

### R3. Purchases & Supplier Ledger (`src/pages/Purchases.tsx`)
Redesign the Purchases ledger to match the unified Stripe/Linear standard:
- **Bills Overview**: High-density table on desktop and compact cards on mobile featuring supplier name, bill number, bill date, payment status badge, and total payable amount.
- **Filters & Actions**: Quick filter tabs for pending vendor payments, fast search, and 1-tap record payment trigger.

### R4. Items & Inventory Catalog (`src/pages/Items.tsx`)
Modernize the inventory and product catalog:
- **Catalog Density**: Crisp product rows/cards showing item name, SKU/Barcode, current stock with color-coded status badges (`In Stock`, `Low Stock`, `Out of Stock`), selling price, and purchase price.
- **Quick Operations**: 1-tap barcode scanner trigger, category filter chips, search input with clear button, and swift stock adjustment drawer.

### R5. Parties Directory & Balances (`src/pages/Parties.tsx`)
Redesign the Customers & Suppliers ledger interface:
- **Balance Directionality**: Clear, high-contrast visual distinction between Receivables ("To Collect" in Emerald/Blue) and Payables ("To Pay" in Rose/Amber).
- **Communication Actions**: Direct 1-tap WhatsApp and phone call triggers on party rows/cards.
- **Category Tabs**: Seamless switching between `Customers`, `Suppliers`, and combined views.

### R6. Full CRM Suite (`src/pages/crm/*` & `src/App.tsx`)
Complete overhaul of all CRM modules with high-density design:
- **CRM Dashboard** (`CRMDashboard.tsx`): Command center with staff metrics, live attendance count, and 8-module quick navigation grid.
- **Attendance & Geofencing** (`Attendance.tsx`): 1-tap mobile punch card with GPS coordinate lock, geofence status badge, elapsed work timer, and desktop attendance roster with PDF/CSV export.
- **Roles & RBAC Matrix** (`RoleManagement.tsx`): User-defined role cards and Linear-style granular permission matrix with mobile accordion support.
- **Salary & Payroll Engine** (`SalaryManagement.tsx`): 4-tab workflow (Profiles, Payroll Run, Advances, Payslips) and route fix in `src/App.tsx` line 247.
- **Sub-Modules**: Dedicated views for Tasks (`/crm/tasks`), Broadcasts (`/crm/broadcasts`), Meet (`/crm/meet`), AI Assistant (`/crm/ai`), and Support (`/crm/support`).

### R7. STRICT EXCLUSION & PRESERVATION: Create Invoice Flow Protected
- **Do NOT touch or alter the Create Invoice flow**:
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
  - `src/components/SalesInvoiceModal.tsx`
  - `src/components/invoices/mobile/AddItemModal.tsx`
  - `src/components/invoices/mobile/SelectPartyModal.tsx`
  - `src/components/invoices/mobile/EditItemModal.tsx`
  - All existing invoice creation logic, modals, calculations, and inputs must remain **100% untouched and functional**.

## Verification Resources
- Existing automated test suites:
  - `src/test/mobileDashboardRedesign.test.tsx`
  - `src/test/MobileInvoiceSuccessView.test.tsx`
  - `src/test/billingLifecycleEngine.test.ts`
  - `src/test/networkInvoicing.test.ts`
  - `src/test/crm*.test.*`
- Automated checks:
  - Full TypeScript validation: `node node_modules/typescript/bin/tsc --noEmit`
  - Vitest test suite runs across billing, CRM, and dashboard

## Acceptance Criteria

### Executive Dashboard & Core ERP Pages
- [ ] Dashboard displays high-density metric cards, dismissible Tally banner, quick actions, and recent activity on both desktop and mobile.
- [ ] Sales page renders high-density data table on desktop and card stream on mobile with responsive filtering (`All`, `Paid`, `Unpaid`, `Quotes`).
- [ ] Purchases page renders supplier bills with clear payment status and balance due across both viewports.
- [ ] Items page displays inventory with stock badges, pricing, and category filters without horizontal clipping.
- [ ] Parties page clearly distinguishes "To Collect" from "To Pay" with 1-tap WhatsApp and call buttons.

### CRM Command Center & Subsystems
- [ ] CRM Dashboard provides 1-tap navigation to all 8 CRM modules with active staff and attendance statistics.
- [ ] Attendance module features 1-touch mobile punch card with GPS status and full desktop roster.
- [ ] Role Management provides clean permission toggle matrix on desktop and responsive accordion on mobile.
- [ ] `src/App.tsx` routes `/crm/salary` to `<SalaryManagement />` with all 4 payroll tabs operating properly.
- [ ] Tasks, Broadcasts, Meet, AI Assistant, and Support render dedicated clean views.

### Protected Areas (Zero Regression)
- [ ] `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, and all bill creation modals remain completely untouched.
- [ ] Existing invoice creation, saving, printing, and tax calculations work with zero regressions.

### Code Health
- [ ] `tsc --noEmit` exits with 0 errors across the entire repository.
- [ ] All existing test suites pass cleanly.
- [ ] Mobile viewports (`< 768px`) maintain 44px minimum hit targets and zero horizontal scroll overflow.


## 2026-10-21T17:42:42Z

Implement production-grade staff user provisioning & instant role assignment in CRM Role Management and complete the full-stack Enterprise Task Management system for multi-tenant company workflows.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. CRM Role Management: Staff User Provisioning & Instant Role Assignment
Company owners and super-admins must be able to provision new staff user credentials (full name, email, generated/custom password, phone, store role) directly from the Role Management dashboard. The creation process must atomically register the user, establish organization membership, and assign the selected CRM role. In addition, when creating a custom role, owners must be able to assign existing or newly created staff to that role in a single unified interaction. After user creation, a credentials summary dialog must provide one-click copying of the login details.

### R2. Enterprise CRM Task Management System
The Task Management module must operate with persistent database storage connected to the Ubuntu backend API (`/api/crm/tasks`). Support task creation with title, description, priority (urgent, high, normal, low), due date, proof requirements, and assignment to real organization staff. Provide interactive Kanban and Table views with complete lifecycle state transitions (`todo` -> `in_progress` -> `review` -> `done`), submission of proof notes when completing work, and manager approval or change requests.

### R3. Backend API & PostgreSQL Schema Integration
All staff provisioning and task lifecycle operations must run through authenticated Express endpoints in `backend-api/src/routes/crm.js` backed by PostgreSQL (`staff_tasks`, `users`, `org_memberships`, `crm_staff_assignments`), enforcing organization isolation, password hashing with bcrypt, and role-based permissions.

## Acceptance Criteria

### Staff Provisioning & Role Assignment
- [ ] Company owner can click "Add Staff User" in Role Management, auto-generate or enter a password, fill details, and create the user account with an immediate CRM role assignment.
- [ ] A credentials confirmation modal displays the created email and plaintext password with a copy button.
- [ ] The newly created user appears immediately in the staff list with their assigned role badge and can authenticate via `/api/auth/login`.
- [ ] In the "Create Role" dialog, the owner can optionally select existing staff or create a new user to assign the custom role upon creation.

### Enterprise Task System
- [ ] Tasks are fetched from and written to PostgreSQL table `staff_tasks` via `GET /api/crm/tasks` and `POST /api/crm/tasks`.
- [ ] Creating a task allows selecting assignees from real organization members fetched from the backend.
- [ ] Staff can transition task status from To Do to In Progress, and from In Progress to Review with proof notes.
- [ ] Owners/managers can approve tasks in Review to transition them to Done (recording completed_at and approved_by) or request revisions.
- [ ] Task metrics (Total, In Progress, Review, Completed, Completion Rate) calculate accurately from backend data.
- [ ] Frontend build passes cleanly (`npm run build`) with zero TypeScript errors.


## 2026-10-23T21:58:59Z

Architecturally and visually decouple CredSmart into two distinct core product offerings: (1) CredSmart POS & Billing (`/billing/*`) and (2) CredSmart CRM (`/crm/*`), providing route-isolated portals, dedicated navigation shells, independent sidebars, separate onboarding entry points, and an intuitive top-level Suite Switcher, while preserving 100% backwards compatibility and sharing a unified authentication and organization layer.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Route Architecture & Isolation: POS & Billing (`/billing/*`) and CRM (`/crm/*`)
Restructure application routing so that POS & Billing features live strictly under `/billing/*` (dashboard, POS terminal, sales, purchases, inventory, godown, barcode, parties, accounting, e-invoicing, reports, settings) and CRM features live strictly under `/crm/*` (dashboard, attendance, salary/payroll, tasks, role management, meetings, broadcasts, AI assistant, support). Ensure all legacy routes (e.g. `/pos`, `/sales`, `/items`, `/dashboard`) seamlessly redirect to their new `/billing/*` destinations with zero broken links.

### R2. Dedicated Navigation Shells & Suite Switcher
Create dedicated layout shells for each product portal:
- A dedicated POS & Billing sidebar containing only billing, inventory, POS, and accounting tools.
- A dedicated CRM sidebar containing only CRM submodules (attendance, tasks, salary, staff roles, broadcasts, meet, etc.).
- A high-visibility Suite Switcher / App Launcher in the top navigation header enabling instant switching between "CredSmart POS & Billing" and "CredSmart CRM", with badge indicators and state persistence (`credsmart_active_suite`).

### R3. Dual Portal Onboarding & Post-Login Entry Routing
Enhance post-authentication routing and onboarding so business owners can designate their primary operational hub ("POS & Billing" vs "CRM" vs "Both"). The app automatically directs users to their chosen or last-active suite upon login, with direct deep-linking support for each portal.

### R4. Zero-Collateral Code Integrity & Verification
All existing POS billing algorithms, thermal invoice printing, GST calculation engines, modal workflows, and CRM database synchronization must remain completely invariant. Verify with full TypeScript compilation (`tsc --noEmit`), automated test suites, and clean production build (`npm run build`).

## Acceptance Criteria

### Route Isolation & Redirection
- [ ] Navigating to `/billing` loads the dedicated POS & Billing portal and dashboard.
- [ ] Navigating to `/crm` loads the dedicated CRM portal and command center.
- [ ] Legacy routes (e.g., `/pos`, `/sales`, `/inventory`, `/customers`, `/dashboard`) automatically redirect to `/billing/*` without 404s.
- [ ] Mobile bottom navigation and quick-create drawers dynamically adapt depending on whether the user is in POS & Billing or CRM.

### Navigation Shells & Suite Switcher
- [ ] POS & Billing sidebar displays only billing, inventory, sales, purchases, reports, and store settings (no CRM clutter).
- [ ] CRM sidebar displays only CRM submodules: Dashboard, Attendance, Tasks, Payroll, Roles, Meetings, Broadcasts, AI Assistant, Support (no billing clutter).
- [ ] An interactive Suite Switcher in the top header allows instant switching between "POS & Billing" and "CRM".
- [ ] Active suite selection persists across sessions in `localStorage` (`credsmart_active_suite`).

### Onboarding & Entry Routing
- [ ] Onboarding includes suite selection preference for new organizations.
- [ ] Authenticated users entering the root path `/` or `/app` are intelligently routed to their preferred or last-active portal.

### Build & Test Integrity
- [ ] TypeScript compilation (`tsc --noEmit`) passes with 0 errors.
- [ ] Vitest test suites across CRM, Billing, and RBAC pass with 100% success rate.
- [ ] `npm run build` generates clean production assets with zero errors.


## 2026-10-24T18:51:21Z

# Teamwork Project Prompt — Launched

> Status: Launched
> Goal: Multi-agent execution of CredSmart Minimal & Fast-Access Redesign
> Requested team: Specialized Multi-Agent Design & Layout Team (design-system-core, mobile-view-architect, desktop-layout-architect, theme-visual-qa)

Redesign CredSmart's complete Theme, Fonts, Style, Structure, and Layout from scratch into a modern, attractive, minimalist, lightning-fast, and user-friendly experience across both mobile and desktop views. The design strictly prohibits visual crowding, bloated buttons, and long scrollable pages, ensuring screen-fitted data density with zero business logic regression.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

---

## Visual Targets & Reference Mockups

- **Desktop Minimal Dashboard Mockup**: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_desktop_dashboard_1792867012395.jpg`
- **Mobile Touch-First Screen Mockup**: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_mobile_app_mockup_1792867057837.jpg`

---

## Requirements

### R1. Non-Crowded Minimal Design System & Proportions
Refactor global styles, typography, and base primitives to achieve an attractive, uncluttered, and fast-loading interface:
- **Button Sizing & Proportions (Zero Bloated Buttons)**:
  - Standard action button: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height).
  - Compact / table action button: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height).
  - Micro / inline icon button: `w-7.5 h-7.5 rounded-md` (30x30px).
  - Center mobile elevated CTA: `46x46px rounded-xl` (ergonomic thumb target, not oversized).
  - Eliminate oversized `h-11`, `h-12`, and `rounded-3xl` bubble buttons.
- **De-cluttering & Whitespace**:
  - Strip redundant explanatory prose from cards (e.g. "Outstanding customer credit ledger balance."). Let bold figures and clean labels speak for themselves.
  - Rely on 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-xs`).
  - Completely deprecate heavy 3D glass reflections, skeuomorphic bevels, liquid glass, and glowing neon halos.
- **Typography & Readability**:
  - Primary sans: `'Inter'` with system fallbacks for clean readability.
  - Monospace: `'IBM Plex Mono'` with OpenType tabular figures (`font-mono tabular-nums`) strictly for currency (₹), numbers, dates, and barcodes.
  - No sub-11px micro-fonts (strict hierarchy: 11px, 12px, 14px, 16px, 20px, 24px).
- **Surfaces & Palette**:
  - Light mode: `#F8FAFC` background, `#FFFFFF` pure white cards.
  - Dark mode: `#090D16` background, `#111726` elevated charcoal cards.
  - Accent: Single royal/electric blue (`#2563EB`) with semantic Emerald (`#10B981`) and Rose (`#E11D48`).

### R2. Screen-Fitted Desktop Productivity Shell (Screens >= 768px, Zero Long Scroll)
Re-engineer desktop viewports to fit within standard monitor heights (768px - 1080px) without long vertical scrolling:
- **Unified 52px Command Header**: Slim bar (`h-13`) hosting compact 28px brand mark, organization switcher dropdown, suite toggle pill, Command Palette search trigger (`⌘K`), split `+ New Invoice` button, live sync dot, notifications, and profile.
- **Screen-Fitted Data Tables**: Sticky table header, bounded scrollable table body (`flex-1 min-h-0 overflow-y-auto`), and fixed pagination footer at the bottom. Users always see the controls, headers, and footer without scrolling the entire page.
- **Split POS Workbench**: Dual-pane layout where item catalog scrolls independently on the left, active cart scrolls independently on the right, and the checkout action bar is fixed at the bottom. Hotkeys (`F1`-`F7`, `CTRL+B`, `CTRL+I`, `DEL`) with clean monospace badges.

### R3. Mobile Ergonomics & Native-Touch Layout (Screens < 768px)
Re-engineer mobile viewports (360px–430px) for seamless one-handed thumb ergonomics:
- **Thumb-Zone Bottom Navigation Dock**: Fixed at screen bottom with `safe-area-inset-bottom`, 5 primary destinations (`Home`, `Sales`, Center Elevated `+ POS/Bill` button, `Items`, `Parties`) with minimum 44x44px touch targets.
- **Swipeable Action Strip**: 1-tap micro-cards directly below mobile header (`+ Sale Bill`, `+ Quick POS`, `+ Customer`, `+ Item`, `Day Book`).
- **Responsive Mobile Data Cards**: Replace horizontal-scrolling 10-column desktop tables with clean responsive cards displaying party initials, document number, date, status pill, and bold currency amount.
- **Full-Screen Bottom-Sheet Drawers**: Modals slide up smoothly as bottom sheets (`max-h-[92dvh] rounded-t-2xl overflow-y-auto`) with fixed bottom confirmation bars.

### R4. Core Application Pages Overhaul
Update all primary pages to seamlessly adopt the minimal design system:
- `Dashboard.tsx`: 4 minimal KPI cards with top hairline accents, spline area chart with clean tooltips, and recent transactions table (desktop) / cards (mobile).
- `POSBilling.tsx`: Monochromatic hotkey ribbon, streamlined cart items, swipeable delete on mobile, and fast checkout flow.
- `Sales.tsx` & `Purchases.tsx`: Dense tabular list with sticky headers (desktop) / touch cards (mobile), multi-status filters, and CSV export.
- `Items.tsx` & `Inventory.tsx`: Compact inventory catalog with stock level badges (In Stock, Low Stock, Out of Stock).
- `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`: Clean ledger cards with Udhar Khata balances.
- `CashAndBank.tsx` & `Expenses.tsx`: Reconciled liquidity cards and categorized transaction ledger.
- `CRM Portal`: Clean workforce dashboard, attendance clock-in, task boards, and salary management.

### R5. Zero Business Logic & Structural Regression
Strictly preserve all database operations, Supabase real-time subscriptions, GST calculation engines, invoice PDF download pipelines, routes, role permissions, and printing services intact.

---

## Verification Resources

- Automated build script: `npm run build`
- ESLint verification: `npm run lint`
- Design system rules: `.agents/rules/minimal-design-system.md`
- Master skill reference: `.agents/skills/credsmart-minimal-design-system/SKILL.md`
- Database schema: `src/integrations/supabase/types.ts`
- Routes configuration: `src/config/routes.ts`

---

## Acceptance Criteria

### Thematic & Visual Purity
- [ ] Complete elimination of heavy 3D glass reflections, skeuomorphic bevels, liquid glass cards, and glowing neon halos across all pages.
- [ ] All buttons follow compact, proportional sizing (34px standard action, 28px table action, 46px center mobile CTA); zero oversized bubble buttons.
- [ ] All UI text uses `'Inter'` sans-serif with zero font sizes below `11px`.
- [ ] All currency amounts, quantities, and invoice numbers use `'IBM Plex Mono'` with OpenType tabular figures (`font-mono tabular-nums`).
- [ ] Color palette conforms to clean neutral canvas (`#F8FAFC` light / `#090D16` dark) with single royal blue accent (`#2563EB`) and standard semantic status tokens.
- [ ] WCAG AA/AAA contrast ratios met in both light and dark themes.

### Desktop Ergonomics & Viewport Containment
- [ ] Top command bar height is exactly 52px (`h-13`) across all non-POS routes.
- [ ] Main dashboard and data tables fit within standard screen heights without requiring long page scrolling.
- [ ] Global Command Palette (`⌘K`) opens instantly and searches parties, items, and invoices.
- [ ] Desktop data tables feature compact row heights (38px–42px), sticky headers, and right-aligned numeric columns.
- [ ] Desktop POS billing terminal supports all standard keyboard hotkeys (`F1`-`F7`, `CTRL+B`, `CTRL+I`, `P`, `Q`, `DEL`).

### Mobile Usability
- [ ] Fixed bottom navigation dock active on screens < 768px with minimum 44x44px touch targets and `safe-area-inset-bottom`.
- [ ] Zero horizontal page scroll or clipped tables on 360px and 390px mobile viewports.
- [ ] Modals on mobile render as smooth bottom-sheet drawers with fixed bottom confirmation bars.

### System Stability
- [ ] TypeScript compilation (`npm run build`) passes with 0 errors.
- [ ] All routes, Supabase real-time updates, tax calculations, and PDF generation work with zero regression.


## 2026-10-25T08:53:34Z

Fix the "nested/boxy card container" anti-pattern across CredSmart mobile pages in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`. Replace individual floating bordered item cards with clean minimal divide-y list rows throughout the app's mobile views.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

## Background

Across CredSmart mobile views, list items are currently wrapped in individual `rounded-xl border shadow-2xs` floating boxes placed inside an outer container — a "card-inside-a-card" anti-pattern. Screenshots show this as:
- Permission toggles in RoleManagement: 32 individual bordered boxes
- Invoice rows in Sales/Purchases: each row is a separate bordered card inside another bordered wrapper
- Item/Party/Dashboard rows: same pattern

The fix is to replace all these with clean minimal list rows separated by subtle `divide-y divide-slate-100 dark:divide-slate-800/60` hairlines — one clean outer container, flat rows inside.

## The Anti-Pattern vs The Fix

**❌ Current (Box-in-Box)**:
```jsx
// Outer container
<div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs ...">
  // Each item is its own floating card
  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2.5">
    ...row content...
  </div>
  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2.5">
    ...row content...
  </div>
</div>
```

**✅ Target (Clean Minimal List)**:
```jsx
// Single clean container with divide-y
<div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 ...">
  // Each item is a flat row — no border, no shadow, no rounded corners
  <div className="px-3.5 py-3 space-y-2">
    ...row content...
  </div>
  <div className="px-3.5 py-3 space-y-2">
    ...row content...
  </div>
</div>
```

## Requirements

### R1. Fix Mobile List Item Containers in 9 Files
Remove the individual per-row `border`, `rounded-xl`, and `shadow-2xs` classes from mobile list item cards in these files. Replace with clean flat rows inside a `divide-y divide-slate-100 dark:divide-slate-800/60` container:

- `src/pages/crm/RoleManagement.tsx` — **32 hits**: permission toggle rows (`rounded-xl border p-3 flex items-center justify-between gap-3`) each become flat `px-3.5 py-3 flex items-center justify-between gap-3` rows
- `src/pages/Items.tsx` — **13 hits**: mobile product list item cards
- `src/pages/Sales.tsx` — **9 hits**: mobile invoice list cards + outer wrapper double border
- `src/pages/Dashboard.tsx` — **9 hits**: recent activity transaction rows
- `src/pages/Purchases.tsx` — **6 hits**: mobile purchase invoice list cards
- `src/pages/Parties.tsx` — **6 hits**: mobile party directory rows
- `src/pages/crm/SalaryManagement.tsx` — **4 hits**: salary profile list rows
- `src/pages/crm/Attendance.tsx` — **4 hits**: attendance log rows
- `src/pages/crm/Tasks.tsx` — **3 hits**: task cards in Kanban groups

For Sales.tsx specifically, also fix the outer wrapper: `flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden` → `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden` (the outer double-border wrapping the list).

### R2. Preserve Design System Rules
- Never touch these 19 protected quarantine files: `src/components/invoices/mobile/MobileCreateInvoice.tsx`, `src/components/invoices/mobile/AddItemModal.tsx`, `src/components/invoices/mobile/SelectPartyModal.tsx`, `src/components/invoices/mobile/EditItemModal.tsx`, `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`, `src/components/invoices/mobile/MobileBillPreviewModal.tsx`, `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`, `src/components/invoices/mobile/CreatePartyModal.tsx`, `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`, `src/components/items/mobile/CreateNewItemModal.tsx`, `src/components/SalesInvoiceModal.tsx`, `src/components/PurchaseInvoiceModal.tsx`, `src/components/invoices/AddItemsToBillModal.tsx`, `src/components/invoices/InvoiceFitView.tsx`, `src/components/invoices/UnifiedInvoiceRenderer.tsx`, `src/utils/downloadExactInvoice.ts`, `src/utils/whatsappPdfShare.ts`, `src/utils/invoiceThemeLoader.ts`, `src/services/documentsService.ts`
- Minimum touch targets: `min-h-[44px]` on all interactive rows
- No sub-11px fonts (`text-[11px]` minimum)
- Desktop views (`md:` and above breakpoints) must be preserved — only the mobile patterns (`block md:hidden` sections and mobile-only containers) need the flat row treatment
- Keep all business logic, data fetching, state, onClick handlers, and functionality 100% intact
- Single primary accent: Royal Blue `bg-blue-600` only — do not add new amber or purple buttons

### R3. Build Must Pass
After all changes:
1. Run `cd c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart; node node_modules/typescript/bin/tsc --noEmit` — must produce 0 errors
2. Run `cd c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart; node node_modules/vite/bin/vite.js build` — must complete with `✓ built`
3. Verify all 19 protected files are untouched (check git status or file modification times)

## Acceptance Criteria

### Mobile UI
- [ ] No mobile list item has its own individual `rounded-xl border shadow` floating card inside a parent container
- [ ] All list rows are separated by hairline `divide-y divide-slate-100 dark:divide-slate-800/60` only
- [ ] RoleManagement permission toggles: grouped per module section, flat rows with dividers — not 32 individual floating boxes
- [ ] Sales/Purchases invoice list: clean flat rows, no double border

### Code Quality
- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Vite production build: passes (`✓ built`)
- [ ] All 19 quarantine files: unmodified

### Preservation
- [ ] Desktop table views (`hidden md:block` sections) are unchanged
- [ ] All click handlers, navigation, state, and data logic intact
- [ ] No new design system violations introduced (no sub-11px fonts, no oversized buttons)


## 2026-10-25T10:11:33Z

Redesign CredSmart CRM mobile pages (SalaryManagement, RoleManagement, Attendance, Tasks) to match the attached mobile reference mockups with exact visual fidelity, typography hierarchy, compact 2x2 stat badges, streamlined segmented controls, and native-feeling mobile ergonomics while preserving 100% of underlying business logic and protected invoice quarantine files.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Payroll Engine Mobile Redesign (`SalaryManagement.tsx`)
- Implement the exact layout from Mockup 1:
  - Header: Large bold "Payroll Engine", subtitle "Staff compensation & payroll runs", primary action `+ New Profile` (Royal Blue) + export icon button `[ ⎋ ]`.
  - 2x2 Stat Badges: Compact horizontal pill badges with subtle colored icon containers (`Active Profiles: 0 >`, `Current Month: ₹0.00`, `Pending Advances: ₹0.00 >`, `Available Payslips: ...`).
  - Segmented Tab Bar: Inset pill switcher (`Salary Profiles (0)`, `Payroll Run`, `Advances & Deductions`).
  - Empty State Card: Clean white card (`rounded-2xl border border-slate-200/80 shadow-xs text-center p-8`) with vector illustration, "No salary profiles configured yet.", and helper prompt.
  - Quick Actions Footer: Dual white pill buttons (`[ 📋 View Past Runs ]` and `[ ⚙️ Pay Settings ]`).

### R2. Role Manager Mobile Redesign (`RoleManagement.tsx`)
- Implement the exact layout from Mockup 2:
  - Header: "Role Manager", subtitle "Configure user permissions & teams", horizontal action chips (`[ ← ]`, `[ 🛡 RBAC Foundation ]`, `[ + Custom Role ]` (Royal Blue), `[ 👤+ Add User ]`).
  - Active Role & Quick Stats Card: Crown icon `Super Admin`, `👑 Full Access` badge, `🔑 14 / 14 Actions • 👥 1 Staff`.
  - Granular Module Permissions Matrix: Grouped accordion card with hairline row dividers (`divide-y divide-slate-100`). Each module header shows an icon, title, counter pill (e.g. `2 / 2 Enabled`), and expand chevron. Expanded state renders a clean 2-column grid of compact checkbox chips (`[ ☑ View self and team daily records ]`, `[ ☑ Edit clock-in & approvals ]`).
  - Staff Role Assignments: Segmented toggle (`List View` / `Team Tree View`), search input with `[ + Add ]` button, and horizontal colored avatar stream (`Suresh`, `Pushpa`, `Rahul`, etc.).

### R3. Attendance Hub Mobile Redesign (`Attendance.tsx`)
- Implement the exact layout from Mockup 3:
  - Header: "Attendance Hub", badge `🟢 Live Sync`, `[ ⎋ ]`, subtitle "GPS verified clock-in, active work sessions, and shift tracking", button `[ 📍 Geofences ]` (Royal Blue).
  - 2x2 Stat Badges: `Present 0 >`, `Geo-Verified 0 >`, `Regularised 0 >`, `Geofences 1 >`.
  - Segmented Tabs: `[ My Clock-In ]`, `[ Team Logs (0) ]`, `[ Locations ]`.
  - Shift Card: "Today's Shift • General", date pill `Sun, Oct 25`, left orange hairline accent (`border-l-4 border-orange-500`), large digital clock (`02:45:48 PM`), radar geofence widget on the right, status badge `⚠️ Outside Geofence`, location label `📍 Nearest: HQ (Radius: 150m)`, GPS accuracy pill (`GPS Accuracy: ±4m • Protocol: Verified`), and full-width Emerald CTA `[ ✓ Clock In Now ]`.
  - Quick Links: Dual pill buttons (`[ 📋 View Team Logs ]`, `[ ✏️ Request Correction ]`).

### R4. Task Workflows Mobile Redesign (`Tasks.tsx`)
- Implement the exact layout from Mockup 4:
  - Header: "Task Workflows", filter icon `[ ☰ ]`, subtitle "All Assignees • Live Status".
  - Status Filter Chips: `[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`, and primary CTA `[ + Create Task ]` (Amber/Orange).
  - 2x2 Stat Badges: `Total Tasks 4`, `In Progress 1`, `Pending Review 1`, `Completed 1`.
  - Search & Priority Bar: `🔍 Search tasks or assignees...`, dropdown `All Priorities ⌵`.
  - High-Density Task Stream: Clean task cards with Status Emoji Tag (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`), Priority Pill (`Urgent`, `High`, `Normal`, `Low`), bold task title, assignee avatar chip, and contextual action CTA (`Start Job →`, `Submit Proof`, `Approve ✓`).

### R5. Zero Regression & Quarantined Isolation
- Do NOT touch the 19 quarantine files (invoicing, documentsService, print pipeline, etc.).
- Maintain all underlying Supabase mutations, real-time sync, geolocation calculations, and role-checking hooks.
- Desktop breakpoint views (`md:` and above) must remain clean, functional, and regression-free.

## Acceptance Criteria

### Visual & Functional Match
- [ ] Mobile screens (<768px) match the attached 4 mockups with 1:1 fidelity for headers, 2x2 stat badges, tabs, cards, and CTA buttons.
- [ ] Role Management granular matrix displays compact 2-column checkbox chips inside a grouped accordion rather than isolated boxy cards.
- [ ] Attendance shift card displays live digital clock, radar geofence telemetry indicator, and emerald `Clock In Now` CTA.
- [ ] Task cards feature the exact 4 status tags (`TO DO`, `IN PROGRESS`, `UNDER REVIEW`, `COMPLETED`) with contextual action buttons.
- [ ] Payroll Engine displays clean empty-state illustration, 2x2 stat chips, and bottom quick links.

### Code Integrity & Build
- [ ] TypeScript compilation (`tsc --noEmit`) passes with 0 errors.
- [ ] Vite production build (`vite build`) completes successfully (`✓ built`).
- [ ] All 19 quarantined files remain 100% untouched.

## 2026-10-25T20:32:02Z

This is a single self-contained fix; keep it small and focused. Enforce strict multi-tenant organization isolation for CredSmart CRM so that staff members, attendance, tasks, salary profiles, roles, and CRM operations are strictly scoped to the active organization (e.g., "Cred"), preventing any cross-tenant data or user visibility across different organizations.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Tenant-Isolated Staff & User Directory
- CRM staff lists (`/api/crm/staff`, `/api/crm/staff-roles`, and frontend roster components) must strictly return users who are members of the active organization (`organization_id` / `org_id`).
- Prevent cross-organization staff visibility: users belonging to Organization A must never appear in Organization B's staff directory, assignee selector, or attendance logs.
- When provisioning new staff members, the user membership must be explicitly recorded and scoped to the active organization (`org_memberships` / `organization_memberships` and `crm_staff_assignments`).

### R2. Strict Organization Scoping across CRM Endpoints
- Ensure all CRM routes (`/api/crm/tasks`, `/api/crm/attendance`, `/api/crm/salary-profiles`, `/api/crm/roles`, `/api/crm/broadcasts`, `/api/crm/meetings`) enforce strict tenant boundaries matching the active organization context.
- Prevent data leakage between organizations: requests from Organization A must not read, update, or delete records belonging to Organization B.

### R3. Membership Isolation & Clean Separation
- Ensure queries retrieving organization members do not cross-join or aggregate users from unrelated organizations.
- When an admin provisions staff for a CRM instance, ensure the relationship is firmly bound to that organization and not globally associated with all organizations.

## Verification Resources
- Automated test suites:
  - `src/test/crmStaffTasksIntegration.test.tsx`
  - `src/test/crmStaffProvisioning.test.ts`
  - `src/test/crmStaffProvisioningUI.test.tsx`
  - `src/test/crmDashboardResilience.test.tsx`
  - `src/test/crmTasksView.test.tsx`
- Type checking:
  - `npx tsc --noEmit`

## Acceptance Criteria

### Multi-Tenant Isolation
- [ ] Querying `/api/crm/staff` for Organization A returns only staff assigned to Organization A, and 0 users from Organization B.
- [ ] Task assignees in Organization A only display staff belonging to Organization A.
- [ ] Attendance and salary records are strictly partitioned by organization ID without cross-tenant bleed.
- [ ] Attempting to access or mutate CRM records of another organization returns an error or empty result isolated to the caller's organization.

### Zero Regression & Code Health
- [ ] `tsc --noEmit` exits with 0 errors across the repository.
- [ ] All 198+ existing CRM tests pass cleanly without regression.
- [ ] Billing and invoice generation workflows remain 100% untouched.


## 2026-10-26T16:44:01Z

This is a single self-contained fix; keep it small and focused. Perform a deep recheck and hardening of CredSmart CRM across multi-tenant isolation, real staff visibility (eliminating mock demo staff on the dashboard), human display name preservation, default password generation (name123), and task assignment features, ensuring 100% test passing and zero regressions.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Strict Real Staff Visibility & Dashboard Purity
- Eliminate `DEFAULT_STAFF` mock data (`Suresh`, `Pushpa`, `Rajesh`, etc.) from `CRMDashboard.tsx`.
- Only real staff members provisioned for or belonging to the active organization (`orgId`) must be fetched and displayed.
- If an organization has no staff members yet, render a clean empty state rather than injecting demo names.

### R2. Human Display Name Consistency
- Ensure staff human display names (e.g. "Aman Sharma") are displayed across all CRM views (roster, task cards, tables, assignee dropdowns, breadcrumbs) instead of raw or sanitized usernames.
- In backend route handlers (`POST /tasks`, `PATCH /tasks/:id`), fall back to `users.name` if `users.full_name` is empty.

### R3. Default Password Generation
- Verify default auto-generated passwords follow `{firstName}123` format (e.g. staff named "aman" -> `aman123`, padded to 6 chars minimum) on both frontend and backend.

### R4. Task Assignment & Lifecycle Invariants
- Verify task assignment workflow: selecting active org staff, persisting `assigned_to`, displaying assignee display name and initial avatar, and transitioning across lifecycle states (`todo` -> `in_progress` -> `review` -> `done`).

## Verification Resources
- Automated test suites:
  - `src/test/crmTenantIsolation.test.ts`
  - `src/test/crmDashboardResilience.test.tsx`
  - `src/test/crmStaffTasksIntegration.test.tsx`
  - `src/test/crmStaffProvisioning.test.ts`
  - `src/test/crmStaffProvisioningUI.test.tsx`
  - `src/test/crmTasksView.test.tsx`
  - `src/test/crmBackendApiM1.test.ts`
  - `src/test/crmSubmodules.test.tsx`
- Type checking:
  - `npx tsc --noEmit`

## Acceptance Criteria

### CRM Functionality & Isolation
- [ ] `CRMDashboard.tsx` displays only real organization staff members and zero mock `DEFAULT_STAFF`.
- [ ] New staff provisioning auto-generates password as `{firstName}123`.
- [ ] Staff display names are visible across rosters, tables, and task cards.
- [ ] Task assigning and lifecycle transitions function without errors.

### Code Health & Zero Regression
- [ ] `tsc --noEmit` exits with 0 errors.
- [ ] All 136 CRM tests pass cleanly without regression.
- [ ] Zero changes to protected billing and invoice files.


## 2026-10-26T19:54:47Z

Eliminate critical CRM defects across CredSmart: resolve staff vanishing on refresh, prevent cross-tenant user leaks, link newly provisioned staff strictly to the owner's organization with custom credentials, fix Salary Management staff visibility, restore Task assignment, enforce strict route lockdown preventing CRM staff from entering POS/Billing, accelerate CRM page load speed, unify the CRM Command Center header across all sub-pages, and cleanly decouple CRM and POS/Billing data on the Ubuntu server PostgreSQL database.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Forensic Bug Root Cause Analysis

### 1. Staff Vanishing on Refresh & Cross-Tenant User Leaks
- Cause A (SQL Cross-Join in Migration): In backend-api/fix_db.sql (lines 131–141), a CROSS JOIN between users and organizations was executed (INSERT INTO org_memberships ... FROM users u CROSS JOIN organizations o). This caused every user who registered in the database to be cross-linked as an owner to every organization!
- Cause B (Global Fallback in Auth & Middleware): In backend-api/src/routes/auth.js (getUserPrimaryOrgId) and backend-api/src/middleware/auth.js (lines 45–53), if a user had no organization header, the system fell back to querying the organization with the most products in the entire database (SELECT id FROM organizations ORDER BY ... DESC LIMIT 1) and auto-inserted the user into that organization!
- Cause C (Unscoped /api/profiles and /api/organization-memberships): In backend-api/src/routes/settings.js, if targetOrg was not explicitly passed, /api/profiles and /api/organization-memberships executed SELECT * FROM users and returned every user across all tenants.
- Cause D (Frontend Error Suppression & Synthetic IDs): In src/pages/crm/RoleManagement.tsx (line 1070), const newUserId = res?.data?.user?.id || 'user-' + Date.now(). When the backend rejected the provision or assignment (e.g., due to duplicate email, UUID mismatch, or invalid role), the frontend ignored res.error, generated an in-memory synthetic ID (user-178...), and saved it to localStorage. On browser refresh, the backend returned only real database rows, causing the provisioned staff to vanish completely.

### 2. Salary Management Staff Visibility
- Cause: SalaryManagement.tsx only renders staff who already possess a record in crm_salary_profiles. When staff are newly added or when crmApi.getCRMStaff returns empty/fails, staffDirectory becomes empty. Consequently, the "Configure Salary" and "Add Staff Profile" dropdowns display zero selectable staff members.

### 3. Task Assignment Failure
- Cause: In src/pages/crm/Tasks.tsx, tasks were created with synthetic staff IDs (user-178...) from localStorage. The backend POST /api/crm/tasks enforces verifyUserInOrg(cleanAssignee, orgId). Because the synthetic ID does not exist in PostgreSQL, the backend rejected the task creation with 400 Assigned user does not belong to this organization, causing assignment failure and data disappearance on refresh.

### 4. POS/Billing Access Lockdown for CRM Staff
- Cause: In src/App.tsx, POS/Billing routes (/billing/pos, /billing/checkout, /billing/sales, /billing/items, /billing/parties) are mounted under general <ProtectedRoutes> with zero role gating. RoleProtectedRoute is only applied to managers for reports and settings. Staff users can simply type /billing/pos or click navigation links and access the full billing engine.

### 5. CRM Page Loading Speed
- Cause: CRM pages perform cascading, un-parallelized HTTP requests over the Cloudflare Tunnel (cloudflared). For example, SalaryManagement.tsx executes 14 sequential API calls on every mount without leveraging TanStack Query cache. In addition, the Express micro-cache only targets /api/ endpoints, leaving Supabase PostgREST passthroughs (/rest/v1/*) completely uncached.

### 6. Inconsistent CRM Header
- Cause: CRMDashboard.tsx features a dedicated mobile and desktop command center header with live sync badges, organization breadcrumbs, and quick action buttons. Other CRM sub-pages (RoleManagement, SalaryManagement, Tasks, Attendance, Broadcasts, Meet, AIAssistant, Support) each define differing ad-hoc headers without a unified layout wrapper.

### 7. CRM vs. POS/Billing Data Coupling
- Cause: Both domains currently share the generic org_memberships table for role determination, and cache invalidation flushes both POS inventory and CRM staff simultaneously. CRM staff roles and POS store roles must be cleanly segregated in queries and middleware.

## Requirements

### R1. Multi-Tenant User Isolation & Staff Provisioning
- Cleanse database memberships: Eradicate cross-joined rogue memberships so that each organization only contains its legitimate owner and explicitly provisioned staff.
- Ensure POST /api/crm/staff/provision saves user credentials (email, password_hash, full_name, phone) and creates an authoritative link in crm_staff_assignments and crm_staff_roles scoped strictly to org_id.
- Ensure newly provisioned staff can log in using their credentials and are strictly bound to the provisioning owner's organization.
- Prevent GET /api/crm/staff, GET /api/profiles, and GET /api/organization-memberships from ever leaking users across different organizations.

### R2. Salary & Payroll Staff Synchronization
- In SalaryManagement.tsx, populate the staff directory directly from authoritative CRM staff for the active organization.
- Display a comprehensive roster showing both configured and unconfigured staff members, enabling 1-click salary profile creation.

### R3. Reliable Task Assignment
- Ensure POST /api/crm/tasks accepts valid UUIDs of real provisioned staff in the active organization.
- Update src/pages/crm/Tasks.tsx to handle task assignment with immediate optimistic updates and persistent database synchronization.

### R4. POS/Billing Strict Access Lockdown
- Implement a route guard preventing CRM staff from navigating to /billing/*, /pos, /checkout, or billing pages.
- Restrict POS/Billing exclusively to the Store Owner, Super Admin, or staff explicitly granted POS billing access permissions in their custom CRM role.
- If a CRM staff user without POS permission accesses a billing URL, redirect them to /crm with an unauthorized alert.

### R5. Lightning-Fast CRM Page Loading
- Eliminate cascading roundtrips: bundle CRM initial load queries or execute them concurrently with Promise.all / React Query.
- Expand backend in-memory micro-cache (10s TTL) to cover /rest/v1/* read requests.
- Add database B-Tree composite indexes on crm_staff_assignments(org_id, user_id), staff_tasks(org_id, status), and crm_salary_profiles(org_id, staff_id).

### R6. Unified CRM Command Center Header
- Extract the CRM Command Center header from CRMDashboard.tsx into a reusable CRMCommandHeader component.
- Apply this unified header across all CRM pages (RoleManagement, SalaryManagement, Tasks, Attendance, Broadcasts, Meet, AIAssistant, Support).

### R7. CRM and POS/Billing Domain Data Separation
- Segregate CRM staff assignments and permissions from POS store roles.
- Ensure modifications within CRM (roles, staff, payroll, tasks) operate independently from POS/Billing operational records (sales invoices, products, stock).

## Acceptance Criteria

### Security & Multi-Tenancy
- [ ] No cross-organization user leaks: A newly signed-up user sees zero staff initially.
- [ ] Provisioned staff can successfully authenticate with the owner-assigned email and password.
- [ ] On browser refresh, newly created custom roles and assigned staff remain visible and intact.

### Salary & Tasks
- [ ] Salary Management displays all provisioned staff in the organization with options to set basic pay and allowances.
- [ ] Tasks can be assigned to any staff member in the organization, and the assigned task persists across page reloads.

### Access Control
- [ ] CRM staff without explicit POS permissions cannot access /billing/pos, /billing/checkout, or /billing/sales.
- [ ] Store owners retain unrestricted access to both POS/Billing and CRM.

### Performance & UI Consistency
- [ ] CRM pages load in under 500ms using parallel queries and cached endpoints.
- [ ] All CRM sub-pages render the unified Command Center header matching CRMDashboard.tsx.


## 2026-10-27T02:39:33Z

# Teamwork Project Prompt — Universal Header Logo Architecture & Full CRM/POS Mobile Ergonomics

> Status: Launched  
> Goal: Execute multi-agent team across Universal Header and complete Mobile View overhaul  
> Requested team: Full multi-agent teamwork system  

Execute complete implementation for placing the official CredSmart platform shield logo permanently in the universal command bar alongside the tenant's store branding, and delivering dedicated touch-first mobile ergonomics across all pages of CRM and POS & Billing without altering desktop workflows.

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`  
Integrity mode: `development`

---

## 1. Requirements

### R1. Permanent CredSmart Logo & Tenant Store Dual Lockup in Universal Header
1. **Brand Architecture**:
   - Far Left: Permanent CredSmart platform mark using `/favicon.png` or `CredSmartShieldIcon` (`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs`) paired with the styled `CredSmart` wordmark (`hidden sm:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white`).
   - Tenant Business Selector: Immediately adjacent (separated by a subtle 1px hairline divider `border-slate-200 dark:border-slate-800`), render the active Store Switcher dropdown pill displaying the tenant's store logo (`org?.logo_url` or `<Building2 />`) and `{org?.name}`.
2. **Mobile Header Viewport (< 768px)**:
   - Enforce a strict 48px slim header height (`h-12`).
   - Compact 28x28px CredSmart Shield Logo paired with the compact active store pill.
   - Search trigger, notification center bell, quick-create action button, and profile trigger fit cleanly with zero horizontal overflow or wrapping on standard 360px–430px screens.

### R2. Touch-First Mobile POS Billing Terminal (`/pos`, `/checkout`)
1. On viewports < 768px, replace the 2-column squished desktop workbench with a dedicated **Single-Column Mobile POS Terminal**:
   - Sticky top bar: Back to dashboard button, quick barcode scan button, and product search input.
   - Horizontal category chips (All, Grocery, Snacks, etc.) with 1-tap filtering.
   - Scrollable high-density product cards (4-5 visible per scroll) with clear item name, price, stock badge, and 1-tap `+` / `-` quantity stepper.
   - Floating Bottom Cart Dock (`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]`): Displays total item count, grand total (₹), and a prominent "Review Cart & Checkout" CTA.
   - 1-Tap Checkout Bottom Drawer: Slide-up drawer for customer details, payment method selection (Cash, UPI/QR, Card, Credit), and "Generate Bill & Print" CTA.

### R3. Comprehensive Mobile CRM Suite Ergonomics (All CRM Pages)
1. **CRM Command Centre (`/crm`, `/crm/dashboard`)**: Polish the mobile header and quick tools grid so that stats cards, roster list, and workspace shortcuts fit standard 360px–430px viewports with zero horizontal scrolling.
2. **Task Management (`/crm/tasks`)**: Implement dedicated mobile card view with swipeable task status (To Do / In Progress / Completed), priority pills, and a bottom-sheet task creation drawer.
3. **Salary & Payroll (`/crm/salary`)**: Replace the wide horizontal desktop `<table` on mobile with high-density staff payroll cards showing net pay, advance balance, and 1-tap payslip generation.
4. **Role Management (`/crm/roles`)**: Ensure the staff provisioning form and role assignment matrix open in a touch-friendly full-height bottom drawer on mobile with large 44px tap targets.
5. **Meet, Broadcasts, AI Assistant, Support**: Ensure clean mobile-first layout with bottom-anchored inputs, thumb-reachable action buttons, and zero edge clipping.

### R4. Complete Mobile POS & Billing Ledger & Inventory Pages
1. **Sales & Purchases (`/sales`, `/purchases`)**: On mobile (< 768px), display dense transaction cards (party name, invoice number, date, amount, status badge) with swipeable quick actions (print, WhatsApp share, edit/view).
2. **Parties (`/customers`, `/suppliers`)**: Provide 4-5 cards per mobile viewport with 1-tap call and WhatsApp buttons, credit balance indicators, and quick ledger drawers.
3. **Inventory & Godowns (`/inventory`, `/godown`, `/items`)**: Provide compact catalog cards with thumbnail, SKU, stock quantity pill, selling price, and quick stock adjustment button.
4. **Reports (`/reports`)**: Format summary reports into mobile-optimized metric cards and collapsible category accordions.
5. **Cash & Bank (`/cash-and-bank`)**: Responsive account cards and clean ledger transaction stream.

### R5. Desktop View 100% Preservation (Zero Regression)
1. All desktop layouts (>= 768px) must remain 100% pixel-perfect and functionally identical.
2. Under no circumstance may any Supabase subscriptions, database schemas, calculation engines, or API routes be altered.

---

## 2. Acceptance Criteria

### Universal Header
- [ ] CredSmart shield icon and brand mark are permanently visible on the top-left across all desktop and mobile views.
- [ ] Tenant store logo (`org?.logo_url`) and name are displayed inside the adjacent organization switcher pill.
- [ ] Header height is strictly 52px on desktop and 48px on mobile with zero horizontal overflow on a 360px viewport.

### Mobile POS Billing
- [ ] Navigating to `/pos` on mobile (< 768px) presents the single-column touch terminal with category chips, product cards, floating bottom cart bar, and checkout drawer.
- [ ] Mobile POS cart summary and checkout CTA are fixed at the bottom with proper `safe-area-inset-bottom`.

### Mobile CRM Suite
- [ ] All 9 CRM routes (`/crm`, `/crm/roles`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai`, `/crm/support`) render with zero horizontal scrollbar on a 375px mobile screen.
- [ ] Salary management on mobile renders cards instead of overflowing desktop table rows.
- [ ] Task management on mobile allows 1-tap status transitions and thumb-accessible task creation.

### Mobile POS & Billing Data Pages
- [ ] Sales, Purchases, Customers, Suppliers, and Inventory lists display dense responsive cards on mobile (4-5 items per viewport).
- [ ] All touch targets meet or exceed 44x44px ergonomic standards.

### Verification
- [ ] Automated Vitest suite covers mobile responsive branching and header brand lockup.
- [ ] Full production build (`npm run build`) completes with zero errors.
