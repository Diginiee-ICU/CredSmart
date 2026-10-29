## 2026-10-29T19:47:51Z
You are the Worker (teamwork_worker) in the CRM Integration project.
Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_author
Your Dispatch File: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_author\DISPATCH.md
Authoritative User Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md completely.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You must read all three Explorer handoff reports before authoring the plan:
1. Explorer 1 Report: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_credsmart_crm\handoff.md
2. Explorer 2 Report: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_lovable_crm\handoff.md
3. Explorer 3 Report: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation\handoff.md
Also read the project architecture in:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_integration\PROJECT.md

Your mission is to author the definitive, production-grade integration and migration plan and write it directly to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\CRM_INTEGRATION_PLAN.md`

The plan must be comprehensive, highly actionable, and cover every requirement with full engineering rigor:
1. **Executive Summary & Architecture Blueprint**:
   - High-level overview of the migration from legacy CRM to Lovable CRM.
   - Dual-backend isolation architecture diagram & explanation (Ubuntu API for POS & Billing, Supabase Cloud for Lovable CRM).
   - Unified Capacitor mobile packaging architecture.
2. **Obsolete CRM File & Asset Decommissioning Catalog (Requirement R1)**:
   - Complete inventory of the 88 files to delete in CredSmart (9 pages, 10 components, 1 hook, 1 service, 4 utils, 2 types, 2 skills, 5 backend/SQL files, 54 unit tests) with exact paths, types, actions, and rationales.
   - Exact specifications for refactoring `src/components/routing/BillingLockdownGuard.tsx` to eliminate `useCRMPermission`.
   - Exact specifications for refactoring `src/components/AppSidebar.tsx`, `src/components/AppLayout.tsx`, `src/config/routes.ts`, `src/App.tsx`, and backend entry point `backend-api/src/index.js`.
   - Explicit preservation list for all POS/Billing core pages, the 19 protected invoice quarantine files, and `src/pages/Staff.tsx`.
3. **Lovable CRM Architecture & Dependency Mapping (Requirement R2)**:
   - Full catalog of UI components, pages, features, and utilities from `C:\Users\bishn\OneDrive\Documents\GitHub\CRM`.
   - Target placement directory structure inside `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\crm\`.
   - Dependency reconciliation: side-by-side package analysis, explicit installation of `dompurify` and `@types/dompurify`, retention of React 18.3.1, Vite 5.4.19, and Tailwind 3.4.17.
   - Real Supabase client configuration in `src/crm/integrations/supabase/client.ts` pointing to `https://wqllixoghlxvapmziilk.supabase.co` with `auth.storageKey: "crm_supabase_auth_token"`.
4. **Dual-Backend Isolation & Unified Capacitor Packaging (Requirement R3)**:
   - Storage isolation matrix (`pos_*` vs `crm_*` keys in LocalStorage, SessionStorage, IndexedDB) with zero token or cache cross-talk.
   - Runtime state isolation: independent `posQueryClient` and `crmQueryClient`, isolated provider trees.
   - Cold Launch Selection Hub (`<ColdLaunchHub />`):
     - Displayed on EVERY cold app launch via `sessionStorage` cold-boot detection (`sessionStorage.getItem("credsmart_launch_portal_active") === null`).
     - UI/UX layout specifications matching CredSmart Minimal Design System tokens (tactile cards, hairline borders, brand badges).
     - Native Android hardware back-button hierarchy in `nativeCapacitor.ts` (Dialog -> History -> Return to Hub -> Double-tap Exit).
     - Universal header Workspace Switcher for in-app transitions.
   - Capacitor configuration, Android target SDK 36 (min SDK 24), AndroidManifest permissions, Google Play Store `.aab` release bundle workflow (`gradlew.bat bundleRelease`).
5. **Step-by-Step Phased Execution Sequence (Requirement R4)**:
   - Phase 1: Environment & Dependency Preparation (Install `dompurify`).
   - Phase 2: Decouple POS Guards & Decommission Obsolete CRM Files.
   - Phase 3: Port Lovable CRM into `src/crm/` and configure Real Supabase Client.
   - Phase 4: Implement Cold Launch Selection Hub & Back-Button Navigation.
   - Phase 5: Refactor Shells, Routes, and Multi-Domain Tests.
   - Phase 6: Capacitor Mobile Packaging & Play Store Verification.
   - For every phase: Pre-requisites, concrete implementation steps, risk mitigation, rollback points, and verification smoke tests.
6. **Verification, Smoke Test & Quality Assurance Protocols**:
   - TypeScript compilation checks (`tsc --noEmit`).
   - Unit test execution (`vitest run`).
   - Dual-backend network traffic verification (inspecting fetch calls to `api.credsmart.online` vs `wqllixoghlxvapmziilk.supabase.co`).
   - Cold launch switching smoke test.
   - Capacitor Android build verification (`gradlew.bat bundleRelease`).

Deliver the complete plan to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\CRM_INTEGRATION_PLAN.md`
And deliver your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_author\handoff.md`

When done, message the orchestrator.
