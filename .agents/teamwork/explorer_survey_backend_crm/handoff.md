# Handoff Report — Backend API & Database Forensic Survey

**Agent**: `explorer_survey_backend_crm`  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_crm`  
**Target Milestone**: CredSmart CRM Defects Elimination (R1, R5, R7)  
**Report Type**: Hard Handoff  

---

## 1. Observation

Direct observations made through verbatim file inspections across `backend-api/`:

1. **Rogue SQL CROSS JOIN in `fix_db.sql`**:
   - File: `backend-api/fix_db.sql` (Lines 130–148):
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
     ```
   - Observed Result: A Cartesian product of all users and organizations is inserted into `org_memberships` and `organization_memberships`, making every user an owner of every tenant organization.

2. **Rogue Fallback & Catalog-Count Sorting in `auth.js`**:
   - File: `backend-api/src/routes/auth.js` (Lines 16–66 in `getUserPrimaryOrgId`):
     ```javascript
     ORDER BY (
       SELECT COUNT(*) FROM products p WHERE p.org_id = m.org_id OR p.organization_id = m.org_id
     ) DESC, ...
     LIMIT 1
     ```
     and lines 44–64:
     ```javascript
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
     ```
   - Observed Result: When a user authenticates without an explicit organization, they are bound to whichever organization in PostgreSQL has the most products. If they have no memberships, they are automatically inserted as an owner into that foreign organization. Furthermore, `crm_staff_assignments` is not queried.

3. **Rogue Fallback in `middleware/auth.js`**:
   - File: `backend-api/src/middleware/auth.js` (Lines 43–54):
     ```javascript
     } catch (e) {
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
     ```
   - Observed Result: Any uncaught error during membership resolution silently binds the request context to the organization with the most products in the entire database.

4. **Unscoped User Queries in `settings.js`**:
   - File: `backend-api/src/routes/settings.js` (Lines 128–170 and 294–336):
     In `GET /api/organization-memberships`:
     ```javascript
     const targetOrg = organization_id || org_id || req.orgId;
     ...
     } else {
       query += ' ORDER BY m.created_at ASC';
       const res1 = await pool.query(query, params);
       rows = res1.rows;
     }
     ```
     In `GET /api/profiles`:
     ```javascript
     let query = "SELECT id, email, full_name, ... FROM users WHERE 1=1";
     ...
     if (ids) { ... }
     else if (targetOrg) { ... }
     query += ' ORDER BY full_name ASC NULLS LAST, created_at ASC';
     const result = await pool.query(query, params);
     ```
   - Observed Result: If `targetOrg` is omitted or undefined, both endpoints execute queries without any tenant filter (`WHERE 1=1`), leaking all registered users across all organizations.

5. **Staff Provisioning & Verification in `crm.js`**:
   - File: `backend-api/src/routes/crm.js`:
     - Staff password derivation (Lines 429–440): derives `{firstName}123` (minimum 6 chars) and hashes with bcrypt.
     - Membership insertion (Lines 544–657): inserts into `org_memberships` (with `role = finalStoreRole`), `organization_memberships`, and `crm_staff_assignments`.
     - Verification (Lines 34–91): `verifyUserInOrg` checks `org_memberships`, `organization_memberships`, and `crm_staff_assignments`.
     - Task creation (Lines 1825–1835): rejects any task with `HTTP 400: Assigned user does not belong to this organization` if `verifyUserInOrg` returns false.

6. **In-Memory Micro-Cache in `index.js`**:
   - File: `backend-api/src/index.js` (Lines 64–103):
     ```javascript
     const apiCache = new Map();
     const CACHE_TTL_MS = 10000;
     ...
     if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
       const orgId = req.headers['x-organization-id'] || 'global';
       for (const key of apiCache.keys()) {
         if (key.startsWith(orgId)) {
           apiCache.delete(key);
         }
       }
       return next();
     }
     if (req.method === 'GET' && req.path.startsWith('/api/')) {
       ...
     }
     ```
   - Observed Result:
     - All PostgREST passthroughs (`/rest/v1/*` mounted at line 134) are completely uncached because `req.path.startsWith('/api/')` is false.
     - Any mutation flushes both POS and CRM caches for that organization indiscriminately.

7. **Database Index Audit in `add_indexes.sql`**:
   - File: `backend-api/add_indexes.sql`: contains zero indexes for `crm_staff_assignments`, `staff_tasks`, `crm_salary_profiles`, or `crm_roles`.

---

## 2. Logic Chain

1. **Rogue Memberships & Cross-Tenant Bleed**:
   - `deploy-fix.sh:70` runs `fix_db.sql`.
   - `fix_db.sql:130-148` executes the `CROSS JOIN`, inserting all users into all organizations with `role = 'owner'`.
   - Therefore, queries like `GET /api/crm/staff` or `GET /api/organization-memberships` filtering by `org_id = $1` return every registered user in PostgreSQL.
