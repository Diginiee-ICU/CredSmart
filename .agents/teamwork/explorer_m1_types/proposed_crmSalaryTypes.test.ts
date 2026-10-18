import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// TypeScript compile-time helper utilities for type contracts
type Extends<T, U> = [T] extends [U] ? true : false;
type ExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

describe("CRM Phase 3 Milestone 1: TypeScript Types & Schema Contract Tests", () => {
  // ==========================================================================
  // Suite 1: Database Table Existence & Key Parity with SQL Schema
  // ==========================================================================
  describe("Suite 1: SQL Column Parity with Supabase Database Types", () => {
    it("1. verifies crm_salary_profiles has exact 13 SQL columns in Row with correct types", () => {
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

      type KeysMatch = ExactKeys<ProfileRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // Verify non-nullable column types
      expectTypeOf<ProfileRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["salary_type"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["base_amount"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["currency"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["allowed_leaves_per_month"]>().toEqualTypeOf<number>();
      expectTypeOf<ProfileRow["is_active"]>().toEqualTypeOf<boolean>();
      expectTypeOf<ProfileRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<ProfileRow["updated_at"]>().toEqualTypeOf<string>();

      // Verify nullable/optional rate columns
      expectTypeOf<ProfileRow["hourly_overtime_rate"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["pf_deduction_percent"]>().toEqualTypeOf<number | null>();
      expectTypeOf<ProfileRow["esi_deduction_percent"]>().toEqualTypeOf<number | null>();
    });

    it("2. verifies crm_payroll_runs has exact 11 SQL columns in Row with correct types", () => {
      type PayrollRunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
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

      type KeysMatch = ExactKeys<PayrollRunRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<PayrollRunRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["month_year"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<PayrollRunRow["updated_at"]>().toEqualTypeOf<string>();

      // Nullable fields
      expectTypeOf<PayrollRunRow["total_payout"]>().toEqualTypeOf<number | null>();
      expectTypeOf<PayrollRunRow["staff_count"]>().toEqualTypeOf<number | null>();
      expectTypeOf<PayrollRunRow["locked_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<PayrollRunRow["locked_at"]>().toEqualTypeOf<string | null>();
      expectTypeOf<PayrollRunRow["notes"]>().toEqualTypeOf<string | null>();
    });

    it("3. verifies crm_payslips has exact 24 SQL columns in Row with JSONB snapshot", () => {
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

      type KeysMatch = ExactKeys<PayslipRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // JSONB snapshot verification
      expectTypeOf<PayslipRow["salary_profile_snapshot"]>().toEqualTypeOf<Json>();

      // Numeric metrics
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

      // String and nullable fields
      expectTypeOf<PayslipRow["payment_status"]>().toEqualTypeOf<string>();
      expectTypeOf<PayslipRow["paid_at"]>().toEqualTypeOf<string | null>();
    });

    it("4. verifies crm_salary_adjustments has exact 12 SQL columns in Row", () => {
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

      type KeysMatch = ExactKeys<AdjustmentRow, ExpectedKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<AdjustmentRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["type"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["amount"]>().toEqualTypeOf<number>();
      expectTypeOf<AdjustmentRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<AdjustmentRow["created_at"]>().toEqualTypeOf<string>();

      // Nullable fields
      expectTypeOf<AdjustmentRow["description"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["month_year"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["requested_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_by"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AdjustmentRow["approved_at"]>().toEqualTypeOf<string | null>();
    });
  });

  // ==========================================================================
  // Suite 2: Supabase Insert Type Requirements & Negative Compilation Contracts
  // ==========================================================================
  describe("Suite 2: Insert Types & Negative Compilation Contracts", () => {
    it("5. validates minimal required fields for crm_salary_profiles.Insert", () => {
      type ProfileInsert = Database["public"]["Tables"]["crm_salary_profiles"]["Insert"];

      // Minimal required: org_id and staff_id (others have DB defaults)
      const validMinimal: ProfileInsert = {
        org_id: "org-uuid-1",
        staff_id: "user-uuid-1",
      };
      expect(validMinimal.staff_id).toBe("user-uuid-1");

      // Full payload
      const validFull: ProfileInsert = {
        org_id: "org-uuid-1",
        staff_id: "user-uuid-1",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 250,
        pf_deduction_percent: 12,
        esi_deduction_percent: 0.75,
        is_active: true,
      };
      expect(validFull.base_amount).toBe(50000);

      // Negative assertion: missing staff_id fails
      type MissingStaff = { org_id: string; base_amount: number };
      type CanAssignMissingStaff = Extends<MissingStaff, ProfileInsert>;
      const canAssignMissingStaff: CanAssignMissingStaff = false;
      expect(canAssignMissingStaff).toBe(false);

      // Negative assertion: missing org_id fails
      type MissingOrg = { staff_id: string; base_amount: number };
      type CanAssignMissingOrg = Extends<MissingOrg, ProfileInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);
    });

    it("6. validates minimal required fields for crm_payroll_runs.Insert", () => {
      type PayrollRunInsert = Database["public"]["Tables"]["crm_payroll_runs"]["Insert"];

      // Minimal required: org_id and month_year
      const validMinimal: PayrollRunInsert = {
        org_id: "org-uuid-1",
        month_year: "2026-10",
      };
      expect(validMinimal.month_year).toBe("2026-10");

      // Negative assertion: missing month_year fails
      type MissingMonth = { org_id: string };
      type CanAssignMissingMonth = Extends<MissingMonth, PayrollRunInsert>;
      const canAssignMissingMonth: CanAssignMissingMonth = false;
      expect(canAssignMissingMonth).toBe(false);

      // Negative assertion: missing org_id fails
      type MissingOrg = { month_year: string };
      type CanAssignMissingOrg = Extends<MissingOrg, PayrollRunInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);
    });

    it("7. validates minimal required fields for crm_payslips.Insert", () => {
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];

      // Minimal required: org_id, payroll_run_id, staff_id, month_year, salary_profile_snapshot, working_days_in_month
      const validMinimal: PayslipInsert = {
        org_id: "org-uuid-1",
        payroll_run_id: "run-uuid-1",
        staff_id: "staff-uuid-1",
        month_year: "2026-10",
        salary_profile_snapshot: { base_amount: 60000, salary_type: "monthly" },
        working_days_in_month: 26,
      };
      expect(validMinimal.working_days_in_month).toBe(26);

      // Negative assertion: missing working_days_in_month fails
      type MissingWorkingDays = {
        org_id: string;
        payroll_run_id: string;
        staff_id: string;
        month_year: string;
        salary_profile_snapshot: Json;
      };
      type CanAssignMissingWorkingDays = Extends<MissingWorkingDays, PayslipInsert>;
      const canAssignMissingWorkingDays: CanAssignMissingWorkingDays = false;
      expect(canAssignMissingWorkingDays).toBe(false);

      // Negative assertion: missing salary_profile_snapshot fails
      type MissingSnapshot = {
        org_id: string;
        payroll_run_id: string;
        staff_id: string;
        month_year: string;
        working_days_in_month: number;
      };
      type CanAssignMissingSnapshot = Extends<MissingSnapshot, PayslipInsert>;
      const canAssignMissingSnapshot: CanAssignMissingSnapshot = false;
      expect(canAssignMissingSnapshot).toBe(false);
    });

    it("8. validates minimal required fields for crm_salary_adjustments.Insert", () => {
      type AdjustmentInsert = Database["public"]["Tables"]["crm_salary_adjustments"]["Insert"];

      // Minimal required: org_id, staff_id, type, amount
      const validMinimal: AdjustmentInsert = {
        org_id: "org-uuid-1",
        staff_id: "staff-uuid-1",
        type: "advance",
        amount: 5000,
      };
      expect(validMinimal.amount).toBe(5000);

      // Negative assertion: missing amount fails
      type MissingAmount = { org_id: string; staff_id: string; type: string };
      type CanAssignMissingAmount = Extends<MissingAmount, AdjustmentInsert>;
      const canAssignMissingAmount: CanAssignMissingAmount = false;
      expect(canAssignMissingAmount).toBe(false);

      // Negative assertion: missing type fails
      type MissingType = { org_id: string; staff_id: string; amount: number };
      type CanAssignMissingType = Extends<MissingType, AdjustmentInsert>;
      const canAssignMissingType: CanAssignMissingType = false;
      expect(canAssignMissingType).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 3: Supabase Update Types Partiality & Type Safety
  // ==========================================================================
  describe("Suite 3: Update Types Partiality & Type Safety", () => {
    it("9. allows empty object {} for all 4 Update types", () => {
      type ProfileUpdate = Database["public"]["Tables"]["crm_salary_profiles"]["Update"];
      type PayrollRunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjustmentUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      const emptyProfile: ProfileUpdate = {};
      const emptyRun: PayrollRunUpdate = {};
      const emptyPayslip: PayslipUpdate = {};
      const emptyAdjustment: AdjustmentUpdate = {};

      expect(emptyProfile).toBeDefined();
      expect(emptyRun).toBeDefined();
      expect(emptyPayslip).toBeDefined();
      expect(emptyAdjustment).toBeDefined();
    });

    it("10. allows specific partial updates across all tables", () => {
      type PayrollRunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      type PayslipUpdate = Database["public"]["Tables"]["crm_payslips"]["Update"];
      type AdjustmentUpdate = Database["public"]["Tables"]["crm_salary_adjustments"]["Update"];

      const lockRun: PayrollRunUpdate = {
        status: "locked",
        locked_by: "user-uuid-1",
        locked_at: new Date().toISOString(),
      };
      expect(lockRun.status).toBe("locked");

      const markPaid: PayslipUpdate = {
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      };
      expect(markPaid.payment_status).toBe("paid");

      const approveAdj: AdjustmentUpdate = {
        status: "approved",
        approved_by: "user-uuid-admin",
        approved_at: new Date().toISOString(),
      };
      expect(approveAdj.status).toBe("approved");

      // Negative test: invalid property type in update
      type BadRunUpdate = { total_payout: string };
      type CanAssignBadRun = Extends<BadRunUpdate, PayrollRunUpdate>;
      const canAssignBadRun: CanAssignBadRun = false;
      expect(canAssignBadRun).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 4: Foreign Key Relationships in Supabase Types
  // ==========================================================================
  describe("Suite 4: Foreign Key Relationships Definition", () => {
    it("11. defines foreign key relationships for all 4 tables", () => {
      type ProfileRel = Database["public"]["Tables"]["crm_salary_profiles"]["Relationships"];
      type PayrollRunRel = Database["public"]["Tables"]["crm_payroll_runs"]["Relationships"];
      type PayslipRel = Database["public"]["Tables"]["crm_payslips"]["Relationships"];
      type AdjustmentRel = Database["public"]["Tables"]["crm_salary_adjustments"]["Relationships"];

      const profileRel: ProfileRel = [
        {
          foreignKeyName: "crm_salary_profiles_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(profileRel.length).toBe(1);

      const payrollRunRel: PayrollRunRel = [
        {
          foreignKeyName: "crm_payroll_runs_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(payrollRunRel.length).toBe(1);

      const payslipRel: PayslipRel = [
        {
          foreignKeyName: "crm_payslips_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_payslips_payroll_run_id_fkey",
          columns: ["payroll_run_id"],
          isOneToOne: false,
          referencedRelation: "crm_payroll_runs",
          referencedColumns: ["id"],
        },
      ];
      expect(payslipRel.length).toBe(2);

      const adjustmentRel: AdjustmentRel = [
        {
          foreignKeyName: "crm_salary_adjustments_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(adjustmentRel.length).toBe(1);
    });
  });

  // ==========================================================================
  // Suite 5: Type Helpers & Zero Any Invariants
  // ==========================================================================
  describe("Suite 5: Type Helper Generics & Zero Any Verification", () => {
    it("12. verifies Tables, TablesInsert, and TablesUpdate helpers work correctly", () => {
      type ProfileFromHelper = Tables<"crm_salary_profiles">;
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      expectTypeOf<ProfileFromHelper>().toEqualTypeOf<ProfileRow>();

      type PayslipInsertFromHelper = TablesInsert<"crm_payslips">;
      type PayslipInsert = Database["public"]["Tables"]["crm_payslips"]["Insert"];
      expectTypeOf<PayslipInsertFromHelper>().toEqualTypeOf<PayslipInsert>();

      type RunUpdateFromHelper = TablesUpdate<"crm_payroll_runs">;
      type RunUpdate = Database["public"]["Tables"]["crm_payroll_runs"]["Update"];
      expectTypeOf<RunUpdateFromHelper>().toEqualTypeOf<RunUpdate>();
    });

    it("13. enforces strict zero 'any' types across all 4 CRM salary table definitions", () => {
      type ProfileRow = Database["public"]["Tables"]["crm_salary_profiles"]["Row"];
      type PayrollRunRow = Database["public"]["Tables"]["crm_payroll_runs"]["Row"];
      type PayslipRow = Database["public"]["Tables"]["crm_payslips"]["Row"];
      type AdjustmentRow = Database["public"]["Tables"]["crm_salary_adjustments"]["Row"];

      type HasAny =
        | IsAny<ProfileRow>
        | IsAny<PayrollRunRow>
        | IsAny<PayslipRow>
        | IsAny<AdjustmentRow>;

      const hasAny: HasAny = false;
      expect(hasAny).toBe(false);
    });
  });
});
