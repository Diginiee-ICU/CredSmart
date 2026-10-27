# In-Depth Survey Report: Frontend Staff, Salary & Tasks Workflows
**CredSmart CRM Defects Elimination (Requirements R2 & R3)**

**Explorer**: `explorer_survey_staff_salary`  
**Date**: 2026-10-26T20:20:00Z  
**Target Scope**: 
1. Requirement R2: Salary & Payroll Staff Synchronization (`SalaryManagement.tsx`, `crmApi.ts`, hooks, database tables)
2. Requirement R3: Reliable Task Assignment & Persistence (`Tasks.tsx`, `RoleManagement.tsx`, `crmApi.ts`, backend API endpoints `/api/crm/tasks`)

---

## 1. Executive Summary

This forensic survey provides an exact architectural and code-level investigation into two major defect clusters in CredSmart CRM:
1. **Salary Management Staff Invisibility (R2)**: Newly provisioned staff members vanish from `SalaryManagement.tsx`, causing `staffDirectory` to be empty or unconfigured staff to be completely hidden. As a result, store owners are presented with "No salary profiles configured yet" and cannot select staff in the configuration drawers.
2. **Task Assignment Failure & Ghost Tasks (R3)**: Task creation frequently fails with HTTP 400 `"Assigned user does not belong to this organization"` when assigned to newly added staff. The frontend generates client-side synthetic IDs (`user-178...` or `user-${Date.now()}`), optimistic updates are never verified or rolled back on failure, and on page refresh the unpersisted task permanently vanishes. Furthermore, organizations with 0 tasks are trapped showing hardcoded mock demo tasks (`INITIAL_TASKS`: Rahul Sharma, Pooja Verma, etc.).

Below is the complete evidence chain, root-cause analysis, and implementation roadmap to achieve 100% reliability, multi-tenant isolation, and zero regressions.

---

## 2. Requirement R2: Salary & Payroll Staff Synchronization

### 2.1 Architectural Overview & Current Call Chain

In `src/pages/crm/SalaryManagement.tsx`, compensation profiles, monthly payroll calculations, advances/deductions, and payslips are managed across 4 tabs:
- Tab 1: `profiles` (Salary Profiles)
- Tab 2: `payroll` (Payroll Run & Monthly Payouts)
- Tab 3: `adjustments` (Advances & Deductions)
- Tab 4: `payslips` (Self-Service & Admin Payslips)

The component maintains two distinct state entities for staff:
1. `staffDirectory: Record<string, StaffDirectoryMember>`: A dictionary of all staff members belonging to the active organization (`id`, `name`, `email`, `roleName`).
2. `salaryProfiles: CrmSalaryProfile[]`: Only records loaded from table `crm_salary_profiles` in PostgreSQL.

### 2.2 Forensic Bug Root Cause Analysis for R2

#### Root Cause 2.A: Severe Data Disconnect Between `salaryProfiles` and `staffDirectory`
- **Location**: `src/pages/crm/SalaryManagement.tsx`, lines 1430–1576 (Desktop Table & Mobile Cards).
- **Mechanism**:
  - The UI in Tab 1 renders **exclusively** from `salaryProfiles`:
    ```tsx
    // Line 1434-1435:
    <CRMDataTable<CrmSalaryProfile>
      data={salaryProfiles}
      ...
      emptyMessage="No salary profiles configured yet."
    />
    // Line 1535-1541 (Mobile Cards View):
    {salaryProfiles.length === 0 ? (
      <div className="p-8 text-center text-xs text-slate-500">
        No salary profiles configured yet.
      </div>
    ) : (
      salaryProfiles.map((p) => ...)
    )}
    ```
  - When staff are provisioned in `RoleManagement.tsx` (via `POST /api/crm/staff/provision`), they are registered into `users`, `org_memberships`, and `crm_staff_assignments`.
  - **No record is created in `crm_salary_profiles` at provisioning time.**
  - Because `salaryProfiles` only queries `crm_salary_profiles`, newly provisioned staff **never appear in Tab 1**.
  - If a company has 10 provisioned staff but none have a salary profile yet, `salaryProfiles` is `[]`, and the page displays "No salary profiles configured yet."
  - Unconfigured staff are completely invisible on the main roster, leaving the user with zero visual indication that their staff members exist.

