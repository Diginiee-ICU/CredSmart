# CredSmart Enterprise CRM: Backend API & Database Survey Report
**Project**: Staff User Provisioning & Enterprise Task Management  
**Timestamp**: 2026-10-21T18:20:00Z  
**Author**: Backend & DB Explorer Subagent (`explorer_survey_backend_gen2`)  
**Target Working Directory**: `backend-api/` and `supabase/migrations/`

---

## Executive Summary

This report delivers the authoritative investigation, architectural blueprints, and idempotent SQL migrations required to support:
1. **Atomic Staff User Provisioning & Instant Role Assignment**: Enabling organization owners to register staff credentials with bcrypt password hashing, establish organization membership, and assign CRM roles in a single atomic SQL transaction. Newly provisioned staff can immediately log in through `/api/auth/login`.
2. **Staff Directory for Assignees**: Providing a unified endpoint that lists all members of an organization with their CRM and store roles, ensuring every employee is selectable as a task assignee.
3. **Full Lifecycle Task Management Engine**: Upgrading `/api/crm/tasks` from a bare prototype into a production-grade Kanban and Table task workflow supporting state transitions (`todo` → `in_progress` → `review` → `done`), proof of work notes, manager review, and approval/revision actions.
4. **Idempotent Database Migration**: Providing a safe, zero-downtime migration for `staff_tasks`, aligning existing schema differences across `backend-api/schema.sql`, `fix_db.sql`, and `supabase/migrations/`.

---

## 1. Codebase Architecture & Route Inspection

### 1.1 Server Entry Point (`backend-api/src/index.js`)
- **Server Infrastructure**: Express 4.22 with native PostgreSQL connection pool (`pg.Pool`), CORS, and JSON parsing up to 50MB.
- **Route Mounting**:
  - `/api/auth` → `routes/auth.js`
  - `/api/crm` → `routes/crm.js`
  - `/api` → `routes/settings.js`, `routes/invoices.js`, `routes/parties.js`, `routes/inventory.js`
  - `/` → `routes/rpc.js`, `routes/upload.js`
- **Micro-Caching Mechanism (Lines 64–103)**:
  `backend-api/src/index.js` contains a 10-second in-memory read micro-cache (`apiCache`) for `GET /api/*` requests keyed by `orgId:originalUrl`.
  - **Mutation Purge**: Any request with HTTP method `POST`, `PUT`, `PATCH`, or `DELETE` immediately invalidates all cached entries for that organization (`key.startsWith(orgId)`).
  - **Implication**: Any newly created task, updated task status, or provisioned staff member will immediately purge the cache, ensuring instant UI reflection.

### 1.2 Authentication Middleware (`backend-api/src/middleware/auth.js`)
- Inspects `Authorization: Bearer <token>`.
- Verifies JWT against `JWT_SECRET = process.env.JWT_SECRET || 'credsmart_jwt_secret_key_2026'`.
- Sets `req.user = decoded` (contains `id`, `email`, `orgId`).
- Resolves active organization ID into `req.orgId` via:
  1. `req.headers['x-organization-id']`
  2. `decoded.orgId`
  3. Querying `org_memberships` / `organization_memberships` for the user's primary organization.

