import React, { useRef } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  FileText,
  Building2,
  User,
  Calendar,
  CreditCard,
  Truck,
  Edit3,
} from "lucide-react";
import { DocumentLineItem } from "@/types/documents";
import { UnifiedInvoiceRenderer } from "../UnifiedInvoiceRenderer";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface MobileBillPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onGenerateBill: () => void;
  docType?: string;
  invoiceNumber: string;
  docDate: string;
  dueDate?: string;
  partyName: string;
  partyPhone?: string;
  partyGstin?: string;
  partyAddress?: string;
  placeOfSupply?: string;
  items: DocumentLineItem[];
  totals: {
    rawSubtotal?: number;
    subtotal?: number;
    totalDiscount?: number;
    discountTotal?: number;
    taxableTotal?: number;
    cgstTotal?: number;
    sgstTotal?: number;
    igstTotal?: number;
    taxTotal?: number;
    additionalCharges?: number;
    roundOff?: number;
    grandTotal: number;
  };
  storeInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    pan?: string;
    bank_name?: string;
    account_number?: string;
    ifsc?: string;
    account_holder?: string;
    branch?: string;
    upi_id?: string;
  };
  amountReceived?: number;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
  ewayBillNo?: string;
  vehicleNumber?: string;
  poReference?: string;
}

export function MobileBillPreviewModal({
  open,
  onClose,
  onGenerateBill,
  docType = "sales_invoice",
  invoiceNumber,
  docDate,
  dueDate,
  partyName,
  partyPhone,
  partyGstin,
  partyAddress,
  placeOfSupply,
  items,
  totals,
  storeInfo,
  amountReceived = 0,
  paymentMethod = "Cash",
  notes,
  terms,
  ewayBillNo,
  vehicleNumber,
  poReference,
}: MobileBillPreviewModalProps) {
  const invoiceContainerRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const validItems = items.filter(
    (it) => (it.productName && it.productName.trim() !== "") || Number(it.rate) > 0 || Number(it.lineTotal) > 0
  );

  const grandTotal = totals?.grandTotal || 0;
  const balanceDue = Math.max(0, grandTotal - (amountReceived || 0));

  const handleDownloadPdf = async () => {
    if (!invoiceContainerRef.current) return;
    const toastId = toast.loading("Generating Invoice PDF...");
    try {
      const element = invoiceContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice-${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
      toast.success("Invoice PDF downloaded successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  const handleShare = () => {
    const summary = `Bill Preview for ${partyName || "Customer"}:\nInvoice No: ${invoiceNumber}\nDate: ${docDate}\nItems: ${validItems.length}\nGrand Total: ₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\nCredSmart Billing`;
    if (navigator.share) {
      navigator.share({ title: `Invoice ${invoiceNumber}`, text: summary }).catch(() => {});
    } else {
      navigator.clipboard.writeText(summary);
      toast.success("Bill summary copied to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-950 w-full h-[100dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top App Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-bold text-slate-900 dark:text-white leading-none">
                  Bill Preview
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Pre-save
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {invoiceNumber} • {docDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Share Summary"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin">
          {/* Quick Notice Header */}
          <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Review all details before issuing this bill to <strong>{partyName || "Walk-in Customer"}</strong>.
              </span>
            </div>
          </div>

          {/* Render Actual Invoice using UnifiedInvoiceRenderer inside responsive paper canvas */}
          <div className="bg-white text-slate-900 rounded-xl shadow-xs border border-slate-200 overflow-x-auto p-2 sm:p-4">
            <div ref={invoiceContainerRef} className="min-w-[650px] p-2 bg-white text-slate-900">
              <UnifiedInvoiceRenderer
                docType={docType as any}
                invoiceNumber={invoiceNumber}
                date={docDate}
                dueDate={dueDate}
                time={new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                referenceNumber={ewayBillNo}
                vehicleNumber={vehicleNumber}
                poReference={poReference}
                placeOfSupply={placeOfSupply}
                deliveryCharge={totals?.additionalCharges || 0}
                storeInfo={{
                  name: storeInfo?.name || "CredSmart Store",
                  phone: storeInfo?.phone || "",
                  email: storeInfo?.email || "",
                  address: storeInfo?.address || "",
                  gstin: storeInfo?.gstin || "",
                  pan: storeInfo?.pan || "",
                  bank_name: storeInfo?.bank_name,
                  account_number: storeInfo?.account_number,
                  ifsc: storeInfo?.ifsc,
                  account_holder: storeInfo?.account_holder,
                  branch: storeInfo?.branch,
                  upi_id: storeInfo?.upi_id,
                }}
                partyInfo={{
                  name: partyName || "Walk-in Customer",
                  phone: partyPhone,
                  address: partyAddress,
                  gstin: partyGstin,
                  state: placeOfSupply,
                }}
                items={validItems.map((it) => ({
                  id: it.id,
                  name: it.productName || "Item",
                  hsn: it.hsn,
                  qty: Number(it.quantity) || 1,
                  unit: it.unit || "Pcs",
                  altUnit: it.altUnit,
                  altQty: it.altQty,
                  altUnitConversion: it.altUnitConversion,
                  rate: Number(it.rate) || 0,
                  discount: it.discountPercent || 0,
                  discountPercent: it.discountPercent,
                  taxRate: it.taxRate || 0,
                  taxAmount: ((it.taxRate || 0) * (it.taxableAmount || 0)) / 100,
                  total: it.lineTotal,
                }))}
                totals={{
                  subtotal: totals?.rawSubtotal || totals?.subtotal || 0,
                  discountTotal: totals?.totalDiscount || totals?.discountTotal || 0,
                  taxableAmount: totals?.taxableTotal || 0,
                  cgst: totals?.cgstTotal || 0,
                  sgst: totals?.sgstTotal || 0,
                  igst: totals?.igstTotal || 0,
                  taxTotal: totals?.taxTotal || 0,
                  additionalCharges: totals?.additionalCharges || 0,
                  roundOff: totals?.roundOff || 0,
                  grandTotal: grandTotal,
                }}
                paymentInfo={{
                  status: amountReceived >= grandTotal ? "paid" : amountReceived > 0 ? "partial" : "unpaid",
                  amountPaid: amountReceived,
                  balanceDue: balanceDue,
                  paymentMethod: paymentMethod,
                }}
                notes={notes}
                termsAndConditions={terms}
              />
            </div>
          </div>

          <div className="h-6" />
        </div>

        {/* Sticky Action Footer */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 shrink-0 flex items-center justify-between gap-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Bill</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onGenerateBill();
            }}
            className="flex-[1.4] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Generate Bill Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
