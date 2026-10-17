## 2026-10-17T12:20:11Z
You are worker_m5 for CRM Phase 2 Milestone 5: Route Wiring & CRMDashboard Live Integration.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2\DISPATCH.md.

Your write ownership:
- src/App.tsx
- src/test/crmShellRoutes.test.ts
- src/pages/crm/CRMDashboard.tsx

Requirements to execute:
1. In `src/App.tsx`:
   - Import `Attendance` from `@/pages/crm/Attendance`.
   - Update line 245 from:
     `<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />`
     to:
     `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />`
2. In `src/test/crmShellRoutes.test.ts`:
   - Update line 320 from:
     `expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />");`
     to:
     `expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");`
   - Run `npm.cmd test -- src/test/crmShellRoutes.test.ts --run` to verify it passes.
3. In `src/pages/crm/CRMDashboard.tsx`:
   - In `fetchCRMStats`, update `todayAttendance` query to directly use the typed Supabase client:
     ```typescript
     const today = new Date().toISOString().split("T")[0];
     const { count, error } = await supabase
       .from("crm_attendance")
       .select("id", { count: "exact", head: true })
       .eq("org_id", activeOrgId)
       .eq("date", today);

     if (!error && typeof count === "number") {
       attendance = count;
     }
     ```
   - In `quickNavItems` (line 226), update the badge on "Attendance Tracker" from `"Phase 2"` to `"Active"`.
4. Run verification commands:
   - `cmd /c npx tsc --noEmit`
   - `npm.cmd test -- src/test/crmShellRoutes.test.ts --run`
   - `npm.cmd test -- src/test/crmAttendance.test.tsx --run`
   - `npm.cmd test -- src/test/crmDashboard.test.tsx --run` (if present)
   - `npm.cmd test -- crm --run`
   Verify 100% pass with 0 errors.

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m5\handoff.md and notify orchestrator.
