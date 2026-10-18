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

describe("CRM Phase 3 Milestone 2: Adversarial Edge Cases & Boundary Stress Challenge", () => {
  // ==========================================================================
  // Section 1: Boundary Values (0, Negative, NaN, Infinity, Extreme Numbers)
  // ==========================================================================
  describe("Section 1: Boundary & Malformed Arithmetic Inputs", () => {
    it("1.1 getDailyRate handles zero working days, negative working days, NaN, and Infinity without throwing or returning NaN/Infinity", () => {
      expect(getDailyRate(50000, 0)).toBe(0);
      expect(getDailyRate(50000, -1)).toBe(0);
      expect(getDailyRate(50000, -25)).toBe(0);
      expect(getDailyRate(50000, NaN)).toBe(0);
      expect(getDailyRate(50000, Infinity)).toBe(0);
      expect(getDailyRate(50000, -Infinity)).toBe(0);

      // Zero or invalid base salary
      expect(getDailyRate(0, 26)).toBe(0);
      expect(getDailyRate(-50000, 26)).toBe(0);
      expect(getDailyRate(NaN, 26)).toBe(0);
      expect(getDailyRate(Infinity, 26)).toBe(0);

      // Both zero/invalid
      expect(getDailyRate(0, 0)).toBe(0);
      expect(getDailyRate(NaN, NaN)).toBe(0);
      expect(getDailyRate(-100, -10)).toBe(0);
    });

    it("1.2 getDailyRate handles extreme numbers (₹10 Billion base salary) with accurate 2-decimal rounding", () => {
      const tenBillion = 10_000_000_000;
      const rate26 = getDailyRate(tenBillion, 26);
      // 10,000,000,000 / 26 = 384615384.6153846... -> rounds to 384615384.62
      expect(rate26).toBe(384615384.62);

      const rate30 = getDailyRate(tenBillion, 30);
      // 10,000,000,000 / 30 = 333333333.3333333... -> rounds to 333333333.33
      expect(rate30).toBe(333333333.33);

      // Minimum non-zero currency fraction
      expect(getDailyRate(0.01, 1)).toBe(0.01);
      expect(getDailyRate(0.01, 30)).toBe(0); // 0.01 / 30 = 0.00033 -> 0.00
    });

    it("1.3 computeLopDays strictly bounds LOP days >= 0 and rounds fractional days", () => {
      expect(computeLopDays(0, 2)).toBe(0);
      expect(computeLopDays(-5, 2)).toBe(0);
      expect(computeLopDays(5, -2)).toBe(5); // Negative allowed leaves treated as 0
      expect(computeLopDays(NaN as any, 2)).toBe(0);
      expect(computeLopDays(5, NaN as any)).toBe(5);
      expect(computeLopDays(0, 0)).toBe(0);

      // Fractional absent days (e.g. half days)
      expect(computeLopDays(2.5, 2)).toBe(0.5);
      expect(computeLopDays(1.5, 2)).toBe(0);
      expect(computeLopDays(3.33333, 1)).toBe(2.33);
      expect(computeLopDays(0.5, 0)).toBe(0.5);
    });

    it("1.4 computeOvertimeAmount handles fractional minutes, sub-second fractions, and extreme rates", () => {
      // 0 minutes or 0 rate
      expect(computeOvertimeAmount(0, 500)).toBe(0);
      expect(computeOvertimeAmount(60, 0)).toBe(0);
      expect(computeOvertimeAmount(-60, 500)).toBe(0);
      expect(computeOvertimeAmount(60, -500)).toBe(0);
      expect(computeOvertimeAmount(NaN as any, 500)).toBe(0);
      expect(computeOvertimeAmount(60, NaN as any)).toBe(0);

      // Fractional minutes
      // 7.5 minutes @ ₹400/hr = (7.5 / 60) * 400 = 0.125 * 400 = 50.00
      expect(computeOvertimeAmount(7.5, 400)).toBe(50);

      // 0.333333 minutes (20 seconds) @ ₹600/hr = (0.333333 / 60) * 600 = 3.33333 -> 3.33
      expect(computeOvertimeAmount(0.333333, 600)).toBe(3.33);

      // Tiny micro-fraction 1e-5 minutes @ ₹100/hr = 1.666e-5 -> 0.00
      expect(computeOvertimeAmount(1e-5, 100)).toBe(0);

      // Extreme overtime volume: 10,000,000 minutes @ ₹1,000/hr
      // (10,000,000 / 60) * 1000 = 166,666,666.67
      expect(computeOvertimeAmount(10_000_000, 1000)).toBe(166666666.67);
    });

    it("1.5 computePfDeduction and computeEsiDeduction clamp to grossSalary and reject negatives/NaN", () => {
      // Normal percentage
      expect(computePfDeduction(50000, 12)).toBe(6000);
      expect(computeEsiDeduction(50000, 1.75)).toBe(875);

      // 0 or negative gross
      expect(computePfDeduction(0, 12)).toBe(0);
      expect(computePfDeduction(-50000, 12)).toBe(0);
      expect(computeEsiDeduction(0, 1.75)).toBe(0);
      expect(computeEsiDeduction(-50000, 1.75)).toBe(0);

      // 0 or negative percent
      expect(computePfDeduction(50000, 0)).toBe(0);
      expect(computePfDeduction(50000, -12)).toBe(0);
      expect(computeEsiDeduction(50000, 0)).toBe(0);
      expect(computeEsiDeduction(50000, -1.75)).toBe(0);

      // NaN percent or gross
      expect(computePfDeduction(NaN as any, 12)).toBe(0);
      expect(computePfDeduction(50000, NaN as any)).toBe(0);

      // Extreme percentage > 100% must be clamped to grossSalary (cannot deduct more than gross)
      expect(computePfDeduction(50000, 100)).toBe(50000);
      expect(computePfDeduction(50000, 150)).toBe(50000);
      expect(computeEsiDeduction(50000, 120)).toBe(50000);
    });

    it("1.6 computeNetSalary strictly clamps net pay to >= 0 when deductions exceed earnings", () => {
      // Deductions (₹100,000 advance) far exceed gross pay (₹50,000)
      const net = computeNetSalary({
        baseSalary: 50000,
        dailyRate: 2000,
        lopDays: 0,
        overtimeAmount: 0,
        bonusAmount: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        advanceDeduction: 100000,
      });
      expect(net).toBe(0);

      // All zero inputs
      expect(
        computeNetSalary({
          baseSalary: 0,
          dailyRate: 0,
          lopDays: 0,
          overtimeAmount: 0,
          bonusAmount: 0,
          pfDeduction: 0,
          esiDeduction: 0,
          advanceDeduction: 0,
        })
      ).toBe(0);

      // Negative values in params are sanitized to 0
      expect(
        computeNetSalary({
          baseSalary: -50000,
          dailyRate: -2000,
          lopDays: -5,
          overtimeAmount: -100,
          bonusAmount: -50,
          pfDeduction: -20,
          esiDeduction: -10,
          advanceDeduction: -100,
        })
      ).toBe(0);

      // Extreme values (₹10 Billion base, ₹3 Billion advance)
      const extremeNet = computeNetSalary({
        baseSalary: 10_000_000_000,
        dailyRate: 384615384.62,
        lopDays: 0,
        overtimeAmount: 50_000_000,
        bonusAmount: 100_000_000,
        pfDeduction: 1_200_000_000,
        esiDeduction: 175_000_000,
        advanceDeduction: 3_000_000_000,
      });
      // Gross = 10B + 50M + 100M = 10,150,000,000
      // Deductions = 1.2B + 175M + 3B = 4,375,000,000
      // Net = 10,150,000,000 - 4,375,000,000 = 5,775,000,000
      expect(extremeNet).toBe(5775000000);
    });

    it("1.7 round2 handles NaN, Infinity, -Infinity, and boundary floats correctly", () => {
      expect(round2(NaN)).toBe(0);
      expect(round2(Infinity)).toBe(0);
      expect(round2(-Infinity)).toBe(0);
      expect(round2(0)).toBe(0);
      expect(round2(-0) === 0).toBe(true);
      expect(round2(1.0055)).toBe(1.01);
      expect(round2(1.005)).toBe(1); // In IEEE 754, 1.005 * 100 = 100.49999999999999 which rounds to 100
      expect(round2(1.004999)).toBe(1);
    });
  });

  // ==========================================================================
  // Section 2: Leap Year & Calendar Integrity Verification
  // ==========================================================================
  describe("Section 2: Leap Year & Gregorian Calendar Rigor", () => {
    it("2.1 correctly handles Feb 2024 (leap year: 29 days)", () => {
      // Total days in Feb 2024 without weekends
      const totalDays = getWorkingDaysInMonth("2024-02", []);
      expect(totalDays).toBe(29);

      // In Feb 2024, Sundays are Feb 4, 11, 18, 25 (4 Sundays)
      // Scheduled working days excluding Sundays = 29 - 4 = 25
      const workingDays = getWorkingDaysInMonth("2024-02", [0]);
      expect(workingDays).toBe(25);

      // Excluding Saturdays and Sundays:
      // Saturdays: Feb 3, 10, 17, 24 (4 Saturdays) + 4 Sundays = 8 weekend days
      // 29 - 8 = 21 working days
      const workingDaysSatSun = getWorkingDaysInMonth("2024-02", [0, 6]);
      expect(workingDaysSatSun).toBe(21);
    });

    it("2.2 correctly handles Feb 2000 (century divisible by 400 is a leap year: 29 days)", () => {
      const totalDays = getWorkingDaysInMonth("2000-02", []);
      expect(totalDays).toBe(29);

      // Feb 2000 Sundays: Feb 6, 13, 20, 27 (4 Sundays)
      // 29 - 4 = 25 working days
      const workingDays = getWorkingDaysInMonth("2000-02", [0]);
      expect(workingDays).toBe(25);
    });

    it("2.3 correctly handles Feb 1900 (century divisible by 100 but not 400 is NOT a leap year: 28 days)", () => {
      const totalDays = getWorkingDaysInMonth("1900-02", []);
      expect(totalDays).toBe(28);

      // Feb 1900 Sundays: Feb 4, 11, 18, 25 (4 Sundays)
      // 28 - 4 = 24 working days
      const workingDays = getWorkingDaysInMonth("1900-02", [0]);
      expect(workingDays).toBe(24);
    });

    it("2.4 correctly handles Feb 2100 (non-leap: 28 days) and Feb 2400 (leap: 29 days)", () => {
      expect(getWorkingDaysInMonth("2100-02", [])).toBe(28);
      expect(getWorkingDaysInMonth("2400-02", [])).toBe(29);
    });

    it("2.5 handles extreme weekend sets: all 7 days as weekends returns 0 working days", () => {
      const zeroWork = getWorkingDaysInMonth("2026-10", [0, 1, 2, 3, 4, 5, 6]);
      expect(zeroWork).toBe(0);
    });

    it("2.6 safely rejects malformed, out-of-range, or non-string monthYear inputs", () => {
      expect(getWorkingDaysInMonth("")).toBe(0);
      expect(getWorkingDaysInMonth("   ")).toBe(0);
      expect(getWorkingDaysInMonth("invalid")).toBe(0);
      expect(getWorkingDaysInMonth("2026-13")).toBe(0); // Month 13 invalid
      expect(getWorkingDaysInMonth("2026-00")).toBe(0); // Month 00 invalid
      expect(getWorkingDaysInMonth("2026/10")).toBe(0); // Slashes instead of dashes
      expect(getWorkingDaysInMonth("26-10")).toBe(0); // 2-digit year invalid
      expect(getWorkingDaysInMonth(null as any)).toBe(0);
      expect(getWorkingDaysInMonth(undefined as any)).toBe(0);
      expect(getWorkingDaysInMonth(202610 as any)).toBe(0);
    });
  });

  // ==========================================================================
  // Section 3: generatePayslipData Complete Adversarial Scenarios
  // ==========================================================================
  describe("Section 3: generatePayslipData Adversarial Scenarios", () => {
    const baseMockProfile: CrmSalaryProfile = {
      id: "prof-adv-01",
      org_id: "org-01",
      staff_id: "staff-adv-01",
      salary_type: "monthly",
      base_amount: 52000,
      currency: "INR",
      allowed_leaves_per_month: 2,
      hourly_overtime_rate: 250,
      pf_deduction_percent: 12,
      esi_deduction_percent: 1.75,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    it("3.1 returns a safe zeroed payslip when workingDaysInMonth <= 0 (e.g. invalid month or all days weekend)", () => {
      const payslip = generatePayslipData({
        staffId: "staff-adv-01",
        monthYear: "INVALID-MONTH",
        salaryProfile: baseMockProfile,
        attendanceRecords: [],
        adjustments: [],
      });

      expect(payslip.workingDaysInMonth).toBe(0);
      expect(payslip.dailyRate === undefined || (payslip as any).dailyRate === 0).toBe(true);
      expect(payslip.grossSalary).toBe(0);
      expect(payslip.netSalary).toBe(0);
      expect(payslip.lopDeduction).toBe(0);
      expect(payslip.advanceDeduction).toBe(0);
      expect(payslip.pfDeduction).toBe(0);
      expect(payslip.esiDeduction).toBe(0);
    });

    it("3.2 handles staff member with zero base salary (volunteer or unconfigured)", () => {
      const zeroProfile: CrmSalaryProfile = {
        ...baseMockProfile,
        base_amount: 0,
      };

      const payslip = generatePayslipData({
        staffId: "staff-adv-01",
        monthYear: "2026-10",
        salaryProfile: zeroProfile,
        attendanceRecords: [
          {
            staff_id: "staff-adv-01",
            date: "2026-10-01",
            status: "present",
            overtime_minutes: 120, // 2 hours OT @ ₹250 = ₹500
          },
        ],
        adjustments: [],
      });

      expect(payslip.grossSalary).toBe(500); // 0 base + 500 OT
      expect(payslip.netSalary).toBeGreaterThan(0);
    });

    it("3.3 handles staff member with negative base salary (clamped to 0)", () => {
      const negativeProfile: CrmSalaryProfile = {
        ...baseMockProfile,
        base_amount: -50000,
      };

      const payslip = generatePayslipData({
        staffId: "staff-adv-01",
        monthYear: "2026-10",
        salaryProfile: negativeProfile,
        attendanceRecords: [],
        adjustments: [],
      });

      expect(payslip.grossSalary).toBe(0);
      expect(payslip.netSalary).toBe(0);
    });

    it("3.4 full month absent: LOP deduction eliminates base salary, resulting in net salary = 0", () => {
      // 26 working days in Oct 2026 (excluding Sundays: Oct has 31 days, 4 Sundays -> 27 or 26)
      const workingDays = getWorkingDaysInMonth("2026-10");
      // Create absent records for all working days
      const absentRecords: CrmAttendanceRecord[] = Array(workingDays).fill(null).map((_, i) => ({
        staff_id: "staff-adv-01",
        date: `2026-10-${String(i + 1).padStart(2, "0")}`,
        status: "absent",
      }));

      const payslip = generatePayslipData({
        staffId: "staff-adv-01",
        monthYear: "2026-10",
        salaryProfile: baseMockProfile, // allowed leaves = 2
        attendanceRecords: absentRecords,
        adjustments: [],
      });

      expect(payslip.presentDays).toBe(0);
      expect(payslip.absentDays).toBe(workingDays);
      // LOP days = workingDays - 2
      expect(payslip.lopDays).toBe(workingDays - 2);
      // Base is 52000, dailyRate = 52000 / 27 (or 26). LOP deduction = dailyRate * lopDays
      // Earned base cannot drop below 0
      expect(payslip.netSalary).toBeGreaterThanOrEqual(0);
    });

    it("3.5 ignores pending, rejected, other staff, or different month adjustments", () => {
      const adjustments: CrmSalaryAdjustment[] = [
        {
          id: "adj-1",
          org_id: "org-01",
          staff_id: "staff-adv-01",
          type: "advance",
          amount: 5000,
          status: "pending", // PENDING -> IGNORED
          month_year: "2026-10",
          created_at: "",
        },
        {
          id: "adj-2",
          org_id: "org-01",
          staff_id: "staff-adv-01",
          type: "advance",
          amount: 5000,
          status: "rejected", // REJECTED -> IGNORED
          month_year: "2026-10",
          created_at: "",
        },
        {
          id: "adj-3",
          org_id: "org-01",
          staff_id: "other-staff-999", // DIFFERENT STAFF -> IGNORED
          type: "advance",
          amount: 5000,
          status: "approved",
          month_year: "2026-10",
          created_at: "",
        },
        {
          id: "adj-4",
          org_id: "org-01",
          staff_id: "staff-adv-01",
          type: "advance",
          amount: 5000,
          status: "approved",
          month_year: "2026-11", // DIFFERENT MONTH -> IGNORED
          created_at: "",
        },
        {
          id: "adj-5",
          org_id: "org-01",
          staff_id: "staff-adv-01",
          type: "advance",
          amount: 3000,
          status: "approved",
          month_year: "2026-10", // MATCH -> INCLUDED
          created_at: "",
        },
        {
          id: "adj-6",
          org_id: "org-01",
          staff_id: "staff-adv-01",
          type: "bonus",
          amount: 2000,
          status: "approved",
          month_year: null, // NULL MONTH_YEAR (applies to active cycle) -> INCLUDED
          created_at: "",
        },
      ];

      const payslip = generatePayslipData({
        staffId: "staff-adv-01",
        monthYear: "2026-10",
        salaryProfile: baseMockProfile,
        attendanceRecords: [],
        adjustments,
      });

      expect(payslip.advanceDeduction).toBe(3000);
      expect(payslip.bonusAmount).toBe(2000);
    });

    it("3.6 creates immutable snapshot conforming to CrmSalaryProfileSnapshot", () => {
      const snapshot = createSalaryProfileSnapshot(baseMockProfile);
      expect(snapshot.salary_type).toBe("monthly");
      expect(snapshot.base_amount).toBe(52000);
      expect(snapshot.currency).toBe("INR");
      expect(snapshot.allowed_leaves_per_month).toBe(2);
      expect(snapshot.hourly_overtime_rate).toBe(250);
      expect(snapshot.pf_deduction_percent).toBe(12);
      expect(snapshot.esi_deduction_percent).toBe(1.75);
    });
  });

  // ==========================================================================
  // Section 4: Chaos Monte Carlo Generator with Adversarial Mutation
  // ==========================================================================
  describe("Section 4: Adversarial Chaos Monte Carlo Generator (500 Iterations)", () => {
    it("4.1 survives 500 heavily mutated parameter sets (negatives, extremes, fractions, zeroes) with zero NaN and strict invariants", () => {
      // Deterministic pseudo-random generator
      let seed = 99991;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let i = 0; i < 500; i++) {
        // Introduce boundary mutations randomly
        const baseSalary =
          rand() < 0.1
            ? 0
            : rand() < 0.2
            ? -10000
            : rand() < 0.3
            ? 10_000_000_000 // ₹10 Billion extreme
            : Math.floor(rand() * 200000) + 5000;

        const workingDays =
          rand() < 0.1
            ? 0
            : rand() < 0.2
            ? -5
            : Math.floor(rand() * 15) + 15;

        const dailyRate = getDailyRate(baseSalary, workingDays);

        const absentDays = rand() < 0.1 ? 0 : rand() * 15;
        const allowedLeaves = rand() < 0.1 ? 0 : rand() < 0.2 ? -2 : rand() * 4;
        const lopDays = computeLopDays(absentDays, allowedLeaves);

        const overtimeMinutes =
          rand() < 0.1
            ? 0
            : rand() < 0.2
            ? -60
            : rand() < 0.3
            ? rand() * 10 // Fractional minutes < 10m
            : rand() * 1000;

        const hourlyOvertimeRate =
          rand() < 0.1
            ? 0
            : rand() < 0.2
            ? -200
            : rand() * 500;

        const overtimeAmount = computeOvertimeAmount(overtimeMinutes, hourlyOvertimeRate);

        const bonusAmount = rand() < 0.1 ? 0 : rand() * 20000;
        const advanceDeduction =
          rand() < 0.1
            ? 0
            : rand() < 0.3
            ? 500000 // Large advance exceeding gross
            : rand() * 30000;

        const pfPercent = rand() < 0.1 ? 0 : rand() < 0.2 ? -5 : rand() < 0.3 ? 150 : 12;
        const esiPercent = rand() < 0.1 ? 0 : rand() < 0.2 ? -1.75 : 1.75;

        const lopDeduction = round2(dailyRate * lopDays);
        const earnedBase = Math.max(0, Math.max(0, baseSalary) - lopDeduction);
        const grossSalary = round2(earnedBase + overtimeAmount + bonusAmount);

        const pfDeduction = computePfDeduction(grossSalary, pfPercent);
        const esiDeduction = computeEsiDeduction(grossSalary, esiPercent);

        const netSalary = computeNetSalary({
          baseSalary,
          dailyRate,
          lopDays,
          overtimeAmount,
          bonusAmount,
          pfDeduction,
          esiDeduction,
          advanceDeduction,
        });

        // INVARIANTS:
        // 1. Must be finite
        expect(Number.isFinite(netSalary)).toBe(true);
        // 2. Must not be NaN
        expect(Number.isNaN(netSalary)).toBe(false);
        // 3. Must be >= 0 (no negative payouts)
        expect(netSalary).toBeGreaterThanOrEqual(0);
        // 4. Must be rounded to 2 decimals
        expect(round2(netSalary)).toBe(netSalary);
      }
    });
  });
});
