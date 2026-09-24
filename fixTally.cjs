const fs = require('fs');

let content = fs.readFileSync('src/utils/tallyXmlParser.ts', 'utf8');

// 1. Add queryNodes and queryNode helpers
const helpers = `
function queryNodes(el: Element | null, tags: string[]): Element[] {
  if (!el) return [];
  const results: Element[] = [];
  tags.forEach(tag => {
    const nodes = el.getElementsByTagName(tag);
    for (let i = 0; i < nodes.length; i++) {
      results.push(nodes[i]);
    }
  });
  return results;
}

function queryNode(el: Element | null, tags: string[]): Element | null {
  const nodes = queryNodes(el, tags);
  return nodes.length > 0 ? nodes[0] : null;
}
`;
if (!content.includes('function queryNodes')) {
  content = content.replace('// ─── XML & Numeric Extraction Helpers ─────────────────────────────────────────', '// ─── XML & Numeric Extraction Helpers ─────────────────────────────────────────\n' + helpers);
}

// 2. Replace all querySelector/querySelectorAll with \\. to use the new helpers
content = content.replace(/el\.querySelectorAll\("GSTDETAILS\\\\\.LIST, GSTDETAILS, RATEDETAILS\\\\\.LIST, RATEDETAILS"\)/g, 'queryNodes(el, ["GSTDETAILS.LIST", "GSTDETAILS", "RATEDETAILS.LIST", "RATEDETAILS"])');
content = content.replace(/el\.querySelector\("STANDARDCOSTLIST\\\\\.LIST, STANDARDCOSTLIST"\)/g, 'queryNode(el, ["STANDARDCOSTLIST.LIST", "STANDARDCOSTLIST"])');
content = content.replace(/el\.querySelector\("STANDARDPRICELIST\\\\\.LIST, STANDARDPRICELIST"\)/g, 'queryNode(el, ["STANDARDPRICELIST.LIST", "STANDARDPRICELIST"])');
content = content.replace(/el\.querySelector\("HSNDETAILS\\\\\.LIST, HSNDETAILS"\)/g, 'queryNode(el, ["HSNDETAILS.LIST", "HSNDETAILS"])');
content = content.replace(/el\.querySelector\("MAILINGNAME\\\\\.LIST, MAILINGNAME"\)/g, 'queryNode(el, ["MAILINGNAME.LIST", "MAILINGNAME"])');
content = content.replace(/el\.querySelector\("ADDRESS\\\\\.LIST, ADDRESSLIST"\)/g, 'queryNode(el, ["ADDRESS.LIST", "ADDRESSLIST"])');
content = content.replace(/el\.querySelectorAll\("ALLINVENTORYENTRIES\\\\\.LIST, INVENTORYENTRIES\\\\\.LIST, ALLINVENTORYENTRIES"\)/g, 'queryNodes(el, ["ALLINVENTORYENTRIES.LIST", "INVENTORYENTRIES.LIST", "ALLINVENTORYENTRIES"])');
content = content.replace(/inv\.querySelector\("BATCHALLOCATIONS\\\\\.LIST, BATCHALLOCATIONS"\)/g, 'queryNode(inv, ["BATCHALLOCATIONS.LIST", "BATCHALLOCATIONS"])');
content = content.replace(/el\.querySelectorAll\("ALLLEDGERENTRIES\\\\\.LIST, LEDGERENTRIES\\\\\.LIST, ALLLEDGERENTRIES"\)/g, 'queryNodes(el, ["ALLLEDGERENTRIES.LIST", "LEDGERENTRIES.LIST", "ALLLEDGERENTRIES"])');
content = content.replace(/el\.querySelector\("BANKDETAILS, BANKDETAILS\\\\\.LIST"\)/g, 'queryNode(el, ["BANKDETAILS", "BANKDETAILS.LIST"])');

// 3. Fix baseunits issue (Issue 21)
content = content.replace(/const unit = mapTallyUnit\(qtyRaw\);/g, 'const unit = mapTallyUnit(getText(inv, "BASEUNITS") || getText(inv, "UNIT") || qtyRaw);');

// 4. Fix Dropping non-standard ledgers (Issue 15)
content = content.replace(`    // If "other", check if it contains debtor or creditor
    if (rootType === "other") {
      const pLow = parent.toLowerCase();
      if (!pLow.includes("debtor") && !pLow.includes("creditor") && !pLow.includes("party")) {
        return;
      }
    }`, `    // If "other", check if it contains debtor or creditor - Removed to include custom wholesale/retail groups`);

// 5. Fix Wrong Credit Balance Polarity (Issue 18)
content = content.replace(`    const isDeemedPositive = getText(el, "ISDEEMEDPOSITIVE").toLowerCase();
    const isCr = isDeemedPositive === "no" || isCrBalance(openingRaw);`, `    const isDeemedPositive = getText(el, "ISDEEMEDPOSITIVE").toLowerCase();
    let isCr = isCrBalance(openingRaw);
    if (isDeemedPositive === "yes") isCr = false;
    else if (isDeemedPositive === "no") isCr = true;`);

