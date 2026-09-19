export interface InvoiceCalculationItemInput {
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  /** "exclusive" (Without Tax, default) or "inclusive" (With Tax) */
  taxType?: "exclusive" | "inclusive";
  altQty?: number;
  altUnit?: string;
  altUnitConversion?: number;
}

export interface InvoiceCalculationInput {
  items: InvoiceCalculationItemInput[];
  /** Default tax type for items if item.taxType is not specified */
  defaultTaxType?: "exclusive" | "inclusive";
  overallDiscountType: "flat" | "percent";
  overallDiscountValue: number;
  showAdditionalCharges?: boolean;
  additionalChargesAmount?: number;
  autoRoundOff: boolean;
  manualRoundOff: number;
  isInterState: boolean;
}

export function calculateInvoiceBreakdown(input: InvoiceCalculationInput) {
  const docTaxType = input.defaultTaxType || "exclusive";

  const recalculatedItems = input.items.map((item) => {
    const primaryQty = Number(item.quantity) || 0;
    const unitRate = Number(item.rate) || 0;
    const itemTaxType = item.taxType || docTaxType;
    const taxRate = Number(item.taxRate) || 0;

    let taxable = 0;
    let taxAmount = 0;
    let rawSub = 0;
    let itemDiscount = 0;

    if (itemTaxType === "inclusive") {
      // Rates include GST (With Tax)
      // rawSub is the gross amount (Qty * Rate)
      rawSub = primaryQty * unitRate;
      itemDiscount = item.discountPercent > 0
        ? (rawSub * (Number(item.discountPercent) || 0)) / 100
        : Number(item.discountAmount) || 0;
      const grossAfterDiscount = Math.max(0, rawSub - itemDiscount);

      // Back-calculate taxable value and GST
      taxable = taxRate > 0 ? grossAfterDiscount / (1 + taxRate / 100) : grossAfterDiscount;
      taxAmount = grossAfterDiscount - taxable;
    } else {
      // Rates exclude GST (Without Tax, standard)
      rawSub = primaryQty * unitRate;
      itemDiscount = item.discountPercent > 0
        ? (rawSub * (Number(item.discountPercent) || 0)) / 100
        : Number(item.discountAmount) || 0;
      taxable = Math.max(0, rawSub - itemDiscount);
      taxAmount = (taxable * taxRate) / 100;
    }

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (input.isInterState) {
      igst = taxAmount;
    } else {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
    }

    return {
      ...item,
      quantity: primaryQty,
      taxType: itemTaxType,
      discountAmount: Number(itemDiscount.toFixed(2)),
      taxableAmount: Number(taxable.toFixed(2)),
      cgstAmount: Number(cgst.toFixed(2)),
      sgstAmount: Number(sgst.toFixed(2)),
      igstAmount: Number(igst.toFixed(2)),
      lineTotal: Number((taxable + taxAmount).toFixed(2)),
    };
  });

  const rawSubtotal = recalculatedItems.reduce((acc, item) => {
    return acc + ((Number(item.quantity) || 0) * (Number(item.rate) || 0));
  }, 0);

  const itemDiscounts = recalculatedItems.reduce((acc, item) => {
    return acc + Number(item.discountAmount || 0);
  }, 0);

  const taxableBase = recalculatedItems.reduce((acc, item) => acc + Number(item.taxableAmount || 0), 0);
  const overallDiscount = input.overallDiscountType === "percent"
    ? (taxableBase * (Number(input.overallDiscountValue) || 0)) / 100
    : Number(input.overallDiscountValue) || 0;

  const finalTaxable = Math.max(0, taxableBase - overallDiscount);
  const weightedItems = recalculatedItems.map((item) => {
    const itemTaxableValue = Number(item.taxableAmount || 0);
    const share = taxableBase > 0 ? (itemTaxableValue / taxableBase) : 0;
    const weightedTaxable = finalTaxable * share;
    const taxRate = Number(item.taxRate) || 0;
    const taxAmount = (weightedTaxable * taxRate) / 100;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (input.isInterState) {
      igst = taxAmount;
    } else {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
    }

    return {
      ...item,
      taxableAmount: Number(weightedTaxable.toFixed(2)),
      cgstAmount: Number(cgst.toFixed(2)),
      sgstAmount: Number(sgst.toFixed(2)),
      igstAmount: Number(igst.toFixed(2)),
      lineTotal: Number((weightedTaxable + taxAmount).toFixed(2)),
    };
  });

  const discountedTaxableTotal = weightedItems.reduce((acc, item) => acc + Number(item.taxableAmount || 0), 0);
  const cgstTotal = weightedItems.reduce((acc, item) => acc + Number(item.cgstAmount || 0), 0);
  const sgstTotal = weightedItems.reduce((acc, item) => acc + Number(item.sgstAmount || 0), 0);
  const igstTotal = weightedItems.reduce((acc, item) => acc + Number(item.igstAmount || 0), 0);
  const taxTotal = cgstTotal + sgstTotal + igstTotal;
  const additionalCharges = input.showAdditionalCharges ? Number(input.additionalChargesAmount) || 0 : 0;
  const totalDiscount = itemDiscounts + overallDiscount;
  const unroundedGrand = discountedTaxableTotal + taxTotal + additionalCharges;

  let roundedGrand = unroundedGrand;
  let roundOff = 0;

  if (input.autoRoundOff) {
    roundedGrand = Math.round(unroundedGrand);
    roundOff = Number((roundedGrand - unroundedGrand).toFixed(2));
  } else {
    roundedGrand = Number((unroundedGrand + (Number(input.manualRoundOff) || 0)).toFixed(2));
    roundOff = Number(input.manualRoundOff) || 0;
  }

  return {
    recalculatedItems: weightedItems,
    totals: {
      totalQty: weightedItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      itemDiscounts: Number(itemDiscounts.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableTotal: Number(discountedTaxableTotal.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      additionalCharges,
      roundOff,
      grandTotal: Math.max(0, roundedGrand),
    },
  };
}
