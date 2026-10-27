# Forensic Backend API & Database Survey: CredSmart CRM Defects Elimination

**Investigator**: `explorer_survey_backend_crm`  
**Date**: 2026-10-26T20:15:00Z  
**Target Systems**: `backend-api/` (Express, pg, node.js), PostgreSQL (`app_db` / Ubuntu Server Docker container `postgres-db`)  
**Scope**: Requirements R1, R5, and R7 (Multi-Tenant Isolation, Micro-Caching & DB Indexes, CRM vs. POS Domain Data Separation)

---

## 1. Executive Summary

This forensic investigation performed a complete code-level and database schema mapping of the CredSmart backend API and PostgreSQL database. The core issues that led to:
1. **Staff disappearing on refresh and cross-tenant user leaks**,
2. **Newly provisioned staff binding to the wrong organization**,
3. **Task assignments failing with HTTP 400 errors**,
4. **CRM pages loading slowly due to uncached PostgREST queries**, and
5. **Coupled CRM and POS cache invalidations**

were identified across four key backend source files and two database migration/fix scripts:
- `backend-api/fix_db.sql` (Lines 130–148: Rogue SQL CROSS JOIN between `users` and `organizations`).
- `backend-api/src/routes/auth.js` (Lines 16–66: `getUserPrimaryOrgId` product-count sorting and rogue fallback auto-insert into largest organization).
- `backend-api/src/middleware/auth.js` (Lines 24–55: Organization resolution ordered by product count and error fallback assigning foreign organization).
- `backend-api/src/routes/settings.js` (Lines 128–220 and 294–336: Unscoped `/api/organization-memberships` and `/api/profiles` returning the entire user table when `targetOrg` is absent).
- `backend-api/src/routes/crm.js` (Lines 34–91, 410–688, 690–828, 1802–1909: Verification functions, staff provisioning, staff listing, and task assignments).
- `backend-api/src/index.js` (Lines 64–103: Micro-cache gate `req.path.startsWith('/api/')` leaving all `/rest/v1/*` requests uncached; global mutation invalidation flushing POS and CRM caches simultaneously).
- `backend-api/add_indexes.sql` and `backend-api/fix_db.sql` (Absence of composite B-Tree indexes on `crm_staff_assignments`, `staff_tasks`, and `crm_salary_profiles`).

---

## 2. Requirement R1: Multi-Tenant User Isolation & Staff Provisioning

### 2.1. Forensic Analysis of `backend-api/fix_db.sql` (Lines 130–148)

#### Direct Observation
In `backend-api/fix_db.sql`, lines 130–148 contain:
```sql
-- Guarantee that all registered users have access to all business organizations so old data is always visible
INSERT INTO org_memberships (user_id, org_id, organization_id, role)
SELECT u.id, o.id, o.id, 'owner'
FROM users u
CROSS JOIN organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM org_memberships m
  WHERE m.user_id = u.id AND (m.org_id = o.id OR m.organization_id = o.id)
);

INSERT INTO organization_memberships (user_id, organization_id, org_id, role)
SELECT u.id, o.id, o.id, 'owner'
FROM users u
CROSS JOIN organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_memberships om
  WHERE om.user_id = u.id AND (om.organization_id = o.id OR om.org_id = o.id)
);
```

#### Forensic Assessment & Blast Radius
1. **Catastrophic Tenant Flattening**: The `CROSS JOIN` between `users` and `organizations` creates a Cartesian product $N \times M$. If there are 50 registered users and 10 organizations, 500 membership records are inserted, declaring **every user an `owner` of every business organization in PostgreSQL**.
2. **Zero-Tenant Privacy**:
   - Any query checking `WHERE org_id = $1` in `org_memberships` returns every registered user in the database.
   - Any query resolving a user's memberships returns every organization in the system.
   - Newly registered store owners immediately see foreign users in their staff list, and staff members see foreign store organizations in their workspace dropdown.
