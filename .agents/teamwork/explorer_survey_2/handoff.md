# Handoff Report: Mobile Invoice Success View Header Actions, More Menu, Trash Confirmation & WhatsApp Sharing

**Agent**: explorer_survey_2  
**Date**: 2026-10-14T10:32:00Z  
**Target Module**: `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` & `src/components/SalesInvoiceModal.tsx`  
**Reference Request**: Requirements R3 & R4 of `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (2026-10-14T09:50:17Z)

---

## 1. Observation

### 1.1 Header Bar of `MobileInvoiceSuccessView.tsx`
Direct inspection of `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` (lines 105–133):
```tsx
{/* ── 1. Header ── */}
<div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
  <div className="flex items-center gap-3">
    <button onClick={onClose} className="p-1 text-indigo-700 cursor-pointer active:opacity-60">
      <ArrowLeft className="w-5 h-5" />
    </button>
    <div className="flex flex-col">
      <h1 className="text-[16px] font-bold text-slate-900 leading-tight">
        {isSalesType ? "Sales Invoice Created" : "Purchase Invoice Created"}
      </h1>
      <span className="text-[12px] text-slate-500 font-medium">#{invoice.documentNumber}</span>
    </div>
  </div>
  <div className="flex items-center gap-1">
    {onEdit && (
      <button onClick={onEdit} className="p-2 text-blue-600 active:opacity-60">
        <Edit2 className="w-4 h-4" />
      </button>
    )}
    {onDelete && (
      <button onClick={onDelete} className="p-2 text-rose-500 active:opacity-60">
        <Trash2 className="w-4 h-4" />
      </button>
    )}
    <button className="p-2 text-indigo-700 active:opacity-60">
      <MoreVertical className="w-5 h-5" />
    </button>
  </div>
</div>
```
Observations on current header buttons:
1. **Back Arrow (`ArrowLeft`)** (line 108): Wired directly to `onClose`. In `SalesInvoiceModal.tsx:1475-1478`, `onClose` executes `setMobileSuccessInvoice(null); onOpenChange(false);`, which closes the modal.
2. **Edit Icon (`Edit2`)** (lines 119–123): Wired to `onEdit`. In `SalesInvoiceModal.tsx:1479`, `onEdit` executes `setMobileSuccessInvoice(null)`, returning cleanly to `MobileCreateInvoice.tsx`.
3. **Trash Icon (`Trash2`)** (lines 124–128): Wired directly to `onDelete`. In `SalesInvoiceModal.tsx:1480–1483`:
   ```tsx
   onDelete={() => {
     setMobileSuccessInvoice(null);
     onOpenChange(false);
   }}
   ```
   **Defect**: No confirmation dialog is presented. No delete call to `documentsService.deleteDocument` is executed. No feedback toast is shown.
4. **More Options (`MoreVertical`)** (lines 129–131): Completely dead button with NO `onClick` handler and NO menu/sheet attached.

---

### 1.2 `documentsService.deleteDocument` Signature & Event Synchronization
In `src/services/documentsService.ts` (lines 1038–1099):
```ts
async deleteDocument(orgId: string, docType: string, docId: string): Promise<boolean> {
  const list = this.getLocalDocuments(orgId, docType);
  const targetDoc = list.find((d) => d.id === docId);
  const updated = list.filter((d) => d.id !== docId);
  this.saveLocalDocuments(orgId, docType, updated);

  // If sales invoice
  if (docType === "sales_invoice") {
    try {
      await supabase.from("sales").delete().eq("id", docId);
    } catch (error) {
      console.warn("Failed to delete sales document from Supabase:", error);
    }
    if (targetDoc) {
      try {
        const { networkInvoicingService } = await import("@/services/networkInvoicingService");
        await networkInvoicingService.cancelNetworkInvoice(targetDoc.documentNumber, orgId);
      } catch { /* empty */ }
    }
  }
  ...
  notifyDocumentChange(orgId, docType, "delete", targetDoc);
  return true;
}
```
In `src/services/documentsService.ts` (lines 111–129):
`notifyDocumentChange` emits `credsmart_documents_updated` window event. `src/pages/Sales.tsx` (line 216) listens to `credsmart_documents_updated` and automatically reloads the documents table.

---

### 1.3 Available UI Components & The `z-modal` Layering Rule
Directory check in `src/components/ui/`:
- `alert-dialog.tsx`: Uses `@radix-ui/react-alert-dialog`. Default overlay and content have `z-50`.
- `sheet.tsx`: Uses `@radix-ui/react-dialog` with `side="bottom"`.
- `drawer.tsx`: Uses `vaul` with handle bar.
- `dropdown-menu.tsx`: Uses `@radix-ui/react-dropdown-menu`.

**Crucial Z-Index Invariant**:
`src/components/SalesInvoiceModal.tsx:1469`:
`<DialogContent className="bill-editor-shell z-modal ...">`
In `src/index.css`:
```css
--z-modal: 500;
.z-modal {
  z-index: var(--z-modal);
}
```
`SalesInvoiceModal` renders at `z-index: 500`. Default Radix `AlertDialog` and `Sheet` overlay have `z-50`. If portaled to `document.body` with standard classes, they would render **behind** `SalesInvoiceModal` unless overridden with `z-[600]`.
Conversely, an embedded mobile bottom sheet (as done in `MobileCreateInvoice.tsx:351`):
`<div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">`
inside `MobileInvoiceSuccessView` renders within the modal shell without portal collisions or click-outside propagation issues.

