import React from "react";
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  X, 
  Clock, 
  CheckCircle, 
  Printer, 
  Download, 
  Share2, 
  FileText, 
  ChevronRight,
  Copy,
  MessageCircle,
  Ban
} from "lucide-react";
import { BusinessDocument } from "@/types/documents";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { UnifiedInvoiceRenderer } from "../UnifiedInvoiceRenderer";
import { loadInvoiceSettings } from "@/utils/invoiceThemeLoader";
import { MobileInvoiceFitViewer } from "./MobileInvoiceFitViewer";

interface MobileInvoiceSuccessViewProps {
  invoice: BusinessDocument;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onVoid?: () => void;
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
  onDuplicate,
  onVoid,
  onGenerateEwayBill,
  storeInfo,
}: MobileInvoiceSuccessViewProps) {
  const [promoBannerVisible, setPromoBannerVisible] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);

  const invoiceSettings = React.useMemo(() => loadInvoiceSettings(), []);

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
    items: (invoice.items || []).map((it) => ({
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

  const handleWhatsAppShare = () => {
    const store = storeInfo?.name || "CredSmart Store";
    const customer = invoice.partyName || "Valued Customer";
    const total = `₹${invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const message = 
      `🧾 *${store.toUpperCase()} - TAX INVOICE*\n\n` +
      `Hello *${customer}*,\n` +
      `Here is your invoice summary:\n` +
      `• *Invoice No:* #${invoice.documentNumber}\n` +
      `• *Date:* ${invoice.docDate}\n` +
      `• *Total Amount:* ${total}\n` +
      `• *Status:* ${invoice.status.toUpperCase()}\n\n` +
      `Thank you for your business!`;

    const rawPhone = invoice.partyPhone ? invoice.partyPhone.replace(/\D/g, "") : "";
    const phoneParam = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `91${rawPhone}` : rawPhone) : "";

    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
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
            <button 
              onClick={onEdit} 
              className="p-2 text-blue-600 active:opacity-60 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)} 
              className="p-2 text-rose-500 active:opacity-60 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setIsMoreMenuOpen((prev) => !prev)} 
            className="p-2 text-indigo-700 active:opacity-60 cursor-pointer"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── 2. Activity Summary (Above the Fold) ── */}
      <div className="bg-white p-4 shrink-0 border-b border-slate-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">Last Activity</span>
          </div>
          <span className="text-[20px] font-extrabold text-slate-900 tracking-tight">
            ₹{invoice.grandTotal === 0 ? "0" : Number(invoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
          {invoice.status === "cancelled" && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Cancelled</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Action Buttons Row (Above the Fold - 5 Buttons) ── */}
      <div className="bg-white flex justify-around px-2 sm:px-4 py-4 border-b border-slate-200 shrink-0 shadow-xs">
        {onEdit && (
          <button onClick={onEdit} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60 cursor-pointer">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
              <Edit2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700">Edit</span>
          </button>
        )}
        <button onClick={handlePrint} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60 cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Printer className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Print</span>
        </button>
        <button onClick={handleDownload} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60 cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Download className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Download</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60 cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Share</span>
        </button>
        <button onClick={onGenerateEwayBill} className="flex flex-col items-center gap-2 min-w-[56px] active:opacity-60 cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-600 bg-indigo-50/60">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">E-Way Bill</span>
        </button>
      </div>

      {/* ── 4. Actual Rendered Invoice Preview (Fitted to Mobile Screen) ── */}
      <div className="p-3 sm:p-4 flex-1">
        <MobileInvoiceFitViewer
          title={isSalesType ? "Sales Invoice" : "Purchase Invoice"}
          badge={
            <div className="flex items-center gap-2">
              {(invoice.items || []).length > 4 && (
                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                  +{(invoice.items || []).length - 4} more item(s)
                </span>
              )}
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200/60 rounded px-2 py-0.5">
                Theme: {invoiceSettings.themeId || "Classic"}
              </span>
            </div>
          }
        >
          <div className="p-1 sm:p-2 bg-white text-slate-900">
            <UnifiedInvoiceRenderer
              docType={invoice.docType as any}
              invoiceNumber={invoice.documentNumber}
              referenceNumber={invoice.referenceNumber}
              date={invoice.docDate}
              dueDate={invoice.dueDate}
              time={new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              placeOfSupply={invoice.placeOfSupply}
              storeInfo={{
                name: storeInfo?.name || "CredSmart Store",
                phone: storeInfo?.phone || "",
                email: storeInfo?.email || "",
                address: storeInfo?.address || "",
                gstin: storeInfo?.gstin || "",
              }}
              partyInfo={{
                name: invoice.partyName || "Cash Sale",
                phone: invoice.partyPhone,
                address: invoice.partyAddress,
                gstin: invoice.partyGstin,
              }}
              items={(invoice.items || []).map((it) => ({
                name: it.productName,
                qty: it.quantity,
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
              }))}
              totals={{
                subtotal: invoice.subtotal,
                discountTotal: invoice.discountTotal,
                taxableAmount: invoice.taxableTotal,
                cgst: invoice.cgstTotal,
                sgst: invoice.sgstTotal,
                igst: invoice.igstTotal,
                taxTotal: invoice.taxTotal,
                roundOff: invoice.roundOff,
                grandTotal: invoice.grandTotal,
                paidAmount: invoice.paidAmount,
                balanceDue: invoice.balanceDue,
              }}
              paymentMethod={invoice.paymentMethod}
              notes={invoice.notes}
              terms={invoice.terms}
              settings={invoiceSettings}
            />
          </div>
        </MobileInvoiceFitViewer>
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

      {/* ── 8. Delete Confirmation Bottom Sheet / Dialog (Requirement R3) ── */}
      {isDeleteConfirmOpen && (
        <div 
          className="fixed inset-0 z-[600] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
                  Delete Invoice
                </h3>
                <span className="text-xs text-slate-500 font-medium">#{invoice.documentNumber}</span>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              Delete this invoice? This action cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  onDelete?.();
                }}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. More Options Action Sheet (Requirement R4) ── */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-[600] bg-black/50 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-t-2xl p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-250 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="More options"
          >
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Actions</span>
              <span className="text-xs text-slate-400 font-medium">#{invoice.documentNumber}</span>
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onDuplicate?.();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100">
                  <Copy className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-slate-900">Duplicate / Copy Bill</span>
                  <span className="text-xs text-slate-500">Create new bill with same items</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  handleWhatsAppShare();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center gap-3.5 hover:bg-emerald-50/60 active:bg-emerald-100/60 transition-colors text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-slate-900">Share via WhatsApp</span>
                  <span className="text-xs text-slate-500">Direct message with invoice summary</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  handleDownload();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-slate-900">Download Thermal Receipt / PDF</span>
                  <span className="text-xs text-slate-500">Save clean PDF file to device</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onVoid?.();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center gap-3.5 hover:bg-rose-50/60 active:bg-rose-100/60 transition-colors text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100">
                  <Ban className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-semibold text-rose-700">Cancel / Void Invoice</span>
                  <span className="text-xs text-rose-500">Mark invoice status as cancelled</span>
                </div>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-full min-h-[48px] py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-sm text-center transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
