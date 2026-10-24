# Milestone 4 Exploration Report: CRM Portal & Cross-Page Design Tokens Overhaul

**Investigator**: Explorer 3 (Milestone 4: CRM & Design Tokens Explorer)  
**Date**: 2026-10-24T20:42:00Z  
**Target Path**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md`  
**Parent Orchestrator**: `3044c8ce-523a-4157-917d-31b6f5d55c6a`  

---

## 1. Observation

Direct forensic observations of code, classes, typography, button sizes, and automated test behavior across `src/pages/crm/*`, `src/components/crm/*`, and cross-page design tokens:

### A. CRM Portal Views (`src/pages/crm/*`)

1. **`src/pages/crm/Attendance.tsx`**:
   - **Lines 1863 & 1888**: Primary clock-in and clock-out buttons are bloated `h-14` (56px) with oversized `rounded-2xl` and heavy drop shadows with colored halos:
     ```tsx
     className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
     ```
     and
     ```tsx
     className="w-full h-14 rounded-2xl bg-[#FF6A00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
     ```
   - **Line 1778**: Live digital clock has heavy skeuomorphic gradient:
     ```tsx
     className="text-center p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200/80"
     ```
   - **Lines 1651, 1842**: Hardcoded `#1D4ED8` and `#FF6A00` hexes instead of theme tokens.
   - **Line 1520 & Line 2247**: Sub-11px font `text-[10px]` used in table duration cells and badges:
     ```tsx
     <span className="ml-1 text-[10px] text-amber-600 font-normal">
     ```
   - **Line 2074**: Crucial test hook present: `data-testid="attendance-role-filter"` on the SelectTrigger for role filtering.

2. **`src/pages/crm/CRMDashboard.tsx`**:
   - **Lines 289-329**: Action buttons in header use ad-hoc sizing (`min-h-[38px] px-3 py-2 rounded-xl text-xs sm:text-sm`) instead of standard 34px action tokens (`h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`).
   - **Lines 303, 313, 323**: Hardcoded navy hex `#1D4ED8` on `Add Staff` and `#0F172A` in headings instead of `bg-blue-600 hover:bg-blue-700`.
   - **Lines 195-268**: Quick action navigation items define a scattered rainbow color palette: `#1D4ED8` (blue), `#10B981` (emerald), `#FF6A00` (orange), `#6366F1` (indigo), `#EC4899` (pink), `#8B5CF6` (purple), `#0EA5E9` (sky), `#0F172A` (navy).

3. **`src/pages/crm/Tasks.tsx`**:
   - **Lines 984, 1001, 1012, 1020**: Kanban card action buttons use:
     ```tsx
     className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-blue-600 hover:bg-blue-50 font-semibold"
     ```
     *(Note: This exact class regex is asserted in `src/test/mobileTouchErgonomicsRemediation.test.ts:111-113` and MUST be preserved).*
   - **Lines 544, 550, 961, 1148, 1157**: Sub-11px micro-fonts `text-[9px]` and `text-[10px]` present in task cards, user initials, and role pills.
   - **Lines 833, 876**: Filter bar and Kanban columns use `rounded-2xl` instead of `rounded-xl`.
   - **Desktop table actions** (Lines 631, 648, 661, 668): Already use compact 28px standard table action buttons: `h-7 text-xs px-2`.

4. **`src/pages/crm/SalaryManagement.tsx`**:
   - **Lines 1197, 1208**: Action buttons `Add New Profile` and `Record Advance` use `h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl` instead of standard `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary`.
   - **Line 1383**: Base wage rendered as `className="font-mono font-bold text-slate-900 dark:text-white"`, lacking `tabular-nums`.
   - **Line 1177**: Page header badge renders `<CRMBadge variant="success" size="sm" dot>Live Sync</CRMBadge>`. Vitest test `src/test/crmSalaryManagement.test.tsx:482` explicitly asserts `expect(screen.getByText(/Phase 3 Live/i)).toBeInTheDocument()`.
   - **Lines 1445, 1493, 1736, 1906, 1965**: Containers use `rounded-2xl`.

5. **`src/pages/crm/Broadcasts.tsx`**:
   - **Line 306**: Header badge renders `<CRMBadge variant="success" size="sm" dot>Push Alerts Ready</CRMBadge>`. Vitest test `src/test/crmSubmodules.test.tsx:97` fails with:
     ```
     TestingLibraryElementError: Unable to find an element with the text: Phase 4 Active.
     ```
   - **Line 314**: `Publish Broadcast` button uses `bg-[#EC4899] hover:bg-pink-600 text-white gap-1.5 text-xs h-9 shadow-xs` (pink ad-hoc styling).
   - **Lines 361, 403, 419**: Containers use `rounded-2xl`.

6. **`src/pages/crm/Meet.tsx`, `AIAssistant.tsx`, `Support.tsx`**:
   - **`AIAssistant.tsx` Line 384**: Send prompt button uses bloated `h-11 px-4 bg-purple-600` instead of standard 34px action button.
   - **`Meet.tsx` Line 312 & `AIAssistant.tsx` Line 237**: Multi-stop rainbow gradients `from-indigo-50/80 via-white to-purple-50/80` and `from-purple-50/80 via-white to-blue-50/80`.
   - **Lines 272, 328, 390 in AIAssistant.tsx & Line 661 in Support.tsx**: Sub-11px `text-[10px]` used extensively.

---

### B. Shared CRM Components (`src/components/crm/*`)

1. **`src/components/crm/CRMCard.tsx`**:
   - **Lines 8-21**: Defines `CRM_BRAND_COLORS` with `blue: "#1D4ED8"` and `orange: "#FF6A00"`, conflicting with master Royal Blue token `#2563EB`.
   - **Line 85**: Defines a `glass` variant using `backdrop-blur-md bg-white/80 dark:bg-slate-900/80`.
   - **Line 94**: Base card container has `rounded-2xl` instead of standard `rounded-xl`.
2. **`src/components/crm/CRMBadge.tsx`**:
   - **Line 92**: `sm` size is set to `text-[10px] px-2 py-0.5 gap-1`, which propagates sub-11px font across all pages calling `<CRMBadge size="sm">`.
   - **Lines 65-89**: Hardcoded hexes `#10B981`, `#1D4ED8`, `#0F172A`, `#FF6A00`.
3. **`src/components/crm/CRMRolePill.tsx`**:
   - **Line 58**: `sm` size is set to `text-[10px] px-2 py-0.5 gap-1` (violating sub-11px rule).
   - **Line 49**: Default color `#1D4ED8`.
4. **`src/components/crm/CRMStatCard.tsx`**:
   - **Line 99**: Outer container has `rounded-2xl p-4 sm:p-5`. Needs `rounded-xl p-3.5`.
   - **Line 122**: Value renders `text-2xl sm:text-3xl font-extrabold text-[#0F172A] font-mono tracking-tight tabular-nums` (good monospace & tabular-nums, but container padding and hardcoded text hex need refinement).
5. **`src/components/crm/CRMPageHeader.tsx`**:
   - **Line 85**: Title is styled as `text-base sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A]` (30px on desktop causes vertical sprawl). Master rule defines `text-lg or text-xl (18px - 20px)`.
6. **`src/components/crm/CRMDataTable.tsx`**:
   - **Line 163**: Outer table wrapper uses `rounded-2xl` instead of `rounded-xl`.
   - **Lines 187, 189**: Sort arrows hardcode `text-[#1D4ED8]`.
   - Row heights (Line 171 header py-3, Line 236 row py-3) already satisfy the 38px–42px row height standard.

---

### C. Cross-Page Button Sizing, Typography & Glassmorphism Scan

1. **Button Primitive Verification**:
   - `src/components/ui/button.tsx` was verified in Milestone 1. Running `cmd.exe /c npx vitest run src/test/componentPrimitivesAdversarial.challenger.test.tsx` passes all 32 tests (81 permutations of variants x sizes).
   - Standard action: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px).
   - Table action: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px).
   - Micro icon: `w-7.5 h-7.5 rounded-md` (30px).
   - Mobile elevated CTA: `w-[46px] h-[46px] rounded-xl font-bold` (46px).
2. **Lingering Bloated Buttons & Legacy Glows in Application Pages**:
   - Grep search revealed `glowing-btn-amber`, `glowing-btn-blue`, and ad-hoc button padding across 15+ pages:
     - `Customers.tsx`: Lines 509, 638, 967 (`px-3.5 py-2 rounded-xl glowing-btn-amber`)
     - `Suppliers.tsx`: Line 496 (`px-3.5 py-2 rounded-xl glowing-btn-amber`)
     - `CashAndBank.tsx`: Line 596 (`px-3 py-1.5 rounded-xl glowing-btn-amber`)
     - `Expenses.tsx`: Line 479 (`px-3.5 py-2 rounded-xl glowing-btn-amber`)
     - `Reports.tsx`: Lines 459, 517 (`px-3 py-1.5 rounded-xl glowing-btn-amber`)
     - `PurchaseReturns.tsx`: Line 412 (`px-3.5 py-2 rounded-xl glowing-btn-amber`)
     - `PrintSettings.tsx`: Line 236, `InvoiceSettings.tsx`: Line 243, `Godown.tsx`: Line 346, `BusinessSettings.tsx`: Line 425, `BarcodeGenerator.tsx`: Line 416, `AutomatedBills.tsx`: Lines 226, 389, `ActivityLog.tsx`: Lines 253, 266, `EInvoicing.tsx`: Line 367.
3. **Heavy Glassmorphism in Headers and Card Surfaces**:
   - Rather than clean neutral surfaces (`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800`), translucent `backdrop-blur-xl` and `bg-white/70` are present on headers and containers:
     - `CashAndBank.tsx` Line 556: `bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl`
     - `Expenses.tsx` Lines 413, 488: `bg-white/75 backdrop-blur-xl border rounded-2xl`
     - `Customers.tsx` Lines 603, 921: `bg-white/70 backdrop-blur-xl rounded-2xl` and `rounded-3xl`
     - `Suppliers.tsx` Line 579: `bg-white/70 backdrop-blur-xl rounded-2xl`
     - `Reports.tsx` Line 507: `bg-white/70 backdrop-blur-xl rounded-2xl`
     - `ActivityLog.tsx` Line 224: `bg-white/70 backdrop-blur-xl rounded-2xl`
4. **Currency Typography (`₹`) Without Tabular Monospace**:
   - More than 270 occurrences across `Analytics.tsx`, `AutomatedBills.tsx`, `CashAndBank.tsx`, `CustomerLedger.tsx`, and `SalaryManagement.tsx` render raw currency figures (e.g. `₹{totalRevenue}`) inside standard sans spans without `font-mono tabular-nums`.

---

## 2. Logic Chain

Step-by-step reasoning linking observations directly to the required overhaul:

1. **Premise 1 (Master Design Rules §1 & §3)**: Bloated buttons (`h-14`, `h-11` on desktop, `rounded-3xl`, `rounded-2xl` bubble cards, heavy glowing drop shadows `shadow-lg shadow-emerald-600/25`) contradict CredSmart's minimal, lightning-fast design system.
   - *Observation Support*: `Attendance.tsx:1863,1888` uses `h-14 rounded-2xl` with glowing halos. `CRMDashboard.tsx:289-329` uses `min-h-[38px] px-3 py-2 rounded-xl`.
   - *Remedy*: Standardize desktop CRM action buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px) or table actions to `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px). Replace clock-in buttons with clean 44px/46px CTA targets with subtle micro-elevation `shadow-sm` and zero neon colored halos.

2. **Premise 2 (Master Design Rules §4 - Typography)**: Sub-11px micro-fonts (`text-[10px]`, `text-[9px]`) violate accessibility standards, and all currency figures (₹) must use `'IBM Plex Mono'` with OpenType tabular figures (`font-mono tabular-nums`).
   - *Observation Support*: `CRMBadge.tsx:92` and `CRMRolePill.tsx:58` enforce `text-[10px]`. `Tasks.tsx:544,961` has `text-[9px]`. `SalaryManagement.tsx:1383` and `Analytics.tsx:219` miss `tabular-nums`.
   - *Remedy*: Upgrade `sm` size in `CRMBadge.tsx` and `CRMRolePill.tsx` to `text-[11px] font-medium`. Upgrade all `text-[10px]` and `text-[9px]` in CRM pages to `text-[11px]`. Add `font-mono tabular-nums` to all currency renders.

3. **Premise 3 (Master Design Rules §5 - Neutral Palette)**: CredSmart standardizes on a clean neutral canvas (`#F8FAFC` light / `#090D16` dark) with single Royal Blue accent (`#2563EB` / `bg-blue-600`) and semantic status tokens (Emerald, Rose, Amber). Hardcoded legacy navy (`#1D4ED8`) and bright orange (`#FF6A00`) must be reconciled.
   - *Observation Support*: `CRM_BRAND_COLORS` in `CRMCard.tsx:14` hardcodes `blue: "#1D4ED8"`. `CRMDashboard.tsx` hardcodes `#1D4ED8` and 8 rainbow colors in `quickNavItems`.
   - *Remedy*: Replace `#1D4ED8` with master Royal Blue token `bg-blue-600 hover:bg-blue-700` (`#2563EB`) or `text-primary`. Restyle CRM module cards to use clean neutral surfaces with subtle semantic icons.

4. **Premise 4 (Master Design Rules §3 & §6 - Zero Glassmorphism & Screen Containment)**: Heavy translucent glassmorphism (`backdrop-blur-xl`, `bg-white/70`, `shadow-2xl`) and glowing buttons (`glowing-btn-amber`, `glowing-btn-blue`) must be replaced with crisp 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-xs`).
   - *Observation Support*: `CashAndBank.tsx:556`, `Expenses.tsx:413`, `Customers.tsx:603`, and `Suppliers.tsx:579` use `backdrop-blur-xl` and `glowing-btn-amber`.
   - *Remedy*: Replace lingering glassmorphic headers with solid minimal headers: `bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-2xs`. Replace `glowing-btn-amber` with standard `<Button>` or standard `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white shadow-2xs`.

5. **Premise 5 (Regression Prevention & Sensitive Invariants)**: UI refactoring must not break automated tests that rely on specific badges, test IDs, or AST ordering.
   - *Observation Support*: `src/test/crmSubmodules.test.tsx:97` expects `"Phase 4 Active"` in `Broadcasts.tsx`. `src/test/crmSalaryManagement.test.tsx:482` expects `"Phase 3 Live"` in `SalaryManagement.tsx`. `src/test/mobileTouchErgonomicsRemediation.test.ts:111-113` checks for `/min-h-\[44px\]\s+h-11\s+px-3\s+flex\s+items-center/` in `Tasks.tsx`. `src/test/crmAttendanceRoleFilterStress.test.tsx` checks for `data-testid="attendance-role-filter"`. `App.tsx` requires CRM routes mounted first for AST ordering.
   - *Remedy*: Enforce these exact strings, test IDs, and route positions as non-negotiable invariants during Worker M4 implementation.

---

## 3. Caveats & Invariants to Preserve

Worker M4 MUST strictly preserve the following architectural and behavioral invariants:

| Category | File & Location | Required Invariant | Rationale / Enforcing Test |
|---|---|---|---|
| **Test Invariant** | `src/pages/crm/Tasks.tsx`<br>Lines 984, 1001, 1020 | Must include `min-h-[44px] h-11 px-3 flex items-center` on "Start Job →", "Submit Proof", "Approve ✓" | Enforced by `src/test/mobileTouchErgonomicsRemediation.test.ts:111-113` |
| **Test Invariant** | `src/pages/crm/Attendance.tsx`<br>Line 2074 | Role Filter SelectTrigger must keep `data-testid="attendance-role-filter"` | Enforced by `src/test/crmAttendanceRoleFilterStress.test.tsx` & `crmAttendanceAdminChallenge.test.tsx` |
| **Test Invariant** | `src/pages/crm/Broadcasts.tsx`<br>Line 304 | Header badge must render `"Phase 4 Active"` (e.g. `<CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>`) | Enforced by `src/test/crmSubmodules.test.tsx:97` |
| **Test Invariant** | `src/pages/crm/SalaryManagement.tsx`<br>Line 1177 | Header badge must render `"Phase 3 Live"` (e.g. `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>`) | Enforced by `src/test/crmSalaryManagement.test.tsx:482` |
| **Route AST Invariant**| `src/App.tsx`<br>Lines 259-270 | CRM routes (`<Route path={ROUTE_PATHS.crm}...>`) must remain mounted first inside `<ProtectedRoutes>` | Enforced by AST index check in `src/test/crmAttendanceRouteWiringChallenge.test.tsx` |
| **Function Export** | `src/pages/crm/SalaryManagement.tsx`<br>Line 103 | Must export `formatIndianCurrency(amount)` with its exact calculation | Tested by `src/test/crmSalaryManagementAdmin.test.tsx` and unit tests |
| **Business Logic** | `src/pages/crm/Attendance.tsx` | Must preserve Haversine great-circle calculation, GPS geofence states (`acquiring`, `inside`, `outside`), and localStorage keys | Tested by `src/test/crmGeoUtils.test.ts` & `src/test/crmAttendanceStress.test.tsx` |
| **Quarantine** | 19 Protected Invoice Files | Under NO circumstances touch or propose edits to any file in `src/components/invoices/*`, `src/utils/downloadExactInvoice.ts`, etc. | PROJECT.md Strict Quarantine Lock |

---

## 4. Conclusion & Recommended Fix Strategy

### Phase 1: Shared CRM Component Refinement (`src/components/crm/*`)
1. **`CRMBadge.tsx`**:
   - Change `sizeStyles.sm` from `text-[10px] px-2 py-0.5 gap-1` to `text-[11px] px-2 py-0.5 gap-1 font-semibold`.
   - Update `info` pill color from `#1D4ED8` to standard Royal Blue `text-blue-600 dark:text-blue-400`.
2. **`CRMRolePill.tsx`**:
   - Change `sizeClasses.sm` from `text-[10px]` to `text-[11px] font-medium`.
   - Update default color from `#1D4ED8` to `#2563EB`.
3. **`CRMCard.tsx`**:
   - Update default `rounded-2xl` to `rounded-xl`.
   - Replace `glass` variant (`backdrop-blur-md bg-white/80`) with clean hairline surface card (`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs`).
   - Update `CRM_BRAND_COLORS.blue` to `#2563EB`.
4. **`CRMStatCard.tsx`**:
   - Change outer container from `rounded-2xl p-4 sm:p-5` to `rounded-xl p-3.5 sm:p-4`.
   - Replace hardcoded accent colors (`#1D4ED8`, `#FF6A00`) with master design tokens.
5. **`CRMPageHeader.tsx`**:
   - Streamline title from `text-base sm:text-2xl lg:text-3xl font-extrabold` to `text-base sm:text-xl font-bold` to eliminate vertical sprawl.
6. **`CRMDataTable.tsx`**:
   - Change outer container from `rounded-2xl` to `rounded-xl`.
   - Replace hardcoded sort arrow text `#1D4ED8` with `text-blue-600 dark:text-blue-400`.

### Phase 2: CRM Core Pages Polish (`src/pages/crm/*`)
1. **`CRMDashboard.tsx`**:
   - Standardize action buttons (`Refresh`, `Add Staff`, `Create Role`, `Hierarchy View`) to standard 34px action tokens: `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white shadow-2xs`.
   - Restyle `quickNavItems` cards to use neutral slate containers with royal blue accents, eliminating rainbow distraction.
2. **`Attendance.tsx`**:
   - Refactor clock-in & clock-out buttons from bloated `h-14 rounded-2xl` with glowing `shadow-lg shadow-emerald-600/25` to refined 44px/46px touch CTA buttons with `rounded-xl font-bold text-sm shadow-sm active:scale-[0.98]`.
   - Replace `text-[10px]` with `text-[11px]`.
   - Ensure `data-testid="attendance-role-filter"` remains intact on SelectTrigger.
3. **`Tasks.tsx`**:
   - Preserve `min-h-[44px] h-11 px-3 flex items-center` for "Start Job →", "Submit Proof", "Approve ✓" (required by `mobileTouchErgonomicsRemediation.test.ts`).
   - Upgrade sub-11px `text-[9px]` and `text-[10px]` to `text-[11px]`.
   - Change column wrappers from `rounded-2xl` to `rounded-xl`.
4. **`SalaryManagement.tsx`**:
   - Add `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>` to page header badge to satisfy test.
   - Standardize `Add New Profile` and `Record Advance` buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary`.
   - Add `tabular-nums` to `font-mono` on all currency amounts (e.g. `className="font-mono tabular-nums font-bold text-slate-900"`).
   - Change containers from `rounded-2xl` to `rounded-xl`.
5. **`Broadcasts.tsx`**:
   - Add `<CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>` to page header badge to satisfy test.
   - Standardize `Publish Broadcast` button to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white`.
6. **`Meet.tsx`, `AIAssistant.tsx`, `Support.tsx`**:
   - Replace bloated `h-11 px-4` send button in `AIAssistant.tsx` with standard `h-8.5 px-3 rounded-lg text-xs font-semibold`.
   - Replace rainbow gradient card backgrounds with clean neutral surfaces (`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800`).
   - Upgrade `text-[10px]` to `text-[11px]`.

### Phase 3: Cross-Page Button & Glassmorphism Deprecation
1. **Remove Lingering `glowing-btn-amber` and `glowing-btn-blue`**:
   - On `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, `Expenses.tsx`, `Reports.tsx`, `VendorDiscovery.tsx`, etc., replace ad-hoc `px-3.5 py-2 rounded-xl glowing-btn-amber` with standard `<Button>` or `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white shadow-2xs`.
2. **Remove Lingering `backdrop-blur-xl bg-white/70`**:
   - Replace with solid crisp neutral surfaces: `bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 shadow-2xs`.
3. **Enforce `font-mono tabular-nums` on All Currency Figures**:
   - Apply `font-mono tabular-nums` to currency amounts across `Analytics.tsx`, `CustomerLedger.tsx`, `AutomatedBills.tsx`, and `CashAndBank.tsx`.

---

## 5. Verification Method

To independently verify the investigation findings and ensure zero regression:

1. **Component Primitives Test**:
   ```powershell
   cmd.exe /c npx vitest run src/test/componentPrimitivesAdversarial.challenger.test.tsx
   ```
   *Expected*: 32 of 32 tests PASS (81 button permutations verified).

2. **Mobile Ergonomics Test**:
   ```powershell
   cmd.exe /c npx vitest run src/test/mobileErgonomicsChallenger.test.ts src/test/mobileTouchErgonomicsRemediation.test.ts
   ```
   *Expected*: All 26 tests PASS (touch targets >= 44px, bottom dock clearance, Kanban status buttons).

3. **CRM Submodules Test**:
   ```powershell
   cmd.exe /c npx vitest run src/test/crmSubmodules.test.tsx
   ```
   *Verification*: Verify `Broadcasts.tsx` header renders `"Phase 4 Active"` so test 2 passes.

4. **CRM Salary Management Test**:
   ```powershell
   cmd.exe /c npx vitest run src/test/crmSalaryManagement.test.tsx
   ```
   *Verification*: Verify `SalaryManagement.tsx` header renders `"Phase 3 Live"` so test 482 passes.

5. **CRM Attendance Route Wiring & Role Filter Test**:
   ```powershell
   cmd.exe /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx
   ```
   *Verification*: Ensure `data-testid="attendance-role-filter"` is present on the role trigger in `Attendance.tsx` and AST order is preserved in `App.tsx`.

6. **Full Build Check**:
   ```powershell
   cmd.exe /c npm run build
   ```
   *Expected*: TypeScript compilation passes with 0 errors.

7. **Quarantine Invariance Check**:
   ```powershell
   git status --porcelain src/components/invoices src/utils/downloadExactInvoice.ts src/services/documentsService.ts
   ```
   *Expected*: Completely empty (0 modified protected files).
