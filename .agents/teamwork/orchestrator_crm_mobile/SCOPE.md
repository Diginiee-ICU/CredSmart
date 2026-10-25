# Scope: CredSmart CRM Mobile Redesign

## Architecture
- **Dual-Layout Containment**:
  - Desktop Viewports (>= 768px): Encapsulated inside `<div className="hidden md:block">...</div>`. 100% byte-for-byte preserved with existing headers, cards, tables, hotkeys, and actions.
  - Mobile Viewports (< 768px): Encapsulated inside `<div className="block md:hidden">...</div>`. Custom touch-optimized layouts conforming strictly to Mockups 1, 2, 3, and 4.
- **Shared State & Business Logic**:
  - React hooks, Supabase queries, real-time subscriptions, geolocation engines (`crmGeoUtils.ts`), timers (`setInterval`), mutation handlers, and dialog drawers shared seamlessly between desktop and mobile.
- **Design System Rules**:
  - Inter typography, IBM Plex Mono (`tabular-nums`) for currency, numbers, dates, and clocks.
  - Sizing: Standard button 34px (`h-8.5`), small/table 28px (`h-7`), micro icon 30px (`w-7.5 h-7.5`), mobile CTA 46px (`min-h-[44px]`).
  - Colors: Neutral canvas `#F8FAFC` light / `#090D16` dark; Royal Blue `#2563EB` primary action; Emerald `#10B981` success/clock-in; Amber/Orange `#FF6A00` or `#F59E0B` for clock-out/create-task/overdue.
  - Zero bloated buttons (`h-11`/`h-12`/`rounded-3xl` eliminated).
  - Zero nested boxy cards: List rows use clean `divide-y divide-slate-100 dark:divide-slate-800/60` containers.
- **Protected File Quarantine**:
  - All 19 invoice creation and document lifecycle files remain 100% untouched and unimported.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Payroll Engine Mobile Header | Large bold "Payroll Engine", subtitle, Royal Blue `+ New Profile` CTA, export `[ ⎋ ]` icon button | M1 | ORIGINAL_REQUEST §R1 & Survey 1 |
