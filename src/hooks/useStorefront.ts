import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { StorefrontSettings, StorefrontOrder } from "@/types/storefront";
import {
  getStorefrontSettings,
  saveStorefrontSettings,
  generateDefaultSlug,
  checkSlugAvailability,
  getStorefrontOrders,
  updateStorefrontOrderStatus,
} from "@/services/storefrontService";
import { toast } from "sonner";

export function useStorefront() {
  const { org, orgId } = useOrganization();
  const [settings, setSettings] = useState<StorefrontSettings | null>(null);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Initialize or fetch settings
  const loadSettings = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const existing = await getStorefrontSettings(orgId);
      if (existing) {
        setSettings(existing);
      } else {
        // Initialize default draft settings based on org info
        const defaultSlug = generateDefaultSlug(org?.name || "store");
        const initial: StorefrontSettings = {
          organization_id: orgId,
          slug: defaultSlug,
          is_enabled: true,
          store_name: org?.name || "My Store",
          tagline: "Quality products at best prices",
          description: `Welcome to ${org?.name || "our store"}. Browse products and order directly on WhatsApp!`,
          contact_phone: org?.phone || "",
          whatsapp_number: org?.phone || "",
          address: org?.address || "",
          logo_url: org?.logo_url || "",
          upi_id: org?.upi_id || "",
          theme_color: "#FF6A00",
          minimum_order_amount: 0,
          delivery_charges: 0,
          free_delivery_above: 500,
          enable_home_delivery: true,
          enable_store_pickup: true,
          custom_announcement: "🎉 Welcome! Order online for fast WhatsApp delivery.",
        };
        setSettings(initial);
      }
    } catch (err) {
      console.error("Failed to load storefront settings:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, org]);

  const loadOrders = useCallback(async () => {
    if (!orgId) return;
    setOrdersLoading(true);
    try {
      const orderList = await getStorefrontOrders(orgId);
      setOrders(orderList);
    } catch (err) {
      console.error("Failed to load storefront orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadSettings();
    loadOrders();
  }, [loadSettings, loadOrders]);

  const updateSettings = useCallback(
    async (newSettings: Partial<StorefrontSettings>) => {
      if (!orgId || !settings) return false;

      // If changing slug, verify availability
      if (newSettings.slug && newSettings.slug !== settings.slug) {
        const check = await checkSlugAvailability(newSettings.slug, orgId);
        if (!check.available) {
          toast.error(check.message || "Store handle is already taken.");
          return false;
        }
      }

      setSaving(true);
      try {
        const merged = { ...settings, ...newSettings };
        const result = await saveStorefrontSettings(orgId, merged);
        if (result.success && result.data) {
          setSettings(result.data);
          toast.success("Storefront settings updated!");
          return true;
        } else {
          toast.error(result.error || "Failed to save settings.");
          return false;
        }
      } catch (e) {
        console.error("Save error:", e);
        toast.error("Failed to save storefront settings.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [orgId, settings]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: "pending" | "confirmed" | "completed" | "cancelled") => {
      if (!orgId) return;
      try {
        await updateStorefrontOrderStatus(orgId, orderId, status);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
        toast.success(`Order marked as ${status}!`);
      } catch {
        toast.error("Failed to update order status.");
      }
    },
    [orgId]
  );

  return {
    settings,
    orders,
    loading,
    saving,
    ordersLoading,
    updateSettings,
    updateOrderStatus,
    refreshOrders: loadOrders,
    refreshSettings: loadSettings,
  };
}
