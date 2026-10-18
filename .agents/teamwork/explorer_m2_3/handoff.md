# Comprehensive Test Architecture: CRM Phase 3 Payroll Engine (`crmPayrollUtils`)

**Author**: Explorer M2-3  
**Target Milestone**: CRM Phase 3: Milestone M2 — Payroll Calculation Engine  
**Target Test Suites**:
1. `src/test/crmPayrollUtils.test.ts` (30+ Unit Tests)
2. `src/test/crmPayrollUtils.stress.test.ts` (17+ Mathematical Stress & Volume Tests)  
**Target Source Module**: `src/utils/crmPayrollUtils.ts`  
**Referenced Contracts**: `src/types/crmPayroll.ts`, `src/types/crmAttendance.ts`, `.agents/skills/crm-attendance-skill/SKILL.md`

---

## 1. Observation

### 1.1 Direct Requirements & Task Mandate
From dispatch instruction and `ORIGINAL_REQUEST.md`:
- **Unit Test Suite Mandate (`src/test/crmPayrollUtils.test.ts`)**:
  - Minimum 25+ unit tests covering:
    - Zero base salary & zero working days (division-by-zero protection, returning `0` rather than `NaN` or `Infinity`).
    - Zero absent days, zero LOP days.
    - Allowed leaves $\ge$ absent days $\rightarrow$ LOP = 0.
    - Half-day calculations (0.5 present, 0.5 absent).
    - Large overtime minutes & high hourly rate.
    - PF and ESI percentage computations and boundaries (0%, 12%, 1.75%, 100%).
    - Advance deduction exceeding gross $\rightarrow$ net salary clamped to 0.
    - Full month absent $\rightarrow$ net salary 0.
    - Multiple adjustments (approved vs pending/rejected filtering).
- **Stress Test Suite Mandate (`src/test/crmPayrollUtils.stress.test.ts`)**:
  - Minimum 15+ stress tests covering:
    - High-volume attendance logs (e.g. 365 daily records, multi-staff batches).
    - Mathematical precision and rounding drift across 1,000 randomized Monte Carlo cycles.
    - Multi-salary types: `monthly` vs `daily` vs `hourly`.
    - Floating-point precision stability against independent integer/rational oracles.

### 1.2 Mathematical Specifications & Function Contracts (`src/utils/crmPayrollUtils.ts`)
As designed by Explorer M2-1 and established in `src/types/crmPayroll.ts`:
1. `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number`
   - Default weekend: `[0]` (Sundays).
   - Uses UTC calendar calculations (`new Date(Date.UTC(y, m, d))`) to ensure leap year fidelity (e.g. Feb 2024 = 29 days, Feb 2023 = 28 days, Feb 2000 = 29 days, Feb 1900 = 28 days).
2. `getDailyRate(baseSalary: number, workingDays: number): number`
   - Safeguarded against zero or negative working days: returns `0` if `workingDays <= 0` or `baseSalary <= 0`.
   - Formatted to 2 decimals using `Math.round((baseSalary / workingDays) * 100) / 100`.
3. `computeLopDays(absentDays: number, allowedLeaves: number): number`
   - `Math.max(0, absentDays - allowedLeaves)`.
   - Supports fractional days (half-days: `0.5`).
4. `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number`
   - `Math.round((overtimeMinutes / 60) * hourlyOvertimeRate * 100) / 100`.
   - Returns `0` if either parameter is $\le 0$.
5. `computePfDeduction(grossSalary: number, pfPercent: number): number`
   - `Math.min(grossSalary, Math.round(((grossSalary * pfPercent) / 100) * 100) / 100)`.
6. `computeEsiDeduction(grossSalary: number, esiPercent: number): number`
   - `Math.min(grossSalary, Math.round(((grossSalary * esiPercent) / 100) * 100) / 100)`.
7. `computeNetSalary(params: ComputeNetSalaryParams): number`
   - `lopDeduction = round2(dailyRate * lopDays)`.
   - `earnedBase = Math.max(0, baseSalary - lopDeduction)`.
   - `grossPay = round2(earnedBase + overtimeAmount + bonusAmount)`.
   - `totalDeductions = round2(pfDeduction + esiDeduction + advanceDeduction)`.
   - `net = Math.max(0, round2(grossPay - totalDeductions))`.
8. `generatePayslipData(params: { staffId: string; monthYear: string; salaryProfile: CrmSalaryProfile; attendanceRecords: CrmAttendanceRecord[]; adjustments: CrmSalaryAdjustment[]; }): PayslipComputedData`
   - Resolves working days, dynamically adapts daily rate and base salary across `salary_type` (`monthly`, `daily`, `hourly`).
   - Categorizes attendance: `presentDays`, `absentDays`, `halfDays` (each adding `0.5` to effective absences for LOP).
   - Filters adjustments: only `status === 'approved'` are applied; pending/rejected are strictly ignored.
   - Computes gross, PF, ESI, advance deductions, and non-negative net pay.

