# Technical Blueprint & Handoff Report: Dual-Suite Interactive Preview Dock

**Agent**: Explorer M2 Landing 2 (`explorer_m2_landing_2`)  
**Target File**: `src/components/public/HeroDashboardCard.tsx`  
**Parent Orchestrator**: `4ca3c226-daa7-4621-95f6-7c629c003e5f`  
**Milestone**: M2 Landing Page Redesign — Dual-Suite Interactive Preview Dock  
**Date**: 2026-10-31  

---

## 1. Observation

Direct observations from codebase inspection, test executions, and verification audits:

### A. Current File Analysis (`src/components/public/HeroDashboardCard.tsx`)
- **Total Lines**: 380 lines.
- **Current State**:
  - `activeTab`: `"dashboard" | "sales" | "pos" | "inventory"` (defaults to `"dashboard"`).
  - `selectedMetric`: `"collect" | "pay" | "cash"` (defaults to `"cash"`).
- **Current Layout & Visual Structure**:
  - Outer container: `rounded-2xl bg-white border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5 overflow-hidden`.
  - Top browser-like bar (lines 81–125): Dark navy bar (`bg-slate-900 border-b border-slate-800`), macOS window dots (`bg-rose-500/90`, `bg-amber-500/90`, `bg-emerald-500/90`), `CredSmartShieldIcon`, brand text `CredSmart`, center badge `• LIVE RECONCILED` (`animate-ping`), right action button `+ Bill ▾`, and user avatar `Y`.
  - Body (lines 127–374): `grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-slate-50/50`.
    - Left mini-sidebar (`md:col-span-3`): Lists 9 ERP buttons (`Dashboard`, `Sales`, `POS Billing`, `Purchases`, `Items / Inventory`, `Customers`, `Suppliers`, `Reports`, `Settings`).
    - Right area (`md:col-span-9`): Search input, 3 isometric 3D metric tiles (`TO COLLECT`, `TO PAY`, `CASH & BANK`), a 4-metric overview strip, a recent transactions list (`Recent Reconciled Activity`), and footer (`Auto-Synced Cloud Ledger`, `CredSmart v1.1.4`).
- **Deficiency Identified**:
  - The card only showcases ERP/billing functions. The second core pillar of CredSmart — **Workforce CRM** (attendance geofencing, field task dispatch, staff salary ledger, and lead pipeline) — is completely absent from the Hero card.

### B. Existing Test Suite Contracts (`src/test/e2e/publicPages.e2e.test.tsx`)
Four distinct tests directly inspect and interact with `HeroDashboardCard`:
1. **Line 277 (`T1.F7`)**:
   ```tsx
   expect(screen.getByText(/LIVE RECONCILED/i)).toBeInTheDocument();
   expect(screen.getByText(/Recent Reconciled Activity/i)).toBeInTheDocument();
   expect(screen.getByText(/Auto-Synced Cloud Ledger/i)).toBeInTheDocument();
   expect(screen.getByRole("button", { name: /POS Billing/i })).toBeInTheDocument();
   expect(screen.getByRole("button", { name: /Sales/i })).toBeInTheDocument();
   expect(screen.getByRole("button", { name: /Items \/ Inventory/i })).toBeInTheDocument();
   ```
2. **Line 781 (`T2.11`)**:
   ```tsx
   const collectTile = screen.getByText(/TO COLLECT/i);
   fireEvent.click(collectTile);
   const payTile = screen.getByText(/TO PAY/i);
   fireEvent.click(payTile);
   const cashTile = screen.getByText(/CASH & BANK/i);
   fireEvent.click(cashTile);
   expect(cashTile).toBeInTheDocument();
   ```
3. **Line 878 (`T3.2`)**:
   ```tsx
   const salesTab = screen.getByRole("button", { name: /Sales/i });
   fireEvent.click(salesTab);
   const posTab = screen.getByRole("button", { name: /POS Billing/i });
   fireEvent.click(posTab);
   const itemsTab = screen.getByRole("button", { name: /Items \/ Inventory/i });
   fireEvent.click(itemsTab);
   expect(itemsTab).toBeInTheDocument();
   ```
