/**
 * @file crmTenantIsolation.test.ts
 * @description Comprehensive Multi-Tenant Organization Isolation Test Suite for CredSmart CRM.
 * Verifies strict tenant scoping across:
 * - Staff directory & roles (R1)
 * - Tasks, assignees, updates, and deletes (R2)
 * - Attendance & Geofencing (R2)
 * - Salary profiles & Payroll (R2)
 * - Roles & Permissions mutations (R2)
 * - Staff provisioning & duplicate prevention (R1 & R3)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import Module from "module";

// Mock router class
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

// Define mock DB pool
const mockPoolQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockClient = {
  query: mockClientQuery,
  release: vi.fn(),
};
const mockDb = {
  query: (...args: any[]) => mockPoolQuery(...args),
  connect: vi.fn().mockResolvedValue(mockClient),
  on: vi.fn(),
};

const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string, ...rest: any[]) {
  if (id === "express") {
    return mockExpress;
  }
  if (id === "bcryptjs") {
    return mockBcrypt;
  }
  if (id === "pg") {
    return {
      Pool: vi.fn().mockImplementation(() => mockDb),
    };
  }
  if (id === "jsonwebtoken") {
    return {
      verify: vi.fn(),
      sign: vi.fn(),
    };
  }
  if (id.endsWith("/db") || id.endsWith("\\db") || id === "../db" || id === "./db") {
    return mockDb;
  }
  if (id.includes("/middleware/auth") || id.includes("\\middleware\\auth") || id === "../middleware/auth") {
    return {
      authenticate: (req: any, _res: any, next: any) => {
        if (!req.user) {
          req.user = { id: "user-admin-1", email: "admin@credsmart.com", orgId: "org-cred" };
        }
        if (!req.orgId) {
          req.orgId = req.headers["x-organization-id"] || req.user.orgId;
        }
        next();
      },
      optionalAuth: vi.fn((_req: any, _res: any, next: any) => next()),
      JWT_SECRET: "test-secret",
    };
  }
  return originalRequire.call(this, id, ...rest);
};

// Mock bcryptjs for ESM
vi.mock("bcryptjs", () => ({
  default: mockBcrypt,
  ...mockBcrypt,
}));

// Mock express for ESM
vi.mock("express", () => ({
  default: mockExpress,
  Router: mockExpress.Router,
  ...mockExpress,
}));

vi.mock("../../backend-api/src/db", () => ({
  default: mockDb,
  query: (...args: any[]) => mockPoolQuery(...args),
  connect: vi.fn().mockResolvedValue(mockClient),
}));

// Bypass auth middleware to allow testing specific users and headers
vi.mock("../../backend-api/src/middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { id: "user-admin-1", email: "admin@credsmart.com", orgId: "org-cred" };
    }
    if (!req.orgId) {
      req.orgId = req.headers["x-organization-id"] || req.user.orgId;
    }
    next();
  },
}));

// Load the CRM router under test
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crmRouter = require("../../backend-api/src/routes/crm");

interface DispatchOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  user?: any;
}

function dispatch(options: DispatchOptions): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    let statusCode = 200;
    const [pathOnly, rawQuery] = options.url.split("?");
    const parsedQuery: Record<string, string> = { ...(options.query || {}) };
    if (rawQuery) {
      new URLSearchParams(rawQuery).forEach((v, k) => {
        parsedQuery[k] = v;
      });
    }

    const req: any = {
      method: options.method,
      url: pathOnly,
      originalUrl: options.url,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      query: parsedQuery,
      body: options.body || {},
      user: options.user || { id: "user-admin-1", email: "admin@credsmart.com", orgId: "org-cred" },
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: statusCode, body: data });
      },
    };

    crmRouter.handle(req, res, (err: any) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: "Route not found" } });
      }
    });
  });
}

describe("CRM Multi-Tenant Organization Isolation Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolQuery.mockReset();
    mockClientQuery.mockReset();
  });

  // ==========================================================================
  // SECTION 1: Tenant-Isolated Staff & User Directory (R1)
  // ==========================================================================
  describe("R1. Staff Directory & Role Scoping", () => {
    it("returns only staff belonging to Organization A, and 0 users from Organization B", async () => {
      // Mock DB query to return only Org A staff members
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        const orgParam = params[0];
        if (orgParam === "org-cred-A") {
          return Promise.resolve({
            rows: [
              {
                id: "user-alice-1",
                user_id: "user-alice-1",
                full_name: "Alice A (Cred)",
                email: "alice@org-a.com",
                store_role: "manager",
                crm_role_name: "Store Manager",
              },
              {
                id: "user-bob-1",
                user_id: "user-bob-1",
                full_name: "Bob A (Cred)",
                email: "bob@org-a.com",
                store_role: "salesman",
                crm_role_name: "Sales Associate",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const responseA = await dispatch({
        method: "GET",
        url: "/staff",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(responseA.status).toBe(200);
      expect(responseA.body).toHaveLength(2);
      expect(responseA.body[0].email).toBe("alice@org-a.com");
      expect(responseA.body[1].email).toBe("bob@org-a.com");

      // Verify that query executed had $1 = 'org-cred-A'
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("org_memberships"),
        expect.arrayContaining(["org-cred-A"])
      );

      // Now query for Organization B
      const responseB = await dispatch({
        method: "GET",
        url: "/staff",
        headers: { "x-organization-id": "org-competitor-B" },
      });

      expect(responseB.status).toBe(200);
      expect(responseB.body).toHaveLength(0);
      expect(responseB.body.some((u: any) => u.email === "alice@org-a.com")).toBe(false);
    });

    it("prevents assigning a CRM role belonging to Organization B to a user in Organization A", async () => {
      // Role validation: role-org-B does not belong to org-cred-A
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_roles") && sql.includes("WHERE id = $1")) {
          // role-org-B only belongs to org-competitor-B
          if (params[0] === "role-org-B" && params[1] === "org-cred-A") {
            return Promise.resolve({ rows: [] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff",
        headers: { "x-organization-id": "org-cred-A" },
        body: { user_id: "user-alice-1", role_id: "role-org-B" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/unauthorized|not found/i);
    });

    it("deleting a staff assignment for Organization A does not delete the user's role in Organization B", async () => {
      mockPoolQuery.mockResolvedValue({ rowCount: 1, rows: [] });

      const res = await dispatch({
        method: "DELETE",
        url: "/staff/user-shared-1",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify DELETE queries strictly partition by org_id
      const queries = mockPoolQuery.mock.calls;
      const deleteAssignments = queries.find(([sql]: any[]) => sql.includes("DELETE FROM crm_staff_assignments"));
      expect(deleteAssignments).toBeDefined();
      expect(deleteAssignments[1]).toContain("org-cred-A");

      const deleteStaffRoles = queries.find(([sql]: any[]) => sql.includes("DELETE FROM crm_staff_roles"));
      expect(deleteStaffRoles).toBeDefined();
      expect(deleteStaffRoles[0]).toContain("crm_roles WHERE org_id = $2 OR organization_id = $2");
      expect(deleteStaffRoles[1]).toContain("org-cred-A");
    });
  });

  // ==========================================================================
  // SECTION 2: Staff Provisioning & Tenant Separation (R1 & R3)
  // ==========================================================================
  describe("R1 & R3. Staff Provisioning Isolation", () => {
    it("returns 409 conflict when user already belongs to the target organization", async () => {
      mockClientQuery.mockImplementation((sql: string) => {
        if (sql.includes("SELECT id, email, full_name, phone FROM users")) {
          return Promise.resolve({ rows: [{ id: "user-existing-1", email: "raj@store.com" }] });
        }
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          return Promise.resolve({ rows: [{ id: "mem-existing-1" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff/provision",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          full_name: "Rajesh Kumar",
          email: "raj@store.com",
          store_role: "cashier",
        },
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already belongs to this organization");
    });

    it("provisions an existing user into Organization A with explicit tenant-scoped membership", async () => {
      mockClientQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT id, email, full_name, phone FROM users")) {
          return Promise.resolve({ rows: [{ id: "user-cross-1", email: "cross@vendor.com" }] });
        }
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          // Not currently a member of org-cred-A
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("INSERT INTO org_memberships")) {
          expect(params[1]).toBe("org-cred-A");
          return Promise.resolve({ rows: [{ id: "mem-new-1", role: "salesman" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff/provision",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          full_name: "Cross Tenant User",
          email: "cross@vendor.com",
          store_role: "salesman",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe("cross@vendor.com");
      expect(res.body.credentials.email).toBe("cross@vendor.com");
    });
  });

  // ==========================================================================
  // SECTION 3: Task Workflow Multi-Tenant Boundaries (R2)
  // ==========================================================================
  describe("R2. Strict Organization Scoping across CRM Tasks", () => {
    it("returns tasks only belonging to Organization A, matching active context", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("staff_tasks")) {
          const org = params[0];
          if (org === "org-cred-A") {
            return Promise.resolve({
              rows: [
                {
                  id: "task-101",
                  org_id: "org-cred-A",
                  title: "Count inventory on rack 3",
                  status: "todo",
                  priority: "normal",
                  assignee_name: "Alice A (Cred)",
                },
              ],
            });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/tasks",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Count inventory on rack 3");
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE (t.org_id = $1 OR t.organization_id = $1)"),
        expect.arrayContaining(["org-cred-A"])
      );
    });

    it("rejects creating a task in Organization A when assigned to a user from Organization B", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        // Membership check for assignee
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          const [userId, orgId] = params;
          if (userId === "b-user-foreign-99" && orgId === "org-cred-A") {
            return Promise.resolve({ rows: [] }); // User is NOT in org-cred-A!
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/tasks",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          title: "Verify closing balance",
          assigned_to: "00000000-0000-0000-0000-000000000099",
          priority: "urgent",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("rejects PATCH on another organization's task with 404 unauthorized", async () => {
      // Simulates task existing in Org B, but caller is in Org A
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT * FROM staff_tasks WHERE id = $1 AND (org_id = $2 OR organization_id = $2)")) {
          return Promise.resolve({ rows: [] }); // Not found in caller's org
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "PATCH",
        url: "/tasks/task-of-org-B",
        headers: { "x-organization-id": "org-cred-A" },
        body: { status: "done" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|unauthorized/i);
    });

    it("rejects DELETE on another organization's task with 404 unauthorized", async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] }); // 0 rows deleted in caller's org

      const res = await dispatch({
        method: "DELETE",
        url: "/tasks/task-of-org-B",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|unauthorized/i);
    });
  });

  // ==========================================================================
  // SECTION 4: Attendance & Salary Records Isolation (R2)
  // ==========================================================================
  describe("R2. Attendance & Salary Strict Partitioning", () => {
    it("partitions attendance query strictly by organization ID", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("attendance_records")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [
              { id: "att-1", user_id: "user-1", status: "present", full_name: "Staff 1" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/attendance",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("rejects recording attendance for a user belonging to another organization", async () => {
      mockPoolQuery.mockImplementation((sql: string) => {
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          return Promise.resolve({ rows: [] }); // User does NOT belong to this org
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/attendance",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          user_id: "user-alien-99",
          date: "2026-10-26",
          status: "present",
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("partitions salary profiles strictly by organization ID without cross-tenant bleed", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("salary_profiles")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [
              { id: "sp-1", user_id: "user-1", base_salary: 45000, org_id: "org-cred-A" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/salary-profiles",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].base_salary).toBe(45000);
    });

    it("rejects upserting salary profile for a user belonging to another organization", async () => {
      mockPoolQuery.mockImplementation((sql: string) => {
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/salary-profiles",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          user_id: "user-alien-99",
          base_salary: 50000,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("does not belong to this organization");
    });
  });

  // ==========================================================================
  // SECTION 5: Roles, Broadcasts & Meetings Strict Tenant Isolation (R2)
  // ==========================================================================
  describe("R2. Roles, Broadcasts & Meetings Tenant Scoping", () => {
    it("deleting role of another organization returns 404 unauthorized", async () => {
      mockPoolQuery.mockResolvedValue({ rowCount: 0, rows: [] });

      const res = await dispatch({
        method: "DELETE",
        url: "/roles/role-org-B",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|unauthorized/i);
    });

    it("deleting permissions of another organization's role returns 404 unauthorized", async () => {
      mockPoolQuery.mockImplementation((sql: string) => {
        if (sql.includes("crm_roles") && sql.includes("WHERE id = $1")) {
          return Promise.resolve({ rows: [] }); // Role does not belong to caller's org
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "DELETE",
        url: "/permissions?role_id=role-org-B",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|unauthorized/i);
    });

    it("scopes broadcasts queries strictly to active organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_broadcasts")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [{ id: "b1", title: "Internal Notice", org_id: "org-cred-A" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/broadcasts",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("scopes meetings queries strictly to active organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_meetings")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [{ id: "m1", title: "Morning Standup", org_id: "org-cred-A" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/meetings",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("returns 0 counts when organization context has no active CRM records", async () => {
      mockPoolQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      const res = await dispatch({
        method: "GET",
        url: "/dashboard-counts",
        headers: { "x-organization-id": "org-empty" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tasks: 0, broadcasts: 0, meetings: 0 });
    });
  });
});
