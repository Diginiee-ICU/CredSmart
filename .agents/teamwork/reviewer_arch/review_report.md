# Architecture & PDF Parity Review Report

**Agent**: `reviewer_arch` (Architecture & PDF Parity Reviewer / Adversarial Critic)  
**Date**: 2026-10-14  
**Scope**: `src/utils/downloadExactInvoice.ts`, `src/index.css`, `src/components/invoices/UnifiedInvoiceRenderer.tsx`, and Associated Test Suites  

---

## Review Summary

**Verdict**: **APPROVE**

The implementation of the Master GST Invoice Redesign, single-page A4 PDF export pipeline, and backward-compatibility layers has been thoroughly investigated, type-checked, stress-tested, and verified.

1. **Single-Page A4 PDF Export Parity**:
   - The off-screen container layout in `src/utils/downloadExactInvoice.ts` strictly enforces 96 DPI A4 dimensions (`794px` width, `1123px` min-height), positioned fixed off-screen at `left: -9999px` with `#ffffff` background and `z-index: -999`.
   - `jsPDF` instance is configured with `orientation: "portrait"`, `unit: "mm"`, `format: "a4"` (`210mm × 297mm`).
   - The single-page math includes a `0.5mm` tolerance threshold (`if (imgHeightMm > pageHeightMm + 0.5)`). Standard 794×1123px renders translate to `297.015mm`, which is within the 0.5mm threshold of `297.0mm`, eliminating subpixel downscaling distortion.
   - For tall invoices (> 297.5mm), proportional downscaling (`scaleToFit = pageHeightMm / imgHeightMm`) and horizontal centering (`marginX = (pageWidthMm - scaledWidth) / 2`) guarantee that all content fits onto a single page without truncation or clipping.
   - Robust lifecycle management (`try ... finally`) ensures `root.unmount()` and `captureContainer.parentNode.removeChild(captureContainer)` execute reliably, preventing DOM leaks even under synthetic errors.

2. **Bank Details Forwarding**:
   - `ExactInvoicePayload` extends `bankDetails?: { bankName?, accountNumber?, ifsc?, accountHolder?, branch? }`.
   - `downloadExactInvoicePdf` passes `bankDetails: payload.bankDetails` to `UnifiedInvoiceRenderer`.
   - `UnifiedInvoiceRenderer` prioritizes explicit `bankDetails`, falls back to `storeInfo` bank fields, or displays a graceful fallback (`"Direct bank payment available on request."`).

3. **Backward Compatibility**:
   - Dedicated thermal POS modes (`80mm` and `58mm`) remain 100% functional with monospace receipt styling, compact width, dashed borders, and QR code integration.
   - `formatItemQuantityDisplay` correctly renders dual-unit breakdowns (`altQty altUnit` with `(altQty*conv baseUnit)` sub-lines) and single-unit standard lines.
   - All 11 `UniversalDocType` variants (`sales_invoice`, `pos_invoice`, `purchase_invoice`, `quotation`, `delivery_challan`, `sales_return`, `credit_note`, `debit_note`, `proforma_invoice`, `payment_in`, `payment_out`) render appropriate titles, counterparty labels, and metadata.

4. **Code Quality & Integrity Check**:
   - Zero TypeScript errors (`tsc --noEmit` code 0).
   - Zero integrity violations detected: no hardcoded test outputs, no dummy implementations, no bypass shortcuts, and no fabricated assertions.
   - All 147 test assertions across the primary suites pass with 100% success.
   - Adversarial suites pass with 100% success.

---

## Findings

### Minor Finding 1 (Observational / Cleanliness)
- **What**: In `src/utils/downloadExactInvoice.ts` line 176, `UnifiedInvoiceRenderer` props are cast `as any` with an eslint-disable comment.
- **Where**: `src/utils/downloadExactInvoice.ts:176`
- **Why**: `UnifiedInvoiceProps` already types `bankDetails`, `placeOfSupply`, and `totals` accurately. The cast `as any` was likely added as a convenience during fast prototyping.
- **Risk Level**: Very Low (harmless in production; `tsc --noEmit` passes cleanly).
- **Suggestion**: In a future refactoring pass, tighten the props object so it directly conforms to `UnifiedInvoiceProps` without `as any`.

---

## Verified Claims

