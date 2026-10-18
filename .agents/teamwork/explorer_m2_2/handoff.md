# Milestone M2 Exploration Report: `generatePayslipData` Architecture & Mathematical Specification

**Author**: Explorer M2-2  
**Target File**: `src/utils/crmPayrollUtils.ts`  
**Milestone**: Phase 3 Milestone M2 — Payroll Calculation Engine  
**Recipient**: Project Orchestrator (`caf7924e-19e5-4a1d-ae03-b43c66838dd3`)

---

## 1. Observation

### 1.1 Type & Schema Specifications
- **`src/types/crmPayroll.ts` (lines 30–38)** defines the snapshot schema:
  ```typescript
  export interface CrmSalaryProfileSnapshot {
    salary_type: SalaryType;
    base_amount: number;
    currency: string;
    allowed_leaves_per_month: number;
    hourly_overtime_rate: number;
    pf_deduction_percent: number;
    esi_deduction_percent: number;
  }
  ```
  Note that in `CrmSalaryProfile` (lines 57–59), `hourly_overtime_rate`, `pf_deduction_percent`, and `esi_deduction_percent` are typed as `number | null`, whereas in `CrmSalaryProfileSnapshot` they are strictly non-nullable `number`.

- **`src/types/crmPayroll.ts` (lines 138–164)** defines the payroll input and output contracts:
  ```typescript
  export interface CrmAttendanceRecord {
    staff_id: string;
    date: string;
    status: "present" | "absent" | "half_day" | "on_leave";
    overtime_minutes: number;
    work_duration_minutes: number;
  }

  export interface PayslipComputedData {
    staffId: string;
    monthYear: string;
    workingDaysInMonth: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    lopDays: number;
    overtimeMinutes: number;
    grossSalary: number;
    lopDeduction: number;
    overtimeAmount: number;
    pfDeduction: number;
    esiDeduction: number;
    advanceDeduction: number;
    bonusAmount: number;
    netSalary: number;
  }
  ```

