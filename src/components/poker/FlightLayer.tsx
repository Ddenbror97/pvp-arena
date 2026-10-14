import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Anchor, Flight } from "@/lib/poker/director";

export interface FlightLayerHandle {
  fly(f: Flight): void;
  cancelAll(): void;
}

function selector(a: Anchor): string {
  switch (a.kind) {
    case "deck":
      return '[data-anchor="deck"]';
    case "muck":
      return '[data-anchor="muck"]';
    case "pot":
      return '[data-anchor="pot"]';
    case "board":
      return `[data-anchor="board-${a.index}"]`;
    case "bet":
      return a.seat < 0
        ? '[data-anchor^="bet-"][data-has-bet="1"]'
        : `[data-anchor="bet-${a.seat}"]`;
    case "seat":
      return a.slot == null
        ? `[data-anchor="seat-${a.seat}"]`
        : `[data-anchor="hole-${a.seat}-${a.slot}"]`;
  }
}

/**
 * Overlay for card and chip flights. Targets are read from the live layout when a flight
 * starts, so a resize never sends a card to a stale spot. Flights carry no card faces and
 * never block clicks; when one finishes or is cancelled its element is removed.
 */
export const FlightLayer = forwardRef<
  FlightLayerHandle,
  { root: React.RefObject<HTMLElement | null> }
>(function FlightLayer({ root }, ref) {
  const layer = useRef<HTMLDivElement>(null);
  const running = useRef(new Set<Animation>());

  useImperativeHandle(ref, () => ({
    fly(f) {
      const host = layer.current;
      const scope = root.current;
      if (!host || !scope || f.durationMs <= 0) return;
      const base = host.getBoundingClientRect();
      const froms =
        f.from.kind === "bet" && f.from.seat < 0
          ? Array.from(scope.querySelectorAll<HTMLElement>(selector(f.from)))
          : [scope.querySelector<HTMLElement>(selector(f.from))].filter(
              (x): x is HTMLElement => !!x,
            );
      const to = scope.querySelector<HTMLElement>(selector(f.to));
      if (!to || froms.length === 0) return;
      const tr = to.getBoundingClientRect();
      for (const from of froms) {
        const fr = from.getBoundingClientRect();
        const el = document.createElement("span");
        el.className =
          f.kind === "card" ? "poker-card poker-card-back poker-flight" : "poker-flight-chips";
        host.appendChild(el);
        const w = el.offsetWidth || 1;
        const h = el.offsetHeight || 1;
        const x0 = fr.left + fr.width / 2 - base.left - w / 2;
        const y0 = fr.top + fr.height / 2 - base.top - h / 2;
        const x1 = tr.left + tr.width / 2 - base.left - w / 2;
        const y1 = tr.top + tr.height / 2 - base.top - h / 2;
        const lift = Math.min(60, Math.hypot(x1 - x0, y1 - y0) * 0.12);
        const spin = f.kind === "card" ? (x1 > x0 ? 1 : -1) * 14 : 0;
        const s1 =
          f.kind === "card" && f.to.kind === "seat" ? Math.min(1.25, tr.width / w || 1) : 1;
        const anim = el.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(0.85)`, opacity: 0.0 },
            { opacity: 1, offset: 0.12 },
            {
              transform: `translate(${(x0 + x1) / 2}px, ${(y0 + y1) / 2 - lift}px) rotate(${spin}deg) scale(1)`,
              offset: 0.55,
            },
            {
              transform: `translate(${x1}px, ${y1}px) rotate(0deg) scale(${s1})`,
              opacity: f.to.kind === "muck" ? 0 : 1,
            },
          ],
          {
            duration: f.durationMs,
            delay: f.delayMs,
            easing: "cubic-bezier(.2,.7,.25,1)",
            fill: "both",
          },
        );
        running.current.add(anim);
        const done = () => {
          running.current.delete(anim);
          el.remove();
        };
        anim.onfinish = done;
        anim.oncancel = done;
      }
    },
    cancelAll() {
      for (const a of [...running.current]) a.cancel();
      running.current.clear();
    },
  }));

  useEffect(() => {
    const set = running.current;
    return () => {
      for (const a of [...set]) a.cancel();
      set.clear();
    };
  }, []);

  return (
    <div
      ref={layer}
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-hidden
    />
  );
});
