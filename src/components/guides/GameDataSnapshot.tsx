import { Link } from "@tanstack/react-router";
import { COIN } from "@/components/roulette/coins";
import type { GuideLink } from "@/lib/guides/pages";
import { formatUsd, formatBps } from "@/lib/jackpot/math";
import {
  agoLabel,
  MIN_ROUNDS_FOR_AVERAGE,
  MIN_ROUNDS_FOR_DISTRIBUTION,
  type GameSnapshotView,
  type RecentRound,
  type SnapshotGame,
} from "@/lib/game-snapshot/snapshot";

const NAME: Record<SnapshotGame, string> = {
  coinflip: "Coinflip",
  jackpot: "Jackpot",
  roulette: "Roulette",
};
const NOT_ENOUGH = "Not enough completed rounds yet to show this statistic.";
const box = "rounded-xl border border-border bg-secondary/40 p-3";

const RESULT_LABEL: Record<string, string> = {
  HEADS: "Heads",
  TAILS: "Tails",
  RED: COIN.RED.label,
  BLACK: COIN.BLACK.label,
  GREEN: COIN.GREEN.label,
};
const RESULT_DOT: Record<string, string> = {
  RED: COIN.RED.glow,
  BLACK: COIN.BLACK.glow,
  GREEN: COIN.GREEN.glow,
};

function asOf(iso: string) {
  return (
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}

function sinceDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={box}>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      {value === null ? (
        <dd className="mt-1 text-xs leading-snug text-muted-foreground">{NOT_ENOUGH}</dd>
      ) : (
        <dd className="mt-1 font-display text-xl tabular-nums text-foreground">{value}</dd>
      )}
    </div>
  );
}

function Result({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {RESULT_DOT[value] && (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ background: RESULT_DOT[value] }}
        />
      )}
      {RESULT_LABEL[value] ?? value}
    </span>
  );
}

function RoundId({ game, id }: { game: SnapshotGame; id: number }) {
  const cls = "font-semibold text-primary hover:underline";
  if (game === "coinflip")
    return (
      <Link to="/coinflip/$gameId" params={{ gameId: String(id) }} className={cls}>
        Flip #{id}
      </Link>
    );
  if (game === "jackpot")
    return (
      <Link to="/games/$gameId" params={{ gameId: String(id) }} className={cls}>
        Round #{id}
      </Link>
    );
  return <span className="font-semibold text-foreground">Spin #{id}</span>;
}

function RecentRow({
  game,
  r,
  reference,
}: {
  game: SnapshotGame;
  r: RecentRound;
  reference: string;
}) {
  const detail =
    game === "jackpot"
      ? r.players !== null
        ? `${r.players} players`
        : null
      : game === "roulette" && r.bets !== null
        ? `${r.bets} ${r.bets === 1 ? "bet" : "bets"}`
        : null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 py-2 text-sm first:border-t-0">
      <RoundId game={game} id={r.id} />
      <span className="tabular-nums text-foreground">
        {formatUsd(BigInt(r.pot))} {game === "roulette" ? "wagered" : "pot"}
      </span>
      {r.result && <Result value={r.result} />}
      {detail && <span className="text-muted-foreground">{detail}</span>}
      <span className="ml-auto text-xs text-muted-foreground">
        <time dateTime={r.completedAt}>{agoLabel(r.completedAt, reference)}</time>
        {r.verifiable && " · seed revealed"}
      </span>
    </li>
  );
}

