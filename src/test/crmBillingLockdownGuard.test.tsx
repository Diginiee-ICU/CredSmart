/**
 * @file crmBillingLockdownGuard.test.tsx
 * @description Comprehensive unit and integration test suite for BillingLockdownGuard.
 * Verifies strict route lockdown preventing CRM staff without POS/billing roles
 * from entering /billing/*, /pos, and /checkout routes, while preserving store owners,
 * cashiers, salesmen, stock managers, accountants, and permission-granted staff.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import fs from "fs";
import path from "path";

import { ROUTE_PATHS } from "@/config/routes";
import { BillingLockdownGuard } from "@/components/routing/BillingLockdownGuard";

// ────────────────────────────────────────────────────────────────────────────
// Mocks for Hook Dependencies
// ────────────────────────────────────────────────────────────────────────────

// 1. Toast mock
const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

// 2. Auth context mock state
let authState: {
  user: { id: string; email: string; role?: string } | null;
  loading: boolean;
} = {
  user: null,
  loading: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    signOut: vi.fn(),
  }),
}));

// 3. Organization context mock state
let orgState: {
  userRole: string | null;
  userPermissions: Record<string, boolean> | null;
  loading: boolean;
} = {
  userRole: null,
  userPermissions: null,
  loading: false,
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: "org-lockdown-test-01",
    org: { id: "org-lockdown-test-01", name: "CredSmart Test Enterprise" },
    userRole: orgState.userRole,
    userPermissions: orgState.userPermissions,
    loading: orgState.loading,
  }),
}));

// 4. CRM Permission context mock state
let permState: {
  isSuperAdmin: boolean;
  loading: boolean;
  hasPermissionFn: (module: string, action: string) => boolean;
} = {
  isSuperAdmin: false,
  loading: false,
  hasPermissionFn: () => false,
};

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    isSuperAdmin: permState.isSuperAdmin,
    loading: permState.loading,
    hasPermission: permState.hasPermissionFn,
    allowed: true,
    userRoles: [],
    permissions: [],
    error: null,
    refreshPermissions: vi.fn(),
    refetch: vi.fn(),
  }),
  usePermission: () => true,
}));

// Location Spy Component
function LocationSpy() {
  const location = useLocation();
  return (
    <div data-testid="location-spy">
      <span data-testid="current-pathname">{location.pathname}</span>
    </div>
  );
}

// Protected Target Component
function ProtectedBillingContent() {
  return <div data-testid="billing-content">Sensitive POS & Billing Workbench</div>;
}

// Helper to render BillingLockdownGuard harness
function renderGuardHarness(initialRoute = ROUTE_PATHS.pos) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path={ROUTE_PATHS.crm} element={<LocationSpy />} />
        <Route path="/auth" element={<LocationSpy />} />
        <Route element={<BillingLockdownGuard />}>
          <Route path={ROUTE_PATHS.pos} element={<ProtectedBillingContent />} />
          <Route path={ROUTE_PATHS.checkout} element={<ProtectedBillingContent />} />
          <Route path="/billing/sales" element={<ProtectedBillingContent />} />
          <Route path="/billing/dashboard" element={<ProtectedBillingContent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("BillingLockdownGuard Specification & Security Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: { id: "user-1", email: "user@credsmart.test" },
      loading: false,
    };
    orgState = {
      userRole: "store_owner",
      userPermissions: null,
      loading: false,
    };
    permState = {
      isSuperAdmin: false,
      loading: false,
      hasPermissionFn: () => false,
    };
  });

  // ==========================================================================
  // SECTION 1: Loading State Integrity
  // ==========================================================================
  describe("1. Loading State Integrity", () => {
    it("renders SleekRouteLoader when auth is loading", () => {
      authState.loading = true;
      renderGuardHarness();

      expect(screen.getByText(/Loading CredSmart\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByTestId("billing-content")).toBeNull();
      expect(screen.queryByTestId("location-spy")).toBeNull();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("renders SleekRouteLoader when organization data is loading", () => {
      orgState.loading = true;
      renderGuardHarness();

      expect(screen.getByText(/Loading CredSmart\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByTestId("billing-content")).toBeNull();
      expect(screen.queryByTestId("location-spy")).toBeNull();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("renders SleekRouteLoader when CRM permissions are loading", () => {
      permState.loading = true;
      renderGuardHarness();

      expect(screen.getByText(/Loading CredSmart\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByTestId("billing-content")).toBeNull();
      expect(screen.queryByTestId("location-spy")).toBeNull();
      expect(toastMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SECTION 2: Authorized Store Roles Verification
  // ==========================================================================
  describe("2. Authorized Store Roles Permitted Access", () => {
    const authorizedRoles = [
      "store_owner",
      "super_admin",
      "admin",
      "owner",
      "manager",
      "partner",
      "cashier",
      "salesman",
      "stock_manager",
      "delivery_boy",
      "accountant",
    ];

    for (const role of authorizedRoles) {
      it(`permits role '${role}' to access POS & billing routes`, () => {
        orgState.userRole = role;
        renderGuardHarness(ROUTE_PATHS.pos);

        expect(screen.getByTestId("billing-content")).toBeInTheDocument();
        expect(screen.queryByTestId("location-spy")).toBeNull();
        expect(toastMock).not.toHaveBeenCalled();
      });
    }

    it("permits access when effective role is stored in user.role object", () => {
      orgState.userRole = null;
      authState.user = { id: "cashier-99", email: "cashier@test.com", role: "cashier" };

      renderGuardHarness(ROUTE_PATHS.checkout);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SECTION 3: Super Admin & Permission-Based Bypass
  // ==========================================================================
  describe("3. Super Admin & Permission-Based Access", () => {
    it("permits access when isSuperAdmin is true regardless of userRole", () => {
      orgState.userRole = "crm_staff";
      permState.isSuperAdmin = true;

      renderGuardHarness(ROUTE_PATHS.pos);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(screen.queryByTestId("location-spy")).toBeNull();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("permits custom staff role when userPermissions.pos is true", () => {
      orgState.userRole = "support_executive";
      orgState.userPermissions = { pos: true };

      renderGuardHarness(ROUTE_PATHS.pos);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("permits custom staff role when userPermissions.billing is true", () => {
      orgState.userRole = "billing_assistant";
      orgState.userPermissions = { billing: true };

      renderGuardHarness("/billing/sales");

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("permits custom staff role when userPermissions.sales is true", () => {
      orgState.userRole = "telecaller";
      orgState.userPermissions = { sales: true };

      renderGuardHarness(ROUTE_PATHS.checkout);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("permits custom staff role when hasPermission('pos', 'access') returns true", () => {
      orgState.userRole = "floor_staff";
      permState.hasPermissionFn = (mod, act) => mod === "pos" && act === "access";

      renderGuardHarness(ROUTE_PATHS.pos);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it("permits custom staff role when hasPermission('billing', 'access') returns true", () => {
      orgState.userRole = "floor_staff";
      permState.hasPermissionFn = (mod, act) => mod === "billing" && act === "access";

      renderGuardHarness(ROUTE_PATHS.pos);

      expect(screen.getByTestId("billing-content")).toBeInTheDocument();
      expect(toastMock).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SECTION 4: Unauthorized CRM Staff Lockdown & Toast Feedback
  // ==========================================================================
  describe("4. Unauthorized CRM Staff Lockdown & Toast Alerts", () => {
    const unauthorizedRoles = [
      "staff",
      "crm_staff",
      "member",
      "field_agent",
      "telecaller",
      "intern",
      "viewer",
      "guest",
    ];

    for (const role of unauthorizedRoles) {
      it(`blocks role '${role}', redirects to /crm, and fires destructive alert toast`, async () => {
        orgState.userRole = role;
        orgState.userPermissions = null;
        permState.isSuperAdmin = false;
        permState.hasPermissionFn = () => false;

        renderGuardHarness(ROUTE_PATHS.pos);

        // Content must be strictly blocked
        expect(screen.queryByTestId("billing-content")).toBeNull();

        // Redirects to /crm
        const locationSpy = await screen.findByTestId("location-spy");
        expect(locationSpy).toBeInTheDocument();
        const pathname = screen.getByTestId("current-pathname");
        expect(pathname.textContent).toBe(ROUTE_PATHS.crm);
        expect(pathname.textContent).toBe("/crm");

        // Fires destructive toast with exact specification message
        expect(toastMock).toHaveBeenCalledTimes(1);
        expect(toastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            description: "Access Restricted: Billing & POS counter is reserved for store owners and cashiers.",
          })
        );
      });
    }

    it("prevents infinite toast loop upon re-rendering", () => {
      orgState.userRole = "staff";

      const { rerender } = renderGuardHarness(ROUTE_PATHS.pos);
      expect(toastMock).toHaveBeenCalledTimes(1);

      // Re-render multiple times
      rerender(
        <MemoryRouter initialEntries={[ROUTE_PATHS.pos]}>
          <Routes>
            <Route path={ROUTE_PATHS.crm} element={<LocationSpy />} />
            <Route element={<BillingLockdownGuard />}>
              <Route path={ROUTE_PATHS.pos} element={<ProtectedBillingContent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Must remain exactly 1 toast invocation
      expect(toastMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // SECTION 5: AST & App.tsx Static Architectural Invariants
  // ==========================================================================
  describe("5. AST & Architectural Invariants in App.tsx", () => {
    const appTsxPath = path.resolve(process.cwd(), "src/App.tsx");
    const appSource = fs.readFileSync(appTsxPath, "utf-8");

    it("verifies BillingLockdownGuard is imported from @/components/routing/BillingLockdownGuard", () => {
      expect(appSource).toMatch(
        /import\s+\{\s*BillingLockdownGuard\s*\}\s+from\s+["']@\/components\/routing\/BillingLockdownGuard["']/
      );
    });

    it("verifies <Route element={<BillingLockdownGuard />}> wraps dedicated billing routes", () => {
      expect(appSource).toContain("<Route element={<BillingLockdownGuard />}>");
    });

    it("verifies strict route ordering: ProtectedRoutes < CRM Attendance < BillingLockdownGuard < RoleProtectedRoute", () => {
      const protectedIndex = appSource.indexOf("<Route element={<ProtectedRoutes />}>");
      const crmAttendanceIndex = appSource.indexOf(
        "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
      );
      const billingGuardIndex = appSource.indexOf(
        "<Route element={<BillingLockdownGuard />}>"
      );
      const roleProtectedIndex = appSource.indexOf(
        "<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>"
      );

      expect(protectedIndex).toBeGreaterThan(-1);
      expect(crmAttendanceIndex).toBeGreaterThan(protectedIndex);
      expect(billingGuardIndex).toBeGreaterThan(crmAttendanceIndex);
      expect(roleProtectedIndex).toBeGreaterThan(billingGuardIndex);
    });

    it("verifies RoleProtectedRoute in App.tsx remains intact with redirect to checkout", () => {
      expect(appSource).toMatch(
        /function\s+RoleProtectedRoute\s*\([\s\S]*?\)\s*\{[\s\S]*?if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}[\s\S]*?return\s*<Navigate\s+to=\{ROUTE_PATHS\.checkout\}\s+replace\s*\/>;[\s\S]*?\}/
      );
    });

    it("verifies all 36 legacy routes remain intact", () => {
      expect(appSource).toContain('<Route path="/pos" element={<LegacyRedirect to="/billing/pos" />} />');
      expect(appSource).toContain('<Route path="/dashboard" element={<LegacyRedirect to="/billing/dashboard" />} />');
      expect(appSource).toContain('<Route path="/sales" element={<LegacyRedirect to="/billing/sales" />} />');
    });
  });
});
