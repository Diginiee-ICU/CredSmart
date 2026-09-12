const fs = require('fs');

let mobileInvoicePath = 'src/components/invoices/mobile/MobileCreateInvoice.tsx';
let content = fs.readFileSync(mobileInvoicePath, 'utf8');

const regex = /\{\/\* Smart Banner shown only when empty \*\/\}\s*\{props\.recalculatedItems\.filter\(i => i\.productName && i\.productName\.trim\(\) !== ""\)\.length === 0 && \(\s*<div className="relative bg-\[#FFF4ED\][\s\S]*?<\/button>\s*<\/div>\s*\)\}\s*/g;

content = content.replace(regex, '');

fs.writeFileSync(mobileInvoicePath, content);
console.log('Banner removed!');
