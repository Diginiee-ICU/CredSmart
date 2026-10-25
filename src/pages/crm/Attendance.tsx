import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  Timer,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  Compass,
  Crosshair,
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  UserX,
  HelpCircle,
  Check,
  X,
  Radio,
  Eye,
  Edit3,
  Trash2,
  Shield,
  Layers,
  ChevronRight,
  Send,
  Sparkles,
} from "lucide-react";
import {
  generateAttendanceReportPDF,
  exportAttendanceCSV,
} from "@/utils/crmAttendancePdf";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  useCRMPermission,
  type CRMRole,
} from "@/hooks/useCRMPermission";
import { settingsApi } from "@/services/settingsApi";
import { crmApi } from "@/services/crmApi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  calculateHaversineDistance,
  isWithinGeofence,
  findNearestGeofence,
  getCurrentPosition,
  type CoordinatesResult,
  type NearestGeofenceResult,
} from "@/utils/crmGeoUtils";
import type {
  CRMGeolocation,
  CRMAttendanceRecord,
  CRMAttendanceRequest,
  AttendanceStatus,
  AttendanceVerificationMethod,
  AttendanceRequestStatus,
} from "@/types/crmAttendance";

// ============================================================================
// Types & Helper Interfaces
// ============================================================================

interface StaffProfileInfo {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleColor: string;
  isSuperAdmin?: boolean;
}

const DEFAULT_SHIFT_TARGET_MINUTES = 480; // 8-hour shift standard
const STORAGE_GEOFENCES_PREFIX = "credsmart_crm_geolocations_";
const STORAGE_ATTENDANCE_PREFIX = "credsmart_crm_attendance_";
const STORAGE_REQUESTS_PREFIX = "credsmart_crm_attendance_requests_";
const STORAGE_ROLES_PREFIX = "credsmart_crm_roles_";

function formatSecondsToHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatMinutesToHM(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatTimeDisplay(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "-";
  }
}

function formatDateDisplay(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateString;
  }
}

// ============================================================================
// Main Attendance Component
// ============================================================================

