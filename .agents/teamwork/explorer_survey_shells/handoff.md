# Handoff Report: Navigation Shells, Sidebars, Mobile Dock & Suite Switcher Architecture

## 1. Observation

### Current Layout & Header Implementation (`src/components/AppLayout.tsx`)
- **Root Layout Shell** (lines 370–780): A single monolithic layout wrapper `AppLayout` encloses all protected application routes.
  - Viewport definition (line 370): `<div className="flex flex-col h-screen w-full overflow-hidden bg-background">`
  - Offline banner (line 372): `<OfflineSyncBanner />`
  - Global Top Header (lines 376–642): Visible when `!isPosRoute`.
    - **Header Brand & Logo** (lines 380–390): Links unconditionally to `ROUTE_PATHS.dashboard` (`/dashboard`).
    - **Sidebar Toggle Button** (lines 393–412): Chevron down button toggles `sidebarOpen` state, controlling a 3D perspective popover.
    - **Page Metadata & Title** (lines 81–231, 419–430): `getPageMeta(location.pathname)` dynamically computes `{ title, subtitle }`. Lines 214–225 handle `/crm/roles` and `/crm`, but lack dedicated entries for other CRM submodules (`/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/support`).
    - **Global Search Bar** (lines 433–442): `⌘K` triggers `<CommandDialog>`, which iterates through `NAV_ROUTES`.
    - **Top Header Actions** (lines 445–641):
      - Line 456: Auto Import Tally button (`ROUTE_PATHS.tallyImport`).
      - Lines 467–518: `New Invoice` amber split button with quick creation menu strictly for retail/ERP entities (Party, Item, Tally, Sales Invoice, POS Billing, Quotation, Payment In, Purchase Bill, Payment Out, Expense). This button renders unconditionally even when viewing CRM pages.
      - Lines 521–563: Bell icon triggering `NotificationCenter`.
      - Lines 566–640: User Profile & Multi-Business switcher dropdown (`switchOrganization`).
  - **Mega-Menu Popover / Sidebar Invocation** (lines 736–739):
    ```tsx
    <AppSidebar
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
    />
    ```
  - **3D Main Viewport** (lines 742–780):
    - Perspective wrapper: `style={{ perspective: "2000px" }}`
    - Main container: `className={cn("flex-1 min-w-0 flex flex-col ...")}`
    - Safe-area bottom padding (lines 752–753):
      ```tsx
      isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
      isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
      ```
    - Tilts back when `sidebarOpen && !isMobile` (`transform: translateY(3rem) scale(0.96) rotateX(3deg)`).

### Current Sidebar & Mobile Dock Implementation (`src/components/AppSidebar.tsx`)
- **Desktop/Tablet Popover Navigation** (lines 312–580):
  - When `isOpen` is true, renders a floating 3D mega-menu popover below the top header (`fixed top-[3.75rem] ... max-w-7xl mx-auto z-[200]`).
  - Iterates over `filteredNavRouteGroups` derived from `NAV_ROUTES` in `src/config/routes.ts`.
- **Mobile Floating Bottom Dock** (lines 200–309):
  - Fixed at screen bottom: `fixed bottom-0 left-0 right-0 z-50 ... pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`.
  - 5 hardcoded tabs:
    1. `Home` (`ROUTE_PATHS.dashboard`)
    2. `Sales` (`ROUTE_PATHS.sales`)
    3. Elevated center `POS Billing` (`ROUTE_PATHS.checkout`) with gradient circle
    4. `Items` (`ROUTE_PATHS.items`)
    5. `Purchases` (`ROUTE_PATHS.purchases`)
  - **No mobile navigation exists for CRM**: On mobile, a user in `/crm` has no bottom dock items for Attendance, Tasks, Payroll, or Roles.

### Current Route & Navigation Group Organization (`src/config/routes.ts`)
- `MAIN_NAV_ROUTES` (lines 327–519) divides the entire application into 4 groups:
  1. `GENERAL`: Dashboard, POS Billing, Parties, Catalog, Sales Hub, Purchase Hub, Reports & Insights.
  2. `ACCOUNTING SOLUTIONS`: Cash & Bank, E-Invoicing, E-Way Billing, Automated Invoices, Expenses & Petty Cash.
  3. `BUSINESS TOOLS`: CRM (with 9 children: Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support, Role Management), Digital Storefront, Staff Permissions, POS Billing Terminal, Activity & Audit Log.
  4. `SETTINGS & APP PREFERENCES`: Business Settings, Invoice & Print Settings, Import Data (Tally & Excel).
