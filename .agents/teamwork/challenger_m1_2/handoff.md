# Handoff Report: Milestone 1 Adversarial Challenge (Save & New Engine & Sequence Reset - R2)

**Author**: Challenger 2 (Empirical Challenger)  
**Target**: Orchestrator (Parent Agent `c0d1864a-d589-4172-80be-9e95a059559c`)  
**Date**: 2026-10-14T11:00:00Z  
**Working Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m1_2`  
**Final Verdict**: **CHALLENGE_FAILED** (Worker implementation failed adversarial challenge due to state bleeding & rapid click concurrency vulnerability; requires surgical 4-line patch)

---

## 1. Observation

### Observation 1.1: Verification Commands & Baseline Passes
All verification commands requested in the dispatch were executed directly:
1. `cmd.exe /c npx tsc --noEmit`:
   - Output: Exit code `0`, 0 diagnostic errors.
2. `cmd.exe /c npx vitest run src/test/billingLifecycleEngine.test.ts`:
   - Output: 1 test file passed, 6/6 tests passed (43ms).
3. `cmd.exe /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx`:
   - Output: 1 test file passed, 17/17 tests passed (19.14s).
4. `cmd.exe /c npx vitest run src/test/challengerM1_2Stress.test.ts`:
   - Output: 1 test file passed, 10/10 tests passed (194ms).

---

### Observation 1.2: Sequence Number Padding & Rollover Logic (`SalesInvoiceModal.tsx:1176-1180`)
Verbatim code in `SalesInvoiceModal.tsx`:
```typescript
const parsed = parseInt(invoiceNumberSeq, 10);
const nextSeq = !isNaN(parsed)
  ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
  : Math.floor(100 + Math.random() * 900).toString();
