# Progress — Milestone 2 Remediation
Last visited: 2026-10-21T19:34:00Z

- [x] Initialized BRIEFING.md and progress.md
- [x] Investigate `src/test/crmStaffProvisioningUI.test.tsx`
- [x] Add explicit timeout `, 15000)` to all async tests in `crmStaffProvisioningUI.test.tsx` (M2.UI.1 to M2.UI.7)
- [x] Investigate `src/utils/crmStaffUtils.ts` and update email regex to `/^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` with `@.` and `..` rejection
- [x] Investigate `src/pages/crm/RoleManagement.tsx` staff search and ensure regex safety using `.toLowerCase().includes(...)` on name, store role, and assigned CRM role
- [x] Run vitest `crmStaff` suite: 4/4 files passed, 85/85 tests passed (100% out of the box with zero flags)
- [x] Run `tsc --noEmit`: 0 errors
- [ ] Update BRIEFING.md
- [ ] Write handoff.md and report to parent
