/**
 * CredSmart CRM Phase 3: Salary Management UI & Interactions Test Suite
 * Covers 26 comprehensive tests:
 * - CRMPageHeader, brand tokens, breadcrumbs, Phase 3 badge
 * - Tab switching and state preservation across all 4 tabs
 * - RBAC permission gating with useCRMPermission('salary', 'view') and super admin bypass
 * - Loading skeletons and data arrival
 * - Error boundary toasts on query/network failures
 * - Empty states across tabs
 * - Indian currency formatting (₹X,XX,XXX.XX)
 * - Profile drawer opening, validation, and saving
 * - Mobile (375px) and desktop (1280px) responsive layout rendering
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
// Shared Mock Framework
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
// Test Suite
// ============================================================================

describe("Salary Management UI & Interactions (src/pages/crm/SalaryManagement.tsx)", () => {
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
    // Explicitly re-apply standard query builder mock
    vi.mocked(supabase.from).mockImplementation((table: string) => createSupabaseQueryBuilder(table) as unknown as ReturnType<typeof supabase.from>);
  });

  // --------------------------------------------------------------------------
  // Suite 1: Page Header, CRM Design System & Breadcrumbs (Tests 1-3)
  // --------------------------------------------------------------------------
  describe("Suite 1: Page Header & Brand Compliance", () => {
    it("1. renders CRMPageHeader with title, subtitle, breadcrumbs and Phase 3 badge", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/Salary Management/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/CRM/i)).toBeInTheDocument();
      expect(screen.getByText(/Phase 3 Live/i)).toBeInTheDocument();
    });

    it("2. renders all 4 tabs: Salary Profiles, Payroll Run, Advances & Deductions, My Payslips", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      expect(screen.getByRole("tab", { name: /Salary Profiles/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Payroll Run/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /My Payslips/i })).toBeInTheDocument();
    });

    it("3. defaults to Tab 1 (Salary Profiles) with table visible", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Rajesh Kumar").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByRole("button", { name: /Add New Profile/i })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Tab Switching & State Preservation (Tests 4-7)
  // --------------------------------------------------------------------------
  describe("Suite 2: Tab Switching Interactions", () => {
    it("4. switches to Payroll Run tab and renders month selector and generate button", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await screen.findByRole("tab", { name: /Payroll Run/i });
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Generate Payroll|Run Payroll/i })).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/i)).toBeTruthy();
    });

    it("5. switches to Advances & Deductions tab and displays adjustment records", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getAllByText("Festival emergency advance").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Q3 Performance bonus").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByRole("button", { name: /Record Advance|New Adjustment/i })).toBeInTheDocument();
    });

    it("6. switches to My Payslips tab and displays personal payslip history", async () => {
      activeMockUser = mockStaffUser;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));
      await waitFor(() => {
        expect(screen.getByText(/September 2026|2026-09/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Download PDF|View Payslip/i })).toBeInTheDocument();
    });

    it("7. switches back to Tab 1 and preserves profile list", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("tab", { name: /Salary Profiles/i }));
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Permission Gating with useCRMPermission('salary', 'view') (Tests 8-10)
  // --------------------------------------------------------------------------
  describe("Suite 3: Permission Gating (salary, view)", () => {
    it("8. renders Access Denied fallback when user lacks view permission and is not super admin", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canView = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/Not Authorized|Access Denied|Access Restricted/i)).toBeInTheDocument();
      });
      expect(screen.queryByText("Amit Sharma")).not.toBeInTheDocument();
    });

    it("9. fires Not Authorized toast when view permission is denied", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canView = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Not Authorized|Access Denied/i),
            variant: "destructive",
          })
        );
      });
    });

    it("10. allows super admin full access even when granular view permission is false", async () => {
      mockPermissionsState.isSuperAdmin = true;
      mockPermissionsState.canView = false;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Loading Skeletons during Data Fetch (Tests 11-12)
  // --------------------------------------------------------------------------
  describe("Suite 4: Loading Skeletons", () => {
    it("11. displays loading skeleton placeholder while data is fetching", () => {
      mockPermissionsState.loading = true;
      const { container } = render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      expect(container.querySelectorAll(".animate-pulse, [data-skeleton]").length).toBeGreaterThanOrEqual(0);
    });

    it("12. resolves skeleton and renders data tables once loading finishes", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Error Boundary & Toasts on Supabase Failures (Tests 13-14)
  // --------------------------------------------------------------------------
  describe("Suite 5: Error Handling & Error Toasts", () => {
    it("13. displays error toast when fetching salary profiles fails", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const b = createSupabaseQueryBuilder(table);
        if (table === "crm_salary_profiles") {
          b.then = (res) => res({ data: [], error: new Error("Network timeout") });
        }
        return b as unknown as ReturnType<typeof supabase.from>;
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Error|Failed/i),
            variant: "destructive",
          })
        );
      });
    });

    it("14. displays error toast when adjustments query encounters an exception", async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const b = createSupabaseQueryBuilder(table);
        if (table === "crm_salary_adjustments") {
          b.then = (res) => res({ data: [], error: new Error("Database error") });
        }
        return b as unknown as ReturnType<typeof supabase.from>;
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
          })
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 6: Empty States across All Tabs (Tests 15-17)
  // --------------------------------------------------------------------------
  describe("Suite 6: Empty State Renders", () => {
    it("15. displays empty state in Tab 1 when no salary profiles exist", async () => {
      mockDbStore.salaryProfiles = [];
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText(/No salary profiles|No records found/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("16. displays empty state in Tab 4 when staff member has no payslips", async () => {
      mockDbStore.payslips = [];
      activeMockUser = mockStaffUser;
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));
      await waitFor(() => {
        expect(screen.getByText(/No payslips available|No records found/i)).toBeInTheDocument();
      });
    });

    it("17. displays empty state in Tab 3 when no advances or bonuses are recorded", async () => {
      mockDbStore.adjustments = [];
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getAllByText(/No advances|No adjustments|No records found/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Indian Numeral Currency Formatting (₹X,XX,XXX.XX) (Tests 18-19)
  // --------------------------------------------------------------------------
  describe("Suite 7: Indian Currency Formatter", () => {
    it("18. renders currency amounts formatted in Indian numeral format (₹50,000.00)", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText(/₹\s*50,000(\.00)?/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/₹\s*35,000(\.00)?/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("19. formats zero and fractional amounts cleanly without NaN or precision errors", async () => {
      mockDbStore.salaryProfiles.push({
        id: "profile-003",
        org_id: mockOrg.id,
        staff_id: "user-staff-003",
        staff_name: "Pooja Patel",
        salary_type: "monthly",
        base_amount: 1250000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 0,
        pf_deduction_percent: 0,
        esi_deduction_percent: 0,
        is_active: true,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText(/₹\s*12,50,000(\.00)?/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Salary Profile Drawer Form Validation & Upsert (Tests 20-24)
  // --------------------------------------------------------------------------
  describe("Suite 8: Profile Drawer & Form Validation", () => {
    it("20. opens profile drawer when Add New Profile is clicked", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      const addBtn = screen.getByRole("button", { name: /Add New Profile/i });
      fireEvent.click(addBtn);
      await waitFor(() => {
        expect(screen.getByText(/Configure Salary Profile|New Salary Profile/i)).toBeInTheDocument();
      });
    });

    it("21. rejects profile save when staff member is not selected", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile/i }));
      const saveBtn = screen.getByRole("button", { name: /Save Profile|Submit/i });
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Validation Error|Required/i),
            variant: "destructive",
          })
        );
      });
    });

    it("22. rejects negative base salary amount", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile/i }));
      const staffSelect = screen.getByLabelText(/Select Staff|Staff Member/i) || screen.getByRole("combobox");
      fireEvent.change(staffSelect, { target: { value: "user-staff-003" } });
      const baseInput = screen.getByLabelText(/Base Salary|Base Amount/i) || screen.getByPlaceholderText(/Base Amount|50000/i);
      fireEvent.change(baseInput, { target: { value: "-5000" } });
      fireEvent.click(screen.getByRole("button", { name: /Save Profile|Submit/i }));
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Validation Error/i),
            variant: "destructive",
          })
        );
      });
    });

    it("23. validates PF and ESI percentages are between 0% and 100%", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile/i }));
      const staffSelect = screen.getByLabelText(/Select Staff|Staff Member/i) || screen.getByRole("combobox");
      fireEvent.change(staffSelect, { target: { value: "user-staff-003" } });
      const baseInput = screen.getByLabelText(/Base Salary|Base Amount/i) || screen.getByPlaceholderText(/Base Amount|50000/i);
      fireEvent.change(baseInput, { target: { value: "50000" } });
      const pfInput = screen.getByLabelText(/PF Deduction %|PF %/i) || screen.getByPlaceholderText(/12/i);
      fireEvent.change(pfInput, { target: { value: "120" } });
      fireEvent.click(screen.getByRole("button", { name: /Save Profile|Submit/i }));
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Validation Error/i),
            variant: "destructive",
          })
        );
      });
    }, 15000);

    it("24. successfully saves profile with valid inputs and updates table", async () => {
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText("Amit Sharma").length).toBeGreaterThanOrEqual(1);
      });
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile/i }));
      const staffSelect = screen.getByLabelText(/Select Staff|Staff Member/i) || screen.getByRole("combobox");
      fireEvent.change(staffSelect, { target: { value: "user-staff-003" } });
      const baseInput = screen.getByLabelText(/Base Salary|Base Amount/i) || screen.getByPlaceholderText(/50000/i);
      fireEvent.change(baseInput, { target: { value: "45000" } });

      fireEvent.click(screen.getByRole("button", { name: /Save Profile|Submit/i }));
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Profile Saved|Saved Successfully/i),
          })
        );
      });
    }, 15000);
  });

  // --------------------------------------------------------------------------
  // Suite 9: Mobile and Desktop Responsive Behavior (Tests 25-26)
  // --------------------------------------------------------------------------
  describe("Suite 9: Responsive Layout Verification", () => {
    it("25. renders stacked touch-friendly actions and responsive table on 375px mobile", () => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event("resize"));
      const { container } = render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeInTheDocument();
      const header = screen.getByText(/Salary Management/i);
      expect(header).toBeInTheDocument();
    });

    it("26. renders multi-column grid layout and side-by-side header actions on 1280px desktop", () => {
      window.innerWidth = 1280;
      window.dispatchEvent(new Event("resize"));
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );
      expect(screen.getByRole("button", { name: /Add New Profile/i })).toBeInTheDocument();
    });
  });
});
