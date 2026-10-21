# Enterprise CRM Task Management & E2E Testing Architecture Specification

**Project**: CredSmart Enterprise CRM  
**Module**: Task Management & Staff Workflows (`src/pages/crm/Tasks.tsx`, `src/services/crmApi.ts`, `backend-api/src/routes/crm.js`)  
**Specification Date**: October 2026  
**Status**: Authoritative Architectural Specification & Survey  

---

## 1. Executive Summary & Problem Analysis

CredSmart CRM empowers retail businesses and multi-store enterprises to assign, monitor, and verify internal operations (such as inventory audits, cash reconciliations, GST mismatches, and barcode labeling). 

### 1.1 Current Implementation State (`src/pages/crm/Tasks.tsx`)
A thorough investigation of `src/pages/crm/Tasks.tsx` (812 lines) revealed that while the UI provides a visual prototype of a Kanban board and Data Table view:
1. **Disconnected from Backend**: Tasks are strictly stored in local state initialized with hardcoded mock data (`INITIAL_TASKS`) and persisted only to browser `localStorage` under `credsmart_crm_tasks_${orgId}`. No network calls are made to `https://api.credsmart.online/api/crm/tasks`.
2. **Missing Real Staff Assignee Integration**: The "Create Task" modal uses a free-form text input (`<Input placeholder="Staff member name..." />`) rather than binding to real provisioned organization users and staff roles fetched from `backend-api/src/routes/crm.js` (`GET /api/crm/staff`) or `settingsApi.getMemberships()`.
3. **Incomplete Lifecycle State Machine**:
   - Currently, tasks transition:
     - `todo` -> `in_progress` (via "Start Job →")
     - `in_progress` -> `review` (via "Submit Proof" modal, recording `proof_notes`)
     - `review` -> `done` (via "Approve ✓")
   - **Critical Missing Flow**: When a task is under `review`, managers have **no way to reject or request changes**. The state machine lacks the revision loop: `review` -> `in_progress` with manager feedback notes (`revision_notes`).
4. **Missing API Service Methods**: `src/services/crmApi.ts` contains API methods for roles, geolocations, attendance, salary profiles, payroll, and dashboard counts, but has **zero task endpoints** (`getCRMTasks`, `createCRMTask`, `updateCRMTask`, `transitionCRMTaskStatus`, `approveCRMTask`, etc. are entirely absent).
5. **Backend Route Gap**: `backend-api/src/routes/crm.js` lines 322–348 contain minimal `GET /api/crm/tasks` and `POST /api/crm/tasks` endpoints. They lack:
   - User joins to return `assignee_name`, `assignee_email`, `assignee_avatar`, and `creator_name`.
   - Update endpoints (`PUT /api/crm/tasks/:id` and `PATCH /api/crm/tasks/:id/status`).
   - Fields for `requires_proof`, `proof_notes`, `revision_notes`, `approved_by`, and `completed_at`.
   - Manager authorization checks for approval.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Data Model | Dual Tenant ID Support | Multi-tenant organization isolation using `org_id` and `organization_id` columns with automated bi-directional sync trigger `trg_sync_org_ids`. | UUID `org_id` / `organization_id` | Synchronized tenant identifiers across tables | Database rejection if foreign key organization does not exist | `backend-api/fix_db.sql:1080` & `backend-api/schema.sql:484` |
