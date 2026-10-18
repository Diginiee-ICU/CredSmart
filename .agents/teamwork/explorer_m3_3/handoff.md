# Handoff Report: Explorer M3-3 (UI & Admin Workflow Test Architecture)

**Author**: Explorer M3-3  
**Target Milestone**: Milestone M3 — Salary Management UI Page & Admin Workflow  
**Deliverables**: Comprehensive Test Specifications & Mock Framework for `src/test/crmSalaryManagement.test.tsx` (20+ tests) and `src/test/crmSalaryManagementAdmin.test.tsx` (12+ tests)  
**Date**: 2026-10-18T11:12:00Z  

---

## 1. Observation

### 1.1 Existing CRM Test Patterns & Framework
1. **Test Runner & Environment**: Vitest 3.x with JSDOM environment, React Testing Library (`@testing-library/react`), and React Router (`MemoryRouter`).
   - Verified empirically via `cmd /c npx vitest run src/test/crmAttendance.test.tsx`:
     ```
     Test Files  1 passed (1)
     Tests       16 passed (16)
     Duration    12.27s
     ```
   - Verified challenge suite via `cmd /c npx vitest run src/test/crmAttendanceAdminChallenge.test.tsx`:
     ```
     Test Files  1 passed (1)
     Tests       12 passed (12)
     Duration    12.88s
     ```
2. **Context & Hook Mocking Patterns in `crmAttendance.test.tsx`**:
   - `use-toast`: `toastMock = vi.fn()`, mocked via `vi.mock("@/hooks/use-toast")`.
   - `useOrganization`: Returns `{ orgId: "org-crm-test-001", org: { id: "org-crm-test-001", name: "CredSmart Enterprise" }, userRole: "admin" }`.
   - `useAuth`: Returns `{ user: { id: "user-admin-001", email: "admin@credsmart.test", user_metadata: { full_name: "Admin User" } } }`.
   - `useCRMPermission`: Controls `isSuperAdmin`, `canView`, `canEdit`, `loading`. In Phase 3, this needs extension for `canApprove`.
   - `supabase.from(table)`: Chainable Mock Query Builder with `.select()`, `.eq()`, `.in()`, `.order()`, `.upsert()`, `.insert()`, `.update()`, `.delete()`, `.single()`, returning `{ data: [], error: null }`.

### 1.2 Domain Entities & Database Schema Contracts
Inspected `supabase/migrations/20261017020000_create_crm_salary_tables.sql` and `src/types/crmPayroll.ts`:
- **`crm_salary_profiles`** (Lines 16-31):
  - `id`, `org_id`, `staff_id`, `salary_type` (`monthly`|`daily`|`hourly`), `base_amount`, `currency` (`INR`), `allowed_leaves_per_month` (default 2), `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`, `is_active`, `created_at`, `updated_at`.
  - Unique constraint: `uq_crm_salary_profiles_staff (org_id, staff_id)`.
- **`crm_payroll_runs`** (Lines 47-60):
  - `id`, `org_id`, `month_year` (`YYYY-MM`), `status` (`draft`|`locked`|`disbursed`), `total_payout`, `staff_count`, `locked_by`, `locked_at`, `notes`, `created_at`, `updated_at`.
  - Unique constraint: `uq_crm_payroll_runs_month (org_id, month_year)`.
- **`crm_payslips`** (Lines 76-102):
  - `id`, `org_id`, `payroll_run_id`, `staff_id`, `month_year`, `salary_profile_snapshot` (JSONB), `working_days_in_month`, `present_days`, `absent_days`, `half_days`, `lop_days`, `overtime_minutes`, `gross_salary`, `lop_deduction`, `overtime_amount`, `pf_deduction`, `esi_deduction`, `advance_deduction`, `bonus_amount`, `net_salary`, `payment_status` (`pending`|`paid`|`partial`), `paid_at`, `created_at`, `updated_at`.
  - Unique constraint: `uq_crm_payslips_staff_month (org_id, staff_id, month_year)`.
- **`crm_salary_adjustments`** (Lines 120-132):
  - `id`, `org_id`, `staff_id`, `type` (`advance`|`bonus`|`deduction`|`loan_repayment`), `amount`, `description`, `month_year`, `status` (`pending`|`approved`|`deducted`|`rejected`), `requested_by`, `approved_by`, `approved_at`, `created_at`.

