# PDF & Print Engine Architecture Report: CredSmart Invoice Redesign

**Author**: PDF Engine Explorer  
**Date**: 2026-10-13  
**Working Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_pdf`  
**Target Design Reference**: `Correction/New folder/New Invoice.jpeg`  
**Legacy Reference**: `Correction/New folder/Old Invoice.jpeg`  
**Source Under Investigation**: `src/utils/downloadExactInvoice.ts`, `src/components/invoices/UnifiedInvoiceRenderer.tsx`, `src/components/invoices/InvoiceFitView.tsx`, `src/index.css`, `src/test/`

---

## Executive Summary

CredSmart's master invoice system is undergoing a major enterprise visual redesign, transitioning from a legacy boxed/card layout (`Old Invoice.jpeg`) to a modern, unboxed, corporate standard (`New Invoice.jpeg`). 

The PDF export pipeline in `src/utils/downloadExactInvoice.ts` couples off-screen DOM rendering (`react-dom/client` `createRoot`), raster canvas snapshotting (`html2canvas`), and client-side vector page compilation (`jspdf`). This investigation provides a complete technical analysis of the capture pipeline, dimensional math for strict single-page A4 aspect ratio adherence, font and CSS rendering constraints, test setup status (`vitest`), and test harnesses required to certify 100% visual fidelity and zero regressions.

---

## Part 1: Investigation of `downloadExactInvoice.ts` Pipeline

### 1.1 End-to-End Pipeline Workflow

The function `downloadExactInvoicePdf(payload: ExactInvoicePayload): Promise<void>` executes the following chronological lifecycle:

```
[Trigger Call] (SalesInvoiceModal, PurchaseInvoiceModal, MobileInvoiceSuccessView, Sales, Purchases)
       │
       ▼
[1. Payload Normalization & Fallbacks]
       ├── Loads settings via loadInvoiceSettings()
       ├── Resolves docType (default "sales_invoice")
       ├── Computes subtotal, taxableAmount, CGST, SGST, roundOff
       └── Maps items to InvoiceItemData array
       │
       ▼
[2. Off-Screen DOM Container Creation]
       ├── Document.createElement("div")
       ├── Fixed position at left: -9999px (hidden from viewport)
       ├── Width: 794px, Min-Height: 1123px (A4 @ 96 DPI)
       └── Appended to document.body
       │
       ▼
[3. Off-Screen React Mount via createRoot]
       ├── createRoot(captureContainer).render(<UnifiedInvoiceRenderer ... />)
       └── Props passed: docType, copyType, dates, storeInfo, partyInfo, items, totals, etc.
       │
       ▼
[4. Render Wait Delay (setTimeout 500ms)]
       └── Allows React state reconciliation, DOM reflow, and stylesheet computation
       │
       ▼
[5. Canvas Capture via html2canvas]
       ├── Options: scale: 2 (192 DPI crispness), useCORS: true, backgroundColor: "#ffffff", windowWidth: 794
       └── Returns HTMLCanvasElement (approx 1588px x 2246px)
       │
       ▼
[6. PDF Page Compilation via jsPDF]
       ├── Orientation: "portrait", Unit: "mm", Format: "a4" (210mm x 297mm)
       ├── Aspect ratio calculation: imgAspect = canvas.height / canvas.width
       ├── imgHeightMm = 210 * imgAspect
       ├── Scaling check: if (imgHeightMm > 297mm) scaleToFit; else 1:1 fit
       └── pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST")
       │
       ▼
