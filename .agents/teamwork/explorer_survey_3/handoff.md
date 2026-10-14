# Explorer Survey 3: Test Infrastructure, Existing Test Coverage & Verification Strategy

## 1. Observation

### 1.1 Existing Test Infrastructure & Test Execution Environment
- **Test Framework**: Vitest v3.2.4 configured with `@vitejs/plugin-react-swc`, `jsdom` environment, and global test definitions (`vitest.config.ts:8-12`).
- **Setup File**: `src/test/setup.ts` imports `@testing-library/jest-dom` and mocks `window.matchMedia`.
- **Execution Policy Invariant (Windows PowerShell)**: Direct execution of `npx vitest` or `npm test` from PowerShell fails with:
  ```
  npx : File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled on this system.
  CategoryInfo : SecurityError: (:) [], PSSecurityException
  ```
  **Workaround Verified**: Commands must be invoked via `cmd.exe /c npx vitest ...` or `cmd.exe /c npm test`.
- **Baseline Test Pass Rate**:
  Running `cmd.exe /c npx vitest run src/test/MobileInvoiceSuccessView`:
  ```
  ✓ src/test/MobileInvoiceSuccessView.challenger.test.tsx (12 tests) 3216ms
  ✓ src/test/MobileInvoiceSuccessView.challenge.test.tsx (17 tests) 5328ms
  ✓ src/test/MobileInvoiceSuccessView.test.tsx (17 tests) 6961ms
  Test Files  3 passed (3)
  Tests  46 passed (46)
  Duration  12.89s
  ```
- **TypeScript Compiler Health**:
  Running `cmd.exe /c npx tsc --noEmit` exits with status `0` and 0 diagnostic errors.

---

### 1.2 Inspection of Existing Tests (`src/test/MobileInvoiceSuccessView*.test.tsx`)
There are currently 3 test files targeting `MobileInvoiceSuccessView`:
1. `src/test/MobileInvoiceSuccessView.test.tsx` (17 tests):
   - **R1 Quick Action Row**: Renders circular `Edit` button, checks styling (`w-12 h-12 rounded-full border-2 border-indigo-200 bg-indigo-50`), asserts `onEdit` is fired once, verifies action row contains 5 buttons (`Print`, `Download`, `Share`, `E-Way Bill`, `Edit`).
   - **R2 Dual-Action Sticky Footer**: Checks side-by-side flex layout with `gap-3`, checks `Edit Bill` soft indigo styling and `Done` primary filled indigo styling, verifies safe area padding `pb-[max(1rem,env(safe-area-inset-bottom))]`.
   - **R3 Footer Callback Handlers**: `fireEvent.click(editBillBtn)` calls `onEdit`, `fireEvent.click(doneBtn)` calls `onClose`.
   - **Suite 4 Header Actions**: Back button calls `onClose`, edit pen calls `onEdit`, and trash button calls `onDelete` directly.
   - **Suite 5 Graceful Degradation**: When `onEdit` is omitted, renders full-width `Done` button; when `onDelete` is omitted, does not render header trash button.
   - **Suite 6 Data Integrity**: Asserts preview renders invoice number, total amount, party name, and minimum 48px touch targets.
   - **Mocking Setup**: Mocks `@/utils/downloadExactInvoice`:
     ```tsx
     vi.mock("@/utils/downloadExactInvoice", () => ({
       downloadExactInvoicePdf: vi.fn(),
     }));
     ```

2. `src/test/MobileInvoiceSuccessView.challenge.test.tsx` (17 tests):
   - **Stress Testing**: 20 rapid successive clicks on `Edit`, `Edit Bill`, and `Done`; interleaved rapid clicks.
   - **Edge Cases**: Missing party name (falls back to "Cash Sale"), missing phone/GSTIN/address; missing `storeInfo` (falls back to "CredSmart Store"); invoice with 0 items; item with undefined unit (falls back to "PCS"); zero amount invoice (`₹0.00`); status badges for "unpaid" and "partial"; 10 items overflow badge (`+6 more item(s)`); non-sales docType (`purchase_invoice`); `navigator.share` rejection vs fallback to `navigator.clipboard.writeText`.

