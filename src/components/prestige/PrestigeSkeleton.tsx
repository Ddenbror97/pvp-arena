import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Placeholders reuse the real sections' layout classes and typography (with
// transparent text) so every line box matches and nothing moves when data lands.
function Bone({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn("rounded bg-muted text-transparent motion-safe:animate-pulse", className)}>
      {children}
    </span>
  );
}

function Block({ className }: { className: string }) {
  return <div className={cn("rounded-xl bg-muted motion-safe:animate-pulse", className)} />;
}

function HeroSkeleton({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-hidden className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_15.2rem]">
        <div className="p-4 sm:p-5">
          <div className="flex min-h-[111px] items-center gap-3 sm:gap-5">
            <Block className="h-[83px] w-[83px] shrink-0 rounded-[8%]" />
            <div className="min-w-0">
              <p className="font-display text-[11px] uppercase tracking-[0.28em]">
                <Bone>Your prestige</Bone>
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-2xl sm:text-3xl">
                  <Bone>Level 1</Bone>
                </p>
              </div>
              {signedIn ? (
                <p className="mt-2 text-sm">
                  <Bone>No cosmetics equipped · Customize</Bone>
                </p>
              ) : (
                <Block className="mt-3 h-10 w-52 rounded-md" />
              )}
            </div>
          </div>
          <div className="mt-4 sm:mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-base">
                <Bone>0 XP</Bone>
              </p>
              <p className="text-sm">
                <Bone>100 XP to level 2</Bone>
              </p>
            </div>
            <Block className="mt-2 h-2 rounded-full" />
            <p className="mt-2.5 text-xs">
              <Bone>Every $1 you wager earns 10 XP, so about $10 more reaches level 2.</Bone>
            </p>
          </div>
        </div>
        <div className="border-t border-border bg-muted/30 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <p className="font-display text-[11px] uppercase tracking-[0.28em]">
            <Bone>Next unlock</Bone>
          </p>
          <div className="mt-3 flex items-center gap-3 lg:flex-col lg:items-center lg:gap-0">
            <Block className="h-[4.8rem] w-[4.8rem] shrink-0 sm:h-[5.6rem] sm:w-[5.6rem] lg:h-32 lg:w-32" />
            <div className="min-w-0 lg:mt-2.5">
              <p className="font-display text-base">
                <Bone>Reward name</Bone>
              </p>
              <span className="block text-[10px] uppercase tracking-[0.2em]">
                <Bone>Common</Bone>
              </span>
              <span className="mt-1.5 block h-px w-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoadmapSkeleton() {
  return (
    <section aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm uppercase tracking-widest">Prestige roadmap</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs">
            <Bone>Level 1 of 25</Bone>
          </p>
          <span className="hidden h-8 w-[4.5rem] md:block" />
        </div>
      </div>
      <div className="mt-4 hidden overflow-hidden md:block">
        <div className="flex gap-2.5 px-1 py-1">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="w-[7.4rem] shrink-0 rounded-xl border border-border bg-card p-2 text-center"
            >
              <Block className="h-[4.8rem] w-full" />
              <p className="mt-2 font-display text-[10px] uppercase tracking-widest">
                <Bone>Level 1</Bone>
              </p>
              <p className="text-sm">
                <Bone>Reward</Bone>
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-widest">
                <Bone>Locked</Bone>
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="md:hidden">
        <ol className="mt-4">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0">
              <span />
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
                <Block className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] uppercase tracking-widest">
                    <Bone>Level 1</Bone>
                  </p>
                  <p className="text-sm">
                    <Bone>Reward</Bone>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 min-h-11 rounded-xl border border-border" />
      </div>
    </section>
  );
}

function CollectionSkeleton() {
  return (
    <section aria-hidden>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-sm uppercase tracking-widest">Your collection</h2>
          <p className="mt-1 text-sm">
            <Bone>0 / 17 cosmetics unlocked</Bone>
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {["all", "frames", "crowns", "rewards"].map((id) => (
            <span
              key={id}
              className="inline-flex min-h-9 items-center rounded-full bg-secondary px-2.5 text-[11px] font-semibold uppercase tracking-wider text-transparent"
            >
              {id}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col rounded-xl border border-border bg-card p-2">
            <Block className="aspect-[4/3] w-full" />
            <div className="px-1 pb-0.5 pt-2">
              <p className="text-sm">
                <Bone>Reward name</Bone>
              </p>
              <span className="block text-[10px] uppercase tracking-[0.2em]">
                <Bone>Common</Bone>
              </span>
              <span className="mt-1.5 block h-px w-6" />
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em]">
                <Bone>Unlock at level 2</Bone>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrestigeSkeleton({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      className="mx-auto max-w-[57.6rem] space-y-8"
      role="status"
      aria-busy="true"
      aria-label="Loading prestige"
    >
      <HeroSkeleton signedIn={signedIn} />
      <RoadmapSkeleton />
      <CollectionSkeleton />
    </div>
  );
}
