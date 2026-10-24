import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
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
  Layers,
  Truck,
  ArrowUpRight,
  Store,
  Users,
  Users2,
  CalendarCheck,
  CheckSquare,
  Wallet,
  Video,
  Radio,
  Bot,
  LifeBuoy,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BILLING_NAV_ROUTES,
  CRM_NAV_ROUTES,
  NAV_ROUTES,
  ROUTE_PATHS,
  isRouteAllowedForRole,
  type ActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
} from "@/config/routes";

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

export interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPushLayout?: boolean;
  activeSuite?: ActiveSuite;
}

// ─── AppSidebar / Dropdown Navigator ──────────────────────────────────────────

export function AppSidebar({
  isOpen = false,
  onClose,
  isPushLayout = false,
  activeSuite,
}: AppSidebarProps = {}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userRole, userPermissions } = useOrganization();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derive active suite from prop, pathname, or localStorage event
  const [suiteState, setSuiteState] = useState<ActiveSuite>(() => {
    if (activeSuite) return activeSuite;
    if (location.pathname.startsWith("/crm")) return "crm";
    try {
      const stored = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY);
      if (stored === "crm" || stored === "billing") return stored;
    } catch {
      // ignore
    }
    return "billing";
  });

  useEffect(() => {
    if (activeSuite) {
      setSuiteState(activeSuite);
    } else if (location.pathname.startsWith("/crm")) {
      setSuiteState("crm");
    } else if (location.pathname.startsWith("/billing")) {
      setSuiteState("billing");
    }
  }, [activeSuite, location.pathname]);

  // Synchronize on custom suite changed window event
  useEffect(() => {
    const handleSuiteChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ suite: ActiveSuite }>;
      if (customEvent.detail?.suite) {
        setSuiteState(customEvent.detail.suite);
      }
    };
    window.addEventListener("credsmart:suite_changed", handleSuiteChanged);
    return () => window.removeEventListener("credsmart:suite_changed", handleSuiteChanged);
  }, []);

  const isCrmSuite = suiteState === "crm";
  const activeNavRoutes = isCrmSuite ? CRM_NAV_ROUTES : BILLING_NAV_ROUTES;

  const isRouteActive = useMemo(
    () => (url: string) =>
      url === "/"
        ? location.pathname === "/"
        : location.pathname === url || location.pathname.startsWith(`${url}/`),
    [location.pathname]
  );

  // Focus search input and auto-expand active sections when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      // Auto-expand any group or item containing active route
      const autoExpanded: Record<string, boolean> = {};
      activeNavRoutes.forEach((group) => {
        group.items.forEach((item) => {
          if (
            isRouteActive(item.url) ||
            item.children?.some((child) => isRouteActive(child.url))
          ) {
            autoExpanded[item.title] = true;
          }
        });
      });
      setExpandedMenus((prev) => ({ ...prev, ...autoExpanded }));
    }
  }, [isOpen, isRouteActive, activeNavRoutes]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Filtered nav groups by role & search query for the active suite
  const filteredNavRouteGroups: NavGroup[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activeNavRoutes
      .map((group) => {
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
            label: group.label || (group as { group?: string }).group || "",
            group: (group as { group?: string }).group || group.label || "",
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
          label: group.label || (group as { group?: string }).group || "",
          group: (group as { group?: string }).group || group.label || "",
          items: matchedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [activeNavRoutes, userRole, userPermissions, searchQuery]);

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    onClose?.();
  };

  // ─── Mobile: Bottom Navigation Dock ───────────────────────────────────────
  // Billing Active States
  const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || location.pathname === "/" || location.pathname === "/billing";
  const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
  const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
  const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);
  const isPartiesActive = isRouteActive(ROUTE_PATHS.parties) || isRouteActive(ROUTE_PATHS.customers);

  // CRM Active States
  const isCrmCommandActive = isRouteActive(ROUTE_PATHS.crm) && (location.pathname === "/crm" || location.pathname === "/crm/dashboard");
  const isCrmAttendanceActive = isRouteActive(ROUTE_PATHS.crmAttendance);
  const isCrmTasksActive = isRouteActive(ROUTE_PATHS.crmTasks);
  const isCrmSalaryActive = isRouteActive(ROUTE_PATHS.crmSalary);
  const isCrmRolesActive = isRouteActive(ROUTE_PATHS.crmRoles);

  return (
    <>
      {isMobile && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          {isCrmSuite ? (
            <>
              {/* CRM Tab 1: Command */}
              <NavLink
                to={ROUTE_PATHS.crm}
                end
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isCrmCommandActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isCrmCommandActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Command</span>
              </NavLink>

              {/* CRM Tab 2: Attendance */}
              <NavLink
                to={ROUTE_PATHS.crmAttendance}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isCrmAttendanceActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isCrmAttendanceActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Attendance</span>
              </NavLink>

              {/* CRM Tab 3: Center Elevated Punch / Task Button */}
              <NavLink
                to={ROUTE_PATHS.crmTasks}
                className="flex flex-col items-center justify-center -mt-4 px-1.5 z-10 active:scale-95 transition-transform duration-150 cursor-pointer group"
              >
                <div
                  className={cn(
                    "w-[46px] h-[46px] rounded-xl flex items-center justify-center font-bold ring-4 ring-white dark:ring-slate-900 shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white active:scale-95",
                    isCrmTasksActive ? "scale-105 shadow-blue-500/30" : "hover:scale-105"
                  )}
                >
                  <CheckSquare className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className={cn(
                    "text-[11px] mt-1 font-bold tracking-tight",
                    isCrmTasksActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-300"
                  )}
                >
                  Punch / Task
                </span>
              </NavLink>

              {/* CRM Tab 4: Salary & Payroll */}
              <NavLink
                to={ROUTE_PATHS.crmSalary}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isCrmSalaryActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isCrmSalaryActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <Wallet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Payroll</span>
              </NavLink>

              {/* CRM Tab 5: Roles & RBAC */}
              <NavLink
                to={ROUTE_PATHS.crmRoles}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isCrmRolesActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isCrmRolesActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <Shield className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Roles</span>
              </NavLink>
            </>
          ) : (
            <>
              {/* POS & Billing Tab 1: Home */}
              <NavLink
                to={ROUTE_PATHS.dashboard}
                end
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isDashboardActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isDashboardActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Home</span>
              </NavLink>

              {/* POS & Billing Tab 2: Sales */}
              <NavLink
                to={ROUTE_PATHS.sales}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isSalesActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isSalesActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <Receipt className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Sales</span>
              </NavLink>

              {/* POS & Billing Tab 3: Center Elevated POS Billing Button */}
              <NavLink
                to={ROUTE_PATHS.checkout}
                className="flex flex-col items-center justify-center -mt-4 px-1.5 z-10 active:scale-95 transition-transform duration-150 cursor-pointer group"
              >
                <div
                  className={cn(
                    "w-[46px] h-[46px] rounded-xl flex items-center justify-center font-bold ring-4 ring-white dark:ring-slate-900 shadow-md transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white active:scale-95",
                    isPosActive ? "scale-105 shadow-blue-500/30" : "hover:scale-105"
                  )}
                >
                  <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className={cn(
                    "text-[11px] mt-1 font-bold tracking-tight",
                    isPosActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-300"
                  )}
                >
                  POS Billing
                </span>
              </NavLink>

              {/* POS & Billing Tab 4: Items */}
              <NavLink
                to={ROUTE_PATHS.items}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isItemsActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isItemsActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <Package className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Items</span>
              </NavLink>

              {/* POS & Billing Tab 5: Parties */}
              <NavLink
                to={ROUTE_PATHS.parties}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer",
                  isPartiesActive
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl border transition-all duration-200",
                    isPartiesActive
                      ? "bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs scale-105"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <Users2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] tracking-tight">Parties</span>
              </NavLink>
            </>
          )}
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
              "fixed top-[3.75rem] sm:top-[5.5rem] md:top-[6rem] left-2.5 right-2.5 sm:left-4 sm:right-4 max-w-7xl mx-auto z-[200]",
              // Dimensions
              "max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-7rem)] flex flex-col",
              // 3D Glass Surface Architecture - LIGHT THEME
              "rounded-2xl sm:rounded-2xl overflow-hidden",
              "bg-white/95 backdrop-blur-3xl",
              // Specular highlights & multi-tier 3D elevation
              "border border-slate-200/80",
              "shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_20px_50px_rgba(0,0,0,0.12),0_40px_100px_rgba(0,0,0,0.08)]",
              // Dropdown Entrance Animation from TOP
              "animate-in fade-in slide-in-from-top-4 zoom-in-[0.98] duration-300 ease-out select-none"
            )}
            style={{ transformOrigin: "top center" }}
          >
            {/* Dropdown Top Anchor Pointer Indicator */}
            <div className="absolute -top-2 left-6 sm:left-10 w-4 h-4 rotate-45 bg-white border-t border-l border-slate-200 shadow-xs" />

            {/* ── Dropdown Header Strip (NO LOGO - Clean Modules Directory Header) ── */}
            <div className="shrink-0 px-4 sm:px-6 pt-3.5 pb-3 sm:pt-4 sm:pb-3.5 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl text-white flex items-center justify-center shrink-0 transition-colors",
                      isCrmSuite
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
                        : "bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_4px_16px_rgba(245,158,11,0.3)]"
                    )}
                  >
                    {isCrmSuite ? (
                      <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider font-mono truncate">
                        {isCrmSuite ? "CRM Operations & Modules" : "Navigation & Modules"}
                      </h2>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full hidden sm:block animate-pulse",
                          isCrmSuite
                            ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        )}
                      />
                    </div>
                    <p className="text-[11px] sm:text-[11px] text-slate-500 truncate font-sans">
                      {isCrmSuite
                        ? "Command center, attendance, salary, tasks & roles"
                        : "Quick navigation across retail, inventory & billing tools"}
                    </p>
                  </div>
                </div>

                {/* Quick Search Input */}
                <div className="relative flex-1 max-w-md mx-4 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isCrmSuite
                        ? "Search CRM modules, tasks & shortcuts..."
                        : "Search billing modules, sub-menus & shortcuts..."
                    }
                    className={cn(
                      "w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-hidden focus:bg-white transition-all shadow-inner font-sans",
                      isCrmSuite ? "focus:border-blue-500" : "focus:border-amber-400"
                    )}
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
                  <kbd className="hidden sm:inline-flex px-2 py-1 rounded-md text-[11px] font-mono bg-slate-100 text-slate-500 border border-slate-200">
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

            {/* ── Quick Access Mobile Search ── */}
            <div className="sm:hidden shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isCrmSuite
                      ? "Search CRM modules & tasks..."
                      : "Search modules & sub-menus..."
                  }
                  className={cn(
                    "w-full pl-8 pr-7 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:bg-white transition-all shadow-inner",
                    isCrmSuite ? "focus:border-blue-500" : "focus:border-amber-400"
                  )}
                />
              </div>
            </div>

            {/* ── Mega Menu 3D Grid Content ── */}
            <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-5 sm:p-7 scrollbar-thin">
              {filteredNavRouteGroups.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <Search className="w-8 h-8 text-rose-500" />
                  </div>
                  <p className="text-sm text-slate-700 font-bold tracking-wide">No matching modules found</p>
                  <p className="text-xs text-slate-500 mt-1">Try a different keyword</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {filteredNavRouteGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="relative group/card flex flex-col p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] bg-white border border-slate-200 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover-3d-glow"
                    >
                      {/* Subtle Top Glow on Hover */}
                      <div
                        className={cn(
                          "absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent to-transparent transition-all duration-500",
                          isCrmSuite
                            ? "group-hover/card:via-blue-500/30"
                            : "group-hover/card:via-amber-500/30"
                        )}
                      />

                      {/* Category Header */}
                      <div className="flex items-center gap-2 mb-3.5">
                        <div
                          className={cn(
                            "w-1 h-3.5 rounded-full",
                            isCrmSuite
                              ? "bg-gradient-to-b from-blue-500 to-indigo-600"
                              : "bg-gradient-to-b from-amber-400 to-rose-500"
                          )}
                        />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 font-mono">
                          {group.label}
                        </span>
                        <span className="ml-auto px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {group.items.length}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="flex-1 space-y-2">
                        {group.items.map((item) => {
                          const hasChildren = Boolean(item.children?.length);
                          const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                          const isSelfActive = isRouteActive(item.url);
                          const active = isSelfActive || isChildActive;
                          const isExpanded = expandedMenus[item.title] || Boolean(searchQuery);

                          return (
                            <div key={item.url} className="space-y-1">
                              <div
                                className={cn(
                                  "w-full flex items-center justify-between gap-1.5 p-1 rounded-xl text-sm font-semibold transition-all duration-200 group/item relative border",
                                  active
                                    ? isCrmSuite
                                      ? "bg-blue-50/80 text-blue-950 border-blue-200/90 shadow-2xs"
                                      : "bg-amber-50/80 text-amber-950 border-amber-200/90 shadow-2xs"
                                    : "bg-transparent hover:bg-slate-50/80 text-slate-700 hover:text-slate-900 border-transparent hover:border-slate-200"
                                )}
                              >
                                {/* Main clickable action */}
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(item.url)}
                                  className="flex items-center gap-2.5 min-w-0 flex-1 px-2 py-1.5 cursor-pointer text-left rounded-lg transition-colors"
                                >
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/item:scale-105",
                                      active
                                        ? isCrmSuite
                                          ? "bg-blue-100 text-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.2)]"
                                          : "bg-amber-100 text-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                        : isCrmSuite
                                        ? "bg-slate-100 text-slate-500 group-hover/item:text-blue-600 group-hover/item:bg-blue-50"
                                        : "bg-slate-100 text-slate-500 group-hover/item:text-amber-600 group-hover/item:bg-amber-50"
                                    )}
                                  >
                                    <item.icon className="w-3.5 h-3.5 stroke-[2.2]" />
                                  </div>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate text-xs sm:text-sm font-semibold">{item.title}</span>
                                    {item.badge && (
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.2 rounded-md text-[11px] font-black border font-mono shrink-0",
                                          isCrmSuite
                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                            : "bg-rose-100 text-rose-700 border-rose-200"
                                        )}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {/* Submenu Dropdown Button */}
                                <div className="flex items-center shrink-0 pr-1">
                                  {hasChildren ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleSubmenu(item.title);
                                      }}
                                      aria-label={`Toggle sub-menu for ${item.title}`}
                                      aria-expanded={isExpanded}
                                      className={cn(
                                        "w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer",
                                        isExpanded
                                          ? isCrmSuite
                                            ? "bg-blue-100/80 border-blue-300 text-blue-700 shadow-2xs"
                                            : "bg-amber-100/80 border-amber-300 text-amber-700 shadow-2xs"
                                          : "bg-slate-100/70 hover:bg-slate-200/80 border-slate-200 text-slate-500 hover:text-slate-800"
                                      )}
                                      title={isExpanded ? `Collapse ${item.title} sub-menu` : `Expand ${item.title} sub-menu`}
                                    >
                                      <ChevronDown
                                        className={cn(
                                          "w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200",
                                          isExpanded
                                            ? isCrmSuite
                                              ? "rotate-180 text-blue-600"
                                              : "rotate-180 text-amber-600"
                                            : "text-slate-500"
                                        )}
                                      />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleNavigate(item.url)}
                                      className={cn(
                                        "p-1 text-slate-400 transition-colors opacity-0 group-hover/item:opacity-100 cursor-pointer",
                                        isCrmSuite ? "group-hover/item:text-blue-600" : "group-hover/item:text-amber-600"
                                      )}
                                      title={`Go to ${item.title}`}
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Render Children Accordion */}
                              {hasChildren && isExpanded && (
                                <div
                                  className={cn(
                                    "ml-6 pl-3 py-1 border-l-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150",
                                    isCrmSuite ? "border-blue-200" : "border-amber-200"
                                  )}
                                >
                                  {item.children?.map((child) => {
                                    const childActive = isRouteActive(child.url);
                                    return (
                                      <button
                                        key={child.title}
                                        type="button"
                                        onClick={() => handleNavigate(child.url)}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left group/child",
                                          childActive
                                            ? isCrmSuite
                                              ? "text-blue-900 bg-blue-100/70 border border-blue-200 font-bold shadow-2xs"
                                              : "text-amber-900 bg-amber-100/70 border border-amber-200 font-bold shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 group-hover/child:scale-125",
                                            childActive
                                              ? isCrmSuite
                                                ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                                                : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                                              : isCrmSuite
                                              ? "bg-slate-300 group-hover/child:bg-blue-500"
                                              : "bg-slate-300 group-hover/child:bg-amber-500"
                                          )}
                                        />
                                        <span className="truncate group-hover/child:translate-x-0.5 transition-transform flex-1">{child.title}</span>
                                        <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover/child:opacity-100 transition-opacity shrink-0" />
                                      </button>
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
            <div className="shrink-0 px-6 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between rounded-b-3xl">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-emerald-600 font-mono">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-Bit SSL • Enterprise Secure • {isCrmSuite ? "RBAC Enforced" : "GST Compliant"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-slate-500">
                <span>Cred</span>
                {isCrmSuite ? (
                  <span className="text-blue-600 font-bold">Smart CRM</span>
                ) : (
                  <span className="text-amber-500 font-bold">Smart POS</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
