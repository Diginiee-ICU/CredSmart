import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Ban, Clock } from "lucide-react";
import { EwayBillRecord } from "@/types/ewayBill";
import { ewayBillService } from "@/services/ewayBillService";
import { toast } from "sonner";

interface CancelEwayBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ewayBill: EwayBillRecord | null;
  onSuccess?: (cancelled: EwayBillRecord) => void;
}

export const CancelEwayBillModal: React.FC<CancelEwayBillModalProps> = ({
  open,
  onOpenChange,
  ewayBill,
  onSuccess,
}) => {
  const [cancelReason, setCancelReason] = useState("2 - Order Cancelled");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ewayBill) return null;

  // Check 24 hour threshold
  const createdTime = new Date(ewayBill.ewayBillDate || ewayBill.created_at).getTime();
  const hoursSinceCreation = Math.round((Date.now() - createdTime) / (1000 * 60 * 60));
  const isPast24Hours = hoursSinceCreation > 24;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cancelReason.includes("Others") && !cancelRemarks.trim()) {
      toast.error("Please provide specific remarks when selecting 'Others'");
      return;
    }

    setIsSubmitting(true);
    try {
      const cancelled = await ewayBillService.cancelEwayBill(
        ewayBill.organizationId,
        ewayBill.id,
        cancelReason,
        cancelRemarks.trim() || undefined
      );

      toast.success(`E-Way Bill ${ewayBill.ewayBillNo} cancelled successfully.`);
      onSuccess?.(cancelled);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Failed to cancel E-Way Bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl p-0 overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="px-4 sm:px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center text-white">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                Cancel E-Way Bill
              </DialogTitle>
              <p className="text-[11px] text-rose-100 font-mono">
                EWB: {ewayBill.ewayBillNo} • Doc: {ewayBill.docNo}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {isPast24Hours ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 text-amber-900 dark:text-amber-200 text-[11px]">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Statutory Advisory (24-Hour Rule):</p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  This E-Way bill was generated {hoursSinceCreation} hours ago. Under GST rules, cancellation is permitted only within 24 hours of generation if transit has not commenced. Proceeding will mark the record cancelled in your system.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2 text-slate-700 dark:text-slate-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-600 dark:text-rose-400">Irreversible Action:</p>
                <p className="mt-0.5">
                  Once cancelled, this E-Way Bill cannot be recovered or used for transit. A new E-Way Bill must be generated if goods are moved later.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </Label>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 - Duplicate">1 - Duplicate</SelectItem>
                <SelectItem value="2 - Order Cancelled">2 - Order Cancelled</SelectItem>
                <SelectItem value="3 - Data Entry Error">3 - Data Entry Error</SelectItem>
                <SelectItem value="4 - Others">4 - Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Remarks {cancelReason.includes("Others") && <span className="text-rose-500">*</span>}
            </Label>
            <Textarea
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="State reason details (mandatory if Others selected)..."
              className="text-xs mt-1 h-20 resize-none"
              required={cancelReason.includes("Others")}
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="min-h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Cancelling..." : "Confirm Cancellation"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
