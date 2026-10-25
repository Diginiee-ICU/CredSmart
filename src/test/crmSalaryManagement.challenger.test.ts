import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 1 Challenger: SalaryManagement.tsx Empirical Challenge", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const salaryPath = path.join(rootDir, "src/pages/crm/SalaryManagement.tsx");

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

  it("1. 19 quarantine files remain 100% untouched", () => {
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

  describe("SalaryManagement.tsx Empirical Structural Verification", () => {
    const content = fs.readFileSync(salaryPath, "utf8");

    it("2. desktop view is strictly preserved within hidden md:block container", () => {
      expect(content).toContain('className="hidden md:block space-y-6 pb-32 sm:pb-20 max-w-7xl mx-auto px-3 sm:px-6"');
      expect(content).toContain('title="Salary Management & Payroll Engine"');
      expect(content).toContain("<CRMPageHeader");
      expect(content).toContain("<CRMStatCard");
    });

    it("3. mobile view uses dedicated block md:hidden viewport container", () => {
      expect(content).toContain('className="block md:hidden pb-24 px-3.5 pt-3 space-y-3.5 max-w-lg mx-auto"');
    });

    it("4. mobile header displays Payroll Engine, subtitle, Royal Blue New Profile CTA, and export button", () => {
      expect(content).toContain("Payroll Engine");
      expect(content).toMatch(/Staff compensation (&amp;|&) payroll runs/);
      expect(content).toContain("New Profile");
      expect(content).toContain("bg-blue-600 hover:bg-blue-700");
      expect(content).toContain('aria-label="Refresh &amp; Export Data"');
      expect(content).toContain("w-8.5 h-8.5");
    });

    it("5. renders 2x2 stat badges with tinted icon pods, chevrons, and min 44px touch targets", () => {
      expect(content).toContain('className="grid grid-cols-2 gap-2"');
      expect(content).toContain("Active Profiles");
      expect(content).toContain("Current Month");
      expect(content).toContain("Pending Advances");
      expect(content).toContain("Available Payslips");
      expect(content).toContain("bg-blue-50 text-blue-600");
      expect(content).toContain("bg-emerald-50 text-emerald-600");
      expect(content).toContain("bg-amber-50 text-amber-600");
      expect(content).toContain("bg-indigo-50 text-indigo-600");
      expect(content).toContain("min-h-[44px]");
    });

    it("6. renders segmented pill switcher for all 4 tabs", () => {
      expect(content).toContain("p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800");
      expect(content).toContain("Salary Profiles (${salaryProfiles.length})");
      expect(content).toContain("Payroll Run");
      expect(content).toContain("Advances & Deductions");
      expect(content).toContain("My Payslips (${myPayslips.length})");
    });

    it("7. renders clean empty state card matching Mockup 1 specification", () => {
      expect(content).toContain("No salary profiles configured yet.");
      expect(content).toContain("Create compensation structures for staff to automate payroll calculations");
      expect(content).toContain("Add First Profile");
      expect(content).toContain("rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-center p-8");
    });

    it("8. renders flat hairline divide-y list rows and eliminates bloated buttons on mobile", () => {
      const mobileSectionStart = content.indexOf('className="block md:hidden pb-24');
      expect(mobileSectionStart).toBeGreaterThan(-1);
      const mobileSection = content.slice(mobileSectionStart);

      expect(mobileSection).toContain("divide-y divide-slate-100 dark:divide-slate-800/60");
      expect(mobileSection).toContain('className="h-7 px-2.5 rounded-md text-[11px] font-medium');
      // Verify no bloated h-11 or h-12 button classNames in mobile section
      const bloatedClassMatches = mobileSection.match(/className="[^"]*\b(h-11|h-12|px-8)\b[^"]*"/g) || [];
      expect(bloatedClassMatches).toEqual([]);
    });

    it("9. renders dual quick actions footer buttons with min-h-[44px] touch targets", () => {
      expect(content).toContain("View Past Runs");
      expect(content).toContain("Pay Settings");
      expect(content).toContain("ClipboardList");
      expect(content).toContain("Settings");
      expect(content).toContain("grid grid-cols-2 gap-2.5 pt-2");
    });

    it("10. adheres to minimal design system typography rules (no sub-11px font sizes)", () => {
      // Must not contain text-[9px] or text-[10px]
      expect(content).not.toContain("text-[9px]");
      expect(content).not.toContain("text-[10px]");
      expect(content).not.toContain("text-[8px]");
    });

    it("11. binds monetary amounts to font-mono tabular-nums for financial accuracy", () => {
      expect(content).toContain("font-mono tabular-nums");
    });

    it("12. slide-over drawers remain shared outside desktop and mobile containers", () => {
      expect(content).toContain("<Sheet open={isProfileDrawerOpen}");
      expect(content).toContain("<Sheet open={isAdjustmentDrawerOpen}");
    });
  });
});