setInvoiceNumberSeq(nextSeq);
```
Empirical behavior verified in `src/test/challengerM1_2Stress.test.ts`:
- `"001"` → `"002"`: `parsed = 1`, `String(2).padStart(3, "0")` evaluates to `"002"`. **Padding holds**.
- `"099"` → `"100"`: `parsed = 99`, `String(100).padStart(3, "0")` evaluates to `"100"`. **Padding holds**.
- `"0005"` → `"0006"`: `parsed = 5`, `String(6).padStart(4, "0")` evaluates to `"0006"`. **Padding holds**.
- `"999"` → `"1000"`: `parsed = 999`, `String(1000).padStart(3, "0")` evaluates to `"1000"`. Rollover does not truncate because `String.prototype.padStart` returns the original string unchanged when string length exceeds the target pad length.

---

### Observation 1.3: Defect 1 — Critical State Bleed of `placeOfSupply` (`SalesInvoiceModal.tsx:1181-1207`)
In `SalesInvoiceModal.tsx`, lines 1181–1207:
```typescript
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
```
- While `setBillingPlaceOfSupply("27-Maharashtra")` is called, **`setPlaceOfSupply("27-Maharashtra")` is NEVER called**.
- In `SalesInvoiceModal.tsx`, lines 651–655:
  ```typescript
  const orgStateCode = "27"; // Maharashtra
  const isInterState = useMemo(() => {
    const custCode = (placeOfSupply || "").slice(0, 2);
    return custCode !== "" && custCode !== orgStateCode;
  }, [placeOfSupply]);
  ```
- If Invoice 1 had an out-of-state customer (e.g., Delhi, `placeOfSupply = "07-Delhi"`):
  1. User saves Bill 1 via "Save & New".
  2. Party fields are cleared, but `placeOfSupply` remains `"07-Delhi"`.
  3. When billing the next walk-in / cash customer, `isInterState` evaluates to `true`.
  4. The bill is incorrectly calculated and billed with **IGST** (Interstate) instead of **CGST + SGST** (Intrastate), producing an invalid GST tax split.
- Additional non-cleared fields:
  - `showDueDate` and `dueDate`: Not reset. If Bill 1 enabled a due date, Bill 2 keeps `showDueDate: true`.
  - `manualRoundOff`: Not reset. Any manual adjustment in Bill 1 bleeds into Bill 2's total calculation.

---

### Observation 1.4: Defect 2 — Missing Concurrency / Re-entry Guard on Rapid Clicks (`SalesInvoiceModal.tsx:1035` & `MobileCreateInvoice.tsx:273`)
1. In `src/components/SalesInvoiceModal.tsx`, line 1035:
   ```typescript
   const handleSave = async (andPrint = false, saveAndNew = false) => {
     if (!partyName.trim()) { ... }
     if (validItems.length === 0) { ... }
     setSaving(true);
     try {
       const saved = await documentsService.saveDocument(finalDoc, user?.id);
   ```
   There is **no check** for `if (saving) return;` at the entry of `handleSave`.
2. In `src/components/invoices/mobile/MobileCreateInvoice.tsx`, line 273:
   ```tsx
   <button 
     type="button"
     onClick={handleSaveAndNew}
     className="col-span-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 py-3.5 rounded-xl font-bold text-[13px] text-center transition-colors cursor-pointer"
   >
     Save & New
   </button>
   ```
   The button lacks `disabled={props.saving}` (and `saving` is not passed in `MobileCreateInvoiceProps`).
3. Empirical Stress Reproduction:
   - When a mobile user taps "Save & New" twice in rapid succession:
     - Both clicks initiate asynchronous `documentsService.saveDocument` with the exact same payload (`documentNumber: "INV/26-27/101"`, without `id`).
     - In Supabase, two parallel `.insert()` queries execute on `sales` and `sale_items`, inserting duplicate invoice records.
     - In stock management, `stockService.handleDocumentStock(doc, "create")` executes twice, deducting inventory twice for the same sale.
     - Two success toasts pop up in the UI.

---

### Observation 1.5: `activeSavedDocId` Reset Verification (`SalesInvoiceModal.tsx:1207`)
- In `SalesInvoiceModal.tsx`, line 1207:
  `setActiveSavedDocId(null);` is explicitly called when `saveAndNew` is true.
- On subsequent bill generation:
  `currentDocId = activeSavedDocId || editingDoc?.id || undefined;` resolves to `undefined`.
- Verified in `src/test/challengerM1_2Stress.test.ts` (Challenge 4):
  `saved2.id !== saved1.id`. Both documents are saved with distinct IDs and independent records in local cache and database without overwriting.

---

## 2. Logic Chain

1. **Sequence Number Padding [Ref: Observation 1.2]**:
   - `invoiceNumberSeq.length` accurately provides the target width.
   - `padStart` ensures leading zeros (`"001"` → `"002"`, `"099"` → `"100"`) are retained.
   - Rollover from `"999"` to `"1000"` preserves all digits without truncation.
   - Conclusion: Leading zero padding is robust and fully functional.

2. **State Bleed Defect [Ref: Observation 1.3]**:
   - `isInterState` tax computation relies strictly on `placeOfSupply` (line 653).
   - In `saveAndNew`, Worker M1 reset `billingPlaceOfSupply` but failed to reset `placeOfSupply`.
   - Any transaction sequence starting with an out-of-state customer followed by a walk-in / local customer will systematically miscalculate tax liability (IGST instead of CGST/SGST).
   - Conclusion: State bleed exists and breaks tax calculation fidelity.

3. **Rapid Succession Clicks Vulnerability [Ref: Observation 1.4]**:
   - Lack of `if (saving) return;` in `handleSave` combined with an un-disabled button permits concurrent async execution.
   - Multiple parallel invocations of `documentsService.saveDocument` with identical document numbers cause duplicate database records and doubled stock deductions.
   - Conclusion: Concurrency vulnerability exists on mobile quick billing.

4. **Document Overwrite Prevention [Ref: Observation 1.5]**:
   - `activeSavedDocId` is cleared to `null` on `saveAndNew`.
   - New invoices obtain a fresh ID, confirming no inadvertent overwriting of earlier invoices.
   - Conclusion: Overwrite prevention is verified and correct.

---

## 3. Caveats

- In the local test environment (without live Supabase network connection), duplicate saves were caught and deduplicated by local storage key lookup, but in production with Supabase enabled, concurrent `.insert()` calls will create duplicate rows in `sales` and `sale_items`.
- Aside from `placeOfSupply`, `manualRoundOff`, and `showDueDate`, all other form fields (party name, phone, gstin, address, items, payment amounts, notes, eway bill, po reference, additional charges, and discount value) are cleanly reset.

---

## 4. Conclusion

**Final Verdict**: **CHALLENGE_FAILED**

The implementation by Worker M1 successfully resolves the mobile viewport starvation bug (R2) and correctly implements sequence incrementing and `activeSavedDocId` nulling. However, it **failed the adversarial challenge** due to two critical issues:
1. **Critical Bug**: `placeOfSupply` state bleed causing interstate GST miscalculations on subsequent bills.
2. **Concurrency Flaw**: Lack of `saving` guard allowing duplicate invoices and double stock deduction on rapid taps.

### Required Surgical Remediation for Worker M1:
In `src/components/SalesInvoiceModal.tsx`:
1. At line 1036 in `handleSave`:
   ```typescript
   if (saving) return;
   ```
2. In the `if (saveAndNew)` reset block (lines 1181–1208), add:
   ```typescript
   setPlaceOfSupply("27-Maharashtra");
   setShowDueDate(false);
   setManualRoundOff(0);
   ```
3. Pass `saving={saving}` prop to `<MobileCreateInvoice>` and add `disabled={props.saving}` on the "Save & New" button in `MobileCreateInvoice.tsx:273`.

---

## 5. Verification Method

### 1. Verification Test Commands
Run the suite via `cmd.exe /c`:
```powershell
cmd.exe /c npx tsc --noEmit
cmd.exe /c npx vitest run src/test/challengerM1_2Stress.test.ts
cmd.exe /c npx vitest run src/test/billingLifecycleEngine.test.ts
```

### 2. Files to Inspect
- `src/components/SalesInvoiceModal.tsx`:
  - Line 1035: Check for `if (saving) return;`.
  - Lines 1181–1207: Check for `setPlaceOfSupply("27-Maharashtra")` and `setManualRoundOff(0)`.
- `src/components/invoices/mobile/MobileCreateInvoice.tsx`:
  - Line 273: Check `disabled={props.saving}`.
- `src/test/challengerM1_2Stress.test.ts`:
  - 10 automated test cases verifying sequence padding, state bleed, and doc ID reset.

### 3. Invalidation Conditions
- Any occurrence of IGST being applied to a local cash customer following an out-of-state customer.
- Creation of duplicate invoice records when tapping "Save & New" rapidly.
