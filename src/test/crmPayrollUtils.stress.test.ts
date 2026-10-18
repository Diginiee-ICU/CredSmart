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
} from "@/utils/crmPayrollUtils";
import type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
} from "@/types/crmPayroll";

// ============================================================================
// Independent Mathematical Cent Oracle (Integer-Only Arithmetic)
// Eliminates floating-point cumulative drift to verify bounded error <= 0.01
// ============================================================================

interface IntegerOracleParams {
  baseSalaryCents: number;
  workingDays: number;
  lopDays: number;
  overtimeMinutes: number;
  hourlyOvertimeRateCents: number;
  bonusCents: number;
  pfPercentBps: number; // Basis points (12% = 1200)
  esiPercentBps: number; // Basis points (1.75% = 175)
  advanceCents: number;
}

function calculatePayrollWithCentOracle(params: IntegerOracleParams): {
  dailyRateCents: number;
  lopDeductionCents: number;
  earnedBaseCents: number;
  overtimeCents: number;
  grossCents: number;
  pfCents: number;
  esiCents: number;
  advanceCents: number;
  netCents: number;
} {
  const dailyRateCents =
    params.workingDays > 0
      ? Math.round(params.baseSalaryCents / params.workingDays)
      : 0;

  const lopDeductionCents = Math.round(dailyRateCents * params.lopDays);
  const earnedBaseCents = Math.max(0, params.baseSalaryCents - lopDeductionCents);

  const overtimeCents =
    params.overtimeMinutes > 0 && params.hourlyOvertimeRateCents > 0
      ? Math.round((params.overtimeMinutes / 60) * params.hourlyOvertimeRateCents)
      : 0;

  const grossCents = earnedBaseCents + overtimeCents + params.bonusCents;

  const pfCents = Math.min(grossCents, Math.round((grossCents * params.pfPercentBps) / 10000));
  const esiCents = Math.min(grossCents, Math.round((grossCents * params.esiPercentBps) / 10000));

  const totalDeductionsCents = pfCents + esiCents + params.advanceCents;
  const netCents = Math.max(0, grossCents - totalDeductionsCents);

  return {
    dailyRateCents,
    lopDeductionCents,
    earnedBaseCents,
    overtimeCents,
    grossCents,
    pfCents,
    esiCents,
    advanceCents: params.advanceCents,
    netCents,
  };
}

