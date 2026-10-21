/**
 * @file crmChallengerM1.test.ts
 * @description Adversarial Challenge & Stress Test Suite for Milestone 1:
 * CredSmart Enterprise CRM Staff Provisioning, Backend API Contracts,
 * Task Lifecycle State Machine, Boundary Validation, and Extreme Inputs.
 *
 * Authored by Challenger 1 (EMPIRICAL CHALLENGER / critic & specialist).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateStaffProvisioningInput,
  generateCryptographicPassword,
  type ProvisionStaffInput,
} from "./crmStaffProvisioning.test";
import {
  transitionTaskStatus,
  calculateTaskMetrics,
  validateCreateTaskInput,
  isTaskOverdue,
  type CRMTaskModel,
} from "./crmTaskLifecycle.test";
import {
  provisionStaffUser,
  getCRMTasks,
  createCRMTask,
  updateCRMTask,
  transitionCRMTaskStatus,
  deleteCRMTask,
  type CRMTask,
  type CreateCRMTaskPayload,
} from "@/services/crmApi";
import * as apiClientModule from "@/lib/apiClient";

describe("Adversarial Challenge M1: Staff Provisioning & Task Lifecycle Stress Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Staff User Provisioning Adversarial Edge Cases
  // ==========================================================================

  describe("1. Staff User Provisioning Edge Cases", () => {
    it("CHALLENGE 1.1: Short password (< 6 chars) is strictly rejected", () => {
      const inputs = [
        "",
        "1",
        "12",
        "123",
        "1234",
        "12345", // 5 chars
      ];

      for (const pwd of inputs) {
        const res = validateStaffProvisioningInput({
          full_name: "Test User",
          email: "test@example.com",
          store_role: "salesman",
          password: pwd,
        });
        if (pwd.length > 0) {
          expect(res.valid).toBe(false);
          expect(res.errors.password).toBeDefined();
        }
      }
    });

    it("CHALLENGE 1.2: Password with extreme length (1000 characters) and complex unicode", () => {
      const extremePassword = "🔐" + "A".repeat(996) + "!9";
      expect(extremePassword.length).toBeGreaterThan(990);

      const res = validateStaffProvisioningInput({
        full_name: "Rohan Sharma",
        email: "rohan@example.com",
        store_role: "manager",
        password: extremePassword,
      });

      expect(res.valid).toBe(true);
      expect(res.sanitized?.fullName).toBe("Rohan Sharma");
    });

    it("CHALLENGE 1.3: Devanagari and multilingual names in staff provisioning", () => {
      const devanagariName = "रोहन शर्मा (वरिष्ठ प्रबंधक)";
      const res = validateStaffProvisioningInput({
        full_name: devanagariName,
        email: "rohan.sharma@credsmart.in",
        store_role: "manager",
      });

      expect(res.valid).toBe(true);
      expect(res.sanitized?.fullName).toBe(devanagariName);
    });

    it("CHALLENGE 1.4: Name boundary testing (1-char rejected, 2-char accepted, 100-char accepted, 101-char rejected)", () => {
      // 1-char
      expect(
        validateStaffProvisioningInput({
          full_name: "A",
          email: "a@example.com",
          store_role: "staff",
        }).valid
      ).toBe(false);

      // 2-char
      expect(
        validateStaffProvisioningInput({
          full_name: "Om",
          email: "om@example.com",
          store_role: "staff",
        }).valid
      ).toBe(true);

      // 100-char
      const name100 = "A".repeat(100);
      expect(
        validateStaffProvisioningInput({
          full_name: name100,
          email: "test@example.com",
          store_role: "staff",
        }).valid
      ).toBe(true);

      // 101-char
      const name101 = "A".repeat(101);
      const res101 = validateStaffProvisioningInput({
        full_name: name101,
        email: "test@example.com",
        store_role: "staff",
      });
      expect(res101.valid).toBe(false);
      expect(res101.errors.full_name).toContain("cannot exceed 100 characters");
    });

    it("CHALLENGE 1.5: Phone number variations and Indian format normalization", () => {
      const testCases = [
        { input: "+91 98765 43210", expected: "9876543210" },
        { input: "09876543210", expected: "9876543210" },
        { input: "98765-43210", expected: "9876543210" },
        { input: "9876543210", expected: "9876543210" },
      ];

      for (const tc of testCases) {
        const res = validateStaffProvisioningInput({
          full_name: "Aarav Patel",
          email: "aarav@example.com",
          phone: tc.input,
          store_role: "cashier",
        });
        expect(res.valid).toBe(true);
        expect(res.sanitized?.phone).toBe(tc.expected);
      }

      // Invalid phones
      const invalidPhones = ["12345", "9876543210123", "abcdefghij", "+1 555 123 4567"];
      for (const badPhone of invalidPhones) {
        const res = validateStaffProvisioningInput({
          full_name: "Aarav Patel",
          email: "aarav@example.com",
          phone: badPhone,
          store_role: "cashier",
        });
        expect(res.valid).toBe(false);
        expect(res.errors.phone).toBeDefined();
      }
    });

    it("CHALLENGE 1.6: Email normalization (uppercase, leading/trailing whitespace, dot edge cases)", () => {
      const res = validateStaffProvisioningInput({
        full_name: "Vikram Seth",
        email: "   VIKRAM.SETH@CredSmart.Online   ",
        store_role: "salesman",
      });

      expect(res.valid).toBe(true);
      expect(res.sanitized?.email).toBe("vikram.seth@credsmart.online");

      // Malformed emails
      const badEmails = [
        "user@",
        "@domain.com",
        "user..double@domain.com",
        ".startdot@domain.com",
        "user@domain..com",
        "plainaddress",
      ];
      for (const bad of badEmails) {
        const invalidRes = validateStaffProvisioningInput({
          full_name: "Test",
          email: bad,
          store_role: "salesman",
        });
        expect(invalidRes.valid).toBe(false);
      }
    });

    it("CHALLENGE 1.7: Cryptographic password generator entropy and charset coverage", () => {
      const passwords = Array.from({ length: 50 }, () => generateCryptographicPassword(14));

      // Uniqueness check
      const unique = new Set(passwords);
      expect(unique.size).toBe(50);

      // Character class verification
      for (const pwd of passwords) {
        expect(pwd.length).toBe(14);
        expect(/[A-Z]/.test(pwd)).toBe(true); // Uppercase
        expect(/[a-z]/.test(pwd)).toBe(true); // Lowercase
        expect(/[0-9]/.test(pwd)).toBe(true); // Digit
        expect(/[^A-Za-z0-9]/.test(pwd)).toBe(true); // Symbol
      }
    });
  });

  // ==========================================================================
  // SECTION 2: Task Creation Boundary & Unassigned Tasks
  // ==========================================================================

  describe("2. Task Creation Boundaries & Unassigned Tasks", () => {
    it("CHALLENGE 2.1: Task creation without assignee succeeds and defaults cleanly", () => {
      const res = validateCreateTaskInput({
        title: "Reconcile unallocated cash vouchers",
        description: "Review cash drawer variance",
        priority: "normal",
      });

      expect(res.valid).toBe(true);
      expect(res.sanitized?.assigned_to).toBeUndefined();
      expect(res.sanitized?.assigned_to_name).toBe("Unassigned");
      expect(res.sanitized?.requires_proof).toBe(false);
    });

    it("CHALLENGE 2.2: Extreme task titles (Devanagari, 255-char limit, boundary check)", () => {
      // Exact 255 chars
      const title255 = "A".repeat(255);
      const res255 = validateCreateTaskInput({ title: title255 });
      expect(res255.valid).toBe(true);
      expect(res255.sanitized?.title.length).toBe(255);

      // 256 chars (rejected)
      const title256 = "A".repeat(256);
      const res256 = validateCreateTaskInput({ title: title256 });
      expect(res256.valid).toBe(false);
      expect(res256.errors.title).toContain("cannot exceed 255 characters");

      // Devanagari enterprise task title
      const devanagariTitle = "दैनिक रोकड़ मिलान एवं लेजर ऑडिट (सप्ताह 42)";
      const resDev = validateCreateTaskInput({ title: devanagariTitle });
      expect(resDev.valid).toBe(true);
      expect(resDev.sanitized?.title).toBe(devanagariTitle);

      // Sub-minimum title (< 3 chars)
      expect(validateCreateTaskInput({ title: "AB" }).valid).toBe(false);
      expect(validateCreateTaskInput({ title: "   " }).valid).toBe(false);
    });

    it("CHALLENGE 2.3: Due date formats (valid YYYY-MM-DD vs invalid)", () => {
      expect(validateCreateTaskInput({ title: "Valid Date", due_date: "2026-10-31" }).valid).toBe(true);
      expect(validateCreateTaskInput({ title: "Invalid Date", due_date: "31-10-2026" }).valid).toBe(false);
      expect(validateCreateTaskInput({ title: "Invalid Date", due_date: "2026/10/31" }).valid).toBe(false);
      expect(validateCreateTaskInput({ title: "Invalid Date", due_date: "invalid" }).valid).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 3: Task State Transitions & Lifecycle Invariants
  // ==========================================================================

  describe("3. Task State Transition Invariants", () => {
    const baseTask: CRMTaskModel = {
      id: "task-001",
      org_id: "org-100",
      title: "Store inventory audit",
      description: "Count aisle 3",
      priority: "normal",
      status: "todo",
      due_date: "2026-10-25",
      requires_proof: true,
      assigned_to: "staff-1",
      assigned_to_name: "Rohan",
      created_at: "2026-10-21T00:00:00Z",
      updated_at: "2026-10-21T00:00:00Z",
    };

    it("CHALLENGE 3.1: Invalid transition from 'todo' directly to 'done' is strictly blocked", () => {
      const res = transitionTaskStatus(baseTask, "done");
      expect(res.success).toBe(false);
      expect(res.error).toContain("cannot transition directly from To Do to Done");
    });

    it("CHALLENGE 3.2: Invalid transition from 'todo' directly to 'review' is strictly blocked", () => {
      const res = transitionTaskStatus(baseTask, "review");
      expect(res.success).toBe(false);
      expect(res.error).toContain("must be moved to In Progress before requesting review");
    });

    it("CHALLENGE 3.3: 'in_progress' to 'review' requires proof notes when requires_proof is true", () => {
      const inProgTask: CRMTaskModel = { ...baseTask, status: "in_progress", requires_proof: true };

      // Missing proof notes -> rejected
      const failRes1 = transitionTaskStatus(inProgTask, "review");
      expect(failRes1.success).toBe(false);
      expect(failRes1.error).toContain("Proof of work notes are required");

      // Whitespace-only proof notes -> rejected
      const failRes2 = transitionTaskStatus(inProgTask, "review", { proof_notes: "   \n  " });
      expect(failRes2.success).toBe(false);
      expect(failRes2.error).toContain("Proof of work notes are required");

      // Valid proof notes -> accepted
      const passRes = transitionTaskStatus(inProgTask, "review", {
        proof_notes: "Count completed: 142 items verified against physical shelf stock.",
      });
      expect(passRes.success).toBe(true);
      expect(passRes.task?.status).toBe("review");
      expect(passRes.task?.proof_notes).toBe("Count completed: 142 items verified against physical shelf stock.");
    });

    it("CHALLENGE 3.4: 'in_progress' cannot transition directly to 'done' if requires_proof is true", () => {
      const inProgTask: CRMTaskModel = { ...baseTask, status: "in_progress", requires_proof: true };
      const res = transitionTaskStatus(inProgTask, "done");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Tasks requiring proof must be submitted for review");
    });

    it("CHALLENGE 3.5: 'in_progress' CAN transition directly to 'done' if requires_proof is false", () => {
      const noProofTask: CRMTaskModel = { ...baseTask, status: "in_progress", requires_proof: false };
      const res = transitionTaskStatus(noProofTask, "done", { operator_id: "staff-1" });
      expect(res.success).toBe(true);
      expect(res.task?.status).toBe("done");
      expect(res.task?.completed_at).toBeDefined();
    });

    it("CHALLENGE 3.6: 'review' to 'in_progress' operates as manager revision request with feedback", () => {
      const reviewTask: CRMTaskModel = {
        ...baseTask,
        status: "review",
        proof_notes: "Initial count submitted",
      };

      const res = transitionTaskStatus(reviewTask, "in_progress", {
        review_feedback: "Shelf B items missing from count sheet. Please recheck.",
      });

      expect(res.success).toBe(true);
      expect(res.task?.status).toBe("in_progress");
      expect(res.task?.review_feedback).toBe("Shelf B items missing from count sheet. Please recheck.");
    });

    it("CHALLENGE 3.7: 'review' to 'done' records completion timestamp and approver ID", () => {
      const reviewTask: CRMTaskModel = {
        ...baseTask,
        status: "review",
        proof_notes: "Initial count submitted",
      };

      const res = transitionTaskStatus(reviewTask, "done", {
        operator_id: "manager-user-99",
      });

      expect(res.success).toBe(true);
      expect(res.task?.status).toBe("done");
      expect(res.task?.approved_by).toBe("manager-user-99");
      expect(res.task?.completed_at).toBeDefined();
      expect(res.task?.approved_at).toBeDefined();
    });

    it("CHALLENGE 3.8: 'review' cannot jump directly back to 'todo'", () => {
      const reviewTask: CRMTaskModel = { ...baseTask, status: "review" };
      const res = transitionTaskStatus(reviewTask, "todo");
      expect(res.success).toBe(false);
      expect(res.error).toContain("cannot be reset directly to To Do");
    });

    it("CHALLENGE 3.9: 'done' task cannot transition without explicit reopening", () => {
      const doneTask: CRMTaskModel = { ...baseTask, status: "done", completed_at: "2026-10-21T02:00:00Z" };
      const res = transitionTaskStatus(doneTask, "in_progress");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Completed tasks are final");
    });

    it("CHALLENGE 3.10: Self-transition (current == next) is a no-op that preserves state", () => {
      const task: CRMTaskModel = { ...baseTask, status: "in_progress" };
      const res = transitionTaskStatus(task, "in_progress");
      expect(res.success).toBe(true);
      expect(res.task?.status).toBe("in_progress");
    });
  });

  // ==========================================================================
  // SECTION 4: KPI Metrics Calculation Oracle & Mathematical Stress
  // ==========================================================================

  describe("4. Task Metrics KPI Calculation Oracle", () => {
    it("CHALLENGE 4.1: Zero tasks returns all zeroes and does NOT result in NaN or divide-by-zero", () => {
      const metrics = calculateTaskMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.inProgress).toBe(0);
      expect(metrics.review).toBe(0);
      expect(metrics.done).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(Number.isNaN(metrics.completionRate)).toBe(false);
    });

    it("CHALLENGE 4.2: Accurate rounding of completion rate percentage", () => {
      // 1 done out of 3 total -> 33.333% -> 33%
      const tasks1 = [
        { status: "done" },
        { status: "todo" },
        { status: "in_progress" },
      ] as CRMTaskModel[];
      expect(calculateTaskMetrics(tasks1).completionRate).toBe(33);

      // 2 done out of 3 total -> 66.666% -> 67%
      const tasks2 = [
        { status: "done" },
        { status: "done" },
        { status: "in_progress" },
      ] as CRMTaskModel[];
      expect(calculateTaskMetrics(tasks2).completionRate).toBe(67);
    });

    it("CHALLENGE 4.3: High-volume stress test with 10,000 tasks", () => {
      const largeTasks: CRMTaskModel[] = [];
      for (let i = 0; i < 10000; i++) {
        let status: CRMTaskModel["status"] = "todo";
        if (i % 4 === 1) status = "in_progress";
        else if (i % 4 === 2) status = "review";
        else if (i % 4 === 3) status = "done";

        largeTasks.push({
          id: `task-${i}`,
          org_id: "org-stress",
          title: `Task ${i}`,
          description: "",
          priority: "normal",
          status,
          due_date: "2026-10-31",
          requires_proof: false,
          assigned_to_name: "Staff",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      const start = performance.now();
      const metrics = calculateTaskMetrics(largeTasks);
      const elapsed = performance.now() - start;

      expect(metrics.total).toBe(10000);
      expect(metrics.inProgress).toBe(2500);
      expect(metrics.review).toBe(2500);
      expect(metrics.done).toBe(2500);
      expect(metrics.completionRate).toBe(25);
      expect(elapsed).toBeLessThan(50); // Under 50ms for 10,000 items
    });
  });

  // ==========================================================================
  // SECTION 5: Frontend API Client (crmApi) Resilience & Error Normalization
  // ==========================================================================

  describe("5. Frontend crmApi Service Resilience", () => {
    it("CHALLENGE 5.1: Handles API 409 Conflict gracefully on duplicate staff provisioning", async () => {
      vi.spyOn(apiClientModule, "apiPost").mockResolvedValue({
        data: null,
        error: { message: "A staff member with this email already belongs to this organization" },
      });

      const res = await provisionStaffUser({
        full_name: "Rohan Gupta",
        email: "rohan@example.com",
        password: "ValidPassword123!",
        store_role: "salesman",
        organization_id: "org-1",
      });

      expect(res.data).toBeNull();
      expect(res.error?.message).toContain("already belongs to this organization");
    });

    it("CHALLENGE 5.2: Handles network disconnection when fetching tasks", async () => {
      vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: null,
        error: { message: "Failed to fetch: NetworkError when attempting to fetch resource" },
      });

      const res = await getCRMTasks("org-disconnected");
      expect(res.data).toBeNull();
      expect(res.error?.message).toContain("Failed to fetch");
    });

    it("CHALLENGE 5.3: Task deletion handles 404 Not Found cleanly", async () => {
      vi.spyOn(apiClientModule, "apiDelete").mockResolvedValue({
        data: null,
        error: { message: "Task not found or unauthorized" },
      });

      const res = await deleteCRMTask("non-existent-task-id", "org-1");
      expect(res.data).toBeNull();
      expect(res.error?.message).toContain("Task not found");
    });

    it("CHALLENGE 5.4: updateCRMTask propagates review_feedback and completed_at fields", async () => {
      const mockPatch = vi.spyOn(apiClientModule, "apiPatch").mockResolvedValue({
        data: {
          id: "task-patched",
          org_id: "org-1",
          title: "Audited Register",
          description: "",
          priority: "urgent",
          status: "done",
          requires_proof: true,
          completed_at: "2026-10-21T18:00:00Z",
          approved_by: "mgr-1",
          review_feedback: "Approved with compliments",
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      const res = await updateCRMTask("task-patched", {
        status: "done",
        completed_at: "2026-10-21T18:00:00Z",
        approved_by: "mgr-1",
        review_feedback: "Approved with compliments",
        org_id: "org-1",
      });

      expect(mockPatch).toHaveBeenCalledWith(
        "/crm/tasks/task-patched",
        expect.objectContaining({
          status: "done",
          completed_at: "2026-10-21T18:00:00Z",
          approved_by: "mgr-1",
          review_feedback: "Approved with compliments",
        }),
        expect.anything()
      );
      expect(res.data?.status).toBe("done");
      expect(res.data?.approved_by).toBe("mgr-1");
    });
  });

  // ==========================================================================
  // SECTION 6: Overdue Task Calculation & Date Edge Cases
  // ==========================================================================

  describe("6. Overdue Calculation Edge Cases", () => {
    it("CHALLENGE 6.1: Accurately identifies overdue tasks relative to today", () => {
      const pastTask: CRMTaskModel = {
        id: "t1",
        org_id: "o1",
        title: "Past task",
        description: "",
        priority: "normal",
        status: "todo",
        due_date: "2026-10-10",
        requires_proof: false,
        assigned_to_name: "Staff",
        created_at: "2026-10-01",
        updated_at: "2026-10-01",
      };

      const futureTask: CRMTaskModel = {
        ...pastTask,
        id: "t2",
        due_date: "2026-10-30",
      };

      const donePastTask: CRMTaskModel = {
        ...pastTask,
        id: "t3",
        status: "done",
      };

      const refDate = "2026-10-21";

      // Past incomplete task is overdue
      expect(isTaskOverdue(pastTask, refDate)).toBe(true);

      // Future task is not overdue
      expect(isTaskOverdue(futureTask, refDate)).toBe(false);

      // Completed past task is NEVER overdue
      expect(isTaskOverdue(donePastTask, refDate)).toBe(false);
    });
  });
});