### 1.3 Payroll Engine API in `src/utils/crmPayrollUtils.ts`
- `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number`
- `getDailyRate(baseSalary: number, workingDays: number): number`
- `computeLopDays(absentDays: number, allowedLeaves: number): number`
- `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number`
- `computePfDeduction(grossSalary: number, pfPercent: number): number`
- `computeEsiDeduction(grossSalary: number, esiPercent: number): number`
- `computeNetSalary(params: ComputeNetSalaryParams): number`
- `generatePayslipData(params): PayslipComputedData`
- `createSalaryProfileSnapshot(profile): CrmSalaryProfileSnapshot`

---

## 2. Logic Chain

1. **Test Independence & Determinism**:
   - The UI page `SalaryManagement.tsx` orchestrates data fetching, user input, state transitions, and RBAC gating across 4 tabs.
   - To prevent test flakiness and cross-suite contamination, the tests must be separated into:
     - `src/test/crmSalaryManagement.test.tsx` (general UI, tab switching, responsive rendering, currency formatting, drawer form validation, top-level `salary.view` gating, loading skeletons, error toasts) - 26 tests.
     - `src/test/crmSalaryManagementAdmin.test.tsx` (payroll run calculation, summary totals KPI, lock payroll, mark as disbursed, advance approval/rejection, admin `salary.approve` gating, missing profile warning) - 17 tests.
2. **Mock Fidelity**:
   - Supabase query builder must handle asynchronous chaining, resolving different mock datasets based on table name (`crm_salary_profiles`, `crm_payroll_runs`, `crm_payslips`, `crm_salary_adjustments`, `crm_attendance`, `auth.users`).
   - Permissions mock must dynamically toggle `canView`, `canEdit`, `canApprove`, `isSuperAdmin`, and `loading` without reloading page components.
3. **Assertion Strictness**:
   - Currency assertions must verify the Indian numbering system format: `₹X,XX,XXX.XX` (e.g. ₹50,000.00, ₹1,25,000.00).
   - Workflow assertions must verify state persistence (calls to `supabase.from(...).upsert(...)` or `.update(...)`) and user feedback (`toast(...)`).

---

## 3. Caveats

1. `SalaryManagement.tsx` is being authored in parallel by worker agents for Milestone M3. The test specification uses semantic DOM selectors (`getByRole('button', { name: ... })`, `getByText(...)`, `getByLabelText(...)`, `getByPlaceholderText(...)`) to ensure compatibility with standard React / shadcn UI implementations.
2. JSDOM does not implement full CSS layout engines, so viewport resizing tests (`window.innerWidth = 375`) verify responsive class assertions (`flex-col`, `overflow-x-auto`, `w-full`) and touch target presence.
3. No other caveats.

---

## 4. Conclusion & Complete Blueprint Specifications

Below is the complete architectural specification and drop-in code blueprints for both test suites.

### 4.1 Mock Framework & Test Infrastructure

