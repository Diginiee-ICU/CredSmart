# Dispatch Assignment: Survey Explorer 3 (Dashboard, Parties, & CRM HR)

## Mission
Investigate and map all occurrences of the "nested/boxy card container" anti-pattern in the assigned dashboard, party, and HR files:
1. `src/pages/Dashboard.tsx` (~9 hits: recent activity transaction rows)
2. `src/pages/Parties.tsx` (~6 hits: mobile party directory rows)
3. `src/pages/crm/SalaryManagement.tsx` (~4 hits: salary profile list rows)
4. `src/pages/crm/Attendance.tsx` (~4 hits: attendance log rows)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read before starting)
- Dispatch Instructions: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\DISPATCH.md`
- Minimal Design System: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

## 19 Protected Quarantine Files — NEVER MODIFY OR SUGGEST MODIFYING:
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

## Tasks & Investigation Requirements
1. In `src/pages/Dashboard.tsx`:
   - Identify recent activity transaction rows in mobile view (`block md:hidden`).
   - Exact line numbers, current container classes, row classes.
   - Proposed replacement with flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60`.
2. In `src/pages/Parties.tsx`:
   - Identify mobile party directory rows (`block md:hidden`).
   - Exact line numbers, current container classes, row classes.
   - Proposed replacement with flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60`.
3. In `src/pages/crm/SalaryManagement.tsx`:
   - Identify salary profile list rows in mobile view.
   - Exact line numbers, current container classes, row classes.
   - Proposed replacement with flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60`.
4. In `src/pages/crm/Attendance.tsx`:
   - Identify attendance log rows in mobile view.
   - Exact line numbers, current container classes, row classes.
   - Proposed replacement with flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60`.
5. Verify:
   - Minimum 44px touch targets on interactive rows.
   - No sub-11px fonts.
   - Desktop views (`hidden md:...` or table views) remain 100% untouched.
   - Business logic, handlers, data fetching remain 100% untouched.
6. Write survey report to `handoff.md` in your working directory and notify parent via `send_message`.


## 2026-10-25T08:58:32Z
You are Explorer 3 (Survey: Dashboard, Parties, & CRM HR).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3
Read your dispatch assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the design system rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

Your task:
Survey and investigate the boxy/nested card container anti-pattern in:
1. src/pages/Dashboard.tsx (recent activity transaction rows)
2. src/pages/Parties.tsx (mobile party directory rows)
3. src/pages/crm/SalaryManagement.tsx (salary profile list rows)
4. src/pages/crm/Attendance.tsx (attendance log rows)

Never modify or suggest modifying any of the 19 protected quarantine files listed in DISPATCH.md.
Document exact line numbers, existing classes, proposed minimal divide-y replacements, touch targets (>=44px), and font sizes (>=11px).
Write your survey findings to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md.
When finished, notify the orchestrator using send_message.
