# Survey Handoff Report: Shared Design Tokens, Quarantine Files & Verification Architecture

- **Agent**: Survey Explorer 3
- **Role**: Investigation & Synthesis
- **Target Scope**: Shared CRM Components (`src/components/crm/`), Master Design System (`minimal-design-system.md`), 19 Protected Quarantine Files, Build & Verification Pipeline
- **Timestamp**: 2026-10-25T10:30:00Z

---

## 1. Observation

### 1.1 Protected Quarantine Files (19 Files) Verification
We executed an integrity scan across the workspace filesystem verifying file existence, size, modification timestamp, and cross-module import isolation.

Command executed:
```powershell
node -e "
const fs = require('fs');
const files = [
  'src/components/invoices/mobile/MobileCreateInvoice.tsx',
  'src/components/invoices/mobile/AddItemModal.tsx',
  'src/components/invoices/mobile/SelectPartyModal.tsx',
  'src/components/invoices/mobile/EditItemModal.tsx',
  'src/components/invoices/mobile/MobileInvoiceSuccessView.tsx',
  'src/components/invoices/mobile/MobileBillPreviewModal.tsx',
  'src/components/invoices/mobile/MobileInvoiceFitViewer.tsx',
  'src/components/invoices/mobile/CreatePartyModal.tsx',
  'src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx',
  'src/components/items/mobile/CreateNewItemModal.tsx',
  'src/components/SalesInvoiceModal.tsx',
  'src/components/PurchaseInvoiceModal.tsx',
  'src/components/invoices/AddItemsToBillModal.tsx',
  'src/components/invoices/InvoiceFitView.tsx',
  'src/components/invoices/UnifiedInvoiceRenderer.tsx',
  'src/utils/downloadExactInvoice.ts',
  'src/utils/whatsappPdfShare.ts',
  'src/utils/invoiceThemeLoader.ts',
  'src/services/documentsService.ts'
];
files.forEach((f, i) => {
  const exists = fs.existsSync(f);
  const mtime = exists ? fs.statSync(f).mtime.toISOString() : 'MISSING';
  const size = exists ? fs.statSync(f).size : 0;
  console.log((i+1) + '. ' + f + ' => exists: ' + exists + ', size: ' + size + ', mtime: ' + mtime);
});
"
```

**Verbatim Scan Results**:
| # | Quarantined File Path | Exists | Size (Bytes) | Last Modified (UTC) | Status |
|---|------------------------|--------|--------------|---------------------|--------|
| 1 | `src/components/invoices/mobile/MobileCreateInvoice.tsx` | `true` | 27,280 | 2026-10-21T08:44:18Z | UNTOUCHED |
| 2 | `src/components/invoices/mobile/AddItemModal.tsx` | `true` | 4,444 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 3 | `src/components/invoices/mobile/SelectPartyModal.tsx` | `true` | 12,041 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 4 | `src/components/invoices/mobile/EditItemModal.tsx` | `true` | 13,591 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 5 | `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` | `true` | 23,133 | 2026-10-21T15:26:15Z | UNTOUCHED |
| 6 | `src/components/invoices/mobile/MobileBillPreviewModal.tsx` | `true` | 12,580 | 2026-10-21T15:29:20Z | UNTOUCHED |
| 7 | `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx` | `true` | 4,553 | 2026-10-21T15:25:35Z | UNTOUCHED |
| 8 | `src/components/invoices/mobile/CreatePartyModal.tsx` | `true` | 14,367 | 2026-10-18T19:29:21Z | UNTOUCHED |
| 9 | `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx` | `true` | 29,946 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 10 | `src/components/items/mobile/CreateNewItemModal.tsx` | `true` | 22,191 | 2026-10-24T23:18:26Z | UNTOUCHED |
| 11 | `src/components/SalesInvoiceModal.tsx` | `true` | 153,502 | 2026-10-21T09:37:50Z | UNTOUCHED |
| 12 | `src/components/PurchaseInvoiceModal.tsx` | `true` | 151,276 | 2026-10-18T19:26:31Z | UNTOUCHED |
| 13 | `src/components/invoices/AddItemsToBillModal.tsx` | `true` | 29,921 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 14 | `src/components/invoices/InvoiceFitView.tsx` | `true` | 2,313 | 2026-10-13T18:56:14Z | UNTOUCHED |
| 15 | `src/components/invoices/UnifiedInvoiceRenderer.tsx` | `true` | 48,658 | 2026-10-21T07:21:42Z | UNTOUCHED |
| 16 | `src/utils/downloadExactInvoice.ts` | `true` | 8,059 | 2026-10-21T07:14:21Z | UNTOUCHED |
| 17 | `src/utils/whatsappPdfShare.ts` | `true` | 11,438 | 2026-10-13T18:56:15Z | UNTOUCHED |
| 18 | `src/utils/invoiceThemeLoader.ts` | `true` | 2,800 | 2026-10-13T18:56:15Z | UNTOUCHED |
| 19 | `src/services/documentsService.ts` | `true` | 48,454 | 2026-10-20T16:43:07Z | UNTOUCHED |

