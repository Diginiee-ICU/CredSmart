import React from "react";
import { Download, Monitor, Smartphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppDownloadButtonsProps {
  onSelectPlatform?: (platform: "android" | "desktop") => void;
  className?: string;
  variant?: "hero" | "compact" | "banner";
  align?: "left" | "center" | "right";
}

/**
 * Custom SVG for Android Robot
 */
function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-5 h-5", className)}
      aria-hidden="true"
    >
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.5516 0 .9998.4486.9998 1.0003s-.4482 1.0003-.9998 1.0003m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0003s.4482-1.0003.9993-1.0003c.5516 0 .9998.4486.9998 1.0003s-.4482 1.0003-.9998 1.0003m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5896 8.4116 13.8566 8.0833 12 8.0833c-1.8566 0-3.5896.3283-5.1368.8664L4.8409 5.4467a.4161.4161 0 00-.5676-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3333 14.8694.3333 19.1667h23.3334c0-4.2973-2.3556-7.98-5.7867-9.8453" />
    </svg>
  );
}

/**
 * Custom SVG for Windows 4-Pane Logo
 */
function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-5 h-5", className)}
      aria-hidden="true"
    >
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.401H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
    </svg>
  );
}

export function AppDownloadButtons({
  onSelectPlatform,
  className,
  variant = "hero",
  align = "center",
}: AppDownloadButtonsProps) {
  const handleAndroidClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelectPlatform) {
      onSelectPlatform("android");
    } else {
      // Direct trigger or fallback
      const link = document.createElement("a");
      link.href = "./CredSmart-v1.1.4.apk";
      link.download = "CredSmart-POS-v1.1.4.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDesktopClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelectPlatform) {
      onSelectPlatform("desktop");
    } else {
      // Direct trigger or fallback
      const link = document.createElement("a");
      link.href = "./CredSmart-Setup-1.1.4-x64.exe";
      link.download = "CredSmart-Setup-1.1.4-x64.exe";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const alignmentClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2.5", alignmentClasses[align], className)}>
        {/* 1. Android Download Button */}
        <button
          type="button"
          onClick={handleAndroidClick}
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-700/60 cursor-pointer"
        >
          <AndroidIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Android App</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
            APK
          </span>
        </button>

        {/* 2. Desktop Download Button */}
        <button
          type="button"
          onClick={handleDesktopClick}
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 border border-slate-700/60 cursor-pointer"
        >
          <WindowsIcon className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Windows PC</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
            EXE
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto",
        alignmentClasses[align],
        className
      )}
    >
      {/* ── BUTTON 1: ANDROID DOWNLOAD BUTTON ── */}
      <button
        type="button"
        onClick={handleAndroidClick}
        className="group relative flex items-center gap-3.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer text-left overflow-hidden"
      >
        {/* Soft emerald hover glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Icon Circle */}
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
          <AndroidIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 font-mono">
              Get for Mobile
            </span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              v1.1.4
            </span>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
            Download for Android
          </span>
          <span className="text-[11px] text-slate-500">
            Direct APK &bull; Bluetooth Thermal POS
          </span>
        </div>

        <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 ml-auto shrink-0 transition-transform group-hover:translate-y-0.5" />
      </button>

      {/* ── BUTTON 2: DESKTOP DOWNLOAD BUTTON ── */}
      <button
        type="button"
        onClick={handleDesktopClick}
        className="group relative flex items-center gap-3.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-blue-600 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer text-left overflow-hidden"
      >
        {/* Soft blue hover glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Icon Circle */}
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
          <WindowsIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 font-mono">
              Get for PC
            </span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
              64-bit
            </span>
          </div>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
            Download for Desktop
          </span>
          <span className="text-[11px] text-slate-500">
            Windows 10/11 &bull; Fast Offline POS
          </span>
        </div>

        <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 ml-auto shrink-0 transition-transform group-hover:translate-y-0.5" />
      </button>
    </div>
  );
}

export default AppDownloadButtons;
