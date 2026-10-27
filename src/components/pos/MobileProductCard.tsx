import React from "react";
import { Plus, Minus, Tag } from "lucide-react";
import { Product } from "@/types/pos";
import { cn } from "@/lib/utils";

export interface MobileProductCardProps {
  product: Product;
  quantityInCart: number;
  onAdd: (product: Product) => void;
  onIncrement: (product: Product) => void;
  onDecrement: (product: Product) => void;
}

export const MobileProductCard: React.FC<MobileProductCardProps> = ({
  product,
  quantityInCart,
  onAdd,
  onIncrement,
  onDecrement,
}) => {
  // Extract primary batch or fallback tags
  const primaryBatch = product.batches?.[0];
  const tags = product.tags || {};
  
  const sellingPrice = Number(
    primaryBatch?.mrp ??
    tags.selling_price ??
    tags.sp ??
    tags.mrp ??
    100
  );

  const mrp = Number(
    tags.mrp ??
    primaryBatch?.mrp ??
    sellingPrice
  );

  const stock = Number(
    primaryBatch?.stock ??
    tags.stock ??
    tags.current_stock ??
    99
  );

  return (
    <div
      data-testid={`mobile-product-card-${product.id}`}
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
    >
      {/* Product Details (Left) */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <h4
            className="text-xs font-semibold text-slate-900 dark:text-white truncate"
            title={product.name}
          >
            {product.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {product.category && (
            <span className="truncate max-w-[100px] flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5 shrink-0 opacity-70" />
              <span>{product.category}</span>
            </span>
          )}

          {/* Stock Pill */}
          <span
            data-testid={`product-stock-${product.id}`}
            className={cn(
              "px-1.5 py-0.2 rounded text-[10.5px] font-medium border font-mono shrink-0",
              stock > 10
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800"
                : stock > 0
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800"
            )}
          >
            {stock > 0 ? `Stock: ${stock}` : "Out of Stock"}
          </span>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            ₹{sellingPrice.toFixed(2)}
          </span>
          {mrp > sellingPrice && (
            <span className="text-[11px] font-mono text-slate-400 line-through tabular-nums">
              ₹{mrp.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* 1-Tap Quantity Stepper / Add Button (Right) */}
      <div className="shrink-0 flex items-center">
        {quantityInCart === 0 ? (
          <button
            type="button"
            data-testid={`add-to-cart-${product.id}`}
            onClick={() => onAdd(product)}
            className="h-7.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        ) : (
          <div
            data-testid={`stepper-${product.id}`}
            className="h-7.5 flex items-center rounded-lg border border-blue-600 bg-blue-600 text-white shadow-2xs overflow-hidden"
          >
            <button
              type="button"
              data-testid={`decrement-${product.id}`}
              onClick={() => onDecrement(product)}
              className="w-7 h-7.5 flex items-center justify-center hover:bg-blue-700 active:bg-blue-800 text-white active:scale-95 transition-colors cursor-pointer"
              aria-label={`Decrease ${product.name} quantity`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span
              data-testid={`qty-count-${product.id}`}
              className="px-2 text-xs font-bold font-mono tabular-nums min-w-[22px] text-center text-white"
            >
              {quantityInCart}
            </span>
            <button
              type="button"
              data-testid={`increment-${product.id}`}
              onClick={() => onIncrement(product)}
              className="w-7 h-7.5 flex items-center justify-center hover:bg-blue-700 active:bg-blue-800 text-white active:scale-95 transition-colors cursor-pointer"
              aria-label={`Increase ${product.name} quantity`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
