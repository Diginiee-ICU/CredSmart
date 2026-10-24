## 2026-10-24T20:42:42Z
[Message from Orchestrator: Milestone 4 (Core Application Pages Overhaul) Dispatch]

# DISPATCH — Worker (Milestone 4: Core Application Pages Overhaul)

## Identity
- Role: Core Application Pages Overhaul Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING (ZERO TOLERANCE)
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Authoritative References
- Authoritative User Request: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Master Skill Specification: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`.
- Explorer 1 Report (Dashboard, Sales, Purchases): `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\handoff.md`.
- Explorer 2 Report (Catalog & Ledgers): `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\handoff.md`.
- Explorer 3 Report (CRM & Cross-Page Tokens): `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md`.

---

## STRICT QUARANTINE NOTICE (DO NOT TOUCH)
Under NO circumstances edit, format, or modify any of the following 19 quarantined protected files:
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

---

## Detailed Implementation Tasks

### 1. Dashboard (`src/pages/Dashboard.tsx`)
- **Move Quick Actions Strip**: Move the horizontal swipeable action strip from line ~820 up to sit directly beneath the store greeting header (and optional dismissible Tally banner), *before* the 2x2 Financial Overview Grid.
- **De-clutter KPI Cards**: Strip the 4 redundant micro-prose descriptions (lines 1010, 1038, 1066, 1094: "Outstanding customer credit ledger balance.", etc.). Replace top multi-color gradients (`bg-gradient-to-r ...`) with crisp hairline solid accents (`h-[2px] bg-blue-600`, `bg-amber-500`, `bg-emerald-500`, `bg-rose-500`). Set card padding to `p-3.5`.
- **Chart Tooltip & Action Palette**: Replace glassmorphic `backdrop-blur-xl shadow-2xl` tooltip (line 359) with clean solid tooltip (`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-lg p-2.5`). Change `+ Sale Bill` and empty-state buttons to Royal Blue `bg-blue-600 hover:bg-blue-700 text-white`.
- **Sub-11px Fonts**: Elevate all `text-[9px]` and `text-[10px]` to `text-[11px]`.

### 2. Sales & Purchases Ledgers (`src/pages/Sales.tsx`, `src/pages/Purchases.tsx`)
- **Screen-Fitted Desktop Table Containment**:
  Decouple table from pagination footer. Wrap desktop table in:
  ```tsx
  <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-hidden">
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin">
      <table className="w-full text-left text-xs border-collapse min-w-[640px]">
        <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 z-10">
          ...
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          ...
        </tbody>
      </table>
    </div>
    <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
      <PaginationBar ... />
    </div>
  </div>
  ```
- **Mobile Card Ergonomics**: Compress sprawling ~140px cards to ~60px high-density cards displaying 4-5 items per viewport with consolidated 3-dots touch trigger.
- **KPI De-Cluttering**: Strip micro-prose from all KPI cards.
- **Button Standards**: Standard action `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs bg-blue-600 hover:bg-blue-700 text-white`; micro icons `w-7.5 h-7.5 rounded-md`; table actions `h-7 px-2.5 rounded-md text-[11px] font-medium`.
- **Sub-11px Fonts**: Elevate all micro-fonts to `text-[11px]`.

### 3. Items & Inventory (`src/pages/Items.tsx`, `src/pages/Inventory.tsx`)
- **`Inventory.tsx` Screen-Fitted Container**: Replace unbounded `w-full max-w-[1400px] mx-auto px-4 py-6` with `h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50`. Wrap table in `flex-1 min-h-0` with sticky thead and pinned footer. Compact table rows from `px-5 py-4` to `px-3 py-2.5` (38-42px row height). Ensure inline Excel edit inputs fit compactly (`h-7 px-2 text-xs font-mono`).
- **Purge Skeuomorphism**: Replace all `glass-card-3d` with glowing halos (`shadow-[0_0_8px_...]`) with clean hairline cards (`border-slate-200/80 dark:border-slate-800 shadow-2xs`).
- **Stock Badges & Fonts**: Standardize stock badges (In Stock: Emerald, Low Stock: Amber, Out of Stock: Rose) to `text-[11px] font-semibold font-mono`. Elevate sub-11px text in `Items.tsx` to `text-[11px]`.

### 4. Parties, Customers & Suppliers (`src/pages/Parties.tsx`, `src/pages/Customers.tsx`, `src/pages/Suppliers.tsx`)
- **`Customers.tsx` & `Suppliers.tsx` Screen-Fitted Container**: Replace unbounded long page scroll with screen-fitted container `h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50`.
- **Purge Glowing Buttons & Glass**: Replace `glowing-btn-amber` and `glass-card-3d` with standard Royal Blue action buttons (`bg-blue-600 hover:bg-blue-700`) and hairline cards.
- **Udhar Khata Directional Badges**: Emerald for "To Collect (Dr)", Rose for "To Pay (Cr)" with `font-mono tabular-nums`. Elevate all `text-[8.5px]`, `text-[9px]`, `text-[9.5px]` to `text-[11px]`.

### 5. Cash & Bank & Expenses (`src/pages/CashAndBank.tsx`, `src/pages/Expenses.tsx`)
- **Color Palette Alignment**: Replace all hardcoded `#5046E5` / `#EEF0FD` / `#4338CA` with master Royal Blue tokens (`bg-blue-600`, `text-blue-600`, `border-blue-600`, `bg-blue-50 dark:bg-blue-950/40`, `hover:bg-blue-700`).
- **Purge Skeuomorphism**: Replace `glass-card-3d`, `backdrop-blur-xl`, and `glowing-btn-amber` with hairline surfaces and standard action buttons.
- **Tabular Monospace**: Apply `font-mono tabular-nums` to all transaction amounts and liquidity figures.

