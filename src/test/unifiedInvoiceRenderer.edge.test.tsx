import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UnifiedInvoiceRenderer,
  UnifiedInvoiceProps,
  formatItemQuantityDisplay,
  formatAmountInWords,
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

function renderInvoice(overrides: Partial<UnifiedInvoiceProps> = {}) {
  const props: UnifiedInvoiceProps = {
    docType: "sales_invoice",
    copyType: "ORIGINAL FOR RECIPIENT",
    invoiceNumber: "INV/EDGE/2026",
    date: "2026-10-12",
    dueDate: "2026-10-12",
    placeOfSupply: "Maharashtra",
    storeInfo: baseStoreInfo,
    partyInfo: basePartyInfo,
    items: [
      {
        name: "Standard Test Item",
        hsn: "44219990",
        qty: 1,
        unit: "Pc",
        rate: 1000,
        taxRate: 18,
        taxAmount: 180,
        total: 1180,
      },
    ],
    totals: {
      subtotal: 1000,
      taxableAmount: 1000,
      taxTotal: 180,
      igst: 180,
      grandTotal: 1180,
      paidAmount: 1180,
      balanceDue: 0,
    },
    paymentMethod: "Cash",
    layout: "a4",
    ...overrides,
  };
  return render(<UnifiedInvoiceRenderer {...props} />);
}

