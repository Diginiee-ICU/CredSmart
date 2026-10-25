# Dispatch Assignment: Worker 3 (Milestone 3 — Dashboard, Parties & CRM HR Modernization)

## Mission
Modernize mobile list item containers across:
1. `src/pages/Dashboard.tsx` (recent activity transaction rows)
2. `src/pages/Parties.tsx` (mobile party directory rows)
3. `src/pages/crm/SalaryManagement.tsx` (salary profile list rows)
4. `src/pages/crm/Attendance.tsx` (attendance log rows & regularisation requests)

Eliminate individual floating cards (`rounded-xl border shadow-2xs`) in favor of clean minimal flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60` containers. Preserve 100% desktop layouts, state, and functionality.

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3`

## Mandatory Documents to Read
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST READ)
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md`
- Survey Findings & Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md`
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
- `src/pages/Dashboard.tsx`
- `src/pages/Parties.tsx`
- `src/pages/crm/SalaryManagement.tsx`
- `src/pages/crm/Attendance.tsx`
Do NOT touch any other files in the repository.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (from Explorer 3 Blueprint)
1. In `src/pages/Dashboard.tsx`:
   - Mobile recent activity list container (line ~901): replace `<div className="space-y-2">` with `<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">`.
   - Transaction rows (line ~913): remove `rounded-xl`, `border`, `shadow-2xs`, convert to flat `px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/60 transition-colors cursor-pointer touch-manipulation`.
2. In `src/pages/Parties.tsx`:
   - Mobile party stream container (line ~1199): replace `p-2.5 pb-28 space-y-2.5` with `px-0 pb-28 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin`.
   - Party item rows (lines ~1231-1239): replace `p-3 rounded-xl border ... shadow-2xs` with flat `px-3.5 py-3 transition-colors bg-white dark:bg-slate-900 space-y-2.5` (selected: `bg-blue-50/40 dark:bg-blue-950/30`, hover: `hover:bg-slate-50/60 dark:hover:bg-slate-800/30`).
   - Action triggers (Call, WhatsApp, Ledger, More menu): ensure all maintain `>= 44px` touch targets.
3. In `src/pages/crm/SalaryManagement.tsx`:
   - Tab 1 mobile container (line ~1455): replace `space-y-3` with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60`.
   - Replace `<CRMCard>` rows with flat `p-3.5 space-y-2.5` rows with `min-h-[44px]` CTA. Apply same divide-y pattern to Tab 2 and Tab 3 mobile wrappers if using space-y-3 with CRMCard.
4. In `src/pages/crm/Attendance.tsx`:
   - Tab 4 regularisation requests (line ~2273): replace `space-y-3` with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 mt-2`.
   - Request rows: flat `px-3.5 py-3` rows without outer box border.
5. Verification:
   - Run `node node_modules/typescript/bin/tsc --noEmit` (exit 0).
   - Run `node node_modules/vite/bin/vite.js build` (exit 0).
   - Verify only the 4 assigned files were modified.
6. Deliverables:
   - Write handoff to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3\handoff.md`.
   - Notify parent orchestrator via `send_message`.


## 2026-10-25T09:58:25Z
From: 24d614cb-853d-49d4-9ac2-cf0090c93a62
You are Worker 3 for Milestone 3 (Dashboard, Parties & CRM HR Modernization).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3
Read your dispatch instructions: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md
Read the survey handoff blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md
Read the minimal design rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You have exclusive write ownership of:
- src/pages/Dashboard.tsx
- src/pages/Parties.tsx
- src/pages/crm/SalaryManagement.tsx
- src/pages/crm/Attendance.tsx
DO NOT modify any other files, especially the 19 quarantine files.

Execute the refactoring in all 4 files as specified in DISPATCH.md and Explorer 3's blueprint.
Verify by running:
1. node node_modules/typescript/bin/tsc --noEmit (must exit 0)
2. node node_modules/vite/bin/vite.js build (must exit 0)
3. git status (verify only assigned files were touched)

Write your full completion handoff to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3\handoff.md and notify the parent orchestrator via send_message.
