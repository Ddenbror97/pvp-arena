import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Coins, Shield, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/pool/hero.webp";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { useAuth } from "@/lib/auth";
import { STAKES, money, poolMessage, usePoolLobby, type OpenTable } from "@/lib/pool/api";
import { formatCents, POOL_RULES, stakeQuote } from "@/lib/pool/copy";
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

const FEATURES = [
  { icon: Zap, title: "PVP matches", text: "Real players, real money" },
  { icon: Trophy, title: "Skill based", text: "Show your skills and climb the ranks" },
  { icon: Coins, title: "Instant games", text: "Quick matches anytime" },
  { icon: Shield, title: "Fair & secure", text: "Committed rack, replayed shots" },
] as const;

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
      <section className="pool-hero" aria-labelledby="pool-wordmark">
        <img
          src={hero}
          alt=""
          width={1280}
          height={720}
          decoding="async"
          fetchPriority="high"
          className="pool-hero-art"
        />
        <div className="pool-hero-shade" aria-hidden />
        <div className="pool-hero-copy">
          <p id="pool-wordmark" className="pool-wordmark">
            <span className="pool-eight" aria-hidden>
              <svg className="pool-crown" viewBox="0 0 64 36" fill="none">
                <path
                  d="M6 28 L10 10 L22 20 L32 4 L42 20 L54 10 L58 28 Z"
                  fill="url(#pool-gold)"
                  stroke="#f8e7a2"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M8 30 h48 v4 h-48 z" fill="url(#pool-gold)" />
                <circle cx="10" cy="10" r="2.2" fill="#fff4c8" />
                <circle cx="32" cy="5" r="2.4" fill="#fff4c8" />
                <circle cx="54" cy="10" r="2.2" fill="#fff4c8" />
                <defs>
                  <linearGradient id="pool-gold" x1="8" y1="4" x2="56" y2="32">
                    <stop stopColor="#fff1b8" />
                    <stop offset="0.45" stopColor="#f5c542" />
                    <stop offset="1" stopColor="#b8860b" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="pool-eight-ball">
                <span className="pool-eight-spot">8</span>
              </span>
            </span>
            <span className="pool-word">POOL</span>
          </p>
          <h1 className="pool-seo-h1">8 Ball Pool for Real Money (Crypto PvP)</h1>
          <p className="pool-tag">
            Real players <span aria-hidden>·</span> Real skills <span aria-hidden>·</span> Real wins
          </p>
          <ul className="pool-features">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="pool-feature">
                <span className="pool-feature-icon">
                  <feature.icon aria-hidden className="h-4 w-4" />
                </span>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pool-play"
            disabled={busy != null}
            onMouseEnter={warmMatch}
            onFocus={warmMatch}
            onTouchStart={warmMatch}
            onClick={() => void enter({ stake })}
          >
            {busy === "play" ? "Finding a match…" : "Play 8 Pool Now"}
            {busy === "play" ? null : <ArrowRight aria-hidden className="h-5 w-5" />}
          </button>
          <div className="pool-stakes" role="group" aria-label="Stake per player">
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
            You stake {formatCents(quote.stake)}. Pot {formatCents(quote.pot)}. Platform fee{" "}
            {formatCents(quote.fee)} (5%). Winner receives {formatCents(quote.payout)}. If nobody
            joins within 24 hours, the stake is refunded. Join an open table to play that
            opponent. Play takes the oldest open table at this stake, or opens a new one.
          </p>
        </div>
      </section>

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
      <section className="pool-rules" aria-label="8-ball rules">
        <h2>Rules</h2>
        <ul>
          {POOL_RULES.map((rule) => (
            <li key={rule.title}>
              <strong>{rule.title}. </strong>
              {rule.body}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
