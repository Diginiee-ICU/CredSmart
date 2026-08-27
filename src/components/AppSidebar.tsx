import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Shield,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Truck,
  BarChart3,
  Landmark,
  FileCheck,
  Repeat,
  Users,
  Activity,
  Settings,
  FileText,
  X,
  Plus,
  Sparkles,
  Building2,
  Store,
  LogOut,
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { NAV_ROUTES, ROUTE_PATHS, isRouteAllowedForRole, type NavRouteItem } from "@/config/routes";
import { toast } from "sonner";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { CreateBusinessModal } from "@/components/CreateBusinessModal";

export function AppSidebar() {
  const navigate = useNavigate();
  // isMenuDropdownOpen controls whether the sidebar expands to full width (260px) or stays compact (76px)
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [universalModalOpen, setUniversalModalOpen] = useState(false);
  const [createBusinessModalOpen, setCreateBusinessModalOpen] = useState(false);
  const [mobileSwitcherOpen, setMobileSwitcherOpen] = useState(false);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Parties: true,
    Catalog: true,
    "Sales Hub": true,
    "Purchase Hub": false,
    "Reports & Insights": false,
    "Accounting Solutions": false,
    "Business Tools": false,
    "Settings & Preferences": false,
  });

  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { org, orgId, organizations, switchOrganization, userRole, userPermissions } = useOrganization();
  const location = useLocation();

  // Filter groups and items based on role permissions
  const filteredNavRouteGroups = useMemo(() => {
    return NAV_ROUTES.map((group) => ({
      ...group,
      group: group.label,
      items: group.items
        .filter((item) => isRouteAllowedForRole(item.url, userRole, userPermissions))
        .map((item) => ({
          ...item,
          children: item.children
            ? item.children.filter((child) => isRouteAllowedForRole(child.url as string, userRole, userPermissions))
            : undefined,
        })),
    })).filter((group) => group.items.length > 0);
  }, [userRole, userPermissions]);

  const allAllowedNavItems = useMemo(
    () => filteredNavRouteGroups.flatMap((g) => g.items),
    [filteredNavRouteGroups]
  );

  const isRouteActive = useMemo(
    () => (url: string) =>
      url === "/"
        ? location.pathname === "/"
        : location.pathname === url || location.pathname.startsWith(`${url}/`),
    [location.pathname]
  );

  // Auto-expand submenus when active route changes
  useEffect(() => {
    filteredNavRouteGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          const hasActiveChild = item.children.some((child) => isRouteActive(child.url as string));
          if (hasActiveChild || isRouteActive(item.url)) {
            setExpandedMenus((prev) => ({
              ...prev,
              [item.title]: true,
            }));
          }
        }
      });
    });
  }, [location.pathname, filteredNavRouteGroups, isRouteActive]);

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

  // Mobile Bottom Navigation Bar & Sheet
  if (isMobile) {
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || (location.pathname === "/" && userRole !== "cashier");
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

    return (
      <>
        {/* Mobile Bottom Navigation Dock */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C0B2D]/95 backdrop-blur-2xl border-t border-[#1F1C5C]/90 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-400 select-none"
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

          {/* Tab 3: Center Elevated POS Terminal Button */}
          <NavLink
            to={ROUTE_PATHS.checkout}
            className="flex flex-col items-center justify-center -mt-6 px-1 group z-10"
            aria-label="Open POS Billing Terminal"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ring-4 ring-[#0C0B2D] active:scale-95",
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
                <span className="text-[10px] font-semibold leading-none tracking-tight">More</span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[min(92dvh,52rem)] rounded-t-3xl border-t border-[#1F1C5C]/80 bg-[#0C0B2D] text-slate-200 px-4 sm:px-6 pb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Access all business tools and actions</SheetDescription>
              </SheetHeader>

              {/* Mobile Drawer Top Banner with Large GIF Logo */}
              <div className="flex items-center justify-between pt-1 pb-3 border-b border-[#1F1C5C]/60 shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src="/IMG_9301.GIF"
                    alt="CredSmart Logo"
                    className="h-12 w-auto max-w-[150px] object-contain rounded-lg shadow-sm"
                  />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-[#141242] border border-[#232064] text-slate-400 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorized Route Navigation List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin py-2">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.label || group.group}
                    </p>

                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const hasChildren = Boolean(item.children && item.children.length > 0);
                        const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url as string));
                        const isSelfActive = isRouteActive(item.url);
                        const active = isSelfActive || isChildActive;
                        const isExpanded = expandedMenus[item.title];

                        return (
                          <div key={item.url} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasChildren) {
                                  toggleSubmenu(item.title);
                                } else {
                                  setMobileMenuOpen(false);
                                  navigate(item.url);
                                }
                              }}
                              data-feature="billbook"
                              className={cn(
                                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 text-xs font-bold select-none text-left",
                                active
                                  ? "bg-gradient-to-r from-amber-500/25 to-amber-600/10 text-white font-black border border-amber-400/40"
                                  : "text-slate-200 hover:bg-[#1C1A54] hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-xl border shrink-0",
                                    active ? "bg-amber-500/20 border-amber-400/50 text-amber-300" : "bg-[#141242] border-[#262270] text-amber-400"
                                  )}
                                >
                                  <item.icon className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <span className="truncate font-bold tracking-tight text-white">{item.title}</span>
                              </div>
                              {hasChildren ? (
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                                    isExpanded && "rotate-180 text-amber-400"
                                  )}
                                />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                            </button>

                            {/* Render child routes when expanded */}
                            {hasChildren && isExpanded && (
                              <div className="pl-6 pr-1 space-y-1 pt-1 ml-2 border-l border-[#1F1C5C] animate-in slide-in-from-top-1 duration-150">
                                {item.children?.map((child) => {
                                  const childActive = isRouteActive(child.url as string);
                                  return (
                                    <NavLink
                                      key={child.title}
                                      to={child.url as string}
                                      onClick={() => setMobileMenuOpen(false)}
                                      data-feature="billbook"
                                      className={cn(
                                        "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors",
                                        childActive
                                          ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-400/30"
                                          : "text-slate-300 hover:text-white hover:bg-[#1C1A54]"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full shrink-0",
                                          childActive ? "bg-amber-400 shadow-xs shadow-amber-400" : "bg-slate-500"
                                        )}
                                      />
                                      <span className="truncate">{child.title}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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

  // Desktop Sidebar
  // When closed (isMenuDropdownOpen === false), width is w-[76px] (showing large Logo and Menu toggle button).
  // When open (isMenuDropdownOpen === true), width expands smoothly to w-[260px], resizing the page data layout!
  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] min-h-0 bg-[#0C0B2D] text-slate-300 border-r border-[#1F1C5C]/70 shadow-2xl transition-all duration-300 sticky top-0 overflow-hidden select-none z-30 font-sans",
        isMenuDropdownOpen ? "w-[260px]" : "w-[76px]"
      )}
    >
      {/* 1. Large CREDSMART Animated GIF Hero Logo Header */}
      {isMenuDropdownOpen ? (
        <div className="p-3.5 border-b border-[#1F1C5C]/60 shrink-0 bg-[#0C0B2D] flex items-center justify-center">
          <NavLink
            to={ROUTE_PATHS.dashboard}
            className="flex items-center justify-center w-full bg-[#0C0B2D] p-1 hover:scale-[1.03] transition-all duration-300 group cursor-pointer"
            title="CredSmart Dashboard"
          >
            <img
              src="/IMG_9301.GIF"
              alt="CREDSMART"
              className="w-full max-h-24 object-contain rounded-xl"
            />
          </NavLink>
        </div>
      ) : (
        <div className="p-2.5 border-b border-[#1F1C5C]/60 shrink-0 bg-[#0C0B2D] flex justify-center">
          <NavLink
            to={ROUTE_PATHS.dashboard}
            title="CredSmart Dashboard"
            className="w-14 h-14 rounded-2xl bg-[#0C0B2D] border border-amber-500/30 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:border-amber-400 hover:scale-105 transition-all duration-200 cursor-pointer"
          >
            <img
              src="/IMG_9301.GIF"
              alt="CREDSMART"
              className="w-full h-full object-cover scale-110"
            />
          </NavLink>
        </div>
      )}

      {/* 2. New "Menu" Dropdown Button Placed Just Below Logo */}
      {isMenuDropdownOpen ? (
        <div className="p-2.5 border-b border-[#1F1C5C]/60 shrink-0 bg-[#0C0B2D]">
          <button
            type="button"
            onClick={() => setIsMenuDropdownOpen(false)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer select-none border shadow-md bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-[#161448] text-amber-300 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] group"
            title="Collapse Sidebar Menu"
            aria-expanded={true}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-amber-400/20 text-amber-400 transition-colors shrink-0">
                <Menu className="w-4 h-4 stroke-[2.4]" />
              </div>
              <div className="min-w-0 text-left">
                <span className="block font-black text-xs tracking-wide">Menu</span>
                <span className="block text-[10px] text-slate-400 font-mono font-normal">
                  Click to collapse
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 shrink-0 rotate-180 text-amber-400" />
          </button>
        </div>
      ) : (
        <div className="p-2.5 border-b border-[#1F1C5C]/60 shrink-0 bg-[#0C0B2D] flex justify-center">
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsMenuDropdownOpen(true)}
                className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center border transition-all duration-200 cursor-pointer shadow-md bg-[#141242] border-[#262270] text-slate-200 hover:text-white hover:border-amber-400/50 hover:bg-[#1A1854] active:scale-95 group"
                aria-label="Open Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.4] text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold mt-0.5 tracking-tight font-mono">Menu</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="bg-[#0F0E38] text-slate-100 border border-[#2B277A] text-xs font-semibold py-1.5 px-3 rounded-xl shadow-xl z-[220]">
              Open Sidebar Menu
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* 3. Navigation Menu (Expands when isMenuDropdownOpen is true) */}
      {isMenuDropdownOpen ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 bg-[#0C0B2D]">
          <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-3.5 overflow-y-auto scrollbar-thin text-xs bg-[#0C0B2D]">
            {filteredNavRouteGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400/90 font-mono">
                  {group.label || group.group}
                </p>

                {group.items.map((item) => {
                  const hasChildren = Boolean(item.children && item.children.length > 0);
                  const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url as string));
                  const isSelfActive = isRouteActive(item.url);
                  const active = isSelfActive || isChildActive;
                  const isExpanded = expandedMenus[item.title];

                  return (
                    <div key={item.url} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasChildren) {
                            toggleSubmenu(item.title);
                          } else {
                            navigate(item.url);
                          }
                        }}
                        data-feature="billbook"
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer font-bold select-none group text-left relative",
                          active
                            ? "bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent text-amber-300 font-black border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                            : "text-slate-300 hover:bg-[#161448] hover:text-white border border-transparent"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 stroke-[2.2]",
                            active ? "text-amber-400" : "text-amber-400/80 group-hover:text-amber-300"
                          )}
                        />

                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <span className="truncate font-bold tracking-tight text-white">{item.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
                                {item.badge}
                              </span>
                            )}
                            {hasChildren && (
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200",
                                  isExpanded ? "rotate-180 text-amber-400" : ""
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Drop Down Sub-Menu */}
                      {hasChildren && isExpanded && (
                        <div className="pl-4 pr-1 space-y-1 pt-0.5 border-l border-[#1F1C5C] ml-4 animate-in slide-in-from-top-1 duration-150">
                          {item.children?.map((child) => {
                            const childActive = isRouteActive(child.url as string);
                            return (
                              <NavLink
                                key={child.title}
                                to={child.url as string}
                                data-feature="billbook"
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150",
                                  childActive
                                    ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                                    : "text-slate-400 hover:text-white hover:bg-[#161448]"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                                    childActive
                                      ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-110"
                                      : "bg-slate-600 group-hover:bg-slate-400"
                                  )}
                                />
                                <span className="truncate">{child.title}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 text-center select-none bg-[#0C0B2D]">
          {/* Compact placeholder */}
        </div>
      )}

      {/* 4. Footer Security Badges & Collapse Arrow */}
      <div className="p-3 border-t border-[#1F1C5C]/60 bg-[#0C0B2D] space-y-2 shrink-0 text-xs">
        {isMenuDropdownOpen ? (
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
        ) : (
          <div className="flex items-center justify-center text-emerald-400" title="IT Act 2000 Ready & 256-bit SSL">
            <Shield className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
            title={isMenuDropdownOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            className="w-full flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1C1A54] transition-colors cursor-pointer"
            aria-label={isMenuDropdownOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isMenuDropdownOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
