import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Globe,
  History,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Users2,
  Warehouse,
  Receipt,
  Barcode,
} from "lucide-react";

export const ROUTE_PATHS = {
  landing: "/",
  auth: "/auth",
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
  dashboard: "/dashboard",
  checkout: "/checkout",
  items: "/items",
  inventory: "/inventory",
  purchases: "/purchases",
  suppliers: "/suppliers",
  discovery: "/discovery",
  vendorDiscovery: "/discovery",
  customers: "/customers",
  customerLedger: "/customers/:id/ledger",
  purchaseReturns: "/purchase-returns",
  salesHistory: "/sales-history",
  staff: "/staff",
  activityLog: "/activity-log",
  analytics: "/analytics",
  settings: "/settings",
  expenses: "/expenses",
  barcode: "/barcode",
} as const;

export type AppRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const MANAGER_ROLES = ["super_admin", "store_owner", "manager"] as const;

export const RESTRICTED_ROUTES: ReadonlySet<string> = new Set([
  ROUTE_PATHS.dashboard,
  ROUTE_PATHS.purchases,
  ROUTE_PATHS.discovery,
  ROUTE_PATHS.suppliers,
  ROUTE_PATHS.purchaseReturns,
  ROUTE_PATHS.analytics,
  ROUTE_PATHS.expenses,
  ROUTE_PATHS.barcode,
  ROUTE_PATHS.settings,
  ROUTE_PATHS.staff,
  ROUTE_PATHS.activityLog,
]);

export function isRouteAllowedForRole(url: string, role: string | null | undefined): boolean {
  if (!role) return false;
  if (MANAGER_ROLES.includes(role as any)) return true;
  if (role === "cashier") {
    return !RESTRICTED_ROUTES.has(url);
  }
  return !RESTRICTED_ROUTES.has(url);
}

export interface NavRouteItem {
  title: string;
  url: AppRoutePath;
  icon: LucideIcon;
  mobilePrimary?: boolean;
  shortcut?: string;
}

export interface NavRouteGroup {
  group: string;
  items: NavRouteItem[];
}

export const NAV_ROUTES: NavRouteGroup[] = [
  {
    group: "Home",
    items: [
      { title: "Dashboard", url: ROUTE_PATHS.dashboard, icon: LayoutDashboard, mobilePrimary: true, shortcut: "F1" },
    ]
  },
  {
    group: "Sales",
    items: [
      { title: "POS Billing", url: ROUTE_PATHS.checkout, icon: ShoppingCart, mobilePrimary: true, shortcut: "F2" },
      { title: "Sales History", url: ROUTE_PATHS.salesHistory, icon: History, shortcut: "F6" },
    ]
  },
  {
    group: "Parties",
    items: [
      { title: "Customers", url: ROUTE_PATHS.customers, icon: UserCircle, mobilePrimary: true, shortcut: "F5" },
      { title: "Suppliers", url: ROUTE_PATHS.suppliers, icon: Users2 },
      { title: "Staff", url: ROUTE_PATHS.staff, icon: Users },
    ]
  },
  {
    group: "Items",
    items: [
      { title: "Items", url: ROUTE_PATHS.items, icon: Package, mobilePrimary: true, shortcut: "F3" },
      { title: "Inventory", url: ROUTE_PATHS.inventory, icon: Warehouse, shortcut: "F4" },
      { title: "Print Labels", url: ROUTE_PATHS.barcode, icon: Barcode },
    ]
  },
  {
    group: "Purchases",
    items: [
      { title: "Purchases", url: ROUTE_PATHS.purchases, icon: Truck, shortcut: "F7" },
      { title: "B2B Vendor Discovery", url: ROUTE_PATHS.discovery, icon: Globe },
      { title: "Purchase Returns", url: ROUTE_PATHS.purchaseReturns, icon: RotateCcw },
    ]
  },
  {
    group: "Reports & More",
    items: [
      { title: "Expenses", url: ROUTE_PATHS.expenses, icon: Receipt, shortcut: "F8" },
      { title: "Analytics", url: ROUTE_PATHS.analytics, icon: BarChart3, shortcut: "F9" },
      { title: "Activity Log", url: ROUTE_PATHS.activityLog, icon: Activity },
      { title: "Settings", url: ROUTE_PATHS.settings, icon: Settings, shortcut: "F10" },
    ]
  }
];
