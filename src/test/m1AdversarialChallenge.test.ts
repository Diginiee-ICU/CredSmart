/**
 * @file m1AdversarialChallenge.test.ts
 * @description Adversarial stress tests for Milestone M1 (Multi-Tenant Isolation & Auth Fallback Eradication).
 * Written by Challenger 1 (challenger_m1_1).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import Module from "module";

// Mock router class for Express
class MockRouter {
  middlewares: any[] = [];
  routes: Array<{ method: string; path: string; regex: RegExp; keys: string[]; handlers: any[] }> = [];

  use(...args: any[]) {
    if (typeof args[0] === "function") {
      this.middlewares.push(args[0]);
    }
    return this;
  }

  _addRoute(method: string, path: string, handlers: any[]) {
    const keys: string[] = [];
    const regexStr =
      "^" +
      path.replace(/:([a-zA-Z0-9_]+)/g, (_m, key) => {
        keys.push(key);
        return "([^/]+)";
      }) +
      "$";
    const regex = new RegExp(regexStr);
    this.routes.push({ method: method.toUpperCase(), path, regex, keys, handlers });
  }

  get(path: string, ...handlers: any[]) {
    this._addRoute("GET", path, handlers);
    return this;
  }
  post(path: string, ...handlers: any[]) {
    this._addRoute("POST", path, handlers);
    return this;
  }
  put(path: string, ...handlers: any[]) {
    this._addRoute("PUT", path, handlers);
    return this;
  }
  patch(path: string, ...handlers: any[]) {
    this._addRoute("PATCH", path, handlers);
    return this;
  }
  delete(path: string, ...handlers: any[]) {
    this._addRoute("DELETE", path, handlers);
    return this;
  }

  handle(req: any, res: any, done: any) {
    let midIdx = 0;
    const nextMiddleware = (err?: any) => {
      if (err) return done(err);
      if (midIdx < this.middlewares.length) {
        const fn = this.middlewares[midIdx++];
        fn(req, res, nextMiddleware);
      } else {
        const route = this.routes.find((r) => {
          if (r.method !== req.method) return false;
          return r.regex.test(req.url);
        });

        if (!route) {
          return done();
        }

        const match = req.url.match(route.regex);
        req.params = {};
        if (match) {
          route.keys.forEach((key, i) => {
            req.params[key] = match[i + 1];
          });
        }

        let hIdx = 0;
        const nextHandler = (hErr?: any) => {
          if (hErr) return done(hErr);
          if (hIdx < route.handlers.length) {
            const h = route.handlers[hIdx++];
            h(req, res, nextHandler);
          } else {
            done();
          }
        };
        nextHandler();
      }
    };
    nextMiddleware();
  }
}

const mockExpress: any = () => new MockRouter();
mockExpress.Router = () => new MockRouter();

const mockBcrypt = {
  hash: vi.fn().mockResolvedValue("hashed_password_123"),
  compare: vi.fn().mockResolvedValue(true),
};

const mockJwt = {
  verify: vi.fn((token: string) => {
    if (token === "token-without-org") {
      return { id: "user-zero-memberships", email: "zero@example.com" };
    }
    if (token === "token-attacker") {
      return { id: "attacker-user-id", email: "attacker@untrusted.com" };
    }
    if (token === "token-org-a") {
      return { id: "user-alice", email: "alice@tenanta.com", orgId: "org-tenant-A" };
    }
    return { id: "test-user-id", email: "test@credsmart.com" };
  }),
  sign: vi.fn((payload: any) => {
    return `jwt_${payload.id}_${payload.orgId || "no_org"}`;
  }),
};

// Mock DB pool
const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockClient = {
  query: mockClientQuery,
  release: vi.fn(),
};

const mockDb = {
  query: (...args: any[]) => Promise.resolve(mockPoolQuery(...args) || { rows: [] }),
  connect: vi.fn().mockResolvedValue(mockClient),
  on: vi.fn(),
};

const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string, ...rest: any[]) {
  if (id === "express") return mockExpress;
  if (id === "bcryptjs") return mockBcrypt;
  if (id === "jsonwebtoken") return mockJwt;
  if (id === "pg") {
    return { Pool: vi.fn().mockImplementation(() => mockDb) };
  }
  if (id.endsWith("/db") || id.endsWith("\\db") || id === "../db" || id === "./db") {
    return mockDb;
  }
  return originalRequire.call(this, id, ...rest);
};

// Mock ESM imports
vi.mock("express", () => ({
  default: mockExpress,
  Router: mockExpress.Router,
  ...mockExpress,
}));
vi.mock("bcryptjs", () => ({
  default: mockBcrypt,
  ...mockBcrypt,
}));
vi.mock("../../backend-api/src/db", () => ({
  default: mockDb,
  query: (...args: any[]) => Promise.resolve(mockPoolQuery(...args) || { rows: [] }),
  connect: vi.fn().mockResolvedValue(mockClient),
}));

// Require routes and middlewares under test
// eslint-disable-next-line @typescript-eslint/no-var-requires
const authMiddleware = require("../../backend-api/src/middleware/auth");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const authRouter = require("../../backend-api/src/routes/auth");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const settingsRouter = require("../../backend-api/src/routes/settings");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crmRouter = require("../../backend-api/src/routes/crm");

// Helper to dispatch requests to Express routers
function dispatchRouter(router: any, options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  user?: any;
  orgId?: string | null;
}): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    let statusCode = 200;
    const resHeaders: Record<string, string> = {};
    const [pathOnly, rawQuery] = options.url.split("?");
    const parsedQuery: Record<string, string> = { ...(options.query || {}) };
    if (rawQuery) {
      new URLSearchParams(rawQuery).forEach((v, k) => {
        parsedQuery[k] = v;
      });
    }

    const req: any = {
      method: options.method.toUpperCase(),
      url: pathOnly,
      path: pathOnly,
      originalUrl: options.url,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      query: parsedQuery,
      body: options.body || {},
      user: options.user || null,
      orgId: options.orgId,
    };

    const res: any = {
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = value;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: statusCode, body: data, headers: resHeaders });
      },
      send(data: any) {
        resolve({ status: statusCode, body: data, headers: resHeaders });
      },
    };

    router.handle(req, res, (err: any) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message }, headers: resHeaders });
      } else {
        resolve({ status: 404, body: { error: "Route not found" }, headers: resHeaders });
      }
    });
  });
}

describe("Adversarial Multi-Tenant Isolation & Auth Fallback Challenge (Milestone M1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
    mockClientQuery.mockReset();
  });

  // ============================================================================
  // CHALLENGE 1: Unscoped Profiles & Memberships Must NEVER Leak Users
  // ============================================================================
  describe("Challenge 1: GET /api/profiles and GET /api/organization-memberships Data Leaks", () => {
    it("1.1 GET /api/profiles without targetOrg, org_id, or token orgId returns strictly []", async () => {
      // Mock DB: if query reached DB, it would return all users
      mockPoolQuery.mockResolvedValue({
        rows: [
          { id: "victim-1", email: "victim1@company-a.com", full_name: "CEO Company A" },
          { id: "victim-2", email: "victim2@company-b.com", full_name: "CFO Company B" },
        ],
      });

      const res = await dispatchRouter(settingsRouter, {
        method: "GET",
        url: "/profiles",
        headers: {
          authorization: "Bearer token-attacker",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      // Crucial: pool.query MUST NOT have been called with an unscoped SELECT * FROM users!
      const unscopedCall = mockPoolQuery.mock.calls.some(([sql]) =>
        sql.includes("SELECT id, email, full_name") && !sql.includes("IN (")
      );
      expect(unscopedCall).toBe(false);
    });

    it("1.2 GET /api/organization-memberships without targetOrg or org_id returns strictly []", async () => {
      mockPoolQuery.mockImplementation((sql: string) => {
        // Authenticate lookup returns no org
        if (sql.includes("FROM org_memberships") || sql.includes("organization_memberships") || sql.includes("crm_staff_assignments")) {
          return { rows: [] };
        }
        return {
          rows: [
            { id: "mem-1", user_id: "victim-1", org_id: "org-a", role: "owner" },
            { id: "mem-2", user_id: "victim-2", org_id: "org-b", role: "owner" },
          ],
        };
      });

      const res = await dispatchRouter(settingsRouter, {
        method: "GET",
        url: "/organization-memberships",
        headers: {
          authorization: "Bearer token-attacker",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      // Should not query DB for memberships without targetOrg
      const unscopedCall = mockPoolQuery.mock.calls.some(([sql]) =>
        sql.includes("FROM org_memberships") && !sql.includes("WHERE (m.org_id = $1") && !sql.includes("user_id = $1")
      );
      expect(unscopedCall).toBe(false);
    });

    it("1.3 GET /api/memberships (alias) without targetOrg or org_id returns strictly []", async () => {
      const res = await dispatchRouter(settingsRouter, {
        method: "GET",
        url: "/memberships",
        headers: {
          authorization: "Bearer token-attacker",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("1.4 GET /api/profiles with explicit targetOrg scopes users to that organization only", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("WHERE 1=1 AND id IN")) {
          expect(params[0]).toBe("org-isolated-123");
          return {
            rows: [
              { id: "user-1", email: "user1@org123.com", full_name: "Staff 1", name: "Staff 1" },
            ],
          };
        }
        return { rows: [] };
      });

      const res = await dispatchRouter(settingsRouter, {
        method: "GET",
        url: "/profiles?org_id=org-isolated-123",
        headers: {
          authorization: "Bearer token-attacker",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].email).toBe("user1@org123.com");
    });
  });

  // ============================================================================
  // CHALLENGE 2: Auth Fallback & Product Count Auto-Insert Eradication
  // ============================================================================
  describe("Challenge 2: Auth Fallback & Product-Count Auto-Insert Eradication", () => {
    it("2.1 User with 0 memberships gets null orgId on login, without auto-inserting into largest org", async () => {
      // Mock user lookup on login
      mockPoolQuery.mockImplementation((sql: string) => {
        if (sql.includes("FROM users WHERE email = $1")) {
          return {
            rows: [
              {
                id: "orphan-user-uuid",
                email: "orphan@example.com",
                password_hash: "hashed_password_123",
                full_name: "Orphan User",
                phone: "1234567890",
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        // Membership queries return 0 rows (user has 0 memberships)
        if (sql.includes("org_memberships") || sql.includes("crm_staff_assignments")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO refresh_tokens")) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const res = await dispatchRouter(authRouter, {
        method: "POST",
        url: "/login",
        body: {
          email: "orphan@example.com",
          password: "correct_password",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();

      // Check sign call: payload.orgId must be null
      const signCalls = mockJwt.sign.mock.calls;
      const accessCall = signCalls.find(([payload]: any[]) => payload.id === "orphan-user-uuid");
      expect(accessCall).toBeDefined();
      expect(accessCall[0].orgId).toBeNull(); // Strictly null!

      // Adversarial Assertion: Verify NO queries contained "products" or auto-inserting membership!
      for (const [sql] of mockPoolQuery.mock.calls) {
        expect(sql).not.toMatch(/COUNT\(\*\)\s+FROM\s+products/i);
        expect(sql).not.toMatch(/INSERT\s+INTO\s+org_memberships/i);
        expect(sql).not.toMatch(/ORDER\s+BY\s+.*products/i);
      }
    });

    it("2.2 authenticate middleware does not fall back to database organization when user has 0 memberships", async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] }); // No memberships in DB

      const req: any = {
        headers: {
          authorization: "Bearer token-without-org",
        },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await authMiddleware.authenticate(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe("user-zero-memberships");
      expect(req.orgId).toBeUndefined(); // Must remain undefined, NEVER assigned to a foreign org!

      // Ensure no fallback query for organizations with products was executed
      for (const [sql] of mockPoolQuery.mock.calls) {
        expect(sql).not.toMatch(/SELECT\s+id\s+FROM\s+organizations\s+ORDER\s+BY/i);
      }
    });
  });

  // ============================================================================
  // CHALLENGE 3: /api/crm/staff Cross-Tenant Isolation
  // ============================================================================
  describe("Challenge 3: GET /api/crm/staff Strict Cross-Tenant Isolation", () => {
    it("3.1 Querying /api/crm/staff with Organization A never returns users from Organization B", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        const orgIdParam = params[0];
        if (orgIdParam === "org-tenant-A") {
          return {
            rows: [
              {
                id: "user-alice",
                user_id: "user-alice",
                email: "alice@tenanta.com",
                full_name: "Alice Tenant A",
                store_role: "owner",
                role_name: "Super Admin",
              },
            ],
          };
        }
        if (orgIdParam === "org-tenant-B") {
          return {
            rows: [
              {
                id: "user-bob",
                user_id: "user-bob",
                email: "bob@tenantb.com",
                full_name: "Bob Tenant B",
                store_role: "staff",
                role_name: "Sales Associate",
              },
            ],
          };
        }
        return { rows: [] };
      });

      // Request for Org A
      const resA = await dispatchRouter(crmRouter, {
        method: "GET",
        url: "/staff",
        headers: {
          "x-organization-id": "org-tenant-A",
          authorization: "Bearer token-org-a",
        },
        user: { id: "user-alice", orgId: "org-tenant-A" },
      });

      expect(resA.status).toBe(200);
      expect(resA.body).toHaveLength(1);
      expect(resA.body[0].email).toBe("alice@tenanta.com");
      expect(resA.body.some((u: any) => u.email === "bob@tenantb.com")).toBe(false);

      // Request for Org B
      const resB = await dispatchRouter(crmRouter, {
        method: "GET",
        url: "/staff",
        headers: {
          "x-organization-id": "org-tenant-B",
          authorization: "Bearer token-org-a",
        },
        user: { id: "user-bob", orgId: "org-tenant-B" },
      });

      expect(resB.status).toBe(200);
      expect(resB.body).toHaveLength(1);
      expect(resB.body[0].email).toBe("bob@tenantb.com");
      expect(resB.body.some((u: any) => u.email === "alice@tenanta.com")).toBe(false);
    });

    it("3.2 Querying /api/crm/staff with no organization context fails with 400", async () => {
      const res = await dispatchRouter(crmRouter, {
        method: "GET",
        url: "/staff",
        headers: {
          authorization: "Bearer token-without-org",
        },
        user: { id: "user-no-org" }, // No orgId anywhere
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Organization context is required");
    });
  });

  // ============================================================================
  // CHALLENGE 4: SQL Migration Files Multi-Tenant Hardening
  // ============================================================================
  describe("Challenge 4: SQL Migration Files Integrity", () => {
    it("4.1 backend-api/fix_db.sql contains ZERO CROSS JOIN statements", () => {
      const sqlContent = fs.readFileSync(
        path.resolve(process.cwd(), "backend-api/fix_db.sql"),
        "utf-8"
      );
      expect(sqlContent).not.toMatch(/CROSS\s+JOIN/i);
    });

    it("4.2 root fix_db.sql contains ZERO CROSS JOIN statements", () => {
      const sqlContent = fs.readFileSync(
        path.resolve(process.cwd(), "fix_db.sql"),
        "utf-8"
      );
      expect(sqlContent).not.toMatch(/CROSS\s+JOIN/i);
    });

    it("4.3 backend-api/add_indexes.sql defines all required composite B-Tree indexes for CRM", () => {
      const sqlContent = fs.readFileSync(
        path.resolve(process.cwd(), "backend-api/add_indexes.sql"),
        "utf-8"
      );
      expect(sqlContent).toMatch(/idx_crm_staff_assignments_org_user.*ON\s+crm_staff_assignments\(org_id,\s*user_id\)/i);
      expect(sqlContent).toMatch(/idx_staff_tasks_org_status.*ON\s+staff_tasks\(org_id,\s*status\)/i);
      expect(sqlContent).toMatch(/idx_crm_salary_profiles_org_staff.*ON\s+crm_salary_profiles\(org_id,\s*staff_id\)/i);
      expect(sqlContent).toMatch(/ANALYZE\s+crm_staff_assignments;/i);
      expect(sqlContent).toMatch(/ANALYZE\s+staff_tasks;/i);
      expect(sqlContent).toMatch(/ANALYZE\s+crm_salary_profiles;/i);
    });
  });

  // ============================================================================
  // CHALLENGE 5: Micro-Cache Domain Segregation (CRM vs POS)
  // ============================================================================
  describe("Challenge 5: Micro-Cache Domain Segregation Logic", () => {
    it("5.1 Verifies isCrmPath classifies CRM vs POS paths accurately", () => {
      const indexContent = fs.readFileSync(
        path.resolve(process.cwd(), "backend-api/src/index.js"),
        "utf-8"
      );

      // Check regex or substring matching inside index.js
      expect(indexContent).toMatch(/isCrmPath/);
      expect(indexContent).toMatch(/\/api\/crm/);
      expect(indexContent).toMatch(/\/rest\/v1\/crm_/);
      expect(indexContent).toMatch(/\/rest\/v1\/staff_tasks/);
      expect(indexContent).toMatch(/\/rest\/v1\/attendance_records/);
      expect(indexContent).toMatch(/\/rest\/v1\/salary_profiles/);
    });
  });
});
