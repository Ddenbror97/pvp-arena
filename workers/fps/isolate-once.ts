/**
 * One build per isolate, however many requests ask for it at once (owner, 2026-11-23: "after
 * a update is deployed, player getting stuck like this instead of getting into the 2 minute
 * warm up game").
 *
 * After a deploy every isolate is cold, and the island takes seconds of CPU and most of the
 * isolate's memory to build. Every room in the isolate, and every retry of a player's socket
 * while the first build was still running, used to start a build of its own: two or three
 * islands at once are past the Durable Object's 128 MB, the isolate is reset, every build in it
 * is lost, and the retries start them over, until by chance one finishes alone.
 *
 * Callers do not share a promise (a Durable Object request's promises belong to it: a later
 * request awaiting one can fail when its creator has ended). The first caller builds and
 * beats as it goes; the others wait on their own timers and take the result when it lands. A
 * build whose beat stops (its request was cancelled mid-way) is taken over after `staleMs`.
 */
export type IsolateOnce<T> = {
  /** The built value, building it (or waiting for the build under way) when there is none. */
  get(build: (beat: () => void) => Promise<T>): Promise<T>;
  /** The value, when built. */
  readonly value: T | null;
};

export function isolateOnce<T>(
  opts: { pollMs?: number; staleMs?: number; now?: () => number } = {},
): IsolateOnce<T> {
  const pollMs = opts.pollMs ?? 150,
    staleMs = opts.staleMs ?? 20_000,
    now = opts.now ?? Date.now;
  let value: T | null = null;
  /** When the build under way last made progress (0: none under way). */
  let beatAt = 0;
  /** Which build is under way (a stale one taken over must not clear its successor's beat). */
  let build = 0;
  return {
    get value() {
      return value;
    },
    async get(make) {
      while (value === null && beatAt !== 0 && now() - beatAt < staleMs)
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (value !== null) return value;
      const mine = ++build;
      beatAt = now();
      try {
        const made = await make(() => {
          if (build === mine) beatAt = now();
        });
        value ??= made;
        return value;
      } finally {
        if (build === mine) beatAt = 0;
      }
    },
  };
}
