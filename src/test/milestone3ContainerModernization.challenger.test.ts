import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 3 Challenger 2: Dashboard, Parties & CRM HR Empiric Verification", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const dashboardPath = path.join(rootDir, "src/pages/Dashboard.tsx");
  const partiesPath = path.join(rootDir, "src/pages/Parties.tsx");
  const salaryPath = path.join(rootDir, "src/pages/crm/SalaryManagement.tsx");
  const attendancePath = path.join(rootDir, "src/pages/crm/Attendance.tsx");

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
      let gitDiffFiles = "";
      if (fs.existsSync(gitExe)) {
        gitDiffFiles = execSync(`"${gitExe}" diff 457ca2b~1 HEAD --name-only`, { cwd: rootDir, encoding: "utf8" });
      }

      for (const qFile of quarantineFiles) {
        expect(fs.existsSync(path.join(rootDir, qFile))).toBe(true);
        expect(gitDiffFiles).not.toContain(qFile);
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
        'className="min-w-[44px] min-h-[44px] w-11 h-11 p-0 rounded-lg flex items-center justify-center"'
      );
    });

    it("verifies desktop table view parity is maintained", () => {
      expect(content).toContain("hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin");
    });
  });

  describe("3. SalaryManagement.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(salaryPath, "utf8");

    it("verifies Tab 1 (Salary Profiles) mobile view uses divide-y container with flat rows", () => {
      expect(content).toContain(
        '<div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">'
      );
      expect(content).toContain(
        '<div key={p.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
      expect(content).not.toContain(
        '<CRMCard key={p.id} variant="default" className="p-4 space-y-3">'
      );
    });

    it("verifies Tab 1 Configure Profile button has touch target min-h-[44px] h-11", () => {
      expect(content).toContain(
        'className="w-full min-h-[44px] h-11 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"'
      );
    });

    it("verifies Tab 2 (Payroll Run) mobile view uses divide-y container with flat rows", () => {
      expect(content).toContain(
        '<div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
      expect(content).not.toContain(
        '<CRMCard key={item.id} variant="default" className="p-4 space-y-2">'
      );
    });

    it("verifies Tab 3 (Advances & Deductions) mobile view uses divide-y container with flat rows", () => {
      expect(content).toContain(
        '<div key={a.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
      expect(content).not.toContain(
        '<CRMCard key={a.id} variant="default" className="p-4 space-y-2">'
      );
    });

    it("verifies Tab 3 Approve and Reject action buttons have touch targets min-h-[44px] h-11", () => {
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 rounded-lg"'
      );
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 rounded-lg"'
      );
    });

    it("verifies desktop views are intact with CRMDataTable", () => {
      expect(content).toContain('<div className="hidden sm:block">');
      expect(content).toContain('<CRMDataTable');
    });
  });

  describe("4. Attendance.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(attendancePath, "utf8");

    it("verifies regularisation requests container uses divide-y hairlines", () => {
      expect(content).toContain(
        '<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">'
      );
    });

    it("verifies request row item is flat without individual card borders", () => {
      expect(content).toContain(
        'className="px-3.5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"'
      );
      expect(content).not.toContain(
        'className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4"'
      );
    });

    it("verifies regularisation Approve and Reject buttons have touch targets min-h-[44px] h-11", () => {
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"'
      );
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 rounded-lg"'
      );
    });
  });

  describe("5. Typography Scale Stress-Test (Zero Sub-11px Font Sizes)", () => {
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

    it("SalaryManagement.tsx has zero font classes below 11px", () => {
      const content = fs.readFileSync(salaryPath, "utf8");
      const matches = content.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("Attendance.tsx has zero font classes below 11px", () => {
      const content = fs.readFileSync(attendancePath, "utf8");
      const matches = content.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });
  });
});
