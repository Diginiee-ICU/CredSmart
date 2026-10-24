# Desktop Shell & Productivity Layouts Investigation & Blueprint

**Mission**: Comprehensive survey of CredSmart desktop productivity layouts (screens >= 768px), AppLayout command header, screen-fitted data tables, and POS Billing workbench.

---

## 1. Observation

### A. Top Command Header (`src/components/AppLayout.tsx`)
1. **Header Height**:
   - In `src/components/AppLayout.tsx:478`:
     ```tsx
     <header className="pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(4rem+env(safe-area-inset-top,0px))] md:h-[calc(5rem+env(safe-area-inset-top,0px))] lg:h-[calc(5.5rem+env(safe-area-inset-top,0px))] shrink-0 sticky top-0 glass-nav border-b border-slate-200 dark:border-slate-800/80 ...">
     ```
   - Current desktop height on `md` is 80px (`5rem`) and on `lg` is 88px (`5.5rem`).
   - The design system standard mandates a slim 52px command bar (`h-13`). Current header is oversized by +36px, wasting vertical monitor space.

2. **Brand Mark & Logo**:
   - In `src/components/AppLayout.tsx:487-492`:
     ```tsx
     <img
       src="/logo-static.jpeg"
       alt="CredSmart"
       className="h-7 sm:h-12 md:h-14 lg:h-15 w-auto max-w-[70px] sm:max-w-[240px] md:max-w-[300px] lg:max-w-[360px] object-contain rounded-md sm:rounded-xl drop-shadow-xs sm:drop-shadow-md"
     />
     ```
   - Displays a large static image asset scaling up to 60px height and 360px width.
   - The reference mockup (`credsmart_desktop_dashboard_1792867012395.jpg`) features a compact 28px brand mark (`h-7 w-7 rounded-lg`) accompanied by a crisp `'CredSmart'` wordmark in `Inter` font.

3. **Organization Switcher**:
   - In `src/components/AppLayout.tsx:818-841`, the store switcher is nested deeply within the user profile avatar dropdown menu at the far right.
   - In the reference mockup, the Organization Switcher is placed prominently on the top-left command strip immediately next to the brand mark as a dedicated dropdown pill (`CredSmart Business ∨`).

4. **Suite Switcher (`src/components/SuiteSwitcher.tsx`)**:
   - In `src/components/SuiteSwitcher.tsx:77-145`, buttons use saturated amber (`bg-amber-500`) and emerald (`bg-emerald-600`) fills.
   - In the reference mockup, the Suite Switcher is a calm segmented control pill: light neutral background (`bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg`), with active selection rendering as a clean white card (`bg-white dark:bg-slate-900 shadow-2xs font-semibold`) and inactive selection as subtle slate text (`text-slate-500`).

5. **Global Command Palette (`⌘K`)**:
   - In `src/components/AppLayout.tsx:544`:
     ```tsx
     <div className="hidden xl:flex items-center w-48 xl:w-64 mx-3 shrink">
     ```
   - The search bar is hidden on `md` (768px-1023px) and `lg` (1024px-1279px) screens, appearing only on `xl:` viewports.
   - In the reference mockup, the Command Palette (`🔍 Search or ⌘K`) is centered and available across all desktop viewports (`md:` and above).

6. **Primary Action ("+ New Invoice") Button**:
   - In `src/components/AppLayout.tsx:596`:
     ```tsx
     <div className="hidden sm:flex items-center h-8 sm:h-10 md:h-10.5 rounded-lg sm:rounded-xl glowing-btn-amber shadow-2xs select-none shrink-0 overflow-hidden">
     ```
   - Uses `glowing-btn-amber` with glowing orange halos, skeuomorphic hover glows, and height up to 42px (`md:h-10.5`).
   - Violates the rule against glowing neon halos and bloated buttons. The mockup specifies a compact `h-8.5 px-3 rounded-lg text-xs font-semibold` button in royal blue (`#2563EB` / `bg-blue-600`).