#### Root Cause 2.B: Supabase Direct PostgREST Query to Non-Existent `profiles` Table
- **Location**: `src/pages/crm/SalaryManagement.tsx`, lines 316–346.
- **Code**:
  ```ts
  if (!staffData) {
    try {
      let memberUserIds: string[] = [];
      const { data: memberRows } = await supabase
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", effectiveOrgId);
      if (memberRows && memberRows.length > 0) {
        memberUserIds = memberRows.map((m: any) => m.user_id).filter(Boolean);
      } else {
        const memRes = await settingsApi.getMemberships(effectiveOrgId);
        if (memRes.data && Array.isArray(memRes.data)) {
          memberUserIds = memRes.data.map((m: any) => m.user_id).filter(Boolean);
        }
      }

      if (memberUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("*")
          .in("id", memberUserIds);
        if (profs && Array.isArray(profs) && profs.length > 0) {
          staffData = profs as Record<string, unknown>[];
        } else {
          const res = await settingsApi.getProfiles({ ids: memberUserIds });
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            staffData = res.data as Record<string, unknown>[];
          }
        }
      }
    } catch {}
  }
  ```
- **Mechanism**:
  - In CredSmart's architecture, authenticated user profiles reside in table `users`, while `profiles` is either non-existent or unpopulated by backend provisioning.
  - Furthermore, `settingsApi.getMemberships(effectiveOrgId)` (backed by `backend-api/src/routes/settings.js:140-220`) **already returns enriched user data**:
    `u.email, u.full_name, u.name, u.phone, u.avatar_url`!
  - `SalaryManagement.tsx` throws away this enriched user data, reduces it to `memberUserIds: string[]`, and then queries `supabase.from("profiles")` which returns 0 rows.
  - When both `crmApi.getCRMStaff` and the fallback fail, `staffDirectory` remains `{}`.

#### Root Cause 2.C: Total Absence of LocalStorage Staff Cache Rehydration & Event Listening
- **Location**: `src/pages/crm/SalaryManagement.tsx`, lines 237–268 and 304–358.
- **Mechanism**:
  - `CRMDashboard.tsx` and `Tasks.tsx` both utilize `localStorage.getItem("credsmart_crm_staff_" + orgId)` for instant optimistic rehydration.
  - `SalaryManagement.tsx` line 265 explicitly executes `setStaffDirectory({});` on organization context changes and **never checks** `credsmart_crm_staff_${effectiveOrgId}`.
  - Furthermore, `RoleManagement.tsx` fires `window.dispatchEvent(new CustomEvent("credsmart:crm_staff_updated"))` when a staff member is provisioned or assigned.
  - `Tasks.tsx` listens to this event (`window.addEventListener("credsmart:crm_staff_updated", handleSync)`).
  - `SalaryManagement.tsx` **does not listen** to `credsmart:crm_staff_updated`. If an admin provisions staff in Role Management and navigates to Salary Management, `SalaryManagement.tsx` is completely unaware of newly provisioned staff until a hard browser refresh.

#### Root Cause 2.D: Empty Staff Selection Dropdowns in Profile Creation Drawer
- **Location**: `src/pages/crm/SalaryManagement.tsx`, lines 2743–2756.
- **Code**:
  ```tsx
  <select
    id="profile-staff"
    aria-label="Select Staff"
    value={formStaffId}
    onChange={(e) => setFormStaffId(e.target.value)}
  >
    <option value="">-- Choose Staff Member --</option>
    {Object.values(staffDirectory).map((s) => (
      <option key={s.id} value={s.id}>
        {s.name} ({s.roleName})
      </option>
    ))}
  </select>
  ```
