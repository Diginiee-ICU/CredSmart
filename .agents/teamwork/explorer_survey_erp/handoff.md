# Survey Report: Core ERP Pages Investigation & Redesign Architecture

**Author**: Explorer 1 (Survey 1 - Core ERP Pages)  
**Target Pages**:
1. `src/pages/Dashboard.tsx` (1,537 lines)
2. `src/pages/Sales.tsx` (1,615 lines)
3. `src/pages/Purchases.tsx` (1,188 lines)
4. `src/pages/Items.tsx` (1,555 lines)
5. `src/pages/Parties.tsx` (1,905 lines)

---

## 1. Observation

### 1.1 Architecture & Component Survey per Page

#### Page 1: `src/pages/Dashboard.tsx`
- **File Metrics**: 1,537 lines, 71.3 KB.
- **Imported UI & Modal Subcomponents**:
  - Charts: `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` from `recharts` (lines 35-41).
  - 3D Graphics: `Wallet3DGraphic`, `Invoice3DGraphic`, `Bank3DGraphic`, `CredsmartLogo` from `@/components/ui/Liquid3DCardGraphics` (lines 57-61).
  - Modals:
    - `SalesInvoiceModal` (lines 50, 1412-1422) — *Protected business flow*.
    - `ReceiptModal` (lines 51, 144) — Thermal receipt preview dialog.
    - `CreateItemModal` (lines 54, 1425-1466) — Item creation drawer/modal.
    - `CreatePartyModal` (lines 55, 1469-1517) — Customer/Supplier creation modal.
    - `UniversalQuickCreateModal` (lines 49, 1520-1533) — Omnibar quick creator.
- **Responsive Branching Strategy**:
  - Mobile Branch (`block md:hidden space-y-3.5 pb-24 pt-1`, lines 629-955):
    - Top Store Greeting (`Good Morning/Afternoon/Evening`) with LIVE heartbeat badge and 44×44px refresh trigger.
    - Compact dismissible Tally & Excel Import banner (`!dismissedMobileTallyBanner`, persisted via `credsmart_dismissed_mobile_tally_banner` in `localStorage`, lines 659-706).
    - 2×2 Financial Ledger Summary Grid:
      1. `TO COLLECT`: Cyan/Blue accent line, `ArrowDownLeft`, tabular rupee amount, "Receivable" pill (navigates to `/parties`).
      2. `TO PAY`: Amber/Orange accent line, `ArrowUpRight`, tabular rupee amount, "Payable" pill (navigates to `/purchases`).
      3. `CASH & BANK`: Yellow/Amber accent line, `Landmark`, tabular rupee amount, "Liquidity" pill (navigates to `/cash-bank`).
      4. `TODAY'S SALES`: Emerald/Teal accent line, `TrendingUp`, tabular rupee amount, "[N] Bills" pill (navigates to `/sales`).
    - Quick Action Strip (horizontal scroll): `+ Sale Bill`, `+ POS Billing`, `+ Item`, `+ Customer`, `Day Book`.
    - Recent Activity List: Avatar with customer initials, invoice number, date, status pill (`PAID` / `PENDING` / `OVERDUE`), bold amount.
  - Desktop Branch (`hidden md:flex flex-col space-y-4`, lines 960-1407):
    - Status bar: `LIVE RECONCILED` badge + Last Sync timestamp + refresh button.
    - 4 Metric cards (`glass-card-3d`): `TO COLLECT`, `TO PAY`, `CASH & BANK`, `TOTAL SALES (MTD)`.
    - Middle row (2 equal columns):
      - Left: "FINANCIAL LEDGER SUMMARY" Spline AreaChart with timeframe selector (`7 Days`, `This Month`, `Last Month`, `This Year`) and summary metric pills.
      - Right: "LATEST INVOICES & TRANSACTIONS" table with Invoice No., Party Name, Amount, Status.
    - Bottom row: "INSTITUTIONAL CHECKLIST" with 5 verification cards (`KYC Verified`, `Bank Linked`, `GST Verified`, `Credit Safe`, `Data Secure`).
