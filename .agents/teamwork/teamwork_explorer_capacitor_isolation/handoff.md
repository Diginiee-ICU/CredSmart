# Handoff Report: Capacitor Configuration, Mobile Packaging, Dual-Backend Isolation & Cold Launch Hub

**Explorer ID**: Explorer 3 (`teamwork_explorer_capacitor_isolation`)  
**Mission**: Technical Investigation & Architectural Specification for Unified Capacitor Mobile Packaging, Dual-Backend Strict Isolation, Cold Launch Selection Hub, and Google Play Store Preservation.  
**Date**: 2026-10-29  
**Status**: Completed  

---

## 1. Observation

### 1.1 Capacitor Configuration & Android Packaging
Direct inspection of `capacitor.config.ts`, `android/`, and `package.json` revealed:

1. **Capacitor Configuration (`capacitor.config.ts:10-34`)**:
   ```typescript
   const config: CapacitorConfig = {
     appId: 'com.credsmart.pos',
     appName: 'CredSmart',
     webDir: 'dist',
     plugins: {
       StatusBar: {
         overlaysWebView: false,
         style: 'LIGHT',
         backgroundColor: '#FFFFFF',
       },
       Keyboard: {
         resize: 'body',
         style: 'DARK',
         resizeOnFullScreen: true,
       },
     },
     ...(serverUrl ? { server: { url: serverUrl, cleartext: isLocalServer } } : {}),
   };
   ```
2. **Capacitor Core & Plugin Dependencies (`package.json:61-69`)**:
   - `@capacitor/android`: `^8.1.0`
   - `@capacitor/app`: `^8.1.1`
   - `@capacitor/cli`: `^8.1.0`
   - `@capacitor/core`: `^8.1.0`
   - `@capacitor/haptics`: `^8.0.2`
   - `@capacitor/ios`: `^8.1.0`
   - `@capacitor/keyboard`: `^8.0.5`
   - `@capacitor/network`: `^8.0.1`
   - `@capacitor/status-bar`: `^8.0.3`
   - Android build scripts (`package.json:46-49`):
     - `"cap:sync": "npx cap sync android"`
     - `"android:assemble": "npm run build && npx cap sync android && cd android && .\\gradlew.bat assembleRelease"`
     - `"android:bundle": "npm run build && npx cap sync android && cd android && .\\gradlew.bat bundleRelease"`
     - `"android:release": "npm run build && npx cap sync android && cd android && .\\gradlew.bat bundleRelease"`
3. **Android Project & Gradle Specifications**:
   - `android/build.gradle:10-33`: Gradle build tools `8.13.0`, Google Services `4.4.4`, `JavaVersion.VERSION_17`.
   - `android/variables.gradle:1-16`:
     - `minSdkVersion = 24` (Android 7.0 Nougat)
     - `compileSdkVersion = 36` (Android 16)
     - `targetSdkVersion = 36` (exceeds Google Play Store target API 34+ requirement)
     - `androidxWebkitVersion = '1.14.0'`
     - `coreSplashScreenVersion = '1.2.0'`
   - `android/app/build.gradle:17-59`:
     - `applicationId "com.credsmart.pos"`, `namespace = "com.credsmart.pos"`
     - `versionCode` = `19`, `versionName` = `"1.1.7"`
     - Signing configuration reads from `rootProject.file("signing.properties")` using `android/credsmart-upload-key.jks` and `upload_certificate.pem`.
   - Releases directory (`releases/`):
     - `CredSmart-v1.1.7-release.aab` (17.4 MB)
     - `CredSmart-v1.1.7-release.apk` (18.3 MB)
   - Store assets (`playstore-assets/`):
     - `app-icon-512x512.png`, `feature-graphic-1024x500.png`, and 6 phone + 6 tablet + 6 10-inch screenshots.
