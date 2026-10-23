const KEY = "pvp-pool-tutorial";

/** First-match notes. Local only, same pattern as mute and the poker welcome. */
export function poolTutorialDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissPoolTutorial() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode: this page only */
  }
}
