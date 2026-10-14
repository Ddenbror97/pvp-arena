import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { TableState } from "@/lib/poker/api";
import { setPokerPrefs } from "@/lib/poker/prefs";
import { TableScreen } from "./TableScreen";

export interface ReplayFixture {
  recordedAt: string;
  heroName: string;
  frames: { label: string; state: TableState }[];
}

/**
 * Development-only: plays snapshots recorded from the real database engine
 * (tests/db/poker-record.integration.test.ts) through the production table UI.
 * Nothing here talks to the server.
 */
export function PokerReplay({ fixture }: { fixture: ReplayFixture }) {
  const [query] = useState(() => new URLSearchParams(window.location.search));
  const [i, setI] = useState(() =>
    Math.min(fixture.frames.length - 1, Math.max(0, Number(query.get("frame") ?? 0) || 0)),
  );
  const [playing, setPlaying] = useState(() => query.get("play") !== "0");
  useState(() => {
    if (query.get("coach") === "0") setPokerPrefs({ welcomed: true });
  });
  const [speed, setSpeed] = useState(1);
  const frame = fixture.frames[i]!;
  const shownAt = useRef(Date.now());
  useEffect(() => {
    shownAt.current = Date.now();
  }, [i]);
  useEffect(() => {
    if (!playing || i >= fixture.frames.length - 1) return;
    const t = setTimeout(() => setI((x) => x + 1), 1700 / speed);
    return () => clearTimeout(t);
  }, [playing, i, speed, fixture.frames.length]);

  const cards = useRef(new Map<number, number[]>());
  const me = frame.state.me;
  if (me?.hand_id && me.hole_cards?.length === 2) cards.current.set(me.hand_id, me.hole_cards);
  const myCards = useCallback((h: number) => cards.current.get(h) ?? null, []);
  const serverTime = Date.parse(frame.state.server_time);
  const serverNow = useCallback(() => serverTime + (Date.now() - shownAt.current), [serverTime]);

  return (
    <TableScreen
      state={frame.state}
      mySeat={me?.seat_no ?? null}
      myCards={myCards}
      serverNow={serverNow}
      busy
      canSit={false}
      offline={false}
      onSit={() => {}}
      onAct={() => {}}
      status={`Replay ${i + 1}/${fixture.frames.length}: ${frame.label}`}
      banner={
        <span className="poker-replay-tag">
          Dev replay · recorded {fixture.recordedAt.slice(0, 10)}
        </span>
      }
      controls={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="poker-icon-btn"
            aria-label="Restart"
            onClick={() => setI(0)}
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="poker-icon-btn"
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="poker-icon-btn"
            aria-label="Next frame"
            onClick={() => setI((x) => Math.min(fixture.frames.length - 1, x + 1))}
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="Replay speed"
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </div>
      }
    />
  );
}
