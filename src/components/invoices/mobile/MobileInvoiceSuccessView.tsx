import React from "react";
import { ArrowLeft, Edit2, Trash2, MoreVertical, X, Clock, CheckCircle, Printer, Download, Share2, FileText, ChevronRight } from "lucide-react";
import { BusinessDocument } from "@/types/documents";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";

interface MobileInvoiceSuccessViewProps {
  invoice: BusinessDocument;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateEwayBill?: () => void;
  /** Store info for PDF generation */
  storeInfo?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
}

export function MobileInvoiceSuccessView({
  invoice,
  onClose,
  onEdit,
  onDelete,
  onGenerateEwayBill,
  storeInfo,
}: MobileInvoiceSuccessViewProps) {
  const [promoBannerVisible, setPromoBannerVisible] = React.useState(true);

  const buildPdfPayload = () => ({
    invoiceNumber: invoice.documentNumber,
    referenceNumber: invoice.referenceNumber,
    docType: invoice.docType as any,
    date: invoice.docDate,
    dueDate: invoice.dueDate,
    customerName: invoice.partyName,
    customerPhone: invoice.partyPhone,
    customerAddress: invoice.partyAddress,
    customerGstin: invoice.partyGstin,
    storeName: storeInfo?.name || "CredSmart Store",
    storePhone: storeInfo?.phone,
    storeEmail: storeInfo?.email,
    storeAddress: storeInfo?.address,
    storeGstin: storeInfo?.gstin,
    totalAmount: invoice.grandTotal,
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountTotal ?? 0,
    tax: invoice.taxTotal ?? 0,
    roundOff: invoice.roundOff ?? 0,
    paymentMethod: invoice.paymentMethod,
    notes: invoice.notes,
    terms: invoice.terms,
    items: invoice.items.map((it) => ({
      name: it.productName,
      quantity: it.quantity,
      unit: it.unit || "PCS",
      altUnit: it.altUnit,
      altQty: it.altQty,
      altUnitConversion: it.altUnitConversion,
      rate: it.rate,
      total: it.lineTotal,
      hsn: it.hsn,
      taxRate: it.taxRate,
      batchNo: it.batchNumber,
      expDate: it.expiryDate,
    })),
  });

  const handleDownload = () => {
    downloadExactInvoicePdf(buildPdfPayload());
  };

  const handlePrint = () => {
    downloadExactInvoicePdf(buildPdfPayload());
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.documentNumber}`,
          text: `Invoice ${invoice.documentNumber} - ₹${invoice.grandTotal.toLocaleString("en-IN")} for ${invoice.partyName || "Cash Sale"}`,
        });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(
          `Invoice ${invoice.documentNumber} - ₹${invoice.grandTotal.toLocaleString("en-IN")} for ${invoice.partyName || "Cash Sale"}`
        );
      } catch {
        // ignore
      }
    }
  };

  const isSalesType = invoice.docType === "sales_invoice" || invoice.docType === "sales_order" || invoice.docType === "estimate" || invoice.docType === "delivery_challan" || invoice.docType === "proforma_invoice" || invoice.docType === "credit_note";

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-100 overflow-y-auto lg:hidden">
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-indigo-700 cursor-pointer active:opacity-60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-bold text-slate-900 leading-tight">
              {isSalesType ? "Sales Invoice Created" : "Purchase Invoice Created"}
            </h1>
            <span className="text-[12px] text-slate-500 font-medium">#{invoice.documentNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-2 text-blue-600 active:opacity-60">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-2 text-rose-500 active:opacity-60">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-indigo-700 active:opacity-60">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── 2. Promo Banner (dismissible) ── */}
      {promoBannerVisible && (
        <div className="bg-white px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[14px] text-slate-900">Celebrate New Theme(s)</span>
              <span className="text-[12px] text-slate-500">New exclusive theme styling available</span>
            </div>
            <button onClick={() => setPromoBannerVisible(false)} className="text-slate-400 p-0.5 active:opacity-60">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button className="mt-3 bg-slate-900 text-white rounded-md px-6 py-1.5 text-[12px] font-medium w-max active:opacity-80">
            Explore Now
          </button>
        </div>
      )}

      {/* ── 3. PDF Preview Container ── */}
      <div className="p-5 bg-slate-100 flex items-center justify-center shrink-0">
        <div className="bg-white shadow-sm border border-slate-200 w-full aspect-[1/1.4] rounded-sm p-4 flex flex-col relative overflow-hidden">
          {/* Mini invoice skeleton with real data */}
          <div className="w-full flex justify-between border-b border-slate-200 pb-2 mb-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                {isSalesType ? "Sales Invoice" : "Purchase Invoice"}
              </span>
              <span className="text-[7px] text-slate-400">#{invoice.documentNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[7px] text-slate-400 block">Date</span>
              <span className="text-[8px] font-medium text-slate-600">{invoice.docDate}</span>
            </div>
          </div>

          <div className="mb-3">
            <span className="text-[7px] text-slate-400 uppercase tracking-wider">Bill To</span>
            <p className="text-[9px] font-medium text-slate-700 mt-0.5">{invoice.partyName || "Cash Sale"}</p>
            {invoice.partyPhone && <p className="text-[7px] text-slate-400">{invoice.partyPhone}</p>}
          </div>

          {/* Items table skeleton */}
          <div className="w-full border border-slate-200 rounded-sm mb-3 flex-1 min-h-0 overflow-hidden">
            <div className="bg-slate-50 px-1.5 py-1 border-b border-slate-200 flex gap-1">
              <span className="text-[6px] font-bold text-slate-500 flex-1">Item</span>
              <span className="text-[6px] font-bold text-slate-500 w-6 text-center">Qty</span>
              <span className="text-[6px] font-bold text-slate-500 w-10 text-right">Amount</span>
            </div>
            {invoice.items.slice(0, 4).map((item, i) => (
              <div key={i} className="flex gap-1 px-1.5 py-0.5 border-b border-slate-100">
                <span className="text-[7px] text-slate-600 flex-1 truncate">{item.productName}</span>
                <span className="text-[7px] text-slate-500 w-6 text-center">{item.quantity}</span>
                <span className="text-[7px] text-slate-600 w-10 text-right">₹{item.lineTotal.toLocaleString("en-IN")}</span>
              </div>
            ))}
            {invoice.items.length > 4 && (
              <div className="px-1.5 py-0.5 text-[6px] text-slate-400 text-center">
                +{invoice.items.length - 4} more item(s)
              </div>
            )}
          </div>

          {/* Footer totals */}
          <div className="mt-auto flex justify-end border-t border-slate-200 pt-1.5">
            <div className="flex flex-col gap-0.5 items-end">
              {invoice.taxTotal > 0 && (
                <div className="flex gap-3">
                  <span className="text-[7px] text-slate-400">Tax</span>
                  <span className="text-[7px] text-slate-600">₹{invoice.taxTotal.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="text-[8px] font-bold text-slate-700">Total</span>
                <span className="text-[8px] font-bold text-slate-900">₹{invoice.grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Remove Logo Banner ── */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0 active:bg-slate-50 cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold">✕</span>
          </div>
          <span className="text-[13px] text-slate-700 font-medium">Remove app logo</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* ── 5. Activity Summary ── */}
      <div className="bg-white p-4 shrink-0">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">Last Activity</span>
          </div>
          <span className="text-[18px] font-bold text-slate-900">
            ₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-slate-900">{invoice.partyName || "Cash Sale"}</span>
            <span className="text-[13px] text-slate-500">Invoice #{invoice.documentNumber}</span>
          </div>
          {invoice.status === "paid" && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-emerald-600">Paid</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          )}
          {invoice.status === "partial" && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-medium text-amber-600">Partial</span>
            </div>
          )}
          {invoice.status === "unpaid" && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-medium text-rose-500">Unpaid</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Action Buttons Row ── */}
      <div className="bg-white flex justify-around px-2 sm:px-4 py-5 border-t border-slate-100 shrink-0">
        {onEdit && (
          <button onClick={onEdit} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
              <Edit2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700">Edit</span>
          </button>
        )}
        <button onClick={handlePrint} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Printer className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Print</span>
        </button>
        <button onClick={handleDownload} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Download className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Download</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Share</span>
        </button>
        <button onClick={onGenerateEwayBill} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">E-Way Bill</span>
        </button>
      </div>

      {/* Spacer for sticky footer */}
      <div className="h-24 shrink-0" />

      {/* ── 7. Sticky Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-3">
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 py-3.5 rounded-xl font-bold text-[15px] shadow-sm active:bg-indigo-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Bill</span>
          </button>
        )}
        <button
          onClick={onClose}
          className={`flex-1 flex items-center justify-center bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-sm active:bg-indigo-700 transition-colors ${!onEdit ? "w-full" : ""}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
