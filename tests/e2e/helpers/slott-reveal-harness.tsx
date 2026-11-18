import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Reels } from "../../../src/components/slott/Reels";
import { SlotCabinet } from "../../../src/components/slott/SlotCabinet";
import { SpinFx } from "../../../src/components/slott/SpinFx";
import { hitCells, NO_HITS } from "../../../src/components/slott/hits";
import {
  IDLE_GRID,
  landedAt,
  reelStops,
  type ReelSpin,
} from "../../../src/components/slott/timing";
import { scoreGrid } from "../../../src/lib/slott/paytable";

const grid = Array(20).fill(17) as number[];
const scored = scoreGrid(grid);
const lines = scored.lines.slice(0, 1);
const highlights = hitCells(lines, true);
let serial = 0;
let timer: ReturnType<typeof setTimeout>;
export function Fixture() {
  const [spin, setSpin] = useState<ReelSpin | null>(null);
  const [landed, setLanded] = useState(true);
  (window as unknown as { startSlotSpin: (pending?: boolean) => number[] }).startSlotSpin = (
    pending = false,
  ) => {
    clearTimeout(timer);
    const next = {
      key: `reveal-check:${++serial}`,
      grid,
      prev: IDLE_GRID,
      durationMs: 1800,
      startAt: Date.now(),
      pending,
    };
    setSpin(next);
    setLanded(false);
    if (!pending) timer = setTimeout(() => setLanded(true), landedAt(next) - Date.now());
    return reelStops(next.grid, next.durationMs);
  };
  (window as unknown as { resolveSlotSpin: () => void }).resolveSlotSpin = () => {
    setSpin((old) => {
      if (!old) return old;
      const next = { ...old, pending: false, startAt: Date.now() };
      timer = setTimeout(() => setLanded(true), landedAt(next) - Date.now());
      return next;
    });
  };
  return (
    <div style={{ width: "min(900px, 100vw)", height: 650 }}>
      <SlotCabinet
        bleed
        fill
        reels={
          <Reels
            spin={spin}
            grid={spin ? grid : IDLE_GRID}
            landed={landed}
            highlight={landed && spin ? highlights : NO_HITS}
            fx={
              landed && spin ? (
                <SpinFx
                  key={spin.key}
                  grid={grid}
                  lines={lines}
                  score={lines[0]!.score}
                  who="Preview"
                />
              ) : null
            }
            seamless
          />
        }
      />
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
