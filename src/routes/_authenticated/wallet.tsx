import { createFileRoute } from "@tanstack/react-router";
import { Lock, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWallet, useWalletRealtime, walletQuery } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { CryptoRails } from "@/components/wallet/CryptoRails";
import { RecentFunding } from "@/components/wallet/WalletActivity";
import { cryptoActivityQuery } from "@/components/wallet/RailPreference";
import {
  getBtcDepositConfig,
  getBtcPayoutConfig,
  getOpenBtcInvoice,
} from "@/lib/crypto/btcpay/btcpay.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  // Header shortcuts deep-link straight to the requested action; anything else falls back to deposit.
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: "deposit" | "withdraw"; asset?: string } => {
    const value = search["mode"];
    const asset = search["asset"];
    return {
      ...(value === "withdraw" || value === "deposit" ? { mode: value } : {}),
      ...(typeof asset === "string" && /^[A-Z0-9]{2,12}$/.test(asset) ? { asset } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Wallet — PVPspinArena" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Your balance, deposits, withdrawals and full transaction ledger.",
      },
      { property: "og:title", content: "Wallet — PVPspinArena" },
      {
        property: "og:description",
        content: "Your balance, deposits, withdrawals and full transaction ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // Not awaited: starts the balance, ledger and crypto requests together at
  // navigation (or on hover) without holding the old page.
  loader: ({ context }) => {
    const qc = context.queryClient;
    void qc.prefetchQuery(walletQuery(context.user.id));
    void qc.prefetchQuery(cryptoActivityQuery());
    void qc.prefetchQuery({
      queryKey: ["btc-deposit-config"],
      queryFn: () => getBtcDepositConfig(),
      staleTime: 30_000,
    });
    void qc.prefetchQuery({
      queryKey: ["btc-payout-config"],
      queryFn: () => getBtcPayoutConfig(),
      staleTime: 30_000,
    });
    void getOpenBtcInvoice().then((open) => {
      if (!open.ok) {
        qc.setQueryData(["btc-open-invoice"], open);
        return;
      }
      qc.setQueryData(["btc-open-invoice"], open);
      qc.setQueryData(["btc-invoice", open.id], { ok: true as const, invoice: open.invoice });
    });
  },
  component: WalletPage,
});

function WalletPage() {
  const { userId } = useAuth();
  const { mode, asset } = Route.useSearch();
  useWalletRealtime(userId);
  const wallet = useWallet(userId);
  const available = wallet.data?.available ?? 0;
  const locked = wallet.data?.locked ?? 0;

  return (
    <CryptoRails
      availableCents={available}
      requestedMode={mode ?? "deposit"}
      requestedAsset={asset}
    >
      {({ form }) => (
        <div className="mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-xl leading-none">Wallet</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Balance, deposits, and cashouts
              </p>
            </div>
          </div>
          <section className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2" aria-label="Balance">
            <div className="min-w-0 rounded-lg border border-border bg-card px-2 py-2.5 sm:px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-1.5 sm:tracking-widest">
                <Wallet className="h-3 w-3 shrink-0" aria-hidden="true" />
                Total
              </div>
              <p className="tabular mt-1.5 flex min-h-5 items-center whitespace-nowrap font-display text-[clamp(0.75rem,calc((100vw-6rem)/17.7),1.5rem)] font-semibold leading-none tracking-tight">
                {wallet.isLoading ? "\u00a0" : formatUsd(available + locked)}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-border bg-card px-2 py-2.5 sm:px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-1.5 sm:tracking-widest">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                Available
              </div>
              <p className="tabular mt-1.5 flex min-h-5 items-center whitespace-nowrap font-display text-[clamp(0.75rem,calc((100vw-6rem)/17.7),1.5rem)] font-semibold leading-none tracking-tight">
                {wallet.isLoading ? "\u00a0" : formatUsd(available)}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-border bg-card px-2 py-2.5 sm:px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-1.5 sm:tracking-widest">
                <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                Locked
              </div>
              <p className="tabular mt-1.5 flex min-h-5 items-center whitespace-nowrap font-display text-[clamp(0.75rem,calc((100vw-6rem)/17.7),1.5rem)] font-semibold leading-none tracking-tight">
                {wallet.isLoading ? "\u00a0" : formatUsd(locked)}
              </p>
            </div>
          </section>
          <div className="mt-3">{form}</div>
          <RecentFunding />
        </div>
      )}
    </CryptoRails>
  );
}
