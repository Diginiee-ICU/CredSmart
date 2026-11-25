import {
  Monitor,
  ShoppingCart,
  Truck,
  Boxes,
  Users,
  Sparkles,
  Landmark,
  FileCheck,
  Repeat,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  Shield,
  Settings,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/config/routes";

export type FeatureCategory =
  | "Billing & Counter"
  | "Inventory & Purchases"
  | "Parties & Customers"
  | "Finance & Accounts"
  | "Intelligence & Reports"
  | "Administration";

export interface SystemFeatureItem {
  key: FeatureKey;
  label: string;
  category: FeatureCategory;
  description: string;
  icon: LucideIcon;
  badge: string;
}

export const ALL_SYSTEM_FEATURES: SystemFeatureItem[] = [
  {
    key: "pos",
    label: "POS Billing Terminal",
    category: "Billing & Counter",
    description: "High-speed barcode scanner checkout, cash/card handling, hold bills, and thermal slip printing",
    icon: Monitor,
    badge: "Counter",
  },
  {
    key: "sales",
    label: "Sales Invoices & Quotations",
    category: "Billing & Counter",
    description: "Issue GST tax invoices, proforma, estimates/quotations, and delivery challans",
    icon: ShoppingCart,
    badge: "Sales",
  },
  {
    key: "purchases",
    label: "Purchases & Inward Bills",
    category: "Inventory & Purchases",
    description: "Record supplier bills, purchase orders (PO), inward batches, and debit notes",
    icon: Truck,
    badge: "Purchases",
  },
  {
    key: "items",
    label: "Product Catalog & Inventory",
    category: "Inventory & Purchases",
    description: "Create items, manage pricing, godowns/warehouses, stock adjustments, barcode printing",
    icon: Boxes,
    badge: "Inventory",
  },
  {
    key: "parties",
    label: "Customer & Supplier Directory",
    category: "Parties & Customers",
    description: "Maintain party phonebooks, credit balances, GSTINs, and customer ledgers (Khata)",
    icon: Users,
    badge: "Parties",
  },
  {
    key: "dashboard",
    label: "Dashboard & Real-Time Metrics",
    category: "Intelligence & Reports",
    description: "View store health, receivables (To Collect), payables (To Pay), and sales stats",
    icon: Sparkles,
    badge: "Metrics",
  },
  {
    key: "cashBank",
    label: "Cash & Bank Liquidity",
    category: "Finance & Accounts",
    description: "Manage bank accounts, record cash withdrawals/deposits, view net liquid balance",
    icon: Landmark,
    badge: "Finance",
  },
  {
    key: "eInvoicing",
    label: "E-Invoicing & E-Way Compliance",
    category: "Finance & Accounts",
    description: "Generate compliant GST IRN e-invoices and transporter e-way bills",
    icon: FileCheck,
    badge: "Compliance",
  },
  {
    key: "automatedBills",
    label: "Automated Recurring Invoices",
    category: "Finance & Accounts",
    description: "Schedule automated recurring customer bills and repeat subscriptions",
    icon: Repeat,
    badge: "Automation",
  },
  {
    key: "expenses",
    label: "Store Expenses & Petty Cash",
    category: "Finance & Accounts",
    description: "Record daily petty cash expenses, utilities, transport costs, and operational bills",
    icon: Receipt,
    badge: "Expenses",
  },
  {
    key: "reports",
    label: "Financial Reports & P&L",
    category: "Intelligence & Reports",
    description: "Generate P&L statements, GSTR-1, GSTR-3B tax reports, sales summaries",
    icon: FileSpreadsheet,
    badge: "Reports",
  },
  {
    key: "analytics",
    label: "Business Insights & Trends",
    category: "Intelligence & Reports",
    description: "Analyze item velocity, customer repeat rates, profit margins, and sales trends",
    icon: BarChart3,
    badge: "Analytics",
  },
  {
    key: "staff",
    label: "Staff & Permissions Manager",
    category: "Administration",
    description: "Invite employees, assign roles, and toggle granular feature permissions",
    icon: Shield,
    badge: "Admin",
  },
  {
    key: "settings",
    label: "Store & Invoice Settings",
    category: "Administration",
    description: "Configure business profile, GSTIN, invoice sequence, and print formats",
    icon: Settings,
    badge: "Admin",
  },
  {
    key: "crm",
    label: "CRM Operations & Workforce",
    category: "Administration",
    description: "Workforce command center, staff attendance, payroll, tasks, and support",
    icon: Briefcase,
    badge: "CRM",
  },
];

export const SYSTEM_FEATURES_MAP = ALL_SYSTEM_FEATURES.reduce(
  (acc, feat) => {
    acc[feat.key] = feat;
    return acc;
  },
  {} as Record<FeatureKey, SystemFeatureItem>
);
