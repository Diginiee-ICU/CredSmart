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
  Crown,
  X,
  Store,
  ArrowRight,
  Landmark,
  Settings,
} from "lucide-react";
import { CredsmartLogo } from "@/components/ui/Liquid3DCardGraphics";
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
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { CreatePartyModal } from "@/components/parties/CreatePartyModal";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [universalModalOpen, setUniversalModalOpen] = useState(false);
  const [createBusinessModalOpen, setCreateBusinessModalOpen] = useState(false);
  const [salesInvoiceModalOpen, setSalesInvoiceModalOpen] = useState(false);
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createPartyModalOpen, setCreatePartyModalOpen] = useState(false);
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
  const { org, orgId, organizations, switchOrganization, userRole, userPermissions } = useOrganization();
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

  // Filter groups and items based on role permissions and granular feature toggles
  const filteredNavRouteGroups = NAV_ROUTES.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => isRouteAllowedForRole(item.url, userRole, userPermissions))
      .map((item) => ({
        ...item,
        children: item.children
          ? item.children.filter((child) => isRouteAllowedForRole(child.url, userRole, userPermissions))
          : undefined,
      })),
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

  // Quick action options (Opens direct modules instead of navigating)
  const handleQuickAction = (action: string) => {
    setQuickCreateOpen(false);
    switch (action) {
      case "party":
        setCreatePartyModalOpen(true);
        break;
      case "item":
        setCreateItemModalOpen(true);
        break;
      case "sales_invoice":
        setSalesInvoiceModalOpen(true);
        break;
      case "pos_billing":
      case "pos":
      case "checkout":
        navigate(ROUTE_PATHS.checkout);
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
      case "expense":
        navigate(ROUTE_PATHS.expenses);
        break;
      default:
        navigate(ROUTE_PATHS.pos);
    }
  };

  // Mobile Bottom Navigation Bar & Sheet (Matching Image 5 and Image 2)
  if (isMobile) {
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || (location.pathname === "/" && userRole !== "cashier");
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

    return (
      <>
        {/* Mobile Bottom Navigation Dock (Matching Image 5) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#070D1E]/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-400 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {/* Tab 1: Home / Dashboard */}
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
                isDashboardActive ? "bg-amber-400/15 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]" : ""
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold leading-none tracking-tight">Home</span>
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
                isSalesActive ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.35)]" : ""
              )}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold leading-none tracking-tight">Sales</span>
          </NavLink>

          {/* Tab 3: Center Elevated POS Terminal Button (Matching Image 5) */}
          <NavLink
            to={ROUTE_PATHS.checkout}
            className="flex flex-col items-center justify-center -mt-6 px-1 group z-10"
            aria-label="Open POS Billing Terminal"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ring-4 ring-[#070D1E] active:scale-95",
                isPosActive
                  ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                  : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:brightness-110"
              )}
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.4]" />
            </div>
            <span
              className={cn(
                "text-[10px] font-bold mt-1 tracking-tight",
                isPosActive ? "text-amber-400" : "text-slate-200"
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
                isItemsActive ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]" : ""
              )}
            >
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold leading-none tracking-tight">Items</span>
          </NavLink>

          {/* Tab 5: More Drawer Sheet (Matching Image 2) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-slate-400 hover:text-white transition-all min-w-[50px] touch-target"
                aria-label="Open all navigation links"
              >
                <div className="p-1.5 rounded-xl">
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold leading-none tracking-tight">More</span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[min(90dvh,50rem)] rounded-t-3xl border-t border-slate-700/80 bg-[#080E1E] text-slate-200 px-4 sm:px-6 pb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
            >
              {/* Header: Store Profile Card matching Image 2 */}
              <div className="pt-2 pb-3.5 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => setMobileSwitcherOpen(!mobileSwitcherOpen)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                  >
                    {/* Golden Glowing Rounded Square Avatar (Image 2) */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0 ring-2 ring-amber-300/40">
                      {org?.name ? org.name.charAt(0).toUpperCase() : "T"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {org?.name || "Ttf"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-transform duration-200 shrink-0",
                            mobileSwitcherOpen && "rotate-180 text-amber-400"
                          )}
                        />
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>{org?.phone || "88888"}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-amber-400 font-semibold font-sans">{roleLabel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                      <Store className="w-3.5 h-3.5 text-amber-400" />
                      <span>{organizations.length} Store{organizations.length > 1 ? "s" : ""}</span>
                    </div>

                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Expandable Mobile Store Switcher List */}
                {mobileSwitcherOpen && (
                  <div className="mt-3 p-2 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                      <span>Switch Branch / Store</span>
                      <span className="text-amber-400">1-Tap Switch</span>
                    </div>

                    <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-thin">
                      {(organizations || []).filter(Boolean).map((business) => {
                        if (!business) return null;
                        const isActive = business.id === orgId;
                        const bizName = business.name || "Store";
                        return (
                          <button
                            key={business.id || Math.random()}
                            type="button"
                            onClick={() => {
                              if (business.id) switchOrganization(business.id);
                              setMobileSwitcherOpen(false);
                              setMobileMenuOpen(false);
                              toast.success(`Switched to "${bizName}"`);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all active:scale-[0.98]",
                              isActive
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                : "hover:bg-slate-800 text-slate-300 hover:text-white"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-xs font-semibold">{bizName}</p>
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
              </div>

              {/* Dual Quick Action Glowing Buttons (Matching Image 2) */}
              <div className="grid grid-cols-2 gap-2.5 my-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setUniversalModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl glowing-btn-blue font-bold text-xs active:scale-95 shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>Quick Create Hub</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCreateBusinessModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl glowing-btn-orange font-bold text-xs active:scale-95 shadow-md"
                >
                  <Building2 className="w-4 h-4 text-amber-300" />
                  <span>Add Branch / Store</span>
                </button>
              </div>

              {/* Categorized Route Navigation List (Matching Image 2) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.group}
                    </p>

                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const active = isRouteActive(item.url);
                        return (
                          <div key={item.url}>
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              onClick={() => setMobileMenuOpen(false)}
                              data-feature="billbook"
                              className={cn(
                                "flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 text-xs font-bold select-none",
                                active ? "glowing-nav-purple text-white font-black" : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-xl border shrink-0",
                                    active ? "bg-purple-600/30 border-purple-400 text-white" : "bg-slate-800/80 border-slate-700/80 text-amber-400"
                                  )}
                                >
                                  <item.icon className="w-4 h-4 stroke-[2.5]" />
                                </div>
                                <span className="truncate font-bold tracking-tight text-white">{item.title}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </NavLink>

                            {/* Render child routes for mobile so sub-pages are accessible */}
                            {item.children && item.children.length > 0 && (
                              <div className="pl-6 pr-1 space-y-1 pt-1">
                                {item.children.map((child) => (
                                  <NavLink
                                    key={child.title}
                                    to={child.url as string}
                                    onClick={() => setMobileMenuOpen(false)}
                                    data-feature="billbook"
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                    <span className="truncate font-bold">{child.title}</span>
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: Sign Out Button matching Image 2 */}
              <div className="pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 font-bold text-xs transition-all active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
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

  // Desktop Sidebar (Matching Reference Images 1, 3, 4, 6)
  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] min-h-0 bg-[#080E1E] text-slate-300 border-r border-slate-800/80 shadow-2xl transition-all duration-300 sticky top-0 overflow-hidden select-none z-30 font-sans",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* CREDSMART Shield Logo Header (Image 1) */}
      {!collapsed ? (
        <div className="p-3.5 border-b border-slate-800/80 shrink-0 bg-[#060B18]">
          <CredsmartLogo size={36} showSubtitle={true} />
        </div>
      ) : (
        <div className="p-3 border-b border-slate-800/80 shrink-0 bg-[#060B18] flex justify-center">
          <CredsmartLogo size={30} showSubtitle={false} />
        </div>
      )}

      {/* Store Header with Multi-Business Switcher (Image 1) */}
      <div className="p-3 border-b border-slate-800/80 shrink-0 bg-[#070D1A] relative" ref={businessSwitcherRef}>
        <div
          onClick={() => !collapsed && setBusinessSwitcherOpen(!businessSwitcherOpen)}
          className={cn(
            "flex items-center gap-3 rounded-xl p-1 -m-1 transition-colors cursor-pointer group",
            !collapsed && "hover:bg-slate-800/50"
          )}
          title="Switch Business / Branch"
        >
          {/* Amber/Gold Circular Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-[0_0_12px_rgba(245,158,11,0.35)] shrink-0 ring-2 ring-amber-400/30">
            {org?.name ? org.name.charAt(0).toUpperCase() : "CA"}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-xs font-bold text-white truncate tracking-tight group-hover:text-amber-400 transition-colors">
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
                <p className="text-[10px] text-emerald-400/90 font-mono tracking-tight truncate font-semibold">
                  Active State
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
              <span className="text-amber-400">{(organizations || []).length} Store(s)</span>
            </div>

            <div className="space-y-1 my-1 max-h-48 overflow-y-auto scrollbar-thin">
              {(organizations || []).filter(Boolean).map((business) => {
                if (!business) return null;
                const isActive = business.id === orgId;
                const bizName = business.name || "Store";
                return (
                  <button
                    key={business.id || Math.random()}
                    type="button"
                    onClick={() => {
                      if (business.id) switchOrganization(business.id);
                      setBusinessSwitcherOpen(false);
                      toast.success(`Switched to "${bizName}"`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all",
                      isActive
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                        : "hover:bg-slate-800 text-slate-300 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold">{bizName}</p>
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

        {/* "+ Create Invoice" Neon Blue Button (Matching Image 1) */}
        {!collapsed && (
          <div className="relative mt-2.5" ref={quickCreateRef}>
            <div className="flex items-center justify-between w-full rounded-2xl glowing-btn-blue font-bold text-xs py-1 px-1 select-none shadow-md">
              <button
                type="button"
                onClick={() => setSalesInvoiceModalOpen(true)}
                className="flex items-center gap-2 min-w-0 flex-1 py-1.5 px-2.5 hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0 text-cyan-300" />
                <span className="tracking-tight truncate font-bold text-white">Create Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickCreateOpen(!quickCreateOpen)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="More creation options"
              >
                <ChevronDown
                  className={cn("w-3.5 h-3.5 transition-transform duration-200 text-slate-300", quickCreateOpen ? "rotate-180" : "")}
                />
              </button>
            </div>

            {/* Comprehensive Quick Action Flyout Menu */}
            {quickCreateOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 text-slate-200 rounded-2xl shadow-2xl border border-slate-700/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[72vh] overflow-y-auto scrollbar-thin">
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-4 overflow-y-auto scrollbar-thin text-xs">
        {filteredNavRouteGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <p className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-300 font-mono">
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
                    data-feature="billbook"
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer font-bold select-none group relative",
                      active
                        ? "bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-600/10 text-amber-300 font-black border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                        : "text-slate-100 hover:bg-slate-800/80 hover:text-white"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-110 stroke-[2.2]",
                        active ? "text-amber-400" : "text-amber-400/90 group-hover:text-amber-300"
                      )}
                    />

                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate font-bold tracking-tight text-white">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
                            {item.badge}
                          </span>
                        )}
                        {hasChildren && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubmenu(item.title);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-slate-300 group-hover:text-white transition-transform"
                          >
                            <ChevronDown
                              className={cn(
                                "w-3.5 h-3.5 transition-transform duration-200",
                                isExpanded ? "rotate-180 text-amber-400" : ""
                              )}
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submenu Children when expanded */}
                  {hasChildren && !collapsed && isExpanded && (
                    <div className="pl-6 pr-1 space-y-1 pt-1 animate-in slide-in-from-top-1 duration-150">
                      {item.children?.map((child) => (
                        <NavLink
                          key={child.title}
                          to={child.url}
                          data-feature="billbook"
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/70 transition-colors"
                          activeClassName="text-amber-300 font-black bg-amber-500/15 border border-amber-400/30"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate font-bold">{child.title}</span>
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
      <div className="p-3 border-t border-slate-800/80 bg-[#060B18] space-y-2 shrink-0 text-xs">
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
        onActionSelect={(key) => {
          setUniversalModalOpen(false);
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

      {/* Direct Module: Sales Invoice Modal */}
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
                unit: itemData.unit,
                selling_price: itemData.sellingPrice,
                tax_rate: Number(itemData.gstRate) || 18,
                tags: {
                  selling_price: itemData.sellingPrice,
                  purchase_price: itemData.purchasePrice,
                  mrp: itemData.mrp,
                  unit: itemData.unit,
                  gst_rate: Number(itemData.gstRate) || 18,
                  hsn_code: itemData.hsnCode || "9999",
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
    </aside>
  );
}
