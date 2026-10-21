# Task: Milestone 2 — Staff User Provisioning & Instant Role Assignment UI

## Objectives
Implement the complete frontend UI and user interaction workflows for Staff User Provisioning and Instant Role Assignment in `src/pages/crm/RoleManagement.tsx`:

1. **"Add Staff User" Modal**:
   - Add "Add Staff User" button in the Section 1 header actions (alongside "Create Custom Role" and "Refresh").
   - Modal form inputs:
     - Full Name (required, min 2 chars)
     - Email Address (required, valid email format)
     - Phone Number (optional, normalized 10 digits)
     - Store Role selector: `salesman`, `cashier`, `manager`, `staff`
     - CRM Role selector: dropdown populated with existing CRM roles (with color swatches and icons)
     - Password Input:
       - Mode 1 (default): Auto-generated cryptographically secure 14-character password (`window.crypto.getRandomValues`) with guaranteed uppercase, lowercase, numbers, and symbols. "Regenerate" button with refresh icon.
       - Mode 2: "Custom Password" toggle allowing manual entry (min 6 chars) with show/hide password toggle.
   - Form submission: calls `crmApi.provisionStaffUser(payload)` with active `orgId`.
   - On success:
     - Closes "Add Staff User" modal.
     - Immediately opens the "Credentials Confirmation Modal".
     - Immediately prepends the newly created staff member to `staffList` and maps their role in `staffRolesMap` (so they appear in the Section 3 staff roster with their assigned `CRMRolePill` instantly without full page refresh).
     - Fires success toast: "Staff member [Name] provisioned successfully!"

2. **"Credentials Confirmation Modal"**:
   - Sleek, high-density dialog displayed immediately after user creation.
   - Prominently displays:
     - Full Name
     - Email Address with 1-click "Copy Email" button
     - Plaintext Password with 1-click "Copy Password" button and show/hide toggle
     - "Copy All Credentials" button (formatted for clipboard: email + password + login URL `https://credsmart.online/auth`)
     - Direct "Share via WhatsApp" button (`https://wa.me/?text=...`)
     - Security notice: "These credentials will not be displayed again. Please share them securely with the staff member."
     - "Done" button to dismiss.

3. **"Create Role" Dialog Direct Staff Assignment**:
   - In the existing "Create Custom Role" modal (`roleModalOpen`), add an "Assign Staff Members (Optional)" section.
   - Shows a searchable list of current staff members with checkboxes.
   - Upon creating the custom role, atomically assigns the newly created role to the checked staff members via `crmApi.assignCRMStaffRole(...)`.
   - Option / button to "Add New Staff" directly within or after role creation.

4. **Staff Roster Live Update & Badges**:
   - Newly created users immediately appear in the Section 3 Staff Directory with their assigned role badge (`CRMRolePill`), contact info, and store role pill.
   - Filter and search immediately include the newly created user.

5. **Strict Invariance & Verification**:
   - Zero changes to Create Invoice flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc.).
   - `cmd /c npx tsc --noEmit` must exit with 0 errors.
   - Run Vitest test suites (`src/test/crmStaffProvisioning.test.ts`, `src/test/crmShellRoutes.test.ts`, etc.).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles\handoff.md` and send a message back to parent when done.


## 2026-10-21T18:51:04Z
You are the Implementation Worker for Milestone 2: Staff User Provisioning & Instant Role Assignment UI for CredSmart Enterprise CRM.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles\DISPATCH.md and the survey report at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_frontend_gen2\report.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles

Tasks:
1. In `src/pages/crm/RoleManagement.tsx`:
   - Implement the "Add Staff User" modal with secure 14-char auto-generated password (`window.crypto.getRandomValues`), manual custom password toggle, store role selector, CRM role selector, and submission via `crmApi.provisionStaffUser`.
   - Implement the "Credentials Confirmation Modal" displaying email and plaintext password with 1-click copy triggers, clipboard bundle formatting, WhatsApp share template, and security note.
   - Enhance the "Create Custom Role" modal with an "Assign Staff Members (Optional)" section with searchable staff checklist, assigning the new role to selected staff upon creation.
   - Hydrate `staffList` and `staffRolesMap` in memory immediately upon provisioning so new staff appear in the Section 3 staff roster with their assigned role badge (`CRMRolePill`) instantly without page reload.
2. Verify TypeScript compilation (`cmd /c npx tsc --noEmit`) exits code 0.
3. Run existing and new test suites (`cmd /c npx vitest run crmStaff`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles\handoff.md` and send a message back to parent when done.
