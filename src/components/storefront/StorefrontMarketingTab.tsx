import { useState } from "react";
import { StorefrontSettings } from "@/types/storefront";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Printer,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Instagram,
  MapPin,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { buildWhatsAppPromoMessage } from "@/services/storefrontService";

interface StorefrontMarketingTabProps {
  store: StorefrontSettings;
  onOpenStandeeModal: () => void;
}

export function StorefrontMarketingTab({
  store,
  onOpenStandeeModal,
}: StorefrontMarketingTabProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const storeUrl = `${baseUrl}/store/${store.slug}`;
  const shortUrl = `${baseUrl}/c/${store.slug}`;

  const promoTemplates = [
    {
      id: "general",
      title: "Storefront Launch Announcement",
      description: "Introduce your digital catalogue to existing customers on WhatsApp.",
      text: buildWhatsAppPromoMessage(store),
    },
    {
      id: "weekend",
      title: "Weekend Specials & Discounts",
      description: "Great for Friday/Saturday broadcasts to drive weekend sales.",
      text: `🎉 *WEEKEND SPECIAL OFFERS at ${store.store_name}!* 🎉

Stock up on your essentials with best prices & quick home delivery.

🛒 *Explore our digital catalogue & order now:*
${storeUrl}

✨ Limited stocks available. Order early on WhatsApp!`,
    },
    {
      id: "new_arrivals",
      title: "New Fresh Arrivals Announcement",
      description: "Notify regular buyers when fresh stock arrives.",
      text: `📦 *FRESH STOCK JUST ARRIVED at ${store.store_name}!* 📦

We have just restocked fresh products, groceries, and daily essentials.

👉 *Check out new items & prices:*
${storeUrl}

📱 Simple 1-tap WhatsApp ordering with prompt delivery!`,
    },
  ];

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromo(id);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopiedPromo(null), 2000);
    } catch {
      toast.error("Could not copy text.");
    }
  };

  const handleSendWhatsAppBroadcast = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* 1. Counter Standee Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 flex-1">
          {/* Mini Standee QR Card Preview */}
          <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-inner flex flex-col items-center flex-shrink-0">
            <QRCodeSVG value={shortUrl} size={110} />
            <span className="text-[11px] font-mono text-slate-500 font-bold mt-2">
              /c/{store.slug}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
              Physical Shop Marketing
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              Counter QR Standee (A4 / A5)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
              Place this branded standee on your shop counter, billing desk, or front window. Customers can scan the QR code to browse your full catalogue and order on WhatsApp!
            </p>

            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={onOpenStandeeModal}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Open Standee & Print</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Direct Sharing & Bio Links */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Social Bio Links & Direct Sharing
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add your storefront link to your Instagram bio, Google Business profile, or business cards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-bold text-slate-800">Instagram Bio Link</span>
              </div>
              <span className="text-xs text-slate-500 font-mono block truncate mt-1">
                {storeUrl}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("Copied Instagram bio link!");
              }}
              className="h-8 text-xs rounded-lg border-slate-200"
            >
              <Copy className="w-3 h-3 mr-1" />
              <span>Copy</span>
            </Button>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Google Business Website Link</span>
              </div>
              <span className="text-xs text-slate-500 font-mono block truncate mt-1">
                {storeUrl}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                toast.success("Copied Google Business link!");
              }}
              className="h-8 text-xs rounded-lg border-slate-200"
            >
              <Copy className="w-3 h-3 mr-1" />
              <span>Copy</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. WhatsApp Promotional Message Templates */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              WhatsApp Broadcast Messages
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Send these pre-formatted promotional messages to your customer contact list or WhatsApp broadcast groups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promoTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex flex-col justify-between gap-3"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900">{tpl.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>
                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line font-sans line-clamp-6 leading-relaxed">
                  {tpl.text}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(tpl.text, tpl.id)}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold border-slate-200"
                >
                  {copiedPromo === tpl.id ? (
                    <Check className="w-3 h-3 text-emerald-600 mr-1" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  <span>{copiedPromo === tpl.id ? "Copied" : "Copy"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSendWhatsAppBroadcast(tpl.text)}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  <span>Broadcast</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
