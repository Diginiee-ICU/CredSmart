const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/autoSyncService.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newFunction = `export async function executeDirectSyncIngestion(
  orgId: string,
  userId: string,
  parsedData: {
    items: Partial<InventoryItem>[];
    parties: Partial<Party>[];
    vouchers?: TallyVoucher[];
  },
  source: SyncAuditLog["source"] = "direct_browser",
  software: SupportedSoftware = "tally"
): Promise<SyncExecutionResult> {
  const startTime = performance.now();
  let itemsCount = 0;
  let partiesCount = 0;
  let vouchersCount = 0;
  const unsupportedVoucherTypes = new Set<TallyVoucher["voucherType"]>();

  try {
    const config = getSyncConfig(orgId);
    const strategy = config.conflictStrategy || "erp_master";

    // 1. Pre-fetch existing data (Eliminates N+1 Queries)
    const [
      { data: existingProducts },
      { data: existingCustomers },
      { data: existingSuppliers },
      { data: existingSales },
      { data: existingPurchases }
    ] = await Promise.all([
      supabase.from("products").select("id, name, tags, sku").eq("organization_id", orgId),
      supabase.from("customers").select("id, name, phone").eq("organization_id", orgId),
      supabase.from("suppliers").select("id, name, phone").eq("organization_id", orgId),
      supabase.from("sales").select("id, invoice_number").eq("organization_id", orgId),
      supabase.from("purchase_invoices").select("id, invoice_number").eq("organization_id", orgId)
    ]);

    const productMap = new Map((existingProducts || []).map(p => [p.name.toLowerCase().trim(), p]));
    const customerMap = new Map((existingCustomers || []).map(c => [c.name.toLowerCase().trim(), c]));
    (existingCustomers || []).forEach(c => { if (c.phone) customerMap.set(c.phone.trim(), c); });
    
    const supplierMap = new Map((existingSuppliers || []).map(s => [s.name.toLowerCase().trim(), s]));
    (existingSuppliers || []).forEach(s => { if (s.phone) supplierMap.set(s.phone.trim(), s); });

    const salesMap = new Map((existingSales || []).map(s => [s.invoice_number, s]));
    const purchasesMap = new Map((existingPurchases || []).map(p => [p.invoice_number, p]));

    // --- Process Products ---
    if (parsedData.items.length > 0) {
      const productsToUpdate: any[] = [];
      const productsToInsert: any[] = [];
      
      for (const item of parsedData.items) {
        if (!item.name) continue;
        const sPrice = Number(item.sellingPrice) || 0;
        const pPrice = Number(item.purchasePrice) || 0;
        const stock = Number(item.openingStock ?? item.currentStock ?? 0);
        const skuVal = item.sku || getStableTallySku(item.name);

        const tagsPayload: Record<string, unknown> = {
          selling_price: sPrice,
          purchase_price: pPrice,
          mrp: item.mrp || sPrice,
          unit: item.unit || "PCS",
          gst_rate: Number(item.gstRate ?? 18),
          hsn_code: item.hsnCode ? String(item.hsnCode).trim() : null,
          opening_stock: stock,
          stock: stock,
          min_stock_alert: Number(item.minStockAlert ?? 5),
          imported_from: software,
          imported_at: new Date().toISOString(),
          auto_synced: true,
        };

        const existing = productMap.get(item.name.toLowerCase().trim());
        if (existing) {
          if (strategy === "credsmart_master") { itemsCount++; continue; }
          const mergedTags = {
            ...((existing.tags && typeof existing.tags === "object" ? existing.tags : {}) as Record<string, unknown>),
            ...tagsPayload,
          };
          productsToUpdate.push({
            id: existing.id,
            organization_id: orgId,
            name: item.name,
            category: item.category || "General",
            brand: item.brand || null,
            barcode: item.barcode || null,
            sku: existing.sku || skuVal,
            tags: mergedTags,
            updated_at: new Date().toISOString(),
          });
        } else {
          productsToInsert.push({
            organization_id: orgId,
            name: item.name,
            category: item.category || "General",
            brand: item.brand || null,
            barcode: item.barcode || null,
            sku: skuVal,
            tags: tagsPayload,
          });
        }
      }

      // Bulk Execute Products
      const chunkSize = 1000;
      for (let i = 0; i < productsToUpdate.length; i += chunkSize) {
        await supabase.from("products").upsert(productsToUpdate.slice(i, i + chunkSize));
        itemsCount += productsToUpdate.slice(i, i + chunkSize).length;
      }
      
      let newProducts: any[] = [];
      for (let i = 0; i < productsToInsert.length; i += chunkSize) {
        const { data } = await supabase.from("products").insert(productsToInsert.slice(i, i + chunkSize)).select("id, name");
        if (data) {
          newProducts = newProducts.concat(data);
          itemsCount += data.length;
        }
      }
      
      // Upsert Product Batches
      const productIdsToUpdate = productsToUpdate.map(p => p.id);
      let existingBatchesMap = new Map();
      if (productIdsToUpdate.length > 0) {
          const { data: batches } = await supabase.from("product_batches").select("id, product_id").in("product_id", productIdsToUpdate);
          existingBatchesMap = new Map((batches || []).map(b => [b.product_id, b.id]));
      }
      
      const batchesToUpsert: any[] = [];
      for (const p of productsToUpdate) {
         const item = parsedData.items.find(i => i.name?.toLowerCase().trim() === p.name.toLowerCase().trim());
         if (!item) continue;
         const batchId = existingBatchesMap.get(p.id);
         const payload = {
            product_id: p.id,
            batch_number: "SYNC-BATCH-1",
            cost_price: Number(item.purchasePrice) || 0,
            mrp: item.mrp || item.sellingPrice || 0,
            stock: Number(item.openingStock ?? item.currentStock ?? 0),
         };
         batchesToUpsert.push(batchId ? { id: batchId, ...payload, updated_at: new Date().toISOString() } : payload);
      }
      for (const p of newProducts) {
         const item = parsedData.items.find(i => i.name?.toLowerCase().trim() === p.name.toLowerCase().trim());
         if (!item) continue;
         batchesToUpsert.push({
            product_id: p.id,
            batch_number: "SYNC-BATCH-1",
            cost_price: Number(item.purchasePrice) || 0,
            mrp: item.mrp || item.sellingPrice || 0,
            stock: Number(item.openingStock ?? item.currentStock ?? 0),
         });
      }
      for (let i = 0; i < batchesToUpsert.length; i += chunkSize) {
        await supabase.from("product_batches").upsert(batchesToUpsert.slice(i, i + chunkSize));
      }
    }

    // --- Process Parties ---
    if (parsedData.parties.length > 0) {
      const customersToUpsert: any[] = [];
      const suppliersToUpsert: any[] = [];
      
      for (const party of parsedData.parties) {
        if (!party.name) continue;
        const isSupplier = party.partyType === "supplier";
        const map = isSupplier ? supplierMap : customerMap;
        const lookupKey = party.phone?.trim().length! > 5 ? party.phone!.trim() : party.name.toLowerCase().trim();
        const existing = map.get(lookupKey);

        const payload = {
          organization_id: orgId,
          name: party.name,
          phone: party.phone || undefined,
          email: party.email || undefined,
          address: party.address || undefined,
          trade_name: party.tradeName || undefined,
          gstin: party.gstin || undefined,
          pan: party.pan || undefined,
          pincode: party.pincode || undefined,
          category: party.category || (isSupplier ? "Wholesaler" : "Retailer"),
          credit_limit: party.creditLimit || 50000,
          credit_period_days: party.creditPeriodDays || 30,
          custom_fields: { auto_synced: true, source_software: software, synced_at: new Date().toISOString() },
        };

        if (existing) {
          if (strategy === "credsmart_master") { partiesCount++; continue; }
          (isSupplier ? suppliersToUpsert : customersToUpsert).push({ id: existing.id, ...payload });
        } else {
          (isSupplier ? suppliersToUpsert : customersToUpsert).push(payload);
        }
      }
      
      for (let i = 0; i < customersToUpsert.length; i += 1000) {
         await supabase.from("customers").upsert(customersToUpsert.slice(i, i + 1000));
         partiesCount += customersToUpsert.slice(i, i + 1000).length;
      }
      for (let i = 0; i < suppliersToUpsert.length; i += 1000) {
         await supabase.from("suppliers").upsert(suppliersToUpsert.slice(i, i + 1000));
         partiesCount += suppliersToUpsert.slice(i, i + 1000).length;
      }
    }

    // --- Process Vouchers ---
    if (parsedData.vouchers && parsedData.vouchers.length > 0) {
      const salesToUpsert: any[] = [];
      const purchasesToUpsert: any[] = [];
      
      for (const vch of parsedData.vouchers) {
        if (!vch.voucherNumber) continue;

        if (vch.voucherType === "Sales") {
          const existing = salesMap.get(vch.voucherNumber);
          if (!existing) {
             let customerId = null;
             if (vch.partyName) {
               const cust = customerMap.get(vch.partyName.toLowerCase().trim());
               if(cust) customerId = cust.id;
             }
             salesToUpsert.push({
                organization_id: orgId,
                invoice_number: vch.voucherNumber,
                subtotal: vch.amount,
                total: vch.amount,
                tax: 0,
                payment_method: "Credit",
                customer_id: customerId,
                created_by: userId || "sync_daemon",
                created_at: vch.date ? \`\${vch.date}T10:00:00.000Z\` : new Date().toISOString(),
             });
          }
        } else if (vch.voucherType === "Purchase") {
          const existing = purchasesMap.get(vch.voucherNumber);
          if (!existing) {
             let supplierId = null;
             if (vch.partyName) {
               const supp = supplierMap.get(vch.partyName.toLowerCase().trim());
               if(supp) supplierId = supp.id;
             }
             if (supplierId) {
                purchasesToUpsert.push({
                   organization_id: orgId,
                   supplier_id: supplierId,
                   invoice_number: vch.voucherNumber,
                   total_amount: vch.amount,
                   status: "received",
                   notes: vch.narration || "Auto-synced from Tally",
                   created_by: userId || "sync_daemon",
                   created_at: vch.date ? \`\${vch.date}T10:00:00.000Z\` : new Date().toISOString(),
                });
             }
          }
        } else {
          unsupportedVoucherTypes.add(vch.voucherType);
        }
      }

      for (let i = 0; i < salesToUpsert.length; i += 1000) {
         await supabase.from("sales").insert(salesToUpsert.slice(i, i + 1000));
         vouchersCount += salesToUpsert.slice(i, i + 1000).length;
      }
      for (let i = 0; i < purchasesToUpsert.length; i += 1000) {
         await supabase.from("purchase_invoices").insert(purchasesToUpsert.slice(i, i + 1000));
         vouchersCount += purchasesToUpsert.slice(i, i + 1000).length;
      }
    }

    if (itemsCount > 0) notifyStockUpdated(orgId);
    if (partiesCount > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("credsmart:parties_updated", { detail: { orgId } }));
      window.dispatchEvent(new CustomEvent("credsmart_network_update"));
    }

    const durationMs = Math.round(performance.now() - startTime);
    const log: SyncAuditLog = {
      id: \`sync-log-\${Date.now()}\`,
      timestamp: new Date().toISOString(),
      software,
      status: unsupportedVoucherTypes.size > 0 ? "partial" : "success",
      itemsSynced: itemsCount,
      partiesSynced: partiesCount,
      vouchersSynced: vouchersCount,
      durationMs,
      message: unsupportedVoucherTypes.size > 0
        ? \`Synchronized \${itemsCount} items, \${partiesCount} parties, \${vouchersCount} vouchers. Unsupported types: \${Array.from(unsupportedVoucherTypes).join(", ")}.\`
        : \`Successfully synchronized \${itemsCount} items and \${partiesCount} parties from \${software.toUpperCase()}.\`,
      source,
    };

    const updatedConfig = getSyncConfig(orgId);
    updatedConfig.lastSyncAt = new Date().toISOString();
    updatedConfig.lastSyncStatus = unsupportedVoucherTypes.size > 0 ? "partial" : "success";
    updatedConfig.lastSyncStats = { items: itemsCount, parties: partiesCount, vouchers: vouchersCount };
    updatedConfig.history = [log, ...updatedConfig.history.slice(0, 19)];
    saveSyncConfig(updatedConfig);

    return {
      success: unsupportedVoucherTypes.size === 0,
      itemsCount,
      partiesCount,
      vouchersCount,
      durationMs,
      log,
      ...(unsupportedVoucherTypes.size > 0 ? { error: \`Unsupported voucher types: \${Array.from(unsupportedVoucherTypes).join(", ")}\` } : {}),
    };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMsg = err instanceof Error ? err.message : "Sync ingestion failed";

    const log: SyncAuditLog = {
      id: \`sync-log-\${Date.now()}\`,
      timestamp: new Date().toISOString(),
      software,
      status: "failed",
      itemsSynced: itemsCount,
      partiesSynced: partiesCount,
      vouchersSynced: 0,
      durationMs,
      message: \`Sync failed: \${errorMsg}\`,
      source,
    };

    const configFailed = getSyncConfig(orgId);
    configFailed.lastSyncAt = new Date().toISOString();
    configFailed.lastSyncStatus = "failed";
    configFailed.history = [log, ...configFailed.history.slice(0, 19)];
    saveSyncConfig(configFailed);

    return { success: false, itemsCount, partiesCount, vouchersCount: 0, durationMs, log, error: errorMsg };
  }
}`;

const startIndex = content.indexOf('export async function executeDirectSyncIngestion');
const endIndex = content.indexOf('// ─── Tally TDL Add-on Script Generator ────────────────────────────────────────');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newFunction + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched autoSyncService.ts');
} else {
  console.error('Could not find injection points', startIndex, endIndex);
}
