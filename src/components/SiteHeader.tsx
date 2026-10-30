import { lazy, Suspense, useState } from "react";
import { Link, useRouter, type AnyRouter } from "@tanstack/react-router";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { prefetchGamePage } from "@/lib/first-paint";
import { paintSignedIn, readAuthHint } from "@/lib/auth-hint";
import { useWallet } from "@/lib/jackpot/api";
import { Button } from "@/components/ui/button";
import { WalletGroupPlaceholder } from "@/components/wallet/HeaderWalletFrame";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { equippedAssets, usePrestige } from "@/components/prestige/PrestigeProvider";
import {
  Dices,
  Coins,
  CircleDot,
  Cherry,
  Spade,
  ShieldCheck,
  Circle,
  Crosshair,
} from "lucide-react";
import { arenaLogo } from "@/assets/media";
import { TokenMark } from "@/components/wallet/TokenMark";
import { SoundToggle } from "@/components/SoundToggle";
import { warmStrikeShowcase } from "@/lib/fps/showcase";
import { fetchDuelLobby, fetchDuelRankings } from "@/lib/fps/api";
import { cn } from "@/lib/utils";

// Signed-in only, so logged-out visitors never download the balance chip.
const HeaderWallet = lazy(() =>
  import("@/components/wallet/HeaderWallet").then((m) => ({ default: m.HeaderWallet })),
);

function warmRanks(qc: QueryClient) {
  void import("@/lib/leaderboard/paint").then((m) => m.prefetchPublicList(qc));
}

/** Lobby data is prefetched separately. These two chunks are the pages themselves. */
function warmPoolPages(router: AnyRouter) {
  for (const path of ["/8-ball-pool", "/pool", "/pool/$matchId"]) {
    const route = (router.routesByPath as unknown as Record<string, unknown>)[path];
    if (route) void router.loadRouteChunk(route as never)?.catch(() => {});
  }
}

function warmStrikePages(router: AnyRouter, qc: QueryClient, userId: string | null) {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
  warmStrikeShowcase();
  const route = (router.routesByPath as unknown as Record<string, unknown>)["/fps-duel"];
  if (route) void router.loadRouteChunk(route as never)?.catch(() => {});
  void qc.prefetchQuery({
    queryKey: ["fps-lobby", userId],
    queryFn: fetchDuelLobby,
    staleTime: 5000,
  });
  void qc.prefetchQuery({
    queryKey: ["fps-rankings"],
    queryFn: fetchDuelRankings,
    staleTime: 60000,
  });
}

