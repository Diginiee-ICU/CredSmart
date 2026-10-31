import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Zap,
  Package,
  Users,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Lock,
  Printer,
  Barcode,
  Share2,
  MapPin,
  Bot,
  BadgePercent,
  FileSpreadsheet,
  Sun,
  Moon,
} from "lucide-react";
import { ROUTE_PATHS, ACTIVE_SUITE_STORAGE_KEY } from "@/config/routes";
import { cn } from "@/lib/utils";

interface OnboardingCardData {
  id: string;
  step: string;
  suite: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  highlights: { icon: React.ElementType; text: string }[];
}

const ONBOARDING_CARDS: OnboardingCardData[] = [
  {
    id: "pos-billing",
    step: "01 / 05",
    suite: "RETAIL POS ENGINE",
    badge: "TURBO POS BILLING",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    title: "Instant POS & Thermal Checkout",
    subtitle: "Sub-second retail billing with multi-tab hold",
    description: "Lightning-fast barcode scanning, held customer carts, and 1-click thermal printing engineered for busy retail counters.",
    icon: ShoppingCart,
    iconBg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60",
    iconColor: "text-blue-600 dark:text-blue-400",
    highlights: [
      { icon: Barcode, text: "High-speed camera & laser hardware scanner" },
      { icon: Printer, text: "ESC/POS 2-inch & 3-inch thermal printer support" },
      { icon: Zap, text: "Multi-customer held bills & offline billing resilience" },
    ],
  },
  {
    id: "inventory-stock",
    step: "02 / 05",
    suite: "SMART INVENTORY",
    badge: "AUTOMATED STOCK",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    title: "Real-Time Stock & Batch Tracking",
    subtitle: "Automated deductions on every sale invoice",
    description: "Stock automatically deducts when items are sold and replenishes on purchase bills. Track batches, expiry dates, and unit conversions.",
    icon: Package,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    highlights: [
      { icon: CheckCircle2, text: "Automated stock additions & deductions" },
      { icon: Package, text: "Batch number, MRP & expiry date management" },
      { icon: Sparkles, text: "Box-to-Piece alternate unit conversions" },
    ],
  },
  {
    id: "b2b-khata",
    step: "03 / 05",
    suite: "B2B NETWORK & KHATA",
    badge: "SYNCED LEDGERS",
    badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    title: "Customer Udhar & WhatsApp Ledger",
    subtitle: "Zero-loss credit tracking with UPI reminders",
    description: "Send automated payment reminders with dynamic UPI QR codes over WhatsApp. Both party ledgers reconcile automatically without disputes.",
    icon: Share2,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    highlights: [
      { icon: Share2, text: "1-Click WhatsApp payment reminders with UPI QR" },
      { icon: Users, text: "Auto-reconciled customer & supplier khata" },
      { icon: CheckCircle2, text: "Credit limits & real-time transaction statements" },
    ],
  },
  {
    id: "workforce-crm",
    step: "04 / 05",
    suite: "WORKFORCE & FIELD CRM",
    badge: "GPS ATTENDANCE & HR",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    title: "GPS Attendance & Voice Copilot",
    subtitle: "Automated payroll with geofenced clock-in",
    description: "Geofenced staff attendance with GPS radius verification, bilingual voice AI command copilot, task delegation, and 1-tap net payroll.",
    icon: MapPin,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    highlights: [
      { icon: MapPin, text: "Geofenced GPS clock-in & live shift monitoring" },
      { icon: Bot, text: "Bilingual voice copilot (English + Hindi)" },
      { icon: BadgePercent, text: "1-Tap automated payroll & advance deductions" },
    ],
  },
  {
    id: "security-cloud",
    step: "05 / 05",
    suite: "ENTERPRISE PLATFORM",
    badge: "DUAL-ENGINE SECURITY",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    title: "Strict Isolation & CA Audit",
    subtitle: "Bank-grade 256-bit SSL cloud synchronization",
    description: "Enterprise security architecture with runtime isolation between POS and CRM engines. Multi-role staff PIN access and 1-click CA audit exports.",
    icon: ShieldCheck,
    iconBg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/60",
    iconColor: "text-blue-600 dark:text-blue-400",
    highlights: [
      { icon: Lock, text: "Strict POS & CRM runtime token isolation" },
      { icon: ShieldCheck, text: "Role-based cashier & manager PIN protection" },
      { icon: FileSpreadsheet, text: "1-Click CA audit spreadsheet export" },
    ],
  },
];

