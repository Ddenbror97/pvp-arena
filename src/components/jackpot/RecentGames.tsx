import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { recentGamesQuery } from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import { PlayerAvatar } from "./Avatar";

export function RecentGames() {
  const { data, isLoading } = useQuery(recentGamesQuery);
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-sm uppercase tracking-widest">Recent jackpot games</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">No completed games yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((g) => (
            <Link
              key={g.id}
              to="/games/$gameId"
              params={{ gameId: String(g.id) }}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="tabular">Game #{g.id}</span>
                <span>{g.player_count} players</span>
              </div>
              <div className="tabular mt-2 text-xl font-semibold">{formatUsd(g.pot_amount)}</div>
              <div className="mt-3 flex items-center gap-2">
                <PlayerAvatar src={g.winner?.avatar_url} name={g.winner?.username} className="h-7 w-7" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">@{g.winner?.username ?? "unknown"}</div>
                  <div className="tabular text-xs text-primary">{formatChance(g.winner_total ?? 0, g.pot_amount)} chance</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
