# Handoff Report: Explorer M1 R2.1 — Cashier CRM Route Gating Remediation

**Agent**: `explorer_m1_r2_1` (Read-only Investigation & Architectural Synthesis)  
**Date**: 2026-10-23T23:12:00Z  
**Target File**: `src/config/routes.ts`  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Status**: COMPLETE (Remediation Design & Verification Blueprint Ready for Worker M1)  

---

## 1. Observation

### 1.1 Direct Inspection of Vulnerability in `src/config/routes.ts`
1. **Omission in `RESTRICTED_ROUTES_FOR_CASHIER` (lines 143–183)**:
   ```typescript
   export const RESTRICTED_ROUTES_FOR_CASHIER: ReadonlySet<string> = new Set([
     ROUTE_PATHS.dashboard,
     ROUTE_PATHS.purchases,
     ROUTE_PATHS.discovery,
     ROUTE_PATHS.suppliers,
     ROUTE_PATHS.purchaseReturns,
     ROUTE_PATHS.analytics,
     ROUTE_PATHS.reports,
     ROUTE_PATHS.cashBank,
     ROUTE_PATHS.eInvoicing,
     ROUTE_PATHS.automatedBills,
     ROUTE_PATHS.expenses,
     ROUTE_PATHS.barcode,
     ROUTE_PATHS.settings,
     ROUTE_PATHS.businessSettings,
     ROUTE_PATHS.invoiceSettings,
     ROUTE_PATHS.printSettings,
     ROUTE_PATHS.staff,
     ROUTE_PATHS.activityLog,
     ROUTE_PATHS.crm,
     ROUTE_PATHS.crmRoles,
     ...
   ]);
   ```
   - Only `ROUTE_PATHS.crm` (`/crm`) and `ROUTE_PATHS.crmRoles` (`/crm/roles`) are listed.
   - The following **8 active CRM subroutes** are omitted:
     - `ROUTE_PATHS.crmDashboard` (`/crm`)
     - `ROUTE_PATHS.crmAttendance` (`/crm/attendance`)
     - `ROUTE_PATHS.crmSalary` (`/crm/salary`)
     - `ROUTE_PATHS.crmTasks` (`/crm/tasks`)
     - `ROUTE_PATHS.crmMeet` (`/crm/meet`)
     - `ROUTE_PATHS.crmBroadcasts` (`/crm/broadcasts`)
     - `ROUTE_PATHS.crmAiAssistant` (`/crm/ai-assistant`)
     - `ROUTE_PATHS.crmSupport` (`/crm/support`)
   - The following **6 settings subroutes** and their legacy counterparts are omitted:
     - `ROUTE_PATHS.settingsReminders` (`/billing/settings/reminders`)
     - `ROUTE_PATHS.settingsCaSharing` (`/billing/settings/ca-sharing`)
     - `ROUTE_PATHS.settingsPricing` (`/billing/settings/pricing`)
     - `ROUTE_PATHS.settingsRefer` (`/billing/settings/refer`)
     - `ROUTE_PATHS.settingsHelp` (`/billing/settings/help`)
     - `ROUTE_PATHS.tallyImport` (`/billing/tally-import`)
     - Legacy string paths: `"/settings/reminders"`, `"/settings/ca-sharing"`, `"/settings/pricing"`, `"/settings/refer"`, `"/settings/help"`, `"/tally-import"`

2. **Inadequate Gating Logic in `isRouteAllowedForRole` (lines 376–379)**:
   ```typescript
   // Cashier
   if (role === "cashier") {
     return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
   }
   ```
   - Because `url` is normalized and compared strictly via `Set.prototype.has`, any unlisted route evaluates to `true` (access granted).
   - Direct execution confirmed:
     - `isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier") === true`
     - `isRouteAllowedForRole(ROUTE_PATHS.crmSalary, "cashier") === true`
     - `isRouteAllowedForRole(ROUTE_PATHS.crmTasks, "cashier") === true`
     - `isRouteAllowedForRole(ROUTE_PATHS.settingsReminders, "cashier") === true`

3. **Precedent and Priority of `customPermissions` (lines 289–297)**:
   ```typescript
   // Check granular custom feature toggles first if provided
   if (customPermissions && typeof customPermissions === "object") {
     for (const [featKey, routes] of Object.entries(FEATURE_ROUTE_MAP)) {
       if (routes.some((r) => url === r || url.startsWith(`${r}/`))) {
         if (customPermissions[featKey] === true) return true;
         if (customPermissions[featKey] === false) return false;
       }
     }
   }
   ```
   - Explicit feature permission overrides are evaluated **before** `role === "cashier"`. Therefore, adding prefix denial or set entries for cashier will **not** block explicit super-admin custom overrides (e.g. `{ crm: true }`).

