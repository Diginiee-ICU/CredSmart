const fs = require('fs');

// 1. Update MobileCreateInvoice.tsx to trigger ReceiptModal
let mobileInvoicePath = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let mobileInvoiceContent = fs.readFileSync(mobileInvoicePath, 'utf8');
mobileInvoiceContent = mobileInvoiceContent.replace(
  /const handleGenerateBill = \(\) => \{\n\s*props\.onSave\(false, false\);\n\s*\};/g,
  'const handleGenerateBill = () => {\n    props.onSave(true, false);\n  };'
);
fs.writeFileSync(mobileInvoicePath, mobileInvoiceContent);

// 2. Revert SalesInvoiceModal.tsx back to original (removing MobileInvoiceSuccessView logic)
let salesModalPath = 'src/components/SalesInvoiceModal.tsx';
let salesModalContent = fs.readFileSync(salesModalPath, 'utf8');

// Remove import
salesModalContent = salesModalContent.replace(/import \{ MobileInvoiceSuccessView \} from "@\/components\/invoices\/mobile\/MobileInvoiceSuccessView";\n/g, '');

// Revert JSX
const jsxRegex = /\{mobileSuccessInvoice \? \(<MobileInvoiceSuccessView[\s\S]*?<\/> : /g;
salesModalContent = salesModalContent.replace(/\{mobileSuccessInvoice \? <MobileInvoiceSuccessView[\s\S]*?\/> : /g, '');
salesModalContent = salesModalContent.replace(/<\/MobileCreateInvoice>\}/g, '</MobileCreateInvoice>');

// Revert handleSave
const handleSaveRegex = /\} else if \(window\.innerWidth < 1024\) \{\n\s*setMobileSuccessInvoice\(saved\);\n\s*\}/g;
salesModalContent = salesModalContent.replace(handleSaveRegex, '}');
fs.writeFileSync(salesModalPath, salesModalContent);

// 3. Update ReceiptModal.tsx
let receiptModalPath = 'src/components/ReceiptModal.tsx';
let receiptModalContent = fs.readFileSync(receiptModalPath, 'utf8');

// Set default state to A4 if on mobile
receiptModalContent = receiptModalContent.replace(
  /const \[layout, setLayout\] = useState<"80mm" \| "58mm" \| "a4">\("80mm"\);/g,
  'const [layout, setLayout] = useState<"80mm" | "58mm" | "a4">(typeof window !== "undefined" && window.innerWidth < 1024 ? "a4" : "80mm");'
);

// Hide the layout switcher on mobile
receiptModalContent = receiptModalContent.replace(
  /className="flex bg-slate-950 p-0\.5 sm:p-1 rounded-xl border border-slate-800 shrink-0"/g,
  'className="hidden sm:flex bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0"'
);

fs.writeFileSync(receiptModalPath, receiptModalContent);
console.log('Done mapping ReceiptModal!');
