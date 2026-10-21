# Handoff Report: CredSmart Global App Shell & Navigation Survey

**Agent**: `explorer_survey_shell`  
**Date**: 2026-10-21T00:21:00Z  
**Target Milestone**: Survey Global App Shell, Navigation Architecture & Mobile Layout Wrappers  
**Destination Orchestrator**: `orchestrator_mobile_redesign` (ID: `92c8e148-9d89-47d7-9329-5f4887fd7091`)  

---

## 1. Observation

### Obs 1: Breakpoint & Mobile Detection
- **File**: `src/hooks/use-mobile.tsx`, lines 3–19:
  ```typescript
  const MOBILE_BREAKPOINT = 768;

  export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      const onChange = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      };
      mql.addEventListener("change", onChange);
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      return () => mql.removeEventListener("change", onChange);
    }, []);

    return !!isMobile;
  }
  ```
- **Finding**: Viewport width `< 768px` corresponds to `isMobile = true` and Tailwind mobile breakpoints (`< md:`). Viewport width `>= 768px` is desktop (`md:` in Tailwind).

### Obs 2: Current Layout & Shell Architecture in `AppLayout.tsx`
- **File**: `src/components/AppLayout.tsx`:
  - **Lines 233–240**: Context hooks consumed:
    ```typescript
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { org, orgId, organizations, switchOrganization, userRole, userPermissions } = useOrganization();
    const { pendingCount, unreadCount } = useNetworkInvoices();
    ```
  - **Lines 307–311**: POS Route detection:
    ```typescript
    const isPosRoute =
      location.pathname === ROUTE_PATHS.checkout ||
      location.pathname === ROUTE_PATHS.pos ||
      location.pathname.startsWith("/checkout") ||
      location.pathname.startsWith("/pos");
    ```
  - **Line 376**: Header wrapper:
    ```typescript
    {!isPosRoute && (
      <header className="pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(4rem+env(safe-area-inset-top,0px))] md:h-[calc(5rem+env(safe-area-inset-top,0px))] lg:h-[calc(5.5rem+env(safe-area-inset-top,0px))] shrink-0 glass-nav border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6 z-10 shadow-xs bg-white dark:bg-slate-900/90">
    ```
  - **Lines 416–430**: Desktop page title and SYNC LIVE badge are explicitly hidden on mobile:
    ```typescript
    <div className="h-7 sm:h-8 md:h-9 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden md:block" />

    <div className="hidden md:flex flex-col justify-center min-w-max shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
          {title}
        </h1>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-wide">SYNC LIVE</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px] lg:max-w-[320px] mt-0.5">{subtitle}</p>
    </div>
    ```
  - **Lines 433–442**: Desktop search bar with ⌘K badge: `hidden xl:flex`.
  - **Lines 447–453**: Mobile search trigger: `lg:hidden` button triggering `setOpenCommand(true)`.
  - **Lines 456–464**: Desktop Auto Import Tally button: `hidden sm:flex`.
  - **Lines 467–487**: New Invoice button has shortened label on mobile (`hidden sm:inline` "New Invoice", `sm:hidden` "Bill").
  - **Lines 521–564**: Notification bell has dual implementation:
    - Desktop/tablet: `hidden sm:flex`
    - Mobile: `flex sm:hidden` with unread/pending badge.
  - **Lines 566–640**: Store switcher & profile dropdown:
    - Trigger displays store initial: `{org?.name ? org.name.charAt(0).toUpperCase() : "C"}`
    - Content provides: store name, user email, role label, store switching list (`organizations.map(...)`), `+ Add Business / Branch`, `Store & Business Settings`, and `Sign Out`.
  - **Lines 736–739**: Mega menu & Mobile Dock integration:
    ```typescript
    <AppSidebar
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
    />
    ```
  - **Lines 746–755**: Viewport padding and container:
    ```typescript
    <main
      className={cn(
        "flex-1 min-w-0 flex flex-col overflow-y-auto scrollbar-thin transition-all duration-500",
        isPosRoute
          ? "p-0 m-0 h-full border-none bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden"
          : "bg-white/20 dark:bg-slate-950/25 backdrop-blur-[2px] border-t border-white/60 dark:border-slate-800/60",
        isMobile && !isPosRoute && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]",
        isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
      )}
    ```
  - **Lines 919–930**: Desktop bottom-right watermark:
    ```typescript
    <div className="hidden md:flex fixed bottom-4 right-6 z-40 select-none pointer-events-none ...">
    ```