3. **Execution Vector**: `deploy-fix.sh` (Line 70) executes `fix_db.sql` directly into `docker exec -i postgres-db psql -U postgres -d app_db`. Every time `deploy-fix.sh` was run on the Ubuntu server, this cross-join re-populated rogue owner links for all registered accounts.

#### Remediation Plan for `fix_db.sql`
1. **Excise Lines 130–148**: Delete the entire `CROSS JOIN` block from `backend-api/fix_db.sql`.
2. **Database Cleansing Migration**: Run an idempotent SQL cleanup script to remove rogue memberships:
   ```sql
   -- Keep only memberships that:
   -- 1. Match the organization creator email: o.email = u.email
   -- 2. Were created via explicit invitation: m.invited_by IS NOT NULL
   -- 3. Exist as an authoritative staff assignment: (u.id, o.id) in crm_staff_assignments
   -- 4. Are the single earliest created membership for that user
   DELETE FROM org_memberships m
   WHERE m.role = 'owner'
     AND NOT EXISTS (
       SELECT 1 FROM organizations o WHERE o.id = m.org_id AND LOWER(TRIM(o.email)) = (
         SELECT LOWER(TRIM(u.email)) FROM users u WHERE u.id = m.user_id
       )
     )
     AND NOT EXISTS (
       SELECT 1 FROM crm_staff_assignments sa WHERE sa.user_id = m.user_id AND (sa.org_id = m.org_id OR sa.organization_id = m.org_id)
     )
     AND m.invited_by IS NULL
     AND m.id NOT IN (
       SELECT DISTINCT ON (user_id) id FROM org_memberships ORDER BY user_id, created_at ASC
     );

   -- Mirror deletion to organization_memberships
   DELETE FROM organization_memberships om
   WHERE NOT EXISTS (
     SELECT 1 FROM org_memberships m WHERE m.user_id = om.user_id AND (m.org_id = om.organization_id OR m.organization_id = om.organization_id)
   );
   ```

---

### 2.2. Forensic Analysis of `auth.js` (`getUserPrimaryOrgId`) & `middleware/auth.js`

#### Direct Observation in `backend-api/src/routes/auth.js` (Lines 16–66)
```javascript
const getUserPrimaryOrgId = async (userId) => {
  try {
    const orgRes = await pool.query(
      `SELECT COALESCE(m.org_id, m.organization_id) AS org_id FROM (
         SELECT org_id, organization_id, user_id, created_at FROM org_memberships WHERE user_id = $1
         UNION
         SELECT organization_id AS org_id, organization_id, user_id, created_at FROM organization_memberships WHERE user_id = $1
       ) m
       WHERE m.org_id IS NOT NULL
       ORDER BY (
         SELECT COUNT(*) FROM products p WHERE p.org_id = m.org_id OR p.organization_id = m.org_id
       ) DESC, (
         SELECT COUNT(*) FROM sales s WHERE s.org_id = m.org_id OR s.organization_id = m.org_id
       ) DESC, m.created_at ASC
       LIMIT 1`,
      [userId]
    );
    if (orgRes.rows.length > 0 && orgRes.rows[0].org_id) return orgRes.rows[0].org_id;
  } catch (_mErr) { ... }

  // Fallback: If user has no membership, find the primary organization with data and auto-link
  try {
    const primaryOrg = await pool.query(
      `SELECT id FROM organizations
       ORDER BY (
         SELECT COUNT(*) FROM products p WHERE p.org_id = organizations.id OR p.organization_id = organizations.id
       ) DESC, created_at ASC
       LIMIT 1`
    );
    if (primaryOrg.rows.length > 0 && primaryOrg.rows[0].id) {
      const pId = primaryOrg.rows[0].id;
      await pool.query(
        `INSERT INTO org_memberships (user_id, org_id, organization_id, role)
         VALUES ($1, $2, $2, 'owner')
         ON CONFLICT (user_id, org_id) DO NOTHING`,
        [userId, pId]
      );
      return pId;
    }
  } catch (_pErr) {}

  return null;
};
```

