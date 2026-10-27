# Implementation Progress — Worker M1 (Backend Multi-Tenant Isolation & Staff Provisioning)

**Last visited**: 2026-10-26T20:32:00Z  
**Worker**: `worker_m1_backend`  
**Milestone**: M1 (Requirements R1, R5, R7)

---

## 1. Baseline Test Run
- Command: `cmd /c npx vitest run src/test/crmTenantIsolation.test.ts src/test/fixDbSchema.test.ts src/test/crmBackendApiM1.test.ts`
- Result: 2 passed, 1 failed (452 passed, 1 failed in fixDbSchema test 4.2).

---

## 2. Implementation Execution
- [x] Step 1: Fixed `backend-api/fix_db.sql` and `fix_db.sql`: removed rogue CROSS JOIN (lines 130-148), aligned cross-table membership sync with `ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role`.
- [x] Step 2: Fixed `backend-api/src/routes/auth.js`: in `getUserPrimaryOrgId`, included `crm_staff_assignments`, removed product-count ordering (`COUNT(*) FROM products DESC`), removed auto-insert fallback into largest organization (now returns `null` if no explicit membership exists).
- [x] Step 3: Fixed `backend-api/src/middleware/auth.js`: in `authenticate` middleware, removed product-count ordering, removed catch block fallback selecting organization with most products, included `crm_staff_assignments`.
- [x] Step 4: Fixed `backend-api/src/routes/settings.js`: in `getMembershipsHandler` (`/api/organization-memberships`) and `GET /api/profiles`, enforced `targetOrg` filtering so missing/undefined `targetOrg` immediately returns an empty array `[]` instead of running `WHERE 1=1` and leaking users across tenants. Included `crm_staff_assignments` in profile lookups.
- [x] Step 5: Verified `backend-api/src/routes/crm.js`: staff provisioning password derivation `{cleanName}123` with bcrypt hash, strict scoping in `crm_staff_assignments` and `crm_staff_roles`, strict tenant scoping in `GET /api/crm/staff`.
- [x] Step 6: Fixed `backend-api/src/index.js`: expanded 10-second micro-cache (`CACHE_TTL_MS = 10000`) to cover `/rest/v1/*` read requests in addition to `/api/`; segregated CRM vs POS cache keys on mutation so POS operations do not invalidate CRM cache and vice versa.
- [x] Step 7: Fixed `backend-api/add_indexes.sql`: added composite B-Tree indexes for `crm_staff_assignments(org_id, user_id)`, `staff_tasks(org_id, status)`, `crm_salary_profiles(org_id, staff_id)`, `crm_roles(org_id)`, `crm_attendance(org_id, date)`, and updated `ANALYZE` commands.
- [x] Step 8: Full verification:
  - `cmd /c npx vitest run src/test/crmTenantIsolation.test.ts src/test/fixDbSchema.test.ts src/test/crmBackendApiM1.test.ts`: 3 files passed, 453/453 tests passed!
  - `cmd /c npx tsc --noEmit`: exited with code 0 (zero errors).
  - Zero frontend files touched.
