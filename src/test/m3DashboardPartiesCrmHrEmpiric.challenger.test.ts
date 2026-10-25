import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 3 Challenger 1: Dashboard, Parties & CRM HR Empiric Verification", () => {
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

  it("19 protected quarantine files must be completely untouched and existing on disk", () => {
    const gitExe = "C:\\Users\\bishn\\AppData\\Local\\GitHubDesktop\\app-3.6.7\\resources\\app\\git\\cmd\\git.exe";
    let gitStatus = "";
    if (fs.existsSync(gitExe)) {
      gitStatus = execSync(`"${gitExe}" status --porcelain`, { cwd: rootDir, encoding: "utf8" });
    }
    for (const file of quarantineFiles) {
      expect(gitStatus).not.toContain(file);
      expect(fs.existsSync(path.join(rootDir, file))).toBe(true);
    }
  });

  describe("Dashboard.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(dashboardPath, "utf8");

    it("verifies mobile recent activity uses single outer container with divide-y", () => {
      expect(content).toContain(
        '<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">'
      );
    });

    it("verifies recent activity rows are flat with no individual border or shadow-2xs", () => {
      expect(content).toContain(
        'className="px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/60 transition-colors cursor-pointer touch-manipulation"'
      );
    });

    it("verifies touch target is >= 44px (min-h-[56px])", () => {
      expect(content).toMatch(/min-h-\[56px\]/);
    });

    it("verifies no typography below 11px", () => {
      const sub11Matches = content.match(/text-\[(?:[0-9]|10)px\]/g);
      expect(sub11Matches).toBeNull();
    });

    it("verifies desktop view is preserved", () => {
      expect(content).toContain('hidden md:flex flex-col space-y-4');
      expect(content).toContain('LATEST INVOICES &amp; TRANSACTIONS');
    });
  });

  describe("Parties.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(partiesPath, "utf8");

    it("verifies mobile stream uses edge-to-edge divide-y container without outer item gaps", () => {
      expect(content).toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-28 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">'
      );
    });

    it("verifies party rows are flat without individual border or shadow-2xs", () => {
      expect(content).toContain(
        '"px-3.5 py-3 transition-colors bg-white dark:bg-slate-900 space-y-2.5"'
      );
    });

    it("verifies mobile quick action buttons meet >= 44px touch targets", () => {
      // Call and WhatsApp
      expect(content).toContain("min-h-[44px] h-11 px-3");
      // Ledger button
      expect(content).toContain('className="min-h-[44px] h-11 px-3 flex items-center text-[11px] font-semibold rounded-lg border-slate-200/80 dark:border-slate-700"');
      // MoreVertical action trigger
      expect(content).toContain('min-w-[44px] min-h-[44px] w-11 h-11 p-0 rounded-lg flex items-center justify-center');
    });

    it("verifies no typography below 11px", () => {
      const sub11Matches = content.match(/text-\[(?:[0-9]|10)px\]/g);
      expect(sub11Matches).toBeNull();
    });

    it("verifies desktop high-density table view is preserved", () => {
      expect(content).toContain(
        '<div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">'
      );
    });
  });

  describe("SalaryManagement.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(salaryPath, "utf8");

    it("verifies Tab 1 (Salary Profiles) uses divide-y container and flat rows", () => {
      expect(content).toContain(
        '<div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">'
      );
      expect(content).toContain(
        '<div key={p.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
    });

    it("verifies Tab 1 mobile button meets >= 44px touch target", () => {
      expect(content).toContain(
        'className="w-full min-h-[44px] h-11 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"'
      );
    });

    it("verifies Tab 2 (Payroll Run) uses divide-y container and flat rows", () => {
      expect(content).toContain(
        '<div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
    });

    it("verifies Tab 3 (Advances & Deductions) uses divide-y container and flat rows", () => {
      expect(content).toContain(
        '<div key={a.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">'
      );
    });

    it("verifies Tab 3 action buttons meet >= 44px touch targets", () => {
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 rounded-lg"'
      );
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 rounded-lg"'
      );
    });

    it("verifies no typography below 11px", () => {
      const sub11Matches = content.match(/text-\[(?:[0-9]|10)px\]/g);
      expect(sub11Matches).toBeNull();
    });

    it("verifies desktop CRMDataTable views are preserved", () => {
      expect(content).toContain('<div className="hidden sm:block">');
      expect(content).toContain('<CRMDataTable<CrmSalaryProfile>');
      expect(content).toContain('<CRMDataTable<PayslipComputedData>');
      expect(content).toContain('<CRMDataTable<CrmSalaryAdjustment>');
    });
  });

  describe("Attendance.tsx Architecture & Anti-Pattern Elimination", () => {
    const content = fs.readFileSync(attendancePath, "utf8");

    it("verifies Tab 4 (Regularisation Requests) uses divide-y container and flat rows", () => {
      expect(content).toContain(
        '<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">'
      );
      expect(content).toContain(
        'className="px-3.5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"'
      );
    });

    it("verifies Tab 4 action buttons meet >= 44px touch targets", () => {
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"'
      );
      expect(content).toContain(
        'className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 rounded-lg"'
      );
    });

    it("verifies no typography below 11px", () => {
      const sub11Matches = content.match(/text-\[(?:[0-9]|10)px\]/g);
      expect(sub11Matches).toBeNull();
    });

    it("verifies desktop and core shift card views are preserved", () => {
      expect(content).toContain("Shift Completed for Today");
      expect(content).toContain("<CRMDataTable");
    });
  });
});
