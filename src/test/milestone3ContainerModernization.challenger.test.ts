import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 3 Challenger 2: Dashboard, Parties & CRM HR Empiric Verification", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const dashboardPath = path.join(rootDir, "src/pages/Dashboard.tsx");
  const partiesPath = path.join(rootDir, "src/pages/Parties.tsx");

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

  describe("Quarantine Invariance Check", () => {
    it("all 19 protected quarantine files must exist and remain completely untouched in git diff", () => {
      const gitExe = "C:\\Users\\bishn\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe";
      let gitStatus = "";
      if (fs.existsSync(gitExe)) {
        gitStatus = execSync(`"${gitExe}" status --porcelain`, { cwd: rootDir, encoding: "utf8" });
      }

      for (const qFile of quarantineFiles) {
        expect(fs.existsSync(path.join(rootDir, qFile))).toBe(true);
        expect(gitStatus).not.toContain(qFile);
      }
    });
  });

  describe("1. Dashboard.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(dashboardPath, "utf8");

    it("verifies mobile transactions container uses a single divide-y container", () => {
      expect(content).toContain(
        '<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">'
      );
    });

    it("verifies transaction item row is flat and touch-compliant (min-h-[56px] >= 44px)", () => {
      expect(content).toContain(
        'className="px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/60 transition-colors cursor-pointer touch-manipulation"'
      );
    });

    it("verifies no floating box borders or individual shadows exist on mobile transaction items", () => {
      expect(content).not.toContain(
        'className="p-3 min-h-[56px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80'
      );
    });

    it("verifies desktop view parity is maintained", () => {
      expect(content).toContain("hidden md:flex flex-col space-y-4");
    });
  });

  describe("2. Parties.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(partiesPath, "utf8");

    it("verifies mobile party stream uses edge-to-edge divide-y hairlines without outer p-2.5 space-y-2.5", () => {
      expect(content).toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-28 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">'
      );
      expect(content).not.toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">'
      );
    });

    it("verifies party row item is flat without individual borders or floating shadows", () => {
      expect(content).toContain('"px-3.5 py-3 transition-colors bg-white dark:bg-slate-900 space-y-2.5"');
      expect(content).not.toContain(
        '"p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs active:scale-[0.99]"'
      );
    });

    it("verifies Call button touch target is min-h-[44px] h-11", () => {
      expect(content).toMatch(/href=\{`tel:\$\{party\.phone\}`\}[\s\S]*?min-h-\[44px\] h-11/);
    });

    it("verifies WhatsApp button touch target is min-h-[44px] h-11", () => {
      expect(content).toMatch(/title="Chat on WhatsApp"[\s\S]*?min-h-\[44px\] h-11/);
    });

    it("verifies Ledger button touch target is min-h-[44px] h-11", () => {
      expect(content).toMatch(/navigate\(`\/customers\/\$\{party\.id\}\/ledger`\)[\s\S]*?min-h-\[44px\] h-11/);
    });

    it("verifies More menu button touch target is min-w-[44px] min-h-[44px] w-11 h-11", () => {
      expect(content).toContain(
        'min-w-[44px] min-h-[44px] w-11 h-11 p-0 rounded-lg flex items-center justify-center'
      );
    });

    it("verifies desktop table view parity is maintained", () => {
      expect(content).toContain("hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin");
    });
  });

  describe("3. Typography Scale Stress-Test (Zero Sub-11px Font Sizes)", () => {
    const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;

    it("Dashboard.tsx has zero font classes below 11px", () => {
      const content = fs.readFileSync(dashboardPath, "utf8");
      const matches = content.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("Parties.tsx has zero font classes below 11px", () => {
      const content = fs.readFileSync(partiesPath, "utf8");
      const matches = content.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });
  });
});
