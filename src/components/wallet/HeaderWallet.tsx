import { BalanceRailButton, useHeaderFunding } from "@/components/wallet/RailPreference";
import {
  balanceButtonClass,
  walletNavClass,
  WalletLinks,
} from "@/components/wallet/HeaderWalletFrame";

/** Balance plus the two wallet shortcuts, kept in one compact, fixed-geometry segmented control. */
export function HeaderWallet({
  userId,
  available,
  loading,
}: {
  userId: string | null;
  available?: number | undefined;
  loading: boolean;
}) {
  const funding = useHeaderFunding(!!userId && !loading);
  return (
    <nav aria-label="Wallet" className={walletNavClass}>
      <BalanceRailButton
        available={available}
        loading={loading}
        rail={funding.rail}
        rails={funding.rails}
        assetLoading={funding.assetLoading}
        onSelect={funding.select}
        className={balanceButtonClass}
      />
      <WalletLinks />
    </nav>
  );
}
