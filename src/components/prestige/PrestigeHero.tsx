import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { dollarsFromXp, formatXp } from "@/lib/prestige/progress";
import { cosmeticRows, type PrestigeState } from "@/lib/prestige/api";
import { PlayerPrestigeIdentity } from "./PlayerPrestigeIdentity";
import { RewardStage } from "./PrestigeTimeline";
import { RewardKindLabel } from "./CosmeticCollection";
import { DailyChest } from "./DailyChest";
import { scrollToWardrobe } from "@/lib/prestige/wardrobe";
import { Button } from "@/components/ui/button";

export function PrestigeHero({
  state,
  avatar,
  name,
  frame,
  crown,
}: {
  state: PrestigeState;
  avatar?: string | null | undefined;
  name?: string | null | undefined;
  frame: string | null;
  crown: string | null;
}) {
  const next = state.levels.find((l) => l.level === state.next_level) ?? null;
  // At the final level the panel keeps its shape and shows the last reward earned.
  const shown = next ?? state.levels.at(-1) ?? null;
  const span = state.xp_span ?? 0;
  const pct = !next || span <= 0 ? 100 : Math.min(100, Math.round((state.xp_into / span) * 100));
  const nameOf = (id: string | null) =>
    id ? (cosmeticRows(state).find((l) => l.cosmetic_id === id)?.name ?? null) : null;
  const equipped = [nameOf(state.equipped_frame), nameOf(state.equipped_crown)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-labelledby="prestige-level"
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_15.2rem]">
        <div className="relative p-4 sm:p-5">
          {/* 111px = 83px avatar + the tallest crown headroom, so equipping a crown never grows the hero. */}
          <div className="flex min-h-[111px] items-center gap-3 sm:gap-5">
            <PlayerPrestigeIdentity
              avatar={avatar}
              name={name}
              frame={frame}
              crown={crown}
              level={state.level}
              tier={state.tier}
              size={83}
              className="shrink-0"
            />
            <div className={cn("min-w-0 flex-1", state.signed_in && "sm:pr-40")}>
              <p className="font-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.28em]">
                Your prestige
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1
                  id="prestige-level"
                  className="font-display text-2xl whitespace-nowrap sm:text-3xl"
                >
                  Level {state.level}
                </h1>
                <span className="font-display text-xs uppercase tracking-[0.22em] text-gold">
                  {state.tier}
                </span>
              </div>
              {state.signed_in ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {equipped ? (
                    <span className="text-foreground">{equipped}</span>
                  ) : (
                    "No cosmetics equipped"
                  )}
                  <span aria-hidden> · </span>
                  <button
                    type="button"
                    onClick={scrollToWardrobe}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Wardrobe
                  </button>
                  <span aria-hidden> · </span>
                  <Link
                    to="/profile"
                    hash="avatar"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Customize avatar
                  </Link>
                </p>
              ) : (
                <Button asChild size="sm" className="mt-3 min-h-10">
                  <Link to="/auth">Sign in to start earning XP</Link>
                </Button>
              )}
            </div>
          </div>
          {state.signed_in ? (
            <div className="mt-3 flex justify-center sm:absolute sm:right-7 sm:top-6 sm:z-10 sm:mt-0">
              <DailyChest />
            </div>
          ) : null}

          <div className="mt-4 sm:mt-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4">
              <p className="tabular font-display text-base">{formatXp(state.xp)} XP</p>
              <p className="tabular text-sm text-muted-foreground">
                {next
                  ? `${formatXp(state.xp_remaining)} XP to level ${next.level}`
                  : "Final level reached"}
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={next ? `Progress to level ${next.level}` : "Progress"}
            >
              <div
                className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              Every $1 you wager earns 10 XP
              {next && state.xp_remaining > 0
                ? `, so about $${Math.max(1, dollarsFromXp(state.xp_remaining)).toLocaleString("en-US")} more reaches level ${next.level}.`
                : "."}
            </p>
          </div>
        </div>

        <div
          className="border-t border-border bg-muted/30 p-4 sm:p-5 lg:border-l lg:border-t-0"
          aria-labelledby="next-unlock"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p
              id="next-unlock"
              className="font-display text-[11px] uppercase tracking-[0.16em] whitespace-nowrap text-primary"
            >
              {next ? "Next unlock" : "Road complete"}
            </p>
            {shown ? (
              <p className="font-display text-[11px] uppercase tracking-widest text-muted-foreground">
                Level {shown.level}
              </p>
            ) : null}
          </div>
          {shown ? (
            <div className="mt-3 flex items-center gap-3 lg:flex-col lg:items-center lg:gap-0">
              <RewardStage
                row={shown}
                size={64}
                animated={!!next}
                className="h-[4.8rem] w-[4.8rem] shrink-0 sm:h-[5.6rem] sm:w-[5.6rem] lg:h-32 lg:w-32"
              />
              <div className="min-w-0 lg:mt-2.5 lg:text-center">
                <p className="truncate font-display text-base">{shown.name}</p>
                <RewardKindLabel row={shown} className="lg:flex lg:flex-col lg:items-center" />
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="font-display text-lg">Road complete</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every reward on the road is yours.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
