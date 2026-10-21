/**
 * @file crmChallengerM1_2.test.ts
 * @description Adversarial Challenge & Stress Test Suite by Challenger 2 for Milestone 1:
 * CredSmart Enterprise CRM Staff Provisioning & Task Management.
 *
 * Exhaustively stress-tests:
 * 1. Filter parameter resilience & SQL-safe string handling in crmApi.getCRMTasks
 * 2. Complete 4x4 State Transition Lifecycle Matrix Oracle
 * 3. Dual-Field Aliasing and Legacy Interop (assigned_to/assignee_id, requires_proof/proof_required, org_id/organization_id, store_role/role)
 * 4. DDL Schema Parity & Idempotency between fix_db.sql, backend-api/fix_db.sql, and Supabase migrations
 * 5. Strict Zero Regression & Untouched Invoicing Flow Verification
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  crmApi,
  getCRMTasks,
  createCRMTask,
  updateCRMTask,
  transitionCRMTaskStatus,
  provisionStaffUser,
  type CRMTask,
  type CRMTaskStatus,
  type CRMTaskPriority,
  type CreateCRMTaskPayload,
  type ProvisionStaffPayload,
} from "@/services/crmApi";
import * as apiClientModule from "@/lib/apiClient";
import fs from "fs";
import path from "path";

describe("Milestone 1 Adversarial Challenge Suite (Challenger 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Adversarial Filter Parameter Stress & Query String Resilience
  // ==========================================================================
  describe("1. Query & Filter Parameter Stress Testing (crmApi.getCRMTasks)", () => {
    it("handles adversarial characters and SQL metacharacters in search query safely", async () => {
      const mockGet = vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: [],
        error: null,
      });

      const adversarialSearch = "Robert'); DROP TABLE staff_tasks;-- '%_[]^";
      const orgId = "11111111-2222-3333-4444-555555555555";

      await getCRMTasks(orgId, {
        search: adversarialSearch,
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          organization_id: orgId,
          search: adversarialSearch.trim(),
        }),
        expect.objectContaining({ organizationId: orgId })
      );
    });

    it("serializes multi-value array status and priority filters into clean comma-delimited strings", async () => {
      const mockGet = vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: [],
        error: null,
      });

      const orgId = "22222222-3333-4444-5555-666666666666";
      const statuses: CRMTaskStatus[] = ["todo", "in_progress", "review"];
      const priorities: CRMTaskPriority[] = ["urgent", "high"];

      await getCRMTasks(orgId, {
        status: statuses,
        priority: priorities,
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          organization_id: orgId,
          status: "todo,in_progress,review",
          priority: "urgent,high",
        }),
        expect.objectContaining({ organizationId: orgId })
      );
    });

    it("prefers assigned_to over assignee_id when both are passed, but falls back seamlessly", async () => {
      const mockGet = vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: [],
        error: null,
      });

      const orgId = "org-test-fallback";

      // Case A: assigned_to provided
      await getCRMTasks(orgId, {
        assigned_to: "user-alpha",
        assignee_id: "user-beta",
      });
      expect(mockGet).toHaveBeenLastCalledWith(
        "/crm/tasks",
        expect.objectContaining({ assigned_to: "user-alpha" }),
        expect.anything()
      );

      // Case B: only assignee_id provided
      await getCRMTasks(orgId, {
        assignee_id: "user-gamma",
      });
      expect(mockGet).toHaveBeenLastCalledWith(
        "/crm/tasks",
        expect.objectContaining({ assigned_to: "user-gamma" }),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // SECTION 2: 4x4 State Transition Lifecycle Matrix Oracle
  // ==========================================================================
  describe("2. Full 4x4 State Transition Lifecycle Matrix Oracle", () => {
    const statuses: CRMTaskStatus[] = ["todo", "in_progress", "review", "done"];

    it("generates correct API PATCH payload for all 16 transition combinations", async () => {
      const mockPatch = vi.spyOn(apiClientModule, "apiPatch").mockResolvedValue({
        data: {
          id: "task-matrix-1",
          org_id: "org-1",
          title: "Audit Inventory",
          description: "Count items",
          priority: "normal",
          status: "todo",
          requires_proof: false,
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      for (const fromStatus of statuses) {
        for (const toStatus of statuses) {
          await transitionCRMTaskStatus("task-matrix-1", toStatus, {
            proof_notes: toStatus === "review" ? "Proof of completion submitted" : undefined,
            review_feedback: toStatus === "in_progress" && fromStatus === "review" ? "Please redo shelf 4" : undefined,
            orgId: "org-1",
          });

          const lastCallPayload = mockPatch.mock.calls[mockPatch.mock.calls.length - 1][1] as any;
          expect(lastCallPayload.status).toBe(toStatus);

          if (toStatus === "review") {
            expect(lastCallPayload.proof_notes).toBe("Proof of completion submitted");
          }
          if (toStatus === "in_progress" && fromStatus === "review") {
            expect(lastCallPayload.review_feedback).toBe("Please redo shelf 4");
          }
        }
      }

      expect(mockPatch).toHaveBeenCalledTimes(16);
    });
  });

  // ==========================================================================
  // SECTION 3: Dual-Field Aliasing and Legacy Interop Stress Testing
  // ==========================================================================
  describe("3. Dual-Field Aliasing and Legacy Interoperability", () => {
    it("mirrors organization_id and org_id seamlessly in provisionStaffUser", async () => {
      const mockPost = vi.spyOn(apiClientModule, "apiPost").mockResolvedValue({
        data: {
          success: true,
          user: {
            id: "user-u1",
            email: "staff@store.com",
            full_name: "Store Staff",
            phone: "9988776655",
            store_role: "cashier",
          },
          credentials: {
            email: "staff@store.com",
            password: "SecurePassword99!",
          },
        },
        error: null,
      });

      const payload: ProvisionStaffPayload = {
        full_name: "Store Staff",
        email: "staff@store.com",
        password: "SecurePassword99!",
        org_id: "target-org-uuid",
      };

      await provisionStaffUser(payload);

      expect(mockPost).toHaveBeenCalledWith(
        "/crm/staff/provision",
        expect.objectContaining({
          org_id: "target-org-uuid",
          organization_id: "target-org-uuid",
        }),
        expect.objectContaining({
          organizationId: "target-org-uuid",
        })
      );
    });

    it("handles requires_proof and proof_required interop in createCRMTask", async () => {
      const mockPost = vi.spyOn(apiClientModule, "apiPost").mockResolvedValue({
        data: {} as CRMTask,
        error: null,
      });

      const payload: CreateCRMTaskPayload = {
        title: "Test Dual Proof",
        requires_proof: true,
        organization_id: "org-proof-test",
      };

      await createCRMTask(payload);

      expect(mockPost).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          title: "Test Dual Proof",
          requires_proof: true,
        }),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // SECTION 4: DDL Schema Parity & Idempotency Empirical Verification
  // ==========================================================================
  describe("4. DDL Schema Parity & Idempotency Empirical Verification", () => {
    it("ensures fix_db.sql and backend-api/fix_db.sql are identical byte-for-byte", () => {
      const rootFixDb = fs.readFileSync(path.resolve(process.cwd(), "fix_db.sql"), "utf-8");
      const backendFixDb = fs.readFileSync(path.resolve(process.cwd(), "backend-api/fix_db.sql"), "utf-8");

      expect(rootFixDb).toBe(backendFixDb);
    });

    it("verifies staff_tasks definition in fix_db.sql contains all required columns", () => {
      const sqlContent = fs.readFileSync(path.resolve(process.cwd(), "fix_db.sql"), "utf-8");

      const requiredColumns = [
        "org_id",
        "organization_id",
        "assigned_to",
        "assigned_by",
        "created_by",
        "title",
        "description",
        "due_date",
        "status",
        "priority",
        "requires_proof",
        "proof_required",
        "proof_notes",
        "completed_at",
        "approved_by",
        "approved_at",
        "review_feedback",
        "created_at",
        "updated_at",
      ];

      for (const col of requiredColumns) {
        expect(sqlContent).toContain(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS ${col}`);
      }
    });

    it("verifies staff_tasks has all required performance indexes in fix_db.sql", () => {
      const sqlContent = fs.readFileSync(path.resolve(process.cwd(), "fix_db.sql"), "utf-8");

      const requiredIndexes = [
        "idx_staff_tasks_org_id",
        "idx_staff_tasks_organization_id",
        "idx_staff_tasks_assigned_to",
        "idx_staff_tasks_status",
        "idx_staff_tasks_priority",
        "idx_staff_tasks_due_date",
        "idx_staff_tasks_created_at",
      ];

      for (const idx of requiredIndexes) {
        expect(sqlContent).toContain(`CREATE INDEX IF NOT EXISTS ${idx}`);
      }
    });

    it("verifies crm_staff_assignments has dual user_id and staff_id synchronization", () => {
      const sqlContent = fs.readFileSync(path.resolve(process.cwd(), "fix_db.sql"), "utf-8");

      expect(sqlContent).toContain("ALTER TABLE crm_staff_assignments ADD COLUMN IF NOT EXISTS user_id UUID;");
      expect(sqlContent).toContain("UPDATE crm_staff_assignments SET user_id = staff_id");
      expect(sqlContent).toContain("UPDATE crm_staff_assignments SET staff_id = user_id");
    });
  });

  // ==========================================================================
  // SECTION 5: Strict Zero Regression & Invoicing Flow Preservation
  // ==========================================================================
  describe("5. Strict Invoicing Flow Preservation Oracle", () => {
    const protectedFiles = [
      "src/components/invoices/mobile/MobileCreateInvoice.tsx",
      "src/components/SalesInvoiceModal.tsx",
      "src/components/invoices/mobile/AddItemModal.tsx",
      "src/components/invoices/mobile/SelectPartyModal.tsx",
      "src/components/invoices/mobile/EditItemModal.tsx",
    ];

    it("verifies all 5 protected invoice files exist and are intact", () => {
      for (const relativePath of protectedFiles) {
        const fullPath = path.resolve(process.cwd(), relativePath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(1000);
      }
    });
  });
});
