import React, { forwardRef, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { InvoiceSettingsState } from "@/types/invoice-settings";
import { loadInvoiceSettings, getThemeColorSwatch } from "@/utils/invoiceThemeLoader";
import { numberToWords } from "@/lib/numberToWords";
import { cn } from "@/lib/utils";

export type UniversalDocType =
  | "sales_invoice"
  | "purchase_invoice"
  | "pos_invoice"
  | "quotation"
  | "delivery_challan"
  | "sales_return"
  | "credit_note"
  | "debit_note"
  | "proforma_invoice"
  | "payment_in"
  | "payment_out";

export interface InvoiceItemData {
  id?: string;
  name: string;
  description?: string;
  hsn?: string;
  qty: number;            // base/primary qty (e.g. 10)
  unit?: string;          // primary unit label (e.g. "PCS")
  altUnit?: string;       // alternate unit label (e.g. "BOX")
  altQty?: number;        // qty in alternate units
  altUnitConversion?: number; // how many primary units per 1 alt unit
  freeQty?: number;
  rate: number;           // taxable unit rate before tax
  mrp?: number;           // Maximum Retail Price
  discount?: number;      // total discount amount on this line
  discountPercent?: number;
  taxRate?: number;       // GST rate percentage (e.g. 5, 12, 18, 28)
  taxAmount?: number;     // calculated tax amount
  cessRate?: number;      // Cess rate %
  cessAmount?: number;    // Cess fixed or calculated amount
  total: number;          // gross line total
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
  priceHistory?: string;
}

export interface PartyDetails {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  state?: string | null;
  stateCode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  balance?: number | null;
  type?: "customer" | "supplier";
}

export interface UnifiedInvoiceProps {
  docType?: UniversalDocType;
  copyType?: "ORIGINAL FOR RECIPIENT" | "DUPLICATE FOR TRANSPORTER" | "TRIPLICATE FOR SUPPLIER" | string;
  invoiceNumber: string;
  referenceNumber?: string;
  vehicleNumber?: string;
  billingAddress?: string;
  billingPincode?: string;
  poReference?: string;
  date: string | Date;
  dueDate?: string;
  time?: string;
  placeOfSupply?: string;
  deliveryCharge?: number;
  storeInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    state?: string;
    stateCode?: string;
    gstin?: string;
    pan?: string;
    logoUrl?: string;
    bank_name?: string;
    account_number?: string;
    ifsc?: string;
    account_holder?: string;
    branch?: string;
    upi_id?: string;
  };
  partyInfo?: PartyDetails;
  shippingInfo?: PartyDetails; // Optional Ship To / Consignee
  items: InvoiceItemData[];
  totals: {
    subtotal: number;
    discountTotal?: number;
    discountLabel?: string;
    taxableAmount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    cess?: number;
    taxTotal?: number;
    roundOff?: number;
    grandTotal: number;
    paidAmount?: number;
    balanceDue?: number;
  };
  paymentMethod?: string;
  isInterstate?: boolean;
  notes?: string;
  terms?: string;
  settings?: InvoiceSettingsState;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
    branch?: string;
  };
  upiId?: string;
  layout?: "a4" | "a4_detailed" | "80mm" | "58mm";
  showHsnSummary?: boolean;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  returnReason?: string;
  settlementMode?: string;
  className?: string;
}

const DOC_TITLE_MAP: Record<UniversalDocType, string> = {
  sales_invoice: "TAX INVOICE",
  pos_invoice: "RETAIL TAX INVOICE",
  purchase_invoice: "PURCHASE INVOICE / BILL",
  quotation: "ESTIMATE / QUOTATION",
  delivery_challan: "DELIVERY CHALLAN",
  sales_return: "CREDIT NOTE / SALES RETURN",
  credit_note: "CREDIT NOTE (SEC 34 CGST ACT)",
  debit_note: "DEBIT NOTE",
  proforma_invoice: "PROFORMA INVOICE",
  payment_in: "RECEIPT VOUCHER",
  payment_out: "PAYMENT VOUCHER",
};

/**
 * Formats the quantity cell for an item on bills / invoices with dual unit breakdown.
 */
export function formatItemQuantityDisplay(it: InvoiceItemData): {
  isDual: boolean;
  primaryLine: string;
  secondaryLine: string | null;
} {
  const cleanUnit = it.unit ? (it.unit.toUpperCase() === "PCS" ? "Pcs" : it.unit) : "Pcs";
  const conv = it.altUnitConversion && Number(it.altUnitConversion) > 1 ? Number(it.altUnitConversion) : undefined;
  const altUnitName = it.altUnit ? it.altUnit.trim() : undefined;

  if (altUnitName && conv) {
    let altQtyVal = it.altQty;
    let baseUnitName = cleanUnit;

    if (it.unit && it.unit.toUpperCase() === altUnitName.toUpperCase()) {
      altQtyVal = it.qty > 0 ? it.qty : (it.altQty ?? 1);
      baseUnitName = "Pcs";
    } else {
      if (altQtyVal == null && it.qty > 0) {
        altQtyVal = Math.round(it.qty / conv) || (it.qty / conv);
      }
    }

    if (altQtyVal != null && altQtyVal > 0) {
      return {
        isDual: true,
        primaryLine: `${altQtyVal} ${altUnitName}`,
        secondaryLine: `(${altQtyVal}*${conv} ${baseUnitName})`,
      };
    }
  }

  return {
    isDual: false,
    primaryLine: `${it.qty} ${cleanUnit}`,
    secondaryLine: null,
  };
}

