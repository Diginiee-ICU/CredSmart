import { describe, expect, it, vi } from "vitest";
vi.mock("@/crm/integrations/supabase/client", () => ({ supabase: {} }));
import { mergeStaffChanges, scopeStaffState } from "@/crm/lib/staff-scope";
import { normalizeState } from "@/crm/lib/store";

const base = normalizeState({
  me: "owner",
  employees: [
    { id: "owner", name: "Owner", mobile: "9000000000", designation: "", role: "Admin", salary: 0, pin: "1111", color: "", permissions: undefined as never },
    { id: "a", name: "Asha", mobile: "9111111111", designation: "", role: "General Executive", salary: 20000, pin: "2222", color: "", permissions: undefined as never },
    { id: "b", name: "Bina", mobile: "9222222222", designation: "", role: "General Executive", salary: 30000, pin: "3333", color: "", permissions: undefined as never },
  ],
  tasks: [
    { id: "t1", title: "A private", assigneeId: "a", isPublic: false, createdAt: 0, lastPing: 0, done: false },
    { id: "t2", title: "B private", assigneeId: "b", isPublic: false, createdAt: 0, lastPing: 0, done: false },
  ],
});

describe("staff scope", () => {
  it("hides colleagues' PINs, salaries and private tasks", () => {
    const v = scopeStaffState(base, "a", []);
    expect(v.employees.every((e) => e.pin === "")).toBe(true);
    expect(v.employees.find((e) => e.id === "b")?.salary).toBe(0);
    expect(v.tasks.map((t) => t.id)).toEqual(["t1"]);
  });
  it("cannot complete someone else's task", () => {
    const changes = { attendance: [], notes: [], requests: [], tasks: base.tasks.map((t) => ({ ...t, done: true })) };
    const next = mergeStaffChanges(base, "a", changes, false);
    expect(next.tasks.find((t) => t.id === "t1")?.done).toBe(true);
    expect(next.tasks.find((t) => t.id === "t2")?.done).toBe(false);
  });
  it("forces new requests to pending", () => {
    const next = mergeStaffChanges(base, "a", { attendance: [], notes: [], tasks: [], requests: [{ id: "r", empId: "a", kind: "Advance", value: 500, date: "", note: "", status: "approved", at: 0 }] }, false);
    expect(next.requests[0]?.status).toBe("pending");
  });
});
