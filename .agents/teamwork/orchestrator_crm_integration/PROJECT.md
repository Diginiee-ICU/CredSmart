# Project: CredSmart Lovable CRM Migration & Unified Capacitor Mobile App

## Architecture
- **Dual-Backend Isolated Hybrid Application**:
  - **POS & Billing Subsystem**: Connects exclusively to the Ubuntu Cloud backend (`https://api.credsmart.online/api/*`) via Express JWTs (`pos_auth_token`), tenant org context (`pos_active_org_id`), and IndexedDB offline cache (`credsmart_offline_db`). Wrapped in `PosAuthProvider`, `PosOrgProvider`, and `posQueryClient`.
  - **Lovable CRM Subsystem**: Self-contained in `src/crm/` (`<CrmApp />`), connecting exclusively to Supabase Cloud (`https://wqllixoghlxvapmziilk.supabase.co`) via authentic `@supabase/supabase-js` client configured with `auth.storageKey: "crm_supabase_auth_token"`. Wrapped in `CrmStoreProvider` and `crmQueryClient`.
  - **Cold Launch Selection Hub**: Rendered on cold application boot (`sessionStorage.getItem("credsmart_launch_portal_active") === null`), presenting touch-optimized dual selection cards for "POS & Billing ERP" and "CredSmart CRM by CredAlert" conforming to CredSmart Minimal Design System tokens.
  - **Unified Capacitor Mobile Packaging**: Built for Google Play Store using Capacitor 8.1.0, targeting Android SDK 36 (min SDK 24), generating release `.aab` bundles via `gradlew.bat bundleRelease` with upload signing keys, hardware back-button navigation hierarchy, and safe-area notch compliance.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Obsolete CRM File Purge | Remove 88 cataloged legacy CRM files (9 pages, 10 components, 1 hook, 1 service, 4 utils, 2 types, 2 skills, 5 backend scripts, 54 unit tests) | M1 | Explorer 1 |
| 2 | Billing Route Lockdown Guard Decoupling | Refactor `BillingLockdownGuard.tsx` to eliminate `useCRMPermission` and guard `/billing/*` strictly via store roles from `useOrganization()` | M1 | Explorer 1 |
| 3 | Shell & Router Pruning | Refactor `AppSidebar.tsx`, `AppLayout.tsx`, `routes.ts`, and `App.tsx` removing legacy CRM submenus, dock tabs, and actions | M1 | Explorer 1 |
| 4 | Multi-Domain Test Suite Alignment | Refactor 5 multi-domain test suites removing CRM-specific assertions while 100% preserving core POS assertions | M1 | Explorer 1 |
| 5 | Dependency Reconcilation (`dompurify`) | Install `dompurify` and `@types/dompurify` in CredSmart without altering React 18, Vite 5, or Tailwind 3 | M2 | Explorer 2 |
| 6 | Lovable CRM Codebase Porting | Place full Lovable CRM suite into `src/crm/` with scoped styles in `src/crm/styles/crm.css` and export `<CrmApp />` | M2 | Explorer 2 |
| 7 | Dedicated Real Supabase Client | Configure authentic `@supabase/supabase-js` client in `src/crm/integrations/supabase/client.ts` pointing to `wqllixoghlxvapmziilk` with `auth.storageKey: "crm_supabase_auth_token"` | M2 | Explorer 2 |
| 8 | Cold Launch Selection Hub UI/UX | Implement `<ColdLaunchHub />` displaying on every cold start via `sessionStorage` cold-boot detection with CredSmart brand tokens | M3 | Explorer 3 |
| 9 | Dual-Backend Storage Partitioning | Enforce strict `pos_*` vs `crm_*` storage keys and independent `QueryClient` instances with zero runtime cross-talk | M3 | Explorer 3 |
| 10 | Hardware Back-Button & In-App Switcher | Implement 4-tier Android back button hierarchy and universal header workspace switcher in `nativeCapacitor.ts` | M3 | Explorer 3 |
| 11 | Capacitor Android & Play Store Build | Verify Capacitor config, AndroidManifest permissions, target SDK 36, and `.aab` release bundle generation | M3 | Explorer 3 |
| 12 | Comprehensive Master Plan Authoring | Generate production-grade `CRM_INTEGRATION_PLAN.md` with file inventories, target structures, dependency reconciliations, routing specs, execution phases, and verification tests | M4 | Synthesis |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Obsolete CRM File & Asset Decommissioning | Catalog 88 obsolete CRM files, guard decoupling, shell cleanup, multi-domain test preservation | none | READY (APPROVED PLAN) |
| M2 | Lovable CRM Architecture & Placement | Dependency reconciliation (`dompurify`), `src/crm/` tree, real Supabase client, scoped styles | M1 | READY (APPROVED PLAN) |
| M3 | Dual-Backend Isolation, Selection Hub & Capacitor | Storage keys, QueryClient isolation, ColdLaunchHub component, back-button hierarchy, Play Store packaging | M2 | READY (APPROVED PLAN) |
| M4 | Master CRM Integration Plan (`CRM_INTEGRATION_PLAN.md`) | Authoritative production-grade implementation blueprint covering all acceptance criteria | M1, M2, M3 | DONE (v2.0.0-PRODUCTION APPROVED) |

## Interface Contracts
### POS & Billing ↔ Ubuntu Cloud Engine
- **Base URL**: `https://api.credsmart.online/api`
- **Auth Header**: `Authorization: Bearer <pos_auth_token>`
- **Org Header**: `x-organization-id: <pos_active_org_id>`
- **Offline Storage**: IndexedDB `credsmart_offline_db` (`offline_sync_queue`)
- **Error Handling**: On HTTP 401, trigger refresh via `POST /api/auth/refresh`.

### Lovable CRM ↔ Supabase Cloud Engine
- **Supabase URL**: `https://wqllixoghlxvapmziilk.supabase.co`
- **Publishable Key**: `sb_publishable_GP55TeYmJ05j2ypHUzlHvA_GtQFSPqA`
- **Auth Storage Key**: `crm_supabase_auth_token`
- **Primary RPC**: `supabase.rpc("save_workforce", { _data: Json, _roles: Json })`
- **Realtime Channel**: `ws:<workspaceId>` (private broadcast)
- **Local Storage Master Key**: `wf-crm-v1`

### Cold Launch Selection Hub ↔ Sub-App Portals
- **Cold Boot Condition**: `sessionStorage.getItem("credsmart_launch_portal_active") === null`
- **POS Launch Action**: `sessionStorage.setItem("credsmart_launch_portal_active", "billing")` -> `navigate("/billing/dashboard")`
- **CRM Launch Action**: `sessionStorage.setItem("credsmart_launch_portal_active", "crm")` -> `navigate("/crm")`
- **Inter-App Switch Action**: Top command bar trigger -> dialog/drawer -> unmount current sub-app -> clear/update `credsmart_launch_portal_active` -> navigate.
- **Back Navigation**: Root of sub-app -> return to `/` (Selection Hub); Root of Selection Hub -> double-tap back within 2000ms calls `CapApp.exitApp()`.
