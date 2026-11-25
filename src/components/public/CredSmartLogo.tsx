import React from "react";
import { cn } from "@/lib/utils";
import { useWhiteLabel } from "@/context/WhiteLabelContext";

interface CredSmartLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  showTagline?: boolean;
}

export function CredSmartShieldIcon({ size = 36, className }: { size?: number; className?: string }) {
  const { brand, isWhiteLabeled } = useWhiteLabel();
  const iconUrl = isWhiteLabeled
    ? brand.favicon_url || brand.logo_light_url || "/favicon.png"
    : "/favicon.png";

  if (isWhiteLabeled && !brand.favicon_url && !brand.logo_light_url) {
    return (
      <div
        className={cn("shrink-0 rounded-xl flex items-center justify-center text-white font-black shadow-sm select-none", className)}
        style={{ width: size, height: size, backgroundColor: brand.primary_color || "#2563EB", fontSize: Math.max(14, Math.round(size * 0.45)) }}
      >
        {(brand.brand_name || "B").charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={`${brand.brand_name} Logo`}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain drop-shadow-md select-none", className)}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

export function CredSmartImageLogo({
  height = 40,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const { brand, isWhiteLabeled } = useWhiteLabel();
  const src = isWhiteLabeled
    ? brand.logo_light_url || brand.favicon_url || "/logo-static.jpeg"
    : "/logo-static.jpeg";

  return (
    <img
      src={src}
      alt={isWhiteLabeled ? brand.brand_name : "CredSmart POS & Invoicing BillBook by CredAlert"}
      style={{ height: `${height}px` }}
      className={cn("w-auto object-contain select-none drop-shadow-sm", className)}
      loading="eager"
    />
  );
}

export function CredSmartLogo({
  className,
  size = "md",
  variant = "light",
  showTagline = true,
}: CredSmartLogoProps) {
  const { brand, isWhiteLabeled } = useWhiteLabel();

  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 60,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const isDark = variant === "dark";

  if (isWhiteLabeled) {
    const customLogo = isDark ? brand.logo_dark_url || brand.logo_light_url : brand.logo_light_url;
    if (customLogo && !showTagline) {
      return (
        <div className={cn("flex items-center gap-2.5 select-none", className)}>
          <img
            src={customLogo}
            alt={brand.brand_name}
            style={{ height: `${iconSizes[size]}px` }}
            className="w-auto max-w-[180px] object-contain select-none"
            loading="eager"
          />
        </div>
      );
    }

    return (
      <div className={cn("flex items-center gap-2.5 select-none", className)}>
        {customLogo ? (
          <img
            src={customLogo}
            alt={brand.brand_name}
            style={{ height: `${iconSizes[size]}px` }}
            className="w-auto max-w-[140px] object-contain shrink-0 select-none"
            loading="eager"
          />
        ) : (
          <CredSmartShieldIcon size={iconSizes[size]} />
        )}
        <div className="flex flex-col justify-center">
          <div className={cn("font-black tracking-tight leading-none flex items-center", textSizes[size])}>
            <span className={isDark ? "text-white" : "text-slate-900"}>{brand.brand_name}</span>
          </div>
          {showTagline && (brand.brand_tagline || brand.powered_by_text) && (
            <div className="flex flex-col mt-0.5">
              {brand.brand_tagline && (
                <span
                  className={cn(
                    "text-[11px] font-bold tracking-wider uppercase leading-tight font-mono",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}
                >
                  {brand.brand_tagline}
                </span>
              )}
              {(brand.powered_by_text || !brand.hide_platform_branding) && (
                <span
                  className={cn(
                    "text-[11px] font-semibold leading-tight flex items-center gap-0.5",
                    isDark ? "text-slate-300" : "text-slate-500"
                  )}
                >
                  by <span className="font-bold" style={{ color: brand.secondary_color || "#F97316" }}>{brand.powered_by_text || "CredAlert"}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <CredSmartShieldIcon size={iconSizes[size]} />
      <div className="flex flex-col justify-center">
        <div className={cn("font-black tracking-tight leading-none flex items-center", textSizes[size])}>
          <span className={isDark ? "text-white" : "text-[#0A1931]"}>Cred</span>
          <span className="text-[#FF5E00]">Smart</span>
        </div>
        {showTagline && (
          <div className="flex flex-col mt-0.5">
            <span className={cn(
              "text-[11px] sm:text-[11px] font-bold tracking-widest uppercase leading-tight font-mono",
              isDark ? "text-slate-400" : "text-[#0A1931]/80"
            )}>
              POS &amp; Invoicing BillBook
            </span>
            <span className={cn(
              "text-[11px] sm:text-[11px] font-semibold leading-tight flex items-center gap-0.5",
              isDark ? "text-slate-300" : "text-slate-600"
            )}>
              by <span className={cn("font-bold", isDark ? "text-white" : "text-[#0A1931]")}>Cred</span><span className="font-bold text-[#FF5E00]">Alert</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CredSmartLogo;
