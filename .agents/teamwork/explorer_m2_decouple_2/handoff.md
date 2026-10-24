# Handoff Report: AppLayout Top Header & Viewport Shell Integration

## 1. Observation

### Current Implementation in `src/components/AppLayout.tsx`
- **Root Layout Shell** (line 370):
  ```tsx
  <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
  ```
- **Header Brand & Logo** (lines 380–390):
  - Currently links unconditionally to `ROUTE_PATHS.dashboard` (`/billing/dashboard` or `/dashboard`).
  ```tsx
  <NavLink
    to={ROUTE_PATHS.dashboard}
    title="CredSmart Dashboard"
    className="flex items-center rounded-lg sm:rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer hover-3d-glow py-0.5 sm:py-1 shrink-0"
  >
    <img
      src="./logo-static.jpeg"
      alt="CredSmart"
      className="h-8 xs:h-9 sm:h-12 md:h-14 lg:h-15 w-auto max-w-[95px] xs:max-w-[115px] sm:max-w-[240px] md:max-w-[300px] lg:max-w-[360px] object-contain rounded-md sm:rounded-xl drop-shadow-xs sm:drop-shadow-md"
    />
  </NavLink>
  ```
- **Sidebar Dropdown Toggle Button** (lines 393–412):
  - Renders a chevron button next to the logo controlling `sidebarOpen`.
- **Top Header Actions** (lines 456–518):
  - **Tally Auto Import Button** (lines 456–465): Unconditionally rendered on `sm:` viewports regardless of suite (`onClick={() => navigate(ROUTE_PATHS.tallyImport)}`).
  - **New Invoice Split Button** (lines 467–518): Unconditionally rendered with amber styling (`glowing-btn-amber`), offering retail creation options (`party`, `item`, `sales_invoice`, `pos_billing`, `quotation`, `payment_in`, `purchase`, `payment_out`, `expense`). In the CRM suite, this ERP/billing button is completely out of place.
- **Page Metadata & Title** (lines 81–231, 419–430):
  - `getPageMeta(location.pathname)` resolves `{ title, subtitle }`.
  - Lines 214–225 handle `/crm/roles` and `/crm`, but catch all other CRM routes under a generic `"CRM Command Center"` fallback, failing to present dedicated titles for Attendance, Salary/Payroll, Tasks, Video Meet, Broadcasts, AI Assistant, and Support.
- **Main Viewport & Safe-Area Padding** (lines 742–754):
  - Perspective wrapper (line 743): `className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-100 dark:bg-[#02010A]"`
  - Safe-area bottom padding (lines 752–753):
    ```tsx
    isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
    isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
    ```

### Strict Test Regex Assertions in `src/test/mobileErgonomicsChallenger.test.ts`
Lines 181–203 assert exact regex matching against `src/components/AppLayout.tsx`:
1. `expect(content).toMatch(/flex\s+flex-col\s+h-screen\s+w-full\s+overflow-hidden/);`
2. `expect(content).toMatch(/flex-1\s+min-w-0\s+flex\s+flex-col/);`
3. `expect(content).toMatch(/isMobile\s*&&\s*!isPosRoute\s*&&\s*"pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]"/);`
4. `expect(content).toMatch(/isMobile\s*&&\s*isPosRoute\s*&&\s*"pb-\[calc\(4\.75rem\+env\(safe-area-inset-bottom,0px\)\)\]"/);`

