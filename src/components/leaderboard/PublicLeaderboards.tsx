import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { formatUsd } from "@/lib/jackpot/math";
import {
  leaderboardCall,
  leaderboardError,
  payoutLabel,
  PUBLIC_BOARD_PAGE,
  statusLabel,
  type BoardRow,
  type PublicBoard,
  type PublicListRow,
} from "@/lib/leaderboard/api";
import { prefetchPublicBoard } from "@/lib/leaderboard/paint";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE = PUBLIC_BOARD_PAGE;

const GAME_LABEL: Record<string, string> = {
  jackpot: "Jackpot",
  coinflip: "Coinflip",
  roulette: "Roulette",
  slott: "Slott",
};

function LocalTime({ iso }: { iso: string | null }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(iso ? new Date(iso).toLocaleString() : "Not calculated yet");
  }, [iso]);
  return <span className="inline-block min-h-5 whitespace-nowrap">{text || "\u00a0"}</span>;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function remaining(ms: number): string {
  if (ms <= 0) return "Closing";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function Clock({
  now,
  status,
  startsAt,
  endsAt,
}: {
  now: number;
  status: string;
  startsAt: string;
  endsAt: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  let text = "\u00a0";
  if (ready) {
    text =
      status === "scheduled"
        ? remaining(new Date(startsAt).getTime() - now)
        : status === "active" || status === "closing"
          ? remaining(new Date(endsAt).getTime() - now)
          : "";
  }
  if (ready && text === "") return <LocalTime iso={endsAt} />;
  return <span className="inline-block min-h-5 min-w-[12ch] whitespace-nowrap">{text}</span>;
}

function clockLabel(status: string): string {
  if (status === "scheduled") return "Starts in";
  if (status === "active") return "Ends in";
  if (status === "closing") return "Closing";
  if (status === "suspended") return "Paused";
  return "Ended";
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active" || status === "closing"
      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-4px] shadow-primary"
      : status === "scheduled"
        ? "border-primary/40 bg-primary/15 text-primary-soft"
        : status === "cancelled" || status === "suspended" || status === "under_review"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function placeName(start: number, end: number): string {
  if (start !== end) return `${start}–${end}`;
  if (start === 1) return "1st";
  if (start === 2) return "2nd";
  if (start === 3) return "3rd";
  return `${start}th`;
}

function boardOrder(row: PublicListRow): number {
  switch (row.status) {
    case "active":
      return 0;
    case "closing":
      return 1;
    case "scheduled":
      return 2;
    case "settling":
      return 3;
    case "under_review":
      return 4;
    case "suspended":
      return 5;
    case "completed":
      return 6;
    default:
      return 7;
  }
}

function BoardSkeleton() {
  return (
    <div aria-hidden>
      <div className="mt-3 h-36 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="mt-3 h-28 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="mt-3 h-40 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}

function openBoard(
  onOpen: ((id: string) => void) | undefined,
  id: string,
): ((event: { preventDefault: () => void }) => void) | undefined {
  if (!onOpen) return undefined;
  return (event) => {
    event.preventDefault();
    onOpen(id);
  };
}

export function LeaderboardIndex({
  rows,
  onOpen,
}: {
  rows?: PublicListRow[];
  onOpen?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["leaderboard-public-list"],
    networkMode: "always",
    retry: false,
    enabled: rows === undefined,
    queryFn: () => leaderboardCall<PublicListRow[]>("leaderboard_public_list"),
    refetchInterval: rows === undefined ? 20_000 : false,
  });
  const listed = (rows ?? query.data)
    ?.filter((row) => row.status === "active")
    .slice()
    .sort((a, b) => {
      const rank = boardOrder(a) - boardOrder(b);
      if (rank !== 0) return rank;
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });
  const now = useNow(
    Boolean(
      listed?.some(
        (row) => row.status === "active" || row.status === "closing" || row.status === "scheduled",
      ),
    ),
  );
  const featured = listed?.[0];
  const rest = listed?.slice(1) ?? [];
  const warm = (id: string) => {
    if (rows === undefined) prefetchPublicBoard(qc, id);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker font-display text-xs uppercase tracking-widest text-primary-soft">
            Races
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">Leaderboards</h1>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-muted-foreground sm:block">
          Settled real-money stakes. Rankings refresh about every 15 seconds.
        </p>
      </div>
      {rows === undefined && query.isLoading ? (
        <ul className="mt-6 grid gap-3" aria-hidden>
          <li className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </ul>
      ) : null}
      {rows === undefined && query.error ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <p>{leaderboardError(query.error, "Unable to load leaderboards.")}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {listed && listed.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No public leaderboards right now.
        </p>
      ) : null}
      {featured ? (
        <Link
          to="/leaderboards/$campaignId"
          params={{ campaignId: featured.id }}
          className="mt-5 block overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-[0_0_32px_-18px] shadow-primary"
          onClick={openBoard(onOpen, featured.id)}
          onMouseEnter={() => warm(featured.id)}
          onFocus={() => warm(featured.id)}
          onTouchStart={() => warm(featured.id)}
        >
          <div className="bg-[radial-gradient(80%_120%_at_100%_0%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_55%),linear-gradient(160deg,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_42%)] p-4">
            <div className="flex items-center justify-between gap-3">
              <StatusChip status={featured.status} />
              <span className="text-xs text-muted-foreground">
                {featured.participants} {featured.participants === 1 ? "player" : "players"}
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">
              {featured.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">@{featured.partner_username}</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-soft">
                  Prize pool
                </p>
                <p className="mt-0.5 font-display text-3xl tabular text-gold">
                  {formatUsd(featured.prize_pool_cents)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {clockLabel(featured.status)}
                </p>
                <p className="mt-0.5 font-display text-xl tabular">
                  <Clock
                    now={now}
                    status={featured.status}
                    startsAt={featured.starts_at}
                    endsAt={featured.ends_at}
                  />
                </p>
              </div>
            </div>
          </div>
        </Link>
      ) : null}
      {rest.length > 0 ? (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rest.map((row) => (
            <li key={row.id}>
              <Link
                to="/leaderboards/$campaignId"
                params={{ campaignId: row.id }}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-primary/5"
                onClick={openBoard(onOpen, row.id)}
                onMouseEnter={() => warm(row.id)}
                onFocus={() => warm(row.id)}
                onTouchStart={() => warm(row.id)}
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-base">{row.name}</h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    @{row.partner_username} · {row.participants}{" "}
                    {row.participants === 1 ? "player" : "players"}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <StatusChip status={row.status} />
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-base tabular text-gold">
                    {formatUsd(row.prize_pool_cents)}
                  </p>
                  <p className="text-xs tabular text-muted-foreground">
                    <Clock
                      now={now}
                      status={row.status}
                      startsAt={row.starts_at}
                      endsAt={row.ends_at}
                    />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PrizeText({ row, final }: { row: BoardRow; final: boolean }) {
  if (row.prize_cents == null)
    return <span className="text-muted-foreground">{final ? "No prize" : "—"}</span>;
  return (
    <span className="tabular">
      {formatUsd(row.prize_cents)} · {payoutLabel(row.payout_status, final)}
    </span>
  );
}

function PodiumSeat({ row, rank }: { row: BoardRow | null; rank: 1 | 2 | 3 }) {
  const first = rank === 1;
  return (
    <div
      className={cn(
        "flex min-w-0 rounded-xl border",
        first
          ? "col-span-2 flex-row items-center gap-3 border-gold/50 bg-[linear-gradient(105deg,color-mix(in_oklab,var(--gold)_24%,transparent),transparent_62%)] px-3 py-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-col sm:px-2 sm:pb-0 sm:pt-3 sm:text-center"
          : rank === 2
            ? "flex-col items-center border-border bg-background/50 px-2 pb-0 pt-3 text-center sm:col-start-1 sm:row-start-1"
            : "flex-col items-center border-rival/30 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--rival)_16%,transparent),transparent_72%)] px-2 pb-0 pt-3 text-center",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          first ? "items-start sm:items-center" : "items-center",
        )}
      >
        <span
          className={cn(
            "font-display text-xs uppercase tracking-[0.16em]",
            first ? "text-gold" : "text-muted-foreground",
          )}
        >
          {placeName(rank, rank)}
        </span>
        {row ? (
          <>
            <span className={cn(first ? "mt-2 sm:mt-3" : "mt-3")}>
              <PlayerAvatar
                src={row.avatar_url}
                name={row.username}
                className={first ? "h-14 w-14 text-lg" : "h-9 w-9 text-sm"}
              />
            </span>
            <span className="mt-2 flex max-w-full items-center gap-1 sm:justify-center">
              <span className="truncate text-sm font-semibold">@{row.username}</span>
              {row.is_me ? (
                <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                  You
                </span>
              ) : null}
            </span>
            <span className="mt-1 text-xs tabular text-muted-foreground">
              {formatUsd(row.qualifying_cents)}
            </span>
            {row.prize_cents != null ? (
              <span
                className={cn("mt-1 font-display text-sm tabular", first && "text-lg text-gold")}
              >
                {formatUsd(row.prize_cents)}
              </span>
            ) : null}
          </>
        ) : (
          <span className="mt-3 flex items-center gap-3 sm:flex-col">
            <span
              className={cn(
                "grid place-items-center rounded-full border border-dashed border-border text-muted-foreground",
                first ? "h-10 w-10" : "h-8 w-8",
              )}
              aria-hidden
            >
              {first ? <Crown className="h-5 w-5 text-gold" /> : null}
            </span>
            <span className="text-sm text-muted-foreground">Open</span>
          </span>
        )}
      </div>
      <span
        className={cn(
          "hidden w-full rounded-b-[0.9rem] sm:block",
          first
            ? "mt-3 h-8 bg-gold/30"
            : rank === 2
              ? "mt-3 h-5 bg-foreground/10"
              : "mt-3 h-3 bg-rival/20",
        )}
        aria-hidden
      />
    </div>
  );
}

function Podium({ rows }: { rows: BoardRow[] }) {
  const seat = (rank: 1 | 2 | 3) => rows.find((entry) => entry.rank === rank) ?? null;
  return (
    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 sm:gap-3">
      <PodiumSeat rank={1} row={seat(1)} />
      <PodiumSeat rank={2} row={seat(2)} />
      <PodiumSeat rank={3} row={seat(3)} />
    </div>
  );
}

export function LeaderboardBoard({
  campaignId,
  preview,
}: {
  campaignId: string;
  preview?: PublicBoard;
}) {
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["leaderboard-board", campaignId, page],
    networkMode: "always",
    retry: false,
    enabled: preview === undefined,
    queryFn: () =>
      leaderboardCall<PublicBoard>("leaderboard_public_board", {
        p_campaign: campaignId,
        p_limit: PAGE,
        p_offset: page * PAGE,
      }),
    refetchInterval: preview === undefined ? 20_000 : false,
  });
  const loaded = preview ?? query.data;
  const board = loaded
    ? preview
      ? { ...loaded, rows: loaded.rows.slice(page * PAGE, (page + 1) * PAGE) }
      : loaded
    : undefined;
  const live =
    board?.campaign.status === "active" ||
    board?.campaign.status === "closing" ||
    board?.campaign.status === "scheduled";
  const now = useNow(Boolean(live));
  const final =
    board?.campaign.status === "completed" ||
    board?.campaign.status === "cancelled" ||
    board?.campaign.status === "under_review" ||
    board?.campaign.status === "settling";
  const standings =
    board && page === 0 ? board.rows.filter((row) => row.rank > 3) : (board?.rows ?? []);
  const meVisible =
    (board?.rows.some((row) => row.is_me) ?? false) ||
    (board?.podium.some((row) => row.is_me) ?? false);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link to="/leaderboards" className="text-sm text-primary hover:underline">
        All leaderboards
      </Link>
      {preview === undefined && query.isLoading ? <BoardSkeleton /> : null}
      {query.error ? (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
          <p>{leaderboardError(query.error, "Unable to load this leaderboard.")}</p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {board ? (
        <div className="mt-4">
          <header className="overflow-hidden rounded-2xl border border-primary/35 bg-card shadow-[0_0_32px_-18px] shadow-primary">
            <div className="bg-[radial-gradient(70%_120%_at_100%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_50%),linear-gradient(165deg,color-mix(in_oklab,var(--gold)_14%,transparent),transparent_40%)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-soft">
                  <PlayerAvatar
                    src={board.partner.avatar_url}
                    name={board.partner.username}
                    className="h-6 w-6 text-[10px]"
                  />
                  <span className="truncate">@{board.partner.username}</span>
                </p>
                <StatusChip status={board.campaign.status} />
              </div>
              <h1 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">
                {board.campaign.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {board.campaign.description ||
                  "Ranked from settled real-money stakes in this window."}
              </p>
              {board.campaign.games && board.campaign.games.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {board.campaign.games.map((game) => (
                    <li
                      key={game}
                      className="rounded-full border border-border bg-background/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {GAME_LABEL[game] ?? game}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-soft">
                    Prize pool
                  </p>
                  <p className="mt-0.5 font-display text-3xl tabular text-gold">
                    {formatUsd(board.campaign.prize_pool_cents)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {clockLabel(board.campaign.status)}
                    </dt>
                    <dd className="font-display text-lg tabular">
                      <Clock
                        now={now}
                        status={board.campaign.status}
                        startsAt={board.campaign.starts_at}
                        endsAt={board.campaign.ends_at}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Players
                    </dt>
                    <dd className="font-display text-lg tabular">{board.participants}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              {board.me ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Your place </span>
                  <span className="font-display text-lg">#{board.me.rank ?? "—"}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="tabular">
                    {formatUsd(board.me.qualifying_cents)} from deposits
                  </span>
                  {board.me.prize_cents != null ? (
                    <span className="text-gold">
                      {" "}
                      · {formatUsd(board.me.prize_cents)}{" "}
                      {payoutLabel(board.me.payout_status, Boolean(final))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground"> · No prize at this rank</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in and wager in this window to take a place.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Updated <LocalTime iso={board.campaign.ranked_at} />
              </p>
            </div>
          </header>

          {board.campaign.status === "cancelled" ? (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
              This campaign was cancelled. Unpaid prizes were not sent.
            </p>
          ) : null}
          {board.campaign.status === "suspended" ? (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
              This campaign is paused. New wagers are not being counted.
            </p>
          ) : null}
          {board.campaign.status === "under_review" ? (
            <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
              Final rankings are frozen. One or more payouts still need review, so they are not
              marked paid.
            </p>
          ) : null}

          <section aria-label="Podium" className="mt-4">
            <h2 className="section-kicker mb-3 font-display text-xs uppercase tracking-widest">
              Podium
            </h2>
            <Podium rows={board.podium} />
          </section>

          {board.tiers.length > 0 ? (
            <section aria-label="Prizes" className="mt-4" id="prizes">
              <h2 className="section-kicker mb-3 font-display text-xs uppercase tracking-widest">
                Prizes
              </h2>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {board.tiers.map((tier) => (
                  <li
                    key={`${tier.rank_start}-${tier.rank_end}`}
                    className="min-w-[6.5rem] shrink-0 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {placeName(tier.rank_start, tier.rank_end)}
                    </p>
                    <p className="mt-1 font-display text-lg tabular text-gold">
                      {formatUsd(tier.reward_cents)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                {final
                  ? "These are the frozen prizes. Paid means the ledger credit exists."
                  : "These amounts are paid when the race settles. Wager the prize once before withdrawing it."}
              </p>
            </section>
          ) : null}

          <section aria-label="Standings" className={cn("mt-5", board.total === 0 && "hidden")}>
            <h2 className="section-kicker mb-3 font-display text-xs uppercase tracking-widest">
              The field
            </h2>
            {board.me && !meVisible ? (
              <p className="mb-2 text-xs text-muted-foreground">Your row is on another page.</p>
            ) : null}
            <div className="mb-2 hidden items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:flex">
              <span className="w-10">Rank</span>
              <span className="min-w-0 flex-1">Player</span>
              <span className="w-28 text-right">Wagered</span>
              <span className="w-40 text-right">{final ? "Prize" : "Reward"}</span>
            </div>
            <ul className="max-h-[65.5rem] space-y-1.5 overflow-auto">
              {standings.length === 0 ? (
                <li className="rounded-2xl border border-border px-3 py-6 text-sm text-muted-foreground">
                  {board.total === 0
                    ? "No qualifying wagers yet. The podium is open."
                    : page === 0
                      ? "No one else is ranked yet."
                      : "No ranked players on this page."}
                </li>
              ) : (
                standings.map((row) => (
                  <li
                    key={row.rank}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2 sm:h-14 sm:py-0",
                      row.is_me && "border-primary/60 ring-1 ring-primary",
                    )}
                  >
                    <span className="w-10 shrink-0 font-display text-sm tabular text-muted-foreground">
                      {row.rank}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <PlayerAvatar
                        src={row.avatar_url}
                        name={row.username}
                        className="h-9 w-9 text-sm"
                      />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold">@{row.username}</span>
                          {row.is_me ? (
                            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                              You
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs tabular text-muted-foreground sm:hidden">
                          {formatUsd(row.qualifying_cents)} from deposits
                        </span>
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 text-right text-sm tabular sm:block">
                      {formatUsd(row.qualifying_cents)}
                    </span>
                    <span className="w-28 shrink-0 text-right text-xs font-semibold sm:w-40 sm:text-sm">
                      <PrizeText row={row} final={Boolean(final)} />
                    </span>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{board.total} ranked</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(page + 1) * PAGE >= board.total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </section>

          <details className="mt-4 rounded-xl border border-border bg-card px-3 py-2.5" id="rules">
            <summary className="cursor-pointer font-medium">Rules</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {board.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
