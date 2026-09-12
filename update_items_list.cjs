const fs = require('fs');
const path = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Filter out empty items for display
const oldFilter = `            {props.recalculatedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[15px] font-bold text-slate-900">{item.name || "Unnamed Item"}</span>`;

const newFilter = `            {props.recalculatedItems.filter(item => item.productName && item.productName.trim() !== "").map((item, idx) => {
              // We need the original index for editing
              const originalIndex = props.recalculatedItems.indexOf(item);
              return (
              <div key={originalIndex} className="flex justify-between items-start px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[15px] font-bold text-slate-900">{item.productName || "Unnamed Item"}</span>`;
                  
content = content.replace(oldFilter, newFilter);

// 2. Also close the map properly
const oldMapClose = `                  <button 
                    onClick={() => setEditingItemIndex(idx)}
                    className="border border-indigo-200 bg-white rounded-3xl px-4 py-1 text-[10px] font-bold text-indigo-600 uppercase"
                  >
                    EDIT
                  </button>
                </div>
              </div>
            ))}`;

const newMapClose = `                  <button 
                    onClick={() => setEditingItemIndex(originalIndex)}
                    className="border border-indigo-200 bg-white rounded-3xl px-4 py-1 text-[10px] font-bold text-indigo-600 uppercase"
                  >
                    EDIT
                  </button>
                </div>
              </div>
            );
            })}`;
content = content.replace(oldMapClose, newMapClose);

// 3. Fix the items count header:
content = content.replace(
  /ITEMS \(\{props\.recalculatedItems\.length\}\)/g,
  `ITEMS ({props.recalculatedItems.filter(i => i.productName && i.productName.trim() !== "").length})`
);

// 4. Fix empty state detection:
content = content.replace(
  /props\.recalculatedItems\.length === 0/g,
  `props.recalculatedItems.filter(i => i.productName && i.productName.trim() !== "").length === 0`
);
content = content.replace(
  /props\.recalculatedItems\.length > 0/g,
  `props.recalculatedItems.filter(i => i.productName && i.productName.trim() !== "").length > 0`
);

fs.writeFileSync(path, content);
console.log("Fixed empty items bug!");
