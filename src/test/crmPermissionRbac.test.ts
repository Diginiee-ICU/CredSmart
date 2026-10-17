import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, screen, waitFor, act } from "@testing-library/react";
import { useCRMPermission, usePermission, type CRMRole, type CRMPermission, type CRMStaffRole } from "@/hooks/useCRMPermission";
import { CRMPermissionGate } from "@/components/crm/CRMPermissionGate";

// ============================================================================
// 1. Mock State & Configurable Providers
// ============================================================================

interface MockAuthState {
  user: { id: string; email: string } | null;
}

interface MockOrgState {
  orgId: string | null;
  userRole: string | null;
}

interface MockDbState {
  crm_staff_roles: CRMStaffRole[];
  crm_roles: CRMRole[];
  crm_permissions: CRMPermission[];
  shouldThrowQuery: boolean;
}

const authState: MockAuthState = {
  user: { id: "user-challenger-01", email: "challenger@credsmart.app" },
};

const orgState: MockOrgState = {
  orgId: "org-alpha-100",
  userRole: "cashier",
};

const dbState: MockDbState = {
  crm_staff_roles: [],
  crm_roles: [],
  crm_permissions: [],
  shouldThrowQuery: false,
};

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authState.user,
    session: authState.user ? { access_token: "fake-jwt" } : null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock useOrganization
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: orgState.orgId,
    userRole: orgState.userRole,
    org: orgState.orgId ? { id: orgState.orgId, name: "Alpha Store" } : null,
    organizations: [],
    loading: false,
    refresh: vi.fn(),
    switchOrganization: vi.fn(),
  }),
}));

// Mock toast notifications
const toastCalls: Array<{ title?: string; description?: string; variant?: string }> = [];
vi.mock("@/hooks/use-toast", () => ({
  toast: (opts: { title?: string; description?: string; variant?: string }) => {
    toastCalls.push(opts);
    return { id: "toast-mock-id", dismiss: vi.fn(), update: vi.fn() };
  },
  useToast: () => ({
    toasts: [],
    toast: (opts: { title?: string; description?: string; variant?: string }) => {
      toastCalls.push(opts);
    },
    dismiss: vi.fn(),
  }),
}));

// Mock Supabase Query Engine with realistic filtering
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (dbState.shouldThrowQuery) {
        throw new Error(`Hard network failure connecting to Supabase table: ${table}`);
      }

      let currentData: any[] = [];
      if (table === "crm_staff_roles") currentData = [...dbState.crm_staff_roles];
      else if (table === "crm_roles") currentData = [...dbState.crm_roles];
      else if (table === "crm_permissions") currentData = [...dbState.crm_permissions];

      const builder: any = {
        select: (_cols?: string) => builder,
        eq: (col: string, val: any) => {
          currentData = currentData.filter((item) => item[col] === val);
          return builder;
        },
        in: (col: string, valArray: any[]) => {
          currentData = currentData.filter((item) => valArray.includes(item[col]));
          return builder;
        },
        then: (resolve: (val: { data: any[]; error: null }) => void) => {
          resolve({ data: currentData, error: null });
        },
      };

      return builder;
    },
  },
}));

// ============================================================================
// 2. Constants: The Complete 14-Action Taxonomy Across 7 CRM Modules
// ============================================================================

const ALL_14_ACTIONS: Array<{ module: string; action: string }> = [
  // 1. Attendance (2 actions)
  { module: "attendance", action: "view" },
  { module: "attendance", action: "edit" },

  // 2. Salary & Payroll (2 actions)
  { module: "salary", action: "view" },
  { module: "salary", action: "edit" },

  // 3. Tasks & Approvals (3 actions)
  { module: "tasks", action: "view" },
  { module: "tasks", action: "create" },
  { module: "tasks", action: "approve" },

  // 4. Meetings & Calls (2 actions)
  { module: "meetings", action: "view" },
  { module: "meetings", action: "create" },

  // 5. Broadcasts & Bulletins (2 actions)
  { module: "broadcasts", action: "view" },
  { module: "broadcasts", action: "send" },

  // 6. AI Assistant (1 action)
  { module: "ai_assistant", action: "access" },

  // 7. Support Desk (2 actions)
  { module: "support", action: "view" },
  { module: "support", action: "manage" },
];

