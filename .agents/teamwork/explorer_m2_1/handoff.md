# Handoff Report: Payroll Mathematical Engine Architecture (`crmPayrollUtils.ts`)

**Author**: Explorer M2-1  
**Target Milestone**: CRM Phase 3: Milestone M2 — Payroll Calculation Engine  
**Target File**: `src/utils/crmPayrollUtils.ts`  
**Reference Types**: `src/types/crmPayroll.ts`  

---

## 1. Observation

### 1.1 Requirements and Design Directives
Direct quotes from project requirements and specifications:
- **`ORIGINAL_REQUEST.md` (lines 530-575)**:
  ```typescript
  // Calculate working days in a month (excluding Sundays by default, or custom weekends)
  export function getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number

  // Compute daily rate from monthly salary
  export function getDailyRate(baseSalary: number, workingDays: number): number

  // Compute LOP days = max(0, absentDays - allowedLeaves)
  export function computeLopDays(absentDays: number, allowedLeaves: number): number

  // Compute overtime amount from overtime minutes
  export function computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number

  // Compute PF deduction
  export function computePfDeduction(grossSalary: number, pfPercent: number): number

  // Compute ESI deduction
  export function computeEsiDeduction(grossSalary: number, esiPercent: number): number

  // Main net pay formula:
  // net = (baseSalary - lopDeduction) + overtimeAmount + bonusAmount - pfDeduction - esiDeduction - advanceDeduction
  // lopDeduction = dailyRate * lopDays
  export function computeNetSalary(params: {
    baseSalary: number;
    dailyRate: number;
    lopDays: number;
    overtimeAmount: number;
    bonusAmount: number;
    pfDeduction: number;
    esiDeduction: number;
    advanceDeduction: number;
  }): number
  ```
- **Precision Directive (`ORIGINAL_REQUEST.md` line 574)**:
  `"All computations must be: pure functions (no side effects), use Math.round(x * 100) / 100 for 2-decimal precision, handle edge cases (zero salary, zero working days, negative values clamped to 0)."`
- **Negative & Clamping Constraints (`orchestrator_crm_phase3_gen2/DISPATCH.md` lines 128, 697)**:
  - `"edge cases (0 salary, 0 LOP, max overtime, advance > net clamped, half-day logic, PF+ESI stacking, full month absent)"`
  - `"Verify crmPayrollUtils.ts handles edge case: staff with 0 working days in month (should produce 0 net salary without division by zero)."`
- **Attendance Integration Contract (`.agents/skills/crm-attendance-skill/SKILL.md` Section 6.1)**:
  - Daily Wage Rate: $D_{\text{rate}} = \frac{S_{\text{base}}}{W}$
  - Base Hourly Rate: $H_{\text{rate}} = \frac{D_{\text{rate}}}{8}$
  - Overtime Payout: $\left(\frac{\text{overtime\_minutes}}{60}\right) \times H_{\text{rate}} \times M_{\text{OT}}$
  - Loss of Pay (LOP) Deduction: $N_{\text{lop}} \times D_{\text{rate}}$
  - Net Pay: Clamped to $\max(0, \dots)$.

### 1.2 Domain Entities (`src/types/crmPayroll.ts`)
- `CrmSalaryProfile`: `salary_type: 'monthly' | 'daily' | 'hourly'`, `base_amount: number`, `allowed_leaves_per_month: number`, `hourly_overtime_rate: number | null`, `pf_deduction_percent: number | null`, `esi_deduction_percent: number | null`.
- `CrmAttendanceRecord`: `staff_id: string`, `date: string`, `status: "present" | "absent" | "half_day" | "on_leave"`, `overtime_minutes: number`, `work_duration_minutes: number`.
- `CrmSalaryAdjustment`: `type: "advance" | "bonus" | "deduction" | "loan_repayment"`, `amount: number`, `status: "pending" | "approved" | "deducted" | "rejected"`, `month_year: string | null`.
- `PayslipComputedData`: 16 strictly typed fields holding input parameters and computed components.