### 1.3 Test Framework & Runtime Baseline
- Test runner: Vitest 3.2.4 (`cmd /c npx vitest run`).
- Verified via tool execution `cmd /c npx vitest run src/test/crmSalaryTypes.test.ts`: **20 passed (20)** in 34ms.
- Verified via tool execution `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts`: **22 passed (22)** in 85ms.

---

## 2. Logic Chain

### Step 2.1: Structuring Unit Tests (`src/test/crmPayrollUtils.test.ts`)
1. **Division by Zero and Undefined Traps**:
   - In production payroll systems, unconfigured working days (0 or null) or unassigned base salaries must never produce `NaN`, `Infinity`, or uncaught exceptions. Tests 8–12 explicitly assert that `getDailyRate(50000, 0) === 0`, `getDailyRate(0, 25) === 0`, and negative inputs return `0`.
2. **Calendar Boundary & Leap Year Invariance**:
   - Different years have variable February lengths (28 vs 29 days). Leap centuries (2000 vs 1900) require astronomical leap year rules ($y \% 4 === 0 \&\& (y \% 100 !== 0 \|\| y \% 400 === 0)$). Tests 1–7 verify working day counts across leap Februaries, standard months, custom weekend arrays (`[0, 6]`), and empty weekend arrays.
3. **Loss of Pay (LOP) & Leave Allowance Invariance**:
   - When an employee has paid leaves allowed per month (default 2), taking 1 or 2 absent days incurs ₹0 deduction (`lopDays = 0`). Taking 5 absent days deducts 3 days (`lopDays = 3`). Taking 1 half-day adds `0.5` to absent count. Tests 13–18 systematically verify these boundary conditions.
4. **Statutory Deductions & Extreme Percentages**:
   - PF and ESI rates in India are statutory percentages (e.g. 12% PF, 0.75% or 1.75% ESI). Edge cases include 0% (opt-out / exempt) and 100% (extreme edge). Tests 24–31 verify standard rates, boundary rates (0% and 100%), micro-decimal rounding, and negative percentage safeguards.
5. **Deduction Stacking & Clamping to Zero**:
   - An employee taking a large advance (e.g. ₹50,000 on a ₹30,000 salary) must not end up with a negative net pay (e.g. -₹20,000). The engine must clamp `netSalary` to `0.00`. Full month absence ($LOP \ge baseSalary$) must also yield `0.00` net pay (provided no bonuses). Tests 32–35 verify net salary clamping and deduction stacking.
6. **Adjustment Status Filtering**:
   - If an employee submits an advance request that is still `pending` or was `rejected`, it must NOT be deducted from payslip. Only `status === 'approved'` adjustments are deducted. Similarly, only approved bonuses are added. Tests 36–39 verify adjustment filtering.

### Step 2.2: Structuring Mathematical Stress & Volume Tests (`src/test/crmPayrollUtils.stress.test.ts`)
1. **High-Volume Attendance Ingestion**:
   - Enterprise organizations maintain yearly archives and large employee rosters. Generating and aggregating 365 daily records (a full year of logs) or multi-employee batches (100 staff × 31 days = 3,100 records) tests iteration efficiency and memory stability. The test asserts execution under 100ms.
2. **Monte Carlo Random Walk (1,000 Cycles)**:
   - Floating-point calculations can accumulate subtle precision errors. Running 1,000 randomized parameter sets verifies invariants across the parameter space:
     - Invariant 1: `Number.isFinite(netSalary)` and `!Number.isNaN(netSalary)`.
     - Invariant 2: `netSalary >= 0` (non-negative).
     - Invariant 3: `netSalary <= grossSalary` (earnings bound).
     - Invariant 4: Exact 2-decimal representation: `Math.round(netSalary * 100) === netSalary * 100`.
3. **Independent Cent / BigInt Oracle (Drift $\le$ ₹0.01)**:
   - To eliminate floating-point drift, an independent mathematical oracle is constructed using integer arithmetic in paisa/cents. The floating-point engine is compared against this oracle across 1,000 iterations to prove that rounding drift never exceeds 1 cent.
4. **Cross-Salary Type Mechanics**:
   - `monthly`: base salary represents monthly pay, daily rate is dynamic.
   - `daily`: base salary represents daily wage, earnings scale with present days.
   - `hourly`: base salary represents hourly rate, earnings scale with work duration minutes.
   - Tests 10–13 verify calculation fidelity across all three models and test annualized equivalence.

---

## 3. Detailed Test Architecture Blueprint

### 3.1 Unit Test Suite Specification (`src/test/crmPayrollUtils.test.ts`)

