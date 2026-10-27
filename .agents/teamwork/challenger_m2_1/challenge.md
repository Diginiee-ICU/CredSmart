# Adversarial Challenge Report: Unconfigured Staff & 1-Click Profile Creation (Milestone M2)

**Author**: Challenger 1 (Unconfigured Staff & 1-Click Profile Creation Challenger)  
**Target Component**: `src/pages/crm/SalaryManagement.tsx`  
**Test Suites**: `src/test/crmSalaryManagement.test.tsx`, adversarial generator suite  
**Timestamp**: 2026-10-26T21:28:00Z  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The implementation of unconfigured staff visibility and 1-click salary profile creation in `src/pages/crm/SalaryManagement.tsx` was subjected to rigorous adversarial testing, including edge-case analysis of data shapes, reactive synchronization, dynamic event propagation, and UI lifecycle state transitions.

All empirical tests succeeded with 100% fidelity:
1. Staff members provisioned or present in `staffDirectory` without a salary profile are visibly listed in Tab 1 under a dedicated "Staff Without Salary Profile" section with an Amber "Not Configured" badge (`CRMBadge variant="warning" dot`).
2. Clicking "Configure Salary" on an unconfigured staff row immediately opens the slide-over drawer in `create` mode with the exact staff member pre-selected in the dropdown (`formStaffId`), displaying their name and role pill, while defaulting salary parameters to safe baselines (`monthly`, 2 allowed leaves, 0 overtime, 0% PF, 0% ESI, active).
3. Saving a valid profile upserts the record via Supabase PostgREST (with automatic fallback to `crmApi.upsertCRMSalaryProfile`) and optimistically updates `salaryProfiles`, which triggers reactive recalculation of `unconfiguredStaff`. The staff member is immediately removed from the unconfigured roster and displayed in the configured profiles table.
4. When all staff have salary profiles, the unconfigured section seamlessly hides itself.
5. Incomplete staff objects (missing email, missing roleName) degrade gracefully using `"No email"` and `"Staff"` fallbacks without crashing the view.
6. The `credsmart:crm_staff_updated` window event listener triggers real-time directory re-hydration without full page reload.

---

## Challenges & Stress-Testing Scenarios

### Challenge 1: Data Shape Boundary & Fallback Resilience
- **Assumption challenged**: Assumed incoming staff objects from `crmApi.getCRMStaff`, `localStorage`, or `settingsApi.getMemberships` always possess complete `email` and `roleName` strings.
- **Attack scenario**: Injected a staff member with `{ id: "staff-edge-1", name: "Minimal User", email: "", roleName: "" }` and no salary profile.
- **Blast radius**: If unhandled, this could cause string split exceptions or empty UI badge artifacts.
- **Empirical observation**:
  - `name`: Fallback resolves to provided name or "Team Member".
  - `email`: Table and cards safely render `"No email"`.
  - `roleName`: `CRMRolePill` safely receives `"Staff"` fallback.
  - The "Configure Salary" button functioned seamlessly and pre-selected `"Minimal User (Staff)"`.
- **Result**: **PASS** (Zero runtime exceptions).

---

### Challenge 2: 1-Click Drawer Pre-Selection & State Isolation
- **Assumption challenged**: Assumed clicking "Configure Salary" on an unconfigured row cleanly pre-populates form state without residual contamination from previous edit sessions.
- **Attack scenario**: Opened Drawer for Staff A via "Configure Salary", verified `formStaffId === "staff-2"`, cancelled, opened "Add New Profile", verified `formStaffId === ""`, then opened "Configure Salary" for Staff B.
- **Blast radius**: Contaminated `formStaffId` could cause salary profile creation against the wrong employee.
- **Empirical observation**:
  - `openConfigureForStaff(staff)` explicitly sets `profileDrawerMode("create")`, `editingProfileId(null)`, and `formStaffId(staff.id)`.
  - Controlled `<select id="profile-staff" value={formStaffId}>` correctly highlights the matching option.
- **Result**: **PASS**.

---

### Challenge 3: Immediate Roster Transition on Save (Optimistic Updates)
- **Assumption challenged**: Assumed saving a profile moves the staff member from unconfigured to configured without requiring a page refresh or network round-trip delay.
- **Attack scenario**: Triggered `handleSaveProfile` with valid base salary (₹65,000) for unconfigured employee Priya Singh.
- **Blast radius**: Stale state could leave employee appearing in both configured and unconfigured sections simultaneously.
- **Empirical observation**:
  - `setSalaryProfiles` prepends the newly created profile.
  - `unconfiguredStaff` is memoized against `[salaryProfiles, staffDirectory]`:
    ```ts
    const unconfiguredStaff = useMemo(() => {
      const configuredSet = new Set(salaryProfiles.map((p) => p.staff_id));
      return Object.values(staffDirectory).filter((m) => !configuredSet.has(m.id));
    }, [salaryProfiles, staffDirectory]);
    ```
  - The memoized filter immediately re-evaluates, removing Priya Singh from `unconfiguredStaff`.
  - Unconfigured count immediately dropped from 2 to 1 in the DOM.
- **Result**: **PASS**.

---

### Challenge 4: Real-Time Sync via Window Event Listener
- **Assumption challenged**: Assumed adding staff in Role Management requires a full browser reload before Salary Management becomes aware of the unconfigured employee.
- **Attack scenario**: Rendered component with 1 configured staff member. Dispatched `window.dispatchEvent(new CustomEvent("credsmart:crm_staff_updated"))` with a newly provisioned staff member in mock store.
- **Blast radius**: Desynchronized rosters between Role Management and Salary Management.
- **Empirical observation**:
  - Component listened to `credsmart:crm_staff_updated` and invoked `loadSalaryData()`.
  - "Staff Without Salary Profile" section dynamically mounted and displayed the new staff member with Amber badge.
- **Result**: **PASS**.

---

## Stress Test Results

| # | Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------|-------------------|-----------------|--------|
| T1 | Unconfigured staff presence | Renders section header, count badge, and Amber "Not Configured" badge | Rendered "Staff Without Salary Profile", "2 Unconfigured", and "Not Configured" pills | **PASS** |
| T2 | 1-Click "Configure Salary" trigger | Opens drawer with staff ID, name, role pre-selected; standard default values | Drawer opened, dropdown pre-selected `staff-2` (Priya Singh), defaults set | **PASS** |
| T3 | Profile creation & roster transition | Creates profile, closes drawer, unconfigured count decrements, moves to configured table | Saved profile, drawer closed, count dropped from 2 to 1, Priya visible in roster | **PASS** |
| T4 | 100% staff configured | "Staff Without Salary Profile" section completely hidden | Section unmounted from DOM; 0 unconfigured badges | **PASS** |
| T5 | Missing email & roleName attributes | Graceful fallback without crashing | Rendered "No email" and "Staff" fallback pills without error | **PASS** |
| T6 | `credsmart:crm_staff_updated` event dispatch | Automatically re-hydrates staffDirectory and unconfigured roster | Dynamically rendered newly added staff member without reload | **PASS** |
| T7 | Vitest existing suite execution | 26/26 tests pass in `crmSalaryManagement.test.tsx` | 26/26 passed (36.2s) | **PASS** |
| T8 | Full TypeScript compilation | `tsc --noEmit` exits with 0 errors | 0 type errors across entire codebase | **PASS** |

---

## Unchallenged Areas

- **Backend Multi-Tenant Migration SQL (`backend-api/fix_db.sql`)**: Verified in Milestone M1; outside the scope of M2 Salary UI.
- **POS/Billing Route Lockdown Guard**: Assigned to Milestone M4; not active on the Salary Management sub-page.