7. **Live Sync Status Pill**:
   - In `src/components/AppLayout.tsx:535-538`, the live sync status is bundled into the desktop page title block on the left (`<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span>SYNC LIVE</span>`).
   - In the reference mockup, the Live Sync indicator is positioned on the top-right command bar adjacent to New Invoice and Notifications: subtle emerald dot with `● Live Sync`.

8. **Skeuomorphic 3D Tilt & Bottom-Right Watermark**:
   - In `src/components/AppLayout.tsx:978, 991-1008`:
     ```tsx
     style={{ perspective: "2000px" }}
     // On sidebar open:
     transform: "translateY(3rem) scale(0.96) rotateX(3deg)"
     ```
     Applies a 3D perspective distortion to the main viewport.
   - In `src/components/AppLayout.tsx:1160-1171`:
     ```tsx
     <div className="hidden md:flex fixed bottom-4 right-6 z-40 select-none pointer-events-none ...">
       <img src="/logo-static.jpeg" className="h-10 md:h-14 lg:h-18 xl:h-20 max-w-[400px] ..." />
     ```
     A floating watermark overlays the bottom-right corner of the desktop viewport, directly obscuring data table pagination and action buttons.

---

### B. Screen-Fitted Data Tables (`Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`)

1. **Why Pages Scroll Vertically**:
   - In `src/components/AppLayout.tsx:982`:
     ```tsx
     <main className={cn("flex-1 min-w-0 flex flex-col overflow-y-auto scrollbar-thin ...")}>
     ```
     The global `<main>` wrapper enables vertical scrolling across all page contents.
   - In `src/pages/Sales.tsx:1183-1530` and `src/pages/Purchases.tsx:1096-1400`:
     ```tsx
     <div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">
       <table ...>...</table>
       <div className="hidden md:block border-t border-slate-200/80 ...">
         <PaginationBar ... />
       </div>
     </div>
     ```
     The scrollable container wraps **both** the table rows AND the `PaginationBar`. As a result, when 25 rows are rendered, the pagination bar is pushed down below the fold, forcing the user to scroll through the entire table to reach pagination controls.
   - When the page exceeds standard monitor heights (768px-1080px), the outer `<main>` scroll activates, causing the document tabs (h-11), KPI cards, search filters, and table headers to scroll out of view.

2. **Dashboard Long Scroll (`src/pages/Dashboard.tsx`)**:
   - In `src/pages/Dashboard.tsx:619`:
     ```tsx
     <div className="flex-1 w-full min-w-0 h-full overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 font-sans select-none scrollbar-thin">
     ```
   - In `src/pages/Dashboard.tsx:1009, 1037, 1065, 1093`: Metric cards include verbose micro-prose ("Outstanding customer credit ledger balance.", "Pending supplier invoices & outstanding dues.", "Total reconciled liquidity across accounts.", "Total sales for this month.").
   - In `src/pages/Dashboard.tsx:1345-1400`: An "INSTITUTIONAL CHECKLIST" section is appended at the bottom, extending the page height past 1100px and requiring persistent vertical scrolling.
   - In contrast, the reference mockup demonstrates a screen-fitted layout: Top KPI strip (no micro-prose) + lower dual-pane (Spline Chart on left, Recent Invoices table on right) fitting entirely within 768px-1080px without vertical page scroll.

3. **Items & Parties Data Tables (`Items.tsx`, `Parties.tsx`)**:
   - In `src/pages/Items.tsx:1210-1552`: The table is inside an `overflow-y-auto` div, and `PaginationBar` is rendered below it. However, because parent containers lack strict `min-h-0` boundaries, the page-level scrollbar triggers on smaller desktop displays.
   - In `src/pages/Parties.tsx:1440-1821`: Similar structure where party rows, tabs, and bulk action strips cause vertical overflow if monitor height is under 900px.

---

### C. POS Billing Workbench (`src/pages/POSBilling.tsx`)