3. `src/test/MobileInvoiceSuccessView.challenger.test.tsx` (12 tests):
   - **Event Bubbling**: Asserts clicks on nested child elements (`<path>`, `<svg>`, inner `<div>`, `<span>`) correctly bubble to button triggers.
   - **Viewport Constraints**: Checks `flex-nowrap`, padding, and mathematical width budget for 5 buttons across 320px, 360px, 375px, and 414px viewports.

---

### 1.3 Inspection of `src/services/documentsService.ts`
1. **`updateDocument` Method**:
   - `documentsService.updateDocument` **does NOT exist** anywhere in `documentsService.ts` or the entire codebase.
2. **`saveDocument(doc: BusinessDocument, userId?: string)` Implementation** (`lines 646-1035`):
   - If `!doc.id`, creates temporary ID `doc_${Date.now()}_...` (line 648).
   - In Supabase for `sales_invoice` (lines 654-690):
     ```ts
     const { data: saleData, error: saleErr } = await supabase
       .from("sales")
       .insert({ ... }) // <-- UNCONDITIONAL INSERT!
     ```
     It **never calls `.update()`** in Supabase! If an existing invoice ID is passed with `userId`, it attempts a duplicate insert into `sales`.
   - In `localStorage` (lines 1005-1015):
     ```ts
     const index = existingList.findIndex(
       (d) => d.id === doc.id || (doc.documentNumber && d.documentNumber === doc.documentNumber)
     );
     if (index >= 0) {
       existingList[index] = { ...doc, updated_at: new Date().toISOString() };
     } else {
       existingList.unshift(doc);
     }
     ```
   - In stock adjustment (lines 1023-1027):
     ```ts
     if (previousDoc) {
       await stockService.handleDocumentStock(doc, "update", previousDoc);
     } else {
       await stockService.handleDocumentStock(doc, "create");
     }
     ```
3. **`deleteDocument(orgId: string, docType: string, docId: string)` Implementation** (`lines 1038-1099`):
   - Takes 3 arguments: `(orgId: string, docType: string, docId: string)`.
   - Removes doc from localStorage (`filter(d => d.id !== docId)`).
   - Deletes from Supabase `sales` by `eq("id", docId)`.
   - Cancels network invoice if applicable.
   - Reverts stock adjustments via `stockService.handleDocumentStock(targetDoc, "delete")`.
   - Dispatches `notifyDocumentChange(orgId, docType, "delete", targetDoc)`.

---

### 1.4 Inspection of `src/components/SalesInvoiceModal.tsx` & Mobile Flow
1. **Save & New Starvation on Mobile (`lines 1163-1183`)**:
   ```tsx
   if (window.innerWidth < 1024) {
     setMobileSuccessInvoice(saved);
   } else if (saveAndNew) {
     const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
     setInvoiceNumberSeq(nextSeq);
     setPartyName("");
     ...
     setItems([createNewRow("row-1")]);
     setAmountReceived(0);
   } else {
     onOpenChange(false);
   }
   ```
   **Observation**: Because `window.innerWidth < 1024` is evaluated first, when mobile user clicks "Save & New", it forces `setMobileSuccessInvoice(saved)` and **never enters** the `saveAndNew` reset branch!
2. **Missing In-Place Update ID Preservation (`lines 1049-1095`)**:
   - `finalDoc` is constructed as `const finalDoc: Omit<BusinessDocument, "id"> = { ... }` without an `id` property.
   - When returning via `onEdit={() => setMobileSuccessInvoice(null)}`, `SalesInvoiceModal` has no tracking state for `saved.id` (`activeSavedDocId`).
   - Consequently, when user clicks "Generate Bill" again, a brand new invoice with a brand new ID is generated, creating duplicate records.
3. **Missing Delete Confirmation in `MobileInvoiceSuccessView.tsx` (`lines 124-128`)**:
   - The header trash button directly executes `onClick={onDelete}`. There is no confirmation sheet or modal.
   - In `SalesInvoiceModal.tsx:1480-1483`, `onDelete` simply does:
     ```tsx
     onDelete={() => {
       setMobileSuccessInvoice(null);
       onOpenChange(false);
     }}
     ```
     It **never calls `documentsService.deleteDocument`**! The invoice remains in the database.
