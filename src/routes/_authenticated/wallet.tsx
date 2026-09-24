import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet, useWalletRealtime } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { friendlyError } from "@/lib/jackpot/errors";
import { Button } from "@/components/ui/button";
import { CryptoRails } from "@/components/wallet/CryptoRails";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — PVPspinArena" },
      { name: "description", content: "Your test-credit balance and full transaction ledger." },
      { property: "og:title", content: "Wallet — PVPspinArena" },
      { property: "og:description", content: "Your test-credit balance and full transaction ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

const KIND_LABEL: Record<string, string> = {
  test_credit_grant: "Test credits",
  jackpot_entry: "Jackpot entry",
  jackpot_settlement: "Jackpot settlement",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  refund: "Refund",
};

function WalletPage() {
  const { userId } = useAuth();
  useWalletRealtime(userId);
  const wallet = useWallet(userId);
  const qc = useQueryClient();
  const ids = wallet.data?.accountIds ?? [];
  const kindById = new Map<string, string>();
  const history = useQuery({
    queryKey: ["ledger", userId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data: accts } = await supabase.from("wallet_accounts").select("id, kind").in("id", ids);
      accts?.forEach((a) => kindById.set(a.id, a.kind));
      const { data, error } = await supabase
        .from("ledger_postings")
        .select("id, amount, balance_after, created_at, account_id, ledger_transactions(kind, memo, game_id)")
        .in("account_id", ids)
        .order("id", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((p) => ({ ...p, accountKind: kindById.get(p.account_id) }));
    },
  });

  async function claim() {
    const { error } = await supabase.rpc("claim_test_credits");
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Test credits added");
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl">Wallet</h1>
        <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-bold tracking-wider text-gold">TEST CREDITS</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Test credits have no cash value, cannot be withdrawn and cannot be transferred. Real-money play is disabled.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Available</div>
          <div className="tabular mt-1 text-3xl font-semibold">{formatUsd(wallet.data?.available ?? 0)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Locked in game</div>
          <div className="tabular mt-1 text-3xl font-semibold">{formatUsd(wallet.data?.locked ?? 0)}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={claim} className="font-display">Claim hourly test credits</Button>
      </div>

      <CryptoRails availableCents={wallet.data?.available ?? 0} />

      <h2 className="mt-10 font-display text-sm uppercase tracking-widest">Transactions</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {history.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : !history.data?.length ? (
          <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.data.map((p) => {
              const tx = p.ledger_transactions as { kind: string; memo: string | null; game_id: number | null } | null;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {KIND_LABEL[tx?.kind ?? ""] ?? tx?.kind}
                      <span className="ml-2 text-xs text-muted-foreground">{p.accountKind === "user_locked" ? "locked" : "available"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                      {tx?.game_id && (
                        <>
                          {" · "}
                          {tx.kind.startsWith("coinflip") ? (
                            <Link to="/coinflip/$gameId" params={{ gameId: String(tx.game_id) }} className="hover:text-foreground">
                              Coinflip #{tx.game_id}
                            </Link>
                          ) : (
                            <Link to="/games/$gameId" params={{ gameId: String(tx.game_id) }} className="hover:text-foreground">
                              Jackpot #{tx.game_id}
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`tabular font-semibold ${p.amount > 0 ? "text-primary" : ""}`}>
                    {p.amount > 0 ? "+" : ""}
                    {formatUsd(p.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
