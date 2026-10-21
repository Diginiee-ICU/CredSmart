import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tasks from "@/pages/crm/Tasks";
import Broadcasts from "@/pages/crm/Broadcasts";
import Meet from "@/pages/crm/Meet";
import AIAssistant from "@/pages/crm/AIAssistant";
import Support from "@/pages/crm/Support";
import { ROUTE_PATHS } from "@/config/routes";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null, data: [] }),
          gte: vi.fn().mockResolvedValue({ count: 2, error: null, data: [] }),
          neq: vi.fn().mockResolvedValue({ count: 4, error: null, data: [] }),
        }),
      }),
    }),
  },
}));

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: "org-submodules-test",
    org: { id: "org-submodules-test", name: "CredSmart Flagship Store" },
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    hasPermission: () => true,
    isSuperAdmin: true,
    allowed: true,
    loading: false,
    userRoles: [{ id: "r1", name: "Super Admin", is_super_admin: true }],
  }),
  usePermission: () => ({ allowed: true, loading: false }),
}));

describe("Dedicated CRM Submodules Suite (Tasks, Broadcasts, Meet, AI Assistant, Support)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("1. Tasks Module (src/pages/crm/Tasks.tsx)", () => {
    it("renders Tasks page header, title, badges, and metric cards", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("Task & Job Workflows")).toBeInTheDocument();
      expect(screen.getByText("Phase 3 Active")).toBeInTheDocument();
      expect(screen.getByText("Total Tasks")).toBeInTheDocument();
      expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
      expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Create Task")).toBeInTheDocument();
    });

    it("renders Kanban columns and allows switching to Table view", () => {
      render(
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      );

      expect(screen.getByText("To Do")).toBeInTheDocument();
      expect(screen.getByText("Under Review")).toBeInTheDocument();

      // Switch to Table view
      const tableBtn = screen.getByTitle("Data Table View");
      fireEvent.click(tableBtn);

      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Assignee")).toBeInTheDocument();
    });
  });

  describe("2. Broadcasts Module (src/pages/crm/Broadcasts.tsx)", () => {
    it("renders Broadcasts page header, circulars, and urgency indicators", () => {
      render(
        <MemoryRouter>
          <Broadcasts />
        </MemoryRouter>
      );

      expect(screen.getByText("Live Broadcasts & Circulars")).toBeInTheDocument();
      expect(screen.getByText("Phase 4 Active")).toBeInTheDocument();
      expect(screen.getByText("Total Circulars")).toBeInTheDocument();
      expect(screen.getByText("Urgent Alerts")).toBeInTheDocument();
      expect(screen.getByText("Pinned Notices")).toBeInTheDocument();
      expect(screen.getByText("Publish Broadcast")).toBeInTheDocument();
    });

    it("allows toggling receipt confirmation on circulars", () => {
      render(
        <MemoryRouter>
          <Broadcasts />
        </MemoryRouter>
      );

      const confirmBtns = screen.getAllByText(/Confirm Receipt|Acknowledged/);
      expect(confirmBtns.length).toBeGreaterThan(0);
      fireEvent.click(confirmBtns[0]);
    });
  });

  describe("3. Meet Module (src/pages/crm/Meet.tsx)", () => {
    it("renders Meet header, instant room launcher, and scheduled meetings", () => {
      render(
        <MemoryRouter>
          <Meet />
        </MemoryRouter>
      );

      expect(screen.getByText("CredSmart Meet & Video Huddles")).toBeInTheDocument();
      expect(screen.getByText("WebRTC Ready")).toBeInTheDocument();
      expect(screen.getByText("Instant Team Huddle Room")).toBeInTheDocument();
      expect(screen.getByText("Join Room Now")).toBeInTheDocument();
      expect(screen.getByText("Scheduled Meetings & Shift Handovers")).toBeInTheDocument();
      expect(screen.getByText("Schedule Meeting")).toBeInTheDocument();
    });

    it("copies instant room link when clicking Copy Link button", () => {
      render(
        <MemoryRouter>
          <Meet />
        </MemoryRouter>
      );

      const copyBtn = screen.getByText("Copy Link");
      expect(copyBtn).toBeInTheDocument();
      fireEvent.click(copyBtn);
    });
  });

  describe("4. AI Assistant Module (src/pages/crm/AIAssistant.tsx)", () => {
    it("renders AI Assistant header, suggested prompts, and welcome message", () => {
      render(
        <MemoryRouter>
          <AIAssistant />
        </MemoryRouter>
      );

      expect(screen.getByText("CRM AI Assistant")).toBeInTheDocument();
      expect(screen.getByText("Linear Copilot")).toBeInTheDocument();
      expect(screen.getByText("Suggested Prompts")).toBeInTheDocument();
      expect(screen.getByText("Draft WhatsApp Reminder")).toBeInTheDocument();
      expect(screen.getByText(/CredSmart CRM Intelligence Assistant/)).toBeInTheDocument();
    });

    it("triggers suggestion prompt and renders response message", async () => {
      render(
        <MemoryRouter>
          <AIAssistant />
        </MemoryRouter>
      );

      const promptBtn = screen.getByText("Draft WhatsApp Reminder");
      fireEvent.click(promptBtn);

      await waitFor(
        () => {
          expect(screen.getByText(/Dear Valued Partner/i)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe("5. Support Desk Module (src/pages/crm/Support.tsx)", () => {
    it("renders Support desk header, SLA countdown metrics, and ticket table", () => {
      render(
        <MemoryRouter>
          <Support />
        </MemoryRouter>
      );

      expect(screen.getByText("Customer & Internal Support Desk")).toBeInTheDocument();
      expect(screen.getByText("SLA Live")).toBeInTheDocument();
      expect(screen.getByText("Open Tickets")).toBeInTheDocument();
      expect(screen.getByText("SLA At Risk")).toBeInTheDocument();
      expect(screen.getByText("Open Ticket")).toBeInTheDocument();
      expect(screen.getByText("Ticket ID")).toBeInTheDocument();
    });

    it("opens ticket thread modal when clicking View Thread", () => {
      render(
        <MemoryRouter>
          <Support />
        </MemoryRouter>
      );

      const viewBtns = screen.getAllByText("View Thread");
      expect(viewBtns.length).toBeGreaterThan(0);
      fireEvent.click(viewBtns[0]);

      expect(screen.getByText("Post Reply")).toBeInTheDocument();
    });
  });

  describe("6. Route Consistency Invariant Check", () => {
    it("validates all 5 submodules map to exact canonical paths", () => {
      expect(ROUTE_PATHS.crmTasks).toBe("/crm/tasks");
      expect(ROUTE_PATHS.crmMeet).toBe("/crm/meet");
      expect(ROUTE_PATHS.crmBroadcasts).toBe("/crm/broadcasts");
      expect(ROUTE_PATHS.crmAiAssistant).toBe("/crm/ai-assistant");
      expect(ROUTE_PATHS.crmSupport).toBe("/crm/support");
      expect(ROUTE_PATHS.crmSalary).toBe("/crm/salary");
    });
  });
});
