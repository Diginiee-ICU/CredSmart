import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { adminApi, type FeatureAccessRequest } from "@/services/adminApi";
import { FEATURE_ROUTE_MAP, type FeatureKey, FULL_ACCESS_ROLES } from "@/config/routes";
import { toast } from "sonner";

export interface FeatureAccessContextType {
  isFeatureLocked: (featureKey: FeatureKey | string) => boolean;
  isRouteLocked: (routeUrl: string) => boolean;
  isFeatureRequested: (featureKey: FeatureKey | string) => boolean;
  getFeatureRequestStatus: (featureKey: FeatureKey | string) => "none" | "pending" | "approved" | "rejected";
  requestAccess: (featureKey: FeatureKey | string, reason?: string) => Promise<boolean>;
  openRequestModal: (featureKey: FeatureKey | string) => void;
  closeRequestModal: () => void;
  activeModalFeature: FeatureKey | null;
  featureLocks: Record<string, boolean>;
  myRequests: FeatureAccessRequest[];
  pendingRequestsCount: number;
  refresh: () => Promise<void>;
  loading: boolean;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function getFeatureKeyFromUrl(url: string): FeatureKey | null {
  if (!url) return null;
  const cleanUrl = url.split("?")[0].replace(/\/+$/, "") || "/";

  for (const [key, routes] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (routes.some((r) => cleanUrl === r || cleanUrl.startsWith(`${r}/`))) {
      return key as FeatureKey;
    }
  }

  // Common root/legacy path heuristics
  if (cleanUrl.includes("pos") || cleanUrl.includes("checkout")) return "pos";
  if (cleanUrl.includes("sales")) return "sales";
  if (cleanUrl.includes("purchas")) return "purchases";
  if (cleanUrl.includes("item") || cleanUrl.includes("inventory") || cleanUrl.includes("godown")) return "items";
  if (cleanUrl.includes("part") || cleanUrl.includes("custom") || cleanUrl.includes("suppli")) return "parties";
  if (cleanUrl.includes("cash") || cleanUrl.includes("bank")) return "cashBank";
  if (cleanUrl.includes("e-inv") || cleanUrl.includes("eway")) return "eInvoicing";
  if (cleanUrl.includes("automat")) return "automatedBills";
  if (cleanUrl.includes("expense")) return "expenses";
  if (cleanUrl.includes("report")) return "reports";
  if (cleanUrl.includes("analytic")) return "analytics";
  if (cleanUrl.includes("staff") || cleanUrl.includes("activity")) return "staff";
  if (cleanUrl.includes("setting")) return "settings";
  if (cleanUrl.includes("crm")) return "crm";
  if (cleanUrl.includes("dashboard")) return "dashboard";

  return null;
}

export function FeatureAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { orgId, userRole, userPermissions } = useOrganization();

  const [featureLocks, setFeatureLocks] = useState<Record<string, boolean>>({});
  const [myRequests, setMyRequests] = useState<FeatureAccessRequest[]>([]);
  const [activeModalFeature, setActiveModalFeature] = useState<FeatureKey | null>(null);
  const [loading, setLoading] = useState(false);

  // Platform admins & privileged owners check
  const isPlatformAdmin = useMemo(() => {
    const u = user as any;
    const email = String(u?.email || "").trim().toLowerCase();
    return Boolean(
      u?.is_platform_admin === true ||
      u?.user_metadata?.is_platform_admin === true ||
      email === "ashwinbishnoi05@gmail.com"
    );
  }, [user]);

  const isPrivilegedAdmin = useMemo(() => {
    const role = userRole || "";
    return isPlatformAdmin || FULL_ACCESS_ROLES.includes(role as any);
  }, [userRole, isPlatformAdmin]);