- **Mechanism**:
  - Because `staffDirectory` is empty or failed to load, `Object.values(staffDirectory)` has length 0.
  - When the admin clicks "Add New Profile" / "Configure Salary", the modal dropdown displays only `-- Choose Staff Member --`.
  - The admin cannot configure a salary profile, trapping them in an inescapable dead-end.

---

### 2.3 Comprehensive Blueprint for R2 Implementation

To permanently fix Salary & Payroll Staff Synchronization:

#### 1. Robust Authoritative Staff Directory Loading
Refactor `loadSalaryData` in `SalaryManagement.tsx` to use an authoritative 3-tier cascade:
- **Tier 1 (Authoritative Backend)**: `crmApi.getCRMStaff(effectiveOrgId)`. If `res.data && res.data.length > 0`, populate `dirMap`.
- **Tier 2 (Optimistic Local Cache)**: Read `localStorage.getItem("credsmart_crm_staff_" + effectiveOrgId)`. If available, hydrate any missing staff members into `dirMap`.
- **Tier 3 (Authoritative Membership Endpoint)**: `settingsApi.getMemberships(effectiveOrgId)`. Directly ingest `m.user_id`, `m.name`, `m.full_name`, `m.email`, `m.role` from `res.data` without discarding them or querying the non-existent `profiles` table.
- **Event Synchronization**: Wire `window.addEventListener("credsmart:crm_staff_updated", loadSalaryData)` in a `useEffect` hook so that any staff member provisioned or role assigned in Role Management instantly updates the Salary Management directory.

#### 2. Dual Roster / Unified Roster in Tab 1 (Configured + Unconfigured Staff)
Instead of rendering *only* `salaryProfiles` in Tab 1, present a complete compensation directory:
- Calculate `unconfiguredStaff` from `staffDirectory`:
  ```ts
  const unconfiguredStaff = useMemo(() => {
    const configuredSet = new Set(salaryProfiles.map((p) => p.staff_id));
    return Object.values(staffDirectory).filter((m) => !configuredSet.has(m.id));
  }, [salaryProfiles, staffDirectory]);
  ```
- In Tab 1 Desktop and Mobile views, render:
  1. **Configured Profiles Section**: The existing `<CRMDataTable<CrmSalaryProfile>>` showing active profiles with Base Wage, Leave Policy, PF/ESI, and Edit button.
  2. **Unconfigured Staff Section / Prominent Action Table**:
     - Render a dedicated card or sub-table showing all staff members in the organization who do not yet have a salary profile.
     - Display: Avatar initial, Staff Full Name, Email, Store/CRM Role, Status Badge (`"Profile Missing"` in Amber/Neutral).
     - **1-Click Quick Action Button**: A prominent `"Configure Salary"` (Desktop: `h-7.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white`) and (Mobile: touch-friendly CTA).

#### 3. 1-Click Salary Profile Creation Action
When clicking `"Configure Salary"` on an unconfigured staff row:
- Directly invoke `openCreateProfileDrawer(staffMember)`:
  - Pre-populates `formStaffId` with `staffMember.id`.
  - Automatically selects `staffMember.name` and displays their role.
  - Pre-fills standard sensible defaults (`salary_type: "monthly"`, `allowed_leaves: "2"`, `overtime_rate: "0"`, `pf_percent: "0"`, `esi_percent: "0"`, `is_active: true`).
  - Sets focus directly to `formBaseAmount` for instant numerical input.
  - Upon submission (`handleSaveProfile`), saves via `crmApi.upsertCRMSalaryProfile(...)` and immediately migrates the staff member from the Unconfigured list to the Configured list without page reload.

---

## 3. Requirement R3: Reliable Task Assignment & Persistence

### 3.1 Architectural Overview & Current Call Chain

