import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/jackpot/Avatar";

export function SiteHeader() {
  const { userId, profile, ready } = useAuth();
  const wallet = useWallet(userId);
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link to="/" className="shrink-0 font-display text-base tracking-tight sm:text-lg">
          PVP<span className="text-primary">Casino</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-5">
          <Link to="/" className={`${link} hidden sm:inline`} activeOptions={{ exact: true }}>Jackpot</Link>
          <Link to="/coinflip" className={link}>Coinflip</Link>
          <Link to="/fairness" className={`${link} hidden sm:inline`}>Fairness</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {!ready ? null : userId ? (
            <>
              <Link to="/wallet" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 hover:border-primary/40">
                <span className="tabular text-sm font-semibold">{formatUsd(wallet.data?.available ?? 0)}</span>
                <span className="hidden rounded bg-gold/15 px-1 text-[9px] font-bold text-gold sm:inline">TEST</span>
              </Link>
              <Link to="/profile" aria-label="Profile">
                <PlayerAvatar src={profile?.avatar_url} name={profile?.username} className="h-9 w-9" />
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
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          PVPCasino — test credits only. Credits have no cash value and cannot be withdrawn. Not a licensed gambling service. 18+.
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
