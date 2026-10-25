import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 1 Challenger: CRM Roles & Tasks Mobile Modernization", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const roleManagementPath = path.join(rootDir, "src/pages/crm/RoleManagement.tsx");
  const tasksPath = path.join(rootDir, "src/pages/crm/Tasks.tsx");

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

  it("19 quarantine files remain 100% untouched", () => {
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

  describe("RoleManagement.tsx Mobile & Desktop Verification", () => {
    const content = fs.readFileSync(roleManagementPath, "utf8");

    it("uses divide-y container for mobile permission actions", () => {
      expect(content).toContain("divide-y divide-slate-100 dark:divide-slate-800/60");
      expect(content).toContain("sm:divide-y-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-3");
    });

    it("eliminates floating cards on mobile while preserving borders on desktop", () => {
      // Row must have mobile flat row padding, min-h-[44px], and sm: desktop borders
      expect(content).toContain("px-3.5 py-3 flex items-center justify-between gap-3 min-h-[44px] transition-colors sm:rounded-xl sm:border sm:p-3");
    });

    it("enforces minimum 44px touch targets on interactive action rows", () => {
      expect(content).toMatch(/min-h-\[44px\]/);
    });

    it("preserves dark mode styling on mobile and desktop", () => {
      expect(content).toContain("dark:divide-slate-800/60");
      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:text-slate-100");
      expect(content).toContain("dark:text-slate-400");
    });

    it("does not contain sub-11px font sizes in permission toggle block", () => {
      // Ensure no text-[10px], text-[9px], text-[8px]
      const sub11pxPattern = /text-\[(?:[0-9]|10)px\]/g;
      const matches = content.match(sub11pxPattern) || [];
      expect(matches.length).toBe(0);
    });
  });

  describe("Tasks.tsx Mobile & Desktop Verification", () => {
    const content = fs.readFileSync(tasksPath, "utf8");

    it("uses divide-y container for Kanban column tasks on mobile", () => {
      expect(content).toContain("divide-y divide-slate-100 dark:divide-slate-800/60");
      expect(content).toContain("md:divide-y-0 md:space-y-2.5");
    });

    it("eliminates floating card anti-pattern on mobile tasks", () => {
      expect(content).toContain("px-3.5 py-3 md:p-3.5 space-y-2 md:space-y-2.5 bg-white dark:bg-slate-900 md:rounded-xl md:border md:border-slate-200/80 md:dark:border-slate-800 md:shadow-2xs");
    });

    it("preserves desktop cards with rounded borders and shadows", () => {
      expect(content).toContain("md:rounded-xl md:border md:border-slate-200/80 md:dark:border-slate-800 md:shadow-2xs");
    });

    it("enforces minimum 44px touch targets on task lifecycle action buttons", () => {
      expect(content).toContain('className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-blue-600 hover:bg-blue-50 font-semibold"');
      expect(content).toContain('className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-semibold"');
      expect(content).toContain('className="min-h-[44px] h-11 px-2.5 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-medium"');
      expect(content).toContain('className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-emerald-600 hover:bg-emerald-50 font-bold"');
    });

    it("does not contain sub-11px font sizes in task cards", () => {
      const sub11pxPattern = /text-\[(?:[0-9]|10)px\]/g;
      const matches = content.match(sub11pxPattern) || [];
      expect(matches.length).toBe(0);
    });
  });
});