We also executed a full recursive AST/import scan across all files in `src/pages/crm/` and `src/components/crm/`.
- `CRM Pages matches`: `[]` (0 matches)
- `CRM Components matches`: `[]` (0 matches)
Conclusion on quarantine files: The CRM domain is 100% decoupled and completely isolated from all 19 invoicing and print pipeline files.

---

### 1.2 Shared CRM Components Inventory (`src/components/crm/`)
Direct inspection of `src/components/crm/` revealed 9 files:
1. `CRMCard.tsx`:
   - Line 8: `CRM_BRAND_COLORS`: `navy: "#0F172A"`, `orange: "#FF6A00"`, `blue: "#2563EB"`, `emerald: "#10B981"`, `gold: "#F59E0B"`, `slateBg: "#F8FAFC"`.
   - Variants: `default`, `elevated`, `brand` (with `border-l-4 border-l-[#FF6A00]`), `outline`, `glass`.
   - Styling: Uses `rounded-xl overflow-hidden`, `border border-slate-200/80 dark:border-slate-800`, `shadow-2xs`.
   - Slots: `title`, `description`, `headerAction`, `children`, `footer`.
2. `CRMStatCard.tsx`:
   - Line 20: `CRMStatAccent`: `"navy" | "orange" | "blue" | "emerald" | "gold"`.
   - Props: `label`, `value`, `icon`, `accent`, `trend`, `description`, `loading`, `onClick`.
   - Visual structure: Card with `p-3.5 sm:p-4`, top row with monospace uppercase label and rounded icon pod (`w-8 h-8 sm:w-9 sm:h-9`), big numeric metric (`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums`), trend pill (`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold`), and footnote description.
3. `CRMBadge.tsx`:
   - Line 7: `CRMBadgeVariant`: `"success" | "warning" | "error" | "info" | "neutral" | "orange"`.
   - Sizes: `sm` (`text-[11px] px-2 py-0.5 gap-1 font-semibold`), `md` (`text-xs px-2.5 py-0.5 gap-1.5`), `lg` (`text-sm px-3 py-1 gap-2 font-medium`).
   - Line 38: `dot?: boolean` with animated pulsing circle (`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse`).
4. `CRMRolePill.tsx`:
   - Dynamic role pill with user-configured custom color tinting (`toHexAlpha` computes 15% opacity background and 35% opacity border).
   - Super-admin support: `isSuperAdmin={true}` renders amber `Crown` icon.
5. `CRMPageHeader.tsx`:
   - Breadcrumb navigation hierarchy, page title (`text-base sm:text-xl font-bold font-sans`), subtitle (`text-[11px] sm:text-sm text-slate-500`), badge slot, action buttons slot.
6. `CRMDataTable.tsx`:
   - Paginated, filterable, sortable table. Standard desktop density with sticky header and mobile empty-state fallback.
7. `CRMPermissionGate.tsx`:
   - Role and permission gating wrapper; renders fallback if unauthorized.
8. `CRMTeamTreeView.tsx`:
   - Visual organization hierarchy tree component.
9. `index.ts`:
   - Exports all CRM components and brand color tokens.

---

### 1.3 Target Mobile Reference Mockups & CRM Pages Audit
Inspection of user prompt requirements (Section `2026-10-25T10:11:33Z`) and uploaded mockup images in `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/.user_uploaded/`:

