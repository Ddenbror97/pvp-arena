import { useEffect, useRef, useState } from "react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export const INTRO_KEY = "pvp_intro_seen";

/**
 * Inline pre-paint script for the homepage head: marks <html> with
 * `intro-pending` on a first full load of "/" this session, so a solid cover
 * shows before hydration (no flash of the page). Client-side navigation never
 * runs it, so the intro can't replay on "back to Jackpot".
 */
export const INTRO_BOOT_SCRIPT = `try{var n=performance.getEntriesByType("navigation")[0];if(location.pathname==="/"&&!sessionStorage.getItem("${INTRO_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&(!n||n.type!=="back_forward")){document.documentElement.classList.add("intro-pending")}}catch(e){}`;

const TOTAL_MS = 2600;

export function IntroGate() {
  const [phase, setPhase] = useState<"off" | "play" | "leave">("off");
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro-pending")) return;
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode */
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
        <span
          className="intro-sweep"
          style={{ WebkitMaskImage: `url(${arenaLogo.url})`, maskImage: `url(${arenaLogo.url})` }}
        />
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
