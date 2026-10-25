# Dispatch Assignment: Survey Explorer 1 (CRM Roles & Tasks)

## Mission
Investigate and map all occurrences of the "nested/boxy card container" anti-pattern in the assigned CRM files:
1. `src/pages/crm/RoleManagement.tsx` (~32 hits: permission toggle rows)
2. `src/pages/crm/Tasks.tsx` (~3 hits: task cards in Kanban groups)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1`

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
1. Examine `src/pages/crm/RoleManagement.tsx` and identify:
   - All permission toggle rows currently styled with `rounded-xl border p-3 flex items-center justify-between gap-3` (or similar boxy floating card styles).
   - The outer container elements wrapping these rows.
   - Exact line numbers and code snippets.
   - Recommended replacement: flat `px-3.5 py-3 flex items-center justify-between gap-3` rows inside a `divide-y divide-slate-100 dark:divide-slate-800/60` container.
   - Ensure minimum 44px touch targets on interactive controls/switches.
   - Ensure desktop views (`hidden md:...` or table structures) remain 100% untouched.
2. Examine `src/pages/crm/Tasks.tsx` and identify:
   - Task card containers in Kanban groups on mobile (`rounded-xl border shadow-2xs`).
   - Exact line numbers and snippets.
   - Recommended replacement: clean flat rows or divide-y styling.
   - Verify touch targets and styling.
3. Write a comprehensive survey report to `handoff.md` in your working directory.
4. Notify parent orchestrator via `send_message`.


## 2026-10-25T08:58:31Z
[Message] sender=24d614cb-853d-49d4-9ac2-cf0090c93a62 priority=MESSAGE_PRIORITY_HIGH
You are Explorer 1 (Survey: CRM Roles & Tasks).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1
Read your dispatch assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the design system rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

Your task:
Survey and investigate the boxy/nested card container anti-pattern in:
1. src/pages/crm/RoleManagement.tsx (permission toggle rows)
2. src/pages/crm/Tasks.tsx (task cards in Kanban groups)

Never modify or suggest modifying any of the 19 protected quarantine files listed in DISPATCH.md.
Document exact line numbers, existing classes, proposed minimal divide-y replacements, touch targets (>=44px), and font sizes (>=11px).
Write your survey findings to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md.
When finished, notify the orchestrator using send_message.
