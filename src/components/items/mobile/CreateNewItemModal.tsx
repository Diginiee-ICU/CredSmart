import React, { useState } from "react";
import { ArrowLeft, Settings, Search, Calendar, ScanBarcode, Barcode, Camera, FileText, ChevronDown, Layers } from "lucide-react";
import { DocumentLineItem } from "@/types/documents";
import { toast } from "@/hooks/use-toast";
import { ItemImageUpload } from "../ItemImageUpload";

interface CreateNewItemModalProps {
  onClose: () => void;
  onSave: (item: DocumentLineItem, saveAndNew: boolean) => void;
}

const UNIT_OPTIONS = [
  "PCS", "KG", "GM", "LTR", "ML", "BOX", "PKT", "DOZ",
  "MTR", "CM", "IN", "FT", "SQFT", "BTL", "CAN", "BAG", "ROLL"
];

export function CreateNewItemModal({ onClose, onSave }: CreateNewItemModalProps) {
  const [isProduct, setIsProduct] = useState(true);
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'other' | 'party'>('pricing');
  const [lowStockAlert, setLowStockAlert] = useState(false);
  const [showOnlineStore, setShowOnlineStore] = useState(true);
  
  const [unit, setUnit] = useState("PCS");
  const [itemName, setItemName] = useState("");
  const [hsn, setHsn] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [gstRate, setGstRate] = useState("0");
  const [enableAltUnit, setEnableAltUnit] = useState(false);
  const [altUnit, setAltUnit] = useState("BOX");
  const [altUnitConversion, setAltUnitConversion] = useState("10");
  const [imageUrl, setImageUrl] = useState("");

  const handleSave = (saveAndNew: boolean) => {
    const name = itemName.trim();
    if (!name) {
      toast({ title: "Item name required", description: "Enter an item name before saving." });
      return;
    }

    onSave({
      id: crypto.randomUUID(),
      productName: name,
      quantity: 1,
      rate: Number(salesPrice) || 0,
      taxRate: Number(gstRate) || 0,
      discountPercent: 0,
      discountAmount: 0,
      unit,
      hsn: hsn.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      taxableAmount: Number(salesPrice) || 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      lineTotal: Number(salesPrice) || 0,
    }, saveAndNew);

    if (saveAndNew) {
      setItemName("");
      setHsn("");
      setSalesPrice("");
      setPurchasePrice("");
      setGstRate("0");
      setImageUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-3 gap-3 border-b border-slate-100 shrink-0">
        <button onClick={onClose} className="p-1 text-indigo-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-bold text-slate-900 flex-1 text-center pr-2">Create New Item</h2>
        <button className="p-1 text-indigo-700">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-[100px]">
        {/* Top Form */}
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">
              Item Name<span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="Ex: Kissan Fruit Jam 500 gm"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-3 text-[15px] outline-none placeholder:text-slate-300 font-medium text-slate-900"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                {isProduct ? "HSN" : "SAC"}
              </label>
              <div className="border border-slate-200 rounded-lg px-3 py-3 flex items-center justify-between bg-white">
                <input 
                  type="text"
                  placeholder="Ex: 6704"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 placeholder:text-slate-300"
                />
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Type</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsProduct(true);
                    if (activeTab === 'stock') setActiveTab('pricing'); // Service doesn't have stock
                  }}
                  className={`flex-1 py-3 text-[13px] rounded-full text-center ${isProduct ? 'border border-indigo-600 text-indigo-700 font-bold bg-white shadow-sm' : 'bg-slate-50 text-slate-600 font-semibold border border-transparent'}`}
                >
                  Product
                </button>
                <button 
                  onClick={() => {
                    setIsProduct(false);
                    if (activeTab === 'stock') setActiveTab('pricing');
                  }}
                  className={`flex-1 py-3 text-[13px] rounded-full text-center ${!isProduct ? 'border border-indigo-600 text-indigo-700 font-bold bg-white shadow-sm' : 'bg-slate-50 text-slate-600 font-semibold border border-transparent'}`}
                >
                  Service
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar px-2">
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-3 whitespace-nowrap text-sm transition-colors ${activeTab === 'pricing' ? 'text-indigo-700 font-bold border-b-2 border-indigo-700' : 'text-slate-500 font-semibold'}`}
          >
            Pricing
          </button>
          {isProduct && (
            <button 
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-3 whitespace-nowrap text-sm transition-colors ${activeTab === 'stock' ? 'text-indigo-700 font-bold border-b-2 border-indigo-700' : 'text-slate-500 font-semibold'}`}
            >
              Stock
            </button>
          )}
          <button 
            onClick={() => setActiveTab('other')}
            className={`px-4 py-3 whitespace-nowrap text-sm transition-colors ${activeTab === 'other' ? 'text-indigo-700 font-bold border-b-2 border-indigo-700' : 'text-slate-500 font-semibold'}`}
          >
            Other
          </button>
          <button 
            onClick={() => setActiveTab('party')}
            className={`px-4 py-3 whitespace-nowrap text-sm transition-colors ${activeTab === 'party' ? 'text-indigo-700 font-bold border-b-2 border-indigo-700' : 'text-slate-500 font-semibold'}`}
          >
            Party Wise Prices
          </button>
        </div>

        {/* Tab Content Container */}
        {activeTab === 'pricing' && (
          <div className="p-4 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Primary Unit</label>
                <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="border-none outline-none bg-transparent text-[15px] font-medium text-slate-900 w-full appearance-none"
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Alt Unit Toggle */}
              <div className="flex items-center justify-between mt-1">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Layers className="w-4 h-4" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-semibold text-slate-700">Alternate Unit</span>
                     <span className="text-[11px] text-slate-400">Sell in secondary units (e.g. BOX)</span>
                   </div>
                 </div>
                 <div 
                   className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${enableAltUnit ? 'bg-indigo-600' : 'bg-slate-300'}`}
                   onClick={() => setEnableAltUnit(!enableAltUnit)}
                 >
                   <div className={`w-4 h-4 bg-white rounded-full transition-transform ${enableAltUnit ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
              </div>

              {enableAltUnit && (
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-4 border border-slate-100">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">Alt Unit</label>
                      <div className="border border-slate-200 rounded-lg p-2.5 flex items-center justify-between bg-white">
                        <select 
                          value={altUnit}
                          onChange={(e) => setAltUnit(e.target.value)}
                          className="border-none outline-none bg-transparent text-[14px] font-medium text-slate-900 w-full appearance-none"
                        >
                          {UNIT_OPTIONS.filter(u => u !== unit).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-600 mb-1.5 block">1 {altUnit} = ? {unit}</label>
                      <input 
                        type="number"
                        value={altUnitConversion}
                        onChange={(e) => setAltUnitConversion(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-[14px] outline-none font-medium text-slate-900 bg-white"
                        placeholder={`e.g. 10`}
                      />
                    </div>
                  </div>
                  {altUnitConversion && Number(altUnitConversion) > 1 && (
                    <div className="text-[11px] font-medium text-blue-700 bg-blue-100/50 p-2 rounded-lg text-center">
                      On invoices: <strong>1 {altUnit} = {altUnitConversion} {unit}</strong>
                    </div>
                  )}
                </div>
              )}
            
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Sales Price</label>
              <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex gap-2 flex-1">
                  <span className="text-slate-400">₹</span>
                  <input type="number" placeholder="130" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} className="outline-none w-full text-[15px] font-medium placeholder:text-slate-300" />
                </div>
                <select className="border-none outline-none bg-transparent text-slate-500 text-sm font-medium ml-2">
                  <option>Without Tax</option>
                  <option>With Tax</option>
                </select>
              </div>
            </div>

            {isProduct && (
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Purchase Price</label>
                <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex gap-2 flex-1">
                    <span className="text-slate-400">₹</span>
                    <input type="number" placeholder="115" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="outline-none w-full text-[15px] font-medium placeholder:text-slate-300" />
                  </div>
                  <select className="border-none outline-none bg-transparent text-slate-500 text-sm font-medium ml-2">
                    <option>Without Tax</option>
                    <option>With Tax</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">GST</label>
              <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <select value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="border-none outline-none bg-transparent text-[15px] text-slate-900 font-medium w-full appearance-none">
                  <option>None</option>
                  <option>5%</option>
                  <option>12%</option>
                  <option>18%</option>
                  <option>28%</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Discount on Sales Price</label>
              <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <input type="number" placeholder="10%" className="outline-none w-full text-[15px] font-medium placeholder:text-slate-300" />
                <span className="text-slate-400">%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && isProduct && (
          <div className="p-4 flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Opening Stock</label>
                <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between bg-white">
                  <input 
                    type="text"
                    placeholder="Ex: 35"
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 placeholder:text-slate-300"
                  />
                  <span className="text-slate-400 text-[15px] shrink-0">/{unit}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">As of Date</label>
                <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between bg-white">
                  <input 
                    type="text"
                    defaultValue="12 Sept 2026"
                    className="bg-transparent border-none outline-none w-full text-[15px] font-medium text-slate-900 placeholder:text-slate-300"
                  />
                  <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Code</label>
              <input 
                type="text" 
                placeholder="Ex: 1189993849345"
                className="w-full border border-slate-200 rounded-lg p-3 text-[15px] outline-none placeholder:text-slate-300 font-medium text-slate-900"
              />
            </div>

            <div className="flex gap-4">
              <button className="flex-1 border border-slate-200 rounded-xl py-3.5 flex items-center justify-center gap-2 text-indigo-700 font-bold text-[13px] shadow-sm">
                <Barcode className="w-4 h-4" /> Generate Barcode
              </button>
              <button className="flex-1 border border-slate-200 rounded-xl py-3.5 flex items-center justify-center gap-2 text-indigo-700 font-bold text-[13px] shadow-sm">
                <ScanBarcode className="w-4 h-4" /> Scan Barcode
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-2">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22ZM18 16V11C18 7.92 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor"/>
                    </svg>
                 </div>
                 <span className="text-sm font-semibold text-slate-700">Low stock alert</span>
               </div>
               {/* Custom toggle */}
               <div 
                 className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${lowStockAlert ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 onClick={() => setLowStockAlert(!lowStockAlert)}
               >
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform ${lowStockAlert ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'other' && (
          <div className="p-4 flex flex-col gap-5">
            <ItemImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Item Image / Photo"
            />

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Category</label>
              <div className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <select className="border-none outline-none bg-transparent text-[15px] text-slate-900 font-medium w-full appearance-none">
                  <option>Select Category</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Custom Fields</label>
              <button className="border border-slate-200 text-indigo-700 font-bold text-[13px] rounded-xl px-5 py-3 w-max">
                Add Fields to Item
              </button>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Item Description</label>
              <textarea 
                placeholder="Ex: 100% Real Mixed Fruit Jam"
                className="w-full border border-slate-200 rounded-lg p-3 outline-none text-[15px] placeholder:text-slate-300 font-medium min-h-[100px] resize-none"
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <div 
                className={`w-5 h-5 rounded-[4px] flex items-center justify-center ${showOnlineStore ? 'bg-indigo-500' : 'border-2 border-slate-300'}`}
                onClick={() => setShowOnlineStore(!showOnlineStore)}
              >
                {showOnlineStore && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700">Show in Online Store</span>
            </div>
          </div>
        )}

        {activeTab === 'party' && (
          <div className="flex-1 flex flex-col items-center justify-center pt-32 p-8 text-center text-slate-500 gap-4">
            <FileText className="w-16 h-16 text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-[250px]">
              To enable Party Wise Prices and set custom prices for parties, please save the item first
            </p>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))] z-10">
        <div className="flex flex-col">
          <button type="button" onClick={() => handleSave(true)} className="flex flex-col text-left">
            <span className="text-[15px] font-bold text-indigo-700">Save & New</span>
            <span className="text-xs font-medium text-slate-500 mt-0.5">Create New Item</span>
          </button>
        </div>
        <button type="button" onClick={() => handleSave(false)} className="bg-indigo-600 text-white px-14 py-3.5 rounded-xl font-bold text-[15px] shadow-[0_8px_16px_-4px_rgba(79,70,229,0.3)]">
          Save
        </button>
      </div>
    </div>
  );
}
