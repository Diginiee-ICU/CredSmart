const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/SalesInvoiceModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import MobileInvoiceSuccessView
if (!content.includes('MobileInvoiceSuccessView')) {
  content = content.replace(
    'import { MobileCreateInvoice } from "@/components/invoices/mobile/MobileCreateInvoice";',
    'import { MobileCreateInvoice } from "@/components/invoices/mobile/MobileCreateInvoice";\nimport { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";'
  );
}

// 2. Add state
if (!content.includes('mobileSuccessInvoice')) {
  content = content.replace(
    'const [showQuickCreateItemModal, setShowQuickCreateItemModal] = useState(false);',
    'const [showQuickCreateItemModal, setShowQuickCreateItemModal] = useState(false);\n  const [mobileSuccessInvoice, setMobileSuccessInvoice] = useState<BusinessDocument | null>(null);'
  );
}

// 3. Update handleSave
// Look for `if (saveAndNew) {` around line 1250 (inside handleSave)
// The original looks like:
//         if (andPrint) {
//           ...
//         }
//         if (saveAndNew) {
//           resetForm();
//         } else {
//           onOpenChange(false);
//         }

content = content.replace(
  `        if (saveAndNew) {
          resetForm();
        } else {
          onOpenChange(false);
        }`,
  `        if (saveAndNew) {
          resetForm();
        } else if (window.innerWidth < 1024) { // mobile breakpoint
          setMobileSuccessInvoice(saved);
        } else {
          onOpenChange(false);
        }`
);

// 4. Update the render:
// Replace the block lg:hidden rendering MobileCreateInvoice
// With a conditional rendering between MobileCreateInvoice and MobileInvoiceSuccessView
const origMobileRender = `<MobileCreateInvoice
              onClose={() => onOpenChange(false)}
              docType={docType}`;

const newMobileRender = `{mobileSuccessInvoice ? (
              <MobileInvoiceSuccessView
                invoice={mobileSuccessInvoice}
                onClose={() => {
                  setMobileSuccessInvoice(null);
                  onOpenChange(false);
                }}
              />
            ) : (
              <MobileCreateInvoice
                onClose={() => onOpenChange(false)}
                docType={docType}`;

content = content.replace(origMobileRender, newMobileRender);

// Also we need to close the conditional block at the end of MobileCreateInvoice props
// Wait, MobileCreateInvoice is self closing: />
const origMobileRenderEnd = `              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveRow}
              onSave={handleSave}
            />`;

const newMobileRenderEnd = `              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveRow}
              onSave={handleSave}
            />
            )}`;

content = content.replace(origMobileRenderEnd, newMobileRenderEnd);

fs.writeFileSync(filePath, content);
console.log('Done replacing!');
