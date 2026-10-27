# Review and Adversarial Challenge Report — Milestone M1

**Reviewer**: Reviewer 2 (`reviewer_m1_2`) — API, Micro-Caching & Domain Decoupling  
**Target Milestone**: M1 (Backend Multi-Tenant Isolation, Micro-Caching & Staff Provisioning)  
**Date**: 2026-10-26T20:38:00Z  
**Verdict**: **APPROVE**  

---

## 1. Executive Summary

Milestone M1 changes implemented by `worker_m1_backend` were subjected to an independent objective quality review, cryptographic integrity audit, and adversarial stress-testing. 

All core requirements and acceptance criteria have been rigorously met:
1. In-memory micro-cache in `backend-api/src/index.js` correctly covers both `/api/*` and `/rest/v1/*` read requests with a 10-second TTL and multi-tenant key scoping (`${orgId}:${req.originalUrl}`).
2. Domain cache invalidation in `index.js` strictly isolates CRM paths (`/api/crm`, `/rest/v1/crm_*`, `/rest/v1/staff_tasks`, `/rest/v1/attendance_records`, `/rest/v1/salary_profiles`, `/rest/v1/customer_tickets`) from POS/Billing paths, preventing POS checkout activity from clearing CRM caches and vice-versa.
3. `POST /api/crm/staff/provision` auto-derives default passwords as `{firstName}123` (padded to minimum 6 characters), hashes passwords with bcrypt (salt rounds = 10), and binds staff users to `crm_staff_assignments`, `crm_staff_roles`, and `org_memberships` strictly scoped to `org_id`.
4. High-performance composite B-Tree indexes exist in `backend-api/add_indexes.sql` for `crm_staff_assignments(org_id, user_id)`, `staff_tasks(org_id, status)`, `crm_salary_profiles(org_id, staff_id)`, `crm_roles(org_id)`, and `crm_attendance(org_id, date)`.
5. Independent test suites (`src/test/crmBackendApiM1.test.ts`, `src/test/crmTenantIsolation.test.ts`, `src/test/fixDbSchema.test.ts`) executed with 100% pass rate (453/453 tests passing) and `tsc --noEmit` exited with 0 errors.
6. Zero integrity violations (no dummy facades, no hardcoded expected outputs, no fabricated results).

---

## 2. Integrity Verification

As mandated by reviewer and adversarial critic protocols, the codebase was inspected for integrity violations:
- **Hardcoded test responses in source**: None. `backend-api/src/index.js` and `backend-api/src/routes/crm.js` implement genuine dynamic logic querying PostgreSQL via parameterized queries.
- **Dummy or facade implementations**: None. Password hashing utilizes `bcryptjs` with standard salt rounds, and database operations execute within genuine SQL transactions (`BEGIN`, `COMMIT`, `ROLLBACK`).
- **Shortcuts bypassing the task**: None. PostgREST passthroughs and custom CRM endpoints are both cached with domain invalidation.
- **Fabricated verification outputs**: None. All test suites were run directly via Vitest CLI during this review turn and verified independently.

---

## 3. Detailed Verification of Key Claims

### Claim 1: In-Memory Micro-Cache Covers `/rest/v1/*` Read Requests
- **Location**: `backend-api/src/index.js`, lines 102–121
- **Observation**:
  ```javascript
  if (req.method === 'GET' && (req.path.startsWith('/api/') || req.path.startsWith('/rest/v1/'))) {
    const orgId = req.headers['x-organization-id'] || req.query.org_id || req.query.organization_id || req.user?.orgId || 'global';
    const cacheKey = `${orgId}:${req.originalUrl}`;
    const cached = apiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }
  ```
- **Verification**: PostgREST read endpoints mounted under `/rest/v1/` in `rpc.js` are matched by `req.path.startsWith('/rest/v1/')`. Cache key includes `req.originalUrl` (preserving query filters such as `?select=*&limit=50`) and is prefixed with `orgId:`, guaranteeing tenant isolation. Response compression via GZIP is preserved because cache middleware calls the wrapped GZIP `res.json`.
- **Status**: **PASS**

### Claim 2: Domain Cache Invalidation Isolates CRM from POS Paths
- **Location**: `backend-api/src/index.js`, lines 69–99
- **Observation**:
  `isCrmPath(urlPath)` checks for `/api/crm`, `/rest/v1/crm_`, `/rest/v1/staff_tasks`, `/rest/v1/attendance_records`, `/rest/v1/salary_profiles`, and `/rest/v1/customer_tickets`. On mutations (`POST`, `PUT`, `PATCH`, `DELETE`):
  ```javascript
  if (isCrmMutation && keyIsCrm) {
    apiCache.delete(key);
  } else if (!isCrmMutation && !keyIsCrm) {
    apiCache.delete(key);
  }
  ```
- **Verification**: A mutation to `/api/products` or `/rest/v1/sales` evaluates `isCrmMutation = false`, purging only entries where `keyIsCrm = false`. CRM entries remain warm in memory. A mutation to `/api/crm/tasks` or `/rest/v1/crm_attendance` evaluates `isCrmMutation = true`, purging only CRM entries.
- **Status**: **PASS**