// Helper to seed a super_admin role with all 14 permissions for an org
function seedOrgWithFullSuperAdminRole(orgId: string): { role: CRMRole; perms: CRMPermission[] } {
  const superAdminRole: CRMRole = {
    id: `role-super-${orgId}`,
    org_id: orgId,
    name: "Super Admin",
    color: "#1D4ED8",
    icon: "Crown",
    is_super_admin: true,
    created_at: new Date().toISOString(),
  };

  const perms: CRMPermission[] = ALL_14_ACTIONS.map((item, idx) => ({
    id: `perm-sa-${orgId}-${idx}`,
    role_id: superAdminRole.id,
    module: item.module,
    action: item.action,
    allowed: true,
  }));

  return { role: superAdminRole, perms };
}

// ============================================================================
// 3. Unit Test Suite
// ============================================================================

describe("CRM RBAC & Permission Hook Verification Suite (Milestone 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    toastCalls.length = 0;

    // Reset default mock state
    authState.user = { id: "user-challenger-01", email: "challenger@credsmart.app" };
    orgState.orgId = "org-alpha-100";
    orgState.userRole = "cashier";
    dbState.crm_staff_roles = [];
    dbState.crm_roles = [];
    dbState.crm_permissions = [];
    dbState.shouldThrowQuery = false;
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // Dimension 1: Super-Admin Bypass Coverage
  // --------------------------------------------------------------------------
  describe("1. Super-Admin Bypass Verification", () => {
    const superAdminRoles = ["store_owner", "super_admin", "admin"];

    superAdminRoles.forEach((adminRole) => {
      it(`grants true for ALL 14 actions across 7 modules when store role is '${adminRole}'`, async () => {
        orgState.userRole = adminRole;
        // Even with ZERO database roles and ZERO permissions
        dbState.crm_roles = [];
        dbState.crm_permissions = [];
        dbState.crm_staff_roles = [];

        const { result } = renderHook(() => useCRMPermission());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.isSuperAdmin).toBe(true);

        // Verify all 14 actions explicitly evaluate to true
        for (const { module, action } of ALL_14_ACTIONS) {
          expect(result.current.hasPermission(module, action)).toBe(true);
        }

        // Verify arbitrary unknown actions also pass for super-admin bypass
        expect(result.current.hasPermission("billing", "export_secret_keys")).toBe(true);
        expect(result.current.hasPermission("financial_audit", "wipe_records")).toBe(true);
        expect(result.current.allowed).toBe(true);
      });
    });

    it("bypasses all permissions when user has CRM role with is_super_admin: true even if storeRole is regular 'staff'", async () => {
      orgState.userRole = "staff"; // non-super store role
      const customSuperRole: CRMRole = {
        id: "crm-custom-sa-1",
        org_id: "org-alpha-100",
        name: "Custom Super Admin",
        color: "#F59E0B",
        icon: "Shield",
        is_super_admin: true,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [customSuperRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: customSuperRole.id,
          assigned_by: "owner",
          assigned_at: new Date().toISOString(),
        },
      ];
      // Explicitly empty permissions table to test bypass
      dbState.crm_permissions = [];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.userRoles).toHaveLength(1);
      expect(result.current.userRoles[0].is_super_admin).toBe(true);

      for (const { module, action } of ALL_14_ACTIONS) {
        expect(result.current.hasPermission(module, action)).toBe(true);
      }
    });

    it("super_admin bypasses even if a specific crm_permission record explicitly has allowed: false", async () => {
      orgState.userRole = "store_owner";
      const saRole: CRMRole = {
        id: "role-sa-deny-test",
        org_id: "org-alpha-100",
        name: "Super Admin",
        color: "#1D4ED8",
        icon: "Crown",
        is_super_admin: true,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [saRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: saRole.id,
          assigned_by: null,
          assigned_at: new Date().toISOString(),
        },
      ];
      // Malicious or accidental entry: allowed: false for salary.edit
      dbState.crm_permissions = [
        {
          id: "p1",
          role_id: saRole.id,
          module: "salary",
          action: "edit",
          allowed: false,
        },
      ];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(true);
      // Even with allowed: false in permissions table, store_owner bypasses and gets true
      expect(result.current.hasPermission("salary", "edit")).toBe(true);
    });

    it("provides virtual super admin role fallback for store_owner if DB roles are completely absent", async () => {
      orgState.userRole = "store_owner";
      dbState.crm_roles = [];
      dbState.crm_staff_roles = [];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.userRoles).toEqual([
        expect.objectContaining({
          id: "virtual-super-admin",
          name: "Super Admin",
          is_super_admin: true,
        }),
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 2: Custom Role Explicit Grant & Granular Action Matrix
  // --------------------------------------------------------------------------
  describe("2. Custom Roles & 14-Action Granular Matrix", () => {
    it("grants only explicitly allowed actions and denies unauthorized actions", async () => {
      orgState.userRole = "cashier"; // Non-admin store role
      const hrRole: CRMRole = {
        id: "role-hr-mgr",
        org_id: "org-alpha-100",
        name: "HR Manager",
        color: "#10B981",
        icon: "Briefcase",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [hrRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: hrRole.id,
          assigned_by: "owner",
          assigned_at: new Date().toISOString(),
        },
      ];

      // HR manager has attendance (view/edit) and salary (view), but NOT salary (edit)
      dbState.crm_permissions = [
        { id: "p1", role_id: hrRole.id, module: "attendance", action: "view", allowed: true },
        { id: "p2", role_id: hrRole.id, module: "attendance", action: "edit", allowed: true },
        { id: "p3", role_id: hrRole.id, module: "salary", action: "view", allowed: true },
        { id: "p4", role_id: hrRole.id, module: "salary", action: "edit", allowed: false },
      ];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(false);

      // Allowed explicitly
      expect(result.current.hasPermission("attendance", "view")).toBe(true);
      expect(result.current.hasPermission("attendance", "edit")).toBe(true);
      expect(result.current.hasPermission("salary", "view")).toBe(true);

      // Explicitly set to allowed: false
      expect(result.current.hasPermission("salary", "edit")).toBe(false);

      // Unmentioned actions across all other modules MUST be denied
      expect(result.current.hasPermission("tasks", "view")).toBe(false);
      expect(result.current.hasPermission("tasks", "create")).toBe(false);
      expect(result.current.hasPermission("tasks", "approve")).toBe(false);
      expect(result.current.hasPermission("meetings", "view")).toBe(false);
      expect(result.current.hasPermission("meetings", "create")).toBe(false);
      expect(result.current.hasPermission("broadcasts", "view")).toBe(false);
      expect(result.current.hasPermission("broadcasts", "send")).toBe(false);
      expect(result.current.hasPermission("ai_assistant", "access")).toBe(false);
      expect(result.current.hasPermission("support", "view")).toBe(false);
      expect(result.current.hasPermission("support", "manage")).toBe(false);
    });

    it("evaluates all 14 individual actions independently with single-action dedicated roles", async () => {
      orgState.userRole = "staff";

      // Test each of the 14 actions individually
      for (const target of ALL_14_ACTIONS) {
        const testRole: CRMRole = {
          id: `role-test-${target.module}-${target.action}`,
          org_id: "org-alpha-100",
          name: `Tester for ${target.module}.${target.action}`,
          color: "#0891B2",
          icon: "KeyRound",
          is_super_admin: false,
          created_at: new Date().toISOString(),
        };

        dbState.crm_roles = [testRole];
        dbState.crm_staff_roles = [
          {
            staff_id: "user-challenger-01",
            role_id: testRole.id,
            assigned_by: "owner",
            assigned_at: new Date().toISOString(),
          },
        ];
        dbState.crm_permissions = [
          {
            id: `p-${target.module}-${target.action}`,
            role_id: testRole.id,
            module: target.module,
            action: target.action,
            allowed: true,
          },
        ];

        const { result, unmount } = renderHook(() => useCRMPermission());

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        // Target action must be allowed
        expect(
          result.current.hasPermission(target.module, target.action),
          `Expected ${target.module}.${target.action} to be true`
        ).toBe(true);

        // Every OTHER action must be denied
        for (const other of ALL_14_ACTIONS) {
          if (other.module === target.module && other.action === target.action) continue;
          expect(
            result.current.hasPermission(other.module, other.action),
            `Expected ${other.module}.${other.action} to be false when only ${target.module}.${target.action} is granted`
          ).toBe(false);
        }

        unmount();
      }
    });

    it("correctly unions permissions from multiple assigned roles", async () => {
      orgState.userRole = "cashier";

      const taskRole: CRMRole = {
        id: "role-task-manager",
        org_id: "org-alpha-100",
        name: "Task Manager",
        color: "#9333EA",
        icon: "FileText",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      const commsRole: CRMRole = {
        id: "role-comms-lead",
        org_id: "org-alpha-100",
        name: "Comms Lead",
        color: "#0891B2",
        icon: "Zap",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [taskRole, commsRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: taskRole.id,
          assigned_by: "admin",
          assigned_at: new Date().toISOString(),
        },
        {
          staff_id: "user-challenger-01",
          role_id: commsRole.id,
          assigned_by: "admin",
          assigned_at: new Date().toISOString(),
        },
      ];

      dbState.crm_permissions = [
        { id: "p1", role_id: taskRole.id, module: "tasks", action: "view", allowed: true },
        { id: "p2", role_id: taskRole.id, module: "tasks", action: "create", allowed: true },
        { id: "p3", role_id: taskRole.id, module: "tasks", action: "approve", allowed: true },
        { id: "p4", role_id: commsRole.id, module: "broadcasts", action: "view", allowed: true },
        { id: "p5", role_id: commsRole.id, module: "broadcasts", action: "send", allowed: true },
      ];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.userRoles).toHaveLength(2);

      // Union of tasks permissions
      expect(result.current.hasPermission("tasks", "view")).toBe(true);
      expect(result.current.hasPermission("tasks", "create")).toBe(true);
      expect(result.current.hasPermission("tasks", "approve")).toBe(true);

      // Union of broadcasts permissions
      expect(result.current.hasPermission("broadcasts", "view")).toBe(true);
      expect(result.current.hasPermission("broadcasts", "send")).toBe(true);

      // Unassigned modules remain denied
      expect(result.current.hasPermission("attendance", "view")).toBe(false);
      expect(result.current.hasPermission("salary", "view")).toBe(false);
      expect(result.current.hasPermission("meetings", "view")).toBe(false);
      expect(result.current.hasPermission("ai_assistant", "access")).toBe(false);
      expect(result.current.hasPermission("support", "manage")).toBe(false);
    });

    it("revokes permissions dynamically when refreshPermissions is called after role removal", async () => {
      orgState.userRole = "staff";
      const tempRole: CRMRole = {
        id: "role-temp",
        org_id: "org-alpha-100",
        name: "Temp Role",
        color: "#E11D48",
        icon: "User",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [tempRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: tempRole.id,
          assigned_by: "owner",
          assigned_at: new Date().toISOString(),
        },
      ];
      dbState.crm_permissions = [
        { id: "p1", role_id: tempRole.id, module: "support", action: "manage", allowed: true },
      ];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission("support", "manage")).toBe(true);

      // Simulate staff role demotion/unassignment in DB
      dbState.crm_staff_roles = [];

      await act(async () => {
        await result.current.refreshPermissions();
      });

      expect(result.current.userRoles).toHaveLength(0);
      expect(result.current.permissions).toHaveLength(0);
      expect(result.current.hasPermission("support", "manage")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 3: Offline Resilience & localStorage Fallback Caching
  // --------------------------------------------------------------------------
  describe("3. Offline & localStorage Fallback Caching", () => {
    it("synchronously initializes userRoles and permissions from localStorage on mount before network resolves", async () => {
      const cachedRole: CRMRole = {
        id: "role-cached-001",
        org_id: "org-alpha-100",
        name: "Cached Lead",
        color: "#1D4ED8",
        icon: "Shield",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };
      const cachedPerms: CRMPermission[] = [
        { id: "cp-1", role_id: cachedRole.id, module: "attendance", action: "view", allowed: true },
      ];

      localStorage.setItem("credsmart_crm_roles_org-alpha-100", JSON.stringify([cachedRole]));
      localStorage.setItem("credsmart_crm_permissions_org-alpha-100", JSON.stringify(cachedPerms));

      const { result } = renderHook(() => useCRMPermission());

      // Initial synchronous state should contain the cached values
      expect(result.current.userRoles).toEqual([cachedRole]);
      expect(result.current.permissions).toEqual(cachedPerms);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("writes resolved roles and permissions into localStorage on successful query", async () => {
      const activeRole: CRMRole = {
        id: "role-db-sync",
        org_id: "org-alpha-100",
        name: "DB Role",
        color: "#10B981",
        icon: "Users",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [activeRole];
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: activeRole.id,
          assigned_by: null,
          assigned_at: new Date().toISOString(),
        },
      ];
      dbState.crm_permissions = [
        { id: "dp-1", role_id: activeRole.id, module: "tasks", action: "create", allowed: true },
      ];

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify localStorage was populated
      const savedRoles = JSON.parse(localStorage.getItem("credsmart_crm_roles_org-alpha-100") || "[]");
      const savedPerms = JSON.parse(localStorage.getItem("credsmart_crm_permissions_org-alpha-100") || "[]");
      const savedStaff = JSON.parse(localStorage.getItem("credsmart_crm_staff_roles_org-alpha-100") || "[]");

      expect(savedRoles).toHaveLength(1);
      expect(savedRoles[0].name).toBe("DB Role");
      expect(savedPerms).toHaveLength(1);
      expect(savedPerms[0].action).toBe("create");
      expect(savedStaff).toHaveLength(1);
    });

    it("falls back to localStorage cache when Supabase queries throw an exception (offline/network failure)", async () => {
      const offlineRole: CRMRole = {
        id: "role-offline-cached",
        org_id: "org-alpha-100",
        name: "Offline Fallback Lead",
        color: "#F59E0B",
        icon: "Shield",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };
      const offlinePerms: CRMPermission[] = [
        { id: "op-1", role_id: offlineRole.id, module: "salary", action: "view", allowed: true },
      ];

      // Seed localStorage beforehand
      localStorage.setItem("credsmart_crm_roles_org-alpha-100", JSON.stringify([offlineRole]));
      localStorage.setItem("credsmart_crm_permissions_org-alpha-100", JSON.stringify(offlinePerms));

      // Simulate network disconnection
      dbState.shouldThrowQuery = true;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should capture error but recover state from localStorage cache
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain("Hard network failure");
      expect(result.current.userRoles).toHaveLength(1);
      expect(result.current.userRoles[0].name).toBe("Offline Fallback Lead");
      expect(result.current.permissions).toHaveLength(1);

      // Permissions check still functions offline using cached data
      expect(result.current.hasPermission("salary", "view")).toBe(true);
      expect(result.current.hasPermission("salary", "edit")).toBe(false);

      consoleSpy.mockRestore();
    });

    it("gracefully handles corrupted JSON in localStorage without throwing uncaught exceptions", async () => {
      localStorage.setItem("credsmart_crm_roles_org-alpha-100", "CORRUPTED{MALFORMED:JSON");
      localStorage.setItem("credsmart_crm_permissions_org-alpha-100", "{\"unclosed: [");

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Does not crash, defaults safely to empty
      expect(result.current.userRoles).toEqual([]);
      expect(result.current.permissions).toEqual([]);
      expect(result.current.hasPermission("attendance", "view")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 4: Organization Isolation & Multi-Tenancy Boundary
  // --------------------------------------------------------------------------
  describe("4. Organization Isolation & Multi-Tenancy Boundary", () => {
    it("strictly isolates permissions between organizations: Org-A roles never grant access in Org-B", async () => {
      orgState.userRole = "staff";

      // Role defined in Org-A
      const orgARole: CRMRole = {
        id: "role-org-a",
        org_id: "org-alpha-100",
        name: "Org A Manager",
        color: "#1D4ED8",
        icon: "Shield",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      // Role defined in Org-B
      const orgBRole: CRMRole = {
        id: "role-org-b",
        org_id: "org-beta-200",
        name: "Org B Manager",
        color: "#10B981",
        icon: "Shield",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [orgARole, orgBRole];

      // User assigned both roles in staff_roles
      dbState.crm_staff_roles = [
        {
          staff_id: "user-challenger-01",
          role_id: orgARole.id,
          assigned_by: null,
          assigned_at: new Date().toISOString(),
        },
        {
          staff_id: "user-challenger-01",
          role_id: orgBRole.id,
          assigned_by: null,
          assigned_at: new Date().toISOString(),
        },
      ];

      // Org-A role has ai_assistant.access; Org-B role has support.manage
      dbState.crm_permissions = [
        { id: "p-a", role_id: orgARole.id, module: "ai_assistant", action: "access", allowed: true },
        { id: "p-b", role_id: orgBRole.id, module: "support", action: "manage", allowed: true },
      ];

      // Active org is Org-A
      orgState.orgId = "org-alpha-100";
      const { result: resultA, unmount: unmountA } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(resultA.current.loading).toBe(false);
      });

      // In Org-A: Has Org-A permission, BUT NOT Org-B permission
      expect(resultA.current.userRoles).toHaveLength(1);
      expect(resultA.current.userRoles[0].id).toBe("role-org-a");
      expect(resultA.current.hasPermission("ai_assistant", "access")).toBe(true);
      expect(resultA.current.hasPermission("support", "manage")).toBe(false);

      unmountA();

      // Now switch active org to Org-B
      orgState.orgId = "org-beta-200";
      const { result: resultB, unmount: unmountB } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(resultB.current.loading).toBe(false);
      });

      // In Org-B: Has Org-B permission, BUT NOT Org-A permission
      expect(resultB.current.userRoles).toHaveLength(1);
      expect(resultB.current.userRoles[0].id).toBe("role-org-b");
      expect(resultB.current.hasPermission("ai_assistant", "access")).toBe(false);
      expect(resultB.current.hasPermission("support", "manage")).toBe(true);

      unmountB();
    });

    it("denies all permissions when user is unauthenticated or orgId is null", async () => {
      authState.user = null;
      orgState.orgId = null;

      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.userRoles).toHaveLength(0);
      expect(result.current.permissions).toHaveLength(0);
      expect(result.current.hasPermission("attendance", "view")).toBe(false);
      expect(result.current.hasPermission("salary", "view")).toBe(false);
    });

    it("segregates localStorage keys strictly by orgId preventing cross-tenant cache leakage", async () => {
      localStorage.setItem("credsmart_crm_roles_org-alpha-100", JSON.stringify([{ id: "r-alpha", name: "Alpha Role" }]));
      localStorage.setItem("credsmart_crm_roles_org-beta-200", JSON.stringify([{ id: "r-beta", name: "Beta Role" }]));

      orgState.orgId = "org-alpha-100";
      const { result: resultA, unmount: unmountA } = renderHook(() => useCRMPermission());
      expect(resultA.current.userRoles[0].name).toBe("Alpha Role");
      unmountA();

      orgState.orgId = "org-beta-200";
      const { result: resultB, unmount: unmountB } = renderHook(() => useCRMPermission());
      expect(resultB.current.userRoles[0].name).toBe("Beta Role");
      unmountB();
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 5: Hook Signatures, Aliases & Single-Action Evaluation
  // --------------------------------------------------------------------------
  describe("5. Hook Signatures & Export Aliases", () => {
    it("evaluates single module+action passed to useCRMPermission(module, action)", async () => {
      orgState.userRole = "staff";
      const commsRole: CRMRole = {
        id: "role-comms",
        org_id: "org-alpha-100",
        name: "Comms",
        color: "#1D4ED8",
        icon: "Zap",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [commsRole];
      dbState.crm_staff_roles = [
        { staff_id: "user-challenger-01", role_id: commsRole.id, assigned_by: null, assigned_at: new Date().toISOString() },
      ];
      dbState.crm_permissions = [
        { id: "p1", role_id: commsRole.id, module: "broadcasts", action: "send", allowed: true },
      ];

      // Hook invoked with allowed pair
      const { result: allowedHook } = renderHook(() => useCRMPermission("broadcasts", "send"));
      await waitFor(() => {
        expect(allowedHook.current.loading).toBe(false);
      });
      expect(allowedHook.current.allowed).toBe(true);

      // Hook invoked with denied pair
      const { result: deniedHook } = renderHook(() => useCRMPermission("broadcasts", "view"));
      await waitFor(() => {
        expect(deniedHook.current.loading).toBe(false);
      });
      expect(deniedHook.current.allowed).toBe(false);
    });

    it("evaluates module-level access when only module is passed without action", async () => {
      orgState.userRole = "staff";
      const taskRole: CRMRole = {
        id: "role-task",
        org_id: "org-alpha-100",
        name: "Task Role",
        color: "#10B981",
        icon: "FileText",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [taskRole];
      dbState.crm_staff_roles = [
        { staff_id: "user-challenger-01", role_id: taskRole.id, assigned_by: null, assigned_at: new Date().toISOString() },
      ];
      dbState.crm_permissions = [
        { id: "p1", role_id: taskRole.id, module: "tasks", action: "view", allowed: true },
      ];

      // Module "tasks" has an allowed action
      const { result: taskResult } = renderHook(() => useCRMPermission("tasks"));
      await waitFor(() => {
        expect(taskResult.current.loading).toBe(false);
      });
      expect(taskResult.current.allowed).toBe(true);

      // Module "attendance" has NO allowed action
      const { result: attResult } = renderHook(() => useCRMPermission("attendance"));
      await waitFor(() => {
        expect(attResult.current.loading).toBe(false);
      });
      expect(attResult.current.allowed).toBe(false);
    });

    it("exports usePermission alias identical to useCRMPermission", async () => {
      expect(usePermission).toBe(useCRMPermission);

      orgState.userRole = "store_owner";
      const { result } = renderHook(() => usePermission("attendance", "view"));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.allowed).toBe(true);
      expect(result.current.isSuperAdmin).toBe(true);
    });

    it("provides both refetch and refreshPermissions pointing to same fetch callback", async () => {
      const { result } = renderHook(() => useCRMPermission());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
      expect(typeof result.current.refreshPermissions).toBe("function");
      expect(result.current.refetch).toBe(result.current.refreshPermissions);
    });
  });

  // --------------------------------------------------------------------------
  // Dimension 6: CRMPermissionGate Component Verification
  // --------------------------------------------------------------------------
  describe("6. CRMPermissionGate Component Verification", () => {
    it("renders children when user has explicit permission and does not show toast", async () => {
      orgState.userRole = "staff";
      const role: CRMRole = {
        id: "role-gate-1",
        org_id: "org-alpha-100",
        name: "Gate Keeper",
        color: "#1D4ED8",
        icon: "Shield",
        is_super_admin: false,
        created_at: new Date().toISOString(),
      };

      dbState.crm_roles = [role];
      dbState.crm_staff_roles = [
        { staff_id: "user-challenger-01", role_id: role.id, assigned_by: null, assigned_at: new Date().toISOString() },
      ];
      dbState.crm_permissions = [
        { id: "p1", role_id: role.id, module: "attendance", action: "edit", allowed: true },
      ];

      render(
        React.createElement(
          CRMPermissionGate,
          { module: "attendance", action: "edit" },
          React.createElement("div", { "data-testid": "allowed-content" }, "Authorized Attendance Editor")
        )
      );

      await waitFor(() => {
        expect(screen.getByTestId("allowed-content")).toBeInTheDocument();
      });

      expect(toastCalls).toHaveLength(0);
    });

    it("renders fallback and fires 'Not Authorized' toast when permission is denied", async () => {
      orgState.userRole = "staff";
      dbState.crm_roles = [];
      dbState.crm_staff_roles = [];
      dbState.crm_permissions = [];

      render(
        React.createElement(
          CRMPermissionGate,
          {
            module: "salary",
            action: "edit",
            fallback: React.createElement("div", { "data-testid": "denied-fallback" }, "Locked: Salary Edit"),
          },
          React.createElement("div", { "data-testid": "secret-content" }, "Secret Payroll Config")
        )
      );

      await waitFor(() => {
        expect(screen.getByTestId("denied-fallback")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("secret-content")).not.toBeInTheDocument();

      // Toast must have been fired
      expect(toastCalls.length).toBeGreaterThanOrEqual(1);
      const denialToast = toastCalls.find((t) => t.title === "Not Authorized");
      expect(denialToast).toBeDefined();
      expect(denialToast?.description).toContain("You do not have permission to edit in salary.");
      expect(denialToast?.variant).toBe("destructive");
    });

    it("suppresses toast notification when suppressToast={true}", async () => {
      orgState.userRole = "staff";
      dbState.crm_roles = [];
      dbState.crm_staff_roles = [];
      dbState.crm_permissions = [];

      render(
        React.createElement(
          CRMPermissionGate,
          {
            module: "ai_assistant",
            action: "access",
            suppressToast: true,
            fallback: React.createElement("div", { "data-testid": "ai-locked" }, "AI Locked"),
          },
          React.createElement("div", { "data-testid": "ai-active" }, "AI Workspace")
        )
      );

      await waitFor(() => {
        expect(screen.getByTestId("ai-locked")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("ai-active")).not.toBeInTheDocument();
      expect(toastCalls).toHaveLength(0);
    });

    it("super-admin passes through CRMPermissionGate even without specific permission", async () => {
      orgState.userRole = "store_owner";
      dbState.crm_roles = [];
      dbState.crm_staff_roles = [];
      dbState.crm_permissions = [];

      render(
        React.createElement(
          CRMPermissionGate,
          { module: "meetings", action: "create" },
          React.createElement("button", { "data-testid": "create-meet-btn" }, "Schedule Team Huddle")
        )
      );

      await waitFor(() => {
        expect(screen.getByTestId("create-meet-btn")).toBeInTheDocument();
      });

      expect(toastCalls).toHaveLength(0);
    });

    it("renders custom toastMessage when provided on denial", async () => {
      orgState.userRole = "staff";
      dbState.crm_roles = [];
      dbState.crm_staff_roles = [];
      dbState.crm_permissions = [];

      render(
        React.createElement(
          CRMPermissionGate,
          {
            module: "support",
            action: "manage",
            toastMessage: "Custom: Please ask your administrator to grant Support Desk access.",
          },
          React.createElement("div", null, "Support Content")
        )
      );

      await waitFor(() => {
        expect(toastCalls.length).toBeGreaterThanOrEqual(1);
      });

      const customToast = toastCalls.find(
        (t) => t.description === "Custom: Please ask your administrator to grant Support Desk access."
      );
      expect(customToast).toBeDefined();
    });
  });
});

