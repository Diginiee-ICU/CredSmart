# Milestone 2 Technical Blueprint: Desktop Landing Page Dual-Suite Redesign

**Author**: Explorer M2 Landing 1 (`teamwork_explorer`)  
**Target Files**: `src/pages/Landing.tsx` (Hero Section, Viewport Containment, `#suites` Anchor Architecture)  
**Parent Orchestrator**: `4ca3c226-daa7-4621-95f6-7c629c003e5f`  
**Date**: 2026-10-31  

---

## 1. Observation

### 1.1 Missing `#suites` Anchor & Broken Public Header Contract
- In `src/components/public/PublicHeader.tsx` (lines 64–65), the primary desktop navigation links target `/#suites`:
  ```tsx
  64: { label: "POS & Billing ERP", shortLabel: "POS Billing", href: "/#suites" },
  65: { label: "Workforce CRM", href: "/#suites" },
  ```
- In `PublicHeader.tsx` (lines 25–31), `findTargetElement` searches for `suites`, `billing-erp`, or `workforce-crm`:
  ```tsx
  25: const findTargetElement = (id: string) => {
  26:   return (
  27:     document.getElementById(id) ||
  28:     (id === "billing-erp" || id === "workforce-crm" ? document.getElementById("suites") : null) ||
  29:     (id === "suites" ? (document.getElementById("billing-erp") || document.getElementById("workforce-crm")) : null)
  30:   );
  31: };
  ```
- Direct grep of `src/pages/Landing.tsx` reveals the only existing anchor IDs are:
  - Line 455: `id="features"`
  - Line 561: `id="ecosystem"`
  - Line 657: `id="intelligence"`
  - Line 847: `id="download"`
- **Verbatim Finding**: Neither `id="suites"`, `id="billing-erp"`, nor `id="workforce-crm"` exists anywhere in `src/pages/Landing.tsx`. When users click "POS & Billing ERP" or "Workforce CRM" in `PublicHeader`, `document.getElementById` returns `null` and smooth scrolling fails silently.

### 1.2 Desktop Viewport Sprawling in Hero Section
- In `src/pages/Landing.tsx` (lines 345–452), the Hero section container has excessive vertical padding:
  ```tsx
  345: <section className="relative pt-8 sm:pt-14 pb-16 lg:pb-24 overflow-hidden border-b border-slate-200/70">
  ```
- Combined with a bloated headline (`text-[56px] leading-[1.1] mb-5` at line 363), oversized buttons (`h-12 sm:h-13 px-7 sm:px-8` at line 394), and a large download button block (`pt-2 pb-6` at line 413), the Hero section alone occupies over 720px in vertical height on desktop.
- On standard 768px–1080px monitors (with a 52px sticky header), the Hero section spills past the fold, forcing unnecessary scrolling to reach even primary CTAs or the dashboard preview.

### 1.3 Bloated Button Sizing Defects in `src/pages/Landing.tsx`
An exhaustive audit of button sizing in `src/pages/Landing.tsx` revealed multiple violations of `.agents/rules/minimal-design-system.md`:
1. **Hero Primary CTA** (lines 391–398):
   ```tsx
   className="w-full sm:w-auto h-12 sm:h-13 px-7 sm:px-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 ... shadow-xl shadow-blue-700/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
   ```
   *Defect*: Uses bloated `h-12 sm:h-13`, `px-7 sm:px-8`, and heavy `shadow-xl shadow-blue-700/25`.
2. **Hero Secondary Action** (lines 400–409):
   ```tsx
   className="w-full sm:w-auto h-12 sm:h-13 px-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold ... active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
   ```
   *Defect*: Uses bloated `h-12 sm:h-13`, `px-6`.
3. **Module Showcase CTAs** (lines 788–799):
   ```tsx
   790: className="h-11 px-6 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold"
   795: className="h-11 px-5 rounded-xl border-slate-300"
   ```
   *Defect*: Uses non-standard `h-11`, `px-6`, `px-5`.
4. **App Download Hub Action Buttons** (lines 914–922 and 973–981):
   ```tsx
   918: className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 no-underline cursor-pointer"
   977: className="w-full sm:w-auto h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 no-underline cursor-pointer"
   ```
   *Defect*: Uses non-standard `h-12`, `px-6`, `rounded-xl`.
5. **Bottom High-Conversion Banner CTAs** (lines 1225–1241):
   ```tsx
   1228: className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
   1237: className="w-full sm:w-auto h-13 px-6 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
   ```
   *Defect*: Uses bloated `h-13`, `px-8`, `shadow-2xl`.

