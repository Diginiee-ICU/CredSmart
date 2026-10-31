/**
 * @file posAuthCrmOption.test.tsx
 * @description Test Suite for POS Auth Page CRM Option & Navigation
 * Verifies:
 * 1. Default POS & Billing ERP selection renders standard POS login
 * 2. Dedicated Workforce CRM panel renders when CRM is selected
 * 3. CRM panel does NOT submit POS credentials
 * 4. Navigates cleanly to /crm with storage synchronization
 * 5. Handles ?suite=crm search param automatically
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
  },
}));

// Mock organization hook
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    refresh: vi.fn(),
  }),
  getPendingOnboarding: vi.fn(() => null),
  setPendingOnboarding: vi.fn(),
  clearPendingOnboarding: vi.fn(),
}));

// Mock services
vi.mock("@/services/productsApi", () => ({
  productsApi: {
    getProducts: vi.fn(() => Promise.resolve({ data: [] })),
    createProduct: vi.fn(),
    bulkUpsertBatches: vi.fn(),
  },
}));

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getMemberships: vi.fn(() => Promise.resolve({ data: [] })),
    createOrganization: vi.fn(),
    upsertMembership: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import Auth from "@/pages/Auth";

describe("POS Auth Page CRM Option & Navigation Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders default POS login form with POS & Billing active", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Auth />
      </MemoryRouter>
    );

    // Platform logo & title
    expect(screen.getByText("POS & Billing ERP")).toBeInTheDocument();
    expect(screen.getByText("Workforce CRM")).toBeInTheDocument();

    // Context tag indicates POS
    expect(screen.getByText(/Signing into POS & Billing ERP/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Workspace/i })).toBeInTheDocument();

    // Helper prompt present
    expect(screen.getByText(/Need Workforce CRM instead\?/i)).toBeInTheDocument();
  });

  it("switches to dedicated Workforce CRM panel when Workforce CRM button is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Auth />
      </MemoryRouter>
    );

    const crmTabBtn = screen.getByTestId("crm-portal-toggle-btn");
    act(() => {
      fireEvent.click(crmTabBtn);
    });

    // Panel is rendered
    const crmPanel = screen.getByTestId("crm-portal-panel");
    expect(crmPanel).toBeInTheDocument();

    // No POS password login input in CRM mode
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign In to Workspace/i })).not.toBeInTheDocument();

    // Explanatory guidance
    expect(screen.getByText(/Workforce CRM operates on its own dedicated authentication/i)).toBeInTheDocument();
    expect(screen.getByText(/Standalone Cloud/i)).toBeInTheDocument();

    // Feature chips
    expect(screen.getByText(/Staff PIN & Sign-In/i)).toBeInTheDocument();
    expect(screen.getByText(/Geofenced Attendance/i)).toBeInTheDocument();
    expect(screen.getByText(/Salary & Payroll Engine/i)).toBeInTheDocument();
  });

  it("navigates to /crm when Open Workforce CRM Portal button is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Auth />
      </MemoryRouter>
    );

    // Switch to CRM
    const crmTabBtn = screen.getByTestId("crm-portal-toggle-btn");
    act(() => {
      fireEvent.click(crmTabBtn);
    });

    const goToCrmBtn = screen.getByTestId("go-to-crm-btn");
    act(() => {
      fireEvent.click(goToCrmBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/crm");
    expect(localStorage.getItem("credsmart_active_suite")).toBe("crm");
    expect(localStorage.getItem("credsmart_suite_preference")).toBe("crm");
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
  });

  it("returns to POS login form when Return to POS & Billing Login button is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Auth />
      </MemoryRouter>
    );

    // Switch to CRM
    const crmTabBtn = screen.getByTestId("crm-portal-toggle-btn");
    act(() => {
      fireEvent.click(crmTabBtn);
    });

    expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();

    // Click return
    const returnBtn = screen.getByRole("button", { name: /Return to POS & Billing Login/i });
    act(() => {
      fireEvent.click(returnBtn);
    });

    // POS login restored
    expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
  });

  it("automatically displays Workforce CRM panel when loaded with ?suite=crm", () => {
    render(
      <MemoryRouter initialEntries={["/auth?suite=crm"]}>
        <Auth />
      </MemoryRouter>
    );

    // Starts directly in CRM panel without POS form
    expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    expect(screen.getByTestId("go-to-crm-btn")).toBeInTheDocument();
  });
});