export function GameDataSnapshot({
  view,
  howTo,
  fair,
}: {
  view: GameSnapshotView;
  howTo: GuideLink | null;
  fair: GuideLink | null;
}) {
  const { game, stats: s, windowDays, generatedAt } = view;
  const name = NAME[game];
  const w = s.window;
  const enoughForAvg = w.rounds >= MIN_ROUNDS_FOR_AVERAGE;
  const play = game === "jackpot" ? "/" : game === "coinflip" ? "/coinflip" : "/roulette";

  return (
    <section
      id="live-data"
      aria-labelledby="live-data-h"
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
        Live from PVPspinArena
      </p>
      <h2 id="live-data-h" className="mt-2 font-display text-2xl text-foreground">
        {name} activity: last {windowDays} days
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Settled real-money {name} rounds on this site, straight from the game records. Snapshot as
        of <time dateTime={generatedAt}>{asOf(generatedAt)}</time>, refreshed every few minutes.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={game === "roulette" ? "Rounds with bets" : "Completed rounds"}
          value={w.rounds.toLocaleString("en-US")}
        />
        <Stat label="Total wagered" value={w.rounds > 0 ? formatUsd(BigInt(w.wagered)) : null} />
        <Stat
          label="Average pot"
          value={enoughForAvg && w.avgPot !== null ? formatUsd(BigInt(w.avgPot)) : null}
        />
        <Stat
          label="Largest pot"
          value={w.largestPot !== null ? formatUsd(BigInt(w.largestPot)) : null}
        />
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {game === "roulette" && s.spins !== null && (
          <>
            {s.spins.toLocaleString("en-US")} spins settled in the last {windowDays} days
            {s.bets !== null && `, carrying ${s.bets.toLocaleString("en-US")} bets`}.{" "}
          </>
        )}
        {game === "jackpot" && s.avgPlayers !== null && enoughForAvg && (
          <>Average of {s.avgPlayers} players per round. </>
        )}
        {game === "roulette" ? "All rounds with bets" : "All completed rounds"}:{" "}
        {s.allTime.rounds.toLocaleString("en-US")}
        {s.allTime.rounds > 0 && (
          <>
            , {formatUsd(BigInt(s.allTime.wagered))} wagered
            {s.allTime.largestPot !== null &&
              `, largest pot ${formatUsd(BigInt(s.allTime.largestPot))}`}
          </>
        )}
        {s.allTime.since && <> since {sinceDate(s.allTime.since)}</>}.
      </p>

      {s.outcomes && (
        <div className="mt-5">
          <h3 className="font-display text-base text-foreground">
            {game === "roulette"
              ? `Results by colour, last ${windowDays} days`
              : `Heads and tails, last ${windowDays} days`}
          </h3>
          {s.outcomeTotal >= MIN_ROUNDS_FOR_DISTRIBUTION ? (
            <>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {s.outcomes.map((o) => (
                  <li key={o.label} className={box}>
                    <p className="text-sm text-foreground">
                      <Result value={o.label} />
                    </p>
                    <p className="mt-1 font-display text-xl tabular-nums text-foreground">
                      {formatBps(Math.round((o.count * 10000) / s.outcomeTotal))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.count.toLocaleString("en-US")} of {s.outcomeTotal.toLocaleString("en-US")}{" "}
                      · expected {formatBps(o.expectedBps)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Each {game === "roulette" ? "spin" : "flip"} is independent of the last, and small
                samples drift around the expected share.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{NOT_ENOUGH}</p>
          )}
        </div>
      )}

      <div className="mt-5">
        <h3 className="font-display text-base text-foreground">
          {game === "roulette" ? "Latest spins with bets" : "Latest completed rounds"}
        </h3>
        {s.recent.length > 0 ? (
          <ol className="mt-2">
            {s.recent.map((r) => (
              <RecentRow key={r.id} game={game} r={r} reference={generatedAt} />
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No completed rounds to list yet.</p>
        )}
      </div>

      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to={play} className="font-semibold text-primary hover:underline">
          Play {name}
        </Link>
        {howTo && (
          <Link
            to="/guides/$slug"
            params={{ slug: howTo.slug }}
            className="text-primary hover:underline"
          >
            How {name} works
          </Link>
        )}
        {fair && (
          <Link
            to="/guides/$slug"
            params={{ slug: fair.slug }}
            className="text-primary hover:underline"
          >
            {fair.h1.split(":")[0]}
          </Link>
        )}
        <Link to="/fairness" className="text-primary hover:underline">
          Verify a round
        </Link>
      </p>
    </section>
  );
}
