import React from "react";

/**
 * CREDSMART Shield Logo matching reference UI images
 */
export const CredsmartLogo: React.FC<{ className?: string; size?: number; showSubtitle?: boolean }> = ({
  className = "",
  size = 38,
  showSubtitle = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative shrink-0" style={{ width: size, height: size * 1.15 }}>
        <svg
          viewBox="0 0 100 115"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
        >
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="shieldInner" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.9" />
            </linearGradient>
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#EA580C" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Shield Outer Outline */}
          <path
            d="M50 4L88 18V56C88 82 50 108 50 108C50 108 12 82 12 56V18L50 4Z"
            fill="url(#shieldGrad)"
            stroke="#93C5FD"
            strokeWidth="3"
          />

          {/* Shield Inner Light Surface */}
          <path
            d="M50 12L80 23V54C80 75 50 96 50 96C50 96 20 75 20 54V23L50 12Z"
            fill="url(#shieldInner)"
          />

          {/* 3 Horizontal Checklist / Bill lines */}
          <rect x="32" y="32" width="36" height="5" rx="2.5" fill="#2563EB" />
          <rect x="32" y="42" width="28" height="5" rx="2.5" fill="#3B82F6" />
          <rect x="32" y="52" width="22" height="5" rx="2.5" fill="#60A5FA" />

          {/* Orange Checkmark Badge on bottom left */}
          <circle
            cx="26"
            cy="78"
            r="16"
            fill="url(#badgeGrad)"
            stroke="#FFFFFF"
            strokeWidth="3"
            filter="url(#badgeShadow)"
          />
          <path
            d="M20 78L24.5 82.5L32 73.5"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1">
          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white leading-none font-sans">
            CREDSMART
          </span>
        </div>
        {showSubtitle && (
          <>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase font-mono mt-0.5 leading-none">
              POS &amp; INVOICING BILLBOOK
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-tight mt-0.5">
              by <span className="font-semibold text-orange-500">CredAlert</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * 3D Glowing Digital Blue Wallet on Glass Pedestal (for TO COLLECT)
 */
export const Wallet3DGraphic: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(14,165,233,0.35)]"
      >
        <defs>
          {/* Glass Pedestal Gradient */}
          <linearGradient id="pedestalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0284C7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0.3" />
          </linearGradient>

          {/* 3D Wallet Front Gradient */}
          <linearGradient id="walletFront" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="40%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>

          {/* 3D Wallet Flap Gradient */}
          <linearGradient id="walletFlap" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Ambient Glow Filter */}
          <filter id="blueGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Neon Glow underneath */}
        <ellipse cx="80" cy="115" rx="55" ry="16" fill="#0EA5E9" opacity="0.35" filter="url(#blueGlow)" />

        {/* Glass Pedestal Base (Isometric Diamond) */}
        <polygon
          points="80,95 138,112 80,128 22,112"
          fill="url(#pedestalGrad)"
          stroke="#7DD3FC"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        <polygon
          points="80,99 130,114 80,125 30,114"
          fill="#0284C7"
          fillOpacity="0.25"
        />

        {/* 3D Isometric Wallet */}
        {/* Wallet Back Rim */}
        <rect
          x="36"
          y="28"
          width="74"
          height="54"
          rx="12"
          transform="matrix(0.92 -0.22 0.32 0.94 0 0)"
          fill="#0369A1"
        />

        {/* Inner Card Peeking Out */}
        <rect
          x="44"
          y="22"
          width="62"
          height="40"
          rx="6"
          transform="matrix(0.92 -0.22 0.32 0.94 0 0)"
          fill="#E0F2FE"
          stroke="#38BDF8"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <rect
          x="50"
          y="32"
          width="35"
          height="4"
          rx="2"
          transform="matrix(0.92 -0.22 0.32 0.94 0 0)"
          fill="#0284C7"
        />

        {/* Wallet Main Body */}
        <rect
          x="38"
          y="36"
          width="74"
          height="56"
          rx="12"
          transform="matrix(0.92 -0.22 0.32 0.94 0 0)"
          fill="url(#walletFront)"
          stroke="#BAE6FD"
          strokeWidth="2"
        />

        {/* Specular Highlight Strip */}
        <path
          d="M48 38 L95 27"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Wallet Clasp / Button */}
        <circle
          cx="98"
          cy="58"
          r="6"
          fill="#FFFFFF"
          stroke="#0284C7"
          strokeWidth="2"
          className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        />
        <circle cx="98" cy="58" r="2.5" fill="#38BDF8" />

        {/* Sparkle Glint */}
        <path
          d="M115 28L118 36L126 39L118 42L115 50L112 42L104 39L112 36Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * 3D Glowing Warm Amber Invoice / Tax Document on Glass Pedestal (for TO PAY)
 */
export const Invoice3DGraphic: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(249,115,22,0.35)]"
      >
        <defs>
          <linearGradient id="amberPedestal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#EA580C" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C2410C" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="40%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <filter id="orangeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Neon Glow */}
        <ellipse cx="80" cy="115" rx="55" ry="16" fill="#F97316" opacity="0.35" filter="url(#orangeGlow)" />

        {/* Glass Pedestal Base */}
        <polygon
          points="80,95 138,112 80,128 22,112"
          fill="url(#amberPedestal)"
          stroke="#FDBA74"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />

        {/* 3D Isometric Document Stack */}
        {/* Back Page */}
        <rect
          x="52"
          y="24"
          width="48"
          height="66"
          rx="6"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="#C2410C"
          opacity="0.8"
        />

        {/* Front Document Page */}
        <rect
          x="46"
          y="28"
          width="50"
          height="68"
          rx="6"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="url(#docGrad)"
          stroke="#FED7AA"
          strokeWidth="2"
        />

        {/* Document Header Line */}
        <rect
          x="54"
          y="38"
          width="28"
          height="5"
          rx="2.5"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Document Text Lines */}
        <rect
          x="54"
          y="48"
          width="34"
          height="3"
          rx="1.5"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="#FFEDD5"
          opacity="0.85"
        />
        <rect
          x="54"
          y="56"
          width="34"
          height="3"
          rx="1.5"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="#FFEDD5"
          opacity="0.85"
        />
        <rect
          x="54"
          y="64"
          width="24"
          height="3"
          rx="1.5"
          transform="matrix(0.94 -0.18 0.24 0.96 0 0)"
          fill="#FFEDD5"
          opacity="0.85"
        />

        {/* 3D Rupee / Gold Coin Overlap */}
        <circle
          cx="106"
          cy="88"
          r="18"
          fill="url(#coinGrad)"
          stroke="#FFFFFF"
          strokeWidth="2"
          className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        />
        <circle cx="106" cy="88" r="14" fill="none" stroke="#EAB308" strokeWidth="1.5" opacity="0.8" />
        <text
          x="106"
          y="95"
          textAnchor="middle"
          fill="#78350F"
          fontSize="18"
          fontWeight="900"
          fontFamily="sans-serif"
        >
          ₹
        </text>

        {/* Sparkle Glint */}
        <path
          d="M125 32L128 40L136 43L128 46L125 54L122 46L114 43L122 40Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
      </svg>
    </div>
  );
};

