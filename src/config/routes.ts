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
} from "lucide-react";

export const ROUTE_PATHS = {
  landing: "/",
  auth: "/auth",
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
  features: "/features",
  pricing: "/pricing",
  gstBillingGuide: "/gst-billing-guide",
  compareVyapar: "/compare-vyapar",
  about: "/about",
  contact: "/contact",
  security: "/security",
  faq: "/faq",
  
  // GENERAL
  dashboard: "/dashboard",
  parties: "/parties",
  customers: "/customers",
  customerLedger: "/customers/:id/ledger",
  suppliers: "/suppliers",
  
  items: "/items",
  inventory: "/inventory",
  godown: "/godown",
  barcode: "/barcode",

  sales: "/sales",
  salesHistory: "/sales-history",
  checkout: "/checkout",
  pos: "/pos",

  purchases: "/purchases",
  purchaseReturns: "/purchase-returns",
  discovery: "/discovery",
  vendorDiscovery: "/discovery",

  reports: "/reports",
  analytics: "/analytics",

  // ACCOUNTING SOLUTIONS
  cashBank: "/cash-bank",
  eInvoicing: "/e-invoicing",
  automatedBills: "/automated-bills",
  expenses: "/expenses",

  // BUSINESS TOOLS
  staff: "/staff",
  activityLog: "/activity-log",

  // SETTINGS & HELP
  settings: "/settings",
  businessSettings: "/settings/business",
  invoiceSettings: "/settings/invoice",
  printSettings: "/settings/print",
  settingsReminders: "/settings/reminders",
  settingsCaSharing: "/settings/ca-sharing",
  settingsPricing: "/settings/pricing",
  settingsRefer: "/settings/refer",
  settingsHelp: "/settings/help",
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
  ROUTE_PATHS.staff,
  ROUTE_PATHS.activityLog,
]);

export function isRouteAllowedForRole(url: string, role: string | null | undefined): boolean {
  if (!role) return false;
  
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

  // Stock Manager (Inventory, Godowns, Batches, Purchases, Barcode)
  if (role === "stock_manager") {
    const stockAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.items,
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

  // Salesman (Sales Invoices, Quotations, POS, Customers, Item Catalog)
  if (role === "salesman") {
    const salesAllowed: ReadonlySet<string> = new Set([
      ROUTE_PATHS.sales,
      ROUTE_PATHS.salesHistory,
      ROUTE_PATHS.checkout,
      ROUTE_PATHS.pos,
      ROUTE_PATHS.parties,
      ROUTE_PATHS.customers,
      ROUTE_PATHS.items,
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
        title: "Parties",
        url: ROUTE_PATHS.parties,
        icon: Users2,
        mobilePrimary: true,
        shortcut: "Alt+P",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
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
          { title: "Stock Summary", url: ROUTE_PATHS.inventory },
          { title: "Godowns", url: ROUTE_PATHS.godown },
          { title: "Barcode Generator", url: ROUTE_PATHS.barcode },
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
          { title: "POS Billing", url: ROUTE_PATHS.pos },
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
        title: "E-Invoicing & E-Way",
        url: ROUTE_PATHS.eInvoicing,
        icon: FileCheck,
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
    ],
  },
];

export const NAV_ROUTES = MAIN_NAV_ROUTES;
