import { useState } from "react";
import { StorefrontCartItem, StorefrontSettings } from "@/types/storefront";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  Truck,
  Store,
  Sparkles,
  QrCode,
  Check,
  CreditCard,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface StoreCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: StorefrontCartItem[];
  cartSubtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: (details: {
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    deliveryType: "home_delivery" | "store_pickup";
    notes?: string;
  }) => Promise<{ success: boolean; whatsappUrl?: string }>;
  isSubmitting: boolean;
  store: StorefrontSettings;
}

export function StoreCartDrawer({
  isOpen,
  onClose,
  cart,
  cartSubtotal,
  deliveryCharge,
  grandTotal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isSubmitting,
  store,
}: StoreCartDrawerProps) {
  const [deliveryType, setDeliveryType] = useState<"home_delivery" | "store_pickup">(
    store.enable_home_delivery ? "home_delivery" : "store_pickup"
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showUpiModal, setShowUpiModal] = useState(false);

  const freeDeliveryThreshold = store.free_delivery_above || 0;
  const remainingForFree =
    freeDeliveryThreshold > 0 && cartSubtotal < freeDeliveryThreshold
      ? freeDeliveryThreshold - cartSubtotal
      : 0;

  const freeDeliveryProgress =
    freeDeliveryThreshold > 0
      ? Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100))
      : 100;

  const finalTotal = deliveryType === "store_pickup" ? cartSubtotal : grandTotal;
  const finalDeliveryCharge = deliveryType === "store_pickup" ? 0 : deliveryCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    if (deliveryType === "home_delivery" && !customerAddress.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }

    await onCheckout({
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerAddress: deliveryType === "home_delivery" ? customerAddress.trim() : undefined,
      deliveryType,
      notes: orderNotes.trim() || undefined,
    });
  };

  const upiPayUri = store.upi_id
    ? `upi://pay?pa=${store.upi_id}&pn=${encodeURIComponent(store.store_name)}&am=${finalTotal}&cu=INR`
    : "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col justify-between bg-slate-50 border-l border-slate-200"
      >
        <SheetHeader className="p-4 sm:p-5 bg-white border-b border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: store.theme_color || "#FF6A00" }}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                  Shopping Bag
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-1">
                  {cart.length} unique {cart.length === 1 ? "item" : "items"}
                </SheetDescription>
              </div>
            </div>

            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCart}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
              >
                Clear Bag
              </Button>
            )}
          </div>

          {/* Free delivery progress bar */}
          {deliveryType === "home_delivery" && freeDeliveryThreshold > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                {remainingForFree > 0 ? (
                  <span className="text-slate-600">
                    Add <strong className="text-emerald-700 font-bold">₹{remainingForFree}</strong> more for{" "}
                    <span className="text-emerald-700 font-bold">FREE Delivery</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    You unlocked FREE Delivery!
                  </span>
                )}
                <span className="text-slate-400 text-[11px]">{freeDeliveryProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <ShoppingBag className="w-14 h-14 stroke-[1.2] mb-3 text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700">Your bag is empty</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Explore our catalog and add your favourite items to place an order.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="mt-4 rounded-xl text-xs font-semibold"
              >
                Start Browsing
              </Button>
            </div>
          ) : (
            <>
              {/* Itemized list */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Order Items
                </h4>

                <div className="flex flex-col divide-y divide-slate-100">
                  {cart.map(({ product, quantity }) => (
                    <div key={product.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                          {product.name}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ₹{product.selling_price} × {quantity} ={" "}
                          <strong className="text-slate-900">
                            ₹{product.selling_price * quantity}
                          </strong>
                        </p>
                      </div>

                      {/* Quantity modifier */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          className="w-6 h-6 rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-xs shadow-2xs transition"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-slate-800">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          className="w-6 h-6 rounded-md text-white flex items-center justify-center font-bold text-xs shadow-2xs transition hover:opacity-95"
                          style={{ backgroundColor: store.theme_color || "#FF6A00" }}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 flex-shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery options toggle */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Fulfillment Method
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {store.enable_home_delivery && (
                    <button
                      type="button"
                      onClick={() => setDeliveryType("home_delivery")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        deliveryType === "home_delivery"
                          ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold"
                          : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Truck className={`w-4 h-4 ${deliveryType === "home_delivery" ? "text-blue-600" : "text-slate-400"}`} />
                      <div>
                        <span className="text-xs block">Home Delivery</span>
                        <span className="text-[10px] text-slate-400 block">
                          {finalDeliveryCharge === 0 ? "FREE" : `₹${store.delivery_charges}`}
                        </span>
                      </div>
                    </button>
                  )}

                  {store.enable_store_pickup && (
                    <button
                      type="button"
                      onClick={() => setDeliveryType("store_pickup")}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        deliveryType === "store_pickup"
                          ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold"
                          : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Store className={`w-4 h-4 ${deliveryType === "store_pickup" ? "text-blue-600" : "text-slate-400"}`} />
                      <div>
                        <span className="text-xs block">Store Pickup</span>
                        <span className="text-[10px] text-slate-400 block">Self Collect</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Contact & Address Form */}
              <form id="storefront-order-form" onSubmit={handleSubmit} className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contact & Details
                </h4>

                <div className="flex flex-col gap-2.5">
                  <div>
                    <Label htmlFor="cust-name" className="text-xs font-medium text-slate-700">
                      Your Full Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="cust-name"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-9 rounded-xl border-slate-200 text-xs mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="cust-phone" className="text-xs font-medium text-slate-700">
                      WhatsApp Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-2 rounded-xl border border-slate-200">
                        +91
                      </span>
                      <Input
                        id="cust-phone"
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-9 rounded-xl border-slate-200 text-xs flex-1"
                        required
                      />
                    </div>
                  </div>

                  {deliveryType === "home_delivery" && (
                    <div>
                      <Label htmlFor="cust-addr" className="text-xs font-medium text-slate-700">
                        Delivery Address <span className="text-rose-500">*</span>
                      </Label>
                      <Textarea
                        id="cust-addr"
                        rows={2}
                        placeholder="House / Flat No, Street, Landmark, Pincode"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="rounded-xl border-slate-200 text-xs mt-1 resize-none"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="cust-notes" className="text-xs font-medium text-slate-700">
                      Order Instructions / Notes (Optional)
                    </Label>
                    <Input
                      id="cust-notes"
                      placeholder="e.g. Ring doorbell, deliver before 6 PM"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="h-9 rounded-xl border-slate-200 text-xs mt-1"
                    />
                  </div>
                </div>
              </form>

              {/* Price Breakdown Box */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-900">₹{cartSubtotal}</span>
                </div>

                {deliveryType === "home_delivery" && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charge</span>
                    <span className="font-semibold text-slate-900">
                      {finalDeliveryCharge === 0 ? (
                        <span className="text-emerald-600 font-bold">FREE</span>
                      ) : (
                        `₹${finalDeliveryCharge}`
                      )}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline text-sm font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-base text-slate-950">₹{finalTotal}</span>
                </div>
              </div>

              {/* UPI QR Payment Option */}
              {store.upi_id && (
                <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        Pay via UPI (GPay / PhonePe)
                      </span>
                      <span className="text-[11px] text-emerald-700 block font-mono">
                        {store.upi_id}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUpiModal(true)}
                    className="h-8 rounded-lg border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Checkout CTA */}
        {cart.length > 0 && (
          <SheetFooter className="p-4 bg-white border-t border-slate-200 sm:flex-col gap-2">
            <Button
              type="submit"
              form="storefront-order-form"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:opacity-95 transition"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>{isSubmitting ? "Processing..." : "Place Order on WhatsApp 💬"}</span>
            </Button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Direct checkout with store owner • No registration required
            </p>
          </SheetFooter>
        )}

        {/* UPI QR Modal */}
        {showUpiModal && store.upi_id && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl flex flex-col items-center gap-3">
              <h3 className="font-bold text-base text-slate-900">Scan to Pay via UPI</h3>
              <p className="text-xs text-slate-500 text-center">
                Pay ₹{finalTotal} to <strong>{store.store_name}</strong>
              </p>

              <div className="p-3 bg-white border-2 border-slate-100 rounded-xl shadow-inner">
                <QRCodeSVG value={upiPayUri || `upi://pay?pa=${store.upi_id}&pn=${encodeURIComponent(store.store_name)}`} size={180} />
              </div>

              <div className="text-center">
                <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                  UPI ID
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md block mt-0.5">
                  {store.upi_id}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpiModal(false)}
                className="w-full mt-2 rounded-xl text-xs font-semibold"
              >
                Close QR Code
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
