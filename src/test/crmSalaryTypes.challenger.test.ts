import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type {
  SalaryType,
  PayrollRunStatus,
  PaymentStatus,
  PayslipPaymentStatus,
  AdjustmentType,
  SalaryAdjustmentType,
  AdjustmentStatus,
  SalaryAdjustmentStatus,
  CRMSalaryProfile,
  CrmSalaryProfile,
  CRMPayrollRun,
  CrmPayrollRun,
  CRMPayslip,
  CrmPayslip,
  CRMSalaryAdjustment,
  CrmSalaryAdjustment,
  PayslipComputedData,
  SalaryProfileSnapshot,
  CrmSalaryProfileSnapshot,
  CrmAttendanceRecord,
  CrmAttendanceRecordForPayroll,
} from "@/types/crmPayroll";
import type { CRMAttendanceRecord as Phase2AttendanceRecord } from "@/types/crmAttendance";

// Advanced compile-time type utility functions
type Extends<T, U> = [T] extends [U] ? true : false;
type ExactlyEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type ExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

describe("Milestone M1 Challenger: Adversarial Type Soundness & Schema Stress Testing", () => {
  // ==========================================================================
  // Dimension 1: Exact SQL Column Parity & Nullability Alignment
  // ==========================================================================
  describe("Dimension 1: Exact Column & Nullability Invariants", () => {
    it("1.1. enforces crm_salary_profiles Row matches exact 13 columns with strict nullability", () => {
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "hourly_overtime_rate"
        | "pf_deduction_percent"
        | "esi_deduction_percent"
        | "is_active"
        | "created_at"
        | "updated_at";

      type HasExactKeys = ExactKeys<ProfileRow, ExpectedKeys>;
      const hasExactKeys: HasExactKeys = true;
      expect(hasExactKeys).toBe(true);

      // Verify that non-nullable columns in DB cannot be null
      type NonNullKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "is_active"
        | "created_at"
        | "updated_at";
      type IsNullAssignable<K extends keyof ProfileRow> = null extends ProfileRow[K] ? true : false;

      type CheckIdNull = IsNullAssignable<"id">;
      type CheckOrgNull = IsNullAssignable<"org_id">;
      type CheckStaffNull = IsNullAssignable<"staff_id">;
      type CheckBaseNull = IsNullAssignable<"base_amount">;
      type CheckActiveNull = IsNullAssignable<"is_active">;

      const checkIdNull: CheckIdNull = false;
      const checkOrgNull: CheckOrgNull = false;
      const checkStaffNull: CheckStaffNull = false;
      const checkBaseNull: CheckBaseNull = false;
      const checkActiveNull: CheckActiveNull = false;

      expect(checkIdNull).toBe(false);
      expect(checkOrgNull).toBe(false);
      expect(checkStaffNull).toBe(false);
      expect(checkBaseNull).toBe(false);
      expect(checkActiveNull).toBe(false);

      // Verify nullable rate columns CAN accept null
      type CheckHourlyNull = IsNullAssignable<"hourly_overtime_rate">;
      type CheckPfNull = IsNullAssignable<"pf_deduction_percent">;
      type CheckEsiNull = IsNullAssignable<"esi_deduction_percent">;

      const checkHourlyNull: CheckHourlyNull = true;
      const checkPfNull: CheckPfNull = true;
      const checkEsiNull: CheckEsiNull = true;

      expect(checkHourlyNull).toBe(true);
      expect(checkPfNull).toBe(true);
      expect(checkEsiNull).toBe(true);
    });

    it("1.2. enforces crm_payroll_runs Row matches exact 11 columns with strict nullability", () => {
      type RunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "month_year"
        | "status"
        | "total_payout"
        | "staff_count"
        | "locked_by"
        | "locked_at"
        | "notes"
        | "created_at"
        | "updated_at";

      type HasExactKeys = ExactKeys<RunRow, ExpectedKeys>;
      const hasExactKeys: HasExactKeys = true;
      expect(hasExactKeys).toBe(true);

      expectTypeOf<RunRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<RunRow["locked_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<RunRow["locked_at"]>().toEqualTypeOf<string | null>();
      expectTypeOf<RunRow["notes"]>().toEqualTypeOf<string | null>();
      expectTypeOf<RunRow["total_payout"]>().toEqualTypeOf<number | null>();
      expectTypeOf<RunRow["staff_count"]>().toEqualTypeOf<number | null>();
    });

    it("1.3. enforces crm_payslips Row matches exact 24 columns with proper types", () => {
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "payroll_run_id"
        | "staff_id"
        | "month_year"
        | "salary_profile_snapshot"
        | "working_days_in_month"
        | "present_days"
        | "absent_days"
        | "half_days"
        | "lop_days"
        | "overtime_minutes"
        | "gross_salary"
        | "lop_deduction"
        | "overtime_amount"
        | "pf_deduction"
        | "esi_deduction"
        | "advance_deduction"
        | "bonus_amount"
        | "net_salary"
        | "payment_status"
        | "paid_at"
        | "created_at"
        | "updated_at";

      type HasExactKeys = ExactKeys<PayslipRow, ExpectedKeys>;
      const hasExactKeys: HasExactKeys = true;
      expect(hasExactKeys).toBe(true);

      // All 14 financial / metric columns must be numeric
      expectTypeOf<PayslipRow["working_days_in_month"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["present_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["absent_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["half_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["lop_days"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["overtime_minutes"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["gross_salary"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["lop_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["overtime_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["pf_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["esi_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["advance_deduction"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["bonus_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<PayslipRow["net_salary"]>().toEqualTypeOf<number>();
    });

    it("1.4. enforces crm_salary_adjustments Row matches exact 12 columns with proper types", () => {
      type AdjustmentRow = Database["public"]["Tables"]["crm_salary_adjustments"]["Row"];
      type ExpectedKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "type"
        | "amount"
        | "description"
        | "month_year"
        | "status"
        | "requested_by"
        | "approved_by"
        | "approved_at"
        | "created_at";

      type HasExactKeys = ExactKeys<AdjustmentRow, ExpectedKeys>;
      const hasExactKeys: HasExactKeys = true;
      expect(hasExactKeys).toBe(true);

      expectTypeOf<AdjustmentRow["amount"]>().toEqualTypeOf<number>();
      expectTypeOf<AdjustmentRow["requested_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_at"]>().toEqualTypeOf<string | null>();
    });
  });

  // ==========================================================================
  // Dimension 2: Negative Compile Checks (Mandatory Field Enforcement)
  // ==========================================================================
  describe("Dimension 2: Strict Required vs Optional Keys in Insert Payloads", () => {
    it("2.1. verifies exact required fields for crm_salary_profiles.Insert: only org_id and staff_id", () => {
      type ProfileInsert = Database["public"]["Tables"]["crm_salary_profiles"]["Insert"];
      type ReqKeys = RequiredKeys<ProfileInsert>;
      type OptKeys = OptionalKeys<ProfileInsert>;

      type RequiredIsExact = ExactKeys<{ [K in ReqKeys]: any }, "org_id" | "staff_id">;
      const requiredIsExact: RequiredIsExact = true;
      expect(requiredIsExact).toBe(true);

      // Verify that all 11 other columns are optional
      type ExpectedOptKeys =
        | "id"
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "hourly_overtime_rate"
        | "pf_deduction_percent"
        | "esi_deduction_percent"
        | "is_active"
        | "created_at"
        | "updated_at";
      type OptionalIsExact = ExactKeys<{ [K in OptKeys]: any }, ExpectedOptKeys>;
      const optionalIsExact: OptionalIsExact = true;
      expect(optionalIsExact).toBe(true);
    });

    it("2.2. verifies exact required fields for crm_payroll_runs.Insert: org_id and month_year", () => {
      type RunInsert = Database["public"]["Tables"]["crm_payroll_runs"]["Insert"];
      type ReqKeys = RequiredKeys<RunInsert>;

      type RequiredIsExact = ExactKeys<{ [K in ReqKeys]: any }, "org_id" | "month_year">;
      const requiredIsExact: RequiredIsExact = true;
      expect(requiredIsExact).toBe(true);
    });

    it("2.3. verifies exact required fields for crm_payslips.Insert: 6 non-default columns", () => {
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];
      type ReqKeys = RequiredKeys<PayslipInsert>;

      type ExpectedReq =
        | "org_id"
        | "payroll_run_id"
        | "staff_id"
        | "month_year"
        | "salary_profile_snapshot"
        | "working_days_in_month";

      type RequiredIsExact = ExactKeys<{ [K in ReqKeys]: any }, ExpectedReq>;
      const requiredIsExact: RequiredIsExact = true;
      expect(requiredIsExact).toBe(true);

      // Missing any of these 6 must produce an unassignable type
      type MissingRunId = Omit<PayslipInsert, "payroll_run_id">;
      type CanAssignMissingRunId = Extends<MissingRunId, PayslipInsert>;
      const canAssignMissingRunId: CanAssignMissingRunId = false;
      expect(canAssignMissingRunId).toBe(false);

      type MissingSnapshot = Omit<PayslipInsert, "salary_profile_snapshot">;
      type CanAssignMissingSnapshot = Extends<MissingSnapshot, PayslipInsert>;
      const canAssignMissingSnapshot: CanAssignMissingSnapshot = false;
      expect(canAssignMissingSnapshot).toBe(false);

      type MissingWorkingDays = Omit<PayslipInsert, "working_days_in_month">;
      type CanAssignMissingWorkingDays = Extends<MissingWorkingDays, PayslipInsert>;
      const canAssignMissingWorkingDays: CanAssignMissingWorkingDays = false;
      expect(canAssignMissingWorkingDays).toBe(false);
    });

    it("2.4. verifies exact required fields for crm_salary_adjustments.Insert: 4 mandatory columns", () => {
      type AdjInsert = Database["public"]["Tables"]["crm_salary_adjustments"]["Insert"];
      type ReqKeys = RequiredKeys<AdjInsert>;

      type ExpectedReq = "org_id" | "staff_id" | "type" | "amount";
      type RequiredIsExact = ExactKeys<{ [K in ReqKeys]: any }, ExpectedReq>;
      const requiredIsExact: RequiredIsExact = true;
      expect(requiredIsExact).toBe(true);
    });
  });

  // ==========================================================================
  // Dimension 3: Update Types Partiality & Sound Mutation Contracts
  // ==========================================================================
  describe("Dimension 3: Update Types Total Partiality & Mutation Soundness", () => {
    it("3.1. verifies ALL keys in Update types are strictly optional", () => {
      type ProfileUpdate = Database["public"]["Tables"]["crm_salary_profiles"]["Update"];
      type RunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      type ReqProfile = RequiredKeys<ProfileUpdate>;
      type ReqRun = RequiredKeys<RunUpdate>;
      type ReqPayslip = RequiredKeys<PayslipUpdate>;
      type ReqAdj = RequiredKeys<AdjUpdate>;

      // Required keys must be 'never'
      type NoRequiredProfile = [ReqProfile] extends [never] ? true : false;
      type NoRequiredRun = [ReqRun] extends [never] ? true : false;
      type NoRequiredPayslip = [ReqPayslip] extends [never] ? true : false;
      type NoRequiredAdj = [ReqAdj] extends [never] ? true : false;

      const noReqProfile: NoRequiredProfile = true;
      const noReqRun: NoRequiredRun = true;
      const noReqPayslip: NoRequiredPayslip = true;
      const noReqAdj: NoReqAdj = true;

      expect(noReqProfile).toBe(true);
      expect(noReqRun).toBe(true);
      expect(noReqPayslip).toBe(true);
      expect(noReqAdj).toBe(true);
    });

    it("3.2. rejects alien properties in Update payloads", () => {
      type ProfileUpdate = Database["public"]["Tables"]["crm_salary_profiles"]["Update"];
      type AlienPayload = { non_existent_prop: boolean };
      type CanAssignAlien = Extends<AlienPayload, ProfileUpdate>;

      // A payload with solely alien properties cannot satisfy { non_existent_prop: boolean } without breaking type contracts
      const check: keyof AlienPayload extends keyof ProfileUpdate ? true : false = false;
      expect(check).toBe(false);
    });
  });

  // ==========================================================================
  // Dimension 4: JSON Snapshot Structure & Serialization Soundness
  // ==========================================================================
  describe("Dimension 4: JSON Snapshot Structure & Assignability", () => {
    it("4.1. ensures CrmSalaryProfileSnapshot contains all 7 core compensation attributes", () => {
      type ExpectedSnapshotKeys =
        | "salary_type"
        | "base_amount"
        | "currency"
        | "allowed_leaves_per_month"
        | "hourly_overtime_rate"
        | "pf_deduction_percent"
        | "esi_deduction_percent";

      type SnapshotKeysMatch = ExactKeys<CrmSalaryProfileSnapshot, ExpectedSnapshotKeys>;
      const snapshotKeysMatch: SnapshotKeysMatch = true;
      expect(snapshotKeysMatch).toBe(true);

      expectTypeOf<CrmSalaryProfileSnapshot["salary_type"]>().toEqualTypeOf<SalaryType>();
      expectTypeOf<CrmSalaryProfileSnapshot["base_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<CrmSalaryProfileSnapshot["currency"]>().toEqualTypeOf<string>();
      expectTypeOf<CrmSalaryProfileSnapshot["allowed_leaves_per_month"]>().toEqualTypeOf<number>();
      expectTypeOf<CrmSalaryProfileSnapshot["hourly_overtime_rate"]>().toEqualTypeOf<number>();
      expectTypeOf<CrmSalaryProfileSnapshot["pf_deduction_percent"]>().toEqualTypeOf<number>();
      expectTypeOf<CrmSalaryProfileSnapshot["esi_deduction_percent"]>().toEqualTypeOf<number>();
    });

    it("4.2. confirms JSON serialization / roundtrip stability of snapshot", () => {
      const original: CrmSalaryProfileSnapshot = {
        salary_type: "monthly",
        base_amount: 85000.5,
        currency: "INR",
        allowed_leaves_per_month: 2.5,
        hourly_overtime_rate: 450.75,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
      };

      const serialized = JSON.stringify(original);
      const parsed: CrmSalaryProfileSnapshot = JSON.parse(serialized);

      expect(parsed).toEqual(original);
      expect(parsed.base_amount).toBe(85000.5);
      expect(parsed.salary_type).toBe("monthly");
      expect(parsed.currency).toBe("INR");
    });

    it("4.3. verifies CrmPayslip supports both typed snapshot and raw Json", () => {
      type SnapshotType = CrmPayslip["salary_profile_snapshot"];
      type CanAcceptTyped = Extends<CrmSalaryProfileSnapshot, SnapshotType>;
      type CanAcceptJson = Extends<Json, SnapshotType>;

      const canAcceptTyped: CanAcceptTyped = true;
      const canAcceptJson: CanAcceptJson = true;

      expect(canAcceptTyped).toBe(true);
      expect(canAcceptJson).toBe(true);
    });
  });

  // ==========================================================================
  // Dimension 5: Foreign Key Relationships & Relational Rigor
  // ==========================================================================
  describe("Dimension 5: Foreign Key Relationships in Supabase Types", () => {
    it("5.1. validates crm_salary_profiles has foreign key to organizations", () => {
      type ProfileRels = Database["public"]["Tables"]["crm_salary_profiles"]["Relationships"];
      type OrgRel = ProfileRels[0];

      expectTypeOf<OrgRel["foreignKeyName"]>().toEqualTypeOf<"crm_salary_profiles_org_id_fkey">();
      expectTypeOf<OrgRel["columns"]>().toEqualTypeOf<["org_id"]>();
      expectTypeOf<OrgRel["referencedRelation"]>().toEqualTypeOf<"organizations">();
      expectTypeOf<OrgRel["referencedColumns"]>().toEqualTypeOf<["id"]>();
    });

    it("5.2. validates crm_payroll_runs has foreign key to organizations", () => {
      type RunRels = Database["public"]["Tables"]["crm_payroll_runs"]["Relationships"];
      type OrgRel = RunRels[0];

      expectTypeOf<OrgRel["foreignKeyName"]>().toEqualTypeOf<"crm_payroll_runs_org_id_fkey">();
      expectTypeOf<OrgRel["columns"]>().toEqualTypeOf<["org_id"]>();
      expectTypeOf<OrgRel["referencedRelation"]>().toEqualTypeOf<"organizations">();
      expectTypeOf<OrgRel["referencedColumns"]>().toEqualTypeOf<["id"]>();
    });

    it("5.3. validates crm_payslips has foreign keys to BOTH organizations and crm_payroll_runs", () => {
      type PayslipRels = Database["public"]["Tables"]["crm_payslips"]["Relationships"];
      type OrgRel = PayslipRels[0];
      type RunRel = PayslipRels[1];

      expectTypeOf<OrgRel["foreignKeyName"]>().toEqualTypeOf<"crm_payslips_org_id_fkey">();
      expectTypeOf<OrgRel["columns"]>().toEqualTypeOf<["org_id"]>();
      expectTypeOf<OrgRel["referencedRelation"]>().toEqualTypeOf<"organizations">();
      expectTypeOf<OrgRel["referencedColumns"]>().toEqualTypeOf<["id"]>();

      expectTypeOf<RunRel["foreignKeyName"]>().toEqualTypeOf<"crm_payslips_payroll_run_id_fkey">();
      expectTypeOf<RunRel["columns"]>().toEqualTypeOf<["payroll_run_id"]>();
      expectTypeOf<RunRel["referencedRelation"]>().toEqualTypeOf<"crm_payroll_runs">();
      expectTypeOf<RunRel["referencedColumns"]>().toEqualTypeOf<["id"]>();
    });

    it("5.4. validates crm_salary_adjustments has foreign key to organizations", () => {
      type AdjRels = Database["public"]["Tables"]["crm_salary_adjustments"]["Relationships"];
      type OrgRel = AdjRels[0];

      expectTypeOf<OrgRel["foreignKeyName"]>().toEqualTypeOf<"crm_salary_adjustments_org_id_fkey">();
      expectTypeOf<OrgRel["columns"]>().toEqualTypeOf<["org_id"]>();
      expectTypeOf<OrgRel["referencedRelation"]>().toEqualTypeOf<"organizations">();
      expectTypeOf<OrgRel["referencedColumns"]>().toEqualTypeOf<["id"]>();
    });
  });

  // ==========================================================================
  // Dimension 6: Strict Union Literals vs Alien / Extraneous Values
  // ==========================================================================
  describe("Dimension 6: Strict Union Literals & Narrowing", () => {
    it("6.1. enforces SalaryType accepts strictly 'monthly', 'daily', 'hourly'", () => {
      const allowed: SalaryType[] = ["monthly", "daily", "hourly"];
      expect(allowed).toHaveLength(3);

      type AlienSalary = "weekly" | "per_task" | "commission" | "biweekly";
      type CanAssignAlien = Extends<AlienSalary, SalaryType>;
      const canAssignAlien: CanAssignAlien = false;
      expect(canAssignAlien).toBe(false);
    });

    it("6.2. enforces PayrollRunStatus accepts strictly 'draft', 'locked', 'disbursed'", () => {
      const allowed: PayrollRunStatus[] = ["draft", "locked", "disbursed"];
      expect(allowed).toHaveLength(3);

      type AlienStatus = "pending" | "processing" | "cancelled" | "archived";
      type CanAssignAlien = Extends<AlienStatus, PayrollRunStatus>;
      const canAssignAlien: CanAssignAlien = false;
      expect(canAssignAlien).toBe(false);
    });

    it("6.3. enforces PayslipPaymentStatus accepts strictly 'pending', 'paid', 'partial'", () => {
      const allowed: PayslipPaymentStatus[] = ["pending", "paid", "partial"];
      expect(allowed).toHaveLength(3);

      type AlienPayStatus = "failed" | "refunded" | "processing";
      type CanAssignAlien = Extends<AlienPayStatus, PayslipPaymentStatus>;
      const canAssignAlien: CanAssignAlien = false;
      expect(canAssignAlien).toBe(false);
    });

    it("6.4. enforces SalaryAdjustmentType accepts strictly 'advance', 'bonus', 'deduction', 'loan_repayment'", () => {
      const allowed: SalaryAdjustmentType[] = [
        "advance",
        "bonus",
        "deduction",
        "loan_repayment",
      ];
      expect(allowed).toHaveLength(4);

      type AlienType = "reimbursement" | "gratuity" | "severance" | "stipend";
      type CanAssignAlien = Extends<AlienType, SalaryAdjustmentType>;
      const canAssignAlien: CanAssignAlien = false;
      expect(canAssignAlien).toBe(false);
    });

    it("6.5. enforces SalaryAdjustmentStatus accepts strictly 'pending', 'approved', 'deducted', 'rejected'", () => {
      const allowed: SalaryAdjustmentStatus[] = [
        "pending",
        "approved",
        "deducted",
        "rejected",
      ];
      expect(allowed).toHaveLength(4);

      type AlienStatus = "submitted" | "escalated" | "closed";
      type CanAssignAlien = Extends<AlienStatus, SalaryAdjustmentStatus>;
      const canAssignAlien: CanAssignAlien = false;
      expect(canAssignAlien).toBe(false);
    });
  });

  // ==========================================================================
  // Dimension 7: Cross-Module Integration with Phase 2 Attendance
  // ==========================================================================
  describe("Dimension 7: Cross-Module Attendance Integration Contracts", () => {
    it("7.1. confirms CrmAttendanceRecord is fully compatible with Phase 2 CRMAttendanceRecord subset", () => {
      // In Phase 2:
      // status: "present" | "absent" | "half_day" | "on_leave"
      // date: string
      // staff_id: string
      // overtime_minutes: number
      // work_duration_minutes: number
      const phase2Record: Phase2AttendanceRecord = {
        id: "att-1",
        org_id: "org-1",
        staff_id: "staff-1",
        date: "2026-10-15",
        status: "present",
        verification_method: "geofence",
        is_within_geofence: true,
        work_duration_minutes: 510,
        overtime_minutes: 30,
        created_at: "2026-10-15T09:00:00Z",
        updated_at: "2026-10-15T18:00:00Z",
      };

      // CrmAttendanceRecord used by payroll
      const payrollRecord: CrmAttendanceRecord = {
        staff_id: phase2Record.staff_id,
        date: phase2Record.date,
        status: phase2Record.status as CrmAttendanceRecord["status"],
        overtime_minutes: phase2Record.overtime_minutes,
        work_duration_minutes: phase2Record.work_duration_minutes,
      };

      expect(payrollRecord.staff_id).toBe("staff-1");
      expect(payrollRecord.overtime_minutes).toBe(30);
      expect(payrollRecord.work_duration_minutes).toBe(510);
    });

    it("7.2. confirms CrmAttendanceRecord alias CrmAttendanceRecordForPayroll parity", () => {
      type IsEqual = ExactlyEqual<CrmAttendanceRecord, CrmAttendanceRecordForPayroll>;
      const isEqual: IsEqual = true;
      expect(isEqual).toBe(true);
    });
  });

  // ==========================================================================
  // Dimension 8: Calculation Engine Output Contract (PayslipComputedData)
  // ==========================================================================
  describe("Dimension 8: PayslipComputedData Contract & Insert Transformation", () => {
    it("8.1. enforces PayslipComputedData has all 16 required numeric & identity attributes", () => {
      type ExpectedComputedKeys =
        | "staffId"
        | "monthYear"
        | "workingDaysInMonth"
        | "presentDays"
        | "absentDays"
        | "halfDays"
        | "lopDays"
        | "overtimeMinutes"
        | "grossSalary"
        | "lopDeduction"
        | "overtimeAmount"
        | "pfDeduction"
        | "esiDeduction"
        | "advanceDeduction"
        | "bonusAmount"
        | "netSalary";

      type ComputedKeysMatch = ExactKeys<PayslipComputedData, ExpectedComputedKeys>;
      const computedKeysMatch: ComputedKeysMatch = true;
      expect(computedKeysMatch).toBe(true);

      // Verify no optional fields in computed result
      type ReqKeys = RequiredKeys<PayslipComputedData>;
      type AllRequired = ExactKeys<{ [K in ReqKeys]: any }, ExpectedComputedKeys>;
      const allRequired: AllRequired = true;
      expect(allRequired).toBe(true);
    });

    it("8.2. validates transformation from PayslipComputedData to crm_payslips.Insert", () => {
      const computed: PayslipComputedData = {
        staffId: "usr-456",
        monthYear: "2026-10",
        workingDaysInMonth: 27,
        presentDays: 25,
        absentDays: 2,
        halfDays: 0,
        lopDays: 0,
        overtimeMinutes: 90,
        grossSalary: 65000,
        lopDeduction: 0,
        overtimeAmount: 450,
        pfDeduction: 7800,
        esiDeduction: 0,
        advanceDeduction: 5000,
        bonusAmount: 2000,
        netSalary: 54650,
      };

      const snapshot: CrmSalaryProfileSnapshot = {
        salary_type: "monthly",
        base_amount: 65000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0,
      };

      // Transform to Supabase Insert payload
      const insertPayload: Database["public"]["Tables"]["crm_payslips"]["Insert"] = {
        org_id: "org-123",
        payroll_run_id: "run-789",
        staff_id: computed.staffId,
        month_year: computed.monthYear,
        salary_profile_snapshot: snapshot as unknown as Json,
        working_days_in_month: computed.workingDaysInMonth,
        present_days: computed.presentDays,
        absent_days: computed.absentDays,
        half_days: computed.halfDays,
        lop_days: computed.lopDays,
        overtime_minutes: computed.overtimeMinutes,
        gross_salary: computed.grossSalary,
        lop_deduction: computed.lopDeduction,
        overtime_amount: computed.overtimeAmount,
        pf_deduction: computed.pfDeduction,
        esi_deduction: computed.esiDeduction,
        advance_deduction: computed.advanceDeduction,
        bonus_amount: computed.bonusAmount,
        net_salary: computed.netSalary,
        payment_status: "pending",
      };

      expect(insertPayload.staff_id).toBe("usr-456");
      expect(insertPayload.net_salary).toBe(54650);
      expect(insertPayload.payment_status).toBe("pending");
    });
  });

  // ==========================================================================
  // Dimension 9: Zero 'any' Type Invariants Across All Domain Interfaces
  // ==========================================================================
  describe("Dimension 9: Zero 'any' Invariant Verification", () => {
    it("9.1. verifies NO domain model or table type contains an 'any' type", () => {
      type AnyCheck =
        | IsAny<CrmSalaryProfile>
        | IsAny<CRMSalaryProfile>
        | IsAny<CrmPayrollRun>
        | IsAny<CRMPayrollRun>
        | IsAny<CrmPayslip>
        | IsAny<CRMPayslip>
        | IsAny<CrmSalaryAdjustment>
        | IsAny<CRMSalaryAdjustment>
        | IsAny<CrmSalaryProfileSnapshot>
        | IsAny<SalaryProfileSnapshot>
        | IsAny<PayslipComputedData>
        | IsAny<CrmAttendanceRecord>
        | IsAny<SalaryType>
        | IsAny<PayrollRunStatus>
        | IsAny<PayslipPaymentStatus>
        | IsAny<SalaryAdjustmentType>
        | IsAny<SalaryAdjustmentStatus>;

      const hasAny: AnyCheck = false;
      expect(hasAny).toBe(false);
    });
  });
});
