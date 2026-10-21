/**
 * @file crmTasksChallengerM3.test.tsx
 * @description Adversarial stress testing suite for Milestone 3 Enterprise Task Management.
 * Tests boundary conditions, form validation, regex safety, 0-task KPI metrics,
 * state machine integrity, overdue calculations, and unauthorized manager actions.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tasks, { type CRMTask } from "@/pages/crm/Tasks";
import { crmApi } from "@/services/crmApi";

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
  orgId: "org-challenger-m3-test",
  orgName: "CredSmart Challenger Store",
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
      userRoles: [{ id: "r1", name: "Challenger Role", is_super_admin: mockState.isSuperAdmin }],
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

describe("Milestone 3 Task Management Adversarial Challenge Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockState.isSuperAdmin = true;
    mockState.allowedPermissions = new Set([
      "tasks:view",
      "tasks:create",
      "tasks:approve",
    ]);

    vi.mocked(crmApi.getCRMStaffRoles).mockResolvedValue({
      data: [
        {
          id: "staff-101",
          user_id: "staff-101",
          full_name: "Arjun Verma",
          store_role: "manager",
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
        id: "task-created-id",
        org_id: mockState.orgId,
        title: "Valid Title",
        priority: "normal",
        status: "todo",
        requires_proof: true,
      } as any,
      error: null,
    });

    vi.mocked(crmApi.transitionCRMTaskStatus).mockResolvedValue({
      data: {} as any,
      error: null,
    });
  });

  // ==========================================================================
  // 1. Form Validation: Blank and Whitespace-Only Task Titles
  // ==========================================================================
  describe("1. Form Validation: Blank & Whitespace-Only Titles", () => {
    it("rejects blank title and does not close modal or create task", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = screen.getByRole("button", { name: /Create Task/i });
      fireEvent.click(createBtn);

      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      expect(titleInput).toBeRequired();

      const form = titleInput.closest("form")!;
      fireEvent.submit(form);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/title is required/i),
          variant: "destructive",
        })
      );

      // Modal remains open
      expect(screen.getByText("Create Store Task")).toBeInTheDocument();
      expect(crmApi.createCRMTask).not.toHaveBeenCalled();
    });

    it("rejects whitespace-only title (spaces, tabs, newlines)", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = screen.getByRole("button", { name: /Create Task/i });
      fireEvent.click(createBtn);

      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      fireEvent.change(titleInput, { target: { value: "    \t \n   " } });

      const submitBtn = screen.getByRole("button", { name: /Create & Assign/i });
      fireEvent.click(submitBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/title is required/i),
          variant: "destructive",
        })
      );

      expect(screen.getByText("Create Store Task")).toBeInTheDocument();
      expect(crmApi.createCRMTask).not.toHaveBeenCalled();
    });

    it("rejects titles with fewer than 3 characters", async () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const createBtn = screen.getByRole("button", { name: /Create Task/i });
      fireEvent.click(createBtn);

      const titleInput = screen.getByPlaceholderText(/e\.g\. Audit GST invoices/i);
      fireEvent.change(titleInput, { target: { value: "ab" } });

      const submitBtn = screen.getByRole("button", { name: /Create & Assign/i });
      fireEvent.click(submitBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/at least 3 characters/i),
          variant: "destructive",
        })
      );

      expect(screen.getByText("Create Store Task")).toBeInTheDocument();
      expect(crmApi.createCRMTask).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. Empty Proof Notes Rejection
  // ==========================================================================
  describe("2. Proof Notes Rejection", () => {
    it("blocks empty proof notes submission when requires_proof is true with destructive warning toast", async () => {
      const taskWithProof: CRMTask = {
        id: "task-proof-req-1",
        org_id: mockState.orgId,
        title: "Cash Deposit Audit",
        description: "Reconcile daily cash",
        priority: "urgent",
        status: "in_progress",
        assignee_name: "Pooja Verma",
        due_date: "2026-10-30",
        requires_proof: true,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([taskWithProof])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const submitProofBtn = screen.getByRole("button", { name: /Submit Proof/i });
      fireEvent.click(submitProofBtn);

      // Attempt submit without text
      const submitForReviewBtn = screen.getByRole("button", { name: /Submit for Review/i });
      fireEvent.click(submitForReviewBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/describe your work or proof before submitting/i),
          variant: "destructive",
        })
      );

      // Verify task status was NOT transitioned
      expect(crmApi.transitionCRMTaskStatus).not.toHaveBeenCalled();
      // Dialog remains open
      expect(screen.getByText("Submit Proof of Work")).toBeInTheDocument();
    });

    it("blocks whitespace-only proof notes when requires_proof is true", async () => {
      const taskWithProof: CRMTask = {
        id: "task-proof-req-2",
        org_id: mockState.orgId,
        title: "Stock Expiry Check",
        description: "Check dairy batch numbers",
        priority: "high",
        status: "in_progress",
        assignee_name: "Rahul Sharma",
        due_date: "2026-10-30",
        requires_proof: true,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([taskWithProof])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const submitProofBtn = screen.getByRole("button", { name: /Submit Proof/i });
      fireEvent.click(submitProofBtn);

      const textarea = screen.getByPlaceholderText(/Describe actions taken/i);
      fireEvent.change(textarea, { target: { value: "   \t\n  " } });

      const submitForReviewBtn = screen.getByRole("button", { name: /Submit for Review/i });
      fireEvent.click(submitForReviewBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/describe your work or proof before submitting/i),
          variant: "destructive",
        })
      );

      expect(crmApi.transitionCRMTaskStatus).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 3. Empty Revision Feedback Rejection
  // ==========================================================================
  describe("3. Manager Revision Feedback Rejection", () => {
    it("blocks empty revision notes submission with destructive warning toast", async () => {
      const reviewTask: CRMTask = {
        id: "task-review-1",
        org_id: mockState.orgId,
        title: "Vendor Invoice Check",
        description: "Verify purchase tax rates",
        priority: "normal",
        status: "review",
        assignee_name: "Amit Patel",
        due_date: "2026-10-30",
        requires_proof: true,
        proof_notes: "Checked 5 invoices.",
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([reviewTask])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const requestRevisionBtn = screen.getByRole("button", { name: /Request Revision/i });
      fireEvent.click(requestRevisionBtn);

      expect(screen.getByRole("heading", { name: "Request Revision" })).toBeInTheDocument();

      const sendBtn = screen.getByRole("button", { name: /Send Revision Request/i });
      fireEvent.click(sendBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/enter revision notes before submitting/i),
          variant: "destructive",
        })
      );

      expect(crmApi.transitionCRMTaskStatus).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Request Revision" })).toBeInTheDocument();
    });

    it("blocks whitespace-only revision feedback", async () => {
      const reviewTask: CRMTask = {
        id: "task-review-2",
        org_id: mockState.orgId,
        title: "Ledger Reconciliation",
        description: "Reconcile tally ledger",
        priority: "high",
        status: "review",
        assignee_name: "Amit Patel",
        due_date: "2026-10-30",
        requires_proof: true,
        proof_notes: "Done",
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([reviewTask])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const requestRevisionBtn = screen.getByRole("button", { name: /Request Revision/i });
      fireEvent.click(requestRevisionBtn);

      const textarea = screen.getByPlaceholderText(/Enter revision instructions/i);
      fireEvent.change(textarea, { target: { value: "   \n  " } });

      const sendBtn = screen.getByRole("button", { name: /Send Revision Request/i });
      fireEvent.click(sendBtn);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Validation Error",
          description: expect.stringMatching(/enter revision notes before submitting/i),
          variant: "destructive",
        })
      );

      expect(crmApi.transitionCRMTaskStatus).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4. 0-Task KPI Metrics Calculation (No NaN or Division by Zero)
  // ==========================================================================
  describe("4. 0-Task KPI Metrics Calculation", () => {
    it("safely handles 0 tasks and computes completion rate as 0% without NaN or division by zero", async () => {
      // Force empty tasks in cache
      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Verify stat cards display 0
      expect(screen.getByText("Total Tasks")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.queryByText(/NaN%/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/null/i)).not.toBeInTheDocument();

      // No overdue badge should exist
      expect(screen.queryByText(/Overdue/i)).not.toBeInTheDocument();

      // All 4 Kanban columns show "No tasks"
      const emptyColumns = screen.getAllByText("No tasks");
      expect(emptyColumns.length).toBe(4);
    });
  });

  // ==========================================================================
  // 5. Special Regex Characters in Search Filter
  // ==========================================================================
  describe("5. Special Regex Characters in Search Filter", () => {
    it("handles special regex characters in search query without throwing syntax errors or crashing", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText("Search tasks or assignees...");
      const regexChars = ["[", "]", "*", "+", "?", "\\", "^", "$", "(", ")", "{", "}", "|", ".*", "([a-z]+)"];

      for (const char of regexChars) {
        expect(() => {
          fireEvent.change(searchInput, { target: { value: char } });
        }).not.toThrow();

        // Tasks component continues rendering without crashing
        expect(screen.getByText("Task & Job Workflows")).toBeInTheDocument();
      }

      // Restore search to empty
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByText("Reconcile Saturday Cash Drawer with Day Book")).toBeInTheDocument();
    });

    it("matches literal bracket or punctuation if present in title", () => {
      const specialTask: CRMTask = {
        id: "task-special-regex",
        org_id: mockState.orgId,
        title: "Audit [URGENT] Category (A+)",
        description: "Checking special symbols",
        priority: "urgent",
        status: "todo",
        assignee_name: "Special Assignee",
        due_date: "2026-10-30",
        requires_proof: true,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify([specialTask])
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText("Search tasks or assignees...");

      // Search for "["
      fireEvent.change(searchInput, { target: { value: "[" } });
      expect(screen.getByText("Audit [URGENT] Category (A+)")).toBeInTheDocument();

      // Search for "(A+)"
      fireEvent.change(searchInput, { target: { value: "(A+)" } });
      expect(screen.getByText("Audit [URGENT] Category (A+)")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 6. State Machine: Unauthorized Manager Actions
  // ==========================================================================
  describe("6. Unauthorized Manager Actions", () => {
    it("prohibits non-managers from approving tasks or requesting revisions in Kanban view", () => {
      // User with view and create permissions only (no approve)
      mockState.isSuperAdmin = false;
      mockState.allowedPermissions = new Set(["tasks:view", "tasks:create"]);

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Verify task 103 in Review column has NO Approve button and NO Request Revision button
      expect(screen.queryByRole("button", { name: /Approve ✓/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Request Revision/i })).not.toBeInTheDocument();
    });

    it("prohibits non-managers from approving tasks or requesting revisions in Table view", () => {
      mockState.isSuperAdmin = false;
      mockState.allowedPermissions = new Set(["tasks:view", "tasks:create"]);

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Switch to Table view
      const tableToggle = screen.getByTitle("Data Table View");
      fireEvent.click(tableToggle);

      // Table actions should not include Approve or Request Revision for non-manager
      expect(screen.queryByRole("button", { name: /Approve ✓/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Request Revision/i })).not.toBeInTheDocument();
    });

    it("allows super-admins to approve tasks and request revisions", () => {
      mockState.isSuperAdmin = true;

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: /Approve ✓/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Request Revision/i })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 7. Overdue Date Highlighting Logic
  // ==========================================================================
  describe("7. Overdue Date Highlighting Logic", () => {
    it("highlights tasks with due_date < today and status !== 'done' as overdue", () => {
      const tasksWithOverdue: CRMTask[] = [
        {
          id: "task-overdue-todo",
          org_id: mockState.orgId,
          title: "Overdue Todo Task",
          description: "Past deadline",
          priority: "urgent",
          status: "todo",
          assignee_name: "Staff 1",
          due_date: "2020-01-01",
          requires_proof: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "task-overdue-progress",
          org_id: mockState.orgId,
          title: "Overdue In Progress Task",
          description: "Past deadline",
          priority: "high",
          status: "in_progress",
          assignee_name: "Staff 2",
          due_date: "2020-01-02",
          requires_proof: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "task-past-done",
          org_id: mockState.orgId,
          title: "Completed Past Task",
          description: "Completed on time even though due in 2020",
          priority: "low",
          status: "done",
          assignee_name: "Staff 3",
          due_date: "2020-01-03",
          requires_proof: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "task-future",
          org_id: mockState.orgId,
          title: "Future Task",
          description: "Not overdue",
          priority: "normal",
          status: "todo",
          assignee_name: "Staff 4",
          due_date: "2099-12-31",
          requires_proof: false,
          created_at: new Date().toISOString(),
        },
      ];

      localStorage.setItem(
        `credsmart_crm_tasks_${mockState.orgId}`,
        JSON.stringify(tasksWithOverdue)
      );

      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      // Total overdue should be 2 (task-overdue-todo and task-overdue-progress; task-past-done is 'done' so NOT overdue)
      expect(screen.getByText("2 Overdue")).toBeInTheDocument();

      // Switch to Table view and verify overdue highlighting
      const tableToggle = screen.getByTitle("Data Table View");
      fireEvent.click(tableToggle);

      // Overdue rows have text-rose-600 styling or alert icons
      const dueDates = screen.getAllByText(/2020-01-/);
      expect(dueDates.length).toBe(3);
    });
  });
});
