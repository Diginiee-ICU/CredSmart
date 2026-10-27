# Quality & Adversarial Review Report: Milestone M2 (Salary & Payroll Staff Synchronization)

**Reviewer**: Reviewer 2 (Staff Hydration & Event Synchronization)  
**Target Files**: `src/pages/crm/SalaryManagement.tsx`, `src/test/crmSalaryManagement.test.tsx`  
**Worker Under Review**: Worker M2 (`.agents/teamwork/worker_m2_salary`)  
**Timestamp**: 2026-10-26T21:23:00Z  

---

## 1. Executive Summary

- **Verdict**: **APPROVE**
- **Overall Risk Assessment**: LOW
- **Integrity Status**: CLEAN (Zero integrity violations; no hardcoded facades, dummy mocks, or bypassed requirements).
- **Core Requirements Verified**:
  1. Multi-tier staff hydration correctly queries `crmApi.getCRMStaff`, falls back to `localStorage.getItem("credsmart_crm_staff_" + effectiveOrgId)`, and falls back to `settingsApi.getMemberships(effectiveOrgId)` directly extracting user fields without querying non-existent `profiles`.
  2. Event listener `window.addEventListener('credsmart:crm_staff_updated', loadSalaryData)` dynamically triggers reload on role/staff mutations and cleanly deregisters on unmount.
  3. Name resolution consistently resolves `p.staff_name` to `staffDirectory[p.staff_id]?.name || p.staff_name || "Staff Member"`.
  4. Regression test suites pass with 100% success rate (94/94 tests), and `tsc --noEmit` exits with 0 errors.

---

## 2. Detailed Quality Review

### 2.1 Correctness & Requirement Conformance

| Requirement | Implementation Detail | Status |
|-------------|------------------------|--------|
| **Multi-Tier Hydration** | Primary query to `crmApi.getCRMStaff(effectiveOrgId)` ingests active staff. Fallback 1 inspects `localStorage` key `credsmart_crm_staff_${effectiveOrgId}` both in mount effect (lines 265-292) and in `loadSalaryData` (lines 348-367). Fallback 2 queries `settingsApi.getMemberships(effectiveOrgId)` (lines 370-384) directly unpacking `m.user` / `m.profile` without dependency on `profiles` table. Fallback 3 conditionally queries PostgREST `profiles` only if `dirMap` is empty. | **VERIFIED PASS** |
| **Event Synchronization** | Hook in lines 649-657 binds `window.addEventListener("credsmart:crm_staff_updated", handleStaffUpdated)` invoking `loadSalaryData()`, with a return cleanup function executing `removeEventListener`. Memoized against `loadSalaryData` which is keyed to `effectiveOrgId`. | **VERIFIED PASS** |
| **Fallback Name Resolution** | Evaluated across `SalaryManagement.tsx`: line 450 (profiles fetch), line 548 (payslips fetch), line 600 (adjustments fetch), line 808 (drawer submit), line 1538 (desktop table), line 1647 (mobile cards). Always resolves to `staffDirectory[p.staff_id]?.name || p.staff_name || "Staff Member"`. | **VERIFIED PASS** |
| **Unconfigured Staff Roster** | Tab 1 derives `unconfiguredStaff` via `Object.values(staffDirectory).filter((m) => !configuredSet.has(m.id))` (lines 691-694). Renders dedicated table and cards below configured profiles with Amber "Not Configured" badge and 1-click "Configure Salary" action button. | **VERIFIED PASS** |
| **PostgREST Query Resilience** | In lines 411-413, 463-465, 509-511, 561-563, 610-612, `typeof (query as any).or === "function"` guards the `.or()` call and falls back to `.eq("org_id", effectiveOrgId)`, preventing `TypeError` on un-augmented query builders or mock instances. | **VERIFIED PASS** |

### 2.2 Integrity Inspection

- **Hardcoded Results / Facades**: None. `SalaryManagement.tsx` contains no hardcoded mock staff arrays (e.g., demo mock identities) and operates strictly on live API / storage state.
- **Dummy Implementations**: None. Full state machines, form validation (PF/ESI between 0-100%, non-negative wages, leave bounds), and dual-mode drawer handling are implemented.
- **Bypassed Requirements**: None. Worker implemented the exact multi-tier sequence and event synchronization specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
- **Attestation & Verification Authenticity**: Independently reproduced via CLI test runs and type check; logs and metrics match 100%.

### 2.3 Code Quality & Design System Conformance

