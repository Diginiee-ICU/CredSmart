import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMStatCard,
} from "@/components/crm";

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

/**
 * CRMDashboard
 * Main CRM Command Center dashboard integrating CredSmart Design System components.
 */
export default function CRMDashboard(): React.ReactElement {
  const { orgId, org } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CRMStats>({
    staffCount: 1,
    todayAttendance: 0,
    pendingTasks: 0,
    unreadBroadcasts: 0,
    upcomingMeetings: 0,
  });

  const fetchCRMStats = useCallback(async () => {
    try {
      const activeOrgId = orgId || "";

      // 1. Staff count: query organization_memberships
      let staff = 1;
      try {
        if (activeOrgId) {
          const { count, error } = await supabase
            .from("organization_memberships")
            .select("user_id", { count: "exact", head: true })
            .eq("organization_id", activeOrgId);

          if (!error && typeof count === "number" && count > 0) {
            staff = count;
          }
        }
      } catch {
        // Fallback to default of 1 for active store owner
        staff = 1;
      }

      // 2. Today's attendance: query crm_attendance with graceful fallback
      let attendance = 0;
      try {
        if (activeOrgId) {
          const today = new Date().toISOString().split("T")[0];
          const { count, error } = await supabase
            .from("crm_attendance")
            .select("id", { count: "exact", head: true })
            .eq("org_id", activeOrgId)
            .eq("date", today);

          if (!error && typeof count === "number") {
            attendance = count;
          }
        }
      } catch {
        attendance = 0;
      }

      // 3. Pending tasks: query crm_tasks with graceful fallback
      let tasks = 0;
      try {
        if (activeOrgId) {
          const { count, error } = await (supabase as unknown as {
            from: (t: string) => {
              select: (s: string, o: { count: string; head: boolean }) => {
                eq: (c: string, v: string) => {
                  neq: (c2: string, v2: string) => Promise<{ count: number | null; error: Error | null }>;
                };
              };
            };
          })
            .from("crm_tasks")
            .select("id", { count: "exact", head: true })
            .eq("org_id", activeOrgId)
            .neq("status", "completed");

          if (!error && typeof count === "number") {
            tasks = count;
          }
        }
      } catch {
        tasks = 0;
      }

      // 4. Unread broadcasts: query crm_broadcasts with graceful fallback
      let broadcasts = 0;
      try {
        if (activeOrgId) {
          const { count, error } = await (supabase as unknown as {
            from: (t: string) => {
              select: (s: string, o: { count: string; head: boolean }) => {
                eq: (c: string, v: string) => Promise<{ count: number | null; error: Error | null }>;
              };
            };
          })
            .from("crm_broadcasts")
            .select("id", { count: "exact", head: true })
            .eq("org_id", activeOrgId);

          if (!error && typeof count === "number") {
            broadcasts = count;
          }
        }
      } catch {
        broadcasts = 0;
      }

      // 5. Upcoming meetings: query crm_meetings with graceful fallback
      let meetings = 0;
      try {
        if (activeOrgId) {
          const nowStr = new Date().toISOString();
          const { count, error } = await (supabase as unknown as {
            from: (t: string) => {
              select: (s: string, o: { count: string; head: boolean }) => {
                eq: (c: string, v: string) => {
                  gte: (c2: string, v2: string) => Promise<{ count: number | null; error: Error | null }>;
                };
              };
            };
          })
            .from("crm_meetings")
            .select("id", { count: "exact", head: true })
            .eq("org_id", activeOrgId)
            .gte("start_time", nowStr);

          if (!error && typeof count === "number") {
            meetings = count;
          }
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
  };

  const quickNavItems: QuickActionItem[] = [
    {
      title: "Attendance Tracker",
      description: "Daily clock-in/out, biometric sync, geo-fence, and overtime logs",
      url: ROUTE_PATHS.crmAttendance,
      icon: CalendarCheck,
      badge: "Active",
      accentColor: "#1D4ED8",
      bgLight: "bg-blue-50/70",
      borderLight: "border-blue-200/80",
    },
    {
      title: "Salary & Payroll",
      description: "Automated wage calculation, advances, deductions, and pay slips",
      url: ROUTE_PATHS.crmSalary,
      icon: Award,
      badge: "Phase 2",
      accentColor: "#10B981",
      bgLight: "bg-emerald-50/70",
      borderLight: "border-emerald-200/80",
    },
    {
      title: "Task Management",
      description: "Assign store jobs, set deadlines, track Kanban, and verify proof of work",
      url: ROUTE_PATHS.crmTasks,
      icon: CheckSquare,
      badge: "Phase 3",
      accentColor: "#FF6A00",
      bgLight: "bg-amber-50/70",
      borderLight: "border-amber-200/80",
    },
    {
      title: "CredSmart Meet",
      description: "One-click team video huddles, shift handovers, and screen sharing",
      url: ROUTE_PATHS.crmMeet,
      icon: Video,
      badge: "Phase 4",
      accentColor: "#6366F1",
      bgLight: "bg-indigo-50/70",
      borderLight: "border-indigo-200/80",
    },
    {
      title: "Live Broadcasts",
      description: "Urgent announcements, store circulars, and instant push notices",
      url: ROUTE_PATHS.crmBroadcasts,
      icon: Radio,
      badge: "Phase 4",
      accentColor: "#EC4899",
      bgLight: "bg-pink-50/70",
      borderLight: "border-pink-200/80",
    },
    {
      title: "CRM AI Assistant",
      description: "Autonomous lead follow-ups, smart sales scripts, and staff insights",
      url: ROUTE_PATHS.crmAiAssistant,
      icon: Bot,
      badge: "Phase 5",
      accentColor: "#8B5CF6",
      bgLight: "bg-purple-50/70",
      borderLight: "border-purple-200/80",
    },
    {
      title: "Support Desk",
      description: "Omnichannel customer tickets, resolution SLA, and escalation rules",
      url: ROUTE_PATHS.crmSupport,
      icon: LifeBuoy,
      badge: "Phase 6",
      accentColor: "#0EA5E9",
      bgLight: "bg-sky-50/70",
      borderLight: "border-sky-200/80",
    },
    {
      title: "Role Management",
      description: "Custom roles, granular permission matrices, and user assignments",
      url: ROUTE_PATHS.crmRoles,
      icon: Shield,
      badge: "Active",
      accentColor: "#0F172A",
      bgLight: "bg-slate-100/90",
      borderLight: "border-slate-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-20">
      {/* ── Page Header Strip using CRMPageHeader and CRMBadge ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-5 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <CRMPageHeader
            title="CRM Command Center"
            subtitle={`${org?.name ? `${org.name} • ` : ""}Unified customer relations, team attendance, tasks, and communications`}
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "CRM", href: ROUTE_PATHS.crm },
            ]}
            badge={
              <div className="flex items-center gap-2">
                <CRMBadge variant="info" size="sm" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  Phase 1 Foundation
                </CRMBadge>
                <CRMBadge variant="success" size="sm" dot>
                  Live Sync
                </CRMBadge>
              </div>
            }
            actions={
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Refresh CRM metrics"
                >
                  <RotateCw className={`w-4 h-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <Link
                  to={ROUTE_PATHS.crmRoles}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1D4ED8] hover:bg-blue-700 text-white shadow-xs transition-all hover:shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                  <span>Role Management</span>
                </Link>
              </>
            }
          />
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── Metric Summary Cards Grid using CRMStatCard (Responsive 375px, 768px, 1280px) ── */}
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
                CRM Sub-Systems & Operations
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
  );
}