| 2 | Payroll Engine 2x2 Stat Badges | Compact horizontal pill badges with subtle colored icon containers (`Active Profiles >`, `Current Month`, `Pending Advances >`, `Available Payslips`) | M1 | ORIGINAL_REQUEST §R1 & Survey 1 |
| 3 | Payroll Engine Segmented Tab Bar | Inset pill switcher (`Salary Profiles (N)`, `Payroll Run`, `Advances & Deductions`) | M1 | ORIGINAL_REQUEST §R1 & Survey 1 |
| 4 | Payroll Engine Empty State Card | Clean white card (`rounded-2xl border border-slate-200/80 shadow-xs text-center p-8`) with vector illustration & prompt | M1 | ORIGINAL_REQUEST §R1 & Survey 1 |
| 5 | Payroll Engine Mobile List Rows & Quick Links | Flat `divide-y divide-slate-100` rows without `h-11` bloated buttons, dual pill buttons `[ 📋 View Past Runs ]` and `[ ⚙️ Pay Settings ]` | M1 | ORIGINAL_REQUEST §R1 & Survey 1 |
| 6 | Role Manager Mobile Header | "Role Manager", subtitle, horizontal action chips (`[ ← ]`, `[ 🛡 RBAC Foundation ]`, Royal Blue `[ + Custom Role ]`, `[ 👤+ Add User ]`) | M2 | ORIGINAL_REQUEST §R2 & Survey 1 |
| 7 | Active Role & Quick Stats Card | Crown icon `Super Admin`, `👑 Full Access` badge, `🔑 14 / 14 Actions • 👥 N Staff`, horizontal role pill selector | M2 | ORIGINAL_REQUEST §R2 & Survey 1 |
| 8 | Granular Module Permissions Matrix | Grouped accordion card with hairline row dividers (`divide-y`), module counter pill (`N / M Enabled`), chevron, and 2-column grid of compact checkbox chips | M2 | ORIGINAL_REQUEST §R2 & Survey 1 |
| 9 | Staff Role Assignments & Avatar Stream | Segmented toggle (`List View` / `Team Tree View`), search input with `[ + Add ]`, horizontal colored avatar stream (`w-10 h-10` circular badges) | M2 | ORIGINAL_REQUEST §R2 & Survey 1 |
| 10 | Attendance Hub Mobile Header & Sync Dot | "Attendance Hub", badge `🟢 Live Sync`, `[ ⎋ ]` export, subtitle, Royal Blue `[ 📍 Geofences ]` button | M3 | ORIGINAL_REQUEST §R3 & Survey 2 |
| 11 | Attendance 2x2 Stat Badges | Compact badges: `Present N >`, `Geo-Verified N >`, `Regularised N >`, `Geofences N >` | M3 | ORIGINAL_REQUEST §R3 & Survey 2 |
| 12 | Attendance Segmented Tabs | Inset pill switcher: `[ My Clock-In ]`, `[ Team Logs (N) ]`, `[ Locations ]` | M3 | ORIGINAL_REQUEST §R3 & Survey 2 |
| 13 | Attendance Shift Card & Telemetry | Orange hairline accent (`border-l-4 border-orange-500`), date pill, digital clock, radar geofence scanner widget, geofence status badge, GPS accuracy pill, full-width Emerald CTA `[ ✓ Clock In Now ]` (or Orange Clock Out + timer) | M3 | ORIGINAL_REQUEST §R3 & Survey 2 |
| 14 | Attendance Quick Links & Flat Logs | Dual pill buttons `[ 📋 View Team Logs ]` and `[ ✏️ Request Correction ]`, flat `divide-y` team logs list | M3 | ORIGINAL_REQUEST §R3 & Survey 2 |
| 15 | Task Workflows Mobile Header & Chips | "Task Workflows", filter icon `[ ☰ ]`, subtitle, status filter chips (`[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`), primary Amber/Orange CTA `[ + Create Task ]` | M4 | ORIGINAL_REQUEST §R4 & Survey 2 |
| 16 | Task Workflows 2x2 Stat Badges | `Total Tasks N`, `In Progress N`, `Pending Review N`, `Completed N` | M4 | ORIGINAL_REQUEST §R4 & Survey 2 |
| 17 | Task Search & Priority Bar | `🔍 Search tasks or assignees...`, dropdown `All Priorities ⌵` | M4 | ORIGINAL_REQUEST §R4 & Survey 2 |
| 18 | High-Density Task Stream Cards | Status Emoji Tags (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`), Priority Pill (`Urgent`, `High`, `Normal`, `Low`), bold task title, assignee avatar chip, contextual action CTA (`Start Job →`, `Submit Proof`, `Approve ✓`) | M4 | ORIGINAL_REQUEST §R4 & Survey 2 |
| 19 | Zero Regression & Desktop Preservation | 100% byte-for-byte desktop view preservation (`hidden md:block`) across all 4 files | M5 | ORIGINAL_REQUEST §R5 & Survey 1,2,3 |
| 20 | Protected Quarantine Files Lockdown | 19 protected files verified 100% untouched and unmodified | M5 | ORIGINAL_REQUEST §R5 & Survey 3 |
| 21 | Build & Production Typecheck Verification | Clean `tsc --noEmit` and `vite build` with zero errors | M5 | ORIGINAL_REQUEST §R5 & Survey 3 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Payroll Engine Mobile Redesign | `src/pages/crm/SalaryManagement.tsx` | none | PLANNED |
| M2 | Role Manager Mobile Redesign | `src/pages/crm/RoleManagement.tsx` | none | PLANNED |
| M3 | Attendance Hub Mobile Redesign | `src/pages/crm/Attendance.tsx` | none | PLANNED |
| M4 | Task Workflows Mobile Redesign | `src/pages/crm/Tasks.tsx` | none | PLANNED |
| M5 | Zero Regression & Build Verification | Build, typecheck, quarantine audit, desktop verification | M1, M2, M3, M4 | PLANNED |

---

## Code Layout & Protected Boundaries

### Exclusive Write Ownership by Milestone
- **Milestone 1**: `src/pages/crm/SalaryManagement.tsx` exclusively
- **Milestone 2**: `src/pages/crm/RoleManagement.tsx` exclusively
- **Milestone 3**: `src/pages/crm/Attendance.tsx` exclusively
- **Milestone 4**: `src/pages/crm/Tasks.tsx` exclusively
- **Milestone 5**: Read-only verification, audit, and build testing

### Protected File Inventory (STRICT NO-EDIT LOCK)
1. `src/components/invoices/mobile/MobileCreateInvoice.tsx`
2. `src/components/invoices/mobile/AddItemModal.tsx`
3. `src/components/invoices/mobile/SelectPartyModal.tsx`
4. `src/components/invoices/mobile/EditItemModal.tsx`
5. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
6. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
7. `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
8. `src/components/invoices/mobile/CreatePartyModal.tsx`
9. `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
10. `src/components/items/mobile/CreateNewItemModal.tsx`
11. `src/components/SalesInvoiceModal.tsx`
12. `src/components/PurchaseInvoiceModal.tsx`
13. `src/components/invoices/AddItemsToBillModal.tsx`
14. `src/components/invoices/InvoiceFitView.tsx`
15. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
16. `src/utils/downloadExactInvoice.ts`
17. `src/utils/whatsappPdfShare.ts`
18. `src/utils/invoiceThemeLoader.ts`
19. `src/services/documentsService.ts`
