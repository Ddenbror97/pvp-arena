import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { FundingHistory, LedgerHistory } from "@/components/wallet/WalletActivity";

export const Route = createFileRoute("/_authenticated/wallet_/activity")({
  head: () => ({
    meta: [{ title: "Activity — PVPspinArena" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { userId } = useAuth();
  return (
    <div className="mx-auto w-full max-w-lg">
      <Link to="/wallet" className="text-sm text-muted-foreground hover:text-foreground">
        Wallet
      </Link>
      <h1 className="mt-2 font-display text-2xl">Activity</h1>
      <div className="mt-4 space-y-4">
        <FundingHistory />
        <LedgerHistory userId={userId ?? ""} />
      </div>
    </div>
  );
}