### Obs 3: Current Navigation & Bottom Dock in `AppSidebar.tsx`
- **File**: `src/components/AppSidebar.tsx`:
  - **Lines 198–308**: Mobile bottom navigation dock is rendered conditionally when `isMobile` is true:
    ```typescript
    {isMobile && (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
        aria-label="Mobile Bottom Navigation"
      >
        {/* 1. Home -> ROUTE_PATHS.dashboard (LayoutDashboard icon) */}
        {/* 2. Sales -> ROUTE_PATHS.sales (Receipt icon) */}
        {/* 3. POS Billing -> ROUTE_PATHS.checkout (-mt-6 elevated ShoppingCart icon) */}
        {/* 4. Items -> ROUTE_PATHS.items (Package icon) */}
        {/* 5. Purchases -> ROUTE_PATHS.purchases (Truck icon) */}
      </nav>
    )}
    ```
  - **Lines 311–577**: 3D Mega Menu Floating Popover (opens when `isOpen` is true):
    - Top header search: `hidden sm:block` on desktop; `sm:hidden` quick search on mobile.
    - Grid layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
    - Accordions for children routes, badges, and quick links.

### Obs 4: Viewport & Safe Area Configuration
- **File**: `index.html`, line 5:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ```
- **File**: `src/index.css`, lines 704–718:
  ```css
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .safe-area-top {
    padding-top: env(safe-area-inset-top, 0px);
  }
  .safe-pb-nav {
    padding-bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
  }
  .safe-pt-header {
    padding-top: calc(3.5rem + env(safe-area-inset-top, 0px));
  }
  ```

### Obs 5: Existing Context Providers in `src/App.tsx`
- Hierarchy in `src/App.tsx` (lines 191–201):
  ```tsx
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrgProvider>
          <NetworkInvoicesProvider>
            <ProductsProvider>
              <Toaster />
              <Sonner />
              <NativePlatformBridge />
              <AppRouter>
  ```
- In `src/components/OfflineSyncBanner.tsx`:
  - `navigator.onLine` combined with `getOfflineQueueCount()` / `syncOfflineQueue()` in `src/utils/offlineQueue.ts` tracks offline queue transactions and syncing state.

---

## 2. Logic Chain

1. **Mobile vs. Desktop Separation (Survey Q1)**:
   - *From Obs 1 & Obs 2*: CredSmart establishes separation via two complementary mechanisms:
     - JS-level responsiveness: `useIsMobile()` hook detects `< 768px`. It controls whether the bottom dock renders in `AppSidebar.tsx` and whether perspective transforms or bottom padding are applied to `<main>` in `AppLayout.tsx`.
     - CSS-level responsiveness: Tailwind utility classes (`hidden md:flex`, `hidden md:block`, `hidden xl:flex` for desktop vs `block md:hidden`, `flex sm:hidden`, `lg:hidden` for mobile).
     - Page-level pattern: Across all major pages (`Dashboard.tsx:584`, `Customers.tsx:709`, `Items.tsx:940`, `Purchases.tsx:690`, `Sales.tsx:819`), mobile views are wrapped in `<div className="block md:hidden ...">` while desktop views are wrapped in `<div className="hidden md:flex ...">`.

2. **Top Mobile Header Implementation (Survey Q2)**:
   - *From Obs 2 & Obs 5*: The current top header in `AppLayout.tsx` already has all required context data available, but on mobile it currently displays a generic logo image and a cramped "Bill" split button rather than the Retail Minimal header.
   - *State & Context Mapping*:
     - **Store Name & Switcher**: Provided directly by `useOrganization()` (`org?.name`, `organizations`, `switchOrganization`). Can be rendered on the left as a compact store identity badge with `ChevronDown` opening either the store switcher dropdown or a dedicated bottom sheet.
     - **Live Cloud Sync Status Pill**: Provided by `navigator.onLine` and `getOfflineQueueCount()` (from `src/utils/offlineQueue.ts`). Displays a compact emerald pulse dot with font-mono `SYNC` or `LIVE` (`text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1`).
     - **Instant Search Trigger**: Directly binds to `setOpenCommand(true)` which invokes the existing `<CommandDialog>`.
     - **Notification Center Bell**: Binds to `setNotifOpen(true)` with unread count badge computed from `pendingCount` and `unreadCount` via `useNetworkInvoices()`.
     - **Profile Avatar**: Binds to the existing `<DropdownMenu>` containing the organization switcher, account email (`useAuth()`), settings, and sign-out.
   - *Isolation*: Mobile header elements should be wrapped in `flex md:hidden` inside the existing `<header>` or structured as a clean mobile sub-component, leaving desktop header classes (`hidden md:flex`, `hidden xl:flex`, `hidden md:block`) 100% unaltered.

3. **Floating Bottom Navigation Dock (Survey Q3)**:
   - *From Obs 3*: `AppSidebar.tsx` already contains a 5-tab mobile dock rendered when `isMobile` is true. However, the current styling can be refined to achieve the high-density Retail Minimal (Stripe / Shopify POS) aesthetic:
     - **5 Tabs**:
       1. `Home`: Route `ROUTE_PATHS.dashboard`, icon `LayoutDashboard`. Active when `location.pathname === ROUTE_PATHS.dashboard || location.pathname === "/"`.
       2. `Sales`: Route `ROUTE_PATHS.sales`, icon `Receipt`. Active when `location.pathname.startsWith(ROUTE_PATHS.sales) || location.pathname.startsWith(ROUTE_PATHS.salesHistory)`.
       3. `POS Billing`: Route `ROUTE_PATHS.checkout`, icon `ShoppingCart`. Elevated center pill (`-mt-5` to `-mt-6`), high-contrast pill container (`w-14 h-14 rounded-2xl ring-4 ring-white shadow-xl bg-gradient-to-tr from-amber-500 to-yellow-400` active or `from-indigo-600 to-blue-500` default).
       4. `Items`: Route `ROUTE_PATHS.items`, icon `Package`. Active when `location.pathname.startsWith(ROUTE_PATHS.items) || location.pathname.startsWith(ROUTE_PATHS.inventory)`.
       5. `Purchases`: Route `ROUTE_PATHS.purchases`, icon `Truck`. Active when `location.pathname.startsWith(ROUTE_PATHS.purchases) || location.pathname.startsWith(ROUTE_PATHS.suppliers)`.
     - Touch bounding targets: Each tab container must have `min-h-[48px]` and `active:scale-95 transition-transform` for tactile haptic feel.
     - Container: `fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]`.

4. **Viewport Content Padding & Safe Area Insets (Survey Q4)**:
   - *From Obs 2, Obs 3 & Obs 4*:
     - In `AppLayout.tsx` line 752, the main content padding is currently `isMobile && !isPosRoute && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"` and `pb-[calc(4.75rem+...)]` on POS routes.
     - The bottom dock visual height is ~64–72px (4rem to 4.5rem) with an elevated center pill extending -24px (-1.5rem) upward.
     - `5rem` (80px) is too tight and causes bottom elements (action buttons, pagination, footer totals) to sit directly against or behind the dock blur and elevated pill.
     - Upgrading the container padding to:
       `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`
       ensures an exact 88px + safe area buffer, giving 16–24px of clear breathing space above the floating dock and completely preventing touch collision or content obstruction on iPhone notch/home indicator and Android navigation bars.
     - The top header already correctly utilizes `pt-[env(safe-area-inset-top,0px)]` and `h-[calc(3.5rem+env(safe-area-inset-top,0px))]`.