### 1.4 Baseline Test & Forensic Integrity
- Running `npx vitest run src/test/publicShellComponents.test.tsx src/test/e2e/publicPages.e2e.test.tsx`:
  - Result: **77 passed (77)** across 2 test files (Duration: 73.80s).
- Running `node .agents/teamwork/auditor_m3/verify_protected.cjs`:
  - Result: **19 / 19 protected files untouched (0 diff)**. VERDICT: ZERO LINES MODIFIED.

---

## 2. Logic Chain

1. **Header-Page Interface Contract**:
   - `PublicHeader.tsx` is already fixed in Milestone 1 to dispatch smooth scrolling to `#suites` when on `/` (or navigate to `/#suites` from subpages).
   - Because `Landing.tsx` lacks `<section id="suites">`, this contract is broken. Adding `<section id="suites">` with child IDs `id="billing-erp"` and `id="workforce-crm"` will satisfy `findTargetElement` and immediately restore working anchor navigation for both "POS & Billing ERP" and "Workforce CRM" header links.

2. **Dual-Suite Brand Articulation**:
   - The current Hero headline ("Everything Your Business Needs. Completely Free.") and badge ("All-in-One Business Management Software") only vaguely imply generic billing.
   - CredSmart's actual enterprise architecture is dual-suite:
     - **Suite 1: POS & Billing ERP (`/billing/*`)**
     - **Suite 2: Workforce CRM (`/crm/*`)**
   - Aligning the Hero badge to `"CredSmart ERP & CRM Platform"` and headline to `"POS & Billing ERP & Workforce CRM. 100% Free."` directly articulates the value proposition without confusing customers.

3. **Desktop Viewport Containment**:
   - Reducing Hero top/bottom padding to `pt-5 sm:pt-8 lg:pt-10 pb-8 sm:pb-10 lg:pb-12` and refining headline scale to `text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px]` brings the entire Hero left column down to ~400px height.
   - Integrating with `HeroDashboardCard` (~420px height) yields a total Hero section height of ~480px–520px.
   - On a standard 1080p display (1080px height - 52px header = 1028px available viewport), this leaves ample room for immediate visibility without vertical clipping. On 768p displays, the Hero fits within a single screen fold.

4. **Button Standardization Token Rule**:
   - Replacing `h-12`/`h-13`/`px-8`/`rounded-xl` buttons with:
     - Hero CTA: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` (38px height)
     - Standard Actions: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height)
     - Small Action / Pill: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height)
   - This eliminates oversized bubble buttons and complies 100% with `minimal-design-system.md` Rule 1.

5. **Role-Based Direct Suite Launches**:
   - POS Launch button: calls `handleLaunchPos()`, sets `sessionStorage.setItem("credsmart_launch_portal_active", "billing")`, routes cashiers to `/checkout` and owners to `/billing/dashboard`.
   - CRM Launch button: calls `handleLaunchCrm()`, sets `sessionStorage.setItem("credsmart_launch_portal_active", "crm")`, routes to `/crm`.
   - This maintains 100% fidelity with `DUAL_SUITE_SPEC` in `publicPages.e2e.test.tsx` (Test T1.F8).

---

## 3. Caveats

- **Module Explorer Scope**: The Bounded Module Explorer (`max-h-[520px]`) in Section 4 is being detailed concurrently by Explorer M2 Landing 3 (`explorer_m2_landing_3`). Our blueprint coordinates cleanly by specifying the Section 1 (Hero) and Section 2 (`#suites`) boundaries.
- **HeroDashboardCard Internal Tabs**: The internal implementation of the dual POS/CRM segmented tabs inside `HeroDashboardCard.tsx` is being blueprint-designed by Explorer M2 Landing 2 (`explorer_m2_landing_2`). Our blueprint defines the wrapper container interface in `Landing.tsx`.
- **Protected Files**: No changes to protected invoice files or backend services are permitted or required.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 Step 1: Replace Hero Section in `src/pages/Landing.tsx`

Replace lines 345–452 of `src/pages/Landing.tsx` with the following screen-fitted, 50/50 split Hero layout:

```tsx
{/* ── SECTION 1: MASTER SCREEN-FITTED HERO SECTION (50/50 Split) ── */}
<section className="relative pt-5 sm:pt-8 lg:pt-10 pb-8 sm:pb-10 lg:pb-12 overflow-hidden border-b border-slate-200/70">
  {/* Subtle Ambient Background Mesh Gradients */}
  <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
  <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-orange-200/20 via-amber-100/15 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
      
      {/* ── LEFT COLUMN: DUAL-SUITE VALUE PROPOSITION (lg:col-span-6) ── */}
      <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
        
        {/* Dual-Suite Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs font-semibold mb-3 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>CredSmart ERP &amp; CRM Platform</span>
        </div>

        {/* Dual-Suite Main Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-black tracking-tight text-[#0F172A] leading-[1.15] mb-3">
          POS &amp; Billing ERP <br className="hidden sm:inline" />
          <span className="text-slate-800">&amp; Workforce CRM. </span>
          <span className="text-[#FF6A00]">100% Free.</span>
        </h1>

        {/* Concise Value Proposition (Zero Redundant Micro-Prose) */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 max-w-xl">
          High-speed retail counter billing, thermal ESC/POS printing, GST tax compliance, and GPS staff attendance payroll in a single unified platform.
        </p>

        {/* 3 Horizontal Feature Chips */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 border border-blue-100 text-slate-800 text-xs font-bold shadow-2xs">
            <span className="text-blue-600">⚡</span>
            <span>Retail POS &amp; GST</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-100 text-slate-800 text-xs font-bold shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>GPS Attendance &amp; Payroll</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50/90 border border-orange-100 text-slate-800 text-xs font-bold shadow-2xs">
            <span className="text-[#FF6A00]">🎁</span>
            <span>100% Free Forever</span>
          </div>
        </div>

        {/* Master Standard Action Buttons (h-9.5 px-4.5) */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto mb-4">
          <button
            type="button"
            onClick={handleStartFree}
            className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Free Now</span>
            <span>🚀</span>
          </button>

          <a
            href="/#suites"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("suites")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto h-9.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-semibold text-sm shadow-2xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Dual Suites</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>

        {/* Compact App Download Trigger Strip */}
        <div className="flex items-center justify-center lg:justify-start gap-2 pt-3 pb-3 border-t border-slate-200/60 w-full max-w-lg text-xs text-slate-500">
          <span className="font-semibold text-slate-700 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Download className="w-3 h-3 text-blue-600" /> Native Apps:
          </span>
          <button
            type="button"
            onClick={() => handleOpenDownload("android")}
            className="h-7 px-2.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>Android APK</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenDownload("desktop")}
            className="h-7 px-2.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Monitor className="w-3 h-3 text-blue-600" />
            <span>Windows PC</span>
          </button>
        </div>

        {/* Trust Checklist Row */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            100% Free Forever
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            Setup in Minutes
          </span>
        </div>

      </div>

      {/* ── RIGHT COLUMN: INTERACTIVE LIVE DASHBOARD PREVIEW DOCK (lg:col-span-6) ── */}
      <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:max-w-none">
        <HeroDashboardCard onStartFree={handleStartFree} />
      </div>

    </div>
  </div>
</section>
```

### 4.2 Step 2: Insert Dedicated `<section id="suites">` on `Landing.tsx`

Insert immediately after the Hero section and before the "Why Businesses Love CredSmart" section (line 453):

