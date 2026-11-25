import { apiGet, apiPost, apiPut, type ApiResponse } from "@/lib/apiClient";
import { supabase } from "@/integrations/supabase/client";

export interface WhiteLabelRequest {
  id: string;
  organization_id: string;
  org_id?: string;
  requested_by: string;
  requester_email: string;
  requester_name: string;
  requested_brand_name: string;
  requested_domain: string;
  notes: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminWhiteLabelRequestItem extends WhiteLabelRequest {
  organization_name?: string;
  organization_email?: string;
  activation_key?: string | null;
  is_activated?: boolean;
  is_enabled?: boolean;
  active_brand_name?: string;
  brand_slug?: string;
  custom_domain?: string;
  primary_color?: string;
  reviewer_name?: string;
}

export interface WhiteLabelConfig {
  id?: string;
  organization_id?: string;
  is_activated: boolean;
  is_enabled: boolean;
  activated_at?: string | null;
  brand_slug: string;
  custom_domain: string;
  brand_name: string;
  brand_tagline: string;
  powered_by_text: string;
  hide_platform_branding: boolean;
  logo_light_url: string;
  logo_dark_url: string;
  favicon_url: string;
  splash_logo_url: string;
  primary_color: string;
  secondary_color: string;
  sidebar_theme: "dark" | "light";
  support_email: string;
  support_phone: string;
  website_url: string;
  meta_title: string;
  meta_description: string;
  custom_footer_text: string;
  updated_at?: string;
}

export interface WhiteLabelStatusResponse {
  is_platform_admin: boolean;
  request: WhiteLabelRequest | null;
  is_activated: boolean;
  config: WhiteLabelConfig | null;
}

export interface ResolvedWhiteLabelBrand {
  organization_id?: string;
  brand_slug: string;
  custom_domain: string;
  brand_name: string;
  brand_tagline: string;
  powered_by_text: string;
  hide_platform_branding: boolean;
  logo_light_url: string;
  logo_dark_url: string;
  favicon_url: string;
  splash_logo_url: string;
  primary_color: string;
  secondary_color: string;
  sidebar_theme: "dark" | "light";
  support_email: string;
  support_phone: string;
  website_url: string;
  meta_title: string;
  meta_description: string;
  custom_footer_text: string;
}

export const DEFAULT_BRAND_CONFIG: ResolvedWhiteLabelBrand = {
  brand_slug: "",
  custom_domain: "",
  brand_name: "CredSmart",
  brand_tagline: "POS & Invoicing BillBook",
  powered_by_text: "CredAlert",
  hide_platform_branding: false,
  logo_light_url: "",
  logo_dark_url: "",
  favicon_url: "/favicon.png",
  splash_logo_url: "/IMG_9301.GIF",
  primary_color: "#2563EB",
  secondary_color: "#F97316",
  sidebar_theme: "dark",
  support_email: "support@credsmart.in",
  support_phone: "",
  website_url: "https://pos.credalert.bussiness",
  meta_title: "CredSmart by CredAlert — 100% Free GST Billing & POS Software India",
  meta_description:
    "CredSmart by CredAlert is India's all-in-one completely free business management platform. GST invoicing, POS retail billing, inventory management, customer ledger, and credit risk intelligence.",
  custom_footer_text: "",
};

export const WL_ACTIVE_BRAND_CACHE_KEY = "credsmart_wl_active_brand";
export const WL_SLUG_CACHE_KEY = "credsmart_wl_brand_slug";

export function loadActiveBrandCache(): { isWhiteLabeled: boolean; brand: ResolvedWhiteLabelBrand } {
  try {
    if (typeof localStorage === "undefined") {
      return { isWhiteLabeled: false, brand: DEFAULT_BRAND_CONFIG };
    }
    const raw = localStorage.getItem(WL_ACTIVE_BRAND_CACHE_KEY);
    if (!raw) return { isWhiteLabeled: false, brand: DEFAULT_BRAND_CONFIG };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isWhiteLabeled && parsed.brand?.brand_name) {
      return {
        isWhiteLabeled: true,
        brand: { ...DEFAULT_BRAND_CONFIG, ...parsed.brand },
      };
    }
  } catch {
    // ignore storage failures
  }
  return { isWhiteLabeled: false, brand: DEFAULT_BRAND_CONFIG };
}

