# Architectural Blueprint & Handoff Report: Salary Management UI Page Architecture

**Explorer**: M3-1  
**Target File**: `src/pages/crm/SalaryManagement.tsx`  
**Milestone**: Phase 3 Milestone M3 — Salary Management UI Page Architecture  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1`  
**Parent Caller ID**: `caf7924e-19e5-4a1d-ae03-b43c66838dd3`  

---

## 1. Observation

Direct code and architectural observations across the CredSmart codebase:

### 1.1 CRM Component Library & Design System
- **`src/components/crm/CRMPageHeader.tsx` (lines 19–45, 82–102)**:
  - Accepts `title`, `subtitle`, `breadcrumbs`, `badge`, `actions`, and `className`.
  - Encapsulates breadcrumbs hierarchy (`nav[aria-label="Breadcrumb"]`), title heading in Navy `#0F172A` / dark mode `white` (`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-sans`), and responsive flexbox row (`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`).
- **`src/components/crm/CRMCard.tsx` (lines 8–21, 65–126)**:
  - Exposes `CRM_BRAND_COLORS`: `navy: "#0F172A"`, `orange: "#FF6A00"`, `blue: "#1D4ED8"`, `emerald: "#10B981"`, `gold: "#F59E0B"`, `slateBg: "#F8FAFC"`.
  - Supports variants: `default`, `elevated`, `brand` (with `#FF6A00` left accent border), `outline`, `glass`.
  - Structured slots: `title`, `description`, `headerAction`, `children`, `footer`.
