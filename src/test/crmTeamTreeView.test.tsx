/**
 * @file crmTeamTreeView.test.tsx
 * @description Comprehensive unit and integration test suite for CRMTeamTreeView
 * and the hierarchical Team Tree View in CredSmart CRM RoleManagement.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CRMTeamTreeView, type CRMTreeMember } from "@/components/crm/CRMTeamTreeView";
import type { CRMRole } from "@/hooks/useCRMPermission";

// Mocks
const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockRoles: CRMRole[] = [
  {
    id: "role-super-admin",
    org_id: "test-org",
    name: "Super Admin",
    color: "#1D4ED8",
    icon: "Crown",
    is_super_admin: true,
  },
  {
    id: "role-manager",
    org_id: "test-org",
    name: "Operations Lead",
    color: "#4F46E5",
    icon: "Users",
    is_super_admin: false,
  },
  {
    id: "role-sales",
    org_id: "test-org",
    name: "Sales Executive",
    color: "#10B981",
    icon: "Shield",
    is_super_admin: false,
  },
];

const mockStaff: CRMTreeMember[] = [
  {
    id: "user-owner-1",
    name: "Vikram Malhotra",
    email: "vikram@credsmart.online",
    phone: "9876543210",
    role: "store_owner",
    crmRoleId: "role-super-admin",
    crmRoleName: "Super Admin",
    crmRoleColor: "#1D4ED8",
    parentId: null,
  },
  {
    id: "user-manager-1",
    name: "Pooja Sharma",
    email: "pooja@credsmart.online",
    phone: "9876543211",
    role: "manager",
    crmRoleId: "role-manager",
    crmRoleName: "Operations Lead",
    crmRoleColor: "#4F46E5",
    parentId: "user-owner-1",
  },
  {
    id: "user-sales-1",
    name: "Rohan Verma",
    email: "rohan@credsmart.online",
    phone: "9876543212",
    role: "salesman",
    crmRoleId: "role-sales",
    crmRoleName: "Sales Executive",
    crmRoleColor: "#10B981",
    parentId: "user-manager-1",
  },
  {
    id: "user-sales-2",
    name: "Ananya Iyer",
    email: "ananya@credsmart.online",
    phone: "9876543213",
    role: "cashier",
    crmRoleId: "role-sales",
    crmRoleName: "Sales Executive",
    crmRoleColor: "#10B981",
    parentId: "user-manager-1",
  },
];

describe("CRMTeamTreeView Component", () => {
  const onAssignRoleMock = vi.fn();
  const onSetManagerMock = vi.fn();
  const onOpenAddStaffMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders complete hierarchy with owner at apex, manager, and direct reports", () => {
    render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
        onOpenAddStaff={onOpenAddStaffMock}
      />
    );

    // Organization Structure header
    expect(screen.getByText("ORGANIZATION STRUCTURE")).toBeInTheDocument();

    // Verify all members exist in tree
    expect(screen.getAllByText("Vikram Malhotra").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pooja Sharma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rohan Verma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ananya Iyer").length).toBeGreaterThanOrEqual(1);

    // Verify report count badges
    expect(screen.getByText(/1 report/i)).toBeInTheDocument(); // Vikram has 1 report (Pooja)
    expect(screen.getByText(/2 reports/i)).toBeInTheDocument(); // Pooja has 2 reports (Rohan, Ananya)
  });

  it("2. Space-Saving Drop Down Button: Collapses sub-team on chevron click and saves space", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    expect(treeContainer).toBeDefined();

    // Initial state: Rohan and Ananya are visible under Pooja in the tree
    expect(within(treeContainer as HTMLElement).getByText("Rohan Verma")).toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).getByText("Ananya Iyer")).toBeInTheDocument();

    // Click drop down chevron on Pooja Sharma to collapse her sub-team
    const poojaNode = within(treeContainer as HTMLElement).getByText("Pooja Sharma").closest(".group");
    expect(poojaNode).toBeDefined();

    const poojaDropdownBtn = within(poojaNode!).getByRole("button", { name: /Collapse sub-team/i });
    fireEvent.click(poojaDropdownBtn);

    // Sub-team collapsed: Rohan and Ananya are no longer in the left tree container
    expect(within(treeContainer as HTMLElement).queryByText("Rohan Verma")).not.toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).queryByText("Ananya Iyer")).not.toBeInTheDocument();

    // Click again to expand
    const poojaExpandBtn = within(poojaNode!).getByRole("button", { name: /Expand sub-team/i });
    fireEvent.click(poojaExpandBtn);

    // Sub-team re-appears in tree
    expect(within(treeContainer as HTMLElement).getByText("Rohan Verma")).toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).getByText("Ananya Iyer")).toBeInTheDocument();
  });

  it("3. Global Expand All & Collapse All buttons toggle entire organizational tree", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;

    // Click Collapse All
    const collapseAllBtn = screen.getByRole("button", { name: /Collapse All/i });
    fireEvent.click(collapseAllBtn);

    // Subordinates collapsed in tree
    expect(within(treeContainer as HTMLElement).queryByText("Pooja Sharma")).not.toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).queryByText("Rohan Verma")).not.toBeInTheDocument();

    // Click Expand All
    const expandAllBtn = screen.getByRole("button", { name: /Expand All/i });
    fireEvent.click(expandAllBtn);

    // All re-appear in tree
    expect(within(treeContainer as HTMLElement).getByText("Pooja Sharma")).toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).getByText("Rohan Verma")).toBeInTheDocument();
  });

  it("4. Click on Name: Displays user details and lists all users working under them", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    const inspectorContainer = container.querySelector(".lg\\:col-span-5")!;

    // Click on Pooja Sharma in the tree to inspect her and her team
    const poojaInTree = within(treeContainer as HTMLElement).getByText("Pooja Sharma");
    fireEvent.click(poojaInTree);

    // Inspector header
    expect(within(inspectorContainer as HTMLElement).getByText("Team Members Under Pooja Sharma")).toBeInTheDocument();
    expect(within(inspectorContainer as HTMLElement).getAllByText("Vikram Malhotra").length).toBeGreaterThanOrEqual(1); // Reports to line + manager selector options

    // Users working under Pooja Sharma
    expect(within(inspectorContainer as HTMLElement).getByText("Rohan Verma")).toBeInTheDocument();
    expect(within(inspectorContainer as HTMLElement).getByText("Ananya Iyer")).toBeInTheDocument();
  });

  it("5. Displays empty state for team member without subordinates and allows assigning new member", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
        onOpenAddStaff={onOpenAddStaffMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    const inspectorContainer = container.querySelector(".lg\\:col-span-5")!;

    // Click on Rohan Verma (who has no subordinates) in the tree
    const rohanInTree = within(treeContainer as HTMLElement).getByText("Rohan Verma");
    fireEvent.click(rohanInTree);

    // Shows friendly empty state in inspector
    expect(within(inspectorContainer as HTMLElement).getByText(/No team members are currently assigned under Rohan Verma/i)).toBeInTheDocument();

    // Click "Assign Subordinate"
    const assignBtn = within(inspectorContainer as HTMLElement).getByRole("button", { name: /Assign Subordinate/i });
    fireEvent.click(assignBtn);
    expect(onOpenAddStaffMock).toHaveBeenCalledWith("user-sales-1");
  });

  it("6. Cycle resilience: Gracefully handles circular parent references without infinite loop", () => {
    const cyclicStaff: CRMTreeMember[] = [
      { id: "user-a", name: "User A", role: "manager", parentId: "user-b" },
      { id: "user-b", name: "User B", role: "salesman", parentId: "user-a" },
    ];

    expect(() => {
      render(
        <CRMTeamTreeView
          staff={cyclicStaff}
          roles={mockRoles}
          isSuperAdminOrOwner={true}
          onAssignRole={onAssignRoleMock}
          onSetManager={onSetManagerMock}
        />
      );
    }).not.toThrow();

    expect(screen.getAllByText("User A").length).toBeGreaterThanOrEqual(1);
  });

  it("7. Specific user scoping: Roots tree at specific user to show team members working under them", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        defaultScopedUserId="user-manager-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;

    // Vikram Malhotra (owner/parent) should NOT be in the scoped tree
    expect(within(treeContainer as HTMLElement).queryByText("Vikram Malhotra")).not.toBeInTheDocument();

    // Pooja Sharma (manager) is the apex of this scoped tree
    expect(within(treeContainer as HTMLElement).getByText("Pooja Sharma")).toBeInTheDocument();

    // Rohan and Ananya (subordinates) are displayed under Pooja
    expect(within(treeContainer as HTMLElement).getByText("Rohan Verma")).toBeInTheDocument();
    expect(within(treeContainer as HTMLElement).getByText("Ananya Iyer")).toBeInTheDocument();
  });

  it("8. Inline space-saving drop down button: Expands inline details and reports right inside the tree view", () => {
    const { container } = render(
      <CRMTeamTreeView
        staff={mockStaff}
        roles={mockRoles}
        currentUserId="user-owner-1"
        isSuperAdminOrOwner={true}
        onAssignRole={onAssignRoleMock}
        onSetManager={onSetManagerMock}
      />
    );

    const treeContainer = container.querySelector(".lg\\:col-span-7")!;
    const poojaNode = within(treeContainer as HTMLElement).getByText("Pooja Sharma").closest(".group");
    expect(poojaNode).toBeDefined();

    // Click Details button on Pooja Sharma
    const detailsBtn = within(poojaNode!).getByRole("button", { name: /Details/i });
    fireEvent.click(detailsBtn);

    // Inline details expanded: shows Team Members Under Pooja Sharma (2) directly in tree
    expect(within(treeContainer as HTMLElement).getByText("Team Members Under Pooja Sharma (2)")).toBeInTheDocument();

    // Click again to collapse and save space
    fireEvent.click(detailsBtn);
    expect(within(treeContainer as HTMLElement).queryByText("Team Members Under Pooja Sharma (2)")).not.toBeInTheDocument();
  });
});

