import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/jackpot/api";
import { arenaLogo } from "@/assets/media";
import { WalletGroupPlaceholder } from "@/components/wallet/HeaderWalletFrame";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlayerPrestigeIdentity } from "@/components/prestige/PlayerPrestigeIdentity";
import { equippedAssets, usePrestige } from "@/components/prestige/PrestigeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HeaderWallet = lazy(() =>
  import("@/components/wallet/HeaderWallet").then((m) => ({ default: m.HeaderWallet })),
);

const GAMES = [
  ["/poker", "Poker lobby"],
  ["/", "Jackpot"],
  ["/coinflip", "Coinflip"],
  ["/roulette", "Roulette"],
  ["/slott", "P2P Slott"],
  ["/fairness", "Fairness"],
] as const;

/** Brand mark for the full-screen table, standing in for the site header. */
export function GameBrand() {
  return (
    <Link to="/" className="poker-brand" aria-label="PVPspinArena home">
      <img src={arenaLogo} alt="PVPspinArena" width={240} height={128} decoding="async" />
    </Link>
  );
}

/** Balance, deposit, profile and site menu for the full-screen table. */
export function GameAccount() {
  const { userId, profile, ready } = useAuth();
  const prestige = usePrestige();
  const style = equippedAssets(prestige.state);
  const wallet = useWallet(userId);
  return (
    <div className="poker-account">
      {userId ? (
        <>
          <Suspense fallback={<WalletGroupPlaceholder />}>
            <HeaderWallet
              userId={userId}
              available={wallet.data?.available}
              loading={!ready || wallet.isLoading}
            />
          </Suspense>
          <Link to="/profile" aria-label="Profile" className="poker-account-avatar">
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
      ) : ready ? (
        <Link to="/auth" className="poker-signin">
          Sign in
        </Link>
      ) : null}
      <ThemeToggle className="poker-icon-btn" />
      <DropdownMenu>
        <DropdownMenuTrigger className="poker-icon-btn" aria-label="Menu">
          <Menu className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {GAMES.map(([to, label]) => (
            <DropdownMenuItem key={to} asChild>
              <Link to={to}>{label}</Link>
            </DropdownMenuItem>
          ))}
          {userId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/wallet">Wallet</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