| 2 | Data Model | Task Priority Classification | 4-tier urgency classification (`urgent`, `high`, `normal`, `low`) mapped to semantic badges and sorting priority. | `priority`: Enum string | Visual CRMBadge with color-coded dot & label | Defaults to `'normal'` on invalid or omitted input | `src/pages/crm/Tasks.tsx:57` |
| 3 | Data Model | Task Lifecycle Statuses | 4-state workflow state machine: `todo` (Backlog), `in_progress` (Work started), `review` (Proof submitted), `done` (Manager approved). | `status`: Enum string | Column assignment in Kanban and status badge in Table | Defaults to `'todo'` on task creation | `src/pages/crm/Tasks.tsx:58` |
| 4 | Data Model | Verification Proof Enforcement | Configurable flag `requires_proof` forcing staff to submit explanatory notes before a task can transition to `review`. | `requires_proof`: boolean, `proof_notes`: text | Modal prompt on "Submit" action; prevents premature completion | Rejects empty notes if proof is required | `src/pages/crm/Tasks.tsx:72-73` |
| 5 | Data Model | Manager Approval & Revision Tracking | Capture manager user ID and completion timestamp on final approval, or revision feedback on rejection. | `approved_by`: UUID, `completed_at`: TIMESTAMPTZ, `revision_notes`: text | Stored audit trail on task card and data table | Non-managers attempting approval receive 403 Forbidden | `ORIGINAL_REQUEST.md:1039` & `DISPATCH.md:12-13` |
| 6 | UI / View | Dual View Switcher | High-density toggle allowing instant switching between interactive Kanban Board and CRMDataTable. | Click on view toggle (`kanban` \| `table`) | Renders 4-column board or paginated data table | Preserves filter state and search query across switches | `src/pages/crm/Tasks.tsx:148` & `src/components/crm/CRMDataTable.tsx` |
| 7 | UI / View | Kanban Board Column Pipeline | 4 swimlane columns with real-time task counter badges, empty state indicators, and responsive card lists. | Task list partitioned by `status` | Categorized visual cards with priority, assignee avatar, due date | Shows "No tasks" dashed empty state when column is empty | `src/pages/crm/Tasks.tsx:543-645` |
| 8 | UI / View | CRMDataTable Integration | High-density sortable and filterable data table utilizing CredSmart CRM table architecture with custom cell accessors. | `CRMColumnDef<CRMTask>[]` configuration | Tabular layout with title, priority badge, status badge, assignee, due date, actions | Renders `emptyMessage` when query filters return 0 rows | `src/pages/crm/Tasks.tsx:291-383` & `src/components/crm/CRMDataTable.tsx` |
| 9 | UI / Interaction | Real Org Staff Assignee Picker | Dynamic `<Select>` dropdown in Create Task modal populated with real organization members fetched from backend. | Staff array from `GET /api/crm/staff` / `settingsApi.getMemberships` | Selected user UUID and display name attached to task | Fallbacks to current authenticated user if staff list fetch fails | `src/pages/crm/RoleManagement.tsx:337` & `DISPATCH.md:15` |
| 10 | UI / Interaction | Proof Submission Modal | Dialog prompt requiring employee to provide detailed work verification notes before moving task to `review`. | User input text via `<Textarea>` | Updates task with `proof_notes` and sets `status = 'review'` | Shows toast validation error if required proof text is blank | `src/pages/crm/Tasks.tsx:770-806` |
| 11 | UI / Interaction | Manager Revision Request Modal | Modal for managers/super-admins to reject review submissions and provide actionable feedback notes. | Feedback text via `<Textarea>` | Sets `status = 'in_progress'`, saves `revision_notes`, notifies staff | Requires non-empty revision instructions | `DISPATCH.md:13` & `ORIGINAL_REQUEST.md:1039` |
| 12 | UI / Interaction | Quick Status Transition Buttons | One-tap touch-friendly buttons (>= 44px hit target) on cards and rows: "Start Job →", "Submit Proof", "Approve ✓", "Request Changes ↺". | User click event on action trigger | Dispatches status mutation to API and updates local UI | Disabled or hidden if current user lacks required RBAC permission | `src/pages/crm/Tasks.tsx:601-638` |
| 13 | UI / Metrics | Real-time KPI Metric Cards | 4 CredSmart `CRMStatCard` components computing Total Tasks, In Progress, Pending Review, Completed, and Completion Rate (%). | Active task array | Metric values, color-coded icon pods, and resolution trend indicator | Calculates 0% completion rate without division by zero on empty dataset | `src/pages/crm/Tasks.tsx:173-180, 476-509` |
| 14 | UI / Filtering | Multi-Criteria Filter Bar | Debounced search input (title, description, assignee) combined with priority select filter (`all`, `urgent`, `high`, `normal`, `low`). | Search query string + priority dropdown value | Dynamically filtered task subset | Shows zero-state container if no matching tasks found | `src/pages/crm/Tasks.tsx:183-192, 513-538` |
| 15 | RBAC & Security | Permission Gating (`CRMPermissionGate`) | Module-level access restriction for `"tasks"` module with granular actions: `"view"`, `"create"`, `"approve"`. | User CRM permissions from `useCRMPermission` | Renders view if permitted, else renders restricted fallback pod | Displays "Task Access Restricted" and fires destructive toast | `src/components/crm/CRMPermissionGate.tsx` & `src/pages/crm/Tasks.tsx:386-400` |
| 16 | Backend API | List Tasks (`GET /api/crm/tasks`) | Authenticated Express endpoint retrieving organization tasks joined with user profile names. | Query: `org_id`, `status`, `assigned_to`, `priority` | Array of task objects with joined assignee and creator metadata | 401 if unauthenticated, 500 on database error | `backend-api/src/routes/crm.js:323-331` |
| 17 | Backend API | Create Task (`POST /api/crm/tasks`) | Creates a new task in `staff_tasks`, defaulting status to `todo`, with assigned employee and creator ID. | Body: `{ title, description, priority, due_date, requires_proof, assigned_to }` | HTTP 201 with created task JSON | HTTP 400 if title missing, 500 on database error | `backend-api/src/routes/crm.js:334-347` |
| 18 | Backend API | Status Transition (`PATCH /api/crm/tasks/:id/status`) | Validates and applies state transitions (`todo` -> `in_progress` -> `review` -> `done` or revision loop). | Body: `{ status, proof_notes, revision_notes }` | HTTP 200 with updated task record | HTTP 400 on invalid transition, 403 if unauthorized | Specification derived from `DISPATCH.md` |
| 19 | Client Service | Centralized CRM API Client (`src/services/crmApi.ts`) | Type-safe wrapper around `apiClient` encapsulating Bearer token injection and error normalization. | Endpoint parameters and typed request body | Normalized `{ data: CRMTask[], error: ApiError }` | Offline fallback to cached localStorage state | `src/lib/apiClient.ts` & `src/services/crmApi.ts` |
| 20 | Offline / Cache | Resilience & Local Cache Hydration | Caching fetched tasks to `credsmart_crm_tasks_${orgId}` and reading on transient network failures. | Network response or cached string | Immediate rendering without UI blank-screen crashes | Displays non-blocking warning toast on cached fallback | `src/pages/crm/Tasks.tsx:138-146, 166-170` |

