import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { BillingLockdownGuard, SleekRouteLoader } from "@/components/routing/BillingLockdownGuard";
import * as authHook from "@/hooks/useAuth";
import * as orgHook from "@/hooks/useOrganization";
import * as toastHook from "@/hooks/use-toast";

vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useOrganization");
vi.mock("@/hooks/use-toast");

describe("BillingLockdownGuard (Decoupled Store Role Guard & Self-Healing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  describe("1. Loading State Presentation", () => {
    it("renders SleekRouteLoader when authentication or organization is loading", () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: null,
        loading: true,
      } as any);
      vi.spyOn(orgHook, "useOrganization").mockReturnValue({
        userRole: null,
        userPermissions: null,
        loading: false,
      } as any);

      render(
        <MemoryRouter initialEntries={["/billing/pos"]}>
          <Routes>
            <Route element={<BillingLockdownGuard />}>
              <Route path="/billing/pos" element={<div>Protected POS Terminal</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Loading CredSmart...")).toBeDefined();
      expect(screen.queryByText("Protected POS Terminal")).toBeNull();
    });
  });

  describe("2. Self-Healing Mechanism", () => {
    it("automatically self-heals credsmart_launch_portal_active in sessionStorage on direct navigation", () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: { id: "user-123", email: "cashier@credsmart.store" },
        loading: false,
      } as any);
      vi.spyOn(orgHook, "useOrganization").mockReturnValue({
        userRole: "cashier",
        userPermissions: { pos: true },
        loading: false,
      } as any);

      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBeNull();

      render(
        <MemoryRouter initialEntries={["/billing/pos"]}>
          <Routes>
            <Route element={<BillingLockdownGuard />}>
              <Route path="/billing/pos" element={<div>Protected POS Terminal</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      // Verify self-healing populated the session flag
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
      expect(screen.getByText("Protected POS Terminal")).toBeDefined();
    });
  });

  describe("3. Permitted Store Roles Access", () => {
    const validRoles = [
      "store_owner",
      "cashier",
      "salesman",
      "owner",
      "super_admin",
      "manager",
      "partner",
      "stock_manager",
      "accountant",
    ];

    validRoles.forEach((role) => {
      it(`grants full billing access to valid store role: ${role}`, () => {
        vi.spyOn(authHook, "useAuth").mockReturnValue({
          user: { id: `user-${role}`, email: `${role}@credsmart.store` },
          loading: false,
        } as any);
        vi.spyOn(orgHook, "useOrganization").mockReturnValue({
          userRole: role,
          userPermissions: {},
          loading: false,
        } as any);

        const { unmount } = render(
          <MemoryRouter initialEntries={["/billing/dashboard"]}>
            <Routes>
              <Route element={<BillingLockdownGuard />}>
                <Route path="/billing/dashboard" element={<div>Retail Dashboard Outlet</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        );

        expect(screen.getByText("Retail Dashboard Outlet")).toBeDefined();
        unmount();
      });
    });
  });

  describe("4. Restricted Access & CRM Redirection", () => {
    it("redirects unauthorized users to /crm and fires access warning toast", () => {
      const toastSpy = vi.fn();
      vi.spyOn(toastHook, "toast").mockImplementation(toastSpy);

      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: { id: "user-unauth", email: "visitor@credsmart.store" },
        loading: false,
      } as any);
      vi.spyOn(orgHook, "useOrganization").mockReturnValue({
        userRole: "crm_intern", // Not in allowedStoreRoles and no POS permissions
        userPermissions: { pos: false, sales: false },
        loading: false,
      } as any);

      render(
        <MemoryRouter initialEntries={["/billing/pos"]}>
          <Routes>
            <Route element={<BillingLockdownGuard />}>
              <Route path="/billing/pos" element={<div>Protected POS Terminal</div>} />
            </Route>
            <Route path="/crm" element={<div>Redirected to CRM Hub</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText("Protected POS Terminal")).toBeNull();
      expect(screen.getByText("Redirected to CRM Hub")).toBeDefined();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Access Restricted",
          variant: "destructive",
        })
      );
    });
  });
});
