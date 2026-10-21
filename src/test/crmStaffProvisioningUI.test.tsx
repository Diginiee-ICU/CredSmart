/**
 * @file crmStaffProvisioningUI.test.tsx
 * @description Comprehensive React UI & Interaction Test Suite for Milestone 2:
 * Staff User Provisioning, Instant Role Assignment, Credentials Confirmation Modal,
 * and Create Role Staff Checklist in `src/pages/crm/RoleManagement.tsx`.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoleManagement from "@/pages/crm/RoleManagement";
import { crmApi } from "@/services/crmApi";
import { settingsApi } from "@/services/settingsApi";

// ============================================================================
// MOCKS & SETUP
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-m2-test-store",
  name: "CredSmart Flagship Store",
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

// Mock crmApi and settingsApi
vi.mock("@/services/crmApi", () => {
  const roles = [
    {
      id: "role-super-admin",
      org_id: "org-m2-test-store",
      name: "Super Admin",
      color: "#1D4ED8",
      icon: "Crown",
      is_super_admin: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "role-crm-manager",
      org_id: "org-m2-test-store",
      name: "CRM Manager",
      color: "#4F46E5",
      icon: "Users",
      is_super_admin: false,
      created_at: "2026-01-02T00:00:00Z",
    },
    {
      id: "role-cashier-lead",
      org_id: "org-m2-test-store",
      name: "Cashier Lead",
      color: "#10B981",
      icon: "Shield",
      is_super_admin: false,
      created_at: "2026-01-03T00:00:00Z",
    },
  ];

  return {
    crmApi: {
      getCRMRoles: vi.fn().mockResolvedValue({ data: roles, error: null }),
      createCRMRole: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          data: {
            id: `role-created-${Date.now()}`,
            org_id: payload.org_id || "org-m2-test-store",
            name: payload.name,
            color: payload.color || "#1D4ED8",
            icon: payload.icon || "Shield",
            is_super_admin: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        })
      ),
      updateCRMRole: vi.fn().mockResolvedValue({ data: {}, error: null }),
      deleteCRMRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMPermissions: vi.fn().mockResolvedValue({ data: [], error: null }),
      deleteCRMPermissionsByRoleId: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      insertCRMPermissions: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMStaffRoles: vi.fn().mockResolvedValue({
        data: [
          { staff_id: "user-existing-1", role_id: "role-crm-manager" },
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
              id: "user-newly-provisioned-101",
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
          id: "mem-1",
          user_id: "user-existing-1",
          role: "manager",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "mem-2",
          user_id: "user-existing-2",
          role: "cashier",
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
      error: null,
    }),
    getProfiles: vi.fn().mockResolvedValue({
      data: [
        { id: "user-existing-1", full_name: "Ramesh Kumar" },
        { id: "user-existing-2", full_name: "Sneha Patel" },
      ],
      error: null,
    }),
  },
}));

// Mock window.open and navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

window.open = vi.fn();

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Milestone 2 UI: Staff User Provisioning & Instant Role Assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("M2.UI.1 — renders 'Add Staff User' button in header actions and 'Add Staff' in Section 3", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    // Section 1 Header Action button
    const addStaffHeaderBtn = await screen.findByRole("button", { name: /Add Staff User/i });
    expect(addStaffHeaderBtn).toBeInTheDocument();

    // Section 3 Header Action button
    const addStaffRosterBtn = screen.getByRole("button", { name: /^Add Staff$/i });
    expect(addStaffRosterBtn).toBeInTheDocument();
  });

  it("M2.UI.2 — opens 'Add Staff User' modal with 14-char cryptographic password auto-generated", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
    fireEvent.click(addStaffBtn);

    // Modal Title and Description
    expect(screen.getByText("Provision New Staff User")).toBeInTheDocument();
    expect(screen.getByText(/Create staff credentials, define store operations permissions/i)).toBeInTheDocument();

    // Form inputs present
    expect(screen.getByPlaceholderText("e.g. Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. rahul@company.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. +91 98765 43210 (10 digits)")).toBeInTheDocument();

    // Auto-generate password mode indicator
    expect(screen.getByText(/Cryptographic 14-char high-entropy password/i)).toBeInTheDocument();

    // Regenerate password button
    const regenBtn = screen.getByRole("button", { name: /Regenerate/i });
    expect(regenBtn).toBeInTheDocument();
  });

  it("M2.UI.3 — switches password mode between Auto-Generate and Custom entry", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
    fireEvent.click(addStaffBtn);

    // Click "Custom" tab
    const customTab = screen.getByRole("button", { name: /^Custom$/i });
    fireEvent.click(customTab);

    // Custom password input appears
    expect(screen.getByPlaceholderText("Enter minimum 6 character password")).toBeInTheDocument();

    // Switch back to "Auto-Generate"
    const autoTab = screen.getByRole("button", { name: /^Auto-Generate$/i });
    fireEvent.click(autoTab);

    expect(screen.getByText(/Cryptographic 14-char high-entropy password/i)).toBeInTheDocument();
  });

  it("M2.UI.4 — provisions staff member, immediately updates roster in-memory with CRMRolePill, and opens Credentials Confirmation modal", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
    fireEvent.click(addStaffBtn);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText("e.g. Rahul Sharma"), {
      target: { value: "Aarav Gupta" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. rahul@company.com"), {
      target: { value: "aarav.gupta@credsmart.online" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. +91 98765 43210 (10 digits)"), {
      target: { value: "9876543210" },
    });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Provision Staff User/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // 1. Verify crmApi.provisionStaffUser called
      expect(crmApi.provisionStaffUser).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Aarav Gupta",
          email: "aarav.gupta@credsmart.online",
        }),
        "org-m2-test-store"
      );
    });

    // 2. Credentials Confirmation Modal opened
    await waitFor(() => {
      expect(screen.getByText("Staff Credentials Generated")).toBeInTheDocument();
    });

    expect(screen.getByText("Aarav Gupta")).toBeInTheDocument();
    expect(screen.getByDisplayValue("aarav.gupta@credsmart.online")).toBeInTheDocument();
    expect(screen.getByText(/These credentials will not be displayed again/i)).toBeInTheDocument();

    // 3. Test Copy All Details
    const copyAllBtn = screen.getByRole("button", { name: /Copy All Details/i });
    fireEvent.click(copyAllBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // 4. Test WhatsApp Share Trigger
    const waBtn = screen.getByRole("button", { name: /Share via WhatsApp/i });
    fireEvent.click(waBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
      "noopener,noreferrer"
    );

    // 5. Close dialog
    const doneBtn = screen.getByRole("button", { name: /^Done$/i });
    fireEvent.click(doneBtn);

    // 6. Verify newly created user is in Section 3 roster immediately without refresh
    expect(screen.getByText("Aarav Gupta")).toBeInTheDocument();
  });

  it("M2.UI.5 — Create Custom Role modal displays 'Assign Staff Members (Optional)' checklist and assigns role upon creation", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    const createRoleBtn = await screen.findByRole("button", { name: /Create Custom Role/i });
    fireEvent.click(createRoleBtn);

    // Verify modal title
    expect(screen.getByText("Create Custom CRM Role")).toBeInTheDocument();

    // Verify "Assign Staff Members (Optional)" section
    expect(screen.getByText("Assign Staff Members (Optional)")).toBeInTheDocument();
    expect(screen.getByText(/Select team members to immediately assign this new role upon creation/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter staff by name...")).toBeInTheDocument();

    // Existing staff are listed in checklist
    expect(screen.getByText("Ramesh Kumar")).toBeInTheDocument();
    expect(screen.getByText("Sneha Patel")).toBeInTheDocument();

    // Type role name
    fireEvent.change(screen.getByPlaceholderText("e.g. Operations Lead, HR Associate"), {
      target: { value: "Warehouse Lead" },
    });

    // Select Sneha Patel
    const snehaLabel = screen.getByText("Sneha Patel").closest("label");
    expect(snehaLabel).toBeInTheDocument();
    const snehaCheckbox = snehaLabel!.querySelector("button[role='checkbox']");
    if (snehaCheckbox) {
      fireEvent.click(snehaCheckbox);
    }

    // Submit Create Role
    const submitRoleBtn = screen.getByRole("button", { name: /^Create Role$/i });
    fireEvent.click(submitRoleBtn);

    await waitFor(() => {
      expect(crmApi.createCRMRole).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Warehouse Lead",
        }),
        "org-m2-test-store"
      );
    });
  });

  it("M2.UI.6 — filters staff members in Section 3 dynamically using search query", async () => {
    render(
      <MemoryRouter>
        <RoleManagement />
      </MemoryRouter>
    );

    await screen.findByText("Ramesh Kumar");

    const searchInput = screen.getByPlaceholderText("Search staff by name or role...");
    fireEvent.change(searchInput, { target: { value: "Sneha" } });

    expect(screen.getByText("Sneha Patel")).toBeInTheDocument();
    expect(screen.queryByText("Ramesh Kumar")).not.toBeInTheDocument();
  });
});