---

## 3. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | KPI Metrics Calculator | Empty task list (`tasks = []`) | `metrics.total = 0`, `inProgress = 0`, `review = 0`, `done = 0`, `completionRate = 0`. Handled cleanly with `total > 0 ? Math.round((done / total) * 100) : 0` avoiding `NaN` or `Infinity`. |
| 2 | KPI Metrics Calculator | 100% completed tasks (`3 done, 0 pending`) | `completionRate = 100%`. Trend indicator displays `+100%` with direction `"up"`. |
| 3 | State Machine Transition | Assignee clicks "Submit" when `requires_proof = false` | Transitions directly to `review` with default system proof note: `"Work completed and submitted for manager approval."` without blocking user. |
| 4 | State Machine Transition | Assignee submits proof with blank whitespace (`"   "`) | Validation prevents submission and triggers warning toast: `"Please describe your work or proof before submitting"`. |
| 5 | State Machine Transition | Manager clicks "Request Changes" without feedback notes | Validation requires non-empty revision notes so employee understands what corrections are needed. |
| 6 | State Machine Transition | Unauthorized user (lacking `tasks:approve`) calls approve action | Button is hidden in UI; API returns HTTP 403 Forbidden. Task status remains unchanged in `review`. |
| 7 | Create Task Form | Missing title (`title = ""` or `"   "`) | Form blocks submission with HTML5 validation and displays error toast: `"Title is required"`. |
| 8 | Create Task Form | High-volume description (5,000+ characters) | PostgreSQL `description TEXT` stores complete text without truncation. Table view uses `line-clamp-1` and Kanban uses `line-clamp-2` to prevent UI card overflow. |
| 9 | Assignee Picker | Org has 0 additional staff members (single owner store) | Fallbacks to current authenticated user (`user.email` / `"Store Owner"`) so tasks can still be created and assigned to self. |
| 10 | Assignee Picker | Assigned staff member is subsequently removed from organization | Backend uses `ON DELETE SET NULL` on `assigned_to`. UI displays `"Unassigned"` or `"Former Staff"` with fallback initials avatar rather than crashing with null pointer. |
| 11 | Due Date Validation | Past due date entered on task creation | Task accepted; UI highlights overdue date in amber/rose typography to indicate existing deadline pressure. |
| 12 | Search Filter | Case-insensitive and partial match query (`"gSt"`) | Matches `"Review Supplier Inward Invoices for GST Mismatch"`, filtering both title, description, and assignee name. |
| 13 | Search Filter | Special regex characters in search query (`"[.*+?^${}()|[\]\\]"`) | Filter uses native JavaScript `String.prototype.includes` rather than unescaped RegExp, preventing client-side regex denial-of-service / syntax errors. |
| 14 | Responsive Viewport | Mobile viewport (`375px`) | Kanban grid stacks vertically (`grid-cols-1 md:grid-cols-4`); action buttons maintain `min-h-[44px]` touch targets; Table view scrolls horizontally without clipping container. |
| 15 | Network Failure | Backend API 500 or offline connectivity | `apiClient` catches network error, returns `{ data: null, error: ApiError }`. Component recovers using `localStorage` cached tasks with a subtle warning toast. |

