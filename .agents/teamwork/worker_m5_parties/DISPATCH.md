# Worker Dispatch: Milestone 5 — Parties Directory & Balances Redesign

## Identity
- Role: Worker (Milestone 5 — Parties Directory & Balances)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5_parties`
- Exclusive File Ownership: `src/pages/Parties.tsx`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md`
- Core ERP Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any files in `src/components/invoices/mobile/` or `src/components/SalesInvoiceModal.tsx`.

## Mission & Requirements for `src/pages/Parties.tsx`
Redesign the Customers & Suppliers ledger interface:
1. **Balance Directionality**:
   - Clear, high-contrast visual distinction between Receivables ("To Collect" in Emerald) and Payables ("To Pay" in Rose) with `font-mono tabular-nums font-bold`.
   - Distinct badges (`Dr · To Collect ₹...` in emerald and `Cr · To Pay ₹...` in rose).
2. **Communication Actions**:
   - Direct 1-tap WhatsApp and phone call triggers on party rows (desktop) and touch cards (mobile).
3. **Category Tabs & Filters**:
   - Seamless switching between `Customers`, `Suppliers`, and combined `All Parties` views.
4. **Desktop Data Table & Mobile Cards**:
   - Desktop table: 36px rows with hairline borders, avatar initials, trade name, GSTIN, phone, category pill, balance, and actions dropdown.
   - Mobile card stream: High-density touch cards with directional balance and fast action triggers.
5. **Preservation**:
   - Retain full Ledger Reconciliation & Audit Dialog with zero regressions.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5_parties\handoff.md`
and send a completion message to the caller.

## 2026-10-21T11:22:12Z
You are Worker (Milestone 5 — Parties Directory & Balances Redesign).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5_parties
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5_parties\DISPATCH.md
and the authoritative original request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Also refer to PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md
and the survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md

Your exclusive write target: src/pages/Parties.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT EXCLUSION:
DO NOT modify any files in src/components/invoices/mobile/ or src/components/SalesInvoiceModal.tsx.

Implement the high-density Stripe/Linear aesthetic for src/pages/Parties.tsx across desktop and mobile, enhance directional balance badges, preserve reconciliation dialog, run verification commands (node node_modules/typescript/bin/tsc --noEmit), and write your completion report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5_parties\handoff.md. Once done, send a message to the caller.

