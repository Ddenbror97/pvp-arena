import { Link } from "@tanstack/react-router";
import { TokenMark } from "@/components/wallet/TokenMark";
import { formatUsd } from "@/lib/jackpot/math";

/** One bar: dollar balance, fixed USDC mark, and a single Wallet button. */
export const walletNavClass =
  "header-wallet inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border py-1 pl-3 pr-1";

export function UsdcBalance({
  available,
  loading,
}: {
  available?: number | undefined;
  loading: boolean;
}) {
  const usd = formatUsd(available ?? 0);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {loading ? (
        <span
          aria-hidden
          className="header-wallet-amount header-wallet-pulse animate-pulse rounded"
        />
      ) : (
        <span className="header-wallet-amount text-sm font-semibold">{usd}</span>
      )}
      <span className="flex shrink-0 items-center gap-1">
        <TokenMark asset="USDC" className="h-4 w-4" />
        <span className="header-wallet-asset text-[11px] font-semibold leading-none tracking-wide">
          USDC
        </span>
      </span>
    </span>
  );
}

export function WalletAction() {
  return <span className="header-wallet-label">Wallet</span>;
}

/** Same geometry as the loaded bar, shown while its chunk loads. The link works immediately. */
export function WalletGroupPlaceholder() {
  return (
    <Link to="/wallet" aria-label="Wallet, USDC balance loading" className={walletNavClass}>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="header-wallet-amount header-wallet-pulse animate-pulse rounded"
        />
        <span className="flex items-center gap-1">
          <span aria-hidden className="header-wallet-pulse h-4 w-4 animate-pulse rounded-full" />
          <span
            aria-hidden
            className="header-wallet-asset header-wallet-pulse h-2.5 animate-pulse rounded"
          />
        </span>
      </span>
      <WalletAction />
    </Link>
  );
}
