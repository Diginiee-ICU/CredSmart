import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  setApiBaseUrl,
} from "@/lib/apiClient";

// ============================================================================
// Supabase Mock Setup
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

describe("Adversarial Stress Test Suite: apiClient (`src/lib/apiClient.ts`)", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    localStorage.clear();
    setApiBaseUrl(null);
    delete (window as any).__API_BASE_URL__;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "stress-test-jwt-token-initial",
        },
      },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "stress-test-jwt-token-refreshed",
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Dimension 1: 50 Concurrent Requests & Race Condition Resistance
  // ==========================================================================
  describe("Dimension 1: 50 Concurrent Requests & Race Condition Resistance", () => {
    it("1.1 dispatches 50 simultaneous requests with random jitter without token loss or corruption", async () => {
      const concurrencyCount = 50;
      const capturedTokens: string[] = [];
      const capturedOrgIds: string[] = [];

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        // Simulate real-world network latency jitter (5ms - 25ms)
        const delay = Math.floor(Math.random() * 20) + 5;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const headers = new Headers(init?.headers);
        const auth = headers.get("Authorization") || "";
        const org = headers.get("x-organization-id") || "";
        capturedTokens.push(auth);
        capturedOrgIds.push(org);

        const url = String(input);
        return new Response(JSON.stringify({ data: { url, success: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const promises = Array.from({ length: concurrencyCount }, (_, i) =>
        apiClient<{ url: string; success: boolean }>(`/items/${i}`, {
          organizationId: `org_${i % 5}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrencyCount);
      expect(capturedTokens).toHaveLength(concurrencyCount);

      // Verify every request received the valid token
      for (const token of capturedTokens) {
        expect(token).toBe("Bearer stress-test-jwt-token-initial");
      }

      // Verify results are all successful with 0 errors
      for (let i = 0; i < concurrencyCount; i++) {
        expect(results[i].error).toBeNull();
        expect(results[i].data?.success).toBe(true);
        expect(results[i].data?.url).toContain(`/items/${i}`);
      }

      // Verify organization contexts did not leak or collide
      const expectedOrgIds = Array.from({ length: concurrencyCount }, (_, i) => `org_${i % 5}`);
      expect(capturedOrgIds.sort()).toEqual(expectedOrgIds.sort());
    });

    it("1.2 handles variable delay in supabase.auth.getSession across 50 concurrent requests", async () => {
      let getSessionCallCount = 0;
      mockGetSession.mockImplementation(async () => {
        getSessionCallCount++;
        // Simulate async delay in session storage retrieval
        const delay = Math.floor(Math.random() * 15) + 5;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return {
          data: {
            session: {
              access_token: `token-call-${getSessionCallCount}`,
            },
          },
          error: null,
        };
      });

      const capturedAuthHeaders: string[] = [];
      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        capturedAuthHeaders.push(headers.get("Authorization") || "");
        return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
      });

      const requests = Array.from({ length: 50 }, (_, i) => apiClient(`/resource/${i}`));
      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(50);
      expect(capturedAuthHeaders).toHaveLength(50);
      for (const res of responses) {
        expect(res.error).toBeNull();
        expect(res.data).toEqual({ ok: true });
      }
      for (const auth of capturedAuthHeaders) {
        expect(auth).toMatch(/^Bearer token-call-\d+$/);
      }
    });

    it("1.3 executes 50 concurrent requests with mixed HTTP methods without header or body contamination", async () => {
      const capturedRequests: Array<{ method: string; url: string; body: any; auth: string }> = [];

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        let parsedBody: any = null;
        if (init?.body && typeof init.body === "string") {
          try {
            parsedBody = JSON.parse(init.body);
          } catch {
            parsedBody = init.body;
          }
        }
        capturedRequests.push({
          method: init?.method || "GET",
          url: String(input),
          body: parsedBody,
          auth: headers.get("Authorization") || "",
        });
        return new Response(JSON.stringify({ data: { echoed: parsedBody, method: init?.method } }), {
          status: 200,
        });
      });

      const operations = Array.from({ length: 50 }, (_, i) => {
        const mod = i % 5;
        if (mod === 0) return apiGet(`/entities/${i}`, { filter: `val_${i}` });
        if (mod === 1) return apiPost(`/entities/${i}`, { payloadId: i, type: "POST" });
        if (mod === 2) return apiPut(`/entities/${i}`, { payloadId: i, type: "PUT" });
        if (mod === 3) return apiPatch(`/entities/${i}`, { payloadId: i, type: "PATCH" });
        return apiDelete(`/entities/${i}`);
      });

      const responses = await Promise.all(operations);

      expect(responses).toHaveLength(50);
      expect(capturedRequests).toHaveLength(50);

      for (let i = 0; i < 50; i++) {
        const req = capturedRequests.find((r) => r.url.includes(`/entities/${i}`));
        expect(req).toBeDefined();
        const mod = i % 5;
        if (mod === 0) {
          expect(req?.method).toBe("GET");
          expect(req?.url).toContain(`filter=val_${i}`);
        } else if (mod === 1) {
          expect(req?.method).toBe("POST");
          expect(req?.body).toEqual({ payloadId: i, type: "POST" });
        } else if (mod === 2) {
          expect(req?.method).toBe("PUT");
          expect(req?.body).toEqual({ payloadId: i, type: "PUT" });
        } else if (mod === 3) {
          expect(req?.method).toBe("PATCH");
          expect(req?.body).toEqual({ payloadId: i, type: "PATCH" });
        } else {
          expect(req?.method).toBe("DELETE");
        }
      }
    });
  });

  // ==========================================================================
  // Dimension 2: Concurrent 401 Expiration & Refresh Storm
  // ==========================================================================
  describe("Dimension 2: Concurrent 401 Expiration & Refresh Storm", () => {
    it("2.1 handles 50 concurrent 401 responses, refreshing session and completing retries without infinite loops", async () => {
      let firstAttemptCount = 0;
      let retryAttemptCount = 0;

      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        const auth = headers.get("Authorization");

        // Simulate async network latency
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10) + 2));

        if (auth === "Bearer stress-test-jwt-token-initial") {
          firstAttemptCount++;
          return new Response(JSON.stringify({ error: { message: "Token expired", code: "TOKEN_EXPIRED" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (auth === "Bearer stress-test-jwt-token-refreshed") {
          retryAttemptCount++;
          return new Response(JSON.stringify({ data: { success: true, refreshed: true } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        throw new Error(`Unexpected auth header: ${auth}`);
      });

      const promises = Array.from({ length: 50 }, (_, i) => apiClient(`/secure-endpoint/${i}`));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(firstAttemptCount).toBe(50);
      expect(retryAttemptCount).toBe(50);

      // Verify every request received the successful retried data
      for (const res of results) {
        expect(res.error).toBeNull();
        expect(res.data).toEqual({ success: true, refreshed: true });
      }
    });

    it("2.2 safely terminates when retried request also returns 401 (strictly 1 retry, no infinite loop)", async () => {
      let callCount = 0;

      global.fetch = vi.fn(async () => {
        callCount++;
        return new Response(JSON.stringify({ message: "Invalid session credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      const promises = Array.from({ length: 30 }, (_, i) => apiClient(`/locked-resource/${i}`));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(30);
      // Each request must make exactly 2 calls: initial + 1 retry = 60 calls total
      expect(callCount).toBe(60);

      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error).not.toBeNull();
        expect(res.error?.status).toBe(401);
        expect(res.error?.message).toBe("Invalid session credentials");
      }
    });

    it("2.3 handles 50 concurrent 401s when token refresh itself fails with error", async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Refresh token is revoked or expired" },
      });

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        return new Response(JSON.stringify({ message: "Session expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      const promises = Array.from({ length: 50 }, (_, i) => apiClient(`/profile/${i}`));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      // When refresh fails, no retry should be attempted: exactly 50 calls
      expect(callCount).toBe(50);

      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error?.status).toBe(401);
      }
    });

    it("2.4 handles 50 concurrent 401s when refreshSession throws an unhandled exception", async () => {
      mockRefreshSession.mockRejectedValue(new Error("Supabase auth service unreachable"));

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        return new Response(JSON.stringify({ message: "JWT expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      });

      const promises = Array.from({ length: 50 }, () => apiClient("/profile"));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(callCount).toBe(50);

      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error?.status).toBe(401);
        expect(res.error?.message).toBe("JWT expired");
      }
    });

    it("2.5 handles mixed concurrent batch (25 succeed immediately, 25 require 401 refresh)", async () => {
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        const auth = headers.get("Authorization");

        if (url.includes("/public-pass/")) {
          return new Response(JSON.stringify({ data: { type: "pass" } }), { status: 200 });
        }

        if (url.includes("/expire-pass/")) {
          if (auth === "Bearer stress-test-jwt-token-initial") {
            return new Response(JSON.stringify({ message: "Expired" }), { status: 401 });
          }
          return new Response(JSON.stringify({ data: { type: "refreshed" } }), { status: 200 });
        }

        return new Response(JSON.stringify({ data: null }), { status: 200 });
      });

      const mixedRequests = Array.from({ length: 50 }, (_, i) => {
        if (i % 2 === 0) {
          return apiClient<{ type: string }>(`/public-pass/${i}`);
        } else {
          return apiClient<{ type: string }>(`/expire-pass/${i}`);
        }
      });

      const results = await Promise.all(mixedRequests);

      for (let i = 0; i < 50; i++) {
        expect(results[i].error).toBeNull();
        if (i % 2 === 0) {
          expect(results[i].data?.type).toBe("pass");
        } else {
          expect(results[i].data?.type).toBe("refreshed");
        }
      }
    });
  });

  // ==========================================================================
  // Dimension 3: Flaky Network Simulation & Edge Cases
  // ==========================================================================
  describe("Dimension 3: Flaky Network Simulation & Edge Cases", () => {
    it("3.1 catches network dropouts (Failed to fetch, ECONNRESET, ETIMEDOUT) across concurrent requests", async () => {
      const errorTypes = [
        new TypeError("Failed to fetch"),
        new Error("read ECONNRESET"),
        new Error("connect ETIMEDOUT 104.21.60.10:443"),
        new Error("socket hang up"),
      ];

      global.fetch = vi.fn(async (_input: RequestInfo | URL) => {
        const chosenErr = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        throw chosenErr;
      });

      const promises = Array.from({ length: 40 }, (_, i) => apiClient(`/flaky/${i}`));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(40);
      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error).toBeDefined();
        expect(res.error?.code).toBe("NETWORK_ERROR");
        expect(res.error?.status).toBe(0);
        expect(typeof res.error?.message).toBe("string");
      }
    });

    it("3.2 reliably enforces timeout on slow or hanging connections under concurrent load", async () => {
      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              const domErr = new DOMException("The user aborted a request.", "AbortError");
              reject(domErr);
            });
          }
          // Do not resolve (hanging connection)
        });
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 20 }, (_, i) =>
        apiClient(`/slow-hanging/${i}`, { timeout: 40 })
      );

      const results = await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      expect(results).toHaveLength(20);
      // Verify all completed roughly around the timeout threshold (allowing execution margin)
      expect(elapsed).toBeLessThan(1500);

      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error?.code).toBe("ABORTED");
        expect(res.error?.status).toBe(0);
        expect(res.error?.message).toContain("Request timed out or was aborted");
      }
    });

    it("3.3 handles client abort signal triggered mid-flight across multiple requests", async () => {
      const controllers = Array.from({ length: 10 }, () => new AbortController());

      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal) {
            if (init.signal.aborted) {
              reject(new DOMException("The operation was aborted.", "AbortError"));
              return;
            }
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      });

      const promises = controllers.map((c, i) =>
        apiClient(`/cancellable/${i}`, { signal: c.signal })
      );

      // Trigger abort immediately for all
      controllers.forEach((c) => c.abort());

      const results = await Promise.all(promises);

      for (const res of results) {
        expect(res.data).toBeNull();
        expect(res.error?.code).toBe("ABORTED");
        expect(res.error?.status).toBe(0);
      }
    });

    it("3.4 handles network failure during 401 retry execution", async () => {
      let attempt = 0;
      global.fetch = vi.fn(async () => {
        attempt++;
        if (attempt === 1) {
          return new Response(JSON.stringify({ message: "Token expired" }), { status: 401 });
        }
        // Second attempt (the retry) throws network error
        throw new TypeError("Failed to fetch during retry");
      });

      const res = await apiClient("/retry-flaky");

      expect(res.data).toBeNull();
      expect(res.error?.code).toBe("NETWORK_ERROR");
      expect(res.error?.message).toBe("Failed to fetch during retry");
      expect(res.error?.status).toBe(0);
    });

    it("3.5 gracefully normalizes gateway errors (502, 503, 504) with non-JSON bodies", async () => {
      const gatewayStatuses = [
        { status: 502, text: "<html><head><title>502 Bad Gateway</title></head><body>502 Bad Gateway</body></html>" },
        { status: 503, text: "Service Temporarily Unavailable" },
        { status: 504, text: "Gateway Time-out" },
        { status: 500, text: "" },
      ];

      for (const item of gatewayStatuses) {
        global.fetch = vi.fn(async () => {
          return new Response(item.text, {
            status: item.status,
            statusText: `Status ${item.status}`,
            headers: { "Content-Type": "text/html" },
          });
        });

        const res = await apiClient(`/error-${item.status}`);
        expect(res.data).toBeNull();
        expect(res.error?.status).toBe(item.status);
        expect(res.error?.code).toBe(`HTTP_${item.status}`);
        if (item.text.length > 0) {
          expect(res.error?.message).toContain(item.text);
        }
      }
    });

    it("3.6 handles malformed or truncated JSON response bodies in 200 responses", async () => {
      global.fetch = vi.fn(async () => {
        return new Response('{"data": [{"id": 1, "name": "Incomplete...', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const res = await apiClient<string>("/malformed-json");

      // apiClient catches JSON parse error and returns the raw string body as data
      expect(res.error).toBeNull();
      expect(typeof res.data).toBe("string");
      expect(res.data).toContain("Incomplete");
    });

    it("3.7 handles large payload stress (500KB JSON payload) without memory leaks or serialization errors", async () => {
      const largeArray = Array.from({ length: 5000 }, (_, i) => ({
        id: `uuid_${i}`,
        name: `Product Item ${i}`,
        description: `High volume stress test product item description for verification ${i}`,
        price: 199.99 + i,
        tags: ["bulk", "stress", "inventory", "test"],
      }));

      let receivedPayloadSize = 0;
      global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const bodyStr = init?.body as string;
        receivedPayloadSize = bodyStr.length;
        return new Response(JSON.stringify({ data: { processedCount: largeArray.length } }), {
          status: 200,
        });
      });

      const res = await apiPost<{ processedCount: number }>("/products/bulk", largeArray);

      expect(res.error).toBeNull();
      expect(res.data?.processedCount).toBe(5000);
      expect(receivedPayloadSize).toBeGreaterThan(400000); // > 400KB
    });
  });
});