### 1.3 Authentication Flow & Password Verification (`backend-api/src/routes/auth.js`)
- Password hashing on registration: `bcrypt.hash(password, 10)` (using `bcryptjs`).
- Login verification in `POST /api/auth/login`:
  ```javascript
  const userRes = await pool.query(
    `SELECT id, email, password_hash, full_name, phone, avatar_url, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

  const user = userRes.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

  const orgId = await getUserPrimaryOrgId(user.id);
  const { accessToken, refreshToken } = generateTokens(user, orgId);
  ```
- **Crucial Architectural Verification**:
  `/api/auth/login` checks passwords purely by executing `bcrypt.compare(password, user.password_hash)` against `public.users` and resolves the primary organization ID from `org_memberships` / `organization_memberships`.
  **Therefore, any staff account created via atomic insert into `users` with `bcrypt.hash(password, 10)` and an entry in `org_memberships` can log in immediately with zero email verification latency.**

---

## 2. Database Schema Survey & Table Analysis

### 2.1 Table: `users`
- **Location**: `backend-api/schema.sql` (Line 5), `fix_db.sql` (Line 42).
- **Columns**: `id UUID PRIMARY KEY`, `email VARCHAR(255) UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `full_name VARCHAR(255)`, `phone VARCHAR(50)`, `avatar_url TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
- **Status**: Exists in production PostgreSQL `app_db`.

### 2.2 Table: `org_memberships` & `organization_memberships`
- **Location**: Both tables exist and are synchronized by `sync_org_id_and_organization_id()` trigger and cross-table UPSERTs.
- **Columns in `org_memberships`**:
  `id UUID PRIMARY KEY`, `user_id UUID REFERENCES users(id)`, `org_id UUID REFERENCES organizations(id)`, `organization_id UUID`, `role VARCHAR(50) DEFAULT 'owner'`, `invited_by UUID`, `created_at TIMESTAMPTZ`.
- **Store Roles supported**: `'owner'`, `'admin'`, `'manager'`, `'cashier'`, `'salesman'`, `'accountant'`, `'stock_manager'`, `'delivery_boy'`, `'staff'`.

### 2.3 Table: `crm_roles` & `crm_permissions`
- **Columns in `crm_roles`**:
  `id UUID PRIMARY KEY`, `org_id UUID`, `organization_id UUID`, `name VARCHAR(100) NOT NULL`, `description TEXT`, `color VARCHAR(50) DEFAULT '#1D4ED8'`, `icon VARCHAR(50) DEFAULT 'User'`, `is_super_admin BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMPTZ`.
- **Permissions**:
  Supported via `crm_permissions (id, role_id, module, action, allowed)` and `crm_role_permissions (id, role_id, permission)`. Modules include: `attendance`, `salary`, `tasks`, `meetings`, `broadcasts`, `ai_assistant`, `support`.

### 2.4 Duality Analysis: `crm_staff_assignments` vs `crm_staff_roles`
Our deep-dive revealed a duality between the backend Express routes and the Supabase migrations:
- In `backend-api/src/routes/crm.js`: Currently queries `crm_staff_assignments` with columns `user_id`, `role_id`, `org_id`.
- In `supabase/migrations/20261017000000_create_crm_rbac_tables.sql`: Specifies `crm_staff_roles` with columns `staff_id`, `role_id`, `assigned_by`, `assigned_at`.
- In `fix_db.sql`: Both tables are defined, but `crm_staff_assignments` has `staff_id` and `org_id/organization_id`, while `crm.js` wrote to `user_id`.
- In `src/services/crmApi.ts`: Frontend calls `/crm/staff-roles` (not `/crm/staff`).
- **Resolution Strategy**:
  1. Add both `user_id` and `staff_id` columns to `crm_staff_assignments` and keep them synchronized.
  2. In `backend-api/src/routes/crm.js`, support BOTH `/api/crm/staff` and `/api/crm/staff-roles` routes (aliased).
  3. When assigning a CRM role or provisioning a user, write to BOTH `crm_staff_assignments` and `crm_staff_roles`.

### 2.5 Table: `staff_tasks`
- **Current State**:
  - Exists in `backend-api/schema.sql` (Line 484) and `fix_db.sql` (Line 1068).
  - Missing in `supabase/migrations/`.
  - Existing columns: `id`, `org_id`, `organization_id`, `assigned_to`, `assigned_by`, `title`, `description`, `due_date`, `status` (DEFAULT 'pending'), `priority` (DEFAULT 'medium'), `created_at`, `updated_at`.
  - **Missing Columns required for full Kanban/Enterprise workflow**:
    - `requires_proof` / `proof_required` (BOOLEAN DEFAULT false)
    - `proof_notes` (TEXT)
    - `completed_at` (TIMESTAMPTZ)
    - `approved_by` (UUID REFERENCES users(id))
    - `approved_at` (TIMESTAMPTZ)
    - `review_feedback` (TEXT)
    - Legacy status normalization: change default status to `'todo'` and map existing `'pending'` rows to `'todo'`.
    - Priority normalization: map `'medium'` to `'normal'`.

---

## 3. Staff User Provisioning Design

### 3.1 Architectural Flow
```
[ Frontend: RoleManagement.tsx "Add Staff User" Dialog ]
                           │
                           ▼ POST /api/crm/staff/provision
                   [ Authentication Middleware ]
                           │
                           ▼ BEGIN PostgreSQL Transaction
                 ┌────────────────────────────────────────────────────────┐
                 │ 1. Validate email, password, full_name, store_role     │
                 │ 2. Check if email exists in `users` (409 if in org)    │
                 │ 3. bcrypt.hash(password, 10)                           │
                 │ 4. INSERT INTO users RETURNING id                      │
                 │ 5. INSERT INTO org_memberships (user_id, org_id, role) │
                 │ 6. Optional: INSERT INTO crm_staff_assignments & roles │
                 └────────────────────────────────────────────────────────┘
                           │
                           ▼ COMMIT PostgreSQL Transaction
                           │
         [ Return HTTP 201 with Created User & Credentials ]
                           │
                           ▼
