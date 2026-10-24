import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { usePagination } from "@/hooks/usePagination";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Column configuration definition for CRMDataTable.
 */
export interface CRMColumnDef<T> {
  /** Unique key identifying the column corresponding to property on T */
  key: string;
  /** Header label or custom ReactNode */
  header: React.ReactNode;
  /** Optional custom cell render accessor function. Defaults to displaying `row[key]` */
  accessor?: (row: T) => React.ReactNode;
  /** Whether this column header is clickable for ascending/descending sorting */
  sortable?: boolean;
  /** Optional CSS class applied to body cells in this column */
  className?: string;
  /** Optional CSS class applied to the header cell */
  headerClassName?: string;
}

/**
 * Alias for CRMColumnDef to maintain interoperability across specifications.
 */
export type CRMTableColumn<T> = CRMColumnDef<T>;

/**
 * Props for the CRMDataTable component.
 */
export interface CRMDataTableProps<T> {
  /** Array of data records to display */
  data: T[];
  /** Column definitions configuring table headers, sorting, and cell renderers */
  columns: CRMColumnDef<T>[];
  /** Placeholder text for client-side search input. Set to empty string to hide search */
  searchPlaceholder?: string;
  /** Optional specific key of T to target for client search filtering */
  searchKey?: keyof T;
  /** Optional custom filter predicate evaluating each record against search query */
  searchFilter?: (item: T, query: string) => boolean;
  /** Number of items displayed per page. Defaults to 10 */
  pageSize?: number;
  /** Message displayed when no records match filter or data is empty */
  emptyMessage?: string;
  /** Whether the table is in a loading state */
  isLoading?: boolean;
  /** Optional callback invoked when a row is clicked */
  onRowClick?: (item: T) => void;
  /** Additional CSS class names for the outer container */
  className?: string;
}

/**
 * CRMDataTable
 * Enterprise sortable, filterable, paginated data table powered by usePagination.
 */
export function CRMDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchPlaceholder = "Search records...",
  searchKey,
  searchFilter,
  pageSize = 10,
  emptyMessage = "No records found.",
  isLoading = false,
  onRowClick,
  className,
}: CRMDataTableProps<T>): React.ReactElement {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  // 1. Client-side Search Filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    if (searchFilter) {
      return data.filter((item) => searchFilter(item, q));
    }

    if (searchKey) {
      return data.filter((item) => {
        const val = item[searchKey];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      });
    }

    return data.filter((item) =>
      Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, searchFilter, searchKey]);

  // 2. Sorting
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // 3. Pagination
  const pagination = usePagination(sortedData, pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className={cn("space-y-3.5", className)}>
      {searchPlaceholder ? (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-8.5 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/75 dark:bg-slate-800/40">
            <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "text-xs font-bold text-slate-700 dark:text-slate-300 py-3",
                    col.sortable && "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white",
                    col.headerClassName
                  )}
                  onClick={() => {
                    if (col.sortable) {
                      handleSort(col.key);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-xs text-slate-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                    <span>Loading CRM records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : pagination.paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-xs text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((row, idx) => (
                <TableRow
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn("py-3 text-xs text-slate-800 dark:text-slate-200", col.className)}
                    >
                      {col.accessor
                        ? col.accessor(row)
                        : (row[col.key] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        hasNext={pagination.hasNext}
        hasPrev={pagination.hasPrev}
        onPageChange={pagination.setPage}
        pageSize={pagination.pageSize}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}
