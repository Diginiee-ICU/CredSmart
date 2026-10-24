import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users2,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Landmark,
  FileCheck,
  Repeat,
  Receipt,
  Monitor,
  CalendarCheck,
  Settings,
  Warehouse,
  FileSpreadsheet,
  RotateCcw,
  Barcode,
  History,
  UserCircle,
  Users,
  Activity,
  FileText,
  Store,
  Briefcase,
  CheckSquare,
  Wallet,
  Video,
  Radio,
  Bot,
  LifeBuoy,
  Shield,
} from "lucide-react";

export const ROUTE_PATHS = {
  // Public & Marketing
  landing: "/",
  auth: "/auth",
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
  features: "/features",
  pricing: "/pricing",
  gstBillingGuide: "/gst-billing-guide",
  compareVyapar: "/compare-vyapar",
  compareMyBillBook: "/compare-mybillbook",
  compareTally: "/compare-tally",
  barcodeGuide: "/barcode-generator-guide",
  eInvoicingGuide: "/e-invoicing-guide",
  about: "/about",
  contact: "/contact",
  security: "/security",
  faq: "/faq",
  publicStorefront: "/store/:slug",
  publicCatalogue: "/catalogue/:slug",
  publicCatalogueShort: "/c/:slug",

  // POS & Billing Portal Root
  billing: "/billing",

  // POS & Billing ERP Features (mapped under /billing/*)
  dashboard: "/billing/dashboard",
  parties: "/billing/parties",
  customers: "/billing/customers",
  customerLedger: "/billing/customers/:id/ledger",
  suppliers: "/billing/suppliers",

  storefront: "/billing/storefront",
  items: "/billing/items",
  inventory: "/billing/inventory",
  godown: "/billing/godown",
  barcode: "/billing/barcode",

  sales: "/billing/sales",
  salesHistory: "/billing/sales-history",
  checkout: "/billing/checkout",
  pos: "/billing/pos",

  purchases: "/billing/purchases",
  purchaseReturns: "/billing/purchase-returns",
  discovery: "/billing/discovery",
  vendorDiscovery: "/billing/discovery",

  reports: "/billing/reports",
  analytics: "/billing/analytics",

  // Accounting Solutions (mapped under /billing/*)
  cashBank: "/billing/cash-bank",
  eInvoicing: "/billing/e-invoicing",
  ewayBill: "/billing/eway-bill",
  automatedBills: "/billing/automated-bills",
  expenses: "/billing/expenses",

  // Business Tools (mapped under /billing/*)
  staff: "/billing/staff",
  activityLog: "/billing/activity-log",

  // CRM Command Center & Submodules (strictly /crm/*)
  crm: "/crm",
  crmDashboard: "/crm",
  crmAttendance: "/crm/attendance",
  crmSalary: "/crm/salary",
  crmTasks: "/crm/tasks",
  crmMeet: "/crm/meet",
  crmBroadcasts: "/crm/broadcasts",
  crmAiAssistant: "/crm/ai-assistant",
  crmSupport: "/crm/support",
  crmRoles: "/crm/roles",

  // Settings & Help (mapped under /billing/*)
  settings: "/billing/settings",
  businessSettings: "/billing/settings/business",
  invoiceSettings: "/billing/settings/invoice",
  printSettings: "/billing/settings/print",
  settingsReminders: "/billing/settings/reminders",
  settingsCaSharing: "/billing/settings/ca-sharing",
  settingsPricing: "/billing/settings/pricing",
  settingsRefer: "/billing/settings/refer",
  settingsHelp: "/billing/settings/help",
  tallyImport: "/billing/tally-import",
} as const;

export type AppRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const STORE_OWNER_ROLES = ["store_owner", "super_admin", "admin", "partner"] as const;
export const FULL_ACCESS_ROLES = ["store_owner", "super_admin", "admin", "partner"] as const;
export const MANAGER_ROLES = FULL_ACCESS_ROLES;

export const ALL_APP_ROLES = [
  "admin",
  "partner",
  "stock_manager",
  "salesman",
  "delivery_boy",
  "accountant",
  "cashier",
  "store_owner",
  "super_admin",
] as const;