/**
 * 3D Glowing Golden Classical Bank Architecture on Glass Pedestal (for CASH & BANK)
 */
export const Bank3DGraphic: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(234,179,8,0.35)]"
      >
        <defs>
          <linearGradient id="goldPedestal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#EAB308" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#A16207" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="goldBankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#FACC15" />
            <stop offset="70%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Neon Glow */}
        <ellipse cx="80" cy="115" rx="55" ry="16" fill="#EAB308" opacity="0.35" filter="url(#goldGlow)" />

        {/* Glass Pedestal Base */}
        <polygon
          points="80,95 138,112 80,128 22,112"
          fill="url(#goldPedestal)"
          stroke="#FEF08A"
          strokeWidth="1.5"
          strokeOpacity="0.85"
        />

        {/* Bank Base Plinth */}
        <polygon
          points="80,84 116,95 80,105 44,95"
          fill="#A16207"
        />
        <polygon
          points="80,80 114,90 80,100 46,90"
          fill="url(#goldBankGrad)"
          stroke="#FEF08A"
          strokeWidth="1.5"
        />

        {/* 4 Classical Pillars */}
        {/* Pillar 1 (Leftmost) */}
        <rect x="52" y="52" width="6" height="34" rx="2" fill="url(#goldBankGrad)" stroke="#FEF08A" strokeWidth="1" />
        {/* Pillar 2 */}
        <rect x="68" y="54" width="6" height="34" rx="2" fill="url(#goldBankGrad)" stroke="#FEF08A" strokeWidth="1" />
        {/* Pillar 3 */}
        <rect x="86" y="54" width="6" height="34" rx="2" fill="url(#goldBankGrad)" stroke="#FEF08A" strokeWidth="1" />
        {/* Pillar 4 (Rightmost) */}
        <rect x="102" y="52" width="6" height="34" rx="2" fill="url(#goldBankGrad)" stroke="#FEF08A" strokeWidth="1" />

        {/* Architrave / Beam across pillars */}
        <polygon
          points="80,48 118,58 80,64 42,58"
          fill="url(#goldBankGrad)"
          stroke="#FEF08A"
          strokeWidth="1.5"
        />

        {/* Triangular Pediment / Roof */}
        <polygon
          points="80,26 120,50 40,50"
          fill="url(#goldBankGrad)"
          stroke="#FFFFFF"
          strokeWidth="2"
        />

        {/* Inner Pediment Carving / Coin */}
        <circle cx="80" cy="42" r="5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />

        {/* Roof Specular Highlight */}
        <path
          d="M44 48 L80 28 L116 48"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Sparkle Glint */}
        <path
          d="M126 24L129 32L137 35L129 38L126 46L123 38L115 35L123 32Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
      </svg>
    </div>
  );
};
