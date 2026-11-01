import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import room from "@/assets/pool/room.webp";
import { PoolTable, type WatchedAim } from "./PoolTable";
import { createPracticeClient } from "@/lib/pool/practice-client";
import type { PracticeRoll } from "@/lib/pool/practice.worker";
import {
  calledPocketChoice,
  defaultCueSpot,
  freshTable,
  groupClear,
  legalPlacement,
  seatGroup,
  type TableState,
} from "@/lib/pool/rules";
import { PHYSICS_VERSION, type Ball, type ShotInput } from "@/lib/pool/physics";
import { cueSound, pocketSound, ballSound } from "@/lib/pool/sfx";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import "./practice.css";

const SAVE = "pool-free-practice-v1";
function restore(): TableState | null {
  try {
    const state = JSON.parse(sessionStorage.getItem(SAVE) ?? "null") as TableState | null;
    if (
      !state ||
      state.v !== 1 ||
      state.physics !== PHYSICS_VERSION ||
      state.rules !== "pvp-8ball-v1" ||
      !["A", "B"].includes(state.turn) ||
      ![null, "A", "B"].includes(state.winner) ||
      ![null, "solids", "stripes"].includes(state.groupA) ||
      !Number.isSafeInteger(state.shot) ||
      state.shot < 0 ||
      state.shot > 1000 ||
      ![state.open, state.ballInHand, state.kitchenOnly, state.breakShot].every(
        (v) => typeof v === "boolean",
      ) ||
      !Array.isArray(state.balls) ||
      state.balls.length !== 16 ||
      new Set(state.balls.map((b) => b.id)).size !== 16 ||
      state.balls.some(
        (b) =>
          !Number.isInteger(b.id) ||
          b.id < 0 ||
          b.id > 15 ||
          typeof b.pocketed !== "boolean" ||
          ![b.x, b.y, b.vx, b.vy, b.spin].every(Number.isFinite) ||
          Math.abs(b.x) > 3000000 ||
          Math.abs(b.y) > 1600000 ||
          b.vx !== 0 ||
          b.vy !== 0,
      )
    )
      return null;
    return state;
  } catch {
    return null;
  }
}
function rack() {
  return freshTable(crypto.getRandomValues(new Uint8Array(32)));
}
type Phase = "idle" | "thinking" | "aiming" | "stroke" | "rolling";