4. **Line 1017 (`T3.11`)**:
   ```tsx
   expect(screen.getByText(/LIVE RECONCILED/i)).toBeInTheDocument();
   expect(screen.getByText(/Auto-Synced Cloud Ledger/i)).toBeInTheDocument();
   expect(screen.getByText(/CredSmart v1\.1\.4/i)).toBeInTheDocument();
   ```

### C. Quarantined Invariance Audit (`node .agents/teamwork/auditor_m3/verify_protected.cjs`)
- Verbatim execution output:
  ```
  === STARTING FORENSIC AUDIT: 19 QUARANTINED PROTECTED FILES ===
  Summary: 19 / 19 protected files untouched.
  VERDICT: ZERO LINES MODIFIED IN ALL 19 QUARANTINED FILES.
  ```

### D. Test Baseline Run
- `cmd /c npx vitest run src/test/e2e/publicPages.e2e.test.tsx` -> **59 passed (59)** in 38.18s.
- `cmd /c npx vitest run src/test/publicShellComponents.test.tsx` -> **18 passed (18)** in 6.91s.
- `cmd /c npx tsc --noEmit` -> **Exit Code 0** (clean compilation).

---

## 2. Logic Chain

1. **Dual-Suite Representation Requirement**:
   - As established in `PROJECT.md` and `ORIGINAL_REQUEST.md`, CredSmart is a unified dual-suite platform comprising:
     1. **Retail POS & Billing ERP**: High-speed retail billing, barcode lookup, GST tax invoicing, inventory management.
     2. **Workforce CRM**: Real-time staff attendance ledger, GPS geofencing, field task dispatching, lead stage kanban, and salary tracking.
   - The interactive dock in `HeroDashboardCard.tsx` must allow prospective merchants and business owners to preview both suites with an instant 1-click tab toggle without leaving the Hero viewport.

2. **Test Non-Regression Invariant**:
   - Because `publicPages.e2e.test.tsx` tests `HeroDashboardCard` under default initial mount without passing props, the default suite MUST be `"pos"` (`activeSuite = defaultSuite || "pos"`).
   - In View A (`pos`), all required test targets (`LIVE RECONCILED`, `Recent Reconciled Activity`, `Auto-Synced Cloud Ledger`, `CredSmart v1.1.4`, sidebar buttons `POS Billing`, `Sales`, `Items / Inventory`, and metric tiles `TO COLLECT`, `TO PAY`, `CASH & BANK`) must remain in the DOM and respond to `fireEvent.click()`.
   - This ensures 100% backward compatibility with zero test regressions.

3. **Minimal Design System & Viewport Containment**:
   - The master design system (`.agents/rules/minimal-design-system.md` and `credsmart-minimal-design-system/SKILL.md`) dictates:
     - 1px hairline borders: `border-slate-200/80` (light), `border-slate-800` (dark).
     - Standard action button heights: `h-7` (table/small) or `h-8` (standard action).
     - Tabular monospace numbers: `font-mono tabular-nums` for all currency amounts (`₹`), barcodes, quantities, and timestamps.
     - Viewport height containment: Total card height must be bounded (~440px–460px) so the desktop Landing page hero fits within standard 1080p and 768p viewports alongside the Hero left column.

