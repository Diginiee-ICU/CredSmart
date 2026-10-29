import type { State, Task } from "./store";
export function staffTasks(tasks: Task[], empId: string, board: "mine" | "team", publicAllowed: boolean) {
  return tasks.filter((t) => board === "mine" ? t.assigneeId === empId : publicAllowed && t.isPublic);
}
export function reminderActive(t: Task) { return !t.done && t.review !== "pending"; }
export function staffRecords(s: State, empId: string) {
  return { attendance: s.attendance.filter((a) => a.empId === empId), payments: s.payments.filter((p) => p.empId === empId), adjustments: s.adjustments.filter((a) => a.empId === empId), overtime: s.overtime.filter((o) => o.empId === empId), requests: s.requests.filter((r) => r.empId === empId) };
}