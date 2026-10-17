# Empirical Challenge Report: CRM Phase 2 Milestone 3 — Admin Attendance Oversight

**Agent**: `challenger_m3_2` (Empirical Challenger)  
**Target Milestone**: CRM Phase 2 Milestone 3: Attendance UI & Clock-In Hub  
**Working Directory**: `.agents/teamwork/challenger_m3_2`  
**Parent Agent**: `1beca3ca-d4b2-4508-99a0-6c9d39936bfb` (orchestrator_crm_phase2)  
**Timestamp**: 2026-10-17T10:51:00Z  
**Verdict**: **ISSUES_FOUND**

---

## 1. Observation

1. **Test Execution & Tool Output**:
   - Authored dedicated empirical test suite in `src/test/crmAttendanceAdminChallenge.test.tsx` containing 12 unit and integration tests.
   - Executed: `npm.cmd test -- src/test/crmAttendanceAdminChallenge.test.tsx --run`:
     ```
     ✓ src/test/crmAttendanceAdminChallenge.test.tsx (12 tests) 21727ms
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 1. Geofence Management Modal: Add, Edit & Validation > adds a new geofence location with valid parameters and persists it (3203ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 1. Geofence Management Modal: Add, Edit & Validation > edits an existing geofence location in-place without duplicating records (2081ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 1. Geofence Management Modal: Add, Edit & Validation > rejects empty office name during geofence creation (2150ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 1. Geofence Management Modal: Add, Edit & Validation > rejects invalid latitude and longitude boundary values (2193ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 1. Geofence Management Modal: Add, Edit & Validation > rejects non-positive and invalid perimeter radius (2678ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 2. 'Use My Current Location' GPS Acquisition in Modal > successfully populates latitude and longitude fields when GPS succeeds (2375ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 2. 'Use My Current Location' GPS Acquisition in Modal > handles GPS acquisition denial/error gracefully without crashing (2930ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 3. Regularisation Approval & Rejection Flow > approving regularisation request updates attendance record to 'regularized' with calculated durations (794ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 3. Regularisation Approval & Rejection Flow > rejecting regularisation request updates request status to 'rejected' without modifying attendance (741ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 4. CRMDataTable Filtering: Date, Role, and Staff Name Search > filters records by date via the date input control (1055ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 4. CRMDataTable Filtering: Date, Role, and Staff Name Search > filters records by staff name and email in CRMDataTable search input (849ms)
       ✓ Admin Attendance Oversight Empirical Challenge (src/pages/crm/Attendance.tsx) > 4. CRMDataTable Filtering: Date, Role, and Staff Name Search > evaluates presence and implementation of Role Filter in Team Attendance tab (669ms)

     Test Files  1 passed (1)
          Tests  12 passed (12)
     ```
   - Executed full CRM test suite `npm.cmd test -- src/test/crmAttendanceAdminChallenge.test.tsx src/test/crmAttendance.test.tsx src/test/crmGeoUtils.test.ts src/test/crmDashboardResilience.test.tsx src/test/crmPermissionGate.test.tsx --run`:
     ```
     Test Files  5 passed (5)
          Tests  83 passed (83)
     ```
   - Executed TypeScript typecheck `cmd /c npx tsc --noEmit`:
     ```
     Exit code: 0 (zero errors)
     ```

2. **Source Code Observations in `src/pages/crm/Attendance.tsx`**:
   - **Geofence Modal & Validation (lines 833–851, lines 2117–2202)**:
     ```typescript
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
     ```
     - Validates latitude between -90 and 90, longitude between -180 and 180, and positive radius.
     - Supports editing via `editingGeofence` state, updating the record in place without duplicating IDs.

   - **"Use My Current Location" button (lines 804–831, lines 2158–2168)**:
     - Calls `getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })`.
     - Populates `latitude` and `longitude` strings with 6 decimal digits.
     - Catches errors and displays a destructive toast (`"GPS Capture Failed"`) without crashing or corrupting modal state.

   - **Regularisation approval & rejection flow (lines 1003–1109)**:
     - On approval: calculates duration and overtime minutes (`durationMins - DEFAULT_SHIFT_TARGET_MINUTES`), upserts into `crm_attendance` with `verification_method: 'regularized'`, updates `crm_attendance_requests` with `status: 'approved'`.
     - On rejection: sets request status to `'rejected'` with reviewer notes and does NOT create or alter `crm_attendance` records.

   - **Defect Observed: Missing Role Filter (lines 1277–1284, lines 1900–1921)**:
     - Requirement R3 in `ORIGINAL_REQUEST.md` (lines 379–380) states:
       > "Admin Attendance Oversight:
       > - Daily Attendance Table using CRMDataTable with date filter, staff search, role filter, status badge"
     - Task 4 in Challenger Dispatch states:
       > "4. Test CRMDataTable filtering by date, role, and staff name search."
     - Verbatim code in `src/pages/crm/Attendance.tsx` lines 1900–1921:
       ```tsx
       headerAction={
         <div className="flex items-center gap-2">
           <Input
             type="date"
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
             className="h-8 text-xs w-36 bg-white"
           />
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="h-8 text-xs w-32 bg-white">
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
         </div>
       }
       ```
     - And filtering logic in lines 1277–1283:
       ```typescript
       const filteredLogs = useMemo(() => {
         return attendanceRecords.filter((r) => {
           const matchDate = selectedDate ? r.date === selectedDate : true;
           const matchStatus = statusFilter === "all" ? true : r.status === statusFilter;
           return matchDate && matchStatus;
         });
       }, [attendanceRecords, selectedDate, statusFilter]);
       ```
     - **Observed Defect**: There is no `roleFilter` state, no role filter `<Select>` component, and `filteredLogs` does not filter by staff role. Staff search (`searchFilter`) only searches `record.staff_name` and `record.staff_email`.