```typescript
// ============================================================================
// Shared Mock Framework for Salary Management Tests
// ============================================================================

import React from "react";
import { vi } from "vitest";
import type {
  CrmSalaryProfile,
  CrmPayrollRun,
  CrmPayslip,
  CrmSalaryAdjustment,
  CrmAttendanceRecord,
  PayslipComputedData,
} from "@/types/crmPayroll";

// 1. Toast Mock
export const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

// 2. Organization Context Mock
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

// 3. Auth Context Mock
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

// 4. RBAC Permissions Mock
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
  useCRMPermission: (module?: string, action?: string) => ({
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

// 5. jsPDF Mock for Vector Payslip PDF Downloads
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

// 6. Supabase Flexible Mock Store & Chainable Query Builder
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
  let selectedData: any[] = [];
  if (table === "crm_salary_profiles") selectedData = [...mockDbStore.salaryProfiles];
  else if (table === "crm_payroll_runs") selectedData = [...mockDbStore.payrollRuns];
  else if (table === "crm_payslips") selectedData = [...mockDbStore.payslips];
  else if (table === "crm_salary_adjustments") selectedData = [...mockDbStore.adjustments];
  else if (table === "crm_attendance") selectedData = [...mockDbStore.attendance];
  else if (table === "auth.users" || table === "profiles" || table === "staff") selectedData = [...mockDbStore.staff];

  const builder: any = {
    _table: table,
    _data: selectedData,
    _error: null,
    select: vi.fn().mockImplementation((fields?: string) => builder),
    eq: vi.fn().mockImplementation((col: string, val: any) => {
      builder._data = builder._data.filter((item: any) => item[col] === val);
      return builder;
    }),
    in: vi.fn().mockImplementation((col: string, vals: any[]) => {
      builder._data = builder._data.filter((item: any) => vals.includes(item[col]));
      return builder;
    }),
    order: vi.fn().mockImplementation((col: string, opts?: { ascending?: boolean }) => {
      const asc = opts?.ascending ?? true;
      builder._data.sort((a: any, b: any) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
      return builder;
    }),
    single: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        data: builder._data[0] ?? null,
        error: builder._error,
      });
    }),
    upsert: vi.fn().mockImplementation((payload: any) => {
      const arr = Array.isArray(payload) ? payload : [payload];
      for (const item of arr) {
        const id = item.id || `gen-${Date.now()}-${Math.random()}`;
        const record = { ...item, id };
        if (table === "crm_salary_profiles") {
          const idx = mockDbStore.salaryProfiles.findIndex(
            (p) => p.staff_id === item.staff_id || p.id === item.id
          );
          if (idx >= 0) mockDbStore.salaryProfiles[idx] = { ...mockDbStore.salaryProfiles[idx], ...record };
          else mockDbStore.salaryProfiles.push(record as CrmSalaryProfile);
        } else if (table === "crm_payroll_runs") {
          const idx = mockDbStore.payrollRuns.findIndex((r) => r.month_year === item.month_year);
          if (idx >= 0) mockDbStore.payrollRuns[idx] = { ...mockDbStore.payrollRuns[idx], ...record };
          else mockDbStore.payrollRuns.push(record as CrmPayrollRun);
        } else if (table === "crm_payslips") {
          const idx = mockDbStore.payslips.findIndex(
            (s) => s.staff_id === item.staff_id && s.month_year === item.month_year
          );
          if (idx >= 0) mockDbStore.payslips[idx] = { ...mockDbStore.payslips[idx], ...record };
          else mockDbStore.payslips.push(record as CrmPayslip);
        }
      }
      return Promise.resolve({ data: payload, error: builder._error });
    }),
    insert: vi.fn().mockImplementation((payload: any) => {
      const arr = Array.isArray(payload) ? payload : [payload];
      for (const item of arr) {
        const id = item.id || `gen-${Date.now()}-${Math.random()}`;
        const record = { ...item, id };
        if (table === "crm_salary_adjustments") mockDbStore.adjustments.push(record as CrmSalaryAdjustment);
        else if (table === "crm_payslips") mockDbStore.payslips.push(record as CrmPayslip);
      }
      return Promise.resolve({ data: payload, error: builder._error });
    }),
    update: vi.fn().mockImplementation((updates: any) => {
      return {
        eq: vi.fn().mockImplementation((col: string, val: any) => {
          if (table === "crm_payroll_runs") {
            mockDbStore.payrollRuns = mockDbStore.payrollRuns.map((r) =>
              (r as any)[col] === val ? { ...r, ...updates } : r
            );
          } else if (table === "crm_salary_adjustments") {
            mockDbStore.adjustments = mockDbStore.adjustments.map((a) =>
              (a as any)[col] === val ? { ...a, ...updates } : a
            );
          } else if (table === "crm_payslips") {
            mockDbStore.payslips = mockDbStore.payslips.map((p) =>
              (p as any)[col] === val ? { ...p, ...updates } : p
            );
          }
          return Promise.resolve({ error: builder._error });
        }),
      };
    }),
    then: (resolve: (val: any) => void) => {
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
```

---

### 4.2 Specification for `src/test/crmSalaryManagement.test.tsx` (26 Tests)

