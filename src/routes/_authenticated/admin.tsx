import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — PVPCasino" },
      { name: "description", content: "Read-only operations overview." },
      { property: "og:title", content: "Admin overview — PVPCasino" },
      { property: "og:description", content: "Read-only operations overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

interface Overview {
  open_games: number;
  drawing_games: number;
  completed_games: number;
  total_volume: number;
  players: number;
  failed_payouts: number;
  ledger_sum: number;
  escrow_balance: number;
  locked_total: number;
  open_pot_total: number;
  recent_audit: { id: number; action: string; game_id: number | null; created_at: string; details: unknown }[];
}

interface CoinflipOverview {
  waiting: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  failed_payouts: number;
  volume: number;
  open_locked: number;
  recent_games: {
    id: number; status: string; amount: number; creator_side: string; winning_side: string | null; payout_amount: number | null;
    server_seed_hash: string; created_at: string; completed_at: string | null; payout_status: string | null; payout_attempts: number | null;
  }[];
  recent_audit: { id: number; action: string; game_id: number | null; created_at: string; details: unknown }[];
}

function AdminPage() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
    retry: false,
  });
  const cf = useQuery({
    queryKey: ["admin-coinflip"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_coinflip_overview");
      if (error) throw error;
      return data as unknown as CoinflipOverview;
    },
    retry: false,
  });
  if (q.isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (q.error) return <p className="text-muted-foreground">You don't have access to this page.</p>;
  const d = q.data!;
  const reconciled = d.ledger_sum === 0 && d.escrow_balance === 0 && d.locked_total === d.open_pot_total + (cf.data?.open_locked ?? 0);
  return (
    <div>
      <h1 className="font-display text-2xl">Operations (read-only)</h1>
      <p className="mt-1 text-sm text-muted-foreground">No controls here can change a result or a balance.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Open games", d.open_games],
          ["Drawing", d.drawing_games],
          ["Completed", d.completed_games],
          ["Volume", formatUsd(d.total_volume)],
          ["Players", d.players],
          ["Failed payouts", d.failed_payouts],
          ["Locked funds", formatUsd(d.locked_total)],
          ["Open pots", formatUsd(d.open_pot_total)],
          ["Ledger sum", formatUsd(d.ledger_sum)],
          ["Reconciled", reconciled ? "Yes" : "NO"],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className={`tabular mt-1 text-lg font-semibold ${k === "Reconciled" && !reconciled ? "text-destructive" : ""}`}>{String(v)}</div>
          </div>
        ))}
      </div>
      {cf.data && (
        <>
          <h2 className="mt-10 font-display text-sm uppercase tracking-widest">Coinflip</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Waiting", cf.data.waiting],
              ["In progress", cf.data.in_progress],
              ["Completed", cf.data.completed],
              ["Cancelled", cf.data.cancelled],
              ["Failed payouts", cf.data.failed_payouts],
              ["Volume", formatUsd(cf.data.volume)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl border border-border bg-card p-4">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className="tabular mt-1 text-lg font-semibold">{String(v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="tabular w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>{["Game", "State", "Wager", "Creator side", "Result", "Payout", "Settlement", "Commitment", "Created"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cf.data.recent_games.map((g) => (
                  <tr key={g.id}>
                    <td className="px-3 py-2"><Link to="/coinflip/$gameId" params={{ gameId: String(g.id) }} className="hover:text-primary">#{g.id}</Link></td>
                    <td className="px-3 py-2">{g.status}</td>
                    <td className="px-3 py-2">{formatUsd(g.amount)}</td>
                    <td className="px-3 py-2">{g.creator_side}</td>
                    <td className="px-3 py-2">{g.winning_side ?? "—"}</td>
                    <td className="px-3 py-2">{g.payout_amount != null ? formatUsd(g.payout_amount) : "—"}</td>
                    <td className="px-3 py-2">{g.payout_status ? `${g.payout_status} (${g.payout_attempts})` : "—"}</td>
                    <td className="px-3 py-2">{g.server_seed_hash.slice(0, 12)}...</td>
                    <td className="px-3 py-2">{new Date(g.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h2 className="mt-10 font-display text-sm uppercase tracking-widest">Audit trail</h2>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {d.recent_audit.map((a) => (
          <li key={a.id} className="flex gap-3 px-4 py-2">
            <span className="tabular w-40 shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            <span className="w-36 shrink-0 font-medium">{a.action}</span>
            <span className="tabular truncate text-xs text-muted-foreground">
              {a.game_id ? `#${a.game_id} ` : ""}
              {JSON.stringify(a.details)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