---

## 4. Architectural Specifications: Enterprise Task Management

### 4.1 Relational Database Schema (`staff_tasks`)

The database table `staff_tasks` must be expanded in PostgreSQL to support complete multi-tenant enterprise task workflows:

```sql
-- Migration: Add Enterprise Task Management Columns & Constraints
CREATE TABLE IF NOT EXISTS public.staff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    due_date DATE,
    requires_proof BOOLEAN NOT NULL DEFAULT true,
    proof_notes TEXT,
    revision_notes TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions for existing installations
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT true;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_notes TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_id ON public.staff_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_organization_id ON public.staff_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON public.staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON public.staff_tasks(due_date);

-- Bi-directional tenant synchronization trigger
DROP TRIGGER IF EXISTS trg_sync_org_ids ON public.staff_tasks;
CREATE TRIGGER trg_sync_org_ids 
BEFORE INSERT OR UPDATE ON public.staff_tasks 
FOR EACH ROW EXECUTE FUNCTION sync_org_id_and_organization_id();
```

---

### 4.2 Lifecycle State Machine Engine

The Task lifecycle follows an authoritative 4-state workflow with bidirectional managerial oversight:

```
                  ┌──────────────────────┐
                  │        todo          │  (Assigned to employee)
                  └──────────┬───────────┘
                             │
                             │ [Assignee starts job]
                             ▼
                  ┌──────────────────────┐
                  │     in_progress      │  (Active work in store)
                  └─────┬──────────▲─────┘
                        │          │
    [Submit proof notes]│          │ [Manager requests revision]
                        ▼          │ (stores revision_notes)
                  ┌────────────────┴─────┐
                  │        review        │  (Pending managerial sign-off)
                  └──────────┬───────────┘
                             │
                             │ [Manager approves]
                             │ (records completed_at & approved_by)
                             ▼
                  ┌──────────────────────┐
                  │         done         │  (Verified & closed)
                  └──────────────────────┘
```

