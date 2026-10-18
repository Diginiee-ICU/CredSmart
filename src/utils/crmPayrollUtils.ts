/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Mathematical calculation engine for working days, daily rates, Loss of Pay (LOP),
 * overtime remuneration, statutory deductions (PF, ESI), and payslip reconciliation.
 *
 * All computations are pure functions adhering to 2-decimal half-up arithmetic precision,
 * with complete safeguards against zero-division, negative salaries, and precision drift.
 */

import type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
  PayslipComputedData,
  CrmSalaryProfileSnapshot,
  SalaryType,
} from "@/types/crmPayroll";

// Re-export domain interfaces for consumer convenience
export type {
  CrmSalaryProfile,
  CrmAttendanceRecord,
  CrmSalaryAdjustment,
  PayslipComputedData,
  CrmSalaryProfileSnapshot,
};

/**
 * Rounds a numeric value to 2 decimal places using standard half-up arithmetic.
 * Safeguarded against non-finite or NaN inputs.
 */
export function round2(value: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the exact number of working days in a month.
 * By default, excludes all Sundays (dayOfWeek === 0).
 * Supports custom weekend days (e.g. [0, 6] for Saturday & Sunday).
 * Handles leap years (e.g. Feb 2024, 2028, 2000 vs 1900) via deterministic UTC date logic.
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
 * @param esiPercent - ESI deduction percentage (e.g. 1.75 or 0.75 for 0.75%)
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
 * Constructs an immutable CrmSalaryProfileSnapshot from a CrmSalaryProfile
 * for storage in crm_payslips.salary_profile_snapshot JSONB.
 */
export function createSalaryProfileSnapshot(profile: CrmSalaryProfile): CrmSalaryProfileSnapshot {
  return {
    salary_type: profile.salary_type || "monthly",
    base_amount: round2(Number(profile.base_amount) || 0),
    currency: profile.currency || "INR",
    allowed_leaves_per_month: Math.max(0, Number(profile.allowed_leaves_per_month) || 0),
    hourly_overtime_rate: Math.max(0, round2(Number(profile.hourly_overtime_rate) || 0)),
    pf_deduction_percent: Math.max(0, round2(Number(profile.pf_deduction_percent) || 0)),
    esi_deduction_percent: Math.max(0, round2(Number(profile.esi_deduction_percent) || 0)),
  };
}

/**
 * Aggregates attendance records and salary adjustments to generate
 * a complete payslip computation record for a staff member.
 *
 * @param params - staffId, monthYear, salaryProfile, attendanceRecords, and adjustments
 * @returns Complete PayslipComputedData ready for display, PDF rendering, or DB persistence
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

  // If working days in month is 0 (invalid monthYear or zero scheduled days)
  if (workingDaysInMonth <= 0) {
    return {
      staffId,
      monthYear,
      workingDaysInMonth: 0,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      lopDays: 0,
      overtimeMinutes: 0,
      grossSalary: 0,
      lopDeduction: 0,
      overtimeAmount: 0,
      pfDeduction: 0,
      esiDeduction: 0,
      advanceDeduction: 0,
      bonusAmount: 0,
      netSalary: 0,
    };
  }

  // 2. Attendance Ingestion & Categorization
  // Filter for this staffId and monthYear
  const staffAttendance = attendanceRecords.filter((record) => {
    const isStaff = !record.staff_id || record.staff_id === staffId;
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
    } else if (record.status === "half_day") {
      halfDays++;
    } else if (record.status === "absent") {
      absentDays++;
    }

    const ot = Number(record.overtime_minutes) || 0;
    if (ot > 0) {
      overtimeMinutes += ot;
    }
  }

  // 3. Compensation Profile & Daily Rate
  const salaryType: SalaryType = salaryProfile.salary_type || "monthly";
  const rawBase = Math.max(0, round2(Number(salaryProfile.base_amount) || 0));
  const allowedLeaves = Math.max(0, Number(salaryProfile.allowed_leaves_per_month) || 0);

  let dailyRate = 0;
  let grossBase = 0;

  if (salaryType === "monthly") {
    dailyRate = getDailyRate(rawBase, workingDaysInMonth);
    grossBase = rawBase;
  } else if (salaryType === "daily") {
    dailyRate = rawBase;
    const daysWorkedCredit = presentDays + halfDays * 0.5;
    grossBase = round2(dailyRate * daysWorkedCredit);
  } else if (salaryType === "hourly") {
    const hourlyRate = rawBase;
    dailyRate = round2(hourlyRate * 8);
    const hoursWorkedCredit = presentDays * 8 + halfDays * 4;
    grossBase = round2(hourlyRate * hoursWorkedCredit);
  }

  // 4. LOP Days & LOP Deduction
  const effectiveAbsentDays = absentDays + halfDays * 0.5;
  const lopDays = computeLopDays(effectiveAbsentDays, allowedLeaves);
  const lopDeduction =
    salaryType === "monthly"
      ? Math.min(grossBase, round2(dailyRate * lopDays))
      : 0;

  // 5. Overtime Amount
  const hourlyOvertimeRate =
    salaryProfile.hourly_overtime_rate !== null && salaryProfile.hourly_overtime_rate !== undefined
      ? Number(salaryProfile.hourly_overtime_rate)
      : dailyRate > 0
      ? round2((dailyRate / 8) * 1.5)
      : 0;

  const overtimeAmount = computeOvertimeAmount(overtimeMinutes, hourlyOvertimeRate);

  // 6. Adjustments Filtering & Aggregation
  // Only approved adjustments for this staff and this month (or month_year is null/empty)
  const approvedAdjustments = adjustments.filter((adj) => {
    const isStaff = !adj.staff_id || adj.staff_id === staffId;
    const isApproved = adj.status === "approved";
    const isTargetMonth = !adj.month_year || adj.month_year === monthYear;
    return isStaff && isApproved && isTargetMonth;
  });

  let advanceDeduction = 0;
  let bonusAmount = 0;

  for (const adj of approvedAdjustments) {
    const amount = Math.max(0, round2(Number(adj.amount) || 0));
    if (adj.type === "advance" || adj.type === "loan_repayment" || adj.type === "deduction") {
      advanceDeduction = round2(advanceDeduction + amount);
    } else if (adj.type === "bonus") {
      bonusAmount = round2(bonusAmount + amount);
    }
  }

  // 7. Gross Salary (earned base after LOP + overtime + bonus)
  const earnedBase = Math.max(0, grossBase - lopDeduction);
  const grossSalary = round2(earnedBase + overtimeAmount + bonusAmount);

  // 8. Statutory Deductions (PF & ESI)
  const pfPercent = Number(salaryProfile.pf_deduction_percent) || 0;
  const esiPercent = Number(salaryProfile.esi_deduction_percent) || 0;

  const pfDeduction = computePfDeduction(grossSalary, pfPercent);
  const esiDeduction = computeEsiDeduction(grossSalary, esiPercent);

  // 9. Net Salary
  const totalDeductions = round2(pfDeduction + esiDeduction + advanceDeduction);
  const netSalary = Math.max(0, round2(grossSalary - totalDeductions));

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
