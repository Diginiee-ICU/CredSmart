# Adversarial Challenge Report — Milestone M1: Cache Segregation & Staff Provisioning

**Agent**: `challenger_m1_2` (Challenger 2)  
**Milestone**: M1 (Requirements R1, R5, R7)  
**Target Area**: In-Memory Micro-Cache, PostgREST Passthrough Caching, Domain Invalidation Segregation, Staff Password Derivation & Org Binding  
**Date**: 2026-10-26T20:43:00Z  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The backend implementation in `backend-api/src/index.js` and `backend-api/src/routes/crm.js` was subjected to adversarial stress testing across 5 core dimensions:
1. Micro-cache coverage of `/rest/v1/*` PostgREST read endpoints.
2. Repeating GET cache hit behavior and 10-second TTL expiration.
3. Invalidation domain segregation (CRM mutations purging only CRM keys; POS mutations purging only POS keys; cross-tenant mutation safety).
4. Auto-generated staff password derivation `{cleanName}123` across boundary and adversarial name inputs, ensuring the minimum 6-character guarantee.
5. Strict tenant binding of `crm_staff_assignments` and role queries to `org_id`.

All 26 adversarial stress tests in `src/test/crmCacheAndProvisioningChallenger.test.ts` and all 10 tests in `src/test/crmBackendApiM1.test.ts` passed cleanly (100%). TypeScript compilation (`tsc --noEmit`) verified 0 errors.

One low-severity edge case in string prefix matching was identified and documented below with safe mitigation analysis.

---

## Challenges

### [Low] Challenge 1: Substring Prefix Matching in Cache Key Invalidation

- **Assumption challenged**: The cache invalidation logic assumes `key.startsWith(orgId)` reliably isolates entries belonging to a given tenant.
- **Attack scenario**: If tenant identifiers were simple alphanumeric prefixes rather than standard UUIDs (e.g. `org-1` vs `org-10`), a mutation for tenant `org-1` would evaluate `'org-10:/rest/v1/crm_roles'.startsWith('org-1')` as `true` and inadvertently flush the cached records of `org-10`.
- **Blast radius**: Low/Benign. In CredSmart production, all organization IDs are RFC 4122 v4 UUIDs (36 characters with hyphens, e.g. `11111111-2222-3333-4444-555555555555`). Because all UUIDs are of uniform length (36 characters), one valid UUID cannot be a strict prefix of another valid UUID. Furthermore, an accidental cache flush is merely a transient performance penalty (subsequent request re-populates cache from DB) rather than data corruption or data leak.
- **Mitigation**: Standardize the prefix check in `backend-api/src/index.js` line 88 to match with the delimiter: `!key.startsWith(`${orgId}:`) && !key.startsWith('global:')`.

### [Low] Challenge 2: Single-Node In-Memory Cache Under Clustered Deployment

- **Assumption challenged**: The cache uses a Node.js process-local `Map` (`apiCache`), assuming single-instance Express execution behind the Cloudflare tunnel.
- **Attack scenario**: If the backend container is scaled out horizontally into multiple replicas behind a round-robin load balancer, an update routed to Replica A would invalidate Replica A's in-memory cache, but Replica B might continue serving stale data for up to 10 seconds.
- **Blast radius**: Low. The current architecture deploys a single containerized Node.js instance on the Ubuntu host (`woodzire@credsmart:~/server`). With a 10-second maximum TTL, even under potential multiple workers, worst-case eventual consistency is 10 seconds. For horizontal clustering in future milestones, Redis/Valkey pub-sub can replace the in-process Map.
- **Mitigation**: For current deployment, single instance satisfies requirements; for multi-node clustering in Phase 5/6, wire Redis cache invalidation bus.

---

## Stress Test Results

| # | Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------|-------------------|-----------------|--------|
| 1 | Initial GET on `/rest/v1/crm_roles`, `/rest/v1/staff_tasks`, `/rest/v1/products` | PostgREST path recognized, response cached in `apiCache` | Cached under `${orgId}:${url}` | **PASS** |
| 2 | Immediate repeat GET on `/rest/v1/crm_roles` within 10s | Served directly from in-memory cache with `X-Cache: HIT` | `hit: true`, exact data returned | **PASS** |
| 3 | GET after 10001 ms elapsed | Cache entry expired, fresh query dispatched | `hit: false` | **PASS** |
| 4 | GET with identical path for `org-A` vs `org-B` | Tenant-isolated cache keys; `org-A` hit does not populate or match `org-B` | Separate keys `${orgId}:${url}`, `org-B` misses | **PASS** |
| 5 | `isCrmPath` classifier on CRM endpoints (`/api/crm/*`, `/rest/v1/crm_*`, `/rest/v1/staff_tasks`, `/rest/v1/salary_profiles`) | Returns `true` for all 14 CRM paths | `true` across all test vectors | **PASS** |
| 6 | `isCrmPath` classifier on POS endpoints (`/api/products`, `/api/sales`, `/rest/v1/products`, `/rest/v1/sales`) | Returns `false` for all 15 POS paths | `false` across all test vectors | **PASS** |
| 7 | CRM mutation (`POST /api/crm/tasks`) for `org-alpha` | Purges all CRM keys of `org-alpha`; leaves POS keys of `org-alpha` and all `org-beta` keys intact | Only `org-alpha` CRM keys deleted; POS & beta untouched | **PASS** |
| 8 | POS mutation (`POST /api/sales`) for `org-alpha` | Purges all POS keys of `org-alpha`; leaves CRM keys of `org-alpha` and all `org-beta` keys intact | Only `org-alpha` POS keys deleted; CRM & beta untouched | **PASS** |
| 9 | Global mutation on CRM (`POST /api/crm/permissions/bulk`) | Purges CRM keys across all tenants; leaves all POS keys untouched | All CRM keys purged; all POS keys survive | **PASS** |
| 10 | Password derivation for 1-char name `"A"` | Generates `"a12333"` (length 6) | `"a12333"` (length 6) | **PASS** |
| 11 | Password derivation for 2-char name `"Al"` | Generates `"al1233"` (length 6) | `"al1233"` (length 6) | **PASS** |
| 12 | Password derivation for multi-word `"Rohan Gupta"` | Generates `"rohan123"` (length 8) | `"rohan123"` (length 8) | **PASS** |
| 13 | Password derivation for empty / whitespace `"   "` | Falls back to `"staff123"` (length 8) | `"staff123"` (length 8) | **PASS** |
| 14 | Password derivation for special characters `"!@#$%"` | Falls back to `"staff123"` (length 8) | `"staff123"` (length 8) | **PASS** |
| 15 | Explicit custom password >= 6 chars | Preserves explicit password without override | Preserved exactly | **PASS** |
| 16 | Explicit password < 6 chars (`"12345"`) | Rejects with validation error | Validation fails with 6-char requirement | **PASS** |
| 17 | Password hashing contract | Standard 60-char bcrypt hash with salt round 10 | Matches `^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$` | **PASS** |
| 18 | Existing cross-tenant user provisioning security | Never overwrites or resets existing user's `password_hash` | Existing hash strictly preserved | **PASS** |
| 19 | Multi-tenant staff assignment scoping | Requires explicit `org_id` / `organization_id` on `crm_staff_assignments` | Verified | **PASS** |
| 20 | Substring prefix collision test (`org-1` vs `org-10`) | Empirically assesses prefix overlap vulnerability | Documented as Challenge 1 | **PASS** |

---

## Unchallenged Areas

- **Live Ubuntu Server Database Connection**: Challenger operated in local workspace emulator mode without live SSH tunnel to remote Ubuntu host PostgreSQL. Static DDL scripts, SQL migrations (`fix_db.sql`, `add_indexes.sql`), and server route handlers were exhaustively validated against mock and contract harnesses.
- **Frontend Salary & Task View Components**: Deferred to Milestones M2 and M3 per orchestrator project plan.
