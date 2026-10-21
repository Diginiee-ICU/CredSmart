## 2026-10-21T19:24:58Z

# Task: Milestone 2 Remediation

## Objectives
Fix the two minor items identified during Reviewer 2 gating:

1. **Test Timeout in `src/test/crmStaffProvisioningUI.test.tsx`**:
   - In `src/test/crmStaffProvisioningUI.test.tsx`:
     - Add explicit timeout `, 15000)` to all async tests (especially M2.UI.3 and M2.UI.4).
     - Ensure `cmd /c npx vitest run crmStaff` passes 100% out of the box with zero flags.

2. **Email Validation Edge Cases in `src/utils/crmStaffUtils.ts`**:
   - In `validateStaffProvisioningInput`:
     - Update the email regex so that:
       1. The local part cannot end in a dot (rejects `trailingdot.@domain.com`).
       2. The TLD has at least 2 alphabetical characters (rejects `user@domain.c`).
       - Use: `/^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
     - Verify with `crmStaffProvisioningStress.test.tsx` and `crmStaffProvisioning.test.ts`.

3. **Search Query Escaping in `src/pages/crm/RoleManagement.tsx`**:
   - In Section 3 staff filter:
     - Ensure staff search query does not throw on special regex characters like `[` or `(` or `*`. Use `.toLowerCase().includes(...)` or escape regex special characters.

4. **Verification**:
   - Run `cmd /c npx vitest run crmStaff` (must pass 100% without `--testTimeout` flag).
   - Run `cmd /c npx tsc --noEmit` (must exit 0).
   - Verify Create Invoice flows remain 100% untouched.

Write report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_remediation\handoff.md`.