export function saveActiveBrandCache(brand: ResolvedWhiteLabelBrand | null, isWhiteLabeled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (!isWhiteLabeled || !brand) {
      localStorage.removeItem(WL_ACTIVE_BRAND_CACHE_KEY);
      return;
    }
    localStorage.setItem(
      WL_ACTIVE_BRAND_CACHE_KEY,
      JSON.stringify({
        isWhiteLabeled: true,
        brand: { ...DEFAULT_BRAND_CONFIG, ...brand },
        savedAt: Date.now(),
      })
    );
    if (brand.brand_slug) {
      localStorage.setItem(WL_SLUG_CACHE_KEY, brand.brand_slug);
    }
  } catch {
    // ignore quota errors
  }
}

export function clearActiveBrandCache(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(WL_ACTIVE_BRAND_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function clearRememberedBrandSlug(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(WL_SLUG_CACHE_KEY);
  } catch {
    // ignore
  }
}

export async function uploadWhiteLabelAsset(file: File): Promise<{ url: string; error?: string }> {
  try {
    const ext = file.name.split(".").pop() || "png";
    const path = `whitelabel_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("branding").upload(path, file);
    if (!error && data) {
      const resolvedUrl = (data as any).publicUrl || (data as any).url;
      if (resolvedUrl) {
        return { url: resolvedUrl };
      }
    }
  } catch {
    // fallback handled below
  }

  // Fallback for offline/dev testing when storage upload endpoint is unreachable
  if (file.size <= 512 * 1024) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: String(reader.result || "") });
      reader.onerror = () => resolve({ url: "", error: "Failed to process image file." });
      reader.readAsDataURL(file);
    });
  }

  return { url: "", error: "Asset upload failed. Please try a smaller image (< 512KB) or check server connection." };
}

export const whiteLabelApi = {
  // Public resolver for Login / Landing / Custom Domains
  resolvePublicBrand: async (
    params: { host?: string; slug?: string }
  ): Promise<ApiResponse<{ active: boolean; brand: ResolvedWhiteLabelBrand | null }>> => {
    return apiGet<{ active: boolean; brand: ResolvedWhiteLabelBrand | null }>("/white-label/resolve", {
      skipAuth: true,
      params: {
        ...(params.host ? { host: params.host } : {}),
        ...(params.slug ? { slug: params.slug } : {}),
      },
    });
  },

  // Tenant Status, Request, Activation & Config
  getStatus: async (organizationId?: string): Promise<ApiResponse<WhiteLabelStatusResponse>> => {
    return apiGet<WhiteLabelStatusResponse>("/white-label/status", { organizationId });
  },

  submitRequest: async (
    payload: { requested_brand_name: string; requested_domain?: string; notes?: string },
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; already_exists?: boolean; request: WhiteLabelRequest }>> => {
    return apiPost("/white-label/request", payload, { organizationId });
  },

  activateWithKey: async (
    key: string,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; message?: string; config: WhiteLabelConfig }>> => {
    return apiPost("/white-label/activate", { key }, { organizationId });
  },

  saveConfig: async (
    config: Partial<WhiteLabelConfig>,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; config: WhiteLabelConfig }>> => {
    return apiPut("/white-label/config", config, { organizationId });
  },

  toggleEnabled: async (
    isEnabled: boolean,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; config: WhiteLabelConfig }>> => {
    return apiPost("/white-label/toggle", { is_enabled: isEnabled }, { organizationId });
  },

  // Platform Admin Governance Endpoints
  adminListRequests: async (status: string = "all"): Promise<ApiResponse<AdminWhiteLabelRequestItem[]>> => {
    return apiGet<AdminWhiteLabelRequestItem[]>("/admin/white-label/requests", {
      params: { status },
    });
  },

  adminApproveRequest: async (
    requestId: string,
    payload?: { custom_key?: string; admin_notes?: string }
  ): Promise<ApiResponse<{ success: boolean; activation_key: string; request: AdminWhiteLabelRequestItem }>> => {
    return apiPost(`/admin/white-label/requests/${requestId}/approve`, payload || {});
  },

  adminRejectRequest: async (
    requestId: string,
    admin_notes: string
  ): Promise<ApiResponse<{ success: boolean; request: AdminWhiteLabelRequestItem }>> => {
    return apiPost(`/admin/white-label/requests/${requestId}/reject`, { admin_notes });
  },

  adminRegenerateKey: async (
    requestId: string
  ): Promise<ApiResponse<{ success: boolean; activation_key: string; request: AdminWhiteLabelRequestItem }>> => {
    return apiPost(`/admin/white-label/requests/${requestId}/regenerate-key`, {});
  },

  adminRevokeRequest: async (
    requestId: string,
    admin_notes?: string
  ): Promise<ApiResponse<{ success: boolean; request: AdminWhiteLabelRequestItem }>> => {
    return apiPost(`/admin/white-label/requests/${requestId}/revoke`, { admin_notes });
  },
};
