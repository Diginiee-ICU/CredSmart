# Empirical Adversarial Challenge Report: Staff Directory Hydration & Query Resilience

**Milestone**: M2 — Salary & Payroll Staff Synchronization  
**Challenger**: Challenger 2 (`challenger_m2_2`)  
**Target Files**: `src/pages/crm/SalaryManagement.tsx`, `src/test/crmSalaryManagement.test.tsx`  
**Evaluation Date**: 2026-10-26T21:32:00Z  

---

## Challenge Summary

**Overall risk assessment**: **LOW**  
The implementation under review in `src/pages/crm/SalaryManagement.tsx` exhibits high architectural resilience and defense-in-depth across staff directory hydration, dynamic cross-module synchronization, and PostgREST query evaluation. 

The worker's solutions directly solved the defect where newly added staff were invisible in Salary Management:
1. Multi-tier hydration hierarchy (`crmApi.getCRMStaff` → synchronous/cached `localStorage` fallback → authoritative `settingsApi.getMemberships` fallback → mock `profiles` fallback) prevents empty rosters under network partitions or API degradation.
2. Cross-module event synchronization via `credsmart:crm_staff_updated` CustomEvent allows Role Management to dynamically trigger a staff roster re-hydration without requiring a page reload or state disruption.
3. PostgREST `.or()` resilience check `typeof (query as any).or === "function" ? ... : (query as any).eq("org_id", effectiveOrgId)` completely eliminates runtime `TypeError: query.or is not a function` in both production and test mock environments.
4. Tab 1 dual roster UX renders configured profiles in `CRMDataTable` (desktop) and cards (mobile), while rendering an "Unconfigured Staff" section with Amber "Not Configured" pills and 1-click "Configure Salary" buttons that pre-populate `formStaffId` in the drawer.

---

## Challenges & Stress Scenarios Evaluated

### [Medium] Challenge 1: crmApi Degradation & Corrupt Local Storage Fallback

- **Assumption challenged**: The client assumes that if `crmApi.getCRMStaff` fails, `localStorage` contains valid JSON, or that unhandled parse errors won't crash the React render tree.
- **Attack scenario**: Injected a simulated network crash (`Error: Network connection refused`), combined with invalid / corrupt JSON string (`{ broken json [!@#$`) and non-array JSON structures in `localStorage.getItem("credsmart_crm_staff_" + effectiveOrgId)`.
- **Blast radius**: If uncaught, a JSON parse error or TypeError during `.forEach` on a non-array would trigger an unhandled runtime error in `loadSalaryData`, halting page rendering and leaving the UI stuck in loading skeleton state.
- **Observed Defense**: `SalaryManagement.tsx` safely wraps both `localStorage.getItem` and `JSON.parse` in `try...catch` blocks and performs `Array.isArray(parsed)` guards on lines 265–291 and 350–367. When corrupt or non-array, it gracefully falls back to `settingsApi.getMemberships` and `profiles`.
- **Verdict**: **PASSED (Defended)**.

### [Low] Challenge 2: Incomplete or Missing Staff Names in Memberships

- **Assumption challenged**: The client assumes membership records from `settingsApi` always contain populated `full_name` or `user.name` strings.
- **Attack scenario**: Supplied membership records containing only `email` (e.g. `suresh.kumar@company.com`) or empty `full_name` and `name` strings (`""`).
- **Blast radius**: Roster displays `undefined`, `null`, or blank rows, confusing HR operators.
- **Observed Defense**: `SalaryManagement.tsx` applies a fallback ladder on line 377: `userObj.full_name || userObj.name || m.full_name || m.name || (userObj.email ? String(userObj.email).split("@")[0] : "Team Member")`.
- **Verdict**: **PASSED (Defended)**.

### [High] Challenge 3: Dynamic Event Synchronization (`credsmart:crm_staff_updated`)

- **Assumption challenged**: Dispatching `window.dispatchEvent(new CustomEvent('credsmart:crm_staff_updated'))` will correctly trigger `loadSalaryData`, refresh state without full reload, and properly clean up event listeners on unmount.
- **Attack scenario**: Provisioned new staff in simulated Role Management, dispatched the custom event, verified whether unconfigured staff roster updated immediately, and verified that `removeEventListener` was called on component unmount.
- **Blast radius**: Memory leaks if event listeners linger on page navigation; stale rosters if the event listener fails to invoke `loadSalaryData`.
- **Observed Defense**: `SalaryManagement.tsx` lines 649–657 registers the listener in a `useEffect` with dependency on `[loadSalaryData]` and returns `() => window.removeEventListener("credsmart:crm_staff_updated", handleStaffUpdated)`.
- **Verdict**: **PASSED (Defended)**.

### [High] Challenge 4: Query Builder Dual-Column Filter Resilience (`.or()` vs `.eq()`)

