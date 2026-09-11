import React, { useRef, useState, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

interface InvoiceFitViewProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * InvoiceFitView — wraps an invoice to scale it to fill the available
 * container height without scrolling. The invoice renders at natural quality
 * then is uniformly scaled down via CSS transform to fit the view.
 */
export function InvoiceFitView({ children, className }: InvoiceFitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerH, setInnerH] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    function recompute() {
      if (!container || !inner) return;
      const containerH = container.getBoundingClientRect().height;
      const containerW = container.getBoundingClientRect().width;
      const invoiceH = inner.scrollHeight;
      const invoiceW = inner.scrollWidth;
      if (containerH <= 0 || invoiceH <= 0) return;

      // Scale to fit both height and width, but never scale UP
      const scaleH = containerH / invoiceH;
      const scaleW = containerW > 0 && invoiceW > 0 ? containerW / invoiceW : 1;
      const newScale = Math.min(scaleH, scaleW, 1);
      setScale(newScale);
      setInnerH(invoiceH);
    }

    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    ro.observe(inner);
    recompute();
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full bg-slate-100 dark:bg-slate-900 flex items-start justify-center overflow-hidden py-3",
        className
      )}
    >
      <div
        style={{
          flexShrink: 0,
          transformOrigin: "top center",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          // Collapse the extra height left by the scale
          marginBottom: scale < 1 && innerH > 0 ? `${(scale - 1) * innerH}px` : undefined,
        }}
      >
        <div ref={innerRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
