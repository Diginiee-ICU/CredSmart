import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { ROUTE_PATHS, NAV_ROUTES, isRouteAllowedForRole } from "@/config/routes";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
import { CreateBusinessModal } from "@/components/CreateBusinessModal";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { CreatePartyModal } from "@/components/parties/CreatePartyModal";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PageMeta {
  title: string;
  subtitle: string;
}

function getPageMeta(pathname: string): PageMeta {
  if (pathname === ROUTE_PATHS.dashboard || pathname === "/") {
    return {
      title: "Dashboard",
      subtitle: "Real-time store overview, key metrics, and daily performance",
    };
  }
  if (pathname === ROUTE_PATHS.checkout) {
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
  if (pathname === ROUTE_PATHS.automatedBills) {
    return {
      title: "Automated Recurring Bills",
      subtitle: "Subscription invoices, automated rent/retainer schedules, and WhatsApp alerts",
    };
  }
  if (pathname === ROUTE_PATHS.staff) {
    return {
      title: "Staff & Role Permissions",
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

  return {
    title: "CredSmart POS",
    subtitle: "Enterprise Retail Management System",
  };
}

export default function AppLayout() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { org, orgId, organizations, switchOrganization, userRole, userPermissions } = useOrganization();
  const { pendingCount, unreadCount } = useNetworkInvoices();

  const [openCommand, setOpenCommand] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickCreateModalOpen, setQuickCreateModalOpen] = useState(false);
  const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);
  const [createBusinessModalOpen, setCreateBusinessModalOpen] = useState(false);
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createPartyModalOpen, setCreatePartyModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newInvoiceMenuOpen, setNewInvoiceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { title, subtitle } = getPageMeta(location.pathname);
  const isPosRoute =
    location.pathname === ROUTE_PATHS.checkout ||
    location.pathname === ROUTE_PATHS.pos ||
    location.pathname.startsWith("/checkout") ||
    location.pathname.startsWith("/pos");

  const roleLabel =
    {
      super_admin: "Store Owner (Super Admin)",
      store_owner: "Store Owner",
      cashier: "Cashier",
    }[userRole || ""] || "Store Owner";

  // Keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommand((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleCommandSelect = (url: string) => {
    setOpenCommand(false);
    navigate(url);
  };

  const handleQuickAction = (action: string) => {
    setNewInvoiceMenuOpen(false);
    switch (action) {
      case "party": setCreatePartyModalOpen(true); break;
      case "item": setCreateItemModalOpen(true); break;
      case "sales_invoice": setSalesInvoiceModalOpen(true); break;
      case "pos_billing": case "pos": case "checkout": navigate(ROUTE_PATHS.checkout); break;
      case "quotation": navigate("/sales?tab=quotation"); break;
      case "payment_in": navigate("/sales?tab=payment_in"); break;
      case "sales_return": navigate("/sales?tab=sales_return"); break;
      case "credit_note": navigate("/sales?tab=credit_note"); break;
      case "delivery_challan": navigate("/sales?tab=delivery_challan"); break;
      case "purchase": navigate("/purchases?tab=purchase_invoice"); break;
      case "payment_out": navigate("/purchases?tab=payment_out"); break;
      case "expense": navigate(ROUTE_PATHS.expenses); break;
      default: navigate(ROUTE_PATHS.pos);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Global Top Header */}
      {!isPosRoute && (
        <header className="h-14 sm:h-20 md:h-[6rem] shrink-0 glass-nav border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 sm:px-6 z-10 shadow-xs bg-white dark:bg-slate-900/90">

            {/* LEFT: Logo + Dropdown Arrow (permanent, always visible) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
              <NavLink
                to={ROUTE_PATHS.dashboard}
                title="CredSmart Dashboard"
                className="flex items-center rounded-lg sm:rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 cursor-pointer hover-3d-glow py-0.5 sm:py-1 shrink-0"
              >
                <img
                  src="/logo-static.jpeg"
                  alt="CredSmart"
                  className="h-11 sm:h-12 md:h-14 w-auto max-w-[170px] sm:max-w-[240px] md:max-w-[300px] object-contain rounded-md sm:rounded-xl drop-shadow-xs sm:drop-shadow-md"
                />
              </NavLink>

              {/* Dropdown toggle arrow */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Close Menu" : "Open Menu"}
                className={cn(
                  "flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider cursor-pointer border transition-all duration-200 select-none shadow-2xs shrink-0",
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
            </div>

            {/* SEPARATOR */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0 hidden md:block" />

            {/* CENTER-LEFT: Page title (desktop only) */}
            <div className="hidden md:flex flex-col justify-center min-w-max shrink-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  {title}
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="tracking-wide">SYNC LIVE</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px] lg:max-w-[320px] mt-0.5">{subtitle}</p>
            </div>

            {/* Search bar (desktop) */}
            <div className="hidden xl:flex items-center w-40 xl:w-52 mx-2 shrink">
              <button
                onClick={() => setOpenCommand(true)}
                className="relative w-full flex items-center bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400/50 rounded-full pl-8 pr-10 py-1.5 text-xs text-slate-500 dark:text-slate-400 transition-all text-left shadow-xs group backdrop-blur-md cursor-pointer hover-3d-glow"
              >
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                <span className="truncate">Search...</span>
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">⌘K</kbd>
              </button>
            </div>

            {/* RIGHT: Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-1 sm:ml-auto">
              {/* Mobile search */}
              <button
                onClick={() => setOpenCommand(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/80 lg:hidden cursor-pointer hover-3d-glow shrink-0"
                title="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* New Invoice split button */}
              <DropdownMenu open={newInvoiceMenuOpen} onOpenChange={setNewInvoiceMenuOpen}>
                <div className="flex items-center rounded-lg sm:rounded-xl glowing-btn-amber shadow-2xs select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setSalesInvoiceModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer hover-3d-glow"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                    <span className="hidden sm:inline">New Invoice</span>
                    <span className="sm:hidden text-[11px] font-bold">Bill</span>
                  </button>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-1 sm:px-1.5 py-1.5 sm:py-2 border-l border-white/20 hover:bg-white/15 text-white transition-colors cursor-pointer hover-3d-glow"
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

              {/* Bell */}
              <button onClick={() => setNotifOpen(true)} className={cn("p-2 rounded-xl transition-colors relative hidden sm:flex items-center justify-center border cursor-pointer shrink-0", pendingCount > 0 ? "border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")} title="Notifications">
                <Bell className="w-4 h-4" />
                {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">{pendingCount}</span>}
                {!pendingCount && unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}
              </button>

              {/* Profile dropdown */}
              <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 text-[11px] sm:text-xs font-black shadow-xs hover:scale-105 transition-all ring-2 ring-amber-400/40 cursor-pointer hover-3d-glow shrink-0" title={org?.name || "Account"}>
                    {org?.name ? org.name.charAt(0).toUpperCase() : "C"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white dark:bg-[#0F0E38] border border-slate-200 dark:border-[#2B277A] text-slate-700 dark:text-slate-200 p-2 shadow-2xl rounded-2xl z-dropdown animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 dark:border-[#1F1C5C]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{org?.name || "CredSmart Business"}</h4>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">{user?.email || "Account Owner"}</p>
                    <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">{roleLabel}</div>
                  </div>
                  <DropdownMenuLabel className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between px-2 pt-2 pb-1">
                    <span>YOUR BUSINESSES</span><span className="text-amber-600 dark:text-amber-400">{(organizations || []).length} Store(s)</span>
                  </DropdownMenuLabel>
                  <div className="space-y-1 my-1 max-h-40 overflow-y-auto">
                    {(organizations || []).filter(Boolean).map((business) => {
                      if (!business) return null;
                      const isActive = business.id === orgId;
                      const bizName = business.name || "Store";
                      return (
                        <DropdownMenuItem
                          key={business.id}
                          onSelect={() => {
                            setProfileMenuOpen(false);
                            if (business.id) switchOrganization(business.id);
                            toast.success(`Switched to "${bizName}"`);
                          }}
                          className={cn("flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer", isActive ? "bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-400/40" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54]")}
                        >
                          <div className="min-w-0 pr-2"><p className="truncate text-xs font-semibold">{bizName}</p><p className="text-[10px] text-slate-500 font-mono truncate">{business.business_type || "Retail"}</p></div>
                          {isActive && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                  <div className="pt-1.5 pb-1 border-t border-[#1F1C5C]">
                    <DropdownMenuItem
                      onSelect={() => {
                        setProfileMenuOpen(false);
                        setCreateBusinessModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover-3d-glow focus:bg-gradient-to-r focus:from-amber-500 focus:to-orange-600 focus:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" /><span>+ Add Business / Branch</span>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-[#1F1C5C] my-1" />
                  <DropdownMenuItem
                    onSelect={() => {
                      setProfileMenuOpen(false);
                      navigate(ROUTE_PATHS.businessSettings);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1C1A54] rounded-xl cursor-pointer hover-3d-glow"
                  >
                    <Settings className="w-4 h-4 text-slate-400" /><span>Store &amp; Business Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setProfileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer font-semibold hover-3d-glow"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" /><span>Sign Out of CredSmart</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* Global Command Palette Dialog */}
        <CommandDialog open={openCommand} onOpenChange={setOpenCommand}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No matching pages or actions found.</CommandEmpty>
            
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => handleCommandSelect(ROUTE_PATHS.checkout)}>
                <ShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Create New Invoice (POS Billing)</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSelect(ROUTE_PATHS.items)}>
                <Package className="mr-2 h-4 w-4 text-blue-600" />
                <span>Manage Items &amp; Barcodes</span>
              </CommandItem>
              <CommandItem onSelect={() => handleCommandSelect(ROUTE_PATHS.customers)}>
                <UserCircle className="mr-2 h-4 w-4 text-purple-600" />
                <span>View Customer Udhar / Khata</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {NAV_ROUTES.map((group) => {
              const allowedItems = group.items.filter((item) =>
                isRouteAllowedForRole(item.url, userRole, userPermissions)
              );
              if (allowedItems.length === 0) return null;

              return (
                <CommandGroup key={group.group} heading={group.group}>
                  {allowedItems.map((item) => (
                    <CommandItem
                      key={item.url}
                      onSelect={() => handleCommandSelect(item.url)}
                    >
                      <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </CommandDialog>

        {/* Help & Support Dialog */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <span>Help &amp; Quick Guide</span>
              </DialogTitle>
              <DialogDescription>
                CredSmart POS User Guide and Keyboard Shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              <div className="p-3 bg-muted/50 rounded-xl space-y-1.5 border border-border">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Keyboard Shortcuts</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Global Search</span>
                  <kbd className="px-1.5 py-0.5 bg-card border rounded text-[10px] font-mono">⌘K / Ctrl+K</kbd>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>New Invoice</span>
                  <kbd className="px-1.5 py-0.5 bg-card border rounded text-[10px] font-mono">POS Billing</kbd>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl space-y-1 border border-border">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Need Assistance?</p>
                <p className="text-xs text-muted-foreground">
                  For questions or custom integrations, email <a href="mailto:support@credsmart.in" className="text-primary underline">support@credsmart.in</a>.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global B2B Inward Alerts & Notifications Center */}
        <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />

        {/* 3D Dropdown Navigation Menu Popover (Desktop) & Bottom Dock (Mobile) */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Viewport Wrapper for 3D Effect */}
        <div 
          className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-100 dark:bg-[#02010A]"
          style={{ perspective: "2000px" }}
        >
          <main
            className={cn(
              "flex-1 min-w-0 flex flex-col overflow-y-auto scrollbar-thin transition-all duration-500",
              isPosRoute
                ? "p-0 m-0 h-full border-none bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden"
                : "bg-white/20 dark:bg-slate-950/25 backdrop-blur-[2px] border-t border-white/60 dark:border-slate-800/60",
              isMobile && !isPosRoute && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]",
              isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
            )}
            style={{
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transformOrigin: "top center",
              ...(sidebarOpen && !isMobile
                ? {
                    transform: "translateY(3rem) scale(0.96) rotateX(3deg)",
                    borderTopLeftRadius: "2rem",
                    borderTopRightRadius: "2rem",
                    borderBottomLeftRadius: "0",
                    boxShadow: "0 -30px 100px rgba(0, 0, 0, 0.15)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.6)",
                    pointerEvents: "none",
                  }
                : {
                    transform: "translateY(0) scale(1) rotateX(0)",
                    borderTopLeftRadius: "0",
                    borderTopRightRadius: "0",
                    borderBottomLeftRadius: "0",
                    boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
                    borderTop: "1px solid transparent",
                  }),
            }}
          >
            <Outlet />
          </main>
        </div>

      <UniversalQuickCreateModal
        open={quickCreateModalOpen}
        onOpenChange={setQuickCreateModalOpen}
        onActionSelect={(key) => {
          setQuickCreateModalOpen(false);
          if (key === "sales_invoice" || key === "pos_billing") {
            setSalesInvoiceModalOpen(true);
          } else if (key === "item") {
            setCreateItemModalOpen(true);
          } else if (key === "party") {
            setCreatePartyModalOpen(true);
          }
        }}
      />

      <CreateBusinessModal
        open={createBusinessModalOpen}
        onOpenChange={setCreateBusinessModalOpen}
      />

      {/* Direct Module: Create Item Modal */}
      <CreateItemModal
        isOpen={createItemModalOpen}
        onClose={() => setCreateItemModalOpen(false)}
        onSave={async (itemData) => {
          if (orgId) {
            const { data: newProd } = await supabase
              .from("products")
              .insert({
                organization_id: orgId,
                name: itemData.name,
                brand: itemData.brand || null,
                category: itemData.category || "General",
                barcode: itemData.barcode || null,
                sku: itemData.sku,
                tags: {
                  selling_price: itemData.sellingPrice,
                  purchase_price: itemData.purchasePrice,
                  mrp: itemData.mrp,
                  unit: itemData.unit,
                  gst_rate: Number(itemData.gstRate) || 18,
                  hsn_code: itemData.hsnCode?.trim() || null,
                  min_stock_alert: itemData.minStockAlert || 5,
                },
              })
              .select()
              .single();

            if (newProd) {
              await supabase.from("product_batches").insert({
                product_id: newProd.id,
                batch_number: "BATCH-01",
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp,
                stock: itemData.currentStock,
              });
            }
          }
          toast.success(`Item "${itemData.name}" created!`);
          setCreateItemModalOpen(false);
        }}
        categories={["General", "Grocery", "Dairy", "Beverages", "Snacks", "Pharmacy", "Hardware"]}
      />

      {/* Direct Module: Create Party Modal */}
      <CreatePartyModal
        isOpen={createPartyModalOpen}
        onClose={() => setCreatePartyModalOpen(false)}
        onSave={async (partyData) => {
          if (orgId) {
            const isSupplier = partyData.partyType === "supplier";
            const targetTable = isSupplier ? "suppliers" : "customers";
            const baseData = {
              organization_id: orgId,
              name: partyData.name,
              phone: partyData.phone || undefined,
              email: partyData.email || undefined,
              address: partyData.address || undefined,
            };
            
            const insertData = isSupplier 
              ? { ...baseData, gstin: partyData.gstin || undefined }
              : baseData;

            const { data: newParty } = await supabase
              .from(targetTable)
              .insert(insertData)
              .select()
              .single();

            if (newParty && Number(partyData.openingBalance) !== 0) {
              await supabase.from("credit_transactions").insert({
                organization_id: orgId,
                party_id: newParty.id,
                party_type: isSupplier ? "supplier" : "customer",
                amount: Math.abs(Number(partyData.openingBalance)),
                type: Number(partyData.openingBalance) > 0 ? "credit" : "payment",
                description: "Opening balance",
                created_by: "admin",
              });
            }
          }
          toast.success(`Party "${partyData.name}" created!`);
          setCreatePartyModalOpen(false);
        }}
      />

      {orgId && (
        <SalesInvoiceModal
          open={salesInvoiceModalOpen}
          onOpenChange={setSalesInvoiceModalOpen}
          orgId={orgId}
          onSaved={() => {
            toast.success("Invoice created successfully!");
          }}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GLOBAL ON-SCREEN WATERMARK (BOTTOM-RIGHT ON DESKTOP) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex fixed bottom-3 right-4 z-40 select-none pointer-events-none transition-all duration-300 print:hidden opacity-80 hover:opacity-100"
        title="CredSmart POS & ERP"
      >
        <div className="flex items-center justify-center p-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-slate-200/50 shadow-lg">
          <img
            src="/logo-static.jpeg"
            alt="CredSmart"
            className="h-6 w-auto object-contain rounded-md drop-shadow-sm mix-blend-multiply"
          />
        </div>
      </div>
    </div>
  );
}
