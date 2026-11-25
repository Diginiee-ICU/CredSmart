import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  whiteLabelApi,
  DEFAULT_BRAND_CONFIG,
  WL_SLUG_CACHE_KEY,
  loadActiveBrandCache,
  saveActiveBrandCache,
  clearActiveBrandCache,
  type WhiteLabelRequest,
  type WhiteLabelConfig,
  type ResolvedWhiteLabelBrand,
} from "@/services/whiteLabelApi";
import { applyWhiteLabelThemeToDocument } from "@/utils/colorTheme";

export interface WhiteLabelContextValue {
  brand: ResolvedWhiteLabelBrand;
  isWhiteLabeled: boolean;
  isActivated: boolean;
  isEnabled: boolean;
  isPlatformAdmin: boolean;
  request: WhiteLabelRequest | null;
  config: WhiteLabelConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  submitRequest: (payload: {
    requested_brand_name: string;
    requested_domain?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  activateWithKey: (key: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  saveConfig: (partial: Partial<WhiteLabelConfig>) => Promise<{ success: boolean; error?: string }>;
  toggleEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
}

const WhiteLabelContext = createContext<WhiteLabelContextValue>({
  brand: DEFAULT_BRAND_CONFIG,
  isWhiteLabeled: false,
  isActivated: false,
  isEnabled: false,
  isPlatformAdmin: false,
  request: null,
  config: null,
  loading: false,
  refresh: async () => {},
  submitRequest: async () => ({ success: false }),
  activateWithKey: async () => ({ success: false }),
  saveConfig: async () => ({ success: false }),
  toggleEnabled: async () => ({ success: false }),
});

const PLATFORM_DEFAULT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "credsmart.online",
  "www.credsmart.online",
  "app.credsmart.online",
  "pos.credalert.bussiness",
  "credalert.business",
  "www.credalert.business",
]);

function extractBrandSlugFromLocation(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    const paramSlug = params.get("brand");
    if (paramSlug && paramSlug.trim()) {
      const normalized = paramSlug.trim().toLowerCase();
      localStorage.setItem(WL_SLUG_CACHE_KEY, normalized);
      return normalized;
    }

    const pathMatch = window.location.pathname.match(/^\/b\/([a-zA-Z0-9-]+)/);
    if (pathMatch?.[1]) {
      const normalized = pathMatch[1].trim().toLowerCase();
      localStorage.setItem(WL_SLUG_CACHE_KEY, normalized);
      return normalized;
    }

    const remembered = localStorage.getItem(WL_SLUG_CACHE_KEY);
    if (remembered && remembered.trim()) {
      return remembered.trim().toLowerCase();
    }
  } catch {
    // ignore URL/storage access errors
  }
  return "";
}

