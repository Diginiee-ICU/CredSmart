import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CRMDashboard from "@/pages/crm/CRMDashboard";
import RoleManagement from "@/pages/crm/RoleManagement";
import { ROUTE_PATHS } from "@/config/routes";

// ─── Flexible Supabase Query Mock ──────────────────────────────────────────────

type QueryResponse = {
  count?: number | null;
  error?: Error | { message: string } | null;
  data?: unknown;
  shouldThrow?: boolean;
};

const queryMockState: {
  responses: Record<string, QueryResponse>;
  globalThrow: boolean;
  calls: string[];
} = {
  responses: {},
  globalThrow: false,
  calls: [],
};

const createQueryBuilder = (tableName: string) => {
  queryMockState.calls.push(tableName);

  if (queryMockState.globalThrow) {
    throw new Error(`Hard network failure accessing ${tableName}`);
  }

  const configured = queryMockState.responses[tableName] || {
    count: null,
    error: null,
  };

  const execute = async () => {
    if (configured.shouldThrow) {
      throw new Error(`Database error on table ${tableName}`);
    }
    return {
      count: configured.count ?? null,
      error: configured.error ?? null,
      data: configured.data ?? null,
    };
  };

  // Chainable query builder supporting .select(), .eq(), .neq(), .gte()
  const builder: any = {
    select: (_cols?: string, _opts?: unknown) => builder,
    eq: (_col: string, _val: unknown) => builder,
    neq: (_col: string, _val: unknown) => builder,
    gte: (_col: string, _val: unknown) => builder,
    then: (resolve: (val: any) => void, reject: (err: any) => void) => {
      execute().then(resolve, reject);
    },
  };

  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => createQueryBuilder(table),
  },
}));

// ─── Organization Mock ────────────────────────────────────────────────────────

const mockOrgState: {
  orgId: string | null;
  org: { id: string; name: string } | null;
} = {
  orgId: "org-credsmart-001",
  org: { id: "org-credsmart-001", name: "CredSmart Retail Hub" },
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrgState.orgId,
    org: mockOrgState.org,
  }),
}));

