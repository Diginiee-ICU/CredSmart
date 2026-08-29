import React, { forwardRef } from "react";
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
  qty: number;            // base/primary qty (always in primary unit like PCS)
  unit?: string;          // primary unit label
  altUnit?: string;       // alternate unit label (e.g. "PKT")
  altQty?: number;        // qty in alternate units (e.g. 2 PKT). qty = altQty × altUnitConversion
  altUnitConversion?: number; // how many primary units per 1 alt unit
  freeQty?: number;
  rate: number;
  mrp?: number;
  discount?: number;
  discountPercent?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
  priceHistory?: string;
}

export interface UnifiedInvoiceProps {
  docType?: UniversalDocType;
  invoiceNumber: string;
  referenceNumber?: string;
  date: string | Date;
  dueDate?: string;
  time?: string;
  storeInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    pan?: string;
    logoUrl?: string;
    bank_name?: string;
    account_number?: string;
    ifsc?: string;
    account_holder?: string;
    upi_id?: string;
  };
  partyInfo?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstin?: string | null;
    balance?: number | null;
    type?: "customer" | "supplier";
  };
  items: InvoiceItemData[];
  totals: {
    subtotal: number;
    discountTotal?: number;
    discountLabel?: string;
    taxableAmount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    taxTotal?: number;
    roundOff?: number;
    grandTotal: number;
    paidAmount?: number;
    balanceDue?: number;
  };
  paymentMethod?: string;
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
  quotation: "QUOTATION / ESTIMATE",
  delivery_challan: "DELIVERY CHALLAN",
  credit_note: "CREDIT NOTE",
  debit_note: "DEBIT NOTE",
  proforma_invoice: "PROFORMA INVOICE",
  payment_in: "RECEIPT VOUCHER",
  payment_out: "PAYMENT VOUCHER",
};

/**
 * Formats the quantity cell for an item on bills / invoices.
 * If sold/purchased in an alternate unit:
 * - Top Line: e.g. "1 PKT" (total number of alt units)
 * - Bottom Line (exact just below it in brackets): "(1*4 Pcs)"
 *   i.e. `(total alt units * primary units per alt unit PrimaryUnit)`
 */
