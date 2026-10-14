# Handoff Report: SalesInvoiceModal State Management, In-Place Edit Updates & Mobile Save & New Sequence Reset (Requirements R1 & R2)

**Author**: Explorer Survey Agent 1  
**Target Audience**: Orchestrator & Implementer Agent  
**Date**: 2026-10-14  
**Working Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1`  

---

## 1. Observation

### Observation 1.1: Line 1163 Condition Hierarchy Starves Mobile `saveAndNew`
In `src/components/SalesInvoiceModal.tsx`, lines 1163–1184:
```typescript
        if (window.innerWidth < 1024) {
          setMobileSuccessInvoice(saved);
        } else if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
        setInvoiceNumberSeq(nextSeq);
        setPartyName("");
        setCustomerSearch("");
        setSelectedCustomerId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setBillingAddress("");
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setSameAsParty(false);
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(false);
      } else {
        onOpenChange(false);
      }
```
In `src/components/invoices/mobile/MobileCreateInvoice.tsx`, lines 73–75 and 273–279:
```typescript
  const handleSaveAndNew = () => {
    props.onSave(false, true);
  };
...
  <button 
    type="button"
    onClick={handleSaveAndNew}
    className="col-span-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 py-3.5 rounded-xl font-bold text-[13px] text-center transition-colors cursor-pointer"
  >
    Save & New
  </button>
