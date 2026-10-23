import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Percent, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/pool/hero.webp";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { useAuth } from "@/lib/auth";
import { STAKES, money, poolMessage, usePoolLobby, type OpenTable } from "@/lib/pool/api";
import { formatCents, stakeQuote } from "@/lib/pool/copy";
import { enterPool } from "@/lib/pool/pool.functions";

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

export function PoolLobby() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const lobby = usePoolLobby();
  const open = useServerFn(enterPool);
  const [stake, setStake] = useState<number>(500);
  const [busy, setBusy] = useState<number | "play" | null>(null);
  const keys = useRef(new Map<string, string>());
  const [now, setNow] = useState(() => Date.now());
  const stakes = lobby.data?.stakes?.length ? lobby.data.stakes : [...STAKES];
  const quote = stakeQuote(stake);
  const openTables = [...(lobby.data?.open ?? [])].sort((a, b) => {
    const rank = (table: OpenTable) => (table.stake === stake ? 0 : 1);
    return rank(a) - rank(b) || a.id - b.id;
  });
  const recent = lobby.data?.recent ?? [];

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  return (
    <div className="pool-lobby">
      <section className="pool-hero" aria-labelledby="pool-title">
        <div className="pool-hero-copy">
          <h1 id="pool-title" className="pool-hero-title">
            <span className="pool-hero-eight" aria-hidden>
              <span>8</span>
            </span>
            <span className="pool-hero-word">Pool</span>
          </h1>
          <p className="pool-hero-modes">
            8-ball <span aria-hidden>•</span> 1v1 <span aria-hidden>•</span> Call the 8
          </p>
          <p className="pool-hero-sub">Real players. Real skills. Real wins.</p>
          <button
            type="button"
            className="pool-play"
            disabled={busy != null}
            onMouseEnter={warmMatch}
            onFocus={warmMatch}
            onTouchStart={warmMatch}
            onClick={() => void enter({ stake })}
          >
            {busy === "play" ? "Finding a table…" : "Find a table"}
            {busy === "play" ? null : <ArrowRight aria-hidden className="h-4 w-4" />}
          </button>
        </div>

        <div className="pool-hero-art" aria-hidden>
          <span className="pool-hero-ball is-eight">
            <b>8</b>
          </span>
          <span className="pool-hero-ball is-cue" />
          <img
            src={hero}
            alt=""
            width={1280}
            height={720}
            decoding="async"
            fetchPriority="high"
            className="pool-hero-player"
          />
        </div>

        <div className="pool-hero-panel">
          <p className="pool-hero-panel-title">
            Play <span aria-hidden>•</span> Win <span aria-hidden>•</span> Repeat
          </p>
          <ul>
            <li>
              <span className="pool-hero-icon">
                <Timer aria-hidden />
              </span>
              <span className="pool-hero-feature-title">30s shots</span>
              <span className="pool-hero-feature-sub">Three timeouts forfeit</span>
            </li>
            <li>
              <span className="pool-hero-icon">
                <ShieldCheck aria-hidden />
              </span>
              <span className="pool-hero-feature-title">Provably fair</span>
              <span className="pool-hero-feature-sub">Committed rack, replayed shots</span>
            </li>
            <li>
              <span className="pool-hero-icon">
                <Percent aria-hidden />
              </span>
              <span className="pool-hero-feature-title">Fair fee</span>
              <span className="pool-hero-feature-sub">5% of the pot</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="pool-buyin">
        <p className="pool-buyin-label" id="pool-stake-label">
          Stake
        </p>
        <div className="pool-stakes" role="group" aria-labelledby="pool-stake-label">
          {stakes.map((cents) => (
            <button
              key={cents}
              type="button"
              aria-pressed={stake === cents}
              onClick={() => setStake(cents)}
              className={stake === cents ? "pool-stake is-on" : "pool-stake"}
            >
              {money(cents)}
            </button>
          ))}
        </div>
        <p className="pool-quote">
          You stake {formatCents(quote.stake)}. Pot {formatCents(quote.pot)}. Fee{" "}
          {formatCents(quote.fee)} (5%). Winner receives {formatCents(quote.payout)}. Play joins
          the oldest open table at this stake, or opens one. An empty table refunds after 24 hours.
        </p>
      </div>

      <div className="pool-below">
        <section className="pool-side" aria-labelledby="pool-open">
          <h2 id="pool-open">
            Open tables
            {openTables.length > 0 ? <span className="pool-open-count">{openTables.length}</span> : null}
          </h2>
          <ul>
            {openTables.length === 0 ? (
              <li>No open tables. Choose a stake and play to open one.</li>
            ) : (
              openTables.map((table) => {
                const mine = table.creator_id === userId;
                const payout = stakeQuote(table.stake).payout;
                return (
                  <li
                    key={table.id}
                    className={
                      table.stake === stake ? "pool-open is-stake" : "pool-open"
                    }
                  >
                    <PlayerAvatar
                      name={table.username}
                      src={table.avatar_url}
                      className="pool-open-face"
                    />
                    <div className="pool-open-who">
                      <strong>{table.username}</strong>
                      <span>
                        {mine ? "Your table · " : null}
                        Stake {money(table.stake)} · pot {money(table.pot)} · win {money(payout)}
                      </span>
                    </div>
                    <div className="pool-open-actions">
                      <span className="pool-open-time" suppressHydrationWarning>
                        {timeLeft(table.expires_at, now)}
                      </span>
                      {mine ? (
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
                          {busy === table.id ? "Joining…" : `Join ${money(table.stake)}`}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
        <section className="pool-side" aria-labelledby="pool-settled">
          <h2 id="pool-settled">Settled matches</h2>
          <p className="pool-settled-note">
            Fee on a finished match: {((lobby.data?.fee_bps ?? 500) / 100).toLocaleString("en-US")}%
            of the pot. This list is what the lobby returns. It does not publish a break-win rate.
          </p>
          <ul>
            {recent.length === 0 ? (
              <li>No finished matches yet.</li>
            ) : (
              recent.map((match) => (
                <li key={match.id}>
                  <span>{match.winner ?? "Player"}</span>
                  <span>
                    {" "}
                    won {money(match.payout_amount)} from a {money(match.pot)} pot
                    {match.fee_amount != null ? ` after a ${money(match.fee_amount)} fee` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
