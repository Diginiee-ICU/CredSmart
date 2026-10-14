# Review Report: Milestone 1 — In-Place Update Lifecycle on Re-Edit (Requirement R1)

**Reviewer**: Reviewer 1 (Archetype: reviewer & critic)  
**Target**: Orchestrator (parent agent `c0d1864a-d589-4172-80be-9e95a059559c`)  
**Date**: 2026-10-14T10:55:00Z  
**Verdict**: **APPROVE**  
**Integrity Status**: **CLEAN** (No hardcoding, no facades, no shortcuts, no fabricated outputs)  

---

## 1. Observation

### 1.1 Document ID State & Preservation on Re-Edit
In `src/components/SalesInvoiceModal.tsx`:
- Line 262: State variable initialized:
  ```typescript
  const [activeSavedDocId, setActiveSavedDocId] = useState<string | null>(editingDoc?.id || null);
  ```
- Lines 494–496, 562: State synchronized with `editingDoc`:
  ```typescript
  if (editingDoc) {
    setActiveSavedDocId(editingDoc.id);
  ...
  } else {
    setActiveSavedDocId(null);
  ```
- Lines 1510–1515: `MobileInvoiceSuccessView`'s `onEdit` callback retains the saved invoice ID:
  ```typescript
  onEdit={() => {
    if (mobileSuccessInvoice) {
      setActiveSavedDocId(mobileSuccessInvoice.id);
    }
    setMobileSuccessInvoice(null);
  }}
  ```
- Lines 1505–1509 & 1516–1520: `onClose` and `onDelete` clean up `activeSavedDocId`:
  ```typescript
  onClose={() => {
    setActiveSavedDocId(null);
    setMobileSuccessInvoice(null);
    onOpenChange(false);
  }}
  ```

### 1.2 `finalDoc` ID Passing & Dynamic Update Toast
In `src/components/SalesInvoiceModal.tsx`:
- Lines 1052–1056:
  ```typescript
  const currentDocId = activeSavedDocId || editingDoc?.id || undefined;
  const isUpdate = Boolean(currentDocId);

  const finalDoc: Omit<BusinessDocument, "id"> & { id?: string } = {
    id: currentDocId,
  ...
  ```
- Line 1103: Updates active state upon resolution:
  ```typescript
  const saved = await documentsService.saveDocument(finalDoc, user?.id);
  setActiveSavedDocId(saved.id);
  ```
