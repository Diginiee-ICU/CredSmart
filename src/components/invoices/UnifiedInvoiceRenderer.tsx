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
  layout?: "a4" | "80mm" | "58mm";
  className?: string;
}

const DOC_TITLE_MAP: Record<UniversalDocType, string> = {
  sales_invoice: "TAX INVOICE",
  pos_invoice: "RETAIL TAX INVOICE",
  purchase_invoice: "PURCHASE INVOICE / BILL",
  quotation: "ESTIMATE / QUOTATION",
  delivery_challan: "DELIVERY CHALLAN",
  credit_note: "CREDIT NOTE",
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

export const UnifiedInvoiceRenderer = forwardRef<HTMLDivElement, UnifiedInvoiceProps>(
  (
    {
      docType = "sales_invoice",
      copyType = "ORIGINAL FOR RECIPIENT",
      invoiceNumber,
      referenceNumber,
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
      className,
    },
    ref
  ) => {
    const activeSettings = propSettings || loadInvoiceSettings();
    const swatch = getThemeColorSwatch(activeSettings.primaryColor);
    const primaryHex = swatch.hex || "#0284C7";
    const bgLightHex = swatch.bgLight || "#F0F9FF";

    const isPurchase = docType === "purchase_invoice" || docType === "debit_note" || docType === "payment_out";

    // Format Dates
    const parsedDate = date instanceof Date ? date : new Date(date || Date.now());
    const formattedDate = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
      : String(date);

    const formattedTime = time || (activeSettings.showTimestamp && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "");

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
      name: partyInfo?.name || (isPurchase ? "Vendor / Supplier" : "Walk-in Customer"),
      phone: partyInfo?.phone || "",
      email: partyInfo?.email || "",
      address: partyInfo?.address || "",
      state: partyInfo?.state || "",
      stateCode: partyInfo?.stateCode || (partyInfo?.gstin ? partyInfo.gstin.substring(0, 2) : ""),
      gstin: partyInfo?.gstin || "",
      pan: partyInfo?.pan || (partyInfo?.gstin && partyInfo.gstin.length >= 12 ? partyInfo.gstin.substring(2, 12) : ""),
      balance: partyInfo?.balance,
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
    // ─────────────────────────────────────────────────────────────
    return (
      <div
        ref={ref}
        id="unified-invoice-document"
        className={cn(
          "bg-white text-slate-800 w-full max-w-[780px] mx-auto p-4 sm:p-5 transition-all duration-200 relative border border-slate-300 one-page-invoice box-border font-sans leading-tight shadow-md rounded-lg",
          className
        )}
      >
        {/* Top Header Section */}
        <div className="border border-slate-300 bg-white">
          {/* Main Title Bar with Copy Type */}
          <div
            className="flex items-center justify-between px-3 py-1.5 border-b border-slate-300"
            style={{ backgroundColor: bgLightHex }}
          >
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">
                {docTitle}
              </h1>
              {copyType && (
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-slate-400/80 bg-white text-slate-700 shadow-2xs">
                  {copyType}
                </span>
              )}
            </div>

            <span className="text-[10px] font-semibold text-slate-600 hidden sm:inline-block">
              {safeStore.name} • GST Registered
            </span>
          </div>

          {/* Seller Info (Left) & Document Metadata Grid (Right) */}
          <div className="grid grid-cols-12 divide-x divide-slate-300 text-[10px]">
            {/* Store Information Pod (7 Columns) */}
            <div className="col-span-7 p-2.5 flex items-start gap-2.5">
              {safeStore.logoUrl ? (
                <img
                  src={safeStore.logoUrl}
                  alt="Store Logo"
                  className="w-12 h-12 object-contain rounded border border-slate-200 p-0.5 shrink-0 bg-white"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded flex items-center justify-center font-black text-sm shrink-0 shadow-2xs border border-slate-300"
                  style={{ backgroundColor: bgLightHex, color: primaryHex }}
                >
                  {safeStore.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-0.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                  {safeStore.name}
                </h2>
                {safeStore.address && (
                  <p className="text-[9.5px] text-slate-600 leading-snug">{safeStore.address}</p>
                )}
                <div className="flex flex-wrap gap-x-2.5 text-[9px] text-slate-700 font-medium pt-0.5">
                  {safeStore.phone && <span>Ph: <strong className="font-semibold text-slate-900">{safeStore.phone}</strong></span>}
                  {safeStore.email && <span>Email: <strong className="font-semibold text-slate-900">{safeStore.email}</strong></span>}
                </div>
                <div className="flex flex-wrap gap-x-2.5 text-[9px] text-slate-800 font-mono font-bold pt-0.5">
                  {safeStore.gstin && <span>GSTIN: <strong className="text-slate-900">{safeStore.gstin}</strong></span>}
                  {safeStore.pan && <span>PAN: <strong className="text-slate-900">{safeStore.pan}</strong></span>}
                </div>
              </div>
            </div>

            {/* Metadata 3-Column Subgrid (5 Columns) */}
            <div className="col-span-5 p-2 bg-slate-50/50 flex flex-col justify-between text-[10px] space-y-1">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div>
                  <span className="text-[8.5px] font-bold uppercase text-slate-500 block">Invoice No:</span>
                  <span className="font-mono font-black text-slate-900 text-xs">{invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[8.5px] font-bold uppercase text-slate-500 block">Invoice Date:</span>
                  <span className="font-bold text-slate-800">{formattedDate}</span>
                </div>
                {dueDate && (
                  <div>
                    <span className="text-[8.5px] font-bold uppercase text-slate-500 block">Due Date:</span>
                    <span className="font-medium text-slate-800">{dueDate}</span>
                  </div>
                )}
                <div>
                  <span className="text-[8.5px] font-bold uppercase text-slate-500 block">Place of Supply:</span>
                  <span className="font-semibold text-slate-800 truncate block">{resolvedPlaceOfSupply}</span>
                </div>
              </div>

              {referenceNumber && referenceNumber.trim() !== "" && (
                <div className="pt-1 border-t border-slate-200 flex justify-between text-[9px]">
                  <span className="text-slate-500">Ref / PO No:</span>
                  <strong className="font-mono text-slate-800">{referenceNumber}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Address Section: Full-Width BILL TO or Dual BILL/SHIP TO */}
          {shippingInfo && shippingInfo.address && shippingInfo.address !== safeParty.address ? (
            <div className="grid grid-cols-2 divide-x divide-slate-300 border-t border-slate-300 text-[10px]">
              {/* BILL TO (BUYER) */}
              <div className="p-2 space-y-0.5 bg-white">
                <div className="flex items-center justify-between pb-0.5 mb-0.5 border-b border-slate-200">
                  <span className="font-black uppercase tracking-wider text-[9px]" style={{ color: primaryHex }}>
                    BILL TO (BUYER)
                  </span>
                  {activeSettings.showPartyBalance && safeParty.balance !== undefined && safeParty.balance !== null && (
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                      Bal: ₹{Number(safeParty.balance).toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-[11px] leading-tight">{safeParty.name}</p>
                {safeParty.address && <p className="text-[9.5px] text-slate-600 leading-snug">{safeParty.address}</p>}
                <div className="flex flex-wrap gap-x-2 text-[9px] text-slate-700 pt-0.5">
                  {safeParty.phone && <span>Mob: <strong className="font-medium text-slate-900">{safeParty.phone}</strong></span>}
                  {safeParty.state && <span>State: <strong className="text-slate-900">{safeParty.state}</strong></span>}
                </div>
                {safeParty.gstin && (
                  <p className="text-[9px] font-mono text-slate-800">GSTIN: <strong className="text-slate-900">{safeParty.gstin}</strong></p>
                )}
              </div>

              {/* SHIP TO (CONSIGNEE / DELIVERY) */}
              <div className="p-2 space-y-0.5 bg-white">
                <div className="flex items-center justify-between pb-0.5 mb-0.5 border-b border-slate-200">
                  <span className="font-black uppercase tracking-wider text-[9px]" style={{ color: primaryHex }}>
                    SHIP TO (CONSIGNEE)
                  </span>
                  <span className="text-[8px] text-slate-400 font-medium">Delivery Address</span>
                </div>
                <p className="font-bold text-slate-900 text-[11px] leading-tight">{safeShipping.name}</p>
                {safeShipping.address && <p className="text-[9.5px] text-slate-600 leading-snug">{safeShipping.address}</p>}
                <div className="flex flex-wrap gap-x-2 text-[9px] text-slate-700 pt-0.5">
                  {safeShipping.phone && <span>Mob: <strong className="font-medium text-slate-900">{safeShipping.phone}</strong></span>}
                  {safeShipping.state && <span>State: <strong className="text-slate-900">{safeShipping.state}</strong></span>}
                </div>
                {safeShipping.gstin && (
                  <p className="text-[9px] font-mono text-slate-800">GSTIN: <strong className="text-slate-900">{safeShipping.gstin}</strong></p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2 border-t border-slate-300 text-[10px] space-y-0.5 bg-white">
              <div className="flex items-center justify-between pb-0.5 mb-0.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-black uppercase tracking-wider text-[9px]" style={{ color: primaryHex }}>
                    BILL TO:
                  </span>
                  <span className="font-black text-slate-900 text-[11px] uppercase">{safeParty.name}</span>
                </div>
                {activeSettings.showPartyBalance && safeParty.balance !== undefined && safeParty.balance !== null && (
                  <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                    Bal: ₹{Number(safeParty.balance).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[9.5px] text-slate-700 leading-snug">
                {safeParty.address && <span>Address: {safeParty.address}</span>}
                {safeParty.state && <span> | State: <strong className="text-slate-900">{safeParty.state}</strong></span>}
                {safeParty.phone && <span> | Mob: <strong className="text-slate-900">{safeParty.phone}</strong></span>}
                {safeParty.gstin && <span> | GSTIN: <strong className="font-mono text-slate-900">{safeParty.gstin}</strong></span>}
              </p>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="mt-2 border border-slate-300 overflow-hidden text-[9.5px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 text-[9px]"
                style={{ backgroundColor: bgLightHex }}
              >
                <th className="py-1.5 px-2 text-center w-7 border-r border-slate-300">S.No</th>
                <th className="py-1.5 px-2 border-r border-slate-300">ITEMS / DESCRIPTION</th>
                {hasHsn && <th className="py-1.5 px-1.5 text-center border-r border-slate-300">HSN</th>}
                <th className="py-1.5 px-2 text-center border-r border-slate-300">QTY</th>
                {hasMrp && <th className="py-1.5 px-1.5 text-right border-r border-slate-300">MRP</th>}
                <th className="py-1.5 px-2 text-right border-r border-slate-300">RATE</th>
                {hasDiscount && <th className="py-1.5 px-1.5 text-right border-r border-slate-300">DISC.</th>}
                <th className="py-1.5 px-2 text-right border-r border-slate-300">TAX (GST %)</th>
                {hasCess && <th className="py-1.5 px-1.5 text-right border-r border-slate-300">CESS</th>}
                <th className="py-1.5 px-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {safeItems.map((it, idx) => {
                const itemTaxRate = it.taxRate || 0;
                const itemTaxAmt = it.taxAmount !== undefined ? it.taxAmount : ((it.rate * it.qty - (it.discount || 0)) * itemTaxRate) / 100;
                const itemCessAmt = it.cessAmount || 0;

                return (
                  <tr key={it.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <p className="font-bold text-slate-900 leading-tight">{it.name}</p>
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
                    {hasHsn && (
                      <td className="py-1.5 px-1.5 text-center font-mono text-slate-600 border-r border-slate-200">
                        {it.hsn || "-"}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-center font-semibold border-r border-slate-200">
                      {(() => {
                        const q = formatItemQuantityDisplay(it);
                        return q.isDual ? (
                          <div className="leading-tight">
                            <span className="font-bold text-slate-900 block">{q.primaryLine}</span>
                            <span className="block text-[8px] text-slate-600 font-mono mt-0.5 font-medium">
                              {q.secondaryLine}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">{q.primaryLine}</span>
                        );
                      })()}
                    </td>
                    {hasMrp && (
                      <td className="py-1.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-200">
                        {it.mrp ? `₹${it.mrp.toFixed(2)}` : "-"}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-right font-mono text-slate-800 border-r border-slate-200">
                      ₹{(it.rate || 0).toFixed(2)}
                    </td>
                    {hasDiscount && (
                      <td className="py-1.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-200">
                        {it.discount && it.discount > 0 ? (
                          <>
                            <span>₹{it.discount.toFixed(2)}</span>
                            {it.discountPercent ? <span className="block text-[7.5px] text-slate-400">({it.discountPercent}%)</span> : null}
                          </>
                        ) : "-"}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700 border-r border-slate-200">
                      <span>₹{itemTaxAmt.toFixed(2)}</span>
                      <span className="block text-[8px] text-slate-500 font-normal">({itemTaxRate}%)</span>
                    </td>
                    {hasCess && (
                      <td className="py-1.5 px-1.5 text-right font-mono text-slate-600 border-r border-slate-200">
                        {itemCessAmt > 0 ? `₹${itemCessAmt.toFixed(2)}` : "0.0"}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                      ₹{(it.total || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {/* Delivery Charge row (if > 0) */}
              {deliveryCharge > 0 && (
                <tr className="bg-slate-50/60 font-semibold border-t border-slate-200">
                  <td colSpan={2} className="py-1 px-2 text-left font-bold text-slate-700">
                    DELIVERY CHARGE
                  </td>
                  {hasHsn && <td className="border-r border-slate-200" />}
                  <td className="border-r border-slate-200" />
                  {hasMrp && <td className="border-r border-slate-200" />}
                  <td className="border-r border-slate-200" />
                  {hasDiscount && <td className="border-r border-slate-200" />}
                  <td className="border-r border-slate-200" />
                  {hasCess && <td className="border-r border-slate-200" />}
                  <td className="py-1 px-2 text-right font-mono text-slate-900 font-bold">
                    ₹{deliveryCharge.toFixed(2)}
                  </td>
                </tr>
              )}

              {/* Total Summary Row */}
              <tr className="font-bold bg-slate-100/90 text-slate-900 border-t-2 border-slate-300">
                <td colSpan={2} className="py-1.5 px-2 text-left font-black tracking-wider text-[9.5px]">
                  TOTAL AMOUNT
                </td>
                {hasHsn && <td className="py-1.5 px-1.5 text-center font-mono">-</td>}
                <td className="py-1.5 px-2 text-center font-mono font-black">{totalQty}</td>
                {hasMrp && <td className="py-1.5 px-1.5" />}
                <td className="py-1.5 px-2" />
                {hasDiscount && (
                  <td className="py-1.5 px-1.5 text-right font-mono text-slate-700">
                    {totals?.discountTotal ? `₹${totals.discountTotal.toFixed(2)}` : "-"}
                  </td>
                )}
                <td className="py-1.5 px-2 text-right font-mono text-slate-800">
                  ₹{totalTax.toFixed(2)}
                </td>
                {hasCess && (
                  <td className="py-1.5 px-1.5 text-right font-mono text-slate-800">
                    ₹{totalCess.toFixed(2)}
                  </td>
                )}
                <td className="py-1.5 px-2 text-right font-mono font-black text-slate-900">
                  ₹{grandTotalVal.toFixed(2)}
                </td>
              </tr>

              {/* Payment Reconciliation Rows */}
              <tr className="bg-white border-t border-slate-200 text-[9px]">
                <td colSpan={2} className="py-1 px-2 font-bold text-slate-700">
                  RECEIVED AMOUNT ({paymentMethod})
                </td>
                <td colSpan={hasHsn ? 1 : 0} />
                <td />
                {hasMrp && <td />}
                <td />
                {hasDiscount && <td />}
                <td />
                {hasCess && <td />}
                <td className="py-1 px-2 text-right font-mono font-bold text-emerald-700">
                  ₹{paidAmountVal.toFixed(2)}
                </td>
              </tr>

              {balanceDueVal > 0 && (
                <tr className="bg-rose-50/40 border-t border-slate-200 text-[9px]">
                  <td colSpan={2} className="py-1 px-2 font-bold text-rose-700">
                    BALANCE AMOUNT DUE
                  </td>
                  <td colSpan={hasHsn ? 1 : 0} />
                  <td />
                  {hasMrp && <td />}
                  <td />
                  {hasDiscount && <td />}
                  <td />
                  {hasCess && <td />}
                  <td className="py-1 px-2 text-right font-mono font-black text-rose-700">
                    ₹{balanceDueVal.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Statutory HSN/SAC Tax Summary Matrix */}
        <div className="mt-2 border border-slate-300 overflow-hidden text-[9px]">
          <div className="px-2 py-0.5 bg-slate-100 border-b border-slate-300 font-bold uppercase tracking-wider text-[8px] text-slate-700 flex justify-between">
            <span>HSN/SAC TAX BREAKDOWN ({isInterstate ? "INTERSTATE IGST" : "INTRASTATE CGST + SGST"})</span>
            <span className="font-mono">GST COMPLIANT</span>
          </div>
          <table className="w-full text-center border-collapse">
            <thead className="bg-slate-50 font-bold border-b border-slate-300 text-[8.5px]">
              <tr>
                <th className="py-1 px-1.5 border-r border-slate-300">HSN/SAC</th>
                <th className="py-1 px-1.5 border-r border-slate-300 text-right">Taxable Value</th>
                {isInterstate ? (
                  <>
                    <th className="py-1 px-1 border-r border-slate-300">IGST Rate</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-right">IGST Amount</th>
                  </>
                ) : (
                  <>
                    <th className="py-1 px-1 border-r border-slate-300">CGST Rate</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-right">CGST Amount</th>
                    <th className="py-1 px-1 border-r border-slate-300">SGST Rate</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-right">SGST Amount</th>
                  </>
                )}
                <th className="py-1 px-1.5 border-r border-slate-300">Cess</th>
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
              {/* HSN Total Summary row */}
              <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                <td className="py-1 px-1.5 border-r border-slate-300 font-black">Total</td>
                <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono font-black">
                  ₹{totalTaxable.toFixed(2)}
                </td>
                {isInterstate ? (
                  <>
                    <td className="py-1 px-1 border-r border-slate-300" />
                    <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono font-black">
                      ₹{igstVal.toFixed(2)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1 px-1 border-r border-slate-300" />
                    <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono font-black">
                      ₹{cgstVal.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 border-r border-slate-300" />
                    <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono font-black">
                      ₹{sgstVal.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="py-1 px-1.5 border-r border-slate-300 font-mono font-black">
                  {totalCess > 0 ? `₹${totalCess.toFixed(2)}` : "0"}
                </td>
                <td className="py-1 px-1.5 text-right font-mono font-black text-slate-900">
                  ₹{totalTax.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Full-width Amount in Words Banner */}
        <div className="my-2 p-1.5 border border-slate-300 bg-slate-50/70 text-left text-[9.5px]">
          <span className="font-bold uppercase tracking-wider text-slate-600 text-[8.5px] mr-1.5">
            Invoice Amount (in words):
          </span>
          <span className="font-bold text-slate-900 capitalize">
            INR Rupees {numberToWords(grandTotalVal)} Only
          </span>
        </div>

        {/* 3-Pod Balanced Bottom Section */}
        <div className="grid grid-cols-12 divide-x divide-slate-300 border border-slate-300 bg-white text-[9px]">
          {/* Pod 1: Notes & Terms (4 Columns) */}
          <div className="col-span-5 p-2 space-y-1.5 flex flex-col justify-between">
            {notes && (
              <div>
                <p className="font-black uppercase tracking-wider text-slate-700 text-[8.5px]">Notes:</p>
                <p className="text-slate-600 leading-tight">{notes}</p>
              </div>
            )}
            <div>
              <p className="font-black uppercase tracking-wider text-slate-700 text-[8.5px]">Terms and Conditions:</p>
              <p className="text-slate-600 whitespace-pre-line leading-snug">{currentTerms}</p>
            </div>
          </div>

          {/* Pod 2: Bank Details (4 Columns) */}
          <div className="col-span-4 p-2 space-y-1 bg-slate-50/40">
            <p className="font-black uppercase tracking-wider text-slate-800 text-[8.5px]" style={{ color: primaryHex }}>
              BANK ACCOUNT DETAILS
            </p>
            {selectedBank ? (
              <div className="space-y-0.5 text-slate-700 leading-tight">
                {selectedBank.bankName && <p>Bank: <strong className="text-slate-900">{selectedBank.bankName}</strong></p>}
                {selectedBank.accountNumber && <p>A/C No: <strong className="font-mono text-slate-900 font-bold">{selectedBank.accountNumber}</strong></p>}
                {selectedBank.ifsc && <p>IFSC: <strong className="font-mono text-slate-900 font-bold">{selectedBank.ifsc}</strong></p>}
                {selectedBank.branch && <p>Branch: <strong className="text-slate-900">{selectedBank.branch}</strong></p>}
                {selectedBank.accountHolder && <p>Holder: <strong className="text-slate-900">{selectedBank.accountHolder}</strong></p>}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[8.5px]">Direct bank payment available on request.</p>
            )}
          </div>

          {/* Pod 3: Dynamic UPI QR Code & Authorized Signature (3 Columns) */}
          <div className="col-span-3 p-2 flex flex-col items-center justify-between text-center bg-white space-y-1">
            {activeUpiId && upiPayload ? (
              <div className="flex flex-col items-center">
                <p className="text-[8px] font-bold text-slate-700 mb-0.5">Scan QR Code with UPI</p>
                <div className="p-1 bg-white border border-slate-300 rounded shadow-2xs">
                  <QRCodeSVG value={upiPayload} size={44} level="M" />
                </div>
                <p className="text-[7.5px] font-mono text-slate-500 mt-0.5 truncate max-w-[120px]">{activeUpiId}</p>
              </div>
            ) : <div />}

            <div className="w-full pt-1 flex flex-col items-center">
              <div className="w-28 min-h-[30px] border-b border-slate-400 flex items-center justify-center p-0.5">
                {activeSettings.signatureDataUrl ? (
                  <img
                    src={activeSettings.signatureDataUrl}
                    alt="Authorized Signature"
                    className="max-h-7 max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <span className="text-[8px] italic text-slate-400">For {safeStore.name}</span>
                )}
              </div>
              <p className="text-[8px] font-black uppercase text-slate-700 mt-0.5 tracking-tight">
                {activeSettings.signatoryTitle || "Authorized Signatory"}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Footer Compliance Branding */}
        <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[7.5px] text-slate-400 font-sans">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <img src="/logo-static.jpeg" alt="CredSmart" className="h-3 w-auto object-contain mix-blend-multiply opacity-80" />
            <span>Powered by <strong className="font-bold text-slate-700">CredSmart POS &amp; Billing</strong></span>
          </div>
          <div className="font-mono text-slate-400">
            <span>IT Act 2000 Ready • 100% Tax Compliant</span>
          </div>
        </div>
      </div>
    );
  }
);

UnifiedInvoiceRenderer.displayName = "UnifiedInvoiceRenderer";