export function MobileAppStartingCards(): React.ReactElement {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 45;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const next = !isDark;
      setIsDark(next);
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const markOnboardingDone = () => {
    try {
      localStorage.setItem("credsmart_onboarding_completed", "true");
    } catch {
      // ignore
    }
  };

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
      handleLaunchBilling();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    navigate(ROUTE_PATHS.landing);
  };

  const handleLaunchBilling = () => {
    markOnboardingDone();
    try {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "billing");
      localStorage.setItem("credsmart_suite_preference", "billing");
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
    } catch {
      // ignore
    }
    navigate(ROUTE_PATHS.dashboard);
  };

  const handleLaunchCrm = () => {
    markOnboardingDone();
    try {
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "crm");
      localStorage.setItem("credsmart_suite_preference", "crm");
      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
    } catch {
      // ignore
    }
    navigate("/crm");
  };

  const handleSignIn = () => {
    markOnboardingDone();
    navigate(ROUTE_PATHS.auth);
  };

  const card = ONBOARDING_CARDS[currentStep];
  const IconComponent = card.icon;
  const isLastStep = currentStep === ONBOARDING_CARDS.length - 1;

  return (
    <div
      data-testid="mobile-app-starting-cards"
      className="h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3.5 sm:p-5 select-none overflow-hidden relative transition-colors duration-200"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── TOP BAR: Brand Header + Theme Toggle + Skip ── */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8.5 h-8.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs flex items-center justify-center">
            <img src="/favicon.png" alt="CredSmart" className="w-5 h-5 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                CredSmart
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                v1.1.8
              </span>
            </div>
            <p className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
              Dual-Engine Architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-7.5 h-7.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-colors cursor-pointer shadow-2xs"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Skip Button */}
          <button
            type="button"
            data-testid="skip-tour-btn"
            onClick={handleSkip}
            className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-colors cursor-pointer shadow-2xs"
          >
            Skip
          </button>
        </div>
      </header>

      {/* ── MAIN CARD POD: Screen-Fitted Bounded Carousel ── */}
      <main className="w-full max-w-md mx-auto my-auto flex-1 flex flex-col justify-center py-2 min-h-0">
        <div
          key={card.id}
          data-testid={`onboarding-card-${card.id}`}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all duration-300 relative overflow-hidden"
        >
          {/* Card Top: Badge & Monospace Step Counter */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold tracking-wider uppercase border shadow-2xs",
                card.badgeColor
              )}
            >
              {card.badge}
            </span>
            <span
              data-testid="onboarding-step-counter"
              className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 tabular-nums"
            >
              {card.step}
            </span>
          </div>

          {/* Icon Pod (Flat, Minimal, No Neon Blur Halos) */}
          <div className="my-2 flex items-center justify-center">
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center shadow-2xs transition-transform duration-300 active:scale-95",
                card.iconBg
              )}
            >
              <IconComponent className={cn("w-7 h-7 sm:w-8 sm:h-8 stroke-[2]", card.iconColor)} />
            </div>
          </div>

          {/* Typography Hierarchy: Titles & Description */}
          <div className="text-center space-y-1 my-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              {card.title}
            </h2>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {card.subtitle}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto pt-0.5">
              {card.description}
            </p>
          </div>

          {/* Highlights List: Flat, High-Density Rows */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            {card.highlights.map((h, i) => {
              const HIcon = h.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <div className="w-4.5 h-4.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <HIcon className="w-3 h-3 stroke-[2.2]" />
                  </div>
                  <span className="font-medium text-[11.5px] truncate">{h.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── BOTTOM DOCK CONTROLS: Progress Dots + Actions ── */}
      <footer className="w-full max-w-md mx-auto space-y-2.5 shrink-0 pt-1">
        {/* Step Indicator Pills */}
        <div className="flex items-center justify-center gap-1.5 py-0.5">
          {ONBOARDING_CARDS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              data-testid={`step-pill-${idx}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200 cursor-pointer",
                currentStep === idx
                  ? "w-6 bg-blue-600 dark:bg-blue-500 shadow-2xs"
                  : "w-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        {!isLastStep ? (
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                data-testid="onboarding-prev-btn"
                onClick={handlePrev}
                className="h-[46px] px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              data-testid="onboarding-next-btn"
              onClick={handleNext}
              className="flex-1 h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Final Slide: Dual-Engine Launch Choices */
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="launch-pos-choice-btn"
                onClick={handleLaunchBilling}
                className="flex-1 h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>Launch POS</span>
              </button>

              <button
                type="button"
                data-testid="launch-crm-choice-btn"
                onClick={handleLaunchCrm}
                className="flex-1 h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Launch CRM</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer: Direct Sign In Link */}
        <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-0.5">
          Already registered?{" "}
          <button
            type="button"
            data-testid="onboarding-signin-link"
            onClick={handleSignIn}
            className="text-blue-600 dark:text-blue-400 font-bold underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 ml-0.5"
          >
            Sign In to Store
          </button>
        </p>
      </footer>
    </div>
  );
}

export default MobileAppStartingCards;