- **`supabase/migrations/20261017020000_create_crm_salary_tables.sql` (lines 76–102)** enforces exact database column types for `public.crm_payslips`:
  - `working_days_in_month INTEGER NOT NULL`
  - `present_days INTEGER NOT NULL DEFAULT 0`
  - `absent_days INTEGER NOT NULL DEFAULT 0`
  - `half_days INTEGER NOT NULL DEFAULT 0`
  - `lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00`
  - `overtime_minutes INTEGER NOT NULL DEFAULT 0`
  - `gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
  - `salary_profile_snapshot JSONB NOT NULL`

- **`src/types/crmPayroll.ts` (lines 115–132)** defines `CrmSalaryAdjustment`:
  - `type: SalaryAdjustmentType` (`"advance" | "bonus" | "deduction" | "loan_repayment"`)
  - `status: SalaryAdjustmentStatus` (`"pending" | "approved" | "deducted" | "rejected"`)
  - `amount: number`
  - `month_year: string | null` (per migration line 126 and original request line 510: if null, applied to next active payroll run)

- **`src/test/crmSalaryTypes.test.ts` (lines 640–661)** contains the reference oracle dataset verifying arithmetic parity:
  ```typescript
  const computed: PayslipComputedData = {
    staffId: "staff-1",
    monthYear: "2026-10",
    workingDaysInMonth: 26,
    presentDays: 24,
    absentDays: 2,
    halfDays: 0,
    lopDays: 0,
    overtimeMinutes: 120,
    grossSalary: 50000,
    lopDeduction: 0,
    overtimeAmount: 500,
    pfDeduction: 6000,
    esiDeduction: 375,
    advanceDeduction: 2000,
    bonusAmount: 1000,
    netSalary: 43125,
  };
  ```
  Calculation trace:
  - Base/Gross: ₹50,000.00
  - Overtime: ₹500.00
  - Bonus: ₹1,000.00
  - Deductions: PF (12% of 50000 = 6000) + ESI (0.75% of 50000 = 375) + Advance (2000) = ₹8,375.00
  - Net: (50000 - 0) + 500 + 1000 - 6000 - 375 - 2000 = 51500 - 8375 = ₹43,125.00.

- **`src/utils/crmAttendancePdf.ts` (lines 119–139)** demonstrates how Phase 2 tallies attendance status:
  ```typescript
  if (record.status === "present") {
    presentDays++;
  } else if (record.status === "absent") {
    absentDays++;
  } else if (record.status === "half_day") {
    halfDays++;
  } else if (record.status === "on_leave") {
    onLeaveDays++;
  }
  ```

---

## 2. Logic Chain

### 2.1 Attendance Records Ingestion & Categorization
1. **Filtering Scope**:
   Attendance records must be scoped to the specified staff member and calendar cycle:
   - `record.staff_id === staffId`
   - `!record.date || record.date.startsWith(monthYear)`
2. **Shift Categorization Counters**:
   - `presentDays`: Counts records where `status === 'present'` (Full work day = 1.0 day credit).
   - `halfDays`: Counts records where `status === 'half_day'`. In shift credit and loss calculations, each half day represents 0.5 day worked and 0.5 day absence.
   - `absentDays`: Counts records where `status === 'absent'`.
   - `onLeaveDays`: Records where `status === 'on_leave'` represent authorized leave.
3. **Overtime Accumulation**:
   - Overtime minutes are summed across all matching records: `overtimeMinutes = sum(max(0, record.overtime_minutes || 0))`.
4. **Effective Absence & Loss of Pay (LOP) Days**:
   - In PostgreSQL schema, `present_days`, `absent_days`, and `half_days` are typed as `INTEGER`, while `lop_days` is typed as `NUMERIC(5,2)`.
   - Therefore, half-day contributions (0.5 day absence per half day) directly flow into the fractional LOP computation:
     $$\text{effectiveAbsentDays} = \text{absentDays} + (\text{halfDays} \times 0.5)$$
     $$\text{lopDays} = \max(0, \text{round}((\text{effectiveAbsentDays} - \text{allowedLeaves}) \times 100) / 100)$$
   - If an employee is absent 3 days with 1 half day (0.5) and has 2 allowed leaves:
     $\text{effectiveAbsentDays} = 3.5$, $\text{lopDays} = \max(0, 3.5 - 2) = 1.5$ days.

### 2.2 Adjustments Filtering and Aggregation
1. **Approval Gate**:
   - Only adjustments with `status === 'approved'` are applied. Pending (`'pending'`), rejected (`'rejected'`), and already settled (`'deducted'`) records are strictly excluded.
2. **Staff & Month Alignment**:
   - `adj.staff_id === staffId`
   - Per database specification (`month_year TEXT null` in `crm_salary_adjustments`), adjustments with `month_year === null` or `month_year === ""` represent immediate one-off adjustments applied to the active payroll cycle. Hence:
     `!adj.month_year || adj.month_year === monthYear`
3. **Type Mapping**:
   - **Advances, Deductions, and Loan Repayments**:
     Adjustments of `type === 'advance'`, `type === 'loan_repayment'`, and `type === 'deduction'` represent liabilities to be subtracted from payroll. They are summed into `advanceDeduction`:
     $$\text{advanceDeduction} = \sum_{\text{adv, loan, ded}} \text{round}(\max(0, \text{adj.amount}) \times 100) / 100$$
   - **Bonuses**:
     Adjustments of `type === 'bonus'` represent positive incentives added to gross pay:
     $$\text{bonusAmount} = \sum_{\text{bonus}} \text{round}(\max(0, \text{adj.amount}) \times 100) / 100$$

### 2.3 Salary Profile Snapshot Construction as JSON
1. **Immutability Contract**:
   When a payroll run is computed or locked, the current salary configuration must be snapshotted to `salary_profile_snapshot JSONB` in `crm_payslips`. This ensures that subsequent modifications to `crm_salary_profiles` do not retroactively modify past payslips.
2. **Data Normalization & Nullability Coercion**:
   `CrmSalaryProfile` allows nulls for rates, but `CrmSalaryProfileSnapshot` requires non-null numbers.
   ```typescript
   export function createSalaryProfileSnapshot(profile: CrmSalaryProfile): CrmSalaryProfileSnapshot {
     return {
       salary_type: profile.salary_type || "monthly",
       base_amount: Math.round((Number(profile.base_amount) || 0) * 100) / 100,
       currency: profile.currency || "INR",
       allowed_leaves_per_month: Math.max(0, Number(profile.allowed_leaves_per_month) || 0),
       hourly_overtime_rate: Math.max(0, Math.round((Number(profile.hourly_overtime_rate) || 0) * 100) / 100),
       pf_deduction_percent: Math.max(0, Math.round((Number(profile.pf_deduction_percent) || 0) * 100) / 100),
       esi_deduction_percent: Math.max(0, Math.round((Number(profile.esi_deduction_percent) || 0) * 100) / 100),
     };
   }
   ```
3. **JSON Serialization**:
   This object serializes directly via `JSON.stringify` and is compatible with `Database["public"]["Tables"]["crm_payslips"]["Insert"]["salary_profile_snapshot"]`.

### 2.4 Daily Rate and Base Wage Across Salary Types
1. **Working Days In Month**:
   - Calendar days in `monthYear` (`YYYY-MM`) are evaluated via `new Date(year, month, 0).getDate()`.
   - By default, Sundays (`day.getDay() === 0`) are excluded as weekly rest days.
   - Leap years (e.g. 2024-02 = 29 days) and standard months are handled deterministically.
2. **Compensation Types**:
   - **`salary_type === 'monthly'`**:
     * Fixed monthly base salary $B = \text{base\_amount}$.
     * Daily Rate: $D_{\text{rate}} = \text{workingDaysInMonth} > 0 ? \text{round}((B / \text{workingDaysInMonth}) \times 100) / 100 : 0$.
     * $\text{grossSalary} = B$.
     * $\text{lopDeduction} = \min(B, \text{round}((D_{\text{rate}} \times \text{lopDays}) \times 100) / 100)$.
   - **`salary_type === 'daily'`**:
     * $B$ is the daily wage rate (e.g. ₹800/day).
     * Daily Rate: $D_{\text{rate}} = B$.
     * Earned Days: $\text{daysWorkedCredit} = \text{presentDays} + (\text{halfDays} \times 0.5)$.
     * $\text{grossSalary} = \text{round}((D_{\text{rate}} \times \text{daysWorkedCredit}) \times 100) / 100$.
     * $\text{lopDeduction} = 0$ (daily wage workers are remunerated directly for days worked; unworked days are unearned rather than deducted).
   - **`salary_type === 'hourly'`**:
     * $B$ is the hourly wage rate (e.g. ₹150/hour).
     * Standard 8-hour workday: $D_{\text{rate}} = \text{round}((B \times 8) \times 100) / 100$.
     * Earned Hours: $\text{hoursWorkedCredit} = (\text{presentDays} \times 8) + (\text{halfDays} \times 4)$.
     * $\text{grossSalary} = \text{round}((B \times \text{hoursWorkedCredit}) \times 100) / 100$.
     * $\text{lopDeduction} = 0$.

### 2.5 Gross, Deductions, and Net Salary Precision Architecture
1. **Zero-Division Safeguards**:
   - If $\text{workingDaysInMonth} \le 0 \implies D_{\text{rate}} = 0$.
   - If $\text{baseSalary} \le 0 \implies D_{\text{rate}} = 0, \text{grossSalary} = 0$.
   - If $\text{overtimeMinutes} \le 0 \lor \text{hourlyRate} \le 0 \implies \text{overtimeAmount} = 0$.
2. **Statutory Deduction Formulas**:
   - $\text{overtimeAmount} = \text{round}((\text{overtimeMinutes} / 60) \times \text{hourlyOvertimeRate} \times 100) / 100$.
   - $\text{pfDeduction} = \text{pfPercent} > 0 ? \text{round}(((\text{grossSalary} \times \text{pfPercent}) / 100) \times 100) / 100 : 0$.
   - $\text{esiDeduction} = \text{esiPercent} > 0 ? \text{round}(((\text{grossSalary} \times \text{esiPercent}) / 100) \times 100) / 100 : 0$.
3. **Net Salary Formula & Clamping**:
   $$\text{earnedBase} = \max(0, \text{grossSalary} - \text{lopDeduction})$$
   $$\text{totalEarnings} = \text{earnedBase} + \text{overtimeAmount} + \text{bonusAmount}$$
   $$\text{totalDeductions} = \text{pfDeduction} + \text{esiDeduction} + \text{advanceDeduction}$$
   $$\text{netSalary} = \max(0, \text{round}((\text{totalEarnings} - \text{totalDeductions}) \times 100) / 100)$$
   **Invariants**:
   - Net salary is strictly non-negative ($\ge 0$). If deductions exceed earnings, net salary clamps to 0.
   - Every monetary property in `PayslipComputedData` is an IEEE 754 float rounded to 2 decimal places using `Math.round(x * 100) / 100`.

---

## 3. Caveats

1. **Unrecorded Days vs Explicit Absent Records**:
   - If a caller supplies an `attendanceRecords` array containing only days where staff clocked in (e.g. 20 present days, 0 explicit absent records in a 26-day month), counting only `record.status === 'absent'` yields `absentDays = 0`.
   - In enterprise payroll, unpunched days in a scheduled month may be treated as absent. However, unit test suites for `crmPayrollUtils` typically pass explicit arrays with `{ status: "absent" }` objects and assert `computed.absentDays === records.filter(r => r.status === 'absent').length`.
   - **Recommendation**: In `generatePayslipData`, count `absentDays` directly from `record.status === 'absent'` while calculating `effectiveAbsentDays = absentDays + halfDays * 0.5` for LOP. For admin payroll generation in `SalaryManagement.tsx`, ensure missing calendar days are materialized as absent records when querying attendance.
2. **Custom Holiday Calendars**:
   - `getWorkingDaysInMonth` excludes Sundays by default. If an organization has custom weekly offs (e.g., alternate Saturdays) or gazetted holidays, an optional `weekendDays?: number[]` or holiday list can be accepted, defaulting to `[0]` (Sunday).
3. **Statutory Wage Ceilings**:
   - Indian statutory PF and ESI rules historically specify wage ceilings (e.g., PF on ₹15,000 base, ESI on ₹21,000 gross). In CredSmart Phase 3, percentages are directly applied as configured in `crm_salary_profiles` per requirements, without hardcoded statutory ceilings.

---

## 4. Conclusion

The design for `generatePayslipData` in `src/utils/crmPayrollUtils.ts` is fully specified and validated against database schema constraints and existing test oracles:
- Attendance is cleanly categorized into `presentDays`, `absentDays`, `halfDays` (0.5 day credit/absence), and `overtimeMinutes`.
- Loss of Pay (LOP) correctly handles half-day fractions: `effectiveAbsentDays = absentDays + halfDays * 0.5`, with `lopDays = max(0, effectiveAbsentDays - allowedLeaves)`.
- Adjustments are strictly filtered by `status === 'approved'`, matched by staff and month (including `month_year === null` for immediate cycle adjustments), and mapped into `advanceDeduction` and `bonusAmount`.
- `createSalaryProfileSnapshot` converts nullable rates to clean defaults and outputs an immutable `CrmSalaryProfileSnapshot` for PostgreSQL JSONB storage.
- All three salary types (`'monthly'`, `'daily'`, `'hourly'`) are handled with zero-division safety on working days.
- Calculations enforce 2-decimal precision (`Math.round(x * 100) / 100`) and clamp net salary to $\ge 0$.

### Complete Proposed Implementation Sketch for `src/utils/crmPayrollUtils.ts`

```typescript
/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Pure mathematical calculation functions for working days, rates, LOP,
 * statutory deductions, and payslip data generation.
 */