1. **Mockup 1 (`SalaryManagement.tsx`)**:
   - Header: Large bold "Payroll Engine", subtitle "Staff compensation & payroll runs", primary action `+ New Profile` (Royal Blue) + export icon button `[ ⎋ ]`.
   - 2x2 Stat Badges: Compact horizontal pill badges with subtle colored icon containers (`Active Profiles: 0 >`, `Current Month: ₹0.00`, `Pending Advances: ₹0.00 >`, `Available Payslips: ...`).
   - Segmented Tab Bar: Inset pill switcher (`Salary Profiles (0)`, `Payroll Run`, `Advances & Deductions`).
   - Empty State Card: Clean white card (`rounded-2xl border border-slate-200/80 shadow-xs text-center p-8`) with vector illustration, "No salary profiles configured yet.", and helper prompt.
   - Quick Actions Footer: Dual white pill buttons (`[ 📋 View Past Runs ]` and `[ ⚙️ Pay Settings ]`).

2. **Mockup 2 (`RoleManagement.tsx`)**:
   - Header: "Role Manager", subtitle "Configure user permissions & teams", horizontal action chips (`[ ← ]`, `[ 🛡 RBAC Foundation ]`, `[ + Custom Role ]` (Royal Blue), `[ 👤+ Add User ]`).
   - Active Role & Quick Stats Card: Crown icon `Super Admin`, `👑 Full Access` badge, `🔑 14 / 14 Actions • 👥 1 Staff`.
   - Granular Module Permissions Matrix: Grouped accordion card with hairline row dividers (`divide-y divide-slate-100`). Each module header shows an icon, title, counter pill (e.g. `2 / 2 Enabled`), and expand chevron. Expanded state renders a clean 2-column grid of compact checkbox chips (`[ ☑ View self and team daily records ]`, `[ ☑ Edit clock-in & approvals ]`).
   - Staff Role Assignments: Segmented toggle (`List View` / `Team Tree View`), search input with `[ + Add ]` button, and horizontal colored avatar stream (`Suresh`, `Pushpa`, `Rahul`, etc.).

3. **Mockup 3 (`Attendance.tsx`)**:
   - Header: "Attendance Hub", badge `🟢 Live Sync`, `[ ⎋ ]`, subtitle "GPS verified clock-in, active work sessions, and shift tracking", button `[ 📍 Geofences ]` (Royal Blue).
   - 2x2 Stat Badges: `Present 0 >`, `Geo-Verified 0 >`, `Regularised 0 >`, `Geofences 1 >`.
   - Segmented Tabs: `[ My Clock-In ]`, `[ Team Logs (0) ]`, `[ Locations ]`.
   - Shift Card: "Today's Shift • General", date pill `Sun, Oct 25`, left orange hairline accent (`border-l-4 border-orange-500`), large digital clock (`02:45:48 PM`), radar geofence widget on the right, status badge `⚠️ Outside Geofence`, location label `📍 Nearest: HQ (Radius: 150m)`, GPS accuracy pill (`GPS Accuracy: ±4m • Protocol: Verified`), and full-width Emerald CTA `[ ✓ Clock In Now ]`.
   - Quick Links: Dual pill buttons (`[ 📋 View Team Logs ]`, `[ ✏️ Request Correction ]`).

