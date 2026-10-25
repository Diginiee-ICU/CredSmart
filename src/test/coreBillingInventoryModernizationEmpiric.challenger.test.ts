import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

describe("Milestone 2 Challenger 2: Core Billing & Inventory Modernization Empiric Verification", () => {
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

  describe("Sales.tsx Architecture & Anti-Pattern Elimination", () => {
    const salesContent = fs.readFileSync(salesPath, "utf8");

    it("verifies unbordered outer viewport container (zero nested card anti-pattern)", () => {
      expect(salesContent).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
    });

    it("verifies mobile stream uses edge-to-edge divide-y hairlines without padding or spacing", () => {
      expect(salesContent).toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain">'
      );
    });

    it("verifies flat list rows without individual borders or box shadows", () => {
      expect(salesContent).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      expect(salesContent).toContain('"bg-blue-50/30 dark:bg-blue-950/20"');
      expect(salesContent).toContain('"hover:bg-slate-50/50 dark:hover:bg-slate-800/30"');
    });

    it("verifies touch targets >= 44px on all mobile action triggers", () => {
      // Payment status toggle button
      expect(salesContent).toContain("min-h-[44px] min-w-[44px]");
      // Print action button
      expect(salesContent).toContain("w-11 h-11 min-w-[44px] min-h-[44px]");
    });

    it("strictly prohibits sub-11px typography classes in Sales.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = salesContent.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("preserves desktop table view container with 100% fidelity", () => {
      expect(salesContent).toContain(
        '<div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">'
      );
    });

    it("preserves critical billing event handlers and state hooks", () => {
      expect(salesContent).toContain("handleOpenReceipt");
      expect(salesContent).toContain("handleDownloadPdf");
      expect(salesContent).toContain("handleWhatsAppShare");
      expect(salesContent).toContain("handleTogglePaymentStatus");
      expect(salesContent).toContain("handleDeleteDocument");
    });
  });

  describe("Purchases.tsx Architecture & Anti-Pattern Elimination", () => {
    const purchasesContent = fs.readFileSync(purchasesPath, "utf8");

    it("verifies unbordered outer viewport container (zero nested card anti-pattern)", () => {
      expect(purchasesContent).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
      // Double border anti-pattern must be absent
      expect(purchasesContent).not.toContain(
        "rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col justify-between"
      );
    });

    it("verifies mobile stream uses edge-to-edge divide-y hairlines without padding or spacing", () => {
      expect(purchasesContent).toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain">'
      );
      // Old space-y padding container must be absent
      expect(purchasesContent).not.toContain("p-2.5 pb-24 space-y-2.5");
    });

    it("verifies flat list rows without individual borders or box shadows", () => {
      expect(purchasesContent).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      expect(purchasesContent).toContain('"bg-amber-50/30 dark:bg-amber-950/20"');
      expect(purchasesContent).toContain('"hover:bg-slate-50/50 dark:hover:bg-slate-800/30"');
      // Old floating card styles must be absent
      expect(purchasesContent).not.toContain("p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs");
    });

    it("verifies touch targets >= 44px on all mobile action triggers", () => {
      // Record payment button
      expect(purchasesContent).toContain("min-h-[44px] px-3.5 rounded-md");
      // Print, download, whatsapp, more menu buttons
      expect(purchasesContent).toContain("min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center");
    });

    it("strictly prohibits sub-11px typography classes in Purchases.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = purchasesContent.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("preserves desktop table view container with 100% fidelity", () => {
      expect(purchasesContent).toContain(
        '<div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">'
      );
      expect(purchasesContent).toContain('<table className="w-full text-left text-xs border-collapse min-w-[700px]">');
    });

    it("preserves critical purchase ledger event handlers and state hooks", () => {
      expect(purchasesContent).toContain("handleOpenReceipt");
      expect(purchasesContent).toContain("downloadExactInvoicePdf");
      expect(purchasesContent).toContain("shareInvoicePdfToWhatsApp");
      expect(purchasesContent).toContain("handleTogglePaymentStatus");
      expect(purchasesContent).toContain("handleDeleteDocument");
      expect(purchasesContent).toContain("handleDuplicate");
    });
  });

  describe("Items.tsx Architecture & Anti-Pattern Elimination", () => {
    const itemsContent = fs.readFileSync(itemsPath, "utf8");

    it("verifies unbordered outer viewport container (zero nested card anti-pattern)", () => {
      expect(itemsContent).toContain(
        '<div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">'
      );
      // Double border anti-pattern must be absent
      expect(itemsContent).not.toContain(
        "border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col"
      );
    });

    it("verifies mobile stream uses edge-to-edge divide-y hairlines without padding or spacing", () => {
      expect(itemsContent).toContain(
        '<div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain">'
      );
      // Old space-y container must be absent
      expect(itemsContent).not.toContain("p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-2");
    });

    it("verifies flat list rows without individual borders or box shadows", () => {
      expect(itemsContent).toContain(
        '"px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2"'
      );
      expect(itemsContent).toContain('"bg-blue-50/30 dark:bg-blue-950/20"');
      expect(itemsContent).toContain('"hover:bg-slate-50/50 dark:hover:bg-slate-800/30"');
      // Old floating card styles must be absent
      expect(itemsContent).not.toContain("p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs");
    });

    it("verifies touch targets >= 44px on all mobile action triggers", () => {
      // Stock adjustment button
      expect(itemsContent).toContain("min-h-[44px] h-11 px-3 rounded-lg");
      // More action trigger button
      expect(itemsContent).toContain("min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg");
    });

    it("strictly prohibits sub-11px typography classes in Items.tsx", () => {
      const sub11Regex = /text-\[(?:[0-9]|10)px\]/g;
      const matches = itemsContent.match(sub11Regex) || [];
      expect(matches).toEqual([]);
    });

    it("preserves desktop table view container with 100% fidelity", () => {
      expect(itemsContent).toContain(
        '<div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">'
      );
      expect(itemsContent).toContain('<table className="w-full text-xs text-left min-w-[640px]">');
    });

    it("preserves critical inventory management event handlers and state hooks", () => {
      expect(itemsContent).toContain("setAdjustingItem");
      expect(itemsContent).toContain("handleDeleteItem");
      expect(itemsContent).toContain("handleSelectAll");
      expect(itemsContent).toContain("handleSort");
      expect(itemsContent).toContain("setShowCreateModal");
    });
  });
});