### Strict AST / Query Assertions in `src/test/m2GrepAstChallenger.test.ts`
Lines 121–167 assert:
1. `expect(content).not.toMatch(/\.from\(\s*["'`]products["'`]\s*\)/);`
2. `expect(content).not.toMatch(/\.from\(\s*["'`]product_batches["'`]\s*\)/);`
3. `content.includes("productsApi")` must evaluate to `true` for `components/AppLayout.tsx`.

---

## 2. Logic Chain

1. **Suite Detection**:
   - `location.pathname.startsWith("/crm")` accurately identifies whether the current viewport is inside the CredSmart CRM portal (`isCrmSuite === true`) or CredSmart POS & Billing (`isCrmSuite === false`).
2. **SuiteSwitcher Placement**:
   - Positioning `<SuiteSwitcher />` in the top header's left brand container (directly alongside the logo and the mega-menu chevron toggle) provides an intuitive, high-visibility launcher that allows users to seamlessly identify and toggle their active operational hub.
3. **Logo Navigation Decoupling**:
   - Binding the logo's `to` prop to `isCrmSuite ? ROUTE_PATHS.crm : ROUTE_PATHS.billing` ensures clicking the brand logo takes CRM users to `/crm` and Billing users to `/billing` (or `/billing/dashboard`), preventing accidental cross-portal displacement.
4. **Header Action Adaptation**:
   - **POS & Billing Suite (`!isCrmSuite`)**:
     - Keep the Auto Import Tally button.
     - Keep the amber "+ New Invoice" / "+ Bill" split button with retail options.
   - **CRM Suite (`isCrmSuite`)**:
     - Hide the Auto Import Tally button (irrelevant in CRM).
     - Replace "+ New Invoice" with a dedicated blue/indigo "+ Quick Action" split button triggering CRM-specific actions (Clock In/Out, + Create Staff Task, Run Payroll, Start Video Meet, Broadcast Alert, AI Assistant, Role Management).
5. **Metadata Expansion**:
   - Expanding `getPageMeta` to provide tailored titles and subtitles for each of the 9 CRM modules as well as all retail billing modules ensures high-density situational clarity on desktop viewports.
6. **Zero-Collateral Test Invariance**:
   - Maintaining the exact root container class string `flex flex-col h-screen w-full overflow-hidden`, main viewport container `flex-1 min-w-0 flex flex-col`, and safe-area inset padding strings `isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"` and `isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"` ensures 100% compliance with `mobileErgonomicsChallenger.test.ts`.

---

## 3. Caveats

1. **Protected Create Invoice Flow**:
   - `src/components/SalesInvoiceModal.tsx`, `src/components/invoices/mobile/MobileCreateInvoice.tsx`, and associated modal items must NOT be altered or moved.
2. **Cashier Role Restriction**:
   - Cashiers (`userRole === "cashier"`) are strictly locked out of `/crm/*`. If a cashier is logged in, CRM quick actions and CRM navigation must never be accessible.
3. **Regex Invariants**:
   - Do NOT modify indentation or line-breaks in the safe-area padding lines (lines 752–753) or root wrapper classes, as `mobileErgonomicsChallenger.test.ts` executes strict regex evaluations against `AppLayout.tsx`.
4. **Products API AST Scanner**:
   - Do NOT remove `productsApi` references from `AppLayout.tsx`, as `m2GrepAstChallenger.test.ts` validates its presence.

---

## 4. Conclusion & Concrete Implementation Specifications for Worker M2

### 4.1 Required Imports Update (`src/components/AppLayout.tsx`)
Add imports for `SuiteSwitcher`, additional Lucide icons for CRM quick actions, and route constants:

```tsx
import { SuiteSwitcher } from "@/components/SuiteSwitcher";
import {
  Plus,
  Search,
  HelpCircle,
  Bell,
  Sparkles,
  ShoppingCart,
  Package,
  PackagePlus,
  Users2,
  Users,
  UserPlus,
  UserCircle,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Check,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  CreditCard,
  // CRM Quick Action Icons:
  CalendarCheck,
  CheckSquare,
  Wallet,
  Video,
  Radio,
  Bot,
  LifeBuoy,
  Shield,
} from "lucide-react";
```

### 4.2 Comprehensive Page Metadata Specification (`getPageMeta`)
Replace lines 81–231 with the decoupled metadata resolver:

```tsx
function getPageMeta(pathname: string): PageMeta {
  // CRM Portal Routes
  if (pathname === ROUTE_PATHS.crm || pathname === "/crm" || pathname === "/crm/dashboard") {
    return {
      title: "CRM Command Center",
      subtitle: "Unified workforce, staff attendance, task boards, and company operations",
    };
  }
  if (pathname === ROUTE_PATHS.crmAttendance || pathname === "/crm/attendance") {
    return {
      title: "Attendance & Geofence",
      subtitle: "Real-time GPS geofenced clock-in, shift tracking, and daily rosters",
    };
  }
  if (pathname === ROUTE_PATHS.crmSalary || pathname === "/crm/salary") {
    return {
      title: "Salary & Payroll Engine",
      subtitle: "Staff compensation profiles, monthly payroll runs, advances, and payslips",
    };
  }
  if (pathname === ROUTE_PATHS.crmTasks || pathname === "/crm/tasks") {
    return {
      title: "Enterprise Task Management",
      subtitle: "Assign tasks, track Kanban stages, review proofs, and audit approvals",
    };
  }
  if (pathname === ROUTE_PATHS.crmRoles || pathname === "/crm/roles") {
    return {
      title: "CRM Role & Permission Manager",
      subtitle: "Configure custom roles, granular module permissions, and staff assignments",
    };
  }
  if (pathname === ROUTE_PATHS.crmMeet || pathname === "/crm/meet") {
    return {
      title: "CredSmart Video Meet",
      subtitle: "Host instant video huddles, team scrums, and multi-user conferences",
    };
  }
  if (pathname === ROUTE_PATHS.crmBroadcasts || pathname === "/crm/broadcasts") {
    return {
      title: "Company Broadcasts",
      subtitle: "Dispatch storewide announcements, urgent alerts, and workforce bulletins",
    };
  }
  if (pathname === ROUTE_PATHS.crmAiAssistant || pathname === "/crm/ai-assistant") {
    return {
      title: "CRM AI Assistant",
      subtitle: "Conversational business intelligence, policy queries, and automated workflows",
    };
  }
  if (pathname === ROUTE_PATHS.crmSupport || pathname === "/crm/support") {
    return {
      title: "Support & Helpdesk",
      subtitle: "Internal workforce ticketing, bug tracking, and staff technical support",
    };
  }

  // POS & Billing Portal Routes
  if (
    pathname === ROUTE_PATHS.billing ||
    pathname === ROUTE_PATHS.dashboard ||
    pathname === "/billing" ||
    pathname === "/billing/dashboard" ||
    pathname === "/"
  ) {
    return {
      title: "Dashboard",
      subtitle: "Real-time store overview, key metrics, and daily performance",
    };
  }
  if (pathname === ROUTE_PATHS.checkout || pathname === ROUTE_PATHS.pos) {
    return {
      title: "POS Billing & Checkout",
      subtitle: "Fast checkout, barcode scan & instant invoice generation",
    };
  }
  if (pathname === ROUTE_PATHS.parties) {
    return {
      title: "Parties & SharedLedger Hub",
      subtitle: "Customers, suppliers, balances, and real-time SharedLedger synchronization",
    };
  }
  if (pathname === ROUTE_PATHS.customers) {
    return {
      title: "Customer Ledger (Udhar Khata)",
      subtitle: "Track credit balances, customer khata, and payment receipts",
    };
  }
  if (pathname === ROUTE_PATHS.suppliers) {
    return {
      title: "Supplier Ledger & Payables",
      subtitle: "Manage vendor accounts, purchase bills, and pending payouts",
    };
  }
  if (pathname === ROUTE_PATHS.items) {
    return {
      title: "Items Master Catalog",
      subtitle: "Manage products, barcodes, GST rates, and categories",
    };
  }
  if (pathname === ROUTE_PATHS.inventory) {
    return {
      title: "Inventory Management",
      subtitle: "Live stock levels, low-stock warnings, and stock adjustments",
    };
  }
  if (pathname === ROUTE_PATHS.godown) {
    return {
      title: "Godown & Multi-Warehouse Hub",
      subtitle: "Multi-warehouse tracking, capacity metrics, and stock transfers",
    };
  }
  if (pathname === ROUTE_PATHS.barcode) {
    return {
      title: "Barcode Label Generator",
      subtitle: "Design and print custom product barcode stickers",
    };
  }
  if (pathname === ROUTE_PATHS.sales) {
    return {
      title: "Sales Hub & Invoices",
      subtitle: "Tax invoices, quotations, delivery challans, and credit notes",
    };
  }
  if (pathname === ROUTE_PATHS.salesHistory) {
    return {
      title: "Sales & Invoicing History",
      subtitle: "Search, filter, reprint, and track customer transactions",
    };
  }
  if (pathname === ROUTE_PATHS.purchases) {
    return {
      title: "Purchase Hub & Bills",
      subtitle: "Vendor purchases, inward items, debit notes, and payment out",
    };
  }
  if (pathname === ROUTE_PATHS.purchaseReturns) {
    return {
      title: "Purchase Returns & Debit Notes",
      subtitle: "Manage inward returns, debit vouchers, and vendor refunds",
    };
  }
  if (pathname === ROUTE_PATHS.discovery) {
    return {
      title: "Verified B2B Vendor Discovery",
      subtitle: "Direct wholesale prices from verified manufacturers and distributors",
    };
  }
  if (pathname === ROUTE_PATHS.reports) {
    return {
      title: "Financial & Tax Reports",
      subtitle: "GSTR-1, GSTR-3B, Profit & Loss, Balance Sheet, and Tax Audit books",
    };
  }
  if (pathname === ROUTE_PATHS.analytics) {
    return {
      title: "Business Analytics & Insights",
      subtitle: "Revenue trends, product velocities, profit margins, and AI forecasts",
    };
  }
  if (pathname === ROUTE_PATHS.cashBank) {
    return {
      title: "Cash & Bank Accounts",
      subtitle: "Bank ledgers, cash drawer balance, contra entries, and reconciliations",
    };
  }
  if (pathname === ROUTE_PATHS.expenses) {
    return {
      title: "Expenses & Petty Cash",
      subtitle: "Direct/indirect business expenses, vouchers, and category tracking",
    };
  }
  if (pathname === ROUTE_PATHS.eInvoicing) {
    return {
      title: "E-Invoicing & E-Way Bills",
      subtitle: "Government IRP IRN generation and instant NIC e-way bill synchronization",
    };
  }
  if (pathname === ROUTE_PATHS.ewayBill) {
    return {
      title: "E-Way Bills Portal",
      subtitle: "Consignment tracking, distance validation, and e-way bill generation",
    };
  }
  if (pathname === ROUTE_PATHS.automatedBills) {
    return {
      title: "Automated Recurring Bills",
      subtitle: "Subscription invoices, automated rent/retainer schedules, and WhatsApp alerts",
    };
  }
  if (pathname === ROUTE_PATHS.staff) {
    return {
      title: "Staff & Counter Roles",
      subtitle: "Multi-user access control, salesman assignments, and cash limits",
    };
  }
  if (pathname === ROUTE_PATHS.activityLog) {
    return {
      title: "System Audit & Activity Trail",
      subtitle: "Cryptographic event log, modified records, and deleted bill tracking",
    };
  }
  if (pathname === ROUTE_PATHS.businessSettings) {
    return {
      title: "Business Profile Settings",
      subtitle: "Store name, GSTIN, bank details, and business branch setup",
    };
  }
  if (pathname === ROUTE_PATHS.invoiceSettings) {
    return {
      title: "Invoice & Theme Customizer",
      subtitle: "Live preview, color palettes, custom terms, and branding",
    };
  }
  if (pathname === ROUTE_PATHS.printSettings) {
    return {
      title: "Print Settings",
      subtitle: "Configure thermal printer, barcode hardware, and digital scales",
    };
  }
  if (pathname === ROUTE_PATHS.tallyImport) {
    return {
      title: "Auto Import (Tally / Excel)",
      subtitle: "Synchronize vouchers, ledgers, inventory, and opening balances",
    };
  }

  if (pathname.startsWith("/crm")) {
    return {
      title: "CredSmart CRM",
      subtitle: "Enterprise Workforce & Operations Platform",
    };
  }

  return {
    title: "CredSmart POS & Billing",
    subtitle: "Enterprise Retail Management System",
  };
}
```

### 4.3 Component State Updates
In `AppLayout()`:
```tsx
const [crmActionMenuOpen, setCrmActionMenuOpen] = useState(false);
const isCrmSuite = location.pathname.startsWith("/crm");
```

### 4.4 Top Header Left Section: Logo Link & Suite Switcher Placement
Replace lines 379–413 with:
```tsx
            {/* LEFT: Logo + Dropdown Arrow + Suite Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
              <NavLink
                to={isCrmSuite ? ROUTE_PATHS.crm : ROUTE_PATHS.billing}
                title={isCrmSuite ? "CredSmart CRM Command Center" : "CredSmart POS & Billing"}
                className="flex items-center rounded-lg sm:rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer hover-3d-glow py-0.5 sm:py-1 shrink-0"
              >
                <img
                  src="./logo-static.jpeg"
                  alt="CredSmart"
                  className="h-8 xs:h-9 sm:h-12 md:h-14 lg:h-15 w-auto max-w-[95px] xs:max-w-[115px] sm:max-w-[240px] md:max-w-[300px] lg:max-w-[360px] object-contain rounded-md sm:rounded-xl drop-shadow-xs sm:drop-shadow-md"
                />
              </NavLink>

              {/* Dropdown toggle arrow (mega-menu trigger) */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Close Menu" : "Open Menu"}
                className={cn(
                  "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-10 md:h-10.5 px-0 sm:px-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider cursor-pointer border transition-all duration-200 select-none shadow-2xs shrink-0",
                  sidebarOpen
                    ? "bg-amber-500/15 border-amber-400/50 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : "bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400/50 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800"
                )}
              >
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] transition-transform duration-300",
                    sidebarOpen ? "rotate-180 text-amber-500" : ""
                  )}
                />
              </button>

              {/* Top-Level Interactive Suite Switcher */}
              <SuiteSwitcher />
            </div>
```

### 4.5 Top Header Right Section: Adaptive Action Buttons
Replace lines 455–519 with the suite-adaptive action block:
```tsx
              {/* Tally Auto Import Button — Visible only in POS & Billing suite */}
              {!isCrmSuite && (
                <button
                  type="button"
                  onClick={() => navigate(ROUTE_PATHS.tallyImport)}
                  className="hidden sm:flex items-center gap-1.5 h-9 sm:h-10 md:h-10.5 px-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600/15 via-teal-600/15 to-emerald-600/15 hover:from-emerald-600/25 hover:to-teal-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-xs font-black transition-all cursor-pointer hover-3d-glow shrink-0 shadow-2xs"
                  title="Auto Search Tally Folder & Import All Data"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Auto Import Tally</span>
                </button>
              )}

              {/* Action Split Button — Adaptive for Billing vs CRM */}
              {!isCrmSuite ? (
                /* Billing Suite: New Invoice split button */
                <DropdownMenu open={newInvoiceMenuOpen} onOpenChange={setNewInvoiceMenuOpen}>
                  <div className="flex items-center h-8 sm:h-10 md:h-10.5 rounded-lg sm:rounded-xl glowing-btn-amber shadow-2xs select-none shrink-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSalesInvoiceModalOpen(true)}
                      className="flex items-center gap-1 sm:gap-1.5 h-full px-2 sm:px-3.5 text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer hover-3d-glow"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">New Invoice</span>
                      <span className="sm:hidden text-[11px] font-bold whitespace-nowrap">Bill</span>
                    </button>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center h-full px-1.5 sm:px-2 border-l border-white/20 hover:bg-white/15 text-white transition-colors cursor-pointer hover-3d-glow"
                        aria-label="More creation options"
                      >
                        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white dark:bg-[#0F0E38] border border-slate-200 dark:border-[#2B277A] text-slate-700 dark:text-slate-200 p-2 shadow-2xl rounded-2xl z-dropdown animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
                    <div className="px-2 pb-1.5 border-b border-slate-100 dark:border-[#1F1C5C]">
                      <button
                        type="button"
                        onClick={() => {
                          setNewInvoiceMenuOpen(false);
                          setQuickCreateModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors border border-indigo-200 dark:border-indigo-700/40 cursor-pointer hover-3d-glow"
                      >
                        <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /><span>All Creation Options</span></div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono font-bold uppercase">Hub</span>
                      </button>
                    </div>
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 pt-2 pb-1">MASTER DATA</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleQuickAction("party")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><UserPlus className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" /><span>Create Party</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("item")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><PackagePlus className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" /><span>Create Item</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setNewInvoiceMenuOpen(false); navigate(ROUTE_PATHS.tallyImport); }} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-800 dark:hover:text-amber-200 rounded-xl cursor-pointer font-semibold hover-3d-glow"><FileSpreadsheet className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" /><span>Import Data (Tally / Excel)</span></DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-[#1F1C5C] my-1" />
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">SALES</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleQuickAction("sales_invoice")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-800 dark:hover:text-cyan-200 rounded-xl cursor-pointer font-semibold hover-3d-glow"><FileText className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" /><span>Sales Invoice</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("pos_billing")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-800 rounded-xl cursor-pointer font-semibold hover-3d-glow"><ShoppingCart className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /><span>POS Billing (Fast)</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("quotation")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" /><span>Quotation / Estimate</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("payment_in")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><Receipt className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" /><span>Payment In</span></DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-[#1F1C5C] my-1" />
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">PURCHASES & EXPENSES</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleQuickAction("purchase")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><Truck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" /><span>Purchase Bill</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("payment_out")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><CreditCard className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" /><span>Payment Out</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleQuickAction("expense")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"><Receipt className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" /><span>Record Expense</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* CRM Suite: CRM Quick Action split button */
                <DropdownMenu open={crmActionMenuOpen} onOpenChange={setCrmActionMenuOpen}>
                  <div className="flex items-center h-8 sm:h-10 md:h-10.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs select-none shrink-0 overflow-hidden hover:brightness-105 transition-all">
                    <button
                      type="button"
                      onClick={() => navigate(ROUTE_PATHS.crmTasks)}
                      className="flex items-center gap-1 sm:gap-1.5 h-full px-2 sm:px-3.5 text-white text-xs font-bold active:scale-[0.98] transition-all cursor-pointer hover-3d-glow"
                      title="Create New CRM Task"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Quick Action</span>
                      <span className="sm:hidden text-[11px] font-bold whitespace-nowrap">Action</span>
                    </button>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center h-full px-1.5 sm:px-2 border-l border-white/20 hover:bg-white/15 text-white transition-colors cursor-pointer hover-3d-glow"
                        aria-label="More CRM actions"
                      >
                        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 p-2 shadow-2xl rounded-2xl z-dropdown animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 pt-2 pb-1">
                      WORKFORCE & OPERATIONS
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmAttendance); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Clock In / Attendance</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmTasks); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl cursor-pointer font-semibold"
                    >
                      <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>+ Create Staff Task</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmSalary); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Run Payroll / Payslips</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                      COMMUNICATIONS
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmMeet); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <Video className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Start Video Meet</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmBroadcasts); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <Radio className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Post Broadcast Alert</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmAiAssistant); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <Bot className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>CRM AI Assistant</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                    <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                      GOVERNANCE
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmRoles); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Staff Roles &amp; Permissions</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmSupport); }}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                    >
                      <LifeBuoy className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span>Support &amp; Helpdesk</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
```

### 4.6 Strict Invariant Lines Verification Check
Worker M2 MUST verify that lines 370 and lines 742–754 in `src/components/AppLayout.tsx` are untouched:
```tsx
// MUST REMAIN EXACT (Line 370):
<div className="flex flex-col h-screen w-full overflow-hidden bg-background">

// MUST REMAIN EXACT (Lines 742-745):
<div 
  className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-100 dark:bg-[#02010A]"
  style={{ perspective: "2000px" }}
>

// MUST REMAIN EXACT (Lines 752-753):
isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
```

---

## 5. Verification Method

To verify these recommendations independently, execute the following commands:

1. **Mobile Ergonomics Challenger Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/mobileErgonomicsChallenger.test.ts
   ```
   *Expected Result*: 14/14 tests pass cleanly, confirming `flex flex-col h-screen w-full overflow-hidden`, `flex-1 min-w-0 flex flex-col`, and safe area inset paddings are preserved verbatim.

2. **Decouple Shells E2E Suite**:
   ```powershell
   cmd /c npx vitest run src/test/e2e/decoupleShells.test.tsx
   ```
   *Expected Result*: 45/45 tests pass cleanly across Tiers 1–3.

3. **AST / Direct Query Safeguard**:
   ```powershell
   cmd /c npx vitest run src/test/m2GrepAstChallenger.test.ts
   ```
   *Expected Result*: Passes code 0, confirming `productsApi` is retained and no `.from("products")` table queries exist.

4. **CRM Shell Routes & Navigation Audit**:
   ```powershell
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmShellNavigation.audit.test.ts
   ```
   *Expected Result*: 30/30 tests pass cleanly.

5. **TypeScript Compilation**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected Result*: Code 0, zero errors.

### Invalidation Conditions
- Any changes altering the character sequence of lines 370 or 752–753 in `AppLayout.tsx`.
- Modifying Create Invoice protected components (`SalesInvoiceModal.tsx`, `MobileCreateInvoice.tsx`).
- Removing `productsApi` references or reintroducing direct Supabase table queries.