// 6. Fix TotalAmount calculation in Vouchers (Issue 11)
// Replace the voucher ledger loop and amount logic
const oldVoucherLogic = `    // Parse Ledger Entries
    const ledgerEntries: TallyLedgerEntry[] = [];
    let totalAmount = 0;
    const ledgerEls = queryNodes(el, ["ALLLEDGERENTRIES.LIST", "LEDGERENTRIES.LIST", "ALLLEDGERENTRIES"]);
    ledgerEls.forEach((entry) => {
      const ledgerName = getText(entry, "LEDGERNAME");
      const amountRaw = getText(entry, "AMOUNT");
      const isDr = !amountRaw.includes("-");
      const amount = parseAmount(amountRaw);

      if (ledgerName && amount > 0) {
        ledgerEntries.push({ ledgerName, amount, isDr });
        // Party or Net Invoice Amount
        const isTaxOrDiscount =
          ledgerName.toLowerCase().includes("gst") ||
          ledgerName.toLowerCase().includes("tax") ||
          ledgerName.toLowerCase().includes("round") ||
          ledgerName.toLowerCase().includes("discount");

        if (!isTaxOrDiscount) {
          totalAmount = Math.max(totalAmount, amount);
        }
      }
    });

    if (totalAmount === 0 && items.length > 0) {
      totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
    }

    const voucher: TallyVoucher = {
      voucherNumber,
      date: parseTallyDate(dateRaw),
      voucherType: "Sales",
      partyName: partyName || "Cash / General",
      partyGstin: partyGstin || undefined,
      placeOfSupply: placeOfSupply || undefined,
      amount: totalAmount,
      narration: narration || undefined,
      ledgerEntries,
      items: items.length > 0 ? items : undefined,
    };`;

const oldVoucherLogicFallback = `    // Parse Ledger Entries
    const ledgerEntries: TallyLedgerEntry[] = [];
    let totalAmount = 0;
    const ledgerEls = el.querySelectorAll("ALLLEDGERENTRIES\\\\.LIST, LEDGERENTRIES\\\\.LIST, ALLLEDGERENTRIES");
    ledgerEls.forEach((entry) => {
      const ledgerName = getText(entry, "LEDGERNAME");
      const amountRaw = getText(entry, "AMOUNT");
      const isDr = !amountRaw.includes("-");
      const amount = parseAmount(amountRaw);

      if (ledgerName && amount > 0) {
        ledgerEntries.push({ ledgerName, amount, isDr });
        // Party or Net Invoice Amount
        const isTaxOrDiscount =
          ledgerName.toLowerCase().includes("gst") ||
          ledgerName.toLowerCase().includes("tax") ||
          ledgerName.toLowerCase().includes("round") ||
          ledgerName.toLowerCase().includes("discount");

        if (!isTaxOrDiscount) {
          totalAmount = Math.max(totalAmount, amount);
        }
      }
    });

    if (totalAmount === 0 && items.length > 0) {
      totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
    }

    const voucher: TallyVoucher = {
      voucherNumber,
      date: parseTallyDate(dateRaw),
      voucherType: "Sales",
      partyName: partyName || "Cash / General",
      partyGstin: partyGstin || undefined,
      placeOfSupply: placeOfSupply || undefined,
      amount: totalAmount,
      narration: narration || undefined,
      ledgerEntries,
      items: items.length > 0 ? items : undefined,
    };`;

const newVoucherLogic = `    // Parse Ledger Entries
    const ledgerEntries: TallyLedgerEntry[] = [];
    let partyTotal = 0;
    let taxTotal = 0;
    const ledgerEls = queryNodes(el, ["ALLLEDGERENTRIES.LIST", "LEDGERENTRIES.LIST", "ALLLEDGERENTRIES"]);
    ledgerEls.forEach((entry) => {
      const ledgerName = getText(entry, "LEDGERNAME");
      const amountRaw = getText(entry, "AMOUNT");
      const isDr = !amountRaw.includes("-");
      const amount = parseAmount(amountRaw);

      if (ledgerName && amount > 0) {
        ledgerEntries.push({ ledgerName, amount, isDr });
        const lower = ledgerName.toLowerCase();
        if (lower.includes("gst") || lower.includes("igst") || lower.includes("cgst") || lower.includes("sgst") || lower.includes("tax")) {
          taxTotal += amount;
        } else if (lower.trim() === partyName.toLowerCase().trim() || lower.includes("cash") || lower.includes("bank")) {
          partyTotal = amount; // usually the full invoice amount
        }
      }
    });

    let itemsTotal = 0;
    if (items.length > 0) {
      itemsTotal = items.reduce((sum, it) => sum + it.amount, 0);
    }
    
    // Fallback if party ledger didn't match perfectly
    if (partyTotal === 0) {
       partyTotal = itemsTotal + taxTotal;
    }

    const voucher: TallyVoucher = {
      voucherNumber,
      date: parseTallyDate(dateRaw),
      voucherType: "Sales",
      partyName: partyName || "Cash / General",
      partyGstin: partyGstin || undefined,
      placeOfSupply: placeOfSupply || undefined,
      amount: partyTotal || itemsTotal,
      subtotal: itemsTotal,
      taxAmount: taxTotal,
      narration: narration || undefined,
      ledgerEntries,
      items: items.length > 0 ? items : undefined,
    };`;

if (content.includes("totalAmount = Math.max(totalAmount, amount);")) {
  if (content.includes("queryNodes(el, [\"ALLLEDGERENTRIES.LIST\"")) {
    content = content.replace(oldVoucherLogic, newVoucherLogic);
  } else {
    content = content.replace(oldVoucherLogicFallback, newVoucherLogic);
  }
}

fs.writeFileSync('src/utils/tallyXmlParser.ts', content, 'utf8');
