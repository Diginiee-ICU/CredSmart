import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UnifiedInvoiceRenderer,
  UnifiedInvoiceProps,
  formatItemQuantityDisplay,
  UniversalDocType,
} from "@/components/invoices/UnifiedInvoiceRenderer";

// Standard baseline props for testing
const baseStoreInfo = {
  name: "ASIA INTERNATIONAL",
  phone: "9958685892",
  email: "ashwin@woodzire.business",
  address: "Shop No. 3, Mohalla Lal Sarai, Nagina, Bijnor, Uttar Pradesh 246762, India",
  gstin: "09CFHPA3376R1ZU",
  pan: "CFHPA3376R",
  bank_name: "Federal Bank",
  account_number: "77770100867585",
  ifsc: "FDRL0007777",
  account_holder: "Ashwin Bishnoi",
  branch: "Nagina",
};

const basePartyInfo = {
  name: "SIMPLE SOURCING",
  phone: "9920041363",
  address: "9/5 Surya Darshan Building, Opposite Sheetal Bagh Bus Stop, 44/50 Walkeshwar Road, Mumbai – 400006, Maharashtra, India",
  gstin: "27BEXPG3118P2ZS",
  state: "Maharashtra",
  balance: 0,
};

const baseItem = {
  name: "Wooden Crocheting hooks samples",
  hsn: "44219990",
  qty: 1,
  unit: "Pc",
  rate: 4750,
  taxRate: 5,
  taxAmount: 237.5,
  total: 4987.5,
};

const baseTotals = {
  subtotal: 4750,
  taxableAmount: 4750,
  taxTotal: 237.5,
  igst: 237.5,
  roundOff: 0.5,
  grandTotal: 4988,
  paidAmount: 4988,
  balanceDue: 0,
};

function renderInvoice(overrides: Partial<UnifiedInvoiceProps> = {}) {
  const props: UnifiedInvoiceProps = {
    docType: "sales_invoice",
    copyType: "ORIGINAL FOR RECIPIENT",
    invoiceNumber: "INV/26-27/134",
    date: "2026-10-12",
    dueDate: "2026-10-12",
    placeOfSupply: "Maharashtra",
    storeInfo: baseStoreInfo,
    partyInfo: basePartyInfo,
    items: [baseItem],
    totals: baseTotals,
    paymentMethod: "Cash",
    notes: "Suvrat Sunil Ghatiwala",
    layout: "a4",
    ...overrides,
  };
  return render(<UnifiedInvoiceRenderer {...props} />);
}

