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

export const STORE_OWNER_ROLES = ["store_owner", "super_admin"] as const;
export const FULL_ACCESS_ROLES = ["store_owner", "super_admin"] as const;
export const MANAGER_ROLES = FULL_ACCESS_ROLES;

export const RESTRICTED_ROUTES: ReadonlySet<string> = new Set([
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
  // Store Owner / Super Admin has 100% complete access to everything
  if (role === "store_owner" || role === "super_admin" || role === "owner" || role === "admin" || role === "manager") return true;
  if (role === "cashier") {
    return !RESTRICTED_ROUTES.has(url);
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
  group: string;
  items: NavRouteItem[];
}

export const NAV_ROUTES: NavRouteGroup[] = [
  {
    group: "GENERAL",
    items: [
      { title: "Dashboard", url: ROUTE_PATHS.dashboard, icon: LayoutDashboard, mobilePrimary: true, shortcut: "F1" },
      { 
        title: "Parties", 
        url: ROUTE_PATHS.parties, 
        icon: Users2, 
        mobilePrimary: true, 
        shortcut: "F2",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
        ]
      },
      { 
        title: "Items", 
        url: ROUTE_PATHS.items, 
        icon: Package, 
        mobilePrimary: true, 
        shortcut: "F3",
        children: [
          { title: "Inventory", url: ROUTE_PATHS.items },
          { title: "Godown (Warehouse)", url: ROUTE_PATHS.godown },
          { title: "Print Barcode Labels", url: ROUTE_PATHS.barcode },
        ]
      },
      { 
        title: "Sales", 
        url: ROUTE_PATHS.sales, 
        icon: ShoppingCart, 
        shortcut: "F4",
        children: [
          { title: "Sales Invoices", url: "/sales?tab=sales_invoice" },
          { title: "Quotation / Estimate", url: "/sales?tab=quotation" },
          { title: "Payment In", url: "/sales?tab=payment_in" },
          { title: "Sales Return", url: "/sales?tab=sales_return" },
          { title: "Credit Note", url: "/sales?tab=credit_note" },
          { title: "Delivery Challan", url: "/sales?tab=delivery_challan" },
          { title: "Proforma Invoice", url: "/sales?tab=proforma_invoice" },
        ]
      },
      { 
        title: "Purchases", 
        url: ROUTE_PATHS.purchases, 
        icon: Truck, 
        shortcut: "F5",
        children: [
          { title: "Purchase Invoices", url: "/purchases?tab=purchase_invoice" },
          { title: "Payment Out", url: "/purchases?tab=payment_out" },
          { title: "Purchase Return", url: "/purchases?tab=purchase_return" },
          { title: "Debit Note", url: "/purchases?tab=debit_note" },
          { title: "Purchase Orders", url: "/purchases?tab=purchase_order" },
        ]
      },
      { title: "Reports", url: ROUTE_PATHS.reports, icon: FileSpreadsheet, shortcut: "F6" },
    ],
  },
  {
    group: "ACCOUNTING SOLUTIONS",
    items: [
      { title: "Cash & Bank", url: ROUTE_PATHS.cashBank, icon: Landmark, shortcut: "F7" },
      { title: "E-Invoicing", url: ROUTE_PATHS.eInvoicing, icon: FileCheck },
      { title: "Automated Bills", url: ROUTE_PATHS.automatedBills, icon: Repeat },
      { title: "Expenses", url: ROUTE_PATHS.expenses, icon: Receipt, shortcut: "F8" },
      { title: "POS Billing", url: ROUTE_PATHS.pos, icon: Monitor, mobilePrimary: true, shortcut: "F9" },
    ],
  },
  {
    group: "BUSINESS TOOLS",
    items: [
      { title: "Staff Attendance & Payroll", url: ROUTE_PATHS.staff, icon: CalendarCheck },
    ],
  },
  {
    group: "SETTINGS",
    items: [
      { title: "Settings", url: ROUTE_PATHS.settings, icon: Settings, shortcut: "F10" },
    ],
  },
];
