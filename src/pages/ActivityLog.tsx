import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileSpreadsheet,
  Zap,
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
  details: Record<string, any>;
  created_at: string;
  profile?: { full_name: string | null };
}

const actionIcons: Record<string, { icon: any; color: string; bg: string }> = {
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

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [orgId, orgLoading]);

  const fetchLogs = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, entity_type, entity_id, details, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("fetchLogs error:", error);
        setLogs([]);
        return;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d) => d.user_id))].filter(Boolean);
        let profiles: any[] | undefined = undefined;
        if (userIds.length > 0) {
          const { data: pData, error: pError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          if (pError) {
            console.error("fetchLogs profiles error:", pError);
          } else {
            profiles = pData || [];
          }
        }

        const enriched: AuditEntry[] = data.map((d) => ({
          ...d,
          details: (d.details as Record<string, any>) || {},
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
  };

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

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            Audit & Activity Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable operational logs, staff action timestamps, and critical system events
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-3 py-1.5 bg-card border-border text-xs font-semibold gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {logs.length} Recorded Events
          </Badge>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Events */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logged Actions</span>
            <p className="text-xl font-bold text-foreground mt-0.5">{logs.length}</p>
          </div>
        </div>

        {/* Active Staff */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff Operators</span>
            <p className="text-xl font-bold text-foreground mt-0.5">{activeStaffCount} Active Users</p>
          </div>
        </div>

        {/* Event Types */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Domains</span>
            <p className="text-xl font-bold text-foreground mt-0.5">{entityTypes.length} Categories</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, staff names, or specific invoice/batch numbers..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
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
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                filterType === "all"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Events ({logs.length})
            </button>
            {entityTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap capitalize",
                  filterType === t
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
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
            {filtered.map((log) => {
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
          </div>
        )}
      </div>
    </div>
  );
}