Task assignment and tracking is handled across:
- **Frontend Page**: `src/pages/crm/Tasks.tsx`
- **Frontend API Client**: `src/services/crmApi.ts` (`getCRMTasks`, `createCRMTask`, `transitionCRMTaskStatus`, `updateCRMTask`, `deleteCRMTask`)
- **Backend Handlers**: `backend-api/src/routes/crm.js`
  - `GET /api/crm/tasks` (lines 1644–1750)
  - `POST /api/crm/tasks` (lines 1803–1909)
  - `PATCH /api/crm/tasks/:id` (lines 1912–2067)
  - Helper `verifyUserInOrg(cleanAssignee, orgId)` (lines 34–90)

---

### 3.2 Forensic Bug Root Cause Analysis for R3

#### Root Cause 3.A: Origin and Propagation of Synthetic Staff IDs
- **Location**: `src/pages/crm/RoleManagement.tsx`, lines 1067–1070 and lines 1145–1175.
- **Trace**:
  1. In `RoleManagement.tsx`, `handleSaveStaff` calls `crmApi.provisionStaffUser(payload, orgId)`:
     ```ts
     const res = await crmApi.provisionStaffUser(payload, orgId);
     const assignedRole = roles.find((r) => r.id === crmRoleIdToAssign);
     const newUserId = res?.data?.user?.id || `user-${Date.now()}`;
     ```
  2. In `src/lib/apiClient.ts`, `apiPost` catches 4xx/5xx HTTP responses (e.g. status 400, 409 duplicate email, or 500) and returns:
     `{ data: null, error: { message: "...", status: 400 } }`.
  3. `apiPost` **does not throw**.
  4. `RoleManagement.tsx` **never checks `if (res.error)`**.
  5. Because `res.data` is `null`, `res?.data?.user?.id` evaluates to `undefined`.
  6. The expression falls back to `const newUserId = user-${Date.now()}` (e.g., `user-1784920481234`).
  7. `RoleManagement.tsx` then builds:
     ```ts
     const newStaffEntry: StaffMember = {
       id: newUserId, // synthetic ID!
       membershipId: `mem-${Date.now()}`,
       name: payload.full_name,
       role: payload.store_role,
       ...
     };
     setStaffList(nextStaffList);
     localStorage.setItem(`credsmart_crm_staff_${orgId}`, JSON.stringify(nextStaffList));
     ```
  8. It displays a green success toast: `"Staff member provisioned successfully!"`, misleading the store owner into believing the staff was persisted in PostgreSQL.
  9. The catch block on line 1148 also generates `fallbackUserId = "user-" + Date.now()` and saves it to localStorage.

#### Root Cause 3.B: Backend Multi-Tenant Validation Rejection
- **Location**: `backend-api/src/routes/crm.js`, lines 1825–1835 in `POST /api/crm/tasks`.
- **Trace**:
  1. In `POST /api/crm/tasks`:
     ```js
     const rawAssignee = assigned_to || assignee_id;
     let targetAssignee = null;
     if (rawAssignee && typeof rawAssignee === 'string' && rawAssignee.trim() && !['unassigned', 'none', 'null', 'undefined'].includes(rawAssignee.trim().toLowerCase())) {
       const cleanAssignee = rawAssignee.trim();
       // Strict tenant isolation: verify that the assigned user belongs to this organization
       const belongs = await verifyUserInOrg(cleanAssignee, orgId);
       if (!belongs) {
         return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
       }
       targetAssignee = cleanAssignee;
     }
     ```
  2. The function `verifyUserInOrg(userId, orgId)` queries PostgreSQL:
     ```sql
     SELECT 1 FROM (
       SELECT user_id FROM org_memberships WHERE user_id = $1 AND org_id = $2
       UNION
       SELECT user_id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2
       UNION
       SELECT COALESCE(user_id, staff_id) AS user_id FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1) AND (org_id = $2 OR organization_id = $2)
     ) m LIMIT 1
     ```
  3. When `cleanAssignee` is a synthetic ID (`user-178...`):
     - It does not exist in `users`, `org_memberships`, or `crm_staff_assignments`.
     - In Postgres, if `user_id` is of type `UUID`, passing `'user-178...'` may even throw a syntax error or return 0 rows.
     - `verifyUserInOrg` returns `false`.
  4. The backend rejects the request with HTTP 400:
     `{ error: 'Assigned user does not belong to this organization' }`.

