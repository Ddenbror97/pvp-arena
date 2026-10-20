import { Link, getRouteApi } from "@tanstack/react-router";
import { fetchRecentGames } from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import {
  PlayerPrestigeIdentity,
  reservedCrownHeadroom,
} from "@/components/prestige/PlayerPrestigeIdentity";
import { usePrestigeIdentities } from "@/components/prestige/PrestigeProvider";
import { timeAgo } from "@/lib/time-ago";
import {
  EDGE_TO_EDGE,
  JACKPOT_RECENT_PAGE_SIZE,
  RecentPager,
  usePagedRecent,
} from "@/components/recent/usePagedRecent";
import { cn } from "@/lib/utils";

export function RecentGames() {
  const paintedAt = getRouteApi("/").useLoaderData().recent?.at;
  const { rows, isLoading, page, hasNext, hasPrev, next, prev, pauseProps } = usePagedRecent(
    "recent-games",
    fetchRecentGames,
    JACKPOT_RECENT_PAGE_SIZE,
  );
  const identities = usePrestigeIdentities(
    rows.map((g) => g.winner_id).filter((id): id is string => !!id),
  );
  return (
    <section className={cn(EDGE_TO_EDGE, "min-h-0")} {...pauseProps}>
      <h2 className="section-kicker mb-2 font-display text-xs uppercase tracking-widest">
        Recent jackpot games
      </h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">No completed games yet.</p>
      ) : (
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_3.5rem] gap-3 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:grid-cols-[4.5rem_minmax(0,1fr)_6rem_4.5rem_4.5rem_5rem]">
            <span>Game</span>
            <span>Winner</span>
            <span className="text-right">Pot</span>
            <span className="text-right">Chance</span>
            <span className="hidden text-right sm:block">Players</span>
            <span className="hidden text-right sm:block">When</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((g) => (
              <li key={g.id}>
                <Link
                  to="/games/$gameId"
                  params={{ gameId: String(g.id) }}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-3 px-3 py-1.5 text-sm transition hover:bg-secondary/50 sm:grid-cols-[4.5rem_minmax(0,1fr)_6rem_4.5rem_4.5rem_5rem]"
                >
                  <span className="tabular text-xs text-muted-foreground">#{g.id}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerPrestigeIdentity
                      avatar={g.winner?.avatar_url}
                      name={g.winner?.username}
                      frame={identities.get(g.winner_id ?? "")?.frame}
                      crown={identities.get(g.winner_id ?? "")?.crown}
                      level={identities.get(g.winner_id ?? "")?.level}
                      tier={identities.get(g.winner_id ?? "")?.tier}
                      size={32}
                      minHeadroom={reservedCrownHeadroom(32)}
                    />
                    <span className="truncate font-semibold">
                      {g.winner?.username ?? "unknown"}
                    </span>
                  </span>
                  <span className="tabular text-right font-semibold">
                    {formatUsd(g.pot_amount)}
                  </span>
                  <span className="tabular text-right text-xs text-primary">
                    {formatChance(g.winner_total ?? 0, g.pot_amount)}
                  </span>
                  <span className="tabular hidden text-right text-xs text-muted-foreground sm:block">
                    {g.player_count}
                  </span>
                  <span
                    suppressHydrationWarning
                    className="hidden text-right text-xs text-muted-foreground sm:block"
                  >
                    {timeAgo(g.completed_at, paintedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <RecentPager
            page={page}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={prev}
            onNext={next}
          />
        </div>
      )}
    </section>
  );
}