#### Direct Observation in `backend-api/src/middleware/auth.js` (Lines 23–55)
```javascript
    } else {
      // Lookup user's first membership if not specified
      try {
        const memberRes = await pool.query(
          `SELECT COALESCE(m.org_id, m.organization_id) AS org_id
           FROM (
             SELECT org_id, organization_id, user_id FROM org_memberships WHERE user_id = $1
             UNION
             SELECT organization_id as org_id, organization_id, user_id FROM organization_memberships WHERE user_id = $1
           ) m
           ORDER BY (
             SELECT COUNT(*) FROM products p WHERE p.org_id = m.org_id OR p.organization_id = m.org_id
           ) DESC
           LIMIT 1`,
          [decoded.id]
        );
        if (memberRes.rows.length > 0 && memberRes.rows[0].org_id) {
          req.orgId = memberRes.rows[0].org_id;
        }
      } catch (e) {
        // Fallback: try querying organization directly with most data
        try {
          const directOrg = await pool.query(
            `SELECT id FROM organizations
             ORDER BY (
               SELECT COUNT(*) FROM products p WHERE p.org_id = organizations.id OR p.organization_id = organizations.id
             ) DESC, created_at ASC
             LIMIT 1`
          );
          if (directOrg.rows.length > 0) req.orgId = directOrg.rows[0].id;
        } catch (_ignored) {}
      }
    }
```

#### Forensic Flaws Identified
1. **The "Largest Catalog Takes All" Flaw**:
   When `fix_db.sql` cross-joined every user to every organization, `getUserPrimaryOrgId` and `middleware/auth.js` sorted memberships by:
   `ORDER BY (SELECT COUNT(*) FROM products p WHERE p.org_id = m.org_id) DESC`!
   As a direct consequence, **every single user who logs in is forced into the single organization in PostgreSQL that has the highest number of inventory products**. If Organization "A" has 100 products and Owner "B" creates Organization "B" with 0 products, Owner "B" and their staff are forced into Organization "A" upon login!
2. **Rogue Fallback Auto-Insert (`INSERT INTO org_memberships ... 'owner'`)**:
   Lines 44–64 in `auth.js`: If a user has no membership yet, instead of returning `null` or prompting organization onboarding, it queries the organization with the most products in the entire database and **inserts the user as an owner into that organization**!
3. **Missing `crm_staff_assignments` in Organization Resolution**:
   Neither `getUserPrimaryOrgId` nor `middleware/auth.js` checks `crm_staff_assignments`. If a staff user was provisioned via CRM and has an authoritative assignment in `crm_staff_assignments`, but `org_memberships` had a delay or column mismatch, the auth layer completely ignores their assigned organization and triggers the rogue fallback auto-insert into the largest foreign organization!

#### Remediation Plan for `auth.js` & `middleware/auth.js`
1. Include `crm_staff_assignments` in the membership query:
   ```sql
   SELECT COALESCE(m.org_id, m.organization_id) AS org_id FROM (
     SELECT org_id, organization_id, user_id, created_at, 1 AS priority FROM org_memberships WHERE user_id = $1
     UNION
     SELECT organization_id AS org_id, organization_id, user_id, created_at, 1 AS priority FROM organization_memberships WHERE user_id = $1
     UNION
     SELECT org_id, organization_id, COALESCE(user_id, staff_id) AS user_id, created_at, 2 AS priority FROM crm_staff_assignments WHERE (user_id = $1 OR staff_id = $1)
   ) m
   WHERE m.org_id IS NOT NULL
   ORDER BY m.priority ASC, m.created_at ASC
   LIMIT 1
   ```
2. **Eradicate lines 44–64 in `auth.js` and lines 43–54 in `middleware/auth.js` completely**. If a user has no membership, return `null`. Never auto-insert or fall back to foreign organizations based on product count.

