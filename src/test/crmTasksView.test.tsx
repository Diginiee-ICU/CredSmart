/**
 * @file crmTasksView.test.tsx
 * @description Comprehensive unit & component integration tests for Enterprise Task Management
 * (src/pages/crm/Tasks.tsx) covering live API wiring, staff assignee selection, manager revision
 * requests, proof submissions, Table view actions, and KPI metric calculations.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tasks from "@/pages/crm/Tasks";
import { crmApi, type CRMTask } from "@/services/crmApi";

// ============================================================================
// MOCKS & FIXTURES
// ============================================================================

const mockState = {
  isSuperAdmin: true,
  allowedPermissions: new Set<string>([
    "tasks:view",
    "tasks:create",
    "tasks:approve",
  ]),
  orgId: "org-tasks-e2e-202",
  orgName: "CredSmart Enterprise Flagship",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockState.orgId,
    org: { id: mockState.orgId, name: mockState.orgName },
    userRole: "store_owner",
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: (module?: string, action?: string) => {
    const key = module && action ? `${module}:${action}` : "";
    const isAllowed =
      mockState.isSuperAdmin || (key ? mockState.allowedPermissions.has(key) : true);
    return {
      hasPermission: (mod: string, act: string) =>
        mockState.isSuperAdmin || mockState.allowedPermissions.has(`${mod}:${act}`),
      isSuperAdmin: mockState.isSuperAdmin,
      allowed: isAllowed,
      loading: false,
      userRoles: [{ id: "r1", name: "Super Admin", is_super_admin: mockState.isSuperAdmin }],
    };
  },
  usePermission: () => ({ allowed: true, loading: false }),
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

vi.mock("@/services/crmApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/crmApi")>("@/services/crmApi");
  return {
    ...actual,
    crmApi: {
      ...actual.crmApi,
      getCRMTasks: vi.fn(),
      getCRMStaffRoles: vi.fn(),
      createCRMTask: vi.fn(),
      transitionCRMTaskStatus: vi.fn(),
    },
  };
});

describe("Enterprise Task Management View (src/pages/crm/Tasks.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockState.isSuperAdmin = true;
    mockState.allowedPermissions = new Set([
      "tasks:view",
      "tasks:create",
      "tasks:approve",
    ]);

    // Default mock responses
    vi.mocked(crmApi.getCRMStaffRoles).mockResolvedValue({
      data: [
        {
          id: "staff-1",
          user_id: "staff-1",
          full_name: "Anita Desai",
          store_role: "manager",
          crm_role_name: "Store Manager",
          crm_role_color: "#1D4ED8",
        },
        {
          id: "staff-2",
          user_id: "staff-2",
          full_name: "Karan Mehta",
          store_role: "cashier",
          crm_role_name: "POS Operator",
          crm_role_color: "#10B981",
        },
      ] as any,
      error: null,
    });

    vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(crmApi.createCRMTask).mockResolvedValue({
      data: {
        id: "server-task-999",
        org_id: mockState.orgId,
        title: "Test Task",
        description: "",
        priority: "normal",
        status: "todo",
        requires_proof: true,
        created_at: new Date().toISOString(),
      } as CRMTask,
      error: null,
    });

    vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
      data: {} as CRMTask,
      error: null,
    });
  });

  // ==========================================================================
  // Test 1: Real Staff Members Loaded in Assignee Dropdown
  // ==========================================================================
  it("fetches organization staff members on mount and displays them in create task dialog", async () => {
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(crmApi.getCRMStaffRoles).toHaveBeenCalledWith(mockState.orgId);
    });

    const createBtn = screen.getByRole("button", { name: /Create Task/i });
    fireEvent.click(createBtn);

    // Verify staff count indicator is rendered
    expect(screen.getByText(/2 staff members available/i)).toBeInTheDocument();

    // Verify Select trigger exists
    expect(screen.getByText("Select staff member...")).toBeInTheDocument();
  });

  // ==========================================================================
  // Test 2: Manager Revision Request Modal & State Transition
  // ==========================================================================
  it("opens manager revision request dialog, rejects empty feedback, and transitions task to in_progress with feedback", async () => {
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Initial task 103 ("Review Supplier Inward Invoices for GST Mismatch") is in Review column
    const requestRevisionBtn = screen.getByRole("button", { name: /Request Revision/i });
    expect(requestRevisionBtn).toBeInTheDocument();

    fireEvent.click(requestRevisionBtn);

    // Revision dialog opens
    expect(screen.getByRole("heading", { name: "Request Revision" })).toBeInTheDocument();
    expect(
      screen.getByText(/Provide feedback notes detailing required revisions/i)
    ).toBeInTheDocument();

    // Attempt to submit empty feedback
    const sendBtn = screen.getByRole("button", { name: /Send Revision Request/i });
    fireEvent.click(sendBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Validation Error",
        description: expect.stringMatching(/enter revision notes/i),
      })
    );

    // Enter actionable revision notes
    const textarea = screen.getByPlaceholderText(/Enter revision instructions/i);
    fireEvent.change(textarea, {
      target: { value: "Please reconcile invoices 401 to 415 again; GST mismatch found." },
    });

    fireEvent.click(sendBtn);

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Request Revision" })).not.toBeInTheDocument();
    });

    // API was called with transition to in_progress and review_feedback
    expect(crmApi.transitionCRMTaskStatus).toHaveBeenCalledWith(
      "task-103",
      "in_progress",
      expect.objectContaining({
        review_feedback: "Please reconcile invoices 401 to 415 again; GST mismatch found.",
        orgId: mockState.orgId,
      })
    );

    // Amber banner appears on card
    expect(screen.getByText("Revision Requested:")).toBeInTheDocument();
    expect(
      screen.getByText(/Please reconcile invoices 401 to 415 again/i)
    ).toBeInTheDocument();
  });

  // ==========================================================================
  // Test 3: Table View Actions & Rendering
  // ==========================================================================
  it("renders Table view with complete action buttons matching Kanban lifecycle", () => {
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Switch to Table view
    const tableToggle = screen.getByTitle("Data Table View");
    fireEvent.click(tableToggle);

    // Columns present
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Assignee")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getAllByText("Proof Required").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Verify row action buttons in table view
    expect(screen.getByRole("button", { name: /Start Job/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Submit Proof/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Approve ✓/i }).length).toBeGreaterThanOrEqual(1);
  });

  // ==========================================================================
  // Test 4: Proof Submission Empty Validation
  // ==========================================================================
  it("validates proof notes are non-empty when proof is required", async () => {
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Click Submit Proof on task 102
    const submitProofBtn = screen.getByRole("button", { name: /Submit Proof/i });
    fireEvent.click(submitProofBtn);

    expect(screen.getByText("Submit Proof of Work")).toBeInTheDocument();

    // Attempt submit with empty textarea
    const submitBtn = screen.getByRole("button", { name: /Submit for Review/i });
    fireEvent.click(submitBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Validation Error",
        description: expect.stringMatching(/describe your work or proof/i),
      })
    );

    // Dialog remains open
    expect(screen.getByText("Submit Proof of Work")).toBeInTheDocument();
  });

  // ==========================================================================
  // Test 5: Live API Tasks Hydration
  // ==========================================================================
  it("populates tasks from crmApi.getCRMTasks and updates localStorage cache", async () => {
    const liveTasks: CRMTask[] = [
      {
        id: "live-task-1",
        org_id: mockState.orgId,
        title: "Live Cloud Task: Audit Shelf 8",
        description: "Verify stock count against tally export",
        priority: "urgent",
        status: "todo",
        assignee_name: "Vikram Malhotra",
        due_date: "2026-10-30",
        requires_proof: true,
        created_at: new Date().toISOString(),
      },
    ];

    vi.mocked(crmApi.getCRMTasks).mockResolvedValueOnce({
      data: liveTasks,
      error: null,
    });

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Live Cloud Task: Audit Shelf 8")).toBeInTheDocument();
      expect(screen.getByText("Vikram Malhotra")).toBeInTheDocument();
    });

    // Check localStorage cache was written
    const cached = localStorage.getItem(`credsmart_crm_tasks_${mockState.orgId}`);
    expect(cached).toBeTruthy();
    expect(cached).toContain("Live Cloud Task: Audit Shelf 8");
  });

  // ==========================================================================
  // Test 6: Overdue Badge & Calculation
  // ==========================================================================
  it("computes overdue tasks and displays overdue pill badge in header", () => {
    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    // Initial task 104 is 'done' with past date, but if an active task has past date:
    // Suresh Kumar's task is done, so it's not overdue.
    // Let's create an overdue task in localStorage
    const overdueTask: CRMTask = {
      id: "task-overdue-1",
      org_id: mockState.orgId,
      title: "Overdue Delivery Recheck",
      description: "Must be done yesterday",
      priority: "urgent",
      status: "in_progress",
      assignee_name: "Rahul Sharma",
      due_date: "2020-01-01",
      requires_proof: true,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(
      `credsmart_crm_tasks_${mockState.orgId}`,
      JSON.stringify([overdueTask])
    );

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    );

    expect(screen.getByText(/1 Overdue/i)).toBeInTheDocument();
  });
});
