/**
 * @file desktopShellMilestone2.challenger.test.tsx
 * @description Empirical Challenger Stress Test Suite for Milestone 2:
 * Desktop Shell & Productivity Layouts (AppLayout, SuiteSwitcher, POSBilling).
 *
 * Verifies:
 * 1. AppLayout.tsx 52px (h-13) desktop header, 28px brand mark, org switcher pill,
 *    centered Command Palette trigger visible on md: screens, Royal Blue split button,
 *    Live Sync dot, viewport containment, and total elimination of 3D tilt & floating watermark.
 * 2. SuiteSwitcher.tsx neutral segmented styling, ARIA attributes, keyboard control,
 *    localStorage state persistence, and event dispatching.
 * 3. POSBilling.tsx monochromatic hotkey ribbon and 3-region right panel viewport containment.
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import fs from "fs";
import path from "path";

import {
  SuiteSwitcher,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  type ActiveSuite,
} from "@/components/SuiteSwitcher";

const APP_LAYOUT_PATH = path.resolve(process.cwd(), "src/components/AppLayout.tsx");
const SUITE_SWITCHER_PATH = path.resolve(process.cwd(), "src/components/SuiteSwitcher.tsx");
const POS_BILLING_PATH = path.resolve(process.cwd(), "src/pages/POSBilling.tsx");

describe("Challenger 1 — Milestone 2 Desktop Shell & Productivity Layouts Empirical Harness", () => {
  // =========================================================================
  // 1. APPLAYOUT SOURCE AUDIT & STATIC STRUCTURAL STRESS TESTS
  // =========================================================================
  describe("AppLayout.tsx Structural Specification Audit", () => {
    let appLayoutSource: string;

    beforeEach(() => {
      appLayoutSource = fs.readFileSync(APP_LAYOUT_PATH, "utf-8");
    });

    it("verifies desktop header height is exactly 52px (h-13) and eliminates bloated 80-88px heights", () => {
      // Must contain h-13 (52px standard)
      expect(appLayoutSource).toMatch(/h-13/);
      expect(appLayoutSource).toMatch(/<header[^>]*h-13/);

      // Must NOT contain old bloated heights
      expect(appLayoutSource).not.toMatch(/md:h-\[calc\(5rem/);
      expect(appLayoutSource).not.toMatch(/lg:h-\[calc\(5\.5rem/);
      expect(appLayoutSource).not.toMatch(/h-20/);
      expect(appLayoutSource).not.toMatch(/h-24/);
    });

    it("verifies permanent CredSmart platform shield mark (/favicon.png) and Inter CredSmart wordmark", () => {
      // Shield logo container: w-8 h-8 rounded-lg border border-slate-200/80
      expect(appLayoutSource).toMatch(/w-8\s+h-8\s+rounded-lg\s+border\s+border-slate-200\/80/);

      // Favicon shield mark
      expect(appLayoutSource).toMatch(/\/favicon\.png/);

      // Inter typography wordmark
      expect(appLayoutSource).toMatch(/CredSmart<\/span>/);
    });

    it("verifies dedicated left Organization Switcher dropdown pill exists with compact styling", () => {
      // Switcher pill trigger: h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg border border-slate-200/80
      expect(appLayoutSource).toMatch(/h-7\s+sm:h-8\s+px-1\.5\s+sm:px-2\.5\s+rounded-lg\s+border\s+border-slate-200\/80/);
      expect(appLayoutSource).toMatch(/org\?\.name\s*\|\|\s*"My Business"/);
    });

    it("verifies centered Command Palette (⌘K) search trigger is visible on md: screens and above", () => {
      // Must use hidden md:flex (NOT restricted to xl: only)
      expect(appLayoutSource).toMatch(/hidden\s+md:flex\s+flex-1\s+max-w-md\s+mx-2/);

      // Must have h-8.5 rounded-lg bg-slate-100/80
      expect(appLayoutSource).toMatch(/h-8\.5\s+px-3\s+rounded-lg\s+bg-slate-100\/80/);

      // Must render search text and ⌘K badge
      expect(appLayoutSource).toMatch(/Search or ⌘K\.\.\./);
      expect(appLayoutSource).toMatch(/<kbd[^>]*>⌘K<\/kbd>/);
    });

    it("verifies Royal Blue split action button (bg-blue-600) with primary action and chevron dropdown", () => {
      // Primary container: bg-blue-600 hover:bg-blue-700
      expect(appLayoutSource).toMatch(/h-8\.5\s+rounded-lg\s+bg-blue-600\s+hover:bg-blue-700\s+text-white/);

      // New Invoice action in Billing suite
      expect(appLayoutSource).toMatch(/New Invoice<\/span>/);

      // Chevron dropdown trigger with border-l border-blue-500
      expect(appLayoutSource).toMatch(/border-l\s+border-blue-500/);
    });

    it("verifies Live Sync status indicator with emerald animated dot and font-mono text", () => {
      // Live Sync wrapper
      expect(appLayoutSource).toMatch(/text-\[11px\]\s+font-mono\s+font-medium\s+text-emerald-600/);

      // Green pulsing dot
      expect(appLayoutSource).toMatch(/w-1\.5\s+h-1\.5\s+rounded-full\s+bg-emerald-500\s+animate-pulse/);

      // Live Sync label
      expect(appLayoutSource).toMatch(/Live Sync<\/span>/);
    });

    it("verifies 3D perspective distortion, rotateX, and tilt transforms are completely absent", () => {
      expect(appLayoutSource).not.toMatch(/perspective:\s*2000px/i);
      expect(appLayoutSource).not.toMatch(/rotateX\(/i);
      expect(appLayoutSource).not.toMatch(/transform-style:\s*preserve-3d/i);
      expect(appLayoutSource).not.toMatch(/scale\(0\.96\)/i);
    });

    it("verifies floating bottom-right watermark is completely eliminated from the DOM structure", () => {
      // Watermark image / static logo overlay should not be present in main viewport
      expect(appLayoutSource).not.toMatch(/fixed\s+bottom-4\s+right-4[^>]*logo-static/);
      expect(appLayoutSource).not.toMatch(/fixed\s+bottom-[0-9]+\s+right-[0-9]+[^>]*opacity/);
      expect(appLayoutSource).not.toMatch(/\/logo-static\.jpeg/);
    });

    it("verifies viewport containment architecture (flex-1 min-h-0 overflow-hidden)", () => {
      // Outer wrapper
      expect(appLayoutSource).toMatch(/flex\s+flex-col\s+h-screen\s+w-full\s+overflow-hidden\s+bg-background/);

      // Content container
      expect(appLayoutSource).toMatch(/flex-1\s+min-w-0\s+min-h-0\s+flex\s+flex-col\s+overflow-hidden/);

      // <main> container has min-h-0
      expect(appLayoutSource).toMatch(/<main[\s\S]*?min-h-0/);
    });
  });

  // =========================================================================
  // 2. SUITESWITCHER EMPIRICAL RENDERING & ACCESSIBILITY TESTS
  // =========================================================================
  describe("SuiteSwitcher Component Empirical Behavior", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("renders as neutral segmented control without saturated amber or emerald button fills", () => {
      const { container } = render(<SuiteSwitcher />);

      // Outer wrapper must have neutral segmented styling
      const group = screen.getByRole("group", { name: "Suite Switcher" });
      expect(group.className).toContain("bg-slate-100");
      expect(group.className).toContain("border-slate-200/80");

      // Active button must use neutral white card surface (not amber-500 or emerald-600)
      const billingBtn = screen.getByTestId("suite-btn-billing");
      expect(billingBtn.className).toContain("bg-white");
      expect(billingBtn.className).toContain("shadow-2xs");
      expect(billingBtn.className).not.toContain("bg-amber-500");
      expect(billingBtn.className).not.toContain("bg-emerald-600");

      // Inactive button must use text-slate-500
      const crmBtn = screen.getByTestId("suite-btn-crm");
      expect(crmBtn.className).toContain("text-slate-500");
      expect(crmBtn.className).not.toContain("bg-amber-500");
      expect(crmBtn.className).not.toContain("bg-emerald-600");
    });

    it("renders active suite badge with neutral font-mono styling", () => {
      render(<SuiteSwitcher />);
      const badge = screen.getByTestId("active-suite-badge-billing");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("font-mono");
      expect(badge.className).toContain("bg-slate-100");
      expect(badge.className).toContain("text-slate-600");
    });

    it("enforces full ARIA radio group accessibility semantics", () => {
      render(<SuiteSwitcher />);

      const group = screen.getByRole("group", { name: "Suite Switcher" });
      expect(group).toBeInTheDocument();

      const billingRadio = screen.getByRole("radio", { name: "CredSmart POS & Billing" });
      const crmRadio = screen.getByRole("radio", { name: "CredSmart CRM" });

      expect(billingRadio).toBeInTheDocument();
      expect(crmRadio).toBeInTheDocument();

      expect(billingRadio).toHaveAttribute("aria-checked", "true");
      expect(crmRadio).toHaveAttribute("aria-checked", "false");
    });

    it("persists active suite to localStorage and dispatches window event on selection", () => {
      const eventSpy = vi.fn();
      window.addEventListener(SUITE_CHANGED_EVENT, eventSpy);

      render(<SuiteSwitcher />);
      const crmBtn = screen.getByTestId("suite-btn-crm");

      act(() => {
        fireEvent.click(crmBtn);
      });

      // localStorage must persist 'crm'
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");

      // Window event must be dispatched
      expect(eventSpy).toHaveBeenCalledTimes(1);
      const customEvent = eventSpy.mock.calls[0][0] as CustomEvent<{ suite: ActiveSuite }>;
      expect(customEvent.detail.suite).toBe("crm");

      // CRM radio is now checked
      expect(crmBtn).toHaveAttribute("aria-checked", "true");
      expect(screen.getByTestId("active-suite-badge-crm")).toBeInTheDocument();
      expect(screen.queryByTestId("active-suite-badge-billing")).not.toBeInTheDocument();

      window.removeEventListener(SUITE_CHANGED_EVENT, eventSpy);
    });

    it("switches back to Billing suite on click and updates persistence", () => {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "crm");
      render(<SuiteSwitcher />);

      const billingBtn = screen.getByTestId("suite-btn-billing");
      act(() => {
        fireEvent.click(billingBtn);
      });

      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");
      expect(billingBtn).toHaveAttribute("aria-checked", "true");
      expect(screen.getByTestId("active-suite-badge-billing")).toBeInTheDocument();
    });

    it("supports keyboard navigation via Enter and Space keys", () => {
      render(<SuiteSwitcher />);
      const crmBtn = screen.getByTestId("suite-btn-crm");

      // Activate via Enter
      act(() => {
        fireEvent.keyDown(crmBtn, { key: "Enter" });
      });
      expect(crmBtn).toHaveAttribute("aria-checked", "true");

      // Activate via Space
      const billingBtn = screen.getByTestId("suite-btn-billing");
      act(() => {
        fireEvent.keyDown(billingBtn, { key: " " });
      });
      expect(billingBtn).toHaveAttribute("aria-checked", "true");
    });

    it("invokes optional onSuiteChange callback when provided", () => {
      const onSuiteChangeMock = vi.fn();
      render(<SuiteSwitcher onSuiteChange={onSuiteChangeMock} />);

      act(() => {
        fireEvent.click(screen.getByTestId("suite-btn-crm"));
      });

      expect(onSuiteChangeMock).toHaveBeenCalledWith("crm");
    });

    it("respects currentSuite prop override", () => {
      render(<SuiteSwitcher currentSuite="crm" />);

      expect(screen.getByTestId("suite-btn-crm")).toHaveAttribute("aria-checked", "true");
      expect(screen.getByTestId("suite-btn-billing")).toHaveAttribute("aria-checked", "false");
      expect(screen.getByTestId("active-suite-badge-crm")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. POSBILLING VIEWPORT CONTAINMENT & HOTKEY RIBBON AUDIT
  // =========================================================================
  describe("POSBilling.tsx Viewport Containment & Hotkey Ribbon Audit", () => {
    let posBillingSource: string;

    beforeEach(() => {
      posBillingSource = fs.readFileSync(POS_BILLING_PATH, "utf-8");
    });

    it("verifies monochromatic hotkey ribbon with clean monospace shortcut chips", () => {
      // Hotkey container: p-2 border-b border-slate-200/80 bg-slate-50/80
      expect(posBillingSource).toMatch(/border-b\s+border-slate-200\/80\s+bg-slate-50\/80/);

      // Search [F1]
      expect(posBillingSource).toMatch(/Focus Search Bar \[F1\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*F1\s*<\/kbd>/);

      // + New Item [CTRL+I]
      expect(posBillingSource).toMatch(/Add New Stock Item \[CTRL\+I\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*CTRL\+I\s*<\/kbd>/);

      // Hold Bill [CTRL+B]
      expect(posBillingSource).toMatch(/Hold Current Bill & Start New \[CTRL\+B\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*CTRL\+B\s*<\/kbd>/);

      // Price [P]
      expect(posBillingSource).toMatch(/Change Price of Selected Item \[P\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*P\s*<\/kbd>/);

      // Qty [Q]
      expect(posBillingSource).toMatch(/Change Quantity of Selected Item \[Q\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*Q\s*<\/kbd>/);

      // Discount [D]
      expect(posBillingSource).toMatch(/Change Discount on Selected Item \[D\]/);
      expect(posBillingSource).toMatch(/<kbd[^>]*>\s*D\s*<\/kbd>/);

      // Voice Assistant [V]
      expect(posBillingSource).toMatch(/Voice Assistant/);
    });

    it("verifies right checkout panel decouples into 3 screen-fitted regions", () => {
      // Panel container: w-full lg:w-[400px] xl:w-[430px] shrink-0 bg-slate-50 flex flex-col h-full min-h-0 overflow-hidden
      expect(posBillingSource).toMatch(/lg:w-\[400px\]\s+xl:w-\[430px\]\s+shrink-0\s+bg-slate-50\s+flex\s+flex-col\s+h-full\s+min-h-0/);

      // Region 1: Fixed Top Net Payable Total (shrink-0 p-3.5 bg-blue-600 text-white)
      expect(posBillingSource).toMatch(/Region 1: Fixed Top Net Payable Total/);
      expect(posBillingSource).toMatch(/shrink-0\s+p-3\.5\s+bg-blue-600\s+text-white\s+flex\s+items-center\s+justify-between/);
      expect(posBillingSource).toMatch(/text-2xl\s+font-bold\s+font-mono\s+tabular-nums/);

      // Region 2: Bounded Middle Scroll Area (flex-1 min-h-0 overflow-y-auto space-y-3 p-3 scrollbar-thin)
      expect(posBillingSource).toMatch(/Region 2: Bounded Middle Scroll Area/);
      expect(posBillingSource).toMatch(/flex-1\s+min-h-0\s+overflow-y-auto\s+p-3\s+space-y-3\s+scrollbar-thin/);

      // Region 3: Fixed Bottom Checkout Action Dock (shrink-0 p-3 border-t border-slate-200/80 bg-white grid grid-cols-3)
      expect(posBillingSource).toMatch(/Region 3: Fixed Bottom Checkout Action Dock/);
      expect(posBillingSource).toMatch(/shrink-0\s+p-3\s+border-t\s+border-slate-200\/80\s+bg-white\s+grid\s+grid-cols-3/);

      // Region 3 Action buttons: Print [F6], Save [F7], WhatsApp
      expect(posBillingSource).toMatch(/Save bill and print receipt \[F6\]/);
      expect(posBillingSource).toMatch(/Save bill directly \[F7\]/);
      expect(posBillingSource).toMatch(/Save bill and dispatch WhatsApp receipt/);
    });
  });
});