- **CRM is completely intermingled**:
  - In `MAIN_NAV_ROUTES`, CRM is merely one sub-item with 9 children inside `BUSINESS TOOLS` (lines 456–472).
  - Billing users see CRM options; CRM users see extensive ERP/billing options.
- **Test Invariant Audits**:
  - `src/test/crmShellRoutes.test.ts` (lines 58, 198, 202, 213, 235) and `src/test/crmShellNavigation.audit.test.ts` (lines 76–98) verify:
    - `NAV_ROUTES === MAIN_NAV_ROUTES`
    - `MAIN_NAV_ROUTES` has a `"BUSINESS TOOLS"` group with an item `"CRM"` having 9 children.
    - `FEATURE_ROUTE_MAP.crm` has all 9 CRM routes.
  - `src/test/mobileErgonomicsChallenger.test.ts` (lines 181–231) verifies exact regex matches in `AppLayout.tsx` and `AppSidebar.tsx`.
  - Current status: **30/30 tests passing**.

---

## 2. Logic Chain

1. **Problem Statement**:
   - The user requested architecturally and visually decoupling CredSmart into two distinct core portals: (1) CredSmart POS & Billing (`/billing/*`) and (2) CredSmart CRM (`/crm/*`), with independent sidebars, dedicated navigation shells, mobile navigation docks, and an intuitive top-level Suite Switcher with active suite badge and persistence in `localStorage` (`credsmart_active_suite`).
2. **Current State Analysis**:
   - `AppLayout.tsx` and `AppSidebar.tsx` currently serve a single blended navigation state where CRM is nested inside ERP `BUSINESS TOOLS`.
   - The top header has no Suite Switcher. It always shows the retail "New Invoice / Bill" split button and links the logo to `/dashboard`.
   - The mobile bottom dock strictly shows POS & Billing routes (Home, Sales, POS Billing, Items, Purchases), leaving CRM mobile users without navigation.
3. **Decoupled Architecture**:
   - **Dedicated Navigation Arrays** in `src/config/routes.ts`:
     - `BILLING_NAV_ROUTES`: 4 groups strictly containing retail POS, billing, inventory, purchases, accounting, reports, store tools, and settings. **0 CRM items**.
     - `CRM_NAV_ROUTES`: 3 groups strictly containing command center, attendance, salary/payroll, tasks, meetings, broadcasts, AI assistant, support desk, and role management. **0 billing items**.
     - `MAIN_NAV_ROUTES`: Retained and exported unchanged for backward compatibility and test assertion parity.
   - **Top-Level Suite Switcher** (`src/components/SuiteSwitcher.tsx`):
     - Interactive component positioned next to the CredSmart logo in the top header.
     - Detects active suite:
       ```typescript
       const isCrmSuite = location.pathname.startsWith("/crm");
       const currentSuite = isCrmSuite ? "crm" : "billing";
       ```
     - Persists to `localStorage.getItem("credsmart_active_suite")` (`"billing"` | `"crm"`).
     - Provides instant 1-tap switching between "CredSmart POS & Billing" and "CredSmart CRM".
     - Triggers standard React Router navigation (`navigate("/billing")` or `navigate("/crm")`).
     - Emits `credsmart:suite_changed` window event.
   - **Adaptive Header**:
     - When active suite is `"billing"`:
       - Logo links to `/billing`.
       - Header subtitle/title focuses on Retail & ERP.
       - Tally Auto Import button is displayed.
       - "+ New Invoice" split button is displayed.
     - When active suite is `"crm"`:
       - Logo links to `/crm`.
       - Header subtitle/title focuses on Workforce & Operations.
       - Tally Auto Import button is hidden.
       - "+ New Invoice" is replaced by "+ Quick Action" (Clock In/Out, + Task, Meet, Broadcast, Add Role).
   - **Adaptive Mobile Bottom Dock**:
     - When on `/billing/*`:
       1. Home (`/billing`)
       2. Sales (`/billing/sales`)
       3. Elevated Center: POS Billing (`/billing/checkout`)
       4. Items (`/billing/items`)
       5. Purchases (`/billing/purchases`)
     - When on `/crm/*`:
       1. Command (`/crm`)
       2. Attendance (`/crm/attendance`)
       3. Elevated Center: Punch / Task (`/crm/attendance` or `/crm/tasks`)
       4. Payroll (`/crm/salary`)
       5. Roles (`/crm/roles`)
     - Both docks adhere strictly to 44px hit targets and safe area inset padding `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`.

