import { useEffect, useState } from "react";
import type { BrGraphics } from "@/lib/fps/br/br-arena";

/** How long the "restored" note stays (ms); the fallback advice stays longer: it is more to read. */
const RESTORED_MS = 5000;
const FELL_BACK_MS = 20000;

/**
 * What a player sees when the browser takes the graphics away mid-match (owner, 2026-11-15:
 * "randomly the screen turned white"). A lost canvas is blank, so the page showed through with
 * no word of what had happened. The match keeps running underneath: this says so, says when the
 * picture is back, and, when the browser came back on a lesser GPU, that only restarting the
 * browser returns the card (a page reload does not).
 */
export function BrGraphicsNotice({ graphics }: { graphics: BrGraphics | null }) {
  const [shown, setShown] = useState(graphics);
  useEffect(() => {
    setShown(graphics);
    if (graphics?.state !== "restored") return;
    const timer = setTimeout(
      () => setShown(null),
      graphics.fellBackFrom ? FELL_BACK_MS : RESTORED_MS,
    );
    return () => clearTimeout(timer);
  }, [graphics]);
  // A stuck picture needs the mouse for its button.
  useEffect(() => {
    if (shown?.state === "stuck") document.exitPointerLock?.();
  }, [shown]);
  if (!shown) return null;
  if (shown.state === "restored")
    return (
      <div className="br-graphics-note" role="status">
        {shown.fellBackFrom ? (
          <>
            <b>Your browser stopped using your {shown.fellBackFrom}.</b>
            <span>
              The picture is back on {shown.gpu || "a slower graphics chip"}, so the game runs
              slower. After this match, close every browser window and open the browser again:
              reloading the page does not bring the card back.
            </span>
          </>
        ) : (
          <b>Picture restored.</b>
        )}
      </div>
    );
  return (
    <div className="br-graphics-lost" role="alert">
      <div>
        <h2>
          {shown.state === "stuck" ? "The picture did not come back" : "Restoring the picture"}
        </h2>
        {shown.state === "stuck" ? (
          <>
            <p>
              Your browser lost the graphics card and has not given it back. Your match is still
              running: reload the page to rejoin it.
            </p>
            <button type="button" className="duel-primary" onClick={() => location.reload()}>
              Reload
            </button>
          </>
        ) : (
          <p>Your browser lost the graphics card for a moment. Your match is still running.</p>
        )}
      </div>
    </div>
  );
}