#### Root Cause 3.C: Frontend Error Suppression and Optimistic Drift in `Tasks.tsx`
- **Location**: `src/pages/crm/Tasks.tsx`, lines 426–497.
- **Trace**:
  1. `handleCreateTask` generates a client temporary ID:
     `const tempId = "task-" + Date.now();`
  2. It immediately inserts the task into React state and localStorage:
     ```ts
     const created: CRMTask = {
       id: tempId,
       org_id: orgId || "",
       title: trimmedTitle,
       description: newDescription.trim(),
       priority: newPriority,
       status: "todo",
       assignee_name: finalAssigneeName,
       assignee_id: newAssigneeId, // could be synthetic "user-178..."
       assigned_to: newAssigneeId,
       due_date: newDueDate,
       created_at: new Date().toISOString(),
       requires_proof: newRequiresProof,
     };
     setTasks((prev) => [created, ...prev]);
     setIsCreateOpen(false);
     ```
  3. It fires a success toast: `"Task Created: [title] assigned to [name]"`.
  4. It dispatches `credsmart:crm_tasks_updated`.
  5. It calls `crmApi.createCRMTask(...)`.
  6. When the backend returns HTTP 400, `crmApi.createCRMTask` returns `{ data: null, error: { message: "Assigned user does not belong to this organization", status: 400 } }`.
  7. **Lines 479–493 only check `if (res?.data && res.data.id)`**.
  8. Because `res.data` is `null`, this block is silently bypassed.
  9. **No error toast is displayed.**
  10. **The optimistic task is NOT removed from `tasks` state.**
  11. The invalid task with `id: "task-178..."` remains in React state and is written to `localStorage.getItem("credsmart_crm_tasks_" + orgId)`.
  12. When the user navigates away or refreshes the page:
      - `loadData()` calls `crmApi.getCRMTasks(orgId)`.
      - The backend returns only the real rows from PostgreSQL table `staff_tasks`.
      - Because the failed task was never inserted into PostgreSQL, the server returns the database task list without the newly created task.
      - Line 305–306: `setTasks(mappedTasks); localStorage.setItem(storageKey, JSON.stringify(mappedTasks));` completely overwrites state and localStorage.
      - **The assigned task vanishes into thin air.**

#### Root Cause 3.D: Mock Data Pollution (`INITIAL_TASKS`) on Clean Organizations
- **Location**: `src/pages/crm/Tasks.tsx`, lines 90–141, 153–161, 191–202, and 282.
- **Trace**:
  1. `INITIAL_TASKS` contains 4 hardcoded demo tasks:
     - "Reconcile Saturday Cash Drawer with Day Book" (Rahul Sharma)
     - "Stock Audit: Aisle 3 Dairy & Perishables" (Pooja Verma)
     - "Review Supplier Inward Invoices for GST Mismatch" (Amit Patel)
     - "Barcode Labeling on Newly Arrived FMCG Crates" (Suresh Kumar)
  2. In `loadData()` line 282:
     ```ts
     const res = await crmApi.getCRMTasks(orgId);
     if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
       ...
       setTasks(mappedTasks);
     }
     ```
  3. If an organization has 0 tasks, the backend returns an empty array `[]`.
  4. Because `res.data.length > 0` is `false`, **`setTasks` is never called**!
  5. The component continues to display the hardcoded demo tasks (`Rahul Sharma`, `Pooja Verma`, etc.) and saves them to the tenant's localStorage!
  6. This violates strict multi-tenant cleanliness and real-data purity.