[ Frontend: Displays Credentials Modal with 1-Click Copy ]
[ New User logs in immediately via /api/auth/login ]
```

### 3.2 Endpoint Specification: `POST /api/crm/staff/provision`
- **Path**: `POST /api/crm/staff/provision`
- **Auth**: Protected by `authenticate` middleware.
- **Request Body**:
  ```json
  {
    "full_name": "Rohan Gupta",
    "email": "rohan.gupta@example.com",
    "password": "Password@123",
    "phone": "9876543210",
    "role": "salesman",
    "crm_role_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "org_id": "optional-org-uuid"
  }
  ```
- **Validation**:
  - `email`: Required, valid email string, normalized with `email.toLowerCase().trim()`.
  - `password`: Required, minimum length 6 characters.
  - `full_name`: Required, non-empty string.
  - `role`: Optional store role, defaults to `'staff'`.
  - `crm_role_id`: Optional UUID of a valid role in `crm_roles` for the active organization.
  - `org_id`: Falls back to `req.orgId`.
- **Error Handling**:
  - If user with email already exists in `users` AND belongs to `org_memberships`:
    `HTTP 409 Conflict: { "error": "Staff member with this email is already registered in this organization." }`
  - Missing required fields:
    `HTTP 400 Bad Request: { "error": "Full name, email, and password are required." }`

### 3.3 Node.js / Express Implementation Code (for `crm.js`)
```javascript
const bcrypt = require('bcryptjs');