- **Data Dependencies & Real-time Feeds**:
  - State hooks: `toCollect`, `toPay`, `cashBankBalance`, `totalMtdSales`, `latestTransactions`, `salesHistory`, `creditTxHistory`, `purchaseDocs`.
  - APIs: `partiesApi.getCreditTransactions`, `invoicesApi.getSales`, `documentsService.fetchPurchaseDocuments`, `productsApi.createProduct`, `partiesApi.savePartyRecord`.
  - Supabase Real-time: Listens on channels `sales` and `credit_transactions` filtered by `organization_id=eq.${orgId}` (lines 324-345).

---

#### Page 2: `src/pages/Sales.tsx`
- **File Metrics**: 1,615 lines, 81.8 KB.
- **Imported UI & Modal Subcomponents**:
  - Sub-document Navigation Tabs (lines 82-90):
    - `sales_invoice`, `quotation`, `payment_in`, `sales_return`, `credit_note`, `delivery_challan`, `proforma_invoice`.
  - Modals & Drawers:
    - `SalesInvoiceModal` (lines 71, 1547-1555) — *Protected business flow*.
    - `SalesReturnModal` (lines 79, 1558-1567) — Return & Credit Note editor.
    - `SalesSettingsModal` (lines 72, 1569-1574) — Invoice series & term preferences.
    - `KeyboardShortcutsModal` (lines 73, 1576-1580) — Keyboard shortcut cheat sheet.
    - `ReceiptModal` (lines 74, 1583-1593) — Modal invoice viewer / thermal print slip.
    - `GenerateEwayBillModal` & `EwayBillPrintSlip` (lines 75-76, 1596-1611) — NIC E-Way Bill integration.
  - Utilities: `shareInvoicePdfToWhatsApp`, `downloadInvoicePdf`, `downloadExactInvoicePdf`, `exportToCSV`.
- **Responsive Branching Strategy**:
  - Sub-Document Tab Bar: Sticky top frosted glass ribbon (`h-11`, overflow-x-auto, lines 463-485).
  - KPI Metrics Strip:
    - Mobile: Compact 4-col mini strip (`Volume`, `Settled`, `Dues`, `Void`, lines 559-627).
    - Desktop: 4 frosted cards with vertical gradient left-accents (`Total Volume`, `Settled`, `Receivables`, `Voided`, lines 630-714).
  - Action & Filter Controls Bar (lines 717-814):
    - Search input, Date Range dropdown (`DATE_PRESETS`: Today, Yesterday, This Week, This Month, Last 365 Days, All Time), Status filter dropdown (`All`, `Paid`, `Unpaid`, `Partially Paid`, `Cancelled`), Bulk Actions menu, primary "Create [Doc]" button.
  - List / Table Branching:
    - Mobile Card Stream (`block md:hidden`, lines 818-1075):
      - High-touch cards: Invoice # + interactive status toggle (`paid` / `unpaid` on tap) + Grand Total.
      - Party name, date, due calculation ("Due Today", "Overdue by N days", "Paid").
      - Inline action triggers: Print, Download PDF, Direct WhatsApp share, and 3-dots `MoreVertical` menu (E-Way bill, Sales Return, Edit, Duplicate, Delete).
    - Desktop Data Table (`hidden md:flex`, lines 1092-1533):
      - Sortable table columns: Checkbox, Date (`docDate`), Invoice Number, Party Name (+ phone), Due In / Return Details, Amount (`grandTotal`), Status (interactive toggle), Actions (Print, PDF, WhatsApp, More dropdown).
    - Pagination: Shared `PaginationBar` driven by `usePagination` hook (lines 1077-1090 on mobile, lines 1518-1531 on desktop).
- **Data Dependencies**:
  - `documentsService.fetchDocuments(orgId, activeTab, dateRange)`
  - Real-time updates via custom event listener `"credsmart:documents_updated"`.

---

#### Page 3: `src/pages/Purchases.tsx`
- **File Metrics**: 1,188 lines, 55.4 KB.
- **Imported UI & Modal Subcomponents**:
  - Sub-document Tabs (lines 75-81):
    - `purchase_invoice`, `payment_out`, `purchase_return`, `debit_note`, `purchase_order`.
  - Banner: `PendingInwardBanner` (lines 42, 498) — B2B incoming invoice auto-sync review banner wired to `useNetworkInvoices()`.
  - Modals:
    - `PurchaseInvoiceModal` (lines 66, 1138-1147) — Vendor invoice inward editor.
    - `MobileScanModal` (lines 69, 1150-1157) — Camera & OCR bill scanning.
    - `SalesSettingsModal` (lines 67, 1159-1164).
    - `KeyboardShortcutsModal` (lines 68, 1166-1170).
    - `ReceiptModal` (lines 70, 1173-1183).
