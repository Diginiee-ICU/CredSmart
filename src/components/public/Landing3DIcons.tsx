import React from "react";
import { cn } from "@/lib/utils";

/**
 * 3D Isometric Blue Folder & Cash Icon for "TO COLLECT"
 */
export function Collect3DIcon({ className }: { className?: string }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_8px_16px_rgba(37,99,235,0.25)]", className)}
    >
      <defs>
        <linearGradient id="folderBack" x1="10" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="folderFront" x1="8" y1="24" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="moneyGrad" x1="16" y1="14" x2="48" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="coinGrad" x1="40" y1="36" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      {/* Folder Back Tab */}
      <path d="M12 18C12 15.7909 13.7909 14 16 14H26L31 19H48C50.2091 19 52 20.7909 52 23V46C52 48.2091 50.2091 50 48 50H16C13.7909 50 12 48.2091 12 46V18Z" fill="url(#folderBack)" />
      {/* Floating Cash Document */}
      <path d="M20 12C20 10.8954 20.8954 10 22 10H42C43.1046 10 44 10.8954 44 12V32H20V12Z" fill="url(#moneyGrad)" opacity="0.9" />
      <path d="M24 16H40M24 21H36" stroke="#DBEAFE" strokeWidth="2" strokeLinecap="round" />
      {/* Folder Front Cover with 3D slant */}
      <path d="M10 26C10 24.3431 11.3431 23 13 23H51C52.6569 23 54 24.3431 54 26L50 50C50 51.6569 48.6569 53 47 53H17C15.3431 53 14 51.6569 14 50L10 26Z" fill="url(#folderFront)" />
      {/* 3D Gold Coin Accent */}
      <circle cx="46" cy="42" r="7" fill="url(#coinGrad)" stroke="#CA8A04" strokeWidth="1.5" />
      <text x="46" y="45.5" fill="#713F12" fontSize="9" fontWeight="bold" textAnchor="middle">₹</text>
    </svg>
  );
}

/**
 * 3D Isometric Orange Receipt Icon for "TO PAY"
 */
export function Pay3DIcon({ className }: { className?: string }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_8px_16px_rgba(249,115,22,0.25)]", className)}
    >
      <defs>
        <linearGradient id="receiptGrad" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="paperGrad" x1="20" y1="12" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF7ED" />
          <stop offset="1" stopColor="#FFEDD5" />
        </linearGradient>
      </defs>
      {/* 3D Base Card */}
      <rect x="14" y="10" width="36" height="46" rx="6" fill="url(#receiptGrad)" transform="rotate(-4 32 32)" />
      {/* Receipt Paper Overlay */}
      <path d="M19 14C19 12.8954 19.8954 12 21 12H43C44.1046 12 45 12.8954 45 14V48L42 46L39 48L36 46L33 48L30 46L27 48L24 46L21 48L19 46V14Z" fill="url(#paperGrad)" />
      {/* Receipt Lines */}
      <line x1="24" y1="18" x2="40" y2="18" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="24" x2="36" y2="24" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="29" x2="38" y2="29" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="34" x2="32" y2="34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="40" x2="40" y2="40" stroke="#EA580C" strokeWidth="2" strokeDasharray="2 2" />
    </svg>
  );
}

/**
 * 3D Isometric Gold Bank Icon for "CASH & BANK"
 */
export function Bank3DIcon({ className }: { className?: string }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-[0_8px_16px_rgba(234,179,8,0.3)]", className)}
    >
      <defs>
        <linearGradient id="goldGrad1" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.4" stopColor="#FACC15" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="goldGrad2" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      {/* Roof Pediment / Triangle */}
      <path d="M32 10L14 22H50L32 10Z" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="1" />
      {/* Roof Architrave beam */}
      <rect x="14" y="22" width="36" height="4" rx="1" fill="url(#goldGrad2)" stroke="#B45309" strokeWidth="0.8" />
      {/* 4 Classical Pillars */}
      <rect x="17" y="26" width="5" height="18" rx="1" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.8" />
      <rect x="25" y="26" width="5" height="18" rx="1" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.8" />
      <rect x="34" y="26" width="5" height="18" rx="1" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.8" />
      <rect x="42" y="26" width="5" height="18" rx="1" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.8" />
      {/* Base Steps */}
      <rect x="12" y="44" width="40" height="4" rx="1" fill="url(#goldGrad2)" stroke="#B45309" strokeWidth="0.8" />
      <rect x="9" y="48" width="46" height="5" rx="1.5" fill="url(#goldGrad1)" stroke="#B45309" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Large Glowing 3D Shield with Warning Alert for CredAlert Intelligence Bento Card
 */
export function CredAlertShield3D({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* Soft Ambient Radial Glow Behind */}
      <div className="absolute w-56 h-56 rounded-full bg-blue-500/15 blur-3xl -z-10 animate-pulse" />

      <svg
        width="190"
        height="220"
        viewBox="0 0 190 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_20px_40px_rgba(29,78,216,0.35)] transition-transform duration-500 hover:scale-105"
      >
        <defs>
          {/* Outer Shield Bezel Metallic Blue */}
          <linearGradient id="shield3DOuter" x1="20" y1="10" x2="170" y2="210" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="0.3" stopColor="#1D4ED8" />
            <stop offset="0.8" stopColor="#1E3A8A" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>

          {/* Inner Shield Cavity Gradient */}
          <linearGradient id="shield3DInner" x1="35" y1="25" x2="155" y2="195" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E40AF" />
            <stop offset="0.5" stopColor="#1E3A8A" />
            <stop offset="1" stopColor="#0B132B" />
          </linearGradient>

          {/* Glossy Top Reflection */}
          <linearGradient id="shieldGloss" x1="95" y1="20" x2="95" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Vibrant Orange Warning Triangle */}
          <linearGradient id="triangleGrad" x1="60" y1="75" x2="130" y2="155" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF7A00" />
            <stop offset="0.6" stopColor="#FF5500" />
            <stop offset="1" stopColor="#EA580C" />
          </linearGradient>

          {/* Drop Shadow for Warning Sign */}
          <filter id="warnGlow" x="40" y="60" width="110" height="110" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#FF6A00" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Outer Metallic Shield Hull */}
        <path
          d="M95 12L24 38V98C24 148 54 192 95 208C136 192 166 148 166 98V38L95 12Z"
          fill="url(#shield3DOuter)"
          stroke="#60A5FA"
          strokeWidth="3"
        />

        {/* Inner Recessed Core */}
        <path
          d="M95 24L36 46V98C36 139 61 176 95 190C129 176 154 139 154 98V46L95 24Z"
          fill="url(#shield3DInner)"
        />

        {/* Curved Glass Highlight on Top Left */}
        <path
          d="M95 24L36 46V98C36 115 42 131 52 145C68 115 95 70 148 55V46L95 24Z"
          fill="url(#shieldGloss)"
        />

        {/* Floating Glowing Warning Triangle Symbol */}
        <g filter="url(#warnGlow)">
          <path
            d="M95 72C97.5 67.5 104 67.5 106.5 72L138.5 127C141 131.5 137.8 137 132.5 137H69C63.7 137 60.5 131.5 63 127L95 72Z"
            fill="url(#triangleGrad)"
            stroke="#FED7AA"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Exclamation Mark */}
          <rect x="98.5" y="88" width="5" height="24" rx="2.5" fill="#FFFFFF" />
          <circle cx="101" cy="122" r="3.2" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