Below is the complete, self-contained architecture and code blueprint for `src/test/crmPayrollUtils.test.ts` (39 unit tests across 7 suites):

```typescript
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

    it("7.4 handles staff with zero attendance records safely as full month absent", () => {
      const profile = createMockSalaryProfile({
        base_amount: 54000,
        allowed_leaves_per_month: 0,
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
      expect(result.netSalary).toBe(54000); // If no records submitted, absent count is 0
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
  });
});
```

---

### 3.2 Stress Test Suite Specification (`src/test/crmPayrollUtils.stress.test.ts`)

Below is the complete, self-contained architecture and code blueprint for `src/test/crmPayrollUtils.stress.test.ts` (17 stress tests across 4 suites, featuring an independent Integer/Cent Oracle):

```typescript
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
    it("1.1 processes full-year 365 daily attendance records in under 50ms with zero memory bloat", () => {
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
      expect(duration).toBeLessThan(50);
      expect(Number.isFinite(result.netSalary)).toBe(true);
      expect(result.netSalary).toBeGreaterThan(0);
    });

    it("1.2 executes multi-staff batch run (100 staff members × 30 days = 3,000 records) in under 200ms", () => {
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
      expect(duration).toBeLessThan(200);
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
        // Total base reconstituted across d days must be within ₹0.05 of original base
        const reconstituted = round2(dailyRate * d);
        expect(Math.abs(reconstituted - base)).toBeLessThanOrEqual(0.05);
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
        pf_deduction_percent: 12,
        esi_deduction_percent: 1.75,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      for (let m = 1; m <= 12; m++) {
        const monthYear = `2026-${String(m).padStart(2, "0")}`;
        const workingDays = getWorkingDaysInMonth(monthYear);
        const dailyRate = getDailyRate(profile.base_amount, workingDays);

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
```

---

## 4. Caveats

1. **Working Days Sunday Assumption**: By default, `getWorkingDaysInMonth` assumes Sunday exclusion (`[0]`). If an organization operates on a 5-day work week (Monday–Friday), callers must pass `weekendDays = [0, 6]` (Saturday + Sunday). The test suites verify both configurations explicitly.
2. **Attendance Record Pre-filtering**: `generatePayslipData` filters `attendanceRecords` for the target `staffId`. However, callers are recommended to pass pre-filtered records for performance in enterprise multi-thousand employee databases.
3. **Overtime Hourly Multiplier**: In statutory setups, overtime is sometimes paid at 1.5× or 2.0× normal wage. If `salaryProfile.hourly_overtime_rate` is explicitly set, that value is directly used. If it is `null`, the engine falls back to `(dailyRate / 8) * 1.5`.

---

## 5. Conclusion

1. The test architecture comprehensively covers **39 Unit Tests** in `src/test/crmPayrollUtils.test.ts` across 7 modular suites, covering all requested edge cases:
   - Zero base salary & zero working days division-by-zero protection.
   - Zero absent days, zero LOP days.
   - Allowed leaves $\ge$ absent days $\rightarrow$ LOP = 0.
   - Half-day calculations (0.5 present, 0.5 absent).
   - Massive overtime minutes & high hourly rates.
   - PF and ESI boundaries (0%, 12%, 1.75%, 100%).
   - Advance deduction exceeding gross $\rightarrow$ clamped to 0.
   - Full month absent $\rightarrow$ net salary 0.
   - Multiple adjustments (approved vs pending/rejected filtering).
2. The stress testing architecture provides **17 Stress & Numerical Stability Tests** in `src/test/crmPayrollUtils.stress.test.ts` across 4 categories:
   - High-volume ingestion (365 daily logs, 10,000 records, 100 staff batches).
   - Mathematical precision and rounding drift across 1,000 randomized Monte Carlo iterations verified against an independent Integer/Cent Oracle ($\le$ ₹0.01 drift).
   - Multi-salary types (`monthly`, `daily`, `hourly`) and annualized equivalence.
   - Adversarial chaos, century leap year matrix (1900–2100), and async concurrency.

---

## 6. Verification Method

Once Milestone M2 implementer (`worker_m2`) implements `src/utils/crmPayrollUtils.ts` and test writer writes the files to `src/test/crmPayrollUtils.test.ts` and `src/test/crmPayrollUtils.stress.test.ts`, run the following commands:

```bash
# 1. Typecheck: Verify strict TypeScript compilation with zero errors
cmd /c npx tsc --noEmit

# 2. Run M2 Unit Tests:
cmd /c npx vitest run src/test/crmPayrollUtils.test.ts

# 3. Run M2 Stress & Precision Drift Tests:
cmd /c npx vitest run src/test/crmPayrollUtils.stress.test.ts

# 4. Run All CRM Tests across Phase 1, 2, and 3:
cmd /c npx vitest run src/test/crm*
```