---

### 2.3. Forensic Analysis of `backend-api/src/routes/settings.js`

#### Direct Observation
- `GET /api/organization-memberships` (Lines 128–170):
```javascript
const getMembershipsHandler = async (req, res) => {
  try {
    const { user_id, organization_id, org_id } = req.query;
    const targetOrg = organization_id || org_id || req.orgId;

    let rows = [];
    let queryErr = null;

    try {
      let query = `
        SELECT m.*, ...
        FROM org_memberships m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE 1=1
      `;
      const params = [];
      if (user_id) { ... }
      if (targetOrg) {
        ...
      } else {
        query += ' ORDER BY m.created_at ASC';
        const res1 = await pool.query(query, params);
        rows = res1.rows;
      }
```
- `GET /api/profiles` (Lines 294–325):
```javascript
router.get('/profiles', async (req, res) => {
  try {
    const { ids, search, limit } = req.query;
    const targetOrg = req.query.organization_id || req.query.org_id || req.orgId;
    let query = "SELECT id, email, full_name, ... FROM users WHERE 1=1";
    const params = [];

    if (ids) {
      ...
    } else if (targetOrg) {
      params.push(targetOrg);
      query += ` AND id IN (
        SELECT user_id FROM org_memberships WHERE org_id = $${params.length} OR organization_id = $${params.length}
        UNION
        SELECT user_id FROM organization_memberships WHERE organization_id = $${params.length} OR org_id = $${params.length}
      )`;
    }
    // If targetOrg is undefined and ids is undefined:
    query += ' ORDER BY full_name ASC NULLS LAST, created_at ASC';
    const result = await pool.query(query, params);
    return res.json(result.rows || []);
```

#### Forensic Flaws Identified
1. **Unscoped Fallback Leak**:
   In both `GET /api/organization-memberships` and `GET /api/profiles`, if `targetOrg` is omitted from the request (or if `req.orgId` was not resolved), the `WHERE` clause has no tenant boundary (`WHERE 1=1`). It directly selects **all users and all memberships in the database**, returning foreign emails, names, and phone numbers.
2. **Missing `crm_staff_assignments` in Profile Lookups**:
   Even when `targetOrg` is provided, `GET /api/profiles` queries `org_memberships` and `organization_memberships`. Any staff user whose CRM role exists strictly in `crm_staff_assignments` is invisible to `/api/profiles`.

#### Remediation Plan for `settings.js`
1. Enforce strict mandatory tenant scoping:
   ```javascript
   const targetOrg = req.query.organization_id || req.query.org_id || req.orgId;
   if (!targetOrg) {
     return res.json([]); // Return empty set rather than all tenants
   }
   ```
2. Include `crm_staff_assignments` in the user subquery:
   ```sql
   AND id IN (
     SELECT user_id FROM org_memberships WHERE org_id = $1 OR organization_id = $1
     UNION
     SELECT user_id FROM organization_memberships WHERE organization_id = $1 OR org_id = $1
     UNION
     SELECT COALESCE(user_id, staff_id) AS user_id FROM crm_staff_assignments WHERE org_id = $1 OR organization_id = $1
   )
   ```

---

### 2.4. Forensic Analysis of Staff Provisioning & Verification in `crm.js`

#### Direct Observation in `backend-api/src/routes/crm.js`
1. **Password Auto-Derivation** (Lines 429–440):
   ```javascript
   let effectivePassword = password;
   if (!effectivePassword || !effectivePassword.trim()) {
     const cleanName = full_name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
     let autoPwd = cleanName ? `${cleanName}123` : 'staff123';
     while (autoPwd.length < 6) autoPwd += '3';
     effectivePassword = autoPwd;
   }
   ```
   - Automatically generates `{firstName}123` padded to 6 chars minimum.
   - Saves `password_hash = bcrypt.hash(effectivePassword, 10)` in `users`.
