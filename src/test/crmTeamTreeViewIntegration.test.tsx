/**
 * @file crmTeamTreeViewIntegration.test.tsx
 * @description Integration test suite for Team Tree View, collapsible drop-down chevrons,
 * user details inspector, and Reports To hierarchy selector inside RoleManagement.tsx.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoleManagement from "@/pages/crm/RoleManagement";
import { crmApi } from "@/services/crmApi";
import { settingsApi } from "@/services/settingsApi";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-tree-test-store",
  name: "CredSmart Tree Flagship",
};

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "store_owner",
  }),
}));

const mockCurrentUser = {
  id: "user-admin-999",
  email: "owner@credsmart.online",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    isSuperAdmin: true,
    hasPermission: () => true,
    loading: false,
    refreshPermissions: vi.fn(),
    userRoles: [{ id: "role-super-admin", name: "Super Admin", is_super_admin: true }],
  }),
  usePermission: () => ({ allowed: true, loading: false }),
}));

vi.mock("@/services/crmApi", () => {
  const roles = [
    {
      id: "role-super-admin",
      org_id: "org-tree-test-store",
      name: "Super Admin",
      color: "#1D4ED8",
      icon: "Crown",
      is_super_admin: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "role-operations",
      org_id: "org-tree-test-store",
      name: "Operations Lead",
      color: "#4F46E5",
      icon: "Users",
      is_super_admin: false,
      created_at: "2026-01-02T00:00:00Z",
    },
  ];

  return {
    crmApi: {
      getCRMRoles: vi.fn().mockResolvedValue({ data: roles, error: null }),
      createCRMRole: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateCRMRole: vi.fn().mockResolvedValue({ data: {}, error: null }),
      deleteCRMRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMPermissions: vi.fn().mockResolvedValue({ data: [], error: null }),
      deleteCRMPermissionsByRoleId: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      insertCRMPermissions: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMStaffRoles: vi.fn().mockResolvedValue({
        data: [
          { staff_id: "user-existing-1", role_id: "role-operations", assigned_by: "user-admin-999" },
        ],
        error: null,
      }),
      assignCRMStaffRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      deleteCRMStaffRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      provisionStaffUser: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          data: {
            success: true,
            user: {
              id: "user-newly-provisioned-202",
              email: payload.email,
              full_name: payload.full_name,
              phone: payload.phone || "9876543210",
              store_role: payload.store_role,
              crm_role_id: payload.crm_role_id,
            },
            credentials: {
              email: payload.email,
              password: payload.password,
            },
          },
          error: null,
        })
      ),
    },
  };
});

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getMemberships: vi.fn().mockResolvedValue({
      data: [
        {
          id: "mem-owner",
          user_id: "user-admin-999",
          role: "store_owner",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "mem-1",
          user_id: "user-existing-1",
          role: "manager",
          created_at: "2026-01-02T00:00:00Z",
        },
        {
          id: "mem-2",
          user_id: "user-existing-2",
          role: "cashier",
          created_at: "2026-01-03T00:00:00Z",
        },
      ],
      error: null,
    }),
    getProfiles: vi.fn().mockResolvedValue({
      data: [
        { id: "user-admin-999", full_name: "Super Admin Owner", email: "owner@credsmart.online" },
        { id: "user-existing-1", full_name: "Ramesh Lead", email: "ramesh@credsmart.online" },
        { id: "user-existing-2", full_name: "Sneha Associate", email: "sneha@credsmart.online" },
      ],
      error: null,
    }),
  },
}));

describe("RoleManagement Team Tree View Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("1. Toggles between List View and Team Tree View seamlessly", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    // Initial view is List View
    expect(screen.getByRole("button", { name: /List View/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Team Tree View/i })).toBeInTheDocument();

    // Staff roster in list view
    await screen.findByText("Ramesh Lead");

    // Click "Team Tree View"
    const treeTabBtn = screen.getByRole("button", { name: /Team Tree View/i });
    fireEvent.click(treeTabBtn);

    // Tree View rendered
    expect(screen.getAllByText(/Team Hierarchy/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ORGANIZATION STRUCTURE")).toBeInTheDocument();

    // Verify Expand All and Collapse All buttons are present
    expect(screen.getByRole("button", { name: /Expand All/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Collapse All/i })).toBeInTheDocument();

    // Switch back to List View
    const listTabBtn = screen.getByRole("button", { name: /List View/i });
    fireEvent.click(listTabBtn);
    expect(screen.getByText("Ramesh Lead")).toBeInTheDocument();
  }, 15000);

  it("2. In Tree View: Drop down buttons collapse and expand sub-teams to save space", async () => {
    // Setup hierarchy in localStorage: Sneha Associate reports to Ramesh Lead
    localStorage.setItem(
      `credsmart_crm_team_hierarchy_${mockOrg.id}`,
      JSON.stringify({
        "user-existing-1": "user-admin-999",
        "user-existing-2": "user-existing-1",
      })
    );

    const { container } = render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    // Switch to Tree View
    const treeTabBtn = await screen.findByRole("button", { name: /Team Tree View/i });
    fireEvent.click(treeTabBtn);

    // Wait for tree container
    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    expect(treeContainer).toBeDefined();

    // Ramesh Lead and Sneha Associate are both visible in tree
    await waitFor(() => {
      expect(within(treeContainer as HTMLElement).getByText("Ramesh Lead")).toBeInTheDocument();
      expect(within(treeContainer as HTMLElement).getByText("Sneha Associate")).toBeInTheDocument();
    }, 15000);

    // Locate Ramesh Lead's node and click drop down button
    const rameshNode = within(treeContainer as HTMLElement).getByText("Ramesh Lead").closest(".group");
    expect(rameshNode).toBeDefined();

    const dropdownBtn = within(rameshNode!).getByRole("button", { name: /Collapse sub-team/i });
    fireEvent.click(dropdownBtn);

    // Sneha Associate is collapsed (saved space)
    expect(within(treeContainer as HTMLElement).queryByText("Sneha Associate")).not.toBeInTheDocument();

    // Expand again
    const expandBtn = within(rameshNode!).getByRole("button", { name: /Expand sub-team/i });
    fireEvent.click(expandBtn);
    expect(within(treeContainer as HTMLElement).getByText("Sneha Associate")).toBeInTheDocument();
  }, 15000);

  it("3. In Tree View: Clicking user name displays their details and team working under them", async () => {
    localStorage.setItem(
      `credsmart_crm_team_hierarchy_${mockOrg.id}`,
      JSON.stringify({
        "user-existing-1": "user-admin-999",
        "user-existing-2": "user-existing-1",
      })
    );

    const { container } = render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const treeTabBtn = await screen.findByRole("button", { name: /Team Tree View/i });
    fireEvent.click(treeTabBtn);

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    const inspectorContainer = container.querySelector(".lg\\:col-span-5")!;

    // Click Ramesh Lead in tree
    const rameshInTree = await waitFor(() => within(treeContainer as HTMLElement).getByText("Ramesh Lead"));
    fireEvent.click(rameshInTree);

    // Inspector shows details and Sneha Associate working under Ramesh Lead
    await waitFor(() => {
      expect(within(inspectorContainer as HTMLElement).getByText("Team Members Under Ramesh Lead")).toBeInTheDocument();
      expect(within(inspectorContainer as HTMLElement).getByText("Sneha Associate")).toBeInTheDocument();
    });
  }, 15000);

  it("4. Add Staff Modal contains 'Reports To (Team Hierarchy)' selector", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
    fireEvent.click(addStaffBtn);

    // Modal opens
    expect(screen.getByText("Provision New Staff User")).toBeInTheDocument();

    // Verify "Reports To (Team Hierarchy)" field is rendered
    expect(screen.getByText("Reports To (Team Hierarchy)")).toBeInTheDocument();
  }, 15000);
});
