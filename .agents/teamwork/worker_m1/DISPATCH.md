## 2026-10-17T09:08:01Z
You are worker_m1 for CRM Phase 2 Milestone 1: Database Migration & TypeScript Types.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2\DISPATCH.md.
Also read the detailed survey analysis at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\analysis.md (which provides the full SQL script and TypeScript type definitions).

Your exclusive write ownership:
- supabase/migrations/20261017010000_create_crm_attendance_tables.sql
- src/types/crmAttendance.ts
- src/integrations/supabase/types.ts

Tasks to execute:
1. Create supabase/migrations/20261017010000_create_crm_attendance_tables.sql:
   - Must be fully idempotent (BEGIN ... COMMIT, CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS, DROP TRIGGER IF EXISTS).
   - Tables: public.crm_geolocations, public.crm_attendance, public.crm_attendance_requests.
   - Foreign keys: org_id -> public.organizations(id) ON DELETE CASCADE, staff_id -> auth.users(id) ON DELETE CASCADE.
   - Unique constraint: CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date).
   - updated_at trigger attached to crm_attendance and crm_attendance_requests calling public.update_updated_at().
   - RLS enabled on all 3 tables with SELECT, INSERT, UPDATE, DELETE policies checking auth.role() = 'authenticated' AND has_org_access(org_id).
2. Create src/types/crmAttendance.ts:
   - Export domain interfaces and union types: AttendanceStatus, AttendanceVerificationMethod, AttendanceRequestStatus, CRMAttendanceRecord, CRMGeolocation, CRMAttendanceRequest.
3. Update src/integrations/supabase/types.ts:
   - Insert crm_attendance, crm_attendance_requests, and crm_geolocations into Database["public"]["Tables"] alphabetically with Row, Insert, Update, and Relationships definitions matching the database schema.
4. Run verification commands:
   - cmd /c npx tsc --noEmit
   - npm.cmd test -- src/test/crmPermissionRbac.test.ts
   Verify both pass with zero errors.

Write your report in c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md and send a completion message back with commands and results.
