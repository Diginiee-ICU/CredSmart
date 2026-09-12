const fs = require('fs');
const path = 'src/components/SalesInvoiceModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file should have:
// <MobileCreateInvoice
//   onClose={() => onOpenChange(false)}
// ...
// />
// Let's replace the opening tag:
const jsxStart = '<MobileCreateInvoice';
const replacementStart = `{mobileSuccessInvoice ? (
            <MobileInvoiceSuccessView
              invoice={mobileSuccessInvoice}
              onClose={() => {
                setMobileSuccessInvoice(null);
                onOpenChange(false);
              }}
            />
          ) : (
            <MobileCreateInvoice`;

if (!content.includes('mobileSuccessInvoice ?')) {
  content = content.replace(jsxStart, replacementStart);
}

// Find where <MobileCreateInvoice ends
// We need to find the specific closing tag '/>' for it.
// We can use a regex to match the end of <MobileCreateInvoice ... />
const regex = /(<MobileCreateInvoice[\s\S]*?onUpdateNotes=\{\(txt\) => \{\s*setShowNotes\(true\);\s*setNotes\(txt\);\s*\}\}\s*\/>)/g;
content = content.replace(regex, '$1\n          )}');

fs.writeFileSync(path, content);
console.log('Fixed JSX');
