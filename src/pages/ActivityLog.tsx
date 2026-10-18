import { useState, useEffect, useMemo, useCallback } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { settingsApi } from "@/services/settingsApi";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Activity,
  Search,
  Filter,
  User,
  Clock,
  Package,
  ShoppingCart,
  ArrowUpDown,
  Settings,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileSpreadsheet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  profile?: { full_name: string | null };
}

const actionIcons: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  sale: { icon: ShoppingCart, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  stock_adjustment: { icon: ArrowUpDown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  product: { icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  purchase: { icon: FileSpreadsheet, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
  settings: { icon: Settings, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
};

const actionLabels: Record<string, string> = {
  sale_completed: "Completed Sales Invoice",
  stock_added: "Added Product Stock",
  stock_reduced: "Reduced Product Stock",
  product_created: "Registered New Item",
  product_updated: "Updated Product Details",
  purchase_created: "Created Purchase Order",
  purchase_received: "Received Inward Inventory",
};

export default function ActivityLog() {
  const { orgId, loading: orgLoading } = useOrganization();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await settingsApi.getAuditLogs(orgId, { limit: 200 });

      if (error) {
        console.error("fetchLogs error:", error);
        setLogs([]);
        return;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d) => d.user_id))].filter((id): id is string => Boolean(id));
        const profilesRes = userIds.length > 0
          ? await settingsApi.getProfiles({ ids: userIds })
          : { data: [] };
        const profiles = profilesRes.data ?? [];

        const enriched: AuditEntry[] = data.map((d) => ({
          ...d,
          details: typeof d.details === "object" && d.details !== null ? (d.details as Record<string, unknown>) : {},
          profile: profiles?.find((p) => p.id === d.user_id) || undefined,
        }));
        setLogs(enriched);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("fetchLogs unexpected error:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [fetchLogs, orgId, orgLoading]);

  const entityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.entity_type))).filter(Boolean);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchType = filterType === "all" || log.entity_type === filterType;
      const matchSearch =
        !search ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.profile?.full_name && log.profile.full_name.toLowerCase().includes(search.toLowerCase())) ||
        JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [logs, search, filterType]);

  const activeStaffCount = useMemo(() => {
    return new Set(logs.map((l) => l.user_id).filter(Boolean)).size;
  }, [logs]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedLogs,
    totalPages,
    totalItems: totalLogCount,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filtered, 25);

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Security Audit &amp; Activity Log
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>IMMUTABLE AUDIT TRAIL</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable operational logs, staff action timestamps, and critical system events
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 shadow-xs rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
            {logs.length} Recorded Events
          </Badge>
        </div>
      </div>

      {/* Summary KPI Bar - 3D Frosted Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Events */}
        <div className="glass-card-3d p-5 flex items-center gap-4 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">Logged Actions</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{logs.length}</p>
          </div>
        </div>

        {/* Active Staff */}
        <div className="glass-card-3d p-5 flex items-center gap-4 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">Staff Operators</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{activeStaffCount} Active Users</p>
          </div>
        </div>

        {/* Event Types */}
        <div className="glass-card-3d p-5 flex items-center gap-4 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">Activity Domains</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{entityTypes.length} Categories</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Pills - Frosted Glass Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, staff names, or specific invoice/batch numbers..."
              className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                filterType === "all"
                  ? "glowing-btn-blue text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              )}
            >
              All Events ({logs.length})
            </button>
            {entityTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap capitalize cursor-pointer",
                  filterType === t
                    ? "glowing-btn-blue text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-foreground"
                )}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Timeline Layout */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5 sm:p-8">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">No Activity Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              System events and audit records will automatically log here as team members make sales and adjust stock.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {paginatedLogs.map((log) => {
              const meta = actionIcons[log.entity_type] || {
                icon: Activity,
                color: "text-primary",
                bg: "bg-primary/10",
              };
              const IconComponent = meta.icon;
              const label = actionLabels[log.action] || log.action.replace(/_/g, " ");
              const time = new Date(log.created_at);
              const initials = log.profile?.full_name
                ? log.profile.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U";

              const detailsEntries = log.details
                ? Object.entries(log.details).filter(([k]) => !["user_name"].includes(k))
                : [];

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline node icon */}
                  <div
                    className={cn(
                      "absolute -left-[30px] sm:-left-[38px] top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-card flex items-center justify-center shadow-xs transition-transform group-hover:scale-110",
                      meta.bg,
                      meta.color
                    )}
                  >
                    <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Event Details Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/80 transition-all space-y-3">
                    {/* Event top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-foreground text-sm sm:text-base capitalize">
                          {label}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0"
                        >
                          {log.entity_type.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {time.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Key-Value Details Pill Container */}
                    {detailsEntries.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {detailsEntries.map(([k, v]) => (
                          <div
                            key={k}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border text-xs shadow-2xs"
                          >
                            <span className="text-muted-foreground font-medium capitalize">
                              {k.replace(/_/g, " ")}:
                            </span>
                            <span className="font-bold text-foreground">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Operator Avatar & Details */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {initials}
                      </div>
                      <span>
                        Operator:{" "}
                        <strong className="text-foreground font-semibold">
                          {log.profile?.full_name || "System Admin"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            <div className="pt-4">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalLogCount}
                startIndex={startIndex}
                endIndex={endIndex}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
