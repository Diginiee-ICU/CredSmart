import { useState } from "react";
import {
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import { NetworkInvoice } from "@/types/networkInvoicing";
import { NetworkInvoicePreviewModal } from "@/components/notifications/NetworkInvoicePreviewModal";
import { cn } from "@/lib/utils";

interface PendingInwardBannerProps {
  onActionComplete?: () => void;
  className?: string;
}

export function PendingInwardBanner({ onActionComplete, className }: PendingInwardBannerProps) {
  const {
    pendingInvoices,
    approveInvoice,
    rejectInvoice,
    approvingId,
    rejectingId,
  } = useNetworkInvoices();

  const [inspectingInvoice, setInspectingInvoice] = useState<NetworkInvoice | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isDismissed || pendingInvoices.length === 0) {
    return null;
  }

  const handleInspect = (inv: NetworkInvoice) => {
    setInspectingInvoice(inv);
    setInspectModalOpen(true);
  };

  const handleApprove = async (invId: string) => {
    const ok = await approveInvoice(invId);
    if (ok && onActionComplete) {
      onActionComplete();
    }
  };

  const handleReject = async (invId: string) => {
    await rejectInvoice(invId);
    if (onActionComplete) {
      onActionComplete();
    }
  };

  const isSingle = pendingInvoices.length === 1;
  const singleInv = pendingInvoices[0];

  return (
    <>
      <div
        className={cn(
          "w-full rounded-2xl sm:rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/10 dark:from-amber-950/30 dark:via-emerald-950/20 dark:to-amber-950/20 border border-amber-400/40 dark:border-amber-500/30 p-3.5 sm:p-4.5 shadow-sm shrink-0 space-y-3 transition-all duration-300 animate-in fade-in",
          className
        )}
      >
        {/* Banner Header Strip */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                  Incoming Sales Invoices Awaiting Inward Approval
                </h3>
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-bold text-[11px] px-2 py-0.2 rounded-full font-mono shrink-0 shadow-2xs">
                  {pendingInvoices.length} Pending
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block mt-0.5">
                Other CredSmart businesses generated invoices in your name. Approving will automatically record them as inward purchase bills.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Inward Banner" : "Collapse Inward Banner"}
              aria-label={isCollapsed ? "Expand Inward Banner" : "Collapse Inward Banner"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Dismiss for now"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner Content Body (Collapsible) */}
        {!isCollapsed && (
          <>
            {/* ── Case 1: Single Pending Invoice (Balanced Full-Width Layout) ── */}
            {isSingle ? (
              <div className="w-full rounded-xl sm:rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-amber-400/40 dark:border-amber-500/30 shadow-xs p-3.5 sm:p-4">
                {/* Desktop layout for Single Invoice */}
                <div className="hidden md:flex items-center justify-between gap-4">
                  {/* Left: Sender & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground font-medium">Sale Created by</span>
                        <span className="text-primary font-black">{singleInv.senderOrgName}</span>
                        <span className="text-muted-foreground font-medium">on your business name</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 flex-wrap font-sans">
                        <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-md border border-border/70">
                          #{singleInv.invoiceNumber}
                        </span>
                        <span>•</span>
                        <span>{singleInv.docDate}</span>
                        <span>•</span>
                        <span className="truncate max-w-xs text-foreground/80">
                          <strong>{singleInv.items.length} item{singleInv.items.length > 1 ? "s" : ""}:</strong>{" "}
                          {singleInv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center-Right: Amount */}
                  <div className="text-right shrink-0 px-4 border-l border-r border-border/60">
                    <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Total Bill
                    </span>
                    <span className="text-lg lg:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{singleInv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInspect(singleInv)}
                      className="h-9 px-3 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 rounded-xl cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Bill</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 px-3.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 font-bold rounded-xl active:scale-95 cursor-pointer"
                      onClick={() => handleReject(singleInv.id)}
                      disabled={rejectingId === singleInv.id || approvingId === singleInv.id}
                    >
                      {rejectingId === singleInv.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                      )}
                      Reject
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-4 text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl shadow-sm shadow-emerald-600/25 active:scale-95 cursor-pointer"
                      onClick={() => handleApprove(singleInv.id)}
                      disabled={approvingId === singleInv.id || rejectingId === singleInv.id}
                    >
                      {approvingId === singleInv.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Approve &amp; Inward
                    </Button>
                  </div>
                </div>

                {/* Mobile layout for Single Invoice */}
                <div className="flex md:hidden flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{singleInv.senderOrgName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        created a sale on your business name
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                          #{singleInv.invoiceNumber}
                        </span>
                        <span>•</span>
                        <span>{singleInv.docDate}</span>
                        <span>•</span>
                        <span>{singleInv.items.length} Item{singleInv.items.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                        Total Bill
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{singleInv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Items snapshot & View Bill */}
                  <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/60 flex items-center justify-between gap-2">
                    <span className="truncate flex-1">
                      <strong className="text-foreground font-semibold">Items:</strong>{" "}
                      {singleInv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInspect(singleInv)}
                      className="text-primary hover:underline shrink-0 font-bold flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg bg-primary/10 active:scale-95"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Bill</span>
                    </button>
                  </div>

                  {/* Touch-Friendly Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
                      onClick={() => handleReject(singleInv.id)}
                      disabled={rejectingId === singleInv.id || approvingId === singleInv.id}
                    >
                      {rejectingId === singleInv.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                      )}
                      Reject
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs shadow-emerald-600/20 active:scale-95 cursor-pointer"
                      onClick={() => handleApprove(singleInv.id)}
                      disabled={approvingId === singleInv.id || rejectingId === singleInv.id}
                    >
                      {approvingId === singleInv.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Approve &amp; Inward
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Case 2: Multiple Pending Invoices (Responsive Grid Layout) ── */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pendingInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-amber-400/40 dark:border-amber-500/30 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">{inv.senderOrgName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          created sale on your name
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 flex-wrap font-sans">
                          <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/70">
                            #{inv.invoiceNumber}
                          </span>
                          <span>•</span>
                          <span>{inv.docDate}</span>
                          <span>•</span>
                          <span>{inv.items.length} item{inv.items.length > 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                          Amount
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/60 flex items-center justify-between gap-2">
                      <span className="truncate flex-1">
                        <strong>Items:</strong> {inv.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInspect(inv)}
                        className="text-primary hover:underline shrink-0 font-bold flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-primary/5 active:scale-95"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 font-bold rounded-lg active:scale-95 cursor-pointer"
                        onClick={() => handleReject(inv.id)}
                        disabled={rejectingId === inv.id || approvingId === inv.id}
                      >
                        {rejectingId === inv.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        Reject
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        className="h-8 flex-[1.4] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs active:scale-95 cursor-pointer"
                        onClick={() => handleApprove(inv.id)}
                        disabled={approvingId === inv.id || rejectingId === inv.id}
                      >
                        {approvingId === inv.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
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
      </div>

      {/* Network Invoice Inspection Preview Modal */}
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
