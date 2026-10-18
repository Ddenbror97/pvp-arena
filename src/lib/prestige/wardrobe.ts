import { useSyncExternalStore } from "react";

/** Cosmetics the player has already looked at. Anything owned but not in this set shows as "New". */
const KEY = "pvp-wardrobe-seen";
const listeners = new Set<() => void>();
let cache: Set<string> | null = null;
let snapshot = "";

function read(): Set<string> {
  if (cache) return cache;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  snapshot = [...cache].join(",");
  return cache;
}

export function markSeen(...ids: (string | null | undefined)[]) {
  const seen = read();
  let changed = false;
  for (const id of ids) {
    if (id && !seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  snapshot = [...seen].join(",");
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    /* Storage can be blocked; the badge clears for this view only. */
  }
  listeners.forEach((l) => l());
}

/** Seen ids, or null before hydration so the server render never shows "New". */
export function useSeenCosmetics(): Set<string> | null {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (read(), snapshot),
    () => null,
  );
  return snap == null ? null : read();
}

export function scrollToWardrobe() {
  document.getElementById("wardrobe")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
