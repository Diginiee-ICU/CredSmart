import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Attendance from "@/pages/crm/Attendance";
import {
  mockGeolocationPosition,
  resetGeolocationMock,
} from "@/utils/crmGeoUtils";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

// ============================================================================
// Polyfills for Radix UI Select in JSDOM
// ============================================================================
if (typeof window !== "undefined") {
  if (typeof window.PointerEvent === "undefined") {
    class CustomPointerEvent extends MouseEvent {
      public pointerId: number;
      constructor(type: string, params: any = {}) {
        super(type, params);
        this.pointerId = params.pointerId || 0;
      }
    }
    window.PointerEvent = CustomPointerEvent as any;
  }
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = () => {};
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = () => {};
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}

// ============================================================================
// Mocks & Setup
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-crm-rolefilter-stress-001",
  name: "CredSmart Enterprise Stress Test",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "admin",
  }),
}));

const mockUser = {
  id: "user-admin-stress",
  email: "admin@credsmart.test",
  user_metadata: { full_name: "Admin Stress Tester" },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

let mockPermissionsState = {
  isSuperAdmin: true,
  canView: true,
  canEdit: true,
  loading: false,
};

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: (module?: string, action?: string) => ({
    isSuperAdmin: mockPermissionsState.isSuperAdmin,
    loading: mockPermissionsState.loading,
    hasPermission: (_mod: string, act: string) => {
      if (act === "view") return mockPermissionsState.canView;
      if (act === "edit") return mockPermissionsState.canEdit;
      return true;
    },
    allowed:
      mockPermissionsState.isSuperAdmin ||
      (action === "view" ? mockPermissionsState.canView : mockPermissionsState.canEdit),
    userRoles: [],
    permissions: [],
    error: null,
    refreshPermissions: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    setFillColor: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  })),
}));

const createQueryBuilder = () => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (val: any) => void) => {
      resolve({ data: [], error: null });
    },
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
  },
}));

// ============================================================================
// Stress Tests: Role Filtering & Attendance Oversight Edge Cases
// ============================================================================

