import { supabase } from "@/integrations/supabase/client";
import { SupportedSoftware } from "@/utils/universalDataImporter";
import { parseTallyXml, TallyParseResult, TallyVoucher, TallyBankAccount } from "@/utils/tallyXmlParser";
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
  banksSynced?: number;
  balancesSynced?: number;
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
    banks: boolean;
  };
  conflictStrategy: "erp_master" | "credsmart_master" | "latest_timestamp";
  lastSyncAt?: string;
  lastSyncStatus?: "success" | "partial" | "failed" | "idle";
  lastSyncStats?: {
    items: number;
    parties: number;
    vouchers: number;
    banks: number;
    balances: number;
  };
  connectedDeviceName?: string;
  history: SyncAuditLog[];
}

export interface SyncExecutionResult {
  success: boolean;
  itemsCount: number;
  partiesCount: number;
  vouchersCount: number;
  banksCount?: number;
  balancesCount?: number;
  durationMs: number;
  log: SyncAuditLog;
  error?: string;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

function getStorageKey(orgId: string): string {
  return `credsmart_auto_sync_config_${orgId || "default"}`;
}

export function getStableTallySku(name: string): string {
  let hash = 2166136261;
  for (const character of name.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `TALLY-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function isExpenseVoucher(vch: TallyVoucher, supplierMap: Map<string, any>): boolean {
  if (vch.voucherType === "Journal") return true;
  const vchNum = (vch.voucherNumber || "").toLowerCase();
  if (vchNum.includes("exp")) return true;

  const normalizedParty = (vch.partyName || "").trim().toLowerCase();
  if (!normalizedParty) return true;

  const expenseKeywords = [
    "expense", "rent", "electricity", "utilit", "bill", "salary", "salaries", "wage",
    "tea", "refreshment", "petty", "office", "fuel", "travel", "maintenance", "repair",
    "stationery", "courier", "postage", "internet", "telephone", "phone", "wifi",
    "cleaning", "audit", "legal", "professional", "charge", "fee", "tax", "tds", "gst"
  ];

  const matchesExpenseKeyword = expenseKeywords.some(kw => 
    normalizedParty.includes(kw) || (vch.narration && vch.narration.toLowerCase().includes(kw))
  );

  if (matchesExpenseKeyword && !supplierMap.has(normalizedParty)) {
    return true;
  }

  return false;
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
      vouchers: true,
      banks: true,
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
    const defaults = getDefaultSyncConfig(orgId);
    const parsedScope = parsed.syncScope || {};
    return {
      ...defaults,
      ...parsed,
      syncScope: {
        items: parsedScope.items !== undefined ? Boolean(parsedScope.items) : defaults.syncScope.items,
        parties: parsedScope.parties !== undefined ? Boolean(parsedScope.parties) : defaults.syncScope.parties,
        balances: parsedScope.balances !== undefined ? Boolean(parsedScope.balances) : defaults.syncScope.balances,
        vouchers: parsedScope.vouchers !== undefined ? Boolean(parsedScope.vouchers) : defaults.syncScope.vouchers,
        banks: parsedScope.banks !== undefined ? Boolean(parsedScope.banks) : defaults.syncScope.banks,
      },
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
          <SVFROMDATE>20200401</SVFROMDATE>
          <SVTODATE>20291231</SVTODATE>
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
 * Probes the local Tally Prime / ERP 9 HTTP server, CredSmart Desktop IPC, or CredSmart Local Bridge
 */
export async function probeLocalTally(hostUrl = "http://127.0.0.1:9000", pairingToken?: string): Promise<{
  online: boolean;
  latencyMs: number;
  companyName?: string;
  error?: string;
  usedBridge?: boolean;
  resolvedUrl?: string;
}> {
  // 1. If running inside CredSmart Desktop App, use native Node.js IPC (Zero CORS, zero port conflicts)
  if (typeof window !== "undefined" && window.credsmartDesktop?.probeTally) {
    try {
      const probeStart = performance.now();
      const res = await window.credsmartDesktop.probeTally();
      const latencyMs = Math.round(performance.now() - probeStart);
      if (res.online) {
        return {
          online: true,
          latencyMs: res.latencyMs ?? latencyMs,
          companyName: `${res.companyName || "Tally Prime"} (Desktop Native)`,
          usedBridge: true,
          resolvedUrl: "electron://ipc-direct",
        };
      }
      return {
        online: false,
        latencyMs,
        error: res.error || "Cannot connect to local Tally on port 9000. Ensure Tally Prime is running with HTTP Server enabled.",
      };
    } catch (err: unknown) {
      console.warn("Desktop native probe failed, falling back to network probe:", err);
    }
  }

  // 2. If host is port 9000 or default, check if the CredSmart Bridge is active on port 9005
  if (hostUrl.includes(":9000") || hostUrl === "http://127.0.0.1:9000") {
    try {
      const bridgeStart = performance.now();
      const bridgeController = new AbortController();
      const bridgeTimeout = setTimeout(() => bridgeController.abort(), 1500);

      const effectiveToken = pairingToken || (typeof window !== "undefined" ? window.credsmartDesktop?.pairingToken : undefined);

      const bridgeRes = await fetch(CREDSMART_BRIDGE_HOST, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          ...(effectiveToken ? { "X-CredSmart-Sync-Token": effectiveToken } : {}),
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

  // 3. Fallback direct HTTP probe
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
        ? "Browser Security Restriction: Chrome blocks HTTPS web pages from directly calling local HTTP port 9000 without CORS headers. Run CredSmart Desktop Software or double-click 'CredSmart-Sync.bat' to start the local sync bridge."
        : "Cannot reach local Tally server directly from browser. Run CredSmart Desktop Software or 'CredSmart-Sync.bat' to connect.",
    };
  }
}

/**
 * Fetches live data directly from local Tally HTTP Server, CredSmart Desktop IPC, or CredSmart Bridge and parses it
 */
export async function fetchLiveTallyData(hostUrl = "http://127.0.0.1:9000", pairingToken?: string): Promise<TallyParseResult> {
  // 1. If running inside CredSmart Desktop App, use native Node.js IPC directly
  if (typeof window !== "undefined" && window.credsmartDesktop?.requestTally) {
    const desktopRequest = async (body: string): Promise<TallyParseResult> => {
      const xml = await window.credsmartDesktop!.requestTally!(body);
      return parseTallyXml(xml);
    };
    const masters = await desktopRequest(TALLY_EXPORT_MASTERS_XML);
    const daybook = await desktopRequest(TALLY_EXPORT_DAYBOOK_XML);
    return mergeTallyParseResults(masters, daybook);
  }

  // 2. If browser, check if bridge is active on port 9005
  let targetUrl = hostUrl;
  const effectiveToken = pairingToken || (typeof window !== "undefined" ? window.credsmartDesktop?.pairingToken : undefined);

  if (hostUrl.includes(":9000")) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 1200);
      const testBridge = await fetch(CREDSMART_BRIDGE_HOST, {
        method: "GET",
        headers: effectiveToken ? { "X-CredSmart-Sync-Token": effectiveToken } : undefined,
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
          ...(targetUrl === CREDSMART_BRIDGE_HOST && effectiveToken
            ? { "X-CredSmart-Sync-Token": effectiveToken }
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
    bankAccounts?: TallyBankAccount[];
    cashInHand?: number;
  },
  source: SyncAuditLog["source"] = "direct_browser",
  software: SupportedSoftware = "tally"
): Promise<SyncExecutionResult> {
  const startTime = performance.now();
  let itemsCount = 0;
  let partiesCount = 0;
  let vouchersCount = 0;
  let banksCount = 0;
  let balancesCount = 0;
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
      { data: existingPurchases },
      { data: existingCreditTxns },
      { data: existingExpenses }
    ] = await Promise.all([
      supabase.from("products").select("id, name, tags, sku").eq("organization_id", orgId).limit(10000),
      supabase.from("customers").select("id, name, phone").eq("organization_id", orgId).limit(10000),
      supabase.from("suppliers").select("id, name, phone").eq("organization_id", orgId).limit(10000),
      supabase.from("sales").select("id, invoice_number").eq("organization_id", orgId).limit(10000),
      supabase.from("purchase_invoices").select("id, invoice_number").eq("organization_id", orgId).limit(10000),
      supabase.from("credit_transactions").select("reference_id").eq("organization_id", orgId).limit(10000),
      supabase.from("expenses").select("expense_number").eq("organization_id", orgId).limit(10000)
    ]);

    const productMap = new Map((existingProducts || []).map(p => [p.name.toLowerCase().trim(), p]));
    const customerMap = new Map((existingCustomers || []).map(c => [c.name.toLowerCase().trim(), c]));
    (existingCustomers || []).forEach(c => { if (c.phone) customerMap.set(c.phone.trim(), c); });
    
    const supplierMap = new Map((existingSuppliers || []).map(s => [s.name.toLowerCase().trim(), s]));
    (existingSuppliers || []).forEach(s => { if (s.phone) supplierMap.set(s.phone.trim(), s); });

    const salesMap = new Map((existingSales || []).map(s => [s.invoice_number, s]));
    const purchasesMap = new Map((existingPurchases || []).map(p => [p.invoice_number, p]));
    const existingRefIds = new Set<string>(
      (existingCreditTxns || [])
        .map((t: any) => t.reference_id)
        .filter((r: any): r is string => Boolean(r))
    );
    const existingExpenseNumbers = new Set<string>(
      (existingExpenses || [])
        .map((e: any) => e.expense_number)
        .filter((n: any): n is string => Boolean(n))
    );

    if (typeof localStorage !== "undefined") {
      try {
        const rawLocal = localStorage.getItem(`credsmart_expenses_${orgId}`);
        if (rawLocal) {
          const localList = JSON.parse(rawLocal);
          if (Array.isArray(localList)) {
            for (const item of localList) {
              if (item.expense_number) existingExpenseNumbers.add(item.expense_number);
            }
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    }

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
        const { error } = await supabase.from("products").upsert(productsToUpdate.slice(i, i + chunkSize));
        if (error) throw new Error(`Failed to update products: ${error.message}`);
        itemsCount += productsToUpdate.slice(i, i + chunkSize).length;
      }
      
      let newProducts: any[] = [];
      for (let i = 0; i < productsToInsert.length; i += chunkSize) {
        const slice = productsToInsert.slice(i, i + chunkSize);
        const { data, error } = await supabase.from("products").insert(slice).select("id, name");
        if (error) throw new Error(`Failed to insert products: ${error.message}`);
        if (data) {
          newProducts = newProducts.concat(data);
          itemsCount += data.length;
          data.forEach(p => {
            if (p.name) productMap.set(p.name.toLowerCase().trim(), p);
          });
        } else {
          itemsCount += slice.length;
          slice.forEach(p => {
            if (p.name && !productMap.has(p.name.toLowerCase().trim())) {
              productMap.set(p.name.toLowerCase().trim(), p);
            }
          });
        }
      }
      
      // Upsert Product Batches
      const productIdsToUpdate = productsToUpdate.map(p => p.id);
      let existingBatchesMap = new Map();
      if (productIdsToUpdate.length > 0) {
          const { data: batches } = await supabase.from("product_batches").select("id, product_id, batch_number").in("product_id", productIdsToUpdate);
          existingBatchesMap = new Map((batches || []).map(b => [b.product_id, { id: b.id, batch_number: b.batch_number }]));
      }
      
      const batchesToUpsert: any[] = [];
      for (const p of productsToUpdate) {
         const item = parsedData.items.find(i => i.name?.toLowerCase().trim() === p.name.toLowerCase().trim());
         if (!item) continue;
         const existingBatch = existingBatchesMap.get(p.id);
         const payload = {
            product_id: p.id,
            batch_number: existingBatch ? existingBatch.batch_number : "SYNC-BATCH-1",
            cost_price: Number(item.purchasePrice) || 0,
            mrp: item.mrp || item.sellingPrice || 0,
            stock: Number(item.openingStock ?? item.currentStock ?? 0),
         };
         batchesToUpsert.push(existingBatch ? { id: existingBatch.id, ...payload, updated_at: new Date().toISOString() } : payload);
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
        const { error } = await supabase.from("product_batches").upsert(batchesToUpsert.slice(i, i + chunkSize));
        if (error) throw new Error(`Failed to upsert batches: ${error.message}`);
      }
    }

    // --- Process Parties ---
    const transactionsToInsert: any[] = [];
    if (parsedData.parties.length > 0) {
      const customersToUpsert: any[] = [];
      const suppliersToUpsert: any[] = [];
      
      for (const party of parsedData.parties) {
        if (!party.name) continue;
        const isSupplier = party.partyType === "supplier";
        const map = isSupplier ? supplierMap : customerMap;
        const lookupKey = party.phone && party.phone.trim().length > 5 ? party.phone.trim() : party.name.toLowerCase().trim();
        const existing = map.get(lookupKey);

        const basePayload = {
          organization_id: orgId,
          name: party.name,
          phone: party.phone || undefined,
          email: party.email || undefined,
          address: party.address || undefined,
        };

        const payload = isSupplier
          ? { ...basePayload, gstin: party.gstin || undefined }
          : basePayload;

        if (existing) {
          if (strategy === "credsmart_master") { partiesCount++; continue; }
          (isSupplier ? suppliersToUpsert : customersToUpsert).push({ id: existing.id, ...payload });
        } else {
          // Temporarily hold random UUID for credit transaction mapping
          const tempId = crypto.randomUUID();
          (isSupplier ? suppliersToUpsert : customersToUpsert).push({ id: tempId, ...payload });
        }
      }
      
      for (let i = 0; i < customersToUpsert.length; i += 1000) {
         const { data, error } = await supabase.from("customers").upsert(customersToUpsert.slice(i, i + 1000)).select("id, name");
         if (error) throw new Error(`Failed to upsert customers: ${error.message}`);
         partiesCount += customersToUpsert.slice(i, i + 1000).length;
         
         // Record opening balances
         if (data) {
           data.forEach(cust => {
             const origParty = parsedData.parties.find(p => p.name?.toLowerCase().trim() === cust.name?.toLowerCase().trim() && p.partyType !== "supplier");
             if (origParty && origParty.openingBalance && origParty.openingBalance !== 0) {
               transactionsToInsert.push({
                 organization_id: orgId,
                 party_id: cust.id,
                 party_type: "customer",
                 amount: Math.abs(origParty.openingBalance),
                 type: "opening_balance",
                 description: "Opening Balance",
                 reference_id: "SYNC-OPENING",
                 created_by: userId || "00000000-0000-0000-0000-000000000000",
               });
             }
             customerMap.set(cust.name.toLowerCase().trim(), cust);
           });
         }
      }
      for (let i = 0; i < suppliersToUpsert.length; i += 1000) {
         const { data, error } = await supabase.from("suppliers").upsert(suppliersToUpsert.slice(i, i + 1000)).select("id, name");
         if (error) throw new Error(`Failed to upsert suppliers: ${error.message}`);
         partiesCount += suppliersToUpsert.slice(i, i + 1000).length;
         
         // Record opening balances
         if (data) {
           data.forEach(supp => {
             const origParty = parsedData.parties.find(p => p.name?.toLowerCase().trim() === supp.name?.toLowerCase().trim() && p.partyType === "supplier");
             if (origParty && origParty.openingBalance && origParty.openingBalance !== 0) {
               transactionsToInsert.push({
                 organization_id: orgId,
                 party_id: supp.id,
                 party_type: "supplier",
                 amount: Math.abs(origParty.openingBalance),
                 type: "opening_balance",
                 description: "Opening Balance",
                 reference_id: "SYNC-OPENING",
                 created_by: userId || "00000000-0000-0000-0000-000000000000",
               });
             }
             supplierMap.set(supp.name.toLowerCase().trim(), supp);
           });
         }
      }
      
      if (transactionsToInsert.length > 0) {
        for (let i = 0; i < transactionsToInsert.length; i += 1000) {
          const chunk = transactionsToInsert.slice(i, i + 1000);
          const { error } = await supabase.from("credit_transactions").insert(chunk);
          if (error) {
            console.error("Failed to insert credit_transactions:", error.message);
          } else {
            balancesCount += chunk.length;
          }
        }
      }
    }

    // --- Process Vouchers ---
    if (parsedData.vouchers && parsedData.vouchers.length > 0) {
      const salesToInsert: any[] = [];
      const saleItemsToInsert: any[] = [];
      const purchasesToInsert: any[] = [];
      const purchaseItemsToInsert: any[] = [];
      const creditTxnsToInsert: any[] = [];
      const expensesToInsert: any[] = [];

      for (const vch of parsedData.vouchers) {
        if (!vch.voucherNumber) continue;

        if (vch.voucherType === "Sales") {
          const existing = salesMap.get(vch.voucherNumber);
          if (existing) {
            continue; // Ignore duplicate sales voucher insertion by invoice_number
          }

          let customerId: string | null = null;
          if (vch.partyName) {
            const cust = customerMap.get(vch.partyName.toLowerCase().trim());
            if (cust) customerId = cust.id;
          }

          let computedTax = 0;
          if (vch.ledgerEntries) {
            computedTax = vch.ledgerEntries.reduce((sum, le) => {
              const ln = le.ledgerName.toLowerCase();
              const isTaxLedger = (ln.includes("gst") || ln.includes("vat") || ln.includes("cess") || ln.endsWith(" tax") || ln.startsWith("tax ")) && !ln.includes("sales") && !ln.includes("purchase") && !ln.includes("free");
              if (isTaxLedger) {
                return sum + Math.abs(le.amount);
              }
              return sum;
            }, 0);
          }
          const subtotal = Math.max(0, (Number(vch.amount) || 0) - computedTax);

          const saleId = crypto.randomUUID();
          const saleRecord = {
            id: saleId,
            organization_id: orgId,
            invoice_number: vch.voucherNumber,
            subtotal: subtotal || Number(vch.amount) || 0,
            total: Number(vch.amount) || 0,
            tax: computedTax,
            payment_method: "Credit",
            customer_id: customerId,
            created_by: userId || "00000000-0000-0000-0000-000000000000",
            created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
          };
          salesToInsert.push(saleRecord);
          salesMap.set(vch.voucherNumber, saleRecord);

          if (vch.items && vch.items.length > 0) {
            for (const item of vch.items) {
              const prod = productMap.get((item.itemName || "").toLowerCase().trim());
              const qty = Math.abs(Number(item.quantity) || 1);
              const rate = Number(item.rate) || 0;
              const lineTotal = Math.abs(Number(item.amount) || (qty * rate));
              saleItemsToInsert.push({
                sale_id: saleId,
                product_id: prod?.id || null,
                product_name: item.itemName,
                mrp: rate,
                quantity: qty,
                line_total: lineTotal,
                batch_number: item.batchNumber || null,
              });
            }
          }
          vouchersCount++;
        } else if (vch.voucherType === "Purchase") {
          const existing = purchasesMap.get(vch.voucherNumber);
          if (existing) {
            continue; // Ignore duplicate purchase voucher insertion by invoice_number
          }

          const partyKey = (vch.partyName || "").toLowerCase().trim();
          let supp = partyKey ? supplierMap.get(partyKey) : null;
          if (!supp) {
            const newSuppId = crypto.randomUUID();
            const newSupplier = {
              id: newSuppId,
              organization_id: orgId,
              name: vch.partyName || "Default Supplier",
            };
            await supabase.from("suppliers").insert([newSupplier]);
            supplierMap.set(partyKey || "default supplier", newSupplier);
            supp = newSupplier;
          }
          const supplierId = supp.id;

          const purchaseId = crypto.randomUUID();
          const purchaseRecord = {
            id: purchaseId,
            organization_id: orgId,
            supplier_id: supplierId,
            invoice_number: vch.voucherNumber,
            total_amount: Math.abs(Number(vch.amount) || 0),
            status: "received",
            notes: vch.narration || "Auto-synced from Tally",
            created_by: userId || "00000000-0000-0000-0000-000000000000",
            created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
          };
          purchasesToInsert.push(purchaseRecord);
          purchasesMap.set(vch.voucherNumber, purchaseRecord);

          if (vch.items && vch.items.length > 0) {
            for (const item of vch.items) {
              const itemKey = (item.itemName || "").toLowerCase().trim();
              let prod = productMap.get(itemKey);
              if (!prod) {
                const newProdId = crypto.randomUUID();
                const newProduct = {
                  id: newProdId,
                  organization_id: orgId,
                  name: item.itemName,
                  category: "General",
                  sku: getStableTallySku(item.itemName),
                  tags: {
                    selling_price: Number(item.rate) || 0,
                    purchase_price: Number(item.rate) || 0,
                    mrp: Number(item.rate) || 0,
                    unit: item.unit || "PCS",
                  },
                };
                const { error: pErr } = await supabase.from("products").insert([newProduct]);
                if (!pErr) {
                  productMap.set(itemKey, newProduct);
                  prod = newProduct;
                } else {
                  const { data: found } = await supabase.from("products").select("id, name, tags, sku").eq("organization_id", orgId).ilike("name", item.itemName).limit(1).maybeSingle();
                  if (found) {
                    productMap.set(itemKey, found);
                    prod = found;
                  }
                }
              }
              if (prod?.id) {
                const qty = Math.abs(Number(item.quantity) || 1);
                const rate = Number(item.rate) || 0;
                purchaseItemsToInsert.push({
                  purchase_invoice_id: purchaseId,
                  product_id: prod.id,
                  quantity: qty,
                  cost_price: rate,
                  mrp: rate,
                  batch_number: item.batchNumber || "BATCH-01",
                  expiry_date: item.expiryDate || null,
                  received_quantity: qty,
                });
              }
            }
          }
          vouchersCount++;
        } else if (vch.voucherType === "Receipt") {
          if (vch.voucherNumber && existingRefIds.has(vch.voucherNumber)) {
            continue; // Deduplicate existing receipt
          }
          if (vch.voucherNumber) {
            existingRefIds.add(vch.voucherNumber);
          }

          const partyKey = (vch.partyName || "").toLowerCase().trim();
          let cust = partyKey ? customerMap.get(partyKey) : null;
          if (!cust) {
            const newCustId = crypto.randomUUID();
            const newCustomer = {
              id: newCustId,
              organization_id: orgId,
              name: vch.partyName || "Customer",
            };
            await supabase.from("customers").insert([newCustomer]);
            customerMap.set(partyKey || "customer", newCustomer);
            cust = newCustomer;
          }
          const customerId = cust.id;

          creditTxnsToInsert.push({
            organization_id: orgId,
            party_id: customerId,
            party_type: "customer",
            amount: Math.abs(Number(vch.amount) || 0),
            type: "payment",
            description: vch.narration || "Customer Receipt",
            reference_id: vch.voucherNumber,
            created_by: userId || "00000000-0000-0000-0000-000000000000",
          });
          vouchersCount++;
        } else if (vch.voucherType === "Payment") {
          if (isExpenseVoucher(vch, supplierMap)) {
            if (vch.voucherNumber && existingExpenseNumbers.has(vch.voucherNumber)) {
              continue; // Deduplicate existing expense
            }
            if (vch.voucherNumber) {
              existingExpenseNumbers.add(vch.voucherNumber);
            }

            const expenseCategory = vch.partyName?.trim() || "General Expense";
            const expenseDate = vch.date?.slice(0, 10) || new Date().toISOString().slice(0, 10);
            expensesToInsert.push({
              id: crypto.randomUUID(),
              organization_id: orgId,
              category: expenseCategory,
              amount: Math.abs(Number(vch.amount) || 0),
              date: expenseDate,
              expense_number: vch.voucherNumber || null,
              description: vch.partyName ? `${vch.partyName} - ${vch.narration || ""}`.trim() : (vch.narration || "Expense"),
              payment_method: "Cash",
              created_by: userId || null,
            });
          } else {
            if (vch.voucherNumber && existingRefIds.has(vch.voucherNumber)) {
              continue; // Deduplicate existing supplier payment
            }
            if (vch.voucherNumber) {
              existingRefIds.add(vch.voucherNumber);
            }

            const partyKey = (vch.partyName || "").toLowerCase().trim();
            let supp = partyKey ? supplierMap.get(partyKey) : null;
            if (!supp) {
              const newSuppId = crypto.randomUUID();
              const newSupplier = {
                id: newSuppId,
                organization_id: orgId,
                name: vch.partyName || "Supplier",
              };
              await supabase.from("suppliers").insert([newSupplier]);
              supplierMap.set(partyKey || "supplier", newSupplier);
              supp = newSupplier;
            }
            const supplierId = supp.id;

            creditTxnsToInsert.push({
              organization_id: orgId,
              party_id: supplierId,
              party_type: "supplier",
              amount: Math.abs(Number(vch.amount) || 0),
              type: "payment",
              description: vch.narration || "Supplier Payment",
              reference_id: vch.voucherNumber,
              created_by: userId || "00000000-0000-0000-0000-000000000000",
            });
          }
          vouchersCount++;
        } else if (vch.voucherType === "Journal") {
          if (vch.voucherNumber && existingExpenseNumbers.has(vch.voucherNumber)) {
            continue; // Deduplicate existing journal expense
          }
          if (vch.voucherNumber) {
            existingExpenseNumbers.add(vch.voucherNumber);
          }

          const expenseCategory = vch.partyName?.trim() || "General Expense";
          const expenseDate = vch.date?.slice(0, 10) || new Date().toISOString().slice(0, 10);
          expensesToInsert.push({
            id: crypto.randomUUID(),
            organization_id: orgId,
            category: expenseCategory,
            amount: Math.abs(Number(vch.amount) || 0),
            date: expenseDate,
            expense_number: vch.voucherNumber || null,
            description: vch.partyName ? `${vch.partyName} - ${vch.narration || ""}`.trim() : (vch.narration || "Expense"),
            payment_method: "Cash",
            created_by: userId || null,
          });
          vouchersCount++;
        } else if (vch.voucherType === "Credit Note" || vch.voucherType === "Debit Note") {
          vouchersCount++;
        } else {
          unsupportedVoucherTypes.add(vch.voucherType);
        }
      }

      // Execute batches
      for (let i = 0; i < salesToInsert.length; i += 1000) {
        const { error } = await supabase.from("sales").insert(salesToInsert.slice(i, i + 1000));
        if (error) throw new Error(`Failed to insert sales: ${error.message}`);
      }
      for (let i = 0; i < saleItemsToInsert.length; i += 1000) {
        const { error } = await supabase.from("sale_items").insert(saleItemsToInsert.slice(i, i + 1000));
        if (error) throw new Error(`Failed to insert sale items: ${error.message}`);
      }
      for (let i = 0; i < purchasesToInsert.length; i += 1000) {
        const { error } = await supabase.from("purchase_invoices").insert(purchasesToInsert.slice(i, i + 1000));
        if (error) throw new Error(`Failed to insert purchases: ${error.message}`);
      }
      for (let i = 0; i < purchaseItemsToInsert.length; i += 1000) {
        const { error } = await supabase.from("purchase_invoice_items").insert(purchaseItemsToInsert.slice(i, i + 1000));
        if (error) throw new Error(`Failed to insert purchase items: ${error.message}`);
      }
      for (let i = 0; i < creditTxnsToInsert.length; i += 1000) {
        const { error } = await supabase.from("credit_transactions").insert(creditTxnsToInsert.slice(i, i + 1000));
        if (error) throw new Error(`Failed to insert credit transactions: ${error.message}`);
      }
      if (expensesToInsert.length > 0) {
        for (let i = 0; i < expensesToInsert.length; i += 1000) {
          const { error } = await supabase.from("expenses").insert(expensesToInsert.slice(i, i + 1000));
          if (error) console.error("Failed to insert expenses to table:", error.message);
        }
        try {
          const expenseKey = `credsmart_expenses_${orgId}`;
          if (typeof localStorage !== "undefined") {
            const raw = localStorage.getItem(expenseKey);
            let currentList: any[] = [];
            if (raw) {
              try { currentList = JSON.parse(raw); if (!Array.isArray(currentList)) currentList = []; } catch { currentList = []; }
            }
            for (const exp of expensesToInsert) {
              if (exp.expense_number && currentList.some((e: any) => e.expense_number === exp.expense_number)) {
                continue;
              }
              currentList.push({
                id: exp.id,
                expense_number: exp.expense_number || `EXP-${Date.now()}`,
                party_name: exp.category,
                category: exp.category,
                amount: exp.amount,
                date: exp.date,
                description: exp.description,
                payment_method: exp.payment_method,
                created_at: new Date().toISOString(),
              });
            }
            localStorage.setItem(expenseKey, JSON.stringify(currentList));
          }
        } catch (e) {
          console.error("Failed to append to expenses localStorage:", e);
        }
      }
    }

    // --- Process Bank Accounts & Cash in Hand ---
    if (parsedData.bankAccounts && config?.syncScope?.banks !== false) {
      try {
        const { error: probeError } = await supabase.from("bank_accounts").select("id").limit(1);
        if (!probeError && parsedData.bankAccounts.length > 0) {
          const dbAccounts = parsedData.bankAccounts.map((b) => ({
            organization_id: orgId,
            name: b.name || b.accountName || "Bank Account",
            bank_name: b.bankName || b.name || "Bank",
            account_number: b.accountNumber || "—",
            ifsc_code: b.ifscCode || b.ifsc || "—",
            account_type: "current",
            balance: Number(b.balance) || 0,
          }));
          await supabase.from("bank_accounts").upsert(dbAccounts);
        }
      } catch {
        // Probe or upsert failed, proceed with localStorage
      }

      try {
        const storageKey = `credsmart_bank_accounts_${orgId}`;
        let existingAccounts: any[] = [];
        if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              existingAccounts = JSON.parse(stored);
              if (!Array.isArray(existingAccounts)) existingAccounts = [];
            } catch {
              existingAccounts = [];
            }
          }
        }

        const mergedAccounts = [...existingAccounts];
        for (const b of parsedData.bankAccounts) {
          const bAccNum = b.accountNumber ? b.accountNumber.trim() : "";
          const bName = (b.name || b.accountName || "").trim().toLowerCase();

          const existingIdx = mergedAccounts.findIndex((acc) => {
            if (bAccNum && acc.accountNumber && acc.accountNumber === bAccNum) return true;
            if (bName && acc.name && acc.name.trim().toLowerCase() === bName) return true;
            return false;
          });

          if (existingIdx >= 0) {
            mergedAccounts[existingIdx] = {
              ...mergedAccounts[existingIdx],
              name: b.name || b.accountName || mergedAccounts[existingIdx].name,
              bankName: b.bankName || mergedAccounts[existingIdx].bankName,
              accountNumber: b.accountNumber || mergedAccounts[existingIdx].accountNumber,
              ifscCode: b.ifscCode || b.ifsc || mergedAccounts[existingIdx].ifscCode || "",
              balance: Number(b.balance) ?? mergedAccounts[existingIdx].balance,
              accountType: mergedAccounts[existingIdx].accountType || "current",
            };
          } else {
            mergedAccounts.push({
              id: (b as any).id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bank-${Date.now()}-${Math.random()}`),
              name: b.name || b.accountName || "Bank Account",
              bankName: b.bankName || b.name || "Bank",
              accountNumber: b.accountNumber || "",
              ifscCode: b.ifscCode || b.ifsc || "",
              accountType: "current",
              balance: Number(b.balance) || 0,
              isPrimary: mergedAccounts.length === 0,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (typeof localStorage !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(mergedAccounts));
        }
        banksCount = parsedData.bankAccounts.length;
      } catch (e) {
        console.error("Failed to persist bank accounts to localStorage:", e);
      }
    }

    if (parsedData.cashInHand !== undefined && parsedData.cashInHand !== null) {
      try {
        const cashKey = `credsmart_cash_in_hand_${orgId}`;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(cashKey, String(parsedData.cashInHand));
        }
      } catch (e) {
        console.error("Failed to persist cash-in-hand to localStorage:", e);
      }
    }

    if (
      (parsedData.bankAccounts && parsedData.bankAccounts.length > 0) ||
      (parsedData.cashInHand !== undefined && parsedData.cashInHand !== null)
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("credsmart_bank_updated", { detail: { orgId } }));
      }
    }

    if (itemsCount > 0) notifyStockUpdated(orgId);
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
      banksSynced: banksCount,
      balancesSynced: balancesCount,
      durationMs,
      message: unsupportedVoucherTypes.size > 0
        ? `Synchronized ${itemsCount} items, ${partiesCount} parties, ${vouchersCount} vouchers, ${banksCount} banks. Unsupported types: ${Array.from(unsupportedVoucherTypes).join(", ")}.`
        : `Successfully synchronized ${itemsCount} items and ${partiesCount} parties from ${software.toUpperCase()}.`,
      source,
    };

    const updatedConfig = getSyncConfig(orgId);
    updatedConfig.lastSyncAt = new Date().toISOString();
    updatedConfig.lastSyncStatus = unsupportedVoucherTypes.size > 0 ? "partial" : "success";
    updatedConfig.lastSyncStats = { items: itemsCount, parties: partiesCount, vouchers: vouchersCount, banks: banksCount, balances: balancesCount };
    updatedConfig.history = [log, ...updatedConfig.history.slice(0, 19)];
    saveSyncConfig(updatedConfig);

    return {
      success: unsupportedVoucherTypes.size === 0,
      itemsCount,
      partiesCount,
      vouchersCount,
      banksCount,
      balancesCount,
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
      banksSynced: banksCount,
      balancesSynced: balancesCount,
      durationMs,
      message: `Sync failed: ${errorMsg}`,
      source,
    };

    const configFailed = getSyncConfig(orgId);
    configFailed.lastSyncAt = new Date().toISOString();
    configFailed.lastSyncStatus = "failed";
    configFailed.history = [log, ...configFailed.history.slice(0, 19)];
    saveSyncConfig(configFailed);

    return { success: false, itemsCount, partiesCount, vouchersCount: 0, banksCount, balancesCount, durationMs, log, error: errorMsg };
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

