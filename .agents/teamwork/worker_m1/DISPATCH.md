## 2026-10-18T18:15:36Z
You are worker_m1. Your working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Reference Specifications & Architecture:
- Project specification: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
- Explorer survey findings: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md

Write Ownership:
You EXCLUSIVELY own:
- `src/lib/apiClient.ts`
- `src/test/apiClient.test.ts`
Do NOT modify files outside your ownership boundary.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Implement Milestone 1 (M1) — Centralized API Client & Auth Interceptor:
1. Create `src/lib/apiClient.ts` as a robust, production-grade HTTP client communicating with `https://api.credsmart.online/api`:
   - Configurable base URL defaulting to `https://api.credsmart.online/api` (allow override via `VITE_API_BASE_URL` or `window.__API_BASE_URL__`).
   - Automatically retrieve active Supabase JWT session token via `supabase.auth.getSession()` and attach `Authorization: Bearer <token>`.
   - Automatically attach `x-organization-id` header from caller options or `localStorage.getItem("credsmart_active_org_id")`.
   - Support standard HTTP methods: GET, POST, PUT, DELETE, PATCH with URL query parameters and JSON serialization.
   - Provide transparent 401 Unauthorized token refresh: call `supabase.auth.refreshSession()` and retry once if the session expired.
   - Response normalization envelope: `{ data: T | null, error: ApiError | null }` where `ApiError` has `{ message: string, code?: string, status?: number }`.
   - Export helper functions: `apiClient<T>(endpoint, options)`, `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch`.
2. Write unit tests in `src/test/apiClient.test.ts` (15+ tests):
   - Header propagation (Bearer token, Content-Type, x-organization-id).
   - Method verbs (GET, POST, PUT, DELETE, PATCH).
   - URL parameter serialization.
   - Error normalization on 400, 404, 500 responses.
   - 401 automatic token refresh and retry flow.
   - Network failure handling.
3. Verification:
   - Run `cmd /c npx tsc --noEmit` to verify clean compilation with 0 errors.
   - Run `cmd /c npx vitest run src/test/apiClient.test.ts` to verify 100% passing tests.

Write your complete handoff report to:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md
When done, notify the orchestrator with send_message to recipient 73ee3452-ffda-43b4-83da-c3ca2006c47f.
