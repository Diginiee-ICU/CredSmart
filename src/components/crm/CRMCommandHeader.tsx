import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CRMCommandHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface CRMCommandHeaderProps {
  /** Page title */
  title: React.ReactNode;
  /** Optional subtitle */
  subtitle?: React.ReactNode;
  /** Breadcrumb trail */
  breadcrumbs?: CRMCommandHeaderBreadcrumb[];
  /** Optional badge nodes rendered inline with title */
  badge?: React.ReactNode;
  /** Right-side action buttons slot */
  actions?: React.ReactNode;
  /** Show a back arrow that navigates back or to backTo */
  showBack?: boolean;
  /** Override back navigation target (defaults to /crm) */
  backTo?: string;
  className?: string;
}

/**
 * CRMCommandHeader
 * Universal sticky command-bar header for all CRM pages.
 * Aligns strictly with CredSmart Minimal Design System:
 * - 1px hairline border (border-slate-200/80 light, border-slate-800 dark)
 * - Screen-fitted viewport containment (sticky top-0 z-20)
 * - Compact typography and tactile controls
 */
export function CRMCommandHeader({
  title,
  subtitle,
  breadcrumbs,
  badge,
  actions,
  showBack = false,
  backTo = "/crm",
  className,
}: CRMCommandHeaderProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-2xs",
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb row */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="hidden sm:flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1"
          >
            {breadcrumbs.map((bc, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  {bc.href && !isLast ? (
                    <Link
                      to={bc.href}
                      className="hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {bc.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        isLast && "font-semibold text-slate-900 dark:text-white"
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

        {/* Title + actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <Link
                to={backTo}
                className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 active:scale-[0.98] cursor-pointer"
                aria-label="Go back"
                title="Back to CRM Command Center"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans truncate">
                  {title}
                </h1>
                {badge && <div className="shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-start sm:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default CRMCommandHeader;
