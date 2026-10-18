import {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  business_type?: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  logo_url?: string | null;
  upi_id?: string | null;
  pan_number?: string | null;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface OrganizationMembership {
  id?: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at?: string;
  organizations?: Organization | null;
  profiles?: Profile | null;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface StaffInvitation {
  id: string;
  organization_id: string;
  email: string;
  phone?: string | null;
  role: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  token?: string;
  invited_by?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface StorefrontSettings {
  id?: string;
  organization_id: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  store_name?: string | null;
  tagline?: string | null;
  banner_url?: string | null;
  theme_color?: string | null;
  whatsapp_number?: string | null;
  is_active?: boolean;
  min_order_amount?: number;
  delivery_charge?: number;
  free_delivery_above?: number;
  allow_cod?: boolean;
  allow_online_payment?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface StorefrontOrder {
  id: string;
  organization_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string | null;
  total_amount: number;
  items: unknown;
  status: string;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AuditLog {
  id?: string;
  organization_id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATIONS & MEMBERSHIPS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrganizationById(
  id: string
): Promise<ApiResponse<Organization>> {
  return apiGet<Organization>(`/organizations/${id}`);
}

export async function getUserOrganizations(): Promise<ApiResponse<Organization[]>> {
  return apiGet<Organization[]>("/organizations");
}

export async function createOrganization(
  payload: Partial<Organization>
): Promise<ApiResponse<Organization>> {
  return apiPost<Organization>("/organizations", payload);
}

export async function updateOrganization(
  id: string,
  payload: Partial<Organization>
): Promise<ApiResponse<Organization>> {
  return apiPut<Organization>(`/organizations/${id}`, payload, {
    organizationId: id,
  });
}

export async function getMemberships(
  orgId?: string,
  userId?: string
): Promise<ApiResponse<OrganizationMembership[]>> {
  return apiGet<OrganizationMembership[]>(
    "/organization-memberships",
    {
      ...(orgId ? { organization_id: orgId } : {}),
      ...(userId ? { user_id: userId } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createMembership(
  payload: Partial<OrganizationMembership>,
  orgId?: string
): Promise<ApiResponse<OrganizationMembership>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<OrganizationMembership>("/organization-memberships", payload, {
    organizationId: effectiveOrg,
  });
}

export async function upsertMembership(
  payload: Partial<OrganizationMembership>,
  orgId?: string
): Promise<ApiResponse<OrganizationMembership>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<OrganizationMembership>("/organization-memberships/upsert", payload, {
    organizationId: effectiveOrg,
  });
}

export async function updateMembership(
  id: string,
  payload: Partial<OrganizationMembership>,
  orgId?: string
): Promise<ApiResponse<OrganizationMembership>> {
  return apiPut<OrganizationMembership>(`/organization-memberships/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function deleteMembership(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/organization-memberships/${id}`, {
    organizationId: orgId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILES API
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfileById(userId: string): Promise<ApiResponse<Profile>> {
  return apiGet<Profile>(`/profiles/${userId}`);
}

export async function getProfiles(options?: {
  ids?: string[];
  search?: string;
  limit?: number;
}): Promise<ApiResponse<Profile[]>> {
  return apiGet<Profile[]>("/profiles", {
    ...(options?.ids ? { ids: options.ids.join(",") } : {}),
    ...(options?.search ? { search: options.search } : {}),
    ...(options?.limit ? { limit: options.limit } : {}),
  });
}

export async function updateProfile(
  userId: string,
  payload: Partial<Profile>
): Promise<ApiResponse<Profile>> {
  return apiPut<Profile>(`/profiles/${userId}`, payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS / GODOWNS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getLocations(
  orgId: string
): Promise<ApiResponse<Location[]>> {
  return apiGet<Location[]>("/locations", { organization_id: orgId }, { organizationId: orgId });
}

export async function createLocation(
  payload: Partial<Location>,
  orgId?: string
): Promise<ApiResponse<Location>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<Location>("/locations", { ...payload, organization_id: effectiveOrg }, { organizationId: effectiveOrg });
}

export async function updateLocation(
  id: string,
  payload: Partial<Location>,
  orgId?: string
): Promise<ApiResponse<Location>> {
  return apiPut<Location>(`/locations/${id}`, payload, { organizationId: orgId });
}

export async function deleteLocation(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/locations/${id}`, { organizationId: orgId });
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF INVITATIONS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getStaffInvitations(
  orgId: string
): Promise<ApiResponse<StaffInvitation[]>> {
  return apiGet<StaffInvitation[]>(
    "/staff-invitations",
    { organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function createStaffInvitation(
  payload: Partial<StaffInvitation>,
  orgId?: string
): Promise<ApiResponse<StaffInvitation>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<StaffInvitation>(
    "/staff-invitations",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateStaffInvitation(
  id: string,
  payload: Partial<StaffInvitation>,
  orgId?: string
): Promise<ApiResponse<StaffInvitation>> {
  return apiPut<StaffInvitation>(`/staff-invitations/${id}`, payload, {
    organizationId: orgId,
  });
}

export async function deleteStaffInvitation(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/staff-invitations/${id}`, {
    organizationId: orgId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STOREFRONT SETTINGS & ORDERS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getStorefrontSettings(
  orgId: string
): Promise<ApiResponse<StorefrontSettings>> {
  return apiGet<StorefrontSettings>(
    "/storefront-settings",
    { organization_id: orgId },
    { organizationId: orgId }
  );
}

export async function upsertStorefrontSettings(
  payload: Partial<StorefrontSettings>,
  orgId?: string
): Promise<ApiResponse<StorefrontSettings>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<StorefrontSettings>(
    "/storefront-settings",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function getStorefrontOrders(
  orgId: string,
  options?: { limit?: number; status?: string }
): Promise<ApiResponse<StorefrontOrder[]>> {
  return apiGet<StorefrontOrder[]>(
    "/storefront-orders",
    {
      organization_id: orgId,
      ...(options?.limit ? { limit: options.limit } : {}),
      ...(options?.status ? { status: options.status } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createStorefrontOrder(
  payload: Partial<StorefrontOrder>,
  orgId?: string
): Promise<ApiResponse<StorefrontOrder>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<StorefrontOrder>(
    "/storefront-orders",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateStorefrontOrder(
  id: string,
  payload: Partial<StorefrontOrder>,
  orgId?: string
): Promise<ApiResponse<StorefrontOrder>> {
  return apiPut<StorefrontOrder>(`/storefront-orders/${id}`, payload, {
    organizationId: orgId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS API
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditLogs(
  orgId: string,
  options?: { limit?: number; offset?: number }
): Promise<ApiResponse<AuditLog[]>> {
  return apiGet<AuditLog[]>(
    "/audit-logs",
    {
      organization_id: orgId,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      ...(options?.offset !== undefined ? { offset: options.offset } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createAuditLog(
  payload: Partial<AuditLog>,
  orgId?: string
): Promise<ApiResponse<AuditLog>> {
  const effectiveOrg = payload.organization_id || orgId;
  return apiPost<AuditLog>(
    "/audit-logs",
    { ...payload, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC PAIRING TOKENS API
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertSyncPairingToken(payload: {
  organization_id: string;
  user_id: string;
  token_hash: string;
  active: boolean;
}): Promise<ApiResponse<{ success: boolean }>> {
  return apiPost<{ success: boolean }>("/sync/pairing-tokens", payload, {
    organizationId: payload.organization_id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL SETTINGS API NAMESPACE
// ─────────────────────────────────────────────────────────────────────────────

export const settingsApi = {
  getOrganizationById,
  getUserOrganizations,
  createOrganization,
  updateOrganization,
  getMemberships,
  createMembership,
  upsertMembership,
  updateMembership,
  deleteMembership,
  getProfileById,
  getProfiles,
  updateProfile,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getStaffInvitations,
  createStaffInvitation,
  updateStaffInvitation,
  deleteStaffInvitation,
  getStorefrontSettings,
  upsertStorefrontSettings,
  getStorefrontOrders,
  createStorefrontOrder,
  updateStorefrontOrder,
  getAuditLogs,
  createAuditLog,
  upsertSyncPairingToken,
};

export default settingsApi;