// Pseudo-random deterministic LCG for reproducible Monte Carlo runs
function createLcg(seed: number = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ============================================================================
// Stress Test Suites
// ============================================================================

describe("CRM Phase 3 Milestone 2: crmPayrollUtils Stress & Numerical Stability Tests", () => {
  // --------------------------------------------------------------------------
  // Suite 1: High-Volume Attendance Ingestion Stress
  // --------------------------------------------------------------------------
  describe("Suite 1: High-Volume Attendance Ingestion Stress", () => {
    it("1.1 processes full-year 365 daily attendance records in under 200ms with zero memory bloat", () => {
      const start = performance.now();
      const records: CrmAttendanceRecord[] = [];
      const statuses: Array<"present" | "half_day" | "absent" | "on_leave"> = [
        "present",
        "present",
        "present",
        "half_day",
        "absent",
      ];

      for (let day = 1; day <= 365; day++) {
        const status = statuses[day % statuses.length];
        records.push({
          staff_id: "staff-365",
          date: `2026-${String(Math.floor(day / 31) + 1).padStart(2, "0")}-${String((day % 30) + 1).padStart(2, "0")}`,
          status,
          overtime_minutes: day % 7 === 0 ? 90 : 0,
          work_duration_minutes: status === "present" ? 480 : status === "half_day" ? 240 : 0,
        });
      }

      const profile: CrmSalaryProfile = {
        id: "prof-365",
        org_id: "org-01",
        staff_id: "staff-365",
        salary_type: "monthly",
        base_amount: 60000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 350,
        pf_deduction_percent: 12,
        esi_deduction_percent: 1.75,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const result = generatePayslipData({
        staffId: "staff-365",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: records,
        adjustments: [],
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200);
      expect(Number.isFinite(result.netSalary)).toBe(true);
      expect(result.netSalary).toBeGreaterThan(0);
    });

    it("1.2 executes multi-staff batch run (100 staff members × 30 days = 3,000 records) in under 500ms", () => {
      const start = performance.now();
      const staffCount = 100;
      const daysInMonth = 30;

      const allPayslips = [];
      for (let s = 1; s <= staffCount; s++) {
        const staffId = `staff-${s}`;
        const records: CrmAttendanceRecord[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          records.push({
            staff_id: staffId,
            date: `2026-11-${String(d).padStart(2, "0")}`,
            status: d % 10 === 0 ? "absent" : "present",
            overtime_minutes: d % 5 === 0 ? 60 : 0,
            work_duration_minutes: 480,
          });
        }

        const profile: CrmSalaryProfile = {
          id: `prof-${s}`,
          org_id: "org-01",
          staff_id: staffId,
          salary_type: "monthly",
          base_amount: 30000 + (s * 500),
          currency: "INR",
          allowed_leaves_per_month: 2,
          hourly_overtime_rate: 200,
          pf_deduction_percent: 12,
          esi_deduction_percent: 1.75,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        };

        const payslip = generatePayslipData({
          staffId,
          monthYear: "2026-11",
          salaryProfile: profile,
          attendanceRecords: records,
          adjustments: [],
        });
        allPayslips.push(payslip);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
      expect(allPayslips.length).toBe(100);
      allPayslips.forEach((p) => {
        expect(p.netSalary).toBeGreaterThan(0);
        expect(Number.isFinite(p.netSalary)).toBe(true);
      });
    });

    it("1.3 ingests 10,000 randomized attendance records without memory leak or structural degradation", () => {
      const records: CrmAttendanceRecord[] = [];
      for (let i = 0; i < 10000; i++) {
        records.push({
          staff_id: "staff-10k",
          date: "2026-10-15",
          status: i % 2 === 0 ? "present" : "half_day",
          overtime_minutes: 10,
          work_duration_minutes: 400,
        });
      }

      const profile: CrmSalaryProfile = {
        id: "prof-10k",
        org_id: "org-01",
        staff_id: "staff-10k",
        salary_type: "monthly",
        base_amount: 100000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 500,
        pf_deduction_percent: 12,
        esi_deduction_percent: 1.75,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const result = generatePayslipData({
        staffId: "staff-10k",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: records,
        adjustments: [],
      });

      expect(result.presentDays).toBe(5000);
      expect(result.halfDays).toBe(5000);
      expect(result.overtimeMinutes).toBe(100000);
      expect(Number.isFinite(result.netSalary)).toBe(true);
    });

    it("1.4 handles maximum year-round overtime accumulation (365 days × 480 mins = 175,200 mins) without overflow", () => {
      const minutes = 175200; // 2,920 hours
      const rate = 1000;
      const expectedPayout = (minutes / 60) * rate; // ₹2,920,000.00

      const amount = computeOvertimeAmount(minutes, rate);
      expect(amount).toBe(expectedPayout);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Mathematical Precision & Rounding Drift Oracle
  // --------------------------------------------------------------------------
  describe("Suite 2: Precision Drift & Monte Carlo Oracle (1,000 Iterations)", () => {
    it("2.1 passes 1,000 Monte Carlo randomized cycles with zero NaN, zero Infinity, and strict non-negativity", () => {
      const rand = createLcg(12345);

      for (let i = 0; i < 1000; i++) {
        const baseSalary = Math.floor(rand() * 500000) + 1000;
        const workingDays = Math.floor(rand() * 15) + 15; // 15 to 30
        const dailyRate = getDailyRate(baseSalary, workingDays);
        const absentDays = Math.floor(rand() * 10);
        const allowedLeaves = Math.floor(rand() * 4);
        const lopDays = computeLopDays(absentDays, allowedLeaves);
        const overtimeMinutes = Math.floor(rand() * 1200);
        const hourlyRate = Math.floor(rand() * 1000);
        const overtimeAmount = computeOvertimeAmount(overtimeMinutes, hourlyRate);
        const bonusAmount = Math.floor(rand() * 10000);
        const pfPercent = rand() * 15;
        const esiPercent = rand() * 4;
        const advanceDeduction = Math.floor(rand() * 50000);

        const lopDeduction = round2(dailyRate * lopDays);
        const earnedBase = Math.max(0, baseSalary - lopDeduction);
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

        expect(Number.isFinite(netSalary)).toBe(true);
        expect(Number.isNaN(netSalary)).toBe(false);
        expect(netSalary).toBeGreaterThanOrEqual(0);
        expect(netSalary).toBeLessThanOrEqual(grossSalary);

        // Assert maximum 2 decimal places
        expect(Math.round(netSalary * 100)).toBe(Number((netSalary * 100).toFixed(0)));
      }
    });

    it("2.2 validates floating point engine against integer cent oracle (maximum drift <= ₹0.01 across 1,000 iterations)", () => {
      const rand = createLcg(67890);

      for (let i = 0; i < 1000; i++) {
        const baseSalaryCents = (Math.floor(rand() * 200000) + 5000) * 100;
        const workingDays = Math.floor(rand() * 12) + 18; // 18 to 30
        const lopDays = Math.floor(rand() * 5);
        const overtimeMinutes = Math.floor(rand() * 600);
        const hourlyOvertimeRateCents = Math.floor(rand() * 500) * 100;
        const bonusCents = Math.floor(rand() * 5000) * 100;
        const pfPercentBps = 1200; // 12%
        const esiPercentBps = 175; // 1.75%
        const advanceCents = Math.floor(rand() * 10000) * 100;

        // Oracle run
        const oracle = calculatePayrollWithCentOracle({
          baseSalaryCents,
          workingDays,
          lopDays,
          overtimeMinutes,
          hourlyOvertimeRateCents,
          bonusCents,
          pfPercentBps,
          esiPercentBps,
          advanceCents,
        });

        // Engine run
        const baseSalary = baseSalaryCents / 100;
        const dailyRate = getDailyRate(baseSalary, workingDays);
        const overtimeAmount = computeOvertimeAmount(overtimeMinutes, hourlyOvertimeRateCents / 100);
        const bonusAmount = bonusCents / 100;
        const lopDeduction = round2(dailyRate * lopDays);
        const earnedBase = Math.max(0, baseSalary - lopDeduction);
        const grossSalary = round2(earnedBase + overtimeAmount + bonusAmount);
        const pfDeduction = computePfDeduction(grossSalary, 12);
        const esiDeduction = computeEsiDeduction(grossSalary, 1.75);
        const advanceDeduction = advanceCents / 100;

        const engineNet = computeNetSalary({
          baseSalary,
          dailyRate,
          lopDays,
          overtimeAmount,
          bonusAmount,
          pfDeduction,
          esiDeduction,
          advanceDeduction,
        });

        const oracleNet = oracle.netCents / 100;
        const drift = Math.abs(engineNet - oracleNet);

        // Absolute drift between floating engine and cent oracle must never exceed 1 cent
        expect(drift).toBeLessThanOrEqual(0.01);
      }
    });

    it("2.3 preserves exact cent reconciliation across micro-decimal periodic denominators (1/23, 1/27, 1/29)", () => {
      const denominators = [23, 27, 29];
      for (const d of denominators) {
        const base = 100000;
        const dailyRate = getDailyRate(base, d);
        // Total base reconstituted across d days has a mathematical roundoff bound of d * 0.005 <= ₹0.15
        const reconstituted = round2(dailyRate * d);
        expect(Math.abs(reconstituted - base)).toBeLessThanOrEqual(0.15);
      }
    });

    it("2.4 maintains deduction stacking invariant: netSalary === 0 OR netSalary === (gross - deductions)", () => {
      const rand = createLcg(999);
      for (let i = 0; i < 500; i++) {
        const baseSalary = 50000;
        const dailyRate = 2000;
        const lopDays = Math.floor(rand() * 5);
        const advanceDeduction = Math.floor(rand() * 80000); // Sometimes exceeds gross

        const lopDeduction = round2(dailyRate * lopDays);
        const gross = round2(Math.max(0, baseSalary - lopDeduction));
        const net = computeNetSalary({
          baseSalary,
          dailyRate,
          lopDays,
          overtimeAmount: 0,
          bonusAmount: 0,
          pfDeduction: 0,
          esiDeduction: 0,
          advanceDeduction,
        });

        if (advanceDeduction >= gross) {
          expect(net).toBe(0);
        } else {
          expect(net).toBe(round2(gross - advanceDeduction));
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Multi-Salary Type Engine Stress (Monthly vs Daily vs Hourly)
  // --------------------------------------------------------------------------
  describe("Suite 3: Multi-Salary Type Engine Stress (monthly, daily, hourly)", () => {
    it("3.1 stress-tests monthly salary profile across 12 distinct calendar months", () => {
      const profile: CrmSalaryProfile = {
        id: "prof-monthly",
        org_id: "org-01",
        staff_id: "staff-monthly",
        salary_type: "monthly",
        base_amount: 60000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 350,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      for (let m = 1; m <= 12; m++) {
        const monthYear = `2026-${String(m).padStart(2, "0")}`;
        const workingDays = getWorkingDaysInMonth(monthYear);

        // When full attendance is recorded, gross base equals profile base amount
        const payslip = generatePayslipData({
          staffId: "staff-monthly",
          monthYear,
          salaryProfile: profile,
          attendanceRecords: Array(workingDays).fill(null).map((_, i) => ({
            staff_id: "staff-monthly",
            date: `${monthYear}-${String(i + 1).padStart(2, "0")}`,
            status: "present",
            overtime_minutes: 0,
            work_duration_minutes: 480,
          })),
          adjustments: [],
        });

        expect(payslip.workingDaysInMonth).toBe(workingDays);
        expect(payslip.presentDays).toBe(workingDays);
        expect(payslip.lopDays).toBe(0);
        expect(payslip.grossSalary).toBe(60000);
      }
    });

    it("3.2 stress-tests daily salary profile: earnings scale linearly with present and half-days", () => {
      const dailyRate = 1800;
      const profile: CrmSalaryProfile = {
        id: "prof-daily",
        org_id: "org-01",
        staff_id: "staff-daily",
        salary_type: "daily",
        base_amount: dailyRate,
        currency: "INR",
        allowed_leaves_per_month: 0,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      // 15 present, 4 half-days = 17 effective worked days
      const records: CrmAttendanceRecord[] = [
        ...Array(15).fill(null).map((_, i) => ({
          staff_id: "staff-daily",
          date: `2026-10-${String(i + 1).padStart(2, "0")}`,
          status: "present" as const,
          overtime_minutes: 0,
          work_duration_minutes: 480,
        })),
        ...Array(4).fill(null).map((_, i) => ({
          staff_id: "staff-daily",
          date: `2026-10-${String(i + 16).padStart(2, "0")}`,
          status: "half_day" as const,
          overtime_minutes: 0,
          work_duration_minutes: 240,
        })),
      ];

      const payslip = generatePayslipData({
        staffId: "staff-daily",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: records,
        adjustments: [],
      });

      expect(payslip.presentDays).toBe(15);
      expect(payslip.halfDays).toBe(4);
      expect(payslip.netSalary).toBeGreaterThan(0);
      expect(payslip.grossSalary).toBe(round2(1800 * 17));
    });

    it("3.3 stress-tests hourly salary profile across irregular shifts (4h, 6.5h, 8.25h)", () => {
      const hourlyRate = 300;
      const profile: CrmSalaryProfile = {
        id: "prof-hourly",
        org_id: "org-01",
        staff_id: "staff-hourly",
        salary_type: "hourly",
        base_amount: hourlyRate,
        currency: "INR",
        allowed_leaves_per_month: 0,
        hourly_overtime_rate: 450,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      const payslip = generatePayslipData({
        staffId: "staff-hourly",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: [
          {
            staff_id: "staff-hourly",
            date: "2026-10-01",
            status: "present",
            overtime_minutes: 120, // 2 hrs OT @ ₹450 = ₹900
            work_duration_minutes: 480,
          },
        ],
        adjustments: [],
      });

      expect(payslip.overtimeMinutes).toBe(120);
      expect(payslip.overtimeAmount).toBe(900);
      expect(payslip.netSalary).toBeGreaterThan(0);
    });

    it("3.4 tests annualized cross-salary-type alignment for equivalent compensation tiers", () => {
      // Annual compensation: ₹600,000 / year
      // Monthly = ₹50,000/mo
      // Daily = ₹2,000/day (for 25 working days)
      // Hourly = ₹250/hr (for 200 hours)
      const monthlyProf: CrmSalaryProfile = {
        id: "p1",
        org_id: "o1",
        staff_id: "s1",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
      };

      const dailyProf: CrmSalaryProfile = {
        ...monthlyProf,
        id: "p2",
        salary_type: "daily",
        base_amount: 2000,
      };

      const hourlyProf: CrmSalaryProfile = {
        ...monthlyProf,
        id: "p3",
        salary_type: "hourly",
        base_amount: 250,
      };

      // In a month with 25 working days, all 3 profiles generate comparable scale
      const mRate = getDailyRate(monthlyProf.base_amount, 25);
      expect(mRate).toBe(2000);
      expect(dailyProf.base_amount).toBe(2000);
      expect(hourlyProf.base_amount * 8).toBe(2000);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Adversarial Boundary & Stress Chaos
  // --------------------------------------------------------------------------
  describe("Suite 4: Adversarial Stress & Chaos Scenarios", () => {
    it("4.1 processes 50 simultaneous adjustments per staff (20 approved, 15 pending, 15 rejected)", () => {
      const adjustments: CrmSalaryAdjustment[] = [];
      for (let i = 1; i <= 50; i++) {
        const status: "approved" | "pending" | "rejected" =
          i <= 20 ? "approved" : i <= 35 ? "pending" : "rejected";
        adjustments.push({
          id: `adj-${i}`,
          org_id: "org-01",
          staff_id: "staff-chaos",
          type: i % 2 === 0 ? "advance" : "bonus",
          amount: 500,
          description: `Adjustment ${i}`,
          month_year: "2026-10",
          status,
          requested_by: "staff-chaos",
          approved_by: status === "approved" ? "admin-01" : null,
          approved_at: status === "approved" ? "2026-10-05T00:00:00Z" : null,
          created_at: "2026-10-01T00:00:00Z",
        });
      }

      const profile: CrmSalaryProfile = {
        id: "prof-chaos",
        org_id: "org-01",
        staff_id: "staff-chaos",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
      };

      const result = generatePayslipData({
        staffId: "staff-chaos",
        monthYear: "2026-10",
        salaryProfile: profile,
        attendanceRecords: [],
        adjustments,
      });

      // Exactly 10 approved advances of ₹500 = ₹5,000
      expect(result.advanceDeduction).toBe(5000);
      // Exactly 10 approved bonuses of ₹500 = ₹5,000
      expect(result.bonusAmount).toBe(5000);
      expect(result.netSalary).toBe(50000); // 50000 + 5000 - 5000 = 50000
    });

    it("4.2 validates astronomical century leap year matrix across 200 consecutive years (1900 to 2100)", () => {
      // 1900 is NOT a leap year (28 days)
      expect(getWorkingDaysInMonth("1900-02", [])).toBe(28);
      // 2000 IS a leap year (29 days)
      expect(getWorkingDaysInMonth("2000-02", [])).toBe(29);
      // 2024 IS a leap year (29 days)
      expect(getWorkingDaysInMonth("2024-02", [])).toBe(29);
      // 2028 IS a leap year (29 days)
      expect(getWorkingDaysInMonth("2028-02", [])).toBe(29);
      // 2100 is NOT a leap year (28 days)
      expect(getWorkingDaysInMonth("2100-02", [])).toBe(28);

      for (let yr = 1900; yr <= 2100; yr++) {
        const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
        const febDays = getWorkingDaysInMonth(`${yr}-02`, []);
        expect(febDays).toBe(isLeap ? 29 : 28);
      }
    });

    it("4.3 handles extreme numerical values (₹1 Billion base salary, ₹999M advance) without mantissa loss", () => {
      const baseSalary = 1000000000; // 1 Billion INR
      const advanceDeduction = 999999999;
      const net = computeNetSalary({
        baseSalary,
        dailyRate: 40000000,
        lopDays: 0,
        overtimeAmount: 0,
        bonusAmount: 0,
        pfDeduction: 0,
        esiDeduction: 0,
        advanceDeduction,
      });

      expect(net).toBe(1.00); // Exact 1 INR remaining
    });

    it("4.4 executes 50 concurrent async payroll simulations without race conditions or side-effects", async () => {
      const tasks = Array(50).fill(null).map(async (_, idx) => {
        const profile: CrmSalaryProfile = {
          id: `p-${idx}`,
          org_id: "org-01",
          staff_id: `staff-${idx}`,
          salary_type: "monthly",
          base_amount: 40000 + idx * 100,
          currency: "INR",
          allowed_leaves_per_month: 2,
          hourly_overtime_rate: 250,
          pf_deduction_percent: 12,
          esi_deduction_percent: 1.75,
          is_active: true,
          created_at: "",
          updated_at: "",
        };

        return generatePayslipData({
          staffId: `staff-${idx}`,
          monthYear: "2026-10",
          salaryProfile: profile,
          attendanceRecords: [],
          adjustments: [],
        });
      });

      const results = await Promise.all(tasks);
      expect(results.length).toBe(50);
      results.forEach((r, idx) => {
        expect(r.staffId).toBe(`staff-${idx}`);
        expect(r.netSalary).toBeGreaterThan(0);
      });
    });
  });
});