### Claim 3: Password Derivation & Hashing in Staff Provisioning
- **Location**: `backend-api/src/routes/crm.js`, lines 429–440, 532–542
- **Observation**:
  ```javascript
  let effectivePassword = password;
  if (!effectivePassword || !effectivePassword.trim()) {
    const cleanName = full_name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let autoPwd = cleanName ? `${cleanName}123` : 'staff123';
    while (autoPwd.length < 6) autoPwd += '3';
    effectivePassword = autoPwd;
  }
  if (effectivePassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  ...
  const passwordHash = await bcrypt.hash(effectivePassword, 10);
  ```
- **Verification**: Auto-generates `{firstName}123`. Names shorter than 3 letters (e.g. "Jo" -> "jo123" [length 5]) are padded with "3" to guarantee minimum 6 characters ("jo1233"). Passwords are hashed with bcrypt before insertion into `users(password_hash)`.
- **Status**: **PASS**

### Claim 4: Binding to Staff Assignments & Staff Roles Scoped to Org ID
- **Location**: `backend-api/src/routes/crm.js`, lines 544–658
- **Observation**:
  - `org_memberships`: Inserted with `(user_id, org_id, role, invited_by)`.
  - `crm_staff_assignments`: Baseline entry inserted with `(org_id, organization_id, user_id, staff_id, assigned_by)` and updated with `role_id` when CRM role is assigned.
  - `crm_staff_roles`: Inserted with `(staff_id, role_id, assigned_by)`.
  - Tenant isolation on role assignment: `verifyRoleInOrg` ensures the assigned CRM role belongs to `orgId`.
- **Status**: **PASS**

### Claim 5: Composite B-Tree Indexes in `backend-api/add_indexes.sql`
- **Location**: `backend-api/add_indexes.sql`, lines 65–73, 87–91
- **Observation**:
  - `idx_crm_staff_assignments_org_user ON crm_staff_assignments(org_id, user_id)`
  - `idx_crm_staff_assignments_organization_user ON crm_staff_assignments(organization_id, user_id)`
  - `idx_staff_tasks_org_status ON staff_tasks(org_id, status)`
  - `idx_staff_tasks_organization_status ON staff_tasks(organization_id, status)`
  - `idx_crm_salary_profiles_org_staff ON crm_salary_profiles(org_id, staff_id)`
  - `idx_crm_roles_org_id ON crm_roles(org_id)`
  - `idx_crm_attendance_org_date ON crm_attendance(org_id, date)`
  - All accompanied by `ANALYZE` commands.
- **Status**: **PASS**

---

## 4. Adversarial Stress-Testing & Edge Cases

| Dimension | Attack Scenario / Edge Case | Observed / Verified Behavior | Risk Level |
|---|---|---|---|
| **Cache Key Cardinality** | Client issues many unique GET queries with varying search/filter parameters | Map grows without an explicit max size cap; expired keys are purged upon read or on mutation. | Low (Recommended: add LRU cap in future optimization) |
| **Short Names (<3 chars)** | Staff provisioned with single-letter or 2-letter first name (e.g. "Om") | "om" -> "om123" (len 5) -> while loop appends '3' -> "om1233" (len 6). Validated. | None (Mitigated) |
| **Cross-Tenant Role Assignment** | Attacker specifies `crm_role_id` belonging to Organization B when provisioning staff in Organization A | Query `SELECT ... WHERE id = $1 AND (org_id = $2 OR organization_id = $2)` fails to match, preventing cross-tenant role leakage. Validated. | None (Mitigated) |
| **Failed Mutation Cache State** | Mutation fails with 400 or 500 error after cache invalidation runs | Cache for that domain was invalidated; next GET executes authoritative DB query. No stale data served. | None (Safe) |
| **Cross-Tenant User Provisioning** | Email already belongs to another tenant | Existing user added to `org_memberships` and `crm_staff_assignments` for active org; existing `password_hash` in `users` is NOT overwritten. Validated. | None (Mitigated) |

---

## 5. Build and Test Verification

Commands executed independently in this review:
1. `cmd /c npx vitest run src/test/crmBackendApiM1.test.ts`
   - Result: 1 file passed, 10/10 tests passed (46ms).
2. `cmd /c npx tsc --noEmit`
   - Result: Exited with code 0. Zero TypeScript compile errors.
3. `cmd /c npx vitest run src/test/crmTenantIsolation.test.ts src/test/fixDbSchema.test.ts`
   - Result: 2 files passed, 443/443 tests passed (591ms).

Total verified tests in this milestone: **453/453 passing (100%)**.

---

## 6. Review Findings & Recommendations

### Minor Observations (Non-blocking):
1. **Cache Size Bound**: The `apiCache` Map does not currently enforce an explicit maximum entry count (e.g. `MAX_ENTRIES = 1000`). While 10s TTL and mutation purges keep memory bounded under standard usage, a simple LRU eviction or periodic cleanup timer is recommended for long-term production hardening.
2. **Table Scope Alignment**: Legacy table alias `payroll_records` (if queried directly via `/rest/v1/payroll_records`) is not included in `isCrmPath`. However, all active CRM code uses `crm_payroll_runs` and `crm_payslips`, both of which match `/rest/v1/crm_`.

---

## 7. Verdict

**APPROVE**. Milestone M1 backend changes satisfy all architectural, security, and performance standards. No integrity violations or regressions were found.
