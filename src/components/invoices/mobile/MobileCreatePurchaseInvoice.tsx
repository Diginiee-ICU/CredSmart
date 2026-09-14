import React, { useState } from "react";
import { ArrowLeft, FileText, ScanBarcode, ChevronDown, User, X, ChevronUp, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SelectPartyModal } from "./SelectPartyModal";
import { AddItemModal } from "./AddItemModal";
import { EditItemModal } from "./EditItemModal";
import { DocumentLineItem } from "@/types/documents";

export interface MobileCreatePurchaseInvoiceProps {
  onClose: () => void;
  docType: string;
  docDate: string;
  dueDate: string;
  showDueDate: boolean;
  invoicePrefix: string;
  invoiceNumberSeq: string;
  selectedSupplierId: string;
  partyName: string;
  suppliers: any[];
  items: DocumentLineItem[];
  recalculatedItems: DocumentLineItem[];
  totals: any;
  catalog: any[];
  onSetSelectedSupplierId: (id: string) => void;
  onUpdateItem: (index: number, field: keyof DocumentLineItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onSave: (andPrint: boolean, saveAndNew: boolean) => void;
  onAddSelectedItems: (items: DocumentLineItem[]) => void;
  onUpdateAdditionalCharges?: (amount: number, reason: string) => void;
  onUpdateDiscount?: (type: "flat" | "percent", value: number) => void;
  onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
  onUpdateNotes?: (notes: string) => void;
  amountReceived?: number;
  markAsFullyPaid?: boolean;
  onUpdatePayment?: (amountReceived: number, markAsFullyPaid: boolean) => void;
}

export function MobileCreatePurchaseInvoice(props: MobileCreatePurchaseInvoiceProps) {
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  // Modals state for totals
  const [isChargesModalOpen, setIsChargesModalOpen] = useState(false);
  const [chargesReason, setChargesReason] = useState("");
  const [chargesAmount, setChargesAmount] = useState("");
  
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("");
  
  const [isRoundOffModalOpen, setIsRoundOffModalOpen] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState("");
  
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  
  const handleSaveAndNew = () => {
    props.onSave(false, true);
  };
  
  const handleGenerateBill = () => {
    props.onSave(true, false);
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
        <div className="flex items-center gap-4">
          <svg className="w-5 h-5 text-indigo-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="8" x2="7" y2="16"></line><line x1="10" y1="8" x2="10" y2="16"></line><line x1="14" y1="8" x2="14" y2="16"></line><line x1="17" y1="8" x2="17" y2="16"></line></svg>
        </div>
      </div>

      {/* 3.2 Invoice Metadata Card */}
      <div className="flex justify-between items-center px-4 py-4 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-medium text-indigo-700">Purchase Invoice #{props.invoiceNumberSeq}</span>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="text-slate-800 font-medium">{formatDate(props.docDate)}</span>
            {renderDueStatus()}
          </div>
        </div>
        <button className="text-[11px] font-bold text-indigo-700 border border-indigo-200 rounded-3xl px-6 py-1.5 uppercase bg-white">
          Edit
        </button>
      </div>

      {/* 3.4 Party Selection */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <label className="text-[11px] font-bold text-slate-600 mb-2 block tracking-wider uppercase">
          PARTY NAME <span className="text-rose-500">*</span>
        </label>
        <button 
          onClick={() => setIsPartyModalOpen(true)}
          className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-white w-full shadow-sm outline-none"
        >
          <div className="flex items-center gap-3">
            <User className="w-[18px] h-[18px] text-slate-400" />
            <span className={props.partyName ? "text-slate-900 font-medium text-[15px]" : "text-slate-400 text-[15px]"}>
              {props.partyName || "Search/Create Party"}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* 3.6 Items Section */}
      <div className="bg-white">
        {props.recalculatedItems.filter(i => i.productName && i.productName.trim() !== "").length === 0 ? (
          <>
            <div className="px-4 pt-4 pb-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-slate-500" /> ITEMS
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
            <div className="flex justify-between items-center px-4 py-4 bg-white">
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                <ChevronUp className="w-4 h-4 text-slate-500" />
                ITEMS ({props.recalculatedItems.filter(i => i.productName && i.productName.trim() !== "").length})
              </div>
              <button onClick={() => setIsItemModalOpen(true)} className="text-[15px] font-bold text-indigo-700 flex items-center gap-1">
                + Item
              </button>
            </div>
            
            {props.recalculatedItems.filter(item => item.productName && item.productName.trim() !== "").map((item, idx) => {
              // We need the original index for editing
              const originalIndex = props.recalculatedItems.indexOf(item);
              return (
              <div key={originalIndex} className="flex justify-between items-start px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[15px] font-bold text-slate-900">{item.productName || "Unnamed Item"}</span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium tracking-wide">Qty x Rate</span>
                    <span className="text-[12px] text-slate-600 font-medium">{item.quantity} {item.unit || "Pcs"} x {item.rate}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 mt-1">
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(item.lineTotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                  <button 
                    onClick={() => setEditingItemIndex(originalIndex)}
                    className="border border-indigo-200 bg-white rounded-3xl px-4 py-1 text-[10px] font-bold text-indigo-600 uppercase"
                  >
                    EDIT
                  </button>
                </div>
              </div>
            );
            })}
            
            <div className="flex justify-between items-center px-4 pt-6 pb-2 bg-white">
              <span className="text-[15px] font-bold text-slate-800">Item Subtotal</span>
              <span className="text-[17px] font-bold text-slate-900">{Number(props.totals?.rawSubtotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            </div>

            <div className="flex flex-col items-end px-4 py-4 gap-4 bg-white pb-6">
              {(props.totals?.additionalCharges || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span onClick={() => setIsChargesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Additional Charges</span>
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(props.totals.additionalCharges).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button onClick={() => setIsChargesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Additional Charges</button>
              )}

              {(props.totals?.totalDiscount || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span onClick={() => setIsDiscountModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Discount</span>
                  <span className="text-[15px] font-bold text-slate-900">- ₹ {Number(props.totals.totalDiscount).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button onClick={() => setIsDiscountModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Discount</button>
              )}

              {(props.totals?.taxTotal || 0) > 0 && (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Tax Amount</span>
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(props.totals.taxTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              )}

              {(props.totals?.roundOff || 0) !== 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span onClick={() => setIsRoundOffModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Round Off</span>
                  <span className="text-[15px] font-bold text-slate-900">{(props.totals.roundOff > 0 ? "+ " : "- ")}₹ {Math.abs(Number(props.totals.roundOff)).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button onClick={() => setIsRoundOffModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Round Off</button>
              )}

              <button onClick={() => toast({title: "Coming Soon", description: "TCS is currently handled automatically by the backend."})} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Apply TCS</button>
              <button onClick={() => setIsNotesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Notes</button>
            </div>
          </>
        )}
      </div>

      {/* 3.8 Sticky Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-[max(0px,env(safe-area-inset-bottom))]">
        <div className="flex justify-between items-center px-4 py-4 bg-white">
          <span className="text-[15px] font-bold text-slate-900">Total Amount</span>
          <div className="flex flex-col items-end">
            <span className="text-[17px] font-bold text-slate-900 mt-1 border-t border-slate-300 min-w-[120px] text-right pt-1">₹ {Number(props.totals?.grandTotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
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
          customers={props.suppliers}
          onSelect={(id) => {
            props.onSetSelectedSupplierId(id);
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
      {editingItemIndex !== null && props.recalculatedItems[editingItemIndex] && (
        <EditItemModal
          item={props.recalculatedItems[editingItemIndex]}
          onClose={() => setEditingItemIndex(null)}
          onSave={(updatedItem) => {
            props.onUpdateItem(editingItemIndex, 'rate', updatedItem.rate);
            props.onUpdateItem(editingItemIndex, 'quantity', updatedItem.quantity);
            props.onUpdateItem(editingItemIndex, 'discountPercent', updatedItem.discountPercent);
            props.onUpdateItem(editingItemIndex, 'discountAmount', updatedItem.discountAmount);
            props.onUpdateItem(editingItemIndex, 'taxRate', updatedItem.taxRate);
            props.onUpdateItem(editingItemIndex, 'unit', updatedItem.unit);
            // Since notes aren't natively supported on DocumentLineItem we cast it
            if ((updatedItem as any).notes !== undefined) {
              props.onUpdateItem(editingItemIndex, 'notes' as any, (updatedItem as any).notes);
            }
            setEditingItemIndex(null);
          }}
          onDelete={() => {
            props.onRemoveItem(editingItemIndex);
            setEditingItemIndex(null);
          }}
        />
      )}

      {/* Bottom Sheet Modals */}
      {isChargesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Additional Charges</h3>
              <button onClick={() => setIsChargesModalOpen(false)} className="p-1.5 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Reason</label>
                <input type="text" value={chargesReason} onChange={(e) => setChargesReason(e.target.value)} placeholder="e.g. Delivery / Shipping" className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Amount (₹)</label>
                <input type="number" value={chargesAmount} onChange={(e) => setChargesAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" />
              </div>
              <button onClick={() => {
                 if (props.onUpdateAdditionalCharges) props.onUpdateAdditionalCharges(Number(chargesAmount), chargesReason);
                 setIsChargesModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">Save Charges</button>
            </div>
          </div>
        </div>
      )}

      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Overall Discount</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="p-1.5 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button onClick={() => setDiscountType("percent")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${discountType === "percent" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Percentage (%)</button>
                <button onClick={() => setDiscountType("flat")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${discountType === "flat" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Flat Amount (₹)</button>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Discount Value</label>
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" />
              </div>
              <button onClick={() => {
                 if (props.onUpdateOverallDiscount) props.onUpdateOverallDiscount(discountType, Number(discountValue));
                 setIsDiscountModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {isRoundOffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Round Off</h3>
              <button onClick={() => setIsRoundOffModalOpen(false)} className="p-1.5 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700 text-sm">Auto Round Off</span>
                <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              </div>
              {!autoRoundOff && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 mt-2">Manual Round Off Amount (₹)</label>
                  <input type="number" value={manualRoundOff} onChange={(e) => setManualRoundOff(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" />
                </div>
              )}
              <button onClick={() => {
                 if (props.onUpdateRoundOff) props.onUpdateRoundOff(autoRoundOff, Number(manualRoundOff));
                 setIsRoundOffModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">Save Round Off</button>
            </div>
          </div>
        </div>
      )}

      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Add Notes</h3>
              <button onClick={() => setIsNotesModalOpen(false)} className="p-1.5 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Enter invoice notes, terms, or conditions..." 
                className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors min-h-[120px] resize-none" 
              />
              <button onClick={() => {
                 if (props.onUpdateNotes) props.onUpdateNotes(notes);
                 setIsNotesModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">Save Notes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
