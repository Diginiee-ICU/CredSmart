import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  compact?: boolean; // smaller variant for modals
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNext,
  hasPrev,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
  compact = false,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  // Generate visible page numbers (max 5 shown)
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 border-t border-border/60 bg-card/70 backdrop-blur-sm shrink-0",
        compact ? "text-[11px]" : "text-xs",
        className,
      )}
    >
      {/* Left: count info + optional page size selector */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground whitespace-nowrap font-medium">
          {totalItems === 0
            ? "No items"
            : compact
            ? `${startIndex}–${endIndex} / ${totalItems}`
            : `Showing ${startIndex}–${endIndex} of ${totalItems}`}
        </span>
        {onPageSizeChange && pageSize && !compact && (
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-7 min-w-[94px] w-auto px-2 text-xs border-border/60 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">
                  {s} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Right: navigation */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* First page */}
        {!compact && (
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className={cn(
              "w-7.5 h-7.5 flex items-center justify-center rounded-md transition-colors",
              hasPrev
                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
            )}
            aria-label="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className={cn(
            "w-7.5 h-7.5 flex items-center justify-center rounded-md transition-colors",
            hasPrev
              ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers (hidden on very small / compact) */}
        {!compact && (
          <div className="hidden sm:flex items-center gap-0.5">
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-muted-foreground select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={cn(
                    "min-w-[28px] h-7 px-1 rounded-lg font-medium transition-colors text-xs",
                    p === page
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  {p}
                </button>
              ),
            )}
          </div>
        )}

        {/* Current page indicator on mobile / compact */}
        {(compact || true) && ( // eslint-disable-line no-constant-binary-expression
          <span className="sm:hidden px-2 text-xs font-mono font-semibold text-muted-foreground select-none">
            {page}/{totalPages}
          </span>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={cn(
            "w-7.5 h-7.5 flex items-center justify-center rounded-md transition-colors",
            hasNext
              ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
          )}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last page */}
        {!compact && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className={cn(
              "w-7.5 h-7.5 flex items-center justify-center rounded-md transition-colors",
              hasNext
                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
            )}
            aria-label="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
