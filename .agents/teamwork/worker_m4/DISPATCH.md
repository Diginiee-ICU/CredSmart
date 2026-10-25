# Dispatch Assignment: Worker M4 (Final Global E2E Build & Verification)

## Mission
Execute full-scope global verification and quality assurance across the entire project for all 9 modernized mobile pages:
1. `src/pages/crm/RoleManagement.tsx`
2. `src/pages/crm/Tasks.tsx`
3. `src/pages/Sales.tsx`
4. `src/pages/Purchases.tsx`
5. `src/pages/Items.tsx`
6. `src/pages/Dashboard.tsx`
7. `src/pages/Parties.tsx`
8. `src/pages/crm/SalaryManagement.tsx`
9. `src/pages/crm/Attendance.tsx`

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST READ)
- Project Architecture: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md`
- Design Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

## 19 Protected Quarantine Files — MUST REMAIN 100% UNTOUCHED
1. `src/components/invoices/mobile/MobileCreateInvoice.tsx`
2. `src/components/invoices/mobile/AddItemModal.tsx`
3. `src/components/invoices/mobile/SelectPartyModal.tsx`
4. `src/components/invoices/mobile/EditItemModal.tsx`
5. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
6. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
7. `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
8. `src/components/invoices/mobile/CreatePartyModal.tsx`
9. `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
10. `src/components/items/mobile/CreateNewItemModal.tsx`
11. `src/components/SalesInvoiceModal.tsx`
12. `src/components/PurchaseInvoiceModal.tsx`
13. `src/components/invoices/AddItemsToBillModal.tsx`
14. `src/components/invoices/InvoiceFitView.tsx`
15. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
16. `src/utils/downloadExactInvoice.ts`
17. `src/utils/whatsappPdfShare.ts`
18. `src/utils/invoiceThemeLoader.ts`
19. `src/services/documentsService.ts`

## Mandatory Verification Commands
Run:
1. `node node_modules/typescript/bin/tsc --noEmit`
2. `node node_modules/vite/bin/vite.js build`
3. Run vitest on the empiric challenge suites:
   `node node_modules/vitest/vitest.mjs run src/test/crmRolesTasksModernization.challenger.test.ts src/test/m3DashboardPartiesCrmHrEmpiric.challenger.test.ts`
4. Verify git status to confirm only the expected 8 target files (plus tests) were modified, and 0 quarantine files were touched:
   `git status --short`

Write your comprehensive report and findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\handoff.md` and notify the parent orchestrator via send_message.


## 2026-10-25T10:50:45Z
You are Worker M4 for the final global verification milestone of the Mobile List Item Container Modernization project.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4
Read your dispatch: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\DISPATCH.md
Read the original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\PROJECT.md
Read the minimal design system: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

Run:
1. node node_modules/typescript/bin/tsc --noEmit
2. node node_modules/vite/bin/vite.js build
3. node node_modules/vitest/vitest.mjs run src/test/crmRolesTasksModernization.challenger.test.ts src/test/m3DashboardPartiesCrmHrEmpiric.challenger.test.ts
4. Verify git status to confirm only expected target files are modified and all 19 quarantine files are 100% untouched.

Write your report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\handoff.md and send_message to parent orchestrator.
MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
