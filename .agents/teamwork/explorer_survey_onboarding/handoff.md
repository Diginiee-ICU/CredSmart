# Comprehensive Investigation & Architectural Handoff Report: Dual-Portal Decoupling (Billing vs CRM) — Survey, Onboarding & Routing

**Agent Archetype**: Explorer (`explorer_survey_onboarding`)  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_onboarding`  
**Timestamp**: 2026-10-23T22:20:00Z  
**Authoritative Reference**: `ORIGINAL_REQUEST.md` (timestamp `2026-10-23T21:58:59Z`)  

---

## 1. Observation

### 1.1 Authentication & Routing Entry Points (`src/pages/Auth.tsx`, `src/App.tsx`, `src/hooks/useAuth.tsx`)
- **Single Auth Surface**: There is no standalone `src/pages/Login.tsx`. All authentication (login, multi-step signup, password reset) is unified in `src/pages/Auth.tsx` (828 lines).
- **Post-Login Routing in `Auth.tsx` (lines 108–114)**:
  ```typescript
  // Check role to direct to proper landing surface
  const { data: memberships } = await settingsApi.getMemberships(undefined, data.user.id);
  const membership = memberships && memberships.length > 0 ? memberships[0] : null;

  const targetRoute = membership?.role === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
  navigate(targetRoute);
  ```
  Post-login routing currently hardcodes a binary choice: cashier goes to `ROUTE_PATHS.checkout` (`/checkout`), and all other roles go to `ROUTE_PATHS.dashboard` (`/dashboard`).
- **Post-Signup Routing in `Auth.tsx` (lines 411–417)**:
  ```typescript
  const logoUrl = await uploadLogo(data.user.id);
  await completePendingOnboarding(data.user.id, logoUrl);
  await refreshOrganization();
  navigate(ROUTE_PATHS.dashboard);
  ```
  Newly signed up accounts unconditionally navigate to `ROUTE_PATHS.dashboard`.
- **`AuthRoute` in `src/App.tsx` (lines 144–158)**:
  ```typescript
  function AuthRoute() {
    const { user, loading } = useAuth();
    const { userRole } = useOrganization();

    if (loading) {
      return <SleekRouteLoader />;
    }

    if (user) {
      const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
      return <Navigate to={dest} replace />;
    }

    return <Auth />;
  }
  ```
- **`HomeRoute` in `src/App.tsx` (lines 160–180)**:
  ```typescript
  function HomeRoute() {
    const { user, loading } = useAuth();
    const { userRole } = useOrganization();

    if (loading) {
      return <SleekRouteLoader />;
    }

    if (user) {
      const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
      return <Navigate to={dest} replace />;
    }

    // Inside Native Mobile App (Capacitor/Android APK/AAB) or mobile app mode:
    // Render Mobile App Starting Cards onboarding tour directly
    if (isNativePlatform() || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)) {
      return <MobileAppStartingCards />;
    }

    return <Landing />;
  }
  ```
- **Route `/app`**: Does NOT currently exist in `src/App.tsx` or `src/config/routes.ts`. Authenticated users visiting `/app` currently hit the catch-all `<Route path="*" element={<NotFound />} />` (line 291).
- **Static Test Guard on Route Protection in `src/test/crmShellRoutes.test.ts` (lines 298–322)**:
  ```typescript
  it("statically verifies that ProtectedRoutes and RoleProtectedRoute redirect unauthenticated users to ROUTE_PATHS.auth", () => {
    const appTsxPath = path.resolve(__dirname, "../App.tsx");
    const appSource = fs.readFileSync(appTsxPath, "utf-8");

    // Verify ProtectedRoutes definition
    expect(appSource).toMatch(/function\s+ProtectedRoutes\(\)/);
    // Verify redirect target in ProtectedRoutes
    expect(appSource).toMatch(
      /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
    );

    // Verify RoleProtectedRoute definition
    expect(appSource).toMatch(/function\s+RoleProtectedRoute/);
    // Verify redirect target in RoleProtectedRoute
    expect(appSource).toMatch(
      /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
    );

    // Verify CRM routes are registered under ProtectedRoutes
    expect(appSource).toContain("<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />");
    expect(appSource).toContain("<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />");
    expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");
  });
  ```
  **CRITICAL FINDING**: `src/App.tsx` MUST preserve the exact regex patterns `function ProtectedRoutes()` and `function RoleProtectedRoute()` with verbatim `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` and must keep `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />` registered, otherwise `crmShellRoutes.test.ts` will immediately fail!

---

### 1.2 Organization Setup & Onboarding Pipeline (`src/hooks/useOrganization.tsx`, `src/pages/Auth.tsx`)
- **Pending Onboarding Storage Contract**:
  - Constant: `PENDING_ONBOARDING_KEY = "credsmart_pending_onboarding_v1"` (with legacy fallback `"nexis_pending_onboarding_v1"`).
  - Storage format: `{ __savedAt: number, payload: PendingOnboardingData }` with a 24-hour TTL (`PENDING_ONBOARDING_TTL_MS = 24 * 60 * 60 * 1000`).
  - Stored in `localStorage` prior to email verification or session issuance.
- **`PendingOnboardingData` Interface (`src/hooks/useOrganization.tsx:63–87`)**:
  ```typescript
  export interface PendingOnboardingData {
    email: string;
    storeName: string;
    businessType: string;
    storeAddress: string;
    storePhone: string;
    storeEmail: string;
    gstin: string;
    pan: string;
    taxRate: number;
    invoicePrefix: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
    upiId?: string;
    scrapedProducts: Array<{ ... }>;
  }
  ```
- **Organization Creation Pipeline (`completePendingOnboarding` & `provisionOrganization`)**:
  1. Checks if membership already exists for `userId` (`settingsApi.getMemberships`).
  2. If not, attempts RPC `bootstrap_organization`, and falls back to `settingsApi.createOrganization` with an auto-generated UUID.
  3. Automatically upserts membership with `role: "store_owner"`.
  4. Saves to local registry `credsmart_org_registry_${userId}` and local business settings `credsmart_business_settings_${orgId}`.
  5. Seeds starter inventory using `seedOrgProducts(orgId, payload)` based on `businessType`.
  6. Clears pending onboarding via `clearPendingOnboarding()`.
  7. Activates organization via `localStorage.setItem(ACTIVE_ORG_KEY, orgId)`.
- **Existing Multi-Step Signup in `Auth.tsx`**:
  - `step === 1`: Full Name, Email, Phone, Password (`min 6 chars`).
  - `step === 2`: Store Name, Business Type (grid of 8 choices), Store Address, Store Phone, Store Email, Store Logo upload, Website product scraping.
  - `step === 3`: GSTIN, PAN, Bank Name, Account Number, IFSC, Account Holder, UPI ID, Tax Rate, Invoice Prefix.
  - Currently missing: Choice of Suite Preference ("POS & Billing" vs "CRM" vs "Both").

---

### 1.3 Role-Based Restrictions & Cashier Boundary (`src/config/routes.ts`)
- **Cashier Restriction Set (`RESTRICTED_ROUTES_FOR_CASHIER` in `src/config/routes.ts:132–154`)**:
  - Strictly includes:
    `ROUTE_PATHS.dashboard`, `ROUTE_PATHS.crm`, `ROUTE_PATHS.crmRoles`, `ROUTE_PATHS.purchases`, `ROUTE_PATHS.settings`, `ROUTE_PATHS.staff`, `ROUTE_PATHS.reports`, etc.
  - Cashiers are strictly permitted ONLY on: `ROUTE_PATHS.checkout` (`/checkout`), `ROUTE_PATHS.pos` (`/pos`), `ROUTE_PATHS.parties`, `ROUTE_PATHS.items`, `ROUTE_PATHS.inventory`, `ROUTE_PATHS.sales`, `ROUTE_PATHS.customers`.
  - Cashiers MUST NEVER be redirected or routed into CRM or admin Dashboard.

---

### 1.4 Protected Billing Files & Automated Integrity Checks
- **The 5 Protected Invoicing Files**:
  1. `src/components/invoices/mobile/MobileCreateInvoice.tsx` (27,280 bytes)
  2. `src/components/SalesInvoiceModal.tsx` (90,000+ bytes)
  3. `src/components/invoices/mobile/AddItemModal.tsx` (4,444 bytes)
  4. `src/components/invoices/mobile/SelectPartyModal.tsx` (12,041 bytes)
  5. `src/components/invoices/mobile/EditItemModal.tsx` (13,591 bytes)
- **Forensic Oracle Guard in `src/test/crmChallengerM1_2.test.ts:306–324`**:
  ```typescript
  describe("5. Strict Invoicing Flow Preservation Oracle", () => {
    const protectedFiles = [
      "src/components/invoices/mobile/MobileCreateInvoice.tsx",
      "src/components/SalesInvoiceModal.tsx",
      "src/components/invoices/mobile/AddItemModal.tsx",
      "src/components/invoices/mobile/SelectPartyModal.tsx",
      "src/components/invoices/mobile/EditItemModal.tsx",
    ];

    it("verifies all 5 protected invoice files exist and are intact", () => {
      for (const relativePath of protectedFiles) {
        const fullPath = path.resolve(process.cwd(), relativePath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size).toBeGreaterThan(1000);
      }
    });
  });
  ```
  Verified via test execution: `crmChallengerM1_2.test.ts` passes 11/11 tests. These 5 files are strictly protected by automated tests.

---

### 1.5 Verification Infrastructure & Tool Execution Results
- **TypeScript Compiler**:
  - Command: `node node_modules/typescript/bin/tsc --noEmit`
  - Output: Exit Code `0`. 0 errors, 0 warnings.
- **Production Build**:
  - Command: `node node_modules/vite/bin/vite.js build`
  - Output: Exit Code `0`. Built in `2m 5s`. Generates `dist/index.html` (7.89 kB), `dist/assets/index-CA6Z-fuD.css` (281.64 kB), `dist/assets/index-DxUsETmh.js` (4,796.67 kB).
- **Vitest Test Suite Runs**:
  - `src/test/crmShellNavigation.audit.test.ts`: Passed (8/8 tests, 166ms).
  - `src/test/crmShellRoutes.test.ts`: Passed (22/22 tests, 1329ms).
  - `src/test/crmChallengerM1_2.test.ts`: Passed (11/11 tests, 263ms).
  - `src/test/billingLifecycleEngine.test.ts`: Passed (17/17 tests, 53ms).

---

## 2. Logic Chain

```
[Observation 1.1: Post-login navigation hardcodes cashier -> /checkout, others -> /dashboard]
  + [Observation 1.1: AuthRoute & HomeRoute repeat this exact binary redirect]
  + [Authoritative Requirement R3: Business owners designate suite preference ("POS & Billing" vs "CRM" vs "Both")]
  + [Authoritative Requirement R2: Suite Switcher persists state in 'credsmart_active_suite']
  └──> LOGIC STEP 1: Post-login and entry routing must transition from static /dashboard to an intelligent Resolver function (`resolveEntryRoute(role, activeSuite, suitePreference)`).