export type DetailedAppRole = (typeof ALL_APP_ROLES)[number];

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

export type FeatureKey =
  | "dashboard"
  | "pos"
  | "sales"
  | "purchases"
  | "items"
  | "parties"
  | "cashBank"
  | "eInvoicing"
  | "automatedBills"
  | "expenses"
  | "reports"
  | "analytics"
  | "staff"
  | "settings"
  | "crm";

export const FEATURE_ROUTE_MAP: Record<FeatureKey, string[]> = {
  dashboard: [ROUTE_PATHS.dashboard],
  pos: [ROUTE_PATHS.pos, ROUTE_PATHS.checkout],
  sales: [ROUTE_PATHS.sales, ROUTE_PATHS.salesHistory],
  purchases: [ROUTE_PATHS.purchases, ROUTE_PATHS.purchaseReturns, ROUTE_PATHS.discovery],
  items: [ROUTE_PATHS.items, ROUTE_PATHS.storefront, ROUTE_PATHS.inventory, ROUTE_PATHS.godown, ROUTE_PATHS.barcode],
  parties: [ROUTE_PATHS.parties, ROUTE_PATHS.customers, ROUTE_PATHS.suppliers],
  cashBank: [ROUTE_PATHS.cashBank],
  eInvoicing: [ROUTE_PATHS.eInvoicing, ROUTE_PATHS.ewayBill],
  automatedBills: [ROUTE_PATHS.automatedBills],
  expenses: [ROUTE_PATHS.expenses],
  reports: [ROUTE_PATHS.reports],
  analytics: [ROUTE_PATHS.analytics],
  staff: [ROUTE_PATHS.staff, ROUTE_PATHS.activityLog],
  settings: [
    ROUTE_PATHS.settings,
    ROUTE_PATHS.businessSettings,
    ROUTE_PATHS.invoiceSettings,
    ROUTE_PATHS.printSettings,
  ],
  crm: [
    ROUTE_PATHS.crm,
    ROUTE_PATHS.crmAttendance,
    ROUTE_PATHS.crmSalary,
    ROUTE_PATHS.crmTasks,
    ROUTE_PATHS.crmMeet,
    ROUTE_PATHS.crmBroadcasts,
    ROUTE_PATHS.crmAiAssistant,
    ROUTE_PATHS.crmSupport,
    ROUTE_PATHS.crmRoles,
  ],
};

/**
 * Normalizes incoming route paths so RBAC evaluations remain completely seamless
 * whether querying by legacy root paths (e.g. "/items") or canonical decoupled paths (e.g. "/billing/items").
 */
export function normalizeRouteForRbac(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/billing/") || url === "/billing" || url.startsWith("/crm/") || url === "/crm") {
    return url;
  }
  const legacyPrefixes = [
    "/dashboard",
    "/parties",
    "/customers",
    "/suppliers",
    "/storefront",
    "/items",
    "/inventory",
    "/godown",
    "/barcode",
    "/sales",
    "/sales-history",
    "/checkout",
    "/pos",
    "/purchases",
    "/purchase-returns",
    "/discovery",
    "/reports",
    "/analytics",
    "/cash-bank",
    "/e-invoicing",
    "/eway-bill",
    "/automated-bills",
    "/expenses",
    "/staff",
    "/activity-log",
    "/settings",
    "/tally-import",
  ];
  for (const prefix of legacyPrefixes) {
    if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
      return `/billing${url}`;
    }
  }
  return url;
}

