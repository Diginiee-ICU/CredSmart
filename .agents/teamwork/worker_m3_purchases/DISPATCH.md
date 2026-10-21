# Worker Dispatch: Milestone 3 — Purchases & Supplier Ledger Redesign

## Identity
- Role: Worker (Milestone 3 — Purchases & Supplier Ledger)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_purchases`
- Exclusive File Ownership: `src/pages/Purchases.tsx`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md`
- Core ERP Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any files in `src/components/invoices/mobile/` or `src/components/SalesInvoiceModal.tsx`.

## Mission & Requirements for `src/pages/Purchases.tsx`
Redesign the Purchases ledger to match the unified Stripe/Linear standard:
1. **Bills Overview (Desktop & Mobile)**:
   - Desktop: High-density data table (`py-2.5 px-3`) with sticky subtle gray header, hairline borders, featuring supplier name, bill number, bill date, payment status badge with micro-dot, and total payable amount in `font-mono tabular-nums font-bold`.
   - Mobile: High-density touch card stream with supplier name, bill #, date, status badge, and bold total.
2. **Filters & Actions**:
   - Quick filter tabs for pending vendor payments (`All`, `Paid`, `Unpaid`, `Purchase Orders`).
   - Clean search input with hairline border and clear button.
   - 1-tap record payment trigger and action triggers.
3. **B2B Auto-Sync Inward Banner**:
   - Redesign `PendingInwardBanner` to a sleek, compact hairline banner with emerald/teal accent line.
4. **KPI Metric Strip**:
   - Modernize the 3 KPI cards (`Total Purchases`, `Paid Out`, `Vendor Payables`) with hairline borders and tabular Indian Rupee values.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)
2. `cmd /c npx vitest run src/test/networkInvoicing.test.ts` (Must pass)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_purchases\handoff.md`
and send a completion message to the caller.


## 2026-10-21T11:22:11Z
You are Worker (Milestone 3 — Purchases & Supplier Ledger Redesign).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_purchases
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_purchases\DISPATCH.md
and the authoritative original request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Also refer to PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md
and the survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md

Your exclusive write target: src/pages/Purchases.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT EXCLUSION:
DO NOT modify any files in src/components/invoices/mobile/ or src/components/SalesInvoiceModal.tsx.

Implement the high-density Stripe/Linear aesthetic for src/pages/Purchases.tsx across desktop and mobile, style PendingInwardBanner, run verification commands (node node_modules/typescript/bin/tsc --noEmit and cmd /c npx vitest run src/test/networkInvoicing.test.ts), and write your completion report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_purchases\handoff.md. Once done, send a message to the caller.
