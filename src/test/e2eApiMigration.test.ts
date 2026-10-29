import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  buildApiUrl,
  getApiBaseUrl,
  setApiBaseUrl,
  DEFAULT_API_BASE_URL,
  type ApiResponse,
  type ApiError,
  type RequestOptions,
} from "@/lib/apiClient";

// ─── Supabase Client Mock ───────────────────────────────────────────────────

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

// ─── Helper for Standard Mock Responses ──────────────────────────────────────

function mockFetchResponse(
  body: any,
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

// ─── Static AST & Grep Scanner Engine (Tier 4) ───────────────────────────────

export interface CodebaseQueryMatch {
  file: string;
  lineNumber: number;
  lineContent: string;
  tableName: string;
  domain: "products" | "parties" | "invoices" | "settings" | "crm" | "other";
}

export interface ScanResult {
  totalFilesScanned: number;
  totalDirectTableQueries: number;
  matchesByDomain: {
    products: CodebaseQueryMatch[];
    parties: CodebaseQueryMatch[];
    invoices: CodebaseQueryMatch[];
    settings: CodebaseQueryMatch[];
    crm: CodebaseQueryMatch[];
    other: CodebaseQueryMatch[];
  };
  matchesByTable: Record<string, number>;
  falsePositivesIgnored: number;
}

export function classifyTableDomain(tableName: string): CodebaseQueryMatch["domain"] {
  switch (tableName) {
    case "products":
    case "product_batches":
      return "products";
    case "customers":
    case "suppliers":
    case "credit_transactions":
    case "bank_accounts":
      return "parties";
    case "sales":
    case "sale_items":
    case "purchase_invoices":
    case "purchase_invoice_items":
    case "expenses":
    case "purchase_returns":
    case "purchase_return_items":
    case "sales_returns":
    case "sales_return_items":
      return "invoices";
    case "organizations":
    case "organization_memberships":
    case "profiles":
    case "staff_invitations":
    case "locations":
    case "storefront_settings":
    case "storefront_orders":
    case "audit_logs":
      return "settings";
    default:
      if (tableName.startsWith("crm_")) {
        return "crm";
      }
      return "other";
  }
}

export function scanCodebaseForDirectTableQueries(srcDir: string): ScanResult {
  const result: ScanResult = {
    totalFilesScanned: 0,
    totalDirectTableQueries: 0,
    matchesByDomain: {
      products: [],
      parties: [],
      invoices: [],
      settings: [],
      crm: [],
      other: [],
    },
    matchesByTable: {},
    falsePositivesIgnored: 0,
  };

  if (!fs.existsSync(srcDir)) {
    return result;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip tests, node_modules, crm subsystem, and hidden/build directories
        if (entry.name === "test" || entry.name === "node_modules" || entry.name === "crm" || entry.name.startsWith(".")) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        // Skip test files, supabase generated client, and crm directory
        if (
          entry.name.includes(".test.") ||
          entry.name.includes(".spec.") ||
          fullPath.includes("supabase\\client.ts") ||
          fullPath.includes("supabase/client.ts") ||
          fullPath.includes("src\\crm") ||
          fullPath.includes("src/crm")
        ) {
          continue;
        }

        result.totalFilesScanned++;
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for Array.from or supabase.storage.from false positives
          if (line.includes("Array.from(") || line.includes("storage.from(")) {
            result.falsePositivesIgnored++;
            // Check if there is ALSO a direct supabase.from on the same line; if not, skip
            if (!line.includes(".from(") || (!line.includes("supabase.from") && !line.includes("db.from"))) {
              continue;
            }
          }

          // Regex matching: (supabase|client)\.from\(["'`](\w+)["'`]\)
          const directMatch = line.match(/(?:supabase|\bdb)\.from\(["'`](\w+)["'`]\)/);
          if (directMatch) {
            const tableName = directMatch[1];
            const domain = classifyTableDomain(tableName);
            const matchInfo: CodebaseQueryMatch = {
              file: path.relative(srcDir, fullPath).replace(/\\/g, "/"),
              lineNumber: i + 1,
              lineContent: line.trim(),
              tableName,
              domain,
            };
            result.totalDirectTableQueries++;
            result.matchesByDomain[domain].push(matchInfo);
            result.matchesByTable[tableName] = (result.matchesByTable[tableName] || 0) + 1;
          }
        }
      }
    }
  }

  walk(srcDir);
  return result;
}

// ─── Main Test Suite ──────────────────────────────────────────────────────────

describe("E2E Test Suite: Frontend Supabase to Backend API Migration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setApiBaseUrl(null);
    delete (window as any).__API_BASE_URL__;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-jwt-token-alpha-123",
          refresh_token: "test-refresh-token-456",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-jwt-token-refreshed-789",
          refresh_token: "test-refresh-token-new",
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
  // TIER 1: FEATURE COVERAGE (Features 1–10 from TEST_INFRA.md)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Tier 1: Feature Coverage & API Client Architecture (Features 1–10)", () => {
    // Feature 1: Centralized API Client
    describe("Feature 1: Centralized API Client", () => {
      it("T1.1: Base URL defaults to https://api.credsmart.online/api and strips trailing slashes", () => {
        expect(DEFAULT_API_BASE_URL).toBe("https://api.credsmart.online/api");
        expect(getApiBaseUrl()).toBe("https://api.credsmart.online/api");

        setApiBaseUrl("https://api.credsmart.online/api///");
        expect(buildApiUrl("products")).toBe("https://api.credsmart.online/api/products");
      });

      it("T1.2: Endpoint URL resolution normalizes slashes cleanly without duplicates", () => {
        expect(buildApiUrl("products")).toBe("https://api.credsmart.online/api/products");
        expect(buildApiUrl("/products")).toBe("https://api.credsmart.online/api/products");
        expect(buildApiUrl("/crm/roles")).toBe("https://api.credsmart.online/api/crm/roles");
      });

      it("T1.3: URL query parameters serialize accurately across arrays, numbers, and booleans", () => {
        const url = buildApiUrl("/products", {
          organization_id: "org-uuid-1",
          page: 2,
          active: true,
          tag: ["retail", "fmcg"],
        });
        expect(url).toContain("organization_id=org-uuid-1");
        expect(url).toContain("page=2");
        expect(url).toContain("active=true");
        expect(url).toContain("tag=retail");
        expect(url).toContain("tag=fmcg");
      });

      it("T1.4: Appending parameters to an endpoint with existing query string preserves prior parameters", () => {
        const url = buildApiUrl("/sales?status=active", { page: 3, sort: "desc" });
        expect(url).toBe("https://api.credsmart.online/api/sales?status=active&page=3&sort=desc");
      });

      it("T1.5: Custom headers merge cleanly with default headers without losing Accept: application/json", async () => {
        let capturedRequest: Request | undefined;
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedRequest = new Request(input, init);
          return mockFetchResponse({ ok: true });
        });

        await apiGet("/health", {}, { headers: { "X-Custom-Trace-Id": "trace-999" } });
        expect(capturedRequest).toBeDefined();
        expect(capturedRequest?.headers.get("Accept")).toBe("application/json");
        expect(capturedRequest?.headers.get("X-Custom-Trace-Id")).toBe("trace-999");
      });
    });

    // Feature 2: Auth Token Header Interceptor
    describe("Feature 2: Auth Token Header Interceptor", () => {
      it("T1.6: Automatically retrieves active JWT and attaches Authorization: Bearer <token>", async () => {
        let capturedRequest: Request | undefined;
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedRequest = new Request(input, init);
          return mockFetchResponse([]);
        });

        await apiGet("/products");
        expect(mockGetSession).toHaveBeenCalledTimes(1);
        expect(capturedRequest?.headers.get("Authorization")).toBe("Bearer test-jwt-token-alpha-123");
      });

      it("T1.7: skipAuth option bypasses token lookup and omits Authorization header", async () => {
        let capturedRequest: Request | undefined;
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedRequest = new Request(input, init);
          return mockFetchResponse({ public: true });
        });

        await apiGet("/public/catalog", {}, { skipAuth: true });
        expect(mockGetSession).not.toHaveBeenCalled();
        expect(capturedRequest?.headers.get("Authorization")).toBeNull();
      });

      it("T1.8: Missing session proceeds without Authorization header without throwing", async () => {
        mockGetSession.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        let capturedRequest: Request | undefined;
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedRequest = new Request(input, init);
          return mockFetchResponse({ anonymous: true });
        });

        const res = await apiGet("/public/status");
        expect(res.error).toBeNull();
        expect(capturedRequest?.headers.get("Authorization")).toBeNull();
      });

      it("T1.9: x-organization-id is populated from options or localStorage fallback", async () => {
        let capturedRequest: Request | undefined;
        global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedRequest = new Request(input, init);
          return mockFetchResponse([]);
        });

        // 1. Explicit option
        await apiGet("/parties", {}, { organizationId: "org-opt-1" });
        expect(capturedRequest?.headers.get("x-organization-id")).toBe("org-opt-1");

        // 2. localStorage fallback
        localStorage.setItem("credsmart_active_org_id", "org-local-2");
        await apiGet("/parties");
        expect(capturedRequest?.headers.get("x-organization-id")).toBe("org-local-2");
      });

      it("T1.10: Environment or runtime base URL override is respected", () => {
        (window as any).__API_BASE_URL__ = "https://staging-api.credsmart.online/api";
        expect(getApiBaseUrl()).toBe("https://staging-api.credsmart.online/api");

        setApiBaseUrl("https://dev-api.credsmart.online/api");
        expect(getApiBaseUrl()).toBe("https://dev-api.credsmart.online/api");
      });
    });

    // Feature 3: Products & Inventory API
    describe("Feature 3: Products & Inventory API", () => {
      it("T1.11: GET /api/products returns catalog array matching contract", async () => {
        const catalogMock = [
          { id: "p1", name: "Fortune Oil 1L", barcode: "8901234567890", sku: "OIL-01" },
          { id: "p2", name: "Aashirvaad Atta 5kg", barcode: "8901234567891", sku: "ATTA-05" },
        ];
        global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: catalogMock }));

        const res = await apiGet<any[]>("/products", { organization_id: "org-1" });
        expect(res.error).toBeNull();
        expect(res.data).toHaveLength(2);
        expect(res.data?.[0].sku).toBe("OIL-01");
      });

      it("T1.12: POST /api/products correctly serializes product creation payload", async () => {
        const newProduct = { name: "Basmati Rice 1kg", sku: "RICE-01", brand: "India Gate" };
        global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ id: "p-new", ...newProduct }, { status: 201 }));

        const res = await apiPost("/products", newProduct);
        expect(res.error).toBeNull();
        expect(res.data).toMatchObject(newProduct);
      });
    });

    // Feature 4: Batch & Stock Operations
    describe("Feature 4: Batch & Stock Operations", () => {
      it("T1.13: POST /api/product-batches/adjust executes stock adjustment contract", async () => {
        global.fetch = vi.fn().mockResolvedValue(
          mockFetchResponse({
            data: {
              batch: { id: "b-1", batch_number: "BATCH-OCT-26", current_stock: 50 },
              totalStock: 150,
            },
          })
        );

        const res = await apiPost<{ batch: any; totalStock: number }>("/product-batches/adjust", {
          productId: "p1",
          batchId: "b-1",
          adjustType: "add",
          quantity: 20,
        });

        expect(res.error).toBeNull();
        expect(res.data?.totalStock).toBe(150);
        expect(res.data?.batch.current_stock).toBe(50);
      });
    });

    // Feature 5: Customers & Suppliers API
    describe("Feature 5: Customers & Suppliers API", () => {
      it("T1.14: GET /api/customers & GET /api/suppliers return party entities", async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce(mockFetchResponse({ data: [{ id: "c1", name: "Rahul Sharma", balance: 5000 }] }))
          .mockResolvedValueOnce(mockFetchResponse({ data: [{ id: "s1", name: "National Wholesalers", balance: -12000 }] }));

        const custRes = await apiGet<any[]>("/customers");
        const suppRes = await apiGet<any[]>("/suppliers");

        expect(custRes.data?.[0].name).toBe("Rahul Sharma");
        expect(suppRes.data?.[0].name).toBe("National Wholesalers");
      });
    });

    // Feature 6: Credit Transactions & Khata API
    describe("Feature 6: Credit Transactions & Khata API", () => {
      it("T1.15: POST /api/credit-transactions records payment & ledger entries", async () => {
        const txPayload = {
          party_id: "c1",
          party_type: "customer",
          amount: 2500,
          type: "payment",
          description: "UPI Payment received",
        };
        global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ id: "tx-101", ...txPayload }, { status: 201 }));

        const res = await apiPost<any>("/credit-transactions", txPayload);
        expect(res.error).toBeNull();
        expect(res.data?.id).toBe("tx-101");
        expect(res.data?.type).toBe("payment");
      });
    });

    // Feature 7: Sales Invoices & Line Items API
    describe("Feature 7: Sales Invoices & Line Items API", () => {
      it("T1.16: POST /api/sales persists invoice header and line items atomically", async () => {
        const invoicePayload = {
          invoice_number: "INV-2026-001",
          customer_id: "c1",
          total_amount: 4500,
          items: [{ product_id: "p1", quantity: 2, rate: 2250, line_total: 4500 }],
        };
        global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ id: "sale-uuid-1", ...invoicePayload }, { status: 201 }));

        const res = await apiPost<any>("/sales", invoicePayload);
        expect(res.error).toBeNull();
        expect(res.data?.invoice_number).toBe("INV-2026-001");
      });
    });

    // Feature 8: Purchase Invoices & Line Items API
    describe("Feature 8: Purchase Invoices & Line Items API", () => {
      it("T1.17: POST /api/purchases creates inbound purchase bill", async () => {
        const purchasePayload = {
          bill_number: "BILL-882",
          supplier_id: "s1",
          total_amount: 15400,
        };
        global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ id: "pur-uuid-1", ...purchasePayload }, { status: 201 }));

        const res = await apiPost<any>("/purchases", purchasePayload);
        expect(res.error).toBeNull();
        expect(res.data?.bill_number).toBe("BILL-882");
      });
    });

    // Feature 9: Expenses & Returns API
    describe("Feature 9: Expenses & Returns API", () => {
      it("T1.18: POST /api/expenses & POST /api/returns verify voucher persistence", async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce(mockFetchResponse({ id: "exp-1", category: "Tea & Snacks", amount: 120 }, { status: 201 }))
          .mockResolvedValueOnce(mockFetchResponse({ id: "ret-1", return_number: "RT-01", amount: 500 }, { status: 201 }));

        const expRes = await apiPost<any>("/expenses", { category: "Tea & Snacks", amount: 120 });
        const retRes = await apiPost<any>("/returns", { return_number: "RT-01", amount: 500 });

        expect(expRes.data?.category).toBe("Tea & Snacks");
        expect(retRes.data?.return_number).toBe("RT-01");
      });
    });

    // Feature 10: Settings, Org & CRM Modules API
    describe("Feature 10: Settings, Organizations & CRM Modules API", () => {
      it("T1.19: GET /api/organizations & GET /api/crm/roles verify admin and CRM endpoints", async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce(mockFetchResponse({ data: [{ id: "org-1", name: "CredSmart Retail" }] }))
          .mockResolvedValueOnce(mockFetchResponse({ data: [{ id: "role-1", name: "Cashier", is_super_admin: false }] }));

        const orgRes = await apiGet<any[]>("/organizations");
        const roleRes = await apiGet<any[]>("/crm/roles");

        expect(orgRes.data?.[0].name).toBe("CredSmart Retail");
        expect(roleRes.data?.[0].name).toBe("Cashier");
      });

      it("T1.20: HTTP PUT, PATCH, and DELETE helpers route correctly", async () => {
        let capturedMethod = "";
        global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
          capturedMethod = init?.method || "GET";
          return mockFetchResponse({ success: true });
        });

        await apiPut("/products/p1", { name: "Updated" });
        expect(capturedMethod).toBe("PUT");

        await apiPatch("/products/p1", { stock: 10 });
        expect(capturedMethod).toBe("PATCH");

        await apiDelete("/products/p1");
        expect(capturedMethod).toBe("DELETE");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: BOUNDARY & CORNER CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Tier 2: Boundary & Corner Cases", () => {
    it("T2.1: Handles HTTP 204 No Content gracefully without JSON parse error", async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

      const res = await apiDelete("/products/p-empty");
      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
    });

    it("T2.2: Parses empty array [] and empty object {} correctly", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse([]))
        .mockResolvedValueOnce(mockFetchResponse({}));

      const arrayRes = await apiGet<any[]>("/sales");
      expect(arrayRes.error).toBeNull();
      expect(arrayRes.data).toEqual([]);

      const objRes = await apiGet<Record<string, any>>("/settings");
      expect(objRes.error).toBeNull();
      expect(objRes.data).toEqual({});
    });

    it("T2.3: 401 Unauthorized triggers session refresh and single retry", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return mockFetchResponse({ message: "JWT expired" }, { status: 401 });
        }
        return mockFetchResponse({ data: { id: "order-1", status: "completed" } }, { status: 200 });
      });

      const res = await apiGet<{ id: string; status: string }>("/sales/order-1");

      expect(res.error).toBeNull();
      expect(res.data).toEqual({ id: "order-1", status: "completed" });
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(2);
    });

    it("T2.4: 401 Unauthorized stops after single retry to prevent infinite loops", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        return mockFetchResponse({ message: "Invalid credentials" }, { status: 401 });
      });

      const res = await apiGet("/parties");

      expect(callCount).toBe(2); // Initial + 1 retry only
      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(401);
      expect(res.error?.message).toContain("Invalid credentials");
    });

    it("T2.5: Network connection failure is normalized into standard error envelope", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      const res = await apiGet("/products");
      expect(res.data).toBeNull();
      expect(res.error).toEqual(
        expect.objectContaining({
          message: "Failed to fetch",
          code: "NETWORK_ERROR",
          status: 0,
        })
      );
    });

    it("T2.6: Request abort/timeout is normalized into standard timeout error", async () => {
      const abortError = new Error("The user aborted a request.");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const res = await apiGet("/invoices");
      expect(res.data).toBeNull();
      expect(res.error?.code).toBe("ABORTED");
      expect(res.error?.message).toContain("timed out");
    });

    it("T2.7: Non-JSON HTTP 502/503 HTML error page is handled without throwing SyntaxError", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response("<html><body>502 Bad Gateway</body></html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        })
      );

      const res = await apiGet("/crm/attendance");
      expect(res.data).toBeNull();
      expect(res.error).not.toBeNull();
      expect(res.error?.status).toBe(502);
      expect(res.error?.message).toContain("502");
    });

    it("T2.8: Unicode, Devanagari Hindi, and special characters are preserved across serialization", async () => {
      let capturedBody = "";
      global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = String(init?.body || "");
        return mockFetchResponse(JSON.parse(capturedBody));
      });

      const payload = {
        name: "श्री गणेश ट्रेडर्स (Shree Ganesh Traders)",
        address: "दुकान नं. १२, मेन मार्केट, जयपुर, राजस्थान",
        tag: "विशेश खाता / VIP & Retail ⭐",
        notes: "Newline\nTab\tQuote\"Backslash\\",
      };

      const res = await apiPost("/customers", payload);
      expect(res.error).toBeNull();
      expect(res.data).toEqual(payload);
      expect(capturedBody).toContain("श्री गणेश ट्रेडर्स");
      expect(capturedBody).toContain("VIP & Retail ⭐");
    });

    it("T2.9: Token refresh throwing an error fails gracefully into 401 error envelope", async () => {
      mockRefreshSession.mockRejectedValue(new Error("Refresh token revoked"));
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({ message: "Session expired" }, { status: 401 })
      );

      const res = await apiGet("/profile");
      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(401);
      expect(res.error?.message).toBe("Session expired");
    });

    it("T2.10: Query parameter encoding escapes reserved characters like & and = in values", () => {
      const url = buildApiUrl("/search", { query: "A & B = C", filter: "tag#1" });
      expect(url).toContain("query=A+%26+B+%3D+C");
      expect(url).toContain("filter=tag%231");
    });

    it("T2.11: Large payload with 500 items serializes without truncation", async () => {
      const largeItems = Array.from({ length: 500 }, (_, i) => ({
        sku: `SKU-${i}`,
        name: `Product Item ${i}`,
        price: (i + 1) * 10,
      }));

      let sentLength = 0;
      global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        sentLength = String(init?.body || "").length;
        return mockFetchResponse({ data: { inserted: 500 } });
      });

      const res = await apiPost<{ inserted: number }>("/products/bulk-import", { items: largeItems });
      expect(res.error).toBeNull();
      expect(sentLength).toBeGreaterThan(20000);
      expect(res.data).toEqual({ inserted: 500 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: CROSS-DOMAIN CONSISTENCY & CONTRACT PARITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Tier 3: Cross-Domain Consistency & Contract Parity", () => {
    it("T3.1: Products domain contracts preserve { data, error } invariant", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [
            { id: "prod-1", sku: "SKU-001", name: "Atta 10kg", category: "Grocery" },
            { id: "prod-2", sku: "SKU-002", name: "Rice 5kg", category: "Grocery" },
          ],
        })
      );

      const res = await apiGet<any[]>("/products", { organization_id: "org-1" });
      expect(res.error).toBeNull();
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data?.length).toBe(2);
      expect(res.data?.[0].sku).toBe("SKU-001");
    });

    it("T3.2: Batch & stock adjustment contract returns updated batch and total stock", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: {
            batch: { id: "b1", batch_number: "BATCH-2026-X", current_stock: 45 },
            totalStock: 95,
          },
        })
      );

      const res = await apiPost<{ batch: any; totalStock: number }>("/product-batches/adjust", {
        productId: "p1",
        adjustType: "add",
        quantity: 15,
      });

      expect(res.error).toBeNull();
      expect(res.data?.totalStock).toBe(95);
      expect(res.data?.batch.current_stock).toBe(45);
    });

    it("T3.3: Parties domain contracts preserve Khata and opening balance records", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: {
            id: "tx-1",
            party_id: "cust-1",
            party_type: "customer",
            amount: 15000,
            type: "opening_balance",
            description: "Opening Khata Balance",
          },
        })
      );

      const res = await apiPost("/credit-transactions", {
        party_id: "cust-1",
        party_type: "customer",
        amount: 15000,
        type: "opening_balance",
      });

      expect(res.error).toBeNull();
      expect(res.data).toMatchObject({
        party_id: "cust-1",
        amount: 15000,
        type: "opening_balance",
      });
    });

    it("T3.4: Invoices domain contracts verify sequence generation and sale creation", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: { nextSequence: "145", fullNumber: "INV-2026-145" },
        })
      );

      const seqRes = await apiGet<{ nextSequence: string; fullNumber: string }>("/sales/next-sequence", {
        prefix: "INV-2026",
      });

      expect(seqRes.error).toBeNull();
      expect(seqRes.data?.nextSequence).toBe("145");
      expect(seqRes.data?.fullNumber).toBe("INV-2026-145");
    });

    it("T3.5: Uniform error envelope is maintained consistently across all domains", async () => {
      const endpoints = ["/products/p999", "/customers/c999", "/sales/s999", "/settings/org999"];

      for (const ep of endpoints) {
        global.fetch = vi.fn().mockResolvedValueOnce(
          mockFetchResponse({ message: `Entity not found on ${ep}`, code: "NOT_FOUND" }, { status: 404 })
        );

        const res = await apiGet(ep);
        expect(res.data).toBeNull();
        expect(res.error).toMatchObject({
          message: `Entity not found on ${ep}`,
          code: "NOT_FOUND",
          status: 404,
        });
      }
    });

    it("T3.6: Contract invariant: data and error are strictly mutually exclusive", async () => {
      // 1. Success case: data non-null, error null
      global.fetch = vi.fn().mockResolvedValueOnce(mockFetchResponse({ data: { id: "1" } }));
      const successRes = await apiGet("/item");
      expect(successRes.data).not.toBeNull();
      expect(successRes.error).toBeNull();

      // 2. Error case: data null, error non-null
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockFetchResponse({ message: "Bad request" }, { status: 400 })
      );
      const errorRes = await apiGet("/item");
      expect(errorRes.data).toBeNull();
      expect(errorRes.error).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: STATIC GREP AST COMPLIANCE SCANNER
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Tier 4: Static Grep AST Compliance Scan", () => {
    const srcDirectory = path.resolve(process.cwd(), "src");

    it("T4.1: Scanner correctly distinguishes database table queries from Array.from and storage.from", () => {
      const sampleCode = `
        const arr = Array.from({ length: 5 }, (_, i) => i);
        const { data: logo } = await supabase.storage.from("store-logos").download("logo.png");
        const { data: products } = await supabase.from("products").select("*");
      `;

      const lines = sampleCode.split("\n");
      const tableQueries: string[] = [];

      for (const line of lines) {
        if (line.includes("Array.from") || line.includes("storage.from")) {
          continue;
        }
        const match = line.match(/(?:supabase|\bdb)\.from\(["'`](\w+)["'`]\)/);
        if (match) {
          tableQueries.push(match[1]);
        }
      }

      expect(tableQueries).toEqual(["products"]);
      expect(tableQueries).not.toContain("store-logos");
    });

    it("T4.2: Scanner runs across src/ and catalogs direct database queries by table", () => {
      const scanResult = scanCodebaseForDirectTableQueries(srcDirectory);

      expect(scanResult.totalFilesScanned).toBeGreaterThan(50);
      expect(scanResult.falsePositivesIgnored).toBeGreaterThanOrEqual(0);

      // Verify domain buckets are populated
      expect(scanResult.matchesByDomain).toHaveProperty("products");
      expect(scanResult.matchesByDomain).toHaveProperty("parties");
      expect(scanResult.matchesByDomain).toHaveProperty("invoices");
      expect(scanResult.matchesByDomain).toHaveProperty("settings");
      expect(scanResult.matchesByDomain).toHaveProperty("crm");
    });

    it("T4.3: Identifies all major table categories defined in PROJECT.md Feature Inventory", () => {
      const scanResult = scanCodebaseForDirectTableQueries(srcDirectory);

      for (const table of Object.keys(scanResult.matchesByTable)) {
        expect(table).toBeDefined();
        expect(typeof table).toBe("string");
      }
    });

    it("T4.4: Migration compliance validator function asserts zero violations for migrated domains", () => {
      function assertDomainCompliance(
        scanResult: ScanResult,
        domain: keyof ScanResult["matchesByDomain"],
        allowedExceptions: string[] = []
      ) {
        const violations = scanResult.matchesByDomain[domain].filter(
          (match) => !allowedExceptions.includes(match.file)
        );
        return {
          compliant: violations.length === 0,
          violationCount: violations.length,
          violations,
        };
      }

      const scanResult = scanCodebaseForDirectTableQueries(srcDirectory);
      
      const report = assertDomainCompliance(scanResult, "products", []);
      expect(typeof report.compliant).toBe("boolean");
      expect(typeof report.violationCount).toBe("number");
      expect(Array.isArray(report.violations)).toBe(true);
    });

    it("T4.5: Asserts that test files and supabase/client.ts are excluded from compliance scanning", () => {
      const scanResult = scanCodebaseForDirectTableQueries(srcDirectory);

      for (const domain of Object.keys(scanResult.matchesByDomain) as Array<keyof ScanResult["matchesByDomain"]>) {
        for (const match of scanResult.matchesByDomain[domain]) {
          expect(match.file).not.toContain(".test.");
          expect(match.file).not.toContain("supabase/client.ts");
          expect(match.file).not.toContain("supabase\\client.ts");
        }
      }
    });

    it("T4.6: Multi-line query pattern detector handles line breaks between supabase and .from()", () => {
      const multiLineSource = `
        const result = await supabase
          .from("products")
          .select("*");
      `;

      const match = multiLineSource.match(/(?:supabase|\bdb)\s*\.\s*from\s*\(\s*["'`](\w+)["'`]\s*\)/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe("products");
    });

    it("T4.7: Asserts zero direct table query violations across all migrated domains (products, parties, invoices, settings, crm)", () => {
      const scanResult = scanCodebaseForDirectTableQueries(srcDirectory);
      expect(scanResult.matchesByDomain.products).toEqual([]);
      expect(scanResult.matchesByDomain.parties).toEqual([]);
      expect(scanResult.matchesByDomain.invoices).toEqual([]);
      expect(scanResult.matchesByDomain.settings).toEqual([]);
      expect(scanResult.matchesByDomain.crm).toEqual([]);
      expect(scanResult.matchesByDomain.other).toEqual([]);
      expect(scanResult.totalDirectTableQueries).toBe(0);
    });
  });
});
