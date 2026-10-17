import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Attendance from "@/pages/crm/Attendance";
import {
  mockGeolocationPosition,
  mockGeolocationError,
  resetGeolocationMock,
} from "@/utils/crmGeoUtils";
import type { CRMGeolocation, CRMAttendanceRecord, CRMAttendanceRequest } from "@/types/crmAttendance";

// ============================================================================
// Mocks
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-crm-challenge-002",
  name: "CredSmart Enterprise",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "admin",
  }),
}));

const mockUser = {
  id: "user-admin-001",
  email: "admin@credsmart.test",
  user_metadata: { full_name: "Admin Challenger" },
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
// Empirical Challenge Suite: Admin Attendance Oversight
// ============================================================================

describe("Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx)", { timeout: 30000 }, () => {
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
  // 1. Geofence Management Modal Tests
  // --------------------------------------------------------------------------
  describe("1. Geofence Management Modal: Add, Edit & Validation", () => {
    it("adds a new geofence location with valid parameters and persists it", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Navigate to Office Locations tab
      const locationsTab = screen.getByText(/Office Locations/i);
      fireEvent.click(locationsTab);

      // Open Add Geofence Modal
      const addBtn = screen.getByRole("button", { name: /Add Office Geofence/i });
      fireEvent.click(addBtn);

      expect(screen.getByRole("heading", { name: /Add Office Geofence/i })).toBeInTheDocument();

      // Enter name, coordinates, radius
      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i);
      const latInput = screen.getByPlaceholderText("28.6139");
      const lonInput = screen.getByPlaceholderText("77.2090");
      const radiusInput = screen.getByPlaceholderText("150");

      fireEvent.change(nameInput, { target: { value: "Secondary Warehouse" } });
      fireEvent.change(latInput, { target: { value: "19.076000" } });
      fireEvent.change(lonInput, { target: { value: "72.877700" } });
      fireEvent.change(radiusInput, { target: { value: "250" } });

      // Save
      const saveBtn = screen.getByRole("button", { name: /Save Location/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Location Added/i),
          })
        );
        expect(screen.getByText("Secondary Warehouse")).toBeInTheDocument();
        expect(screen.getByText("250 meters")).toBeInTheDocument();
      });

      // Verify localStorage persistence
      const savedGeos = JSON.parse(
        localStorage.getItem(`credsmart_crm_geolocations_${mockOrg.id}`) || "[]"
      );
      expect(savedGeos.some((g: CRMGeolocation) => g.name === "Secondary Warehouse" && g.radius_meters === 250)).toBe(true);
    });

    it("edits an existing geofence location in-place without duplicating records", async () => {
      const initialGeofences: CRMGeolocation[] = [
        {
          id: "geo-initial-001",
          org_id: mockOrg.id,
          name: "Old Office Building",
          latitude: 28.5355,
          longitude: 77.3910,
          radius_meters: 100,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(
        `credsmart_crm_geolocations_${mockOrg.id}`,
        JSON.stringify(initialGeofences)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Navigate to Office Locations tab
      fireEvent.click(screen.getByText(/Office Locations/i));

      await waitFor(() => {
        expect(screen.getByText("Old Office Building")).toBeInTheDocument();
      });

      // Click Edit on the geofence card
      const editBtn = screen.getByRole("button", { name: /Edit/i });
      fireEvent.click(editBtn);

      // Verify Edit modal title and prefilled values
      expect(screen.getByText("Edit Office Geofence")).toBeInTheDocument();
      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i) as HTMLInputElement;
      expect(nameInput.value).toBe("Old Office Building");

      // Update name and radius
      fireEvent.change(nameInput, { target: { value: "Refurbished Tech Park" } });
      const radiusInput = screen.getByPlaceholderText("150");
      fireEvent.change(radiusInput, { target: { value: "300" } });

      // Save
      fireEvent.click(screen.getByRole("button", { name: /Save Location/i }));

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Location Updated",
            description: expect.stringMatching(/Refurbished Tech Park has been updated/i),
          })
        );
        expect(screen.getByText("Refurbished Tech Park")).toBeInTheDocument();
        expect(screen.getByText("300 meters")).toBeInTheDocument();
        expect(screen.queryByText("Old Office Building")).not.toBeInTheDocument();
      });

      // Verify no duplicates created in localStorage
      const updatedGeos: CRMGeolocation[] = JSON.parse(
        localStorage.getItem(`credsmart_crm_geolocations_${mockOrg.id}`) || "[]"
      );
      expect(updatedGeos).toHaveLength(1);
      expect(updatedGeos[0].id).toBe("geo-initial-001");
      expect(updatedGeos[0].name).toBe("Refurbished Tech Park");
      expect(updatedGeos[0].radius_meters).toBe(300);
    });

    it("rejects empty office name during geofence creation", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Office Locations/i));
      fireEvent.click(screen.getByRole("button", { name: /Add Office Geofence/i }));

      // Leave name empty and attempt save
      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i);
      fireEvent.change(nameInput, { target: { value: "   " } });

      fireEvent.click(screen.getByRole("button", { name: /Save Location/i }));

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Validation Error",
            description: "Office location name is required.",
            variant: "destructive",
          })
        );
      });
      // Modal should remain open
      expect(screen.getByRole("heading", { name: /Add Office Geofence/i })).toBeInTheDocument();
    });

    it("rejects invalid latitude and longitude boundary values", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Office Locations/i));
      fireEvent.click(screen.getByRole("button", { name: /Add Office Geofence/i }));

      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i);
      const latInput = screen.getByPlaceholderText("28.6139");
      const lonInput = screen.getByPlaceholderText("77.2090");
      const saveBtn = screen.getByRole("button", { name: /Save Location/i });

      fireEvent.change(nameInput, { target: { value: "Invalid Lat Location" } });

      // Test Latitude > 90
      fireEvent.change(latInput, { target: { value: "95.5" } });
      fireEvent.change(lonInput, { target: { value: "77.2" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter valid geographic coordinates.",
          variant: "destructive",
        })
      );

      // Test Latitude < -90
      fireEvent.change(latInput, { target: { value: "-91.0" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter valid geographic coordinates.",
          variant: "destructive",
        })
      );

      // Test Longitude > 180
      fireEvent.change(latInput, { target: { value: "28.5" } });
      fireEvent.change(lonInput, { target: { value: "185.0" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter valid geographic coordinates.",
          variant: "destructive",
        })
      );

      // Test Longitude < -180
      fireEvent.change(lonInput, { target: { value: "-185.0" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter valid geographic coordinates.",
          variant: "destructive",
        })
      );

      // Test Non-numeric coordinates
      fireEvent.change(latInput, { target: { value: "invalid-lat" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Please enter valid geographic coordinates.",
          variant: "destructive",
        })
      );
    });

    it("rejects non-positive and invalid perimeter radius", async () => {
      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Office Locations/i));
      fireEvent.click(screen.getByRole("button", { name: /Add Office Geofence/i }));

      const nameInput = screen.getByPlaceholderText(/e\.g\. Headquarters, Retail Store #1/i);
      const latInput = screen.getByPlaceholderText("28.6139");
      const lonInput = screen.getByPlaceholderText("77.2090");
      const radiusInput = screen.getByPlaceholderText("150");
      const saveBtn = screen.getByRole("button", { name: /Save Location/i });

      fireEvent.change(nameInput, { target: { value: "Test Radius" } });
      fireEvent.change(latInput, { target: { value: "28.6" } });
      fireEvent.change(lonInput, { target: { value: "77.2" } });

      // Radius = 0
      fireEvent.change(radiusInput, { target: { value: "0" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Radius must be a positive integer in meters.",
          variant: "destructive",
        })
      );

      // Radius = -50
      fireEvent.change(radiusInput, { target: { value: "-50" } });
      fireEvent.click(saveBtn);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: "Radius must be a positive integer in meters.",
          variant: "destructive",
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. "Use My Current Location" button in Geofence modal with Mocked GPS
  // --------------------------------------------------------------------------
  describe("2. 'Use My Current Location' GPS Acquisition in Modal", () => {
    it("successfully populates latitude and longitude fields when GPS succeeds", async () => {
      mockGeolocationPosition({
        latitude: 12.9715987,
        longitude: 77.5945627,
        accuracy: 8,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Office Locations/i));
      fireEvent.click(screen.getByRole("button", { name: /Add Office Geofence/i }));

      const gpsBtn = screen.getByRole("button", { name: /Use My Current Location/i });
      fireEvent.click(gpsBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Coordinates Captured/i),
            description: expect.stringMatching(/Lat: 12\.97160.*Lon: 77\.59456/i),
          })
        );
      });

      const latInput = screen.getByPlaceholderText("28.6139") as HTMLInputElement;
      const lonInput = screen.getByPlaceholderText("77.2090") as HTMLInputElement;

      expect(latInput.value).toBe("12.971599");
      expect(lonInput.value).toBe("77.594563");
    });

    it("handles GPS acquisition denial/error gracefully without crashing", async () => {
      mockGeolocationError({
        code: 1, // PERMISSION_DENIED
        message: "User denied Geolocation",
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Office Locations/i));
      fireEvent.click(screen.getByRole("button", { name: /Add Office Geofence/i }));

      const gpsBtn = screen.getByRole("button", { name: /Use My Current Location/i });
      fireEvent.click(gpsBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "GPS Capture Failed",
            description: expect.stringMatching(/Location permission denied/i),
            variant: "destructive",
          })
        );
      });

      // Form remains functional and interactive
      expect(screen.getByRole("button", { name: /Use My Current Location/i })).not.toBeDisabled();
      expect(screen.getByRole("heading", { name: /Add Office Geofence/i })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Regularisation Approval Flow
  // --------------------------------------------------------------------------
  describe("3. Regularisation Approval & Rejection Flow", () => {
    it("approving regularisation request updates attendance record to 'regularized' with calculated durations", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const pendingRequest: CRMAttendanceRequest = {
        id: "req-pending-001",
        org_id: mockOrg.id,
        staff_id: "user-employee-123",
        staff_name: "John Staff",
        attendance_id: "att-existing-001",
        date: todayStr,
        requested_clock_in: `${todayStr}T09:00:00`,
        requested_clock_out: `${todayStr}T18:30:00`,
        requested_status: "present",
        reason: "Card reader offline at front desk",
        status: "pending",
        reviewer_id: null,
        reviewer_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const initialAttendance: CRMAttendanceRecord[] = [
        {
          id: "att-existing-001",
          org_id: mockOrg.id,
          staff_id: "user-employee-123",
          staff_name: "John Staff",
          date: todayStr,
          clock_in: null,
          clock_out: null,
          status: "absent",
          verification_method: "manual",
          is_within_geofence: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      localStorage.setItem(
        `credsmart_crm_attendance_requests_${mockOrg.id}`,
        JSON.stringify([pendingRequest])
      );
      localStorage.setItem(
        `credsmart_crm_attendance_${mockOrg.id}`,
        JSON.stringify(initialAttendance)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Navigate to Regularisation tab
      fireEvent.click(screen.getByText(/Regularisation/i));

      await waitFor(() => {
        expect(screen.getByText('"Card reader offline at front desk"')).toBeInTheDocument();
        expect(screen.getByText("Pending Review")).toBeInTheDocument();
      });

      // Manager clicks Approve
      const approveBtn = screen.getByRole("button", { name: /Approve/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Request Approved ✓",
            description: expect.stringMatching(/has been approved/i),
          })
        );
        expect(screen.getByText("Approved ✓")).toBeInTheDocument();
      });

      // Verify attendance records in localStorage were updated to 'regularized'
      const updatedAttendance: CRMAttendanceRecord[] = JSON.parse(
        localStorage.getItem(`credsmart_crm_attendance_${mockOrg.id}`) || "[]"
      );
      const staffRecord = updatedAttendance.find((a) => a.staff_id === "user-employee-123" && a.date === todayStr);
      expect(staffRecord).toBeDefined();
      expect(staffRecord?.verification_method).toBe("regularized");
      expect(staffRecord?.status).toBe("present");
      // 09:00 to 18:30 = 9.5 hours = 570 mins. Shift target = 480 mins. Overtime = 90 mins.
      expect(staffRecord?.work_duration_minutes).toBe(570);
      expect(staffRecord?.overtime_minutes).toBe(90);
      expect(staffRecord?.notes).toContain("Regularised punch: Card reader offline at front desk");
    });

    it("rejecting regularisation request updates request status to 'rejected' without modifying attendance", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const pendingRequest: CRMAttendanceRequest = {
        id: "req-pending-002",
        org_id: mockOrg.id,
        staff_id: "user-employee-456",
        staff_name: "Bob Reject",
        attendance_id: null,
        date: todayStr,
        requested_clock_in: `${todayStr}T10:00:00`,
        requested_clock_out: `${todayStr}T17:00:00`,
        requested_status: "present",
        reason: "Invalid excuse without proof",
        status: "pending",
        reviewer_id: null,
        reviewer_notes: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const initialAttendance: CRMAttendanceRecord[] = [];
      localStorage.setItem(
        `credsmart_crm_attendance_requests_${mockOrg.id}`,
        JSON.stringify([pendingRequest])
      );
      localStorage.setItem(
        `credsmart_crm_attendance_${mockOrg.id}`,
        JSON.stringify(initialAttendance)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Regularisation/i));

      await waitFor(() => {
        expect(screen.getByText('"Invalid excuse without proof"')).toBeInTheDocument();
      });

      // Manager clicks Reject
      const rejectBtn = screen.getByRole("button", { name: /Reject/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Request Rejected",
            description: expect.stringMatching(/has been rejected/i),
          })
        );
        expect(screen.getByText("Rejected")).toBeInTheDocument();
      });

      // Verify request status in localStorage
      const updatedRequests: CRMAttendanceRequest[] = JSON.parse(
        localStorage.getItem(`credsmart_crm_attendance_requests_${mockOrg.id}`) || "[]"
      );
      expect(updatedRequests[0].status).toBe("rejected");
      expect(updatedRequests[0].reviewer_notes).toBe("Rejected by manager");

      // Verify attendance records were NOT populated with a regularized punch
      const updatedAttendance: CRMAttendanceRecord[] = JSON.parse(
        localStorage.getItem(`credsmart_crm_attendance_${mockOrg.id}`) || "[]"
      );
      expect(updatedAttendance).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. CRMDataTable Filtering: Date, Role, and Staff Name Search
  // --------------------------------------------------------------------------
  describe("4. CRMDataTable Filtering: Date, Role, and Staff Name Search", () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    const sampleRecords: CRMAttendanceRecord[] = [
      {
        id: "att-101",
        org_id: mockOrg.id,
        staff_id: "staff-alice",
        staff_name: "Alice Montgomery",
        staff_email: "alice@company.com",
        date: todayStr,
        clock_in: `${todayStr}T09:00:00Z`,
        clock_out: `${todayStr}T17:00:00Z`,
        status: "present",
        verification_method: "geo_verified",
        is_within_geofence: true,
        work_duration_minutes: 480,
        overtime_minutes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "att-102",
        org_id: mockOrg.id,
        staff_id: "staff-bob",
        staff_name: "Bob Henderson",
        staff_email: "bob@company.com",
        date: yesterdayStr,
        clock_in: `${yesterdayStr}T09:15:00Z`,
        clock_out: `${yesterdayStr}T17:15:00Z`,
        status: "present",
        verification_method: "geo_verified",
        is_within_geofence: true,
        work_duration_minutes: 480,
        overtime_minutes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "att-103",
        org_id: mockOrg.id,
        staff_id: "staff-charlie",
        staff_name: "Charlie Daniels",
        staff_email: "charlie@company.com",
        date: todayStr,
        clock_in: `${todayStr}T08:45:00Z`,
        clock_out: `${todayStr}T17:00:00Z`,
        status: "half_day",
        verification_method: "manual",
        is_within_geofence: false,
        work_duration_minutes: 240,
        overtime_minutes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it("filters records by date via the date input control", async () => {
      localStorage.setItem(
        `credsmart_crm_attendance_${mockOrg.id}`,
        JSON.stringify(sampleRecords)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Switch to Team Attendance tab
      fireEvent.click(screen.getByText(/Team Attendance/i));

      // By default, selectedDate is today -> Alice and Charlie are visible, Bob (yesterday) is not
      await waitFor(() => {
        expect(screen.getByText("Alice Montgomery")).toBeInTheDocument();
        expect(screen.getByText("Charlie Daniels")).toBeInTheDocument();
        expect(screen.queryByText("Bob Henderson")).not.toBeInTheDocument();
      });

      // Change date input to yesterday
      const dateInput = screen.getByDisplayValue(todayStr);
      fireEvent.change(dateInput, { target: { value: yesterdayStr } });

      await waitFor(() => {
        expect(screen.getByText("Bob Henderson")).toBeInTheDocument();
        expect(screen.queryByText("Alice Montgomery")).not.toBeInTheDocument();
        expect(screen.queryByText("Charlie Daniels")).not.toBeInTheDocument();
      });

      // Clear date input -> all records should be shown
      fireEvent.change(dateInput, { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByText("Alice Montgomery")).toBeInTheDocument();
        expect(screen.getByText("Bob Henderson")).toBeInTheDocument();
        expect(screen.getByText("Charlie Daniels")).toBeInTheDocument();
      });
    });

    it("filters records by staff name and email in CRMDataTable search input", async () => {
      localStorage.setItem(
        `credsmart_crm_attendance_${mockOrg.id}`,
        JSON.stringify(sampleRecords)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Team Attendance/i));

      // Both Alice and Charlie are on today's date
      await waitFor(() => {
        expect(screen.getByText("Alice Montgomery")).toBeInTheDocument();
        expect(screen.getByText("Charlie Daniels")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search staff by name or email\.\.\./i);

      // Search for "Alice"
      fireEvent.change(searchInput, { target: { value: "Alice" } });
      await waitFor(() => {
        expect(screen.getByText("Alice Montgomery")).toBeInTheDocument();
        expect(screen.queryByText("Charlie Daniels")).not.toBeInTheDocument();
      });

      // Search for email "charlie@company.com"
      fireEvent.change(searchInput, { target: { value: "charlie@company.com" } });
      await waitFor(() => {
        expect(screen.getByText("Charlie Daniels")).toBeInTheDocument();
        expect(screen.queryByText("Alice Montgomery")).not.toBeInTheDocument();
      });

      // Search for nonexistent query
      fireEvent.change(searchInput, { target: { value: "NonExistentName" } });
      await waitFor(() => {
        expect(screen.getByText("No attendance records match your filter criteria.")).toBeInTheDocument();
      });
    });

    it("evaluates presence and implementation of Role Filter in Team Attendance tab", async () => {
      localStorage.setItem(
        `credsmart_crm_attendance_${mockOrg.id}`,
        JSON.stringify(sampleRecords)
      );

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Team Attendance/i));

      await waitFor(() => {
        expect(screen.getByText("Alice Montgomery")).toBeInTheDocument();
      });

      // Check whether a role filter dropdown/select exists in the Attendance table header
      // The original requirement specifies: "Daily Attendance Table using CRMDataTable with date filter, staff search, role filter, status badge"
      const roleFilterDropdown = screen.queryByRole("combobox", { name: /role/i }) ||
                                 screen.queryByPlaceholderText(/role/i) ||
                                 screen.queryByText(/All Roles/i) ||
                                 screen.queryByText(/Filter by Role/i);

      // EMPIRICAL VERIFICATION:
      // In src/pages/crm/Attendance.tsx, a dedicated Role filter dropdown is now implemented in the UI controls.
      expect(roleFilterDropdown).not.toBeNull();
    });
  });
});