- Conforms to `minimal-design-system.md`:
  - Buttons standardized (`h-7.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`).
  - Font scaling adheres to Inter for UI labels, IBM Plex Mono / tabular nums for amounts and percentages (`font-mono tabular-nums`).
  - Neutral canvas colors (`bg-slate-50`, `bg-white`, `border-slate-200/80` in light; `bg-slate-950`, `bg-slate-900`, `border-slate-800` in dark).
  - Semantic indicators: Emerald for active, Amber for unconfigured/pending, Blue for roles.
  - Mobile responsiveness: 375px mobile cards render full details without horizontal overflow.

---

## 3. Adversarial Review & Stress Testing

### 3.1 Challenge Scenarios

#### Challenge 1: LocalStorage Schema Invalidation / Malformed JSON
- **Assumption Challenged**: Cached staff directory in `localStorage` is valid JSON and contains expected object shape.
- **Attack Scenario**: Corrupted cache or user-edited localStorage with invalid JSON or primitive value (e.g. `credsmart_crm_staff_org1 = "invalid"`).
- **Blast Radius**: Could throw `SyntaxError` during `JSON.parse` and crash initial render.
- **Verification / Defense**:
  - Inspected lines 265-292 and lines 350-367.
  - Both parsing sites are wrapped in `try { ... } catch {}` blocks.
  - Both explicitly check `Array.isArray(parsed)`.
  - In case of parse error or non-array, it safely falls back to `{}` or the next tier.
- **Result**: **PASS (Defended)**.

#### Challenge 2: Incomplete User Object in Membership Record
- **Assumption Challenged**: Memberships returned by `settingsApi.getMemberships(effectiveOrgId)` always provide a valid `user` object with `full_name`.
- **Attack Scenario**: Membership record has `m.user = null` and only `m.email`.
- **Blast Radius**: Could throw `TypeError: Cannot read properties of undefined` or populate empty name.
- **Verification / Defense**:
  - Inspected line 374: `const userObj = m.user || m.profile || {};`.
  - Line 375: `const id = String(m.user_id || userObj.id || m.id || "");`.
  - Line 377: `const name = String(userObj.full_name || userObj.name || m.full_name || m.name || (userObj.email ? String(userObj.email).split("@")[0] : "Team Member"));`.
  - Safely extracts username from email prefix or defaults to `"Team Member"`.
- **Result**: **PASS (Defended)**.

#### Challenge 3: Listener Cleanup and Stale Closures
- **Assumption Challenged**: Rapid organization switching does not cause memory leaks or stale listeners for previous organizations.
- **Attack Scenario**: User switches from Org A to Org B rapidly.
- **Blast Radius**: Stale listener could fetch Org A data and populate Org B state.
- **Verification / Defense**:
  - `loadSalaryData` is memoized on `[effectiveOrgId]`.
  - `useEffect` for `credsmart:crm_staff_updated` has `[loadSalaryData]` in its dependency array and removes previous listener before re-registering.
  - Additionally, `loadedOrgRef.current` tracks active organization.
- **Result**: **PASS (Defended)**.

#### Challenge 4: Zero Staff Organization
- **Assumption Challenged**: A newly provisioned tenant with 0 staff members renders cleanly without infinite spinner or crash.
- **Attack Scenario**: Empty tenant logs into `/crm/salary`.
- **Blast Radius**: Empty directory could cause division by zero in preview or null dereferences.
- **Verification / Defense**:
  - `unconfiguredStaff` evaluates to `[]`.
  - Tab 1 renders `emptyMessage="No salary profiles configured yet."`.
  - Tab 2 "Generate Payroll" skips loop gracefully when `salaryProfiles` is empty.
- **Result**: **PASS (Defended)**.

---

## 4. Verification Evidence

### Independent Test Command Execution:
```powershell
cmd /c npx vitest run src/test/crmSalaryManagement.test.tsx src/test/crmSalaryTypes.test.ts src/test/crmPayrollUtils.test.ts
```
**Result**:
- Test Files: 3 passed (3)
- Tests: 94 passed (94)
- Duration: 75.46s

### Independent TypeScript Typecheck:
```powershell
cmd /c npx tsc --noEmit
```
**Result**:
- Exit code 0, 0 errors.

---

## 5. Review Conclusion

Worker M2's implementation is robust, complete, strictly adheres to design and architecture guidelines, and introduces zero regressions. The changes are recommended for immediate approval and milestone closure.
