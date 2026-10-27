import { supabase } from "@/integrations/supabase/client";
import {
  NetworkInvoice,
  NetworkInvoiceStatus,
  NetworkNotification,
  ConnectedOrgInfo,
} from "@/types/networkInvoicing";
import { BusinessDocument, DocumentLineItem } from "@/types/documents";
import { documentsService } from "@/services/documentsService";
import { OrgData, getLocalOrgRegistry } from "@/hooks/useOrganization";
import {
  getLocalCachedProducts,
  addOrUpdateLocalCachedProduct,
  notifyStockUpdated,
  generateSafeUuid,
} from "@/services/stockService";
import { productsApi } from "@/services/productsApi";
import { partiesApi } from "@/services/partiesApi";
import { settingsApi } from "@/services/settingsApi";

const STORAGE_INVOICES_KEY = "credsmart_network_invoices_v1";
const STORAGE_NOTIFICATIONS_KEY = "credsmart_network_notifications_v1";

const IS_TEST_ENV =
  (typeof process !== "undefined" && (process.env?.NODE_ENV === "test" || process.env?.VITEST === "true" || !!process.env?.VITEST)) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.MODE === "test");

// BroadcastChannel for instant multi-tab sync
let networkChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window && !IS_TEST_ENV) {
    networkChannel = new BroadcastChannel("credsmart_network_channel");
  }
} catch {
  // Ignore environments without BroadcastChannel
}

// Clean phone digits for comparison (e.g. +91 98765 43210 -> 9876543210)
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Check if string is a valid UUID to prevent Postgres 22P02 errors
export function isUuid(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

// Managed Singleton Realtime Channel for B2B Network
let b2bRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function getOrCreateB2BRealtimeChannel() {
  if (typeof window === "undefined" || IS_TEST_ENV) return null;
  if (!b2bRealtimeChannel) {
    try {
      b2bRealtimeChannel = supabase.channel("credsmart_b2b_network_realtime", {
        config: { broadcast: { self: true, ack: false } },
      });
    } catch (e) {
      console.warn("[CredSmart B2B Realtime] Init error:", e);
    }
  }
  return b2bRealtimeChannel;
}

async function broadcastViaSupabase(event: string, payload: unknown) {
  if (typeof window === "undefined" || IS_TEST_ENV) return;

  try {
    const channel = getOrCreateB2BRealtimeChannel();
    if (!channel) return;

    const doSend = async () => {
      try {
        await channel.send({
          type: "broadcast",
          event,
          payload,
        });
        console.log(`[CredSmart B2B Realtime] Broadcast event '${event}' sent successfully`);
      } catch (sendErr) {
        console.warn(`[CredSmart B2B Realtime] Send warning:`, sendErr);
      }
    };

    if (channel.state === "joined") {
      await doSend();
      return;
    }

    // If channel is closed or errored, initiate subscribe
    if (channel.state === "closed" || channel.state === "errored") {
      channel.subscribe();
    }

    // Wait up to 3 seconds for channel to join
    const start = Date.now();
    while (channel.state !== "joined" && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 60));
    }

    if (channel.state === "joined") {
      await doSend();
    } else {
      console.warn(`[CredSmart B2B Realtime] Channel in state '${channel.state}', attempting best-effort send`);
      try {
        await channel.send({ type: "broadcast", event, payload });
      } catch { /* empty */ }
    }
  } catch (err) {
    console.warn("[CredSmart B2B Realtime] Broadcast catch error:", err);
  }
}

function dispatchNetworkEvents(type: string, payload?: unknown) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("credsmart_network_update", { detail: { type, payload } })
    );
    window.dispatchEvent(
      new CustomEvent("credsmart_notification_update", { detail: { type, payload } })
    );
  }
  if (networkChannel) {
    try {
      networkChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch {
      // Ignore channel errors
    }
  }

  // Handle Supabase Realtime Broadcast dynamically across all devices & browsers
  if (typeof window !== "undefined" && !IS_TEST_ENV) {
    broadcastViaSupabase(type, payload);
  }
}


const GENERIC_BUSINESS_STOP_WORDS = new Set([
  "pvt", "ltd", "limited", "private", "enterprises", "enterprise",
  "wholesale", "retail", "retailer", "wholesaler", "supermarket",
  "store", "stores", "shop", "shops", "trading", "traders", "trader",
  "services", "service", "company", "corp", "corporation", "llp",
  "agency", "mart", "supplies", "supply", "holdings", "group", "and", "the"
]);

// Check if a business name matches another business name (exact or normalized substring or non-generic word match)
export function isBusinessNameMatch(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = nameA.trim().toLowerCase().replace(/[^\w\s]/g, "");
  const cleanB = nameB.trim().toLowerCase().replace(/[^\w\s]/g, "");
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // If one name contains the other (unless shorter name is solely a generic stop word like 'Store' or 'Wholesale')
  const shorter = cleanA.length <= cleanB.length ? cleanA : cleanB;
  const longer = cleanA.length > cleanB.length ? cleanA : cleanB;
  if (shorter.length >= 3 && !GENERIC_BUSINESS_STOP_WORDS.has(shorter)) {
    if (longer.includes(shorter)) return true;
  }

  // Check individual words with length >= 3, excluding generic business stop words to prevent false-positive cross-tenant leaks
  const wordsA = cleanA.split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_BUSINESS_STOP_WORDS.has(w));
  const wordsB = cleanB.split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_BUSINESS_STOP_WORDS.has(w));
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb) return true;
    }
  }
  return false;
}

export function isInvoiceForOrg(
  inv: NetworkInvoice,
  orgId: string,
  orgPhone?: string,
  orgGstin?: string,
  orgName?: string,
  userName?: string,
  userEmail?: string,
  userPhone?: string
): boolean {
  if (!orgId) return false;

  // STRICT MULTI-TENANT ISOLATION:
  // The creator/sender organization can NEVER be the recipient of their own outward sales invoice!
  if (inv.senderOrgId && inv.senderOrgId === orgId) return false;

  if (inv.recipientOrgId === orgId) return true;

  const cleanPhone = normalizePhoneNumber(orgPhone) || normalizePhoneNumber(userPhone);
  if (cleanPhone && inv.recipientPhone && normalizePhoneNumber(inv.recipientPhone) === cleanPhone) {
    return true;
  }

  const cleanGstin = (orgGstin || "").toUpperCase().trim();
  if (cleanGstin && inv.recipientGstin && inv.recipientGstin.toUpperCase().trim() === cleanGstin) {
    return true;
  }

  if (isBusinessNameMatch(inv.recipientOrgName, orgName)) {
    return true;
  }

  if (userName && isBusinessNameMatch(inv.recipientOrgName, userName)) {
    return true;
  }

  if (userEmail) {
    const cleanUserEmail = userEmail.trim().toLowerCase();
    if (inv.recipientEmail && inv.recipientEmail.trim().toLowerCase() === cleanUserEmail) {
      return true;
    }
    if (isBusinessNameMatch(inv.recipientOrgName, cleanUserEmail)) {
      return true;
    }
    const emailPrefix = cleanUserEmail.split("@")[0];
    if (emailPrefix && emailPrefix.length >= 3 && isBusinessNameMatch(inv.recipientOrgName, emailPrefix)) {
      return true;
    }
  }

  if (cleanPhone && inv.recipientOrgName) {
    const orgNamePhone = normalizePhoneNumber(inv.recipientOrgName);
    if (orgNamePhone && orgNamePhone === cleanPhone) {
      return true;
    }
  }

  return false;
}

export function isNotificationForOrg(
  n: NetworkNotification,
  orgId: string,
  orgPhone?: string,
  orgGstin?: string,
  orgName?: string,
  userName?: string,
  userEmail?: string,
  userPhone?: string
): boolean {
  if (!orgId || !n) return false;

  // STRICT MULTI-TENANT ISOLATION:
  // If this notification was sent by this organization, and it's an inward recipient notification,
  // it MUST NEVER be delivered or displayed to this organization as an inward bill!
  const rawSenderOrgId =
    (typeof n.data?.senderOrgId === "string" ? n.data.senderOrgId : undefined) ||
    (typeof (n as any).senderOrgId === "string" ? (n as any).senderOrgId : undefined) ||
    (typeof n.data === "string" ? (() => { try { return JSON.parse(n.data)?.senderOrgId; } catch { return undefined; } })() : undefined);
  const isSender = typeof rawSenderOrgId === "string" && rawSenderOrgId === orgId;
  if (isSender && (n.category === "inward" || n.type?.startsWith("sale_invoice_"))) {
    return false;
  }

  if (n.recipientOrgId === orgId) return true;

  const hasRecipientOrgId = typeof n.recipientOrgId === "string" && n.recipientOrgId.length > 0;

  const cleanPhone = normalizePhoneNumber(orgPhone) || normalizePhoneNumber(userPhone);
  if (cleanPhone) {
    if (n.recipientPhone && normalizePhoneNumber(n.recipientPhone) === cleanPhone) return true;
    if (hasRecipientOrgId && n.recipientOrgId.includes(cleanPhone)) return true;
    if (n.data?.recipientPhone && normalizePhoneNumber(n.data.recipientPhone as string) === cleanPhone) return true;
  }

  const cleanGstin = (orgGstin || "").toUpperCase().trim();
  if (cleanGstin) {
    if (n.recipientGstin && n.recipientGstin.toUpperCase().trim() === cleanGstin) return true;
    if (hasRecipientOrgId && n.recipientOrgId.includes(cleanGstin)) return true;
    if (n.data?.recipientGstin && (n.data.recipientGstin as string).toUpperCase().trim() === cleanGstin) return true;
  }

  // Name matching
  if (isBusinessNameMatch(n.recipientOrgName, orgName)) return true;
  if (userName && isBusinessNameMatch(n.recipientOrgName, userName)) return true;
  if (n.data?.recipientPartyName && isBusinessNameMatch(n.data.recipientPartyName as string, orgName)) return true;
  if (userName && n.data?.recipientPartyName && isBusinessNameMatch(n.data.recipientPartyName as string, userName)) return true;

  if (hasRecipientOrgId && n.recipientOrgId.startsWith("party_match_")) {
    const matchedKey = n.recipientOrgId.replace("party_match_", "");
    if (isBusinessNameMatch(matchedKey, orgName)) return true;
    if (userName && isBusinessNameMatch(matchedKey, userName)) return true;
  }

  if (userEmail) {
    const cleanUserEmail = userEmail.trim().toLowerCase();
    if (isBusinessNameMatch(n.recipientOrgName, cleanUserEmail)) return true;
    const emailPrefix = cleanUserEmail.split("@")[0];
    if (emailPrefix && emailPrefix.length >= 3 && isBusinessNameMatch(n.recipientOrgName, emailPrefix)) {
      return true;
    }
  }

  return false;
}

