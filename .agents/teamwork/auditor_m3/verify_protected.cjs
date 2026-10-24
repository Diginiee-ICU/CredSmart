const { execSync } = require('child_process');
const git = 'C:\\Users\\bishn\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe';
const files = [
  'src/components/invoices/mobile/MobileCreateInvoice.tsx',
  'src/components/invoices/mobile/AddItemModal.tsx',
  'src/components/invoices/mobile/SelectPartyModal.tsx',
  'src/components/invoices/mobile/EditItemModal.tsx',
  'src/components/invoices/mobile/MobileInvoiceSuccessView.tsx',
  'src/components/invoices/mobile/MobileBillPreviewModal.tsx',
  'src/components/invoices/mobile/MobileInvoiceFitViewer.tsx',
  'src/components/invoices/mobile/CreatePartyModal.tsx',
  'src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx',
  'src/components/items/mobile/CreateNewItemModal.tsx',
  'src/components/SalesInvoiceModal.tsx',
  'src/components/PurchaseInvoiceModal.tsx',
  'src/components/invoices/AddItemsToBillModal.tsx',
  'src/components/invoices/InvoiceFitView.tsx',
  'src/components/invoices/UnifiedInvoiceRenderer.tsx',
  'src/utils/downloadExactInvoice.ts',
  'src/utils/whatsappPdfShare.ts',
  'src/utils/invoiceThemeLoader.ts',
  'src/services/documentsService.ts'
];

console.log('=== STARTING FORENSIC AUDIT: 19 QUARANTINED PROTECTED FILES ===');
let allClean = true;
let passCount = 0;

for (const file of files) {
  try {
    const diff = execSync(`"${git}" diff HEAD -- "${file}"`, { cwd: 'c:\\Users\\bishn\\OneDrive\\Documents\\GitHub\\CredSmart' }).toString().trim();
    if (diff.length > 0) {
      console.log(`[FAIL - MODIFIED] ${file}`);
      console.log(diff);
      allClean = false;
    } else {
      console.log(`[PASS - 0 DIFF] ${file}`);
      passCount++;
    }
  } catch (err) {
    console.error(`Error running diff on ${file}:`, err);
    allClean = false;
  }
}

console.log('===============================================================');
console.log(`Summary: ${passCount} / ${files.length} protected files untouched.`);
if (allClean && passCount === 19) {
  console.log('VERDICT: ZERO LINES MODIFIED IN ALL 19 QUARANTINED FILES.');
  process.exit(0);
} else {
  console.log('VERDICT: INTEGRITY VIOLATION - PROTECTED FILE MODIFIED.');
  process.exit(1);
}