[Observation 1.3: RESTRICTED_ROUTES_FOR_CASHIER blocks cashiers from CRM & Dashboard]
  + [Observation 1.1: Cashiers can only access /checkout, /pos, /sales, etc.]
  └──> LOGIC STEP 2: The entry route resolver MUST evaluate role first:
       If role === "cashier", the target MUST ALWAYS be /checkout (or /billing/checkout). No suite preference or switcher state can override this security constraint.

[Observation 1.1: Root '/' renders HomeRoute, and '/app' currently 404s]
  + [Authoritative Requirement R3: Authenticated users entering '/' or '/app' are routed to preferred or last-active suite]
  + [Authoritative Requirement R3: Deep links must be preserved]
  └──> LOGIC STEP 3:
       - Add `<Route path="/app" element={<HomeRoute />} />` to `App.tsx`.
       - In `HomeRoute`, if `user` is authenticated:
         * Check `credsmart_active_suite` in localStorage (values: "crm" | "billing").
         * If active suite is "crm" -> return `<Navigate to={ROUTE_PATHS.crm} replace />`
         * If active suite is "billing" (or not set) -> return `<Navigate to={ROUTE_PATHS.dashboard} replace />` (or `/billing`).
       - If a user navigates directly to a deep link (e.g. `/crm/attendance` or `/billing/sales`), React Router directly matches the deep link route; `HomeRoute` is never invoked, preserving deep links natively.
       - If an unauthenticated user opens a deep link, they are redirected to `/auth`. Passing `state: { from: location.pathname }` allows `handleLogin` to redirect back to `location.state.from` if present, fulfilling 100% deep link fidelity.