---

## 3. Caveats

1. **Protected Create Invoice Flow**:
   - The Create Invoice modals (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) must remain 100% untouched and functional.
2. **Backward Compatibility & Legacy URLs**:
   - Existing paths (`/dashboard`, `/sales`, `/pos`, `/checkout`, `/items`, `/inventory`, `/customers`, etc.) must redirect seamlessly to `/billing/*`.
   - `MAIN_NAV_ROUTES` must remain exported from `src/config/routes.ts` and `src/components/routes.ts` to prevent breaking existing test suites (`crmShellRoutes.test.ts` and `crmShellNavigation.audit.test.ts`).
3. **Static File Regex Matching**:
   - `src/test/mobileErgonomicsChallenger.test.ts` inspects exact strings in `src/components/AppLayout.tsx` and `src/components/AppSidebar.tsx`:
     - `flex flex-col h-screen w-full overflow-hidden`
     - `flex-1 min-w-0 flex flex-col`
     - `isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"`
     - `isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"`
     - `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`
     - `fixed bottom-0 left-0 right-0 z-50`
   - All refactored code MUST retain these exact string literals.

---

## 4. Conclusion & Detailed Design Specifications

### 4.1 Dedicated POS & Billing Navigation Specification
Exported as `BILLING_NAV_ROUTES` from `src/config/routes.ts`:

```typescript
export const BILLING_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "CORE OPERATIONS",
    items: [
      {
        title: "Dashboard",
        url: ROUTE_PATHS.dashboard, // /billing or /billing/dashboard
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+D",
      },
      {
        title: "POS Billing",
        url: ROUTE_PATHS.checkout, // /billing/pos or /billing/checkout
        icon: Monitor,
        mobilePrimary: true,
        badge: "FAST",
        shortcut: "Alt+K",
      },
      {
        title: "Sales Hub",
        url: ROUTE_PATHS.sales, // /billing/sales
        icon: ShoppingCart,
        mobilePrimary: true,
        shortcut: "Alt+S",
        children: [
          { title: "Invoices & Estimates", url: ROUTE_PATHS.sales },
          { title: "Sales History", url: ROUTE_PATHS.salesHistory },
          { title: "E-Way Bills", url: ROUTE_PATHS.ewayBill },
          { title: "POS Terminal", url: ROUTE_PATHS.checkout },
        ],
      },
      {
        title: "Purchase Hub",
        url: ROUTE_PATHS.purchases, // /billing/purchases
        icon: Truck,
        shortcut: "Alt+B",
        children: [
          { title: "Purchase Bills", url: ROUTE_PATHS.purchases },
          { title: "Purchase Returns", url: ROUTE_PATHS.purchaseReturns },
          { title: "Find Vendors", url: ROUTE_PATHS.discovery },
        ],
      },
    ],
  },
  {
    label: "INVENTORY & MASTER DATA",
    items: [
      {
        title: "Items Catalog",
        url: ROUTE_PATHS.items, // /billing/items
        icon: Package,
        mobilePrimary: true,
        shortcut: "Alt+I",
        children: [
          { title: "All Items", url: ROUTE_PATHS.items },
          { title: "Stock Summary", url: ROUTE_PATHS.inventory },
          { title: "Godowns", url: ROUTE_PATHS.godown },
          { title: "Barcode Generator", url: ROUTE_PATHS.barcode },
          { title: "Digital Storefront", url: ROUTE_PATHS.storefront },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Parties & Khata",
        url: ROUTE_PATHS.parties, // /billing/parties
        icon: Users2,
        mobilePrimary: true,
        shortcut: "Alt+P",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers (Udhar)", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
    ],
  },
  {
    label: "FINANCE & GST COMPLIANCE",
    items: [
      {
        title: "Cash & Bank",
        url: ROUTE_PATHS.cashBank,
        icon: Landmark,
      },
      {
        title: "Expenses & Petty Cash",
        url: ROUTE_PATHS.expenses,
        icon: Receipt,
      },
      {
        title: "E-Invoicing",
        url: ROUTE_PATHS.eInvoicing,
        icon: FileCheck,
      },
      {
        title: "Automated Invoices",
        url: ROUTE_PATHS.automatedBills,
        icon: Repeat,
      },
      {
        title: "Reports & Insights",
        url: ROUTE_PATHS.reports,
        icon: BarChart3,
        shortcut: "Alt+R",
        children: [
          { title: "All Reports (GSTR, P&L)", url: ROUTE_PATHS.reports },
          { title: "Business Analytics", url: ROUTE_PATHS.analytics },
        ],
      },
    ],
  },
  {
    label: "STORE TOOLS & SETTINGS",
    items: [
      {
        title: "Auto Import (Tally / Excel)",
        url: ROUTE_PATHS.tallyImport,
        icon: FileSpreadsheet,
        badge: "Tally",
      },
      {
        title: "Store Staff & Counter Roles",
        url: ROUTE_PATHS.staff,
        icon: Users,
      },
      {
        title: "Activity & Audit Log",
        url: ROUTE_PATHS.activityLog,
        icon: Activity,
      },
      {
        title: "Store Settings",
        url: ROUTE_PATHS.businessSettings,
        icon: Settings,
        children: [
          { title: "Business Profile", url: ROUTE_PATHS.businessSettings },
          { title: "Invoice & Theme Settings", url: ROUTE_PATHS.invoiceSettings },
          { title: "Print Settings", url: ROUTE_PATHS.printSettings },
        ],
      },
    ],
  },
];
```

