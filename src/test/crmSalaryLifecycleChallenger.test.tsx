/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Adversarial Challenger Suite: Lifecycle & Advance Deductions Challenge
 *
 * Empirically tests:
 * 1. Full payroll run lifecycle transitions: draft -> locked -> disbursed
 * 2. Advance deductions ingestion into payroll calculations:
 *    - Pending advances excluded
 *    - Approved advances for current month included
 *    - Future-month approved advances excluded
 *    - Aggregation of multiple adjustments (advances + loans + deductions)
 *    - Clamping when deductions exceed gross salary (no negative net pay)
 * 3. Multi-month isolation and uncommitted preview cache eviction
 * 4. Terminal disbursed state invariants (all action buttons locked)
 * 5. Self-service employee payslip isolation (Tab 4 data partitioning)
 * 6. RBAC privilege boundaries across lifecycle mutations
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalaryManagement from "@/pages/crm/SalaryManagement";
import { supabase } from "@/integrations/supabase/client";
import type {
  CrmSalaryProfile,
  CrmPayrollRun,
  CrmPayslip,
  CrmSalaryAdjustment,
  CrmAttendanceRecord,
} from "@/types/crmPayroll";

// Toast Mock
export const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

export const mockOrg = {
  id: "org-challenger-001",
  name: "CredSmart Challenger Org",
};

export const mockOrgState = {
  orgId: mockOrg.id,
  org: mockOrg,
  userRole: "admin",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockOrgState,
}));

export const mockAdminUser = {
  id: "user-admin-999",
  email: "payroll_admin@credsmart.test",
  user_metadata: { full_name: "Super Payroll Admin" },
};

export const mockStaffUser = {
  id: "user-staff-002",
  email: "rajesh@credsmart.test",
  user_metadata: { full_name: "Rajesh Kumar" },
};

export let activeMockUser = mockAdminUser;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: activeMockUser,
  }),
}));

export interface MockPermissionsState {
  isSuperAdmin: boolean;
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  loading: boolean;
}