function configToResolvedBrand(cfg: WhiteLabelConfig): ResolvedWhiteLabelBrand {
  return {
    organization_id: cfg.organization_id,
    brand_slug: cfg.brand_slug || "",
    custom_domain: cfg.custom_domain || "",
    brand_name: cfg.brand_name || DEFAULT_BRAND_CONFIG.brand_name,
    brand_tagline: cfg.brand_tagline || "",
    powered_by_text: cfg.powered_by_text || "",
    hide_platform_branding: cfg.hide_platform_branding !== false,
    logo_light_url: cfg.logo_light_url || "",
    logo_dark_url: cfg.logo_dark_url || "",
    favicon_url: cfg.favicon_url || "",
    splash_logo_url: cfg.splash_logo_url || "",
    primary_color: cfg.primary_color || DEFAULT_BRAND_CONFIG.primary_color,
    secondary_color: cfg.secondary_color || DEFAULT_BRAND_CONFIG.secondary_color,
    sidebar_theme: cfg.sidebar_theme || "dark",
    support_email: cfg.support_email || "",
    support_phone: cfg.support_phone || "",
    website_url: cfg.website_url || "",
    meta_title: cfg.meta_title || "",
    meta_description: cfg.meta_description || "",
    custom_footer_text: cfg.custom_footer_text || "",
  };
}

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { orgId } = useOrganization();

  const initialCache = useMemo(() => loadActiveBrandCache(), []);
  const [brand, setBrand] = useState<ResolvedWhiteLabelBrand>(initialCache.brand);
  const [isWhiteLabeled, setIsWhiteLabeled] = useState<boolean>(initialCache.isWhiteLabeled);
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [apiPlatformAdmin, setApiPlatformAdmin] = useState<boolean>(false);
  const [request, setRequest] = useState<WhiteLabelRequest | null>(null);
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isPlatformAdmin = useMemo(() => {
    if (apiPlatformAdmin) return true;
    const u = user as any;
    if (u?.is_platform_admin === true || u?.user_metadata?.is_platform_admin === true) {
      return true;
    }
    const email = String(u?.email || "").trim().toLowerCase();
    return email === "ashwinbishnoi05@gmail.com";
  }, [apiPlatformAdmin, user]);

  // Apply CSS & document head metadata whenever brand changes
  useEffect(() => {
    applyWhiteLabelThemeToDocument(brand, isWhiteLabeled);
  }, [brand, isWhiteLabeled]);

  const applyResolvedBrand = useCallback((resolved: ResolvedWhiteLabelBrand | null, active: boolean) => {
    if (active && resolved) {
      const merged = { ...DEFAULT_BRAND_CONFIG, ...resolved };
      setBrand(merged);
      setIsWhiteLabeled(true);
      saveActiveBrandCache(merged, true);
    } else {
      setBrand(DEFAULT_BRAND_CONFIG);
      setIsWhiteLabeled(false);
      clearActiveBrandCache();
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Authenticated org resolution takes precedence once logged in
      if (user && orgId) {
        const res = await whiteLabelApi.getStatus(orgId);
        if (res.data) {
          setApiPlatformAdmin(Boolean(res.data.is_platform_admin));
          setRequest(res.data.request);
          setIsActivated(Boolean(res.data.is_activated));
          setConfig(res.data.config);
          const enabled = Boolean(res.data.is_activated && res.data.config?.is_enabled);
          setIsEnabled(enabled);

          if (enabled && res.data.config) {
            applyResolvedBrand(configToResolvedBrand(res.data.config), true);
            window.dispatchEvent(new CustomEvent("credsmart:whitelabel_updated"));
            return;
          }

          // Fall back to explicit ?brand= slug only if org itself isn't actively white-labeled
          const explicitSlug = extractBrandSlugFromLocation();
          if (!explicitSlug) {
            applyResolvedBrand(null, false);
            return;
          }
        }
      } else if (user) {
        // User signed in without active orgId yet (still check platform admin status)
        const res = await whiteLabelApi.getStatus();
        if (res.data) {
          setApiPlatformAdmin(Boolean(res.data.is_platform_admin));
        }
      }

      // 2. Public resolution by hostname or ?brand=slug / /b/:slug
      const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
      const slug = extractBrandSlugFromLocation();
      const shouldQueryCustomHost = Boolean(host && !PLATFORM_DEFAULT_HOSTS.has(host));

      if (slug || shouldQueryCustomHost) {
        const pubRes = await whiteLabelApi.resolvePublicBrand({
          host: shouldQueryCustomHost ? host : undefined,
          slug: slug || undefined,
        });
        if (pubRes.data?.active && pubRes.data.brand) {
          applyResolvedBrand(pubRes.data.brand, true);
          return;
        }
      }

      if (!user) {
        // Keep anonymous host clear if resolver returned inactive
        applyResolvedBrand(null, false);
      }
    } catch {
      // Keep cached brand cleanly when offline
    } finally {
      setLoading(false);
    }
  }, [user, orgId, applyResolvedBrand]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitRequest = useCallback(
    async (payload: { requested_brand_name: string; requested_domain?: string; notes?: string }) => {
      if (!orgId) return { success: false, error: "Organization ID is required" };
      const res = await whiteLabelApi.submitRequest(payload, orgId);
      if (res.error) return { success: false, error: res.error.message };
      if (res.data?.request) setRequest(res.data.request);
      return { success: true };
    },
    [orgId]
  );

  const activateWithKey = useCallback(
    async (key: string) => {
      if (!orgId) return { success: false, error: "Organization ID is required" };
      const res = await whiteLabelApi.activateWithKey(key, orgId);
      if (res.error) return { success: false, error: res.error.message };
      if (res.data?.config) {
        setIsActivated(true);
        setIsEnabled(Boolean(res.data.config.is_enabled));
        setConfig(res.data.config);
        applyResolvedBrand(configToResolvedBrand(res.data.config), Boolean(res.data.config.is_enabled));
        window.dispatchEvent(new CustomEvent("credsmart:whitelabel_updated"));
      }
      return { success: true, message: res.data?.message };
    },
    [orgId, applyResolvedBrand]
  );

  const saveConfig = useCallback(
    async (partial: Partial<WhiteLabelConfig>) => {
      if (!orgId) return { success: false, error: "Organization ID is required" };
      const res = await whiteLabelApi.saveConfig(partial, orgId);
      if (res.error) return { success: false, error: res.error.message };
      if (res.data?.config) {
        setConfig(res.data.config);
        setIsActivated(Boolean(res.data.config.is_activated));
        setIsEnabled(Boolean(res.data.config.is_enabled));
        applyResolvedBrand(
          configToResolvedBrand(res.data.config),
          Boolean(res.data.config.is_activated && res.data.config.is_enabled)
        );
        window.dispatchEvent(new CustomEvent("credsmart:whitelabel_updated"));
      }
      return { success: true };
    },
    [orgId, applyResolvedBrand]
  );

  const toggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (!orgId) return { success: false, error: "Organization ID is required" };
      const res = await whiteLabelApi.toggleEnabled(enabled, orgId);
      if (res.error) return { success: false, error: res.error.message };
      if (res.data?.config) {
        setConfig(res.data.config);
        setIsEnabled(Boolean(res.data.config.is_enabled));
        applyResolvedBrand(
          configToResolvedBrand(res.data.config),
          Boolean(res.data.config.is_activated && res.data.config.is_enabled)
        );
        window.dispatchEvent(new CustomEvent("credsmart:whitelabel_updated"));
      }
      return { success: true };
    },
    [orgId, applyResolvedBrand]
  );

  return (
    <WhiteLabelContext.Provider
      value={{
        brand,
        isWhiteLabeled,
        isActivated,
        isEnabled,
        isPlatformAdmin,
        request,
        config,
        loading,
        refresh,
        submitRequest,
        activateWithKey,
        saveConfig,
        toggleEnabled,
      }}
    >
      {children}
    </WhiteLabelContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}
