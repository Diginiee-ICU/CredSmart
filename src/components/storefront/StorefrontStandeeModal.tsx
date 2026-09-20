import { useRef } from "react";
import { StorefrontSettings } from "@/types/storefront";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Store, QrCode, Sparkles, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface StorefrontStandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StorefrontSettings;
}

export function StorefrontStandeeModal({
  isOpen,
  onClose,
  store,
}: StorefrontStandeeModalProps) {
  const standeeRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const shortUrl = `${baseUrl}/c/${store.slug}`;
  const displayUrl = `pos.credalert.bussiness/c/${store.slug}`;
  const accentColor = store.theme_color || "#FF6A00";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-3xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-white">
              Counter QR Standee Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              Print this standee and place it on your shop counter or billing desk.
            </DialogDescription>
          </div>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Standee</span>
          </Button>
        </DialogHeader>

        {/* Standee Canvas Preview */}
        <div className="p-4 sm:p-6 bg-slate-950 flex justify-center items-center overflow-y-auto max-h-[75vh]">
          <div
            id="credsmart-printable-standee"
            ref={standeeRef}
            className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-slate-100 flex flex-col items-center text-center relative overflow-hidden print:w-[148mm] print:h-[210mm] print:border-none print:shadow-none print:p-8"
          >
            {/* Top Brand Banner */}
            <div
              className="absolute top-0 left-0 right-0 h-3"
              style={{ backgroundColor: accentColor }}
            />

            {/* Store Crest & Name */}
            <div className="flex flex-col items-center mt-2 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm overflow-hidden flex items-center justify-center mb-2.5">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-8 h-8" style={{ color: accentColor }} />
                )}
              </div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {store.store_name}
              </h2>
              {store.tagline && (
                <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-xs line-clamp-1">
                  {store.tagline}
                </p>
              )}
            </div>

            {/* Call To Action Banner */}
            <div
              className="w-full py-2 px-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider mb-4 shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              Scan to Browse Catalog & Order
            </div>

            {/* High-Resolution QR Code */}
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md mb-4 flex flex-col items-center">
              <QRCodeSVG
                value={shortUrl}
                size={190}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* URL Link Subtext */}
            <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mb-4 select-all">
              {displayUrl}
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-semibold">
              <div className="flex flex-col items-center">
                <span>📱</span>
                <span>Live Prices</span>
              </div>
              <div className="flex flex-col items-center">
                <span>⚡</span>
                <span>Instant Stock</span>
              </div>
              <div className="flex flex-col items-center">
                <span>💬</span>
                <span>WhatsApp Order</span>
              </div>
            </div>

            {/* UPI info badge */}
            {store.upi_id && (
              <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <span>💳 UPI Accepted:</span>
                <span className="font-mono font-bold text-slate-800">{store.upi_id}</span>
              </div>
            )}

            {/* Footer Watermark */}
            <div className="mt-4 pt-2 text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <span>Powered by CredSmart</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
