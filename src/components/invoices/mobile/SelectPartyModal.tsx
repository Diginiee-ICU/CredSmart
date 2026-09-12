import React, { useState } from "react";
import { X, Search, ArrowDown } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  balance?: number;
}

interface SelectPartyModalProps {
  onClose: () => void;
  customers: CustomerOption[];
  onSelect: (id: string) => void;
}

export function SelectPartyModal({ onClose, customers, onSelect }: SelectPartyModalProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "contacts">("all");

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-[17px] font-semibold text-slate-900">Select Party</h2>
        <button onClick={onClose} className="p-1 text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by Party Name" 
            className="bg-transparent border-none outline-none flex-1 text-[15px] placeholder:text-slate-400 text-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-slate-200 mt-2">
        <button 
          onClick={() => setTab("all")}
          className={`flex-1 text-center py-3.5 text-[15px] ${tab === 'all' ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold' : 'text-slate-500 font-semibold'}`}
        >
          All Parties
        </button>
        <button 
          onClick={() => setTab("contacts")}
          className={`flex-1 text-center py-3.5 text-[15px] ${tab === 'contacts' ? 'border-b-2 border-indigo-600 text-indigo-700 font-bold' : 'text-slate-500 font-semibold'}`}
        >
          Contacts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect(c.id)}
            className="flex justify-between items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium text-slate-900">{c.name}</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide flex items-center gap-1.5">
                {c.phone} <span className="w-1 h-1 rounded-full bg-slate-300"></span> Customer
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-500">₹ {c.balance || 0}</span>
              <ArrowDown className="w-4 h-4 text-green-500" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[200px]">
        <button className="w-full bg-indigo-600 text-white py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[0_8px_16px_-4px_rgba(79,70,229,0.3)] font-bold text-[15px]">
          <div className="bg-white text-indigo-600 rounded-full p-0.5">
            <X className="w-4 h-4 rotate-45" /> {/* Plus icon */}
          </div>
          Create Party
        </button>
      </div>
    </div>
  );
}
