# DISPATCH — Worker M4-A Gen2 (Dashboard, Sales, Purchases)

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Role: Dashboard & Transactions Worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_a_gen2
- Parent: Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Assigned Scope
1. `src/pages/Dashboard.tsx`
2. `src/pages/Sales.tsx`
3. `src/pages/Purchases.tsx`

## Protected Quarantine (STRICT NO-EDIT LOCK)
DO NOT touch any of the 19 invoice files (e.g. MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, etc.).

## Detailed Refactoring Instructions
Refer to:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`
- `.agents/teamwork/explorer_m4_1/handoff.md`

### 1. `src/pages/Dashboard.tsx`
- Strip redundant explanatory micro-prose from KPI cards ("Outstanding customer credit ledger balance.", "Pending supplier invoices & outstanding dues.", "Total reconciled liquidity across accounts.", "Total sales for this month.").
- Remove skeuomorphic gradients on KPI cards (`bg-gradient-to-r`). Use subtle 1px hairline accents or solid indicators.
- Move the mobile quick action strip directly beneath the store header (`< 768px`).
- Change all indigo `#4F46E5` and amber buttons to Royal Blue `#2563EB` (`bg-blue-600 hover:bg-blue-700`).
- Remove heavy `shadow-2xl` and `backdrop-blur-xl` from chart tooltip; use clean 1px border with `shadow-sm`.
- Elevate all sub-11px micro-fonts (`text-[9px]`, `text-[10px]`) to `text-[11px] font-medium`.

### 2. `src/pages/Sales.tsx` & `src/pages/Purchases.tsx`
- Decouple desktop table and pagination footer:
  - Table wrapper: `flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin` with sticky header `thead sticky top-0 bg-slate-50 dark:bg-slate-900 z-10`.
  - Pagination footer: `shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2`.
- Strip redundant micro-prose from KPI cards.
- Compact mobile cards (< 768px) to fit 4-5 cards per screen (~60px height).
- Elevate all sub-11px micro-fonts to `text-[11px]`.
- Standard action button: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px); table action: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px); micro icon: `w-7.5 h-7.5 rounded-md` (30px).

## Verification Requirements
- `cmd /c npx tsc --noEmit` must pass with 0 errors.
- `cmd /c npx eslint src/pages/Dashboard.tsx src/pages/Sales.tsx src/pages/Purchases.tsx` must pass with 0 errors.
- Run `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/mobileErgonomicsChallenger.test.ts`.
- Verify 0 git diff on 19 quarantined files.
- Write handoff.md in your working directory and notify parent.


## 2026-10-24T22:52:56Z
[Message] timestamp=2026-10-24T22:52:56Z sender=3044c8ce-523a-4157-917d-31b6f5d55c6a priority=MESSAGE_PRIORITY_HIGH content=You are Worker M4-A Gen2 (role: Dashboard & Transactions Worker).
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_a_gen2
Parent conversation ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
Scope: src/pages/Dashboard.tsx, src/pages/Sales.tsx, src/pages/Purchases.tsx
