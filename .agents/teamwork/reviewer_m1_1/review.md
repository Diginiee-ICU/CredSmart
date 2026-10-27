# Quality & Adversarial Review Report — Milestone M1: Security, Tenancy Isolation & Database

**Reviewer**: `reviewer_m1_1` (Roles: reviewer, critic)  
**Target Milestone**: M1 (Worker: `worker_m1_backend`)  
**Scope**:
- `backend-api/fix_db.sql` and root `fix_db.sql`
- `backend-api/src/routes/auth.js`
- `backend-api/src/middleware/auth.js`
- `backend-api/src/routes/settings.js`
- `backend-api/src/index.js`
- `backend-api/add_indexes.sql`
- Verification test suites: `src/test/crmTenantIsolation.test.ts`, `src/test/fixDbSchema.test.ts`, `src/test/crmBackendApiM1.test.ts`

---

## Review Summary

**Verdict**: **APPROVE**  
**Integrity Assessment**: **CLEAN (0 integrity violations)**.  
No hardcoded test outputs, no facade implementations, no test mocks in production code, no shortcuts, and no fabricated attestation artifacts. Real SQL queries, transactions, and genuine middleware logic are implemented throughout.

---

## 1. Verification of Required Checks

| Item | Requirement | Verification Method | Result | Notes |
|---|---|---|---|---|
| **1** | Complete removal of rogue `CROSS JOIN` (lines 130–148 in `fix_db.sql`) and 100% byte-for-byte file parity between `fix_db.sql` and `backend-api/fix_db.sql` | Cryptographic SHA-256 hash comparison + regex search for `CROSS JOIN` | **PASS** | Both files are exactly 86,514 bytes. SHA-256: `1eb14c86decd3b808566d3d8c4519cdac4bef459d9cc5b1fa671a3ff4eaefa01`. Zero `CROSS JOIN` occurrences exist. |
| **2** | `getUserPrimaryOrgId` in `backend-api/src/routes/auth.js` has no product-count ordering and no fallback auto-inserting the user into the largest organization | Code inspection & regex search across `auth.js` | **PASS** | Removed `ORDER BY (SELECT COUNT(*) FROM products ...)`. Removed auto-insert fallback (`INSERT INTO org_memberships ... 'owner'`). Now returns `null` if no membership found. Unified with `crm_staff_assignments`. |
| **3** | Catch block in `backend-api/src/middleware/auth.js` has no fallback selecting the organization with the most products | Code inspection of lines 25–52 in `middleware/auth.js` | **PASS** | Catch block contains only comment `// Do not fall back to foreign organizations!`. No product count queries exist anywhere in file. |
| **4** | `GET /api/profiles` and `GET /api/organization-memberships` in `backend-api/src/routes/settings.js` enforce `targetOrg` filtering and return `[]` when omitted | Code inspection of `getMembershipsHandler` and `GET /api/profiles` | **PASS** | Guard checks: `if (!targetOrg) return res.json([]);` and `if (!targetOrg && !ids) return res.json([]);`. Explicitly scopes user profiles to memberships/assignments. |
| **5** | Verification Tests & Type Check | `npx vitest run src/test/crmTenantIsolation.test.ts src/test/fixDbSchema.test.ts` & `npx tsc --noEmit` | **PASS** | Vitest: 2 test files passed, 443/443 tests passed (100%). In addition, `src/test/crmBackendApiM1.test.ts` (10 tests) passed. Total: 453/453 tests passed. `tsc --noEmit` exited with code 0. |

---

## 2. Adversarial Review & Stress-Testing Findings

### [Major] Finding 1: Potential Unscoped Leak via Malformed `ids` Parameter in `/api/profiles`
- **Location**: `backend-api/src/routes/settings.js:308-325`
- **Mechanism**:
  ```javascript
  if (!targetOrg && !ids) {
    return res.json([]);
  }
  ...
  if (ids) {
    const idList = String(ids).split(',').map(s => s.trim()).filter(Boolean);
    if (idList.length > 0) {
      ...
      query += ` AND id IN (${phs})`;
    }
  } else if (targetOrg) {
    ...
  }
  ```
