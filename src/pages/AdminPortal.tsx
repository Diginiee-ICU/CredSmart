import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  adminApi,
  type AdminMetrics,
  type LiveUser,
  type AdminUser,
  type FeatureAccessRequest,
} from "@/services/adminApi";
import { ALL_SYSTEM_FEATURES, SYSTEM_FEATURES_MAP, type SystemFeatureItem } from "@/config/features";
import { ALL_APP_ROLES, type FeatureKey, FULL_ACCESS_ROLES } from "@/config/routes";
import {
  Shield,
  Users,
  Activity,
  Receipt,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Search,
  Check,
  X,
  Send,
  Sparkles,
  BarChart3,
  TrendingUp,
  Laptop,
  Smartphone,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  UserCheck,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

type AdminTab = "analytics" | "users" | "features" | "requests";

export default function AdminPortal() {
  const { orgId, userRole } = useOrganization();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<FeatureAccessRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<string>("pending");

  // Feature matrix states
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userFeatureLocks, setUserFeatureLocks] = useState<Record<string, boolean>>({});
  const [savingLocks, setSavingLocks] = useState(false);

  // User search/filter
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  // Create User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "admin",
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPrivileged = useMemo(() => {
    return FULL_ACCESS_ROLES.includes((userRole || "") as any);
  }, [userRole]);

  // Load all admin data
  const loadData = useCallback(async (isSilent = false) => {
    if (!orgId) return;
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const [metricsRes, liveRes, usersRes, reqRes] = await Promise.all([
        adminApi.getMetrics(orgId),
        adminApi.getLiveUsers(orgId),
        adminApi.getUsers(orgId),
        adminApi.getAccessRequests("all", orgId),
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data);
      if (liveRes.data) setLiveUsers(liveRes.data);
      if (usersRes.data) {
        setUsers(usersRes.data);
        if (!selectedUserId && usersRes.data.length > 0) {
          setSelectedUserId(usersRes.data[0].id);
        }
      }
      if (reqRes.data) setRequests(reqRes.data);
    } catch {
      toast.error("Could not load latest admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId, selectedUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh live metrics every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Load feature locks when selected user changes
  useEffect(() => {
    if (!orgId || !selectedUserId) return;
    adminApi.getUserFeatures(selectedUserId, orgId).then((res) => {
      if (res.data) {
        setUserFeatureLocks(res.data);
      } else {
        setUserFeatureLocks({});
      }
    });
  }, [orgId, selectedUserId]);

  // Toggle single feature lock
  const handleToggleLock = async (featureKey: FeatureKey, nextLocked: boolean) => {
    if (!orgId || !selectedUserId) return;

    setUserFeatureLocks((prev) => ({ ...prev, [featureKey]: nextLocked }));
    const { error } = await adminApi.toggleUserFeature(selectedUserId, featureKey, nextLocked, orgId);
    if (error) {
      toast.error(error.message || "Failed to update lock.");
      setUserFeatureLocks((prev) => ({ ...prev, [featureKey]: !nextLocked }));
    } else {
      toast.success(
        nextLocked
          ? `Locked "${SYSTEM_FEATURES_MAP[featureKey]?.label || featureKey}"`
          : `Unlocked "${SYSTEM_FEATURES_MAP[featureKey]?.label || featureKey}"`
      );
    }
  };

  // Bulk set locks
  const handleBulkLocks = async (lockAll: boolean) => {
    if (!orgId || !selectedUserId) return;
    setSavingLocks(true);

    const nextLocks: Record<string, boolean> = {};
    ALL_SYSTEM_FEATURES.forEach((f) => {
      nextLocks[f.key] = lockAll;
    });

    setUserFeatureLocks(nextLocks);
    const { error } = await adminApi.bulkUpdateUserFeatures(selectedUserId, nextLocks, orgId);
    setSavingLocks(false);

    if (error) {
      toast.error("Failed to update feature locks.");
    } else {
      toast.success(lockAll ? "All features locked for user." : "All features unlocked for user.");
    }
  };

  // Review access request (Approve / Reject)
  const handleReviewRequest = async (requestId: string, status: "approved" | "rejected") => {
    if (!orgId) return;

    const { data, error } = await adminApi.reviewAccessRequest(requestId, status, "", orgId);
    if (error) {
      toast.error(error.message || "Failed to review request.");
    } else {
      toast.success(status === "approved" ? "Request Approved & Feature Unlocked!" : "Request Rejected.");
      if (data?.request) {
        setRequests((prev) => prev.map((r) => (r.id === requestId ? data.request : r)));
        // Refresh metrics
        loadData(true);
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("Organization ID is required.");
      return;
    }
    if (!newUserData.email || !newUserData.password) {
      toast.error("Email and password are required.");
      return;
    }
    if (newUserData.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingUser(true);
    try {
      const res = await adminApi.createUser(newUserData, orgId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.data?.message || `User ${newUserData.email} created as ${newUserData.role}!`);
        setShowAddUserModal(false);
        setNewUserData({ full_name: "", email: "", password: "", role: "admin" });
        loadData(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Filtered lists
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "pending").length;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (requestFilter === "all") return requests;
    return requests.filter((r) => r.status === requestFilter);
  }, [requests, requestFilter]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q);
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* ── Top Header Strip (Sticky / Fixed Command Header) ────────────────── */}
      <header className="shrink-0 h-13 px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 z-10 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Shield className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Admin &amp; Feature Control Center
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{metrics?.live_users_count || 1} Live</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              Live Operations, Billings Count &amp; Granular Feature Gating
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tab Switcher Pills */}
          <nav className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "analytics"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "users"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Users</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("features")}
              className={cn(
                "h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "features"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Feature Gating</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={cn(
                "h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative",
                activeTab === "requests"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="w-7.5 h-7.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
            title="Refresh analytics and users"
          >
            <RotateCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-blue-600")} />
          </button>
        </div>
      </header>

      {/* ── Main Viewport-Contained Content Area ────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        {/* TAB 1: ANALYTICS & LIVE OPERATIONS */}
        {activeTab === "analytics" && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* 4 KPI Hero Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Live Users */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Live Users Online</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-1.5">
                  <span>{metrics?.live_users_count || 1}</span>
                  <span className="text-xs font-normal text-emerald-600">Active</span>
                </div>
                <p className="text-[11px] font-mono text-slate-400">Heartbeat past 3 mins</p>
              </div>

              {/* Card 2: Today's Billings */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Today's Invoices</span>
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-1.5">
                  <span>{metrics?.today_bills_count || 0}</span>
                  <span className="text-xs font-normal text-slate-500">bills</span>
                </div>
                <p className="text-[11px] font-mono text-emerald-600 font-semibold truncate">
                  {formatCurrency(metrics?.today_sales_total || 0)}
                </p>
              </div>

              {/* Card 3: Total Billings */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Total Store Billings</span>
                  <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-1.5">
                  <span>{metrics?.total_bills_count || 0}</span>
                  <span className="text-xs font-normal text-slate-500">lifetime</span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate">
                  Volume: {formatCurrency(metrics?.total_sales_total || 0)}
                </p>
              </div>

              {/* Card 4: Access Requests */}
              <div
                onClick={() => setActiveTab("requests")}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Pending Requests</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-1.5">
                  <span>{pendingRequestsCount}</span>
                  <span className="text-xs font-normal text-amber-600">Pending</span>
                </div>
                <p className="text-[11px] font-mono text-blue-600 hover:underline">
                  Review Access Queue →
                </p>
              </div>
            </div>

            {/* Two-Column Deep-Dive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Live Operators Roster */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Operators Roster ({liveUsers.length})</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Real-Time</span>
                </div>

                {liveUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No operators currently online.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {liveUsers.map((op) => (
                      <div
                        key={op.user_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {op.display_name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {op.display_name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              {op.current_path || "/billing"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {op.user_role}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Feature Usage Frequency */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Feature Telemetry &amp; Adoption</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Past 30 Days</span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {ALL_SYSTEM_FEATURES.slice(0, 8).map((feat) => {
                    const stat = metrics?.feature_usage_stats?.find((s) => s.feature_key === feat.key);
                    const count = stat?.usage_count || 0;
                    const maxCount = Math.max(...(metrics?.feature_usage_stats || []).map((s) => s.usage_count), 50);
                    const pct = Math.min(Math.round((count / maxCount) * 100), 100);

                    return (
                      <div key={feat.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <feat.icon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{feat.label}</span>
                          </span>
                          <span className="font-mono tabular-nums text-slate-500 font-medium">
                            {count} hits
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Billings by Cashier / Staff Member Table */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Billings by Counter Staff</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Invoices Breakdown</span>
              </div>

              {(metrics?.billings_by_staff || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No billing records generated yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="py-2 px-3">Operator</th>
                        <th className="py-2 px-3">Invoices Count</th>
                        <th className="py-2 px-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {(metrics?.billings_by_staff || []).map((staff, idx) => (
                        <tr key={staff.user_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-900 dark:text-white font-semibold">
                            {staff.user_name || "Counter Cashier"}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {staff.count} bills
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-right text-emerald-600 font-bold">
                            {formatCurrency(staff.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Search and Filters Bar */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search staff by name or email…"
                  className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="store_owner">Store Owner</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="salesman">Salesman</option>
                  <option value="stock_manager">Stock Manager</option>
                  <option value="accountant">Accountant</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Admin / User</span>
                </button>
              </div>
            </div>

            {/* Dense User Table */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 font-mono uppercase text-[11px]">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Billings Generated</th>
                      <th className="py-2.5 px-3">Locked Features</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.full_name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {u.full_name || "Staff Member"}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {u.role}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {u.presence_status === "online" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Online</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400">Offline</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {u.bill_count} bills ({formatCurrency(u.bill_total)})
                          </td>

                          <td className="py-2.5 px-3 font-mono tabular-nums">
                            {u.locked_features_count > 0 ? (
                              <span className="text-rose-600 font-bold">{u.locked_features_count} locked</span>
                            ) : (
                              <span className="text-emerald-600">All unlocked</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(u.id);
                                setActiveTab("features");
                              }}
                              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                            >
                              Manage Locks
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GRANULAR FEATURE ACCESS MATRIX */}
        {activeTab === "features" && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* User Selector Strip */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                  Target Operator:
                </span>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white cursor-pointer min-w-[200px]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Admin / User</span>
                </button>
              </div>

              {/* Quick Preset Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleBulkLocks(false)}
                  disabled={savingLocks}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Unlock className="w-3 h-3 inline mr-1" />
                  Unlock All
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkLocks(true)}
                  disabled={savingLocks}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3 inline mr-1" />
                  Lock All
                </button>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_SYSTEM_FEATURES.map((feat) => {
                const isLocked = Boolean(userFeatureLocks[feat.key]);

                return (
                  <div
                    key={feat.key}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-3 shadow-2xs",
                      isLocked
                        ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                          isLocked
                            ? "bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                            : "bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        <feat.icon className="w-4.5 h-4.5 stroke-[2.2]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {feat.label}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            {feat.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Control Strip */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                      <span className="text-[11px] font-mono font-semibold">
                        {isLocked ? (
                          <span className="text-rose-600 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Locked (Requires Request)</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Unlocked &amp; Active</span>
                          </span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleLock(feat.key, !isLocked)}
                        className={cn(
                          "h-7 px-2.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer shadow-2xs",
                          isLocked
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300"
                        )}
                      >
                        {isLocked ? "Unlock" : "Lock"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ACCESS REQUESTS QUEUE */}
        {activeTab === "requests" && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2">
              {["pending", "approved", "rejected", "all"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestFilter(st)}
                  className={cn(
                    "h-7 px-3 rounded-md text-xs font-semibold uppercase tracking-wider font-mono transition-all cursor-pointer",
                    requestFilter === st
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  )}
                >
                  {st}
                  {st === "pending" && pendingRequestsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400 space-y-1">
                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  No {requestFilter} access requests found.
                </p>
                <p className="text-[11px] font-mono">
                  When operators encounter a locked feature, their requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((req) => {
                  const feat = SYSTEM_FEATURES_MAP[req.feature_key as FeatureKey];
                  const isPending = req.status === "pending";

                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors",
                        isPending
                          ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {req.display_name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {req.display_name || req.user_email}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {req.user_role || "cashier"}
                            </span>
                            <span className="text-slate-400 text-xs">requests access to</span>
                            <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                              {feat?.label || req.feature_key}
                            </span>
                          </div>

                          {req.reason ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                              "{req.reason}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No note provided.</p>
                          )}

                          <p className="text-[10px] font-mono text-slate-400">
                            Submitted on {new Date(req.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReviewRequest(req.id, "approved")}
                              className="h-7 px-3 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve &amp; Unlock</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewRequest(req.id, "rejected")}
                              className="h-7 px-2.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase",
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                            )}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Create Admin / User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Admin / Staff</h3>
                  <p className="text-[11px] text-slate-500">Provide login credentials for direct sign-in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Ashwin Bishnoi"
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@credsmart.online"
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full h-8.5 pl-3 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  System Role
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData((p) => ({ ...p, role: e.target.value }))}
                  className="w-full h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="admin">Administrator (Full Access &amp; Feature Control)</option>
                  <option value="owner">Store Owner (Supreme Authority)</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Counter Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="salesman">Salesman</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="h-8.5 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="h-8.5 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isSubmittingUser ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
