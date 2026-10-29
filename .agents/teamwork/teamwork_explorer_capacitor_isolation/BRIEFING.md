# BRIEFING — 2026-10-29T19:30:00Z

## Mission
Deep-dive technical investigation and architectural design for CredSmart's Capacitor mobile packaging, dual-backend isolation (Ubuntu POS API vs Supabase CRM), Cold Launch Selection Hub, and Google Play Store preservation.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Explorer, Architect, System Investigator
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation
- Original parent: 9748749b-91ae-4c8c-9c53-2b946c42ea38
- Milestone: Investigation & Architecture Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production code modifications
- File workspace convention: Write ONLY to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation`
- Strictly adhere to minimal design system and zero-regression rules
- Full evidence chain required with exact files and lines

## Current Parent
- Conversation ID: 9748749b-91ae-4c8c-9c53-2b946c42ea38
- Updated: 2026-10-29T19:40:00Z

## Investigation State
- **Explored paths**:
  - `capacitor.config.ts`, `android/build.gradle`, `android/app/build.gradle`, `android/variables.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/styles.xml`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/java/com/credsmart/pos/MainActivity.java`.
  - `src/services/nativeCapacitor.ts`, `src/components/native/NativePlatformBridge.tsx`, `src/App.tsx`, `src/config/routes.ts`, `src/hooks/useActiveSuite.ts`, `src/components/SuiteSwitcher.tsx`, `src/components/mobile/MobileAppStartingCards.tsx`.
  - `src/lib/apiClient.ts`, `src/integrations/supabase/client.ts`, `src/utils/offlineQueue.ts`.
  - `C:\Users\bishn\OneDrive\Documents\GitHub\CRM` (package.json, src/routes, src/router.tsx, src/integrations/supabase/client.ts, src/integrations/supabase/previewAuthStorage.ts, src/components/crm/CrmApp.tsx, src/lib/store.ts, .env).
  - `playstore-assets/`, `releases/`, `package.json`.
- **Key findings**:
  - Capacitor packaging is production-ready targeting SDK 36 (Android 16), min SDK 24, with AAB bundle workflow (`bundleRelease`) and custom key signing.
  - CredSmart POS connects to Ubuntu backend (`https://api.credsmart.online/api/*`) using custom JWT auth (`credsmart_auth_token`), org ID (`credsmart_active_org_id`), and IndexedDB offline queue (`credsmart_offline_db`).
  - Lovable CRM connects to Supabase project `wqllixoghlxvapmziilk` (`https://wqllixoghlxvapmziilk.supabase.co`) with its own auth token, realtime channels, and state store (`wf-crm-v1`).
  - Strict isolation requires: namespace partitioning (`pos_*` vs `crm_*`), separate QueryClients (`posQueryClient` vs `crmQueryClient`), separate context trees, and isolated router branches.
  - Cold Launch Selection Hub can be displayed on every cold startup via `sessionStorage` gating or in-memory cold-boot detection, with seamless native back-button handling returning to Hub before app exit.
- **Unexplored areas**: None remaining for this scope. Ready to generate comprehensive handoff.md.

## Key Decisions Made
- Partition storage keys with `pos_` and `crm_` namespaces.
- Set explicit `auth.storageKey` for CRM Supabase client.
- Mount separate QueryClients for POS and CRM to avoid query cache contamination.
- Implement Cold Launch Selection Hub at `/` with `sessionStorage` cold-start detector.
- Update hardware back-button handler to return to Selection Hub from root views of either sub-app before exiting.

## Artifact Index
- `DISPATCH.md` — Inbound instructions from orchestrator
- `BRIEFING.md` — Persistent working memory
- `progress.md` — Liveness heartbeat and milestone tracker
- `handoff.md` — Final comprehensive 5-component report
