import { useState, useEffect, useCallback, useMemo } from "react";
import { crmApi } from "@/services/crmApi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * CRM Role definition matching public.crm_roles table
 */
export interface CRMRole {
  id: string;
  org_id: string;
  name: string;
  color: string;
  icon: string;
  is_super_admin: boolean;
  created_at: string;
}

/**
 * CRM Permission entry matching public.crm_permissions table
 */
export interface CRMPermission {
  id: string;
  role_id: string;
  module: string;
  action: string;
  allowed: boolean;
}

/**
 * CRM Staff Role junction matching public.crm_staff_roles table
 */
export interface CRMStaffRole {
  staff_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

/**
 * Return interface for useCRMPermission and usePermission hooks
 */
export interface UseCRMPermissionResult {
  /** Checks if the user has permission for a specific module and action */
  hasPermission: (module: string, action: string) => boolean;
  /** True if user has super-admin privileges or is organization owner */
  isSuperAdmin: boolean;
  /** Custom CRM roles assigned to the current user in active org */
  userRoles: CRMRole[];
  /** Granular permissions list for user's assigned roles */
  permissions: CRMPermission[];
  /** Whether permissions and roles are currently loading */
  loading: boolean;
  /** Error encountered during fetch, if any */
  error: Error | null;
  /** Refresh permissions from Supabase and sync with localStorage */
  refreshPermissions: () => Promise<void>;
  /** Alias for refreshPermissions */
  refetch: () => Promise<void>;
  /** Boolean permission evaluation for (module, action) arguments passed to hook */
  allowed: boolean;
}

/**
 * Helper to safely read JSON from localStorage
 */
function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Helper to safely write JSON to localStorage
 */
function writeStorageJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("useCRMPermission: localStorage write failed:", err);
  }
}

/**
 * useCRMPermission
 * Granular Role-Based Access Control hook for CredSmart CRM.
 * Evaluates user roles, handles super-admin bypass, and provides localStorage resilience.
 *
 * @param module Optional module name to evaluate (e.g. "attendance", "salary", "tasks", "meetings", "broadcasts", "ai_assistant", "support")
 * @param action Optional action name to evaluate (e.g. "view", "edit", "create", "approve", "send", "access", "manage")
 * @returns UseCRMPermissionResult containing hasPermission evaluator and role metadata
 */
