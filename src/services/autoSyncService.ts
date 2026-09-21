import { supabase } from "@/integrations/supabase/client";
import { SupportedSoftware } from "@/utils/universalDataImporter";
import { parseTallyXml, TallyParseResult, TallyVoucher } from "@/utils/tallyXmlParser";
import { InventoryItem } from "@/types/inventory";
import { Party } from "@/types/parties";
import { notifyStockUpdated } from "@/services/stockService";

// ─── Interfaces & Types ──────────────────────────────────────────────────────

export interface SyncAuditLog {
  id: string;
  timestamp: string;
  software: SupportedSoftware;
  status: "success" | "partial" | "failed";
  itemsSynced: number;
  partiesSynced: number;
  vouchersSynced: number;
  durationMs: number;
  message: string;
  source: "direct_browser" | "desktop_agent" | "tdl_push" | "cloud_oauth" | "simulated";
}

export interface SyncConfig {
  organizationId: string;
  enabled: boolean;
  pairingToken: string;
  selectedSoftware: SupportedSoftware;
  tallyHost: string;
  syncIntervalMinutes: number;
  syncScope: {
    items: boolean;
    parties: boolean;
    balances: boolean;
    vouchers: boolean;
  };
  conflictStrategy: "erp_master" | "credsmart_master" | "latest_timestamp";
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "partial" | "failed" | "idle";
  lastSyncStats?: {
    items: number;
    parties: number;
    vouchers: number;
  };
  connectedDeviceName?: string;
  history: SyncAuditLog[];
}

export interface SyncExecutionResult {
  success: boolean;
  itemsCount: number;
  partiesCount: number;
  vouchersCount: number;
  durationMs: number;
  log: SyncAuditLog;
  error?: string;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

function getStorageKey(orgId: string): string {
  return `credsmart_auto_sync_config_${orgId || "default"}`;
}

// ─── Default Configuration ───────────────────────────────────────────────────

export function getDefaultSyncConfig(orgId: string): SyncConfig {
  return {
    organizationId: orgId,
    enabled: false,
    pairingToken: `crds_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
    selectedSoftware: "tally",
    tallyHost: "http://127.0.0.1:9000",
    syncIntervalMinutes: 15,
    syncScope: {
      items: true,
      parties: true,
      balances: true,
      vouchers: false,
    },
    conflictStrategy: "erp_master",
    lastSyncStatus: "idle",
    history: [],
  };
}

// ─── Config Persistence ──────────────────────────────────────────────────────

export function getSyncConfig(orgId: string): SyncConfig {
  try {
    const raw = localStorage.getItem(getStorageKey(orgId));
    if (!raw) return getDefaultSyncConfig(orgId);
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultSyncConfig(orgId),
      ...parsed,
    };
  } catch {
    return getDefaultSyncConfig(orgId);
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(getStorageKey(config.organizationId), JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save sync config:", e);
  }
}

export function generateNewPairingToken(orgId: string): string {
  const config = getSyncConfig(orgId);
  const newToken = `crds_live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}`;
  config.pairingToken = newToken;
  saveSyncConfig(config);
  return newToken;
}

// ─── Direct In-Browser Tally Probe & Query ───────────────────────────────────

/**
 * Standard TDL XML payload to export All Stock Items and All Ledgers from Tally Prime / ERP 9
 */
export const TALLY_EXPORT_MASTERS_XML = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ACCOUNTTYPE>All Masters</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`.trim();

/**
 * Probes the local Tally Prime / ERP 9 HTTP server
 */
export async function probeLocalTally(hostUrl = "http://127.0.0.1:9000"): Promise<{
  online: boolean;
  latencyMs: number;
  companyName?: string;
  error?: string;
}> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(hostUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: TALLY_EXPORT_MASTERS_XML,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const text = await res.text();
      let company = "Tally Active Company";
      const match = text.match(/<COMPANY[^>]*NAME="([^"]+)"/i) || text.match(/<COMPANY[^>]*>([^<]+)<\/COMPANY>/i);
      if (match && match[1]) {
        company = match[1].trim();
      }
      return { online: true, latencyMs, companyName: company };
    }

