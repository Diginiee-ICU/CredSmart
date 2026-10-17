import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CRMPermissionGate } from "@/components/crm/CRMPermissionGate";
import { toast } from "@/hooks/use-toast";

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock hook state
const mockHookState = {
  isSuperAdmin: false,
  loading: false,
  hasPermissionFn: vi.fn<(module: string, action: string) => boolean>(),
};

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: (module?: string, action?: string) => ({
    isSuperAdmin: mockHookState.isSuperAdmin,
    loading: mockHookState.loading,
    hasPermission: mockHookState.hasPermissionFn,
    allowed:
      mockHookState.isSuperAdmin ||
      (module && action ? mockHookState.hasPermissionFn(module, action) : true),
    userRoles: [],
    permissions: [],
    error: null,
    refreshPermissions: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe("CRMPermissionGate Unit & Integration Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState.isSuperAdmin = false;
    mockHookState.loading = false;
    mockHookState.hasPermissionFn.mockReturnValue(false);
  });

  it("renders children when permission is granted", () => {
    mockHookState.hasPermissionFn.mockImplementation((mod, act) => mod === "attendance" && act === "view");

    render(
      <CRMPermissionGate module="attendance" action="view">
        <div data-testid="protected-content">Attendance View Content</div>
      </CRMPermissionGate>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("renders fallback and triggers 'Not Authorized' toast when permission is denied", async () => {
    mockHookState.hasPermissionFn.mockReturnValue(false);

    render(
      <CRMPermissionGate
        module="salary"
        action="edit"
        fallback={<div data-testid="fallback-ui">Locked Content</div>}
      >
        <div data-testid="protected-content">Secret Salary Form</div>
      </CRMPermissionGate>
    );

    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not Authorized",
          description: "You do not have permission to edit in salary.",
          variant: "destructive",
        })
      );
    });
  });

  it("renders null by default when fallback is omitted and permission is denied", () => {
    mockHookState.hasPermissionFn.mockReturnValue(false);

    const { container } = render(
      <CRMPermissionGate module="tasks" action="approve">
        <div data-testid="protected-content">Approve Button</div>
      </CRMPermissionGate>
    );

    expect(screen.queryByTestId("protected-content")).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it("displays custom toastMessage on denial when provided", async () => {
    mockHookState.hasPermissionFn.mockReturnValue(false);

    render(
      <CRMPermissionGate
        module="broadcasts"
        action="send"
        toastMessage="Only managers can broadcast store-wide messages."
      >
        <div>Broadcast Form</div>
      </CRMPermissionGate>
    );

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not Authorized",
          description: "Only managers can broadcast store-wide messages.",
          variant: "destructive",
        })
      );
    });
  });

  it("suppresses toast notification when suppressToast is true", async () => {
    mockHookState.hasPermissionFn.mockReturnValue(false);

    render(
      <CRMPermissionGate
        module="meetings"
        action="create"
        suppressToast={true}
        fallback={<div>No Meeting Creation</div>}
      >
        <div>Create Meeting</div>
      </CRMPermissionGate>
    );

    expect(screen.getByText("No Meeting Creation")).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("suppresses toast notification when showToast is false", async () => {
    mockHookState.hasPermissionFn.mockReturnValue(false);

    render(
      <CRMPermissionGate
        module="ai_assistant"
        action="access"
        showToast={false}
        fallback={<div>AI Locked</div>}
      >
        <div>AI Workspace</div>
      </CRMPermissionGate>
    );

    expect(screen.getByText("AI Locked")).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("bypasses all checks and renders children when user is super admin", () => {
    mockHookState.isSuperAdmin = true;
    mockHookState.hasPermissionFn.mockReturnValue(false); // even if explicit false

    render(
      <CRMPermissionGate module="support" action="manage">
        <div data-testid="super-admin-content">Super Admin Desk</div>
      </CRMPermissionGate>
    );

    expect(screen.getByTestId("super-admin-content")).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("renders null while loading permissions", () => {
    mockHookState.loading = true;

    const { container } = render(
      <CRMPermissionGate module="attendance" action="view">
        <div>Loading Protected View</div>
      </CRMPermissionGate>
    );

    expect(container.firstChild).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });
});
