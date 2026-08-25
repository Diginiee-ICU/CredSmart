import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { useState, useEffect, Suspense } from "react";
import { CredsmartLogo } from "@/components/ui/Liquid3DCardGraphics";
import {
  Plus,
  Search,
  HelpCircle,
  Bell,
  Sparkles,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Barcode,
  Users2,
  Users,
  UserCircle,
  Truck,
  RotateCcw,
  History,
  Receipt,
  BarChart3,
  Activity,
  Settings,
  Globe,
} from "lucide-react";
import { ROUTE_PATHS, NAV_ROUTES, isRouteAllowedForRole } from "@/config/routes";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
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
  if (pathname.startsWith("/customers/") && pathname.endsWith("/ledger")) {
    return {
      title: "Customer Ledger Statement",
      subtitle: "Account statement, transaction logs, and payments breakdown",
    };
  }
  if (pathname === ROUTE_PATHS.customers) {
    return {
      title: "Customers Directory",
      subtitle: "Manage customer profiles, credit limits, and loyalty points",
    };
  }
  if (pathname === ROUTE_PATHS.suppliers) {
    return {
      title: "Suppliers & Vendors",
      subtitle: "Manage vendor contacts, purchase orders, and payables",
    };
  }
  if (pathname === ROUTE_PATHS.purchases) {
    return {
      title: "Purchases & Inward Goods",
      subtitle: "Record supplier tax bills, inward shipments, and costs",
    };
  }
  if (pathname === ROUTE_PATHS.discovery) {
    return {
      title: "B2B Vendor Discovery",
      subtitle: "Explore verified suppliers, wholesale pricing, and trade deals",
    };
  }
  if (pathname === ROUTE_PATHS.purchaseReturns) {
    return {
      title: "Purchase Returns (Debit Notes)",
      subtitle: "Manage supplier return notes and inventory deductions",
    };
  }
  if (pathname === ROUTE_PATHS.sales || pathname === ROUTE_PATHS.salesHistory) {
    return {
      title: "Sales Multi-Document Hub",
      subtitle: "Manage Sales Invoices, Quotations, Credit Notes, Delivery Challans & Returns",
    };
  }
  if (pathname === ROUTE_PATHS.expenses) {
    return {
      title: "Expense Tracker",
      subtitle: "Track store operational expenses, petty cash, and utilities",
    };
  }
  if (pathname === ROUTE_PATHS.analytics) {
    return {
      title: "Analytics & Business Insights",
      subtitle: "In-depth revenue trends, profit margins, and item velocity",
    };
  }
  if (pathname === ROUTE_PATHS.staff) {
    return {
      title: "Staff & Role Permissions",
      subtitle: "Manage employees, roles, PINs, and access control",
    };
  }
  if (pathname === ROUTE_PATHS.activityLog) {
    return {
      title: "Audit & Activity Log",
      subtitle: "Monitor system operations, cashier logs, and security events",
    };
  }
  if (pathname === ROUTE_PATHS.settings || pathname === ROUTE_PATHS.businessSettings) {
    return {
      title: "Business Settings",
      subtitle: "Edit Your Company Settings And Information",
    };
  }
  if (pathname === ROUTE_PATHS.invoiceSettings) {
    return {
      title: "Invoice Settings",
      subtitle: "Live interactive invoice theme customizer and print layouts",
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
  const { userRole, orgId } = useOrganization();
  const [openCommand, setOpenCommand] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickCreateModalOpen, setQuickCreateModalOpen] = useState(false);
  const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);

  const { title, subtitle } = getPageMeta(location.pathname);

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

  const handleCommandSelect = (url: string) => {
    setOpenCommand(false);
    navigate(url);
  };

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Top Header - CredAlert Liquid Glass Shell */}
        <header className="h-14 sm:h-16 shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-white/60 dark:border-slate-800/80 flex items-center justify-between px-3.5 sm:px-6 z-10 shadow-2xs">
          {/* Mobile Header: CREDSMART Logo (Matching Image 5) */}
          <div className="flex md:hidden items-center min-w-0 mr-2">
            <CredsmartLogo size={34} showSubtitle={true} />
          </div>

          {/* Desktop Header: Dynamic Page Header Info (Matching Image 1) */}
          <div className="hidden md:flex flex-col justify-center min-w-0 mr-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate font-sans">
                {title}
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-wide">SYNC LIVE</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-normal mt-0.5">
              {subtitle}
            </p>
          </div>

          {/* Center Search Input / Command Trigger (Desktop) */}
          <div className="flex-1 flex items-center justify-center max-w-md hidden md:flex mx-3">
            <button
              onClick={() => setOpenCommand(true)}
              className="relative w-full flex items-center bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-amber-400/50 rounded-full pl-9 pr-14 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all text-left shadow-2xs group backdrop-blur-md"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              <span className="truncate">Search pages, items, customers...</span>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Button (Matching Image 5) */}
            <button
              onClick={() => setOpenCommand(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors md:hidden flex items-center justify-center border border-slate-200/70 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/80 shadow-2xs"
              title="Search"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Glowing + New Invoice Button (Matching Image 1 & 5) */}
            <button
              onClick={() => setSalesInvoiceModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-bold rounded-xl glowing-btn-amber shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98] select-none cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </button>

            {/* Notifications Bell with Badge "4" (Desktop) */}
            <button
              onClick={() => setNotifOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative hidden sm:flex items-center justify-center border border-slate-200/60 dark:border-slate-800"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center shadow-xs">
                4
              </span>
            </button>

            {/* Desktop User Avatar (Matching Image 1) */}
            <div
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold font-mono border border-slate-300 dark:border-slate-600 select-none shadow-2xs"
              title="User Account"
            >
              CA
            </div>
          </div>
        </header>

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
                isRouteAllowedForRole(item.url, userRole)
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

        {/* Notifications Dialog */}
        <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
          <DialogContent className="max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <span>Notifications</span>
              </DialogTitle>
              <DialogDescription>
                Recent store alerts and system events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm py-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-xs">System Online &amp; Synchronized</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  All store databases, inventory batches, and cloud sync are operational.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Viewport */}
        <main
          className={cn(
            "flex-1 min-w-0 overflow-y-auto md:overflow-hidden md:flex md:flex-col bg-slate-50/60 dark:bg-slate-950/40 scrollbar-thin",
            isMobile && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
          )}
        >
          <Outlet />
        </main>
      </div>

      <UniversalQuickCreateModal
        open={quickCreateModalOpen}
        onOpenChange={setQuickCreateModalOpen}
        onActionSelect={(key) => {
          if (key === "sales_invoice" || key === "pos_billing") {
            setSalesInvoiceModalOpen(true);
          }
        }}
      />

      {orgId && (
        <SalesInvoiceModal
          open={salesInvoiceModalOpen}
          onOpenChange={setSalesInvoiceModalOpen}
          orgId={orgId}
          onSaved={() => {
            // refresh or toast
          }}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GLOBAL ON-SCREEN WATERMARK (BOTTOM-LEFT) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-2.5 left-2.5 z-40 select-none pointer-events-none transition-all duration-300 print:hidden opacity-75 hover:opacity-100"
        title="CredSmart POS & ERP"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-lg text-slate-300 dark:text-slate-400">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-[8px] font-black text-slate-950 shadow-xs">
            ⚡
          </div>
          <span className="text-[10px] font-mono font-medium tracking-tight">
            Cred<strong className="text-amber-400 font-bold">Smart</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
