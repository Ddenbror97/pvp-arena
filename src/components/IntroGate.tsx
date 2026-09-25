import { useEffect, useRef, useState } from "react";
import arenaLogo from "@/assets/arena-logo-v2.png.asset.json";

export const INTRO_KEY = "pvp_intro_seen";

const TOTAL_MS = 2600;

export function IntroGate() {
  const [phase, setPhase] = useState<"off" | "play" | "leave">("off");
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem(INTRO_KEY)) return;
    sessionStorage.setItem(INTRO_KEY, "1");
    setPhase("play");
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
