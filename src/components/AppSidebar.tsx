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

export function AppSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [universalModalOpen, setUniversalModalOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Parties: true,
    Items: true,
    Sales: true,
    Purchases: true,
  });

  const quickCreateRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { org, userRole } = useOrganization();
  const location = useLocation();

  // Close quick create dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setQuickCreateOpen(false);
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
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#141B2D]/85 backdrop-blur-xl border-t border-slate-700/50 shadow-[0_-8px_30px_rgb(0,0,0,0.3)] px-2 pt-1.5 pb-[env(safe-area-inset-bottom)] flex items-center justify-around text-slate-300"
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
                  active ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-white"
                )}
                activeClassName="text-indigo-400 font-bold"
              >
                <div
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    active ? "bg-indigo-500/20 text-indigo-400" : ""
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
                className="flex-1 flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-xl text-slate-400 hover:text-white transition-all min-w-[52px]"
                aria-label="Open all navigation links"
              >
                <div className="p-1 rounded-lg">
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-tight whitespace-nowrap tracking-tight">
                  More
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[min(85dvh,44rem)] rounded-t-3xl border-t border-slate-700 bg-[#141B2D] text-slate-200 px-4 sm:px-6 pb-6 shadow-2xl flex flex-col"
            >
              <SheetHeader className="mb-3 text-left shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-base font-bold text-white flex items-center gap-2">
                      <span>{org?.name || "CredSmart"}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {roleLabel}
                      </span>
                    </SheetTitle>
                    <SheetDescription className="text-xs text-slate-400 mt-0.5">
                      {org?.phone || "7409200341"}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {filteredNavRouteGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1.5">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.url}
                          to={item.url}
                          end={item.url === "/"}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-sm"
                          activeClassName="bg-indigo-600 text-white font-bold"
                        >
                          <item.icon className="w-4 h-4 text-indigo-400" />
                          <span className="font-medium flex-1">{item.title}</span>
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              {item.shortcut}
                            </kbd>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-700/80 shrink-0">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-semibold text-sm"
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

  // Desktop Sidebar matching Capture.PNG, Capture12.PNG, 11Capture.PNG
  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] min-h-0 bg-[#0F172A] text-slate-300 border-r border-slate-800/80 shadow-2xl transition-all duration-300 sticky top-0 overflow-hidden select-none z-30 font-sans",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Top Store Header matching Capture.PNG ("B Business Name 7409200341") */}
      <div className="p-3.5 border-b border-slate-800/90 shrink-0 bg-[#0B1120]">
        <div className="flex items-center gap-3">
          {/* Yellow/Amber Avatar with first letter "B" */}
          <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-lg shadow-md shrink-0 ring-2 ring-amber-400/30">
            {org?.name ? org.name.charAt(0).toUpperCase() : "B"}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white truncate tracking-tight">
                {org?.name || "Business Name"}
              </h2>
              <p className="text-xs text-slate-400 font-mono tracking-tight truncate">
                {org?.phone || "7409200341"}
              </p>
            </div>
          )}
        </div>

        {/* "+ Create Sales Invoice" Dropdown Button matching 11Capture.PNG */}
        {!collapsed && (
          <div className="relative mt-3" ref={quickCreateRef}>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex items-center justify-between w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/40 transition-all font-medium text-xs py-2.5 px-3 select-none"
              aria-expanded={quickCreateOpen}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="font-semibold tracking-tight truncate">Create Sales Invoice</span>
              </div>
              <ChevronDown
                className={cn("w-4 h-4 transition-transform duration-200 shrink-0 ml-1", quickCreateOpen ? "rotate-180" : "")}
              />
            </button>

            {/* Comprehensive Quick Action Flyout Menu matching 11Capture.PNG & 123Capture.PNG */}
            {quickCreateOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[72vh] overflow-y-auto scrollbar-thin">
                {/* View All Options Popup Trigger */}
                <div className="px-2 pb-1.5 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCreateOpen(false);
                      setUniversalModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-bold text-[11px] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>All Creation Options</span>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-mono">
                      Popup
                    </span>
                  </button>
                </div>

                {/* GENERAL */}
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  GENERAL
                </div>
                <button
                  onClick={() => handleQuickAction("party")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  <span>Create Party</span>
                </button>
                <button
                  onClick={() => handleQuickAction("item")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <PackagePlus className="w-4 h-4 text-indigo-500" />
                  <span>Create Item</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                {/* SALES TRANSACTIONS */}
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  SALES TRANSACTIONS
                </div>
                <button
                  onClick={() => handleQuickAction("sales_invoice")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left font-semibold"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Sales Invoice</span>
                </button>
                <button
                  onClick={() => {
                    setQuickCreateOpen(false);
                    navigate(ROUTE_PATHS.pos);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left font-semibold"
                >
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>POS Billing (Counter Sale)</span>
                </button>
                <button
                  onClick={() => handleQuickAction("quotation")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Quotation / Estimate</span>
                </button>
                <button
                  onClick={() => handleQuickAction("payment_in")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Payment In</span>
                </button>
                <button
                  onClick={() => handleQuickAction("sales_return")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>Sales Return</span>
                </button>
                <button
                  onClick={() => handleQuickAction("credit_note")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Credit Note</span>
                </button>
                <button
                  onClick={() => handleQuickAction("delivery_challan")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span>Delivery Challan</span>
                </button>
                <button
                  onClick={() => handleQuickAction("proforma")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Proforma Invoice</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                {/* PURCHASE TRANSACTIONS */}
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  PURCHASE TRANSACTIONS
                </div>
                <button
                  onClick={() => handleQuickAction("purchase")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left font-semibold"
                >
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Purchase Invoice</span>
                </button>
                <button
                  onClick={() => handleQuickAction("payment_out")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-rose-500" />
                  <span>Payment Out</span>
                </button>
                <button
                  onClick={() => handleQuickAction("purchase_return")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Purchase Return</span>
                </button>
                <button
                  onClick={() => handleQuickAction("debit_note")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <FileCheck className="w-4 h-4 text-slate-500" />
                  <span>Debit Note</span>
                </button>
                <button
                  onClick={() => handleQuickAction("purchase_orders")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Purchase Orders</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                {/* EXPENSES */}
                <button
                  onClick={() => handleQuickAction("expense")}
                  className="w-full flex items-center gap-2.5 px-4 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                >
                  <Receipt className="w-4 h-4 text-purple-500" />
                  <span>Create Expense</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation List matching Capture.PNG */}
      <nav className="flex-1 min-h-0 px-2.5 py-3 space-y-4 overflow-y-auto scrollbar-thin text-xs">
        {filteredNavRouteGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
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
                      if (hasChildren && !collapsed) {
                        navigate(item.url);
                      } else {
                        navigate(item.url);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer font-medium select-none group",
                      active
                        ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-950"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                        active ? "text-white" : "text-slate-400 group-hover:text-white"
                      )}
                    />

                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
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
                          activeClassName="text-indigo-400 font-semibold bg-indigo-500/10"
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

      {/* Footer Security Badges & Sign Out matching Capture.PNG */}
      <div className="p-3 border-t border-slate-800/90 bg-[#0B1120] space-y-2 shrink-0 text-xs">
        {!collapsed && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 py-1 font-medium">
            <div className="flex items-center gap-1 text-emerald-400">
              <Shield className="w-3 h-3" />
              <span>100% Secure</span>
            </div>
            <div className="flex items-center gap-1 text-indigo-300 font-mono">
              <span>ISO Certified</span>
            </div>
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
    </aside>
  );
}
