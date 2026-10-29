import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ColdLaunchHub, isColdLaunchActive } from "@/components/portal/ColdLaunchHub";
import * as nativeCapacitor from "@/services/nativeCapacitor";

const mockedNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe("ColdLaunchHub & Platform-Aware Launch Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Cold Launch Detection Engine (isColdLaunchActive)", () => {
    it("returns false in standard desktop web browser (not native and not standalone)", () => {
      vi.spyOn(nativeCapacitor, "isNativePlatform").mockReturnValue(false);
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isColdLaunchActive()).toBe(false);
    });

    it("returns true on cold boot native platform when portal unselected", () => {
      vi.spyOn(nativeCapacitor, "isNativePlatform").mockReturnValue(true);
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBeNull();
      expect(isColdLaunchActive()).toBe(true);
    });

    it("returns true on standalone PWA display mode when portal unselected", () => {
      vi.spyOn(nativeCapacitor, "isNativePlatform").mockReturnValue(false);
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isColdLaunchActive()).toBe(true);
    });

    it("returns false once portal active selection is persisted in sessionStorage", () => {
      vi.spyOn(nativeCapacitor, "isNativePlatform").mockReturnValue(true);
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
      expect(isColdLaunchActive()).toBe(false);

      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
      expect(isColdLaunchActive()).toBe(false);
    });
  });

  describe("2. Hub Surface Rendering & Minimal Design System Conformance", () => {
    it("renders selection hub with both operational portal pods", () => {
      render(
        <MemoryRouter>
          <ColdLaunchHub />
        </MemoryRouter>
      );

      expect(screen.getByText("Select Operational Portal")).toBeDefined();
      expect(screen.getByText("POS & Billing ERP")).toBeDefined();
      expect(screen.getByText("CredSmart CRM by CredAlert")).toBeDefined();
    });

    it("displays both launch pods with action buttons", () => {
      render(
        <MemoryRouter>
          <ColdLaunchHub />
        </MemoryRouter>
      );

      expect(screen.getByText("Launch POS")).toBeDefined();
      expect(screen.getByText("Launch CRM")).toBeDefined();
    });

    it("toggles dark mode when theme button is clicked", () => {
      render(
        <MemoryRouter>
          <ColdLaunchHub />
        </MemoryRouter>
      );

      const themeBtn = screen.getByRole("button", { name: /toggle theme/i });
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      fireEvent.click(themeBtn);
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      fireEvent.click(themeBtn);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("3. Operational Portal Dispatch & Navigation", () => {
    it("selects POS & Billing: updates sessionStorage and navigates to /billing/dashboard", () => {
      render(
        <MemoryRouter>
          <ColdLaunchHub />
        </MemoryRouter>
      );

      const posPod = screen.getByTestId("launch-pos-pod");
      fireEvent.click(posPod);

      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
      expect(mockedNavigate).toHaveBeenCalledWith("/billing/dashboard");
    });

    it("selects Lovable CRM: updates sessionStorage and navigates to /crm", () => {
      render(
        <MemoryRouter>
          <ColdLaunchHub />
        </MemoryRouter>
      );

      const crmPod = screen.getByTestId("launch-crm-pod");
      fireEvent.click(crmPod);

      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
      expect(mockedNavigate).toHaveBeenCalledWith("/crm");
    });
  });
});