[Observation 1.2: Signup uses 3 steps and persists PendingOnboardingData in localStorage]
  + [Authoritative Requirement R3: Onboarding includes suite selection preference for new organizations]
  └──> LOGIC STEP 4:
       - Add `suitePreference: "billing" | "crm" | "both"` to `PendingOnboardingData` in `useOrganization.tsx`.
       - In `Auth.tsx`, introduce a high-impact Suite Selection selector (e.g. in Step 2 Store Setup, or as Step 3 before invoicing):
         1. "POS & Billing" (Primary focus: billing, retail counter, barcode, inventory)
         2. "CRM" (Primary focus: staff attendance, tasks, salary/payroll, role permissions)
         3. "Both / All-in-One" (Full enterprise suite)
       - Default to "billing" or "both" if unselected.
       - On onboarding completion (`completePendingOnboarding`):
         * Store preference in `localStorage.setItem("credsmart_suite_preference", payload.suitePreference || "both")`.
         * Set initial active suite: `localStorage.setItem("credsmart_active_suite", payload.suitePreference === "crm" ? "crm" : "billing")`.
         * Navigate user to `payload.suitePreference === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard`.

[Observation 1.1: crmShellRoutes.test.ts statically verifies App.tsx code structure via regex]
  + [Observation 1.4: crmChallengerM1_2.test.ts strictly verifies 5 invoice files exist and are intact]
  └──> LOGIC STEP 5:
       - In `App.tsx`, `ProtectedRoutes` and `RoleProtectedRoute` MUST NOT be rewritten or refactored into anonymous functions or external files; their exact function signatures and inner text must be retained.
       - `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />` must remain present under ProtectedRoutes.
       - None of the 5 protected billing files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) may be modified.