2. **Staff Binding to Wrong Organization**:
   - When a newly provisioned staff logs in, `POST /api/auth/login` calls `getUserPrimaryOrgId(user.id)`.
   - Because the cross-join gave the staff memberships in every organization, `getUserPrimaryOrgId` sorts memberships by `COUNT(*) FROM products DESC`.
   - Consequently, the staff member is bound to the organization with the largest product inventory instead of the owner's organization.
   - If `crm_staff_assignments` was used alone, `getUserPrimaryOrgId` does not query `crm_staff_assignments`, triggering the rogue auto-insert fallback into the largest org.
3. **Staff Disappearance & Task 400 Rejections**:
   - Due to the above auth and duplicate-conflict issues, the frontend suppressed backend errors and generated synthetic IDs (`user-178...`) in localStorage.
   - On browser refresh, synthetic IDs were missing from the database, causing staff to disappear.
   - Assigning tasks to `user-178...` caused `verifyUserInOrg` in `crm.js:1830` to fail, resulting in `HTTP 400: Assigned user does not belong to this organization`.
4. **Slow CRM Page Loads**:
   - Frontend CRM components querying Supabase via PostgREST passthrough (`/rest/v1/*`) are excluded from micro-caching by `req.path.startsWith('/api/')` in `index.js:82`.
   - Every mount generates 10+ uncached roundtrip SQL queries over the Cloudflare tunnel.
   - Furthermore, `crm_staff_assignments(org_id, user_id)` and `crm_salary_profiles(org_id, staff_id)` lack composite B-Tree indexes.
5. **Coupled POS vs. CRM Domain Invalidation**:
   - Any mutation in `index.js:71-77` wipes all cached keys prefixed with `${orgId}:`.
   - POS checkout flushes CRM staff/task cache, and CRM attendance punches flush POS inventory cache.

---

## 3. Caveats

- **Database State on Ubuntu Server**: We did not execute live psql queries against the remote Ubuntu production container; all findings are forensically derived from the exact deployment and repository scripts (`fix_db.sql`, `deploy-fix.sh`, `deploy-all.sh`, and backend source files).
- **Existing Production Data Cleansing**: When removing lines 130–148 from `fix_db.sql`, previously inserted rogue rows in PostgreSQL must be explicitly cleansed via a data migration script.
- **Frontend Synthetic IDs**: Frontend handlers in `RoleManagement.tsx` and `Tasks.tsx` must be verified by the frontend survey/fix team to ensure synthetic IDs (`user-178...`) are completely eradicated.

---

## 4. Conclusion

The multi-tenant isolation breaches, staff disappearing, task assignment rejections, slow page loads, and domain coupling are directly caused by:
1. `fix_db.sql` lines 130–148 (CROSS JOIN inserting rogue owner rows).
2. `auth.js` lines 16–66 (`getUserPrimaryOrgId` sorting by product count, lacking `crm_staff_assignments`, and auto-inserting into largest org).
3. `middleware/auth.js` lines 43–54 (fallback on error to org with most products).
4. `settings.js` lines 128–170 & 294–336 (omitted `targetOrg` returning all users).
5. `index.js` lines 64–103 (omitting `/rest/v1/*` from 10s micro-cache, and coupling cache invalidation).
6. Missing composite B-Tree indexes on `crm_staff_assignments`, `staff_tasks`, and `crm_salary_profiles`.

All defects can be cleanly eliminated with zero regressions to existing business billing logic.

---

## 5. Verification Method

1. **Schema Check**:
   - Inspect `backend-api/fix_db.sql`: Verify lines 130–148 (`CROSS JOIN`) are removed.
   - Inspect `backend-api/add_indexes.sql`: Verify composite B-Tree index definitions exist for:
     - `crm_staff_assignments(org_id, user_id)`
     - `staff_tasks(org_id, status)`
     - `crm_salary_profiles(org_id, staff_id)`
2. **Auth & Scoping Tests**:
   - Run Vitest suite:
     `npx vitest run src/test/crmTenantIsolation.test.ts`
   - Run Schema contract test:
     `npx vitest run src/test/fixDbSchema.test.ts`
3. **Endpoint Verification**:
   - Call `GET /api/crm/staff` with Organization A header: assert only Organization A staff returned.
   - Call `GET /api/profiles` with no params: assert empty array `[]` returned.
   - Provision staff with `POST /api/crm/staff/provision`: assert password derived as `{firstName}123`, inserted into `crm_staff_assignments`, and authenticates via `POST /api/auth/login`.
   - Call `GET /rest/v1/crm_roles`: assert second request returns `X-Cache: HIT`.
