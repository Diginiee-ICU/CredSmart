import { describe, expect, it, vi } from "vitest";
vi.mock("@/crm/integrations/supabase/client", () => ({ supabase: {} }));
import {
  REMINDER_MS,
  untilPing,
  payrollRow,
  normalizeState,
  defaultPermissions,
  BUILTIN_ROLES,
  DEFAULT_POLICY,
  teamStatus,
  type Employee,
  type Task,
} from "@/crm/lib/store";
import { eligibleDates, isLate, validMeetingLink } from "@/crm/lib/workforce-rules";

const employee: Employee = {
  id: "staff",
  name: "Rahul",
  mobile: "919876543210",
  designation: "Sales",
  salary: 25000,
  role: "Staff",
  pin: "1234",
  color: "var(--staff-blue)",
  permissions: defaultPermissions("Staff"),
};

describe("Workforce business rules", () => {
  it("offers the exact five built-in roles with General Executive first", () => {
    expect(BUILTIN_ROLES).toEqual(["General Executive", "Manager", "Sales", "Marketing", "Admin"]);
    expect(normalizeState({ employees: [{ ...employee, role: "Staff" }] }).employees[0]?.role).toBe("General Executive");
  });
  it("defaults late arrivals to half-day credit without inventing a shift or OT rate", () => {
    expect(DEFAULT_POLICY).toMatchObject({ lateCredit: 0.5, shiftStart: "", otRate: 0, configured: false });
    expect(isLate(new Date(2026, 9, 1, 9, 30).getTime(), "09:30")).toBe(false);
    expect(isLate(new Date(2026, 9, 1, 9, 31).getTime(), "09:30")).toBe(true);
  });
  it("supports all days, Sunday off and one selected weekly off", () => {
    expect(eligibleDates("2026-10", DEFAULT_POLICY)).toHaveLength(31);
    expect(eligibleDates("2026-10", { ...DEFAULT_POLICY, calendar: "sunday" })).toHaveLength(27);
    const mondayOff = eligibleDates("2026-10", { ...DEFAULT_POLICY, calendar: "weekly", weeklyOff: 1 });
    expect(mondayOff).toHaveLength(27);
    expect(mondayOff).not.toContain("2026-10-05");
    expect(mondayOff).toContain("2026-10-04");
  });
  it("prorates attendance plus hours times OT rate minus dated Udhar", () => {
    const e = { ...employee, salary: 31000 };
    const s = normalizeState({ policy: { ...DEFAULT_POLICY, configured: true, shiftStart: "09:30", otRate: 100 }, attendance: [
      { id: "a", empId: e.id, date: "2026-10-01", inAt: new Date(2026, 9, 1, 9, 30).getTime() },
      { id: "b", empId: e.id, date: "2026-10-02", inAt: new Date(2026, 9, 2, 9, 31).getTime() },
    ], overtime: [{ id: "o", empId: e.id, date: "2026-10-02", hours: 2.5, rate: 100, note: "" }], adjustments: [{ id: "a", empId: e.id, month: "2026-10", date: "2026-10-15", kind: "Advance", amount: 500, note: "UPI" }] });
    expect(payrollRow(e, s, "2026-10")).toMatchObject({ present: 2, late: 1, paidDays: 1.5, proratedBase: 1500, overtimeHours: 2.5, overtimePay: 250, advance: 500, net: 1250 });
  });
  it("allows the admin to change late arrivals to full or unpaid days", () => {
    const e = { ...employee, salary: 31000 };
    const raw = { attendance: [{ id: "a", empId: e.id, date: "2026-10-01", inAt: 1, late: true }] };
    expect(payrollRow(e, normalizeState({ ...raw, policy: { ...DEFAULT_POLICY, configured: true, lateCredit: 1 } }), "2026-10").net).toBe(1000);
    expect(payrollRow(e, normalizeState({ ...raw, policy: { ...DEFAULT_POLICY, configured: true, lateCredit: 0 } }), "2026-10").net).toBe(0);
  });
  it("uses the employee shift override and excludes off-day attendance credit", () => {
    const e = { ...employee, salary: 27000, shiftStart: "10:00" };
    const s = normalizeState({ policy: { ...DEFAULT_POLICY, configured: true, calendar: "sunday", shiftStart: "09:00" }, attendance: [
      { id: "a", empId: e.id, date: "2026-10-01", inAt: new Date(2026, 9, 1, 9, 30).getTime() },
      { id: "b", empId: e.id, date: "2026-10-04", inAt: new Date(2026, 9, 4, 9, 30).getTime() },
    ] });
    expect(payrollRow(e, s, "2026-10")).toMatchObject({ late: 0, present: 2, paidDays: 1, workingDays: 27, proratedBase: 1000 });
  });
  it("uses mutually exclusive pulse statuses, with break taking precedence over late", () => {
    const date = new Date().toLocaleDateString("en-CA");
    const s = normalizeState({ attendance: [{ id: "a", empId: employee.id, date, inAt: 1, late: true, onBreak: true }] });
    expect(teamStatus(employee, s)).toBe("On Break");
    s.attendance[0] = { ...s.attendance[0], id: "a", empId: employee.id, date, onBreak: false };
    expect(teamStatus(employee, s)).toBe("Late");
    s.attendance[0] = { ...s.attendance[0], id: "a", empId: employee.id, date, outAt: 2 };
    expect(teamStatus(employee, s)).toBe("Absent");
  });
  it("restricts meeting rooms to secure Meet, Zoom and Jitsi links", () => {
    expect(validMeetingLink("https://meet.jit.si/woodzire-test")).toBe("https://meet.jit.si/woodzire-test");
    expect(validMeetingLink("javascript:alert(1)")).toBeNull();
    expect(validMeetingLink("https://zoom.us.attacker.test/room")).toBeNull();
  });
  it("uses exactly two hours for task reminders", () => {
    expect(REMINDER_MS).toBe(7200000);
    const t = { lastPing: 1000 } as Task;
    expect(untilPing(t, 1000)).toBe("2h 0m");
    expect(untilPing(t, 3601000)).toBe("1h 0m");
  });
  it("subtracts advances and deductions from salary for the selected month", () => {
    const s = normalizeState({
      employees: [employee],
      adjustments: [
        { id: "a", empId: "staff", month: "2026-10", amount: 3000, kind: "Advance", note: "" },
        { id: "b", empId: "staff", month: "2026-10", amount: 1000, kind: "Deduction", note: "" },
        { id: "c", empId: "staff", month: "2026-09", amount: 9000, kind: "Advance", note: "" },
      ],
    });
    expect(payrollRow(employee, s, "2026-10")).toMatchObject({
      advance: 3000,
      deductions: 4000,
      net: 21000,
    });
  });
  it("counts unique present days in the payroll month", () => {
    const s = normalizeState({
      attendance: [
        { id: "a", empId: "staff", date: "2026-10-01", inAt: 1 },
        { id: "b", empId: "staff", date: "2026-10-01", inAt: 2 },
        { id: "c", empId: "staff", date: "2026-09-30", inAt: 3 },
      ],
    });
    expect(payrollRow(employee, s, "2026-10").present).toBe(1);
  });
  it("never returns a negative payable balance", () => {
    const s = normalizeState({
      adjustments: [
        { id: "a", empId: "staff", month: "2026-10", amount: 30000, kind: "Advance", note: "" },
      ],
    });
    expect(payrollRow(employee, s, "2026-10").net).toBe(0);
  });
  it("retains legacy staff records and supplies the five permission controls", () => {
    const legacy = { ...employee, permissions: undefined };
    const s = normalizeState({ employees: [legacy as unknown as Employee] });
    expect(s.employees[0]?.name).toBe("Rahul");
    expect(s.employees[0]?.permissions).toEqual({
      assign: false,
      publicTasks: true,
      payroll: false,
      approve: false,
      outside: false,
    });
  });
});
