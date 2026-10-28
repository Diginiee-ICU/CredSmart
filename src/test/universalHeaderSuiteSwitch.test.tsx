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

  it("renders Suite Switcher with Billing and CRM buttons in the universal header", () => {
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

    const billingBtn = screen.getByTestId("suite-btn-billing");
    const crmBtn = screen.getByTestId("suite-btn-crm");

    expect(billingBtn).toBeInTheDocument();
    expect(crmBtn).toBeInTheDocument();
    expect(billingBtn).toHaveAttribute("aria-checked", "true");
    expect(crmBtn).toHaveAttribute("aria-checked", "false");
  });

  it("switches to CRM suite and navigates to /crm when CRM button is clicked", () => {
    const switchSuiteMock = vi.fn();
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: switchSuiteMock,
    });

    render(
      <MemoryRouter initialEntries={["/billing/dashboard"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const crmBtn = screen.getByTestId("suite-btn-crm");
    act(() => {
      fireEvent.click(crmBtn);
    });

    expect(switchSuiteMock).toHaveBeenCalledWith("crm");
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.crm);
  });

  it("switches to Billing suite and navigates to /billing/dashboard when Billing button is clicked", () => {
    const switchSuiteMock = vi.fn();
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "crm",
      isCrm: true,
      switchSuite: switchSuiteMock,
    });

    render(
      <MemoryRouter initialEntries={["/crm/attendance"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const billingBtn = screen.getByTestId("suite-btn-billing");
    act(() => {
      fireEvent.click(billingBtn);
    });

    expect(switchSuiteMock).toHaveBeenCalledWith("billing");
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.dashboard);
  });

  it("strictly hides Suite Switcher from header when userRole is cashier", () => {
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

    expect(screen.queryByTestId("suite-btn-billing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("suite-btn-crm")).not.toBeInTheDocument();
  });
});
