## 2026-10-14T09:58:03Z

You are Explorer 1 investigating SalesInvoiceModal state management, in-place edit updates, and Save & New sequence reset for mobile billing lifecycle.

Your working directory is:
c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1

MANDATORY FIRST STEP:
Read c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md.

Task:
Deeply investigate `src/components/sales/SalesInvoiceModal.tsx` and related state management for Requirements R1 and R2:
1. Examine line 1163 and surrounding code: the conditional block where `setMobileSuccessInvoice(saved)` is called, how `saveAndNew` is handled on desktop vs mobile, and why `saveAndNew` is currently starved on mobile when `window.innerWidth < 1024`.
2. Examine `handleSave` in `SalesInvoiceModal.tsx`: how does it create vs update documents? Does it pass an existing `id` when editing? What does `documentsService.saveDocument` do when an `id` is present vs undefined?
3. Examine how `editingDoc` or `activeSavedDocId` can be preserved when returning from `MobileInvoiceSuccessView` via Edit (`onEdit`), so subsequent "Generate Bill" saves update the existing document rather than creating a duplicate.
4. Examine how sequence number reset / incrementation works (`invoiceNumber`, e.g. `INV-139` -> `INV-140`), how form fields (party, line items, payments) are reset, and how the toast is displayed.
5. Check what props `SalesInvoiceModal.tsx` passes to `MobileCreateInvoice.tsx` and `MobileInvoiceSuccessView.tsx`.

Write your comprehensive findings and recommendations to:
`c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`

Use send_message to report completion back to the orchestrator.
