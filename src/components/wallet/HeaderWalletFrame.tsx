import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export const walletNavClass =
  "header-wallet grid h-11 shrink-0 grid-rows-[1fr_1.25rem] overflow-hidden rounded-lg border sm:flex sm:items-center sm:gap-1 sm:rounded-xl sm:p-1";
export const balanceButtonClass =
  "flex h-full items-center justify-center border-b border-border px-2 transition-colors hover:bg-muted/60 sm:rounded-lg sm:border-b-0 sm:px-3";

const action =
  "flex h-5 flex-1 items-center justify-center gap-1.5 px-3 text-[11px] font-bold uppercase leading-none transition-colors sm:h-full sm:flex-none sm:rounded-lg sm:px-3 sm:text-xs sm:tracking-wide";

export function WalletLinks() {
  return (
    <div className="flex items-stretch divide-x divide-border sm:h-full sm:gap-1 sm:divide-x-0">
      <Link
        to="/wallet"
        search={{ mode: "deposit" }}
        className={`${action} header-deposit`}
      >
        <ArrowDownToLine className="hidden h-3.5 w-3.5 shrink-0 lg:block" aria-hidden /> Deposit
      </Link>
      <Link
        to="/wallet"
        search={{ mode: "withdraw" }}
        className={`${action} header-withdraw`}
      >
        <ArrowUpFromLine className="hidden h-3.5 w-3.5 shrink-0 lg:block" aria-hidden /> Withdraw
      </Link>
    </div>
  );
}

/** Same geometry as the loaded wallet group (BalanceRailButton in its loading state), shown while its chunk loads. */
export function WalletGroupPlaceholder() {
  return (
    <nav aria-label="Wallet" className={walletNavClass}>
      <span className={balanceButtonClass}>
        <span className="flex items-center justify-end gap-1">
          <span className="flex h-4 w-[4.75rem] shrink-0 items-center justify-end sm:w-[5.25rem]">
            <span aria-hidden className="h-3.5 w-full animate-pulse rounded bg-muted" />
          </span>
          <span aria-hidden className="h-4 w-[3.25rem] shrink-0" />
        </span>
      </span>
      <WalletLinks />
    </nav>
  );
}
