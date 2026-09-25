import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { GuideCluster } from "@/content/guides";

type Game = { to: "/" | "/coinflip" | "/roulette"; name: string; hook: string };

const GAMES: Record<GuideCluster, Game> = {
  Foundations: { to: "/", name: "Jackpot", hook: "Players are filling the pot right now." },
  "Provably fair": { to: "/roulette", name: "Roulette", hook: "A new provably fair spin every few seconds." },
  "CS:GO heritage": { to: "/coinflip", name: "Coinflip", hook: "The CS:GO classic, 1v1, exact 50/50." },
  "Games & odds": { to: "/roulette", name: "Roulette", hook: "See the odds from this guide play out live." },
  "Crypto payments": { to: "/", name: "Jackpot", hook: "USDC on Base, credited automatically." },
  "Responsible play": { to: "/", name: "Jackpot", hook: "Watch for free, no account needed." },
};

const KEY = "pvp-guide-cta-dismissed";

/** Slide-up call to action shown once per visit after 40% of a guide is scrolled. */
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
      aria-label="Play on PVPspinArena"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-6 fade-in rounded-2xl border border-primary/40 bg-card p-5 shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <button onClick={close} aria-label="Close" className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Live now · {game.name}
      </p>
      <h2 className="mt-2 pr-6 font-display text-xl leading-tight">
        {soft ? "Play only with a plan" : "Ready to try it for real?"}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {game.hook} {soft ? "Set your budget first." : "Every round is verifiable, and the default fee on PvP games is 0%."}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {userId ? (
          <Link to={game.to} onClick={close} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Play {game.name} now <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/auth" onClick={close} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Play now, it's free <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <Link to={game.to} onClick={close} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:border-primary hover:text-primary">
          <Radio className="h-4 w-4" /> Watch live {game.name}
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">18+ only. Play responsibly.</p>
    </aside>
  );
}