1. **Dual-Pane Architecture**:
   - In `src/pages/POSBilling.tsx:2430-2439`:
     ```tsx
     <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full h-full overflow-hidden bg-slate-50">
       <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden h-full min-h-0">
     ```
     Dual-pane split: Left pane (~60%) handles cart rows and search; Right pane (`lg:w-[410px] xl:w-[440px]`) handles billing breakdown and checkout.

2. **Right Pane Checkout Containment Defect**:
   - In `src/pages/POSBilling.tsx:3146-3498`:
     ```tsx
     <div className="w-full lg:w-[410px] xl:w-[440px] shrink-0 bg-slate-50/95 flex flex-col justify-between p-3 sm:p-4 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto shadow-sm h-full min-h-0 overscroll-contain touch-pan-y pb-24 lg:pb-4">
     ```
   - The **entire** right column is configured as a single `overflow-y-auto` container.
   - Inside this container are: Top Quick Actions (`F2`, `F3`), Bill Breakdown Card, Net Payable Total (`₹grandTotal`), Payment Mode Selector (6 buttons), Received Amount Input (`F4`), Quick Cash Suggestions, Customer Profile Card, and finally at lines 3455-3498: the Triple CTA buttons (`Save & Print [F6]`, `Save Bill [F7]`, `Save & WhatsApp`).
   - On standard monitor heights (768px-900px), all checkout CTA buttons are pushed below the fold, forcing cashiers to scroll down the right panel on every single transaction to complete checkout.

3. **Hotkey Ribbon & Visual Ergonomics**:
   - In `src/pages/POSBilling.tsx:2440-2539`:
     The visible ribbon only displays `Voice [V]`, `New Item [CTRL+I]`, `Price [P]`, `Qty [Q]`, `Discount [D]`, `Delete [DEL]`, `Scan Barcode`.
     Standard function hotkeys `F1` (Search), `F2` (Discount), `F3` (Charge), `F4` (Received Amount), `F5` (Customer), `F6` (Print), `F7` (Save) are either scattered across separate sub-cards or absent from the main action ribbon.
   - Buttons in the ribbon use multi-color pastel backgrounds (`border-indigo-200 bg-indigo-50`, `border-emerald-200 bg-emerald-50`, `border-amber-200 bg-amber-50`, `border-purple-200 bg-purple-50`, `border-rose-200 bg-rose-50`).
   - Design system rule mandates a monochromatic ribbon with crisp 1px hairline borders (`border-slate-200/80`), neutral surfaces (`bg-slate-50/80 hover:bg-slate-100`), and monospace shortcut badges (`font-mono text-[11px]`).

---

## 2. Logic Chain

```
[Observation 1: Header is 80px/88px with 360px image logo, glowing amber buttons, hidden ⌘K on lg]
       │
       ▼
[Deduction 1: Desktop command header wastes 36px vertical space, hides search on laptops, violates minimal design tokens]
       │
       ▼
[Blueprint 1: Refactor AppLayout header to fixed 52px h-13, 28px brand mark, visible Org Switcher, segmented Suite Switcher, central ⌘K, royal blue split action, live sync dot]

─────────────────────────────────────────────────────────────────────────────────

[Observation 2: AppLayout <main> has overflow-y-auto; Sales/Purchases tables wrap PaginationBar inside scroll body]
       │
       ▼
[Deduction 2: When tables exceed screen height, the whole page scrolls, pushing headers, tabs, and pagination off-screen]
       │
       ▼
[Blueprint 2: Lock parent to min-h-0 overflow-hidden. Structure data tables: sticky thead, scrollable tbody container (flex-1 min-h-0 overflow-y-auto), fixed bottom pagination footer (shrink-0 border-t)]

─────────────────────────────────────────────────────────────────────────────────

[Observation 3: POSBilling right panel has overflow-y-auto across entire column; Save & Print CTA buttons are at bottom]
       │
       ▼
[Deduction 3: Cashiers must scroll vertically on standard 768px-900px screens to access Save & Print buttons]
       │
       ▼
[Blueprint 3: Decouple POS right panel into 3 regions: Fixed Top Net Total (shrink-0), Scrollable Middle breakdown/payment/customer (flex-1 min-h-0 overflow-y-auto), Fixed Bottom Checkout Bar (shrink-0 border-t bg-white)]
```

