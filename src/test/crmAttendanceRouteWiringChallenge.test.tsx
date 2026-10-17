import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import fs from "fs";
import path from "path";

import { ROUTE_PATHS } from "@/config/routes";
import Attendance from "@/pages/crm/Attendance";
import CRMDashboard from "@/pages/crm/CRMDashboard";
import { SleekRouteLoader } from "@/App";

// ============================================================================
// Mocks for Attendance & CRMDashboard dependencies
// ============================================================================

// 1. Mock use-toast
const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

// 2. Mock Organization Context
const mockOrg = {
  id: "org-crm-challenge-001",
  name: "CredSmart Enterprise",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "store_owner",
    userPermissions: null,
    loading: false,
  }),
}));

// 3. Dynamic Auth Context Mock
let authMockState: {
  user: { id: string; email: string; user_metadata?: { full_name?: string } } | null;
  loading: boolean;
} = {
  user: null,
  loading: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authMockState.user,
    loading: authMockState.loading,
    signOut: vi.fn(),
  }),
}));

// 4. Mock CRM Permissions
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
  usePermission: () => true,
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

// 6. Mock Supabase Client
const createQueryBuilder = () => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (val: any) => void) => {
      resolve({ count: 5, data: [], error: null });
    },
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
  },
}));

// Helper component that mirrors App.tsx's ProtectedRoutes
function ProtectedRoutesHarness() {
  const { user, loading } = authMockState;

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  return <Outlet />;
}

// Location spy for testing redirects
function LocationSpy() {
  const location = useLocation();
  return (
    <div data-testid="location-spy">
      <span data-testid="current-pathname">{location.pathname}</span>
      <span data-testid="current-search">{location.search}</span>
    </div>
  );
}