export function isRouteAllowedForRole(
  rawUrl: string,
  role: string | null | undefined,
  customPermissions?: Record<string, boolean> | null
): boolean {
  if (!role) return false;
  const url = normalizeRouteForRbac(rawUrl);

  // Check granular custom feature toggles first if provided
  if (customPermissions && typeof customPermissions === "object") {
    for (const [featKey, routes] of Object.entries(FEATURE_ROUTE_MAP)) {
      if (routes.some((r) => url === r || url.startsWith(`${r}/`))) {
        if (customPermissions[featKey] === true) return true;
        if (customPermissions[featKey] === false) return false;
      }
    }
  }

  // Full Access Roles (Admin, Super Admin, Store Owner, Partner)
  if (
    role === "store_owner" ||
    role === "super_admin" ||
    role === "admin" ||
    role === "owner" ||
    role === "manager" ||
    role === "partner"
  ) {
    return true;
  }

  // Stock Manager (Inventory, Godowns, Batches, Purchases, Barcode, Storefront)
  if (role === "stock_manager") {
    const stockAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.items,
      ROUTE_PATHS.storefront,
      ROUTE_PATHS.inventory,
      ROUTE_PATHS.godown,
      ROUTE_PATHS.barcode,
      ROUTE_PATHS.purchases,
      ROUTE_PATHS.purchaseReturns,
      ROUTE_PATHS.checkout,
      ROUTE_PATHS.pos,
    ]);
    return stockAllowed.has(url);
  }

  // Salesman (Sales Invoices, Quotations, POS, Customers, Item Catalog, Storefront)
  if (role === "salesman") {
    const salesAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.sales,
      ROUTE_PATHS.salesHistory,
      ROUTE_PATHS.checkout,
      ROUTE_PATHS.pos,
      ROUTE_PATHS.parties,
      ROUTE_PATHS.customers,
      ROUTE_PATHS.items,
      ROUTE_PATHS.storefront,
    ]);
    return salesAllowed.has(url);
  }

  // Delivery Boy (Delivery Challans, Orders, Customer info, POS)
  if (role === "delivery_boy") {
    const deliveryAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.sales,
      ROUTE_PATHS.checkout,
      ROUTE_PATHS.pos,
      ROUTE_PATHS.parties,
      ROUTE_PATHS.customers,
    ]);
    return deliveryAllowed.has(url);
  }

  // Accountant (Reports, Analytics, Cash & Bank, Expenses, Ledgers, Tax Invoicing)
  if (role === "accountant") {
    const accountantAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.dashboard,
      ROUTE_PATHS.reports,
      ROUTE_PATHS.analytics,
      ROUTE_PATHS.cashBank,
      ROUTE_PATHS.expenses,
      ROUTE_PATHS.eInvoicing,
      ROUTE_PATHS.ewayBill,
      ROUTE_PATHS.automatedBills,
      ROUTE_PATHS.sales,
      ROUTE_PATHS.purchases,
      ROUTE_PATHS.purchaseReturns,
      ROUTE_PATHS.parties,
      ROUTE_PATHS.customers,
      ROUTE_PATHS.suppliers,
      ROUTE_PATHS.settingsCaSharing,
    ]);
    return accountantAllowed.has(url);
  }

  // Cashier
  if (role === "cashier") {
    if (url.startsWith("/crm")) return false;
    if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
    return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
  }

  return false;
}

export interface NavRouteChild {
  title: string;
  url: AppRoutePath | string;
}

export interface NavRouteItem {
  title: string;
  url: AppRoutePath;
  icon: LucideIcon;
  mobilePrimary?: boolean;
  shortcut?: string;
  badge?: string;
  children?: NavRouteChild[];
}

export interface NavRouteGroup {
  label: string;
  items: NavRouteItem[];
}

/**
 * Legacy monolithic navigation routes preserved verbatim for backward compatibility
 * with existing test suites (e.g. src/test/crmShellRoutes.test.ts).
 */
