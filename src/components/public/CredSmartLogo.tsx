import React from "react";
import { cn } from "@/lib/utils";

interface CredSmartLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  showTagline?: boolean;
}

export function CredSmartShieldIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-md", className)}
    >
      <defs>
        {/* Outer Shield Gradient */}
        <linearGradient id="shieldBorderGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A8A" />
          <stop offset="0.5" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>

        {/* Shield Body Blue */}
        <linearGradient id="shieldBodyGrad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="0.6" stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>

        {/* Dynamic Orange Slash */}
        <linearGradient id="shieldOrangeGrad" x1="16" y1="12" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A00" />
          <stop offset="0.7" stopColor="#FF5500" />
          <stop offset="1" stopColor="#DC2626" />
        </linearGradient>

        {/* Gold Highlight Accent */}
        <linearGradient id="shieldGoldGrad" x1="18" y1="10" x2="30" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>

        {/* Soft Drop Shadow Filter */}
        <filter id="shieldGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Outer Border Crest */}
      <path
        d="M24 4L8 10V22C8 32.5 14.8 41.8 24 44C33.2 41.8 40 32.5 40 22V10L24 4Z"
        fill="url(#shieldBorderGrad)"
      />

      {/* Inner Shield Body */}
      <path
        d="M24 6.5L10.5 11.5V21.5C10.5 30.5 16.3 38.8 24 41C31.7 38.8 37.5 30.5 37.5 21.5V11.5L24 6.5Z"
        fill="url(#shieldBodyGrad)"
      />

      {/* Dynamic Geometric Brand Facets (CredAlert Emblem) */}
      <path
        d="M24 7L36 12V21C36 29 31 36.5 24 39.5V7Z"
        fill="white"
        fillOpacity="0.1"
      />
      <path
        d="M13 14L24 23L35 14L24 8L13 14Z"
        fill="url(#shieldGoldGrad)"
        fillOpacity="0.85"
      />
      <path
        d="M17 21L24 28L31 21L24 16L17 21Z"
        fill="url(#shieldOrangeGrad)"
      />
      <path
        d="M20 28L24 34L28 28L24 24L20 28Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
    </svg>
  );
}

export function CredSmartLogo({
  className,
  size = "md",
  variant = "light",
  showTagline = true,
}: CredSmartLogoProps) {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 52,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const isDark = variant === "dark";

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <CredSmartShieldIcon size={iconSizes[size]} />
      <div className="flex flex-col">
        <div className={cn("font-extrabold tracking-tight leading-none flex items-center", textSizes[size])}>
          <span className={isDark ? "text-white" : "text-[#0F172A]"}>Cred</span>
          <span className="text-[#FF6A00]">Smart</span>
        </div>
        {showTagline && (
          <span className={cn(
            "text-[10px] tracking-normal font-medium leading-tight mt-0.5",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>
            by CredAlert
          </span>
        )}
      </div>
    </div>
  );
}

export default CredSmartLogo;
