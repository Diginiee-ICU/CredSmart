const fs = require('fs');
const path = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add props to MobileCreateInvoiceProps
const oldPropsTarget = `  onAddSelectedItems: (items: DocumentLineItem[]) => void;
}`;
const newPropsTarget = `  onAddSelectedItems: (items: DocumentLineItem[]) => void;
  onUpdateAdditionalCharges?: (amount: number, reason: string) => void;
  onUpdateDiscount?: (type: "flat" | "percent", value: number) => void;
  onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
  onUpdateNotes?: (notes: string) => void;
}`;
content = content.replace(oldPropsTarget, newPropsTarget);

// 2. Add state inside MobileCreateInvoice
const oldStateTarget = `  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);`;
const newStateTarget = `  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
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
  const [notes, setNotes] = useState("");`;
content = content.replace(oldStateTarget, newStateTarget);

// 3. Update the buttons to open the modals, and the rows to be clickable to edit
content = content.replace(
  /<span className="text-\[14px\] font-bold text-slate-700 tracking-wide">Additional Charges<\/span>/g,
  `<span onClick={() => setIsChargesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Additional Charges</span>`
);
content = content.replace(
  /<button className="text-\[14px\] font-bold text-indigo-700 tracking-wide">\+ Additional Charges<\/button>/g,
  `<button onClick={() => setIsChargesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Additional Charges</button>`
);

content = content.replace(
  /<span className="text-\[14px\] font-bold text-slate-700 tracking-wide">Discount<\/span>/g,
  `<span onClick={() => setIsDiscountModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Discount</span>`
);
content = content.replace(
  /<button className="text-\[14px\] font-bold text-indigo-700 tracking-wide">\+ Discount<\/button>/g,
  `<button onClick={() => setIsDiscountModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Discount</button>`
);

content = content.replace(
  /<span className="text-\[14px\] font-bold text-slate-700 tracking-wide">Round Off<\/span>/g,
  `<span onClick={() => setIsRoundOffModalOpen(true)} className="text-[14px] font-bold text-indigo-700 underline tracking-wide cursor-pointer">Round Off</span>`
);
content = content.replace(
  /<button className="text-\[14px\] font-bold text-indigo-700 tracking-wide">\+ Round Off<\/button>/g,
  `<button onClick={() => setIsRoundOffModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Round Off</button>`
);

content = content.replace(
  /<button className="text-\[14px\] font-bold text-indigo-700 tracking-wide">\+ Apply TCS<\/button>/g,
  `<button onClick={() => {}} className="text-[14px] font-bold text-indigo-700 tracking-wide opacity-50">+ Apply TCS</button>`
);

content = content.replace(
  /<button className="text-\[14px\] font-bold text-indigo-700 tracking-wide">\+ Notes<\/button>/g,
  `<button onClick={() => setIsNotesModalOpen(true)} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Notes</button>`
);


// 4. Inject the modals at the end of the return statement
const modalsJSX = `
      {/* 3.10 Modals */}
      {isChargesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Additional Charges</h3>
              <button onClick={() => setIsChargesModalOpen(false)} className="p-1 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
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
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Overall Discount</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="p-1 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setDiscountType("flat")} className={\`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all \${discountType === "flat" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}\`}>Flat (₹)</button>
                <button onClick={() => setDiscountType("percent")} className={\`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all \${discountType === "percent" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500"}\`}>Percentage (%)</button>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Value</label>
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" />
              </div>
              <button onClick={() => {
                 if (props.onUpdateDiscount) props.onUpdateDiscount(discountType, Number(discountValue));
                 setIsDiscountModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {isRoundOffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Round Off</h3>
              <button onClick={() => setIsRoundOffModalOpen(false)} className="p-1 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="font-bold text-slate-700 text-sm">Auto Round Off</span>
                <input type="checkbox" checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              </div>
              {!autoRoundOff && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 mt-2">Manual Round Off</label>
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
          <div className="bg-white w-full rounded-t-2xl p-4 pb-8 shadow-xl animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Notes</h3>
              <button onClick={() => setIsNotesModalOpen(false)} className="p-1 rounded-full bg-slate-100"><X className="w-5 h-5 text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any extra information here..." className="w-full border border-slate-200 rounded-xl p-3.5 outline-none h-32 resize-none font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors"></textarea>
              <button onClick={() => {
                 if (props.onUpdateNotes) props.onUpdateNotes(notes);
                 setIsNotesModalOpen(false);
              }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-transform">Save Notes</button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(/    <\/div>\s*<\/div>\s*\);\s*\}\s*$/, `    </div>\n${modalsJSX}\n    </div>\n  );\n}\n`);

fs.writeFileSync(path, content);
console.log("Injected Modals into MobileCreateInvoice!");
