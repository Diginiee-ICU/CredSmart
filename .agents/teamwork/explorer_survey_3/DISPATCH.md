# Dispatch: Frontend Billing & Cache Hydration Explorer (Survey 3)

Read:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`)
- `src/components/sales/SalesInvoiceModal.tsx`
- `src/components/sales/mobile/MobileCreateInvoice.tsx`
- `src/components/sales/mobile/MobileInvoiceSuccessView.tsx`
- `src/services/documentsService.ts`
- `src/services/networkInvoicingService.ts`
- `src/contexts/ProductsContext.tsx`
- `src/pages/Customers.tsx`
- `src/pages/Parties.tsx`

Investigate:
1. Bill Generation Performance (<500ms):
   - Locate where `downloadExactInvoicePdf` (`html2canvas`) is being called during "Generate Bill" or save flows.
   - Trace how to decouple it so Mobile immediately transitions to `MobileInvoiceSuccessView`, leaving PDF download/print on-demand.
   - Locate `networkInvoicingService.sendSalesInvoiceToNetwork` and how to convert it to an unawaited background task (`void sendSalesInvoiceToNetwork(...)`).
   - Locate how `documentsService.saveDocument` persists sales and line items, and how to send sale + items in a single API call instead of sequential roundtrips.
2. List Visibility & Cache Hydration:
   - Examine how `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts` handle API failures.
   - Check why newly created items/parties don't appear immediately or disappear on transient errors.
   - Determine how to provide local cached fallback + non-blocking warning toast + immediate in-memory state reflection.

Deliverable:
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_3/handoff.md`.


## 2026-10-20T10:45:16Z
[Message] timestamp=2026-10-20T10:45:16Z sender=47768107-cdc6-46b5-a415-7ea52564fffb priority=MESSAGE_PRIORITY_HIGH content=You are Explorer Survey 3. Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3`. Read `DISPATCH.md` in your working directory and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-20T10:39:14Z`).
Investigate frontend billing performance and cache hydration:
1. `SalesInvoiceModal.tsx`, `MobileCreateInvoice.tsx`, `documentsService.ts`, `networkInvoicingService.ts`:
   - Trace where `downloadExactInvoicePdf` (`html2canvas`) is called during bill generation and how to decouple it so mobile transitions instantly (<500ms) to `MobileInvoiceSuccessView`.
   - Trace how `sendSalesInvoiceToNetwork` can be run in the background unawaited (`void sendSalesInvoiceToNetwork(...)`).
   - Trace how `documentsService.saveDocument` can send sale + items in a single API call to `POST /api/sales`.
2. `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts`:
   - Trace how to fall back to cached data with non-blocking toast warning on network failure.
   - Trace how to update local in-memory state immediately upon creation so newly created entities appear instantly.
Write your complete findings and recommendations to `.agents/teamwork/explorer_survey_3/handoff.md` and send a message back when done.