describe("CRM Attendance Role Filter & Oversight Stress Tests", { timeout: 30000 }, () => {
  const TODAY = new Date().toISOString().split("T")[0];
  const YESTERDAY = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockPermissionsState = {
      isSuperAdmin: true,
      canView: true,
      canEdit: true,
      loading: false,
    };

    mockGeolocationPosition({
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 5,
    });
  });

  afterEach(() => {
    resetGeolocationMock();
  });

  // --------------------------------------------------------------------------
  // Task 1: Undefined/Null roleName defaults to 'Staff'
  // --------------------------------------------------------------------------
  describe("Task 1: Behavior when attendance records have undefined/null roleName", () => {
    it("defaults undefined/null roleName to 'Staff' in the UI and filters correctly", async () => {
      const recordsWithMissingRoles: Partial<CRMAttendanceRecord>[] = [
        {
          id: "att-rec-null-role-1",
          org_id: mockOrg.id,
          staff_id: "staff-no-role-1",
          staff_name: "Unnamed Role Staffer",
          staff_email: "norole@credsmart.test",
          date: TODAY,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          clock_in: `${TODAY}T09:00:00Z`,
          work_duration_minutes: 480,
          // role / role_name undefined
        },
        {
          id: "att-rec-known-role-2",
          org_id: mockOrg.id,
          staff_id: "staff-cashier-2",
          staff_name: "Cashier Person",
          staff_email: "cashier@credsmart.test",
          date: TODAY,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          clock_in: `${TODAY}T09:15:00Z`,
          work_duration_minutes: 465,
          role: "Cashier",
        } as unknown as Partial<CRMAttendanceRecord>,
      ];

      // Provide seeded roles so 'Staff' is explicitly available in dropdown options
      const seededRoles = ["Staff", "Cashier"];
      localStorage.setItem(`credsmart_crm_roles_${mockOrg.id}`, JSON.stringify(seededRoles));
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(recordsWithMissingRoles));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Navigate to Team Attendance tab
      fireEvent.click(screen.getByText(/Team Attendance/i));

      // Both records should be visible initially
      await waitFor(() => {
        expect(screen.getByText("Unnamed Role Staffer")).toBeInTheDocument();
        expect(screen.getByText("Cashier Person")).toBeInTheDocument();
      });

      // The record with undefined role should display "Staff" badge/pill
      const staffBadges = screen.getAllByText("Staff");
      expect(staffBadges.length).toBeGreaterThan(0);

      // Open Role Filter dropdown
      const roleFilterTrigger = screen.getByTestId("attendance-role-filter");
      expect(roleFilterTrigger).toHaveTextContent("All Roles");
      fireEvent.keyDown(roleFilterTrigger, { key: "ArrowDown", code: "ArrowDown" });

      // Select "Staff" role option
      const staffOption = await screen.findByRole("option", { name: "Staff" });
      fireEvent.click(staffOption);

      // Unnamed Role Staffer (defaulted to Staff) must be displayed, while Cashier must be filtered out
      await waitFor(() => {
        expect(screen.getByText("Unnamed Role Staffer")).toBeInTheDocument();
        expect(screen.queryByText("Cashier Person")).not.toBeInTheDocument();
      });

      // Now switch filter to "Cashier"
      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const cashierOption = await screen.findByRole("option", { name: "Cashier" });
      fireEvent.click(cashierOption);

      // Cashier must be visible, Unnamed Role Staffer must be filtered out
      await waitFor(() => {
        expect(screen.getByText("Cashier Person")).toBeInTheDocument();
        expect(screen.queryByText("Unnamed Role Staffer")).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Task 2: Case-insensitive role matching ('cashier' vs 'Cashier' vs 'CASHIER')
  // --------------------------------------------------------------------------
  describe("Task 2: Case-insensitive role matching", () => {
    it("correctly matches records regardless of role casing variations", async () => {
      const recordsWithMixedCasing: Partial<CRMAttendanceRecord>[] = [
        {
          id: "rec-lower",
          org_id: mockOrg.id,
          staff_id: "staff-lower",
          staff_name: "Lower Case Cashier",
          staff_email: "lower@test.com",
          date: TODAY,
          status: "present",
          role: "cashier", // lowercase
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "rec-upper",
          org_id: mockOrg.id,
          staff_id: "staff-upper",
          staff_name: "Upper Case Cashier",
          staff_email: "upper@test.com",
          date: TODAY,
          status: "present",
          role: "CASHIER", // uppercase
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "rec-title",
          org_id: mockOrg.id,
          staff_id: "staff-title",
          staff_name: "Title Case Cashier",
          staff_email: "title@test.com",
          date: TODAY,
          status: "present",
          role: "Cashier", // titlecase
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "rec-other",
          org_id: mockOrg.id,
          staff_id: "staff-other",
          staff_name: "Executive Manager",
          staff_email: "manager@test.com",
          date: TODAY,
          status: "present",
          role: "Manager",
        } as unknown as Partial<CRMAttendanceRecord>,
      ];

      // Provide crm_roles with 'Cashier' and 'Manager'
      const seededRoles = ["Cashier", "Manager"];
      localStorage.setItem(`credsmart_crm_roles_${mockOrg.id}`, JSON.stringify(seededRoles));
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(recordsWithMixedCasing));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Team Attendance/i));

      // All 4 should be visible initially under "All Roles"
      await waitFor(() => {
        expect(screen.getByText("Lower Case Cashier")).toBeInTheDocument();
        expect(screen.getByText("Upper Case Cashier")).toBeInTheDocument();
        expect(screen.getByText("Title Case Cashier")).toBeInTheDocument();
        expect(screen.getByText("Executive Manager")).toBeInTheDocument();
      });

      // Filter by "Cashier"
      const roleFilterTrigger = screen.getByTestId("attendance-role-filter");
      fireEvent.keyDown(roleFilterTrigger, { key: "ArrowDown", code: "ArrowDown" });
      const cashierOption = await screen.findByRole("option", { name: "Cashier" });
      fireEvent.click(cashierOption);

      // Case-insensitivity verification: ALL 3 cashiers (lowercase, uppercase, titlecase) must match!
      await waitFor(() => {
        expect(screen.getByText("Lower Case Cashier")).toBeInTheDocument();
        expect(screen.getByText("Upper Case Cashier")).toBeInTheDocument();
        expect(screen.getByText("Title Case Cashier")).toBeInTheDocument();
        expect(screen.queryByText("Executive Manager")).not.toBeInTheDocument();
      });

      // Filter by "Manager"
      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const managerOption = await screen.findByRole("option", { name: "Manager" });
      fireEvent.click(managerOption);

      // Only Executive Manager must match
      await waitFor(() => {
        expect(screen.getByText("Executive Manager")).toBeInTheDocument();
        expect(screen.queryByText("Lower Case Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Upper Case Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Title Case Cashier")).not.toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Task 3: Combinations of Date Filter + Status Filter + Role Filter
  // --------------------------------------------------------------------------
  describe("Task 3: Simultaneous Date + Status + Role filter combinations", () => {
    it("evaluates strict intersection of Date, Status, and Role filters", async () => {
      const recordsMatrix: Partial<CRMAttendanceRecord>[] = [
        // TODAY records
        {
          id: "m-today-pres-cash",
          org_id: mockOrg.id,
          staff_id: "s-1",
          staff_name: "Alice Present Cashier",
          date: TODAY,
          status: "present",
          role: "Cashier",
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "m-today-abs-cash",
          org_id: mockOrg.id,
          staff_id: "s-2",
          staff_name: "Bob Absent Cashier",
          date: TODAY,
          status: "absent",
          role: "Cashier",
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "m-today-pres-mgr",
          org_id: mockOrg.id,
          staff_id: "s-3",
          staff_name: "Charlie Present Manager",
          date: TODAY,
          status: "present",
          role: "Manager",
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "m-today-half-staff",
          org_id: mockOrg.id,
          staff_id: "s-4",
          staff_name: "Daisy HalfDay Staff",
          date: TODAY,
          status: "half_day",
          // role defaults to Staff
        } as unknown as Partial<CRMAttendanceRecord>,

        // YESTERDAY records
        {
          id: "m-yest-pres-cash",
          org_id: mockOrg.id,
          staff_id: "s-5",
          staff_name: "Evan Yesterday Cashier",
          date: YESTERDAY,
          status: "present",
          role: "Cashier",
        } as unknown as Partial<CRMAttendanceRecord>,
        {
          id: "m-yest-leave-mgr",
          org_id: mockOrg.id,
          staff_id: "s-6",
          staff_name: "Fiona Yesterday OnLeave Manager",
          date: YESTERDAY,
          status: "on_leave",
          role: "Manager",
        } as unknown as Partial<CRMAttendanceRecord>,
      ];

      const seededRoles = ["Staff", "Cashier", "Manager"];
      localStorage.setItem(`credsmart_crm_roles_${mockOrg.id}`, JSON.stringify(seededRoles));
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(recordsMatrix));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Team Attendance/i));

      // Combination A: Date=TODAY (default), Status=all (default), Role=all (default)
      // Expect 4 TODAY records: Alice, Bob, Charlie, Daisy
      await waitFor(() => {
        expect(screen.getByText("Alice Present Cashier")).toBeInTheDocument();
        expect(screen.getByText("Bob Absent Cashier")).toBeInTheDocument();
        expect(screen.getByText("Charlie Present Manager")).toBeInTheDocument();
        expect(screen.getByText("Daisy HalfDay Staff")).toBeInTheDocument();
        // Yesterday's records must NOT be visible
        expect(screen.queryByText("Evan Yesterday Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Fiona Yesterday OnLeave Manager")).not.toBeInTheDocument();
      });

      // Combination B: Date=TODAY, Status=present, Role=Cashier -> Only Alice
      const statusTrigger = screen.getByLabelText("Filter by status");
      fireEvent.keyDown(statusTrigger, { key: "ArrowDown", code: "ArrowDown" });
      const presentOption = await screen.findByRole("option", { name: "Present" });
      fireEvent.click(presentOption);

      const roleTrigger = screen.getByTestId("attendance-role-filter");
      fireEvent.keyDown(roleTrigger, { key: "ArrowDown", code: "ArrowDown" });
      const cashierOption = await screen.findByRole("option", { name: "Cashier" });
      fireEvent.click(cashierOption);

      await waitFor(() => {
        expect(screen.getByText("Alice Present Cashier")).toBeInTheDocument();
        expect(screen.queryByText("Bob Absent Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Charlie Present Manager")).not.toBeInTheDocument();
        expect(screen.queryByText("Daisy HalfDay Staff")).not.toBeInTheDocument();
      });

      // Combination C: Date=TODAY, Status=absent, Role=Cashier -> Only Bob
      fireEvent.keyDown(screen.getByLabelText("Filter by status"), { key: "ArrowDown", code: "ArrowDown" });
      const absentOption = await screen.findByRole("option", { name: "Absent" });
      fireEvent.click(absentOption);

      await waitFor(() => {
        expect(screen.getByText("Bob Absent Cashier")).toBeInTheDocument();
        expect(screen.queryByText("Alice Present Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Charlie Present Manager")).not.toBeInTheDocument();
        expect(screen.queryByText("Daisy HalfDay Staff")).not.toBeInTheDocument();
      });

      // Combination D: Date=TODAY, Status=present, Role=Manager -> Only Charlie
      fireEvent.keyDown(screen.getByLabelText("Filter by status"), { key: "ArrowDown", code: "ArrowDown" });
      const presentOption2 = await screen.findByRole("option", { name: "Present" });
      fireEvent.click(presentOption2);

      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const mgrOption = await screen.findByRole("option", { name: "Manager" });
      fireEvent.click(mgrOption);

      await waitFor(() => {
        expect(screen.getByText("Charlie Present Manager")).toBeInTheDocument();
        expect(screen.queryByText("Alice Present Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Bob Absent Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Daisy HalfDay Staff")).not.toBeInTheDocument();
      });

      // Combination E: Date=TODAY, Status=half_day, Role=Staff -> Only Daisy
      fireEvent.keyDown(screen.getByLabelText("Filter by status"), { key: "ArrowDown", code: "ArrowDown" });
      const halfDayOption = await screen.findByRole("option", { name: "Half Day" });
      fireEvent.click(halfDayOption);

      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const staffOption = await screen.findByRole("option", { name: "Staff" });
      fireEvent.click(staffOption);

      await waitFor(() => {
        expect(screen.getByText("Daisy HalfDay Staff")).toBeInTheDocument();
        expect(screen.queryByText("Alice Present Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Charlie Present Manager")).not.toBeInTheDocument();
      });

      // Combination F: Change Date to YESTERDAY, Status=present, Role=Cashier -> Only Evan
      // Reset Status to Present
      fireEvent.keyDown(screen.getByLabelText("Filter by status"), { key: "ArrowDown", code: "ArrowDown" });
      const presentOption3 = await screen.findByRole("option", { name: "Present" });
      fireEvent.click(presentOption3);

      // Set Role to Cashier
      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const cashierOption2 = await screen.findByRole("option", { name: "Cashier" });
      fireEvent.click(cashierOption2);

      // Change Date Input to YESTERDAY
      const dateInput = screen.getByLabelText("Filter by date");
      fireEvent.change(dateInput, { target: { value: YESTERDAY } });

      await waitFor(() => {
        expect(screen.getByText("Evan Yesterday Cashier")).toBeInTheDocument();
        expect(screen.queryByText("Alice Present Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Bob Absent Cashier")).not.toBeInTheDocument();
        expect(screen.queryByText("Fiona Yesterday OnLeave Manager")).not.toBeInTheDocument();
      });

      // Combination G: Empty match combination (YESTERDAY, Status=absent, Role=Cashier) -> Empty state message
      fireEvent.keyDown(screen.getByLabelText("Filter by status"), { key: "ArrowDown", code: "ArrowDown" });
      const absentOption2 = await screen.findByRole("option", { name: "Absent" });
      fireEvent.click(absentOption2);

      await waitFor(() => {
        expect(screen.getByText("No attendance records match your filter criteria.")).toBeInTheDocument();
        expect(screen.queryByText("Evan Yesterday Cashier")).not.toBeInTheDocument();
      });
    });
  });
});
