import React, { useMemo, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useFeatureAccess, getFeatureKeyFromUrl } from "@/hooks/useFeatureAccess";
import { useOrganization } from "@/hooks/useOrganization";
import { adminApi } from "@/services/adminApi";
import { SYSTEM_FEATURES_MAP } from "@/config/features";
import { ROUTE_PATHS } from "@/config/routes";
import { Lock, ArrowLeft, Send, Clock } from "lucide-react";

const recentUsageLogTimestamps = new Map<string, number>();

export function FeatureLockGuard(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { orgId } = useOrganization();
  const { isRouteLocked, openRequestModal, getFeatureRequestStatus } = useFeatureAccess();

  const currentPath = location.pathname || "";
  const featureKey = useMemo(() => getFeatureKeyFromUrl(currentPath), [currentPath]);
  const isLocked = isRouteLocked(currentPath);

  // Record feature usage telemetry (debounced per 60s per feature/org) when accessible
  useEffect(() => {
    if (isLocked || !featureKey || !orgId) return;
    const throttleKey = `${orgId}:${featureKey}`;
    const now = Date.now();
    const lastLogged = recentUsageLogTimestamps.get(throttleKey) || 0;
    if (now - lastLogged < 60000) return;

    recentUsageLogTimestamps.set(throttleKey, now);
    adminApi.logFeatureUsage(featureKey, "view", orgId).catch(() => {});
  }, [isLocked, featureKey, orgId, currentPath]);

  if (isLocked && featureKey) {
    const feature = SYSTEM_FEATURES_MAP[featureKey];
    const status = getFeatureRequestStatus(featureKey);
    const Icon = feature?.icon || Lock;

    return (
      <div className="flex-1 w-full h-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 select-none">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
            <Icon className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <Lock className="w-3 h-3" />
              <span>Module Locked by Administrator</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {feature?.label || "Protected Feature"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {feature?.description || "Access to this module requires explicit authorization from your organization admin."}
            </p>
          </div>

          {status === "pending" ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span>Access Request is currently pending administrator review.</span>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openRequestModal(featureKey)}
                className="h-8.5 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Access to this Feature</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.checkout)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to POS Billing Counter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default FeatureLockGuard;
