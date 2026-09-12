import React from "react";
import { ArrowLeft, Pen, Trash2, MoreVertical, X, Clock, Check, Printer, Download, Share2, ChevronRight } from "lucide-react";
import { BusinessDocument } from "@/types/documents";

interface MobileInvoiceSuccessViewProps {
  invoice: BusinessDocument;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MobileInvoiceSuccessView({ invoice, onClose, onEdit, onDelete }: MobileInvoiceSuccessViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-1 text-indigo-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-[17px] font-bold text-slate-900">Sales Invoice Created</h2>
            <span className="text-xs text-slate-500 font-medium">#{invoice.documentNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="p-1.5 text-indigo-600 bg-indigo-50 rounded-full">
            <Pen className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-rose-500 bg-rose-50 rounded-full">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1 text-indigo-700">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        {/* Promo Banner */}
        <div className="bg-white flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-slate-900">Celebrate New Theme(s)</span>
            <span className="text-[11px] text-slate-500">New exclusive theme styling available</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-[#0f4c75] text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm">
              Explore Now
            </button>
            <button className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Preview Container */}
        <div className="p-4 bg-slate-100 flex justify-center">
          <div className="bg-white w-full max-w-[300px] aspect-[1/1.4] shadow-sm border border-slate-200 rounded-sm p-4 relative overflow-hidden flex flex-col text-[8px]">
            {/* Minimal mocked PDF preview based on reference */}
            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-2">
              <div className="flex flex-col">
                <span className="font-bold text-[10px] uppercase">Bill of Supply</span>
                <span className="text-[6px] border border-slate-300 px-1 mt-0.5 rounded-sm inline-block w-max">ORIGINAL FOR RECIPIENT</span>
              </div>
              <span className="text-[#e27329] font-bold text-[9px]">myBillBook</span>
            </div>
            
            <span className="font-bold text-[12px] text-slate-900">Business Name</span>
            <span className="text-[7px] text-slate-600 mb-2">Mobile: 7409200341</span>
            
            <div className="bg-slate-200 flex justify-between px-2 py-1 mb-2 font-bold text-[7px]">
              <span>Invoice No.: {invoice.documentNumber}</span>
              <span>Invoice Date: {invoice.docDate}</span>
            </div>
            
            <span className="font-bold text-slate-900 mb-1">BILL TO</span>
            <span className="font-bold text-[9px] text-slate-800">{invoice.partyName || "Cash Sale"}</span>
            <span className="text-[7px] text-slate-600 mb-4">Mobile: {invoice.partyPhone || "7409200341"}</span>
            
            <div className="flex justify-between border-y border-slate-800 py-1 font-bold text-slate-900 uppercase">
              <span>Items</span>
              <div className="flex gap-4">
                <span>Qty.</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-[7px]">
              <div className="flex flex-col">
                <span className="font-bold">SAMPLE ITEM</span>
                <span className="text-slate-500">Amul Butter 500gm</span>
              </div>
              <div className="flex gap-4">
                <span>1 BOX</span>
                <span>1,000</span>
                <span>1,000</span>
              </div>
            </div>
            
            <div className="flex justify-between border-t border-slate-800 border-b py-1 mt-auto font-bold text-slate-900">
              <span>SUBTOTAL</span>
              <div className="flex gap-16">
                <span>1</span>
                <span>₹ {Number(invoice.totalAmount).toLocaleString('en-IN', {minimumFractionDigits:0})}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remove Logo Banner */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-y border-slate-100 cursor-pointer">
          <div className="flex items-center gap-3">
             <div className="border border-slate-200 rounded flex items-center p-1 relative bg-slate-50">
                <span className="text-[#e27329] font-bold text-[8px]">myBillBook</span>
                <div className="absolute -top-1.5 -right-1.5 bg-slate-400 rounded-full w-3 h-3 flex items-center justify-center text-white">
                  <X className="w-2 h-2" />
                </div>
             </div>
             <span className="text-[13px] font-semibold text-slate-800">Remove myBillBook logo</span>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-700" />
        </div>

        {/* Activity Summary */}
        <div className="bg-white mt-2 border-y border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-2 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Last Activity by Your Name</span>
              </div>
              <span className="text-[15px] font-bold text-slate-900">{invoice.partyName || "Cash Sale"}</span>
              <span className="text-sm text-slate-400 font-medium">{invoice.partyPhone || "7409200341"}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xl font-black text-slate-900">
                ₹ {Number(invoice.totalAmount).toLocaleString('en-IN', {minimumFractionDigits:0})}
              </span>
              <div className="flex items-center gap-1 text-emerald-500">
                <span className="text-xs font-bold uppercase tracking-wide">Paid</span>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="bg-white py-6 flex justify-around items-center border-b border-slate-100 mb-6">
          <button className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border border-indigo-100 flex items-center justify-center bg-indigo-50/50 text-indigo-600">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-[13px] font-bold text-indigo-600">Print</span>
          </button>
          
          <button className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border border-indigo-100 flex items-center justify-center bg-indigo-50/50 text-indigo-600">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-[13px] font-bold text-indigo-600">Download</span>
          </button>
          
          <button className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border border-indigo-100 flex items-center justify-center bg-indigo-50/50 text-indigo-600">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[13px] font-bold text-indigo-600">Share</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
        <button 
          onClick={onClose}
          className="w-full bg-[#4f46e5] text-white py-3.5 rounded-xl font-bold text-[15px] shadow-[0_4px_10px_rgba(79,70,229,0.3)]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
