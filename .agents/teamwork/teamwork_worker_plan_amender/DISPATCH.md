## 2026-10-29T20:08:14Z
You are Worker 2 (teamwork_worker) on the CRM Integration project.
Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_amender
Your Dispatch File: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_amender\DISPATCH.md
Authoritative User Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md completely.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You must read:
1. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\CRM_INTEGRATION_PLAN.md`
2. Challenger 1 Handoff: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_challenger_plan_1\handoff.md`
3. Reviewer 1 Handoff: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_reviewer_plan_1\handoff.md`
4. Reviewer 2 Handoff: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_reviewer_plan_2\handoff.md`

Your mission is to upgrade and amend `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\CRM_INTEGRATION_PLAN.md` by directly incorporating all four mandatory amendments from Challenger 1 and the implementation refinements from Reviewer 1 and 2:
1. Safe Cold Launch Protocol & Redirect Loop Prevention:
   - Update Section 2.3 and Section 4.3 with the explicit `HomeRoute` implementation in `src/App.tsx`.
   - Scope `<ColdLaunchHub />` for native mobile (`isNativePlatform()`) and standalone PWA on cold start (`portalActive === null`). Preserve `<Landing />` on desktop web.
   - Specify guard self-healing: authenticated users entering `/billing/*` without `sessionStorage` set `sessionStorage.setItem("credsmart_launch_portal_active", "billing")` rather than blindly redirecting to `/` (eliminating infinite redirect loops).
2. Mandatory Import Path Rewriting for `src/crm/`:
   - In Section 3.2 and Section 5 (Phase 3), explicitly mandate that all 11 files in Lovable CRM importing from `@/integrations/supabase/client` must be rewritten to `@/crm/integrations/supabase/client` so they never accidentally bind to CredSmart's POS Express API shim.
3. Fix the 4-Tier Android Hardware Back-Button Hierarchy in `nativeCapacitor.ts`:
   - Priority 1: Query for open modals and trigger `closeBtn.click()` as well as `Escape` event to close all drawers (`vaul`) and sheets cleanly without trapping the user.
   - Priority 2: Deep history back (`window.history.back()`). Explicitly REMOVE `/billing/pos` from `isRootOfPortal` so users can back out of POS into Dashboard or Sales.
   - Priority 2A: Inside `/crm`, check if active tab != 'command' and navigate back to command first before exiting CRM.
   - Priority 3: When on portal root (`/billing/dashboard`, `/billing`, or `/crm`), return to Selection Hub via SPA navigation (`window.history.pushState(null, "", "/")` + PopStateEvent) rather than a hard reload (`window.location.href = "/"`).
   - Priority 4: Selection Hub double-tap back within 2000ms exits app. Ensure `lastBackPressTime` is declared at module scope.
4. Explicit Supabase Realtime Disconnect & QueryClient Accuracy:
   - Correct the plan to note that Lovable CRM uses `useSyncExternalStore` in `store.ts` rather than React Query.
   - Add explicit teardown: `crmSupabase.realtime.disconnect()` in `disconnectCrmRealtime()` upon unmounting CRM or switching to POS, ensuring zero background WebSocket heartbeat frames to Supabase while in POS.
   - Retain `createSupabaseFetch` in `src/crm/integrations/supabase/client.ts` to handle publishable key headers.
5. Implementation Refinements:
   - Asset imports in `CrmApp.tsx`: replace `.asset.json` with CredSmart's local static assets (`/logo.png`, `/favicon.png`).
   - Tailwind v4 `@utility` directives in `styles.css` translated to standard CSS classes (`.glass`, `.tap`, `.sheet-in`) in `src/crm/styles/crm.css`.
   - Adapt `staff-auth.functions.ts` for client-side SPA (no `@tanstack/react-start` server functions in client build).

Deliver the amended plan to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\CRM_INTEGRATION_PLAN.md`
And write your completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_amender\handoff.md`

When finished, message the orchestrator.