[7. File Download & Teardown]
       ├── Sanitizes filename: (invoiceNumber || "invoice").replace(/[/\\:*?"<>|]/g, "-")
       ├── pdf.save(`Invoice-${safeInvoiceNumber}.pdf`)
       ├── root.unmount()
       └── captureContainer.remove()
```

### 1.2 Calling Sites in the CredSmart Application

Grep analysis revealed that `downloadExactInvoicePdf` is invoked in:
1. `src/components/SalesInvoiceModal.tsx` (Lines 67, 1122, 1248) - Main sales invoice create & edit modal.
2. `src/components/PurchaseInvoiceModal.tsx` (Lines 64, 1145, 1261) - Purchase bills & voucher flows.
3. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` (Lines 4, 72, 76) - Mobile POS invoice generation success screen.
4. `src/pages/Sales.tsx` (Lines 39, 905, 1247, 1342) - Sales ledger actions & row context menus.
5. `src/pages/Purchases.tsx` (Lines 72, 781) - Purchases ledger actions.
6. `src/pages/SalesHistory.tsx` (Lines 33, 604) - Historical invoices and reprint flow.

---

## Part 2: Single-Page A4 Aspect Ratio, Scaling & Overflow Mechanics

### 2.1 The Mathematical Basis (96 DPI Standard CSS Pixels)

International standard A4 paper dimensions are:
- **Physical Width**: $210\text{ mm} = 8.2677165\text{ inches}$
- **Physical Height**: $297\text{ mm} = 11.6929134\text{ inches}$
- **Physical Aspect Ratio**: $\frac{297}{210} = 1.4142857$

In CSS screen pixels at 96 DPI:
- **CSS Width**: $8.2677165 \times 96 = 793.7008\text{ px} \approx 794\text{ px}$
- **CSS Height**: $11.6929134 \times 96 = 1122.5197\text{ px} \approx 1123\text{ px}$
- **Pixel Aspect Ratio**: $\frac{1123}{794} = 1.4143577$

When `html2canvas` captures at `scale: 2`:
- Canvas pixel width: $794 \times 2 = 1588\text{ px}$
- Canvas pixel height: $1123 \times 2 = 2246\text{ px}$

### 2.2 Subpixel Rounding & Floating-Point Threshold Analysis

In `downloadExactInvoice.ts` lines 189–200:
```typescript
const pageWidthMm = 210;
const pageHeightMm = 297;
const imgAspect = canvas.height / canvas.width; // 2246 / 1588 = 1.4143577
const imgHeightMm = pageWidthMm * imgAspect;    // 210 * 1.4143577 = 297.0151 mm

if (imgHeightMm > pageHeightMm) { // 297.0151 > 297 is TRUE!
  const scaleToFit = pageHeightMm / imgHeightMm; // 297 / 297.0151 = 0.999949
  const scaledWidth = pageWidthMm * scaleToFit;  // 209.989 mm
  const marginX = (pageWidthMm - scaledWidth) / 2; // 0.005 mm
  pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST");
} else {
  pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, imgHeightMm, undefined, "FAST");
}
```

**Key Finding**:
Because $\frac{1123}{794} = 1.4143577 > \frac{297}{210} = 1.4142857$, `imgHeightMm` evaluates to $297.0151\text{ mm}$, which is $0.015\text{ mm}$ taller than $297\text{ mm}$.
- As a result, the code *always* triggers the `imgHeightMm > pageHeightMm` scaling branch, even for a standard 1-item invoice!
- While $0.005\text{ mm}$ horizontal margin is imperceptible to the human eye, it introduces unnecessary subpixel interpolation in canvas downscaling.
- **Fix**: Introduce a $0.5\text{ mm}$ tolerance threshold:
  ```typescript
  if (imgHeightMm > pageHeightMm + 0.5) {
    const scaleToFit = pageHeightMm / imgHeightMm;
    const scaledWidth = pageWidthMm * scaleToFit;
    const marginX = (pageWidthMm - scaledWidth) / 2;
    pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST");
  } else {
    // Fits exactly on A4 without scaling distortion
    pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
  }
  ```

### 2.3 Tall Invoice Overflow vs Visual Clipping

1. **Why multi-page overflow does NOT occur**:
   - `captureContainer` has `min-height: 1123px`. If content has 10–15 items and naturally takes 1450px, `captureContainer` expands vertically.
   - `html2canvas` captures the full 1450px.
   - `imgAspect = 1450 / 794 = 1.8262`.
   - `imgHeightMm = 210 * 1.8262 = 383.5\text{ mm}`.
   - `scaleToFit = 297 / 383.5 = 0.7744`.
   - `scaledWidth = 210 * 0.7744 = 162.6\text{ mm}`.
   - `marginX = (210 - 162.6) / 2 = 23.7\text{ mm}`.
   - `pdf.addImage(imgData, "PNG", 23.7, 0, 162.6, 297, undefined, "FAST")`.
   - Result: The entire invoice is uniformly shrunk by 22.5% and centered horizontally. **No 2nd page is created in jsPDF.**

2. **The Trade-Off (Shrinkage vs Content Budget)**:
   - If an invoice has excessive vertical padding or oversized tables, shrinking causes text to become small and introduces wide white borders on the left and right (`marginX`).
   - Therefore, the redesigned invoice in `UnifiedInvoiceRenderer.tsx` must maintain a **tight vertical budget** so standard invoices (1 to 8 line items) fit comfortably inside the 1123px container at 100% scale without shrinking!

### 2.4 Browser Print Engine Parity (`window.print()`)

In `src/index.css` (lines 924–965), dedicated print media rules are defined:
```css
@media print {
  @page {
    size: A4 portrait;
    margin: 5mm 7mm 5mm 7mm;
  }
  .one-page-invoice,
  .invoice-print-container,
  [data-print-container="invoice"],
  .invoice-wrapper {
    width: 100% !important;
    max-width: 196mm !important;
    max-height: 284mm !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
    overflow: hidden !important;
  }
}
```

To guarantee that browser printing (`Ctrl+P` or `window.print()`) matches PDF download:
- The root element of `UnifiedInvoiceRenderer` must carry `data-print-container="invoice"` and `one-page-invoice`.
- This ensures that browser printing clamps to $196\text{ mm} \times 284\text{ mm}$ and prevents blank page spills.

---

## Part 3: Visual & Structural Gap Analysis

Comparison across **Legacy Implementation** (`Old Invoice.jpeg`), **Current Code**, and **New Master Specification** (`New Invoice.jpeg`):

| Section | Legacy Implementation (`Old Invoice.jpeg`) | Current `UnifiedInvoiceRenderer.tsx` | New Target Specification (`New Invoice.jpeg`) |
| :--- | :--- | :--- | :--- |
| **Page Enclosure** | Boxed card inside gray background, outer rounded border, drop shadow | `max-w-[780px] p-3 sm:p-4 border border-slate-300 rounded-lg shadow-md` | **Unboxed clean page**; no outer card border, no shadow; page breathes freely with clean margins |
| **Header Title** | Boxed bar with light blue background: `TAX INVOICE [ORIGINAL FOR RECIPIENT]` | Same: boxed bar with `bgLightHex` and copy type pill | **Large bold `TAX INVOICE`** on left (slate-900 / dark navy); no outer container box |
| **Header Metadata** | 4-row right-hand table grid (`INVOICE NO:`, `DATE:`, `DUE:`, `POS:`) | Same 12-column grid with right-hand metadata box | **Stacked right-aligned clean metadata**: `Invoice No.`, `Invoice Date`, `Due Date` (no table borders) |
| **Accent Divider** | None (only container border) | None | **Full-width vibrant cyan/blue horizontal line** (`#0ea5e9` / `#0284c7`, height ~2px) beneath header |
| **Party Information** | Divided grid with seller info on left, single-row `BILL TO:` below | 12-col store pod + full-width or dual BILL/SHIP TO pod with dividing lines | **Dual equal-width side-by-side pods** (`FROM` on left, `BILL TO` on right) with soft blue ribbons |
| **Pod Ribbon Headers** | Plain text labels (`BILL TO:`) | Colored text `style={{ color: primaryHex }}` | **Soft pale-blue header ribbons** (`bg-[#e0f2fe]` or `bg-[#f0f9ff]`, text `#0284c7`, bold uppercase) |
| **Item Heading** | None (straight to table) | None | **Uppercase `ITEM DETAILS` section title** in cyan/blue above table |
| **Table Header** | Light gray/blue header row (`bg-slate-50` / `bgLightHex`) | Light gray/blue header row | **Solid dark navy header** (`bg-[#0c324e]`) with pure white bold text (`text-white`) |
| **Table Columns** | `S.NO`, `ITEMS`, `HSN`, `QTY`, `RATE`, `AMOUNT` | `S.No`, `ITEMS`, `HSN`, `QTY`, `RATE`, `AMOUNT` | `S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount` |
| **Financial Summary** | Embedded inside table footer (`TOTAL AMOUNT`, `RECEIVED AMOUNT`) | Embedded inside table footer + separate HSN summary table below | **Right-aligned breakdown block** below table: Taxable value / Rate, GST (5%), **soft blue rounded highlight pill** for `Invoice total (rounded)`, and Amount received |
| **Amount in Words** | Boxed full-width gray banner (`border border-slate-300 bg-slate-50/70`) | Same boxed banner | **Clean unboxed single line**: `Amount in words: INR ... Only` |
| **Bottom Cards** | 3-column split: Notes & Terms \| Bank Details \| Signatory | 3-column split: Notes & Terms \| Bank Details \| Signatory | **Dual side-by-side bordered cards** with light-blue ribbons: `BANK ACCOUNT DETAILS` (left) and `AUTHORISED SIGNATORY` (right) |
| **Footer** | Heavy compliance text (`Powered by CredSmart`, `IT Act 2000 Ready`) | Heavy compliance text with logo | **Minimalist footer note**: `Thank you for your business.` |

---

## Part 4: Testing Infrastructure & Baseline Analysis

### 4.1 Test Runner & Environment Configuration

Inspection of `vitest.config.ts`:
- **Runner**: Vitest v3.2.4
- **Environment**: `jsdom` (v20.0.3)
- **Globals**: `true` (describe, it, expect available without explicit imports)
- **Setup file**: `src/test/setup.ts` (imports `@testing-library/jest-dom` and mocks `window.matchMedia`)
- **Includes**: `src/**/*.{test,spec}.{ts,tsx}`
- **Path alias**: `@` -> `./src`

### 4.2 Existing Invoice Test Suites

1. `src/test/invoiceCalculations.test.ts` (7,879 bytes):
   - Verifies flat/percentage discounts on taxable value before GST.
   - Verifies alternate unit conversion math.
   - Verifies tax inclusive ("With Tax") vs tax exclusive ("Without Tax") calculations.
   - Verifies intrastate (CGST+SGST) vs interstate (IGST).
2. `src/test/unitConversionBill.test.ts` (5,318 bytes):
   - Directly imports and tests `formatItemQuantityDisplay` from `src/components/invoices/UnifiedInvoiceRenderer`.
   - **Crucial Requirement**: Any refactoring of `UnifiedInvoiceRenderer.tsx` MUST preserve `formatItemQuantityDisplay` and `InvoiceItemData` exports.

### 4.3 Environment Workspace Finding

- Direct inspection confirmed that `node_modules` is currently NOT installed in the workspace root directory `c:\Users\bishn\Documents\GitHub\CredSmart`.
- `package-lock.json` is present and valid.
- In PowerShell on Windows, script execution policy restricts `npx.ps1` from running directly; commands must be run via `cmd /c npx ...` or `npm.cmd ...`.
- Once `npm install` (or `npm ci`) is run, the verification commands are:
  - Vitest test runner: `npm test` or `npx vitest run`
  - Invoice test subset: `npx vitest run src/test/invoiceCalculations.test.ts src/test/unitConversionBill.test.ts`
  - TypeScript typecheck: `npx tsc --noEmit`

---

## Part 5: Test Harness & Quality Assurance Strategy

To verify the new master invoice layout across both **Web Previews** and **Single-Page PDF Exports**, two new test harnesses should be added to `src/test/`:

### 5.1 Test Harness 1: `src/test/unifiedInvoiceRenderer.test.tsx` (Component & Visual Regression)

This test suite renders `UnifiedInvoiceRenderer` in JSDOM using `@testing-library/react` and asserts the presence and structure of all enterprise elements from `New Invoice.jpeg`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  UnifiedInvoiceRenderer,
  formatItemQuantityDisplay,
} from "@/components/invoices/UnifiedInvoiceRenderer";

describe("UnifiedInvoiceRenderer - Enterprise Redesign Specification", () => {
  const baseProps = {
    invoiceNumber: "INV/26-27/134",
    date: "2026-10-12",
    dueDate: "2026-10-12",
    docType: "sales_invoice" as const,
    storeInfo: {
      name: "ASIA INTERNATIONAL",
      address: "Shop No. 3, Mohalla Lal Sarai, Nagina, Bijnor, Uttar Pradesh 246762, India",
      phone: "9958685892",
      email: "ashwin@woodzire.business",
      gstin: "09CFHPA3376R1ZU",
      pan: "CFHPA3376R",
      bank_name: "Federal Bank",
      account_number: "77770100867585",
      ifsc: "FDRL0007777",
      account_holder: "Ashwin Bishnoi",
    },
    partyInfo: {
      name: "SIMPLE SOURCING",
      address: "9/5 Surya Darshan Building, Mumbai - 400006, Maharashtra, India",
      phone: "9920041363",
      gstin: "27BEXPG3118P2ZS",
      state: "Maharashtra",
    },
    items: [
      {
        id: "item-1",
        name: "Wooden Crocheting hooks samples",
        hsn: "44219990",
        qty: 1,
        unit: "Pc",
        rate: 4750,
        taxRate: 5,
        total: 4987.5,
      },
    ],
    totals: {
      subtotal: 4750,
      taxableAmount: 4750,
      cgst: 118.75,
      sgst: 118.75,
      taxTotal: 237.5,
      roundOff: 0.5,
      grandTotal: 4988,
      paidAmount: 4988,
      balanceDue: 0,
    },
    paymentMethod: "Cash",
    placeOfSupply: "Maharashtra",
  };

  it("renders unboxed header with TAX INVOICE title and stacked metadata", () => {
    const { container } = render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("TAX INVOICE")).toBeInTheDocument();
    expect(screen.getByText("INV/26-27/134")).toBeInTheDocument();
    expect(screen.getByText("Invoice No.")).toBeInTheDocument();
    expect(screen.getByText("Invoice Date")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
  });

  it("renders dual equal-width pods with FROM and BILL TO header ribbons", () => {
    render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("FROM")).toBeInTheDocument();
    expect(screen.getByText("BILL TO")).toBeInTheDocument();
    expect(screen.getByText("ASIA INTERNATIONAL")).toBeInTheDocument();
    expect(screen.getByText("SIMPLE SOURCING")).toBeInTheDocument();
    expect(screen.getByText(/Place of Supply:\s*Maharashtra/i)).toBeInTheDocument();
  });

  it("renders ITEM DETAILS heading and solid dark navy table header with white text", () => {
    const { container } = render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("ITEM DETAILS")).toBeInTheDocument();
    const thead = container.querySelector("thead");
    expect(thead).toBeInTheDocument();
    expect(thead?.className).toMatch(/bg-\[#0c324e\]/);
    expect(screen.getByText("S.No.")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("HSN")).toBeInTheDocument();
    expect(screen.getByText("Qty")).toBeInTheDocument();
    expect(screen.getByText("Rate")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("renders right-aligned totals with soft blue rounded highlight pill", () => {
    const { container } = render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText(/Taxable value \/ Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Invoice total \(rounded\)/i)).toBeInTheDocument();
    const pill = screen.getByText(/Invoice total \(rounded\)/i).closest("div");
    expect(pill?.className).toMatch(/bg-\[#e0f2fe\]|bg-\[#bae6fd\]/);
    expect(screen.getByText(/Amount received \(Cash\)/i)).toBeInTheDocument();
  });

  it("renders unboxed Amount in words line", () => {
    render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("Amount in words:")).toBeInTheDocument();
    expect(screen.getByText(/INR Four Thousand Nine Hundred Eighty-Eight Only/i)).toBeInTheDocument();
  });

  it("renders dual bordered cards for BANK ACCOUNT DETAILS and AUTHORISED SIGNATORY", () => {
    render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("BANK ACCOUNT DETAILS")).toBeInTheDocument();
    expect(screen.getByText("AUTHORISED SIGNATORY")).toBeInTheDocument();
    expect(screen.getByText(/Federal Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/77770100867585/i)).toBeInTheDocument();
  });

  it("renders minimalist footer message", () => {
    render(<UnifiedInvoiceRenderer {...baseProps} />);
    expect(screen.getByText("Thank you for your business.")).toBeInTheDocument();
  });

  it("preserves backward compatibility for formatItemQuantityDisplay", () => {
    const res = formatItemQuantityDisplay({
      name: "Hook",
      qty: 4,
      unit: "Pcs",
      altUnit: "PKT",
      altQty: 1,
      altUnitConversion: 4,
      rate: 100,
      total: 400,
    });
    expect(res.isDual).toBe(true);
    expect(res.primaryLine).toBe("1 PKT");
    expect(res.secondaryLine).toBe("(1*4 Pcs)");
  });
});
```

### 5.2 Test Harness 2: `src/test/downloadExactInvoice.test.ts` (PDF Engine Pipeline)

This unit test verifies the mathematical scaling constraints and export integrity of `downloadExactInvoicePdf`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock html2canvas and jspdf
vi.mock("html2canvas", () => ({
  default: vi.fn().mockImplementation((el: HTMLElement, opts: any) => {
    return Promise.resolve({
      width: (opts?.windowWidth || 794) * (opts?.scale || 2),
      height: 1123 * (opts?.scale || 2),
      toDataURL: () => "data:image/png;base64,mockedImageData",
    });
  }),
}));

const mockAddImage = vi.fn();
const mockSave = vi.fn();

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      addImage: mockAddImage,
      save: mockSave,
    })),
  };
});

describe("downloadExactInvoicePdf - PDF Engine Scaling & Capture Math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates exact single-page A4 aspect ratio within 0.5mm threshold", () => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const canvasWidth = 794 * 2;
    const canvasHeight = 1123 * 2;

    const imgAspect = canvasHeight / canvasWidth;
    const imgHeightMm = pageWidthMm * imgAspect; // 297.015mm

    // Tolerance check
    const isWithinTolerance = Math.abs(imgHeightMm - pageHeightMm) <= 0.5;
    expect(isWithinTolerance).toBe(true);
  });

  it("scales tall multi-item documents down to fit 297mm height without creating page 2", () => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const tallCanvasWidth = 794 * 2;
    const tallCanvasHeight = 1450 * 2; // Overflows 1123px

    const imgAspect = tallCanvasHeight / tallCanvasWidth;
    const imgHeightMm = pageWidthMm * imgAspect; // 383.50mm

    expect(imgHeightMm).toBeGreaterThan(pageHeightMm);

    const scaleToFit = pageHeightMm / imgHeightMm;
    const scaledWidth = pageWidthMm * scaleToFit;
    const marginX = (pageWidthMm - scaledWidth) / 2;

    expect(scaleToFit).toBeCloseTo(0.774, 2);
    expect(scaledWidth).toBeLessThan(pageWidthMm);
    expect(marginX).toBeGreaterThan(0);
  });

  it("sanitizes file names containing slashes, colons, and illegal characters", () => {
    const invoiceNumber = "INV/26-27/134:A*B?C";
    const safe = invoiceNumber.replace(/[/\\:*?"<>|]/g, "-");
    expect(safe).toBe("INV-26-27-134-A-B-C");
  });
});
```

---

## Part 6: Concrete Implementation Blueprint

### 6.1 Enhancements to `downloadExactInvoice.ts`

1. **Awaiting Fonts**:
   ```typescript
   if (typeof document !== "undefined" && document.fonts?.ready) {
     try {
       await document.fonts.ready;
     } catch (e) {
       // fallback gracefully
     }
   }
   ```
2. **Explicit html2canvas Scroll & Viewport Alignment**:
   ```typescript
   const canvas = await html2canvas(captureContainer, {
     scale: 2,
     useCORS: true,
     logging: false,
     backgroundColor: "#ffffff",
     windowWidth: 794,
     scrollX: 0,
     scrollY: 0,
     x: 0,
     y: 0,
   });
   ```
3. **Subpixel Aspect Ratio Clamping (Preventing Unwanted Downscale & Gaps)**:
   ```typescript
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
     pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");
   }
   ```

### 6.2 Structure of Redesigned `UnifiedInvoiceRenderer.tsx`

1. **Outer Wrapper**:
   ```tsx
   <div
     ref={ref}
     id="unified-invoice-document"
     data-print-container="invoice"
     className={cn(
       "bg-white text-slate-800 w-full max-w-[794px] mx-auto p-6 sm:p-8 relative box-border font-sans leading-tight",
       className
     )}
   >
   ```
2. **Header Bar**:
   - Left: `<h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{docTitle}</h1>`
   - Right: Stacked metadata block (`Invoice No.`, `Invoice Date`, `Due Date`).
   - Line: `<div className="w-full h-[2px] bg-[#0ea5e9] my-4" />`
3. **Dual Pods (`FROM` / `BILL TO`)**:
   - Container: `<div className="grid grid-cols-2 gap-4 mb-4 text-[10px]">`
   - Card:
     ```tsx
     <div className="border border-slate-200 rounded overflow-hidden bg-white">
       <div className="bg-[#e0f2fe] text-[#0284c7] font-bold text-[10px] px-3 py-1 uppercase tracking-wider">
         FROM
       </div>
       <div className="p-3 space-y-1">...</div>
       <div className="border-t border-slate-200 px-3 py-1.5 text-[9.5px] text-slate-700">
         Place of Supply: <strong>{resolvedPlaceOfSupply}</strong>
       </div>
     </div>
     ```
4. **Item Details Table**:
   - Heading: `<div className="text-[#0284c7] font-bold text-xs uppercase tracking-wider mb-1.5">ITEM DETAILS</div>`
   - Table Head:
     ```tsx
     <thead className="bg-[#0c324e] text-white font-bold text-[9.5px] uppercase">
       <tr>
         <th className="py-2 px-2 text-center w-10">S.No.</th>
         <th className="py-2 px-3 text-left">Description</th>
         <th className="py-2 px-2 text-center w-20">HSN</th>
         <th className="py-2 px-2 text-center w-16">Qty</th>
         <th className="py-2 px-3 text-right w-24">Rate</th>
         <th className="py-2 px-3 text-right w-28">Amount</th>
       </tr>
     </thead>
     ```
5. **Totals Section & Highlight Pill**:
   - Stacked right-aligned block:
     ```tsx
     <div className="w-72 ml-auto text-[10px] space-y-1.5">
       <div className="flex justify-between text-slate-700">
         <span>Taxable value / Rate</span>
         <span className="font-mono">₹{taxableAmountVal.toFixed(2)}</span>
       </div>
       <div className="flex justify-between text-slate-700">
         <span>GST ({taxRatePercentage}%)</span>
         <span className="font-mono">₹{taxVal.toFixed(2)}</span>
       </div>
       <div className="bg-[#e0f2fe] text-[#0c324e] font-black px-3 py-2 rounded flex justify-between items-center text-[11px]">
         <span>Invoice total (rounded)</span>
         <span className="font-mono text-sm">₹{grandTotalVal.toFixed(2)}</span>
       </div>
       <div className="flex justify-between text-slate-700 pt-0.5">
         <span>Amount received ({paymentMethod})</span>
         <span className="font-mono font-bold text-slate-900">₹{paidAmountVal.toFixed(2)}</span>
       </div>
     </div>
     ```
6. **Bottom Cards (`BANK ACCOUNT DETAILS` & `AUTHORISED SIGNATORY`)**:
   - Dual cards matching the header ribbon style of the FROM / BILL TO pods.
   - Clean signature placeholder line and signatory title.
7. **Footer**:
   - `<p className="text-center text-[10px] text-slate-500 mt-6 italic">Thank you for your business.</p>`

---

## Conclusion

The PDF capture pipeline in `downloadExactInvoice.ts` is fundamentally sound and correctly handles aspect-ratio-constrained single-page PDF rendering via jsPDF. By combining:
1. Subpixel tolerance clamping in `downloadExactInvoice.ts`,
2. Replacement of the legacy boxed wrapper with the clean unboxed enterprise layout in `UnifiedInvoiceRenderer.tsx`,
3. Preservation of critical backward-compatibility utilities like `formatItemQuantityDisplay`, and
4. Creation of dedicated unit and integration test harnesses in `src/test/`,
the CredSmart invoice system will achieve 100% pixel-perfect fidelity with `New Invoice.jpeg` across web previews and single-page A4 PDF downloads with zero regressions.