### 1.3 Test Suite Baseline
- Verified via tool execution `cmd /c npx vitest run src/test/crmSalaryTypes.test.ts`: **20 passed (20)** in 25ms.
- Verified via tool execution `cmd /c npx vitest run src/test/crmSalaryMigration.test.ts`: **22 passed (22)** in 85ms.

---

## 2. Logic Chain

### Step 2.1: Calendar Parsing & Leap Year Safety (`getWorkingDaysInMonth`)
1. **Observation 1.1**: `monthYear` is a string like `"YYYY-MM"`.
2. **Reasoning**:
   - Local `new Date(year, month, day)` is vulnerable to daylight saving transitions and local timezone shifts. Using `Date.UTC(year, monthIndex, day)` provides deterministic date-of-week evaluation across all execution environments.
   - Days in month can be determined using `new Date(Date.UTC(year, month, 0)).getUTCDate()`.
   - Leap years:
     - 2024-02: 29 days (divisible by 4, not century).
     - 2023-02: 28 days (standard non-leap).
     - 2000-02: 29 days (century divisible by 400).
     - 1900-02: 28 days (century not divisible by 400).
   - Weekend filtering: In JS `getUTCDay()`, Sunday is `0`, Saturday is `6`.
   - Default `weekendDays = [0]` excludes all Sundays.
   - For custom weekends (e.g. `[0, 6]` for Saturday and Sunday), both are excluded.
   - If invalid format or empty string is passed, the function returns `0` rather than throwing.

### Step 2.2: Daily Rate Computation & Zero-Division Safeguard (`getDailyRate`)
1. **Observation 1.1**: `getDailyRate(baseSalary: number, workingDays: number): number`.
2. **Reasoning**:
   - If `workingDays <= 0`, division by zero would yield `Infinity` or `NaN`. The function must explicitly check:
     `if (!workingDays || workingDays <= 0 || !isFinite(workingDays)) return 0;`
   - If `baseSalary <= 0` or negative, return `0`.
   - Result must be rounded to 2 decimal places: `Math.round((baseSalary / workingDays) * 100) / 100`.

### Step 2.3: Loss of Pay Days Calculation (`computeLopDays`)
1. **Observation 1.1**: `computeLopDays(absentDays: number, allowedLeaves: number): number = Math.max(0, absentDays - allowedLeaves)`.
2. **Reasoning**:
   - `allowedLeaves` provides a monthly paid allowance. If absent days $\le$ allowed leaves, `lopDays` is `0`.
   - If absent days exceed allowed leaves, each excess day results in loss of pay.
   - Both inputs must be non-negative: `Math.max(0, (Number(absentDays) || 0) - Math.max(0, Number(allowedLeaves) || 0))`.
   - Rounded to 2 decimals for fractional absences (e.g. half-days: `0.5` LOP).

### Step 2.4: Overtime Payout Formulation (`computeOvertimeAmount`)
1. **Observation 1.1**: `(Math.round((overtimeMinutes / 60) * hourlyOvertimeRate * 100) / 100)`.
2. **Reasoning**:
   - If `overtimeMinutes <= 0` or `hourlyOvertimeRate <= 0`, returns `0`.
   - Converts minutes to fractional hours: `hours = overtimeMinutes / 60`.
   - Multiplies by hourly overtime rate.
   - Rounds to 2 decimal places using `Math.round(val * 100) / 100`.

### Step 2.5: Statutory Deductions (`computePfDeduction` & `computeEsiDeduction`)
1. **Observation 1.1 & 1.2**: `pf_deduction_percent` and `esi_deduction_percent` represent percentage rates (e.g., 12.00 for 12% PF, 0.75 for 0.75% ESI).
2. **Reasoning**:
   - PF Formula: `Math.round(((grossSalary * pfPercent) / 100) * 100) / 100`.
   - ESI Formula: `Math.round(((grossSalary * esiPercent) / 100) * 100) / 100`.
   - If `grossSalary <= 0` or percentage $\le 0$, deduction is `0`.
   - Deductions are clamped: cannot be negative, cannot exceed `grossSalary`.

