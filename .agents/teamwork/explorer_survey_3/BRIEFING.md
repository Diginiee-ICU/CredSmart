# BRIEFING — 2026-10-20T10:55:00Z

## Mission
Investigate frontend billing performance (<500ms) and cache hydration for CredSmart:
1. Bill Generation Performance (<500ms):
   - Trace where `downloadExactInvoicePdf` (`html2canvas`) is called during bill generation and decouple it so mobile transitions instantly (<500ms) to `MobileInvoiceSuccessView`.
   - Trace how `sendSalesInvoiceToNetwork` can be run in the background unawaited (`void sendSalesInvoiceToNetwork(...)`).
   - Trace how `documentsService.saveDocument` can send sale + items in a single API call to `POST /api/sales`.
2. List Visibility & Cache Hydration:
   - Trace how `ProductsContext.tsx`, `Customers.tsx`, `Parties.tsx`, and `documentsService.ts` fall back to cached data with non-blocking toast warning on network failure.
   - Trace how to update local in-memory state immediately upon creation so newly created entities appear instantly (0ms latency).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3
- Original parent: c0d1864a-d589-4172-80be-9e95a059559c
- Milestone: Explorer Survey Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect existing test files and mock setups
- Check `SalesInvoiceModal.tsx` testability and existing test coverage
- Investigate `src/services/documentsService.ts`
- Define unit test specifications for R1 (In-place update on re-edit), R2 (Save & New sequence reset), R3 (Safe deletion), R4 (More menu & WhatsApp sharing)
- Document test & verification execution commands
- 2026-10-18: Read-only codebase audit & contract mapping for frontend Supabase migration to dedicated backend API (https://api.credsmart.online/api/*).
- Maintain 5-component handoff report standard.
- Do NOT modify application source code during investigation.
- 2026-10-20: Read-only investigation of frontend billing latency (<500ms transition), unawaited network invoicing dispatches, single-call sale+items transactional payloads, and cache hydration/immediate in-memory state reflection across ProductsContext, Customers, Parties, and documentsService.

## Current Parent
- Conversation ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Updated: 2026-10-20T10:55:00Z

## Investigation State
- **Explored paths**:
  - `src/components/SalesInvoiceModal.tsx` (lines 1030-1290: handleSave, andPrint trigger, networkInvoicingService await, mobile success transition)
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx` (lines 65-110: handleGenerateBill calling `props.onSave(true, false)`)
  - `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` (lines 40-120: existing on-demand download/print buttons)
  - `src/services/documentsService.ts` (lines 135-265: getLocalDocuments, fetchSalesDocuments merge/fallback; lines 583-700: sequential createSale + createSaleItems round-trips)
  - `src/services/networkInvoicingService.ts` (lines 48-100: realtime broadcast loop 3000ms delay; lines 608-770: sendSalesInvoiceToNetwork multiple DB queries + local storage)
  - `src/services/invoicesApi.ts` (lines 185-265: createSale, updateSale, createSaleItems)
  - `backend-api/src/routes/invoices.js` (lines 89-160: POST /sales already accepts atomic `items` array with BEGIN/COMMIT transaction)
  - `src/context/ProductsContext.tsx` (lines 120-220: refreshProducts error handling, localStorage cache, addOrUpdateProduct)
  - `src/pages/Customers.tsx` (lines 220-280: fetchCustomers wiping `setCustomers([])` on error; lines 360-385: handleSave ignoring response and awaiting fetch)
  - `src/pages/Parties.tsx` (lines 140-300: fetchParties wiping `setParties([])` on error; lines 345-455: handleSaveParty awaiting fetch without in-memory state update)
  - `backend-api/src/routes/parties.js` (lines 10-120: POST /customers schema mismatch)
- **Key findings**:
  1. `MobileCreateInvoice.tsx:79` calls `props.onSave(true, false)` (`andPrint=true`), causing `SalesInvoiceModal.tsx:1131` to invoke `downloadExactInvoicePdf` with heavy `html2canvas` off-screen rendering before mobile transition. This freezes the UI for 2-6s. Decoupling to `onSave(false, false)` allows instant (<500ms) transition, since `MobileInvoiceSuccessView` already has on-demand Download/Print triggers.
  2. `SalesInvoiceModal.tsx:1109` awaits `networkInvoicingService.sendSalesInvoiceToNetwork`, which runs multiple DB queries and waits up to 3,000ms for Supabase realtime channel join. Converting to unawaited background task (`void (async () => { ... })()`) shaves off 500-3500ms from the save path.
  3. `documentsService.saveDocument` executes 2-3 sequential round-trips (`createSale` followed by `createSaleItems`). However, `backend-api/src/routes/invoices.js` already supports receiving `items` in `POST /api/sales` within a single atomic PostgreSQL transaction. Sending `items` directly cuts roundtrips in half and prevents orphaned sales.
  4. `Customers.tsx` and `Parties.tsx` unconditionally reset their state to `[]` whenever `fetchCustomers`/`fetchParties` fails, and have no local cache fallback. Adding `localStorage` caching + non-blocking warning toasts preserves list visibility.
  5. Newly created items and parties do not update in-memory state immediately; they await slow cloud re-fetch. Adding 0ms in-memory state updates (`setCustomers`, `setParties`, `addOrUpdateProduct`) makes new entities appear immediately.
- **Unexplored areas**: None. All requested components, services, and backend endpoints have been traced to exact line numbers.

## Key Decisions Made
- Fully decoupled `html2canvas` PDF generation on mobile, relying on `MobileInvoiceSuccessView` on-demand action buttons.
- Isolated B2B network dispatch into an asynchronous unawaited Promise with non-blocking toast follow-up.
- Unified sale + items into a single atomic JSON request to `POST /api/sales`.
- Standardized local cache hydration + non-blocking warning toast pattern across Products, Customers, and Parties.
- Formulated 0ms in-memory optimistic updates for customer and party creation.

## Artifact Index
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md` — Final 5-Component Handoff Report
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\progress.md` — Liveness & Progress Log
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\DISPATCH.md` — Dispatch Audit Log
