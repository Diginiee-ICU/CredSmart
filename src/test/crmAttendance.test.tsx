import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Attendance from "@/pages/crm/Attendance";
import {
  mockGeolocationPosition,
  mockGeolocationError,
  resetGeolocationMock,
} from "@/utils/crmGeoUtils";

// ============================================================================
// Mocks
// ============================================================================

// 1. Mock Toast
const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

// 2. Mock Organization Context
const mockOrg = {
  id: "org-crm-test-001",
  name: "CredSmart Enterprise",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "admin",
  }),
}));

// 3. Mock Auth Context
const mockUser = {
  id: "user-staff-001",
  email: "staff@credsmart.test",
  user_metadata: { full_name: "Staff Tester" },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// 4. Mock CRM Permissions
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

// 5. Mock jsPDF
const createMockJsPdf = () => ({
  setFillColor: vi.fn().mockReturnThis(),
  rect: vi.fn().mockReturnThis(),
  roundedRect: vi.fn().mockReturnThis(),
  setTextColor: vi.fn().mockReturnThis(),
  setFontSize: vi.fn().mockReturnThis(),
  setFont: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  save: vi.fn(),
  addPage: vi.fn().mockReturnThis(),
  setDrawColor: vi.fn().mockReturnThis(),
  line: vi.fn().mockReturnThis(),
  setPage: vi.fn().mockReturnThis(),
  getNumberOfPages: vi.fn().mockReturnValue(1),
  output: vi.fn().mockReturnValue(new Blob(["mock-pdf"], { type: "application/pdf" })),
});

vi.mock("jspdf", () => {
  const MockConstructor = vi.fn().mockImplementation(() => createMockJsPdf());
  return {
    default: MockConstructor,
    jsPDF: MockConstructor,
  };
});

// 6. Flexible Chainable Mock for Supabase
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
// Test Suites
// ============================================================================

describe("Attendance UI & Clock-In Hub (src/pages/crm/Attendance.tsx)", { timeout: 25000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockPermissionsState = {
      isSuperAdmin: true,
      canView: true,
      canEdit: true,
      loading: false,
    };

    // Default mock GPS coordinates near New Delhi HQ (28.6139, 77.2090)
    mockGeolocationPosition({
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 5,
    });
  });

  afterEach(() => {
    resetGeolocationMock();
  });

  describe("1. Rendering & CRM Design System Compliance", () => {
    it("renders CRMPageHeader with title, subtitle, breadcrumbs and Phase 2 badge", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Attendance & Geolocation Hub")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/GPS geofence verified staff clock-in/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Phase 2 Live")).toBeInTheDocument();
      expect(screen.getByText("Attendance")).toBeInTheDocument();
    });

    it("renders all 4 summary KPI stat cards", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      expect(screen.getByText("Present Today")).toBeInTheDocument();
      expect(screen.getByText("Geo-Verified")).toBeInTheDocument();
      expect(screen.getByText("Manual / Regularised")).toBeInTheDocument();
      expect(screen.getByText("Office Geofences")).toBeInTheDocument();
    });

    it("renders responsive tab switcher with My Clock-In, Team Attendance, Office Locations, and Regularisation", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      expect(screen.getByText("My Clock-In Hub")).toBeInTheDocument();
      expect(screen.getByText(/Team Attendance/i)).toBeInTheDocument();
      expect(screen.getByText(/Office Locations/i)).toBeInTheDocument();
      expect(screen.getByText(/Regularisation/i)).toBeInTheDocument();
    });
  });

  describe("2. Staff Pod & Live Clock Display", () => {
    it("displays live digital clock, shift target, and GPS status indicator", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      expect(screen.getByText("Today's Shift")).toBeInTheDocument();
      expect(screen.getByText("Current Time")).toBeInTheDocument();
      expect(screen.getByText(/General Shift • 09:00 AM - 06:00 PM/i)).toBeInTheDocument();

      // Since default coords match default HQ (28.6139, 77.2090), within geofence is expected
      await waitFor(() => {
        expect(screen.getByText("Within Geofence ✓")).toBeInTheDocument();
      });
    });

    it("displays Outside Geofence warning badge when user is outside geofence boundary", async () => {
      // Mock coordinates far away in Mumbai (19.0760, 72.8777)
      mockGeolocationPosition({
        latitude: 19.0760,
        longitude: 72.8777,
        accuracy: 10,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Outside Geofence ⚠️")).toBeInTheDocument();
      });
    });

    it("renders Clock In Now button with emerald styling when user is not clocked in", () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      expect(clockInBtn).toBeInTheDocument();
      expect(clockInBtn.className).toContain("bg-emerald-600");
    });
  });

  describe("3. Clock-In Workflow & State Persistence", () => {
    it("successfully clocks in, captures GPS, and transitions to Clock Out state", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Within Geofence ✓")).toBeInTheDocument();
      });

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      await waitFor(() => {
        // Ticking session timer should appear
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
        // Clock Out button in orange styling should be displayed
        const clockOutBtn = screen.getByRole("button", { name: /Clock Out/i });
        expect(clockOutBtn).toBeInTheDocument();
        expect(clockOutBtn.className).toContain("bg-[#FF6A00]");
      });

      // Verify success toast was triggered
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked In Successfully/i),
        })
      );
    });

    it("captures outside geofence verification method as manual when clocking in from afar", async () => {
      // Coordinates in Bangalore
      mockGeolocationPosition({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 15,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Clocked In \(Outside Geofence\)/i),
          })
        );
      });
    });
  });

  describe("4. Clock-Out Workflow & Duration Calculation", () => {
    it("successfully clocks out, calculates duration, and marks shift completed", async () => {
      // Pre-seed an active clock-in record in localStorage for today
      const todayStr = new Date().toISOString().split("T")[0];
      const earlierTime = new Date(Date.now() - 3600 * 1000 * 4).toISOString(); // 4 hours ago

      const seedRecord = [
        {
          id: "att-test-active",
          org_id: mockOrg.id,
          staff_id: mockUser.id,
          staff_name: "Staff Tester",
          date: todayStr,
          clock_in: earlierTime,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 10,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          created_at: earlierTime,
          updated_at: earlierTime,
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(seedRecord));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Verify Active Work Session is showing initially
      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      const clockOutBtn = screen.getByRole("button", { name: /Clock Out/i });
      fireEvent.click(clockOutBtn);

      await waitFor(() => {
        expect(screen.getByText("Shift Completed for Today")).toBeInTheDocument();
      });

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked Out Successfully/i),
        })
      );
    });
  });

  describe("5. Geofence Management Modal", () => {
    it("opens geofence modal and allows creating a new office boundary", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Switch to Office Locations tab
      const locationsTab = screen.getByText(/Office Locations/i);
      fireEvent.click(locationsTab);

      // Click Add Office Geofence
      const addBtn = screen.getByRole("button", { name: /Add Office Geofence/i });
      fireEvent.click(addBtn);

      expect(screen.getByText("Define latitude, longitude, and radius for automated staff presence verification.")).toBeInTheDocument();

      // Fill in office name
      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i);
      fireEvent.change(nameInput, { target: { value: "Downtown Branch" } });

      // Click "Use My Current Location" button
      const gpsBtn = screen.getByRole("button", { name: /Use My Current Location/i });
      fireEvent.click(gpsBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Coordinates Captured/i),
          })
        );
      });

      // Save Location
      const saveBtn = screen.getByRole("button", { name: /Save Location/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText("Downtown Branch")).toBeInTheDocument();
      });
    });
  });

  describe("6. Regularisation & Correction Requests", () => {
    it("submits a punch regularisation request and allows manager review", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Switch to Regularisation tab
      const reqTab = screen.getByText(/Regularisation/i);
      fireEvent.click(reqTab);

      // Click Submit Request
      const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Request Punch Correction")).toBeInTheDocument();

      // Enter Reason
      const reasonInput = screen.getByPlaceholderText(/Forgot to clock in/i);
      fireEvent.change(reasonInput, { target: { value: "Battery died before punch out" } });

      // Submit modal form
      const confirmSubmitBtn = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(confirmSubmitBtn);

      await waitFor(() => {
        expect(screen.getByText('"Battery died before punch out"')).toBeInTheDocument();
        expect(screen.getByText("Pending Review")).toBeInTheDocument();
      });

      // Manager approves the request
      const approveBtn = screen.getByRole("button", { name: /Approve/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText("Approved ✓")).toBeInTheDocument();
      });
    });
  });

  describe("7. Team Attendance Logs & CRMDataTable Integration", () => {
    it("renders team logs table with headers and data", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const records = [
        {
          id: "att-alice",
          org_id: mockOrg.id,
          staff_id: "user-alice",
          staff_name: "Alice Johnson",
          staff_email: "alice@credsmart.test",
          date: todayStr,
          clock_in: `${todayStr}T09:00:00Z`,
          clock_out: `${todayStr}T17:30:00Z`,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 12,
          work_duration_minutes: 510,
          overtime_minutes: 30,
          notes: "On-time arrival",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(records));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Switch to Team Attendance tab
      const teamTab = screen.getByText(/Team Attendance/i);
      fireEvent.click(teamTab);

      await waitFor(() => {
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
        expect(screen.getByText("Staff Member")).toBeInTheDocument();
        expect(screen.getByText("Clock In")).toBeInTheDocument();
        expect(screen.getByText("Clock Out")).toBeInTheDocument();
        expect(screen.getByText("Geo-Verified ✓")).toBeInTheDocument();
      });
    });

    it("filters attendance records by selected role using the Role Filter dropdown", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const records = [
        {
          id: "att-cashier-1",
          org_id: mockOrg.id,
          staff_id: "user-cashier-1",
          staff_name: "Maya Cashier",
          staff_email: "maya@credsmart.test",
          date: todayStr,
          clock_in: `${todayStr}T09:00:00Z`,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 10,
          work_duration_minutes: 200,
          overtime_minutes: 0,
          role: "Cashier",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "att-manager-1",
          org_id: mockOrg.id,
          staff_id: "user-manager-1",
          staff_name: "Liam Manager",
          staff_email: "liam@credsmart.test",
          date: todayStr,
          clock_in: `${todayStr}T08:30:00Z`,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 15,
          work_duration_minutes: 240,
          overtime_minutes: 0,
          role: "Store Manager",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(records));
      localStorage.setItem(`credsmart_crm_roles_${mockOrg.id}`, JSON.stringify(["Cashier", "Store Manager"]));

      // In JSDOM, Radix Select requires PointerEvent and pointerCapture mocks
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

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Switch to Team Attendance tab
      const teamTab = screen.getByText(/Team Attendance/i);
      fireEvent.click(teamTab);

      // Both records should initially be present under "All Roles"
      await waitFor(() => {
        expect(screen.getByText("Maya Cashier")).toBeInTheDocument();
        expect(screen.getByText("Liam Manager")).toBeInTheDocument();
      });

      // Role filter trigger should be present with "All Roles" default
      const roleFilterTrigger = screen.getByTestId("attendance-role-filter");
      expect(roleFilterTrigger).toBeInTheDocument();
      expect(roleFilterTrigger).toHaveTextContent("All Roles");

      // Open Role Filter dropdown via keyboard ArrowDown
      fireEvent.keyDown(roleFilterTrigger, { key: "ArrowDown", code: "ArrowDown" });

      // Wait for options to render and select "Cashier"
      const cashierOption = await screen.findByRole("option", { name: "Cashier" });
      fireEvent.click(cashierOption);

      // Verify only Maya Cashier is rendered
      await waitFor(() => {
        expect(screen.getByText("Maya Cashier")).toBeInTheDocument();
        expect(screen.queryByText("Liam Manager")).not.toBeInTheDocument();
      });

      // Open Role Filter dropdown and select "Store Manager"
      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const managerOption = await screen.findByRole("option", { name: "Store Manager" });
      fireEvent.click(managerOption);

      // Verify only Liam Manager is rendered
      await waitFor(() => {
        expect(screen.getByText("Liam Manager")).toBeInTheDocument();
        expect(screen.queryByText("Maya Cashier")).not.toBeInTheDocument();
      });

      // Reset to All Roles
      fireEvent.keyDown(screen.getByTestId("attendance-role-filter"), { key: "ArrowDown", code: "ArrowDown" });
      const allRolesOption = await screen.findByRole("option", { name: "All Roles" });
      fireEvent.click(allRolesOption);

      // Both records should be visible again
      await waitFor(() => {
        expect(screen.getByText("Maya Cashier")).toBeInTheDocument();
        expect(screen.getByText("Liam Manager")).toBeInTheDocument();
      });
    });
  });

  describe("8. Permission Gating & Access Control", () => {
    it("renders Access Restricted fallback when attendance view permission is denied", () => {
      mockPermissionsState.isSuperAdmin = false;
      mockPermissionsState.canView = false;
      mockPermissionsState.canEdit = false;

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      expect(screen.getByText("Access Restricted")).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have permission to view CredSmart Attendance records/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Today's Shift")).not.toBeInTheDocument();
    });
  });

  describe("9. Export Engines (CSV & PDF)", () => {
    it("triggers CSV export without crashing", async () => {
      const createObjectURLMock = vi.fn().mockReturnValue("blob:dummy");
      const revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      const csvBtn = screen.getByRole("button", { name: /CSV/i });
      fireEvent.click(csvBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalled();
      });
    });

    it("triggers PDF export without crashing", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      const pdfBtn = screen.getByRole("button", { name: /PDF/i });
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalled();
      });
    });
  });
});