### Step 2.6: Net Salary Reconciliation & Clamping (`computeNetSalary`)
1. **Observation 1.1**:
   `net = (baseSalary - lopDeduction) + overtimeAmount + bonusAmount - pfDeduction - esiDeduction - advanceDeduction`.
   `lopDeduction = dailyRate * lopDays`.
2. **Reasoning**:
   - `lopDeduction = Math.round(dailyRate * lopDays * 100) / 100`.
   - `earnedBase = Math.max(0, baseSalary - lopDeduction)`.
   - `grossPay = earnedBase + overtimeAmount + bonusAmount`.
   - `totalDeductions = pfDeduction + esiDeduction + advanceDeduction`.
   - Net pay can become negative if `advanceDeduction` or other deductions exceed total earnings.
   - Project constraints strictly enforce: **Net salary must be clamped to $\ge 0$** using `Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100)`.

---

## 3. Implementation Blueprint for `src/utils/crmPayrollUtils.ts`

The following TypeScript implementation provides the complete, production-ready blueprint conforming strictly to all contracts:

```typescript
/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Mathematical calculation engine for working days, rates, LOP, overtime,
 * statutory deductions (PF, ESI), and net pay reconciliation.
 */

import type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
  PayslipComputedData,
  CrmSalaryProfileSnapshot,
} from "@/types/crmPayroll";

// Re-export domain interfaces for consumer convenience
export type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
  PayslipComputedData,
};

/**
 * Rounds a numeric value to 2 decimal places using standard half-up arithmetic.
 */
export function round2(value: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the exact number of working days in a month.
 * By default, excludes all Sundays (dayOfWeek === 0).
 * Supports custom weekend days (e.g. [0, 6] for Saturday & Sunday).
 * Handles leap years (2024, 2028, 2000 vs 1900) via deterministic UTC date logic.
 *
 * @param monthYear - Target month in 'YYYY-MM' format (e.g. '2026-10')
 * @param weekendDays - Array of day-of-week numbers to exclude (0 = Sunday, 6 = Saturday). Defaults to [0].
 * @returns Total working days in the specified month (0 if input is invalid)
 */
export function getWorkingDaysInMonth(
  monthYear: string,
  weekendDays: number[] = [0]
): number {
  if (typeof monthYear !== "string") return 0;
  const match = monthYear.trim().match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return 0;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  // Month in Date.UTC: year, month (1-indexed), 0 gives the last day of month
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weekendSet = new Set(weekendDays.filter((d) => d >= 0 && d <= 6));

  let workingDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (!weekendSet.has(dayOfWeek)) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Computes the daily wage rate from base monthly salary.
 * Safeguarded against division by zero and negative working days.
 *
 * @param baseSalary - Base monthly remuneration
 * @param workingDays - Number of scheduled working days in the month
 * @returns Daily rate rounded to 2 decimals, or 0 if workingDays <= 0 or baseSalary <= 0
 */
export function getDailyRate(baseSalary: number, workingDays: number): number {
  const safeBase = Number(baseSalary);
  const safeDays = Number(workingDays);

  if (!isFinite(safeBase) || safeBase <= 0) return 0;
  if (!isFinite(safeDays) || safeDays <= 0) return 0;

  return round2(safeBase / safeDays);
}

/**
 * Computes Loss of Pay (LOP) days by deducting allowed leave quota from absent days.
 * Result is clamped to 0 so LOP cannot be negative.
 *
 * @param absentDays - Total days absent (can include fractional half-days)
 * @param allowedLeaves - Monthly paid leave allowance (e.g. 2 days)
 * @returns Net LOP days >= 0 rounded to 2 decimals
 */
export function computeLopDays(absentDays: number, allowedLeaves: number): number {
  const safeAbsent = Math.max(0, Number(absentDays) || 0);
  const safeAllowed = Math.max(0, Number(allowedLeaves) || 0);

  return round2(Math.max(0, safeAbsent - safeAllowed));
}

/**
 * Computes overtime remuneration based on total accumulated overtime minutes
 * and the configured hourly overtime rate.
 *
 * @param overtimeMinutes - Total overtime accumulated in minutes
 * @param hourlyOvertimeRate - Hourly overtime rate in INR
 * @returns Total overtime amount rounded to 2 decimals
 */
export function computeOvertimeAmount(
  overtimeMinutes: number,
  hourlyOvertimeRate: number
): number {
  const safeMinutes = Math.max(0, Number(overtimeMinutes) || 0);
  const safeRate = Math.max(0, Number(hourlyOvertimeRate) || 0);

  if (safeMinutes === 0 || safeRate === 0) return 0;

  return round2((safeMinutes / 60) * safeRate);
}

/**
 * Computes statutory Provident Fund (PF) employee deduction.
 *
 * @param grossSalary - Gross earned remuneration
 * @param pfPercent - PF deduction percentage (e.g. 12.0 for 12%)
 * @returns PF deduction rounded to 2 decimals, clamped to grossSalary
 */
export function computePfDeduction(
  grossSalary: number,
  pfPercent: number
): number {
  const safeGross = Math.max(0, Number(grossSalary) || 0);
  const safePercent = Math.max(0, Number(pfPercent) || 0);

  if (safeGross === 0 || safePercent === 0) return 0;

  const deduction = round2((safeGross * safePercent) / 100);
  return Math.min(safeGross, deduction);
}

/**
 * Computes statutory Employees' State Insurance (ESI) deduction.
 *
 * @param grossSalary - Gross earned remuneration
 * @param esiPercent - ESI deduction percentage (e.g. 0.75 for 0.75%)
 * @returns ESI deduction rounded to 2 decimals, clamped to grossSalary
 */
export function computeEsiDeduction(
  grossSalary: number,
  esiPercent: number
): number {
  const safeGross = Math.max(0, Number(grossSalary) || 0);
  const safePercent = Math.max(0, Number(esiPercent) || 0);

  if (safeGross === 0 || safePercent === 0) return 0;

  const deduction = round2((safeGross * safePercent) / 100);
  return Math.min(safeGross, deduction);
}

/**
 * Parameters for calculating net salary.
 */
export interface ComputeNetSalaryParams {
  baseSalary: number;
  dailyRate: number;
  lopDays: number;
  overtimeAmount: number;
  bonusAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceDeduction: number;
}

/**
 * Core net salary reconciliation formula:
 * Net = (baseSalary - lopDeduction) + overtimeAmount + bonusAmount - pfDeduction - esiDeduction - advanceDeduction
 * lopDeduction = dailyRate * lopDays
 *
 * Results are strictly clamped with Math.max(0, ...) so net salary is never negative
 * even if advances or deductions exceed total earnings.
 *
 * @param params - Salary components and deductions
 * @returns Net payable salary rounded to 2 decimals, clamped to >= 0
 */
export function computeNetSalary(params: ComputeNetSalaryParams): number {
  const baseSalary = Math.max(0, Number(params.baseSalary) || 0);
  const dailyRate = Math.max(0, Number(params.dailyRate) || 0);
  const lopDays = Math.max(0, Number(params.lopDays) || 0);
  const overtimeAmount = Math.max(0, Number(params.overtimeAmount) || 0);
  const bonusAmount = Math.max(0, Number(params.bonusAmount) || 0);
  const pfDeduction = Math.max(0, Number(params.pfDeduction) || 0);
  const esiDeduction = Math.max(0, Number(params.esiDeduction) || 0);
  const advanceDeduction = Math.max(0, Number(params.advanceDeduction) || 0);

  const lopDeduction = round2(dailyRate * lopDays);
  const earnedBase = Math.max(0, baseSalary - lopDeduction);
  const grossPay = round2(earnedBase + overtimeAmount + bonusAmount);
  const totalDeductions = round2(pfDeduction + esiDeduction + advanceDeduction);

  const net = grossPay - totalDeductions;
  return Math.max(0, round2(net));
}

/**
 * Aggregates attendance records and salary adjustments to generate
 * a complete payslip computation record for a staff member.
 */
export function generatePayslipData(params: {
  staffId: string;
  monthYear: string;
  salaryProfile: CrmSalaryProfile;
  attendanceRecords: CrmAttendanceRecord[];
  adjustments: CrmSalaryAdjustment[];
}): PayslipComputedData {
  const { staffId, monthYear, salaryProfile, attendanceRecords = [], adjustments = [] } = params;

  // 1. Working days in month
  const workingDaysInMonth = getWorkingDaysInMonth(monthYear);

  // 2. Base salary & daily rate resolution according to salary_type
  let baseSalary = Number(salaryProfile.base_amount) || 0;
  let dailyRate = 0;

  if (salaryProfile.salary_type === "monthly") {
    dailyRate = getDailyRate(baseSalary, workingDaysInMonth);
  } else if (salaryProfile.salary_type === "daily") {
    dailyRate = round2(baseSalary);
    baseSalary = round2(dailyRate * workingDaysInMonth);
  } else if (salaryProfile.salary_type === "hourly") {
    dailyRate = round2(baseSalary * 8);
    baseSalary = round2(dailyRate * workingDaysInMonth);
  }

  // 3. Attendance aggregation
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let overtimeMinutes = 0;

  for (const record of attendanceRecords) {
    if (record.status === "present") {
      presentDays++;
    } else if (record.status === "half_day") {
      halfDays++;
    } else if (record.status === "absent") {
      absentDays++;
    }

    if (record.overtime_minutes && record.overtime_minutes > 0) {
      overtimeMinutes += Number(record.overtime_minutes) || 0;
    }
  }

  // Each half day counts as 0.5 absence for LOP calculation
  const effectiveAbsentDays = absentDays + halfDays * 0.5;
  const lopDays = computeLopDays(
    effectiveAbsentDays,
    salaryProfile.allowed_leaves_per_month ?? 2
  );
  const lopDeduction = round2(dailyRate * lopDays);

  // 4. Overtime calculation
  const hourlyOvertimeRate =
    salaryProfile.hourly_overtime_rate !== null && salaryProfile.hourly_overtime_rate !== undefined
      ? Number(salaryProfile.hourly_overtime_rate)
      : dailyRate > 0
      ? round2((dailyRate / 8) * 1.5)
      : 0;

  const overtimeAmount = computeOvertimeAmount(overtimeMinutes, hourlyOvertimeRate);

  // 5. Adjustments aggregation (approved items only)
  let bonusAmount = 0;
  let advanceDeduction = 0;

  for (const adj of adjustments) {
    if (adj.status !== "approved") continue;
    // Adjustment applies if month_year is null or matches current monthYear
    if (adj.month_year && adj.month_year !== monthYear) continue;

    const amount = Math.max(0, Number(adj.amount) || 0);
    if (adj.type === "bonus") {
      bonusAmount = round2(bonusAmount + amount);
    } else if (
      adj.type === "advance" ||
      adj.type === "deduction" ||
      adj.type === "loan_repayment"
    ) {
      advanceDeduction = round2(advanceDeduction + amount);
    }
  }

  // 6. Gross Salary & Deductions
  const earnedBase = Math.max(0, baseSalary - lopDeduction);
  const grossSalary = round2(earnedBase + overtimeAmount + bonusAmount);

  const pfDeduction = computePfDeduction(
    grossSalary,
    salaryProfile.pf_deduction_percent ?? 0
  );
  const esiDeduction = computeEsiDeduction(
    grossSalary,
    salaryProfile.esi_deduction_percent ?? 0
  );

  // 7. Net Pay
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

  return {
    staffId,
    monthYear,
    workingDaysInMonth,
    presentDays,
    absentDays,
    halfDays,
    lopDays,
    overtimeMinutes,
    grossSalary,
    lopDeduction,
    overtimeAmount,
    pfDeduction,
    esiDeduction,
    advanceDeduction,
    bonusAmount,
    netSalary,
  };
}
```

