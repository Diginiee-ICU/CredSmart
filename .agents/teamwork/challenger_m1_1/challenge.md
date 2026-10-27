# Adversarial Challenge Report — Milestone M1: Multi-Tenant Leak & Fallback Stress Test

**Challenger**: `challenger_m1_1` (Critic & Specialist)  
**Date**: 2026-10-26T20:43:00Z  
**Target Milestone**: M1 (Backend Multi-Tenant Isolation & Staff Provisioning)  
**Target Handoff**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_backend\handoff.md`  

---

## Challenge Summary

**Overall Risk Assessment**: LOW (Clean Pass)

The backend changes implemented by `worker_m1_backend` were subjected to rigorous adversarial review, source code inspection, and automated stress testing via a dedicated 12-test empirical harness (`src/test/m1AdversarialChallenge.test.ts`) in addition to the existing 453 tests in `src/test/crmTenantIsolation.test.ts`, `src/test/fixDbSchema.test.ts`, and `src/test/crmBackendApiM1.test.ts`.

All primary attack vectors and failure modes documented in forensic root causes A, B, C, D have been cleanly eliminated:
1. Unscoped requests to `/api/profiles` and `/api/organization-memberships` strictly return empty arrays `[]` rather than leaking cross-tenant users.
2. Users with 0 memberships strictly receive `null` for `getUserPrimaryOrgId` and are never auto-inserted into foreign organizations.
3. `/api/crm/staff` strictly scopes users, memberships, and roles to the active organization ID, preventing cross-tenant leakage between Organization A and Organization B.
4. The rogue `CROSS JOIN` statement in `fix_db.sql` and `backend-api/fix_db.sql` has been completely removed.
5. In-memory micro-caching segregates CRM and POS routes and invalidates them independently.

---

## Challenges & Attack Vector Analysis

### Challenge 1: Cross-Tenant Data Harvesting via Unscoped `/api/profiles` & `/api/organization-memberships`
- **Assumption Challenged**: Callers omitting `targetOrg` or `organization_id` might trigger an un-scoped database scan `SELECT * FROM users WHERE 1=1` or `SELECT * FROM org_memberships`, leaking all tenant users across CredSmart.
- **Attack Scenario**: An authenticated attacker without an active organization context issues `GET /api/profiles` or `GET /api/organization-memberships` with no query parameters.
- **Blast Radius**: High (complete enumeration of all users and organizations in the multi-tenant database).
- **Mitigation Implemented**: In `backend-api/src/routes/settings.js`, guards were verified:
  - `if (!targetOrg) { return res.json([]); }` (lines 134–136)
  - `if (!targetOrg && !ids) { return res.json([]); }` (lines 309–311)
- **Empirical Test Verification**:
  - Test 1.1: `GET /api/profiles` without `targetOrg` returns `[]`. PASS.
  - Test 1.2: `GET /api/organization-memberships` without `targetOrg` returns `[]`. PASS.
  - Test 1.3: `GET /api/memberships` without `targetOrg` returns `[]`. PASS.
  - Test 1.4: `GET /api/profiles?org_id=org-isolated-123` returns only users belonging to that organization. PASS.

---

### Challenge 2: Catalog-Biased Auto-Insertion into Largest Organization
- **Assumption Challenged**: Users with zero memberships logging in or authenticating could be auto-linked to the tenant with the most inventory products via `ORDER BY (SELECT COUNT(*) FROM products) DESC LIMIT 1`.
- **Attack Scenario**: A newly registered or unassigned user logs in or sends API requests without `x-organization-id`. The legacy fallback would execute an `INSERT INTO org_memberships ... 'owner'`, granting them ownership of the largest store on the platform.
- **Blast Radius**: Critical (unauthorized takeover of top merchant's store, access to financial records and POS terminal).
- **Mitigation Implemented**:
  - In `backend-api/src/routes/auth.js`: Removed `ORDER BY (SELECT COUNT(*) FROM products ...)` and removed the fallback `INSERT INTO org_memberships`. `getUserPrimaryOrgId` now cleanly returns `null`.
  - In `backend-api/src/middleware/auth.js`: Removed the fallback query in the catch block. `req.orgId` remains `undefined`.
- **Empirical Test Verification**:
  - Test 2.1: Login of user with 0 memberships returns `session` with token containing `orgId: null`. SQL statement inspection confirmed zero queries containing `products` or `INSERT INTO org_memberships`. PASS.
  - Test 2.2: `authenticate` middleware with zero-membership user leaves `req.orgId` as `undefined` without executing fallback queries. PASS.

---

### Challenge 3: Cross-Tenant Staff Leakage in `/api/crm/staff`
- **Assumption Challenged**: Querying `/api/crm/staff` with Organization A might return staff members, roles, or assignments belonging to Organization B.
- **Attack Scenario**: Organization A issues `GET /api/crm/staff` while Organization B provisions staff members concurrently.
- **Blast Radius**: High (CRM staff roster leakage, compensation visibility, role exposure).
- **Mitigation Implemented**:
  - In `backend-api/src/routes/crm.js` (`getStaffHandler`), the query explicitly scopes all UNION branches (`org_memberships`, `organization_memberships`, `crm_staff_assignments`) and all role JOINs (`crm_roles`, `crm_staff_roles`) with `WHERE org_id = $1` and `r.org_id = $1`.
- **Empirical Test Verification**:
  - Test 3.1: Request with Org A returns only Alice (Org A) and never Bob (Org B). Request with Org B returns only Bob and never Alice. PASS.
  - Test 3.2: Request without organization context returns HTTP 400 (`Organization context is required`). PASS.

---

### Challenge 4: SQL Migration Cartesian Product Regression
- **Assumption Challenged**: Database initialization or deployment scripts (`fix_db.sql` or `backend-api/fix_db.sql`) might contain rogue cross-joins creating Cartesian product memberships across all users and organizations.
- **Attack Scenario**: Running `psql < fix_db.sql` on the Ubuntu server could re-introduce cross-joins.
- **Blast Radius**: Critical (corrupts all tenant boundaries across the entire database).
- **Mitigation Implemented**:
  - Removed lines 130–148 (`CROSS JOIN`) from both `fix_db.sql` and `backend-api/fix_db.sql`.
- **Empirical Test Verification**:
  - Test 4.1: `backend-api/fix_db.sql` contains ZERO `CROSS JOIN` statements. PASS.
  - Test 4.2: `root fix_db.sql` contains ZERO `CROSS JOIN` statements. PASS.
  - Test 4.3: `add_indexes.sql` defines composite B-Tree indexes for `crm_staff_assignments`, `staff_tasks`, and `crm_salary_profiles`. PASS.

---

### Challenge 5: Cache Poisoning & Cross-Domain Invalidation Race
- **Assumption Challenged**: POS sales mutations could inadvertently flush CRM cached views, or CRM staff mutations could bust POS catalog cache.
- **Attack Scenario**: High volume checkout POS operations invalidate CRM dashboard analytics cache.
- **Blast Radius**: Medium (performance degradation on low-bandwidth tunnel).
- **Mitigation Implemented**:
  - In `backend-api/src/index.js`, `isCrmPath(path)` segregates CRM vs POS keys, purging only matching domains upon mutations.
- **Empirical Test Verification**:
  - Test 5.1: `isCrmPath` logic verified against `/api/crm`, `/rest/v1/crm_`, `/rest/v1/staff_tasks`, `/rest/v1/attendance_records`, `/rest/v1/salary_profiles`. PASS.

---

## Stress Test Results

| # | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---------------|-------------------|-----------------|--------|
| 1 | `GET /api/profiles` with zero org context | Empty array `[]` | Returned `[]` | PASS |
| 2 | `GET /api/organization-memberships` with zero org context | Empty array `[]` | Returned `[]` | PASS |
| 3 | `GET /api/memberships` with zero org context | Empty array `[]` | Returned `[]` | PASS |
| 4 | `GET /api/profiles?org_id=org-isolated-123` | Scoped to Org 123 | Returned only Org 123 | PASS |
| 5 | Login user with 0 memberships | Token `orgId: null`, 0 auto-inserts | Token `orgId: null`, 0 auto-inserts | PASS |
| 6 | `authenticate` with 0 memberships | `req.orgId: undefined`, 0 queries to largest org | `req.orgId: undefined`, 0 foreign queries | PASS |
| 7 | `GET /api/crm/staff` Org A vs Org B | Strict isolation (0 cross-tenant users) | Zero cross-tenant users | PASS |
| 8 | `GET /api/crm/staff` without org context | HTTP 400 error | HTTP 400 (`Organization context is required`) | PASS |
| 9 | `fix_db.sql` CROSS JOIN audit | 0 matches for `CROSS JOIN` | 0 matches | PASS |
| 10 | `backend-api/fix_db.sql` CROSS JOIN audit | 0 matches for `CROSS JOIN` | 0 matches | PASS |
| 11 | `add_indexes.sql` composite indexes | Indexes on `crm_staff_assignments`, `staff_tasks`, `crm_salary_profiles` | All composite indexes present | PASS |
| 12 | Micro-cache domain segregation | `isCrmPath` isolates CRM vs POS | Segregation verified | PASS |
| 13 | Vitest `src/test/fixDbSchema.test.ts` | 398/398 tests pass | 398/398 passed | PASS |
| 14 | Vitest `src/test/crmTenantIsolation.test.ts` | 45/45 tests pass | 45/45 passed | PASS |
| 15 | Vitest `src/test/crmBackendApiM1.test.ts` | 10/10 tests pass | 10/10 passed | PASS |
| 16 | Vitest `src/test/m1AdversarialChallenge.test.ts` | 12/12 tests pass | 12/12 passed | PASS |
| 17 | TypeScript compilation `tsc --noEmit` | Exit code 0, 0 errors | Exit code 0, 0 errors | PASS |

**Total Tests Verified**: 465 passing across 4 test suites.

---

## Unchallenged Areas

- **Live Production Database Concurrency**: Live PostgreSQL Docker daemon on Ubuntu server was not directly connected during offline CI verification; verification relied on bit-for-bit SQL script analysis, Vitest mock engines, and schema trigger tests.
- **Frontend CRM Pages**: Explicitly reserved for subsequent Milestones (M2–M5); no frontend changes were made or required in M1.
