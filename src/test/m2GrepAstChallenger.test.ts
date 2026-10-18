import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Challenger M2-2 Empirical AST & Grep Scan Suite
 * Verifies that zero direct Supabase table queries exist for "products" and "product_batches"
 * in application code, and that all 21 target files consume productsApi appropriately.
 */

const ROOT_SRC = path.resolve(__dirname, "..");

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "test" ||
        entry.name === "node_modules" ||
        entry.name.startsWith(".")
      ) {
        continue;
      }
      getAllSourceFiles(fullPath, fileList);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.") &&
      !fullPath.includes("supabase/client.ts") &&
      !fullPath.includes("supabase\\client.ts")
    ) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Empirical Challenger M2-2: Products & Product Batches AST / Grep Compliance", () => {
  const allSourceFiles = getAllSourceFiles(ROOT_SRC);

  it("Step 1: Confirms at least 200 production source files are discovered and scanned", () => {
    expect(allSourceFiles.length).toBeGreaterThanOrEqual(200);
  });

  it("Step 2: Scans for exact supabase.from('products') or .from('products') in application code", () => {
    const productQueryRegex = /(?:supabase|client|\bdb)\s*\.\s*from\s*\(\s*["'`]products["'`]\s*\)/i;
    const violations: { file: string; line: number; content: string }[] = [];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (productQueryRegex.test(line)) {
          violations.push({
            file: path.relative(ROOT_SRC, filePath).replace(/\\/g, "/"),
            line: i + 1,
            content: line.trim(),
          });
        }
      }
    }

    expect(violations).toEqual([]);
    expect(violations.length).toBe(0);
  });

  it("Step 3: Scans for exact supabase.from('product_batches') or .from('product_batches') in application code", () => {
    const batchQueryRegex = /(?:supabase|client|\bdb)\s*\.\s*from\s*\(\s*["'`]product_batches["'`]\s*\)/i;
    const violations: { file: string; line: number; content: string }[] = [];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (batchQueryRegex.test(line)) {
          violations.push({
            file: path.relative(ROOT_SRC, filePath).replace(/\\/g, "/"),
            line: i + 1,
            content: line.trim(),
          });
        }
      }
    }

    expect(violations).toEqual([]);
    expect(violations.length).toBe(0);
  });

  it("Step 4: Stress-tests multi-line queries (newline between client and .from, or .from and table name)", () => {
    const multiLineRegex = /(?:supabase|client|\bdb)\s*\n\s*\.\s*from\s*\(\s*["'`]\s*(products|product_batches)\s*["'`]\s*\)/i;
    const multiLineRegex2 = /(?:supabase|client|\bdb)\s*\.\s*from\s*\(\s*\n\s*["'`]\s*(products|product_batches)\s*["'`]\s*\)/i;
    const violations: string[] = [];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (multiLineRegex.test(content) || multiLineRegex2.test(content)) {
        violations.push(path.relative(ROOT_SRC, filePath).replace(/\\/g, "/"));
      }
    }

    expect(violations).toEqual([]);
    expect(violations.length).toBe(0);
  });

  it("Step 5: Verifies that productsApi.ts does NOT call supabase.from directly", () => {
    const productsApiPath = path.join(ROOT_SRC, "services", "productsApi.ts");
    expect(fs.existsSync(productsApiPath)).toBe(true);
    const content = fs.readFileSync(productsApiPath, "utf-8");

    expect(content).not.toMatch(/supabase\.from/);
    expect(content).not.toMatch(/\.from\(["'`]products["'`]\)/);
    expect(content).not.toMatch(/\.from\(["'`]product_batches["'`]\)/);
    // Must use apiClient helpers
    expect(content).toMatch(/apiGet|apiPost|apiPut|apiDelete|apiClient/);
  });

  it("Step 6: Verifies all 21 M2 target files use productsApi instead of direct table queries", () => {
    const targetFiles = [
      "context/ProductsContext.tsx",
      "pages/Items.tsx",
      "pages/ItemMaster.tsx",
      "pages/Inventory.tsx",
      "services/stockService.ts",
      "pages/POSBilling.tsx",
      "pages/BarcodeGenerator.tsx",
      "pages/PurchaseReturns.tsx",
      "components/storefront/StorefrontCatalogTab.tsx",
      "services/storefrontService.ts",
      "utils/offlineQueue.ts",
      "components/items/QuickCreateItemModal.tsx",
      "components/PurchaseInvoiceForm.tsx",
      "components/AppLayout.tsx",
      "pages/Dashboard.tsx",
      "hooks/useOrganization.tsx",
      "pages/Auth.tsx",
      "services/documentsService.ts",
      "services/networkInvoicingService.ts",
      "services/autoSyncService.ts",
      "pages/TallyImport.tsx",
    ];

    for (const relativePath of targetFiles) {
      const fullPath = path.join(ROOT_SRC, relativePath);
      expect(fs.existsSync(fullPath), `File should exist: ${relativePath}`).toBe(true);

      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify no direct table queries for products or product_batches
      expect(content).not.toMatch(/\.from\(\s*["'`]products["'`]\s*\)/);
      expect(content).not.toMatch(/\.from\(\s*["'`]product_batches["'`]\s*\)/);

      // Verify it imports or references productsApi
      const usesProductsApi =
        content.includes("productsApi") ||
        content.includes("from \"../services/productsApi\"") ||
        content.includes("from '@/services/productsApi'") ||
        content.includes("from \"@/services/productsApi\"");
      expect(
        usesProductsApi,
        `${relativePath} should reference productsApi`
      ).toBe(true);
    }
  });

  it("Step 7: Verifies edge-case storage.from('store-logos') is preserved and not confused with table queries", () => {
    const storefrontCatalogTab = path.join(
      ROOT_SRC,
      "components",
      "storefront",
      "StorefrontCatalogTab.tsx"
    );
    expect(fs.existsSync(storefrontCatalogTab)).toBe(true);
    const content = fs.readFileSync(storefrontCatalogTab, "utf-8");
    // Verify storage bucket call is present
    expect(content).toMatch(/storage\.from\(\s*["'`]store-logos["'`]\s*\)/);
    // Verify NO products table query is present
    expect(content).not.toMatch(/\.from\(\s*["'`]products["'`]\s*\)/);
  });
});