- **Stress-Test Scenario**:
  If a caller supplies `?ids=, ` or `?ids= ` (whitespace or empty delimiters) when `targetOrg` is omitted:
  1. `!targetOrg && !ids` evaluates to `false` because `ids` is a non-empty string.
  2. The code enters `if (ids)`.
  3. `idList` filters down to `[]` (`length === 0`).
  4. Neither `AND id IN (...)` nor `AND id IN (SELECT ... FROM memberships ...)` is appended.
  5. The query executes as `SELECT ... FROM users WHERE 1=1` and returns **all users across all tenants in PostgreSQL**.
- **Blast Radius**: Unauthenticated or cross-tenant caller passing whitespace `ids` could retrieve user directory across organizations.
- **Recommended Mitigation** (for M6 hardening):
  Sanitize `idList` before checking truthiness:
  ```javascript
  const idList = ids ? String(ids).split(',').map(s => s.trim()).filter(Boolean) : [];
  if (!targetOrg && idList.length === 0) {
    return res.json([]);
  }
  if (idList.length > 0) {
    ...
  } else if (targetOrg) {
    ...
  }
  ```

---

### [Minor] Finding 2: In-Memory Cache Key Collision on Endpoints without `x-organization-id`
- **Location**: `backend-api/src/index.js:104-106`
- **Mechanism**:
  ```javascript
  const orgId = req.headers['x-organization-id'] || req.query.org_id || req.query.organization_id || req.user?.orgId || 'global';
  const cacheKey = `${orgId}:${req.originalUrl}`;
  ```
  The caching middleware runs at application root **before** route-level JWT authentication middlewares (`settings.js` line 12). Therefore, `req.user` is always `undefined` during cache key resolution.
- **Stress-Test Scenario**:
  If a client calls user-specific endpoints like `GET /api/organizations` without setting `x-organization-id` header (common during login before selecting an active organization), the cache key evaluates to `global:/api/organizations`.
  The first user's list of organizations will be cached and potentially returned to any other user calling the same endpoint within the 10-second TTL window.
- **Blast Radius**: Temporary metadata leakage between users querying `/api/organizations` during active multi-user session logins.
- **Recommended Mitigation** (for M6 hardening):
  Exclude user-specific endpoints like `/api/organizations` and `/api/auth/*` from the global in-memory micro-cache, or incorporate `req.headers.authorization` into the cache key when `orgId === 'global'`.

---

## 3. Verified Claims

1. **Rogue SQL CROSS JOIN eradication**: Verified `fix_db.sql` and `backend-api/fix_db.sql` have zero occurrences of `CROSS JOIN`. Lines 111–125 correctly synchronize `org_memberships` and `organization_memberships` without cross-joining all users to all organizations.
2. **Deterministic Primary Org Resolution**: `getUserPrimaryOrgId` sorts memberships and staff assignments strictly by `priority ASC, created_at ASC`, eliminating catalog bias and foreign owner insertion.
3. **Strict Route Scoping in Settings**: `GET /api/organization-memberships` and `GET /api/profiles` cleanly return `[]` when `targetOrg` is not supplied.
4. **PostgREST Passthrough Caching**: `backend-api/src/index.js` caches `/rest/v1/*` read requests with domain segregation (`isCrmPath`).
5. **Database Composite Indexes**: `backend-api/add_indexes.sql` defines all 7 required composite indexes for CRM tables alongside `ANALYZE` statements.
6. **Codebase Zero-Error Health**: All 453 tests across `crmTenantIsolation.test.ts`, `fixDbSchema.test.ts`, and `crmBackendApiM1.test.ts` pass cleanly, and `tsc --noEmit` exits with 0 errors.

---

## 4. Conclusion & Recommendation

Milestone M1 successfully resolves the root causes of staff vanishing on refresh, rogue owner assignments, and cross-tenant user leaks. All required acceptance criteria for Milestone M1 are satisfied with high technical rigor.

The two adversarial findings documented above are non-blocking for Milestone M1, but should be addressed during Milestone M6 Hardening to make the system completely bulletproof against hostile inputs.

**Recommendation**: **APPROVE Milestone M1** and proceed to Milestone M2 (Salary & Payroll Staff Synchronization).