export function SiteHeader({ className }: { className?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { userId, profile, ready } = useAuth();
  const prestige = usePrestige();
  const style = equippedAssets(prestige.state);
  const wallet = useWallet(userId);
  const [hint] = useState(readAuthHint);
  const link =
    "relative text-[13.5px] text-foreground/80 transition-colors hover:text-foreground [&.active]:font-medium [&.active]:text-foreground [&.active]:after:absolute [&.active]:after:inset-x-0 [&.active]:after:-bottom-[0.95rem] [&.active]:after:h-[3px] [&.active]:after:rounded-full [&.active]:after:bg-[#8830e7] [&.active]:after:shadow-[0_2px_10px_1px_rgb(139_53_236/65%)]";
  // A stored session means the signed-in wallet group is the final shape, so reserve it now.
  const showWallet = paintSignedIn(ready, userId, hint);
  return (
    <header className={cn("site-chrome sticky top-0 z-30 overflow-x-clip border-b", className)}>
      <div className="mx-auto grid h-14 w-full max-w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-1.5 px-2 sm:flex sm:h-16 sm:gap-4 sm:px-4 lg:gap-6 lg:px-6">
        <Link
          to="/"
          className="block h-8 w-[3.75rem] shrink-0 sm:h-10 sm:w-[4.6875rem]"
          aria-label="PVPspinArena"
        >
          <img
            src={arenaLogo}
            alt="PVPspinArena"
            width={240}
            height={128}
            decoding="async"
            className="block h-full w-full max-w-none object-contain"
          />
        </Link>
        <div className="flex items-center sm:gap-1">
          <span aria-hidden className="mr-1 hidden h-7 w-px bg-white/[0.07] sm:block" />
          <SoundToggle />
          <span aria-hidden className="hidden h-7 w-px bg-white/[0.07] lg:block" />
        </div>
        <nav className="relative hidden min-w-0 items-center gap-4 lg:flex lg:self-stretch xl:gap-6">
          <span
            aria-hidden
            className="header-tab pointer-events-none absolute top-0 bottom-[5px] -left-[100vw] -right-28 -z-10"
          />
          <Link
            to="/"
            className={link}
            activeOptions={{ exact: true }}
            onMouseEnter={() => prefetchGamePage(qc, "/")}
            onFocus={() => prefetchGamePage(qc, "/")}
            onTouchStart={() => prefetchGamePage(qc, "/")}
          >
            Jackpot
          </Link>
          <Link
            to="/coinflip"
            className={link}
            onMouseEnter={() => prefetchGamePage(qc, "/coinflip")}
            onFocus={() => prefetchGamePage(qc, "/coinflip")}
            onTouchStart={() => prefetchGamePage(qc, "/coinflip")}
          >
            Coinflip
          </Link>
          <Link
            to="/roulette"
            className={link}
            onMouseEnter={() => prefetchGamePage(qc, "/roulette")}
            onFocus={() => prefetchGamePage(qc, "/roulette")}
            onTouchStart={() => prefetchGamePage(qc, "/roulette")}
          >
            Roulette
          </Link>
          <Link
            to="/slott"
            className={link}
            onMouseEnter={() => prefetchGamePage(qc, "/slott")}
            onFocus={() => prefetchGamePage(qc, "/slott")}
            onTouchStart={() => prefetchGamePage(qc, "/slott")}
          >
            P2P Slott
          </Link>
          <Link
            to="/poker"
            className={link}
            onMouseEnter={() => prefetchGamePage(qc, "/poker")}
            onFocus={() => prefetchGamePage(qc, "/poker")}
            onTouchStart={() => prefetchGamePage(qc, "/poker")}
          >
            Poker
          </Link>
          <Link
            to="/8-ball-pool"
            className={link}
            onMouseEnter={() => {
              prefetchGamePage(qc, "/8-ball-pool");
              warmPoolPages(router);
            }}
            onFocus={() => {
              prefetchGamePage(qc, "/8-ball-pool");
              warmPoolPages(router);
            }}
            onTouchStart={() => {
              prefetchGamePage(qc, "/8-ball-pool");
              warmPoolPages(router);
            }}
          >
            8 Pool
          </Link>
          <Link
            to="/fps-duel"
            className={link}
            onMouseEnter={() => warmStrikePages(router, qc, userId)}
            onFocus={() => warmStrikePages(router, qc, userId)}
            onTouchStart={() => warmStrikePages(router, qc, userId)}
          >
            PvPStrike
          </Link>
          <Link to="/fairness" className={link}>
            Fairness
          </Link>
          {showWallet ? (
            <Link to="/prestige" className={link}>
              Prestige
            </Link>
          ) : null}
        </nav>
        <div className="flex h-11 min-w-0 items-center justify-end gap-1.5 sm:ml-auto sm:min-w-[17.5rem] sm:shrink-0 sm:gap-3">
          {!showWallet ? (
            <Button asChild size="sm" className="shrink-0 font-display">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : (
            <>
              <Suspense fallback={<WalletGroupPlaceholder />}>
                <HeaderWallet
                  available={wallet.data?.available}
                  loading={!ready || wallet.isLoading}
                />
              </Suspense>
              <Link
                to="/profile"
                aria-label="Profile"
                className="inline-flex shrink-0 items-center"
              >
                <PlayerPrestigeIdentity
                  avatar={profile?.avatar_url}
                  name={profile?.username}
                  frame={style.frame}
                  crown={style.crown}
                  level={prestige.state?.level}
                  tier={prestige.state?.tier}
                  size={36}
                  reserveHeadroom={false}
                />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        fill="currentColor"
        d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.36-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02C2.44 9.42 1.69 13.38 2.06 17.3c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.08.22.17.33.25c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"
      />
    </svg>
  );
}

function RedditMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        fill="currentColor"
        d="M14.5 3.3a1.2 1.2 0 0 1 1.38.98l.22 1.24a4.4 4.4 0 0 1 2.28.86 2.25 2.25 0 1 1 1.5 3.98c0 .172.16.0.3 1.33 0 3.13-3.36 5.66-7.5 5.66S4.8 14.82 4.8 11.7c0-.46.06-.9.16-1.33a2.25 2.25 0 1 1 1.5-3.98 4.4 4.4 0 0 1 2.28-.86l.22-1.24A1.2 1.2 0 0 1 10.34 3l3.16.56a.3.3 0 0 1 .24.3l-.16.88 1.02-.18a.3.3 0 0 1 .3.24l.22 1.24a.3.3 0 0 1-.24.35l-1.06.19c.10.20.0.2.28.5.96 0 1.74.78 1.74 1.74S13.96 10.6 13 10.6s-1.74-.78-1.74-1.74c0-.3.08-.59.22-.83H12c-2.9 0-5.26 1.86-5.26 4.16S9.1 16.35 12 16.35s5.26-1.86 5.26-4.16c0-1.76-1.38-3.28-3.38-3.84l-.06-.34.68-.12ZM9.7 12.05a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm4.6 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm-4.42 3.2a.4.4 0 0 0-.1.55c.64.9 1.86 1.5 3.22 1.5s2.58-.6 3.22-1.5a.4.4 0 1 0-.64-.48c-.5.68-1.46 1.14-2.58 1.14s-2.08-.46-2.58-1.14a.4.4 0 0 0-.54-.07Z"
      />
    </svg>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  const qc = useQueryClient();
  const footerLink = "text-sm text-muted-foreground transition-colors hover:text-primary";

  return (
    <footer className={cn("canvas mt-10 border-t border-border pb-20 lg:pb-0", className)}>
      <div className="mx-auto max-w-none px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.15fr)_repeat(3,minmax(0,1fr))]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="footer-wordmark inline-flex" aria-label="PVPspinArena home">
              <img
                src={arenaLogo}
                alt="PVPspinArena"
                width={240}
                height={128}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Where players play against players, real odds.
            </p>
            <h2 className="mt-5 font-display text-sm text-foreground">Currency</h2>
            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {(
                [
                  ["BTC", "Bitcoin"],
                  ["ETH", "Ether"],
                  ["USDC", "USD Coin"],
                ] as const
              ).map(([asset, label]) => (
                <li
                  key={asset}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <TokenMark asset={asset} className="h-4 w-4" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm text-foreground">Join our community</h2>
            <div className="mt-3 flex flex-col items-start gap-1.5">
              <a
                href="https://discord.gg/yKktkxB7jW"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5865F2] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#4752C4]"
              >
                <DiscordMark />
                Join Discord
              </a>
              <a
                href="https://www.reddit.com/r/PvPSpinArena/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4500] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#E03D00]"
              >
                <RedditMark />
                Join Reddit
              </a>
            </div>
          </div>

          <div>
            <h2 className="font-display text-sm text-foreground">Contact information</h2>
            <a
              href="mailto:contact@pvpspinarena.com"
              className="mt-3 inline-block break-words text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Contact@pvpspinarena.com
            </a>
          </div>

          <nav aria-label="Legal">
            <h2 className="font-display text-sm text-foreground">Legal</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/terms" className={footerLink}>
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={footerLink}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/responsible-gambling" className={footerLink}>
                  Responsible gambling
                </Link>
              </li>
              <li>
                <Link to="/editorial" className={footerLink}>
                  Editorial policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <nav aria-label="Explore" className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-sm text-foreground">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
            <li>
              <Link to="/how-it-works" className={footerLink}>
                How it works
              </Link>
            </li>
            <li>
              <Link to="/about" className={footerLink}>
                About
              </Link>
            </li>
            <li>
              <Link to="/fairness" className={footerLink}>
                Fairness
              </Link>
            </li>
            <li>
              <Link to="/guides" className={footerLink}>
                Crypto casino guides
              </Link>
            </li>
            <li>
              <Link
                to="/guides/topics/$topic"
                params={{ topic: "provably-fair" }}
                className={footerLink}
              >
                Provably fair
              </Link>
            </li>
            <li>
              <Link
                to="/guides/topics/$topic"
                params={{ topic: "crypto-payments" }}
                className={footerLink}
              >
                Wallets and payments
              </Link>
            </li>
            <li>
              <Link
                to="/guides/topics/$topic"
                params={{ topic: "csgo-heritage" }}
                className={footerLink}
              >
                CS2 and PvP formats
              </Link>
            </li>
            <li>
              <Link
                to="/guides/topics/$topic"
                params={{ topic: "games-and-odds" }}
                className={footerLink}
              >
                Odds and roulette
              </Link>
            </li>
            <li>
              <Link to="/guides/topics/$topic" params={{ topic: "lottery" }} className={footerLink}>
                Lottery
              </Link>
            </li>
            <li>
              <Link
                to="/leaderboards"
                className={footerLink}
                onMouseEnter={() => warmRanks(qc)}
                onFocus={() => warmRanks(qc)}
                onTouchStart={() => warmRanks(qc)}
              >
                Ranks
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

/** Phone-only bottom tab bar: primary navigation within thumb reach. */
export function MobileTabBar({ className }: { className?: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const tab =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-semibold tracking-normal text-muted-foreground transition-colors [&.active]:text-primary";
  return (
    <nav
      aria-label="Main"
      className={cn(
        "site-chrome fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] lg:hidden",
        className,
      )}
    >
      <Link
        to="/"
        className={tab}
        activeOptions={{ exact: true }}
        onTouchStart={() => prefetchGamePage(qc, "/")}
      >
        <Dices className="h-5 w-5" />
        Jackpot
      </Link>
      <Link to="/coinflip" className={tab} onTouchStart={() => prefetchGamePage(qc, "/coinflip")}>
        <Coins className="h-5 w-5" />
        Coinflip
      </Link>
      <Link to="/roulette" className={tab} onTouchStart={() => prefetchGamePage(qc, "/roulette")}>
        <CircleDot className="h-5 w-5" />
        Roulette
      </Link>
      <Link to="/slott" className={tab} onTouchStart={() => prefetchGamePage(qc, "/slott")}>
        <Cherry className="h-5 w-5" />
        Slott
      </Link>
      <Link to="/poker" className={tab} onTouchStart={() => prefetchGamePage(qc, "/poker")}>
        <Spade className="h-5 w-5" />
        Poker
      </Link>
      <Link
        to="/8-ball-pool"
        className={tab}
        onTouchStart={() => {
          prefetchGamePage(qc, "/8-ball-pool");
          warmPoolPages(router);
        }}
      >
        <Circle className="h-5 w-5" />8 Pool
      </Link>
      <Link
        to="/fps-duel"
        className={tab}
        onMouseEnter={() => warmStrikePages(router, qc, userId)}
        onFocus={() => warmStrikePages(router, qc, userId)}
        onTouchStart={() => warmStrikePages(router, qc, userId)}
      >
        <Crosshair className="h-5 w-5" />
        PvPStrike
      </Link>
      <Link to="/fairness" className={tab}>
        <ShieldCheck className="h-5 w-5" />
        Fairness
      </Link>
    </nav>
  );
}
