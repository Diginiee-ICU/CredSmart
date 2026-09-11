export interface InvoiceCalculationItemInput {
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  altQty?: number;
  altUnit?: string;
  altUnitConversion?: number;
}

export interface InvoiceCalculationInput {
  items: InvoiceCalculationItemInput[];
  overallDiscountType: "flat" | "percent";
  overallDiscountValue: number;
  showAdditionalCharges: boolean;
  additionalChargesAmount: number;
  autoRoundOff: boolean;
  manualRoundOff: number;
  isInterState: boolean;
}

export function calculateInvoiceBreakdown(input: InvoiceCalculationInput) {
  const recalculatedItems = input.items.map((item) => {
    const primaryQty = Number(item.quantity) || 0;
    const effectiveQty = item.altQty != null && Number(item.altQty) > 0
      ? Number(item.altQty)
      : primaryQty;
    const rawSub = effectiveQty * (Number(item.rate) || 0);
    const itemDiscount = item.discountPercent > 0
      ? (rawSub * (Number(item.discountPercent) || 0)) / 100
      : Number(item.discountAmount) || 0;
    const taxable = Math.max(0, rawSub - itemDiscount);

    const taxRate = Number(item.taxRate) || 0;
    const taxAmount = (taxable * taxRate) / 100;

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
      taxableAmount: Number(taxable.toFixed(2)),
      cgstAmount: Number(cgst.toFixed(2)),
      sgstAmount: Number(sgst.toFixed(2)),
      igstAmount: Number(igst.toFixed(2)),
      lineTotal: Number((taxable + taxAmount).toFixed(2)),
    };
  });

  const rawSubtotal = recalculatedItems.reduce((acc, item) => {
    const effectiveQty = item.altQty != null && Number(item.altQty) > 0
      ? Number(item.altQty)
      : (Number(item.quantity) || 0);
    return acc + (effectiveQty * (Number(item.rate) || 0));
  }, 0);

  const itemDiscounts = recalculatedItems.reduce((acc, item) => {
    const effectiveQty = item.altQty != null && Number(item.altQty) > 0
      ? Number(item.altQty)
      : (Number(item.quantity) || 0);
    const lineSub = effectiveQty * (Number(item.rate) || 0);
    return acc + (lineSub - Number(item.taxableAmount || 0));
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
