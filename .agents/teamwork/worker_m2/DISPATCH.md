# Dispatch Directive: Worker Milestone 2 — Screen-Fitted Desktop Shell & Productivity Layouts

## 2026-10-24T19:30:52Z

## Mission
Implement Milestone 2 of the CredSmart Minimal & Fast-Access Redesign:
1. `src/components/AppLayout.tsx`:
   - Refactor desktop command header to exact 52px height (`h-13`) on `md:` viewports and above.
   - Implement compact 28px brand mark (`w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white`) with crisp `'CredSmart'` Inter wordmark.
   - Add Organization Switcher dropdown pill on left command strip (`h-8 px-2.5 rounded-lg border border-slate-200/80 bg-slate-50 text-xs font-semibold`).
   - Move Command Palette (`⌘K`) search bar to center and enable across all desktop viewports (`hidden md:flex max-w-md mx-2 h-8.5`).
   - Standardize `+ New Invoice` button to Royal Blue split button (`h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs`).
   - Position Live Sync indicator dot on right command strip (`● Live Sync` text-[11px] font-mono text-emerald-600).
   - Deprecate 3D perspective distortion (`perspective: 2000px`, `rotateX(3deg)`).
   - Remove floating bottom-right watermark (`/logo-static.jpeg` overlay) that obscures pagination and action buttons.
   - Fix main scroll containment so desktop pages fit screen height without forcing whole-window scrolling.
2. `src/components/SuiteSwitcher.tsx`:
   - Redesign into a clean segmented control pill: neutral surface (`bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg`), active selection in white card (`bg-white dark:bg-slate-900 shadow-2xs font-semibold text-xs`), inactive in slate text (`text-slate-500`). Eliminate saturated amber/emerald fills.
3. `src/pages/POSBilling.tsx`:
   - Monochromatic Hotkey Ribbon: Standardize ribbon buttons to hairline borders (`border-slate-200/80 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700`) with clean monospace badges (`[F1]`, `[CTRL+I]`, `[P]`, `[Q]`, `[DEL]`, `[CTRL+B]`).
   - Split Workbench Containment: In the right checkout panel (`w-full lg:w-[400px] xl:w-[430px] shrink-0 flex flex-col h-full min-h-0`), decouple into 3 distinct regions:
     1. Region 1 (Top Fixed Total, `shrink-0 p-3.5 bg-blue-600 text-white`): Net Payable figure (`text-2xl font-bold font-mono tabular-nums`).
     2. Region 2 (Middle Scrollable Body, `flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin`): Bill breakdown, payment mode selector, received amount & change due, customer profile.
     3. Region 3 (Bottom Fixed Action Dock, `shrink-0 p-3 border-t border-slate-200/80 bg-white grid grid-cols-3 gap-2 shadow-xs`): `Save & Print [F6]`, `Save Bill [F7]`, and `WhatsApp Receipt`.
   - Result: Cashiers never need to scroll down to click Save or Print on standard 768px-900px displays.

## Mandatory Inputs to Read First
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-24T18:51:21Z`)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_desktop\handoff.md` (Blueprint)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`

## File Ownership (Exclusively Owns These Files)
- `src/components/AppLayout.tsx`
- `src/components/SuiteSwitcher.tsx`
- `src/pages/POSBilling.tsx`

## Strict Protected File Inventory (DO NOT TOUCH)
Do NOT edit any of the 19 invoice files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `MobileInvoiceSuccessView.tsx`, etc.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
Run and document results in `handoff.md`:
1. `cmd /c npx tsc --noEmit`
2. `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx`
3. `cmd /c npx eslint src/components/AppLayout.tsx src/components/SuiteSwitcher.tsx src/pages/POSBilling.tsx`
