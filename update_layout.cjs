const fs = require('fs');

const path = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Header Icons (lines ~70-75)
content = content.replace(
  /<div className="flex items-center gap-4 text-indigo-700">[\s\S]*?<\/div>/,
  `<div className="flex items-center gap-4">
          <svg className="w-5 h-5 text-indigo-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="8" x2="7" y2="16"></line><line x1="10" y1="8" x2="10" y2="16"></line><line x1="14" y1="8" x2="14" y2="16"></line><line x1="17" y1="8" x2="17" y2="16"></line></svg>
        </div>`
);

// 2. Top Card
content = content.replace(
  /<div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100">[\s\S]*?Edit[\s\S]*?<\/button>\s*<\/div>/,
  `<div className="flex justify-between items-center px-4 py-4 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-medium text-indigo-700">Sales Invoice #{props.invoiceNumberSeq}</span>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="text-slate-800 font-medium">{formatDate(props.docDate)}</span>
            {renderDueStatus()}
          </div>
        </div>
        <button className="text-[11px] font-bold text-indigo-700 border border-indigo-200 rounded-3xl px-6 py-1.5 uppercase bg-white">
          Edit
        </button>
      </div>`
);

// 3. Party Selection
content = content.replace(
  /<div className="p-4 border-b border-slate-100 bg-white">[\s\S]*?<button[\s\S]*?onClick=\{\(\) => setIsPartyModalOpen\(true\)\}[\s\S]*?className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-white w-full shadow-sm outline-none"[\s\S]*?>[\s\S]*?<div className="flex items-center gap-3 text-slate-500">[\s\S]*?<User className="w-\[18px\] h-\[18px\] text-slate-400" \/>[\s\S]*?<span className=\{props\.partyName \? "text-slate-900 font-medium text-sm" : "text-slate-400 text-sm"\}>[\s\S]*?\{props\.partyName \|\| "Search\/Create Party"\}[\s\S]*?<\/span>[\s\S]*?<\/div>[\s\S]*?<ChevronDown className="w-4 h-4 text-slate-400" \/>[\s\S]*?<\/button>[\s\S]*?<\/div>/,
  `<div className="p-4 border-b border-slate-100 bg-white">
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
      </div>`
);

// 4. Items Header (Empty and Non-Empty)
content = content.replace(
  /<div className="px-4 pt-4 pb-2 text-\[11px\] font-bold text-slate-700 uppercase tracking-wider">\s*ITEMS\s*<\/div>/,
  `<div className="px-4 pt-4 pb-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-slate-500" /> ITEMS
            </div>`
);

content = content.replace(
  /<div className="flex justify-between items-center p-4">[\s\S]*?<div className="flex items-center gap-2 text-\[11px\] font-bold text-slate-700 uppercase tracking-wider">[\s\S]*?<ChevronUp className="w-4 h-4 text-slate-500" \/>[\s\S]*?ITEMS \(\{props\.recalculatedItems\.length\}\)[\s\S]*?<\/div>[\s\S]*?<button onClick=\{\(\) => setIsItemModalOpen\(true\)\} className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1">[\s\S]*?<Plus className="w-\[14px\] h-\[14px\]"\/> Item[\s\S]*?<\/button>[\s\S]*?<\/div>/,
  `<div className="flex justify-between items-center px-4 py-4 bg-white">
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                <ChevronUp className="w-4 h-4 text-slate-500" />
                ITEMS ({props.recalculatedItems.length})
              </div>
              <button onClick={() => setIsItemModalOpen(true)} className="text-[15px] font-bold text-indigo-700 flex items-center gap-1">
                + Item
              </button>
            </div>`
);

