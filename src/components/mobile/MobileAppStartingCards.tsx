import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Package,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Lock,
  Printer,
  Barcode,
  Share2,
} from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

interface OnboardingCardData {
  id: string;
  step: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  highlights: { icon: React.ElementType; text: string }[];
}

const ONBOARDING_CARDS: OnboardingCardData[] = [
  {
    id: "pos-billing",
    step: "01 / 04",
    badge: "TURBO POS",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    title: "Instant POS & Thermal Billing",
    subtitle: "Lightning-fast checkout built for retail counters",
    description: "Scan barcodes in milliseconds, hold multiple bills in tabs, and print GST thermal receipts with 1-click speed.",
    icon: Zap,
    gradient: "from-amber-500/25 via-orange-600/15 to-transparent",
    glowColor: "rgba(245, 158, 11, 0.4)",
    highlights: [
      { icon: Barcode, text: "High-speed camera & hardware scanner" },
      { icon: Printer, text: "ESC/POS 2-inch & 3-inch thermal printer support" },
      { icon: Zap, text: "Multi-customer held bills & offline billing" },
    ],
  },
  {
    id: "inventory-stock",
    step: "02 / 04",
    badge: "SMART INVENTORY",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    title: "Automated Stock & Batch Tracking",
    subtitle: "Real-time inventory sync on every sale & purchase",
    description: "Stock automatically deducts when items are sold and adds when purchases arrive. Track batch numbers, expiry dates, and unit conversions.",
    icon: Package,
    gradient: "from-emerald-500/25 via-teal-600/15 to-transparent",
    glowColor: "rgba(16, 185, 129, 0.4)",
    highlights: [
      { icon: CheckCircle2, text: "Automated stock additions & deductions" },
      { icon: Package, text: "Batch number & expiry date management" },
      { icon: Sparkles, text: "Box-to-Piece alternate unit conversions" },
    ],
  },
  {
    id: "b2b-ledger",
    step: "03 / 04",
    badge: "B2B NETWORK & KHATA",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    title: "Customer Udhar & Synced Ledgers",
    subtitle: "Zero-loss credit tracking with automated reminders",
    description: "Send automated WhatsApp payment reminders with UPI QR codes. Both buyer and seller ledgers synchronize automatically on CredSmart.",
    icon: Users,
    gradient: "from-blue-500/25 via-indigo-600/15 to-transparent",
    glowColor: "rgba(59, 130, 246, 0.4)",
    highlights: [
      { icon: Share2, text: "1-Click WhatsApp payment reminders" },
      { icon: Users, text: "Auto-reconciled customer & supplier khata" },
      { icon: CheckCircle2, text: "Custom credit limits & party catalog rules" },
    ],
  },
  {
    id: "cloud-security",
    step: "04 / 04",
    badge: "ENTERPRISE SECURITY",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    title: "Encrypted Cloud & Staff Controls",
    subtitle: "Your store data safe, backed up & accessible anywhere",
    description: "Bank-grade 256-bit encryption with automatic cloud sync. Assign granular permissions for cashiers, managers, and store owners.",
    icon: ShieldCheck,
    gradient: "from-purple-500/25 via-indigo-600/15 to-transparent",
    glowColor: "rgba(168, 85, 247, 0.4)",
    highlights: [
      { icon: Lock, text: "Encrypted multi-device cloud synchronization" },
      { icon: ShieldCheck, text: "Role-based staff & cashier permission lock" },
      { icon: Sparkles, text: "CA audit data export in 1 click" },
    ],
  },
];

export function MobileAppStartingCards() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < ONBOARDING_CARDS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
    if (isRightSwipe && currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_CARDS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    try {
      localStorage.setItem("credsmart_onboarding_completed", "true");
    } catch {
      // ignore
    }
    navigate(ROUTE_PATHS.auth);
  };

  const card = ONBOARDING_CARDS[currentStep];
  const IconComponent = card.icon;

  return (
    <div
      className="min-h-[100dvh] w-full bg-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none safe-top safe-bottom relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dynamic Background Glow Rings */}
      <div
        className="absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: card.glowColor }}
      />
      <div
        className="absolute bottom-1/3 -right-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: card.glowColor }}
      />

      {/* TOP HEADER: Brand Logo + Skip Button */}
      <div className="flex items-center justify-between z-10 pt-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center p-0.5 shadow-lg shadow-amber-500/20 border border-white/20">
            <img src="./favicon.png" alt="CredSmart" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white font-sans leading-none">
              CredSmart<span className="text-amber-400">.</span>
            </span>
            <span className="text-[9px] font-mono font-medium text-slate-400 leading-tight">
              POS &amp; ERP Terminal
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetStarted}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 cursor-pointer"
        >
          Skip Tour
        </button>
      </div>

      {/* MAIN CAROUSEL CARD */}
      <div className="flex-1 flex flex-col justify-center my-auto py-4 z-10 min-h-0">
        <div
          key={card.id}
          className={cn(
            "rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all duration-500 flex flex-col justify-between",
            `bg-gradient-to-b ${card.gradient}`
          )}
        >
          {/* Card Badge & Step Counter */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-wider uppercase border shadow-xs",
                card.badgeColor
              )}
            >
              {card.badge}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {card.step}
            </span>
          </div>

          {/* 3D Hero Graphic Area */}
          <div className="relative my-2 py-4 flex items-center justify-center">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center shadow-2xl transition-transform duration-500 transform hover:scale-105 border border-white/20"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent), ${card.glowColor}`,
                boxShadow: `0 20px 50px ${card.glowColor}`,
              }}
            >
              <IconComponent className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-md stroke-[2]" />
            </div>
          </div>

          {/* Titles & Description */}
          <div className="space-y-1.5 text-center mt-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              {card.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-300/90 font-mono">
              {card.subtitle}
            </p>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm mx-auto pt-1 font-normal">
              {card.description}
            </p>
          </div>

          {/* Highlights List */}
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
            {card.highlights.map((h, i) => {
              const HIcon = h.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <HIcon className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="font-medium truncate">{h.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS: Progress Dots + Next/Get Started Button */}
      <div className="space-y-4 pt-2 z-10 shrink-0">
        {/* Step Indicator Pills */}
        <div className="flex items-center justify-center gap-2">
          {ONBOARDING_CARDS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer",
                currentStep === idx
                  ? "w-8 bg-gradient-to-r from-amber-400 to-orange-500 shadow-md shadow-amber-500/50"
                  : "w-2 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-amber-500/25 active:scale-[0.98] flex items-center justify-center gap-2 border border-white/30 cursor-pointer"
        >
          <span>
            {currentStep === ONBOARDING_CARDS.length - 1 ? "Get Started • Log In" : "Continue"}
          </span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Already have an account footer */}
        <p className="text-center text-xs text-slate-400 font-mono">
          Ready to bill?{" "}
          <span
            onClick={handleGetStarted}
            className="text-amber-400 font-bold underline cursor-pointer hover:text-amber-300"
          >
            Sign In to Store
          </span>
        </p>
      </div>
    </div>
  );
}

export default MobileAppStartingCards;
