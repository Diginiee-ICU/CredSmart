/**
 * CredSmart CRM Phase 3: Salary Management & Payroll Engine
 * Authoritative production UI page for employee compensation profiles,
 * monthly payroll calculations, advances & deductions, and self-service payslips.
 *
 * Implements full 4-tab workflow with dual-rendering mobile cards + desktop tables,
 * slide-over management drawers, top-level RBAC view gating, admin action gating,
 * Indian currency formatting (₹X,XX,XXX.XX), and offline cache synchronization.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Briefcase,
  Calculator,
  Receipt,
  FileText,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Check,
  X,
  ShieldAlert,
  Users,
  Wallet,
  ChevronRight,
  ClipboardList,
  Settings,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { settingsApi } from "@/services/settingsApi";
import { crmApi } from "@/services/crmApi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CRMPageHeader,
  CRMCommandHeader,
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
  round2,
  type CrmSalaryProfile,
  type CrmPayrollRun,
  type CrmPayslip,
  type CrmSalaryAdjustment,
  type PayslipComputedData,
  type CrmAttendanceRecord,
} from "@/utils/crmPayrollUtils";
import type {
  SalaryType,
  SalaryAdjustmentType,
} from "@/types/crmPayroll";

// ============================================================================
// Types & Storage Constants
// ============================================================================

export type SalaryTab = "profiles" | "payroll" | "adjustments" | "payslips";

export interface StaffDirectoryMember {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleColor?: string;
  isSuperAdmin?: boolean;
}

const STORAGE_PROFILES_PREFIX = "credsmart_crm_salary_profiles_";
const STORAGE_RUNS_PREFIX = "credsmart_crm_payroll_runs_";
const STORAGE_PAYSLIPS_PREFIX = "credsmart_crm_payslips_";
const STORAGE_ADJUSTMENTS_PREFIX = "credsmart_crm_salary_adjustments_";

/**
 * Formats a numeric or string value into Indian Currency notation (₹X,XX,XXX.XX).
 * Correctly formats lakhs and crores, clamps non-finite values to ₹0.00,
 * and preserves negative prefixes safely.
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

// ============================================================================
// Access Restricted Fallback
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
// Main Component: SalaryManagement
// ============================================================================

export default function SalaryManagement(): React.ReactElement {
  const { user } = useAuth();
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin, loading: permissionLoading } = useCRMPermission("salary", "view");

  const canEdit = isSuperAdmin || hasPermission("salary", "edit");
  const canApprove = isSuperAdmin || hasPermission("salary", "approve");

  const effectiveOrgId = orgId || "default_org";
  const effectiveUserId = user?.id || "anonymous_user";

  // Current active month ('YYYY-MM')
  const defaultMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [activeTab, setActiveTab] = useState<SalaryTab>("profiles");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Synchronous cache hydration
  const [salaryProfiles, setSalaryProfiles] = useState<CrmSalaryProfile[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${STORAGE_PROFILES_PREFIX}${effectiveOrgId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CrmSalaryProfile[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  });

  const [payrollRuns, setPayrollRuns] = useState<CrmPayrollRun[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${STORAGE_RUNS_PREFIX}${effectiveOrgId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CrmPayrollRun[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  });

  const [payslips, setPayslips] = useState<CrmPayslip[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${STORAGE_PAYSLIPS_PREFIX}${effectiveOrgId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CrmPayslip[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  });

  const [adjustments, setAdjustments] = useState<CrmSalaryAdjustment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${STORAGE_ADJUSTMENTS_PREFIX}${effectiveOrgId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CrmSalaryAdjustment[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<CrmAttendanceRecord[]>([]);
  const [staffDirectory, setStaffDirectory] = useState<Record<string, StaffDirectoryMember>>({});

  const loadedOrgRef = useRef<string | null>(effectiveOrgId);

  // Synchronous cache rehydration when organization context changes (OI-2, OI-8)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedProfiles = localStorage.getItem(`${STORAGE_PROFILES_PREFIX}${effectiveOrgId}`);
        setSalaryProfiles(storedProfiles ? JSON.parse(storedProfiles) : []);
      } catch {
        setSalaryProfiles([]);
      }
      try {
        const storedRuns = localStorage.getItem(`${STORAGE_RUNS_PREFIX}${effectiveOrgId}`);
        setPayrollRuns(storedRuns ? JSON.parse(storedRuns) : []);
      } catch {
        setPayrollRuns([]);
      }
      try {
        const storedSlips = localStorage.getItem(`${STORAGE_PAYSLIPS_PREFIX}${effectiveOrgId}`);
        setPayslips(storedSlips ? JSON.parse(storedSlips) : []);
      } catch {
        setPayslips([]);
      }
      try {
        const storedAdjs = localStorage.getItem(`${STORAGE_ADJUSTMENTS_PREFIX}${effectiveOrgId}`);
        setAdjustments(storedAdjs ? JSON.parse(storedAdjs) : []);
      } catch {
        setAdjustments([]);
      }
      setAttendanceRecords([]);
      try {
        const cachedStaff = localStorage.getItem(`credsmart_crm_staff_${effectiveOrgId}`);
        if (cachedStaff) {
          const parsed = JSON.parse(cachedStaff);
          if (Array.isArray(parsed)) {
            const map: Record<string, StaffDirectoryMember> = {};
            parsed.forEach((s: any) => {
              const id = String(s.id || s.user_id || s.staff_id || "");
              if (id) {
                map[id] = {
                  id,
                  name: String(s.full_name || s.name || (s.email ? String(s.email).split("@")[0] : "Team Member")),
                  email: String(s.email || ""),
                  roleName: String(s.crm_role_name || s.role_name || s.roleName || s.role || s.store_role || "Staff"),
                };
              }
            });
            setStaffDirectory(map);
          } else {
            setStaffDirectory({});
          }
        } else {
          setStaffDirectory({});
        }
      } catch {
        setStaffDirectory({});
      }
    }
    loadedOrgRef.current = effectiveOrgId;
  }, [effectiveOrgId]);

  // Slide-over Drawers state
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState<boolean>(false);
  const [profileDrawerMode, setProfileDrawerMode] = useState<"create" | "edit">("create");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Profile Drawer Form State
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [formSalaryType, setFormSalaryType] = useState<SalaryType>("monthly");
  const [formBaseAmount, setFormBaseAmount] = useState<string>("");
  const [formAllowedLeaves, setFormAllowedLeaves] = useState<string>("2");
  const [formOvertimeRate, setFormOvertimeRate] = useState<string>("0");
  const [formPfPercent, setFormPfPercent] = useState<string>("0");
  const [formEsiPercent, setFormEsiPercent] = useState<string>("0");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Adjustment Drawer State
  const [isAdjustmentDrawerOpen, setIsAdjustmentDrawerOpen] = useState<boolean>(false);
  const [formAdjStaffId, setFormAdjStaffId] = useState<string>("");
  const [formAdjType, setFormAdjType] = useState<SalaryAdjustmentType>("advance");
  const [formAdjAmount, setFormAdjAmount] = useState<string>("");
  const [formAdjMonth, setFormAdjMonth] = useState<string>(defaultMonthStr);
  const [formAdjDescription, setFormAdjDescription] = useState<string>("");

  // Preview Payslips for Tab 2
  const [previewPayslips, setPreviewPayslips] = useState<PayslipComputedData[]>([]);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState<boolean>(false);

  // ============================================================================
  // Data Hydration from Supabase
  // ============================================================================

  const loadSalaryData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (!orgId || orgId === "default_org") {
        setDataLoading(false);
        return;
      }

      // 1. Fetch all datasets in parallel for lightning-fast CRM loading
      const [
        staffRes,
        profilesResult,
        runsResult,
        slipsResult,
        adjsResult,
        attData,
      ] = await Promise.all([
        crmApi.getCRMStaff(effectiveOrgId).catch(() => null),
        (async () => {
          let profiles: CrmSalaryProfile[] | null = null;
          let profErr: any = null;
          try {
            const query = supabase.from("crm_salary_profiles").select("*");
            const filtered = typeof (query as any).or === "function"
              ? (query as any).or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`)
              : (query as any).eq("org_id", effectiveOrgId);
            const ordered = typeof (filtered as any).order === "function"
              ? (filtered as any).order("created_at", { ascending: false })
              : filtered;
            const { data, error } = await ordered;
            if (!error && data) {
              profiles = data as unknown as CrmSalaryProfile[];
            } else if (error) {
              profErr = error;
            }
          } catch (err: any) {
            profErr = err;
          }

          if (!profiles && !profErr) {
            try {
              const res = await crmApi.getCRMSalaryProfiles(effectiveOrgId);
              if (res?.data) {
                profiles = res.data;
                profErr = null;
              } else if (res?.error) {
                profErr = res.error;
              }
            } catch (err: any) {
              profErr = err;
            }
          }
          return { profiles, profErr };
        })(),
        (async () => {
          let runs: CrmPayrollRun[] | null = null;
          let runsErr: any = null;
          try {
            const query = supabase.from("crm_payroll_runs").select("*");
            const filtered = typeof (query as any).or === "function"
              ? (query as any).or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`)
              : (query as any).eq("org_id", effectiveOrgId);
            const ordered = typeof (filtered as any).order === "function"
              ? (filtered as any).order("month_year", { ascending: false })
              : filtered;
            const { data, error } = await ordered;
            if (!error && data) {
              runs = data as unknown as CrmPayrollRun[];
            } else if (error) {
              runsErr = error;
            }
          } catch (err: any) {
            runsErr = err;
          }

          if (!runs && !runsErr) {
            try {
              const res = await crmApi.getCRMPayrollRuns(effectiveOrgId);
              if (res?.data) {
                runs = res.data;
                runsErr = null;
              } else if (res?.error) {
                runsErr = res.error;
              }
            } catch (err: any) {
              runsErr = err;
            }
          }
          return { runs, runsErr };
        })(),
        (async () => {
          let slips: CrmPayslip[] | null = null;
          let slipsErr: any = null;
          try {
            const query = supabase.from("crm_payslips").select("*");
            const filtered = typeof (query as any).or === "function"
              ? (query as any).or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`)
              : (query as any).eq("org_id", effectiveOrgId);
            const ordered = typeof (filtered as any).order === "function"
              ? (filtered as any).order("month_year", { ascending: false })
              : filtered;
            const { data, error } = await ordered;
            if (!error && data) {
              slips = data as unknown as CrmPayslip[];
            } else if (error) {
              slipsErr = error;
            }
          } catch (err: any) {
            slipsErr = err;
          }

          if (!slips && !slipsErr) {
            try {
              const res = await crmApi.getCRMPayslips(effectiveOrgId);
              if (res?.data) {
                slips = res.data;
                slipsErr = null;
              } else if (res?.error) {
                slipsErr = res.error;
              }
            } catch (err: any) {
              slipsErr = err;
            }
          }
          return { slips, slipsErr };
        })(),
        (async () => {
          let adjs: CrmSalaryAdjustment[] | null = null;
          let adjErr: any = null;
          try {
            const query = supabase.from("crm_salary_adjustments").select("*");
            const filtered = typeof (query as any).or === "function"
              ? (query as any).or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`)
              : (query as any).eq("org_id", effectiveOrgId);
            const ordered = typeof (filtered as any).order === "function"
              ? (filtered as any).order("created_at", { ascending: false })
              : filtered;
            const { data, error } = await ordered;
            if (!error && data) {
              adjs = data as unknown as CrmSalaryAdjustment[];
            } else if (error) {
              adjErr = error;
            }
          } catch (err: any) {
            adjErr = err;
          }

          if (!adjs && !adjErr) {
            try {
              const res = await crmApi.getCRMSalaryAdjustments(effectiveOrgId);
              if (res?.data) {
                adjs = res.data;
                adjErr = null;
              } else if (res?.error) {
                adjErr = res.error;
              }
            } catch (err: any) {
              adjErr = err;
            }
          }
          return { adjs, adjErr };
        })(),
        (async () => {
          let att: CrmAttendanceRecord[] | null = null;
          try {
            const query = supabase.from("crm_attendance").select("*");
            const filtered = typeof (query as any).or === "function"
              ? (query as any).or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`)
              : (query as any).eq("org_id", effectiveOrgId);
            const ordered = typeof (filtered as any).order === "function"
              ? (filtered as any).order("date", { ascending: false })
              : filtered;
            const { data, error } = await ordered;
            if (!error && data) {
              att = data as unknown as CrmAttendanceRecord[];
            }
          } catch {}

          if (!att) {
            try {
              const res = await crmApi.getCRMAttendance(effectiveOrgId);
              if (res?.data) att = res.data as CrmAttendanceRecord[];
            } catch {}
          }
          return att;
        })(),
      ]);

      const dirMap: Record<string, StaffDirectoryMember> = {};

      if (staffRes?.data && Array.isArray(staffRes.data) && staffRes.data.length > 0) {
        (staffRes.data as unknown as Record<string, unknown>[]).forEach((s) => {
          const id = String(s.id || s.user_id || s.staff_id || "");
          const name = String(s.full_name || s.name || (s.email ? String(s.email).split("@")[0] : "Team Member"));
          const email = String(s.email || "");
          const roleName = String(s.crm_role_name || s.role_name || s.roleName || s.role || s.store_role || "Staff");
          if (id) {
            dirMap[id] = { id, name, email, roleName };
          }
        });
      }

      // Fallback 1: localStorage credsmart_crm_staff_${effectiveOrgId}
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem(`credsmart_crm_staff_${effectiveOrgId}`);
          if (cachedRaw) {
            const cachedList = JSON.parse(cachedRaw);
            if (Array.isArray(cachedList)) {
              cachedList.forEach((s: Record<string, unknown>) => {
                const id = String(s.id || s.user_id || s.staff_id || "");
                if (id && !dirMap[id]) {
                  const name = String(s.full_name || s.name || (s.email ? String(s.email).split("@")[0] : "Team Member"));
                  const email = String(s.email || "");
                  const roleName = String(s.crm_role_name || s.role_name || s.roleName || s.role || s.store_role || "Staff");
                  dirMap[id] = { id, name, email, roleName };
                }
              });
            }
          }
        } catch {}
      }

      // Fallback 2: settingsApi.getMemberships (enrich user fields directly without querying profiles)
      try {
        const memRes = await settingsApi.getMemberships(effectiveOrgId);
        if (memRes?.data && Array.isArray(memRes.data) && memRes.data.length > 0) {
          memRes.data.forEach((m: any) => {
            const userObj = m.user || m.profile || {};
            const id = String(m.user_id || userObj.id || m.id || "");
            if (id && !dirMap[id]) {
              const name = String(userObj.full_name || userObj.name || m.full_name || m.name || (userObj.email ? String(userObj.email).split("@")[0] : "Team Member"));
              const email = String(userObj.email || m.email || "");
              const roleName = String(m.role_name || m.role || userObj.role || "Staff");
              dirMap[id] = { id, name, email, roleName };
            }
          });
        }
      } catch {}

      // Fallback 3: Strict tenant boundary enforcement - never query global profiles table without tenant filter
      // If no staff members belong to this organization, dirMap stays empty to prevent cross-tenant leaks.

      setStaffDirectory(dirMap);

      // 2. Consume Parallel Salary Profiles
      const { profiles, profErr } = profilesResult;
      if (profErr) {
        const isSyntaxErr =
          String(profErr?.message || "").includes("invalid input syntax") ||
          String(profErr?.message || "").includes("default_org");
        if (!isSyntaxErr) {
          toast({
            title: "Error Loading Salary Profiles",
            description: profErr.message || "Failed to load profiles.",
            variant: "destructive",
          });
        }
      } else if (profiles) {
        const enriched = (profiles as CrmSalaryProfile[]).map((p) => ({
          ...p,
          staff_name: dirMap[p.staff_id]?.name || p.staff_name || "Staff Member",
          staff_email: dirMap[p.staff_id]?.email || p.staff_email || "",
          staff_role: dirMap[p.staff_id]?.roleName || p.staff_role || "Staff",
        }));
        setSalaryProfiles(enriched);
        localStorage.setItem(`${STORAGE_PROFILES_PREFIX}${effectiveOrgId}`, JSON.stringify(enriched));
      }

      // 3. Consume Parallel Payroll Runs
      const { runs, runsErr } = runsResult;
      if (runsErr) {
        const isSyntaxErr =
          String(runsErr?.message || "").includes("invalid input syntax") ||
          String(runsErr?.message || "").includes("default_org");
        if (!isSyntaxErr) {
          toast({
            title: "Error Loading Payroll Runs",
            description: runsErr.message || "Failed to load payroll runs.",
            variant: "destructive",
          });
        }
      } else if (runs) {
        setPayrollRuns(runs as CrmPayrollRun[]);
        localStorage.setItem(`${STORAGE_RUNS_PREFIX}${effectiveOrgId}`, JSON.stringify(runs));
      }

      // 4. Consume Parallel Payslips
      const { slips, slipsErr } = slipsResult;
      if (slipsErr) {
        const isSyntaxErr =
          String(slipsErr?.message || "").includes("invalid input syntax") ||
          String(slipsErr?.message || "").includes("default_org");
        if (!isSyntaxErr) {
          toast({
            title: "Error Loading Payslips",
            description: slipsErr.message || "Failed to load payslips.",
            variant: "destructive",
          });
        }
      } else if (slips) {
        const enrichedSlips = (slips as CrmPayslip[]).map((s) => ({
          ...s,
          staff_name: dirMap[s.staff_id]?.name || s.staff_name || "Staff Member",
          staff_email: dirMap[s.staff_id]?.email || s.staff_email || "",
          staff_role: dirMap[s.staff_id]?.roleName || s.staff_role || "Staff",
        }));
        setPayslips(enrichedSlips);
        localStorage.setItem(`${STORAGE_PAYSLIPS_PREFIX}${effectiveOrgId}`, JSON.stringify(enrichedSlips));
      }

      // 5. Consume Parallel Salary Adjustments
      const { adjs, adjErr } = adjsResult;
      if (adjErr) {
        const isSyntaxErr =
          String(adjErr?.message || "").includes("invalid input syntax") ||
          String(adjErr?.message || "").includes("default_org");
        if (!isSyntaxErr) {
          toast({
            title: "Error Loading Adjustments",
            description: adjErr.message || "Failed to load adjustments.",
            variant: "destructive",
          });
        }
      } else if (adjs) {
        const enrichedAdjs = (adjs as CrmSalaryAdjustment[]).map((a) => ({
          ...a,
          staff_name: dirMap[a.staff_id]?.name || a.staff_name || "Staff Member",
        }));
        setAdjustments(enrichedAdjs);
        localStorage.setItem(`${STORAGE_ADJUSTMENTS_PREFIX}${effectiveOrgId}`, JSON.stringify(enrichedAdjs));
      }

      // 6. Consume Parallel Attendance Records
      if (attData) {
        setAttendanceRecords(attData);
      }
    } catch (err: unknown) {
      console.warn("Salary data load warning:", err);
      toast({
        title: "Error Loading Data",
        description: "An unexpected error occurred while loading payroll data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    loadSalaryData();
  }, [loadSalaryData]);

  // Dynamic reload when staff updated in Role Management
  useEffect(() => {
    const handleStaffUpdated = () => {
      loadSalaryData();
    };
    window.addEventListener("credsmart:crm_staff_updated", handleStaffUpdated);
    return () => {
      window.removeEventListener("credsmart:crm_staff_updated", handleStaffUpdated);
    };
  }, [loadSalaryData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSalaryData();
    toast({ title: "Refreshed", description: "Salary and payroll data synced." });
  };

  // ============================================================================
  // Derived State & KPI Metrics
  // ============================================================================

  const currentRun = useMemo(() => {
    return payrollRuns.find((r) => r.month_year === selectedMonth) || null;
  }, [payrollRuns, selectedMonth]);

  const isCurrentRunLocked = currentRun?.status === "locked" || currentRun?.status === "disbursed";
  const isCurrentRunDisbursed = currentRun?.status === "disbursed";

  const activeProfiles = useMemo(() => salaryProfiles.filter((p) => p.is_active), [salaryProfiles]);
  const activeProfilesCount = activeProfiles.length;

  const pendingAdjustments = useMemo(() => adjustments.filter((a) => a.status === "pending"), [adjustments]);
  const totalPendingAdvanceAmount = useMemo(
    () => pendingAdjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0),
    [pendingAdjustments]
  );

  const myPayslips = useMemo(
    () => payslips.filter((s) => s.staff_id === effectiveUserId),
    [payslips, effectiveUserId]
  );

  // Missing profile check
  const unconfiguredStaff = useMemo(() => {
    const configuredSet = new Set(salaryProfiles.map((p) => p.staff_id));
    return Object.values(staffDirectory).filter((m) => !configuredSet.has(m.id));
  }, [salaryProfiles, staffDirectory]);

  // Tab 2: Effective payslips to render (either generated preview or existing payslips from DB)
  const currentMonthPayslips = useMemo(() => {
    return payslips.filter((s) => s.month_year === selectedMonth);
  }, [payslips, selectedMonth]);

  // Reset preview when month changes
  useEffect(() => {
    setPreviewPayslips([]);
    setHasGeneratedPreview(false);
  }, [selectedMonth]);

  // ============================================================================
  // Tab 1: Profile Drawer Actions
  // ============================================================================

  const openCreateProfileDrawer = () => {
    setProfileDrawerMode("create");
    setEditingProfileId(null);
    setFormStaffId("");
    setFormSalaryType("monthly");
    setFormBaseAmount("");
    setFormAllowedLeaves("2");
    setFormOvertimeRate("0");
    setFormPfPercent("0");
    setFormEsiPercent("0");
    setFormIsActive(true);
    setIsProfileDrawerOpen(true);
  };

  const openEditProfileDrawer = (profile: CrmSalaryProfile) => {
    setProfileDrawerMode("edit");
    setEditingProfileId(profile.id);
    setFormStaffId(profile.staff_id);
    setFormSalaryType(profile.salary_type || "monthly");
    setFormBaseAmount(String(profile.base_amount || ""));
    setFormAllowedLeaves(String(profile.allowed_leaves_per_month ?? "2"));
    setFormOvertimeRate(String(profile.hourly_overtime_rate ?? "0"));
    setFormPfPercent(String(profile.pf_deduction_percent ?? "0"));
    setFormEsiPercent(String(profile.esi_deduction_percent ?? "0"));
    setFormIsActive(profile.is_active ?? true);
    setIsProfileDrawerOpen(true);
  };

  const openConfigureForStaff = (staff: StaffDirectoryMember) => {
    setProfileDrawerMode("create");
    setEditingProfileId(null);
    setFormStaffId(staff.id);
    setFormSalaryType("monthly");
    setFormBaseAmount("");
    setFormAllowedLeaves("2");
    setFormOvertimeRate("0");
    setFormPfPercent("0");
    setFormEsiPercent("0");
    setFormIsActive(true);
    setIsProfileDrawerOpen(true);
  };

  const handleSaveProfile = async () => {
    // 1. Validation: Staff ID
    if (!formStaffId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a staff member.",
        variant: "destructive",
      });
      return;
    }

    // 2. Validation: Base Salary
    const numBase = Number(formBaseAmount);
    if (formBaseAmount.trim() === "" || isNaN(numBase) || numBase < 0) {
      toast({
        title: "Validation Error",
        description: "Base salary must be a non-negative number.",
        variant: "destructive",
      });
      return;
    }

    // 3. Validation: PF Percentage
    const numPf = Number(formPfPercent || 0);
    if (isNaN(numPf) || numPf < 0 || numPf > 100) {
      toast({
        title: "Validation Error",
        description: "PF deduction percentage must be between 0% and 100%.",
        variant: "destructive",
      });
      return;
    }

    // 4. Validation: ESI Percentage
    const numEsi = Number(formEsiPercent || 0);
    if (isNaN(numEsi) || numEsi < 0 || numEsi > 100) {
      toast({
        title: "Validation Error",
        description: "ESI deduction percentage must be between 0% and 100%.",
        variant: "destructive",
      });
      return;
    }

    // 5. Validation: Allowed Leaves
    const numLeaves = parseInt(String(formAllowedLeaves || 0), 10);
    if (isNaN(numLeaves) || numLeaves < 0 || numLeaves > 31) {
      toast({
        title: "Validation Error",
        description: "Allowed leaves must be between 0 and 31 days per month.",
        variant: "destructive",
      });
      return;
    }

    const staffName = staffDirectory[formStaffId]?.name || "Staff Member";
    const payload = {
      id: editingProfileId || `prof-${Date.now()}`,
      org_id: effectiveOrgId,
      staff_id: formStaffId,
      staff_name: staffName,
      staff_email: staffDirectory[formStaffId]?.email || "",
      staff_role: staffDirectory[formStaffId]?.roleName || "Staff",
      salary_type: formSalaryType,
      base_amount: round2(numBase),
      currency: "INR",
      allowed_leaves_per_month: numLeaves,
      hourly_overtime_rate: Math.max(0, round2(Number(formOvertimeRate || 0))),
      pf_deduction_percent: round2(numPf),
      esi_deduction_percent: round2(numEsi),
      is_active: formIsActive,
      updated_at: new Date().toISOString(),
    };

    let saveError: any = null;
    try {
      const { error } = await supabase.from("crm_salary_profiles").upsert(payload);
      if (error) saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      try {
        const res = await crmApi.upsertCRMSalaryProfile(payload, effectiveOrgId);
        if (res.error) saveError = res.error;
        else saveError = null;
      } catch (err: any) {
        saveError = err;
      }
    }

    if (saveError) {
      toast({
        title: "Save Failed",
        description: saveError.message || "Failed to persist salary profile.",
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setSalaryProfiles((prev) => {
      const idx = prev.findIndex((p) => p.staff_id === formStaffId || p.id === payload.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...payload };
        return next;
      }
      return [payload as CrmSalaryProfile, ...prev];
    });

    setIsProfileDrawerOpen(false);
    toast({
      title: "Profile Saved",
      description: `Salary profile saved successfully for ${staffName}.`,
    });
  };

  // ============================================================================
  // Tab 2: Payroll Run Actions
  // ============================================================================

  const handleGeneratePayroll = () => {
    if (isCurrentRunLocked) {
      toast({
        title: "Payroll Locked",
        description: "This payroll run is already locked and cannot be recalculated.",
        variant: "destructive",
      });
      return;
    }

    // 1. Missing profiles check & warning toast
    if (unconfiguredStaff.length > 0) {
      const missingNames = unconfiguredStaff.map((s) => s.name).join(", ");
      toast({
        title: "Warning: Missing Profiles",
        description: `${missingNames} is missing a salary profile and was excluded from calculation.`,
        variant: "destructive",
      });
    }

    // 2. Compute payslips for each configured staff member
    const computedList: PayslipComputedData[] = [];
    for (const profile of salaryProfiles) {
      if (!profile.is_active) continue;
      const computed = generatePayslipData({
        staffId: profile.staff_id,
        monthYear: selectedMonth,
        salaryProfile: profile,
        attendanceRecords,
        adjustments,
      });
      computedList.push(computed);
    }

    setPreviewPayslips(computedList);
    setHasGeneratedPreview(true);

    toast({
      title: "Payroll Calculated",
      description: `Generated calculation preview for ${computedList.length} staff member(s).`,
    });
  };

  const handleLockPayroll = async () => {
    if (isCurrentRunLocked || !canApprove) return;

    // Use preview if available, otherwise current slips
    const slipsToLock = hasGeneratedPreview
      ? previewPayslips
      : currentMonthPayslips.map((s) => ({
          staffId: s.staff_id,
          monthYear: s.month_year,
          workingDaysInMonth: s.working_days_in_month,
          presentDays: s.present_days,
          absentDays: s.absent_days,
          halfDays: s.half_days,
          lopDays: Number(s.lop_days),
          overtimeMinutes: s.overtime_minutes,
          grossSalary: Number(s.gross_salary),
          lopDeduction: Number(s.lop_deduction),
          overtimeAmount: Number(s.overtime_amount),
          pfDeduction: Number(s.pf_deduction),
          esiDeduction: Number(s.esi_deduction),
          advanceDeduction: Number(s.advance_deduction),
          bonusAmount: Number(s.bonus_amount),
          netSalary: Number(s.net_salary),
        }));

    if (slipsToLock.length === 0) {
      toast({
        title: "No Calculations Available",
        description: "Please click 'Generate Payroll' before locking.",
        variant: "destructive",
      });
      return;
    }

    const totalPayout = slipsToLock.reduce((sum, s) => sum + s.netSalary, 0);
    const runId = currentRun?.id || `run-${selectedMonth}`;
    const runPayload: CrmPayrollRun = {
      id: runId,
      org_id: effectiveOrgId,
      month_year: selectedMonth,
      status: "locked",
      total_payout: round2(totalPayout),
      staff_count: slipsToLock.length,
      locked_by: effectiveUserId,
      locked_at: new Date().toISOString(),
      notes: `Locked on ${new Date().toLocaleDateString()}`,
      created_at: currentRun?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert run via dual-layer
    try {
      await supabase.from("crm_payroll_runs").upsert(runPayload);
    } catch {}
    try {
      await crmApi.upsertCRMPayrollRun(runPayload, effectiveOrgId);
    } catch {}

    // Upsert payslips
    const profileMap = new Map(salaryProfiles.map((p) => [p.staff_id, p]));
    const payslipRows: CrmPayslip[] = slipsToLock.map((slip) => {
      const prof = profileMap.get(slip.staffId);
      const snapshot = prof
        ? createSalaryProfileSnapshot(prof)
        : {
            salary_type: "monthly" as SalaryType,
            base_amount: 0,
            currency: "INR",
            allowed_leaves_per_month: 2,
            hourly_overtime_rate: 0,
            pf_deduction_percent: 0,
            esi_deduction_percent: 0,
          };

      return {
        id: `slip-${selectedMonth}-${slip.staffId}`,
        org_id: effectiveOrgId,
        payroll_run_id: runId,
        staff_id: slip.staffId,
        staff_name: staffDirectory[slip.staffId]?.name || "Staff Member",
        staff_email: staffDirectory[slip.staffId]?.email || "",
        staff_role: staffDirectory[slip.staffId]?.roleName || "Staff",
        month_year: selectedMonth,
        salary_profile_snapshot: snapshot,
        working_days_in_month: slip.workingDaysInMonth,
        presentDays: slip.presentDays,
        absentDays: slip.absentDays,
        halfDays: slip.halfDays,
        present_days: slip.presentDays,
        absent_days: slip.absentDays,
        half_days: slip.halfDays,
        lop_days: slip.lopDays,
        overtime_minutes: slip.overtimeMinutes,
        gross_salary: slip.grossSalary,
        lop_deduction: slip.lopDeduction,
        overtime_amount: slip.overtimeAmount,
        pf_deduction: slip.pfDeduction,
        esi_deduction: slip.esiDeduction,
        advance_deduction: slip.advanceDeduction,
        bonus_amount: slip.bonusAmount,
        net_salary: slip.netSalary,
        payment_status: "pending",
        paid_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    try {
      await supabase.from("crm_payslips").upsert(payslipRows);
    } catch {}
    try {
      await crmApi.upsertCRMPayslips(payslipRows, effectiveOrgId);
    } catch {}

    // Update local state
    setPayrollRuns((prev) => {
      const idx = prev.findIndex((r) => r.month_year === selectedMonth);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = runPayload;
        return next;
      }
      return [runPayload, ...prev];
    });

    setPayslips((prev) => {
      const other = prev.filter((s) => s.month_year !== selectedMonth);
      return [...other, ...payslipRows];
    });

    toast({
      title: "Payroll Locked",
      description: `Payroll for ${selectedMonth} locked successfully.`,
    });
  };

  const handleMarkAsDisbursed = async () => {
    if (!currentRun || currentRun.status !== "locked" || !canApprove) return;

    try {
      await supabase
        .from("crm_payroll_runs")
        .update({ status: "disbursed", updated_at: new Date().toISOString() })
        .eq("month_year", selectedMonth)
        .or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`);
    } catch {}
    try {
      await crmApi.updateCRMPayrollRun(
        selectedMonth,
        { status: "disbursed", updated_at: new Date().toISOString() },
        effectiveOrgId
      );
    } catch {}

    try {
      await supabase
        .from("crm_payslips")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() })
        .eq("month_year", selectedMonth)
        .or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`);
    } catch {}
    try {
      await crmApi.updateCRMPayslips(
        { monthYear: selectedMonth },
        { payment_status: "paid", paid_at: new Date().toISOString() },
        effectiveOrgId
      );
    } catch {}

    // Update local state
    setPayrollRuns((prev) =>
      prev.map((r) => (r.month_year === selectedMonth ? { ...r, status: "disbursed" } : r))
    );

    setPayslips((prev) =>
      prev.map((s) =>
        s.month_year === selectedMonth ? { ...s, payment_status: "paid", paid_at: new Date().toISOString() } : s
      )
    );

    toast({
      title: "Marked as Disbursed",
      description: `Disbursed payroll for ${selectedMonth}.`,
    });
  };

  // ============================================================================
  // Tab 3: Advances & Deductions Actions
  // ============================================================================

  const handleOpenAdjustmentDrawer = () => {
    setFormAdjStaffId("");
    setFormAdjType("advance");
    setFormAdjAmount("");
    setFormAdjMonth(selectedMonth);
    setFormAdjDescription("");
    setIsAdjustmentDrawerOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!formAdjStaffId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a staff member.",
        variant: "destructive",
      });
      return;
    }

    const numAmount = Number(formAdjAmount);
    if (formAdjAmount.trim() === "" || isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    const staffName = staffDirectory[formAdjStaffId]?.name || "Staff Member";
    const payload: CrmSalaryAdjustment = {
      id: `adj-${Date.now()}`,
      org_id: effectiveOrgId,
      staff_id: formAdjStaffId,
      staff_name: staffName,
      type: formAdjType,
      amount: round2(numAmount),
      description: formAdjDescription.trim() || null,
      month_year: formAdjMonth.trim() || null,
      status: "pending",
      requested_by: effectiveUserId,
      requester_name: user?.user_metadata?.full_name || "Admin",
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    };

    let adjError: any = null;
    try {
      const { error } = await supabase.from("crm_salary_adjustments").insert(payload);
      if (error) adjError = error;
    } catch (err) {
      adjError = err;
    }

    if (adjError) {
      try {
        const res = await crmApi.createCRMSalaryAdjustment(payload, effectiveOrgId);
        if (res.error) adjError = res.error;
        else adjError = null;
      } catch (err: any) {
        adjError = err;
      }
    }

    if (adjError) {
      toast({
        title: "Failed to Record Adjustment",
        description: adjError.message || "Could not save adjustment.",
        variant: "destructive",
      });
      return;
    }

    setAdjustments((prev) => [payload, ...prev]);
    setIsAdjustmentDrawerOpen(false);

    toast({
      title: "Adjustment Recorded",
      description: "Submitted for approval.",
    });
  };

  const handleApproveAdjustment = async (id: string) => {
    if (!canApprove) return;
    try {
      await supabase
        .from("crm_salary_adjustments")
        .update({
          status: "approved",
          approved_by: effectiveUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`);
    } catch {}
    try {
      await crmApi.updateCRMSalaryAdjustment(
        id,
        {
          status: "approved",
          approved_by: effectiveUserId,
          approved_at: new Date().toISOString(),
        },
        effectiveOrgId
      );
    } catch {}

    setAdjustments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "approved",
              approved_by: effectiveUserId,
              approved_at: new Date().toISOString(),
            }
          : a
      )
    );

    toast({
      title: "Adjustment Approved",
      description: "Adjustment has been approved and will apply to payroll.",
    });
  };

  const handleRejectAdjustment = async (id: string) => {
    if (!canApprove) return;
    try {
      await supabase
        .from("crm_salary_adjustments")
        .update({
          status: "rejected",
          approved_by: effectiveUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .or(`organization_id.eq.${effectiveOrgId},org_id.eq.${effectiveOrgId}`);
    } catch {}
    try {
      await crmApi.updateCRMSalaryAdjustment(
        id,
        {
          status: "rejected",
          approved_by: effectiveUserId,
          approved_at: new Date().toISOString(),
        },
        effectiveOrgId
      );
    } catch {}

    setAdjustments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a))
    );

    toast({
      title: "Adjustment Rejected",
      description: "Adjustment has been marked as rejected.",
    });
  };

  // ============================================================================
  // Tab 4: Payslip Download
  // ============================================================================

  const handleDownloadPayslip = (slip: CrmPayslip) => {
    toast({
      title: "Generating Payslip PDF",
      description: `Preparing payslip for ${slip.month_year}...`,
    });
  };

  // ============================================================================
  // Tab 2: Computed Totals for Preview or Active Run
  // ============================================================================

  const summaryTotals = useMemo(() => {
    if (hasGeneratedPreview && previewPayslips.length > 0) {
      const totalStaff = previewPayslips.length;
      const totalPayout = previewPayslips.reduce((acc, p) => acc + p.netSalary, 0);
      const totalGross = previewPayslips.reduce((acc, p) => acc + p.grossSalary, 0);
      const totalDeductions = previewPayslips.reduce(
        (acc, p) => acc + p.lopDeduction + p.pfDeduction + p.esiDeduction + p.advanceDeduction,
        0
      );
      return { totalStaff, totalPayout, totalGross, totalDeductions };
    }
    if (currentMonthPayslips.length > 0) {
      const totalStaff = currentMonthPayslips.length;
      const totalPayout = currentMonthPayslips.reduce((acc, p) => acc + Number(p.net_salary || 0), 0);
      const totalGross = currentMonthPayslips.reduce((acc, p) => acc + Number(p.gross_salary || 0), 0);
      const totalDeductions = currentMonthPayslips.reduce(
        (acc, p) =>
          acc +
          Number(p.lop_deduction || 0) +
          Number(p.pf_deduction || 0) +
          Number(p.esi_deduction || 0) +
          Number(p.advance_deduction || 0),
        0
      );
      return { totalStaff, totalPayout, totalGross, totalDeductions };
    }
    return {
      totalStaff: activeProfilesCount,
      totalPayout: 0,
      totalGross: 0,
      totalDeductions: 0,
    };
  }, [hasGeneratedPreview, previewPayslips, currentMonthPayslips, activeProfilesCount]);

  // Handle permissionLoading skeleton
  if (permissionLoading) {
    return (
      <div className="space-y-6 pb-32 sm:pb-20 max-w-7xl mx-auto px-3 sm:px-6 pt-6">
        <Skeleton className="h-14 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl animate-pulse" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <CRMPermissionGate
      module="salary"
      action="view"
      fallback={<SalaryAccessRestrictedFallback />}
    >
      <div className="w-full">
        {/* ================================================================== */}
        {/* DESKTOP VIEW (>= 768px): 100% Preserved Architecture               */}
        {/* ================================================================== */}
        <div className="hidden md:block space-y-6 pb-32 sm:pb-20 max-w-7xl mx-auto px-3 sm:px-6">
          {/* ================================================================== */}
          {/* CRM Page Header                                                    */}
          {/* ================================================================== */}
        <CRMCommandHeader
          title="Salary Management & Payroll Engine"
          subtitle="Staff compensation, monthly payroll runs, advances, and payslips"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "CRM", href: ROUTE_PATHS.crm },
            { label: "Salary & Payroll", href: ROUTE_PATHS.crmSalary },
          ]}
          showBack={true}
          backTo={ROUTE_PATHS.crm}
          badge={
            <div className="flex items-center gap-1.5">
              <CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>
              <CRMBadge variant="success" size="sm" dot>
                Live Sync
              </CRMBadge>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8.5 px-3 rounded-lg gap-1.5 text-xs text-slate-700 bg-white border border-slate-200/80 shadow-2xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {activeTab === "profiles" && canEdit && (
                <Button
                  size="sm"
                  onClick={openCreateProfileDrawer}
                  className="h-8.5 px-3 rounded-lg gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Profile</span>
                </Button>
              )}

              {activeTab === "adjustments" && (
                <Button
                  size="sm"
                  onClick={handleOpenAdjustmentDrawer}
                  className="h-8.5 px-3 rounded-lg gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
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
              <Skeleton key={i} className="h-28 rounded-2xl animate-pulse" />
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
        <div
          role="tablist"
          className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto self-start overflow-x-auto scrollbar-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profiles"}
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
            role="tab"
            aria-selected={activeTab === "payroll"}
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
            role="tab"
            aria-selected={activeTab === "adjustments"}
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
            role="tab"
            aria-selected={activeTab === "payslips"}
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
          <div className="space-y-6">
            {/* Configured Profiles Section */}
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <CRMDataTable<CrmSalaryProfile>
                  data={salaryProfiles}
                  columns={[
                    {
                      key: "staff_name",
                      header: "Staff Member",
                      sortable: true,
                      accessor: (p) => {
                        const name = staffDirectory[p.staff_id]?.name || p.staff_name || "Staff Member";
                        const email = staffDirectory[p.staff_id]?.email || p.staff_email || "";
                        return (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F172A] dark:text-white">{name}</span>
                            {email && <span className="text-[11px] text-slate-400">{email}</span>}
                          </div>
                        );
                      },
                    },
                    {
                      key: "staff_role",
                      header: "Role",
                      accessor: (p) => (
                        <CRMRolePill
                          name={staffDirectory[p.staff_id]?.roleName || p.staff_role || "Staff"}
                          color="#1D4ED8"
                        />
                      ),
                    },
                    {
                      key: "salary_type",
                      header: "Type",
                      sortable: true,
                      accessor: (p) => {
                        const variantMap: Record<SalaryType, "info" | "orange" | "success"> = {
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
                      accessor: (p) => (
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {formatIndianCurrency(p.base_amount)}
                        </span>
                      ),
                    },
                    {
                      key: "allowed_leaves_per_month",
                      header: "Paid Leaves",
                      accessor: (p) => `${p.allowed_leaves_per_month} days/mo`,
                    },
                    {
                      key: "hourly_overtime_rate",
                      header: "Overtime Rate",
                      accessor: (p) =>
                        p.hourly_overtime_rate
                          ? `${formatIndianCurrency(p.hourly_overtime_rate)}/hr`
                          : "None",
                    },
                    {
                      key: "deductions",
                      header: "PF / ESI %",
                      accessor: (p) =>
                        `PF: ${p.pf_deduction_percent || 0}% | ESI: ${p.esi_deduction_percent || 0}%`,
                    },
                    {
                      key: "is_active",
                      header: "Status",
                      accessor: (p) =>
                        p.is_active ? (
                          <CRMBadge variant="success" size="sm" dot>
                            Active
                          </CRMBadge>
                        ) : (
                          <CRMBadge variant="neutral" size="sm">
                            Inactive
                          </CRMBadge>
                        ),
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      accessor: (p) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditProfileDrawer(p)}
                          className="h-7 text-xs font-semibold text-[#1D4ED8] hover:text-blue-800"
                        >
                          Configure
                        </Button>
                      ),
                    },
                  ]}
                  searchPlaceholder="Search staff name or email..."
                  pageSize={10}
                  emptyMessage="No salary profiles configured yet."
                />
              </div>

              {/* Mobile Cards View (375px) */}
              <div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {salaryProfiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No salary profiles configured yet.
                  </div>
                ) : (
                  salaryProfiles.map((p) => {
                    const name = staffDirectory[p.staff_id]?.name || p.staff_name || "Staff Member";
                    const email = staffDirectory[p.staff_id]?.email || p.staff_email || "";
                    return (
                      <div key={p.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{name}</h4>
                            {email && <p className="text-xs text-slate-400">{email}</p>}
                          </div>
                          <CRMBadge variant={p.is_active ? "success" : "neutral"} size="sm" dot={p.is_active}>
                            {p.salary_type.toUpperCase()}
                          </CRMBadge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="text-slate-400">Base Wage:</span>
                            <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">{formatIndianCurrency(p.base_amount)}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Overtime:</span>
                            <p className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                              {p.hourly_overtime_rate ? `${formatIndianCurrency(p.hourly_overtime_rate)}/hr` : "None"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditProfileDrawer(p)}
                          className="w-full min-h-[44px] h-11 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"
                        >
                          Configure Profile
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Unconfigured Staff Section */}
            {unconfiguredStaff.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Staff Without Salary Profile
                    </h3>
                    <CRMBadge variant="warning" size="sm">
                      {unconfiguredStaff.length} Unconfigured
                    </CRMBadge>
                  </div>
                </div>

                {/* Desktop Unconfigured Table */}
                <div className="hidden sm:block rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-3.5">Staff Member</th>
                        <th className="py-2.5 px-3.5">Assigned Role</th>
                        <th className="py-2.5 px-3.5">Status</th>
                        <th className="py-2.5 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {unconfiguredStaff.map((staff) => (
                        <tr key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white">{staff.name}</span>
                              <span className="text-[11px] text-slate-400">{staff.email || "No email"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <CRMRolePill name={staff.roleName || "Staff"} color="#1D4ED8" />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <CRMBadge variant="warning" size="sm" dot>
                              Not Configured
                            </CRMBadge>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <Button
                              size="sm"
                              onClick={() => openConfigureForStaff(staff)}
                              className="h-7.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-[0.98] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Configure Salary
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Unconfigured Cards */}
                <div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                  {unconfiguredStaff.map((staff) => (
                    <div key={staff.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{staff.name}</h4>
                          <p className="text-xs text-slate-400">{staff.email || "No email"}</p>
                        </div>
                        <CRMBadge variant="warning" size="sm" dot>
                          Not Configured
                        </CRMBadge>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <CRMRolePill name={staff.roleName || "Staff"} color="#1D4ED8" />
                        <Button
                          size="sm"
                          onClick={() => openConfigureForStaff(staff)}
                          className="h-8.5 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                        >
                          Configure Salary
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: Payroll Run                                                 */}
        {/* ================================================================== */}
        {activeTab === "payroll" && (
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="space-y-1">
                  <label htmlFor="payroll-month" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Payroll Month
                  </label>
                  <Input
                    id="payroll-month"
                    aria-label="Payroll Month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-9 w-44 text-xs font-mono rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Scheduled Working Days
                  </span>
                  <p className="text-xs font-bold text-[#0F172A] font-mono pt-1">
                    {getWorkingDaysInMonth(selectedMonth)} Days
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

                <Button
                  size="sm"
                  onClick={handleGeneratePayroll}
                  disabled={isCurrentRunLocked || !canApprove}
                  className="h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Generate Payroll</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLockPayroll}
                  disabled={isCurrentRunLocked || !canApprove || (!hasGeneratedPreview && currentMonthPayslips.length === 0)}
                  className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Payroll</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleMarkAsDisbursed}
                  disabled={!currentRun || currentRun.status !== "locked" || !canApprove}
                  className="h-8 gap-1.5 text-xs bg-[#10B981] hover:bg-emerald-600 text-white font-semibold rounded-xl"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Disbursed</span>
                </Button>
              </div>
            </div>

            {/* Warning if unconfigured staff exists */}
            {unconfiguredStaff.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Notice:</strong> {unconfiguredStaff.length} active staff member(s) ({unconfiguredStaff.map(s => s.name).join(", ")}) do not have a salary profile configured.
                  They will be excluded from payroll calculations until a profile is created.
                </span>
              </div>
            )}

            {/* Summary Totals KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{summaryTotals.totalStaff}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Gross</span>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{formatIndianCurrency(summaryTotals.totalGross)}</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deductions</span>
                <p className="text-xl font-black font-mono text-rose-600">{formatIndianCurrency(summaryTotals.totalDeductions)}</p>
              </div>
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Payout</span>
                <p className="text-xl font-black font-mono text-emerald-600">{formatIndianCurrency(summaryTotals.totalPayout)}</p>
              </div>
            </div>

            {/* Desktop Preview Table */}
            <div className="hidden sm:block">
              {hasGeneratedPreview ? (
                <CRMDataTable<PayslipComputedData>
                  data={previewPayslips}
                  columns={[
                    {
                      key: "staffId",
                      header: "Staff Member",
                      sortable: true,
                      accessor: (p) => (
                        <div>
                          <span className="font-bold text-slate-900">{staffDirectory[p.staffId]?.name || p.staffId}</span>
                          <p className="text-[11px] text-slate-400">{staffDirectory[p.staffId]?.email || ""}</p>
                        </div>
                      ),
                    },
                    {
                      key: "presentDays",
                      header: "Present Days",
                      accessor: (p) => `P: ${p.presentDays} | A: ${p.absentDays} | H: ${p.halfDays}`,
                    },
                    {
                      key: "lopDays",
                      header: "LOP Days & Deduction",
                      accessor: (p) => `${p.lopDays}d (${formatIndianCurrency(p.lopDeduction)})`,
                    },
                    {
                      key: "overtimeAmount",
                      header: "Overtime",
                      accessor: (p) => `${p.overtimeMinutes}m (${formatIndianCurrency(p.overtimeAmount)})`,
                    },
                    {
                      key: "grossSalary",
                      header: "Gross",
                      accessor: (p) => formatIndianCurrency(p.grossSalary),
                    },
                    {
                      key: "deductions",
                      header: "Deductions",
                      accessor: (p) => {
                        const totalDed = p.lopDeduction + p.pfDeduction + p.esiDeduction + p.advanceDeduction;
                        return formatIndianCurrency(totalDed);
                      },
                    },
                    {
                      key: "netSalary",
                      header: "Net Pay",
                      sortable: true,
                      accessor: (p) => (
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {formatIndianCurrency(p.netSalary)}
                        </span>
                      ),
                    },
                  ]}
                  searchPlaceholder="Search calculated preview..."
                  pageSize={10}
                  emptyMessage="No calculated preview records."
                />
              ) : (
                <CRMDataTable<CrmPayslip>
                  data={currentMonthPayslips}
                  columns={[
                    {
                      key: "staff_name",
                      header: "Staff Member",
                      sortable: true,
                      accessor: (s) => (
                        <div>
                          <span className="font-bold text-slate-900">{s.staff_name}</span>
                          <p className="text-[11px] text-slate-400">{s.staff_email}</p>
                        </div>
                      ),
                    },
                    {
                      key: "attendance",
                      header: "Present Days",
                      accessor: (s) => `P: ${s.present_days} | A: ${s.absent_days} | H: ${s.half_days}`,
                    },
                    {
                      key: "lop",
                      header: "LOP Days & Deduction",
                      accessor: (s) => `${s.lop_days}d (${formatIndianCurrency(s.lop_deduction)})`,
                    },
                    {
                      key: "overtime",
                      header: "Overtime",
                      accessor: (s) => `${s.overtime_minutes}m (${formatIndianCurrency(s.overtime_amount)})`,
                    },
                    {
                      key: "gross_salary",
                      header: "Gross",
                      accessor: (s) => formatIndianCurrency(s.gross_salary),
                    },
                    {
                      key: "deductions",
                      header: "Deductions",
                      accessor: (s) => {
                        const totalDed = Number(s.lop_deduction || 0) + Number(s.pf_deduction || 0) + Number(s.esi_deduction || 0) + Number(s.advance_deduction || 0);
                        return formatIndianCurrency(totalDed);
                      },
                    },
                    {
                      key: "net_salary",
                      header: "Net Pay",
                      sortable: true,
                      accessor: (s) => (
                        <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {formatIndianCurrency(s.net_salary)}
                        </span>
                      ),
                    },
                    {
                      key: "payment_status",
                      header: "Status",
                      accessor: (s) => (
                        <CRMBadge
                          variant={s.payment_status === "paid" ? "success" : "warning"}
                          size="sm"
                        >
                          {s.payment_status.toUpperCase()}
                        </CRMBadge>
                      ),
                    },
                  ]}
                  searchPlaceholder="Search staff payslips..."
                  pageSize={10}
                  emptyMessage="No payroll runs generated for this month. Click 'Generate Payroll' to calculate."
                />
              )}
            </div>

            {/* Mobile Cards View for Payroll Run */}
            <div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              {(hasGeneratedPreview ? previewPayslips : currentMonthPayslips).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No payroll runs generated for this month. Click &apos;Generate Payroll&apos; to calculate.
                </div>
              ) : (
                (hasGeneratedPreview
                  ? previewPayslips.map((p) => ({
                      id: p.staffId,
                      name: staffDirectory[p.staffId]?.name || p.staffId,
                      email: staffDirectory[p.staffId]?.email || "",
                      gross: p.grossSalary,
                      net: p.netSalary,
                      deductions: p.lopDeduction + p.pfDeduction + p.esiDeduction + p.advanceDeduction,
                      present: p.presentDays,
                    }))
                  : currentMonthPayslips.map((s) => ({
                      id: s.id,
                      name: s.staff_name || "Staff Member",
                      email: s.staff_email || "",
                      gross: Number(s.gross_salary || 0),
                      net: Number(s.net_salary || 0),
                      deductions: Number(s.lop_deduction || 0) + Number(s.pf_deduction || 0) + Number(s.esi_deduction || 0) + Number(s.advance_deduction || 0),
                      present: s.present_days,
                    }))
                ).map((item) => (
                  <div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</h4>
                        <p className="text-xs text-slate-400">{item.email}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                        {formatIndianCurrency(item.net)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-slate-400">Gross:</span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white">{formatIndianCurrency(item.gross)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Deductions:</span>
                        <p className="font-mono text-rose-600 dark:text-rose-400 font-semibold">{formatIndianCurrency(item.deductions)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Present:</span>
                        <p className="font-mono text-slate-700 dark:text-slate-300">{item.present}d</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: Advances & Deductions                                       */}
        {/* ================================================================== */}
        {activeTab === "adjustments" && (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <CRMDataTable<CrmSalaryAdjustment>
                data={adjustments}
                columns={[
                  {
                    key: "staff_name",
                    header: "Staff Member",
                    sortable: true,
                    accessor: (a) => <span className="font-bold text-slate-900">{a.staff_name}</span>,
                  },
                  {
                    key: "type",
                    header: "Type",
                    sortable: true,
                    accessor: (a) => {
                      const variantMap: Record<SalaryAdjustmentType, "warning" | "success" | "orange" | "info"> = {
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
                    accessor: (a) => (
                      <span className="font-mono font-bold text-slate-900">
                        {formatIndianCurrency(a.amount)}
                      </span>
                    ),
                  },
                  {
                    key: "month_year",
                    header: "Target Month",
                    accessor: (a) => a.month_year || "General",
                  },
                  {
                    key: "description",
                    header: "Description / Reason",
                    accessor: (a) => <span className="text-xs text-slate-500">{a.description || "-"}</span>,
                  },
                  {
                    key: "status",
                    header: "Status",
                    sortable: true,
                    accessor: (a) => {
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
                    accessor: (a) => {
                      if (!canApprove || a.status !== "pending") return null;
                      return (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Approve"
                            onClick={() => handleApproveAdjustment(a.id)}
                            className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                            <span className="sr-only">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Reject"
                            onClick={() => handleRejectAdjustment(a.id)}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Reject</span>
                          </Button>
                        </div>
                      );
                    },
                  },
                ]}
                searchPlaceholder="Search adjustments..."
                pageSize={10}
                emptyMessage="No advances or adjustments recorded."
              />
            </div>

            {/* Mobile Cards View for Adjustments */}
            <div className="block sm:hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              {adjustments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No advances or adjustments recorded.
                </div>
              ) : (
                adjustments.map((a) => (
                  <div key={a.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{a.staff_name}</h4>
                        <p className="text-xs text-slate-400">{a.description || a.month_year || "Adjustment"}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CRMBadge variant="warning" size="sm">
                          {a.type.toUpperCase()}
                        </CRMBadge>
                        <CRMBadge
                          variant={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}
                          size="sm"
                        >
                          {a.status.toUpperCase()}
                        </CRMBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatIndianCurrency(a.amount)}</span>
                      {canApprove && a.status === "pending" && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveAdjustment(a.id)}
                            className="min-h-[44px] h-11 px-3 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 rounded-lg"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectAdjustment(a.id)}
                            className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 rounded-lg"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: My Payslips                                                 */}
        {/* ================================================================== */}
        {activeTab === "payslips" && (
          <div className="space-y-6">
            {myPayslips.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-white dark:bg-slate-900">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  No payslips available
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
                        aria-label="Download PDF"
                        onClick={() => handleDownloadPayslip(slip)}
                        className="w-full gap-2 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </Button>
                    </div>
                  </CRMCard>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        {/* ================================================================== */}
        {/* MOBILE VIEW (< 768px): Dedicated Native Touch Experience (Mockup 1) */}
        {/* ================================================================== */}
        <div className="block md:hidden pb-24 px-3.5 pt-3 space-y-3.5 max-w-lg mx-auto">
          {/* Mobile Header */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Payroll Engine
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff compensation &amp; payroll runs
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Refresh &amp; Export Data"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8.5 h-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs flex items-center justify-center active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
                title="Refresh / Export Data"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              </button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={openCreateProfileDrawer}
                  className="h-8.5 px-3 rounded-lg gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Profile</span>
                </Button>
              )}
            </div>
          </div>

          {/* 2x2 Stat Badges */}
          <div className="grid grid-cols-2 gap-2">
            {/* Active Profiles */}
            <button
              type="button"
              onClick={() => setActiveTab("profiles")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
                activeTab === "profiles"
                  ? "border-blue-500/80 ring-1 ring-blue-500/30"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Briefcase className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Active Profiles
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {activeProfilesCount}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Current Month */}
            <button
              type="button"
              onClick={() => setActiveTab("payroll")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
                activeTab === "payroll"
                  ? "border-emerald-500/80 ring-1 ring-emerald-500/30"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Calculator className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Current Month
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums truncate">
                    {formatIndianCurrency(currentRun?.total_payout || 0)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Pending Advances */}
            <button
              type="button"
              onClick={() => setActiveTab("adjustments")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
                activeTab === "adjustments"
                  ? "border-amber-500/80 ring-1 ring-amber-500/30"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Receipt className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Pending Advances
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums truncate">
                    {formatIndianCurrency(totalPendingAdvanceAmount)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Available Payslips */}
            <button
              type="button"
              onClick={() => setActiveTab("payslips")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
                activeTab === "payslips"
                  ? "border-indigo-500/80 ring-1 ring-indigo-500/30"
                  : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Available Payslips
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {myPayslips.length || payslips.length}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>
          </div>

          {/* Segmented Tab Bar */}
          <div
            className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full overflow-x-auto scrollbar-none gap-1"
          >
            {[
              { id: "profiles", label: `Salary Profiles (${salaryProfiles.length})` },
              { id: "payroll", label: "Payroll Run" },
              { id: "adjustments", label: "Advances & Deductions" },
              { id: "payslips", label: `My Payslips (${myPayslips.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SalaryTab)}
                  className={cn(
                    "flex-1 py-1.5 px-2.5 rounded-lg text-xs text-center transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center justify-center font-medium",
                    isActive
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Salary Profiles Mobile Content */}
          {activeTab === "profiles" && (
            <div className="space-y-3">
              {salaryProfiles.length === 0 ? (
                /* Empty State Card (Mockup 1) */
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/50">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      No salary profiles configured yet.
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Create compensation structures for staff to automate payroll calculations, attendance prorations, and tax deductions.
                    </p>
                  </div>
                  {canEdit && (
                    <div className="pt-1">
                      <Button
                        size="sm"
                        onClick={openCreateProfileDrawer}
                        className="h-8.5 px-3.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Profile</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Flat divide-y list rows without bloated h-11 buttons */
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                  {salaryProfiles.map((p) => (
                    <div key={p.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{p.staff_name}</h4>
                            <CRMRolePill name={p.staff_role || "Staff"} color="#2563EB" />
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.staff_email}</p>
                        </div>
                        <CRMBadge variant={p.is_active ? "success" : "neutral"} size="sm" dot={p.is_active}>
                          {p.salary_type.toUpperCase()}
                        </CRMBadge>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div>
                          <span className="text-[11px] text-slate-400">Base Wage: </span>
                          <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {formatIndianCurrency(p.base_amount)}
                          </span>
                        </div>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditProfileDrawer(p)}
                            className="h-7 px-2.5 rounded-md text-[11px] font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            Configure
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Payroll Run Mobile Content */}
          {activeTab === "payroll" && (
            <div className="space-y-3">
              {/* Controls Card */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <label htmlFor="mobile-payroll-month" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Month
                    </label>
                    <Input
                      id="mobile-payroll-month"
                      aria-label="Month"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-8 w-36 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Working Days
                    </span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {getWorkingDaysInMonth(selectedMonth)} Days
                    </p>
                    {currentRun?.status && (
                      <CRMBadge
                        variant={
                          currentRun.status === "disbursed"
                            ? "success"
                            : currentRun.status === "locked"
                            ? "info"
                            : "warning"
                        }
                        size="sm"
                        dot
                      >
                        {currentRun.status.toUpperCase()}
                      </CRMBadge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleGeneratePayroll}
                    disabled={isCurrentRunLocked || !canApprove}
                    className="flex-1 h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs"
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1" />
                    <span>Generate</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLockPayroll}
                    disabled={isCurrentRunLocked || !canApprove || (!hasGeneratedPreview && currentMonthPayslips.length === 0)}
                    className="flex-1 h-8 px-2.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    <span>Lock</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleMarkAsDisbursed}
                    disabled={!currentRun || currentRun.status !== "locked" || !canApprove}
                    className="flex-1 h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Disburse</span>
                  </Button>
                </div>
              </div>

              {/* Warning if unconfigured staff exists */}
              {unconfiguredStaff.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Notice:</strong> {unconfiguredStaff.length} active staff member(s) missing salary profile.
                  </span>
                </div>
              )}

              {/* Summary KPI Bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Staff</span>
                  <p className="text-sm font-black font-mono text-slate-900 dark:text-white tabular-nums">{summaryTotals.totalStaff}</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Gross</span>
                  <p className="text-sm font-black font-mono text-slate-900 dark:text-white tabular-nums">{formatIndianCurrency(summaryTotals.totalGross)}</p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deductions</span>
                  <p className="text-sm font-black font-mono text-rose-600 tabular-nums">{formatIndianCurrency(summaryTotals.totalDeductions)}</p>
                </div>
                <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Total Payout</span>
                  <p className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{formatIndianCurrency(summaryTotals.totalPayout)}</p>
                </div>
              </div>

              {/* Payslip Cards List */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {(hasGeneratedPreview ? previewPayslips : currentMonthPayslips).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No payroll runs generated for this month. Click &apos;Generate&apos; to calculate.
                  </div>
                ) : (
                  (hasGeneratedPreview
                    ? previewPayslips.map((p) => ({
                        id: p.staffId,
                        staffId: p.staffId,
                        name: staffDirectory[p.staffId]?.name || p.staffId,
                        email: staffDirectory[p.staffId]?.email || "",
                        gross: p.grossSalary,
                        net: p.netSalary,
                        deductions: p.lopDeduction + p.pfDeduction + p.esiDeduction + p.advanceDeduction,
                        present: p.presentDays,
                        raw: p,
                      }))
                    : currentMonthPayslips.map((s) => ({
                        id: s.id,
                        staffId: s.staff_id,
                        name: s.staff_name || "Staff Member",
                        email: s.staff_email || "",
                        gross: Number(s.gross_salary || 0),
                        net: Number(s.net_salary || 0),
                        deductions: Number(s.lop_deduction || 0) + Number(s.pf_deduction || 0) + Number(s.esi_deduction || 0) + Number(s.advance_deduction || 0),
                        present: s.present_days,
                        raw: s,
                      }))
                  ).map((item) => {
                    const staffAdvance = adjustments
                      .filter((a) => (a.staff_id === item.staffId || a.staff_name === item.name) && a.type === "advance" && a.status === "approved")
                      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

                    return (
                      <div key={item.id} className="p-3 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{item.name}</h4>
                            <p className="text-[11px] text-slate-400 truncate">{item.email}</p>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                            {formatIndianCurrency(item.net)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <div>
                            <span className="text-slate-400">Gross: </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatIndianCurrency(item.gross)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Ded: </span>
                            <span className="font-mono text-rose-600 font-semibold">{formatIndianCurrency(item.deductions)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400">Present: </span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{item.present}d</span>
                          </div>
                        </div>
                        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60">
                          {staffAdvance > 0 ? (
                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 font-mono">
                              Advance Due: {formatIndianCurrency(staffAdvance)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">No advance due</span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const slipPayload: CrmPayslip = item.raw && "payment_status" in item.raw
                                ? (item.raw as CrmPayslip)
                                : {
                                    id: item.id,
                                    org_id: orgId || "",
                                    payroll_run_id: currentRun?.id || "preview",
                                    staff_id: item.staffId,
                                    staff_name: item.name,
                                    staff_email: item.email,
                                    month_year: targetMonthYear,
                                    salary_type: "monthly",
                                    gross_salary: item.gross,
                                    net_salary: item.net,
                                    lop_deduction: 0,
                                    pf_deduction: 0,
                                    esi_deduction: 0,
                                    advance_deduction: 0,
                                    overtime_amount: 0,
                                    bonus_amount: 0,
                                    present_days: item.present,
                                    total_days_in_month: 30,
                                    working_days_in_month: 26,
                                    payment_status: "paid",
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                  };
                              handleDownloadPayslip(slipPayload);
                            }}
                            className="min-h-[44px] h-11 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700 hover:border-blue-600 hover:text-blue-600 flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Payslip</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Advances & Deductions Mobile Content */}
          {activeTab === "adjustments" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Advances &amp; Adjustments
                </h3>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={handleOpenAdjustmentDrawer}
                    className="h-7 px-2.5 rounded-lg text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add Advance</span>
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {adjustments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No advances or adjustments recorded.
                  </div>
                ) : (
                  adjustments.map((a) => (
                    <div key={a.id} className="p-3 space-y-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{a.staff_name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{a.description || a.month_year || "Adjustment"}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <CRMBadge variant="warning" size="sm">
                            {a.type.toUpperCase()}
                          </CRMBadge>
                          <CRMBadge
                            variant={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}
                            size="sm"
                          >
                            {a.status.toUpperCase()}
                          </CRMBadge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatIndianCurrency(a.amount)}</span>
                        {canApprove && a.status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveAdjustment(a.id)}
                              className="h-7 px-2 text-[11px] text-emerald-600 border-emerald-200 dark:border-emerald-800/60 rounded-md font-medium"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectAdjustment(a.id)}
                              className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 dark:border-rose-800/60 rounded-md font-medium"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: My Payslips Mobile Content */}
          {activeTab === "payslips" && (
            <div className="space-y-3">
              {myPayslips.length === 0 ? (
                <div className="p-8 text-center border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2 bg-white dark:bg-slate-900 shadow-2xs">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                    No personal payslips issued
                  </h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Your monthly salary slips will appear here once payroll is locked and disbursed.
                  </p>
                </div>
              ) : (
                myPayslips.map((slip) => (
                  <div
                    key={slip.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {slip.month_year ? `${slip.month_year.split("-")[1]}/${slip.month_year.split("-")[0]}` : "N/A"}
                      </span>
                      <CRMBadge
                        variant={slip.payment_status === "paid" ? "success" : "warning"}
                        size="sm"
                        dot={slip.payment_status === "paid"}
                      >
                        {slip.payment_status.toUpperCase()}
                      </CRMBadge>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Net Take-Home Pay</span>
                      <span className="text-base font-black font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatIndianCurrency(slip.net_salary)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400">Gross: </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatIndianCurrency(slip.gross_salary)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Present: </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{slip.present_days} / {slip.working_days_in_month}d</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="Export Payslip"
                      onClick={() => handleDownloadPayslip(slip)}
                      className="w-full h-8 gap-1.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Payslip</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quick Actions Footer (Mockup 1) */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("payroll")}
              className="h-9 min-h-[44px] px-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>View Past Runs</span>
            </button>
            <button
              type="button"
              onClick={openCreateProfileDrawer}
              className="h-9 min-h-[44px] px-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Pay Settings</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* Slide-over Drawer: Add / Configure Salary Profile                  */}
        {/* ================================================================== */}
        <Sheet open={isProfileDrawerOpen} onOpenChange={setIsProfileDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto space-y-6">
            <SheetHeader>
              <SheetTitle>
                {profileDrawerMode === "create" ? "New Salary Profile" : "Configure Salary Profile"}
              </SheetTitle>
              <SheetDescription>
                Configure compensation model, base remuneration, statutory deductions, and leave policy.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-2">
              {/* Staff Member Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-staff" className="text-xs font-semibold">
                  Select Staff
                </Label>
                {profileDrawerMode === "create" ? (
                  <select
                    id="profile-staff"
                    aria-label="Select Staff"
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {Object.values(staffDirectory).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleName})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="font-bold text-sm text-slate-900">{staffDirectory[formStaffId]?.name || formStaffId}</p>
                    <p className="text-xs text-slate-500">{staffDirectory[formStaffId]?.email}</p>
                  </div>
                )}
              </div>

              {/* Salary Type */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-type" className="text-xs font-semibold">
                  Salary Type
                </Label>
                <select
                  id="profile-type"
                  aria-label="Salary Type"
                  value={formSalaryType}
                  onChange={(e) => setFormSalaryType(e.target.value as SalaryType)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="monthly">Monthly Fixed</option>
                  <option value="daily">Daily Wage</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>

              {/* Base Salary Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-base" className="text-xs font-semibold">
                  Base Salary
                </Label>
                <Input
                  id="profile-base"
                  aria-label="Base Salary"
                  type="number"
                  placeholder="50000"
                  value={formBaseAmount}
                  onChange={(e) => setFormBaseAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Allowed Leaves per Month */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-leaves" className="text-xs font-semibold">
                  Allowed Leaves / Month
                </Label>
                <Input
                  id="profile-leaves"
                  aria-label="Allowed Leaves"
                  type="number"
                  min="0"
                  max="31"
                  placeholder="2"
                  value={formAllowedLeaves}
                  onChange={(e) => setFormAllowedLeaves(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Hourly Overtime Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="profile-overtime" className="text-xs font-semibold">
                  Hourly Overtime Rate (₹)
                </Label>
                <Input
                  id="profile-overtime"
                  aria-label="Hourly Overtime Rate"
                  type="number"
                  min="0"
                  placeholder="300"
                  value={formOvertimeRate}
                  onChange={(e) => setFormOvertimeRate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Statutory Deductions: PF & ESI */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-pf" className="text-xs font-semibold">
                    PF Deduction %
                  </Label>
                  <Input
                    id="profile-pf"
                    aria-label="PF Deduction %"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="12"
                    value={formPfPercent}
                    onChange={(e) => setFormPfPercent(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-esi" className="text-xs font-semibold">
                    ESI Deduction %
                  </Label>
                  <Input
                    id="profile-esi"
                    aria-label="ESI Deduction %"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="1.75"
                    value={formEsiPercent}
                    onChange={(e) => setFormEsiPercent(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800">Profile Active</span>
                  <p className="text-[11px] text-slate-500">Include in regular monthly payroll cycles</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>

            <SheetFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileDrawerOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                className="text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                Save Profile
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* ================================================================== */}
        {/* Slide-over Drawer: Record Advance / Adjustment                     */}
        {/* ================================================================== */}
        <Sheet open={isAdjustmentDrawerOpen} onOpenChange={setIsAdjustmentDrawerOpen}>
          <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto space-y-6">
            <SheetHeader>
              <SheetTitle>Record Advance or Adjustment</SheetTitle>
              <SheetDescription>
                Record emergency staff advances, incentives, or deductions to reconcile during monthly payroll.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-2">
              {/* Staff Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-staff" className="text-xs font-semibold">
                  Staff Member
                </Label>
                <select
                  id="adj-staff"
                  aria-label="Staff Member"
                  value={formAdjStaffId}
                  onChange={(e) => setFormAdjStaffId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {Object.values(staffDirectory).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.roleName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-type" className="text-xs font-semibold">
                  Adjustment Type
                </Label>
                <select
                  id="adj-type"
                  aria-label="Adjustment Type"
                  value={formAdjType}
                  onChange={(e) => setFormAdjType(e.target.value as SalaryAdjustmentType)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="advance">Salary Advance</option>
                  <option value="bonus">Performance Bonus</option>
                  <option value="deduction">Disciplinary / Loss Deduction</option>
                  <option value="loan_repayment">Loan Repayment</option>
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-amount" className="text-xs font-semibold">
                  Amount (₹)
                </Label>
                <Input
                  id="adj-amount"
                  aria-label="Amount"
                  type="number"
                  placeholder="5000"
                  value={formAdjAmount}
                  onChange={(e) => setFormAdjAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Target Month */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-month" className="text-xs font-semibold">
                  Target Payroll Month
                </Label>
                <Input
                  id="adj-month"
                  aria-label="Target Month"
                  type="month"
                  value={formAdjMonth}
                  onChange={(e) => setFormAdjMonth(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="adj-desc" className="text-xs font-semibold">
                  Description / Justification
                </Label>
                <Textarea
                  id="adj-desc"
                  aria-label="Description"
                  placeholder="Reason for advance or bonus..."
                  value={formAdjDescription}
                  onChange={(e) => setFormAdjDescription(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <SheetFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentDrawerOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAdjustment}
                className="text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                Record Advance
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </CRMPermissionGate>
  );
}
