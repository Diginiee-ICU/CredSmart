import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import { useIsMobile } from "@/hooks/use-mobile";
import { NetworkInvoice, AlertCategory, NetworkNotification } from "@/types/networkInvoicing";
import { NetworkInvoicePreviewModal } from "./NetworkInvoicePreviewModal";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Receipt,
  Building2,
  ShieldCheck,
  CheckCheck,
  Zap,
  Loader2,
  Inbox,
  Search,
  Package,
  CreditCard,
  FileCheck,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_FILTERS: { id: AlertCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All Alerts", icon: Bell },
  { id: "inward", label: "Inward Invoices", icon: Receipt },
  { id: "inventory", label: "Low Stock", icon: Package },
  { id: "payments", label: "Payment Dues", icon: CreditCard },
  { id: "compliance", label: "Compliance", icon: FileCheck },
];

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    pendingInvoices,
    pendingCount,
    allInvoices,
    notifications,
    unreadCount,
    approvingId,
    rejectingId,
    approveInvoice,
    rejectInvoice,
    markAsRead,
    markAllAsRead,
    simulateTestInvoice,
  } = useNetworkInvoices();

  const [activeTab, setActiveTab] = useState<"pending" | "all" | "history">("pending");
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingInvoice, setInspectingInvoice] = useState<NetworkInvoice | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleInspect = (inv: NetworkInvoice) => {
    setInspectingInvoice(inv);
    setInspectModalOpen(true);
  };

  const handleApprove = async (invId: string) => {
    await approveInvoice(invId);
  };

  const handleReject = async (invId: string) => {
    await rejectInvoice(invId);
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await simulateTestInvoice();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleNotificationAction = (notif: NetworkNotification) => {
    markAsRead(notif.id);
    if (notif.actionUrl) {
      onOpenChange(false);
      navigate(notif.actionUrl);
    } else if (notif.networkInvoiceId) {
      const matchedInv = allInvoices.find((i) => i.id === notif.networkInvoiceId);
      if (matchedInv) {
        handleInspect(matchedInv);
      }
    }
  };

  // Filtered Pending Invoices
  const filteredPendingInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pendingInvoices;
    return pendingInvoices.filter(
      (inv) =>
        inv.senderOrgName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.recipientPhone && inv.recipientPhone.includes(q)) ||
        inv.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }, [pendingInvoices, searchQuery]);

  // Filtered History Invoices (Approved & Rejected)
  const historyInvoices = useMemo(() => {
    const nonPending = allInvoices.filter((i) => i.status !== "pending");
    const q = searchQuery.toLowerCase().trim();
    if (!q) return nonPending;
    return nonPending.filter(
      (inv) =>
        inv.senderOrgName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.items.some((it) => it.productName.toLowerCase().includes(q))
    );
  }, [allInvoices, searchQuery]);

  // Filtered Notifications & Business Alerts
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (selectedCategory !== "all") {
        if (notif.category && notif.category !== selectedCategory) {
          return false;
        }
        if (!notif.category) {
          if (selectedCategory === "inward" && !notif.type.startsWith("sale_invoice_")) return false;
          if (selectedCategory === "inventory" && notif.type !== "low_stock_alert") return false;
          if (selectedCategory === "payments" && notif.type !== "payment_due_alert") return false;
          if (selectedCategory === "compliance" && notif.type !== "compliance_alert") return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = notif.title.toLowerCase().includes(q);
        const matchesMessage = notif.message.toLowerCase().includes(q);
        const matchesInvoice = notif.data?.invoiceNumber?.toString().toLowerCase().includes(q);
        const matchesParty = notif.data?.partyName?.toString().toLowerCase().includes(q);
        const matchesProduct = notif.data?.productName?.toString().toLowerCase().includes(q);
        if (!matchesTitle && !matchesMessage && !matchesInvoice && !matchesParty && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, selectedCategory, searchQuery]);

  const getNotificationIcon = (notif: NetworkNotification) => {
    if (notif.type === "low_stock_alert") return Package;
    if (notif.type === "payment_due_alert") return CreditCard;
    if (notif.type === "compliance_alert") return FileCheck;
    if (notif.type === "sale_invoice_approved") return CheckCircle2;
    if (notif.type === "sale_invoice_rejected" || notif.type === "sale_invoice_cancelled") return XCircle;
    if (notif.type === "sale_invoice_received") return Receipt;
    return Bell;
  };

  const getNotificationBadgeColor = (notif: NetworkNotification) => {
    if (notif.type === "low_stock_alert") return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (notif.type === "payment_due_alert") return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    if (notif.type === "compliance_alert") return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    if (notif.type === "sale_invoice_approved") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    if (notif.type === "sale_invoice_rejected" || notif.type === "sale_invoice_cancelled") return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* MOBILE DRAWER VIEW (Touch-Optimized Bottom Sheet) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            className="h-[92dvh] max-h-[94dvh] rounded-t-[1.75rem] p-0 flex flex-col border-t border-slate-200 dark:border-slate-800 bg-card shadow-2xl overflow-hidden focus:outline-none"
          >
            {/* Native Pull Handle Indicator */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Mobile Header */}
            <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SheetTitle className="text-sm font-bold text-foreground truncate">
                      Notifications &amp; Inward Alerts
                    </SheetTitle>
                    {pendingCount > 0 && (
                      <Badge className="bg-amber-500 text-white font-bold text-[11px] px-1.5 py-0.2 rounded-full animate-pulse shrink-0">
                        {pendingCount} Action{pendingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <SheetDescription className="text-[11px] text-muted-foreground truncate mt-0.5">
                    B2B connected sales invoices &amp; real-time store alerts
                  </SheetDescription>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="h-8 px-2.5 text-[11px] font-bold border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 rounded-xl active:scale-95"
              >
                {isSimulating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                )}
                <span>Test Demo</span>
              </Button>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="px-4 pt-2 pb-1 shrink-0 bg-background border-b border-border/50">
              <div className="grid grid-cols-3 p-1 rounded-xl bg-muted/60 border border-border/80 text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("pending")}
                  className={cn(
                    "py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all text-xs active:scale-95 cursor-pointer",
                    activeTab === "pending"
                      ? "bg-white dark:bg-slate-900 text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">Inward</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[11px] text-white font-mono font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all text-xs active:scale-95 cursor-pointer",
                    activeTab === "all"
                      ? "bg-white dark:bg-slate-900 text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">Store Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-primary text-[11px] text-white font-mono font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all text-xs active:scale-95 cursor-pointer",
                    activeTab === "history"
                      ? "bg-white dark:bg-slate-900 text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">History</span>
                  {historyInvoices.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-muted-foreground/20 text-[11px] text-foreground font-mono">
                      {historyInvoices.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search input in mobile */}
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search invoices, parties, items or alerts..."
                  className="h-8.5 pl-8 pr-3 text-xs bg-muted/40 rounded-xl border-border/80 focus-visible:ring-1"
                />
              </div>

              {/* Category Pills (when in Store Alerts tab) */}
              {activeTab === "all" && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2">
                  {CATEGORY_FILTERS.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all border cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sub-header status & Mark all read button */}
            <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/50 bg-muted/20 shrink-0">
              <span>
                {activeTab === "pending"
                  ? `${filteredPendingInvoices.length} bill${filteredPendingInvoices.length === 1 ? "" : "s"} waiting for approval`
                  : activeTab === "history"
                  ? `${historyInvoices.length} past inward record${historyInvoices.length === 1 ? "" : "s"}`
                  : `${filteredNotifications.length} alert${filteredNotifications.length === 1 ? "" : "s"}`}
              </span>
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer active:scale-95 py-0.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            </div>

            {/* Mobile Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {/* TAB 1: PENDING INWARD INVOICES */}
              {activeTab === "pending" && (
                <>
                  {filteredPendingInvoices.length === 0 ? (
                    <div className="py-12 px-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted/70 flex items-center justify-center mx-auto text-muted-foreground">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No Pending Invoices</p>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          When a verified trade partner issues an invoice in your name, it will instantly appear here for 1-click ledger reconciliation.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        className="h-9 px-3 text-xs font-bold border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-xl mt-2 cursor-pointer active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        <span>Simulate Test B2B Invoice</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPendingInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-xs space-y-3 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-orange-500" />

                          {/* Sender & Amount */}
                          <div className="flex items-start justify-between gap-2 pl-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="truncate">{inv.senderOrgName}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                created a sale on your business name
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground flex-wrap font-sans">
                                <span className="font-mono font-bold text-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/70">
                                  #{inv.invoiceNumber}
                                </span>
                                <span>•</span>
                                <span>{inv.docDate}</span>
                                <span>•</span>
                                <span>{inv.items.length} Item{inv.items.length > 1 ? "s" : ""}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                                Total Bill
                              </span>
                              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Items Snapshot & View Bill */}
                          <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/60 flex items-center justify-between gap-2 pl-2.5">
                            <span className="truncate flex-1">
                              <strong className="text-foreground font-semibold">Items:</strong>{" "}
                              {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspect(inv)}
                              className="text-primary hover:underline shrink-0 font-bold flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg bg-primary/10 active:scale-95"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Bill</span>
                            </button>
                          </div>

                          {/* Mobile Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-0.5 pl-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
                              onClick={() => handleReject(inv.id)}
                              disabled={rejectingId === inv.id || approvingId === inv.id}
                            >
                              {rejectingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Reject
                            </Button>

                            <Button
                              size="sm"
                              className="h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs shadow-emerald-600/20 active:scale-95 cursor-pointer"
                              onClick={() => handleApprove(inv.id)}
                              disabled={approvingId === inv.id || rejectingId === inv.id}
                            >
                              {approvingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Approve &amp; Inward
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: STORE ALERTS & NOTIFICATIONS */}
              {activeTab === "all" && (
                <>
                  {filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                      <Inbox className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">No alerts in this category</p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                        Your inventory levels, payment recovery schedules, and compliance metrics are all in healthy standing.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredNotifications.map((notif) => {
                        const isUnread = notif.status === "unread";
                        const IconComponent = getNotificationIcon(notif);
                        const badgeStyle = getNotificationBadgeColor(notif);

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationAction(notif)}
                            className={cn(
                              "p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 text-xs active:scale-[0.99]",
                              isUnread
                                ? "bg-gradient-to-br from-primary/5 via-card to-card border-primary/30 shadow-2xs font-medium"
                                : "bg-card border-border hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={cn("p-2 rounded-xl shrink-0 mt-0.5 border", badgeStyle)}>
                                <IconComponent className="w-4 h-4" />
                              </div>

                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-bold text-foreground truncate">{notif.title}</p>
                                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                    {new Date(notif.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            </div>

                            {notif.actionLabel && (
                              <div className="flex justify-end pt-1 border-t border-border/40">
                                <span className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                                  <span>{notif.actionLabel}</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: INWARD HISTORY */}
              {activeTab === "history" && (
                <>
                  {historyInvoices.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                      <Clock className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                      <p className="font-bold text-foreground">No Inward History Yet</p>
                      <p className="text-[11px] text-muted-foreground">
                        Approved or rejected incoming sales invoices will be archived here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {historyInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3 rounded-2xl border border-border bg-card flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground truncate">{inv.senderOrgName}</span>
                              <Badge
                                className={cn(
                                  "text-[11px] px-1.5 py-0.2 rounded-full font-bold",
                                  inv.status === "approved"
                                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-600 border-rose-500/30"
                                )}
                              >
                                {inv.status === "approved" ? "Approved" : "Rejected"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                              #{inv.invoiceNumber} • {inv.docDate} • {inv.items.length} items
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInspect(inv)}
                              className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live 2-Way Ledger Sync</span>
              </div>
              <div className="font-mono text-[11px]">
                <span>GST Ready</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* DESKTOP DIALOG VIEW (100% Masterpiece Architecture) */
        /* ───────────────────────────────────────────────────────────── */
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      Notifications &amp; Inward Alerts
                    </DialogTitle>
                    {pendingCount > 0 && (
                      <Badge className="bg-amber-500 text-white font-bold text-[11px] px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                        {pendingCount} Action{pendingCount > 1 ? "s" : ""} Required
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    B2B connected sales invoices and real-time business alerts
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="h-8.5 px-3 text-xs font-bold border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all cursor-pointer active:scale-95"
                  title="Simulate an incoming B2B sales invoice for 1-click test"
                >
                  {isSimulating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  )}
                  <span>Simulate Test Invoice</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-8.5 px-2.5 rounded-xl cursor-pointer"
                  onClick={markAllAsRead}
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  <span>Mark All Read</span>
                </Button>
              </div>
            </div>

            {/* Desktop Navigation & Filters Bar */}
            <div className="flex flex-col border-b border-border bg-muted/30 px-5 pt-3 pb-2.5 gap-2.5">
              <div className="flex items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("pending")}
                    className={cn(
                      "pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer",
                      activeTab === "pending"
                        ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Incoming Invoices</span>
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[11px] text-white font-mono font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer",
                      activeTab === "all"
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Real-Time Business Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-primary text-[11px] text-white font-mono font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={cn(
                      "pb-2 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer",
                      activeTab === "history"
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>Inward History</span>
                    {historyInvoices.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-muted text-[11px] text-muted-foreground font-mono">
                        {historyInvoices.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invoices &amp; alerts..."
                    className="h-8 pl-8 pr-3 text-xs bg-card rounded-xl border-border/80 focus-visible:ring-1"
                  />
                </div>
              </div>

              {/* Filter Pills when on Store Alerts Tab */}
              {activeTab === "all" && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                  {CATEGORY_FILTERS.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all border cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {/* TAB 1: PENDING INWARD INVOICES */}
              {activeTab === "pending" && (
                <>
                  {filteredPendingInvoices.length === 0 ? (
                    <div className="py-14 px-4 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted/70 flex items-center justify-center mx-auto text-muted-foreground">
                        <Inbox className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No Pending Invoices</p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          When a verified trade partner issues an invoice in your name, it will instantly appear here for 1-click ledger reconciliation.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        className="h-9 px-4 text-xs font-bold border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl cursor-pointer active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
                        <span>Simulate Test B2B Invoice</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {filteredPendingInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4.5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-xs space-y-3 relative overflow-hidden transition-all hover:border-amber-500/50"
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-orange-500" />

                          {/* Card Top: Sender & Title */}
                          <div className="flex items-center justify-between gap-3 pl-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                                <Receipt className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                                  Sale was Created by <span className="text-primary font-black">{inv.senderOrgName}</span> on your name
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap font-sans">
                                  <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/70">
                                    #{inv.invoiceNumber}
                                  </span>
                                  <span>•</span>
                                  <span>{inv.docDate}</span>
                                  <span>•</span>
                                  <span>{inv.items.length} Item{inv.items.length > 1 ? "s" : ""}</span>
                                  {inv.senderOrgGstin && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono">GSTIN: {inv.senderOrgGstin}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 pl-3 border-l border-border/60">
                              <span className="text-[11px] uppercase font-bold text-muted-foreground block tracking-wider">
                                Bill Amount
                              </span>
                              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Items Snapshot Chip */}
                          <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60 flex items-center justify-between gap-2 ml-2">
                            <span className="truncate text-xs flex-1">
                              <strong className="text-foreground font-semibold">Items:</strong>{" "}
                              {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspect(inv)}
                              className="text-primary hover:underline text-xs shrink-0 font-bold flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg bg-primary/10 hover:bg-primary/15 active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Full Bill</span>
                            </button>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 pl-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-3.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
                              onClick={() => handleReject(inv.id)}
                              disabled={rejectingId === inv.id || approvingId === inv.id}
                            >
                              {rejectingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Reject
                            </Button>

                            <Button
                              size="sm"
                              className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs shadow-emerald-600/20 active:scale-95 cursor-pointer"
                              onClick={() => handleApprove(inv.id)}
                              disabled={approvingId === inv.id || rejectingId === inv.id}
                            >
                              {approvingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Approve &amp; Add to Purchases
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: STORE ALERTS */}
              {activeTab === "all" && (
                <>
                  {filteredNotifications.length === 0 ? (
                    <div className="py-14 text-center text-xs text-muted-foreground space-y-2">
                      <Inbox className="w-10 h-10 mx-auto text-muted-foreground/60" />
                      <p className="font-bold text-foreground">No alerts matching this filter</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        All store inventory thresholds, customer ledgers, and compliance checks are operating smoothly.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredNotifications.map((notif) => {
                        const isUnread = notif.status === "unread";
                        const IconComponent = getNotificationIcon(notif);
                        const badgeStyle = getNotificationBadgeColor(notif);

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationAction(notif)}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 text-xs group",
                              isUnread
                                ? "bg-gradient-to-br from-primary/5 via-card to-card border-primary/30 shadow-2xs font-medium"
                                : "bg-card border-border hover:bg-muted/30"
                            )}
                          >
                            <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5 border", badgeStyle)}>
                              <IconComponent className="w-4.5 h-4.5" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                                  {notif.title}
                                </p>
                                <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                  {new Date(notif.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.actionLabel && (
                                <div className="pt-1 flex items-center gap-1 text-primary font-bold text-xs group-hover:underline">
                                  <span>{notif.actionLabel}</span>
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: INWARD HISTORY */}
              {activeTab === "history" && (
                <>
                  {historyInvoices.length === 0 ? (
                    <div className="py-14 text-center text-xs text-muted-foreground space-y-1">
                      <Clock className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
                      <p className="font-bold text-foreground">No Inward History Yet</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Invoices you approve or reject will be permanently archived here for reference.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {historyInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm truncate">{inv.senderOrgName}</span>
                              <Badge
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full font-bold",
                                  inv.status === "approved"
                                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-600 border-rose-500/30"
                                )}
                              >
                                {inv.status === "approved" ? "Approved & Inward" : "Rejected"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              Invoice #{inv.invoiceNumber} • Date: {inv.docDate} • Items: {inv.items.length}
                              {inv.purchaseInvoiceNumber && ` • Purchase Bill: #${inv.purchaseInvoiceNumber}`}
                            </p>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                                Grand Total
                              </span>
                              <span className="font-mono font-black text-sm sm:text-base text-foreground">
                                ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInspect(inv)}
                              className="h-9 px-3 rounded-xl text-primary font-bold text-xs gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Real-time CredSmart 2-Way Synchronization</span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                <span>Encrypted • GST Ready • Auto Ledger Reconciliation</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Full Invoice Preview Modal */}
      <NetworkInvoicePreviewModal
        open={inspectModalOpen}
        onOpenChange={setInspectModalOpen}
        invoice={inspectingInvoice}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approvingId === inspectingInvoice?.id}
        isRejecting={rejectingId === inspectingInvoice?.id}
      />
    </>
  );
}
