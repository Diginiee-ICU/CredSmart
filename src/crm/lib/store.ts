import { useSyncExternalStore } from "react";
import { supabase } from "@/crm/integrations/supabase/client";
import { DEFAULT_POLICY, eligibleDates, isLate, roundMoney, type PayrollPolicy } from "./workforce-rules";
export { DEFAULT_POLICY, type PayrollPolicy } from "./workforce-rules";
export const PALETTE = ["blue", "emerald", "amber", "violet", "rose", "cyan", "coral", "lime"].map(
  (name) => ({ name, c: `var(--staff-${name})` }),
);
export type Role = string;
export const BUILTIN_ROLES = ["General Executive", "Manager", "Sales", "Marketing", "Admin"];
export type RolePreset = { name: string; permissions: Permissions };
export type Permissions = {
  assign: boolean;
  publicTasks: boolean;
  payroll: boolean;
  approve: boolean;
  outside: boolean;
};
export const PERMISSIONS: { key: keyof Permissions; label: string }[] = [
  { key: "assign", label: "Can Assign Tasks to Others" },
  { key: "publicTasks", label: "Can View All Public Tasks" },
  { key: "payroll", label: "Can Manage Payroll & Advances" },
  { key: "approve", label: "Can Approve Task Proof-of-Work" },
  { key: "outside", label: "Allow Attendance Outside GPS Geofence" },
];
export const defaultPermissions = (role: Role): Permissions => ({
  assign: role === "Admin" || role === "Manager",
  publicTasks: true,
  payroll: role === "Admin",
  approve: role === "Admin" || role === "Manager",
  outside: false,
});
export type Employee = {
  id: string;
  name: string;
  mobile: string;
  designation: string;
  role: Role;
  salary: number;
  pin: string;
  color: string;
  permissions: Permissions;
  shiftStart?: string | undefined;
  otRate?: number | undefined;
};
export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  isPublic: boolean;
  createdAt: number;
  lastPing: number;
  done: boolean;
  doneAt?: number | undefined;
  proof?: string;
  review?: "pending" | "rejected" | "approved";
  inProgress?: boolean;
  proofImages?: string[];
};
export type Attendance = {
  id: string;
  empId: string;
  date: string;
  inAt?: number;
  outAt?: number | undefined;
  distance?: number;
  verified?: boolean;
  onBreak?: boolean;
  breaks?: { start: number; end?: number }[];
  late?: boolean;
};
export type Adjustment = {
  id: string;
  empId: string;
  month: string;
  amount: number;
  kind: "Advance" | "Deduction";
  note: string;
  date?: string;
};
export type QuickNote = { id: string; ownerId?: string; title: string; html: string; text: string; color: string; pinned: boolean; updatedAt: number };
export type StaffRequest = { id: string; empId: string; kind: "Advance" | "Overtime" | "Leave"; value: number; date: string; note: string; status: "pending" | "approved" | "rejected"; at: number };
export type Overtime = { id: string; empId: string; date: string; hours: number; rate: number; note: string };
export type Broadcast = { id: string; text: string; at: number; priority?: "Urgent" | "Policy" | "General"; author?: string; pinned?: boolean };
export type Huddle = { id: string; url: string; author: string; at: number; active: boolean };
export type PayrollBreakdown = { monthlyBase: number; proratedBase: number; present: number; late: number; absent: number; paidDays: number; workingDays: number; overtimeHours: number; overtimePay: number; advance: number; deductions: number; net: number; policy: PayrollPolicy };
export type Payment = {
  id: string;
  empId: string;
  month: string;
  amount: number;
  paidAt: number;
  base: number;
  deductions: number;
  breakdown?: PayrollBreakdown;
};
export type State = {
  employees: Employee[];
  tasks: Task[];
  attendance: Attendance[];
  adjustments: Adjustment[];
  payments: Payment[];
  workplace: { lat: number; lng: number; radius: number } | null;
  me: string | null;
  companyId: string;
  broadcasts: Broadcast[];
  notes: QuickNote[];
  customRoles: RolePreset[];
  overtime: Overtime[];
  policy: PayrollPolicy;
  huddle: Huddle | null;
  requests: StaffRequest[];
  company?: Company;
};
export type Company = { name: string; industry: string; size: string; city: string; onboardedAt: number };
export const REMINDER_MS = 7200000;
const KEY = "wf-crm-v1";
const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString("en-CA");
export const monthKey = () => today().slice(0, 7);
const initial: State = {
  employees: [],
  tasks: [],
  attendance: [],
  adjustments: [],
  payments: [],
  broadcasts: [],
  notes: [],
  customRoles: [],
  overtime: [],
  policy: DEFAULT_POLICY,
  huddle: null,
  requests: [],
  workplace: null,
  me: null,
  companyId: "",
};
let state = initial,
  loaded = false,
  cloudUser: string | null = null;