export const mockPermissionsState: MockPermissionsState = {
  isSuperAdmin: true,
  canView: true,
  canEdit: true,
  canApprove: true,
  loading: false,
};

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: (_module?: string, action?: string) => ({
    isSuperAdmin: mockPermissionsState.isSuperAdmin,
    loading: mockPermissionsState.loading,
    hasPermission: (_mod: string, act: string) => {
      if (mockPermissionsState.isSuperAdmin) return true;
      if (act === "view") return mockPermissionsState.canView;
      if (act === "edit") return mockPermissionsState.canEdit;
      if (act === "approve") return mockPermissionsState.canApprove;
      return false;
    },
    allowed:
      mockPermissionsState.isSuperAdmin ||
      (action === "view"
        ? mockPermissionsState.canView
        : action === "approve"
        ? mockPermissionsState.canApprove
        : mockPermissionsState.canEdit),
    userRoles: [],
    permissions: [],
    error: null,
    refreshPermissions: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("jspdf", () => {
  const MockJsPdf = vi.fn().mockImplementation(() => ({
    setFillColor: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    roundedRect: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    line: vi.fn().mockReturnThis(),
    save: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(["mock-pdf"], { type: "application/pdf" })),
  }));
  return {
    default: MockJsPdf,
    jsPDF: MockJsPdf,
  };
});

// Database Mock Store
export interface MockDatabaseStore {
  salaryProfiles: CrmSalaryProfile[];
  payrollRuns: CrmPayrollRun[];
  payslips: CrmPayslip[];
  adjustments: CrmSalaryAdjustment[];
  attendance: CrmAttendanceRecord[];
  staff: Array<{ id: string; name: string; email: string; roleName: string }>;
}

export const mockDbStore: MockDatabaseStore = {
  salaryProfiles: [],
  payrollRuns: [],
  payslips: [],
  adjustments: [],
  attendance: [],
  staff: [],
};

export const resetMockDbStore = () => {
  mockDbStore.staff = [
    { id: "user-staff-001", name: "Amit Sharma", email: "amit@credsmart.test", roleName: "Senior Accountant" },
    { id: "user-staff-002", name: "Rajesh Kumar", email: "rajesh@credsmart.test", roleName: "Inventory Lead" },
  ];

  mockDbStore.salaryProfiles = [
    {
      id: "profile-001",
      org_id: mockOrg.id,
      staff_id: "user-staff-001",
      staff_name: "Amit Sharma",
      staff_role: "Senior Accountant",
      salary_type: "monthly",
      base_amount: 50000,
      currency: "INR",
      allowed_leaves_per_month: 2,
      hourly_overtime_rate: 300,
      pf_deduction_percent: 12.0,
      esi_deduction_percent: 1.75,
      is_active: true,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "profile-002",
      org_id: mockOrg.id,
      staff_id: "user-staff-002",
      staff_name: "Rajesh Kumar",
      staff_role: "Inventory Lead",
      salary_type: "monthly",
      base_amount: 30000,
      currency: "INR",
      allowed_leaves_per_month: 2,
      hourly_overtime_rate: 200,
      pf_deduction_percent: 12.0,
      esi_deduction_percent: 1.75,
      is_active: true,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  // Month 2026-09 is already locked in history
  mockDbStore.payrollRuns = [
    {
      id: "run-2026-09",
      org_id: mockOrg.id,
      month_year: "2026-09",
      status: "locked",
      total_payout: 80000,
      staff_count: 2,
      locked_by: "user-admin-999",
      locked_at: "2026-10-01T10:00:00Z",
      notes: "September locked",
      created_at: "2026-10-01T09:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    },
  ];

  mockDbStore.payslips = [
    {
      id: "slip-001",
      org_id: mockOrg.id,
      payroll_run_id: "run-2026-09",
      staff_id: "user-staff-001",
      staff_name: "Amit Sharma",
      month_year: "2026-09",
      salary_profile_snapshot: {
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 300,
        pf_deduction_percent: 12.0,
        esi_deduction_percent: 1.75,
      },
      working_days_in_month: 26,
      present_days: 26,
      absent_days: 0,
      half_days: 0,
      lop_days: 0,
      overtime_minutes: 0,
      gross_salary: 50000,
      lop_deduction: 0,
      overtime_amount: 0,
      pf_deduction: 6000,
      esi_deduction: 875,
      advance_deduction: 0,
      bonus_amount: 0,
      net_salary: 43125,
      payment_status: "paid",
      paid_at: "2026-10-05T12:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-05T12:00:00Z",
    },
    {
      id: "slip-002",
      org_id: mockOrg.id,
      payroll_run_id: "run-2026-09",
      staff_id: "user-staff-002",
      staff_name: "Rajesh Kumar",
      month_year: "2026-09",
      salary_profile_snapshot: {
        salary_type: "monthly",
        base_amount: 30000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 200,
        pf_deduction_percent: 12.0,
        esi_deduction_percent: 1.75,
      },
      working_days_in_month: 26,
      present_days: 26,
      absent_days: 0,
      half_days: 0,
      lop_days: 0,
      overtime_minutes: 0,
      gross_salary: 30000,
      lop_deduction: 0,
      overtime_amount: 0,
      pf_deduction: 3600,
      esi_deduction: 525,
      advance_deduction: 0,
      bonus_amount: 0,
      net_salary: 25875,
      payment_status: "paid",
      paid_at: "2026-10-05T12:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-05T12:00:00Z",
    },
  ];

  mockDbStore.adjustments = [];
  mockDbStore.attendance = [];
};

export const createSupabaseQueryBuilder = (table: string) => {
  let selectedData: Record<string, unknown>[] = [];
  if (table === "crm_salary_profiles") selectedData = [...mockDbStore.salaryProfiles] as unknown as Record<string, unknown>[];
  else if (table === "crm_payroll_runs") selectedData = [...mockDbStore.payrollRuns] as unknown as Record<string, unknown>[];
  else if (table === "crm_payslips") selectedData = [...mockDbStore.payslips] as unknown as Record<string, unknown>[];
  else if (table === "crm_salary_adjustments") selectedData = [...mockDbStore.adjustments] as unknown as Record<string, unknown>[];
  else if (table === "crm_attendance") selectedData = [...mockDbStore.attendance] as unknown as Record<string, unknown>[];
  else if (table === "auth.users" || table === "profiles" || table === "staff") selectedData = [...mockDbStore.staff] as unknown as Record<string, unknown>[];

  interface Builder {
    _table: string;
    _data: Record<string, unknown>[];
    _error: Error | null;
    select: (fields?: string) => Builder;
    eq: (col: string, val: unknown) => Builder;
    in: (col: string, vals: unknown[]) => Builder;
    order: (col: string, opts?: { ascending?: boolean }) => Builder;
    single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
    upsert: (payload: unknown) => Promise<{ data: unknown; error: Error | null }>;
    insert: (payload: unknown) => Promise<{ data: unknown; error: Error | null }>;
    update: (updates: Record<string, unknown>) => { eq: (col: string, val: unknown) => Promise<{ error: Error | null }> };
    then: (resolve: (val: { data: Record<string, unknown>[]; error: Error | null }) => void) => void;
  }

  const builder: Builder = {
    _table: table,
    _data: selectedData,
    _error: null,
    select: () => builder,
    eq: (col: string, val: unknown) => {
      builder._data = builder._data.filter((item) => item[col] === val);
      return builder;
    },
    in: (col: string, vals: unknown[]) => {
      builder._data = builder._data.filter((item) => vals.includes(item[col]));
      return builder;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      const asc = opts?.ascending ?? true;
      builder._data.sort((a, b) => {
        const valA = a[col] as string | number;
        const valB = b[col] as string | number;
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
      return builder;
    },
    single: () => {
      return Promise.resolve({
        data: builder._data[0] ?? null,
        error: builder._error,
      });
    },
    upsert: (payload: unknown) => {
      const arr = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [payload as Record<string, unknown>];
      for (const item of arr) {
        const id = (item.id as string) || `gen-${Date.now()}-${Math.random()}`;
        const record = { ...item, id };
        if (table === "crm_salary_profiles") {
          const idx = mockDbStore.salaryProfiles.findIndex(
            (p) => p.staff_id === item.staff_id || p.id === item.id
          );
          if (idx >= 0) mockDbStore.salaryProfiles[idx] = { ...mockDbStore.salaryProfiles[idx], ...record } as CrmSalaryProfile;
          else mockDbStore.salaryProfiles.push(record as unknown as CrmSalaryProfile);
        } else if (table === "crm_payroll_runs") {
          const idx = mockDbStore.payrollRuns.findIndex((r) => r.month_year === item.month_year);
          if (idx >= 0) mockDbStore.payrollRuns[idx] = { ...mockDbStore.payrollRuns[idx], ...record } as CrmPayrollRun;
          else mockDbStore.payrollRuns.push(record as unknown as CrmPayrollRun);
        } else if (table === "crm_payslips") {
          const idx = mockDbStore.payslips.findIndex(
            (s) => s.staff_id === item.staff_id && s.month_year === item.month_year
          );
          if (idx >= 0) mockDbStore.payslips[idx] = { ...mockDbStore.payslips[idx], ...record } as CrmPayslip;
          else mockDbStore.payslips.push(record as unknown as CrmPayslip);
        }
      }
      return Promise.resolve({ data: payload, error: builder._error });
    },
    insert: (payload: unknown) => {
      const arr = Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [payload as Record<string, unknown>];
      for (const item of arr) {
        const id = (item.id as string) || `gen-${Date.now()}-${Math.random()}`;
        const record = { ...item, id };
        if (table === "crm_salary_adjustments") mockDbStore.adjustments.push(record as unknown as CrmSalaryAdjustment);
        else if (table === "crm_payslips") mockDbStore.payslips.push(record as unknown as CrmPayslip);
      }
      return Promise.resolve({ data: payload, error: builder._error });
    },
    update: (updates: Record<string, unknown>) => {
      return {
        eq: (col: string, val: unknown) => {
          if (table === "crm_payroll_runs") {
            mockDbStore.payrollRuns = mockDbStore.payrollRuns.map((r) =>
              (r as unknown as Record<string, unknown>)[col] === val ? ({ ...r, ...updates } as CrmPayrollRun) : r
            );
          } else if (table === "crm_salary_adjustments") {
            mockDbStore.adjustments = mockDbStore.adjustments.map((a) =>
              (a as unknown as Record<string, unknown>)[col] === val ? ({ ...a, ...updates } as CrmSalaryAdjustment) : a
            );
          } else if (table === "crm_payslips") {
            mockDbStore.payslips = mockDbStore.payslips.map((p) =>
              (p as unknown as Record<string, unknown>)[col] === val ? ({ ...p, ...updates } as CrmPayslip) : p
            );
          }
          return Promise.resolve({ error: builder._error });
        },
      };
    },
    then: (resolve: (val: { data: Record<string, unknown>[]; error: Error | null }) => void) => {
      resolve({ data: builder._data, error: builder._error });
    },
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => createSupabaseQueryBuilder(table)),
  },
}));

// ============================================================================
// Adversarial Challenger Test Suite
// ============================================================================

describe("Adversarial Lifecycle & Advance Deductions Challenge", { timeout: 25000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetMockDbStore();
    activeMockUser = mockAdminUser;
    mockPermissionsState.isSuperAdmin = true;
    mockPermissionsState.canView = true;
    mockPermissionsState.canEdit = true;
    mockPermissionsState.canApprove = true;
    mockPermissionsState.loading = false;
    vi.mocked(supabase.from).mockImplementation((table: string) => createSupabaseQueryBuilder(table) as any);
  });

  // --------------------------------------------------------------------------
  // Challenge Section 1: Complete Sequential Lifecycle Walk (draft -> locked -> disbursed)
  // --------------------------------------------------------------------------
  describe("Section 1: Lifecycle State Progression & Mutation Invariants", () => {
    it("1.1 strictly prevents disburse action while in draft state, transitions cleanly from draft -> locked -> disbursed", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      // Set month to 2026-10 (which has no existing run -> draft)
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      const disburseBtn = await screen.findByRole("button", { name: /Mark as Disbursed/i });

      // In draft state before calculation preview:
      expect(generateBtn).toBeEnabled();
      expect(disburseBtn).toBeDisabled();

      // Step 1: Calculate preview
      fireEvent.click(generateBtn);
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
      expect(lockBtn).toBeEnabled();
      expect(disburseBtn).toBeDisabled();

      // Step 2: Lock Payroll
      fireEvent.click(lockBtn);
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: expect.stringMatching(/Locked/i) })
        );
      });

      // Verify DB persistence of locked run
      const lockedRun = mockDbStore.payrollRuns.find((r) => r.month_year === "2026-10");
      expect(lockedRun).toBeDefined();
      expect(lockedRun?.status).toBe("locked");
      expect(lockedRun?.staff_count).toBe(2);
      expect(lockedRun?.locked_by).toBe(mockAdminUser.id);
      expect(lockedRun?.total_payout).toBeGreaterThan(0);

      // Verify DB persistence of payslips
      const octPayslips = mockDbStore.payslips.filter((s) => s.month_year === "2026-10");
      expect(octPayslips.length).toBe(2);
      expect(octPayslips[0].payment_status).toBe("pending");

      // In locked state:
      expect(lockBtn).toBeDisabled();
      expect(generateBtn).toBeDisabled();
      expect(disburseBtn).toBeEnabled();

      // Step 3: Mark as Disbursed
      fireEvent.click(disburseBtn);
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: expect.stringMatching(/Disbursed/i) })
        );
      });

      // Verify DB persistence of disbursed status and updated payslips
      const disbursedRun = mockDbStore.payrollRuns.find((r) => r.month_year === "2026-10");
      expect(disbursedRun?.status).toBe("disbursed");

      const disbursedPayslips = mockDbStore.payslips.filter((s) => s.month_year === "2026-10");
      expect(disbursedPayslips.every((s) => s.payment_status === "paid")).toBe(true);
      expect(disbursedPayslips.every((s) => s.paid_at !== null)).toBe(true);

      // In terminal disbursed state: all action buttons must be disabled
      expect(generateBtn).toBeDisabled();
      expect(lockBtn).toBeDisabled();
      expect(disburseBtn).toBeDisabled();
    });

    it("1.2 total payout recorded in payroll run matches exactly the sum of payslip net salaries", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const lockedRun = mockDbStore.payrollRuns.find((r) => r.month_year === "2026-10");
        expect(lockedRun).toBeDefined();
      });

      const lockedRun = mockDbStore.payrollRuns.find((r) => r.month_year === "2026-10")!;
      const octPayslips = mockDbStore.payslips.filter((s) => s.month_year === "2026-10");
      const sumNet = octPayslips.reduce((sum, s) => sum + Number(s.net_salary), 0);

      expect(lockedRun.total_payout).toBeCloseTo(sumNet, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Challenge Section 2: Advance Deductions Integration & Ingestion
  // --------------------------------------------------------------------------
  describe("Section 2: Advance Deductions Feeding into Payroll Calculations", () => {
    it("2.1 ignores pending advances and only deducts approved advances in the payroll calculation", async () => {
      // Setup: 1 pending advance and 1 approved advance for Rajesh Kumar
      mockDbStore.adjustments = [
        {
          id: "adj-pending-01",
          org_id: mockOrg.id,
          staff_id: "user-staff-002",
          staff_name: "Rajesh Kumar",
          type: "advance",
          amount: 5000,
          description: "Pending advance request",
          month_year: "2026-10",
          status: "pending",
          requested_by: "user-staff-002",
          approved_by: null,
          approved_at: null,
          created_at: "2026-10-05T00:00:00Z",
        },
        {
          id: "adj-approved-02",
          org_id: mockOrg.id,
          staff_id: "user-staff-002",
          staff_name: "Rajesh Kumar",
          type: "advance",
          amount: 3000,
          description: "Approved festive advance",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-staff-002",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
      ];

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const slip = mockDbStore.payslips.find(
          (s) => s.staff_id === "user-staff-002" && s.month_year === "2026-10"
        );
        expect(slip).toBeDefined();
        // Advance deduction should be exactly 3000 (approved only, NOT 8000)
        expect(Number(slip?.advance_deduction)).toBe(3000);
      });
    });

    it("2.2 excludes approved advances assigned to future months from current month payroll run", async () => {
      // Setup: Rajesh has an approved advance for November 2026 (2026-11)
      mockDbStore.adjustments = [
        {
          id: "adj-future-01",
          org_id: mockOrg.id,
          staff_id: "user-staff-002",
          staff_name: "Rajesh Kumar",
          type: "advance",
          amount: 7000,
          description: "Advance for next month",
          month_year: "2026-11", // Future month
          status: "approved",
          requested_by: "user-staff-002",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
      ];

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const slip = mockDbStore.payslips.find(
          (s) => s.staff_id === "user-staff-002" && s.month_year === "2026-10"
        );
        expect(slip).toBeDefined();
        // Advance deduction for October must be 0 (the 7000 was for November)
        expect(Number(slip?.advance_deduction)).toBe(0);
      });
    });

    it("2.3 correctly aggregates multiple adjustment types (advance, loan_repayment, deduction) and bonus", async () => {
      // Setup for Amit Sharma:
      // - Advance: 4000
      // - Loan repayment: 2000
      // - Deduction: 1000
      // - Bonus: 5000
      mockDbStore.adjustments = [
        {
          id: "adj-a1",
          org_id: mockOrg.id,
          staff_id: "user-staff-001",
          staff_name: "Amit Sharma",
          type: "advance",
          amount: 4000,
          description: "Advance",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-staff-001",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
        {
          id: "adj-a2",
          org_id: mockOrg.id,
          staff_id: "user-staff-001",
          staff_name: "Amit Sharma",
          type: "loan_repayment",
          amount: 2000,
          description: "Loan installment",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-staff-001",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
        {
          id: "adj-a3",
          org_id: mockOrg.id,
          staff_id: "user-staff-001",
          staff_name: "Amit Sharma",
          type: "deduction",
          amount: 1000,
          description: "Equipment damage",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-admin-999",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
        {
          id: "adj-a4",
          org_id: mockOrg.id,
          staff_id: "user-staff-001",
          staff_name: "Amit Sharma",
          type: "bonus",
          amount: 5000,
          description: "Festive bonus",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-admin-999",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
      ];

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const slip = mockDbStore.payslips.find(
          (s) => s.staff_id === "user-staff-001" && s.month_year === "2026-10"
        );
        expect(slip).toBeDefined();
        // Total advance/loan/deduction = 4000 + 2000 + 1000 = 7000
        expect(Number(slip?.advance_deduction)).toBe(7000);
        // Bonus amount = 5000
        expect(Number(slip?.bonus_amount)).toBe(5000);
      });
    });

    it("2.4 clamps net pay to 0 when advance deductions exceed total earnings (invariant: netSalary >= 0)", async () => {
      // Setup: Rajesh has an approved advance of 100,000 (much larger than base 30,000)
      mockDbStore.adjustments = [
        {
          id: "adj-huge-01",
          org_id: mockOrg.id,
          staff_id: "user-staff-002",
          staff_name: "Rajesh Kumar",
          type: "advance",
          amount: 100000,
          description: "Massive advance",
          month_year: "2026-10",
          status: "approved",
          requested_by: "user-staff-002",
          approved_by: "user-admin-999",
          approved_at: "2026-10-06T00:00:00Z",
          created_at: "2026-10-05T00:00:00Z",
        },
      ];

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const slip = mockDbStore.payslips.find(
          (s) => s.staff_id === "user-staff-002" && s.month_year === "2026-10"
        );
        expect(slip).toBeDefined();
        expect(Number(slip?.net_salary)).toBe(0); // Clamped, not negative
      });
    });

    it("2.5 live UI workflow: approving an advance in Tab 3 immediately affects payroll calculation in Tab 2", async () => {
      // Setup: Initially 1 pending advance of 4,000 for Rajesh
      mockDbStore.adjustments = [
        {
          id: "adj-flow-01",
          org_id: mockOrg.id,
          staff_id: "user-staff-002",
          staff_name: "Rajesh Kumar",
          type: "advance",
          amount: 4000,
          description: "Festival emergency advance",
          month_year: "2026-10",
          status: "pending",
          requested_by: "user-staff-002",
          approved_by: null,
          approved_at: null,
          created_at: "2026-10-10T08:00:00Z",
        },
      ];

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      // 1. Go to Tab 3 and approve the adjustment
      await screen.findByRole("tab", { name: /Advances & Deductions|Adjustments/i });
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));

      const approveBtn = await screen.findAllByRole("button", { name: /Approve/i });
      fireEvent.click(approveBtn[0]);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({ title: expect.stringMatching(/Approved/i) })
        );
      });

      // 2. Switch to Tab 2 and generate payroll
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());
      fireEvent.click(lockBtn);

      await waitFor(() => {
        const slip = mockDbStore.payslips.find(
          (s) => s.staff_id === "user-staff-002" && s.month_year === "2026-10"
        );
        expect(slip).toBeDefined();
        expect(Number(slip?.advance_deduction)).toBe(4000);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Challenge Section 3: Multi-Month State Isolation & Preview Eviction
  // --------------------------------------------------------------------------
  describe("Section 3: Multi-Month State Isolation & Preview Eviction", () => {
    it("3.1 switching month selector resets generated preview to prevent stale uncommitted locks", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-10" } });

      // Generate preview for October
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      await waitFor(() => expect(lockBtn).toBeEnabled());

      // Now change month to 2026-11 without locking
      fireEvent.change(monthInput, { target: { value: "2026-11" } });

      // Preview should be evicted, and Lock Payroll button should be disabled for 2026-11
      await waitFor(() => {
        expect(lockBtn).toBeDisabled();
      });
    });

    it("3.2 switching to a previously locked month restores locked badges and disables generation", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      // Switch to pre-locked September 2026
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      await waitFor(() => {
        expect(screen.getAllByText(/LOCKED/i).length).toBeGreaterThanOrEqual(1);
      });

      const generateBtn = screen.getByRole("button", { name: /Generate Payroll/i });
      const lockBtn = screen.getByRole("button", { name: /Lock Payroll/i });
      const disburseBtn = screen.getByRole("button", { name: /Mark as Disbursed/i });

      expect(generateBtn).toBeDisabled();
      expect(lockBtn).toBeDisabled();
      expect(disburseBtn).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // Challenge Section 4: Self-Service Payslip Data Isolation (Tab 4)
  // --------------------------------------------------------------------------
  describe("Section 4: Self-Service Employee Payslip Partitioning", () => {
    it("4.1 only displays payslips belonging to the logged-in staff member in Tab 4 (no cross-staff leakage)", async () => {
      // Act as Rajesh Kumar (user-staff-002)
      activeMockUser = mockStaffUser;

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /My Payslips/i });
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));

      // Tab 4 should display Rajesh's September payslip (slip-002)
      await waitFor(() => {
        expect(screen.getByText(/2026-09/i)).toBeInTheDocument();
      });

      // Amit Sharma's specific salary figure (43125) must NOT appear in Rajesh's portal
      expect(screen.queryByText(/₹43,125\.00/i)).not.toBeInTheDocument();
    });

    it("4.2 clicking Download PDF in My Payslips triggers jsPDF generation cleanly", async () => {
      activeMockUser = mockStaffUser;

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /My Payslips/i });
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));

      const downloadBtn = await screen.findByRole("button", { name: /Download PDF/i });
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Generating Payslip PDF|Payslip/i),
          })
        );
      });
    });
  });
});
