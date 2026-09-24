import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dices, Coins, ShieldCheck, User } from "lucide-react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export function SiteHeader() {
  const { userId, profile, ready } = useAuth();
  const wallet = useWallet(userId);
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-none items-center gap-4 px-3 sm:h-16 sm:gap-6 sm:px-4 lg:px-6">
        <Link to="/" className="shrink-0" aria-label="PVPspinArena">
          <img src={arenaLogo.url} alt="PVPspinArena" className="h-8 w-auto sm:h-10" />
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          <Link to="/" className={link} activeOptions={{ exact: true }}>Jackpot</Link>
          <Link to="/coinflip" className={link}>Coinflip</Link>
          <Link to="/fairness" className={link}>Fairness</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {!ready ? null : userId ? (
            <>
              <Link to="/wallet" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 hover:border-primary/40">
                <span className="tabular text-sm font-semibold">{formatUsd(wallet.data?.available ?? 0)}</span>
                <span className="hidden rounded bg-gold/15 px-1 text-[9px] font-bold text-gold sm:inline">TEST</span>
              </Link>
              <Link to="/profile" aria-label="Profile">
                <PlayerAvatar src={profile?.avatar_url} name={profile?.username} className="h-8 w-8 sm:h-9 sm:w-9" />
              </Link>
            </>
          ) : (
            <Button asChild size="sm" className="font-display">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="canvas mt-12 border-t border-border pb-20 sm:mt-20 sm:pb-0">
      <div className="mx-auto flex max-w-none lg:px-6 flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          PVPspinArena — test credits only. Credits have no cash value and cannot be withdrawn. Not a licensed gambling service. 18+.
        </p>
        <nav className="flex gap-4">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/responsible-gambling" className="hover:text-foreground">Responsible gambling</Link>
        </nav>
      </div>
    </footer>
  );
}

/** Phone-only bottom tab bar: primary navigation within thumb reach. */
export function MobileTabBar() {
  const { userId } = useAuth();
  const tab =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors [&.active]:text-primary";
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <Link to="/" className={tab} activeOptions={{ exact: true }}><Dices className="h-5 w-5" />Jackpot</Link>
      <Link to="/coinflip" className={tab}><Coins className="h-5 w-5" />Coinflip</Link>
      <Link to="/fairness" className={tab}><ShieldCheck className="h-5 w-5" />Fairness</Link>
      <Link to={userId ? "/profile" : "/auth"} className={tab}><User className="h-5 w-5" />{userId ? "Profile" : "Sign in"}</Link>
    </nav>
  );
}
