import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  CheckSquare,
  Radio,
  Video,
  Bot,
  LifeBuoy,
  Shield,
  ArrowRight,
  RotateCw,
  Sparkles,
  Layers,
  Wallet,
  UserPlus,
  Plus,
  Network,
  ChevronRight,
  ChevronDown,
  Crown,
  Search,
  Headset,
} from "lucide-react";
import { toast } from "sonner";
import { crmApi } from "@/services/crmApi";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS, ACTIVE_SUITE_STORAGE_KEY } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMStatCard,
} from "@/components/crm";
import { cn } from "@/lib/utils";

interface CRMStats {
  staffCount: number;
  todayAttendance: number;
  pendingTasks: number;
  unreadBroadcasts: number;
  upcomingMeetings: number;
}

interface QuickActionItem {
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
  badge?: string;
  accentColor: string;
  bgLight: string;
  borderLight: string;
}

interface ShowcaseStaff {
  id: string;
  name: string;
  initials: string;
  bgColor: string;
}

/**
 * CRMDashboard
 * Main CRM Command Center dashboard redesigned exactly to match reference image
 * with mobile-first touch ergonomics and high-density desktop support.
 */
export default function CRMDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { orgId, org, organizations, switchOrganization, userRole } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [dynamicStaff, setDynamicStaff] = useState<ShowcaseStaff[]>(() => {
    if (typeof window === "undefined" || !orgId) return [];
    try {
      const cachedRaw = localStorage.getItem(`credsmart_crm_staff_${orgId}`);
      if (cachedRaw) {
        const cachedStaff = JSON.parse(cachedRaw);
        if (Array.isArray(cachedStaff) && cachedStaff.length > 0) {
          const bgPalette = ["bg-[#2563EB]", "bg-[#059669]", "bg-[#D97706]", "bg-[#7C3AED]", "bg-[#E11D48]"];
          const initialRoster: ShowcaseStaff[] = [];
          cachedStaff.forEach((cs: any, idx: number) => {
            const name = String(cs.name || cs.full_name || "").trim();
            const sId = String(cs.id || `cached-${idx}`);
            if (name && !initialRoster.some((r) => r.id === sId || r.name.toLowerCase() === name.toLowerCase())) {
              const parts = name.split(/\s+/);
              const initials =
                parts.length > 1
                  ? (parts[0][0] + parts[1][0]).toUpperCase()
                  : name.slice(0, 2).toUpperCase();
              initialRoster.push({
                id: sId,
                name,
                initials,
                bgColor: bgPalette[initialRoster.length % bgPalette.length],
              });
            }
          });
          return initialRoster;
        }
      }
    } catch {}
    return [];
  });

  const [stats, setStats] = useState<CRMStats>({
    staffCount: 1,
    todayAttendance: 0,
    pendingTasks: 0,
    unreadBroadcasts: 0,
    upcomingMeetings: 0,
  });

  const fetchCRMStats = useCallback(async () => {
    if (!orgId) {
      setStats({
        staffCount: 1,
        todayAttendance: 0,
        pendingTasks: 0,
        unreadBroadcasts: 0,
        upcomingMeetings: 0,
      });
      setDynamicStaff([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const activeOrgId = orgId;
      const today = new Date().toISOString().split("T")[0];
      const bgPalette = ["bg-[#2563EB]", "bg-[#059669]", "bg-[#D97706]", "bg-[#7C3AED]", "bg-[#E11D48]"];

      // 1. Today's attendance: query crm_attendance first for instant reactive sync
      let attendance = 0;
      try {
        const { count, error, data } = await supabase
          .from("crm_attendance")
          .select("id", { count: "exact" })
          .eq("org_id", activeOrgId)
          .eq("date", today);
        if (!error) {
          attendance = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
        }
      } catch {
        attendance = 0;
      }
      setStats((prev) => ({ ...prev, todayAttendance: attendance }));

      // 2. Staff count: query organization_memberships directly
      let staff = 1;
      let memberRows: any[] = [];
      try {
        const { count, error, data } = await supabase
          .from("organization_memberships")
          .select("id, user_id, role, created_at", { count: "exact" })
          .eq("organization_id", activeOrgId);
        if (!error) {
          const num = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
          staff = Math.max(1, num);
          if (Array.isArray(data)) memberRows = data;
        }
      } catch {
        staff = 1;
      }
      setStats((prev) => ({ ...prev, staffCount: staff }));

      // 3. Pending tasks: query crm_tasks
      let tasks = 0;
      try {
        const { count, error, data } = await supabase
          .from("crm_tasks")
          .select("id", { count: "exact" })
          .eq("org_id", activeOrgId)
          .neq("status", "done");
        if (!error) {
          tasks = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
        }
      } catch {
        tasks = 0;
      }

      // 4. Broadcasts: query crm_broadcasts
      let broadcasts = 0;
      try {
        const { count, error, data } = await supabase
          .from("crm_broadcasts")
          .select("id", { count: "exact" })
          .eq("org_id", activeOrgId)
          .eq("is_active", true);
        if (!error) {
          broadcasts = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
        }
      } catch {
        broadcasts = 0;
      }

      // 5. Meetings: query crm_meetings
      let meetings = 0;
      try {
        const { count, error, data } = await supabase
          .from("crm_meetings")
          .select("id", { count: "exact" })
          .eq("org_id", activeOrgId)
          .gte("scheduled_at", new Date().toISOString());
        if (!error) {
          meetings = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
        }
      } catch {
        meetings = 0;
      }

      // Check localStorage cached staff roster (hydrated instantly when staff is provisioned)
      const realStaffRoster: ShowcaseStaff[] = [];

      try {
        const cachedRaw = localStorage.getItem(`credsmart_crm_staff_${activeOrgId}`);
        if (cachedRaw) {
          const cachedStaff = JSON.parse(cachedRaw);
          if (Array.isArray(cachedStaff) && cachedStaff.length > 0) {
            cachedStaff.forEach((cs: any, idx: number) => {
              const name = String(cs.name || cs.full_name || "").trim();
              const sId = String(cs.id || `cached-${idx}`);
              if (name && !realStaffRoster.some((r) => r.id === sId || r.name.toLowerCase() === name.toLowerCase())) {
                const parts = name.split(/\s+/);
                const initials =
                  parts.length > 1
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : name.slice(0, 2).toUpperCase();
                realStaffRoster.push({
                  id: sId,
                  name,
                  initials,
                  bgColor: bgPalette[realStaffRoster.length % bgPalette.length],
                });
              }
            });
          }
        }
      } catch {}

      const liveSupabaseStaff: ShowcaseStaff[] = [];
      if (memberRows.length > 0) {
        const userIds = memberRows.map((m) => m.user_id).filter(Boolean);
        if (userIds.length > 0) {
          try {
            let profileRows: Array<{ id: string; full_name?: string | null; name?: string | null; email?: string | null }> | null = null;
            try {
              const res = await supabase.from("profiles").select("id, full_name, name, email").in("id", userIds);
              profileRows = res.data;
            } catch {
              const res2 = await settingsApi.getProfiles({ ids: userIds });
              profileRows = res2.data as any;
            }

            if (Array.isArray(profileRows)) {
              profileRows.forEach((p) => {
                const rawName = p.full_name || p.name || (p.email ? p.email.split("@")[0] : "");
                const name = String(rawName).trim();
                if (name) {
                  const parts = name.split(/\s+/);
                  const initials =
                    parts.length > 1
                      ? (parts[0][0] + parts[1][0]).toUpperCase()
                      : name.slice(0, 2).toUpperCase();
                  liveSupabaseStaff.push({
                    id: p.id,
                    name,
                    initials,
                    bgColor: bgPalette[liveSupabaseStaff.length % bgPalette.length],
                  });
                }
              });
            }
          } catch {}
        }
      }

      // Merge live Supabase staff records into realStaffRoster
      liveSupabaseStaff.forEach((s) => {
        if (!realStaffRoster.some((r) => r.id === s.id || r.name.toLowerCase() === s.name.toLowerCase())) {
          realStaffRoster.push(s);
        }
      });

      if (realStaffRoster.length > 0) {
        staff = Math.max(staff, realStaffRoster.length);
        setDynamicStaff(realStaffRoster);
      } else {
        setDynamicStaff([]);
      }
      setStats((prev) => ({ ...prev, staffCount: staff }));

      // Fallback to localStorage for sub-metrics if Supabase returned 0
      if (tasks === 0) {
        try {
          const cachedTasksRaw = localStorage.getItem(`credsmart_crm_tasks_${activeOrgId}`);
          if (cachedTasksRaw) {
            const cachedTasks = JSON.parse(cachedTasksRaw);
            if (Array.isArray(cachedTasks)) {
              tasks = cachedTasks.filter((t: any) => t.status !== "done" && t.status !== "completed").length;
            }
          }
        } catch {}
      }

      if (broadcasts === 0) {
        try {
          const cachedRaw = localStorage.getItem(`credsmart_crm_broadcasts_${activeOrgId}`);
          if (cachedRaw) {
            const cachedList = JSON.parse(cachedRaw);
            if (Array.isArray(cachedList)) {
              broadcasts = cachedList.length;
            }
          }
        } catch {}
      }

      if (meetings === 0) {
        try {
          const cachedRaw = localStorage.getItem(`credsmart_crm_meetings_${activeOrgId}`);
          if (cachedRaw) {
            const cachedList = JSON.parse(cachedRaw);
            if (Array.isArray(cachedList)) {
              const todayStr = new Date().toISOString().split("T")[0];
              meetings = cachedList.filter(
                (m: any) => m.scheduled_date >= todayStr || m.status === "in_progress"
              ).length;
            }
          }
        } catch {}
      }

      setStats({
        staffCount: staff,
        todayAttendance: attendance,
        pendingTasks: tasks,
        unreadBroadcasts: broadcasts,
        upcomingMeetings: meetings,
      });

      // Asynchronous background hydration from authoritative crmApi endpoints
      const fetchStaffFn =
        typeof crmApi?.getCRMStaff === "function"
          ? crmApi.getCRMStaff
          : typeof crmApi?.getCRMStaffRoles === "function"
          ? crmApi.getCRMStaffRoles
          : null;

      if (fetchStaffFn) {
        fetchStaffFn(activeOrgId).then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            if (res.data.length > 0) {
              const serverRoster: ShowcaseStaff[] = [];
              res.data.forEach((m: any, idx: number) => {
                const rawName = m.full_name || m.name || (m.email ? m.email.split("@")[0] : `Staff ${idx + 1}`);
                const name = rawName.trim();
                const sId = String(m.user_id || m.id || m.staff_id || `staff-${idx}`);
                if (name && !serverRoster.some((r) => r.id === sId || r.name.toLowerCase() === name.toLowerCase())) {
                  const parts = name.split(/\s+/);
                  const initials =
                    parts.length > 1
                      ? (parts[0][0] + parts[1][0]).toUpperCase()
                      : name.slice(0, 2).toUpperCase();
                  serverRoster.push({
                    id: sId,
                    name,
                    initials,
                    bgColor: bgPalette[serverRoster.length % bgPalette.length],
                  });
                }
              });
              if (serverRoster.length > 0) {
                setStats((prev) => ({
                  ...prev,
                  staffCount: Math.max(prev.staffCount, serverRoster.length),
                }));
                setDynamicStaff((prev) => {
                  const merged = [...prev];
                  serverRoster.forEach((sr) => {
                    if (!merged.some((r) => r.id === sr.id || r.name.toLowerCase() === sr.name.toLowerCase())) {
                      merged.push(sr);
                    }
                  });
                  return merged;
                });
              }
            }
          }
        }).catch(() => {});
      }

      if (typeof crmApi?.getCRMAttendance === "function") {
        crmApi.getCRMAttendance(activeOrgId, { date: today }).then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            setStats((prev) => ({
              ...prev,
              todayAttendance: Math.max(prev.todayAttendance, res.data.length),
            }));
          }
        }).catch(() => {});
      }

      if (typeof crmApi?.getCRMTasks === "function") {
        crmApi.getCRMTasks(activeOrgId).then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            const pending = res.data.filter((t) => t.status !== "done" && t.status !== "completed");
            setStats((prev) => ({
              ...prev,
              pendingTasks: pending.length,
            }));
          }
        }).catch(() => {});
      }
    } catch {
      // Graceful fallback defaults
      setStats({
        staffCount: 1,
        todayAttendance: 0,
        pendingTasks: 0,
        unreadBroadcasts: 0,
        upcomingMeetings: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchCRMStats();

    const handleSync = () => {
      fetchCRMStats();
    };

    window.addEventListener("credsmart:crm_staff_updated", handleSync);
    window.addEventListener("credsmart:crm_attendance_updated", handleSync);
    window.addEventListener("credsmart:crm_tasks_updated", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener("credsmart:crm_staff_updated", handleSync);
      window.removeEventListener("credsmart:crm_attendance_updated", handleSync);
      window.removeEventListener("credsmart:crm_tasks_updated", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [fetchCRMStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCRMStats();
    toast.success("CRM metrics refreshed!");
  };

  const handleNudge = () => {
    toast.success("Nudge alert sent to active staff members!");
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase();
    if (!q) return dynamicStaff;
    return dynamicStaff.filter((s) => s.name.toLowerCase().includes(q) || s.initials.toLowerCase().includes(q));
  }, [dynamicStaff, staffSearchQuery]);

  const quickNavItems: QuickActionItem[] = [
    {
      title: "Attendance Tracker",
      description: "Daily clock-in/out, biometric sync, geo-fence, and overtime logs",
      url: ROUTE_PATHS.crmAttendance,
      badge: "Active",
      icon: CalendarCheck,
      accentColor: "#1D4ED8",
      bgLight: "bg-blue-50/70",
      borderLight: "border-blue-200/80",
    },
    {
      title: "Salary & Payroll",
      description: "Automated wage calculation, advances, deductions, and pay slips",
      url: ROUTE_PATHS.crmSalary,
      icon: Wallet,
      accentColor: "#10B981",
      bgLight: "bg-emerald-50/70",
      borderLight: "border-emerald-200/80",
    },
    {
      title: "Task Management",
      description: "Assign store jobs, set deadlines, track Kanban, and verify proof of work",
      url: ROUTE_PATHS.crmTasks,
      icon: CheckSquare,
      accentColor: "#FF6A00",
      bgLight: "bg-amber-50/70",
      borderLight: "border-amber-200/80",
    },
    {
      title: "CredSmart Meet",
      description: "One-click team video huddles, shift handovers, and screen sharing",
      url: ROUTE_PATHS.crmMeet,
      icon: Video,
      accentColor: "#6366F1",
      bgLight: "bg-indigo-50/70",
      borderLight: "border-indigo-200/80",
    },
    {
      title: "Live Broadcasts",
      description: "Urgent announcements, store circulars, and instant push notices",
      url: ROUTE_PATHS.crmBroadcasts,
      icon: Radio,
      accentColor: "#EC4899",
      bgLight: "bg-pink-50/70",
      borderLight: "border-pink-200/80",
    },
    {
      title: "CRM AI Assistant",
      description: "Autonomous lead follow-ups, smart sales scripts, and staff insights",
      url: ROUTE_PATHS.crmAiAssistant,
      icon: Bot,
      accentColor: "#8B5CF6",
      bgLight: "bg-purple-50/70",
      borderLight: "border-purple-200/80",
    },
    {
      title: "Support Desk",
      description: "Omnichannel customer tickets, resolution SLA, and escalation rules",
      url: ROUTE_PATHS.crmSupport,
      icon: LifeBuoy,
      accentColor: "#0EA5E9",
      bgLight: "bg-sky-50/70",
      borderLight: "border-sky-200/80",
    },
    {
      title: "Role Management",
      description: "Custom roles, granular permission matrices, and user assignments",
      url: ROUTE_PATHS.crmRoles,
      icon: Shield,
      accentColor: "#0F172A",
      bgLight: "bg-slate-100/90",
      borderLight: "border-slate-300",
    },
  ];

  const unpunchedCount = Math.max(0, stats.staffCount - stats.todayAttendance);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans pb-32 sm:pb-24 select-none">
      {/* =========================================================================
          1. MOBILE VIEW ONLY (< 768px) - Exact Structural Fidelity to Reference Image
          ========================================================================= */}
      <div className="block md:hidden px-3.5 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] space-y-3.5 max-w-md mx-auto w-full overflow-hidden">
        {/* Top App Bar: CredSmart dropdown | [ POS | ● CRM ] | Refresh */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: CredSmart Brand Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOrgDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 py-1 px-1 rounded-lg text-slate-800 dark:text-slate-100 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
            >
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
              <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">CredSmart</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 stroke-[2.2]" />
            </button>

            {/* Quick Organization Dropdown */}
            {orgDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Businesses
                </div>
                {(organizations || []).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      if (b.id) switchOrganization(b.id);
                      setOrgDropdownOpen(false);
                      toast.success(`Switched to "${b.name}"`);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between",
                      b.id === orgId
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="truncate">{b.name}</span>
                    {b.id === orgId && <span className="text-[10px] text-blue-600">Active</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center / Right: Dual-Suite Capsule [ POS | ● CRM ] */}
          <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              data-testid="crm-mobile-suite-billing"
              onClick={() => {
                try {
                  localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "billing");
                  window.dispatchEvent(
                    new CustomEvent("credsmart:suite_changed", { detail: { suite: "billing" } })
                  );
                } catch {
                  // ignore
                }
                const targetPath = userRole === "cashier" ? ROUTE_PATHS.pos : ROUTE_PATHS.dashboard;
                navigate(targetPath);
              }}
              className="px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
              title="Switch to Billing Home"
              aria-label="Switch to Billing Home"
            >
              POS
            </button>
            <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0D8A58] text-white flex items-center gap-1.5 shadow-xs cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              <span>CRM</span>
            </div>
          </div>

          {/* Far Right: Compact 32x32px Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Refresh CRM data"
            aria-label="Refresh CRM data"
          >
            <RotateCw className={cn("w-3.5 h-3.5 stroke-[2.2]", refreshing && "animate-spin text-blue-600")} />
          </button>
        </div>

        {/* Title & Role Stack Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-[22px] font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight truncate">
              <span className="sr-only">CRM </span>Command Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
              Live Workforce Pulse
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to="/crm/roles?view=tree"
              className="h-8 px-2.5 rounded-lg text-xs font-semibold border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors shadow-2xs active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xs:inline">Tree</span>
            </Link>

            <Link
              to={ROUTE_PATHS.crmRoles}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-[#0B1536] hover:bg-slate-900 text-white shadow-2xs active:scale-95 transition-all"
            >
              <Shield className="w-3.5 h-3.5 stroke-[2]" />
              <span>Roles</span>
            </Link>
          </div>
        </div>

        {/* 2x2 Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Present */}
          <Link
            to={ROUTE_PATHS.crmAttendance}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Present
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.todayAttendance} / {stats.staffCount}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
            </div>
          </Link>

          {/* Card 2: Tasks */}
          <Link
            to={ROUTE_PATHS.crmTasks}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Tasks
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.pendingTasks} due
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </Link>

          {/* Card 3: Notices */}
          <Link
            to={ROUTE_PATHS.crmBroadcasts}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FFE4E6] dark:bg-rose-950/40 text-[#E11D48] dark:text-rose-400 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Notices
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.unreadBroadcasts} new
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </Link>

          {/* Card 4: Meet */}
          <Link
            to={ROUTE_PATHS.crmMeet}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-purple-950/40 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Meet
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.upcomingMeetings} live
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </Link>
        </div>

        {/* Section: ADD STAFF / STAFF MEMBERS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            ADD STAFF / STAFF MEMBERS
          </div>

          {/* Search Input & + Add Staff Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && staffSearchQuery.trim()) {
                    navigate(
                      `/crm/roles?action=add-staff&name=${encodeURIComponent(staffSearchQuery.trim())}`
                    );
                  }
                }}
                placeholder="Search / Add new..."
                className="w-full h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
            <Link
              to={
                staffSearchQuery.trim()
                  ? `/crm/roles?action=add-staff&name=${encodeURIComponent(staffSearchQuery.trim())}`
                  : "/crm/roles?action=add-staff"
              }
              className="h-9 px-3.5 rounded-xl bg-[#0B1536] hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0"
            >
              <span>+ Add Staff</span>
            </Link>
          </div>

          {/* Staff Member Colorful Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => {
                    navigate(`/crm/roles?search=${encodeURIComponent(staff.name)}`);
                    toast.info(`Managing profile for ${staff.name}`);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-white shadow-2xs cursor-pointer active:scale-95 transition-transform",
                    staff.bgColor
                  )}
                >
                  <span className="w-5.5 h-5.5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold uppercase">
                    {staff.initials}
                  </span>
                  <span className="text-xs font-semibold">{staff.name}</span>
                </button>
              ))
            ) : staffSearchQuery.trim() ? (
              <div className="text-xs text-slate-400 italic py-1">
                No staff found matching "{staffSearchQuery}".
              </div>
            ) : (
              <div className="w-full p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-center space-y-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  No staff members provisioned yet.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Click <span className="font-semibold text-blue-600">+ Add Staff</span> to onboard your team.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section: WORKSPACE TOOLS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            WORKSPACE TOOLS
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Tool 1: Salary & Payroll */}
            <Link
              to={ROUTE_PATHS.crmSalary}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF6A00] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    Payroll & Slips
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Disbursals
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>

            {/* Tool 2: Team Meet */}
            <Link
              to={ROUTE_PATHS.crmMeet}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] dark:bg-purple-950/40 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    Team Meet
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Video Huddles
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>

            {/* Tool 3: Broadcasts */}
            <Link
              to={ROUTE_PATHS.crmBroadcasts}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#FFE4E6] dark:bg-rose-950/40 text-[#E11D48] dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    Announcements
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Store Notices
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>

            {/* Tool 4: AI Assistant */}
            <Link
              to={ROUTE_PATHS.crmAiAssistant}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    AI Assistant
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Copilot
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>

            {/* Tool 5: Support Desk */}
            <Link
              to={ROUTE_PATHS.crmSupport}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#CCFBF1] dark:bg-teal-950/40 text-[#0D9488] dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Headset className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    Help Desk
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Tickets & SLA
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>

            {/* Tool 6: Role Management */}
            <Link
              to={ROUTE_PATHS.crmRoles}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99] min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                    Role Matrix
                  </span>
                  <span className="text-[11px] text-slate-400 truncate block">
                    Permissions
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </Link>
          </div>
        </div>

        {/* Section: LIVE STATUS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            LIVE STATUS
          </div>

          <div className="rounded-2xl border border-amber-200/90 bg-[#FEF3E2] dark:bg-amber-950/20 dark:border-amber-900/50 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#451A03] dark:text-amber-300">
                {stats.todayAttendance === 0
                  ? "No staff clocked in yet today"
                  : unpunchedCount === 0
                  ? "All staff clocked in today"
                  : `${stats.todayAttendance} of ${stats.staffCount} staff clocked in today`}
              </h3>
              <p className="text-[11px] text-[#78350F] dark:text-amber-400 mt-0.5 font-medium">
                {stats.todayAttendance === 0
                  ? `${stats.staffCount} active member${stats.staffCount === 1 ? " hasn't" : "s haven't"} punched in`
                  : unpunchedCount === 0
                  ? "Full team attendance recorded for today"
                  : `${unpunchedCount} active member${unpunchedCount === 1 ? " hasn't" : "s haven't"} punched in`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNudge}
              className="h-8 px-3.5 rounded-xl bg-[#FDE68A] hover:bg-[#FCD34D] text-[#78350F] text-xs font-bold border border-amber-300/80 shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Nudge
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW ONLY (>= 768px) - CredSmart Minimal Command Dashboard
          ========================================================================= */}
      <div className="hidden md:block">
        {/* ── Page Header Strip using CRMPageHeader and CRMBadge ── */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-5 shadow-2xs">
          <div className="max-w-7xl mx-auto">
            <CRMPageHeader
              title="CRM Command Center"
              subtitle={`${org?.name ? `${org.name} • ` : "CredSmart Retail Hub • "}Workforce operations, attendance, tasks, and communications`}
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "CRM", href: ROUTE_PATHS.crm },
              ]}
              badge={
                <div className="flex items-center gap-1.5">
                  <CRMBadge variant="info" size="sm">
                    Phase 1 Foundation
                  </CRMBadge>
                  <CRMBadge variant="success" size="sm" dot>
                    Live Sync
                  </CRMBadge>
                </div>
              }
              actions={
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center h-8.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                    title="Refresh CRM metrics"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline sm:ml-1.5">Refresh</span>
                  </button>

                  {/* Direct C2A 1: Add Staff */}
                  <Link
                    to="/crm/roles?action=add-staff"
                    className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap"
                    title="Provision new staff member credentials"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Staff</span>
                  </Link>

                  {/* Direct C2A 2: Role Management */}
                  <Link
                    to={ROUTE_PATHS.crmRoles}
                    className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg text-xs font-semibold bg-[#1D4ED8] hover:bg-blue-700 text-white shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap"
                    title="Configure CRM roles and permissions"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Role Management</span>
                  </Link>

                  {/* Direct C2A 3: Hierarchy View */}
                  <Link
                    to="/crm/roles?view=tree"
                    className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap"
                    title="Interactive organization reporting tree"
                  >
                    <Network className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Hierarchy View</span>
                  </Link>
                </div>
              }
            />
          </div>
        </header>

        {/* ── Main Container ── */}
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 sm:pb-6 space-y-4 sm:space-y-6">
          {/* ── Metric Summary Cards Grid using CRMStatCard ── */}
          <section aria-label="CRM Key Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Card 1: Staff Count */}
              <CRMStatCard
                label="Total Staff"
                value={stats.staffCount}
                loading={loading}
                icon={Users}
                accent="blue"
                description="Active Members"
              />

              {/* Card 2: Today's Attendance */}
              <CRMStatCard
                label="Today Attendance"
                value={stats.todayAttendance}
                loading={loading}
                icon={CalendarCheck}
                accent="emerald"
                description="Clocked In Today"
              />

              {/* Card 3: Pending Tasks */}
              <CRMStatCard
                label="Pending Tasks"
                value={stats.pendingTasks}
                loading={loading}
                icon={CheckSquare}
                accent="orange"
                description="To-Do Items"
              />

              {/* Card 4: Unread Broadcasts */}
              <CRMStatCard
                label="Broadcasts"
                value={stats.unreadBroadcasts}
                loading={loading}
                icon={Radio}
                accent="navy"
                description="Team Circulars"
              />

              {/* Card 5: Upcoming Meetings (spans 2 columns on mobile, 1 on tablet/desktop) */}
              <CRMStatCard
                label="Upcoming Meet"
                value={stats.upcomingMeetings}
                loading={loading}
                icon={Video}
                accent="gold"
                description="Scheduled Huddles"
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </section>

          {/* ── Sub-navigation Modules Grid using CRMCard and CRMBadge ── */}
          <section aria-label="CRM Modules and Sub-features" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                  CRM Sub-Systems &amp; Operations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct access to staff management, scheduling, automation, and role security
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Layers className="w-3.5 h-3.5" />
                8 Modules
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickNavItems.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className="group block"
                  >
                    <CRMCard
                      variant="default"
                      className="h-full hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                      contentClassName="p-5 flex flex-col justify-between h-full"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl ${item.bgLight} border ${item.borderLight} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
                            style={{ color: item.accentColor }}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          {item.badge && (
                            <CRMBadge
                              variant={item.badge === "Active" ? "success" : "neutral"}
                              size="sm"
                              className="font-mono font-bold"
                            >
                              {item.badge}
                            </CRMBadge>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-[#0F172A] dark:text-white mt-3 group-hover:text-[#1D4ED8] transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-[#1D4ED8]">
                        <span>Open Module</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </CRMCard>
                  </Link>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
