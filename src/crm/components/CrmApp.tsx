import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  MapPin,
  ListChecks,
  Wallet,
  Users,
  Bell,
  Plus,
  Share2,
  FileText,
  Send,
  Globe,
  Lock,
  Check,
  X,
  Download,
  MessageCircle,
  Radar,
  LogIn,
  LogOut,
  Menu,
  UserCircle,
} from "lucide-react";
import "@/crm/styles/crm.css";
const logoFull = { url: "/logo.png" };
const logoShield = { url: "/favicon.png" };
import { OnboardingChecklist } from "./OnboardingChecklist";
import { CredAlertNudge } from "./CredAlertNudge";
import { AuthSheet, CompanyOnboarding, STAFF_COMPANY_KEY, StaffSignIn } from "./AuthOnboarding";
import { AdminProfile, ChangePasscode, LogoutButton } from "./ProfileDashboard";
import { toast } from "sonner";
import { supabase } from "@/crm/integrations/supabase/client";
import {
  actions,
  useStore,
  today,
  monthKey,
  money,
  payrollRow,
  fmtTime,
  untilPing,
  REMINDER_MS,
  haversine,
  waLink,
  connectWorkspace,
  watchWorkspace,
  currentWorkspaceId,
  connectStaff,
  disconnectStaff,
  onSaveError,
  type Employee,
  type Task,
  type TeamStatus,
  teamStatus,
  operatorRole,
} from "@/crm/lib/store";
import { Button, Avatar, Field, inputCls, Sheet } from "./primitives";
import { EmployeeGrid, StaffEditor, StaffScreen } from "./StaffManager";
import { Payroll } from "./Payroll";
import { QuickNotes } from "./QuickNotes";
import { TeamPulse, LiveHuddle } from "./TeamHub";
import { EmployeeShift, EmployeeNotices, EmployeeTasks, EmployeeTeam, EmployeeProfile } from "./EmployeePortal";
import { reminderActive } from "@/crm/lib/staff-portal";
import { VoiceCopilot } from "./VoiceCopilot";
import { MetallicCommand } from "./MetallicCommand";
import { setLang, useDomTranslation, useLang } from "@/crm/lib/i18n";
type Tab = "command" | "attendance" | "tasks" | "payroll" | "staff" | "profile";
const TABS = [
  { id: "command", label: "Command", icon: LayoutGrid },
  { id: "attendance", label: "Attendance", icon: MapPin },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "staff", label: "Staff & Roles", icon: Users },
] as const;
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);
  return now;
}
function AssignTask({ emp, initialText = "", staff, onClose }: { emp: Employee; initialText?: string; staff?: Employee | undefined; onClose: () => void }) {
  const [title, setTitle] = useState(initialText);
  const allEmployees = useStore((s) => s.employees);
  const employees = staff && !staff.permissions.assign ? allEmployees.filter((e) => e.id === staff.id) : allEmployees;
  const [assigneeId, setAssigneeId] = useState(emp.id);
  const [pub, setPub] = useState(true);
  return (
    <Sheet title="Assign Task" onClose={onClose}>
      <div className="flex items-center gap-3">
        <Avatar e={emp} />
        <div>
          <p className="text-sm font-semibold">{emp.name}</p>
          <p className="text-xs text-muted-foreground">{emp.designation}</p>
        </div>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          actions.addTask({ title: title.trim(), assigneeId, isPublic: pub });
          toast.success(`Assigned to ${employees.find((e) => e.id === assigneeId)?.name ?? emp.name}`);
          onClose();
        }}
      >
        <Field label="Assign to"><select className={inputCls} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="Task">
          <textarea
            autoFocus
            required
            className={`${inputCls} h-24 py-2`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <Button
              key={String(v)}
              type="button"
              className="rounded-xl text-xs"
              variant={pub === v ? "default" : "secondary"}
              onClick={() => setPub(v)}
            >
              {v ? <Globe /> : <Lock />}
              {v ? "Public" : "Private"}
            </Button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground inline-flex gap-1 items-center">
          <Bell className="size-3" />
          2-hour reminders
        </span>
        <Button type="submit" className="w-full rounded-xl">
          Assign Task
        </Button>
      </form>
    </Sheet>
  );
}
function AttendanceScreen({ employeeId }: { employeeId?: string | undefined }) {
  const s = useStore((s) => s);
  const [pulseFilter, setPulseFilter] = useState<TeamStatus | null>(null);
  const e = s.employees.find((e) => e.id === (employeeId ?? s.me)) ?? s.employees[0];
  const rec = s.attendance.find((a) => a.empId === e?.id && a.date === today());
  const live = !!rec?.inAt && !rec.outAt;
  const [busy, setBusy] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [radius, setRadius] = useState(String(s.workplace?.radius ?? 150));
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const locate = (cb: (p: { lat: number; lng: number }) => void) => {
    if (!navigator.geolocation) {
      toast.error("GPS is unavailable");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPosition(here);
        setDistance(s.workplace ? haversine(here, s.workplace) : null);
        cb(here);
      },
      (err) => {
        setBusy(false);
        toast.error(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  if (!e) return null;
  return (
    <section className="space-y-4">
      <TeamPulse filter={pulseFilter} onFilter={setPulseFilter} />
      <Field label="Clocking in as">
        <select className={inputCls} value={e.id} onChange={(ev) => actions.setMe(ev.target.value)}>
          {s.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-col items-center py-2 gap-3">
        <div
          className={`radar relative w-40 h-40 rounded-full grid place-items-center ${busy ? "scanning" : ""}`}
        >
          <Radar className="size-8 text-success" />
          <span className="absolute bottom-6 text-[10px] font-medium">
            {busy ? "Scanning…" : position ? "GPS located" : "GPS Radar"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {distance !== null ? `${distance} metres from workplace` : "Location not scanned"}
        </p>
        <Button
          disabled={busy}
          className="rounded-full h-10 px-8"
          variant={live ? "destructive" : "default"}
          onClick={() =>
            locate((here) => {
              if (!s.workplace) {
                toast.error("Set your workplace location first");
                return;
              }
              const d = haversine(here, s.workplace);
              const ok = d <= s.workplace.radius;
              if (!live && !ok && !e.permissions.outside) {
                toast.error("Outside the GPS geofence. Clock-in not allowed.");
                return;
              }
              actions.clock(e.id, live ? "out" : "in", d, ok);
              toast.success(live ? "Clocked out" : "Clocked in");
            })
          }
        >
          <MapPin />
          {busy ? "Locating…" : live ? "Clock Out" : "Clock In"}
        </Button>
        {live && <Button variant="secondary" className="h-8 text-xs" onClick={() => actions.setBreak(e.id, !rec?.onBreak)}>{rec?.onBreak ? "Back from Break" : "Start Break"}</Button>}
        <span className="text-[11px] bg-muted rounded-full px-3 py-1.5">
          In {fmtTime(rec?.inAt)} · Out {fmtTime(rec?.outAt)}
        </span>
        {rec && (
          <span className={`text-[11px] ${rec.verified ? "text-success" : "text-destructive"}`}>
            {rec.verified ? "GPS Verified" : "Outside zone"}
          </span>
        )}
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <h2 className="text-sm font-semibold">Geofence Settings</h2>
        <p className="text-[11px] text-muted-foreground">
          {s.workplace
            ? `${s.workplace.lat.toFixed(5)}, ${s.workplace.lng.toFixed(5)}`
            : "Workplace not set"}
        </p>
        <Field label="Radius (metres)">
          <input
            className={inputCls}
            type="number"
            min="1"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="rounded-xl text-xs px-2"
            disabled={busy}
            onClick={() => {
              if (Number(radius) <= 0) {
                toast.error("Enter a positive radius");
                return;
              }
              locate((p) => {
                actions.setWorkplace({ ...p, radius: Number(radius) });
                toast.success("Workplace saved");
              });
            }}
          >
            <MapPin />
            Set Current Spot
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl text-xs px-2"
            onClick={() => {
              if (!s.workplace || Number(radius) <= 0) {
                toast.error("Set a workplace and positive radius");
                return;
              }
              actions.setWorkplace({ ...s.workplace, radius: Number(radius) });
              toast.success("Radius updated");
            }}
          >
            Save Radius
          </Button>
        </div>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <h2 className="text-sm font-semibold">Today's Attendance</h2>
        {s.employees.filter((e) => (!employeeId || e.id === employeeId) && (!pulseFilter || teamStatus(e, s) === pulseFilter)).map((e) => {
          const a = s.attendance.find((a) => a.empId === e.id && a.date === today());
          return (
            <div key={e.id} className="flex gap-2 items-center py-1">
              <Avatar e={e} live={!!a?.inAt && !a.outAt} />
              <span className="text-xs flex-1 min-w-0 truncate">{e.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {teamStatus(e, s)} · {fmtTime(a?.inAt)} — {fmtTime(a?.outAt)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function TaskCard({ t, now }: { t: Task; now: number }) {
  const s = useStore((s) => s);
  const e = s.employees.find((e) => e.id === t.assigneeId);
  const [proof, setProof] = useState("");
  const [editing, setEditing] = useState(false);
  if (!e) return null;
  return (
    <div className="glass rounded-2xl p-3 space-y-2">
      <div className="flex gap-2">
        <Avatar e={e} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold break-words ${t.done ? "line-through text-muted-foreground" : ""}`}
          >
            {t.title}
          </p>
          <p className="text-[11px] text-muted-foreground">{e.name}</p>
        </div>
        {t.isPublic ? (
          <Globe className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="bg-muted rounded-full px-2 py-1">{t.isPublic ? "Public" : "Private"}</span>
        <span
          className={`rounded-full px-2 py-1 ${t.done ? "bg-success/15 text-success" : "bg-warning/20"}`}
        >
          {t.done
            ? "Approved & Done"
            : t.review === "pending"
              ? "Proof awaiting approval"
              : `Next ping ${untilPing(t, now)}`}
        </span>
      </div>
      {t.proof && <p className="text-xs break-words text-muted-foreground">{t.proof}</p>}
      {!!t.proofImages?.length && <div className="flex gap-2">{t.proofImages.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`Proof photo ${i + 1}`} className="size-16 object-cover rounded-lg" /></a>)}</div>}
      {t.review === "rejected" && (
        <p className="text-[11px] text-destructive">Proof returned. Submit an updated note.</p>
      )}
      {!t.done &&
        (t.review === "pending" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-success text-primary-foreground"
              onClick={() => actions.reviewProof(t.id, true)}
            >
              <Check />
              Approve Proof
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-xl"
              onClick={() => actions.reviewProof(t.id, false)}
            >
              <X />
              Return
            </Button>
          </div>
        ) : editing ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              actions.submitProof(t.id, proof);
              setEditing(false);
            }}
          >
            <textarea
              required
              aria-label="Proof of work note"
              placeholder="Proof of work note"
              className={`${inputCls} h-16 py-2`}
              value={proof}
              onChange={(e) => setProof(e.target.value)}
            />
            <Button type="submit" size="sm" className="w-full rounded-xl">
              Submit Proof
            </Button>
          </form>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full rounded-xl"
            onClick={() => setEditing(true)}
          >
            Submit Proof of Work
          </Button>
        ))}
    </div>
  );
}
function TasksScreen() {
  const tasks = useStore((s) => s.tasks);
  const now = useNow();
  const [filter, setFilter] = useState("All");
  const visible = tasks.filter(
    (t) =>
      filter === "All" ||
      (filter === "Public" ? t.isPublic : filter === "Private" ? !t.isPublic : t.done),
  );
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-xl">
        {["All", "Public", "Private", "Done"].map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "ghost"}
            className="text-xs rounded-lg px-1"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {visible.map((t) => (
          <TaskCard key={t.id} t={t} now={now} />
        ))}
      </div>
      {!visible.length && (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No {filter === "All" ? "" : filter.toLowerCase()} tasks
        </p>
      )}
    </section>
  );
}
function Eod({ onClose }: { onClose: () => void }) {
  const s = useStore((s) => s);
  const rows = s.employees.map((e) => ({
    e,
    a: s.attendance.find((a) => a.empId === e.id && a.date === today()),
    done: s.tasks.filter(
      (t) =>
        t.assigneeId === e.id &&
        t.done &&
        t.doneAt &&
        new Date(t.doneAt).toLocaleDateString("en-CA") === today(),
    ),
    pending: s.tasks.filter((t) => t.assigneeId === e.id && !t.done),
  }));
  const text =
    `CredSmart EOD — ${today()}\n\n` +
    rows
      .map(
        (r) =>
          `${r.e.name}\nIn ${fmtTime(r.a?.inAt)} · Out ${fmtTime(r.a?.outAt)}\n${r.done.length} done · ${r.pending.length} pending · ${r.pending.filter((t) => Date.now() - t.createdAt > 86400000).length} overdue\n` +
          r.done
            .filter((t) => t.proof)
            .map((t) => `${t.title}: ${t.proof}`)
            .join("\n"),
      )
      .join("\n\n");
  return (
    <Sheet title="End-of-Day Report" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="rounded-xl bg-success text-primary-foreground">
          <a href={waLink("", text)} target="_blank" rel="noreferrer">
            <MessageCircle />
            WhatsApp
          </a>
        </Button>
        <Button
          variant="secondary"
          className="rounded-xl"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `eod-${today()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download />
          Download
        </Button>
      </div>
      {rows.map((r) => (
        <div key={r.e.id} className="border-b border-border py-2">
          <p className="text-sm font-semibold">{r.e.name}</p>
          <p className="text-[11px] text-muted-foreground">
            In {fmtTime(r.a?.inAt)} · Out {fmtTime(r.a?.outAt)}
          </p>
          <p className="text-xs mt-1">
            {r.done.length} done · {r.pending.length} pending ·{" "}
            {r.pending.filter((t) => Date.now() - t.createdAt > 86400000).length} overdue
          </p>
          {r.done
            .filter((t) => t.proof)
            .map((t) => (
              <p key={t.id} className="text-[11px] mt-1">
                {t.title}: {t.proof}
              </p>
            ))}
        </div>
      ))}
    </Sheet>
  );
}
export function CrmApp() {
  const [tab, setTab] = useState<Tab>("command");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [voiceEmployeeId, setVoiceEmployeeId] = useState<string | undefined>();
  const voiceRef = useRef<{ open: () => void } | null>(null);
  const [assign, setAssign] = useState<Employee | null>(null);
  const [taskPrefill, setTaskPrefill] = useState("");
  const assignEmployee = (e: Employee) => { setTaskPrefill(""); setAssign(e); };
  const [manage, setManage] = useState<Employee | null | undefined>();
  const [eod, setEod] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [login, setLogin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [staffUser, setStaffUser] = useState(false);
  const [staffGate, setStaffGate] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const s = useStore((s) => s);
  const staff = staffUser ? s.employees.find((e) => e.id === s.me) : previewId ? s.employees.find((e) => e.id === previewId) : undefined;
  const tabs = TABS.filter((t) => !staff || t.id !== "payroll").map((t) => ({ ...t, label: staff ? ({ command: "Workspace", attendance: "Attendance", tasks: "Tasks", payroll: "My Pay", staff: "My Profile" }[t.id]) : t.label }));
  const dockTabs = tabs.map((t) => t.id === "staff" && !staff ? { ...t, label: "Staff" } : t);
  const [menu, setMenu] = useState(false);
  const go = (id: Tab) => { setVoiceEmployeeId(undefined); setTab(id); setMenu(false); };
  const logout = () => { setMenu(false); setTab("command"); if (staffUser) { void supabase.auth.signOut(); return; } if (staff) { changeView(null); toast.success("Logged out of staff workspace"); return; } if (signedIn) void supabase.auth.signOut(); else setLogin(true); };
  const changeView = (id: string | null) => { setPreviewId(id); setVoiceEmployeeId(undefined); setTab("command"); setAssign(null); setManage(undefined); setEod(false); setAlerts(false); setLogin(false); };
  const now = useNow();
  useEffect(() => {
    onSaveError((m) => toast.error(m));
    const join = new URLSearchParams(window.location.search).get("join");
    const remembered = localStorage.getItem(STAFF_COMPANY_KEY);
    let wasStaff = false;
    const sync = async (user: { id: string; app_metadata?: Record<string, unknown> } | null) => {
      setCloudBusy(true);
      try {
        if (user?.app_metadata?.["staff_employee"]) {
          wasStaff = true;
          await connectStaff();
          setStaffUser(true);
          setSignedIn(true);
          setStaffGate(null);
          setTab("command");
          void watchWorkspace(String(user.app_metadata["staff_workspace"] ?? "") || null, () => void connectStaff().catch(() => {}));
          return;
        }
        if (wasStaff || !user) {
          disconnectStaff();
          setStaffUser(false);
        }
        await connectWorkspace(user?.id ?? null);
        void watchWorkspace(user ? currentWorkspaceId() : null, () => { void connectWorkspace(user!.id).catch(() => {}); });
        setSignedIn(!!user);
        if (user) setStaffGate(null);
        else if (wasStaff || join) setStaffGate(join ?? remembered ?? "");
        wasStaff = false;
      } catch {
        if (user?.app_metadata?.["staff_employee"]) { toast.error("Your staff access was removed"); void supabase.auth.signOut(); }
        else toast.error("Could not load your Cloud workspace");
      } finally {
        setCloudBusy(false);
        setAuthChecked(true);
      }
    };
    supabase.auth.getSession().then(({ data }) => sync(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void sync(session?.user ?? null);
    });
    const refresh = () => { if (document.visibilityState === "visible") void supabase.auth.getSession().then(({ data }) => data.session && sync(data.session.user)); };
    document.addEventListener("visibilitychange", refresh);
    return () => { void watchWorkspace(null, () => {}); data.subscription.unsubscribe(); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => {
    s.tasks
      .filter((t) => reminderActive(t) && (!staff || t.assigneeId === staff.id) && now - t.lastPing >= REMINDER_MS)
      .forEach((t) => {
        toast(`Reminder: ${t.title}`);
        if (typeof Notification !== "undefined" && Notification.permission === "granted")
          new Notification("Task Reminder", { body: t.title });
        actions.ping(t.id);
      });
  }, [now, s.tasks, staff?.id]);
  const selected = tabs.find((t) => t.id === tab);
  useDomTranslation();
  const lang = useLang();
  return (
    <div data-crm-active-tab={tab} className={`min-h-dvh mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8 lg:p-6 ${staff ? "employee-portal" : ""}`} style={staff ? { "--employee-color": staff.color } as React.CSSProperties : undefined}>
      <aside className="hidden lg:flex flex-col gap-2 pt-2">
        <img src={logoFull.url} alt="CredSmart CRM by CredAlert" className="mb-5 px-1 w-full max-w-[180px]" data-no-i18n />
        {tabs.map(({ id, label, icon: I }) => (
          <Button
            key={id}
            data-crm-tab={id}
            variant={tab === id ? "default" : "ghost"}
            className="justify-start rounded-xl"
            onClick={() => { setVoiceEmployeeId(undefined); setTab(id); }}
          >
            <I />
            {label}
          </Button>
        ))}
      </aside>
      <main className="min-w-0 px-3.5 pt-4 pb-36 lg:p-0">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[9px] uppercase text-muted-foreground font-semibold mb-1 truncate">
              <img src={logoShield.url} alt="" className="size-4 shrink-0" data-no-i18n />
              {s.company?.name ?? "CredSmart CRM"}
            </p>
            <h1 className="command-title text-xl font-extrabold tracking-normal truncate">
              {tab === "command" ? staff ? "My Workspace" : "Command Center" : tab === "staff" && staff ? "My Profile & Team" : tab === "payroll" && staff ? "My Pay & Udhar" : tab === "profile" ? "My Profile" : selected?.label}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" className="h-7 px-2 text-[10px] rounded-full" data-no-i18n aria-label={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"} onClick={() => setLang(lang === "hi" ? "en" : "hi")}>
              {lang === "hi" ? "EN" : "हिंदी"}
            </Button>
            <span className="text-[9px] font-semibold bg-primary/10 text-primary rounded-full px-2 py-1">
              {staffUser ? "Staff" : staff ? "Staff Preview" : `${operatorRole(s)} Mode`}
            </span>
            {!staff && <Button variant="ghost" size="icon" className="size-8" title="Menu" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Menu /></Button>}
            <Button
              variant="ghost"
              size="icon"
              className="metal-silver size-8 rounded-full"
              title="Notifications"
              aria-label="Notifications"
              onClick={() => setAlerts(true)}
            >
              <Bell />
            </Button>
          </div>
        </header>
        {menu && !staff && <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <nav aria-label="Admin menu" className="glass fixed z-50 top-14 right-3.5 w-56 p-1.5 rounded-2xl shadow-2xl space-y-0.5">
            {[...tabs, { id: "profile" as const, label: "My Profile", icon: UserCircle }].map(({ id, label, icon: I }) => (
              <Button key={id} variant={tab === id ? "default" : "ghost"} className="w-full h-9 justify-start text-xs rounded-xl" onClick={() => go(id)}><I />{label}</Button>
            ))}
            <div className="border-t border-border my-1" />
            <Button variant="ghost" className="w-full h-9 justify-start text-xs rounded-xl text-destructive" onClick={logout}><LogOut />Log Out</Button>
          </nav>
        </>}
        {operatorRole(s) === "Admin" && !staffUser && <div className="mb-3 space-y-2"><div className="glass p-1 rounded-full grid grid-cols-2 gap-1"><Button className="h-8 text-xs rounded-full" variant={!staff ? "default" : "ghost"} onClick={() => changeView(null)}>👑 Admin View</Button><Button className="h-8 text-xs rounded-full" variant={staff ? "default" : "ghost"} onClick={() => { const e = s.employees.find((e) => e.role !== "Admin") ?? s.employees[0]; if (e) changeView(e.id); }}>👤 Staff View</Button></div>{staff && <select aria-label="Preview as employee" className={`${inputCls} text-xs`} value={staff.id} onChange={(ev) => changeView(ev.target.value)}>{s.employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}</select>}</div>}
        <div className="flex items-center justify-between mb-3 text-[10px] text-muted-foreground">
          <span>
            {cloudBusy ? "Syncing…" : signedIn ? "Private Cloud workspace" : "On this device"}
          </span>
          {!staff && <Button
            variant="ghost"
            className="h-6 text-[10px] px-1"
            onClick={() => (signedIn ? supabase.auth.signOut() : setLogin(true))}
          >
            {signedIn ? <LogOut /> : <LogIn />}
            {signedIn ? "Sign Out" : "Sign Up / Sign In"}
          </Button>}
        </div>
        {!staff && <LiveHuddle />}
        {staff && <div key={`${staff.id}-${tab}`} className="space-y-4">{tab === "command" && <><EmployeeNotices /><EmployeeTasks employee={staff} home onAssign={() => assignEmployee(staff)} /><EmployeeTeam employee={staff} /></>}{tab === "attendance" && <><EmployeeShift employee={staff} /><EmployeeTeam employee={staff} /></>}{tab === "tasks" && <EmployeeTasks employee={staff} onAssign={() => assignEmployee(staff)} />}{tab === "staff" && <><EmployeeProfile employee={staff} /><ChangePasscode employee={staff} /><LogoutButton onLogout={logout} /></>}</div>}
        {!staff && tab === "command" && <OnboardingChecklist onAdd={() => setManage(null)} onAttendance={() => go("attendance")} />}
        {!staff && tab === "command" && (
          <MetallicCommand
            onAssign={assignEmployee}
            onManage={setManage}
            onAdd={() => setManage(null)}
            onEod={() => setEod(true)}
          />
        )}{" "}
        {!staff && tab === "attendance" && <AttendanceScreen employeeId={voiceEmployeeId} />}
        {!staff && tab === "tasks" && <TasksScreen />}
        {!staff && tab === "payroll" && <Payroll employeeId={voiceEmployeeId} />}
        {!staff && tab === "profile" && <AdminProfile onLogout={logout} />}
        {!staff && tab === "staff" && (
          <StaffScreen onManage={setManage} onAdd={() => setManage(null)} onAssign={assignEmployee} />
        )}
      </main>
      <nav
        aria-label="Main navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass h-14 px-2 rounded-full max-w-lg mx-auto flex items-center"
      >
        <div className="flex flex-1 items-center justify-around gap-0.5">
          {dockTabs.slice(0, Math.floor(dockTabs.length / 2)).map(({ id, label, icon: I }) => (
            <Button
              key={id}
              data-crm-tab={id}
              variant="ghost"
              onClick={() => { setVoiceEmployeeId(undefined); setTab(id); }}
              className={`h-12 my-1 flex-1 p-0 flex flex-col gap-0.5 rounded-full text-[11px] ${tab === id ? "metal-blue" : "text-muted-foreground"}`}
            >
              <I className="size-[18px]" />
              <span className="text-[10px] whitespace-nowrap">{label}</span>
            </Button>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-around gap-0.5">
          {dockTabs.slice(Math.floor(dockTabs.length / 2)).map(({ id, label, icon: I }) => (
            <Button
              key={id}
              data-crm-tab={id}
              variant="ghost"
              onClick={() => { setVoiceEmployeeId(undefined); setTab(id); }}
              className={`h-12 my-1 flex-1 p-0 flex flex-col gap-0.5 rounded-full text-[11px] ${tab === id ? "metal-blue" : "text-muted-foreground"}`}
            >
              <I className="size-[18px]" />
              <span className="text-[10px] whitespace-nowrap">{label}</span>
            </Button>
          ))}
        </div>
      </nav>
      {!staff && !staffUser && signedIn && s.company && (
        <CredAlertNudge storeKey={`credsmart-nudge-${s.companyId}`} />
      )}
      <QuickNotes key={staff?.id ?? "admin"} ownerId={staff?.id} onConvert={(text) => { const e = staff ?? s.employees.find((e) => e.id === s.me) ?? s.employees[0]; if (!e) return; setTaskPrefill(text); setAssign(e); }} />
      <VoiceCopilot ref={voiceRef} key={`voice-${staff?.id ?? "admin"}`} staff={staff ?? (operatorRole(s) !== "Admin" ? s.employees.find((e) => e.id === s.me) : undefined)} onNavigate={({ tab: target, employeeId, openAdd }) => { setVoiceEmployeeId(employeeId); setTab(target); if (openAdd) setManage(null); }} />
      {assign && <AssignTask emp={assign} staff={staff} initialText={taskPrefill} onClose={() => setAssign(null)} />}{" "}
      {manage !== undefined && (
        <StaffEditor employee={manage} onClose={() => setManage(undefined)} />
      )}{" "}
      {eod && <Eod onClose={() => setEod(false)} />}{" "}
      {alerts && (
        <Sheet title="Notifications" onClose={() => setAlerts(false)}>
          <Button
            className="w-full rounded-xl"
            onClick={async () => {
              if (typeof Notification === "undefined") {
                toast.error("Notifications not supported here");
                return;
              }
              const result = await Notification.requestPermission();
              toast(
                result === "granted"
                  ? "Task alerts enabled"
                  : "Notification permission not granted",
              );
            }}
          >
            Enable Task Alerts
          </Button>
          {s.tasks
            .filter((t) => reminderActive(t) && (!staff || t.assigneeId === staff.id))
            .map((t) => (
              <div key={t.id} className="border-b border-border py-2">
                <p className="text-sm">{t.title}</p>
                <span className="text-[11px] text-muted-foreground">
                  Next ping in {untilPing(t, now)}
                </span>
              </div>
            ))}
        </Sheet>
      )}{" "}
      {(login || (authChecked && !signedIn && staffGate === null)) && <AuthSheet onClose={() => setLogin(false)} onStaff={() => { setLogin(false); setStaffGate(localStorage.getItem(STAFF_COMPANY_KEY) || (s.company ? s.companyId : "") || ""); }} />}
      {signedIn && !staffUser && !cloudBusy && !s.company && <CompanyOnboarding />}
      {staffGate !== null && !staffUser && <StaffSignIn initialCompany={staffGate} onOwner={() => { setStaffGate(null); setLogin(true); }} />}
    </div>
  );
}

export default CrmApp;

