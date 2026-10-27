import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileCartDockProps {
  itemsCount: number;
  totalUnits: number;
  grandTotal: number;
  onOpenCheckout: () => void;
  disabled?: boolean;
}

export const MobileCartDock: React.FC<MobileCartDockProps> = ({
  itemsCount,
  totalUnits,
  grandTotal,
  onOpenCheckout,
  disabled = false,
}) => {
  const isCartEmpty = itemsCount === 0 || disabled;

  return (
    <div
      data-testid="mobile-cart-dock"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800 px-3.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-3 select-none backdrop-blur-md"
    >
      {/* Left: Summary Metrics */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <ShoppingBag className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          <span data-testid="mobile-cart-items-count">
            {totalUnits} unit{totalUnits !== 1 ? "s" : ""} ({itemsCount} item{itemsCount !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[11px] text-slate-500 font-medium">Total:</span>
          <span
            data-testid="mobile-cart-grand-total"
            className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight"
          >
            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Right: Checkout CTA */}
      <button
        type="button"
        data-testid="mobile-review-checkout-btn"
        disabled={isCartEmpty}
        onClick={onOpenCheckout}
        className={cn(
          "h-9 px-4 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer shrink-0",
          isCartEmpty
            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white active:scale-[0.98]"
        )}
      >
        <span>Review Cart & Checkout</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
