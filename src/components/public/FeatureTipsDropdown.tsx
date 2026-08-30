import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sparkles, Lightbulb, Zap, Barcode, ShieldCheck, RefreshCw, FileText, Smartphone, Layers, Receipt, Landmark, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureTipsDropdownProps {
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
}

export interface DidYouKnowNote {
  id: string;
  category: string;
  badge: string;
  note: string;
  highlight: string;
  icon: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const DID_YOU_KNOW_NOTES: DidYouKnowNote[] = [
  {
    id: "f1-pos-shortcut",
    category: "POS SHORTCUT",
    badge: "⚡ FAST POS",
    note: "Press F1 anywhere in POS to instant-search items, and F12 for 1-click instant thermal print.",
    highlight: "F1 & F12 Hotkeys",
    icon: Zap,
  },
  {
    id: "held-carts-rush",
    category: "RUSH QUEUES",
    badge: "🛒 5 HELD CARTS",
    note: "You can park up to 5 concurrent customer shopping carts during rush hour without losing scanned items.",
    highlight: "5 Concurrent Carts",
    icon: Layers,
  },
  {
    id: "offline-indexeddb",
    category: "OFFLINE SYNC",
    badge: "🌐 100% OFFLINE",
    note: "CredSmart saves bills offline in your browser database and automatically reconciles when internet returns.",
    highlight: "Zero Internet Downtime",
    icon: RefreshCw,
  },
  {
    id: "thermal-barcode-stickers",
    category: "LABEL STUDIO",
    badge: "🏷️ BARCODES",
    note: "Generate & print custom Barcode/QR price tags on thermal rolls and standard A4 sticker sheets in 1 tap.",
    highlight: "Thermal Rolls & A4",
    icon: Barcode,
  },
  {
    id: "whatsapp-payment-qr",
    category: "SMART KHATA",
    badge: "📱 WHATSAPP CRM",
    note: "Send automated WhatsApp payment reminders to overdue customers with instant dynamic UPI QR codes.",
    highlight: "WhatsApp UPI Reminders",
    icon: Smartphone,
  },
  {
    id: "gstr1-schema-2",
    category: "GST & TAX",
    badge: "⚖️ GSTR-1 SCHEMA 2.0",
    note: "CredSmart automatically formats all sales into GSTR-1 JSON (Schema 2.0) for direct GST portal upload.",
    highlight: "Schema 2.0 Ready",
    icon: Receipt,
  },
  {
    id: "multi-godown-transfer",
    category: "WAREHOUSE",
    badge: "📦 MULTI-GODOWN",
    note: "Transfer stock across multiple branch warehouses with automated dispatch and receipt log tracking.",
    highlight: "Multi-Store Transfers",
    icon: Landmark,
  },
  {
    id: "ecosystem-auto-mirror",
    category: "ECOSYSTEM",
    badge: "🔗 AUTO RECONCILE",
    note: "Every invoice you issue can automatically appear as a purchase bill in your supplier's ledger.",
    highlight: "Automatic B2B Mirroring",
    icon: Users,
  },
  {
    id: "split-tenders",
    category: "PAYMENT MODES",
    badge: "💳 SPLIT BILLS",
    note: "Combine Cash + UPI QR + Card + Khata in a single transaction with automated balance computation.",
    highlight: "Split Payments",
    icon: Sparkles,
  },
  {
    id: "low-stock-guard",
    category: "STOCK SAFETY",
    badge: "🚨 STOCK ALERTS",
    note: "Set minimum reorder levels on inventory to receive automatic warning badges before stockouts occur.",
    highlight: "Automated Reorder Alerts",
    icon: ShieldCheck,
  },
  {
    id: "excel-pdf-ca-export",
    category: "REPORTS",
    badge: "📊 CA AUDIT EXPORT",
    note: "Export P&L, balance sheets, daybooks, and stock valuations to Excel & PDF in standard CA audit formats.",
    highlight: "1-Tap Excel & PDF",
    icon: FileText,
  },
  {
    id: "free-forever-promise",
    category: "COMMUNITY",
    badge: "🎁 100% FREE",
    note: "All features in CredSmart are 100% free forever for every business with zero hidden limits or fees.",
    highlight: "Zero Subscription Cost",
    icon: Lightbulb,
  },
];

const POP_DOWN_ANIMATIONS = [
  "animate-pop-down-spring",
  "animate-pop-down-drop",
  "animate-pop-down-glide",
  "animate-pop-down-snap",
];

export function FeatureTipsDropdown({
  className,
  compact = false,
}: FeatureTipsDropdownProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Randomized sequence
  const shuffledIndices = useMemo(() => {
    const indices = DID_YOU_KNOW_NOTES.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, []);

  const [orderIndex, setOrderIndex] = useState(0);

  const handleNextNote = useCallback(() => {
    setOrderIndex((prev) => {
      const next = (prev + 1) % shuffledIndices.length;
      setCurrentIndex(shuffledIndices[next]);
      return next;
    });
    setCurrentAnimIndex((prev) => (prev + 1) % POP_DOWN_ANIMATIONS.length);
    setAnimationKey((prev) => prev + 1);
  }, [shuffledIndices]);

  // Automated 5.5s slideshow cycle (pauses on hover)
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNextNote();
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, handleNextNote]);

