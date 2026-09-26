import React, { useState } from "react";
import {
  Search,
  Plus,
  Menu,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Truck,
  Package,
  Users2,
  Building,
  BarChart3,
  Settings,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CredSmartShieldIcon } from "./CredSmartLogo";
import { Collect3DIcon, Pay3DIcon, Bank3DIcon } from "./Landing3DIcons";

interface HeroDashboardCardProps {
  className?: string;
  onStartFree?: () => void;
}

export function HeroDashboardCard({ className, onStartFree }: HeroDashboardCardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "sales" | "pos" | "inventory">("dashboard");
  const [selectedMetric, setSelectedMetric] = useState<"collect" | "pay" | "cash">("cash");

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sales", label: "Sales", icon: Receipt },
    { id: "pos", label: "POS Billing", icon: ShoppingCart },
    { id: "purchases", label: "Purchases", icon: Truck },
    { id: "inventory", label: "Items / Inventory", icon: Package },
    { id: "customers", label: "Customers", icon: Users2 },
    { id: "suppliers", label: "Suppliers", icon: Building },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const recentTransactions = [
    {
      id: "INV-2026-089",
      party: "Sharma General Store",
      type: "Tax Invoice",
      amount: "₹ 14,850",
      status: "Paid UPI",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      id: "POS-00412",
      party: "Walk-in Customer",
      type: "POS Slip",
      amount: "₹ 1,240",
      status: "Cash",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "PUR-2026-034",
      party: "Apex FMCG Distributors",
      type: "Purchase",
      amount: "₹ 38,500",
      status: "Due 15 Days",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  return (
    <div
      className={cn(
        "relative rounded-3xl bg-white border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5 overflow-hidden text-left select-none transition-all duration-300 hover:shadow-[0_35px_80px_-20px_rgba(15,23,42,0.2)]",
        className
      )}
    >
      {/* ── TOP BROWSER-LIKE BAR ── */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        {/* Left window control dots & Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block" />
          </div>
          <div className="h-3 w-px bg-slate-700 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <CredSmartShieldIcon size={20} />
            <span className="text-xs font-black tracking-tight text-white hidden sm:inline">
              Cred<span className="text-[#FF6A00]">Smart</span>
            </span>
          </div>
        </div>

        {/* Center Live Indicator Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold font-mono tracking-wider border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>• LIVE RECONCILED</span>
          </span>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Quick + Bill Button */}
          <button
            type="button"
            onClick={onStartFree}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Bill</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {/* User Avatar Circle */}
          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow-xs">
            Y
          </div>
        </div>
      </div>

      {/* ── CARD MAIN WORKBENCH BODY ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-slate-50/50">
        
        {/* Left Mini-Sidebar (Desktop Only) */}
        <div className="hidden md:flex md:col-span-3 lg:col-span-3 border-r border-slate-200/80 bg-white p-3 flex-col justify-between">
          <div className="space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Workspace
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      isActive ? "text-blue-600 stroke-[2.5]" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-2 rounded-xl bg-orange-50/80 border border-orange-200/60 mt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-800">
              <Sparkles className="w-3 h-3 text-[#FF6A00]" />
              <span>100% Free ERP</span>
            </div>
            <p className="text-[9px] text-orange-900/80 mt-0.5 leading-tight">
              Zero transaction fees or limits
            </p>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="col-span-1 md:col-span-9 lg:col-span-9 p-4 sm:p-5 flex flex-col justify-between">
          
          <div>
            {/* Top Search & Filter Bar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  readOnly
                  placeholder="Quick search items, invoices, customers..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none cursor-default"
                />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <span>FY 2026-27</span>
              </div>
            </div>

            {/* ── TOP 3 ISOMETRIC 3D METRIC TILES ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              
              {/* 1. TO COLLECT */}
              <div
                onClick={() => setSelectedMetric("collect")}
                className={cn(
                  "p-3 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs hover:shadow-md",
                  selectedMetric === "collect"
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200/90"
                )}
              >
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 uppercase tracking-wider font-mono">
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>To Collect</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    ₹ 0
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Outstanding Due
                  </div>
                </div>
                <Collect3DIcon className="w-10 h-10 shrink-0" />
              </div>

              {/* 2. TO PAY */}
              <div
                onClick={() => setSelectedMetric("pay")}
                className={cn(
                  "p-3 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs hover:shadow-md",
                  selectedMetric === "pay"
                    ? "border-orange-500 ring-2 ring-orange-500/20"
                    : "border-slate-200/90"
                )}
              >
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-700 uppercase tracking-wider font-mono">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>To Pay</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    ₹ 0
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Pending Bills
                  </div>
                </div>
                <Pay3DIcon className="w-10 h-10 shrink-0" />
              </div>

              {/* 3. CASH & BANK */}
              <div
                onClick={() => setSelectedMetric("cash")}
                className={cn(
                  "p-3 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs hover:shadow-md",
                  selectedMetric === "cash"
                    ? "border-amber-500 ring-2 ring-amber-500/20"
                    : "border-slate-200/90"
                )}
              >
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">
                    <Landmark className="w-3 h-3" />
                    <span>Cash &amp; Bank</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 text-amber-600">
                    ₹ 97,678
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
                  </div>
                </div>
                <Bank3DIcon className="w-10 h-10 shrink-0" />
              </div>

            </div>

            {/* ── 4-METRIC OVERVIEW STRIP ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 mb-4 shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Sales (Month)
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  ₹ 1,24,590
                </span>
                <span className="text-[10px] text-slate-500 block">12 Invoices</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Purchases
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  ₹ 78,320
                </span>
                <span className="text-[10px] text-slate-500 block">9 Invoices</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block font-mono">
                  Low Stock
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-600">
                  16 Items
                </span>
                <span className="text-[10px] text-slate-500 block">Need Order</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Customers Due
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  ₹ 54,320
                </span>
                <span className="text-[10px] text-slate-500 block">8 Parties</span>
              </div>
            </div>

            {/* ── RECENT LIVE TRANSACTIONS FEED ── */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                <span>Recent Reconciled Activity</span>
                <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline">
                  View Ledger &rarr;
                </span>
              </div>

              <div className="space-y-1.5">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {tx.party}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tx.id} &bull; {tx.type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-slate-900 block leading-tight">
                        {tx.amount}
                      </span>
                      <span
                        className={cn(
                          "inline-block px-1.5 py-0.2 rounded-md text-[9px] font-bold border",
                          tx.statusColor
                        )}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Card Footer Strip */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Synced Cloud Ledger
            </span>
            <span className="font-mono text-slate-400">CredSmart v1.1.4</span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default HeroDashboardCard;