export const MAIN_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "GENERAL",
    items: [
      {
        title: "Dashboard",
        url: ROUTE_PATHS.dashboard,
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+D",
      },
      {
        title: "POS Billing",
        url: ROUTE_PATHS.checkout,
        icon: Monitor,
        mobilePrimary: true,
        badge: "FAST",
        shortcut: "Alt+K",
      },
      {
        title: "Parties",
        url: ROUTE_PATHS.parties,
        icon: Users2,
        mobilePrimary: true,
        shortcut: "Alt+P",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Catalog",
        url: ROUTE_PATHS.items,
        icon: Package,
        mobilePrimary: true,
        shortcut: "Alt+I",
        children: [
          { title: "All Items", url: ROUTE_PATHS.items },
          { title: "Digital Storefront", url: ROUTE_PATHS.storefront },
          { title: "Stock Summary", url: ROUTE_PATHS.inventory },
          { title: "Godowns", url: ROUTE_PATHS.godown },
          { title: "Barcode Generator", url: ROUTE_PATHS.barcode },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Sales Hub",
        url: ROUTE_PATHS.sales,
        icon: ShoppingCart,
        mobilePrimary: true,
        shortcut: "Alt+S",
        children: [
          {
            title: "Invoices & Estimates",
            url: ROUTE_PATHS.sales,
          },
          {
            title: "Sales History",
            url: ROUTE_PATHS.salesHistory,
          },
          {
            title: "E-Way Bills",
            url: ROUTE_PATHS.ewayBill,
          },
          {
            title: "POS Terminal",
            url: ROUTE_PATHS.checkout,
          },
        ],
      },
      {
        title: "Purchase Hub",
        url: ROUTE_PATHS.purchases,
        icon: Truck,
        shortcut: "Alt+B",
        children: [
          { title: "Purchase Bills", url: ROUTE_PATHS.purchases },
          { title: "Purchase Returns", url: ROUTE_PATHS.purchaseReturns },
          { title: "Find Vendors", url: ROUTE_PATHS.discovery },
        ],
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
    label: "ACCOUNTING SOLUTIONS",
    items: [
      {
        title: "Cash & Bank",
        url: ROUTE_PATHS.cashBank,
        icon: Landmark,
      },
      {
        title: "E-Invoicing",
        url: ROUTE_PATHS.eInvoicing,
        icon: FileCheck,
      },
      {
        title: "E-Way Billing",
        url: ROUTE_PATHS.ewayBill,
        icon: Truck,
        badge: "GST",
      },
      {
        title: "Automated Invoices",
        url: ROUTE_PATHS.automatedBills,
        icon: Repeat,
      },
      {
        title: "Expenses & Petty Cash",
        url: ROUTE_PATHS.expenses,
        icon: Receipt,
      },
    ],
  },
  {
    label: "BUSINESS TOOLS",
    items: [
      {
        title: "CRM",
        url: ROUTE_PATHS.crm,
        icon: Briefcase,
        badge: "NEW",
        children: [
          { title: "Dashboard", url: ROUTE_PATHS.crm },
          { title: "Attendance", url: ROUTE_PATHS.crmAttendance },
          { title: "Salary", url: ROUTE_PATHS.crmSalary },
          { title: "Tasks", url: ROUTE_PATHS.crmTasks },
          { title: "Meet", url: ROUTE_PATHS.crmMeet },
          { title: "Broadcasts", url: ROUTE_PATHS.crmBroadcasts },
          { title: "AI Assistant", url: ROUTE_PATHS.crmAiAssistant },
          { title: "Support", url: ROUTE_PATHS.crmSupport },
          { title: "Role Management", url: ROUTE_PATHS.crmRoles },
        ],
      },
      {
        title: "Digital Storefront",
        url: ROUTE_PATHS.storefront,
        icon: Store,
        badge: "NEW",
        mobilePrimary: true,
      },
      {
        title: "Staff Permissions",
        url: ROUTE_PATHS.staff,
        icon: Users,
      },
      {
        title: "POS Billing Terminal",
        url: ROUTE_PATHS.pos,
        icon: Monitor,
        shortcut: "F2",
      },
      {
        title: "Activity & Audit Log",
        url: ROUTE_PATHS.activityLog,
        icon: Activity,
      },
    ],
  },
  {
    label: "SETTINGS & APP PREFERENCES",
    items: [
      {
        title: "Business Settings",
        url: ROUTE_PATHS.businessSettings,
        icon: Settings,
      },
      {
        title: "Invoice & Print Settings",
        url: ROUTE_PATHS.invoiceSettings,
        icon: FileText,
      },
      {
        title: "Import Data (Tally & Excel)",
        url: ROUTE_PATHS.tallyImport,
        icon: FileSpreadsheet,
        badge: "NEW",
      },
    ],
  },
];

/**
 * Dedicated POS & Billing navigation groups containing strictly retail, inventory,
 * POS counter, sales, purchases, reports, and store setting modules (Zero CRM clutter).
 */
export const BILLING_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "GENERAL",
    items: [
      {
        title: "Dashboard",
        url: ROUTE_PATHS.dashboard,
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+D",
      },
      {
        title: "POS Billing",
        url: ROUTE_PATHS.checkout,
        icon: Monitor,
        mobilePrimary: true,
        badge: "FAST",
        shortcut: "Alt+K",
      },
      {
        title: "Parties",
        url: ROUTE_PATHS.parties,
        icon: Users2,
        mobilePrimary: true,
        shortcut: "Alt+P",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Catalog",
        url: ROUTE_PATHS.items,
        icon: Package,
        mobilePrimary: true,
        shortcut: "Alt+I",
        children: [
          { title: "All Items", url: ROUTE_PATHS.items },
          { title: "Digital Storefront", url: ROUTE_PATHS.storefront },
          { title: "Stock Summary", url: ROUTE_PATHS.inventory },
          { title: "Godowns", url: ROUTE_PATHS.godown },
          { title: "Barcode Generator", url: ROUTE_PATHS.barcode },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Sales Hub",
        url: ROUTE_PATHS.sales,
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
        url: ROUTE_PATHS.purchases,
        icon: Truck,
        shortcut: "Alt+B",
        children: [
          { title: "Purchase Bills", url: ROUTE_PATHS.purchases },
          { title: "Purchase Returns", url: ROUTE_PATHS.purchaseReturns },
          { title: "Find Vendors", url: ROUTE_PATHS.discovery },
        ],
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
    label: "ACCOUNTING SOLUTIONS",
    items: [
      {
        title: "Cash & Bank",
        url: ROUTE_PATHS.cashBank,
        icon: Landmark,
      },
      {
        title: "E-Invoicing",
        url: ROUTE_PATHS.eInvoicing,
        icon: FileCheck,
      },
      {
        title: "E-Way Billing",
        url: ROUTE_PATHS.ewayBill,
        icon: Truck,
        badge: "GST",
      },
      {
        title: "Automated Invoices",
        url: ROUTE_PATHS.automatedBills,
        icon: Repeat,
      },
      {
        title: "Expenses & Petty Cash",
        url: ROUTE_PATHS.expenses,
        icon: Receipt,
      },
    ],
  },
  {
    label: "BUSINESS TOOLS",
    items: [
      {
        title: "Digital Storefront",
        url: ROUTE_PATHS.storefront,
        icon: Store,
        badge: "NEW",
        mobilePrimary: true,
      },
      {
        title: "Staff Permissions",
        url: ROUTE_PATHS.staff,
        icon: Users,
      },
      {
        title: "POS Billing Terminal",
        url: ROUTE_PATHS.pos,
        icon: Monitor,
        shortcut: "F2",
      },
      {
        title: "Activity & Audit Log",
        url: ROUTE_PATHS.activityLog,
        icon: Activity,
      },
    ],
  },
  {
    label: "SETTINGS & APP PREFERENCES",
    items: [
      {
        title: "Business Settings",
        url: ROUTE_PATHS.businessSettings,
        icon: Settings,
      },
      {
        title: "Invoice & Print Settings",
        url: ROUTE_PATHS.invoiceSettings,
        icon: FileText,
      },
      {
        title: "Import Data (Tally & Excel)",
        url: ROUTE_PATHS.tallyImport,
        icon: FileSpreadsheet,
        badge: "NEW",
      },
    ],
  },
];

/**
 * Dedicated CRM navigation groups containing strictly workforce management,
 * biometric attendance, salary/payroll, enterprise tasks, custom roles, and
 * omnichannel communication tools (Zero POS/billing clutter).
 */
export const CRM_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "WORKFORCE & OPERATIONS",
    items: [
      {
        title: "Command Center",
        url: ROUTE_PATHS.crm,
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+C",
      },
      {
        title: "Attendance Tracker",
        url: ROUTE_PATHS.crmAttendance,
        icon: CalendarCheck,
        mobilePrimary: true,
        shortcut: "Alt+A",
      },
      {
        title: "Salary & Payroll",
        url: ROUTE_PATHS.crmSalary,
        icon: Wallet,
        mobilePrimary: true,
        shortcut: "Alt+Y",
      },
      {
        title: "Tasks & Projects",
        url: ROUTE_PATHS.crmTasks,
        icon: CheckSquare,
        mobilePrimary: true,
        shortcut: "Alt+T",
      },
      {
        title: "Role Management",
        url: ROUTE_PATHS.crmRoles,
        icon: Shield,
        shortcut: "Alt+R",
      },
    ],
  },
  {
    label: "COMMUNICATION & TOOLS",
    items: [
      {
        title: "Meetings",
        url: ROUTE_PATHS.crmMeet,
        icon: Video,
        shortcut: "Alt+M",
      },
      {
        title: "Broadcasts",
        url: ROUTE_PATHS.crmBroadcasts,
        icon: Radio,
        shortcut: "Alt+B",
      },
      {
        title: "AI Assistant",
        url: ROUTE_PATHS.crmAiAssistant,
        icon: Bot,
        badge: "AI",
        shortcut: "Alt+X",
      },
      {
        title: "Support Tickets",
        url: ROUTE_PATHS.crmSupport,
        icon: LifeBuoy,
        shortcut: "Alt+H",
      },
    ],
  },
];