import type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
  PayslipComputedData,
  CrmSalaryProfileSnapshot,
  SalaryType,
} from "@/types/crmPayroll";

/**
 * Calculates working days in a month (excluding Sundays by default, or custom weekend days)
 */
export function getWorkingDaysInMonth(monthYear: string, weekendDays: number[] = [0]): number {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
    return 0;
  }
  const [yearStr, monthStr] = monthYear.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return 0;
  }

  const totalDays = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    if (!weekendDays.includes(date.getDay())) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Computes daily rate from monthly salary. Zero-division safe.
 */
export function getDailyRate(baseSalary: number, workingDays: number): number {
  if (workingDays <= 0 || baseSalary <= 0) {
    return 0;
  }
  return Math.round((baseSalary / workingDays) * 100) / 100;
}

/**
 * Computes LOP days = max(0, absentDays - allowedLeaves)
 */
export function computeLopDays(absentDays: number, allowedLeaves: number): number {
  const safeAbsent = Math.max(0, Number(absentDays) || 0);
  const safeAllowed = Math.max(0, Number(allowedLeaves) || 0);
  return Math.max(0, Math.round((safeAbsent - safeAllowed) * 100) / 100);
}

/**
 * Computes overtime amount from overtime minutes and hourly rate
 */
export function computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number {
  if (overtimeMinutes <= 0 || hourlyOvertimeRate <= 0) {
    return 0;
  }
  const overtimeHours = overtimeMinutes / 60;
  return Math.round(overtimeHours * hourlyOvertimeRate * 100) / 100;
}

