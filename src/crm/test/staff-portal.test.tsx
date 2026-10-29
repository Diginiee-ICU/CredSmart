import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/crm/integrations/supabase/client", () => ({ supabase: {} }));
import { actions, defaultPermissions, normalizeState, useStore, type Task } from "@/crm/lib/store";
import { reminderActive, staffRecords, staffTasks } from "@/crm/lib/staff-portal";

const tasks: Task[] = [
  { id: "mine-private", title: "Client follow-up", assigneeId: "rahul", isPublic: false, createdAt: 1000, lastPing: 1000, done: false },
  { id: "other-private", title: "Confidential", assigneeId: "other", isPublic: false, createdAt: 1000, lastPing: 1000, done: false },
  { id: "other-public", title: "Stock count", assigneeId: "other", isPublic: true, createdAt: 1000, lastPing: 1000, done: false },
];

describe("Employee portal scope", () => {
  it("includes own private tasks but no other employee tasks in My Tasks", () => {
    expect(staffTasks(tasks, "rahul", "mine", true).map((t) => t.id)).toEqual(["mine-private"]);
  });
  it("never includes another employee private task in the team board", () => {
    expect(staffTasks(tasks, "rahul", "team", true).map((t) => t.id)).toEqual(["other-public"]);
  });
  it("honors the public board permission", () => {
    expect(staffTasks(tasks, "rahul", "team", false)).toEqual([]);
    expect(defaultPermissions("General Executive").assign).toBe(false);
  });
  it("stops reminder timers when proof awaits admin sign-off", () => {
    const t = tasks[0]; if (!t) throw new Error("Missing task");
    expect(reminderActive(t)).toBe(true);
    expect(reminderActive({ ...t, review: "pending" })).toBe(false);
    expect(reminderActive({ ...t, review: "rejected" })).toBe(true);
    expect(reminderActive({ ...t, done: true })).toBe(false);
  });
  it("returns only personal payslips and adjustments", () => {
    const state = normalizeState({ payments: [
      { id: "r", empId: "rahul", month: "2026-10", amount: 20000, paidAt: 1, base: 20000, deductions: 0 },
      { id: "o", empId: "other", month: "2026-10", amount: 99000, paidAt: 1, base: 99000, deductions: 0 },
    ], adjustments: [{ id: "a", empId: "other", month: "2026-10", amount: 7000, kind: "Advance", note: "" }] });
    expect(staffRecords(state, "rahul").payments.map((p) => p.amount)).toEqual([20000]);
    expect(staffRecords(state, "rahul").adjustments).toEqual([]);
  });
  it("keeps notes separately owned for each employee", () => {
    const hook = renderHook(() => useStore((s) => s));
    let id = ""; act(() => { id = actions.addNote("rahul"); actions.updateNote(id, { text: "Private client notes" }); });
    expect(hook.result.current.notes.find((n) => n.id === id)?.ownerId).toBe("rahul");
    expect(hook.result.current.notes.filter((n) => n.ownerId === "other")).toEqual([]);
  });
  it("keeps financial requests pending until approval and applies each only once", () => {
    const hook = renderHook(() => useStore((s) => s));
    let empId = "";
    act(() => {
      const admin = hook.result.current.employees.find((e) => e.role === "Admin"); if (!admin) throw new Error("Admin missing");
      actions.setMe(admin.id);
      empId = actions.addEmployee({ name: "Request staff", mobile: "", designation: "Sales", role: "Sales", salary: 31000 }).id;
      actions.updateEmployee(empId, { otRate: 100 });
      actions.request({ empId, kind: "Advance", date: "2026-10-27", value: 500, note: "Travel" });
    });
    const r = hook.result.current.requests.find((r) => r.empId === empId); if (!r) throw new Error("Request missing");
    expect(hook.result.current.adjustments.filter((a) => a.empId === empId)).toHaveLength(0);
    act(() => { actions.reviewRequest(r.id, true); actions.reviewRequest(r.id, true); });
    expect(hook.result.current.adjustments.filter((a) => a.empId === empId).map((a) => a.amount)).toEqual([500]);
    act(() => actions.request({ empId, kind: "Overtime", date: "2026-10-27", value: 2.5, note: "Stock" }));
    const ot = hook.result.current.requests.find((r) => r.empId === empId && r.kind === "Overtime"); if (!ot) throw new Error("OT request missing");
    expect(hook.result.current.overtime.filter((o) => o.empId === empId)).toHaveLength(0);
    act(() => { actions.reviewRequest(ot.id, true); actions.reviewRequest(ot.id, true); });
    expect(hook.result.current.overtime.filter((o) => o.empId === empId).map((o) => o.hours)).toEqual([2.5]);
  });
});
