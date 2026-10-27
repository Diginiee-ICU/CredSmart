import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CRMDashboard from "@/pages/crm/CRMDashboard";
import { ROUTE_PATHS, ACTIVE_SUITE_STORAGE_KEY } from "@/config/routes";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockOrgState: {
  orgId: string | null;
  org: { id: string; name: string } | null;
  organizations: Array<{ id: string; name: string }>;
  switchOrganization: (id: string) => void;
  userRole: string | null;
} = {
  orgId: "org-credsmart-001",
  org: { id: "org-credsmart-001", name: "CredSmart Retail Hub" },
  organizations: [
    { id: "org-credsmart-001", name: "CredSmart Retail Hub" },
  ],
  switchOrganization: vi.fn(),
  userRole: "store_owner",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrgState.orgId,
    org: mockOrgState.org,
    organizations: mockOrgState.organizations,
    switchOrganization: mockOrgState.switchOrganization,
    userRole: mockOrgState.userRole,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ data: [], count: 0, error: null }),
          neq: () => Promise.resolve({ data: [], count: 0, error: null }),
          then: (res: any) => Promise.resolve({ data: [], count: 0, error: null }).then(res),
        }),
        then: (res: any) => Promise.resolve({ data: [], count: 0, error: null }).then(res),
      }),
    }),
  },
}));

describe("CRMDashboard Mobile Suite Switcher Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockOrgState.userRole = "store_owner";
  });

  it("routes 'POS' button in CRM mobile top bar to billing home page (/billing/dashboard)", () => {
    render(
      <MemoryRouter>
        <CRMDashboard />
      </MemoryRouter>
    );

    const posButton = screen.getByTestId("crm-mobile-suite-billing");
    expect(posButton).toBeInTheDocument();
    expect(posButton).toHaveTextContent("POS");

    fireEvent.click(posButton);

    // Verify suite state is synced
    expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");

    // Verify navigation routes to Billing Home Page (ROUTE_PATHS.dashboard)
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.dashboard);
  });

  it("routes cashier role to ROUTE_PATHS.pos if cashier ever accesses switcher", () => {
    mockOrgState.userRole = "cashier";

    render(
      <MemoryRouter>
        <CRMDashboard />
      </MemoryRouter>
    );

    const posButton = screen.getByTestId("crm-mobile-suite-billing");
    fireEvent.click(posButton);

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.pos);
  });
});
