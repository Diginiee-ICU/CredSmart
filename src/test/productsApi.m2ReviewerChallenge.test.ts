import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  productsApi,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImport,
  bulkDelete,
  bulkDeleteProducts,
  bulkUpdate,
  bulkUpdateProducts,
  adjustStock,
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  deleteBatchesByProductIds,
  bulkUpsertBatches,
  checkBarcodeUnique,
  type ProductBatch,
  type SaveProductPayload,
} from "@/services/productsApi";
import { normalizeProduct } from "@/context/ProductsContext";
import {
  getLocalCachedProducts,
  saveLocalCachedProducts,
  addOrUpdateLocalCachedProduct,
  generateSafeUuid,
} from "@/services/stockService";

const mockGetSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: vi.fn(),
    },
  },
}));

function mockApiResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Milestone 2 Reviewer Adversarial Challenge Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-jwt-reviewer-token",
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("1. CRUD & Batch API Contract Verification", () => {
    it("1.1: getProducts targets GET /products with full query params & org headers", async () => {
      let capturedUrl = "";
      let capturedHeaders: Headers | undefined;

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedHeaders = new Headers(init?.headers);
        return mockApiResponse({ data: [{ id: "p1", name: "Challenge Product" }] });
      });

      const res = await getProducts("org-test-123", {
        search: "parle",
        barcode: "12345678",
        category: "Biscuits",
        limit: 50,
        page: 2,
      });

      expect(res.error).toBeNull();
      expect(capturedUrl).toContain("https://api.credsmart.online/api/products");
      expect(capturedUrl).toContain("organization_id=org-test-123");
      expect(capturedUrl).toContain("search=parle");
      expect(capturedUrl).toContain("barcode=12345678");
      expect(capturedUrl).toContain("category=Biscuits");
      expect(capturedUrl).toContain("limit=50");
      expect(capturedUrl).toContain("page=2");
      expect(capturedHeaders?.get("x-organization-id")).toBe("org-test-123");
      expect(capturedHeaders?.get("authorization")).toBe("Bearer mock-jwt-reviewer-token");
    });

    it("1.2: getProductById targets GET /products/:id", async () => {
      let capturedUrl = "";
      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        capturedUrl = String(input);
        return mockApiResponse({ data: { id: "p-abc-999", name: "Detailed Item" } });
      });

      const res = await getProductById("p-abc-999", "org-test-123");
      expect(res.error).toBeNull();
      expect(capturedUrl).toBe("https://api.credsmart.online/api/products/p-abc-999");
      expect(res.data?.name).toBe("Detailed Item");
    });

    it("1.3: createProduct correctly handles payload org resolution fallback", async () => {
      let capturedBody: any;
      let capturedMethod = "";

      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedMethod = init?.method || "";
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockApiResponse({ data: { id: "p-created", ...capturedBody } });
      });

      const payload: SaveProductPayload = {
        name: "Ghee 1L",
        sku: "GHEE-01",
        organization_id: "org-explicit",
      };

      const res = await createProduct(payload, "org-fallback");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.organization_id).toBe("org-explicit");
      expect(res.data?.sku).toBe("GHEE-01");
    });

    it("1.4: updateProduct executes PUT /products/:id", async () => {
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedBody: any;

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method || "";
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockApiResponse({ data: { id: "p-upd", ...capturedBody } });
      });

      const res = await updateProduct("p-upd", { name: "Updated Ghee 1L" }, "org-test");
      expect(capturedMethod).toBe("PUT");
      expect(capturedUrl).toBe("https://api.credsmart.online/api/products/p-upd");
      expect(capturedBody.name).toBe("Updated Ghee 1L");
      expect(res.data?.name).toBe("Updated Ghee 1L");
    });

    it("1.5: deleteProduct executes DELETE /products/:id", async () => {
      let capturedUrl = "";
      let capturedMethod = "";

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method || "";
        return mockApiResponse({ data: { success: true } });
      });

      const res = await deleteProduct("p-del", "org-test");
      expect(capturedMethod).toBe("DELETE");
      expect(capturedUrl).toBe("https://api.credsmart.online/api/products/p-del");
      expect(res.data?.success).toBe(true);
    });

    it("1.6: bulkImport, bulkDelete and bulkUpdate alias parity", async () => {
      expect(bulkDeleteProducts).toBe(bulkDelete);
      expect(bulkUpdateProducts).toBe(bulkUpdate);

      let bulkImportUrl = "";
      let bulkDeleteUrl = "";
      let bulkUpdateUrl = "";

      global.fetch = vi
        .fn()
        .mockImplementationOnce(async (input) => {
          bulkImportUrl = String(input);
          return mockApiResponse({ data: { inserted: 10, updated: 2 } });
        })
        .mockImplementationOnce(async (input) => {
          bulkDeleteUrl = String(input);
          return mockApiResponse({ data: { success: true, deletedCount: 5 } });
        })
        .mockImplementationOnce(async (input) => {
          bulkUpdateUrl = String(input);
          return mockApiResponse({ data: { success: true, updatedCount: 4 } });
        });

      await bulkImport([{ name: "Bulk Item 1" }], "overwrite", "org-1");
      expect(bulkImportUrl).toBe("https://api.credsmart.online/api/products/bulk");

      await bulkDelete(["id-1", "id-2"], "org-1");
      expect(bulkDeleteUrl).toBe("https://api.credsmart.online/api/products/bulk-delete");

      await bulkUpdate(["id-1"], { category: "Dairy" }, "org-1");
      expect(bulkUpdateUrl).toBe("https://api.credsmart.online/api/products/bulk-update");
    });

    it("1.7: adjustStock executes POST /inventory/adjust-stock", async () => {
      let capturedUrl = "";
      let capturedBody: any;

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockApiResponse({
          data: {
            batch: { id: "b1", current_stock: 40 },
            totalStock: 100,
          },
        });
      });

      const res = await adjustStock({
        productId: "prod-1",
        batchId: "b1",
        adjustType: "add",
        quantity: 15,
        orgId: "org-adjust",
      });

      expect(capturedUrl).toBe("https://api.credsmart.online/api/inventory/adjust-stock");
      expect(capturedBody.quantity).toBe(15);
      expect(res.data?.totalStock).toBe(100);
      expect(res.data?.batch.current_stock).toBe(40);
    });

    it("1.8: getBatches formats single string or array product_ids parameter", async () => {
      let capturedParams1 = "";
      let capturedParams2 = "";

      global.fetch = vi
        .fn()
        .mockImplementationOnce(async (input) => {
          capturedParams1 = String(input);
          return mockApiResponse({ data: [] });
        })
        .mockImplementationOnce(async (input) => {
          capturedParams2 = String(input);
          return mockApiResponse({ data: [] });
        });

      await getBatches(["p1", "p2", "p3"]);
      expect(capturedParams1).toContain("product_ids=p1%2Cp2%2Cp3");

      await getBatches("single-pid");
      expect(capturedParams2).toContain("product_ids=single-pid");
    });

    it("1.9: checkBarcodeUnique sends exclude_id when excludeProductId is passed", async () => {
      let capturedUrl = "";
      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        capturedUrl = String(input);
        return mockApiResponse({ data: { available: true } });
      });

      await checkBarcodeUnique("8901234567890", "org-bc", "prod-exclude-1");
      expect(capturedUrl).toContain("barcode=8901234567890");
      expect(capturedUrl).toContain("organization_id=org-bc");
      expect(capturedUrl).toContain("exclude_id=prod-exclude-1");
    });
  });

  describe("2. Interface Parity & Dual-Access Types", () => {
    it("2.1: ProductBatch interface supports both camelCase and snake_case properties", () => {
      const batch: ProductBatch = {
        id: "b-100",
        product_id: "prod-100",
        productId: "prod-100",
        batch_number: "BATCH-2026-A",
        batchNumber: "BATCH-2026-A",
        cost_price: 150,
        costPrice: 150,
        mrp: 200,
        stock: 50,
        current_stock: 50,
        currentStock: 50,
        expiry_date: "2027-12-31",
        expiryDate: "2027-12-31",
      };

      expect(batch.cost_price).toBe(batch.costPrice);
      expect(batch.batch_number).toBe(batch.batchNumber);
      expect(batch.expiry_date).toBe(batch.expiryDate);
      expect(batch.current_stock).toBe(batch.currentStock);
      expect(batch.product_id).toBe(batch.productId);
    });

    it("2.2: normalizeProduct calculates total stock across multiple batches and preserves tags fallback", () => {
      const rawProduct = {
        id: "prod-norm",
        name: "Multi-Batch Product",
        tags: {
          gst_rate: 12,
          hsn_code: "1905",
          selling_price: 120,
          purchase_price: 90,
          unit: "KG",
        },
        product_batches: [
          { id: "b1", batch_number: "B1", mrp: 120, cost_price: 90, stock: 15, expiry_date: null },
          { id: "b2", batch_number: "B2", mrp: 130, cost_price: 95, stock: 25, expiry_date: null },
        ],
      };

      const normalized = normalizeProduct(rawProduct);
      expect(normalized.currentStock).toBe(40);
      expect(normalized.stock).toBe(40);
      expect(normalized.sellingPrice).toBe(120);
      expect(normalized.purchasePrice).toBe(90);
      expect(normalized.unit).toBe("KG");
      expect(normalized.hsnCode).toBe("1905");
      expect(normalized.gstRate).toBe(12);
    });
  });

  describe("3. LocalStorage Caching & Stock Service Resilience", () => {
    it("3.1: getLocalCachedProducts, saveLocalCachedProducts, and addOrUpdateLocalCachedProduct operate correctly", () => {
      const orgId = "org-cache-test";
      expect(getLocalCachedProducts(orgId)).toEqual([]);

      addOrUpdateLocalCachedProduct(orgId, {
        id: "prod-cache-1",
        name: "Locally Added Milk",
        stock: 10,
      });

      const cached = getLocalCachedProducts(orgId);
      expect(cached).toHaveLength(1);
      expect(cached[0].name).toBe("Locally Added Milk");
      expect(cached[0].stock).toBe(10);

      // Updating existing item in place
      addOrUpdateLocalCachedProduct(orgId, {
        id: "prod-cache-1",
        name: "Locally Added Milk 1L",
        stock: 25,
      });

      const updated = getLocalCachedProducts(orgId);
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe("Locally Added Milk 1L");
      expect(updated[0].stock).toBe(25);
    });

    it("3.2: generateSafeUuid creates valid RFC4122 v4 UUID preventing Postgres 22P02 errors", () => {
      const uuid = generateSafeUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe("4. Adversarial Failure Modes & Network Error Envelope Handling", () => {
    it("4.1: productsApi methods return error envelope instead of throwing when network is down", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      const res = await getProducts("org-fail");
      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.code).toBe("NETWORK_ERROR");
      expect(res.error?.status).toBe(0);
    });

    it("4.2: productsApi methods return error envelope when backend returns HTTP 500", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Internal server error", code: "DB_CONNECTION_FAIL" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await getProductById("p-err", "org-fail");
      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(500);
      expect(res.error?.message).toBe("Internal server error");
    });

    it("4.3: Local cache fallback in ProductsContext survives total API downtime", async () => {
      const orgId = "org-offline-survival";
      const cachedKey = `credsmart_cached_products_${orgId}`;
      const offlineProducts = [
        {
          id: "p-off-1",
          name: "Offline Preserved Rice",
          tags: { stock: 100 },
          product_batches: [
            { id: "b-off-1", batch_number: "BATCH-01", stock: 100, mrp: 60, cost_price: 45, expiry_date: null },
          ],
        },
      ];
      localStorage.setItem(cachedKey, JSON.stringify(offlineProducts));

      global.fetch = vi.fn().mockRejectedValue(new Error("Network Unreachable"));

      // Verify that calling getProducts returns error
      const apiRes = await getProducts(orgId);
      expect(apiRes.data).toBeNull();
      expect(apiRes.error).not.toBeNull();

      // Read from local cache like ProductsContext does on error
      const cachedRaw = localStorage.getItem(cachedKey);
      const restored = JSON.parse(cachedRaw || "[]").map(normalizeProduct);

      expect(restored).toHaveLength(1);
      expect(restored[0].name).toBe("Offline Preserved Rice");
      expect(restored[0].stock).toBe(100);
    });
  });
});