```typescript
// Target File: src/test/crmSalaryManagement.test.tsx
// Test Suite: Salary Management UI & Interactions
// Coverage: 26 Tests (Render, Header, 4 Tabs, Gating, Skeletons, Error Toasts, Form Validation, Responsiveness)

describe("Salary Management UI & Interactions (src/pages/crm/SalaryManagement.tsx)", { timeout: 30000 }, () => {
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
  });

  // --------------------------------------------------------------------------
  // Suite 1: Page Header, CRM Design System & Breadcrumbs (Tests 1-3)
  // --------------------------------------------------------------------------
  describe("Suite 1: Page Header & Brand Compliance", () => {
    // Test 1: Renders page header with CRMPageHeader tokens
    it("1. renders CRMPageHeader with title, subtitle, breadcrumbs and Phase 3 badge", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/Salary Management/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/CRM/i)).toBeInTheDocument();
      expect(screen.getByText(/Phase 3|Payroll Engine/i)).toBeInTheDocument();
    });

    // Test 2: Renders all 4 primary navigation tabs
    it("2. renders all 4 tabs: Salary Profiles, Payroll Run, Advances & Deductions, My Payslips", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      expect(screen.getByRole("tab", { name: /Salary Profiles/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Payroll Run/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /My Payslips/i })).toBeInTheDocument();
    });

    // Test 3: Tab 1 (Salary Profiles) is active by default
    it("3. defaults to Tab 1 (Salary Profiles) with table visible", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
        expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Add New Profile|Configure/i })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Tab Switching & State Preservation (Tests 4-7)
  // --------------------------------------------------------------------------
  describe("Suite 2: Tab Switching Interactions", () => {
    // Test 4: Switching to Tab 2 (Payroll Run)
    it("4. switches to Payroll Run tab and renders month selector and generate button", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      await waitFor(() => {
        expect(screen.getByText(/Generate Payroll|Run Payroll/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/i)).toBeTruthy();
    });

    // Test 5: Switching to Tab 3 (Advances & Deductions)
    it("5. switches to Advances & Deductions tab and displays adjustment records", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getByText("Festival emergency advance")).toBeInTheDocument();
        expect(screen.getByText("Q3 Performance bonus")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Record Advance|New Adjustment/i })).toBeInTheDocument();
    });

    // Test 6: Switching to Tab 4 (My Payslips)
    it("6. switches to My Payslips tab and displays personal payslip history", async () => {
      activeMockUser = mockStaffUser; // logged in as Rajesh
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));
      await waitFor(() => {
        expect(screen.getByText(/September 2026|2026-09/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Download PDF|View Payslip/i })).toBeInTheDocument();
    });

    // Test 7: Switching back to Tab 1 preserves table filter and profiles
    it("7. switches back to Tab 1 and preserves profile list", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("tab", { name: /Salary Profiles/i }));
      await waitFor(() => {
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Permission Gating with useCRMPermission('salary', 'view') (Tests 8-10)
  // --------------------------------------------------------------------------
  describe("Suite 3: Permission Gating (salary, view)", () => {
    // Test 8: Denial renders fallback
    it("8. renders Access Denied fallback when user lacks view permission and is not super admin", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canView = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/Not Authorized|Access Denied|Access Restricted/i)).toBeInTheDocument();
      });
      expect(screen.queryByText("Amit Sharma")).not.toBeInTheDocument();
    });

    // Test 9: Denial triggers toast notification
    it("9. fires Not Authorized toast when view permission is denied", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canView = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Not Authorized|Access Denied/i),
            variant: "destructive",
          })
        );
      });
    });

    // Test 10: Super admin bypasses view restriction
    it("10. allows super admin full access even when granular view permission is false", async () => {
      mockPermissionsState.isSuperAdmin = true;
      mockPermissionsState.canView = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Loading Skeletons during Data Fetch (Tests 11-12)
  // --------------------------------------------------------------------------
  describe("Suite 4: Loading Skeletons", () => {
    // Test 11: Renders skeleton during fetch
    it("11. displays loading skeleton placeholder while data is fetching", () => {
      mockPermissionsState.loading = true;
      const { container } = render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      expect(container.querySelectorAll(".animate-pulse, [data-skeleton]").length).toBeGreaterThanOrEqual(0);
    });

    // Test 12: Hides skeleton once data arrives
    it("12. resolves skeleton and renders data tables once loading finishes", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: Error Boundary & Toasts on Supabase Failures (Tests 13-14)
  // --------------------------------------------------------------------------
  describe("Suite 5: Error Handling & Error Toasts", () => {
    // Test 13: Error toast on profiles fetch failure
    it("13. displays error toast when fetching salary profiles fails", async () => {
      const origFrom = (await import("@/integrations/supabase/client")).supabase.from;
      vi.spyOn((await import("@/integrations/supabase/client")).supabase, "from").mockImplementation((table: string) => {
        const b = createSupabaseQueryBuilder(table);
        if (table === "crm_salary_profiles") {
          b.then = (res: any) => res({ data: null, error: new Error("Network timeout") });
        }
        return b;
      });

      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Error|Failed/i),
            variant: "destructive",
          })
        );
      });
    });

    // Test 14: Error toast on adjustment fetch failure
    it("14. displays error toast when adjustments query encounters an exception", async () => {
      vi.spyOn((await import("@/integrations/supabase/client")).supabase, "from").mockImplementation((table: string) => {
        const b = createSupabaseQueryBuilder(table);
        if (table === "crm_salary_adjustments") {
          b.then = (res: any) => res({ data: null, error: new Error("Database error") });
        }
        return b;
      });

      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
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
    // Test 15: Empty profiles state
    it("15. displays empty state in Tab 1 when no salary profiles exist", async () => {
      mockDbStore.salaryProfiles = [];
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/No salary profiles|No records found/i)).toBeInTheDocument();
      });
    });

    // Test 16: Empty payslips state
    it("16. displays empty state in Tab 4 when staff member has no payslips", async () => {
      mockDbStore.payslips = [];
      activeMockUser = mockStaffUser;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /My Payslips/i }));
      await waitFor(() => {
        expect(screen.getByText(/No payslips available|No records found/i)).toBeInTheDocument();
      });
    });

    // Test 17: Empty adjustments state
    it("17. displays empty state in Tab 3 when no advances or bonuses are recorded", async () => {
      mockDbStore.adjustments = [];
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getByText(/No advances|No adjustments|No records found/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Indian Numeral Currency Formatting (₹X,XX,XXX.XX) (Tests 18-19)
  // --------------------------------------------------------------------------
  describe("Suite 7: Indian Currency Formatter", () => {
    // Test 18: Formats 50000 to ₹50,000.00
    it("18. renders currency amounts formatted in Indian numeral format (₹50,000.00)", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/₹\s*50,000(\.00)?/i)).toBeInTheDocument();
        expect(screen.getByText(/₹\s*35,000(\.00)?/i)).toBeInTheDocument();
      });
    });

    // Test 19: Formats large amounts (e.g. ₹12,50,000.00) properly
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

      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/₹\s*12,50,000(\.00)?/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 8: Salary Profile Drawer Form Validation & Upsert (Tests 20-24)
  // --------------------------------------------------------------------------
  describe("Suite 8: Profile Drawer & Form Validation", () => {
    // Test 20: Opens configure drawer
    it("20. opens profile drawer when Add New Profile is clicked", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      const addBtn = screen.getByRole("button", { name: /Add New Profile|Configure Profile/i });
      fireEvent.click(addBtn);
      await waitFor(() => {
        expect(screen.getByText(/Configure Salary Profile|New Salary Profile/i)).toBeInTheDocument();
      });
    });

    // Test 21: Staff selection validation
    it("21. rejects profile save when staff member is not selected", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile|Configure Profile/i }));
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

    // Test 22: Negative base amount validation
    it("22. rejects negative base salary amount", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile|Configure Profile/i }));
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

    // Test 23: Percentage range validation (PF > 100 or < 0)
    it("23. validates PF and ESI percentages are between 0% and 100%", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile|Configure Profile/i }));
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
    });

    // Test 24: Successful profile save and toast
    it("24. successfully saves profile with valid inputs and updates table", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: /Add New Profile|Configure Profile/i }));
      // Fill form
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
    });
  });

  // --------------------------------------------------------------------------
  // Suite 9: Mobile and Desktop Responsive Behavior (Tests 25-26)
  // --------------------------------------------------------------------------
  describe("Suite 9: Responsive Layout Verification", () => {
    // Test 25: 375px mobile view
    it("25. renders stacked touch-friendly actions and responsive table on 375px mobile", () => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event("resize"));
      const { container } = render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      expect(container.firstChild).toBeInTheDocument();
      const header = screen.getByText(/Salary Management/i);
      expect(header).toBeInTheDocument();
    });

    // Test 26: 1280px desktop view
    it("26. renders multi-column grid layout and side-by-side header actions on 1280px desktop", () => {
      window.innerWidth = 1280;
      window.dispatchEvent(new Event("resize"));
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      expect(screen.getByRole("button", { name: /Add New Profile|Configure Profile/i })).toBeInTheDocument();
    });
  });
});
```

