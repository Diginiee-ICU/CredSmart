import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb link item configuration for CRM navigation hierarchy.
 */
export interface CRMBreadcrumbItem {
  /** Text label displayed in the breadcrumb trail */
  label: string;
  /** Optional target route path for clickable navigation */
  href?: string;
}

/**
 * Props for the CRMPageHeader component.
 */
export interface CRMPageHeaderProps {
  /** Main page title heading */
  title: React.ReactNode;
  /** Optional subtitle or contextual page description */
  subtitle?: React.ReactNode;
  /** Optional breadcrumbs trail indicating location hierarchy */
  breadcrumbs?: CRMBreadcrumbItem[];
  /** Optional badge or status indicator displayed inline with the title */
  badge?: React.ReactNode;
  /** Action controls slot (buttons, search, export options) positioned right on desktop */
  actions?: React.ReactNode;
  /** Optional CSS classes for the header container */
  className?: string;
}

/**
 * CRMPageHeader
 * Page header component following CredSmart layout standards with responsive desktop/mobile stacking.
 */
export function CRMPageHeader({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
  className,
}: CRMPageHeaderProps): React.ReactElement {
  return (
    <div className={cn("space-y-3 pb-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                {bc.href && !isLast ? (
                  <Link
                    to={bc.href}
                    className="hover:text-[#0F172A] dark:hover:text-white transition-colors"
                  >
                    {bc.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      isLast && "font-semibold text-[#0F172A] dark:text-white"
                    )}
                  >
                    {bc.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight font-sans">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
