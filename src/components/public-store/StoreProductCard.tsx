import { StorefrontProduct } from "@/types/storefront";
import { Plus, Minus, Package, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreProductCardProps {
  product: StorefrontProduct;
  cartQuantity: number;
  onAddToCart: (p: StorefrontProduct) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onOpenDetails: (p: StorefrontProduct) => void;
  viewMode?: "grid" | "list";
  themeColor?: string;
}

export function StoreProductCard({
  product,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
  onOpenDetails,
  viewMode = "grid",
  themeColor = "#FF6A00",
}: StoreProductCardProps) {
  const isOutOfStock = product.current_stock <= 0;
  const hasDiscount = product.mrp > product.selling_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : 0;

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-3">
        {/* Thumbnail & Info */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenDetails(product)}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Package className="w-6 h-6 text-slate-400" />
            )}
            {product.is_featured && (
              <div className="absolute top-1 left-1 bg-amber-500 text-white p-0.5 rounded-full shadow-xs">
                <Star className="w-2.5 h-2.5 fill-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {product.brand && (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                {product.brand}
              </span>
            )}
            <h3 className="text-sm font-semibold text-slate-900 truncate">{product.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit: {product.unit || "PCS"}
              {isOutOfStock ? (
                <span className="text-rose-600 font-medium ml-2">• Out of Stock</span>
              ) : (
                <span className="text-emerald-600 font-medium ml-2">• In Stock</span>
              )}
            </p>

            {/* Price line */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-bold text-slate-900">
                ₹{product.selling_price}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xs text-slate-400 line-through">
                    ₹{product.mrp}
                  </span>
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-sm">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add / Quantity Button */}
        <div className="flex-shrink-0">
          {isOutOfStock ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-400 bg-slate-50 border-slate-200"
            >
              Unavailable
            </Button>
          ) : cartQuantity === 0 ? (
            <Button
              size="sm"
              onClick={() => onAddToCart(product)}
              className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition flex items-center gap-1"
              style={{ backgroundColor: themeColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </Button>
          ) : (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-xs shadow-2xs transition"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-slate-800">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                className="w-7 h-7 rounded-md text-white flex items-center justify-center font-bold text-xs shadow-2xs transition hover:opacity-95"
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid Mode (Card)
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:border-slate-300 shadow-2xs hover:shadow-md transition flex flex-col justify-between group">
      {/* Image & Badges */}
      <div
        className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer"
        onClick={() => onOpenDetails(product)}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
            <Package className="w-12 h-12 stroke-[1.2]" />
            <span className="text-[11px] font-medium text-slate-400 mt-1 uppercase">
              {product.category || "Item"}
            </span>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            {discountPercent}% OFF
          </div>
        )}

        {/* Featured star */}
        {product.is_featured && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full shadow-sm">
            <Star className="w-3 h-3 fill-current" />
          </div>
        )}

        {/* Stock overlay if out of stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between">
        <div className="cursor-pointer" onClick={() => onOpenDetails(product)}>
          {product.brand && (
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              {product.brand}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Unit: {product.unit || "PCS"}
          </p>
        </div>

        {/* Pricing & Add to Cart button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-bold text-slate-900 leading-none">
              ₹{product.selling_price}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-slate-400 line-through mt-0.5 leading-none">
                ₹{product.mrp}
              </div>
            )}
          </div>

          <div>
            {isOutOfStock ? (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-400 bg-slate-50 border-slate-200"
              >
                Sold Out
              </Button>
            ) : cartQuantity === 0 ? (
              <Button
                size="sm"
                onClick={() => onAddToCart(product)}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition flex items-center gap-1"
                style={{ backgroundColor: themeColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            ) : (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-xs shadow-2xs transition"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-bold text-xs text-slate-800">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                  className="w-7 h-7 rounded-md text-white flex items-center justify-center font-bold text-xs shadow-2xs transition hover:opacity-95"
                  style={{ backgroundColor: themeColor }}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