export function useCRMPermission(module?: string, action?: string): UseCRMPermissionResult {
  const { user } = useAuth();
  const { orgId, userRole } = useOrganization();

  // Storage keys for resilient offline caching
  const rolesStorageKey = orgId ? `credsmart_crm_roles_${orgId}` : null;
  const permissionsStorageKey = orgId ? `credsmart_crm_permissions_${orgId}` : null;
  const staffRolesStorageKey = orgId ? `credsmart_crm_staff_roles_${orgId}` : null;

  // Initialize from cache if available to prevent layout flicker
  const [userRoles, setUserRoles] = useState<CRMRole[]>(() => {
    if (!rolesStorageKey) return [];
    return readStorageJson<CRMRole[]>(rolesStorageKey, []);
  });

  const [permissions, setPermissions] = useState<CRMPermission[]>(() => {
    if (!permissionsStorageKey) return [];
    return readStorageJson<CRMPermission[]>(permissionsStorageKey, []);
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !orgId) {
      setUserRoles([]);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user's assigned staff role junctions
      let staffRolesData: CRMStaffRole[] | null = null;
      let staffRolesSuccess = false;
      try {
        const { data, error } = await supabase
          .from("crm_staff_roles")
          .select("staff_id, role_id, assigned_by, assigned_at")
          .eq("staff_id", user.id);
        if (!error && data) {
          staffRolesData = data as CRMStaffRole[];
          staffRolesSuccess = true;
        }
      } catch (err) {
        throw err;
      }

      if (!staffRolesSuccess) {
        try {
          const res = await crmApi.getCRMStaffRoles(orgId, user.id);
          if (!res.error && res.data) {
            staffRolesData = res.data;
          }
        } catch {}
      }

      // Also fetch all org roles to resolve names and check if user has org super_admin role
      let orgRolesData: CRMRole[] | null = null;
      let orgRolesSuccess = false;
      try {
        const { data, error } = await supabase
          .from("crm_roles")
          .select("id, org_id, name, color, icon, is_super_admin, created_at")
          .eq("org_id", orgId);
        if (!error && data) {
          orgRolesData = data as CRMRole[];
          orgRolesSuccess = true;
        }
      } catch (err) {
        throw err;
      }

      if (!orgRolesSuccess) {
        try {
          const res = await crmApi.getCRMRoles(orgId);
          if (!res.error && res.data) {
            orgRolesData = res.data;
          }
        } catch {}
      }

      const allOrgRoles: CRMRole[] = orgRolesData ?? [];
      const assignedRoleIds = new Set<string>((staffRolesData ?? []).map((sr) => sr.role_id));

      // Check if user is organization owner or manager
      const isOwnerOrSuper = userRole === "store_owner" || userRole === "super_admin" || userRole === "admin";

      let resolvedRoles: CRMRole[] = allOrgRoles.filter((r) => assignedRoleIds.has(r.id));

      // If user is owner/super_admin, include any super_admin role for this org
      if (isOwnerOrSuper) {
        const superRoles = allOrgRoles.filter((r) => r.is_super_admin);
        if (superRoles.length > 0) {
          const combined = [...resolvedRoles];
          for (const sr of superRoles) {
            if (!combined.some((c) => c.id === sr.id)) {
              combined.push(sr);
            }
          }
          resolvedRoles = combined;
        } else if (resolvedRoles.length === 0) {
          // Virtual super admin role fallback if no DB roles exist yet
          resolvedRoles = [
            {
              id: "virtual-super-admin",
              org_id: orgId,
              name: "Super Admin",
              color: "#1D4ED8",
              icon: "Crown",
              is_super_admin: true,
              created_at: new Date().toISOString(),
            },
          ];
        }
      }

      // 2. Fetch permissions for resolved roles
      const resolvedRoleIds = resolvedRoles.map((r) => r.id).filter((id) => id !== "virtual-super-admin");
      let resolvedPermissions: CRMPermission[] = [];

      if (resolvedRoleIds.length > 0) {
        let permsSuccess = false;
        try {
          const { data, error } = await supabase
            .from("crm_permissions")
            .select("id, role_id, module, action, allowed")
            .in("role_id", resolvedRoleIds);
          if (!error && data) {
            resolvedPermissions = data as unknown as CRMPermission[];
            permsSuccess = true;
          }
        } catch (err) {
          throw err;
        }

        if (!permsSuccess) {
          try {
            const res = await crmApi.getCRMPermissions();
            if (!res.error && res.data) {
              resolvedPermissions = res.data as unknown as CRMPermission[];
            }
          } catch {}
        }
      }

      setUserRoles(resolvedRoles);
      setPermissions(resolvedPermissions);

      // 3. Cache to localStorage
      if (rolesStorageKey) writeStorageJson(rolesStorageKey, resolvedRoles);
      if (permissionsStorageKey) writeStorageJson(permissionsStorageKey, resolvedPermissions);
      if (staffRolesStorageKey && staffRolesData) writeStorageJson(staffRolesStorageKey, staffRolesData);
    } catch (err: unknown) {
      console.error("useCRMPermission: Error loading permissions:", err);
      const normalizedErr = err instanceof Error ? err : new Error(String(err));
      setError(normalizedErr);

      // Fallback to cache
      if (rolesStorageKey && permissionsStorageKey) {
        const cachedRoles = readStorageJson<CRMRole[]>(rolesStorageKey, []);
        const cachedPerms = readStorageJson<CRMPermission[]>(permissionsStorageKey, []);
        if (cachedRoles.length > 0) {
          setUserRoles(cachedRoles);
          setPermissions(cachedPerms);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, orgId, userRole, rolesStorageKey, permissionsStorageKey, staffRolesStorageKey]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Determine super-admin status
  const isSuperAdmin = useMemo(() => {
    if (userRole === "store_owner" || userRole === "super_admin" || userRole === "admin") {
      return true;
    }
    return userRoles.some((r) => r.is_super_admin === true);
  }, [userRole, userRoles]);

  // Evaluator function
  const hasPermission = useCallback(
    (mod: string, act: string): boolean => {
      // Super admin always bypasses all checks
      if (isSuperAdmin) return true;

      // Check if any assigned role explicitly grants allowed: true
      return permissions.some(
        (p) => p.module === mod && p.action === act && p.allowed === true
      );
    },
    [isSuperAdmin, permissions]
  );

  // Evaluate single module/action if passed as hook parameters
  const allowed = useMemo(() => {
    if (isSuperAdmin) return true;
    if (module && action) {
      return hasPermission(module, action);
    }
    if (module && !action) {
      return permissions.some((p) => p.module === module && p.allowed === true);
    }
    return true;
  }, [isSuperAdmin, module, action, hasPermission, permissions]);

  return {
    hasPermission,
    isSuperAdmin,
    userRoles,
    permissions,
    loading,
    error,
    refreshPermissions: fetchPermissions,
    refetch: fetchPermissions,
    allowed,
  };
}

/**
 * Alias exported as usePermission to satisfy both specifications
 */
export const usePermission = useCRMPermission;
export default useCRMPermission;