### 4.2 Dedicated CRM Navigation Specification
Exported as `CRM_NAV_ROUTES` from `src/config/routes.ts`:

```typescript
export const CRM_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "COMMAND & WORKFORCE",
    items: [
      {
        title: "Command Center",
        url: ROUTE_PATHS.crm, // /crm
        icon: LayoutDashboard,
        mobilePrimary: true,
      },
      {
        title: "Attendance & Geofence",
        url: ROUTE_PATHS.crmAttendance, // /crm/attendance
        icon: CalendarCheck,
        badge: "GPS",
        mobilePrimary: true,
      },
      {
        title: "Salary & Payroll",
        url: ROUTE_PATHS.crmSalary, // /crm/salary
        icon: Wallet,
        badge: "Payroll",
        mobilePrimary: true,
      },
      {
        title: "Task Management",
        url: ROUTE_PATHS.crmTasks, // /crm/tasks
        icon: CheckSquare,
        badge: "Kanban",
        mobilePrimary: true,
      },
    ],
  },
  {
    label: "COMMUNICATION & COLLABORATION",
    items: [
      {
        title: "CredSmart Meet",
        url: ROUTE_PATHS.crmMeet, // /crm/meet
        icon: Video,
        badge: "Live",
      },
      {
        title: "Live Broadcasts",
        url: ROUTE_PATHS.crmBroadcasts, // /crm/broadcasts
        icon: Radio,
      },
      {
        title: "CRM AI Assistant",
        url: ROUTE_PATHS.crmAiAssistant, // /crm/ai-assistant
        icon: Bot,
        badge: "AI",
      },
    ],
  },
  {
    label: "GOVERNANCE & CUSTOMER CARE",
    items: [
      {
        title: "Support Desk",
        url: ROUTE_PATHS.crmSupport, // /crm/support
        icon: LifeBuoy,
      },
      {
        title: "Role & Permission Manager",
        url: ROUTE_PATHS.crmRoles, // /crm/roles
        icon: Shield,
        badge: "RBAC",
        mobilePrimary: true,
      },
    ],
  },
];
```