---

## 3. Caveats

1. **Create Invoice Flow Exclusion**: In accordance with user rules and R7, `src/components/invoices/mobile/MobileCreateInvoice.tsx`, `src/components/SalesInvoiceModal.tsx`, and bill creation modals are protected business routes and must remain 100% untouched.
2. **Mobile View Separation**: Mobile viewports (`< 768px`) utilize dedicated bottom navigation docks, responsive touch cards, and bottom sheets. The 52px header and desktop table refactoring must strictly be gated behind `hidden md:flex` / `md:` responsive breakpoints, ensuring zero mobile regression.
3. **Database & API Parity**: All database queries (`partiesApi`, `productsApi`, `invoicesApi`, `documentsService`) and Supabase real-time subscriptions must remain invariant.

---

## 4. Conclusion & Milestone 2 Refactoring Blueprint

### Blueprint 1: Unified 52px Desktop Command Header (`AppLayout.tsx`)

| Element | Current Implementation | Target Blueprint (Milestone 2) |
|---|---|---|
| **Height** | `md:h-[5rem]`, `lg:h-[5.5rem]` (80-88px) | `h-13` (exactly 52px) on desktop (`hidden md:flex items-center`) |
| **Brand Mark** | `img /logo-static.jpeg` (max-w-[360px], h-15) | Compact 28px mark (`w-7 h-7 rounded-lg bg-blue-600` with white vector glyph) + `span.font-bold text-sm tracking-tight text-slate-900` "CredSmart" |
| **Org Switcher** | Buried in avatar menu (far right) | Left command strip pill: `button.h-8 px-2.5 rounded-lg border border-slate-200/80 bg-slate-50 text-xs font-semibold` "Store Name ▾" |
| **Suite Switcher** | Saturated amber/emerald buttons | Segmented control pill: `bg-slate-100 p-0.5 rounded-lg` with active selection in `bg-white text-slate-900 shadow-2xs font-semibold text-xs` |
| **Command Palette** | `hidden xl:flex` with glowing styles | `hidden md:flex items-center w-56 lg:w-72 h-8.5 rounded-lg bg-slate-100/80 border border-slate-200/80 px-3 text-xs text-slate-500` with `⌘K` badge |
| **Split "+ New Invoice"**| Glowing amber gradient button (`h-10.5`) | `h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs` with dropdown chevron for quotes/payments |
| **Live Sync Status** | Inside page title block on left | Right command strip: `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-medium text-emerald-600`: `● Live Sync` |
| **Clean Surfaces** | 3D tilt perspective + fixed watermark | Deprecate `perspective: 2000px` and remove fixed bottom-right watermark |

#### Proposed Layout Architecture in `AppLayout.tsx`:
```tsx
{/* Fixed 52px Top Command Bar (Desktop >= 768px) */}
<header className="hidden md:flex h-13 shrink-0 sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 items-center justify-between px-4 gap-3 select-none">
  {/* LEFT: 28px Brand Mark + Org Switcher + Suite Switcher */}
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
        <Sparkles className="w-4 h-4" />
      </div>
      <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">CredSmart</span>
    </div>

    {/* Org Switcher Pill */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors">
          <span className="max-w-[130px] truncate">{org?.name || "My Business"}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      {/* Stores Dropdown Content */}
    </DropdownMenu>

    {/* Segmented Suite Switcher */}
    <SuiteSwitcher />
  </div>

  {/* CENTER: Command Palette Trigger (Available md: and above) */}
  <div className="flex-1 max-w-md mx-2">
    <button
      onClick={() => setOpenCommand(true)}
      className="w-full h-8.5 px-3 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span>Search or ⌘K...</span>
      </div>
      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500">⌘K</kbd>
    </button>
  </div>

  {/* RIGHT: New Invoice Button + Live Sync + Notifs + Profile */}
  <div className="flex items-center gap-2 shrink-0">
    <div className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>Live Sync</span>
    </div>

    {/* Primary Action: Royal Blue Split Button */}
    <div className="flex items-center h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs overflow-hidden transition-colors">
      <button
        onClick={() => setSalesInvoiceModalOpen(true)}
        className="flex items-center gap-1.5 px-3 h-full text-xs font-semibold cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>New Invoice</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-full px-1.5 border-l border-blue-500 hover:bg-blue-700/80 flex items-center justify-center">
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        {/* Dropdown Menu Items */}
      </DropdownMenu>
    </div>

    {/* Notification Bell */}
    <button onClick={() => setNotifOpen(true)} className="w-8.5 h-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">
      <Bell className="w-4 h-4" />
    </button>

    {/* User Avatar */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8.5 h-8.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs flex items-center justify-center shadow-2xs">
          {org?.name?.charAt(0) || "C"}
        </button>
      </DropdownMenuTrigger>
      {/* Profile menu items */}
    </DropdownMenu>
  </div>
</header>
```

