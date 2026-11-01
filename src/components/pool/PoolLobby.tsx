import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, RefreshCw, ShieldCheck, Target, Trophy, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import room from "@/assets/pool/room.webp";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { PoolTable } from "@/components/pool/PoolTable";
import { useAuth } from "@/lib/auth";
import {
  STAKES,
  fetchMyPool,
  money,
  poolMessage,
  usePoolLobby,
  type OpenTable,
} from "@/lib/pool/api";
import { formatCents, parseStakeDollars, stakeDraft, stakeQuote } from "@/lib/pool/copy";
import { enterPool } from "@/lib/pool/pool.functions";
import { SHOWCASE_AIM, SHOWCASE_BALLS, SHOWCASE_POWER } from "@/lib/pool/showcase";
import "./practice.css";

const BALLS = [
  { n: "1", pip: "#f0c410" },
  { n: "2", pip: "#1d4ed8" },
  { n: "3", pip: "#dc2626" },
  { n: "4", pip: "#7c3aed" },
  { n: "5", pip: "#ea580c" },
  { n: "6", pip: "#15803d" },
  { n: "7", pip: "#9b2226" },
  { n: "8", pip: "#111111" },
] as const;

const FACTS = [
  { icon: Users, kicker: "Play", text: "1v1 matches for real stakes" },
  { icon: Trophy, kicker: "Win", text: "95% to the winner, 5% fee" },
  { icon: Target, kicker: "Skill", text: "Pure skill-based gameplay" },
  { icon: ShieldCheck, kicker: "Fair", text: "Provably fair rack and replay" },
] as const;

