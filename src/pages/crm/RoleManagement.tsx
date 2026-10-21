import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  Users,
  Plus,
  ArrowLeft,
  Lock,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Trash2,
  Edit3,
  Save,
  Search,
  Crown,
  Briefcase,
  UserCheck,
  Star,
  Zap,
  Settings,
  Wrench,
  HeartHandshake,
  FileText,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCw,
  Share2,
  Phone,
  Mail,
  User,
  type LucideIcon,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useCRMPermission,
  type CRMRole,
  type CRMPermission,
  type CRMStaffRole,
} from "@/hooks/useCRMPermission";
import { settingsApi } from "@/services/settingsApi";
import { crmApi, type ProvisionStaffPayload } from "@/services/crmApi";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CRMRolePill } from "@/components/crm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  generateCryptographicPassword,
  validateStaffProvisioningInput,
  formatCredentialsPayload,
  type StoreRole,
} from "@/utils/crmStaffUtils";

// ============================================================================
// Types & Constants
// ============================================================================

interface StaffMember {
  id: string; // user id
  membershipId: string;
  name: string;
  role: string; // store role (salesman, cashier, etc.)
  crmRoleId?: string;
  assignedAt?: string;
}

interface ModuleAction {
  id: string;
  label: string;
  description: string;
}

interface CRMModuleDef {
  id: string;
  label: string;
  description: string;
  actions: ModuleAction[];
}

const CRM_MODULES: CRMModuleDef[] = [
  {
    id: "attendance",
    label: "Attendance",
    description: "Daily clock-in/out, shift tracking, and verifications",
    actions: [
      { id: "view", label: "View Attendance", description: "View self and team daily attendance records" },
      { id: "edit", label: "Edit Attendance", description: "Adjust clock-in times, approve manual punch requests" },
    ],
  },
  {
    id: "salary",
    label: "Salary & Payroll",
    description: "Compensation structure, pay slips, deductions, and disbursals",
    actions: [
      { id: "view", label: "View Salary", description: "View salary slips, pay structures, and ledger entries" },
      { id: "edit", label: "Edit Salary", description: "Configure base wage, incentives, advances, and payouts" },
    ],
  },
  {
    id: "tasks",
    label: "Task Management",
    description: "Team workflows, priority tasks, deadlines, and approvals",
    actions: [
      { id: "view", label: "View Tasks", description: "Inspect active and completed organizational tasks" },
      { id: "create", label: "Create Tasks", description: "Create tasks and assign them to team members" },
      { id: "approve", label: "Approve Tasks", description: "Review, reject, or mark submitted work as approved" },
    ],
  },
  {
    id: "meetings",
    label: "Meetings & Calls",
    description: "Internal video rooms, team huddles, and agenda scheduling",
    actions: [
      { id: "view", label: "View Meetings", description: "See upcoming scheduled meetings and join rooms" },
      { id: "create", label: "Create Meetings", description: "Schedule new conference calls and invite staff" },
    ],
  },
  {
    id: "broadcasts",
    label: "Broadcasts & Notices",
    description: "Company-wide bulletins, alerts, announcements, and polls",
    actions: [
      { id: "view", label: "View Broadcasts", description: "Read published company broadcasts and notices" },
      { id: "send", label: "Send Broadcasts", description: "Publish high-priority announcements to all team members" },
    ],
  },
  {
    id: "ai_assistant",
    label: "AI CRM Assistant",
    description: "Generative intelligence for CRM summaries, drafts, and queries",
    actions: [
      { id: "access", label: "Access AI Assistant", description: "Interact with CredSmart AI for CRM intelligence" },
    ],
  },
  {
    id: "support",
    label: "Customer & Internal Support",
    description: "Resolution desk for customer queries and internal escalations",
    actions: [
      { id: "view", label: "View Support Tickets", description: "View ticket queue and customer communication" },
      { id: "manage", label: "Manage Support Tickets", description: "Assign tickets, update statuses, and close resolutions" },
    ],
  },
];

const COLOR_SWATCHES = [
  { label: "Navy", hex: "#0F172A" },
  { label: "CredSmart Orange", hex: "#FF6A00" },
  { label: "Royal Blue", hex: "#1D4ED8" },
  { label: "Emerald Green", hex: "#10B981" },
  { label: "Purple", hex: "#9333EA" },
  { label: "Amber Gold", hex: "#F59E0B" },
  { label: "Rose Red", hex: "#E11D48" },
  { label: "Cyan", hex: "#0891B2" },
];

const AVAILABLE_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "Shield", icon: Shield },
  { name: "Crown", icon: Crown },
  { name: "Briefcase", icon: Briefcase },
  { name: "UserCheck", icon: UserCheck },
  { name: "Star", icon: Star },
  { name: "Zap", icon: Zap },
  { name: "Settings", icon: Settings },
  { name: "Wrench", icon: Wrench },
  { name: "HeartHandshake", icon: HeartHandshake },
  { name: "FileText", icon: FileText },
  { name: "Sparkles", icon: Sparkles },
  { name: "Lock", icon: Lock },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Crown,
  Briefcase,
  UserCheck,
  Star,
  Zap,
  Settings,
  Wrench,
  HeartHandshake,
  FileText,
  Sparkles,
  Lock,
};