- Lines 1106–1108: Toast notification upon updating existing document:
  ```typescript
  if (isUpdate) {
    toast.success(`Invoice #${fullDocumentNumber} updated successfully!`);
  }
  ```

### 1.3 In-Place Update Execution in Supabase & LocalStorage
In `src/services/documentsService.ts`:
- Lines 646–650: Assigns fallback ID if unset:
  ```typescript
  if (!rawDoc.id) {
    rawDoc.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  const doc = rawDoc as BusinessDocument;
  ```
- Lines 657–691: Checks for existing Supabase record and executes update:
  ```typescript
  const isExistingSupabaseSale = Boolean(doc.id && !doc.id.startsWith("doc_"));

  if (isExistingSupabaseSale) {
    const { data: saleData, error: saleErr } = await supabase
      .from("sales")
      .update({
        organization_id: orgId,
        invoice_number: doc.documentNumber,
        subtotal: doc.subtotal,
        discount_amount: doc.discountTotal,
        discount_label: doc.discountTotal > 0 ? "Discount" : null,
        tax: doc.taxTotal,
        total: doc.grandTotal,
        payment_method: doc.paymentMethod || "Cash",
        customer_id: doc.partyId || null,
      })
      .eq("id", doc.id)
      .select()
      .maybeSingle();

    if (!saleErr && saleData) {
      await supabase.from("sale_items").delete().eq("sale_id", doc.id);
      if (doc.items.length > 0) {
        const saleItems = doc.items.map((it) => ({
          sale_id: doc.id,
          product_name: it.productName,
          product_id: it.productId || null,
          batch_number: it.batchNumber || null,
          mrp: it.rate,
          quantity: it.quantity,
          line_total: it.lineTotal,
        }));
        await supabase.from("sale_items").insert(saleItems);
      }
    }
  ```
- Lines 1078–1090: In-place update in localStorage cache:
  ```typescript
  const existingList = this.getLocalDocuments(orgId, docType);
  const index = existingList.findIndex(
    (d) => d.id === doc.id || (doc.documentNumber && d.documentNumber === doc.documentNumber)
  );
  const previousDoc = index >= 0 ? existingList[index] : undefined;

  if (index >= 0) {
    existingList[index] = { ...doc, updated_at: new Date().toISOString() };
  } else {
    existingList.unshift(doc);
  }

  this.saveLocalDocuments(orgId, docType, existingList);
  ```
- Lines 1096–1100: Stock delta adjustment on update:
  ```typescript
  if (previousDoc) {
    await stockService.handleDocumentStock(doc, "update", previousDoc);
  } else {
    await stockService.handleDocumentStock(doc, "create");
  }
  ```

### 1.4 Desktop Flow Preservation
In `src/components/SalesInvoiceModal.tsx`:
- Lines 1175–1213:
  ```typescript
  if (saveAndNew) {
    ...
  } else if (window.innerWidth < 1024) {
    setMobileSuccessInvoice(saved);
  } else {
    onOpenChange(false);
  }
  ```
  Desktop viewports (`window.innerWidth >= 1024`) continue to close the modal via `onOpenChange(false)` on normal saves and reset/remain open on `saveAndNew`. Desktop split-panel layouts, tables, and tax summaries are 100% untouched.

### 1.5 Command Executions
1. `cmd.exe /c npx tsc --noEmit`: Exited with code `0`, 0 diagnostic errors.
2. `cmd.exe /c npx vitest run src/test/billingLifecycleEngine src/test/MobileInvoiceSuccessView`:
   - All 4 test files passed.
   - All 52 tests passed:
     - `src/test/MobileInvoiceSuccessView.challenger.test.tsx` (12 tests passed)
     - `src/test/MobileInvoiceSuccessView.challenge.test.tsx` (17 tests passed)
     - `src/test/MobileInvoiceSuccessView.test.tsx` (17 tests passed)
     - `src/test/billingLifecycleEngine.test.ts` (6 tests passed)
   - Duration: 52.35s, 0 failures.

---

## 2. Logic Chain

1. **State Preservation Chain [Ref: Observation 1.1]**:
   - When a bill is generated on mobile, `saved` from `documentsService.saveDocument` is assigned to `mobileSuccessInvoice` (which contains `id`).
   - When the user taps either "Edit" or "Edit Bill", `onEdit` fires and assigns `activeSavedDocId = mobileSuccessInvoice.id`.
   - When returning to the mobile editor (`MobileCreateInvoice`), all previously entered data remains in state, and `activeSavedDocId` reliably holds the invoice's identifier.

2. **In-Place Mutation Chain [Ref: Observation 1.2, 1.3]**:
   - When tapping "Generate Bill" again, `handleSave` sets `currentDocId = activeSavedDocId || editingDoc?.id || undefined`.
   - `finalDoc` passes `id: currentDocId` into `documentsService.saveDocument`.
   - In `documentsService.saveDocument`, `isExistingSupabaseSale` evaluates to `true` for non-`doc_` UUIDs, performing a direct `.update().eq("id", doc.id)` on `sales` and refreshing `sale_items`.
   - For local storage, `existingList.findIndex(...)` finds the existing entry by ID/number and updates `existingList[index]` in place rather than unshifting a duplicate.
   - `stockService.handleDocumentStock(doc, "update", previousDoc)` receives both the new and previous doc state, calculating stock deltas accurately without over-deducting.

3. **User Feedback Chain [Ref: Observation 1.2]**:
   - Since `isUpdate = Boolean(currentDocId)` is `true`, `toast.success` displays `Invoice #[number] updated successfully!`.

4. **Desktop Preservation Chain [Ref: Observation 1.4]**:
   - For desktop screen sizes (`window.innerWidth >= 1024`), the `window.innerWidth < 1024` branch is false.
   - Standard saves trigger `onOpenChange(false)` to close the modal as before.
   - When editing an existing document on desktop (`editingDoc`), `currentDocId` passes `editingDoc.id`, resolving an existing issue where desktop re-saves previously lost the document ID.

---

## 3. Caveats

- **Supabase Network Fallback**: In offline mode or during network disconnections, Supabase `.update` throws/catches gracefully and execution falls through to the local storage update, where the document is matched by `d.id` or `d.documentNumber` and updated in place.
- No other caveats.

---

## 4. Conclusion

Requirement R1 ("In-Place Update Lifecycle on Re-Edit") is **fully satisfied**:
- `activeSavedDocId` preserves the invoice ID when returning from `MobileInvoiceSuccessView` via `onEdit`.
- In `handleSave`, `finalDoc` passes `id: activeSavedDocId || editingDoc?.id || undefined`.
- `documentsService.saveDocument` executes an in-place update in both Supabase and localStorage instead of inserting duplicate records.
- `toast.success` displays `Invoice #[number] updated successfully!` when an existing document is updated.
- Desktop invoice modal flows and layouts are 100% preserved.
- Code has zero TypeScript errors and passes 100% of the 52 unit/adversarial tests.

**Verdict: APPROVE**

---

## 5. Verification Method

### 1. TypeScript Compilation
```powershell
cmd.exe /c npx tsc --noEmit
```
*Expected*: Exit code 0, 0 diagnostic errors.

### 2. Automated Test Suite Execution
```powershell
cmd.exe /c npx vitest run src/test/billingLifecycleEngine src/test/MobileInvoiceSuccessView
```
*Expected*: 4 test files passed, 52/52 tests passed.

### 3. Source Inspections
- Check `src/components/SalesInvoiceModal.tsx`:
  - Line 262 (`activeSavedDocId` definition)
  - Line 1052 (`currentDocId = activeSavedDocId || editingDoc?.id || undefined`)
  - Line 1056 (`id: currentDocId` in `finalDoc`)
  - Line 1107 (`toast.success("Invoice #" + fullDocumentNumber + " updated successfully!")`)
  - Line 1512 (`setActiveSavedDocId(mobileSuccessInvoice.id)`)
- Check `src/services/documentsService.ts`:
  - Lines 657–675 (Supabase update branch)
  - Lines 1079–1086 (LocalStorage in-place replace)
