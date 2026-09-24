const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// Read the UTF-16 file correctly
const buffer = fs.readFileSync('Master.xml');
let xmlText = buffer.toString('utf16le');

xmlText = xmlText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
xmlText = xmlText.replace(/&(?!(?:apos|quot|[lg]t|amp);|#)/g, '&amp;');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlText, 'text/xml');

const groupEls = doc.getElementsByTagName('GROUP');
const ledgerEls = doc.getElementsByTagName('LEDGER');

console.log('Groups found:', groupEls.length);
console.log('Ledgers found:', ledgerEls.length);

let debtors = 0;
for (let i=0; i<ledgerEls.length; i++) {
   const el = ledgerEls[i];
   const parentEls = el.getElementsByTagName('PARENT');
   if (parentEls.length > 0) {
      const parent = parentEls[0].textContent;
      if (parent.includes('Debtor') || parent.includes('Creditor')) {
         debtors++;
      }
   }
}
console.log('Direct Debtor/Creditor Ledgers:', debtors);

