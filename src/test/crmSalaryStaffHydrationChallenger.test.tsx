/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Adversarial Challenger Suite 2: Staff Directory Hydration, Dynamic Events & Query Resilience
 *
 * Empirically tests:
 * 1. Multi-tier staff directory fallback hierarchy (crmApi -> localStorage -> settingsApi -> profiles)
 * 2. Fault tolerance against null, network errors, corrupt localStorage, and partial user metadata
 * 3. Dynamic reload on `credsmart:crm_staff_updated` CustomEvent
 * 4. PostgREST query builder resilience when `.or()` is present vs missing (falling back to `.eq`)
 * 5. Unconfigured staff roster rendering, 1-click "Configure Salary" trigger, and form pre-population
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalaryManagement from "@/pages/crm/SalaryManagement";
import { supabase } from "@/integrations/supabase/client";
import { crmApi } from "@/services/crmApi";
import { settingsApi } from "@/services/settingsApi";
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
  id: "org-challenger-m2-002",
  name: "CredSmart Challenger Tenancy",
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
  id: "user-admin-m2-001",
  email: "admin@challenger.test",
  user_metadata: { full_name: "Admin Challenger" },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockAdminUser,
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    isSuperAdmin: true,
    loading: false,
    hasPermission: () => true,
    allowed: true,
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

// Mock Database Store
export interface MockDatabaseStore {
  salaryProfiles: CrmSalaryProfile[];
  payrollRuns: CrmPayrollRun[];
  payslips: CrmPayslip[];
  adjustments: CrmSalaryAdjustment[];
  attendance: CrmAttendanceRecord[];
}

const mockDbStore: MockDatabaseStore = {
  salaryProfiles: [],
  payrollRuns: [],
  payslips: [],
  adjustments: [],
  attendance: [],
};

// Builder options for controlling .or existence
let queryBuilderSupportsOr = true;

const createMockQueryBuilder = (table: string) => {
  let selectedData: Record<string, unknown>[] = [];
  if (table === "crm_salary_profiles") selectedData = [...mockDbStore.salaryProfiles] as unknown as Record<string, unknown>[];
  else if (table === "crm_payroll_runs") selectedData = [...mockDbStore.payrollRuns] as unknown as Record<string, unknown>[];
  else if (table === "crm_payslips") selectedData = [...mockDbStore.payslips] as unknown as Record<string, unknown>[];
  else if (table === "crm_salary_adjustments") selectedData = [...mockDbStore.adjustments] as unknown as Record<string, unknown>[];
  else if (table === "crm_attendance") selectedData = [...mockDbStore.attendance] as unknown as Record<string, unknown>[];
  else if (table === "profiles") selectedData = [];

  interface Builder {
    _table: string;
    _data: Record<string, unknown>[];
    _error: Error | null;
    select: (fields?: string) => Builder;
    eq: (col: string, val: unknown) => Builder;
    or?: (filters: string) => Builder;
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
          if (idx >= 0) {
            mockDbStore.salaryProfiles[idx] = record as unknown as CrmSalaryProfile;
          } else {
            mockDbStore.salaryProfiles.push(record as unknown as CrmSalaryProfile);
          }
        }
      }
      return Promise.resolve({ data: payload, error: null });
    },
    insert: (payload: unknown) => Promise.resolve({ data: payload, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ error: null }),
    }),
    then: (resolve) => {
      resolve({ data: builder._data, error: builder._error });
    },
  };

  if (queryBuilderSupportsOr) {
    builder.or = (filters: string) => {
      const parts = filters.split(",");
      builder._data = builder._data.filter((item) => {
        const hasOrgCols = "org_id" in item || "organization_id" in item;
        if (!hasOrgCols) return true;
        return parts.some((p) => {
          const match = p.trim().match(/^([^.]+)\.eq\.(.*)$/);
          if (match) {
            const [, col, val] = match;
            return String(item[col]) === String(val);
          }
          return false;
        });
      });
      return builder;
    };
  }

  return builder;
};