```

---

## 3. Caveats

1. **No Backend DB Migration Needed for Suite Preference**:
   The current architecture runs in full frontend-API decoupled mode (`settingsApi.ts` calling `https://api.credsmart.online/api/*` and falling back to `localStorage`). `organizations` table columns are managed dynamically and cached in `localStorage` (`credsmart_business_settings_${orgId}`). Suite preference can be safely persisted in `localStorage` under `credsmart_suite_preference` and `credsmart_active_suite`, and saved in `businessSettings` object without requiring a backend schema migration that could fail with 500 errors.
2. **Backward Compatibility for Legacy Routes**:
   Per Requirement R1, routes like `/sales`, `/pos`, `/items`, `/dashboard` must continue to function (either as direct routes or seamless `<Navigate to="..." replace />` redirects) so that existing bookmarks, tests, and deep links never break.
3. **Desktop & Mobile Consistency**:
   The Suite Switcher must be accessible on both desktop headers and mobile headers/drawers so users can toggle between POS & Billing and CRM at any time.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Onboarding Suite Preference Design
1. **Type Definitions** (`src/hooks/useOrganization.tsx`):
   - Define type: `export type SuitePreference = "billing" | "crm" | "both";`
   - Extend `PendingOnboardingData`:
     ```typescript
     export interface PendingOnboardingData {
       // ... existing fields ...
       suitePreference?: SuitePreference;
     }
     ```
   - Export constants:
     - `ACTIVE_SUITE_KEY = "credsmart_active_suite";`
     - `SUITE_PREFERENCE_KEY = "credsmart_suite_preference";`
   - Helper function:
     ```typescript
     export function getActiveSuite(): "billing" | "crm" {
       const saved = localStorage.getItem(ACTIVE_SUITE_KEY);
       if (saved === "crm" || saved === "billing") return saved;
       const pref = localStorage.getItem(SUITE_PREFERENCE_KEY);
       if (pref === "crm") return "crm";
       return "billing";
     }
     ```
2. **UI Implementation in `src/pages/Auth.tsx`**:
   - In Step 2 (Store Details), below Business Type, render a sleek 3-card suite selector:
     * Card 1: **POS & Billing** (Icon: `Monitor` or `ShoppingCart`, Description: "Retail billing, barcodes, GST invoices, inventory & vendor purchases")
     * Card 2: **CredSmart CRM** (Icon: `Briefcase` or `Users`, Description: "Staff attendance, GPS geofencing, tasks, payroll & custom roles")
     * Card 3: **Complete Suite (Both)** (Icon: `Sparkles`, Badge: "Recommended", Description: "All-in-one unified ERP, Billing & Team Management")
   - Include `suitePreference` in `buildPendingOnboardingPayload()`.
   - In `completePendingOnboarding`:
     * Set `localStorage.setItem(SUITE_PREFERENCE_KEY, payload.suitePreference || "both")`.
     * Set `localStorage.setItem(ACTIVE_SUITE_KEY, payload.suitePreference === "crm" ? "crm" : "billing")`.
     * Target route on signup: `payload.suitePreference === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard`.

