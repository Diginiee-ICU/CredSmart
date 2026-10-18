/**
 * IndexedDB Offline Transaction Queue & Network Status Sync Engine
 * Allows offline POS Billing, customer creation, and stock adjustments with auto-cloud sync.
 */

import { supabase } from "@/integrations/supabase/client";
import { productsApi } from "@/services/productsApi";
import { partiesApi } from "@/services/partiesApi";
import { invoicesApi } from "@/services/invoicesApi";
import { toast } from "sonner";
import { playSuccessChime, triggerHapticSuccess } from "./soundAndHaptics";

export interface QueuedOfflineAction {
  id: string;
  type: "sale" | "customer" | "stock_adjustment" | "credit_payment";
  payload: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; // eslint-disable-line @typescript-eslint/no-explicit-any
  timestamp: number;
  retryCount: number;
}

const DB_NAME = "credsmart_offline_db";
const STORE_NAME = "offline_sync_queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueues a transaction locally when offline
 */
export async function enqueueOfflineAction(
  type: QueuedOfflineAction["type"],
  payload: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<string> {
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedOfflineAction = {
    id,
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    window.dispatchEvent(new CustomEvent("offline-queue-changed"));
    return id;
  } catch (err) {
    console.warn("Failed to enqueue in IndexedDB, fallback to localStorage", err);
    try {
      const existing = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
      existing.push(item);
      localStorage.setItem(STORE_NAME, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("offline-queue-changed"));
    } catch { /* empty */ }
    return id;
  }
}

/**
 * Gets the total count of pending offline transactions
 */
export async function getOfflineQueueCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const countReq = tx.objectStore(STORE_NAME).count();
      countReq.onsuccess = () => resolve(countReq.result || 0);
      countReq.onerror = () => resolve(0);
    });
  } catch {
    try {
      const existing = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
      return Array.isArray(existing) ? existing.length : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Flushes the offline queue and syncs all items to Supabase
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  let items: QueuedOfflineAction[] = [];
  try {
    const db = await openDB();
    items = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    try {
      items = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
    } catch { /* empty */ }
  }

  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.type === "sale") {
        const { error } = await invoicesApi.createSale(item.payload, item.payload?.organization_id);
        if (error) throw new Error(error.message);
      } else if (item.type === "customer") {
        const { error } = await partiesApi.createCustomer(item.payload, item.payload?.organization_id);
        if (error) throw new Error(error.message);
      } else if (item.type === "stock_adjustment") {
        const { error } = await productsApi.updateBatch(
          item.payload.batchId,
          { stock: item.payload.newStock },
          item.organizationId
        );
        if (error) throw new Error(error.message);
      } else if (item.type === "credit_payment") {
        const { error } = await partiesApi.recordCreditTransaction(item.payload, item.payload?.organization_id);
        if (error) throw new Error(error.message);
      }

      // Remove successfully synced item
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(item.id);
      } catch {
        const existing = JSON.parse(localStorage.getItem(STORE_NAME) || "[]");
        const remaining = existing.filter((x: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => x.id !== item.id); // eslint-disable-line @typescript-eslint/no-explicit-any
        localStorage.setItem(STORE_NAME, JSON.stringify(remaining));
      }
      synced++;
    } catch (syncErr) {
      console.error("Sync item failed:", syncErr);
      failed++;
    }
  }

  window.dispatchEvent(new CustomEvent("offline-queue-changed"));

  if (synced > 0) {
    playSuccessChime();
    triggerHapticSuccess();
    toast.success(`✓ Cloud Sync Complete: ${synced} offline transaction(s) synced!`);
  }

  return { synced, failed };
}
