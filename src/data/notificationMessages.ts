import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Users,
  Share2,
  Receipt,
  FileSpreadsheet,
  Package,
  Boxes,
  Lock,
  RefreshCw,
  Sparkles,
  Barcode,
  Printer,
  BadgeAlert,
  Radio,
  FileCheck,
} from "lucide-react";

export type CredAlertCategory =
  | "risk"
  | "network"
  | "recovery"
  | "gstin"
  | "pos"
  | "inventory"
  | "compliance"
  | "security";

export interface CredAlertNotificationItem {
  id: string;
  category: CredAlertCategory;
  badge: string;
  badgeColor: string;
  title: string;
  text: string;
  highlight: string;
  icon: React.ElementType;
  accentColor: string;
}

export const CREDALERT_NOTIFICATIONS_SOURCE: CredAlertNotificationItem[] = [
  {
    id: "credalert-risk-radar",
    category: "risk",
    badge: "CREDALERT RISK RADAR",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    title: "Counterparty Risk Intelligence",
    text: "CredAlert monitors 3.2M+ commercial track records across India to warn you before giving credit to risky counterparties.",
    highlight: "3.2M+ Verified Records",
    icon: ShieldAlert,
    accentColor: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "credalert-b2b-network",
    category: "network",
    badge: "CREDALERT NETWORK",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    title: "Dual Ledger Auto-Reconcile",
    text: "When a connected vendor bills your GSTIN, invoices mirror automatically into your purchase records on the CredAlert Network.",
    highlight: "Zero Double-Entry",
    icon: Users,
    accentColor: "rgba(99, 102, 241, 0.4)",
  },
  {
    id: "credalert-gstin-verify",
    category: "gstin",
    badge: "CREDALERT VERIFY",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    title: "Active GSTIN & Taxpayer Radar",
    text: "Instantly verify taxpayer status, legal trade names, and filing records for any party with 1-click CredAlert intelligence.",
    highlight: "Live Taxpayer Verification",
    icon: ShieldCheck,
    accentColor: "rgba(16, 185, 129, 0.4)",
  },
  {
    id: "credalert-whatsapp-recovery",
    category: "recovery",
    badge: "CREDALERT RECOVERY",
    badgeColor: "bg-green-500/20 text-green-300 border-green-500/40",
    title: "WhatsApp Payment Reminders",
    text: "Recover customer Udhar 40% faster with automated WhatsApp payment notices and instant dynamic UPI QR links.",
    highlight: "Faster Cash Recovery",
    icon: Share2,
    accentColor: "rgba(34, 197, 94, 0.4)",
  },
  {
    id: "credalert-credit-shield",
    category: "risk",
    badge: "CREDALERT SHIELD",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    title: "Party Credit Limit Lockdown",
    text: "Set custom credit limits and grace periods per buyer. CredAlert blocks credit sales when limits are exceeded.",
    highlight: "Zero Bad Debts",
    icon: BadgeAlert,
    accentColor: "rgba(244, 63, 94, 0.4)",
  },
  {
    id: "credalert-live-inward-feed",
    category: "network",
    badge: "CREDALERT FEED",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    title: "Live Inward B2B Invoices",
    text: "Get real-time alerts the moment a registered supplier dispatches a shipment or bill to your organization.",
    highlight: "Real-Time Inward Feed",
    icon: Radio,
    accentColor: "rgba(6, 182, 212, 0.4)",
  },
  {
    id: "credalert-turbo-pos",
    category: "pos",
    badge: "CREDALERT POS",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    title: "F1 Search & F12 Thermal Print",
    text: "Press F1 anywhere in POS to instant-search items and F12 for 1-click thermal printing without touching the mouse.",
    highlight: "Sub-Second Checkout",
    icon: Zap,
    accentColor: "rgba(245, 158, 11, 0.4)",
  },
  {
    id: "credalert-batch-fifo",
    category: "inventory",
    badge: "CREDALERT INVENTORY",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    title: "FIFO Batch & Expiry Guard",
    text: "Real-time stock deduction and automated expiry warnings protect your store from inventory write-offs.",
    highlight: "Automated Stock Sync",
    icon: Package,
    accentColor: "rgba(168, 85, 247, 0.4)",
  },
  {
    id: "credalert-ca-audit",
    category: "compliance",
    badge: "CREDALERT AUDIT",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    title: "1-Click CA Audit Package",
    text: "Export complete P&L, balance sheets, daybooks, and stock valuations to Excel & PDF formatted for your CA.",
    highlight: "Excel & PDF CA Exports",
    icon: FileSpreadsheet,
    accentColor: "rgba(234, 179, 8, 0.4)",
  },
  {
    id: "credalert-eway-einvoice",
    category: "compliance",
    badge: "CREDALERT GST",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    title: "GSTR-1 & E-Way Bill Ready",
    text: "Generate IRN, dynamic B2C QR codes, and official GSTR-1 Schema 2.0 JSON directly from your sales invoices.",
    highlight: "Schema 2.0 Compliant",
    icon: FileCheck,
    accentColor: "rgba(20, 184, 166, 0.4)",
  },
  {
    id: "credalert-enterprise-vault",
    category: "security",
    badge: "CREDALERT VAULT",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    title: "Bank-Grade Cloud Encryption",
    text: "Your store transactions, customer khata, and financial ledgers are protected with 256-bit enterprise encryption.",
    highlight: "Enterprise Security",
    icon: Lock,
    accentColor: "rgba(139, 92, 246, 0.4)",
  },
  {
    id: "credalert-offline-shield",
    category: "security",
    badge: "CREDALERT OFFLINE",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    title: "100% Zero-Downtime Billing",
    text: "Keep scanning and billing seamlessly during internet outages. All invoices sync to the cloud when reconnected.",
    highlight: "Zero Internet Downtime",
    icon: RefreshCw,
    accentColor: "rgba(14, 165, 233, 0.4)",
  },
];

/**
 * Get random CredAlert notification
 */
export const getRandomCredAlertNotification = (excludeId?: string): CredAlertNotificationItem => {
  const filtered = excludeId
    ? CREDALERT_NOTIFICATIONS_SOURCE.filter((m) => m.id !== excludeId)
    : CREDALERT_NOTIFICATIONS_SOURCE;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || CREDALERT_NOTIFICATIONS_SOURCE[0];
};
