# Project: CredSmart Mobile View Redesign (Clean High-Density Retail Minimal / Stripe & Shopify POS)

## Architecture
- **Design Aesthetic**: Clean High-Density Retail Minimal (Stripe / Shopify POS style). High-contrast typography, hairline borders (`border-slate-200/80 dark:border-slate-800`), high information density with zero wasted whitespace, crisp monospaced currency formatting (`₹`), refined status pills (emerald for paid, amber for pending, rose for overdue), minimum 44×44px hit targets, tactile feedback (`active:scale-[0.98] transition-transform`).
- **Breakpoint Separation**: Mobile view is strictly isolated at `< 768px` (`isMobile` / `block md:hidden` / `flex md:hidden`). Desktop view (`>= 768px`) is 100% preserved (`hidden md:flex`, `hidden md:block`, `hidden xl:flex`).
- **Safe Area Insets**: Native support for iOS notch/home indicator and Android navigation bars using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **Viewport Layout**: Content container `<main>` has bottom padding `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` ensuring 16-24px breathing room above the floating dock.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Top Mobile Header | Compact header with Store Switcher, Live Sync status pill, Instant Search trigger, Notification bell with unread badge, and Profile Avatar | M1 | survey (shell) |
| 2 | Floating Bottom Navigation Dock | 5 native-feeling touch tabs (`Home`, `Sales`, `POS Billing` center elevated pill, `Items`, `Purchases`) with 44px+ hit targets & haptics | M1 | survey (shell) |
| 3 | Safe Area & Viewport Padding | Main container `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` preventing dock collision | M1 | survey (shell) |
| 4 | Desktop Shell Invariance | Preserve 100% desktop header, 3D perspective wrapper, search bar, and watermark | M1 | survey (shell) |
| 5 | Dynamic Store Greeting & Sync Heartbeat | "Good Morning/Afternoon, [Store]" with animated emerald sync pulse dot and refresh action | M2 | survey (dashboard) |
| 6 | Compact Tally 1-Click Banner | 48px single-row banner with emerald accent, Sparkles badge, and 1-tap "Import" button | M2 | survey (dashboard) |
| 7 | 2x2 High-Density Financial Ledger Grid | Compact grid (~160px) for `TO COLLECT`, `TO PAY`, `CASH & BANK`, and `TODAY'S SALES` | M2 | survey (dashboard) |
| 8 | Horizontal Quick Action Strip | Swipeable chip bar with 44px hit targets (+ Invoice, + Item, + Customer, 📷 Barcode, 📊 Summary) | M2 | survey (dashboard) |
| 9 | Mobile Recent Activity Feed | Transaction cards with party initials avatar, invoice #, status pill, date, and ₹ amount | M2 | survey (dashboard) |
| 10 | Desktop Dashboard Invariance | Isolate mobile view in `MobileDashboardView.tsx` inside `block md:hidden`, leaving desktop lines 100% untouched | M2 | survey (dashboard) |
| 11 | POS 3-Stage Mobile Workflow | Restructure mobile POS from 2 stages into 3 stages: `Catalog / Scan`, `Cart`, `Payment` | M3 | survey (pos) |
| 12 | POS Touch Ergonomics & Hit Targets | Upgrade quantity steppers, delete icons, and action ribbon buttons to >=44×44px hit targets | M3 | survey (pos) |
| 13 | POS Sticky Bottom Bar & Cart Sheet | Persistent bottom bar in Cart with total ₹ and "Proceed to Pay" CTA; full checkout view | M3 | survey (pos) |
| 14 | Desktop POS Invariance | Preserve desktop multi-column POS, tables, and keyboard shortcuts (`hidden lg:flex`) | M3 | survey (pos) |
| 15 | Inventory Mobile Safe-Area Padding | Fix missing bottom padding in `Inventory.tsx` mobile card container (`pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`) | M4 | survey (catalog) |
| 16 | Sales & Items Touch List Polish | Verify 44px hit targets and smooth touch scrolling in `Sales.tsx` and `Items.tsx` | M4 | survey (catalog) |
| 17 | Opaque-Box E2E Mobile Test Suite | Requirement-driven test suite covering shell, navigation, dashboard, and billing across Tiers 1-4 | M5 | survey (tests) |
| 18 | Adversarial Coverage Hardening | White-box stress tests, edge cases, zero tsc errors, and 100% Vitest pass rate | M5 | survey (tests) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Mobile Shell & Floating Navigation Dock | `AppLayout.tsx`, `AppSidebar.tsx`, Top Header, 5-Tab Floating Dock, safe areas | none | PLANNED |
| 2 | M2: Clean High-Density Mobile Dashboard | `MobileDashboardView.tsx`, 2x2 Ledger Grid, Tally Banner, Quick Actions, Activity Feed | M1 | PLANNED |
| 3 | M3: POS Billing Touch Layout & 3-Stage Workflow | `POSBilling.tsx`, 3-stage mobile workflow, >=44px hit targets, sticky cart bar | M1 | PLANNED |
| 4 | M4: Inventory & Sales Mobile Touch Polish | `Inventory.tsx` padding fix, `Sales.tsx` and `Items.tsx` touch polish | M1 | PLANNED |
| 5 | M5: Dual-Track E2E Test Suite & Adversarial Hardening | Requirement-driven E2E tests, zero tsc errors, 100% Vitest suites passing | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. AppLayout ↔ Top Mobile Header
- Store identity: `org?.name` from `useOrganization()`.
- Sync status: `navigator.onLine` & `getOfflineQueueCount()` from `src/utils/offlineQueue.ts`.
- Search trigger: `setOpenCommand(true)`.
- Notifications: `pendingCount` & `unreadCount` from `useNetworkInvoices()`.
- Profile: `useAuth()`, `organizations`, `switchOrganization`, `signOut`.

