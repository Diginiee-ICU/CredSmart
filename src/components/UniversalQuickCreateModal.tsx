import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  FileText,
  Receipt,
  ShoppingCart,
  FileSpreadsheet,
  RotateCcw,
  CreditCard,
  Truck,
  FileCheck,
  UserPlus,
  PackagePlus,
  Building2,
  DollarSign,
  Landmark,
  Repeat,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export interface UniversalQuickCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionSelect?: (actionKey: string) => void;
}

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  category: "sales" | "purchases" | "masters" | "accounting";
  icon: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; // eslint-disable-line @typescript-eslint/no-explicit-any
  badge?: string;
  color: string;
  iconBg: string;
  route?: string;
  actionKey?: string;
}

const ALL_CREATION_OPTIONS: ActionItem[] = [
  // ── SALES & INVOICING ──
  {
    id: "sales_invoice",
    title: "Sales Invoice",
    subtitle: "Standard GST B2B & B2C Tax Invoice",
    category: "sales",
    icon: FileText,
    badge: "Popular",
    color: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-500/20",
    route: `${ROUTE_PATHS.sales}?tab=sales_invoice&new=1`,
    actionKey: "sales_invoice",
  },
  {
    id: "pos_billing",
    title: "POS Billing (Counter Sale)",
    subtitle: "High-speed barcode scanner & fast checkout",
    category: "sales",
    icon: ShoppingCart,
    badge: "Fast F1",
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    route: ROUTE_PATHS.pos,
    actionKey: "pos_billing",
  },
  {
    id: "quotation",
    title: "Quotation / Estimate",
    subtitle: "Price estimates for customer approval",
    category: "sales",
    icon: FileSpreadsheet,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    route: `${ROUTE_PATHS.sales}?tab=quotation&new=1`,
    actionKey: "quotation",
  },
  {
    id: "payment_in",
    title: "Payment In (Receipt)",
    subtitle: "Record customer payment / Udhar settlement",
    category: "sales",
    icon: Receipt,
    badge: "Khata",
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    route: `${ROUTE_PATHS.sales}?tab=payment_in&new=1`,
    actionKey: "payment_in",
  },
  {
    id: "proforma_invoice",
    title: "Proforma Invoice",
    subtitle: "Preliminary commercial invoice for advance payment",
    category: "sales",
    icon: FileText,
    color: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-500/10 border-slate-500/20",
    route: `${ROUTE_PATHS.sales}?tab=proforma&new=1`,
    actionKey: "proforma",
  },
  {
    id: "delivery_challan",
    title: "Delivery Challan",
    subtitle: "Goods dispatch without immediate tax invoice",
    category: "sales",
    icon: Truck,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    route: `${ROUTE_PATHS.sales}?tab=delivery_challan&new=1`,
    actionKey: "delivery_challan",
  },
  {
    id: "credit_note",
    title: "Credit Note",
    subtitle: "Sales return credit or pricing adjustment",
    category: "sales",
    icon: CreditCard,
    color: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    route: `${ROUTE_PATHS.sales}?tab=credit_note&new=1`,
    actionKey: "credit_note",
  },
  {
    id: "sales_return",
    title: "Sales Return",
    subtitle: "Record item return & update stock levels",
    category: "sales",
    icon: RotateCcw,
    color: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    route: `${ROUTE_PATHS.sales}?tab=sales_return&new=1`,
    actionKey: "sales_return",
  },

  // ── PURCHASE TRANSACTIONS ──
  {
    id: "purchase_invoice",
    title: "Purchase Invoice / Bill",
    subtitle: "Record inward vendor tax bill & stock",
    category: "purchases",
    icon: Truck,
    badge: "Inward",
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    route: `${ROUTE_PATHS.purchases}?tab=purchase_invoice&new=1`,
    actionKey: "purchase",
  },
  {
    id: "payment_out",
    title: "Payment Out",
    subtitle: "Record payment to supplier / vendor",
    category: "purchases",
    icon: Receipt,
    color: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    route: `${ROUTE_PATHS.purchases}?tab=payment_out&new=1`,
    actionKey: "payment_out",
  },
  {
    id: "purchase_order",
    title: "Purchase Order (PO)",
    subtitle: "Send order to supplier for inventory purchase",
    category: "purchases",
    icon: Building2,
    color: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-500/10 border-slate-500/20",
    route: `${ROUTE_PATHS.purchases}?tab=purchase_orders&new=1`,
    actionKey: "purchase_orders",
  },
  {
    id: "debit_note",
    title: "Debit Note",
    subtitle: "Purchase return debit to supplier",
    category: "purchases",
    icon: FileCheck,
    color: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-500/20",
    route: `${ROUTE_PATHS.purchases}?tab=debit_note&new=1`,
    actionKey: "debit_note",
  },
  {
    id: "purchase_return",
    title: "Purchase Return",
    subtitle: "Return damaged goods to vendor",
    category: "purchases",
    icon: RotateCcw,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    route: `${ROUTE_PATHS.purchases}?tab=purchase_return&new=1`,
    actionKey: "purchase_return",
  },

  // ── MASTERS & GENERAL ──
  {
    id: "create_party",
    title: "Create Party (Customer / Supplier)",
    subtitle: "Add buyer or vendor with GSTIN & credit limit",
    category: "masters",
    icon: UserPlus,
    badge: "Master",
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    route: `${ROUTE_PATHS.parties}?new=1`,
    actionKey: "party",
  },
  {
    id: "bulk_parties",
    title: "Bulk Upload Parties (Excel / CSV)",
    subtitle: "Import full party ledger from Excel or Vyapar/Tally",
    category: "masters",
    icon: FileSpreadsheet,
    badge: "Bulk Excel",
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    route: `${ROUTE_PATHS.parties}?bulk=1`,
    actionKey: "bulk_parties",
  },
  {
    id: "create_item",
    title: "Create Item / Product",
    subtitle: "Add product with barcode, GST rate & batches",
    category: "masters",
    icon: PackagePlus,
    badge: "Stock",
    color: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    route: `${ROUTE_PATHS.items}?new=1`,
    actionKey: "item",
  },
  {
    id: "bulk_items",
    title: "Bulk Upload Products (Excel / CSV)",
    subtitle: "Import entire product catalog, barcodes & stock",
    category: "masters",
    icon: FileSpreadsheet,
    badge: "Bulk Excel",
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    route: `${ROUTE_PATHS.items}?bulk=1`,
    actionKey: "bulk_items",
  },
  {
    id: "tally_import",
    title: "Import Data (Tally & Excel)",
    subtitle: "Full migration of Stock Items, Ledgers, Bank Accounts & Vouchers",
    category: "masters",
    icon: FileSpreadsheet,
    badge: "Tally / Full",
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    route: ROUTE_PATHS.tallyImport,
    actionKey: "tally_import",
  },
  {
    id: "create_godown",
    title: "Godown / Warehouse",
    subtitle: "Set up storage location or transfer stock",
    category: "masters",
    icon: Building2,
    color: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-500/10 border-slate-500/20",
    route: ROUTE_PATHS.godown,
    actionKey: "godown",
  },

  // ── ACCOUNTING & EXPENSES ──
  {
    id: "create_expense",
    title: "Record Expense",
    subtitle: "Track store rent, salaries, utilities, tea & travel",
    category: "accounting",
    icon: DollarSign,
    badge: "P&L",
    color: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    route: `${ROUTE_PATHS.expenses}?new=1`,
    actionKey: "expense",
  },
  {
    id: "cash_bank_transfer",
    title: "Cash & Bank Entry",
    subtitle: "Deposit, withdraw, or transfer between accounts",
    category: "accounting",
    icon: Landmark,
    color: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-500/10 border-teal-500/20",
    route: ROUTE_PATHS.cashBank,
    actionKey: "cash_bank",
  },
  {
    id: "automated_bill",
    title: "Schedule Automated Bill",
    subtitle: "Set up recurring subscription or periodic invoice",
    category: "accounting",
    icon: Repeat,
    badge: "Auto",
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    route: `${ROUTE_PATHS.automatedBills}?new=1`,
    actionKey: "automated_bill",
  },
];

