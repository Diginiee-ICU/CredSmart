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
  if (isMobile) {
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || location.pathname === "/";
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

    return (
      <>
        {/* Floating High-Tactile 3D Mobile Dock */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C0B2D]/95 backdrop-blur-2xl border-t border-[#231F68] shadow-[0_-12px_40px_rgba(0,0,0,0.7)] px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-400 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {/* Home */}
          <NavLink
            to={ROUTE_PATHS.dashboard}
            end
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer",
              isDashboardActive ? "text-amber-400 font-bold" : "text-slate-400 hover:text-white"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isDashboardActive
                  ? "bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.4)] scale-105"
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
              isSalesActive ? "text-indigo-300 font-bold" : "text-slate-400 hover:text-white"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isSalesActive
                  ? "bg-indigo-500/25 border-indigo-400/50 text-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.4)] scale-105"
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
            className="flex flex-col items-center justify-center -mt-6 px-1.5 z-10 active:scale-90 transition-transform duration-150 cursor-pointer group"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-[#0C0B2D] shadow-2xl transition-all duration-200",
                isPosActive
                  ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-[0_6px_25px_rgba(245,158,11,0.6)] scale-105"
                  : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_6px_25px_rgba(79,70,229,0.55)] group-hover:brightness-110"
              )}
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span
              className={cn(
                "text-[10px] font-black tracking-tight mt-1 transition-colors",
                isPosActive ? "text-amber-400" : "text-slate-300 group-hover:text-white"
              )}
            >
              POS Billing
            </span>
          </NavLink>

          {/* Items */}
          <NavLink
            to={ROUTE_PATHS.items}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90 cursor-pointer",
              isItemsActive ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-white"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl border transition-all duration-200",
                isItemsActive
                  ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.4)] scale-105"
                  : "bg-transparent border-transparent"
              )}
            >
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight">Items</span>
          </NavLink>

          {/* More Drawer */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-2xl text-slate-400 hover:text-white active:scale-90 transition-all duration-200 min-w-[50px] cursor-pointer"
              >
                <div className="p-1.5 rounded-xl bg-transparent border border-transparent">
                  <Menu className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] tracking-tight">More</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[min(92dvh,54rem)] rounded-t-3xl border-t border-[#2B277A] bg-[#0C0B2D] text-slate-200 px-4 pb-6 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Access all business tools and actions</SheetDescription>
              </SheetHeader>

              {/* Drawer Top Header with Big Logo */}
              <div className="flex items-center justify-between pt-2 pb-3 border-b border-[#1F1C5C]/80 shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src="/IMG_9301.GIF"
                    alt="CredSmart"
                    className="h-14 sm:h-16 w-auto max-w-[190px] object-contain rounded-xl shadow-md ring-1 ring-white/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-[#141242] border border-[#2B277A] text-slate-400 hover:text-white active:scale-95 transition-all cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Search Filter */}
              <div className="pt-3 pb-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu & tools..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[#141242] border border-[#2B277A] focus:border-amber-400/60 rounded-xl text-slate-200 placeholder:text-slate-500 outline-hidden transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4-Tile Quick Access Launchpad */}
              {!searchQuery && (
                <div className="grid grid-cols-4 gap-2 pb-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); navigate(ROUTE_PATHS.checkout); }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#141242]/80 border border-[#2B277A]/70 hover:border-amber-400/40 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200">POS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); navigate(ROUTE_PATHS.sales); }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#141242]/80 border border-[#2B277A]/70 hover:border-indigo-400/40 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-1">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200">Sales</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); navigate(ROUTE_PATHS.items); }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#141242]/80 border border-[#2B277A]/70 hover:border-emerald-400/40 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200">Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); navigate(ROUTE_PATHS.parties); }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#141242]/80 border border-[#2B277A]/70 hover:border-cyan-400/40 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-1">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-200">Parties</span>
                  </button>
                </div>
              )}

              {/* Categorized Route List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-1 scrollbar-thin">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const hasChildren = Boolean(item.children?.length);
                        const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                        const active = isRouteActive(item.url) || isChildActive;
                        const isExpanded = expandedMenus[item.title];
                        return (
                          <div key={item.url} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasChildren) toggleSubmenu(item.title);
                                else {
                                  setMobileMenuOpen(false);
                                  navigate(item.url);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer",
                                active
                                  ? "bg-gradient-to-r from-amber-500/25 to-amber-600/10 text-white border border-amber-400/40 shadow-sm"
                                  : "text-slate-200 hover:bg-[#1C1A54] border border-transparent"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-xl border shrink-0",
                                    active
                                      ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                                      : "bg-[#141242] border-[#262270] text-amber-400"
                                  )}
                                >
                                  <item.icon className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <span className="truncate text-white">{item.title}</span>
                              </div>
                              {hasChildren ? (
                                <ChevronDown
                                  className={cn(
                                    "w-4 h-4 text-slate-400 transition-transform duration-200",
                                    isExpanded && "rotate-180 text-amber-400"
                                  )}
                                />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              )}
                            </button>

                            {hasChildren && isExpanded && (
                              <div className="pl-6 pr-1 space-y-1 pt-1 ml-2 border-l border-[#1F1C5C] animate-in fade-in slide-in-from-top-1 duration-150">
                                {item.children?.map((child) => {
                                  const childActive = isRouteActive(child.url);
                                  return (
                                    <NavLink
                                      key={child.title}
                                      to={child.url}
                                      onClick={() => setMobileMenuOpen(false)}
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
                                          childActive ? "bg-amber-400" : "bg-slate-500"
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
      </>
    );
  }

  // ─── Desktop: High-Impact 3D Dropdown Navigator Popover ─────────────────────
  if (!isOpen) return null;

  return (
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
          "fixed top-[4.75rem] left-4 right-4 max-w-7xl mx-auto z-[200]",
          // Dimensions
          "max-h-[calc(100vh-6rem)] flex flex-col",
          // 3D Glass Surface Architecture
          "rounded-3xl overflow-hidden",
          "bg-[#0C0B2D]/95 backdrop-blur-3xl",
          // Specular highlights & multi-tier 3D elevation
          "border border-[#2D287F]/80",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_50px_rgba(0,0,0,0.8),0_40px_100px_rgba(0,0,0,0.6),0_0_100px_rgba(245,158,11,0.08),inset_0_1px_1px_rgba(255,255,255,0.15)]",
          // Dropdown Entrance Animation from TOP
          "animate-in fade-in slide-in-from-top-6 zoom-in-[0.98] duration-300 ease-out select-none"
        )}
        style={{ transformOrigin: "top center" }}
      >
        {/* Dropdown Top Anchor Pointer Indicator */}
        <div className="absolute -top-2 left-10 w-4 h-4 rotate-45 bg-[#14124E] border-t border-l border-[#2D287F]/80 shadow-md" />

        {/* 3D Top Specular Light Beam */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-[1px] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* ── Dropdown Header Strip ── */}
        <div className="shrink-0 px-6 pt-4 pb-3.5 border-b border-[#1F1C5C]/80 bg-gradient-to-r from-[#14124E]/90 via-[#0F0E38]/90 to-[#14124E]/90">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="text-[13px] font-black tracking-[0.16em] uppercase text-slate-200 font-mono flex items-center gap-1.5">
                CREDSMART <span className="text-amber-400">MEGA MENU</span>
              </span>
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
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#080720]/80 border border-[#262270] focus:border-amber-400/60 focus:bg-[#090826] text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all shadow-inner font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex px-2 py-1 rounded-md text-[10px] font-mono bg-white/10 text-slate-400 border border-white/10">
                ESC
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all border border-white/10 cursor-pointer"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Access 4-Tile Launchpad (Mobile only or when searching) ── */}
        <div className="sm:hidden shrink-0 px-4 py-3 border-b border-[#1F1C5C]/60 bg-[#0A0924]/60">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#080720]/80 border border-[#262270] focus:border-amber-400/60 focus:bg-[#090826] text-xs text-white placeholder-slate-500 focus:outline-hidden transition-all shadow-inner"
              />
            </div>
        </div>

        {/* ── Mega Menu Grid Content ── */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 sm:p-8 scrollbar-thin">
          {filteredNavRouteGroups.length === 0 ? (
            <div className="py-16 text-center">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-semibold">No matching modules found</p>
              <p className="text-xs text-slate-600 mt-1">Try a different keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
              {filteredNavRouteGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3.5">
                  {/* Category Header */}
                  <div className="flex items-center gap-2 border-b border-[#1F1C5C] pb-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 font-mono">
                      {group.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-white/5 text-slate-500">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const hasChildren = Boolean(item.children?.length);
                      const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                      const active = isRouteActive(item.url) || isChildActive;

                      return (
                        <div key={item.url} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasChildren) {
                                handleNavigate(item.url);
                              }
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 text-left group",
                              active
                                ? "bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent text-white shadow-[0_2px_12px_rgba(245,158,11,0.15)] border border-amber-400/40"
                                : "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent"
                            )}
                          >
                            <div
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                active
                                  ? "bg-amber-500/25 border border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                  : "bg-white/5 border border-white/10 group-hover:bg-amber-500/15 group-hover:border-amber-400/30 text-slate-400 group-hover:text-amber-300"
                              )}
                            >
                              <item.icon className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-1.5">
                                  <span className="truncate">{item.title}</span>
                                  {item.badge && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/35 font-mono">
                                      {item.badge}
                                    </span>
                                  )}
                               </div>
                            </div>
                            {!hasChildren && (
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100" />
                            )}
                          </button>

                          {/* Render Children flat under parent in Mega Menu */}
                          {hasChildren && (
                            <div className="ml-12 pl-3 py-1 border-l-2 border-[#262270] space-y-1">
                              {item.children?.map((child) => {
                                const childActive = isRouteActive(child.url);
                                return (
                                  <NavLink
                                    key={child.title}
                                    to={child.url}
                                    onClick={onClose}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                                      childActive
                                        ? "text-amber-300 bg-amber-500/15 border border-amber-400/30 font-bold"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                                        childActive ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" : "bg-slate-600"
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
          )}
        </nav>

        {/* ── Dropdown Footer Bar ── */}
        <div className="shrink-0 px-6 py-3.5 border-t border-[#1F1C5C]/80 bg-[#090824] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-400 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL • Enterprise Secure • GST Compliant</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-slate-500">
            <span>Cred</span>
            <span className="text-amber-400 font-bold">Smart POS</span>
          </div>
        </div>
      </div>
    </>
  );
}





