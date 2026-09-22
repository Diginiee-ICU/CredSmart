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

function getStableTallySku(name: string): string {
  let hash = 2166136261;
  for (const character of name.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `TALLY-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

// ─── Default Configuration ───────────────────────────────────────────────────

export function getDefaultSyncConfig(orgId: string): SyncConfig {
  const desktopToken =
    typeof window !== "undefined" ? window.credsmartDesktop?.pairingToken : undefined;
  return {
    organizationId: orgId,
    enabled: false,
    pairingToken: desktopToken || `crds_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
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
  void registerPairingToken(orgId, newToken);
  return newToken;
}

async function hashPairingToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function registerPairingToken(orgId: string, token: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("You must be signed in to register a sync token");
  const tokenHash = await hashPairingToken(token);
  const syncTokens = (supabase as unknown as { from: (table: string) => any }).from("sync_pairing_tokens");
  const { error } = await syncTokens.upsert({
    organization_id: orgId,
    user_id: authData.user.id,
    token_hash: tokenHash,
    active: true,
  }, { onConflict: "token_hash" });
  if (error) throw error;
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

export const TALLY_EXPORT_DAYBOOK_XML = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`.trim();

function mergeTallyParseResults(masters: TallyParseResult, daybook: TallyParseResult): TallyParseResult {
  return {
    ...masters,
    salesVouchers: daybook.salesVouchers,
    purchaseVouchers: daybook.purchaseVouchers,
    paymentVouchers: daybook.paymentVouchers,
    receiptVouchers: daybook.receiptVouchers,
    journalVouchers: daybook.journalVouchers,
    creditNoteVouchers: daybook.creditNoteVouchers || [],
    debitNoteVouchers: daybook.debitNoteVouchers || [],
    totalEntities: masters.totalEntities + daybook.totalEntities,
    warnings: [...masters.warnings, ...daybook.warnings],
  };
}

export const CREDSMART_BRIDGE_HOST = "http://127.0.0.1:9005";

/**
 * Probes the local Tally Prime / ERP 9 HTTP server or CredSmart Local Bridge
 */
export async function probeLocalTally(hostUrl = "http://127.0.0.1:9000", pairingToken?: string): Promise<{
  online: boolean;
  latencyMs: number;
  companyName?: string;
  error?: string;
  usedBridge?: boolean;
  resolvedUrl?: string;
}> {
  // If host is port 9000 or default, first check if the CredSmart Bridge is active on port 9005
  if (hostUrl.includes(":9000") || hostUrl === "http://127.0.0.1:9000") {
    try {
      const bridgeStart = performance.now();
      const bridgeController = new AbortController();
      const bridgeTimeout = setTimeout(() => bridgeController.abort(), 1500);

      const bridgeRes = await fetch(CREDSMART_BRIDGE_HOST, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          ...(pairingToken ? { "X-CredSmart-Sync-Token": pairingToken } : {}),
        },
        body: TALLY_EXPORT_MASTERS_XML,
        signal: bridgeController.signal,
      });
      clearTimeout(bridgeTimeout);

      if (bridgeRes.ok) {
        const text = await bridgeRes.text();
        let company = "Tally Prime (via Local Bridge)";
        const match = text.match(/<COMPANY[^>]*NAME="([^"]+)"/i) || text.match(/<COMPANY[^>]*>([^<]+)<\/COMPANY>/i);
        if (match && match[1]) {
          company = `${match[1].trim()} (Local Bridge)`;
        }
        const latencyMs = Math.round(performance.now() - bridgeStart);
        return {
          online: true,
          latencyMs,
          companyName: company,
          usedBridge: true,
          resolvedUrl: CREDSMART_BRIDGE_HOST,
        };
      }
    } catch {
      // Bridge not active, continue with direct probe
    }
  }

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
      return { online: true, latencyMs, companyName: company, resolvedUrl: hostUrl };
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
        ? "Browser Security Restriction: Chrome blocks HTTPS web pages from directly calling local HTTP port 9000 without CORS headers. Double-click 'CredSmart-Sync.bat' to start the local sync bridge or export your data."
        : "Cannot reach local Tally server directly from browser. Run 'CredSmart-Sync.bat' to start the local sync bridge or export your data.",
    };
  }
}

/**
 * Fetches live data directly from local Tally HTTP Server or CredSmart Bridge and parses it
 */
export async function fetchLiveTallyData(hostUrl = "http://127.0.0.1:9000", pairingToken?: string): Promise<TallyParseResult> {
  let targetUrl = hostUrl;

  // Check if bridge is active if using port 9000
  if (hostUrl.includes(":9000")) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 1200);
      const testBridge = await fetch(CREDSMART_BRIDGE_HOST, {
        method: "GET",
        headers: pairingToken ? { "X-CredSmart-Sync-Token": pairingToken } : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(tm);
      if (testBridge.ok) {
        targetUrl = CREDSMART_BRIDGE_HOST;
      }
    } catch {
      // Keep default targetUrl
    }
  }

  const request = async (body: string): Promise<TallyParseResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          ...(targetUrl === CREDSMART_BRIDGE_HOST && pairingToken
            ? { "X-CredSmart-Sync-Token": pairingToken }
            : {}),
        },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Tally HTTP server returned HTTP ${res.status} ${res.statusText}`);
      }
      return parseTallyXml(await res.text());
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const masters = await request(TALLY_EXPORT_MASTERS_XML);
  const daybook = await request(TALLY_EXPORT_DAYBOOK_XML);
  return mergeTallyParseResults(masters, daybook);
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
  const unsupportedVoucherTypes = new Set<TallyVoucher["voucherType"]>();

  try {
    // 1. Sync Stock Items into Supabase products & batches
    if (parsedData.items.length > 0) {
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
                const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItems);
                if (saleItemsError) throw new Error(`Sale ${vch.voucherNumber} items failed: ${saleItemsError.message}`);
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
                  const piItems = [];
                  for (const it of vch.items) {
                    const { data: product } = await supabase
                      .from("products")
                      .select("id")
                      .eq("organization_id", orgId)
                      .ilike("name", it.itemName.trim())
                      .maybeSingle();
                    if (!product) throw new Error(`Purchase ${vch.voucherNumber} item not found: ${it.itemName}`);
                    piItems.push({
                      product_id: product.id,
                      purchase_invoice_id: newPI.id,
                      quantity: it.quantity,
                      cost_price: it.rate,
                      mrp: it.rate,
                      batch_number: it.batchNumber || "BATCH-01",
                      expiry_date: it.expiryDate || null,
                    });
                  }
                  const { error: purchaseItemsError } = await supabase.from("purchase_invoice_items").insert(piItems);
                  if (purchaseItemsError) throw new Error(`Purchase ${vch.voucherNumber} items failed: ${purchaseItemsError.message}`);
                }
              }
            }
          }
        } else {
          unsupportedVoucherTypes.add(vch.voucherType);
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
      status: unsupportedVoucherTypes.size > 0 ? "partial" : "success",
      itemsSynced: itemsCount,
      partiesSynced: partiesCount,
      vouchersSynced: vouchersCount,
      durationMs,
      message: unsupportedVoucherTypes.size > 0
        ? `Synchronized ${itemsCount} items, ${partiesCount} parties, and ${vouchersCount} supported vouchers. Unsupported voucher types: ${Array.from(unsupportedVoucherTypes).join(", ")}.`
        : `Successfully synchronized ${itemsCount} items and ${partiesCount} parties from ${software.toUpperCase()}.`,
      source,
    };

    // Update config history
    const config = getSyncConfig(orgId);
    config.lastSyncAt = new Date().toISOString();
    config.lastSyncStatus = unsupportedVoucherTypes.size > 0 ? "partial" : "success";
    config.lastSyncStats = {
      items: itemsCount,
      parties: partiesCount,
      vouchers: vouchersCount,
    };
    config.history = [log, ...config.history.slice(0, 19)]; // Keep last 20 logs
    saveSyncConfig(config);

    return {
      success: unsupportedVoucherTypes.size === 0,
      itemsCount,
      partiesCount,
      vouchersCount,
      durationMs,
      log,
      ...(unsupportedVoucherTypes.size > 0 ? { error: `Unsupported voucher types: ${Array.from(unsupportedVoucherTypes).join(", ")}` } : {}),
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

/** Generates a plain-text setup guide for the local Tally bridge. */
export function generateTallySetupGuideContent(orgId: string, pairingToken: string): string {
  const safeOrgId = orgId.replace(/"/g, "");
  void pairingToken;
  return `CredSmart Tally Import Setup Guide
Version: 2.3.0
Organization ID: ${safeOrgId}
Generated: ${new Date().toISOString()}

This is a plain-text guide, not a TDL add-on.
Do not load this file in Tally's Manage Local TDL screen.

Live-import setup:
1. Start CredSmartTallyBridge.exe on this Windows computer.
2. Keep Tally Prime HTTP Server enabled on http://127.0.0.1:9000.
3. Open CredSmart and click "Sync Live Tally Now".

If Tally displays a message mentioning "AccType Body", disable the unrelated
local TDL add-on that defines it before retrying. CredSmart does not modify
Tally menus, reports, parts, lines, or buttons.

XML/CSV file import remains available when the bridge is offline.
`;
}

/**
 * Alias of {@link generateTallySetupGuideContent}.
 * Kept for backwards-compatibility with tests that import this name.
 * NOTE: The generated content is intentionally comments-only (no TDL definitions)
 * so it is safe to load in Tally without causing Part/Line/Button errors.
 */
export const generateTallyTdlContent = generateTallySetupGuideContent;

// ─── Desktop Sync Daemon Package Info ─────────────────────────────────────────

export function getDaemonCliCommand(_orgId: string, token: string): string {
  const quotedToken = JSON.stringify(token);
  return `node scripts/credsmart-sync-agent/index.cjs --token=${quotedToken} --bridgePort=9005 --tallyUrl="http://127.0.0.1:9000"`;
}

/**
 * Generates a native Windows Batch Script (.bat) utilizing built-in Windows PowerShell.
 * Runs directly on any Windows 10/11 PC with ZERO Node.js, Python, or external installations!
 */
export function generateWindowsSyncBatContent(orgId: string, pairingToken: string): string {
  return `<# :
@echo off
chcp 65001 >nul
title CredSmart Windows Auto-Sync Utility for Tally
color 0b
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression ([System.IO.File]::ReadAllText('%~f0'))"
if %errorlevel% neq 0 (
    echo.
    echo Script ended with code %errorlevel%.
    pause
)
exit /b %errorlevel%
#>

# =========================================================================
# CredSmart Windows Auto-Sync Utility for Tally Prime / ERP 9
# Organization ID: ${orgId}
# Runs natively on Windows using built-in PowerShell (No Node.js needed!)
# =========================================================================

$OrgId = "${orgId}"
$PairingToken = "${pairingToken}"
$TallyHost = "http://127.0.0.1:9000"
$BridgePort = 9005
$AppUrl = "https://pos.credalert.business/tally-import"

function Show-Banner {
    Clear-Host
    Write-Host "=========================================================================" -ForegroundColor Cyan
    Write-Host "  CredSmart Windows Auto-Sync Utility for Tally Prime / ERP 9" -ForegroundColor Cyan
    Write-Host "  Organization ID: $OrgId" -ForegroundColor Yellow
    Write-Host "  Native Windows PowerShell (Zero Node.js or Extra Software Needed)" -ForegroundColor Gray
    Write-Host "=========================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Check-TallyConnection {
    param([string]$Url)
    Write-Host "[1/3] Testing connection to Tally Prime on $Url..." -ForegroundColor Cyan
    $testXml = "<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><REPORTNAME>List of Companies</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>"
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method POST -Body $testXml -ContentType "text/xml" -TimeoutSec 5 -UseBasicParsing
        if ($resp.StatusCode -eq 200) {
            $compName = "Active Tally Company"
            if ($resp.Content -match '<COMPANY[^>]*NAME="([^"]+)"' -or $resp.Content -match '<COMPANY[^>]*>([^<]+)</COMPANY>') {
                $compName = $matches[1].Trim()
            }
            Write-Host "[SUCCESS] Successfully connected to Tally Prime!" -ForegroundColor Green
            Write-Host "Active Company: $compName" -ForegroundColor Green
            return @{ Online = $true; Company = $compName }
        }
    } catch {
        # Offline
    }
    Write-Host "[NOTICE] Could not connect to Tally on $Url" -ForegroundColor Yellow
    Write-Host "Ensure Tally Prime is open and Server Mode is enabled:" -ForegroundColor Gray
    Write-Host "  1. In Tally Prime, press F1 (Help) > Settings > Connectivity" -ForegroundColor Gray
    Write-Host "  2. Client/Server configuration > TallyPrime acts as: Both / Server" -ForegroundColor Gray
    Write-Host "  3. Port: 9000" -ForegroundColor Gray
    Write-Host "  4. Restart Tally and re-run this script" -ForegroundColor Gray
    return @{ Online = $false; Company = $null }
}

function Export-TallyMasters {
    param([string]$Url, [string]$TargetWebUrl)
    Write-Host ""
    Write-Host "--> Requesting All Masters (Stock Items & Ledgers) from Tally..." -ForegroundColor Cyan
    $reqXml = @"
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
"@
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method POST -Body $reqXml -ContentType "text/xml" -TimeoutSec 45 -UseBasicParsing
        if ($resp.StatusCode -eq 200 -and $resp.Content.Length -gt 50) {
            $desktop = [System.Environment]::GetFolderPath('Desktop')
            $desktopFile = Join-Path $desktop "CredSmart_Tally_Export.xml"
            $localFile = Join-Path (Get-Location) "CredSmart_Tally_Export.xml"

            [System.IO.File]::WriteAllText($desktopFile, $resp.Content, [System.Text.Encoding]::UTF8)
            [System.IO.File]::WriteAllText($localFile, $resp.Content, [System.Text.Encoding]::UTF8)

            $itemsCount = [regex]::Matches($resp.Content, "<STOCKITEM\b").Count
            $ledgerCount = [regex]::Matches($resp.Content, "<LEDGER\b").Count

            Write-Host ""
            Write-Host "=========================================================================" -ForegroundColor Green
            Write-Host "  [EXPORT COMPLETED SUCCESSFULLY!]" -ForegroundColor Green
            Write-Host "  * Stock Items Found:   $itemsCount" -ForegroundColor White
            Write-Host "  * Ledgers / Parties:   $ledgerCount" -ForegroundColor White
            Write-Host "  * Saved to Desktop:    $desktopFile" -ForegroundColor Yellow
            Write-Host "=========================================================================" -ForegroundColor Green
            Write-Host ""

            Write-Host "Opening CredSmart Import in browser..." -ForegroundColor Cyan
            Start-Process $TargetWebUrl

            Write-Host "Highlighting exported file in Windows Explorer..." -ForegroundColor Gray
            Start-Process explorer.exe -ArgumentList "/select,\`"$desktopFile\`""

            Write-Host ""
            Write-Host "Tip: In CredSmart, click 'Upload File(s)' or simply drag & drop" -ForegroundColor Yellow
            Write-Host "     CredSmart_Tally_Export.xml into the browser window!" -ForegroundColor Yellow
            Write-Host ""
            return $true
        } else {
            Write-Host "[ERROR] Tally returned an empty response or HTTP code $($resp.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "[ERROR] Export failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Start-AutoSyncBridge {
  param([int]$Port, [string]$TallyUrl, [string]$PairingToken)
    Write-Host ""
    Write-Host "=========================================================================" -ForegroundColor Cyan
    Write-Host "  STARTING LOCAL AUTO-SYNC BRIDGE ON http://127.0.0.1:$Port" -ForegroundColor Cyan
    Write-Host "=========================================================================" -ForegroundColor Cyan
    Write-Host "This bridge bypasses browser CORS restrictions and enables in-browser sync." -ForegroundColor Gray
    Write-Host "Keep this window OPEN while working with CredSmart." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C at any time to stop the bridge." -ForegroundColor Gray
    Write-Host ""

    $listener = New-Object System.Net.HttpListener
    $prefix = "http://127.0.0.1:$Port/"
    $listener.Prefixes.Add($prefix)
    $allowedOrigin = "https://pos.credalert.business"

    try {
        $listener.Start()
        Write-Host "[BRIDGE READY] Listening on $prefix" -ForegroundColor Green
        Write-Host "Now go to CredSmart ($AppUrl) and click 'Sync Now'!" -ForegroundColor Green
        Write-Host ""

        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $requestOrigin = $request.Headers["Origin"]
            if ($requestOrigin -eq $allowedOrigin) {
              $response.Headers.Add("Access-Control-Allow-Origin", $allowedOrigin)
              $response.Headers.Add("Vary", "Origin")
            }
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-CredSmart-Sync-Token")
            $response.Headers.Add("Access-Control-Allow-Private-Network", "true")
            $response.Headers.Add("Access-Control-Max-Age", "86400")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "GET") {
              if ($request.Headers["X-CredSmart-Sync-Token"] -ne $PairingToken) {
                $response.StatusCode = 401
                $response.Close()
                continue
              }
                $json = '{"status":"ok","bridge":"CredSmart Tally Bridge","port":' + $Port + ',"tallyHost":"' + $TallyUrl + '"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
              if ($request.Headers["X-CredSmart-Sync-Token"] -ne $PairingToken) {
                $response.StatusCode = 401
                $response.Close()
                continue
              }
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $postBody = $reader.ReadToEnd()
                $reader.Close()

                $timeStr = Get-Date -Format "HH:mm:ss"
                Write-Host "[$timeStr] [REQUEST] Forwarding sync query to Tally Prime on $TallyUrl..." -ForegroundColor Cyan

                try {
                    $tallyResp = Invoke-WebRequest -Uri $TallyUrl -Method POST -Body $postBody -ContentType "text/xml" -TimeoutSec 60 -UseBasicParsing
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes($tallyResp.Content)
                    $response.ContentType = "text/xml; charset=utf-8"
                    $response.StatusCode = $tallyResp.StatusCode
                    $response.ContentLength64 = $respBytes.Length
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                    $response.Close()
                    $kbSize = [math]::Round($respBytes.Length / 1024, 1)
                    Write-Host "[$timeStr] [SUCCESS] Transferred $kbSize KB from Tally Prime to CredSmart!" -ForegroundColor Green
                } catch {
                    $errXml = "<ERROR><MESSAGE>$($_.Exception.Message)</MESSAGE></ERROR>"
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errXml)
                    $response.StatusCode = 502
                    $response.ContentType = "text/xml; charset=utf-8"
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                    $response.Close()
                    Write-Host "[$timeStr] [ERROR] Forwarding failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "[BRIDGE EXCEPTION] $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        if ($listener.IsListening) {
            $listener.Stop()
            $listener.Close()
        }
        Write-Host "Bridge stopped." -ForegroundColor Gray
    }
}

$running = $true
while ($running) {
    Show-Banner
    $status = Check-TallyConnection -Url $TallyHost
    Write-Host ""
    Write-Host "-------------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "CHOOSE AN ACTION:" -ForegroundColor White
    Write-Host "  [1] Instant Export to Desktop (Extracts Masters XML & Opens CredSmart)" -ForegroundColor Green
    Write-Host "  [2] Start Live Auto-Sync Bridge (Port 9005 - Enables In-Browser Sync)" -ForegroundColor Cyan
    Write-Host "  [3] Full Sync (Export to Desktop + Start Live Bridge)" -ForegroundColor Yellow
    Write-Host "  [4] Re-check Tally Connection on Port 9000" -ForegroundColor Gray
    Write-Host "  [5] Open CredSmart Web Portal" -ForegroundColor Gray
    Write-Host "  [6] Exit" -ForegroundColor Gray
    Write-Host "-------------------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host ""
    $choice = Read-Host "Select option [1-6] (Press ENTER for Option 1)"
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

    switch ($choice.Trim()) {
        "1" {
            $exported = Export-TallyMasters -Url $TallyHost -TargetWebUrl $AppUrl
            if ($exported) {
                Write-Host ""
                $startB = Read-Host "Would you also like to start the Live Auto-Sync Bridge on port 9005? (Y/N) [Default: Y]"
                if ([string]::IsNullOrWhiteSpace($startB) -or $startB.Trim().ToUpper() -eq "Y") {
                    Start-AutoSyncBridge -Port $BridgePort -TallyUrl $TallyHost -PairingToken $PairingToken
                }
            }
            Write-Host ""
            Read-Host "Press ENTER to return to menu..."
        }
        "2" {
            Start-AutoSyncBridge -Port $BridgePort -TallyUrl $TallyHost -PairingToken $PairingToken
            Write-Host ""
            Read-Host "Press ENTER to return to menu..."
        }
        "3" {
            Export-TallyMasters -Url $TallyHost -TargetWebUrl $AppUrl
            Start-AutoSyncBridge -Port $BridgePort -TallyUrl $TallyHost -PairingToken $PairingToken
            Write-Host ""
            Read-Host "Press ENTER to return to menu..."
        }
        "4" {
            # Loop re-tests
        }
        "5" {
            Start-Process $AppUrl
            Read-Host "Opening CredSmart... Press ENTER to return to menu."
        }
        "6" {
            $running = $false
            Write-Host "Exiting CredSmart Auto-Sync. Goodbye!" -ForegroundColor Gray
        }
        default {
            Write-Host "Invalid option. Please choose between 1 and 6." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
`;
}
