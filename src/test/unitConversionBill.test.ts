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
});
