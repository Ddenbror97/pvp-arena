import { useEffect, useRef, useState } from "react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export const INTRO_KEY = "pvp_intro_seen";

/**
 * Inline pre-paint script for the homepage head: marks <html> with
 * `intro-pending` on a first full load of "/" this session, so a solid cover
 * shows before hydration (no flash of the page). Client-side navigation never
 * runs it, so the intro can't replay on "back to Jackpot".
 */
export const INTRO_BOOT_SCRIPT = `try{var n=performance.getEntriesByType("navigation")[0];if(location.pathname==="/"&&!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&(!n||n.type!=="back_forward")){var d=document.documentElement;d.classList.add("intro-pending");d.style.setProperty("--intro-logo","url(${arenaLogo.url})");sessionStorage.setItem("${INTRO_KEY}","1")}}catch(e){}`;

const TOTAL_MS = 2600;
/** If the app hydrates later than this (cold cache / slow network), the
 * visitor has already waited; skip the full gate animation and show the page. */
const MAX_HYDRATION_DELAY_MS = 700;

export function IntroGate() {
  const [phase, setPhase] = useState<"off" | "play" | "leave">("off");
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro-pending")) return;
    if (performance.now() > MAX_HYDRATION_DELAY_MS) {
      // Late hydration: let the CSS cover finish its own fade, then clean up.
      const t = window.setTimeout(() => root.classList.remove("intro-pending"), 1200);
      return () => window.clearTimeout(t);
    }
    setPhase("play");
    root.classList.remove("intro-pending");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevFocus = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => setPhase("off"), TOTAL_MS);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(() => {
    if (phase === "off") document.body.style.overflow = "";
  }, [phase]);

  function dismiss() {
    setPhase((p) => (p === "play" ? "leave" : p));
    window.setTimeout(() => setPhase("off"), 350);
  }

  if (phase === "off") return null;

  const half = (side: "top" | "bottom") => (
    <div className={`intro-half intro-half-${side}`} aria-hidden>
      <div className="intro-logo-wrap">
        <img src={arenaLogo.url} alt="" width={240} height={128} className="intro-logo" decoding="async" />
      </div>
    </div>
  );

  return (
    <div
      className={`intro-gate ${phase === "leave" ? "intro-leave" : ""}`}
      role="dialog"
      aria-label="Welcome to PVPspinArena"
      onClick={dismiss}
    >
      {half("top")}
      {half("bottom")}
      <span className="intro-seam" aria-hidden />
      <button
        ref={skipRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="intro-skip"
      >
        Skip
      </button>
    </div>
  );
}
