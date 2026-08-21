import { useEffect } from "react";
import { Batch, Product } from "@/types/pos";
import { X, Calendar, PackageCheck, AlertCircle } from "lucide-react";

interface BatchConflictModalProps {
  product: Product;
  batches: Batch[];
  onSelect: (batch: Batch) => void;
  onClose: () => void;
}

export function BatchConflictModal({ product, batches, onSelect, onClose }: BatchConflictModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl card-shadow-lg p-5 sm:p-6 w-full max-w-md max-h-[calc(100dvh-0.75rem)] overflow-auto animate-scale-in z-10 border border-border">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-warning/15 text-warning rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            Multiple MRPs Detected
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground mt-1 truncate">{product.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          This product has multiple active inventory batches. Select the price / batch printed on the item you're holding:
        </p>

        <div className="space-y-2.5">
          {batches.map((batch) => {
            const formattedExp = batch.expiryDate
              ? new Date(batch.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
              : null;

            return (
              <button
                key={batch.id}
                type="button"
                onClick={() => onSelect(batch)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 transition-all group text-left"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                      Batch #{batch.batchNumber || "General"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <strong className="text-foreground">{batch.stock}</strong> in stock
                    </span>
                    {formattedExp && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Exp: {formattedExp}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                    ₹{batch.mrp.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">MRP</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
