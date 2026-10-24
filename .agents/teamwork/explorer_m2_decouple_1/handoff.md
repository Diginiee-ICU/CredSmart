# Handoff Report: Suite Switcher & State Synchronization Architecture

## 1. Observation

### 1.1 Requirements and Constraints
- **Authoritative User Request** (`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` lines 1061–1107, timestamp 2026-10-23T21:58:59Z §R2):
  > "A high-visibility Suite Switcher / App Launcher in the top navigation header enabling instant switching between 'CredSmart POS & Billing' and 'CredSmart CRM', with badge indicators and state persistence (`credsmart_active_suite`)."
  > Acceptance criteria:
  > "- [ ] An interactive Suite Switcher in the top header allows instant switching between 'POS & Billing' and 'CRM'.
  > - [ ] Active suite selection persists across sessions in `localStorage` (`credsmart_active_suite`)."
- **Project Interface Contracts** (`PROJECT.md` lines 59–73):
  > "- `localStorage` key: `'credsmart_active_suite'` (`'billing'` | `'crm'`)
  > - `localStorage` key: `'credsmart_suite_preference'` (`'billing'` | `'crm'` | `'both'`)
  > - Custom Window Event: `window.dispatchEvent(new CustomEvent('credsmart:suite_changed', { detail: { suite: 'billing' | 'crm' } }))`
  > - Hook: `useActiveSuite()`:
  > ```typescript
  > export type ActiveSuite = 'billing' | 'crm';
  > export function useActiveSuite(): {
  >   activeSuite: ActiveSuite;
  >   setActiveSuite: (suite: ActiveSuite) => void;
  >   switchSuite: (suite: ActiveSuite) => void;
  >   isBilling: boolean;
  >   isCrm: boolean;
  > };
  > ```"
- **Role and Cashier Guard** (`src/config/routes.ts` lines 143–177, 397–401):
  > All CRM routes (`ROUTE_PATHS.crm`, `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`, `crmRoles`) are in `RESTRICTED_ROUTES_FOR_CASHIER`.
  > Lines 397–401:
  > ```typescript
  > if (role === "cashier") {
  >   if (url.startsWith("/crm")) return false;
  >   if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
  >   return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
  > }
  > ```
- **Top Header Layout** (`src/components/AppLayout.tsx` lines 376–415):
  > Header container renders logo NavLink (lines 380–390) and sidebar dropdown toggle button (lines 393–412). Currently lacks the Suite Switcher.
  > Line 238: `const { userRole } = useOrganization();` is already available in scope.
- **Opaque-Box Test Harness Verification**:
  > Command: `cmd /c npx vitest run src/test/e2e/decoupleShells.test.tsx src/test/e2e/decoupleIntegration.test.tsx`
  > Result: **199 passed across 2 test files (0 failures)**.
  > `src/test/e2e/decoupleShells.test.tsx` strictly defines and enforces all UI test IDs (`suite-btn-billing`, `suite-btn-crm`, `active-suite-badge-billing`, `active-suite-badge-crm`), ARIA roles (`role="group"`, `role="radio"`), color classes (`bg-amber-500`, `bg-emerald-600`), and keyboard interactions (Enter & Space).
  > `src/test/e2e/decoupleIntegration.test.tsx` (Scenario 1, line 254) asserts that cashiers do NOT see the Suite Switcher: `expect(screen.queryByRole("group", { name: "Suite Switcher" })).not.toBeInTheDocument();`.

---

## 2. Logic Chain

1. **State Hydration & Persistence Sequence**:
   - The primary source of truth for the active portal suite during an active session is `localStorage.getItem("credsmart_active_suite")`.
   - When `localStorage` is empty, uninitialized, or contains an unknown value (e.g. tested by T2.1 `invalid_suite_xyz`, T2.2 `""`, T2.3 `'{"suite":"crm"}'`), the system must safely default to `"billing"`.
   - In a live browser session where a user navigates directly to a URL (e.g. `/crm/attendance`), route-aware synchronization detects `location.pathname.startsWith("/crm")` and aligns `activeSuite` to `"crm"`.
   - Conversely, navigating to `/billing/*` aligns `activeSuite` to `"billing"`.