export function UniversalQuickCreateModal({
  open,
  onOpenChange,
  onActionSelect,
}: UniversalQuickCreateModalProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "sales" | "purchases" | "masters" | "accounting">("all");

  const filteredOptions = useMemo(() => {
    return ALL_CREATION_OPTIONS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        searchTerm.trim() === "" ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, activeCategory]);

  const handleSelect = (item: ActionItem) => {
    onOpenChange(false);
    if (onActionSelect && item.actionKey) {
      onActionSelect(item.actionKey);
    } else if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:border border-slate-200/80 dark:border-slate-800 flex flex-col gap-0 overflow-hidden bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
        {/* Header with Search & Filter Tabs */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-3.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Zap className="w-5 h-5 fill-white stroke-[1.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Create New Transaction or Record</span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                    ALL MODULES
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any sales invoice, inward purchase, party, item, or accounting record to create instantly
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Full Width Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search any creation option (e.g. Sales Invoice, Quotation, Purchase, Party, Expense, Bulk)..."
              className="pl-10 pr-9 h-10 rounded-2xl bg-slate-100/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-xs focus-visible:ring-indigo-500 shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dedicated Category Filter Pills Row (Never overflows screen) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0 mr-1">
              Category:
            </span>
            {[
              { id: "all", label: "All Modules", count: 19 },
              { id: "sales", label: "Sales & Invoicing", count: 8 },
              { id: "purchases", label: "Purchases & Inward", count: 5 },
              { id: "masters", label: "Master Data & Stock", count: 3 },
              { id: "accounting", label: "Accounting & Ledgers", count: 3 },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)} // eslint-disable-line @typescript-eslint/no-explicit-any
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 active:scale-95",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20"
                      : "bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Action Grid Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {filteredOptions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
              {filteredOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="group relative flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/50 bg-white/90 dark:bg-slate-900/90 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 dark:hover:from-slate-900 dark:hover:to-indigo-950/40 transition-all duration-200 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-[0.98] overflow-hidden"
                  >
                    {/* Top specular shine */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent" />

                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-110 shadow-xs",
                        item.iconBg,
                        item.color
                      )}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {item.title}
                        </h3>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-md text-[8.5px] font-mono font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>

                    <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Search className="w-8 h-8 text-slate-400/50" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No creation options matching "{searchTerm}"</p>
              <p className="text-xs text-slate-500">Try searching for invoice, purchase, customer, item, or bulk.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">Tip: Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-card border text-[10px] font-mono">⌘K</kbd>
            <span>or click</span>
            <strong className="text-foreground">"New Invoice"</strong>
            <span>anytime to open this menu</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-1 text-xs font-semibold hover:bg-muted rounded-lg transition-colors"
          >
            Cancel [ESC]
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
