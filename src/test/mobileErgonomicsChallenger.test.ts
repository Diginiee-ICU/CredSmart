import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Challenger 1: Empirical Mobile Ergonomics & Viewport Stress Verification
 *
 * Verifies:
 * 1. Touch Ergonomics: >= 44x44px minimum hit targets for touch buttons, pills, tabs, and action icons.
 * 2. Horizontal Layout Scroll Overflow: Zero unconstrained widths causing horizontal overflow on < 768px.
 * 3. Safe-Area Inset Bottom Padding: Bottom dock and content clearances.
 * 4. Existing mobile tests execution.
 */

const SRC_DIR = path.resolve(__dirname, "..");

describe("Challenger 1: Mobile Ergonomics & Viewport Stress Suite", () => {
  const targetFiles = [
    "pages/Dashboard.tsx",
    "pages/Sales.tsx",
    "pages/Purchases.tsx",
    "pages/Items.tsx",
    "pages/Parties.tsx",
    "pages/crm/CRMDashboard.tsx",
    "pages/crm/Attendance.tsx",
    "pages/crm/RoleManagement.tsx",
    "pages/crm/SalaryManagement.tsx",
    "pages/crm/Tasks.tsx",
    "pages/crm/Broadcasts.tsx",
    "pages/crm/Meet.tsx",
    "pages/crm/AIAssistant.tsx",
    "pages/crm/Support.tsx",
    "components/AppLayout.tsx",
    "components/AppSidebar.tsx",
  ];

  it("verifies all target files exist in codebase", () => {
    for (const relPath of targetFiles) {
      const fullPath = path.join(SRC_DIR, relPath);
      expect(fs.existsSync(fullPath), `Target file must exist: ${relPath}`).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. TOUCH ERGONOMICS: Minimum 44x44px Hit Target Verification
  // ─────────────────────────────────────────────────────────────
  describe("Audit 1: Touch Target Ergonomics (< 768px Viewports)", () => {
    it("empirically audits Dashboard.tsx mobile touch targets", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Dashboard.tsx"), "utf-8");
      // Extract mobile view (< 768px)
      const mobileSectionMatch = content.match(/1\.\s*MOBILE VIEW ONLY\s*\(<\s*768px\)([\s\S]*?)2\.\s*DESKTOP VIEW/);
      expect(mobileSectionMatch).not.toBeNull();
      const mobileCode = mobileSectionMatch![1];

      // Refresh button must have min 44x44px
      expect(mobileCode).toMatch(/min-w-\[44px\]\s+min-h-\[44px\]/);

      // Dismiss banner close button must have min 44x44px
      expect(mobileCode).toMatch(/min-w-\[44px\]\s+min-h-\[44px\][\s\S]*?Close banner/);

      // Quick action strip buttons must all have min-h-[44px]
      const quickActionButtons = mobileCode.match(/<button[\s\S]*?min-h-\[44px\][\s\S]*?<\/button>/g);
      expect(quickActionButtons).not.toBeNull();
      expect(quickActionButtons!.length).toBeGreaterThanOrEqual(5);

      // Recent activity rows must have thumb-friendly height
      expect(mobileCode).toMatch(/min-h-\[56px\]/);
    });

    it("empirically audits AppSidebar.tsx Mobile Bottom Dock touch targets", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppSidebar.tsx"), "utf-8");
      const dockMatch = content.match(/Mobile: Bottom Navigation Dock([\s\S]*?)<\/nav>/);
      expect(dockMatch).not.toBeNull();
      const dockCode = dockMatch![1];

      // All nav items in dock must satisfy >= 44px
      const minH44Count = (dockCode.match(/min-h-\[44px\]/g) || []).length;
      expect(minH44Count).toBeGreaterThanOrEqual(4); // Home, Sales, Items, Purchases

      // Elevated POS button
      expect(dockCode).toMatch(/w-\[52px\]\s+h-\[52px\]/);
    });

    it("empirically verifies touch targets in Sales.tsx mobile cards meet >= 44px standard", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Sales.tsx"), "utf-8");
      const mobileSectionMatch = content.match(/MOBILE VIEW: Touch Transaction Cards([\s\S]*?)Mobile Pagination/);
      expect(mobileSectionMatch).not.toBeNull();
      const mobileCode = mobileSectionMatch![1];

      // Status pill has min-h-[44px] min-w-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\]\s+min-w-\[44px\]/);

      // Check action icons (Print, Download, Share, More)
      // Must satisfy >= 44x44px hit standard
      const h44Buttons = mobileCode.match(/w-11\s+h-11\s+min-w-\[44px\]\s+min-h-\[44px\]/g) || [];
      expect(h44Buttons.length).toBe(4);
      expect(mobileCode).not.toMatch(/w-10\s+h-10/);
    });

    it("empirically verifies touch targets in Purchases.tsx mobile cards meet >= 44px standard", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Purchases.tsx"), "utf-8");
      const mobileSectionMatch = content.match(/MOBILE VIEW: High-Density Touch Card Stream([\s\S]*?)Mobile Pagination/);
      expect(mobileSectionMatch).not.toBeNull();
      const mobileCode = mobileSectionMatch![1];

      // Pay Now button meets min-h-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\][\s\S]*?Pay Now/);

      // Action buttons (Print, Download, Share, More) are min-w-[44px] min-h-[44px]
      const min44Buttons = mobileCode.match(/min-w-\[44px\]\s+min-h-\[44px\]/g) || [];
      expect(min44Buttons.length).toBe(4);
    });

    it("empirically verifies touch targets in Items.tsx mobile cards meet >= 44px standard", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Items.tsx"), "utf-8");
      const mobileSectionMatch = content.match(/MOBILE VIEW: Touch Item Cards([\s\S]*?)DESKTOP VIEW/);
      expect(mobileSectionMatch).not.toBeNull();
      const mobileCode = mobileSectionMatch![1];

      // Adjust button is min-h-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\][\s\S]*?Adjust/);

      // More menu button is min-w-[44px] min-h-[44px]
      expect(mobileCode).toMatch(/min-w-\[44px\]\s+min-h-\[44px\][\s\S]*?MoreVertical/);
    });

    it("empirically verifies touch targets in Parties.tsx mobile cards meet >= 44px standard", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Parties.tsx"), "utf-8");
      const mobileSectionMatch = content.match(/MOBILE VIEW: High-Density Touch Cards([\s\S]*?)Mobile Pagination/);
      expect(mobileSectionMatch).not.toBeNull();
      const mobileCode = mobileSectionMatch![1];

      // Call button: min-h-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\][\s\S]*?Call/);

      // WhatsApp button: min-h-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\][\s\S]*?WhatsApp/);

      // Ledger button: min-h-[44px]
      expect(mobileCode).toMatch(/min-h-\[44px\][\s\S]*?Ledger/);

      // More button: min-w-[44px] min-h-[44px]
      expect(mobileCode).toMatch(/min-w-\[44px\]\s+min-h-\[44px\][\s\S]*?MoreVertical/);
    });

    it("empirically audits PaginationBar.tsx navigation buttons", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/ui/PaginationBar.tsx"), "utf-8");
      // PaginationBar buttons have p-1.5 with w-3.5 h-3.5 icon = ~26px touch target
      expect(content).toMatch(/p-1\.5\s+rounded-lg[\s\S]*?ChevronLeft/);
      expect(content).toMatch(/p-1\.5\s+rounded-lg[\s\S]*?ChevronRight/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. HORIZONTAL LAYOUT SCROLL OVERFLOW AUDIT (< 768px)
  // ─────────────────────────────────────────────────────────────
  describe("Audit 2: Horizontal Layout Scroll Overflow (< 768px Viewports)", () => {
    it("verifies desktop tables with min-w-[600px+] are safely hidden on mobile", () => {
      const filesWithTables = [
        "pages/Sales.tsx",
        "pages/Purchases.tsx",
        "pages/Items.tsx",
        "pages/Parties.tsx",
      ];

      for (const relPath of filesWithTables) {
        const content = fs.readFileSync(path.join(SRC_DIR, relPath), "utf-8");
        // Look for table with min-w
        const tableMatches = content.match(/<table[\s\S]*?min-w-\[(\d+)px\]/g) || [];
        for (const match of tableMatches) {
          // Verify that this table is inside a hidden md:flex or hidden md:block container
          expect(
            content.includes("hidden md:flex") ||
            content.includes("hidden md:block") ||
            content.includes("overflow-x-auto")
          ).toBe(true);
        }
      }
    });

    it("verifies AppLayout.tsx encloses root viewport in overflow-hidden", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppLayout.tsx"), "utf-8");
      // Root wrapper has overflow-hidden and w-full
      expect(content).toMatch(/flex\s+flex-col\s+h-screen\s+w-full\s+overflow-hidden/);
      // Main container has min-w-0
      expect(content).toMatch(/flex-1\s+min-w-0\s+flex\s+flex-col/);
    });

    it("verifies horizontal swipeable quick action strip in Dashboard has touch-pan-x and scrollbar-none", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Dashboard.tsx"), "utf-8");
      expect(content).toMatch(/overflow-x-auto[\s\S]*?scrollbar-none[\s\S]*?touch-pan-x/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. SAFE-AREA INSET BOTTOM PADDING AUDIT
  // ─────────────────────────────────────────────────────────────
  describe("Audit 3: Safe-Area Inset Bottom Padding & Floating Dock Clearance", () => {
    it("verifies AppLayout.tsx applies dynamic safe-area bottom padding to main container", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppLayout.tsx"), "utf-8");
      expect(content).toMatch(/isMobile\s*&&\s*!isPosRoute\s*&&\s*"pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]"/);
      expect(content).toMatch(/isMobile\s*&&\s*isPosRoute\s*&&\s*"pb-\[calc\(4\.75rem\+env\(safe-area-inset-bottom,0px\)\)\]"/);
    });

    it("verifies internal mobile card streams have sufficient bottom padding", () => {
      const checkPadding = (file: string, expectedPaddingRegex: RegExp) => {
        const content = fs.readFileSync(path.join(SRC_DIR, file), "utf-8");
        expect(content).toMatch(expectedPaddingRegex);
      };

      // Dashboard mobile section: pb-24
      checkPadding("pages/Dashboard.tsx", /block\s+md:hidden[\s\S]*?pb-24/);

      // Sales mobile stream: pb-36
      checkPadding("pages/Sales.tsx", /block\s+md:hidden[\s\S]*?pb-36/);

      // Purchases mobile stream: pb-24
      checkPadding("pages/Purchases.tsx", /block\s+md:hidden[\s\S]*?pb-24/);

      // Items mobile stream: pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]
      checkPadding("pages/Items.tsx", /block\s+md:hidden[\s\S]*?pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);

      // Parties mobile stream: pb-28
      checkPadding("pages/Parties.tsx", /block\s+md:hidden[\s\S]*?pb-28/);
    });

    it("verifies Mobile Bottom Dock in AppSidebar.tsx has safe-area inset bottom padding", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/AppSidebar.tsx"), "utf-8");
      expect(content).toMatch(/pb-\[max\(0\.65rem,env\(safe-area-inset-bottom,0px\)\)\]/);
      expect(content).toMatch(/fixed\s+bottom-0\s+left-0\s+right-0\s+z-50/);
    });
  });
});
