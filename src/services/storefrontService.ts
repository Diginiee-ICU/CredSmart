import { supabase } from "@/integrations/supabase/client";
import { StorefrontSettings, StorefrontProduct, StorefrontOrder, StorefrontOrderItem } from "@/types/storefront";

const STORAGE_PREFIX = "credsmart_storefront_";
const ORDERS_STORAGE_PREFIX = "credsmart_storefront_orders_";
const PUBLIC_STORE_CACHE_PREFIX = "credsmart_public_store_";

export function generateDefaultSlug(storeName: string): string {
  if (!storeName) return "store-" + Math.random().toString(36).substring(2, 7);
  return storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "my-store";
}

export async function checkSlugAvailability(slug: string, currentOrgId?: string): Promise<{ available: boolean; message?: string }> {
  const cleanSlug = slug.toLowerCase().trim();
  if (!cleanSlug || cleanSlug.length < 3) {
    return { available: false, message: "Handle must be at least 3 characters long." };
  }
  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    return { available: false, message: "Handle can only contain lowercase letters, numbers, and hyphens." };
  }

  try {
    let query = supabase
      .from("storefront_settings")
      .select("organization_id")
      .eq("slug", cleanSlug);

    if (currentOrgId) {
      query = query.neq("organization_id", currentOrgId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== "PGRST116") {
      // If table doesn't exist yet or offline, check local registry
      const localCached = localStorage.getItem(`${PUBLIC_STORE_CACHE_PREFIX}${cleanSlug}`);
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (parsed.organization_id && parsed.organization_id !== currentOrgId) {
            return { available: false, message: "This handle is already taken." };
          }
        } catch { /* empty */ }
      }
      return { available: true };
    }

    if (data) {
      return { available: false, message: "This handle is already taken. Please choose another." };
    }
    return { available: true };
  } catch {
    return { available: true };
  }
}

export async function getStorefrontSettings(orgId: string): Promise<StorefrontSettings | null> {
  if (!orgId) return null;

  // 1. Try remote Supabase fetch
  try {
    const { data, error } = await supabase
      .from("storefront_settings")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!error && data) {
      const settings = data as unknown as StorefrontSettings;
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${orgId}`, JSON.stringify(settings));
        if (settings.slug) {
          localStorage.setItem(`${PUBLIC_STORE_CACHE_PREFIX}${settings.slug}`, JSON.stringify(settings));
        }
      } catch { /* empty */ }
      return settings;
    }
  } catch (err) {
    console.warn("Notice fetching remote storefront settings:", err);
  }

  // 2. Fallback to local storage cache
  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${orgId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch { /* empty */ }

  return null;
}

export async function saveStorefrontSettings(
  orgId: string,
  settings: Partial<StorefrontSettings>
): Promise<{ success: boolean; data?: StorefrontSettings; error?: string }> {
  if (!orgId) return { success: false, error: "Organization ID is required" };

  const payload: Partial<StorefrontSettings> & { organization_id: string } = {
    ...settings,
    organization_id: orgId,
    slug: (settings.slug || generateDefaultSlug(settings.store_name || "store")).toLowerCase().trim(),
    updated_at: new Date().toISOString(),
  };

  // Always sync to local storage immediately for fast responsive UI
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${orgId}`, JSON.stringify(payload));
    if (payload.slug) {
      localStorage.setItem(`${PUBLIC_STORE_CACHE_PREFIX}${payload.slug}`, JSON.stringify(payload));
    }
  } catch { /* empty */ }

  // Save to Supabase
  try {
    const { data, error } = await supabase
      .from("storefront_settings")
      .upsert(payload, { onConflict: "organization_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase storefront upsert notice:", error.message);
      return { success: true, data: payload as StorefrontSettings };
    }

    const savedData = (data || payload) as unknown as StorefrontSettings;
    return { success: true, data: savedData };
  } catch (err: unknown) {
    console.warn("Storefront settings network save fallback:", err);
    return { success: true, data: payload as StorefrontSettings };
  }
}

