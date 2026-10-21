# Project: CredSmart Core Application High-Density Redesign

## Architecture
- **Design Standard**: Clean, high-density Stripe/Linear aesthetic with hairline borders (`border border-slate-200/80 dark:border-slate-800`), flat surfaces (`bg-white dark:bg-slate-900`), crisp monospaced tabular numerals (`font-mono tabular-nums`), micro-dot status pills, and zero wasted whitespace.
- **Responsive Architecture**:
  - Desktop (≥ 768px): High-density tables (36–40px rows), sticky subtle-gray headers, compact action icons.
  - Mobile (< 768px): Dedicated touch card stream (`block md:hidden`), ≥ 44×44px hit targets, bottom thumb-zone actions, safe-area inset padding, zero horizontal scroll overflow.
- **Protection Architecture**:
  - Strict preservation of Create Invoice flow: `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx` remain 100% untouched. External pages interface with `SalesInvoiceModal` strictly via controlled boolean props.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Metric Grid Redesign | High-contrast 2x2 grid for TO COLLECT, TO PAY, CASH & BANK, TODAY'S SALES with tabular rupee figures | M1 | R1, Survey 1 |
| 2 | Dismissible Tally Banner | Compact, hairline banner with close button and 1-tap scan action | M1 | R1, Survey 1 |
| 3 | Quick Action Bar | Sleek pills for + Sale Bill, + New Item, + Customer, Day Book | M1 | R1, Survey 1 |
| 4 | Recent Activity Feed | High-density transaction rows with party initials, invoice #, date, status pill, and bold amount | M1 | R1, Survey 1 |
| 5 | Sales Desktop Table | 36px high-density data table with sortable columns, date filter, status tabs, inline actions | M2 | R2, Survey 1 |
| 6 | Sales Mobile Cards | Touch card stream with bold amounts, clickable status pills, and action sheets | M2 | R2, Survey 1 |
| 7 | Sales Invoice Modal Trigger | Preserved boolean state trigger to SalesInvoiceModal with zero internal changes | M2 | R2, R7, Survey 3 |
| 8 | Purchases Bills Table | High-density table on desktop and compact cards on mobile with supplier, bill #, date, status | M3 | R3, Survey 1 |
| 9 | Purchases B2B Auto-Sync | Sleek hairline PendingInwardBanner wired to network invoicing | M3 | R3, Survey 1 |
| 10 | Items Inventory Table | Crisp product rows with SKU, barcode, stock status badges (In Stock, Low Stock, Out of Stock) | M4 | R4, Survey 1 |
| 11 | Items Quick Stock Drawer | In-place stock adjustment drawer and category filter chips | M4 | R4, Survey 1 |
| 12 | Parties Directional Balances | Clear visual distinction between Receivables ("To Collect" emerald) and Payables ("To Pay" rose) | M5 | R5, Survey 1 |
| 13 | Parties Communication Actions | 1-tap WhatsApp and phone call triggers on party rows/cards | M5 | R5, Survey 1 |
| 14 | CRMDashboard Award Bug Fix | Import `Award` from `lucide-react` in `CRMDashboard.tsx:161` | M6 | R6, Survey 2, 3 |
| 15 | App.tsx Salary Route Fix | Map `ROUTE_PATHS.crmSalary` to `<SalaryManagement />` at line 247 | M6 | R6, Survey 2, 3 |
| 16 | Dedicated CRM Submodules | Build dedicated high-density views for Tasks, Broadcasts, Meet, AI Assistant, Support | M6 | R6, Survey 2 |
| 17 | Attendance & Roles Styling | Refine Attendance clock-in pod and RoleManagement permission matrix for mobile/desktop | M6 | R6, Survey 2 |
| 18 | Protected Invoicing Preservation | Verify 0 lines changed in MobileCreateInvoice, SalesInvoiceModal, AddItemModal, SelectPartyModal, EditItemModal | M7 | R7, Survey 3 |
| 19 | Static Type Check Verification | `node node_modules/typescript/bin/tsc --noEmit` exits with code 0 | M7 | Acceptance Criteria, Survey 3 |
| 20 | Test Suite Regressions Check | Run all Vitest suites (mobile dashboard, invoice success, billing lifecycle, CRM) | M7 | Acceptance Criteria, Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| Survey | Survey & Codebase Mapping | Complete codebase audit of ERP, CRM, and Test baselines | None | DONE |
| M1 | Executive ERP Dashboard | `src/pages/Dashboard.tsx` | Survey | DONE |
| M2 | Sales & Invoicing Hub | `src/pages/Sales.tsx` | M1 | DONE |
| M3 | Purchases & Supplier Ledger | `src/pages/Purchases.tsx` | M1 | DONE |
| M4 | Items & Inventory Catalog | `src/pages/Items.tsx` | M1 | DONE |
| M5 | Parties Directory & Balances | `src/pages/Parties.tsx` | M1 | DONE |
| M6 | Full CRM Suite & Routes | `src/pages/crm/*`, `src/App.tsx` | Survey | DONE |
| M7 | Final Hardening & Verification | All test suites, TypeScript validation, R7 invariant check | M1-M6 | DONE |

## Interface Contracts
### Dashboard / Sales ↔ SalesInvoiceModal
- Interface: `<SalesInvoiceModal open={isOpen} onOpenChange={setIsOpen} orgId={orgId} onSaved={onRefresh} />`
- Contract: Triggered purely via boolean state setter; ZERO internal modifications to modal or its child components.

### Code Layout
- `src/pages/Dashboard.tsx` — Executive ERP Dashboard
- `src/pages/Sales.tsx` — Sales transactions hub
- `src/pages/Purchases.tsx` — Purchases and supplier ledger
- `src/pages/Items.tsx` — Products and inventory catalog
- `src/pages/Parties.tsx` — Customers and suppliers directory
- `src/pages/crm/` — CRM Suite pages (CRMDashboard, Attendance, RoleManagement, SalaryManagement, Tasks, Broadcasts, Meet, AIAssistant, Support)
- `src/App.tsx` — Global route registration
- `src/components/invoices/mobile/` & `src/components/SalesInvoiceModal.tsx` — **PROTECTED PERIMETER (READ-ONLY)**
