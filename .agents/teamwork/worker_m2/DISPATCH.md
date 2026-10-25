# Dispatch Assignment: Worker 2 (Milestone 2 — Core Billing & Inventory Modernization)

## Mission
Modernize mobile list item containers across the core billing and inventory modules:
1. `src/pages/Sales.tsx` (verify unbordered container and flat divide-y stream)
2. `src/pages/Purchases.tsx` (remove outer wrapper double border, convert mobile stream and rows to flat divide-y, clean up 44px touch targets on action buttons)
3. `src/pages/Items.tsx` (remove outer wrapper double border, convert mobile stream and product cards to flat divide-y)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2`

## Mandatory Documents to Read
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST READ)
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md`
- Survey Findings & Exact Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md`
- Minimal Design System: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

## 19 Protected Quarantine Files — NEVER TOUCH OR MODIFY:
- `src/components/invoices/mobile/MobileCreateInvoice.tsx`
- `src/components/invoices/mobile/AddItemModal.tsx`
- `src/components/invoices/mobile/SelectPartyModal.tsx`
- `src/components/invoices/mobile/EditItemModal.tsx`
- `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
- `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
- `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
- `src/components/invoices/mobile/CreatePartyModal.tsx`
- `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
- `src/components/items/mobile/CreateNewItemModal.tsx`
- `src/components/SalesInvoiceModal.tsx`
- `src/components/PurchaseInvoiceModal.tsx`
- `src/components/invoices/AddItemsToBillModal.tsx`
- `src/components/invoices/InvoiceFitView.tsx`
- `src/components/invoices/UnifiedInvoiceRenderer.tsx`
- `src/utils/downloadExactInvoice.ts`
- `src/utils/whatsappPdfShare.ts`
- `src/utils/invoiceThemeLoader.ts`
- `src/services/documentsService.ts`

## File Write Ownership
You have exclusive write ownership of:
- `src/pages/Sales.tsx`
- `src/pages/Purchases.tsx`
- `src/pages/Items.tsx`
Do NOT touch any other files in the repository.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (from Explorer 2 Blueprint)
1. In `src/pages/Sales.tsx`:
   - Inspect line 940 (outer wrapper) and lines 942, 965–973 (mobile stream & rows). Verify that the outer container has no double border and items render as flat `px-3.5 py-3` rows in `divide-y divide-slate-100 dark:divide-slate-800/60`. Ensure touch targets are >= 44px. Do not introduce any regressions.
2. In `src/pages/Purchases.tsx`:
   - Outer wrapper (line 864): Replace `flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col justify-between` with `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`.
   - Mobile stream container (line 866): Replace `block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 space-y-2.5 scrollbar-thin overscroll-y-contain` with `block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain`.
   - Mobile item row (lines 897–905): Replace `p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs active:scale-[0.99]` with flat row `px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2` (selected: `bg-amber-50/30 dark:bg-amber-950/20`, unselected hover: `hover:bg-slate-50/50 dark:hover:bg-slate-800/30`).
   - Action buttons (lines 958, 966, 1029, 1038): Refine `w-11 h-8.5 min-w-[44px] min-h-[44px]` to `w-11 h-11 min-w-[44px] min-h-[44px]`.
3. In `src/pages/Items.tsx`:
   - Outer wrapper (line 1019): Replace `flex-1 min-h-0 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col` with `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`.
   - Mobile stream container (line 1021): Replace `block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-2 scrollbar-thin overscroll-y-contain` with `block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain`.
   - Mobile item row (lines 1054–1060): Replace `p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs active:scale-[0.99]` with flat row `px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2` (selected: `bg-blue-50/30 dark:bg-blue-950/20`, unselected hover: `hover:bg-slate-50/50 dark:hover:bg-slate-800/30`).
4. Verification:
   - Run `node node_modules/typescript/bin/tsc --noEmit` — MUST pass with 0 errors.
   - Run `node node_modules/vite/bin/vite.js build` — MUST complete with `✓ built`.
   - Run `git status` to verify only the assigned files were modified.
5. Deliverables:
   - Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md`.
   - Notify parent orchestrator via `send_message`.


## 2026-10-25T09:35:39Z
You are Worker 2 for Milestone 2 (Core Billing & Inventory Modernization).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2
Read your dispatch instructions: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md
Read the survey handoff blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md
Read the minimal design rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You have exclusive write ownership of:
- src/pages/Sales.tsx
- src/pages/Purchases.tsx
- src/pages/Items.tsx
DO NOT modify any other files, especially the 19 quarantine files.

Execute the refactoring in Purchases.tsx and Items.tsx as specified in DISPATCH.md and Explorer 2's blueprint, and verify Sales.tsx.
Verify by running:
1. node node_modules/typescript/bin/tsc --noEmit (must exit 0)
2. node node_modules/vite/bin/vite.js build (must exit 0)
3. git status (verify only assigned files were touched)

Write your full completion handoff to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md and notify the parent orchestrator via send_message.
