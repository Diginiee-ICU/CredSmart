const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../supabase/functions/sync-tally/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /if \(exportType === "masters"\) \{[\s\S]*?\} else if \(exportType === "daybook"\) \{[\s\S]*?\} else \{/m;

const replacement = `if (exportType === "masters") {
      const productsToUpsert = [];
      for (const item of Array.from(document.querySelectorAll("STOCKITEM"))) {
        const name = item.getAttribute("NAME")?.trim() || text(item, "NAME");
        if (!name) continue;
        const sku = \`TALLY-\${await sha256(name.toLowerCase()).then((hash) => hash.slice(0, 12).toUpperCase())}\`;
        const stock = amount(text(item, "OPENINGBALANCE"));
        const sellingPrice = amount(text(item, "STANDARDPRICELIST RATE"));
        const purchasePrice = amount(text(item, "STANDARDCOSTLIST RATE")) || amount(text(item, "OPENINGRATE"));
        productsToUpsert.push({
          organization_id: organizationId,
          name,
          sku,
          category: text(item, "PARENT") || "General",
          tags: { stock, opening_stock: stock, selling_price: sellingPrice, purchase_price: purchasePrice, imported_from: "tally", auto_synced: true },
        });
      }
      if (productsToUpsert.length > 0) {
        for (let i = 0; i < productsToUpsert.length; i += 1000) {
          const chunk = productsToUpsert.slice(i, i + 1000);
          const { error } = await supabase.from("products").upsert(chunk);
          if (!error) items += chunk.length;
        }
      }

      const customersToUpsert = [];
      const suppliersToUpsert = [];
      for (const ledger of Array.from(document.querySelectorAll("LEDGER"))) {
        const name = ledger.getAttribute("NAME")?.trim() || text(ledger, "NAME");
        const parent = text(ledger, "PARENT").toLowerCase();
        if (!name || parent.includes("bank") || parent.includes("cash")) continue;
        const isSupplier = parent.includes("creditor") || parent.includes("supplier") || parent.includes("vendor");
        const payload = { organization_id: organizationId, name, gstin: text(ledger, "PARTYGSTIN") || null, pan: text(ledger, "INCOMETAXNUMBER") || null, address: text(ledger, "ADDRESS") || null };
        if (isSupplier) suppliersToUpsert.push(payload);
        else customersToUpsert.push(payload);
      }
      if (customersToUpsert.length > 0) {
        for (let i = 0; i < customersToUpsert.length; i += 1000) {
          const chunk = customersToUpsert.slice(i, i + 1000);
          const { error } = await supabase.from("customers").upsert(chunk);
          if (!error) parties += chunk.length;
        }
      }
      if (suppliersToUpsert.length > 0) {
        for (let i = 0; i < suppliersToUpsert.length; i += 1000) {
          const chunk = suppliersToUpsert.slice(i, i + 1000);
          const { error } = await supabase.from("suppliers").upsert(chunk);
          if (!error) parties += chunk.length;
        }
      }
    } else if (exportType === "daybook") {
      const salesToUpsert = [];
      const purchasesToUpsert = [];
      // To properly link supplier IDs, we can't easily bulk upsert purchases without pre-fetching suppliers
      // But for simplicity in this script, we'll keep the loop for daybook or just use the same logic
      for (const voucher of Array.from(document.querySelectorAll("VOUCHER"))) {
        const type = (voucher.getAttribute("VCHTYPE") || text(voucher, "VOUCHERTYPENAME")).trim();
        const number = text(voucher, "VOUCHERNUMBER") || voucher.getAttribute("REMOTEID") || "";
        const value = amount(text(voucher, "AMOUNT"));
        const date = dateValue(text(voucher, "DATE"));
        const partyName = text(voucher, "PARTYLEDGERNAME");
        if (!number || !value) continue;
        
        if (type.toLowerCase().includes("sales") || type.toLowerCase().includes("credit note")) {
          const { error } = await updateOrInsert("sales", { organization_id: organizationId, invoice_number: number }, { organization_id: organizationId, invoice_number: number, subtotal: value, total: value, tax: 0, payment_method: "Credit", created_by: credential.user_id, created_at: date }, supabase);
          if (!error) vouchers++;
        } else if (type.toLowerCase().includes("purchase") || type.toLowerCase().includes("debit note")) {
          const supplierResult = await updateOrInsert("suppliers", { organization_id: organizationId, name: partyName || "Imported Vendor" }, { organization_id: organizationId, name: partyName || "Imported Vendor", category: "Wholesaler" }, supabase);
          const supplier = supplierResult.data;
          if (supplier) {
            const { error } = await updateOrInsert("purchase_invoices", { organization_id: organizationId, invoice_number: number }, { organization_id: organizationId, supplier_id: supplier.id, invoice_number: number, total_amount: value, status: "received", notes: \`Tally \${type}\`, created_by: credential.user_id, created_at: date }, supabase);
            if (!error) vouchers++;
          }
        } else if (["receipt", "payment", "journal"].some((name) => type.toLowerCase().includes(name))) {
          unsupported.push(type || "Unknown");
        } else {
          unsupported.push(type || "Unknown");
        }
      }
    } else {`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched index.ts');
} else {
  console.error('Could not find regex match');
}
