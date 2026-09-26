import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Laptop,
  Zap,
  Printer,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlatform?: "android" | "desktop";
}

/**
 * QR Code graphic for Android App Direct Download
 */
function AndroidDownloadQrCode({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-3 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col items-center justify-center shrink-0",
        className
      )}
    >
      <div className="relative w-32 h-32 bg-slate-900 rounded-xl p-2 flex items-center justify-center overflow-hidden">
        {/* Stylized QR Code Pattern SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
          {/* Top-left position marker */}
          <rect x="5" y="5" width="26" height="26" rx="4" fill="white" />
          <rect x="9" y="9" width="18" height="18" rx="2" fill="#0F172A" />
          <rect x="13" y="13" width="10" height="10" rx="1" fill="#10B981" />

          {/* Top-right position marker */}
          <rect x="69" y="5" width="26" height="26" rx="4" fill="white" />
          <rect x="73" y="9" width="18" height="18" rx="2" fill="#0F172A" />
          <rect x="77" y="13" width="10" height="10" rx="1" fill="#10B981" />

          {/* Bottom-left position marker */}
          <rect x="5" y="69" width="26" height="26" rx="4" fill="white" />
          <rect x="9" y="73" width="18" height="18" rx="2" fill="#0F172A" />
          <rect x="13" y="77" width="10" height="10" rx="1" fill="#10B981" />

          {/* Data Modules */}
          <rect x="36" y="8" width="6" height="6" rx="1" fill="white" />
          <rect x="46" y="8" width="8" height="6" rx="1" fill="white" />
          <rect x="58" y="8" width="6" height="6" rx="1" fill="white" />
          <rect x="36" y="18" width="10" height="6" rx="1" fill="white" />
          <rect x="50" y="18" width="12" height="6" rx="1" fill="white" />

          {/* Center Brand Accent */}
          <rect x="40" y="40" width="20" height="20" rx="4" fill="#FF6A00" />
          <circle cx="50" cy="50" r="5" fill="white" />

          {/* Bottom Data Grid */}
          <rect x="36" y="72" width="8" height="8" rx="1" fill="white" />
          <rect x="48" y="72" width="6" height="6" rx="1" fill="white" />
          <rect x="58" y="72" width="10" height="6" rx="1" fill="white" />
          <rect x="72" y="42" width="6" height="12" rx="1" fill="white" />
          <rect x="82" y="42" width="8" height="6" rx="1" fill="white" />
          <rect x="72" y="58" width="18" height="6" rx="1" fill="white" />
          <rect x="72" y="68" width="6" height="12" rx="1" fill="white" />
          <rect x="82" y="68" width="8" height="6" rx="1" fill="white" />
          <rect x="82" y="78" width="8" height="12" rx="1" fill="white" />
        </svg>
      </div>
      <span className="text-[10px] font-bold text-slate-600 mt-2 text-center uppercase tracking-wider font-mono">
        Scan with Phone
      </span>
    </div>
  );
}

export function DownloadAppModal({
  open,
  onOpenChange,
  defaultPlatform = "android",
}: DownloadAppModalProps) {
  const [activeTab, setActiveTab] = useState<"android" | "desktop">(defaultPlatform);

  // Sync state if defaultPlatform changes
  React.useEffect(() => {
    setActiveTab(defaultPlatform);
  }, [defaultPlatform]);

  const handleDownloadAndroidApk = () => {
    const link = document.createElement("a");
    link.href = "./CredSmart-v1.1.4.apk";
    link.download = "CredSmart-POS-v1.1.4.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDesktopExe = () => {
    const link = document.createElement("a");
    link.href = "./CredSmart-Setup-1.1.4-x64.exe";
    link.download = "CredSmart-Setup-1.1.4-x64.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-3 border border-white/15">
              <Download className="w-3.5 h-3.5 text-blue-300" />
              <span>Official Native Client Downloads</span>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Download <span className="text-[#FF6A00]">CredSmart</span> Apps
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-1 max-w-lg">
              Install high-performance native apps for Android smartphones, tablets, and Windows PC. Fast, offline-ready, and 100% free.
            </DialogDescription>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-4 sm:p-6 pb-0">
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer",
                activeTab === "android"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Android Mobile &amp; Tablet</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono">
                APK
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer",
                activeTab === "desktop"
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Monitor className="w-4 h-4 text-blue-600" />
              <span>Windows PC Desktop</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono">
                64-bit EXE
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-7 pt-5">
          {activeTab === "android" ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Row: Direct Download CTA + QR Code */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <AndroidDownloadQrCode />

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 font-mono">
                      Android Native App
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-bold font-mono">
                      v1.1.4
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    CredSmart Mobile for Android
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Designed for fast counter checkout, camera barcode scanning, Bluetooth 58mm/80mm thermal receipt printing, and instant WhatsApp bill sharing.
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
                    <Button
                      onClick={handleDownloadAndroidApk}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Android APK (28 MB)</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Works 100% Offline with Auto-Sync</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bluetooth Thermal Printers (58mm/80mm)</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Camera Barcode &amp; QR Code Scanner</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified Safe &bull; Zero Adware</span>
                </div>
              </div>

              {/* Installation Notice */}
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Compatible with Android 8.0 and above. To install via APK, tap "Allow from this source" when prompted.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Desktop Showcase Box */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-blue-50/60 border border-blue-100">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                  <Monitor className="w-12 h-12" />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-blue-800 font-mono">
                      Windows Desktop Edition
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 text-xs font-bold font-mono">
                      v1.1.4 (x64)
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    CredSmart for Windows PC
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Built for high-volume retail billing counters, wholesale distribution desks, and super-fast keyboard-first cashiers. No internet delays.
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
                    <Button
                      onClick={handleDownloadDesktopExe}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download for Windows (.exe 45 MB)</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Ultra-Fast F1-F12 Keyboard POS Shortcuts</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Direct USB, LAN &amp; Virtual COM Printers</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <WifiOff className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Zero-Cloud Dependency Offline Mode</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Automatic Background Cloud Sync</span>
                </div>
              </div>

              {/* System Specs */}
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Supports Windows 10 &amp; Windows 11 (64-bit). One-click setup with automatic desktop shortcut.
              </p>
            </div>
          )}
        </div>

        {/* Footer Strip */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> 100% Free Forever &bull; Zero Paywalls
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-600 hover:text-slate-900"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DownloadAppModal;
