import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchGame, fetchPlayers } from "@/lib/jackpot/api";
import { formatChance, formatUsd } from "@/lib/jackpot/math";
import { verifyGame, type VerificationResult } from "@/lib/jackpot/fairness";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/games/$gameId")({
  head: ({ params }) => ({
    meta: [
      { title: `Game #${params.gameId} — PVPspinArena` },
      { name: "description", content: `Full audit record for jackpot game #${params.gameId}: players, stakes, winner and fairness proof.` },
      { property: "og:title", content: `Jackpot game #${params.gameId} — PVPspinArena` },
      { property: "og:description", content: "Players, stakes, winner and a verifiable fairness proof." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const { gameId } = Route.useParams();
  const id = Number(gameId);
  const q = useQuery({
    queryKey: ["game-detail", id],
    enabled: Number.isSafeInteger(id),
    queryFn: async () => {
      const [game, players, entries] = await Promise.all([
        fetchGame(id),
        fetchPlayers(id),
        supabase.from("jackpot_entries").select("user_id, amount, ticket_start, ticket_end, created_at").eq("game_id", id).order("ticket_start"),
      ]);
      return { game, players, entries: entries.data ?? [] };
    },
  });
  const [result, setResult] = useState<VerificationResult | null>(null);

  if (q.isLoading) return <p className="text-muted-foreground">Loading...</p>;
  const g = q.data?.game;
  if (!g) return <p className="text-muted-foreground">Game not found.</p>;
  const players = [...(q.data?.players ?? [])].sort((a, b) => b.total_amount - a.total_amount);
  const winner = players.find((p) => p.user_id === g.winner_id);
  const done = g.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to jackpot</Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl">Game #{g.id}</h1>
        <span className="rounded bg-secondary px-2 py-0.5 text-xs">{g.status}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Final pot" value={formatUsd(g.pot_amount)} />
        <Stat label="Players" value={String(g.player_count)} />
        <Stat label="Entries" value={String(g.entry_count)} />
        <Stat label="Payout" value={done ? formatUsd(g.payout_amount ?? 0) : "—"} />
      </div>

      {done && winner && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <PlayerAvatar src={winner.profiles?.avatar_url} name={winner.profiles?.username} className="h-16 w-16" color="var(--gold)" />
          <div>
            <div className="text-xs tracking-[0.3em] text-gold">WINNER</div>
            <div className="font-display text-xl">@{winner.profiles?.username}</div>
            <div className="tabular text-sm text-muted-foreground">
              {formatChance(g.winner_total ?? 0, g.pot_amount)} win chance · won {formatUsd(g.payout_amount ?? 0)}
            </div>
          </div>
        </div>
      )}

      <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row k="Created" v={new Date(g.created_at).toLocaleString()} />
        <Row k="Countdown started" v={g.countdown_started_at ? new Date(g.countdown_started_at).toLocaleString() : "—"} />
        <Row k="Closed" v={g.drawn_at ? new Date(g.drawn_at).toLocaleString() : "—"} />
        <Row k="Completed" v={g.completed_at ? new Date(g.completed_at).toLocaleString() : "—"} />
        <Row k="House fee" v={`${g.rake_bps / 100}%`} />
        <Row k="Winning ticket" v={g.winning_ticket != null ? `${g.winning_ticket} of ${g.pot_amount}` : "—"} />
      </dl>

      <h2 className="mt-10 font-display text-sm uppercase tracking-widest">Participants</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-right">Contribution</th>
              <th className="px-4 py-3 text-right">Entries</th>
              <th className="px-4 py-3 text-right">Final chance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players.map((p) => (
              <tr key={p.user_id} className={p.user_id === g.winner_id ? "bg-gold/5" : ""}>
                <td className="flex items-center gap-2 px-4 py-2.5">
                  <PlayerAvatar src={p.profiles?.avatar_url} name={p.profiles?.username} className="h-7 w-7" />@{p.profiles?.username}
                </td>
                <td className="tabular px-4 py-2.5 text-right">{formatUsd(p.total_amount)}</td>
                <td className="tabular px-4 py-2.5 text-right">{p.entry_count}</td>
                <td className="tabular px-4 py-2.5 text-right">{formatChance(p.total_amount, g.pot_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 font-display text-sm uppercase tracking-widest">Fairness proof</h2>
      <div className="mt-3 space-y-2 rounded-2xl border border-border bg-card p-5 text-sm">
        <Mono k="Seed commitment (SHA-256)" v={g.server_seed_hash} />
        <Mono k="Revealed server seed" v={g.server_seed ?? "hidden until the game completes"} />
        <Mono k="Message" v={`PVPCasino:jackpot:${g.protocol_version}:${g.id}:${g.draw_version}:<round>`} />
        <Mono k="Sampling round used" v={g.draw_counter != null ? String(g.draw_counter) : "—"} />
        <Button
          className="mt-3"
          disabled={!done}
          onClick={async () =>
            setResult(
              await verifyGame(
                { ...g, pot_amount: g.pot_amount, winning_ticket: g.winning_ticket },
                (q.data?.entries ?? []).map((e) => ({ user_id: e.user_id, ticket_start: e.ticket_start, ticket_end: e.ticket_end })),
              ),
            )
          }
        >
          Verify this game in your browser
        </Button>
        {result && (
          <ul className="mt-3 space-y-1.5">
            {result.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2">
                {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                <div>
                  <div>{c.label}</div>
                  <div className="tabular break-all text-xs text-muted-foreground">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}
function Mono({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="tabular break-all text-xs">{v}</div>
    </div>
  );
}