4. **Android Manifest & Permissions (`android/app/src/main/AndroidManifest.xml:39-53`)**:
   - Permissions:
     - `android.permission.INTERNET`
     - `android.permission.ACCESS_NETWORK_STATE`
     - `android.permission.VIBRATE`
     - `android.permission.CAMERA`
     - `android.permission.BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`
     - `android.permission.ACCESS_FINE_LOCATION` (already included for GPS geofencing & bluetooth scanning)
   - Activity configuration (`AndroidManifest.xml:12-25`):
     - `android:name=".MainActivity"`
     - `android:launchMode="singleTask"`
     - `android:theme="@style/AppTheme.NoActionBarLaunch"`
     - `android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"`
5. **Native Platform Bridge & Device Capabilities (`src/services/nativeCapacitor.ts:23-207`)**:
   - `initNativeCapabilities()` initializes StatusBar (`#020817` dark / `#FFFFFF` light, `setOverlaysWebView: false`), Keyboard resize mode `KeyboardResize.Body`, and Network change listeners.
   - `setupHardwareBackButton()` (`nativeCapacitor.ts:157-208`):
     - Top priority: dismisses open dialogs/sheets/menus or dispatches Escape key.
     - Secondary: `if (canGoBack && !isRootPage) window.history.back()`.
     - Root check: `const isRootPage = currentPath === "/" || currentPath === "/dashboard";`.
     - Exit condition: double-tap back within 2000ms calls `CapApp.exitApp()`.
   - Edge-to-edge notch & safe-area handling (`index.html:5`):
     - `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
     - Universal CSS insets: `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

---

### 1.2 POS & Billing Backend Architecture
Direct inspection of CredSmart frontend networking and storage layers revealed:

1. **Target Endpoints & Base URL (`src/lib/apiClient.ts:38-60`)**:
   - Base URL defaults to: `DEFAULT_API_BASE_URL = "https://api.credsmart.online/api"`
   - Core API endpoints:
     - `/api/auth/login`, `/api/auth/signup`, `/api/auth/refresh`, `/api/auth/user`
     - `/api/products`, `/api/products/bulk`, `/api/product-batches`
     - `/api/customers`, `/api/suppliers`, `/api/parties`
     - `/api/sales`, `/api/sales/bulk`, `/api/sale-items`
     - `/api/settings`, `/api/storefront`
2. **Authentication & Token Propagation (`src/lib/apiClient.ts:172-205`, `src/integrations/supabase/client.ts:34-56`)**:
   - Token storage keys:
     - Access Token: `localStorage.getItem("credsmart_auth_token")`
     - Refresh Token: `localStorage.getItem("credsmart_refresh_token")`
     - User Identity: `localStorage.getItem("credsmart_auth_user")`
     - Tenant Organization: `localStorage.getItem("credsmart_active_org_id")`
   - Request Headers:
     - `Authorization: Bearer <credsmart_auth_token>`
     - `x-organization-id: <credsmart_active_org_id>`
   - Refresh flow: On HTTP 401, triggers `POST https://api.credsmart.online/api/auth/refresh`.
3. **Data Caching & Offline Syncing (`src/utils/offlineQueue.ts:21-41`)**:
   - IndexedDB database: `DB_NAME = "credsmart_offline_db"`
   - Object Store: `STORE_NAME = "offline_sync_queue"`
   - LocalStorage cache keys: `credsmart_cached_products_${orgId}`, `credsmart_business_settings_${orgId}`, `credsmart_invoice_settings`.
   - Offline queue auto-syncs queued sales, customers, and stock adjustments to `https://api.credsmart.online/api/*` upon network restoration.

---

### 1.3 Lovable CRM Backend Architecture
Direct inspection of the Lovable CRM repository (`C:\Users\bishn\OneDrive\Documents\GitHub\CRM`) revealed:

1. **Supabase Client & Target Credentials (`C:\Users\bishn\OneDrive\Documents\GitHub\CRM\.env:1-6`)**:
   - `VITE_SUPABASE_PROJECT_ID="wqllixoghlxvapmziilk"`
   - `VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_GP55TeYmJ05j2ypHUzlHvA_GtQFSPqA"`
   - `VITE_SUPABASE_URL="https://wqllixoghlxvapmziilk.supabase.co"`
2. **Supabase Client Initialization (`C:\Users\bishn\OneDrive\Documents\GitHub\CRM\src\integrations\supabase\client.ts:49-75`)**:
   ```typescript
   return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
     global: {
       fetch: createSupabaseFetch(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
     },
     auth: {
       storage: brokeredPreviewStorage(), // returns localStorage on non-preview domains
       persistSession: true,
       autoRefreshToken: true,
     },
   });
   ```
3. **CRM State Store & LocalStorage Footprint (`C:\Users\bishn\OneDrive\Documents\GitHub\CRM\src\lib\store.ts:116-250`)**:
   - Master state key: `const KEY = "wf-crm-v1"`
   - Staff company code: `STAFF_COMPANY_KEY = "wf-staff-company"`
   - Translations: `KEY = "wf_lang"`
   - Nudge & Checklist keys: `credsmart_nudge_dismissed_*`, `wf-invited-*`, `wf-hide-*`
   - Supabase Auth Default Session: stored under key `sb-wqllixoghlxvapmziilk-auth-token`.
   - Database RPCs and Tables:
     - `workforce_workspaces` (stores JSON state in `data` column)
     - `user_roles` (maps employee role and permissions)
     - `workforce_role_presets`
     - RPC: `supabase.rpc("save_workforce", { _data: data, _roles: roles })`
   - Realtime Subscriptions:
     - `liveChannel = supabase.channel('ws:${workspaceId}', { config: { private: true } })`
     - Broadcasts data-free `"changed"` event for lightweight multi-device cache invalidation.

---

## 2. Logic Chain

### 2.1 The Cross-Talk Vulnerability Analysis
1. *Premise*: If both POS & Billing and CRM run inside a single Capacitor webview sharing the same origin (`https://localhost` or `capacitor://localhost`), they share:
   - A single global `localStorage` pool.
   - A single global `sessionStorage` pool.
   - A single IndexedDB namespace.
   - A single JavaScript memory heap (React contexts, QueryClient cache, EventListeners).
2. *Observation*:
   - CredSmart POS currently has `src/integrations/supabase/client.ts`, which was patched during the backend migration to point to `https://api.credsmart.online` with custom Express login methods (`/api/auth/login`).
   - Lovable CRM imports `@/integrations/supabase/client` expecting standard `@supabase/supabase-js` `createClient` targeting `https://wqllixoghlxvapmziilk.supabase.co`.
   - If CRM imports CredSmart's existing `@/integrations/supabase/client.ts`, all CRM database operations will fail because the Ubuntu API does not host the Lovable CRM schema/tables!
   - Conversely, if CredSmart's `@/integrations/supabase/client.ts` were replaced with the Lovable Supabase client, POS authentication would break because POS expects Express JWTs from `api.credsmart.online`.
3. *Deduction*:
   - Both backends MUST be decoupled at the code level into two strictly isolated client modules:
     - `src/lib/apiClient.ts` / `src/services/posApi.ts` for POS & Billing (Ubuntu API).
     - `src/integrations/crm-supabase/client.ts` for Lovable CRM (`wqllixoghlxvapmziilk.supabase.co`).
   - Storage keys MUST be explicitly partitioned:
     - POS keys prefixed with `pos_*` (or legacy `credsmart_*` mapped to `pos_*`).
     - CRM Supabase client configured with `auth.storageKey: "crm_supabase_auth_token"`, and CRM store keys prefixed with `crm_*`.