4. **Header More Menu (`MobileInvoiceSuccessView.tsx:129-131`)**:
   - The 3-dots `MoreVertical` button is a plain button with no `onClick` handler and no menu/action sheet.

---

## 2. Logic Chain

1. **R1 (In-Place Update Lifecycle on Re-Edit)**:
   - *Observation*: `SalesInvoiceModal.tsx:1049` drops the document `id`, and `SalesInvoiceModal.tsx:1479` resets `mobileSuccessInvoice` to `null` without retaining `saved.id` in state. Furthermore, `documentsService.saveDocument` always executes `.insert()` into Supabase `sales`.
   - *Reasoning*: To achieve in-place updates, `SalesInvoiceModal` must maintain an `activeSavedDocId` state (initialized to `editingDoc?.id || null`). When `saveDocument` returns `saved`, `activeSavedDocId` must be updated to `saved.id`. When returning via "Edit", `activeSavedDocId` persists. In `handleSave`, if `activeSavedDocId` exists, `finalDoc` passes `id: activeSavedDocId`. In `documentsService.saveDocument`, if `doc.id` already exists, it must execute `supabase.from("sales").update(...)` and replace `sale_items` rather than inserting a duplicate record. Visual toast feedback must indicate `"Invoice #[number] updated successfully!"`.

2. **R2 (Mobile Save & New Engine & Sequence Reset)**:
   - *Observation*: Line 1163 checks `if (window.innerWidth < 1024)` before checking `saveAndNew`.
   - *Reasoning*: Moving the check to prioritize `if (saveAndNew)` ensures that on mobile, saving persists the invoice, resets party/line-item/payment state, clears `activeSavedDocId` (to prevent subsequent bills from overwriting), increments `invoiceNumberSeq`, displays `"Invoice #[number] created! Ready for next bill."`, and keeps the mobile bill editor active instead of showing the success view.

3. **R3 (Safe Invoice Deletion with Confirmation)**:
   - *Observation*: Header trash button in `MobileInvoiceSuccessView.tsx` currently invokes `onDelete` immediately, and `SalesInvoiceModal.tsx` does not call `documentsService.deleteDocument`.
   - *Reasoning*: A confirmation dialog/bottom-sheet must be introduced ("Delete this invoice? This action cannot be undone."). When confirmed, `documentsService.deleteDocument(invoice.organizationId, invoice.docType, invoice.id)` must be called, `setMobileSuccessInvoice(null)` and `onOpenChange(false)` executed, and toast `"Invoice #[number] deleted"` displayed.

4. **R4 (Header More Menu & Direct WhatsApp Share)**:
   - *Observation*: `MoreVertical` button lacks an `onClick` handler, and no action sheet exists.
   - *Reasoning*: Clicking `MoreVertical` must toggle a mobile bottom sheet / dropdown containing:
     - "Duplicate / Copy Bill": Loads invoice items into a new bill with incremented sequence number, resets `activeSavedDocId`, returns to editor.
     - "Share via WhatsApp": Triggers `window.open` with `https://wa.me/?text=...` (or with phone number if available) containing pre-formatted invoice details.
     - "Download Thermal Receipt / PDF": Calls `downloadExactInvoicePdf`.
     - "Cancel / Void Invoice": Sets status to `cancelled`, saves via `documentsService.saveDocument`, and provides toast feedback.

---

## 3. Caveats

1. **Dual Deletion Handlers**: Existing tests in `MobileInvoiceSuccessView.test.tsx` (line 242) and `MobileInvoiceSuccessView.challenger.test.tsx` (line 159) click `trashBtn` and assert `expect(onDeleteMock).toHaveBeenCalledTimes(1)`. If `MobileInvoiceSuccessView` opens a confirmation modal internally, clicking `trashBtn` opens the modal; only clicking "Confirm Delete" inside the modal calls `onDelete`. The existing unit tests must either be updated to confirm the dialog, or `MobileInvoiceSuccessView` should support confirming deletion smoothly.
2. **Supabase In-Memory vs Mock**: In the test environment (`jsdom`), Supabase client network calls are mocked or fall back to local storage cache. All unit tests must verify local storage persistence, state transitions, and mocked service invocations.
3. **Desktop Isolation**: Changes to `SalesInvoiceModal.tsx` must be guarded so desktop flows (`window.innerWidth >= 1024` and desktop save dialogs) are completely unaffected.

