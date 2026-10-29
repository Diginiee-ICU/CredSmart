import { act } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/crm/integrations/supabase/client", () => ({ supabase: {} }));
import { actions, defaultPermissions, normalizeState, REMINDER_MS, useStore, type Employee } from "@/crm/lib/store";
import { executeVoiceCommand, parseVoiceCommand, resolveEmployee } from "@/crm/lib/voice-commands";

const rahul: Employee = { id: "r", name: "Rahul Sharma", designation: "General Executive", role: "General Executive", mobile: "", pin: "1234", color: "var(--staff-blue)", salary: 31000, permissions: defaultPermissions("General Executive") };

describe("Voice parser", () => {
  it("parses assignment examples with dynamic full and first names and private visibility", () => {
    expect(parseVoiceCommand("ASSIGN a PRIVATE task to Rahul Sharma check inventory", [rahul])).toEqual({ kind: "assign", name: "Rahul Sharma", text: "check inventory", private: true });
    expect(parseVoiceCommand("Tell Rahul to audit bills", [rahul])).toMatchObject({ name: "Rahul", text: "audit bills", private: false });
    expect(parseVoiceCommand("Assign task to Laxmi she needs to check inventory", [rahul])).toMatchObject({ name: "Laxmi", text: "check inventory" });
  });
  it("parses each task status trigger including the exact cheat-sheet contraction", () => {
    for (const command of ["What's the update on Rahul's task?", "What's the update on the task I assigned to Rahul", "Task status of Rahul", "What is Rahul working on"]) expect(parseVoiceCommand(command, [rahul])).toEqual({ kind: "status", name: "Rahul" });
  });
  it("parses each attendance and salary trigger", () => {
    for (const command of ["Open the attendance report of Rahul", "Show attendance of Rahul", "Is Rahul present today"]) expect(parseVoiceCommand(command, [rahul])).toEqual({ kind: "attendance", name: "Rahul" });
    for (const command of ["Open payroll of Rahul", "How much salary is due for Rahul"]) expect(parseVoiceCommand(command, [rahul])).toEqual({ kind: "payroll", name: "Rahul" });
  });
  it("parses rupee amounts and notes without executing embedded commands", () => {
    expect(parseVoiceCommand("Add ₹1500 advance to Rahul", [rahul])).toEqual({ kind: "advance", name: "Rahul", amount: 1500 });
    expect(parseVoiceCommand("Add 1,500 rupees advance to Rahul", [rahul])).toMatchObject({ amount: 1500 });
    expect(parseVoiceCommand("Make a note Broadcast do not ship", [rahul])).toEqual({ kind: "note", text: "Broadcast do not ship" });
    expect(parseVoiceCommand("Broadcast Morning briefing", [rahul])).toEqual({ kind: "broadcast", text: "Morning briefing" });
    expect(() => parseVoiceCommand("Add 0 advance to Rahul", [rahul])).toThrow("greater than zero");
  });
  it("rejects ambiguous first names", () => {
    expect(() => resolveEmployee("Rahul", [rahul, { ...rahul, id: "second", name: "Rahul Singh" }])).toThrow("full name");
  });
});

describe("Voice execution", () => {
  it("offers unknown staff before creating them and starts a two-hour private task", () => {
    const hook = renderHook(() => useStore((s) => s));
    const intent = parseVoiceCommand("Assign a private task to Laxmi to audit bills", hook.result.current.employees);
    expect(executeVoiceCommand(intent, hook.result.current).add).toBeDefined();
    expect(hook.result.current.employees.some((e) => e.name === "Laxmi")).toBe(false);
    let result; act(() => { result = executeVoiceCommand(intent, hook.result.current, undefined, true); });
    const e = hook.result.current.employees.find((e) => e.name === "Laxmi");
    expect(e).toMatchObject({ role: "General Executive", designation: "General Executive" });
    const t = hook.result.current.tasks.find((t) => t.assigneeId === e?.id);
    expect(t).toMatchObject({ title: "audit bills", isPublic: false, done: false });
    expect(t?.lastPing).toBe(t?.createdAt);
    expect(REMINDER_MS).toBe(7200000);
  });
  it("blocks staff broadcast, colleague payroll and unpermitted assignments", () => {
    const s = normalizeState({ employees: [rahul, { ...rahul, id: "p", name: "Priya", salary: 99000 }] });
    expect(() => executeVoiceCommand({ kind: "broadcast", text: "Test" }, s, rahul)).toThrow("Only the admin");
    expect(() => executeVoiceCommand({ kind: "payroll", name: "Priya" }, s, rahul)).toThrow("own attendance and pay");
    expect(() => executeVoiceCommand({ kind: "assign", name: "Priya", text: "Stock", private: false }, s, rahul)).toThrow("permission");
  });
  it("excludes private colleague task contents from spoken and visual status", () => {
    const s = normalizeState({ employees: [rahul, { ...rahul, id: "p", name: "Priya" }], tasks: [{ id: "private", assigneeId: "p", title: "Secret commission", isPublic: false, done: false, lastPing: 1, createdAt: 1 }, { id: "public", assigneeId: "p", title: "Stock", isPublic: true, done: false, lastPing: 1, createdAt: 1 }] });
    const output = executeVoiceCommand({ kind: "status", name: "Priya" }, s, rahul);
    expect(output.tasks?.map((t) => t.title)).toEqual(["Stock"]);
    expect(output.reply).not.toContain("Secret commission");
  });
  it("records admin advances but staff advances remain pending requests", () => {
    const hook = renderHook(() => useStore((s) => s));
    let e: Employee | undefined;
    act(() => {
      const admin = hook.result.current.employees.find((e) => e.role === "Admin"); if (!admin) throw new Error("Admin missing");
      actions.setMe(admin.id);
      e = actions.addEmployee({ name: "Worker", mobile: "", designation: "Sales", role: "Sales", salary: 31000 });
    });
    if (!e) throw new Error("Missing employee");
    act(() => {
      executeVoiceCommand({ kind: "advance", name: "Worker", amount: 1500 }, hook.result.current);
    });
    expect(hook.result.current.adjustments.filter((a) => a.empId === e?.id)).toHaveLength(1);
    act(() => {
      executeVoiceCommand({ kind: "advance", name: "Worker", amount: 500 }, hook.result.current, e);
    });
    expect(hook.result.current.adjustments.filter((a) => a.empId === e?.id)).toHaveLength(1);
    expect(hook.result.current.requests.filter((r) => r.empId === e?.id)).toHaveLength(1);
  });
});