describe("UnifiedInvoiceRenderer Adversarial & Edge Case Stress Suite", () => {
  // =========================================================================
  // 1. MULTI-ITEM STRESS TESTING (20+, 50+, 100 Items)
  // =========================================================================
  describe("Stress 1: Large Multi-Item Payloads (20+ to 100 Items)", () => {
    it("renders 25 line items with correct sequential S.No numbering (1 to 25)", () => {
      const items = Array.from({ length: 25 }, (_, idx) => ({
        name: `Wholesale Item #${idx + 1}`,
        hsn: `8471${idx.toString().padStart(4, "0")}`,
        qty: idx + 1,
        unit: "Pcs",
        rate: (idx + 1) * 100,
        taxRate: 18,
        total: (idx + 1) * 100 * 1.18,
      }));

      const subtotal = items.reduce((s, it) => s + it.rate * it.qty, 0);
      const grandTotal = subtotal * 1.18;

      renderInvoice({
        items,
        totals: {
          subtotal,
          taxableAmount: subtotal,
          taxTotal: subtotal * 0.18,
          igst: subtotal * 0.18,
          grandTotal,
          paidAmount: grandTotal,
          balanceDue: 0,
        },
      });

      // Verify first, middle, and last item
      expect(screen.getByText("Wholesale Item #1")).toBeInTheDocument();
      expect(screen.getByText("Wholesale Item #13")).toBeInTheDocument();
      expect(screen.getByText("Wholesale Item #25")).toBeInTheDocument();

      // Verify S.No numbers rendered in table
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("renders 50 line items without crashing or throwing stack overflow", () => {
      const items = Array.from({ length: 50 }, (_, idx) => ({
        name: `Stress Bulk Item ${idx + 1}`,
        qty: 1,
        rate: 50,
        total: 50,
      }));

      expect(() => {
        renderInvoice({
          items,
          totals: {
            subtotal: 2500,
            grandTotal: 2500,
          },
        });
      }).not.toThrow();

      expect(screen.getByText("Stress Bulk Item 1")).toBeInTheDocument();
      expect(screen.getByText("Stress Bulk Item 50")).toBeInTheDocument();
    });

    it("handles 100 line items under detailed layout with statutory summary", () => {
      const items = Array.from({ length: 100 }, (_, idx) => ({
        name: `SKU-${idx + 1}`,
        hsn: idx % 2 === 0 ? "84710001" : "84710002",
        qty: 2,
        rate: 10,
        taxRate: 5,
        total: 21,
      }));

      renderInvoice({
        layout: "a4_detailed",
        items,
        totals: {
          subtotal: 2000,
          grandTotal: 2100,
        },
      });

      expect(screen.getByText("SKU-1")).toBeInTheDocument();
      expect(screen.getByText("SKU-100")).toBeInTheDocument();
      // Ensure HSN summary aggregates the 100 items into 2 unique HSN lines
      expect(screen.getAllByText("84710001").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("84710002").length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 2. LONG TEXT, UNBROKEN STRINGS, UNICODE, SPECIAL CHARS & XSS
  // =========================================================================
  describe("Stress 2: Pathological Text Strings, Overflow & Security Vectors", () => {
    it("safely renders extremely long unbroken string (500 chars) in item name", () => {
      const longUnbrokenName = "A".repeat(500);
      renderInvoice({
        items: [
          {
            name: longUnbrokenName,
            qty: 1,
            rate: 100,
            total: 100,
          },
        ],
      });

      expect(screen.getByText(longUnbrokenName)).toBeInTheDocument();
    });

    it("safely handles 1,000-character description and batch notes", () => {
      const longDescription = ("Detailed specification paragraph: " + "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20)).trim();
      const longBatch = "BATCH-" + "X".repeat(50);
      const longExp = "2029-12-31-SPECIAL-EDITION";

      renderInvoice({
        items: [
          {
            name: "Complex Chemical Compound",
            description: longDescription,
            batchNo: longBatch,
            expDate: longExp,
            qty: 5,
            rate: 200,
            total: 1000,
          },
        ],
      });

      expect(screen.getByText("Complex Chemical Compound")).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(longBatch))).toBeInTheDocument();
    });

    it("safely renders massive seller and buyer addresses (600+ chars)", () => {
      const massiveSellerAddress = "Tower 4, Floor 12, Cyber Gateway, Hitech City, Phase 2, Near Mindspace IT Park, Beside Bio-Diversity Junction, Gachibowli, Hyderabad, Rangareddy District, Telangana, 500081, Republic of India. Landmark: Opposite Durgam Cheruvu Cable Bridge Entrance Gate 3.";
      const massiveBuyerAddress = "Ground Floor & Mezzanine, Heritage Warehouse Compound, Plot No. 88/B, Survey No. 104, Old Industrial Estate, Behind Central Railway Loco Shed, Kurla West, Greater Mumbai Municipal Corporation, Mumbai Suburban District, Maharashtra, 400070, India.";

      renderInvoice({
        storeInfo: {
          ...baseStoreInfo,
          address: massiveSellerAddress,
        },
        partyInfo: {
          ...basePartyInfo,
          address: massiveBuyerAddress,
        },
      });

      expect(screen.getByText(massiveSellerAddress)).toBeInTheDocument();
      expect(screen.getByText(massiveBuyerAddress)).toBeInTheDocument();
    });

    it("safely escapes HTML tags and prevents script injection in party name and notes", () => {
      const xssParty = "<script>alert('pwned')</script>";
      const xssNotes = "<img src=x onerror=alert(1)> & 'quoted' \"double-quoted\"";

      const { container } = renderInvoice({
        partyInfo: {
          ...basePartyInfo,
          name: xssParty,
        },
        notes: xssNotes,
      });

      // Assert text rendered safely as literal text nodes, not executable DOM elements
      expect(container.textContent).toContain(xssParty);
      expect(container.textContent).toContain(xssNotes);
      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img[src='x']")).toBeNull();
    });

    it("renders international Unicode, non-Latin scripts (Devanagari, Chinese), and emojis", () => {
      const hindiItem = "हस्तनिर्मित लकड़ी की नक्काशी (Handcrafted Woodcraft) 🪵✨";
      const chineseParty = "上海贸易有限公司 (Shanghai Trading Co., Ltd.) 🌏";
      const unicodeHsn = "HSN-8471/१२३४";

      renderInvoice({
        partyInfo: {
          ...basePartyInfo,
          name: chineseParty,
        },
        items: [
          {
            name: hindiItem,
            hsn: unicodeHsn,
            qty: 1,
            rate: 2500,
            total: 2500,
          },
        ],
      });

      expect(screen.getByText(hindiItem)).toBeInTheDocument();
      expect(screen.getAllByText(chineseParty).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(unicodeHsn)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. EXTREME MONETARY TOTALS & AMOUNTS (Zero, Crores, Billions, Decimals)
  // =========================================================================
  describe("Stress 3: Extreme Monetary Totals & Indian Currency Formatting", () => {
    it("handles Zero Total invoice (₹0.00) without NaN or crash", () => {
      renderInvoice({
        items: [
          {
            name: "Free Promotional Sample",
            qty: 1,
            rate: 0,
            total: 0,
          },
        ],
        totals: {
          subtotal: 0,
          taxableAmount: 0,
          taxTotal: 0,
          grandTotal: 0,
          paidAmount: 0,
          balanceDue: 0,
        },
      });

      expect(screen.getByText("Free Promotional Sample")).toBeInTheDocument();
      expect(screen.getAllByText(/0\.00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Amount in words:/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero/i)).toBeInTheDocument();
    });

    it("handles Mega Crores total (₹99,99,99,999.50) with Indian numbering format", () => {
      const hugeTotal = 999999999.5;
      renderInvoice({
        totals: {
          subtotal: 999999999.5,
          taxableAmount: 999999999.5,
          grandTotal: hugeTotal,
          paidAmount: hugeTotal,
          balanceDue: 0,
        },
      });

      // Indian numbering format: 99,99,99,999.50
      expect(screen.getAllByText(/99,99,99,999\.50/).length).toBeGreaterThanOrEqual(1);
      // Number to words conversion check
      const words = formatAmountInWords(hugeTotal);
      expect(words).toContain("Crore");
      expect(words).toContain("Paise");
    });

    it("handles Ten Billion (₹10,000,000,000 / 1000 Crores) safely with Overflow fallback", () => {
      const tenBillion = 10000000000;
      renderInvoice({
        totals: {
          subtotal: tenBillion,
          grandTotal: tenBillion,
          paidAmount: 0,
          balanceDue: tenBillion,
        },
      });

      // Must not throw or crash
      expect(screen.getByText(/Amount in words:/i)).toBeInTheDocument();
      // Should show balance due
      expect(screen.getByText(/Balance amount/i)).toBeInTheDocument();
    });

    it("handles negative round-off adjustments and discount totals", () => {
      renderInvoice({
        totals: {
          subtotal: 1000.4,
          taxableAmount: 1000.4,
          discountTotal: 50,
          roundOff: -0.4,
          grandTotal: 950,
          paidAmount: 950,
          balanceDue: 0,
        },
      });

      expect(screen.getByText(/Round Off/i)).toBeInTheDocument();
      expect(screen.getByText(/-₹0\.40/)).toBeInTheDocument();
      expect(screen.getByText(/Discount/i)).toBeInTheDocument();
      expect(screen.getByText(/-₹50\.00/)).toBeInTheDocument();
    });

    it("handles delivery charges added to invoice summary", () => {
      renderInvoice({
        deliveryCharge: 250,
        totals: {
          subtotal: 1000,
          grandTotal: 1250,
          paidAmount: 1250,
          balanceDue: 0,
        },
      });

      expect(screen.getByText(/Delivery Charge/i)).toBeInTheDocument();
      expect(screen.getByText(/₹250\.00/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. ZERO RATES, ZERO QUANTITIES & FRACTIONAL / DECIMAL VALUES
  // =========================================================================
  describe("Stress 4: Zero Rates, Fractional Quantities & Dual Unit Conversions", () => {
    it("handles zero rate items with positive quantity (complimentary gift)", () => {
      renderInvoice({
        items: [
          {
            name: "Complimentary Catalog",
            qty: 5,
            unit: "Pcs",
            rate: 0,
            total: 0,
          },
        ],
      });

      expect(screen.getByText("Complimentary Catalog")).toBeInTheDocument();
      expect(screen.getByText("5 Pcs")).toBeInTheDocument();
      expect(screen.getAllByText("₹0.00").length).toBeGreaterThanOrEqual(1);
    });

    it("handles micro decimal quantities (e.g. 0.005 Grams of Precious Metal)", () => {
      renderInvoice({
        items: [
          {
            name: "24K Fine Gold Wire",
            hsn: "7108",
            qty: 0.005,
            unit: "Gms",
            rate: 7500000,
            total: 37500,
          },
        ],
        totals: {
          subtotal: 37500,
          taxableAmount: 37500,
          grandTotal: 37500,
          paidAmount: 37500,
          balanceDue: 0,
        },
      });

      expect(screen.getByText("24K Fine Gold Wire")).toBeInTheDocument();
      expect(screen.getByText("0.005 Gms")).toBeInTheDocument();
      expect(screen.getAllByText(/37,?500/).length).toBeGreaterThanOrEqual(1);
    });

    it("handles fractional multi-unit conversion accurately", () => {
      const item = {
        name: "Industrial Chemical Solution",
        qty: 25,
        unit: "Ltr",
        altUnit: "Can",
        altQty: 5,
        altUnitConversion: 5,
        rate: 200,
        total: 1000,
      };

      const result = formatItemQuantityDisplay(item);
      expect(result.isDual).toBe(true);
      expect(result.primaryLine).toBe("5 Can");
      expect(result.secondaryLine).toBe("(5*5 Ltr)");

      renderInvoice({ items: [item] });
      expect(screen.getByText("5 Can")).toBeInTheDocument();
      expect(screen.getByText("(5*5 Ltr)")).toBeInTheDocument();
    });

    it("handles dual unit where altQty is undefined and calculates auto-conversion", () => {
      const item = {
        name: "Ceramic Floor Tiles",
        qty: 120,
        unit: "Pcs",
        altUnit: "Box",
        altUnitConversion: 12,
        rate: 50,
        total: 6000,
      };

      const result = formatItemQuantityDisplay(item);
      expect(result.isDual).toBe(true);
      expect(result.primaryLine).toBe("10 Box");
      expect(result.secondaryLine).toBe("(10*12 Pcs)");
    });
  });

  // =========================================================================
  // 5. ALL UNIVERSAL DOC TYPES & TITLE RESOLUTION
  // =========================================================================
  describe("Stress 5: Complete UniversalDocType Variant Matrix", () => {
    const docTypeMatrix: Array<{ type: UniversalDocType; expectedTitle: string }> = [
      { type: "sales_invoice", expectedTitle: "TAX INVOICE" },
      { type: "pos_invoice", expectedTitle: "RETAIL TAX INVOICE" },
      { type: "purchase_invoice", expectedTitle: "PURCHASE INVOICE / BILL" },
      { type: "quotation", expectedTitle: "ESTIMATE / QUOTATION" },
      { type: "delivery_challan", expectedTitle: "DELIVERY CHALLAN" },
      { type: "sales_return", expectedTitle: "CREDIT NOTE / SALES RETURN" },
      { type: "credit_note", expectedTitle: "CREDIT NOTE (SEC 34 CGST ACT)" },
      { type: "debit_note", expectedTitle: "DEBIT NOTE" },
      { type: "proforma_invoice", expectedTitle: "PROFORMA INVOICE" },
      { type: "payment_in", expectedTitle: "RECEIPT VOUCHER" },
      { type: "payment_out", expectedTitle: "PAYMENT VOUCHER" },
    ];

    docTypeMatrix.forEach(({ type, expectedTitle }) => {
      it(`renders document title '${expectedTitle}' for docType '${type}'`, () => {
        renderInvoice({ docType: type });
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading.textContent).toContain(expectedTitle);
      });
    });

    it("falls back gracefully to 'TAX INVOICE' for unrecognized or undefined docType", () => {
      // @ts-expect-error testing invalid runtime docType
      renderInvoice({ docType: "unknown_custom_voucher" });
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toContain("TAX INVOICE");
    });

    it("correctly identifies purchase documents and labels party as Vendor/Supplier", () => {
      renderInvoice({
        docType: "purchase_invoice",
        partyInfo: {
          name: null,
        },
      });

      expect(screen.getAllByText(/Vendor \/ Supplier/).length).toBeGreaterThanOrEqual(1);
    });

    it("displays return metadata (original invoice, return reason) for credit_note", () => {
      renderInvoice({
        docType: "credit_note",
        originalInvoiceNumber: "INV/2026/001",
        originalInvoiceDate: "2026-09-15",
        returnReason: "Damaged during transit",
        settlementMode: "bank_transfer",
      });

      expect(screen.getByText("INV/2026/001")).toBeInTheDocument();
      expect(screen.getByText("2026-09-15")).toBeInTheDocument();
      expect(screen.getByText("Damaged during transit")).toBeInTheDocument();
      expect(screen.getByText(/Bank Transfer/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. MULTI-TAX SLABS & STATUTORY HSN SUMMARY ENGINE
  // =========================================================================
  describe("Stress 6: Multi-Tax Slabs (0%, 5%, 12%, 18%, 28%) & Interstate Rules", () => {
    it("handles multiple items across 5 distinct tax slabs (0%, 5%, 12%, 18%, 28%)", () => {
      const multiSlabItems = [
        { name: "Exempt Agricultural Produce", hsn: "0701", qty: 10, rate: 100, taxRate: 0, total: 1000 },
        { name: "Handicrafts Item", hsn: "4421", qty: 2, rate: 500, taxRate: 5, total: 1050 },
        { name: "Processed Food Pack", hsn: "2106", qty: 4, rate: 250, taxRate: 12, total: 1120 },
        { name: "Electronic Accessories", hsn: "8471", qty: 1, rate: 2000, taxRate: 18, total: 2360 },
        { name: "Luxury Automobile Spares", hsn: "8708", qty: 1, rate: 5000, taxRate: 28, total: 6400 },
      ];

      renderInvoice({
        layout: "a4_detailed",
        showHsnSummary: true,
        items: multiSlabItems,
        totals: {
          subtotal: 10000,
          taxableAmount: 10000,
          taxTotal: 1930,
          igst: 1930,
          grandTotal: 11930,
          paidAmount: 11930,
          balanceDue: 0,
        },
      });

      // Verify all HSN entries are listed in statutory summary table
      expect(screen.getAllByText("0701").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("4421").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("2106").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("8471").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("8708").length).toBeGreaterThanOrEqual(2);
    });

    it("correctly splits tax into CGST (50%) and SGST (50%) for Intrastate transactions", () => {
      renderInvoice({
        isInterstate: false,
        storeInfo: { ...baseStoreInfo, state: "Maharashtra", stateCode: "27" },
        partyInfo: { ...basePartyInfo, state: "Maharashtra", stateCode: "27" },
        totals: {
          subtotal: 1000,
          taxableAmount: 1000,
          cgst: 90,
          sgst: 90,
          taxTotal: 180,
          grandTotal: 1180,
          paidAmount: 1180,
          balanceDue: 0,
        },
      });

      expect(screen.getByText(/CGST/)).toBeInTheDocument();
      expect(screen.getByText(/SGST/)).toBeInTheDocument();
      expect(screen.queryByText(/IGST/)).toBeNull();
    });

    it("correctly assigns 100% tax to IGST for Interstate transactions", () => {
      renderInvoice({
        isInterstate: true,
        storeInfo: { ...baseStoreInfo, state: "Uttar Pradesh", stateCode: "09" },
        partyInfo: { ...basePartyInfo, state: "Maharashtra", stateCode: "27" },
        totals: {
          subtotal: 1000,
          taxableAmount: 1000,
          igst: 180,
          taxTotal: 180,
          grandTotal: 1180,
          paidAmount: 1180,
          balanceDue: 0,
        },
      });

      expect(screen.getByText(/GST \(18%\)|IGST/)).toBeInTheDocument();
      expect(screen.queryByText(/CGST/)).toBeNull();
      expect(screen.queryByText(/SGST/)).toBeNull();
    });
  });

  // =========================================================================
  // 7. MISSING, NULL & CORRUPTED OPTIONAL PROPS
  // =========================================================================
  describe("Stress 7: Missing, Null & Malformed Props Resiliency", () => {
    it("renders cleanly when storeInfo is undefined", () => {
      renderInvoice({
        storeInfo: undefined,
      });

      expect(screen.getAllByText(/CredSmart Store/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Direct bank payment available on request/i)).toBeInTheDocument();
    });

    it("renders cleanly when partyInfo is undefined or completely empty", () => {
      renderInvoice({
        partyInfo: undefined,
      });

      expect(screen.getAllByText(/Walk-in Customer/).length).toBeGreaterThanOrEqual(1);
    });

    it("renders cleanly with empty items array without throwing", () => {
      expect(() => {
        renderInvoice({
          items: [],
          totals: {
            subtotal: 0,
            grandTotal: 0,
          },
        });
      }).not.toThrow();

      expect(screen.getByText(/ITEM DETAILS/)).toBeInTheDocument();
    });

    it("handles completely invalid date strings gracefully without throwing", () => {
      renderInvoice({
        date: "INVALID_DATE_STRING_XYZ",
        dueDate: "INVALID_DUE_DATE",
      });

      expect(screen.getByText("INVALID_DATE_STRING_XYZ")).toBeInTheDocument();
      expect(screen.getByText("INVALID_DUE_DATE")).toBeInTheDocument();
    });

    it("handles Date objects correctly as well as ISO strings", () => {
      const realDate = new Date("2026-05-20T14:30:00Z");
      renderInvoice({
        date: realDate,
      });

      expect(screen.getAllByText(/20.*May.*2026/i).length).toBeGreaterThanOrEqual(1);
    });

    it("handles bankDetails fallback cascade (propBankDetails -> storeInfo -> fallback text)", () => {
      // 1. Explicit propBankDetails takes precedence
      const { rerender } = renderInvoice({
        bankDetails: {
          bankName: "HDFC Bank",
          accountNumber: "999988887777",
          ifsc: "HDFC0001234",
        },
      });
      expect(screen.getByText("HDFC Bank")).toBeInTheDocument();
      expect(screen.getByText("999988887777")).toBeInTheDocument();

      // 2. storeInfo bank fallback
      rerender(
        <UnifiedInvoiceRenderer
          invoiceNumber="INV-1"
          date="2026-10-12"
          items={[]}
          totals={{ subtotal: 0, grandTotal: 0 }}
          storeInfo={{
            bank_name: "ICICI Bank",
            account_number: "111122223333",
            ifsc: "ICIC0000001",
          }}
        />
      );
      expect(screen.getByText("ICICI Bank")).toBeInTheDocument();
      expect(screen.getByText("111122223333")).toBeInTheDocument();

      // 3. Direct bank payment available on request fallback
      rerender(
        <UnifiedInvoiceRenderer
          invoiceNumber="INV-2"
          date="2026-10-12"
          items={[]}
          totals={{ subtotal: 0, grandTotal: 0 }}
          storeInfo={{}}
        />
      );
      expect(screen.getByText(/Direct bank payment available on request/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 8. THERMAL RECEIPT LAYOUTS (80mm & 58mm) ADVERSARIAL STRESS
  // =========================================================================
  describe("Stress 8: Thermal POS Layouts (80mm & 58mm) Under Heavy Stress", () => {
    it("renders 80mm thermal layout with 15 items and dual units", () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        name: `Thermal Item ${i + 1}`,
        qty: (i + 1) * 2,
        unit: "Pcs",
        rate: 50,
        total: (i + 1) * 2 * 50,
      }));

      const { container } = renderInvoice({
        layout: "80mm",
        items,
        totals: {
          subtotal: 2400,
          grandTotal: 2400,
          paidAmount: 2400,
          balanceDue: 0,
        },
      });

      const receipt = container.querySelector("#receipt-printable-area");
      expect(receipt).not.toBeNull();
      expect(screen.getByText("Thermal Item 1")).toBeInTheDocument();
      expect(screen.getByText("Thermal Item 15")).toBeInTheDocument();
      expect(screen.getAllByText("₹2400.00").length).toBeGreaterThanOrEqual(2);
    });

    it("renders 58mm narrow thermal layout with unbroken text and UPI QR code", () => {
      const { container } = renderInvoice({
        layout: "58mm",
        upiId: "merchant@okhdfcbank",
        partyInfo: {
          name: "Dr. Alexander Montgomery-Smith Jr.",
          phone: "9876543210",
        },
        items: [
          {
            name: "VeryLongUnbrokenProductNameWithoutAnySpaceToTestNarrowThermalOverflow12345",
            qty: 1,
            rate: 450,
            total: 450,
          },
        ],
        totals: {
          subtotal: 450,
          grandTotal: 450,
        },
      });

      const receipt = container.querySelector("#receipt-printable-area");
      expect(receipt).not.toBeNull();
      expect(screen.getByText(/Scan & Pay via UPI/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 9. NUMBER TO WORDS ORACLE & BOUNDARY TESTS
  // =========================================================================
  describe("Stress 9: Number-To-Words Standard & Boundary Conditions", () => {
    it("converts single digits, teens, and tens", () => {
      expect(formatAmountInWords(1)).toBe("One");
      expect(formatAmountInWords(15)).toBe("Fifteen");
      expect(formatAmountInWords(45)).toBe("Forty-Five");
      expect(formatAmountInWords(99)).toBe("Ninety-Nine");
    });

    it("converts hundreds, thousands, and lakhs cleanly with hyphens", () => {
      expect(formatAmountInWords(100)).toBe("One Hundred");
      expect(formatAmountInWords(105)).toBe("One Hundred Five");
      expect(formatAmountInWords(1250)).toBe("One Thousand Two Hundred Fifty");
      expect(formatAmountInWords(100000)).toBe("One Lakh");
      expect(formatAmountInWords(588265)).toBe("Five Lakh Eighty-Eight Thousand Two Hundred Sixty-Five");
    });

    it("converts crores accurately", () => {
      expect(formatAmountInWords(10000000)).toBe("One Crore");
      expect(formatAmountInWords(999999999)).toContain("Ninety-Nine Crore");
    });

    it("converts paise (decimals) properly", () => {
      const words = formatAmountInWords(4987.5);
      expect(words).toContain("Four Thousand Nine Hundred Eighty-Seven");
      expect(words).toContain("Fifty Paise");
    });

    it("handles zero, negative, null, and NaN safely", () => {
      expect(formatAmountInWords(0)).toBe("Zero");
      // @ts-expect-error testing invalid inputs
      expect(formatAmountInWords(null)).toBe("Zero");
      // @ts-expect-error testing invalid inputs
      expect(formatAmountInWords(undefined)).toBe("Zero");
      expect(formatAmountInWords(NaN)).toBe("Zero");
      expect(formatAmountInWords(-500)).toBe("Minus Five Hundred");
    });
  });
});
