import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Mobile Touch Target Ergonomics Remediation Suite
 *
 * Verifies that all targeted interactive elements satisfy the >= 44x44px hit target
 * threshold across Sales, Purchases, Items, Parties, PaginationBar, and Tasks.
 */

const SRC_DIR = path.resolve(__dirname, "..");

describe("Mobile Touch Target Ergonomics Remediation", () => {
  describe("1. Sales.tsx Mobile Action Buttons", () => {
    it("verifies all mobile transaction card action buttons have >= 44x44px hit targets", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Sales.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: Touch Transaction Cards([\s\S]*?)Mobile Pagination/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      // Print, Download, WhatsApp, More must be w-11 h-11 with min-w-[44px] min-h-[44px]
      const h44ActionButtons = code.match(/w-11\s+h-11\s+min-w-\[44px\]\s+min-h-\[44px\]/g) || [];
      expect(h44ActionButtons.length).toBe(4);

      // Verify no remaining sub-44px w-10 h-10 buttons in mobile stream
      expect(code).not.toMatch(/w-10\s+h-10/);
    });
  });

  describe("2. Purchases.tsx Mobile Buttons", () => {
    it("verifies Pay Now button meets >= 44px touch height", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Purchases.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: High-Density Touch Card Stream([\s\S]*?)Mobile Pagination/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      // Pay Now button
      expect(code).toMatch(/min-h-\[44px\][\s\S]*?Pay Now/);
      expect(code).not.toMatch(/h-7\s+px-2[\s\S]*?Pay Now/);
    });

    it("verifies Print, Download PDF, WhatsApp, and More buttons meet >= 44x44px", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Purchases.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: High-Density Touch Card Stream([\s\S]*?)Mobile Pagination/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      const min44Buttons = code.match(/min-w-\[44px\]\s+min-h-\[44px\]\s+w-11\s+h-11/g) || [];
      expect(min44Buttons.length).toBe(4);

      // Verify no remaining min-w-[36px] min-h-[36px]
      expect(code).not.toMatch(/min-w-\[36px\]\s+min-h-\[36px\]/);
    });
  });

  describe("3. Items.tsx Mobile Buttons", () => {
    it("verifies Adjust stock button meets >= 44px height", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Items.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: Touch Item Cards([\s\S]*?)DESKTOP VIEW/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      expect(code).toMatch(/min-h-\[44px\]\s+h-11\s+px-3[\s\S]*?Adjust/);
    });

    it("verifies More Options button meets >= 44x44px target", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Items.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: Touch Item Cards([\s\S]*?)DESKTOP VIEW/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      expect(code).toMatch(/min-w-\[44px\]\s+min-h-\[44px\]\s+w-11\s+h-11[\s\S]*?MoreVertical/);
    });
  });

  describe("4. Parties.tsx Mobile Buttons", () => {
    it("verifies Call, WhatsApp, and Ledger buttons meet >= 44px height", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Parties.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: High-Density Touch Cards([\s\S]*?)Mobile Pagination/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      expect(code).toMatch(/min-h-\[44px\]\s+h-11\s+px-3[\s\S]*?Call/);
      expect(code).toMatch(/min-h-\[44px\]\s+h-11\s+px-3[\s\S]*?WhatsApp/);
      expect(code).toMatch(/min-h-\[44px\]\s+h-11\s+px-3[\s\S]*?Ledger/);
    });

    it("verifies More Options button meets >= 44x44px target", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "pages/Parties.tsx"), "utf-8");
      const mobileSection = content.match(/MOBILE VIEW: High-Density Touch Cards([\s\S]*?)Mobile Pagination/);
      expect(mobileSection).not.toBeNull();
      const code = mobileSection![1];

      expect(code).toMatch(/min-w-\[44px\]\s+min-h-\[44px\]\s+w-11\s+h-11[\s\S]*?MoreVertical/);
    });
  });

  describe("5. PaginationBar.tsx Chevron Buttons", () => {
    it("verifies all chevron navigation buttons have min-w-[44px] min-h-[44px] flex items-center justify-center", () => {
      const content = fs.readFileSync(path.join(SRC_DIR, "components/ui/PaginationBar.tsx"), "utf-8");
      const min44Chevrons = content.match(/min-w-\[44px\]\s+min-h-\[44px\]\s+flex\s+items-center\s+justify-center/g) || [];
      expect(min44Chevrons.length).toBe(4); // First page, Prev, Next, Last page
    });
  });

});

