import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trend indicator configuration for metric velocity.
 */
export interface CRMTrendIndicator {
  /** Numeric or percentage value string (e.g. "+12%" or 5) */
  value: string | number;
  /** Direction of trend: up, down, or neutral */
  direction: "up" | "down" | "neutral";
  /** Optional descriptive label (e.g. "vs yesterday", "Active Members") */
  label?: string;
}

/**
 * Accent color styles for the stat card icon pod.
 */
export type CRMStatAccent = "navy" | "orange" | "blue" | "emerald" | "gold";

/**
 * Props for the CRMStatCard component.
 */
export interface CRMStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Metric label / card title */
  label: string;
  /** Primary numeric or string metric value */
  value: string | number;
  /** Lucide icon or custom SVG icon component */
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Brand accent tint for icon pod. Defaults to "blue" */
  accent?: CRMStatAccent;
  /** Optional trend indicator specifying direction and delta */
  trend?: CRMTrendIndicator;
  /** Optional supporting description or footnote */
  description?: string;
  /** Whether card data is currently loading */
  loading?: boolean;
  /** Optional click handler for interactive cards */
  onClick?: () => void;
  /** Additional CSS classes for outer container */
  className?: string;
}

/**
 * CRMStatCard
 * Enterprise metric card featuring icon with tinted background, numeric metric, label, and trend indicator.
 */
export function CRMStatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
  trend,
  description,
  loading = false,
  className,
  onClick,
  ...props
}: CRMStatCardProps): React.ReactElement {
  const accentStyles: Record<
    CRMStatAccent,
    { bg: string; text: string; ring: string }
  > = {
    navy: {
      bg: "bg-slate-900/10",
      text: "text-[#0F172A] dark:text-white",
      ring: "ring-slate-900/10",
    },
    orange: {
      bg: "bg-orange-500/10",
      text: "text-[#FF6A00]",
      ring: "ring-orange-500/15",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-[#2563EB]",
      ring: "ring-blue-500/15",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-[#10B981]",
      ring: "ring-emerald-500/15",
    },
    gold: {
      bg: "bg-amber-500/10",
      text: "text-[#F59E0B]",
      ring: "ring-amber-500/15",
    },
  };

  const currentAccent = accentStyles[accent];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-2xs transition-all duration-200 flex flex-col justify-between",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono truncate">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ring-1",
            currentAccent.bg,
            currentAccent.text,
            currentAccent.ring
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white font-mono tracking-tight tabular-nums">
          {loading ? (
            <span className="inline-block animate-pulse text-slate-400">...</span>
          ) : (
            value
          )}
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 pt-1 text-xs font-medium">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[11px]",
                trend.direction === "up" &&
                  "bg-emerald-50 text-[#10B981] dark:bg-emerald-950/40 dark:text-emerald-400",
                trend.direction === "down" &&
                  "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                trend.direction === "neutral" &&
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {trend.direction === "up" && (
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              )}
              {trend.direction === "down" && (
                <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
              )}
              {trend.direction === "neutral" && (
                <Minus className="w-3 h-3 stroke-[2.5]" />
              )}
              <span>{trend.value}</span>
            </span>
            {trend.label && (
              <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                {trend.label}
              </span>
            )}
          </div>
        )}

        {description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
