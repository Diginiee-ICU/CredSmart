/**
 * AppSidebar — Floating Transparent Overlay (Desktop)
 *
 * - Fixed top-left, transparent background — ZERO screen space occupied.
 * - Shows the animated GIF logo and a single dropdown-arrow button.
 * - Clicking the arrow reveals a premium 3D glassmorphism navigation panel
 *   that overlays the page (not a sidebar — no layout resize).
 * - Mobile: retains the bottom navigation dock.
 */

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
  Layers,
  Truck,
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

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userRole, userPermissions } = useOrganization();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Filtered nav groups by role
  const filteredNavRouteGroups: NavGroup[] = useMemo(() => {
    return NAV_ROUTES.map((group) => ({
      ...group,
      label: group.label || group.group || "",
      group: group.group || group.label || "",
      items: group.items
        .filter((item) => isRouteAllowedForRole(item.url, userRole, userPermissions))
        .map((item) => ({
          ...item,
          children: item.children
            ? item.children.filter((child) =>
                isRouteAllowedForRole(child.url as string, userRole, userPermissions)
              )
            : undefined,
        })),
    })).filter((group) => group.items.length > 0);
  }, [userRole, userPermissions]);

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

  // ─── Mobile: Bottom Navigation Dock ───────────────────────────────────────
  if (isMobile) {
    const isDashboardActive = isRouteActive(ROUTE_PATHS.dashboard) || location.pathname === "/";
    const isPosActive = isRouteActive(ROUTE_PATHS.checkout) || isRouteActive(ROUTE_PATHS.pos);
    const isSalesActive = isRouteActive(ROUTE_PATHS.sales) || isRouteActive(ROUTE_PATHS.salesHistory);
    const isItemsActive = isRouteActive(ROUTE_PATHS.items) || isRouteActive(ROUTE_PATHS.inventory);

    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C0B2D]/95 backdrop-blur-2xl border-t border-[#1F1C5C]/90 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-400 select-none"
          aria-label="Mobile Bottom Navigation"
        >
          <NavLink to={ROUTE_PATHS.dashboard} end className={cn("flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all min-w-[50px]", isDashboardActive ? "text-amber-400" : "text-slate-400 hover:text-white")} activeClassName="text-amber-400">
            <div className={cn("p-1.5 rounded-xl", isDashboardActive && "bg-amber-400/15 shadow-[0_0_15px_rgba(251,191,36,0.35)]")}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold">Home</span>
          </NavLink>

          <NavLink to={ROUTE_PATHS.sales} className={cn("flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all min-w-[50px]", isSalesActive ? "text-indigo-400" : "text-slate-400 hover:text-white")} activeClassName="text-indigo-400">
            <div className={cn("p-1.5 rounded-xl", isSalesActive && "bg-indigo-500/20")}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold">Sales</span>
          </NavLink>

          <NavLink to={ROUTE_PATHS.checkout} className="flex flex-col items-center justify-center -mt-6 px-1 z-10">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-[#0C0B2D] active:scale-95 transition-all", isPosActive ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)]" : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_0_25px_rgba(79,70,229,0.5)]")}>
              <ShoppingCart className="w-6 h-6 stroke-[2.4]" />
            </div>
            <span className={cn("text-[10px] font-bold mt-1", isPosActive ? "text-amber-400" : "text-slate-200")}>POS Billing</span>
          </NavLink>

          <NavLink to={ROUTE_PATHS.items} className={cn("flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all min-w-[50px]", isItemsActive ? "text-emerald-400" : "text-slate-400 hover:text-white")} activeClassName="text-emerald-400">
            <div className={cn("p-1.5 rounded-xl", isItemsActive && "bg-emerald-500/20")}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold">Items</span>
          </NavLink>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-slate-400 hover:text-white transition-all min-w-[50px]">
                <div className="p-1.5 rounded-xl"><Menu className="w-5 h-5" /></div>
                <span className="text-[10px] font-semibold">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[min(92dvh,52rem)] rounded-t-3xl border-t border-[#1F1C5C]/80 bg-[#0C0B2D] text-slate-200 px-4 pb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Access all business tools and actions</SheetDescription>
              </SheetHeader>
              <div className="flex items-center justify-between pt-1 pb-3 border-b border-[#1F1C5C]/60 shrink-0">
                <img src="/IMG_9301.GIF" alt="CredSmart" className="h-12 w-auto max-w-[150px] object-contain rounded-lg" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-[#141242] border border-[#232064] text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2 scrollbar-thin">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const hasChildren = Boolean(item.children?.length);
                        const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                        const active = isRouteActive(item.url) || isChildActive;
                        const isExpanded = expandedMenus[item.title];
                        return (
                          <div key={item.url} className="space-y-1">
                            <button onClick={() => { if (hasChildren) toggleSubmenu(item.title); else { setMobileMenuOpen(false); navigate(item.url); } }} className={cn("w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left", active ? "bg-gradient-to-r from-amber-500/25 to-amber-600/10 text-white border border-amber-400/40" : "text-slate-200 hover:bg-[#1C1A54]")}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn("p-1.5 rounded-xl border shrink-0", active ? "bg-amber-500/20 border-amber-400/50 text-amber-300" : "bg-[#141242] border-[#262270] text-amber-400")}>
                                  <item.icon className="w-4 h-4 stroke-[2.2]" />
                                </div>
                                <span className="truncate text-white">{item.title}</span>
                              </div>
                              {hasChildren ? <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180 text-amber-400")} /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                            </button>
                            {hasChildren && isExpanded && (
                              <div className="pl-6 pr-1 space-y-1 pt-1 ml-2 border-l border-[#1F1C5C]">
                                {item.children?.map((child) => {
                                  const childActive = isRouteActive(child.url);
                                  return (
                                    <NavLink key={child.title} to={child.url} onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors", childActive ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-400/30" : "text-slate-300 hover:text-white hover:bg-[#1C1A54]")}>
                                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", childActive ? "bg-amber-400" : "bg-slate-500")} />
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

  // ─── Desktop: Fixed Floating Overlay ─────────────────────────────────────────
  // Position: fixed top-left. Background: transparent. Screen space: ZERO.
  return (
    <div className="fixed top-3 left-3 z-[200] flex items-center gap-2 select-none pointer-events-none">
      {/* Floating Logo + Arrow Trigger (both pointer-events-auto) */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {/* Animated GIF Logo */}
        <NavLink
          to={ROUTE_PATHS.dashboard}
          title="CredSmart Dashboard"
          className="block rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(12,11,45,0.5)] hover:scale-105 transition-transform duration-200 cursor-pointer"
          style={{ filter: "drop-shadow(0 0 12px rgba(245,158,11,0.25))" }}
        >
          <img
            src="/IMG_9301.GIF"
            alt="CredSmart"
            className="h-10 w-auto max-w-[130px] object-contain rounded-2xl"
          />
        </NavLink>

        {/* Dropdown Arrow Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Open Navigation Menu"
          aria-expanded={isOpen}
          title="Navigation Menu"
          className={cn(
            "group flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 cursor-pointer",
            "bg-[#0C0B2D]/70 backdrop-blur-md border shadow-lg",
            isOpen
              ? "border-amber-400/60 bg-amber-500/20 shadow-[0_0_18px_rgba(245,158,11,0.35)] text-amber-300"
              : "border-white/10 hover:border-amber-400/40 hover:bg-[#1A1854]/80 text-slate-300 hover:text-amber-300"
          )}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 stroke-[2.5] transition-transform duration-300",
              isOpen ? "rotate-180 text-amber-300" : "group-hover:text-amber-300"
            )}
          />
        </button>
      </div>

      {/* ─── 3D Professional Navigation Panel ─────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            "pointer-events-auto absolute left-0 top-[calc(100%+10px)]",
            // 3D card elevation — layered box-shadows create depth
            "w-[280px] rounded-[20px] overflow-hidden",
            "bg-gradient-to-b from-[#12104A]/98 via-[#0C0B2D]/98 to-[#0A0928]/98",
            "backdrop-blur-2xl",
            "border border-white/10",
            "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.6),0_32px_64px_rgba(0,0,0,0.45),0_0_80px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]",
            "animate-in slide-in-from-top-3 fade-in zoom-in-[0.97] duration-200"
          )}
          style={{
            transformOrigin: "top left",
          }}
        >
          {/* Panel inner top highlight (3D surface effect) */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

          {/* Panel top: mini logo identity strip */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-300 font-mono">
                CredSmart Navigator
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable navigation route groups */}
          <div className="px-2.5 py-2.5 space-y-3 max-h-[min(75vh,540px)] overflow-y-auto scrollbar-thin overflow-x-hidden">
            {filteredNavRouteGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                {/* Group label */}
                <p className="px-2.5 pb-1 text-[9.5px] font-black uppercase tracking-[0.15em] text-slate-500 font-mono">
                  {group.label}
                </p>

                {/* Group items */}
                {group.items.map((item) => {
                  const hasChildren = Boolean(item.children?.length);
                  const isChildActive = hasChildren && item.children?.some((c) => isRouteActive(c.url));
                  const isSelfActive = isRouteActive(item.url);
                  const active = isSelfActive || isChildActive;
                  const isExpanded = expandedMenus[item.title];

                  return (
                    <div key={item.url}>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasChildren) {
                            toggleSubmenu(item.title);
                          } else {
                            navigate(item.url);
                            setIsOpen(false);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] cursor-pointer font-bold text-xs transition-all duration-150 text-left group",
                          active
                            ? [
                                "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent",
                                "text-amber-200",
                                "border border-amber-400/30",
                                "shadow-[0_2px_12px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(245,158,11,0.1)]",
                              ].join(" ")
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {/* Icon with 3D inset container */}
                        <div
                          className={cn(
                            "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-150",
                            active
                              ? "bg-gradient-to-br from-amber-400/25 to-amber-600/15 border border-amber-400/40 shadow-[inset_0_1px_0_rgba(245,158,11,0.2)] text-amber-300"
                              : "bg-white/5 border border-white/8 group-hover:bg-white/10 group-hover:border-white/15 text-slate-400 group-hover:text-amber-300"
                          )}
                        >
                          <item.icon className="w-4 h-4 stroke-[2]" />
                        </div>

                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate font-semibold tracking-tight">{item.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0 pl-1">
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono">
                                {item.badge}
                              </span>
                            )}
                            {hasChildren ? (
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                                  isExpanded ? "rotate-180 text-amber-400" : "group-hover:text-slate-300"
                                )}
                              />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Submenu */}
                      {hasChildren && isExpanded && (
                        <div className="ml-5 pl-3 pr-1 mt-1 mb-1 border-l border-white/8 space-y-0.5">
                          {item.children?.map((child) => {
                            const childActive = isRouteActive(child.url);
                            return (
                              <NavLink
                                key={child.title}
                                to={child.url}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 cursor-pointer",
                                  childActive
                                    ? "text-amber-300 bg-amber-400/10 border border-amber-400/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                                    childActive
                                      ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]"
                                      : "bg-slate-600"
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
          </div>

          {/* Panel bottom: security badge footer */}
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9.5px] text-emerald-400/80 font-mono">
              <Shield className="w-3 h-3" />
              <span>IT Act 2000 Ready · 256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-600 font-mono">
              <span>Cred</span>
              <span className="text-amber-500/60 font-bold">Smart</span>
            </div>
          </div>

          {/* Panel bottom edge shadow/glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      )}
    </div>
  );
}
