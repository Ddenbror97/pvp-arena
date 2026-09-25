import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWallet, useWalletRealtime } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { CryptoRails } from "@/components/wallet/CryptoRails";

export const Route = createFileRoute("/_authenticated/wallet")({
  // Header shortcuts deep-link straight to the requested action; anything else falls back to deposit.
  validateSearch: (search: Record<string, unknown>): { mode?: "deposit" | "withdraw" } => {
    const value = search["mode"];
    return value === "withdraw" || value === "deposit" ? { mode: value } : {};
  },
  head: () => ({
    meta: [
      { title: "Wallet — PVPspinArena" },
      { name: "description", content: "Your balance, deposits, withdrawals and full transaction ledger." },
      { property: "og:title", content: "Wallet — PVPspinArena" },
      { property: "og:description", content: "Your balance, deposits, withdrawals and full transaction ledger." },
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
  const { mode } = Route.useSearch();
  useWalletRealtime(userId);
  const wallet = useWallet(userId);
  const ids = wallet.data?.accountIds ?? [];
  const history = useQuery({
    queryKey: ["ledger", userId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      // Single request: account kind comes from the joined wallet account row.
      const { data, error } = await supabase
        .from("ledger_postings")
        .select("id, amount, balance_after, created_at, account_id, wallet_accounts(kind), ledger_transactions(kind, memo, game_id)")
        .in("account_id", ids)
        .order("id", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        accountKind: (p.wallet_accounts as { kind: string } | null)?.kind,
      }));
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl">Wallet</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Deposit USDC or ETH on Base to play. Winnings can be withdrawn back to your verified wallet.
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

      <CryptoRails availableCents={wallet.data?.available ?? 0} requestedMode={mode ?? "deposit"} />

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