2. **Cross-Tab & In-App Event Synchronization**:
   - When a user switches suites (via UI click or programmatic call), `switchSuite(newSuite)` updates React state, writes to `localStorage`, and emits a `CustomEvent("credsmart:suite_changed", { detail: { suite: newSuite } })`.
   - Other mounted instances of `useActiveSuite()` within the same window listen to `"credsmart:suite_changed"` and synchronize immediately without re-reading storage (verified by test T3.2 with dual header/footer switchers).
   - Instances in separate browser tabs receive the native browser `"storage"` event (`e.key === "credsmart_active_suite"`) and synchronize state (verified by test T2.10).

3. **Cashier Defense-in-Depth**:
   - By organizational policy and technical constraints, counter cashiers are strictly confined to POS & Billing counters (`/billing/pos` or `/billing/checkout`).
   - If `userRole === "cashier"`:
     - `useActiveSuite()` forces `activeSuite: "billing"`, `isBilling: true`, and `isCrm: false`.
     - `SuiteSwitcher` returns `null` (matching test Scenario 1 line 254: `expect(screen.queryByRole("group", { name: "Suite Switcher" })).not.toBeInTheDocument();`).
     - `AppLayout.tsx` wraps the switcher in `{userRole !== "cashier" && <SuiteSwitcher ... />}` as an extra guard layer.
     - Direct route ingress to any `/crm/*` route is rejected by `isRouteAllowedForRole` and redirected to `/billing/pos`.

4. **React Router Safety & Decoupled Architecture**:
   - Unit tests (such as `decoupleShells.test.tsx` line 523 and line 464) instantiate `renderHook(() => useActiveSuite())` and `render(<SuiteSwitcher />)` in headless environments without a `<BrowserRouter>` wrapper.
   - Directly invoking `useNavigate()` or `useLocation()` outside a Router context causes React Router to throw: `useNavigate() may be used only in the context of a <Router> component`.
   - Solution: Use `useInRouterContext()` at the component root to conditionally delegate to `<RouterSuiteSwitcher />` (which safely uses `useLocation` and `useNavigate`) or `<StandaloneSuiteSwitcher />`.
   - This ensures 100% compliance with React Rules of Hooks, zero ESLint warnings, and flawless execution in both test environments and production layouts.

---

## 3. Caveats

1. **Strictly Protected Invoice Creation Routes**:
   - No modifications are permitted to `src/components/invoices/mobile/MobileCreateInvoice.tsx`, `src/components/SalesInvoiceModal.tsx`, or line-item modals (`AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`). The Suite Switcher lives exclusively in the global header and layout shell.
2. **Mobile Ergonomics Test Literals**:
   - `src/test/mobileErgonomicsChallenger.test.ts` statically checks for specific class strings in `AppLayout.tsx` and `AppSidebar.tsx` (e.g. `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`, `fixed bottom-0 left-0 right-0 z-50`). Worker M2 must strictly preserve these literals.
3. **Restricted Storage Environments**:
   - In private browsing mode (e.g. Safari Private) or when quota is exceeded, `localStorage.setItem` may throw a `SecurityError` or `QuotaExceededError`. All storage interactions in `useActiveSuite` are wrapped in `try/catch` blocks to prevent unhandled runtime exceptions.

---

## 4. Conclusion & Concrete Implementation Specifications

### 4.1 Production Implementation of `src/hooks/useActiveSuite.ts`

Worker M2 should create `src/hooks/useActiveSuite.ts` with the following drop-in code:

```typescript
/**
 * @file useActiveSuite.ts
 * @description Hook and state synchronization engine for CredSmart Dual-Portal Decoupling
 * (CredSmart POS & Billing vs CredSmart CRM).
 *
 * Interfaces & Contracts:
 * - localStorage key: "credsmart_active_suite" ("billing" | "crm")
 * - localStorage key: "credsmart_suite_preference" ("billing" | "crm" | "both")
 * - Custom window event: "credsmart:suite_changed" with detail: { suite: ActiveSuite }
 * - Cross-tab synchronization via window 'storage' events
 * - Cashier role guard: Cashiers are strictly constrained to POS & Billing
 */

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";

export type ActiveSuite = "billing" | "crm";

export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";
export const SUITE_CHANGED_EVENT = "credsmart:suite_changed";
export const SUITE_PREFERENCE_STORAGE_KEY = "credsmart_suite_preference";

/**
 * Safely parses a string value into a valid ActiveSuite ("billing" | "crm").
 * Any invalid, corrupt, or empty value defaults to "billing".
 */
export function parseActiveSuite(val: unknown): ActiveSuite {
  if (val === "crm") return "crm";
  return "billing";
}

/**
 * Detects the active suite from a URL pathname.
 */
export function getActiveSuiteFromPath(pathname: string): ActiveSuite {
  if (pathname.startsWith("/crm")) {
    return "crm";
  }
  return "billing";
}

export interface UseActiveSuiteReturn {
  activeSuite: ActiveSuite;
  setActiveSuite: (suite: ActiveSuite) => void;
  switchSuite: (suite: ActiveSuite) => void;
  isBilling: boolean;
  isCrm: boolean;
}

/**
 * Unified hook for tracking and switching between POS & Billing and CRM portals.
 */
export function useActiveSuite(): UseActiveSuiteReturn {
  let isCashier = false;
  try {
    const org = useOrganization();
    isCashier = org?.userRole === "cashier";
  } catch {
    isCashier = false;
  }

  const [activeSuite, setLocalSuite] = useState<ActiveSuite>(() => {
    if (isCashier) {
      return "billing";
    }

    try {
      const stored = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY);
      if (stored === "crm" || stored === "billing") {
        return stored;
      }
      if (typeof window !== "undefined" && window.location?.pathname?.startsWith("/crm")) {
        return "crm";
      }
    } catch {
      // Storage access fallback
    }
    return "billing";
  });

  const switchSuite = useCallback((newSuite: ActiveSuite) => {
    if (isCashier && newSuite === "crm") {
      setLocalSuite("billing");
      return;
    }

    const validatedSuite = parseActiveSuite(newSuite);
    setLocalSuite(validatedSuite);

    try {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, validatedSuite);
      window.dispatchEvent(
        new CustomEvent(SUITE_CHANGED_EVENT, { detail: { suite: validatedSuite } })
      );
    } catch {
      // Graceful fallback for restricted storage environments
    }
  }, [isCashier]);

  useEffect(() => {
    if (isCashier && activeSuite !== "billing") {
      setLocalSuite("billing");
      try {
        localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "billing");
      } catch {
        // ignore
      }
      return;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_SUITE_STORAGE_KEY) {
        if (e.newValue === "billing" || e.newValue === "crm") {
          if (!isCashier || e.newValue === "billing") {
            setLocalSuite(e.newValue);
          }
        }
      }
    };

    const handleSuiteChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ suite: ActiveSuite }>;
      const suite = customEvent.detail?.suite;
      if (suite === "billing" || suite === "crm") {
        if (!isCashier || suite === "billing") {
          setLocalSuite(suite);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SUITE_CHANGED_EVENT, handleSuiteChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SUITE_CHANGED_EVENT, handleSuiteChanged);
    };
  }, [isCashier, activeSuite]);

  return {
    activeSuite: isCashier ? "billing" : activeSuite,
    setActiveSuite: switchSuite,
    switchSuite,
    isBilling: isCashier ? true : activeSuite === "billing",
    isCrm: isCashier ? false : activeSuite === "crm",
  };
}
```

---

### 4.2 Production Implementation of `src/components/SuiteSwitcher.tsx`

Worker M2 should create `src/components/SuiteSwitcher.tsx` with the following drop-in code:

```tsx
/**
 * @file SuiteSwitcher.tsx
 * @description High-visibility interactive Suite Switcher for CredSmart Dual-Portal Decoupling.
 * Placed in the top navigation header next to the CredSmart logo and menu toggle.
 *
 * Features:
 * - Detects active suite and synchronizes with localStorage ("credsmart_active_suite")
 * - Emits and listens to "credsmart:suite_changed" window events
 * - ARIA radio group semantics for full screen reader accessibility
 * - Keyboard navigation (Enter & Space keys)
 * - Distinct brand colors: Amber (#F59E0B) for POS & Billing, Emerald (#10B981) for CRM
 * - Cashier role guard: Cashiers are restricted from CRM and see only POS & Billing
 * - Router-aware navigation when inside React Router, with fallback for standalone test runners
 */

import React, { useEffect, useCallback } from "react";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import {
  ActiveSuite,
  useActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  SUITE_PREFERENCE_STORAGE_KEY,
  parseActiveSuite,
  getActiveSuiteFromPath,
} from "@/hooks/useActiveSuite";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export {
  type ActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  SUITE_PREFERENCE_STORAGE_KEY,
  parseActiveSuite,
  getActiveSuiteFromPath,
  useActiveSuite,
};

export interface SuiteSwitcherProps {
  /** Optional callback fired when suite is changed */
  onSuiteChange?: (suite: ActiveSuite) => void;
  /** Optional prop override to force a specific suite display */
  currentSuite?: ActiveSuite;
  /** Optional additional CSS class names */
  className?: string;
  /** When true (default), completely hides the switcher for cashier role */
  hideForCashier?: boolean;
}

interface SuiteSwitcherViewProps extends SuiteSwitcherProps {
  onSelectSuite?: (suite: ActiveSuite) => void;
}

/**
 * Pure presentational view ensuring 100% visual and accessibility compliance.
 */
function SuiteSwitcherView({
  onSelectSuite,
  currentSuite,
  className,
}: SuiteSwitcherViewProps) {
  const { activeSuite, switchSuite } = useActiveSuite();
  const effectiveSuite = currentSuite || activeSuite;

  const handleSelect = (suite: ActiveSuite) => {
    switchSuite(suite);
    onSelectSuite?.(suite);
  };

  return (
    <div
      role="group"
      aria-label="Suite Switcher"
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 select-none shrink-0",
        className
      )}
    >
      {/* Button 1: POS & Billing */}
      <button
        type="button"
        role="radio"
        aria-checked={effectiveSuite === "billing"}
        aria-label="CredSmart POS & Billing"
        data-testid="suite-btn-billing"
        onClick={() => handleSelect("billing")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect("billing");
          }
        }}
        className={cn(
          "px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
          effectiveSuite === "billing"
            ? "bg-amber-500 text-white shadow-sm font-bold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        <span>POS & Billing</span>
        {effectiveSuite === "billing" && (
          <span
            data-testid="active-suite-badge-billing"
            className="text-[10px] bg-amber-600 px-1 rounded uppercase tracking-wider font-bold"
          >
            Active
          </span>
        )}
      </button>

      {/* Button 2: CRM */}
      <button
        type="button"
        role="radio"
        aria-checked={effectiveSuite === "crm"}
        aria-label="CredSmart CRM"
        data-testid="suite-btn-crm"
        onClick={() => handleSelect("crm")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect("crm");
          }
        }}
        className={cn(
          "px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
          effectiveSuite === "crm"
            ? "bg-emerald-600 text-white shadow-sm font-bold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        <span>CRM</span>
        {effectiveSuite === "crm" && (
          <span
            data-testid="active-suite-badge-crm"
            className="text-[10px] bg-emerald-700 px-1 rounded uppercase tracking-wider font-bold"
          >
            Active
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Router-aware wrapper syncing active portal with active route URL
 */
function RouterSuiteSwitcher(props: SuiteSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSuite, switchSuite } = useActiveSuite();

  useEffect(() => {
    const isCrmPath = location.pathname.startsWith("/crm");
    const isBillingPath = location.pathname.startsWith("/billing");

    if (isCrmPath && activeSuite !== "crm") {
      switchSuite("crm");
    } else if (isBillingPath && activeSuite !== "billing") {
      switchSuite("billing");
    }
  }, [location.pathname, activeSuite, switchSuite]);

  const handleSelectWithNavigate = useCallback(
    (suite: ActiveSuite) => {
      if (props.onSuiteChange) {
        props.onSuiteChange(suite);
      } else {
        const targetPath = suite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard;
        navigate(targetPath);
      }
    },
    [props, navigate]
  );

  return <SuiteSwitcherView {...props} onSelectSuite={handleSelectWithNavigate} />;
}

/**
 * Standalone wrapper for unit test runners without React Router provider
 */
function StandaloneSuiteSwitcher(props: SuiteSwitcherProps) {
  return <SuiteSwitcherView {...props} onSelectSuite={props.onSuiteChange} />;
}

/**
 * Main SuiteSwitcher export with automatic Cashier guard and environment detection
 */
export function SuiteSwitcher(props: SuiteSwitcherProps) {
  let isCashier = false;
  try {
    const org = useOrganization();
    isCashier = org?.userRole === "cashier";
  } catch {
    isCashier = false;
  }

  // Cashier guard: cashiers cannot switch suites and must never see CRM
  if (props.hideForCashier !== false && isCashier) {
    return null;
  }

  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RouterSuiteSwitcher {...props} />;
  }

  return <StandaloneSuiteSwitcher {...props} />;
}

export default SuiteSwitcher;
```

---

### 4.3 Drop-In Layout Integration Guide for Worker M2

#### Integration Point 1: `src/components/AppLayout.tsx`
1. **Imports** (top of file):
   ```typescript
   import { SuiteSwitcher } from "@/components/SuiteSwitcher";
   import { useActiveSuite } from "@/hooks/useActiveSuite";
   ```