- **Responsive Branching Strategy**:
  - Top Tabs: Sticky ribbon (`h-11`) with amber/orange active tab styling (`bg-gradient-to-r from-amber-500 to-orange-500 text-white`).
  - Auto-Sync Banner: `PendingInwardBanner` rendered prominently below header for B2B supplier approvals.
  - KPI Metrics Strip:
    - Mobile: 3-col mini strip (`Purchases`, `Paid Out`, `Payables`, lines 501-552).
    - Desktop: 3 cards (`Total Purchases`, `Paid Out`, `Vendor Payables`, lines 554-618).
  - Filter Bar: Search input, Date Range popover (`DATE_PRESETS`), and "Create Purchase Invoice" button (lines 620-685).
  - List / Table Branching:
    - Mobile Card Stream (`block md:hidden`, lines 689-885): Voucher # + Status badge + Auto-Sync Sparkles pill + Total amount + Supplier Name + Date + Due text + Print, PDF, WhatsApp, More menu.
    - Desktop Data Table (`hidden md:flex`, lines 902-1124): Checkbox, Date, Purchase Invoice Number (+ Ref No + Auto-Synced badge), Party Name (+ phone), Due In, Amount, Status, Actions dropdown.
    - Pagination: `PaginationBar` with `usePagination` (lines 887-900 on mobile, lines 1109-1122 on desktop).
- **Data Dependencies**:
  - `documentsService.fetchDocuments(orgId, activeTab, dateRange)`
  - B2B Realtime network inbox via `useNetworkInvoices()`.

---

#### Page 4: `src/pages/Items.tsx`
- **File Metrics**: 1,555 lines, 69.6 KB.
- **Imported UI & Modal Subcomponents**:
  - Modals & Drawers:
    - `CreateItemModal` (lines 36, 1442-1451) — Full product catalog editor.
    - `CreateOfferModal` (lines 37, 1453-1461) — BOGO & discount rules.
    - `ProductLibraryModal` (lines 38, 1463-1469) — FMCG/Pharma pre-seeded library.
    - `ItemsExcelUploadModal` (lines 39, 1471-1476) — Excel spreadsheet bulk importer.
    - Stock Adjustment `Dialog` (lines 60-64, 1479-1551) — Quick in-place stock increment/decrement dialog.
  - Utilities: `exportItemsToCSV`, `downloadCSV` from `@/utils/excelImportExport`.
- **Responsive Branching Strategy**:
  - KPI Metrics Strip:
    - Mobile: 4-col mini strip (`Valuation`, `Low Stock` toggle, `Catalog`, `Zero Stock`, lines 661-705).
    - Desktop: 4 cards (`Stock Valuation`, `Low Stock`, `Total Catalog`, `Zero Stock`, lines 710-789).
  - Filter Bar: Search input (with clear `X`), Category dropdown (`DEFAULT_CATEGORIES`), Stock status dropdown (`All Stock` / `Low Stock`), Tally/Excel Import button, "+ Add Item" button (lines 794-864).
  - Bulk Action Floating Bar (when `selectedIds.size > 0`): Bulk Price Change (+% / -%), Bulk Delete (lines 867-907).
  - Software Migration Ribbon: Quick pills for `Product Library` and `Import from Vyapar / Tally` (lines 911-933).
  - List / Table Branching:
    - Mobile Card Stream (`block md:hidden`, lines 939-1089): Image thumbnail, Product name, Stock status badge (`0 Stock`, `[Qty] [Unit]`), Selling Price, SKU, Category, Barcode, "Adjust" stock button, More menu.
    - Desktop Data Table (`hidden md:block`, lines 1092-1405): Checkbox, Item Name (+ brand, category, altUnit conversion, GST %, HSN), Item Code / SKU (+ Barcode icon), Stock QTY & Unit (+ Low/Zero stock badge), Selling Price (+ MRP strike-through), Purchase Price (+ gross margin), Actions dropdown (Edit, Adjust Stock, Print Barcode Label, Transfer to Godown, Delete).
    - Pagination: `PaginationBar` with `usePagination` (lines 1407-1420).
