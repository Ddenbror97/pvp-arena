import { useSyncExternalStore } from "react";

/**
 * Poker table preferences, kept in localStorage like the site's theme and mute setting.
 * Master mute is the site-wide sound toggle (`@/lib/sound`).
 */
export interface PokerPrefs {
  /** Dealer voice. Off until the player turns it on. */
  voice: boolean;
  voiceVolume: number;
  effectsVolume: number;
  /** Shorter deal and chip animations. */
  fast: boolean;
  /** The first-visit welcome was shown or skipped. */
  welcomed: boolean;
  /** Stored-format revision; 2 raised the voice to full volume once for earlier visitors. */
  rev: number;
}

const KEY = "pvp-poker-prefs";
const REV = 2;
export const DEFAULT_PREFS: PokerPrefs = {
  voice: false,
  voiceVolume: 1,
  effectsVolume: 0.55,
  fast: false,
  welcomed: false,
  rev: REV,
};

const listeners = new Set<() => void>();
let current: PokerPrefs | null = null;

const clamp = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;

function load(): PokerPrefs {
  if (current) return current;
  let raw: Partial<PokerPrefs> = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<PokerPrefs>;
  } catch {
    raw = {};
  }
  current = {
    voice: raw.voice === true,
    voiceVolume:
      raw.rev === REV
        ? clamp(raw.voiceVolume, DEFAULT_PREFS.voiceVolume)
        : DEFAULT_PREFS.voiceVolume,
    effectsVolume: clamp(raw.effectsVolume, DEFAULT_PREFS.effectsVolume),
    fast: raw.fast === true,
    welcomed: raw.welcomed === true,
    rev: REV,
  };
  return current;
}

export function getPokerPrefs(): PokerPrefs {
  return typeof window === "undefined" ? DEFAULT_PREFS : load();
}

export function setPokerPrefs(patch: Partial<PokerPrefs>) {
  current = { ...load(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: this page only */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePokerPrefs(): PokerPrefs {
  return useSyncExternalStore(subscribe, getPokerPrefs, () => DEFAULT_PREFS);
}

/** prefers-reduced-motion, live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (l) => {
      if (typeof window === "undefined") return () => {};
      const m = matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
