import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { GuideCluster } from "@/content/guides";

type Game = { to: "/" | "/coinflip" | "/roulette"; name: string; hook: string };

const GAMES: Record<GuideCluster, Game> = {
  Foundations: { to: "/", name: "Jackpot", hook: "Players are filling the pot right now." },
  "Provably fair": {
    to: "/roulette",
    name: "Roulette",
    hook: "A new provably fair spin every few seconds.",
  },
  "CS:GO heritage": {
    to: "/coinflip",
    name: "Coinflip",
    hook: "The CS:GO classic, 1v1, exact 50/50.",
  },
  "Games & odds": {
    to: "/roulette",
    name: "Roulette",
    hook: "See the odds from this guide play out live.",
  },
  "Crypto payments": { to: "/", name: "Jackpot", hook: "USDC on Base, credited automatically." },
  "Responsible play": { to: "/", name: "Jackpot", hook: "Watch the pot, then set a limit." },
  Sweepstakes: { to: "/", name: "Jackpot", hook: "A cash pot, not a sweeps coin." },
  Poker: { to: "/coinflip", name: "Coinflip", hook: "A 50/50 pot you can verify." },
  "Esports betting": { to: "/", name: "Jackpot", hook: "A hashed pot, not a match line." },
  "Casino games": { to: "/roulette", name: "Roulette", hook: "See a posted edge play out live." },
  "Sports betting": { to: "/", name: "Jackpot", hook: "One pot, no juice on a spread." },
  Blackjack: { to: "/roulette", name: "Roulette", hook: "A posted wheel, not a hidden shoe." },
  Slots: { to: "/roulette", name: "Roulette", hook: "A result you can recompute." },
  "Casino knowledge": {
    to: "/roulette",
    name: "Roulette",
    hook: "A posted wheel, with the seed you can check.",
  },
  "Game shows": {
    to: "/roulette",
    name: "Roulette",
    hook: "A live wheel with a result you can recompute.",
  },
  "Games of chance": {
    to: "/coinflip",
    name: "Coinflip",
    hook: "A 50/50 pot between two players.",
  },
  Lottery: { to: "/", name: "Jackpot", hook: "A shared pot with a posted chance." },
  "Horse racing": { to: "/", name: "Jackpot", hook: "A pot you share, not a tote ticket." },
  "Prediction markets": { to: "/", name: "Jackpot", hook: "A hashed pot, not an event share." },
};

const KEY = "pvp-guide-cta-dismissed";

/** Compact dock shown once per visit after 40% of a guide is scrolled. */
export function GuideScrollCta({ cluster }: { cluster: GuideCluster }) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const game = GAMES[cluster];
  const soft = cluster === "Responsible play";

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.4) {
        setOpen(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => {
    sessionStorage.setItem(KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-label={`Live ${game.name} on PVPspinArena. 18+ only. Play responsibly.`}
      className="fixed inset-x-3 bottom-[4.75rem] z-50 mx-auto max-w-lg animate-in slide-in-from-bottom-4 fade-in sm:inset-x-auto sm:right-4 lg:bottom-4 sm:mx-0 sm:max-w-md"
    >
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card/95 py-2 pl-3 pr-1.5 shadow-lg backdrop-blur-sm sm:gap-3">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Live · {game.name}
          </p>
          <p className="truncate text-xs leading-snug text-foreground sm:text-sm">
            {soft ? "Play only with a plan." : game.hook}
          </p>
        </div>
        <Link
          to={userId ? game.to : "/auth"}
          onClick={close}
          className="inline-flex h-8 w-[4.25rem] shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {soft ? "Watch" : "Play"}
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
