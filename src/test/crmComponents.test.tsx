/**
 * CRM Design System Component Verification & Adversarial Stress Suite
 * Tests all 7 CredSmart CRM components:
 * 1. CRMPermissionGate (conditional rendering, fallback, toast dispatch, super_admin bypass)
 * 2. CRMBadge (all 6 semantic variants, pulsing dot indicator, sizes, ref forwarding)
 * 3. CRMStatCard (metrics, icon pods, accents, loading state, trend direction indicators)
 * 4. CRMRolePill (custom hex color alpha math, super_admin crown, sizes, icon overrides)
 * 5. CRMDataTable (sorting string & number, search filter, searchKey, pagination, loading & empty states, row clicks)
 * 6. CRMPageHeader (breadcrumb hierarchy, router links, active step, badge slot, actions slot)
 * 7. CRMCard (variants: default, elevated, brand, outline, glass, conditional header & footer slots, brand tokens)
 */

import React, { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  Users,
  Shield,
  Briefcase,
  AlertTriangle,
  Activity,
} from "lucide-react";

// Components under test from CRM Design System
import {
  CRMCard,
  CRMBadge,
  CRMStatCard,
  CRMRolePill,
  CRMDataTable,
  CRMPageHeader,
  CRMPermissionGate,
  CRM_BRAND_COLORS,
  type CRMColumnDef,
} from "@/components/crm";

// ─── MOCKS ────────────────────────────────────────────────────────────────────

// Mock @/hooks/useCRMPermission
const mockUseCRMPermission = vi.fn();
vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: (module?: string, action?: string) => mockUseCRMPermission(module, action),
  usePermission: (module?: string, action?: string) => mockUseCRMPermission(module, action),
}));

// Mock @/hooks/use-toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// ─── DEFAULT PERMISSION MOCK STATE ────────────────────────────────────────────

const createMockPermissionState = (overrides = {}) => ({
  hasPermission: vi.fn((_mod: string, _act: string) => true),
  isSuperAdmin: false,
  userRoles: [],
  permissions: [],
  loading: false,
  error: null,
  refreshPermissions: vi.fn(),
  refetch: vi.fn(),
  allowed: true,
  ...overrides,
});

