import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { DocumentLineItem } from "@/types/documents";

interface EditItemModalProps {
  item: DocumentLineItem;
  onClose: () => void;
  onSave: (updatedItem: DocumentLineItem) => void;
  onDelete: () => void;
}

export function EditItemModal({ item, onClose, onSave, onDelete }: EditItemModalProps) {
  const [activeTab, setActiveTab] = useState<'price' | 'details'>('price');
  const [localItem, setLocalItem] = useState<DocumentLineItem>({ ...item });
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(
    localItem.discountPercent ? 'percentage' : 'amount'
  );

  // Recalculate totals whenever localItem changes
  const { exclusiveTotal, discountValue, taxValue, finalTotal } = useMemo(() => {
    const qty = Number(localItem.quantity || 0);
    const rate = Number(localItem.rate || 0);
    const taxRate = Number(localItem.taxRate || 0);
    
    const exclusiveTotal = qty * rate;
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = exclusiveTotal * (Number(localItem.discountPercent || 0) / 100);
    } else {
      discountValue = Number(localItem.discountAmount || 0);
    }
    
    const taxableAmount = exclusiveTotal - discountValue;
    const taxValue = taxableAmount * (taxRate / 100);
    const finalTotal = taxableAmount + taxValue;

    return { exclusiveTotal, discountValue, taxValue, finalTotal };
  }, [localItem, discountType]);

  const handleDone = () => {
    // Before saving, ensure calculated fields are updated if needed
    onSave({
      ...localItem,
      totalAmount: finalTotal,
      taxAmount: taxValue,
      discountAmount: discountValue
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-white rounded-t-[20px] mt-24 flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onClose} className="p-1 text-indigo-700 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-[17px] font-bold text-slate-900 truncate">{localItem.name || "Sample Item"}</h2>
          </div>
          <button 
            onClick={onDelete}
            className="text-[11px] text-rose-500 font-bold border border-rose-200 rounded-full px-3 py-1 shrink-0 ml-2 shadow-sm"
          >
            DEL
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button 
            onClick={() => setActiveTab('price')}
            className={`flex-1 text-center py-3.5 text-sm ${activeTab === 'price' ? 'font-bold text-indigo-700 border-b-2 border-indigo-700' : 'font-semibold text-slate-500'}`}
          >
            Price & Discount
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 text-center py-3.5 text-sm ${activeTab === 'details' ? 'font-bold text-indigo-700 border-b-2 border-indigo-700' : 'font-semibold text-slate-500'}`}
          >
            Other Details
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'price' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Sales Price (Without Tax)</label>
              <div className="border border-slate-200 rounded-lg px-3 py-3 flex items-center gap-2">
                <span className="text-slate-500 font-medium">₹</span>
                <input 
                  type="number"
                  value={localItem.rate || ""}
                  onChange={(e) => setLocalItem({...localItem, rate: Number(e.target.value)})}
                  className="bg-transparent border-none outline-none flex-1 text-[15px] font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Quantity</label>
                <div className="border border-slate-200 rounded-lg px-3 py-3">
                  <input 
                    type="number"
                    value={localItem.quantity || ""}
                    onChange={(e) => setLocalItem({...localItem, quantity: Number(e.target.value)})}
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Unit</label>
                <div className="border border-slate-200 rounded-lg px-3 py-3 flex items-center justify-between">
                  <select 
                    value={localItem.unit || "BOX"}
                    onChange={(e) => setLocalItem({...localItem, unit: e.target.value})}
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 appearance-none"
                  >
                    <option value="BOX">BOX</option>
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Discount</label>
              <div className="flex gap-4">
                <div className="flex-1 border border-slate-200 rounded-lg px-3 py-3 flex items-center justify-between">
                  <input 
                    type="number"
                    value={discountType === 'percentage' ? (localItem.discountPercent || "") : (localItem.discountAmount || "")}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (discountType === 'percentage') {
                        setLocalItem({...localItem, discountPercent: val});
                      } else {
                        setLocalItem({...localItem, discountAmount: val});
                      }
                    }}
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900"
                  />
                  {discountType === 'percentage' && <span className="text-slate-500 font-medium">%</span>}
                </div>
                <div className="flex-1 border border-slate-200 rounded-lg px-3 py-3 flex items-center justify-between">
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 appearance-none"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="amount">Amount</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Tax Rate</label>
              <div className="border border-slate-200 rounded-lg px-3 py-3 flex items-center justify-between">
                <select 
                  value={localItem.taxRate || 0}
                  onChange={(e) => setLocalItem({...localItem, taxRate: Number(e.target.value)})}
                  className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 appearance-none"
                >
                  <option value={0}>GST @ 0%</option>
                  <option value={5}>GST @ 5%</option>
                  <option value={12}>GST @ 12%</option>
                  <option value={18}>GST @ 18%</option>
                  <option value={28}>GST @ 28%</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
             <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Description</label>
              <textarea 
                placeholder="Add Note/ Description"
                value={(localItem as any).notes || ""}
                onChange={(e) => setLocalItem({...localItem, notes: e.target.value} as any)}
                className="w-full border border-slate-200 rounded-lg p-3 outline-none text-[15px] placeholder:text-slate-400 min-h-[100px] resize-none"
              />
            </div>
          </div>
        )}

        {/* Bottom Summary Panel */}
        <div className="bg-slate-50 rounded-xl p-4 mx-4 mt-auto mb-4 border border-slate-100 shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 font-medium">Tax Exclusive Price * Qty</span>
            <span className="text-xs text-slate-600 font-medium">₹ {exclusiveTotal.toLocaleString('en-IN', {minimumFractionDigits:0})}</span>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400 font-medium">Discount</span>
            <span className="text-xs text-slate-600 font-medium">
              ({localItem.discountPercent || 0}%) ₹ {discountValue.toLocaleString('en-IN', {minimumFractionDigits:0})}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-slate-400 font-medium">Tax Rate(%)</span>
            <span className="text-xs text-slate-600 font-medium">
              {localItem.taxRate || 0}% = ₹ {taxValue.toLocaleString('en-IN', {minimumFractionDigits:0})}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-[15px] text-slate-900 font-bold">Total Amount</span>
            <span className="text-[15px] text-slate-900 font-bold">₹ {finalTotal.toLocaleString('en-IN', {minimumFractionDigits:0})}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
          <button 
            onClick={handleDone}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[15px] text-center shadow-[0_8px_16px_-4px_rgba(79,70,229,0.3)] active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
