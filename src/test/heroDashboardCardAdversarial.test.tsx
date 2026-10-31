import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";

describe("HeroDashboardCard Adversarial Stress Test Suite", () => {
  // ── TEST 1: Default Mount Invariance & Legacy Assertions ──
  it("ADV.1: default mount strictly preserves all legacy assertions and default POS state", () => {
    const { container } = render(<HeroDashboardCard />);

    // 1. Legacy assertions
    expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();
    expect(screen.getByText(/TO PAY/i)).toBeInTheDocument();
    expect(screen.getByText(/CASH & BANK/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Reconciled Activity/i)).toBeInTheDocument();
    expect(screen.getByText(/CredSmart v1\.1\.4/i)).toBeInTheDocument();
    expect(screen.getByText(/• LIVE RECONCILED/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Synced Cloud Ledger/i)).toBeInTheDocument();

    // 2. POS status badges
    expect(screen.getByText(/POS Terminal Active/i)).toBeInTheDocument();
    expect(screen.getByText(/🛒 POS Active/i)).toBeInTheDocument();

    // 3. POS sidebar items
    expect(screen.getByText("POS Billing")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Items / Inventory")).toBeInTheDocument();
    expect(screen.getByText("Purchases")).toBeInTheDocument();

    // 4. CRM items should NOT be present initially
    expect(screen.queryByText(/Real-Time Staff Attendance & GPS Geofence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rajesh Kumar/i)).not.toBeInTheDocument();
  });

  // ── TEST 2: defaultSuite="crm" Direct Mount Handling ──
  it("ADV.2: supports direct mount into Workforce CRM when defaultSuite='crm'", () => {
    render(<HeroDashboardCard defaultSuite="crm" />);

    // CRM elements must be present immediately
    expect(screen.getByText(/Real-Time Staff Attendance & GPS Geofence/i)).toBeInTheDocument();
    expect(screen.getByText(/Geofence Engine Active/i)).toBeInTheDocument();
    expect(screen.getByText(/👥 CRM Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Rajesh Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/Pooja Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/Vikram Singh/i)).toBeInTheDocument();

    // POS elements must NOT be present
    expect(screen.queryByText(/TO COLLECT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/POS Terminal Bill Cart/i)).not.toBeInTheDocument();
  });

  // ── TEST 3: Rapid Interactive Ping-Pong Toggle Stress ──
  it("ADV.3: withstands rapid alternating toggles between POS and CRM suites without DOM degradation", () => {
    render(<HeroDashboardCard />);

    const posToggle = screen.getByRole("button", { name: /Retail POS & Billing/i });
    const crmToggle = screen.getByRole("button", { name: /Workforce CRM/i });

    for (let i = 0; i < 5; i++) {
      // Toggle to CRM
      fireEvent.click(crmToggle);
      expect(screen.getByText(/Real-Time Staff Attendance & GPS Geofence/i)).toBeInTheDocument();
      expect(screen.getByText(/Field Task Dispatch/i)).toBeInTheDocument();
      expect(screen.queryByText(/POS Terminal Bill Cart/i)).not.toBeInTheDocument();

      // Toggle to POS
      fireEvent.click(posToggle);
      expect(screen.getByText(/POS Terminal Bill Cart/i)).toBeInTheDocument();
      expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();
      expect(screen.queryByText(/Real-Time Staff Attendance & GPS Geofence/i)).not.toBeInTheDocument();
    }
  });

  // ── TEST 4: Deep Workforce CRM Feature Verification ──
  it("ADV.4: verifies granular features in Workforce CRM view (attendance, GPS tags, field dispatch, kanban)", () => {
    render(<HeroDashboardCard defaultSuite="crm" />);

    // Top Summary Metrics
    expect(screen.getByText(/Staff On Duty/i)).toBeInTheDocument();
    expect(screen.getByText("8 / 10 Active")).toBeInTheDocument();
    expect(screen.getByText("GPS Present (8/10)")).toBeInTheDocument();

    expect(screen.getByText(/Field Tasks/i)).toBeInTheDocument();
    expect(screen.getByText("18 Done")).toBeInTheDocument();
    expect(screen.getByText("4 In Progress")).toBeInTheDocument();

    expect(screen.getByText(/Lead Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText("₹ 4,85,000")).toBeInTheDocument();

    expect(screen.getByText(/Daily Sales & Payroll/i)).toBeInTheDocument();
    expect(screen.getByText("₹ 84,200")).toBeInTheDocument();

    // Staff Attendance Records with GPS Geofence tags
    expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
    expect(screen.getByText(/Sales Executive/i)).toBeInTheDocument();
    expect(screen.getByText(/In 09:02 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/📍 Connaught Place Store \(4m\)/i)).toBeInTheDocument();
    expect(screen.getByText("Present")).toBeInTheDocument();

    expect(screen.getByText("Pooja Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Field Lead/i)).toBeInTheDocument();
    expect(screen.getByText(/In 09:15 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/📍 Sector 18 Dispatch Route/i)).toBeInTheDocument();
    expect(screen.getByText("Field Duty")).toBeInTheDocument();

    expect(screen.getByText("Vikram Singh")).toBeInTheDocument();
    expect(screen.getByText(/Counter Cashier/i)).toBeInTheDocument();
    expect(screen.getByText(/In 09:32 AM/i)).toBeInTheDocument();
    expect(screen.getByText(/📍 Counter #1 Terminal \(2m\)/i)).toBeInTheDocument();
    expect(screen.getByText("Late (12m)")).toBeInTheDocument();

    // Geofence accuracy pill
    expect(screen.getByText(/📍 100% Geofence Accuracy/i)).toBeInTheDocument();

    // Field Task Dispatch Board
    expect(screen.getByText(/Urgent Stock Delivery • Aggarwal Provisions/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Collection & Ledger Signoff/i)).toBeInTheDocument();
    expect(screen.getByText("₹ 24,500")).toBeInTheDocument();
    expect(screen.getByText("₹ 18,200")).toBeInTheDocument();

    // Lead Stage Kanban Pills
    expect(screen.getByText(/Lead Stage Kanban/i)).toBeInTheDocument();
    expect(screen.getByText("14 Inquiries")).toBeInTheDocument();
    expect(screen.getByText("6 Deals")).toBeInTheDocument();
    expect(screen.getByText(/Closed Won This Month:/i)).toBeInTheDocument();
    expect(screen.getByText("28 Deals (₹ 6.4L)")).toBeInTheDocument();
  });

  // ── TEST 5: Tabular Monospace Font Classes Audit ──
  it("ADV.5: audits numeric and monetary values to guarantee font-mono and tabular-nums compliance", () => {
    const { container } = render(<HeroDashboardCard />);

    // Metric Tile numbers in POS
    const kpiNumbers = container.querySelectorAll(".tabular-nums");
    expect(kpiNumbers.length).toBeGreaterThan(0);

    kpiNumbers.forEach((el) => {
      expect(el.className).toContain("font-mono");
      expect(el.className).toContain("tabular-nums");
    });
  });

  // ── TEST 6: Card Dimensions & 1px Hairline Border Conformance ──
  it("ADV.6: verifies outer container height constraint (max-h-[460px]), inner body (max-h-[370px]), and 1px hairline border", () => {
    const { container } = render(<HeroDashboardCard />);

    const outerCard = container.firstElementChild as HTMLElement;
    expect(outerCard).toBeInTheDocument();
    expect(outerCard.className).toContain("max-h-[460px]");
    expect(outerCard.className).toContain("rounded-2xl");
    expect(outerCard.className).toContain("border");
    expect(outerCard.className).toContain("border-slate-200/80");

    const innerBody = outerCard.querySelector(".max-h-\\[370px\\]");
    expect(innerBody).toBeInTheDocument();
    expect(innerBody?.className).toContain("min-h-[350px]");
  });

  // ── TEST 7: Zero Bloated Button Tokens Audit ──
  it("ADV.7: verifies that no button within HeroDashboardCard uses bloated button classes", () => {
    render(<HeroDashboardCard />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(5);

    buttons.forEach((btn) => {
      expect(btn.className).not.toContain("h-11");
      expect(btn.className).not.toContain("h-12");
      expect(btn.className).not.toContain("h-13");
      expect(btn.className).not.toContain("rounded-3xl");
      expect(btn.className).not.toContain("px-8");
    });
  });

  // ── TEST 8: Interactive POS Tender Buttons and Metric Highlights ──
  it("ADV.8: verifies tender selection and isometric metric tile selection change state correctly", () => {
    render(<HeroDashboardCard />);

    // Tender button toggle
    const upiTenderBtn = screen.getByRole("button", { name: /UPI F6/i });
    fireEvent.click(upiTenderBtn);
    expect(upiTenderBtn.className).toContain("bg-blue-600");
    expect(upiTenderBtn.className).toContain("text-white");

    const cardTenderBtn = screen.getByRole("button", { name: /Card F7/i });
    fireEvent.click(cardTenderBtn);
    expect(cardTenderBtn.className).toContain("bg-blue-600");
    expect(upiTenderBtn.className).not.toContain("bg-blue-600");

    // Metric Tile click
    const toCollectTile = screen.getByText(/Outstanding Due/i).closest("div[class*='cursor-pointer']");
    expect(toCollectTile).toBeInTheDocument();
    if (toCollectTile) {
      fireEvent.click(toCollectTile);
      expect(toCollectTile.className).toContain("border-blue-500");
    }
  });

  // ── TEST 9: Action Triggers & Optional onStartFree Resilience ──
  it("ADV.9: verifies onStartFree trigger fires when provided, and does not crash when omitted", () => {
    const handleStartFree = vi.fn();
    const { rerender } = render(<HeroDashboardCard onStartFree={handleStartFree} />);

    const billBtn = screen.getByRole("button", { name: /Bill/i });
    fireEvent.click(billBtn);
    expect(handleStartFree).toHaveBeenCalledTimes(1);

    // Rerender without callback
    rerender(<HeroDashboardCard />);
    const billBtn2 = screen.getByRole("button", { name: /Bill/i });
    expect(() => fireEvent.click(billBtn2)).not.toThrow();
  });

  // ── TEST 10: Sidebar Tab Interaction in Both Suites ──
  it("ADV.10: verifies sidebar tabs can be clicked without error in both POS and CRM suites", () => {
    render(<HeroDashboardCard />);

    // In POS suite, click "Sales" tab
    const salesTab = screen.getByRole("button", { name: /Sales/i });
    fireEvent.click(salesTab);
    expect(salesTab.className).toContain("bg-blue-50");
    expect(salesTab.className).toContain("text-blue-700");

    // Switch to CRM suite
    const crmToggle = screen.getByRole("button", { name: /Workforce CRM/i });
    fireEvent.click(crmToggle);

    // In CRM suite, click "Field Tasks" tab
    const dispatchTab = screen.getByRole("button", { name: /Field Tasks/i });
    fireEvent.click(dispatchTab);
    expect(dispatchTab.className).toContain("bg-blue-50");
    expect(dispatchTab.className).toContain("text-blue-700");
  });
});