---

### Blueprint 2: Screen-Fitted Data Tables Architecture (`Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`)

To eliminate vertical whole-page scrolling and ensure headers, controls, and pagination footers remain fixed in place:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Sub-Document Ribbon / Category Strip (shrink-0, h-10)     │
├─────────────────────────────────────────────────────────────┤
│ 2. Page Title & Action Bar (shrink-0, h-10)                 │
├─────────────────────────────────────────────────────────────┤
│ 3. KPI Metrics Summary Cards (shrink-0, 4 cards, ~76px)     │
├─────────────────────────────────────────────────────────────┤
│ 4. Search & Filter Bar (shrink-0, h-10)                     │
├─────────────────────────────────────────────────────────────┤
│ 5. Table Container (flex-1 min-h-0 flex flex-col border)    │
│    ┌──────────────────────────────────────────────────────┐ │
│    │ Sticky Table Header (sticky top-0 bg-white/95, 38px) │ │
│    ├──────────────────────────────────────────────────────┤ │
│    │ Scrollable Table Rows (flex-1 min-h-0 overflow-y-auto│ │
│    │   row height: 38px-42px, tabular-nums font-mono)     │ │
│    └──────────────────────────────────────────────────────┘ │
│    ┌──────────────────────────────────────────────────────┐ │
│    │ 6. Fixed Pagination Footer (shrink-0 border-t, 40px) │ │
│    │    Showing 1-25 of 120 | [ < 1 2 3 > ] | 25 / page   │ │
│    └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Code Implementation Blueprint:
```tsx
{/* Page Root Wrapper: 100% height containment, zero window scroll */}
<div className="h-full flex flex-col min-h-0 w-full overflow-hidden bg-slate-50/60 dark:bg-slate-950/40 p-3 sm:p-4 space-y-2.5">
  {/* 1. Header & Filters (shrink-0) */}
  <div className="shrink-0 flex items-center justify-between">...</div>
  <div className="shrink-0 grid grid-cols-4 gap-2.5">...</div>
  <div className="shrink-0 flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80">...</div>

  {/* 2. Main Bounded Table Card */}
  <div className="flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden">
    {/* Bounded Scrollable Table Body Container */}
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] uppercase font-mono tracking-wider text-slate-500 z-10">
          <tr className="h-9.5">
            <th className="py-2 px-3">Date</th>
            <th className="py-2 px-3">Invoice Number</th>
            <th className="py-2 px-3">Party Name</th>
            <th className="py-2 px-3 text-right">Amount (₹)</th>
            <th className="py-2 px-3 text-center">Status</th>
            <th className="py-2 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
          {paginatedDocs.map((doc) => (
            <tr key={doc.id} className="h-10 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              <td className="py-2 px-3 font-mono text-slate-600">{doc.docDate}</td>
              <td className="py-2 px-3 font-mono font-semibold text-blue-600">{doc.documentNumber}</td>
              <td className="py-2 px-3 font-medium text-slate-900">{doc.partyName}</td>
              <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">₹{doc.grandTotal.toFixed(2)}</td>
              <td className="py-2 px-3 text-center">...</td>
              <td className="py-2 px-3 text-right">...</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* 3. Fixed Bottom Pagination Footer (Never scrolls off-screen) */}
    <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={totalDocCount}
        startIndex={startIndex}
        endIndex={endIndex}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  </div>
</div>
```

