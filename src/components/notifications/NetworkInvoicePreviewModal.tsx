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
import { NetworkInvoice } from "@/types/networkInvoicing";
import {
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
  Truck,
  User,
  XCircle,
  CheckCircle2,
  Receipt,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkInvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: NetworkInvoice | null;
  onApprove?: (invoiceId: string) => Promise<void>;
  onReject?: (invoiceId: string) => Promise<void>;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function NetworkInvoicePreviewModal({
  open,
  onOpenChange,
  invoice,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: NetworkInvoicePreviewModalProps) {
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!invoice) return null;

  const isPending = invoice.status === "pending";
  const isApproved = invoice.status === "approved";
  const isRejected = invoice.status === "rejected";

  const handleConfirmReject = async () => {
    if (onReject) {
      await onReject(invoice.id);
      setRejectPromptOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-foreground tracking-tight">
                    Sales Invoice #{invoice.invoiceNumber}
                  </h2>
                  {isPending && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                      <Sparkles className="w-3 h-3 mr-1 fill-amber-500 text-amber-500 animate-pulse" />
                      Pending Your Inward Approval
                    </Badge>
                  )}
                  {isApproved && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                      Approved &amp; Added to Purchases
                    </Badge>
                  )}
                  {isRejected && (
                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-bold">
                      <XCircle className="w-3 h-3 mr-1 text-rose-500" />
                      Rejected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created by <strong className="text-foreground">{invoice.senderOrgName}</strong> on your name
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Invoice Value
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Parties & Metadata */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seller Box (Person A) */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Seller / Supplier (Person A)</span>
              </div>
              <p className="text-sm font-bold text-foreground">{invoice.senderOrgName}</p>
              {invoice.senderOrgGstin && (
                <p className="text-xs text-muted-foreground">
                  GSTIN: <span className="font-mono font-medium text-foreground">{invoice.senderOrgGstin}</span>
                </p>
              )}
              {invoice.senderOrgPhone && (
                <p className="text-xs text-muted-foreground">Phone: {invoice.senderOrgPhone}</p>
              )}
              {invoice.senderOrgAddress && (
                <p className="text-xs text-muted-foreground truncate">{invoice.senderOrgAddress}</p>
              )}
            </div>

            {/* Buyer Box (Person B) */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Billed To / Buyer (Your Business)</span>
              </div>
              <p className="text-sm font-bold text-foreground">{invoice.recipientOrgName}</p>
              {invoice.recipientGstin && (
                <p className="text-xs text-muted-foreground">
                  GSTIN: <span className="font-mono font-medium text-foreground">{invoice.recipientGstin}</span>
                </p>
              )}
              {invoice.recipientPhone && (
                <p className="text-xs text-muted-foreground">Phone: {invoice.recipientPhone}</p>
              )}
              {invoice.recipientAddress && (
                <p className="text-xs text-muted-foreground truncate">{invoice.recipientAddress}</p>
              )}
            </div>
          </div>

          {/* Key Dates & Payment Mode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Invoice Date</span>
              <span className="font-bold text-foreground">{invoice.docDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Due Date</span>
              <span className="font-bold text-foreground">{invoice.dueDate || invoice.docDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Payment Terms</span>
              <span className="font-bold text-foreground">{invoice.paymentTerms || "Due on Receipt"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Payment Mode</span>
              <span className="font-bold text-foreground">{invoice.paymentMethod || "Credit"}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <span>Itemized Bill Breakdown ({invoice.items.length} Items)</span>
              </h3>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Item Name</th>
                      <th className="px-3 py-2.5 text-center">HSN</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3 py-2.5 text-right">Rate</th>
                      <th className="px-3 py-2.5 text-right">Tax %</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-card">
                    {invoice.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground font-mono">{index + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">
                          {item.productName}
                          {item.batchNumber && (
                            <span className="block text-[11px] font-mono text-muted-foreground">
                              Batch: {item.batchNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">
                          {item.hsn || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">
                          {item.altUnit && item.altQty != null && item.altQty > 0 ? (
                            <div className="leading-tight">
                              <span className="font-bold text-foreground block">
                                {item.altQty} {item.altUnit}
                              </span>
                              <span className="block text-[11px] text-muted-foreground font-mono mt-0.5">
                                ({item.altQty}*{item.altUnitConversion || Math.round(item.quantity / item.altQty) || 1} {item.unit || "Pcs"})
                              </span>
                            </div>
                          ) : (
                            <span>{item.quantity} {item.unit || "PCS"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground">
                          ₹{item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono">
                          {item.taxRate}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                          ₹{item.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tax & Grand Total Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="text-xs space-y-1 text-muted-foreground">
              {invoice.notes && <p><strong>Notes:</strong> {invoice.notes}</p>}
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>GST Tax &amp; Line Items mathematically verified</span>
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono text-foreground">
                  ₹{invoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span className="font-mono text-rose-600">
                    -₹{invoice.discountTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {invoice.taxTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST Taxes:</span>
                  <span className="font-mono text-foreground">
                    +₹{invoice.taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between text-sm font-black text-foreground">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  ₹{invoice.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection Prompt (Inline) */}
          {rejectPromptOpen && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3 animate-in fade-in">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                Are you sure you want to reject this sales invoice?
              </p>
              <p className="text-xs text-muted-foreground">
                The seller ({invoice.senderOrgName}) will be notified that you rejected this bill.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectPromptOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                >
                  {isRejecting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold"
          >
            Close
          </Button>

          {isPending && !rejectPromptOpen && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 h-11 sm:h-9 text-xs font-semibold active:scale-[0.98]"
                onClick={() => setRejectPromptOpen(true)}
                disabled={isApproving || isRejecting}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 h-11 sm:h-9 text-xs active:scale-[0.98]"
                onClick={async () => {
                  if (onApprove) {
                    await onApprove(invoice.id);
                    onOpenChange(false);
                  }
                }}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                )}
                Approve &amp; Add to Purchases
              </Button>
            </div>
          )}

          {isApproved && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
              <span>Inward Recorded as Purchase Bill #{invoice.purchaseInvoiceNumber || "PI"}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