---

### 1.4 WhatsApp Sharing Infrastructure
In `src/utils/whatsappPdfShare.ts` (lines 290–303):
CredSmart constructs WhatsApp sharing URLs using the standard scheme:
- Web: `https://web.whatsapp.com/send?...`
- Universal Mobile Link: `https://wa.me/${phoneParam}?text=${encodeURIComponent(messageText)}`
- Universal Direct Link (no recipient phone): `https://wa.me/?text=${encodeURIComponent(messageText)}`
Phone sanitization pattern:
`const rawPhone = payload.customerPhone ? payload.customerPhone.replace(/\D/g, "") : "";`
`const phoneParam = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone) : "";`

---

### 1.5 Current Unit Test Expectations
In `src/test/MobileInvoiceSuccessView.test.tsx` (lines 242–249):
```tsx
it("invokes onDelete when header trash button is clicked", () => {
  const { container } = renderComponent();
  const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500, .sticky button.text-rose-500, .lucide-trash2, .lucide-trash-2, .lucide-trash")?.closest("button");
  expect(trashBtn).toBeTruthy();
  fireEvent.click(trashBtn!);

  expect(onDeleteMock).toHaveBeenCalledTimes(1);
});
```
And in `src/test/MobileInvoiceSuccessView.challenger.test.tsx` (lines 159–167):
```tsx
it("triggers onDelete when clicking child <path> inside header Trash2 button", () => {
  const { container } = renderComponent();
  const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
  const pathElem = trashBtn?.querySelector("path");
  expect(pathElem).not.toBeNull();

  fireEvent.click(pathElem!);
  expect(onDeleteMock).toHaveBeenCalledTimes(1);
});
```
Currently, both tests expect `onDeleteMock` to be invoked on `trashBtn` click without confirmation. When Requirement R3 is implemented (showing confirmation before deletion), the confirmation dialog will intercept this click, so tests must be updated to click the "Delete" confirmation action.

---

## 2. Logic Chain

