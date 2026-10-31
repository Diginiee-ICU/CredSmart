import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "@/pages/Landing";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const mockUseOrganization = vi.fn();
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockUseOrganization(),
}));

describe("Milestone 2 Landing Page Dual-Suite & Viewport Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseOrganization.mockReturnValue({
      userRole: "store_owner",
      loading: false,
    });
  });

  // ── SCENARIO 1: DOM Anchor #suites exists and contains billing-erp and workforce-crm ──
  it("M2.1: verifies DOM section #suites exists with scroll-mt-14 and contains child suite anchors", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const suitesSection = container.querySelector("#suites");
    expect(suitesSection).toBeInTheDocument();
    expect(suitesSection?.className).toContain("scroll-mt-14");

    const billingErp = container.querySelector("#billing-erp");
    const workforceCrm = container.querySelector("#workforce-crm");

    expect(billingErp).toBeInTheDocument();
    expect(workforceCrm).toBeInTheDocument();

    expect(screen.getByText(/Enterprise Dual-Suite Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Two Dedicated Suites/i)).toBeInTheDocument();
  });

  // ── SCENARIO 2: Dual Suite Launch Actions ──
  it("M2.2: verifies suite launch buttons set sessionStorage and navigate to correct routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const launchPosBtn = screen.getByRole("button", { name: /Launch POS Billing ERP/i });
    fireEvent.click(launchPosBtn);
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
    expect(mockNavigate).toHaveBeenCalledWith("/billing/dashboard");

    const launchCrmBtn = screen.getByRole("button", { name: /Launch Workforce CRM/i });
    fireEvent.click(launchCrmBtn);
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
    expect(mockNavigate).toHaveBeenCalledWith("/crm");
  });

  // ── SCENARIO 3: Bounded Module Explorer Viewport & Dual-Suite Switcher ──
  it("M2.3: verifies Bounded Module Explorer operates within max-h-[520px] and switches between POS and CRM", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    // Verify bounded height container
    const boundedContainer = container.querySelector(".max-h-\\[520px\\]");
    expect(boundedContainer).toBeInTheDocument();

    // Default suite is POS (6 modules)
    expect(screen.getByText(/6 POS & ERP Modules/i)).toBeInTheDocument();

    // Switch to Workforce CRM suite
    const crmSuiteBtn = screen.getByRole("button", { name: /Workforce CRM \(6\)/i });
    fireEvent.click(crmSuiteBtn);

    expect(screen.getByText(/6 Workforce CRM Modules/i)).toBeInTheDocument();
    expect(screen.getAllByText(/GPS Attendance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monthly Payroll/i).length).toBeGreaterThan(0);

    // Click a CRM module
    const payrollItem = screen.getByRole("button", { name: /Monthly Payroll/i });
    fireEvent.click(payrollItem);
    expect(screen.getByText(/Automated Monthly Payroll & Salary Slips Engine/i)).toBeInTheDocument();
  });

  // ── SCENARIO 4: HeroDashboardCard Dual-Suite Preview Toggle ──
  it("M2.4: verifies HeroDashboardCard toggles between Retail POS and Workforce CRM previews", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <HeroDashboardCard />
      </MemoryRouter>
    );

    // Initial state is POS
    expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/TO PAY/i)).toBeInTheDocument();
    expect(screen.getByText(/CASH & BANK/i)).toBeInTheDocument();
    expect(screen.getByText(/POS Terminal Bill Cart/i)).toBeInTheDocument();

    // Toggle to CRM
    const crmToggle = screen.getByRole("button", { name: /Workforce CRM/i });
    fireEvent.click(crmToggle);

    expect(screen.getByText(/Real-Time Staff Attendance & GPS Geofence/i)).toBeInTheDocument();
    expect(screen.getByText(/Rajesh Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/Field Task Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/Lead Stage Kanban/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff On Duty/i)).toBeInTheDocument();

    // Toggle back to POS
    const posToggle = screen.getByRole("button", { name: /Retail POS & Billing/i });
    fireEvent.click(posToggle);

    expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/POS Terminal Bill Cart/i)).toBeInTheDocument();
  });

  // ── SCENARIO 5: Button Token Compliance (No Bloated Bubble Buttons) ──
  it("M2.5: audits every button on Landing to guarantee 100% compliance with minimal design tokens", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThan(10);

    // Filter out mobile navigation toggle (which requires 44x44px minimum touch target)
    const actionButtons = allButtons.filter((btn) => btn.getAttribute("aria-label") !== "Toggle navigation menu");

    actionButtons.forEach((btn) => {
      // Must not contain oversized bubble button classes
      expect(btn.className).not.toContain("rounded-3xl");
      expect(btn.className).not.toContain("h-11");
      expect(btn.className).not.toContain("h-12");
      expect(btn.className).not.toContain("h-13");
    });

    // Check specific Hero Primary CTA dimensions
    const heroStartFreeBtn = screen.getByRole("button", { name: /Start Free Now 🚀/i });
    expect(heroStartFreeBtn.className).toContain("h-9.5");
    expect(heroStartFreeBtn.className).toContain("px-4.5");
    expect(heroStartFreeBtn.className).toContain("rounded-lg");
  });
});
