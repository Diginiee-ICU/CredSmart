const fs = require('fs');

// 1. Update MobileCreateInvoiceProps in MobileCreateInvoice.tsx
let mobileInvoicePath = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let mobileInvoiceContent = fs.readFileSync(mobileInvoicePath, 'utf8');

const propsTarget = `  onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
  onUpdateNotes?: (notes: string) => void;
}`;
const propsReplace = `  onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
  onUpdateNotes?: (notes: string) => void;
  amountReceived?: number;
  markAsFullyPaid?: boolean;
  onUpdatePayment?: (amountReceived: number, markAsFullyPaid: boolean) => void;
}`;
mobileInvoiceContent = mobileInvoiceContent.replace(propsTarget, propsReplace);

// 2. Add Toast import
if (!mobileInvoiceContent.includes('import { toast }')) {
  mobileInvoiceContent = mobileInvoiceContent.replace('import { SelectPartyModal }', 'import { toast } from "@/hooks/use-toast";\nimport { SelectPartyModal }');
}

// 3. Add Payment UI right before Total Amount
const totalAmountTarget = `            {/* 3.9 Total Amount & Action Buttons */}`;
const totalAmountReplace = `            {/* Payment Received Section */}
            <div className="px-4 py-5 bg-white border-b border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-sm tracking-wide">Mark as Fully Paid</span>
                <input 
                  type="checkbox" 
                  checked={props.markAsFullyPaid} 
                  onChange={(e) => {
                    if (props.onUpdatePayment) {
                      props.onUpdatePayment(e.target.checked ? (props.totals?.grandTotal || 0) : 0, e.target.checked);
                    }
                  }} 
                  className="w-5 h-5 accent-indigo-600 rounded" 
                />
              </div>
              {!props.markAsFullyPaid && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Amount Received (₹)</label>
                  <input 
                    type="number" 
                    value={props.amountReceived || ""} 
                    onChange={(e) => {
                       const val = Number(e.target.value);
                       if (props.onUpdatePayment) {
                         props.onUpdatePayment(val, val >= (props.totals?.grandTotal || 0));
                       }
                    }} 
                    placeholder="0.00" 
                    className="w-full border border-slate-200 rounded-xl p-3.5 outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-colors" 
                  />
                </div>
              )}
            </div>

            {/* 3.9 Total Amount & Action Buttons */}`;
mobileInvoiceContent = mobileInvoiceContent.replace(totalAmountTarget, totalAmountReplace);

// 4. Add toasts for unimplemented features
mobileInvoiceContent = mobileInvoiceContent.replace(
  /<button onClick=\{\(\) => \{\}\} className="text-\[14px\] font-bold text-indigo-700 tracking-wide opacity-50">\+ Apply TCS<\/button>/g,
  `<button onClick={() => toast({title: "Coming Soon", description: "TCS is currently handled automatically by the backend."})} className="text-[14px] font-bold text-indigo-700 tracking-wide">+ Apply TCS</button>`
);

mobileInvoiceContent = mobileInvoiceContent.replace(
  /<FileText className="w-6 h-6 text-indigo-700" \/>/g,
  `<FileText onClick={() => toast({title: "Coming Soon", description: "Invoice settings will be available here."})} className="w-6 h-6 text-indigo-700 cursor-pointer" />`
);

mobileInvoiceContent = mobileInvoiceContent.replace(
  /<ScanBarcode className="w-6 h-6 text-orange-500" \/>/g,
  `<ScanBarcode onClick={() => toast({title: "Coming Soon", description: "Mobile Barcode Scanning is coming soon!"})} className="w-6 h-6 text-orange-500 cursor-pointer" />`
);

fs.writeFileSync(mobileInvoicePath, mobileInvoiceContent);


// 5. Wire props in SalesInvoiceModal.tsx
let salesModalPath = 'src/components/SalesInvoiceModal.tsx';
let salesModalContent = fs.readFileSync(salesModalPath, 'utf8');

const onUpdateNotesTarget = `              onUpdateNotes={(txt) => {
                setShowNotes(true);
                setNotes(txt);
              }}`;
const onUpdateNotesReplace = `              onUpdateNotes={(txt) => {
                setShowNotes(true);
                setNotes(txt);
              }}
              amountReceived={amountReceived}
              markAsFullyPaid={markAsFullyPaid}
              onUpdatePayment={(amt, full) => {
                 setAmountReceived(amt);
                 setMarkAsFullyPaid(full);
              }}`;
salesModalContent = salesModalContent.replace(onUpdateNotesTarget, onUpdateNotesReplace);

fs.writeFileSync(salesModalPath, salesModalContent);
console.log('Payment fields and toasts injected!');