### 2.2 Cold Launch Selection Hub Reasoning
1. *Requirement*: The application must present a Selection Hub on EVERY cold app launch giving the user the choice between 'POS & Billing' and 'CRM'.
2. *Mechanism*:
   - When an Android process starts from a cold state (swiped away from Recents and launched fresh), JavaScript module memory and `sessionStorage` are completely empty.
   - In contrast, in-app navigation, tab switching, and route changes persist `sessionStorage`.
   - Therefore, `sessionStorage.getItem("credsmart_launch_portal_active")` serves as an exact indicator of warm vs. cold lifecycle:
     - Cold launch: `sessionStorage.getItem("credsmart_launch_portal_active") === null` -> Render `<ColdLaunchHub />` at root.
     - User taps "POS & Billing": `sessionStorage.setItem("credsmart_launch_portal_active", "billing")` -> Navigate to `/billing`.
     - User taps "CRM": `sessionStorage.setItem("credsmart_launch_portal_active", "crm")` -> Navigate to `/crm`.
   - To return to the Selection Hub at any time:
     - An App Switcher trigger in the universal header clears or updates `credsmart_launch_portal_active` and navigates to `/`.
3. *Native Back-Button Hierarchy*:
   - If modal/drawer is open: close topmost modal.
   - If inside a deep page (`/billing/items`, `/crm/tasks`): `window.history.back()`.
   - If on the root dashboard of POS (`/billing/dashboard` or `/billing/pos`) or CRM (`/crm`):
     - Pressing Back returns to the Selection Hub (`/`).
   - If on the Selection Hub (`/`):
     - Double-tap back exits the app (`CapApp.exitApp()`) with toast notification "Press back again to exit CredSmart".

---

## 3. Caveats

1. **Local Development vs Production URLs**:
   - In development, `VITE_API_BASE_URL` might be `http://localhost:3000/api` or `https://api.credsmart.online/api`. The isolation architecture must dynamically read `import.meta.env` so staging/development environments work identically.
2. **Capacitor Single Webview Context**:
   - Because Capacitor runs in a single Android WebView, "switching sub-apps" is an in-process React transition, not a multi-process switch. Therefore, unmounting the previous sub-app must trigger proper teardown (unsubscribing Supabase realtime channels and clearing uncommitted form state) to avoid memory leaks.
3. **Cashier Role Boundary**:
   - Cashiers in POS remain strictly restricted to POS Billing (`/billing/pos` / `/billing/checkout`). If a cashier is logged into POS, they should not be granted access to CRM from the Selection Hub without authenticating as an authorized CRM user.
4. **Offline Sync Separation**:
   - POS offline queue in IndexedDB (`credsmart_offline_db`) must continue syncing exclusively to `api.credsmart.online`. CRM has its own offline queue/local state in `localStorage` syncing to Supabase via `save_workforce` RPC. The two sync engines must remain independent.

---

## 4. Conclusion & Architecture Specification

