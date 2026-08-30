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
  const conv = it.altUnitConversion && Number(it.altUnitConversion) > 1 ? Number(it.altUnitConversion) : undefined;
  const altUnitName = it.altUnit;

  if (altUnitName && conv) {
    let altQtyVal = it.altQty;
    if (altQtyVal == null && it.qty > 0) {
      if (it.unit && it.unit.toUpperCase() === altUnitName.toUpperCase()) {
        altQtyVal = it.qty;
      } else {
        altQtyVal = Math.round(it.qty / conv) || (it.qty / conv);
      }
    }

    if (altQtyVal != null && altQtyVal > 0) {
      const baseUnitName = (it.unit && it.unit.toUpperCase() !== altUnitName.toUpperCase()) ? cleanUnit : "Pcs";
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
      invoiceNumber,
      referenceNumber,
      date,
      dueDate,
      time,
      storeInfo,
      partyInfo,
      items = [],
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
    const primaryHex = swatch.hex || "#0284C7";
    const bgLightHex = swatch.bgLight || "#F0F9FF";

    const isPurchase = docType === "purchase_invoice" || docType === "debit_note" || docType === "payment_out";

    // Format Dates
    const parsedDate = date instanceof Date ? date : new Date(date || Date.now());
    const formattedDate = !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : String(date);

    // Only format time if explicitly provided or required
    const formattedTime = time || (activeSettings.showTimestamp && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "");

    const docTitle = DOC_TITLE_MAP[docType] || "TAX INVOICE";

    // Calculate tax and totals safely
    const totalTax = totals?.taxTotal !== undefined ? totals.taxTotal : ((totals?.cgst || 0) + (totals?.sgst || 0) + (totals?.igst || 0));
    const taxableAmt = totals?.taxableAmount !== undefined ? totals.taxableAmount : ((totals?.subtotal || 0) - (totals?.discountTotal || 0));
    const cgstVal = totals?.cgst !== undefined ? totals.cgst : (totals?.igst ? 0 : totalTax / 2);
    const sgstVal = totals?.sgst !== undefined ? totals.sgst : (totals?.igst ? 0 : totalTax / 2);
    const igstVal = totals?.igst || 0;

    const safeItems = items || [];
    const totalQty = safeItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    // Detect if batch/exp/mfg or discounts actually exist in line items (avoid empty clutter columns)
    const hasBatchInfo = safeItems.some((it) => !!(it.batchNo || it.expDate || it.mfgDate));
    const hasDiscountInfo = (totals?.discountTotal && totals.discountTotal > 0) || safeItems.some((it) => !!(it.discount && it.discount > 0));
    const hasHsnInfo = safeItems.some((it) => !!(it.hsn && it.hsn.trim() !== ""));

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

    // Bank Details (STRICT: Only resolve if non-empty bank credentials exist, NEVER show dummy post office bank)
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
          branch: "",
          accountHolder: safeStore.account_holder || safeStore.name,
        }
      : null;

    const selectedBank = rawBank?.accountNumber ? rawBank : null;
    const activeUpiId = propUpiId || safeStore.upi_id || "";

    const upiPayload = activeUpiId
      ? `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(
          safeStore.name
        )}&am=${totals?.grandTotal || 0}&cu=INR&tn=${encodeURIComponent(`Inv ${invoiceNumber}`)}`
      : "";

    const defaultSalesTerms =
      "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. This is a computer generated invoice.";

    const currentTerms =
      terms ||
      (docType === "quotation"
        ? activeSettings.termsAndConditions?.["Quotations"]
        : docType === "delivery_challan"
        ? activeSettings.termsAndConditions?.["Delivery Challans"]
        : activeSettings.termsAndConditions?.["Sales Invoices"]) ||
      defaultSalesTerms;

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
            {totals?.discountTotal && totals.discountTotal > 0 ? (
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
            {totals?.roundOff && Math.abs(totals.roundOff) > 0.001 ? (
              <div className="flex justify-between text-neutral-600">
                <span>Round Off:</span>
                <span>{totals.roundOff > 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold text-sm border-t border-neutral-900 pt-1 mt-1">
              <span>TOTAL:</span>
              <span>₹{(totals?.grandTotal || 0).toFixed(2)}</span>
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
    // 2. SINGLE MASTER EXECUTIVE A4 INVOICE DESIGN (CLEAN & ROBUST)
    // ─────────────────────────────────────────────────────────────
    return (
      <div
        ref={ref}
        id="unified-invoice-document"
        className={cn(
          "bg-white text-slate-800 rounded-xl shadow-lg w-full max-w-[760px] mx-auto p-5 sm:p-6 transition-all duration-200 relative border border-slate-200 one-page-invoice box-border",
          className
        )}
      >
        {/* Header: Store Info & Document Title */}
        <div className="pb-3 border-b-2" style={{ borderColor: primaryHex }}>
          <div className="flex items-start justify-between gap-4">
            {/* Store / Business Info */}
            <div className="flex items-start gap-3 max-w-[60%]">
              {safeStore.logoUrl ? (
                <img
                  src={safeStore.logoUrl}
                  alt="Logo"
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-base shrink-0 shadow-xs"
                  style={{ backgroundColor: bgLightHex, color: primaryHex }}
                >
                  {safeStore.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight text-slate-900">
                  {safeStore.name}
                </h2>
                {safeStore.address && (
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{safeStore.address}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9.5px] text-slate-600 mt-1">
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
                  {safeStore.pan && (
                    <span>
                      PAN: <strong className="font-mono text-slate-800">{safeStore.pan}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title & Meta (STRICT: Never show dummy values) */}
            <div className="text-right shrink-0">
              <div
                className="inline-block px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider mb-1.5 shadow-xs"
                style={{ backgroundColor: primaryHex, color: swatch.textOnPrimary }}
              >
                {docTitle}
              </div>
              <div className="text-[10.5px] space-y-0.5">
                <p>
                  <span className="text-slate-500">Doc No: </span>
                  <strong className="font-mono font-bold text-slate-900">{invoiceNumber}</strong>
                </p>
                {referenceNumber && referenceNumber.trim() !== "" && (
                  <p>
                    <span className="text-slate-500">Ref / PO No: </span>
                    <strong className="font-mono font-medium text-slate-700">{referenceNumber}</strong>
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Date: </span>
                  <strong className="font-semibold text-slate-800">{formattedDate}</strong>
                </p>
                {formattedTime ? (
                  <p>
                    <span className="text-slate-500">Time: </span>
                    <strong className="font-mono text-slate-700">{formattedTime}</strong>
                  </p>
                ) : null}
                {dueDate && dueDate.trim() !== "" && (
                  <p>
                    <span className="text-slate-500">Due Date: </span>
                    <strong className="font-mono text-slate-800">{dueDate}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Dispatch Details */}
        <div className="grid grid-cols-2 gap-3 py-2.5 border-b border-slate-200 text-[11px]">
          {/* Party Box */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[9.5px]" style={{ color: primaryHex }}>
                {isPurchase ? "SUPPLIER / VENDOR DETAILS" : "BILL TO (CUSTOMER)"}
              </span>
              {activeSettings.showPartyBalance && partyInfo?.balance !== undefined && partyInfo?.balance !== null && (
                <span className="text-[8.5px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                  Balance: ₹{Number(partyInfo.balance).toFixed(2)}
                </span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-xs">
              {partyInfo?.name || (isPurchase ? "Vendor" : "Walk-in Customer")}
            </p>
            {partyInfo?.address && (
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{partyInfo.address}</p>
            )}
            <div className="flex flex-wrap gap-x-2 text-[9.5px] text-slate-600 mt-1">
              {partyInfo?.phone && <span>Ph: <strong>{partyInfo.phone}</strong></span>}
              {partyInfo?.gstin && <span>GSTIN: <strong className="font-mono">{partyInfo.gstin}</strong></span>}
            </div>
          </div>

          {/* Payment & Transport Box */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[9.5px]" style={{ color: primaryHex }}>
                PAYMENT &amp; SUPPLY
              </span>
              <span className="font-bold text-slate-800 text-[9.5px] uppercase">
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
                <strong className="text-slate-800">
                  {partyInfo?.state || (safeStore.address?.includes(",") ? safeStore.address.split(",").slice(-2).join(",") : "Local State")}
                </strong>
              </p>
              <p>
                <span>Terms: </span>
                <strong className="text-slate-800">{docType === "quotation" ? "Net 15 Days" : "Due on Receipt"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-2.5 mb-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-300"
                style={{ backgroundColor: bgLightHex }}
              >
                <th className="py-2 px-2.5 text-center w-8">#</th>
                <th className="py-2 px-2.5">ITEM DESCRIPTION</th>
                {hasHsnInfo && <th className="py-2 px-2 text-center">HSN</th>}
                {hasBatchInfo && <th className="py-2 px-2 text-center">BATCH / EXP</th>}
                <th className="py-2 px-2.5 text-center">QTY</th>
                <th className="py-2 px-2.5 text-right">RATE</th>
                {hasDiscountInfo && <th className="py-2 px-2 text-right">DISC.</th>}
                <th className="py-2 px-2 text-right">GST %</th>
                <th className="py-2 px-2.5 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10.5px]">
              {safeItems.map((it, idx) => (
                <tr key={it.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="py-2 px-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2.5">
                    <p className="font-bold text-slate-900 leading-tight">{it.name}</p>
                    {it.description && (
                      <p className="text-[9.5px] text-slate-500 italic mt-0.5">{it.description}</p>
                    )}
                  </td>
                  {hasHsnInfo && (
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{it.hsn || "-"}</td>
                  )}
                  {hasBatchInfo && (
                    <td className="py-2 px-2 text-center font-mono text-[9.5px] text-slate-600">
                      {it.batchNo ? <span>B:{it.batchNo} </span> : null}
                      {it.expDate ? <span className="text-slate-400">Exp:{it.expDate}</span> : null}
                      {!it.batchNo && !it.expDate ? "-" : null}
                    </td>
                  )}

                  {/* Quantity with Dual Unit Display */}
                  <td className="py-2 px-2.5 text-center font-semibold">
                    {(() => {
                      const q = formatItemQuantityDisplay(it);
                      return q.isDual ? (
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
                      );
                    })()}
                  </td>

                  {/* Rate */}
                  <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                    ₹{(it.rate || 0).toFixed(2)}
                  </td>

                  {/* Discount (if applicable) */}
                  {hasDiscountInfo && (
                    <td className="py-2 px-2 text-right font-mono text-slate-600">
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
                  )}

                  {/* GST */}
                  <td className="py-2 px-2 text-right font-mono text-slate-600">
                    {it.taxRate !== undefined ? `${it.taxRate}%` : "0%"}
                  </td>

                  {/* Amount */}
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                    ₹{(it.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Subtotal row */}
              <tr className="font-bold bg-slate-100/90 text-slate-900 border-t border-slate-300">
                <td colSpan={2} className="py-2 px-2.5 text-left font-black tracking-wider text-[10px]">
                  SUBTOTAL
                </td>
                {hasHsnInfo && <td className="py-2 px-2 text-center font-mono">-</td>}
                {hasBatchInfo && <td className="py-2 px-2 text-center font-mono">-</td>}
                <td className="py-2 px-2.5 text-center font-mono font-black">{totalQty}</td>
                <td className="py-2 px-2.5" />
                {hasDiscountInfo && (
                  <td className="py-2 px-2 text-right font-mono text-slate-700">
                    {totals?.discountTotal ? `₹${totals.discountTotal.toFixed(2)}` : "-"}
                  </td>
                )}
                <td className="py-2 px-2 text-right font-mono text-slate-700">
                  ₹{totalTax.toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-right font-mono font-black">
                  ₹{(totals?.subtotal || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Full Width Amount in Words Banner (Guaranteed Clean & Never Cut Off) */}
        <div className="my-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-left">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[9px]">Amount in Words:</span>
            <span className="font-semibold text-slate-900 capitalize">
              INR Rupees {numberToWords(totals?.grandTotal || 0)} Only
            </span>
          </div>
        </div>

        {/* Bottom Section: Notes & Terms on Left, Calculations & Total on Right */}
        <div className="grid grid-cols-12 gap-3.5 mt-2 pt-2 border-t border-slate-200">
          {/* Left Column (60% width): Bank Details & Terms */}
          <div className="col-span-7 space-y-2 text-[9.5px]">
            {/* Bank Details Card (ONLY if real bank credentials or UPI exists) */}
            {(selectedBank?.accountNumber || activeUpiId) && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5 leading-tight">
                  <p className="font-bold text-slate-800 text-[10px]">Bank Details for Direct Payment:</p>
                  {selectedBank?.bankName && (
                    <p className="text-slate-600">Bank: <strong className="text-slate-900">{selectedBank.bankName}</strong></p>
                  )}
                  {selectedBank?.accountNumber && (
                    <p className="text-slate-600">A/C No: <strong className="font-mono text-slate-900">{selectedBank.accountNumber}</strong></p>
                  )}
                  {selectedBank?.ifsc && (
                    <p className="text-slate-600">IFSC: <strong className="font-mono text-slate-900">{selectedBank.ifsc}</strong> {selectedBank.branch ? `(${selectedBank.branch})` : ""}</p>
                  )}
                  {selectedBank?.accountHolder && (
                    <p className="text-slate-600">A/C Name: <strong className="text-slate-900">{selectedBank.accountHolder}</strong></p>
                  )}
                  {activeUpiId && (
                    <p className="text-slate-600">UPI ID: <strong className="font-mono text-slate-900">{activeUpiId}</strong></p>
                  )}
                </div>

                {/* Dynamic QR Code */}
                {activeUpiId && upiPayload && (
                  <div className="text-center shrink-0 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <QRCodeSVG value={upiPayload} size={48} level="M" />
                    <p className="text-[7.5px] font-bold text-slate-700 mt-0.5">Scan to Pay</p>
                  </div>
                )}
              </div>
            )}

            {/* Terms & Conditions */}
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700 text-[9px] mb-0.5">TERMS AND CONDITIONS</p>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[9px]">{currentTerms}</p>
            </div>

            {/* Notes */}
            {notes && (
              <div className="pt-0.5">
                <p className="font-bold uppercase tracking-wider text-slate-700 text-[9px] mb-0.5">NOTES</p>
                <p className="text-slate-600 leading-snug">{notes}</p>
              </div>
            )}
          </div>

          {/* Right Column (40% width): Calculations & Total & Signatory */}
          <div className="col-span-5 space-y-1.5 text-[10.5px] text-right">
            <div className="space-y-1 pb-1.5 border-b border-slate-200">
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
              {totals?.roundOff && Math.abs(totals.roundOff) > 0.001 ? (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff > 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            {/* Grand Total Highlight */}
            <div
              className="p-1.5 rounded-lg flex items-center justify-between text-xs font-black shadow-xs"
              style={{ backgroundColor: bgLightHex, color: primaryHex }}
            >
              <span>Grand Total:</span>
              <span className="font-mono text-sm">₹{(totals?.grandTotal || 0).toFixed(2)}</span>
            </div>

            {totals?.paidAmount !== undefined && (
              <div className="flex justify-between text-[9.5px] text-slate-600 pt-0.5">
                <span>Received Amount:</span>
                <span className="font-mono font-semibold text-slate-800">₹{Number(totals.paidAmount || 0).toFixed(2)}</span>
              </div>
            )}

            {totals?.balanceDue !== undefined && totals.balanceDue > 0 && (
              <div className="flex justify-between text-[9.5px] text-rose-600 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">₹{Number(totals.balanceDue).toFixed(2)}</span>
              </div>
            )}

            {/* Signature Box */}
            <div className="pt-2 text-center flex flex-col items-end">
              <div className="w-32 min-h-[36px] border-b border-slate-400 flex items-center justify-center p-0.5">
                {activeSettings.signatureDataUrl ? (
                  <img
                    src={activeSettings.signatureDataUrl}
                    alt="Authorized Signature"
                    className="max-h-8 max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <span className="text-[8.5px] italic text-slate-400">For {safeStore.name}</span>
                )}
              </div>
              <p className="text-[9px] font-bold text-slate-700 mt-1 text-right w-32">
                {activeSettings.signatoryTitle || "Authorized Signatory"}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Footer Branding */}
        <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[8px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="inline-flex items-center justify-center bg-transparent">
              <img src="/logo-static.jpeg" alt="CredSmart" className="h-3.5 w-auto object-contain mix-blend-multiply opacity-80" />
            </span>
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