export async function getPublicStorefrontData(
  slug: string
): Promise<{ store: StorefrontSettings | null; products: StorefrontProduct[] }> {
  const cleanSlug = slug.toLowerCase().trim();

  // 1. Try remote RPC get_public_storefront
  try {
    const { data, error } = await supabase.rpc("get_public_storefront", { p_slug: cleanSlug });
    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed && parsed.store) {
        return {
          store: parsed.store as StorefrontSettings,
          products: (parsed.products || []) as StorefrontProduct[],
        };
      }
    }
  } catch (e) {
    console.warn("RPC get_public_storefront notice:", e);
  }

  // 2. Direct Supabase query fallback
  try {
    const { data: storeRow, error: storeErr } = await supabase
      .from("storefront_settings")
      .select("*")
      .eq("slug", cleanSlug)
      .eq("is_enabled", true)
      .maybeSingle();

    if (!storeErr && storeRow) {
      const store = storeRow as unknown as StorefrontSettings;
      // Fetch products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, barcode, sku, category, brand, tags, product_batches(mrp, cost_price, stock)")
        .eq("organization_id", store.organization_id);

      const mapped: StorefrontProduct[] = (prods || [])
        .map((p) => {
          const tags = (p.tags && typeof p.tags === "object" ? p.tags : {}) as Record<string, unknown>;
          const batches = Array.isArray(p.product_batches) ? p.product_batches : [];
          const firstBatch = batches[0];
          const mrp = Number(firstBatch?.mrp) || Number(tags.mrp) || Number(tags.selling_price) || 0;
          const sellingPrice = Number(tags.catalogue_price) || Number(tags.selling_price) || mrp;
          const stock = batches.reduce((sum, b) => sum + (Number(b?.stock) || 0), 0) || Number(tags.stock ?? 10);
          const isVisible = tags.is_in_catalogue !== false && tags.show_in_catalogue !== false;
          if (!isVisible) return null;

          return {
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            sku: p.sku,
            category: p.category || "General",
            brand: p.brand,
            image_url: (tags.image_url as string) || (tags.imageUrl as string) || "",
            unit: (tags.unit as string) || "PCS",
            is_featured: Boolean(tags.is_featured),
            selling_price: sellingPrice,
            mrp: mrp,
            current_stock: stock,
          } as StorefrontProduct;
        })
        .filter((x): x is StorefrontProduct => x !== null);

      return { store, products: mapped };
    }
  } catch { /* empty */ }

  // 3. Fallback to LocalStorage cache
  try {
    const cached = localStorage.getItem(`${PUBLIC_STORE_CACHE_PREFIX}${cleanSlug}`);
    if (cached) {
      const store = JSON.parse(cached) as StorefrontSettings;
      // Try to load cached products for that org
      const prodsRaw = localStorage.getItem(`credsmart_cached_products_${store.organization_id}`);
      let products: StorefrontProduct[] = [];
      if (prodsRaw) {
        const rawList = JSON.parse(prodsRaw);
        if (Array.isArray(rawList)) {
          products = rawList.map((p) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            sku: p.sku,
            category: p.category || "General",
            brand: p.brand,
            image_url: p.tags?.image_url || p.tags?.imageUrl || "",
            unit: p.unit || p.tags?.unit || "PCS",
            is_featured: Boolean(p.tags?.is_featured),
            selling_price: p.sellingPrice || p.selling_price || p.mrp || 0,
            mrp: p.mrp || p.sellingPrice || 0,
            current_stock: p.currentStock ?? p.stock ?? 10,
          }));
        }
      }
      return { store, products };
    }
  } catch { /* empty */ }

  return { store: null, products: [] };
}

export async function submitStorefrontOrder(orderData: {
  organization_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  delivery_type: "home_delivery" | "store_pickup";
  items: StorefrontOrderItem[];
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  notes?: string;
  source?: "whatsapp" | "web" | "direct";
}): Promise<{ success: boolean; orderId: string; orderNumber: string }> {
  const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = crypto.randomUUID();

  const fullOrder: StorefrontOrder = {
    id: orderId,
    organization_id: orderData.organization_id,
    order_number: orderNumber,
    customer_name: orderData.customer_name,
    customer_phone: orderData.customer_phone,
    customer_address: orderData.customer_address || "",
    delivery_type: orderData.delivery_type,
    items: orderData.items,
    subtotal: orderData.subtotal,
    delivery_charge: orderData.delivery_charge,
    total_amount: orderData.total_amount,
    notes: orderData.notes || "",
    status: "pending",
    source: orderData.source || "whatsapp",
    created_at: new Date().toISOString(),
  };

  // 1. Sync to local storage for the organization
  try {
    const key = `${ORDERS_STORAGE_PREFIX}${orderData.organization_id}`;
    const raw = localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    localStorage.setItem(key, JSON.stringify([fullOrder, ...existing]));
  } catch { /* empty */ }

  // 2. Persist to Supabase if connected
  try {
    await supabase.from("storefront_orders").insert({
      id: orderId,
      organization_id: orderData.organization_id,
      order_number: orderNumber,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_address: orderData.customer_address || "",
      delivery_type: orderData.delivery_type,
      items: orderData.items,
      subtotal: orderData.subtotal,
      delivery_charge: orderData.delivery_charge,
      total_amount: orderData.total_amount,
      notes: orderData.notes || "",
      status: "pending",
      source: orderData.source || "whatsapp",
    });
  } catch (err) {
    console.warn("Notice saving storefront order to Supabase:", err);
  }

  return { success: true, orderId, orderNumber };
}