#### Transition Invariants:
1. **`todo` -> `in_progress`**: Can be initiated by assigned staff or organization manager. Clears any historical revision notices.
2. **`in_progress` -> `review`**: Requires non-empty `proof_notes` if `requires_proof === true`. If `requires_proof === false`, proof notes are optional.
3. **`review` -> `done`**: Requires `tasks:approve` permission or super-admin role. Automatically captures `completed_at = NOW()` and `approved_by = req.user.id`.
4. **`review` -> `in_progress` (Revision Request)**: Requires `tasks:approve` permission. Requires manager feedback in `revision_notes`. Resets status to `in_progress`, prompting assignee with amber alert chip in Kanban and Table views.
5. **Re-submission**: When staff re-submits work from `in_progress` after a revision, new proof notes are appended or updated, moving the task back to `review`.

---

### 4.3 Backend Express Route Specifications (`backend-api/src/routes/crm.js`)

All endpoints authenticate through `router.use(authenticate)` and extract `orgId` from JWT/header.

#### 1. `GET /api/crm/tasks`
- **Purpose**: Fetch all tasks for active organization with joined user identities.
- **SQL Implementation**:
  ```sql
  SELECT t.*,
         u_assigned.full_name AS assignee_name,
         u_assigned.email AS assignee_email,
         u_assigned.avatar_url AS assignee_avatar,
         u_creator.full_name AS creator_name,
         u_approver.full_name AS approver_name
  FROM staff_tasks t
  LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
  LEFT JOIN users u_creator ON u_creator.id = t.assigned_by
  LEFT JOIN users u_approver ON u_approver.id = t.approved_by
  WHERE t.org_id = $1 OR t.organization_id = $1
  ORDER BY 
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC;
  ```

#### 2. `POST /api/crm/tasks`
- **Payload**:
  ```json
  {
    "title": "Audit Shelf 4 Expiry Dates",
    "description": "Log batches expiring within 30 days",
    "priority": "high",
    "due_date": "2026-10-25",
    "requires_proof": true,
    "assigned_to": "88a44ec2-28e4-4a2a-b673-8a3d6d5ef01a"
  }
  ```
- **Behavior**: Inserts task with `status = 'todo'`, `assigned_by = req.user.id`. Returns HTTP 201 with populated task object.

#### 3. `PATCH /api/crm/tasks/:id/status`
- **Payload**:
  ```json
  {
    "status": "review",
    "proof_notes": "Checked 45 packages. 3 removed for return to vendor."
  }
  ```
  or Revision request:
  ```json
  {
    "status": "in_progress",
    "revision_notes": "Missed dairy chiller top shelf. Please re-audit."
  }
  ```
- **Approval Check**:
  ```javascript
  if (status === 'done') {
    // Verify user has role with 'tasks:approve' or is organization owner/super_admin
    // Set approved_by = req.user.id, completed_at = new Date()
  }
  ```

#### 4. `DELETE /api/crm/tasks/:id`
- Deletes task if requester is task creator, store owner, or super-admin.

---

### 4.4 Centralized API Client Service (`src/services/crmApi.ts`)

Exported TypeScript interfaces and service functions to be added to `src/services/crmApi.ts`:

