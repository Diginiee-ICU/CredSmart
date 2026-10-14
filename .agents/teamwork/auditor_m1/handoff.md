# Forensic Audit Report: Milestone 1 - Core Billing Lifecycle Engine (Requirements R1 and R2)

**Work Product**: `src/components/SalesInvoiceModal.tsx`, `src/services/documentsService.ts`, `src/test/billingLifecycleEngine.test.ts`  
**Auditor**: Forensic Auditor (`auditor_m1`)  
**Target Milestone**: Milestone 1 (Requirements R1 and R2)  
**Integrity Mode**: `development` (per `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**  

---

## 1. Observation

### Observation 1.1: Source Code Changes in `src/components/SalesInvoiceModal.tsx`
- **Line 262**: Added persistent React state `const [activeSavedDocId, setActiveSavedDocId] = useState<string | null>(editingDoc?.id || null);`.
- **Line 495 & Line 562**: Synchronized `activeSavedDocId` inside form initialization `useEffect` — setting it to `editingDoc.id` when editing, or resetting to `null` when drafting a new document.
- **Lines 1052–1056**: In `handleSave`:
  ```typescript
  const currentDocId = activeSavedDocId || editingDoc?.id || undefined;
  const isUpdate = Boolean(currentDocId);
  const finalDoc: Omit<BusinessDocument, "id"> & { id?: string } = {
    id: currentDocId,
    organizationId: orgId,
    docType,
    ...
  ```
- **Line 1103**: After `documentsService.saveDocument` resolves, updates `setActiveSavedDocId(saved.id)`.
- **Line 1107**: Shows toast notification `"Invoice #[number] updated successfully!"` when `isUpdate` is true.
- **Lines 1175–1213**: Prioritized `if (saveAndNew)` before `else if (window.innerWidth < 1024)`:
  - Sequence auto-increment calculates `nextSeq` preserving padding:
    ```typescript
    const parsed = parseInt(invoiceNumberSeq, 10);
    const nextSeq = !isNaN(parsed)
      ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
      : Math.floor(100 + Math.random() * 900).toString();
    setInvoiceNumberSeq(nextSeq);
    ```
  - Resets all customer/party state (`partyName`, `customerSearch`, `selectedCustomerId`, `partyPhone`, `partyGstin`, `partyAddress`).
  - Resets all billing address state (`billingAddress`, `billingPincode`, `billingPlaceOfSupply`, `sameAsParty`, `showBillingAddress`).
  - Resets line items (`setItems([createNewRow("row-1")])`).
  - Resets payment and optional controls (`amountReceived`, `markAsFullyPaid`, `notes`, `showNotes`, `ewayBillNo`, `vehicleNumber`, `poReference`, `additionalChargesAmount`, `overallDiscountValue`).
  - Clears `setActiveSavedDocId(null)` and `setMobileSuccessInvoice(null)`.
  - Shows toast `"Invoice #[number] created! Ready for next bill."`.
- **Lines 1510–1515**: On `<MobileInvoiceSuccessView>`'s `onEdit` callback:
  ```typescript
  onEdit={() => {
    if (mobileSuccessInvoice) {
      setActiveSavedDocId(mobileSuccessInvoice.id);
    }
    setMobileSuccessInvoice(null);
  }}
  ```
  Legitimately captures the saved document ID prior to switching back to the mobile invoice editor.

### Observation 1.2: Source Code Changes in `src/services/documentsService.ts`
- **Lines 657–726**: Implemented in-place Supabase update branch when `isExistingSupabaseSale` (`Boolean(doc.id && !doc.id.startsWith("doc_"))`):
  - Executes `.from("sales").update(salePayload).eq("id", doc.id).select().maybeSingle()`.
  - Deletes prior line items via `.from("sale_items").delete().eq("sale_id", doc.id)`.
  - Re-inserts updated line items via `.from("sale_items").insert(saleItems)`.
  - Maintains fallback to `.from("sales").insert()` if the record was not found in `sales`.
- **Lines 1078–1090**: In local storage caching:
  - Searches existing documents via `const index = existingList.findIndex((d) => d.id === doc.id || (doc.documentNumber && d.documentNumber === doc.documentNumber));`.
  - When `index >= 0`, performs in-place replacement: `existingList[index] = { ...doc, updated_at: new Date().toISOString() };`.
  - Does not duplicate entries in the array.
- **Lines 1096–1100**: Notifies `stockService.handleDocumentStock(doc, "update", previousDoc)` with `previousDoc` reference for accurate inventory delta calculation.

### Observation 1.3: Test Verification in `src/test/billingLifecycleEngine.test.ts`
- 6 tests across 2 describe suites:
  1. `assigns an ID on initial save and stores exactly 1 record in local cache`
  2. `updates existing document in-place on re-save without creating duplicate records`
  3. `handles re-save matching by documentNumber when id is retained`
  4. `cleanly increments numeric sequence numbers`
  5. `preserves leading zero padding during auto-increment`
  6. `falls back to random 3-digit sequence if non-numeric`
- All assertions assert concrete values (`expect(docs).toHaveLength(1)`, `expect(secondSaved.id).toBe(initialSaved.id)`, `expect(stockSpy).toHaveBeenCalledWith(..., "update", ...)`).
- Zero tautological assertions (`expect(true).toBe(true)`), zero mocked short-circuits, and zero hardcoded test fixtures circumventing production logic.

### Observation 1.4: Empirical Tool Outputs
- **TypeScript Compilation (`cmd.exe /c npx.cmd tsc --noEmit`)**:
  - Exit code: `0`
  - Output: 0 diagnostic errors.
- **Milestone 1 Test Suite (`cmd.exe /c npx.cmd vitest run src/test/billingLifecycleEngine src/test/MobileInvoiceSuccessView`)**:
  - Test Files: 5 passed (5)
  - Tests: 56 passed (56)
  - Time: 9.37s
- **Full Project Vitest Suite (`cmd.exe /c npx.cmd vitest run`)**:
  - Test Files: 23 passed (23)
  - Tests: 244 passed (244)
  - Time: 14.07s

---

## 2. Logic Chain

1. **State Preservation Across Transitions (R1)**:
   - When returning via `onEdit`, `mobileSuccessInvoice.id` is held in `activeSavedDocId`.
   - In `handleSave`, `activeSavedDocId` is injected into `finalDoc.id`.
   - When passed into `documentsService.saveDocument`, `doc.id` is detected as an existing ID.
   - Therefore, the save pipeline treats the invoice as an update rather than an initial creation.

2. **Database & Storage Idempotency (R1)**:
   - Supabase `sales` table receives an `.update()` with matching `id`.
   - Supabase `sale_items` rows with `sale_id == doc.id` are cleaned up and repopulated with updated lines.
   - LocalStorage cache locates the item by ID and mutates in place, maintaining array length `1`.
   - Stock service calculates accurate inventory deltas using `previousDoc`.
   - Therefore, duplicate records are completely prevented across both cloud and local storage layers.

3. **Conditional Hierarchy Fix for Save & New (R2)**:
   - Inverting the check so `if (saveAndNew)` precedes `if (window.innerWidth < 1024)` guarantees that mobile devices execute the Save & New workflow instead of being prematurely routed to `MobileInvoiceSuccessView`.
   - The sequence increment logic maintains padding (e.g. `001` -> `002`), clears all form state, clears `activeSavedDocId`, and leaves the user in `MobileCreateInvoice` with a success toast.

4. **Forensic Integrity Verification**:
   - Integrity mode specified in `ORIGINAL_REQUEST.md` is `development`.
   - No hardcoded test results, facade patterns, or dummy return functions exist in the touched files.
   - Real implementations interact legitimately with `supabase`, `localStorage`, and `stockService`.
   - No regression was introduced to desktop billing, invoice PDF rendering, or Tally synchronization.

---

## 3. Caveats

- In headless test runners, `window.innerWidth` defaults to `1024` unless explicitly mocked. Unit tests targeting mobile flows properly adjust or mock viewport properties.
- Offline behavior relies on the `doc_` prefix distinction to route between Supabase updates and local-only mutations. This design gracefully ensures zero regressions when working offline.

---

## 4. Conclusion

**Verdict: CLEAN**

Milestone 1 satisfies all requirements (R1 and R2) from `ORIGINAL_REQUEST.md` with complete architectural integrity:
- In-place updates function correctly across React state, Supabase database, and localStorage cache without creating duplicate invoices.
- Save & New conditional hierarchy is fixed, cleanly resetting state, bumping the sequence number, and keeping mobile in editor mode.
- TypeScript compiles cleanly with 0 errors.
- 100% test pass rate across all 244 tests in the test suite.

---

## 5. Verification Method

To independently verify this audit:

1. **TypeScript Typecheck**:
   ```powershell
   cmd.exe /c npx.cmd tsc --noEmit
   ```
   *Expected*: Code 0, 0 errors.

2. **Milestone 1 Test Suite**:
   ```powershell
   cmd.exe /c npx.cmd vitest run src/test/billingLifecycleEngine src/test/MobileInvoiceSuccessView
   ```
   *Expected*: 5 test files passed, 56 tests passed.

3. **Full Project Test Suite**:
   ```powershell
   cmd.exe /c npx.cmd vitest run
   ```
   *Expected*: 23 test files passed, 244 tests passed.
