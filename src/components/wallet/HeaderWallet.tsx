import { Link } from "@tanstack/react-router";
import { formatUsd } from "@/lib/jackpot/math";
import { UsdcBalance, WalletAction, walletNavClass } from "@/components/wallet/HeaderWalletFrame";

function walletAriaLabel(loading: boolean, available?: number): string {
  if (loading) return "Wallet, USDC balance loading";
  return `Wallet, ${formatUsd(available ?? 0)} USDC`;
}

/** Signed-in header chip: the playable balance in USDC dollars, opening the wallet. */
export function HeaderWallet({
  available,
  loading,
}: {
  available?: number | undefined;
  loading: boolean;
}) {
  return (
    <Link to="/wallet" aria-label={walletAriaLabel(loading, available)} className={walletNavClass}>
      <UsdcBalance available={available} loading={loading} />
      <WalletAction />
    </Link>
  );
}
