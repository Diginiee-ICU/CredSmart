import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CredSmart Brand Color Tokens
 * Authoritative CRM color palette used across enterprise cards, badges, and metrics.
 */
export const CRM_BRAND_COLORS = {
  /** Deep Navy / Slate 900 — structural headers and high-contrast typography */
  navy: "#0F172A",
  /** CredSmart Vibrant Orange — primary CTA accents and operational highlights */
  orange: "#FF6A00",
  /** Royal Action Blue — interactive links, trust buttons, and primary actions */
  blue: "#1D4ED8",
  /** Live Status Emerald Green — active presence, success indicators, and growth */
  emerald: "#10B981",
  /** Liquidity & Highlight Warm Gold */
  gold: "#F59E0B",
  /** Soft Canvas Light Slate Background */
  slateBg: "#F8FAFC",
} as const;

/**
 * Union type representing all canonical CredSmart brand color keys.
 */
export type CRMBrandColor = keyof typeof CRM_BRAND_COLORS;

/**
 * Visual styling variants available for CRMCard.
 */
export type CRMCardVariant = "default" | "elevated" | "brand" | "outline" | "glass";

/**
 * Props for the CRMCard component.
 */
export interface CRMCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual appearance variant.
   * - `default`: Flat card with subtle border and 2xs shadow.
   * - `elevated`: Soft shadow card with hover lift interaction.
   * - `brand`: Card featuring CredSmart #FF6A00 left brand accent border.
   * - `outline`: Dashed border container for dropzones or empty states.
   * - `glass`: Clean hairline surface card.
   * @default "default"
   */
  variant?: CRMCardVariant;
  /** Optional title rendered in the card header */
  title?: React.ReactNode;
  /** Optional subtitle or descriptive text placed below title */
  description?: React.ReactNode;
  /** Optional action slot aligned to the right of header (e.g. button or dropdown) */
  headerAction?: React.ReactNode;
  /** Optional footer content rendered in a dedicated bottom strip */
  footer?: React.ReactNode;
  /** Custom CSS classes applied to the inner content container */
  contentClassName?: string;
  /** Card body content */
  children?: React.ReactNode;
}

/**
 * CRMCard
 * Enterprise container component adhering to CredSmart brand tokens, subtle borders, and elevation styles.
 */
export const CRMCard = React.forwardRef<HTMLDivElement, CRMCardProps>(
  (
    {
      className,
      variant = "default",
      title,
      description,
      headerAction,
      footer,
      children,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const variantClasses: Record<CRMCardVariant, string> = {
      default: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs",
      elevated: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-lift transition-all duration-200",
      brand: "bg-white dark:bg-slate-900 border-y border-r border-slate-200/80 dark:border-slate-800 border-l-4 border-l-[#FF6A00] shadow-2xs",
      outline: "bg-transparent border-2 border-dashed border-slate-200 dark:border-slate-800",
      glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs",
    };

    const hasHeader = Boolean(title || description || headerAction);

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden transition-all duration-200",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {hasHeader && (
          <div className="flex items-start justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 gap-4">
            <div className="space-y-1">
              {title && (
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        )}
        <div className={cn("p-5", contentClassName)}>{children}</div>
        {footer && (
          <div className="p-4 px-5 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

CRMCard.displayName = "CRMCard";
