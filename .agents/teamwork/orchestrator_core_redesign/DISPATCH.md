# Orchestrator Dispatch: Core CredSmart High-Density Redesign

## Mission
Comprehensive, production-grade redesign of the core CredSmart application across both Desktop and Mobile viewports (Dashboard, Sales, Purchases, Items/Inventory, Parties, and the full CRM suite) into a unified, clean, high-density Stripe/Linear aesthetic with crisp typography, hairline borders, and high contrast, while strictly keeping the Create Invoice flow 100% untouched.

## Workspace & Context
- **Project Root**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
- **Orchestrator Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign`
- **Original Request**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## Requirements Summary
1. **R1. Executive ERP Dashboard (`src/pages/Dashboard.tsx`)**:
   - High-Density Metric Grid: High-contrast cards for TO COLLECT, TO PAY, CASH & BANK, and TODAY'S SALES with monospaced Indian Rupee (`₹`) numerals, trend indicators, and color accents (Cyan/Blue, Orange/Rose, Amber/Gold, Emerald).
   - Dismissible Tally Banner: Compact, hairline-bordered banner with explicit close button and 1-tap scan action.
   - Quick Action Bar: Sleek pills for frequent operations (`+ Sale Bill`, `+ New Item`, `+ Customer`, `Day Book`, `Barcode Scan`).
   - Recent Ledger Feed: High-density transaction list displaying customer name, invoice #, relative date, payment status chip, and bold total.
2. **R2. Sales & Invoicing Hub (`src/pages/Sales.tsx`)**:
   - Desktop View: High-density data table with sortable columns, custom date range filter, quick status tabs (All, Paid, Unpaid / Due, Quotations, Returns), search bar, inline action icons (PDF download, WhatsApp share, edit, delete).
   - Mobile View: High-density touch card stream with bold amounts, clickable payment status badges, quick-action bottom sheet.
3. **R3. Purchases & Supplier Ledger (`src/pages/Purchases.tsx`)**:
   - Bills Overview: High-density table on desktop and compact cards on mobile featuring supplier name, bill number, bill date, payment status badge, total payable amount.
   - Filters & Actions: Quick filter tabs for pending vendor payments, fast search, 1-tap record payment trigger.
4. **R4. Items & Inventory Catalog (`src/pages/Items.tsx`)**:
   - Catalog Density: Crisp product rows/cards showing item name, SKU/Barcode, current stock with color-coded status badges (In Stock, Low Stock, Out of Stock), selling price, purchase price.
   - Quick Operations: 1-tap barcode scanner trigger, category filter chips, search input with clear button, swift stock adjustment drawer.
5. **R5. Parties Directory & Balances (`src/pages/Parties.tsx`)**:
   - Balance Directionality: High-contrast visual distinction between Receivables ("To Collect" in Emerald/Blue) and Payables ("To Pay" in Rose/Amber).
   - Communication Actions: Direct 1-tap WhatsApp and phone call triggers on party rows/cards.
   - Category Tabs: Seamless switching between Customers, Suppliers, and combined views.
6. **R6. Full CRM Suite (`src/pages/crm/*` & `src/App.tsx`)**:
   - CRM Dashboard (`CRMDashboard.tsx`): Command center with staff metrics, live attendance count, 8-module quick navigation grid.
   - Attendance & Geofencing (`Attendance.tsx`): 1-tap mobile punch card with GPS coordinate lock, geofence status badge, elapsed work timer, desktop attendance roster with PDF/CSV export.
   - Roles & RBAC Matrix (`RoleManagement.tsx`): User-defined role cards and Linear-style granular permission matrix with mobile accordion support.
   - Salary & Payroll Engine (`SalaryManagement.tsx`): 4-tab workflow (Profiles, Payroll Run, Advances, Payslips) and route fix in `src/App.tsx` line 247.
   - Sub-Modules: Dedicated views for Tasks (`/crm/tasks`), Broadcasts (`/crm/broadcasts`), Meet (`/crm/meet`), AI Assistant (`/crm/ai`), and Support (`/crm/support`).
7. **R7. STRICT EXCLUSION & PRESERVATION: Create Invoice Flow Protected**:
   - Do NOT touch or alter:
     - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
     - `src/components/SalesInvoiceModal.tsx`
     - `src/components/invoices/mobile/AddItemModal.tsx`
     - `src/components/invoices/mobile/SelectPartyModal.tsx`
     - `src/components/invoices/mobile/EditItemModal.tsx`
     - All existing invoice creation logic, modals, calculations, and inputs must remain 100% untouched and functional.

## Quality Standards
- `node node_modules/typescript/bin/tsc --noEmit` must pass with code 0.
- All existing Vitest test suites must pass cleanly.
- Mobile viewports (< 768px) maintain 44px minimum hit targets and zero horizontal scroll overflow.
- Maintain `plan.md` and update `progress.md` after every milestone.
- When finished and verified, send completion report back to Sentinel.
