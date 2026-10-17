import { describe, it, expect, expectTypeOf } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import type {
  AttendanceStatus,
  AttendanceVerificationMethod,
  AttendanceRequestStatus,
  CRMGeolocation,
  CRMAttendanceRecord,
  CRMAttendanceRequest,
} from "@/types/crmAttendance";

// TypeScript compile-time helper utilities for negative / assignability checks
type Extends<T, U> = [T] extends [U] ? true : false;
type ExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;

describe("CRM Phase 2 Milestone 1: TypeScript Types & Schema Stress Tests", () => {
  // ==========================================================================
  // Suite 1: Database Table Existence & Field Parity with SQL Migration
  // ==========================================================================
  describe("Suite 1: SQL Column Parity with Supabase Database Types", () => {
    it("empirically verifies crm_geolocations has exact 8 SQL columns in Row", () => {
      type GeoRow = Database["public"]["Tables"]["crm_geolocations"]["Row"];
      type ExpectedGeoKeys =
        | "id"
        | "org_id"
        | "name"
        | "latitude"
        | "longitude"
        | "radius_meters"
        | "is_active"
        | "created_at";

      // Verify exact key match
      type KeysMatch = ExactKeys<GeoRow, ExpectedGeoKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // Verify property types
      expectTypeOf<GeoRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<GeoRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<GeoRow["name"]>().toEqualTypeOf<string>();
      expectTypeOf<GeoRow["latitude"]>().toEqualTypeOf<number>();
      expectTypeOf<GeoRow["longitude"]>().toEqualTypeOf<number>();
      expectTypeOf<GeoRow["radius_meters"]>().toEqualTypeOf<number>();
      expectTypeOf<GeoRow["is_active"]>().toEqualTypeOf<boolean>();
      expectTypeOf<GeoRow["created_at"]>().toEqualTypeOf<string>();
    });

    it("empirically verifies crm_attendance has exact 23 SQL columns in Row", () => {
      type AttRow = Database["public"]["Tables"]["crm_attendance"]["Row"];
      type ExpectedAttKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "date"
        | "clock_in"
        | "clock_out"
        | "clock_in_latitude"
        | "clock_in_longitude"
        | "clock_in_accuracy"
        | "clock_out_latitude"
        | "clock_out_longitude"
        | "clock_out_accuracy"
        | "clock_in_location_id"
        | "clock_out_location_id"
        | "status"
        | "verification_method"
        | "is_within_geofence"
        | "distance_from_office_meters"
        | "work_duration_minutes"
        | "overtime_minutes"
        | "notes"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<AttRow, ExpectedAttKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      // Verify nullable vs non-nullable types in Row
      expectTypeOf<AttRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["date"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["verification_method"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["is_within_geofence"]>().toEqualTypeOf<boolean>();
      expectTypeOf<AttRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<AttRow["updated_at"]>().toEqualTypeOf<string>();

      // Nullable fields
      expectTypeOf<AttRow["clock_in"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AttRow["clock_out"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AttRow["clock_in_latitude"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_in_longitude"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_in_accuracy"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_out_latitude"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_out_longitude"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_out_accuracy"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["clock_in_location_id"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AttRow["clock_out_location_id"]>().toEqualTypeOf<string | null>();
      expectTypeOf<AttRow["distance_from_office_meters"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["work_duration_minutes"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["overtime_minutes"]>().toEqualTypeOf<number | null>();
      expectTypeOf<AttRow["notes"]>().toEqualTypeOf<string | null>();
    });

    it("empirically verifies crm_attendance_requests has exact 15 SQL columns in Row", () => {
      type ReqRow = Database["public"]["Tables"]["crm_attendance_requests"]["Row"];
      type ExpectedReqKeys =
        | "id"
        | "org_id"
        | "staff_id"
        | "attendance_id"
        | "date"
        | "requested_clock_in"
        | "requested_clock_out"
        | "requested_status"
        | "reason"
        | "status"
        | "reviewer_id"
        | "reviewer_notes"
        | "reviewed_at"
        | "created_at"
        | "updated_at";

      type KeysMatch = ExactKeys<ReqRow, ExpectedReqKeys>;
      const keysMatch: KeysMatch = true;
      expect(keysMatch).toBe(true);

      expectTypeOf<ReqRow["id"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["org_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["staff_id"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["date"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["reason"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["requested_status"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["status"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["created_at"]>().toEqualTypeOf<string>();
      expectTypeOf<ReqRow["updated_at"]>().toEqualTypeOf<string>();

      // Nullables
      expectTypeOf<ReqRow["attendance_id"]>().toEqualTypeOf<string | null>();
      expectTypeOf<ReqRow["requested_clock_in"]>().toEqualTypeOf<string | null>();
      expectTypeOf<ReqRow["requested_clock_out"]>().toEqualTypeOf<string | null>();
      expectTypeOf<ReqRow["reviewer_id"]>().toEqualTypeOf<string | null>();
      expectTypeOf<ReqRow["reviewer_notes"]>().toEqualTypeOf<string | null>();
      expectTypeOf<ReqRow["reviewed_at"]>().toEqualTypeOf<string | null>();
    });
  });

  // ==========================================================================
  // Suite 2: Supabase Insert Type Requirements & Negative Type Assertions
  // ==========================================================================
  describe("Suite 2: Insert Types & Negative Compilation Contracts", () => {
    it("validates minimal required fields for crm_geolocations.Insert", () => {
      type GeoInsert = Database["public"]["Tables"]["crm_geolocations"]["Insert"];

      // Minimal valid payload: only NOT NULL fields without DB defaults
      const validMinimal: GeoInsert = {
        org_id: "org-123",
        name: "Headquarters",
        latitude: 28.6139,
        longitude: 77.209,
      };
      expect(validMinimal.name).toBe("Headquarters");

      // Maximal valid payload
      const validMaximal: GeoInsert = {
        id: "geo-uuid-1",
        org_id: "org-123",
        name: "Branch Mumbai",
        latitude: 19.076,
        longitude: 72.8777,
        radius_meters: 200,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      expect(validMaximal.radius_meters).toBe(200);

      // Negative assertion: missing 'name' cannot be assigned to GeoInsert
      type MissingName = { org_id: string; latitude: number; longitude: number };
      type CanAssignMissingName = Extends<MissingName, GeoInsert>;
      const canAssignMissingName: CanAssignMissingName = false;
      expect(canAssignMissingName).toBe(false);

      // Negative assertion: missing 'latitude' cannot be assigned
      type MissingLat = { org_id: string; name: string; longitude: number };
      type CanAssignMissingLat = Extends<MissingLat, GeoInsert>;
      const canAssignMissingLat: CanAssignMissingLat = false;
      expect(canAssignMissingLat).toBe(false);

      // Negative assertion: missing 'org_id' cannot be assigned
      type MissingOrg = { name: string; latitude: number; longitude: number };
      type CanAssignMissingOrg = Extends<MissingOrg, GeoInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);
    });

    it("validates minimal required fields for crm_attendance.Insert", () => {
      type AttInsert = Database["public"]["Tables"]["crm_attendance"]["Insert"];

      // In SQL, org_id and staff_id are the only required columns (date, status, etc. have defaults)
      const validMinimal: AttInsert = {
        org_id: "org-uuid-1",
        staff_id: "staff-uuid-1",
      };
      expect(validMinimal.staff_id).toBe("staff-uuid-1");

      // Full payload with all optional columns
      const validFull: AttInsert = {
        org_id: "org-uuid-1",
        staff_id: "staff-uuid-1",
        date: "2026-10-17",
        clock_in: "2026-10-17T09:00:00Z",
        clock_out: "2026-10-17T18:00:00Z",
        clock_in_latitude: 28.6139,
        clock_in_longitude: 77.209,
        clock_in_accuracy: 12.5,
        clock_out_latitude: 28.614,
        clock_out_longitude: 77.2092,
        clock_out_accuracy: 10.0,
        clock_in_location_id: "geo-uuid-1",
        clock_out_location_id: "geo-uuid-1",
        status: "present",
        verification_method: "geo_verified",
        is_within_geofence: true,
        distance_from_office_meters: 42.8,
        work_duration_minutes: 540,
        overtime_minutes: 0,
        notes: "Timely arrival via main gate",
      };
      expect(validFull.work_duration_minutes).toBe(540);

      // Negative assertion: missing staff_id fails
      type MissingStaff = { org_id: string };
      type CanAssignMissingStaff = Extends<MissingStaff, AttInsert>;
      const canAssignMissingStaff: CanAssignMissingStaff = false;
      expect(canAssignMissingStaff).toBe(false);

      // Negative assertion: missing org_id fails
      type MissingOrg = { staff_id: string };
      type CanAssignMissingOrg = Extends<MissingOrg, AttInsert>;
      const canAssignMissingOrg: CanAssignMissingOrg = false;
      expect(canAssignMissingOrg).toBe(false);

      // Negative assertion: wrong type (e.g. latitude as string) fails
      type BadLatType = { org_id: string; staff_id: string; clock_in_latitude: string };
      type CanAssignBadLat = Extends<BadLatType, AttInsert>;
      const canAssignBadLat: CanAssignBadLat = false;
      expect(canAssignBadLat).toBe(false);
    });

    it("validates minimal required fields for crm_attendance_requests.Insert", () => {
      type ReqInsert = Database["public"]["Tables"]["crm_attendance_requests"]["Insert"];

      // Minimal required: org_id, staff_id, date, reason
      const validMinimal: ReqInsert = {
        org_id: "org-1",
        staff_id: "user-1",
        date: "2026-10-16",
        reason: "Forgot to punch out due to client meeting",
      };
      expect(validMinimal.reason).toBeTruthy();

      // Negative assertion: missing reason fails
      type MissingReason = { org_id: string; staff_id: string; date: string };
      type CanAssignMissingReason = Extends<MissingReason, ReqInsert>;
      const canAssignMissingReason: CanAssignMissingReason = false;
      expect(canAssignMissingReason).toBe(false);

      // Negative assertion: missing date fails
      type MissingDate = { org_id: string; staff_id: string; reason: string };
      type CanAssignMissingDate = Extends<MissingDate, ReqInsert>;
      const canAssignMissingDate: CanAssignMissingDate = false;
      expect(canAssignMissingDate).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 3: Supabase Update Types
  // ==========================================================================
  describe("Suite 3: Update Types Partiality & Type Safety", () => {
    it("allows empty object {} for all Update types", () => {
      type GeoUpdate = Database["public"]["Tables"]["crm_geolocations"]["Update"];
      type AttUpdate = Database["public"]["Tables"]["crm_attendance"]["Update"];
      type ReqUpdate = Database["public"]["Tables"]["crm_attendance_requests"]["Update"];

      const emptyGeo: GeoUpdate = {};
      const emptyAtt: AttUpdate = {};
      const emptyReq: ReqUpdate = {};

      expect(emptyGeo).toBeDefined();
      expect(emptyAtt).toBeDefined();
      expect(emptyReq).toBeDefined();
    });

    it("allows single-field updates on crm_attendance", () => {
      type AttUpdate = Database["public"]["Tables"]["crm_attendance"]["Update"];

      const clockOutUpdate: AttUpdate = {
        clock_out: "2026-10-17T18:00:00Z",
        clock_out_latitude: 28.6139,
        clock_out_longitude: 77.209,
        work_duration_minutes: 480,
      };
      expect(clockOutUpdate.work_duration_minutes).toBe(480);

      // Negative test: invalid field type
      type BadUpdate = { status: number };
      type CanAssignBadUpdate = Extends<BadUpdate, AttUpdate>;
      const canAssignBadUpdate: CanAssignBadUpdate = false;
      expect(canAssignBadUpdate).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 4: Foreign Key Relationships in Supabase Types
  // ==========================================================================
  describe("Suite 4: Relationships Definition & Foreign Keys", () => {
    it("defines foreign key relationships for crm_attendance", () => {
      type AttRelationships = Database["public"]["Tables"]["crm_attendance"]["Relationships"];
      type FirstRel = AttRelationships[0];

      // Check that clock_in_location_id, clock_out_location_id, and org_id are linked
      const rels: AttRelationships = [
        {
          foreignKeyName: "crm_attendance_clock_in_location_id_fkey",
          columns: ["clock_in_location_id"],
          isOneToOne: false,
          referencedRelation: "crm_geolocations",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_attendance_clock_out_location_id_fkey",
          columns: ["clock_out_location_id"],
          isOneToOne: false,
          referencedRelation: "crm_geolocations",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_attendance_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(rels.length).toBe(3);
    });

    it("defines foreign key relationships for crm_attendance_requests", () => {
      type ReqRelationships = Database["public"]["Tables"]["crm_attendance_requests"]["Relationships"];
      const rels: ReqRelationships = [
        {
          foreignKeyName: "crm_attendance_requests_attendance_id_fkey",
          columns: ["attendance_id"],
          isOneToOne: false,
          referencedRelation: "crm_attendance",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "crm_attendance_requests_org_id_fkey",
          columns: ["org_id"],
          isOneToOne: false,
          referencedRelation: "organizations",
          referencedColumns: ["id"],
        },
      ];
      expect(rels.length).toBe(2);
    });
  });

  // ==========================================================================
  // Suite 5: Domain Models in src/types/crmAttendance.ts
  // ==========================================================================
  describe("Suite 5: Domain Interfaces & Union Types", () => {
    it("validates AttendanceStatus literal union", () => {
      const present: AttendanceStatus = "present";
      const absent: AttendanceStatus = "absent";
      const halfDay: AttendanceStatus = "half_day";
      const onLeave: AttendanceStatus = "on_leave";

      expect([present, absent, halfDay, onLeave]).toHaveLength(4);

      // Negative assertion: invalid status literal rejected
      type InvalidStatus = "vacation" | "holiday" | "wfh";
      type IsValid = Extends<InvalidStatus, AttendanceStatus>;
      const isValid: IsValid = false;
      expect(isValid).toBe(false);
    });

    it("validates AttendanceVerificationMethod literal union", () => {
      const geo: AttendanceVerificationMethod = "geo_verified";
      const manual: AttendanceVerificationMethod = "manual";
      const reg: AttendanceVerificationMethod = "regularized";

      expect([geo, manual, reg]).toHaveLength(3);

      type InvalidMethod = "biometric" | "face_id";
      type IsValid = Extends<InvalidMethod, AttendanceVerificationMethod>;
      const isValid: IsValid = false;
      expect(isValid).toBe(false);
    });

    it("validates AttendanceRequestStatus literal union", () => {
      const pending: AttendanceRequestStatus = "pending";
      const approved: AttendanceRequestStatus = "approved";
      const rejected: AttendanceRequestStatus = "rejected";

      expect([pending, approved, rejected]).toHaveLength(3);

      type InvalidStatus = "cancelled" | "withdrawn";
      type IsValid = Extends<InvalidStatus, AttendanceRequestStatus>;
      const isValid: IsValid = false;
      expect(isValid).toBe(false);
    });

    it("validates CRMGeolocation domain type conforms to crm_geolocations.Row", () => {
      type GeoRow = Database["public"]["Tables"]["crm_geolocations"]["Row"];

      // Verify CRMGeolocation and GeoRow have identical structural keys
      type Conforms = Extends<CRMGeolocation, GeoRow>;
      const conforms: Conforms = true;
      expect(conforms).toBe(true);

      const sampleGeo: CRMGeolocation = {
        id: "geo-1",
        org_id: "org-1",
        name: "Connaught Place Office",
        latitude: 28.6315,
        longitude: 77.2167,
        radius_meters: 150,
        is_active: true,
        created_at: "2026-10-17T00:00:00Z",
      };
      expect(sampleGeo.radius_meters).toBe(150);
    });

    it("validates CRMAttendanceRecord domain type with UI enrichment fields", () => {
      const sampleRecord: CRMAttendanceRecord = {
        id: "att-1",
        org_id: "org-1",
        staff_id: "staff-1",
        staff_name: "Aman Sharma",
        staff_email: "aman@example.com",
        date: "2026-10-17",
        clock_in: "2026-10-17T09:15:00Z",
        clock_out: "2026-10-17T18:30:00Z",
        clock_in_latitude: 28.6315,
        clock_in_longitude: 77.2167,
        clock_in_accuracy: 15.0,
        clock_out_latitude: 28.6316,
        clock_out_longitude: 77.2168,
        clock_out_accuracy: 12.0,
        clock_in_location_id: "geo-1",
        clock_out_location_id: "geo-1",
        status: "present",
        verification_method: "geo_verified",
        is_within_geofence: true,
        distance_from_office_meters: 35.2,
        work_duration_minutes: 555,
        overtime_minutes: 75,
        notes: null,
        created_at: "2026-10-17T09:15:00Z",
        updated_at: "2026-10-17T18:30:00Z",
      };

      expect(sampleRecord.staff_name).toBe("Aman Sharma");
      expect(sampleRecord.work_duration_minutes).toBe(555);
      expect(sampleRecord.overtime_minutes).toBe(75);
    });

    it("validates DB Row to CRMAttendanceRecord mapper ergonomics", () => {
      // Simulating raw row returned by Supabase client
      type AttRow = Database["public"]["Tables"]["crm_attendance"]["Row"];

      const rawDbRow: AttRow = {
        id: "att-db-1",
        org_id: "org-1",
        staff_id: "staff-1",
        date: "2026-10-17",
        clock_in: "2026-10-17T09:00:00Z",
        clock_out: null,
        clock_in_latitude: 28.6315,
        clock_in_longitude: 77.2167,
        clock_in_accuracy: 8.5,
        clock_out_latitude: null,
        clock_out_longitude: null,
        clock_out_accuracy: null,
        clock_in_location_id: "geo-1",
        clock_out_location_id: null,
        status: "present",
        verification_method: "geo_verified",
        is_within_geofence: true,
        distance_from_office_meters: 18.4,
        work_duration_minutes: null, // Null in DB before clock out
        overtime_minutes: null,       // Null in DB before calculation
        notes: null,
        created_at: "2026-10-17T09:00:00Z",
        updated_at: "2026-10-17T09:00:00Z",
      };

      // Transform function normalizing null integers to default 0
      function mapRowToDomain(
        row: AttRow,
        enrichment?: { name?: string; email?: string }
      ): CRMAttendanceRecord {
        return {
          ...row,
          staff_name: enrichment?.name,
          staff_email: enrichment?.email,
          status: row.status as AttendanceStatus,
          verification_method: row.verification_method as AttendanceVerificationMethod,
          work_duration_minutes: row.work_duration_minutes ?? 0,
          overtime_minutes: row.overtime_minutes ?? 0,
        };
      }

      const domainModel = mapRowToDomain(rawDbRow, {
        name: "Pooja Patel",
        email: "pooja@example.com",
      });

      expect(domainModel.work_duration_minutes).toBe(0);
      expect(domainModel.overtime_minutes).toBe(0);
      expect(domainModel.staff_name).toBe("Pooja Patel");
      expect(domainModel.status).toBe("present");
    });
  });

  // ==========================================================================
  // Suite 6: Adversarial Boundary Value Tests
  // ==========================================================================
  describe("Suite 6: Adversarial Boundary & Extreme Value Tests", () => {
    it("handles extreme coordinate boundaries and floating precision", () => {
      type GeoInsert = Database["public"]["Tables"]["crm_geolocations"]["Insert"];

      // North Pole, South Pole, International Date Line
      const northPole: GeoInsert = {
        org_id: "org-polar",
        name: "North Pole Post",
        latitude: 90.0,
        longitude: 0.0,
        radius_meters: 10000,
      };

      const southPole: GeoInsert = {
        org_id: "org-polar",
        name: "South Pole Station",
        latitude: -90.0,
        longitude: -180.0,
        radius_meters: 50,
      };

      // High precision GPS coordinate (sub-millimeter precision)
      const highPrecision: GeoInsert = {
        org_id: "org-geo",
        name: "Sub-meter Geofence",
        latitude: 28.61393918273645,
        longitude: 77.20902123456789,
        radius_meters: 10,
      };

      expect(northPole.latitude).toBe(90.0);
      expect(southPole.longitude).toBe(-180.0);
      expect(highPrecision.latitude).toBeCloseTo(28.613939, 5);
    });

    it("verifies multi-day and timezone ISO string representations", () => {
      type AttInsert = Database["public"]["Tables"]["crm_attendance"]["Insert"];

      const utcRecord: AttInsert = {
        org_id: "org-tz",
        staff_id: "staff-tz",
        date: "2026-10-17",
        clock_in: "2026-10-17T03:30:00.000Z", // 09:00 IST in UTC
        clock_out: "2026-10-17T12:30:00.000Z", // 18:00 IST in UTC
      };

      const istRecord: AttInsert = {
        org_id: "org-tz",
        staff_id: "staff-tz",
        date: "2026-10-17",
        clock_in: "2026-10-17T09:00:00+05:30",
        clock_out: "2026-10-17T18:00:00+05:30",
      };

      expect(Date.parse(utcRecord.clock_in!)).toBe(Date.parse(istRecord.clock_in!));
      expect(Date.parse(utcRecord.clock_out!)).toBe(Date.parse(istRecord.clock_out!));
    });
  });
});