4. **Interactive Architecture**:
   - **Segmented Control**: An ergonomic 2-tab control docked immediately beneath the browser bar:
     `[ 🛒 Retail POS & Billing ]` | `[ 👥 Workforce CRM ]`.
   - **View A (Retail POS & Billing)**:
     - Fast-billing Barcode Scan Bar (`Barcode` icon, `⌘K / F2` shortcut indicator).
     - 3 Isometric 3D Metric Tiles (`TO COLLECT`, `TO PAY`, `CASH & BANK`) with interactive selection rings.
     - POS Terminal Cart Strip with item names, barcodes, quantities, and tabular monospace prices (`font-mono tabular-nums`).
     - Real-time GST calculation breakdown (CGST 2.5% + SGST 2.5%) and Total Due (`₹ 869.40`).
     - Quick Payment Tender Buttons (`[⚡ Cash F4]`, `[📲 UPI F6]`, `[💳 Card F7]`, `[🧾 Udhar]`).
     - Reconciled Transactions Feed (`Recent Reconciled Activity`).
   - **View B (Workforce CRM Operations Board)**:
     - CRM KPI Summary Strip (`Staff On Duty: 8/10 Active`, `Field Tasks: 18 Done`, `Lead Pipeline: ₹ 4,85,000`, `Daily Sales: ₹ 84,200`).
     - Real-time Staff Attendance Ledger with GPS Geofence Indicators: Staff names, roles, in-times (`09:02 AM`), geofence distance tags (`📍 Connaught Place Store (4m)`), and biometric verification pills.
     - Field Task Dispatch Board: Live tasks with assignees, ETAs, and transaction values.
     - Lead Stage Kanban Pills: New inquiries, negotiation stages, and closed-won metrics.
   - **Common Footer Strip**:
     - `• Auto-Synced Cloud Ledger` (emerald status).
     - `CredSmart v1.1.4` (mono text).
     - Active mode indicator chip (`🛒 POS Active` / `👥 CRM Active`).

---

## 3. Caveats

1. **Quarantined Files**:
   - Quarantined invoice files (`src/components/invoices/mobile/*`, etc.) are 100% excluded from modification.
