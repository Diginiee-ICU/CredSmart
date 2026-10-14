# Handoff Report — Architecture & PDF Parity Review

**Agent**: `reviewer_arch` (Architecture & PDF Parity Reviewer / Adversarial Critic)  
**Date**: 2026-10-14  
**Type**: Hard Handoff (Review Complete)  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **A4 Off-Screen Capture Dimensions & DOM Styling**:
   - In `src/utils/downloadExactInvoice.ts:114-124`:
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
   - Matches standard 96 DPI A4 portrait pixel dimensions (`210mm / 25.4 * 96 ≈ 794px` and `297mm / 25.4 * 96 ≈ 1123px`).

2. **jsPDF Single-Page Tolerance Scaling Math**:
   - In `src/utils/downloadExactInvoice.ts:190-210`:
     ```typescript
     const pdf = new jsPDF({
       orientation: "portrait",
       unit: "mm",
       format: "a4",
     });

     const pageWidthMm = 210;
     const pageHeightMm = 297;
     const imgAspect = canvas.height / canvas.width;
     const imgHeightMm = pageWidthMm * imgAspect;

     if (imgHeightMm > pageHeightMm + 0.5) {
       const scaleToFit = pageHeightMm / imgHeightMm;
       const scaledWidth = pageWidthMm * scaleToFit;
       const marginX = (pageWidthMm - scaledWidth) / 2;
       pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST");
     } else {
       pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, imgHeightMm, undefined, "FAST");
     }
     ```
   - Standard 794×1123px canvas yields `imgHeightMm = 210 * (1123 / 794) = 297.015mm`.
   - The `+ 0.5` tolerance prevents downscale distortion for normal A4 content (`297.015 <= 297.5`).
   - For content exceeding 297.5mm, it clamps height to `297mm` and centers width via `marginX`.

3. **DOM Cleanup Lifecycle**:
   - In `src/utils/downloadExactInvoice.ts:226-232`:
     ```typescript
     } finally {
       root.unmount();
       if (captureContainer.parentNode) {
         captureContainer.parentNode.removeChild(captureContainer);
       }
       resolve();
     }
     ```
   - Cleanly unmounts React tree and removes the off-screen DOM element even when errors occur.

4. **Bank Details Forwarding**:
   - In `src/utils/downloadExactInvoice.ts:45-51`:
     ```typescript
     bankDetails?: {
       bankName?: string;
       accountNumber?: string;
       ifsc?: string;
       accountHolder?: string;
       branch?: string;
     };
     ```
   - Forwarded at line 174: `bankDetails: payload.bankDetails`.
   - Rendered in `src/components/invoices/UnifiedInvoiceRenderer.tsx:1014-1037` in the `BANK ACCOUNT DETAILS` card with Bank Name, A/C No., IFSC, and Account Holder.

5. **Backward Compatibility**:
   - Thermal POS (`80mm` and `58mm`) preserved at `src/components/invoices/UnifiedInvoiceRenderer.tsx:464-631`.
   - `formatItemQuantityDisplay` preserved and exported at `src/components/invoices/UnifiedInvoiceRenderer.tsx:148-184`.
   - 11 `UniversalDocType` variants mapped via `DOC_TITLE_MAP` at `src/components/invoices/UnifiedInvoiceRenderer.tsx:131-143`.
   - Print CSS rules in `src/index.css:947-966` target `[data-print-container="invoice"]`.

6. **Execution Commands & Test Results**:
   - `cmd /c npx tsc --noEmit`: Code 0, 0 errors.
   - `cmd /c npx vitest run src/test/downloadExactInvoice.test.ts src/test/unitConversionBill.test.ts`:
     ```
     Test Files  2 passed (2)
          Tests  25 passed (25)
       Duration  13.08s
     ```
   - `cmd /c npx vitest run src/test/unifiedInvoiceRenderer.test.tsx`:
     ```
     Test Files  1 passed (1)
          Tests  122 passed (122)
       Duration  15.19s
     ```
   - `cmd /c npx vitest run src/test/downloadExactInvoice.adversarial.test.ts`: 12 passed.
   - `cmd /c npx vitest run src/test/downloadExactInvoice.realjspdf.test.ts`: 5 passed.
   - `cmd /c npx vitest run src/test/unifiedInvoiceRenderer.edge.test.tsx`: 47 passed.

---

## 2. Logic Chain

1. **Step 1 (Dimensions & Scaling)**: Observation 1 establishes that `captureContainer` enforces 794px × 1123px (A4 at 96 DPI). Observation 2 establishes that `imgHeightMm = 210 * (1123 / 794) = 297.015mm`. Since `297.015 - 297.0 = 0.015mm < 0.5mm`, the 0.5mm tolerance prevents fractional subpixel downscaling distortion while guaranteeing exact single-page fit.
2. **Step 2 (Memory & DOM Safety)**: Observation 3 shows that unmounting and DOM removal occur in the `finally` block. This guarantees that `captureContainer` is never leaked in `document.body`, even under uncaught exceptions during `html2canvas` or `jsPDF` execution.
3. **Step 3 (Data Completeness)**: Observation 4 demonstrates that `ExactInvoicePayload` declares `bankDetails` and forwards it to `UnifiedInvoiceRenderer`, which displays it in the `BANK ACCOUNT DETAILS` card or falls back gracefully to store bank fields.
4. **Step 4 (Compatibility Preservation)**: Observation 5 confirms that thermal POS layouts (`80mm` and `58mm`), `formatItemQuantityDisplay` dual-unit calculations, and all 11 `UniversalDocType` documents are intact and pass automated regression tests.
5. **Step 5 (Integrity Verification)**: Code inspection revealed zero hardcoded outputs, zero facade implementations, and zero test bypasses. Observation 6 confirms 100% clean TypeScript typechecking and 100% pass rate across all 211 tests executed across 6 test suites.

---

## 3. Caveats

- **Physical POS Printers**: Physical printing hardware was not physically attached during review; behavior verified through DOM structure, CSS constraints, and automated unit/integration test assertions.

---

## 4. Conclusion

The implementation satisfies all architectural, PDF export, bank detail forwarding, and backward compatibility requirements specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`. Zero regressions and zero integrity violations were detected. The verdict is **APPROVE**.

---

## 5. Verification Method

To independently verify the implementation:

```powershell
# TypeScript Typecheck
cmd /c npx tsc --noEmit

# PDF Engine & Unit Conversion Tests
cmd /c npx vitest run src/test/downloadExactInvoice.test.ts src/test/unitConversionBill.test.ts

# Master Visual Component Tests
cmd /c npx vitest run src/test/unifiedInvoiceRenderer.test.tsx

# Adversarial & Edge Case Tests
cmd /c npx vitest run src/test/downloadExactInvoice.adversarial.test.ts src/test/downloadExactInvoice.realjspdf.test.ts src/test/unifiedInvoiceRenderer.edge.test.tsx
```

All commands must exit with code 0.
