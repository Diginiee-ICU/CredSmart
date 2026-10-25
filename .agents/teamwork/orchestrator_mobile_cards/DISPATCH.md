# Dispatch Instructions: Mobile List Item Container Modernization (Fix Nested Box Anti-Pattern)

## Mission
Eliminate the "nested/boxy card container" anti-pattern across CredSmart mobile pages. Replace individual floating bordered item cards (`rounded-xl border shadow-2xs`) inside outer containers with clean minimal flat list rows separated by subtle hairlines (`divide-y divide-slate-100 dark:divide-slate-800/60`).

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Orchestrator working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## 9 Target Files & Scope
1. `src/pages/crm/RoleManagement.tsx` — 32 permission toggle rows (`rounded-xl border p-3 flex items-center justify-between gap-3` -> flat `px-3.5 py-3 flex items-center justify-between gap-3` in divide-y container)
2. `src/pages/Items.tsx` — 13 mobile product list item cards
3. `src/pages/Sales.tsx` — 9 mobile invoice list cards + outer wrapper double border:
   `flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden` -> `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`
4. `src/pages/Dashboard.tsx` — 9 recent activity transaction rows
5. `src/pages/Purchases.tsx` — 6 mobile purchase invoice list cards
6. `src/pages/Parties.tsx` — 6 mobile party directory rows
7. `src/pages/crm/SalaryManagement.tsx` — 4 salary profile list rows
8. `src/pages/crm/Attendance.tsx` — 4 attendance log rows
9. `src/pages/crm/Tasks.tsx` — 3 task cards in Kanban groups

## Critical Constraints & Quarantine List
1. **19 Protected Quarantine Files — NEVER MODIFY**:
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
2. **Desktop Preservation**: Desktop views (`hidden md:block`, `hidden md:flex`, etc.) must remain 100% untouched and functional.
3. **Ergonomics & Typography**:
   - Interactive rows must maintain `min-h-[44px]` touch targets.
   - No sub-11px font sizes (`text-[11px]` minimum).
   - Single primary accent: Royal Blue `bg-blue-600` only.
4. **Zero Logic Regression**: Keep all state, handlers, data queries, and mutations 100% intact.

## Verification Protocol
1. TypeScript compilation: `node node_modules/typescript/bin/tsc --noEmit` must pass with 0 errors.
2. Vite production build: `node node_modules/vite/bin/vite.js build` must pass with `✓ built`.
3. Verify all 19 quarantine files are untouched via git status.

## 2026-10-25T08:56:19Z
From: ee7d6532-b4a8-4481-8163-e67211e8e074
Content: You are the Project Orchestrator for the Mobile List Item Container Modernization task.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards
The full project request is in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Dispatch brief is in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\DISPATCH.md
Design system rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

Your task is to fix the 'nested/boxy card container' anti-pattern across mobile views in CredSmart in 9 target files:
1. `src/pages/crm/RoleManagement.tsx` — 32 hits (permission toggle rows become flat rows in divide-y container)
2. `src/pages/Items.tsx` — 13 hits (mobile product list cards)
3. `src/pages/Sales.tsx` — 9 hits (mobile invoice list cards + outer wrapper double border)
4. `src/pages/Dashboard.tsx` — 9 hits (recent activity transaction rows)
5. `src/pages/Purchases.tsx` — 6 hits (mobile purchase invoice list cards)
6. `src/pages/Parties.tsx` — 6 hits (mobile party directory rows)
7. `src/pages/crm/SalaryManagement.tsx` — 4 hits (salary profile list rows)
8. `src/pages/crm/Attendance.tsx` — 4 hits (attendance log rows)
9. `src/pages/crm/Tasks.tsx` — 3 hits (task cards in Kanban groups)

For Sales.tsx specifically: also fix the outer wrapper double border:
`flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden` -> `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`

Requirements & Constraints:
- NEVER modify any of the 19 protected quarantine files listed in DISPATCH.md!
- 100% desktop preservation (all desktop views/tables remain untouched).
- Minimum 44px touch targets on interactive rows. No sub-11px fonts.
- Pure Royal Blue accent (`bg-blue-600`).
- Maintain `progress.md` and `plan.md` in your working directory.
- Verify with `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/vite/bin/vite.js build`.
- Report completion and handoff once fully implemented and verified clean.