---

### Blueprint 3: Dual-Pane POS Workbench Architecture (`POSBilling.tsx`)

#### Structural Refactoring:
1. **Left Pane (Catalog & Cart - 60% Width)**:
   - Sticky Top: Monochromatic Hotkey Ribbon with clean monospace badges (`[F1]`, `[CTRL+I]`, `[P]`, `[Q]`, `[D]`, `[DEL]`, `[CTRL+B]`).
   - Search & Barcode Input: Hairline border with immediate focus styling.
   - Middle Cart Rows: `flex-1 min-h-0 overflow-y-auto scrollbar-thin` with 38px line-item rows, steppers, and tabular prices.
2. **Right Pane (Summary & Checkout - 40% Width)**:
   - **Top Card (shrink-0)**: Net Payable Total pill (`text-3xl font-mono tabular-nums`).
   - **Middle Body (flex-1 min-h-0 overflow-y-auto space-y-3 p-3)**:
     - Bill Breakdown card (`Subtotal`, `Discount`, `Tax`).
     - Payment Mode Selector (Cash, UPI, Card, Credit).
     - Received Amount Input (`F4`) & change due calculator.
     - Customer Profile (`F5`).
   - **Bottom Fixed Action Dock (shrink-0 border-t border-slate-200 bg-white p-3 z-10)**:
     - Triple Primary Action CTAs (`Save & Print [F6]`, `Save Bill [F7]`, `WhatsApp Receipt`) fixed at the bottom.
     - **Result**: Zero vertical scroll required to complete a transaction.

