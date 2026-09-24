const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// Read the UTF-16 file correctly
const buffer = fs.readFileSync('Master.xml');
let xmlText = buffer.toString('utf16le');
xmlText = xmlText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
xmlText = xmlText.replace(/&(?!(?:apos|quot|[lg]t|amp);|#)/g, '&amp;');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlText, 'text/xml');

// Emulate parseTallyXml ledger parser
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

const map = new Map();
const groupEls = doc.getElementsByTagName("GROUP");
for (let i = 0; i < groupEls.length; i++) {
   const g = groupEls[i];
   const name = (getAttr(g, "NAME") || getText(g, "NAME")).toLowerCase().trim();
   const parent = getText(g, "PARENT").toLowerCase().trim();
   if (name && parent) { map.set(name, parent); }
}

function resolveRootGroupType(groupName, hierarchy) {
  let curr = groupName.toLowerCase().trim();
  let depth = 0;
  while (curr && depth < 12) {
    if (curr.includes("debtor") || curr.includes("customer")) return "customer";
    if (curr.includes("creditor") || curr.includes("supplier")) return "supplier";
    if (curr.includes("bank account") || curr.includes("bank od") || curr.includes("bank occ")) return "bank";
    if (curr.includes("cash-in-hand")) return "cash";
    
    if (hierarchy.has(curr)) {
      curr = hierarchy.get(curr);
      depth++;
    } else {
      break;
    }
  }
  return "other";
}

const parties = [];
const ledgerEls = doc.getElementsByTagName("LEDGER");
for (let i = 0; i < ledgerEls.length; i++) {
  const el = ledgerEls[i];
  const name = getAttr(el, "NAME") || getText(el, "NAME");
  if (!name) continue;

  const parent = getText(el, "PARENT") || "";
  const rootType = resolveRootGroupType(parent, map);
  
  if (rootType !== "customer" && rootType !== "supplier" && rootType !== "other") {
    continue;
  }
  if (rootType === "other") {
    const pLow = parent.toLowerCase();
    if (!pLow.includes("debtor") && !pLow.includes("creditor") && !pLow.includes("party")) {
      continue;
    }
  }
  parties.push({ name, rootType, parent });
}
console.log('Parties extracted:', parties.length);
