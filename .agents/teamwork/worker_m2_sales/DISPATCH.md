# Worker Dispatch: Milestone 2 — Sales & Invoicing Hub Redesign

## Identity
- Role: Worker (Milestone 2 — Sales & Invoicing Hub)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_sales`
- Exclusive File Ownership: `src/pages/Sales.tsx`

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
In `Sales.tsx`, trigger `SalesInvoiceModal` strictly via the existing controlled props (`open={createModalOpen}`, `onOpenChange={setCreateModalOpen}`, `editingDoc={editingDoc}`).

## Mission & Requirements for `src/pages/Sales.tsx`
Redesign the Sales transactions interface into a clean, high-density Stripe/Linear aesthetic:
1. **Desktop View (`hidden md:flex`)**:
   - High-density data table with 36-40px rows (`py-2.5 px-3`) with hairline row dividers (`border-b border-slate-100 dark:border-slate-800/60`).
   - Sticky subtle gray header (`bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 text-[10.5px] uppercase font-mono tracking-wider text-slate-500`).
   - Sortable columns: Date, Invoice #, Party Name, Due In, Amount, Status, Actions.
   - Refined status pills with micro-dots (`● Paid` in emerald, `● Unpaid` in rose, `● Partial` in amber).
   - Fast inline action icons (Print, PDF download, WhatsApp share, More dropdown).
   - 4 hairline KPI cards at top (`Total Volume`, `Settled`, `Receivables`, `Voided`) replacing heavy glass cards.
2. **Mobile View (`block md:hidden`)**:
   - High-density touch card stream with hairline borders (`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs`).
   - Bold monospaced Indian Rupee (`₹`) amounts (`font-mono tabular-nums font-bold`).
   - Touch-friendly payment status chips with micro-dots (>=44px hit targets).
   - Inline action triggers (Print, PDF, WhatsApp, More menu).
3. **General**:
   - Zero horizontal overflow.
   - Retain sub-document tabs (`sales_invoice`, `quotation`, `payment_in`, `sales_return`, `credit_note`, `delivery_challan`, `proforma_invoice`) and date presets.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)
2. `cmd /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx` (Must pass)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_sales\handoff.md`
and send a completion message to the caller.

## 2026-10-21T11:22:10Z
[Message] timestamp=2026-10-21T11:22:10Z sender=2a5bd82c-5175-47f3-a02b-3ee793555f5a priority=MESSAGE_PRIORITY_HIGH content=You are Worker (Milestone 2 — Sales & Invoicing Hub Redesign).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_sales
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_sales\DISPATCH.md
and the authoritative original request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Also refer to PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md
and the survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md

Your exclusive write target: src/pages/Sales.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT EXCLUSION:
DO NOT modify any files in src/components/invoices/mobile/ or src/components/SalesInvoiceModal.tsx. In Sales.tsx, trigger SalesInvoiceModal strictly via existing controlled boolean props.

Implement the high-density Stripe/Linear aesthetic for src/pages/Sales.tsx across desktop and mobile, run verification commands (node node_modules/typescript/bin/tsc --noEmit and cmd /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx), and write your completion report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_sales\handoff.md. Once done, send a message to the caller.
