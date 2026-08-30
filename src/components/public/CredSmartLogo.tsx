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
    <img
      src="/favicon.png"
      alt="CredSmart Shield Logo"
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
  return (
    <img
      src="/logo-static.jpeg"
      alt="CredSmart POS & Invoicing BillBook by CredAlert"
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
              "text-[8px] sm:text-[9px] font-bold tracking-widest uppercase leading-tight font-mono",
              isDark ? "text-slate-400" : "text-[#0A1931]/80"
            )}>
              POS &amp; Invoicing BillBook
            </span>
            <span className={cn(
              "text-[9px] sm:text-[10px] font-semibold leading-tight flex items-center gap-0.5",
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
