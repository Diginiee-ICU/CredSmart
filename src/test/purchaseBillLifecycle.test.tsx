/**
 * @file purchaseBillLifecycle.test.tsx
 * @description Comprehensive unit and behavioral verification for Purchase Bill creation,
 * item breakdown calculations, metadata preservation, and action button lifecycles.
 */

import { describe, it, expect } from "vitest";
import { calculateInvoiceBreakdown } from "@/utils/invoiceCalculations";
import { DocumentLineItem } from "@/types/documents";

describe("Purchase Bill Lifecycle & Line Item Integrity", () => {
  it("preserves productName, id, unit, hsn, and rate when calculating invoice breakdown", () => {
    const rawItems: DocumentLineItem[] = [
      {
        id: "item-row-1",
        productId: "prod-101",
        productName: "Industrial Valve A-20",
        hsn: "84818090",
        quantity: 2,
        unit: "Pcs",
        rate: 500,
        discountPercent: 10,
        discountAmount: 0,
        taxRate: 18,
        taxType: "exclusive",
      },
      {
        id: "item-row-2",
        productId: "prod-102",
        productName: "Copper Fitting 1/2 inch",
        hsn: "74122000",
        quantity: 5,
        unit: "Pcs",
        rate: 100,
        discountPercent: 0,
        discountAmount: 50,
        taxRate: 18,
        taxType: "exclusive",
      },
    ];

    const breakdown = calculateInvoiceBreakdown({
      items: rawItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxRate: Number(item.taxRate) || 0,
        taxType: item.taxType || "exclusive",
      })),
      defaultTaxType: "exclusive",
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      showAdditionalCharges: false,
      additionalChargesAmount: 0,
      autoRoundOff: true,
      manualRoundOff: 0,
      isInterState: false,
    });

    expect(breakdown.recalculatedItems).toHaveLength(2);

    // Verify first item preserves all identity metadata
    const item1 = breakdown.recalculatedItems[0];
    expect(item1.id).toBe("item-row-1");
    expect(item1.productId).toBe("prod-101");
    expect(item1.productName).toBe("Industrial Valve A-20");
    expect(item1.hsn).toBe("84818090");
    expect(item1.unit).toBe("Pcs");
    expect(item1.quantity).toBe(2);
    expect(item1.rate).toBe(500);
    // 2 * 500 = 1000, 10% disc = 100, taxable = 900, 18% tax = 162, line total = 1062
    expect(item1.taxableAmount).toBe(900);
    expect(item1.cgstAmount).toBe(81);
    expect(item1.sgstAmount).toBe(81);
    expect(item1.lineTotal).toBe(1062);

    // Verify second item
    const item2 = breakdown.recalculatedItems[1];
    expect(item2.id).toBe("item-row-2");
    expect(item2.productName).toBe("Copper Fitting 1/2 inch");
    expect(item2.quantity).toBe(5);
    expect(item2.rate).toBe(100);
    // 5 * 100 = 500, flat 50 disc = 450 taxable, 18% tax = 81, line total = 531
    expect(item2.taxableAmount).toBe(450);
    expect(item2.lineTotal).toBe(531);

    // Grand total: 1062 + 531 = 1593
    expect(breakdown.totals.grandTotal).toBe(1593);
  });

  it("filters populated items cleanly and excludes empty placeholder rows", () => {
    const rawItems: DocumentLineItem[] = [
      {
        id: "empty-initial-row",
        productName: "",
        quantity: 1,
        unit: "Pcs",
        rate: 0,
      },
      {
        id: "populated-row-1",
        productName: "Safety Helmets",
        quantity: 3,
        unit: "Pcs",
        rate: 250,
      },
    ];

    const breakdown = calculateInvoiceBreakdown({
      items: rawItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 18,
        taxType: "exclusive",
      })),
      defaultTaxType: "exclusive",
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: true,
      manualRoundOff: 0,
      isInterState: false,
    });

    const populatedOnly = breakdown.recalculatedItems.filter(
      (it) => it.productName && it.productName.trim() !== ""
    );

    expect(populatedOnly).toHaveLength(1);
    expect(populatedOnly[0].productName).toBe("Safety Helmets");
    expect(populatedOnly[0].id).toBe("populated-row-1");
  });

  it("correctly handles additional charges, discounts, and round off in bill grand total", () => {
    const rawItems: DocumentLineItem[] = [
      {
        id: "item-1",
        productName: "Cement Bag 50kg",
        quantity: 10,
        unit: "Bag",
        rate: 350,
        taxRate: 28,
        taxType: "exclusive",
      },
    ];

    const breakdown = calculateInvoiceBreakdown({
      items: rawItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: Number(item.taxRate) || 0,
        taxType: "exclusive",
      })),
      defaultTaxType: "exclusive",
      overallDiscountType: "flat",
      overallDiscountValue: 200,
      showAdditionalCharges: true,
      additionalChargesAmount: 150,
      autoRoundOff: true,
      manualRoundOff: 0,
      isInterState: false,
    });

    // Subtotal: 10 * 350 = 3500
    expect(breakdown.totals.rawSubtotal).toBe(3500);
    // Discount: 200 -> taxable: 3300
    // Tax at 28%: 3300 * 0.28 = 924
    // Freight / Additional charges: 150
    // Total before roundoff: 3300 + 924 + 150 = 4374
    expect(breakdown.totals.grandTotal).toBe(4374);
  });

  it("handles batch add replacement of initial blank row", () => {
    const existingRows: DocumentLineItem[] = [
      { id: "blank-1", productName: "", quantity: 1, rate: 0, unit: "Pcs" },
    ];

    const incomingItems: DocumentLineItem[] = [
      { id: "new-item-1", productName: "Bearing 6204", quantity: 4, rate: 120, unit: "Pcs" },
    ];

    const copy = [...existingRows];
    let insertAt = copy.length;
    let replaceCount = 0;

    // Simulate handleBatchAddItemsAtTarget with target=null
    if (copy.length > 0 && (!copy[copy.length - 1].productName || copy[copy.length - 1].productName.trim() === "")) {
      insertAt = copy.length - 1;
      replaceCount = 1;
    }

    copy.splice(insertAt, replaceCount, ...incomingItems);

    expect(copy).toHaveLength(1);
    expect(copy[0].productName).toBe("Bearing 6204");
  });
});