/**
 * Standardizes amount in words for financial receipts:
 * Formats compound numbers with hyphens ("Eighty-Eight") and removes extraneous "and"
 */
export function formatAmountInWords(num: number): string {
  const raw = numberToWords(num);
  return raw
    .replace(/\band\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\b(Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine)\b/g, "$1-$2")
    .trim();
}

export const UnifiedInvoiceRenderer = forwardRef<HTMLDivElement, UnifiedInvoiceProps>(
  (
    props,
    ref
  ) => {
    const {
      docType = "sales_invoice",
      copyType = "ORIGINAL FOR RECIPIENT",
      invoiceNumber,
      referenceNumber,
      vehicleNumber,
      billingAddress: propBillingAddress,
      billingPincode: propBillingPincode,
      poReference,
      date,
      dueDate,
      time,
      placeOfSupply,
      deliveryCharge = 0,
      storeInfo,
      partyInfo,
      shippingInfo,
      items = [],
      totals,
      paymentMethod = "Cash",
      isInterstate: propIsInterstate,
      notes,
      terms,
      settings: propSettings,
      bankDetails: propBankDetails,
      upiId: propUpiId,
      layout = "a4",
      showHsnSummary: propShowHsnSummary,
      originalInvoiceNumber,
      originalInvoiceDate,
      returnReason,
      settlementMode,
      className,
    } = props;

    // Determine whether to display the detailed HSN/SAC Tax Summary Table
    const shouldRenderHsnSummary = useMemo(() => {
      if (propShowHsnSummary !== undefined) return propShowHsnSummary;
      if (layout === "a4_detailed") return true;
      if (layout === "a4") return false;
      return false;
    }, [propShowHsnSummary, layout]);

    // Resolve aliases for backward compatibility
    const legacyProps = props as Record<string, unknown>;
    const resolvedRawDate = date || (legacyProps.invoiceDate as string | number | Date | undefined) || Date.now();
    const resolvedPartyInfo = partyInfo || (legacyProps.party as PartyDetails | undefined);
    const resolvedBankDetails = propBankDetails || (legacyProps.bankDetails as UnifiedInvoiceProps["bankDetails"]);
    const resolvedUpiId = propUpiId || (legacyProps.upiId as string | undefined);

    const activeSettings = propSettings || loadInvoiceSettings();
    const swatch = getThemeColorSwatch(activeSettings.primaryColor);
    const primaryHex = swatch.hex || "#0284C7";
    const bgLightHex = swatch.bgLight || "#F0F9FF";

    const isPurchase = docType === "purchase_invoice" || docType === "debit_note" || docType === "payment_out";

    // Format Dates
    const parsedDate = resolvedRawDate instanceof Date ? resolvedRawDate : new Date(resolvedRawDate);
    const formattedDate = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, '')
      : String(resolvedRawDate);

    const formattedTime = time || (activeSettings.showTimestamp && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "");

    const resolvedDueDate = dueDate
      ? (() => {
          const d = new Date(dueDate);
          return !isNaN(d.getTime())
            ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, '')
            : dueDate;
        })()
      : formattedDate;

    const docTitle = DOC_TITLE_MAP[docType] || "TAX INVOICE";

    const safeStore = {
      name: storeInfo?.name || "CredSmart Store",
      phone: storeInfo?.phone || "",
      email: storeInfo?.email || "",
      address: storeInfo?.address || "",
      state: storeInfo?.state || "",
      stateCode: storeInfo?.stateCode || (storeInfo?.gstin ? storeInfo.gstin.substring(0, 2) : ""),
      gstin: storeInfo?.gstin || "",
      pan: storeInfo?.pan || (storeInfo?.gstin && storeInfo.gstin.length >= 12 ? storeInfo.gstin.substring(2, 12) : ""),
      logoUrl: storeInfo?.logoUrl || "",
      bank_name: storeInfo?.bank_name || "",
      account_number: storeInfo?.account_number || "",
      ifsc: storeInfo?.ifsc || "",
      account_holder: storeInfo?.account_holder || storeInfo?.name || "CredSmart Store",
      branch: storeInfo?.branch || "",
      upi_id: storeInfo?.upi_id || "",
    };

    const safeParty = {
      name: resolvedPartyInfo?.name || (isPurchase ? "Vendor / Supplier" : "Walk-in Customer"),
      phone: resolvedPartyInfo?.phone || "",
      email: resolvedPartyInfo?.email || "",
      address: resolvedPartyInfo?.address || "",
      state: resolvedPartyInfo?.state || "",
      stateCode: resolvedPartyInfo?.stateCode || (resolvedPartyInfo?.gstin ? resolvedPartyInfo.gstin.substring(0, 2) : ""),
      gstin: resolvedPartyInfo?.gstin || "",
      pan: resolvedPartyInfo?.pan || (resolvedPartyInfo?.gstin && resolvedPartyInfo.gstin.length >= 12 ? resolvedPartyInfo.gstin.substring(2, 12) : ""),
      balance: resolvedPartyInfo?.balance,
    };

    const safeShipping = {
      name: shippingInfo?.name || safeParty.name,
      phone: shippingInfo?.phone || safeParty.phone,
      address: shippingInfo?.address || safeParty.address,
      state: shippingInfo?.state || safeParty.state,
      gstin: shippingInfo?.gstin || safeParty.gstin,
    };

    // Auto-detect Interstate (IGST) vs Intrastate (CGST + SGST)
    const isInterstate = useMemo(() => {
      if (propIsInterstate !== undefined) return propIsInterstate;
      if (totals?.igst && totals.igst > 0) return true;
      if (safeStore.stateCode && safeParty.stateCode && safeStore.stateCode !== safeParty.stateCode) return true;
      if (safeStore.state && safeParty.state && safeStore.state.toLowerCase() !== safeParty.state.toLowerCase()) return true;
      return false;
    }, [propIsInterstate, totals?.igst, safeStore.stateCode, safeParty.stateCode, safeStore.state, safeParty.state]);

    const resolvedPlaceOfSupply = placeOfSupply || safeParty.state || (safeParty.stateCode ? `State Code ${safeParty.stateCode}` : "Local State");

    const safeItems = items || [];
    const totalQty = safeItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    // Dynamic HSN/SAC Tax Summary Calculation Engine
    const hsnSummaryList = useMemo(() => {
      const map: Record<
        string,
        {
          hsn: string;
          taxableValue: number;
          taxRate: number;
          cgstRate: number;
          cgstAmount: number;
          sgstRate: number;
          sgstAmount: number;
          igstRate: number;
          igstAmount: number;
          cessAmount: number;
          totalTax: number;
        }
      > = {};

      safeItems.forEach((it) => {
        const hsnKey = it.hsn?.trim() || "General";
        const rateVal = it.rate || 0;
        const qtyVal = it.qty || 0;
        const discVal = it.discount || 0;
        const taxable = rateVal * qtyVal - discVal;
        const taxRate = it.taxRate || 0;
        const cessAmt = it.cessAmount || 0;

        const taxAmt = it.taxAmount !== undefined ? it.taxAmount : (taxable * taxRate) / 100;
        const halfRate = taxRate / 2;

        if (!map[hsnKey]) {
          map[hsnKey] = {
            hsn: hsnKey,
            taxableValue: 0,
            taxRate,
            cgstRate: isInterstate ? 0 : halfRate,
            cgstAmount: 0,
            sgstRate: isInterstate ? 0 : halfRate,
            sgstAmount: 0,
            igstRate: isInterstate ? taxRate : 0,
            igstAmount: 0,
            cessAmount: 0,
            totalTax: 0,
          };
        }

        map[hsnKey].taxableValue += taxable;
        map[hsnKey].cessAmount += cessAmt;

        if (isInterstate) {
          map[hsnKey].igstAmount += taxAmt;
        } else {
          map[hsnKey].cgstAmount += taxAmt / 2;
          map[hsnKey].sgstAmount += taxAmt / 2;
        }

        map[hsnKey].totalTax += taxAmt + cessAmt;
      });

      return Object.values(map);
    }, [safeItems, isInterstate]);

    // Totals calculations
    const totalTaxable = totals?.taxableAmount !== undefined
      ? totals.taxableAmount
      : hsnSummaryList.reduce((sum, h) => sum + h.taxableValue, 0);

    const totalTax = totals?.taxTotal !== undefined
      ? totals.taxTotal
      : hsnSummaryList.reduce((sum, h) => sum + h.totalTax, 0);

    const totalCess = totals?.cess !== undefined
      ? totals.cess
      : hsnSummaryList.reduce((sum, h) => sum + h.cessAmount, 0);

    const cgstVal = isInterstate ? 0 : (totals?.cgst !== undefined ? totals.cgst : (totalTax - totalCess) / 2);
    const sgstVal = isInterstate ? 0 : (totals?.sgst !== undefined ? totals.sgst : (totalTax - totalCess) / 2);
    const igstVal = isInterstate ? (totals?.igst !== undefined ? totals.igst : totalTax - totalCess) : 0;

    const grandTotalVal = totals?.grandTotal || 0;
    const paidAmountVal = totals?.paidAmount !== undefined ? totals.paidAmount : (paymentMethod === "Credit" ? 0 : grandTotalVal);
    const balanceDueVal = totals?.balanceDue !== undefined ? totals.balanceDue : (grandTotalVal - paidAmountVal);

    const taxRatePercentage = safeItems.length > 0 && safeItems[0].taxRate !== undefined
      ? safeItems[0].taxRate
      : (totalTaxable > 0 ? Math.round((totalTax / totalTaxable) * 100) : 5);

    // Bank Details
    const rawBank = propBankDetails?.accountNumber
      ? {
          bankName: propBankDetails.bankName || "",
          accountNumber: propBankDetails.accountNumber,
          ifsc: propBankDetails.ifsc || "",
          branch: propBankDetails.branch || "",
          accountHolder: propBankDetails.accountHolder || safeStore.name,
        }
      : safeStore.account_number
      ? {
          bankName: safeStore.bank_name || "",
          accountNumber: safeStore.account_number,
          ifsc: safeStore.ifsc || "",
          branch: safeStore.branch || "",
          accountHolder: safeStore.account_holder || safeStore.name,
        }
      : null;

    const selectedBank = rawBank?.accountNumber ? rawBank : null;
    const activeUpiId = propUpiId || safeStore.upi_id || "";

    const upiPayload = activeUpiId
      ? `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(
          safeStore.name
        )}&am=${grandTotalVal}&cu=INR&tn=${encodeURIComponent(`Inv ${invoiceNumber}`)}`
      : "";

    const defaultTerms =
      "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. This is a computer generated invoice.";

    const currentTerms = terms || defaultTerms;

    // Detect if MRP, Cess, Batch, or Discount columns actually exist
    const hasMrp = safeItems.some((it) => it.mrp && it.mrp > 0);
    const hasDiscount = (totals?.discountTotal && totals.discountTotal > 0) || safeItems.some((it) => it.discount && it.discount > 0);
    const hasCess = totalCess > 0 || safeItems.some((it) => (it.cessAmount && it.cessAmount > 0) || (it.cessRate && it.cessRate > 0));
    const hasHsn = safeItems.some((it) => it.hsn && it.hsn.trim() !== "");

    // ─────────────────────────────────────────────────────────────
    // 1. THERMAL POS RECEIPT LAYOUT (80mm & 58mm)
    // ─────────────────────────────────────────────────────────────
    if (layout === "80mm" || layout === "58mm") {
      return (
        <div
          ref={ref}
          id="receipt-printable-area"
          data-layout={layout}
          className={cn(
            "bg-white text-black font-mono text-xs p-4 sm:p-5 mx-auto border border-neutral-300 rounded-xl shadow-xs",
            layout === "80mm" ? "w-full max-w-[320px]" : "w-full max-w-[240px] text-[11px]",
            className
          )}
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* Header */}
          <div className="text-center pb-2 mb-2 border-b border-dashed border-neutral-400">
            <h2 className="font-bold text-sm sm:text-base uppercase tracking-wider">{safeStore.name}</h2>
            {safeStore.address && <p className="text-[10px] text-neutral-600 mt-0.5">{safeStore.address}</p>}
            {safeStore.phone && <p className="text-[10px] text-neutral-600">Tel: {safeStore.phone}</p>}
            {safeStore.gstin && <p className="text-[10px] font-bold text-neutral-800">GSTIN: {safeStore.gstin}</p>}

            <div className="mt-1.5 font-bold uppercase tracking-wide text-[11px] bg-neutral-100 py-0.5 px-2 rounded">
              {docTitle}
            </div>
          </div>

          {/* Meta Info */}
          <div className="text-[10.5px] pb-2 mb-2 border-b border-dashed border-neutral-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Invoice No:</span>
              <strong className="font-bold">{invoiceNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Mode:</span>
              <span>{paymentMethod}</span>
            </div>

            {/* Billed To */}
            <div className="pt-1 mt-1 border-t border-dotted border-neutral-300">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">
                {isPurchase ? "Supplier:" : "Customer:"}
              </span>
              <p className="font-bold text-[11px] text-neutral-900 truncate">
                {safeParty.name}
              </p>
              {safeParty.phone && <p className="text-[10px] text-neutral-600">Ph: {safeParty.phone}</p>}
              {safeParty.gstin && <p className="text-[10px] text-neutral-600">GSTIN: {safeParty.gstin}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left mb-2 text-[10.5px]">
            <thead>
              <tr className="border-b border-neutral-900 font-bold">
                <th className="pb-1 text-left">ITEM</th>
                <th className="pb-1 text-center">QTY</th>
                <th className="pb-1 text-right">RATE</th>
                <th className="pb-1 text-right">AMT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-300">
              {safeItems.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-1 pr-1">
                    <span className="font-bold block leading-tight">{it.name}</span>
                    {it.hsn && <span className="text-[9px] text-neutral-500">HSN:{it.hsn}</span>}
                  </td>
                  <td className="py-1 text-center font-bold">
                    {(() => {
                      const q = formatItemQuantityDisplay(it);
                      return q.isDual ? (
                        <div className="leading-tight">
                          <span>{q.primaryLine}</span>
                          <span className="block text-[8px] font-normal text-neutral-600 font-mono mt-0.5">
                            {q.secondaryLine}
                          </span>
                        </div>
                      ) : (
                        <span>{q.primaryLine}</span>
                      );
                    })()}
                  </td>
                  <td className="py-1 text-right">₹{(it.rate || 0).toFixed(2)}</td>
                  <td className="py-1 text-right font-bold">₹{(it.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-dashed border-neutral-400 pt-1.5 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{(totals?.subtotal || 0).toFixed(2)}</span>
            </div>
            {deliveryCharge > 0 && (
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>₹{deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            {totals?.discountTotal && totals.discountTotal > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-₹{totals.discountTotal.toFixed(2)}</span>
              </div>
            ) : null}
            {totalTax > 0 && (
              <>
                {isInterstate ? (
                  <div className="flex justify-between text-neutral-600">
                    <span>IGST:</span>
                    <span>₹{igstVal.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-neutral-600">
                      <span>CGST:</span>
                      <span>₹{cgstVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>SGST:</span>
                      <span>₹{sgstVal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {totalCess > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Cess:</span>
                    <span>₹{totalCess.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between font-bold text-sm border-t border-neutral-900 pt-1 mt-1">
              <span>TOTAL:</span>
              <span>₹{grandTotalVal.toFixed(2)}</span>
            </div>
          </div>

          {/* Bank details & UPI QR */}
          {(selectedBank?.accountNumber || activeUpiId) && (
            <div className="border-t border-dashed border-neutral-400 pt-1.5 mt-1.5 text-[9.5px] space-y-0.5 text-left leading-tight">
              <p className="font-bold uppercase tracking-wider text-neutral-800 text-[8.5px]">Payment &amp; Bank Details:</p>
              {selectedBank?.bankName && <p className="text-neutral-700">Bank: <strong className="text-neutral-900">{selectedBank.bankName}</strong></p>}
              {selectedBank?.accountNumber && <p className="text-neutral-700">A/C: <strong className="text-neutral-900 font-mono">{selectedBank.accountNumber}</strong></p>}
              {selectedBank?.ifsc && <p className="text-neutral-700">IFSC: <strong className="text-neutral-900 font-mono">{selectedBank.ifsc}</strong></p>}
              {activeUpiId && <p className="text-neutral-700">UPI ID: <strong className="text-neutral-900 font-mono">{activeUpiId}</strong></p>}
            </div>
          )}

          {/* Footer QR & Message */}
          <div className="text-center pt-2 mt-1.5 border-t border-dashed border-neutral-400">
            {activeUpiId && (
              <div className="inline-block p-1 bg-white border border-neutral-300 rounded mb-1">
                <QRCodeSVG value={upiPayload} size={52} level="M" />
                <p className="text-[9px] font-bold text-neutral-800">Scan &amp; Pay via UPI ({activeUpiId})</p>
              </div>
            )}
            <p className="text-[9px] text-neutral-500 mt-1 italic">Thank you for your business!</p>
          </div>
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SINGLE MASTER PROFESSIONAL GST A4 INVOICE STANDARD
    // Preview: full-size, readable, scrollable in modal.
    // PDF/Print: scaled to 1 page via downloadExactInvoice.ts
    // ─────────────────────────────────────────────────────────────
    return (
      <div
        ref={ref}
        id="unified-invoice-document"
        data-layout={layout === "a4_detailed" ? "a4" : layout}
        data-printable-area="true"
        data-print-container="invoice"
        className={cn(
          "bg-white text-slate-800 w-full max-w-[794px] mx-auto px-8 pt-8 pb-6 relative box-border font-sans leading-tight",
          className
        )}
      >
        {/* Header Section: Unboxed bold document title (Left) & Stacked Metadata (Right) */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-black uppercase tracking-tight text-[#0c324e]">
              {docTitle}
            </h1>
          </div>

          <div className="text-right flex flex-col items-end space-y-1.5">
            <div>
              <span className="text-[10px] font-bold text-slate-700 block">Invoice No.</span>
              <span className="text-[10.5px] font-bold text-slate-900 font-mono block">{invoiceNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-700 block">Invoice Date</span>
              <span className="text-[10.5px] font-semibold text-slate-900 block">{formattedDate}{formattedTime ? ` ${formattedTime}` : ""}</span>
            </div>
            {dueDate && (
              <div>
                <span className="text-[10px] font-bold text-slate-700 block">Due Date</span>
                <span className="text-[10.5px] font-semibold text-slate-900 block">{resolvedDueDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cyan Accent Divider Line */}
        <div className="w-full h-[2px] bg-[#0ea5e9] mt-3 mb-4" />

        {/* Dual Equal-Width Party Pods (FROM & BILL TO) */}
        <div className="grid grid-cols-2 border border-slate-200 divide-x divide-slate-200 text-[10px] mb-4">
          {/* Left Pod: FROM (Seller) */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200">
                <span className="text-[10.5px] font-bold tracking-wider text-[#0284c7] uppercase">FROM</span>
              </div>
              <div className="p-3 space-y-1 text-[9.5px]">
                <h2 className="text-[11.5px] font-black text-slate-900 uppercase tracking-tight">
                  {safeStore.name}
                </h2>
                {safeStore.address && (
                  <p className="text-slate-600 leading-snug">{safeStore.address}</p>
                )}
                <div className="text-slate-700 flex flex-wrap gap-x-3">
                  {safeStore.phone && <span>Phone: <strong className="font-semibold text-slate-900">{safeStore.phone}</strong></span>}
                  {safeStore.email && <span>Email: <strong className="font-semibold text-slate-900">{safeStore.email}</strong></span>}
                </div>
                <div className="text-slate-800 font-mono flex flex-wrap gap-x-3">
                  {safeStore.gstin && <span>GSTIN: <strong className="text-slate-900">{safeStore.gstin}</strong></span>}
                  {safeStore.pan && <span>PAN: <strong className="text-slate-900">{safeStore.pan}</strong></span>}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 px-3 py-1.5 text-[9.5px] text-slate-700 bg-white">
              Place of Supply: <strong className="font-semibold text-slate-900">{resolvedPlaceOfSupply}</strong>
            </div>
          </div>

          {/* Right Pod: BILL TO (Buyer) */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[10.5px] font-bold tracking-wider text-[#0284c7] uppercase">BILL TO</span>
                {activeSettings.showPartyBalance && safeParty.balance !== undefined && safeParty.balance !== null && (
                  <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                    Bal: ₹{Number(safeParty.balance).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-1 text-[9.5px]">
                <p className="text-[11.5px] font-black text-slate-900 uppercase tracking-tight">
                  {safeParty.name}
                </p>
                {safeParty.address && (
                  <p className="text-slate-600 leading-snug">{safeParty.address}</p>
                )}
                {propBillingAddress && propBillingAddress.trim() !== "" && propBillingAddress !== safeParty.address && (
                  <p className="text-[8px] text-slate-500">
                    Billing: {propBillingAddress}{propBillingPincode ? ` - ${propBillingPincode}` : ""}
                  </p>
                )}
                <div className="text-slate-700 flex flex-wrap gap-x-3">
                  {safeParty.phone && <span>Contact: <strong className="font-semibold text-slate-900">{safeParty.phone}</strong></span>}
                  {safeParty.gstin && <span className="font-mono">GSTIN: <strong className="text-slate-900">{safeParty.gstin}</strong></span>}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 px-3 py-1.5 text-[9.5px] text-slate-700 bg-white">
              {safeParty.name === "Walk-in Customer" ? (
                <span>Attn: <strong className="font-semibold text-slate-900">{notes && notes.trim() !== "" ? notes : "Counter Sale"}</strong></span>
              ) : notes && notes.trim() !== "" ? (
                <span>Customer: <strong className="font-semibold text-slate-900">{notes}</strong></span>
              ) : (
                <span>Customer: <strong className="font-semibold text-slate-900">{safeParty.name}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Original Reference / Return Note Details (if present) */}
        {(originalInvoiceNumber?.trim() || originalInvoiceDate || returnReason?.trim() || settlementMode) && (
          <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-[9px] flex flex-wrap gap-x-4 gap-y-1">
            {originalInvoiceNumber && (
              <div>
                <span className="text-slate-500 font-semibold">Orig Inv No: </span>
                <strong className="font-mono text-slate-900">{originalInvoiceNumber}</strong>
              </div>
            )}
            {originalInvoiceDate && (
              <div>
                <span className="text-slate-500 font-semibold">Orig Inv Date: </span>
                <strong className="text-slate-800">{originalInvoiceDate}</strong>
              </div>
            )}
            {returnReason && (
              <div>
                <span className="text-slate-500 font-semibold">Return Reason: </span>
                <strong className="text-rose-600">{returnReason}</strong>
              </div>
            )}
            {settlementMode && (
              <div>
                <span className="text-slate-500 font-semibold">Settlement: </span>
                <strong className="capitalize text-indigo-700">{settlementMode.replace(/_/g, " ")}</strong>
              </div>
            )}
          </div>
        )}

        {/* Section Heading ITEM DETAILS */}
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#0284c7] mt-4 mb-1.5">
          ITEM DETAILS
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 overflow-hidden text-[9.5px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0c324e] text-white">
              <tr className="font-bold text-[9.5px] uppercase">
                <th className="py-2 px-2.5 text-center w-[6%] border-r border-[#1a4a6e]">S.No.</th>
                <th className="py-2 px-2.5 text-left w-[48%] border-r border-[#1a4a6e]">Description</th>
                <th className="py-2 px-2.5 text-center w-[12%] border-r border-[#1a4a6e]">HSN</th>
                <th className="py-2 px-2.5 text-center w-[10%] border-r border-[#1a4a6e]">Qty</th>
                <th className="py-2 px-2.5 text-right w-[12%] border-r border-[#1a4a6e]">Rate</th>
                <th className="py-2 px-2.5 text-right w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {safeItems.map((it, idx) => {
                const q = formatItemQuantityDisplay(it);
                return (
                  <tr key={it.id || idx} className="bg-white hover:bg-slate-50/50">
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-200">
                      <p className="font-semibold text-slate-900 leading-tight">{it.name}</p>
                      {it.description && (
                        <p className="text-[8.5px] text-slate-500 italic mt-0.5">{it.description}</p>
                      )}
                      {(it.batchNo || it.expDate) && (
                        <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                          {it.batchNo ? `Batch: ${it.batchNo} ` : ""}
                          {it.expDate ? `Exp: ${it.expDate}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-700 border-r border-slate-200">
                      {it.hsn || "-"}
                    </td>
                    <td className="py-2 px-2.5 text-center font-medium border-r border-slate-200">
                      {q.isDual ? (
                        <div className="leading-tight">
                          <span className="font-bold text-slate-900 block">{q.primaryLine}</span>
                          <span className="block text-[8px] text-slate-600 font-mono mt-0.5 font-medium">
                            {q.secondaryLine}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-800 font-medium">{q.primaryLine}</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-800 border-r border-slate-200">
                      ₹{(it.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                      ₹{(it.total !== undefined ? it.total : (it.rate || 0) * (it.qty || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Statutory HSN/SAC Tax Breakdown Table (rendered in a4_detailed or when showHsnSummary is true) */}
        {shouldRenderHsnSummary && (totalTax > 0 || (hsnSummaryList.length > 0 && totalTaxable > 0 && hsnSummaryList.some(r => r.hsn !== "-"))) && (
          <div className="mt-3 border border-slate-200 overflow-hidden text-[9px]">
            <div className="px-2.5 py-1 bg-[#e8f4fd] border-b border-slate-200 font-bold uppercase tracking-wider text-[8.5px] text-[#0284c7] flex justify-between">
              <span>HSN/SAC TAX BREAKDOWN ({isInterstate ? "INTERSTATE IGST" : "INTRASTATE CGST + SGST"})</span>
              <span className="font-mono">GST COMPLIANT</span>
            </div>
            <table className="w-full text-center border-collapse">
              <thead className="bg-[#0c324e] text-white font-bold border-b border-slate-200 text-[8.5px]">
                <tr>
                  <th className="py-1 px-1.5 border-r border-[#1a4a6e]">HSN/SAC</th>
                  <th className="py-1 px-1.5 border-r border-[#1a4a6e] text-right">Taxable Value</th>
                  {isInterstate ? (
                    <>
                      <th className="py-1 px-1 border-r border-[#1a4a6e]">IGST Rate</th>
                      <th className="py-1 px-1.5 border-r border-[#1a4a6e] text-right">IGST Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="py-1 px-1 border-r border-[#1a4a6e]">CGST Rate</th>
                      <th className="py-1 px-1.5 border-r border-[#1a4a6e] text-right">CGST Amount</th>
                      <th className="py-1 px-1.5 border-r border-[#1a4a6e]">SGST Rate</th>
                      <th className="py-1 px-1.5 border-r border-[#1a4a6e] text-right">SGST Amount</th>
                    </>
                  )}
                  <th className="py-1 px-1.5 border-r border-[#1a4a6e]">Cess</th>
                  <th className="py-1 px-1.5 text-right">Total Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[8.5px]">
                {hsnSummaryList.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="py-1 px-1.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                      {row.hsn}
                    </td>
                    <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono text-slate-800">
                      ₹{row.taxableValue.toFixed(2)}
                    </td>
                    {isInterstate ? (
                      <>
                        <td className="py-1 px-1 border-r border-slate-200 text-slate-600">{row.igstRate}%</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono text-slate-800">
                          ₹{row.igstAmount.toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 px-1 border-r border-slate-200 text-slate-600">{row.cgstRate}%</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono text-slate-800">
                          ₹{row.cgstAmount.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 border-r border-slate-200 text-slate-600">{row.sgstRate}%</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono text-slate-800">
                          ₹{row.sgstAmount.toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-1 px-1.5 border-r border-slate-200 font-mono text-slate-700">
                      {row.cessAmount > 0 ? `₹${row.cessAmount.toFixed(2)}` : "0"}
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                      ₹{row.totalTax.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Right-Aligned Financial Summary Breakdown */}
        <div className="mt-3 flex justify-end">
          <div className="w-[320px] text-[10px] space-y-1.5 text-right">
            <div className="flex justify-between items-center text-slate-600">
              <span>Taxable value</span>
              <span className="font-mono text-slate-900 font-medium">
                ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* GST tax lines */}
            {!isInterstate && (cgstVal > 0 || sgstVal > 0) ? (
              <>
                <div className="flex justify-between items-center text-slate-600">
                  <span>CGST {taxRatePercentage > 0 ? `(${taxRatePercentage / 2}%)` : ""}</span>
                  <span className="font-mono text-slate-900 font-medium">
                    ₹{cgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>SGST {taxRatePercentage > 0 ? `(${taxRatePercentage / 2}%)` : ""}</span>
                  <span className="font-mono text-slate-900 font-medium">
                    ₹{sgstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : totalTax > 0 ? (
              <div className="flex justify-between items-center text-slate-600">
                <span>GST ({taxRatePercentage || 5}%)</span>
                <span className="font-mono text-slate-900 font-medium">
                  ₹{(igstVal || totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ) : null}

            {deliveryCharge > 0 && (
              <div className="flex justify-between items-center text-slate-600">
                <span>Delivery Charge</span>
                <span className="font-mono text-slate-900 font-medium">
                  ₹{deliveryCharge.toFixed(2)}
                </span>
              </div>
            )}

            {totals?.discountTotal && totals.discountTotal > 0 ? (
              <div className="flex justify-between items-center text-emerald-700">
                <span>Discount</span>
                <span className="font-mono font-medium">
                  -₹{totals.discountTotal.toFixed(2)}
                </span>
              </div>
            ) : null}

            {totals?.roundOff !== undefined && totals.roundOff !== 0 && (
              <div className="flex justify-between items-center text-slate-500 text-[9px]">
                <span>Round Off</span>
                <span className="font-mono">
                  {totals.roundOff > 0 ? `+₹${totals.roundOff.toFixed(2)}` : `-₹${Math.abs(totals.roundOff).toFixed(2)}`}
                </span>
              </div>
            )}

            {/* Signature Soft Blue Rounded Highlight Pill for Grand Total */}
            <div className="bg-[#e0f2fe] rounded-md px-3 py-1.5 flex justify-between items-center w-full">
              <span className="text-[10.5px] font-bold text-[#0c324e]">Invoice total (rounded)</span>
              <span className="text-[11.5px] font-black text-[#0c324e] font-mono">
                ₹{grandTotalVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Amount received */}
            <div className="flex justify-between items-center text-slate-600 pt-0.5">
              <span>Amount received ({paymentMethod || "Cash"})</span>
              <span className="font-mono font-bold text-slate-900">
                ₹ {paidAmountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {balanceDueVal > 0 && (
              <div className="flex justify-between items-center pt-0.5 font-bold text-rose-600">
                <span>Balance amount</span>
                <span className="font-mono">
                  ₹{balanceDueVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Clean Unboxed Amount in Words */}
        <div className="my-3 text-left text-[10px]">
          <span className="font-medium text-slate-700 text-[9.5px]">
            <strong className="font-bold text-slate-900 mr-2">Amount in words:</strong>
            INR {formatAmountInWords(grandTotalVal)} Only
          </span>
        </div>

        {/* Dual Bottom Cards (Bank Details & Authorised Signatory) */}
        <div className="grid grid-cols-2 border border-slate-200 divide-x divide-slate-200 text-[10px] mb-4">
          {/* Left Card: BANK ACCOUNT DETAILS */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200">
                <span className="text-[10px] font-bold tracking-wider text-[#0284c7] uppercase">
                  BANK ACCOUNT DETAILS
                </span>
              </div>
              <div className="p-3 space-y-0.5 text-[9.5px] text-slate-700">
                {selectedBank ? (
                  <>
                    <p>Bank: <strong className="text-slate-900 font-semibold">{selectedBank.bankName || "Federal Bank"}</strong></p>
                    <p>A/C No.: <strong className="font-mono text-slate-900 font-semibold">{selectedBank.accountNumber}</strong></p>
                    <p>IFSC: <strong className="font-mono text-slate-900 font-semibold">{selectedBank.ifsc}</strong></p>
                    <p>Account Holder: <strong className="text-slate-900 font-semibold">{selectedBank.accountHolder || safeStore.name}</strong></p>
                    {selectedBank.branch && <p>Branch: <strong className="text-slate-900 font-semibold">{selectedBank.branch}</strong></p>}
                  </>
                ) : (
                  <p className="text-slate-400 italic">Direct bank payment available on request.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Card: AUTHORISED SIGNATORY */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200">
                <span className="text-[10px] font-bold tracking-wider text-[#0284c7] uppercase">
                  AUTHORISED SIGNATORY
                </span>
              </div>
              <div className="p-3 flex flex-col justify-end items-center min-h-[75px]">
                {activeSettings.signatureDataUrl ? (
                  <img
                    src={activeSettings.signatureDataUrl}
                    alt="Authorized Signature"
                    className="max-h-8 max-w-full object-contain filter contrast-125 mb-1"
                  />
                ) : null}
                <div className="w-36 border-b border-slate-300 mb-1" />
                <p className="text-[9px] text-slate-500 font-medium">Signature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Footer Note */}
        <div className="mt-6 text-center text-[9.5px] text-slate-500">
          Thank you for your business.
        </div>
      </div>
    );
  }
);

UnifiedInvoiceRenderer.displayName = "UnifiedInvoiceRenderer";
