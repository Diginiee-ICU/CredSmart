import { useState, useMemo, useCallback } from "react";

export interface UsePaginationReturn<T> {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  paginatedItems: T[];
  totalPages: number;
  totalItems: number;
  startIndex: number; // 1-based, for display
  endIndex: number;   // 1-based, for display
  hasNext: boolean;
  hasPrev: boolean;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
}

export function usePagination<T>(
  items: T[],
  defaultPageSize = 25,
): UsePaginationReturn<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page when items length / pageSize changes
  const page_ = Math.min(page, totalPages);

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1); // reset to first page on size change
  }, []);

  const paginatedItems = useMemo(() => {
    const start = (page_ - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page_, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (page_ - 1) * pageSize + 1;
  const endIndex = Math.min(page_ * pageSize, totalItems);

  const hasNext = page_ < totalPages;
  const hasPrev = page_ > 1;

  const goNext = useCallback(() => setPage(page_ + 1), [page_, setPage]);
  const goPrev = useCallback(() => setPage(page_ - 1), [page_, setPage]);
  const goFirst = useCallback(() => setPage(1), [setPage]);
  const goLast = useCallback(() => setPage(totalPages), [setPage, totalPages]);

  return {
    page: page_,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    goFirst,
    goLast,
  };
}
