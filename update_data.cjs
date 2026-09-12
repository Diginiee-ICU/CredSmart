const fs = require('fs');
const path = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `<div className="flex flex-col items-end px-4 py-4 gap-4 bg-white pb-6">
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Additional Charges</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Discount</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Round Off</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Apply TCS</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Notes</button>
            </div>`;

const newBlock = `<div className="flex flex-col items-end px-4 py-4 gap-4 bg-white pb-6">
              {(props.totals?.additionalCharges || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Additional Charges</span>
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(props.totals.additionalCharges).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Additional Charges</button>
              )}

              {(props.totals?.totalDiscount || 0) > 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Discount</span>
                  <span className="text-[15px] font-bold text-slate-900">- ₹ {Number(props.totals.totalDiscount).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Discount</button>
              )}

              {(props.totals?.taxTotal || 0) > 0 && (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Tax Amount</span>
                  <span className="text-[15px] font-bold text-slate-900">₹ {Number(props.totals.taxTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              )}

              {(props.totals?.roundOff || 0) !== 0 ? (
                <div className="flex justify-between items-center w-full">
                  <span className="text-[14px] font-bold text-slate-700 tracking-wide">Round Off</span>
                  <span className="text-[15px] font-bold text-slate-900">{(props.totals.roundOff > 0 ? "+ " : "- ")}₹ {Math.abs(Number(props.totals.roundOff)).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ) : (
                <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Round Off</button>
              )}

              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Apply TCS</button>
              <button className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Notes</button>
            </div>`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content);
console.log("Updated data rendering!");
