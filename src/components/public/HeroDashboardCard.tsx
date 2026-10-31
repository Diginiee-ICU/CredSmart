import React, { useState } from "react";
import {
  Plus,
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
  Barcode,
  MapPin,
  Target,
  Navigation,
  CreditCard,
  BookOpen,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CredSmartShieldIcon } from "./CredSmartLogo";
import { Collect3DIcon, Pay3DIcon, Bank3DIcon } from "./Landing3DIcons";

export interface HeroDashboardCardProps {
  className?: string;
  onStartFree?: () => void;
  defaultSuite?: "pos" | "crm";
}

export function HeroDashboardCard({
  className,
  onStartFree,
  defaultSuite = "pos",
}: HeroDashboardCardProps) {
  const [activeSuite, setActiveSuite] = useState<"pos" | "crm">(defaultSuite);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedMetric, setSelectedMetric] = useState<"collect" | "pay" | "cash">("cash");
  const [activeTender, setActiveTender] = useState<"cash" | "upi" | "card" | "udhar">("cash");

  // ERP Sidebar Navigation Items
  const posSidebarItems = [
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

  // CRM Sidebar Navigation Items
  const crmSidebarItems = [
    { id: "attendance", label: "Live Attendance", icon: Users2 },
    { id: "dispatch", label: "Field Tasks", icon: Navigation },
    { id: "leads", label: "Lead Pipeline", icon: Target },
    { id: "salary", label: "Staff Salary", icon: CreditCard },
    { id: "khata", label: "Party Ledgers", icon: BookOpen },
    { id: "geofence", label: "GPS Tracking", icon: MapPin },
    { id: "settings", label: "CRM Config", icon: Settings },
  ];

  // Mock POS Active Cart Line Items
  const activeCartItems = [
    { id: "item-1", name: "Fortune Sunflower Oil 1L", barcode: "890123401", qty: 2, price: 160.0, total: 320.0 },
    { id: "item-2", name: "India Gate Basmati Rice 5kg", barcode: "890123402", qty: 1, price: 480.0, total: 480.0 },
    { id: "item-3", name: "Tata Iodized Salt 1kg", barcode: "890123403", qty: 1, price: 28.0, total: 28.0 },
  ];

  // Reconciled Transactions Feed
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

  // Mock Workforce CRM Staff Ledger
  const staffAttendance = [
    {
      id: "st-1",
      name: "Rajesh Kumar",
      role: "Sales Executive",
      inTime: "09:02 AM",
      geofence: "Connaught Place Store (4m)",
      status: "Present",
      statusType: "emerald",
      biometric: true,
    },
    {
      id: "st-2",
      name: "Pooja Sharma",
      role: "Field Lead",
      inTime: "09:15 AM",
      geofence: "Sector 18 Dispatch Route",
      status: "Field Duty",
      statusType: "blue",
      biometric: false,
    },
    {
      id: "st-3",
      name: "Vikram Singh",
      role: "Counter Cashier",
      inTime: "09:32 AM",
      geofence: "Counter #1 Terminal (2m)",
      status: "Late (12m)",
      statusType: "amber",
      biometric: true,
    },
  ];

  // Mock Workforce CRM Field Tasks
  const fieldTasks = [
    {
      id: "TSK-501",
      title: "Urgent Stock Delivery • Aggarwal Provisions",
      assignee: "Pooja Sharma",
      status: "En Route",
      eta: "14m",
      value: "₹ 24,500",
    },
    {
      id: "TSK-502",
      title: "Payment Collection & Ledger Signoff",
      assignee: "Sunil Rawat",
      status: "On-Site",
      eta: "Visiting",
      value: "₹ 18,200",
    },
  ];

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 overflow-hidden text-left select-none transition-all duration-300 hover:shadow-[0_25px_60px_-20px_rgba(15,23,42,0.18)] max-w-full flex flex-col justify-between max-h-[460px]",
        className
      )}
    >
      {/* ── TOP BROWSER-LIKE BAR ── */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between border-b border-slate-800 shrink-0">
        {/* Left window control dots & Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block" />
          </div>
          <div className="h-3 w-px bg-slate-700 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <CredSmartShieldIcon size={18} />
            <span className="text-xs font-black tracking-tight text-white hidden sm:inline">
              Cred<span className="text-[#FF6A00]">Smart</span>
            </span>
          </div>
        </div>

        {/* Center Live Indicator Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold font-mono tracking-wider border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>• LIVE RECONCILED</span>
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartFree}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Bill</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow-xs">
            Y
          </div>
        </div>
      </div>

      {/* ── DUAL-SUITE INTERACTIVE SEGMENTED CONTROL BAR ── */}
      <div className="bg-slate-100/90 border-b border-slate-200/80 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0">
        <div className="inline-flex p-0.5 rounded-lg bg-slate-200/80 border border-slate-300/60 shadow-2xs">
          {/* Suite A: Retail POS & Billing */}
          <button
            type="button"
            onClick={() => setActiveSuite("pos")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
              activeSuite === "pos"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="whitespace-nowrap">Retail POS &amp; Billing</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-100/80 text-blue-800 font-semibold hidden sm:inline">
              ERP
            </span>
          </button>

          {/* Suite B: Workforce CRM */}
          <button
            type="button"
            onClick={() => setActiveSuite("crm")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer",
              activeSuite === "crm"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Users2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="whitespace-nowrap">Workforce CRM</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-100/80 text-indigo-800 font-semibold hidden sm:inline">
              HR &amp; Leads
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{activeSuite === "pos" ? "POS Terminal Active" : "Geofence Engine Active"}</span>
        </div>
      </div>

      {/* ── CARD WORKBENCH BODY CONTAINER ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[350px] max-h-[370px] bg-slate-50/50 flex-1 overflow-hidden">
        
        {/* Left Mini-Sidebar (Desktop Only) */}
        <div className="hidden md:flex md:col-span-3 lg:col-span-3 border-r border-slate-200/80 bg-white p-2.5 flex-col justify-between overflow-y-auto">
          <div className="space-y-0.5">
            <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {activeSuite === "pos" ? "ERP Workspace" : "CRM Workspace"}
            </div>
            {(activeSuite === "pos" ? posSidebarItems : crmSidebarItems).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
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
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-800">
              <Sparkles className="w-3 h-3 text-[#FF6A00]" />
              <span>{activeSuite === "pos" ? "100% Free ERP" : "Field GPS Included"}</span>
            </div>
            <p className="text-[10px] text-orange-900/80 mt-0.5 leading-tight">
              {activeSuite === "pos" ? "Zero transaction fees" : "Real-time sync to ledger"}
            </p>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="col-span-1 md:col-span-9 lg:col-span-9 p-3 sm:p-3.5 flex flex-col justify-between overflow-y-auto">
          {activeSuite === "pos" ? (
            /* ========================================================================
               SUITE A: RETAIL POS & BILLING WORKBENCH
               ======================================================================== */
            <div className="space-y-2.5">
              {/* Top Search & Barcode Scan Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Scan barcode or type item (F2)..."
                    className="w-full h-7 pl-7 pr-16 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none cursor-default shadow-2xs"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">
                    ⌘K / F2
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs font-mono">
                  <span>Store #01</span>
                </div>
              </div>

              {/* Top 3 Isometric Metric Tiles (Interactive highlights) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. TO COLLECT */}
                <div
                  onClick={() => setSelectedMetric("collect")}
                  className={cn(
                    "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
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
                    <div className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">
                      ₹ 0
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Outstanding Due
                    </div>
                  </div>
                  <Collect3DIcon className="w-8 h-8 shrink-0" />
                </div>

                {/* 2. TO PAY */}
                <div
                  onClick={() => setSelectedMetric("pay")}
                  className={cn(
                    "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
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
                    <div className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">
                      ₹ 0
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Pending Bills
                    </div>
                  </div>
                  <Pay3DIcon className="w-8 h-8 shrink-0" />
                </div>

                {/* 3. CASH & BANK */}
                <div
                  onClick={() => setSelectedMetric("cash")}
                  className={cn(
                    "p-2 rounded-xl bg-white border transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs hover:shadow-xs",
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
                    <div className="text-base sm:text-lg font-black text-amber-600 font-mono tabular-nums">
                      ₹ 97,678
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Reconciled
                    </div>
                  </div>
                  <Bank3DIcon className="w-8 h-8 shrink-0" />
                </div>
              </div>

              {/* Retail POS Fast-Billing Terminal & Cart Strip */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                    <span>POS Terminal Bill Cart</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">3 Items</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 font-semibold">
                    GST Compliant (CGST+SGST 5%)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  {/* Cart Line Items */}
                  <div className="sm:col-span-7 space-y-1">
                    {activeCartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[11px]"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Barcode #{item.barcode}</span>
                        </div>
                        <div className="text-right shrink-0 font-mono tabular-nums">
                          <span className="text-slate-500 mr-2 text-[10px]">×{item.qty}</span>
                          <span className="font-bold text-slate-900">₹ {item.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bill Summary & Tender Buttons */}
                  <div className="sm:col-span-5 flex flex-col justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100/70">
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono tabular-nums font-medium">₹ 828.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>GST (2.5% + 2.5%):</span>
                        <span className="font-mono tabular-nums">₹ 41.40</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-blue-200/60 text-xs">
                        <span>Total Due:</span>
                        <span className="font-mono tabular-nums text-blue-700 font-black">₹ 869.40</span>
                      </div>
                    </div>

                    {/* Quick Tender Buttons */}
                    <div className="grid grid-cols-4 gap-1 mt-1.5 pt-1 border-t border-blue-200/50">
                      {[
                        { id: "cash", label: "Cash F4", icon: Zap },
                        { id: "upi", label: "UPI F6", icon: CheckCircle2 },
                        { id: "card", label: "Card F7", icon: CreditCard },
                        { id: "udhar", label: "Udhar", icon: BookOpen },
                      ].map((tender) => (
                        <button
                          key={tender.id}
                          type="button"
                          onClick={() => setActiveTender(tender.id as any)}
                          className={cn(
                            "py-1 px-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer truncate",
                            activeTender === tender.id
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {tender.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Live Transactions Feed */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                  <span>Recent Reconciled Activity</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline font-mono">
                    View Ledger &rarr;
                  </span>
                </div>

                <div className="space-y-1">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">{tx.party}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.id} &bull; {tx.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-slate-900 block leading-tight font-mono tabular-nums">
                          {tx.amount}
                        </span>
                        <span
                          className={cn(
                            "inline-block px-1 py-0.2 rounded text-[10px] font-bold border",
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
          ) : (
            /* ========================================================================
               SUITE B: WORKFORCE CRM OPERATIONS BOARD
               ======================================================================== */
            <div className="space-y-2.5">
              {/* Top CRM Summary Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Staff On Duty
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
                    8 / 10 Active
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">GPS Present (8/10)</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Field Tasks
                  </span>
                  <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
                    18 Done
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold block">4 In Progress</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block font-mono">
                    Lead Pipeline
                  </span>
                  <span className="text-sm font-black text-indigo-700 font-mono tabular-nums">
                    ₹ 4,85,000
                  </span>
                  <span className="text-[10px] text-slate-500 block">14 Hot Inquiries</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block font-mono">
                    Daily Sales &amp; Payroll
                  </span>
                  <span className="text-sm font-black text-emerald-700 font-mono tabular-nums">
                    ₹ 84,200
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">Monthly Payroll: ₹ 4.8L</span>
                </div>
              </div>

              {/* Real-Time Staff Attendance Ledger with GPS Geofence Indicators */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Real-Time Staff Attendance &amp; GPS Geofence</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    📍 100% Geofence Accuracy
                  </span>
                </div>

                <div className="space-y-1">
                  {staffAttendance.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50/70 border border-slate-100 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            st.statusType === "emerald"
                              ? "bg-emerald-500"
                              : st.statusType === "blue"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          )}
                        />
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">{st.name}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span className="font-medium text-slate-600">{st.role}</span>
                            <span>&bull;</span>
                            <span className="font-mono text-slate-400">In {st.inTime}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-600 block leading-tight">
                          📍 {st.geofence}
                        </span>
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border",
                            st.statusType === "emerald"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : st.statusType === "blue"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {st.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Task Dispatch Board & Lead Stage Kanban Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Field Task Dispatch Board */}
                <div className="sm:col-span-7 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Field Task Dispatch</span>
                    </span>
                    <span className="text-[10px] text-blue-600 font-mono font-semibold">2 Active</span>
                  </div>
                  <div className="space-y-1">
                    {fieldTasks.map((task) => (
                      <div
                        key={task.id}
                        className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-[10px] flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900 block truncate">{task.title}</span>
                          <span className="text-slate-500">
                            Assigned to <strong className="text-slate-700">{task.assignee}</strong> &bull; ETA {task.eta}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                          {task.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Stage Kanban Pills */}
                <div className="sm:col-span-5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-indigo-600" />
                      <span>Lead Stage Kanban</span>
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">₹ 4.8L</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 my-1 text-[10px]">
                    <div className="p-1 rounded bg-slate-50 border border-slate-100 text-center">
                      <span className="text-slate-400 block font-mono">New</span>
                      <strong className="text-slate-900 font-mono tabular-nums">14 Inquiries</strong>
                    </div>
                    <div className="p-1 rounded bg-indigo-50 border border-indigo-100 text-center">
                      <span className="text-indigo-500 block font-mono">Negotiation</span>
                      <strong className="text-indigo-800 font-mono tabular-nums">6 Deals</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>Closed Won This Month:</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-600">28 Deals (₹ 6.4L)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── BOTTOM CARD FOOTER STRIP ── */}
      <div className="px-3 sm:px-4 py-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium bg-white shrink-0">
        <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Synced Cloud Ledger
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {activeSuite === "pos" ? "🛒 POS Active" : "👥 CRM Active"}
          </span>
          <span className="font-mono text-slate-400">CredSmart v1.1.4</span>
        </div>
      </div>
    </div>
  );
}

export default HeroDashboardCard;