// Fast timeout wrapper to prevent hanging on network/offline Supabase calls (4000ms default for reliable remote DB roundtrips)
async function safeDbCall<T>(promiseOrFn: Promise<T> | (() => Promise<T>), timeoutMs = 4000): Promise<T | null> {
  if (IS_TEST_ENV) {
    return null;
  }
  try {
    const promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const res = await Promise.race([promise, timeout]);
    return res as T | null;
  } catch {
    return null;
  }
}

export const networkInvoicingService = {
  // ─────────────────────────────────────────────────────────────
  // 1. LOCAL STORAGE ACCESSORS
  // ─────────────────────────────────────────────────────────────
  getLocalInvoices(): NetworkInvoice[] {
    try {
      const raw = localStorage.getItem(STORAGE_INVOICES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveLocalInvoices(invoices: NetworkInvoice[]) {
    try {
      localStorage.setItem(STORAGE_INVOICES_KEY, JSON.stringify(invoices));
    } catch (e) {
      console.warn("Failed to save local network invoices:", e);
    }
  },

  getLocalNotifications(): NetworkNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveLocalNotifications(notifs: NetworkNotification[]) {
    try {
      localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(notifs));
    } catch (e) {
      console.warn("Failed to save local network notifications:", e);
    }
  },

  registerConnectedOrg(org: OrgData) {
    if (typeof window === "undefined" || !org?.id) return;
    try {
      const raw = localStorage.getItem("credsmart_registered_orgs_cache");
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      const filtered = list.filter((o: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => o.id !== org.id); // eslint-disable-line @typescript-eslint/no-explicit-any
      filtered.push({
        id: org.id,
        name: org.name,
        phone: org.phone,
        email: org.email,
        gstin: org.gstin,
        address: org.address,
        business_type: org.business_type,
      });
      localStorage.setItem("credsmart_registered_orgs_cache", JSON.stringify(filtered));
    } catch { /* empty */ }
  },

  // ─────────────────────────────────────────────────────────────
  // 2. CONNECTED ORGANIZATION DISCOVERY / MATCHING
  // ─────────────────────────────────────────────────────────────
  async findConnectedOrganization(criteria: {
    orgId?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    name?: string;
    excludeOrgId?: string;
  }): Promise<ConnectedOrgInfo | null> {
    const cleanPhone = normalizePhoneNumber(criteria.phone);
    const cleanGstin = (criteria.gstin || "").toUpperCase().trim();
    const cleanEmail = (criteria.email || "").toLowerCase().trim();
    const cleanName = (criteria.name || "").trim().toLowerCase();

    // 1. Check all local registry & cached organizations
    if (typeof window !== "undefined") {
      try {
        const localOrgList: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
        const cachedRaw = localStorage.getItem("credsmart_registered_orgs_cache");
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (Array.isArray(parsed)) localOrgList.push(...parsed);
          } catch { /* empty */ }
        }
        const activeOrgRaw = localStorage.getItem("credsmart_active_org_data");
        if (activeOrgRaw) {
          try {
            const parsed = JSON.parse(activeOrgRaw);
            if (parsed && parsed.id) localOrgList.push(parsed);
          } catch { /* empty */ }
        }

        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith("credsmart_org_registry_")) {
            try {
              const orgs = JSON.parse(localStorage.getItem(k) || "[]");
              if (Array.isArray(orgs)) localOrgList.push(...orgs);
            } catch { /* empty */ }
          }
        }

        for (const o of localOrgList) {
          if (!o?.id || (criteria.excludeOrgId && o.id === criteria.excludeOrgId)) continue;
          if (criteria.orgId && o.id === criteria.orgId) {
            return {
              id: o.id,
              name: o.name,
              phone: o.phone,
              email: o.email,
              gstin: o.gstin,
              address: o.address,
              businessType: o.business_type,
              isRegisteredOnPlatform: true,
            };
          }
          if (cleanGstin && o.gstin && o.gstin.toUpperCase().trim() === cleanGstin) {
            return {
              id: o.id,
              name: o.name,
              phone: o.phone,
              email: o.email,
              gstin: o.gstin,
              address: o.address,
              businessType: o.business_type,
              isRegisteredOnPlatform: true,
            };
          }
          if (cleanPhone && o.phone && normalizePhoneNumber(o.phone) === cleanPhone) {
            return {
              id: o.id,
              name: o.name,
              phone: o.phone,
              email: o.email,
              gstin: o.gstin,
              address: o.address,
              businessType: o.business_type,
              isRegisteredOnPlatform: true,
            };
          }
          if (cleanEmail && o.email && o.email.toLowerCase().trim() === cleanEmail) {
            return {
              id: o.id,
              name: o.name,
              phone: o.phone,
              email: o.email,
              gstin: o.gstin,
              address: o.address,
              businessType: o.business_type,
              isRegisteredOnPlatform: true,
            };
          }
          if (cleanName && o.name && o.name.trim().toLowerCase() === cleanName) {
            return {
              id: o.id,
              name: o.name,
              phone: o.phone,
              email: o.email,
              gstin: o.gstin,
              address: o.address,
              businessType: o.business_type,
              isRegisteredOnPlatform: true,
            };
          }
        }
      } catch (err) {
        console.warn("Local org lookup notice:", err);
      }
    }

    // 1b. Query Supabase RPC lookup_network_organization (bypasses RLS to discover platform merchants safely)
    try {
      const rpcResult = await safeDbCall(async () => {
        const { data, error } = await supabase.rpc("lookup_network_organization" as any, {
          p_query: cleanName.length >= 3 ? cleanName : null,
          p_phone: cleanPhone.length >= 10 ? cleanPhone : null,
          p_gstin: cleanGstin.length >= 10 ? cleanGstin : null,
          p_exclude_org_id: criteria.excludeOrgId && isUuid(criteria.excludeOrgId) ? criteria.excludeOrgId : null,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data[0];
        }
        return null;
      });

      if (rpcResult && rpcResult.id && rpcResult.id !== criteria.excludeOrgId) {
        return {
          id: rpcResult.id,
          name: rpcResult.name,
          phone: rpcResult.phone || undefined,
          email: rpcResult.email || undefined,
          gstin: rpcResult.gstin || undefined,
          address: rpcResult.address || undefined,
          businessType: rpcResult.business_type || undefined,
          isRegisteredOnPlatform: true,
        };
      }
    } catch (rpcErr) {
      console.warn("RPC network organization lookup notice:", rpcErr);
    }

    // 2. Query storefront_settings (public platform directory of all registered stores)
    try {
      const sfResult = await safeDbCall(async () => {
        const canQueryPhone = cleanPhone && cleanPhone.length >= 10;
        const canQueryName = cleanName && cleanName.length >= 3;
        if (canQueryPhone || canQueryName) {
          const { data } = await settingsApi.getStorefrontSettings(canQueryPhone ? cleanPhone : cleanName);
          if (data && data.organization_id && data.organization_id !== criteria.excludeOrgId) return data;
        }
        return null;
      });

      if (sfResult && sfResult.organization_id && sfResult.organization_id !== criteria.excludeOrgId) {
        return {
          id: sfResult.organization_id,
          name: sfResult.store_name,
          phone: sfResult.contact_phone || undefined,
          address: sfResult.address || undefined,
          isRegisteredOnPlatform: true,
        };
      }
    } catch (err) {
      console.warn("Storefront directory lookup notice:", err);
    }

    // 3. Query organizations via settingsApi (with safe timeout)
    try {
      const dbResult = await safeDbCall(async () => {
        if (criteria.orgId && criteria.orgId !== criteria.excludeOrgId) {
          try {
            const { data } = await settingsApi.getOrganizationById(criteria.orgId);
            if (data && data.id && data.id !== criteria.excludeOrgId) return data;
          } catch {
            return null;
          }
        }
        const { data: orgs } = await settingsApi.getUserOrganizations();
        if (orgs && orgs.length > 0) {
          const validOrgs = criteria.excludeOrgId ? orgs.filter(o => o.id !== criteria.excludeOrgId) : orgs;
          if (cleanGstin) {
            const match = validOrgs.find((o) => o.gstin?.toLowerCase() === cleanGstin.toLowerCase());
            if (match) return match;
          }
          if (cleanPhone) {
            const digits10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
            const match = validOrgs.find((o) => o.phone?.includes(digits10));
            if (match) return match;
          }
          if (cleanEmail) {
            const match = validOrgs.find((o) => o.email?.toLowerCase() === cleanEmail.toLowerCase());
            if (match) return match;
          }
          if (cleanName && cleanName.length >= 3) {
            const match = validOrgs.find((o) => o.name?.toLowerCase().includes(cleanName.toLowerCase()));
            if (match) return match;
          }
        }
        return null;
      });

      if (dbResult && dbResult.id !== criteria.excludeOrgId) {
        return {
          id: dbResult.id,
          name: dbResult.name,
          phone: dbResult.phone || undefined,
          email: dbResult.email || undefined,
          gstin: dbResult.gstin || undefined,
          address: dbResult.address || undefined,
          businessType: dbResult.business_type || undefined,
          isRegisteredOnPlatform: true,
        };
      }
    } catch (err) {
      console.warn("Supabase organization lookup notice:", err);
    }

    // 4. Query Supabase organizations table directly (cross-user platform directory)
    try {
      const orgQueryRes = await safeDbCall(async () => {
        const clauses: string[] = [];
        if (criteria.orgId && isUuid(criteria.orgId) && criteria.orgId !== criteria.excludeOrgId) {
          clauses.push(`id.eq.${criteria.orgId}`);
        }
        if (cleanGstin && cleanGstin.length >= 15) {
          clauses.push(`gstin.ilike.${cleanGstin}`);
        }
        if (cleanPhone && cleanPhone.length >= 10) {
          clauses.push(`phone.ilike.%${cleanPhone.slice(-10)}%`);
        }
        if (cleanEmail && cleanEmail.includes("@")) {
          clauses.push(`email.ilike.${cleanEmail}`);
        }
        if (cleanName && cleanName.length >= 4) {
          const sanitizedName = cleanName.replace(/[,%()]/g, "");
          clauses.push(`name.ilike.%${sanitizedName}%`);
        }
        if (clauses.length === 0) return null;

        let query = supabase
          .from("organizations")
          .select("id, name, phone, email, gstin, address, business_type")
          .or(clauses.join(","));

        if (criteria.excludeOrgId && isUuid(criteria.excludeOrgId)) {
          query = query.neq("id", criteria.excludeOrgId);
        }

        return query.limit(1).maybeSingle();
      });

      if (orgQueryRes?.data) {
        const found = orgQueryRes.data as any;
        if (criteria.excludeOrgId && found.id === criteria.excludeOrgId) {
          return null;
        }
        return {
          id: found.id,
          name: found.name,
          phone: found.phone || undefined,
          email: found.email || undefined,
          gstin: found.gstin || undefined,
          address: found.address || undefined,
          businessType: found.business_type || undefined,
          isRegisteredOnPlatform: true,
        };
      }
    } catch (err) {
      console.warn("Cross-organization Supabase lookup notice:", err);
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────
  // 3. PARTY NAME AUTOCOMPLETE — NETWORK ORG SUGGESTIONS
  // ─────────────────────────────────────────────────────────────
  /**
   * Synchronously reads credsmart_registered_orgs_cache from localStorage
   * and returns orgs whose name / phone / gstin match `query`.
   * Returns at most `limit` results (default 15). Zero network calls.
   */
  getNetworkOrgSuggestions(
    query: string,
    limit = 15
  ): Array<{
    id: string;
    name: string;
    phone?: string;
    gstin?: string;
    address?: string;
    email?: string;
    isNetworkOrg: true;
    source: "network";
  }> {
    if (typeof window === "undefined") return [];
    const q = query.trim().toLowerCase();

    // Collect all cached orgs from every relevant localStorage key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allOrgs: any[] = [];
    try {
      const cachedRaw = localStorage.getItem("credsmart_registered_orgs_cache");
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed)) allOrgs.push(...parsed);
      }
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("credsmart_org_registry_")) {
          try {
            const orgs = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(orgs)) allOrgs.push(...orgs);
          } catch { /* ignore */ }
        }
      }
      const activeOrgRaw = localStorage.getItem("credsmart_active_org_data");
      if (activeOrgRaw) {
        try {
          const parsed = JSON.parse(activeOrgRaw);
          if (parsed?.id) allOrgs.push(parsed);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    // Deduplicate by org id
    const seenIds = new Set<string>();
    const unique = allOrgs.filter((o) => {
      if (!o?.id || seenIds.has(o.id)) return false;
      seenIds.add(o.id);
      return true;
    });

    // Filter by query (empty query = return all up to limit)
    const matched = q
      ? unique.filter((o) => {
          const name = (o.name || "").toLowerCase();
          const phone = (o.phone || "").replace(/\D/g, "");
          const gstin = (o.gstin || "").toLowerCase();
          return name.includes(q) || phone.includes(q) || gstin.includes(q);
        })
      : unique;

    return matched.slice(0, limit).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      phone: o.phone || undefined,
      gstin: o.gstin || undefined,
      address: o.address || undefined,
      email: o.email || undefined,
      isNetworkOrg: true as const,
      source: "network" as const,
    }));
  },

  // ─────────────────────────────────────────────────────────────
  // 4. SEND SALES INVOICE TO NETWORK (PERSON A -> PERSON B)
  // ─────────────────────────────────────────────────────────────
  async sendSalesInvoiceToNetwork(
    salesDoc: BusinessDocument,
    senderOrg: OrgData | null,
    userId?: string
  ): Promise<NetworkInvoice | null> {
    if (!senderOrg || !senderOrg.id) return null;

    this.registerConnectedOrg(senderOrg);

    // Detect if customer is connected or matches a registered platform organization
    const connectedRecipient = await this.findConnectedOrganization({
      phone: salesDoc.partyPhone,
      email: salesDoc.partyEmail,
      gstin: salesDoc.partyGstin,
      name: salesDoc.partyName,
      excludeOrgId: senderOrg.id,
    });

    const recipientOrgId = connectedRecipient?.id || undefined;
    const recipientOrgName = connectedRecipient?.name || salesDoc.partyName;

    const cleanPhone = normalizePhoneNumber(salesDoc.partyPhone || connectedRecipient?.phone);
    const cleanGstin = (salesDoc.partyGstin || connectedRecipient?.gstin || "").toUpperCase().trim();
    const cleanName = (salesDoc.partyName || "").trim().toLowerCase();

    const networkInvoiceId = generateSafeUuid();
    const nowIso = new Date().toISOString();

    const networkInvoice: NetworkInvoice = {
      id: networkInvoiceId,
      senderOrgId: senderOrg.id,
      senderOrgName: senderOrg.name || "Person A / Seller Store",
      senderOrgPhone: senderOrg.phone || undefined,
      senderOrgEmail: senderOrg.email || undefined,
      senderOrgGstin: senderOrg.gstin || undefined,
      senderOrgAddress: senderOrg.address || undefined,
      senderUserId: userId,
      senderUserName: senderOrg.name,

      recipientOrgId: recipientOrgId,
      recipientOrgName: recipientOrgName,
      recipientPhone: cleanPhone || normalizePhoneNumber(salesDoc.partyPhone) || undefined,
      recipientEmail: salesDoc.partyEmail || connectedRecipient?.email || undefined,
      recipientGstin: salesDoc.partyGstin || connectedRecipient?.gstin || undefined,
      recipientAddress: salesDoc.partyAddress || connectedRecipient?.address || undefined,

      invoiceNumber: salesDoc.documentNumber,
      docDate: salesDoc.docDate || nowIso.split("T")[0],
      dueDate: salesDoc.dueDate,
      paymentTerms: salesDoc.paymentTerms,
      paymentMethod: salesDoc.paymentMethod || "Credit",

      items: salesDoc.items,
      subtotal: salesDoc.subtotal,
      discountTotal: salesDoc.discountTotal,
      taxableTotal: salesDoc.taxableTotal,
      cgstTotal: salesDoc.cgstTotal,
      sgstTotal: salesDoc.sgstTotal,
      igstTotal: salesDoc.igstTotal,
      taxTotal: salesDoc.taxTotal,
      roundOff: salesDoc.roundOff || 0,
      grandTotal: salesDoc.grandTotal,
      notes: salesDoc.notes,
      terms: salesDoc.terms,

      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Save to Supabase network_invoices table (with safe timeout)
    await safeDbCall(async () => {
      const isSenderUuid = Boolean(senderOrg.id && isUuid(senderOrg.id));
      if (!isSenderUuid) return null;

      const isRecipientUuid = Boolean(recipientOrgId && isUuid(recipientOrgId) && recipientOrgId !== senderOrg.id);
      const invoicePayload = {
        id: networkInvoiceId,
        sender_org_id: senderOrg.id,
        sender_org_name: senderOrg.name,
        sender_org_phone: senderOrg.phone || "",
        sender_org_email: senderOrg.email || "",
        sender_org_gstin: senderOrg.gstin || "",
        sender_org_address: senderOrg.address || "",
        sender_user_id: isUuid(userId) ? userId : null,
        recipient_org_id: isRecipientUuid ? recipientOrgId : null,
        recipient_org_name: recipientOrgName,
        recipient_phone: cleanPhone || networkInvoice.recipientPhone || "",
        recipient_email: networkInvoice.recipientEmail || "",
        recipient_gstin: cleanGstin || networkInvoice.recipientGstin || "",
        recipient_address: networkInvoice.recipientAddress || "",
        invoice_number: salesDoc.documentNumber,
        doc_date: networkInvoice.docDate,
        due_date: networkInvoice.dueDate || null,
        payment_terms: networkInvoice.paymentTerms || "",
        payment_method: networkInvoice.paymentMethod || "Credit",
        items: networkInvoice.items,
        subtotal: networkInvoice.subtotal,
        discount_total: networkInvoice.discountTotal,
        tax_total: networkInvoice.taxTotal,
        grand_total: networkInvoice.grandTotal,
        notes: networkInvoice.notes || "",
        terms: networkInvoice.terms || "",
        status: "pending",
      };
      const res = await supabase.from("network_invoices" as any).insert(invoicePayload as any);
      // If recipient_org_id failed foreign key constraint on unverified org, retry with null recipient_org_id
      if (res?.error && isRecipientUuid) {
        return supabase.from("network_invoices" as any).insert({
          ...invoicePayload,
          recipient_org_id: null,
        } as any);
      }
      return res;
    });

    // 2. Save into Local Storage
    const existingInvoices = this.getLocalInvoices();
    existingInvoices.unshift(networkInvoice);
    this.saveLocalInvoices(existingInvoices);

    // 3. Create Notification for Person B (Recipient)
    const targetRecipientOrgId = recipientOrgId || `party_match_${cleanPhone || cleanGstin || cleanName}`;
    const notification: NetworkNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientOrgId: targetRecipientOrgId,
      recipientOrgName: recipientOrgName,
      recipientPhone: cleanPhone || normalizePhoneNumber(salesDoc.partyPhone) || undefined,
      recipientGstin: salesDoc.partyGstin || connectedRecipient?.gstin || undefined,
      type: "sale_invoice_received",
      category: "inward",
      title: `New Inward Bill from ${senderOrg.name}`,
      message: `${senderOrg.name} has sent you Inward Bill #${salesDoc.documentNumber} for ₹${salesDoc.grandTotal.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )}. Review items, taxes and click Approve to add directly into your Purchases.`,
      status: "unread",
      actionStatus: "pending",
      networkInvoiceId: networkInvoice.id,
      actionUrl: "/purchases?tab=purchase_invoice",
      actionLabel: "Review & Inward",
      data: {
        senderOrgId: senderOrg.id,
        senderOrgName: senderOrg.name,
        senderOrgGstin: senderOrg.gstin,
        senderOrgPhone: senderOrg.phone,
        recipientPartyName: salesDoc.partyName,
        recipientPhone: cleanPhone || normalizePhoneNumber(salesDoc.partyPhone) || undefined,
        recipientGstin: salesDoc.partyGstin,
        invoiceNumber: salesDoc.documentNumber,
        grandTotal: salesDoc.grandTotal,
        itemsCount: salesDoc.items.length,
        docDate: salesDoc.docDate,
      },
      created_at: nowIso,
    };

    await safeDbCall(async () => {
      const isRecipientUuid = Boolean(targetRecipientOrgId && isUuid(targetRecipientOrgId) && !targetRecipientOrgId.startsWith("party_match_"));
      const validRecipientOrgId = isRecipientUuid ? targetRecipientOrgId : null;
      const isInvoiceUuid = Boolean(notification.networkInvoiceId && isUuid(notification.networkInvoiceId));
      const notifPayload = {
        id: generateSafeUuid(),
        recipient_org_id: validRecipientOrgId,
        recipient_org_name: recipientOrgName || notification.recipientOrgName || null,
        recipient_phone: cleanPhone || (notification.recipientPhone ? normalizePhoneNumber(notification.recipientPhone) : null),
        recipient_gstin: cleanGstin || notification.recipientGstin || null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        action_status: notification.actionStatus,
        network_invoice_id: isInvoiceUuid ? notification.networkInvoiceId : null,
        data: notification.data,
        created_at: notification.created_at,
      };
      const res = await supabase.from("network_notifications" as any).insert(notifPayload as any);
      if (res?.error) {
        return supabase.from("network_notifications" as any).insert({
          ...notifPayload,
          recipient_org_id: null,
          network_invoice_id: null,
        } as any);
      }
      return res;
    });

    // NOTE: Inward recipient notification is persisted remotely in Supabase/PostgreSQL
    // with recipient_org_id = targetRecipientOrgId. We strictly do NOT save it to the
    // sender's local storage so the sender does not see an inward purchase notification on themselves.

    // 4. Trigger Broadcast and Custom DOM events for real-time reactivity across tabs and devices
    dispatchNetworkEvents("INVOICE_CREATED", { networkInvoice, notification });

    return networkInvoice;
  },

  mapDbRowToNetworkInvoice(row: any): NetworkInvoice {
    return {
      id: row.id,
      senderOrgId: row.sender_org_id,
      senderOrgName: row.sender_org_name,
      senderOrgPhone: row.sender_org_phone,
      senderOrgEmail: row.sender_org_email,
      senderOrgGstin: row.sender_org_gstin,
      senderOrgAddress: row.sender_org_address,
      senderUserId: row.sender_user_id,
      recipientOrgId: row.recipient_org_id,
      recipientOrgName: row.recipient_org_name,
      recipientPhone: row.recipient_phone,
      recipientEmail: row.recipient_email,
      recipientGstin: row.recipient_gstin,
      recipientAddress: row.recipient_address,
      invoiceNumber: row.invoice_number,
      docDate: row.doc_date,
      dueDate: row.due_date,
      paymentTerms: row.payment_terms,
      paymentMethod: row.payment_method,
      items: row.items || [],
      subtotal: Number(row.subtotal || 0),
      discountTotal: Number(row.discount_total || 0),
      taxableTotal: Number(row.subtotal || 0) - Number(row.discount_total || 0),
      cgstTotal: Number(row.tax_total || 0) / 2,
      sgstTotal: Number(row.tax_total || 0) / 2,
      igstTotal: 0,
      taxTotal: Number(row.tax_total || 0),
      grandTotal: Number(row.grand_total || 0),
      notes: row.notes,
      terms: row.terms,
      status: row.status as NetworkInvoiceStatus,
      purchaseInvoiceId: row.purchase_invoice_id,
      purchaseInvoiceNumber: row.purchase_invoice_number,
      rejectionReason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      approved_at: row.approved_at,
      rejected_at: row.rejected_at,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // 4. QUERY INVOICES FOR AN ORGANIZATION
  // ─────────────────────────────────────────────────────────────
  async getInvoicesForOrg(
    orgId: string,
    orgPhone?: string,
    orgGstin?: string,
    orgName?: string,
    userName?: string,
    userEmail?: string,
    userPhone?: string
  ): Promise<NetworkInvoice[]> {
    if (!orgId) return [];

    const localInvoices = this.getLocalInvoices();
    const cleanPhone = normalizePhoneNumber(orgPhone) || normalizePhoneNumber(userPhone);
    const cleanGstin = (orgGstin || "").toUpperCase().trim();

    // Filter local invoices: where org is recipient OR sender
    const matchedLocal = localInvoices.filter((inv) => {
      if (inv.senderOrgId === orgId) return true;
      return isInvoiceForOrg(inv, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
    });

    // Auto-heal matched local invoices that had placeholder recipientOrgId
    let needsLocalSave = false;
    matchedLocal.forEach((inv) => {
      if (inv.senderOrgId !== orgId && (!inv.recipientOrgId || inv.recipientOrgId !== orgId)) {
        inv.recipientOrgId = orgId;
        needsLocalSave = true;
      }
    });
    if (needsLocalSave) {
      this.saveLocalInvoices(localInvoices);
    }

    // Merge with Supabase network_invoices
    try {
      const orClauses: string[] = [];
      if (isUuid(orgId)) {
        orClauses.push(`recipient_org_id.eq.${orgId}`);
        orClauses.push(`sender_org_id.eq.${orgId}`);
      }
      if (cleanPhone && cleanPhone.length >= 10) {
        orClauses.push(`recipient_phone.eq.${cleanPhone}`);
        orClauses.push(`recipient_phone.ilike.%${cleanPhone.slice(-10)}%`);
      }
      if (cleanGstin && cleanGstin.length >= 15) {
        orClauses.push(`recipient_gstin.ilike.${cleanGstin}`);
      }
      if (orgName && orgName.trim().length >= 3) {
        const safeName = orgName.trim().replace(/[,%()]/g, "");
        orClauses.push(`recipient_org_name.ilike.%${safeName}%`);
      }

      if (orClauses.length > 0) {
        const dbRes = await safeDbCall(async () => {
          return supabase
            .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("*")
            .or(orClauses.join(","))
            .order("created_at", { ascending: false });
        });

        const dbInvoices = dbRes?.data;
        const error = dbRes?.error;

        if (!error && dbInvoices && Array.isArray(dbInvoices)) {
          for (const row of dbInvoices as any /* eslint-disable-line @typescript-eslint/no-explicit-any */[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const mapped = this.mapDbRowToNetworkInvoice(row);

            if (
              (mapped.senderOrgId === orgId || isInvoiceForOrg(mapped, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone)) &&
              !matchedLocal.some((i) => i.id === mapped.id || i.invoiceNumber === mapped.invoiceNumber)
            ) {
              matchedLocal.push(mapped);
              if (mapped.senderOrgId !== orgId && (!row.recipient_org_id || row.recipient_org_id !== orgId) && isUuid(orgId)) {
                safeDbCall(() =>
                  supabase
                    .from("network_invoices" as any)
                    .update({ recipient_org_id: orgId } as any)
                    .eq("id", row.id)
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase network_invoices fetch notice:", err);
    }

    return matchedLocal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getPendingInvoicesForOrg(
    orgId: string,
    orgPhone?: string,
    orgGstin?: string,
    orgName?: string,
    userName?: string,
    userEmail?: string,
    userPhone?: string
  ): Promise<NetworkInvoice[]> {
    const all = await this.getInvoicesForOrg(orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
    return all.filter((inv) => {
      // STRICT MULTI-TENANT ISOLATION:
      // The creator/sender organization can NEVER have their own outward sales invoice as a pending inward bill!
      if (inv.senderOrgId === orgId) return false;
      const isRecipient = isInvoiceForOrg(inv, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
      return isRecipient && inv.status === "pending";
    });
  },

  // ─────────────────────────────────────────────────────────────
  // 5. QUERY NOTIFICATIONS & REAL-TIME BUSINESS ALERTS FOR AN ORG
  // ─────────────────────────────────────────────────────────────
  getRealtimeBusinessAlerts(orgId: string): NetworkNotification[] {
    if (!orgId) return [];
    const alerts: NetworkNotification[] = [];
    const nowIso = new Date().toISOString();
    const todayTimestamp = new Date(new Date().toISOString().split("T")[0]).getTime();

    // 1. Check for Low Stock items
    try {
      const localProducts = getLocalCachedProducts(orgId);
      for (const p of localProducts) {
        const minAlert = Number(p.tags?.min_stock_alert ?? p.minStockAlert ?? p.minStock ?? 5);
        const currentStock = Number(p.stock ?? p.currentStock ?? 0);
        if (currentStock <= minAlert) {
          alerts.push({
            id: `alert_stock_${p.id}`,
            recipientOrgId: orgId,
            type: "low_stock_alert",
            category: "inventory",
            title: `Low Stock: ${p.name} (${currentStock} ${p.unit || "PCS"} left)`,
            message: `Current stock of ${p.name} is ${currentStock} ${p.unit || "PCS"}, which is at or below the safety alert threshold (${minAlert}). Reorder stock to maintain smooth checkout.`,
            status: "unread",
            actionStatus: "pending",
            actionUrl: "/items",
            actionLabel: "View Inventory",
            data: {
              productId: p.id,
              productName: p.name,
              currentStock,
              minStockAlert: minAlert,
            },
            created_at: nowIso,
          });
        }
      }
    } catch { /* empty */ }

    // 2. Check for Overdue Customer Sales Invoices in this Organization
    try {
      const salesDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");

      for (const doc of salesDocs) {
        if (doc.status !== "paid" && Number(doc.balanceDue || 0) > 0 && doc.dueDate) {
          const dueTime = new Date(doc.dueDate).getTime();
          if (dueTime < todayTimestamp) {
            const daysOverdue = Math.max(1, Math.round((todayTimestamp - dueTime) / (1000 * 60 * 60 * 24)));
            alerts.push({
              id: `alert_overdue_${doc.id}`,
              recipientOrgId: orgId,
              type: "payment_due_alert",
              category: "payments",
              title: `Payment Overdue: ${doc.partyName} (₹${Number(doc.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })})`,
              message: `Invoice #${doc.documentNumber} for ₹${Number(doc.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })} was due on ${doc.dueDate} (${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue). Send a WhatsApp reminder to expedite payment recovery.`,
              status: "unread",
              actionStatus: "pending",
              actionUrl: "/parties",
              actionLabel: "Collect Udhar",
              data: {
                partyName: doc.partyName,
                partyPhone: doc.partyPhone,
                invoiceNumber: doc.documentNumber,
                amountDue: doc.balanceDue,
                daysOverdue,
                docDate: doc.docDate,
              },
              created_at: nowIso,
            });
          }
        }
      }
    } catch { /* empty */ }

    // 3. Check for High-Value Invoices requiring E-Way bill compliance
    try {
      const salesDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      for (const doc of salesDocs) {
        if (Number(doc.grandTotal || 0) >= 50000 && !doc.ewayBillNo && !doc.transportDetails?.vehicleNumber) {
          alerts.push({
            id: `alert_eway_${doc.id}`,
            recipientOrgId: orgId,
            type: "compliance_alert",
            category: "compliance",
            title: `E-Way Bill Compliance: #${doc.documentNumber} (₹${Number(doc.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })})`,
            message: `Sales Invoice #${doc.documentNumber} is ₹${Number(doc.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (≥ ₹50,000 threshold). Government compliance mandates an E-Way Bill before movement of goods.`,
            status: "unread",
            actionStatus: "pending",
            actionUrl: "/e-invoicing",
            actionLabel: "Generate E-Way Bill",
            data: {
              invoiceNumber: doc.documentNumber,
              grandTotal: doc.grandTotal,
            },
            created_at: nowIso,
          });
        }
      }
    } catch { /* empty */ }

    return alerts;
  },

  async getNotificationsForOrg(
    orgId: string,
    orgPhone?: string,
    orgGstin?: string,
    orgName?: string,
    userName?: string,
    userEmail?: string,
    userPhone?: string
  ): Promise<NetworkNotification[]> {
    if (!orgId) return [];

    const rawLocalNotifs = this.getLocalNotifications();
    // Prune any legacy inward notifications where sender was this org
    const localNotifs = rawLocalNotifs.filter((n) => {
      const rawSenderOrgId =
        (typeof n.data?.senderOrgId === "string" ? n.data.senderOrgId : undefined) ||
        (typeof (n as any).senderOrgId === "string" ? (n as any).senderOrgId : undefined) ||
        (typeof n.data === "string" ? (() => { try { return JSON.parse(n.data)?.senderOrgId; } catch { return undefined; } })() : undefined);
      const isSender = typeof rawSenderOrgId === "string" && rawSenderOrgId === orgId;
      if (isSender && (n.category === "inward" || n.type?.startsWith("sale_invoice_"))) {
        return false;
      }
      return true;
    });
    if (localNotifs.length !== rawLocalNotifs.length) {
      this.saveLocalNotifications(localNotifs);
    }
    const cleanPhone = normalizePhoneNumber(orgPhone) || normalizePhoneNumber(userPhone);
    const cleanGstin = (orgGstin || "").toUpperCase().trim();

    // Match notifications for this org using robust isNotificationForOrg
    const matched = localNotifs.filter((n) => {
      return isNotificationForOrg(n, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
    });

    // Auto-heal matched local notifications
    let needsNotifSave = false;
    matched.forEach((n) => {
      if (n.recipientOrgId !== orgId && n.recipientOrgId?.startsWith("party_match_")) {
        n.recipientOrgId = orgId;
        needsNotifSave = true;
      }
    });
    if (needsNotifSave) {
      this.saveLocalNotifications(localNotifs);
    }

    try {
      // 1. Primary safe DB fetch by recipient_org_id (and recipient_user_id if available)
      const orClauses: string[] = [];
      if (isUuid(orgId)) {
        orClauses.push(`recipient_org_id.eq.${orgId}`);
      }
      if (cleanPhone && cleanPhone.length >= 10) {
        orClauses.push(`recipient_phone.eq.${cleanPhone}`);
        orClauses.push(`recipient_phone.ilike.%${cleanPhone.slice(-10)}%`);
      }
      if (cleanGstin && cleanGstin.length >= 15) {
        orClauses.push(`recipient_gstin.ilike.${cleanGstin}`);
      }
      if (orgName && orgName.trim().length >= 3) {
        const safeName = orgName.trim().replace(/[,%()]/g, "");
        orClauses.push(`recipient_org_name.ilike.%${safeName}%`);
      }

      if (orClauses.length > 0) {
        const dbRes = await safeDbCall(async () => {
          return supabase
            .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
            .select("*")
            .or(orClauses.join(","))
            .order("created_at", { ascending: false });
        });

        const dbNotifications = dbRes?.data;
        if (dbNotifications && Array.isArray(dbNotifications)) {
          for (const row of dbNotifications as any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
            if (!matched.some((notification) => notification.id === row.id)) {
              const mappedNotif: NetworkNotification = {
                id: row.id,
                recipientOrgId: row.recipient_org_id || orgId,
                recipientOrgName: row.recipient_org_name || orgName,
                recipientPhone: row.recipient_phone,
                recipientGstin: row.recipient_gstin,
                recipientUserId: row.recipient_user_id,
                type: row.type,
                category: row.type?.startsWith("sale_invoice_") ? "inward" : "system",
                title: row.title,
                message: row.message,
                status: row.status,
                actionStatus: row.action_status,
                networkInvoiceId: row.network_invoice_id,
                data: row.data || undefined,
                created_at: row.created_at,
              };
              if (isNotificationForOrg(mappedNotif, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone)) {
                matched.push(mappedNotif);
                // Auto-heal DB row recipient_org_id if it was null or placeholder
                if ((!row.recipient_org_id || row.recipient_org_id !== orgId) && isUuid(orgId)) {
                  safeDbCall(() =>
                    supabase
                      .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
                      .update({ recipient_org_id: orgId } as any)
                      .eq("id", row.id)
                  );
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase network_notifications fetch notice:", err);
    }

    // 2. Synthesize inward notifications for any inward network invoices matching this org
    try {
      const allInvoices = await this.getInvoicesForOrg(orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
      for (const inv of allInvoices) {
        if (inv.senderOrgId === orgId) continue; // NEVER synthesize inward notifications for sender!
        const isRecipient = isInvoiceForOrg(inv, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
        if (isRecipient && inv.senderOrgId !== orgId) {
          const alreadyHasNotif = matched.some(
            (n) => n.networkInvoiceId === inv.id || n.id === `notif_inv_${inv.id}`
          );
          if (!alreadyHasNotif) {
            const synthesizedNotif: NetworkNotification = {
              id: `notif_inv_${inv.id}`,
              recipientOrgId: orgId,
              recipientOrgName: inv.recipientOrgName || orgName,
              recipientPhone: inv.recipientPhone,
              recipientGstin: inv.recipientGstin,
              type: "sale_invoice_received",
              category: "inward",
              title: `New Inward Bill from ${inv.senderOrgName}`,
              message: `${inv.senderOrgName} has sent you Inward Bill #${inv.invoiceNumber} for ₹${Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Review items, taxes and click Approve to add directly into your Purchases.`,
              status: inv.status === "pending" ? "unread" : "read",
              actionStatus: inv.status,
              networkInvoiceId: inv.id,
              actionUrl: "/purchases?tab=purchase_invoice",
              actionLabel: "Review & Inward",
              data: {
                senderOrgId: inv.senderOrgId,
                senderOrgName: inv.senderOrgName,
                senderOrgGstin: inv.senderOrgGstin,
                senderOrgPhone: inv.senderOrgPhone,
                recipientPartyName: inv.recipientOrgName,
                recipientPhone: inv.recipientPhone,
                recipientGstin: inv.recipientGstin,
                invoiceNumber: inv.invoiceNumber,
                grandTotal: inv.grandTotal,
                itemsCount: inv.items?.length || 0,
                docDate: inv.docDate,
              },
              created_at: inv.created_at,
            };
            matched.push(synthesizedNotif);
          }
        }
      }
    } catch (synthErr) {
      console.warn("Notice synthesizing inward invoice notifications:", synthErr);
    }

    // 3. Merge dynamic real-time store alerts (Low stock, Payment dues, Compliance)
    const dynamicAlerts = this.getRealtimeBusinessAlerts(orgId);
    for (const da of dynamicAlerts) {
      if (!matched.some((n) => n.id === da.id)) {
        matched.push(da);
      }
    }

    return matched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // ─────────────────────────────────────────────────────────────
  // 6. APPROVE INVOICE (PERSON B APPROVES -> AUTO-ADD TO PURCHASES)
  // ─────────────────────────────────────────────────────────────
  async approveNetworkInvoice(
    networkInvoiceId: string,
    recipientOrg: OrgData,
    userId?: string
  ): Promise<{ success: boolean; purchaseDoc?: BusinessDocument; error?: string }> {
    try {
      // 1. Fetch the network invoice
      const allInvoices = this.getLocalInvoices();
      let invoiceIndex = allInvoices.findIndex((inv) => inv.id === networkInvoiceId || inv.invoiceNumber === networkInvoiceId);

      if (invoiceIndex === -1) {
        const remoteInvoices = await this.getInvoicesForOrg(
          recipientOrg.id,
          recipientOrg.phone,
          recipientOrg.gstin,
          recipientOrg.name
        );
        const remoteInvoice = remoteInvoices.find((inv) => inv.id === networkInvoiceId || inv.invoiceNumber === networkInvoiceId);
        if (remoteInvoice) {
          allInvoices.push(remoteInvoice);
          invoiceIndex = allInvoices.length - 1;
        }
      }

      // Direct DB lookup fallback
      if (invoiceIndex === -1) {
        const directRes = await safeDbCall(async () => {
          const query = supabase.from("network_invoices" as any).select("*");
          if (isUuid(networkInvoiceId)) {
            return query.or(`id.eq.${networkInvoiceId},invoice_number.eq.${networkInvoiceId}`).maybeSingle();
          }
          return query.eq("invoice_number", networkInvoiceId).maybeSingle();
        });

        if (directRes?.data) {
          const directMapped = this.mapDbRowToNetworkInvoice(directRes.data);
          allInvoices.push(directMapped);
          invoiceIndex = allInvoices.length - 1;
          this.saveLocalInvoices(allInvoices);
        }
      }

      if (invoiceIndex === -1) {
        return { success: false, error: "Network invoice record not found" };
      }

      const inv = allInvoices[invoiceIndex];
      if (inv.status === "approved") {
        return { success: false, error: "This invoice has already been approved." };
      }

      // 2. Resolve or Create Person A as a Supplier in Person B's Organization
      let supplierId = "";
      try {
        const suppResult = await safeDbCall(async () => {
          const { data: existingSuppliers } = await partiesApi.getSuppliers(recipientOrg.id);

          const matchedSupplier = (existingSuppliers || []).find((s) => {
            if (inv.senderOrgGstin && s.gstin && s.gstin.trim().toUpperCase() === inv.senderOrgGstin.trim().toUpperCase()) return true;
            if (inv.senderOrgPhone && s.phone && normalizePhoneNumber(s.phone) === normalizePhoneNumber(inv.senderOrgPhone)) return true;
            if (s.name && s.name.trim().toLowerCase() === inv.senderOrgName.trim().toLowerCase()) return true;
            return false;
          });

          if (matchedSupplier?.id) {
            return matchedSupplier.id;
          }

          // Auto-insert Person A as a new Supplier in Person B's store
          const { data: newSupp } = await partiesApi.createSupplier(
            {
              organization_id: recipientOrg.id,
              name: inv.senderOrgName,
              phone: inv.senderOrgPhone || "",
              email: inv.senderOrgEmail || "",
              gstin: inv.senderOrgGstin || "",
              address: inv.senderOrgAddress || "",
            },
            recipientOrg.id
          );

          return newSupp?.id || null;
        }, 600);

        if (suppResult) {
          supplierId = suppResult;
        }
      } catch (suppErr) {
        console.warn("Supplier resolution notice:", suppErr);
      }

      // If supplierId couldn't be generated in Supabase (e.g. offline mode), generate local id
      if (!supplierId) {
        supplierId = `supp_auto_${Date.now()}`;
      }

      // 3. Generate Purchase Document Number for Person B
      const existingPurchases = await documentsService.fetchPurchaseDocuments(recipientOrg.id, "purchase_invoice");
      const currentYear = new Date().getFullYear();
      const nextSeq = String(existingPurchases.length + 1).padStart(3, "0");
      const purchaseDocNumber = `PI-${currentYear}-${nextSeq}`;

      // 4. Resolve or Auto-Create each Line Item in Person B (Buyer)'s Store
      const mappedPurchaseItems: DocumentLineItem[] = [];

      const { data: initialRecipientProducts } = await productsApi.getProducts(recipientOrg.id);
      const recipientProducts = initialRecipientProducts ? [...initialRecipientProducts] : [];

      for (let idx = 0; idx < inv.items.length; idx++) {
        const it = inv.items[idx];
        let resolvedProductId: string | null = null;

        try {
          const cleanBarcode = (it.barcode || "").trim();
          const cleanName = (it.productName || "").trim();

          // 1. Try matching by barcode in recipient's store
          if (cleanBarcode) {
            const barcodeMatch = recipientProducts.find(
              (p) => p.barcode === cleanBarcode
            );
            if (barcodeMatch?.id) {
              resolvedProductId = barcodeMatch.id;
            }
          }

          // 2. Try matching by product name (case-insensitive) in recipient's store
          if (!resolvedProductId && cleanName) {
            const nameMatch = recipientProducts.find(
              (p) => (p.name || "").trim().toLowerCase() === cleanName.toLowerCase()
            );
            if (nameMatch?.id) {
              resolvedProductId = nameMatch.id;
            }
          }

          // 3. Fallback check in local cached products for recipient org
          if (!resolvedProductId) {
            const localCached = getLocalCachedProducts(recipientOrg.id);
            if (cleanBarcode) {
              const f = localCached.find((p) => p.barcode === cleanBarcode);
              if (f?.id) resolvedProductId = f.id;
            }
            if (!resolvedProductId && cleanName) {
              const f = localCached.find(
                (p) => (p.name || "").trim().toLowerCase() === cleanName.toLowerCase()
              );
              if (f?.id) resolvedProductId = f.id;
            }
          }

          // 4. If product does NOT exist in recipient's inventory, AUTO-CREATE IT!
          if (!resolvedProductId && cleanName) {
            const generatedSku = `SKU-${Date.now().toString(36).toUpperCase()}-${idx + 1}`;
            const sp = Number(it.rate || 0);
            const pp = Number(it.rate || 0);
            const tagsPayload = {
              unit: (it.unit || "PCS").toUpperCase(),
              alt_unit: it.altUnit,
              alt_unit_conversion: it.altUnitConversion,
              gst_rate: it.taxRate || 0,
              hsn_code: it.hsn || "",
              selling_price: sp,
              purchase_price: pp,
              mrp: sp,
              stock: 0, // Opening stock is 0; will be incremented by documentsService / stockService
              min_stock_alert: 5,
            };

            const createRes = await safeDbCall(() =>
              productsApi.createProduct({
                name: cleanName,
                barcode: cleanBarcode || null,
                category: "General",
                sku: generatedSku,
                tags: tagsPayload,
              }, recipientOrg.id)
            );

            if (createRes?.data?.id) {
              resolvedProductId = createRes.data.id;
              recipientProducts.push(createRes.data);
            } else {
              // Local fallback UUID for offline / demo mode
              resolvedProductId = generateSafeUuid();
            }

            // Also register in local cache
            addOrUpdateLocalCachedProduct(recipientOrg.id, {
              id: resolvedProductId,
              name: cleanName,
              barcode: cleanBarcode || null,
              sku: generatedSku,
              category: "General",
              unit: (it.unit || "PCS").toUpperCase(),
              altUnit: it.altUnit,
              altUnitConversion: it.altUnitConversion,
              sellingPrice: sp,
              purchasePrice: pp,
              mrp: sp,
              currentStock: 0,
              stock: 0,
              tags: tagsPayload,
            });
          }
        } catch (itemErr) {
          console.warn("Notice resolving/auto-creating item for recipient org:", itemErr);
        }

        if (!resolvedProductId) {
          resolvedProductId = generateSafeUuid();
        }

        mappedPurchaseItems.push({
          id: `pi-item-${Date.now()}-${idx}`,
          productId: resolvedProductId,
          productName: it.productName,
          barcode: it.barcode,
          hsn: it.hsn,
          batchNumber: it.batchNumber || "BATCH-01",
          expiryDate: it.expiryDate,
          quantity: it.quantity,
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altQty: it.altQty,
          altUnitConversion: it.altUnitConversion,
          rate: it.rate, // Seller's selling price becomes Buyer's purchase cost price
          discountPercent: it.discountPercent || 0,
          discountAmount: it.discountAmount || 0,
          taxRate: it.taxRate || 0,
          taxableAmount: it.taxableAmount || (it.rate * it.quantity),
          cgstAmount: it.cgstAmount || 0,
          sgstAmount: it.sgstAmount || 0,
          igstAmount: it.igstAmount || 0,
          lineTotal: it.lineTotal || (it.rate * it.quantity),
        });
      }

      // 5. Build the Purchase Invoice BusinessDocument
      const nowIso = new Date().toISOString();
      const isCredit = (inv.paymentMethod || "").toLowerCase() === "credit";
      const purchaseDoc: Omit<BusinessDocument, "id"> = {
        organizationId: recipientOrg.id,
        docType: "purchase_invoice",
        documentNumber: purchaseDocNumber,
        referenceNumber: inv.invoiceNumber, // Reference seller's sales invoice #
        partyId: supplierId,
        partyName: inv.senderOrgName,
        partyPhone: inv.senderOrgPhone,
        partyEmail: inv.senderOrgEmail,
        partyGstin: inv.senderOrgGstin,
        partyAddress: inv.senderOrgAddress,
        placeOfSupply: inv.senderOrgAddress ? "27-Maharashtra" : undefined,
        docDate: inv.docDate || nowIso.split("T")[0],
        dueDate: inv.dueDate || inv.docDate || nowIso.split("T")[0],
        paymentTerms: inv.paymentTerms || "Due on Receipt",
        paymentMethod: inv.paymentMethod || "Credit",
        items: mappedPurchaseItems,
        subtotal: inv.subtotal,
        discountTotal: inv.discountTotal,
        taxableTotal: inv.taxableTotal,
        cgstTotal: inv.cgstTotal,
        sgstTotal: inv.sgstTotal,
        igstTotal: inv.igstTotal,
        taxTotal: inv.taxTotal,
        roundOff: inv.roundOff || 0,
        grandTotal: inv.grandTotal,
        paidAmount: isCredit ? 0 : inv.grandTotal,
        balanceDue: isCredit ? inv.grandTotal : 0,
        status: isCredit ? "unpaid" : "paid",
        notes: `Auto-imported from Sales Invoice #${inv.invoiceNumber} created by ${inv.senderOrgName}`,
        terms: inv.terms,
        created_at: nowIso,
      };

      // 6. Save the Purchase Invoice into Person B's store
      const savedPurchaseDoc = await documentsService.saveDocument(purchaseDoc, userId);

      // Trigger stock update notification for recipient organization
      notifyStockUpdated(recipientOrg.id);

      // 7. Update Network Invoice Status to 'approved'
      inv.status = "approved";
      inv.purchaseInvoiceId = savedPurchaseDoc.id;
      inv.purchaseInvoiceNumber = savedPurchaseDoc.documentNumber;
      inv.approved_at = nowIso;
      inv.updated_at = nowIso;
      allInvoices[invoiceIndex] = inv;
      this.saveLocalInvoices(allInvoices);

      // Update in Supabase network_invoices table
      await safeDbCall(() => {
        const targetId = isUuid(networkInvoiceId) ? networkInvoiceId : isUuid(inv.id) ? inv.id : null;
        let query = supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({
            status: "approved",
            purchase_invoice_id: savedPurchaseDoc.id,
            purchase_invoice_number: savedPurchaseDoc.documentNumber,
            approved_at: nowIso,
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);
        if (targetId) {
          return query.eq("id", targetId);
        }
        return query.eq("invoice_number", inv.invoiceNumber);
      });

      // 8. Update Recipient Notification actionStatus to 'approved'
      const allNotifs = this.getLocalNotifications();
      const updatedNotifs = allNotifs.map((n) => {
        if (n.networkInvoiceId === networkInvoiceId || n.networkInvoiceId === inv.id) {
          return {
            ...n,
            status: "read" as const,
            actionStatus: "approved" as const,
            message: `Approved: Sales Invoice #${inv.invoiceNumber} recorded as Purchase Bill #${savedPurchaseDoc.documentNumber}.`,
          };
        }
        return n;
      });

      await safeDbCall(() => {
        const targetNotifInvId = isUuid(networkInvoiceId) ? networkInvoiceId : isUuid(inv.id) ? inv.id : null;
        if (targetNotifInvId) {
          return supabase
            .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
            .update({ status: "read", action_status: "approved" })
            .eq("network_invoice_id", targetNotifInvId);
        }
        return supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({ status: "read", action_status: "approved" })
          .eq("data->>invoiceNumber", inv.invoiceNumber);
      });

      // 9. Add Confirmation Notification for Person A (Sender)
      const senderConfirmationNotif: NetworkNotification = {
        id: `notif_conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientOrgId: inv.senderOrgId,
        type: "sale_invoice_approved",
        category: "inward",
        title: `${recipientOrg.name} Approved Invoice #${inv.invoiceNumber}`,
        message: `${recipientOrg.name} has approved your Sales Invoice #${inv.invoiceNumber} (₹${inv.grandTotal.toLocaleString(
          "en-IN"
        )}) and added it to their Purchases as #${savedPurchaseDoc.documentNumber}.`,
        status: "unread",
        actionStatus: "approved",
        networkInvoiceId: inv.id,
        actionUrl: "/sales?tab=sales_invoice",
        actionLabel: "View Sales",
        data: {
          senderOrgId: recipientOrg.id,
          senderOrgName: recipientOrg.name,
          invoiceNumber: inv.invoiceNumber,
          purchaseInvoiceNumber: savedPurchaseDoc.documentNumber,
          grandTotal: inv.grandTotal,
        },
        created_at: nowIso,
      };
      updatedNotifs.unshift(senderConfirmationNotif);
      this.saveLocalNotifications(updatedNotifs);
      await safeDbCall(() =>
        supabase.from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).insert({
          id: generateSafeUuid(),
          recipient_org_id: isUuid(inv.senderOrgId) ? inv.senderOrgId : null,
          recipient_org_name: inv.senderOrgName || null,
          recipient_phone: normalizePhoneNumber(inv.senderOrgPhone) || null,
          recipient_gstin: inv.senderOrgGstin || null,
          type: senderConfirmationNotif.type,
          title: senderConfirmationNotif.title,
          message: senderConfirmationNotif.message,
          status: senderConfirmationNotif.status,
          action_status: senderConfirmationNotif.actionStatus,
          network_invoice_id: isUuid(inv.id) ? inv.id : null,
          data: senderConfirmationNotif.data,
          created_at: nowIso,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
      );

      // 10. Broadcast events across tabs & windows
      dispatchNetworkEvents("INVOICE_APPROVED", {
        networkInvoice: inv,
        purchaseDoc: savedPurchaseDoc,
        recipientOrgId: recipientOrg.id,
      });

      return { success: true, purchaseDoc: savedPurchaseDoc };
    } catch (error) {
      console.error("Error approving network invoice:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to approve invoice",
      };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // 7. REJECT INVOICE (PERSON B REJECTS)
  // ─────────────────────────────────────────────────────────────
  async rejectNetworkInvoice(
    networkInvoiceId: string,
    recipientOrg: OrgData,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const allInvoices = this.getLocalInvoices();
      let invoiceIndex = allInvoices.findIndex((inv) => inv.id === networkInvoiceId || inv.invoiceNumber === networkInvoiceId);

      if (invoiceIndex === -1) {
        const remoteInvoices = await this.getInvoicesForOrg(
          recipientOrg.id,
          recipientOrg.phone,
          recipientOrg.gstin,
          recipientOrg.name
        );
        const remoteInvoice = remoteInvoices.find((inv) => inv.id === networkInvoiceId || inv.invoiceNumber === networkInvoiceId);
        if (remoteInvoice) {
          allInvoices.push(remoteInvoice);
          invoiceIndex = allInvoices.length - 1;
        }
      }

      // Direct DB lookup fallback
      if (invoiceIndex === -1) {
        const directRes = await safeDbCall(async () => {
          const query = supabase.from("network_invoices" as any).select("*");
          if (isUuid(networkInvoiceId)) {
            return query.or(`id.eq.${networkInvoiceId},invoice_number.eq.${networkInvoiceId}`).maybeSingle();
          }
          return query.eq("invoice_number", networkInvoiceId).maybeSingle();
        });

        if (directRes?.data) {
          const directMapped = this.mapDbRowToNetworkInvoice(directRes.data);
          allInvoices.push(directMapped);
          invoiceIndex = allInvoices.length - 1;
          this.saveLocalInvoices(allInvoices);
        }
      }

      if (invoiceIndex === -1) {
        return { success: false, error: "Network invoice record not found" };
      }

      const inv = allInvoices[invoiceIndex];
      const nowIso = new Date().toISOString();

      inv.status = "rejected";
      inv.rejectionReason = reason || "Rejected by buyer";
      inv.rejected_at = nowIso;
      inv.updated_at = nowIso;
      allInvoices[invoiceIndex] = inv;
      this.saveLocalInvoices(allInvoices);

      // Update in Supabase
      await safeDbCall(() => {
        const targetId = isUuid(networkInvoiceId) ? networkInvoiceId : isUuid(inv.id) ? inv.id : null;
        let query = supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({
            status: "rejected",
            rejection_reason: inv.rejectionReason,
            rejected_at: nowIso,
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);
        if (targetId) {
          return query.eq("id", targetId);
        }
        return query.eq("invoice_number", inv.invoiceNumber);
      }, 600);

      // Update recipient notifications
      const allNotifs = this.getLocalNotifications();
      const updatedNotifs = allNotifs.map((n) => {
        if (n.networkInvoiceId === networkInvoiceId || n.networkInvoiceId === inv.id) {
          return {
            ...n,
            status: "read" as const,
            actionStatus: "rejected" as const,
            message: `Rejected: Sales Invoice #${inv.invoiceNumber} was rejected.`,
          };
        }
        return n;
      });

      await safeDbCall(() => {
        const targetNotifInvId = isUuid(networkInvoiceId) ? networkInvoiceId : isUuid(inv.id) ? inv.id : null;
        if (targetNotifInvId) {
          return supabase
            .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
            .update({ status: "read", action_status: "rejected" })
            .eq("network_invoice_id", targetNotifInvId);
        }
        return supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({ status: "read", action_status: "rejected" })
          .eq("data->>invoiceNumber", inv.invoiceNumber);
      });

      // Notify Person A (Sender) about the rejection
      const senderRejectNotif: NetworkNotification = {
        id: `notif_rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientOrgId: inv.senderOrgId,
        type: "sale_invoice_rejected",
        category: "inward",
        title: `${recipientOrg.name} Rejected Invoice #${inv.invoiceNumber}`,
        message: `${recipientOrg.name} has rejected your Sales Invoice #${inv.invoiceNumber} (₹${inv.grandTotal.toLocaleString(
          "en-IN"
        )})${reason ? `: "${reason}"` : "."}`,
        status: "unread",
        actionStatus: "rejected",
        networkInvoiceId: inv.id,
        actionUrl: "/sales?tab=sales_invoice",
        actionLabel: "View Sales",
        data: {
          senderOrgId: recipientOrg.id,
          senderOrgName: recipientOrg.name,
          invoiceNumber: inv.invoiceNumber,
          rejectionReason: reason,
        },
        created_at: nowIso,
      };
      updatedNotifs.unshift(senderRejectNotif);
      this.saveLocalNotifications(updatedNotifs);
      await safeDbCall(() =>
        supabase.from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).insert({
          id: generateSafeUuid(),
          recipient_org_id: isUuid(inv.senderOrgId) ? inv.senderOrgId : null,
          recipient_org_name: inv.senderOrgName || null,
          recipient_phone: normalizePhoneNumber(inv.senderOrgPhone) || null,
          recipient_gstin: inv.senderOrgGstin || null,
          type: senderRejectNotif.type,
          title: senderRejectNotif.title,
          message: senderRejectNotif.message,
          status: senderRejectNotif.status,
          action_status: senderRejectNotif.actionStatus,
          network_invoice_id: isUuid(inv.id) ? inv.id : null,
          data: senderRejectNotif.data,
          created_at: nowIso,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
      );

      // Broadcast events
      dispatchNetworkEvents("INVOICE_REJECTED", {
        networkInvoice: inv,
        recipientOrgId: recipientOrg.id,
      });

      return { success: true };
    } catch (error) {
      console.error("Error rejecting network invoice:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reject invoice",
      };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // 7b. CANCEL INVOICE (SENDER CANCELS/DELETES SALES INVOICE)
  // ─────────────────────────────────────────────────────────────
  async cancelNetworkInvoice(
    invoiceNumber: string,
    senderOrgId: string
  ): Promise<boolean> {
    if (!invoiceNumber || !senderOrgId) return false;

    try {
      const nowIso = new Date().toISOString();
      const allInvoices = this.getLocalInvoices();
      let updated = false;

      for (const inv of allInvoices) {
        if (
          inv.senderOrgId === senderOrgId &&
          (inv.invoiceNumber === invoiceNumber || inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())
        ) {
          inv.status = "cancelled";
          inv.updated_at = nowIso;
          updated = true;
        }
      }
      if (updated) {
        this.saveLocalInvoices(allInvoices);
      }

      // Update local notifications
      const allNotifs = this.getLocalNotifications();
      const updatedNotifs = allNotifs.map((notif) => {
        if (
          notif.data?.senderOrgId === senderOrgId &&
          (notif.data?.invoiceNumber === invoiceNumber ||
            (typeof notif.data?.invoiceNumber === "string" &&
              notif.data.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()))
        ) {
          return {
            ...notif,
            category: "inward" as const,
            actionStatus: "cancelled" as const,
            message: `Cancelled: Sales Invoice #${invoiceNumber} was cancelled or deleted by sender.`,
          };
        }
        return notif;
      });
      this.saveLocalNotifications(updatedNotifs);

      // Update Supabase network_invoices table
      await safeDbCall(() => {
        let query = supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({
            status: "cancelled",
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .eq("invoice_number", invoiceNumber);

        if (isUuid(senderOrgId)) {
          query = query.eq("sender_org_id", senderOrgId);
        }
        return query;
      });

      // Update Supabase network_notifications table
      await safeDbCall(() => {
        return supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update({
            action_status: "cancelled",
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq("data->>invoiceNumber", invoiceNumber);
      });

      dispatchNetworkEvents("INVOICE_CANCELLED", { invoiceNumber, senderOrgId });
      return true;
    } catch (e) {
      console.warn("Notice cancelling network invoice:", e);
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // 8. NOTIFICATION READ & CLEAR HELPERS
  // ─────────────────────────────────────────────────────────────
  markNotificationAsRead(notificationId: string) {
    const notifs = this.getLocalNotifications();
    const updated = notifs.map((n) => (n.id === notificationId ? { ...n, status: "read" as const } : n));
    this.saveLocalNotifications(updated);
    dispatchNetworkEvents("NOTIFICATIONS_UPDATED");
  },

  markAllNotificationsAsRead(orgId: string) {
    const notifs = this.getLocalNotifications();
    const updated = notifs.map((n) => (n.recipientOrgId === orgId ? { ...n, status: "read" as const } : n));
    this.saveLocalNotifications(updated);
    dispatchNetworkEvents("NOTIFICATIONS_UPDATED");
  },

  // ─────────────────────────────────────────────────────────────
  // 9. SIMULATE PARTNER INVOICE (INSTANT 1-CLICK DEMO TEST)
  // ─────────────────────────────────────────────────────────────
  async simulatePartnerInvoice(recipientOrg: OrgData): Promise<NetworkInvoice> {
    const currentYear = new Date().getFullYear();
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const invoiceNumber = `INV-${currentYear}-${randomSeq}`;
    const nowIso = new Date().toISOString();

    const sampleItems: DocumentLineItem[] = [
      {
        id: "sim-item-1",
        productName: "Basmati Rice 5kg Premium Pack",
        hsn: "1006",
        batchNumber: "BATCH-BR-01",
        quantity: 10,
        unit: "PCS",
        rate: 450,
        discountPercent: 5,
        discountAmount: 225,
        taxRate: 5,
        taxableAmount: 4275,
        cgstAmount: 106.88,
        sgstAmount: 106.88,
        igstAmount: 0,
        lineTotal: 4488.75,
      },
      {
        id: "sim-item-2",
        productName: "Refined Sunflower Oil 1L Pouch",
        hsn: "1512",
        batchNumber: "BATCH-SO-88",
        quantity: 24,
        unit: "PCS",
        rate: 135,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 5,
        taxableAmount: 3240,
        cgstAmount: 81,
        sgstAmount: 81,
        igstAmount: 0,
        lineTotal: 3402,
      },
    ];

    const subtotal = 7740;
    const discountTotal = 225;
    const taxableTotal = 7515;
    const cgstTotal = 187.88;
    const sgstTotal = 187.88;
    const taxTotal = 375.75;
    const grandTotal = 7890.75;

    const mockSenderOrg: OrgData = {
      id: "org_person_a_wholesale",
      name: "Person A (Apex Wholesale Trade Ltd)",
      phone: "9820011223",
      email: "billing@apexwholesale.in",
      gstin: "27AAACA1234A1Z5",
      address: "Plot 45, APMC Wholesale Market, Vashi, Navi Mumbai, MH",
      invoice_prefix: "INV",
      logo_url: "",
      tax_rate: 18,
      business_type: "Wholesaler / Distributor",
    };

    const simInvoice: NetworkInvoice = {
      id: `net_sim_${Date.now()}`,
      senderOrgId: mockSenderOrg.id,
      senderOrgName: mockSenderOrg.name,
      senderOrgPhone: mockSenderOrg.phone,
      senderOrgEmail: mockSenderOrg.email,
      senderOrgGstin: mockSenderOrg.gstin,
      senderOrgAddress: mockSenderOrg.address,
      senderUserName: "Person A",

      recipientOrgId: recipientOrg.id,
      recipientOrgName: recipientOrg.name,
      recipientPhone: recipientOrg.phone,
      recipientEmail: recipientOrg.email,
      recipientGstin: recipientOrg.gstin,
      recipientAddress: recipientOrg.address,

      invoiceNumber,
      docDate: nowIso.split("T")[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      paymentTerms: "Net 15",
      paymentMethod: "Credit",

      items: sampleItems,
      subtotal,
      discountTotal,
      taxableTotal,
      cgstTotal,
      sgstTotal,
      igstTotal: 0,
      taxTotal,
      roundOff: 0.25,
      grandTotal: 7891,
      notes: "Goods delivered in good condition. Standard trade terms apply.",
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Save invoice in local storage
    const invoices = this.getLocalInvoices();
    invoices.unshift(simInvoice);
    this.saveLocalInvoices(invoices);

    // Create notification for Person B
    const simNotif: NetworkNotification = {
      id: `notif_sim_${Date.now()}`,
      recipientOrgId: recipientOrg.id,
      type: "sale_invoice_received",
      category: "inward",
      title: `Sale was Created by ${mockSenderOrg.name} on your name`,
      message: `${mockSenderOrg.name} created Sales Invoice #${invoiceNumber} for ₹${simInvoice.grandTotal.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} on your name. Review items, taxes and click Approve to add directly into your Purchases.`,
      status: "unread",
      actionStatus: "pending",
      networkInvoiceId: simInvoice.id,
      actionUrl: "/purchases?tab=purchase_invoice",
      actionLabel: "Review & Inward",
      data: {
        senderOrgId: mockSenderOrg.id,
        senderOrgName: mockSenderOrg.name,
        senderOrgGstin: mockSenderOrg.gstin,
        senderOrgPhone: mockSenderOrg.phone,
        invoiceNumber,
        grandTotal: simInvoice.grandTotal,
        itemsCount: sampleItems.length,
        docDate: simInvoice.docDate,
      },
      created_at: nowIso,
    };

    const notifs = this.getLocalNotifications();
    notifs.unshift(simNotif);
    this.saveLocalNotifications(notifs);

    // Broadcast event
    dispatchNetworkEvents("INVOICE_CREATED", { networkInvoice: simInvoice, notification: simNotif });

    return simInvoice;
  },

  // ─────────────────────────────────────────────────────────────
  // 10. RECIPIENT MATCHING & REAL-TIME INGESTION
  // ─────────────────────────────────────────────────────────────
  isInvoiceForOrg(
    inv: NetworkInvoice,
    orgId: string,
    orgPhone?: string,
    orgGstin?: string,
    orgName?: string,
    userName?: string,
    userEmail?: string,
    userPhone?: string
  ): boolean {
    return isInvoiceForOrg(inv, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
  },

  isNotificationForOrg(
    n: NetworkNotification,
    orgId: string,
    orgPhone?: string,
    orgGstin?: string,
    orgName?: string,
    userName?: string,
    userEmail?: string,
    userPhone?: string
  ): boolean {
    return isNotificationForOrg(n, orgId, orgPhone, orgGstin, orgName, userName, userEmail, userPhone);
  },

  ingestIncomingNetworkInvoice(
    networkInvoice: NetworkInvoice,
    notification?: NetworkNotification,
    orgId?: string
  ) {
    if (!networkInvoice) return;

    // 1. Update or insert in local network invoices
    const localInvoices = this.getLocalInvoices();
    const existingIndex = localInvoices.findIndex(
      (inv) => inv.id === networkInvoice.id || inv.invoiceNumber === networkInvoice.invoiceNumber
    );

    const mergedInvoice: NetworkInvoice = {
      ...networkInvoice,
      recipientOrgId: orgId || networkInvoice.recipientOrgId,
    };

    if (existingIndex >= 0) {
      localInvoices[existingIndex] = {
        ...localInvoices[existingIndex],
        ...mergedInvoice,
        updated_at: new Date().toISOString(),
      };
    } else {
      localInvoices.unshift(mergedInvoice);
    }
    this.saveLocalInvoices(localInvoices);

    // 2. Update or insert notification if provided
    if (notification) {
      const localNotifs = this.getLocalNotifications();
      const notifIndex = localNotifs.findIndex(
        (n) => n.id === notification.id || (n.networkInvoiceId && n.networkInvoiceId === networkInvoice.id)
      );
      const mergedNotif: NetworkNotification = {
        ...notification,
        recipientOrgId: orgId || notification.recipientOrgId,
      };

      if (notifIndex >= 0) {
        localNotifs[notifIndex] = { ...localNotifs[notifIndex], ...mergedNotif };
      } else {
        localNotifs.unshift(mergedNotif);
      }
      this.saveLocalNotifications(localNotifs);
    }

    // 3. Dispatch internal DOM events to immediately refresh UI components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("credsmart_network_update", { detail: { type: "INVOICE_INGESTED", payload: mergedInvoice } })
      );
      window.dispatchEvent(
        new CustomEvent("credsmart_notification_update", { detail: { type: "INVOICE_INGESTED", payload: mergedInvoice } })
      );
    }
  },
};
