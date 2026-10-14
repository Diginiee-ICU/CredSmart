# Handoff Report: PDF Engine & Testing Architecture

**Agent**: PDF Engine Explorer  
**Date**: 2026-10-13  
**Working Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_pdf`  
**Handoff Type**: Hard (Investigation complete)  

---

## 1. Observation

1. **DOM Capture & PDF Pipeline in `src/utils/downloadExactInvoice.ts`**:
   - Lines 105–116 create the off-screen capture container:
     ```typescript
     const captureContainer = document.createElement("div");
     captureContainer.style.cssText = [
       "position:fixed",
       "top:0",
       "left:-9999px",
       "width:794px",
       "min-height:1123px",
       "background:#ffffff",
       "z-index:-999",
       "pointer-events:none",
     ].join(";");
     document.body.appendChild(captureContainer);
     ```
   - Lines 120–167 mount `UnifiedInvoiceRenderer` via React 18 `createRoot(captureContainer)`.
   - Line 169 enforces an asynchronous wait: `setTimeout(async () => { ... }, 500);`.
   - Lines 171–177 configure `html2canvas`:
     ```typescript
     const canvas = await html2canvas(captureContainer, {
       scale: 2,
       useCORS: true,
       logging: false,
       backgroundColor: "#ffffff",
       windowWidth: 794,
     });
     ```
   - Lines 186–200 compile the PDF with `jsPDF`:
     ```typescript
     const pageWidthMm = 210;
     const pageHeightMm = 297;
     const imgAspect = canvas.height / canvas.width;
     const imgHeightMm = pageWidthMm * imgAspect;

     if (imgHeightMm > pageHeightMm) {
       const scaleToFit = pageHeightMm / imgHeightMm;
       const scaledWidth = pageWidthMm * scaleToFit;
       const marginX = (pageWidthMm - scaledWidth) / 2;
       pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST");
     } else {
       pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, imgHeightMm, undefined, "FAST");
     }
     ```
   - Lines 202–204 sanitize filename and trigger browser download:
     ```typescript
     const safeInvoiceNumber = (payload.invoiceNumber || "invoice").replace(/[/\\:*?"<>|]/g, "-");
     pdf.save(`Invoice-${safeInvoiceNumber}.pdf`);
     ```

2. **Web Preview Scaling via `src/components/invoices/InvoiceFitView.tsx`**:
   - Lines 29–35 compute dynamic CSS transforms using `ResizeObserver`:
     ```typescript
     const scaleH = containerH / invoiceH;
     const scaleW = containerW > 0 && invoiceW > 0 ? containerW / invoiceW : 1;
     const newScale = Math.min(scaleH, scaleW, 1);
     setScale(newScale);
     ```
   - In `SalesInvoiceModal.tsx` (lines 1704–1706), `UnifiedInvoiceRenderer` is wrapped in `<InvoiceFitView className="flex-1 min-h-0">`, automatically fitting the invoice to the modal dialog without overflowing.

3. **Current Legacy Boxed Format in `src/components/invoices/UnifiedInvoiceRenderer.tsx`**:
   - Line 614: `className="bg-white text-slate-800 w-full max-w-[780px] mx-auto p-3 sm:p-4 relative border border-slate-300 box-border font-sans leading-tight shadow-md rounded-lg"`.
   - Contains boxed title bar (`bgLightHex`), 12-column store/metadata grid with table lines, single-row `BILL TO:` box, light-blue item table header, total summary embedded inside the table rows, and boxed 3-column bottom pods.
   - This matches `Old Invoice.jpeg`.

4. **Reference Design in `Correction/New folder/New Invoice.jpeg`**:
   - Visual inspection confirmed:
     - Unboxed clean page (no outer border container, no card drop-shadow).
     - Bold uppercase `TAX INVOICE` on left; stacked right-aligned metadata (`Invoice No.`, `Invoice Date`, `Due Date`).
     - Full-width cyan accent horizontal divider line (`#0ea5e9` / `#0284c7`).
     - Dual equal-width side-by-side pods (`FROM` on left, `BILL TO` on right) with pale blue header ribbons (`bg-[#e0f2fe]`).
     - Uppercase `ITEM DETAILS` section heading above the table.
     - Solid dark navy table header (`bg-[#0c324e]`) with white bold text.
     - Right-aligned summary breakdown with taxable value, GST (5%), soft blue rounded highlight pill for `Invoice total (rounded)`, and amount received.
     - Clean unboxed single line for `Amount in words: INR ... Only`.
     - Dual bordered cards with ribbons for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY`.
     - Minimalist footer note: `Thank you for your business.`.

5. **Direct Dependency on `UnifiedInvoiceRenderer` in Tests**:
   - `src/test/unitConversionBill.test.ts` lines 1–2:
     `import { formatItemQuantityDisplay, InvoiceItemData } from "../components/invoices/UnifiedInvoiceRenderer";`
   - Line 15 asserts `display.isDual === true`, `display.primaryLine === "1 PKT"`, `display.secondaryLine === "(1*4 Pcs)"`.

6. **Print CSS in `src/index.css`**:
   - Lines 924–945 define `@media print` rules targeting `[data-print-container="invoice"]`, `.one-page-invoice`, and `.invoice-print-container` with `@page { size: A4 portrait; margin: 5mm 7mm; }` and `max-width: 196mm; max-height: 284mm`.

7. **Project Test Setup & Environment Status**:
   - `vitest.config.ts`: Vitest v3.2.4, `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`.
   - `package.json`: script `"test": "vitest run"`.
   - Direct execution check: `Test-Path "node_modules"` returned `False`. `node_modules` is not yet installed in the workspace root.

---

## 2. Logic Chain

1. **Single-Page Aspect Ratio Math**:
   - From Observation 1, `captureContainer` has `width: 794px` and `min-height: 1123px`.
   - At standard 96 DPI, $794\text{ px} \times 1123\text{ px}$ corresponds to $209.98\text{ mm} \times 297.02\text{ mm}$, which is the pixel equivalent of A4 ($210\text{ mm} \times 297\text{ mm}$).
   - Because $1123 / 794 = 1.4143577 > 297 / 210 = 1.4142857$, `imgHeightMm` evaluates to $297.015\text{ mm}$.
   - In `downloadExactInvoice.ts`, `297.015 > 297` always triggers `scaleToFit = 297 / 297.015 = 0.99995`, scaling by $0.005\%$. Clamping `imgHeightMm <= pageHeightMm + 0.5` ensures full $210\text{ mm} \times 297\text{ mm}$ rendering with 0 margins when the content fits on one page.

2. **Overflow & Clipping Prevention**:
   - When an invoice has multiple items, `captureContainer` expands beyond 1123px.
   - `html2canvas` captures the expanded height.
   - `jsPDF` calculates `scaleToFit = pageHeightMm / imgHeightMm` (< 1.0) and renders the scaled content onto the single page with centered horizontal margins (`marginX`).
   - Consequently, **multi-page spillage does not occur in jsPDF**, but excessive content will shrink the entire document.
   - Therefore, the redesigned template in `UnifiedInvoiceRenderer.tsx` must maintain a compact vertical budget (compact padding in pods, tables, and totals) to keep typical invoices within the 1123px unscaled threshold.

3. **DOM & CSS Modernization**:
   - From Observations 3 and 4, the legacy boxed wrapper (`max-w-[780px] border border-slate-300 rounded-lg shadow-md`) contradicts the target unboxed page in `New Invoice.jpeg`.
   - Removing the outer card border and setting `w-full max-w-[794px] mx-auto p-6 sm:p-8` matches the A4 paper width and produces pixel-perfect visual alignment with `New Invoice.jpeg`.
   - Adding `data-print-container="invoice"` ensures compatibility with `src/index.css` `@media print` rules.

4. **Backward Compatibility & Regression Protection**:
   - From Observation 5, `unitConversionBill.test.ts` imports `formatItemQuantityDisplay` directly.
   - Therefore, `formatItemQuantityDisplay` must remain exported with identical return signatures (`isDual`, `primaryLine`, `secondaryLine`).
   - POS thermal layouts (`80mm`, `58mm`) must remain untouched.

---

## 3. Caveats

1. **`node_modules` Not Installed Locally**:
   - `node_modules` is currently absent in `c:\Users\bishn\Documents\GitHub\CredSmart`. Vitest and `tsc` cannot execute locally until `npm install` (or `npm ci`) is run.
2. **Font Loading Asynchrony in Headless DOM**:
   - `html2canvas` executes inside the browser DOM. If custom web fonts have not finished loading during the 500ms delay, fallback fonts could render. Adding `await document.fonts?.ready` in `downloadExactInvoice.ts` prevents this race condition.
3. **No Multi-Page jsPDF Splitting**:
   - The engine is intentionally designed as a **single-page** invoice renderer. Very large invoices (e.g. 20+ items) will scale down rather than split across multiple PDF pages.

---

## 4. Conclusion

1. **The PDF capture engine (`downloadExactInvoice.ts`) is architecturally sound** and successfully enforces single-page A4 scaling without multi-page spillage. Minor enhancements (0.5mm tolerance clamping, awaiting `document.fonts.ready`, and zeroing scroll offsets) will make it production-grade.
2. **The visual redesign required in `UnifiedInvoiceRenderer.tsx` is localized and unambiguous**: Replace the legacy boxed layout with the 9-part enterprise layout from `New Invoice.jpeg` (unboxed header, stacked metadata, cyan accent divider, dual FROM/BILL TO pods with ribbons, ITEM DETAILS heading, dark navy table header `#0c324e`, right-aligned totals with soft blue rounded pill, unboxed Amount in words, dual bank/signatory cards, minimalist footer).
3. **Two new test harnesses (`unifiedInvoiceRenderer.test.tsx` and `downloadExactInvoice.test.ts`) must be established** to guard layout fidelity and PDF export mechanics under `vitest`.

---

## 5. Verification Method

### 5.1 Environment Preparation
```bash
cmd /c npm install
```

### 5.2 TypeScript Compilation Check
```bash
cmd /c npx tsc --noEmit
```
**Expected Result**: Exits with code 0 (zero errors).

### 5.3 Test Suite Execution
```bash
# Run existing invoice tests
cmd /c npx vitest run src/test/invoiceCalculations.test.ts src/test/unitConversionBill.test.ts

# Run new test harnesses (once implemented)
cmd /c npx vitest run src/test/unifiedInvoiceRenderer.test.tsx src/test/downloadExactInvoice.test.ts
```
**Expected Result**: All tests pass with 100% success rate.

### 5.4 Invalidation Conditions
- Any occurrence of multi-page PDF generation when invoking `downloadExactInvoicePdf`.
- Clipping or text truncation at the right or bottom of the A4 page in downloaded PDFs.
- Breaking changes to `formatItemQuantityDisplay` causing `src/test/unitConversionBill.test.ts` to fail.
- Visual mismatch against `Correction/New folder/New Invoice.jpeg` (e.g., missing cyan accent line, missing ribbons, non-navy table header, or missing rounded total highlight pill).
