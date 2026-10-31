/**
 * @file landingMilestone2Adversarial.test.tsx
 * @description Adversarial empirical test harness for Milestone 2 Landing Page Redesign.
 * Stress-tests <section id="suites">, Bounded Module Explorer across all 12 modules,
 * PublicHeader smooth scroll integration, deep links, and button token compliance.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "@/pages/Landing";
import { PublicHeader } from "@/components/public/PublicHeader";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";

// Mock router navigation
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

describe("Adversarial Empirical Challenge Suite: Milestone 2 Landing Page", { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseOrganization.mockReturnValue({
      userRole: "store_owner",
      loading: false,
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CHALLENGE 1: SECTION #suites ANCHOR & PUBLIC HEADER COMPATIBILITY
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Section #suites Anchor, Child Anchors & Smooth Scroll Contract", () => {
    it("ADV-1.1: verifies #suites presence, scroll-mt-14, and exact child anchors #billing-erp and #workforce-crm", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const suitesSection = container.querySelector("#suites");
      expect(suitesSection).not.toBeNull();
      expect(suitesSection?.tagName.toLowerCase()).toBe("section");
      expect(suitesSection?.className).toContain("scroll-mt-14");
      expect(suitesSection?.className).toContain("border-b");

      // Verify child suite anchors exist inside #suites
      const billingErp = suitesSection?.querySelector("#billing-erp");
      const workforceCrm = suitesSection?.querySelector("#workforce-crm");

      expect(billingErp).not.toBeNull();
      expect(workforceCrm).not.toBeNull();

      // Verify headings and value propositions
      expect(within(suitesSection as HTMLElement).getByText(/Two Dedicated Suites/i)).toBeInTheDocument();
      expect(within(suitesSection as HTMLElement).getByText(/One Unified Platform/i)).toBeInTheDocument();
    });

    it("ADV-1.2: verifies 'Explore Dual Suites' CTA triggers smooth scroll into #suites", () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const exploreBtn = screen.getByText(/Explore Dual Suites/i).closest("a");
      expect(exploreBtn).not.toBeNull();
      expect(exploreBtn?.getAttribute("href")).toBe("/#suites");

      fireEvent.click(exploreBtn!);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
    });

    it("ADV-1.3: verifies PublicHeader smooth scroll contract targets #suites without breaking", () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
          <Landing />
        </MemoryRouter>
      );

      // Header contains links to /#suites
      const posHeaderLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      expect(posHeaderLinks.length).toBeGreaterThan(0);

      const firstPosLink = posHeaderLinks[0];
      expect(firstPosLink.getAttribute("href")).toBe("/#suites");

      fireEvent.click(firstPosLink);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
    });

    it("ADV-1.4: verifies #billing-erp and #workforce-crm capabilities, micro-metrics, and launch actions", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const billingSection = container.querySelector("#billing-erp") as HTMLElement;
      expect(billingSection).not.toBeNull();

      // Check all 6 POS capabilities
      expect(within(billingSection).getByText(/F1-F12 Fast Hotkey Billing/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/58mm & 80mm ESC\/POS Thermal/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/GSTR-1 JSON Schema 2.0 Export/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/Multi-Godown Stock & Batch Expiry/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/Barcode Label Designer Studio/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/100% Offline SQLite Billing Mode/i)).toBeInTheDocument();

      // Check POS micro-metrics
      expect(within(billingSection).getByText(/< 50ms/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/Unlimited/i)).toBeInTheDocument();
      expect(within(billingSection).getByText(/₹ 0 \/ Free/i)).toBeInTheDocument();

      // Check POS launch CTA
      const launchPosBtn = within(billingSection).getByRole("button", { name: /Launch POS Billing ERP/i });
      fireEvent.click(launchPosBtn);
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
      expect(mockNavigate).toHaveBeenCalledWith("/billing/dashboard");

      // Check POS deep link
      const viewPosModulesLink = within(billingSection).getByRole("link", { name: /View POS Modules/i });
      expect(viewPosModulesLink.getAttribute("href")).toBe("/features#pos");

      // CRM Section
      const crmSection = container.querySelector("#workforce-crm") as HTMLElement;
      expect(crmSection).not.toBeNull();

      // Check all 6 CRM capabilities
      expect(within(crmSection).getByText(/GPS Geofenced Mobile Attendance/i)).toBeInTheDocument();
      expect(within(crmSection).getByText(/Automated Monthly Salary Slips/i)).toBeInTheDocument();
      expect(within(crmSection).getByText(/Task Delegation & Kanban Boards/i)).toBeInTheDocument();
      expect(within(crmSection).getByText(/Multi-Tier RBAC Staff Permissions/i)).toBeInTheDocument();
      expect(within(crmSection).getByText(/Team Meet, Huddle & Notices/i)).toBeInTheDocument();
      expect(within(crmSection).getByText(/Bilingual Hindi\/English Voice Copilot/i)).toBeInTheDocument();

      // Check CRM micro-metrics
      expect(within(crmSection).getByText(/100% Audit/i)).toBeInTheDocument();

      // Check CRM launch CTA
      const launchCrmBtn = within(crmSection).getByRole("button", { name: /Launch Workforce CRM/i });
      fireEvent.click(launchCrmBtn);
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
      expect(mockNavigate).toHaveBeenCalledWith("/crm");

      // Check CRM deep link
      const viewCrmModulesLink = within(crmSection).getByRole("link", { name: /View CRM Modules/i });
      expect(viewCrmModulesLink.getAttribute("href")).toBe("/features#crm");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CHALLENGE 2: BOUNDED MODULE EXPLORER (ALL 12 MODULES & DEEP LINKS)
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Bounded Module Explorer & 12-Module Deep Link Audit", () => {
    it("ADV-2.1: asserts container layout containment max-h-[520px] and dual scrollable panes", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const boundedExplorer = container.querySelector(".max-h-\\[520px\\]");
      expect(boundedExplorer).not.toBeNull();
      expect(boundedExplorer?.className).toContain("overflow-hidden");
      expect(boundedExplorer?.className).toContain("flex-col");

      // Both inner columns must have max-h-[445px] overflow-y-auto
      const innerScrollPanes = boundedExplorer?.querySelectorAll(".max-h-\\[445px\\]");
      expect(innerScrollPanes?.length).toBe(2);
      innerScrollPanes?.forEach((pane) => {
        expect(pane.className).toContain("overflow-y-auto");
      });
    });

    it("ADV-2.2: sequentially iterates and verifies all 6 POS & ERP modules and /features deep links", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const posModules = [
        {
          key: "pos",
          btnName: /POS Billing/i,
          expectedTitle: /Lightning-Fast Retail POS Billing Workbench/i,
          featureAnchor: "/features#pos",
        },
        {
          key: "gst",
          btnName: /GST Invoicing/i,
          expectedTitle: /Automated GST Invoicing & Multi-Rate Tax Engine/i,
          featureAnchor: "/features#gst",
        },
        {
          key: "barcode",
          btnName: /Barcode Studio/i,
          expectedTitle: /Custom Barcode & Sticker Generator Studio/i,
          featureAnchor: "/features#barcode",
        },
        {
          key: "inventory",
          btnName: /Stock & Godowns/i,
          expectedTitle: /Multi-Godown Stock & Batch Expiry Tracking/i,
          featureAnchor: "/features#inventory",
        },
        {
          key: "khata",
          btnName: /Udhar Khata/i,
          expectedTitle: /Digital Udhar Khata & WhatsApp Payment Reminders/i,
          featureAnchor: "/features#khata",
        },
        {
          key: "reports",
          btnName: /Tax & CA Reports/i,
          expectedTitle: /GSTR-1 JSON Schema 2.0 & Excel Tax Reports/i,
          featureAnchor: "/features#reports",
        },
      ];

      for (const mod of posModules) {
        const modBtn = screen.getByRole("button", { name: mod.btnName });
        fireEvent.click(modBtn);

        // Verify module preview title updates
        expect(screen.getByText(mod.expectedTitle)).toBeInTheDocument();

        // Verify deep link points to /features#<modKey>
        const exploreFeaturesLink = screen.getByRole("link", { name: /Explore Features/i });
        expect(exploreFeaturesLink.getAttribute("href")).toBe(mod.featureAnchor);

        // Verify try button launches POS suite
        const tryBtn = screen.getByRole("button", { name: new RegExp(`Try .* Free`, "i") });
        fireEvent.click(tryBtn);
        expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
        expect(mockNavigate).toHaveBeenCalledWith("/billing/dashboard");
      }
    });

    it("ADV-2.3: sequentially iterates and verifies all 6 Workforce CRM modules and /features deep links", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      // Switch to Workforce CRM tab
      const crmSuiteTab = screen.getByRole("button", { name: /Workforce CRM \(6\)/i });
      fireEvent.click(crmSuiteTab);

      expect(screen.getByText(/6 Workforce CRM Modules/i)).toBeInTheDocument();

      const crmModules = [
        {
          key: "attendance",
          btnName: /GPS Attendance/i,
          expectedTitle: /100m GPS Geofenced Mobile Attendance & Clock-In/i,
          featureAnchor: "/features#attendance",
        },
        {
          key: "payroll",
          btnName: /Monthly Payroll/i,
          expectedTitle: /Automated Monthly Payroll & Salary Slips Engine/i,
          featureAnchor: "/features#payroll",
        },
        {
          key: "tasks",
          btnName: /Task Boards/i,
          expectedTitle: /Role-Based Task Delegation & Kanban Workflow/i,
          featureAnchor: "/features#tasks",
        },
        {
          key: "roles",
          btnName: /Staff Roles/i,
          expectedTitle: /Multi-Tier Staff Role Permissions & Access Control/i,
          featureAnchor: "/features#roles",
        },
        {
          key: "meet",
          btnName: /Team Meet/i,
          expectedTitle: /Daily Morning Huddles & Team Video\/Audio Sync/i,
          featureAnchor: "/features#meet",
        },
        {
          key: "copilot",
          btnName: /Voice Copilot/i,
          expectedTitle: /Bilingual Hindi & English Voice Copilot Assistant/i,
          featureAnchor: "/features#copilot",
        },
      ];

      for (const mod of crmModules) {
        const modBtn = screen.getByRole("button", { name: mod.btnName });
        fireEvent.click(modBtn);

        // Verify module preview title updates
        expect(screen.getByText(mod.expectedTitle)).toBeInTheDocument();

        // Verify deep link points to /features#<modKey>
        const exploreFeaturesLink = screen.getByRole("link", { name: /Explore Features/i });
        expect(exploreFeaturesLink.getAttribute("href")).toBe(mod.featureAnchor);

        // Verify try button launches CRM suite
        const tryBtn = screen.getByRole("button", { name: new RegExp(`Try .* Free`, "i") });
        fireEvent.click(tryBtn);
        expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
        expect(mockNavigate).toHaveBeenCalledWith("/crm");
      }
    });

    it("ADV-2.4: stress-tests rapid tab switching between POS and CRM suites without DOM desync", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const posTab = screen.getByRole("button", { name: /Retail POS & ERP \(6\)/i });
      const crmTab = screen.getByRole("button", { name: /Workforce CRM \(6\)/i });

      // Rapidly toggle 10 times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(crmTab);
        expect(screen.getByText(/6 Workforce CRM Modules/i)).toBeInTheDocument();

        fireEvent.click(posTab);
        expect(screen.getByText(/6 POS & ERP Modules/i)).toBeInTheDocument();
      }

      // Ensure stable final state
      expect(screen.getByText(/Lightning-Fast Retail POS Billing Workbench/i)).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CHALLENGE 3: BUTTON TOKEN AUDIT & BLOATED CLASS BAN
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. Button Token Compliance & Zero Bloated Classes Audit", () => {
    it("ADV-3.1: asserts strict absence of bloated button classes across all buttons on Landing", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(15);

      const bloatedPatterns = [
        /\bh-11\b/,
        /\bh-12\b/,
        /\bh-13\b/,
        /\bpx-8\b/,
        /\brounded-3xl\b/,
      ];

      buttons.forEach((btn) => {
        // Exclude aria-label="Toggle navigation menu" (mobile 44x44px touch target)
        if (btn.getAttribute("aria-label") === "Toggle navigation menu") {
          return;
        }

        const className = btn.className || "";
        for (const pattern of bloatedPatterns) {
          expect(
            pattern.test(className),
            `Button "${btn.textContent?.slice(0, 30)}" contains bloated class matching ${pattern} in "${className}"`
          ).toBe(false);
        }
      });
    });

    it("ADV-3.2: verifies specific primary action buttons adhere to master height standards (h-9.5, h-8.5, h-7)", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      // Hero Start Free CTA: h-9.5
      const heroStartBtn = screen.getByRole("button", { name: /Start Free Now 🚀/i });
      expect(heroStartBtn.className).toMatch(/\bh-9\.5\b/);
      expect(heroStartBtn.className).toMatch(/\bpx-4\.5\b/);

      // Native App Trigger Buttons: h-7
      const androidApkBtn = screen.getByRole("button", { name: /Android APK/i });
      expect(androidApkBtn.className).toMatch(/\bh-7\b/);
      expect(androidApkBtn.className).toMatch(/\bpx-2\.5\b/);

      const windowsPcBtn = screen.getByRole("button", { name: /Windows PC/i });
      expect(windowsPcBtn.className).toMatch(/\bh-7\b/);
      expect(windowsPcBtn.className).toMatch(/\bpx-2\.5\b/);

      // Suite Launch Buttons: h-8.5
      const launchPosBtn = screen.getByRole("button", { name: /Launch POS Billing ERP/i });
      expect(launchPosBtn.className).toMatch(/\bh-8\.5\b/);

      const launchCrmBtn = screen.getByRole("button", { name: /Launch Workforce CRM/i });
      expect(launchCrmBtn.className).toMatch(/\bh-8\.5\b/);

      // Bento Action Buttons: h-8.5
      const learnMoreBtn = screen.getByRole("button", { name: /Learn More/i });
      expect(learnMoreBtn.className).toMatch(/\bh-8\.5\b/);

      const credibilityBtn = screen.getByRole("button", { name: /Check Business Credibility/i });
      expect(credibilityBtn.className).toMatch(/\bh-8\.5\b/);
    });

    it("ADV-3.3: verifies tabular numbers (font-mono tabular-nums) are used for metrics across the page", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <Landing />
        </MemoryRouter>
      );

      // Find all elements with tabular-nums
      const tabularElements = container.querySelectorAll(".tabular-nums");
      expect(tabularElements.length).toBeGreaterThan(0);

      tabularElements.forEach((el) => {
        expect(el.className).toContain("font-mono");
      });
    });
  });
});