  const currentNote = DID_YOU_KNOW_NOTES[currentIndex] || DID_YOU_KNOW_NOTES[0];
  const IconComponent = currentNote.icon || Lightbulb;
  const activeAnimClass = POP_DOWN_ANIMATIONS[currentAnimIndex] || "animate-pop-down-spring";

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn("relative select-none w-full sm:w-auto", className)}
      title="CredSmart Pro Note (Auto-slideshow • Hover to pause)"
    >
      {/* ========================================================================= */}
      {/* AUTO POP-DOWN "DID YOU KNOW?" SLIDESHOW NOTE CARD */}
      {/* ========================================================================= */}
      <div
        key={`did-you-know-${animationKey}`}
        className={cn(
          "relative overflow-hidden transition-all duration-300 rounded-2xl border backdrop-blur-xl shadow-xs hover:shadow-md",
          activeAnimClass,
          compact
            ? "bg-white/95 dark:bg-slate-900/95 border-amber-500/35 dark:border-amber-500/40 px-3 py-1.5 w-full max-w-full sm:max-w-[360px]"
            : "bg-gradient-to-r from-amber-50/70 via-white/95 to-orange-50/60 dark:from-slate-900/95 dark:via-slate-850 dark:to-slate-900/95 border-amber-500/30 dark:border-amber-500/40 px-3.5 py-2 w-full sm:max-w-[420px] md:max-w-[480px] lg:max-w-[520px]"
        )}
      >
        {/* Top Header Row: 💡 DID YOU KNOW? + Category Badge + Counter */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Glowing 3D Icon */}
            <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <IconComponent className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
            </div>

            {/* Title Label */}
            <span className="text-[10px] sm:text-[10.5px] font-black tracking-wider uppercase font-mono text-amber-800 dark:text-amber-300 shrink-0">
              DID YOU KNOW?
            </span>

            {/* Category Tag */}
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9px] font-bold font-mono uppercase tracking-wider bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/25 shrink-0 truncate">
              {currentNote.badge}
            </span>
          </div>

          {/* Micro Slide Indicator */}
          <div className="flex items-center gap-0.5 text-[9px] sm:text-[9.5px] font-mono text-slate-400 dark:text-slate-400 shrink-0 font-bold">
            <span>{String(orderIndex + 1).padStart(2, "0")}</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span>{String(DID_YOU_KNOW_NOTES.length).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Note Body Text (1-2 lines short, clear & premium) */}
        <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 font-medium leading-snug tracking-tight line-clamp-2">
          {currentNote.note}
        </p>

        {/* Animated 5.5s Progress Line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            key={`progress-${animationKey}-${isPaused ? "paused" : "running"}`}
            style={{
              animation: isPaused ? "none" : "progressFill 5.5s linear forwards",
            }}
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 origin-left"
          />
        </div>
      </div>
    </div>
  );
}

export default FeatureTipsDropdown;

