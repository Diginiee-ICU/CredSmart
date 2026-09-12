const fs = require('fs');

const path = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

const modals = `
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
                <button onClick={() => setDiscountType("percent")} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${discountType === "percent" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}\`}>Percentage (%)</button>
                <button onClick={() => setDiscountType("flat")} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${discountType === "flat" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}\`}>Flat Amount (₹)</button>
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
`;

// Insert the modals right before the final closing div and brace
content = content.replace(/    <\/div>\n  \);\n\}/, modals + '\n    </div>\n  );\n}');

fs.writeFileSync(path, content);
console.log('Modals injected!');