#### Root Cause 3.E: `getCRMStaffRoles` vs `getCRMStaff` Priority Inversion in `Tasks.tsx`
- **Location**: `src/pages/crm/Tasks.tsx`, lines 218–223.
- **Mechanism**:
  - `Tasks.tsx` checks `if (typeof crmApi?.getCRMStaffRoles === "function")` before `getCRMStaff`.
  - While both routes exist, `crmApi.getCRMStaff(orgId)` is the dedicated authoritative staff roster endpoint that returns comprehensive member details (`full_name`, `name`, `email`, `store_role`, `crm_role_name`, `crm_role_color`, `is_super_admin`).
  - When `getCRMStaffRoles` fails or returns empty, the fallback in `Tasks.tsx` reads `localStorage.getItem("credsmart_crm_staff_" + orgId)`.
  - If `RoleManagement.tsx` previously stored synthetic IDs in that localStorage key, `Tasks.tsx` ingests those synthetic IDs and places them directly into the Assignee dropdown (`SelectContent`).

---

### 3.3 Comprehensive Blueprint for R3 Implementation

To ensure reliable, persistent task assignment:

#### 1. Eliminate Synthetic Staff IDs at the Source
- In `RoleManagement.tsx`:
  - When `crmApi.provisionStaffUser(payload, orgId)` returns `res.error` or when `!res.data?.user?.id`:
    - **Do NOT generate `user-${Date.now()}`.**
    - Abort the operation and display a descriptive error toast:
      `toast({ title: "Staff Provisioning Failed", description: res.error?.message || "Failed to provision user.", variant: "destructive" })`.
    - Do NOT store ghost records in `credsmart_crm_staff_${orgId}`.
    - Do NOT open the Credentials Confirmation modal for failed accounts.

#### 2. Robust Staff Ingestion & UUID Validation in `Tasks.tsx`
- In `loadData` inside `Tasks.tsx`:
  - Prefer `crmApi.getCRMStaff(orgId)` to retrieve the authoritative list of active organization users.
  - When ingesting staff into `staffList`:
    - Ensure every member has a valid database identifier. Filter out any malformed synthetic IDs (e.g. `s.id.startsWith("user-") && s.id.length > 15 && !s.id.includes("-")`).
    - Only expose real staff members in the Assignee select dropdown.
- When assigning a task:
  - If no assignee is selected or "Unassigned" is chosen, pass `assigned_to: null` or omit it.
  - If a real staff member is selected, pass their genuine UUID string.

#### 3. Immediate Optimistic Updates with Deterministic Rollback in `Tasks.tsx`
Refactor `handleCreateTask`:
```ts
const tempId = `task-${Date.now()}`;
const optimisticTask: CRMTask = {
  id: tempId,
  org_id: orgId || "",
  title: trimmedTitle,
  description: newDescription.trim(),
  priority: newPriority,
  status: "todo",
  assignee_name: finalAssigneeName,
  assignee_id: newAssigneeId,
  assigned_to: newAssigneeId,
  due_date: newDueDate,
  created_at: new Date().toISOString(),
  requires_proof: newRequiresProof,
};

// 1. Immediate optimistic UI update
setTasks((prev) => [optimisticTask, ...prev]);
setIsCreateOpen(false);
resetForm();

// 2. Dispatch live task update event
window.dispatchEvent(new CustomEvent("credsmart:crm_tasks_updated"));

// 3. Persistent Database Synchronization
try {
  const res = await crmApi.createCRMTask(
    {
      title: optimisticTask.title,
      description: optimisticTask.description,
      priority: optimisticTask.priority,
      status: "todo",
      due_date: optimisticTask.due_date,
      requires_proof: optimisticTask.requires_proof,
      assigned_to: optimisticTask.assigned_to,
      assignee_id: optimisticTask.assignee_id,
    },
    orgId
  );

  if (res.error) {
    // Rollback optimistic state
    setTasks((prev) => prev.filter((t) => t.id !== tempId));
    window.dispatchEvent(new CustomEvent("credsmart:crm_tasks_updated"));
    toast({
      title: "Task Assignment Failed",
      description: res.error.message || "Failed to save task to database",
      variant: "destructive",
    });
    return;
  }

  if (res.data && res.data.id) {
    const serverTask: CRMTask = {
      ...optimisticTask,
      id: res.data.id,
      assignee_name: res.data.assignee_name || optimisticTask.assignee_name,
      assignee_id: res.data.assigned_to || res.data.assignee_id || optimisticTask.assignee_id,
      assigned_to: res.data.assigned_to || optimisticTask.assigned_to,
    };
    setTasks((prev) => prev.map((t) => (t.id === tempId ? serverTask : t)));
    window.dispatchEvent(new CustomEvent("credsmart:crm_tasks_updated"));
    toast({
      title: "Task Created",
      description: `"${serverTask.title}" assigned to ${serverTask.assignee_name}.`,
    });
  }
} catch (err: any) {
  // Rollback on network exception
  setTasks((prev) => prev.filter((t) => t.id !== tempId));
  window.dispatchEvent(new CustomEvent("credsmart:crm_tasks_updated"));
  toast({
    title: "Network Error",
    description: err?.message || "Could not reach server to create task",
    variant: "destructive",
  });
}
```