2. **Multi-Table Scoping** (Lines 544–657):
   - Inserts into `org_memberships` with `role = finalStoreRole` (`'staff'`).
   - Inserts into `organization_memberships` with `role = finalStoreRole`.
   - Inserts into `crm_staff_assignments (org_id, organization_id, user_id, staff_id, assigned_by)`.
   - If `crm_role_id` provided, validates role with `verifyRoleInOrg(crm_role_id, orgId)` and assigns role in `crm_staff_assignments` and `crm_staff_roles`.
3. **Staff Listing Query** (Lines 698–741):
   - Queries `org_memberships UNION organization_memberships UNION crm_staff_assignments` with `WHERE org_id = $1`.
   - Joins `users u ON u.id = m.user_id`.
   - Joins `crm_staff_assignments sa` and `crm_roles sa_role` scoped to `$1 = orgId`.
4. **Task Assignment Verification** (Lines 34–91 & 1825–1835):
   ```javascript
   const cleanAssignee = rawAssignee.trim();
   const belongs = await verifyUserInOrg(cleanAssignee, orgId);
   if (!belongs) {
     return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
   }
   ```
   `verifyUserInOrg` queries `org_memberships`, `organization_memberships`, and `crm_staff_assignments`.

#### Forensic Analysis of Bug 1 & Bug 3 (Staff Vanishing & Task Assignment Failure)
- **Why Staff Vanished on Refresh**:
  When the owner provisioned a staff member, if the database had previously run the cross-join or if email collided with a foreign user, the frontend (`RoleManagement.tsx:1070`) suppressed the backend response error and substituted an in-memory synthetic ID:
  `const newUserId = res?.data?.user?.id || 'user-' + Date.now();`
  It stored this fake ID in localStorage. On page refresh, the frontend queried `GET /api/crm/staff`. Because `user-178...` was never written to PostgreSQL, the synthetic staff disappeared completely!
- **Why Task Assignment Failed with 400**:
  In `Tasks.tsx`, selecting that synthetic staff user sent `POST /api/crm/tasks` with `assigned_to: "user-1784918239"`. The backend executed `verifyUserInOrg("user-1784918239", orgId)`. Because the synthetic string was not a valid UUID in PostgreSQL, the backend rejected it with:
  `HTTP 400: Assigned user does not belong to this organization`.

---

### 2.5. Verification of Newly Provisioned Staff Authentication & Binding

When a new staff member logs in:
1. They POST their email and password to `/api/auth/login`.
2. `login` queries `SELECT * FROM users WHERE email = $1`.
3. `bcrypt.compare(password, user.password_hash)` validates their password (`{firstName}123` or custom password).
4. `login` calls `getUserPrimaryOrgId(user.id)`.
5. **Vulnerability Point**: If `getUserPrimaryOrgId` contains the product-count order and lacks `crm_staff_assignments`, the staff member is bound to the rogue primary org rather than the owner's org.
6. **With the Proposed Fix**: `getUserPrimaryOrgId` queries `org_memberships` and `crm_staff_assignments` for `user_id = $1`. It immediately finds the owner's `orgId`, signs a JWT containing `{ id: user.id, email: user.email, orgId: ownerOrgId }`, and the staff user is cleanly authenticated into the owner's organization.

---

## 3. Requirement R5: Performance, Micro-Caching & DB Indexes

### 3.1. In-Memory Micro-Cache Architecture (`backend-api/src/index.js`)

#### Direct Observation (Lines 64–103)
```javascript
const apiCache = new Map();
const CACHE_TTL_MS = 10000;

app.use((req, res, next) => {
  // Invalidate cache on mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const orgId = req.headers['x-organization-id'] || 'global';
    for (const key of apiCache.keys()) {
      if (key.startsWith(orgId)) {
        apiCache.delete(key);
      }
    }
    return next();
  }

  // Cache candidate endpoints
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    const orgId = req.headers['x-organization-id'] || req.query.org_id || req.query.organization_id || 'global';
    const cacheKey = `${orgId}:${req.originalUrl}`;
    const cached = apiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && data) {
        apiCache.set(cacheKey, { timestamp: Date.now(), data });
      }
      return originalJson.call(this, data);
    };
  }

  next();
});
```