### 1.2 Empirical Baseline Test Results
- `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmShellRoutes.test.ts`
  - Output: 2 passed, 73 tests passed.
  - Line 138 of `challengerM1_2DecoupleAudit.test.ts` explicitly documented the gap:
    `it("AUDIT GAP: cashier is blocked from /crm & /crm/roles but permitted on /crm subroutes in isRouteAllowedForRole", ...)`
- `cmd /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmChallengerM1.test.ts src/test/crmChallengerM1_2.test.ts src/test/crmShellNavigation.audit.test.ts`
  - Output: 4 passed, 119 tests passed.
- `cmd /c npx vitest run src/test/e2e/decoupleRoutes.test.ts src/test/e2e/decoupleOnboarding.test.tsx`
  - Output: 2 passed, 101 tests passed.

---

## 2. Logic Chain

1. **Premise 1 (Policy Specification)**:  
   `PROJECT.md` § System Topology explicitly specifies: *"Cashier role protection: Cashiers remain strictly constrained to POS billing operations."*  
   `ORIGINAL_REQUEST.md` (2026-10-23T21:58:59Z §R1 & §R3) establishes complete isolation between POS/Billing (`/billing/*`) and CRM (`/crm/*`). Cashiers must never enter or access CRM or administrative settings.
2. **Premise 2 (Route Protection Layer)**:  
   In `src/App.tsx`, `RoleProtectedRoute` uses `isRouteAllowedForRole(currentPath, role)` to decide whether an authenticated user is allowed on the target route or redirected to `/billing/pos`. Additionally, UI sidebars and menus filter links based on `isRouteAllowedForRole` and `RESTRICTED_ROUTES_FOR_CASHIER`.
3. **Premise 3 (Vulnerability Mechanism)**:  
   Because `RESTRICTED_ROUTES_FOR_CASHIER` uses an exact set lookup and only enumerates `/crm` and `/crm/roles`, querying any other CRM subpath (`/crm/attendance`, `/crm/salary`, `/crm/tasks`, etc.) or settings subpath (`/billing/settings/reminders`, `/billing/settings/ca-sharing`, etc.) results in `RESTRICTED_ROUTES_FOR_CASHIER.has(url)` returning `false`. Inverting this with `!` causes `isRouteAllowedForRole` to return `true` (access permitted).
4. **Premise 4 (Dual-Layer Defense-in-Depth Solution)**:  
   - **Layer 1 (Set Completeness)**: Explicitly adding all canonical CRM subroutes and settings subroutes (and legacy aliases) into `RESTRICTED_ROUTES_FOR_CASHIER` ensures that any direct set lookup by components or test suites (`RESTRICTED_ROUTES_FOR_CASHIER.has(...)`) evaluates to `true`.
   - **Layer 2 (Prefix Gating)**: Introducing prefix boundary checks in `isRouteAllowedForRole` for `url.startsWith("/crm")` and `url.startsWith("/billing/settings") || url === "/billing/settings"` guarantees that:
     1. Any nested deep link, parameterized route, query string, or future CRM/settings subroute is automatically blocked for cashiers without requiring manual set maintenance.
     2. Custom permission grants (`customPermissions`) remain unaffected because they are evaluated at lines 289–297 prior to the cashier block.
5. **Premise 5 (Test Suite Alignment)**:  
   In `src/test/challengerM1_2DecoupleAudit.test.ts`, Challenger 2 created a reproduction test asserting `expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier")).toBe(true)`. Once the fix is applied, this test must be converted to assert `.toBe(false)` across all CRM subroutes and settings subroutes, reflecting the permanent remediation of the audit gap.

---

## 3. Caveats

1. **Protected Invoicing Files**:  
   Under no circumstances should any of the 5 protected invoicing files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) be modified. The remediation is strictly confined to `src/config/routes.ts` and the verification test file `src/test/challengerM1_2DecoupleAudit.test.ts`.
2. **Custom Permission Overrides**:  
   If an administrator assigns a staff member with role `cashier` an explicit custom permission `{ crm: true }`, `isRouteAllowedForRole` will intentionally permit CRM access because lines 289–297 run before the cashier check. This is an intended feature of the granular custom RBAC architecture (verified in `crmShellRoutes.test.ts` lines 289–295).

---

## 4. Conclusion & Actionable Blueprint for Worker M1

### 4.1 Exact Code Modifications for `src/config/routes.ts`

