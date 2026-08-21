import {
  ChevronLeft,
  ChevronRight,
  Store,
  LogOut,
  Menu,
  Shield,
  User,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
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
import { NAV_ROUTES, isRouteAllowedForRole } from "@/config/routes";

export function AppSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { org, userRole } = useOrganization();
  const location = useLocation();

  // Filter groups and items based on role permissions
  const filteredNavRouteGroups = NAV_ROUTES.map((group) => ({
    ...group,
    items: group.items.filter((item) => isRouteAllowedForRole(item.url, userRole)),
  })).filter((group) => group.items.length > 0);

  const allAllowedNavItems = filteredNavRouteGroups.flatMap((g) => g.items);
  const mobilePrimaryNavItems = allAllowedNavItems.filter((item) => item.mobilePrimary);

  // Global Keyboard Shortcuts Listener (F1-F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          (activeEl as HTMLElement).isContentEditable);

      // Allow F-keys even if focus is in input (except typing regular text)
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

  const hasPrimaryNavMatch = mobilePrimaryNavItems.some((item) => isRouteActive(item.url));

  const roleLabel = {
    super_admin: "Super Admin",
    store_owner: "Store Owner",
    manager: "Manager",
    cashier: "Cashier",
  }[userRole || ""] || "Staff";

  // Mobile Bottom Navigation Bar & Sheet
  if (isMobile) {
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 shadow-lg px-2 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around"
          aria-label="Mobile Bottom Navigation"
        >
          {mobilePrimaryNavItems.map((item) => {
            const active = isRouteActive(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                  active
                    ? "text-accent font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                activeClassName="text-accent font-bold"
              >
                <div
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    active ? "bg-accent/10 text-accent shadow-xs" : ""
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-tight whitespace-nowrap tracking-tight">
                  {item.title}
                </span>
              </NavLink>
            );
          })}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                  !hasPrimaryNavMatch
                    ? "text-accent font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Open all navigation links"
              >
                <div
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    !hasPrimaryNavMatch ? "bg-accent/10 text-accent" : ""
                  )}
                >
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-tight whitespace-nowrap tracking-tight">
                  More
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[min(85dvh,42rem)] rounded-t-3xl border-x border-t border-border bg-card/95 backdrop-blur-xl px-4 sm:px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl flex flex-col"
            >
              <SheetHeader className="mb-3 text-left shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-base font-bold flex items-center gap-2">
                      <span>Navigation</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold/15 text-gold border border-gold/30">
                        {roleLabel}
                      </span>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                      {org?.name || "CredSmart POS System"}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.url === "/"}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-muted/70 transition-colors border border-transparent hover:border-border/50 text-sm"
                          activeClassName="bg-accent/15 text-accent font-bold border-accent/30 shadow-xs"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium flex-1">{item.title}</span>
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                              {item.shortcut}
                            </kbd>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border/80 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] min-h-0 gradient-sidebar border-r border-sidebar-border/70 shadow-xl transition-all duration-300 sticky top-0 overflow-hidden select-none z-20",
        collapsed ? "w-[72px]" : "w-[256px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border/60 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 p-1 bg-gradient-to-br from-indigo-500/25 to-gold/25 border border-gold/30 shadow-sm">
          <img
            src="/favicon.png"
            alt="CredSmart logo"
            className="w-full h-full object-contain rounded-lg drop-shadow-sm"
          />
        </div>

        {!collapsed && (
          <div className="animate-fade-in min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-white tracking-wider">
                CredSmart
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-accent/20 text-accent border border-accent/30">
                POS
              </span>
            </div>
            <p className="text-[10px] text-sidebar-muted font-medium tracking-tight truncate">
              Next-Gen Retail
            </p>
          </div>
        )}
      </div>

      {/* Store / Organization Card */}
      {!collapsed ? (
        <div className="mx-3 mt-3 mb-1 p-2.5 rounded-xl bg-white/[0.04] border border-gold/20 hover:border-gold/40 transition-colors shrink-0 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-primary-foreground truncate">
                {org?.name || "My Store"}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <p className="text-[10px] text-sidebar-muted truncate font-medium capitalize font-mono">
                  {org?.business_type || "Retail Store"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-3 mb-1 w-10 h-10 rounded-xl bg-white/[0.04] border border-gold/20 flex items-center justify-center text-gold shrink-0" title={org?.name || "Store"}>
          <Store className="w-4 h-4" />
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="flex-1 min-h-0 mt-2 px-2.5 pb-2 space-y-4 overflow-y-auto scrollbar-thin">
        {filteredNavRouteGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && group.group !== "Home" && (
              <p className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-sidebar-muted/80 mb-1.5 mt-2">
                {group.group}
              </p>
            )}

            {group.items.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-200 group relative text-sm font-medium",
                  collapsed
                    ? "justify-center p-2.5 text-sidebar-foreground hover:bg-white/[0.08] hover:text-white"
                    : "px-3 py-2 text-sidebar-foreground hover:bg-white/[0.07] hover:text-white"
                )}
                activeClassName="bg-accent text-white font-bold shadow-md shadow-accent/30 hover:bg-accent hover:text-white glow-accent"
              >
                <item.icon className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate animate-fade-in tracking-tight">
                      {item.title}
                    </span>
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-sidebar-muted group-hover:text-white border border-white/10 shrink-0">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Organization Avatar Card & Footer Actions */}
      <div className="px-2.5 pt-2 pb-3 border-t border-sidebar-border/60 space-y-2 shrink-0 bg-black/20">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 font-semibold text-xs">
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">
                {user?.email?.split("@")[0] || "User"}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-accent" />
                <span className="text-[10px] text-sidebar-muted font-mono font-medium truncate">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div
              className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 font-semibold text-xs"
              title={`${user?.email || "User"} (${roleLabel})`}
            >
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={signOut}
            title="Sign Out"
            className={cn(
              "flex items-center gap-2.5 rounded-xl hover:bg-white/[0.08] text-sidebar-muted hover:text-rose-300 transition-colors text-xs font-medium",
              collapsed ? "w-full justify-center py-2" : "flex-1 px-3 py-2"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={cn(
              "flex items-center justify-center rounded-xl hover:bg-white/[0.08] text-sidebar-muted hover:text-white transition-colors",
              collapsed ? "hidden" : "p-2"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand Sidebar"
            className="flex items-center justify-center w-full py-1.5 rounded-xl hover:bg-white/[0.08] text-sidebar-muted hover:text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
