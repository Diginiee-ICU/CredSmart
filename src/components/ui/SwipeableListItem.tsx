import React, { useState, useRef, ReactNode } from "react";
import { MessageSquare, Phone, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHapticScan, triggerHapticDelete } from "@/utils/soundAndHaptics";

interface SwipeableListItemProps {
  children: ReactNode;
  className?: string;
  onSwipeRight?: () => void;
  rightActionLabel?: string;
  rightActionIcon?: React.ElementType;
  rightActionColor?: "emerald" | "amber" | "indigo";
  onSwipeLeft?: () => void;
  leftActionLabel?: string;
  leftActionIcon?: React.ElementType;
  leftActionColor?: "rose" | "indigo" | "amber" | "blue";
  threshold?: number;
  disabled?: boolean;
}

export function SwipeableListItem({
  children,
  className,
  onSwipeRight,
  rightActionLabel = "WhatsApp Reminder",
  rightActionIcon: RightIcon = MessageSquare,
  rightActionColor = "emerald",
  onSwipeLeft,
  leftActionLabel = "Call",
  leftActionIcon: LeftIcon = Phone,
  leftActionColor = "rose",
  threshold = 75,
  disabled = false,
}: SwipeableListItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalScrollRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalScrollRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Detect if the user is scrolling vertically or horizontally
    if (isHorizontalScrollRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalScrollRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalScrollRef.current) {
      // Apply damping resistance
      const damped = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.75, 130);
      setOffsetX(damped);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsSwiping(false);

    if (offsetX >= threshold && onSwipeRight) {
      triggerHapticScan();
      onSwipeRight();
    } else if (offsetX <= -threshold && onSwipeLeft) {
      triggerHapticDelete();
      onSwipeLeft();
    }

    setOffsetX(0);
    isHorizontalScrollRef.current = null;
  };

  const isTriggeredRight = offsetX >= threshold;
  const isTriggeredLeft = offsetX <= -threshold;

  return (
    <div className={cn("relative overflow-hidden select-none rounded-xl", className)}>
      {/* Background action reveal on Swipe Right */}
      {onSwipeRight && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 right-1/2 flex items-center pl-4 gap-2 transition-colors duration-200",
            rightActionColor === "emerald" && "bg-emerald-500 text-white",
            rightActionColor === "amber" && "bg-amber-500 text-slate-950",
            rightActionColor === "indigo" && "bg-indigo-600 text-white",
            isTriggeredRight ? "opacity-100 font-bold" : "opacity-75"
          )}
        >
          <RightIcon className={cn("w-5 h-5 transition-transform duration-200", isTriggeredRight && "scale-125")} />
          <span className="text-xs font-bold truncate">{rightActionLabel}</span>
        </div>
      )}

      {/* Background action reveal on Swipe Left */}
      {onSwipeLeft && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 left-1/2 flex items-center justify-end pr-4 gap-2 transition-colors duration-200",
            leftActionColor === "rose" && "bg-rose-600 text-white",
            leftActionColor === "indigo" && "bg-indigo-600 text-white",
            leftActionColor === "blue" && "bg-blue-600 text-white",
            leftActionColor === "amber" && "bg-amber-500 text-slate-950",
            isTriggeredLeft ? "opacity-100 font-bold" : "opacity-75"
          )}
        >
          <span className="text-xs font-bold truncate">{leftActionLabel}</span>
          <LeftIcon className={cn("w-5 h-5 transition-transform duration-200", isTriggeredLeft && "scale-125")} />
        </div>
      )}

      {/* Foreground Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="relative bg-card z-10 w-full"
      >
        {children}
      </div>
    </div>
  );
}