const subs = new Set<() => void>();
export function normalizeState(raw: Partial<State>): State {
  const merged = { ...initial, ...raw };
  return {
    ...merged,
    policy: { ...DEFAULT_POLICY, ...raw.policy },
    employees: merged.employees.map((e, i) => ({
      ...e,
      role: e.role === "Staff" ? "General Executive" : e.role,
      permissions: e.permissions ?? defaultPermissions(e.role),
      color: PALETTE.some((p) => p.c === e.color)
        ? e.color
        : (PALETTE[i % PALETTE.length]?.c ?? "var(--staff-blue)"),
    })),
  };
}
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = normalizeState(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    state = initial;
  }
  if (!state.employees.length) {
    const e = makeEmp({
      name: "You (Admin)",
      mobile: "",
      designation: "Owner",
      role: "Admin",
      salary: 0,
    });
    state = { ...state, employees: [e], me: e.id, companyId: uid() };
  }
}
function emit() {
  subs.forEach((f) => f());
}
let queue = Promise.resolve();
let saveError: ((message: string) => void) | null = null;
export function onSaveError(fn: (message: string) => void) {
  saveError = fn;
}
let staffMode = false;
export const isStaffSession = () => staffMode;
/** Load the signed-in employee's scoped view from the server; never touches the owner's device copy. */
export async function connectStaff() {
  const { getStaffState } = await import("./staff-auth.functions");
  const { state: raw } = await getStaffState();
  staffMode = true;
  cloudUser = null;
  loaded = true;
  state = normalizeState(JSON.parse(raw) as Partial<State>);
  emit();
}
export function disconnectStaff() {
  if (!staffMode) return;
  staffMode = false;
  loaded = false;
  state = initial;
  load();
  emit();
}
let lastLocalSave = 0;
let liveChannel: ReturnType<typeof supabase.channel> | null = null;
/** Live sync: listen for data-free "changed" pings on this company's private topic, then reload. */
export async function watchWorkspace(workspaceId: string | null, reload: () => void) {
  if (liveChannel) { void supabase.removeChannel(liveChannel); liveChannel = null; }
  if (!workspaceId) return;
  await supabase.realtime.setAuth();
  let timer: ReturnType<typeof setTimeout> | undefined;
  liveChannel = supabase
    .channel(`ws:${workspaceId}`, { config: { private: true } })
    .on("broadcast", { event: "changed" }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (Date.now() - lastLocalSave > 2500) reload(); }, 600);
    })
    .subscribe();
}
export const currentWorkspaceId = () => ownerWorkspaceId;
let ownerWorkspaceId: string | null = null;
function persist() {
  lastLocalSave = Date.now();
  if (staffMode) {
    const { attendance, tasks, notes, requests } = state;
    queue = queue.catch(() => {}).then(async () => {
      if (!staffMode) return;
      try {
        const { saveStaffState } = await import("./staff-auth.functions");
        await saveStaffState({ data: { attendance, tasks, notes, requests } });
      } catch {
        saveError?.("Could not save. Check your connection.");
      }
    });
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(state));
  if (cloudUser) {
    const snapshot = state;
    const owner = cloudUser;
    queue = queue.catch(() => {}).then(async () => {
      if (cloudUser !== owner) return;
      const { employees, ...rest } = snapshot;
      const data = { ...rest, employees: employees.map(({ role, permissions, ...e }) => e) };
      const roles = employees.map((e) => ({
        employee_id: e.id,
        role: e.role,
        permissions: e.permissions,
      }));
      const { error } = await supabase.rpc("save_workforce", { _data: data, _roles: roles });
      if (error) saveError?.("Cloud save failed. Your changes remain on this device.");
    });
  }
}
function set(fn: (s: State) => State) {
  load();
  state = fn(state);
  persist();
  emit();
}
function makeEmp(
  d: Pick<Employee, "name" | "mobile" | "designation" | "role" | "salary">,
): Employee {
  return {
    ...d,
    id: uid(),
    pin: String(Math.floor(1000 + Math.random() * 9000)),
    color: PALETTE[state.employees.length % PALETTE.length]?.c ?? "var(--staff-blue)",
    permissions: defaultPermissions(d.role),
  };
}
export async function connectWorkspace(userId: string | null) {
  load();
  const previous = cloudUser;
  cloudUser = userId;
  if (!userId) {
    if (previous) {
      state = initial;
      localStorage.removeItem(KEY);
      loaded = false;
      load();
      emit();
    }
    return;
  }
  await queue;
  const { data, error } = await supabase
    .from("workforce_workspaces")
    .select("id,data")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) { cloudUser = null; throw error; }
  ownerWorkspaceId = data?.id ?? null;
  if (data) {
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("employee_id,role,role_name,permissions")
      .eq("workspace_id", data.id);
    if (roleError) throw roleError;
    const { data: presets, error: presetError } = await supabase.from("workforce_role_presets").select("name,permissions").eq("workspace_id", data.id);
    if (presetError) throw presetError;
    const raw = data.data as unknown as State;
    state = normalizeState({
      ...raw,
      customRoles: (presets ?? []).map((p) => ({ name: p.name, permissions: p.permissions as Permissions })),
      employees: (raw.employees ?? []).map((e) => {
        const r = roles?.find((x) => x.employee_id === e.id);
        return {
          ...e,
          role: r?.role_name ?? r?.role ?? "General Executive",
          permissions: (r?.permissions ?? defaultPermissions("Staff")) as Permissions,
        };
      }),
    });
    localStorage.setItem(KEY, JSON.stringify(state));
    emit();
  } else {
    persist();
    await queue;
  }
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (f) => {
      load();
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => {
      load();
      return sel(state);
    },
    () => sel(initial),
  );
}
export const actions = {
  setupCompany(c: { name: string; industry: string; size: string; city: string; ownerName: string; ownerPhone: string; shiftStart: string }) {
    const name = c.name.trim(); const owner = c.ownerName.trim();
    if (!name || !owner) throw new Error("Company and your name are required");
    if (!/^\d{2}:\d{2}$/.test(c.shiftStart)) throw new Error("Enter a valid shift start time");
    set((s) => ({
      ...s,
      company: { name, industry: c.industry.trim(), size: c.size, city: c.city.trim(), onboardedAt: Date.now() },
      policy: { ...s.policy, shiftStart: c.shiftStart },
      employees: s.employees.map((e) => (e.id === s.me ? { ...e, name: owner, mobile: c.ownerPhone.trim() || e.mobile } : e)),
    }));
  },
  savePolicy(policy: PayrollPolicy) {
    if (operatorRole(state) !== "Admin") throw new Error("Only admins can change company rules");
    if (!/^\d{2}:\d{2}$/.test(policy.shiftStart) || !Number.isFinite(policy.otRate) || policy.otRate < 0 || ![0, 0.5, 1].includes(policy.lateCredit) || policy.weeklyOff < 0 || policy.weeklyOff > 6) throw new Error("Enter valid company rules");
    set((s) => ({ ...s, policy: { ...policy, configured: true } }));
  },
  saveRole(preset: RolePreset) {
    if (operatorRole(state) !== "Admin") throw new Error("Only admins can create roles");
    const name = preset.name.trim();
    if (!name || name.length > 60 || [...BUILTIN_ROLES, ...state.customRoles.map((r) => r.name)].some((n) => n.toLowerCase() === name.toLowerCase())) throw new Error("Use a unique role name (up to 60 characters)");
    set((s) => ({ ...s, customRoles: [...s.customRoles, { name, permissions: preset.permissions }] }));
  },
  addNote(ownerId?: string) {
    const note: QuickNote = { id: uid(), ...(ownerId ? { ownerId } : {}), title: "", html: "", text: "", color: PALETTE[0]?.c ?? "var(--staff-blue)", pinned: false, updatedAt: Date.now() };
    set((s) => ({ ...s, notes: [note, ...s.notes] }));
    return note.id;
  },
  updateNote(id: string, patch: Partial<QuickNote>) { set((s) => ({ ...s, notes: s.notes.map((n) => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n) })); },
  removeNote(id: string) { set((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })); },
  addOvertime(d: Omit<Overtime, "id">) {
    if (!Number.isFinite(d.hours) || d.hours <= 0 || d.hours > 24 || !Number.isFinite(d.rate) || d.rate < 0) throw new Error("Enter valid hours and hourly rate");
    if (state.payments.some((p) => p.empId === d.empId && p.month === d.date.slice(0, 7))) throw new Error("This month is already paid");
    set((s) => ({ ...s, overtime: [...s.overtime, { ...d, id: uid() }] }));
  },
  setBreak(empId: string, onBreak: boolean) {
    set((s) => ({ ...s, attendance: s.attendance.map((a) => {
      if (a.empId !== empId || a.date !== today() || !a.inAt || a.outAt || !!a.onBreak === onBreak) return a;
      const breaks = [...(a.breaks ?? [])];
      if (onBreak) breaks.push({ start: Date.now() });
      else { const last = breaks.at(-1); if (last && !last.end) breaks[breaks.length - 1] = { ...last, end: Date.now() }; }
      return { ...a, onBreak, breaks };
    }) }));
  },
  startHuddle(url: string) {
    if (!["Admin", "Manager"].includes(operatorRole(state))) throw new Error("Only admins and managers can ring the team");
    set((s) => ({ ...s, huddle: { id: uid(), url, author: s.employees.find((e) => e.id === s.me)?.name ?? "Admin", at: Date.now(), active: true } }));
  },
  endHuddle() { if (["Admin", "Manager"].includes(operatorRole(state))) set((s) => ({ ...s, huddle: s.huddle ? { ...s.huddle, active: false } : null })); },
  pinBroadcast(id: string) { if (operatorRole(state) === "Admin") set((s) => ({ ...s, broadcasts: s.broadcasts.map((b) => b.id === id ? { ...b, pinned: !b.pinned } : b) })); },
  addEmployee(d: Pick<Employee, "name" | "mobile" | "designation" | "role" | "salary">) {
    const e = makeEmp(d);
    set((s) => ({ ...s, employees: [...s.employees, e] }));
    return e;
  },
  updateEmployee(id: string, patch: Partial<Employee>) {
    set((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  },
  removeEmployee(id: string) {
    set((s) => ({
      ...s,
      employees: s.employees.filter((e) => e.id !== id),
      tasks: s.tasks.filter((t) => t.assigneeId !== id),
      me: s.me === id ? (s.employees.find((e) => e.id !== id)?.id ?? null) : s.me,
    }));
  },
  addTask(t: Pick<Task, "title" | "assigneeId" | "isPublic">) {
    const now = Date.now();
    const task: Task = { ...t, id: uid(), createdAt: now, lastPing: now, done: false };
    set((s) => ({
      ...s,
      tasks: [task, ...s.tasks],
    }));
    return task;
  },
  startTask(id: string) { set((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id && !t.done && t.review !== "pending" ? { ...t, inProgress: true } : t) })); },
  request(d: Omit<StaffRequest, "id" | "status" | "at">) {
    if (!state.employees.some((e) => e.id === d.empId) || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isFinite(d.value) || d.value <= 0 || (d.kind === "Overtime" && d.value > 24)) throw new Error("Enter a valid date and positive amount or hours");
    set((s) => ({ ...s, requests: [{ ...d, id: uid(), status: "pending", at: Date.now() }, ...s.requests] }));
  },
  reviewRequest(id: string, approved: boolean) {
    if (operatorRole(state) !== "Admin") throw new Error("Only admins can approve requests");
    const request = state.requests.find((r) => r.id === id);
    if (!request || request.status !== "pending") return;
    const e = state.employees.find((e) => e.id === request.empId);
    if (!e) return;
    if (approved && request.kind !== "Leave" && state.payments.some((p) => p.empId === e.id && p.month === request.date.slice(0, 7))) throw new Error("This month is already paid");
    set((s) => ({ ...s,
      requests: s.requests.map((r) => r.id === id ? { ...r, status: approved ? "approved" : "rejected" } : r),
      adjustments: approved && request.kind === "Advance" ? [...s.adjustments, { id: request.id, empId: e.id, month: request.date.slice(0, 7), date: request.date, kind: "Advance", amount: request.value, note: request.note }] : s.adjustments,
      overtime: approved && request.kind === "Overtime" ? [...s.overtime, { id: request.id, empId: e.id, date: request.date, hours: request.value, rate: e.otRate ?? s.policy.otRate, note: request.note }] : s.overtime,
    }));
  },
  submitProof(id: string, proof: string, proofImages: string[] = []) {
    if (!proof.trim()) return;
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, proof, proofImages, review: "pending" } : t)),
    }));
  },
  reviewProof(id: string, approve: boolean) {
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              done: approve,
              doneAt: approve ? Date.now() : undefined,
              review: approve ? "approved" : "rejected",
              lastPing: Date.now(),
            }
          : t,
      ),
    }));
  },
  ping(id: string) {
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, lastPing: Date.now() } : t)),
    }));
  },
  setWorkplace(workplace: State["workplace"]) {
    set((s) => ({ ...s, workplace }));
  },
  setMe(me: string) {
    set((s) => ({ ...s, me }));
  },
  clock(empId: string, kind: "in" | "out", distance = 0, verified = false) {
    set((s) => {
      const ex = s.attendance.find((a) => a.empId === empId && a.date === today());
      const rec = {
        ...(ex ?? { id: uid(), empId, date: today() }),
        distance,
        verified,
        ...(kind === "in" ? { inAt: ex?.inAt ?? Date.now(), outAt: undefined, late: ex?.late ?? isLate(Date.now(), s.employees.find((e) => e.id === empId)?.shiftStart || s.policy.shiftStart) } : { outAt: Date.now(), onBreak: false, breaks: (ex?.breaks ?? []).map((b) => b.end ? b : { ...b, end: Date.now() }) }),
      };
      return {
        ...s,
        attendance: ex
          ? s.attendance.map((a) => (a.id === ex.id ? rec : a))
          : [...s.attendance, rec],
      };
    });
  },
  addAdjustment(d: Omit<Adjustment, "id">) {
    if (!Number.isFinite(d.amount) || d.amount <= 0)
      throw new Error("Enter an amount greater than zero");
    if (state.payments.some((p) => p.empId === d.empId && p.month === d.month)) throw new Error("This month is already paid");
    set((s) => ({ ...s, adjustments: [...s.adjustments, { ...d, id: uid() }] }));
  },
  pay(empId: string, month: string) {
    let payment: Payment | undefined;
    set((s) => {
      if (s.payments.some((p) => p.empId === empId && p.month === month)) return s;
      const e = s.employees.find((e) => e.id === empId);
      if (!e) return s;
      const row = payrollRow(e, s, month);
      payment = {
        id: uid(),
        empId,
        month,
        amount: row.net,
        base: row.proratedBase,
        deductions: row.deductions,
        breakdown: row.breakdown,
        paidAt: Date.now(),
      };
      return { ...s, payments: [...s.payments, payment] };
    });
    return payment;
  },
  broadcast(text: string, priority: Broadcast["priority"] = "General") {
    if (operatorRole(state) !== "Admin") throw new Error("Only admins can post broadcasts");
    set((s) => ({ ...s, broadcasts: [{ id: uid(), text, priority, pinned: true, author: s.employees.find((e) => e.id === s.me)?.name ?? "Admin", at: Date.now() }, ...s.broadcasts] }));
  },
};
export function payrollRow(e: Employee, s: State, month: string) {
  const adjustments = s.adjustments.filter((a) => a.empId === e.id && a.month === month);
  const advance = adjustments.filter((a) => a.kind === "Advance").reduce((n, a) => n + a.amount, 0);
  const deductions = adjustments.reduce((n, a) => n + a.amount, 0);
  const dates = eligibleDates(month, s.policy);
  const records = [...new Map(s.attendance.filter((a) => a.empId === e.id && a.date.startsWith(month) && a.inAt).map((a) => [a.date, a])).values()];
  const present = records.length;
  const eligible = records.filter((a) => dates.includes(a.date));
  const late = records.filter((a) => a.late ?? isLate(a.inAt, e.shiftStart || s.policy.shiftStart)).length;
  const paidDays = eligible.reduce((n, a) => n + ((a.late ?? isLate(a.inAt, e.shiftStart || s.policy.shiftStart)) ? s.policy.lateCredit : 1), 0);
  const overtime = s.overtime.filter((o) => o.empId === e.id && o.date.startsWith(month));
  const overtimeHours = overtime.reduce((n, o) => n + o.hours, 0);
  const overtimePay = roundMoney(overtime.reduce((n, o) => n + o.hours * o.rate, 0));
  const proratedBase = s.policy.configured ? roundMoney(dates.length ? e.salary * paidDays / dates.length : 0) : e.salary;
  const absent = dates.filter((d) => d <= today() && !eligible.some((a) => a.date === d)).length;
  const net = Math.max(0, roundMoney(proratedBase + overtimePay - deductions));
  const breakdown: PayrollBreakdown = { monthlyBase: e.salary, proratedBase, present, late, absent, paidDays, workingDays: dates.length, overtimeHours, overtimePay, advance, deductions, net, policy: { ...s.policy } };
  return {
    advance,
    deductions,
    present,
    late, absent, paidDays, workingDays: dates.length, overtimeHours, overtimePay, proratedBase, breakdown,
    net,
    paid: s.payments.find((p) => p.empId === e.id && p.month === month),
  };
}
export type TeamStatus = "Present" | "On Break" | "Late" | "Absent";
export function teamStatus(e: Employee, s: State): TeamStatus {
  const a = s.attendance.find((a) => a.empId === e.id && a.date === today());
  if (!a?.inAt || a.outAt) return "Absent";
  if (a.onBreak) return "On Break";
  return (a.late ?? isLate(a.inAt, e.shiftStart || s.policy.shiftStart)) ? "Late" : "Present";
}
export function operatorRole(s: State): Role { return cloudUser ? "Admin" : (s.employees.find((e) => e.id === s.me)?.role ?? "General Executive"); }
export function payslipText(e: Employee, month: string, b: PayrollBreakdown, paidAt?: number) {
  return `CredSmart Salary Slip — ${month}\n${e.name} · ${e.role}\nMonthly Base: ${money(b.monthlyBase)}\nPresent: ${b.present} · Late: ${b.late} · Absent: ${b.absent}\nPaid days: ${b.paidDays}/${b.workingDays}\nProrated Base: ${money(b.proratedBase)}\nOvertime: ${b.overtimeHours} hrs · ${money(b.overtimePay)}\nStaff Udhar: −${money(b.advance)}\nOther Deductions: −${money(b.deductions - b.advance)}\nFinal Net ${paidAt ? "Paid" : "Payable"}: ${money(b.net)}${paidAt ? `\nPaid: ${new Date(paidAt).toLocaleDateString()}` : "\nProvisional · payment not recorded"}`;
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const fmtTime = (t?: number) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
export function untilPing(t: Task, now: number) {
  const ms = Math.max(0, t.lastPing + REMINDER_MS - now);
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
export const waLink = (mobile: string, text: string) =>
  `https://wa.me/${mobile.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(12742000 * Math.asin(Math.sqrt(h)));
}