```typescript
export interface CRMTask {
  id: string;
  org_id: string;
  organization_id?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assignee_name?: string;
  assignee_email?: string;
  creator_name?: string;
  requires_proof: boolean;
  proof_notes?: string | null;
  revision_notes?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export async function getCRMTasks(
  orgId: string,
  options?: { status?: TaskStatus; priority?: TaskPriority; assignedTo?: string }
): Promise<ApiResponse<CRMTask[]>> {
  return apiGet<CRMTask[]>(
    "/crm/tasks",
    {
      organization_id: orgId,
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.priority ? { priority: options.priority } : {}),
      ...(options?.assignedTo ? { assigned_to: options.assignedTo } : {}),
    },
    { organizationId: orgId }
  );
}

export async function createCRMTask(
  payload: Partial<CRMTask>,
  orgId?: string
): Promise<ApiResponse<CRMTask>> {
  const effectiveOrg = payload.org_id || payload.organization_id || orgId;
  return apiPost<CRMTask>(
    "/crm/tasks",
    { ...payload, org_id: effectiveOrg, organization_id: effectiveOrg },
    { organizationId: effectiveOrg }
  );
}

export async function updateCRMTask(
  id: string,
  payload: Partial<CRMTask>,
  orgId?: string
): Promise<ApiResponse<CRMTask>> {
  return apiPut<CRMTask>(`/crm/tasks/${id}`, payload, { organizationId: orgId });
}

export async function transitionCRMTaskStatus(
  id: string,
  transition: {
    status: TaskStatus;
    proof_notes?: string;
    revision_notes?: string;
  },
  orgId?: string
): Promise<ApiResponse<CRMTask>> {
  return apiPut<CRMTask>(`/crm/tasks/${id}/status`, transition, { organizationId: orgId });
}

export async function deleteCRMTask(
  id: string,
  orgId?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiDelete<{ success: boolean }>(`/crm/tasks/${id}`, { organizationId: orgId });
}
```

---

## 5. UI Architecture: `src/pages/crm/Tasks.tsx`

### 5.1 Component Hierarchy & Layout
```
<CRMPermissionGate module="tasks" action="view">
  ├── <header>
  │     └── <CRMPageHeader>
  │           ├── Title: "Task & Job Workflows"
  │           ├── Subtitle & Breadcrumbs
  │           ├── Phase & Readiness Badges
  │           └── Actions:
  │                 ├── View Toggle (<Kanban> / <Table>)
  │                 └── "+ Create Task" Button (Gated by tasks:create)
  │
  ├── <main>
  │     ├── <section aria-label="Task Metrics">
  │     │     └── 4x <CRMStatCard>
  │     │           ├── Total Tasks (navy, CheckSquare)
  │     │           ├── In Progress (blue, Clock)
  │     │           ├── Pending Review (orange, FileCheck)
  │     │           └── Completed (emerald, CheckCircle2, Trend: completionRate %)
  │     │
  │     ├── <section aria-label="Filter Bar">
  │     │     ├── Search Input (Search icon, debounced query)
  │     │     ├── Priority Filter Select (All, Urgent, High, Normal, Low)
  │     │     └── Assignee Filter Select (All Staff, Specific Staff)
  │     │
  │     ├── {viewMode === 'kanban' ? <KanbanBoard /> : <TableView />}
  │     │     ├── Kanban: 4 Swimlanes (todo, in_progress, review, done)
  │     │     │     └── Task Cards with status badge, priority badge, due date, assignee
  │     │     │           └── Action Buttons: "Start Job →", "Submit Proof", "Approve ✓", "Request Changes ↺"
  │     │     └── Table: <CRMDataTable>
  │     │           └── Columns: Task, Priority, Status, Assignee, Due Date, Actions
  │     │
  │     ├── <CreateTaskDialog> (Form with Real Staff Member Select)
  │     ├── <SubmitProofDialog> (Form with Proof Notes Textarea)
  │     └── <RequestRevisionDialog> (Form with Manager Feedback Textarea)
```

### 5.2 Real Organization Staff Picker Integration
In `Tasks.tsx`:
1. Use `settingsApi.getMemberships(orgId)` and `settingsApi.getProfiles()` (or `crmApi.getCRMStaffRoles`) to fetch the active organization's members.
2. In `<CreateTaskDialog>`:
   ```tsx
   <div className="space-y-1">
     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
       Assignee *
     </label>
     <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
       <SelectTrigger className="text-xs h-9">
         <SelectValue placeholder="Select staff member..." />
       </SelectTrigger>
       <SelectContent>
         {staffList.map((staff) => (
           <SelectItem key={staff.id} value={staff.id}>
             <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded-full bg-slate-200 text-[9px] font-bold flex items-center justify-center">
                 {staff.name.charAt(0)}
               </div>
               <span>{staff.name}</span>
               <span className="text-[10px] text-slate-400">({staff.role})</span>
             </div>
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
   ```

