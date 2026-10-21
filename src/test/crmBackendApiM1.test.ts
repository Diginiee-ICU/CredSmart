import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  crmApi,
  provisionStaffUser,
  getCRMTasks,
  createCRMTask,
  updateCRMTask,
  transitionCRMTaskStatus,
  deleteCRMTask,
  type CRMTask,
  type ProvisionStaffPayload,
  type CreateCRMTaskPayload,
} from "@/services/crmApi";
import * as apiClientModule from "@/lib/apiClient";

describe("Milestone 1 CRM Backend Client API Suite (src/services/crmApi.ts)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Staff User Provisioning: provisionStaffUser", () => {
    it("calls POST /crm/staff/provision with sanitized payload and organization header", async () => {
      const mockPost = vi.spyOn(apiClientModule, "apiPost").mockResolvedValue({
        data: {
          success: true,
          user: {
            id: "user-101",
            email: "rohan@example.com",
            full_name: "Rohan Gupta",
            phone: "9876543210",
            store_role: "salesman",
            crm_role_id: "role-501",
            crm_role_name: "Sales Executive",
            crm_role_color: "#1D4ED8",
          },
          credentials: {
            email: "rohan@example.com",
            password: "SecretPassword123!",
          },
        },
        error: null,
      });

      const payload: ProvisionStaffPayload = {
        full_name: "Rohan Gupta",
        email: "rohan@example.com",
        password: "SecretPassword123!",
        phone: "9876543210",
        store_role: "salesman",
        crm_role_id: "role-501",
        organization_id: "org-test-uuid",
      };

      const res = await provisionStaffUser(payload);

      expect(mockPost).toHaveBeenCalledWith(
        "/crm/staff/provision",
        expect.objectContaining({
          email: "rohan@example.com",
          full_name: "Rohan Gupta",
          organization_id: "org-test-uuid",
          crm_role_id: "role-501",
        }),
        expect.objectContaining({
          organizationId: "org-test-uuid",
        })
      );

      expect(res.data?.success).toBe(true);
      expect(res.data?.user.id).toBe("user-101");
      expect(res.data?.credentials.password).toBe("SecretPassword123!");
    });

    it("exported under crmApi namespace", () => {
      expect(crmApi.provisionStaffUser).toBe(provisionStaffUser);
    });
  });

  describe("2. Fetch CRM Tasks: getCRMTasks", () => {
    it("calls GET /crm/tasks with organization id and parsed filters", async () => {
      const mockGet = vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: [
          {
            id: "task-1",
            org_id: "org-test",
            title: "Reconcile Day Book",
            description: "Daily count",
            priority: "urgent",
            status: "todo",
            requires_proof: true,
            created_at: new Date().toISOString(),
          } as CRMTask,
        ],
        error: null,
      });

      const res = await getCRMTasks("org-test", {
        status: ["todo", "in_progress"],
        priority: "urgent",
        assigned_to: "user-123",
        search: "Reconcile",
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          organization_id: "org-test",
          status: "todo,in_progress",
          priority: "urgent",
          assigned_to: "user-123",
          search: "Reconcile",
        }),
        expect.objectContaining({
          organizationId: "org-test",
        })
      );

      expect(res.data?.length).toBe(1);
      expect(res.data?.[0].title).toBe("Reconcile Day Book");
    });

    it("handles assignee_id alias in filters", async () => {
      const mockGet = vi.spyOn(apiClientModule, "apiGet").mockResolvedValue({
        data: [],
        error: null,
      });

      await getCRMTasks("org-test", { assignee_id: "user-999" });

      expect(mockGet).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          assigned_to: "user-999",
        }),
        expect.anything()
      );
    });
  });

  describe("3. Create CRM Task: createCRMTask", () => {
    it("calls POST /crm/tasks with payload and sets organization", async () => {
      const mockPost = vi.spyOn(apiClientModule, "apiPost").mockResolvedValue({
        data: {
          id: "task-created",
          org_id: "org-1",
          title: "New Inventory Count",
          description: "Count aisle 4",
          priority: "high",
          status: "todo",
          requires_proof: true,
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      const payload: CreateCRMTaskPayload = {
        title: "New Inventory Count",
        description: "Count aisle 4",
        priority: "high",
        status: "todo",
        requires_proof: true,
        org_id: "org-1",
      };

      const res = await createCRMTask(payload);

      expect(mockPost).toHaveBeenCalledWith(
        "/crm/tasks",
        expect.objectContaining({
          title: "New Inventory Count",
          priority: "high",
          requires_proof: true,
          org_id: "org-1",
        }),
        expect.objectContaining({
          organizationId: "org-1",
        })
      );

      expect(res.data?.id).toBe("task-created");
    });
  });

  describe("4. Update & Transition Task: updateCRMTask & transitionCRMTaskStatus", () => {
    it("calls PATCH /crm/tasks/:id on updateCRMTask", async () => {
      const mockPatch = vi.spyOn(apiClientModule, "apiPatch").mockResolvedValue({
        data: {
          id: "task-1",
          org_id: "org-1",
          title: "Updated Title",
          description: "",
          priority: "normal",
          status: "in_progress",
          requires_proof: false,
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      const res = await updateCRMTask("task-1", {
        title: "Updated Title",
        status: "in_progress",
        org_id: "org-1",
      });

      expect(mockPatch).toHaveBeenCalledWith(
        "/crm/tasks/task-1",
        expect.objectContaining({
          title: "Updated Title",
          status: "in_progress",
        }),
        expect.objectContaining({
          organizationId: "org-1",
        })
      );
      expect(res.data?.title).toBe("Updated Title");
    });

    it("calls PATCH /crm/tasks/:id with proof notes on transition to review", async () => {
      const mockPatch = vi.spyOn(apiClientModule, "apiPatch").mockResolvedValue({
        data: {
          id: "task-2",
          org_id: "org-1",
          title: "Audit Cash",
          description: "",
          priority: "normal",
          status: "review",
          proof_notes: "Attached photo of register",
          requires_proof: true,
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      const res = await transitionCRMTaskStatus("task-2", "review", {
        proof_notes: "Attached photo of register",
        orgId: "org-1",
      });

      expect(mockPatch).toHaveBeenCalledWith(
        "/crm/tasks/task-2",
        {
          status: "review",
          proof_notes: "Attached photo of register",
        },
        expect.objectContaining({
          organizationId: "org-1",
        })
      );
      expect(res.data?.status).toBe("review");
    });

    it("calls PATCH /crm/tasks/:id with review feedback on manager revision request", async () => {
      const mockPatch = vi.spyOn(apiClientModule, "apiPatch").mockResolvedValue({
        data: {
          id: "task-3",
          org_id: "org-1",
          title: "Audit Cash",
          description: "",
          priority: "normal",
          status: "in_progress",
          review_feedback: "Missing receipt vouchers",
          requires_proof: true,
          created_at: new Date().toISOString(),
        } as CRMTask,
        error: null,
      });

      const res = await transitionCRMTaskStatus("task-3", "in_progress", {
        review_feedback: "Missing receipt vouchers",
      });

      expect(mockPatch).toHaveBeenCalledWith(
        "/crm/tasks/task-3",
        {
          status: "in_progress",
          review_feedback: "Missing receipt vouchers",
        },
        expect.anything()
      );
      expect(res.data?.review_feedback).toBe("Missing receipt vouchers");
    });
  });

  describe("5. Delete Task: deleteCRMTask", () => {
    it("calls DELETE /crm/tasks/:id", async () => {
      const mockDelete = vi.spyOn(apiClientModule, "apiDelete").mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const res = await deleteCRMTask("task-to-delete", "org-1");

      expect(mockDelete).toHaveBeenCalledWith("/crm/tasks/task-to-delete", {
        organizationId: "org-1",
      });
      expect(res.data?.success).toBe(true);
    });
  });

  describe("6. Namespace Integrity: crmApi exports all required methods", () => {
    it("verifies all 6 new methods are on crmApi namespace", () => {
      expect(typeof crmApi.provisionStaffUser).toBe("function");
      expect(typeof crmApi.getCRMTasks).toBe("function");
      expect(typeof crmApi.createCRMTask).toBe("function");
      expect(typeof crmApi.updateCRMTask).toBe("function");
      expect(typeof crmApi.transitionCRMTaskStatus).toBe("function");
      expect(typeof crmApi.deleteCRMTask).toBe("function");
    });
  });
});
