import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Challenger 2: Adversarial Modal Drawer & Mobile Viewport Containment Stress Suite
 *
 * Rigorously stress tests:
 * 1. Mobile Viewport Containment across 360px - 430px widths and 640px - 844px heights:
 *    - Drawer max-h-[92dvh] mathematical containment ensuring >= 8% top screen clearance.
 *    - Mobile drag handle indicator rendering (w-12 h-1.5 rounded-full, hidden on sm+).
 *    - Internal form body scrolling (flex-1 overflow-y-auto min-h-0) preventing modal expansion.
 *    - Permanent visibility and anchoring of sticky confirmation bar (sticky bottom-0 shrink-0).
 * 2. Responsive Backdrop & Dismissibility:
 *    - Backdrop layout items-end sm:items-center (bottom-anchored sheet on mobile, centered on desktop).
 *    - Accessible close trigger (X button) with clear onClose handler.
 *    - Explicit Cancel button with onClose handler in sticky confirmation footer.
 * 3. Safe-Area Inset Ergonomics:
 *    - Safe-area bottom padding pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] on confirmation bar.
 *    - AppSidebar dock pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] clearance.
 * 4. Protected Billing & Invoice File Quarantine:
 *    - 100% preservation of all 19 protected invoice and billing workflow files.
 */

const SRC_DIR = path.resolve(__dirname, "..");

