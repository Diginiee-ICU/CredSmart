# Worker Dispatch: Milestone 1 — Executive ERP Dashboard Redesign

## Identity
- Role: Worker (Milestone 1 — Executive ERP Dashboard)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_dashboard`
- Exclusive File Ownership: `src/pages/Dashboard.tsx`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md`
- Core ERP Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any of the following files:
- `src/components/invoices/mobile/MobileCreateInvoice.tsx`
- `src/components/SalesInvoiceModal.tsx`
- `src/components/invoices/mobile/AddItemModal.tsx`
- `src/components/invoices/mobile/SelectPartyModal.tsx`
- `src/components/invoices/mobile/EditItemModal.tsx`
- `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
Trigger `SalesInvoiceModal` strictly via `setShowSalesInvoiceModal(true)` without modifying any modal internals.

## Mission & Requirements for `src/pages/Dashboard.tsx`
Redesign the primary store dashboard across both Desktop and Mobile viewports into a clean, high-density Stripe/Linear aesthetic:
1. **Surface & Card Styling**:
   - Replace skeuomorphic `.glass-card-3d` (heavy blur, layered shadows) on desktop cards with flat, crisp hairline cards:
     `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs`.
2. **High-Density Metric Grid**:
   - High-contrast cards for `TO COLLECT`, `TO PAY`, `CASH & BANK`, and `TODAY'S SALES`.
   - Use `font-mono tabular-nums font-bold` for all Indian Rupee (`₹`) numerals.
   - Refined trend indicators and hairline color accents (Cyan/Blue for To Collect, Amber/Orange for To Pay, Gold/Amber for Cash & Bank, Emerald for Today's Sales).
3. **Dismissible Tally Banner**:
   - Compact, hairline-bordered banner with explicit close button (`X`) and 1-tap scan action.
   - Preserve persistence in localStorage (`credsmart_dismissed_mobile_tally_banner`).
4. **Quick Action Bar**:
   - Sleek pills for frequent operations (`+ Sale Bill`, `+ New Item`, `+ Customer`, `Day Book`, `Barcode Scan`).
   - Touch-friendly (≥ 44px hit targets) on mobile.
5. **Recent Ledger Feed**:
   - High-density transaction list displaying customer name, invoice #, relative date, payment status chip (`PAID` / `PENDING` / `OVERDUE` with micro-dots), and bold total.
6. **Mobile Ergonomics**:
   - Ensure zero horizontal scroll overflow on mobile viewports (< 768px).
   - Bottom padding `pb-24` to avoid collision with bottom nav dock.

## Verification Commands Required
Run and document results in your handoff report:
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with exit code 0)
2. `cmd /c npx vitest run src/test/mobileDashboardRedesign.test.tsx` (All 13 tests must pass)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_dashboard\handoff.md`
and notify the orchestrator via send_message.


## 2026-10-21T11:08:07Z
You are Worker (Milestone 1 — Executive ERP Dashboard Redesign).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_dashboard
Exclusive write target: src/pages/Dashboard.tsx
MANDATORY INTEGRITY WARNING: DO NOT CHEAT.
STRICT EXCLUSION: DO NOT modify any files in src/components/invoices/mobile/ or src/components/SalesInvoiceModal.tsx. All invoice creation logic must remain untouched.
Implement high-density Stripe/Linear aesthetic for src/pages/Dashboard.tsx, run verification commands (node node_modules/typescript/bin/tsc --noEmit and cmd /c npx vitest run src/test/mobileDashboardRedesign.test.tsx), and write your completion report to handoff.md. Once done, send a message to caller.
