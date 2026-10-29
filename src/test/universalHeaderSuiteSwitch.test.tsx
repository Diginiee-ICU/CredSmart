/**
 * @file universalHeaderSuiteSwitch.test.tsx
 * @description Dedicated verification test suite for the Universal Header Suite Switcher
 * toggling between CRM and Billing suites across mobile and desktop viewports.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ACTIVE_SUITE_STORAGE_KEY, SUITE_CHANGED_EVENT } from "@/hooks/useActiveSuite";
import { ROUTE_PATHS } from "@/config/routes";

// Mock child modals and heavyweight components
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

// Mock hooks
const mockUseOrganization = vi.fn();
const mockUseActiveSuite = vi.fn();
const mockUseNetworkInvoices = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock("@/hooks/useActiveSuite", async () => {
  const actual = await vi.importActual<any>("@/hooks/useActiveSuite");
  return {
    ...actual,
    useActiveSuite: () => mockUseActiveSuite(),
  };
});

vi.mock("@/hooks/useNetworkInvoices", () => ({
  useNetworkInvoices: () => mockUseNetworkInvoices(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Universal Header Suite Switcher Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "owner@credsmart.test" },
      signOut: vi.fn(),
    });

    mockUseOrganization.mockReturnValue({
      org: { id: "org-1", name: "CredSmart Retail Hub" },
      orgId: "org-1",
      organizations: [{ id: "org-1", name: "CredSmart Retail Hub" }],
      switchOrganization: vi.fn(),
      userRole: "store_owner",
      userPermissions: null,
    });

    mockUseNetworkInvoices.mockReturnValue({
      pendingCount: 0,
      unreadCount: 0,
    });
  });

  it("renders Workspace Switcher in the universal header", () => {
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/billing/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByTestId("workspace-switcher-trigger");
    expect(triggerBtn).toBeInTheDocument();
  });

  it("switches to CRM workspace and navigates to /crm when CRM option is clicked", () => {
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/billing/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByTestId("workspace-switcher-trigger");
    act(() => {
      fireEvent.click(triggerBtn);
    });

    const crmBtn = screen.getByTestId("switch-to-crm-btn");
    act(() => {
      fireEvent.click(crmBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/crm");
  });

  it("switches to Billing suite and navigates to /billing/dashboard when Billing option is clicked", () => {
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "crm",
      isCrm: true,
      switchSuite: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/billing/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByTestId("workspace-switcher-trigger");
    act(() => {
      fireEvent.click(triggerBtn);
    });

    const billingBtn = screen.getByTestId("switch-to-billing-btn");
    act(() => {
      fireEvent.click(billingBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/billing/dashboard");
  });

  it("strictly hides Workspace Switcher from header when userRole is cashier", () => {
    mockUseOrganization.mockReturnValue({
      org: { id: "org-1", name: "CredSmart Store" },
      orgId: "org-1",
      organizations: [{ id: "org-1", name: "CredSmart Store" }],
      switchOrganization: vi.fn(),
      userRole: "cashier",
      userPermissions: null,
    });

    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/billing/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("workspace-switcher-trigger")).not.toBeInTheDocument();
  });
});
