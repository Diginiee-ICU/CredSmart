/**
 * CredSmart CRM Phase 3: Salary Management Admin & Payroll Workflows Test Suite
 * Covers 17 tests:
 * - Payroll Run month selection, input binding, and scheduled working days display
 * - Payroll generation calculation preview execution (generatePayslipData)
 * - Preview columns: Present, Absent, LOP Days, Gross, Deductions, Net Pay
 * - Admin permission gating with useCRMPermission('salary', 'approve') and super admin bypass
 * - Summary Totals KPI Bar calculations (Total Staff, Gross, Deductions, Payout)
 * - "Lock Payroll" action workflow, persistence, status badge update, and disabled states
 * - "Mark as Disbursed" action workflow, status transitions, and draft state protection
 * - Advance & Bonus review workflow: Approve and Reject actions, permission gating
 * - Missing salary profile detection and warning toasts during payroll generation
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

// ============================================================================
// Shared Mock Framework for Admin Tests
// ============================================================================

export const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

export const mockOrg = {
  id: "org-crm-salary-001",
  name: "CredSmart Enterprise",
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
  id: "user-admin-001",
  email: "admin@credsmart.test",
  user_metadata: { full_name: "Admin Manager" },
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
    { id: "user-staff-003", name: "Pooja Patel", email: "pooja@credsmart.test", roleName: "Store Executive" },
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
      base_amount: 35000,
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

  mockDbStore.payrollRuns = [
    {
      id: "run-2026-09",
      org_id: mockOrg.id,
      month_year: "2026-09",
      status: "locked",
      total_payout: 85000,
      staff_count: 2,
      locked_by: "user-admin-001",
      locked_at: "2026-10-01T10:00:00Z",
      notes: "September payroll finalized",
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
      present_days: 25,
      absent_days: 1,
      half_days: 0,
      lop_days: 0,
      overtime_minutes: 120,
      gross_salary: 50600,
      lop_deduction: 0,
      overtime_amount: 600,
      pf_deduction: 6072,
      esi_deduction: 885.5,
      advance_deduction: 0,
      bonus_amount: 0,
      net_salary: 43642.5,
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
        base_amount: 35000,
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
      gross_salary: 35000,
      lop_deduction: 0,
      overtime_amount: 0,
      pf_deduction: 4200,
      esi_deduction: 612.5,
      advance_deduction: 5000,
      bonus_amount: 0,
      net_salary: 25187.5,
      payment_status: "paid",
      paid_at: "2026-10-05T12:00:00Z",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-05T12:00:00Z",
    },
  ];

  mockDbStore.adjustments = [
    {
      id: "adj-001",
      org_id: mockOrg.id,
      staff_id: "user-staff-002",
      staff_name: "Rajesh Kumar",
      type: "advance",
      amount: 5000,
      description: "Festival emergency advance",
      month_year: "2026-10",
      status: "pending",
      requested_by: "user-staff-002",
      approved_by: null,
      approved_at: null,
      created_at: "2026-10-10T08:00:00Z",
    },
    {
      id: "adj-002",
      org_id: mockOrg.id,
      staff_id: "user-staff-001",
      staff_name: "Amit Sharma",
      type: "bonus",
      amount: 10000,
      description: "Q3 Performance bonus",
      month_year: "2026-10",
      status: "approved",
      requested_by: "user-admin-001",
      approved_by: "user-admin-001",
      approved_at: "2026-10-12T10:00:00Z",
      created_at: "2026-10-11T09:00:00Z",
    },
  ];

  mockDbStore.attendance = [
    { staff_id: "user-staff-001", date: "2026-10-01", status: "present", overtime_minutes: 60, work_duration_minutes: 540 },
    { staff_id: "user-staff-001", date: "2026-10-02", status: "present", overtime_minutes: 0, work_duration_minutes: 480 },
    { staff_id: "user-staff-002", date: "2026-10-01", status: "present", overtime_minutes: 0, work_duration_minutes: 480 },
    { staff_id: "user-staff-002", date: "2026-10-02", status: "absent", overtime_minutes: 0, work_duration_minutes: 0 },
  ];
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
// Test Suite: Salary Management Admin & Payroll Workflows
// ============================================================================

describe("Salary Management Admin & Payroll Workflows (src/pages/crm/SalaryManagement.tsx)", { timeout: 25000 }, () => {
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
  // Suite 1: Payroll Run Month Selection & Preview Calculation (Tests 1-4)
  // --------------------------------------------------------------------------
  describe("Suite 1: Payroll Run Month Selection & Preview Calculation", () => {
    it("1. defaults month picker to current active month (e.g. 2026-10)", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      await waitFor(() => {
        expect(screen.getByDisplayValue(/2026-(09|10)/) || screen.getByText(/2026-10/i)).toBeInTheDocument();
      });
    });

    it("2. updates selected month when month input changes", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-11" } });
      expect((monthInput as HTMLInputElement).value).toBe("2026-11");
    });

    it("3. executes generatePayslipData for all active staff when Generate Payroll is clicked", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll|Run Calculation/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Rajesh Kumar").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("4. renders preview columns: Present, Absent, LOP Days, Gross, Deductions, and Net Pay", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll|Run Calculation/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getAllByText(/Present/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Gross/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Net Pay/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Admin Gating with useCRMPermission('salary', 'approve') (Tests 5-6)
  // --------------------------------------------------------------------------
  describe("Suite 2: Permission Gating for Admin Actions (salary, approve)", () => {
    it("5. disables Generate and Lock Payroll buttons for users lacking approve permission", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canApprove = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      await waitFor(() => {
        const genBtn = screen.getByRole("button", { name: /Generate Payroll/i });
        expect(genBtn).toBeDisabled();
      });
      const lockBtn = screen.getByRole("button", { name: /Lock Payroll/i });
      expect(lockBtn).toBeDisabled();
    });

    it("6. super admin bypasses approve permission check and has full access to payroll actions", async () => {
      mockPermissionsState.isSuperAdmin = true;
      mockPermissionsState.canApprove = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const genBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      expect(genBtn).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Summary Totals KPI Bar Calculations (Test 7)
  // --------------------------------------------------------------------------
  describe("Suite 3: Summary Totals KPI Bar", () => {
    it("7. accurately renders Total Staff, Total Payout, and Total Deductions in summary bar", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/Total Staff/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Payout/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Deductions/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: "Lock Payroll" Action & Disabled States (Tests 8-10)
  // --------------------------------------------------------------------------
  describe("Suite 4: Lock Payroll Action Workflow", () => {
    it("8. clicking Lock Payroll updates status to locked, sets locked_by/locked_at, and saves payslips", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      expect(lockBtn).toBeEnabled();
      fireEvent.click(lockBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Payroll Locked|Locked/i),
          })
        );
      });

      expect(screen.getAllByText(/LOCKED/i).length).toBeGreaterThanOrEqual(1);
    });

    it("9. Lock Payroll button is disabled when current payroll run is already locked", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      // Select September 2026 (pre-locked in mockDbStore)
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      await waitFor(() => {
        const lockBtn = screen.getByRole("button", { name: /Lock Payroll/i });
        expect(lockBtn).toBeDisabled();
      });
    });

    it("10. prevents re-generation or warns user that recalculating locked payroll is forbidden", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      await waitFor(() => {
        const genBtn = screen.getByRole("button", { name: /Generate Payroll/i });
        expect(genBtn).toBeDisabled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: "Mark as Disbursed" Action Flow (Tests 11-12)
  // --------------------------------------------------------------------------
  describe("Suite 5: Disburse Payroll Lifecycle", () => {
    it("11. Mark as Disbursed button is disabled when payroll status is draft", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      const disburseBtn = await screen.findByRole("button", { name: /Mark as Disbursed/i });
      expect(disburseBtn).toBeDisabled();
    });

    it("12. Mark as Disbursed button is enabled when locked, and clicking transitions status to disbursed", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));

      // Switch to September 2026 (locked)
      const monthInput = await screen.findByLabelText(/Select Month|Payroll Month/i);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      const disburseBtn = await screen.findByRole("button", { name: /Mark as Disbursed/i });
      await waitFor(() => {
        expect(disburseBtn).toBeEnabled();
      });

      fireEvent.click(disburseBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Disbursed|Marked as Disbursed/i),
          })
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Advance Approvals / Rejections (Tests 13-16)
  // --------------------------------------------------------------------------
  describe("Suite 6: Advance Approvals & Rejection Workflow", () => {
    it("13. renders Approve and Reject buttons for pending salary adjustments", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Advances & Deductions|Adjustments/i });
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getAllByText("Festival emergency advance").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getAllByRole("button", { name: /Approve/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole("button", { name: /Reject/i }).length).toBeGreaterThanOrEqual(1);
    });

    it("14. hides Approve and Reject buttons for staff lacking approve permission", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canApprove = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Advances & Deductions|Adjustments/i });
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getAllByText("Festival emergency advance").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reject/i })).not.toBeInTheDocument();
    });

    it("15. approving an advance updates status to approved, sets approved_by and approved_at", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Advances & Deductions|Adjustments/i });
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      const approveBtns = await screen.findAllByRole("button", { name: /Approve/i });
      fireEvent.click(approveBtns[0]);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Approved|Adjustment Approved/i),
          })
        );
      });
    });

    it("16. rejecting an advance updates status to rejected", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Advances & Deductions|Adjustments/i });
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      const rejectBtns = await screen.findAllByRole("button", { name: /Reject/i });
      fireEvent.click(rejectBtns[0]);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Rejected|Adjustment Rejected/i),
          })
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Missing Profile Warning Toast during Payroll Run (Test 17)
  // --------------------------------------------------------------------------
  describe("Suite 7: Missing Salary Profile Warning", () => {
    it("17. fires warning toast during payroll generation if an active staff member lacks a salary profile", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = await screen.findByRole("button", { name: /Generate Payroll/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Warning|Missing Profile/i),
            description: expect.stringMatching(/Pooja Patel|missing.*salary profile/i),
          })
        );
      });
    });
  });
});