```tsx
{/* ── SECTION 2: DEDICATED DUAL-SUITE SHOWCASE (#suites) ── */}
<section id="suites" className="py-10 sm:py-14 bg-white border-b border-slate-200/70 scroll-mt-14">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    {/* Section Header */}
    <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs font-semibold mb-2 shadow-2xs">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <span>Enterprise Hybrid Architecture</span>
      </div>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
        Two Dedicated Suites. <span className="text-[#FF6A00]">One Unified Platform.</span>
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl mx-auto">
        Switch seamlessly between fast counter retail checkout and mobile field workforce operations, or run both concurrently under one business organization.
      </p>
    </div>

    {/* Dual Suite Showcase Grid (2 Balanced Cards) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      
      {/* ── SUITE A CARD: POS & BILLING ERP ── */}
      <div
        id="billing-erp"
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
      >
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
        
        <div>
          {/* Suite Badge & Target Role */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold font-mono">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              <span>Suite 1 &bull; Retail POS &amp; Billing ERP</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              Role: Cashier / Store Owner
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Retail POS &amp; Billing ERP
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Engineered for high-speed retail checkout, multi-godown stock control, barcode sticker printing, and official GST tax compliance.
          </p>

          {/* 6 Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">F1-F12 Fast Hotkey Billing</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">58mm &amp; 80mm ESC/POS Thermal</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">GSTR-1 JSON Schema 2.0 Export</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Multi-Godown Stock &amp; Batch Expiry</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Barcode Label Designer Studio</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">100% Offline SQLite Billing Mode</span>
            </div>
          </div>
        </div>

        {/* Live Metrics & Action Footer */}
        <div>
          {/* Micro Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Speed</span>
              <span className="text-xs font-black text-slate-800 font-mono">&lt; 50ms</span>
            </div>
            <div className="border-x border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Invoices</span>
              <span className="text-xs font-black text-slate-800 font-mono">Unlimited</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Cost</span>
              <span className="text-xs font-black text-emerald-600 font-mono">₹ 0 / Free</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLaunchPos}
              className="w-full sm:w-auto h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Launch POS &amp; Billing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              to="/features"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View POS Modules</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── SUITE B CARD: WORKFORCE CRM ── */}
      <div
        id="workforce-crm"
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
      >
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6A00] to-amber-500" />

        <div>
          {/* Suite Badge & Target Role */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold font-mono">
              <Users2 className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>Suite 2 &bull; Workforce CRM Platform</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              Role: Business Owner / HR
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Workforce CRM &amp; Operations
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Designed for store managers, field staff, and HR operations. Automated attendance, salary disbursement, team huddles, and task Kanban.
          </p>

          {/* 6 Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">GPS Geofenced Mobile Attendance</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Automated Monthly Salary Slips</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Task Delegation &amp; Kanban Boards</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Multi-Tier RBAC Staff Permissions</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Team Meet, Huddle &amp; Notices</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Bilingual Hindi/English Voice Copilot</span>
            </div>
          </div>
        </div>

        {/* Live Metrics & Action Footer */}
        <div>
          {/* Micro Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Accuracy</span>
              <span className="text-xs font-black text-slate-800 font-mono">100% Audit</span>
            </div>
            <div className="border-x border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Staff</span>
              <span className="text-xs font-black text-slate-800 font-mono">Unlimited</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Cost</span>
              <span className="text-xs font-black text-emerald-600 font-mono">₹ 0 / Free</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLaunchCrm}
              className="w-full sm:w-auto h-9 px-4 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-xs shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Launch Workforce CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              to="/features"
              className="text-xs font-semibold text-[#FF6A00] hover:text-[#E65F00] flex items-center gap-1"
            >
              <span>View CRM Modules</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

    </div>

  </div>
</section>
```

### 4.3 Step 3: Refine Button Sizing in Remaining Sections

Replace bloated button classes throughout `Landing.tsx`:
- **Module CTAs** (lines 788–799):
  - Primary button: `h-8.5 px-4 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-xs shadow-xs`
  - Secondary button: `h-8.5 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs`
- **Native App Download Hub Buttons** (lines 918, 977):
  - Android button: `h-9 px-4.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs`
  - Windows button: `h-9 px-4.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs`
- **Bottom Conversion Banner CTAs** (lines 1228, 1237):
  - Primary CTA: `h-9.5 px-4.5 rounded-lg bg-white hover:bg-slate-50 text-blue-800 font-bold text-sm shadow-xs`
  - Download CTA: `h-9.5 px-4 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white border border-white/20 font-semibold text-xs shadow-xs`
- **Search Inputs** (lines 1148, 1364):
  - Standardize to `h-9 pl-9 pr-3 rounded-lg text-xs`

---

## 5. Verification Method

### 5.1 Automated Unit & E2E Tests
Execute via terminal:
```bash
cmd /c npx vitest run src/test/publicShellComponents.test.tsx src/test/e2e/publicPages.e2e.test.tsx
```
**Expected Outcome**: 77 / 77 tests pass with exit code 0.

### 5.2 Forensic Protected Files Audit
Execute via terminal:
```bash
node .agents/teamwork/auditor_m3/verify_protected.cjs
```
**Expected Outcome**: 19 / 19 files untouched with 0 diff.

### 5.3 Manual / DOM Invariance Checklist
1. Inspect `Landing.tsx` in browser or test harness:
   - Verify `document.getElementById('suites')` is not null.
   - Verify `document.getElementById('billing-erp')` and `document.getElementById('workforce-crm')` exist.
   - Click "POS & Billing ERP" link in `PublicHeader` -> verify smooth scroll to `#suites`.
   - Click "Workforce CRM" link in `PublicHeader` -> verify smooth scroll to `#suites`.
2. Sizing Verification:
   - Check that no button in the Hero or `#suites` sections has `h-11`, `h-12`, `h-13`, `px-8`, or `rounded-3xl`.
   - Verify Hero CTAs use `h-9.5 px-4.5 rounded-lg text-sm font-semibold`.
   - Verify `#suites` CTAs use `h-9 px-4 rounded-lg text-xs font-semibold`.

### 5.4 Invalidation Conditions
- Any diff detected in `src/components/invoices/mobile/*`, `SalesInvoiceModal.tsx`, `PurchaseInvoiceModal.tsx`, or any of the 19 protected files.
- Absence of `id="suites"` on `Landing.tsx`.
- Introduction of any `rounded-3xl` bubble button classes.
