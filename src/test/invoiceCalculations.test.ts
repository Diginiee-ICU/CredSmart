import { describe, it, expect } from "vitest";
import { calculateInvoiceBreakdown } from "@/utils/invoiceCalculations";

describe("invoice calculation engine", () => {
  it("applies flat overall discount to taxable value before tax is calculated", () => {
    const result = calculateInvoiceBreakdown({
      items: [
        {
          quantity: 2,
          rate: 100,
          discountPercent: 10,
          discountAmount: 0,
          taxRate: 18,
        },
      ],
      overallDiscountType: "flat",
      overallDiscountValue: 10,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    expect(result.totals.rawSubtotal).toBe(200);
    expect(result.totals.itemDiscounts).toBe(20);
    expect(result.totals.totalDiscount).toBe(30);
    expect(result.totals.taxableTotal).toBe(170);
    expect(result.totals.taxTotal).toBe(30.6);
    expect(result.totals.grandTotal).toBe(200.6);
    expect(result.recalculatedItems[0].taxableAmount).toBe(170);
    expect(result.recalculatedItems[0].lineTotal).toBe(200.6);
  });

  it("allocates percentage discount across items before GST is computed", () => {
    const result = calculateInvoiceBreakdown({
      items: [
        { quantity: 1, rate: 100, discountPercent: 0, discountAmount: 0, taxRate: 18 },
        { quantity: 1, rate: 200, discountPercent: 0, discountAmount: 0, taxRate: 18 },
      ],
      overallDiscountType: "percent",
      overallDiscountValue: 10,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    expect(result.totals.rawSubtotal).toBe(300);
    expect(result.totals.itemDiscounts).toBe(0);
    expect(result.totals.totalDiscount).toBe(30);
    expect(result.totals.taxableTotal).toBe(270);
    expect(result.totals.taxTotal).toBe(48.6);
    expect(result.totals.grandTotal).toBe(318.6);
    expect(result.recalculatedItems[0].taxableAmount).toBe(90);
    expect(result.recalculatedItems[1].taxableAmount).toBe(180);
  });

  it("uses the converted primary quantity when an alternate unit is selected", () => {
    const result = calculateInvoiceBreakdown({
      items: [{
        quantity: 10,
        rate: 25,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 18,
        altQty: 2,
        altUnit: "Box",
        altUnitConversion: 5,
      }],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      showAdditionalCharges: false,
      additionalChargesAmount: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    expect(result.totals.totalQty).toBe(10);
    expect(result.totals.rawSubtotal).toBe(250);
    expect(result.totals.taxableTotal).toBe(250);
    expect(result.totals.taxTotal).toBe(45);
    expect(result.totals.grandTotal).toBe(295);
  });

  it("keeps primary-unit quantities correct when alternate-unit metadata exists", () => {
    const result = calculateInvoiceBreakdown({
      items: [{
        quantity: 3,
        rate: 40,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        altQty: undefined,
        altUnit: "Box",
        altUnitConversion: 10,
      }],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      showAdditionalCharges: false,
      additionalChargesAmount: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    expect(result.totals.totalQty).toBe(3);
    expect(result.totals.rawSubtotal).toBe(120);
    expect(result.totals.taxTotal).toBe(6);
    expect(result.totals.grandTotal).toBe(126);
  });

  it("calculates With Tax (tax inclusive) pricing accurately where rate includes GST", () => {
    // Product purchased at ₹118 with 18% GST included (common in FMCG/Hardware/Retail)
    const result = calculateInvoiceBreakdown({
      items: [
        {
          quantity: 2,
          rate: 118, // ₹118 each, GST 18% included
          taxRate: 18,
          taxType: "inclusive",
          discountPercent: 0,
          discountAmount: 0,
        },
      ],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    // 2 * 118 = 236 gross
    // Taxable base = 236 / 1.18 = 200
    // CGST = 18, SGST = 18, Total Tax = 36
    // Grand Total = 236
    expect(result.totals.rawSubtotal).toBe(236);
    expect(result.totals.taxableTotal).toBe(200);
    expect(result.totals.cgstTotal).toBe(18);
    expect(result.totals.sgstTotal).toBe(18);
    expect(result.totals.taxTotal).toBe(36);
    expect(result.totals.grandTotal).toBe(236);
    expect(result.recalculatedItems[0].taxableAmount).toBe(200);
    expect(result.recalculatedItems[0].lineTotal).toBe(236);
  });

  it("calculates With Tax (tax inclusive) item with discount properly", () => {
    // ₹118 rate, 10% discount, 18% GST included
    const result = calculateInvoiceBreakdown({
      items: [
        {
          quantity: 1,
          rate: 118,
          taxRate: 18,
          taxType: "inclusive",
          discountPercent: 10,
          discountAmount: 0,
        },
      ],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    // 118 - 10% = 106.20 gross after discount
    // Taxable = 106.20 / 1.18 = 90.00
    // Tax = 16.20
    // Line Total = 106.20
    expect(result.totals.rawSubtotal).toBe(118);
    expect(result.totals.itemDiscounts).toBe(11.8);
    expect(result.totals.taxableTotal).toBe(90);
    expect(result.totals.taxTotal).toBe(16.2);
    expect(result.totals.grandTotal).toBe(106.2);
  });

  it("correctly handles mixed invoice with both Without Tax and With Tax items", () => {
    const result = calculateInvoiceBreakdown({
      items: [
        // Item 1: Without Tax: 1 qty @ ₹100 + 18% GST = ₹118
        {
          quantity: 1,
          rate: 100,
          taxRate: 18,
          taxType: "exclusive",
          discountPercent: 0,
          discountAmount: 0,
        },
        // Item 2: With Tax: 1 qty @ ₹118 (incl. 18% GST) = ₹118 (taxable ₹100)
        {
          quantity: 1,
          rate: 118,
          taxRate: 18,
          taxType: "inclusive",
          discountPercent: 0,
          discountAmount: 0,
        },
      ],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: false,
    });

    // Total taxable = 100 + 100 = 200
    // Total tax = 18 + 18 = 36
    // Grand Total = 118 + 118 = 236
    expect(result.totals.taxableTotal).toBe(200);
    expect(result.totals.taxTotal).toBe(36);
    expect(result.totals.grandTotal).toBe(236);
  });

  it("respects defaultTaxType at the document level when item taxType is omitted", () => {
    const result = calculateInvoiceBreakdown({
      defaultTaxType: "inclusive",
      items: [
        {
          quantity: 1,
          rate: 590, // with 18% GST
          taxRate: 18,
          discountPercent: 0,
          discountAmount: 0,
        },
      ],
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: false,
      manualRoundOff: 0,
      isInterState: true, // IGST
    });

    // Taxable = 590 / 1.18 = 500
    // IGST = 90
    // Grand Total = 590
    expect(result.totals.taxableTotal).toBe(500);
    expect(result.totals.igstTotal).toBe(90);
    expect(result.totals.cgstTotal).toBe(0);
    expect(result.totals.sgstTotal).toBe(0);
    expect(result.totals.taxTotal).toBe(90);
    expect(result.totals.grandTotal).toBe(590);
  });
});

