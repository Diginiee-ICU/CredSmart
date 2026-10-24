import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Semantic variant options for CRMBadge mapping to CredSmart brand tokens.
 */
export type CRMBadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "orange";

/**
 * Size variants for CRMBadge.
 */
export type CRMBadgeSize = "sm" | "md" | "lg";

/**
 * Props for CRMBadge component.
 */
export interface CRMBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Semantic variant mapping to CredSmart brand tokens.
   * - `success`: Emerald green (#10B981) for active states and positive confirmations.
   * - `warning`: Amber/Orange for alerts requiring attention.
   * - `error`: Rose/Red (#EF4444) for failures or destructive warnings.
   * - `info`: Royal Blue (#2563EB) for informative metadata and tags.
   * - `neutral`: Slate/Navy (#0F172A) for standard counters and subtle categories.
   * - `orange`: CredSmart brand vibrant orange (#FF6A00).
   * @default "neutral"
   */
  variant?: CRMBadgeVariant;
  /**
   * Size of the badge pill.
   * - `sm`: 10px text, compact padding.
   * - `md`: 12px text, standard padding.
   * - `lg`: 14px text, prominent pill.
   * @default "md"
   */
  size?: CRMBadgeSize;
  /**
   * If true, displays an animated status dot indicator before children content.
   * @default false
   */
  dot?: boolean;
  /**
   * Badge label or inner content.
   */
  children?: React.ReactNode;
}

/**
 * CRMBadge
 * Production status badge with CredSmart brand semantic tokens (Emerald, Orange, Blue, Red, Navy).
 */
export const CRMBadge = React.forwardRef<HTMLSpanElement, CRMBadgeProps>(
  (
    {
      className,
      variant = "neutral",
      size = "md",
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<CRMBadgeVariant, { pill: string; dot: string }> = {
      success: {
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        dot: "bg-[#10B981]",
      },
      warning: {
        pill: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        dot: "bg-amber-500",
      },
      error: {
        pill: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        dot: "bg-rose-500",
      },
      info: {
        pill: "bg-blue-50 text-[#2563EB] border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
        dot: "bg-blue-600",
      },
      neutral: {
        pill: "bg-slate-100 text-[#0F172A] border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        dot: "bg-slate-400",
      },
      orange: {
        pill: "bg-orange-50 text-[#FF6A00] border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
        dot: "bg-[#FF6A00]",
      },
    };

    const sizeStyles: Record<CRMBadgeSize, string> = {
      sm: "text-[11px] px-2 py-0.5 gap-1 font-semibold",
      md: "text-xs px-2.5 py-0.5 gap-1.5",
      lg: "text-sm px-3 py-1 gap-2 font-medium",
    };

    const currentVariant = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-semibold rounded-full border transition-colors select-none",
          currentVariant.pill,
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", currentVariant.dot)}
          />
        )}
        {children}
      </span>
    );
  }
);

CRMBadge.displayName = "CRMBadge";
