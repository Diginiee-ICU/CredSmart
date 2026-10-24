# Progress: Explorer M1.2 (App.tsx Route Tree & Universal Legacy Redirection)

- Status: Completed investigation & architecture specification
- Last visited: 2026-10-23T22:30:00Z

## Checklist
- [x] Received dispatch and initialized BRIEFING.md & progress.md
- [x] Inspect ORIGINAL_REQUEST.md & PROJECT.md
- [x] Inspect prior survey report in explorer_survey_routes/handoff.md
- [x] Inspect `src/test/crmShellRoutes.test.ts` for AST/regex assertions
- [x] Inspect `src/test/crmAttendanceRouteWiringChallenge.test.tsx` for route order assertions
- [x] Inspect `src/App.tsx` (App, ProtectedRoutes, RoleProtectedRoute, route declarations)
- [x] Design universal `<LegacyRedirect />` component
- [x] Define complete 36 legacy route mapping table with parameters and query search handling
- [x] Verify impact on tests and baseline `vitest` + `tsc --noEmit` (code 0)
- [x] Prepare comprehensive `handoff.md`