function timeLeft(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "closing";
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function BallPips() {
  return (
    <span className="pool-pips" aria-hidden>
      {BALLS.map((ball) => (
        <i key={ball.n} className="is-solid is-down" style={{ ["--pip" as string]: ball.pip }}>
          <span>{ball.n}</span>
        </i>
      ))}
    </span>
  );
}

function SeatFace({
  name,
  src,
  open,
}: {
  name: string;
  src?: string | null | undefined;
  open?: boolean | undefined;
}) {
  if (open) {
    return (
      <span className="pool-seat-open" aria-hidden>
        <UserRound />
      </span>
    );
  }
  return (
    <PlayerAvatar
      name={name}
      src={src}
      color="#c084fc"
      className="pool-seat-face rounded-full"
      priority
    />
  );
}

function Seat({
  name,
  src,
  amount,
  open,
  align,
}: {
  name: string;
  src?: string | null | undefined;
  amount: string;
  open?: boolean | undefined;
  align: "start" | "end";
}) {
  const face = <SeatFace name={name} src={src} open={open} />;
  return (
    <div className={align === "end" ? "pool-seat is-end" : "pool-seat"}>
      {align === "start" ? face : null}
      <div>
        <strong>{name}</strong>
        <span>{amount}</span>
        <BallPips />
      </div>
      {align === "end" ? face : null}
    </div>
  );
}

export function PoolLobby() {
  const { userId, profile } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const lobby = usePoolLobby();
  const open = useServerFn(enterPool);
  const [draft, setDraft] = useState("5");
  const [panel, setPanel] = useState<"games" | "create">("games");
  const [busy, setBusy] = useState<number | "play" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const keys = useRef(new Map<string, string>());
  const seenStatus = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const mine = useQuery({
    queryKey: ["pool-mine", userId],
    queryFn: () => fetchMyPool(userId!),
    enabled: !!userId,
    refetchInterval: (q) =>
      q.state.data?.status === "WAITING" && q.state.data.creator_id === userId ? 4_000 : 20_000,
  });
  const stakes = lobby.data?.stakes?.length ? lobby.data.stakes : [...STAKES];
  const stakeMin = Math.min(...stakes);
  const stakeMax = Math.max(...stakes);
  const stake = parseStakeDollars(draft, stakeMin, stakeMax);
  const openTables = [...(lobby.data?.open ?? [])].sort((a, b) => {
    const rank = (table: OpenTable) => (stake != null && table.stake === stake ? 0 : 1);
    return rank(a) - rank(b) || a.id - b.id;
  });
  const featured = openTables.find((table) => table.stake === stake) ?? openTables[0] ?? null;
  const shownStake = featured?.stake ?? stake ?? stakes[0] ?? 500;
  const quote = stake == null ? null : stakeQuote(stake);
  const youName = profile?.username || "Your seat";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const row = mine.data;
    if (!row || !userId || row.creator_id !== userId) return;
    const prev = seenStatus.current;
    seenStatus.current = `${row.id}:${row.status}`;
    if (prev === `${row.id}:WAITING` && (row.status === "STARTING" || row.status === "PLAYING")) {
      void navigate({ to: "/pool/$matchId", params: { matchId: String(row.id) } });
    }
  }, [mine.data, navigate, userId]);

  const refreshLobby = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["pool-lobby"] });
    } finally {
      setRefreshing(false);
    }
  };

  const warmMatch = () => {
    for (const path of ["/pool", "/pool/$matchId"]) {
      const route = (router.routesByPath as unknown as Record<string, unknown>)[path];
      if (route) void router.loadRouteChunk(route as never)?.catch(() => {});
    }
  };

  const enter = async (input: { stake?: number; matchId?: number }) => {
    if (!userId) {
      void navigate({ to: "/auth" });
      return;
    }
    if (busy != null) return;
    const token = input.matchId != null ? `join:${input.matchId}` : `play:${input.stake ?? ""}`;
    const key = keys.current.get(token) ?? crypto.randomUUID();
    keys.current.set(token, key);
    setBusy(input.matchId ?? "play");
    try {
      const result = await open({ data: { ...input, key } });
      if (!result.ok) {
        keys.current.delete(token);
        toast.error(poolMessage(result.error));
        return;
      }
      keys.current.delete(token);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["pool-lobby"] });
      void navigate({ to: "/pool/$matchId", params: { matchId: String(result.matchId) } });
    } catch {
      toast.error(poolMessage("REQUEST_FAILED"));
    } finally {
      setBusy(null);
    }
  };

  const createGame = () => {
    if (stake == null) return;
    void enter({ stake });
  };

  return (
    <section className="pool-stage" aria-labelledby="pool-title">
      <div className="pool-stage-room" aria-hidden>
        <img src={room} alt="" width={1280} height={720} decoding="async" fetchPriority="high" />
      </div>
      <div className="pool-stage-shade" aria-hidden />

      <div className="pool-stage-body">
        <div className="pool-stage-copy">
          <h1 id="pool-title" className="pool-stage-title">
            <span className="pool-stage-eight" aria-hidden>
              <span>8</span>
            </span>
            <span className="pool-stage-word">Pool</span>
          </h1>
          <p className="pool-stage-sub">Real players. Real skills. Real wins.</p>
          <Link to="/pool/practice" preload="intent" className="pool-practice-link">
            <Target size={18} aria-hidden /> Practice
          </Link>
          <ul className="pool-stage-facts">
            {FACTS.map((fact) => {
              const Icon = fact.icon;
              return (
                <li key={fact.kicker}>
                  <span className="pool-stage-fact-icon">
                    <Icon aria-hidden />
                  </span>
                  <span>
                    <strong>{fact.kicker}</strong>
                    <span>{fact.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pool-stage-table">
          <div className="pool-stage-vs" aria-label="Preview matchup">
            <Seat
              align="start"
              name={featured ? featured.username : youName}
              src={featured ? featured.avatar_url : profile?.avatar_url}
              amount={formatCents(shownStake)}
            />
            <span className="pool-stage-vs-mark">VS</span>
            <Seat align="end" name="Open seat" amount={formatCents(shownStake)} open />
          </div>
          <div className="pool-stage-felt" aria-hidden>
            <PoolTable
              interactive={false}
              balls={SHOWCASE_BALLS}
              angleMilli={SHOWCASE_AIM}
              power={SHOWCASE_POWER}
              spinX={0}
              spinY={0}
              ghost={null}
              kitchenOnly={false}
              calledPocket={null}
              showCue
              replay={null}
              stroke={null}
              placing={false}
              legalAt={() => false}
              onAim={() => {}}
              onPlace={() => {}}
              onSample={() => {}}
              onReplayDone={() => {}}
            />
          </div>
          <p className="sr-only">
            A preview of the 8-ball table, with the cue aimed at the rack and the aim guide on.
          </p>
        </div>

        <aside className="pool-stage-games" aria-labelledby="pool-open">
          <div className="pool-stage-tabs" role="tablist" aria-label="Lobby">
            <button
              type="button"
              role="tab"
              id="pool-tab-games"
              aria-selected={panel === "games"}
              aria-controls="pool-panel-games"
              onClick={() => setPanel("games")}
            >
              Open games
            </button>
            <button
              type="button"
              role="tab"
              id="pool-tab-create"
              aria-selected={panel === "create"}
              aria-controls="pool-panel-create"
              onClick={() => setPanel("create")}
            >
              Create game
            </button>
          </div>

          {panel === "games" ? (
            <div
              className="pool-stage-panel"
              role="tabpanel"
              id="pool-panel-games"
              aria-labelledby="pool-tab-games"
            >
              <div className="pool-stage-panel-head">
                <h2 id="pool-open">
                  Open games
                  <span className="pool-count">{openTables.length}</span>
                </h2>
                <button
                  type="button"
                  className={refreshing ? "pool-refresh is-spin" : "pool-refresh"}
                  aria-label="Refresh open games"
                  onClick={() => void refreshLobby()}
                >
                  <RefreshCw aria-hidden />
                </button>
              </div>
              <ul>
                {openTables.length === 0 ? (
                  <li className="pool-stage-empty">
                    <p>{lobby.isError ? "Reconnecting to the lobby." : "No open games yet."}</p>
                    <button type="button" onClick={() => setPanel("create")}>
                      Create a game
                    </button>
                  </li>
                ) : (
                  openTables.map((table) => {
                    const own = table.creator_id === userId;
                    return (
                      <li key={table.id}>
                        <PlayerAvatar
                          name={table.username}
                          src={table.avatar_url}
                          color="#c084fc"
                          className="pool-row-face rounded-full"
                        />
                        <div className="pool-row-who">
                          <strong>{table.username}</strong>
                          <span>
                            {formatCents(table.stake)}
                            <span className="pool-row-time" suppressHydrationWarning>
                              {" "}
                              · {timeLeft(table.expires_at, now)}
                            </span>
                          </span>
                          <BallPips />
                        </div>
                        {own ? (
                          <Link
                            to="/pool/$matchId"
                            params={{ matchId: String(table.id) }}
                            className="pool-join"
                            onMouseEnter={warmMatch}
                            onFocus={warmMatch}
                          >
                            Open
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="pool-join"
                            disabled={busy != null}
                            onMouseEnter={warmMatch}
                            onFocus={warmMatch}
                            onTouchStart={warmMatch}
                            onClick={() => void enter({ matchId: table.id })}
                          >
                            {busy === table.id ? "…" : "Join"}
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : (
            <div
              className="pool-stage-panel"
              role="tabpanel"
              id="pool-panel-create"
              aria-labelledby="pool-tab-create"
            >
              <div className="pool-stage-panel-head">
                <h2 id="pool-open">Create game</h2>
              </div>
              <div className="pool-stage-create">
                <p id="pool-stake-label" className="pool-stake-label">
                  Stake amount
                </p>
                <div className="pool-stakes" role="group" aria-labelledby="pool-stake-label">
                  {stakes.map((cents) => (
                    <button
                      key={cents}
                      type="button"
                      aria-pressed={stake === cents}
                      onClick={() => setDraft(stakeDraft(cents))}
                      className={stake === cents ? "pool-stake is-on" : "pool-stake"}
                    >
                      {money(cents)}
                    </button>
                  ))}
                </div>
                <label className="pool-stake-custom">
                  <span aria-hidden>$</span>
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label="Your amount"
                    placeholder="Your amount"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </label>
                {quote == null ? (
                  <p>Enter an amount from $1 to $50.</p>
                ) : (
                  <>
                    <p>
                      Open a table at <strong>{formatCents(quote.stake)}</strong>.
                    </p>
                    <p>
                      The winner is paid <strong>{formatCents(quote.payout)}</strong>. The fee is{" "}
                      {formatCents(quote.fee)}.
                    </p>
                    <p>If nobody joins within 24 hours, the stake is refunded.</p>
                  </>
                )}
                <button
                  type="button"
                  className="pool-play"
                  disabled={busy != null || stake == null}
                  onMouseEnter={warmMatch}
                  onFocus={warmMatch}
                  onTouchStart={warmMatch}
                  onClick={createGame}
                >
                  {busy === "play" ? "Creating…" : "Create game"}
                  {busy === "play" ? null : <ArrowRight aria-hidden />}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