export interface LegacyRouteRedirect {
  from: string;
  to: string;
}

/**
 * Complete list of 36 legacy root route paths mapped to their new decoupled destinations.
 */
export const LEGACY_ROUTE_REDIRECTS: readonly LegacyRouteRedirect[] = [
  { from: "/dashboard", to: ROUTE_PATHS.dashboard },
  { from: "/pos", to: ROUTE_PATHS.pos },
  { from: "/checkout", to: ROUTE_PATHS.pos },
  { from: "/sales", to: ROUTE_PATHS.sales },
  { from: "/sales-history", to: ROUTE_PATHS.salesHistory },
  { from: "/purchases", to: ROUTE_PATHS.purchases },
  { from: "/purchase-returns", to: ROUTE_PATHS.purchaseReturns },
  { from: "/discovery", to: ROUTE_PATHS.discovery },
  { from: "/items", to: ROUTE_PATHS.items },
  { from: "/inventory", to: ROUTE_PATHS.inventory },
  { from: "/godown", to: ROUTE_PATHS.godown },
  { from: "/barcode", to: ROUTE_PATHS.barcode },
  { from: "/parties", to: ROUTE_PATHS.parties },
  { from: "/customers", to: ROUTE_PATHS.customers },
  { from: "/customers/:id/ledger", to: ROUTE_PATHS.customerLedger },
  { from: "/suppliers", to: ROUTE_PATHS.suppliers },
  { from: "/storefront", to: ROUTE_PATHS.storefront },
  { from: "/tally-import", to: ROUTE_PATHS.tallyImport },
  { from: "/reports", to: ROUTE_PATHS.reports },
  { from: "/analytics", to: ROUTE_PATHS.analytics },
  { from: "/cash-bank", to: ROUTE_PATHS.cashBank },
  { from: "/expenses", to: ROUTE_PATHS.expenses },
  { from: "/e-invoicing", to: ROUTE_PATHS.eInvoicing },
  { from: "/eway-bill", to: ROUTE_PATHS.ewayBill },
  { from: "/automated-bills", to: ROUTE_PATHS.automatedBills },
  { from: "/settings", to: ROUTE_PATHS.settings },
  { from: "/settings/business", to: ROUTE_PATHS.businessSettings },
  { from: "/settings/invoice", to: ROUTE_PATHS.invoiceSettings },
  { from: "/settings/print", to: ROUTE_PATHS.printSettings },
  { from: "/settings/reminders", to: ROUTE_PATHS.settings },
  { from: "/settings/ca-sharing", to: ROUTE_PATHS.reports },
  { from: "/settings/pricing", to: ROUTE_PATHS.pricing },
  { from: "/settings/refer", to: ROUTE_PATHS.settings },
  { from: "/settings/help", to: ROUTE_PATHS.faq },
  { from: "/staff", to: ROUTE_PATHS.staff },
  { from: "/activity-log", to: ROUTE_PATHS.activityLog },
] as const;

