import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { readAuthHint } from "@/lib/auth-hint";
import { useWallet } from "@/lib/jackpot/api";
import { useDepositNotifications } from "@/lib/crypto/deposit-notify";
import { formatUsd } from "@/lib/jackpot/math";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { Dices, Coins, CircleDot, ShieldCheck, User, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export function SiteHeader() {
  const { userId, profile, ready } = useAuth();
  const wallet = useWallet(userId);
  const [hint] = useState(readAuthHint);
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground";
  // A stored session means the signed-in wallet group is the final shape, so reserve it now.
  const showWallet = ready ? Boolean(userId) : hint;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-none items-center gap-4 px-3 sm:h-16 sm:gap-6 sm:px-4 lg:px-6">
        <Link to="/" className="shrink-0" aria-label="PVPspinArena">
          <img src={arenaLogo.url} alt="PVPspinArena" width={240} height={128} fetchPriority="high" decoding="async" className="h-8 w-auto sm:h-10" />
        </Link>
        <nav className="hidden items-center gap-5 sm:flex">
          <Link to="/" className={link} activeOptions={{ exact: true }}>Jackpot</Link>
          <Link to="/coinflip" className={link}>Coinflip</Link>
          <Link to="/roulette" className={link}>Roulette</Link>
          <Link to="/fairness" className={link}>Fairness</Link>
        </nav>
        {/* Reserve the signed-in width in every state so the auth swap never moves this slot. */}
        <div className="ml-auto flex h-11 min-w-[198px] shrink-0 items-center justify-end gap-2 sm:min-w-[352px] sm:gap-3 lg:min-w-[388px]">
          {!showWallet ? (
            <Button asChild size="sm" className="font-display">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
            <>
              <WalletGroup available={wallet.data?.available} loading={!ready || wallet.isLoading} />
              <Link to="/profile" aria-label="Profile" className="shrink-0">
                <PlayerAvatar src={profile?.avatar_url} name={profile?.username} className="h-8 w-8 sm:h-9 sm:w-9" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Balance plus the two wallet shortcuts, kept in one compact, fixed-geometry segmented control. */
function WalletGroup({ available, loading }: { available?: number | undefined; loading: boolean }) {
  const action =
    "flex h-5 flex-1 items-center justify-center gap-1 px-3 text-[11px] font-bold uppercase leading-none transition-colors sm:h-8 sm:flex-none sm:px-2.5 sm:text-xs sm:tracking-wide";
  return (
    <nav
      aria-label="Wallet"
      className="grid h-11 shrink-0 grid-rows-[1fr_1.25rem] overflow-hidden rounded-lg border border-border bg-card sm:flex sm:h-9 sm:items-center"
    >
      <Link
        to="/wallet"
        aria-label="Open wallet"
        className="flex h-full items-center justify-center gap-1.5 border-b border-border px-2 transition-colors hover:bg-muted/60 sm:h-8 sm:border-b-0 sm:border-r sm:px-2.5"
      >
        {/* Fixed-width slot: the skeleton and the loaded balance occupy identical geometry. */}
        <span className="flex h-4 w-[4.75rem] shrink-0 items-center justify-end sm:w-[5.25rem]">
          {loading ? (
            <span aria-hidden className="h-3.5 w-full animate-pulse rounded bg-muted" />
          ) : (
            <span className="tabular truncate text-[13px] font-semibold leading-none sm:text-sm">{formatUsd(available ?? 0)}</span>
          )}
        </span>
      </Link>
      <div className="flex items-stretch divide-x divide-border">
        <Link to="/wallet" search={{ mode: "deposit" }} className={`${action} text-primary hover:bg-primary/10`}>
          <ArrowDownToLine className="hidden h-3.5 w-3.5 shrink-0 lg:block" aria-hidden /> Deposit
        </Link>
        <Link to="/wallet" search={{ mode: "withdraw" }} className={`${action} text-muted-foreground hover:bg-muted hover:text-foreground`}>
          <ArrowUpFromLine className="hidden h-3.5 w-3.5 shrink-0 lg:block" aria-hidden /> Withdraw
        </Link>
      </div>
    </nav>
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
            Player-versus-player Jackpot, Coinflip and Roulette.
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Balances are in USD, funded by USDC or ETH deposits on Base. 18+. Play responsibly.
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
            Pick a game, place your entry, then verify completed results independently.
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
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <Link to="/" className={tab} activeOptions={{ exact: true }}><Dices className="h-5 w-5" />Jackpot</Link>
      <Link to="/coinflip" className={tab}><Coins className="h-5 w-5" />Coinflip</Link>
      <Link to="/roulette" className={tab}><CircleDot className="h-5 w-5" />Roulette</Link>
      <Link to="/fairness" className={tab}><ShieldCheck className="h-5 w-5" />Fairness</Link>
      <Link to={userId ? "/profile" : "/auth"} className={tab}><User className="h-5 w-5" />{userId ? "Profile" : "Sign in"}</Link>
    </nav>
  );
}
