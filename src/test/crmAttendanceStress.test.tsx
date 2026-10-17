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
// Mocks Setup
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-crm-stress-001",
  name: "CredSmart Global Tech",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "admin",
  }),
}));

const mockUser = {
  id: "user-challenger-007",
  email: "challenger@credsmart.test",
  user_metadata: { full_name: "Challenger Agent" },
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

// Spyable Supabase Mock
let capturedUpserts: any[] = [];
let capturedUpdates: any[] = [];

const createSpyableQueryBuilder = () => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockImplementation((payload: any) => {
      capturedUpserts.push(payload);
      return Promise.resolve({ error: null });
    }),
    insert: vi.fn().mockImplementation((payload: any) => {
      return Promise.resolve({ error: null });
    }),
    update: vi.fn().mockImplementation((payload: any) => {
      capturedUpdates.push(payload);
      return builder;
    }),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (val: any) => void) => {
      resolve({ data: [], error: null });
    },
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => createSpyableQueryBuilder()),
  },
}));

// Default Office HQ (Delhi): Lat 28.6139, Lon 77.2090, Radius 150m
const OFFICE_HQ = {
  latitude: 28.6139,
  longitude: 77.2090,
  radius_meters: 150,
};

// ============================================================================
// Empirical Challenge Test Suites
// ============================================================================

