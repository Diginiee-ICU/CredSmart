import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
} from "@/lib/apiClient";

// ============================================================================
// 1. Supabase Mock Setup
// ============================================================================

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

// ============================================================================
// 2. Test Suite
// ============================================================================

describe("Centralized API Client & Auth Interceptor (`src/lib/apiClient.ts`)", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    localStorage.clear();
    setApiBaseUrl(null);
    delete (window as any).__API_BASE_URL__;

    // Default mock behaviors
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-jwt-token-alpha",
        },
      },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-refreshed-jwt-token-beta",
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Base URL & URL Construction Tests
  // --------------------------------------------------------------------------
  describe("Base URL & URL Construction", () => {
    it("1. defaults to https://api.credsmart.online/api when no overrides are set", () => {
      expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
      expect(DEFAULT_API_BASE_URL).toBe("https://api.credsmart.online/api");
    });

    it("2. allows runtime override via window.__API_BASE_URL__", () => {
      (window as any).__API_BASE_URL__ = "https://staging.credsmart.online/api";
      expect(getApiBaseUrl()).toBe("https://staging.credsmart.online/api");
    });

    it("3. allows programmatic override via setApiBaseUrl", () => {
      setApiBaseUrl("https://custom-api.credsmart.internal/api");
      expect(getApiBaseUrl()).toBe("https://custom-api.credsmart.internal/api");
      setApiBaseUrl(null);
      expect(getApiBaseUrl()).toBe(DEFAULT_API_BASE_URL);
    });

    it("4. handles leading slashes and relative endpoint paths cleanly", () => {
      expect(buildApiUrl("products")).toBe("https://api.credsmart.online/api/products");
      expect(buildApiUrl("/products")).toBe("https://api.credsmart.online/api/products");
      expect(buildApiUrl("/crm/attendance")).toBe("https://api.credsmart.online/api/crm/attendance");
    });

    it("5. preserves fully-qualified absolute URLs without prepending base URL", () => {
      const externalUrl = "https://external-service.org/v2/webhooks";
      expect(buildApiUrl(externalUrl)).toBe(externalUrl);
    });

    it("6. correctly serializes query parameters and strips null/undefined", () => {
      const url = buildApiUrl("/products", {
        category: "Beverages",
        page: 1,
        inStock: true,
        empty: undefined,
        nothing: null,
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe("https://api.credsmart.online");
      expect(parsed.pathname).toBe("/api/products");
      expect(parsed.searchParams.get("category")).toBe("Beverages");
      expect(parsed.searchParams.get("page")).toBe("1");
      expect(parsed.searchParams.get("inStock")).toBe("true");
      expect(parsed.searchParams.has("empty")).toBe(false);
      expect(parsed.searchParams.has("nothing")).toBe(false);
    });

    it("7. correctly serializes array query parameters and preserves existing search params", () => {
      const url = buildApiUrl("/products?sort=name", {
        tags: ["featured", "discounted"],
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.get("sort")).toBe("name");
      expect(parsed.searchParams.getAll("tags")).toEqual(["featured", "discounted"]);
    });
  });

  // --------------------------------------------------------------------------
  // Header Propagation & Context Isolation Tests
  // --------------------------------------------------------------------------
  describe("Header Propagation & Auth Injection", () => {
    it("8. automatically retrieves Supabase active session token and attaches Bearer authorization header", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ data: { id: "1" } }), { status: 200 });
      });

      const res = await apiClient("/products");

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest?.headers.get("Authorization")).toBe("Bearer test-jwt-token-alpha");
      expect(capturedRequest?.headers.get("Accept")).toBe("application/json");
      expect(res.data).toEqual({ id: "1" });
      expect(res.error).toBeNull();
    });

    it("9. skips token retrieval and Authorization header when skipAuth is true", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ data: { public: true } }), { status: 200 });
      });

      const res = await apiClient("/public/health", { skipAuth: true });

      expect(mockGetSession).not.toHaveBeenCalled();
      expect(capturedRequest?.headers.get("Authorization")).toBeNull();
      expect(res.data).toEqual({ public: true });
    });

    it("10. preserves caller-supplied Authorization header without overwriting", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      await apiClient("/custom-auth", {
        headers: { Authorization: "ApiKey secret_123" },
      });

      expect(capturedRequest?.headers.get("Authorization")).toBe("ApiKey secret_123");
    });

    it("11. automatically attaches x-organization-id header from localStorage", async () => {
      localStorage.setItem("credsmart_active_org_id", "org_tenant_999");

      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await apiClient("/customers");

      expect(capturedRequest?.headers.get("x-organization-id")).toBe("org_tenant_999");
    });

    it("12. options.organizationId overrides localStorage value", async () => {
      localStorage.setItem("credsmart_active_org_id", "org_tenant_999");

      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      });

      await apiClient("/customers", { organizationId: "org_override_888" });

      expect(capturedRequest?.headers.get("x-organization-id")).toBe("org_override_888");
    });

    it("13. options.organizationId: null explicitly suppresses the x-organization-id header", async () => {
      localStorage.setItem("credsmart_active_org_id", "org_tenant_999");

      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      await apiClient("/global/organizations", { organizationId: null });

      expect(capturedRequest?.headers.get("x-organization-id")).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // HTTP Verbs & Helper Function Tests
  // --------------------------------------------------------------------------
  describe("HTTP Verbs & Payload Serialization", () => {
    it("14. apiGet sends GET request with params serialized in query string", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ data: ["item1", "item2"] }), { status: 200 });
      });

      const res = await apiGet<string[]>("/items", { limit: 10 });

      expect(capturedRequest?.method).toBe("GET");
      expect(capturedRequest?.url).toContain("limit=10");
      expect(res.data).toEqual(["item1", "item2"]);
      expect(res.error).toBeNull();
    });

    it("15. apiPost serializes JSON body and sets Content-Type: application/json", async () => {
      let capturedRequest: Request | undefined;
      let rawBody = "";
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        rawBody = (init?.body as string) || "";
        return new Response(JSON.stringify({ id: "prod_1", name: "Biscuits" }), { status: 201 });
      });

      const payload = { name: "Biscuits", price: 20 };
      const res = await apiPost<{ id: string; name: string }>("/products", payload);

      expect(capturedRequest?.method).toBe("POST");
      expect(capturedRequest?.headers.get("Content-Type")).toBe("application/json");
      expect(JSON.parse(rawBody)).toEqual(payload);
      expect(res.data).toEqual({ id: "prod_1", name: "Biscuits" });
      expect(res.error).toBeNull();
    });

    it("16. apiPut serializes JSON body and executes PUT method", async () => {
      let capturedRequest: Request | undefined;
      let rawBody = "";
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        rawBody = (init?.body as string) || "";
        return new Response(JSON.stringify({ updated: true }), { status: 200 });
      });

      const updateData = { name: "Updated Name" };
      const res = await apiPut<{ updated: boolean }>("/products/prod_1", updateData);

      expect(capturedRequest?.method).toBe("PUT");
      expect(capturedRequest?.headers.get("Content-Type")).toBe("application/json");
      expect(JSON.parse(rawBody)).toEqual(updateData);
      expect(res.data).toEqual({ updated: true });
    });

    it("17. apiPatch serializes JSON body and executes PATCH method", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ patched: true }), { status: 200 });
      });

      const res = await apiPatch<{ patched: boolean }>("/products/prod_1", { stock: 50 });

      expect(capturedRequest?.method).toBe("PATCH");
      expect(res.data).toEqual({ patched: true });
    });

    it("18. apiDelete executes DELETE method", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });

      const res = await apiDelete<{ success: boolean }>("/products/prod_1");

      expect(capturedRequest?.method).toBe("DELETE");
      expect(res.data).toEqual({ success: true });
    });

    it("19. does not overwrite Content-Type when sending FormData", async () => {
      let capturedRequest: Request | undefined;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedRequest = new Request(input, init);
        return new Response(JSON.stringify({ uploaded: true }), { status: 200 });
      });

      const formData = new FormData();
      formData.append("file", "dummy-content");

      await apiPost("/upload", formData);

      // Fetch automatically sets multipart/form-data boundary when Content-Type is not explicitly forced
      expect(capturedRequest?.headers.get("Content-Type")).not.toBe("application/json");
    });
  });

  // --------------------------------------------------------------------------
  // Response Envelope Normalization Tests
  // --------------------------------------------------------------------------
  describe("Response Normalization", () => {
    it("20. unwraps backend response envelope when payload has { data: ... }", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: [{ id: "inv_1", total: 1000 }],
            meta: { totalCount: 1 },
          }),
          { status: 200 }
        );
      });

      const res = await apiClient<Array<{ id: string; total: number }>>("/sales");

      expect(res.error).toBeNull();
      expect(res.data).toEqual([{ id: "inv_1", total: 1000 }]);
    });

    it("21. handles direct array or object payload returns gracefully", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify(["PCS", "BOX", "KG"]), { status: 200 });
      });

      const res = await apiClient<string[]>("/units");

      expect(res.error).toBeNull();
      expect(res.data).toEqual(["PCS", "BOX", "KG"]);
    });

    it("22. handles HTTP 204 No Content with { data: null, error: null }", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(null, { status: 204 });
      });

      const res = await apiClient("/sessions/logout", { method: "POST" });

      expect(res.data).toBeNull();
      expect(res.error).toBeNull();
    });

    it("23. handles empty body response with status 200", async () => {
      global.fetch = vi.fn(async () => {
        return new Response("", { status: 200 });
      });

      const res = await apiClient("/ping");

      expect(res.data).toBeNull();
      expect(res.error).toBeNull();
    });

    it("24. handles non-JSON plain text response", async () => {
      global.fetch = vi.fn(async () => {
        return new Response("OK - Healthy", { status: 200, headers: { "Content-Type": "text/plain" } });
      });

      const res = await apiClient<string>("/health");

      expect(res.data).toBe("OK - Healthy");
      expect(res.error).toBeNull();
    });

    it("25. detects API-level error returned inside HTTP 200 response envelope", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: { message: "Tally server offline", code: "TALLY_OFFLINE" },
          }),
          { status: 200 }
        );
      });

      const res = await apiClient("/tally/status");

      expect(res.data).toBeNull();
      expect(res.error).toEqual({
        message: "Tally server offline",
        code: "TALLY_OFFLINE",
        status: 200,
        details: expect.any(Object),
      });
    });
  });

  // --------------------------------------------------------------------------
  // Error Normalization Tests (400, 404, 500)
  // --------------------------------------------------------------------------
  describe("Error Normalization", () => {
    it("26. normalizes HTTP 400 Bad Request with structured JSON error", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Duplicate barcode detected: 8901234567890",
              code: "DUPLICATE_BARCODE",
            },
          }),
          {
            status: 400,
            statusText: "Bad Request",
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await apiClient("/products", { method: "POST", body: { barcode: "8901234567890" } });

      expect(res.data).toBeNull();
      expect(res.error).toEqual({
        message: "Duplicate barcode detected: 8901234567890",
        code: "DUPLICATE_BARCODE",
        status: 400,
        details: expect.objectContaining({
          error: { message: "Duplicate barcode detected: 8901234567890", code: "DUPLICATE_BARCODE" },
        }),
      });
    });

    it("27. normalizes HTTP 404 Not Found error response", async () => {
      global.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({ message: "Product not found" }),
          {
            status: 404,
            statusText: "Not Found",
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      const res = await apiClient("/products/non_existent_id");

      expect(res.data).toBeNull();
      expect(res.error).toEqual({
        message: "Product not found",
        code: "HTTP_404",
        status: 404,
        details: { message: "Product not found" },
      });
    });

    it("28. normalizes HTTP 500 Internal Server Error with HTML/plain-text response", async () => {
      global.fetch = vi.fn(async () => {
        return new Response("<html>500 Internal Server Error</html>", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "Content-Type": "text/html" },
        });
      });

      const res = await apiClient("/crash");

      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(500);
      expect(res.error?.code).toBe("HTTP_500");
      expect(res.error?.message).toContain("500 Internal Server Error");
    });
  });

  // --------------------------------------------------------------------------
  // 401 Unauthorized Token Refresh & Retry Tests
  // --------------------------------------------------------------------------
  describe("401 Automatic Token Refresh & Single Retry Flow", () => {
    it("29. automatically refreshes session on 401 and retries request with new access token", async () => {
      let callCount = 0;
      const capturedAuthHeaders: string[] = [];

      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        callCount++;
        const auth = new Headers(init?.headers).get("Authorization") || "";
        capturedAuthHeaders.push(auth);

        if (callCount === 1) {
          // First attempt fails with 401
          return new Response(
            JSON.stringify({ message: "Token expired" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }

        // Second attempt (retry) succeeds with 200
        return new Response(
          JSON.stringify({ data: { restored: true } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const res = await apiClient<{ restored: boolean }>("/protected/data");

      // Verify execution sequence
      expect(callCount).toBe(2);
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(capturedAuthHeaders[0]).toBe("Bearer test-jwt-token-alpha");
      expect(capturedAuthHeaders[1]).toBe("Bearer test-refreshed-jwt-token-beta");
      expect(res.data).toEqual({ restored: true });
      expect(res.error).toBeNull();
    });

    it("30. does not loop infinitely if retry after refresh still returns 401", async () => {
      let callCount = 0;

      global.fetch = vi.fn(async () => {
        callCount++;
        return new Response(
          JSON.stringify({ message: "Invalid credentials" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      });

      const res = await apiClient("/protected/persistent-failure");

      expect(callCount).toBe(2); // Exactly 1 retry
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
      expect(res.data).toBeNull();
      expect(res.error?.status).toBe(401);
      expect(res.error?.message).toBe("Invalid credentials");
    });

    it("31. does not attempt token refresh when skipAuth is true on 401", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      });

      const res = await apiClient("/public/locked", { skipAuth: true });

      expect(callCount).toBe(1);
      expect(mockRefreshSession).not.toHaveBeenCalled();
      expect(res.error?.status).toBe(401);
    });
  });

  // --------------------------------------------------------------------------
  // Network Failure & Timeout Tests
  // --------------------------------------------------------------------------
  describe("Network Failure & Timeout Handling", () => {
    it("32. catches fetch network exceptions and normalizes to NETWORK_ERROR", async () => {
      global.fetch = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });

      const res = await apiClient("/offline-endpoint");

      expect(res.data).toBeNull();
      expect(res.error).toEqual({
        message: "Failed to fetch",
        code: "NETWORK_ERROR",
        status: 0,
        details: expect.any(TypeError),
      });
    });

    it("33. normalizes AbortController signal aborts to ABORTED error code", async () => {
      const controller = new AbortController();
      controller.abort();

      global.fetch = vi.fn(async (_input, init) => {
        if (init?.signal?.aborted) {
          const err = new DOMException("The user aborted a request.", "AbortError");
          throw err;
        }
        return new Response("ok", { status: 200 });
      });

      const res = await apiClient("/cancelled", { signal: controller.signal });

      expect(res.data).toBeNull();
      expect(res.error?.code).toBe("ABORTED");
      expect(res.error?.status).toBe(0);
      expect(res.error?.message).toContain("aborted");
    });

    it("34. enforces timeout option when request takes longer than specified timeout", async () => {
      global.fetch = vi.fn(async (_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      });

      const res = await apiClient("/slow-endpoint", { timeout: 50 });

      expect(res.data).toBeNull();
      expect(res.error?.code).toBe("ABORTED");
      expect(res.error?.status).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Boundary & Failure Mode Stress Tests (Empirical Challenger)
  // --------------------------------------------------------------------------
  describe("Boundary Conditions & Failure Modes", () => {
    // Group 1: Malformed JSON responses from server (e.g. HTML 502/504 Bad Gateway page)
    describe("Malformed JSON & Server Error Pages", () => {
      it("35. handles HTML 502 Bad Gateway response with text/html content-type gracefully", async () => {
        const htmlBody = `<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center><hr><center>cloudflare</center></body></html>`;
        global.fetch = vi.fn(async () => {
          return new Response(htmlBody, {
            status: 502,
            statusText: "Bad Gateway",
            headers: { "Content-Type": "text/html" },
          });
        });

        const res = await apiClient("/gateway-test");

        expect(res.data).toBeNull();
        expect(res.error).toBeDefined();
        expect(res.error?.status).toBe(502);
        expect(res.error?.code).toBe("HTTP_502");
        expect(res.error?.message).toContain("502 Bad Gateway");
        expect(res.error?.details).toEqual({ message: htmlBody });
      });

      it("36. handles HTML 504 Gateway Timeout when Content-Type falsely claims application/json without throwing JSON parse error", async () => {
        const nginxHtml = `<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center><hr><center>nginx/1.24.0</center></body></html>`;
        global.fetch = vi.fn(async () => {
          return new Response(nginxHtml, {
            status: 504,
            statusText: "Gateway Time-out",
            headers: { "Content-Type": "application/json" }, // Mismatched content-type header
          });
        });

        const res = await apiClient("/timeout-endpoint");

        expect(res.data).toBeNull();
        expect(res.error).toBeDefined();
        expect(res.error?.status).toBe(504);
        expect(res.error?.code).toBe("HTTP_504");
        expect(res.error?.message).toBe("Gateway Time-out");
        expect(res.error?.details).toBeNull();
      });

      it("37. handles 503 Service Unavailable with plain text body", async () => {
        global.fetch = vi.fn(async () => {
          return new Response("Service Temporarily Unavailable", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        });

        const res = await apiClient("/service-down");

        expect(res.data).toBeNull();
        expect(res.error?.status).toBe(503);
        expect(res.error?.code).toBe("HTTP_503");
        expect(res.error?.message).toBe("Service Temporarily Unavailable");
      });

      it("38. handles HTTP 200 OK with truncated/corrupted JSON string gracefully without throwing unhandled exceptions", async () => {
        const corruptJson = `{"status": "ok", "items": [{"id": 1, "name": "incomplete`;
        global.fetch = vi.fn(async () => {
          return new Response(corruptJson, {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          });
        });

        const res = await apiClient<string>("/corrupt-json");

        // When JSON.parse fails on a 200, it falls back to returning the raw responseText
        expect(res.error).toBeNull();
        expect(res.data).toBe(corruptJson);
      });

      it("39. handles HTTP 500 with completely empty body", async () => {
        global.fetch = vi.fn(async () => {
          return new Response("", {
            status: 500,
            statusText: "Internal Server Error",
            headers: { "Content-Type": "application/json" },
          });
        });

        const res = await apiClient("/empty-error");

        expect(res.data).toBeNull();
        expect(res.error?.status).toBe(500);
        expect(res.error?.code).toBe("HTTP_500");
        expect(res.error?.message).toBe("Internal Server Error");
      });
    });

    // Group 2: Empty body 204 No Content responses
    describe("Empty Body & 204 No Content", () => {
      it("40. handles HTTP 204 No Content for DELETE request via apiDelete", async () => {
        global.fetch = vi.fn(async () => {
          return new Response(null, { status: 204, statusText: "No Content" });
        });

        const res = await apiDelete("/products/item-to-remove");

        expect(res.data).toBeNull();
        expect(res.error).toBeNull();
      });

      it("41. handles HTTP 204 No Content for POST request via apiPost", async () => {
        global.fetch = vi.fn(async () => {
          return new Response(null, { status: 204, statusText: "No Content" });
        });

        const res = await apiPost("/actions/trigger-background-sync", { sync: true });

        expect(res.data).toBeNull();
        expect(res.error).toBeNull();
      });

      it("42. handles HTTP 204 with explicit Content-Length: 0 header", async () => {
        global.fetch = vi.fn(async () => {
          return new Response(null, {
            status: 204,
            statusText: "No Content",
            headers: { "Content-Length": "0" },
          });
        });

        const res = await apiClient("/empty-204-content-length");

        expect(res.data).toBeNull();
        expect(res.error).toBeNull();
      });

      it("43. handles HTTP 204 No Content for PUT and PATCH requests via apiPut and apiPatch", async () => {
        global.fetch = vi.fn(async () => {
          return new Response(null, { status: 204, statusText: "No Content" });
        });

        const putRes = await apiPut("/products/item-123/touch");
        expect(putRes.data).toBeNull();
        expect(putRes.error).toBeNull();

        const patchRes = await apiPatch("/products/item-123/touch");
        expect(patchRes.data).toBeNull();
        expect(patchRes.error).toBeNull();
      });
    });

    // Group 3: Special characters and Unicode in query parameters
    describe("Special Characters & Unicode in Query Parameters", () => {
      it("44. correctly serializes Devanagari (Hindi) and CJK (Japanese/Chinese) query parameters", () => {
        const url = buildApiUrl("/crm/search", {
          party: "खाता_धारक_१२३",
          invoice: "請求書_2026",
          city: "मुंबई",
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.get("party")).toBe("खाता_धारक_१२३");
        expect(parsed.searchParams.get("invoice")).toBe("請求書_2026");
        expect(parsed.searchParams.get("city")).toBe("मुंबई");
        // Verify URL encoded form in raw string
        expect(url).toContain(encodeURIComponent("खाता_धारक_१२३"));
        expect(url).toContain(encodeURIComponent("請求書_2026"));
      });

      it("45. correctly serializes Emojis and multi-byte currency symbols in query parameters", () => {
        const url = buildApiUrl("/transactions", {
          tag: "💰💎🚀",
          currencySymbol: "₹",
          note: "Paid in full € & $",
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.get("tag")).toBe("💰💎🚀");
        expect(parsed.searchParams.get("currencySymbol")).toBe("₹");
        expect(parsed.searchParams.get("note")).toBe("Paid in full € & $");
      });

      it("46. safely encodes URL reserved characters (&, =, ?, #, /, +, %, @, ;, space) without breaking query structure", () => {
        const url = buildApiUrl("/search", {
          q: "salt & pepper = tasty? 100% #1 / hot+cold @home; test",
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.get("q")).toBe("salt & pepper = tasty? 100% #1 / hot+cold @home; test");
        // URLSearchParams must encode # as %23 and & as %26 so query parsing doesn't split keys
        expect(url).toContain("%231");
        expect(url).toContain("%26");
      });

      it("47. preserves empty string query parameters while omitting null and undefined", () => {
        const url = buildApiUrl("/filter", {
          query: "",
          validZero: 0,
          validFalse: false,
          missingNull: null,
          missingUndefined: undefined,
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.has("query")).toBe(true);
        expect(parsed.searchParams.get("query")).toBe("");
        expect(parsed.searchParams.get("validZero")).toBe("0");
        expect(parsed.searchParams.get("validFalse")).toBe("false");
        expect(parsed.searchParams.has("missingNull")).toBe(false);
        expect(parsed.searchParams.has("missingUndefined")).toBe(false);
      });

      it("48. correctly encodes structured keys with brackets and signs", () => {
        const url = buildApiUrl("/reports", {
          "filter[date][$gte]": "2026-01-01",
          sort: "-created_at",
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.get("filter[date][$gte]")).toBe("2026-01-01");
        expect(parsed.searchParams.get("sort")).toBe("-created_at");
      });

      it("49. handles arrays of Unicode strings in query parameters", () => {
        const url = buildApiUrl("/items", {
          categories: ["फल", "सब्जियां", "अनाज"],
        });

        const parsed = new URL(url);
        expect(parsed.searchParams.getAll("categories")).toEqual(["फल", "सब्जियां", "अनाज"]);
      });
    });

    // Group 4: Extremely large JSON payloads (e.g. 1000 items)
    describe("Large Payloads & Stress Testing", () => {
      it("50. parses extremely large JSON array response of 1,000 complex items with high fidelity", async () => {
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `item_${i + 1}`,
          sku: `SKU-${100000 + i}`,
          name: `Product Item ${i + 1} with Indian Spices & Grains (खाद्य सामग्री)`,
          hsn: "19059020",
          price: 199.99 + i,
          taxPercent: 18,
          active: i % 2 === 0,
          batches: [
            { batchId: `b1_${i}`, batchNumber: `BATCH-${i}-A`, stock: 50 },
            { batchId: `b2_${i}`, batchNumber: `BATCH-${i}-B`, stock: 150 },
          ],
          metadata: {
            tags: ["grocery", "bulk", "imported"],
            supplier: `Supplier ${i % 10}`,
            rating: 4.85,
          },
        }));

        global.fetch = vi.fn(async () => {
          return new Response(JSON.stringify(largeDataset), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        });

        const startTime = performance.now();
        const res = await apiClient<typeof largeDataset>("/products/large");
        const elapsedMs = performance.now() - startTime;

        expect(res.error).toBeNull();
        expect(Array.isArray(res.data)).toBe(true);
        expect(res.data?.length).toBe(1000);
        expect(res.data?.[0].sku).toBe("SKU-100000");
        expect(res.data?.[999].sku).toBe("SKU-100999");
        expect(res.data?.[500].batches.length).toBe(2);
        expect(elapsedMs).toBeLessThan(1000); // Efficient execution
      });

      it("51. correctly unwraps large 1,000-item response wrapped in backend envelope with meta", async () => {
        const items = Array.from({ length: 1000 }, (_, i) => ({
          id: `inv_${i}`,
          invoiceNumber: `INV-2026-${10000 + i}`,
          amount: 5400 + i,
          status: "paid",
        }));

        global.fetch = vi.fn(async () => {
          return new Response(
            JSON.stringify({
              data: items,
              meta: { totalCount: 1000, page: 1, limit: 1000 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        });

        const res = await apiClient<typeof items>("/sales/bulk");

        expect(res.error).toBeNull();
        expect(res.data?.length).toBe(1000);
        expect(res.data?.[999].invoiceNumber).toBe("INV-2026-10999");
      });

      it("52. serializes and transmits large JSON request payload of 1,000 items in apiPost without corruption", async () => {
        let capturedRawBody = "";
        let capturedContentType: string | null = null;

        global.fetch = vi.fn(async (_input, init) => {
          capturedContentType = new Headers(init?.headers).get("Content-Type");
          capturedRawBody = (init?.body as string) || "";
          return new Response(JSON.stringify({ inserted: 1000, updated: 0 }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        });

        const largeImportPayload = Array.from({ length: 1000 }, (_, i) => ({
          name: `Bulk Item ${i + 1}`,
          sku: `IMPORT-SKU-${i}`,
          openingStock: 100,
          purchasePrice: 45.5,
          sellingPrice: 75.0,
        }));

        const res = await apiPost<{ inserted: number; updated: number }>(
          "/products/bulk-import",
          largeImportPayload
        );

        expect(capturedContentType).toBe("application/json");
        expect(res.data).toEqual({ inserted: 1000, updated: 0 });
        expect(res.error).toBeNull();

        const deserialized = JSON.parse(capturedRawBody);
        expect(Array.isArray(deserialized)).toBe(true);
        expect(deserialized.length).toBe(1000);
        expect(deserialized[999].sku).toBe("IMPORT-SKU-999");
      });

      it("53. stress-tests 5,000 item payload parsing performance within tight latency bounds", async () => {
        const stressItems = Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          code: `CODE_${i}`,
          val: i * 1.5,
        }));

        global.fetch = vi.fn(async () => {
          return new Response(JSON.stringify({ data: stressItems, status: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        });

        const t0 = performance.now();
        const res = await apiClient<typeof stressItems>("/stress/5000");
        const t1 = performance.now();

        expect(res.error).toBeNull();
        expect(res.data?.length).toBe(5000);
        expect(t1 - t0).toBeLessThan(1000); // Sub-second parse & unwrap for 5000 items
      });
    });
  });
});