#### Forensic Findings on Micro-Caching
1. **Uncached `/rest/v1/*` Passthroughs**:
   The cache middleware explicitly requires `req.path.startsWith('/api/')`.
   However, `rpcRoutes` in `backend-api/src/routes/rpc.js` handles all Supabase PostgREST queries at `/rest/v1/:table`.
   Because `/rest/v1/...` does not start with `/api/`, **every single frontend Supabase client read query completely bypasses the cache** and executes direct SQL against PostgreSQL.
2. **Missing `req.user?.orgId` in Cache Key**:
   Line 83 resolves `orgId` from `headers['x-organization-id']` or query parameters. If the frontend requests `/rest/v1/...` with Bearer auth where `orgId` is in the JWT token payload (`req.user.orgId`), line 83 defaults to `'global'`. If two tenants call the same URL without `x-organization-id`, they could share a cache key!
3. **Cache Expansion Strategy**:
   Update line 82:
   ```javascript
   if (req.method === 'GET' && (req.path.startsWith('/api/') || req.path.startsWith('/rest/v1/'))) {
     const orgId = req.headers['x-organization-id'] || req.query.org_id || req.query.organization_id || req.user?.orgId || 'global';
     const cacheKey = `${orgId}:${req.originalUrl}`;
     ...
   }
   ```

---

### 3.2. Database B-Tree Index Audit across Schema Scripts

| Table | Column(s) | Present in `fix_db.sql` | Present in `fix_crm_schema.sql` | Present in `add_indexes.sql` | Status / Recommendation |
|---|---|---|---|---|---|
| `crm_staff_assignments` | `(org_id)` | Yes (`idx_crm_staff_assignments_org_id`) | No | No | Existing |
| `crm_staff_assignments` | `(org_id, user_id)` | **Missing** | Yes (`idx_crm_staff_assignments_org_user`) | **Missing** | **CRITICAL: Must add to `add_indexes.sql` & `fix_db.sql`** |
| `crm_staff_assignments` | `(organization_id, user_id)` | **Missing** | **Missing** | **Missing** | Recommended for dual-column alignment |
| `staff_tasks` | `(org_id)` | Yes (`idx_staff_tasks_org_id`) | No | No | Existing |
| `staff_tasks` | `(org_id, status)` | Yes (`idx_staff_tasks_status`) | Yes (`idx_staff_tasks_org_status`) | **Missing** | **Must add to `add_indexes.sql`** |
| `staff_tasks` | `(organization_id, status)` | **Missing** | **Missing** | **Missing** | Recommended for dual-column alignment |
| `staff_tasks` | `(org_id, assigned_to)` | **Missing** | **Missing** | **Missing** | Recommended for assignee filtering |
| `crm_salary_profiles` | `(org_id)` | Yes (`idx_crm_salary_profiles_org_id`) | No | No | Existing |
| `crm_salary_profiles` | `(org_id, staff_id)` | **Missing** | **Missing** | **Missing** | **CRITICAL: Must add to `add_indexes.sql` & `fix_db.sql`** |
| `salary_profiles` | `(org_id, user_id)` | **Missing** | **Missing** | **Missing** | **CRITICAL: Must add to `add_indexes.sql` & `fix_db.sql`** |
| `crm_roles` | `(org_id)` | Yes (`idx_crm_roles_org_id`) | Yes (`idx_crm_roles_org_id`) | **Missing** | Must add to `add_indexes.sql` |
| `crm_attendance` | `(org_id, date)` | **Missing** | Yes (`idx_crm_attendance_org_date`) | **Missing** | Must add to `add_indexes.sql` |

