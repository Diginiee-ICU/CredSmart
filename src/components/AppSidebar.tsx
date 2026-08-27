import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  Menu,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Shield,
  X,
  ChevronRight,
  Search,
  Zap,
  Sparkles,
  Layers,
  Truck,
  ArrowUpRight,
  Store,
  Users,
  Users2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavGroup {
  label: string;
  group: string;
  items: {
    title: string;
    url: string;
    icon: React.ElementType;
    badge?: string;
    shortcut?: string;
    children?: { title: string; url: string }[];
  }[];
}

// ─── AppSidebar / Dropdown Navigator ──────────────────────────────────────────

export function AppSidebar({
  isOpen = false,
  onClose,
  isPushLayout = false,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  isPushLayout?: boolean;
} = {}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userRole, userPermissions } = useOrganization();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close panel on outside click & escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => {
    onClose?.();
  }, [location.pathname]);

  // Filtered nav groups by role & search query
  const filteredNavRouteGroups: NavGroup[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return NAV_ROUTES.map((group) => {
      const allowedItems = group.items
        .filter((item) => isRouteAllowedForRole(item.url, userRole, userPermissions))
        .map((item) => {
          const allowedChildren = item.children
            ? item.children.filter((child) =>
                isRouteAllowedForRole(child.url as string, userRole, userPermissions)
              )
            : undefined;

          return {
            ...item,
            children: allowedChildren,
          };
        });

      if (!query) {
        return {
          label: group.label || group.group || "",
          group: group.group || group.label || "",
          items: allowedItems,
        };
      }

      // If query exists, match item title or child titles
      const matchedItems = allowedItems.filter((item) => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesChildren = item.children?.some((child) =>
          child.title.toLowerCase().includes(query)
        );
        return matchesTitle || matchesChildren;
      });

      return {
        label: group.label || group.group || "",
        group: group.group || group.label || "",
        items: matchedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [userRole, userPermissions, searchQuery]);

  const isRouteActive = useMemo(
    () => (url: string) =>
      url === "/"
        ? location.pathname === "/"
        : location.pathname === url || location.pathname.startsWith(`${url}/`),
    [location.pathname]
  );

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    onClose?.();
  };

  // ─── Mobile: Bottom Navigation Dock ───────────────────────────────────────
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || location.pathname === "/";
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

  return (
    <>
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {/* Home */}
          <NavLink
            to={ROUTE_PATHS.dashboard}
            end
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer",
              isDashboardActive ? "text-amber-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isDashboardActive
                  ? "bg-amber-100/50 border-amber-300 text-amber-600 shadow-[0_0_16px_rgba(251,191,36,0.2)] scale-105"
                  : "bg-transparent border-transparent"
              )}
            >
              <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight">Home</span>
          </NavLink>

          {/* Sales */}
          <NavLink
            to={ROUTE_PATHS.sales}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer",
              isSalesActive ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isSalesActive
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-[0_0_16px_rgba(99,102,241,0.15)] scale-105"
                  : "bg-transparent border-transparent"
              )}
            >
              <Receipt className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight">Sales</span>
          </NavLink>

          {/* Center Elevated 3D POS Billing Button */}
          <NavLink
            to={ROUTE_PATHS.checkout}
            className="flex flex-col items-center justify-center -mt-6 px-1.5 z-10 active:scale-90 transition-transform duration-150 cursor-pointer group hover-3d-glow"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-2xl transition-all duration-200",
                isPosActive
                  ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-white shadow-[0_8px_25px_rgba(245,158,11,0.4)] scale-105"
                  : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_6px_25px_rgba(79,70,229,0.35)] group-hover:brightness-110"
              )}
            >
              <ShoppingCart className="w-6 h-6 fill-current" />
            </div>
            <span className={cn("text-[10px] mt-1 font-bold", isPosActive ? "text-amber-600" : "text-slate-800")}>
              POS Billing
            </span>
          </NavLink>

          {/* Items */}
          <NavLink
            to={ROUTE_PATHS.items}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer",
              isItemsActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isItemsActive
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_16px_rgba(16,185,129,0.15)] scale-105"
                  : "bg-transparent border-transparent"
              )}
            >
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight">Items</span>
          </NavLink>

          {/* Purchases */}
          <NavLink
            to={ROUTE_PATHS.purchases}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer hover-3d-glow",
              isRouteActive(ROUTE_PATHS.purchases) ? "text-rose-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isRouteActive(ROUTE_PATHS.purchases)
                  ? "bg-rose-50 border-rose-200 text-rose-600 shadow-[0_0_16px_rgba(225,29,72,0.15)] scale-105"
                  : "bg-transparent border-transparent"
              )}
            >
              <Truck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight">Purchases</span>
          </NavLink>
        </nav>
      )}

      {/* ─── High-Impact 3D Dropdown Navigator Popover (Desktop & Mobile) ───────────────────── */}
      {isOpen && (
        <>
          {/* Transparent backdrop overlay for outside click dismissal to reveal 3D Squeeze effect */}
      <div
        className="fixed inset-0 z-[190] bg-transparent cursor-default"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 3D Dropdown Floating Popover (Top Mega Menu) */}
      <div
        ref={panelRef}
        className={cn(
          // Centered full-width Mega Menu below header
          "fixed top-[6rem] sm:top-[4.75rem] left-4 right-4 max-w-7xl mx-auto z-[200]",
          // Dimensions
          "max-h-[calc(100vh-6rem)] flex flex-col",
          // 3D Glass Surface Architecture - LIGHT THEME
          "rounded-3xl overflow-hidden",
          "bg-white/95 backdrop-blur-3xl",
          // Specular highlights & multi-tier 3D elevation
          "border border-slate-200/80",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_20px_50px_rgba(0,0,0,0.1),0_40px_100px_rgba(0,0,0,0.05)]",
          // Dropdown Entrance Animation from TOP
          "animate-in fade-in slide-in-from-top-6 zoom-in-[0.98] duration-300 ease-out select-none"
        )}
        style={{ transformOrigin: "top center" }}
      >
        {/* Dropdown Top Anchor Pointer Indicator */}
        <div className="absolute -top-2 left-10 w-4 h-4 rotate-45 bg-white border-t border-l border-slate-200 shadow-sm" />

        {/* ── Dropdown Header Strip ── */}
        <div className="shrink-0 px-6 pt-4 pb-3.5 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/IMG_9301.GIF"
                alt="CredSmart Mega Menu"
                className="h-10 w-auto object-contain drop-shadow-sm"
              />
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse hidden sm:block" />
            </div>

            {/* Quick Search Input */}
            <div className="relative flex-1 max-w-md mx-4 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules & shortcuts..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 border border-slate-200 focus:border-amber-400 focus:bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-hidden transition-all shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex px-2 py-1 rounded-md text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
                ESC
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-all border border-slate-200 cursor-pointer hover-3d-glow"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Access 4-Tile Launchpad (Mobile only or when searching) ── */}
        <div className="sm:hidden shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-100 border border-slate-200 focus:border-amber-400 focus:bg-white text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden transition-all shadow-inner"
              />
            </div>
        </div>

        {/* ── Mega Menu 3D Grid Content ── */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 sm:p-8 scrollbar-thin">
          {filteredNavRouteGroups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Search className="w-8 h-8 text-rose-500" />
              </div>
              <p className="text-sm text-slate-700 font-bold tracking-wide">No matching modules found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredNavRouteGroups.map((group, gIdx) => (
                <div 
                  key={gIdx} 
                  className="relative group/card flex flex-col p-5 rounded-[1.5rem] bg-white border border-slate-200 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover-3d-glow"
                >
                  {/* Subtle Top Glow on Hover */}
                  <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover/card:via-indigo-500/30 transition-all duration-500" />
                  
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-3.5 bg-gradient-to-b from-amber-400 to-rose-500 rounded-full" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 font-mono">
                      {group.label}
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 space-y-1.5">
                    {group.items.map((item) => {
                      const hasChildren = Boolean(item.children?.length);
                      const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                      const active = isRouteActive(item.url) || isChildActive;
                      const isExpanded = expandedMenus[item.title] || Boolean(searchQuery);

                      return (
                        <div key={item.url} className="space-y-1">
                          <div
                            className={cn(
                              "w-full flex items-center justify-between gap-1 pr-1.5 pl-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left group/item relative overflow-hidden",
                              active
                                ? "bg-amber-50 text-amber-900 shadow-sm border border-amber-200"
                                : "bg-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200/60"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleNavigate(item.url)}
                              className="flex items-center gap-3 min-w-0 flex-1 py-0.5 cursor-pointer text-left hover-3d-glow"
                            >
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/item:scale-110 group-hover/item:rotate-[-4deg]",
                                    active
                                      ? "bg-amber-100 text-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                      : "bg-slate-100 text-slate-500 group-hover/item:text-indigo-600 group-hover/item:bg-indigo-50"
                                  )}
                                >
                                  <item.icon className="w-3.5 h-3.5 stroke-[2.2]" />
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                   <span className="truncate group-hover/item:translate-x-0.5 transition-transform text-xs sm:text-sm">{item.title}</span>
                                   {item.badge && (
                                     <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-rose-100 text-rose-700 border border-rose-200 font-mono shrink-0">
                                       {item.badge}
                                     </span>
                                   )}
                                </div>
                            </button>
                            
                            <div className="flex items-center shrink-0">
                                {hasChildren ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSubmenu(item.title);
                                      }}
                                      className="p-1.5 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer flex items-center justify-center hover-3d-glow"
                                      title={`Toggle ${item.title} Menu`}
                                    >
                                      <ChevronDown
                                        className={cn(
                                          "w-4 h-4 transition-transform duration-300",
                                          isExpanded ? "rotate-180 text-amber-500" : "text-slate-400 group-hover/item:text-slate-600"
                                        )}
                                      />
                                    </button>
                                ) : (
                                    <ArrowUpRight className="w-3.5 h-3.5 mr-2 text-slate-400 group-hover/item:text-indigo-500 transition-colors opacity-0 group-hover/item:opacity-100" />
                                )}
                            </div>
                          </div>

                          {/* Render Children Accordion */}
                          {hasChildren && isExpanded && (
                            <div className="ml-10 pl-3 py-1.5 border-l-2 border-slate-200 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                              {item.children?.map((child) => {
                                const childActive = isRouteActive(child.url);
                                return (
                                  <NavLink
                                    key={child.title}
                                    to={child.url}
                                    onClick={onClose}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer group/child",
                                      childActive
                                        ? "text-amber-700 bg-amber-50 border border-amber-200 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300 group-hover/child:scale-150",
                                        childActive ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" : "bg-slate-300 group-hover/child:bg-indigo-500"
                                      )}
                                    />
                                    <span className="truncate group-hover/child:translate-x-0.5 transition-transform">{child.title}</span>
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
          )}
        </nav>

        {/* ── Dropdown Footer Bar ── */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between rounded-b-3xl">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-600 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL • Enterprise Secure • GST Compliant</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-slate-500">
            <span>Cred</span>
            <span className="text-amber-500 font-bold">Smart POS</span>
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}





