import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cancelCryptoWithdrawal } from "@/lib/crypto/crypto.functions";
import { fundingStatusLabel } from "@/lib/crypto/cashout-copy";
import { formatCryptoUnits } from "@/lib/crypto/rails";
import { formatUsd } from "@/lib/jackpot/math";
import { useCryptoActivity, type CryptoActivity } from "@/components/wallet/RailPreference";
import { TokenMark } from "@/components/wallet/TokenMark";

const EXPLORERS: Record<number, string> = {
  8453: "https://basescan.org",
  1: "https://etherscan.io",
};
const KIND_LABEL: Record<string, string> = {
  jackpot_entry: "Jackpot entry",
  jackpot_settlement: "Jackpot settlement",
  coinflip_entry: "Coinflip entry",
  coinflip_settlement: "Coinflip settlement",
  coinflip_refund: "Coinflip refund",
  roulette_entry: "Roulette entry",
  roulette_settlement: "Roulette settlement",
  roulette_refund: "Roulette refund",
  prestige_reward: "Prestige reward",
  deposit: "Deposit",
  promo_reward: "Promo reward",
  withdrawal: "Withdrawal",
  refund: "Refund",
};

type FundingEvent = {
  id: string;
  title: string;
  asset: string;
  detail: string;
  status: string;
  at: string;
  usdCents: number;
  outgoing: boolean;
  txHash: string | null;
  chainId: number | null;
  cancelable: boolean;
  /** Unpaid invoices are not balance credits. */
  credited: boolean;
};

function compactUnits(units: string, decimals: number, asset: string) {
  const text = formatCryptoUnits(units, decimals, asset);
  const space = text.lastIndexOf(" ");
  const num = space < 0 ? text : text.slice(0, space);
  const suffix = space < 0 ? "" : text.slice(space);
  const [whole, frac = ""] = num.split(".");
  const shown = frac.length > 6 ? `${whole}.${frac.slice(0, 6)}` : num;
  return `${shown}${suffix}`;
}

function whenLabel(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return "Today";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string, type: string, txHash?: string | null) {
  return fundingStatusLabel(status, type, txHash);
}