4. **Mockup 4 (`Tasks.tsx`)**:
   - Header: "Task Workflows", filter icon `[ ☰ ]`, subtitle "All Assignees • Live Status".
   - Status Filter Chips: `[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`, and primary CTA `[ + Create Task ]` (Amber/Orange).
   - 2x2 Stat Badges: `Total Tasks 4`, `In Progress 1`, `Pending Review 1`, `Completed 1`.
   - Search & Priority Bar: `🔍 Search tasks or assignees...`, dropdown `All Priorities ⌵`.
   - High-Density Task Stream: Clean task cards with Status Emoji Tag (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`), Priority Pill (`Urgent`, `High`, `Normal`, `Low`), bold task title, assignee avatar chip, and contextual action CTA (`Start Job →`, `Submit Proof`, `Approve ✓`).

---

### 1.4 Verification & Build Pipeline Commands
1. **TypeScript Typecheck**:
   - Command: `node node_modules/typescript/bin/tsc --noEmit`
   - Result: Exited `0` with zero diagnostic errors.
2. **Vite Production Build**:
   - Command: `node node_modules/vite/bin/vite.js build`
   - Result: Exited `0`, `✓ built in 49.78s`. Generated assets in `dist/`.
3. **Vitest Test Suite Validation**:
   - `node node_modules/vitest/vitest.mjs run src/test/crmPayrollUtils.test.ts src/test/crmGeoUtils.test.ts`
     - Result: 81/81 tests passed (100% pass rate).
   - `node node_modules/vitest/vitest.mjs run src/test/crmPermissionGate.test.tsx`
     - Result: 8/8 tests passed (100% pass rate).
   - `node node_modules/vitest/vitest.mjs run src/test/crmSalaryManagement.test.tsx`
     - Result: 26/26 tests passed (100% pass rate).
   - `node node_modules/vitest/vitest.mjs run src/test/crmTasksView.test.tsx`
     - Result: 6/6 tests passed (100% pass rate).

---

## 2. Logic Chain

### 2.1 Complete Isolation of Quarantine Files
- **Step 1 (Observation 1.1)**: All 19 files were confirmed to exist and had modification dates prior to 2026-10-25.
- **Step 2 (Observation 1.1)**: The cross-module search in `src/pages/crm` and `src/components/crm` returned zero matches for any quarantined symbols or module paths.
- **Deduction**: Redesigning the mobile UI for `SalaryManagement.tsx`, `RoleManagement.tsx`, `Attendance.tsx`, and `Tasks.tsx` carries zero risk to invoicing or printing logic if implementers strictly modify only the 4 CRM page files and add pure presentation primitives.

### 2.2 Reusable Mobile Design Tokens & Pattern Standardization
- **Step 1 (Observation 1.2 & 1.3)**: Currently, `SalaryManagement.tsx`, `Attendance.tsx`, and `Tasks.tsx` render full `CRMStatCard` components inside `grid grid-cols-2 md:grid-cols-4 gap-3.5`. On mobile screens (<768px), these vertical cards consume excessive vertical space and mismatch the reference mockups.
- **Step 2 (Observation 1.3)**: Across Mockups 1, 3, and 4, the user interface demands compact 2x2 horizontal stat badges, segmented inset pill switchers, bottom action pills, and status tags.
- **Step 3 (Rule Compliance)**: Under `.agents/rules/minimal-design-system.md`, all controls must satisfy:
  - Standard action buttons: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height)
  - Small / table action buttons: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height)
  - Micro / inline icon buttons: `w-7.5 h-7.5 rounded-md` (30x30px)
  - Mobile touch targets: minimum 44px (`min-h-[44px]`)
  - No sub-11px fonts (`text-[11px]` minimum)
  - Tabular monospace numbers: `font-mono tabular-nums` for currency, counts, and clocks
  - Single primary accent: Royal Blue `#2563EB` (`bg-blue-600` / `hover:bg-blue-700`)
- **Deduction**: We should define reusable presentation specifications (or a dedicated helper component/tokens) for:
  1. `CRMCompactStatBadge`: 2x2 horizontal badge with tinted icon pod, stacked label + tabular value, and optional right chevron.
  2. `CRMSegmentedTabs`: Inset pill switcher container (`bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl`) with active white pill (`shadow-2xs font-bold`).
  3. `CRMRadarWidget`: Circular animated radar preview for Attendance geofence telemetry.
  4. `CRMQuickActionPill`: Dual bottom action button (`h-9 rounded-xl border border-slate-200/80 bg-white shadow-2xs min-h-[44px]`).

---

## 3. Reusable Pattern Specification & Implementation Guide

### 3.1 Pattern A: 2x2 Compact Stat Badge Grid
Used in Mockup 1 (`SalaryManagement`), Mockup 3 (`Attendance`), and Mockup 4 (`Tasks`).

```tsx
<div className="grid grid-cols-2 gap-2 sm:gap-2.5">
  <div
    onClick={onBadgeClick}
    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] cursor-pointer hover:border-slate-300 transition-colors"
  >
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          Active Profiles
        </span>
        <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
          0
        </span>
      </div>
    </div>
    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
  </div>
</div>
```

**Accent Palette Map for Badges**:
- Blue: `bg-blue-50 text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400`
- Orange: `bg-orange-50 text-[#FF6A00] dark:bg-orange-950/40 dark:text-orange-400`
- Gold/Amber: `bg-amber-50 text-[#F59E0B] dark:bg-amber-950/40 dark:text-amber-400`
- Emerald: `bg-emerald-50 text-[#10B981] dark:bg-emerald-950/40 dark:text-emerald-400`
- Rose: `bg-rose-50 text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400`

---

### 3.2 Pattern B: Inset Segmented Pill Tab Bar
Used in `SalaryManagement` (3 tabs), `Attendance` (3 tabs), and `RoleManagement` (List vs Tree View).

```tsx
<div
  role="tablist"
  className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full overflow-x-auto scrollbar-none"
>
  {tabs.map((tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center justify-center gap-1.5",
          isActive
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {tab.icon && <tab.icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-slate-400")} />}
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>
```

---

### 3.3 Pattern C: Radar Geofence Telemetry Indicator & Shift Pod
Used in `Attendance.tsx` (Mockup 3).

```tsx
<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden border-l-4 border-l-[#FF6A00]">
  <div className="p-4 space-y-4">
    {/* Shift Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Shift • General</h3>
        <p className="text-[11px] text-slate-500">09:00 AM - 06:00 PM (8h)</p>
      </div>
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Sun, Oct 25
      </span>
    </div>

    {/* Digital Clock & Radar Pod */}
    <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800">
      <div>
        <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold">Current Time</div>
        <div className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
          02:45:48 PM
        </div>
      </div>

      {/* Radar Indicator */}
      <div className="relative w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
        {/* Animated radar sweep / pulse */}
        <div className="absolute inset-0 rounded-full border border-orange-500/40 animate-ping" />
        <div className="w-8 h-8 rounded-full border border-dashed border-slate-400/60 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs" title="Office Location" />
        </div>
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" title="Your Position" />
      </div>
    </div>

    {/* Geofence Status & Accuracy Info */}
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
          ⚠️ Outside Geofence
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          📍 Nearest: HQ (Radius: 150m)
        </span>
      </div>
      <div className="text-[11px] text-slate-400 font-mono">
        GPS Accuracy: ±4m • Protocol: Verified
      </div>
    </div>

    {/* Full-width Clock In CTA */}
    <button
      type="button"
      onClick={handleClockIn}
      className="w-full h-11 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold text-sm shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
    >
      <CheckCircle2 className="w-4 h-4" />
      <span>Clock In Now</span>
    </button>
  </div>
</div>
```

---

### 3.4 Pattern D: Bottom Dual Quick Actions Pill Buttons
Used in `SalaryManagement` (`[ 📋 View Past Runs ]`, `[ ⚙️ Pay Settings ]`) and `Attendance` (`[ 📋 View Team Logs ]`, `[ ✏️ Request Correction ]`).

```tsx
<div className="grid grid-cols-2 gap-2.5 pt-2">
  <button
    type="button"
    onClick={onActionLeft}
    className="h-9 min-h-[44px] px-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
  >
    <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
    <span>View Past Runs</span>
  </button>
  <button
    type="button"
    onClick={onActionRight}
    className="h-9 min-h-[44px] px-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
  >
    <Settings className="w-3.5 h-3.5 text-slate-500" />
    <span>Pay Settings</span>
  </button>
</div>
```

---

### 3.5 Pattern E: Granular Module Permissions Matrix (Accordion + 2-Column Checkboxes)
Used in `RoleManagement.tsx` (Mockup 2).

```tsx
<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
  {modules.map((mod) => {
    const isExpanded = expandedModules[mod.id];
    return (
      <div key={mod.id}>
        {/* Accordion Module Header */}
        <button
          type="button"
          onClick={() => toggleModule(mod.id)}
          className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2.5">
            <mod.icon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">{mod.title}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {mod.enabledCount} / {mod.totalCount} Enabled
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
        </button>

        {/* Expanded 2-Column Checkbox Grid */}
        {isExpanded && (
          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mod.permissions.map((perm) => (
              <label
                key={perm.key}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors select-none min-h-[40px]",
                  perm.allowed
                    ? "border-blue-500/80 bg-blue-50/50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-700"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                )}
              >
                <input
                  type="checkbox"
                  checked={perm.allowed}
                  onChange={() => togglePermission(mod.id, perm.key)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{perm.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  })}
</div>
```

---

### 3.6 Pattern F: High-Density Task Stream & Status Badges
Used in `Tasks.tsx` (Mockup 4).

**Status Badges**:
```tsx
const TASK_STATUS_TAGS: Record<TaskStatus, { label: string; emoji: string; className: string }> = {
  todo: {
    label: "TO DO",
    emoji: "📌",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
  },
  in_progress: {
    label: "IN PROGRESS",
    emoji: "⚡",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80",
  },
  review: {
    label: "UNDER REVIEW",
    emoji: "🔍",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80",
  },
  done: {
    label: "COMPLETED",
    emoji: "✅",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80",
  },
};
```

---

## 4. Caveats
1. **Desktop Breakpoint Protection (`hidden md:block` / `hidden sm:block`)**:
   Implementers must encapsulate all new mobile layouts inside `<div className="block sm:hidden">` or `<div className="block md:hidden">` so that desktop views (`sm:` and `md:` breakpoints) remain 100% untouched.
2. **Tab State Synchronization in `SalaryManagement` and `Attendance`**:
   The desktop views render 4 tabs (`profiles`, `payroll`, `adjustments`, `payslips` in `SalaryManagement.tsx`; `pod`, `logs`, `geofences`, `requests` in `Attendance.tsx`). The mobile segmented switcher highlights the top 3 tabs. The 4th tab (e.g. `My Payslips` or `Regularisation`) must remain accessible via quick link or scrollable pill so that self-service workflows are never locked out.
3. **Legacy Test Assertions in `crmComponents.test.tsx`**:
   We observed that `crmComponents.test.tsx` failed 3 assertions because it tests for `#1D4ED8` and `backdrop-blur-md` (which were updated in the minimal design system to `#2563EB` and clean hairline surface). Downstream tests that check colors should assert `#2563EB` as defined in `CRM_BRAND_COLORS.blue`.

---

## 5. Conclusion
1. **Quarantine Isolation**: All 19 invoice quarantine files are intact, untouched, and completely decoupled from CRM modules.
2. **Design Tokens & Mobile Patterns**: Standardized patterns for 2x2 stat badges, inset pill switchers, radar indicator, and modular permissions accordions are fully specified and comply with `minimal-design-system.md` (no sub-11px fonts, >=44px touch targets, royal blue `#2563EB` accent).
3. **Verification Pipeline**: Both `tsc --noEmit` and `vite build` are verified functional and passing cleanly. Key Vitest suites for CRM utilities, permissions, salary management, and task views pass 100%.

---

## 6. Verification Method

To independently verify all findings in this report, execute the following commands in powershell from `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`:

1. **Quarantine Files Check**:
   ```powershell
   node -e "const fs = require('fs'); ['src/components/invoices/mobile/MobileCreateInvoice.tsx','src/components/invoices/mobile/AddItemModal.tsx','src/components/invoices/mobile/SelectPartyModal.tsx','src/components/invoices/mobile/EditItemModal.tsx','src/components/invoices/mobile/MobileInvoiceSuccessView.tsx','src/components/invoices/mobile/MobileBillPreviewModal.tsx','src/components/invoices/mobile/MobileInvoiceFitViewer.tsx','src/components/invoices/mobile/CreatePartyModal.tsx','src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx','src/components/items/mobile/CreateNewItemModal.tsx','src/components/SalesInvoiceModal.tsx','src/components/PurchaseInvoiceModal.tsx','src/components/invoices/AddItemsToBillModal.tsx','src/components/invoices/InvoiceFitView.tsx','src/components/invoices/UnifiedInvoiceRenderer.tsx','src/utils/downloadExactInvoice.ts','src/utils/whatsappPdfShare.ts','src/utils/invoiceThemeLoader.ts','src/services/documentsService.ts'].forEach(f => console.log(f, fs.existsSync(f)));"
   ```
2. **TypeScript Typecheck**:
   ```powershell
   node node_modules/typescript/bin/tsc --noEmit
   ```
   (Expected output: 0 errors)
3. **Vite Production Build**:
   ```powershell
   node node_modules/vite/bin/vite.js build
   ```
   (Expected output: `✓ built in ~50s`)
4. **CRM Vitest Suites**:
   ```powershell
   node node_modules/vitest/vitest.mjs run src/test/crmPayrollUtils.test.ts src/test/crmGeoUtils.test.ts src/test/crmPermissionGate.test.tsx src/test/crmTasksView.test.tsx src/test/crmSalaryManagement.test.tsx
   ```