This is a plain-text guide, not a TDL add-on. This file intentionally contains comments only.
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

            $voucherCount = 0
            try {
                $daybookXml = @"
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
          <SVFROMDATE>20200401</SVFROMDATE>
          <SVTODATE>20291231</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
"@
                $dbResp = Invoke-WebRequest -Uri $Url -Method POST -Body $daybookXml -ContentType "text/xml" -TimeoutSec 45 -UseBasicParsing
                if ($dbResp.StatusCode -eq 200 -and $dbResp.Content.Length -gt 50) {
                    $desktopDaybook = Join-Path $desktop "CredSmart_Tally_Daybook.xml"
                    $localDaybook = Join-Path (Get-Location) "CredSmart_Tally_Daybook.xml"
                    [System.IO.File]::WriteAllText($desktopDaybook, $dbResp.Content, [System.Text.Encoding]::UTF8)
                    [System.IO.File]::WriteAllText($localDaybook, $dbResp.Content, [System.Text.Encoding]::UTF8)
                    $voucherCount = [regex]::Matches($dbResp.Content, "<VOUCHER\b").Count
                }
            } catch {
                # Daybook optional
            }

            Write-Host ""
            Write-Host "=========================================================================" -ForegroundColor Green
            Write-Host "  [EXPORT COMPLETED SUCCESSFULLY!]" -ForegroundColor Green
            Write-Host "  * Stock Items Found:   $itemsCount" -ForegroundColor White
            Write-Host "  * Ledgers / Parties:   $ledgerCount" -ForegroundColor White
            Write-Host "  * Vouchers Found:      $voucherCount" -ForegroundColor White
            Write-Host "  * Masters File:        $desktopFile" -ForegroundColor Yellow
            if ($voucherCount -gt 0) {
                Write-Host "  * Daybook File:        $desktopDaybook" -ForegroundColor Yellow
            }
            Write-Host "=========================================================================" -ForegroundColor Green
            Write-Host ""

            Write-Host "Opening CredSmart Import in browser..." -ForegroundColor Cyan
            Start-Process $TargetWebUrl

            Write-Host "Highlighting exported file in Windows Explorer..." -ForegroundColor Gray
            Start-Process explorer.exe -ArgumentList "/select,\`"$desktopFile\`""

            Write-Host ""
            Write-Host "Tip: In CredSmart, click 'Upload File(s)' or simply drag & drop" -ForegroundColor Yellow
            Write-Host "     CredSmart_Tally_Export.xml and CredSmart_Tally_Daybook.xml into the browser window!" -ForegroundColor Yellow
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