---

## 6. E2E & Unit Testing Architecture (4-Tier Test Plan)

Vitest is configured with `environment: "jsdom"`, `@testing-library/react`, and path alias `@` pointing to `./src`.

### 6.1 Mock Architecture for `apiClient`
To prevent flaky network dependencies and ensure lightning-fast test execution in Vitest (< 500ms per test suite), tests should mock `@/lib/apiClient` or `@/services/crmApi`:

```typescript
// Shared Test Mock Interceptor
vi.mock("@/services/crmApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/crmApi")>("@/services/crmApi");
  return {
    ...actual,
    getCRMTasks: vi.fn(),
    createCRMTask: vi.fn(),
    updateCRMTask: vi.fn(),
    transitionCRMTaskStatus: vi.fn(),
    deleteCRMTask: vi.fn(),
  };
});
```

### 6.2 The 4-Tier Test Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Tier 4: E2E Lifecycle & RBAC Scenarios               │
│    (Full task traversal, manager approval, revision rejection loop)    │
├────────────────────────────────────────────────────────────────────────┤
│                   Tier 3: Service & Network Interceptor Tests          │
│        (crmApi methods, Bearer auth header injection, error fallbacks) │
├────────────────────────────────────────────────────────────────────────┤
│                   Tier 2: Component & Modal Interaction Tests          │
│       (Kanban/Table toggle, staff selector, proof modal, filter bar)   │
├────────────────────────────────────────────────────────────────────────┤
│                   Tier 1: Domain Logic & State Machine Engine          │
│   (Pure state transitions, KPI calculators, string sanitizers)         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tier 1: Domain Logic & State Machine Tests (`src/test/crmTaskLogic.test.ts`)
- **Focus**: Pure algorithmic functions without DOM overhead.
- **Test Cases**:
  1. `validateTaskTransition('todo', 'in_progress')` -> returns `true`.
  2. `validateTaskTransition('in_progress', 'review')` with non-empty proof -> returns `true`.
  3. `validateTaskTransition('in_progress', 'review')` with empty proof when `requires_proof = true` -> returns `false`.
  4. `validateTaskTransition('review', 'done')` by non-manager -> returns `false`.
  5. `validateTaskTransition('review', 'in_progress')` with revision notes -> returns `true`.
  6. `validateTaskTransition('done', 'todo')` -> invalid transition, returns `false`.
  7. `computeTaskKPIs(tasks)`:
     - 0 tasks: returns `{ total: 0, inProgress: 0, review: 0, done: 0, completionRate: 0 }`.
     - 10 tasks, 5 done: returns `completionRate = 50%`.
     - 4 tasks, 4 done: returns `completionRate = 100%`.
  8. `formatTaskDueBadge(dueDate)`: identifies overdue dates vs upcoming deadlines.

#### Tier 2: Component & Modal Interaction Tests (`src/test/crmTasksView.test.tsx`)
- **Focus**: React component rendering, DOM queries, user events.
- **Test Cases**:
  1. Renders `CRMPageHeader`, badges ("Phase 3 Active", "Kanban Ready"), and 4 `CRMStatCard` metric pods.
  2. Switches view mode from Kanban board to CRMDataTable on clicking Table toggle.
  3. Filters Kanban cards dynamically when typing in search input.
  4. Filters tasks when changing priority select dropdown (`urgent`, `high`, `normal`, `low`).
  5. "Create Task" button opens modal with Title, Description, Priority, Due Date, and Staff Select.
  6. Populates Staff Select with real organization members fetched on mount.
  7. Clicking "Start Job →" on a `todo` task moves it to `in_progress`.
  8. Clicking "Submit Proof" on an `in_progress` task opens the Proof Submission modal.
  9. Submitting proof updates task status to `review` and displays proof snippet on card.
  10. "Request Changes" button opens Revision dialog, entering notes moves task back to `in_progress`.
  11. "Approve ✓" button completes task and displays Emerald checkmark badge.