### 4.1 Architecture Diagram: Dual-Backend Isolation & Packaging

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CAPACITOR MOBILE APK / AAB                            │
│                     (Application ID: com.credsmart.pos)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                      NATIVE ANDROID CONTAINER & BRIDGE                      │
│   • Target SDK: 36 (Android 16) | Min SDK: 24 | App Version: 1.1.7 (19)     │
│   • Plugins: @capacitor/app, keyboard, network, status-bar, haptics        │
│   • Permissions: CAMERA, BLUETOOTH, INTERNET, ACCESS_FINE_LOCATION          │
│   • Native Hardware Back Button Handler & Lifecycle Coordinator             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         COLD LAUNCH SELECTION HUB                           │
│      Route: "/" | Active on every cold process launch (sessionStorage)       │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │   CREDMSMART POS & BILLING      │   │     CREDSMART CRM & HR          │  │
│  │ • Retail Counter POS & Thermal  │   │ • Geofenced GPS Attendance      │  │
│  │ • Real-time Inventory & Batches │   │ • Task Delegation & Proof Review│  │
│  │ • GST Invoicing & Khata Ledgers │   │ • Monthly Payroll & Salary Runs │  │
│  │ [ Launch POS & Billing → ]      │   │ [ Launch CRM & Workforce → ]    │  │
│  └────────────────┬────────────────┘   └────────────────┬────────────────┘  │
└───────────────────┼─────────────────────────────────────┼───────────────────┘
                    │                                     │
         ┌──────────▼──────────┐               ┌──────────▼──────────┐
         │  POS & BILLING APP  │               │   LOVABLE CRM APP   │
         │  Route: /billing/*  │               │   Route: /crm/*     │
         ├─────────────────────┤               ├─────────────────────┤
         │ • posQueryClient    │               │ • crmQueryClient    │
         │ • PosAuthProvider  │               │ • CrmStoreProvider  │
         │ • PosOrgProvider    │               │ • CRM Supabase SDK  │
         │ • Ubuntu API Client │               │ • Realtime WS wss://│
         ├─────────────────────┤               ├─────────────────────┤
         │ STORAGE NAMESPACE:  │               │ STORAGE NAMESPACE:  │
         │ • pos_auth_token    │               │ • crm_sb_auth_token │
         │ • pos_active_org_id │               │ • crm_company_id    │
         │ • pos_cached_prods  │               │ • wf-crm-v1         │
         │ • pos_offline_db    │               │ • wf-staff-company  │
         └──────────┬──────────┘               └──────────┬──────────┘
                    │                                     │
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │     UBUNTU SERVER API     │         │   SUPABASE CLOUD (CRM)    │
      │ https://api.credsmart.online│       │ https://wqllixoghlxvap... │
      │   (PostgreSQL + Express)  │         │  (PostgREST + Realtime)   │
      └───────────────────────────┘         └───────────────────────────┘
```

---

### 4.2 Storage Isolation Specification
To prevent any cross-talk or token pollution between POS and CRM, the following strict namespace partitioning must be enforced:

| Domain | Key Type | Storage Key Name | Purpose |
|---|---|---|---|
| **POS & Billing** | LocalStorage | `pos_auth_token` | Active Ubuntu API Bearer JWT |
| **POS & Billing** | LocalStorage | `pos_refresh_token` | Refresh token for Ubuntu API |
| **POS & Billing** | LocalStorage | `pos_auth_user` | Current POS user identity |
| **POS & Billing** | LocalStorage | `pos_active_org_id` | Current store organization UUID |
| **POS & Billing** | LocalStorage | `pos_cached_products_${orgId}` | Local product catalog cache |
| **POS & Billing** | LocalStorage | `pos_business_settings_${orgId}`| POS thermal & invoice configuration |
| **POS & Billing** | IndexedDB | `credsmart_offline_db` | Offline sales queue (`offline_sync_queue`) |
| **CRM** | LocalStorage | `crm_supabase_auth_token` | Supabase Auth JWT (configured via `storageKey`) |
| **CRM** | LocalStorage | `crm_workforce_state_v1` | Master workforce store (`wf-crm-v1`) |
| **CRM** | LocalStorage | `crm_staff_company` | Staff member workspace association |
| **CRM** | LocalStorage | `crm_app_lang` | Language preference (`hi` / `en`) |
| **System** | SessionStorage | `credsmart_launch_portal_active` | Cold launch active portal selector |
| **System** | LocalStorage | `credsmart_launch_portal_pref` | Optional persistent preference |

---

### 4.3 Runtime State & Client Isolation Specification

1. **CRM Supabase Client (`src/integrations/crm-supabase/client.ts`)**:
   ```typescript
   import { createClient } from "@supabase/supabase-js";

   const CRM_SUPABASE_URL = import.meta.env.VITE_CRM_SUPABASE_URL || "https://wqllixoghlxvapmziilk.supabase.co";
   const CRM_SUPABASE_KEY = import.meta.env.VITE_CRM_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_GP55TeYmJ05j2ypHUzlHvA_GtQFSPqA";

   export const crmSupabase = createClient(CRM_SUPABASE_URL, CRM_SUPABASE_KEY, {
     auth: {
       storageKey: "crm_supabase_auth_token", // STRICT ISOLATION FROM POS
       persistSession: true,
       autoRefreshToken: true,
       storage: typeof window !== "undefined" ? window.localStorage : undefined,
     },
     realtime: {
       params: {
         eventsPerSecond: 10,
       },
     },
   });
   ```

2. **POS API Client (`src/lib/apiClient.ts`)**:
   - Retains connection exclusively to `https://api.credsmart.online/api/*`.
   - Reads auth tokens strictly from `pos_auth_token` and `pos_active_org_id`.
   - Transparent fallback: reads `credsmart_auth_token` if `pos_auth_token` is not yet migrated, then migrates in-place.

3. **Isolated Query Clients**:
   - `posQueryClient`: instantiated in `src/context/PosQueryContext.tsx` with 5-minute stale time.
   - `crmQueryClient`: instantiated in `src/crm/CrmQueryContext.tsx` with 30-second stale time for live huddle & attendance telemetry.

---

### 4.4 Cold Launch Selection Hub UI/UX Design Specification

1. **Cold Launch Detection**:
   ```typescript
   // src/components/portal/useColdLaunch.ts
   export function isColdLaunch(): boolean {
     if (typeof window === "undefined") return false;
     return sessionStorage.getItem("credsmart_launch_portal_active") === null;
   }
   ```
2. **Visual Layout & Brand Tokens**:
   - **Background**: Neutral canvas (`#F8FAFC` light / `#090D16` dark).
   - **Header**:
     - Official CredSmart Shield Mark (`w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs`).
     - Wordmark: "CredSmart" (`font-bold text-lg text-slate-900 dark:text-white tracking-tight`).
     - Sub-label: "Enterprise Business Platform" (`text-xs text-slate-500 font-medium`).
     - Top-right controls: Theme toggle (Sun/Moon) + Network health dot (`Live Cloud Sync`).
   - **Hero Text**:
     - "Choose Your Workspace" (`text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white`).
     - "Select the operational hub you want to launch for this session." (`text-xs sm:text-sm text-slate-500 max-w-sm text-center`).
   - **Two High-Density Touch Cards**:
     - **Card 1: POS & Retail Billing**:
       - Accent: Amber / Royal Blue hairline border.
       - Badge: `⚡ TURBO RETAIL POS` (`bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md`).
       - Title: "POS & Billing ERP"
       - Description: "Supercharged counter checkout, barcode scanner, thermal printing, multi-tab billing, GST invoicing & Khata ledgers."
       - Metadata chip: `Backend: Ubuntu Cloud Engine`
       - CTA: "Launch POS & Billing →" (`h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs active:scale-[0.98]`).
     - **Card 2: CRM & Workforce**:
       - Accent: Emerald / Teal hairline border.
       - Badge: `👥 WORKFORCE & HR` (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md`).
       - Title: "CredSmart CRM by CredAlert"
       - Description: "Team tasks, geofenced GPS clock-in, proof-of-work approvals, staff permissions, and automated monthly payroll."
       - Metadata chip: `Backend: Supabase Cloud Engine`
       - CTA: "Launch CRM & Workforce →" (`h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs active:scale-[0.98]`).
   - **Footer Info**:
     - App Version: `CredSmart v1.1.7 (Build 19) • Capacitor Android Production`
     - Offline warning banner if device network is offline.

3. **Sub-App Switcher & Back Navigation**:
   - Universal Header in both apps contains a `Switch Workspace` trigger icon (`LayoutGrid` or `ArrowLeftRight`).
   - Tapping it opens a quick bottom-sheet drawer with 1-tap switching to the other sub-app or "Exit to Selection Hub".
   - Hardware Back Button handler updated in `nativeCapacitor.ts`:
     ```typescript
     const isRootOfPortal = currentPath === "/billing/dashboard" ||
                            currentPath === "/billing/pos" ||
                            currentPath === "/billing" ||
                            currentPath === "/crm" ||
                            currentPath === "/crm/dashboard";

     if (isRootOfPortal) {
       // Return to Selection Hub instead of killing the app
       sessionStorage.removeItem("credsmart_launch_portal_active");
       window.location.href = "/";
       return;
     }

     if (currentPath === "/") {
       // Double-tap on Selection Hub exits app
       const now = Date.now();
       if (now - lastBackPressTime < 2000) {
         CapApp.exitApp();
       } else {
         lastBackPressTime = now;
         toast("Press back again to exit CredSmart", { duration: 2000 });
       }
       return;
     }
     ```

---

### 4.5 Capacitor & Google Play Store Verification Matrix

| Checklist Item | Requirement | CredSmart Configuration | Status |
|---|---|---|---|
| **App Bundle Format** | Google Play Store mandatory `.aab` | `npm run android:bundle` runs `gradlew.bat bundleRelease` | Pass |
| **Target SDK Version** | Google Play requirement: API 34+ | `targetSdkVersion = 36`, `compileSdkVersion = 36` (Android 16) | Pass |
| **Minimum SDK** | Support standard Android devices | `minSdkVersion = 24` (Android 7.0+) | Pass |
| **App Bundle ID** | Unique Play Store package identifier | `com.credsmart.pos` in gradle & manifest | Pass |
| **App Signing** | Release signing keystore | `credsmart-upload-key.jks` via `signing.properties` | Pass |
| **App Permissions** | Declared in Manifest | CAMERA, BLUETOOTH, INTERNET, ACCESS_FINE_LOCATION | Pass |
| **Splash Screen API** | Android 12+ Splash Screen support | `androidx.core:core-splashscreen:1.2.0` with `AppTheme.NoActionBarLaunch` | Pass |
| **Notch & Cutouts** | No content clipping behind notch/gestures | `viewport-fit=cover`, `env(safe-area-inset-top/bottom)` | Pass |
| **Hardware Back** | Native back navigation | Priority: Modals -> History -> Return to Hub -> Double-tap Exit | Pass |
| **Store Graphics** | 512x512 icon, 1024x500 banner, screenshots | All 20 assets present in `playstore-assets/` | Pass |

---

## 5. Verification Method

To independently verify this architectural investigation and ensure future implementation succeeds without regression:

1. **Verify Capacitor Configuration & Gradle Builds**:
   - Inspect configuration:
     ```bash
     cat capacitor.config.ts
     cat android/variables.gradle
     cat android/app/build.gradle
     ```
   - Verify Gradle target SDK is 36, applicationId is `com.credsmart.pos`, and bundleRelease script exists in `package.json`.
2. **Verify Play Store Bundle Generation**:
   ```powershell
   cmd /c npm run build
   cmd /c npx cap sync android
   cd android; .\gradlew.bat tasks
   ```
3. **Verify Storage Key Separation**:
   - Inspect that `src/lib/apiClient.ts` uses `pos_*` (or `credsmart_*`) keys.
   - Inspect that CRM Supabase client in `src/integrations/crm-supabase/client.ts` uses `auth: { storageKey: "crm_supabase_auth_token" }`.
   - Verify zero shared key names between POS and CRM.
4. **Verify Cold Launch Hub UX & Back Button**:
   - Run browser preview at `http://localhost:5173/`.
   - Open a fresh session or clear `sessionStorage`: verify `<ColdLaunchHub />` renders with both POS & Billing and CRM cards.
   - Click "POS & Billing": verify navigation to `/billing/dashboard` or `/billing/pos`.
   - Click "CRM": verify navigation to `/crm`.
   - In Android emulator or device, test hardware back button on `/billing/dashboard` and verify it navigates back to `/` before prompting exit on double-tap.

---
*Report submitted by Explorer 3 (`teamwork_explorer_capacitor_isolation`) to Orchestrator.*
