import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 1 Challenger 2: CRM Roles & Tasks Deep Empirical & Adversarial Verification", () => {
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

  it("19 protected quarantine files must be completely untouched and existing", () => {
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

  describe("RoleManagement.tsx Class Architecture & Touch Targets", () => {
    const roleContent = fs.readFileSync(roleManagementPath, "utf8");

    it("uses clean divide-y container on mobile and multi-column grid on desktop", () => {
      expect(roleContent).toContain(
        "divide-y divide-slate-100 dark:divide-slate-800/60 sm:divide-y-0 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-3"
      );
    });

    it("verifies mobile flat row classes, eliminating individual borders and shadows", () => {
      expect(roleContent).toContain(
        "px-3.5 py-3 flex items-center justify-between gap-3 min-h-[44px] transition-colors sm:rounded-xl sm:border sm:p-3"
      );
    });

    it("verifies dark mode color tokens are complete for both states", () => {
      // Super admin disabled state
      expect(roleContent).toContain("bg-slate-50/70 dark:bg-slate-800/40 sm:border-slate-200/80 cursor-default");
      // Interactive editable state
      expect(roleContent).toContain(
        "bg-white dark:bg-slate-900 sm:border-slate-200 hover:border-slate-300 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
      );
      // Allowed checked state
      expect(roleContent).toContain("bg-blue-50/25 dark:bg-blue-950/20 sm:border-blue-200");
    });

    it("verifies minimum 44px touch targets on mobile rows", () => {
      expect(roleContent).toMatch(/min-h-\[44px\]/);
    });

    it("strictly prohibits sub-11px typography classes in RoleManagement.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = roleContent.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("preserves critical business handlers and states", () => {
      expect(roleContent).toContain("handleToggleAction(mod.id, act.id)");
      expect(roleContent).toContain("selectedRole.is_super_admin");
      expect(roleContent).toContain("matrixState[key]");
      expect(roleContent).toContain("isSuperAdminOrOwner");
    });
  });

  describe("Tasks.tsx Class Architecture & Touch Targets", () => {
    const tasksContent = fs.readFileSync(tasksPath, "utf8");

    it("uses divide-y container for Kanban column tasks on mobile", () => {
      expect(tasksContent).toContain(
        "divide-y divide-slate-100 dark:divide-slate-800/60 md:divide-y-0 md:space-y-2.5 flex-1 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent rounded-xl md:rounded-none border border-slate-200/80 dark:border-slate-800 md:border-0 overflow-hidden md:overflow-visible"
      );
    });

    it("flattens mobile task item cards and preserves desktop card borders and shadows", () => {
      expect(tasksContent).toContain(
        "px-3.5 py-3 md:p-3.5 space-y-2 md:space-y-2.5 bg-white dark:bg-slate-900 md:rounded-xl md:border md:border-slate-200/80 md:dark:border-slate-800 md:shadow-2xs hover:shadow-xs transition-all"
      );
    });

    it("ensures Kanban column header and empty state responsive classes are intact", () => {
      expect(tasksContent).toContain(
        "flex flex-col rounded-xl md:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2 sm:p-3 min-h-0 md:min-h-[380px]"
      );
      expect(tasksContent).toContain(
        "py-6 md:h-28 text-center md:flex md:items-center md:justify-center md:rounded-xl md:border md:border-dashed md:border-slate-200 md:dark:border-slate-800 text-xs text-slate-400"
      );
    });

    it("enforces minimum 44px touch targets on all interactive task action buttons", () => {
      const buttonClasses = [
        'min-h-[44px] h-11 px-3 flex items-center text-[11px] text-blue-600 hover:bg-blue-50 font-semibold',
        'min-h-[44px] h-11 px-3 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-semibold',
        'min-h-[44px] h-11 px-2.5 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-medium',
        'min-h-[44px] h-11 px-3 flex items-center text-[11px] text-emerald-600 hover:bg-emerald-50 font-bold',
      ];
      for (const btnClass of buttonClasses) {
        expect(tasksContent).toContain(btnClass);
      }
    });

    it("strictly prohibits sub-11px typography classes in Tasks.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = tasksContent.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("preserves critical task action handlers and logic", () => {
      expect(tasksContent).toContain('handleMoveStatus(task.id, "in_progress")');
      expect(tasksContent).toContain('handleMoveStatus(task.id, "review")');
      expect(tasksContent).toContain('handleOpenRevision(task)');
      expect(tasksContent).toContain('handleApproveTask(task.id)');
    });
  });
});
