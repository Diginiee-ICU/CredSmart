# DISPATCH — Worker M4-B Gen2 (Catalog & Ledger Accounts Overhaul)

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Role: Catalog & Ledgers Worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b_gen2
- Parent: Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Assigned Scope
1. `src/pages/Items.tsx`
2. `src/pages/Inventory.tsx`
3. `src/pages/Parties.tsx`
4. `src/pages/Customers.tsx`
5. `src/pages/Suppliers.tsx`
6. `src/pages/CashAndBank.tsx`
7. `src/pages/Expenses.tsx`

## Protected Quarantine (STRICT NO-EDIT LOCK)
DO NOT touch any of the 19 invoice files (e.g. MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, etc.).

## Detailed Refactoring Instructions
Refer to:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`
- `.agents/teamwork/explorer_m4_2/handoff.md`

### 1. `Items.tsx`
- Elevate all sub-11px micro-fonts (`text-[8.5px]`, `text-[9px]`, `text-[10px]`) to `text-[11px] font-medium` or `font-semibold`.
- Standardize stock badges: Emerald (`#10B981` In Stock), Amber (`#F59E0B` Low Stock), Rose (`#E11D48` Out of Stock) with `text-[11px] font-semibold`.
- Standardize button sizes: 34px standard action (`h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`), 28px table action (`h-7 px-2.5 rounded-md text-[11px] font-medium`), 30px micro icon (`w-7.5 h-7.5 rounded-md`).

### 2. `Inventory.tsx`, `Customers.tsx`, `Suppliers.tsx`
- Convert container to screen-fitted desktop viewport (`h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50`).
- Purge whole-page scrolling. Use sticky thead and bounded scroll body (`flex-1 min-h-0 overflow-y-auto`).
- Purge all `glass-card-3d`, neon glow shadows (`shadow-[0_0_8px_...]`), and `glowing-btn-amber`.
- Strip redundant micro-prose from metric cards.
- Compact table row heights to 38px–42px (use `py-2` or `py-2.5`).

### 3. `Parties.tsx`
- Elevate sub-11px micro-fonts to `text-[11px]`.
- Verify Udhar Khata directional balance badges: Emerald (`To Pay`), Rose (`To Receive`).
- Align buttons to Royal Blue `#2563EB` and standard sizing.

### 4. `CashAndBank.tsx` & `Expenses.tsx`
- Replace arbitrary purple `#5046E5` / `rgb(79,70,229)` with Royal Blue `#2563EB` (`bg-blue-600 hover:bg-blue-700 text-white`).
- Purge `glass-card-3d` and glowing amber buttons.
- Elevate all sub-11px micro-fonts to `text-[11px]`.

## Verification Requirements
- `cmd /c npx tsc --noEmit` must pass with 0 errors.
- `cmd /c npx eslint src/pages/Items.tsx src/pages/Inventory.tsx src/pages/Parties.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/CashAndBank.tsx src/pages/Expenses.tsx` must pass with 0 errors.
- Verify 0 git diff on 19 quarantined files.
- Write handoff.md in your working directory and notify parent.