### 4.2 Post-Login & Entry Routing Architecture
1. **Entry Resolver Utility (`src/utils/entryRouting.ts`)**:
   ```typescript
   export function resolvePostLoginRoute(
     role: string | null | undefined,
     deepLink?: string | null
   ): string {
     // 1. Deep link takes highest priority (if valid and not auth/landing)
     if (deepLink && deepLink !== "/" && deepLink !== "/auth" && deepLink !== "/app") {
       return deepLink;
     }

     // 2. Cashier restriction is absolute
     if (role === "cashier") {
       return ROUTE_PATHS.checkout;
     }

     // 3. Last-active or preferred suite
     const activeSuite = localStorage.getItem("credsmart_active_suite");
     if (activeSuite === "crm") {
       return ROUTE_PATHS.crm;
     }

     return ROUTE_PATHS.dashboard;
   }
   ```
2. **`HomeRoute` & `AuthRoute` in `src/App.tsx`**:
   - In `HomeRoute`:
     ```typescript
     if (user) {
       const dest = resolvePostLoginRoute(userRole);
       return <Navigate to={dest} replace />;
     }
     ```
   - In `AuthRoute`:
     ```typescript
     if (user) {
       const dest = resolvePostLoginRoute(userRole);
       return <Navigate to={dest} replace />;
     }
     ```
   - In `App.tsx` router configuration:
     Add `<Route path="/app" element={<HomeRoute />} />` alongside `<Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />`.
3. **Deep Link Preservation**:
   - In `Auth.tsx`:
     ```typescript
     const location = useLocation();
     const from = (location.state as { from?: string })?.from;
     // On login:
     const targetRoute = resolvePostLoginRoute(membership?.role, from);
     navigate(targetRoute);
     ```

### 4.3 Route Decoupling & Suite Switcher Architecture
1. **Suite Switcher Component (`src/components/SuiteSwitcher.tsx`)**:
   - Top navigation header pill displaying two toggle tabs:
     * Tab 1: **POS & Billing** (`/billing/*`) with amber/indigo badge.
     * Tab 2: **CRM Portal** (`/crm/*`) with emerald/blue badge.
   - Active state derived from `location.pathname.startsWith("/crm") ? "crm" : "billing"`.
   - Clicking CRM navigates to `/crm` and sets `localStorage.setItem("credsmart_active_suite", "crm")`.
   - Clicking POS & Billing navigates to `/billing` (or `/dashboard`) and sets `localStorage.setItem("credsmart_active_suite", "billing")`.
2. **Protected Invoicing Flows**:
   - `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx` remain 100% untouched.

---

## 5. Verification Method

To independently verify the architecture and test suite health:

1. **Verify TypeScript Strict Compilation**:
   ```powershell
   node node_modules/typescript/bin/tsc --noEmit
   ```
   *Expected outcome*: Exits with code `0`, zero type errors.

2. **Verify CRM Shell & Navigation Test Invariants**:
   ```powershell
   node node_modules/vitest/vitest.mjs run src/test/crmShellNavigation.audit.test.ts src/test/crmShellRoutes.test.ts
   ```
   *Expected outcome*: All 30 tests pass (8 audit + 22 routes), confirming route parity and regex conformance in `App.tsx`.

3. **Verify Protected Invoice Flow Integrity**:
   ```powershell
   node node_modules/vitest/vitest.mjs run src/test/crmChallengerM1_2.test.ts
   ```
   *Expected outcome*: All 11 tests pass, verifying that all 5 protected invoice files exist and remain intact.

4. **Verify Billing Engine & Mobile Success View**:
   ```powershell
   node node_modules/vitest/vitest.mjs run src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx
   ```
   *Expected outcome*: All billing tests pass cleanly.

5. **Verify Production Build**:
   ```powershell
   node node_modules/vite/bin/vite.js build
   ```
   *Expected outcome*: Exits with code `0`, successfully generating bundled assets in `dist/`.

6. **Invalidation Conditions**:
   - Modifying `ProtectedRoutes` or `RoleProtectedRoute` syntax in `src/App.tsx` in a way that breaks regex matching in `src/test/crmShellRoutes.test.ts:305-316`.
   - Deleting or resizing any of the 5 protected invoice files below 1000 bytes.
   - Redirecting a `cashier` role to any CRM route.
