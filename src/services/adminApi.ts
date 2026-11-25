import {
  apiClient,
  apiGet,
  apiPost,
  type ApiResponse,
} from "@/lib/apiClient";

export interface LiveUser {
  user_id: string;
  user_email: string;
  user_name: string;
  display_name: string;
  user_role: string;
  current_path: string;
  platform: string;
  status: "online" | "idle" | "offline";
  last_active_at: string;
  avatar_url?: string | null;
}

export interface AdminMetrics {
  live_users_count: number;
  today_bills_count: number;
  today_sales_total: number;
  total_bills_count: number;
  total_sales_total: number;
  pending_requests_count: number;
  hourly_velocity: Array<{ hour: number; count: number; total: number }>;
  billings_by_staff: Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    count: number;
    total: number;
  }>;
  feature_usage_stats: Array<{
    feature_key: string;
    usage_count: number;
    unique_users?: number;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string | null;
  role: string;
  presence_status: "online" | "idle" | "offline";
  last_active_at?: string | null;
  current_path?: string | null;
  platform?: string | null;
  bill_count: number;
  bill_total: number;
  locked_features_count: number;
}

export interface FeatureAccessRequest {
  id: string;
  organization_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  display_name?: string;
  user_role?: string;
  feature_key: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  already_pending?: boolean;
}

// Local cache storage keys for instant 0ms offline rendering & test resilience
const LOCAL_LOCKS_PREFIX = "credsmart_feature_locks_";
const LOCAL_REQUESTS_PREFIX = "credsmart_feature_requests_";

export const adminApi = {
  // ── Metrics & Analytics ──────────────────────────────────────────────────
  getMetrics: async (organizationId?: string): Promise<ApiResponse<AdminMetrics>> => {
    return apiGet<AdminMetrics>("/admin/metrics", { organizationId });
  },

  getLiveUsers: async (organizationId?: string): Promise<ApiResponse<LiveUser[]>> => {
    return apiGet<LiveUser[]>("/presence/live-users", { organizationId });
  },

  // ── User Management ──────────────────────────────────────────────────────
  getUsers: async (organizationId?: string): Promise<ApiResponse<AdminUser[]>> => {
    return apiGet<AdminUser[]>("/admin/users", { organizationId });
  },

  createUser: async (
    data: { email: string; password: string; full_name?: string; role?: string; phone?: string },
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; user: AdminUser }>> => {
    return apiPost<{ success: boolean; user: AdminUser }>("/admin/create-user", data, { organizationId });
  },

  getUserFeatures: async (
    userId: string,
    organizationId?: string
  ): Promise<ApiResponse<Record<string, boolean>>> => {
    return apiGet<Record<string, boolean>>(`/admin/users/${userId}/features`, { organizationId });
  },

  toggleUserFeature: async (
    userId: string,
    featureKey: string,
    isLocked: boolean,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean }>> => {
    // Optimistically store in local storage cache
    if (typeof localStorage !== "undefined" && organizationId) {
      try {
        const k = `${LOCAL_LOCKS_PREFIX}${organizationId}_${userId}`;
        const raw = localStorage.getItem(k);
        const map = raw ? JSON.parse(raw) : {};
        map[featureKey] = isLocked;
        localStorage.setItem(k, JSON.stringify(map));
        window.dispatchEvent(new CustomEvent("credsmart:feature_locks_updated", { detail: { userId, featureKey, isLocked } }));
      } catch { /* empty */ }
    }

    return apiPost<{ success: boolean }>(
      `/admin/users/${userId}/features/toggle`,
      { feature_key: featureKey, is_locked: isLocked },
      { organizationId }
    );
  },

  bulkUpdateUserFeatures: async (
    userId: string,
    locks: Record<string, boolean>,
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean }>> => {
    if (typeof localStorage !== "undefined" && organizationId) {
      try {
        const k = `${LOCAL_LOCKS_PREFIX}${organizationId}_${userId}`;
        localStorage.setItem(k, JSON.stringify(locks));
        window.dispatchEvent(new CustomEvent("credsmart:feature_locks_updated", { detail: { userId, locks } }));
      } catch { /* empty */ }
    }

    return apiPost<{ success: boolean }>(
      `/admin/users/${userId}/features/bulk`,
      { locks },
      { organizationId }
    );
  },

  // ── Access Requests & Review Queue ────────────────────────────────────────
  getAccessRequests: async (
    status: string = "all",
    organizationId?: string
  ): Promise<ApiResponse<FeatureAccessRequest[]>> => {
    return apiGet<FeatureAccessRequest[]>("/admin/access-requests", {
      organizationId,
      params: { status },
    });
  },

  reviewAccessRequest: async (
    requestId: string,
    status: "approved" | "rejected",
    adminNotes: string = "",
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; request: FeatureAccessRequest }>> => {
    const res = await apiPost<{ success: boolean; request: FeatureAccessRequest }>(
      `/admin/access-requests/${requestId}/review`,
      { status, admin_notes: adminNotes },
      { organizationId }
    );

    if (res.data?.request) {
      const req = res.data.request;
      // Broadcast update event so user's screen unlocks immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("credsmart:access_request_reviewed", { detail: req }));
        window.dispatchEvent(new CustomEvent("credsmart:feature_locks_updated", {
          detail: { userId: req.user_id, featureKey: req.feature_key, isLocked: status !== "approved" }
        }));
      }
    }

    return res;
  },

  // ── Operator Self-Service Requests & Telemetry ────────────────────────────
  requestFeatureAccess: async (
    featureKey: string,
    reason: string = "",
    organizationId?: string
  ): Promise<ApiResponse<{ success: boolean; request: FeatureAccessRequest }>> => {
    const res = await apiPost<{ success: boolean; request: FeatureAccessRequest }>(
      "/features/request-access",
      { feature_key: featureKey, reason },
      { organizationId }
    );

    if (res.data?.request && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("credsmart:access_request_submitted", { detail: res.data.request }));
    }

    return res;
  },

  getMyAccessRequests: async (
    organizationId?: string
  ): Promise<ApiResponse<FeatureAccessRequest[]>> => {
    return apiGet<FeatureAccessRequest[]>("/features/my-requests", { organizationId });
  },

  getMyFeatureLocks: async (
    organizationId?: string
  ): Promise<ApiResponse<Record<string, boolean>>> => {
    return apiGet<Record<string, boolean>>("/features/my-locks", { organizationId });
  },

  logFeatureUsage: async (
    featureKey: string,
    action: string = "view",
    organizationId?: string
  ): Promise<void> => {
    try {
      apiPost("/features/log-usage", { feature_key: featureKey, action }, { organizationId }).catch(() => {});
    } catch {
      // Fire-and-forget telemetry
    }
  },
};
