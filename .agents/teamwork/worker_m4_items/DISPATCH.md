# Worker Dispatch: Milestone 4 — Items & Inventory Catalog Redesign

## Identity
- Role: Worker (Milestone 4 — Items & Inventory Catalog)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_items`
- Exclusive File Ownership: `src/pages/Items.tsx`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md`
- Core ERP Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any files in `src/components/invoices/mobile/` or `src/components/SalesInvoiceModal.tsx`.

## Mission & Requirements for `src/pages/Items.tsx`
Modernize the inventory and product catalog into a high-density Stripe/Linear aesthetic:
1. **Catalog Density**:
   - Desktop Table: Crisp product rows showing item name, SKU/Barcode with mono formatting, current stock with micro-dot status badges (`● In Stock` in emerald, `● Low Stock` in amber, `● Out of Stock` in rose), selling price, and purchase price in `font-mono tabular-nums`.
   - Mobile Cards: High-density touch card stream displaying product name, image/thumbnail, stock badge, prices, SKU, and "Adjust" stock button.
2. **Quick Operations**:
   - 1-tap barcode scanner trigger and category filter chips.
   - Search input with clear `X` button.
   - Swift stock adjustment drawer/dialog (`Dialog` lines 1479-1551) styled with clean hairline surfaces.
3. **KPI Metrics Strip**:
   - Refactor the 4 inventory metric cards (`Stock Valuation`, `Low Stock`, `Total Catalog`, `Zero Stock`) into hairline cards with top color accents.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_items\handoff.md`
and send a completion message to the caller.


## 2026-10-21T11:22:11Z
[Message] sender=2a5bd82c-5175-47f3-a02b-3ee793555f5a priority=MESSAGE_PRIORITY_HIGH content=You are Worker (Milestone 4 — Items & Inventory Catalog Redesign).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_items
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_items\DISPATCH.md
and the authoritative original request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Also refer to PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md
and the survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_erp\handoff.md

Your exclusive write target: src/pages/Items.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT EXCLUSION:
DO NOT modify any files in src/components/invoices/mobile/ or src/components/SalesInvoiceModal.tsx.

Implement the high-density Stripe/Linear aesthetic for src/pages/Items.tsx across desktop and mobile, style the stock adjustment drawer, run verification commands (node node_modules/typescript/bin/tsc --noEmit), and write your completion report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_items\handoff.md. Once done, send a message to the caller.