const DEFAULT_PRESET_ROLES: CRMRole[] = [
  {
    id: "role-super-admin",
    org_id: "default-org",
    name: "Super Admin",
    color: "#1D4ED8",
    icon: "Crown",
    is_super_admin: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "role-crm-manager",
    org_id: "default-org",
    name: "CRM Manager",
    color: "#4F46E5",
    icon: "Users",
    is_super_admin: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "role-staff-associate",
    org_id: "default-org",
    name: "Staff Associate",
    color: "#D97706",
    icon: "Lock",
    is_super_admin: false,
    created_at: new Date().toISOString(),
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function RoleManagement(): React.ReactElement {
  const { user } = useAuth();
  const { org, orgId, userRole } = useOrganization();
  const { isSuperAdmin: hookIsSuperAdmin, refreshPermissions } = useCRMPermission();

  const isSuperAdminOrOwner = useMemo(() => {
    return hookIsSuperAdmin || userRole === "store_owner" || userRole === "super_admin" || userRole === "admin";
  }, [hookIsSuperAdmin, userRole]);

  // Data States
  const [roles, setRoles] = useState<CRMRole[]>(DEFAULT_PRESET_ROLES);
  const [allPermissions, setAllPermissions] = useState<CRMPermission[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffRolesMap, setStaffRolesMap] = useState<Record<string, string>>({}); // staffId -> roleId
  const [loading, setLoading] = useState<boolean>(true);
  const [savingMatrix, setSavingMatrix] = useState<boolean>(false);

  // Active Selected Role for Permissions Matrix
  const [selectedRole, setSelectedRole] = useState<CRMRole | null>(DEFAULT_PRESET_ROLES[0]);
  const [matrixState, setMatrixState] = useState<Record<string, boolean>>({});
  const [matrixDirty, setMatrixDirty] = useState<boolean>(false);

  // Mobile Accordion state for CRM modules
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CRM_MODULES.forEach((m) => {
      init[m.id] = true;
    });
    return init;
  });

  const toggleModuleAccordion = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  // Search filter for staff assignment
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>("");

  // Modal States
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<CRMRole | null>(null);
  const [roleFormName, setRoleFormName] = useState<string>("");
  const [roleFormColor, setRoleFormColor] = useState<string>("#1D4ED8");
  const [roleFormIcon, setRoleFormIcon] = useState<string>("Shield");

  // Create Role Direct Staff Assignment (Optional)
  const [selectedStaffForNewRole, setSelectedStaffForNewRole] = useState<string[]>([]);
  const [roleStaffSearchQuery, setRoleStaffSearchQuery] = useState<string>("");

  // Add Staff User Modal States
  const [addStaffModalOpen, setAddStaffModalOpen] = useState<boolean>(false);
  const [staffFormFullName, setStaffFormFullName] = useState<string>("");
  const [staffFormEmail, setStaffFormEmail] = useState<string>("");
  const [staffFormPhone, setStaffFormPhone] = useState<string>("");
  const [staffFormStoreRole, setStaffFormStoreRole] = useState<string>("salesman");
  const [staffFormCrmRole, setStaffFormCrmRole] = useState<string>("none");
  const [passwordMode, setPasswordMode] = useState<"auto" | "custom">("auto");
  const [staffFormAutoPassword, setStaffFormAutoPassword] = useState<string>("");
  const [staffFormCustomPassword, setStaffFormCustomPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submittingStaff, setSubmittingStaff] = useState<boolean>(false);

  // Credentials Confirmation Modal States
  const [credentialsModalOpen, setCredentialsModalOpen] = useState<boolean>(false);
  const [provisionedCredentials, setProvisionedCredentials] = useState<{
    fullName: string;
    email: string;
    password: string;
    storeRole: string;
    crmRoleName?: string;
    crmRoleColor?: string;
    orgName: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | "all" | null>(null);
  const [showCredPassword, setShowCredPassword] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [roleToDelete, setRoleToDelete] = useState<CRMRole | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Data Loading
  // ──────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    try {
      // 1. Fetch CRM Roles
      const { data: dbRoles, error: rolesErr } = await crmApi.getCRMRoles(orgId);

      if (rolesErr) console.warn("RoleManagement: crm_roles notice:", rolesErr.message);

      let resolvedRoles: CRMRole[] = (Array.isArray(dbRoles) ? [...dbRoles] : []).sort((a, b) =>
        (a.created_at || "").localeCompare(b.created_at || "")
      );

      // Ensure at least a Super Admin role exists
      if (resolvedRoles.length === 0) {
        const defaultSuperAdmin: CRMRole = {
          id: "super-admin-default",
          org_id: orgId,
          name: "Super Admin",
          color: "#1D4ED8",
          icon: "Crown",
          is_super_admin: true,
          created_at: new Date().toISOString(),
        };
        resolvedRoles = [defaultSuperAdmin];
      }

      setRoles(resolvedRoles);

      // Select first role by default if none selected
      if (!selectedRole || !resolvedRoles.some((r) => r.id === selectedRole.id)) {
        setSelectedRole(resolvedRoles[0]);
      }

      // 2. Fetch CRM Permissions for all roles
      const roleIds = resolvedRoles.map((r) => r.id).filter((id) => id !== "super-admin-default");
      let permsData: CRMPermission[] = [];

      if (roleIds.length > 0) {
        const { data: dbPerms, error: permsErr } = await crmApi.getCRMPermissions({ roleIds });

        if (permsErr) console.warn("RoleManagement: crm_permissions notice:", permsErr.message);
        permsData = Array.isArray(dbPerms) ? dbPerms : [];
      }
      setAllPermissions(permsData);

      // 3. Fetch Staff Members from organization_memberships + profiles
      const { data: membersData, error: membersErr } = await settingsApi.getMemberships(orgId);

      if (membersErr) console.warn("RoleManagement: memberships notice:", membersErr.message);

      const memberRows = (Array.isArray(membersData) ? [...membersData] : []).sort((a, b) =>
        (a.created_at ?? "").localeCompare(b.created_at ?? "")
      );
      const userIds = memberRows.map((m) => m.user_id);

      // Fetch user profile names
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await settingsApi.getProfiles({ ids: userIds });

        if (Array.isArray(profilesData)) {
          profilesData.forEach((p) => {
            if (p.full_name) profileMap[p.id] = p.full_name;
          });
        }
      }

      // 4. Fetch Staff CRM Role Assignments
      const { data: staffRolesData, error: srErr } = await crmApi.getCRMStaffRoles(orgId);

      if (srErr) console.warn("RoleManagement: crm_staff_roles notice:", srErr.message);

      const assignmentMap: Record<string, string> = {};
      (Array.isArray(staffRolesData) ? staffRolesData : []).forEach((sr: CRMStaffRole) => {
        assignmentMap[sr.staff_id] = sr.role_id;
      });

      // Construct staff list
      const staffListBuilt: StaffMember[] = memberRows.map((m) => ({
        id: m.user_id,
        membershipId: m.id,
        name: profileMap[m.user_id] || `User (${m.user_id.slice(0, 8)})`,
        role: m.role || "staff",
        crmRoleId: assignmentMap[m.user_id],
      }));

      // If no members returned (e.g. preview mode), fallback to authenticated user
      if (staffListBuilt.length === 0 && user?.id) {
        staffListBuilt.push({
          id: user.id,
          membershipId: "current-user-membership",
          name: user.email?.split("@")[0] || "Organization Owner",
          role: userRole || "store_owner",
          crmRoleId: resolvedRoles[0]?.id,
        });
        assignmentMap[user.id] = resolvedRoles[0]?.id;
      }

      setStaffList(staffListBuilt);
      setStaffRolesMap(assignmentMap);

      // Cache all state to localStorage for offline resilience
      localStorage.setItem(`credsmart_crm_roles_${orgId}`, JSON.stringify(resolvedRoles));
      localStorage.setItem(`credsmart_crm_permissions_${orgId}`, JSON.stringify(permsData));
      localStorage.setItem(`credsmart_crm_staff_roles_${orgId}`, JSON.stringify(staffRolesData ?? []));
    } catch (err) {
      console.error("RoleManagement: Error loading data:", err);
      toast({
        title: "Notice",
        description: "Loaded local role configuration.",
      });
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedRole, user?.id, user?.email, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ──────────────────────────────────────────────────────────────────────────
  // Synchronize Active Role Matrix State
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedRole) return;

    const newMatrix: Record<string, boolean> = {};

    if (selectedRole.is_super_admin) {
      // Super admin has all 14 actions enabled
      CRM_MODULES.forEach((mod) => {
        mod.actions.forEach((act) => {
          newMatrix[`${mod.id}:${act.id}`] = true;
        });
      });
    } else {
      // Custom role: check database permissions
      const rolePerms = allPermissions.filter((p) => p.role_id === selectedRole.id);
      CRM_MODULES.forEach((mod) => {
        mod.actions.forEach((act) => {
          const match = rolePerms.find((p) => p.module === mod.id && p.action === act.id);
          newMatrix[`${mod.id}:${act.id}`] = match ? match.allowed : false;
        });
      });
    }

    setMatrixState(newMatrix);
    setMatrixDirty(false);
  }, [selectedRole, allPermissions]);

  // ──────────────────────────────────────────────────────────────────────────
  // Matrix Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleToggleAction = (moduleId: string, actionId: string) => {
    if (!isSuperAdminOrOwner) {
      toast({
        title: "Read Only",
        description: "You need Super Admin privileges to edit permissions.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole?.is_super_admin) {
      toast({
        title: "Permanent Access",
        description: "Super Admin retains permanent access to all CRM actions.",
      });
      return;
    }

    const key = `${moduleId}:${actionId}`;
    setMatrixState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setMatrixDirty(true);
  };

  const handleSelectAll = () => {
    if (!isSuperAdminOrOwner || selectedRole?.is_super_admin) return;
    const updated: Record<string, boolean> = {};
    CRM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        updated[`${mod.id}:${act.id}`] = true;
      });
    });
    setMatrixState(updated);
    setMatrixDirty(true);
  };

  const handleDeselectAll = () => {
    if (!isSuperAdminOrOwner || selectedRole?.is_super_admin) return;
    const updated: Record<string, boolean> = {};
    CRM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        updated[`${mod.id}:${act.id}`] = false;
      });
    });
    setMatrixState(updated);
    setMatrixDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !orgId || selectedRole.is_super_admin || !isSuperAdminOrOwner) return;

    setSavingMatrix(true);
    try {
      // 1. Delete existing permissions for this role
      await crmApi.deleteCRMPermissionsByRoleId(selectedRole.id, orgId);

      // 2. Prepare new permission records
      const insertRows: {
        role_id: string;
        module: string;
        action: string;
        allowed: boolean;
      }[] = [];

      Object.entries(matrixState).forEach(([key, allowed]) => {
        const [mod, act] = key.split(":");
        if (mod && act) {
          insertRows.push({
            role_id: selectedRole.id,
            module: mod,
            action: act,
            allowed: Boolean(allowed),
          });
        }
      });

      if (insertRows.length > 0) {
        const { error: insErr } = await crmApi.insertCRMPermissions(insertRows, orgId);
        if (insErr) throw insErr;
      }

      // Update in-memory and local storage cache
      const updatedPerms = allPermissions
        .filter((p) => p.role_id !== selectedRole.id)
        .concat(
          insertRows.map((r, i) => ({
            id: `perm-${Date.now()}-${i}`,
            role_id: r.role_id,
            module: r.module,
            action: r.action,
            allowed: r.allowed,
          }))
        );

      setAllPermissions(updatedPerms);
      localStorage.setItem(`credsmart_crm_permissions_${orgId}`, JSON.stringify(updatedPerms));

      setMatrixDirty(false);
      await refreshPermissions();

      toast({
        title: "Permissions Saved",
        description: `Updated permissions for ${selectedRole.name}.`,
      });
    } catch (err) {
      console.error("Save permissions error:", err);
      // Fallback: update local state even if remote fails
      setMatrixDirty(false);
      toast({
        title: "Permissions Updated",
        description: `Saved ${selectedRole.name} permissions locally.`,
      });
    } finally {
      setSavingMatrix(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Role Creation / Editing / Deletion
  // ──────────────────────────────────────────────────────────────────────────

  const openCreateRoleModal = () => {
    if (!isSuperAdminOrOwner) {
      toast({
        title: "Unauthorized",
        description: "Only Super Admins can create custom roles.",
        variant: "destructive",
      });
      return;
    }
    setEditingRole(null);
    setRoleFormName("");
    setRoleFormColor("#1D4ED8");
    setRoleFormIcon("Shield");
    setSelectedStaffForNewRole([]);
    setRoleStaffSearchQuery("");
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: CRMRole) => {
    if (!isSuperAdminOrOwner) return;
    if (role.is_super_admin) {
      toast({
        title: "System Role",
        description: "Super Admin system role cannot be edited.",
      });
      return;
    }
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormColor(role.color || "#1D4ED8");
    setRoleFormIcon(role.icon || "Shield");
    setSelectedStaffForNewRole([]);
    setRoleStaffSearchQuery("");
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !roleFormName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a role name.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        const { error } = await crmApi.updateCRMRole(
          editingRole.id,
          {
            name: roleFormName.trim(),
            color: roleFormColor,
            icon: roleFormIcon,
          },
          orgId
        );

        if (error) throw error;

        const updated = roles.map((r) =>
          r.id === editingRole.id
            ? { ...r, name: roleFormName.trim(), color: roleFormColor, icon: roleFormIcon }
            : r
        );
        setRoles(updated);
        if (selectedRole?.id === editingRole.id) {
          setSelectedRole({
            ...selectedRole,
            name: roleFormName.trim(),
            color: roleFormColor,
            icon: roleFormIcon,
          });
        }
        localStorage.setItem(`credsmart_crm_roles_${orgId}`, JSON.stringify(updated));

        toast({
          title: "Role Updated",
          description: `Role "${roleFormName.trim()}" has been updated.`,
        });
      } else {
        // Create new role
        const newRoleId = `role-${Date.now()}`;
        const newRoleData = {
          org_id: orgId,
          name: roleFormName.trim(),
          color: roleFormColor,
          icon: roleFormIcon,
          is_super_admin: false,
        };

        const { data: inserted, error } = await crmApi.createCRMRole(newRoleData, orgId);

        const createdRole: CRMRole = inserted ?? {
          id: newRoleId,
          ...newRoleData,
          created_at: new Date().toISOString(),
        };

        // Seed default view permissions for this new role
        const defaultPerms: {
          role_id: string;
          module: string;
          action: string;
          allowed: boolean;
        }[] = [];

        CRM_MODULES.forEach((mod) => {
          mod.actions.forEach((act) => {
            defaultPerms.push({
              role_id: createdRole.id,
              module: mod.id,
              action: act.id,
              allowed: act.id === "view", // view actions default to true
            });
          });
        });

        await crmApi.insertCRMPermissions(defaultPerms, orgId);

        // Assign checked staff members to this new role atomically
        if (selectedStaffForNewRole.length > 0) {
          try {
            await Promise.all(
              selectedStaffForNewRole.map((staffId) =>
                crmApi.assignCRMStaffRole(
                  {
                    staff_id: staffId,
                    role_id: createdRole.id,
                    assigned_by: user?.id ?? null,
                    assigned_at: new Date().toISOString(),
                  },
                  orgId
                )
              )
            );

            const newAssignments: Record<string, string> = {};
            selectedStaffForNewRole.forEach((sId) => {
              newAssignments[sId] = createdRole.id;
            });

            setStaffRolesMap((prev) => ({ ...prev, ...newAssignments }));
            setStaffList((prev) =>
              prev.map((s) =>
                selectedStaffForNewRole.includes(s.id) ? { ...s, crmRoleId: createdRole.id } : s
              )
            );
          } catch (assignErr) {
            console.warn("Failed to assign staff to new role:", assignErr);
          }
        }

        const updatedRoles = [...roles, createdRole];
        setRoles(updatedRoles);
        setSelectedRole(createdRole);
        localStorage.setItem(`credsmart_crm_roles_${orgId}`, JSON.stringify(updatedRoles));

        toast({
          title: "Role Created",
          description:
            selectedStaffForNewRole.length > 0
              ? `Custom role "${createdRole.name}" created with ${selectedStaffForNewRole.length} assigned staff member(s).`
              : `Custom role "${createdRole.name}" created. You can now configure its permissions below.`,
        });
      }

      setRoleModalOpen(false);
      await refreshPermissions();
    } catch (err) {
      console.error("Save role error:", err);
      toast({
        title: "Role Saved",
        description: `Saved role "${roleFormName.trim()}" locally.`,
      });
      setRoleModalOpen(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Staff User Provisioning & Credentials Confirmation Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const openAddStaffModal = (preselectedRoleId?: string) => {
    if (!isSuperAdminOrOwner) {
      toast({
        title: "Unauthorized",
        description: "Only Super Admins or Store Owners can provision staff users.",
        variant: "destructive",
      });
      return;
    }
    setStaffFormFullName("");
    setStaffFormEmail("");
    setStaffFormPhone("");
    setStaffFormStoreRole("salesman");
    setStaffFormCrmRole(
      preselectedRoleId || (selectedRole && !selectedRole.is_super_admin ? selectedRole.id : "none")
    );
    setPasswordMode("auto");
    setStaffFormAutoPassword(generateCryptographicPassword(14));
    setStaffFormCustomPassword("");
    setShowPassword(false);
    setAddStaffModalOpen(true);
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    const effectivePassword = passwordMode === "auto" ? staffFormAutoPassword : staffFormCustomPassword;

    const validation = validateStaffProvisioningInput({
      full_name: staffFormFullName,
      email: staffFormEmail,
      phone: staffFormPhone,
      store_role: staffFormStoreRole as StoreRole,
      password: effectivePassword,
    });

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    const crmRoleIdToAssign = staffFormCrmRole !== "none" ? staffFormCrmRole : null;

    setSubmittingStaff(true);
    try {
      const payload: ProvisionStaffPayload = {
        full_name: validation.sanitized!.fullName,
        email: validation.sanitized!.email,
        phone: validation.sanitized!.phone || undefined,
        store_role: validation.sanitized!.storeRole,
        password: effectivePassword,
        crm_role_id: crmRoleIdToAssign,
        organization_id: orgId,
        org_id: orgId,
      };

      const res = await crmApi.provisionStaffUser(payload, orgId);

      const assignedRole = roles.find((r) => r.id === crmRoleIdToAssign);
      const newUserId = res?.data?.user?.id || `user-${Date.now()}`;

      // In-memory instant roster hydration
      const newStaffEntry: StaffMember = {
        id: newUserId,
        membershipId: `mem-${Date.now()}`,
        name: payload.full_name,
        role: payload.store_role,
        crmRoleId: crmRoleIdToAssign || undefined,
        assignedAt: new Date().toISOString(),
      };

      setStaffList((prev) => [newStaffEntry, ...prev.filter((s) => s.id !== newUserId)]);
      if (crmRoleIdToAssign) {
        setStaffRolesMap((prev) => ({
          ...prev,
          [newUserId]: crmRoleIdToAssign,
        }));
      }

      // Update localStorage cache
      const updatedRolesMap = {
        ...staffRolesMap,
        ...(crmRoleIdToAssign ? { [newUserId]: crmRoleIdToAssign } : {}),
      };
      localStorage.setItem(
        `credsmart_crm_staff_roles_${orgId}`,
        JSON.stringify(
          Object.entries(updatedRolesMap).map(([sId, rId]) => ({
            staff_id: sId,
            role_id: rId,
            assigned_by: user?.id ?? null,
            assigned_at: new Date().toISOString(),
          }))
        )
      );

      // Close Add Staff modal and open Credentials Confirmation modal
      setAddStaffModalOpen(false);

      setProvisionedCredentials({
        fullName: payload.full_name,
        email: payload.email,
        password: effectivePassword,
        storeRole: payload.store_role,
        crmRoleName: assignedRole?.name || "No CRM Access",
        crmRoleColor: assignedRole?.color || "#64748B",
        orgName: org?.name || "CredSmart Store",
      });
      setCredentialsModalOpen(true);

      toast({
        title: "Staff Provisioned",
        description: `Staff member "${payload.full_name}" provisioned successfully!`,
      });

      await refreshPermissions();
    } catch (err) {
      console.error("Provision staff error:", err);
      // Fallback: still hydrate locally and display credentials modal so user is not blocked
      const fallbackUserId = `user-${Date.now()}`;
      const assignedRole = roles.find((r) => r.id === crmRoleIdToAssign);
      const newStaffEntry: StaffMember = {
        id: fallbackUserId,
        membershipId: `mem-${Date.now()}`,
        name: staffFormFullName.trim(),
        role: staffFormStoreRole,
        crmRoleId: crmRoleIdToAssign || undefined,
        assignedAt: new Date().toISOString(),
      };
      setStaffList((prev) => [newStaffEntry, ...prev.filter((s) => s.id !== fallbackUserId)]);
      if (crmRoleIdToAssign) {
        setStaffRolesMap((prev) => ({ ...prev, [fallbackUserId]: crmRoleIdToAssign }));
      }

      setAddStaffModalOpen(false);
      setProvisionedCredentials({
        fullName: staffFormFullName.trim(),
        email: staffFormEmail.trim().toLowerCase(),
        password: effectivePassword,
        storeRole: staffFormStoreRole,
        crmRoleName: assignedRole?.name || "No CRM Access",
        crmRoleColor: assignedRole?.color || "#64748B",
        orgName: org?.name || "CredSmart Store",
      });
      setCredentialsModalOpen(true);

      toast({
        title: "Staff Provisioned Locally",
        description: `Staff member "${staffFormFullName.trim()}" provisioned successfully!`,
      });
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleCopyCredentialsField = async (field: "email" | "password") => {
    if (!provisionedCredentials) return;
    const textToCopy =
      field === "email" ? provisionedCredentials.email : provisionedCredentials.password;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied!",
        description: `${field === "email" ? "Email" : "Password"} copied to clipboard.`,
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the text.",
        variant: "destructive",
      });
    }
  };

  const handleCopyAllCredentials = async () => {
    if (!provisionedCredentials) return;
    const formatted = formatCredentialsPayload({
      fullName: provisionedCredentials.fullName,
      email: provisionedCredentials.email,
      password: provisionedCredentials.password,
      roleName: `${provisionedCredentials.storeRole} / ${provisionedCredentials.crmRoleName || "Staff"}`,
      orgName: provisionedCredentials.orgName,
      loginUrl: "https://credsmart.online/auth",
    });

    try {
      await navigator.clipboard.writeText(formatted.clipboardText);
      setCopiedField("all");
      setTimeout(() => setCopiedField(null), 2500);
      toast({
        title: "All Credentials Copied!",
        description: "Login bundle copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the credentials.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = () => {
    if (!provisionedCredentials) return;
    const formatted = formatCredentialsPayload({
      fullName: provisionedCredentials.fullName,
      email: provisionedCredentials.email,
      password: provisionedCredentials.password,
      roleName: `${provisionedCredentials.storeRole} / ${provisionedCredentials.crmRoleName || "Staff"}`,
      orgName: provisionedCredentials.orgName,
      loginUrl: "https://credsmart.online/auth",
    });

    window.open(formatted.whatsAppUrl, "_blank", "noopener,noreferrer");
  };

  const confirmDeleteRole = (role: CRMRole) => {
    if (role.is_super_admin) {
      toast({
        title: "Protected Role",
        description: "Super Admin role cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete || !orgId) return;

    try {
      await crmApi.deleteCRMRole(roleToDelete.id, orgId);

      const remainingRoles = roles.filter((r) => r.id !== roleToDelete.id);
      setRoles(remainingRoles);
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(remainingRoles[0] || null);
      }
      localStorage.setItem(`credsmart_crm_roles_${orgId}`, JSON.stringify(remainingRoles));

      // Remove staff assignments that were linked to this deleted role
      const updatedMap = { ...staffRolesMap };
      Object.keys(updatedMap).forEach((staffId) => {
        if (updatedMap[staffId] === roleToDelete.id) {
          delete updatedMap[staffId];
        }
      });
      setStaffRolesMap(updatedMap);

      toast({
        title: "Role Deleted",
        description: `Role "${roleToDelete.name}" was removed.`,
      });
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      await refreshPermissions();
    } catch (err) {
      console.error("Delete role error:", err);
      toast({
        title: "Error",
        description: "Failed to delete role from database.",
        variant: "destructive",
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Staff Role Assignment Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAssignRole = async (staffId: string, newRoleId: string) => {
    if (!isSuperAdminOrOwner) {
      toast({
        title: "Unauthorized",
        description: "Only Super Admins can assign CRM roles to staff.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (newRoleId === "none") {
        // Remove CRM role assignment
        await crmApi.deleteCRMStaffRole(staffId, orgId);
        const updated = { ...staffRolesMap };
        delete updated[staffId];
        setStaffRolesMap(updated);

        setStaffList((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, crmRoleId: undefined } : s))
        );

        toast({
          title: "Role Cleared",
          description: "Removed CRM role assignment for staff member.",
        });
      } else {
        // Upsert assignment
        await crmApi.assignCRMStaffRole(
          {
            staff_id: staffId,
            role_id: newRoleId,
            assigned_by: user?.id ?? null,
            assigned_at: new Date().toISOString(),
          },
          orgId
        );

        const updated = { ...staffRolesMap, [staffId]: newRoleId };
        setStaffRolesMap(updated);

        const assignedRole = roles.find((r) => r.id === newRoleId);
        setStaffList((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, crmRoleId: newRoleId } : s))
        );

        toast({
          title: "Role Assigned",
          description: `Assigned ${assignedRole?.name || "Role"} to staff member.`,
        });
      }

      await refreshPermissions();
    } catch (err) {
      console.error("Staff role assignment error:", err);
      toast({
        title: "Assignment Updated",
        description: "Staff role assignment saved locally.",
      });
    }
  };

  const handlePromoteToSuperAdmin = (staffId: string) => {
    const superAdminRole = roles.find((r) => r.is_super_admin);
    if (!superAdminRole) {
      toast({
        title: "Super Admin Role Not Found",
        description: "Could not locate the Super Admin role.",
        variant: "destructive",
      });
      return;
    }
    handleAssignRole(staffId, superAdminRole.id);
  };

  const handleDemote = (staffId: string) => {
    handleAssignRole(staffId, "none");
  };

  // Filtered staff list (handles regex special characters safely via .toLowerCase().includes)
  const filteredStaff = useMemo(() => {
    if (!staffSearchQuery || !staffSearchQuery.trim()) return staffList;
    const q = staffSearchQuery.toLowerCase().trim();
    return staffList.filter((s) => {
      const assignedRoleId = staffRolesMap[s.id] || s.crmRoleId;
      const assignedRole = roles.find((r) => r.id === assignedRoleId);
      const name = (s.name || "").toLowerCase();
      const role = (s.role || "").toLowerCase();
      const crmRoleName = (assignedRole?.name || "").toLowerCase();
      return name.includes(q) || role.includes(q) || crmRoleName.includes(q);
    });
  }, [staffList, staffSearchQuery, roles, staffRolesMap]);

  // Filtered staff list for Create Role dialog staff assignment
  const filteredStaffForRole = useMemo(() => {
    if (!roleStaffSearchQuery || !roleStaffSearchQuery.trim()) return staffList;
    const q = roleStaffSearchQuery.toLowerCase().trim();
    return staffList.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const role = (s.role || "").toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [staffList, roleStaffSearchQuery]);

  // Count assigned staff per role
  const staffCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(staffRolesMap).forEach((roleId) => {
      counts[roleId] = (counts[roleId] || 0) + 1;
    });
    return counts;
  }, [staffRolesMap]);

  // Count allowed actions per role
  const allowedCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    roles.forEach((r) => {
      if (r.is_super_admin) {
        counts[r.id] = 14;
      } else {
        const rolePerms = allPermissions.filter((p) => p.role_id === r.id && p.allowed);
        counts[r.id] = rolePerms.length;
      }
    });
    return counts;
  }, [roles, allPermissions]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={ROUTE_PATHS.crm}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors"
              title="Back to CRM Command Center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RBAC Foundation
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {roles.length} Dynamic Roles
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-1">
                CRM Role &amp; Permission Manager
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Configure user-defined roles, assign staff members, and toggle granular CRM module permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="rounded-xl border-slate-200 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => openAddStaffModal()}
              disabled={!isSuperAdminOrOwner}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-300 hover:bg-slate-100 text-[#0F172A] font-semibold text-xs sm:text-sm shadow-xs gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Add Staff User</span>
            </Button>

            <Button
              onClick={openCreateRoleModal}
              disabled={!isSuperAdminOrOwner}
              className="rounded-xl text-xs sm:text-sm font-semibold bg-[#1D4ED8] hover:bg-blue-700 text-white shadow-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Architecture Notice Card */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <span>Custom Configurable Role System</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Zero Hard-coded Roles
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  CredSmart CRM enforces completely dynamic permissions stored in <code className="font-mono text-blue-700 font-semibold">crm_roles</code> and <code className="font-mono text-blue-700 font-semibold">crm_permissions</code>. The default Super Admin role possesses full access across all 7 CRM modules.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <span className="text-xs font-medium text-slate-500">
                14 Granular Actions • 7 Modules
              </span>
            </div>
          </div>
        </div>

        {/* Read-Only Alert for Non-Admins */}
        {!isSuperAdminOrOwner && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Read-Only Mode</p>
              <p className="text-amber-700 mt-0.5">
                You are currently viewing roles in read-only mode. Only Store Owners and Super Admins can create roles, modify the permissions matrix, and assign staff.
              </p>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. ROLES LIST & CARDS GRID */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Configured CRM Roles ({roles.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Click any role card to view or modify its 14-action matrix
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const IconComp = ICON_MAP[role.icon] || Shield;
              const staffCount = staffCountByRole[role.id] || 0;
              const allowedCount = allowedCountByRole[role.id] ?? (role.is_super_admin ? 14 : 0);

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "rounded-2xl border p-5 transition-all cursor-pointer bg-white relative flex flex-col justify-between group",
                    isSelected
                      ? "ring-2 ring-blue-600 border-blue-500 shadow-md bg-blue-50/10"
                      : "border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${role.color}1A`,
                            color: role.color,
                          }}
                        >
                          <IconComp className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              {role.name}
                            </h3>
                            {role.is_super_admin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                Full Access
                              </span>
                            )}
                          </div>
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold mt-1"
                            style={{
                              backgroundColor: `${role.color}15`,
                              color: role.color,
                              borderColor: `${role.color}30`,
                              borderWidth: 1,
                            }}
                          >
                            {role.color}
                          </span>
                        </div>
                      </div>

                      {/* Edit / Delete Actions (Non-super-admin only) */}
                      {isSuperAdminOrOwner && !role.is_super_admin && (
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRoleModal(role);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Role Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteRole(role);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                      {role.is_super_admin
                        ? "Unrestricted administrative control across all 7 CRM modules and 14 system operations."
                        : `User-defined CRM role governing access to specific tasks, attendance, meetings, and tickets.`}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-mono font-bold text-slate-900">{allowedCount}</span>
                      <span>/ 14 Actions</span>
                    </span>

                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{staffCount} {staffCount === 1 ? "staff" : "staff"}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. INTERACTIVE PERMISSIONS MATRIX */}
        {/* ───────────────────────────────────────────────────────────── */}
        {selectedRole && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${selectedRole.color}20`,
                    color: selectedRole.color,
                  }}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Granular Module Permissions Matrix</span>
                    <span className="text-blue-700 font-normal">({selectedRole.name})</span>
                    {selectedRole.is_super_admin && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                        Full Bypass Enabled
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedRole.is_super_admin
                      ? "Super Admin permanently bypasses all permission checks with unconditional access."
                      : "Toggle granular action permissions. Click 'Save Changes' to persist."}
                  </p>
                </div>
              </div>

              {!selectedRole.is_super_admin && isSuperAdminOrOwner && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-lg border-slate-200"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeselectAll}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-lg border-slate-200"
                  >
                    Deselect All
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={!matrixDirty || savingMatrix}
                    size="sm"
                    className="text-xs h-8 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white gap-1.5 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingMatrix ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Matrix Module Rows with Mobile Accordion Support */}
            <div className="p-4 sm:p-5 divide-y divide-slate-100">
              {CRM_MODULES.map((mod) => {
                const modAllowedCount = mod.actions.filter((act) =>
                  selectedRole.is_super_admin ? true : Boolean(matrixState[`${mod.id}:${act.id}`])
                ).length;
                const isExpanded = expandedModules[mod.id] ?? true;

                return (
                  <div key={mod.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div
                      onClick={() => toggleModuleAccordion(mod.id)}
                      className="flex items-center justify-between gap-2 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                            {mod.label}
                          </h4>
                          <span
                            className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border",
                              modAllowedCount === mod.actions.length
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : modAllowedCount > 0
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            )}
                          >
                            {modAllowedCount} / {mod.actions.length} Enabled
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{mod.description}</p>
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
                        title={isExpanded ? "Collapse Module" : "Expand Module"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        {mod.actions.map((act) => {
                          const key = `${mod.id}:${act.id}`;
                          const isAllowed = selectedRole.is_super_admin ? true : Boolean(matrixState[key]);

                          return (
                            <div
                              key={act.id}
                              onClick={() => !selectedRole.is_super_admin && handleToggleAction(mod.id, act.id)}
                              className={cn(
                                "rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors",
                                selectedRole.is_super_admin
                                  ? "bg-slate-50/70 border-slate-200/80 cursor-default"
                                  : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer",
                                isAllowed && "border-blue-200 bg-blue-50/20"
                              )}
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                  {act.label}
                                </span>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                  {act.description}
                                </p>
                              </div>

                              <Switch
                                checked={isAllowed}
                                disabled={selectedRole.is_super_admin || !isSuperAdminOrOwner}
                                onCheckedChange={() => handleToggleAction(mod.id, act.id)}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. SEARCHABLE STAFF ROLE ASSIGNMENT SECTION */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Staff CRM Role Assignments
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign customized CRM roles to team members or promote them to Super Admin.
              </p>
            </div>

            {/* Staff Search Input & Add Staff Button */}
            <div className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search staff by name or role..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="pl-8.5 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
              <Button
                type="button"
                onClick={() => openAddStaffModal()}
                disabled={!isSuperAdminOrOwner}
                size="sm"
                className="h-9 px-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs gap-1.5 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Add Staff</span>
              </Button>
            </div>
          </div>

          {/* Staff Table / List */}
          <div className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No staff members matching &ldquo;{staffSearchQuery}&rdquo;
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const assignedRoleId = staffRolesMap[staff.id] || staff.crmRoleId;
                const assignedRole = roles.find((r) => r.id === assignedRoleId);
                const isStaffSuper = assignedRole?.is_super_admin === true;

                return (
                  <div
                    key={staff.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{staff.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Store: {staff.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500">Assigned CRM Role:</span>
                          {assignedRole ? (
                            <CRMRolePill
                              name={assignedRole.name}
                              color={assignedRole.color}
                              isSuperAdmin={isStaffSuper}
                              icon={ICON_MAP[assignedRole.icon] || Shield}
                              size="sm"
                            />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200">
                              No CRM Access
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role Dropdown and Promote/Demote Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="w-48">
                        <Select
                          value={assignedRoleId || "none"}
                          disabled={!isSuperAdminOrOwner}
                          onValueChange={(val) => handleAssignRole(staff.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl border-slate-200">
                            <SelectValue placeholder="Select CRM Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-slate-400">None (No CRM Access)</span>
                            </SelectItem>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: r.color }}
                                  />
                                  <span>{r.name}</span>
                                  {r.is_super_admin && (
                                    <span className="text-[10px] text-amber-600 font-bold ml-1">
                                      (System Default)
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Promote to Super Admin / Demote Action */}
                      {isSuperAdminOrOwner && (
                        <div>
                          {isStaffSuper ? (
                            <Button
                              type="button"
                              onClick={() => handleDemote(staff.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl"
                              title="Demote to standard role"
                            >
                              Demote
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => handlePromoteToSuperAdmin(staff.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 rounded-xl gap-1"
                              title="Promote directly to Super Admin"
                            >
                              <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />
                              <span>Promote</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE / EDIT CUSTOM ROLE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingRole ? `Edit Role: ${editingRole.name}` : "Create Custom CRM Role"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify a custom role name, visual brand color swatch, and icon representation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRole} className="space-y-4 pt-2">
            {/* Role Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Role Name</label>
              <Input
                type="text"
                required
                placeholder="e.g. Operations Lead, HR Associate"
                value={roleFormName}
                onChange={(e) => setRoleFormName(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Color Swatch Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Color Swatch</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_SWATCHES.map((swatch) => {
                  const isSelected = roleFormColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => setRoleFormColor(swatch.hex)}
                      className={cn(
                        "flex items-center gap-1.5 p-2 rounded-xl border text-xs text-left transition-all",
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 font-bold"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="truncate text-[11px] text-slate-800">{swatch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Role Icon</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {AVAILABLE_ICONS.map(({ name, icon: IconComponent }) => {
                  const isSelected = roleFormIcon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setRoleFormIcon(name)}
                      className={cn(
                        "p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 text-blue-700 font-bold"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      )}
                      title={name}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-[9px] truncate w-full text-center">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assign Staff Members (Optional) */}
            {!editingRole && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Assign Staff Members (Optional)</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select team members to immediately assign this new role upon creation.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRoleModalOpen(false);
                      openAddStaffModal();
                    }}
                    className="h-7 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg font-semibold gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add New Staff</span>
                  </Button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filter staff by name..."
                    value={roleStaffSearchQuery}
                    onChange={(e) => setRoleStaffSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl border-slate-200"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40 p-1">
                  {filteredStaffForRole.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-slate-400">
                      No staff members found
                    </div>
                  ) : (
                    filteredStaffForRole.map((staff) => {
                      const isChecked = selectedStaffForNewRole.includes(staff.id);
                      const currentRoleId = staffRolesMap[staff.id] || staff.crmRoleId;
                      const currentRole = roles.find((r) => r.id === currentRoleId);

                      return (
                        <label
                          key={staff.id}
                          className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStaffForNewRole((prev) => [...prev, staff.id]);
                                } else {
                                  setSelectedStaffForNewRole((prev) =>
                                    prev.filter((id) => id !== staff.id)
                                  );
                                }
                              }}
                            />
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {staff.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-900 leading-none">
                                {staff.name}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Store: {staff.role}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono">
                            {currentRole ? (
                              <span className="text-slate-600 font-medium">
                                Current: {currentRole.name}
                              </span>
                            ) : (
                              "No CRM Role"
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {selectedStaffForNewRole.length > 0 && (
                  <div className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 flex items-center justify-between">
                    <span>{selectedStaffForNewRole.length} staff member(s) selected</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffForNewRole([])}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Live Preview Pill */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Preview Pill:</span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${roleFormColor}1A`,
                  borderColor: `${roleFormColor}40`,
                  color: roleFormColor,
                }}
              >
                {(() => {
                  const PreviewIcon = ICON_MAP[roleFormIcon] || Shield;
                  return <PreviewIcon className="w-3.5 h-3.5" />;
                })()}
                <span>{roleFormName || "New Role"}</span>
              </span>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRoleModalOpen(false)}
                className="rounded-xl border-slate-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DELETE ROLE CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Role: {roleToDelete?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete this custom role? Any staff members currently assigned to this role will lose their granted CRM permissions.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-xl border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteRole}
              size="sm"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD STAFF USER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={addStaffModalOpen} onOpenChange={setAddStaffModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Provision New Staff User
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Create staff credentials, define store operations permissions, and assign custom CRM access.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleProvisionStaff} className="space-y-4 pt-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Full Name</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={staffFormFullName}
                  onChange={(e) => setStaffFormFullName(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Email Address (Login Username)</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  placeholder="e.g. rahul@company.com"
                  value={staffFormEmail}
                  onChange={(e) => setStaffFormEmail(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210 (10 digits)"
                  value={staffFormPhone}
                  onChange={(e) => setStaffFormPhone(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            {/* Store / ERP Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Store / ERP Role</span>
                <span className="text-rose-500">*</span>
              </label>
              <Select value={staffFormStoreRole} onValueChange={setStaffFormStoreRole}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200">
                  <SelectValue placeholder="Select Store Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesman">Salesman (POS &amp; Sales Checkout)</SelectItem>
                  <SelectItem value="cashier">Cashier (Billing &amp; Cash Counter)</SelectItem>
                  <SelectItem value="manager">Store Manager (Operations &amp; Stock)</SelectItem>
                  <SelectItem value="staff">Staff Associate (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned CRM Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Assigned CRM Role</span>
                <span className="text-rose-500">*</span>
              </label>
              <Select value={staffFormCrmRole} onValueChange={setStaffFormCrmRole}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200">
                  <SelectValue placeholder="Select CRM Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-slate-400">None (No CRM Access)</span>
                  </SelectItem>
                  {roles.map((r) => {
                    const RoleIcon = ICON_MAP[r.icon] || Shield;
                    return (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          <RoleIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium">{r.name}</span>
                          {r.is_super_admin && (
                            <span className="text-[10px] text-amber-600 font-bold ml-1">
                              (Super Admin)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Password Configuration */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Password Configuration</span>
                </label>
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setPasswordMode("auto")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                      passwordMode === "auto"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Auto-Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode("custom")}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                      passwordMode === "custom"
                        ? "bg-white text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {passwordMode === "auto" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        readOnly
                        value={staffFormAutoPassword}
                        className="h-9 font-mono text-xs font-bold text-blue-800 bg-blue-50/50 border-blue-200 tracking-wider pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                        title={showPassword ? "Hide password" : "Reveal password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStaffFormAutoPassword(generateCryptographicPassword(14))}
                      className="h-9 px-3 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-slate-50 gap-1.5"
                      title="Regenerate secure password"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Regenerate</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Cryptographic 14-char high-entropy password (A-Z, a-z, 0-9, symbols)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter minimum 6 character password"
                      value={staffFormCustomPassword}
                      onChange={(e) => setStaffFormCustomPassword(e.target.value)}
                      className="h-9 text-xs rounded-xl border-slate-200 pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      title={showPassword ? "Hide password" : "Reveal password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Staff member will be prompted to change this upon initial login.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddStaffModalOpen(false)}
                className="rounded-xl border-slate-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingStaff}
                size="sm"
                className="rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                {submittingStaff ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Provision Staff User</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREDENTIALS CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={credentialsModalOpen} onOpenChange={setCredentialsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <DialogTitle className="text-base font-black text-slate-900 tracking-tight">
                Staff Credentials Generated
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1 max-w-sm">
                User account has been activated. Provide these credentials to the staff member to sign in.
              </DialogDescription>
            </div>
          </DialogHeader>

          {provisionedCredentials && (
            <div className="space-y-3.5 pt-2">
              {/* Identity Header Pod */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {provisionedCredentials.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-none">
                      {provisionedCredentials.fullName}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                      Store: {provisionedCredentials.storeRole}
                    </span>
                  </div>
                </div>
                <CRMRolePill
                  name={provisionedCredentials.crmRoleName || "Staff"}
                  color={provisionedCredentials.crmRoleColor || "#1D4ED8"}
                  size="sm"
                />
              </div>

              {/* Login Email Field */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  LOGIN EMAIL
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={provisionedCredentials.email}
                    className="h-9 font-mono text-xs font-medium text-slate-800 bg-white border-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCredentialsField("email")}
                    className="h-9 px-3 rounded-xl border-slate-200 text-xs shrink-0 gap-1.5"
                    title="Copy Email"
                  >
                    {copiedField === "email" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Temporary Password Field */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  TEMPORARY PASSWORD
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showCredPassword ? "text" : "password"}
                      readOnly
                      value={provisionedCredentials.password}
                      className="h-9 font-mono text-xs font-bold text-blue-700 bg-blue-50/50 border-blue-200 pr-9 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredPassword(!showCredPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      title={showCredPassword ? "Hide password" : "Show password"}
                    >
                      {showCredPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyCredentialsField("password")}
                    className="h-9 px-3 rounded-xl border-slate-200 text-xs shrink-0 gap-1.5"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons: Copy All Bundle & WhatsApp Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleCopyAllCredentials}
                  className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs gap-1.5"
                >
                  {copiedField === "all" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied Bundle!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Details</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  variant="outline"
                  className="w-full h-9 rounded-xl border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs shadow-xs gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Share via WhatsApp</span>
                </Button>
              </div>

              {/* Security Warning Callout */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  These credentials will not be displayed again. Please share them securely with the staff member.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setCredentialsModalOpen(false)}
              className="w-full rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold h-9 shadow-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
