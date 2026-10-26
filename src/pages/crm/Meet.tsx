import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Video,
  Plus,
  Copy,
  Check,
  Calendar,
  Clock,
  Users,
  Shield,
  Sparkles,
  Link as LinkIcon,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  Play,
  CalendarPlus,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMStatCard,
  CRMPermissionGate,
} from "@/components/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export type MeetingStatus = "upcoming" | "in_progress" | "completed";

export interface CRMMeeting {
  id: string;
  org_id: string;
  title: string;
  agenda: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  host_name: string;
  room_code: string;
  attendees_count: number;
  status: MeetingStatus;
  department: string;
}

const INITIAL_MEETINGS: CRMMeeting[] = [
  {
    id: "meet-1",
    org_id: "",
    title: "Morning Shift Opening Standup",
    agenda: "Review daily sales targets, cash drawer allocations, and special festive discounts",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "09:30 AM",
    duration_minutes: 15,
    host_name: "Store Manager",
    room_code: "standup-am-01",
    attendees_count: 6,
    status: "in_progress",
    department: "Retail Counter",
  },
  {
    id: "meet-2",
    org_id: "",
    title: "Warehouse & Inward Logistics Sync",
    agenda: "Verify bulk deliveries, damaged stock returns, and vendor credit reconciliation",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "02:00 PM",
    duration_minutes: 30,
    host_name: "Inventory Head",
    room_code: "godown-inward-02",
    attendees_count: 4,
    status: "upcoming",
    department: "Warehouse",
  },
  {
    id: "meet-3",
    org_id: "",
    title: "Evening Cash Register Handover & Closing Settlement",
    agenda: "Settle daily Day Book balances, tally live sync verification, and drawer lock",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "09:45 PM",
    duration_minutes: 20,
    host_name: "Head Cashier",
    room_code: "closing-pm-03",
    attendees_count: 5,
    status: "upcoming",
    department: "Cash & Billing",
  },
  {
    id: "meet-4",
    org_id: "",
    title: "Weekly Store Performance & Sales Target Review",
    agenda: "Weekly margin analysis, slow-moving items audit, and supplier payment scheduling",
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    scheduled_time: "05:00 PM",
    duration_minutes: 45,
    host_name: "Store Owner",
    room_code: "weekly-review-04",
    attendees_count: 12,
    status: "upcoming",
    department: "All Staff",
  },
];

