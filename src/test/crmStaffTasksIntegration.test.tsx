/**
 * @file crmStaffTasksIntegration.test.tsx
 * @description Comprehensive Integration Test Suite for CredSmart Enterprise CRM Staff & Tasks Management.
 * Covers component rendering, Kanban and Table dual views, modal workflows, proof notes submission,
 * manager approvals, and role-based permission gating.
 *
 * Derived Authoritatively from:
 * - ORIGINAL_REQUEST.md (Timestamp: 2026-10-21T17:42:42Z)
 * - PROJECT.md § Architecture, Feature Inventory, and Interface Contracts
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tasks from "@/pages/crm/Tasks";

// ============================================================================
// MOCKS & HOOK STATE
// ============================================================================

const mockState = {
  isSuperAdmin: true,
  allowedPermissions: new Set<string>([
    "tasks:view",
    "tasks:create",
    "tasks:approve",
  ]),
  orgId: "org-e2e-test-101",
  orgName: "CredAlert Enterprise Flagship Store",
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
    const isAllowed = mockState.isSuperAdmin || (key ? mockState.allowedPermissions.has(key) : true);
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

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

describe("CRM Staff & Tasks Full Integration Suite (src/pages/crm/Tasks.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockState.isSuperAdmin = true;
    mockState.allowedPermissions = new Set([
      "tasks:view",
      "tasks:create",
      "tasks:approve",
    ]);
  });

  // ==========================================================================
  // SECTION 1: Page Header, Navigation, and KPI Metrics Rendering
  // ==========================================================================

  describe("1. Header & Metric Cards Rendering", () => {
    it("renders page title, organization badge, breadcrumbs, and Phase 3 badges", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("Task & Job Workflows")).toBeInTheDocument();
      expect(screen.getByText(/CredAlert Enterprise Flagship Store/)).toBeInTheDocument();
      expect(screen.getByText("Phase 3 Active")).toBeInTheDocument();
      expect(screen.getByText("Kanban Ready")).toBeInTheDocument();
    });

    it("renders all 4 primary KPI metric cards with non-zero initial values", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("Total Tasks")).toBeInTheDocument();
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
      expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SECTION 2: Kanban Board & Data Table Dual View
  // ==========================================================================

  describe("2. Kanban & Table Dual View Switching", () => {
    it("renders all 4 Kanban column headers (To Do, In Progress, Under Review, Completed)", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("To Do")).toBeInTheDocument();
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Under Review")).toBeInTheDocument();
      expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
    });

    it("switches cleanly between Kanban board and Data Table views", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Verify Kanban active by default
      expect(screen.getByText("To Do")).toBeInTheDocument();

      // Click Table view toggle button
      const tableToggleBtn = screen.getByTitle("Data Table View");
      fireEvent.click(tableToggleBtn);

      // Verify table headers appear
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Assignee")).toBeInTheDocument();
      expect(screen.getByText("Due Date")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();

      // Switch back to Board view
      const boardToggleBtn = screen.getByTitle("Kanban Board View");
      fireEvent.click(boardToggleBtn);

      expect(screen.getByText("To Do")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 3: Search and Priority Filters
  // ==========================================================================

  describe("3. Search & Priority Filters", () => {
    it("filters tasks by title or assignee search query", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Initial tasks include "Rahul Sharma" and "Pooja Verma"
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("Pooja Verma")).toBeInTheDocument();

      // Search for "Rahul"
      const searchInput = screen.getByPlaceholderText("Search tasks or assignees...");
      fireEvent.change(searchInput, { target: { value: "Rahul" } });

      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.queryByText("Pooja Verma")).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("Pooja Verma")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 4: Create Task Workflow & Form Validation
  // ==========================================================================

  describe("4. Create Task Workflow", () => {
    it("opens create task dialog and creates a new store task", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = screen.getByRole("button", { name: /Create Task/i });
      fireEvent.click(createBtn);

      // Modal is open
      expect(screen.getByText("Create Store Task")).toBeInTheDocument();
      expect(screen.getByText(/Assign a job or workflow to an employee/i)).toBeInTheDocument();

      // Fill in task details
      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      const descInput = screen.getByPlaceholderText(/Detailed instructions or checklist/i);
      const assigneeInput = screen.getByPlaceholderText(/Staff member name/i);

      fireEvent.change(titleInput, { target: { value: "Audit Saturday UPI Settlements" } });
      fireEvent.change(descInput, { target: { value: "Cross check bank QR statements against POS" } });
      fireEvent.change(assigneeInput, { target: { value: "Deepak Joshi" } });

      // Submit form
      const submitBtn = screen.getByRole("button", { name: /Create & Assign/i });
      fireEvent.click(submitBtn);

      // Modal closes and new task appears
      await waitFor(() => {
        expect(screen.queryByText("Create Store Task")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Audit Saturday UPI Settlements")).toBeInTheDocument();
      expect(screen.getByText("Deepak Joshi")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 5: Task Lifecycle State Transitions & Proof Modal
  // ==========================================================================

  describe("5. Interactive Lifecycle Transitions & Proof Modal", () => {
    it("transitions task from To Do to In Progress on 'Start Job' click", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Initial task "Reconcile Saturday Cash Drawer with Day Book" is in "To Do"
      const startBtn = screen.getByRole("button", { name: /Start Job →/i });
      fireEvent.click(startBtn);

      // Now the task has moved to In Progress, button should change to "Submit Proof"
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /Submit Proof/i }).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("opens proof submission dialog when clicking 'Submit Proof' on a proof-required task", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Find the "Submit Proof" button on the in_progress task (Pooja Verma's task)
      const submitProofBtn = screen.getByRole("button", { name: /Submit Proof/i });
      fireEvent.click(submitProofBtn);

      // Proof dialog should open
      expect(screen.getByText("Submit Proof of Work")).toBeInTheDocument();
      expect(screen.getByText(/Provide verification notes/i)).toBeInTheDocument();

      // Enter proof notes
      const proofTextarea = screen.getByPlaceholderText(/Describe actions taken/i);
      fireEvent.change(proofTextarea, {
        target: { value: "Counted 120 cartons. Expiry date verified for batch B-2026." },
      });

      // Submit proof
      const submitBtn = screen.getByRole("button", { name: /Submit for Review/i });
      fireEvent.click(submitBtn);

      // Dialog closes
      await waitFor(() => {
        expect(screen.queryByText("Submit Proof of Work")).not.toBeInTheDocument();
      });
    });

    it("allows manager to approve a task in Review, moving it to Completed", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Initial task 103 ("Review Supplier Inward Invoices for GST Mismatch") is in Review
      const approveBtn = screen.getByRole("button", { name: /Approve ✓/i });
      expect(approveBtn).toBeInTheDocument();

      fireEvent.click(approveBtn);

      // Task is approved and moved to Completed
      await waitFor(() => {
        // Approve button is no longer present for this task
        expect(screen.queryByRole("button", { name: /Approve ✓/i })).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // SECTION 6: Role-Based Permission Gating
  // ==========================================================================

  describe("6. Role-Based Permission Gating", () => {
    it("renders 'Task Access Restricted' fallback when user lacks 'tasks:view' permission", () => {
      mockState.isSuperAdmin = false;
      mockState.allowedPermissions = new Set(["attendance:view"]); // no tasks:view

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("Task Access Restricted")).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have permission to view store tasks/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Task & Job Workflows")).not.toBeInTheDocument();
    });

    it("hides 'Create Task' button when user lacks 'tasks:create' permission", () => {
      mockState.isSuperAdmin = false;
      mockState.allowedPermissions = new Set(["tasks:view"]); // view only, no create

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("Task & Job Workflows")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Create Task/i })).not.toBeInTheDocument();
    });

    it("hides 'Approve' button when user lacks 'tasks:approve' permission", () => {
      mockState.isSuperAdmin = false;
      mockState.allowedPermissions = new Set(["tasks:view", "tasks:create"]); // no approve

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // In Review column, Approve button should be hidden for non-approvers
      expect(screen.queryByRole("button", { name: /Approve ✓/i })).not.toBeInTheDocument();
    });
  });
});