// 5. Item Row
content = content.replace(
  /\{props\.recalculatedItems\.map\(\(item, idx\) => \([\s\S]*?<div key=\{idx\} className="flex justify-between items-start px-4 py-3 border-t border-slate-100 bg-white">[\s\S]*?<div className="flex flex-col gap-1">[\s\S]*?<span className="text-sm font-bold text-slate-900">\{item\.name \|\| "Unnamed Item"\}<\/span>[\s\S]*?<div className="text-\[11px\] text-slate-500 flex items-center gap-6 mt-1">[\s\S]*?<div className="flex flex-col">[\s\S]*?<span className="text-\[10px\] text-slate-500">Qty x Rate<\/span>[\s\S]*?<span className="text-slate-800">\{item\.quantity\} \{item\.unit \|\| "BOX"\} x \{item\.rate\}<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<div className="flex flex-col items-end gap-1\.5">[\s\S]*?<span className="text-\[15px\] font-bold text-slate-900">₹ \{Number\(item\.totalAmount \|\| 0\)\.toLocaleString\('en-IN', \{minimumFractionDigits:0\}\)\}<\/span>[\s\S]*?<button[\s\S]*?onClick=\{\(\) => setEditingItemIndex\(idx\)\}[\s\S]*?className="border border-indigo-200 bg-white rounded-full px-3 py-0\.5 text-\[10px\] font-bold text-indigo-500 uppercase"[\s\S]*?>[\s\S]*?EDIT[\s\S]*?<\/button>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  `{props.recalculatedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[15px] font-bold text-slate-900">{item.name || "Unnamed Item"}</span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium tracking-wide">Qty x Rate</span>
                    <span className="text-[12px] text-slate-600 font-medium">{item.quantity} {item.unit || "Pcs"} x {item.rate}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 mt-1">
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(item.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits:0})}</span>
                  <button 
                    onClick={() => setEditingItemIndex(idx)}
                    className="border border-indigo-200 bg-white rounded-3xl px-4 py-1 text-[10px] font-bold text-indigo-600 uppercase"
                  >
                    EDIT
                  </button>
                </div>
              </div>
            ))}`
);

// 6. Subtotals and Options
content = content.replace(
  /<div className="flex justify-between items-center p-4 font-bold border-t border-slate-100 mt-2">[\s\S]*?<span className="text-sm text-slate-700">Item Subtotal<\/span>[\s\S]*?<span className="text-base text-slate-900">\{Number\(props\.totals\?\.rawSubtotal \|\| 0\)\.toLocaleString\('en-IN', \{minimumFractionDigits:2\}\)\}<\/span>[\s\S]*?<\/div>[\s\S]*?<div className="flex flex-col items-end px-4 py-4 gap-4 bg-slate-50\/50">[\s\S]*?<button className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1\.5"><Plus className="w-4 h-4"\/> Additional Charges<\/button>[\s\S]*?<button className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1\.5"><Plus className="w-4 h-4"\/> Discount<\/button>[\s\S]*?<button className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1\.5"><Plus className="w-4 h-4"\/> Round Off<\/button>[\s\S]*?<button className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1\.5"><Plus className="w-4 h-4"\/> Apply TCS<\/button>[\s\S]*?<\/div>/,
  `<div className="flex justify-between items-center px-4 pt-6 pb-2 bg-white">
              <span className="text-[15px] font-bold text-slate-800">Item Subtotal</span>
              <span className="text-[17px] font-bold text-slate-900">{Number(props.totals?.rawSubtotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            </div>

            <div className="flex flex-col items-end px-4 py-4 gap-4 bg-white pb-6">
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Additional Charges</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Discount</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Round Off</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Apply TCS</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Notes</button>
            </div>`
);

// 7. Footer Total Amount
content = content.replace(
  /<div className="flex justify-between items-center px-4 py-3 bg-white">[\s\S]*?<span className="text-\[15px\] font-bold text-slate-800">Total Amount<\/span>[\s\S]*?<div className="flex items-center gap-1 border-b border-slate-300 pb-0\.5 min-w-\[120px\] justify-end">[\s\S]*?<span className="text-sm text-slate-600">₹<\/span>[\s\S]*?<span className="text-\[17px\] font-bold text-slate-900">\{Number\(props\.totals\?\.grandTotal \|\| 0\)\.toLocaleString\('en-IN', \{minimumFractionDigits:2\}\)\}<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  `<div className="flex justify-between items-center px-4 py-4 bg-white">
          <span className="text-[15px] font-bold text-slate-900">Total Amount</span>
          <div className="flex flex-col items-end">
            <span className="text-[17px] font-bold text-slate-900 mb-1 border-b border-slate-300 min-w-[120px] text-right pb-1">₹ {Number(props.totals?.grandTotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
          </div>
        </div>`
);

// Remove the standalone Notes section since we added it to the options list
content = content.replace(
  /\{\/\* Optional Note Section \*\/\}[\s\S]*?\{props\.recalculatedItems\.length > 0 && \([\s\S]*?<div className="flex justify-end px-4 py-2 pb-6 bg-slate-50\/50">[\s\S]*?<button className="text-\[13px\] font-bold text-indigo-700 flex items-center gap-1\.5"><Plus className="w-4 h-4"\/> Notes<\/button>[\s\S]*?<\/div>[\s\S]*?\)\}/,
  ''
);

fs.writeFileSync(path, content);
console.log('MobileCreateInvoice layout updated successfully!');