5. **Desktop Invariance (Survey Q5)**:
   - *From Obs 2 & Obs 3*: To ensure 0% regression and 100% pixel parity on desktop (`>= 768px`):
     - All desktop-only markup (`hidden md:flex`, `hidden md:block`, `hidden xl:flex`, `hidden sm:flex`) in `AppLayout.tsx` and `AppSidebar.tsx` must remain completely intact.
     - The bottom dock MUST remain gated by `isMobile` (never visible when `isMobile` is false).
     - The 3D perspective wrapper on `<main>` (`perspective: "2000px"`, `sidebarOpen && !isMobile`) must remain preserved for desktop.
     - The bottom-right watermark (`hidden md:flex fixed bottom-4 right-6`) must remain preserved.

---

## 3. Caveats

- **No Caveats on Architecture**: The shell, routing, contexts, and breakpoints are cleanly decoupled and straightforward to survey.
- **POS Billing Sub-Route Handling**: `POSBilling.tsx` has its own embedded header (`pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))]`) and custom controls because `isPosRoute` disables the global `AppLayout` header. When designing mobile POS touch layouts, POSBilling's internal header must be coordinated with the global shell conventions.

---

## 4. Conclusion

1. **Mobile vs. Desktop Separation**:
   - Cleanly bifurcated at `768px` via `useIsMobile()` and Tailwind's `md:` breakpoint. Desktop elements use `hidden md:flex` / `hidden md:block`; mobile elements use `block md:hidden` / `flex md:hidden`.