describe("EMPIRICAL CHALLENGER: Attendance UI & Clock-In Pod Stress Harness", { timeout: 35000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    capturedUpserts = [];
    capturedUpdates = [];

    mockPermissionsState = {
      isSuperAdmin: true,
      canView: true,
      canEdit: true,
      loading: false,
    };
  });

  afterEach(() => {
    resetGeolocationMock();
  });

  // --------------------------------------------------------------------------
  // TASK 1: Clock-In Flow with GPS Within Geofence
  // --------------------------------------------------------------------------
  describe("Task 1: Clock-in flow with GPS within geofence", () => {
    it("empirically sets verification_method: 'geo_verified' and is_within_geofence: true at exact HQ coords", async () => {
      mockGeolocationPosition({
        latitude: OFFICE_HQ.latitude,
        longitude: OFFICE_HQ.longitude,
        accuracy: 4,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Verify initial UI detects geofence
      await waitFor(() => {
        expect(screen.getByText("Within Geofence ✓")).toBeInTheDocument();
      });

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      // Verify transition to active work session
      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      // Assert Supabase upsert payload
      expect(capturedUpserts.length).toBeGreaterThan(0);
      const latestUpsert = capturedUpserts[capturedUpserts.length - 1];
      expect(latestUpsert.verification_method).toBe("geo_verified");
      expect(latestUpsert.is_within_geofence).toBe(true);
      expect(latestUpsert.clock_in_latitude).toBeCloseTo(OFFICE_HQ.latitude, 4);
      expect(latestUpsert.clock_in_longitude).toBeCloseTo(OFFICE_HQ.longitude, 4);
      expect(latestUpsert.status).toBe("present");
      expect(latestUpsert.distance_from_office_meters).toBeLessThanOrEqual(OFFICE_HQ.radius_meters);

      // Assert localStorage persistence
      const stored = localStorage.getItem(`credsmart_crm_attendance_${mockOrg.id}`);
      expect(stored).toBeTruthy();
      const records = JSON.parse(stored!);
      expect(records[0].verification_method).toBe("geo_verified");
      expect(records[0].is_within_geofence).toBe(true);
      expect(records[0].notes).toContain("Clocked in via GPS verification");

      // Assert Toast feedback
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked In Successfully ✓/i),
          description: expect.stringMatching(/Geo-verified/i),
        })
      );
    });

    it("empirically verifies geo_verified status near the edge of the 150m boundary", async () => {
      // 0.0008 degrees latitude is ~88.8 meters north of HQ (well inside 150m)
      mockGeolocationPosition({
        latitude: OFFICE_HQ.latitude + 0.0008,
        longitude: OFFICE_HQ.longitude,
        accuracy: 8,
      });

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
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      const latestUpsert = capturedUpserts[capturedUpserts.length - 1];
      expect(latestUpsert.verification_method).toBe("geo_verified");
      expect(latestUpsert.is_within_geofence).toBe(true);
      expect(latestUpsert.distance_from_office_meters).toBeLessThan(150);
      expect(latestUpsert.distance_from_office_meters).toBeGreaterThan(50);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 2: Clock-In Flow with GPS Outside Geofence
  // --------------------------------------------------------------------------
  describe("Task 2: Clock-in flow with GPS outside geofence", () => {
    it("empirically sets verification_method: 'manual' and is_within_geofence: false when 1500m away", async () => {
      // ~0.015 degrees latitude is ~1665m away from HQ
      mockGeolocationPosition({
        latitude: OFFICE_HQ.latitude + 0.015,
        longitude: OFFICE_HQ.longitude,
        accuracy: 12,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Outside Geofence ⚠️")).toBeInTheDocument();
      });

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      // Assert Supabase upsert payload
      expect(capturedUpserts.length).toBeGreaterThan(0);
      const latestUpsert = capturedUpserts[capturedUpserts.length - 1];
      expect(latestUpsert.verification_method).toBe("manual");
      expect(latestUpsert.is_within_geofence).toBe(false);
      expect(latestUpsert.distance_from_office_meters).toBeGreaterThan(150);
      expect(latestUpsert.notes).toContain("Clocked in outside geofence");

      // Assert localStorage persistence
      const stored = localStorage.getItem(`credsmart_crm_attendance_${mockOrg.id}`);
      expect(stored).toBeTruthy();
      const records = JSON.parse(stored!);
      expect(records[0].verification_method).toBe("manual");
      expect(records[0].is_within_geofence).toBe(false);

      // Assert Toast feedback specifies Outside Geofence & manual verification
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked In \(Outside Geofence\) ⚠️/i),
          description: expect.stringMatching(/manual verification/i),
        })
      );
    });

    it("displays manual badge in team logs table when clocked in outside geofence", async () => {
      mockGeolocationPosition({
        latitude: 19.0760, // Mumbai (far outside Delhi HQ)
        longitude: 72.8777,
        accuracy: 10,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      // Switch to Team Attendance tab to inspect table rendering
      const logsTab = screen.getByText(/Team Attendance/i);
      fireEvent.click(logsTab);

      await waitFor(() => {
        // Table should show "Manual ⚠️"
        expect(screen.getByText(/Manual ⚠️/i)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 3: Clock-In Flow When GPS is Denied / Times Out
  // --------------------------------------------------------------------------
  describe("Task 3: Clock-in flow when GPS is denied / times out", () => {
    it("handles GPS permission denied by displaying GPS error badge and descriptive failure toast", async () => {
      // Mock Geolocation Permission Denied error
      mockGeolocationError(new Error("User denied Geolocation prompt."));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      // Radar should reflect GPS Disabled / Unavailable
      await waitFor(() => {
        expect(screen.getByText("GPS Disabled / Unavailable")).toBeInTheDocument();
      });

      // Staff clicks "Clock In Now" while GPS is denied
      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      // A destructive toast should be triggered warning the user
      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Clock In Failed",
            description: expect.stringMatching(/User denied Geolocation/i),
            variant: "destructive",
          })
        );
      });

      // Empirically verify that no corrupt attendance record was inserted into Supabase
      expect(capturedUpserts.length).toBe(0);

      // User remains in unclocked state
      expect(screen.getByRole("button", { name: /Clock In Now/i })).toBeInTheDocument();
      expect(screen.queryByText("Active Work Session")).not.toBeInTheDocument();
    });

    it("handles GPS timeout and allows user to submit regularisation correction request as fallback", async () => {
      // Mock GPS timeout error
      mockGeolocationError(new Error("Geolocation request timed out after 10000ms."));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("GPS Disabled / Unavailable")).toBeInTheDocument();
      });

      const clockInBtn = screen.getByRole("button", { name: /Clock In Now/i });
      fireEvent.click(clockInBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Clock In Failed",
            description: expect.stringMatching(/timed out/i),
            variant: "destructive",
          })
        );
      });

      // User utilizes Regularisation fallback workflow to request manual punch
      const regTab = screen.getByText(/Regularisation/i);
      fireEvent.click(regTab);

      const submitBtn = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Request Punch Correction")).toBeInTheDocument();

      const reasonInput = screen.getByPlaceholderText(/Forgot to clock in/i);
      fireEvent.change(reasonInput, {
        target: { value: "GPS timed out inside basement parking facility" },
      });

      const confirmBtn = screen.getByRole("button", { name: /Submit Request/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/Request Submitted/i),
          })
        );
        expect(screen.getByText('"GPS timed out inside basement parking facility"')).toBeInTheDocument();
        expect(screen.getByText("Pending Review")).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 4: Active Session Stopwatch & Clock-Out Duration/Overtime Calculations
  // --------------------------------------------------------------------------
  describe("Task 4: Active session stopwatch timer & clock-out duration/overtime calculations", () => {
    it("increments active session stopwatch timer from earlier clock-in time", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      // Clock in 3665 seconds ago (1 hour, 1 minute, 5 seconds ago)
      const clockInTimestamp = new Date(Date.now() - 3665 * 1000).toISOString();

      const seedRecord = [
        {
          id: "att-stopwatch-test",
          org_id: mockOrg.id,
          staff_id: mockUser.id,
          staff_name: "Challenger Agent",
          staff_email: "challenger@credsmart.test",
          date: todayStr,
          clock_in: clockInTimestamp,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 5,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          created_at: clockInTimestamp,
          updated_at: clockInTimestamp,
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(seedRecord));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      // Check format 01:01:0X
      await waitFor(() => {
        const timerElement = screen.getByText(/01:01:0[5-9]|01:01:1[0-2]/);
        expect(timerElement).toBeInTheDocument();
      });
    });

    it("calculates exact duration and zero overtime for a standard 7-hour shift (420 minutes)", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      // 7 hours ago (420 minutes, under 480 minute standard shift)
      const clockInIso = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

      const seedRecord = [
        {
          id: "att-duration-standard",
          org_id: mockOrg.id,
          staff_id: mockUser.id,
          staff_name: "Challenger Agent",
          staff_email: "challenger@credsmart.test",
          date: todayStr,
          clock_in: clockInIso,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 0,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          created_at: clockInIso,
          updated_at: clockInIso,
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(seedRecord));

      mockGeolocationPosition({
        latitude: OFFICE_HQ.latitude,
        longitude: OFFICE_HQ.longitude,
        accuracy: 5,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      const clockOutBtn = screen.getByRole("button", { name: /Clock Out/i });
      fireEvent.click(clockOutBtn);

      await waitFor(() => {
        expect(screen.getByText("Shift Completed for Today")).toBeInTheDocument();
      });

      // Check captured update to Supabase
      expect(capturedUpdates.length).toBeGreaterThan(0);
      const updatePayload = capturedUpdates[capturedUpdates.length - 1];
      expect(updatePayload.work_duration_minutes).toBeCloseTo(420, -1);
      expect(updatePayload.overtime_minutes).toBe(0);

      // Verify completion toast
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked Out Successfully/i),
          description: expect.stringMatching(/Total time: 7h/i),
        })
      );
    });

    it("calculates exact duration and overtime for a 10-hour shift (600 minutes -> 120 minutes overtime)", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      // 10 hours ago (600 minutes = 480 standard + 120 overtime)
      const clockInIso = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

      const seedRecord = [
        {
          id: "att-duration-overtime",
          org_id: mockOrg.id,
          staff_id: mockUser.id,
          staff_name: "Challenger Agent",
          staff_email: "challenger@credsmart.test",
          date: todayStr,
          clock_in: clockInIso,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 0,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          created_at: clockInIso,
          updated_at: clockInIso,
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(seedRecord));

      mockGeolocationPosition({
        latitude: OFFICE_HQ.latitude,
        longitude: OFFICE_HQ.longitude,
        accuracy: 5,
      });

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      const clockOutBtn = screen.getByRole("button", { name: /Clock Out/i });
      fireEvent.click(clockOutBtn);

      await waitFor(() => {
        expect(screen.getByText("Shift Completed for Today")).toBeInTheDocument();
      });

      const updatePayload = capturedUpdates[capturedUpdates.length - 1];
      expect(updatePayload.work_duration_minutes).toBeCloseTo(600, -1);
      expect(updatePayload.overtime_minutes).toBeCloseTo(120, -1);

      // Verify completion toast contains overtime note
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked Out Successfully/i),
          description: expect.stringMatching(/10h \(2h overtime\)/i),
        })
      );
    });

    it("gracefully falls back on clock-out when GPS is unreachable while completing shift and calculating overtime", async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const clockInIso = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(); // 9 hours = 540 min (60m overtime)

      const seedRecord = [
        {
          id: "att-clockout-nogps",
          org_id: mockOrg.id,
          staff_id: mockUser.id,
          staff_name: "Challenger Agent",
          staff_email: "challenger@credsmart.test",
          date: todayStr,
          clock_in: clockInIso,
          clock_out: null,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 0,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          created_at: clockInIso,
          updated_at: clockInIso,
        },
      ];
      localStorage.setItem(`credsmart_crm_attendance_${mockOrg.id}`, JSON.stringify(seedRecord));

      // Make GPS throw on clock out
      mockGeolocationError(new Error("Network location service offline"));

      render(
        <MemoryRouter>
          <Attendance />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Active Work Session")).toBeInTheDocument();
      });

      const clockOutBtn = screen.getByRole("button", { name: /Clock Out/i });
      fireEvent.click(clockOutBtn);

      // Clock out should SUCCEED despite GPS error, falling back to null coordinates
      await waitFor(() => {
        expect(screen.getByText("Shift Completed for Today")).toBeInTheDocument();
      });

      const updatePayload = capturedUpdates[capturedUpdates.length - 1];
      expect(updatePayload.clock_out_latitude).toBeNull();
      expect(updatePayload.clock_out_longitude).toBeNull();
      expect(updatePayload.work_duration_minutes).toBeCloseTo(540, -1);
      expect(updatePayload.overtime_minutes).toBeCloseTo(60, -1);

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Clocked Out Successfully/i),
          description: expect.stringMatching(/9h \(1h overtime\)/i),
        })
      );
    });
  });
});