#### Recommended DDL Index Statements for `backend-api/add_indexes.sql`
```sql
-- CRM Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_org_user ON crm_staff_assignments(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_organization_user ON crm_staff_assignments(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_status ON staff_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_organization_status ON staff_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_assignee ON staff_tasks(org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org_staff ON crm_salary_profiles(org_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_profiles_org_user ON salary_profiles(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_date ON crm_attendance(org_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_roles_org_id ON crm_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_permissions_role_id ON crm_permissions(role_id);
```

---

## 4. Requirement R7: CRM and POS/Billing Domain Data Separation

### 4.1. Domain Role Segregation: `org_memberships` vs. `crm_staff_roles`

#### Architectural Boundaries
1. **POS / Billing Domain (`org_memberships`)**:
   - Manages store organizational hierarchy and fiscal permissions: `owner`, `admin`, `cashier`, `staff`.
   - Used by POS workbench, sales register, invoices, stock transfers, and financial ledger.
   - A user who is provisioned as a CRM staff member must have `org_memberships.role = 'staff'`. They should **never** have `role = 'owner'` unless they are the verified business registrant.
2. **CRM Domain (`crm_roles`, `crm_staff_assignments`, `crm_staff_roles`)**:
   - Manages module-level CRM actions: `attendance:view/edit`, `salary:view/approve`, `tasks:create/assign`, `broadcasts:send`.
   - Defined dynamically in `crm_roles` with fine-grained toggles in `crm_permissions`.
   - Binds staff via `crm_staff_assignments` and `crm_staff_roles`.

#### Forensic Analysis of Cross-Domain Contamination
- **How Contamination Occurred**:
  When `fix_db.sql` ran its cross join, it set `role = 'owner'` in `org_memberships` for every user. Consequently, CRM staff users were recognized by POS/Billing as `owner`, gaining unrestricted access to sales invoices, pricing, and POS terminal.
- **Segregation Rule**:
  - `POST /api/crm/staff/provision` must strictly insert `org_memberships.role = 'staff'`.
  - Backend billing routes (`/api/sales`, `/api/invoices`, `/rest/v1/sales`) can verify that callers are owners or managers if POS restriction is active.
  - CRM queries must query `crm_staff_assignments` and `crm_roles`, and must never alter `org_memberships.role` when CRM permissions change.

---

### 4.2. Cache Invalidation Decoupling

#### Current Flaw (`backend-api/src/index.js` Lines 70–78)
```javascript
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const orgId = req.headers['x-organization-id'] || 'global';
    for (const key of apiCache.keys()) {
      if (key.startsWith(orgId)) {
        apiCache.delete(key);
      }
    }
    return next();
  }
```
Whenever a staff member clocks in (`POST /api/crm/attendance`) or changes task status (`PATCH /api/crm/tasks/:id`), the backend purges **every single cached URL for that organization**—including the POS product catalog, customer lists, and financial statistics!
Conversely, when a cashier rings up a sale in POS (`POST /api/sales`), the entire CRM dashboard cache, task cache, and staff directory cache are evicted.

#### Decoupled Cache Invalidation Architecture
Split invalidation into domain namespaces based on request path:
```javascript
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const orgId = req.headers['x-organization-id'] || req.body?.organization_id || req.body?.org_id || req.user?.orgId || 'global';
    const isCrmMutation = req.path.startsWith('/api/crm') || req.path.includes('/rest/v1/crm_') || req.path.includes('/rest/v1/staff_tasks') || req.path.includes('/rest/v1/attendance_records') || req.path.includes('/rest/v1/salary_profiles') || req.path.includes('/rest/v1/customer_tickets');

    for (const key of apiCache.keys()) {
      if (!key.startsWith(orgId)) continue;

      const isCrmCachedKey = key.includes('/api/crm') || key.includes('/rest/v1/crm_') || key.includes('/rest/v1/staff_tasks') || key.includes('/rest/v1/attendance_records') || key.includes('/rest/v1/salary_profiles') || key.includes('/rest/v1/customer_tickets');

      if (isCrmMutation && isCrmCachedKey) {
        apiCache.delete(key);
      } else if (!isCrmMutation && !isCrmCachedKey) {
        apiCache.delete(key);
      }
    }
    return next();
  }
```
This ensures:
- CRM task updates, clock-ins, and payroll calculations never invalidate the POS product catalog or sales invoices.
- High-volume POS checkouts never flush the CRM Command Center cache.

