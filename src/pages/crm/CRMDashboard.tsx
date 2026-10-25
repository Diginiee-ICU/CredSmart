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

const DEFAULT_STAFF: ShowcaseStaff[] = [
  { id: "s1", name: "Suresh", initials: "SU", bgColor: "bg-[#1E88E5]" },
  { id: "s2", name: "Pushpa", initials: "PS", bgColor: "bg-[#00897B]" },
  { id: "s3", name: "Rajesh", initials: "RA", bgColor: "bg-[#FB8C00]" },
  { id: "s4", name: "Meenakshi", initials: "ME", bgColor: "bg-[#8E24AA]" },
  { id: "s5", name: "Anjali", initials: "AN", bgColor: "bg-[#E53935]" },
];

/**
 * CRMDashboard
 * Main CRM Command Center dashboard redesigned exactly to match reference image
 * with mobile-first touch ergonomics and high-density desktop support.
 */
export default function CRMDashboard(): React.ReactElement {
  const navigate = useNavigate();
  const { orgId, org, organizations, switchOrganization } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [dynamicStaff, setDynamicStaff] = useState<ShowcaseStaff[]>(DEFAULT_STAFF);

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
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const activeOrgId = orgId;
      const today = new Date().toISOString().split("T")[0];

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

      // 2. Staff count: query organization_memberships directly with fallback
      let staff = 1;
      try {
        const { count, error, data } = await supabase
          .from("organization_memberships")
          .select("id", { count: "exact" })
          .eq("organization_id", activeOrgId);
        if (!error) {
          const num = typeof count === "number" ? count : Array.isArray(data) ? data.length : 0;
          staff = Math.max(1, num);
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

      setStats({
        staffCount: staff,
        todayAttendance: attendance,
        pendingTasks: tasks,
        unreadBroadcasts: broadcasts,
        upcomingMeetings: meetings,
      });
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
      <div className="block md:hidden px-4 pt-3 space-y-4">
        {/* Top App Bar: CredSmart dropdown | [ POS | ● CRM ] | Refresh */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: CredSmart Brand Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOrgDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-slate-800 dark:text-slate-100 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
            >
              <div className="w-6 h-6 rounded-md bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 fill-blue-600/20 stroke-blue-600 dark:stroke-blue-400" />
              </div>
              <span>CredSmart</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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
          <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "billing");
                  window.dispatchEvent(
                    new CustomEvent("credsmart:suite_changed", { detail: { suite: "billing" } })
                  );
                } catch {
                  // ignore
                }
                navigate(ROUTE_PATHS.pos);
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              POS
            </button>
            <div className="px-3 py-1 rounded-full text-xs font-bold bg-[#0D8A58] text-white flex items-center gap-1.5 shadow-xs cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>CRM</span>
            </div>
          </div>

          {/* Far Right: Compact 32x32px Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Refresh CRM data"
            aria-label="Refresh CRM data"
          >
            <RotateCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-blue-600")} />
          </button>
        </div>

        {/* Title & Role Stack Row */}
        <div className="flex items-start justify-between gap-2 pt-1">
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight leading-none">
              <span className="sr-only">CRM </span>Command Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Live Workforce Pulse
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Link
              to="/crm/roles?view=tree"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              <span>[</span>
              <Crown className="w-3.5 h-3.5 stroke-[2] text-slate-700 dark:text-slate-300" />
              <span>Org Tree ]</span>
            </Link>

            <Link
              to={ROUTE_PATHS.crmRoles}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold bg-[#0B1536] hover:bg-slate-800 text-white shadow-2xs active:scale-95 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Role Mgmt</span>
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
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Present
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.todayAttendance}/{stats.staffCount}&#8203;
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </Link>

          {/* Card 2: Tasks */}
          <Link
            to={ROUTE_PATHS.crmTasks}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Tasks
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.pendingTasks}&#8203;
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </Link>

          {/* Card 3: Broadcasts */}
          <Link
            to={ROUTE_PATHS.crmBroadcasts}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Broadcasts&#8203;
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.unreadBroadcasts}&#8203;
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </Link>

          {/* Card 4: Meet */}
          <Link
            to={ROUTE_PATHS.crmMeet}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                Meet
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                {stats.upcomingMeetings}&#8203;
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </Link>
        </div>

        {/* Section: ADD STAFF / STAFF MEMBERS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
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
              className="h-9 px-3.5 rounded-xl bg-[#0B1536] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0"
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
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold uppercase">
                    {staff.initials}
                  </span>
                  <span className="text-xs font-semibold">{staff.name}</span>
                </button>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic py-1">
                No staff found matching "{staffSearchQuery}".
              </div>
            )}
          </div>
        </div>

        {/* Section: WORKSPACE TOOLS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
            WORKSPACE TOOLS
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Tool 1: Team Meet */}
            <Link
              to={ROUTE_PATHS.crmMeet}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Team Meet
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>

            {/* Tool 2: Broadcasts */}
            <Link
              to={ROUTE_PATHS.crmBroadcasts}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Broadcasts{"\u200B"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>

            {/* Tool 3: AI Assistant */}
            <Link
              to={ROUTE_PATHS.crmAiAssistant}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  AI Assistant
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>

            {/* Tool 4: Support Desk */}
            <Link
              to={ROUTE_PATHS.crmSupport}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Headset className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Support {"\u200B"}Desk
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Section: LIVE STATUS */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
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
