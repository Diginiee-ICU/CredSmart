import { describe, it, expect } from "vitest";
import { formatItemQuantityDisplay, InvoiceItemData } from "../components/invoices/UnifiedInvoiceRenderer";

describe("Invoice Line Item Dual Unit Display & Calculation", () => {
  it("formats alternate unit quantity and shows (altQty*conv unit) calculation in brackets", () => {
    const itemWithAltUnit: InvoiceItemData = {
      name: "Maggie",
      qty: 4, // 4 primary units (PCS)
      unit: "Pcs",
      altUnit: "PKT",
      altQty: 1, // 1 alternate unit (PKT)
      altUnitConversion: 4, // 1 PKT = 4 Pcs
      rate: 68,
      total: 272,
    };

    const display = formatItemQuantityDisplay(itemWithAltUnit);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("1 PKT");
    expect(display.secondaryLine).toBe("(1*4 Pcs)");
  });

  it("handles multi-pack alternate unit sales (e.g. 2 PKT with 4 Pcs per PKT)", () => {
    const itemMultiPack: InvoiceItemData = {
      name: "Maggie 4-Pack",
      qty: 8,
      unit: "Pcs",
      altUnit: "PKT",
      altQty: 2,
      altUnitConversion: 4,
      rate: 68,
      total: 544,
    };

    const display = formatItemQuantityDisplay(itemMultiPack);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("2 PKT");
    expect(display.secondaryLine).toBe("(2*4 Pcs)");
  });

  it("handles large conversion units (e.g. 5 BOX with 10 PCS per BOX)", () => {
    const itemBoxes: InvoiceItemData = {
      name: "Biscuits Box",
      qty: 50,
      unit: "PCS",
      altUnit: "BOX",
      altQty: 5,
      altUnitConversion: 10,
      rate: 100,
      total: 500,
    };

    const display = formatItemQuantityDisplay(itemBoxes);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("5 BOX");
    expect(display.secondaryLine).toBe("(5*10 Pcs)");
  });

  it("handles items when user selected unit as altUnit directly (e.g. unit = PKT, conv = 4)", () => {
    const itemDirectAlt: InvoiceItemData = {
      name: "Maggie",
      qty: 1,
      unit: "PKT",
      altUnit: "PKT",
      altUnitConversion: 4,
      rate: 68,
      total: 68,
    };

    const display = formatItemQuantityDisplay(itemDirectAlt);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("1 PKT");
    expect(display.secondaryLine).toBe("(1*4 Pcs)");
  });

  it("displays single standard unit without bracket when item is sold in primary unit only", () => {
    const singleUnitItem: InvoiceItemData = {
      name: "Milk 1L",
      qty: 2,
      unit: "LTR",
      rate: 60,
      total: 120,
    };

    const display = formatItemQuantityDisplay(singleUnitItem);

    expect(display.isDual).toBe(false);
    expect(display.primaryLine).toBe("2 LTR");
    expect(display.secondaryLine).toBe(null);
  });

  it("handles purchase invoice inward items with dual units (e.g. 10 BOX with 20 PCS each)", () => {
    const purchaseItem: InvoiceItemData = {
      name: "Detergent Powder 500g",
      qty: 200, // 200 primary units
      unit: "PCS",
      altUnit: "BOX",
      altQty: 10, // 10 boxes inward
      altUnitConversion: 20, // 1 BOX = 20 PCS
      rate: 45,
      total: 9000,
    };

    const display = formatItemQuantityDisplay(purchaseItem);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("10 BOX");
    expect(display.secondaryLine).toBe("(10*20 Pcs)");
  });

  it("preserves custom alternate unit labels with clean casing (e.g. 3 PACKET = 12 PCS)", () => {
    const packetItem: InvoiceItemData = {
      name: "Tea Powder",
      qty: 12,
      unit: "PCS",
      altUnit: "PACKET",
      altQty: 3,
      altUnitConversion: 4,
      rate: 110,
      total: 1320,
    };

    const display = formatItemQuantityDisplay(packetItem);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("3 PACKET");
    expect(display.secondaryLine).toBe("(3*4 Pcs)");
  });

  it("handles ladder / step custom conversion units (e.g. 3 LADDER = 21 STEPS)", () => {
    const ladderItem: InvoiceItemData = {
      name: "Stainless Steel Ladder 7 Steps",
      qty: 21, // 21 base units (STEPS)
      unit: "STEPS",
      altUnit: "LADDER",
      altQty: 3, // 3 ladders billed
      altUnitConversion: 7, // 1 LADDER = 7 STEPS
      rate: 2000,
      total: 49560,
    };

    const display = formatItemQuantityDisplay(ladderItem);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("3 LADDER");
    expect(display.secondaryLine).toBe("(3*7 STEPS)");
  });

  it("handles 1 SET = 7 STEPS alternate unit billing from AddItemsToBillModal (e.g. 1 SET top line, (1*7 STEPS) bottom line)", () => {
    const setItem: InvoiceItemData = {
      name: "Stainless Steel Ladder 7 Steps",
      qty: 7, // 7 primary units (STEPS)
      unit: "STEPS",
      altUnit: "SET",
      altQty: 1, // 1 SET billed
      altUnitConversion: 7, // 1 SET = 7 STEPS
      rate: 2000,
      total: 16520,
    };

    const display = formatItemQuantityDisplay(setItem);

    expect(display.isDual).toBe(true);
    expect(display.primaryLine).toBe("1 SET");
    expect(display.secondaryLine).toBe("(1*7 STEPS)");
  });
});