- **Data Dependencies**:
  - `productsApi.getProducts(orgId)`
  - `productsApi.getBatches(orgId)`
  - `useProducts()` context (`refreshProducts`, `addOrUpdateProduct`).

---

#### Page 5: `src/pages/Parties.tsx`
- **File Metrics**: 1,905 lines, 87.6 KB.
- **Imported UI & Modal Subcomponents**:
  - Modals & Drawers:
    - `CreatePartyModal` (lines 41, 1673-1681) — Customer & Supplier profile modal.
    - `SharedLedgerModal` (lines 42, 1684-1693) — Live synchronized ledger portal.
    - `PartyReportsModal` (lines 43, 1696-1701) — PDF/CSV statements & aging.
    - `PartySettingsModal` (lines 44, 1704-1707) — Party master settings.
    - Keyboard Shortcuts Dialog (lines 1709-1745).
    - Ledger Reconciliation & Audit Dialog (lines 1747-1893) — CA-level double-entry verification engine.
    - `PartyExcelUploadModal` (lines 45, 1895-1901) — Bulk party importer.
- **Responsive Branching Strategy**:
  - Header Strip: Title, total party badge, Mobile Reconcile integrity score button (mobile), and Desktop Actions (Reconcile Hub, SharedLedger Portal, Reports dropdown, Settings, Keyboard shortcuts, lines 708-885).
  - KPI Metrics Strip:
    - 3 Equal Cards: `Total Parties` (Blue), `To Collect` (Emerald, positive balance), `To Pay` (Rose, negative balance) (lines 890-947).
  - Filter Bar: Search input (with clear `X`), Categories dropdown filter (`all`, `customer`, `supplier`, `both`, `to_collect`, `to_pay`, `Wholesaler`, `Retailer`, etc.), Tally/Excel Import button, Bulk Parties upload button, "+ Create Party" button, Bulk Actions dropdown (lines 952-1058).
  - Software Migration Ribbon: Quick pills for `Import from Vyapar / Tally / My Bill Book` and `SharedLedger & Reconcile` (lines 1061-1083).
  - List / Table Branching:
    - Mobile Card Stream (`block md:hidden`, lines 1089-1268): Avatar with initial, Name (+ SharedLedger zap icon), Category, City/State, Directional balance (`+ ₹ ... To Collect` in emerald or `- ₹ ... To Pay` in rose), 1-tap Call trigger, 1-tap WhatsApp trigger, Ledger button, More menu.
    - Desktop Data Table (`hidden md:block`, lines 1286-1634): Checkbox, Party Name (+ tradeName, city/state, GSTIN, Zap icon), Category pill, Mobile Number (+ WhatsApp & Call icon triggers), Party Type badge (`Customer`, `Supplier`, `Both`), Balance (sortable, `To Collect (Dr)` or `To Pay (Cr)`), Actions dropdown.
    - Pagination: `PaginationBar` with `usePagination` (lines 1271-1284 on mobile, lines 1636-1649 on desktop).
- **Data Dependencies**:
  - `partiesApi.getCustomers(orgId)`
  - `partiesApi.getSuppliers(orgId)`
  - `partiesApi.getCreditTransactions({ orgId })`
  - Automated reconciliation via `performFullLedgerReconciliation` and `reconcilePartyLedger`.

---

### 1.2 Current Styling Approach & Design Tokens
1. **Color Tokens in Use**:
   - Primary: Slate 900 (`#0F172A`), Navy (`bg-slate-900`), Blue (`#1D4ED8`, `text-blue-600`), Emerald (`#10B981`, `text-emerald-600`), Orange/Amber (`#FF6A00` / `#F59E0B`, `text-amber-600`), Rose (`text-rose-600`).
2. **Current Card & Surface Styling**:
   - Desktop extensively uses `.glass-card-3d` (`index.css:723`): `background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.95); box-shadow: 0 14px 40px -4px rgba(15, 23, 42, 0.06)`.
   - While visually rich, this skeuomorphic glass style conflicts with the clean, flat, high-density Stripe/Linear aesthetic that relies on crisp hairline borders, flat backgrounds (`bg-white dark:bg-slate-900`), and minimal micro-shadows (`shadow-2xs`).
