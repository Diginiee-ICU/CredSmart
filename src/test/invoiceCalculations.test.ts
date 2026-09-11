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
});
