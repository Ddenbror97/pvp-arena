import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const RECENT_PAGE_SIZE = 8;

/**
 * Paged recent-games list. Default is 8 rows; pass pageSize where a lobby fits fewer.
 * Prev/Next only — no infinite scroll.
 */
export function usePagedRecent<T>(
  queryKey: string,
  fetcher: (limit: number, offset: number) => Promise<T[]>,
  pageSize = RECENT_PAGE_SIZE,
) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const q = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => fetcher(pageSize, page * pageSize),
    placeholderData: keepPreviousData,
    staleTime: 3000,
  });
  const rows = q.data ?? [];
  const hasNext = rows.length === pageSize;
  const hasPrev = page > 0;

  const next = useCallback(() => setPage((p) => (hasNext ? p + 1 : 0)), [hasNext]);
  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);

  const pauseProps = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  return { rows, isLoading: q.isLoading, page, hasNext, hasPrev, next, prev, pauseProps };
}

export function RecentPager({
  page,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-border px-3 py-1.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="tabular text-[10px] uppercase tracking-widest text-muted-foreground">
        Page {page + 1}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

/** Full-bleed wrapper so the section runs edge to edge inside a centered page container. */
export const EDGE_TO_EDGE =
  "relative mt-8 flex min-h-[24.5rem] w-full max-w-full flex-col px-0 sm:px-1";