// eslint-disable-next-line react-refresh/only-export-components
export function formatItemQuantityDisplay(it: InvoiceItemData): {
  isDual: boolean;
  primaryLine: string;
  secondaryLine: string | null;
} {
  const cleanUnit = it.unit ? (it.unit.toUpperCase() === "PCS" ? "Pcs" : it.unit) : "Pcs";

  // Case 1: Explicit altQty and altUnit provided
  if (it.altUnit && it.altQty != null && it.altQty > 0) {
    const altUnitName = it.altUnit;
    const altQtyVal = it.altQty;
    const conv = it.altUnitConversion || (altQtyVal > 0 ? Math.round(it.qty / altQtyVal) : 1) || 1;
    return {
      isDual: true,
      primaryLine: `${altQtyVal} ${altUnitName}`,
      secondaryLine: `(${altQtyVal}*${conv} ${cleanUnit})`,
    };
  }

  // Case 2: Unit selected was the altUnit directly (e.g. unit = "PKT", altUnitConversion = 4, base unit PCS)
  if (
    it.altUnit &&
    it.altUnitConversion &&
    it.altUnitConversion > 1 &&
    it.unit &&
    it.unit.toUpperCase() === it.altUnit.toUpperCase()
  ) {
    const altUnitName = it.unit;
    const altQtyVal = it.qty;
    const conv = it.altUnitConversion;
    return {
      isDual: true,
      primaryLine: `${altQtyVal} ${altUnitName}`,
      secondaryLine: `(${altQtyVal}*${conv} Pcs)`,
    };
  }

  // Case 3: Standard single unit
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
      invoiceNumber,
      referenceNumber,
      date,
      dueDate,
      time,
      storeInfo,
      partyInfo,
      items,
      totals,
      paymentMethod = "Cash",
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
    const primaryHex = swatch.hex;
    const bgLightHex = swatch.bgLight;

    const isLuxury = activeSettings.theme === "luxury" || activeSettings.autoApplyLuxury;
    const isAdvancedGst = activeSettings.theme === "advanced_gst";
    const isPurchase = docType === "purchase_invoice" || docType === "debit_note" || docType === "payment_out";

    // Format Dates
    const parsedDate = date instanceof Date ? date : new Date(date || Date.now());
    const formattedDate = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : String(date);
    const formattedTime = time || (!isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "");

    const docTitle = DOC_TITLE_MAP[docType] || "TAX INVOICE";

    // Calculate tax numbers
    const totalTax = totals.taxTotal !== undefined ? totals.taxTotal : (totals.cgst || 0) + (totals.sgst || 0) + (totals.igst || 0);
    const taxableAmt = totals.taxableAmount !== undefined ? totals.taxableAmount : (totals.subtotal - (totals.discountTotal || 0));
    const cgstVal = totals.cgst !== undefined ? totals.cgst : (totals.igst ? 0 : totalTax / 2);
    const sgstVal = totals.sgst !== undefined ? totals.sgst : (totals.igst ? 0 : totalTax / 2);
    const igstVal = totals.igst || 0;

    const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    const safeStore = {
      name: storeInfo?.name || "CredSmart Store",
      phone: storeInfo?.phone || "",
      email: storeInfo?.email || "",
      address: storeInfo?.address || "",
      gstin: storeInfo?.gstin || "",
      pan: storeInfo?.pan || "",
      logoUrl: storeInfo?.logoUrl || "",
      bank_name: storeInfo?.bank_name || "",
      account_number: storeInfo?.account_number || "",
      ifsc: storeInfo?.ifsc || "",
      account_holder: storeInfo?.account_holder || storeInfo?.name || "CredSmart Store",
      upi_id: storeInfo?.upi_id || "",
    };

    const selectedBank = propBankDetails?.accountNumber
      ? {
          bankName: propBankDetails.bankName || "",
          accountNumber: propBankDetails.accountNumber,
          ifsc: propBankDetails.ifsc || "",
          branch: propBankDetails.branch || "",
          accountHolder: propBankDetails.accountHolder || safeStore.name,
        }
      : activeSettings.bankAccounts.find((b) => b.id === activeSettings.selectedBankAccountId) ||
        activeSettings.bankAccounts[0] ||
        (safeStore.account_number
          ? {
              bankName: safeStore.bank_name || "",
              accountNumber: safeStore.account_number,
              ifsc: safeStore.ifsc || "",
              branch: "",
              accountHolder: safeStore.account_holder || safeStore.name,
            }
          : null);

    const activeUpiId = propUpiId || activeSettings.selectedPaymentQrUpi || safeStore.upi_id || "";

    const upiPayload = `upi://pay?pa=${encodeURIComponent(
      activeUpiId
    )}&pn=${encodeURIComponent(safeStore.name)}&am=${totals.grandTotal}&cu=INR&tn=${encodeURIComponent(
      `Inv ${invoiceNumber}`
    )}`;

    const currentTerms =
      terms ||
      (docType === "quotation"
        ? activeSettings.termsAndConditions["Quotations"]
        : docType === "delivery_challan"
        ? activeSettings.termsAndConditions["Delivery Challans"]
        : activeSettings.termsAndConditions["Sales Invoices"]) ||
      "1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. This is a computer generated invoice.";

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
              <span>Doc No:</span>
              <strong className="font-bold">{invoiceNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span>{paymentMethod}</span>
            </div>

            {/* Billed To / From */}
            <div className="pt-1 mt-1 border-t border-dotted border-neutral-300">
              <span className="text-[10px] text-neutral-500 font-bold uppercase">
                {isPurchase ? "Supplier:" : "Customer:"}
              </span>
              <p className="font-bold text-[11px] text-neutral-900 truncate">
                {partyInfo?.name || (isPurchase ? "Vendor" : "Walk-in Customer")}
              </p>
              {partyInfo?.phone && <p className="text-[10px] text-neutral-600">Ph: {partyInfo.phone}</p>}
              {partyInfo?.gstin && <p className="text-[10px] text-neutral-600">GSTIN: {partyInfo.gstin}</p>}
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
              {items.map((it, idx) => (
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
                  <td className="py-1 text-right">{it.rate.toFixed(2)}</td>
                  <td className="py-1 text-right font-bold">{it.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-dashed border-neutral-400 pt-1.5 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountTotal && totals.discountTotal > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-₹{totals.discountTotal.toFixed(2)}</span>
              </div>
            ) : null}
            {totalTax > 0 && (
              <>
                {cgstVal > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>CGST:</span>
                    <span>₹{cgstVal.toFixed(2)}</span>
                  </div>
                )}
                {sgstVal > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>SGST:</span>
                    <span>₹{sgstVal.toFixed(2)}</span>
                  </div>
                )}
                {igstVal > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>IGST:</span>
                    <span>₹{igstVal.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            {totals.roundOff && Math.abs(totals.roundOff) > 0.001 ? (
              <div className="flex justify-between text-neutral-600">
                <span>Round Off:</span>
                <span>{totals.roundOff > 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold text-sm border-t border-neutral-900 pt-1 mt-1">
              <span>TOTAL:</span>
              <span>₹{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment & Bank Details on Thermal Receipt */}
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

            {/* Bottom Left Subtle CredSmart Watermark */}
            <div className="mt-1.5 pt-1 border-t border-dotted border-neutral-300 flex items-center justify-between text-[7.5px] text-neutral-400 font-mono">
              <span className="inline-flex items-center justify-center"><img src="/logo-static.jpeg" alt="CredSmart" className="h-2.5 w-auto object-contain grayscale mix-blend-multiply opacity-80" /></span>
              <span>GST Ready</span>
            </div>
          </div>
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. UNIFIED A4 BILL BOOK / INVOICE DESIGN (1-PAGE FIT)
    // ─────────────────────────────────────────────────────────────
    return (
      <div
        ref={ref}
        id="unified-invoice-document"
        className={cn(
          "bg-white text-slate-800 rounded-xl shadow-xl w-full max-w-[740px] mx-auto p-3.5 sm:p-4.5 transition-all duration-300 relative border one-page-invoice box-border",
          isLuxury && "border-amber-300/80 shadow-amber-900/10 font-serif",
          isAdvancedGst && "border-slate-800 font-mono text-[10.5px]",
          !isLuxury && !isAdvancedGst && "border-slate-200",
          className
        )}
      >
        {/* Luxury Gold Badge */}
        {isLuxury && (
          <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none">
            <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-sans text-[8px] font-bold py-0.5 px-7 transform rotate-45 translate-x-5 translate-y-2 shadow-md uppercase tracking-wider text-center">
              LUXURY
            </div>
          </div>
        )}

        {/* Invoice Top Header */}
        <div
          className={cn(
            "pb-2.5 border-b transition-colors",
            activeSettings.styling === "uttarakhand" && "border-b-4",
            activeSettings.styling === "uttarakhand_2" && "border-b-2 bg-gradient-to-r from-slate-50 to-white -mx-3.5 -mt-3.5 p-3 mb-2 rounded-t-xl",
            activeSettings.styling === "jagganth" && "border-b-2 border-dashed",
            activeSettings.styling === "uttar_pradesh" && "border-b-2 shadow-xs",
            activeSettings.styling === "maharashtra" && "border-b-2",
            activeSettings.styling === "gujarat" && "border-b-2 bg-slate-50/70 -mx-3.5 -mt-3.5 p-3 mb-2 rounded-t-xl"
          )}
          style={{ borderColor: primaryHex }}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Store / Business Info */}
            <div className="flex items-start gap-2.5 max-w-[62%]">
              {safeStore.logoUrl ? (
                <img
                  src={safeStore.logoUrl}
                  alt="Store Logo"
                  className="w-10 h-10 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
                  style={{ backgroundColor: bgLightHex, color: primaryHex }}
                >
                  {safeStore.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <h2
                  className={cn(
                    "text-sm sm:text-base font-black tracking-tight leading-tight",
                    isLuxury ? "font-serif text-slate-900" : "font-sans"
                  )}
                  style={{ color: isLuxury ? undefined : primaryHex }}
                >
                  {safeStore.name}
                </h2>
                {safeStore.address && (
                  <p className="text-[9.5px] text-slate-600 mt-0.5 leading-snug line-clamp-2">{safeStore.address}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-600 mt-0.5">
                  {safeStore.phone && (
                    <span>
                      Phone: <strong className="font-semibold text-slate-800">{safeStore.phone}</strong>
                    </span>
                  )}
                  {safeStore.email && (
                    <span>
                      Email: <strong className="font-semibold text-slate-800">{safeStore.email}</strong>
                    </span>
                  )}
                  {safeStore.gstin && (
                    <span>
                      GSTIN: <strong className="font-mono font-bold text-slate-900">{safeStore.gstin}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title & Meta */}
            <div className="text-right">
              <div
                className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider mb-1 shadow-2xs"
                style={{ backgroundColor: primaryHex, color: swatch.textOnPrimary }}
              >
                {docTitle}
              </div>
              <div className="text-[10.5px] space-y-0.5">
                <p>
                  <span className="text-slate-500">Doc No: </span>
                  <strong className="font-mono font-bold text-slate-900">{invoiceNumber}</strong>
                </p>
                {referenceNumber && (
                  <p>
                    <span className="text-slate-500">Ref No: </span>
                    <strong className="font-mono font-medium text-slate-700">{referenceNumber}</strong>
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Date: </span>
                  <strong className="font-semibold text-slate-800">{formattedDate}</strong>
                </p>
                {activeSettings.showTimestamp && formattedTime && (
                  <p>
                    <span className="text-slate-500">Time: </span>
                    <strong className="font-mono text-slate-700">{formattedTime}</strong>
                  </p>
                )}
                {dueDate && (
                  <p>
                    <span className="text-slate-500">Due Date: </span>
                    <strong className="font-mono text-slate-800">{dueDate}</strong>
                  </p>
                )}
                {activeSettings.showPoNumber && activeSettings.poNumber && (
                  <p>
                    <span className="text-slate-500">PO No: </span>
                    <strong className="font-mono text-slate-800">{activeSettings.poNumber}</strong>
                  </p>
                )}
                {activeSettings.showEwayBill && activeSettings.ewayBillNumber && (
                  <p>
                    <span className="text-slate-500">E-Way Bill: </span>
                    <strong className="font-mono text-slate-800">{activeSettings.ewayBillNumber}</strong>
                  </p>
                )}
                {activeSettings.showVehicleNumber && activeSettings.vehicleNumber && (
                  <p>
                    <span className="text-slate-500">Vehicle No: </span>
                    <strong className="font-mono text-slate-800">{activeSettings.vehicleNumber}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To / Party Details */}
        <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-200 text-[11px]">
          {/* Party Box */}
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[9.5px]" style={{ color: primaryHex }}>
                {isPurchase ? "SUPPLIER / VENDOR DETAILS" : "BILL TO (CUSTOMER)"}
              </span>
              {activeSettings.showPartyBalance && partyInfo?.balance !== undefined && partyInfo?.balance !== null && (
                <span className="text-[8.5px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                  Balance: ₹{Number(partyInfo.balance).toFixed(2)}
                </span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-xs">
              {partyInfo?.name || (isPurchase ? "Vendor" : "Walk-in Customer")}
            </p>
            {partyInfo?.address && <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{partyInfo.address}</p>}
            <div className="flex flex-wrap gap-x-2 text-[9.5px] text-slate-600 mt-0.5">
              {partyInfo?.phone && <span>Ph: <strong>{partyInfo.phone}</strong></span>}
              {partyInfo?.gstin && <span>GSTIN: <strong className="font-mono">{partyInfo.gstin}</strong></span>}
            </div>
          </div>

          {/* Payment & Transport Box */}
          <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[9.5px]" style={{ color: primaryHex }}>
                PAYMENT &amp; DISPATCH
              </span>
              <span className="font-semibold text-slate-700 text-[9.5px] uppercase">
                {paymentMethod}
              </span>
            </div>
            <div className="space-y-0.5 text-[10px] text-slate-600">
              <p>
                <span>Payment Mode: </span>
                <strong className="text-slate-900">{paymentMethod}</strong>
              </p>
              <p>
                <span>Place of Supply: </span>
                <strong className="text-slate-800">{safeStore.address?.includes(",") ? safeStore.address.split(",").slice(-2).join(",") : "Local State"}</strong>
              </p>
              <p>
                <span>Terms: </span>
                <strong className="text-slate-800">{docType === "quotation" ? "Net 15 Days" : "Due on Receipt"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-2 mb-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300"
                style={{ backgroundColor: bgLightHex }}
              >
                <th className="py-1.5 px-2 text-center w-8">#</th>
                <th className="py-1.5 px-2">ITEM DESCRIPTION</th>
                <th className="py-1.5 px-2 text-center">HSN</th>
                {activeSettings.columns.batchNo && <th className="py-1.5 px-1.5 text-center">BATCH</th>}
                {activeSettings.columns.expDate && <th className="py-1.5 px-1.5 text-center">EXP</th>}
                {activeSettings.columns.mfgDate && <th className="py-1.5 px-1.5 text-center">MFG</th>}
                {activeSettings.columns.quantity && <th className="py-1.5 px-2 text-center">QTY</th>}
                {activeSettings.columns.pricePerItem && <th className="py-1.5 px-2 text-right">RATE</th>}
                <th className="py-1.5 px-2 text-right">DISC.</th>
                <th className="py-1.5 px-2 text-right">TAX</th>
                <th className="py-1.5 px-2 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10.5px]">
              {items.map((it, idx) => (
                <tr key={it.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2">
                    <p className="font-bold text-slate-900 leading-tight">{it.name}</p>
                    {activeSettings.showItemDescription && it.description && (
                      <p className="text-[9.5px] text-slate-500 italic mt-0.5">{it.description}</p>
                    )}
                    {activeSettings.showAlternateUnit && it.altUnit && (
                      <p className="text-[8.5px] text-blue-600 font-mono">Alt: {it.altUnit}</p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-600">{it.hsn || "-"}</td>

                  {activeSettings.columns.batchNo && (
                    <td className="py-1.5 px-1.5 text-center font-mono text-[9.5px] text-slate-600">
                      {it.batchNo || "-"}
                    </td>
                  )}
                  {activeSettings.columns.expDate && (
                    <td className="py-1.5 px-1.5 text-center font-mono text-[9.5px] text-slate-600">
                      {it.expDate || "-"}
                    </td>
                  )}
                  {activeSettings.columns.mfgDate && (
                    <td className="py-1.5 px-1.5 text-center font-mono text-[9.5px] text-slate-600">
                      {it.mfgDate || "-"}
                    </td>
                  )}

                  {activeSettings.columns.quantity && (
                    <td className="py-1.5 px-2 text-center font-semibold">
                      {(() => {
                        const q = formatItemQuantityDisplay(it);
                        return (
                          <>
                            {q.isDual ? (
                              <div className="leading-tight">
                                <span className="font-bold text-slate-900 block">
                                  {q.primaryLine}
                                </span>
                                <span className="block text-[9px] text-slate-600 font-mono mt-0.5 font-medium">
                                  {q.secondaryLine}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-900">{q.primaryLine}</span>
                            )}
                            {activeSettings.enableFreeQty && it.freeQty && it.freeQty > 0 ? (
                              <span className="block text-[8px] font-bold text-emerald-600 bg-emerald-50 rounded px-1 mt-0.5">
                                +{it.freeQty} Free
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </td>
                  )}

                  {activeSettings.columns.pricePerItem && (
                    <td className="py-1.5 px-2 text-right font-mono">
                      <span>₹{it.rate.toFixed(2)}</span>
                      {activeSettings.priceHistory && it.priceHistory && (
                        <span className="block text-[7.5px] text-slate-400">{it.priceHistory}</span>
                      )}
                    </td>
                  )}

                  <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                    {it.discount && it.discount > 0 ? (
                      <>
                        <span>₹{it.discount.toFixed(2)}</span>
                        {it.discountPercent ? (
                          <span className="block text-[8.5px] text-slate-400">({it.discountPercent}%)</span>
                        ) : null}
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </td>

                  <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                    {it.taxAmount && it.taxAmount > 0 ? (
                      <>
                        <span>₹{it.taxAmount.toFixed(2)}</span>
                        {it.taxRate ? (
                          <span className="block text-[8.5px] text-slate-400">({it.taxRate}%)</span>
                        ) : null}
                      </>
                    ) : (
                      <span>0%</span>
                    )}
                  </td>

                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                    ₹{it.total.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Subtotal row */}
              <tr className="font-bold bg-slate-100/90 text-slate-900 border-t border-slate-300">
                <td colSpan={2} className="py-1.5 px-2 text-left font-black tracking-wider text-[10px]">
                  SUBTOTAL
                </td>
                <td className="py-1.5 px-2 text-center font-mono">-</td>
                {activeSettings.columns.batchNo && <td className="py-1.5 px-1.5" />}
                {activeSettings.columns.expDate && <td className="py-1.5 px-1.5" />}
                {activeSettings.columns.mfgDate && <td className="py-1.5 px-1.5" />}
                {activeSettings.columns.quantity && (
                  <td className="py-1.5 px-2 text-center font-mono font-black">{totalQty}</td>
                )}
                {activeSettings.columns.pricePerItem && <td className="py-1.5 px-2" />}
                <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                  {totals.discountTotal ? `₹${totals.discountTotal.toFixed(2)}` : "-"}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                  ₹{totalTax.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-black">
                  ₹{totals.subtotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Notes & Terms on Left, Calculations & Total on Right */}
        <div className="grid grid-cols-12 gap-2.5 mt-1.5 pt-1.5 border-t border-slate-200">
          {/* Left Notes, Bank, Terms */}
          <div className="col-span-7 space-y-1.5 text-[9px]">
            {notes && (
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-700">NOTES</p>
                <p className="text-slate-600 line-clamp-2">{notes}</p>
              </div>
            )}

            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700">TERMS AND CONDITIONS</p>
              <p className="text-slate-600 whitespace-pre-line leading-tight line-clamp-3">{currentTerms}</p>
            </div>

            {/* Bank details card */}
            {(selectedBank?.accountNumber || activeUpiId) && (
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="space-y-0.5 leading-tight">
                  <p className="font-bold text-slate-800 text-[9px]">Bank Details for NEFT/RTGS/IMPS:</p>
                  {selectedBank?.bankName && <p className="text-slate-600">Bank: <strong className="text-slate-900">{selectedBank.bankName}</strong></p>}
                  {selectedBank?.accountNumber && <p className="text-slate-600">A/C No: <strong className="font-mono text-slate-900">{selectedBank.accountNumber}</strong></p>}
                  {selectedBank?.ifsc && <p className="text-slate-600">IFSC: <strong className="font-mono text-slate-900">{selectedBank.ifsc}</strong> {selectedBank.branch ? `(${selectedBank.branch})` : ""}</p>}
                  {activeUpiId && <p className="text-slate-600">UPI ID: <strong className="font-mono text-slate-900">{activeUpiId}</strong></p>}
                </div>

                {/* Dynamic QR Code */}
                {activeUpiId && (
                  <div className="text-center shrink-0 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <QRCodeSVG value={upiPayload} size={42} level="M" />
                    <p className="text-[7px] font-bold text-slate-700 mt-0.5">Scan &amp; Pay UPI</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Calculations & Grand Total */}
          <div className="col-span-5 space-y-1 text-[10px] text-right">
            <div className="space-y-0.5 text-[9.5px] pb-1 border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{taxableAmt.toFixed(2)}
                </span>
              </div>
              {cgstVal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">CGST:</span>
                  <span className="font-mono text-slate-700">₹{cgstVal.toFixed(2)}</span>
                </div>
              )}
              {sgstVal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">SGST:</span>
                  <span className="font-mono text-slate-700">₹{sgstVal.toFixed(2)}</span>
                </div>
              )}
              {igstVal > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">IGST:</span>
                  <span className="font-mono text-slate-700">₹{igstVal.toFixed(2)}</span>
                </div>
              )}
              {totals.roundOff && Math.abs(totals.roundOff) > 0.001 ? (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff > 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            <div
              className="p-1 rounded-md flex items-center justify-between text-[11px] font-black shadow-2xs"
              style={{ backgroundColor: bgLightHex, color: primaryHex }}
            >
              <span>Grand Total:</span>
              <span className="font-mono text-xs">₹{totals.grandTotal.toFixed(2)}</span>
            </div>

            {totals.paidAmount !== undefined && (
              <div className="flex justify-between text-[9px] text-slate-600 pt-0.5">
                <span>Received Amount:</span>
                <span className="font-mono font-semibold text-slate-800">₹{Number(totals.paidAmount || 0).toFixed(2)}</span>
              </div>
            )}

            {totals.balanceDue !== undefined && totals.balanceDue > 0 && (
              <div className="flex justify-between text-[9px] text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">₹{Number(totals.balanceDue).toFixed(2)}</span>
              </div>
            )}

            {/* Total Amount in Words */}
            <div className="pt-1 text-left">
              <p className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500">Amount (in words):</p>
              <p className="text-[8.5px] font-medium text-slate-800 italic leading-tight line-clamp-2">
                Rupees {numberToWords(totals.grandTotal)} Only
              </p>
            </div>

            {/* Signature Box */}
            <div className="pt-1.5 text-center flex flex-col items-end">
              <div className="w-28 min-h-[32px] border-b border-slate-400 flex items-center justify-center p-0.5">
                {activeSettings.signatureDataUrl ? (
                  <img
                    src={activeSettings.signatureDataUrl}
                    alt="Authorized Signature"
                    className="max-h-7 max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <span className="text-[8px] font-serif italic text-slate-400">For {safeStore.name}</span>
                )}
              </div>
              <p className="text-[8.5px] font-bold text-slate-700 mt-0.5 text-right w-28">
                {activeSettings.signatoryTitle || "Authorized Signatory"}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Footer Branding - Bottom Left Watermark */}
        <div className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[8px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="inline-flex items-center justify-center bg-transparent"><img src="/logo-static.jpeg" alt="CredSmart" className="h-3.5 w-auto object-contain mix-blend-multiply opacity-80" /></span>
            <span>Powered by <strong className="font-bold text-slate-700 dark:text-slate-200">CredSmart POS &amp; Billing</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-[7.5px] text-slate-400 font-mono">
            <span>IT Act 2000 Ready • 100% Tax Compliant</span>
          </div>
        </div>
      </div>
    );
  }
);

UnifiedInvoiceRenderer.displayName = "UnifiedInvoiceRenderer";
