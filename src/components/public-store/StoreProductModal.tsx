import { StorefrontProduct, StorefrontSettings } from "@/types/storefront";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, MessageCircle, Plus, Minus, Check, Star } from "lucide-react";

interface StoreProductModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  cartQuantity: number;
  onAddToCart: (p: StorefrontProduct) => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  store: StorefrontSettings;
}

export function StoreProductModal({
  product,
  isOpen,
  onClose,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
  store,
}: StoreProductModalProps) {
  if (!product) return null;

  const isOutOfStock = product.current_stock <= 0;
  const hasDiscount = product.mrp > product.selling_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
    : 0;

  const accentColor = store.theme_color || "#FF6A00";
  const whatsappNumber = (store.whatsapp_number || store.contact_phone || "").replace(/[^0-9]/g, "");
  const formattedWa = whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber;

  const handleInquireOnWhatsApp = () => {
    const text = `Namaste! I am interested in *${product.name}* (Price: ₹${product.selling_price}). Is this item currently available?`;
    window.open(`https://wa.me/${formattedWa}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border-slate-200">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Product details and ordering</DialogDescription>
        </DialogHeader>

        {/* Product Image */}
        <div className="relative w-full aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Package className="w-16 h-16 stroke-[1.2]" />
              <span className="text-xs font-semibold uppercase text-slate-400 mt-2">
                {product.category || "Product"}
              </span>
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md">
              Save {discountPercent}%
            </div>
          )}

          {product.is_featured && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              <span>Featured</span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            {product.brand && (
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                {product.brand}
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>Category: <strong className="text-slate-700">{product.category || "General"}</strong></span>
              <span>•</span>
              <span>Unit: <strong className="text-slate-700">{product.unit || "PCS"}</strong></span>
              <span>•</span>
              {isOutOfStock ? (
                <span className="text-rose-600 font-semibold">Out of Stock</span>
              ) : (
                <span className="text-emerald-600 font-semibold">In Stock</span>
              )}
            </div>

            {product.barcode && (
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                Barcode: {product.barcode}
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block">Selling Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  ₹{product.selling_price}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{product.mrp}
                  </span>
                )}
              </div>
            </div>

            {hasDiscount && (
              <div className="text-right">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  You Save ₹{product.mrp - product.selling_price}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isOutOfStock ? (
              <Button
                disabled
                className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-semibold text-sm"
              >
                Currently Unavailable
              </Button>
            ) : cartQuantity === 0 ? (
              <Button
                onClick={() => onAddToCart(product)}
                className="flex-1 h-11 rounded-xl font-bold text-sm text-white shadow-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-between bg-slate-100 rounded-xl p-1 border border-slate-200 h-11">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="w-9 h-9 rounded-lg bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-sm shadow-2xs transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm text-slate-900">
                  {cartQuantity} in Bag
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                  className="w-9 h-9 rounded-lg text-white flex items-center justify-center font-bold text-sm shadow-2xs transition hover:opacity-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {whatsappNumber && (
              <Button
                variant="outline"
                onClick={handleInquireOnWhatsApp}
                className="h-11 px-3.5 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs flex items-center gap-1.5 flex-shrink-0"
                title="Inquire on WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Inquire</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