describe("CRMDashboard & RoleManagement Resilience & Shell Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMockState.responses = {};
    queryMockState.globalThrow = false;
    queryMockState.calls = [];
    mockOrgState.orgId = "org-credsmart-001";
    mockOrgState.org = { id: "org-credsmart-001", name: "CredSmart Retail Hub" };
  });

  describe("1. Basic Rendering & Structure", () => {
    it("renders the dashboard header, title, badges, and organization name", async () => {
      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText("CRM Command Center")).toBeInTheDocument();
      expect(screen.getByText("Phase 1 Foundation")).toBeInTheDocument();
      expect(screen.getByText("Live Sync")).toBeInTheDocument();
      expect(screen.getByText(/CredSmart Retail Hub/)).toBeInTheDocument();
      expect(screen.getAllByText("Role Management").length).toBeGreaterThanOrEqual(1);
    });

    it("renders all 5 metric card labels", async () => {
      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText("Total Staff")).toBeInTheDocument();
      expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      expect(screen.getByText("Pending Tasks")).toBeInTheDocument();
      expect(screen.getByText("Broadcasts")).toBeInTheDocument();
      expect(screen.getByText("Upcoming Meet")).toBeInTheDocument();
    });

    it("renders all 8 CRM sub-navigation operation modules with correct labels", async () => {
      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText("Attendance Tracker")).toBeInTheDocument();
      expect(screen.getByText("Salary & Payroll")).toBeInTheDocument();
      expect(screen.getByText("Task Management")).toBeInTheDocument();
      expect(screen.getByText("CredSmart Meet")).toBeInTheDocument();
      expect(screen.getByText("Live Broadcasts")).toBeInTheDocument();
      expect(screen.getByText("CRM AI Assistant")).toBeInTheDocument();
      expect(screen.getByText("Support Desk")).toBeInTheDocument();
      expect(screen.getAllByText("Role Management").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("2. Resilience to Missing Supabase Tables & Database Errors", () => {
    it("handles missing tables (relation does not exist) without unhandled rejection or crashing", async () => {
      // Simulate PostgREST error: relation does not exist for future tables
      queryMockState.responses = {
        organization_memberships: { count: 3, error: null },
        crm_attendance: {
          count: null,
          error: { message: "relation 'public.crm_attendance' does not exist" },
        },
        crm_tasks: {
          count: null,
          error: { message: "relation 'public.crm_tasks' does not exist" },
        },
        crm_broadcasts: {
          count: null,
          error: { message: "relation 'public.crm_broadcasts' does not exist" },
        },
        crm_meetings: {
          count: null,
          error: { message: "relation 'public.crm_meetings' does not exist" },
        },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      // Verify that the dashboard finishes loading and displays valid numbers
      await waitFor(() => {
        expect(screen.getByText("3")).toBeInTheDocument(); // Staff count from valid table
      });

      // Attendance, Tasks, Broadcasts, Meetings should safely fall back to 0
      const zeroes = screen.getAllByText("0");
      expect(zeroes.length).toBeGreaterThanOrEqual(4);
    });

    it("handles hard promise rejection in individual table queries gracefully", async () => {
      queryMockState.responses = {
        organization_memberships: { shouldThrow: true },
        crm_attendance: { shouldThrow: true },
        crm_tasks: { shouldThrow: true },
        crm_broadcasts: { shouldThrow: true },
        crm_meetings: { shouldThrow: true },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      // When all queries throw, fallback staff = 1 and all others = 0
      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument(); // Fallback staff count
      });

      const zeroes = screen.getAllByText("0");
      expect(zeroes.length).toBeGreaterThanOrEqual(4);
    });

    it("handles catastrophic global query failure gracefully with outer fallback", async () => {
      queryMockState.globalThrow = true;

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      // Even on global throws, the dashboard renders and sets default fallback values
      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });

      const zeroes = screen.getAllByText("0");
      expect(zeroes.length).toBeGreaterThanOrEqual(4);
    });

    it("handles null or empty orgId gracefully without throwing or querying", async () => {
      mockOrgState.orgId = null;
      mockOrgState.org = null;

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });

      // When orgId is null, no DB queries should have been attempted
      expect(queryMockState.calls).toHaveLength(0);
    });
  });

  describe("3. Live Data Rendering", () => {
    it("surfaces live counts correctly when Supabase returns valid records", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 18, error: null },
        crm_attendance: { count: 14, error: null },
        crm_tasks: { count: 7, error: null },
        crm_broadcasts: { count: 5, error: null },
        crm_meetings: { count: 2, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("14")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("falls back staff count to 1 if organization_memberships returns 0", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 0, error: null },
        crm_attendance: { count: 0, error: null },
        crm_tasks: { count: 0, error: null },
        crm_broadcasts: { count: 0, error: null },
        crm_meetings: { count: 0, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Staff count is guarded to >= 1 (active store owner)
        expect(screen.getByText("1")).toBeInTheDocument();
      });
    });
  });

  describe("4. Manual Refresh Interaction", () => {
    it("re-triggers stats fetching when clicking the Refresh button", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 2, error: null },
        crm_attendance: { count: 1, error: null },
        crm_tasks: { count: 1, error: null },
        crm_broadcasts: { count: 1, error: null },
        crm_meetings: { count: 1, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });

      const initialCallsCount = queryMockState.calls.length;
      expect(initialCallsCount).toBeGreaterThan(0);

      // Now change the mock response
      queryMockState.responses.organization_memberships = { count: 25, error: null };

      // Click refresh button
      const refreshBtn = screen.getByTitle("Refresh CRM metrics");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
      });

      expect(queryMockState.calls.length).toBeGreaterThan(initialCallsCount);
    });
  });

  describe("5. Responsive Layout Classes & Breakpoints", () => {
    it("enforces responsive grid classes for 375px mobile, 768px tablet, and 1280px desktop", () => {
      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      // Find the metric cards grid container
      const metricSection = screen.getByLabelText("CRM Key Metrics");
      const metricGrid = metricSection.querySelector("div");
      expect(metricGrid).not.toBeNull();

      // Mobile (default): grid-cols-2 (suitable for 375px)
      expect(metricGrid?.className).toContain("grid-cols-2");
      // Tablet: sm:grid-cols-3 (suitable for 768px)
      expect(metricGrid?.className).toContain("sm:grid-cols-3");
      // Desktop: lg:grid-cols-5 (suitable for 1280px)
      expect(metricGrid?.className).toContain("lg:grid-cols-5");

      // Verify Card 5 spans 2 columns on mobile and 1 on tablet/desktop
      const cards = metricGrid?.children;
      expect(cards).toHaveLength(5);
      const meetingCard = cards?.[4];
      expect(meetingCard?.className).toContain("col-span-2");
      expect(meetingCard?.className).toContain("sm:col-span-1");

      // Sub-systems grid: 1 col on mobile, 2 on tablet, 4 on desktop
      const subModulesSection = screen.getByLabelText("CRM Modules and Sub-features");
      const modulesGrid = subModulesSection.querySelector("div.grid");
      expect(modulesGrid).not.toBeNull();
      expect(modulesGrid?.className).toContain("grid-cols-1");
      expect(modulesGrid?.className).toContain("sm:grid-cols-2");
      expect(modulesGrid?.className).toContain("lg:grid-cols-4");
    });
  });

  describe("6. CredSmart Brand Color Tokens", () => {
    it("applies the four required brand color tokens (#0F172A, #FF6A00, #1D4ED8, #10B981)", () => {
      const { container } = render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      const html = container.innerHTML;

      // 1. Navy #0F172A (Headings, primary text, dark accent)
      expect(html).toContain("#0F172A");

      // 2. Orange #FF6A00 (Pending Tasks, Task Management)
      expect(html).toContain("#FF6A00");

      // 3. Blue #1D4ED8 (Primary Actions, Role Management button, Staff metric)
      expect(html).toContain("#1D4ED8");

      // 4. Emerald #10B981 (Attendance, Live Sync, Active badges)
      expect(html).toContain("#10B981");
    });
  });

  describe("7. Sub-Navigation Canonical Route Links", () => {
    it("wires all 8 sub-navigation modules to their exact ROUTE_PATHS", () => {
      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      // Verify link destinations
      const attendanceLink = screen.getByText("Attendance Tracker").closest("a");
      expect(attendanceLink).toHaveAttribute("href", ROUTE_PATHS.crmAttendance);

      const salaryLink = screen.getByText("Salary & Payroll").closest("a");
      expect(salaryLink).toHaveAttribute("href", ROUTE_PATHS.crmSalary);

      const tasksLink = screen.getByText("Task Management").closest("a");
      expect(tasksLink).toHaveAttribute("href", ROUTE_PATHS.crmTasks);

      const meetLink = screen.getByText("CredSmart Meet").closest("a");
      expect(meetLink).toHaveAttribute("href", ROUTE_PATHS.crmMeet);

      const broadcastsLink = screen.getByText("Live Broadcasts").closest("a");
      expect(broadcastsLink).toHaveAttribute("href", ROUTE_PATHS.crmBroadcasts);

      const aiLink = screen.getByText("CRM AI Assistant").closest("a");
      expect(aiLink).toHaveAttribute("href", ROUTE_PATHS.crmAiAssistant);

      const supportLink = screen.getByText("Support Desk").closest("a");
      expect(supportLink).toHaveAttribute("href", ROUTE_PATHS.crmSupport);

      // Role Management in sub-navigation and header
      const roleLinks = screen.getAllByText("Role Management");
      const roleModuleLink = roleLinks.find((el) => el.closest("a")?.getAttribute("href") === ROUTE_PATHS.crmRoles);
      expect(roleModuleLink).toBeDefined();
    });
  });

  describe("8. RoleManagement Initial Functional Shell", () => {
    it("renders the Role & Permission Manager shell without crashing", () => {
      render(
        <MemoryRouter>
          <RoleManagement />
        </MemoryRouter>
      );

      expect(screen.getByText("CRM Role & Permission Manager")).toBeInTheDocument();
      expect(screen.getByText("RBAC Foundation")).toBeInTheDocument();
      expect(screen.getByText("Zero Hard-coded Roles")).toBeInTheDocument();
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("CRM Manager")).toBeInTheDocument();
      expect(screen.getByText("Staff Associate")).toBeInTheDocument();
      expect(screen.getByText("Granular Module Permissions Matrix")).toBeInTheDocument();
    });

    it("provides breadcrumb navigation back to /crm", () => {
      render(
        <MemoryRouter>
          <RoleManagement />
        </MemoryRouter>
      );

      const backLink = screen.getByTitle("Back to CRM Command Center");
      expect(backLink).toHaveAttribute("href", ROUTE_PATHS.crm);
    });
  });

  describe("9. Attendance Live Query & Resilience Edge Cases (Milestone 5 Challenge)", () => {
    it("renders '0 Clocked In Today' when crm_attendance returns 0 count", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 10, error: null },
        crm_attendance: { count: 0, error: null },
        crm_tasks: { count: 0, error: null },
        crm_broadcasts: { count: 0, error: null },
        crm_meetings: { count: 0, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      });

      const label = screen.getByText("Today Attendance");
      const card = label.closest("div.rounded-2xl");
      expect(card).not.toBeNull();
      expect(card).toHaveTextContent("0");
      expect(card).toHaveTextContent("Clocked In Today");
    });

    it("renders '15 Clocked In Today' when crm_attendance returns positive count 15", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 20, error: null },
        crm_attendance: { count: 15, error: null },
        crm_tasks: { count: 4, error: null },
        crm_broadcasts: { count: 1, error: null },
        crm_meetings: { count: 2, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      });

      const label = screen.getByText("Today Attendance");
      const card = label.closest("div.rounded-2xl");
      expect(card).not.toBeNull();
      expect(card).toHaveTextContent("15");
      expect(card).toHaveTextContent("Clocked In Today");
    });

    it("falls back to 0 without crashing or unhandled rejections when query returns PostgREST error or network failure", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 5, error: null },
        crm_attendance: {
          count: null,
          error: { message: "connection timeout / network failure" },
        },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      });

      const label = screen.getByText("Today Attendance");
      const card = label.closest("div.rounded-2xl");
      expect(card).not.toBeNull();
      expect(card).toHaveTextContent("0");
      expect(card).toHaveTextContent("Clocked In Today");
    });

    it("falls back to 0 without crashing when crm_attendance throws a hard rejection", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 5, error: null },
        crm_attendance: { shouldThrow: true },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      });

      const label = screen.getByText("Today Attendance");
      const card = label.closest("div.rounded-2xl");
      expect(card).not.toBeNull();
      expect(card).toHaveTextContent("0");
      expect(card).toHaveTextContent("Clocked In Today");
    });

    it("dynamically updates from 0 to 15 Clocked In Today upon refresh", async () => {
      queryMockState.responses = {
        organization_memberships: { count: 20, error: null },
        crm_attendance: { count: 0, error: null },
      };

      render(
        <MemoryRouter>
          <CRMDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Today Attendance")).toBeInTheDocument();
      });

      const label = screen.getByText("Today Attendance");
      const card = label.closest("div.rounded-2xl");
      expect(card).toHaveTextContent("0");

      // Now mock clock-ins occurring during the day
      queryMockState.responses.crm_attendance = { count: 15, error: null };

      const refreshBtn = screen.getByTitle("Refresh CRM metrics");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(card).toHaveTextContent("15");
      });
      expect(card).toHaveTextContent("Clocked In Today");
    });
  });
});