```
When a mobile user taps "Save & New", `props.onSave(false, true)` invokes `handleSave(false, true)`. In `SalesInvoiceModal.tsx`, `if (window.innerWidth < 1024)` evaluates to `true` first. `setMobileSuccessInvoice(saved)` is called unconditionally, and `else if (saveAndNew)` is completely skipped/starved.

### Observation 1.2: `handleSave` Omits Document ID When Saving
In `src/components/SalesInvoiceModal.tsx`, lines 1049–1095:
```typescript
      const finalDoc: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType,
        documentNumber: fullDocumentNumber,
        referenceNumber: ewayBillNo.trim() || undefined,
        partyId: selectedCustomerId || undefined,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        partyGstin: partyGstin.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        billingAddress: resolvedBillingAddress,
        billingPincode: sameAsParty ? undefined : (billingPincode.trim() || undefined),
        billingPlaceOfSupply: resolvedBillingPlaceOfSupply,
        placeOfSupply,
        docDate,
        dueDate: showDueDate ? dueDate : docDate,
        paymentTerms,
        items: validItems,
        subtotal: totals.rawSubtotal,
        discountTotal: totals.totalDiscount,
        taxableTotal: totals.taxableTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        taxTotal: totals.taxTotal,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        paidAmount: amountReceived,
        balanceDue: Math.max(0, totals.grandTotal - amountReceived),
        status:
          amountReceived >= totals.grandTotal
            ? "paid"
            : amountReceived > 0
            ? "partial"
            : "unpaid",
        paymentMethod,
        notes: showNotes ? notes : undefined,
        terms,
        transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
        custom_fields: {
          ...(typeof editingDoc?.custom_fields === 'object' && editingDoc?.custom_fields !== null ? editingDoc.custom_fields : {}),
          poReference: showPoReference && poReference.trim() ? poReference.trim() : undefined,
        },
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
```
Even if `editingDoc` was passed into `SalesInvoiceModal`, `finalDoc` explicitly omits `id` (`Omit<BusinessDocument, "id">`). Neither `editingDoc?.id` nor any active document identifier is passed into `saveDocument`.

### Observation 1.3: `documentsService.saveDocument` Behavior on `id` Present vs Undefined
In `src/services/documentsService.ts`, lines 646–693 and 1004–1018:
```typescript
  // Save or Update Document
  async saveDocument(doc: BusinessDocument, userId?: string): Promise<BusinessDocument> {
    if (!doc.id) {
      doc.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    const orgId = doc.organizationId;
    const docType = doc.docType;

    // 1. If standard sales invoice, attempt saving to Supabase sales table
    if (docType === "sales_invoice" && userId) {
      try {
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .insert({
            organization_id: orgId,
            invoice_number: doc.documentNumber,
            subtotal: doc.subtotal,
            discount_amount: doc.discountTotal,
            discount_label: doc.discountTotal > 0 ? "Discount" : null,
            tax: doc.taxTotal,
            total: doc.grandTotal,
            payment_method: doc.paymentMethod || "Cash",
            created_by: userId,
            customer_id: doc.partyId || null,
          })
          .select()
          .single();

        if (!saleErr && saleData) {
          doc.id = saleData.id;

          // Save items
          if (doc.items.length > 0) {
            const saleItems = doc.items.map((it) => ({
              sale_id: saleData.id,
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
      } catch (err) {
        console.warn("Supabase sales save fallback to local storage:", err);
      }
    }
...
    // 4. Save / Update in Local Storage cache
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
```
Key direct observations in `documentsService.saveDocument`:
1. If `doc.id` is undefined, line 648 assigns a random `doc_${Date.now()}_...`.
2. Even if `doc.id` is present, `saveDocument` has **NO update branch** for Supabase `sales`! It unconditionally calls `.from("sales").insert(...)`.
3. In line 674, `doc.id = saleData.id` overwrites `doc.id` with the new Supabase row's UUID.
4. When `documentsService.saveDocument` reaches local storage (line 1006), `doc.id` has already been overwritten. If `d.documentNumber === doc.documentNumber` matches, local storage replaces the entry at `index`, but Supabase now has two duplicate rows in `sales` and duplicate rows in `sale_items`.

### Observation 1.4: `onEdit` in `SalesInvoiceModal.tsx` Discards the Saved Document Identity
In `src/components/SalesInvoiceModal.tsx`, lines 1471–1484:
```tsx
          {mobileSuccessInvoice ? (
            <div className="lg:hidden">
              <MobileInvoiceSuccessView
                invoice={mobileSuccessInvoice}
                onClose={() => {
                  setMobileSuccessInvoice(null);
                  onOpenChange(false);
                }}
                onEdit={() => setMobileSuccessInvoice(null)}
                onDelete={() => {
                  setMobileSuccessInvoice(null);
                  onOpenChange(false);
                }}
                onGenerateEwayBill={() => setIsEwayModalOpen(true)}
                storeInfo={{
                  name: org?.name || "CredSmart Store",
                  phone: org?.phone,
                  email: org?.email,
                  address: org?.address,
                  gstin: org?.gstin,
                }}
              />
            </div>
          ) : (
            <MobileCreateInvoice ... />
          )}
```
When returning from `MobileInvoiceSuccessView` via `onEdit`:
- `setMobileSuccessInvoice(null)` is called.
- `mobileSuccessInvoice` (which contained `saved.id`) is cleared.
- `SalesInvoiceModal` has no local state variable storing `saved.id`.
- The prop `editingDoc` was `null` on modal creation and remains `null`.
- On the next "Generate Bill" tap, `handleSave` treats the invoice as a brand-new document without an ID.

### Observation 1.5: Sequence Number & Field Reset Mechanics
In `src/components/SalesInvoiceModal.tsx`:
- State declarations (lines 215–216):
  ```typescript
  const [invoicePrefix, setInvoicePrefix] = useState("INV/26-27/");
  const [invoiceNumberSeq, setInvoiceNumberSeq] = useState("101");
  ```
- Document number construction (line 390):
  ```typescript
  const fullDocumentNumber = `${invoicePrefix}${invoiceNumberSeq}`.trim();
  ```
- Desktop sequence incrementation (line 1166):
  ```typescript
  const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
  setInvoiceNumberSeq(nextSeq);
  ```
- Current toasts (lines 1102–1115):
  - Line 1102: `⚡ Sales Invoice #${fullDocumentNumber} saved & shared with ...`
  - Line 1107: `Sales Invoice ${fullDocumentNumber} saved successfully!`
  - There is currently no toast for `Invoice #[number] updated successfully!` or `Invoice #[number] created! Ready for next bill.`.

### Observation 1.6: Props Passed to `MobileCreateInvoice` and `MobileInvoiceSuccessView`
- **To `MobileCreateInvoice`** (`SalesInvoiceModal.tsx:1495-1575`):
  - Passed: `onClose`, `docType`, `docDate`, `dueDate`, `showDueDate`, `invoicePrefix`, `invoiceNumberSeq`, `selectedCustomerId`, `partyName`, `customers`, `items`, `recalculatedItems`, `totals`, `onSetSelectedCustomerId`, `onCustomerCreated`, `onUpdateItem`, `onRemoveItem`, `onSave`, `catalog`, `onAddSelectedItems`, `partyPhone`, `partyGstin`, `partyAddress`, `placeOfSupply`, `amountReceived`, `paymentMethod`, `notes`, `terms`, `ewayBillNo`, `vehicleNumber`, `poReference`, `storeInfo`.
  - Not passed despite being in `MobileCreateInvoiceProps`: `markAsFullyPaid`, `onUpdatePayment`, `onUpdateAdditionalCharges`, `onUpdateDiscount` (`onUpdateOverallDiscount`), `onUpdateRoundOff`, `onUpdateNotes`.
- **To `MobileInvoiceSuccessView`** (`SalesInvoiceModal.tsx:1473-1492`):
  - Passed: `invoice` (`mobileSuccessInvoice`), `onClose`, `onEdit`, `onDelete`, `onGenerateEwayBill`, `storeInfo`.
  - Missing behavior: `onDelete` only closes the modal (`setMobileSuccessInvoice(null); onOpenChange(false)`) without deleting the document from `documentsService` or database.

---

## 2. Logic Chain

1. **Root Cause of Mobile `saveAndNew` Starvation (Observation 1.1)**:
   - When tapping "Save & New" on mobile, `onSave(false, true)` is passed to `handleSave`.
   - The conditional statement `if (window.innerWidth < 1024)` precedes `else if (saveAndNew)`.
   - Because `window.innerWidth < 1024` evaluates to true on mobile, execution always enters `setMobileSuccessInvoice(saved)`.
   - The sequence increment, form field clearing, and remaining in edit mode are starved.
   - **Inference**: Refactoring the conditional block to prioritize `saveAndNew` over the mobile layout check will enable Save & New on both mobile and desktop.

2. **Root Cause of Duplicate Invoices on Re-Edit (Observations 1.2, 1.3, 1.4)**:
   - When a user saves an invoice initially via "Generate Bill", `documentsService.saveDocument` returns `saved` with an assigned `id` (e.g. `saved.id = saleData.id`).
   - `setMobileSuccessInvoice(saved)` saves this object in component state.
   - When the user taps "Edit" or "Edit Bill", `onEdit` runs `setMobileSuccessInvoice(null)`, completely discarding the reference to `saved.id`.
   - The form fields remain filled in React state, but there is no state variable (like `activeSavedDocId`) tracking that this record already exists in the database.
   - When the user taps "Generate Bill" again, `handleSave` constructs `finalDoc` without an `id` (`Omit<BusinessDocument, "id">`).
   - In `documentsService.saveDocument`, `doc.id` is undefined, so a new random ID is generated, and `supabase.from("sales").insert(...)` executes an insertion of a new row.
   - Even if `doc.id` was passed, `documentsService.saveDocument` currently lacks an `update` branch for Supabase `sales`! It unconditionally calls `.insert(...)`.
   - **Inference**: Two fixes are required:
     1. In `SalesInvoiceModal.tsx`: Maintain `activeSavedDocId` state. Initialize it from `editingDoc?.id`. Set it to `saved.id` on save. Preserve it on `onEdit`. Pass `id: activeSavedDocId || editingDoc?.id || undefined` into `saveDocument`. Clear it only on `saveAndNew` or modal reset.
     2. In `documentsService.ts`: Implement update logic for Supabase `sales` and `sale_items` when `doc.id` is present and represents an existing sale.

3. **Sequence Reset & Toast Logic Chain (Observations 1.1, 1.5)**:
   - On `saveAndNew`:
     - Sequence bumping: `parseInt(invoiceNumberSeq, 10) + 1` should preserve padding if leading zeros exist (e.g. `String(parsed + 1).padStart(invoiceNumberSeq.length, "0")`).
     - Resetting: Clear customer/party, line items (to `[createNewRow("row-1")]`), payments (`amountReceived = 0`, `markAsFullyPaid = false`), optional metadata (`notes`, `ewayBillNo`, `vehicleNumber`, `poReference`, `charges`, `discount`).
     - State reset: `setActiveSavedDocId(null)` and `setMobileSuccessInvoice(null)`.
     - Toast: `toast.success(\`Invoice #${saved.documentNumber} created! Ready for next bill.\`)`.
   - On in-place update (when `activeSavedDocId || editingDoc?.id` is present):
     - Toast: `toast.success(\`Invoice #${fullDocumentNumber} updated successfully!\`)`.

---

## 3. Caveats

1. **Supabase Schema Constraints**:
   - `sale_items` has foreign key `sale_id` referencing `sales(id)`. When updating a sale in Supabase, the recommended approach is `.from("sales").update(...)` followed by `.from("sale_items").delete().eq("sale_id", doc.id)` and `.from("sale_items").insert(saleItems)`.
2. **Offline LocalStorage vs Supabase Online**:
   - `documentsService.saveDocument` is designed to be resilient: if Supabase throws an error (e.g., offline network), it falls back to saving in `localStorage`. In local storage, updating by `d.id === doc.id` must be preserved.
3. **Viewport Size Detection**:
   - `window.innerWidth < 1024` is used for conditional checks in `SalesInvoiceModal`. In automated testing environments (`jsdom`), `window.innerWidth` defaults to 1024 unless configured or mocked. Tests should mock `window.innerWidth` appropriately.

---

## 4. Conclusion

### Concrete Architecture & Implementation Roadmap for Implementer:

#### Step 1: Update `SalesInvoiceModal.tsx` State Management
1. Add state:
   ```typescript
   const [activeSavedDocId, setActiveSavedDocId] = useState<string | null>(editingDoc?.id || null);
   ```
2. In `useEffect` (line 487):
   ```typescript
   if (editingDoc) {
     setActiveSavedDocId(editingDoc.id);
     ...
   } else {
     setActiveSavedDocId(null);
     ...
   }
   ```
3. Update `handleSave` (lines 1049–1115):
   ```typescript
   const currentDocId = activeSavedDocId || editingDoc?.id;
   const finalDoc: BusinessDocument = {
     id: currentDocId || undefined,
     organizationId: orgId,
     docType,
     documentNumber: fullDocumentNumber,
     ...
   };
   const saved = await documentsService.saveDocument(finalDoc, user?.id);
   setActiveSavedDocId(saved.id);
   ```
4. Update toast notification logic in `handleSave`:
   ```typescript
   const isUpdate = Boolean(currentDocId);
   if (isUpdate) {
     toast.success(`Invoice #${fullDocumentNumber} updated successfully!`);
   } else if (saveAndNew) {
     toast.success(`Invoice #${saved.documentNumber} created! Ready for next bill.`);
   } else {
     // Default first-time save toast & network share
   }
   ```
5. Fix conditional post-save branching (lines 1163–1184):
   ```typescript
   if (saveAndNew) {
     const parsed = parseInt(invoiceNumberSeq, 10);
     const nextSeq = !isNaN(parsed)
       ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
       : Math.floor(100 + Math.random() * 900).toString();
     setInvoiceNumberSeq(nextSeq);
     setPartyName("");
     setCustomerSearch("");
     setSelectedCustomerId("");
     setPartyPhone("");
     setPartyGstin("");
     setPartyAddress("");
     setBillingAddress("");
     setBillingPincode("");
     setBillingPlaceOfSupply("27-Maharashtra");
     setSameAsParty(false);
     setShowBillingAddress(false);
     setItems([createNewRow("row-1")]);
     setAmountReceived(0);
     setMarkAsFullyPaid(false);
     setNotes("");
     setShowNotes(false);
     setEwayBillNo("");
     setShowEwayBill(false);
     setVehicleNumber("");
     setShowVehicleNo(false);
     setPoReference("");
     setShowPoReference(false);
     setAdditionalChargesAmount(0);
     setShowAdditionalCharges(false);
     setOverallDiscountValue(0);
     setShowDiscount(false);
     setActiveSavedDocId(null);
     setMobileSuccessInvoice(null);
   } else if (window.innerWidth < 1024) {
     setMobileSuccessInvoice(saved);
   } else {
     onOpenChange(false);
   }
   ```
6. Update `onEdit` callback passed to `MobileInvoiceSuccessView`:
   ```tsx
   onEdit={() => {
     if (mobileSuccessInvoice) {
       setActiveSavedDocId(mobileSuccessInvoice.id);
     }
     setMobileSuccessInvoice(null);
   }}
   ```

#### Step 2: Update `documentsService.saveDocument` for In-Place Updates
In `src/services/documentsService.ts`:
```typescript
    // Check if updating an existing record
    const existingList = this.getLocalDocuments(orgId, docType);
    const existingIndex = doc.id 
      ? existingList.findIndex((d) => d.id === doc.id || (doc.documentNumber && d.documentNumber === doc.documentNumber))
      : existingList.findIndex((d) => doc.documentNumber && d.documentNumber === doc.documentNumber);
    const isExistingDoc = existingIndex >= 0;

    // 1. If standard sales invoice, attempt saving/updating in Supabase sales table
    if (docType === "sales_invoice" && userId) {
      try {
        if (isExistingDoc && doc.id && !doc.id.startsWith("doc_")) {
          // In-place update existing Supabase record
          await supabase
            .from("sales")
            .update({
              invoice_number: doc.documentNumber,
              subtotal: doc.subtotal,
              discount_amount: doc.discountTotal,
              discount_label: doc.discountTotal > 0 ? "Discount" : null,
              tax: doc.taxTotal,
              total: doc.grandTotal,
              payment_method: doc.paymentMethod || "Cash",
              customer_id: doc.partyId || null,
            })
            .eq("id", doc.id);

          // Delete existing line items and re-insert updated items
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
        } else {
          // Insert new record
          ...
        }
```

---

## 5. Verification Method

### 1. Existing Test Suites
Execute the full test suite for `MobileInvoiceSuccessView`:
```powershell
cmd /c "npm test src/test/MobileInvoiceSuccessView"
```
**Verification Criterion**: All 46 tests across `MobileInvoiceSuccessView.test.tsx`, `MobileInvoiceSuccessView.challenge.test.tsx`, and `MobileInvoiceSuccessView.challenger.test.tsx` must pass with 100% success rate.

### 2. TypeScript Compilation Check
Verify zero type errors across the project:
```powershell
cmd /c "npx tsc --noEmit"
```

### 3. New Unit Tests to Add
Add unit tests in a new test file `src/test/SalesInvoiceModalLifecycle.test.tsx`:
1. **Test `Save & New` on mobile**: Mock `window.innerWidth = 500`. Trigger `onSave(false, true)`. Verify:
   - `documentsService.saveDocument` is called once.
   - `invoiceNumberSeq` is incremented (`101` -> `102` or `139` -> `140`).
   - Party name and items are reset.
   - `setMobileSuccessInvoice` is NOT called with `saved` (success view is not shown).
   - Toast displays `"Invoice #[number] created! Ready for next bill."`.
2. **Test In-Place Update on Re-Edit**: Mock initial invoice generation. From `MobileInvoiceSuccessView`, click `onEdit()`. Modify an item rate or quantity. Tap "Generate Bill" again. Verify:
   - `documentsService.saveDocument` is called with the original `saved.id`.
   - No duplicate record is created.
   - Toast displays `"Invoice #[number] updated successfully!"`.

### Invalidation Conditions:
- If `saveAndNew` still opens `MobileInvoiceSuccessView` on mobile viewports (< 1024px), the condition order in line 1163 is invalid.
- If re-editing an invoice generates a new ID rather than passing the existing ID, in-place update has failed.