---

## 4. Conclusion & Specific Unit Test Case Definitions

### 4.1 Unit Test Suite Specification for R1 (In-Place Update on Re-Edit)
To be added to `src/test/MobileInvoiceSuccessView.lifecycle.test.tsx` or `src/test/SalesInvoiceModal.test.tsx`:
- **UT-R1-01 (ID Retention on Edit Trigger)**:
  - Setup: Render `SalesInvoiceModal` with mobile viewport (`window.innerWidth = 375`).
  - Action: Fill valid line item, click "Generate Bill", invoice is saved with `id = "doc-uuid-1"`. Success screen appears. Click "Edit Bill".
  - Expected: `mobileSuccessInvoice` is cleared, `MobileCreateInvoice` is visible, and internal `activeSavedDocId` equals `"doc-uuid-1"`.
- **UT-R1-02 (In-Place Update Without Duplicate)**:
  - Setup: From the state in UT-R1-01, change item rate from `100` to `200`. Click "Generate Bill".
  - Expected: `documentsService.saveDocument` is invoked with `id = "doc-uuid-1"`. The returned invoice retains `id = "doc-uuid-1"`.
  - Assert: Local storage contains exactly 1 document for this invoice number, not 2.
- **UT-R1-03 (Update Toast Feedback)**:
  - Setup: Save an existing invoice on re-edit.
  - Expected: Toast shows `"Invoice #[number] updated successfully!"` instead of `"Sales Invoice #[number] saved successfully!"`.
- **UT-R1-04 (`documentsService.saveDocument` Update Handling)**:
  - Setup: Call `documentsService.saveDocument` with an existing document `id`.
  - Expected: Replaces existing document in local storage, calls `stockService.handleDocumentStock(doc, "update", previousDoc)`, dispatches `"credsmart_documents_updated"`.

---

### 4.2 Unit Test Suite Specification for R2 (Mobile Save & New Engine)
- **UT-R2-01 (Save & New Priority over Screen Width Check)**:
  - Setup: Mobile viewport (`window.innerWidth = 375`). Render invoice modal with party name "Customer A", item "Widget A" (qty 2), and sequence "101".
  - Action: Trigger Save & New via `handleSave(false, true)`.
  - Expected: `mobileSuccessInvoice` is NOT displayed (`setMobileSuccessInvoice` was not called).
- **UT-R2-02 (Sequence Auto-Increment)**:
  - Setup: Save & New executed on sequence "101".
  - Expected: Invoice sequence number automatically increments to "102".
- **UT-R2-03 (Field Reset State)**:
  - Setup: Save & New executed.
  - Expected: `partyName` is empty, `selectedCustomerId` is empty, `partyPhone` is empty, `items` contains exactly 1 blank row (`createNewRow("row-1")`), `amountReceived` is 0.
- **UT-R2-04 (Save & New Success Toast)**:
  - Setup: Save & New executed.
  - Expected: `toast.success` called with `"Invoice #INV/26-27/101 created! Ready for next bill."`.
- **UT-R2-05 (Active Saved Doc ID Cleared)**:
  - Setup: Save & New executed.
  - Expected: `activeSavedDocId` is `null`. The subsequent bill save generates a new ID and does not overwrite "101".

---

### 4.3 Unit Test Suite Specification for R3 (Safe Deletion with Confirmation)
- **UT-R3-01 (Trash Click Opens Confirmation Dialog)**:
  - Setup: Render `MobileInvoiceSuccessView` with `onDelete` mock.
  - Action: Click header `Trash2` button.
  - Expected: Confirmation dialog is displayed with text "Delete this invoice? This action cannot be undone."
  - Assert: `onDelete` mock is NOT called yet.
- **UT-R3-02 (Cancel Deletion Keeps Invoice)**:
  - Setup: In confirmation dialog, click "Cancel" button.
  - Expected: Confirmation dialog closes. Invoice remains intact. `onDelete` was not invoked.
