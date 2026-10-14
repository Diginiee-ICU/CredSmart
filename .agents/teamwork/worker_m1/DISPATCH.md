## 2026-10-14T10:33:12Z
You are Worker M1 implementing Milestone 1: Core Billing Lifecycle Engine (Requirements R1 and R2).

Your designated working directory is:
c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1

MANDATORY FIRST STEP:
Read c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md.

Read the technical investigation reports:
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership:
You own:
- `src/components/SalesInvoiceModal.tsx`
- `src/services/documentsService.ts`

Tasks:
1. Implement Requirement R1 (In-Place Update Lifecycle on Re-Edit):
   - In `SalesInvoiceModal.tsx`:
     - Maintain `activeSavedDocId` state (`useState<string | null>(editingDoc?.id || null)`). Update it on `editingDoc` changes.
     - When `mobileSuccessInvoice` triggers `onEdit`, preserve `activeSavedDocId`:
       `onEdit={() => { if (mobileSuccessInvoice) { setActiveSavedDocId(mobileSuccessInvoice.id); } setMobileSuccessInvoice(null); }}`
     - In `handleSave`, pass `id: activeSavedDocId || editingDoc?.id || undefined` in `finalDoc`.
     - After `documentsService.saveDocument` returns `saved`, update `setActiveSavedDocId(saved.id)`.
     - When `activeSavedDocId || editingDoc?.id` is truthy, display toast:
       `toast.success(`Invoice #${fullDocumentNumber} updated successfully!`);`
   - In `src/services/documentsService.ts`:
     - In `saveDocument`, detect if `doc.id` is an existing sale in Supabase. If existing and not a temporary `doc_` id, execute an in-place update on `sales` (`.from("sales").update(...).eq("id", doc.id)`) and update `sale_items` (`.from("sale_items").delete().eq("sale_id", doc.id)` and `.from("sale_items").insert(saleItems)`).
     - Maintain existing local storage update and `stockService.handleDocumentStock(doc, "update", previousDoc)`.

2. Implement Requirement R2 (Mobile "Save & New" Engine & Sequence Reset):
   - In `SalesInvoiceModal.tsx:1163`, fix the conditional hierarchy: evaluate `if (saveAndNew)` FIRST before `else if (window.innerWidth < 1024)`.
   - In the `if (saveAndNew)` branch:
     - Increment `invoiceNumberSeq` cleanly (`parseInt(invoiceNumberSeq, 10) + 1` with padding preservation if applicable, e.g. `INV-139` → `INV-140`).
     - Reset form fields: clear `partyName`, `selectedCustomerId`, `customerSearch`, `partyPhone`, `partyGstin`, `partyAddress`, `billingAddress`, `billingPincode`, `billingPlaceOfSupply`, `sameAsParty`.
     - Reset items: `setItems([createNewRow("row-1")])`.
     - Reset payment amounts: `setAmountReceived(0)`, `setMarkAsFullyPaid(false)`.
     - Reset optional fields: `notes`, `ewayBillNo`, `vehicleNumber`, `poReference`, `additionalChargesAmount`, `overallDiscountValue`.
     - Clear `setActiveSavedDocId(null)` and `setMobileSuccessInvoice(null)` so mobile stays in editor mode on `MobileCreateInvoice`.
     - Display toast: `toast.success(`Invoice #${saved.documentNumber} created! Ready for next bill.`);`

3. Verification:
   - On Windows, invoke all commands via `cmd.exe /c`:
     - `cmd.exe /c npx tsc --noEmit`
     - `cmd.exe /c npx vitest run src/test/MobileInvoiceSuccessView`
   - Ensure 0 TypeScript compiler errors and 100% test pass rate across existing tests.
   - Ensure zero regressions to desktop invoice modal flows.

Write your handoff report to:
`c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md`

Use send_message to report completion back to the orchestrator.
