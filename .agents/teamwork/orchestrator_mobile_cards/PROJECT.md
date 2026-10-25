# Project: CredSmart Mobile List Item Container Modernization

## Architecture
- **Objective**: Modernize mobile view list item containers across CredSmart by removing the nested box / card-in-a-card anti-pattern (`rounded-xl border shadow-2xs` floating cards inside an outer wrapper) and replacing them with clean minimal flat list rows separated by subtle hairlines (`divide-y divide-slate-100 dark:divide-slate-800/60`).
- **Target Files (9 files)**:
  1. `src/pages/crm/RoleManagement.tsx`
  2. `src/pages/crm/Tasks.tsx`
  3. `src/pages/Sales.tsx`
  4. `src/pages/Purchases.tsx`
  5. `src/pages/Items.tsx`
  6. `src/pages/Dashboard.tsx`
  7. `src/pages/Parties.tsx`
  8. `src/pages/crm/SalaryManagement.tsx`
  9. `src/pages/crm/Attendance.tsx`
- **19 Protected Quarantine Files (NEVER MODIFY)**:
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
  - `src/components/invoices/mobile/AddItemModal.tsx`
  - `src/components/invoices/mobile/SelectPartyModal.tsx`
  - `src/components/invoices/mobile/EditItemModal.tsx`
  - `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
  - `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
  - `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
  - `src/components/invoices/mobile/CreatePartyModal.tsx`
  - `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
  - `src/components/items/mobile/CreateNewItemModal.tsx`
  - `src/components/SalesInvoiceModal.tsx`
  - `src/components/PurchaseInvoiceModal.tsx`
  - `src/components/invoices/AddItemsToBillModal.tsx`
  - `src/components/invoices/InvoiceFitView.tsx`
  - `src/components/invoices/UnifiedInvoiceRenderer.tsx`
  - `src/utils/downloadExactInvoice.ts`
  - `src/utils/whatsappPdfShare.ts`
  - `src/utils/invoiceThemeLoader.ts`
  - `src/services/documentsService.ts`
- **Design Tokens & Constraints**:
  - Minimum touch target: `min-h-[44px]` on all interactive rows and action buttons.
  - Typography hierarchy: No sub-11px font sizes (`text-[11px]` minimum).
  - Dividers: `divide-y divide-slate-100 dark:divide-slate-800/60`.
  - Palette: Canvas `#F8FAFC` light / `#090D16` dark; Cards `#FFFFFF` light / `#111726` or `#0F172A` dark; Royal Blue `#2563EB` (`bg-blue-600`) accent.
  - Desktop Invariance: 100% preservation of all desktop views (`hidden md:block`, `hidden md:flex`, `hidden sm:block`, `md:grid`, tables).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | CRM Role Management Permission Rows | Modernize permission action cards to flat `px-3.5 py-3` rows in `divide-y divide-slate-100 dark:divide-slate-800/60` container on mobile, preserving desktop 2/3 column grid | M1 | Survey 1 |
| 2 | CRM Tasks Kanban Rows | Modernize Kanban column task containers on mobile to `divide-y divide-slate-100 dark:divide-slate-800/60` with flat rows, preserving desktop cards | M1 | Survey 1 |
| 3 | Sales Invoice List Modernization & Invariance | Verify and maintain unbordered outer container and flat `divide-y` rows in `Sales.tsx` | M2 | Survey 2 |
| 4 | Purchases Invoice List Modernization | Remove outer wrapper double border (line 864), convert mobile stream to `divide-y` with flat `px-3.5 py-3` rows, enforce 44px action buttons | M2 | Survey 2 |
| 5 | Items Catalog List Modernization | Remove outer wrapper double border (line 1019), convert mobile stream to `divide-y` with flat `px-3.5 py-3` rows | M2 | Survey 2 |
| 6 | Dashboard Recent Activity Modernization | Replace floating transaction cards with a single `divide-y` container and flat `px-3.5 py-3 min-h-[56px]` rows | M3 | Survey 3 |
| 7 | Parties Directory Modernization | Convert mobile party stream to `divide-y` with flat `px-3.5 py-3` rows, maintaining 44px call/WhatsApp triggers | M3 | Survey 3 |
| 8 | CRM Salary Management Rows Modernization | Convert mobile salary profiles and adjustments to `divide-y` containers with flat rows and 44px CTAs | M3 | Survey 3 |
| 9 | CRM Attendance Rows Modernization | Convert mobile regularisation requests and logs to clean `divide-y` containers with flat rows | M3 | Survey 3 |
| 10 | Comprehensive Build & Quarantine Verification | Full `tsc --noEmit`, `vite build`, git quarantine audit, touch target verification | M4 | System Spec |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | CRM Roles & Tasks Modernization | `RoleManagement.tsx`, `Tasks.tsx` | none | DONE (Verified: tsc 0, vite build 0, 2 Reviewers APPROVE, 2 Challengers APPROVE, Auditor CLEAN) |
| 2 | Core Billing & Inventory Modernization | `Sales.tsx`, `Purchases.tsx`, `Items.tsx` | M1 | IN_PROGRESS (Worker 2: c7c78ea4-29c8-4fe6-a948-0b1ac7633b9a) |
| 3 | Dashboard, Parties & CRM HR Modernization | `Dashboard.tsx`, `Parties.tsx`, `SalaryManagement.tsx`, `Attendance.tsx` | M2 | PLANNED |
| 4 | Full E2E Build, Verification & Forensic Audit | Global build, static analysis, quarantine check, audit | M3 | PLANNED |

## Interface Contracts
### Mobile Row Component Pattern
- Container:
  ```tsx
  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 overflow-hidden">
  ```
- Row:
  ```tsx
  <div className="px-3.5 py-3 min-h-[44px] flex items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
  ```
- Touch Target Guarantee:
  All interactive buttons and switch toggles must have `min-h-[44px]` (or `min-w-[44px] min-h-[44px]`).
- Typography Guarantee:
  All font size classes must be >= `text-[11px]`. Zero `text-[10px]` or below.

## Code Layout & Ownership Boundaries
- **Worker 1 (Milestone 1)**: Exclusive write ownership of:
  - `src/pages/crm/RoleManagement.tsx`
  - `src/pages/crm/Tasks.tsx`
- **Worker 2 (Milestone 2)**: Exclusive write ownership of:
  - `src/pages/Sales.tsx`
  - `src/pages/Purchases.tsx`
  - `src/pages/Items.tsx`
- **Worker 3 (Milestone 3)**: Exclusive write ownership of:
  - `src/pages/Dashboard.tsx`
  - `src/pages/Parties.tsx`
  - `src/pages/crm/SalaryManagement.tsx`
  - `src/pages/crm/Attendance.tsx`
- **Quarantine Files (All Workers)**: STRICT READ-ONLY / NEVER MODIFY.