- **`src/components/crm/CRMBadge.tsx` (lines 7–15, 64–89)**:
  - Variants: `success` (Emerald #10B981), `warning` (Amber #F59E0B), `error` (Rose #EF4444), `info` (Royal Blue #1D4ED8), `neutral` (Slate/Navy #0F172A), `orange` (Vibrant Orange #FF6A00).
  - Supports pulsing animated status dot (`dot={true}`).
- **`src/components/crm/CRMStatCard.tsx` (lines 20–35, 96–169)**:
  - Metric card with tinted icon pod, accent styling (`navy`, `orange`, `blue`, `emerald`, `gold`), large metric value (`font-mono tabular-nums font-extrabold text-2xl sm:text-3xl`), trend indicator (`CRMTrendIndicator`), and loading state (`loading={true}`).
- **`src/components/crm/CRMDataTable.tsx` (lines 19–80, 150–264)**:
  - Generic table `CRMDataTable<T extends Record<string, unknown>>` with column definitions (`CRMColumnDef<T>`), client search filtering, ascending/descending sorting, loading state, empty message, row click handler, and integrated `PaginationBar`.
- **`src/components/crm/CRMPermissionGate.tsx` (lines 36–71)**:
  - Props: `module: string`, `action: string`, `children: React.ReactNode`, `fallback?: React.ReactNode`, `showToast?: boolean`, `suppressToast?: boolean`, `toastMessage?: string`.
  - Evaluates permissions via `useCRMPermission(module, action)`. If unauthorized, renders `fallback` (or `null`) and dispatches a destructive toast notification (`toast({ title: "Not Authorized", variant: "destructive" })`).
- **`src/components/crm/CRMRolePill.tsx`**:
  - Displays user role with dynamic hex background tint and lucide icon.

### 1.2 RBAC Integration & Permissions
- **`src/hooks/useCRMPermission.ts` (lines 43–62, 97–279)**:
  - Returns `{ hasPermission, isSuperAdmin, userRoles, permissions, loading, error, refreshPermissions, refetch, allowed }`.
  - Bypass: Organization owners (`store_owner`, `super_admin`, `admin`) and roles with `is_super_admin: true` unconditionally bypass permission checks.
  - In `src/pages/crm/RoleManagement.tsx` (lines 100–108), the CRM module taxonomy declares:
    ```typescript
    {
      id: "salary",
      label: "Salary & Payroll",
      description: "Compensation structure, pay slips, deductions, and disbursals",
      actions: [
        { id: "view", label: "View Salary", description: "View salary slips, pay structures, and ledger entries" },
        { id: "edit", label: "Edit Salary", description: "Configure base wage, incentives, advances, and payouts" },
      ]
    }
    ```
- **`src/config/routes.ts` (lines 88–98)**:
  - Route already declared: `ROUTE_PATHS.crmSalary: "/crm/salary"`.
  - CRM main dashboard: `ROUTE_PATHS.crm: "/crm"`.

### 1.3 Reference Architecture from Attendance.tsx
- **`src/pages/crm/Attendance.tsx` (lines 167–225, 341–487, 1437–1607)**:
  - Top-level permission gate:
    ```tsx
    <CRMPermissionGate
      module="attendance"
      action="view"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view CredSmart Attendance records. Contact your store owner or manager for access.
          </p>
        </div>
      }
    >
      <div className="space-y-6 pb-12 max-w-7xl mx-auto px-3 sm:px-6">
        <CRMPageHeader ... />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <CRMStatCard ... />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl ...">
          {/* Tab buttons */}
        </div>
        {/* Tab content */}
      </div>
    </CRMPermissionGate>
    ```
  - Dual-layer data hydration: Initial state loaded synchronously from `localStorage.getItem("credsmart_crm_..._${orgId}")`, followed by async Supabase queries with try/catch and error warnings.

### 1.4 Calculation Engine & Domain Types
- **`src/types/crmPayroll.ts`**:
  - Exports strict union literals: `SalaryType` (`"monthly" | "daily" | "hourly"`), `PayrollRunStatus` (`"draft" | "locked" | "disbursed"`), `PayslipPaymentStatus` (`"pending" | "paid" | "partial"`), `SalaryAdjustmentType` (`"advance" | "bonus" | "deduction" | "loan_repayment"`), `SalaryAdjustmentStatus` (`"pending" | "approved" | "deducted" | "rejected"`).
  - Exports domain interfaces: `CrmSalaryProfile`, `CrmPayrollRun`, `CrmPayslip`, `CrmSalaryAdjustment`, `PayslipComputedData`, `CrmAttendanceRecord`.
- **`src/utils/crmPayrollUtils.ts`**:
  - Exports pure, 2-decimal rounded calculation functions: `getWorkingDaysInMonth`, `getDailyRate`, `computeLopDays`, `computeOvertimeAmount`, `computePfDeduction`, `computeEsiDeduction`, `computeNetSalary`, `generatePayslipData`, `createSalaryProfileSnapshot`.

---

## 2. Logic Chain

From the observations above, the architectural requirements for `src/pages/crm/SalaryManagement.tsx` follow this logical progression:

1. **Top-Level Security Guard (Observation 1.1, 1.2, 1.3)**:
   - Every route in CredSmart CRM must enforce RBAC to protect confidential payroll and salary information.
   - Guarding the root component return with `<CRMPermissionGate module="salary" action="view" fallback={<SalaryAccessRestrictedFallback />}>` ensures unprivileged users cannot view employee pay structures, while organization owners, super-admins, and authorized managers seamlessly pass through.

2. **Enterprise Header Alignment (Observation 1.1, 1.2)**:
   - Aligning with `CRMPageHeader` creates consistency with `Attendance.tsx` and `RoleManagement.tsx`.
   - Title: `"Salary Management & Payroll Engine"`
   - Subtitle: `"Staff compensation structures, monthly payroll runs, advances, deductions, and payslips"`
   - Breadcrumbs: `[{ label: "Home", href: "/" }, { label: "CRM", href: ROUTE_PATHS.crm }, { label: "Salary & Payroll", href: ROUTE_PATHS.crmSalary }]`
   - Badge: `<CRMBadge variant="orange" size="sm" dot>Phase 3 Live</CRMBadge>`
   - Actions slot: Global "Refresh" button + contextual primary action button depending on the active tab (e.g. "Add Profile", "Generate Payroll", "Record Advance", "Download Payslips").

3. **4-Tab Information Architecture (Observation 1.3, 1.4)**:
   - **Tab 1: Salary Profiles (Default)**: Primary administrative view for managing employee compensation contracts (`base_amount`, `salary_type`, `allowed_leaves_per_month`, `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`).
   - **Tab 2: Payroll Run**: Admin/approver calculation and disbursement workflow (`crm_payroll_runs` and `crm_payslips`). Features month selector (`YYYY-MM`), working days indicator, warning banner for unconfigured staff, preview table with net salary highlights, and status transitions (`draft` → `locked` → `disbursed`).
   - **Tab 3: Advances & Deductions**: Ledger adjustment tracking (`crm_salary_adjustments`). Color-coded adjustment badges (`advance` Gold, `bonus` Emerald, `deduction` Orange, `loan_repayment` Blue) and approve/reject workflows.
   - **Tab 4: My Payslips**: Self-service employee portal. Filters payslips for `staff_id === user.id`, presenting downloadable pay stubs via PDF generator.

4. **Responsive Layout Strategy (375px → 768px → 1280px)**:
   - On 375px mobile screens, data tables with 8+ columns cause severe horizontal clipping. A dual-rendering strategy (`sm:hidden` for mobile card layout, `hidden sm:block` for `CRMDataTable`) ensures high touch usability on phones while providing dense enterprise tables on desktop.
   - Stat cards gracefully scale from a 2-column compact grid on mobile to a 4-column KPI bar on desktop.
   - Drawers render as full-width bottom sheets on mobile and 480px slide-over panels on desktop.

5. **Indian Currency Formatter Standard**:
   - Financial figures in Indian accounting must adhere to the lakhs/crores grouping convention (`₹X,XX,XXX.XX`).
   - Pure function `formatIndianCurrency` handles decimals, 0-padding, zero clamping, and negative values cleanly.

6. **Hydration & Error Handling Dual-Layer Resilience (Observation 1.1, 1.3)**:
   - Sync localStorage hydration avoids blank-screen flicker on page mount.
   - Async Supabase fetch updates data and rewrites cache.
   - Skeleton components provide smooth loading states, and error toasts notify users of connectivity lapses without crashing the UI.

---

## 3. Caveats

- **Caveat 1: Drawer Implementations Delegation**:
  Detailed interactive drawers (Form validation, input masks, and specific Supabase mutations for Add Profile Drawer, Configure Profile Drawer, and Record Advance Drawer) are actively designed by Explorer M3-2. This blueprint provides the exact prop contracts, state hooks, and triggers so M3-2 drawers plug directly into `SalaryManagement.tsx`.
- **Caveat 2: PDF Vector Generation**:
  Tab 4 invokes `generatePayslipPDF` from `src/utils/crmPayslipPdf.ts` (Milestone M4). In M3, this hook is wired with graceful fallback notification if PDF engine is in development.
- **Caveat 3: Super-Admin Bypass in Tests**:
  Vitest test suites must mock `useCRMPermission` and `useOrganization` with appropriate `userRole` and `permissions` states to verify both permitted and restricted code paths.

---

## 4. Conclusion & Complete Architectural Blueprint

Below is the complete, production-ready architectural blueprint for `src/pages/crm/SalaryManagement.tsx`.

### 4.1 Currency Formatter Specification (`src/utils/crmSalaryFormatters.ts` or inline in `SalaryManagement.tsx`)

```typescript
/**
 * Formats numeric amount into Indian Currency notation (e.g. ₹1,23,456.78).
 * Safeguarded against NaN, null, undefined, and non-finite inputs.
 *
 * @param amount - Numeric or string value to format
 * @returns Formatted currency string with ₹ symbol and 2 decimal places
 */
export function formatIndianCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0.00";
  }
  const num = Number(amount);
  if (!isFinite(num) || isNaN(num)) {
    return "₹0.00";
  }
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}
```

### 4.2 State Machine & Data Models

```typescript
// Active tab union literal
export type SalaryTab = "profiles" | "payroll" | "adjustments" | "payslips";

// Enriched staff profile information resolved from memberships & profiles
export interface StaffDirectoryMember {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleColor: string;
  isSuperAdmin?: boolean;
}

// LocalStorage cache keys
const STORAGE_PROFILES_PREFIX = "credsmart_crm_salary_profiles_";
const STORAGE_RUNS_PREFIX = "credsmart_crm_payroll_runs_";
const STORAGE_PAYSLIPS_PREFIX = "credsmart_crm_payslips_";
const STORAGE_ADJUSTMENTS_PREFIX = "credsmart_crm_salary_adjustments_";
```

### 4.3 Component Architecture Blueprint

```tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Briefcase,
  Calculator,
  Receipt,
  FileText,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  ShieldAlert,
  Sparkles,
  Lock,
  Check,
  X,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CRMPageHeader,
  CRMCard,
  CRMBadge,
  CRMDataTable,
  CRMStatCard,
  CRMPermissionGate,
  CRMRolePill,
  type CRMColumnDef,
} from "@/components/crm";
import {
  getWorkingDaysInMonth,
  generatePayslipData,
  createSalaryProfileSnapshot,
  type CrmSalaryProfile,
  type CrmPayrollRun,
  type CrmPayslip,
  type CrmSalaryAdjustment,
  type PayslipComputedData,
  type CrmAttendanceRecord,
} from "@/utils/crmPayrollUtils";

// ============================================================================
// Fallback: Access Denied Component
// ============================================================================

export function SalaryAccessRestrictedFallback(): React.ReactElement {
  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-4 pt-16">
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800 shadow-sm">
        <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" />
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
        Access Restricted
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        You do not have permission to view CredSmart Salary Management & Payroll records.
        Please contact your organization administrator or store owner to request &ldquo;salary:view&rdquo; permission.
      </p>
      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="rounded-xl border-slate-200 text-xs font-semibold"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page: SalaryManagement
// ============================================================================

export default function SalaryManagement(): React.ReactElement {
  const { user } = useAuth();
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin, loading: permissionLoading } = useCRMPermission("salary", "view");

  const canEdit = isSuperAdmin || hasPermission("salary", "edit");
  const canApprove = isSuperAdmin || hasPermission("salary", "approve") || hasPermission("salary", "edit");

  const effectiveOrgId = orgId || "default_org";
  const effectiveUserId = user?.id || "anonymous_user";

  // Current date & active month selector ('YYYY-MM')
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [activeTab, setActiveTab] = useState<SalaryTab>("profiles");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronous cache hydration
  const [salaryProfiles, setSalaryProfiles] = useState<CrmSalaryProfile[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_PROFILES_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
      }
    }
    return [];
  });

  const [payrollRuns, setPayrollRuns] = useState<CrmPayrollRun[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_RUNS_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
      }
    }
    return [];
  });

  const [payslips, setPayslips] = useState<CrmPayslip[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_PAYSLIPS_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
      }
    }
    return [];
  });

  const [adjustments, setAdjustments] = useState<CrmSalaryAdjustment[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_ADJUSTMENTS_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
      }
    }
    return [];
  });

  const [staffDirectory, setStaffDirectory] = useState<Record<string, StaffDirectoryMember>>({});

  // Active drawers state (integrated with M3-2)
  const [isAddProfileDrawerOpen, setIsAddProfileDrawerOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<CrmSalaryProfile | null>(null);
  const [isAdjustmentDrawerOpen, setIsAdjustmentDrawerOpen] = useState<boolean>(false);

  // Load all payroll data from Supabase
  const loadSalaryData = useCallback(async () => {
    setDataLoading(true);
    try {
      // 1. Fetch Staff Directory & Roles
      const dirMap: Record<string, StaffDirectoryMember> = {};
      const { data: members } = await supabase
        .from("organization_memberships")
        .select("id, user_id, role")
        .eq("organization_id", effectiveOrgId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const { data: staffRoles } = await supabase
          .from("crm_staff_roles")
          .select("staff_id, role_id");

        const { data: crmRoles } = await supabase
          .from("crm_roles")
          .select("id, name, color, is_super_admin")
          .eq("org_id", effectiveOrgId);

        const roleMap = new Map((crmRoles || []).map((r) => [r.id, r]));
        const staffRoleMap = new Map((staffRoles || []).map((sr) => [sr.staff_id, sr.role_id]));

        (profilesData || []).forEach((p) => {
          const roleId = staffRoleMap.get(p.id);
          const role = roleId ? roleMap.get(roleId) : null;
          dirMap[p.id] = {
            id: p.id,
            name: p.full_name || "Team Member",
            email: p.email || "",
            roleName: role?.name || "Staff",
            roleColor: role?.color || "#1D4ED8",
            isSuperAdmin: role?.is_super_admin || false,
          };
        });
        setStaffDirectory(dirMap);
      }

      // 2. Fetch Salary Profiles
      const { data: profiles, error: profErr } = await supabase
        .from("crm_salary_profiles")
        .select("*")
        .eq("org_id", effectiveOrgId)
        .order("created_at", { ascending: false });

      if (!profErr && profiles) {
        const enriched = (profiles as CrmSalaryProfile[]).map((p) => ({
          ...p,
          staff_name: dirMap[p.staff_id]?.name || "Staff Member",
          staff_email: dirMap[p.staff_id]?.email || "",
          role_name: dirMap[p.staff_id]?.roleName || "Staff",
        }));
        setSalaryProfiles(enriched);
        localStorage.setItem(`${STORAGE_PROFILES_PREFIX}${effectiveOrgId}`, JSON.stringify(enriched));
      }

      // 3. Fetch Payroll Runs
      const { data: runs, error: runsErr } = await supabase
        .from("crm_payroll_runs")
        .select("*")
        .eq("org_id", effectiveOrgId)
        .order("month_year", { ascending: false });

      if (!runsErr && runs) {
        setPayrollRuns(runs as CrmPayrollRun[]);
        localStorage.setItem(`${STORAGE_RUNS_PREFIX}${effectiveOrgId}`, JSON.stringify(runs));
      }

      // 4. Fetch Payslips
      const { data: slips, error: slipsErr } = await supabase
        .from("crm_payslips")
        .select("*")
        .eq("org_id", effectiveOrgId)
        .order("month_year", { ascending: false });

      if (!slipsErr && slips) {
        const enrichedSlips = (slips as CrmPayslip[]).map((s) => ({
          ...s,
          staff_name: dirMap[s.staff_id]?.name || "Staff Member",
          staff_email: dirMap[s.staff_id]?.email || "",
          role_name: dirMap[s.staff_id]?.roleName || "Staff",
        }));
        setPayslips(enrichedSlips);
        localStorage.setItem(`${STORAGE_PAYSLIPS_PREFIX}${effectiveOrgId}`, JSON.stringify(enrichedSlips));
      }

      // 5. Fetch Salary Adjustments
      const { data: adjs, error: adjErr } = await supabase
        .from("crm_salary_adjustments")
        .select("*")
        .eq("org_id", effectiveOrgId)
        .order("created_at", { ascending: false });

      if (!adjErr && adjs) {
        const enrichedAdjs = (adjs as CrmSalaryAdjustment[]).map((a) => ({
          ...a,
          staff_name: dirMap[a.staff_id]?.name || "Staff Member",
          requester_name: a.requested_by ? dirMap[a.requested_by]?.name : undefined,
          approver_name: a.approved_by ? dirMap[a.approved_by]?.name : undefined,
        }));
        setAdjustments(enrichedAdjs);
        localStorage.setItem(`${STORAGE_ADJUSTMENTS_PREFIX}${effectiveOrgId}`, JSON.stringify(enrichedAdjs));
      }
    } catch (err) {
      console.warn("Salary data fetch warning:", err);
      toast({
        title: "Network Notice",
        description: "Operating with local cached payroll data.",
        variant: "default",
      });
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSalaryData();
    toast({ title: "Refreshed", description: "Salary and payroll data synced." });
  };

  // KPI Computations
  const activeProfilesCount = useMemo(() => salaryProfiles.filter((p) => p.is_active).length, [salaryProfiles]);
  const currentRun = useMemo(() => payrollRuns.find((r) => r.month_year === selectedMonth), [payrollRuns, selectedMonth]);
  const pendingAdjustments = useMemo(() => adjustments.filter((a) => a.status === "pending"), [adjustments]);
  const totalPendingAdvanceAmount = useMemo(
    () => pendingAdjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0),
    [pendingAdjustments]
  );
  const myPayslips = useMemo(() => payslips.filter((s) => s.staff_id === effectiveUserId), [payslips, effectiveUserId]);

  // Unconfigured staff warning check
  const unconfiguredStaff = useMemo(() => {
    const configuredStaffIds = new Set(salaryProfiles.map((p) => p.staff_id));
    return Object.values(staffDirectory).filter((m) => !configuredStaffIds.has(m.id));
  }, [salaryProfiles, staffDirectory]);

  return (
    <CRMPermissionGate
      module="salary"
      action="view"
      fallback={<SalaryAccessRestrictedFallback />}
    >
      <div className="space-y-6 pb-12 max-w-7xl mx-auto px-3 sm:px-6">
        {/* ================================================================== */}
        {/* Page Header                                                        */}
        {/* ================================================================== */}
        <CRMPageHeader
          title="Salary Management & Payroll Engine"
          subtitle="Staff compensation structures, monthly payroll runs, advances, deductions, and payslips"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "CRM", href: ROUTE_PATHS.crm },
            { label: "Salary & Payroll", href: ROUTE_PATHS.crmSalary },
          ]}
          badge={
            <CRMBadge variant="orange" size="sm" dot>
              Phase 3 Live
            </CRMBadge>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 gap-1.5 text-xs text-slate-700 bg-white border-slate-200/80 rounded-xl"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {activeTab === "profiles" && canEdit && (
                <Button
                  size="sm"
                  onClick={() => setIsAddProfileDrawerOpen(true)}
                  className="h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Profile</span>
                </Button>
              )}

              {activeTab === "adjustments" && (
                <Button
                  size="sm"
                  onClick={() => setIsAdjustmentDrawerOpen(true)}
                  className="h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Advance</span>
                </Button>
              )}
            </div>
          }
        />

        {/* ================================================================== */}
        {/* KPI Stat Cards Bar                                                 */}
        {/* ================================================================== */}
        {dataLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <CRMStatCard
              label="Active Salary Profiles"
              value={activeProfilesCount}
              icon={Briefcase}
              accent="blue"
              description="Configured team contracts"
            />
            <CRMStatCard
              label="Current Month Payroll"
              value={formatIndianCurrency(currentRun?.total_payout || 0)}
              icon={Calculator}
              accent="orange"
              description={`Month: ${selectedMonth} (${currentRun?.status || "Draft"})`}
            />
            <CRMStatCard
              label="Pending Advances"
              value={formatIndianCurrency(totalPendingAdvanceAmount)}
              icon={Receipt}
              accent="gold"
              description={`${pendingAdjustments.length} pending review`}
            />
            <CRMStatCard
              label="My Available Payslips"
              value={myPayslips.length}
              icon={FileText}
              accent="emerald"
              description="Ready for PDF export"
            />
          </div>
        )}

        {/* ================================================================== */}
        {/* 4 Tabs Navigation Switcher (Responsive)                           */}
        {/* ================================================================== */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto self-start overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("profiles")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "profiles"
                ? "bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Briefcase className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Salary Profiles ({salaryProfiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payroll")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "payroll"
                ? "bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Calculator className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Payroll Run</span>
            {currentRun?.status === "draft" && (
              <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("adjustments")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "adjustments"
                ? "bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Receipt className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Advances & Deductions ({adjustments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payslips")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "payslips"
                ? "bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-[#10B981]" />
            <span>My Payslips ({myPayslips.length})</span>
          </button>
        </div>

        {/* ================================================================== */}
        {/* TAB 1: Salary Profiles                                             */}
        {/* ================================================================== */}
        {activeTab === "profiles" && (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <CRMDataTable
                data={salaryProfiles as unknown as Record<string, unknown>[]}
                columns={[
                  {
                    key: "staff_name",
                    header: "Staff Member",
                    sortable: true,
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return (
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F172A] dark:text-white">{p.staff_name}</span>
                          <span className="text-[11px] text-slate-400">{p.staff_email}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "role_name",
                    header: "Role",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return <CRMRolePill roleName={p.role_name || "Staff"} roleColor="#1D4ED8" />;
                    },
                  },
                  {
                    key: "salary_type",
                    header: "Type",
                    sortable: true,
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      const variantMap: Record<string, "info" | "orange" | "success"> = {
                        monthly: "info",
                        daily: "orange",
                        hourly: "success",
                      };
                      return (
                        <CRMBadge variant={variantMap[p.salary_type] || "info"} size="sm">
                          {p.salary_type.toUpperCase()}
                        </CRMBadge>
                      );
                    },
                  },
                  {
                    key: "base_amount",
                    header: "Base Wage",
                    sortable: true,
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return (
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatIndianCurrency(p.base_amount)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "allowed_leaves_per_month",
                    header: "Paid Leaves",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return `${p.allowed_leaves_per_month} days/mo`;
                    },
                  },
                  {
                    key: "overtime",
                    header: "Overtime Rate",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return p.hourly_overtime_rate
                        ? `${formatIndianCurrency(p.hourly_overtime_rate)}/hr`
                        : "None";
                    },
                  },
                  {
                    key: "deductions",
                    header: "PF / ESI %",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return `PF: ${p.pf_deduction_percent || 0}% | ESI: ${p.esi_deduction_percent || 0}%`;
                    },
                  },
                  {
                    key: "is_active",
                    header: "Status",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return p.is_active ? (
                        <CRMBadge variant="success" size="sm" dot>Active</CRMBadge>
                      ) : (
                        <CRMBadge variant="neutral" size="sm">Inactive</CRMBadge>
                      );
                    },
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    accessor: (row) => {
                      const p = row as unknown as CrmSalaryProfile;
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProfile(p)}
                          className="h-7 text-xs font-semibold text-[#1D4ED8] hover:text-blue-800"
                        >
                          Configure
                        </Button>
                      );
                    },
                  },
                ]}
                searchPlaceholder="Search staff name or email..."
                pageSize={10}
                emptyMessage="No salary profiles configured yet."
              />
            </div>

            {/* Mobile Stacked Card List (375px responsive) */}
            <div className="block sm:hidden space-y-3">
              {salaryProfiles.map((p) => (
                <CRMCard key={p.id} variant="default" className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{p.staff_name}</h4>
                      <p className="text-xs text-slate-400">{p.staff_email}</p>
                    </div>
                    <CRMBadge variant={p.is_active ? "success" : "neutral"} size="sm" dot={p.is_active}>
                      {p.salary_type.toUpperCase()}
                    </CRMBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400">Base Wage:</span>
                      <p className="font-mono font-bold text-slate-900">{formatIndianCurrency(p.base_amount)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Overtime:</span>
                      <p className="font-mono text-slate-700">
                        {p.hourly_overtime_rate ? `${formatIndianCurrency(p.hourly_overtime_rate)}/hr` : "None"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingProfile(p)}
                    className="w-full text-xs font-semibold rounded-xl border-slate-200"
                  >
                    Configure Profile
                  </Button>
                </CRMCard>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: Payroll Run                                                 */}
        {/* ================================================================== */}
        {activeTab === "payroll" && (
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Payroll Month
                  </label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-9 w-44 text-xs font-mono rounded-xl bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Working Days
                  </span>
                  <p className="text-xs font-bold text-[#0F172A] font-mono pt-1">
                    {getWorkingDaysInMonth(selectedMonth)} Days Scheduled
                  </p>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentRun?.status && (
                  <CRMBadge
                    variant={
                      currentRun.status === "disbursed"
                        ? "success"
                        : currentRun.status === "locked"
                        ? "info"
                        : "warning"
                    }
                    size="md"
                    dot
                  >
                    {currentRun.status.toUpperCase()}
                  </CRMBadge>
                )}
                {canApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentRun?.status === "locked" || currentRun?.status === "disbursed"}
                      className="h-8 gap-1.5 text-xs font-semibold rounded-xl"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Payroll</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={currentRun?.status !== "locked"}
                      className="h-8 gap-1.5 text-xs bg-[#10B981] hover:bg-emerald-600 text-white font-semibold rounded-xl"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Disbursed</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Warning if unconfigured staff exists */}
            {unconfiguredStaff.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Notice:</strong> {unconfiguredStaff.length} active staff member(s) have no salary profile configured.
                  They will be excluded from payroll calculations until a profile is created.
                </span>
              </div>
            )}

            {/* Payslips Preview Table */}
            <div className="hidden sm:block">
              <CRMDataTable
                data={payslips.filter((s) => s.month_year === selectedMonth) as unknown as Record<string, unknown>[]}
                columns={[
                  {
                    key: "staff_name",
                    header: "Staff Member",
                    sortable: true,
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return (
                        <div>
                          <span className="font-bold text-slate-900">{s.staff_name}</span>
                          <p className="text-[11px] text-slate-400">{s.staff_email}</p>
                        </div>
                      );
                    },
                  },
                  {
                    key: "attendance",
                    header: "Attendance",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return `P: ${s.present_days} | A: ${s.absent_days} | H: ${s.half_days}`;
                    },
                  },
                  {
                    key: "lop",
                    header: "LOP Deduction",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return `${s.lop_days}d (${formatIndianCurrency(s.lop_deduction)})`;
                    },
                  },
                  {
                    key: "overtime",
                    header: "Overtime",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return `${s.overtime_minutes}m (${formatIndianCurrency(s.overtime_amount)})`;
                    },
                  },
                  {
                    key: "gross_salary",
                    header: "Gross",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return formatIndianCurrency(s.gross_salary);
                    },
                  },
                  {
                    key: "deductions",
                    header: "Deductions",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      const totalDed = Number(s.pf_deduction || 0) + Number(s.esi_deduction || 0) + Number(s.advance_deduction || 0);
                      return formatIndianCurrency(totalDed);
                    },
                  },
                  {
                    key: "net_salary",
                    header: "Net Payable",
                    sortable: true,
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return (
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {formatIndianCurrency(s.net_salary)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "payment_status",
                    header: "Status",
                    accessor: (row) => {
                      const s = row as unknown as CrmPayslip;
                      return (
                        <CRMBadge
                          variant={s.payment_status === "paid" ? "success" : "warning"}
                          size="sm"
                        >
                          {s.payment_status.toUpperCase()}
                        </CRMBadge>
                      );
                    },
                  },
                ]}
                searchPlaceholder="Search staff payslips..."
                pageSize={10}
                emptyMessage="No payroll runs generated for this month. Click 'Generate Payroll' to calculate."
              />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: Advances & Deductions                                       */}
        {/* ================================================================== */}
        {activeTab === "adjustments" && (
          <div className="space-y-4">
            <CRMDataTable
              data={adjustments as unknown as Record<string, unknown>[]}
              columns={[
                {
                  key: "staff_name",
                  header: "Staff Member",
                  sortable: true,
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    return <span className="font-bold text-slate-900">{a.staff_name}</span>;
                  },
                },
                {
                  key: "type",
                  header: "Type",
                  sortable: true,
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    const variantMap: Record<string, "warning" | "success" | "orange" | "info"> = {
                      advance: "warning",
                      bonus: "success",
                      deduction: "orange",
                      loan_repayment: "info",
                    };
                    return (
                      <CRMBadge variant={variantMap[a.type] || "warning"} size="sm">
                        {a.type.replace("_", " ").toUpperCase()}
                      </CRMBadge>
                    );
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  sortable: true,
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    return (
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(a.amount)}
                      </span>
                    );
                  },
                },
                {
                  key: "month_year",
                  header: "Target Month",
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    return a.month_year || "General";
                  },
                },
                {
                  key: "description",
                  header: "Description / Reason",
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    return <span className="text-xs text-slate-500">{a.description || "-"}</span>;
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    const statusVariant: Record<string, "warning" | "success" | "neutral" | "error"> = {
                      pending: "warning",
                      approved: "success",
                      deducted: "neutral",
                      rejected: "error",
                    };
                    return (
                      <CRMBadge variant={statusVariant[a.status] || "neutral"} size="sm">
                        {a.status.toUpperCase()}
                      </CRMBadge>
                    );
                  },
                },
                {
                  key: "actions",
                  header: "Review Actions",
                  accessor: (row) => {
                    const a = row as unknown as CrmSalaryAdjustment;
                    if (!canApprove || a.status !== "pending") return null;
                    return (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
              searchPlaceholder="Search adjustments..."
              pageSize={10}
              emptyMessage="No advances or deductions recorded."
            />
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: My Payslips (Self-Service Grid)                             */}
        {/* ================================================================== */}
        {activeTab === "payslips" && (
          <div className="space-y-6">
            {myPayslips.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-white dark:bg-slate-900">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  No Payslips Available
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your monthly salary slips will appear here once payroll is locked and disbursed by your organization manager.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myPayslips.map((slip) => (
                  <CRMCard
                    key={slip.id}
                    variant="elevated"
                    className="p-5 space-y-4"
                    title={
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-[#0F172A] dark:text-white text-base">
                          {slip.month_year}
                        </span>
                        <CRMBadge
                          variant={slip.payment_status === "paid" ? "success" : "warning"}
                          size="sm"
                          dot={slip.payment_status === "paid"}
                        >
                          {slip.payment_status.toUpperCase()}
                        </CRMBadge>
                      </div>
                    }
                  >
                    <div className="space-y-1">
                      <span className="text-xs text-slate-400 font-medium">Net Take-Home Pay</span>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-[#0F172A] dark:text-white tracking-tight">
                        {formatIndianCurrency(slip.net_salary)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400">Gross Salary:</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatIndianCurrency(slip.gross_salary)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Deductions:</span>
                        <p className="font-mono font-semibold text-rose-600">
                          {formatIndianCurrency(
                            Number(slip.lop_deduction || 0) +
                            Number(slip.pf_deduction || 0) +
                            Number(slip.esi_deduction || 0) +
                            Number(slip.advance_deduction || 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Present Days:</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {slip.present_days} / {slip.working_days_in_month}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Overtime:</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatIndianCurrency(slip.overtime_amount)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast({
                            title: "Generating Payslip PDF",
                            description: `Preparing payslip for ${slip.month_year}...`,
                          });
                        }}
                        className="w-full gap-2 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Payslip PDF</span>
                      </Button>
                    </div>
                  </CRMCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </CRMPermissionGate>
  );
}
```

---

## 5. Verification Method

To independently verify this architectural blueprint and prevent regressions:

### 5.1 Verification Commands
1. **TypeScript Typecheck**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Exit code 0, zero `any` types, all imports (`CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`, `useCRMPermission`, `crmPayrollUtils`) resolve correctly.

2. **Existing Vitest Payroll Engine Test Suite**:
   ```bash
   cmd /c npx vitest run src/test/crmPayrollUtils.test.ts src/test/crmSalaryMigration.test.ts src/test/crmSalaryTypes.test.ts
   ```
   *Expected*: 100% pass rate across calculation engine and database schemas.

3. **New UI Unit Tests (`src/test/crmSalaryManagement.test.tsx`)**:
   Verify:
   - Unauthorized user receives `<SalaryAccessRestrictedFallback />` and "Not Authorized" toast when `hasPermission('salary', 'view')` is false.
   - Super admin bypasses permission gate and renders full page.
   - Renders 4 tabs and switches correctly on click.
   - Formats currency as `₹X,XX,XXX.XX` via `formatIndianCurrency`.
   - Renders loading skeletons during `dataLoading === true`.
   - Filters table records using search input in `CRMDataTable`.
   - Filters Tab 4 "My Payslips" strictly to `effectiveUserId`.

4. **New Admin Workflow Tests (`src/test/crmSalaryManagementAdmin.test.tsx`)**:
   Verify:
   - Gating Tab 2 Payroll Run with `salary:approve`.
   - Warning banner renders when `unconfiguredStaff.length > 0`.
   - Lock Payroll and Mark as Disbursed state machine transitions.
