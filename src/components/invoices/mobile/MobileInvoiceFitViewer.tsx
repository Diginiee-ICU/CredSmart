import React, { useRef, useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileInvoiceFitViewerProps {
  children: React.ReactNode;
  title?: string;
  badge?: React.ReactNode;
  defaultFit?: boolean;
  className?: string;
}

/**
 * MobileInvoiceFitViewer
 * Automatically scales the A4 UnifiedInvoiceRenderer to fit 100% of the mobile viewport width
 * with zero horizontal overflow, while preserving crystal-clear vector proportions and themes.
 * Includes a quick toggle to inspect in 1:1 scrollable detail if desired.
 */
export function MobileInvoiceFitViewer({
  children,
  title,
  badge,
  defaultFit = true,
  className,
}: MobileInvoiceFitViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);
  const [isFitMode, setIsFitMode] = useState<boolean>(defaultFit);

  const calculateScale = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    // If containerWidth is 0 (e.g. initial mount or JSDOM test runner), do not scale
    if (!containerWidth || containerWidth <= 0) {
      setScale(1);
      setScaledHeight(undefined);
      return;
    }

    const baseWidth = 794; // Standard A4 print paper canvas width at 96 DPI

    if (isFitMode && containerWidth < baseWidth) {
      const newScale = containerWidth / baseWidth;
      setScale(newScale);
      const contentH = contentRef.current.offsetHeight || contentRef.current.scrollHeight;
      if (contentH > 0) {
        setScaledHeight(Math.ceil(contentH * newScale));
      }
    } else {
      setScale(1);
      setScaledHeight(undefined);
    }
  }, [isFitMode]);

  useEffect(() => {
    calculateScale();
    const handleResize = () => calculateScale();
    window.addEventListener("resize", handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => calculateScale());
      if (containerRef.current) ro.observe(containerRef.current);
      if (contentRef.current) ro.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ro) ro.disconnect();
    };
  }, [calculateScale]);

  return (
    <div className="w-full flex flex-col">
      {/* ── Top Bar: Title, Badge & Fit / 1:1 Zoom Toggle ── */}
      <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {title}
            </span>
          )}
          {badge}
        </div>

        <button
          type="button"
          onClick={() => setIsFitMode((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 active:scale-95 transition-all cursor-pointer shadow-2xs"
          title={isFitMode ? "Switch to 1:1 scrollable detail" : "Fit invoice to mobile screen width"}
          aria-label={isFitMode ? "View 1:1 Scale" : "Fit to Screen"}
        >
          {isFitMode ? (
            <>
              <Maximize2 className="w-3 h-3 text-indigo-600" />
              <span>View 1:1</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3 h-3 text-indigo-600" />
              <span>Fit Screen</span>
            </>
          )}
        </button>
      </div>

      {/* ── Outer Fitted Card Container ── */}
      <div
        ref={containerRef}
        className={cn(
          "w-full bg-white rounded-xl shadow-xs border border-slate-200 transition-all",
          isFitMode ? "overflow-hidden" : "overflow-x-auto",
          className
        )}
        style={isFitMode && scaledHeight ? { height: `${scaledHeight}px` } : undefined}
      >
        <div
          ref={contentRef}
          style={{
            width: isFitMode && scale < 1 ? "794px" : "100%",
            transform: isFitMode && scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
