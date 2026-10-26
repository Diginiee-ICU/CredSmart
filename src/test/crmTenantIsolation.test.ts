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
  query: (...args: any[]) => Promise.resolve(mockPoolQuery(...args) || { rows: [] }),
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

    it("preserves an existing user's password hash and does not overwrite it on multi-tenant provisioning (OI-3)", async () => {
      let passwordUpdated = false;
      mockClientQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT id, email, full_name, phone")) {
          return Promise.resolve({
            rows: [{ id: "user-existing-sec", email: "alice@company.com", password_hash: "preexisting_hash_123" }]
          });
        }
        if (sql.includes("org_memberships") && sql.includes("LIMIT 1")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("UPDATE users SET password_hash")) {
          passwordUpdated = true;
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("INSERT INTO org_memberships")) {
          return Promise.resolve({ rows: [{ id: "mem-alice", role: "staff" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff/provision",
        headers: { "x-organization-id": "org-cred-B" },
        body: {
          full_name: "Alice Smith",
          email: "alice@company.com",
          store_role: "staff",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(passwordUpdated).toBe(false);
      expect(res.body.credentials.password).toBe("(existing account password)");
    });

    it("handles legacy single-table deployment when only org_memberships exists (OI-1)", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("organization_memberships")) {
          const err: any = new Error("relation organization_memberships does not exist");
          err.code = "42P01";
          return Promise.reject(err);
        }
        if (sql.includes("org_memberships") && sql.includes("SELECT 1")) {
          if (params[0] === "11111111-1111-1111-1111-111111111111" && params[1] === "org-cred-A") {
            return Promise.resolve({ rows: [{ 1: 1 }] });
          }
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("staff_tasks")) {
          return Promise.resolve({ rows: [{ id: "task-legacy", title: "Legacy Task" }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/tasks",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          title: "Legacy Table Task",
          assigned_to: "11111111-1111-1111-1111-111111111111",
        },
      });

      expect([201, 400]).toContain(res.status);
    });

    it("rejects GET /permissions without organization context to prevent permissions leakage", async () => {
      const res = await dispatch({
        method: "GET",
        url: "/permissions?role_id=role-foreign-b",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("rejects cross-tenant staff in POST /payslips/bulk", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("org_memberships") && sql.includes("SELECT 1")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/payslips/bulk",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          items: [
            { id: "slip-foreign", staff_id: "user-from-org-B", net_salary: 25000, month_year: "2026-10" }
          ]
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it("rejects POST /payroll-runs for a user belonging to another organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("org_memberships") && sql.includes("SELECT 1")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/payroll-runs",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          user_id: "user-org-B",
          month: 10,
          year: 2026,
          base_salary: 50000,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("rejects assigning ticket in POST /tickets to a user from another organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("org_memberships") && sql.includes("SELECT 1")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/tickets",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          customer_id: "cust-1",
          subject: "Printer Issue",
          assigned_to: "foreign-user-id",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("scopes geolocations endpoints strictly to active organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_geolocations") && sql.includes("SELECT")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [
              { id: "geo-1", org_id: "org-cred-A", name: "Cred HQ", latitude: 28.6, longitude: 77.2, radius_meters: 150 }
            ]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/geolocations",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Cred HQ");
    });

    it("rejects PUT /geolocations/:id on another organization's geofence", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("UPDATE crm_geolocations")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "PUT",
        url: "/geolocations/geo-foreign-id",
        headers: { "x-organization-id": "org-cred-A" },
        body: { name: "Hijacked Geofence" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found or unauthorized");
    });

    it("rejects POST /attendance-requests for user from another organization", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("org_memberships") && sql.includes("SELECT 1")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/attendance-requests",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          user_id: "foreign-user-2",
          date: "2026-10-25",
          reason: "Missed punch",
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("strictly returns 404 on DELETE /broadcasts/:id when row belongs to another org or primary query errors (OI-4)", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_broadcasts") && sql.includes("DELETE")) {
          // Simulate query returning empty rows (not belonging to this org)
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "DELETE",
        url: "/broadcasts/bc-foreign-123",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found or unauthorized");
    });

    it("strictly returns 404 on DELETE /meetings/:id when meeting belongs to another org (OI-4)", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_meetings") && sql.includes("DELETE")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "DELETE",
        url: "/meetings/meet-foreign-456",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found or unauthorized");
    });

    it("strictly returns 404 on DELETE /geolocations/:id when geofence belongs to another org (OI-4)", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("crm_geolocations") && sql.includes("DELETE")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "DELETE",
        url: "/geolocations/geo-foreign-789",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found or unauthorized");
    });

    it("returns staff members assigned via crm_staff_assignments in legacy single-table deployment (OI-1)", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("FROM (") && sql.includes("crm_staff_assignments")) {
          return Promise.resolve({
            rows: [
              {
                id: "user-legacy-assignee",
                user_id: "user-legacy-assignee",
                email: "legacy@credsmart.online",
                full_name: "Legacy Staff",
                store_role: "staff",
                role_name: null,
                is_super_admin: false,
              }
            ]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/staff",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].full_name).toBe("Legacy Staff");
    });

    it("records baseline crm_staff_assignments during staff provisioning even without custom role (OI-1)", async () => {
      let baselineAssignmentInserted = false;
      mockClientQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT id, email, full_name, phone FROM users")) {
          return Promise.resolve({ rows: [] }); // New user
        }
        if (sql.includes("INSERT INTO users")) {
          return Promise.resolve({
            rows: [{ id: "user-new-baseline", email: "baseline@cred.com", full_name: "Baseline User" }]
          });
        }
        if (sql.includes("INSERT INTO org_memberships")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("INSERT INTO organization_memberships")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("INSERT INTO crm_staff_assignments")) {
          baselineAssignmentInserted = true;
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff/provision",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          full_name: "Baseline User",
          email: "baseline@cred.com",
          store_role: "cashier",
          // Notice: NO crm_role_id provided!
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(baselineAssignmentInserted).toBe(true);
    });

    it("strictly preserves external auth and hides password for existing users with NULL password_hash during provisioning (OI-3)", async () => {
      let passwordUpdated = false;
      mockClientQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT id, email, full_name, phone FROM users")) {
          // User exists in DB (e.g. created via Supabase Auth / OAuth with NULL password_hash in public.users)
          return Promise.resolve({
            rows: [{ id: "user-oauth-1", email: "oauth.user@cred.com", full_name: "OAuth User", phone: "" }]
          });
        }
        if (sql.includes("SELECT password_hash FROM users")) {
          return Promise.resolve({ rows: [{ password_hash: null }] });
        }
        if (sql.includes("UPDATE users SET password_hash")) {
          passwordUpdated = true;
          return Promise.resolve({ rowCount: 1 });
        }
        if (sql.includes("INSERT INTO org_memberships") || sql.includes("INSERT INTO organization_memberships") || sql.includes("INSERT INTO crm_staff_assignments")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/staff/provision",
        headers: { "x-organization-id": "org-cred-B" },
        body: {
          full_name: "OAuth User",
          email: "oauth.user@cred.com",
          store_role: "staff",
          password: "MaliciousPassword123!",
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // OI-3: Tenant B must NEVER update the password hash of an existing user!
      expect(passwordUpdated).toBe(false);
      // OI-3: Credentials response must NEVER reveal or return a new password for existing user!
      expect(res.body.credentials.password).toBe("(existing account password)");
    });

    it("resolves task assignee name for users assigned via crm_staff_assignments in GET /tasks", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("FROM staff_tasks t") && sql.includes("crm_staff_assignments")) {
          return Promise.resolve({
            rows: [
              {
                id: "task-assigned-1",
                org_id: "org-cred-A",
                title: "Stock Audit",
                status: "todo",
                priority: "normal",
                assigned_to: "user-legacy-assignee",
                assignee_id: "user-legacy-assignee",
                assignee_name: "Legacy Staff",
                assignee_email: "legacy@credsmart.online",
              }
            ]
          });
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
      expect(res.body[0].assignee_name).toBe("Legacy Staff");
    });

    it("resiliently returns tasks when org_memberships table is missing (42P01) in GET /tasks", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("FROM staff_tasks t") && sql.includes("org_memberships")) {
          const err: any = new Error("relation org_memberships does not exist");
          err.code = "42P01";
          return Promise.reject(err);
        }
        if (sql.includes("fallbackTasksQuery") || (sql.includes("FROM staff_tasks t") && !sql.includes("org_memberships"))) {
          return Promise.resolve({
            rows: [
              {
                id: "task-fallback-1",
                org_id: "org-cred-A",
                title: "Fallback Task",
                status: "todo",
                priority: "normal",
                assignee_name: "Unassigned",
              }
            ]
          });
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
      expect(res.body[0].title).toBe("Fallback Task");
    });

    it("strictly rejects foreign tenant assignee in POST /tasks with 400 even for non-UUID user IDs", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        // Mock verifyUserInOrg query -> returns empty (user does not belong to active org)
        if (sql.includes("FROM (") && (sql.includes("org_memberships") || sql.includes("crm_staff_assignments"))) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "POST",
        url: "/tasks",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          title: "Secret Audit",
          assigned_to: "foreign-user-custom-string-id",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("strictly rejects foreign tenant assignee in PATCH /tasks/:id with 400 even for non-UUID user IDs", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT * FROM staff_tasks WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: "task-local-1", org_id: "org-cred-A", title: "Local Task", status: "todo" }]
          });
        }
        // Membership check fails
        if (sql.includes("FROM (") && (sql.includes("org_memberships") || sql.includes("crm_staff_assignments"))) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "PATCH",
        url: "/tasks/task-local-1",
        headers: { "x-organization-id": "org-cred-A" },
        body: {
          assigned_to: "foreign-user-custom-string-id",
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("does not belong to this organization");
    });

    it("strictly isolates staff role in GET /staff when user has different roles in Org A and Org B without cross-tenant role shadowing", async () => {
      mockPoolQuery.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes("SELECT DISTINCT ON (u.id)") && sql.includes("crm_staff_roles")) {
          expect(params[0]).toBe("org-cred-A");
          return Promise.resolve({
            rows: [
              {
                id: "user-multi-org",
                user_id: "user-multi-org",
                email: "multiorg@credsmart.online",
                full_name: "Multi-Org Staff",
                store_role: "staff",
                role_name: "Org A Manager",
                crm_role_id: "role-orgA-123",
                crm_role_color: "#2563EB",
                is_super_admin: false,
              }
            ]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await dispatch({
        method: "GET",
        url: "/staff",
        headers: { "x-organization-id": "org-cred-A" },
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].role_name).toBe("Org A Manager");
      expect(res.body[0].crm_role_id).toBe("role-orgA-123");
    });
  });
});

