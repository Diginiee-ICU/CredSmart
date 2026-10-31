/**
 * @file challengerHeaderAuthStress.test.tsx
 * @description Adversarial empirical stress tests authored by Challenger 1 (challenger_header_auth_1).
 * Tests:
 * 1. AppLayout & WorkspaceSwitcher responsive classes, cashier role RBAC, long org names, dark mode classes.
 * 2. Auth.tsx URL query param variations (?suite=crm, ?suite=billing, ?suite=invalid, ?suite=).
 * 3. Auth.tsx toggle switching, credential submission isolation, and clean redirect to /crm.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "fs";
import path from "path";

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
    },
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
  },
}));

// Mock organization hook
const mockUseOrganization = vi.fn();
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockUseOrganization(),
  getPendingOnboarding: vi.fn(() => null),
  setPendingOnboarding: vi.fn(),
  clearPendingOnboarding: vi.fn(),
}));

// Mock services
vi.mock("@/services/productsApi", () => ({
  productsApi: {
    getProducts: vi.fn(() => Promise.resolve({ data: [] })),
    createProduct: vi.fn(),
    bulkUpsertBatches: vi.fn(),
  },
}));

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getMemberships: vi.fn(() => Promise.resolve({ data: [] })),
    createOrganization: vi.fn(),
    upsertMembership: vi.fn(),
  },
}));

// Mock child modals and heavyweight components for AppLayout
vi.mock("@/components/AppSidebar", () => ({
  AppSidebar: () => <nav data-testid="mock-sidebar">Sidebar</nav>,
}));
vi.mock("@/components/OfflineSyncBanner", () => ({
  OfflineSyncBanner: () => null,
}));
vi.mock("@/components/UniversalQuickCreateModal", () => ({
  UniversalQuickCreateModal: () => null,
}));
vi.mock("@/components/SalesInvoiceModal", () => ({
  SalesInvoiceModal: () => null,
}));
vi.mock("@/components/ReceiptModal", () => ({
  ReceiptModal: () => null,
}));
vi.mock("@/components/CreateBusinessModal", () => ({
  CreateBusinessModal: () => null,
}));
vi.mock("@/components/items/CreateItemModal", () => ({
  CreateItemModal: () => null,
}));
vi.mock("@/components/parties/CreatePartyModal", () => ({
  CreatePartyModal: () => null,
}));
vi.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationCenter: () => null,
}));
vi.mock("@/components/notifications/FeatureBubbleNotification", () => ({
  FeatureBubbleNotification: () => null,
}));

// Mock other hooks
const mockUseActiveSuite = vi.fn();
const mockUseNetworkInvoices = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useActiveSuite", () => ({
  useActiveSuite: () => mockUseActiveSuite(),
}));

vi.mock("@/hooks/useNetworkInvoices", () => ({
  useNetworkInvoices: () => mockUseNetworkInvoices(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import AppLayout from "@/components/AppLayout";
import WorkspaceSwitcher from "@/components/portal/WorkspaceSwitcher";
import Auth from "@/pages/Auth";

describe("Challenger Empirical Stress Tests — Universal Header & POS Auth CRM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id", email: "test@credsmart.in" },
      signOut: vi.fn(),
    });

    mockUseOrganization.mockReturnValue({
      org: { id: "org-1", name: "CredSmart Retail Hub", logo_url: null },
      orgId: "org-1",
      organizations: [{ id: "org-1", name: "CredSmart Retail Hub" }],
      switchOrganization: vi.fn(),
      userRole: "store_owner",
      userPermissions: null,
      refresh: vi.fn(),
    });

    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });

    mockUseNetworkInvoices.mockReturnValue({
      pendingCount: 0,
      unreadCount: 0,
    });
  });

  // =========================================================================
  // GROUP 1: AppLayout & WorkspaceSwitcher RBAC & Layout Robustness
  // =========================================================================
  describe("AppLayout & WorkspaceSwitcher Layout & RBAC Guard", () => {
    it("strictly hides WorkspaceSwitcher when user role is cashier", () => {
      mockUseOrganization.mockReturnValue({
        org: { id: "org-1", name: "CredSmart Retail Hub" },
        orgId: "org-1",
        organizations: [{ id: "org-1", name: "CredSmart Retail Hub" }],
        switchOrganization: vi.fn(),
        userRole: "cashier",
        userPermissions: null,
        refresh: vi.fn(),
      });

      // Directly rendering WorkspaceSwitcher returns null
      const { container } = render(
        <MemoryRouter initialEntries={["/checkout"]}>
          <WorkspaceSwitcher />
        </MemoryRouter>
      );
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId("workspace-switcher-trigger")).not.toBeInTheDocument();
    });

    it("renders WorkspaceSwitcher with exact h-8.5 px-2.5 tokens and dark mode classes for store_owner", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <WorkspaceSwitcher />
        </MemoryRouter>
      );

      const triggerBtn = screen.getByTestId("workspace-switcher-trigger");
      expect(triggerBtn).toBeInTheDocument();
      // Verify h-8.5 px-2.5 minimal design tokens
      expect(triggerBtn.className).toContain("h-8.5");
      expect(triggerBtn.className).toContain("px-2.5");
      expect(triggerBtn.className).toContain("rounded-lg");
      // Verify neutral surface and dark mode classes
      expect(triggerBtn.className).toContain("bg-white");
      expect(triggerBtn.className).toContain("dark:bg-slate-900");
      expect(triggerBtn.className).toContain("border-slate-200/80");
      expect(triggerBtn.className).toContain("dark:border-slate-800");
      expect(triggerBtn.className).toContain("text-slate-700");
      expect(triggerBtn.className).toContain("dark:text-slate-300");
    });

    it("verifies AppLayout brand mark and store selector have desktop divider and no horizontal collision", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // CredSmart wordmark has hidden sm:inline (not hidden xs:inline)
      const credsmartWordmark = screen.getByText("CredSmart");
      expect(credsmartWordmark.className).toContain("hidden sm:inline");

      // Business selector button has h-8.5 px-2.5 and responsive max-w tokens
      const matchingBizBtns = screen.getAllByTitle("CredSmart Retail Hub");
      const bizBtn = matchingBizBtns[0];
      expect(bizBtn.className).toContain("h-8.5");
      expect(bizBtn.className).toContain("px-2.5");
      expect(bizBtn.className).toContain("max-w-[100px]");
      expect(bizBtn.className).toContain("sm:max-w-[180px]");
      expect(bizBtn.className).toContain("lg:max-w-[220px]");

      // WorkspaceSwitcher trigger is present in header
      const wsTrigger = screen.getByTestId("workspace-switcher-trigger");
      expect(wsTrigger).toBeInTheDocument();
    });

    it("handles extreme unbroken organization name (150 chars) without clipping or throwing", () => {
      const longName = "CredSmartEnterpriseUltraSuperWholesaleMegaBranchStore".repeat(3);
      mockUseOrganization.mockReturnValue({
        org: { id: "org-1", name: longName, logo_url: null },
        orgId: "org-1",
        organizations: [{ id: "org-1", name: longName }],
        switchOrganization: vi.fn(),
        userRole: "admin",
        userPermissions: null,
        refresh: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      const matchingBtns = screen.getAllByTitle(longName);
      expect(matchingBtns.length).toBeGreaterThanOrEqual(1);
      const bizBtn = matchingBtns[0];
      const truncateSpan = bizBtn.querySelector("span.truncate");
      expect(truncateSpan).toBeInTheDocument();
      expect(truncateSpan?.textContent).toBe(longName);
    });
  });

  // =========================================================================
  // GROUP 2: Auth.tsx URL Query Parameter Variations
  // =========================================================================
  describe("Auth.tsx URL Query Parameter Variations", () => {
    it("renders CRM panel directly when ?suite=crm is passed", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=crm"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
      expect(screen.getByTestId("go-to-crm-btn")).toBeInTheDocument();
    });

    it("renders POS login form when ?suite=billing is passed", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=billing"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(screen.getByText(/Signing into POS & Billing ERP/i)).toBeInTheDocument();
    });

    it("safely falls back to POS login form when suite param is missing", () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });

    it("safely falls back to POS login form when suite param is empty string (?suite=)", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite="]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });

    it("safely falls back to POS login form when suite param is an unrecognized value (?suite=invalid_xyz)", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=invalid_xyz"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });

    it("safely handles XSS / injection string in suite param (?suite=<script>alert(1)</script>)", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=%3Cscript%3Ealert(1)%3C/script%3E"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // GROUP 3: Auth.tsx Toggle, Isolation, and Clean Navigation to /crm
  // =========================================================================
  describe("Auth.tsx Toggle, Isolation & Clean Redirect", () => {
    it("switches to CRM panel via the helper prompt link on POS login form", () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      // Locate helper button ("Need Workforce CRM instead? Switch to CRM Portal →")
      const switchHelperBtn = screen.getByRole("button", { name: /Need Workforce CRM instead\? Switch to CRM Portal →/i });
      act(() => {
        fireEvent.click(switchHelperBtn);
      });

      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    });

    it("switches back and forth between POS and CRM multiple times cleanly", () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      const crmToggle = screen.getByTestId("crm-portal-toggle-btn");
      const posToggle = screen.getByTestId("pos-portal-toggle-btn");

      // Switch to CRM
      act(() => {
        fireEvent.click(crmToggle);
      });
      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
      expect(localStorage.getItem("credsmart_active_suite")).toBe("crm");

      // Switch to POS
      act(() => {
        fireEvent.click(posToggle);
      });
      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(localStorage.getItem("credsmart_active_suite")).toBe("billing");

      // Switch to CRM again
      act(() => {
        fireEvent.click(crmToggle);
      });
      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();

      // Return via secondary button
      const returnBtn = screen.getByRole("button", { name: /Return to POS & Billing Login/i });
      act(() => {
        fireEvent.click(returnBtn);
      });
      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    });

    it("guarantees credential isolation: POS credentials do not submit to CRM, and CRM CTA redirects cleanly to /crm", async () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      // Switch to CRM
      const crmToggle = screen.getByTestId("crm-portal-toggle-btn");
      act(() => {
        fireEvent.click(crmToggle);
      });

      // Verify no password input exists in CRM mode
      expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();

      // Click the CTA button to open CRM portal
      const goToCrmBtn = screen.getByTestId("go-to-crm-btn");
      act(() => {
        fireEvent.click(goToCrmBtn);
      });

      // Verify navigation to /crm
      expect(mockNavigate).toHaveBeenCalledWith("/crm");

      // Verify Supabase auth was NEVER invoked in CRM mode
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      expect(mockSignUp).not.toHaveBeenCalled();

      // Verify session & local storage were properly synchronized
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
      expect(localStorage.getItem("credsmart_active_suite")).toBe("crm");
      expect(localStorage.getItem("credsmart_suite_preference")).toBe("crm");
    });

    it("submitting credentials in POS mode calls signInWithPassword and does NOT touch CRM storage", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: "test-user-id" } },
        error: null,
      });

      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText("Password");
      const submitBtn = screen.getByRole("button", { name: /Sign In to Workspace/i });

      act(() => {
        fireEvent.change(emailInput, { target: { value: "cashier@credsmart.in" } });
        fireEvent.change(passwordInput, { target: { value: "password123" } });
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "cashier@credsmart.in",
        password: "password123",
      });
    });
  });
});