export default function Attendance(): React.ReactElement {
  const { user } = useAuth();
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin, loading: permissionLoading } = useCRMPermission("attendance");

  const canView = isSuperAdmin || hasPermission("attendance", "view");
  const canEdit = isSuperAdmin || hasPermission("attendance", "edit");

  const effectiveOrgId = orgId || "default_org";
  const effectiveUserId = user?.id || "anonymous_user";
  const todayDateStr = new Date().toISOString().split("T")[0];

  // Active view tab (responsive support: Staff Clock-In vs Admin Oversight vs Locations vs Requests)
  const [activeTab, setActiveTab] = useState<"pod" | "logs" | "geofences" | "requests">("pod");

  // Data states with synchronous initial hydration from localStorage & default fallback
  const [geofences, setGeofences] = useState<CRMGeolocation[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_GEOFENCES_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        id: "geo-hq-default",
        org_id: effectiveOrgId,
        name: org?.name ? `${org.name} HQ` : "Main Office / HQ",
        latitude: 28.6139,
        longitude: 77.2090,
        radius_meters: 150,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<CRMAttendanceRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_ATTENDANCE_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const [requests, setRequests] = useState<CRMAttendanceRequest[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_REQUESTS_PREFIX}${effectiveOrgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  const [staffProfiles, setStaffProfiles] = useState<Record<string, StaffProfileInfo>>({});
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Live Clock & Session Timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live GPS Radar & Status
  const [currentCoords, setCurrentCoords] = useState<CoordinatesResult | null>(null);
  const [nearestGeofence, setNearestGeofence] = useState<NearestGeofenceResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "inside" | "outside" | "error">("idle");
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState<boolean>(false);
  const [editingGeofence, setEditingGeofence] = useState<CRMGeolocation | null>(null);
  const [geofenceForm, setGeofenceForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: "150",
    is_active: true,
  });
  const [isCapturingOfficeGps, setIsCapturingOfficeGps] = useState<boolean>(false);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [requestForm, setRequestForm] = useState({
    attendance_id: "",
    date: new Date().toISOString().split("T")[0],
    requested_clock_in: "09:00",
    requested_clock_out: "18:00",
    requested_status: "present" as AttendanceStatus,
    reason: "",
  });

  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<CRMAttendanceRecord | null>(null);

  // Table Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [crmRoleNames, setCrmRoleNames] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const cached =
        localStorage.getItem(`${STORAGE_ROLES_PREFIX}${effectiveOrgId}`) ||
        localStorage.getItem(`credsmart_crm_roles_${effectiveOrgId}`) ||
        localStorage.getItem("credsmart_crm_roles");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed
              .map((r: unknown) => (typeof r === "string" ? r : (r && typeof r === "object" && "name" in r ? String((r as { name: unknown }).name) : "")))
              .filter((n: string) => typeof n === "string" && Boolean(n.trim()));
          }
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // 1. Live Digital Clock updating every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Identify Current User's Today Record
  const todayRecord = useMemo(() => {
    return attendanceRecords.find(
      (r) => r.staff_id === effectiveUserId && r.date === todayDateStr
    ) || null;
  }, [attendanceRecords, effectiveUserId, todayDateStr]);

  // 3. Live Elapsed Work Timer for Active Session
  useEffect(() => {
    if (!todayRecord || !todayRecord.clock_in || todayRecord.clock_out) {
      setElapsedSeconds(0);
      return;
    }

    const computeElapsed = () => {
      const clockInTime = new Date(todayRecord.clock_in!).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - clockInTime) / 1000));
      setElapsedSeconds(diffSecs);
    };

    computeElapsed();
    const interval = setInterval(computeElapsed, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  // 4. Initial Geolocation Acquisition & Continuous Radar Sync
  const refreshLocation = useCallback(async () => {
    setGpsStatus("acquiring");
    setGpsErrorMsg(null);
    try {
      const coords = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
      setCurrentCoords(coords);

      const nearest = findNearestGeofence(coords.latitude, coords.longitude, geofences);
      setNearestGeofence(nearest);

      if (nearest && nearest.isWithin) {
        setGpsStatus("inside");
      } else if (nearest && !nearest.isWithin) {
        setGpsStatus("outside");
      } else {
        setGpsStatus("idle");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to acquire GPS position";
      setGpsErrorMsg(msg);
      setGpsStatus("error");
    }
  }, [geofences]);

  // Acquire GPS on mount or geofence change
  useEffect(() => {
    if (geofences.length > 0) {
      refreshLocation();
    }
  }, [geofences, refreshLocation]);

  // 5. Fetch All Data (Supabase with LocalStorage Fallback)
  const loadAttendanceData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Load Geofences
      let loadedGeofences: CRMGeolocation[] = [];
      try {
        const { data, error } = await supabase
          .from("crm_geolocations")
          .select("*")
          .eq("org_id", effectiveOrgId)
          .order("created_at", { ascending: true });
        if (!error && data && data.length > 0) {
          loadedGeofences = data as unknown as CRMGeolocation[];
        }
      } catch (_err) {
        void _err;
      }

      if (loadedGeofences.length === 0) {
        try {
          const { data, error } = await crmApi.getCRMGeolocations(effectiveOrgId);
          if (!error && data && data.length > 0) {
            loadedGeofences = data as unknown as CRMGeolocation[];
          }
        } catch (err) {
          console.warn("Failed to fetch geofences from API, checking local storage:", err);
        }
      }

      if (loadedGeofences.length === 0) {
        const stored = localStorage.getItem(`${STORAGE_GEOFENCES_PREFIX}${effectiveOrgId}`);
        if (stored) {
          try {
            loadedGeofences = JSON.parse(stored);
          } catch {
            loadedGeofences = [];
          }
        }
      }

      // If still empty, provide default Headquarters geofence
      if (loadedGeofences.length === 0) {
        const defaultHq: CRMGeolocation = {
          id: "geo-hq-default",
          org_id: effectiveOrgId,
          name: org?.name ? `${org.name} HQ` : "Main Office / HQ",
          latitude: 28.6139,
          longitude: 77.2090,
          radius_meters: 150,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        loadedGeofences = [defaultHq];
      }
      setGeofences(loadedGeofences);

      // Load Attendance Records
      let loadedAttendance: CRMAttendanceRecord[] = [];
      try {
        const { data, error } = await supabase
          .from("crm_attendance")
          .select("*")
          .eq("org_id", effectiveOrgId)
          .order("date", { ascending: false });
        if (!error && data) {
          loadedAttendance = data as unknown as CRMAttendanceRecord[];
        }
      } catch (_err) {
        void _err;
      }

      if (loadedAttendance.length === 0) {
        try {
          const { data, error } = await crmApi.getCRMAttendance(effectiveOrgId);
          if (!error && data) {
            loadedAttendance = data as unknown as CRMAttendanceRecord[];
          }
        } catch (err) {
          console.warn("Failed to fetch attendance from API, checking local storage:", err);
        }
      }

      if (loadedAttendance.length === 0) {
        const storedAtt = localStorage.getItem(`${STORAGE_ATTENDANCE_PREFIX}${effectiveOrgId}`);
        if (storedAtt) {
          try {
            loadedAttendance = JSON.parse(storedAtt);
          } catch {
            loadedAttendance = [];
          }
        }
      }
      setAttendanceRecords(loadedAttendance);

      // Load Regularisation Requests
      let loadedRequests: CRMAttendanceRequest[] = [];
      try {
        const { data, error } = await supabase
          .from("crm_attendance_requests")
          .select("*")
          .eq("org_id", effectiveOrgId)
          .order("created_at", { ascending: false });
        if (!error && data) {
          loadedRequests = data as unknown as CRMAttendanceRequest[];
        }
      } catch (_err) {
        void _err;
      }

      if (loadedRequests.length === 0) {
        try {
          const { data, error } = await crmApi.getCRMAttendanceRequests(effectiveOrgId);
          if (!error && data) {
            loadedRequests = data as unknown as CRMAttendanceRequest[];
          }
        } catch (err) {
          console.warn("Failed to fetch attendance requests from API:", err);
        }
      }

      if (loadedRequests.length === 0) {
        const storedReq = localStorage.getItem(`${STORAGE_REQUESTS_PREFIX}${effectiveOrgId}`);
        if (storedReq) {
          try {
            loadedRequests = JSON.parse(storedReq);
          } catch {
            loadedRequests = [];
          }
        }
      }
      setRequests(loadedRequests);

      // Load Profiles & Roles for Directory
      const profilesMap: Record<string, StaffProfileInfo> = {};
      try {
        // Load Profiles & Roles for Directory via crmApi.getCRMStaff (primary) or fallback
        let staffMembers: Array<{
          id: string;
          full_name?: string;
          name?: string;
          email?: string;
          crm_role_name?: string | null;
          role_name?: string | null;
          crm_role_color?: string | null;
          is_super_admin?: boolean;
        }> | null = null;

        try {
          const staffRes = await crmApi.getCRMStaff(effectiveOrgId);
          if (staffRes?.data && Array.isArray(staffRes.data) && staffRes.data.length > 0) {
            staffMembers = staffRes.data;
          }
        } catch (_crmStaffErr) {
          void _crmStaffErr;
        }

        if (staffMembers && staffMembers.length > 0) {
          staffMembers.forEach((sm) => {
            profilesMap[sm.id] = {
              id: sm.id,
              name: sm.full_name?.trim() || sm.name?.trim() || (sm.email ? sm.email.split("@")[0] : "Team Member"),
              email: sm.email || "",
              roleName: sm.crm_role_name || sm.role_name || "Staff",
              roleColor: sm.crm_role_color || "#2563EB",
              isSuperAdmin: Boolean(sm.is_super_admin),
            };
          });
          const crmRolesFound = staffMembers.map((sm) => sm.crm_role_name || sm.role_name).filter(Boolean) as string[];
          if (crmRolesFound.length > 0) {
            setCrmRoleNames((prev) => Array.from(new Set([...prev, ...crmRolesFound])));
          }
        } else {
          let members: Array<{ id: string; user_id: string; role?: string }> | null = null;
          try {
            const { data } = await supabase
              .from("organization_memberships")
              .select("id, user_id, role")
              .eq("organization_id", effectiveOrgId);
            if (data && data.length > 0) members = data;
          } catch (_err) {
            void _err;
          }

          if (!members) {
            const res = await settingsApi.getMemberships(effectiveOrgId);
            if (res.data) members = res.data;
          }

          if (members && members.length > 0) {
            const userIds = members.map((m) => m.user_id);
            let profiles: Array<{ id: string; full_name?: string | null; email?: string | null }> | null = null;
            try {
              const { data } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);
              if (data && Array.isArray(data)) profiles = data;
            } catch (_err) {
              void _err;
            }

            if (!profiles) {
              const res = await settingsApi.getProfiles({ ids: userIds });
              if (res.data && Array.isArray(res.data)) profiles = res.data;
            }

            let staffRoles: Array<{ staff_id: string; role_id: string }> | null = null;
            try {
              const { data } = await supabase
                .from("crm_staff_roles")
                .select("staff_id, role_id")
                .in("staff_id", userIds);
              if (data) staffRoles = data;
            } catch (_err) {
              void _err;
            }

            if (!staffRoles) {
              const res = await crmApi.getCRMStaffRoles(effectiveOrgId);
              if (res.data) staffRoles = res.data;
            }

            let crmRoles: Array<{ id: string; name: string; color?: string; is_super_admin?: boolean }> | null = null;
            try {
              const { data } = await supabase
                .from("crm_roles")
                .select("id, name, color, is_super_admin")
                .eq("org_id", effectiveOrgId);
              if (data) crmRoles = data;
            } catch (_err) {
              void _err;
            }

            if (!crmRoles) {
              const res = await crmApi.getCRMRoles(effectiveOrgId);
              if (res.data) crmRoles = res.data;
            }

            if (crmRoles && crmRoles.length > 0) {
              const names = crmRoles.map((r) => r.name).filter(Boolean);
              setCrmRoleNames((prev) => Array.from(new Set([...prev, ...names])));
            }

            const roleMap = new Map((crmRoles || []).map((r) => [r.id, r]));
            const staffRoleMap = new Map((staffRoles || []).map((sr) => [sr.staff_id, sr.role_id]));

            const safeProfiles = Array.isArray(profiles) ? profiles : [];
            safeProfiles.forEach((p) => {
              const assignedRoleId = staffRoleMap.get(p.id);
              const assignedRole = assignedRoleId ? roleMap.get(assignedRoleId) : null;
              profilesMap[p.id] = {
                id: p.id,
                name: p.full_name || "Team Member",
                email: p.email || "",
                roleName: assignedRole?.name || "Staff",
                roleColor: assignedRole?.color || "#2563EB",
                isSuperAdmin: assignedRole?.is_super_admin || false,
              };
            });
          }
        }
      } catch (err) {
        console.warn("Could not load organization profiles:", err);
      }

      // Direct CRM Roles fetch to populate role filter options
      try {
        const { data: directRoles } = await crmApi.getCRMRoles(effectiveOrgId);
        if (directRoles && directRoles.length > 0) {
          const directNames = directRoles.map((r) => r.name).filter(Boolean);
          setCrmRoleNames((prev) => Array.from(new Set([...prev, ...directNames])));
        }
      } catch (err) {
        console.warn("Could not load direct crm_roles:", err);
      }

      // Check localStorage for cached CRM roles
      if (typeof window !== "undefined") {
        const cachedRolesStr =
          localStorage.getItem(`credsmart_crm_roles_${effectiveOrgId}`) ||
          localStorage.getItem("credsmart_crm_roles");
        if (cachedRolesStr) {
          try {
            const parsed = JSON.parse(cachedRolesStr);
            if (Array.isArray(parsed)) {
              const names = parsed
                .map((r: unknown) => (typeof r === "string" ? r : (r && typeof r === "object" && "name" in r ? String((r as { name: unknown }).name) : "")))
                .filter((n: string) => typeof n === "string" && Boolean(n.trim()));
              setCrmRoleNames((prev) => Array.from(new Set([...prev, ...names])));
            }
          } catch {
            // ignore
          }
        }
      }

      // Ensure current user is in profilesMap
      if (user && !profilesMap[user.id]) {
        profilesMap[user.id] = {
          id: user.id,
          name: (user.user_metadata?.full_name as string)?.trim() || (user.user_metadata?.name as string)?.trim() || (user as any)?.full_name || user.email?.split("@")[0] || "Current Staff",
          email: user.email || "",
          roleName: isSuperAdmin ? "Super Admin" : "Staff Member",
          roleColor: isSuperAdmin ? "#F59E0B" : "#2563EB",
          isSuperAdmin,
        };
      }
      setStaffProfiles(profilesMap);
    } finally {
      setDataLoading(false);
    }
  }, [effectiveOrgId, org, user, isSuperAdmin]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Helper to persist attendance changes locally and in Supabase
  const persistAttendance = useCallback(
    async (updatedRecords: CRMAttendanceRecord[]) => {
      setAttendanceRecords(updatedRecords);
      try {
        localStorage.setItem(
          `${STORAGE_ATTENDANCE_PREFIX}${effectiveOrgId}`,
          JSON.stringify(updatedRecords)
        );
      } catch (e) {
        console.warn("Failed to write attendance to localStorage:", e);
      }
    },
    [effectiveOrgId]
  );

  // Helper to persist geofences locally and in Supabase
  const persistGeofences = useCallback(
    async (updatedGeofences: CRMGeolocation[]) => {
      setGeofences(updatedGeofences);
      try {
        localStorage.setItem(
          `${STORAGE_GEOFENCES_PREFIX}${effectiveOrgId}`,
          JSON.stringify(updatedGeofences)
        );
      } catch (e) {
        console.warn("Failed to write geofences to localStorage:", e);
      }
    },
    [effectiveOrgId]
  );

  // Helper to persist requests locally
  const persistRequests = useCallback(
    async (updatedRequests: CRMAttendanceRequest[]) => {
      setRequests(updatedRequests);
      try {
        localStorage.setItem(
          `${STORAGE_REQUESTS_PREFIX}${effectiveOrgId}`,
          JSON.stringify(updatedRequests)
        );
      } catch (e) {
        console.warn("Failed to write requests to localStorage:", e);
      }
    },
    [effectiveOrgId]
  );

  // ============================================================================
  // Staff Clock-In / Clock-Out Handlers
  // ============================================================================

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      // 1. Acquire current GPS position
      const coords = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      setCurrentCoords(coords);

      // 2. Evaluate geofence
      const activeGeos =
        geofences.length > 0
          ? geofences
          : [
              {
                id: "geo-hq-default",
                org_id: effectiveOrgId,
                name: org?.name ? `${org.name} HQ` : "Main Office / HQ",
                latitude: 28.6139,
                longitude: 77.2090,
                radius_meters: 150,
                is_active: true,
                created_at: new Date().toISOString(),
              },
            ];
      const nearest = findNearestGeofence(coords.latitude, coords.longitude, activeGeos);
      setNearestGeofence(nearest);

      const isInside = nearest?.isWithin ?? false;
      const verificationMethod: AttendanceVerificationMethod = isInside ? "geo_verified" : "manual";
      const distanceMeters = nearest ? Math.round(nearest.distance) : null;
      const nowIso = new Date().toISOString();

      const newRecord: CRMAttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        org_id: effectiveOrgId,
        staff_id: effectiveUserId,
        staff_name: staffProfiles[effectiveUserId]?.name || user?.email?.split("@")[0] || "Staff Member",
        staff_email: user?.email || "",
        date: todayDateStr,
        clock_in: nowIso,
        clock_out: null,
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_accuracy: coords.accuracy,
        clock_out_latitude: null,
        clock_out_longitude: null,
        clock_out_accuracy: null,
        clock_in_location_id: nearest?.geofence.id || null,
        clock_out_location_id: null,
        status: "present",
        verification_method: verificationMethod,
        is_within_geofence: isInside,
        distance_from_office_meters: distanceMeters,
        work_duration_minutes: 0,
        overtime_minutes: 0,
        notes: isInside
          ? `Clocked in via GPS verification at ${nearest?.geofence.name || "Office"}`
          : `Clocked in outside geofence (${distanceMeters}m away from ${nearest?.geofence.name || "nearest office"})`,
        created_at: nowIso,
        updated_at: nowIso,
      };

      // 3. Update local state immediately (Optimistic UI)
      const filtered = attendanceRecords.filter(
        (r) => !(r.staff_id === effectiveUserId && r.date === todayDateStr)
      );
      await persistAttendance([newRecord, ...filtered]);

      if (isInside) {
        toast({
          title: "Clocked In Successfully ✓",
          description: `Geo-verified (${distanceMeters}m from ${nearest?.geofence.name})`,
        });
      } else {
        toast({
          title: "Clocked In (Outside Geofence) ⚠️",
          description: `Recorded as manual verification (${distanceMeters ?? "unknown"}m from nearest office).`,
        });
      }

      // 4. Upsert via Supabase & crmApi
      const attendancePayload = {
        org_id: effectiveOrgId,
        staff_id: effectiveUserId,
        date: todayDateStr,
        clock_in: nowIso,
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_accuracy: coords.accuracy,
        clock_in_location_id: nearest?.geofence.id || null,
        status: "present" as AttendanceStatus,
        verification_method: verificationMethod,
        is_within_geofence: isInside,
        distance_from_office_meters: distanceMeters,
        work_duration_minutes: 0,
        overtime_minutes: 0,
        notes: newRecord.notes,
      };

      try {
        await supabase
          .from("crm_attendance")
          .upsert(attendancePayload, { onConflict: "org_id, staff_id, date" });
      } catch (err) {
        console.warn("Supabase attendance record failed:", err);
      }

      try {
        crmApi.recordCRMAttendance(attendancePayload, effectiveOrgId).catch(() => {});
      } catch (err) {
        console.warn("API attendance record failed, maintaining locally:", err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to capture GPS position.";
      toast({
        title: "Clock In Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord || !todayRecord.clock_in) {
      toast({
        title: "No Active Session",
        description: "You have not clocked in for today yet.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // 1. Acquire current GPS position (fallback gracefully if not reachable)
      let coords: CoordinatesResult | null = null;
      try {
        coords = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        });
        setCurrentCoords(coords);
      } catch (geoErr) {
        console.warn("Could not acquire GPS on clock-out, continuing with timestamp:", geoErr);
      }

      const nowIso = new Date().toISOString();
      const clockInTime = new Date(todayRecord.clock_in).getTime();
      const clockOutTime = new Date(nowIso).getTime();

      const durationMinutes = Math.max(
        0,
        Math.round((clockOutTime - clockInTime) / (1000 * 60))
      );
      const overtimeMinutes = Math.max(
        0,
        durationMinutes - DEFAULT_SHIFT_TARGET_MINUTES
      );

      const nearest = coords
        ? findNearestGeofence(coords.latitude, coords.longitude, geofences)
        : null;

      const updatedRecord: CRMAttendanceRecord = {
        ...todayRecord,
        clock_out: nowIso,
        clock_out_latitude: coords?.latitude || null,
        clock_out_longitude: coords?.longitude || null,
        clock_out_accuracy: coords?.accuracy || null,
        clock_out_location_id: nearest?.geofence.id || null,
        work_duration_minutes: durationMinutes,
        overtime_minutes: overtimeMinutes,
        updated_at: nowIso,
      };

      // 2. Update local state immediately (Optimistic UI)
      const updatedList = attendanceRecords.map((r) =>
        r.id === todayRecord.id || (r.staff_id === effectiveUserId && r.date === todayDateStr)
          ? updatedRecord
          : r
      );
      await persistAttendance(updatedList);

      toast({
        title: "Clocked Out Successfully ✓",
        description: `Session complete. Total time: ${formatMinutesToHM(durationMinutes)}${overtimeMinutes > 0 ? ` (${formatMinutesToHM(overtimeMinutes)} overtime)` : ""}.`,
      });

      // 3. Update via Supabase & crmApi
      try {
        await supabase
          .from("crm_attendance")
          .upsert(updatedRecord, { onConflict: "org_id, staff_id, date" });
      } catch (err) {
        console.warn("Supabase attendance clock-out failed:", err);
      }

      try {
        crmApi.updateCRMAttendance(
          todayRecord?.id || `${effectiveOrgId}-${effectiveUserId}-${todayDateStr}`,
          {
            clock_out: nowIso,
            clock_out_latitude: coords?.latitude || null,
            clock_out_longitude: coords?.longitude || null,
            clock_out_accuracy: coords?.accuracy || null,
            clock_out_location_id: nearest?.geofence.id || null,
            work_duration_minutes: durationMinutes,
            overtime_minutes: overtimeMinutes,
            updated_at: nowIso,
          },
          effectiveOrgId
        ).catch(() => {});
      } catch (err) {
        console.warn("API update on clock out failed, maintaining locally:", err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record clock-out.";
      toast({
        title: "Clock Out Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // Geofence Management Handlers
  // ============================================================================

  const handleOpenAddGeofence = () => {
    setEditingGeofence(null);
    setGeofenceForm({
      name: "",
      latitude: currentCoords ? currentCoords.latitude.toFixed(6) : "",
      longitude: currentCoords ? currentCoords.longitude.toFixed(6) : "",
      radius_meters: "150",
      is_active: true,
    });
    setIsGeofenceModalOpen(true);
  };

  const handleOpenEditGeofence = (geo: CRMGeolocation) => {
    setEditingGeofence(geo);
    setGeofenceForm({
      name: geo.name,
      latitude: geo.latitude.toString(),
      longitude: geo.longitude.toString(),
      radius_meters: geo.radius_meters.toString(),
      is_active: geo.is_active,
    });
    setIsGeofenceModalOpen(true);
  };

  const handleCaptureOfficeLocation = async () => {
    setIsCapturingOfficeGps(true);
    try {
      const coords = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      setGeofenceForm((prev) => ({
        ...prev,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6),
      }));
      toast({
        title: "Coordinates Captured ✓",
        description: `Lat: ${coords.latitude.toFixed(5)}, Lon: ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy)}m)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not acquire current location";
      toast({
        title: "GPS Capture Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsCapturingOfficeGps(false);
    }
  };

  const handleSaveGeofence = async () => {
    const lat = parseFloat(geofenceForm.latitude);
    const lon = parseFloat(geofenceForm.longitude);
    const rad = parseInt(geofenceForm.radius_meters, 10);

    if (!geofenceForm.name.trim()) {
      toast({ title: "Validation Error", description: "Office location name is required.", variant: "destructive" });
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
      toast({ title: "Validation Error", description: "Please enter valid geographic coordinates.", variant: "destructive" });
      return;
    }

    if (isNaN(rad) || rad <= 0) {
      toast({ title: "Validation Error", description: "Radius must be a positive integer in meters.", variant: "destructive" });
      return;
    }

    const nowIso = new Date().toISOString();

    if (editingGeofence) {
      // Update existing
      const updated: CRMGeolocation = {
        ...editingGeofence,
        name: geofenceForm.name.trim(),
        latitude: lat,
        longitude: lon,
        radius_meters: rad,
        is_active: geofenceForm.is_active,
      };

      try {
        await crmApi.updateCRMGeolocation(
          updated.id,
          {
            name: updated.name,
            latitude: updated.latitude,
            longitude: updated.longitude,
            radius_meters: updated.radius_meters,
            is_active: updated.is_active,
          },
          effectiveOrgId
        );
      } catch (err) {
        console.warn("API geofence update failed:", err);
      }

      const nextGeos = geofences.map((g) => (g.id === updated.id ? updated : g));
      await persistGeofences(nextGeos);
      toast({ title: "Location Updated", description: `${updated.name} has been updated.` });
    } else {
      // Create new
      const newGeo: CRMGeolocation = {
        id: `geo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        org_id: effectiveOrgId,
        name: geofenceForm.name.trim(),
        latitude: lat,
        longitude: lon,
        radius_meters: rad,
        is_active: geofenceForm.is_active,
        created_at: nowIso,
      };

      try {
        await supabase.from("crm_geolocations").insert({
          id: newGeo.id,
          org_id: effectiveOrgId,
          name: newGeo.name,
          latitude: newGeo.latitude,
          longitude: newGeo.longitude,
          radius_meters: newGeo.radius_meters,
          is_active: newGeo.is_active,
        });
      } catch (err) {
        console.warn("Supabase geofence insert failed:", err);
      }

      try {
        await crmApi.createCRMGeolocation(
          {
            id: newGeo.id,
            org_id: effectiveOrgId,
            name: newGeo.name,
            latitude: newGeo.latitude,
            longitude: newGeo.longitude,
            radius_meters: newGeo.radius_meters,
            is_active: newGeo.is_active,
          },
          effectiveOrgId
        );
      } catch (err) {
        console.warn("API geofence insert failed:", err);
      }

      const nextGeos = [...geofences, newGeo];
      await persistGeofences(nextGeos);
      toast({ title: "Location Added ✓", description: `${newGeo.name} registered as an active geofence.` });
    }

    setIsGeofenceModalOpen(false);
    refreshLocation();
  };

  const handleDeleteGeofence = async (id: string, name: string) => {
    try {
      await supabase.from("crm_geolocations").delete().eq("id", id).eq("org_id", effectiveOrgId);
    } catch (_err) {
      void _err;
    }
    try {
      await crmApi.deleteCRMGeolocation(id, effectiveOrgId);
    } catch (err) {
      console.warn("API geofence delete failed:", err);
    }

    const nextGeos = geofences.filter((g) => g.id !== id);
    await persistGeofences(nextGeos);
    toast({ title: "Location Removed", description: `${name} has been deleted.` });
    refreshLocation();
  };

  // ============================================================================
  // Regularisation Request Handlers
  // ============================================================================

  const handleOpenRequestModal = (targetRecord?: CRMAttendanceRecord) => {
    setRequestForm({
      attendance_id: targetRecord?.id || "",
      date: targetRecord?.date || todayDateStr,
      requested_clock_in: "09:00",
      requested_clock_out: "18:00",
      requested_status: (targetRecord?.status || "present") as AttendanceStatus,
      reason: "",
    });
    setIsRequestModalOpen(true);
  };

  const handleSubmitRegularisationRequest = async () => {
    if (!requestForm.reason.trim()) {
      toast({ title: "Reason Required", description: "Please explain the reason for regularisation.", variant: "destructive" });
      return;
    }

    const nowIso = new Date().toISOString();
    const clockInIso = `${requestForm.date}T${requestForm.requested_clock_in}:00`;
    const clockOutIso = `${requestForm.date}T${requestForm.requested_clock_out}:00`;

    const newRequest: CRMAttendanceRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      org_id: effectiveOrgId,
      staff_id: effectiveUserId,
      staff_name: staffProfiles[effectiveUserId]?.name || user?.email?.split("@")[0] || "Staff Member",
      attendance_id: requestForm.attendance_id || null,
      date: requestForm.date,
      requested_clock_in: clockInIso,
      requested_clock_out: clockOutIso,
      requested_status: requestForm.requested_status,
      reason: requestForm.reason.trim(),
      status: "pending",
      reviewer_id: null,
      reviewer_notes: null,
      reviewed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await persistRequests([newRequest, ...requests]);
    setIsRequestModalOpen(false);
    toast({
      title: "Request Submitted ✓",
      description: "Your attendance regularisation request is pending manager review.",
    });

    try {
      await supabase.from("crm_attendance_requests").insert({
        id: newRequest.id,
        org_id: effectiveOrgId,
        staff_id: effectiveUserId,
        attendance_id: newRequest.attendance_id,
        date: newRequest.date,
        requested_clock_in: clockInIso,
        requested_clock_out: clockOutIso,
        requested_status: newRequest.requested_status,
        reason: newRequest.reason,
        status: "pending",
      });
    } catch (_err) {
      void _err;
    }

    try {
      await crmApi.createCRMAttendanceRequest(
        {
          id: newRequest.id,
          org_id: effectiveOrgId,
          staff_id: effectiveUserId,
          attendance_id: newRequest.attendance_id,
          date: newRequest.date,
          requested_clock_in: clockInIso,
          requested_clock_out: clockOutIso,
          requested_status: newRequest.requested_status,
          reason: newRequest.reason,
          status: "pending",
        },
        effectiveOrgId
      );
    } catch (err) {
      console.warn("API regularisation insert failed:", err);
    }
  };

  const handleReviewRequest = async (
    req: CRMAttendanceRequest,
    decision: "approved" | "rejected"
  ) => {
    if (!canEdit) {
      toast({ title: "Unauthorized", description: "You need attendance edit permissions to review requests.", variant: "destructive" });
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedRequest: CRMAttendanceRequest = {
      ...req,
      status: decision,
      reviewer_id: effectiveUserId,
      reviewer_notes: decision === "approved" ? "Approved by manager" : "Rejected by manager",
      reviewed_at: nowIso,
      updated_at: nowIso,
    };

    // If approved, update or insert into attendance
    if (decision === "approved" && req.requested_clock_in && req.requested_clock_out) {
      const inTime = new Date(req.requested_clock_in).getTime();
      const outTime = new Date(req.requested_clock_out).getTime();
      const durationMins = Math.max(0, Math.round((outTime - inTime) / (1000 * 60)));
      const overtimeMins = Math.max(0, durationMins - DEFAULT_SHIFT_TARGET_MINUTES);

      const updatedAttendance: CRMAttendanceRecord = {
        id: req.attendance_id || `att-reg-${Date.now()}`,
        org_id: effectiveOrgId,
        staff_id: req.staff_id,
        staff_name: req.staff_name || staffProfiles[req.staff_id]?.name,
        staff_email: staffProfiles[req.staff_id]?.email || "",
        date: req.date,
        clock_in: req.requested_clock_in,
        clock_out: req.requested_clock_out,
        clock_in_latitude: null,
        clock_in_longitude: null,
        clock_in_accuracy: null,
        clock_out_latitude: null,
        clock_out_longitude: null,
        clock_out_accuracy: null,
        clock_in_location_id: null,
        clock_out_location_id: null,
        status: req.requested_status,
        verification_method: "regularized",
        is_within_geofence: true,
        distance_from_office_meters: 0,
        work_duration_minutes: durationMins,
        overtime_minutes: overtimeMins,
        notes: `Regularised punch: ${req.reason}`,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const filtered = attendanceRecords.filter(
        (a) => !(a.staff_id === req.staff_id && a.date === req.date)
      );
      await persistAttendance([updatedAttendance, ...filtered]);

      try {
        await supabase
          .from("crm_attendance")
          .upsert(
            {
              org_id: effectiveOrgId,
              staff_id: req.staff_id,
              date: req.date,
              clock_in: req.requested_clock_in,
              clock_out: req.requested_clock_out,
              status: req.requested_status,
              verification_method: "regularized",
              is_within_geofence: true,
              distance_from_office_meters: 0,
              work_duration_minutes: durationMins,
              overtime_minutes: overtimeMins,
              notes: updatedAttendance.notes,
            },
            { onConflict: "org_id, staff_id, date" }
          );
      } catch (err) {
        console.warn("Supabase upsert on regularise approval failed:", err);
      }

      try {
        await crmApi.recordCRMAttendance(
          {
            org_id: effectiveOrgId,
            staff_id: req.staff_id,
            date: req.date,
            clock_in: req.requested_clock_in,
            clock_out: req.requested_clock_out,
            status: req.requested_status,
            verification_method: "regularized",
            is_within_geofence: true,
            distance_from_office_meters: 0,
            work_duration_minutes: durationMins,
            overtime_minutes: overtimeMins,
            notes: updatedAttendance.notes,
          },
          effectiveOrgId
        );
      } catch (err) {
        console.warn("API upsert on regularise approval failed:", err);
      }
    }

    const nextRequests = requests.map((r) => (r.id === req.id ? updatedRequest : r));
    await persistRequests(nextRequests);

    try {
      await supabase
        .from("crm_attendance_requests")
        .update({
          status: decision,
          reviewer_id: effectiveUserId,
          reviewer_notes: updatedRequest.reviewer_notes,
          reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", req.id)
        .eq("org_id", effectiveOrgId);
    } catch (err) {
      console.warn("Supabase request review update failed:", err);
    }

    try {
      await crmApi.updateCRMAttendanceRequest(
        req.id,
        {
          status: decision,
          reviewer_id: effectiveUserId,
          reviewer_notes: updatedRequest.reviewer_notes,
          reviewed_at: nowIso,
          updated_at: nowIso,
        },
        effectiveOrgId
      );
    } catch (err) {
      console.warn("API request review update failed:", err);
    }

    toast({
      title: decision === "approved" ? "Request Approved ✓" : "Request Rejected",
      description: `Attendance record for ${req.staff_name || "staff"} on ${req.date} has been ${decision}.`,
    });
  };

  // ============================================================================
  // Export Handlers (CSV & jsPDF)
  // ============================================================================

  const geofenceMap = useMemo(() => {
    const map: Record<string, string> = {};
    geofences.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  }, [geofences]);

  const handleExportCsv = (recordsToExport?: unknown) => {
    try {
      const records = Array.isArray(recordsToExport)
        ? recordsToExport
        : (activeTab === "logs" ? filteredLogs : attendanceRecords);
      exportAttendanceCSV(records, {
        filename: `CredSmart_Attendance_${todayDateStr}.csv`,
        staffProfiles,
        geofenceMap,
      });
      toast({ title: "CSV Exported ✓", description: `Downloaded attendance dataset (${records.length} records).` });
    } catch (err) {
      console.error("CSV export failed:", err);
      toast({ title: "CSV Error", description: "Could not export CSV.", variant: "destructive" });
    }
  };

  const handleExportPdf = (recordsToExport?: unknown) => {
    try {
      const records = Array.isArray(recordsToExport)
        ? recordsToExport
        : (activeTab === "logs" ? filteredLogs : attendanceRecords);
      generateAttendanceReportPDF({
        records,
        organizationName: org?.name || "CredSmart Business",
        staffName: "All Staff",
        period: selectedDate || todayDateStr,
        staffProfiles,
        geofenceMap,
        filename: `CredSmart_Attendance_Report_${todayDateStr}.pdf`,
        autoSave: true,
      });
      toast({ title: "PDF Report Generated ✓", description: `Downloaded PDF attendance report (${records.length} records).` });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast({ title: "PDF Error", description: "Could not generate PDF.", variant: "destructive" });
    }
  };

  // ============================================================================
  // Statistics Calculations
  // ============================================================================

  const metrics = useMemo(() => {
    const todayLogs = attendanceRecords.filter((r) => r.date === todayDateStr);
    const presentToday = todayLogs.filter((r) => r.status === "present" || r.status === "half_day").length;
    const geoVerified = todayLogs.filter((r) => r.verification_method === "geo_verified").length;
    const manualPending = todayLogs.filter((r) => r.verification_method === "manual").length;
    const totalLocations = geofences.filter((g) => g.is_active).length;

    const complianceRate = presentToday > 0 ? Math.round((geoVerified / presentToday) * 100) : 100;

    return {
      presentToday,
      geoVerified,
      manualPending,
      totalLocations,
      complianceRate,
    };
  }, [attendanceRecords, geofences, todayDateStr]);

  // ============================================================================
  // Filtered Table Data & Columns
  // ============================================================================

  // Available unique roles for filtering daily attendance oversight
  const availableRoles = useMemo(() => {
    const roleSet = new Set<string>();

    // 1. Roles loaded from crm_roles / database
    crmRoleNames.forEach((name) => {
      if (name && name.trim()) roleSet.add(name.trim());
    });

    // 2. Roles from staff profile directory
    Object.values(staffProfiles).forEach((p) => {
      if (p.roleName && p.roleName.trim()) {
        roleSet.add(p.roleName.trim());
      }
    });

    // 3. Roles from attendance records (direct or mapped)
    attendanceRecords.forEach((r) => {
      const profile = staffProfiles[r.staff_id];
      if (profile?.roleName && profile.roleName.trim()) {
        roleSet.add(profile.roleName.trim());
      }
      const raw = r as unknown as { role?: string; role_name?: string };
      if (raw.role && typeof raw.role === "string" && raw.role.trim()) {
        roleSet.add(raw.role.trim());
      } else if (raw.role_name && typeof raw.role_name === "string" && raw.role_name.trim()) {
        roleSet.add(raw.role_name.trim());
      } else if (!profile?.roleName) {
        roleSet.add("Staff");
      }
    });

    return Array.from(roleSet).sort();
  }, [crmRoleNames, staffProfiles, attendanceRecords]);

  const filteredLogs = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchDate = selectedDate ? r.date === selectedDate : true;
      const matchStatus = statusFilter === "all" ? true : r.status === statusFilter;

      const profile = staffProfiles[r.staff_id];
      const raw = r as unknown as { role?: string; role_name?: string };
      const currentRole = profile?.roleName || raw.role || raw.role_name || "Staff";

      const matchRole =
        roleFilter === "all"
          ? true
          : currentRole.toLowerCase() === roleFilter.toLowerCase();

      return matchDate && matchStatus && matchRole;
    });
  }, [attendanceRecords, selectedDate, statusFilter, roleFilter, staffProfiles]);

  const logColumns: CRMColumnDef<CRMAttendanceRecord>[] = [
    {
      key: "staff_name",
      header: "Staff Member",
      sortable: true,
      accessor: (row) => {
        const profile = staffProfiles[row.staff_id];
        const name = row.staff_name || profile?.name || "Staff";
        const email = row.staff_email || profile?.email || "";
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-900 truncate">{name}</div>
              {email && <div className="text-[11px] text-slate-500 truncate">{email}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      accessor: (row) => {
        const profile = staffProfiles[row.staff_id];
        const raw = row as unknown as { role?: string; role_name?: string };
        const roleName = profile?.roleName || raw.role || raw.role_name || "Staff";
        return (
          <CRMRolePill
            name={roleName}
            color={profile?.roleColor || "#1D4ED8"}
            isSuperAdmin={profile?.isSuperAdmin}
            size="sm"
          />
        );
      },
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (row) => <span className="text-xs font-mono text-slate-700">{formatDateDisplay(row.date)}</span>,
    },
    {
      key: "clock_in",
      header: "Clock In",
      sortable: true,
      accessor: (row) => {
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-mono font-medium text-slate-800">{formatTimeDisplay(row.clock_in)}</span>
          </div>
        );
      },
    },
    {
      key: "clock_out",
      header: "Clock Out",
      sortable: true,
      accessor: (row) => {
        if (!row.clock_out && row.clock_in && row.date === todayDateStr) {
          return (
            <CRMBadge variant="orange" size="sm" dot>
              Active
            </CRMBadge>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-700">{formatTimeDisplay(row.clock_out)}</span>
          </div>
        );
      },
    },
    {
      key: "work_duration_minutes",
      header: "Duration",
      sortable: true,
      accessor: (row) => {
        return (
          <div className="text-xs font-mono font-semibold text-slate-800">
            {formatMinutesToHM(row.work_duration_minutes)}
            {row.overtime_minutes > 0 && (
              <span className="ml-1 text-[11px] text-amber-600 font-normal">
                (+{formatMinutesToHM(row.overtime_minutes)})
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "verification_method",
      header: "Verification",
      sortable: true,
      accessor: (row) => {
        if (row.verification_method === "geo_verified") {
          return (
            <CRMBadge variant="success" size="sm" dot>
              Geo-Verified ✓
            </CRMBadge>
          );
        }
        if (row.verification_method === "regularized") {
          return (
            <CRMBadge variant="info" size="sm">
              Regularized
            </CRMBadge>
          );
        }
        return (
          <CRMBadge variant="warning" size="sm">
            Manual ⚠️ {row.distance_from_office_meters ? `(${row.distance_from_office_meters}m)` : ""}
          </CRMBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => {
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
              onClick={() => setSelectedRecordForDetails(row)}
              title="View GPS & Punch Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600"
              onClick={() => handleOpenRequestModal(row)}
              title="Request Regularisation"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
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
      <div className="min-h-screen bg-slate-50/50 pb-32 sm:pb-20 font-sans">
        {/* ====================================================================== */}
        {/* DESKTOP VIEW (>= 768px): Preserved 100% Byte-for-Byte                  */}
        {/* ====================================================================== */}
        <div className="hidden md:block space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2.5 sm:px-6">
        {/* ====================================================================== */}
        {/* Page Header                                                            */}
        {/* ====================================================================== */}
        <CRMPageHeader
          title="Attendance & Geolocation Hub"
          subtitle="GPS verified clock-in, active work sessions, and shift tracking"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "CRM", href: ROUTE_PATHS.crm },
            { label: "Attendance", href: ROUTE_PATHS.crmAttendance },
          ]}
          badge={
            <CRMBadge variant="success" size="sm" dot>
              Live Sync
            </CRMBadge>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshLocation}
                disabled={gpsStatus === "acquiring"}
                className="h-8 gap-1.5 text-xs text-slate-700 bg-white"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", gpsStatus === "acquiring" && "animate-spin")} />
                <span className="hidden sm:inline">Sync GPS</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="h-8 gap-1.5 text-xs text-slate-700 bg-white"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-8 gap-1.5 text-xs text-slate-700 bg-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={handleOpenAddGeofence}
                  className="h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Geofences</span>
                </Button>
              )}
            </div>
          }
        />

        {/* ====================================================================== */}
        {/* Summary Stat Cards (5 KPIs)                                            */}
        {/* ====================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <CRMStatCard
            label="Present Today"
            value={metrics.presentToday}
            icon={CalendarCheck}
            accent="emerald"
            description="Active & verified staff"
          />
          <CRMStatCard
            label="Geo-Verified"
            value={metrics.geoVerified}
            icon={MapPin}
            accent="blue"
            trend={{
              value: `${metrics.complianceRate}%`,
              direction: "up",
              label: "Compliance",
            }}
          />
          <CRMStatCard
            label="Manual / Regularised"
            value={metrics.manualPending}
            icon={AlertTriangle}
            accent="gold"
            description="Requires review or regularised"
          />
          <CRMStatCard
            label="Office Geofences"
            value={metrics.totalLocations}
            icon={Building2}
            accent="navy"
            description="Configured boundaries"
          />
        </div>

        {/* ====================================================================== */}
        {/* Navigation Tabs (Mobile-friendly switcher)                            */}
        {/* ====================================================================== */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto self-start overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("pod")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "pod"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>My Clock-In Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "logs"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Team Attendance ({attendanceRecords.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("geofences")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "geofences"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <MapPin className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>Office Locations ({geofences.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "requests"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Send className="w-3.5 h-3.5 text-amber-600" />
            <span>Regularisation ({requests.filter((r) => r.status === "pending").length})</span>
          </button>
        </div>

        {/* ====================================================================== */}
        {/* TAB 1: Staff Clock-In / Clock-Out Pod                                  */}
        {/* ====================================================================== */}
        {activeTab === "pod" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1/3: Primary Staff Action Card */}
            <CRMCard
              variant="brand"
              className="lg:col-span-1 shadow-sm"
              title={
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-slate-900">Today's Shift</span>
                  <Badge variant="outline" className="text-[11px] font-mono text-slate-600 bg-slate-50">
                    {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  </Badge>
                </div>
              }
              description="Capture GPS-verified clock-in and work timer"
            >
              <div className="space-y-6 pt-2">
                {/* Live Digital Clock */}
                <div className="text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 mb-1 font-mono">
                    Current Time
                  </div>
                  <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>General Shift • 09:00 AM - 06:00 PM (8h)</span>
                  </div>
                </div>

                {/* GPS Status Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">GPS Radar Status</span>
                    <button
                      type="button"
                      onClick={refreshLocation}
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
                    >
                      <RefreshCw className={cn("w-3 h-3", gpsStatus === "acquiring" && "animate-spin")} />
                      Refresh
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                    <div className="flex items-center justify-between">
                      {gpsStatus === "acquiring" && (
                        <CRMBadge variant="warning" size="sm" dot>
                          Acquiring GPS...
                        </CRMBadge>
                      )}
                      {gpsStatus === "inside" && (
                        <CRMBadge variant="success" size="sm" dot>
                          Within Geofence ✓
                        </CRMBadge>
                      )}
                      {gpsStatus === "outside" && (
                        <CRMBadge variant="warning" size="sm">
                          Outside Geofence ⚠️
                        </CRMBadge>
                      )}
                      {gpsStatus === "error" && (
                        <CRMBadge variant="error" size="sm">
                          GPS Disabled / Unavailable
                        </CRMBadge>
                      )}
                      {gpsStatus === "idle" && (
                        <CRMBadge variant="neutral" size="sm">
                          GPS Standby
                        </CRMBadge>
                      )}

                      {nearestGeofence && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {Math.round(nearestGeofence.distance)}m away
                        </span>
                      )}
                    </div>

                    {nearestGeofence ? (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate">
                          Nearest: <strong className="text-slate-800">{nearestGeofence.geofence.name}</strong> (Radius: {nearestGeofence.geofence.radius_meters}m)
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        No active office geofence detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Action Button: Clock In / Clock Out */}
                <div className="space-y-3">
                  {!todayRecord ? (
                    // 1. Not Clocked In Yet
                    <Button
                      type="button"
                      onClick={handleClockIn}
                      disabled={actionLoading}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{actionLoading ? "Acquiring GPS & Punching..." : "Clock In Now"}</span>
                    </Button>
                  ) : !todayRecord.clock_out ? (
                    // 2. Active Session -> Clock Out Button
                    <div className="space-y-3">
                      {/* Active Session Ticking Timer */}
                      <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/60 text-center space-y-1">
                        <div className="text-[11px] font-semibold text-[#FF6A00] uppercase tracking-wider font-mono">
                          Active Work Session
                        </div>
                        <div className="font-mono text-2xl font-black text-orange-950 dark:text-orange-200 tabular-nums">
                          {formatSecondsToHMS(elapsedSeconds)}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          Clocked in at {formatTimeDisplay(todayRecord.clock_in)}
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleClockOut}
                        disabled={actionLoading}
                        className="w-full h-11 rounded-xl bg-[#FF6A00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>{actionLoading ? "Calculating Duration..." : "Clock Out"}</span>
                      </Button>
                    </div>
                  ) : (
                    // 3. Shift Completed
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-sm text-emerald-900">Shift Completed for Today</div>
                      <div className="text-xs text-slate-600 font-mono">
                        {formatTimeDisplay(todayRecord.clock_in)} → {formatTimeDisplay(todayRecord.clock_out)} ({formatMinutesToHM(todayRecord.work_duration_minutes)})
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRequestModal(todayRecord)}
                        className="text-xs h-7 gap-1 mt-1 border-emerald-300 text-emerald-800"
                      >
                        <Edit3 className="w-3 h-3" /> Request Adjustment
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CRMCard>

            {/* Right 2/3: Live Distance Radar & Geofence Visualizer */}
            <CRMCard
              variant="elevated"
              className="lg:col-span-2 shadow-sm"
              title="Distance Radar & Location Overview"
              description="Visual geofence proximity, coordinates verification, and staff location health"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Visual SVG Radar Scanner */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden min-h-[260px]">
                  {/* Concentric Radar Rings */}
                  <div className="w-48 h-48 rounded-full border border-slate-700 flex items-center justify-center relative">
                    <div className="w-36 h-36 rounded-full border border-slate-700/80 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border border-slate-600/80 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border border-emerald-500/50 flex items-center justify-center bg-emerald-500/10">
                          {/* Center Office Pin */}
                          <Building2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    </div>

                    {/* Radar Crosshairs */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-px bg-slate-800" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-full w-px bg-slate-800" />
                    </div>

                    {/* Blinking User Dot */}
                    {nearestGeofence && (
                      <div
                        className={cn(
                          "absolute w-3 h-3 rounded-full shadow-lg transition-all duration-700",
                          nearestGeofence.isWithin
                            ? "bg-emerald-400 shadow-emerald-400/50 animate-ping"
                            : "bg-amber-400 shadow-amber-400/50 animate-pulse"
                        )}
                        style={{
                          top: nearestGeofence.isWithin ? "45%" : "18%",
                          right: nearestGeofence.isWithin ? "45%" : "22%",
                        }}
                      />
                    )}
                  </div>

                  {/* Radar Bottom Label */}
                  <div className="mt-4 text-center space-y-1">
                    <div className="font-mono text-lg font-bold text-white flex items-center justify-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: "12s" }} />
                      <span>{nearestGeofence ? `${Math.round(nearestGeofence.distance)} meters` : "Calculating..."}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Office Perimeter Radius: {nearestGeofence?.geofence.radius_meters || 150}m
                    </div>
                  </div>
                </div>

                {/* Right Details Panel */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Telemetry & Geofence Status
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Active Office</span>
                        <span className="font-semibold text-slate-900">{nearestGeofence?.geofence.name || "Default HQ"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Your Latitude</span>
                        <span className="font-mono font-medium text-slate-800">
                          {currentCoords ? currentCoords.latitude.toFixed(5) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Your Longitude</span>
                        <span className="font-mono font-medium text-slate-800">
                          {currentCoords ? currentCoords.longitude.toFixed(5) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">GPS Accuracy</span>
                        <span className="font-mono font-medium text-slate-800">
                          {currentCoords ? `±${Math.round(currentCoords.accuracy)} meters` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Verification Protocol</span>
                        <span className="font-medium text-emerald-600">Haversine Great-Circle</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("logs")}
                      className="text-xs w-full justify-center"
                    >
                      <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      View Full Team Logs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenRequestModal(todayRecord || undefined)}
                      className="text-xs w-full justify-center"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                      Request Correction
                    </Button>
                  </div>
                </div>
              </div>
            </CRMCard>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 2: Team Attendance Logs Table                                      */}
        {/* ====================================================================== */}
        {activeTab === "logs" && (
          <CRMCard
            variant="default"
            className="shadow-sm"
            title="Team Daily Attendance Logs"
            description="Comprehensive oversight of employee check-in times, work durations, and geolocation status"
            headerAction={
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 text-xs w-36 bg-white"
                  aria-label="Filter by date"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-32 bg-white" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger
                    className="h-8 text-xs w-36 bg-white"
                    aria-label="Filter by role"
                    data-testid="attendance-role-filter"
                  >
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv(filteredLogs)}
                  className="h-8 gap-1.5 text-xs text-slate-700 bg-white"
                  title="Export Filtered CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPdf(filteredLogs)}
                  className="h-8 gap-1.5 text-xs text-slate-700 bg-white"
                  title="Export Filtered PDF"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Export PDF</span>
                </Button>
              </div>
            }
          >
            <div className="pt-2">
              <CRMDataTable
                data={filteredLogs as unknown as Record<string, unknown>[]}
                columns={logColumns as unknown as CRMColumnDef<Record<string, unknown>>[]}
                searchPlaceholder="Search staff by name or email..."
                searchFilter={(row, q) => {
                  const record = row as unknown as CRMAttendanceRecord;
                  const name = record.staff_name || staffProfiles[record.staff_id]?.name || "";
                  const email = record.staff_email || staffProfiles[record.staff_id]?.email || "";
                  return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
                }}
                pageSize={10}
                emptyMessage="No attendance records match your filter criteria."
              />
            </div>
          </CRMCard>
        )}

        {/* ====================================================================== */}
        {/* TAB 3: Geofence Management                                             */}
        {/* ====================================================================== */}
        {activeTab === "geofences" && (
          <CRMCard
            variant="default"
            className="shadow-sm"
            title="Registered Office Geofences"
            description="Office and warehouse geographic coordinates defining punch-in zones"
            headerAction={
              canEdit && (
                <Button
                  size="sm"
                  onClick={handleOpenAddGeofence}
                  className="h-8 gap-1.5 text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Office Geofence</span>
                </Button>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {geofences.map((geo) => (
                <div
                  key={geo.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{geo.name}</h4>
                      <span className="text-[11px] text-slate-500">ID: {geo.id.substring(0, 10)}...</span>
                    </div>
                    {geo.is_active ? (
                      <CRMBadge variant="success" size="sm" dot>
                        Active
                      </CRMBadge>
                    ) : (
                      <CRMBadge variant="neutral" size="sm">
                        Inactive
                      </CRMBadge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latitude:</span>
                      <span>{geo.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Longitude:</span>
                      <span>{geo.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Radius:</span>
                      <span className="font-bold text-blue-600">{geo.radius_meters} meters</span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditGeofence(geo)}
                        className="h-7 text-xs gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGeofence(geo.id, geo.name)}
                        className="h-7 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CRMCard>
        )}

        {/* ====================================================================== */}
        {/* TAB 4: Regularisation Requests                                         */}
        {/* ====================================================================== */}
        {activeTab === "requests" && (
          <CRMCard
            variant="default"
            className="shadow-sm"
            title="Attendance Regularisation & Punch Corrections"
            description="Review and approve employee requests for missed punches, device failures, and on-site visits"
            headerAction={
              <Button
                size="sm"
                onClick={() => handleOpenRequestModal()}
                className="h-8 gap-1.5 text-xs bg-[#FF6A00] hover:bg-orange-600 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </Button>
            }
          >
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
              {requests.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No regularisation requests recorded.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="px-3.5 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{req.staff_name || "Staff Member"}</span>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {req.date}
                        </Badge>
                        {req.status === "pending" && (
                          <CRMBadge variant="warning" size="sm" dot>
                            Pending Review
                          </CRMBadge>
                        )}
                        {req.status === "approved" && (
                          <CRMBadge variant="success" size="sm">
                            Approved ✓
                          </CRMBadge>
                        )}
                        {req.status === "rejected" && (
                          <CRMBadge variant="error" size="sm">
                            Rejected
                          </CRMBadge>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Requested: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatTimeDisplay(req.requested_clock_in)}</strong> to{" "}
                        <strong className="font-mono text-slate-800 dark:text-slate-200">{formatTimeDisplay(req.requested_clock_out)}</strong>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                        "{req.reason}"
                      </div>
                    </div>

                    {req.status === "pending" && canEdit && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                        <Button
                          size="sm"
                          onClick={() => handleReviewRequest(req, "approved")}
                          className="min-h-[44px] h-11 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 rounded-lg"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewRequest(req, "rejected")}
                          className="min-h-[44px] h-11 px-3 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CRMCard>
        )}
      </div>

      {/* ====================================================================== */}
      {/* MOBILE VIEW (< 768px): Dedicated Native Touch Experience (Mockup 3)   */}
      {/* ====================================================================== */}
      <div className="block md:hidden pb-24 px-3.5 pt-2.5 space-y-3.5 max-w-lg mx-auto">
        {/* Mobile Header */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Link
              to={ROUTE_PATHS.crm}
              className="w-8.5 h-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center shadow-2xs shrink-0 active:scale-[0.97]"
              title="Back to CRM Command Center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Attendance Hub
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time shift clock, GPS geofencing &amp; staff logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={refreshLocation}
              disabled={gpsStatus === "acquiring"}
              className="w-8.5 h-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center shadow-2xs active:scale-[0.97] transition-all disabled:opacity-50"
              title="Sync GPS"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", gpsStatus === "acquiring" && "animate-spin")} />
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleOpenAddGeofence}
                className="h-8.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs active:scale-[0.98]"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Geofences</span>
              </button>
            )}
          </div>
        </div>

        {/* 2x2 Stat Badges (Mockup 3) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Present */}
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
              activeTab === "logs"
                ? "border-emerald-500/80 ring-1 ring-emerald-500/30"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CalendarCheck className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Present
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {metrics.presentToday}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Geo-Verified */}
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
              activeTab === "logs"
                ? "border-blue-500/80 ring-1 ring-blue-500/30"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Shield className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  GPS Verified
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {metrics.geoVerified}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Regularised */}
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
              activeTab === "requests"
                ? "border-amber-500/80 ring-1 ring-amber-500/30"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Regularised
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {metrics.manualPending}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Geofences */}
          <button
            type="button"
            onClick={() => setActiveTab("geofences")}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs min-h-[44px] text-left transition-colors cursor-pointer",
              activeTab === "geofences"
                ? "border-purple-500/80 ring-1 ring-purple-500/30"
                : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Geofences
                </span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {metrics.totalLocations}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>
        </div>

        {/* Segmented Pill Tabs (Mockup 3) */}
        <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("pod")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
              activeTab === "pod"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            My Clock-In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
              activeTab === "logs"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Team Logs ({attendanceRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("geofences")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
              activeTab === "geofences"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Locations
          </button>
        </div>

        {/* TAB 1: My Clock-In (Shift & Telemetry Card) */}
        {activeTab === "pod" && (
          <div className="space-y-3">
            <div className="rounded-2xl border-l-4 border-l-orange-500 border-y border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Today's Shift
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>

              {/* Digital Clock */}
              <div className="text-center py-1">
                <div className="font-mono text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>General Shift • 09:00 AM - 06:00 PM</span>
                </div>
              </div>

              {/* Radar Scanner Widget (Mockup 3) */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Concentric rings */}
                  <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
                  <div className="absolute inset-6 rounded-full border border-emerald-500/30" />
                  <div className="absolute inset-10 rounded-full border border-emerald-500/40" />
                  <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                  <div className="absolute h-full w-[1px] bg-emerald-500/20" />

                  {/* Radar Sweep Animation */}
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(16,185,129,0.25)_360deg)] animate-spin [animation-duration:4s]" />

                  {/* Center Target & Distance */}
                  <div className="relative z-10 text-center px-2 flex flex-col items-center">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full mb-1 animate-ping",
                        gpsStatus === "inside" ? "bg-emerald-400" : "bg-amber-400"
                      )}
                    />
                    <span className="font-mono text-xs font-bold text-emerald-400 tracking-tight">
                      {nearestGeofence ? `${Math.round(nearestGeofence.distance)}m` : "GPS Sync"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {gpsStatus === "inside" ? "In Zone" : "Radar Scan"}
                    </span>
                  </div>
                </div>

                {/* Geofence Status Badge & Telemetry */}
                <div className="mt-3 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs">
                    {gpsStatus === "inside" ? (
                      <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200">
                        ✓ Inside Geofence
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200">
                        ⚠️ Outside Geofence ({nearestGeofence ? `${Math.round(nearestGeofence.distance)}m` : "No Office"})
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    📍 {nearestGeofence?.geofence.name || "Main Office / HQ"}
                  </p>

                  <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    GPS Accuracy: ±{currentCoords?.accuracy ? Math.round(currentCoords.accuracy) : 4}m • Protocol: Verified
                  </div>
                </div>
              </div>

              {/* Clock In / Out CTA Button */}
              <div className="pt-2">
                {!todayRecord ? (
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actionLoading ? "Punching In..." : "Clock In Now"}</span>
                  </button>
                ) : !todayRecord.clock_out ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 text-center">
                      <span className="text-[11px] font-mono font-semibold text-orange-600 uppercase tracking-wider">
                        Active Session:{" "}
                      </span>
                      <span className="font-mono text-base font-black text-orange-950 dark:text-orange-200 tabular-nums">
                        {formatSecondsToHMS(elapsedSeconds)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClockOut}
                      disabled={actionLoading}
                      className="w-full min-h-[46px] rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      <span>{actionLoading ? "Punching Out..." : "Clock Out"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    ✓ Completed for today ({formatMinutesToHM(todayRecord.work_duration_minutes)})
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Quick Links (Mockup 3) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 min-h-[44px] active:scale-[0.98]"
              >
                <span>📋 View Team Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 min-h-[44px] active:scale-[0.98]"
              >
                <span>✏️ Request Correction</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Team Logs (Stream Container) */}
        {activeTab === "logs" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No attendance logs found for this period.
              </div>
            ) : (
              attendanceRecords.map((rec) => {
                const isVerified = rec.verification_method === "geo_verified";
                const isActive = !rec.clock_out && rec.clock_in && rec.date === todayDateStr;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecordForDetails(rec)}
                    className="p-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {(rec.staff_name || "S").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {rec.staff_name || "Staff"}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>In: {formatTimeDisplay(rec.clock_in)}</span>
                          <span>•</span>
                          <span>Out: {formatTimeDisplay(rec.clock_out)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Active
                        </span>
                      ) : isVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Geo-Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Manual
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Locations (Geofences Stream) */}
        {activeTab === "geofences" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                Configured Boundaries ({geofences.length})
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleOpenAddGeofence}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Boundary</span>
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
              {geofences.map((geo) => (
                <div key={geo.id} className="p-3 flex items-center justify-between gap-2.5 min-h-[44px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {geo.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Radius: {geo.radius_meters}m • {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditGeofence(geo)}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50"
                      title="Edit Geofence"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* ====================================================================== */}
        {/* MODAL 1: Geofence Management Dialog                                    */}
        {/* ====================================================================== */}
        <Dialog open={isGeofenceModalOpen} onOpenChange={setIsGeofenceModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGeofence ? "Edit Office Geofence" : "Add Office Geofence"}</DialogTitle>
              <DialogDescription>
                Define latitude, longitude, and radius for automated staff presence verification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Office / Facility Name</label>
                <Input
                  placeholder="e.g. Headquarters, Retail Store #1"
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Latitude</label>
                  <Input
                    placeholder="28.6139"
                    value={geofenceForm.latitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, latitude: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Longitude</label>
                  <Input
                    placeholder="77.2090"
                    value={geofenceForm.longitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, longitude: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCaptureOfficeLocation}
                disabled={isCapturingOfficeGps}
                className="w-full text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Crosshair className={cn("w-3.5 h-3.5", isCapturingOfficeGps && "animate-spin")} />
                <span>{isCapturingOfficeGps ? "Capturing GPS..." : "Use My Current Location"}</span>
              </Button>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Perimeter Radius (Meters)</label>
                <Input
                  type="number"
                  placeholder="150"
                  value={geofenceForm.radius_meters}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, radius_meters: e.target.value })}
                  className="text-xs font-mono"
                />
                <span className="text-[11px] text-slate-500">
                  Recommended: 100m to 200m for reliable indoor mobile GPS reception.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-semibold text-slate-700">Active Location Status</label>
                <Switch
                  checked={geofenceForm.is_active}
                  onCheckedChange={(checked) => setGeofenceForm({ ...geofenceForm, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsGeofenceModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveGeofence} className="bg-[#1D4ED8] text-white">
                Save Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====================================================================== */}
        {/* MODAL 2: Regularisation Request Dialog                                 */}
        {/* ====================================================================== */}
        <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Punch Correction</DialogTitle>
              <DialogDescription>
                Submit an attendance regularisation request to your manager for approval.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Date</label>
                <Input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Requested Clock In</label>
                  <Input
                    type="time"
                    value={requestForm.requested_clock_in}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_clock_in: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Requested Clock Out</label>
                  <Input
                    type="time"
                    value={requestForm.requested_clock_out}
                    onChange={(e) => setRequestForm({ ...requestForm, requested_clock_out: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Requested Status</label>
                <Select
                  value={requestForm.requested_status}
                  onValueChange={(v) => setRequestForm({ ...requestForm, requested_status: v as AttendanceStatus })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present (Full Day)</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Reason / Justification</label>
                <Input
                  placeholder="e.g. Forgot to clock in, GPS hardware glitch, On-site client visit"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitRegularisationRequest} className="bg-[#FF6A00] text-white">
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ====================================================================== */}
        {/* MODAL 3: Punch Details View Dialog                                     */}
        {/* ====================================================================== */}
        <Dialog
          open={!!selectedRecordForDetails}
          onOpenChange={(open) => !open && setSelectedRecordForDetails(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Attendance Record Details</DialogTitle>
              <DialogDescription>
                Detailed GPS coordinates, accuracy, and telemetry timestamps.
              </DialogDescription>
            </DialogHeader>

            {selectedRecordForDetails && (
              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Staff:</span>
                    <strong className="text-slate-900 font-sans">
                      {selectedRecordForDetails.staff_name || "Staff Member"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{selectedRecordForDetails.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clock In Time:</span>
                    <span>{formatTimeDisplay(selectedRecordForDetails.clock_in)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clock Out Time:</span>
                    <span>{formatTimeDisplay(selectedRecordForDetails.clock_out)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Work Duration:</span>
                    <span className="font-bold text-slate-900">
                      {formatMinutesToHM(selectedRecordForDetails.work_duration_minutes)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono">
                  <div className="text-[11px] font-bold text-slate-700 uppercase">GPS Verification Details</div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Method:</span>
                    <span>{selectedRecordForDetails.verification_method}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Inside Geofence:</span>
                    <span>{selectedRecordForDetails.is_within_geofence ? "YES" : "NO"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Clock-in Coordinates:</span>
                    <span>
                      {selectedRecordForDetails.clock_in_latitude
                        ? `${selectedRecordForDetails.clock_in_latitude.toFixed(5)}, ${selectedRecordForDetails.clock_in_longitude?.toFixed(5)}`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Clock-in Accuracy:</span>
                    <span>
                      {selectedRecordForDetails.clock_in_accuracy
                        ? `±${Math.round(selectedRecordForDetails.clock_in_accuracy)}m`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Distance to Office:</span>
                    <span>
                      {selectedRecordForDetails.distance_from_office_meters !== null
                        ? `${selectedRecordForDetails.distance_from_office_meters} meters`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {selectedRecordForDetails.notes && (
                  <div className="p-2.5 rounded bg-slate-100/70 text-slate-600 italic">
                    Note: {selectedRecordForDetails.notes}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedRecordForDetails(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </CRMPermissionGate>
  );
}