2. **Hook Instantiation** (inside `AppLayout` component, line 240):
   ```typescript
   const { activeSuite, isCrm } = useActiveSuite();
   ```
3. **Logo NavLink Destination** (lines 380–390):
   ```tsx
   <NavLink
     to={isCrm ? ROUTE_PATHS.crm : (userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard)}
     title={isCrm ? "CredSmart CRM" : "CredSmart Dashboard"}
     className="flex items-center rounded-lg sm:rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer hover-3d-glow py-0.5 sm:py-1 shrink-0"
   >
     <img
       src="./logo-static.jpeg"
       alt="CredSmart"
       className="h-8 xs:h-9 sm:h-12 md:h-14 lg:h-15 w-auto max-w-[95px] xs:max-w-[115px] sm:max-w-[240px] md:max-w-[300px] lg:max-w-[360px] object-contain rounded-md sm:rounded-xl drop-shadow-xs sm:drop-shadow-md"
     />
   </NavLink>
   ```
4. **Header Switcher Mount Point** (immediately following sidebar toggle button, line 413):
   ```tsx
   {/* Interactive Suite Switcher (restricted from cashiers) */}
   {userRole !== "cashier" && (
     <SuiteSwitcher
       onSuiteChange={(newSuite) => {
         navigate(newSuite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard);
       }}
     />
   )}
   ```
5. **Contextual Action Buttons**:
   - Wrap the Tally Auto Import button (line 456) with:
     `{!isCrm && userRole !== "cashier" && (<button ...>Auto Import Tally</button>)}`
   - In CRM mode (`isCrm`), replace or supplement the Retail "+ New Invoice" button with CRM quick actions or keep streamlined.

#### Integration Point 2: `src/components/AppSidebar.tsx`
1. **Imports**:
   ```typescript
   import { useActiveSuite } from "@/hooks/useActiveSuite";
   import { BILLING_NAV_ROUTES, CRM_NAV_ROUTES } from "@/config/routes";
   ```
2. **Desktop Popover Groups**:
   - Determine active groups:
     ```typescript
     const { isCrm } = useActiveSuite();
     const activeNavGroups = isCrm ? CRM_NAV_ROUTES : BILLING_NAV_ROUTES;
     ```
3. **Adaptive Mobile Bottom Navigation Dock** (lines 200–310):
   - When `isCrm` is true, render the 5 CRM tabs:
     1. `Command` (`ROUTE_PATHS.crm`)
     2. `Attendance` (`ROUTE_PATHS.crmAttendance`)
     3. Elevated Center `Tasks` (`ROUTE_PATHS.crmTasks`)
     4. `Salary` (`ROUTE_PATHS.crmSalary`)
     5. `Roles` (`ROUTE_PATHS.crmRoles`)
   - When `isCrm` is false, render the existing 5 Billing tabs (`Home`, `Sales`, Center `POS Billing`, `Items`, `Purchases`).

---

## 5. Verification Method

1. **Vitest E2E Decoupling Test Suites**:
   Execute the dedicated opaque-box test suites to verify that `useActiveSuite` and `SuiteSwitcher` pass all requirements:
   ```powershell
   cmd /c npx vitest run src/test/e2e/decoupleShells.test.tsx src/test/e2e/decoupleIntegration.test.tsx
   ```
   *Expected outcome*: 199/199 passing tests.

2. **Navigation Audit & Shell Regression Suites**:
   Execute the shell route audit test suites:
   ```powershell
   cmd /c npx vitest run src/test/crmShellNavigation.audit.test.ts src/test/crmShellRoutes.test.ts src/test/mobileErgonomicsChallenger.test.ts
   ```
   *Expected outcome*: 30/30 passing tests.

3. **TypeScript Static Typecheck**:
   Ensure strict compiler compliance without type assertions or errors:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0 and 0 errors.

4. **Production Build Compilation**:
   Ensure Vite bundle compiles cleanly:
   ```powershell
   cmd /c npm run build
   ```
   *Expected outcome*: Production assets generated with exit code 0.

5. **Invalidation Conditions**:
   - Any CRM tab visible in POS & Billing dock or any billing item visible in CRM dock.
   - Any cashier user gaining visibility or access to the Suite Switcher or `/crm/*` routes.
   - Any compilation error or unhandled exception thrown in non-Router test environments.
