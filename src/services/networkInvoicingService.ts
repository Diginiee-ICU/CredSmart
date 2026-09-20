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

const STORAGE_INVOICES_KEY = "credsmart_network_invoices_v1";
const STORAGE_NOTIFICATIONS_KEY = "credsmart_network_notifications_v1";

// BroadcastChannel for instant multi-tab sync
let networkChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    networkChannel = new BroadcastChannel("credsmart_network_channel");
  }
} catch {
  // Ignore environments without BroadcastChannel
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
}

// Clean phone digits for comparison (e.g. +91 98765 43210 -> 9876543210)
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Fast timeout wrapper to prevent hanging on network/offline Supabase calls
async function safeDbCall<T>(promiseOrFn: Promise<T> | (() => Promise<T>), timeoutMs = 800): Promise<T | null> {
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

    // 2. Query Supabase organizations table (with fast timeout safe call)
    try {
      const dbResult = await safeDbCall(async () => {
        const query = supabase.from("organizations").select("*");
        if (criteria.orgId) {
          const { data } = await query.eq("id", criteria.orgId).maybeSingle();
          if (data) return data;
        }
        if (cleanGstin) {
          const { data } = await supabase.from("organizations").select("*").ilike("gstin", cleanGstin).maybeSingle();
          if (data) return data;
        }
        if (cleanPhone) {
          const { data } = await supabase.from("organizations").select("*").ilike("phone", `%${cleanPhone}%`).maybeSingle();
          if (data) return data;
        }
        if (cleanEmail) {
          const { data } = await supabase.from("organizations").select("*").ilike("email", cleanEmail).maybeSingle();
          if (data) return data;
        }
        if (cleanName && cleanName.length >= 3) {
          const { data } = await supabase.from("organizations").select("*").ilike("name", cleanName).maybeSingle();
          if (data) return data;
        }
        return null;
      }, 700);

      if (dbResult) {
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
      recipientPhone: salesDoc.partyPhone || connectedRecipient?.phone || undefined,
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

    // 1. Save to Supabase network_invoices table (if available with safe timeout)
    await safeDbCall(async () => {
      return supabase.from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: networkInvoiceId,
        sender_org_id: senderOrg.id,
        sender_org_name: senderOrg.name,
        sender_org_phone: senderOrg.phone || "",
        sender_org_email: senderOrg.email || "",
        sender_org_gstin: senderOrg.gstin || "",
        sender_org_address: senderOrg.address || "",
        sender_user_id: userId || null,
        recipient_org_id: recipientOrgId || null,
        recipient_org_name: recipientOrgName,
        recipient_phone: networkInvoice.recipientPhone || "",
        recipient_email: networkInvoice.recipientEmail || "",
        recipient_gstin: networkInvoice.recipientGstin || "",
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
      } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */); // eslint-disable-line @typescript-eslint/no-explicit-any
    }, 600);

    // 2. Save into Local Storage
    const existingInvoices = this.getLocalInvoices();
    existingInvoices.unshift(networkInvoice);
    this.saveLocalInvoices(existingInvoices);

    // 3. Create Notification for Person B (Recipient)
    const targetRecipientOrgId = recipientOrgId || `party_match_${cleanPhone || cleanGstin || cleanName}`;
    const notification: NetworkNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientOrgId: targetRecipientOrgId,
      type: "sale_invoice_received",
      title: `Sale was Created by ${senderOrg.name} on your name`,
      message: `${senderOrg.name} has created Sales Invoice #${salesDoc.documentNumber} for ₹${salesDoc.grandTotal.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} on your name. Review items, taxes and click Approve to add directly into your Purchases.`,
      status: "unread",
      actionStatus: "pending",
      networkInvoiceId: networkInvoice.id,
      data: {
        senderOrgId: senderOrg.id,
        senderOrgName: senderOrg.name,
        senderOrgGstin: senderOrg.gstin,
        senderOrgPhone: senderOrg.phone,
        invoiceNumber: salesDoc.documentNumber,
        grandTotal: salesDoc.grandTotal,
        itemsCount: salesDoc.items.length,
        docDate: salesDoc.docDate,
      },
      created_at: nowIso,
    };

    await safeDbCall(() =>
      supabase.from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).insert({
        id: generateSafeUuid(),
        recipient_org_id: targetRecipientOrgId.startsWith("party_match_") ? null : targetRecipientOrgId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        status: notification.status,
        action_status: notification.actionStatus,
        network_invoice_id: notification.networkInvoiceId,
        data: notification.data,
        created_at: notification.created_at,
      } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */),
      600
    );

    const existingNotifs = this.getLocalNotifications();
    existingNotifs.unshift(notification);
    this.saveLocalNotifications(existingNotifs);

    // 4. Trigger Broadcast and Custom DOM events for real-time reactivity
    dispatchNetworkEvents("INVOICE_CREATED", { networkInvoice, notification });

    return networkInvoice;
  },

  // ─────────────────────────────────────────────────────────────
  // 4. QUERY INVOICES FOR AN ORGANIZATION
  // ─────────────────────────────────────────────────────────────
  async getInvoicesForOrg(orgId: string, orgPhone?: string, orgGstin?: string): Promise<NetworkInvoice[]> {
    if (!orgId) return [];

    const localInvoices = this.getLocalInvoices();
    const cleanPhone = normalizePhoneNumber(orgPhone);
    const cleanGstin = (orgGstin || "").toUpperCase().trim();

    // Filter local invoices: where org is recipient OR sender
    const matchedLocal = localInvoices.filter((inv) => {
      if (inv.recipientOrgId === orgId || inv.senderOrgId === orgId) return true;
      if (cleanPhone && inv.recipientPhone && normalizePhoneNumber(inv.recipientPhone) === cleanPhone) return true;
      if (cleanGstin && inv.recipientGstin && inv.recipientGstin.toUpperCase().trim() === cleanGstin) return true;
      return false;
    });

    // Merge with Supabase network_invoices
    try {
      const { data: dbInvoices, error } = await supabase
        .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("*")
        .or(`recipient_org_id.eq.${orgId},sender_org_id.eq.${orgId}`)
        .order("created_at", { ascending: false });

      if (!error && dbInvoices && Array.isArray(dbInvoices)) {
        for (const row of dbInvoices as any /* eslint-disable-line @typescript-eslint/no-explicit-any */[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
          const mapped: NetworkInvoice = {
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

          if (!matchedLocal.some((i) => i.id === mapped.id || i.invoiceNumber === mapped.invoiceNumber)) {
            matchedLocal.push(mapped);
          }
        }
      }
    } catch (err) {
      console.warn("Supabase network_invoices fetch notice:", err);
    }

    return matchedLocal.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getPendingInvoicesForOrg(orgId: string, orgPhone?: string, orgGstin?: string): Promise<NetworkInvoice[]> {
    const all = await this.getInvoicesForOrg(orgId, orgPhone, orgGstin);
    const cleanPhone = normalizePhoneNumber(orgPhone);
    const cleanGstin = (orgGstin || "").toUpperCase().trim();

    return all.filter((inv) => {
      const isRecipient =
        inv.recipientOrgId === orgId ||
        (cleanPhone && inv.recipientPhone && normalizePhoneNumber(inv.recipientPhone) === cleanPhone) ||
        (cleanGstin && inv.recipientGstin && inv.recipientGstin.toUpperCase().trim() === cleanGstin);

      return isRecipient && inv.status === "pending";
    });
  },

  // ─────────────────────────────────────────────────────────────
  // 5. QUERY NOTIFICATIONS FOR AN ORGANIZATION
  // ─────────────────────────────────────────────────────────────
  async getNotificationsForOrg(orgId: string, orgPhone?: string, orgGstin?: string): Promise<NetworkNotification[]> {
    if (!orgId) return [];

    const cleanPhone = normalizePhoneNumber(orgPhone);
    const cleanGstin = (orgGstin || "").toUpperCase().trim();
    const localNotifs = this.getLocalNotifications();

    // Match notifications for this org
    const matched = localNotifs.filter((n) => {
      if (n.recipientOrgId === orgId) return true;
      if (cleanPhone && n.recipientOrgId.includes(cleanPhone)) return true;
      if (cleanGstin && n.recipientOrgId.includes(cleanGstin)) return true;
      return false;
    });

    try {
      const { data: dbNotifications, error } = await supabase
        .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
        .select("*")
        .eq("recipient_org_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && dbNotifications) {
        for (const row of dbNotifications as any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
          if (!matched.some((notification) => notification.id === row.id)) {
            matched.push({
              id: row.id,
              recipientOrgId: row.recipient_org_id,
              recipientUserId: row.recipient_user_id,
              type: row.type,
              title: row.title,
              message: row.message,
              status: row.status,
              actionStatus: row.action_status,
              networkInvoiceId: row.network_invoice_id,
              data: row.data || undefined,
              created_at: row.created_at,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Supabase network_notifications fetch notice:", err);
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
      let invoiceIndex = allInvoices.findIndex((inv) => inv.id === networkInvoiceId);

      if (invoiceIndex === -1) {
        const remoteInvoices = await this.getInvoicesForOrg(recipientOrg.id, recipientOrg.phone, recipientOrg.gstin);
        const remoteInvoice = remoteInvoices.find((inv) => inv.id === networkInvoiceId);
        if (remoteInvoice) {
          allInvoices.push(remoteInvoice);
          invoiceIndex = allInvoices.length - 1;
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
          const { data: existingSuppliers } = await supabase
            .from("suppliers")
            .select("id, name, phone, gstin")
            .eq("organization_id", recipientOrg.id);

          const matchedSupplier = (existingSuppliers || []).find((s) => {
            if (inv.senderOrgGstin && s.gstin && s.gstin.trim().toUpperCase() === inv.senderOrgGstin.trim().toUpperCase()) return true;
            if (inv.senderOrgPhone && s.phone && normalizePhoneNumber(s.phone) === normalizePhoneNumber(inv.senderOrgPhone)) return true;
            if (s.name && s.name.trim().toLowerCase() === inv.senderOrgName.trim().toLowerCase()) return true;
            return false;
          });

          if (matchedSupplier) {
            return matchedSupplier.id;
          }

          // Auto-insert Person A as a new Supplier in Person B's store
          const { data: newSupp } = await supabase
            .from("suppliers")
            .insert({
              organization_id: recipientOrg.id,
              name: inv.senderOrgName,
              phone: inv.senderOrgPhone || "",
              email: inv.senderOrgEmail || "",
              gstin: inv.senderOrgGstin || "",
              address: inv.senderOrgAddress || "",
            })
            .select("id")
            .maybeSingle();

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

      for (let idx = 0; idx < inv.items.length; idx++) {
        const it = inv.items[idx];
        let resolvedProductId: string | null = null;

        try {
          const cleanBarcode = (it.barcode || "").trim();
          const cleanName = (it.productName || "").trim();

          // 1. Try matching by barcode in recipient's store
          if (cleanBarcode) {
            const barcodeMatch = await safeDbCall(() =>
              supabase
                .from("products")
                .select("id, name")
                .eq("organization_id", recipientOrg.id)
                .eq("barcode", cleanBarcode)
                .limit(1)
                .maybeSingle()
            );

            if (barcodeMatch?.data?.id) {
              resolvedProductId = barcodeMatch.data.id;
            }
          }

          // 2. Try matching by product name (case-insensitive) in recipient's store
          if (!resolvedProductId && cleanName) {
            const nameMatch = await safeDbCall(() =>
              supabase
                .from("products")
                .select("id, name")
                .eq("organization_id", recipientOrg.id)
                .ilike("name", cleanName)
                .limit(1)
                .maybeSingle()
            );

            if (nameMatch?.data?.id) {
              resolvedProductId = nameMatch.data.id;
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
              supabase
                .from("products")
                .insert({
                  organization_id: recipientOrg.id,
                  name: cleanName,
                  barcode: cleanBarcode || null,
                  category: "General",
                  sku: generatedSku,
                  tags: tagsPayload,
                })
                .select("id, name, barcode, sku, category, tags")
                .maybeSingle()
            );

            if (createRes?.data?.id) {
              resolvedProductId = createRes.data.id;
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
        return supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update({
            status: "approved",
            purchase_invoice_id: savedPurchaseDoc.id,
            purchase_invoice_number: savedPurchaseDoc.documentNumber,
            approved_at: nowIso,
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq("id", networkInvoiceId);
      }, 600);

      // 8. Update Recipient Notification actionStatus to 'approved'
      const allNotifs = this.getLocalNotifications();
      const updatedNotifs = allNotifs.map((n) => {
        if (n.networkInvoiceId === networkInvoiceId) {
          return {
            ...n,
            status: "read" as const,
            actionStatus: "approved" as const,
            message: `Approved: Sales Invoice #${inv.invoiceNumber} recorded as Purchase Bill #${savedPurchaseDoc.documentNumber}.`,
          };
        }
        return n;
      });

      await safeDbCall(() =>
        supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({ status: "read", action_status: "approved" })
          .eq("network_invoice_id", networkInvoiceId),
        600
      );

      // 9. Add Confirmation Notification for Person A (Sender)
      const senderConfirmationNotif: NetworkNotification = {
        id: `notif_conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientOrgId: inv.senderOrgId,
        type: "sale_invoice_approved",
        title: `${recipientOrg.name} Approved Invoice #${inv.invoiceNumber}`,
        message: `${recipientOrg.name} has approved your Sales Invoice #${inv.invoiceNumber} (₹${inv.grandTotal.toLocaleString(
          "en-IN"
        )}) and added it to their Purchases as #${savedPurchaseDoc.documentNumber}.`,
        status: "unread",
        actionStatus: "approved",
        networkInvoiceId: inv.id,
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
          recipient_org_id: inv.senderOrgId,
          type: senderConfirmationNotif.type,
          title: senderConfirmationNotif.title,
          message: senderConfirmationNotif.message,
          status: senderConfirmationNotif.status,
          action_status: senderConfirmationNotif.actionStatus,
          network_invoice_id: inv.id,
          data: senderConfirmationNotif.data,
          created_at: nowIso,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */),
        600
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
      let invoiceIndex = allInvoices.findIndex((inv) => inv.id === networkInvoiceId);

      if (invoiceIndex === -1) {
        const remoteInvoices = await this.getInvoicesForOrg(recipientOrg.id, recipientOrg.phone, recipientOrg.gstin);
        const remoteInvoice = remoteInvoices.find((inv) => inv.id === networkInvoiceId);
        if (remoteInvoice) {
          allInvoices.push(remoteInvoice);
          invoiceIndex = allInvoices.length - 1;
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
        return supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update({
            status: "rejected",
            rejection_reason: inv.rejectionReason,
            rejected_at: nowIso,
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq("id", networkInvoiceId);
      }, 600);

      // Update recipient notifications
      const allNotifs = this.getLocalNotifications();
      const updatedNotifs = allNotifs.map((n) => {
        if (n.networkInvoiceId === networkInvoiceId) {
          return {
            ...n,
            status: "read" as const,
            actionStatus: "rejected" as const,
            message: `Rejected: Sales Invoice #${inv.invoiceNumber} was rejected.`,
          };
        }
        return n;
      });

      await safeDbCall(() =>
        supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)
          .update({ status: "read", action_status: "rejected" })
          .eq("network_invoice_id", networkInvoiceId),
        600
      );

      // Notify Person A (Sender) about the rejection
      const senderRejectNotif: NetworkNotification = {
        id: `notif_rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        recipientOrgId: inv.senderOrgId,
        type: "sale_invoice_rejected",
        title: `${recipientOrg.name} Rejected Invoice #${inv.invoiceNumber}`,
        message: `${recipientOrg.name} has rejected your Sales Invoice #${inv.invoiceNumber} (₹${inv.grandTotal.toLocaleString(
          "en-IN"
        )})${reason ? `: "${reason}"` : "."}`,
        status: "unread",
        actionStatus: "rejected",
        networkInvoiceId: inv.id,
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
          recipient_org_id: inv.senderOrgId,
          type: senderRejectNotif.type,
          title: senderRejectNotif.title,
          message: senderRejectNotif.message,
          status: senderRejectNotif.status,
          action_status: senderRejectNotif.actionStatus,
          network_invoice_id: inv.id,
          data: senderRejectNotif.data,
          created_at: nowIso,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */),
        600
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
            actionStatus: "cancelled" as const,
            message: `Cancelled: Sales Invoice #${invoiceNumber} was cancelled or deleted by sender.`,
          };
        }
        return notif;
      });
      this.saveLocalNotifications(updatedNotifs);

      // Update Supabase network_invoices table
      await safeDbCall(() => {
        return supabase
          .from("network_invoices" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update({
            status: "cancelled",
            updated_at: nowIso,
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq("sender_org_id", senderOrgId)
          .eq("invoice_number", invoiceNumber);
      }, 600);

      // Update Supabase network_notifications table
      await safeDbCall(() => {
        return supabase
          .from("network_notifications" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .update({
            action_status: "cancelled",
          } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
          .eq("data->>invoiceNumber", invoiceNumber);
      }, 600);

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
      title: `Sale was Created by ${mockSenderOrg.name} on your name`,
      message: `${mockSenderOrg.name} created Sales Invoice #${invoiceNumber} for ₹${simInvoice.grandTotal.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} on your name. Review items, taxes and click Approve to add directly into your Purchases.`,
      status: "unread",
      actionStatus: "pending",
      networkInvoiceId: simInvoice.id,
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
};