export type ActiveSuite = "billing" | "crm";
export type PortalSuite = ActiveSuite;
export type SuitePreference = "billing" | "crm" | "both";

export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";
export const SUITE_PREFERENCE_STORAGE_KEY = "credsmart_suite_preference";

/**
 * Authoritative Entry Route Resolution Engine
 * Resolves destination route for authenticated users accessing entry points (/, /app, or post-login).
 * Strictly enforces cashier role boundaries to POS billing.
 */
export function resolveEntryRoute(options: {
  userRole?: string | null;
  activeSuite?: ActiveSuite | null;
  suitePreference?: SuitePreference | null;
  targetPath?: string | null;
}): {
  destination: string;
  isRestricted: boolean;
  effectiveSuite: ActiveSuite;
} {
  const role = options.userRole || "store_owner";
  const requestedPath = options.targetPath || "/app";

  // 1. Cashier Strict Isolation: Cashiers can ONLY access POS billing
  if (role === "cashier") {
    const isRestrictedTarget =
      requestedPath === "/" ||
      requestedPath === "/app" ||
      requestedPath === "/billing" ||
      requestedPath.startsWith("/billing/dashboard") ||
      requestedPath.startsWith("/dashboard") ||
      requestedPath.startsWith("/crm");

    return {
      destination: ROUTE_PATHS.checkout,
      isRestricted: isRestrictedTarget,
      effectiveSuite: "billing",
    };
  }

  // 2. Direct deep links preservation
  if (requestedPath && requestedPath !== "/" && requestedPath !== "/app") {
    if (requestedPath.startsWith("/crm")) {
      return {
        destination: requestedPath,
        isRestricted: false,
        effectiveSuite: "crm",
      };
    }
    if (requestedPath.startsWith("/billing")) {
      return {
        destination: requestedPath,
        isRestricted: false,
        effectiveSuite: "billing",
      };
    }
  }

  // 3. Entry resolution for / and /app based on active suite & preference
  let effectiveSuite: ActiveSuite = "billing";
  if (options.activeSuite === "crm") {
    effectiveSuite = "crm";
  } else if (options.activeSuite === "billing") {
    effectiveSuite = "billing";
  } else if (options.suitePreference === "crm") {
    effectiveSuite = "crm";
  } else {
    effectiveSuite = "billing";
  }

  const destination = effectiveSuite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard;

  return {
    destination,
    isRestricted: false,
    effectiveSuite,
  };
}

