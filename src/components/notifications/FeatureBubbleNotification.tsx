import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ShieldAlert, Sparkles } from "lucide-react";
import {
  CREDALERT_NOTIFICATIONS_SOURCE,
  CredAlertNotificationItem,
} from "@/data/notificationMessages";
import { cn } from "@/lib/utils";

// 6 Distinct Visual Shapes
const BUBBLE_SHAPES = [
  // 0: Frosted Amber Squircle
  "rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/95 to-amber-950/40 text-slate-100 shadow-[0_16px_50px_rgba(245,158,11,0.25)]",
  // 1: Futuristic Cyan Capsule
  "rounded-[2rem] border border-cyan-500/40 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-cyan-950/40 text-slate-100 shadow-[0_16px_50px_rgba(6,182,212,0.25)]",
  // 2: Emerald Organic Shield
  "rounded-2xl rounded-tr-3xl rounded-bl-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-emerald-950/40 text-slate-100 shadow-[0_16px_50px_rgba(16,185,129,0.25)]",
  // 3: Holographic Diamond Cut
  "rounded-2xl border border-purple-500/40 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-purple-950/40 text-slate-100 shadow-[0_16px_50px_rgba(168,85,247,0.25)]",
  // 4: Speech Bubble Cloud
  "rounded-[1.75rem] border border-blue-500/40 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-indigo-950/40 text-slate-100 shadow-[0_16px_50px_rgba(59,130,246,0.25)]",
  // 5: Modern Minimalist Carbon Bar
  "rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900/95 via-slate-850/95 to-slate-900/95 text-slate-100 shadow-[0_16px_50px_rgba(0,0,0,0.6)]",
];

// 6 Dynamic Animation Classes
const BUBBLE_ANIMATIONS = [
  "animate-bubble-spring",
  "animate-bubble-glide",
  "animate-bubble-float",
  "animate-bubble-elastic",
  "animate-bubble-swirl",
  "animate-bubble-bounce",
];

const AUTO_CLOSE_DURATION_MS = 60000; // 1 minute auto-close
const RECURRING_INTERVAL_MS = 120000;  // 2 minutes next bubble interval

export function FeatureBubbleNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shapeIndex, setShapeIndex] = useState(0);
  const [animIndex, setAnimIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextBubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(AUTO_CLOSE_DURATION_MS);
  const startTimeRef = useRef<number>(Date.now());

  // Show a new bubble notification from the CredAlert messages source
  const showNewBubble = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % CREDALERT_NOTIFICATIONS_SOURCE.length);
    setShapeIndex(Math.floor(Math.random() * BUBBLE_SHAPES.length));
    setAnimIndex(Math.floor(Math.random() * BUBBLE_ANIMATIONS.length));
    setIsClosing(false);
    setIsVisible(true);
    setIsPaused(false);
    remainingTimeRef.current = AUTO_CLOSE_DURATION_MS;
    startTimeRef.current = Date.now();
    setProgressPercent(100);
  }, []);

  // Dismiss current bubble and schedule next one in 2 minutes
  const dismissBubble = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      // Schedule next bubble in 2 minutes
      if (nextBubbleTimerRef.current) clearTimeout(nextBubbleTimerRef.current);
      nextBubbleTimerRef.current = setTimeout(() => {
        showNewBubble();
      }, RECURRING_INTERVAL_MS);
    }, 300);
  }, [showNewBubble]);

  // Initial startup: show first CredAlert notification after 6 seconds
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      showNewBubble();
    }, 6000);

    return () => {
      clearTimeout(initialTimer);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (nextBubbleTimerRef.current) clearTimeout(nextBubbleTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [showNewBubble]);

  // Auto-close in 1 minute with progress calculation (pausable on hover/touch)
  useEffect(() => {
    if (!isVisible || isClosing) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    if (isPaused) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    autoCloseTimerRef.current = setTimeout(() => {
      dismissBubble();
    }, remainingTimeRef.current);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const timeLeft = Math.max(0, remainingTimeRef.current - elapsed);
      setProgressPercent((timeLeft / AUTO_CLOSE_DURATION_MS) * 100);
    }, 200);

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isVisible, isClosing, isPaused, dismissBubble]);

  const handleMouseEnter = () => {
    if (!isPaused) {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (isPaused) {
      setIsPaused(false);
    }
  };

  if (!isVisible) return null;

  const tip: CredAlertNotificationItem =
    CREDALERT_NOTIFICATIONS_SOURCE[currentIndex] || CREDALERT_NOTIFICATIONS_SOURCE[0];
  const IconComponent = tip.icon;
  const currentShapeClass = BUBBLE_SHAPES[shapeIndex] || BUBBLE_SHAPES[0];
  const currentAnimClass = BUBBLE_ANIMATIONS[animIndex] || BUBBLE_ANIMATIONS[0];

  return (
    <div
      className={cn(
        "fixed z-50 select-none pointer-events-auto transition-all duration-300",
        // Desktop: bottom-6 right-6 | Mobile: bottom-20 right-3 left-3 sm:left-auto
        "bottom-20 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto max-w-full sm:max-w-sm"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      <div
        className={cn(
          "relative overflow-hidden backdrop-blur-2xl p-4 sm:p-4.5 border transition-all duration-300",
          currentShapeClass,
          isClosing ? "animate-bubble-out" : currentAnimClass
        )}
      >
        {/* Glow background orb */}
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-40 pointer-events-none"
          style={{ backgroundColor: tip.accentColor }}
        />

        {/* Top Header: CredAlert Shield + Category Badge + Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Glowing Icon Badge */}
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs border border-white/20"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent), ${tip.accentColor}`,
              }}
            >
              <IconComponent className="w-3 h-3 stroke-[2.5]" />
            </div>

            {/* CredAlert Category Badge */}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] sm:text-[11px] font-mono font-black tracking-wider uppercase border shadow-2xs shrink-0",
                tip.badgeColor
              )}
            >
              {tip.badge}
            </span>

            <span className="text-[11px] font-mono text-slate-400 truncate">
              {isPaused ? "• Paused" : "• Live"}
            </span>
          </div>

          {/* Close (X) Button */}
          <button
            type="button"
            onClick={dismissBubble}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
            title="Dismiss CredAlert notification"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Body Title & Text */}
        <div className="space-y-1 pr-1">
          <h4 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1.5">
            <span>{tip.title}</span>
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline animate-pulse" />
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal">
            {tip.text}
          </p>
        </div>

        {/* Bottom Auto-Close Progress Bar (1 minute countdown) */}
        <div className="mt-3 pt-1 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {isPaused ? "Paused" : "CredAlert • 1m"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FeatureBubbleNotification;
