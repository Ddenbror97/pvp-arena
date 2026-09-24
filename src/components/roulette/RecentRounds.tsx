import { fetchRecentRounds } from "@/lib/roulette/api";
import { formatUsd } from "@/lib/jackpot/math";
import { timeAgo } from "@/lib/time-ago";
import { CoinImg } from "./coins";
import { EDGE_TO_EDGE, RecentPager, usePagedRecent } from "@/components/recent/usePagedRecent";

export function RecentRounds() {
  const { rows, isLoading, page, hasNext, hasPrev, next, prev, pauseProps } =
    usePagedRecent("roulette-recent", fetchRecentRounds);
  return (
    <section className={EDGE_TO_EDGE} {...pauseProps}>
      <h2 className="mb-2 font-display text-xs uppercase tracking-widest">Recent roulette rounds</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">No completed rounds yet.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem_4.5rem] gap-3 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)_6rem_5rem_5rem_5rem]">
            <span>Round</span><span>Result</span><span className="text-right">Pot</span><span className="text-right">Paid out</span>
            <span className="hidden text-right sm:block">Players</span><span className="hidden text-right sm:block">When</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((g) => (
              <li
                key={g.id}
                className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem_4.5rem] items-center gap-3 px-3 py-1.5 text-sm sm:grid-cols-[4.5rem_minmax(0,1fr)_6rem_5rem_5rem_5rem]"
              >
                <span className="tabular text-xs text-muted-foreground">#{g.id}</span>
                <span className="flex min-w-0 items-center gap-2">
                  {g.winning_color && <CoinImg c={g.winning_color} size={22} className="rounded-full" />}
                  <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.winning_color ?? "—"}
                  </span>
                </span>
                <span className="tabular text-right font-semibold">{formatUsd(g.pot_amount)}</span>
                <span className="tabular text-right text-xs text-primary">{formatUsd(g.total_payout ?? 0)}</span>
                <span className="tabular hidden text-right text-xs text-muted-foreground sm:block">{g.player_count}</span>
                <span className="hidden text-right text-xs text-muted-foreground sm:block">{g.completed_at ? timeAgo(g.completed_at) : "—"}</span>
              </li>
            ))}
          </ul>
          <RecentPager page={page} hasPrev={hasPrev} hasNext={hasNext} onPrev={prev} onNext={next} />
        </div>
      )}
    </section>
  );
}