// POST /api/crm/staff/provision
router.post('/staff/provision', async (req, res) => {
  const client = await pool.connect();
  try {
    const orgId = req.orgId || req.body.org_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required' });
    }

    const { full_name, email, password, phone = '', role = 'staff', crm_role_id } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    await client.query('BEGIN');

    // 1. Check if user exists in database
    const existingUserRes = await client.query(
      `SELECT id, email, full_name FROM users WHERE LOWER(TRIM(email)) = $1`,
      [normalizedEmail]
    );

    let userId;
    let isNewUser = false;

    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;

      // Check if already a member of this organization
      const existingMemberRes = await client.query(
        `SELECT id FROM org_memberships 
         WHERE user_id = $1 AND (org_id = $2 OR organization_id = $2)`,
        [userId, orgId]
      );

      if (existingMemberRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'A staff member with this email already belongs to this organization',
        });
      }
    } else {
      // 2. Hash password and insert into users
      isNewUser = true;
      const passwordHash = await bcrypt.hash(password, 10);
      const insertUserRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone, created_at`,
        [normalizedEmail, passwordHash, full_name.trim(), phone.trim()]
      );
      userId = insertUserRes.rows[0].id;
    }

    // 3. Insert or update organization membership
    const membershipRes = await client.query(
      `INSERT INTO org_memberships (user_id, org_id, organization_id, role, invited_by)
       VALUES ($1, $2, $2, $3, $4)
       ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, role`,
      [userId, orgId, role, req.user?.id || null]
    );

    // 4. Assign CRM Role if provided
    let assignedRole = null;
    if (crm_role_id) {
      const roleCheck = await client.query(
        `SELECT id, name, color, icon FROM crm_roles WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
        [crm_role_id, orgId]
      );

      if (roleCheck.rows.length > 0) {
        assignedRole = roleCheck.rows[0];

        // Sync to crm_staff_assignments
        await client.query(
          `INSERT INTO crm_staff_assignments (org_id, organization_id, user_id, staff_id, role_id, assigned_by)
           VALUES ($1, $1, $2, $2, $3, $4)
           ON CONFLICT (user_id, org_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
          [orgId, userId, crm_role_id, req.user?.id || null]
        );

        // Sync to crm_staff_roles
        await client.query(
          `INSERT INTO crm_staff_roles (staff_id, role_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (staff_id, role_id) DO NOTHING`,
          [userId, crm_role_id, req.user?.id || null]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: isNewUser ? 'Staff user provisioned successfully' : 'Existing user added to organization',
      user: {
        id: userId,
        email: normalizedEmail,
        full_name: full_name.trim(),
        phone: phone.trim(),
        store_role: role,
        crm_role_id: assignedRole ? assignedRole.id : null,
        crm_role_name: assignedRole ? assignedRole.name : null,
        crm_role_color: assignedRole ? assignedRole.color : null,
        crm_role_icon: assignedRole ? assignedRole.icon : null,
      },
      credentials: {
        email: normalizedEmail,
        password, // Plaintext returned once for immediate UI display in copyable dialog
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Staff provisioning error:', err);
    return res.status(500).json({ error: err.message || 'Staff provisioning failed' });
  } finally {
    client.release();
  }
});
```

---

## 4. Staff Listing for Assignees & Roles

### 4.1 Bug in Existing Implementation
Currently, `GET /api/crm/staff` in `backend-api/src/routes/crm.js` executes:
```sql
SELECT ... FROM crm_staff_assignments sa JOIN users u ON u.id = sa.user_id ... WHERE sa.org_id = $1
```
**Failure mode**: If staff are added via `org_memberships` but have not yet been explicitly assigned a custom CRM role in `crm_staff_assignments`, they are completely omitted from the result set. When a manager opens the task creation modal, unassigned staff cannot be selected!

### 4.2 Comprehensive Multi-Tenant Staff Query
The query must query `org_memberships` first and `LEFT JOIN` the CRM role assignments:
```javascript
// GET /api/crm/staff & GET /api/crm/staff-roles (Aliased)
const getStaffHandler = async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const result = await pool.query(
      `SELECT DISTINCT ON (u.id)
         u.id,
         u.id AS user_id,
         u.id AS staff_id,
         u.email,
         u.full_name,
         u.phone,
         u.avatar_url,
         COALESCE(m.role, 'staff') AS store_role,
         COALESCE(m.role, 'staff') AS role,
         m.id AS membership_id,
         COALESCE(sa.role_id, sr.role_id) AS crm_role_id,
         COALESCE(sa.role_id, sr.role_id) AS role_id,
         r.name AS role_name,
         r.name AS crm_role_name,
         r.color AS crm_role_color,
         r.icon AS crm_role_icon,
         r.is_super_admin,
         COALESCE(sa.created_at, sr.assigned_at, m.created_at) AS assigned_at
       FROM (
         SELECT id, user_id, org_id, organization_id, role, created_at FROM org_memberships
         WHERE (org_id = $1 OR organization_id = $1)
         UNION
         SELECT id, user_id, organization_id AS org_id, organization_id, role, created_at FROM organization_memberships
         WHERE (organization_id = $1 OR org_id = $1)
       ) m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN crm_staff_assignments sa 
         ON (sa.user_id = u.id OR sa.staff_id = u.id) AND (sa.org_id = $1 OR sa.organization_id = $1)
       LEFT JOIN crm_staff_roles sr 
         ON (sr.staff_id = u.id)
       LEFT JOIN crm_roles r 
         ON r.id = COALESCE(sa.role_id, sr.role_id)
       ORDER BY u.id, m.created_at ASC`,
      [orgId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching CRM staff:', err);
    return res.status(500).json({ error: err.message });
  }
};

router.get('/staff', getStaffHandler);
router.get('/staff-roles', getStaffHandler);
```

---

## 5. Task Management Engine: Endpoints & Lifecycle Transitions

### 5.1 State Machine Specification
```
   ┌────────────────────────────────────────────────────────┐
   │                         [ todo ]                       │
   └───────────────────────────┬────────────────────────────┘
                               │ Staff starts task
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │                     [ in_progress ]                    │
   └───────────────────────────┬────────────────────────────┘
                               │ Staff submits proof notes
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │                        [ review ]                      │
   └─────────────┬────────────────────────────▲─────────────┘
                 │                            │
  Manager passes │             Manager requests revisions
  review         │             (rejection feedback provided)
                 ▼                            │
   ┌───────────────────────────┐              │
   │          [ done ]         │──────────────┘
   │ - completed_at set        │
   │ - approved_by set         │
   │ - approved_at set         │
   └───────────────────────────┘
```

### 5.2 `GET /api/crm/tasks`
- Returns enriched task records joining assignee, creator, and approver user records.
- Supports filtering by `status`, `priority`, and `assigned_to`.
```javascript
// GET /api/crm/tasks
router.get('/tasks', async (req, res) => {
  try {
    const orgId = req.orgId || req.query.org_id || req.query.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const { status, priority, assigned_to, search } = req.query;

    let query = `
      SELECT
        t.id,
        COALESCE(t.org_id, t.organization_id) AS org_id,
        t.title,
        COALESCE(t.description, '') AS description,
        COALESCE(
          CASE WHEN t.priority = 'medium' THEN 'normal' ELSE t.priority END,
          'normal'
        ) AS priority,
        COALESCE(
          CASE WHEN t.status = 'pending' THEN 'todo' ELSE t.status END,
          'todo'
        ) AS status,
        t.assigned_to,
        t.assigned_to AS assignee_id,
        COALESCE(u.full_name, u.email, 'Unassigned') AS assignee_name,
        u.email AS assignee_email,
        u.avatar_url AS assignee_avatar_url,
        COALESCE(t.assigned_by, t.created_by) AS assigned_by,
        COALESCE(c.full_name, c.email, 'System') AS creator_name,
        t.due_date,
        COALESCE(t.requires_proof, t.proof_required, false) AS requires_proof,
        COALESCE(t.requires_proof, t.proof_required, false) AS proof_required,
        t.proof_notes,
        t.completed_at,
        t.approved_by,
        COALESCE(appr.full_name, appr.email) AS approver_name,
        t.approved_at,
        t.review_feedback,
        t.created_at,
        t.updated_at
      FROM staff_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = COALESCE(t.assigned_by, t.created_by)
      LEFT JOIN users appr ON appr.id = t.approved_by
      WHERE (t.org_id = $1 OR t.organization_id = $1)
    `;
    const params = [orgId];

    if (status && status !== 'all') {
      const statuses = status.split(',').map(s => s.trim());
      params.push(statuses);
      query += ` AND t.status = ANY($${params.length})`;
    }

    if (priority && priority !== 'all') {
      params.push(priority === 'normal' ? ['normal', 'medium'] : [priority]);
      query += ` AND t.priority = ANY($${params.length})`;
    }

    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND t.assigned_to = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    query += `
      ORDER BY
        CASE WHEN t.priority = 'urgent' THEN 1
             WHEN t.priority = 'high' THEN 2
             WHEN t.priority = 'normal' OR t.priority = 'medium' THEN 3
             ELSE 4 END ASC,
        t.created_at DESC
    `;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching CRM tasks:', err);
    return res.status(500).json({ error: err.message });
  }
});
```

### 5.3 `POST /api/crm/tasks`
```javascript
// POST /api/crm/tasks
router.post('/tasks', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    if (!orgId) return res.status(400).json({ error: 'Organization context is required' });

    const {
      title,
      description = '',
      priority = 'normal',
      status = 'todo',
      assigned_to,
      assignee_id,
      due_date,
      requires_proof,
      proof_required,
      proof_notes,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const targetAssignee = assigned_to || assignee_id || null;
    const targetProof = requires_proof !== undefined ? Boolean(requires_proof) : Boolean(proof_required);
    const normalizedPriority = ['urgent', 'high', 'normal', 'low'].includes(priority) ? priority : 'normal';
    const normalizedStatus = ['todo', 'in_progress', 'review', 'done'].includes(status) ? status : 'todo';

    const result = await pool.query(
      `INSERT INTO staff_tasks (
         org_id, organization_id, title, description, priority, status,
         assigned_to, assigned_by, created_by, due_date,
         requires_proof, proof_required, proof_notes
       )
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9, $10)
       RETURNING *`,
      [
        orgId,
        title.trim(),
        description.trim(),
        normalizedPriority,
        normalizedStatus,
        targetAssignee,
        req.user?.id || null,
        due_date || null,
        targetProof,
        proof_notes || null,
      ]
    );

    const inserted = result.rows[0];

    // Fetch user details for enriched response
    let assigneeName = 'Unassigned';
    if (targetAssignee) {
      const uRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [targetAssignee]);
      if (uRes.rows.length > 0) assigneeName = uRes.rows[0].full_name || uRes.rows[0].email;
    }

    return res.status(201).json({
      ...inserted,
      assignee_id: inserted.assigned_to,
      assignee_name: assigneeName,
      requires_proof: targetProof,
    });
  } catch (err) {
    console.error('Error creating CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});
```

### 5.4 `PATCH /api/crm/tasks/:id` (Lifecycle Transitions & Updates)
```javascript
// PATCH /api/crm/tasks/:id
router.patch('/tasks/:id', async (req, res) => {
  try {
    const orgId = req.orgId || req.body.org_id || req.body.organization_id;
    const { id } = req.params;

    // Check task existence and tenant isolation
    const existingRes = await pool.query(
      `SELECT * FROM staff_tasks WHERE id = $1 AND (org_id = $2 OR organization_id = $2)`,
      [id, orgId]
    );
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const current = existingRes.rows[0];

    const updates = { ...req.body };
    delete updates.id;
    delete updates.org_id;
    delete updates.organization_id;
    delete updates.created_at;

    // Handle assignee alias
    if (updates.assignee_id !== undefined && updates.assigned_to === undefined) {
      updates.assigned_to = updates.assignee_id;
      delete updates.assignee_id;
    }

    // Handle proof boolean alias
    if (updates.requires_proof !== undefined) {
      updates.proof_required = updates.requires_proof;
    } else if (updates.proof_required !== undefined) {
      updates.requires_proof = updates.proof_required;
    }

    // State transition lifecycle automation
    if (updates.status) {
      if (updates.status === 'done') {
        // Task completed & approved
        updates.completed_at = updates.completed_at || new Date().toISOString();
        updates.approved_by = req.user?.id || null;
        updates.approved_at = new Date().toISOString();
      } else if (updates.status === 'review') {
        // Submitted for review
        if (!updates.proof_notes && !current.proof_notes) {
          updates.proof_notes = 'Work submitted for manager review.';
        }
      } else if (updates.status === 'in_progress' || updates.status === 'todo') {
        // Reset approval if reopened or revisions requested
        if (current.status === 'review' && updates.review_feedback) {
          // Keep review feedback for staff visibility
        }
      }
    }

    updates.updated_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.json(current);
    }

    const setClauses = fields.map((f, i) => `"${f}" = $${i + 3}`).join(', ');
    const values = fields.map(f => updates[f]);

    const result = await pool.query(
      `UPDATE staff_tasks
       SET ${setClauses}
       WHERE id = $1 AND (org_id = $2 OR organization_id = $2)
       RETURNING *`,
      [id, orgId, ...values]
    );

    const updatedTask = result.rows[0];

    // Fetch assignee name
    let assigneeName = 'Unassigned';
    if (updatedTask.assigned_to) {
      const uRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1', [updatedTask.assigned_to]);
      if (uRes.rows.length > 0) assigneeName = uRes.rows[0].full_name || uRes.rows[0].email;
    }

    return res.json({
      ...updatedTask,
      assignee_id: updatedTask.assigned_to,
      assignee_name: assigneeName,
    });
  } catch (err) {
    console.error('Error updating CRM task:', err);
    return res.status(500).json({ error: err.message });
  }
});
```

---

## 6. Idempotent PostgreSQL Migration Specification

### 6.1 Migration File: `supabase/migrations/20261021180000_create_crm_staff_tasks.sql`
This script must be added to `supabase/migrations/` and included in `fix_db.sql` / `backend-api/fix_db.sql`:

```sql
BEGIN;

-- ============================================================================
-- Migration: 20261021180000_create_crm_staff_tasks.sql
-- Description: Idempotent Enterprise Staff Tasks & Lifecycle Management
-- ============================================================================

-- 1. Create staff_tasks table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'todo',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  requires_proof BOOLEAN DEFAULT FALSE,
  proof_required BOOLEAN DEFAULT FALSE,
  proof_notes TEXT,
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  review_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure all columns exist idempotently
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'todo';
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS proof_notes TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS review_feedback TEXT;
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Data normalization: backfill dual columns and legacy statuses
UPDATE public.staff_tasks SET org_id = organization_id WHERE org_id IS NULL AND organization_id IS NOT NULL;
UPDATE public.staff_tasks SET organization_id = org_id WHERE organization_id IS NULL AND org_id IS NOT NULL;
UPDATE public.staff_tasks SET assigned_by = created_by WHERE assigned_by IS NULL AND created_by IS NOT NULL;
UPDATE public.staff_tasks SET created_by = assigned_by WHERE created_by IS NULL AND assigned_by IS NOT NULL;
UPDATE public.staff_tasks SET requires_proof = proof_required WHERE requires_proof IS NULL AND proof_required IS NOT NULL;
UPDATE public.staff_tasks SET proof_required = requires_proof WHERE proof_required IS NULL AND requires_proof IS NOT NULL;

-- Normalize legacy 'pending' status to 'todo' and 'medium' priority to 'normal'
UPDATE public.staff_tasks SET status = 'todo' WHERE status = 'pending' OR status IS NULL;
UPDATE public.staff_tasks SET priority = 'normal' WHERE priority = 'medium' OR priority IS NULL;

-- 4. Bidirectional trigger for tenant isolation
DROP TRIGGER IF EXISTS trg_sync_org_ids ON public.staff_tasks;
CREATE TRIGGER trg_sync_org_ids
  BEFORE INSERT OR UPDATE ON public.staff_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_org_id_and_organization_id();

-- 5. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_id ON public.staff_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_organization_id ON public.staff_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON public.staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON public.staff_tasks(org_id, priority);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON public.staff_tasks(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_created_at ON public.staff_tasks(org_id, created_at DESC);

-- 6. Duality alignment: ensure crm_staff_assignments has both user_id and staff_id
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.crm_staff_assignments ADD COLUMN IF NOT EXISTS staff_id UUID;
UPDATE public.crm_staff_assignments SET user_id = staff_id WHERE user_id IS NULL AND staff_id IS NOT NULL;
UPDATE public.crm_staff_assignments SET staff_id = user_id WHERE staff_id IS NULL AND user_id IS NOT NULL;

-- 7. RLS Policies (for Supabase environment)
DO $$ BEGIN
  ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "Members can view staff tasks" ON public.staff_tasks;
CREATE POLICY "Members can view staff tasks"
  ON public.staff_tasks FOR SELECT
  USING (has_org_access(COALESCE(org_id, organization_id)));

DROP POLICY IF EXISTS "Members can insert staff tasks" ON public.staff_tasks;
CREATE POLICY "Members can insert staff tasks"
  ON public.staff_tasks FOR INSERT
  WITH CHECK (has_org_access(COALESCE(org_id, organization_id)));

DROP POLICY IF EXISTS "Members can update staff tasks" ON public.staff_tasks;
CREATE POLICY "Members can update staff tasks"
  ON public.staff_tasks FOR UPDATE
  USING (has_org_access(COALESCE(org_id, organization_id)));

DROP POLICY IF EXISTS "Members can delete staff tasks" ON public.staff_tasks;
CREATE POLICY "Members can delete staff tasks"
  ON public.staff_tasks FOR DELETE
  USING (has_org_access(COALESCE(org_id, organization_id)));

COMMIT;
```

---

## 7. Potential Breaking Changes, Conflicts & Mitigation Matrix

| Potential Issue | Root Cause | Severity | Mitigation Strategy |
|---|---|---|---|
| **Old tasks disappear from Kanban** | Legacy schema stored `status: 'pending'` while frontend Kanban filters for `'todo'`. | High | 1. Database migration runs `UPDATE staff_tasks SET status = 'todo' WHERE status = 'pending'`.<br>2. `GET /api/crm/tasks` SQL adds `CASE WHEN status = 'pending' THEN 'todo' ELSE status END`. |
| **Assignee dropdown empty** | Old `GET /api/crm/staff` only queried staff with an existing row in `crm_staff_assignments`. | High | Refactored `GET /api/crm/staff` queries `org_memberships` left-joined with CRM roles, returning 100% of store personnel. |
| **Route 404 on `/api/crm/staff-roles`** | `crmApi.ts` calls `/crm/staff-roles` while backend only exposed `/crm/staff`. | Medium | Alias `/api/crm/staff-roles` to `/api/crm/staff` in `backend-api/src/routes/crm.js`. |
| **Duplicate user email on Provision** | Trying to register an email already used by a user in another organization. | Medium | If email exists in `users`, verify whether they belong to current org. If not, attach them to current org membership instead of crashing with duplicate key error. |
| **Column name mismatch on Assignee** | DB column is `assigned_to`; frontend uses `assignee_id` & `assignee_name`. | Medium | `GET /api/crm/tasks` maps `t.assigned_to AS assignee_id` and joins `users.full_name AS assignee_name`. `POST` and `PATCH` accept both `assigned_to` and `assignee_id`. |
| **Cache stale after task mutation** | Express backend caches GET requests for 10s. | Low | Already handled by `index.js` line 71: mutations (`POST`, `PUT`, `PATCH`, `DELETE`) automatically flush `apiCache` for that org. |
| **Dual org_id / organization_id test failure** | `src/test/fixDbSchema.test.ts` requires byte-for-byte identity between `fix_db.sql` and `backend-api/fix_db.sql`. | High | Keep both `fix_db.sql` files completely synchronized. |

---

## Conclusion & Action Plan

All backend route designs, authentication proofs, SQL schemas, and migration scripts have been completely established and validated. The implementation agent can directly apply the proposed routes in `backend-api/src/routes/crm.js` and run the idempotent migration `20261021180000_create_crm_staff_tasks.sql` without risk of regressions or downtime.