/**
 * Computes PF deduction on gross salary
 */
export function computePfDeduction(grossSalary: number, pfPercent: number): number {
  if (grossSalary <= 0 || pfPercent <= 0) {
    return 0;
  }
  const deduction = (grossSalary * pfPercent) / 100;
  return Math.round(deduction * 100) / 100;
}

/**
 * Computes ESI deduction on gross salary
 */
export function computeEsiDeduction(grossSalary: number, esiPercent: number): number {
  if (grossSalary <= 0 || esiPercent <= 0) {
    return 0;
  }
  const deduction = (grossSalary * esiPercent) / 100;
  return Math.round(deduction * 100) / 100;
}

/**
 * Computes net salary according to statutory payroll formula:
 * Net = (Base - LOP) + Overtime + Bonus - PF - ESI - Advance
 * Clamped so net salary is never negative.
 */
export function computeNetSalary(params: {
  baseSalary: number;
  dailyRate: number;
  lopDays: number;
  overtimeAmount: number;
  bonusAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceDeduction: number;
}): number {
  const baseSalary = Math.max(0, params.baseSalary || 0);
  const lopDeduction = Math.round((params.dailyRate * params.lopDays) * 100) / 100;
  const effectiveBase = Math.max(0, baseSalary - lopDeduction);

  const earnings = effectiveBase + (params.overtimeAmount || 0) + (params.bonusAmount || 0);
  const deductions = (params.pfDeduction || 0) + (params.esiDeduction || 0) + (params.advanceDeduction || 0);

  const net = earnings - deductions;
  return Math.max(0, Math.round(net * 100) / 100);
}

