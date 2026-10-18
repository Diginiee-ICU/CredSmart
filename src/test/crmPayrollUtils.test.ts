import { describe, it, expect } from "vitest";
import {
  round2,
  getWorkingDaysInMonth,
  getDailyRate,
  computeLopDays,
  computeOvertimeAmount,
  computePfDeduction,
  computeEsiDeduction,
  computeNetSalary,
  generatePayslipData,
  createSalaryProfileSnapshot,
} from "@/utils/crmPayrollUtils";
import type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
} from "@/types/crmPayroll";

// ============================================================================
// Mock Factories for Deterministic Testing
// ============================================================================

function createMockSalaryProfile(overrides: Partial<CrmSalaryProfile> = {}): CrmSalaryProfile {
  return {
    id: "profile-uuid-001",
    org_id: "org-uuid-001",
    staff_id: "staff-uuid-001",
    salary_type: "monthly",
    base_amount: 52000,
    currency: "INR",
    allowed_leaves_per_month: 2,
    hourly_overtime_rate: 300,
    pf_deduction_percent: 12.0,
    esi_deduction_percent: 1.75,
    is_active: true,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function createMockAttendance(
  date: string,
  status: "present" | "absent" | "half_day" | "on_leave" = "present",
  overtime_minutes: number = 0,
  work_duration_minutes: number = 480
): CrmAttendanceRecord {
  return {
    staff_id: "staff-uuid-001",
    date,
    status,
    overtime_minutes,
    work_duration_minutes,
  };
}

function createMockAdjustment(overrides: Partial<CrmSalaryAdjustment> = {}): CrmSalaryAdjustment {
  return {
    id: "adj-uuid-001",
    org_id: "org-uuid-001",
    staff_id: "staff-uuid-001",
    type: "advance",
    amount: 5000,
    description: "Festival advance",
    month_year: "2026-10",
    status: "approved",
    requested_by: "staff-uuid-001",
    approved_by: "admin-uuid-001",
    approved_at: "2026-10-05T12:00:00Z",
    created_at: "2026-10-05T10:00:00Z",
    ...overrides,
  };
}

// ============================================================================
// Unit Test Suites
// ============================================================================

describe("CRM Phase 3 Milestone 2: crmPayrollUtils Unit Tests", () => {
  // --------------------------------------------------------------------------
  // Suite 0: Rounding Helper
  // --------------------------------------------------------------------------
  describe("Suite 0: Rounding Precision (round2)", () => {
    it("0.1 rounds decimals to two decimal places", () => {
      expect(round2(10.555)).toBe(10.56);
      expect(round2(10.554)).toBe(10.55);
      expect(round2(10)).toBe(10);
    });

    it("0.2 safely handles non-finite and NaN values", () => {
      expect(round2(NaN)).toBe(0);
      expect(round2(Infinity)).toBe(0);
      expect(round2(-Infinity)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 1: Working Days & Calendar Edge Cases
  // --------------------------------------------------------------------------
  describe("Suite 1: Working Days Calculation (getWorkingDaysInMonth)", () => {
    it("1.1 calculates standard month excluding Sundays by default (Oct 2026: 31 days, 4 Sundays = 27 working days)", () => {
      expect(getWorkingDaysInMonth("2026-10")).toBe(27);
    });

    it("1.2 calculates standard month excluding Saturday and Sunday (Oct 2026: 5 Saturdays + 4 Sundays = 22 working days)", () => {
      expect(getWorkingDaysInMonth("2026-10", [0, 6])).toBe(22);
    });

    it("1.3 handles leap year February accurately (Feb 2024: 29 calendar days, 4 Sundays = 25 working days)", () => {
      expect(getWorkingDaysInMonth("2024-02")).toBe(25);
    });

    it("1.4 handles non-leap year February accurately (Feb 2023: 28 calendar days, 4 Sundays = 24 working days)", () => {
      expect(getWorkingDaysInMonth("2023-02")).toBe(24);
    });

    it("1.5 handles century leap year (Year 2000 is leap: 29 days, 4 Sundays = 25 working days)", () => {
      expect(getWorkingDaysInMonth("2000-02")).toBe(25);
    });

    it("1.6 handles empty weekendDays array by returning all calendar days in month (April 2026 = 30 days)", () => {
      expect(getWorkingDaysInMonth("2026-04", [])).toBe(30);
    });

    it("1.7 returns 0 on invalid or malformed monthYear input", () => {
      expect(getWorkingDaysInMonth("")).toBe(0);
      expect(getWorkingDaysInMonth("invalid-date")).toBe(0);
      expect(getWorkingDaysInMonth("2026-13")).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Daily Rate & Div-by-Zero Safeguards
  // --------------------------------------------------------------------------
  describe("Suite 2: Daily Rate Computation (getDailyRate)", () => {
    it("2.1 calculates clean daily rate for whole division (₹52,000 on 26 days = ₹2,000.00)", () => {
      expect(getDailyRate(52000, 26)).toBe(2000);
    });

    it("2.2 prevents division by zero when workingDays is 0 (returns 0 instead of Infinity)", () => {
      expect(getDailyRate(60000, 0)).toBe(0);
    });

    it("2.3 handles negative working days safely by returning 0", () => {
      expect(getDailyRate(50000, -10)).toBe(0);
    });

    it("2.4 handles zero base salary by returning 0", () => {
      expect(getDailyRate(0, 26)).toBe(0);
    });

    it("2.5 handles negative base salary safely by returning 0", () => {
      expect(getDailyRate(-50000, 26)).toBe(0);
    });

    it("2.6 accurately rounds fractional daily rate to 2 decimal places (₹50,000 on 27 days = ₹1,851.85)", () => {
      expect(getDailyRate(50000, 27)).toBe(1851.85);
    });

    it("2.7 handles irregular repeating decimals accurately (₹100,000 on 23 days = ₹4,347.83)", () => {
      expect(getDailyRate(100000, 23)).toBe(4347.83);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Loss of Pay (LOP) Days Computation
  // --------------------------------------------------------------------------
  describe("Suite 3: Loss of Pay Days Calculation (computeLopDays)", () => {
    it("3.1 returns 0 LOP days when absent days is 0 and allowed leaves is 0", () => {
      expect(computeLopDays(0, 0)).toBe(0);
    });

    it("3.2 returns 0 LOP days when allowed leaves exceeds absent days (1 absent, 2 allowed)", () => {
      expect(computeLopDays(1, 2)).toBe(0);
    });

    it("3.3 returns 0 LOP days when allowed leaves exactly equals absent days (2 absent, 2 allowed)", () => {
      expect(computeLopDays(2, 2)).toBe(0);
    });

    it("3.4 accurately calculates LOP when absent days exceed allowed leaves (5 absent, 2 allowed = 3 LOP)", () => {
      expect(computeLopDays(5, 2)).toBe(3);
    });

    it("3.5 supports fractional half-day absences (2.5 absent, 2 allowed = 0.5 LOP)", () => {
      expect(computeLopDays(2.5, 2)).toBe(0.5);
    });

    it("3.6 clamps negative absent days or negative allowed leaves safely to 0", () => {
      expect(computeLopDays(-5, 2)).toBe(0);
      expect(computeLopDays(3, -2)).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Overtime Amount Computation
  // --------------------------------------------------------------------------
  describe("Suite 4: Overtime Remuneration (computeOvertimeAmount)", () => {
    it("4.1 calculates standard overtime for exact hours (120 minutes = 2 hrs @ ₹300/hr = ₹600.00)", () => {
      expect(computeOvertimeAmount(120, 300)).toBe(600);
    });

    it("4.2 accurately computes fractional overtime (45 minutes @ ₹200/hr = ₹150.00)", () => {
      expect(computeOvertimeAmount(45, 200)).toBe(150);
    });

    it("4.3 accurately rounds irregular minutes (37 minutes @ ₹250/hr = ₹154.17)", () => {
      expect(computeOvertimeAmount(37, 250)).toBe(154.17);
    });

    it("4.4 handles massive overtime minutes & high rate without numeric overflow (60,000 mins @ ₹1,500/hr = ₹1,500,000.00)", () => {
      expect(computeOvertimeAmount(60000, 1500)).toBe(1500000);
    });

    it("4.5 returns 0 when overtime minutes is 0 or hourly rate is 0", () => {
      expect(computeOvertimeAmount(0, 500)).toBe(0);
      expect(computeOvertimeAmount(120, 0)).toBe(0);
    });

    it("4.6 clamps negative overtime minutes or negative rate safely to 0", () => {
      expect(computeOvertimeAmount(-60, 300)).toBe(0);
      expect(computeOvertimeAmount(60, -300)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Statutory Deductions — PF & ESI
  // --------------------------------------------------------------------------
  describe("Suite 5: Statutory Deductions (computePfDeduction, computeEsiDeduction)", () => {
    it("5.1 computes standard statutory PF deduction (12% of ₹50,000 = ₹6,000.00)", () => {
      expect(computePfDeduction(50000, 12)).toBe(6000);
    });

    it("5.2 handles PF boundary percentage of 0% (returns 0)", () => {
      expect(computePfDeduction(50000, 0)).toBe(0);
    });

    it("5.3 handles PF boundary percentage of 100% (deducts full gross salary)", () => {
      expect(computePfDeduction(50000, 100)).toBe(50000);
    });

    it("5.4 computes standard statutory ESI deduction (1.75% of ₹20,000 = ₹350.00)", () => {
      expect(computeEsiDeduction(20000, 1.75)).toBe(350);
    });

    it("5.5 computes standard alternate ESI deduction (0.75% of ₹20,000 = ₹150.00)", () => {
      expect(computeEsiDeduction(20000, 0.75)).toBe(150);
    });

    it("5.6 handles ESI boundary percentages 0% and 100%", () => {
      expect(computeEsiDeduction(20000, 0)).toBe(0);
      expect(computeEsiDeduction(20000, 100)).toBe(20000);
    });

    it("5.7 rounds statutory deductions to 2 decimals on fractional earnings (1.75% of ₹21,333.33 = ₹373.33)", () => {
      expect(computeEsiDeduction(21333.33, 1.75)).toBe(373.33);
    });

    it("5.8 clamps negative gross salary or negative percentages safely to 0", () => {
      expect(computePfDeduction(-50000, 12)).toBe(0);
      expect(computePfDeduction(50000, -12)).toBe(0);
      expect(computeEsiDeduction(-20000, 1.75)).toBe(0);
      expect(computeEsiDeduction(20000, -1.75)).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Net Salary Clamping & Stacking
  // --------------------------------------------------------------------------
  describe("Suite 6: Net Salary Reconciliation (computeNetSalary)", () => {
    it("6.1 calculates clean net salary with LOP, OT, bonus, PF, ESI, and advance", () => {
      const net = computeNetSalary({
        baseSalary: 50000,
        dailyRate: 2000,
        lopDays: 1, // LOP deduction = ₹2,000 -> earnedBase = ₹48,000
        overtimeAmount: 1500,
        bonusAmount: 3000, // grossPay = 48000 + 1500 + 3000 = ₹52,500
        pfDeduction: 6300,
        esiDeduction: 918.75,
        advanceDeduction: 5000, // totalDeductions = 6300 + 918.75 + 5000 = ₹12,218.75
      });
      // net = 52,500 - 12,218.75 = 40,281.25
      expect(net).toBe(40281.25);
    });

    it("6.2 clamps net salary strictly to 0 when advance deduction exceeds gross earnings", () => {
      const net = computeNetSalary({
        baseSalary: 30000,
        dailyRate: 1200,
        lopDays: 0,
        overtimeAmount: 0,
        bonusAmount: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        advanceDeduction: 50000, // exceeds ₹30,000 gross
      });
      expect(net).toBe(0);
    });

    it("6.3 clamps net salary to 0 when stacked statutory and advance deductions exceed gross", () => {
      const net = computeNetSalary({
        baseSalary: 40000,
        dailyRate: 1600,
        lopDays: 10, // LOP deduction = ₹16,000 -> earnedBase = ₹24,000
        overtimeAmount: 0,
        bonusAmount: 0, // gross = ₹24,000
        pfDeduction: 2880,
        esiDeduction: 420,
        advanceDeduction: 25000, // total deductions = 2880 + 420 + 25000 = ₹28,300 > ₹24,000
      });
      expect(net).toBe(0);
    });

    it("6.4 returns 0 net salary when employee is absent for the full month (LOP equals base salary)", () => {
      const net = computeNetSalary({
        baseSalary: 50000,
        dailyRate: 2000,
        lopDays: 25, // 25 days * ₹2,000 = ₹50,000 LOP deduction
        overtimeAmount: 0,
        bonusAmount: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        advanceDeduction: 0,
      });
      expect(net).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Full Payslip Generation & Integration
  // --------------------------------------------------------------------------
  describe("Suite 7: Payslip Data Generation (generatePayslipData)", () => {
    it("7.1 generates complete payslip with attendance aggregations and approved adjustments", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000, // 27 working days in Oct 2026 -> dailyRate = ₹2,000
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 12,
        esi_deduction_percent: 1.75,
      });

      // 24 present, 2 half-days, 1 absent -> total working days 27
      const attendance: CrmAttendanceRecord[] = [
        ...Array(24).fill(null).map((_, i) => createMockAttendance(`2026-10-0${i + 1}`, "present")),
        createMockAttendance("2026-10-26", "half_day", 60),
        createMockAttendance("2026-10-27", "half_day", 60),
        createMockAttendance("2026-10-28", "absent"),
      ];

      const adjustments: CrmSalaryAdjustment[] = [
        createMockAdjustment({ type: "advance", amount: 4000, status: "approved" }),
        createMockAdjustment({ type: "bonus", amount: 2000, status: "approved" }),
      ];

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: attendance,
        adjustments,
      });

      expect(result.staffId).toBe("staff-uuid-001");
      expect(result.monthYear).toBe("2026-10");
      expect(result.workingDaysInMonth).toBe(27);
      expect(result.presentDays).toBe(24);
      expect(result.halfDays).toBe(2);
      expect(result.absentDays).toBe(1);

      // Effective absent = 1 absent + (2 half-days * 0.5) = 2.0 days
      // Allowed leaves = 2 -> LOP days = max(0, 2 - 2) = 0
      expect(result.lopDays).toBe(0);
      expect(result.lopDeduction).toBe(0);

      // Overtime minutes: 60 + 60 = 120 mins = 2 hrs @ ₹300 = ₹600.00
      expect(result.overtimeMinutes).toBe(120);
      expect(result.overtimeAmount).toBe(600);

      // Bonus = ₹2,000. Gross = base (54,000) + OT (600) + bonus (2,000) = ₹56,600
      expect(result.bonusAmount).toBe(2000);
      expect(result.grossSalary).toBe(56600);

      // PF (12% of 56,600) = ₹6,792.00
      expect(result.pfDeduction).toBe(6792);

      // ESI (1.75% of 56,600) = ₹990.50
      expect(result.esiDeduction).toBe(990.5);

      // Advance deduction = ₹4,000
      expect(result.advanceDeduction).toBe(4000);

      // Net = 56,600 - (6,792 + 990.50 + 4,000) = 56,600 - 11,782.50 = 44,817.50
      expect(result.netSalary).toBe(44817.5);
    });

    it("7.2 accurately calculates half-day absences resulting in LOP deduction", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000,
        allowed_leaves_per_month: 1, // Only 1 allowed leave
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
      });

      // 4 half-days = 2 absent days. LOP = 2 - 1 = 1 day. Daily rate = 54000 / 27 = ₹2,000
      const attendance: CrmAttendanceRecord[] = [
        ...Array(20).fill(null).map((_, i) => createMockAttendance(`2026-10-0${i + 1}`, "present")),
        createMockAttendance("2026-10-21", "half_day"),
        createMockAttendance("2026-10-22", "half_day"),
        createMockAttendance("2026-10-23", "half_day"),
        createMockAttendance("2026-10-24", "half_day"),
      ];

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: attendance,
        adjustments: [],
      });

      expect(result.halfDays).toBe(4);
      expect(result.lopDays).toBe(1);
      expect(result.lopDeduction).toBe(2000);
      expect(result.netSalary).toBe(52000);
    });

    it("7.3 strictly filters adjustments to include only approved items and exclude pending/rejected", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
      });

      const adjustments: CrmSalaryAdjustment[] = [
        createMockAdjustment({ id: "a1", type: "advance", amount: 3000, status: "approved" }),
        createMockAdjustment({ id: "a2", type: "advance", amount: 5000, status: "pending" }), // Ignored
        createMockAdjustment({ id: "a3", type: "advance", amount: 7000, status: "rejected" }), // Ignored
        createMockAdjustment({ id: "b1", type: "bonus", amount: 2500, status: "approved" }),
        createMockAdjustment({ id: "b2", type: "bonus", amount: 1500, status: "pending" }), // Ignored
      ];

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: [],
        adjustments,
      });

      expect(result.advanceDeduction).toBe(3000);
      expect(result.bonusAmount).toBe(2500);
    });

    it("7.4 handles staff with zero attendance records safely as 0 absences when no records logged", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000,
        allowed_leaves_per_month: 0,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
      });

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: [],
        adjustments: [],
      });

      expect(result.presentDays).toBe(0);
      expect(result.absentDays).toBe(0);
      expect(result.netSalary).toBe(54000);
    });

    it("7.5 safely prevents division by zero when working days in month is 0", () => {
      const profile = createMockSalaryProfile({ base_amount: 50000 });

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "invalid-month",
        salaryProfile: profile,
        attendanceRecords: [],
        adjustments: [],
      });

      expect(result.workingDaysInMonth).toBe(0);
      expect(result.netSalary).toBe(0);
    });

    it("7.6 correctly handles full month absent records resulting in 0 net pay", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000,
        allowed_leaves_per_month: 0, // No leave buffer
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
      });

      // 27 absent records in Oct 2026
      const attendance: CrmAttendanceRecord[] = Array(27).fill(null).map((_, i) =>
        createMockAttendance(`2026-10-${String(i + 1).padStart(2, "0")}`, "absent")
      );

      const result = generatePayslipData({
        staffId: "staff-uuid-001",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: attendance,
        adjustments: [],
      });

      expect(result.absentDays).toBe(27);
      expect(result.lopDays).toBe(27);
      expect(result.lopDeduction).toBe(54000);
      expect(result.netSalary).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Salary Profile Snapshot
  // --------------------------------------------------------------------------
  describe("Suite 8: Salary Profile Snapshot (createSalaryProfileSnapshot)", () => {
    it("8.1 creates immutable snapshot with proper rounding and non-null types", () => {
      const profile = createMockSalaryProfile({
        salary_type: "monthly",
        base_amount: 60000.555,
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 350.456,
        pf_deduction_percent: 12.0,
        esi_deduction_percent: 1.75,
      });

      const snapshot = createSalaryProfileSnapshot(profile);
      expect(snapshot.salary_type).toBe("monthly");
      expect(snapshot.base_amount).toBe(60000.56);
      expect(snapshot.currency).toBe("INR");
      expect(snapshot.allowed_leaves_per_month).toBe(2);
      expect(snapshot.hourly_overtime_rate).toBe(350.46);
      expect(snapshot.pf_deduction_percent).toBe(12.0);
      expect(snapshot.esi_deduction_percent).toBe(1.75);
    });

    it("8.2 safely handles null or undefined rates by defaulting to 0", () => {
      const profile = createMockSalaryProfile({
        hourly_overtime_rate: null,
        pf_deduction_percent: null,
        esi_deduction_percent: null,
      });

      const snapshot = createSalaryProfileSnapshot(profile);
      expect(snapshot.hourly_overtime_rate).toBe(0);
      expect(snapshot.pf_deduction_percent).toBe(0);
      expect(snapshot.esi_deduction_percent).toBe(0);
    });
  });
});
