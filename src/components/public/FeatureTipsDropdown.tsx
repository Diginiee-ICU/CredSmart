import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Sparkles,
  ArrowRight,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Lightbulb,
  CheckCircle2,
  X,
  Compass,
  ExternalLink,
} from "lucide-react";
import { FEATURE_TIPS_DATA, FeatureTip } from "@/data/featureTipsData";
import { cn } from "@/lib/utils";

interface FeatureTipsDropdownProps {
  className?: string;
  compact?: boolean;
  align?: "left" | "center" | "right";
}

const ANIMATION_EFFECTS = [
  "animate-drop-bounce",
  "animate-flip-curtain",
  "animate-liquid-glide",
  "animate-elastic-snap",
  "animate-matrix-sweep",
  "animate-pendulum-swing",
];

export function FeatureTipsDropdown({
  className,
  compact = false,
  align = "center",
}: FeatureTipsDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [animationKey, setAnimationKey] = useState(0);
  const [currentEffectIndex, setCurrentEffectIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate randomized order for shuffling
  const shuffledIndices = useMemo(() => {
    const indices = FEATURE_TIPS_DATA.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, []);

  const [orderIndex, setOrderIndex] = useState(0);

  // Current active tip
  const currentTip: FeatureTip = FEATURE_TIPS_DATA[currentIndex] || FEATURE_TIPS_DATA[0];
  const IconComponent = currentTip.icon || Sparkles;

  const triggerNextEffect = useCallback(() => {
    setCurrentEffectIndex((prev) => {
      let next = Math.floor(Math.random() * ANIMATION_EFFECTS.length);
      if (next === prev) next = (prev + 1) % ANIMATION_EFFECTS.length;
      return next;
    });
    setAnimationKey((prev) => prev + 1);
  }, []);

  // Next Tip function
  const handleNext = useCallback(() => {
    setOrderIndex((prev) => {
      const nextOrder = (prev + 1) % shuffledIndices.length;
      setCurrentIndex(shuffledIndices[nextOrder]);
      return nextOrder;
    });
    triggerNextEffect();
  }, [shuffledIndices, triggerNextEffect]);

  // Previous Tip function
  const handlePrev = useCallback(() => {
    setOrderIndex((prev) => {
      const nextOrder = (prev - 1 + shuffledIndices.length) % shuffledIndices.length;
      setCurrentIndex(shuffledIndices[nextOrder]);
      return nextOrder;
    });
    triggerNextEffect();
  }, [shuffledIndices, triggerNextEffect]);

  // Random Shuffle function
  const handleShuffle = useCallback(() => {
    const randomIdx = Math.floor(Math.random() * FEATURE_TIPS_DATA.length);
    setCurrentIndex(randomIdx);
    triggerNextEffect();
  }, [triggerNextEffect]);

  // Auto-play timer effect (cycles every 6.5 seconds)
  useEffect(() => {
    if (!isAutoPlaying || isOpen) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      handleNext();
    }, 6500);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, isOpen, handleNext]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle action navigation
  const handleActionClick = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  // Filtered list for category browse tab
  const filteredTips = useMemo(() => {
    if (selectedCategory === "all") return FEATURE_TIPS_DATA;
    return FEATURE_TIPS_DATA.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const categories = [
    { id: "all", label: "All Features" },
    { id: "pos", label: "POS & Billing" },
    { id: "inventory", label: "Inventory" },
    { id: "gst", label: "GST & Tax" },
    { id: "khata", label: "Khata CRM" },
    { id: "growth", label: "Multi-Store" },
    { id: "security", label: "Security" },
  ];

  const activeAnimationClass = ANIMATION_EFFECTS[currentEffectIndex] || "animate-drop-bounce";

  return (
    <div ref={dropdownRef} className={cn("relative select-none", className)}>
      {/* ========================================================================= */}
      {/* 1. MEDIUM HEADER-ATTACHED MESSAGE BOX (Dynamic Drop-Down Notch & Capsule) */}
      {/* ========================================================================= */}
      <div
        key={`msg-box-${animationKey}`}
        className={cn(
          "relative flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border transition-all duration-300 shadow-md backdrop-blur-md",
          activeAnimationClass,
          compact
            ? "bg-white/95 dark:bg-slate-900/95 border-amber-500/30 hover:border-amber-500/60 shadow-amber-500/5 max-w-[310px] sm:max-w-[390px]"
            : "bg-gradient-to-r from-white/95 via-amber-50/40 to-white/95 dark:from-slate-900/95 dark:via-amber-950/20 dark:to-slate-900/95 border-amber-500/40 hover:border-amber-500/70 shadow-amber-500/10 max-w-[340px] xs:max-w-[420px] md:max-w-[490px] lg:max-w-[540px]"
        )}
      >
        {/* Hanging Notch Tether from Header Top */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-500/50 rounded-full blur-[0.5px]" />

        {/* 3D Glowing Animated Icon Badge */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center shrink-0 cursor-pointer group/icon"
          title="Click to explore all features"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-xs group-hover/icon:scale-105 transition-transform">
            <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </button>

        {/* Medium Message Body (2-line layout on desktop, 1-line on compact) */}
        <div
          onClick={() => setIsOpen(true)}
          className="flex-1 min-w-0 cursor-pointer text-left py-0.5"
        >
          {/* Top Line: Category Chip + Title */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
              {currentTip.categoryLabel}
            </span>
            <h4 className="text-xs sm:text-[12px] font-black text-slate-900 dark:text-white truncate tracking-tight">
              {currentTip.title}
            </h4>
          </div>

          {/* Bottom Line (Snippet / Pro-tip) */}
          {!compact && (
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
              {currentTip.snippet || currentTip.proTip || currentTip.description}
            </p>
          )}
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Quick Navigate / Explore Button */}
          {currentTip.actionRoute && !compact && (
            <button
              type="button"
              onClick={() => handleActionClick(currentTip.actionRoute!)}
              className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
              title={`Open ${currentTip.title}`}
            >
              <span>Explore</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Shuffle / Next Controls */}
          <button
            type="button"
            onClick={handleShuffle}
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Random feature"
          >
            <Shuffle className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next feature"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* Dropdown Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="p-1 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="View all features"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform duration-300 stroke-[2.5]",
                isOpen ? "rotate-180 text-amber-500" : ""
              )}
            />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDED GLASSMORPHISM FEATURE DROPDOWN PANEL */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className={cn(
            "fixed sm:absolute top-16 sm:top-full mt-2 z-[9999] w-[calc(100vw-24px)] sm:w-[480px] md:w-[540px] max-w-[95vw] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-amber-500/30 shadow-[0_25px_60px_rgba(15,23,42,0.25)] text-slate-900 dark:text-white p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden",
            align === "right"
              ? "right-3 sm:right-0"
              : align === "left"
              ? "left-3 sm:left-0"
              : "left-1/2 -translate-x-1/2"
          )}
        >
          {/* Top Header of Dropdown */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>CredSmart Feature Hub</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-bold">
                    LIVE
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Discover everything your business can do at ₹0</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Spotlight Card */}
          <div className="my-3.5 p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 dark:from-slate-800/90 dark:via-slate-850 dark:to-slate-800/60 border border-amber-500/25 shadow-xs relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className={cn("w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs", currentTip.iconColor)}>
                <IconComponent className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    {currentTip.categoryLabel}
                  </span>
                  {currentTip.hotkey && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                      Hotkey: {currentTip.hotkey}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {currentTip.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {currentTip.description}
                </p>
              </div>
            </div>

            {/* 3 Highlights */}
            <div className="mt-3 pt-3 border-t border-amber-500/15 grid grid-cols-1 gap-1.5">
              {currentTip.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            {/* Direct Action Button */}
            <div className="mt-3.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleActionClick(currentTip.route)}
                className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-600 via-[#FF6A00] to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{currentTip.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Shuffle / Playback Control Toolbar */}
          <div className="flex items-center justify-between px-1 py-1.5 mb-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Feature"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Feature"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShuffle}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer font-bold text-[11px]"
                title="Shuffle Random Feature"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                <span>Shuffle</span>
              </button>
            </div>

            {/* Auto-cycle toggle */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying((v) => !v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                isAutoPlaying
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  : "text-slate-500 hover:bg-white dark:hover:bg-slate-700"
              )}
            >
              {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isAutoPlaying ? "Auto: 7s" : "Paused"}</span>
            </button>
          </div>

          {/* Quick Category Browser */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
              <span>EXPLORE ALL FEATURES ({FEATURE_TIPS_DATA.length})</span>
            </div>
            
            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer",
                    selectedCategory === cat.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filtered Feature List */}
            <div className="max-h-36 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {filteredTips.map((tip) => {
                const isSelected = tip.id === currentTip.id;
                const TipIcon = tip.icon;
                return (
                  <div
                    key={tip.id}
                    onClick={() => {
                      const idx = FEATURE_TIPS_DATA.findIndex((t) => t.id === tip.id);
                      if (idx !== -1) {
                        setCurrentIndex(idx);
                        setAnimationKey((prev) => prev + 1);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-xs",
                      isSelected
                        ? "bg-amber-500/15 border border-amber-500/40 text-slate-900 dark:text-white font-bold shadow-2xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border", tip.iconColor)}>
                        <TipIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{tip.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{tip.badge}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pro-Tip Footer Box */}
          <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 flex items-center gap-2 text-[11px] text-blue-900 dark:text-blue-200">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="leading-tight">
              <strong>Tip:</strong> {currentTip.tipText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeatureTipsDropdown;
