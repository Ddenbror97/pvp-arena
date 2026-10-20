import { Link } from "@tanstack/react-router";
import { TokenMark } from "@/components/wallet/TokenMark";
import { formatUsd } from "@/lib/jackpot/math";

/** One chip: USDC dollar balance, then a single Wallet action. Fixed widths so the placeholder matches. */
export const walletNavClass =
  "header-wallet grid h-11 w-[7.75rem] shrink-0 grid-rows-[1fr_1.35rem] overflow-hidden rounded-xl border sm:flex sm:h-10 sm:w-auto sm:items-center sm:gap-1.5 sm:rounded-full sm:py-1 sm:pl-1.5 sm:pr-1";

export function UsdcBalance({
  available,
  loading,
}: {
  available?: number | undefined;
  loading: boolean;
}) {
  const usd = formatUsd(available ?? 0);
  return (
    <span className="flex h-full min-w-0 items-center justify-center gap-1.5 px-2 sm:h-auto sm:justify-start sm:px-1">
      <TokenMark asset="USDC" className="h-4 w-4 shrink-0" />
      {loading ? (
        <span
          aria-hidden
          className="header-wallet-pulse h-3.5 w-[4.75rem] animate-pulse rounded sm:w-[5.25rem]"
        />
      ) : (
        <span className="tabular w-[4.75rem] truncate text-right text-[13px] font-semibold leading-none sm:w-[5.25rem] sm:text-sm">
          {usd}
        </span>
      )}
      <span className="header-wallet-asset hidden text-[10px] font-semibold tracking-[0.14em] sm:inline">
        USDC
      </span>
    </span>
  );
}

export function WalletAction() {
  return <span className="header-wallet-label">Wallet</span>;
}

/** Same geometry as the loaded chip, shown while its chunk loads. The link works immediately. */
export function WalletGroupPlaceholder() {
  return (
    <Link to="/wallet" aria-label="Wallet, USDC balance loading" className={walletNavClass}>
      <span className="flex h-full items-center justify-center gap-1.5 px-2 sm:px-1">
        <span
          aria-hidden
          className="header-wallet-pulse h-4 w-4 shrink-0 animate-pulse rounded-full"
        />
        <span
          aria-hidden
          className="header-wallet-pulse h-3.5 w-[4.75rem] animate-pulse rounded sm:w-[5.25rem]"
        />
        <span aria-hidden className="hidden h-2.5 w-8 sm:inline" />
      </span>
      <WalletAction />
    </Link>
  );
}