#### Tier 3: Service & Network Interceptor Tests (`src/test/crmTasksApi.test.ts`)
- **Focus**: Testing `crmApi.ts` integration with `apiClient`.
- **Test Cases**:
  1. `getCRMTasks(orgId)` passes `organization_id` in query params and `x-organization-id` header.
  2. `createCRMTask` serializes payload, includes `requires_proof: true`, and returns created task.
  3. `transitionCRMTaskStatus` sends PUT request to `/crm/tasks/:id/status` with `proof_notes` or `revision_notes`.
  4. `deleteCRMTask` executes DELETE request to `/crm/tasks/:id`.
  5. API Error Handling: 500 error returns `{ data: null, error: { message: "Internal server error" } }`.
  6. Offline Fallback: Validates that UI gracefully uses localStorage cache when network is offline.

#### Tier 4: E2E Lifecycle & RBAC Integration Tests (`src/test/crmTasksLifecycle.test.tsx`)
- **Focus**: End-to-end multi-role simulation traversing full business workflow.
- **Test Cases**:
  1. **Full Lifecycle Traversal**:
     - Task created as `todo` -> Assignee starts (`in_progress`) -> Assignee submits proof (`review`) -> Manager rejects with revision notes (`in_progress` with banner) -> Assignee re-submits corrected proof (`review`) -> Manager approves (`done` with completed timestamp).
  2. **RBAC Privilege Boundaries**:
     - Non-manager user cannot see "Approve ✓" or "Request Changes" action buttons on tasks in `review`.
     - Non-creator user cannot see "Create Task" CTA button if lacking `tasks:create`.
     - Super-admin user retains global bypass to create, start, review, and approve any task.
  3. **Adversarial Resilience**:
     - Task with XSS string in title (`<script>alert(1)</script>`) renders sanitized text.
     - Very long description (10,000 characters) does not break card flexbox layout.
     - Rapid duplicate clicks on "Start Job" do not create duplicate API dispatches.

---

## 7. Implementation Roadmap & Recommendation for Orchestrator

1. **Step 1: Database Schema Expansion**
   - Execute idempotent SQL migration on Ubuntu backend server adding `requires_proof`, `proof_notes`, `revision_notes`, `approved_by`, `completed_at` to `staff_tasks`.
2. **Step 2: Backend API Route Hardening (`backend-api/src/routes/crm.js`)**
   - Update `GET /api/crm/tasks` with `users` table joins for assignee, creator, and approver details.
   - Implement `PATCH /api/crm/tasks/:id/status` with state transition validation, manager authorization checks, and revision handling.
3. **Step 3: Frontend API Service Extension (`src/services/crmApi.ts`)**
   - Add `CRMTask` type definition and export `getCRMTasks`, `createCRMTask`, `updateCRMTask`, `transitionCRMTaskStatus`, `deleteCRMTask`.
4. **Step 4: Frontend UI Enhancement (`src/pages/crm/Tasks.tsx`)**
   - Connect to live `crmApi.getCRMTasks()`.
   - Wire real organization members into the Assignee picker in `<CreateTaskDialog>`.
   - Add Manager Revision Request modal (`<RequestRevisionDialog>`) and card trigger for tasks in `review`.
   - Add revision alert banner on cards returned to `in_progress`.
   - Add contextual action buttons in Table view matching Kanban capabilities.
5. **Step 5: Automated Test Suite Implementation**
   - Create `src/test/crmTasksLifecycle.test.tsx` and `src/test/crmTasksApi.test.ts` implementing the 4-tier test plan.
   - Verify `cmd /c npx vitest run src/test/crmTasks*` exits with 100% pass rate.
   - Verify `cmd /c npx tsc --noEmit` exits with 0 errors.

---
*End of Report.*
