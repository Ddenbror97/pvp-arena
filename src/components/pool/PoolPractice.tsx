import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleHelp, RotateCcw, Settings, Volume2, VolumeX } from "lucide-react";
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
  applyTimeout,
  type ShotEvent,
  type TableState,
} from "@/lib/pool/rules";
import { PHYSICS_VERSION, type Ball, type ShotInput } from "@/lib/pool/physics";
import { cueSound, pocketSound, ballSound, cushionSound } from "@/lib/pool/sfx";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { useAuth } from "@/lib/auth";
import { PoolShell, SeatCard, SpinPad } from "./PoolMatchView";
import { ballRack, ballsAhead, impactOf } from "@/lib/pool/presentation";
import { matchNotice, POOL_RULES, spinSentence, winSentence } from "@/lib/pool/copy";
import {
  startPracticeClock,
  tickPracticeClock,
  type PracticeClock,
} from "@/lib/pool/practice-clock";
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
      !state.timeouts ||
      ![state.timeouts.A, state.timeouts.B].every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 3,
      ) ||
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
  const { profile } = useAuth();
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
  const [sheet, setSheet] = useState(false),
    [rulesOpen, setRulesOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<ShotEvent | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
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
    setLastEvent(null);
    setDeadline(null);
    try {
      sessionStorage.removeItem(`${SAVE}-clock`);
    } catch {
      /* Storage may be disabled. */
    }
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
  useEffect(() => {
    if (!table || table.winner || phase === "rolling" || phase === "stroke" || error) {
      setDeadline(null);
      return;
    }
    const key = `${table.shot}:${table.turn}`;
    let clock: PracticeClock = startPracticeClock(Date.now()),
      persisted = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(`${SAVE}-clock`) ?? "null");
      if (
        saved?.key === key &&
        Number.isFinite(saved.deadline) &&
        Math.abs(saved.deadline - Date.now()) < 86400000 &&
        Number.isFinite(saved.lastSeen) &&
        typeof saved.graceUsed === "boolean"
      )
        clock = { deadline: saved.deadline, lastSeen: saved.lastSeen, graceUsed: saved.graceUsed };
    } catch {
      /* A malformed saved clock starts a fresh window. */
    }
    setDeadline(new Date(clock.deadline).toISOString());
    const tick = () => {
      if (locked.current) return;
      const now = Date.now();
      const result = tickPracticeClock(
        clock,
        now,
        table.turn === "B" || document.visibilityState === "visible",
      );
      if (result.clock.deadline !== clock.deadline)
        setDeadline(new Date(result.clock.deadline).toISOString());
      clock = result.clock;
      if (now - persisted >= 4000) {
        try {
          sessionStorage.setItem(`${SAVE}-clock`, JSON.stringify({ ...clock, key }));
        } catch {
          /* Optional local storage. */
        }
        persisted = now;
      }
      if (result.timeout) {
        clearInterval(id);
        setPlace(null);
        setCalled(null);
        setNote("Shot clock expired. Ball in hand to the other player.");
        setTable(applyTimeout(table));
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [table, phase, error]);
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
    setLastEvent(result.played.event);
    setFrames(null);
    setStroke(null);
    setPhase("idle");
    setPlace(null);
    setCalled(null);
    setPower(1);
    setNote("");
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
  const otherGroup = table ? seatGroup(table, "B") : null;
  const shooterGroup = table ? seatGroup(table, table.turn) : null;
  const shootingEight =
    !!table && shooterGroup !== null && groupClear(table.balls, shooterGroup) && !table.breakShot;
  const matchLine = table
    ? matchNotice({
        status: "PLAYING",
        youWon: false,
        youLost: false,
        payout: "",
        winReason: table.reason,
        fouled: !!lastEvent?.foul && table.ballInHand,
        foulReason: lastEvent?.foulReason ?? null,
        ballInHand: table.ballInHand,
        kitchenOnly: table.kitchenOnly,
        shootingEight,
        pocketChosen: called !== null,
        decided: false,
        mine,
        group,
        breakShot: table.breakShot,
        busy: phase === "thinking" && table.turn === "A",
        rolling: phase === "rolling",
        offline: false,
        reconnecting: false,
        seat: "A",
      })
    : status;
  const banner =
    error ||
    (phase === "aiming" || (phase === "thinking" && table?.turn === "B")
      ? status
      : note || matchLine);
  return (
    <PoolShell
      className="pool-practice"
      data-phase={phase}
      data-turn={table?.turn}
      data-shot={table?.shot}
    >
      <h1 className="sr-only">8-ball Practice</h1>
      <div className="pool-practice-label">
        <strong>Practice</strong>
        <span>Free · no stake · no payout</span>
      </div>
      <div className="pool-vs" aria-label="Players">
        <SeatCard
          name={profile?.username ?? "You"}
          avatar={profile?.avatar_url}
          stake={0}
          stakeLabel="Free Practice"
          rack={ballRack(table?.balls ?? [], group)}
          group={group}
          ahead={ballsAhead(table?.balls ?? [], group, otherGroup)}
          present
          active={table?.turn === "A" && !table.winner}
          hand={!!table?.ballInHand && table.turn === "A"}
          deadline={table?.turn === "A" ? deadline : null}
          serverNow={undefined}
        />
        <span className="pool-vs-mark">VS</span>
        <SeatCard
          name="Practice bot"
          stake={0}
          stakeLabel="Free Practice"
          rack={ballRack(table?.balls ?? [], otherGroup)}
          group={otherGroup}
          ahead={ballsAhead(table?.balls ?? [], otherGroup, group)}
          present
          active={table?.turn === "B" && !table.winner}
          hand={!!table?.ballInHand && table.turn === "B"}
          deadline={table?.turn === "B" ? deadline : null}
          serverNow={undefined}
          align="end"
        />
      </div>
      <div className="pool-tools">
        <Link to="/8-ball-pool" className="pool-leave">
          Back to lobby
        </Link>
        <button
          type="button"
          className="pool-gear"
          onClick={reset}
          disabled={!table}
          aria-label="Start new rack"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="pool-gear"
          aria-expanded={sheet}
          aria-label="Shot settings"
          onClick={() => setSheet((value) => !value)}
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="pool-gear"
          aria-expanded={rulesOpen}
          aria-label="Rules"
          onClick={() => setRulesOpen((value) => !value)}
        >
          <CircleHelp className="h-4 w-4" />
        </button>
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
              onAim={(value) => {
                setAngle(value);
                setNote("");
              }}
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
                const impact = impactOf(before, after, table.physics),
                  now = performance.now();
                if (impact.pocket) pocketSound();
                else if (now - soundsAt.current > 32) {
                  if (impact.ball > 700) {
                    ballSound(Math.min(1, impact.ball / 9000));
                    soundsAt.current = now;
                  } else if (impact.rail > 700) {
                    cushionSound(Math.min(1, impact.rail / 9000));
                    soundsAt.current = now;
                  }
                }
              }}
            />
          )}
        </div>
      </div>
      {mine && power > 1 && (
        <div
          className="pool-energy"
          role="meter"
          aria-label="Shot power"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(power / 100)}
        >
          <div className="pool-energy-track">
            <div className="pool-energy-fill" style={{ height: `${power / 100}%` }} />
          </div>
          <span>{Math.round(power / 100)}</span>
        </div>
      )}
      {banner && !table?.winner && (
        <p className="pool-banner practice-status" role="status" aria-live="polite">
          {banner}
          {error && (
            <button type="button" onClick={reset}>
              Start a fresh rack
            </button>
          )}
        </p>
      )}
      {sheet && (
        <div className="pool-sheet">
          <SpinPad
            spinX={spinX}
            spinY={spinY}
            disabled={!mine}
            onChange={(x, y) => {
              setSpinX(x);
              setSpinY(y);
            }}
          />
          <p className="pool-spin-read">{spinSentence(spinX, spinY)}</p>
          <p>
            Drag to aim, pull back and release. Shift gives fine aim. Arrow keys aim and change
            power; Enter shoots.
          </p>
          <button type="button" onClick={() => toggleSoundMuted()}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <p>
            Same PvP shot rules and presence-aware 30-second clock. Practice has no cash stake or
            payout.
          </p>
        </div>
      )}
      {rulesOpen && (
        <div className="pool-rules-pop" role="dialog" aria-label="Rules">
          <ul>
            {POOL_RULES.filter(
              (rule) => !["Waiting", "Disconnect", "Money"].includes(rule.title),
            ).map((rule) => (
              <li key={rule.title}>
                <strong>{rule.title}. </strong>
                {rule.body}
              </li>
            ))}
          </ul>
          <p>
            Practice is free. Leaving returns to the lobby; New rack restarts. No payout or cash
            result is created.
          </p>
          <button type="button" onClick={() => setRulesOpen(false)}>
            Close
          </button>
        </div>
      )}
      {table?.winner && (
        <div className="pool-result" role="status">
          <div className="pool-result-card">
            <strong>{table.winner === "A" ? "You won!" : "Bot wins"}</strong>
            <p>{winSentence(table.reason)}</p>
            <p>Practice complete. No money was wagered or awarded.</p>
            <button type="button" onClick={reset}>
              Play again
            </button>
            <Link to="/8-ball-pool">Back to lobby</Link>
          </div>
        </div>
      )}
    </PoolShell>
  );
}
