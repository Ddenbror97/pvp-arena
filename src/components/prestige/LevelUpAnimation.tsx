import { useEffect } from "react";
import { PlayerPrestigeIdentity } from "./PlayerPrestigeIdentity";
import type { PrestigeLevel } from "@/lib/prestige/api";

export function LevelUpAnimation({
  from,
  to,
  tier,
  unlocks,
  avatar,
  name,
  frame,
  crown,
  onDone,
}: {
  from: number;
  to: number;
  tier: string;
  unlocks: PrestigeLevel[];
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  frame?: string | null | undefined;
  crown?: string | null | undefined;
  onDone: () => void;
}) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onDone, reduced ? 1600 : 2000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
      role="status"
      aria-labelledby="level-up-title"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-primary/40 bg-card p-5 text-center shadow-2xl">
        <p
          id="level-up-title"
          className="font-display text-xs uppercase tracking-[0.28em] text-primary"
        >
          Level up
        </p>
        <p className="mt-2 font-display text-3xl">Level {to}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {tier}
          {from < to - 1 ? ` · from level ${from}` : ""}
        </p>
        <div className="mt-5 flex justify-center">
          <PlayerPrestigeIdentity
            avatar={avatar}
            name={name}
            frame={frame}
            crown={crown}
            level={to}
            tier={tier}
            size={120}
          />
        </div>
        {unlocks.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              New unlock{unlocks.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-2 space-y-1">
              {unlocks.map((u) => (
                <li key={u.level} className="text-sm font-semibold">
                  {u.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-5 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
