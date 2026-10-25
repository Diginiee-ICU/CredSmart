# Dispatch Assignment: Worker 1 (Milestone 1 — CRM Roles & Tasks Modernization)

## Mission
Implement the mobile list item container modernization in:
1. `src/pages/crm/RoleManagement.tsx`
2. `src/pages/crm/Tasks.tsx`

Eliminate the floating card-in-a-card anti-pattern (`rounded-xl border shadow-2xs`) on mobile viewports, converting them to clean minimal flat list rows inside a single `divide-y divide-slate-100 dark:divide-slate-800/60` container. Preserve 100% desktop layouts, state, and functionality.

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1`

## Mandatory Documents to Read
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST READ)
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md`
- Survey Findings & Exact Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`
- Minimal Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

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
- `src/pages/crm/RoleManagement.tsx`
- `src/pages/crm/Tasks.tsx`
Do NOT touch any other files in the repository.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements
1. In `src/pages/crm/RoleManagement.tsx`:
   - Locate the module accordion action grid wrapper at lines ~1713–1748.
   - Refactor the container and action items following Explorer 1's blueprint:
     Container: `divide-y divide-slate-100 dark:divide-slate-800/60 sm:divide-y-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-3 pt-1 rounded-xl sm:rounded-none overflow-hidden sm:overflow-visible`
     Row item: `px-3.5 py-3 flex items-center justify-between gap-3 min-h-[44px] transition-colors sm:rounded-xl sm:border sm:p-3`
     Maintain all `Switch` controls, click handlers (`handleToggleAction`), state, disabled checks for super-admin.
     Ensure touch targets are `min-h-[44px]` and typography >= 11px.
2. In `src/pages/crm/Tasks.tsx`:
   - Locate the Kanban column tasks container and task item cards at lines ~874–905.
   - Refactor following Explorer 1's blueprint:
     Outer column: `flex flex-col rounded-xl md:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2 sm:p-3 min-h-0 md:min-h-[380px]`
     Task container: `divide-y divide-slate-100 dark:divide-slate-800/60 md:divide-y-0 md:space-y-2.5 flex-1 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent rounded-xl md:rounded-none border border-slate-200/80 dark:border-slate-800 md:border-0 overflow-hidden md:overflow-visible`
     Task item: `px-3.5 py-3 md:p-3.5 space-y-2 md:space-y-2.5 bg-white dark:bg-slate-900 md:rounded-xl md:border md:border-slate-200/80 md:dark:border-slate-800 md:shadow-2xs hover:shadow-xs transition-all`
     Maintain all task state, modals, approve/revision handlers, tags.
3. Verification:
   - Run `node node_modules/typescript/bin/tsc --noEmit` — MUST pass with 0 errors.
   - Run `node node_modules/vite/bin/vite.js build` — MUST complete with `✓ built`.
   - Run `git status` to verify ONLY `RoleManagement.tsx` and `Tasks.tsx` were modified.
4. Deliverables:
   - Write your complete handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md` with:
     - Changes made
     - Exact before/after line ranges
     - Build verification results
     - Quarantine verification check
   - Send completion message to parent orchestrator.


## 2026-10-25T09:16:52Z
You are Worker 1 for Milestone 1 (CRM Roles & Tasks Modernization).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1
Read your dispatch instructions: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md
Read the survey handoff blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md
Read the minimal design rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You have exclusive write ownership of:
- src/pages/crm/RoleManagement.tsx
- src/pages/crm/Tasks.tsx
DO NOT modify any other files, especially the 19 quarantine files.

Execute the refactoring in both files as specified in DISPATCH.md and Explorer 1's blueprint.
Verify by running:
1. node node_modules/typescript/bin/tsc --noEmit (must exit 0)
2. node node_modules/vite/bin/vite.js build (must exit 0)
3. git status (verify only those 2 files were touched)

Write your full completion handoff to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md and notify the parent orchestrator via send_message.
