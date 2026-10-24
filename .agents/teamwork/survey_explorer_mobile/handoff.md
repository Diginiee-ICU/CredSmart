# Handoff Report: Mobile Ergonomics & Protected Routes Audit

**Author**: Mobile Ergonomics & Protected Routes Explorer (`survey_explorer_mobile`)  
**Date**: 2026-10-24T19:10:00Z  
**Parent Orchestrator**: `3044c8ce-523a-4157-917d-31b6f5d55c6a`  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_mobile`

---

## 1. Observation

### 1.1 Mobile Bottom Navigation Dock (`AppSidebar.tsx` & `AppLayout.tsx`)
- **File**: `src/components/AppSidebar.tsx` (lines 256–507)
  - Dock Container:
    ```tsx
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
      aria-label="Mobile Bottom Navigation"
    >
    ```
  - Destination 1: `Home` (`ROUTE_PATHS.dashboard`) — active styling uses Amber (`text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-500/15 border-amber-300`).
  - Destination 2: `Sales` (`ROUTE_PATHS.sales`) — active styling uses Indigo (`text-indigo-600 dark:text-indigo-400 bg-indigo-50 border-indigo-200`).
  - Destination 3: `POS Billing` (`ROUTE_PATHS.checkout`) — elevated CTA:
    ```tsx
    <div
      className={cn(
        "w-[52px] h-[52px] rounded-2xl flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-xl transition-all duration-200",
        isPosActive
          ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-amber-500/30 scale-105"
          : "bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-500/30 hover:scale-105"
      )}
    >
      <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
    </div>
    ```
    Button is `52x52px` with skeuomorphic gradient (`from-indigo-600 via-indigo-500 to-purple-600`) and `-mt-5` offset.
  - Destination 4: `Items` (`ROUTE_PATHS.items`) — active styling uses Emerald (`text-emerald-600 border-emerald-200`).
  - Destination 5: `Purchases` (`ROUTE_PATHS.purchases`) — lines 482–504:
    ```tsx
    {/* POS & Billing Tab 5: Purchases */}
    <NavLink to={ROUTE_PATHS.purchases} className={...}>
      ...
      <Truck className="w-5 h-5 stroke-[2.2]" />
      <span className="text-[10px] tracking-tight">Purchases</span>
    </NavLink>
    ```
- **Layout Clearance Spacer**: `src/components/AppLayout.tsx` (lines 1013–1019):
  ```tsx
  {!isPosRoute && (
    <div
      className="block md:hidden shrink-0 w-full pointer-events-none select-none"
      style={{ height: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
      aria-hidden="true"
    />
  )}
  ```

### 1.2 Swipeable Action Strip Below Header
- **File**: `src/pages/Dashboard.tsx` (lines 820–871)
  - Quick action strip rendered:
    ```tsx
    <div className="space-y-1.5">
      <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 px-0.5">
        QUICK ACTIONS
      </span>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none select-none -mx-0.5 px-0.5 touch-pan-x">
        <button type="button" onClick={() => setShowSalesInvoiceModal(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-transform cursor-pointer touch-manipulation">
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Sale Bill</span>
        </button>
        <button type="button" onClick={() => navigate(ROUTE_PATHS.checkout)} className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black shrink-0 shadow-xs active:scale-95 transition-transform cursor-pointer touch-manipulation">
          <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ POS Billing</span>
        </button>
        <button type="button" onClick={() => setShowCreateItemModal(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer touch-manipulation">
          <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>+ Item</span>
        </button>
        <button type="button" onClick={() => setShowCreatePartyModal(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer touch-manipulation">
          <Users2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>+ Customer</span>
        </button>
        <button type="button" onClick={() => navigate(ROUTE_PATHS.sales)} className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer touch-manipulation">
          <span className="text-xs leading-none">📊</span>
          <span>Day Book</span>
        </button>
      </div>
    </div>
    ```
  - Position: Currently positioned **below** the 2x2 financial metrics grid (lines 702–818) and below the Tally banner (lines 652–700). In the mobile mockup (`credsmart_mobile_app_mockup_1792867057837.jpg`), the action strip is positioned **directly beneath the top header**, before the 2x2 metric cards.
  - Absence in other pages: `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, and `Parties.tsx` currently do not feature this swipeable horizontal chip strip below the header.

### 1.3 Mobile Responsive Data Cards Replacing Table Scroll
- **`src/pages/Dashboard.tsx`** (lines 893–950):
  - Renders `latestTransactions.slice(0, 5)` inside `space-y-2` with `min-h-[56px]`. Displays party initial avatar square (`WC` / initials), transaction number, date, amount, and micro-dot status badge (`PAID`, `PENDING`, etc.).
  - 4 cards fit cleanly on screen above dock.
- **`src/pages/Sales.tsx`** (lines 941–1180):
  - Has dedicated mobile block: `<div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-3 pb-36 space-y-2.5 scrollbar-thin overscroll-y-contain">`
  - Cards contain document number, status badge toggle button (`min-h-[44px] min-w-[44px]`), grand total (`₹ ...`), party name, docDate, due in text, and 4 action buttons (`w-11 h-11 min-w-[44px] min-h-[44px]`).
- **`src/pages/Purchases.tsx`** (lines 871–950):
  - Has mobile block: `<div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 space-y-2.5 scrollbar-thin overscroll-y-contain">`
  - Cards contain voucher number, status badge, grand total, supplier name, date, due text, and Pay Now / quick action buttons.
- **`src/pages/Items.tsx`** (lines 1019–1140):
  - Has mobile block: `<div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-2 scrollbar-thin overscroll-y-contain">`
  - Cards contain product image/icon, name, brand/category, stock level badge (0 Stock, Low Stock, Normal), selling price, MRP, cost price, and stock adjust trigger.
- **`src/pages/Parties.tsx`** (lines 1199–1340):
  - Has mobile block: `<div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">`
  - Cards contain initial avatar, party name, category, location, party type, directional balance badge (Dr `To Collect` / Cr `To Pay`), Call and WhatsApp quick action triggers.

### 1.4 Modal Dialogs and Bottom-Sheet Drawers
- **`src/components/ui/dialog.tsx`** (line 82):
  ```tsx
  className={cn(
    "fixed left-[50%] top-[50%] z-modal grid w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto scrollbar-thin translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl duration-200 ...",
    className,
  )}
  ```
  Centers dialog on mobile with `translate-x-[-50%] translate-y-[-50%]`.
- **`src/components/items/CreateItemModal.tsx`** (line 333):
  ```tsx
  className="bg-card w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl"
  ```
  Takes 100dvh full viewport with `rounded-none`.
- **`src/components/parties/CreatePartyModal.tsx`** (line 626):
  ```tsx
  className="bg-card w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl"
  ```
  Also takes 100dvh full viewport with `rounded-none`.
- **`src/components/ui/drawer.tsx`**:
  Installed (`vaul`), but unused by feature modals.

### 1.5 Strict Write Boundary Audit & Protected File Inventory
The Create Invoice workflow is a highly complex, multi-modal billing system containing GST calculation engines, dual-footer actions, WhatsApp share URL generation, offline persistence, and single-page vector PDF generation.
Inspected the invocation tree:
- `src/components/SalesInvoiceModal.tsx` line 1593:
  Switches directly to `<MobileCreateInvoice ... />` on mobile screens (`< 1024px` / mobile detection).
- `src/components/invoices/mobile/MobileCreateInvoice.tsx`:
  Imports and launches `SelectPartyModal`, `AddItemModal`, `EditItemModal`, `MobileBillPreviewModal`, and `CreateNewItemModal`.
- On save completion:
  Transitions to `<MobileInvoiceSuccessView ... />` (lines 1515–1590 in `SalesInvoiceModal.tsx`), supporting in-place update on edit, Save & New sequence incrementing, confirmed deletion, and WhatsApp direct sharing.

### 1.6 Existing Test Assertions
- In `src/test/mobileErgonomicsChallenger.test.ts` (lines 71–83):
  - Tests require: `expect(dockCode).toMatch(/w-\[52px\]\s+h-\[52px\]/);`
  - Tests require: `minH44Count >= 4`
- In `src/test/mobileTouchErgonomicsRemediation.test.ts`:
  - Requires `min-w-[44px] min-h-[44px]` for action buttons in Sales, Purchases, Items, Parties.

---

## 2. Logic Chain

```
[Observation 1.1: AppSidebar.tsx lines 482-504 renders Purchases as Tab 5]
  +
[Observation 1.1: Mockup credsmart_mobile_app_mockup_1792867057837.jpg shows Home, Sales, +POS, Items, Parties]
  +
[Requirement R3 in ORIGINAL_REQUEST.md: "5 primary destinations (Home, Sales, Center Elevated + POS/Bill button, Items, Parties)"]
  ──> Step 1: Destination 5 in AppSidebar.tsx must be refactored from Purchases to Parties (ROUTE_PATHS.parties).

[Observation 1.1: Elevated CTA button is w-[52px] h-[52px] with rainbow gradients from-indigo-600 via-indigo-500 to-purple-600]
  +
[Requirement R1 & R3: "Center mobile elevated CTA: 46x46px rounded-xl (not oversized)" and single royal blue #2563EB accent]
  ──> Step 2: Elevated center CTA must be standardized to 46x46px (or ergonomic pill matching mockup) with solid royal blue bg-blue-600, eliminating skeuomorphic multi-color gradients.

[Observation 1.2: Action strip in Dashboard.tsx is rendered below the 2x2 metrics grid and below Tally banner]
  +
[Mockup credsmart_mobile_app_mockup_1792867057837.jpg: Action strip sits immediately below top store header]
  ──> Step 3: Action strip in Dashboard.tsx must be moved up to sit directly below header, above financial overview cards.

[Observation 1.4: Modals currently render as full-screen rounded-none 100dvh or centered floating dialogs]
  +
[Requirement R3: "Full-Screen Bottom-Sheet Drawers: max-h-[92dvh] rounded-t-2xl overflow-y-auto with fixed bottom confirmation bars"]
  ──> Step 4: Refactor modal presentation on mobile to use smooth bottom-sheet drawer classes (max-h-[92dvh] rounded-t-2xl) with top pull handle and sticky bottom confirmation bar.

[Observation 1.5: 19 core files implement mobile invoice creation, editing, recalculations, and PDF output]
  +
[Requirement R5 & Zero Regression Rule: Strictly preserve GST engines, tax math, routes, real-time sync, and PDF pipeline]
  ──> Step 5: All 19 invoice files must be quarantined in a Protected File Inventory with a strict NO-EDIT policy during Minimal Redesign.
```

---

## 3. Caveats

1. **Test Assertion Synchronization**: `src/test/mobileErgonomicsChallenger.test.ts` line 81 hard-codes a regex check for `w-[52px] h-[52px]` on the elevated center button. When Milestone 3 refactors this button to `46x46px` (e.g., `w-[46px] h-[46px]`), this test assertion will fail unless updated synchronously with the code change.
2. **Tab 5 Test Scope**: The test `mobileErgonomicsChallenger.test.ts` checks for `minH44Count >= 4` and mentions `Purchases` in a comment. Changing Tab 5 from `Purchases` to `Parties` maintains `>= 4` count, but any test specifically querying the "Purchases" bottom dock label must be checked.
3. **No Code Modified**: This survey is 100% read-only. No source files were modified.

---

## 4. Conclusion

### 4.1 Explicit Protected File Inventory (STRICT NO-EDIT LOCK)
Under no circumstances should any subagent or implementer alter, refactor, or delete the following 19 files:

| # | Protected File Path | Purpose / Critical Functionality |
|---|---------------------|-----------------------------------|
| 1 | `src/components/invoices/mobile/MobileCreateInvoice.tsx` | Touch-first mobile invoice creation form, item rows, discounts, round-off, charges |
| 2 | `src/components/invoices/mobile/AddItemModal.tsx` | Mobile barcode/search item selector for invoice rows |
| 3 | `src/components/invoices/mobile/SelectPartyModal.tsx` | Mobile party/customer selector with cached network lookup |
| 4 | `src/components/invoices/mobile/EditItemModal.tsx` | Inclusive/exclusive GST tax engine, discount % vs amount, line recalculations |
| 5 | `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` | Circular actions, in-place re-edit loop, Save & New sequence bump, WhatsApp sharing |
| 6 | `src/components/invoices/mobile/MobileBillPreviewModal.tsx` | Live bottom sheet bill preview before generation |
| 7 | `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx` | Mobile single-page invoice renderer |
| 8 | `src/components/invoices/mobile/CreatePartyModal.tsx` | In-line quick party creation modal for mobile invoicing |
| 9 | `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx` | Mobile purchase bill creation form |
| 10 | `src/components/items/mobile/CreateNewItemModal.tsx` | Mobile product/service creation modal from invoice item selection |
| 11 | `src/components/SalesInvoiceModal.tsx` | Master invoice modal switching desktop/mobile, orchestrating database transactions |
| 12 | `src/components/PurchaseInvoiceModal.tsx` | Master purchase modal orchestrating purchase documents |
| 13 | `src/components/invoices/AddItemsToBillModal.tsx` | Desktop & tablet catalog selector |
| 14 | `src/components/invoices/InvoiceFitView.tsx` | Desktop single-page invoice preview |
| 15 | `src/components/invoices/UnifiedInvoiceRenderer.tsx` | Authoritative tax invoice print/preview layout engine |
| 16 | `src/utils/downloadExactInvoice.ts` | Single-page A4 PDF rasterization and download pipeline |
| 17 | `src/utils/whatsappPdfShare.ts` | WhatsApp document sharing and text serialization |
| 18 | `src/utils/invoiceThemeLoader.ts` | Invoice brand styling and theme persistence |
| 19 | `src/services/documentsService.ts` | Database CRUD, in-place document updates, financial metrics computation |

---

### 4.2 Blueprint for Milestone 3 (Mobile Ergonomics & Bottom Dock)

#### Task 3.1: Bottom Navigation Dock Redesign (`src/components/AppSidebar.tsx`)
1. **Change Tab 5**:
   - Replace `Purchases` (`ROUTE_PATHS.purchases`) with `Parties` (`ROUTE_PATHS.parties`).
   - Use `Users2` or `Users` icon with label `Parties`.
   - Update active route check: `isPartiesActive = isRouteActive(ROUTE_PATHS.parties) || isRouteActive(ROUTE_PATHS.customers);`
2. **Redesign Center Elevated CTA**:
   - Replace `w-[52px] h-[52px]` with `w-[46px] h-[46px] rounded-xl` or horizontal squircle pill matching mockup.
   - Styling: Solid royal blue (`bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95`).
   - Eliminate multi-color gradient (`from-indigo-600 via-indigo-500 to-purple-600` / amber).
3. **Unify Status & Active Color Tokens**:
   - Replace rainbow active colors (Amber, Indigo, Emerald, Rose) with single royal blue accent (`text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30`).
   - Inactive color: Clean `text-slate-400 hover:text-slate-600 dark:hover:text-slate-300`.
4. **Preserve Touch Standards**:
   - Ensure all 5 tabs maintain `min-h-[44px]` and `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`.

#### Task 3.2: Mobile Swipeable Action Strip Polish (`src/pages/Dashboard.tsx`)
1. Re-position action strip directly below the top store greeting header, above the 2x2 metric cards.
2. Standardize chips to clean pills with hairline borders:
   - `+ Sale Bill`: Royal blue filled pill (`bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] px-3.5 rounded-full text-xs font-semibold shadow-2xs`).
   - `+ POS Billing`, `+ Item`, `+ Customer`, `Day Book`: Neutral outlined pills (`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 min-h-[44px] px-3.5 rounded-full text-xs font-semibold shadow-2xs`).

#### Task 3.3: Mobile Bottom-Sheet Drawer Primitive (`src/components/ui/dialog.tsx` or new `BottomSheetDrawer`)
1. Provide responsive modal styling:
   - Mobile (< 768px): Docked to bottom, `max-h-[92dvh] rounded-t-2xl rounded-b-none w-full bottom-0 top-auto translate-x-0 translate-y-0`.
   - Top indicator handle: `w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-2`.
   - Fixed confirmation footer: `sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]`.
2. Refactor non-protected modals (`CreateItemModal.tsx`, `CreatePartyModal.tsx`) from full-screen `h-[100dvh] rounded-none` to smooth `max-h-[92dvh] rounded-t-2xl` bottom sheets.

---

### 4.3 Blueprint for Milestone 4 (Mobile Card Stream Polish)
1. **Data Density & Card Height**:
   - Standardize transaction and catalog cards across `Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx` to `p-3` or `p-3.5`, fitting 4–5 cards per standard mobile screen (390px - 430px).
2. **Typography Scale**:
   - Party/Item title: `text-xs font-bold text-slate-900 dark:text-white`.
   - Currency amounts: `font-mono tabular-nums text-xs font-bold` (using `'IBM Plex Mono'`).
   - Micro badges: `text-[10px]` or `text-[11px]` (font-medium or font-semibold).
3. **Micro-Dot Status Badges**:
   - Replace heavy badges with subtle micro-dots:
     - Paid / In Stock: `bg-emerald-50 text-emerald-700 border-emerald-200/80` with emerald dot.
     - Due / Low Stock: `bg-amber-50 text-amber-700 border-amber-200/80` with amber dot.
     - Overdue / Out of Stock: `bg-rose-50 text-rose-700 border-rose-200/80` with rose dot.
4. **Zero Micro-Prose**:
   - Eliminate redundant text like "Outstanding customer credit ledger balance".

---

## 5. Verification Method

### 5.1 Independent Code Inspection
Verify following line references and properties:
- `src/components/AppSidebar.tsx:482` — Tab 5 points to `ROUTE_PATHS.purchases` (pending change to `ROUTE_PATHS.parties`).
- `src/components/AppSidebar.tsx:433` — Center button has `w-[52px] h-[52px]` and gradient.
- `src/pages/Dashboard.tsx:820` — Action strip sits at line 820 below metrics grid.
- `src/components/SalesInvoiceModal.tsx:1593` — Invoices mobile view is quarantined in `MobileCreateInvoice`.

### 5.2 Automated Test Execution
Run existing mobile test suites:
```bash
npx vitest run src/test/mobileErgonomicsChallenger.test.ts
npx vitest run src/test/mobileTouchErgonomicsRemediation.test.ts
npx vitest run src/test/mobileDashboardRedesign.test.tsx
```

### 5.3 TypeScript & Build Integrity
```bash
npm run build
```
Must pass with 0 errors.

### 5.4 Invalidation Conditions
This handoff report is invalidated if:
1. Tab 5 in bottom dock is changed to an entity other than `Parties` (`ROUTE_PATHS.parties`).
2. Any file in the Protected File Inventory (Table 4.1) is modified during Milestones 1–5.
3. Center elevated CTA button size or touch target is changed without synchronizing test assertions in `mobileErgonomicsChallenger.test.ts`.