#### 4. Deterministic Rollback on Lifecycle Status Transitions
In `handleMoveStatus`, `handleApproveTask`, `handleSubmitProof`, and `handleSubmitRevision`:
- Save previous task state before making the optimistic transition.
- Check `const res = await crmApi.transitionCRMTaskStatus(...)`.
- If `res.error`, revert the task to its previous status and alert the user with a destructive toast.

#### 5. Eradicate Demo Mock Data (`INITIAL_TASKS`)
- Change initial `tasks` state to `[]` (empty array) unless valid cached tasks exist for the specific active `orgId`.
- In `loadData()` line 282, change:
  ```ts
  if (res?.data && Array.isArray(res.data)) {
    const mappedTasks: CRMTask[] = res.data.map(...);
    setTasks(mappedTasks);
    localStorage.setItem(storageKey, JSON.stringify(mappedTasks));
  }
  ```
- When `res.data` is an empty array `[]`, `tasks` will be `[]`, rendering a clean, uncluttered empty state: `"No tasks created yet"`.

---

## 4. Cross-Cutting Standards & Non-Regression Invariants

1. **Strict Multi-Tenant Isolation**:
   - Every read and write must be strictly partitioned by `organization_id` / `orgId`.
   - Never leak tasks or salary records across tenants.
2. **Minimal & Fast-Access Design System Compliance**:
   - Action buttons: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`.
   - Table action buttons: `h-7 px-2.5 rounded-md text-[11px] font-medium`.
   - Currency typography: `font-mono tabular-nums font-bold` with Indian currency notation (`₹X,XX,XXX.XX`).
   - Hairline borders: `border-slate-200/80` (light) / `border-slate-800` (dark).
3. **Desktop vs. Mobile Divergence**:
   - Desktop (>= 768px): Structured data tables (`CRMDataTable`), dense row heights, sticky pagination.
   - Mobile (< 768px): Touch-first cards, minimum 44px touch targets, slide-over drawer sheets.
4. **Zero Billing Regressions**:
   - No modifications to billing, POS, invoice calculations, or printing pipelines.

---

## 5. Artifacts and Target Files Summary

| Module | Target File | Nature of Change |
|---|---|---|
| **Salary Management** | `src/pages/crm/SalaryManagement.tsx` | Hydrate staff from `crmApi.getCRMStaff`, listen to `credsmart:crm_staff_updated`, display both configured and unconfigured staff in Tab 1, provide 1-click Quick Configure action. |
| **Task Management** | `src/pages/crm/Tasks.tsx` | Sanitize staff UUIDs, remove mock `INITIAL_TASKS`, implement optimistic updates with deterministic error rollback, handle empty state cleanly. |
| **Role Management** | `src/pages/crm/RoleManagement.tsx` | Eliminate synthetic `user-${Date.now()}` generation on provision failure, check `res.error`, prevent ghost staff caching. |
| **CRM API Service** | `src/services/crmApi.ts` | Ensure consistent response typing, parameter normalization, and error propagation. |

---

*Report prepared by `explorer_survey_staff_salary` for Orchestrator and Implementation Workers.*