### 6. CRM Portal & Shared CRM Components
- **`src/components/crm/CRMBadge.tsx` & `CRMRolePill.tsx`**: Upgrade `sizeStyles.sm` / `sizeClasses.sm` to `text-[11px] font-semibold`. Reconcile navy `#1D4ED8` to Royal Blue `#2563EB`.
- **`src/components/crm/CRMCard.tsx` & `CRMStatCard.tsx`**: Standardize radius to `rounded-xl`, replace glass variant with hairline surface, standardize `CRM_BRAND_COLORS.blue` to `#2563EB`.
- **`src/pages/crm/Attendance.tsx`**: Refactor bloated `h-14 rounded-2xl` clock-in/out buttons with glowing shadows to refined 44px/46px touch CTA buttons with `rounded-xl font-bold text-sm shadow-sm active:scale-[0.98]`.
  - **CRITICAL INVARIANT**: Preserve `data-testid="attendance-role-filter"` on the SelectTrigger for role filtering!
- **`src/pages/crm/SalaryManagement.tsx`**:
  - **CRITICAL INVARIANT**: Add `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>` to the header badge (asserted by `src/test/crmSalaryManagement.test.tsx:482`)!
  - Add `tabular-nums` to wage figures.
- **`src/pages/crm/Broadcasts.tsx`**:
  - **CRITICAL INVARIANT**: Add `<CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>` to the header badge (asserted by `src/test/crmSubmodules.test.tsx:97`)!
- **`src/pages/crm/Tasks.tsx`**:
  - **CRITICAL INVARIANT**: Keep `min-h-[44px] h-11 px-3 flex items-center` for "Start Job →", "Submit Proof", "Approve ✓" (asserted by `mobileTouchErgonomicsRemediation.test.ts:111-113`)!
  - Upgrade sub-11px micro-fonts to `text-[11px]`.
- **`src/pages/crm/CRMDashboard.tsx`**: Standardize action buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white shadow-2xs`.
- **Cross-page cleanup**: Purge lingering `glowing-btn-amber`, `glowing-btn-blue`, and `backdrop-blur-xl bg-white/70` across application pages.

---

## Verification Requirements (Run & Document in handoff.md)
1. `cmd /c npx tsc --noEmit` (Must exit code 0, 0 errors).
2. `cmd /c npx eslint src/pages/Dashboard.tsx src/pages/Sales.tsx src/pages/Purchases.tsx src/pages/Items.tsx src/pages/Inventory.tsx src/pages/Parties.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/CashAndBank.tsx src/pages/Expenses.tsx src/pages/crm/Attendance.tsx src/pages/crm/CRMDashboard.tsx src/pages/crm/Tasks.tsx src/pages/crm/SalaryManagement.tsx src/pages/crm/Broadcasts.tsx` (0 errors).
3. `cmd /c npx vitest run src/test/componentPrimitivesAdversarial.challenger.test.tsx src/test/mobileErgonomicsChallenger.test.ts src/test/mobileTouchErgonomicsRemediation.test.ts src/test/billingLifecycleEngine.test.ts src/test/crmSubmodules.test.tsx src/test/crmSalaryManagement.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx` (All tests must pass 100%).
4. Verify 19 quarantined protected files have 0 diff lines (`git diff HEAD -- <quarantined-file>`).

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\handoff.md` and notify orchestrator (`3044c8ce-523a-4157-917d-31b6f5d55c6a`) via `send_message`.