---

## 2. Logic Chain

1. **Logic Step 1 (Geofence Modal Verification)**:
   - Observation: Calling `handleSaveGeofence` with valid inputs creates or updates `CRMGeolocation` in local state and `localStorage`. Testing invalid latitude (`> 90` or `< -90`), invalid longitude (`> 180` or `< -180`), non-numeric values, or non-positive radius (`<= 0`) produces destructive validation toasts and halts submission.
   - Inference: Geofence modal CRUD, persistence, and boundary validations are fully verified and robust.

2. **Logic Step 2 ("Use My Current Location" Verification)**:
   - Observation: When GPS is mocked at `(12.971599, 77.594563)`, clicking "Use My Current Location" updates the latitude and longitude inputs. When GPS error code 1 (`PERMISSION_DENIED`) is mocked, `handleCaptureOfficeLocation` triggers toast `"GPS Capture Failed"` with error message and keeps modal open and interactive.
   - Inference: GPS capture and error handling operate correctly and resiliently.

3. **Logic Step 3 (Regularisation Approval Flow Verification)**:
   - Observation: Approving a request updates `crm_attendance_requests` to `"approved"` and creates an attendance record with `verification_method: 'regularized'` and calculated duration/overtime minutes. Rejecting a request updates the request to `"rejected"` and leaves attendance records unmodified.
   - Inference: Regularisation lifecycle logic is fully compliant with specifications.

4. **Logic Step 4 (CRMDataTable Filtering Verification)**:
   - Observation: Setting `selectedDate` filters logs to the matching date; clearing `selectedDate` displays all dates. Search input filters by staff name and email.
   - Observation: Neither `Attendance.tsx` header actions nor `filteredLogs` contain any role filter dropdown or predicate, despite R3 requiring "Daily Attendance Table using CRMDataTable with date filter, staff search, role filter, status badge".
   - Inference: Role filtering is missing from the Daily Attendance Table oversight feature.

---

## 3. Caveats

1. The role column itself is properly rendered in the table using `CRMRolePill` displaying each staff member's custom CRM role and color badge. The issue is strictly the missing filter selector in the table header.
2. Under "Review-only" constraints, this challenger has not modified `Attendance.tsx` to add the missing role filter; it is documented as a finding for the orchestrator and worker to address in Milestone 5 or polish phase.

---

## 4. Conclusion

**Verdict: ISSUES_FOUND**

While Tasks 1, 2, and 3 passed all empirical tests with zero defects, Task 4 surfaced a missing requirement:
- **Issue**: Missing Role Filter in `src/pages/crm/Attendance.tsx`. An admin cannot filter the Daily Attendance Table by staff role (e.g., Sales, Cashier, Manager), which was specified in Requirement R3 and Task 4.
- **Recommended Fix**: Add a `roleFilter` state (`const [roleFilter, setRoleFilter] = useState<string>("all")`), populate a role dropdown in `headerAction` using existing `staffProfiles` or `crm_roles`, and incorporate `const matchRole = roleFilter === "all" ? true : staffProfiles[r.staff_id]?.roleName === roleFilter;` into `filteredLogs`.

---

## 5. Verification Method

1. Run the empirical challenge test suite:
   ```cmd
   npm.cmd test -- src/test/crmAttendanceAdminChallenge.test.tsx --run
   ```
   *Expected result*: 12 tests pass, including the empirical assertion documenting the absence of the role filter dropdown.

2. Run the complete CRM test suite:
   ```cmd
   npm.cmd test -- src/test/crmAttendanceAdminChallenge.test.tsx src/test/crmAttendance.test.tsx src/test/crmGeoUtils.test.ts src/test/crmDashboardResilience.test.tsx src/test/crmPermissionGate.test.tsx --run
   ```
   *Expected result*: 83 passed across 5 test suites.

3. Inspect `src/pages/crm/Attendance.tsx` lines 1277–1284 and lines 1900–1921 to verify available table filters.
