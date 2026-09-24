import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dices, Coins, CircleDot, ShieldCheck, User } from "lucide-react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export function SiteHeader() {
  const { userId, profile, ready } = useAuth();
  const wallet = useWallet(userId);
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-none items-center gap-4 px-3 sm:h-16 sm:gap-6 sm:px-4 lg:px-6">
        <Link to="/" className="shrink-0" aria-label="PVPspinArena">
          <img src={arenaLogo.url} alt="PVPspinArena" fetchPriority="high" decoding="async" className="h-8 w-auto sm:h-10" />
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          <Link to="/" className={link} activeOptions={{ exact: true }}>Jackpot</Link>
          <Link to="/coinflip" className={link}>Coinflip</Link>
          <Link to="/roulette" className={link}>Roulette</Link>
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
  const footerLink = "text-sm text-muted-foreground transition-colors hover:text-primary";

  return (
    <footer className="canvas mt-10 border-t border-border pb-20 sm:pb-0">
      <div className="mx-auto grid max-w-none gap-10 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.6fr_repeat(4,1fr)] lg:gap-8 lg:py-12">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex" aria-label="PVPspinArena home">
            <img src={arenaLogo.url} alt="PVPspinArena" width={240} height={128} loading="lazy" decoding="async" className="h-10 w-auto" />
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Player-versus-player Jackpot, Coinflip and Roulette using test credits only.
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Credits have no cash value and cannot be withdrawn. Not a licensed gambling service. 18+.
          </p>
        </div>

        <nav aria-label="Games">
          <h2 className="font-display text-sm text-foreground">Games</h2>
          <ul className="mt-4 space-y-3">
            <li><Link to="/" className={footerLink}>Jackpot</Link></li>
            <li><Link to="/coinflip" className={footerLink}>Coinflip</Link></li>
            <li><Link to="/roulette" className={footerLink}>Roulette</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm text-foreground">How it works</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Pick a game, enter with test credits, then verify completed results independently.
          </p>
          <Link to="/fairness" className={`mt-3 inline-block ${footerLink}`}>Fairness</Link>
        </div>

        <div>
          <h2 className="font-display text-sm text-foreground">About us</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A multiplayer arena built to make every game result transparent and checkable.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Contact page coming later.</p>
        </div>

        <nav aria-label="Legal">
          <h2 className="font-display text-sm text-foreground">Legal</h2>
          <ul className="mt-4 space-y-3">
            <li><Link to="/terms" className={footerLink}>Terms</Link></li>
            <li><Link to="/privacy" className={footerLink}>Privacy</Link></li>
            <li><Link to="/responsible-gambling" className={footerLink}>Responsible gambling</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} PVPspinArena
      </div>
    </footer>
  );
}

/** Phone-only bottom tab bar: primary navigation within thumb reach. */
export function MobileTabBar() {
  const { userId: authId } = useAuth();
  // Auth state is client-only; defer it until after hydration to keep SSR markup identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const userId = mounted ? authId : null;
  const tab =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors [&.active]:text-primary";
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <Link to="/" className={tab} activeOptions={{ exact: true }}><Dices className="h-5 w-5" />Jackpot</Link>
      <Link to="/coinflip" className={tab}><Coins className="h-5 w-5" />Coinflip</Link>
      <Link to="/roulette" className={tab}><CircleDot className="h-5 w-5" />Roulette</Link>
      <Link to="/fairness" className={tab}><ShieldCheck className="h-5 w-5" />Fairness</Link>
      <Link to={userId ? "/profile" : "/auth"} className={tab}><User className="h-5 w-5" />{userId ? "Profile" : "Sign in"}</Link>
    </nav>
  );
}
