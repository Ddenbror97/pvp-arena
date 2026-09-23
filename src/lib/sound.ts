/** Sound hooks. Register handlers to attach real audio; default is silent. */
export type SoundEvent = "entry" | "player_join" | "lock" | "spin_start" | "spin_tick" | "spin_stop" | "win" | "lose";

const handlers = new Set<(e: SoundEvent) => void>();

export function onSound(fn: (e: SoundEvent) => void) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export function emitSound(e: SoundEvent) {
  handlers.forEach((h) => {
    try {
      h(e);
    } catch {
      /* sound must never break the game */
    }
  });
}
