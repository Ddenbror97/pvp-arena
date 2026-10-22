import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { STAKES, money, poolMessage, usePoolLobby } from "@/lib/pool/api";
import { enterPool } from "@/lib/pool/pool.functions";

export function PoolLobby() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lobby = usePoolLobby();
  const open = useServerFn(enterPool);
  const [stake, setStake] = useState<number>(500);
  const [busy, setBusy] = useState(false);
  const stakes = lobby.data?.stakes?.length ? lobby.data.stakes : [...STAKES];
  const fee = ((lobby.data?.fee_bps ?? 500) / 100).toString();

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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h1 className="font-display text-2xl">8-ball</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Two players, one table. The winner is whoever the rules name after the shots. The rack
          seed only places the balls. A {fee}% fee comes off the pot when someone wins, and the
          winner receives the rest.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stakes.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setStake(cents)}
              className={`min-h-11 rounded-lg border font-display text-sm ${
                stake === cents
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-foreground"
              }`}
            >
              {money(cents)}
            </button>
          ))}
        </div>
        <Button
          className="mt-4 min-h-11 w-full sm:w-auto"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Finding a match…" : userId ? `Play ${money(stake)}` : "Sign in to play"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Same rules at every stake. No house opponent. A waiting table is a real player.
        </p>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm uppercase tracking-widest">Waiting</h2>
          <ul className="mt-3 space-y-2">
            {(lobby.data?.open ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No open tables. Your stake opens one.
              </li>
            ) : (
              lobby.data?.open.map((table) => (
                <li key={table.id} className="flex items-center justify-between text-sm">
                  <span>{table.username}</span>
                  <span className="tabular text-muted-foreground">{money(table.stake)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm uppercase tracking-widest">Recent</h2>
          <ul className="mt-3 space-y-2">
            {(lobby.data?.recent ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No finished matches yet.</li>
            ) : (
              lobby.data?.recent.map((match) => (
                <li key={match.id} className="text-sm">
                  <span className="text-foreground">{match.winner ?? "Player"}</span>
                  <span className="text-muted-foreground"> won {money(match.payout_amount)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}
