# Adversarial Challenge Report — PDF & Print Engine

**Target**: `src/utils/downloadExactInvoice.ts` & Single-Page A4 PDF / Print Pipeline  
**Challenger**: Adversarial Challenger (PDF & Print)  
**Date**: 2026-10-13  
**Verdict**: **APPROVE**

---

## 1. Executive Summary

We conducted an empirical adversarial challenge of `src/utils/downloadExactInvoice.ts`, evaluating single-page A4 rendering mechanics, container styling, aspect ratio calculations, subpixel tolerance math, vertical scaling on tall bills, horizontal centering symmetry, DOM cleanup resilience, and filename sanitization.

All 16 baseline tests in `src/test/downloadExactInvoice.test.ts`, 12 adversarial stress tests in `src/test/downloadExactInvoice.adversarial.test.ts`, and 5 unmocked real jsPDF integration tests in `src/test/downloadExactInvoice.realjspdf.test.ts` passed with 100% success rate (33/33 tests passing). TypeScript check (`tsc --noEmit`) completed with 0 errors.

---

## 2. Challenge Dimensions & Empirical Findings

### C1: 794px × 1123px Container Styling & 96 DPI Aspect Ratio
- **Implementation**:
  ```ts
  captureContainer.style.cssText = [
    "position:fixed", "top:0", "left:-9999px", "width:794px",
    "min-height:1123px", "background:#ffffff", "z-index:-999",
    "pointer-events:none"
  ].join(";");
  ```
- **Physical Verification**:
  - A4 dimensions: 210mm × 297mm.
  - At 96 DPI: 210mm / 25.4 * 96 = 793.7008 px (rounds to 794px).
  - 297mm / 25.4 * 96 = 1122.5197 px (rounds to 1123px).
  - Physical aspect ratio: 297 / 210 = 1.4142857.
  - Nominal pixel aspect ratio: 1123 / 794 = 1.4143577.
  - Discrepancy: `|1.4143577 - 1.4142857| = 0.000072` (< 0.005% distortion).
- **Result**: **PASS** (Zero observable distortion, high-fidelity capture).

---

### C2: 0.5mm Tolerance Mathematics & Real jsPDF Single-Page Invariant
- **Implementation**:
  ```ts
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
- **Adversarial Boundary Analysis**:
  - For standard 794 × 1123px canvas: `imgHeightMm = 210 * (1123 / 794) = 297.015113 mm`.
  - Discrepancy: `+0.015113 mm`, which is well below the `+0.5 mm` threshold (`297.015 <= 297.5`).
  - At boundary `1124px` (`imgHeightMm = 297.28mm`): falls within tolerance, rendered at full 210mm width.
  - At boundary `1125px` (`imgHeightMm = 297.54mm`): triggers downscaling, clamped to 297mm height with `marginX = 0.19mm`.
- **Real jsPDF Integration Verification**:
  - We executed tests against unmocked `jsPDF` (`src/test/downloadExactInvoice.realjspdf.test.ts`).
  - Verified that rendering an image at `height = 297.015mm` or `297.4mm` does NOT trigger an automatic page break in jsPDF. `pdf.getNumberOfPages()` remains strictly `1`.
- **Result**: **PASS**.

---

### C3: Vertical Downscaling & Horizontal Centering for Tall Bills
- **Adversarial Stress Scenarios**:
  - Tested 15 line items (`canvas.height = 1600px`, `imgHeightMm = 423.17mm`).
  - Tested 50 line items (`canvas.height = 4000px`, `imgHeightMm = 1057.93mm`).
- **Empirical Observations**:
  - In all tall scenarios, `pdf.addImage` receives `y = 0` and `height = 297mm`.
  - Scaled width calculation: `scaledWidth = 210 * (297 / imgHeightMm)`.
  - Centering margin: `marginX = (210 - scaledWidth) / 2`.
  - Symmetrical centering invariant: `scaledWidth + 2 * marginX === 210.0` holds to 5 decimal places across all tested heights.
  - No horizontal clipping and no second page generation.
- **Result**: **PASS**.

---

### C4: DOM Lifecycle & Cleanup
- **Scenarios Tested**:
  - Normal execution: `captureContainer` removed from `document.body` after completion.
  - `html2canvas` rejection: container removed and root unmounted in `finally` block.
  - `pdf.save()` throwing: container removed and root unmounted in `finally` block.
  - Concurrent requests: 3 simultaneous invocations execute without race conditions or leaked nodes.
- **Result**: **PASS**.

---

### C5: Filename Sanitization & Directory Traversal Resistance
- **Implementation**:
  ```ts
  const safeInvoiceNumber = (payload.invoiceNumber || "invoice").replace(/[/\\:*?"<>|]/g, "-");
  pdf.save(`Invoice-${safeInvoiceNumber}.pdf`);
  ```
- **Stress Vectors Tested**:
  - Windows illegal chars `INV/2026\test:illegal*wild?quote"less<greater>pipe|` -> sanitized to `Invoice-INV-2026-test-illegal-wild-quote-less-greater-pipe-.pdf`.
  - Directory traversal `../../../../../windows/system32/cmd` -> sanitized to `Invoice-..-..-..-..-..-windows-system32-cmd.pdf`.
  - Empty string `""` -> falls back to `Invoice-invoice.pdf`.
  - `null` / `undefined` -> falls back to `Invoice-invoice.pdf`.
- **Result**: **PASS**.

---

## 3. Test Execution Summary

| Test File | Total Tests | Passed | Failed | Duration |
|-----------|-------------|--------|--------|----------|
| `src/test/downloadExactInvoice.test.ts` | 16 | 16 | 0 | 5.2s |
| `src/test/downloadExactInvoice.adversarial.test.ts` | 12 | 12 | 0 | 5.7s |
| `src/test/downloadExactInvoice.realjspdf.test.ts` | 5 | 5 | 0 | 0.07s |
| `src/test/unifiedInvoiceRenderer.test.tsx` | 122 | 122 | 0 | 6.3s |
| **Total** | **155** | **155** | **0** | **~17.3s** |

- TypeScript Compilation (`tsc --noEmit`): **PASSED** (0 errors).

---

## 4. Final Verdict

**APPROVE**

The single-page A4 PDF rendering mechanics in `src/utils/downloadExactInvoice.ts` satisfy all mathematical, visual, security, and lifecycle criteria specified in `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z) and `PROJECT.md`.