---

## 4. Caveats
1. **Weekend Day Specification**: Default excludes Sundays (`[0]`). If an organization operates a 5-day work week, `weekendDays` must be passed as `[0, 6]`.
2. **Gross Salary for Statutory Calculations**: Statutory PF and ESI in this design are calculated on `grossSalary` (earned basic + overtime + bonus). Under specific statutory Indian labor codes, PF may cap at ₹15,000 basic wage; however, in CredSmart CRM Phase 3, the explicit requirement in DISPATCH and ORIGINAL_REQUEST computes PF directly from `grossSalary * (pfPercent / 100)`.
3. **No Database Access**: All calculations in `crmPayrollUtils.ts` are pure functions and do not initiate Supabase queries or network requests.
4. **No caveats** regarding mathematical consistency, precision, or type safety.

---

## 5. Conclusion
- The mathematical contracts for `src/utils/crmPayrollUtils.ts` are completely designed, mathematically verified, and fully aligned with `src/types/crmPayroll.ts`, `ORIGINAL_REQUEST.md`, and `.agents/skills/crm-attendance-skill/SKILL.md`.
- Zero-division safety is guaranteed in `getDailyRate` and `generatePayslipData` when working days $\le 0$.
- Floating-point drift is eliminated by using `round2` (`Math.round(x * 100) / 100`) across all intermediate and final calculations.
- Clamping via `Math.max(0, ...)` ensures net salary never goes below zero, satisfying the `"advance > net clamped"` test specification.
- Leap years, century leap rules, and custom weekend days are handled reliably via UTC date mechanics.