/** Free local table: this component has no cash-match, wallet or settlement API. */
export function PoolPractice() {
  const [table, setTable] = useState<TableState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [angle, setAngle] = useState(0),
    [power, setPower] = useState(1);
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [called, setCalled] = useState<number | null>(null);
  const [spinX, setSpinX] = useState(0),
    [spinY, setSpinY] = useState(0);
  const [frames, setFrames] = useState<Ball[][] | null>(null);
  const [watch, setWatch] = useState<WatchedAim | null>(null);
  const [stroke, setStroke] = useState<{
    x: number;
    y: number;
    angle: number;
    power: number;
    holdMs: number;
    ghost: boolean;
    released: boolean;
  } | null>(null);
  const [note, setNote] = useState(""),
    [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const client = useRef<ReturnType<typeof createPracticeClient> | null>(null);
  const generation = useRef(0),
    locked = useRef(false);
  const pending = useRef<PracticeRoll | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const soundsAt = useRef(0);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const reset = useCallback(() => {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    client.current?.dispose();
    client.current = null;
    try {
      client.current = createPracticeClient();
    } catch {
      setError("Your browser could not start Practice. Reload the page to retry.");
      return;
    }
    locked.current = false;
    pending.current = null;
    setPhase("idle");
    setFrames(null);
    setStroke(null);
    setWatch(null);
    setPlace(null);
    setCalled(null);
    setSpinX(0);
    setSpinY(0);
    setAngle(0);
    setPower(1);
    setNote("");
    setError("");
    setTable(rack());
  }, []);
  useEffect(() => {
    const lifecycle = generation;
    try {
      client.current = createPracticeClient();
      setTable(restore() ?? rack());
    } catch {
      setError("Your browser could not start Practice. Reload the page to retry.");
    }
    setMuted(soundMuted());
    const unsubscribe = subscribeSound(() => setMuted(soundMuted()));
    return () => {
      lifecycle.current++;
      timers.current.forEach(clearTimeout);
      client.current?.dispose();
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (table) {
      try {
        sessionStorage.setItem(SAVE, JSON.stringify(table));
      } catch {
        /* Storage may be disabled. */
      }
    }
  }, [table]);
  const begin = useCallback(async (current: TableState, shot?: ShotInput) => {
    if (locked.current || !client.current || current.winner) return;
    locked.current = true;
    const token = generation.current;
    setError("");
    setNote("");
    setPhase("thinking");
    try {
      const result = await client.current.roll(current, shot);
      if (token !== generation.current) return;
      pending.current = result;
      const bot = !shot;
      const start = () => {
        if (token !== generation.current) return;
        setWatch(null);
        setPhase("stroke");
        setStroke({
          x: result.played.cue.x,
          y: result.played.cue.y,
          angle: result.shot.angleMilli,
          power: result.shot.power,
          holdMs: 480,
          ghost: bot,
          released: true,
        });
        later(() => {
          if (token !== generation.current) return;
          cueSound(result.shot.power);
          setFrames(result.played.sequence);
          setPhase("rolling");
        }, 205);
      };
      if (bot) {
        setPhase("aiming");
        setWatch({
          angle: result.shot.angleMilli,
          power: result.shot.power,
          x: result.played.cue.x,
          y: result.played.cue.y,
          playing: true,
        });
        later(start, 1650);
      } else start();
    } catch (e) {
      if (token !== generation.current) return;
      locked.current = false;
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Could not prepare the shot.");
    }
  }, []);
  useEffect(() => {
    if (!table || table.turn !== "B" || table.winner || phase !== "idle" || error) return;
    const id = setTimeout(() => void begin(table), 600);
    return () => clearTimeout(id);
  }, [table, phase, error, begin]);
  const finish = useCallback((sequence: readonly Ball[][]) => {
    const result = pending.current;
    if (!result || result.played.sequence !== sequence) return;
    pending.current = null;
    locked.current = false;
    setTable(result.played.state);
    setFrames(null);
    setStroke(null);
    setPhase("idle");
    setPlace(null);
    setCalled(null);
    setPower(1);
    const working = result.played.state;
    setNote(
      working.ballInHand
        ? "Foul · ball in hand."
        : result.shot.calledPocket !== null
          ? "The 8-ball pocket was called."
          : "",
    );
  }, []);
  const mine =
    !!table && !table.winner && table.turn === "A" && phase === "idle" && !locked.current;
  const group = table ? seatGroup(table, "A") : null;
  const calling =
    !!table && mine && group !== null && groupClear(table.balls, group) && !table.breakShot;
  const ghost = table && mine && table.ballInHand ? (place ?? defaultCueSpot(table)) : null;
  const shoot = (pulled: number, aim: number) => {
    if (!table || !mine) return;
    if (calling && called === null) {
      setNote("Choose the pocket for the 8-ball first.");
      return;
    }
    const position = table.ballInHand ? (place ?? defaultCueSpot(table)) : null;
    void begin(table, {
      angleMilli: aim,
      power: pulled,
      spinX,
      spinY,
      placeX: position?.x ?? null,
      placeY: position?.y ?? null,
      calledPocket: called,
    });
  };
  const keyboard = useRef({ shoot, power, angle });
  keyboard.current = { shoot, power, angle };
  useEffect(() => {
    if (!mine) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, button, a")
      )
        return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight")
        setAngle(
          (value) =>
            (value +
              (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 100 : 1000) +
              360000) %
            360000,
        );
      else if (event.key === "ArrowUp" || event.key === "ArrowDown")
        setPower((value) =>
          Math.max(1, Math.min(10000, value + (event.key === "ArrowUp" ? 500 : -500))),
        );
      else keyboard.current.shoot(keyboard.current.power, keyboard.current.angle);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mine]);
  const status =
    error ||
    (!table
      ? "Preparing the table…"
      : table.winner
        ? table.winner === "A"
          ? "You won the practice rack!"
          : "Practice bot wins this rack."
        : phase === "rolling"
          ? "Balls in motion…"
          : phase === "stroke"
            ? "Taking the shot…"
            : phase === "thinking"
              ? table.turn === "B"
                ? "Practice bot is choosing a shot…"
                : "Preparing your shot…"
              : phase === "aiming"
                ? "Practice bot is aiming…"
                : table.turn === "B"
                  ? "Practice bot's turn"
                  : calling
                    ? "Call a pocket for the 8-ball"
                    : table.ballInHand
                      ? table.kitchenOnly
                        ? "Your break · place the cue ball behind the line"
                        : "Your turn · ball in hand"
                      : "Your turn · drag to aim, pull back and release");
  return (
    <div
      className="pool-screen pool-practice"
      data-phase={phase}
      data-turn={table?.turn}
      data-shot={table?.shot}
    >
      <div className="pool-room" style={{ backgroundImage: `url(${room})` }} aria-hidden />
      <header className="practice-header">
        <Link to="/8-ball-pool" className="pool-leave">
          ← Pool lobby
        </Link>
        <div>
          <h1>8-ball Practice</h1>
          <p>Free · no stake · no payout</p>
        </div>
        <div className="practice-actions">
          <button type="button" onClick={reset} aria-label="Start new rack">
            <RotateCcw size={18} />
            <span>New rack</span>
          </button>
          <button
            type="button"
            onClick={toggleSoundMuted}
            aria-label={muted ? "Enable sound" : "Mute sound"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>
      <details className="practice-settings">
        <summary>Spin & controls</summary>
        <div>
          <label>
            Side spin{" "}
            <input
              type="range"
              min={-1000}
              max={1000}
              step={20}
              value={spinX}
              disabled={!mine}
              onChange={(event) => setSpinX(Number(event.target.value))}
            />
          </label>
          <label>
            Top / backspin{" "}
            <input
              type="range"
              min={-1000}
              max={1000}
              step={20}
              value={spinY}
              disabled={!mine}
              onChange={(event) => setSpinY(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={!mine}
            onClick={() => {
              setSpinX(0);
              setSpinY(0);
            }}
          >
            Centre strike
          </button>
          <p>
            Drag to aim, pull back and release. Arrow keys aim and change power; Shift gives fine
            aim. Enter shoots. Call a pocket for the 8.
          </p>
        </div>
      </details>
      <div className="practice-seats" aria-label="Players">
        {(["A", "B"] as const).map((seat) => {
          const g = table ? seatGroup(table, seat) : null;
          const left =
            table && g
              ? table.balls.filter(
                  (b) =>
                    !b.pocketed &&
                    b.id !== 8 &&
                    b.id !== 0 &&
                    (g === "solids" ? b.id < 8 : b.id > 8),
                ).length
              : null;
          return (
            <div key={seat} className={table?.turn === seat && !table.winner ? "is-active" : ""}>
              <strong>{seat === "A" ? "You" : "Practice bot"}</strong>
              <span>{g ? `${g} · ${left} left` : "Open table"}</span>
            </div>
          );
        })}
      </div>
      <div className="pool-felt">
        <div className="pool-felt-frame">
          {table && (
            <PoolTable
              balls={table.balls}
              physicsId={table.physics}
              angleMilli={angle}
              power={power}
              spinX={spinX}
              spinY={spinY}
              ghost={ghost}
              kitchenOnly={table.kitchenOnly}
              calledPocket={watch ? (pending.current?.shot.calledPocket ?? null) : called}
              calling={calling}
              onCallPocket={(id) => setCalled((value) => calledPocketChoice(value, id))}
              showCue={mine}
              watch={watch}
              replay={frames}
              stroke={stroke}
              onAim={setAngle}
              onPower={setPower}
              onShoot={shoot}
              onPlace={(x, y) => {
                if (mine && legalPlacement(table, x, y)) setPlace({ x, y });
              }}
              placing={mine && table.ballInHand}
              legalAt={(x, y) => legalPlacement(table, x, y)}
              onReplayDone={finish}
              onAimHint={setNote}
              onSample={(before, after) => {
                if (after.some((b, i) => b.pocketed && !before[i]?.pocketed)) pocketSound();
                else if (
                  performance.now() - soundsAt.current > 70 &&
                  after.some(
                    (b, i) =>
                      Math.abs(b.vx - (before[i]?.vx ?? b.vx)) +
                        Math.abs(b.vy - (before[i]?.vy ?? b.vy)) >
                      1000,
                  )
                ) {
                  ballSound(0.35);
                  soundsAt.current = performance.now();
                }
              }}
            />
          )}
        </div>
      </div>
      <div className="practice-status" role="status" aria-live="polite">
        <strong>{status}</strong>
        <span>
          {note || "Same table and rules as cash pool. Take your time: there is no shot clock."}
        </span>
        {error && (
          <button type="button" onClick={reset}>
            Start a fresh rack
          </button>
        )}
      </div>
      {table?.winner && (
        <div className="pool-result" role="status">
          <div className="pool-result-card">
            <strong>{table.winner === "A" ? "You won!" : "Bot wins"}</strong>
            <p>Practice complete. No money was wagered or awarded.</p>
            <button type="button" onClick={reset}>
              Play again
            </button>
            <Link to="/8-ball-pool">Back to lobby</Link>
          </div>
        </div>
      )}
    </div>
  );
}
