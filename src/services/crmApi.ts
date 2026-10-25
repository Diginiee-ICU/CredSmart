import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface CRMRole {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
  created_at?: string;
  crm_role_permissions?: {
    permission_id: string;
    crm_permissions?: CRMPermission;
  }[];
  [key: string]: unknown;
}

export interface CRMPermission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  module: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface CRMStaffRole {
  id?: string;
  organization_id?: string;
  user_id?: string;
  staff_id?: string;
  role_id: string;
  assigned_by?: string | null;
  assigned_at?: string;
  created_at?: string;
  crm_roles?: CRMRole | null;
  [key: string]: unknown;
}

export interface CRMStaffMember {
  id: string;
  user_id?: string;
  staff_id?: string;
  email: string;
  full_name: string;
  name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  store_role?: string;
  role?: string;
  membership_id?: string;
  crm_role_id?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  crm_role_name?: string | null;
  crm_role_color?: string | null;
  crm_role_icon?: string | null;
  is_super_admin?: boolean;
  assigned_at?: string;
  [key: string]: unknown;
}

export interface CRMGeolocation {
  id: string;
  organization_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface CRMAttendance {
  id: string;
  organization_id: string;
  user_id: string;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: "present" | "absent" | "half_day" | "late" | "leave" | "holiday";
  work_duration_minutes?: number | null;
  overtime_minutes?: number | null;
  notes?: string | null;
  verified_by?: string | null;
  created_at?: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface CRMAttendanceRequest {
  id: string;
  organization_id: string;
  user_id: string;
  date: string;
  request_type: "missed_checkin" | "missed_checkout" | "leave" | "correction";
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface CRMSalaryProfile {
  id?: string;
  organization_id: string;
  user_id: string;
  base_salary: number;
  salary_type: "monthly" | "daily" | "hourly";
  hra?: number;
  da?: number;
  special_allowance?: number;
  provident_fund?: number;
  professional_tax?: number;
  tds?: number;
  effective_from?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CRMPayrollRun {
  id?: string;
  organization_id: string;
  month: number;
  year: number;
  total_gross?: number;
  total_deductions?: number;
  total_net?: number;
  total_employees?: number;
  status: "draft" | "processed" | "paid";
  processed_by?: string | null;
  processed_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface CRMPayslip {
  id?: string;
  payroll_run_id?: string | null;
  organization_id: string;
  user_id: string;
  month: number;
  year: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  earnings?: Record<string, number> | null;
  deductions?: Record<string, number> | null;
  status: "pending" | "paid" | "held";
  payment_date?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface CRMSalaryAdjustment {
  id?: string;
  organization_id: string;
  user_id: string;
  type: "bonus" | "incentive" | "reimbursement" | "penalty" | "advance_deduction";
  amount: number;
  month: number;
  year: number;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface ProvisionStaffPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  store_role?: string;
  role?: string;
  crm_role_id?: string | null;
  organization_id?: string;
  org_id?: string;
}

export interface ProvisionStaffResponse {
  success: boolean;
  message?: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    store_role: string;
    crm_role_id?: string | null;
    crm_role_name?: string | null;
    crm_role_color?: string | null;
    crm_role_icon?: string | null;
  };
  credentials: {
    email: string;
    password: string;
  };
}

export type CRMTaskStatus = "todo" | "in_progress" | "review" | "done";
export type CRMTaskPriority = "urgent" | "high" | "normal" | "low";

export interface CRMTask {
  id: string;
  org_id: string;
  organization_id?: string;
  title: string;
  description: string;
  priority: CRMTaskPriority;
  status: CRMTaskStatus;
  assigned_to?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  assignee_avatar_url?: string | null;
  assigned_by?: string | null;
  creator_name?: string | null;
  due_date?: string | null;
  requires_proof: boolean;
  proof_required?: boolean;
  proof_notes?: string | null;
  completed_at?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  approved_at?: string | null;
  review_feedback?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CRMTaskFilters {
  status?: CRMTaskStatus | CRMTaskStatus[] | string;
  priority?: CRMTaskPriority | CRMTaskPriority[] | string;
  assigned_to?: string;
  assignee_id?: string;
  search?: string;
  organization_id?: string;
  org_id?: string;
}

export interface CreateCRMTaskPayload {
  title: string;
  description?: string;
  priority?: CRMTaskPriority;
  status?: CRMTaskStatus;
  assigned_to?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  requires_proof?: boolean;
  proof_required?: boolean;
  proof_notes?: string | null;
  organization_id?: string;
  org_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM ROLES & PERMISSIONS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getCRMRoles(
  orgId: string
): Promise<ApiResponse<CRMRole[]>> {
  return apiGet<CRMRole[]>(
    "/crm/roles",
    { organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function createCRMRole(
  payload: Partial<CRMRole>,
  orgId?: string
): Promise<ApiResponse<CRMRole>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMRole>(
    "/crm/roles",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMRole(
  id: string,
  payload: Partial<CRMRole>,
  orgId?: string
): Promise<ApiResponse<CRMRole>> {
  return apiPut<CRMRole>(`/crm/roles/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function deleteCRMRole(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/roles/${id}`, {
    organizationId: orgId,
  });
}

export async function getCRMPermissions(options?: {
  roleId?: string;
  role_id?: string;
  roleIds?: string[];
  role_ids?: string[];
}): Promise<ApiResponse<CRMPermission[]>> {
  const roleId = options?.roleId || options?.role_id;
  const roleIds = options?.roleIds || options?.role_ids;
  return apiGet<CRMPermission[]>("/crm/permissions", {
    ...(roleId ? { role_id: roleId } : {}),
    ...(roleIds && roleIds.length > 0 ? { role_ids: roleIds.join(",") } : {}),
  });
}

export async function getCRMStaff(
  orgId: string,
  userId?: string
): Promise<ApiResponse<CRMStaffMember[]>> {
  return apiGet<CRMStaffMember[]>(
    "/crm/staff",
    {
      organization_id: orgId,
      ...(userId ? { user_id: userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function getCRMStaffRoles(
  orgId: string,
  userId?: string
): Promise<ApiResponse<CRMStaffRole[]>> {
  return apiGet<CRMStaffRole[]>(
    "/crm/staff-roles",
    {
      organization_id: orgId,
      ...(userId ? { user_id: userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function assignCRMStaffRole(
  payload: Partial<CRMStaffRole>,
  orgId?: string
): Promise<ApiResponse<CRMStaffRole>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMStaffRole>(
    "/crm/staff-roles",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function deleteCRMStaffRole(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/staff-roles/${id}`, {
    organizationId: orgId,
  });
}

export async function deleteCRMPermissionsByRoleId(
  roleId: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/permissions?role_id=${roleId}`, {
    organizationId: orgId,
  });
}

export async function insertCRMPermissions(
  permissions: Record<string, unknown>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/crm/permissions/bulk",
    { permissions, organization_id: orgId },
    { organizationId: orgId }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM GEOLOCATIONS & ATTENDANCE API
// ─────────────────────────────────────────────────────────────────────────────

export async function getCRMGeolocations(
  orgId: string
): Promise<ApiResponse<CRMGeolocation[]>> {
  return apiGet<CRMGeolocation[]>(
    "/crm/geolocations",
    { organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function createCRMGeolocation(
  payload: Partial<CRMGeolocation>,
  orgId?: string
): Promise<ApiResponse<CRMGeolocation>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMGeolocation>(
    "/crm/geolocations",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMGeolocation(
  id: string,
  payload: Partial<CRMGeolocation>,
  orgId?: string
): Promise<ApiResponse<CRMGeolocation>> {
  return apiPut<CRMGeolocation>(`/crm/geolocations/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function deleteCRMGeolocation(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/geolocations/${id}`, {
    organizationId: orgId,
  });
}

export async function getCRMAttendance(
  orgId: string,
  options?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
  }
): Promise<ApiResponse<CRMAttendance[]>> {
  return apiGet<CRMAttendance[]>(
    "/crm/attendance",
    {
      organization_id: orgId,
      ...(options?.userId ? { user_id: options.userId } : {}),
      ...(options?.startDate ? { start_date: options.startDate } : {}),
      ...(options?.endDate ? { end_date: options.endDate } : {}),
      ...(options?.date ? { date: options.date } : {}),
    },
    { organizationId: orgId }
  );
}

export async function recordCRMAttendance(
  payload: Partial<CRMAttendance>,
  orgId?: string
): Promise<ApiResponse<CRMAttendance>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMAttendance>(
    "/crm/attendance",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMAttendance(
  id: string,
  payload: Partial<CRMAttendance>,
  orgId?: string
): Promise<ApiResponse<CRMAttendance>> {
  return apiPut<CRMAttendance>(`/crm/attendance/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function getCRMAttendanceRequests(
  orgId: string,
  options?: { userId?: string; status?: string }
): Promise<ApiResponse<CRMAttendanceRequest[]>> {
  return apiGet<CRMAttendanceRequest[]>(
    "/crm/attendance-requests",
    {
      organization_id: orgId,
      ...(options?.userId ? { user_id: options.userId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createCRMAttendanceRequest(
  payload: Partial<CRMAttendanceRequest>,
  orgId?: string
): Promise<ApiResponse<CRMAttendanceRequest>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMAttendanceRequest>(
    "/crm/attendance-requests",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMAttendanceRequest(
  id: string,
  payload: Partial<CRMAttendanceRequest>,
  orgId?: string
): Promise<ApiResponse<CRMAttendanceRequest>> {
  return apiPut<CRMAttendanceRequest>(`/crm/attendance-requests/${id}`, payload, {
    organizationId: orgId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM SALARY & PAYROLL API
// ─────────────────────────────────────────────────────────────────────────────

export async function getCRMSalaryProfiles(
  orgId: string,
  userId?: string
): Promise<ApiResponse<CRMSalaryProfile[]>> {
  return apiGet<CRMSalaryProfile[]>(
    "/crm/salary-profiles",
    {
      organization_id: orgId,
      ...(userId ? { user_id: userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function upsertCRMSalaryProfile(
  payload: Partial<CRMSalaryProfile>,
  orgId?: string
): Promise<ApiResponse<CRMSalaryProfile>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMSalaryProfile>(
    "/crm/salary-profiles",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function getCRMPayrollRuns(
  orgId: string,
  options?: { month?: number; year?: number }
): Promise<ApiResponse<CRMPayrollRun[]>> {
  return apiGet<CRMPayrollRun[]>(
    "/crm/payroll-runs",
    {
      organization_id: orgId,
      ...(options?.month ? { month: options.month } : {}),
      ...(options?.year ? { year: options.year } : {}),
    },
    { organizationId: orgId }
  );
}

export async function upsertCRMPayrollRun(
  payload: Partial<CRMPayrollRun>,
  orgId?: string
): Promise<ApiResponse<CRMPayrollRun>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMPayrollRun>(
    "/crm/payroll-runs",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function getCRMPayslips(
  orgId: string,
  options?: { month?: number; year?: number; userId?: string }
): Promise<ApiResponse<CRMPayslip[]>> {
  return apiGet<CRMPayslip[]>(
    "/crm/payslips",
    {
      organization_id: orgId,
      ...(options?.month ? { month: options.month } : {}),
      ...(options?.year ? { year: options.year } : {}),
      ...(options?.userId ? { user_id: options.userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function upsertCRMPayslips(
  items: Partial<CRMPayslip>[],
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPost<{ success: boolean; count?: number }>(
    "/crm/payslips/bulk",
    { items, organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function getCRMSalaryAdjustments(
  orgId: string,
  options?: { month?: number; year?: number; userId?: string }
): Promise<ApiResponse<CRMSalaryAdjustment[]>> {
  return apiGet<CRMSalaryAdjustment[]>(
    "/crm/salary-adjustments",
    {
      organization_id: orgId,
      ...(options?.month ? { month: options.month } : {}),
      ...(options?.year ? { year: options.year } : {}),
      ...(options?.userId ? { user_id: options.userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createCRMSalaryAdjustment(
  payload: Partial<CRMSalaryAdjustment>,
  orgId?: string
): Promise<ApiResponse<CRMSalaryAdjustment>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<CRMSalaryAdjustment>(
    "/crm/salary-adjustments",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function deleteCRMSalaryAdjustment(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/salary-adjustments/${id}`, {
    organizationId: orgId,
  });
}

export async function updateCRMSalaryAdjustment(
  id: string,
  payload: Partial<CRMSalaryAdjustment>,
  orgId?: string
): Promise<ApiResponse<CRMSalaryAdjustment>> {
  return apiPut<CRMSalaryAdjustment>(`/crm/salary-adjustments/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function updateCRMPayrollRun(
  idOrMonthYear: string,
  payload: Partial<CRMPayrollRun>,
  orgId?: string
): Promise<ApiResponse<CRMPayrollRun>> {
  return apiPut<CRMPayrollRun>(`/crm/payroll-runs/${idOrMonthYear}`, payload, {
    organizationId: orgId,
  });
}

export async function updateCRMPayslips(
  filter: { monthYear?: string; month?: number; year?: number },
  payload: Partial<CRMPayslip>,
  orgId?: string
): Promise<ApiResponse<{ success: boolean; count?: number }>> {
  return apiPut<{ success: boolean; count?: number }>(
    "/crm/payslips",
    { ...payload, ...filter, organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function getCRMDashboardCounts(orgId: string): Promise<ApiResponse<{
  tasks: number;
  broadcasts: number;
  meetings: number;
}>> {
  return apiGet<{
    tasks: number;
    broadcasts: number;
    meetings: number;
  }>("/crm/dashboard-counts", { organization_id: orgId }, { organizationId: orgId });
}

export const upsertCRMAttendance = recordCRMAttendance;

// ─────────────────────────────────────────────────────────────────────────────
// CRM STAFF PROVISIONING & TASKS API
// ─────────────────────────────────────────────────────────────────────────────

export async function provisionStaffUser(
  payload: ProvisionStaffPayload,
  orgId?: string
): Promise<ApiResponse<ProvisionStaffResponse>> {
  const effectiveOrg = payload.organization_id || payload.org_id || orgId;
  return apiPost<ProvisionStaffResponse>(
    "/crm/staff/provision",
    { ...payload, organization_id: effectiveOrg, org_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function getCRMTasks(
  orgId: string,
  filters?: CRMTaskFilters
): Promise<ApiResponse<CRMTask[]>> {
  const params: Record<string, string> = {
    organization_id: orgId,
  };

  if (filters?.status) {
    params.status = Array.isArray(filters.status) ? filters.status.join(",") : filters.status;
  }
  if (filters?.priority) {
    params.priority = Array.isArray(filters.priority) ? filters.priority.join(",") : filters.priority;
  }
  const assignedTo = filters?.assigned_to || filters?.assignee_id;
  if (assignedTo) {
    params.assigned_to = assignedTo;
  }
  if (filters?.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }

  return apiGet<CRMTask[]>("/crm/tasks", params, { organizationId: orgId });
}

export async function createCRMTask(
  payload: CreateCRMTaskPayload,
  orgId?: string
): Promise<ApiResponse<CRMTask>> {
  const effectiveOrg = payload.organization_id || payload.org_id || orgId;
  return apiPost<CRMTask>(
    "/crm/tasks",
    { ...payload, organization_id: effectiveOrg, org_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMTask(
  id: string,
  payload: Partial<CreateCRMTaskPayload> & {
    review_feedback?: string | null;
    completed_at?: string | null;
    approved_by?: string | null;
    status?: CRMTaskStatus;
  },
  orgId?: string
): Promise<ApiResponse<CRMTask>> {
  const effectiveOrg = payload.organization_id || payload.org_id || orgId;
  return apiPatch<CRMTask>(
    `/crm/tasks/${id}`,
    { ...payload, organization_id: effectiveOrg, org_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function transitionCRMTaskStatus(
  id: string,
  status: CRMTaskStatus,
  details?: { proof_notes?: string; review_feedback?: string; orgId?: string }
): Promise<ApiResponse<CRMTask>> {
  return apiPatch<CRMTask>(
    `/crm/tasks/${id}`,
    {
      status,
      ...(details?.proof_notes !== undefined ? { proof_notes: details.proof_notes } : {}),
      ...(details?.review_feedback !== undefined ? { review_feedback: details.review_feedback } : {}),
    },
    { organizationId: details?.orgId }
  );
}

export async function deleteCRMTask(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/tasks/${id}`, {
    organizationId: orgId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL CRM API NAMESPACE
// ─────────────────────────────────────────────────────────────────────────────

export const crmApi = {
  getCRMRoles,
  createCRMRole,
  updateCRMRole,
  deleteCRMRole,
  getCRMPermissions,
  deleteCRMPermissionsByRoleId,
  insertCRMPermissions,
  getCRMStaff,
  getCRMStaffRoles,
  assignCRMStaffRole,
  deleteCRMStaffRole,
  provisionStaffUser,
  getCRMTasks,
  createCRMTask,
  updateCRMTask,
  transitionCRMTaskStatus,
  deleteCRMTask,
  getCRMGeolocations,
  createCRMGeolocation,
  updateCRMGeolocation,
  deleteCRMGeolocation,
  getCRMAttendance,
  recordCRMAttendance,
  upsertCRMAttendance,
  updateCRMAttendance,
  getCRMAttendanceRequests,
  createCRMAttendanceRequest,
  updateCRMAttendanceRequest,
  getCRMSalaryProfiles,
  upsertCRMSalaryProfile,
  getCRMPayrollRuns,
  upsertCRMPayrollRun,
  updateCRMPayrollRun,
  getCRMPayslips,
  upsertCRMPayslips,
  updateCRMPayslips,
  getCRMSalaryAdjustments,
  createCRMSalaryAdjustment,
  updateCRMSalaryAdjustment,
  deleteCRMSalaryAdjustment,
  getCRMDashboardCounts,
};

export default crmApi;
