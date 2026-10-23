import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Coins, Shield, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/pool/hero.webp";
import { useAuth } from "@/lib/auth";
import { STAKES, money, poolMessage, usePoolLobby } from "@/lib/pool/api";
import { formatCents, POOL_RULES, stakeQuote } from "@/lib/pool/copy";
import { enterPool } from "@/lib/pool/pool.functions";

const FEATURES = [
  { icon: Zap, title: "PVP matches", text: "Real players, real money" },
  { icon: Trophy, title: "Skill based", text: "Show your skills and climb the ranks" },
  { icon: Coins, title: "Instant games", text: "Quick matches anytime" },
  { icon: Shield, title: "Fair & secure", text: "Committed rack, replayed shots" },
] as const;

export function PoolLobby() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lobby = usePoolLobby();
  const open = useServerFn(enterPool);
  const [stake, setStake] = useState<number>(500);
  const [busy, setBusy] = useState(false);
  const stakes = lobby.data?.stakes?.length ? lobby.data.stakes : [...STAKES];
  const quote = stakeQuote(stake);
  const openTables = lobby.data?.open ?? [];
  const recent = lobby.data?.recent ?? [];

  const play = async () => {
    if (!userId) {
      void navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const result = await open({ data: { stake, key: crypto.randomUUID() } });
      if (!result.ok) {
        toast.error(poolMessage(result.error));
        return;
      }
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["pool-lobby"] });
      void navigate({ to: "/pool/$matchId", params: { matchId: String(result.matchId) } });
    } catch {
      toast.error(poolMessage("REQUEST_FAILED"));
    } finally {
      setBusy(false);
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
          <h1 id="pool-wordmark" className="pool-wordmark">
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
          </h1>
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
          <button type="button" className="pool-play" disabled={busy} onClick={() => void play()}>
            {busy ? "Finding a match…" : "Play 8 Pool Now"}
            {busy ? null : <ArrowRight aria-hidden className="h-5 w-5" />}
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
            {formatCents(quote.fee)} (5%). Winner receives {formatCents(quote.payout)}. Cancel
            before the break and both stakes are refunded.
          </p>
        </div>
      </section>

      <div className="pool-below">
        <section className="pool-side">
          <h2>Waiting for an opponent</h2>
          <ul>
            {openTables.length === 0 ? (
              <li>No open tables. Choose a stake and play to open one.</li>
            ) : (
              openTables.map((table) => (
                <li key={table.id}>
                  <span>{table.username}</span>
                  <span className="tabular">{money(table.stake)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="pool-side">
          <h2>Recent</h2>
          <ul>
            {recent.length === 0 ? (
              <li>No finished matches yet.</li>
            ) : (
              recent.map((match) => (
                <li key={match.id}>
                  <span>{match.winner ?? "Player"}</span>
                  <span>
                    {" "}
                    won {money(match.payout_amount)}
                    {match.fee_amount != null ? ` · fee ${money(match.fee_amount)}` : ""}
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
