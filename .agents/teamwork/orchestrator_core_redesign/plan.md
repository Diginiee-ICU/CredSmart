# Execution Plan: CredSmart Core Application High-Density Redesign

## Objective
Deliver a production-grade redesign of the core CredSmart application across both Desktop and Mobile viewports into a clean, high-density Stripe/Linear aesthetic with crisp typography, hairline borders, and high contrast, while strictly keeping the Create Invoice flow 100% untouched.

## Milestones & Execution Stages

### Phase 0: Survey & Codebase Mapping (COMPLETED)
- [x] Explorer 1: Core ERP Pages (`Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`)
- [x] Explorer 2: CRM Suite Architecture & Routing (`CRMDashboard.tsx`, `Attendance.tsx`, `RoleManagement.tsx`, `SalaryManagement.tsx`, `App.tsx`)
- [x] Explorer 3: Test Baseline & Invoice Flow Preservation (`tsc`, `vitest`, protected files)
- [x] Synthesize findings into `PROJECT.md` and feature inventory

### Milestone 1: Executive ERP Dashboard (`src/pages/Dashboard.tsx`)
- [ ] Worker:
  - Replace `.glass-card-3d` with hairline cards (`border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs`).
  - Upgrade metric cards (TO COLLECT, TO PAY, CASH & BANK, TODAY'S SALES) with `font-mono tabular-nums font-bold` Indian Rupee figures.
  - Retain dismissible Tally banner, quick action strip, and recent activity feed.
  - Ensure zero horizontal overflow and 44px touch targets on mobile.
  - Verify with `tsc --noEmit` and `src/test/mobileDashboardRedesign.test.tsx`.
- [ ] Reviewer & Challenger verification.
- [ ] Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 2: Sales & Invoicing Hub (`src/pages/Sales.tsx`)
- [ ] Worker:
  - High-density data table on desktop with 36-40px rows, subtle gray sticky header, and inline action icons.
  - Mobile touch card stream with bold amounts and hairline payment status pills.
  - Keep `SalesInvoiceModal` trigger contract intact; ZERO changes to `SalesInvoiceModal.tsx` or `MobileCreateInvoice.tsx`.
  - Verify with `tsc --noEmit` and `MobileInvoiceSuccessView` test suite.
- [ ] Reviewer, Challenger & Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 3: Purchases & Supplier Ledger (`src/pages/Purchases.tsx`)
- [ ] Worker:
  - High-density bills table on desktop and compact cards on mobile.
  - Hairline `PendingInwardBanner` for B2B supplier invoices.
  - Verify with `tsc --noEmit` and `networkInvoicing` tests.
- [ ] Reviewer, Challenger & Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 4: Items & Inventory Catalog (`src/pages/Items.tsx`)
- [ ] Worker:
  - High-density catalog table with SKU, barcode, color-coded stock badges, and pricing.
  - Swift stock adjustment drawer and category filter chips.
  - Verify with `tsc --noEmit`.
- [ ] Reviewer, Challenger & Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 5: Parties Directory & Balances (`src/pages/Parties.tsx`)
- [ ] Worker:
  - High-contrast directional balance badges (To Collect in Emerald, To Pay in Rose).
  - 1-tap WhatsApp and phone call triggers.
  - Preserve CA-grade reconciliation dialog.
  - Verify with `tsc --noEmit`.
- [ ] Reviewer, Challenger & Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 6: Full CRM Suite & Route Wiring (`src/pages/crm/*` & `src/App.tsx`)
- [ ] Worker:
  - Fix missing `Award` import in `CRMDashboard.tsx:161`.
  - Fix route in `src/App.tsx:247` to map `ROUTE_PATHS.crmSalary` to `<SalaryManagement />`.
  - Implement dedicated clean high-density views for `/crm/tasks`, `/crm/broadcasts`, `/crm/meet`, `/crm/ai`, and `/crm/support`.
  - Align Attendance and RoleManagement with high-density hairline aesthetic and mobile accordions.
  - Verify with `tsc --noEmit` and `crm` test suites.
- [ ] Reviewer, Challenger & Forensic Auditor check.
- [ ] Milestone Gate.

### Milestone 7: Final E2E Verification & Invoice Flow Invariance
- [ ] Verify zero modifications in protected files:
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
  - `src/components/SalesInvoiceModal.tsx`
  - `src/components/invoices/mobile/AddItemModal.tsx`
  - `src/components/invoices/mobile/SelectPartyModal.tsx`
  - `src/components/invoices/mobile/EditItemModal.tsx`
- [ ] Full TypeScript validation: `node node_modules/typescript/bin/tsc --noEmit`.
- [ ] Run complete Vitest suite across billing, mobile dashboard, CRM, and network invoicing.
- [ ] Synthesize and report completion to Sentinel.
