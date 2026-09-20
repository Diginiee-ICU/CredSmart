import { useState } from "react";
import { StorefrontSettings } from "@/types/storefront";
import { Smartphone, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorefrontMobilePreviewProps {
  store: StorefrontSettings;
}

export function StorefrontMobilePreview({ store }: StorefrontMobilePreviewProps) {
  const [key, setKey] = useState(0);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pos.credalert.bussiness";
  const previewUrl = `${baseUrl}/store/${store.slug}?preview=1`;

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Device Toolbar */}
      <div className="flex items-center justify-between w-full max-w-sm mb-3 px-1">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Mobile Simulator</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900"
            onClick={handleRefresh}
            title="Reload simulator"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900"
              title="Open full page in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Phone Mockup Frame */}
      <div className="relative w-[340px] h-[680px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-black/20 overflow-hidden flex flex-col">
        {/* Notch / Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 mr-4" />
          <div className="w-2 h-2 rounded-full bg-blue-900/60" />
        </div>

        {/* Screen Iframe */}
        <div className="w-full h-full rounded-[34px] overflow-hidden bg-white z-10 relative">
          <iframe
            key={key}
            src={previewUrl}
            title="Storefront Mobile Live Preview"
            className="w-full h-full border-none select-none"
          />
        </div>

        {/* Home Indicator bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full z-20" />
      </div>
    </div>
  );
}
