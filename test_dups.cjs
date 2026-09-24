const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

const buffer = fs.readFileSync('Master.xml');
let xmlText = buffer.toString('utf16le');
xmlText = xmlText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
xmlText = xmlText.replace(/&#[0-8];|&#1[12];|&#1[4-9];|&#2[0-9];|&#3[01];/g, '');
xmlText = xmlText.replace(/&(?!(?:apos|quot|[lg]t|amp);|#)/g, '&amp;');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlText, 'text/xml');

function getAttr(el, attr) {
  if (el.hasAttribute(attr)) return el.getAttribute(attr);
  return "";
}

function getText(el, tagName) {
  const child = el.getElementsByTagName(tagName);
  if (child && child.length > 0) {
    return child[0].textContent || "";
  }
  return "";
}

const ledgerEls = doc.getElementsByTagName("LEDGER");
const names = new Set();
let dups = 0;
for (let i = 0; i < ledgerEls.length; i++) {
  const el = ledgerEls[i];
  let name = getAttr(el, "NAME") || getText(el, "NAME");
  if (!name) continue;
  name = name.toLowerCase().trim();
  if (names.has(name)) {
     console.log('Duplicate:', name);
     dups++;
  }
  names.add(name);
}
console.log('Total Duplicates:', dups);
