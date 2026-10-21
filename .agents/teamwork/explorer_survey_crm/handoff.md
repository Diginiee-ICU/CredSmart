# CRM Suite Architecture & Pages Investigation (Survey 2)

**Author**: Explorer 2 (Survey 2 - CRM Suite Architecture & Pages)  
**Date**: 2026-10-21  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_crm`  
**Status**: COMPLETE  

---

## 1. Observation

### 1.1 `src/App.tsx` Routing Analysis & Line 247 Defect
- **Direct Code Observation (`src/App.tsx:243-253`)**:
  ```tsx
  {/* CRM Command Center & Sub-Systems */}
  <Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />
  <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
  <Route path={ROUTE_PATHS.crmSalary} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmTasks} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmMeet} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmBroadcasts} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmAiAssistant} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmSupport} element={<CRMDashboard />} />
  ```
- **Direct Imports Observation (`src/App.tsx:66-69`)**:
  ```tsx
  import CRMDashboard from "@/pages/crm/CRMDashboard";
  import RoleManagement from "@/pages/crm/RoleManagement";
  import Attendance from "@/pages/crm/Attendance";
  ```
  `SalaryManagement` is **never imported** in `src/App.tsx`.
- **Line 247 Exact Content**:
  `line 247: <Route path={ROUTE_PATHS.crmSalary} element={<CRMDashboard />} />`
  The salary route `/crm/salary` mistakenly points to `<CRMDashboard />` instead of `<SalaryManagement />`.

### 1.2 `src/pages/crm/CRMDashboard.tsx` Runtime Crashing Bug
- **File Length**: 408 lines.
- **Direct Code Observation (`src/pages/crm/CRMDashboard.tsx:157-166`)**:
  ```tsx
  {
    title: "Salary & Payroll",
    description: "Automated wage calculation, advances, deductions, and pay slips",
    url: ROUTE_PATHS.crmSalary,
    icon: Award,
    badge: "Phase 2",
    accentColor: "#10B981",
    bgLight: "bg-emerald-50/70",
    borderLight: "border-emerald-200/80",
  },
  ```
- **Direct Imports Observation (`src/pages/crm/CRMDashboard.tsx:1-16`)**:
  ```tsx
  import React, { useState, useEffect, useCallback } from "react";
  import { Link } from "react-router-dom";
  import {
    Users,
    CalendarCheck,
    CheckSquare,
    Radio,
    Video,
    Bot,
    LifeBuoy,
    Shield,
    ArrowRight,
    RotateCw,
    Sparkles,
    Layers,
  } from "lucide-react";
  ```
  Notice that `Award` is referenced on line 161, but is **omitted from the `lucide-react` import statement**.
- **Empirical Test Verification**:
  Running `cmd /c npx vitest run src/test/crmShellRoutes.test.ts` and `src/test/crmDashboardResilience.test.tsx`:
  ```
  FAIL src/test/crmShellRoutes.test.ts > renders CRMDashboard with live stat cards and quick module navigation links
  ReferenceError: Award is not defined
   ❯ CRMDashboard src/pages/crm/CRMDashboard.tsx:161:13
      160| url: ROUTE_PATHS.crmSalary,
      161| icon: Award,
         |       ^
  ```
  18 unit tests in `src/test/crmDashboardResilience.test.tsx` fail with this identical `ReferenceError`.

### 1.3 `src/pages/crm/SalaryManagement.tsx` Implementation Status
- **File Length**: 2,155 lines.
- **Current State**: Complete, production-grade 4-tab workflow:
  1. `profiles`: Staff compensation list (`CRMDataTable`), create/edit drawer with salary type (`monthly`/`daily`/`hourly`), base pay (₹), allowed leaves, overtime rate, PF%, ESI%.
  2. `payroll`: Month picker, "Generate Payroll Preview" button (invoking `generatePayslipData` from `crmPayrollUtils.ts`), preview summary table, "Lock Payroll" button, "Mark as Disbursed" button.
  3. `adjustments`: Advances, bonuses, deductions ledger with status badges, "Record Advance" slide-over drawer, approve/reject workflow.
  4. `payslips`: Self-service employee payslip cards with vector PDF download (`generatePayslipPDF` via jsPDF primitives).
- **Permissions Gating**:
  Top-level gating via:
  ```tsx
  <CRMPermissionGate module="salary" action="view" fallback={<SalaryAccessRestrictedFallback />}>
  ```
  Action gating:
  - Add/Edit Profile: `canEdit` (requires `salary:edit` or `isSuperAdmin`)
  - Payroll generation & lock: `canApprove` (requires `salary:approve` or `isSuperAdmin`)
  - Record Advance: open to authenticated CRM staff; Approve/Reject gated by `canApprove`.
- **Formatting**: Full Indian currency notation `formatIndianCurrency` (e.g. `₹54,200.00`).
- **Resilience**: Full localStorage cache keys (`credsmart_crm_salary_profiles_${orgId}`, `credsmart_crm_payroll_runs_${orgId}`, `credsmart_crm_payslips_${orgId}`, `credsmart_crm_salary_adjustments_${orgId}`).

### 1.4 `src/pages/crm/Attendance.tsx` Implementation Status
- **File Length**: 2,403 lines.
- **Current State**: Complete, production-grade attendance & geo-tracking hub:
  1. `pod` tab: Staff Clock-In / Clock-Out pod with live digital clock, elapsed session stopwatch, live GPS radar distance calculation (`crmGeoUtils.ts`), geofence compliance indicator (`isWithinGeofence`), single-touch action button (Emerald for Clock In, Orange for Clock Out).
  2. `logs` tab: Daily attendance roster (`CRMDataTable`), date picker, status filter (`present`, `absent`, `half_day`, `on_leave`), dynamic role filter, CSV export, and PDF export (`crmAttendancePdf.ts`).
  3. `geofences` tab / modal: Office location management (add/edit office lat, lon, radius in meters).
  4. `requests` tab / modal: Missed punch regularisation request submission and manager approval drawer.
- **Permissions Gating**:
  Wrapped in:
  ```tsx
  <CRMPermissionGate module="attendance" action="view" fallback={<AccessRestricted />}>
  ```
  Admin actions (geofence management, review regularisation) gated by `canEdit = isSuperAdmin || hasPermission("attendance", "edit")`.
- **Resilience**: Offline local storage fallbacks for geofences, attendance records, and requests.

### 1.5 `src/pages/crm/RoleManagement.tsx` Implementation Status
- **File Length**: 1,541 lines.
- **Current State**: Custom configurable role system with zero hardcoded roles:
  1. Configured CRM roles cards: shows role name, custom hex color pill, custom icon, total assigned staff, and enabled action count out of 14.
  2. Create Custom Role Modal: custom name, color picker palette, Lucide icon selector.
  3. Granular permissions toggle matrix: 7 modules, 14 actions (Attendance view/edit, Salary view/edit, Tasks view/create/approve, Meetings view/create, Broadcasts view/send, AI Assistant access, Support view/manage).
  4. Staff assignment table: searchable directory of organization members, role selector dropdown, and "Make Super Admin" promotion trigger.
- **Permissions Gating**:
  Viewable by all authenticated users. Modifying roles, matrix toggles, or staff assignments strictly requires:
  `isSuperAdminOrOwner = userRole === "store_owner" || userRole === "super_admin" || userRole === "admin" || userRoles.some(r => r.is_super_admin)`.
  Non-admins see a prominent "Read-Only Mode" banner with locked toggles.

### 1.6 Sub-Modules Investigation (`/crm/tasks`, `/crm/broadcasts`, `/crm/meet`, `/crm/ai`, `/crm/support`)
- **Direct Search for Submodule Components**:
  - `src/pages/crm/`: Contains only `Attendance.tsx`, `CRMDashboard.tsx`, `RoleManagement.tsx`, and `SalaryManagement.tsx`.
  - There are **ZERO dedicated component files** for Tasks, Broadcasts, Meet, AI Assistant, or Support.
- **Direct Route Inspection (`src/App.tsx:248-252`)**:
  - `crmTasks` (`/crm/tasks`) -> `<CRMDashboard />`
  - `crmMeet` (`/crm/meet`) -> `<CRMDashboard />`
  - `crmBroadcasts` (`/crm/broadcasts`) -> `<CRMDashboard />`
  - `crmAiAssistant` (`/crm/ai-assistant`) -> `<CRMDashboard />`
  - `crmSupport` (`/crm/support`) -> `<CRMDashboard />`
- **Route Constants in `src/config/routes.ts:92-97`**:
  ```ts
  crmTasks: "/crm/tasks",
  crmMeet: "/crm/meet",
  crmBroadcasts: "/crm/broadcasts",
  crmAiAssistant: "/crm/ai-assistant",
  crmSupport: "/crm/support",
  ```
  Note: `ROUTE_PATHS.crmAiAssistant` is `"/crm/ai-assistant"`. The prompt also references `/crm/ai`. Aliasing `/crm/ai` to the same route ensures both URLs resolve properly.

### 1.7 CRM Design System Components (`src/components/crm/*`)
- **Direct File Inspection**:
  - `CRMCard.tsx`: Variants (`default`, `elevated`, `brand`, `outline`, `glass`), brand colors token object `CRM_BRAND_COLORS`.
  - `CRMBadge.tsx`: Semantic variants (`success`, `warning`, `error`, `info`, `neutral`, `orange`) with optional pulse dot.
  - `CRMDataTable.tsx`: Generic data table with client search filter, column sorting, pagination bar (`usePagination`).
  - `CRMPageHeader.tsx`: Breadcrumb trail, title, subtitle, inline badge, right-aligned action buttons slot.
  - `CRMStatCard.tsx`: Metric card with icon pod, numeric value, label, trend indicator, accent color styling.
  - `CRMPermissionGate.tsx`: Declarative permission wrapper using `useCRMPermission(module, action)`.
  - `CRMRolePill.tsx`: Colored pill dynamically calculating 15% alpha background and 35% alpha border from hex colors.
  - `index.ts`: Re-exports all 7 components and brand tokens.

---

## 2. Logic Chain

1. **Routing Inconsistency (App.tsx Line 247)**:
   - Observation 1.1 shows `SalaryManagement.tsx` exists (2,155 lines) but is never imported in `src/App.tsx`.
   - Observation 1.1 shows line 247 assigns `<Route path={ROUTE_PATHS.crmSalary} element={<CRMDashboard />} />`.
   - Inference: Navigating to `/crm/salary` renders the dashboard instead of the payroll system. Importing `SalaryManagement` and mounting it at `ROUTE_PATHS.crmSalary` directly solves the route defect.

2. **CRMDashboard Runtime Crash**:
   - Observation 1.2 shows `Award` is referenced at `CRMDashboard.tsx:161` but is omitted from imports.
   - Observation 1.2 proves that mounting `<CRMDashboard>` throws `ReferenceError: Award is not defined`.
   - Inference: Adding `Award` to the `lucide-react` import statement immediately fixes the crash and resolves 18 failing unit tests.

3. **Submodule Placeholder Limitation**:
   - Observation 1.6 shows `/crm/tasks`, `/crm/broadcasts`, `/crm/meet`, `/crm/ai`, and `/crm/support` route to `<CRMDashboard />`.
   - When a user clicks "Open Module" on any of these cards on the dashboard, the route changes in the browser address bar, but `<CRMDashboard />` renders again.
   - Inference: To satisfy Requirement R6, dedicated, high-density views must be created for each of these 5 sub-modules under `src/pages/crm/` and wired in `src/App.tsx`.

4. **High-Density Stripe/Linear Design Alignment**:
   - The CRM components in `src/components/crm/` currently use soft shadows and standard rounded corners (`rounded-2xl`, `shadow-2xs`).
   - The Stripe/Linear design aesthetic requires:
     - Hairline borders (`border-slate-200 dark:border-slate-800` or `border-zinc-200`)
     - High information density (compact paddings `py-2.5 px-3.5`, zero wasted white space)
     - Monospaced tabular numerals (`font-mono tabular-nums`) for currency (₹), counts, percentages, and timestamps
     - Pill badges with micro-dots for statuses (Paid/Present = Emerald, Pending/Draft = Amber, Urgent = Rose)
     - Touch ergonomics on mobile: minimum 44px hit targets and thumb-zone actions
     - Mobile accordion views for complex tables (such as RoleManagement's 14-action matrix).

---

## 3. Caveats

- **Create Invoice Flow Protection**: The Create Invoice flow (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) is strictly protected and must NOT be modified in any CRM refactoring.
- **Backend API Contract**: Real data queries use `crmApi` and `settingsApi` which communicate with `https://api.credsmart.online/api/*`. Offline fallback caches (`localStorage`) are present across all CRM pages and must be maintained to prevent UI breaks when offline or in development mock environments.
- **Route Aliasing**: `src/config/routes.ts` defines `ROUTE_PATHS.crmAiAssistant` as `"/crm/ai-assistant"`. If `/crm/ai` is also accessed, a redirect or dual route in `src/App.tsx` must be maintained so neither URL 404s.

---

## 4. Conclusion & Action Plan

### Recommended Implementation Steps

#### Step 1: Fix `CRMDashboard.tsx` Missing Import (Immediate Bug Fix)
- In `src/pages/crm/CRMDashboard.tsx:3-16`, add `Award` to the `lucide-react` import list:
  ```diff
  --- a/src/pages/crm/CRMDashboard.tsx
  +++ b/src/pages/crm/CRMDashboard.tsx
  @@ -3,6 +3,7 @@ import { Link } from "react-router-dom";
   import {
     Users,
     CalendarCheck,
  +  Award,
     CheckSquare,
     Radio,
     Video,
  ```

#### Step 2: Fix `src/App.tsx` Line 247 & Submodule Routing
- In `src/App.tsx`, import `SalaryManagement` and dedicated submodule pages:
  ```diff
  --- a/src/App.tsx
  +++ b/src/App.tsx
  @@ -68,2 +68,7 @@ import RoleManagement from "@/pages/crm/RoleManagement";
   import Attendance from "@/pages/crm/Attendance";
  +import SalaryManagement from "@/pages/crm/SalaryManagement";
  +import Tasks from "@/pages/crm/Tasks";
  +import Broadcasts from "@/pages/crm/Broadcasts";
  +import Meet from "@/pages/crm/Meet";
  +import AIAssistant from "@/pages/crm/AIAssistant";
  +import Support from "@/pages/crm/Support";
  @@ -247,5 +252,6 @@
  -                    <Route path={ROUTE_PATHS.crmSalary} element={<CRMDashboard />} />
  -                    <Route path={ROUTE_PATHS.crmTasks} element={<CRMDashboard />} />
  -                    <Route path={ROUTE_PATHS.crmMeet} element={<CRMDashboard />} />
  -                    <Route path={ROUTE_PATHS.crmBroadcasts} element={<CRMDashboard />} />
  -                    <Route path={ROUTE_PATHS.crmAiAssistant} element={<CRMDashboard />} />
  -                    <Route path={ROUTE_PATHS.crmSupport} element={<CRMDashboard />} />
  +                    <Route path={ROUTE_PATHS.crmSalary} element={<SalaryManagement />} />
  +                    <Route path={ROUTE_PATHS.crmTasks} element={<Tasks />} />
  +                    <Route path={ROUTE_PATHS.crmMeet} element={<Meet />} />
  +                    <Route path={ROUTE_PATHS.crmBroadcasts} element={<Broadcasts />} />
  +                    <Route path={ROUTE_PATHS.crmAiAssistant} element={<AIAssistant />} />
  +                    <Route path="/crm/ai" element={<AIAssistant />} />
  +                    <Route path={ROUTE_PATHS.crmSupport} element={<Support />} />
  ```

#### Step 3: Implement 5 Dedicated Submodule Views (`src/pages/crm/`)
Each submodule should be a dedicated view built with the CRM design system (`CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMStatCard`, `CRMPermissionGate`):
1. **`Tasks.tsx` (`/crm/tasks`)**:
   - Permission gate: `tasks:view`, `tasks:create`, `tasks:approve`.
   - UI: High-density Kanban / Table view of store jobs, priority pill badges (`Urgent`, `High`, `Normal`, `Low`), status columns (`To Do`, `In Progress`, `Review`, `Done`), slide-over drawer to create task and assign to staff, mark proof of work.
2. **`Broadcasts.tsx` (`/crm/broadcasts`)**:
   - Permission gate: `broadcasts:view`, `broadcasts:send`.
   - UI: Feed of company bulletins and store notices, urgency badges (`Urgent Alert`, `Operational`, `General`), target audience pill (`All Staff`, `Cashiers`, `Managers`), slide-over drawer to compose and broadcast instant announcements.
3. **`Meet.tsx` (`/crm/meet`)**:
   - Permission gate: `meetings:view`, `meetings:create`.
   - UI: Scheduled shift huddles and video conference rooms, instant room link generator, upcoming huddles calendar, attendee pills.
4. **`AIAssistant.tsx` (`/crm/ai-assistant` & `/crm/ai`)**:
   - Permission gate: `ai_assistant:access`.
   - UI: Linear-style AI command prompt interface with quick action prompt pills (e.g. "Draft WhatsApp payment reminder for overdue parties", "Summarize today's attendance & overtime", "Analyze top-selling product margins"), conversational message stream.
5. **`Support.tsx` (`/crm/support`)**:
   - Permission gate: `support:view`, `support:manage`.
   - UI: High-density customer support desk and internal ticket queue, SLA countdown badge, status filter (`Open`, `In Progress`, `Resolved`, `Closed`), priority tags, ticket reply thread drawer.

#### Step 4: Stripe/Linear High-Density Aesthetic Refinements
- **Hairline Borders**: Set hairline borders `border border-slate-200/90 dark:border-slate-800` across all cards and tables.
- **High Information Density**: Ensure compact paddings (`py-2.5 px-3.5` in tables, `p-4 sm:p-5` in cards) with zero wasted vertical whitespace.
- **Monospaced Numerals**: Use `font-mono tabular-nums` for all numbers, currency (`₹`), hours, and dates.
- **Mobile Touch Layout**:
  - RoleManagement: Provide mobile accordion cards grouping the 14 actions by module with responsive switches.
  - Attendance: Ensure clock in/out touch target is 56px+ in the thumb zone with instant color feedback.
  - Salary: Swipeable horizontal tab bar with card streams for mobile payslips.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **TypeScript Typecheck**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected result*: Exit code 0 with zero errors across all files.

2. **Run CRM Shell and Route Tests**:
   ```powershell
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts
   ```
   *Expected result*: 22/22 tests passing (resolving the previous `Award is not defined` failure).

3. **Run CRM Dashboard Resilience Tests**:
   ```powershell
   cmd /c npx vitest run src/test/crmDashboardResilience.test.tsx
   ```
   *Expected result*: All 20 tests passing.

4. **Run CRM Payroll & Calculation Tests**:
   ```powershell
   cmd /c npx vitest run src/test/crmPayrollUtils.test.ts
   ```
   *Expected result*: 48/48 tests passing.

5. **Run Full CRM Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/crm*.test.*
   ```
   *Expected result*: All existing CRM tests pass cleanly without regressions.

### 5.2 Invalidation Conditions
- If `src/App.tsx` line 247 continues rendering `<CRMDashboard />`, the route verification fails.
- If `CRMDashboard.tsx` does not import `Award`, it will throw a `ReferenceError` in React rendering.
- If `/crm/tasks`, `/crm/broadcasts`, `/crm/meet`, `/crm/ai`, and `/crm/support` continue rendering `CRMDashboard` rather than their dedicated views, the submodule requirement is invalidated.
- If any file in `src/components/invoices/mobile/` or `SalesInvoiceModal.tsx` is modified, the protected invoicing requirement is violated.
