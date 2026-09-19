import React from "react";
import { ArrowLeft, Edit2, Trash2, MoreVertical, X, Clock, CheckCircle, Printer, Download, Share2, FileText, ChevronRight } from "lucide-react";
import { BusinessDocument } from "@/types/documents";

interface MobileInvoiceSuccessViewProps {
  invoice: BusinessDocument | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onGenerateEwayBill?: () => void;
}

export function MobileInvoiceSuccessView({
  invoice,
  onClose,
  onEdit,
  onDelete,
  onPrint,
  onDownload,
  onShare,
  onGenerateEwayBill
}: MobileInvoiceSuccessViewProps) {
  if (!invoice) return null;

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-100 overflow-y-auto">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-indigo-700 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[16px] font-bold text-slate-900">
              {invoice.type === 'sales_invoice' ? 'Sales Invoice Created' : 'Purchase Invoice Created'}
            </h1>
            <span className="text-[12px] text-slate-500 font-medium">#{invoice.documentNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={onEdit} className="p-1.5 text-blue-600">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1.5 text-rose-500">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-1.5 text-indigo-700">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Promo Banner */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 relative shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-[14px] text-slate-900">Celebrate New Theme(s)</span>
            <span className="text-[12px] text-slate-500">New exclusive theme styling available</span>
          </div>
          <button className="text-slate-400 p-0.5"><X className="w-4 h-4" /></button>
        </div>
        <button className="mt-3 bg-slate-900 text-white rounded-md px-6 py-1.5 text-[12px] font-medium w-max">
          Explore Now
        </button>
      </div>

      {/* 3. PDF Preview Container */}
      <div className="p-6 bg-slate-100 flex items-center justify-center shrink-0">
        <div className="bg-white shadow-sm border border-slate-300 w-full aspect-[1/1.4] p-4 flex flex-col relative overflow-hidden">
           {/* Skeleton of PDF */}
           <div className="w-full flex justify-between border-b border-slate-200 pb-2 mb-2">
              <div className="w-1/3 h-4 bg-slate-200 rounded"></div>
              <div className="w-1/4 h-6 bg-slate-200 rounded"></div>
           </div>
           <div className="w-1/2 h-3 bg-slate-100 rounded mb-1"></div>
           <div className="w-1/3 h-3 bg-slate-100 rounded mb-4"></div>
           
           <div className="w-full border border-slate-200 rounded-sm mb-4">
              <div className="bg-slate-50 h-5 border-b border-slate-200"></div>
              <div className="h-4 border-b border-slate-100 mt-2 mx-1 bg-slate-50 w-full"></div>
              <div className="h-4 border-b border-slate-100 mt-2 mx-1 bg-slate-50 w-3/4"></div>
           </div>

           <div className="mt-auto flex justify-between items-end">
              <div className="w-1/4 h-12 bg-slate-100 rounded"></div>
              <div className="w-1/3 flex flex-col gap-1">
                <div className="h-3 w-full bg-slate-100"></div>
                <div className="h-3 w-3/4 bg-slate-100 self-end"></div>
                <div className="h-4 w-full bg-slate-200 mt-1"></div>
              </div>
           </div>
        </div>
      </div>

      {/* 4. Remove Logo Banner */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center relative border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold">X</span>
          </div>
          <span className="text-[13px] text-slate-700 font-medium">Remove app logo</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* 5. Activity Summary */}
      <div className="bg-white p-4 shrink-0 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">Last Activity by User</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[18px] font-bold text-slate-900">
              ₹ {invoice.totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-slate-900">{invoice.partyName || "Cash Sale"}</span>
            <span className="text-[13px] text-slate-500">Invoice #{invoice.documentNumber}</span>
          </div>
          {invoice.paymentStatus === 'paid' && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-emerald-600">Paid</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          )}
        </div>
      </div>

      {/* 6. Action Buttons Row */}
      <div className="bg-white flex flex-wrap justify-between gap-4 px-6 py-6 border-b border-slate-100 shrink-0">
        <button onClick={onDownload} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-700 bg-indigo-50/50">
            <Download className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 text-center">Download</span>
        </button>
        <button onClick={onPrint} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-700 bg-indigo-50/50">
            <Printer className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 text-center">Print</span>
        </button>
        <button onClick={onShare} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-700 bg-indigo-50/50">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 text-center">Share</span>
        </button>
        <button onClick={onGenerateEwayBill} className="flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full border border-indigo-200 flex items-center justify-center text-indigo-700 bg-indigo-50/50">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 text-center">E-Way Bill</span>
        </button>
      </div>

      {/* Padding for sticky footer */}
      <div className="h-24 shrink-0"></div>

      {/* 7. Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))] z-30">
        <button 
          onClick={onClose}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
