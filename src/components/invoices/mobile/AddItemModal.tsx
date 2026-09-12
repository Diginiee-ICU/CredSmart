import React, { useState } from "react";
import { ArrowLeft, Search, ScanBarcode, Mic, Plus } from "lucide-react";
import { DocumentLineItem } from "@/types/documents";
import { CreateNewItemModal } from "@/components/items/mobile/CreateNewItemModal";

interface AddItemModalProps {
  onClose: () => void;
  catalog: any[];
  onAddSelectedItems: (items: DocumentLineItem[]) => void;
}

export function AddItemModal({ onClose, catalog, onAddSelectedItems }: AddItemModalProps) {
  const [search, setSearch] = useState("");
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  
  const filtered = catalog.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.barcode && c.barcode.includes(search))
  );

  const handleAdd = (item: any) => {
    // Convert catalog item to DocumentLineItem format roughly
    const newLineItem: DocumentLineItem = {
      id: crypto.randomUUID(),
      productId: item.id,
      name: item.name,
      quantity: 1,
      rate: item.sellingPrice || item.rate || 0,
      taxRate: item.gstRate || 0,
      discountPercent: 0,
      discountAmount: 0,
      unit: item.unit || "PCS",
    };
    onAddSelectedItems([newLineItem]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center px-4 py-3 gap-3 border-b border-slate-200 bg-slate-50">
        <button onClick={onClose} className="p-1 text-indigo-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center bg-transparent">
          <Search className="w-[18px] h-[18px] text-slate-500 mr-2" />
          <input 
            type="text" 
            placeholder="Search by Serial Number / IMEI"
            className="flex-1 bg-transparent border-none outline-none text-[15px] placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="p-1 text-indigo-700">
          <ScanBarcode className="w-5 h-5" />
        </button>
        <button className="p-1 text-indigo-700">
          <Mic className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-end p-4 border-b border-slate-100">
        <button 
          onClick={() => setIsCreateItemOpen(true)}
          className="inline-flex px-4 py-2 bg-slate-100 rounded-full text-[13px] font-bold text-slate-700 items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create New Item
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(item => (
          <div key={item.id} className="flex p-4 border-b border-slate-100 gap-3 items-center">
            <div className="w-11 h-11 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold text-lg uppercase shadow-sm">
              {item.name.charAt(0)}
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-slate-900">{item.name}</span>
              {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[13px] font-semibold text-slate-700">₹ {(item.sellingPrice || item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}/{item.unit || "BOX"}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">Stock: {item.stock || 0} {item.unit || "BOX"}</span>
            </div>
            <button 
              onClick={() => handleAdd(item)}
              className="border border-indigo-300 text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-indigo-50"
            >
              ADD <Plus className="w-3 h-3 inline ml-0.5" />
            </button>
          </div>
        ))}
      </div>

      {isCreateItemOpen && (
        <CreateNewItemModal onClose={() => setIsCreateItemOpen(false)} />
      )}
    </div>
  );
}