  const fetchLocksAndRequests = useCallback(async () => {
    if (!orgId || !user) {
      setFeatureLocks({});
      setMyRequests([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch locks for current user
      const locksRes = await adminApi.getMyFeatureLocks(orgId);
      if (locksRes.data) {
        setFeatureLocks(locksRes.data);
      }

      // 2. Fetch requests submitted by current user
      const requestsRes = await adminApi.getMyAccessRequests(orgId);
      if (Array.isArray(requestsRes.data)) {
        setMyRequests(requestsRes.data);
      } else {
        setMyRequests([]);
      }
    } catch {
      // Silent error handling with fallback
    } finally {
      setLoading(false);
    }
  }, [orgId, user]);

  useEffect(() => {
    fetchLocksAndRequests();
  }, [fetchLocksAndRequests]);

  // Real-time synchronization via custom events
  useEffect(() => {
    const handleLockUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; featureKey?: string; isLocked?: boolean; locks?: Record<string, boolean> }>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.locks) {
        setFeatureLocks((prev) => ({ ...prev, ...detail.locks }));
      } else if (detail.featureKey !== undefined && detail.isLocked !== undefined) {
        setFeatureLocks((prev) => ({
          ...prev,
          [detail.featureKey!]: detail.isLocked!,
        }));
      }
    };

    const handleRequestSubmitted = (e: Event) => {
      const customEvent = e as CustomEvent<FeatureAccessRequest>;
      if (customEvent.detail) {
        setMyRequests((prev) => [customEvent.detail, ...prev.filter((r) => r.id !== customEvent.detail.id)]);
      }
    };

    const handleRequestReviewed = (e: Event) => {
      const customEvent = e as CustomEvent<FeatureAccessRequest>;
      const reviewed = customEvent.detail;
      if (!reviewed) return;

      setMyRequests((prev) =>
        prev.map((r) => (r.id === reviewed.id || r.feature_key === reviewed.feature_key ? reviewed : r))
      );

      if (reviewed.status === "approved") {
        setFeatureLocks((prev) => ({
          ...prev,
          [reviewed.feature_key]: false,
        }));
        toast.success(`Access Approved! "${reviewed.feature_key}" is now unlocked for your account.`);
      } else if (reviewed.status === "rejected") {
        toast.error(`Access Request Rejected for "${reviewed.feature_key}": ${reviewed.admin_notes || "Denied by Admin"}`);
      }
    };

    window.addEventListener("credsmart:feature_locks_updated", handleLockUpdated);
    window.addEventListener("credsmart:access_request_submitted", handleRequestSubmitted);
    window.addEventListener("credsmart:access_request_reviewed", handleRequestReviewed);

    return () => {
      window.removeEventListener("credsmart:feature_locks_updated", handleLockUpdated);
      window.removeEventListener("credsmart:access_request_submitted", handleRequestSubmitted);
      window.removeEventListener("credsmart:access_request_reviewed", handleRequestReviewed);
    };
  }, []);

  const isFeatureLocked = useCallback(
    (featureKey: FeatureKey | string): boolean => {
      if (isPlatformAdmin) return false;
      const key = featureKey as FeatureKey;

      // 1. Explicit database / server feature lock takes precedence even on store owners/testers
      if (featureLocks[key] === true) return true;
      if (isPrivilegedAdmin) return false;
      if (featureLocks[key] === false) return false;

      // 2. Custom permissions map override
      if (userPermissions && typeof userPermissions === "object" && userPermissions[key] === false) {
        return true;
      }

      return false;
    },
    [isPlatformAdmin, isPrivilegedAdmin, featureLocks, userPermissions]
  );

  const isRouteLocked = useCallback(
    (routeUrl: string): boolean => {
      if (isPlatformAdmin) return false;
      const featKey = getFeatureKeyFromUrl(routeUrl);
      if (!featKey) return false;
      return isFeatureLocked(featKey);
    },
    [isPlatformAdmin, isFeatureLocked]
  );

  const getFeatureRequestStatus = useCallback(
    (featureKey: FeatureKey | string): "none" | "pending" | "approved" | "rejected" => {
      if (!Array.isArray(myRequests)) return "none";
      const req = myRequests.find((r) => r && r.feature_key === featureKey);
      return req?.status || "none";
    },
    [myRequests]
  );

  const isFeatureRequested = useCallback(
    (featureKey: FeatureKey | string): boolean => {
      return getFeatureRequestStatus(featureKey) === "pending";
    },
    [getFeatureRequestStatus]
  );

  const requestAccess = useCallback(
    async (featureKey: FeatureKey | string, reason: string = ""): Promise<boolean> => {
      if (!orgId) {
        toast.error("Please select an organization before requesting access.");
        return false;
      }

      try {
        const { data, error } = await adminApi.requestFeatureAccess(featureKey, reason, orgId);
        if (error) {
          toast.error(error.message || "Failed to submit request.");
          return false;
        }

        if (data?.request) {
          setMyRequests((prev) => [data.request, ...prev.filter((r) => r.id !== data.request.id)]);
          toast.success(
            data.already_pending
              ? "Access request is already pending administrator review."
              : "Access request submitted. Your administrator will review it."
          );
          return true;
        }
        return false;
      } catch {
        toast.error("Network error while submitting access request.");
        return false;
      }
    },
    [orgId]
  );

  const openRequestModal = useCallback((featureKey: FeatureKey | string) => {
    setActiveModalFeature(featureKey as FeatureKey);
  }, []);

  const closeRequestModal = useCallback(() => {
    setActiveModalFeature(null);
  }, []);

  const pendingRequestsCount = useMemo(() => {
    return Array.isArray(myRequests) ? myRequests.filter((r) => r && r.status === "pending").length : 0;
  }, [myRequests]);

  return (
    <FeatureAccessContext.Provider
      value={{
        isFeatureLocked,
        isRouteLocked,
        isFeatureRequested,
        getFeatureRequestStatus,
        requestAccess,
        openRequestModal,
        closeRequestModal,
        activeModalFeature,
        featureLocks,
        myRequests,
        pendingRequestsCount,
        refresh: fetchLocksAndRequests,
        loading,
      }}
    >
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess(): FeatureAccessContextType {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error("useFeatureAccess must be used within a FeatureAccessProvider");
  }
  return context;
}