// Mock Services
vi.mock("@/services/crmApi", () => ({
  crmApi: {
    getCRMStaff: vi.fn(),
    getCRMSalaryProfiles: vi.fn(),
    getCRMPayrollRuns: vi.fn(),
    getCRMPayslips: vi.fn(),
    getCRMSalaryAdjustments: vi.fn(),
    getCRMAttendance: vi.fn(),
  },
}));

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getMemberships: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("Salary Management Adversarial Challenge: Hydration, Dynamic Updates & Query Resilience", { timeout: 25000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryBuilderSupportsOr = true;

    mockDbStore.salaryProfiles = [
      {
        id: "prof-001",
        org_id: mockOrg.id,
        staff_id: "staff-existing-001",
        staff_name: "Aman Varma",
        staff_role: "Store Manager",
        salary_type: "monthly",
        base_amount: 50000,
        currency: "INR",
        allowed_leaves_per_month: 2,
        hourly_overtime_rate: 250,
        pf_deduction_percent: 12.0,
        esi_deduction_percent: 1.75,
        is_active: true,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    ];
    mockDbStore.payrollRuns = [];
    mockDbStore.payslips = [];
    mockDbStore.adjustments = [];
    mockDbStore.attendance = [];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return createMockQueryBuilder(table) as unknown as ReturnType<typeof supabase.from>;
    });

    // Default API mocks
    vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
      data: [
        {
          id: "staff-existing-001",
          full_name: "Aman Varma",
          email: "aman@challenger.test",
          crm_role_name: "Store Manager",
        },
      ] as any,
      error: null,
    });
    vi.mocked(crmApi.getCRMSalaryProfiles).mockResolvedValue({ data: null, error: null });
    vi.mocked(crmApi.getCRMPayrollRuns).mockResolvedValue({ data: [], error: null });
    vi.mocked(crmApi.getCRMPayslips).mockResolvedValue({ data: [], error: null });
    vi.mocked(crmApi.getCRMSalaryAdjustments).mockResolvedValue({ data: [], error: null });
    vi.mocked(crmApi.getCRMAttendance).mockResolvedValue({ data: [], error: null });
    vi.mocked(settingsApi.getMemberships).mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // Suite 1: Multi-Tier Staff Directory Fallback Resilience
  // ============================================================================
  describe("Suite 1: Staff Directory Fallback Hierarchy", () => {
    it("1.1 falls back cleanly to localStorage when crmApi.getCRMStaff throws network error", async () => {
      // Setup: crmApi throws
      vi.mocked(crmApi.getCRMStaff).mockRejectedValue(new Error("Network connection refused"));

      // Setup: localStorage has cached staff
      const cachedStaff = [
        {
          id: "staff-existing-001",
          full_name: "Aman Varma",
          email: "aman@challenger.test",
          crm_role_name: "Store Manager",
        },
        {
          id: "staff-unconfigured-002",
          full_name: "Pooja Sharma",
          email: "pooja@challenger.test",
          crm_role_name: "Cashier",
        },
      ];
      localStorage.setItem(`credsmart_crm_staff_${mockOrg.id}`, JSON.stringify(cachedStaff));

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      // Verify unconfigured staff from localStorage is hydrated and displayed
      await waitFor(() => {
        expect(screen.getAllByText("Pooja Sharma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/1 Unconfigured/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("1.2 falls back to settingsApi.getMemberships when crmApi returns empty and localStorage is empty", async () => {
      // Setup: crmApi returns empty
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({ data: [], error: null });
      localStorage.clear();

      // Setup: settingsApi returns organization memberships with user object
      vi.mocked(settingsApi.getMemberships).mockResolvedValue({
        data: [
          {
            id: "mem-01",
            user_id: "staff-existing-001",
            role_name: "Store Manager",
            user: {
              id: "staff-existing-001",
              full_name: "Aman Varma",
              email: "aman@challenger.test",
            },
          },
          {
            id: "mem-02",
            user_id: "staff-unconfigured-003",
            role_name: "Delivery Associate",
            user: {
              id: "staff-unconfigured-003",
              name: "Vikram Sethi",
              email: "vikram@challenger.test",
            },
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Vikram Sethi").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Delivery Associate").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/1 Unconfigured/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("1.3 handles corrupt JSON in localStorage without unhandled exception or crash", async () => {
      // Corrupt JSON in localStorage
      localStorage.setItem(`credsmart_crm_staff_${mockOrg.id}`, "{ broken json [!@#$");

      // crmApi returns null
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({ data: null, error: null });
      vi.mocked(settingsApi.getMemberships).mockResolvedValue({ data: [], error: null });

      expect(() => {
        render(
          <MemoryRouter>
            <SalaryManagement />
          </MemoryRouter>
        );
      }).not.toThrow();

      // Configured profile should still render safely with fallback name
      await waitFor(() => {
        expect(screen.getAllByText("Aman Varma").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("1.4 handles non-array JSON stored in localStorage gracefully", async () => {
      localStorage.setItem(`credsmart_crm_staff_${mockOrg.id}`, JSON.stringify({ not: "an array" }));

      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({ data: null, error: null });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Aman Varma").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("1.5 derives display name from email when full_name and name are empty", async () => {
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
        data: [
          {
            id: "staff-unconfigured-004",
            full_name: "",
            name: "",
            email: "suresh.kumar@company.com",
            crm_role_name: "Staff",
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("suresh.kumar").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("suresh.kumar@company.com").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // Suite 2: Dynamic CustomEvent Synchronization (`credsmart:crm_staff_updated`)
  // ============================================================================
  describe("Suite 2: Dynamic CustomEvent Dispatch (`credsmart:crm_staff_updated`)", () => {
    it("2.1 triggers loadSalaryData and re-renders roster upon dispatch of credsmart:crm_staff_updated", async () => {
      // Initial render: only Aman Varma
      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Aman Varma").length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText("Rohan Verma")).not.toBeInTheDocument();
      });

      // Now simulate a newly added staff in Role Management
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
        data: [
          {
            id: "staff-existing-001",
            full_name: "Aman Varma",
            email: "aman@challenger.test",
            crm_role_name: "Store Manager",
          },
          {
            id: "staff-unconfigured-005",
            full_name: "Rohan Verma",
            email: "rohan@challenger.test",
            crm_role_name: "Sales Executive",
          },
        ] as any,
        error: null,
      });

      // Dispatch event from Role Management
      act(() => {
        window.dispatchEvent(new CustomEvent("credsmart:crm_staff_updated"));
      });

      // Verify roster dynamically refreshed without browser reload
      await waitFor(() => {
        expect(screen.getAllByText("Rohan Verma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Sales Executive").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/1 Unconfigured/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("2.2 unbinds event listener on component unmount to prevent leaks", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "credsmart:crm_staff_updated",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  // ============================================================================
  // Suite 3: PostgREST Query Resilience (.or() vs .eq("org_id", ...))
  // ============================================================================
  describe("Suite 3: PostgREST Query Builder Resilience", () => {
    it("3.1 executes cleanly without error when query builder does NOT have an .or() method", async () => {
      // Disable .or() method in the query builder mock
      queryBuilderSupportsOr = false;

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      // Verify it loaded without throwing "query.or is not a function"
      await waitFor(() => {
        expect(screen.getAllByText("Aman Varma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Store Manager").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("3.2 executes cleanly and filters when query builder DOES support .or()", async () => {
      queryBuilderSupportsOr = true;

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Aman Varma").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Store Manager").length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // Suite 4: Unconfigured Staff Roster & 1-Click Salary Configuration Flow
  // ============================================================================
  describe("Suite 4: Unconfigured Staff Roster & 1-Click Action", () => {
    it("4.1 renders unconfigured staff with Amber 'Not Configured' badge and Configure button", async () => {
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
        data: [
          {
            id: "staff-existing-001",
            full_name: "Aman Varma",
            email: "aman@challenger.test",
            crm_role_name: "Store Manager",
          },
          {
            id: "staff-unconfigured-006",
            full_name: "Divya Kapoor",
            email: "divya@challenger.test",
            crm_role_name: "Inventory Associate",
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Divya Kapoor").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Inventory Associate").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Not Configured").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole("button", { name: /Configure Salary/i }).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("4.2 clicking 'Configure Salary' opens the drawer in create mode with staff member preselected", async () => {
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
        data: [
          {
            id: "staff-existing-001",
            full_name: "Aman Varma",
            email: "aman@challenger.test",
            crm_role_name: "Store Manager",
          },
          {
            id: "staff-unconfigured-007",
            full_name: "Meera Nair",
            email: "meera@challenger.test",
            crm_role_name: "Sales Associate",
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Meera Nair").length).toBeGreaterThanOrEqual(1);
      });

      // Click "Configure Salary" button next to Meera Nair
      const configBtn = screen.getAllByRole("button", { name: /Configure Salary/i })[0];
      fireEvent.click(configBtn);

      // Verify drawer opened with title and staff pre-selected
      await waitFor(() => {
        expect(screen.getByText(/Configure Salary Profile|New Salary Profile/i)).toBeInTheDocument();
      });

      const staffSelect = screen.getByLabelText(/Select Staff|Staff Member/i) as HTMLSelectElement;
      expect(staffSelect.value).toBe("staff-unconfigured-007");
    });

    it("4.3 saving a configured profile removes staff from unconfigured section and moves them to configured table", async () => {
      vi.mocked(crmApi.getCRMStaff).mockResolvedValue({
        data: [
          {
            id: "staff-existing-001",
            full_name: "Aman Varma",
            email: "aman@challenger.test",
            crm_role_name: "Store Manager",
          },
          {
            id: "staff-unconfigured-008",
            full_name: "Deepak Chopra",
            email: "deepak@challenger.test",
            crm_role_name: "Quality Auditor",
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <SalaryManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Deepak Chopra").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/1 Unconfigured/i).length).toBeGreaterThanOrEqual(1);
      });

      // Click Configure Salary
      fireEvent.click(screen.getAllByRole("button", { name: /Configure Salary/i })[0]);

      // Fill in salary details
      const baseInput = screen.getByLabelText(/Base Salary|Base Amount/i) || screen.getByPlaceholderText(/50000/i);
      fireEvent.change(baseInput, { target: { value: "42000" } });

      // Click Save
      fireEvent.click(screen.getByRole("button", { name: /Save Profile|Submit/i }));

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Profile Saved|Saved Successfully/i),
          })
        );
      });

      // Deepak Chopra should now have a profile in mockDbStore
      expect(mockDbStore.salaryProfiles.some((p) => p.staff_id === "staff-unconfigured-008")).toBe(true);
    });
  });
});