describe("CRM Design System Component Suite (Milestone 5 Verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCRMPermission.mockReturnValue(createMockPermissionState());
  });

  afterEach(() => {
    cleanup();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: CRMPermissionGate
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMPermissionGate", () => {
    it("renders children when user has permission and does not fire toast", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn((m, a) => m === "salary" && a === "view"),
          allowed: true,
        })
      );

      render(
        <CRMPermissionGate module="salary" action="view">
          <div data-testid="allowed-content">Confidential Salary Info</div>
        </CRMPermissionGate>
      );

      expect(screen.getByTestId("allowed-content")).toBeInTheDocument();
      expect(screen.getByText("Confidential Salary Info")).toBeInTheDocument();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("renders fallback when permission is denied and fires Not Authorized toast", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      render(
        <CRMPermissionGate
          module="salary"
          action="edit"
          fallback={<div data-testid="fallback-banner">Access Restricted</div>}
        >
          <div data-testid="denied-content">Should Not Render</div>
        </CRMPermissionGate>
      );

      expect(screen.queryByTestId("denied-content")).not.toBeInTheDocument();
      expect(screen.getByTestId("fallback-banner")).toBeInTheDocument();
      expect(screen.getByText("Access Restricted")).toBeInTheDocument();

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not Authorized",
          description: "You do not have permission to edit in salary.",
          variant: "destructive",
        })
      );
    });

    it("renders null and fires toast when permission is denied and no fallback is passed", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      const { container } = render(
        <CRMPermissionGate module="attendance" action="manage">
          <div>Hidden Content</div>
        </CRMPermissionGate>
      );

      expect(container.firstChild).toBeNull();
      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not Authorized",
          description: "You do not have permission to manage in attendance.",
        })
      );
    });

    it("uses custom toastMessage when provided on permission denial", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      render(
        <CRMPermissionGate
          module="roles"
          action="create"
          toastMessage="Only administrators can provision new custom roles."
        >
          <div>Role Creator Form</div>
        </CRMPermissionGate>
      );

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Not Authorized",
          description: "Only administrators can provision new custom roles.",
        })
      );
    });

    it("suppresses toast when suppressToast={true}", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      render(
        <CRMPermissionGate
          module="ai_assistant"
          action="access"
          suppressToast={true}
          fallback={<div>AI Locked</div>}
        >
          <div>AI Workspace</div>
        </CRMPermissionGate>
      );

      expect(screen.getByText("AI Locked")).toBeInTheDocument();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("suppresses toast when showToast={false}", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      render(
        <CRMPermissionGate
          module="broadcasts"
          action="send"
          showToast={false}
          fallback={<div>Broadcasts Disabled</div>}
        >
          <div>Send Broadcast</div>
        </CRMPermissionGate>
      );

      expect(screen.getByText("Broadcasts Disabled")).toBeInTheDocument();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("does not render children or fallback while loading", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          loading: true,
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      const { container } = render(
        <CRMPermissionGate
          module="tasks"
          action="view"
          fallback={<div>Fallback View</div>}
        >
          <div>Children View</div>
        </CRMPermissionGate>
      );

      expect(container.firstChild).toBeNull();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("bypasses permission check when user is super_admin", () => {
      // hasPermission returns false, but isSuperAdmin is true
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          isSuperAdmin: true,
          hasPermission: vi.fn(() => false),
          allowed: true,
        })
      );

      render(
        <CRMPermissionGate module="super_secret_module" action="manage">
          <div data-testid="super-admin-view">Super Admin Granted Full Access</div>
        </CRMPermissionGate>
      );

      expect(screen.getByTestId("super-admin-view")).toBeInTheDocument();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it("does not fire duplicate toast on subsequent re-renders with same denied state", () => {
      mockUseCRMPermission.mockReturnValue(
        createMockPermissionState({
          hasPermission: vi.fn(() => false),
          allowed: false,
        })
      );

      const { rerender } = render(
        <CRMPermissionGate module="meetings" action="create">
          <div>Meeting Form</div>
        </CRMPermissionGate>
      );

      expect(mockToast).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <CRMPermissionGate module="meetings" action="create">
          <div>Meeting Form</div>
        </CRMPermissionGate>
      );

      // Toast should still have fired only once due to toastFiredRef guard
      expect(mockToast).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: CRMBadge
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMBadge", () => {
    it("renders with default neutral variant and medium size", () => {
      render(<CRMBadge>Standard Badge</CRMBadge>);

      const badge = screen.getByText("Standard Badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-slate-100");
      expect(badge).toHaveClass("text-[#0F172A]");
      expect(badge).toHaveClass("text-xs");
    });

    it("renders all 6 semantic variants with correct brand tokens", () => {
      const { rerender } = render(<CRMBadge variant="success">Active</CRMBadge>);
      expect(screen.getByText("Active")).toHaveClass("bg-emerald-50 text-emerald-700");

      rerender(<CRMBadge variant="warning">Pending</CRMBadge>);
      expect(screen.getByText("Pending")).toHaveClass("bg-amber-50 text-amber-700");

      rerender(<CRMBadge variant="error">Suspended</CRMBadge>);
      expect(screen.getByText("Suspended")).toHaveClass("bg-rose-50 text-rose-700");

      rerender(<CRMBadge variant="info">Verified</CRMBadge>);
      expect(screen.getByText("Verified")).toHaveClass("bg-blue-50 text-[#1D4ED8]");

      rerender(<CRMBadge variant="neutral">Draft</CRMBadge>);
      expect(screen.getByText("Draft")).toHaveClass("bg-slate-100 text-[#0F172A]");

      rerender(<CRMBadge variant="orange">CredSmart Primary</CRMBadge>);
      expect(screen.getByText("CredSmart Primary")).toHaveClass("bg-orange-50 text-[#FF6A00]");
    });

    it("renders size variants correctly (sm, md, lg)", () => {
      const { rerender } = render(<CRMBadge size="sm">Small</CRMBadge>);
      expect(screen.getByText("Small")).toHaveClass("text-[11px]");

      rerender(<CRMBadge size="md">Medium</CRMBadge>);
      expect(screen.getByText("Medium")).toHaveClass("text-xs");

      rerender(<CRMBadge size="lg">Large</CRMBadge>);
      expect(screen.getByText("Large")).toHaveClass("text-sm");
    });

    it("renders an animated pulsing dot when dot={true}", () => {
      const { container } = render(
        <CRMBadge variant="success" dot={true}>
          Live Status
        </CRMBadge>
      );

      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass("w-1.5 h-1.5 rounded-full");
      expect(dot).toHaveClass("bg-[#10B981]");
    });

    it("does not render dot when dot is false or omitted", () => {
      const { container } = render(<CRMBadge variant="info">No Dot</CRMBadge>);
      const dot = container.querySelector(".animate-pulse");
      expect(dot).toBeNull();
    });

    it("supports forwardRef to underlying span element", () => {
      const ref = createRef<HTMLSpanElement>();
      render(<CRMBadge ref={ref}>Ref Badge</CRMBadge>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current?.textContent).toBe("Ref Badge");
    });

    it("merges custom className without overriding core pill geometry", () => {
      render(
        <CRMBadge className="custom-shadow uppercase font-mono">
          Custom Classes
        </CRMBadge>
      );
      const badge = screen.getByText("Custom Classes");
      expect(badge).toHaveClass("custom-shadow");
      expect(badge).toHaveClass("uppercase");
      expect(badge).toHaveClass("font-mono");
      expect(badge).toHaveClass("rounded-full");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: CRMStatCard
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMStatCard", () => {
    it("renders label, numeric metric with font-mono tabular-nums, and icon", () => {
      render(
        <CRMStatCard
          label="Total Active Staff"
          value="48"
          icon={Users}
          accent="blue"
        />
      );

      expect(screen.getByText("Total Active Staff")).toBeInTheDocument();
      const valEl = screen.getByText("48");
      expect(valEl).toBeInTheDocument();
      expect(valEl).toHaveClass("font-mono");
      expect(valEl).toHaveClass("tabular-nums");
      expect(valEl).toHaveClass("font-extrabold");
    });

    it("renders all accent variants with corresponding tinted icon pod styles", () => {
      const accents = [
        { accent: "blue", bgClass: "bg-blue-500/10", textClass: "text-[#1D4ED8]" },
        { accent: "navy", bgClass: "bg-slate-900/10", textClass: "text-[#0F172A]" },
        { accent: "orange", bgClass: "bg-orange-500/10", textClass: "text-[#FF6A00]" },
        { accent: "emerald", bgClass: "bg-emerald-500/10", textClass: "text-[#10B981]" },
        { accent: "gold", bgClass: "bg-amber-500/10", textClass: "text-[#F59E0B]" },
      ] as const;

      for (const item of accents) {
        const { container } = render(
          <CRMStatCard
            label={`${item.accent} test`}
            value={100}
            icon={Activity}
            accent={item.accent}
          />
        );

        const iconContainer = container.querySelector(`.${item.bgClass.replace("/", "\\/")}`);
        expect(iconContainer).toBeInTheDocument();
        cleanup();
      }
    });

    it("renders up trend indicator with emerald styling and delta value", () => {
      render(
        <CRMStatCard
          label="Attendance Today"
          value={34}
          icon={Users}
          trend={{
            value: "+12%",
            direction: "up",
            label: "vs yesterday",
          }}
        />
      );

      expect(screen.getByText("+12%")).toBeInTheDocument();
      expect(screen.getByText("vs yesterday")).toBeInTheDocument();
      const trendPill = screen.getByText("+12%").parentElement;
      expect(trendPill).toHaveClass("text-[#10B981]");
      expect(trendPill).toHaveClass("bg-emerald-50");
    });

    it("renders down trend indicator with rose styling", () => {
      render(
        <CRMStatCard
          label="Pending Tasks"
          value={8}
          icon={AlertTriangle}
          trend={{
            value: "-4%",
            direction: "down",
            label: "improvement",
          }}
        />
      );

      expect(screen.getByText("-4%")).toBeInTheDocument();
      const trendPill = screen.getByText("-4%").parentElement;
      expect(trendPill).toHaveClass("text-rose-700");
      expect(trendPill).toHaveClass("bg-rose-50");
    });

    it("renders neutral trend indicator with slate styling", () => {
      render(
        <CRMStatCard
          label="Salary Outflow"
          value="₹4.2L"
          icon={Briefcase}
          trend={{
            value: "0%",
            direction: "neutral",
            label: "steady",
          }}
        />
      );

      expect(screen.getByText("0%")).toBeInTheDocument();
      const trendPill = screen.getByText("0%").parentElement;
      expect(trendPill).toHaveClass("text-slate-600");
      expect(trendPill).toHaveClass("bg-slate-100");
    });

    it("renders animated pulse placeholder when loading={true}", () => {
      render(
        <CRMStatCard
          label="Unread Broadcasts"
          value={99}
          icon={Activity}
          loading={true}
        />
      );

      expect(screen.queryByText("99")).not.toBeInTheDocument();
      const pulseEl = screen.getByText("...");
      expect(pulseEl).toBeInTheDocument();
      expect(pulseEl).toHaveClass("animate-pulse");
    });

    it("renders description footnote when supplied", () => {
      render(
        <CRMStatCard
          label="Broadcast Reach"
          value="98%"
          icon={Activity}
          description="Across 4 store locations"
        />
      );

      expect(screen.getByText("Across 4 store locations")).toBeInTheDocument();
    });

    it("attaches onClick handler and cursor pointer styling", () => {
      const handleClick = vi.fn();
      render(
        <CRMStatCard
          label="Clickable Card"
          value={12}
          icon={Activity}
          onClick={handleClick}
        />
      );

      const card = screen.getByText("Clickable Card").closest("div");
      expect(card?.parentElement).toHaveClass("cursor-pointer");
      fireEvent.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: CRMRolePill
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMRolePill", () => {
    it("renders custom hex color with computed 15% opacity bg and 35% opacity border", () => {
      render(<CRMRolePill name="Store Manager" color="#1D4ED8" />);

      const pill = screen.getByText("Store Manager").parentElement!;
      expect(pill).toBeInTheDocument();
      // #1D4ED8 + "1A" = #1D4ED81A (15% background)
      // #1D4ED8 + "4D" = #1D4ED84D (35% border)
      expect(pill).toHaveStyle({
        color: "#1D4ED8",
      });
      expect(pill.style.backgroundColor).toBe("rgba(29, 78, 216, 0.102)");
      expect(pill.style.borderColor).toBe("#1d4ed84d");
    });

    it("computes correct alpha tints for arbitrary custom colors (e.g. orange #FF6A00)", () => {
      render(<CRMRolePill name="Cashier Lead" color="#FF6A00" />);

      const pill = screen.getByText("Cashier Lead").parentElement!;
      expect(pill).toHaveStyle({
        color: "#FF6A00",
      });
      expect(pill.style.backgroundColor).toBe("rgba(255, 106, 0, 0.102)");
      expect(pill.style.borderColor).toBe("#ff6a004d");
    });

    it("renders gold super_admin Crown icon and suppresses standard role icon when isSuperAdmin={true}", () => {
      const { container } = render(
        <CRMRolePill name="Super Admin" isSuperAdmin={true} color="#FF6A00" />
      );

      // Super-admin crown svg has text-amber-500 fill-amber-400
      const crownSvg = container.querySelector(".text-amber-500.fill-amber-400");
      expect(crownSvg).toBeInTheDocument();
    });

    it("renders default Shield icon when isSuperAdmin={false}", () => {
      const { container } = render(
        <CRMRolePill name="Standard Staff" isSuperAdmin={false} />
      );

      const crownSvg = container.querySelector(".text-amber-500.fill-amber-400");
      expect(crownSvg).toBeNull();
      // Shield SVG exists
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("allows passing a custom icon component for non-super-admin roles", () => {
      const { container } = render(
        <CRMRolePill name="Lead Engineer" icon={Briefcase} color="#10B981" />
      );

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(screen.getByText("Lead Engineer")).toBeInTheDocument();
    });

    it("supports pill sizes (sm, md, lg)", () => {
      const { rerender } = render(<CRMRolePill name="Role" size="sm" />);
      expect(screen.getByText("Role").parentElement).toHaveClass("text-[11px]");

      rerender(<CRMRolePill name="Role" size="md" />);
      expect(screen.getByText("Role").parentElement).toHaveClass("text-xs");

      rerender(<CRMRolePill name="Role" size="lg" />);
      expect(screen.getByText("Role").parentElement).toHaveClass("text-sm");
    });

    it("handles non-hex or malformed colors gracefully without throwing", () => {
      expect(() => {
        render(<CRMRolePill name="Fallback Role" color="rgb(255, 0, 0)" />);
      }).not.toThrow();

      expect(screen.getByText("Fallback Role")).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: CRMDataTable
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMDataTable", () => {
    interface SampleRecord extends Record<string, unknown> {
      id: string;
      name: string;
      role: string;
      department: string;
      tasksCompleted: number;
    }

    const testStaff: SampleRecord[] = [
      { id: "1", name: "Alice Sharma", role: "Store Manager", department: "Retail", tasksCompleted: 45 },
      { id: "2", name: "Bob Verma", role: "Sales Associate", department: "Sales", tasksCompleted: 12 },
      { id: "3", name: "Charlie Gupta", role: "Inventory Specialist", department: "Warehouse", tasksCompleted: 88 },
      { id: "4", name: "Deepa Rao", role: "Accountant", department: "Finance", tasksCompleted: 30 },
      { id: "5", name: "Eshan Khan", role: "Cashier", department: "Retail", tasksCompleted: 5 },
    ];

    const columns: CRMColumnDef<SampleRecord>[] = [
      { key: "name", header: "Staff Name", sortable: true },
      { key: "role", header: "Designation", sortable: false },
      { key: "department", header: "Department", sortable: true },
      {
        key: "tasksCompleted",
        header: "Completed Tasks",
        sortable: true,
        accessor: (row) => <span data-testid={`tasks-${row.id}`}>{row.tasksCompleted} tasks</span>,
      },
    ];

    it("renders table headers, column labels, and data rows with custom accessors", () => {
      render(<CRMDataTable data={testStaff} columns={columns} />);

      expect(screen.getByText("Staff Name")).toBeInTheDocument();
      expect(screen.getByText("Designation")).toBeInTheDocument();
      expect(screen.getByText("Department")).toBeInTheDocument();
      expect(screen.getByText("Completed Tasks")).toBeInTheDocument();

      expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
      expect(screen.getByTestId("tasks-1")).toHaveTextContent("45 tasks");
      expect(screen.getByText("Bob Verma")).toBeInTheDocument();
    });

    it("performs string sorting ascending and descending on sortable headers", () => {
      render(<CRMDataTable data={testStaff} columns={columns} />);

      const nameHeader = screen.getByText("Staff Name");

      // 1. Initial order: Alice, Bob, Charlie, Deepa, Eshan
      let rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Alice Sharma")).toBeInTheDocument();

      // 2. Click once -> Ascending sort (A-Z)
      fireEvent.click(nameHeader);
      rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Alice Sharma")).toBeInTheDocument();

      // 3. Click second time -> Descending sort (Z-A)
      fireEvent.click(nameHeader);
      rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Eshan Khan")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Deepa Rao")).toBeInTheDocument();

      // 4. Click third time -> Sort reset
      fireEvent.click(nameHeader);
      rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Alice Sharma")).toBeInTheDocument();
    });

    it("performs numeric sorting correctly on numeric column", () => {
      render(<CRMDataTable data={testStaff} columns={columns} />);

      const tasksHeader = screen.getByText("Completed Tasks");

      // Click once -> Numeric Ascending (5 -> 12 -> 30 -> 45 -> 88)
      fireEvent.click(tasksHeader);
      let rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Eshan Khan")).toBeInTheDocument(); // tasks: 5

      // Click second time -> Numeric Descending (88 -> 45 -> 30 -> 12 -> 5)
      fireEvent.click(tasksHeader);
      rows = screen.getAllByRole("row");
      expect(within(rows[1]).getByText("Charlie Gupta")).toBeInTheDocument(); // tasks: 88
    });

    it("does not trigger sort when clicking a non-sortable column header", () => {
      render(<CRMDataTable data={testStaff} columns={columns} />);

      const roleHeader = screen.getByText("Designation");
      fireEvent.click(roleHeader);

      const rows = screen.getAllByRole("row");
      // First data row should still be Alice Sharma
      expect(within(rows[1]).getByText("Alice Sharma")).toBeInTheDocument();
    });

    it("filters records dynamically via search input", () => {
      render(<CRMDataTable data={testStaff} columns={columns} />);

      const searchInput = screen.getByPlaceholderText("Search records...");
      fireEvent.change(searchInput, { target: { value: "Finance" } });

      expect(screen.getByText("Deepa Rao")).toBeInTheDocument();
      expect(screen.queryByText("Alice Sharma")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Verma")).not.toBeInTheDocument();
    });

    it("supports searchKey prop to restrict search filtering to a specific property", () => {
      render(
        <CRMDataTable
          data={testStaff}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Search staff by name..."
        />
      );

      const searchInput = screen.getByPlaceholderText("Search staff by name...");
      // "Finance" is in department, but NOT in name. With searchKey="name", it should find 0 results.
      fireEvent.change(searchInput, { target: { value: "Finance" } });

      expect(screen.getByText("No records found.")).toBeInTheDocument();

      // "Charlie" is in name
      fireEvent.change(searchInput, { target: { value: "Charlie" } });
      expect(screen.getByText("Charlie Gupta")).toBeInTheDocument();
    });

    it("supports custom searchFilter predicate", () => {
      render(
        <CRMDataTable
          data={testStaff}
          columns={columns}
          searchFilter={(item, q) => item.tasksCompleted >= Number(q)}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search records...");
      fireEvent.change(searchInput, { target: { value: "40" } });

      // Alice (45) and Charlie (88) have >= 40 tasks
      expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
      expect(screen.getByText("Charlie Gupta")).toBeInTheDocument();
      expect(screen.queryByText("Bob Verma")).not.toBeInTheDocument(); // 12
    });

    it("renders emptyMessage when search yields zero matches or dataset is empty", () => {
      const { rerender } = render(
        <CRMDataTable
          data={testStaff}
          columns={columns}
          emptyMessage="No employees found for this query."
        />
      );

      const searchInput = screen.getByPlaceholderText("Search records...");
      fireEvent.change(searchInput, { target: { value: "NonExistentString123" } });
      expect(screen.getByText("No employees found for this query.")).toBeInTheDocument();

      // Empty dataset
      rerender(
        <CRMDataTable
          data={[]}
          columns={columns}
          emptyMessage="No records in database."
        />
      );
      expect(screen.getByText("No records in database.")).toBeInTheDocument();
    });

    it("renders loading spinner and status text when isLoading={true}", () => {
      render(<CRMDataTable data={testStaff} columns={columns} isLoading={true} />);

      expect(screen.getByText("Loading CRM records...")).toBeInTheDocument();
      expect(screen.queryByText("Alice Sharma")).not.toBeInTheDocument();
    });

    it("handles pagination across pages when pageSize is smaller than dataset", () => {
      render(<CRMDataTable data={testStaff} columns={columns} pageSize={2} />);

      // Page 1: should show 2 items (Alice and Bob)
      expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
      expect(screen.getByText("Bob Verma")).toBeInTheDocument();
      expect(screen.queryByText("Charlie Gupta")).not.toBeInTheDocument();

      // Click page 2 button
      const page2Button = screen.getByRole("button", { name: "2" });
      fireEvent.click(page2Button);

      // Page 2: should show Charlie and Deepa
      expect(screen.getByText("Charlie Gupta")).toBeInTheDocument();
      expect(screen.getByText("Deepa Rao")).toBeInTheDocument();
      expect(screen.queryByText("Alice Sharma")).not.toBeInTheDocument();
    });

    it("invokes onRowClick callback with record data when a row is clicked", () => {
      const handleRowClick = vi.fn();
      render(
        <CRMDataTable
          data={testStaff}
          columns={columns}
          onRowClick={handleRowClick}
        />
      );

      const aliceRow = screen.getByText("Alice Sharma").closest("tr");
      expect(aliceRow).toBeInTheDocument();
      fireEvent.click(aliceRow!);

      expect(handleRowClick).toHaveBeenCalledTimes(1);
      expect(handleRowClick).toHaveBeenCalledWith(testStaff[0]);
    });

    it("hides search input bar when searchPlaceholder is empty string", () => {
      render(
        <CRMDataTable
          data={testStaff}
          columns={columns}
          searchPlaceholder=""
        />
      );

      expect(screen.queryByPlaceholderText("Search records...")).toBeNull();
      expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 6: CRMPageHeader
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMPageHeader", () => {
    it("renders page title and subtitle", () => {
      render(
        <MemoryRouter>
          <CRMPageHeader
            title="Role Management"
            subtitle="Configure granular CRM access control for staff members"
          />
        </MemoryRouter>
      );

      expect(screen.getByText("Role Management")).toBeInTheDocument();
      expect(
        screen.getByText("Configure granular CRM access control for staff members")
      ).toBeInTheDocument();
    });

    it("renders breadcrumb navigation hierarchy with links for parent items and active span for last item", () => {
      render(
        <MemoryRouter>
          <CRMPageHeader
            title="Edit Role"
            breadcrumbs={[
              { label: "CRM", href: "/crm" },
              { label: "Roles", href: "/crm/roles" },
              { label: "Custom Role Details" },
            ]}
          />
        </MemoryRouter>
      );

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();

      const crmLink = screen.getByRole("link", { name: "CRM" });
      expect(crmLink).toHaveAttribute("href", "/crm");

      const rolesLink = screen.getByRole("link", { name: "Roles" });
      expect(rolesLink).toHaveAttribute("href", "/crm/roles");

      // Last item should be a span, not a link
      const lastItem = screen.getByText("Custom Role Details");
      expect(lastItem.tagName.toLowerCase()).toBe("span");
      expect(lastItem).toHaveClass("font-semibold");
    });

    it("does not render breadcrumb navigation when breadcrumbs prop is empty or omitted", () => {
      render(
        <MemoryRouter>
          <CRMPageHeader title="Standalone Page" />
        </MemoryRouter>
      );

      expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
    });

    it("renders badge inline next to title", () => {
      render(
        <MemoryRouter>
          <CRMPageHeader
            title="CRM Attendance"
            badge={<CRMBadge variant="orange">Beta</CRMBadge>}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("CRM Attendance")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });

    it("renders action buttons in header action slot", () => {
      const handleAction = vi.fn();
      render(
        <MemoryRouter>
          <CRMPageHeader
            title="Broadcasts"
            actions={
              <button data-testid="new-broadcast-btn" onClick={handleAction}>
                New Broadcast
              </button>
            }
          />
        </MemoryRouter>
      );

      const btn = screen.getByTestId("new-broadcast-btn");
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 7: CRMCard
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRMCard", () => {
    it("renders all card visual variants with expected CSS classes", () => {
      const { rerender } = render(<CRMCard variant="default">Content</CRMCard>);
      expect(screen.getByText("Content").parentElement).toHaveClass("border-slate-200/80");

      rerender(<CRMCard variant="elevated">Content</CRMCard>);
      expect(screen.getByText("Content").parentElement).toHaveClass("shadow-soft");

      rerender(<CRMCard variant="brand">Content</CRMCard>);
      expect(screen.getByText("Content").parentElement).toHaveClass("border-l-4 border-l-[#FF6A00]");

      rerender(<CRMCard variant="outline">Content</CRMCard>);
      expect(screen.getByText("Content").parentElement).toHaveClass("border-dashed");

      rerender(<CRMCard variant="glass">Content</CRMCard>);
      expect(screen.getByText("Content").parentElement).toHaveClass("backdrop-blur-md");
    });

    it("renders header only when title, description, or headerAction is supplied", () => {
      // 1. Without header props
      const { container, rerender } = render(<CRMCard>Just Body Content</CRMCard>);
      expect(container.querySelector("h3")).toBeNull();

      // 2. With title and description
      rerender(
        <CRMCard
          title="Security Preferences"
          description="Manage role-based permission toggles"
          headerAction={<button>Save</button>}
        >
          Form Body
        </CRMCard>
      );

      expect(screen.getByText("Security Preferences")).toBeInTheDocument();
      expect(screen.getByText("Manage role-based permission toggles")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("renders footer in dedicated bottom bar when supplied", () => {
      const { container, rerender } = render(<CRMCard>No Footer</CRMCard>);
      expect(container.querySelector(".bg-slate-50\\/60")).toBeNull();

      rerender(
        <CRMCard footer={<span>Last synchronized 5m ago</span>}>
          Card Body
        </CRMCard>
      );

      expect(screen.getByText("Last synchronized 5m ago")).toBeInTheDocument();
    });

    it("applies contentClassName to inner body container", () => {
      render(
        <CRMCard contentClassName="custom-grid-class p-10">
          Grid Children
        </CRMCard>
      );

      const contentDiv = screen.getByText("Grid Children");
      expect(contentDiv).toHaveClass("custom-grid-class");
      expect(contentDiv).toHaveClass("p-10");
    });

    it("supports forwardRef to outer card div", () => {
      const cardRef = createRef<HTMLDivElement>();
      render(<CRMCard ref={cardRef}>Referenced Card</CRMCard>);

      expect(cardRef.current).toBeInstanceOf(HTMLDivElement);
      expect(cardRef.current?.textContent).toContain("Referenced Card");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 8: CRM Brand Token Invariants & Index Exports
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRM Brand Tokens & Component Exports", () => {
    it("defines authoritative CredSmart brand color hex constants", () => {
      expect(CRM_BRAND_COLORS.navy).toBe("#0F172A");
      expect(CRM_BRAND_COLORS.orange).toBe("#FF6A00");
      expect(CRM_BRAND_COLORS.blue).toBe("#1D4ED8");
      expect(CRM_BRAND_COLORS.emerald).toBe("#10B981");
      expect(CRM_BRAND_COLORS.gold).toBe("#F59E0B");
      expect(CRM_BRAND_COLORS.slateBg).toBe("#F8FAFC");
    });

    it("re-exports all 7 CRM components from @/components/crm index.ts", () => {
      expect(CRMCard).toBeDefined();
      expect(CRMBadge).toBeDefined();
      expect(CRMDataTable).toBeDefined();
      expect(CRMPageHeader).toBeDefined();
      expect(CRMStatCard).toBeDefined();
      expect(CRMPermissionGate).toBeDefined();
      expect(CRMRolePill).toBeDefined();
    });
  });
});
