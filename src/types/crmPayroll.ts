/**
 * CRM Phase 3: Salary Management & Payroll Engine Domain Types
 * Provides strict union literals, domain entities with UI enrichments,
 * and calculation result interfaces for the payroll engine.
 */

import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// 1. Literal Union Types matching Database CHECK Constraints
// ============================================================================

export type SalaryType = "monthly" | "daily" | "hourly";

export type PayrollRunStatus = "draft" | "locked" | "disbursed";

export type PayslipPaymentStatus = "pending" | "paid" | "partial";
export type PaymentStatus = PayslipPaymentStatus;

export type SalaryAdjustmentType = "advance" | "bonus" | "deduction" | "loan_repayment";
export type AdjustmentType = SalaryAdjustmentType;

export type SalaryAdjustmentStatus = "pending" | "approved" | "deducted" | "rejected";
export type AdjustmentStatus = SalaryAdjustmentStatus;

// ============================================================================
// 2. Snapshot of Salary Profile at the time of Payroll Generation
// ============================================================================

export interface CrmSalaryProfileSnapshot {
  salary_type: SalaryType;
  base_amount: number;
  currency: string;
  allowed_leaves_per_month: number;
  hourly_overtime_rate: number;
  pf_deduction_percent: number;
  esi_deduction_percent: number;
}
export type SalaryProfileSnapshot = CrmSalaryProfileSnapshot;

// ============================================================================
// 3. Domain Entity Interfaces (Database Row + UI Enrichment)
// ============================================================================

export interface CrmSalaryProfile {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  staff_role?: string;
  role_name?: string;
  salary_type: SalaryType;
  base_amount: number;
  currency: string;
  allowed_leaves_per_month: number;
  hourly_overtime_rate: number | null;
  pf_deduction_percent: number | null;
  esi_deduction_percent: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type CRMSalaryProfile = CrmSalaryProfile;

export interface CrmPayrollRun {
  id: string;
  org_id: string;
  month_year: string;
  status: PayrollRunStatus;
  total_payout: number | null;
  staff_count: number | null;
  locked_by: string | null;
  locked_by_name?: string;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type CRMPayrollRun = CrmPayrollRun;

export interface CrmPayslip {
  id: string;
  org_id: string;
  payroll_run_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  staff_role?: string;
  role_name?: string;
  month_year: string;
  salary_profile_snapshot: CrmSalaryProfileSnapshot | Json;
  working_days_in_month: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  lop_days: number;
  overtime_minutes: number;
  gross_salary: number;
  lop_deduction: number;
  overtime_amount: number;
  pf_deduction: number;
  esi_deduction: number;
  advance_deduction: number;
  bonus_amount: number;
  net_salary: number;
  payment_status: PayslipPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
export type CRMPayslip = CrmPayslip;

export interface CrmSalaryAdjustment {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  type: SalaryAdjustmentType;
  amount: number;
  description: string | null;
  month_year: string | null;
  status: SalaryAdjustmentStatus;
  requested_by: string | null;
  requester_name?: string;
  approved_by: string | null;
  approver_name?: string;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
}
export type CRMSalaryAdjustment = CrmSalaryAdjustment;

// ============================================================================
// 4. Payroll Calculation Input & Output Contracts (M2 Engine)
// ============================================================================

export interface CrmAttendanceRecord {
  staff_id: string;
  date: string;
  status: "present" | "absent" | "half_day" | "on_leave";
  overtime_minutes: number;
  work_duration_minutes: number;
}
export type CrmAttendanceRecordForPayroll = CrmAttendanceRecord;

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
