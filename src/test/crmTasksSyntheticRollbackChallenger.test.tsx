/**
 * @file crmTasksSyntheticRollbackChallenger.test.tsx
 * @description Adversarial stress testing suite for Milestone 3 (Tasks & Staff Provisioning - R3).
 * Verifies:
 * 1. Rejection of synthetic IDs (`user-123456`, `user-${Date.now()}`) and strict UUID acceptance.
 * 2. Deterministic rollback in `Tasks.tsx` when task creation fails (optimistic task removed, destructive toast called).
 * 3. Deterministic rollback in `Tasks.tsx` when lifecycle status transitions fail (status reverted to original, destructive toast called).
 * 4. Empty organization rendering clean empty state (`[]`).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tasks, {
  isSyntheticStaffId,
  isValidAssigneeId,
  UUID_REGEX,
  type CRMTask,
} from "@/pages/crm/Tasks";
import { crmApi } from "@/services/crmApi";

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
  orgId: "org-challenger-stress-2026",
  orgName: "CredSmart Challenger Tenant",
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
      getCRMStaff: vi.fn(),
      getCRMStaffRoles: vi.fn(),
      createCRMTask: vi.fn(),
      transitionCRMTaskStatus: vi.fn(),
    },
  };
});

describe("Milestone 3 Challenger 2: Synthetic ID & Deterministic Rollback Stress Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockState.isSuperAdmin = true;
    mockState.orgId = "org-challenger-stress-2026";
    mockState.allowedPermissions = new Set([
      "tasks:view",
      "tasks:create",
      "tasks:approve",
    ]);

    // Safe default mocks
    vi.mocked(crmApi.getCRMStaffRoles).mockResolvedValue({
      data: [
        {
          id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          user_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          full_name: "Aman Sharma",
          store_role: "manager",
          crm_role_name: "Operations Lead",
          crm_role_color: "#1D4ED8",
        },
      ] as any,
      error: null,
    });

    vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
      data: [],
      error: null,
    });
  });

  // ==========================================================================
  // SECTION 1: SYNTHETIC ID REJECTION & STRICT UUID VALIDATION
  // ==========================================================================

  describe("1. Synthetic ID Rejection & Strict UUID Validation", () => {
    it("isSyntheticStaffId correctly flags synthetic IDs and rejects invalid types", () => {
      // Synthetic IDs
      expect(isSyntheticStaffId("user-123456")).toBe(true);
      expect(isSyntheticStaffId(`user-${Date.now()}`)).toBe(true);
      expect(isSyntheticStaffId("user-1789234892374")).toBe(true);
      expect(isSyntheticStaffId("USER-999999")).toBe(true);
      expect(isSyntheticStaffId("task-101")).toBe(true);
      expect(isSyntheticStaffId("task-99999")).toBe(true);

      // Falsy or non-string values
      expect(isSyntheticStaffId("")).toBe(true);
      expect(isSyntheticStaffId(null as unknown as string)).toBe(true);
      expect(isSyntheticStaffId(undefined as unknown as string)).toBe(true);

      // Genuine UUIDs are NOT synthetic
      expect(isSyntheticStaffId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(false);
      expect(isSyntheticStaffId("c9bf9e57-1685-4c89-bafb-ff5af830be8a")).toBe(false);
      expect(isSyntheticStaffId("00000000-0000-0000-0000-000000000000")).toBe(false);
    });

    it("UUID_REGEX strictly accepts valid RFC4122 UUIDs and rejects corrupt strings", () => {
      // Valid RFC4122 UUIDs
      expect(UUID_REGEX.test("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
      expect(UUID_REGEX.test("C9BF9E57-1685-4C89-BAFB-FF5AF830BE8A")).toBe(true);
      expect(UUID_REGEX.test("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);

      // Rejected synthetic strings
      expect(UUID_REGEX.test("user-123456")).toBe(false);
      expect(UUID_REGEX.test(`user-${Date.now()}`)).toBe(false);
      expect(UUID_REGEX.test("task-101")).toBe(false);

      // Rejected invalid UUID patterns
      expect(UUID_REGEX.test("3fa85f64-5717-4562-b3fc")).toBe(false); // Truncated
      expect(UUID_REGEX.test("3fa85f64-5717-4562-b3fc-2c963f66afa61")).toBe(false); // Too long
      expect(UUID_REGEX.test("3fa85f6457174562b3fc2c963f66afa6")).toBe(false); // Missing hyphens
      expect(UUID_REGEX.test("3fa85f64-5717-4562-b3fc-2c963f66afaz")).toBe(false); // Non-hex 'z'
      expect(UUID_REGEX.test("admin-user")).toBe(false);
      expect(UUID_REGEX.test("null")).toBe(false);
      expect(UUID_REGEX.test("")).toBe(false);
    });

    it("isValidAssigneeId filters out synthetic IDs and requires valid strings", () => {
      expect(isValidAssigneeId("user-123456")).toBe(false);
      expect(isValidAssigneeId(`user-${Date.now()}`)).toBe(false);
      expect(isValidAssigneeId("task-101")).toBe(false);
      expect(isValidAssigneeId("")).toBe(false);
      expect(isValidAssigneeId("   ")).toBe(false);
      expect(isValidAssigneeId(null as unknown as string)).toBe(false);
      expect(isValidAssigneeId(undefined as unknown as string)).toBe(false);

      // Valid UUID
      expect(isValidAssigneeId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    });

    it("Tasks component strips synthetic staff IDs from crmApi.getCRMStaffRoles response", async () => {
      vi.mocked(crmApi.getCRMStaffRoles).mockResolvedValue({
        data: [
          {
            id: "user-123456789", // Synthetic ID - MUST BE FILTERED
            user_id: "user-123456789",
            full_name: "Ghost Synthetic Staff 1",
            store_role: "cashier",
          },
          {
            id: `user-${Date.now()}`, // Timestamp Synthetic ID - MUST BE FILTERED
            user_id: `user-${Date.now()}`,
            full_name: "Ghost Synthetic Staff 2",
            store_role: "cashier",
          },
          {
            id: "e4eaaaf2-d142-11e1-b3e4-080027620cdd", // Valid UUID
            user_id: "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
            full_name: "Priya Patel",
            store_role: "manager",
            crm_role_name: "Store Manager",
            crm_role_color: "#10B981",
          },
        ] as any,
        error: null,
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Open Create Task modal
      const createBtn = await screen.findByRole("button", { name: /create task/i });
      fireEvent.click(createBtn);

      // Should indicate 1 staff member available (not 3)
      await waitFor(() => {
        expect(screen.getByText("1 staff member available")).toBeInTheDocument();
      });

      // Ghost staff names should not exist in the DOM
      expect(screen.queryByText(/Ghost Synthetic Staff 1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Ghost Synthetic Staff 2/)).not.toBeInTheDocument();
    }, 15000);

    it("Tasks component filters out synthetic staff IDs loaded from cached localStorage", async () => {
      const storageKey = `credsmart_crm_staff_${mockState.orgId}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify([
          { id: "user-1729000000000", full_name: "Cached Ghost User" },
          { id: "task-555", full_name: "Task Ghost User" },
          { id: "8d96924b-3982-4299-80b4-3a525f231e84", full_name: "Valid Cached Staff" },
        ])
      );

      // Backend returns empty array, forcing localStorage fallback
      vi.mocked(crmApi.getCRMStaffRoles).mockResolvedValue({ data: [] as any, error: null });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = await screen.findByRole("button", { name: /create task/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText("1 staff member available")).toBeInTheDocument();
      });

      expect(screen.queryByText("Cached Ghost User")).not.toBeInTheDocument();
      expect(screen.queryByText("Task Ghost User")).not.toBeInTheDocument();
    }, 15000);
  });

  // ==========================================================================
  // SECTION 2: DETERMINISTIC ROLLBACK WHEN TASK CREATION FAILS
  // ==========================================================================

  describe("2. Deterministic Rollback When Task Creation Fails", () => {
    it("rolls back optimistic task and triggers destructive toast when createCRMTask returns an error", async () => {
      vi.mocked(crmApi.createCRMTask).mockResolvedValue({
        data: null,
        error: "Assigned user does not belong to this organization",
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = await screen.findByRole("button", { name: /create task/i });
      fireEvent.click(createBtn);

      // Fill in title and description
      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      fireEvent.change(titleInput, { target: { value: "Rollback Creation Test Task" } });

      const descInput = screen.getByPlaceholderText(/Detailed instructions/i);
      fireEvent.change(descInput, { target: { value: "Verifying rollback on error" } });

      // Submit form
      const submitBtn = screen.getByRole("button", { name: /create & assign/i });
      fireEvent.click(submitBtn);

      // Verify destructive toast was called
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Failed to Create Task",
            description: "Assigned user does not belong to this organization",
            variant: "destructive",
          })
        );
      });

      // Verify the task was rolled back and is NOT rendered on the board
      await waitFor(() => {
        expect(screen.queryByText("Rollback Creation Test Task")).not.toBeInTheDocument();
      });
    });

    it("rolls back optimistic task and triggers destructive toast when createCRMTask throws an exception", async () => {
      vi.mocked(crmApi.createCRMTask).mockRejectedValue(new Error("504 Gateway Timeout"));

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = await screen.findByRole("button", { name: /create task/i });
      fireEvent.click(createBtn);

      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      fireEvent.change(titleInput, { target: { value: "Exception Rollback Task" } });

      const submitBtn = screen.getByRole("button", { name: /create & assign/i });
      fireEvent.click(submitBtn);

      // Verify destructive toast on error exception
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Task Creation Error",
            description: "504 Gateway Timeout",
            variant: "destructive",
          })
        );
      });

      // Task must be purged from state
      await waitFor(() => {
        expect(screen.queryByText("Exception Rollback Task")).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // SECTION 3: DETERMINISTIC ROLLBACK WHEN LIFECYCLE TRANSITIONS FAIL
  // ==========================================================================

  describe("3. Deterministic Rollback When Lifecycle Transitions Fail", () => {
    it("rolls back status transition (todo -> in_progress) when API returns error", async () => {
      const storageKey = `credsmart_crm_tasks_${mockState.orgId}`;
      const testTask: CRMTask = {
        id: "task-todo-101",
        org_id: mockState.orgId,
        title: "Transition Error Rollback Target",
        description: "Testing status rollback",
        priority: "normal",
        status: "todo",
        assignee_name: "Aman Sharma",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        requires_proof: false,
      };

      localStorage.setItem(storageKey, JSON.stringify([testTask]));

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [testTask] as any,
        error: null,
      });

      vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
        data: null,
        error: "Status transition forbidden by role policy",
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Wait for task to render
      await screen.findByText("Transition Error Rollback Target");
      const startBtn = await screen.findByRole("button", { name: /start job →/i });
      fireEvent.click(startBtn);

      // Destructive toast should fire
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Status Update Failed",
            description: "Status transition forbidden by role policy",
            variant: "destructive",
          })
        );
      });

      // Verify task reverted back to 'todo' with 'Start Job →' button visible
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /start job →/i })).toBeInTheDocument();
      });
    });

    it("rolls back status transition when API throws network exception", async () => {
      const storageKey = `credsmart_crm_tasks_${mockState.orgId}`;
      const testTask: CRMTask = {
        id: "task-todo-102",
        org_id: mockState.orgId,
        title: "Network Exception Status Target",
        description: "Testing exception status rollback",
        priority: "high",
        status: "todo",
        assignee_name: "Aman Sharma",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        requires_proof: false,
      };

      localStorage.setItem(storageKey, JSON.stringify([testTask]));

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [testTask] as any,
        error: null,
      });

      vi.mocked(crmApi.transitionCRMTaskStatus).mockRejectedValue(
        new Error("Connection terminated by server")
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      await screen.findByText("Network Exception Status Target");
      const startBtn = await screen.findByRole("button", { name: /start job →/i });
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Status Update Error",
            description: "Connection terminated by server",
            variant: "destructive",
          })
        );
      });

      // Status reverted back to todo
      expect(screen.getByRole("button", { name: /start job →/i })).toBeInTheDocument();
    });

    it("rolls back manager approval (review -> done) when API returns error", async () => {
      const storageKey = `credsmart_crm_tasks_${mockState.orgId}`;
      const reviewTask: CRMTask = {
        id: "task-review-201",
        org_id: mockState.orgId,
        title: "Approval Rollback Target",
        description: "Task awaiting manager approval",
        priority: "urgent",
        status: "review",
        assignee_name: "Aman Sharma",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        requires_proof: true,
        proof_notes: "Cash tallied with day book successfully.",
      };

      localStorage.setItem(storageKey, JSON.stringify([reviewTask]));

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [reviewTask] as any,
        error: null,
      });

      vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
        data: null,
        error: "Only store owner can sign off tasks in review",
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      await screen.findByText("Approval Rollback Target");
      const approveBtn = await screen.findByRole("button", { name: /approve ✓/i });
      fireEvent.click(approveBtn);

      // Verify destructive toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Approval Failed",
            description: "Only store owner can sign off tasks in review",
            variant: "destructive",
          })
        );
      });

      // Task must remain in review status (Approve button still rendered)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /approve ✓/i })).toBeInTheDocument();
      });
    });

    it("rolls back proof submission (in_progress -> review) when API returns error", async () => {
      const storageKey = `credsmart_crm_tasks_${mockState.orgId}`;
      const inProgressTask: CRMTask = {
        id: "task-proof-301",
        org_id: mockState.orgId,
        title: "Proof Submission Rollback Target",
        description: "Testing proof rollback",
        priority: "normal",
        status: "in_progress",
        assignee_name: "Aman Sharma",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        requires_proof: true,
      };

      localStorage.setItem(storageKey, JSON.stringify([inProgressTask]));

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [inProgressTask] as any,
        error: null,
      });

      vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
        data: null,
        error: "Proof validation failed on server",
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      await screen.findByText("Proof Submission Rollback Target");
      const submitProofTrigger = await screen.findByRole("button", { name: /submit proof/i });
      fireEvent.click(submitProofTrigger);

      // Fill in proof textarea
      const proofInput = screen.getByPlaceholderText(/Describe actions taken/i);
      fireEvent.change(proofInput, {
        target: { value: "Counted 50 items and verified batch barcodes." },
      });

      const submitModalBtn = screen.getByRole("button", { name: /submit for review/i });
      fireEvent.click(submitModalBtn);

      // Verify destructive toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Proof Submission Failed",
            description: "Proof validation failed on server",
            variant: "destructive",
          })
        );
      });

      // Verify reverted back to in_progress with 'Submit Proof' trigger
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /submit proof/i })).toBeInTheDocument();
      });
    });

    it("rolls back revision request (review -> in_progress) when API returns error", async () => {
      const storageKey = `credsmart_crm_tasks_${mockState.orgId}`;
      const reviewTask: CRMTask = {
        id: "task-rev-401",
        org_id: mockState.orgId,
        title: "Revision Request Rollback Target",
        description: "Testing revision rollback",
        priority: "high",
        status: "review",
        assignee_name: "Aman Sharma",
        due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        requires_proof: true,
        proof_notes: "Initial count complete.",
      };

      localStorage.setItem(storageKey, JSON.stringify([reviewTask]));

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [reviewTask] as any,
        error: null,
      });

      vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
        data: null,
        error: "Task revision limit exceeded",
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      await screen.findByText("Revision Request Rollback Target");

      // Switch to table view to access 'Request Revision' button
      const tableToggleBtn = screen.getByTitle("Data Table View");
      fireEvent.click(tableToggleBtn);

      const reqRevBtn = await screen.findByRole("button", { name: /request revision/i });
      fireEvent.click(reqRevBtn);

      // Fill in revision textarea
      const revInput = screen.getByPlaceholderText(/Enter revision instructions/i);
      fireEvent.change(revInput, { target: { value: "Need clearer voucher receipts." } });

      const sendRevBtn = screen.getByRole("button", { name: /send revision request/i });
      fireEvent.click(sendRevBtn);

      // Verify destructive toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Revision Request Failed",
            description: "Task revision limit exceeded",
            variant: "destructive",
          })
        );
      });

      // Reverted to review status
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /request revision/i })).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // SECTION 4: CLEAN EMPTY STATE FOR 0-TASK ORGANIZATIONS
  // ==========================================================================

  describe("4. Empty Organization Clean State Rendering", () => {
    it("renders clean empty state with 0 metrics and zero ghost tasks when server returns empty array", async () => {
      mockState.orgId = "org-empty-clean-tenant-555";

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [],
        error: null,
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Wait for empty state to take effect
      await waitFor(() => {
        expect(localStorage.getItem("credsmart_crm_tasks_org-empty-clean-tenant-555")).toBe("[]");
      });

      // Kanban columns should display 'No tasks'
      const noTasksLabels = screen.getAllByText("No tasks");
      expect(noTasksLabels.length).toBe(4); // 4 columns (To Do, In Progress, Under Review, Completed)

      // None of the fallback INITIAL_TASKS should be rendered
      expect(screen.queryByText(/Reconcile Saturday Cash Drawer/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Stock Audit: Aisle 3 Dairy/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Review Supplier Inward Invoices/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Barcode Labeling on Newly Arrived/)).not.toBeInTheDocument();

      // Metric counters should all be 0
      const zeroes = screen.getAllByText("0");
      expect(zeroes.length).toBeGreaterThanOrEqual(4);
    });

    it("renders clean empty state in Table View when organization has 0 tasks", async () => {
      mockState.orgId = "org-empty-table-tenant-777";
      localStorage.setItem("credsmart_crm_tasks_org-empty-table-tenant-777", "[]");

      vi.mocked(crmApi.getCRMTasks).mockResolvedValue({
        data: [],
        error: null,
      });

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Switch to Table view
      const tableToggleBtn = screen.getByTitle("Data Table View");
      fireEvent.click(tableToggleBtn);

      await waitFor(() => {
        expect(screen.getByText("No tasks found matching your filters.")).toBeInTheDocument();
      });

      expect(screen.queryByText(/Reconcile Saturday Cash Drawer/)).not.toBeInTheDocument();
    });
  });
});