export function fundingEvents(data: CryptoActivity | undefined): FundingEvent[] {
  if (!data) return [];
  const chains = data.chains;
  const rows: FundingEvent[] = [
    ...data.deposits.map((row) => {
      const known = chains
        .flatMap((item) => item.assets)
        .find((item) => item.asset_key === row.asset_key);
      return {
        id: row.id,
        title: `${row.asset_key} deposit`,
        asset: row.asset_key,
        detail: compactUnits(row.units, row.decimals ?? known?.decimals ?? 0, row.asset_key),
        status: statusLabel(row.status, "Deposit"),
        at: row.at,
        usdCents: row.usd_cents,
        outgoing: false,
        txHash: row.tx_hash,
        chainId: row.chain_id,
        cancelable: false,
        credited: true,
      };
    }),
    ...data.withdrawals.map((row) => {
      const known = chains
        .flatMap((item) => item.assets)
        .find((item) => item.asset_key === row.asset_key);
      return {
        id: row.id,
        title: `${row.asset_key} withdrawal`,
        asset: row.asset_key,
        detail: compactUnits(row.units, row.decimals ?? known?.decimals ?? 0, row.asset_key),
        status: statusLabel(row.status, "Withdrawal", row.tx_hash),
        at: row.at,
        usdCents: row.usd_cents,
        outgoing: true,
        txHash: row.tx_hash,
        chainId: row.chain_id,
        cancelable: ["PENDING", "APPROVED"].includes(row.status),
        credited: true,
      };
    }),
    ...data.bitcoin.map((row) => ({
      id: row.id,
      title: "BTC deposit",
      asset: "BTC",
      detail: row.btc_due ? `${row.btc_due} BTC` : "BTC",
      status: statusLabel(row.status, "Bitcoin"),
      at: row.at,
      usdCents: row.usd_cents,
      outgoing: false,
      txHash: null,
      chainId: null,
      cancelable: false,
      credited: row.status === "CREDITED",
    })),
    ...(data.card ?? []).map((row) => ({
      id: row.id,
      title: "USDC payment",
      asset: "USDC",
      detail: "USDC on Base",
      status: statusLabel(row.status, "USDC"),
      at: row.at,
      usdCents: row.usd_cents,
      outgoing: false,
      txHash: null,
      chainId: null,
      cancelable: false,
      credited: true,
    })),
    ...data.bitcoinPayouts.map((row) => ({
      id: row.id,
      title: "BTC cashout",
      asset: "BTC",
      detail: row.address ? `To ${row.address.slice(0, 6)}…${row.address.slice(-4)}` : "BTC",
      status: statusLabel(row.status, "Bitcoin cashout"),
      at: row.at,
      usdCents: row.usd_cents,
      outgoing: true,
      txHash: null,
      chainId: null,
      cancelable: false,
      credited: true,
    })),
  ];
  return rows.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function TxLink({ hash, chainId }: { hash: string | null; chainId: number | null }) {
  if (!hash) return null;
  const explorer = EXPLORERS[chainId ?? 8453] ?? "https://basescan.org";
  return (
    <a
      href={`${explorer}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
    >
      {hash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function statusClass(status: string) {
  if (
    status === "Failed" ||
    status === "Rejected" ||
    status === "Cancelled" ||
    status === "Expired"
  )
    return "text-destructive";
  if (status === "Sent" || status === "Credited" || status === "Refunded" || status === "Confirmed")
    return "text-emerald-600";
  return "text-primary";
}

function EventRow({
  event,
  onCancel,
}: {
  event: FundingEvent;
  onCancel?: ((id: string) => void) | undefined;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {event.status} · {whenLabel(event.at)}
          {event.detail ? ` · ${event.detail}` : ""}
          {event.txHash ? (
            <>
              {" "}
              · <TxLink hash={event.txHash} chainId={event.chainId} />
            </>
          ) : null}
        </p>
      </div>
      {event.cancelable && onCancel ? (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2"
          onClick={() => onCancel(event.id)}
        >
          Cancel
        </Button>
      ) : null}
      <span
        className={`tabular shrink-0 text-sm font-semibold ${event.credited ? (event.outgoing ? "" : "text-primary") : "text-muted-foreground"}`}
      >
        {event.credited ? (event.outgoing ? "−" : "+") : ""}
        {formatUsd(event.usdCents)}
      </span>
    </li>
  );
}

export function RecentFunding() {
  const activity = useCryptoActivity(true);
  const events = fundingEvents(activity.data).slice(0, 3);
  return (
    <section className="mt-3 rounded-lg border border-border bg-card" aria-label="Recent activity">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <Link to="/wallet/activity" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      {activity.isLoading ? (
        <ul className="divide-y divide-border border-t border-border px-3" aria-hidden>
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex items-center gap-2.5 py-2">
              <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  <span className="inline-block h-4 w-28 animate-pulse rounded bg-muted" />
                </p>
                <p className="truncate text-[11px]">
                  <span className="inline-block h-3 w-40 animate-pulse rounded bg-muted" />
                </p>
              </div>
              <span className="inline-block h-4 w-14 shrink-0 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <p className="px-3 pb-3 text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border px-3">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-2.5 py-2">
              <TokenMark asset={event.asset} className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <span className={statusClass(event.status)}>{event.status}</span>
                  {" · "}
                  {whenLabel(event.at)}
                  {event.detail ? ` · ${event.detail}` : ""}
                </p>
              </div>
              <span
                className={`tabular shrink-0 text-sm font-semibold ${event.credited ? (event.outgoing ? "text-destructive" : "text-emerald-600") : "text-muted-foreground"}`}
              >
                {event.credited ? (event.outgoing ? "−" : "+") : ""}
                {formatUsd(event.usdCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FundingHistory() {
  const qc = useQueryClient();
  const cancelFn = useServerFn(cancelCryptoWithdrawal);
  const activity = useCryptoActivity(true);
  const events = fundingEvents(activity.data);
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(events.length / pageSize));
  const safe = Math.min(page, pages - 1);
  const slice = events.slice(safe * pageSize, safe * pageSize + pageSize);

  async function cancel(id: string) {
    const result = await cancelFn({ data: { id } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Withdrawal cancelled and refunded");
    void qc.invalidateQueries({ queryKey: ["crypto-activity"] });
    void qc.invalidateQueries({ queryKey: ["wallet"] });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3" aria-label="Crypto activity">
      <h2 className="text-sm font-semibold">Deposits and withdrawals</h2>
      {activity.isLoading ? (
        <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted" />
      ) : events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No crypto activity yet.</p>
      ) : (
        <>
          <ul className="mt-1 divide-y divide-border">
            {slice.map((event) => (
              <EventRow key={event.id} event={event} onCancel={cancel} />
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground disabled:opacity-40"
                disabled={safe === 0}
                onClick={() => setPage(safe - 1)}
              >
                Prev
              </button>
              <span className="tabular">
                {safe + 1} / {pages}
              </span>
              <button
                type="button"
                className="hover:text-foreground disabled:opacity-40"
                disabled={safe >= pages - 1}
                onClick={() => setPage(safe + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const ledgerQuery = (userId: string) =>
  queryOptions({
    queryKey: ["ledger", userId],
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_postings")
        .select(
          "id, amount, balance_after, created_at, account_id, wallet_accounts!inner(kind), ledger_transactions(kind, memo, game_id)",
        )
        .eq("wallet_accounts.owner_id", userId)
        .eq("wallet_accounts.account_type", "real")
        .order("id", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        accountKind: (p.wallet_accounts as { kind: string } | null)?.kind,
      }));
    },
  });

export function LedgerHistory({ userId }: { userId: string }) {
  const history = useQuery({ ...ledgerQuery(userId), enabled: !!userId });
  const [page, setPage] = useState(0);
  const rows = history.data ?? [];
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, pages - 1);
  const slice = rows.slice(safe * pageSize, safe * pageSize + pageSize);
  return (
    <section className="rounded-xl border border-border bg-card p-3" aria-label="Transactions">
      <h2 className="text-sm font-semibold">Transactions</h2>
      {history.isLoading ? (
        <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <>
          <ul className="mt-1 divide-y divide-border">
            {slice.map((p) => {
              const tx = p.ledger_transactions as {
                kind: string;
                memo: string | null;
                game_id: number | null;
              } | null;
              const kind =
                tx?.kind === "promo_reward" && tx.memo && tx.memo !== "Promo reward"
                  ? tx.memo
                  : (KIND_LABEL[tx?.kind ?? ""] ?? tx?.kind);
              return (
                <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{kind}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.accountKind === "user_locked" ? "Locked" : "Available"} ·{" "}
                      {whenLabel(p.created_at)}
                      {tx?.game_id && tx.kind.startsWith("coinflip") ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            to="/coinflip/$gameId"
                            params={{ gameId: String(tx.game_id) }}
                            className="hover:text-foreground"
                          >
                            Coinflip #{tx.game_id}
                          </Link>
                        </>
                      ) : null}
                      {tx?.game_id && tx.kind.startsWith("jackpot") ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            to="/games/$gameId"
                            params={{ gameId: String(tx.game_id) }}
                            className="hover:text-foreground"
                          >
                            Jackpot #{tx.game_id}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 font-semibold ${p.amount > 0 ? "text-primary" : ""}`}
                  >
                    {p.amount > 0 ? "+" : ""}
                    {formatUsd(p.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="hover:text-foreground disabled:opacity-40"
                disabled={safe === 0}
                onClick={() => setPage(safe - 1)}
              >
                Prev
              </button>
              <span className="tabular">
                {safe + 1} / {pages}
              </span>
              <button
                type="button"
                className="hover:text-foreground disabled:opacity-40"
                disabled={safe >= pages - 1}
                onClick={() => setPage(safe + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