3. **Typography**:
   - `font-sans` (`Instrument Sans` / `Inter`), `font-mono` (`IBM Plex Mono`) for currency amounts, invoice numbers, SKUs, and GSTINs.
   - Tabular figures (`tabular-nums`) are used on some dashboard cards, but missing in multiple table cells.

---

## 2. Logic Chain

1. **Observation**: All 5 pages currently use `.glass-card-3d` with heavy blur (24px), layered shadows, and 3D translation effects on hover, alongside thick colored indicator borders (e.g. `w-1 bg-gradient-to-b ... rounded-l-2xl`).
   **Inference**: Replacing `.glass-card-3d` with clean, hairline-bordered cards (`border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs`) will immediately achieve the refined Stripe / Linear dashboard look while removing GPU compositing overhead.

2. **Observation**: Desktop tables across Sales (`Sales.tsx:1094`), Purchases (`Purchases.tsx:904`), Items (`Items.tsx:1093`), and Parties (`Parties.tsx:1288`) have loose row heights (`py-3.5 px-4`), varied header styles, and inconsistent border separators.
   **Inference**: Standardizing on high-density row heights (36-40px, `py-2.5 px-3`), sticky subtle-gray headers (`bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] uppercase font-mono tracking-wider text-slate-500`), and hairline row dividers (`border-b border-slate-100 dark:border-slate-800/60`) will dramatically increase information density and visual crispness without sacrificing legibility.

3. **Observation**: Currency formatting across tables and mobile cards mixes raw string concatenation with `toLocaleString("en-IN")`, occasionally lacking `font-mono tabular-nums`.
   **Inference**: Enforcing `font-mono tabular-nums font-bold` with standard Indian Rupee notation (`₹ X,XX,XXX.XX`) ensures numeric columns align vertically, matching Stripe Billing and Linear financial tables.

4. **Observation**: Status badges (Paid, Unpaid, Partial, In Stock, Low Stock, Zero Stock) currently vary from clickable button styles to full badges with heavy backgrounds.
   **Inference**: Replacing them with crisp, hairline status pills containing colored status dots (`bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold`) creates a unified, professional design language across all 5 modules.

5. **Observation**: On mobile viewports (`< 768px`), all 5 pages already maintain dedicated touch streams (`block md:hidden`) with `PaginationBar` and touch-friendly actions, but card containers still have irregular padding and borders.
   **Inference**: Preserving the dedicated mobile streams while updating their card shells to hairline-bordered cards (`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs`) and maintaining ≥ 44×44px interactive targets satisfies both the mobile UX guidelines and the Stripe aesthetic.

6. **Observation**: Requirements explicitly mandate that the Create Invoice flow (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) must remain **100% untouched and functional**.
   **Inference**: All 5 pages interact with `SalesInvoiceModal` merely as an external modal trigger via `setShowSalesInvoiceModal(true)` or `setCreateModalOpen(true)`. The modal invocation interfaces, props, and callbacks can be cleanly preserved with zero edits to the modal files themselves.

---

## 3. Caveats

- **Scope Boundary**: This survey investigated the 5 core ERP pages (`Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`) and their immediate component hierarchy. Secondary peripheral pages (e.g., `Godown.tsx`, `BarcodeGenerator.tsx`, `CustomerLedger.tsx`) were observed but are outside the immediate core 5 redesign scope.
- **Backend API Endpoints**: All data queries in these pages communicate with either `supabase` realtime channels or the centralized API client layer (`productsApi`, `partiesApi`, `invoicesApi`, `documentsService`). Redesigning the presentation layer does NOT require altering backend API contracts.
- **CRM Suite Coordination**: The CRM suite (`src/pages/crm/*`) is surveyed independently by Explorer 2 and was not modified or redefined in this survey report.

---

## 4. Conclusion & Concrete Redesign Action Plan

To elevate the 5 core ERP pages to the clean, high-density Stripe/Linear aesthetic with hairline borders and crisp typography, the following architectural plan is recommended for implementation:

### Design Tokens & Shared Classes Specification
| Element | Stripe / Linear Specification | Tailwind Classes |
|---|---|---|
| **Card Surface** | Flat, crisp hairline-bordered container | `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs` |
| **Card Header** | Subtle divider with compact uppercase label | `p-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between` |
| **KPI Metric Card** | Clean metric box with subtle top/left hairline accent | `p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between` |
| **Table Container** | Hairline container with overflow scroll | `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs` |
| **Table Header** | Compact sticky header with subtle gray background | `sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 text-[10.5px] uppercase font-mono tracking-wider` |
| **Table Rows** | High-density 36-40px rows with subtle hover highlight | `py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors` |
| **Currency Values** | Indian Rupee in monospaced tabular numerals | `font-mono tabular-nums font-bold text-slate-900 dark:text-white` |
| **Status Pill (Paid/In Stock)** | Hairline emerald pill with bullet dot | `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60` |
| **Status Pill (Pending/Low)** | Hairline amber pill with bullet dot | `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60` |
| **Status Pill (Unpaid/Zero)** | Hairline rose pill with bullet dot | `inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60` |
| **Search / Input** | Clean rounded input with hairline border | `h-8.5 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg focus:ring-1 focus:ring-blue-500` |
| **Action Buttons** | Crisp, low-elevation solid/outline buttons | `h-8 px-2.5 text-xs font-semibold rounded-lg shadow-2xs active:scale-[0.98] transition-all` |

### Page-by-Page Implementation Directives
1. **`src/pages/Dashboard.tsx`**:
   - Replace `.glass-card-3d` with hairline cards across the 4 metric cards, spline chart panel, and latest transactions table.
   - Standardize Indian Rupee numerals to `font-mono tabular-nums font-bold`.
   - Streamline "INSTITUTIONAL CHECKLIST" to high-density hairline badges.
   - Retain 100% of mobile greeting, dismissible Tally banner, 2×2 grid, and recent transaction stream.
2. **`src/pages/Sales.tsx`**:
   - Elevate the 4 desktop KPI cards to hairline cards with compact labels.
   - Refactor the desktop transactions table into high-density 36px rows with clean sticky headers.
   - Standardize payment status toggles into hairline pills (`● Paid`, `● Unpaid`, `● Partial`).
   - Keep `SalesInvoiceModal` and all invoice creation logic 100% untouched.
3. **`src/pages/Purchases.tsx`**:
   - Align the 3 KPI cards (`Total Purchases`, `Paid Out`, `Vendor Payables`) to the hairline specification.
   - Style `PendingInwardBanner` into a sleek, compact hairline notification banner.
   - Elevate desktop table to 36px row density with Auto-Synced status pills.
4. **`src/pages/Items.tsx`**:
   - Refactor the 4 inventory metric cards (`Stock Valuation`, `Low Stock`, `Total Catalog`, `Zero Stock`).
   - Simplify desktop table columns: crisp mono SKU/barcode, hairline stock badge (`● In Stock` / `● Low Stock` / `● Out of Stock`), right-aligned prices with subtle margin tags.
   - Maintain Quick Stock Adjustment dialog and Excel/Library import triggers.
5. **`src/pages/Parties.tsx`**:
   - Enhance balance directionality with Stripe-style badge pills (`Dr · To Collect ₹...` in emerald and `Cr · To Pay ₹...` in rose).
   - Style 1-tap WhatsApp and Call triggers with hairline button borders.
   - Retain full Ledger Reconciliation & Audit Dialog with zero regression.

---

## 5. Verification Method

To independently verify this survey and subsequent implementation:
1. **Automated Unit & Adversarial Test Suites**:
   ```bash
   cmd /c npx vitest run src/test/mobileDashboardRedesign.test.tsx
   cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts
   cmd /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx
   ```
   *Verified: `src/test/mobileDashboardRedesign.test.tsx` passed 13/13 tests cleanly in 44.68s.*

2. **TypeScript Strict Compilation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Ensures zero compile errors across all modified pages and imported types.*

3. **Visual Inspection Criteria**:
   - Desktop viewports (≥ 768px): Hairline 1px borders (`border-slate-200/80`), flat surface cards (`bg-white dark:bg-slate-900`), crisp tabular typography, high density (36-40px row height).
   - Mobile viewports (< 768px): Dedicated touch card stream, minimum 44×44px hit targets, no horizontal clipping, safe-area inset bottom padding.
   - Protected Areas Check: Verify `MobileCreateInvoice.tsx` and `SalesInvoiceModal.tsx` remain byte-for-byte identical.
