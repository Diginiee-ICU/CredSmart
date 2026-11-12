import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MobileAppStartingCards } from "@/components/mobile/MobileAppStartingCards";
import { ROUTE_PATHS, ACTIVE_SUITE_STORAGE_KEY } from "@/config/routes";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("MobileAppStartingCards Redesign Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders the initial card with brand header, version badge, and step 01 / 05", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    // Verify brand
    expect(screen.getByText("CredSmart")).toBeDefined();
    expect(screen.getByText("v1.2.1")).toBeDefined();
    expect(screen.getByText("Dual-Engine Architecture")).toBeDefined();

    // Verify first slide content
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("01 / 05");
    expect(screen.getByText("TURBO POS BILLING")).toBeDefined();
    expect(screen.getByText("Instant POS & Thermal Checkout")).toBeDefined();
    expect(screen.getByText("High-speed camera & laser hardware scanner")).toBeDefined();

    // Verify Continue button
    expect(screen.getByTestId("onboarding-next-btn")).toBeDefined();
    expect(screen.queryByTestId("onboarding-prev-btn")).toBeNull();
  });

  it("navigates through steps with Continue and Back buttons", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    const nextBtn = screen.getByTestId("onboarding-next-btn");
    fireEvent.click(nextBtn);

    // Step 2: Smart Inventory
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("02 / 05");
    expect(screen.getByText("AUTOMATED STOCK")).toBeDefined();
    expect(screen.getByText("Real-Time Stock & Batch Tracking")).toBeDefined();

    // Back button should now be visible
    const prevBtn = screen.getByTestId("onboarding-prev-btn");
    expect(prevBtn).toBeDefined();

    // Step 3: B2B Khata
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("03 / 05");
    expect(screen.getByText("SYNCED LEDGERS")).toBeDefined();

    // Step 4: Workforce CRM
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("04 / 05");
    expect(screen.getByText("GPS ATTENDANCE & HR")).toBeDefined();
    expect(screen.getByText("GPS Attendance & Voice Copilot")).toBeDefined();

    // Click Back to return to step 3
    fireEvent.click(screen.getByTestId("onboarding-prev-btn"));
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("03 / 05");
  });

  it("allows jumping directly to a slide using step pills", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    // Click pill 3 (slide 4: Workforce CRM)
    const pill3 = screen.getByTestId("step-pill-3");
    fireEvent.click(pill3);

    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("04 / 05");
    expect(screen.getByText("GPS Attendance & Voice Copilot")).toBeDefined();
  });

  it("renders dual-engine choices on final slide and handles Launch POS", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    // Jump to slide 4 (step 5)
    fireEvent.click(screen.getByTestId("step-pill-4"));

    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("05 / 05");
    expect(screen.getByText("DUAL-ENGINE SECURITY")).toBeDefined();

    const launchPosBtn = screen.getByTestId("launch-pos-choice-btn");
    const launchCrmBtn = screen.getByTestId("launch-crm-choice-btn");
    expect(launchPosBtn).toBeDefined();
    expect(launchCrmBtn).toBeDefined();

    // Click Launch POS
    fireEvent.click(launchPosBtn);

    expect(localStorage.getItem("credsmart_onboarding_completed")).toBe("true");
    expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.dashboard);
  });

  it("handles Launch CRM from the final slide", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    // Jump to slide 4 (step 5)
    fireEvent.click(screen.getByTestId("step-pill-4"));

    const launchCrmBtn = screen.getByTestId("launch-crm-choice-btn");
    fireEvent.click(launchCrmBtn);

    expect(localStorage.getItem("credsmart_onboarding_completed")).toBe("true");
    expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
    expect(mockNavigate).toHaveBeenCalledWith("/crm");
  });

  it("handles Skip Tour and marks onboarding completed", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    const skipBtn = screen.getByTestId("skip-tour-btn");
    fireEvent.click(skipBtn);

    expect(localStorage.getItem("credsmart_onboarding_completed")).toBe("true");
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.landing);
  });

  it("handles Sign In link and routes to auth", () => {
    render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    const signInLink = screen.getByTestId("onboarding-signin-link");
    fireEvent.click(signInLink);

    expect(localStorage.getItem("credsmart_onboarding_completed")).toBe("true");
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.auth);
  });

  it("supports touch swipe navigation between cards", () => {
    const { container } = render(
      <MemoryRouter>
        <MobileAppStartingCards />
      </MemoryRouter>
    );

    const swipeRoot = screen.getByTestId("mobile-app-starting-cards");

    // Simulate Left Swipe (swipe from 200px to 80px -> distance 120px > 45px)
    fireEvent.touchStart(swipeRoot, { targetTouches: [{ clientX: 200 }] });
    fireEvent.touchMove(swipeRoot, { targetTouches: [{ clientX: 80 }] });
    fireEvent.touchEnd(swipeRoot);

    // Should advance to step 2
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("02 / 05");

    // Simulate Right Swipe (swipe from 80px to 220px -> distance -140px < -45px)
    fireEvent.touchStart(swipeRoot, { targetTouches: [{ clientX: 80 }] });
    fireEvent.touchMove(swipeRoot, { targetTouches: [{ clientX: 220 }] });
    fireEvent.touchEnd(swipeRoot);

    // Should return to step 1
    expect(screen.getByTestId("onboarding-step-counter").textContent).toBe("01 / 05");
  });
});
