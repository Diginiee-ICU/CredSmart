## 2026-10-29T19:29:40Z

You are Explorer 3 (teamwork_explorer) in the CRM Integration project.
Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation
Your Dispatch File: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation\DISPATCH.md
Authoritative User Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md completely.

Your mission is to perform a deep-dive technical investigation and architectural design for:
1. CredSmart's Capacitor Configuration & Mobile Packaging:
   - Inspect `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\capacitor.config.ts`, `android/`, gradle configurations, app bundle ID, permissions, plugins, splash screen, and Google Play Store build scripts/workflows.
   - Verify how the Capacitor mobile app boots, wraps the web bundle, and serves the PWA/SPA.
2. Dual-Backend Isolation Architecture:
   - POS & Billing Backend: How CredSmart currently connects to its Ubuntu backend (API endpoints e.g. `https://api.credsmart.online/api/*`, axios/fetch client, session JWT/token management, localStorage keys, offline syncing/IndexedDB).
   - CRM Backend: How Lovable CRM connects to Supabase (Supabase client, anon key, Supabase auth tokens, localStorage keys, realtime subscriptions).
   - Strict Isolation Design:
     - Design a rigorous isolation protocol preventing ANY cross-talk between POS & Billing and CRM.
     - Storage isolation: Partition localStorage, sessionStorage, IndexedDB, or use prefixed keys (`pos_*` vs `crm_*`) so auth tokens, cached query data, user sessions, and business data NEVER leak across boundaries.
     - Runtime state isolation: Separate React contexts, separate query clients (`QueryClient`), and separate routers or nested router branches.
3. Cold Launch Selection Hub ("App Switcher" / Portal):
   - Design the user experience and implementation specifications for the Cold Launch Selection Hub:
     - Displayed on EVERY cold application launch (app startup).
     - Allows user to choose between 'POS & Billing' and 'CRM'.
     - Visual design specification (matching CredSmart brand guidelines, touch-friendly cards, high responsiveness).
     - Mechanism to switch back to the Selection Hub or exit the sub-app (e.g. app switcher icon/drawer in headers, gesture, or explicit switch modal) without breaking native Android back-button behavior.
     - State reset on app exit/switch to ensure clean isolation.
4. Capacitor & Play Store Preservation:
   - Ensure the unified Capacitor configuration works flawlessly for Google Play Store release.
   - Ensure Android lifecycle events (pause, resume, back button), status bar, and notch safe-areas work seamlessly across both modules.

Deliver your comprehensive report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_capacitor_isolation\handoff.md`

When finished, send a message to the orchestrator summarizing your findings and referencing the handoff path.
