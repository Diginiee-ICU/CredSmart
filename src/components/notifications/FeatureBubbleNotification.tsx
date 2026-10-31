import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Sparkles } from "lucide-react";
import {
  CREDALERT_NOTIFICATIONS_SOURCE,
  CredAlertNotificationItem,
} from "@/data/notificationMessages";
import { cn } from "@/lib/utils";

const AUTO_CLOSE_DURATION_MS = 60000; // 1 minute auto-close
const RECURRING_INTERVAL_MS = 180000;  // 3 minutes next bubble interval

export function FeatureBubbleNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
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
    setIsClosing(false);
    setIsVisible(true);
    setIsPaused(false);
    remainingTimeRef.current = AUTO_CLOSE_DURATION_MS;
    startTimeRef.current = Date.now();
    setProgressPercent(100);
  }, []);

  // Dismiss current bubble and schedule next one
  const dismissBubble = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      if (nextBubbleTimerRef.current) clearTimeout(nextBubbleTimerRef.current);
      nextBubbleTimerRef.current = setTimeout(() => {
        showNewBubble();
      }, RECURRING_INTERVAL_MS);
    }, 200);
  }, [showNewBubble]);

  // Initial startup: show first CredAlert notification after 10 seconds
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      showNewBubble();
    }, 10000);

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

  return (
    <aside
      aria-label="CredAlert Feature Tip"
      className={cn(
        "fixed z-40 select-none pointer-events-auto transition-all duration-200",
        "bottom-18 sm:bottom-5 right-3 sm:right-5 left-3 sm:left-auto max-w-full sm:max-w-sm",
        isClosing ? "opacity-0 translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-lg backdrop-blur-md">
        {/* Top Header: Badge + Live/Paused Indicator + Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <IconComponent className="w-3 h-3 stroke-[2]" />
            </div>

            <span className="px-1.5 py-0.2 rounded text-[10.5px] font-mono font-semibold tracking-wider uppercase border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
              {tip.badge}
            </span>

            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
              {isPaused ? "• Paused" : "• Live"}
            </span>
          </div>

          <button
            type="button"
            onClick={dismissBubble}
            aria-label="Dismiss notification"
            className="w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Body Title & Text */}
        <div className="space-y-0.5 pr-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <span>{tip.title}</span>
            <Sparkles className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0 inline" />
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {tip.text}
          </p>
        </div>

        {/* Bottom Countdown Progress Bar */}
        <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex-1 h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
            {isPaused ? "Paused" : "CredAlert"}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default FeatureBubbleNotification;
