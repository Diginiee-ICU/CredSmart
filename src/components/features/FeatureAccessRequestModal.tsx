import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { SYSTEM_FEATURES_MAP } from "@/config/features";
import { Lock, Clock, CheckCircle2, XCircle, Send, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeatureAccessRequestModal() {
  const {
    activeModalFeature,
    closeRequestModal,
    getFeatureRequestStatus,
    requestAccess,
    myRequests,
  } = useFeatureAccess();

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!activeModalFeature) return null;

  const feature = SYSTEM_FEATURES_MAP[activeModalFeature];
  const requestStatus = getFeatureRequestStatus(activeModalFeature);
  const currentRequest = myRequests.find((r) => r.feature_key === activeModalFeature);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const ok = await requestAccess(activeModalFeature, reason.trim());
      if (ok) {
        setReason("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = feature?.icon || Lock;

  return (
    <Dialog open={Boolean(activeModalFeature)} onOpenChange={(open) => !open && closeRequestModal()}>
      <DialogContent className="max-w-md w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl select-none">
        <DialogHeader className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>{feature?.label || activeModalFeature}</span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  🔒 Locked
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {feature?.category || "Protected Business Operation"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feature Purpose Strip */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {feature?.description || "This feature is restricted by your store administrator."}
        </div>

        {/* Dynamic Request Status Section */}
        {requestStatus === "pending" && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Access Request Pending Review</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Your request was submitted to your store administrator. Once approved, this module will unlock automatically.
              </p>
              {currentRequest?.reason && (
                <p className="text-[11px] font-mono italic text-amber-800/80 dark:text-amber-400">
                  Note: "{currentRequest.reason}"
                </p>
              )}
            </div>
          </div>
        )}

        {requestStatus === "rejected" && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
            <div className="flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200">
                <p className="font-semibold">Previous Request Not Approved</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  {currentRequest?.admin_notes || "Your administrator declined this access request."}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              You can submit a revised request below with additional justification:
            </p>
          </div>
        )}

        {/* Submission Form (Rendered if not pending) */}
        {requestStatus !== "pending" && (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="feature-request-reason"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Reason for Request (Optional)
              </label>
              <textarea
                id="feature-request-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Need access to generate quarterly inward purchase orders or GST filing..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                maxLength={250}
              />
              <p className="text-[11px] font-mono text-slate-400 text-right mt-0.5">
                {reason.length}/250
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeRequestModal}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-8.5 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Submitting…" : "Request Access"}</span>
              </button>
            </div>
          </form>
        )}

        {requestStatus === "pending" && (
          <div className="mt-3 flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-2">
            <button
              type="button"
              onClick={closeRequestModal}
              className="h-8.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