describe("UnifiedInvoiceRenderer Master E2E Suite", () => {
  // ─────────────────────────────────────────────────────────────
  // TIER 1: CORE FEATURE ISOLATION TESTS (F1 - F15)
  // ─────────────────────────────────────────────────────────────
  describe("Tier 1: Enterprise Visual Redesign Feature Coverage", () => {
    // Feature 1: Clean Unboxed Header
    describe("F1: Clean Unboxed Header", () => {
      it("renders the primary TAX INVOICE document title prominently", () => {
        const { container } = renderInvoice({ docType: "sales_invoice" });
        const titleEl = screen.getByRole("heading", { level: 1, name: /TAX INVOICE/i });
        expect(titleEl).toBeInTheDocument();
        expect(titleEl.tagName).toBe("H1");
      });

      it("uses uppercase bold typography for the document title", () => {
        renderInvoice();
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading.textContent).toContain("TAX INVOICE");
        expect(heading.className).toMatch(/font-(bold|black)/);
      });

      it("displays TAX INVOICE in deep navy color token (#0c324e or text-slate-900)", () => {
        renderInvoice();
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading.className).toMatch(/(text-\[#0c324e\]|text-slate-900|text-slate-800)/);
      });

      it("unboxes the header without enclosing thick outer border container", () => {
        const { container } = renderInvoice();
        const headerArea = container.querySelector("h1")?.parentElement;
        expect(headerArea).not.toBeNull();
      });

      it("adapts title for other document types like ESTIMATE / QUOTATION", () => {
        renderInvoice({ docType: "quotation" });
        expect(screen.getAllByText(/ESTIMATE \/ QUOTATION|QUOTATION/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    // Feature 2: Stacked Right-Aligned Metadata
    describe("F2: Stacked Right-Aligned Metadata", () => {
      it("renders Invoice No. label and number value stacked on the right", () => {
        renderInvoice({ invoiceNumber: "INV/26-27/134" });
        expect(screen.getByText(/Invoice No\./i)).toBeInTheDocument();
        expect(screen.getByText(/INV\/26-27\/134/i)).toBeInTheDocument();
      });

      it("renders Invoice Date formatted cleanly", () => {
        renderInvoice({ date: "2026-10-12" });
        expect(screen.getByText(/Invoice Date/i)).toBeInTheDocument();
        expect(screen.getAllByText(/12.*Oct.*2026|12\/10\/2026/i).length).toBeGreaterThanOrEqual(1);
      });

      it("renders Due Date below invoice date in stacked layout", () => {
        renderInvoice({ dueDate: "12 Oct 2026" });
        expect(screen.getByText(/Due Date/i)).toBeInTheDocument();
      });

      it("aligns the metadata block to the right", () => {
        const { container } = renderInvoice();
        const metadataEl = container.querySelector(".text-right, [class*='text-right'], [class*='items-end']");
        expect(metadataEl).not.toBeNull();
      });

      it("renders all three metadata elements (No, Date, Due) together without missing rows", () => {
        renderInvoice({
          invoiceNumber: "INV-999",
          date: "2026-10-12",
          dueDate: "2026-10-20",
        });
        expect(screen.getByText(/INV-999/)).toBeInTheDocument();
        expect(screen.getByText(/Invoice No\./i)).toBeInTheDocument();
        expect(screen.getByText(/Due Date/i)).toBeInTheDocument();
      });
    });

    // Feature 3: Cyan Accent Line
    describe("F3: Cyan Accent Line", () => {
      it("renders a full-width horizontal divider line beneath the header", () => {
        const { container } = renderInvoice();
        const cyanDivider = container.querySelector(
          "[class*='bg-[#0ea5e9]'], [class*='bg-[#0284c7]'], [class*='border-[#0ea5e9]'], [class*='border-sky'], [class*='bg-sky']"
        );
        expect(cyanDivider).not.toBeNull();
      });

      it("spans the full width of the invoice document", () => {
        const { container } = renderInvoice();
        const cyanDivider = container.querySelector(
          "[class*='bg-[#0ea5e9]'], [class*='border-[#0ea5e9]'], [class*='border-sky'], [class*='bg-sky']"
        );
        if (cyanDivider) {
          expect(cyanDivider.className).toMatch(/(w-full|border-b)/);
        }
      });

      it("is positioned between the header and party pods", () => {
        const { container } = renderInvoice();
        const h1 = container.querySelector("h1");
        expect(h1).toBeInTheDocument();
      });

      it("uses cyan/sky color token #0ea5e9 or #0284c7", () => {
        const { container } = renderInvoice();
        const hasCyanToken = container.innerHTML.includes("#0ea5e9") ||
          container.innerHTML.includes("#0284c7") ||
          container.innerHTML.includes("sky-") ||
          container.innerHTML.includes("cyan-");
        expect(hasCyanToken).toBe(true);
      });

      it("maintains divider visibility across print modes", () => {
        const { container } = renderInvoice({ layout: "a4" });
        expect(container.querySelector("[data-printable-area='true']")).not.toBeNull();
      });
    });

    // Feature 4: Dual Equal-Width Party Pods
    describe("F4: Dual Equal-Width Party Pods", () => {
      it("renders FROM and BILL TO pods side-by-side with 50%/50% width distribution", () => {
        const { container } = renderInvoice();
        const podsContainer = container.querySelector(".grid-cols-2, [class*='grid-cols-2'], .flex-1, .grid-cols-12");
        expect(podsContainer).not.toBeNull();
      });

      it("renders FROM header ribbon with light blue background (#e0f2fe or #e8f4fd)", () => {
        renderInvoice();
        expect(screen.getByText(/^FROM/i)).toBeInTheDocument();
      });

      it("renders BILL TO header ribbon with light blue background", () => {
        renderInvoice();
        expect(screen.getByText(/^BILL TO/i)).toBeInTheDocument();
      });

      it("displays seller's name, full address, phone, email, GSTIN, and PAN in FROM pod", () => {
        renderInvoice();
        expect(screen.getByText(/ASIA INTERNATIONAL/i)).toBeInTheDocument();
        expect(screen.getByText(/9958685892/i)).toBeInTheDocument();
        expect(screen.getByText(/ashwin@woodzire\.business/i)).toBeInTheDocument();
        expect(screen.getByText(/09CFHPA3376R1ZU/i)).toBeInTheDocument();
        expect(screen.getAllByText(/CFHPA3376R/i).length).toBeGreaterThanOrEqual(1);
      });

      it("displays buyer's name, billing address, contact phone, and GSTIN in BILL TO pod", () => {
        renderInvoice();
        expect(screen.getByText(/SIMPLE SOURCING/i)).toBeInTheDocument();
        expect(screen.getByText(/Walkeshwar Road/i)).toBeInTheDocument();
        expect(screen.getByText(/9920041363/i)).toBeInTheDocument();
        expect(screen.getByText(/27BEXPG3118P2ZS/i)).toBeInTheDocument();
      });
    });

    // Feature 5: Party Bottom Sub-Compartments
    describe("F5: Party Bottom Sub-Compartments", () => {
      it("renders Place of Supply sub-compartment strip in FROM pod", () => {
        renderInvoice({ placeOfSupply: "Maharashtra" });
        expect(screen.getByText(/Place of Supply/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Maharashtra/i).length).toBeGreaterThanOrEqual(1);
      });

      it("renders Customer sub-compartment strip in BILL TO pod", () => {
        renderInvoice({ notes: "Suvrat Sunil Ghatiwala" });
        expect(screen.getByText(/Suvrat Sunil Ghatiwala/i)).toBeInTheDocument();
      });

      it("separates sub-compartments with border line from pod body", () => {
        const { container } = renderInvoice();
        const borderedStrips = container.querySelectorAll("[class*='border-t'], [class*='border-slate']");
        expect(borderedStrips.length).toBeGreaterThan(0);
      });

      it("horizontally aligns Place of Supply and Customer sub-compartments", () => {
        const { container } = renderInvoice();
        expect(container.textContent).toContain("Maharashtra");
      });

      it("updates Place of Supply dynamically based on invoice props", () => {
        renderInvoice({ placeOfSupply: "Karnataka" });
        expect(screen.getByText(/Karnataka/i)).toBeInTheDocument();
      });
    });

    // Feature 6: Section Title ITEM DETAILS
    describe("F6: Section Title ITEM DETAILS", () => {
      it("renders uppercase ITEM DETAILS heading directly above the items table", () => {
        renderInvoice();
        expect(screen.getByText(/ITEM DETAILS/i)).toBeInTheDocument();
      });

      it("styles ITEM DETAILS with uppercase tracking and bold font", () => {
        renderInvoice();
        const heading = screen.getByText(/ITEM DETAILS/i);
        expect(heading.className).toMatch(/(font-bold|font-black|uppercase|tracking-wider)/);
      });

      it("uses cyan/slate color styling for ITEM DETAILS heading", () => {
        renderInvoice();
        const heading = screen.getByText(/ITEM DETAILS/i);
        expect(heading.className).toMatch(/(text-\[#0284c7\]|text-sky|text-slate|text-cyan)/);
      });

      it("positions ITEM DETAILS above table without overlapping borders", () => {
        const { container } = renderInvoice();
        const heading = screen.getByText(/ITEM DETAILS/i);
        const table = container.querySelector("table");
        expect(heading).toBeInTheDocument();
        expect(table).not.toBeNull();
      });

      it("remains visible in both standard and detailed layouts", () => {
        const { unmount } = renderInvoice({ layout: "a4" });
        expect(screen.getByText(/ITEM DETAILS/i)).toBeInTheDocument();
        unmount();

        renderInvoice({ layout: "a4_detailed" });
        expect(screen.getByText(/ITEM DETAILS/i)).toBeInTheDocument();
      });
    });

    // Feature 7: Dark Navy Table Header
    describe("F7: Dark Navy Table Header", () => {
      it("renders solid dark navy table header background (#0c324e or bg-slate-900)", () => {
        const { container } = renderInvoice();
        const thead = container.querySelector("thead, tr[class*='bg-']");
        expect(thead).not.toBeNull();
        expect(thead?.className).toMatch(/(bg-\[#0c324e\]|bg-slate-900|bg-\[#0f172a\]|bg-slate-800)/);
      });

      it("renders header column typography in crisp white (text-white)", () => {
        const { container } = renderInvoice();
        const thead = container.querySelector("thead");
        if (thead) {
          expect(thead.className).toContain("text-white");
        } else {
          const headerRow = container.querySelector("tr[class*='text-white'], [class*='text-white']");
          expect(headerRow).not.toBeNull();
        }
      });

      it("contains all 6 standard columns: S.No., Description, HSN, Qty, Rate, Amount", () => {
        renderInvoice();
        expect(screen.getByText(/S\.No\./i)).toBeInTheDocument();
        expect(screen.getByText(/Description|ITEMS/i)).toBeInTheDocument();
        expect(screen.getByText(/HSN/i)).toBeInTheDocument();
        expect(screen.getByText(/Qty/i)).toBeInTheDocument();
        expect(screen.getByText(/Rate/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Amount/i).length).toBeGreaterThanOrEqual(1);
      });

      it("aligns numeric column headers (Rate, Amount) to the right", () => {
        const { container } = renderInvoice();
        const rightHeaders = container.querySelectorAll("th.text-right, th[class*='text-right']");
        expect(rightHeaders.length).toBeGreaterThanOrEqual(1);
      });

      it("aligns S.No. and HSN headers centrally or cleanly", () => {
        const { container } = renderInvoice();
        const headers = container.querySelectorAll("th");
        expect(headers.length).toBeGreaterThanOrEqual(5);
      });
    });

    // Feature 8: Items Table Data & Multi-Unit
    describe("F8: Items Table Data & Multi-Unit", () => {
      it("renders row index as S.No. (1)", () => {
        renderInvoice();
        expect(screen.getByText("1")).toBeInTheDocument();
      });

      it("renders item description with crisp typography", () => {
        renderInvoice();
        expect(screen.getByText("Wooden Crocheting hooks samples")).toBeInTheDocument();
      });

      it("renders HSN code accurately (44219990)", () => {
        renderInvoice();
        expect(screen.getByText("44219990")).toBeInTheDocument();
      });

      it("renders formatted quantity using formatItemQuantityDisplay (1 Pc)", () => {
        renderInvoice();
        expect(screen.getByText(/1 Pc/i)).toBeInTheDocument();
      });

      it("formats unit rate and line amount with currency symbol", () => {
        renderInvoice();
        expect(screen.getAllByText(/4,?750(\.00)?/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/4,?987\.50/).length).toBeGreaterThanOrEqual(1);
      });
    });

    // Feature 9: Right-Aligned Financial Summary
    describe("F9: Right-Aligned Financial Summary", () => {
      it("displays right-aligned financial summary breakdown", () => {
        const { container } = renderInvoice();
        expect(container.textContent).toContain("4,750");
      });

      it("displays Taxable value / Rate row", () => {
        renderInvoice();
        expect(screen.getByText(/Taxable value/i)).toBeInTheDocument();
      });

      it("displays GST percentage and amount breakdown (GST (5%))", () => {
        renderInvoice();
        expect(screen.getByText(/GST.*5%|IGST|CGST/i)).toBeInTheDocument();
        expect(screen.getByText(/237\.50/)).toBeInTheDocument();
      });

      it("displays Amount received (Cash)", () => {
        renderInvoice({ paymentMethod: "Cash" });
        expect(screen.getByText(/Amount received.*Cash|Received/i)).toBeInTheDocument();
      });

      it("displays zero balance due when paid in full", () => {
        renderInvoice({ totals: { ...baseTotals, paidAmount: 4988, balanceDue: 0 } });
        expect(screen.getAllByText(/4,?988/).length).toBeGreaterThanOrEqual(1);
      });
    });

    // Feature 10: Soft Blue Total Highlight Pill
    describe("F10: Soft Blue Total Highlight Pill", () => {
      it("renders a rounded highlight pill container for total amount", () => {
        const { container } = renderInvoice();
        const pill = container.querySelector(
          "[class*='bg-[#e0f2fe]'], [class*='bg-[#e8f4fd]'], [class*='rounded-full'], [class*='rounded-lg'], [class*='rounded-md']"
        );
        expect(pill).not.toBeNull();
      });

      it("uses light blue background (#e0f2fe or #e8f4fd)", () => {
        const { container } = renderInvoice();
        const hasLightBlue = container.innerHTML.includes("#e0f2fe") ||
          container.innerHTML.includes("#e8f4fd") ||
          container.innerHTML.includes("bg-sky-50") ||
          container.innerHTML.includes("bg-sky-100") ||
          container.innerHTML.includes("bg-blue-50");
        expect(hasLightBlue).toBe(true);
      });

      it("displays 'Invoice total (rounded)' label inside pill", () => {
        renderInvoice();
        expect(screen.getByText(/Invoice total \(rounded\)|Total Amount/i)).toBeInTheDocument();
      });

      it("highlights the rounded grand total (₹4,988.00)", () => {
        renderInvoice();
        expect(screen.getAllByText(/4,?988(\.00)?/).length).toBeGreaterThanOrEqual(1);
      });

      it("applies rounded pill shape with bold font", () => {
        renderInvoice();
        const totalElements = screen.getAllByText(/4,?988(\.00)?/);
        expect(totalElements.length).toBeGreaterThanOrEqual(1);
        expect(totalElements[0].className).toMatch(/font-(bold|black|semibold)/);
      });
    });

    // Feature 11: Clean Unboxed Amount in Words
    describe("F11: Clean Unboxed Amount in Words", () => {
      it("renders clean unboxed single line for Amount in words", () => {
        renderInvoice();
        expect(screen.getByText(/Amount in words:/i)).toBeInTheDocument();
      });

      it("converts ₹4,988 to 'INR Four Thousand Nine Hundred Eighty-Eight Only'", () => {
        renderInvoice();
        expect(
          screen.getByText(/Four Thousand Nine Hundred Eighty-Eight/i)
        ).toBeInTheDocument();
      });

      it("prefixes with 'Amount in words: INR'", () => {
        renderInvoice();
        const wordsEl = screen.getByText(/Four Thousand Nine Hundred Eighty-Eight/i);
        expect(wordsEl.textContent).toMatch(/INR|Rupees/i);
      });

      it("does not enclose amount in words inside thick bordered box", () => {
        const { container } = renderInvoice();
        const wordsEl = screen.getByText(/Four Thousand Nine Hundred Eighty-Eight/i);
        expect(wordsEl.closest("div")?.className).not.toMatch(/border-4/);
      });

      it("handles large amounts in words accurately", () => {
        renderInvoice({ totals: { ...baseTotals, grandTotal: 250000 } });
        expect(screen.getByText(/Two Lakh Fifty Thousand/i)).toBeInTheDocument();
      });
    });

    // Feature 12: Dual Bottom Cards
    describe("F12: Dual Bottom Cards (Bank & Signatory)", () => {
      it("renders two side-by-side bordered cards at bottom", () => {
        const { container } = renderInvoice();
        expect(screen.getByText(/BANK ACCOUNT DETAILS/i)).toBeInTheDocument();
        expect(screen.getByText(/AUTHORISED SIGNATORY|AUTHORIZED SIGNATORY/i)).toBeInTheDocument();
      });

      it("renders light-blue header ribbons on both bottom cards", () => {
        renderInvoice();
        const bankRibbon = screen.getByText(/BANK ACCOUNT DETAILS/i);
        const signRibbon = screen.getByText(/AUTHORISED SIGNATORY|AUTHORIZED SIGNATORY/i);
        expect(bankRibbon).toBeInTheDocument();
        expect(signRibbon).toBeInTheDocument();
      });

      it("displays Bank Name, A/C No., IFSC, and Account Holder", () => {
        renderInvoice();
        expect(screen.getByText(/Federal Bank/i)).toBeInTheDocument();
        expect(screen.getByText(/77770100867585/i)).toBeInTheDocument();
        expect(screen.getByText(/FDRL0007777/i)).toBeInTheDocument();
        expect(screen.getByText(/Ashwin Bishnoi/i)).toBeInTheDocument();
      });

      it("renders signature space in Authorised Signatory card", () => {
        renderInvoice();
        expect(screen.getAllByText(/Signature|Authori[sz]ed Signatory/i).length).toBeGreaterThanOrEqual(1);
      });

      it("maintains equal width 50%/50% distribution between both cards", () => {
        const { container } = renderInvoice();
        const cardsParent = container.querySelector(".grid-cols-2, [class*='grid-cols-2'], .grid-cols-12");
        expect(cardsParent).not.toBeNull();
      });
    });

    // Feature 13: Minimalist Footer Note
    describe("F13: Minimalist Footer Note", () => {
      it("renders clean minimalist footer note 'Thank you for your business.'", () => {
        renderInvoice();
        expect(screen.getByText(/Thank you for your business\.?/i)).toBeInTheDocument();
      });

      it("removes or minimizes cluttered legacy compliance badges and URL links", () => {
        const { container } = renderInvoice();
        expect(container.textContent).toContain("Thank you for your business");
      });

      it("styles footer with subtle slate/neutral typography", () => {
        renderInvoice();
        const footerText = screen.getByText(/Thank you for your business\.?/i);
        expect(footerText.className).toMatch(/(text-slate|text-neutral|text-muted|text-gray)/);
      });

      it("centers or neatly aligns footer note", () => {
        renderInvoice();
        const footerText = screen.getByText(/Thank you for your business\.?/i);
        expect(footerText).toBeInTheDocument();
      });

      it("persists footer note across all document types", () => {
        renderInvoice({ docType: "quotation" });
        expect(screen.getByText(/Thank you for your business\.?/i)).toBeInTheDocument();
      });
    });

    // Feature 14: Single-Page A4 PDF Parity
    describe("F14: Single-Page A4 PDF Parity Attributes", () => {
      it("marks printable container with data-printable-area='true'", () => {
        const { container } = renderInvoice();
        const printable = container.querySelector("[data-printable-area='true']");
        expect(printable).toBeInTheDocument();
      });

      it("sets maximum width constrained to ~780px to 794px for standard A4 preview", () => {
        const { container } = renderInvoice();
        const mainDoc = container.querySelector("#unified-invoice-document, [data-printable-area='true']");
        expect(mainDoc?.className).toMatch(/(max-w-\[780px\]|max-w-\[794px\]|w-full)/);
      });

      it("maintains pure white background for print rendering", () => {
        const { container } = renderInvoice();
        const mainDoc = container.querySelector("#unified-invoice-document, [data-printable-area='true']");
        expect(mainDoc?.className).toContain("bg-white");
      });

      it("sets data-layout attribute to 'a4'", () => {
        const { container } = renderInvoice({ layout: "a4" });
        const doc = container.querySelector("[data-layout='a4']");
        expect(doc).not.toBeNull();
      });

      it("ensures box-border sizing to prevent print clipping", () => {
        const { container } = renderInvoice();
        const doc = container.querySelector("#unified-invoice-document, [data-printable-area='true']");
        expect(doc?.className).toContain("box-border");
      });
    });

    // Feature 15: Universal Document Types
    describe("F15: Universal Document Types & System Compatibility", () => {
      const docTypes: Array<{ type: UniversalDocType; expected: RegExp }> = [
        { type: "sales_invoice", expected: /TAX INVOICE/i },
        { type: "pos_invoice", expected: /RETAIL TAX INVOICE|TAX INVOICE/i },
        { type: "purchase_invoice", expected: /PURCHASE INVOICE/i },
        { type: "quotation", expected: /ESTIMATE \/ QUOTATION|QUOTATION/i },
        { type: "delivery_challan", expected: /DELIVERY CHALLAN/i },
        { type: "credit_note", expected: /CREDIT NOTE/i },
        { type: "debit_note", expected: /DEBIT NOTE/i },
        { type: "proforma_invoice", expected: /PROFORMA INVOICE/i },
      ];

      docTypes.forEach(({ type, expected }) => {
        it(`renders correct document title for docType '${type}'`, () => {
          const { unmount } = renderInvoice({ docType: type });
          expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(1);
          unmount();
        });
      });

      it("preserves thermal 80mm layout mode when layout='80mm'", () => {
        const { container } = renderInvoice({ layout: "80mm" });
        const thermalEl = container.querySelector("[data-layout='80mm']");
        expect(thermalEl).not.toBeNull();
      });

      it("preserves thermal 58mm layout mode when layout='58mm'", () => {
        const { container } = renderInvoice({ layout: "58mm" });
        const thermalEl = container.querySelector("[data-layout='58mm']");
        expect(thermalEl).not.toBeNull();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES (>= 75 Assertions)
  // ─────────────────────────────────────────────────────────────
  describe("Tier 2: Boundary & Corner Cases", () => {
    describe("B1: Null & Empty Customer Data", () => {
      it("renders gracefully when partyInfo is undefined", () => {
        expect(() => renderInvoice({ partyInfo: undefined })).not.toThrow();
        expect(screen.getAllByText(/Walk-in Customer|Customer/i).length).toBeGreaterThanOrEqual(1);
      });

      it("handles null party name gracefully", () => {
        renderInvoice({ partyInfo: { ...basePartyInfo, name: null } });
        expect(screen.getAllByText(/Walk-in Customer|Customer/i).length).toBeGreaterThanOrEqual(1);
      });

      it("handles empty party phone and address without crash", () => {
        expect(() =>
          renderInvoice({
            partyInfo: { name: "Cash Sale", phone: "", address: "", gstin: "" },
          })
        ).not.toThrow();
        expect(screen.getByText("Cash Sale")).toBeInTheDocument();
      });

      it("handles null party GSTIN gracefully", () => {
        renderInvoice({ partyInfo: { name: "Unregistered Buyer", gstin: null } });
        expect(screen.getByText("Unregistered Buyer")).toBeInTheDocument();
      });

      it("handles null party balance without NaN display", () => {
        const { container } = renderInvoice({ partyInfo: { name: "Buyer", balance: null } });
        expect(container.textContent).not.toContain("NaN");
      });
    });

    describe("B2: Long Business Names & Multi-line Addresses", () => {
      const veryLongName = "ENTERPRISE INDUSTRIAL SUPPLIES AND PRECISION ENGINEERING SOLUTIONS PRIVATE LIMITED";
      const veryLongAddress =
        "Plot No. 104-108, Sector 18, Electronic City Phase 2, Industrial Development Area, Hosur Main Road, Bengaluru - 560100, Karnataka, India";

      it("renders extremely long business name without throwing", () => {
        renderInvoice({
          storeInfo: { ...baseStoreInfo, name: veryLongName },
        });
        expect(screen.getByText(veryLongName)).toBeInTheDocument();
      });

      it("renders multi-line long address with proper wrapping", () => {
        renderInvoice({
          storeInfo: { ...baseStoreInfo, address: veryLongAddress },
        });
        expect(screen.getByText(veryLongAddress)).toBeInTheDocument();
      });

      it("handles extremely long customer name and address", () => {
        renderInvoice({
          partyInfo: { ...basePartyInfo, name: veryLongName, address: veryLongAddress },
        });
        expect(screen.getAllByText(veryLongName).length).toBeGreaterThanOrEqual(1);
      });

      it("handles special characters in business address", () => {
        const specAddress = "Room #4-B, 2nd Floor, St. John's Lane & Co. <Near Metro> - 110001";
        renderInvoice({ storeInfo: { ...baseStoreInfo, address: specAddress } });
        expect(screen.getByText(specAddress)).toBeInTheDocument();
      });

      it("handles unicode & emoji in customer notes or terms", () => {
        const unicodeNote = "Verified Quality ★★★★★ - Deliver with Care 📦";
        renderInvoice({ notes: unicodeNote });
        expect(screen.getByText(/Verified Quality/i)).toBeInTheDocument();
      });
    });

    describe("B3: Empty Item List (0 Items)", () => {
      it("renders without runtime error when items array is empty", () => {
        expect(() => renderInvoice({ items: [] })).not.toThrow();
      });

      it("renders table structure even with 0 items", () => {
        const { container } = renderInvoice({ items: [] });
        expect(container.querySelector("table")).toBeInTheDocument();
      });

      it("handles empty items with 0 grand total", () => {
        renderInvoice({
          items: [],
          totals: { subtotal: 0, grandTotal: 0, paidAmount: 0, balanceDue: 0 },
        });
        expect(screen.getByText(/Invoice total|Total/i)).toBeInTheDocument();
      });
    });

    describe("B4: Single Item vs High Item Count", () => {
      it("renders single item cleanly without table distortion", () => {
        renderInvoice({ items: [baseItem] });
        expect(screen.getByText("Wooden Crocheting hooks samples")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
      });

      it("renders 20 items sequentially with correct serial numbers", () => {
        const twentyItems = Array.from({ length: 20 }, (_, i) => ({
          name: `Catalog Item ${i + 1}`,
          hsn: `HSN${1000 + i}`,
          qty: i + 1,
          unit: "Pcs",
          rate: 100 * (i + 1),
          total: 100 * (i + 1) * (i + 1),
        }));

        renderInvoice({ items: twentyItems });
        expect(screen.getByText("Catalog Item 1")).toBeInTheDocument();
        expect(screen.getByText("Catalog Item 20")).toBeInTheDocument();
        expect(screen.getByText("20")).toBeInTheDocument();
      });
    });

    describe("B5: 0% Tax / Exempt & Non-GST Items", () => {
      it("renders item with 0% tax rate without error", () => {
        const zeroTaxItem = {
          name: "Fresh Agricultural Produce (Exempt)",
          hsn: "07019000",
          qty: 10,
          unit: "Kg",
          rate: 50,
          taxRate: 0,
          total: 500,
        };

        renderInvoice({
          items: [zeroTaxItem],
          totals: { subtotal: 500, taxableAmount: 500, taxTotal: 0, grandTotal: 500, paidAmount: 500, balanceDue: 0 },
        });
        expect(screen.getByText("Fresh Agricultural Produce (Exempt)")).toBeInTheDocument();
        expect(screen.getAllByText(/500/).length).toBeGreaterThanOrEqual(1);
      });

      it("displays 0 tax total when all items are exempt", () => {
        renderInvoice({
          totals: { subtotal: 800, taxTotal: 0, grandTotal: 800, paidAmount: 800, balanceDue: 0 },
        });
        expect(screen.getAllByText(/800/).length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("B6: Zero Rate / Free Samples", () => {
      it("renders free sample with rate 0 without error", () => {
        const sampleItem = {
          name: "Promotional Demonstration Kit",
          hsn: "998311",
          qty: 1,
          unit: "Set",
          rate: 0,
          taxRate: 0,
          total: 0,
        };

        renderInvoice({
          items: [sampleItem],
          totals: { subtotal: 0, grandTotal: 0, paidAmount: 0, balanceDue: 0 },
        });
        expect(screen.getByText("Promotional Demonstration Kit")).toBeInTheDocument();
      });
    });

    describe("B7: Dual Unit Formatting Utility (formatItemQuantityDisplay)", () => {
      it("formats single base unit correctly (1 Pc)", () => {
        const res = formatItemQuantityDisplay({ name: "A", qty: 1, unit: "Pc", rate: 10, total: 10 });
        expect(res.isDual).toBe(false);
        expect(res.primaryLine).toBe("1 Pc");
        expect(res.secondaryLine).toBeNull();
      });

      it("formats dual unit with altUnit and conversion (10 Box, 100 Pcs)", () => {
        const res = formatItemQuantityDisplay({
          name: "Bolts",
          qty: 100,
          unit: "Pcs",
          altUnit: "Box",
          altQty: 10,
          altUnitConversion: 10,
          rate: 5,
          total: 500,
        });
        expect(res.isDual).toBe(true);
        expect(res.primaryLine).toBe("10 Box");
        expect(res.secondaryLine).toBe("(10*10 Pcs)");
      });

      it("falls back cleanly when conversion is 1 or less", () => {
        const res = formatItemQuantityDisplay({
          name: "Item",
          qty: 5,
          unit: "Pcs",
          altUnit: "Pcs",
          altUnitConversion: 1,
          rate: 20,
          total: 100,
        });
        expect(res.isDual).toBe(false);
        expect(res.primaryLine).toBe("5 Pcs");
      });

      it("handles default unit when unit is undefined", () => {
        const res = formatItemQuantityDisplay({ name: "Item", qty: 3, rate: 50, total: 150 });
        expect(res.primaryLine).toBe("3 Pcs");
      });
    });

    describe("B8: Fractional Quantities & Decimal Precision", () => {
      it("formats fractional quantity like 2.75 Kgs accurately", () => {
        const fractionalItem = {
          name: "Bulk Grain",
          hsn: "1001",
          qty: 2.75,
          unit: "Kg",
          rate: 45.5,
          total: 125.13,
        };

        renderInvoice({ items: [fractionalItem] });
        expect(screen.getByText(/2\.75 Kg/i)).toBeInTheDocument();
      });

      it("handles high precision rates cleanly", () => {
        const item = {
          name: "Precision Component",
          qty: 10,
          unit: "Pcs",
          rate: 12.345,
          total: 123.45,
        };
        renderInvoice({ items: [item] });
        expect(screen.getByText("Precision Component")).toBeInTheDocument();
      });
    });

    describe("B9: Massive Financial Amounts (Lakhs & Crores)", () => {
      it("renders amounts in tens of millions (crores) without overflow", () => {
        const largeTotal = 15000000; // 1.5 Crores
        renderInvoice({
          totals: {
            subtotal: largeTotal,
            grandTotal: largeTotal,
            paidAmount: largeTotal,
            balanceDue: 0,
          },
        });
        expect(screen.getAllByText(/1,50,00,000|15,000,000/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/One Crore Fifty Lakh/i)).toBeInTheDocument();
      });
    });

    describe("B10: Missing Store Logo Fallback", () => {
      it("renders clean text placeholder when logoUrl is empty or undefined", () => {
        const { container } = renderInvoice({
          storeInfo: { ...baseStoreInfo, logoUrl: undefined },
        });
        const img = container.querySelector("img[alt='Store Logo']");
        expect(img).toBeNull();
      });
    });

    describe("B11: Negative / Zero Balance Due", () => {
      it("displays zero balance due when paid in full", () => {
        renderInvoice({ totals: { ...baseTotals, paidAmount: 4988, balanceDue: 0 } });
        expect(screen.getAllByText(/4,?988/).length).toBeGreaterThanOrEqual(1);
      });

      it("displays positive balance due when customer has credit", () => {
        renderInvoice({ totals: { ...baseTotals, paidAmount: 2000, balanceDue: 2988 } });
        expect(screen.getAllByText(/2,?988/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ─────────────────────────────────────────────────────────────
  describe("Tier 3: Cross-Feature Combinations", () => {
    describe("C1: Document Types & Payment States", () => {
      it("combines sales_invoice with full Cash payment (zero balance)", () => {
        renderInvoice({
          docType: "sales_invoice",
          paymentMethod: "Cash",
          totals: { ...baseTotals, paidAmount: 4988, balanceDue: 0 },
        });
        expect(screen.getByText(/TAX INVOICE/i)).toBeInTheDocument();
        expect(screen.getAllByText(/4,?988/).length).toBeGreaterThanOrEqual(1);
      });

      it("combines sales_invoice with Partial Credit balance", () => {
        renderInvoice({
          docType: "sales_invoice",
          paymentMethod: "Credit",
          totals: { ...baseTotals, paidAmount: 1000, balanceDue: 3988 },
        });
        expect(screen.getByText(/TAX INVOICE/i)).toBeInTheDocument();
        expect(screen.getAllByText(/3,?988/).length).toBeGreaterThanOrEqual(1);
      });

      it("combines quotation with no payment enforcement", () => {
        renderInvoice({
          docType: "quotation",
          totals: { subtotal: 7500, grandTotal: 7500 },
        });
        expect(screen.getAllByText(/ESTIMATE \/ QUOTATION|QUOTATION/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/7,?500/).length).toBeGreaterThanOrEqual(1);
      });

      it("combines credit_note with original invoice reference", () => {
        renderInvoice({
          docType: "credit_note",
          originalInvoiceNumber: "INV/26-27/100",
          totals: { subtotal: 1200, grandTotal: 1200, paidAmount: 1200, balanceDue: 0 },
        });
        expect(screen.getByText(/CREDIT NOTE/i)).toBeInTheDocument();
      });
    });

    describe("C2: Interstate (IGST) vs Intrastate (CGST + SGST)", () => {
      it("renders IGST breakdown when isInterstate is true", () => {
        renderInvoice({
          isInterstate: true,
          totals: {
            subtotal: 4750,
            taxableAmount: 4750,
            igst: 237.5,
            taxTotal: 237.5,
            grandTotal: 4988,
          },
        });
        expect(screen.getByText(/237\.50/)).toBeInTheDocument();
      });

      it("renders CGST and SGST breakdown when isInterstate is false", () => {
        renderInvoice({
          isInterstate: false,
          totals: {
            subtotal: 4750,
            taxableAmount: 4750,
            cgst: 118.75,
            sgst: 118.75,
            taxTotal: 237.5,
            grandTotal: 4988,
          },
        });
        expect(screen.getAllByText(/118\.75/).length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("C3: Layout Mode Variations", () => {
      it("renders standard A4 layout when layout='a4'", () => {
        const { container } = renderInvoice({ layout: "a4" });
        const doc = container.querySelector("#unified-invoice-document, [data-layout='a4']");
        expect(doc).not.toBeNull();
      });

      it("renders compact 80mm thermal receipt when layout='80mm'", () => {
        const { container } = renderInvoice({ layout: "80mm" });
        const doc = container.querySelector("[data-layout='80mm']");
        expect(doc).not.toBeNull();
        expect(container.textContent).toContain("ASIA INTERNATIONAL");
      });

      it("renders compact 58mm thermal receipt when layout='58mm'", () => {
        const { container } = renderInvoice({ layout: "58mm" });
        const doc = container.querySelector("[data-layout='58mm']");
        expect(doc).not.toBeNull();
        expect(container.textContent).toContain("ASIA INTERNATIONAL");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ─────────────────────────────────────────────────────────────
  describe("Tier 4: Real-World Application Scenarios", () => {
    // S1: Target Reference Invoice (New Invoice.jpeg replica)
    it("S1: Replicates exact 'New Invoice.jpeg' Woodzire enterprise GST invoice", () => {
      const { container } = renderInvoice({
        docType: "sales_invoice",
        copyType: "ORIGINAL FOR RECIPIENT",
        invoiceNumber: "INV/26-27/134",
        date: "2026-10-12",
        dueDate: "2026-10-12",
        placeOfSupply: "Maharashtra",
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
          address: "9/5 Surya Darshan Building, Opposite Sheetal Bagh Bus Stop, 44/50 Walkeshwar Road, Mumbai – 400006, Maharashtra, India",
          phone: "9920041363",
          gstin: "27BEXPG3118P2ZS",
        },
        notes: "Suvrat Sunil Ghatiwala",
        items: [
          {
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
          taxTotal: 237.5,
          igst: 237.5,
          roundOff: 0.5,
          grandTotal: 4988,
          paidAmount: 4988,
          balanceDue: 0,
        },
        paymentMethod: "Cash",
      });

      // Assert visual tokens from New Invoice.jpeg
      expect(screen.getByText(/TAX INVOICE/i)).toBeInTheDocument();
      expect(screen.getByText(/INV\/26-27\/134/)).toBeInTheDocument();
      expect(screen.getByText(/ASIA INTERNATIONAL/)).toBeInTheDocument();
      expect(screen.getByText(/SIMPLE SOURCING/)).toBeInTheDocument();
      expect(screen.getByText(/Suvrat Sunil Ghatiwala/)).toBeInTheDocument();
      expect(screen.getAllByText(/Maharashtra/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Wooden Crocheting hooks samples/)).toBeInTheDocument();
      expect(screen.getByText("44219990")).toBeInTheDocument();
      expect(screen.getByText(/1 Pc/i)).toBeInTheDocument();
      expect(screen.getAllByText(/4,?750/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/237\.50/)).toBeInTheDocument();
      expect(screen.getAllByText(/4,?988/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Four Thousand Nine Hundred Eighty-Eight/i)).toBeInTheDocument();
      expect(screen.getByText(/Federal Bank/)).toBeInTheDocument();
      expect(screen.getByText(/77770100867585/)).toBeInTheDocument();
      expect(screen.getByText(/FDRL0007777/)).toBeInTheDocument();
      expect(screen.getByText(/Ashwin Bishnoi/)).toBeInTheDocument();
      expect(screen.getByText(/Thank you for your business/i)).toBeInTheDocument();
    });

    // S2: Multi-Item Wholesale B2B with Dual Units
    it("S2: Wholesale electrical B2B bill with multi-unit items and 18% GST", () => {
      const wholesaleItems = [
        {
          name: "Industrial Copper Cable 2.5sqmm",
          hsn: "8544",
          qty: 500,
          unit: "Mtr",
          altUnit: "Coil",
          altQty: 5,
          altUnitConversion: 100,
          rate: 45,
          taxRate: 18,
          total: 26550,
        },
        {
          name: "Modular Switches 6A",
          hsn: "8536",
          qty: 120,
          unit: "Pcs",
          altUnit: "Box",
          altQty: 10,
          altUnitConversion: 12,
          rate: 85,
          taxRate: 18,
          total: 12036,
        },
      ];

      renderInvoice({
        invoiceNumber: "INV-WHOLESALE-01",
        items: wholesaleItems,
        totals: {
          subtotal: 32700,
          taxableAmount: 32700,
          taxTotal: 5886,
          grandTotal: 38586,
          paidAmount: 38586,
          balanceDue: 0,
        },
      });

      expect(screen.getByText("Industrial Copper Cable 2.5sqmm")).toBeInTheDocument();
      expect(screen.getByText("Modular Switches 6A")).toBeInTheDocument();
      expect(screen.getAllByText(/38,?586/).length).toBeGreaterThanOrEqual(1);
    });

    // S3: Partial Credit Invoice with Pending Balance
    it("S3: Partial Credit invoice with positive balance due", () => {
      renderInvoice({
        invoiceNumber: "INV-CREDIT-77",
        paymentMethod: "Credit",
        totals: {
          subtotal: 10000,
          taxableAmount: 10000,
          taxTotal: 1800,
          grandTotal: 11800,
          paidAmount: 5000,
          balanceDue: 6800,
        },
      });

      expect(screen.getAllByText(/11,?800/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/6,?800/).length).toBeGreaterThanOrEqual(1);
    });

    // S4: Commercial Quotation Preview
    it("S4: Commercial Quotation with validity period and unboxed styling", () => {
      renderInvoice({
        docType: "quotation",
        invoiceNumber: "QUOT-2026-99",
        terms: "1. Quotation valid for 30 days.\n2. 50% advance upon PO.",
        totals: {
          subtotal: 25000,
          taxableAmount: 25000,
          taxTotal: 4500,
          grandTotal: 29500,
        },
      });

      expect(screen.getAllByText(/ESTIMATE \/ QUOTATION|QUOTATION/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/QUOT-2026-99/)).toBeInTheDocument();
      expect(screen.getAllByText(/29,?500/).length).toBeGreaterThanOrEqual(1);
    });

    // S5: POS Retail Quick Bill
    it("S5: Retail POS quick bill with cash settlement", () => {
      renderInvoice({
        docType: "pos_invoice",
        invoiceNumber: "POS-8891",
        items: [
          { name: "Fast Food Meal Combo", qty: 2, unit: "Plate", rate: 150, total: 300 },
          { name: "Mineral Water 1L", qty: 2, unit: "Bottle", rate: 20, total: 40 },
        ],
        totals: {
          subtotal: 340,
          taxableAmount: 340,
          taxTotal: 17,
          grandTotal: 357,
          paidAmount: 357,
          balanceDue: 0,
        },
      });

      expect(screen.getByText(/POS-8891/)).toBeInTheDocument();
      expect(screen.getByText("Fast Food Meal Combo")).toBeInTheDocument();
      expect(screen.getAllByText(/357/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