| Claim | Verification Method | Result |
|---|---|---|
| Off-screen capture container has exact 794px width and 1123px min-height | Inspected `src/utils/downloadExactInvoice.ts:114-124`; verified in `src/test/downloadExactInvoice.test.ts:50-98` | PASS |
| Single-page A4 tolerance threshold (0.5mm) prevents subpixel downscale distortion | Analyzed math at 794x1123px (`297.015mm`); verified in `src/test/downloadExactInvoice.test.ts:148-251` and `downloadExactInvoice.adversarial.test.ts:51-105` | PASS |
| Tall content (> 297.5mm) scales down proportionally and centers horizontally | Tested via synthetic canvas height 1600px; verified `mockAddImage` receives clamped `height: 297` and centered `marginX` | PASS |
| DOM element cleaned up after capture, even on error | Inspected `finally` block in `downloadExactInvoice.ts:226-232`; verified in `downloadExactInvoice.adversarial.test.ts:145-190` | PASS |
| `ExactInvoicePayload` forwards `bankDetails` to `UnifiedInvoiceRenderer` | Inspected interface `downloadExactInvoice.ts:45-51` and call `downloadExactInvoice.ts:174`; verified in `downloadExactInvoice.test.ts:288-306` | PASS |
| Missing bank details falls back gracefully to store bank or placeholder | Inspected `UnifiedInvoiceRenderer.tsx:423-441, 1024-1035`; verified in test suite | PASS |
| Backward compatibility for thermal POS (`80mm` and `58mm`) | Inspected `UnifiedInvoiceRenderer.tsx:464-631`; verified in `unifiedInvoiceRenderer.test.tsx:588-598` | PASS |
| Backward compatibility for `formatItemQuantityDisplay` multi-unit math | Tested 9 unit conversion tests in `src/test/unitConversionBill.test.ts`; all 9 pass | PASS |
| Backward compatibility for all 11 `UniversalDocType` variants | Inspected `DOC_TITLE_MAP` in `UnifiedInvoiceRenderer.tsx:131-143`; verified in `unifiedInvoiceRenderer.test.tsx:568-587` | PASS |
| Zero TypeScript compile errors | Executed `cmd /c npx tsc --noEmit` | PASS (Exit code 0) |
| Test suite execution | Executed `vitest` on `downloadExactInvoice.test.ts`, `unitConversionBill.test.ts`, `unifiedInvoiceRenderer.test.tsx` | PASS (147 / 147 passed) |

---

## Coverage Gaps

- **None**: Every critical path in the dispatch (A4 export layout, tolerance math, container cleanup, bank forwarding, thermal compatibility, unit conversion, and document types) has been verified by direct code inspection and executable automated tests.

---

## Unverified Items

- **Physical Printer Hardware Testing**: Physical thermal POS receipt printer hardware was not physically connected (verified via simulated DOM layout, font-mono styles, and element bounds).

---

## Adversarial Challenge & Stress-Testing

**Overall Risk Assessment**: **LOW**

### Adversarial Challenges Evaluated

1. **Challenge 1: Aspect Ratio Math & Tolerance Boundary**
   - *Attack scenario*: What happens when canvas height is slightly above 1123px (e.g. 1124px or 1125px)? Does it cause unwanted downscaling or text blur?
   - *Result*: At 1124px, physical height is `297.279mm` (≤ `297.5mm`), so no downscale is triggered; at 1125px (`297.544mm`), downscaling kicks in cleanly and clamps height to `297mm` with horizontal centering. Verified in `downloadExactInvoice.adversarial.test.ts`.

2. **Challenge 2: Memory Leak & Orphan DOM Elements**
   - *Attack scenario*: What happens if `html2canvas` rejects, or `jsPDF.save()` throws (e.g. out of memory, disk write error)?
   - *Result*: The `finally` block in `downloadExactInvoice.ts` unconditionally calls `root.unmount()` and removes `captureContainer` from `document.body`. No dangling DOM elements or memory leaks.

3. **Challenge 3: Filename Injection & Path Traversal**
   - *Attack scenario*: What happens if `payload.invoiceNumber` contains path traversal sequences like `../../etc/passwd` or illegal Windows filesystem characters (`/ \ : * ? " < > |`)?
   - *Result*: Sanitizer `.replace(/[/\\:*?"<>|]/g, "-")` neutralizes all illegal characters, replacing slashes and colons with `-`. Fallback `"invoice"` is used if `invoiceNumber` is empty.

4. **Challenge 4: Missing or Undefined Payload Fields**
   - *Attack scenario*: Can null or undefined `items`, `totals`, or `bankDetails` cause unhandled exceptions during PDF generation?
   - *Result*: All inputs use safe defaults (`items || []`, `totals?.subtotal ?? payload.totalAmount`, `taxRate ?? 0`, `bankDetails?.accountNumber ? ... : safeStore.account_number ? ... : null`).

---

## Independent Verification Commands

To reproduce the verification results:

```powershell
# 1. Typecheck
cmd /c npx tsc --noEmit

# 2. PDF Engine & Multi-Unit Tests
cmd /c npx vitest run src/test/downloadExactInvoice.test.ts src/test/unitConversionBill.test.ts

# 3. Master Visual E2E Component Suite
cmd /c npx vitest run src/test/unifiedInvoiceRenderer.test.tsx

# 4. Adversarial Engine & Real jsPDF Suites
cmd /c npx vitest run src/test/downloadExactInvoice.adversarial.test.ts src/test/downloadExactInvoice.realjspdf.test.ts
```

All commands execute cleanly with exit code 0.
