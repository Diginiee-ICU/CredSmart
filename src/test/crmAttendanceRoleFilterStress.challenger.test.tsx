import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Attendance from "@/pages/crm/Attendance";

// ============================================================================
// Mocks Setup
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-crm-role-filter-001",
  name: "CredSmart Role Filter Verification Org",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "admin",
  }),
}));

const mockUser = {
  id: "user-challenger-lead",
  email: "challenger.lead@credsmart.test",
  user_metadata: { full_name: "Challenger Lead" },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
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

describe("EMPIRICAL CHALLENGER: Admin Attendance Role Filter Verification", () => {
  const TODAY = "2026-10-17";
  const YESTERDAY = "2026-10-16";

  const staffProfilesMock = [
    { id: "staff-1", full_name: "Alice Cashier", email: "alice@test.com" },
    { id: "staff-2", full_name: "Bob Manager", email: "bob@test.com" },
    { id: "staff-3", full_name: "Charlie Driver", email: "charlie@test.com" },
    { id: "staff-4", full_name: "Dave General", email: "dave@test.com" },
    { id: "staff-5", full_name: "Eve Cashier", email: "eve@test.com" },
  ];

  const crmRolesMock = [
    { id: "role-cashier", name: "Cashier", color: "#10B981", is_super_admin: false },
    { id: "role-manager", name: "Store Manager", color: "#1D4ED8", is_super_admin: false },
    { id: "role-driver", name: "Delivery Driver", color: "#F59E0B", is_super_admin: false },
  ];

  const staffRolesMock = [
    { staff_id: "staff-1", role_id: "role-cashier" },
    { staff_id: "staff-2", role_id: "role-manager" },
    { staff_id: "staff-3", role_id: "role-driver" },
    // staff-4 has NO assigned role -> will default to "Staff"
    { staff_id: "staff-5", role_id: "role-cashier" },
  ];

  const attendanceRecordsMock = [
    {
      id: "att-1",
      org_id: mockOrg.id,
      staff_id: "staff-1",
      staff_name: "Alice Cashier",
      staff_email: "alice@test.com",
      role: "Cashier",
      date: TODAY,
      clock_in: `${TODAY}T09:00:00Z`,
      clock_out: `${TODAY}T17:00:00Z`,
      status: "present",
      verification_method: "geo_verified",
      is_within_geofence: true,
      work_duration_minutes: 480,
      overtime_minutes: 0,
    },
    {
      id: "att-2",
      org_id: mockOrg.id,
      staff_id: "staff-2",
      staff_name: "Bob Manager",
      staff_email: "bob@test.com",
      role: "Store Manager",
      date: TODAY,
      clock_in: `${TODAY}T08:30:00Z`,
      clock_out: `${TODAY}T18:30:00Z`,
      status: "present",
      verification_method: "geo_verified",
      is_within_geofence: true,
      work_duration_minutes: 600,
      overtime_minutes: 120,
    },
    {
      id: "att-3",
      org_id: mockOrg.id,
      staff_id: "staff-3",
      staff_name: "Charlie Driver",
      staff_email: "charlie@test.com",
      role: "Delivery Driver",
      date: TODAY,
      clock_in: `${TODAY}T10:00:00Z`,
      clock_out: null,
      status: "half_day",
      verification_method: "manual",
      is_within_geofence: false,
      work_duration_minutes: 240,
      overtime_minutes: 0,
    },
    {
      id: "att-4",
      org_id: mockOrg.id,
      staff_id: "staff-4",
      staff_name: "Dave General",
      staff_email: "dave@test.com",
      role: "Staff",
      date: TODAY,
      clock_in: `${TODAY}T09:15:00Z`,
      clock_out: `${TODAY}T17:15:00Z`,
      status: "present",
      verification_method: "geo_verified",
      is_within_geofence: true,
      work_duration_minutes: 480,
      overtime_minutes: 0,
    },
    {
      id: "att-5",
      org_id: mockOrg.id,
      staff_id: "staff-5",
      staff_name: "Eve Cashier",
      staff_email: "eve@test.com",
      role: "Cashier",
      date: TODAY,
      clock_in: `${TODAY}T09:05:00Z`,
      clock_out: `${TODAY}T17:05:00Z`,
      status: "present",
      verification_method: "geo_verified",
      is_within_geofence: true,
      work_duration_minutes: 480,
      overtime_minutes: 0,
    },
    {
      id: "att-6",
      org_id: mockOrg.id,
      staff_id: "staff-1",
      staff_name: "Alice Cashier",
      staff_email: "alice@test.com",
      role: "Cashier",
      date: YESTERDAY,
      clock_in: `${YESTERDAY}T09:00:00Z`,
      clock_out: `${YESTERDAY}T17:00:00Z`,
      status: "present",
      verification_method: "geo_verified",
      is_within_geofence: true,
      work_duration_minutes: 480,
      overtime_minutes: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock localStorage cached data
    localStorage.setItem(
      `credsmart_crm_attendance_${mockOrg.id}`,
      JSON.stringify(attendanceRecordsMock)
    );
    localStorage.setItem(
      `credsmart_crm_roles_${mockOrg.id}`,
      JSON.stringify(crmRolesMock)
    );

    // Mock PointerEvent and Element APIs for Radix UI select
    if (typeof window !== "undefined") {
      class CustomPointerEvent extends Event {
        public pointerId: number;
        constructor(type: string, params: any = {}) {
          super(type, params);
          this.pointerId = params.pointerId || 0;
        }
      }
      window.PointerEvent = CustomPointerEvent as any;
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
  });

  it(
    "1. Empirically verifies multi-role filtering accuracy: Cashier, Store Manager, Delivery Driver, Staff, and All Roles",
    async () => {
    render(
      <MemoryRouter>
        <Attendance />
      </MemoryRouter>
    );

    // Switch to Team Attendance tab
    fireEvent.click(screen.getByText(/Team Attendance/i));

    // Initially, for TODAY, all 5 today records should be displayed
    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.getByText("Bob Manager")).toBeInTheDocument();
      expect(screen.getByText("Charlie Driver")).toBeInTheDocument();
      expect(screen.getByText("Dave General")).toBeInTheDocument();
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
    });

    const roleFilterTrigger = screen.getByTestId("attendance-role-filter");
    expect(roleFilterTrigger).toBeInTheDocument();
    expect(roleFilterTrigger).toHaveTextContent("All Roles");

    // STEP A: Select "Cashier" -> Exactly Alice and Eve should be visible, others hidden
    fireEvent.keyDown(roleFilterTrigger, { key: "ArrowDown", code: "ArrowDown" });
    const cashierOption = await screen.findByRole("option", { name: "Cashier" });
    fireEvent.click(cashierOption);

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
      expect(screen.queryByText("Bob Manager")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Driver")).not.toBeInTheDocument();
      expect(screen.queryByText("Dave General")).not.toBeInTheDocument();
    });

    // STEP B: Select "Store Manager" -> Only Bob Manager should be visible
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const managerOption = await screen.findByRole("option", { name: "Store Manager" });
    fireEvent.click(managerOption);

    await waitFor(() => {
      expect(screen.getByText("Bob Manager")).toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Eve Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Driver")).not.toBeInTheDocument();
      expect(screen.queryByText("Dave General")).not.toBeInTheDocument();
    });

    // STEP C: Select "Delivery Driver" -> Only Charlie Driver should be visible
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const driverOption = await screen.findByRole("option", { name: "Delivery Driver" });
    fireEvent.click(driverOption);

    await waitFor(() => {
      expect(screen.getByText("Charlie Driver")).toBeInTheDocument();
      expect(screen.queryByText("Bob Manager")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Eve Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Dave General")).not.toBeInTheDocument();
    });

    // STEP D: Select "Staff" (default unassigned role) -> Only Dave General should be visible
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const staffOption = await screen.findByRole("option", { name: "Staff" });
    fireEvent.click(staffOption);

    await waitFor(() => {
      expect(screen.getByText("Dave General")).toBeInTheDocument();
      expect(screen.queryByText("Charlie Driver")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Manager")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Eve Cashier")).not.toBeInTheDocument();
    });

    // STEP E: Reset to "All Roles" -> All 5 records should re-appear
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const allRolesOption = await screen.findByRole("option", { name: "All Roles" });
    fireEvent.click(allRolesOption);

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.getByText("Bob Manager")).toBeInTheDocument();
      expect(screen.getByText("Charlie Driver")).toBeInTheDocument();
      expect(screen.getByText("Dave General")).toBeInTheDocument();
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
    });
  }, 30000);

  it("2. Empirically verifies interlocking filters: Role + Status + Date combinations", async () => {
    render(
      <MemoryRouter>
        <Attendance />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Team Attendance/i));

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
    });

    // Filter by status: "half_day"
    const statusSelect = screen.getByRole("combobox", { name: "Filter by status" });
    fireEvent.keyDown(statusSelect, { key: "ArrowDown", code: "ArrowDown" });
    const halfDayOption = await screen.findByRole("option", { name: "Half Day" });
    fireEvent.click(halfDayOption);

    // Only Charlie Driver is half_day for today
    await waitFor(() => {
      expect(screen.getByText("Charlie Driver")).toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Manager")).not.toBeInTheDocument();
    });

    // Now select Role: "Cashier" while status is "half_day" -> should show emptyMessage
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const cashierOption = await screen.findByRole("option", { name: "Cashier" });
    fireEvent.click(cashierOption);

    await waitFor(() => {
      expect(screen.getByText("No attendance records match your filter criteria.")).toBeInTheDocument();
      expect(screen.queryByText("Charlie Driver")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
    });

    // Now switch status back to "All Statuses" -> should show Alice and Eve (the two Cashiers)
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Filter by status" }), { key: "ArrowDown", code: "ArrowDown" });
    const allStatusesOption = await screen.findByRole("option", { name: "All Statuses" });
    fireEvent.click(allStatusesOption);

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
      expect(screen.queryByText("Charlie Driver")).not.toBeInTheDocument();
    });

    // Change date to YESTERDAY -> only Alice Cashier's yesterday record should show
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: YESTERDAY } });

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.queryByText("Eve Cashier")).not.toBeInTheDocument();
    });
  }, 30000);

  it("3. Empirically verifies simultaneous Staff Search and Role Filter", async () => {
    render(
      <MemoryRouter>
        <Attendance />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Team Attendance/i));

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
    });

    // Filter by role: "Cashier" (Alice + Eve)
    fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
    const cashierOption = await screen.findByRole("option", { name: "Cashier" });
    fireEvent.click(cashierOption);

    await waitFor(() => {
      expect(screen.getByText("Alice Cashier")).toBeInTheDocument();
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
    });

    // Type in search filter for "Eve"
    const searchInput = screen.getByPlaceholderText(/Search staff by name or email/i);
    fireEvent.change(searchInput, { target: { value: "eve" } });

    await waitFor(() => {
      expect(screen.getByText("Eve Cashier")).toBeInTheDocument();
      expect(screen.queryByText("Alice Cashier")).not.toBeInTheDocument();
    });

    // Search for a non-cashier "Bob" while role filter is "Cashier" -> 0 matches
    fireEvent.change(searchInput, { target: { value: "bob" } });

    await waitFor(() => {
      expect(screen.getByText("No attendance records match your filter criteria.")).toBeInTheDocument();
      expect(screen.queryByText("Eve Cashier")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Manager")).not.toBeInTheDocument();
    });
  }, 30000);
});