- **UT-R3-03 (Confirm Deletion Triggers Safe Deletion)**:
  - Setup: In confirmation dialog, click "Delete" / "Confirm".
  - Expected: `onDelete` callback is invoked with invoice ID / metadata.
- **UT-R3-04 (`SalesInvoiceModal` Deletion Execution)**:
  - Setup: Confirmation callback executed in `SalesInvoiceModal`.
  - Expected: Calls `documentsService.deleteDocument(orgId, docType, invoice.id)`.
  - Expected: `setMobileSuccessInvoice(null)` and `onOpenChange(false)` called.
  - Expected: Toast shows `"Invoice #[number] deleted"`.

---

### 4.4 Unit Test Suite Specification for R4 (Header More Menu & WhatsApp Sharing)
- **UT-R4-01 (More Menu Toggle & Options Rendering)**:
  - Setup: Render `MobileInvoiceSuccessView`.
  - Action: Click header `MoreVertical` button.
  - Expected: Action sheet opens displaying:
    - "Duplicate / Copy Bill"
    - "Share via WhatsApp"
    - "Download Thermal Receipt / PDF"
    - "Cancel / Void Invoice"
- **UT-R4-02 (WhatsApp URI Encoding & Format)**:
  - Setup: Invoice with party name "Acme Corp", grand total 924, doc number "INV-0042".
  - Action: Click "Share via WhatsApp" in More menu.
  - Expected: Spies on `window.open` or `window.location.href`.
  - Assert: Opens URL starting with `https://wa.me/` containing encoded text with `INV-0042`, `₹924`, and store name. If party phone is "9876543210", URL starts with `https://wa.me/919876543210` or `https://wa.me/9876543210`.
- **UT-R4-03 (Duplicate Bill Action)**:
  - Setup: Click "Duplicate / Copy Bill".
  - Expected: Transitions back to editor with all line items copied, sequence incremented, `activeSavedDocId` set to `null`, and toast `"Invoice duplicated! Ready to edit."`.
- **UT-R4-04 (Void / Cancel Invoice Action)**:
  - Setup: Click "Cancel / Void Invoice".
  - Expected: Prompts confirmation, updates invoice status to `"cancelled"`, persists update via `documentsService.saveDocument`, and displays toast `"Invoice #[number] cancelled"`.

---

## 5. Verification Method

### 5.1 Verification Commands
Due to the PowerShell script execution policy on Windows, run all commands via `cmd.exe /c`:

1. **TypeScript Compiler Check**:
   ```powershell
   cmd.exe /c npx tsc --noEmit
   ```
   *Expected Result*: Exit code `0` with 0 diagnostic errors.

2. **Mobile Invoice Success View Test Suites**:
   ```powershell
   cmd.exe /c npx vitest run src/test/MobileInvoiceSuccessView
   ```
   *Expected Result*: 100% pass rate across all test files (`MobileInvoiceSuccessView.test.tsx`, `MobileInvoiceSuccessView.challenge.test.tsx`, `MobileInvoiceSuccessView.challenger.test.tsx`, and newly added lifecycle tests).

3. **Complete Vitest Test Suite**:
   ```powershell
   cmd.exe /c npm test
   ```
   *Expected Result*: All 219+ test suites pass with 0 regressions.

### 5.2 Key Files to Inspect
- `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` (More menu, confirmation dialog, WhatsApp share)
- `src/components/SalesInvoiceModal.tsx` (Save & New sequence reset, `activeSavedDocId`, in-place update toast, delete trigger)
- `src/services/documentsService.ts` (`saveDocument` update branch for Supabase & in-place localStorage updates)
- `src/test/MobileInvoiceSuccessView*.test.tsx` (Test suites)

### 5.3 Invalidation Conditions
- Any occurrence of duplicate invoices with identical numbers after clicking "Edit" and then "Generate Bill".
- Failure of "Save & New" to increment invoice number or remaining stuck on the success view.
- Deletion executing without a confirmation dialog.
- Failure of WhatsApp share URL to properly encode invoice total and number.
- Any regression breaking the existing 46 unit tests in `src/test/MobileInvoiceSuccessView*.test.tsx`.
