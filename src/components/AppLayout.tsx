import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Plus,
  Search,
  HelpCircle,
  Bell,
  Sparkles,
  Building2,
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
  CalendarCheck,
  CheckSquare,
  Wallet,
  Video,
  Radio,
  Bot,
  LifeBuoy,
  Shield,
} from "lucide-react";
import { SuiteSwitcher } from "@/components/SuiteSwitcher";
import { useActiveSuite } from "@/hooks/useActiveSuite";
import { ROUTE_PATHS, NAV_ROUTES, isRouteAllowedForRole } from "@/config/routes";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
import { ReceiptModal } from "@/components/ReceiptModal";
import { ReceiptData } from "@/pages/Sales";
import { BusinessDocument, DocumentLineItem } from "@/types/documents";
import { CreateBusinessModal } from "@/components/CreateBusinessModal";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { CreatePartyModal } from "@/components/parties/CreatePartyModal";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import { FeatureBubbleNotification } from "@/components/notifications/FeatureBubbleNotification";
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
import { productsApi } from "@/services/productsApi";
import { partiesApi } from "@/services/partiesApi";
import { notifyStockUpdated } from "@/services/stockService";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";

interface PageMeta {
  title: string;
  subtitle: string;
}

function getPageMeta(pathname: string): PageMeta {
  // CRM Portal Routes
  if (pathname === ROUTE_PATHS.crm || pathname === "/crm" || pathname === "/crm/dashboard") {
    return {
      title: "CRM Command Center",
      subtitle: "Workforce & Operations",
    };
  }
  if (pathname === ROUTE_PATHS.crmAttendance || pathname === "/crm/attendance") {
    return {
      title: "Attendance & Geofence",
      subtitle: "Staff Clock-In & Shifts",
    };
  }
  if (pathname === ROUTE_PATHS.crmSalary || pathname === "/crm/salary") {
    return {
      title: "Salary & Payroll Engine",
      subtitle: "Payroll & Compensation",
    };
  }
  if (pathname === ROUTE_PATHS.crmTasks || pathname === "/crm/tasks") {
    return {
      title: "Enterprise Task Management",
      subtitle: "Task Board & Workflow",
    };
  }
  if (pathname === ROUTE_PATHS.crmRoles || pathname === "/crm/roles") {
    return {
      title: "CRM Role & Permission Manager",
      subtitle: "Roles & Hierarchy",
    };
  }
  if (pathname === ROUTE_PATHS.crmMeet || pathname === "/crm/meet") {
    return {
      title: "CredSmart Video Meet",
      subtitle: "Video Conferencing",
    };
  }
  if (pathname === ROUTE_PATHS.crmBroadcasts || pathname === "/crm/broadcasts") {
    return {
      title: "Company Broadcasts",
      subtitle: "Team Bulletins",
    };
  }
  if (pathname === ROUTE_PATHS.crmAiAssistant || pathname === "/crm/ai-assistant") {
    return {
      title: "CRM AI Assistant",
      subtitle: "Retail Intelligence",
    };
  }
  if (pathname === ROUTE_PATHS.crmSupport || pathname === "/crm/support") {
    return {
      title: "Support & Helpdesk",
      subtitle: "Helpdesk & Tickets",
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
      subtitle: "Store Overview",
    };
  }
  if (pathname === ROUTE_PATHS.checkout || pathname === ROUTE_PATHS.pos) {
    return {
      title: "POS Billing & Checkout",
      subtitle: "POS Terminal",
    };
  }
  if (pathname === ROUTE_PATHS.parties) {
    return {
      title: "Parties & SharedLedger Hub",
      subtitle: "Ledgers & Khatas",
    };
  }
  if (pathname === ROUTE_PATHS.customers) {
    return {
      title: "Customer Ledger (Udhar Khata)",
      subtitle: "Customer Khatas",
    };
  }
  if (pathname === ROUTE_PATHS.suppliers) {
    return {
      title: "Supplier Ledger & Payables",
      subtitle: "Supplier Payables",
    };
  }
  if (pathname === ROUTE_PATHS.items) {
    return {
      title: "Items Master Catalog",
      subtitle: "Product Master",
    };
  }
  if (pathname === ROUTE_PATHS.inventory) {
    return {
      title: "Inventory Management",
      subtitle: "Stock & Godowns",
    };
  }
  if (pathname === ROUTE_PATHS.godown) {
    return {
      title: "Godown & Multi-Warehouse Hub",
      subtitle: "Multi-Warehouse",
    };
  }
  if (pathname === ROUTE_PATHS.barcode) {
    return {
      title: "Barcode Label Generator",
      subtitle: "Barcode Designer",
    };
  }
  if (pathname === ROUTE_PATHS.sales) {
    return {
      title: "Sales Hub & Invoices",
      subtitle: "Sales & Invoicing",
    };
  }
  if (pathname === ROUTE_PATHS.salesHistory) {
    return {
      title: "Sales & Invoicing History",
      subtitle: "Invoice History",
    };
  }
  if (pathname === ROUTE_PATHS.purchases) {
    return {
      title: "Purchase Hub & Bills",
      subtitle: "Purchase Orders",
    };
  }
  if (pathname === ROUTE_PATHS.purchaseReturns) {
    return {
      title: "Purchase Returns & Debit Notes",
      subtitle: "Inward Returns",
    };
  }
  if (pathname === ROUTE_PATHS.discovery) {
    return {
      title: "Verified B2B Vendor Discovery",
      subtitle: "B2B Wholesale",
    };
  }
  if (pathname === ROUTE_PATHS.reports) {
    return {
      title: "Financial & Tax Reports",
      subtitle: "GST & Tax Books",
    };
  }
  if (pathname === ROUTE_PATHS.analytics) {
    return {
      title: "Business Analytics & Insights",
      subtitle: "Business Insights",
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
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const handleOpenReceipt = (doc: BusinessDocument) => {
    const receipt: ReceiptData = {
      docType: doc.docType,
      invoiceNumber: doc.documentNumber,
      referenceNumber: doc.referenceNumber,
      items: doc.items.map((it: DocumentLineItem) => ({
        product: {
          id: it.productId || it.id,
          name: it.productName,
          barcode: it.barcode || "",
          brand: "",
          category: "",
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altUnitConversion: it.altUnitConversion,
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
          batches: [],
        },
        batch: {
          id: it.id,
          productId: it.productId || it.id,
          batchNumber: it.batchNumber || "",
          mrp: 0,
          purchaseRate: 0,
          salesRate: it.rate,
          stock: it.quantity,
          expiryDate: it.expiryDate,
        },
        quantity: it.quantity,
        rate: it.rate,
        discount: (it.discountTotal || 0) / (it.quantity || 1),
        discountType: "amount",
        tax: it.taxRate,
        lineTotal: it.lineTotal,
      })),
      subtotal: doc.subtotal,
      discountAmount: doc.discountTotal || 0,
      tax: doc.taxTotal || 0,
      roundOff: doc.roundOff || 0,
      total: doc.grandTotal,
      paymentMethod: doc.paymentMethod || "Cash",
      notes: doc.notes || "",
      terms: doc.terms,
      date: doc.docDate,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
    };
    setReceiptData(receipt);
  };

  const [createBusinessModalOpen, setCreateBusinessModalOpen] = useState(false);
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createPartyModalOpen, setCreatePartyModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newInvoiceMenuOpen, setNewInvoiceMenuOpen] = useState(false);
  const [crmActionMenuOpen, setCrmActionMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { activeSuite, isCrm } = useActiveSuite();
  const isCrmSuite = isCrm || location.pathname.startsWith("/crm");
  const isCrmDashboard =
    location.pathname === ROUTE_PATHS.crm ||
    location.pathname === "/crm" ||
    location.pathname === "/crm/dashboard";

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

  // Global listener to open Notification Center from toasts or quick actions
  useEffect(() => {
    const handleOpenNotifs = () => setNotifOpen(true);
    window.addEventListener("credsmart_open_notifications", handleOpenNotifs);
    return () => window.removeEventListener("credsmart_open_notifications", handleOpenNotifs);
  }, []);

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
      {/* Offline Status & Cloud Sync Banner */}
      <OfflineSyncBanner />

      {/* Global Top Header */}
      {!isPosRoute && (
        <header
          className={cn(
            "pt-[env(safe-area-inset-top,0px)] min-h-[calc(3.25rem+env(safe-area-inset-top,0px))] h-13 sm:h-14 shrink-0 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 px-2.5 sm:px-4 shadow-2xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none",
            isCrmDashboard && "hidden md:flex"
          )}
        >
            {/* LEFT: Permanent CredSmart Shield Mark + Divider + Active Store Switcher Pill + Desktop Menu Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
              {/* Sidebar Menu Toggle Button — Visible across mobile & desktop */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Close Menu" : "Open Menu"}
                className={cn(
                  "flex items-center justify-center w-8.5 h-8.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors select-none shadow-2xs shrink-0 active:scale-95",
                  sidebarOpen
                    ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                    : "bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Menu className="w-4.5 h-4.5 stroke-[2]" />
              </button>

              {/* Permanent CredSmart Platform Brand Mark */}
              <NavLink
                to={isCrmSuite ? ROUTE_PATHS.crm : (userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard)}
                title={isCrmSuite ? "CredSmart CRM Command Center" : "CredSmart POS & Billing"}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg py-1 shrink-0 select-none cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <img
                    src="/favicon.png"
                    alt="CredSmart Shield"
                    className="w-full h-full object-contain select-none"
                    loading="eager"
                  />
                </div>
                <span className="hidden xs:inline font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white font-sans shrink-0">
                  CredSmart
                </span>
              </NavLink>

              {/* 1px Hairline Divider — Desktop only */}
              <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5 sm:mx-1" aria-hidden="true" />

              {/* Dedicated Tenant Business Selector Dropdown Pill (Desktop) */}
              <div className="hidden sm:inline-flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]"
                      title={org?.name || "Select Business"}
                    >
                      {org?.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org?.name || "Store Logo"}
                          className="w-4 h-4 rounded object-contain shrink-0 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                      <span className="truncate text-xs font-semibold">
                        {org?.name || "My Business"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={6} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 p-2 shadow-xl rounded-xl z-dropdown animate-in fade-in zoom-in-95 duration-150">
                    <DropdownMenuLabel className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between px-2 pt-1 pb-1">
                      <span>YOUR BUSINESSES</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold font-mono">{(organizations || []).length} Store(s)</span>
                    </DropdownMenuLabel>
                    <div className="space-y-1 my-1 max-h-48 overflow-y-auto scrollbar-thin">
                      {(organizations || []).filter(Boolean).map((business) => {
                        if (!business) return null;
                        const isActive = business.id === orgId;
                        const bizName = business.name || "Store";
                        return (
                          <DropdownMenuItem
                            key={business.id}
                            onSelect={() => {
                              if (business.id) switchOrganization(business.id);
                              toast.success(`Switched to "${bizName}"`);
                            }}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer gap-2",
                              isActive
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800/60"
                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {business.logo_url ? (
                                <img
                                  src={business.logo_url}
                                  alt={bizName}
                                  className="w-5 h-5 rounded-md object-contain border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  <Building2 className="w-3 h-3 text-slate-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{bizName}</p>
                                <p className="text-[11px] text-slate-400 font-mono truncate">{business.business_type || "Retail"}</p>
                              </div>
                            </div>
                            {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                    <DropdownMenuItem
                      onSelect={() => setCreateBusinessModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Business / Branch</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Top-Level Interactive Suite Switcher */}
              {userRole !== "cashier" && (
                <div className="flex items-center shrink-0">
                  <SuiteSwitcher
                    onSuiteChange={(newSuite) => {
                      navigate(newSuite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard);
                    }}
                  />
                </div>
              )}
            </div>

            {/* CENTER: Command Palette Trigger (Available md: and above) */}
            <div className="hidden md:flex flex-1 max-w-md mx-2">
              <button
                type="button"
                onClick={() => setOpenCommand(true)}
                className="w-full h-8.5 px-3 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Search or ⌘K...</span>
                </div>
                <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 text-slate-500 dark:text-slate-400 shadow-2xs">⌘K</kbd>
              </button>
            </div>

            {/* RIGHT: Live Sync + Auto Import + Split Button + Notifications + Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              {/* Mobile search */}
              <button
                type="button"
                onClick={() => setOpenCommand(true)}
                className="w-8.5 h-8.5 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 md:hidden cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                title="Search"
                aria-label="Search"
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              {/* Auto Import Tally button — Visible only in POS & Billing suite */}
              {!isCrmSuite && (
                <button
                  type="button"
                  onClick={() => navigate(ROUTE_PATHS.tallyImport)}
                  className="hidden xl:flex items-center gap-1.5 h-8.5 px-2.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Auto Search Tally Folder & Import All Data"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2]" />
                  <span>Auto Import Tally</span>
                </button>
              )}

              {/* Live Sync Status Pill */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync</span>
              </div>

              {/* Action Split Button — Royal Blue Standard Action */}
              {!isCrmSuite ? (
                /* Billing Suite: New Invoice split button */
                <DropdownMenu open={newInvoiceMenuOpen} onOpenChange={setNewInvoiceMenuOpen}>
                  {/* On Mobile: Single compact plus button */}
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex sm:hidden items-center justify-center w-8.5 h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs select-none shrink-0 cursor-pointer active:scale-95 transition-all"
                      title="New Invoice & Creation Options"
                      aria-label="New Invoice & Creation Options"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </DropdownMenuTrigger>
                  {/* On Desktop: Royal Blue split button */}
                  <div className="hidden sm:flex items-center h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs select-none shrink-0 overflow-hidden transition-colors">
                    <button
                      type="button"
                      onClick={() => setSalesInvoiceModalOpen(true)}
                      className="flex items-center gap-1.5 h-full px-3 text-white text-xs font-semibold cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>New Invoice</span>
                    </button>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center h-full px-1.5 border-l border-blue-500 hover:bg-blue-800 text-white transition-colors cursor-pointer"
                        aria-label="More creation options"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                  </div>
                <DropdownMenuContent align="end" sideOffset={6} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 p-2 shadow-xl rounded-xl z-dropdown animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
                  <div className="px-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setNewInvoiceMenuOpen(false);
                        setQuickCreateModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors border border-blue-200 dark:border-blue-700/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" /><span>All Creation Options</span></div>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono font-semibold uppercase">Hub</span>
                    </button>
                  </div>
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 pt-2 pb-1">MASTER DATA</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleQuickAction("party")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /><span>Create Party</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("item")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><PackagePlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /><span>Create Item</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setNewInvoiceMenuOpen(false); navigate(ROUTE_PATHS.tallyImport); }} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"><FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Import Data (Tally / Excel)</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">SALES</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleQuickAction("sales_invoice")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer font-semibold"><FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /><span>Sales Invoice</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("pos_billing")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"><ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>POS Billing (Fast)</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("quotation")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" /><span>Quotation / Estimate</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("payment_in")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Payment In</span></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">PURCHASES & EXPENSES</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleQuickAction("purchase")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Truck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" /><span>Purchase Bill</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("payment_out")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><CreditCard className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" /><span>Payment Out</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickAction("expense")} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"><Receipt className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" /><span>Record Expense</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* CRM Suite: CRM Quick Action split button */
              <DropdownMenu open={crmActionMenuOpen} onOpenChange={setCrmActionMenuOpen}>
                {/* On Mobile: Single compact quick action button */}
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex sm:hidden items-center justify-center w-8.5 h-8.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs select-none shrink-0 cursor-pointer active:scale-95 transition-all"
                    title="CRM Quick Actions"
                    aria-label="CRM Quick Actions"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </DropdownMenuTrigger>
                {/* On Desktop: Royal Blue split button */}
                <div className="hidden sm:flex items-center h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs select-none shrink-0 overflow-hidden transition-colors">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTE_PATHS.crmTasks)}
                    className="flex items-center gap-1.5 h-full px-3.5 text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                    title="Create New CRM Task"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Quick Action</span>
                  </button>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-full px-2 border-l border-blue-500 hover:bg-blue-800 text-white transition-colors cursor-pointer"
                      aria-label="More CRM actions"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="end" sideOffset={6} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 p-2 shadow-xl rounded-xl z-dropdown animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] overflow-y-auto">
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 pt-2 pb-1">
                    WORKFORCE & OPERATIONS
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmAttendance); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Clock In / Attendance</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmTasks); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer font-semibold"
                  >
                    <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>+ Create Staff Task</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmSalary); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Run Payroll / Payslips</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                    COMMUNICATIONS
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmMeet); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Start Video Meet</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmBroadcasts); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Post Broadcast Alert</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmAiAssistant); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Bot className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>CRM AI Assistant</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                  <DropdownMenuLabel className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
                    GOVERNANCE
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmRoles); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Staff Roles &amp; Permissions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setCrmActionMenuOpen(false); navigate(ROUTE_PATHS.crmSupport); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <LifeBuoy className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>Support &amp; Helpdesk</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

              {/* Bell (Desktop & Tablet) */}
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className={cn(
                  "w-8.5 h-8.5 rounded-lg transition-colors relative hidden sm:flex items-center justify-center border border-slate-200/80 dark:border-slate-800 cursor-pointer shrink-0 shadow-2xs",
                  pendingCount > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white/80 dark:bg-slate-800/80"
                )}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[10px] font-black text-white flex items-center justify-center animate-pulse">{pendingCount}</span>}
                {!pendingCount && unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}
              </button>

              {/* Bell (Dedicated Mobile View) */}
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className={cn(
                  "w-8.5 h-8.5 rounded-lg transition-all relative flex sm:hidden items-center justify-center border cursor-pointer shrink-0 shadow-2xs active:scale-90 select-none",
                  pendingCount > 0
                    ? "border-amber-400/80 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : unreadCount > 0
                    ? "border-blue-400/70 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white/90 dark:bg-slate-800/90"
                )}
                title="Notifications & Alerts"
                aria-label={`Notifications${pendingCount > 0 ? ` (${pendingCount} actions required)` : unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell className="w-4.5 h-4.5" />
                {pendingCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-[9px] font-black font-mono text-white flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-slate-900 animate-pulse">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                ) : unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-blue-600 text-[9px] font-bold font-mono text-white flex items-center justify-center shadow-xs ring-1 ring-white dark:ring-slate-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {/* Profile dropdown */}
              <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-2xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 active:scale-95"
                    title={org?.name || "Account"}
                  >
                    {org?.name ? org.name.charAt(0).toUpperCase() : "C"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-64 bg-white dark:bg-[#0F0E38] border border-slate-200 dark:border-[#2B277A] text-slate-700 dark:text-slate-200 p-2 shadow-2xl rounded-2xl z-dropdown animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 dark:border-[#1F1C5C]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{org?.name || "CredSmart Business"}</h4>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                      {(user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || (user as any)?.full_name || user?.email?.split("@")[0] || "Account Owner"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{user?.email || ""}</p>
                    <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">{roleLabel}</div>
                  </div>
                  <DropdownMenuLabel className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between px-2 pt-2 pb-1">
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
                          <div className="min-w-0 pr-2"><p className="truncate text-xs font-semibold">{bizName}</p><p className="text-[11px] text-slate-500 font-mono truncate">{business.business_type || "Retail"}</p></div>
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
              <CommandItem onSelect={() => handleCommandSelect(ROUTE_PATHS.tallyImport)}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-amber-500" />
                <span>Import Data (Tally / Excel)</span>
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
                  <kbd className="px-1.5 py-0.5 bg-card border rounded text-[11px] font-mono">⌘K / Ctrl+K</kbd>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>New Invoice</span>
                  <kbd className="px-1.5 py-0.5 bg-card border rounded text-[11px] font-mono">POS Billing</kbd>
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

        {/* Global Floating Feature Intelligence Bubble Notification */}
        <FeatureBubbleNotification />

        {/* 3D Dropdown Navigation Menu Popover (Desktop) & Bottom Dock (Mobile) */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeSuite={isCrmSuite ? "crm" : "billing"}
        />

        {/* Main Content Viewport Wrapper — Screen-fitted containment */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <main
            className={cn(
              "flex-1 min-w-0 min-h-0 flex flex-col transition-colors duration-200 scrollbar-thin",
              isPosRoute
                ? "p-0 m-0 h-full border-none bg-slate-50 dark:bg-slate-950 overflow-hidden"
                : cn(
                    "bg-white/40 dark:bg-slate-950/40",
                    isCrmDashboard ? "overflow-y-auto" : "overflow-hidden"
                  )
            )}
          >
            <Outlet />
            {/* Mobile Bottom Dock Clearance Spacer for scrolling dashboard */}
            {!isPosRoute && isCrmDashboard && (
              <div
                className="block md:hidden shrink-0 w-full pointer-events-none select-none"
                style={{ height: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
                aria-hidden="true"
              />
            )}
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
          } else if (key === "tally_import") {
            navigate(ROUTE_PATHS.tallyImport);
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
            const { data: newProd } = await productsApi.createProduct(
              {
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
                  ...(itemData.tags || {}),
                },
              },
              orgId
            );

            if (newProd) {
              await productsApi.createBatch(
                {
                  product_id: newProd.id,
                  batch_number: "BATCH-01",
                  cost_price: itemData.purchasePrice,
                  mrp: itemData.mrp,
                  stock: itemData.currentStock,
                },
                orgId
              );
            }

            // Broadcast real-time stock sync
            notifyStockUpdated(orgId);
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

            const { data: newParty } = await partiesApi.savePartyRecord(
              targetTable,
              insertData,
              undefined,
              orgId
            );

            if (newParty && Number(partyData.openingBalance) !== 0) {
              await partiesApi.recordCreditTransaction({
                organization_id: orgId,
                party_id: newParty.id,
                party_type: isSupplier ? "supplier" : "customer",
                amount: Math.abs(Number(partyData.openingBalance)),
                type: Number(partyData.openingBalance) > 0 ? "credit" : "payment",
                description: "Opening balance",
                created_by: "admin",
              }, orgId);
            }

            // Broadcast real-time parties sync
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("credsmart:parties_updated", { detail: { orgId } }));
              window.dispatchEvent(new CustomEvent("credsmart_network_update"));
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


    </div>
  );
}