### 4.3 Interactive Suite Switcher Component Specification (`src/components/SuiteSwitcher.tsx`)
```typescript
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Users2, Check, ChevronsUpDown, Sparkles, Store, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type CredSmartSuite = "billing" | "crm";
export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";

export function getActiveSuite(pathname: string): CredSmartSuite {
  if (pathname.startsWith("/crm")) {
    return "crm";
  }
  return "billing";
}

export function SuiteSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSuite = getActiveSuite(location.pathname);
  const [open, setOpen] = useState(false);

  // Sync to localStorage on route change
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, activeSuite);
    } catch {
      // ignore
    }
  }, [activeSuite]);

  const handleSwitchSuite = (targetSuite: CredSmartSuite) => {
    setOpen(false);
    if (targetSuite === activeSuite) return;

    try {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, targetSuite);
      window.dispatchEvent(new CustomEvent("credsmart:suite_changed", { detail: { suite: targetSuite } }));
    } catch {
      // ignore
    }

    if (targetSuite === "crm") {
      navigate("/crm");
      toast.success("Switched to CredSmart CRM");
    } else {
      navigate("/billing");
      toast.success("Switched to CredSmart POS & Billing");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch CredSmart Suite"
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 md:h-9.5 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs hover:scale-[1.02] active:scale-[0.98]",
            activeSuite === "crm"
              ? "bg-blue-50/80 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-[0_0_12px_rgba(29,78,216,0.15)]"
              : "bg-amber-50/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          )}
        >
          {activeSuite === "crm" ? (
            <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Users2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="hidden xs:flex flex-col text-left leading-tight">
            <span className="text-[11px] sm:text-xs font-black tracking-tight">
              {activeSuite === "crm" ? "CRM" : "POS & Billing"}
            </span>
            <span className="text-[9px] font-mono opacity-70">Suite Switcher</span>
          </div>

          <ChevronsUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-72 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-dropdown">
        <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
          AVAILABLE SUITES
        </DropdownMenuLabel>

        {/* Option 1: POS & Billing */}
        <DropdownMenuItem
          onClick={() => handleSwitchSuite("billing")}
          className={cn(
            "flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border",
            activeSuite === "billing"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200"
              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">POS & Billing</span>
              {activeSuite === "billing" && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Checkout, invoices, inventory & Tally
            </p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-slate-800" />

        {/* Option 2: CRM */}
        <DropdownMenuItem
          onClick={() => handleSwitchSuite("crm")}
          className={cn(
            "flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border",
            activeSuite === "crm"
              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200"
              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">CredSmart CRM</span>
              {activeSuite === "crm" && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Attendance, payroll, tasks & roles
            </p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4.4 Adaptive Mobile Bottom Dock Specification
In `src/components/AppSidebar.tsx`, the bottom dock renders:
```tsx
{isMobile && (
  <nav
    className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
    aria-label="Mobile Bottom Navigation"
  >
    {isCrmSuite ? (
      <>
        {/* CRM Tab 1: Command */}
        <NavLink to={ROUTE_PATHS.crm} end className={...}>
          <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
          <span>Command</span>
        </NavLink>
        {/* CRM Tab 2: Attendance */}
        <NavLink to={ROUTE_PATHS.crmAttendance} className={...}>
          <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
          <span>Attendance</span>
        </NavLink>
        {/* CRM Tab 3: Elevated Center Action (Punch / Tasks) */}
        <NavLink to={ROUTE_PATHS.crmAttendance} className="-mt-5 px-1.5 z-10 ...">
          <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center ring-4 ring-white bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-xl">
            <CheckSquare className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span>Punch / Task</span>
        </NavLink>
        {/* CRM Tab 4: Salary */}
        <NavLink to={ROUTE_PATHS.crmSalary} className={...}>
          <Wallet className="w-5 h-5 stroke-[2.2]" />
          <span>Payroll</span>
        </NavLink>
        {/* CRM Tab 5: Roles */}
        <NavLink to={ROUTE_PATHS.crmRoles} className={...}>
          <Shield className="w-5 h-5 stroke-[2.2]" />
          <span>Roles</span>
        </NavLink>
      </>
    ) : (
      <>
        {/* Existing Billing Bottom Dock (Home, Sales, Elevated Center POS, Items, Purchases) */}
        {/* Retains exact existing styling, touch targets, and icons */}
      </>
    )}
  </nav>
)}
```

---

## 5. Verification Method

1. **Static TypeScript Compilation**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Code 0, 0 compiler errors.

2. **Automated Vitest Test Suites**:
   ```powershell
   cmd /c npx vitest run src/test/crmShellNavigation.audit.test.ts src/test/crmShellRoutes.test.ts src/test/mobileErgonomicsChallenger.test.ts
   ```
   *Expected*: All test suites pass 100%.

3. **Production Build Integrity**:
   ```powershell
   cmd /c npm run build
   ```
   *Expected*: Generates production bundle with 0 errors.

4. **Invalidation Conditions**:
   - Any CRM item remaining in `BILLING_NAV_ROUTES` or any billing item appearing in `CRM_NAV_ROUTES`.
   - Modifying or breaking Create Invoice flows (`SalesInvoiceModal.tsx`, `MobileCreateInvoice.tsx`).
   - Breaking the safe area inset bottom padding in `AppLayout.tsx` or `AppSidebar.tsx`.