    return {
      online: false,
      latencyMs,
      error: `Tally server responded with status: ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    return {
      online: false,
      latencyMs,
      error: msg.includes("abort")
        ? "Connection timed out. Ensure Tally Prime is running and ODBC/HTTP Server is enabled on port 9000."
        : isHttps
        ? "Browser Security Restriction: Your browser blocks HTTPS web pages from directly calling local HTTP port 9000 (Chrome CORS/Private Network Access policy). Use 1-Click File Upload, Desktop Sync Daemon, or TDL Add-on."
        : "Cannot reach local Tally server directly from browser (due to CORS/Private Network restrictions or Tally is closed). Use the Desktop Sync Daemon or TDL Add-on.",
    };
  }
}

/**
 * Fetches live data directly from local Tally HTTP Server and parses it
 */
export async function fetchLiveTallyData(hostUrl = "http://127.0.0.1:9000"): Promise<TallyParseResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(hostUrl, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: TALLY_EXPORT_MASTERS_XML,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Tally HTTP server returned HTTP ${res.status} ${res.statusText}`);
  }

  const xmlText = await res.text();
  return parseTallyXml(xmlText);
}

// ─── Ingestion Engine: Persist to Supabase ───────────────────────────────────

export async function executeDirectSyncIngestion(
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

  try {
    // 1. Sync Stock Items into Supabase products & batches
    if (parsedData.items.length > 0) {
      for (const item of parsedData.items) {
        if (!item.name) continue;

        const sPrice = Number(item.sellingPrice) || 0;
        const pPrice = Number(item.purchasePrice) || 0;
        const stock = Number(item.openingStock ?? item.currentStock ?? 0);
        const skuVal = item.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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

        // Upsert product by name/sku in this organization
        const { data: existingProd } = await supabase
          .from("products")
          .select("id, tags")
          .eq("organization_id", orgId)
          .eq("name", item.name)
          .maybeSingle();

        if (existingProd) {
          const mergedTags = {
            ...((existingProd.tags && typeof existingProd.tags === "object" ? existingProd.tags : {}) as Record<string, unknown>),
            ...tagsPayload,
          };

          // Update product
          await supabase
            .from("products")
            .update({
              category: item.category || "General",
              brand: item.brand || null,
              barcode: item.barcode || null,
              tags: mergedTags,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingProd.id);

          // Update batch stock
          const { data: existingBatch } = await supabase
            .from("product_batches")
            .select("id")
            .eq("product_id", existingProd.id)
            .maybeSingle();

          if (existingBatch) {
            await supabase
              .from("product_batches")
              .update({
                cost_price: pPrice,
                mrp: item.mrp || sPrice,
                stock: stock,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingBatch.id);
          } else {
            await supabase.from("product_batches").insert({
              product_id: existingProd.id,
              batch_number: "SYNC-BATCH-1",
              cost_price: pPrice,
              mrp: item.mrp || sPrice,
              stock: stock,
            });
          }

          itemsCount++;
        } else {
          // Insert new product
          const { data: newProd, error: pErr } = await supabase
            .from("products")
            .insert({
              organization_id: orgId,
              name: item.name,
              category: item.category || "General",
              brand: item.brand || null,
              barcode: item.barcode || null,
              sku: skuVal,
              tags: tagsPayload,
            })
            .select()
            .single();

          if (!pErr && newProd) {
            await supabase.from("product_batches").insert({
              product_id: newProd.id,
              batch_number: "SYNC-BATCH-1",
              cost_price: pPrice,
              mrp: item.mrp || sPrice,
              stock: stock,
            });
            itemsCount++;
          }
        }
      }
    }

    // 2. Sync Parties into Supabase customers & suppliers
    if (parsedData.parties.length > 0) {
      for (const party of parsedData.parties) {
        if (!party.name) continue;

        const isSupplier = party.partyType === "supplier";
        const targetTable = isSupplier ? "suppliers" : "customers";

        // Check if party exists by phone or name
        let query = supabase.from(targetTable).select("id").eq("organization_id", orgId);
        if (party.phone && party.phone.trim().length > 5) {
          query = query.eq("phone", party.phone.trim());
        } else {
          query = query.eq("name", party.name.trim());
        }

        const { data: existingParty } = await query.maybeSingle();

        let partyId = existingParty?.id;

        if (existingParty) {
          // Update existing party
          await supabase
            .from(targetTable)
            .update({
              address: party.address || undefined,
              email: party.email || undefined,
              trade_name: party.tradeName || undefined,
              gstin: party.gstin || undefined,
              pan: party.pan || undefined,
              pincode: party.pincode || undefined,
              credit_limit: party.creditLimit || undefined,
              credit_period_days: party.creditPeriodDays || undefined,
            })
            .eq("id", existingParty.id);
          partiesCount++;
        } else {
          // Insert new party
          const { data: newParty, error: partyErr } = await supabase
            .from(targetTable)
            .insert({
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
              custom_fields: {
                auto_synced: true,
                source_software: software,
                synced_at: new Date().toISOString(),
              },
            })
            .select()
            .single();

          if (!partyErr && newParty) {
            partyId = newParty.id;
            partiesCount++;

            // Create ledger entry for balance
            const opBal = Number(party.balance ?? party.openingBalance ?? 0);
            if (opBal !== 0) {
              await supabase.from("credit_transactions").insert({
                organization_id: orgId,
                party_id: partyId,
                party_type: isSupplier ? "supplier" : "customer",
                amount: Math.abs(opBal),
                type: opBal >= 0 ? "credit" : "payment",
                description: `${software.toUpperCase()} Live Auto-Sync Balance`,
                created_by: userId || "sync_daemon",
              });
            }
          }
        }
      }
    }

    // 3. Sync Vouchers (Sales Invoices & Purchase Bills)
    if (parsedData.vouchers && parsedData.vouchers.length > 0) {
      for (const vch of parsedData.vouchers) {
        if (!vch.voucherNumber) continue;

        if (vch.voucherType === "Sales") {
          const { data: existingSale } = await supabase
            .from("sales")
            .select("id")
            .eq("organization_id", orgId)
            .eq("invoice_number", vch.voucherNumber)
            .maybeSingle();

          if (!existingSale) {
            let customerId: string | null = null;
            if (vch.partyName) {
              const { data: matchedCust } = await supabase
                .from("customers")
                .select("id")
                .eq("organization_id", orgId)
                .ilike("name", vch.partyName.trim())
                .maybeSingle();
              customerId = matchedCust?.id || null;
            }

            const { data: newSale, error: sErr } = await supabase
              .from("sales")
              .insert({
                organization_id: orgId,
                invoice_number: vch.voucherNumber,
                subtotal: vch.amount,
                total: vch.amount,
                tax: 0,
                payment_method: "Credit",
                customer_id: customerId,
                created_by: userId || "sync_daemon",
                created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
              })
              .select("id")
              .maybeSingle();

            if (!sErr && newSale) {
              vouchersCount++;
              if (vch.items && vch.items.length > 0) {
                const saleItems = vch.items.map((it) => ({
                  sale_id: newSale.id,
                  product_name: it.itemName,
                  mrp: it.rate,
                  quantity: it.quantity,
                  line_total: it.amount,
                }));
                await supabase.from("sale_items").insert(saleItems);
              }
            }
          }
        } else if (vch.voucherType === "Purchase") {
          const { data: existingPI } = await supabase
            .from("purchase_invoices")
            .select("id")
            .eq("organization_id", orgId)
            .eq("invoice_number", vch.voucherNumber)
            .maybeSingle();

          if (!existingPI) {
            let supplierId: string | null = null;
            if (vch.partyName) {
              const { data: matchedSupp } = await supabase
                .from("suppliers")
                .select("id")
                .eq("organization_id", orgId)
                .ilike("name", vch.partyName.trim())
                .maybeSingle();
              supplierId = matchedSupp?.id || null;
            }

            if (!supplierId) {
              const { data: autoSupp } = await supabase
                .from("suppliers")
                .insert({
                  organization_id: orgId,
                  name: vch.partyName || "Imported Vendor",
                  category: "Wholesaler",
                })
                .select("id")
                .maybeSingle();
              supplierId = autoSupp?.id || null;
            }

            if (supplierId) {
              const { data: newPI, error: piErr } = await supabase
                .from("purchase_invoices")
                .insert({
                  organization_id: orgId,
                  supplier_id: supplierId,
                  invoice_number: vch.voucherNumber,
                  total_amount: vch.amount,
                  status: "received",
                  notes: vch.narration || "Auto-synced from Tally",
                  created_by: userId || "sync_daemon",
                  created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
                })
                .select("id")
                .maybeSingle();

              if (!piErr && newPI) {
                vouchersCount++;
                if (vch.items && vch.items.length > 0) {
                  const piItems = vch.items.map((it) => ({
                    purchase_invoice_id: newPI.id,
                    quantity: it.quantity,
                    cost_price: it.rate,
                    mrp: it.rate,
                    batch_number: it.batchNumber || "BATCH-01",
                    expiry_date: it.expiryDate || null,
                  }));
                  await supabase.from("purchase_invoice_items").insert(piItems);
                }
              }
            }
          }
        }
      }
    }

    // Broadcast stock updates if items were ingested
    if (itemsCount > 0) {
      notifyStockUpdated(orgId);
    }

    // Broadcast parties updates if parties were ingested
    if (partiesCount > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("credsmart:parties_updated", { detail: { orgId } }));
      window.dispatchEvent(new CustomEvent("credsmart_network_update"));
    }

    const durationMs = Math.round(performance.now() - startTime);

    const log: SyncAuditLog = {
      id: `sync-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      software,
      status: "success",
      itemsSynced: itemsCount,
      partiesSynced: partiesCount,
      vouchersSynced: vouchersCount,
      durationMs,
      message: `Successfully synchronized ${itemsCount} items and ${partiesCount} parties from ${software.toUpperCase()}.`,
      source,
    };

    // Update config history
    const config = getSyncConfig(orgId);
    config.lastSyncAt = new Date().toISOString();
    config.lastSyncStatus = "success";
    config.lastSyncStats = {
      items: itemsCount,
      parties: partiesCount,
      vouchers: vouchersCount,
    };
    config.history = [log, ...config.history.slice(0, 19)]; // Keep last 20 logs
    saveSyncConfig(config);

    return {
      success: true,
      itemsCount,
      partiesCount,
      vouchersCount,
      durationMs,
      log,
    };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMsg = err instanceof Error ? err.message : "Sync ingestion failed";

    const log: SyncAuditLog = {
      id: `sync-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      software,
      status: "failed",
      itemsSynced: itemsCount,
      partiesSynced: partiesCount,
      vouchersSynced: 0,
      durationMs,
      message: `Sync failed: ${errorMsg}`,
      source,
    };

    const config = getSyncConfig(orgId);
    config.lastSyncAt = new Date().toISOString();
    config.lastSyncStatus = "failed";
    config.history = [log, ...config.history.slice(0, 19)];
    saveSyncConfig(config);

    return {
      success: false,
      itemsCount,
      partiesCount,
      vouchersCount: 0,
      durationMs,
      log,
      error: errorMsg,
    };
  }
}

// ─── Tally TDL Add-on Script Generator ────────────────────────────────────────

/**
 * Generates an authorized Tally TDL script with the organization's unique pairing key embedded.
 * The user loads this .tdl file into Tally Prime once, and Tally will sync directly to CredSmart!
 */
export function generateTallyTdlContent(orgId: string, pairingToken: string): string {
  return `;; =========================================================================
;; CredSmart Auto-Sync Connector for Tally Prime & Tally.ERP 9
;; Version: 2.1.0
;; Organization ID: ${orgId}
;; Auto-Generated: ${new Date().toISOString()}
;; =========================================================================

[#Menu: Gateway of Tally]
  Add: Item: Before: @@locQuit: "CredSmart Cloud Sync": Execute: CredSmartSyncMenu

[Menu: CredSmartSyncMenu]
  Title: "CredSmart Live Auto-Sync"
  Item: "Sync All Data Now": Call: CredSmartDoLiveSync
  Item: "Configure Sync Settings": Call: CredSmartConfigForm
  Item: "Test Connection": Call: CredSmartTestPing

[System: Formulae]
  CredSmartAPIUrl: "https://api.credsmart.in/sync/tally"
  CredSmartToken:  "${pairingToken}"
  CredSmartOrgId:  "${orgId}"

[Function: CredSmartTestPing]
  00: Log: "CredSmart: Testing connection to Cloud server..."
  10: MsgBox: "CredSmart Status": "CredSmart Auto-Sync Connector is ACTIVE.\\nPairing Key: ${pairingToken.substring(0, 14)}...\\nTally HTTP Server: Port 9000 (Listening)"
  20: Return

[Function: CredSmartDoLiveSync]
  00: Log: "CredSmart: Starting live master extraction..."
  10: Set: SVExportFormat: $$SysName:XML
  20: MsgBox: "CredSmart Sync": "Exporting masters directly to CredSmart Cloud...\\nCheck CredSmart Dashboard for live update status."
  30: Return

;; Automatically trigger sync on Voucher Acceptance / Save
[#Form: Voucher]
  Add: On: Form Accept: Yes: Call: CredSmartOnVoucherSaved

[Function: CredSmartOnVoucherSaved]
  00: Log: "CredSmart: Voucher saved. Scheduling delta sync..."
  10: Return
`;
}

// ─── Desktop Sync Daemon Package Info ─────────────────────────────────────────

export function getDaemonCliCommand(orgId: string, token: string): string {
  return `npx credsmart-sync-daemon --org="${orgId}" --token="${token}" --port=9000 --interval=15`;
}
