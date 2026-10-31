/**
 * @file challenger2NonRegressionAdversarial.test.tsx
 * @description Empirical Challenger 2 Adversarial Stress & Non-Regression Verification
 *
 * Stress-tests:
 * 1. URL search parameter fuzzing (?suite=crm, ?suite=billing, ?suite=random_attack, ?suite=)
 * 2. Rapid state toggling between POS login and CRM portal panel
 * 3. CRM Portal redirect and local/sessionStorage sync contract
 * 4. CRM AuthOnboarding.tsx component integrity and exports
 * 5. AppLayout and WorkspaceSwitcher header baseline parity (h-8.5 34px standard)
 * 6. Automated quarantine file integrity verification (19/19 files 0 diff)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Mock Supabase client
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
import * as AuthOnboardingModule from "@/crm/components/AuthOnboarding";

describe("Challenger 2: Adversarial Non-Regression & Boundary Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("POS Auth URL Param Fuzzing & Resiliency", () => {
    it("handles adversarial / unknown ?suite=param safely without crashing", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=sql_injection_attempt_123&test=1"]}>
          <Auth />
        </MemoryRouter>
      );

      // Should safely default to POS login form
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
    });

    it("handles empty ?suite= gracefully without crashing", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite="]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(screen.queryByTestId("crm-portal-panel")).not.toBeInTheDocument();
    });

    it("handles deep-linked ?suite=crm with other query parameters", () => {
      render(
        <MemoryRouter initialEntries={["/auth?utm_source=google&suite=crm&ref=ad"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    });
  });

  describe("Rapid Toggling and Interaction Stress", () => {
    it("survives rapid back-and-forth switching between POS and CRM without crashing", () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      const crmToggle = screen.getByTestId("crm-portal-toggle-btn");
      const posToggle = screen.getByTestId("pos-portal-toggle-btn");

      // Rapidly toggle 6 times
      for (let i = 0; i < 3; i++) {
        act(() => { fireEvent.click(crmToggle); });
        expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();

        act(() => { fireEvent.click(posToggle); });
        expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      }
    });

    it("verifies 1-tap switch from POS login prompt to CRM panel", () => {
      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      // Find prompt button
      const promptBtn = screen.getByRole("button", { name: /Need Workforce CRM instead\? Switch to CRM Portal/i });
      expect(promptBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(promptBtn);
      });

      expect(screen.getByTestId("crm-portal-panel")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("Email address")).not.toBeInTheDocument();
    });

    it("verifies CRM CTA synchronizes storage keys and navigates cleanly", () => {
      render(
        <MemoryRouter initialEntries={["/auth?suite=crm"]}>
          <Auth />
        </MemoryRouter>
      );

      const goToCrmBtn = screen.getByTestId("go-to-crm-btn");
      act(() => {
        fireEvent.click(goToCrmBtn);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/crm");
      expect(localStorage.getItem("credsmart_active_suite")).toBe("crm");
      expect(localStorage.getItem("credsmart_suite_preference")).toBe("crm");
      expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
    });
  });

  describe("CRM Auth Module Integrity", () => {
    it("ensures AuthOnboarding exports all required popup and auth components", () => {
      expect(typeof AuthOnboardingModule.AuthSheet).toBe("function");
      expect(typeof AuthOnboardingModule.CompanyOnboarding).toBe("function");
      expect(typeof AuthOnboardingModule.StaffSignIn).toBe("function");
      expect(typeof AuthOnboardingModule.STAFF_COMPANY_KEY).toBe("string");
    });
  });

  describe("Header Design System Height & Baseline Conformance", () => {
    it("ensures AppLayout Business Selector and WorkspaceSwitcher trigger have standardized 34px (h-8.5) height", () => {
      const appLayoutContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/AppLayout.tsx"),
        "utf-8"
      );
      const workspaceSwitcherContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/portal/WorkspaceSwitcher.tsx"),
        "utf-8"
      );

      // Business Selector trigger in AppLayout
      expect(appLayoutContent).toMatch(
        /className="flex\s+h-8\.5\s+px-2\.5\s+rounded-lg\s+border\s+border-slate-200\/80\s+dark:border-slate-800\s+bg-white\s+dark:bg-slate-900/
      );

      // WorkspaceSwitcher trigger button
      expect(workspaceSwitcherContent).toMatch(
        /className="h-8\.5\s+px-2\.5\s+rounded-lg\s+border\s+border-slate-200\/80\s+dark:border-slate-800\s+bg-white\s+dark:bg-slate-900/
      );

      // Desktop 1px Hairline divider between them
      expect(appLayoutContent).toMatch(
        /<div\s+className="hidden\s+sm:block\s+h-4\s+w-px\s+bg-slate-200\s+dark:bg-slate-800\s+shrink-0\s+mx-0\.5\s+sm:mx-1"\s+aria-hidden="true"\s*\/>/
      );
    });
  });

  describe("Quarantine Invariants Empirical Verification", () => {
    it("verifies all 19 quarantine files are untouched in git status and present on disk", () => {
      const quarantineFiles = [
        "src/components/invoices/mobile/MobileCreateInvoice.tsx",
        "src/components/invoices/mobile/AddItemModal.tsx",
        "src/components/invoices/mobile/SelectPartyModal.tsx",
        "src/components/invoices/mobile/EditItemModal.tsx",
        "src/components/invoices/mobile/MobileInvoiceSuccessView.tsx",
        "src/components/invoices/mobile/MobileBillPreviewModal.tsx",
        "src/components/invoices/mobile/MobileInvoiceFitViewer.tsx",
        "src/components/invoices/mobile/CreatePartyModal.tsx",
        "src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx",
        "src/components/items/mobile/CreateNewItemModal.tsx",
        "src/components/SalesInvoiceModal.tsx",
        "src/components/PurchaseInvoiceModal.tsx",
        "src/components/invoices/AddItemsToBillModal.tsx",
        "src/components/invoices/InvoiceFitView.tsx",
        "src/components/invoices/UnifiedInvoiceRenderer.tsx",
        "src/utils/downloadExactInvoice.ts",
        "src/utils/whatsappPdfShare.ts",
        "src/utils/invoiceThemeLoader.ts",
        "src/services/documentsService.ts",
      ];

      let gitStatus = "";
      try {
        gitStatus = execSync("git status --porcelain", {
          cwd: process.cwd(),
          encoding: "utf-8",
        });
      } catch {
        // fallback
      }

      for (const filePath of quarantineFiles) {
        const fullPath = path.resolve(process.cwd(), filePath);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(gitStatus).not.toContain(filePath);
      }
    });
  });
});
