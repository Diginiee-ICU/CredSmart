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
