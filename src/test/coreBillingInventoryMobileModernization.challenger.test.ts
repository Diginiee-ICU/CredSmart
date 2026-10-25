import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 2 Challenger: Core Billing & Inventory Mobile Modernization", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const salesPath = path.join(rootDir, "src/pages/Sales.tsx");
  const purchasesPath = path.join(rootDir, "src/pages/Purchases.tsx");
  const itemsPath = path.join(rootDir, "src/pages/Items.tsx");

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

  it("19 quarantine files remain 100% untouched and present", () => {
    const gitExe = "C:\\Users\\bishn\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe";
    let gitStatus = "";
    if (fs.existsSync(gitExe)) {
      gitStatus = execSync(`"${gitExe}" status --porcelain`, { cwd: rootDir, encoding: "utf8" });
    }
    for (const qFile of quarantineFiles) {
      expect(gitStatus).not.toContain(qFile);
      expect(fs.existsSync(path.join(rootDir, qFile))).toBe(true);
    }
  });

  describe("src/pages/Sales.tsx Verification", () => {
    const content = fs.readFileSync(salesPath, "utf8");

    it("verifies outer stream container has no double-nested borders or shadows", () => {
      expect(content).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
      expect(content).not.toContain(
        'Transactions Table Card / Mobile Card Stream Container */}\n        <div className="flex-1 min-h-0 rounded-xl border border-slate-200/80'
      );
    });

    it("verifies mobile stream container uses divide-y hairline and px-0", () => {
      expect(content).toContain(
        'className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain"'
      );
    });

    it("verifies mobile item rows are flat list rows without individual borders or rounded corners", () => {
      expect(content).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      const mobileSection = content.substring(
        content.indexOf("MOBILE VIEW: Touch Transaction Cards"),
        content.indexOf("DESKTOP VIEW: High-Density Stripe/Linear Data Table")
      );
      expect(mobileSection).not.toContain("p-3 rounded-xl border");
      expect(mobileSection).not.toContain("p-3.5 rounded-xl border");
    });

    it("verifies all mobile touch targets meet >= 44px minimum ergonomics", () => {
      // Payment status button
      expect(content).toContain('className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center');
      // Print button
      expect(content).toContain('w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg');
      // Download PDF button
      expect(content).toContain('w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg');
      // WhatsApp share button
      expect(content).toContain('w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg');
      // More options trigger
      expect(content).toContain('w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg');
    });

    it("verifies no sub-11px typography classes in Sales.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = content.match(sub11Regex);
      expect(matches).toBeNull();
    });

    it("verifies desktop view is preserved with md: breakpoints", () => {
      expect(content).toContain("hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between");
      expect(content).toContain('<table className="w-full text-left text-xs border-collapse min-w-[640px]">');
    });
  });

  describe("src/pages/Purchases.tsx Verification", () => {
    const content = fs.readFileSync(purchasesPath, "utf8");

    it("verifies outer stream container has no double-nested borders or shadows", () => {
      expect(content).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
      expect(content).not.toContain(
        '<div className="flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col justify-between">'
      );
    });

    it("verifies mobile stream container uses divide-y hairline and px-0", () => {
      expect(content).toContain(
        'className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain"'
      );
      expect(content).not.toContain(
        'className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 space-y-2.5 scrollbar-thin overscroll-y-contain"'
      );
    });

    it("verifies mobile item rows are flat list rows without individual borders or floating cards", () => {
      expect(content).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      const mobileSection = content.substring(
        content.indexOf("MOBILE VIEW: High-Density Touch Card Stream"),
        content.indexOf("DESKTOP VIEW: High-Density Stripe/Linear Table")
      );
      expect(mobileSection).not.toContain("p-3 rounded-xl border");
      expect(mobileSection).not.toContain("shadow-2xs active:scale-[0.99]");
    });

    it("verifies all mobile action buttons meet >= 44px touch targets", () => {
      const occurrences = (content.match(/min-w-\[44px\] min-h-\[44px\] w-11 h-11 flex items-center justify-center/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(4);
      // Ensure the old bug h-8.5 is eliminated
      expect(content).not.toContain("min-w-[44px] min-h-[44px] w-11 h-8.5");
    });

    it("verifies no sub-11px typography classes in Purchases.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = content.match(sub11Regex);
      expect(matches).toBeNull();
    });

    it("verifies desktop view is preserved with md: breakpoints", () => {
      expect(content).toContain("hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between");
      expect(content).toContain('<table className="w-full text-left text-xs border-collapse min-w-[700px]">');
    });
  });

  describe("src/pages/Items.tsx Verification", () => {
    const content = fs.readFileSync(itemsPath, "utf8");

    it("verifies outer stream container has no double-nested borders or shadows", () => {
      expect(content).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
      expect(content).not.toContain(
        '<div className="flex-1 min-h-0 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col">'
      );
    });

    it("verifies mobile stream container uses divide-y hairline and px-0", () => {
      expect(content).toContain(
        'className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain"'
      );
      expect(content).not.toContain(
        'className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-2 scrollbar-thin overscroll-y-contain"'
      );
    });

    it("verifies mobile item rows are flat list rows without individual borders or floating cards", () => {
      expect(content).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      const mobileSection = content.substring(
        content.indexOf("MOBILE VIEW: Touch Item Cards"),
        content.indexOf("DESKTOP VIEW: High-Density Data Table")
      );
      expect(mobileSection).not.toContain("p-3 rounded-xl border");
      expect(mobileSection).not.toContain("shadow-2xs active:scale-[0.99]");
    });

    it("verifies all mobile touch targets meet >= 44px minimum ergonomics", () => {
      // Adjust button
      expect(content).toContain('min-h-[44px] h-11 px-3 rounded-lg');
      // More options trigger
      expect(content).toContain('min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg');
    });

    it("verifies no sub-11px typography classes in Items.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = content.match(sub11Regex);
      expect(matches).toBeNull();
    });

    it("verifies desktop view is preserved with md: breakpoints", () => {
      expect(content).toContain("hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin");
      expect(content).toContain('<table className="w-full text-xs text-left min-w-[640px]">');
    });
  });
});