- **Assumption challenged**: PostgREST client and query builders consistently expose `.or()`. In mock test harnesses or non-standard adapters where `.or()` is absent, `query.or(...)` threw fatal `TypeError`.
- **Attack scenario**: Constructed a Supabase client mock where `query.or` is `undefined`. Verified queries on `crm_salary_profiles`, `crm_payroll_runs`, `crm_payslips`, `crm_salary_adjustments`, and `crm_attendance`.
- **Blast radius**: Application crashes on initial mount when querying salary records, causing complete feature outage.
- **Observed Defense**: `SalaryManagement.tsx` lines 411–413, 463–465, 509–511, 561–563, and 610–612 explicitly inspect `typeof (query as any).or === "function" ? (query as any).or(...) : (query as any).eq("org_id", effectiveOrgId)`. Both branches execute smoothly without throwing errors.
- **Verdict**: **PASSED (Defended)**.

### [Medium] Challenge 5: 1-Click Salary Configuration Lifecycle Transition

- **Assumption challenged**: Tapping "Configure Salary" on an unconfigured staff member opens the drawer with the correct `formStaffId`, and saving the profile removes the staff member from the unconfigured list and transitions them to configured profiles.
- **Attack scenario**: Rendered unconfigured staff member ("Deepak Chopra"), clicked "Configure Salary" button, submitted base salary ₹42,000, and verified database store upsert and state sync.
- **Blast radius**: If `formStaffId` is not pre-populated, the user must manually locate the staff member in a select dropdown, re-introducing friction; if saving does not remove them from unconfigured, duplicate records could be created.
- **Observed Defense**: `openConfigureForStaff` (line 739) pre-populates `formStaffId(staff.id)` in `create` mode. On save, `crm_salary_profiles` is upserted, and `unconfiguredStaff` useMemo recomputes `Object.values(staffDirectory).filter((m) => !configuredSet.has(m.id))`, cleanly transitioning the user.
- **Verdict**: **PASSED (Defended)**.

---

## Stress Test Results

| # | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---|-----------------|-------------------|-----------------|--------|
| 1 | `crmApi.getCRMStaff` throws network error | Fallback to `localStorage` key `credsmart_crm_staff_${orgId}` and display cached staff | Hydrated Pooja Sharma from `localStorage`, unconfigured badge displayed | **PASS** |
| 2 | `crmApi.getCRMStaff` returns empty AND `localStorage` is empty | Fallback to `settingsApi.getMemberships` and enrich user records | Hydrated Vikram Sethi and displayed "Delivery Associate" | **PASS** |
| 3 | `localStorage` contains invalid/corrupt JSON | Catch parse error silently without crash, fallback to database | No crash or unhandled rejection, rendered configured profiles safely | **PASS** |
| 4 | `localStorage` contains non-array JSON object | Guard against `.forEach` on non-array, fallback gracefully | Handled safely via `Array.isArray` check | **PASS** |
| 5 | Staff record has empty `full_name` and `name` | Extract prefix from email as display name | Displayed "suresh.kumar" from email prefix | **PASS** |
| 6 | Dispatch `credsmart:crm_staff_updated` event | Triggers `loadSalaryData` and updates unconfigured staff | Dynamic reload reflected "Rohan Verma" without page refresh | **PASS** |
| 7 | Component unmount | Deregister event listener from `window` | `window.removeEventListener` called with matching handler | **PASS** |
| 8 | Query builder lacking `.or()` method | Gracefully fall back to `.eq("org_id", effectiveOrgId)` | 0 runtime errors, loaded profiles smoothly | **PASS** |
| 9 | Query builder with standard `.or()` method | Execute dual-column filter `organization_id.eq.X,org_id.eq.X` | Filter executed, loaded profiles smoothly | **PASS** |
| 10 | Unconfigured staff table and cards | Render Amber "Not Configured" badge and "Configure Salary" button | Badges and buttons rendered in both desktop and mobile views | **PASS** |
| 11 | Click "Configure Salary" on unconfigured row | Open profile drawer with `formStaffId` pre-populated | Drawer opened in `create` mode with `staff-unconfigured-007` selected | **PASS** |
| 12 | Save configured profile for unconfigured staff | Upsert to store, remove from unconfigured, add to configured | Store updated, toast displayed, roster updated | **PASS** |
| 13 | Vitest test suite (`crmSalaryManagement.test.tsx`) | All 26 unit tests pass | 26 passed (26 total) | **PASS** |
| 14 | TypeScript compilation (`tsc --noEmit`) | 0 compile/type errors | Exit code 0, 0 errors | **PASS** |

---

## Unchallenged Areas

- **Backend Express Route /api/crm/staff/provision**: Scoped under Milestone 1 and Milestone 3 (Task Assignment & Role Management).
- **POS / Billing Route Lockdown**: Scoped under Milestone 4.
- **jsPDF Off-Screen Generation**: Scoped under Milestone M2 Challenger 1 (Lifecycle & Deductions) and previously verified in `crmPayslipPdf.test.ts`.
