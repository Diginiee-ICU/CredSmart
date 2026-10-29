import type { Attendance, QuickNote, StaffRequest, State, Task } from "./store";

export type StaffChanges = { attendance: Attendance[]; tasks: Task[]; notes: QuickNote[]; requests: StaffRequest[] };
type RoleRow = { employee_id: string; role: string; role_name: string | null; permissions: unknown };

/** What a signed-in employee may see: own records, public tasks and colleague names only. */
export function scopeStaffState(data: State, me: string, roles: RoleRow[]): State {
  const today = new Date().toLocaleDateString("en-CA");
  return {
    ...data,
    me,
    customRoles: [],
    employees: data.employees.map((e) => {
      const r = roles.find((x) => x.employee_id === e.id);
      const base = { ...e, role: r?.role_name ?? r?.role ?? "General Executive", permissions: r?.permissions as State["employees"][number]["permissions"], pin: "" };
      return e.id === me ? base : { ...base, mobile: "", salary: 0, otRate: undefined };
    }),
    tasks: data.tasks.filter((t) => t.assigneeId === me || t.isPublic),
    attendance: data.attendance
      .filter((a) => a.empId === me || a.date === today)
      .map((a) => { if (a.empId === me) return a; const { distance: _d, verified: _v, breaks: _b, ...rest } = a; return rest; }),
    adjustments: data.adjustments.filter((a) => a.empId === me),
    payments: data.payments.filter((p) => p.empId === me),
    overtime: data.overtime.filter((o) => o.empId === me),
    notes: (data.notes ?? []).filter((n) => n.ownerId === me),
    requests: (data.requests ?? []).filter((r) => r.empId === me),
  };
}

/** Apply only the changes an employee is allowed to make to the owner's workspace. */
export function mergeStaffChanges(data: State, me: string, c: StaffChanges, canAssign: boolean): State {
  const ids = new Set(data.employees.map((e) => e.id));
  const taskIds = new Set(data.tasks.map((t) => t.id));
  const reqIds = new Set((data.requests ?? []).map((r) => r.id));
  const tasks = data.tasks.map((t) => {
    const n = c.tasks.find((x) => x.id === t.id);
    if (!n || t.assigneeId !== me) return t;
    const review = n.review === "pending" && t.review !== "approved" ? "pending" : t.review;
    const out: Task = { ...t, done: !!n.done, doneAt: n.doneAt, lastPing: n.lastPing };
    if (n.proof !== undefined) out.proof = n.proof;
    if (n.proofImages !== undefined) out.proofImages = n.proofImages;
    if (n.inProgress !== undefined) out.inProgress = n.inProgress;
    if (review) out.review = review;
    return out;
  });
  const added = canAssign ? c.tasks.filter((t) => !taskIds.has(t.id) && ids.has(t.assigneeId)).map(({ review: _r, ...t }) => ({ ...t, done: false })) : [];
  return {
    ...data,
    tasks: [...added, ...tasks],
    attendance: [...data.attendance.filter((a) => a.empId !== me), ...c.attendance.filter((a) => a.empId === me)],
    notes: [...(data.notes ?? []).filter((n) => n.ownerId !== me), ...c.notes.filter((n) => n.ownerId === me)],
    requests: [...(data.requests ?? []), ...c.requests.filter((r) => r.empId === me && !reqIds.has(r.id)).map((r) => ({ ...r, status: "pending" as const }))],
  };
}