#### Modification 1: `RESTRICTED_ROUTES_FOR_CASHIER` (lines 143–183)
Replace lines 143–183 with:
```typescript
export const RESTRICTED_ROUTES_FOR_CASHIER: ReadonlySet<string> = new Set([
  ROUTE_PATHS.dashboard,
  ROUTE_PATHS.purchases,
  ROUTE_PATHS.discovery,
  ROUTE_PATHS.suppliers,
  ROUTE_PATHS.purchaseReturns,
  ROUTE_PATHS.analytics,
  ROUTE_PATHS.reports,
  ROUTE_PATHS.cashBank,
  ROUTE_PATHS.eInvoicing,
  ROUTE_PATHS.automatedBills,
  ROUTE_PATHS.expenses,
  ROUTE_PATHS.barcode,
  ROUTE_PATHS.settings,
  ROUTE_PATHS.businessSettings,
  ROUTE_PATHS.invoiceSettings,
  ROUTE_PATHS.printSettings,
  ROUTE_PATHS.settingsReminders,
  ROUTE_PATHS.settingsCaSharing,
  ROUTE_PATHS.settingsPricing,
  ROUTE_PATHS.settingsRefer,
  ROUTE_PATHS.settingsHelp,
  ROUTE_PATHS.tallyImport,
  ROUTE_PATHS.staff,
  ROUTE_PATHS.activityLog,
  ROUTE_PATHS.crm,
  ROUTE_PATHS.crmDashboard,
  ROUTE_PATHS.crmAttendance,
  ROUTE_PATHS.crmSalary,
  ROUTE_PATHS.crmTasks,
  ROUTE_PATHS.crmMeet,
  ROUTE_PATHS.crmBroadcasts,
  ROUTE_PATHS.crmAiAssistant,
  ROUTE_PATHS.crmSupport,
  ROUTE_PATHS.crmRoles,
  // Legacy paths for robust backwards compatibility
  "/dashboard",
  "/purchases",
  "/discovery",
  "/suppliers",
  "/purchase-returns",
  "/analytics",
  "/reports",
  "/cash-bank",
  "/e-invoicing",
  "/automated-bills",
  "/expenses",
  "/barcode",
  "/settings",
  "/settings/business",
  "/settings/invoice",
  "/settings/print",
  "/settings/reminders",
  "/settings/ca-sharing",
  "/settings/pricing",
  "/settings/refer",
  "/settings/help",
  "/tally-import",
  "/staff",
  "/activity-log",
]);
```

#### Modification 2: `isRouteAllowedForRole` Cashier Handler (lines 376–380)
Replace lines 376–380 with:
```typescript
  // Cashier
  if (role === "cashier") {
    if (url.startsWith("/crm")) return false;
    if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
    return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
  }
```

### 4.2 Test Suite Update for `src/test/challengerM1_2DecoupleAudit.test.ts`
Replace lines 138–150 of `src/test/challengerM1_2DecoupleAudit.test.ts` with:
```typescript
    it("strictly blocks cashier from all CRM subroutes in isRouteAllowedForRole", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmDashboard, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmSalary, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmTasks, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmMeet, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmBroadcasts, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAiAssistant, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmSupport, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/attendance", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/salary", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/tasks", "cashier")).toBe(false);
    });

    it("strictly blocks cashier from all settings subroutes in isRouteAllowedForRole", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.settings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.businessSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.invoiceSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.printSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsReminders, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsCaSharing, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsPricing, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsRefer, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsHelp, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.tallyImport, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/billing/settings/reminders", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/reminders", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/ca-sharing", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/refer", "cashier")).toBe(false);
    });
```

---

## 5. Verification Method

To verify this implementation independently:

1. **Execute Challenger Audit Suite**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected outcome*: All 52 tests pass, verifying complete cashier blocking on all CRM subroutes and settings subroutes.
2. **Execute CRM Shell & Navigation Test Suites**:
   ```bash
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmShellNavigation.audit.test.ts
   ```
   *Expected outcome*: 100% pass (30/30 tests), verifying route definitions, aliases, feature maps, and custom permission overrides.
3. **Execute Comprehensive Decouple & E2E Suites**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1Decouple.test.tsx src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/e2e/decoupleRoutes.test.ts src/test/e2e/decoupleOnboarding.test.tsx
   ```
   *Expected outcome*: 100% pass across all suites.
4. **Compile TypeScript**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, zero errors.
5. **Invalidation Conditions**:
   - `isRouteAllowedForRole("/crm/attendance", "cashier")` returns `true`.
   - `isRouteAllowedForRole("/crm/salary", "cashier")` returns `true`.
   - `isRouteAllowedForRole("/billing/settings/reminders", "cashier")` returns `true`.
   - Any of the 5 protected invoicing files are altered.