export default function Meet(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin } = useCRMPermission();

  const canCreate = isSuperAdmin || hasPermission("meetings", "create");
  const storageKey = `credsmart_crm_meetings_${orgId || "default"}`;

  const [meetings, setMeetings] = useState<CRMMeeting[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_MEETINGS;
  });

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [instantRoomCode] = useState(() => `huddle-${Math.random().toString(36).substring(2, 8)}`);

  // New meeting form
  const [newTitle, setNewTitle] = useState("");
  const [newAgenda, setNewAgenda] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newDuration, setNewDuration] = useState("30");
  const [newDepartment, setNewDepartment] = useState("Retail Counter");

  const loadedOrgRef = useRef<string | null>(orgId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMeetings(JSON.parse(saved));
        loadedOrgRef.current = orgId;
        return;
      }
    } catch {}
    setMeetings(INITIAL_MEETINGS.map((m) => ({ ...m, org_id: orgId || "" })));
    loadedOrgRef.current = orgId;
  }, [storageKey, orgId]);

  useEffect(() => {
    if (orgId && loadedOrgRef.current === orgId && meetings.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(meetings));
    }
  }, [meetings, storageKey, orgId]);

  // Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCount = meetings.filter((m) => m.scheduled_date === todayStr).length;
    const inProgressCount = meetings.filter((m) => m.status === "in_progress").length;
    const totalMinutes = meetings.reduce((acc, m) => acc + m.duration_minutes, 0);
    const totalAttendees = meetings.reduce((acc, m) => acc + m.attendees_count, 0);
    return { todayCount, inProgressCount, totalMinutes, totalAttendees };
  }, [meetings]);

  const copyRoomLink = (roomCode: string) => {
    const fullUrl = `https://meet.credsmart.online/room/${roomCode}`;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(fullUrl);
    }
    setCopiedCode(roomCode);
    setTimeout(() => setCopiedCode(null), 2500);
    toast({
      title: "Huddle Link Copied ✓",
      description: `Share this link with your team: ${fullUrl}`,
    });
  };

  const handleLaunchRoom = (roomCode: string) => {
    const fullUrl = `https://meet.credsmart.online/room/${roomCode}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
    toast({
      title: "Launching CredSmart Meet",
      description: `Connecting to room #${roomCode}...`,
    });
  };

  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({ title: "Validation Error", description: "Meeting title is required", variant: "destructive" });
      return;
    }

    const created: CRMMeeting = {
      id: `meet-${Date.now()}`,
      org_id: orgId || "",
      title: newTitle.trim(),
      agenda: newAgenda.trim() || "Team briefing and updates",
      scheduled_date: newDate,
      scheduled_time: newTime,
      duration_minutes: parseInt(newDuration, 10) || 30,
      host_name: org?.name ? `${org.name} Host` : "You",
      room_code: `room-${Math.random().toString(36).substring(2, 8)}`,
      attendees_count: 5,
      status: "upcoming",
      department: newDepartment,
    };

    setMeetings((prev) => [created, ...prev]);
    setIsScheduleOpen(false);
    setNewTitle("");
    setNewAgenda("");
    toast({
      title: "Huddle Scheduled",
      description: `"${created.title}" scheduled for ${created.scheduled_date} at ${created.scheduled_time}.`,
    });
  };

  return (
    <CRMPermissionGate
      module="meetings"
      action="view"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <Video className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Meetings Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view store video meetings. Contact your manager for access.
          </p>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-32 sm:pb-20">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-5 shadow-2xs">
          <div className="max-w-7xl mx-auto">
            <CRMPageHeader
              title="CredSmart Meet & Video Huddles"
              subtitle={`${org?.name ? `${org.name} • ` : ""}Instant team video huddles, shift handovers, and scheduled conference rooms`}
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "CRM", href: ROUTE_PATHS.crm },
                { label: "Meet", href: ROUTE_PATHS.crmMeet },
              ]}
              badge={
                <CRMBadge variant="success" size="sm" dot>
                  WebRTC Ready
                </CRMBadge>
              }
              actions={
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      onClick={() => setIsScheduleOpen(true)}
                      size="sm"
                      className="bg-[#6366F1] hover:bg-indigo-600 text-white gap-1.5 text-xs h-9 shadow-xs"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Schedule Meeting</span>
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Metrics */}
          <section aria-label="Meeting Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <CRMStatCard
                label="Today's Huddles"
                value={metrics.todayCount}
                icon={Video}
                accent="navy"
                description="Scheduled For Today"
              />
              <CRMStatCard
                label="Live Rooms"
                value={metrics.inProgressCount}
                icon={PhoneCall}
                accent="emerald"
                description="Active Sessions"
              />
              <CRMStatCard
                label="Total Minutes"
                value={`${metrics.totalMinutes}m`}
                icon={Clock}
                accent="blue"
                description="Allocated Discussion"
              />
              <CRMStatCard
                label="Participants"
                value={metrics.totalAttendees}
                icon={Users}
                accent="gold"
                description="Invited Staff Members"
              />
            </div>
          </section>

          {/* Instant Room Generator Pod */}
          <section aria-label="Instant Room Launcher">
            <div className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/20 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Instant Team Huddle Room
                    </h3>
                    <CRMBadge variant="success" size="sm" dot>
                      Ready
                    </CRMBadge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                    Launch a high-definition, encrypted WebRTC video conference room instantly. No installation required.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 select-none mr-1">code:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{instantRoomCode}</strong>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyRoomLink(instantRoomCode)}
                    className="h-9 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                  >
                    {copiedCode === instantRoomCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === instantRoomCode ? "Copied!" : "Copy Link"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleLaunchRoom(instantRoomCode)}
                    className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Join Room Now</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Scheduled Huddles Grid */}
          <section aria-label="Scheduled Huddles" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                  Scheduled Meetings & Shift Handovers
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upcoming team syncs, daily opening standups, and departmental reviews
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500">
                {meetings.length} Sessions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetings.map((m) => {
                const isLive = m.status === "in_progress";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all",
                      isLive
                        ? "border-emerald-300 dark:border-emerald-900/60 ring-1 ring-emerald-500/20 bg-gradient-to-r from-emerald-50/20 to-white dark:from-emerald-950/10 dark:to-slate-900"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isLive ? (
                            <CRMBadge variant="success" size="sm" dot>
                              Live In Progress
                            </CRMBadge>
                          ) : (
                            <CRMBadge variant="neutral" size="sm">
                              Upcoming
                            </CRMBadge>
                          )}
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {m.department}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                          {m.title}
                        </h3>
                      </div>

                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {m.duration_minutes} mins
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {m.agenda}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{m.scheduled_time}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.scheduled_date}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyRoomLink(m.room_code)}
                          className="h-8 text-xs text-slate-500 hover:text-indigo-600"
                          title="Copy meeting link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleLaunchRoom(m.room_code)}
                          className={cn(
                            "h-8 text-xs font-semibold gap-1.5",
                            isLive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#1D4ED8] hover:bg-blue-700 text-white"
                          )}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isLive ? "Join Live" : "Open Room"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        {/* Modal: Schedule Meeting */}
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Schedule Team Huddle</DialogTitle>
              <DialogDescription className="text-xs">
                Set up a video room for shift briefings, cash handovers, or training.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleScheduleMeeting} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Meeting Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Evening Cash Handover & Ledger Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Agenda / Key Discussion Points
                </label>
                <Textarea
                  placeholder="Items to review during this huddle..."
                  value={newAgenda}
                  onChange={(e) => setNewAgenda(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Start Time
                  </label>
                  <Input
                    placeholder="e.g. 10:30 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Duration (Minutes)
                  </label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger className="text-xs h-9 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 mins (Standup)</SelectItem>
                      <SelectItem value="30">30 mins</SelectItem>
                      <SelectItem value="45">45 mins</SelectItem>
                      <SelectItem value="60">60 mins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <Select value={newDepartment} onValueChange={setNewDepartment}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retail Counter">Retail Counter</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="Cash & Billing">Cash & Billing</SelectItem>
                      <SelectItem value="All Staff">All Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Schedule Huddle
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CRMPermissionGate>
  );
}
