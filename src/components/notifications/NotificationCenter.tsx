import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import { NetworkInvoice } from "@/types/networkInvoicing";
import { NetworkInvoicePreviewModal } from "./NetworkInvoicePreviewModal";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Receipt,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Zap,
  Loader2,
  Layers,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
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

  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [inspectingInvoice, setInspectingInvoice] = useState<NetworkInvoice | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-foreground">
                    Notifications &amp; Inward Alerts
                  </DialogTitle>
                  {pendingCount > 0 && (
                    <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
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
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={markAllAsRead}
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Mark All Read</span>
              </Button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center border-b border-border bg-muted/40 px-4 pt-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={cn(
                "pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors",
                activeTab === "pending"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Incoming Invoices</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] text-white font-mono">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors",
                activeTab === "all"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>All Notifications</span>
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] text-muted-foreground font-mono">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {activeTab === "pending" && (
              <>
                {pendingInvoices.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted/70 flex items-center justify-center mx-auto text-muted-foreground">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No Pending Invoices</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        When another business (Person A) issues a sales invoice in your name, it will automatically appear here with instant Approve or Reject actions.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={simulateTestInvoice}
                        className="text-xs text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5 fill-primary" />
                        Simulate Partner Sales Invoice (1-Click Test)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-sm space-y-3 relative overflow-hidden transition-all hover:border-amber-500/50"
                      >
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />

                        {/* Card Top: Sender & Title */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight">
                                Sale was Created by <span className="text-primary">{inv.senderOrgName}</span> on your name
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                                <span className="font-mono font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                  #{inv.invoiceNumber}
                                </span>
                                <span>·</span>
                                <span>{inv.docDate}</span>
                                <span>·</span>
                                <span>{inv.items.length} Item{inv.items.length > 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>

                          <div className="sm:text-right pl-9 sm:pl-0">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                              Bill Amount
                            </span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Items Snapshot Chip */}
                        <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60 flex items-center justify-between gap-2 sm:ml-9">
                          <span className="truncate text-[11px] sm:text-xs">
                            <strong className="text-foreground">Items:</strong> {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInspect(inv)}
                            className="text-primary hover:underline text-[11px] sm:text-xs shrink-0 font-bold flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded hover:bg-primary/5 active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Bill</span>
                          </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 pt-1 sm:pl-9">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-xs min-h-[40px] sm:min-h-[32px] font-semibold active:scale-[0.98]"
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs min-h-[40px] sm:min-h-[32px] shadow-sm shadow-emerald-500/20 active:scale-[0.98]"
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

            {activeTab === "all" && (
              <>
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No notification history yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map((notif) => {
                      const isUnread = notif.status === "unread";
                      const isApproved = notif.actionStatus === "approved";
                      const isRejected = notif.actionStatus === "rejected";

                      return (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs",
                            isUnread
                              ? "bg-primary/5 border-primary/30 font-medium"
                              : "bg-card border-border hover:bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "p-2 rounded-lg shrink-0 mt-0.5",
                              isApproved
                                ? "bg-emerald-500/15 text-emerald-600"
                                : isRejected
                                ? "bg-rose-500/15 text-rose-600"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {isApproved ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isRejected ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-foreground truncate">{notif.title}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {new Date(notif.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real-time CredSmart 2-Way Synchronization</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-primary hover:underline"
              onClick={simulateTestInvoice}
            >
              <Zap className="w-3 h-3 mr-1" />
              Test Simulation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
