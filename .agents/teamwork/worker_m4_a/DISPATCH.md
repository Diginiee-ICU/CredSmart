# DISPATCH — Worker M4-A (Dashboard, Sales & Purchases Overhaul)

## Identity
- Role: Dashboard & Transactions Overhaul Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_a\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING (ZERO TOLERANCE)
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT QUARANTINE LOCK
Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Assigned Scope & Files Owned Exclusively
1. `src/pages/Dashboard.tsx`
2. `src/pages/Sales.tsx`
3. `src/pages/Purchases.tsx`

## References
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Explorer 1 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\handoff.md`.

## Concrete Tasks
1. **`src/pages/Dashboard.tsx`**:
   - Move horizontal swipeable action strip from line ~820 up directly beneath the store greeting header / Tally banner, *before* the 2x2 Financial Overview Grid.
   - De-clutter the 4 KPI cards: remove micro-prose `<p>` descriptions (lines 1010, 1038, 1066, 1094); replace multi-color gradients with solid hairline accents (`h-[2px] bg-blue-600`, `bg-amber-500`, `bg-emerald-500`, `bg-rose-500`); standardize padding to `p-3.5`.
   - Chart tooltip: replace glassmorphic `backdrop-blur-xl shadow-2xl` tooltip (line 359) with clean minimal tooltip (`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-md text-xs space-y-1 min-w-[180px]`).
   - Primary action buttons: Royal Blue `#2563EB` (`bg-blue-600 hover:bg-blue-700 text-white`).
   - Elevate all sub-11px text (`text-[9px]`, `text-[10px]`) to `text-[11px]`.
2. **`src/pages/Sales.tsx` & `src/pages/Purchases.tsx`**:
   - Screen-fitted desktop containment: Decouple data table from pagination bar. Outer wrapper: `hidden md:flex flex-1 min-h-0 flex-col overflow-hidden`. Inner table: `flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin` with `thead sticky top-0`. Pinned bottom pagination: `shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2`.
   - Compress mobile cards (< 768px): Refactor from ~140px tall 3-row cards with 4 large buttons to high-density ~60px cards (4-5 per screen) with consolidated 3-dots touch trigger.
   - Strip micro-prose `<p>` descriptions from KPI cards.
   - Button standards: Standard action `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs bg-blue-600 hover:bg-blue-700 text-white`; micro icons `w-7.5 h-7.5 rounded-md`.
   - Elevate all sub-11px fonts to `text-[11px]`.

## Verification Commands
- `cmd /c npx tsc --noEmit` (exit code 0, 0 errors).
- `cmd /c npx eslint src/pages/Dashboard.tsx src/pages/Sales.tsx src/pages/Purchases.tsx` (0 errors).
- `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/mobileErgonomicsChallenger.test.ts` (all pass).
- Verify 0 diff lines on the 19 quarantined protected files.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_a\handoff.md` and report completion via `send_message`.

## 2026-10-24T21:21:21Z
You are Worker M4-A for Milestone 4 (Dashboard, Sales, Purchases Overhaul).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_a\
Execute the overhaul for Dashboard.tsx, Sales.tsx, and Purchases.tsx per DISPATCH.md.