describe("CRM Phase 2 Milestone 5 Empirical Challenger: Route Wiring & Protection Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authMockState = {
      user: null,
      loading: false,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Static Source Code & Architectural Invariant Tests
  // ────────────────────────────────────────────────────────────────────────────
  describe("1. Static Architectural Invariants in src/App.tsx", () => {
    const appTsxPath = path.resolve(__dirname, "../App.tsx");
    const appSource = fs.readFileSync(appTsxPath, "utf-8");

    it("verifies Attendance component is explicitly imported in App.tsx", () => {
      expect(appSource).toMatch(
        /import\s+Attendance\s+from\s+["']@\/pages\/crm\/Attendance["'];?/
      );
    });

    it("verifies ROUTE_PATHS.crmAttendance route is mounted with <Attendance /> element", () => {
      expect(appSource).toContain(
        "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
      );
    });

    it("verifies ROUTE_PATHS.crmAttendance route is nested under ProtectedRoutes", () => {
      const protectedIndex = appSource.indexOf("<Route element={<ProtectedRoutes />}>");
      const crmAttendanceIndex = appSource.indexOf(
        "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
      );
      const managerIndex = appSource.indexOf(
        "<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>"
      );

      expect(protectedIndex).toBeGreaterThan(-1);
      expect(crmAttendanceIndex).toBeGreaterThan(protectedIndex);
      // Ensure crmAttendance is NOT locked into manager-only routes
      expect(crmAttendanceIndex).toBeLessThan(managerIndex);
    });

    it("verifies ProtectedRoutes implementation redirects unauthenticated users to ROUTE_PATHS.auth", () => {
      expect(appSource).toMatch(
        /function\s+ProtectedRoutes\(\)\s*\{[\s\S]*?if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}[\s\S]*?\}/
      );
    });

    it("verifies canonical route path definition for crmAttendance", () => {
      expect(ROUTE_PATHS.crmAttendance).toBe("/crm/attendance");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Empirical Unauthenticated Access & Redirection Tests
  // ────────────────────────────────────────────────────────────────────────────
  describe("2. Unauthenticated Access & Redirection (Empirical Stress Test)", () => {
    it("redirects unauthenticated user from ROUTE_PATHS.crmAttendance to /auth", async () => {
      authMockState = { user: null, loading: false };

      render(
        <MemoryRouter initialEntries={[ROUTE_PATHS.crmAttendance]}>
          <Routes>
            <Route path={ROUTE_PATHS.auth} element={<LocationSpy />} />
            <Route element={<ProtectedRoutesHarness />}>
              <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Verify redirected to /auth
      const pathnameEl = await screen.findByTestId("current-pathname");
      expect(pathnameEl.textContent).toBe(ROUTE_PATHS.auth);
      expect(pathnameEl.textContent).toBe("/auth");

      // Verify Attendance component is NOT mounted in DOM
      expect(screen.queryByText(/Attendance & Shift Command Center/i)).toBeNull();
      expect(screen.queryByText(/Today's Shift & Clock In\/Out/i)).toBeNull();
    });

    it("redirects unauthenticated user accessing attendance with query params to /auth", async () => {
      authMockState = { user: null, loading: false };

      render(
        <MemoryRouter initialEntries={[`${ROUTE_PATHS.crmAttendance}?tab=admin&date=2026-10-17`]}>
          <Routes>
            <Route path={ROUTE_PATHS.auth} element={<LocationSpy />} />
            <Route element={<ProtectedRoutesHarness />}>
              <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      const pathnameEl = await screen.findByTestId("current-pathname");
      expect(pathnameEl.textContent).toBe("/auth");
      expect(screen.queryByText(/Attendance & Shift Command Center/i)).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Empirical Authenticated Access & Attendance Rendering Tests
  // ────────────────────────────────────────────────────────────────────────────
  describe("3. Authenticated Access & Attendance Rendering (Empirical Test)", () => {
    it("renders <Attendance /> component when authenticated user accesses ROUTE_PATHS.crmAttendance", async () => {
      authMockState = {
        user: {
          id: "user-crm-verified-001",
          email: "staff@credsmart.test",
          user_metadata: { full_name: "Verified Staff Member" },
        },
        loading: false,
      };

      await act(async () => {
        render(
          <MemoryRouter initialEntries={[ROUTE_PATHS.crmAttendance]}>
            <Routes>
              <Route path={ROUTE_PATHS.auth} element={<LocationSpy />} />
              <Route element={<ProtectedRoutesHarness />}>
                <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
              </Route>
            </Routes>
          </MemoryRouter>
        );
      });

      // Verify Attendance page header and primary elements render
      expect(await screen.findByText(/Attendance & Geolocation Hub/i)).toBeInTheDocument();
      expect(screen.getByText(/Present Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Geo-Verified/i)).toBeInTheDocument();

      // Ensure no redirect occurred to /auth
      expect(screen.queryByTestId("location-spy")).toBeNull();
    });

    it("displays SleekRouteLoader when authentication is still loading", async () => {
      authMockState = { user: null, loading: true };

      render(
        <MemoryRouter initialEntries={[ROUTE_PATHS.crmAttendance]}>
          <Routes>
            <Route path={ROUTE_PATHS.auth} element={<LocationSpy />} />
            <Route element={<ProtectedRoutesHarness />}>
              <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Loading CredSmart\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByTestId("location-spy")).toBeNull();
      expect(screen.queryByText(/Attendance & Geolocation Hub/i)).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. CRMDashboard Integration & Live Attendance Linking Tests
  // ────────────────────────────────────────────────────────────────────────────
  describe("4. CRMDashboard Live Integration & Quick Nav Linking", () => {
    it("contains an active quick navigation item linking to ROUTE_PATHS.crmAttendance", async () => {
      authMockState = {
        user: {
          id: "user-admin-001",
          email: "admin@credsmart.test",
        },
        loading: false,
      };

      await act(async () => {
        render(
          <MemoryRouter initialEntries={[ROUTE_PATHS.crm]}>
            <CRMDashboard />
          </MemoryRouter>
        );
      });

      // Check Attendance Tracker card presence
      const attendanceCardTitle = await screen.findByText("Attendance Tracker");
      expect(attendanceCardTitle).toBeInTheDocument();

      // Find the link wrapping or associated with Attendance Tracker
      const attendanceLink = attendanceCardTitle.closest("a");
      expect(attendanceLink).not.toBeNull();
      expect(attendanceLink?.getAttribute("href")).toBe(ROUTE_PATHS.crmAttendance);

      // Verify Attendance Tracker card contains "Active" badge
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
      const attendanceBadge = attendanceLink?.textContent?.includes("Active");
      expect(attendanceBadge).toBe(true);
    });
  });
});
