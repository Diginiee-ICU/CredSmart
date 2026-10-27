## 2026-10-26T20:33:30Z
You are Challenger 2 (Cache Segregation & Staff Provisioning Challenger) for Milestone M1 of CredSmart CRM Defects Elimination.

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m1_2
Authoritative Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (MUST read section ## 2026-10-26T19:54:47Z before starting work!)
Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md
Worker Handoff: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_backend\handoff.md

Objective:
Empirically and adversarially challenge micro-caching, domain segregation, and staff provisioning.
Verify:
1. In-memory micro-cache covers `/rest/v1/*` read requests. Repeating a GET on `/rest/v1/*` hits the cache.
2. Invalidation logic: CRM mutations (`/api/crm/*`, `/rest/v1/crm_*`, `/rest/v1/staff_tasks`) purge ONLY CRM keys and leave POS keys intact; POS mutations purge ONLY POS keys and leave CRM keys intact.
3. Staff provisioning password derivation creates `{cleanName}123` (min 6 chars), correctly stores bcrypt hash, and links `crm_staff_assignments` strictly to `org_id`.
4. Run empirical verification tests:
   `cmd /c npx vitest run src/test/crmBackendApiM1.test.ts`
   `cmd /c npx tsc --noEmit`

Output Requirements:
- Write challenge report in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m1_2\challenge.md`.
- Write handoff report in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m1_2\handoff.md` with explicit Verdict: APPROVE or REQUEST_CHANGES.
- Send completion message to orchestrator. Do not edit source files.