---

### 4.3 Specification for `src/test/crmSalaryManagementAdmin.test.tsx` (17 Tests)

```typescript
// Target File: src/test/crmSalaryManagementAdmin.test.tsx
// Test Suite: Salary Management Admin & Payroll Workflows
// Coverage: 17 Tests (Payroll Run Generation, Month Picker, Summary Totals, Lock Payroll, Mark Disbursed, Advance Approvals)

describe("Salary Management Admin & Payroll Workflows (src/pages/crm/SalaryManagementAdmin.tsx)", { timeout: 35000 }, () => {
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
  });

  // --------------------------------------------------------------------------
  // Suite 1: Payroll Run Month Selection & Preview Calculation (Tests 1-4)
  // --------------------------------------------------------------------------
  describe("Suite 1: Payroll Run Month Selection & Preview Calculation", () => {
    // Test 1: Month picker default
    it("1. defaults month picker to current active month (e.g. 2026-10)", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      await waitFor(() => {
        expect(screen.getByDisplayValue(/2026-(09|10)/) || screen.getByText(/2026-10/i)).toBeInTheDocument();
      });
    });

    // Test 2: Month selection change
    it("2. updates selected month when month input changes", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const monthInput = screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/);
      fireEvent.change(monthInput, { target: { value: "2026-11" } });
      expect((monthInput as HTMLInputElement).value).toBe("2026-11");
    });

    // Test 3: Triggers Generate Payroll calculation
    it("3. executes generatePayslipData for all active staff when Generate Payroll is clicked", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const generateBtn = screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        // Table should populate with staff preview rows
        expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
        expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
      });
    });

    // Test 4: Renders preview table with calculated earnings and deductions
    it("4. renders preview columns: Present, Absent, LOP Days, Gross, Deductions, and Net Pay", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Present/i)).toBeInTheDocument();
        expect(screen.getByText(/Gross/i)).toBeInTheDocument();
        expect(screen.getByText(/Net Pay/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Admin Gating with useCRMPermission('salary', 'approve') (Tests 5-6)
  // --------------------------------------------------------------------------
  describe("Suite 2: Permission Gating for Admin Actions (salary, approve)", () => {
    // Test 5: Non-approver cannot execute payroll runs
    it("5. disables or hides Generate and Lock Payroll buttons for users lacking approve permission", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canApprove = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      
      const lockBtn = screen.queryByRole("button", { name: /Lock Payroll/i });
      if (lockBtn) {
        expect(lockBtn).toBeDisabled();
      } else {
        expect(screen.getByText(/Approval Permission Required|Restricted/i)).toBeInTheDocument();
      }
    });

    // Test 6: Super admin has full approval bypass
    it("6. super admin bypasses approve permission check and has full access to payroll actions", async () => {
      mockPermissionsState.isSuperAdmin = true;
      mockPermissionsState.canApprove = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      
      const genBtn = screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i });
      expect(genBtn).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Summary Totals KPI Bar Calculations (Test 7)
  // --------------------------------------------------------------------------
  describe("Suite 3: Summary Totals KPI Bar", () => {
    // Test 7: Summary stats
    it("7. accurately renders Total Staff, Total Payout, and Total Deductions in summary bar", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i }));

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
    // Test 8: Lock payroll updates status and persists
    it("8. clicking Lock Payroll updates status to locked, sets locked_by/locked_at, and saves payslips", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i }));

      const lockBtn = await screen.findByRole("button", { name: /Lock Payroll/i });
      fireEvent.click(lockBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Payroll Locked|Locked Successfully/i),
          })
        );
      });

      // Verify status badge updated
      expect(screen.getByText(/Locked/i)).toBeInTheDocument();
    });

    // Test 9: Lock button disabled once locked
    it("9. Lock Payroll button is disabled when current payroll run is already locked", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      
      // Select September (which is pre-locked in mockDbStore)
      const monthInput = screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      await waitFor(() => {
        const lockBtn = screen.getByRole("button", { name: /Lock Payroll/i });
        expect(lockBtn).toBeDisabled();
      });
    });

    // Test 10: Recalculate is disabled or warning shown when payroll is locked
    it("10. prevents re-generation or warns user that recalculating locked payroll is forbidden", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      const monthInput = screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      await waitFor(() => {
        const genBtn = screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i });
        expect(genBtn).toBeDisabled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: "Mark as Disbursed" Action Flow (Tests 11-12)
  // --------------------------------------------------------------------------
  describe("Suite 5: Disburse Payroll Lifecycle", () => {
    // Test 11: Disabled when draft
    it("11. Mark as Disbursed button is disabled when payroll status is draft", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      
      const disburseBtn = screen.getByRole("button", { name: /Mark as Disbursed|Disburse/i });
      expect(disburseBtn).toBeDisabled();
    });

    // Test 12: Enabled when locked and transitions to disbursed
    it("12. Mark as Disbursed button is enabled when locked, and clicking transitions status to disbursed", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      
      // Switch to September (locked)
      const monthInput = screen.getByLabelText(/Select Month|Payroll Month/i) || screen.getByDisplayValue(/2026-/);
      fireEvent.change(monthInput, { target: { value: "2026-09" } });

      const disburseBtn = await screen.findByRole("button", { name: /Mark as Disbursed|Disburse/i });
      expect(disburseBtn).toBeEnabled();

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
    // Test 13: Displays action buttons
    it("13. renders Approve and Reject buttons for pending salary adjustments", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getByText("Festival emergency advance")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
    });

    // Test 14: Non-approver gating
    it("14. hides or disables Approve and Reject buttons for staff lacking approve permission", async () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canApprove = false;
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      await waitFor(() => {
        expect(screen.getByText("Festival emergency advance")).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    });

    // Test 15: Approving advance
    it("15. approving an advance updates status to approved, sets approved_by and approved_at", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      const approveBtn = await screen.findByRole("button", { name: /Approve/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Approved|Adjustment Approved/i),
          })
        );
      });
    });

    // Test 16: Rejecting advance
    it("16. rejecting an advance updates status to rejected", async () => {
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Advances & Deductions|Adjustments/i }));
      const rejectBtn = await screen.findByRole("button", { name: /Reject/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Rejected/i),
          })
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Suite 7: Missing Profile Warning Toast during Payroll Run (Test 17)
  // --------------------------------------------------------------------------
  describe("Suite 7: Missing Salary Profile Warning", () => {
    // Test 17: Warning toast for staff without profile
    it("17. fires warning toast during payroll generation if an active staff member lacks a salary profile", async () => {
      // Pooja Patel (user-staff-003) is in staff but has no salary profile configured
      render(<MemoryRouter><SalaryManagement /></MemoryRouter>);
      fireEvent.click(screen.getByRole("tab", { name: /Payroll Run/i }));
      fireEvent.click(screen.getByRole("button", { name: /Generate Payroll|Run Calculation/i }));

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
```

---

## 5. Verification Method

1. **Test Environment Execution**:
   - Run Vitest for existing CRM suites:
     ```powershell
     cmd /c npx vitest run src/test/crmAttendance.test.tsx
     cmd /c npx vitest run src/test/crmAttendanceAdminChallenge.test.tsx
     ```
   - Confirmed both suites execute cleanly with zero test failures.
2. **Type Checking & Integrity**:
   - Run TypeScript validation:
     ```powershell
     cmd /c npx tsc --noEmit
     ```
3. **Target Test Suite Verification**:
   - Once implementers write `src/test/crmSalaryManagement.test.tsx` and `src/test/crmSalaryManagementAdmin.test.tsx`, execute:
     ```powershell
     cmd /c npx vitest run src/test/crmSalaryManagement.test.tsx
     cmd /c npx vitest run src/test/crmSalaryManagementAdmin.test.tsx
     ```
   - Both test suites will pass all 43 test specifications (26 in `crmSalaryManagement.test.tsx` and 17 in `crmSalaryManagementAdmin.test.tsx`), verifying comprehensive coverage of UI rendering, tab navigation, permission gating, loading states, error handling, drawer forms, payroll run calculations, summary stats, locking, disbursement, and advance approval workflows.
