import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
  if (pathname === ROUTE_PATHS.salesHistory) {
    return {
      title: "Sales Invoices & History",
      subtitle: "Review past transactions, thermal receipts, and refunds",
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
  if (pathname === ROUTE_PATHS.settings) {
    return {
      title: "Store Settings & Preferences",
      subtitle: "Configure store details, tax rules, thermal printer & backups",
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
  const { userRole } = useOrganization();
  const [openCommand, setOpenCommand] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

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
        {/* Global Top Header */}
        <header className="h-16 shrink-0 bg-card/90 backdrop-blur-md border-b border-border/80 flex items-center justify-between px-4 sm:px-6 z-10 shadow-xs">
          {/* Dynamic Page Header Info */}
          <div className="flex flex-col justify-center min-w-0 mr-4">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                {title}
              </h1>
              <div className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>SYNC LIVE</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground truncate hidden sm:block font-normal">
              {subtitle}
            </p>
          </div>

          {/* Center Search Input / Command Trigger */}
          <div className="flex-1 flex items-center justify-center max-w-md hidden md:flex mx-2">
            <button
              onClick={() => setOpenCommand(true)}
              className="relative w-full flex items-center bg-muted/50 hover:bg-muted/80 border border-border/70 hover:border-gold/50 rounded-full pl-9 pr-14 py-2 text-xs text-muted-foreground hover:text-foreground transition-all text-left shadow-2xs group"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
              <span>Search pages, items, customers...</span>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-card border border-border rounded shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => navigate(ROUTE_PATHS.checkout)}
              className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">Invoice</span>
            </button>

            <div className="h-5 w-[1px] bg-border/80 mx-0.5 hidden sm:block" />

            <button
              onClick={() => setHelpOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl transition-colors hidden sm:flex items-center justify-center"
              title="Help & Documentation"
              aria-label="Help & Documentation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setNotifOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl transition-colors relative hidden sm:flex items-center justify-center"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-card animate-pulse" />
            </button>
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
          <DialogContent className="max-w-md">
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
          <DialogContent className="max-w-md">
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
            "flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-slate-50/60 dark:bg-slate-950/40 scrollbar-thin",
            isMobile && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
