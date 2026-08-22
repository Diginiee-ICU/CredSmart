import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  Shield,
  User,
  Plus,
  UserPlus,
  PackagePlus,
  Package,
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  RotateCcw,
  CreditCard,
  Truck,
  FileCheck,
  Building2,
  FileText,
  BadgeAlert,
  HelpCircle,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ROUTES, ROUTE_PATHS, isRouteAllowedForRole } from "@/config/routes";
import { toast } from "sonner";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { CreateBusinessModal } from "@/components/CreateBusinessModal";

export function AppSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [universalModalOpen, setUniversalModalOpen] = useState(false);
  const [createBusinessModalOpen, setCreateBusinessModalOpen] = useState(false);
  const [businessSwitcherOpen, setBusinessSwitcherOpen] = useState(false);
  const [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false);
  const businessSwitcherRef = useRef<HTMLDivElement>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Parties: true,
    Items: true,
    Sales: true,
    Purchases: true,
  });

  const quickCreateRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { org, orgId, organizations, switchOrganization, userRole } = useOrganization();
  const location = useLocation();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
      if (businessSwitcherRef.current && !businessSwitcherRef.current.contains(event.target as Node)) {
        setBusinessSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter groups and items based on role permissions
  const filteredNavRouteGroups = NAV_ROUTES.map((group) => ({
    ...group,
    items: group.items.filter((item) => isRouteAllowedForRole(item.url, userRole)),
  })).filter((group) => group.items.length > 0);

  const allAllowedNavItems = filteredNavRouteGroups.flatMap((g) => g.items);
  const mobilePrimaryNavItems = allAllowedNavItems.filter((item) => item.mobilePrimary);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable);

      const isFKey = /^F([1-9]|1[0-2])$/i.test(e.key);
      if (isInput && !isFKey) return;

      const matched = allAllowedNavItems.find(
        (item) => item.shortcut && item.shortcut.toLowerCase() === e.key.toLowerCase()
      );

      if (matched) {
        e.preventDefault();
        navigate(matched.url);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allAllowedNavItems, navigate]);

  const isRouteActive = (url: string) =>
    url === "/"
      ? location.pathname === "/"
      : location.pathname === url || location.pathname.startsWith(`${url}/`);

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const roleLabel =
    {
      super_admin: "Store Owner (Super Admin)",
      store_owner: "Store Owner",
      cashier: "Cashier",
    }[userRole || ""] || "Store Owner";

  // Quick action options matching 11Capture.PNG & 123Capture.PNG
  const handleQuickAction = (action: string) => {
    setQuickCreateOpen(false);
    switch (action) {
      case "party":
        navigate(ROUTE_PATHS.parties);
        break;
      case "item":
        navigate(ROUTE_PATHS.items);
        break;
      case "sales_invoice":
        navigate("/sales?tab=sales_invoice");
        break;
      case "quotation":
        navigate("/sales?tab=quotation");
        break;
      case "payment_in":
        navigate("/sales?tab=payment_in");
        break;
      case "sales_return":
        navigate("/sales?tab=sales_return");
        break;
      case "credit_note":
        navigate("/sales?tab=credit_note");
        break;
      case "delivery_challan":
        navigate("/sales?tab=delivery_challan");
        break;
      case "proforma":
        navigate("/sales?tab=proforma_invoice");
        break;
      case "purchase":
        navigate("/purchases?tab=purchase_invoice");
        break;
      case "payment_out":
        navigate("/purchases?tab=payment_out");
        break;
      case "purchase_return":
        navigate("/purchases?tab=purchase_return");
        break;
      case "debit_note":
        navigate("/purchases?tab=debit_note");
        break;
      case "purchase_orders":
        navigate("/purchases?tab=purchase_order");
        break;
      case "expense":
        navigate(ROUTE_PATHS.expenses);
        break;
      default:
        navigate(ROUTE_PATHS.pos);
    }
  };

  // Mobile Bottom Navigation Bar & Sheet
  if (isMobile) {
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || (location.pathname === "/" && userRole !== "cashier");
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B1120]/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-[0_-10px_35px_rgba(0,0,0,0.5)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-400 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {/* Tab 1: Dashboard */}
          <NavLink
            to={ROUTE_PATHS.dashboard}
            end={true}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all duration-200 min-w-[50px] touch-target",
              isDashboardActive ? "text-amber-400 font-bold" : "hover:text-white text-slate-400"
            )}
            activeClassName="text-amber-400 font-bold"
          >
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isDashboardActive ? "bg-amber-400/15 text-amber-400 shadow-glow" : ""
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium leading-none tracking-tight">Home</span>
          </NavLink>

          {/* Tab 2: Sales Hub */}
          <NavLink
            to={ROUTE_PATHS.sales}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all duration-200 min-w-[50px] touch-target",
              isSalesActive ? "text-indigo-400 font-bold" : "hover:text-white text-slate-400"
            )}
            activeClassName="text-indigo-400 font-bold"
          >
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isSalesActive ? "bg-indigo-500/20 text-indigo-400 shadow-glow" : ""
              )}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium leading-none tracking-tight">Sales</span>
          </NavLink>

          {/* Tab 3: Center Elevated POS Terminal Button */}
          <NavLink
            to={ROUTE_PATHS.checkout}
            className="flex flex-col items-center justify-center -mt-5 px-1 group z-10"
            aria-label="Open POS Billing Terminal"
          >
            <div
              className={cn(
                "w-13 h-13 rounded-2xl flex items-center justify-center shadow-lift transition-all duration-200 ring-4 ring-[#0B1120] active:scale-95",
                isPosActive
                  ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/40"
                  : "bg-gradient-to-tr from-indigo-600 to-violet-500 text-white hover:brightness-110"
              )}
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span
              className={cn(
                "text-[10px] font-bold mt-1 tracking-tight",
                isPosActive ? "text-amber-400" : "text-slate-300"
              )}
            >
              POS Billing
            </span>
          </NavLink>

          {/* Tab 4: Items & Inventory */}
          <NavLink
            to={ROUTE_PATHS.items}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all duration-200 min-w-[50px] touch-target",
              isItemsActive ? "text-emerald-400 font-bold" : "hover:text-white text-slate-400"
            )}
            activeClassName="text-emerald-400 font-bold"
          >
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isItemsActive ? "bg-emerald-500/20 text-emerald-400 shadow-glow" : ""
              )}
            >
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium leading-none tracking-tight">Items</span>
          </NavLink>

          {/* Tab 5: More Drawer Sheet */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-slate-400 hover:text-white transition-all min-w-[50px] touch-target"
                aria-label="Open all navigation links"
              >
                <div className="p-1.5 rounded-xl">
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none tracking-tight">More</span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[min(88dvh,48rem)] rounded-t-3xl border-t border-slate-800 bg-[#0B1120] text-slate-200 px-4 sm:px-6 pb-6 shadow-2xl flex flex-col overflow-hidden"
            >
              <SheetHeader className="mb-3 text-left shrink-0 pb-3 border-b border-slate-800/80">
                <div
                  onClick={() => setMobileSwitcherOpen(!mobileSwitcherOpen)}
                  className="flex items-center justify-between p-1 -m-1 rounded-2xl hover:bg-slate-800/50 active:scale-[0.99] transition-all cursor-pointer group"
                  title="Tap to switch store or branch"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-amber-400/30">
                      {org?.name ? org.name.charAt(0).toUpperCase() : "C"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <SheetTitle className="text-base font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {org?.name || "CredSmart POS"}
                        </SheetTitle>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-transform duration-200 shrink-0",
                            mobileSwitcherOpen && "rotate-180 text-amber-400"
                          )}
                        />
                      </div>
                      <SheetDescription className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="truncate">{org?.phone || "Active Store"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                        <span className="text-amber-400 font-mono text-[11px] font-semibold shrink-0">{roleLabel}</span>
                      </SheetDescription>
                    </div>
                  </div>

                  <div className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold shrink-0 ml-2">
                    {organizations.length} Store{organizations.length > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Expandable Mobile Store Switcher List */}
                {mobileSwitcherOpen && (
                  <div className="mt-3 p-2 bg-slate-900 rounded-2xl border border-slate-700/80 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                      <span>Switch Branch / Store</span>
                      <span className="text-amber-400">1-Tap Switch</span>
                    </div>

                    <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-thin">
                      {organizations.map((business) => {
                        const isActive = business.id === orgId;
                        return (
                          <button
                            key={business.id}
                            type="button"
                            onClick={() => {
                              switchOrganization(business.id);
                              setMobileSwitcherOpen(false);
                              setMobileMenuOpen(false);
                              toast.success(`Switched to "${business.name}"`);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all active:scale-[0.98]",
                              isActive
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                : "hover:bg-slate-800 text-slate-300 hover:text-white"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-xs font-semibold">{business.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                {business.business_type || "Retail"} {business.gstin ? `• ${business.gstin}` : ""}
                              </p>
                            </div>
                            {isActive ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400" />
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">Switch</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileSwitcherOpen(false);
                          setMobileMenuOpen(false);
                          setCreateBusinessModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Branch / Store</span>
                      </button>
                    </div>
                  </div>
                )}
              </SheetHeader>

              {/* Quick Actions Bar inside Drawer */}
              <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setUniversalModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-600/30 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>+ Quick Create Hub</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCreateBusinessModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all active:scale-95"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Add Branch / Store</span>
                </button>
              </div>

              {/* Full Route Groups */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.url === "/"}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors text-xs font-medium"
                          activeClassName="bg-indigo-600 text-white font-bold shadow-xs"
                        >
                          <item.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Sign Out */}
              <div className="pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-semibold text-xs transition-all active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of CredSmart</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        <UniversalQuickCreateModal
          open={universalModalOpen}
          onOpenChange={setUniversalModalOpen}
        />

        <CreateBusinessModal
          open={createBusinessModalOpen}
          onOpenChange={setCreateBusinessModalOpen}
        />
      </>
    );
  }

  // Desktop Sidebar matching institutional CredAlert aesthetic
  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] min-h-0 bg-[#0B1120] text-slate-300 border-r border-slate-800/80 shadow-2xl transition-all duration-300 sticky top-0 overflow-hidden select-none z-30 font-sans",
        collapsed ? "w-[72px]" : "w-[244px]"
      )}
    >
      {/* Top Store Header with Multi-Business Switcher */}
      <div className="p-3.5 border-b border-slate-800/80 shrink-0 bg-[#080D1A] relative" ref={businessSwitcherRef}>
        <div
          onClick={() => !collapsed && setBusinessSwitcherOpen(!businessSwitcherOpen)}
          className={cn(
            "flex items-center gap-3 rounded-xl p-1 -m-1 transition-colors cursor-pointer group",
            !collapsed && "hover:bg-slate-800/50"
          )}
          title="Switch Business / Branch"
        >
          {/* Amber/Gold Avatar with initials */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-amber-400/30">
            {org?.name ? org.name.charAt(0).toUpperCase() : "C"}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-sm font-bold text-white truncate tracking-tight group-hover:text-amber-400 transition-colors">
                  {org?.name || "CredAlert Business"}
                </h2>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0",
                    businessSwitcherOpen && "rotate-180 text-amber-400"
                  )}
                />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="text-[11px] text-slate-400 font-mono tracking-tight truncate">
                  {org?.phone || "Active Store"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Multi-Business Switcher Popover Menu */}
        {businessSwitcherOpen && !collapsed && (
          <div className="absolute left-3 right-3 top-full mt-2 bg-slate-900 text-slate-200 rounded-2xl shadow-2xl border border-slate-700/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Your Businesses</span>
              <span className="text-amber-400">{organizations.length} Store(s)</span>
            </div>

            <div className="space-y-1 my-1 max-h-48 overflow-y-auto scrollbar-thin">
              {organizations.map((business) => {
                const isActive = business.id === orgId;
                return (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => {
                      switchOrganization(business.id);
                      setBusinessSwitcherOpen(false);
                      toast.success(`Switched to "${business.name}"`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all",
                      isActive
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs">{business.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {business.business_type || "Retail"} {business.gstin ? `• ${business.gstin}` : ""}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setBusinessSwitcherOpen(false);
                  setCreateBusinessModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Business / Branch</span>
              </button>
            </div>
          </div>
        )}

        {/* "+ Create Sales Invoice" Dropdown Button */}
        {!collapsed && (
          <div className="relative mt-3" ref={quickCreateRef}>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex items-center justify-between w-full rounded-full text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift transition-all font-semibold text-xs py-2.5 px-4 select-none border border-white/10 ripple-surface"
              aria-expanded={quickCreateOpen}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="tracking-tight truncate font-bold">Create Invoice</span>
              </div>
              <ChevronDown
                className={cn("w-4 h-4 transition-transform duration-200 shrink-0 ml-1 text-slate-300", quickCreateOpen ? "rotate-180" : "")}
              />
            </button>

            {/* Comprehensive Quick Action Flyout Menu */}
            {quickCreateOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 text-slate-200 rounded-2xl shadow-2xl border border-slate-700/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[72vh] overflow-y-auto scrollbar-thin">
                {/* View All Options Popup Trigger */}
                <div className="px-2 pb-1.5 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      setUniversalModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 font-bold text-[11px] transition-colors border border-indigo-700/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>All Creation Options</span>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      Hub
                    </span>
                  </button>
                </div>

                {/* GENERAL */}
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  GENERAL
                </div>
                <button
                  onClick={() => handleQuickAction("party")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Create Party</span>
                </button>
                <button
                  onClick={() => handleQuickAction("item")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <PackagePlus className="w-4 h-4 text-indigo-400" />
                  <span>Create Item</span>
                </button>

                <div className="my-1.5 border-t border-slate-800" />

                {/* SALES TRANSACTIONS */}
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  SALES TRANSACTIONS
                </div>
                <button
                  onClick={() => handleQuickAction("sales_invoice")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-200 hover:bg-indigo-950/60 hover:text-indigo-300 transition-colors text-left font-semibold"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Sales Invoice</span>
                </button>
                <button
                  onClick={() => {
                    setQuickCreateOpen(false);
                    navigate(ROUTE_PATHS.pos);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/60 transition-colors text-left font-semibold"
                >
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>POS Billing (Counter Sale)</span>
                </button>
                <button
                  onClick={() => handleQuickAction("quotation")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  <span>Quotation / Estimate</span>
                </button>
                <button
                  onClick={() => handleQuickAction("payment_in")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Payment In</span>
                </button>
                <button
                  onClick={() => handleQuickAction("sales_return")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Sales Return</span>
                </button>
                <button
                  onClick={() => handleQuickAction("credit_note")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Credit Note</span>
                </button>
                <button
                  onClick={() => handleQuickAction("delivery_challan")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Delivery Challan</span>
                </button>
                <button
                  onClick={() => handleQuickAction("proforma")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Proforma Invoice</span>
                </button>

                <div className="my-1.5 border-t border-slate-800" />

                {/* PURCHASE TRANSACTIONS */}
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                  PURCHASE TRANSACTIONS
                </div>
                <button
                  onClick={() => handleQuickAction("purchase")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-200 hover:bg-indigo-950/60 hover:text-indigo-300 transition-colors text-left font-semibold"
                >
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span>Purchase Invoice</span>
                </button>
                <button
                  onClick={() => handleQuickAction("payment_out")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-rose-400" />
                  <span>Payment Out</span>
                </button>
                <button
                  onClick={() => handleQuickAction("purchase_return")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Purchase Return</span>
                </button>
                <button
                  onClick={() => handleQuickAction("debit_note")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <FileCheck className="w-4 h-4 text-slate-400" />
                  <span>Debit Note</span>
                </button>
                <button
                  onClick={() => handleQuickAction("purchase_orders")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Purchase Orders</span>
                </button>

                <div className="my-1.5 border-t border-slate-800" />

                {/* EXPENSES */}
                <button
                  onClick={() => handleQuickAction("expense")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-purple-400" />
                  <span>Create Expense</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-4 overflow-y-auto scrollbar-thin text-xs">
        {filteredNavRouteGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 font-mono">
                {group.group}
              </p>
            )}

            {group.items.map((item) => {
              const active = isRouteActive(item.url);
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isExpanded = expandedMenus[item.title];

              return (
                <div key={item.url} className="space-y-0.5">
                  <div
                    onClick={() => {
                      navigate(item.url);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200 cursor-pointer font-medium select-none group relative",
                      active
                        ? "bg-accent/15 text-accent font-bold border border-accent/30 shadow-glow"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                        active ? "text-accent" : "text-slate-400 group-hover:text-white"
                      )}
                    />

                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                            {item.badge}
                          </span>
                        )}
                        {hasChildren && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubmenu(item.title);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 group-hover:text-white transition-transform"
                          >
                            <ChevronDown
                              className={cn(
                                "w-3.5 h-3.5 transition-transform duration-200",
                                isExpanded ? "rotate-180" : ""
                              )}
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submenu Children when expanded */}
                  {hasChildren && !collapsed && isExpanded && (
                    <div className="pl-6 pr-1 space-y-0.5 pt-0.5 animate-in slide-in-from-top-1 duration-150">
                      {item.children?.map((child) => (
                        <NavLink
                          key={child.title}
                          to={child.url}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                          activeClassName="text-accent font-semibold bg-accent/10 border border-accent/20"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-500" />
                          <span className="truncate">{child.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Security Badges & Sign Out */}
      <div className="p-3 border-t border-slate-800/80 bg-[#080D1A] space-y-2 shrink-0 text-xs">
        {!collapsed && (
          <div className="space-y-1 px-1 py-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1 text-emerald-400">
                <Shield className="w-3 h-3" />
                <span>IT Act 2000 Ready</span>
              </div>
              <div className="flex items-center gap-1 text-indigo-300 font-mono">
                <span>256-bit SSL</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 font-mono truncate">
              CredAlert B2B Infrastructure
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-1 pt-1">
          <button
            onClick={signOut}
            title="Sign Out"
            className={cn(
              "flex items-center gap-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 px-2.5 py-1.5 transition-colors font-medium text-xs",
              collapsed ? "w-full justify-center p-2" : "flex-1"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <UniversalQuickCreateModal
        open={universalModalOpen}
        onOpenChange={setUniversalModalOpen}
      />

      <CreateBusinessModal
        open={createBusinessModalOpen}
        onOpenChange={setCreateBusinessModalOpen}
      />
    </aside>
  );
}