2. **Top Mobile Header**:
   - Implement as a dedicated `flex md:hidden items-center justify-between` header strip within `AppLayout.tsx`.
   - Binds to `useOrganization()` for Store Name & Switcher, `src/utils/offlineQueue.ts` / `navigator.onLine` for Live Cloud Sync Status Pill, `setOpenCommand(true)` for Instant Search, `useNetworkInvoices()` (`pendingCount`/`unreadCount`) for Notification Bell, and `useAuth()` / `<DropdownMenu>` for Profile Avatar.
3. **Floating Bottom Navigation Dock**:
   - Refine the existing dock in `AppSidebar.tsx` (or a modular `MobileBottomNav.tsx`) to match the Clean High-Density Retail Minimal standard with 5 touch tabs:
     1. `Home` (`/dashboard`, `LayoutDashboard`)
     2. `Sales` (`/sales`, `Receipt`)
     3. `POS Billing` (`/checkout`, `ShoppingCart` on elevated center pill)
     4. `Items` (`/items`, `Package`)
     5. `Purchases` (`/purchases`, `Truck`)
   - All tabs must satisfy minimum 44×44px touch targets with `active:scale-95`.
4. **Viewport Padding & Safe Area Insets**:
   - Update `<main>` bottom padding in `AppLayout.tsx` to:
     `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`.
   - Maintain `viewport-fit=cover` in `index.html` and `pt-[env(safe-area-inset-top,0px)]` on the header.
5. **Desktop Invariance**:
   - 100% desktop preservation is guaranteed by keeping all `hidden md:flex`, `hidden md:block`, `hidden xl:flex`, and `hidden sm:flex` elements unchanged and strictly isolating new mobile header and dock code.

---

## 5. Verification Method

1. **TypeScript Static Analysis**:
   ```powershell
   node node_modules/typescript/bin/tsc --noEmit
   ```
   *Expected result*: Exits with code 0. (Verified: currently exits 0).

2. **Vitest Unit & Integration Suites**:
   ```powershell
   node node_modules/vitest/vitest.mjs run src/test/MobileInvoiceSuccessView.test.tsx
   ```
   *Expected result*: Exits with code 0 (24/24 tests pass). (Verified: all 24 passed in 6.6s).

3. **DOM Inspection & Breakpoint Verification**:
   - Inspect viewport `< 768px`: Confirm mobile top header and bottom dock render with 5 touch tabs; confirm content container has `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`.
   - Inspect viewport `>= 768px`: Confirm bottom dock is absent; confirm desktop title, subtitle, "SYNC LIVE" pill, ⌘K search bar, Tally Auto Import button, and watermark are 100% visible and functional.
