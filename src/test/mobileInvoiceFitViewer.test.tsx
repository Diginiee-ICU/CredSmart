import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileInvoiceFitViewer } from "@/components/invoices/mobile/MobileInvoiceFitViewer";

describe("MobileInvoiceFitViewer Unit & Ergonomics Suite", () => {
  it("renders children cleanly within the container", () => {
    render(
      <MobileInvoiceFitViewer title="Invoice Preview">
        <div data-testid="invoice-content">Sample Invoice Content</div>
      </MobileInvoiceFitViewer>
    );

    expect(screen.getByText("Invoice Preview")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-content")).toBeInTheDocument();
  });

  it("defaults to fit mode and provides a toggle to 1:1 view", () => {
    render(
      <MobileInvoiceFitViewer title="Tax Invoice">
        <div>Invoice Data</div>
      </MobileInvoiceFitViewer>
    );

    const toggleBtn = screen.getByRole("button", { name: /View 1:1 Scale/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("View 1:1");

    // Click to toggle to 1:1
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /Fit to Screen/i })).toBeInTheDocument();
    expect(screen.getByText("Fit Screen")).toBeInTheDocument();

    // Click again to snap back to fit
    fireEvent.click(screen.getByRole("button", { name: /Fit to Screen/i }));
    expect(screen.getByText("View 1:1")).toBeInTheDocument();
  });

  it("renders optional badges in the header bar", () => {
    render(
      <MobileInvoiceFitViewer
        title="Sales Invoice"
        badge={<span data-testid="test-badge">Theme: Classic</span>}
      >
        <div>Content</div>
      </MobileInvoiceFitViewer>
    );

    expect(screen.getByTestId("test-badge")).toBeInTheDocument();
  });
});