### 2. AppSidebar / Navigation ↔ Floating Bottom Dock
- 5 Touch Tabs:
  1. `Home`: `ROUTE_PATHS.dashboard` (`/dashboard`), icon: `LayoutDashboard`
  2. `Sales`: `ROUTE_PATHS.sales` (`/sales`), icon: `Receipt`
  3. `POS Billing`: `ROUTE_PATHS.checkout` (`/checkout`), icon: `ShoppingCart` (elevated center pill)
  4. `Items`: `ROUTE_PATHS.items` (`/items`), icon: `Package`
  5. `Purchases`: `ROUTE_PATHS.purchases` (`/purchases`), icon: `Truck`
- Touch targets: `min-h-[48px]`, `active:scale-[0.98] transition-transform`.

### 3. Dashboard.tsx ↔ MobileDashboardView.tsx
```typescript
export interface MobileDashboardViewProps {
  storeName: string;
  lastUpdate: string;
  loading: boolean;
  onRefresh: () => void;
  toCollect: number;
  toPay: number;
  cashBankBalance: number;
  todaySalesTotal: number;
  todaySalesCount: number;
  customerCount: number;
  supplierCount: number;
  latestTransactions: TransactionRow[];
  onOpenSalesInvoice: () => void;
  onOpenCreateItem: () => void;
  onOpenCreateParty: () => void;
  onNavigate: (path: string) => void;
}
```

### 4. POS Billing Mobile Stages
```typescript
type POSMobileStage = "catalog" | "cart" | "checkout";
```

## Code Layout
- `src/components/AppLayout.tsx` — Global shell, top mobile header, safe-area content container
- `src/components/AppSidebar.tsx` — Floating bottom navigation dock (5 touch tabs)
- `src/components/dashboard/MobileDashboardView.tsx` — High-density retail minimal mobile dashboard
- `src/pages/Dashboard.tsx` — Page wrapper integrating `MobileDashboardView` (`block md:hidden`) while preserving desktop layout (`hidden md:flex`)
- `src/pages/POSBilling.tsx` — POS billing terminal with 3-stage mobile workflow
- `src/pages/Inventory.tsx` — Inventory page with mobile safe-area padding fix
- `src/pages/Sales.tsx` — Sales transactions list with mobile touch cards
- `src/test/mobileViewRedesign.test.tsx` — Opaque-box E2E test suite for mobile redesign