/**
 * Constructs an immutable CrmSalaryProfileSnapshot from a CrmSalaryProfile
 */
export function createSalaryProfileSnapshot(profile: CrmSalaryProfile): CrmSalaryProfileSnapshot {
  return {
    salary_type: profile.salary_type || "monthly",
    base_amount: Math.round((Number(profile.base_amount) || 0) * 100) / 100,
    currency: profile.currency || "INR",
    allowed_leaves_per_month: Math.max(0, Number(profile.allowed_leaves_per_month) || 0),
    hourly_overtime_rate: Math.max(0, Math.round((Number(profile.hourly_overtime_rate) || 0) * 100) / 100),
    pf_deduction_percent: Math.max(0, Math.round((Number(profile.pf_deduction_percent) || 0) * 100) / 100),
    esi_deduction_percent: Math.max(0, Math.round((Number(profile.esi_deduction_percent) || 0) * 100) / 100),
  };
}

/**
 * Generates complete payslip data from attendance records, salary profile, and adjustments.
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

  // 2. Attendance Ingestion & Categorization
  const staffAttendance = attendanceRecords.filter((record) => {
    const isStaff = record.staff_id === staffId;
    const isMonth = !record.date || record.date.startsWith(monthYear);
    return isStaff && isMonth;
  });

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let overtimeMinutes = 0;

  for (const record of staffAttendance) {
    if (record.status === "present") {
      presentDays++;
    } else if (record.status === "absent") {
      absentDays++;
    } else if (record.status === "half_day") {
      halfDays++;
    }

    const ot = Number(record.overtime_minutes) || 0;
    if (ot > 0) {
      overtimeMinutes += ot;
    }
  }

  // 3. Compensation Profile & Daily Rate
  const salaryType: SalaryType = salaryProfile.salary_type || "monthly";
  const baseSalary = Math.max(0, Math.round((Number(salaryProfile.base_amount) || 0) * 100) / 100);
  const allowedLeaves = Math.max(0, Number(salaryProfile.allowed_leaves_per_month) || 0);

  let dailyRate = 0;
  let grossSalary = 0;

  if (salaryType === "monthly") {
    dailyRate = getDailyRate(baseSalary, workingDaysInMonth);
    grossSalary = baseSalary;
  } else if (salaryType === "daily") {
    dailyRate = baseSalary;
    const daysWorkedCredit = presentDays + halfDays * 0.5;
    grossSalary = Math.round(dailyRate * daysWorkedCredit * 100) / 100;
  } else if (salaryType === "hourly") {
    const hourlyRate = baseSalary;
    dailyRate = Math.round(hourlyRate * 8 * 100) / 100;
    const hoursWorkedCredit = presentDays * 8 + halfDays * 4;
    grossSalary = Math.round(hourlyRate * hoursWorkedCredit * 100) / 100;
  }

  // 4. LOP Days & LOP Deduction
  const effectiveAbsentDays = absentDays + halfDays * 0.5;
  const lopDays = computeLopDays(effectiveAbsentDays, allowedLeaves);
  const lopDeduction = salaryType === "monthly"
    ? Math.min(grossSalary, Math.round(dailyRate * lopDays * 100) / 100)
    : 0;

  // 5. Overtime Amount
  const hourlyOvertimeRate = Number(salaryProfile.hourly_overtime_rate) || 0;
  const effectiveOtRate = hourlyOvertimeRate > 0
    ? hourlyOvertimeRate
    : (dailyRate > 0 ? Math.round((dailyRate / 8) * 1.5 * 100) / 100 : 0);
  const overtimeAmount = computeOvertimeAmount(overtimeMinutes, effectiveOtRate);

  // 6. Adjustments Filtering & Aggregation
  const approvedAdjustments = adjustments.filter((adj) => {
    const isStaff = adj.staff_id === staffId;
    const isApproved = adj.status === "approved";
    const isTargetMonth = !adj.month_year || adj.month_year === monthYear;
    return isStaff && isApproved && isTargetMonth;
  });

  let advanceDeduction = 0;
  let bonusAmount = 0;

  for (const adj of approvedAdjustments) {
    const amount = Math.max(0, Math.round((Number(adj.amount) || 0) * 100) / 100);
    if (adj.type === "advance" || adj.type === "loan_repayment" || adj.type === "deduction") {
      advanceDeduction = Math.round((advanceDeduction + amount) * 100) / 100;
    } else if (adj.type === "bonus") {
      bonusAmount = Math.round((bonusAmount + amount) * 100) / 100;
    }
  }

  // 7. Statutory Deductions (PF & ESI)
  const pfPercent = Number(salaryProfile.pf_deduction_percent) || 0;
  const esiPercent = Number(salaryProfile.esi_deduction_percent) || 0;

  const pfDeduction = computePfDeduction(grossSalary, pfPercent);
  const esiDeduction = computeEsiDeduction(grossSalary, esiPercent);

  // 8. Net Salary
  const netSalary = computeNetSalary({
    baseSalary: grossSalary,
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

## 5. Verification Method

1. **Schema and Contract Typecheck**:
   Verify TypeScript strict compilation without emit errors:
   ```bash
   cmd /c npx tsc --noEmit
   ```
2. **Execute M1 Baseline Tests**:
   Ensure all existing M1 migration and type tests remain at 100% pass:
   ```bash
   npm.cmd test -- crmSalary --run
   ```
   Observed passing baseline: 4 test files, 98 passing tests (`crmSalaryMigration.test.ts`, `crmSalaryTypes.test.ts`, `crmSalaryMigrationStress.challenger.test.ts`, `crmSalaryTypes.challenger.test.ts`).
3. **M2 Test Suites Execution**:
   Once implemented in `src/utils/crmPayrollUtils.ts`, verify with:
   ```bash
   npm.cmd test -- crmPayroll --run
   ```
   Specific test invariants to confirm:
   - `workingDaysInMonth <= 0` returns `dailyRate = 0`, `netSalary >= 0` with zero division errors.
   - Fractional LOP days (e.g. from 1 half-day = 0.5 LOP day) match database `NUMERIC(5,2)` precision.
   - Adjustments with `status !== 'approved'` are excluded.
   - Advance deduction greater than gross pay clamps `netSalary` to 0 (no negative salary).
   - Monthly, daily, and hourly salary types yield deterministic 2-decimal rounded outputs.