/**
 * Resolves post-login destination by querying localStorage state and user role
 */
export function resolvePostLoginRoute(userRole?: string | null): string {
  let activeSuite: ActiveSuite | null = null;
  let suitePreference: SuitePreference | null = null;
  try {
    const storedSuite = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY);
    if (storedSuite === "crm" || storedSuite === "billing") {
      activeSuite = storedSuite;
    }
    const storedPref = localStorage.getItem(SUITE_PREFERENCE_STORAGE_KEY);
    if (storedPref === "crm" || storedPref === "billing" || storedPref === "both") {
      suitePreference = storedPref;
    }
  } catch {
    // fallback
  }

  const result = resolveEntryRoute({
    userRole,
    activeSuite,
    suitePreference,
    targetPath: "/app",
  });
  return result.destination;
}

/**
 * Persists suite preference and initializes active suite on onboarding completion
 */
export function completeOnboardingSuiteSetup(preference: SuitePreference): {
  initialActiveSuite: ActiveSuite;
  persistedPreference: SuitePreference;
} {
  const initialActiveSuite: ActiveSuite = preference === "crm" ? "crm" : "billing";

  try {
    localStorage.setItem(SUITE_PREFERENCE_STORAGE_KEY, preference);
    localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, initialActiveSuite);
  } catch {
    // Storage fallback
  }

  return {
    initialActiveSuite,
    persistedPreference: preference,
  };
}

export const NAV_ROUTES = MAIN_NAV_ROUTES;