2. **Read-Only Explorer Scope**:
   - As an explorer, no modifications have been made directly to `src/components/public/HeroDashboardCard.tsx`.
   - The reference implementation has been fully validated in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2\proposed_HeroDashboardCard.tsx`.
3. **Props Contract**:
   - `HeroDashboardCardProps` is extended optionally with `defaultSuite?: "pos" | "crm"`, keeping `className?: string` and `onStartFree?: () => void` intact.

---

## 4. Conclusion & Complete Technical Blueprint

### A. Component Props & Interface
```tsx
export interface HeroDashboardCardProps {
  className?: string;
  onStartFree?: () => void;
  defaultSuite?: "pos" | "crm";
}
```

### B. State Management
```tsx
const [activeSuite, setActiveSuite] = useState<"pos" | "crm">(defaultSuite);
const [activeTab, setActiveTab] = useState<string>("dashboard");
const [selectedMetric, setSelectedMetric] = useState<"collect" | "pay" | "cash">("cash");
const [activeTender, setActiveTender] = useState<"cash" | "upi" | "card" | "udhar">("cash");
```

### C. Segmented Control Dock Blueprint
```tsx
{/* ── DUAL-SUITE INTERACTIVE SEGMENTED CONTROL BAR ── */}
<div className="bg-slate-100/90 border-b border-slate-200/80 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0">
  <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 border border-slate-300/60 shadow-2xs">
    {/* Suite A: Retail POS & Billing */}
    <button
      type="button"
      onClick={() => setActiveSuite("pos")}
      className={cn(
        "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
        activeSuite === "pos"
          ? "bg-white text-blue-700 shadow-xs"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      <ShoppingCart className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="whitespace-nowrap">Retail POS &amp; Billing</span>
      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-100/80 text-blue-800 font-semibold hidden sm:inline">
        ERP
      </span>
    </button>

    {/* Suite B: Workforce CRM */}
    <button
      type="button"
      onClick={() => setActiveSuite("crm")}
      className={cn(
        "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
        activeSuite === "crm"
          ? "bg-white text-blue-700 shadow-xs"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      <Users2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
      <span className="whitespace-nowrap">Workforce CRM</span>
      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-100/80 text-indigo-800 font-semibold hidden sm:inline">
        HR &amp; Leads
      </span>
    </button>
  </div>

  <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 font-mono">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
    <span>{activeSuite === "pos" ? "POS Terminal Active" : "Geofence Engine Active"}</span>
  </div>
</div>
```

### D. View A: Retail POS Billing Terminal Blueprint
```tsx
{/* Top Search & Barcode Scan Bar */}
<div className="flex items-center justify-between gap-2">
  <div className="relative flex-1">
    <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      readOnly
      placeholder="Scan barcode or type item (F2)..."
      className="w-full h-7 pl-7 pr-16 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none cursor-default shadow-2xs"
    />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">
      ⌘K / F2
    </span>
  </div>
  <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs font-mono">
    <span>Store #01</span>
  </div>
</div>

{/* Top 3 Isometric Metric Tiles */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
  {/* TO COLLECT */}
  <div
    onClick={() => setSelectedMetric("collect")}
    className={cn(
      "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
      selectedMetric === "collect" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200/90"
    )}
  >
    <div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 uppercase tracking-wider font-mono">
        <ArrowDownLeft className="w-3 h-3" />
        <span>To Collect</span>
      </div>
      <div className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">₹ 0</div>
      <div className="text-[10px] text-slate-500 font-medium">Outstanding Due</div>
    </div>
    <Collect3DIcon className="w-8 h-8 shrink-0" />
  </div>

  {/* TO PAY */}
  <div
    onClick={() => setSelectedMetric("pay")}
    className={cn(
      "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
      selectedMetric === "pay" ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200/90"
    )}
  >
    <div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-orange-700 uppercase tracking-wider font-mono">
        <ArrowUpRight className="w-3 h-3" />
        <span>To Pay</span>
      </div>
      <div className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">₹ 0</div>
      <div className="text-[10px] text-slate-500 font-medium">Pending Bills</div>
    </div>
    <Pay3DIcon className="w-8 h-8 shrink-0" />
  </div>

  {/* CASH & BANK */}
  <div
    onClick={() => setSelectedMetric("cash")}
    className={cn(
      "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
      selectedMetric === "cash" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200/90"
    )}
  >
    <div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">
        <Landmark className="w-3 h-3" />
        <span>Cash &amp; Bank</span>
      </div>
      <div className="text-base sm:text-lg font-black text-amber-600 font-mono tabular-nums">₹ 97,678</div>
      <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
        <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
      </div>
    </div>
    <Bank3DIcon className="w-8 h-8 shrink-0" />
  </div>
</div>

{/* POS Terminal Bill Cart Strip */}
<div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
    <div className="flex items-center gap-1.5 font-bold text-slate-800">
      <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
      <span>POS Terminal Bill Cart</span>
      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">3 Items</span>
    </div>
    <div className="text-[10px] font-mono text-emerald-600 font-semibold">
      GST Compliant (CGST+SGST 5%)
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
    {/* Cart Line Items */}
    <div className="sm:col-span-7 space-y-1">
      {activeCartItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[11px]"
        >
          <div className="truncate pr-2">
            <span className="font-semibold text-slate-900 block truncate">{item.name}</span>
            <span className="text-[10px] font-mono text-slate-400">Barcode #{item.barcode}</span>
          </div>
          <div className="text-right shrink-0 font-mono tabular-nums">
            <span className="text-slate-500 mr-2 text-[10px]">×{item.qty}</span>
            <span className="font-bold text-slate-900">₹ {item.total.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>

    {/* Bill Summary & Tender Buttons */}
    <div className="sm:col-span-5 flex flex-col justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100/70">
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal:</span>
          <span className="font-mono tabular-nums font-medium">₹ 828.00</span>
        </div>
        <div className="flex justify-between text-slate-500 text-[10px]">
          <span>GST (2.5% + 2.5%):</span>
          <span className="font-mono tabular-nums">₹ 41.40</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-blue-200/60 text-xs">
          <span>Total Due:</span>
          <span className="font-mono tabular-nums text-blue-700 font-black">₹ 869.40</span>
        </div>
      </div>

      {/* Quick Tender Buttons */}
      <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-blue-200/50">
        {[
          { id: "cash", label: "Cash F4" },
          { id: "upi", label: "UPI F6" },
          { id: "card", label: "Card F7" },
          { id: "udhar", label: "Udhar" },
        ].map((tender) => (
          <button
            key={tender.id}
            type="button"
            onClick={() => setActiveTender(tender.id as any)}
            className={cn(
              "py-1 px-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate",
              activeTender === tender.id
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            )}
          >
            {tender.label}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>

{/* Recent Reconciled Activity */}
<div>
  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
    <span>Recent Reconciled Activity</span>
    <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline font-mono">
      View Ledger &rarr;
    </span>
  </div>

  <div className="space-y-1">
    {recentTransactions.map((tx) => (
      <div
        key={tx.id}
        className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors text-[11px]"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{tx.party}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {tx.id} &bull; {tx.type}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-black text-slate-900 block leading-tight font-mono tabular-nums">
            {tx.amount}
          </span>
          <span className={cn("inline-block px-1 py-0.2 rounded text-[10px] font-bold border", tx.statusColor)}>
            {tx.status}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>
```

### E. View B: Workforce CRM Operations Board Blueprint
```tsx
{/* Top CRM Summary Metrics Strip */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
      Staff On Duty
    </span>
    <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
      8 / 10 Active
    </span>
    <span className="text-[10px] text-emerald-600 font-semibold block">80% In Geofence</span>
  </div>

  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
      Field Tasks
    </span>
    <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
      18 Done
    </span>
    <span className="text-[10px] text-blue-600 font-semibold block">4 In Progress</span>
  </div>

  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block font-mono">
      Lead Pipeline
    </span>
    <span className="text-sm font-black text-indigo-700 font-mono tabular-nums">
      ₹ 4,85,000
    </span>
    <span className="text-[10px] text-slate-500 block">14 Hot Inquiries</span>
  </div>

  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block font-mono">
      Daily Sales Reconciled
    </span>
    <span className="text-sm font-black text-emerald-700 font-mono tabular-nums">
      ₹ 84,200
    </span>
    <span className="text-[10px] text-slate-500 block">Auto Logged</span>
  </div>
</div>

{/* Real-Time Staff Attendance Ledger with GPS Geofence Indicators */}
<div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
    <div className="flex items-center gap-1.5 font-bold text-slate-800">
      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
      <span>Real-Time Staff Attendance &amp; GPS Geofence</span>
    </div>
    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
      📍 100% Geofence Accuracy
    </span>
  </div>

  <div className="space-y-1">
    {staffAttendance.map((st) => (
      <div
        key={st.id}
        className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50/70 border border-slate-100 text-[11px]"
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              st.statusType === "emerald"
                ? "bg-emerald-500"
                : st.statusType === "blue"
                ? "bg-blue-500"
                : "bg-amber-500"
            )}
          />
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{st.name}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="font-medium text-slate-600">{st.role}</span>
              <span>&bull;</span>
              <span className="font-mono text-slate-400">In {st.inTime}</span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-600 block leading-tight">
            📍 {st.geofence}
          </span>
          <span
            className={cn(
              "inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border",
              st.statusType === "emerald"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : st.statusType === "blue"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}
          >
            {st.status}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>

{/* Field Task Dispatch Board & Lead Stage Kanban Strip */}
<div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
  {/* Field Task Dispatch Board */}
  <div className="sm:col-span-7 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
    <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 text-[11px] font-bold text-slate-800">
      <span className="flex items-center gap-1">
        <Navigation className="w-3 h-3 text-blue-600" />
        <span>Field Task Dispatch</span>
      </span>
      <span className="text-[10px] text-blue-600 font-mono font-semibold">2 Active</span>
    </div>
    <div className="space-y-1">
      {fieldTasks.map((task) => (
        <div
          key={task.id}
          className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[10px] flex items-center justify-between"
        >
          <div className="truncate pr-2">
            <span className="font-bold text-slate-900 block truncate">{task.title}</span>
            <span className="text-slate-500">
              Assigned to <strong className="text-slate-700">{task.assignee}</strong> &bull; ETA {task.eta}
            </span>
          </div>
          <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
            {task.value}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Lead Stage Kanban Pills */}
  <div className="sm:col-span-5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-800">
      <span className="flex items-center gap-1">
        <Target className="w-3 h-3 text-indigo-600" />
        <span>Lead Stage Kanban</span>
      </span>
      <span className="text-[10px] font-mono text-indigo-600 font-bold">₹ 4.8L</span>
    </div>
    <div className="grid grid-cols-2 gap-1 my-1 text-[10px]">
      <div className="p-1 rounded bg-slate-50 border border-slate-100 text-center">
        <span className="text-slate-400 block font-mono">New</span>
        <strong className="text-slate-900 font-mono tabular-nums">14 Inquiries</strong>
      </div>
      <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-center">
        <span className="text-indigo-500 block font-mono">Negotiation</span>
        <strong className="text-indigo-800 font-mono tabular-nums">6 Deals</strong>
      </div>
    </div>
    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
      <span>Closed Won This Month:</span>
      <span className="font-mono tabular-nums font-bold text-emerald-600">28 Deals (₹ 6.4L)</span>
    </div>
  </div>
</div>
```

---

## 5. Verification Method

To independently verify the technical blueprint and subsequent implementation:

1. **Type & Compilation Check**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected Result*: Exits with code 0. Zero TypeScript errors.

2. **Public Pages E2E Suite Verification**:
   ```powershell
   cmd /c npx vitest run src/test/e2e/publicPages.e2e.test.tsx
   ```
   *Expected Result*: All 59 tests pass (specifically T1.F7, T2.11, T3.2, and T3.11).

3. **Public Shell Components Suite Verification**:
   ```powershell
   cmd /c npx vitest run src/test/publicShellComponents.test.tsx
   ```
   *Expected Result*: All 18 tests pass.

4. **Quarantine Invariance Check**:
   ```powershell
   node .agents/teamwork/auditor_m3/verify_protected.cjs
   ```
   *Expected Result*: 19 / 19 protected files untouched (0 diffs).

5. **Recommended Dual-Suite Unit Test Extension**:
   ```tsx
   it("renders dual-suite preview dock with Retail POS and Workforce CRM tabs and switches views", () => {
     render(<HeroDashboardCard />);

     // 1. Initial State: Retail POS & Billing
     const posTab = screen.getByRole("button", { name: /Retail POS & Billing/i });
     const crmTab = screen.getByRole("button", { name: /Workforce CRM/i });
     expect(posTab).toBeInTheDocument();
     expect(crmTab).toBeInTheDocument();
     expect(screen.getByText(/POS Terminal Bill Cart/i)).toBeInTheDocument();
     expect(screen.getByText(/₹ 869\.40/i)).toBeInTheDocument();

     // 2. Switch to Workforce CRM
     fireEvent.click(crmTab);
     expect(screen.getByText(/Real-Time Staff Attendance & GPS Geofence/i)).toBeInTheDocument();
     expect(screen.getByText(/Rajesh Kumar/i)).toBeInTheDocument();
     expect(screen.getByText(/Field Task Dispatch/i)).toBeInTheDocument();
     expect(screen.getByText(/Lead Stage Kanban/i)).toBeInTheDocument();

     // 3. Switch back to POS
     fireEvent.click(posTab);
     expect(screen.getByText(/POS Terminal Bill Cart/i)).toBeInTheDocument();
   });
   ```

*Reference file ready for implementation*:  
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2\proposed_HeroDashboardCard.tsx`