#### Proposed Layout Code in `POSBilling.tsx`:
```tsx
<div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full h-full overflow-hidden bg-slate-50">
  {/* LEFT WORKBENCH (Catalog & Cart) */}
  <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden h-full min-h-0">
    {/* Monochromatic Hotkey Ribbon */}
    <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      <button onClick={() => searchInputRef.current?.focus()} className="h-7 px-2.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 shadow-2xs">
        <Search className="w-3 h-3 text-slate-400" />
        <span>Search</span>
        <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">F1</kbd>
      </button>
      <button onClick={() => setShowNewItemModal(true)} className="h-7 px-2.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 shadow-2xs">
        <Plus className="w-3 h-3 text-slate-400" />
        <span>New Item</span>
        <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">CTRL+I</kbd>
      </button>
      <button onClick={handleOpenChangePrice} className="h-7 px-2.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 shadow-2xs">
        <span>Price</span>
        <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">P</kbd>
      </button>
      <button onClick={handleOpenChangeQty} className="h-7 px-2.5 rounded-md border border-slate-200/80 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 shadow-2xs">
        <span>Qty</span>
        <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">Q</kbd>
      </button>
      <button onClick={handleDeleteSelectedItem} className="h-7 px-2.5 rounded-md border border-slate-200/80 bg-white hover:bg-rose-50 text-[11px] font-medium text-rose-600 flex items-center gap-1 shadow-2xs ml-auto">
        <Trash2 className="w-3 h-3" />
        <span>Delete</span>
        <kbd className="font-mono text-[10px] text-rose-500 bg-rose-50 px-1 rounded">DEL</kbd>
      </button>
    </div>

    {/* Search & Barcode Input */}
    <div className="shrink-0 p-2.5 border-b border-slate-200 bg-white">...</div>

    {/* Independently Scrollable Cart Table */}
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
      <table className="w-full text-left text-xs">...</table>
    </div>
  </div>

  {/* RIGHT CHECKOUT PANEL (CONTAINED SCREEN-FITTED DOCK) */}
  <div className="w-full lg:w-[400px] xl:w-[430px] shrink-0 bg-slate-50 flex flex-col h-full min-h-0 border-l border-slate-200">
    {/* Region 1: Fixed Net Payable Total (shrink-0) */}
    <div className="shrink-0 p-3.5 bg-blue-600 text-white flex items-center justify-between shadow-2xs">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-100 block">Net Payable</span>
        <span className="text-2xl font-bold font-mono tabular-nums">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <span className="text-[11px] font-mono bg-blue-700 px-2 py-0.5 rounded text-blue-100">{totalItemsCount} Units</span>
    </div>

    {/* Region 2: Bounded Middle Scroll Area (flex-1 min-h-0 overflow-y-auto) */}
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin">
      {/* Bill Breakdown */}
      <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5 text-xs">...</div>

      {/* Payment Mode Selector */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-600 uppercase font-mono">Payment Mode</span>
        <div className="grid grid-cols-3 gap-1.5">...</div>
      </div>

      {/* Received Amount & Change Due */}
      <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">...</div>

      {/* Customer Profile */}
      <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">...</div>
    </div>

    {/* Region 3: Fixed Bottom Checkout Action Bar (shrink-0 border-t bg-white) */}
    <div className="shrink-0 p-3 border-t border-slate-200/80 bg-white grid grid-cols-3 gap-2 shadow-xs">
      <button
        onClick={() => handleSaveBill(true)}
        disabled={isProcessingSave || currentTab.items.length === 0}
        className="h-9 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print</span>
        <kbd className="font-mono text-[10px] bg-emerald-700 px-1 rounded">F6</kbd>
      </button>

      <button
        onClick={() => handleSaveBill(false)}
        disabled={isProcessingSave || currentTab.items.length === 0}
        className="h-9 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-2xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
        <span>Save</span>
        <kbd className="font-mono text-[10px] bg-blue-700 px-1 rounded">F7</kbd>
      </button>

      <button
        onClick={() => handleSaveBill(false, true)}
        disabled={isProcessingSave || currentTab.items.length === 0}
        className="h-9 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200/80 shadow-2xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5 text-emerald-600" />
        <span>WA</span>
      </button>
    </div>
  </div>
</div>
```

---

## 5. Verification Method

To verify these findings and test the future Milestone 2 implementation:

1. **Verify Header Height & Proportions**:
   - Inspect `src/components/AppLayout.tsx:478`: Verify replacing `md:h-[5rem] lg:h-[5.5rem]` with `h-13` (52px).
   - In browser DevTools at 1280x800 resolution: Verify top command header measures exactly 52px, brand mark is 28px, and no vertical scrolling occurs on Dashboard or POS.

2. **Verify Screen-Fitted Data Tables**:
   - Inspect `src/pages/Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`: Confirm table body is wrapped in `flex-1 min-h-0 overflow-y-auto` and `PaginationBar` is rendered in a separate `shrink-0 border-t` container outside the table scroll body.
   - In browser DevTools with 25 records displayed: Verify pagination controls remain permanently visible at the viewport bottom without scrolling down.

3. **Verify POS Billing Split Containment**:
   - Inspect `src/pages/POSBilling.tsx:3147`: Verify right column separates the middle breakdown from the bottom checkout buttons.
   - At 1024x768 monitor resolution: Verify the "Save & Print [F6]" and "Save Bill [F7]" buttons remain visible and clickable without scrolling.

4. **Automated Verification Commands**:
   - TypeScript compile check: `npm run build` or `npx tsc --noEmit`
   - Vitest test suite execution: `npx vitest run src/test/billingLifecycleEngine.test.ts`
   - Lint check: `npm run lint`

5. **Invalidation Conditions**:
   - If header height exceeds 52px on desktop.
   - If the data table pagination bar scrolls out of view when rows exceed the screen.
   - If POS checkout buttons require scrolling on standard 768px height displays.
   - If any protected invoice modal (`SalesInvoiceModal.tsx`, `MobileCreateInvoice.tsx`) is altered.