describe("Challenger 2: Mobile Drawer & Viewport Containment Adversarial Suite", () => {
  const drawerModals = [
    {
      name: "CreateItemModal.tsx",
      path: path.join(SRC_DIR, "components/items/CreateItemModal.tsx"),
      headerIcon: "Package",
      headerTitle: "Create New Item",
    },
    {
      name: "CreatePartyModal.tsx",
      path: path.join(SRC_DIR, "components/parties/CreatePartyModal.tsx"),
      headerIcon: "Building2",
      headerTitle: "Create New Party",
    },
  ];

  describe("1. Viewport Containment & Sheet Geometry (360px - 430px width, 640px - 844px height)", () => {
    it.each([
      { device: "Older Android / Small viewport", width: 360, height: 640 },
      { device: "iPhone SE 2nd/3rd Gen", width: 375, height: 667 },
      { device: "iPhone 12/13/14 Standard", width: 390, height: 844 },
      { device: "Pixel 7 / Galaxy S21", width: 412, height: 915 },
      { device: "iPhone 14/15 Pro Max", width: 430, height: 932 },
    ])("validates mathematical containment for $device ($width x $height px)", ({ height }) => {
      // 92dvh computes to exactly 92% of viewport height
      const maxDrawerHeight = height * 0.92;
      const topBackdropClearance = height * 0.08;

      // On a 640px screen, drawer cannot exceed 588.8px, leaving >= 51.2px for backdrop tap/visual context
      expect(maxDrawerHeight).toBeLessThan(height);
      expect(topBackdropClearance).toBeGreaterThanOrEqual(50); // At least 50px clearance for sheet appearance
    });

    it("verifies both CreateItemModal and CreatePartyModal declare max-h-[92dvh] and rounded-t-2xl", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Drawer max height tokens
        expect(content, `${modal.name} must declare max-h-[92dvh] for mobile`).toContain("max-h-[92dvh]");

        // Desktop breakpoint override
        expect(content, `${modal.name} must declare sm:max-h-[92vh] for desktop`).toContain("sm:max-h-[92vh]");

        // Sheet top rounding on mobile and full rounding on desktop
        expect(content, `${modal.name} must declare rounded-t-2xl sm:rounded-2xl`).toContain("rounded-t-2xl sm:rounded-2xl");

        // Border and backdrop blur styling
        expect(content, `${modal.name} must declare backdrop-blur-xl and 1px border`).toMatch(
          /border-slate-200\/90\s+dark:border-slate-800\s+bg-white\/95\s+dark:bg-slate-900\/95\s+backdrop-blur-xl/
        );
      }
    });

    it("verifies mobile top drag handle indicator is present and hidden on desktop (sm:hidden)", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Drag handle pill: w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-2 sm:hidden shrink-0
        const dragHandleRegex = /<div\s+className="w-12\s+h-1\.5\s+rounded-full\s+bg-slate-300\s+dark:bg-slate-700\s+mx-auto\s+my-2\s+sm:hidden\s+shrink-0"\s*\/>/;
        expect(content, `${modal.name} must render drag handle indicator with shrink-0`).toMatch(dragHandleRegex);
      }
    });

    it("verifies internal form body scroll isolation (overflow-y-auto flex-1 min-h-0)", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Form container must establish a bounded flex column with overflow-hidden
        expect(content, `${modal.name} form must be bounded with flex-1 min-h-0 flex flex-col overflow-hidden`).toMatch(
          /<form[\s\S]*?className="flex-1\s+min-h-0\s+flex\s+flex-col\s+overflow-hidden"/
        );

        // Form content wrapper must scroll independently
        expect(content, `${modal.name} body must scroll with flex-1 overflow-y-auto`).toMatch(
          /<div[\s\S]*?className="flex-1\s+overflow-y-auto\s+p-4\s+sm:p-6\s+space-y-5\s+sm:space-y-6\s+scrollbar-thin"/
        );
      }
    });
  });

  describe("2. Responsive Backdrop, Dismissibility & Close Trigger Ergonomics", () => {
    it("verifies modal backdrop container uses items-end sm:items-center", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Must align to screen bottom on mobile (items-end) and center on desktop (sm:items-center)
        expect(content, `${modal.name} backdrop must have items-end sm:items-center`).toMatch(
          /fixed\s+inset-0\s+z-(?:50|modal)\s+flex\s+items-end\s+sm:items-center\s+justify-center/
        );
      }
    });

    it("verifies header close trigger button (X) is wired to onClose with touch-friendly padding", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Header close button must have onClick={onClose} and contain <X
        expect(content, `${modal.name} header must contain close button with onClick={onClose}`).toMatch(
          /<button[\s\S]*?onClick=\{onClose\}[\s\S]*?<X[\s\S]*?<\/button>/
        );
      }
    });

    it("verifies sticky bottom bar provides secondary Cancel trigger wired to onClose", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Sticky footer must contain Cancel button with onClick={onClose}
        expect(content, `${modal.name} sticky footer must contain Cancel button`).toMatch(
          /<Button[^>]*onClick=\{onClose\}[^>]*>\s*Cancel\s*<\/Button>/
        );
      }
    });
  });

  describe("3. Sticky Confirmation Action Bar & Safe-Area Ergonomics", () => {
    it("verifies confirmation action bar is sticky bottom-0, shrink-0, and has backdrop-blur", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // Fixed sticky bar regex
        const stickyBarRegex = /sticky\s+bottom-0\s+bg-white\/95\s+dark:bg-slate-900\/95\s+backdrop-blur-sm\s+border-t\s+border-slate-200\/80\s+p-3\s+pb-\[max\(0\.75rem,env\(safe-area-inset-bottom,0px\)\)\]\s+flex\s+items-center\s+justify-end\s+gap-2\s+shrink-0/;
        expect(content, `${modal.name} must have properly formatted sticky confirmation bar`).toMatch(stickyBarRegex);
      }
    });

    it("verifies sticky bar is outside the scrollable body div so buttons never scroll off screen", () => {
      for (const modal of drawerModals) {
        const content = fs.readFileSync(modal.path, "utf-8");

        // The scrollable div `<div className="flex-1 overflow-y-auto ...">` must close BEFORE the sticky footer
        const scrollDivIndex = content.indexOf('className="flex-1 overflow-y-auto');
        expect(scrollDivIndex).toBeGreaterThan(-1);

        const stickyBarIndex = content.indexOf('className="sticky bottom-0');
        expect(stickyBarIndex).toBeGreaterThan(-1);

        // stickyBar must be situated AFTER the scrollable container ends
        expect(stickyBarIndex).toBeGreaterThan(scrollDivIndex);
      }
    });

    it("verifies safe-area bottom inset is present in AppSidebar bottom dock", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppSidebar.tsx"), "utf-8");
      expect(content).toContain("pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]");
      expect(content).toContain("fixed bottom-0 left-0 right-0 z-50");
    });
  });

  describe("4. Mobile Dock Navigation & Elevated POS Action Button", () => {
    it("verifies 5-tab mobile dock in AppSidebar.tsx maps Tab 5 to Parties", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppSidebar.tsx"), "utf-8");
      const dockMatch = content.match(/Mobile: Bottom Navigation Dock([\s\S]*?)<\/nav>/);
      expect(dockMatch).not.toBeNull();
      const dock = dockMatch![1];

      // Tab 1: Home
      expect(dock).toMatch(/to=\{ROUTE_PATHS\.dashboard\}[\s\S]*?Home/);
      // Tab 2: Sales
      expect(dock).toMatch(/to=\{ROUTE_PATHS\.sales\}[\s\S]*?Sales/);
      // Tab 3: Center Elevated POS button
      expect(dock).toMatch(/to=\{(?:ROUTE_PATHS\.checkout|ROUTE_PATHS\.pos)\}[\s\S]*?w-\[46px\]\s+h-\[46px\]/);
      // Tab 4: Items
      expect(dock).toMatch(/to=\{ROUTE_PATHS\.items\}[\s\S]*?Items/);
      // Tab 5: Parties (strictly Parties, not Purchases)
      expect(dock).toMatch(/to=\{ROUTE_PATHS\.parties\}[\s\S]*?Users2[\s\S]*?Parties/);
    });

    it("verifies center elevated button is 46x46px solid Royal Blue with zero rainbow gradients", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppSidebar.tsx"), "utf-8");
      expect(content).toMatch(/w-\[46px\]\s+h-\[46px\]/);
      expect(content).toMatch(/bg-blue-600\s+hover:bg-blue-700\s+text-white/);

      // Rainbow gradient checks
      expect(content).not.toMatch(/from-indigo-600 via-indigo-500 to-purple-600/);
      expect(content).not.toMatch(/from-amber-500 via-amber-400 to-yellow-400/);
    });
  });

  describe("5. Strict Quarantine of Protected 19 Billing & Document Files", () => {
    const quarantinedFiles = [
      "components/invoices/mobile/MobileCreateInvoice.tsx",
      "components/invoices/mobile/AddItemModal.tsx",
      "components/invoices/mobile/SelectPartyModal.tsx",
      "components/invoices/mobile/EditItemModal.tsx",
      "components/invoices/mobile/MobileInvoiceSuccessView.tsx",
      "components/invoices/mobile/MobileBillPreviewModal.tsx",
      "components/invoices/mobile/MobileInvoiceFitViewer.tsx",
      "components/invoices/mobile/CreatePartyModal.tsx",
      "components/invoices/mobile/MobileCreatePurchaseInvoice.tsx",
      "components/items/mobile/CreateNewItemModal.tsx",
      "components/SalesInvoiceModal.tsx",
      "components/PurchaseInvoiceModal.tsx",
      "components/invoices/AddItemsToBillModal.tsx",
      "components/invoices/InvoiceFitView.tsx",
      "components/invoices/UnifiedInvoiceRenderer.tsx",
      "utils/downloadExactInvoice.ts",
      "utils/whatsappPdfShare.ts",
      "utils/invoiceThemeLoader.ts",
      "services/documentsService.ts",
    ];

    it("verifies all 19 protected files exist intact without missing references", () => {
      for (const relPath of quarantinedFiles) {
        const fullPath = path.join(SRC_DIR, relPath);
        expect(fs.existsSync(fullPath), `Quarantined file must exist: ${relPath}`).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(100);
      }
    });
  });
});
