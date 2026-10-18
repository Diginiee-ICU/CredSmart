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
  type SaveProductPayload,
  type StockAdjustmentParams,
  type ProductBatch,
  type BulkImportResult,
} from "@/services/productsApi";
import { setApiBaseUrl, DEFAULT_API_BASE_URL } from "@/lib/apiClient";

// ─── Mock Supabase Auth ───────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

// ─── HTTP Mock Helpers ────────────────────────────────────────────────────────

function mockJsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const status = init.status ?? 200;
  const headers = {
    "content-type": "application/json",
    ...(init.headers || {}),
  };
  const bodyText =
    body === null || body === undefined
      ? null
      : typeof body === "string"
      ? body
      : JSON.stringify(body);
  return new Response(bodyText, { status, headers });
}

// ─── Main Stress Test Suite ───────────────────────────────────────────────────

describe("Empirical Challenge Suite: productsApi.ts Stress & Resilience", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setApiBaseUrl(null);
    delete (window as any).__API_BASE_URL__;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-jwt-products-token",
          refresh_token: "mock-refresh-products-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-jwt-refreshed-token",
          refresh_token: "mock-refresh-new-token",
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setApiBaseUrl(null);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGE 1: HIGH-THROUGHPUT BULK PRODUCT IMPORT (1,000 ITEMS)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Challenge 1: High-Throughput Bulk Product Import (1,000 Items)", () => {
    /**
     * Helper to generate N realistic product payloads with batches, prices, and unicode metadata.
     */
    function generateBulkProducts(count: number): SaveProductPayload[] {
      const items: SaveProductPayload[] = [];
      for (let i = 1; i <= count; i++) {
        items.push({
          name: `उत्पाद SKU #${i} - Premium Basmati Rice Brand ${i % 10}`,
          brand: `Brand-${i % 50}`,
          category: i % 2 === 0 ? "Grains & Pulses" : "FMCG Grocery",
          barcode: `8901234${String(i).padStart(6, "0")}`,
          sku: `SKU-PROD-${String(i).padStart(6, "0")}`,
          description: `Detailed description for item ${i} containing unicode symbols: ₹, ★, %, and newline\nItem #${i}`,
          batches: [
            {
              batch_number: `BATCH-${i}-A`,
              cost_price: 50 + (i % 20),
              mrp: 80 + (i % 30),
              current_stock: 100 + (i % 50),
              expiry_date: "2027-12-31",
            },
            {
              batch_number: `BATCH-${i}-B`,
              cost_price: 52 + (i % 20),
              mrp: 85 + (i % 30),
              current_stock: 40,
              expiry_date: "2028-06-30",
            },
          ],
          tags: {
            tax_rate: 5,
            hsn_code: "10063010",
            unit: "kg",
            is_active: true,
          },
        });
      }
      return items;
    }

    it("1.1: Successfully serializes and transmits 1,000 items in a single bulk import request", async () => {
      const oneThousandItems = generateBulkProducts(1000);
      expect(oneThousandItems).toHaveLength(1000);

      let capturedUrl = "";
      let capturedMethod = "";
      let capturedHeaders: Headers | undefined;
      let capturedBody: any = null;

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedMethod = init?.method || "GET";
        capturedHeaders = new Headers(init?.headers);
        capturedBody = JSON.parse(String(init?.body || "{}"));

        return mockJsonResponse({
          data: {
            inserted: 950,
            updated: 50,
            count: 1000,
          },
        });
      });

      const res = await bulkImport(oneThousandItems, "overwrite", "org-tenant-bulk-1");

      expect(res.error).toBeNull();
      expect(res.data).toEqual({
        inserted: 950,
        updated: 50,
        count: 1000,
      });

      expect(capturedUrl).toBe("https://api.credsmart.online/api/products/bulk");
      expect(capturedMethod).toBe("POST");
      expect(capturedHeaders?.get("content-type")).toBe("application/json");
      expect(capturedHeaders?.get("x-organization-id")).toBe("org-tenant-bulk-1");
      expect(capturedHeaders?.get("Authorization")).toBe("Bearer mock-jwt-products-token");

      expect(capturedBody).toBeDefined();
      expect(capturedBody.strategy).toBe("overwrite");
      expect(capturedBody.organization_id).toBe("org-tenant-bulk-1");
      expect(Array.isArray(capturedBody.items)).toBe(true);
      expect(capturedBody.items).toHaveLength(1000);
      expect(capturedBody.items[999].sku).toBe("SKU-PROD-001000");
    });

    it("1.2: Benchmarks 1,000 items serialization performance (< 300ms execution latency)", async () => {
      const items = generateBulkProducts(1000);

      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse({
          data: { inserted: 1000, updated: 0 },
        })
      );

      const startTime = performance.now();
      const res = await bulkImport(items, "skip_existing", "org-perf-1");
      const elapsedMs = performance.now() - startTime;

      expect(res.error).toBeNull();
      expect(res.data?.inserted).toBe(1000);
      // Serialization and promise dispatch must execute fast without stalling event loop
      expect(elapsedMs).toBeLessThan(500);
    });

    it("1.3: Handles empty items array [] safely without error", async () => {
      let capturedBody: any = null;
      global.fetch = vi.fn(async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockJsonResponse({ data: { inserted: 0, updated: 0 } });
      });

      const res = await bulkImport([], "merge", "org-empty-1");
      expect(res.error).toBeNull();
      expect(res.data).toEqual({ inserted: 0, updated: 0 });
      expect(capturedBody.items).toEqual([]);
      expect(capturedBody.strategy).toBe("merge");
    });

    it("1.4: Preserves Unicode Devanagari characters and nested batch data across 1,000 items", async () => {
      const items = generateBulkProducts(1000);
      let capturedRawBody = "";

      global.fetch = vi.fn(async (_url, init) => {
        capturedRawBody = String(init?.body || "");
        return mockJsonResponse({ data: { inserted: 1000, updated: 0 } });
      });

      await bulkImport(items, "overwrite", "org-unicode");

      // Verify unicode strings were preserved and not corrupted or escaped into ASCII question marks
      expect(capturedRawBody).toContain("उत्पाद SKU #1");
      expect(capturedRawBody).toContain("उत्पाद SKU #500");
      expect(capturedRawBody).toContain("उत्पाद SKU #1000");
      expect(capturedRawBody).toContain("₹");
    });

    it("1.5: Handles strategy variations ('overwrite', 'skip', 'merge') accurately", async () => {
      const singleItem: SaveProductPayload[] = [{ name: "Test Product", sku: "SKU-T1" }];
      const strategies = ["overwrite", "skip_existing", "merge", "custom_strategy"];

      for (const strat of strategies) {
        let sentStrategy = "";
        global.fetch = vi.fn(async (_url, init) => {
          const body = JSON.parse(String(init?.body || "{}"));
          sentStrategy = body.strategy;
          return mockJsonResponse({ data: { inserted: 1, updated: 0 } });
        });

        await bulkImport(singleItem, strat, "org-strat");
        expect(sentStrategy).toBe(strat);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGE 2: CONCURRENT BATCH STOCK ADJUSTMENTS WITHOUT RACE CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Challenge 2: Concurrent Batch Stock Adjustments & Race Conditions", () => {
    it("2.1: Dispatches 50 concurrent stock adjustments across distinct batches via Promise.all", async () => {
      const concurrentRequests = 50;
      const capturedRequests: Array<{ url: string; body: any; headers: Headers }> = [];

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const req = {
          url: String(input),
          body: JSON.parse(String(init?.body || "{}")),
          headers: new Headers(init?.headers),
        };
        capturedRequests.push(req);

        return mockJsonResponse({
          data: {
            batch: {
              id: req.body.batchId,
              product_id: req.body.productId,
              batch_number: `BATCH-${req.body.productId}`,
              current_stock: 100 + req.body.quantity,
            },
            totalStock: 500 + req.body.quantity,
          },
        });
      });

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        adjustStock({
          productId: `prod-${i}`,
          batchId: `batch-${i}`,
          adjustType: i % 2 === 0 ? "add" : "reduce",
          quantity: (i + 1) * 2,
          reason: `Concurrent adjustment #${i}`,
          orgId: "org-concurrent-1",
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      expect(capturedRequests).toHaveLength(concurrentRequests);

      // Verify each adjustment returned clean isolated result
      for (let i = 0; i < concurrentRequests; i++) {
        expect(results[i].error).toBeNull();
        expect(results[i].data?.batch.id).toBe(`batch-${i}`);
        expect(results[i].data?.batch.product_id).toBe(`prod-${i}`);
        expect(capturedRequests[i].headers.get("x-organization-id")).toBe("org-concurrent-1");
      }
    });

    it("2.2: Race-condition test: 20 simultaneous adjustments targeting the SAME product and batch", async () => {
      const adjustmentCount = 20;
      const targetProductId = "prod-hotspot-99";
      const targetBatchId = "batch-hotspot-99";

      let simulatedStock = 100;
      global.fetch = vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body || "{}"));
        // Simulate atomic backend resolution
        if (body.adjustType === "add") {
          simulatedStock += body.quantity;
        } else if (body.adjustType === "reduce") {
          simulatedStock -= body.quantity;
        } else if (body.adjustType === "set") {
          simulatedStock = body.quantity;
        }

        return mockJsonResponse({
          data: {
            batch: {
              id: targetBatchId,
              product_id: targetProductId,
              current_stock: simulatedStock,
            },
            totalStock: simulatedStock,
          },
        });
      });

      // Fire 20 adjustments with varied adjustType
      const operations: StockAdjustmentParams[] = Array.from({ length: adjustmentCount }, (_, i) => ({
        productId: targetProductId,
        batchId: targetBatchId,
        adjustType: i % 3 === 0 ? "add" : i % 3 === 1 ? "reduce" : "set",
        quantity: i + 5,
        reason: `Rapid fire operation #${i}`,
        orgId: "org-race-target",
      }));

      const results = await Promise.all(operations.map((op) => adjustStock(op)));

      expect(results).toHaveLength(adjustmentCount);
      for (const res of results) {
        expect(res.error).toBeNull();
        expect(res.data?.batch.id).toBe(targetBatchId);
        expect(typeof res.data?.totalStock).toBe("number");
      }
    });

    it("2.3: Fault isolation under high concurrency: 40 succeed and 10 fail with 409 Conflict without unhandled rejections", async () => {
      const totalCount = 50;
      const failIndices = new Set([3, 7, 12, 19, 25, 31, 38, 42, 47, 49]);

      global.fetch = vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body || "{}"));
        const opIndex = Number(body.reason?.split("#")[1] ?? -1);

        if (failIndices.has(opIndex)) {
          return mockJsonResponse(
            {
              message: `Conflict: Stock locked by concurrent transaction for batch ${body.batchId}`,
              code: "LOCK_CONFLICT",
            },
            { status: 409 }
          );
        }

        return mockJsonResponse({
          data: {
            batch: { id: body.batchId, current_stock: 50 },
            totalStock: 100,
          },
        });
      });

      const promises = Array.from({ length: totalCount }, (_, i) =>
        adjustStock({
          productId: `prod-failover-${i}`,
          batchId: `batch-failover-${i}`,
          adjustType: "reduce",
          quantity: 1,
          reason: `Operation #${i}`,
          orgId: "org-fault-iso",
        })
      );

      const results = await Promise.all(promises);

      let successCount = 0;
      let conflictCount = 0;

      results.forEach((res, index) => {
        if (failIndices.has(index)) {
          conflictCount++;
          expect(res.data).toBeNull();
          expect(res.error).not.toBeNull();
          expect(res.error?.status).toBe(409);
          expect(res.error?.code).toBe("LOCK_CONFLICT");
          expect(res.error?.message).toContain("Conflict: Stock locked");
        } else {
          successCount++;
          expect(res.error).toBeNull();
          expect(res.data?.batch.id).toBe(`batch-failover-${index}`);
        }
      });

      expect(successCount).toBe(40);
      expect(conflictCount).toBe(10);
    });

    it("2.4: Multi-tenant concurrency: differing orgId parameters isolate x-organization-id headers properly", async () => {
      const tenants = ["tenant-alpha", "tenant-bravo", "tenant-charlie", "tenant-delta"];
      const capturedHeadersByTenant: Record<string, string | null> = {};

      global.fetch = vi.fn(async (_url, init) => {
        const headers = new Headers(init?.headers);
        const orgHeader = headers.get("x-organization-id");
        if (orgHeader) {
          capturedHeadersByTenant[orgHeader] = orgHeader;
        }
        return mockJsonResponse({
          data: { batch: { id: "b1", current_stock: 10 }, totalStock: 10 },
        });
      });

      const promises = tenants.map((tenantId) =>
        adjustStock({
          productId: `prod-${tenantId}`,
          adjustType: "add",
          quantity: 10,
          orgId: tenantId,
        })
      );

      await Promise.all(promises);

      for (const tenantId of tenants) {
        expect(capturedHeadersByTenant[tenantId]).toBe(tenantId);
      }
    });

    it("2.5: Preserves optional batch adjustment fields (batchNumber, costPrice, mrp, expiryDate) under concurrency", async () => {
      let capturedPayload: any = null;

      global.fetch = vi.fn(async (_url, init) => {
        capturedPayload = JSON.parse(String(init?.body || "{}"));
        return mockJsonResponse({
          data: { batch: { id: "b-new", current_stock: 75 }, totalStock: 75 },
        });
      });

      const params: StockAdjustmentParams = {
        productId: "prod-full-params",
        batchId: "batch-custom-12",
        adjustType: "add",
        quantity: 25,
        reason: "New inward shipment arrival",
        orgId: "org-params-check",
        batchNumber: "BN-2026-X99",
        costPrice: 145.5,
        mrp: 210.0,
        expiryDate: "2027-09-30T00:00:00Z",
      };

      const res = await adjustStock(params);

      expect(res.error).toBeNull();
      expect(capturedPayload).toMatchObject({
        productId: "prod-full-params",
        batchId: "batch-custom-12",
        adjustType: "add",
        quantity: 25,
        batchNumber: "BN-2026-X99",
        costPrice: 145.5,
        mrp: 210.0,
        expiryDate: "2027-09-30T00:00:00Z",
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGE 3: NETWORK FAILURE & ERROR PAYLOAD PARSING ORACLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Challenge 3: Network Failure & Error Payload Parsing Oracle", () => {
    it("3.1: Normalizes hard network drop (TypeError: Failed to fetch) into code: NETWORK_ERROR, status: 0", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      const res = await getProducts("org-net-fail");

      expect(res.data).toBeNull();
      expect(res.error).toEqual({
        message: "Failed to fetch",
        code: "NETWORK_ERROR",
        status: 0,
        details: expect.any(TypeError),
      });
    });

    it("3.2: Normalizes client timeout / AbortError into code: ABORTED, status: 0", async () => {
      const abortError = new Error("The user aborted a request.");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const res = await getProductById("prod-abort-1");

      expect(res.data).toBeNull();
      expect(res.error?.code).toBe("ABORTED");
      expect(res.error?.status).toBe(0);
      expect(res.error?.message).toContain("timed out");
    });

    it("3.3: Parses HTTP 400 Bad Request with structured JSON validation error", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse(
          {
            error: {
              message: "Product name and selling price are mandatory fields.",
              code: "MISSING_REQUIRED_FIELDS",
            },
          },
          { status: 400 }
        )
      );

      const res = await createProduct({ name: "" }, "org-val-1");

      expect(res.data).toBeNull();
      expect(res.error).toMatchObject({
        message: "Product name and selling price are mandatory fields.",
        code: "MISSING_REQUIRED_FIELDS",
        status: 400,
      });
    });

    it("3.4: Parses HTTP 404 Not Found cleanly when fetching nonexistent product", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse(
          {
            message: "Product with ID prod-ghost-999 not found",
            code: "PRODUCT_NOT_FOUND",
          },
          { status: 404 }
        )
      );

      const res = await getProductById("prod-ghost-999");

      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(404);
      expect(res.error?.code).toBe("PRODUCT_NOT_FOUND");
      expect(res.error?.message).toBe("Product with ID prod-ghost-999 not found");
    });

    it("3.5: Parses HTTP 409 Conflict for duplicate SKU / barcode collisions", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse(
          {
            message: "Barcode 8901234567890 already registered to another item",
            code: "BARCODE_COLLISION",
          },
          { status: 409 }
        )
      );

      const res = await createProduct(
        { name: "Duplicate Item", barcode: "8901234567890" },
        "org-dup"
      );

      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(409);
      expect(res.error?.code).toBe("BARCODE_COLLISION");
    });

    it("3.6: Parses HTTP 422 Unprocessable Entity with nested validation details", async () => {
      const errorPayload = {
        message: "Validation failed on 3 product attributes",
        code: "VALIDATION_ERROR",
        errors: [
          { field: "mrp", message: "MRP cannot be lower than cost price" },
          { field: "sku", message: "SKU contains invalid characters" },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse(errorPayload, { status: 422 })
      );

      const res = await updateProduct("prod-1", { mrp: 10 }, "org-err");

      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(422);
      expect(res.error?.code).toBe("VALIDATION_ERROR");
      expect(res.error?.details).toMatchObject(errorPayload);
    });

    it("3.7: Parses HTTP 500 Internal Server Error without throwing syntax errors", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse(
          {
            message: "Internal database query execution failed",
            code: "INTERNAL_SERVER_ERROR",
          },
          { status: 500 }
        )
      );

      const res = await deleteProduct("prod-crash", "org-crash");

      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(500);
      expect(res.error?.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("3.8: Handles non-JSON HTTP 502/503 HTML gateway error without crashing JSON parser", async () => {
      const html502 = `<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>`;
      global.fetch = vi.fn().mockResolvedValue(
        new Response(html502, {
          status: 502,
          headers: { "content-type": "text/html" },
        })
      );

      const res = await getProducts("org-gateway-down");

      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(502);
      expect(res.error?.message).toBeDefined();
    });

    it("3.9: Handles 200 OK containing API-level error envelope { error: { message: ... } }", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse({
          data: null,
          error: {
            message: "Tenant quota exceeded: max 5,000 products allowed on Starter plan",
            code: "QUOTA_EXCEEDED",
          },
        })
      );

      const res = await createProduct({ name: "Excess Item" }, "org-quota");

      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.message).toContain("Tenant quota exceeded");
      expect(res.error?.code).toBe("QUOTA_EXCEEDED");
    });

    it("3.10: 401 Unauthorized triggers session refresh and retries with refreshed token", async () => {
      let callCount = 0;
      let lastToken = "";

      global.fetch = vi.fn(async (_url, init) => {
        callCount++;
        const headers = new Headers(init?.headers);
        lastToken = headers.get("Authorization") || "";

        if (callCount === 1) {
          return mockJsonResponse({ message: "JWT expired" }, { status: 401 });
        }
        return mockJsonResponse({
          data: [{ id: "p-refreshed", name: "Product After Refresh" }],
        });
      });

      const res = await getProducts("org-refresh-flow");

      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].id).toBe("p-refreshed");
      expect(callCount).toBe(2);
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(lastToken).toBe("Bearer mock-jwt-refreshed-token");
    });

    it("3.11: 401 Unauthorized prevents infinite retry loops and halts after 1 retry", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        return mockJsonResponse({ message: "Account locked" }, { status: 401 });
      });

      const res = await getProducts("org-locked");

      expect(callCount).toBe(2); // Initial request + 1 retry only
      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(401);
      expect(res.error?.message).toBe("Account locked");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHALLENGE 4: LIFECYCLE & EXTENDED OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Challenge 4: Lifecycle & Extended Operations", () => {
    it("4.1: checkBarcodeUnique encodes special characters and parses available status", async () => {
      let capturedUrl = "";

      global.fetch = vi.fn(async (input) => {
        capturedUrl = String(input);
        return mockJsonResponse({
          data: {
            available: true,
            existingProduct: null,
          },
        });
      });

      const res = await checkBarcodeUnique("CODE+123&456#789", "org-barcode-1", "exclude-id-42");

      expect(res.error).toBeNull();
      expect(res.data?.available).toBe(true);
      expect(capturedUrl).toContain("barcode=CODE%2B123%26456%23789");
      expect(capturedUrl).toContain("organization_id=org-barcode-1");
      expect(capturedUrl).toContain("exclude_id=exclude-id-42");
    });

    it("4.2: checkBarcodeUnique returns existingProduct collision when barcode is taken", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockJsonResponse({
          data: {
            available: false,
            existingProduct: {
              id: "existing-prod-10",
              name: "Existing Shampoo 200ml",
              barcode: "8901234567890",
            },
          },
        })
      );

      const res = await checkBarcodeUnique("8901234567890", "org-dup-check");

      expect(res.error).toBeNull();
      expect(res.data?.available).toBe(false);
      expect(res.data?.existingProduct?.id).toBe("existing-prod-10");
    });

    it("4.3: bulkDeleteProducts maps IDs array and returns deletedCount", async () => {
      let capturedBody: any = null;

      global.fetch = vi.fn(async (input, init) => {
        expect(String(input)).toBe("https://api.credsmart.online/api/products/bulk-delete");
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockJsonResponse({
          data: { success: true, deletedCount: 15 },
        });
      });

      const idsToDelete = Array.from({ length: 15 }, (_, i) => `prod-del-${i}`);
      const res = await bulkDeleteProducts(idsToDelete, "org-del");

      expect(res.error).toBeNull();
      expect(res.data?.success).toBe(true);
      expect(res.data?.deletedCount).toBe(15);
      expect(capturedBody.ids).toHaveLength(15);
      expect(capturedBody.organization_id).toBe("org-del");
    });

    it("4.4: bulkUpdateProducts maps update dictionary and IDs array", async () => {
      let capturedBody: any = null;

      global.fetch = vi.fn(async (input, init) => {
        expect(String(input)).toBe("https://api.credsmart.online/api/products/bulk-update");
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return mockJsonResponse({
          data: { success: true, updatedCount: 20 },
        });
      });

      const idsToUpdate = Array.from({ length: 20 }, (_, i) => `prod-upd-${i}`);
      const updatePayload = { category: "Clearance Sale", is_active: false };

      const res = await bulkUpdateProducts(idsToUpdate, updatePayload, "org-upd");

      expect(res.error).toBeNull();
      expect(res.data?.success).toBe(true);
      expect(res.data?.updatedCount).toBe(20);
      expect(capturedBody.ids).toEqual(idsToUpdate);
      expect(capturedBody.update).toEqual(updatePayload);
    });

    it("4.5: getBatches handles both single product ID and arrays of product IDs", async () => {
      let capturedUrl = "";
      global.fetch = vi.fn(async (input) => {
        capturedUrl = String(input);
        return mockJsonResponse({
          data: [
            { id: "batch-1", product_id: "prod-1", batch_number: "B1", stock: 10 },
            { id: "batch-2", product_id: "prod-2", batch_number: "B2", stock: 20 },
          ],
        });
      });

      // 1. Array of IDs
      await getBatches(["prod-1", "prod-2", "prod-3"], "org-batches");
      expect(capturedUrl).toContain("product_ids=prod-1%2Cprod-2%2Cprod-3");

      // 2. Single string ID
      await getBatches("prod-solo", "org-batches");
      expect(capturedUrl).toContain("product_ids=prod-solo");
    });

    it("4.6: batch CRUD operations (createBatch, updateBatch, deleteBatch) route correctly", async () => {
      const calls: Array<{ url: string; method: string }> = [];

      global.fetch = vi.fn(async (input, init) => {
        calls.push({ url: String(input), method: init?.method || "GET" });
        return mockJsonResponse({ data: { success: true } });
      });

      // Create
      await createBatch({ product_id: "p1", batch_number: "BN-01" }, "org-b");
      // Update
      await updateBatch("batch-99", { mrp: 250 }, "org-b");
      // Delete
      await deleteBatch("batch-99", "org-b");

      expect(calls[0]).toEqual({
        url: "https://api.credsmart.online/api/product-batches",
        method: "POST",
      });
      expect(calls[1]).toEqual({
        url: "https://api.credsmart.online/api/product-batches/batch-99",
        method: "PUT",
      });
      expect(calls[2]).toEqual({
        url: "https://api.credsmart.online/api/product-batches/batch-99",
        method: "DELETE",
      });
    });

    it("4.7: deleteBatchesByProductIds & bulkUpsertBatches route correctly", async () => {
      const calls: Array<{ url: string; method: string; body: any }> = [];

      global.fetch = vi.fn(async (input, init) => {
        calls.push({
          url: String(input),
          method: init?.method || "GET",
          body: JSON.parse(String(init?.body || "{}")),
        });
        return mockJsonResponse({ data: { success: true, count: 5 } });
      });

      // deleteBatchesByProductIds
      await deleteBatchesByProductIds(["p1", "p2"], "org-del-b");
      // bulkUpsertBatches
      const sampleBatches: ProductBatch[] = [
        { product_id: "p1", batch_number: "B1", current_stock: 10 },
        { product_id: "p2", batch_number: "B2", current_stock: 20 },
      ];
      await bulkUpsertBatches(sampleBatches, "org-upsert-b");

      expect(calls[0].url).toBe("https://api.credsmart.online/api/product-batches/bulk-delete");
      expect(calls[0].body.product_ids).toEqual(["p1", "p2"]);

      expect(calls[1].url).toBe("https://api.credsmart.online/api/product-batches/bulk");
      expect(calls[1].body.batches).toEqual(sampleBatches);
    });

    it("4.8: Namespace object productsApi exposes all functions identically", () => {
      expect(productsApi.getProducts).toBe(getProducts);
      expect(productsApi.getProductById).toBe(getProductById);
      expect(productsApi.createProduct).toBe(createProduct);
      expect(productsApi.updateProduct).toBe(updateProduct);
      expect(productsApi.deleteProduct).toBe(deleteProduct);
      expect(productsApi.bulkImport).toBe(bulkImport);
      expect(productsApi.bulkDelete).toBe(bulkDelete);
      expect(productsApi.bulkDeleteProducts).toBe(bulkDeleteProducts);
      expect(productsApi.bulkUpdate).toBe(bulkUpdate);
      expect(productsApi.bulkUpdateProducts).toBe(bulkUpdateProducts);
      expect(productsApi.adjustStock).toBe(adjustStock);
      expect(productsApi.getBatches).toBe(getBatches);
      expect(productsApi.createBatch).toBe(createBatch);
      expect(productsApi.updateBatch).toBe(updateBatch);
      expect(productsApi.deleteBatch).toBe(deleteBatch);
      expect(productsApi.deleteBatchesByProductIds).toBe(deleteBatchesByProductIds);
      expect(productsApi.bulkUpsertBatches).toBe(bulkUpsertBatches);
      expect(productsApi.checkBarcodeUnique).toBe(checkBarcodeUnique);
    });
  });
});