export async function getStorefrontOrders(orgId: string): Promise<StorefrontOrder[]> {
  if (!orgId) return [];

  let remoteOrders: StorefrontOrder[] = [];
  try {
    const { data, error } = await supabase
      .from("storefront_orders")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      remoteOrders = data as unknown as StorefrontOrder[];
    }
  } catch { /* empty */ }

  // Merge with local orders
  let localOrders: StorefrontOrder[] = [];
  try {
    const raw = localStorage.getItem(`${ORDERS_STORAGE_PREFIX}${orgId}`);
    if (raw) localOrders = JSON.parse(raw);
  } catch { /* empty */ }

  const map = new Map<string, StorefrontOrder>();
  remoteOrders.forEach((o) => map.set(o.id, o));
  localOrders.forEach((o) => {
    if (!map.has(o.id)) map.set(o.id, o);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function updateStorefrontOrderStatus(
  orgId: string,
  orderId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled"
): Promise<void> {
  // Update local storage
  try {
    const key = `${ORDERS_STORAGE_PREFIX}${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const orders = JSON.parse(raw) as StorefrontOrder[];
      const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch { /* empty */ }

  // Update Supabase
  try {
    await supabase.from("storefront_orders").update({ status }).eq("id", orderId);
  } catch (e) {
    console.warn("Notice updating storefront order status:", e);
  }
}

export function buildWhatsAppOrderMessage(
  store: StorefrontSettings,
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    deliveryType: "home_delivery" | "store_pickup";
    items: StorefrontOrderItem[];
    subtotal: number;
    deliveryCharge: number;
    totalAmount: number;
    notes?: string;
  }
): string {
  const storeName = store.store_name || "CredSmart Store";
  const typeLabel = order.deliveryType === "home_delivery" ? "🛵 Home Delivery" : "🏪 Store Pickup";

  const itemList = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.name}* (${item.quantity} ${item.unit || "PCS"}) × ₹${item.price} = ₹${item.total}`
    )
    .join("\n");

  const addressLine = order.customerAddress ? `\n📍 *Address:* ${order.customerAddress}` : "";
  const notesLine = order.notes ? `\n📝 *Notes:* ${order.notes}` : "";
  const deliveryFeeLine = order.deliveryCharge > 0 ? `\n🛵 *Delivery Fee:* ₹${order.deliveryCharge}` : "";

  return `🛒 *NEW ORDER #${order.orderNumber}*
━━━━━━━━━━━━━━━━━━━━━
🏪 *Store:* ${storeName}
👤 *Customer:* ${order.customerName} (${order.customerPhone})
📦 *Type:* ${typeLabel}${addressLine}${notesLine}

📋 *Order Items:*
${itemList}
━━━━━━━━━━━━━━━━━━━━━
💰 *Items Subtotal:* ₹${order.subtotal}${deliveryFeeLine}
💳 *Total Amount:* ₹${order.totalAmount}
━━━━━━━━━━━━━━━━━━━━━
Sent via CredSmart Digital Storefront
Please confirm my order. Thank you!`;
}

export function buildWhatsAppPromoMessage(store: StorefrontSettings): string {
  const storeName = store.store_name || "Our Store";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const storeUrl = `${baseUrl}/store/${store.slug}`;

  return `✨ *Namaste! Shop online from ${storeName}* ✨

Explore our complete digital catalogue, check live prices, and order directly on WhatsApp with free & easy delivery!

👉 *Click here to view our catalogue & order:*
${storeUrl}

📱 Fast ordering • 💳 Pay via UPI/Cash • 🛵 Quick Delivery`;
}
