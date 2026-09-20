import { useState } from "react";
import { StorefrontSettings } from "@/types/storefront";
import { Phone, MessageCircle, Share2, Check, MapPin, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StoreHeaderProps {
  store: StorefrontSettings;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  const [copied, setCopied] = useState(false);

  const cleanPhone = (store.contact_phone || store.whatsapp_number || "").replace(/[^0-9]/g, "");
  const whatsappNumber = (store.whatsapp_number || store.contact_phone || "").replace(/[^0-9]/g, "");
  const formattedWa = whatsappNumber.length === 10 ? `91${whatsappNumber}` : whatsappNumber;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: store.store_name,
          text: `Check out our digital catalogue at ${store.store_name}!`,
          url,
        });
        return;
      } catch { /* empty */ }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Store link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const accentColor = store.theme_color || "#FF6A00";

  return (
    <div className="w-full bg-white border-b border-slate-200">
      {/* Announcement Ticker */}
      {store.custom_announcement && (
        <div
          className="text-white text-xs sm:text-sm font-medium py-1.5 px-4 text-center flex items-center justify-center gap-1.5 shadow-inner"
          style={{ backgroundColor: accentColor }}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{store.custom_announcement}</span>
        </div>
      )}

      {/* Banner / Header Backdrop */}
      <div
        className="h-28 sm:h-36 w-full relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"
        style={{
          backgroundImage: store.banner_url ? `url(${store.banner_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        
        {/* Quick Share Button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleShare}
            className="bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md rounded-full text-xs font-semibold px-3 py-1.5 shadow-md flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Share Store"}</span>
          </Button>
        </div>
      </div>

      {/* Store Identity & Actions Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-14 pb-4 gap-4">
          {/* Logo & Store Title */}
          <div className="flex items-start sm:items-end gap-3.5 sm:gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-4 border-white shadow-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-2xl sm:text-3xl font-bold uppercase tracking-wider"
                  style={{ color: accentColor }}
                >
                  {store.store_name.slice(0, 2) || "CS"}
                </span>
              )}
            </div>

            <div className="pt-2 sm:pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {store.store_name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Store
                </span>
              </div>

              {store.tagline && (
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-md font-medium">
                  {store.tagline}
                </p>
              )}

              {/* Address / Location */}
              {store.address && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate max-w-xs sm:max-w-md">{store.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons (Call / WhatsApp) */}
          <div className="flex items-center gap-2 sm:gap-2.5 self-stretch sm:self-auto pt-2 sm:pt-0">
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="flex-1 sm:flex-initial"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-9 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Call Store</span>
                </Button>
              </a>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${formattedWa}?text=${encodeURIComponent(`Namaste! I am visiting your online catalogue at ${store.store_name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial"
              >
                <Button
                  size="sm"
                  className="w-full sm:w-auto h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Operating status & badges */}
        <div className="flex items-center gap-4 py-2 border-t border-slate-100 text-xs text-slate-500 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-700">Open for Orders</span>
          </div>

          {store.enable_home_delivery && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span>🛵</span>
              <span>Home Delivery Available</span>
            </div>
          )}

          {store.enable_store_pickup && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span>🏪</span>
              <span>Store Pickup Available</span>
            </div>
          )}

          {store.free_delivery_above && store.free_delivery_above > 0 ? (
            <div className="flex items-center gap-1 flex-shrink-0 text-amber-600 font-medium">
              <span>⚡</span>
              <span>Free Delivery above ₹{store.free_delivery_above}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
