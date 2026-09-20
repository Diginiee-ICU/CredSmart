import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { EwayBillRecord, EwayTransMode } from "@/types/ewayBill";
import { ewayBillService } from "@/services/ewayBillService";
import { toast } from "sonner";
import { INDIAN_STATES_AND_CODES } from "@/utils/suggestionData";

interface UpdatePartBModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ewayBill: EwayBillRecord | null;
  onSuccess?: (updated: EwayBillRecord) => void;
}

export const UpdatePartBModal: React.FC<UpdatePartBModalProps> = ({
  open,
  onOpenChange,
  ewayBill,
  onSuccess,
}) => {
  const [transMode, setTransMode] = useState<EwayTransMode>("1");
  const [vehicleNo, setVehicleNo] = useState("");
  const [fromPlace, setFromPlace] = useState("");
  const [fromState, setFromState] = useState("27-Maharashtra");
  const [transDocNo, setTransDocNo] = useState("");
  const [transDocDate, setTransDocDate] = useState("");
  const [reasonCode, setReasonCode] = useState("1 - Due to Transshipment");
  const [reasonRemarks, setReasonRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (ewayBill) {
      setTransMode(ewayBill.transMode || "1");
      setVehicleNo(ewayBill.vehicleNo || "");
      setFromPlace(ewayBill.fromPlace || "");
      const stateMatch = INDIAN_STATES_AND_CODES.find((s) => s.startsWith(ewayBill.fromStateCode));
      if (stateMatch) setFromState(stateMatch);
      setTransDocNo(ewayBill.transDocNo || "");
      setTransDocDate(ewayBill.transDocDate || new Date().toISOString().split("T")[0]);
      setReasonCode(
        ewayBill.vehicleNo
          ? "1 - Due to Transshipment"
          : "3 - Transporter not assigned earlier"
      );
      setReasonRemarks("");
    }
  }, [ewayBill, open]);

  if (!ewayBill) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVehicle = vehicleNo.replace(/\s/g, "").toUpperCase();

    if (transMode === "1" && !cleanVehicle) {
      toast.error("Vehicle Number is required for Road transport");
      return;
    }

    if (!fromPlace.trim()) {
      toast.error("From Place is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const stateCodeOnly = fromState.slice(0, 2);
      const updated = await ewayBillService.updatePartBVehicle(
        ewayBill.organizationId,
        ewayBill.id,
        {
          vehicleNo: cleanVehicle,
          fromPlace: fromPlace.trim(),
          fromState: stateCodeOnly,
          transMode,
          transDocNo: transDocNo.trim() || undefined,
          transDocDate: transDocDate || undefined,
          reasonCode,
          reasonRemarks: reasonRemarks.trim() || undefined,
        }
      );

      toast.success(
        `Part-B updated successfully for EWB ${ewayBill.ewayBillNo}! Vehicle: ${cleanVehicle}`
      );
      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Failed to update vehicle in Part-B");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                Update Vehicle / Part-B (In-Transit)
              </DialogTitle>
              <p className="text-[11px] text-slate-300 font-mono">
                EWB: {ewayBill.ewayBillNo} • Doc: {ewayBill.docNo}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-start gap-2 text-indigo-900 dark:text-indigo-200 text-[11px]">
            <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">GST Statutory Rule 138(5):</p>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Whenever goods are transferred from one vehicle to another during transit, Part-B must be updated before resuming movement.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Transport Mode
              </Label>
              <Select
                value={transMode}
                onValueChange={(val) => setTransMode(val as EwayTransMode)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Road</SelectItem>
                  <SelectItem value="2">2 - Rail</SelectItem>
                  <SelectItem value="3">3 - Air</SelectItem>
                  <SelectItem value="4">4 - Ship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Vehicle Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder="e.g. MH12AB1234"
                className="h-8 text-xs font-mono uppercase mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                From Place (Transit Point) <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={fromPlace}
                onChange={(e) => setFromPlace(e.target.value)}
                placeholder="e.g. Pune, Bhiwandi"
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                From State
              </Label>
              <Select value={fromState} onValueChange={setFromState}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {INDIAN_STATES_AND_CODES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Trans Doc / LR Number
              </Label>
              <Input
                value={transDocNo}
                onChange={(e) => setTransDocNo(e.target.value)}
                placeholder="LR / RR No."
                className="h-8 text-xs font-mono mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Doc Date
              </Label>
              <Input
                type="date"
                value={transDocDate}
                onChange={(e) => setTransDocDate(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Reason for Updating Vehicle <span className="text-rose-500">*</span>
            </Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1 - Due to Transshipment">
                  1 - Due to Transshipment
                </SelectItem>
                <SelectItem value="2 - Due to Vehicle Breakdown">
                  2 - Due to Vehicle Breakdown
                </SelectItem>
                <SelectItem value="3 - Transporter not assigned earlier">
                  3 - Transporter not assigned earlier
                </SelectItem>
                <SelectItem value="4 - Others">4 - Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Remarks (Optional)
            </Label>
            <Textarea
              value={reasonRemarks}
              onChange={(e) => setReasonRemarks(e.target.value)}
              placeholder="Provide reason remarks (e.g. Axle failure on Highway NH48)..."
              className="text-xs mt-1 h-16 resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Updating..." : "Update Part-B"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
