import { useEffect } from "react";

/**
 * Keep a 1v1 or 5v5 match from being left by a stray browser shortcut (owner, 2026-11-13: "its
 * easy to exit the window by accidentally click ctrl … the game should be locked"). Crouch is
 * Ctrl and forward is W: Ctrl+W closes the tab, Ctrl+R reloads, Ctrl+D bookmarks.
 *
 * While `active` (a match in progress):
 *  - closing or reloading the tab asks first (the browser's own "Leave site?" prompt);
 *  - with the mouse captured, Ctrl/⌘ shortcuts the page may cancel are cancelled;
 *  - in full screen the keyboard is locked (Keyboard Lock API, Chromium): the shortcuts the
 *    browser keeps for itself (Ctrl+W, Ctrl+T, Ctrl+N, …) reach the game instead. Esc then has
 *    to be held to leave full screen, as in any browser game that locks the keyboard.
 */
export function useMatchLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const ask = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const keys = (e: KeyboardEvent) => {
      if (!document.pointerLockElement || !(e.ctrlKey || e.metaKey)) return;
      // The game reads the keys itself (crouch + move); only the browser's default goes.
      e.preventDefault();
    };
    type Lockable = { keyboard?: { lock?: () => Promise<void>; unlock?: () => void } };
    const keyboard = (navigator as Navigator & Lockable).keyboard;
    const fullscreen = () => {
      if (document.fullscreenElement) void keyboard?.lock?.().catch(() => {});
      else keyboard?.unlock?.();
    };
    addEventListener("beforeunload", ask);
    document.addEventListener("keydown", keys, true);
    document.addEventListener("fullscreenchange", fullscreen);
    fullscreen();
    return () => {
      removeEventListener("beforeunload", ask);
      document.removeEventListener("keydown", keys, true);
      document.removeEventListener("fullscreenchange", fullscreen);
      keyboard?.unlock?.();
    };
  }, [active]);
}
