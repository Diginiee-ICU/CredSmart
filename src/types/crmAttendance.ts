/**
 * CRM Phase 2: Attendance & Geo Location Attendance Domain Types
 * Defines interfaces and union types for geofencing, daily attendance records,
 * and attendance regularisation / correction requests.
 */

export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";

export type AttendanceVerificationMethod = "geo_verified" | "manual" | "regularized";

export type AttendanceRequestStatus = "pending" | "approved" | "rejected";

export interface CRMGeolocation {
  id: string;
  org_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface CRMAttendanceRecord {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_accuracy: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_accuracy: number | null;
  clock_in_location_id: string | null;
  clock_out_location_id: string | null;
  status: AttendanceStatus;
  verification_method: AttendanceVerificationMethod;
  is_within_geofence: boolean;
  distance_from_office_meters: number | null;
  work_duration_minutes: number;
  overtime_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMAttendanceRequest {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  attendance_id: string | null;
  date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: AttendanceRequestStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