---

## 5. Summary of Key Files, Line Numbers & Findings

| Component | Target File | Line Range | Identified Defect | Recommended Resolution |
|---|---|---|---|---|
| **R1: Cross Join** | `backend-api/fix_db.sql` | 130–148 | `CROSS JOIN users x organizations` linking all users as owners to all organizations | Delete lines 130–148. Run SQL cleanup script to remove rogue owner memberships. |
| **R1: Primary Org Fallback** | `backend-api/src/routes/auth.js` | 16–66 | `ORDER BY products DESC` and rogue `INSERT INTO org_memberships ... 'owner'` fallback | Remove auto-insert fallback. Include `crm_staff_assignments` in union. Sort by creation date. |
| **R1: Middleware Org Fallback** | `backend-api/src/middleware/auth.js` | 24–55 | Orders by product count; assigns organization with most products on catch error | Remove catch fallback assigning largest organization. Include `crm_staff_assignments`. |
| **R1: Leaky Settings Endpoints** | `backend-api/src/routes/settings.js` | 128–170, 294–325 | `/api/organization-memberships` and `/api/profiles` lack mandatory org filter when `targetOrg` is omitted | Return empty array `[]` when `targetOrg` is omitted. Include `crm_staff_assignments` in profiles. |
| **R1: Staff Provisioning & Tasks** | `backend-api/src/routes/crm.js` | 410–688, 1802–1909 | Rejection of synthetic IDs `user-178...` in `verifyUserInOrg` | Ensure real provisioned users persist to PostgreSQL with correct org scoping. |
| **R5: Micro-Cache Passthrough** | `backend-api/src/index.js` | 64–103 | Cache gate `req.path.startsWith('/api/')` excludes all `/rest/v1/*` PostgREST requests | Update gate to `req.path.startsWith('/api/') \|\| req.path.startsWith('/rest/v1/')`. |
| **R5: Missing DB Indexes** | `backend-api/add_indexes.sql` & `fix_db.sql` | Various | Missing composite indexes on `crm_staff_assignments(org_id, user_id)`, `crm_salary_profiles(org_id, staff_id)`, etc. | Add composite B-Tree index definitions to `add_indexes.sql` and run `ANALYZE`. |
| **R7: Domain Segregation** | `backend-api/src/index.js` | 70–78 | Shared cache invalidation purges both CRM and POS caches on any mutation | Namespace cache invalidation by domain (`/api/crm` vs POS/Billing). |

---

## 6. Verification & Invalidation Conditions

1. **Multi-Tenant Isolation**:
   - Querying `GET /api/crm/staff` with Organization A's header must return only staff belonging to Organization A, and 0 users from Organization B.
   - Calling `GET /api/profiles` without an organization parameter must return `[]` and not leak global users.
2. **Newly Provisioned Staff**:
   - Staff provisioned with `POST /api/crm/staff/provision` must have their password hash stored in `users`, their membership in `org_memberships` (as `'staff'`), and their role in `crm_staff_assignments`.
   - Logging in via `POST /api/auth/login` with their credentials must issue a JWT containing the owner's `orgId`.
3. **Micro-Cache Verification**:
   - Repeating a `GET /rest/v1/crm_roles` request within 10 seconds must return `X-Cache: HIT`.
   - A `POST /api/sales` mutation must NOT invalidate the `/rest/v1/crm_roles` cache entry.
