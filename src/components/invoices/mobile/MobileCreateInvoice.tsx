import React, { useState } from "react";
import { ArrowLeft, FileText, ScanBarcode, ChevronDown, User, X, ChevronUp, Plus } from "lucide-react";
import { SelectPartyModal } from "./SelectPartyModal";
import { AddItemModal } from "./AddItemModal";
import { DocumentLineItem } from "@/types/documents";

export interface MobileCreateInvoiceProps {
  onClose: () => void;
  docType: string;
  docDate: string;
  dueDate: string;
  showDueDate: boolean;
  invoicePrefix: string;
  invoiceNumberSeq: string;
  selectedCustomerId: string;
  partyName: string;
  customers: any[];
  items: DocumentLineItem[];
  recalculatedItems: DocumentLineItem[];
  totals: any;
  catalog: any[];
  onSetSelectedCustomerId: (id: string) => void;
  onUpdateItem: (index: number, field: keyof DocumentLineItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onSave: (andPrint: boolean, saveAndNew: boolean) => void;
  onAddSelectedItems: (items: DocumentLineItem[]) => void;
}

export function MobileCreateInvoice(props: MobileCreateInvoiceProps) {
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const handleSaveAndNew = () => {
    props.onSave(false, true);
  };
  
  const handleGenerateBill = () => {
    props.onSave(false, false);
  };

  const invoiceNumber = `${props.invoicePrefix}${props.invoiceNumberSeq}`;
  
  // Format Date logic
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Due date logic (7 days to due etc.)
  const renderDueStatus = () => {
    if (!props.showDueDate) return null;
    const diffTime = Math.abs(new Date(props.dueDate).getTime() - new Date(props.docDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return <span className="text-slate-500 text-xs">- {diffDays} day(s) to due</span>;
  };

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-50 overflow-y-auto pb-32 lg:hidden">
      {/* 3.1 Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={props.onClose} className="p-1 text-indigo-700 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-semibold text-slate-900">Create Bill / Invoice</h1>
        </div>
        <div className="flex items-center gap-4 text-indigo-700">
          <FileText className="w-[18px] h-[18px]" />
          <ScanBarcode className="w-6 h-6 text-orange-500" />
        </div>
      </div>

      {/* 3.2 Invoice Metadata Card */}
      <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-indigo-600">Sales Invoice #{props.invoiceNumberSeq}</span>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="text-slate-800 font-medium">{formatDate(props.docDate)}</span>
            {renderDueStatus()}
          </div>
        </div>
        <button className="text-[10px] font-bold text-indigo-500 border border-indigo-200 rounded-full px-4 py-1.5 uppercase tracking-wide bg-indigo-50/50">
          Edit
        </button>
      </div>

      {/* 3.4 Party Selection */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 block">
          PARTY NAME <span className="text-red-500">*</span>
        </label>
        <button 
          onClick={() => setIsPartyModalOpen(true)}
          className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-white w-full shadow-sm outline-none"
        >
          <div className="flex items-center gap-3 text-slate-500">
            <User className="w-[18px] h-[18px] text-slate-400" />
            <span className={props.partyName ? "text-slate-900 font-medium text-sm" : "text-slate-400 text-sm"}>
              {props.partyName || "Search/Create Party"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 3.6 Items Section */}
      <div className="bg-white">
        {props.recalculatedItems.length === 0 ? (
          <>
            <div className="px-4 pt-4 pb-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              ITEMS
            </div>
            <div className="px-4 pb-4">
              <button 
                onClick={() => setIsItemModalOpen(true)}
                className="w-full bg-indigo-50 border-none text-indigo-700 py-3 rounded-lg font-bold text-sm flex justify-center items-center"
              >
                Add Items
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <ChevronUp className="w-4 h-4 text-slate-500" />
                ITEMS ({props.recalculatedItems.length})
              </div>
              <button onClick={() => setIsItemModalOpen(true)} className="text-[13px] font-bold text-indigo-700 flex items-center gap-1">
                <Plus className="w-[14px] h-[14px]"/> Item
              </button>
            </div>
            
            {props.recalculatedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start px-4 py-3 border-t border-slate-100 bg-white">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-slate-900">{item.name || "Unnamed Item"}</span>
                  <div className="text-[11px] text-slate-500 flex items-center gap-6 mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">Qty x Rate</span>
                      <span className="text-slate-800">{item.quantity} {item.unit || "BOX"} x {item.rate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(item.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits:0})}</span>
                  <button className="border border-indigo-200 bg-white rounded-full px-3 py-0.5 text-[10px] font-bold text-indigo-500 uppercase">
                    EDIT
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center p-4 font-bold border-t border-slate-100 mt-2">
              <span className="text-sm text-slate-700">Item Subtotal</span>
              <span className="text-base text-slate-900">{Number(props.totals?.rawSubtotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            </div>

            <div className="flex flex-col items-end px-4 py-4 gap-4 bg-slate-50/50">
              <button className="text-[13px] font-bold text-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Additional Charges</button>
              <button className="text-[13px] font-bold text-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Discount</button>
              <button className="text-[13px] font-bold text-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Round Off</button>
              <button className="text-[13px] font-bold text-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Apply TCS</button>
            </div>
          </>
        )}
      </div>

      {/* Smart Banner shown only when empty */}
      {props.recalculatedItems.length === 0 && (
        <div className="relative bg-[#FFF4ED] rounded-xl p-4 mx-4 mt-4 border border-[#FFE4D6]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[15px] font-bold text-slate-800">Now create Invoices instantly</h3>
            <button className="text-slate-400 p-0.5"><X className="w-[18px] h-[18px]"/></button>
          </div>
          <p className="text-[13px] text-slate-600 mb-4">Instantly add Invoices Bills from bill Image or PDF</p>
          <button className="w-full bg-[#E85C2A] text-white py-3 rounded-lg flex justify-center items-center font-bold gap-2 shadow-sm text-[15px]">
            <ScanBarcode className="w-[18px] h-[18px]" />
            Scan & Record Invoices Bills
          </button>
        </div>
      )}

      {/* Optional Note Section */}
      {props.recalculatedItems.length > 0 && (
         <div className="flex justify-end px-4 py-2 pb-6 bg-slate-50/50">
           <button className="text-[13px] font-bold text-indigo-700 flex items-center gap-1.5"><Plus className="w-4 h-4"/> Notes</button>
         </div>
      )}

      {/* 3.8 Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center px-4 py-3 bg-white">
          <span className="text-[15px] font-bold text-slate-800">Total Amount</span>
          <div className="flex items-center gap-1 border-b border-slate-300 pb-0.5 min-w-[120px] justify-end">
            <span className="text-sm text-slate-600">₹</span>
            <span className="text-[17px] font-bold text-slate-900">{Number(props.totals?.grandTotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
          </div>
        </div>
        
        <div className="flex w-full">
          <button 
            onClick={handleSaveAndNew}
            className="flex-1 bg-indigo-50 text-indigo-700 py-4 font-bold text-[15px] text-center"
          >
            Save & New
          </button>
          <button 
            onClick={handleGenerateBill}
            className="flex-1 bg-indigo-600 text-white py-4 font-bold text-[15px] text-center"
          >
            Generate Bill
          </button>
        </div>
      </div>

      {/* Modals */}
      {isPartyModalOpen && (
        <SelectPartyModal 
          onClose={() => setIsPartyModalOpen(false)}
          customers={props.customers}
          onSelect={(id) => {
            props.onSetSelectedCustomerId(id);
            setIsPartyModalOpen(false);
          }}
        />
      )}
      {isItemModalOpen && (
        <AddItemModal
          onClose={() => setIsItemModalOpen(false)}
          catalog={props.catalog}
          onAddSelectedItems={(items) => {
             props.onAddSelectedItems(items);
             setIsItemModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
