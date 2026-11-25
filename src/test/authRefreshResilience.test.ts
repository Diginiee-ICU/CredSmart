import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { apiGet } from "@/lib/apiClient";

function makeJwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const payload = btoa(JSON.stringify({ id: "u-1", email: "user@test.io", exp: expSeconds })).replace(/=/g, "");
  return `${header}.${payload}.sig`;
}

describe("Auth Token Refresh Resilience & Proactive Renewal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("coalesces concurrent refreshSession calls into a single /api/auth/refresh request", async () => {
    localStorage.setItem("credsmart_auth_token", "expired-jwt");
    localStorage.setItem("credsmart_refresh_token", "refresh-123");
    localStorage.setItem("credsmart_auth_user", JSON.stringify({ id: "u-1", email: "user@test.io" }));

    let refreshCallCount = 0;
    const freshJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 25));
        return new Response(
          JSON.stringify({
            access_token: freshJwt,
            refresh_token: "refresh-new",
            user: { id: "u-1", email: "user@test.io" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const [r1, r2, r3] = await Promise.all([
      supabase.auth.refreshSession(),
      supabase.auth.refreshSession(),
      supabase.auth.refreshSession(),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(r1.data.session?.access_token).toBe(freshJwt);
    expect(r2.data.session?.access_token).toBe(freshJwt);
    expect(r3.data.session?.access_token).toBe(freshJwt);
    expect(localStorage.getItem("credsmart_auth_token")).toBe(freshJwt);
  });

  it("preserves local session on transient HTTP 500 from /api/auth/refresh, clears only on 401/403", async () => {
    localStorage.setItem("credsmart_auth_token", "tok-keep");
    localStorage.setItem("credsmart_refresh_token", "ref-keep");
    localStorage.setItem("credsmart_auth_user", JSON.stringify({ id: "u-1", email: "user@test.io" }));

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Temporary DB contention" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    const errRes = await supabase.auth.refreshSession();
    expect(errRes.error?.status).toBe(500);
    // Transient 500 must NOT sign the user out or wipe localStorage
    expect(localStorage.getItem("credsmart_auth_token")).toBe("tok-keep");
    expect(localStorage.getItem("credsmart_refresh_token")).toBe("ref-keep");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid or expired refresh token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const expiredRes = await supabase.auth.refreshSession();
    expect(expiredRes.error?.status).toBe(401);
    expect(localStorage.getItem("credsmart_auth_token")).toBeNull();
    expect(localStorage.getItem("credsmart_refresh_token")).toBeNull();
  });

  it("proactively refreshes expired JWT once before dispatching parallel API requests", async () => {
    const expiredJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) - 120);
    const freshJwt = makeJwtWithExp(Math.floor(Date.now() / 1000) + 7200);

    localStorage.setItem("credsmart_auth_token", expiredJwt);
    localStorage.setItem("credsmart_refresh_token", "ref-proactive");
    localStorage.setItem("credsmart_auth_user", JSON.stringify({ id: "u-1", email: "user@test.io" }));

    let refreshCount = 0;
    const authHeadersUsed: string[] = [];

    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/auth/refresh")) {
        refreshCount += 1;
        await new Promise((r) => setTimeout(r, 15));
        return new Response(
          JSON.stringify({
            access_token: freshJwt,
            refresh_token: "ref-fresh",
            user: { id: "u-1", email: "user@test.io" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const headers = new Headers(init?.headers);
      authHeadersUsed.push(headers.get("Authorization") || "");
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    await Promise.all([
      apiGet("/organization-memberships", { user_id: "u-1" }),
      apiGet("/white-label/status"),
      apiGet("/products", { organization_id: "org-1" }),
    ]);

    expect(refreshCount).toBe(1);
    expect(authHeadersUsed).toEqual([
      `Bearer ${freshJwt}`,
      `Bearer ${freshJwt}`,
      `Bearer ${freshJwt}`,
    ]);
  });
});