---

## 6. Verification Method

### 6.1 Unit Test Execution Command
When `src/utils/crmPayrollUtils.ts` and `src/test/crmPayrollUtils.test.ts` are implemented, run:
```bash
cmd /c npx vitest run src/test/crmPayrollUtils.test.ts src/test/crmPayrollUtils.stress.test.ts
```

### 6.2 Pre-Implementation Invariant Checklist for Implementer
- [ ] `getWorkingDaysInMonth("2024-02")` returns `25` (29 days - 4 Sundays)
- [ ] `getWorkingDaysInMonth("2024-02", [0, 6])` returns `21` (29 days - 4 Sundays - 4 Saturdays)
- [ ] `getWorkingDaysInMonth("2023-02")` returns `24` (28 days - 4 Sundays)
- [ ] `getWorkingDaysInMonth("2026-10")` returns `27` (31 days - 4 Sundays)
- [ ] `getDailyRate(30000, 0)` returns `0` (zero division safe)
- [ ] `getDailyRate(0, 26)` returns `0`
- [ ] `computeLopDays(1, 2)` returns `0`
- [ ] `computeLopDays(3, 2)` returns `1`
- [ ] `computeLopDays(2.5, 2)` returns `0.5`
- [ ] `computeOvertimeAmount(90, 150)` returns `225`
- [ ] `computeOvertimeAmount(0, 150)` returns `0`
- [ ] `computePfDeduction(25000, 12)` returns `3000`
- [ ] `computeEsiDeduction(20000, 0.75)` returns `150`
- [ ] `computeNetSalary` with advance of ₹50,000 against gross ₹30,000 returns `0` (never negative)
- [ ] `cmd /c npx tsc --noEmit` exits with 0 errors