1. **Trash Confirmation (Requirement R3)**:
   - *Premise 1*: Accidental touches on the top header trash icon on mobile devices would cause immediate data destruction if unconfirmed.
   - *Premise 2*: Requirement R3 requires: "Clicking the header `Trash2` icon on the success screen opens a sleek mobile confirmation bottom-sheet / alert dialog: 'Delete this invoice? This action cannot be undone.' On confirmation, invoke `documentsService.deleteDocument(invoice.id)`. Reset active invoice state (`setMobileSuccessInvoice(null)`), close the modal, and show toast: 'Invoice #[number] deleted'."
   - *Inference*: `MobileInvoiceSuccessView` should maintain internal state `isDeleteConfirmOpen: boolean`. When `Trash2` is clicked, `setIsDeleteConfirmOpen(true)` is executed. The confirmation dialog renders the required title and message. When the user confirms, `onDelete?.()` is called, and `isDeleteConfirmOpen` is closed.
   - *Prop Signature*: `onDelete?: () => void | Promise<void>` remains 100% backward-compatible.
   - *Implementation in `SalesInvoiceModal.tsx`*:
     ```tsx
     onDelete={async () => {
       if (mobileSuccessInvoice) {
         try {
           await documentsService.deleteDocument(orgId, mobileSuccessInvoice.docType, mobileSuccessInvoice.id);
           toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} deleted`);
         } catch (err) {
           console.error("Delete failed:", err);
           toast.error("Failed to delete invoice");
         }
       }
       setMobileSuccessInvoice(null);
       onOpenChange(false);
     }}
     ```

2. **More Menu (Requirement R4)**:
   - *Premise 1*: The `MoreVertical` button in the header is currently inactive.
   - *Premise 2*: Requirement R4 specifies 4 options:
     - Duplicate / Copy Bill
     - Share via WhatsApp
     - Download Thermal Receipt / PDF
     - Cancel / Void Invoice
   - *Premise 3*: On mobile devices, dropdown menus anchored to the top-right corner can be clipped by narrow viewports (320px–375px) and have small tap targets. A slide-up Mobile Action Sheet with large tap targets (min 48px) and descriptive subtitles gives superior touch ergonomics.
   - *Inference*: `MobileInvoiceSuccessView` should manage `isMoreMenuOpen: boolean`. Tapping `MoreVertical` sets `setIsMoreMenuOpen(true)`.

3. **Duplicate / Copy Bill Workflow**:
   - *Premise*: Duplicating means creating a new bill with the exact same line items, but under a new invoice number, resetting payment status, and clearing any association with the saved document ID so saving does not overwrite the existing record.
   - *Inference*: `MobileInvoiceSuccessViewProps` should expose `onDuplicate?: () => void`. In `SalesInvoiceModal.tsx`:
     ```tsx
     onDuplicate={() => {
       if (!mobileSuccessInvoice) return;
       setEditingDoc(null);
       const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
       setInvoiceNumberSeq(nextSeq);
       setAmountReceived(0);
       setMarkAsFullyPaid(false);
       setMobileSuccessInvoice(null);
       toast.success(`Bill duplicated! New bill sequence #${nextSeq}`);
     }}
     ```
     This transitions back to `MobileCreateInvoice` with all items populated, ready to generate the next bill.

4. **WhatsApp Direct Share Workflow**:
   - *Premise*: WhatsApp direct sharing must open `https://wa.me/?text=...` (or `https://wa.me/${phoneParam}?text=...`) with formatted invoice text.
   - *Inference*: Can be implemented purely internally within `MobileInvoiceSuccessView` without additional props.
   - *Text Composition*:
     ```ts
     const handleWhatsAppShare = () => {
       const store = storeInfo?.name || "CredSmart Store";
       const customer = invoice.partyName || "Valued Customer";
       const total = `₹${invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
       
       const message = 
         `🧾 *${store.toUpperCase()} - TAX INVOICE*\n\n` +
         `Hello *${customer}*,\n` +
         `Here is your invoice summary:\n` +
         `• *Invoice No:* #${invoice.documentNumber}\n` +
         `• *Date:* ${invoice.docDate}\n` +
         `• *Total Amount:* ${total}\n` +
         `• *Status:* ${invoice.status.toUpperCase()}\n\n` +
         `Thank you for your business!`;

       const rawPhone = invoice.partyPhone ? invoice.partyPhone.replace(/\D/g, "") : "";
       const phoneParam = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone) : "";
       
       const url = phoneParam
         ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
         : `https://wa.me/?text=${encodeURIComponent(message)}`;
       
       window.open(url, "_blank");
     };
     ```

5. **Download Thermal Receipt / PDF**:
   - *Premise*: Reuses the existing `handleDownload()` / `downloadExactInvoicePdf(buildPdfPayload())` already present in `MobileInvoiceSuccessView.tsx:71-77`.

6. **Cancel / Void Invoice**:
   - *Premise*: Voiding updates `status: "cancelled"`. CredSmart data models (`BusinessDocument.status`) already support `"cancelled"`.
   - *Inference*: `MobileInvoiceSuccessViewProps` should expose `onVoid?: () => void`. In `SalesInvoiceModal.tsx`:
     ```tsx
     onVoid={async () => {
       if (!mobileSuccessInvoice) return;
       try {
         const voidedDoc: BusinessDocument = {
           ...mobileSuccessInvoice,
           status: "cancelled",
         };
         await documentsService.saveDocument(voidedDoc, user?.id);
         setMobileSuccessInvoice(voidedDoc);
         toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} marked as Cancelled`);
       } catch (err) {
         console.error("Cancel failed:", err);
         toast.error("Failed to cancel invoice");
       }
     }}
     ```
   - *Visual Status update*: `MobileInvoiceSuccessView.tsx` activity section (lines 243–259) should render a badge for `invoice.status === "cancelled"` (`bg-slate-100 text-slate-600 font-bold`).

---

## 3. Caveats

1. **Existing Unit Test Impact**:
   - `src/test/MobileInvoiceSuccessView.test.tsx` (line 242) and `src/test/MobileInvoiceSuccessView.challenger.test.tsx` (line 159) click `trashBtn` and immediately assert `expect(onDeleteMock).toHaveBeenCalledTimes(1);`.
   - When the confirmation dialog/bottom sheet is added, clicking `trashBtn` will open the confirmation dialog, requiring a second click on the dialog's "Delete" button before `onDeleteMock` is invoked.
   - *Recommendation*: The test suite should be updated to test both the confirmation appearance ("Delete this invoice? This action cannot be undone.") and confirmation click.
2. **Purchase Invoice Modal Parity**:
   - `src/components/PurchaseInvoiceModal.tsx:1513` also mounts `MobileInvoiceSuccessView`. While the primary request is for Sales Invoice, implementing `onDuplicate`, `onDelete`, and `onVoid` consistently in `PurchaseInvoiceModal.tsx` prevents dead code or divergence.
3. **Z-Index Collision with Radix Portals**:
   - Because `SalesInvoiceModal` has `z-modal` (z-index: 500), using default Radix `AlertDialog` (`z-50`) portaled to `document.body` would render behind the modal. The confirmation sheet must either be embedded within `MobileInvoiceSuccessView` (recommended) or use an explicit class `z-[600]`.

---

## 4. Conclusion & Recommended Architecture

### Proposed `MobileInvoiceSuccessViewProps` Extension:
```ts
interface MobileInvoiceSuccessViewProps {
  invoice: BusinessDocument;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onVoid?: () => void;
  onGenerateEwayBill?: () => void;
  storeInfo?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
}
```

### Proposed Action Sheet & Modal Architecture in `MobileInvoiceSuccessView.tsx`:
1. **Trash Confirmation Bottom-Sheet**:
   - Triggered by header `Trash2` button.
   - Text: `"Delete this invoice? This action cannot be undone."`
   - Actions: `Cancel` (dismisses sheet) & `Delete` (invokes `onDelete?.()`).
2. **More Options Bottom-Sheet**:
   - Triggered by header `MoreVertical` button.
   - Renders 4 touch-friendly actions:
     - **Duplicate / Copy Bill** (`Copy` icon) -> calls `onDuplicate?.()`
     - **Share via WhatsApp** (`MessageCircle` icon, green accent) -> calls `handleWhatsAppShare()`
     - **Download Thermal Receipt / PDF** (`Download` icon) -> calls `handleDownload()`
     - **Cancel / Void Invoice** (`Ban` icon, rose accent) -> calls `onVoid?.()`
   - Includes a "Cancel" dismiss button at bottom with safe-area bottom inset.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Run Unit Tests**:
   ```powershell
   cmd /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx
   ```
2. **Run Challenger Suites**:
   ```powershell
   cmd /c npx vitest run src/test/MobileInvoiceSuccessView.challenger.test.tsx src/test/MobileInvoiceSuccessView.challenge.test.tsx
   ```
3. **Verify Full App Compilation**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```

### 5.2 Test Assertions to Add
- **Delete Confirmation Sheet**:
  - Click `Trash2` -> assert confirmation text `"Delete this invoice? This action cannot be undone."` is visible.
  - Click `Cancel` -> assert confirmation sheet closes and `onDeleteMock` was NOT called.
  - Re-open, click `Delete` -> assert `onDeleteMock` called once.
- **More Menu**:
  - Click `MoreVertical` -> assert all 4 options ("Duplicate / Copy Bill", "Share via WhatsApp", "Download Thermal Receipt / PDF", "Cancel / Void Invoice") appear.
  - Click "Duplicate" -> assert `onDuplicateMock` called.
  - Click "Cancel / Void" -> assert `onVoidMock` called.
  - Click "WhatsApp" -> assert `window.open` called with `https://wa.me/...`.
- **Database / Service Deletion**:
  - In `SalesInvoiceModal.tsx`, verify `documentsService.deleteDocument(orgId, "sales_invoice", docId)` is called, toast `"Invoice #[number] deleted"` is shown, and modal is closed.
