import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Settings, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import room from "@/assets/pool/room.webp";
import { useAuth } from "@/lib/auth";
import {
  poolForfeit,
  poolMessage,
  poolNudge,
  poolTouch,
  usePoolState,
  type PoolView,
} from "@/lib/pool/api";
import { submitPoolShot } from "@/lib/pool/pool.functions";
import { playShot } from "@/lib/pool/play";
import {
  BALL_R,
  POCKETS,
  TABLE_H,
  TABLE_W,
  simulate,
  type Ball,
  type ShotInput,
} from "@/lib/pool/physics";
import {
  applyForfeit,
  applyTimeout,
  freshTable,
  groupClear,
  groupOf,
  legalPlacement,
  placeCue,
  seatGroup,
  seedHash,
} from "@/lib/pool/rules";
import {
  ballSound,
  cueSound,
  cushionSound,
  foulSound,
  pocketSound,
  resultSound,
  tickSound,
} from "@/lib/pool/sfx";
import { bytesFromHex, replayMatch, stepsFromRecord } from "@/lib/pool/verify";
import {
  matchNotice,
  POCKET_LABELS,
  POOL_RULES,
  spinSentence,
  TUTORIAL_STEPS,
} from "@/lib/pool/copy";
import { dismissPoolTutorial, poolTutorialDismissed } from "@/lib/pool/prefs";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { PoolTable } from "./PoolTable";

function seatOf(view: PoolView, userId: string | null): "A" | "B" | null {
  if (!userId) return null;
  if (userId === view.creator_id) return "A";
  if (userId === view.opponent_id) return "B";
  return null;
}

function useRemaining(deadline: string | null, serverNow: string | undefined) {
  const [left, setLeft] = useState(30_000);
  useEffect(() => {
    if (!deadline || !serverNow) return;
    const skew = Date.now() - Date.parse(serverNow);
    const tick = () => setLeft(Date.parse(deadline) - (Date.now() - skew));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [deadline, serverNow]);
  return left;
}

export function PoolMatch({ matchId }: { matchId: number }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const query = usePoolState(matchId);
  const view = query.data;
  const shoot = useServerFn(submitPoolShot);
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(1);
  const [spinX, setSpinX] = useState(0);
  const [spinY, setSpinY] = useState(0);
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [called, setCalled] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [aimAssist, setAimAssist] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [frames, setFrames] = useState<Ball[][] | null>(null);
  const [stroke, setStroke] = useState<{
    x: number;
    y: number;
    angle: number;
    power: number;
  } | null>(null);
  const [seedOk, setSeedOk] = useState<boolean | null>(null);
  const [replayNote, setReplayNote] = useState<string | null>(null);
  const [aimHint, setAimHint] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [muted, setMuted] = useState(false);
  const left = useRemaining(view?.turn_deadline ?? null, view?.server_now);
  const seat = view ? seatOf(view, userId) : null;
  const state = view?.state ?? null;
  const mine =
    seat != null && state?.turn === seat && state.winner == null && view?.status === "PLAYING";
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const liveId = view?.id;
  const liveStatus = view?.status;
  const serverSeed = view?.server_seed ?? null;
  const publishedHash = view?.server_seed_hash ?? null;
  const shotList = view?.events;
  const shotsRef = useRef(shotList);
  shotsRef.current = shotList;
  const sawLive = useRef(false);
  const shooting = useRef(false);
  const presenceWarned = useRef(false);
  const tableHash = view?.state_hash ?? null;
  const physicsId = view?.state?.physics ?? null;
  const updatedAt = query.dataUpdatedAt;
  const noiseAt = useRef(0);
  const onSample = useCallback((prev: readonly Ball[], next: readonly Ball[]) => {
    const hit = impactOf(prev, next);
    const now = performance.now();
    if (hit.pocket) {
      pocketSound();
      return;
    }
    if (now - noiseAt.current <= 48) return;
    if (hit.ball > 700) {
      ballSound(Math.min(1, hit.ball / 9000));
      noiseAt.current = now;
    } else if (hit.rail > 700) {
      cushionSound(Math.min(1, hit.rail / 9000));
      noiseAt.current = now;
    }
  }, []);
  const onReplayDone = useCallback(() => {
    const shots = shotsRef.current;
    const last = shots?.[shots.length - 1];
    if (last?.kind === "shot" && last.event["foul"] === true) foulSound();
    setFrames(null);
    setStroke(null);
  }, []);

  useEffect(() => {
    setTutorialStep(poolTutorialDismissed() ? null : 0);
    const syncMute = () => setMuted(soundMuted());
    syncMute();
    const unsubscribe = subscribeSound(syncMute);
    const syncLine = () => setOffline(!navigator.onLine);
    syncLine();
    window.addEventListener("offline", syncLine);
    window.addEventListener("online", syncLine);
    return () => {
      unsubscribe();
      window.removeEventListener("offline", syncLine);
      window.removeEventListener("online", syncLine);
    };
  }, []);

  useEffect(() => {
    if (!state?.ballInHand) {
      setPlace(null);
      return;
    }
    const cue = state.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    setPlace((current) => {
      if (current && legalPlacement(state, current.x, current.y)) return current;
      if (cue && legalPlacement(state, cue.x, cue.y)) return { x: cue.x, y: cue.y };
      return null;
    });
  }, [state]);

  useEffect(() => {
    if (!serverSeed) return;
    let live = true;
    void seedHash(bytesFromHex(serverSeed)).then((hash) => {
      if (live) setSeedOk(hash === publishedHash);
    });
    return () => {
      live = false;
    };
  }, [serverSeed, publishedHash]);

  useEffect(() => {
    if (liveId == null || seat == null || liveStatus === "COMPLETED" || liveStatus === "CANCELLED")
      return;
    let stopped = false;
    const beat = () => {
      // A hidden tab is a drop, not a presence. The server grants one reconnect window.
      if (stopped || document.visibilityState === "hidden") return;
      void poolTouch(liveId).then((res) => {
        if (!res.error) {
          presenceWarned.current = false;
          return;
        }
        if (!presenceWarned.current) {
          presenceWarned.current = true;
          console.warn("pool presence", res.error.message);
        }
      });
    };
    beat();
    const id = window.setInterval(beat, 4_000);
    const onShow = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, [liveId, liveStatus, seat, updatedAt]);

  useEffect(() => {
    if (liveId == null || liveStatus !== "PLAYING" || left > 0) return;
    void poolNudge(liveId);
  }, [liveId, liveStatus, left]);

  useEffect(() => {
    const shots = shotsRef.current;
    if (!serverSeed || !shots?.length || reduce || !physicsId) {
      setFrames(null);
      setStroke(null);
      return;
    }
    const last = shots[shots.length - 1];
    if (!last || last.kind !== "shot") {
      setFrames(null);
      setStroke(null);
      return;
    }
    const prior = stepsFromRecord(shots.slice(0, -1));
    const input = stepsFromRecord([last])?.[0];
    if (!prior || !input || input.kind !== "shot") return;
    let table = freshTable(bytesFromHex(serverSeed), physicsId);
    for (const step of prior) {
      if (step.kind === "timeout") table = applyTimeout(table);
      else if (step.kind === "forfeit") table = applyForfeit(table, step.seat);
      else {
        const played = playShot(table, step.input);
        if (!played.ok) return;
        table = played.state;
      }
    }
    const placed = structuredClone(table);
    placeCue(placed, input.input);
    const opening = placed.balls.map((ball) => ({ ...ball }));
    const cue = opening.find((ball) => ball.id === 0);
    const sim = simulate(placed.balls, input.input, true, physicsId);
    const sequence = [opening, ...sim.frames];
    const rest = sim.balls;
    const tail = sequence[sequence.length - 1];
    const alreadyRest =
      tail != null &&
      tail.every(
        (ball, index) =>
          ball.pocketed === rest[index]?.pocketed &&
          ball.x === rest[index]?.x &&
          ball.y === rest[index]?.y,
      );
    if (!alreadyRest) sequence.push(rest);
    setFrames(sequence);
    setStroke(
      cue ? { x: cue.x, y: cue.y, angle: input.input.angleMilli, power: input.input.power } : null,
    );
    cueSound();
  }, [serverSeed, tableHash, reduce, physicsId]);

  useEffect(() => {
    if (!view) return;
    if (view.status === "PLAYING" || view.status === "STARTING") sawLive.current = true;
    if (view.status !== "COMPLETED" || !sawLive.current || userId == null || view.winner_id == null)
      return;
    sawLive.current = false;
    resultSound(view.winner_id === userId);
  }, [view, userId]);

  const previewBalls = useMemo(
    () => freshTable(Uint8Array.from({ length: 32 }, (_, i) => (i * 17 + 3) & 255)).balls,
    [],
  );
  const group = state && seat ? seatGroup(state, seat) : null;
  const shootingEight =
    !!state && !!group && groupClear(state.balls, group) && !state.breakShot && mine;
  const ghost = mine && state?.ballInHand ? place : null;

  const names = useMemo(() => {
    if (!view) return { A: "Player A", B: "Player B" };
    return {
      A: view.creator?.username ?? "Player A",
      B: view.opponent?.username ?? "Waiting",
    };
  }, [view]);

  const takeShot = useCallback(async (pulled?: number) => {
    const shotPower = pulled ?? power;
    if (!state || !mine || busy || shooting.current || frames) return;
    shooting.current = true;
    const input: ShotInput = {
      angleMilli: angle,
      power: shotPower,
      spinX,
      spinY,
      placeX: state.ballInHand ? (place?.x ?? null) : null,
      placeY: state.ballInHand ? (place?.y ?? null) : null,
      calledPocket: shootingEight ? called : null,
    };
    if (
      state.ballInHand &&
      (input.placeX == null || !legalPlacement(state, input.placeX, input.placeY ?? 0))
    ) {
      shooting.current = false;
      toast.error(poolMessage("ILLEGAL_PLACEMENT"));
      return;
    }
    if (shootingEight && called == null) {
      shooting.current = false;
      toast.error(poolMessage("CALL_POCKET"));
      return;
    }
    setBusy(true);
    try {
      const result = await shoot({ data: { matchId, key: crypto.randomUUID(), shot: input } });
      if (!result.ok) toast.error(poolMessage(result.error));
      else {
        setPlace(null);
        setPower(1);
      }
      void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch {
      toast.error(poolMessage("REQUEST_FAILED"));
    } finally {
      shooting.current = false;
      setBusy(false);
    }
  }, [
    angle,
    busy,
    called,
    matchId,
    mine,
    place,
    power,
    qc,
    shoot,
    shootingEight,
    spinX,
    frames,
    spinY,
    state,
  ]);

  useEffect(() => {
    if (!mine) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const step = event.altKey ? 1 : event.shiftKey ? 100 : 1_000;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setAngle((current) => (current - step + 360_000) % 360_000);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setAngle((current) => (current + step) % 360_000);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setPower((current) => Math.min(10_000, current + 500));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setPower((current) => Math.max(1, current - 500));
      } else if (event.key === "Enter") {
        event.preventDefault();
        void takeShot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mine, takeShot]);

  const checkReplay = async () => {
    if (!view?.server_seed || !view.state) return;
    const steps = stepsFromRecord(view.events);
    if (!steps) {
      setReplayNote("The shot list could not be read.");
      return;
    }
    const replay = await replayMatch(
      bytesFromHex(view.server_seed),
      view.server_seed_hash,
      steps,
      view.state?.physics ?? "pool-phys-v2",
    );
    const paid =
      view.winner_id == null
        ? replay.winner == null
        : (replay.winner === "A" && view.winner_id === view.creator_id) ||
          (replay.winner === "B" && view.winner_id === view.opponent_id);
    setReplayNote(
      replay.ok && paid
        ? "These shots replay to the same result."
        : "These shots do not replay to the paid result.",
    );
  };

  if (!view) {
    return (
      <Shell>
        <div className="pool-brand">
          <span className="pool-brand-mark" aria-hidden>
            8
          </span>
          <span>
            <strong>POOL</strong>
            <small>PVP · Real money</small>
          </span>
        </div>
        <div className="pool-vs" aria-hidden>
          <span className="pool-seat">
            <span className="pool-face">
              <span>A</span>
            </span>
            <span className="pool-seat-copy">
              <strong>Player</strong>
              <small>$0.00</small>
            </span>
          </span>
          <span className="pool-vs-mark">VS</span>
          <span className="pool-seat is-end">
            <span className="pool-seat-copy">
              <strong>Waiting</strong>
              <small>$0.00</small>
            </span>
            <span className="pool-face">
              <span>B</span>
            </span>
          </span>
        </div>
        <div className="pool-tools">
          <Link to="/8-ball-pool" className="pool-leave">
            Leave game
          </Link>
          <span className="pool-gear" aria-hidden>
            <Settings className="h-4 w-4" />
          </span>
        </div>
        <div className="pool-prize">
          <span className="pool-prize-icon" aria-hidden>
            $
          </span>
          <span>
            <small>Prize pool</small>
            <strong>$0.00</strong>
          </span>
        </div>
        <label className="pool-power">
          <span className="sr-only">Power</span>
          <input type="range" min={1} max={10000} value={power} disabled />
          <span>{Math.round(power / 100)}%</span>
        </label>
        <div className="pool-felt">
          <div className="pool-felt-frame">
            <PoolTable
              balls={previewBalls}
              angleMilli={0}
              power={power}
              spinX={0}
              spinY={0}
              ghost={null}
              kitchenOnly={false}
              calledPocket={null}
              showAim
              showCue
              replay={null}
              stroke={null}
              placing={false}
              legalAt={() => true}
              onAim={() => {}}
              onPlace={() => {}}
              onSample={() => {}}
              onReplayDone={() => {}}
            />
          </div>
        </div>
        <div className="pool-dock">
          <span className="pool-chip">
            Standard <ChevronDown className="h-3.5 w-3.5" />
          </span>
          <span className="pool-chip">
            White ball <ChevronDown className="h-3.5 w-3.5" />
          </span>
          <span className="pool-assist">
            Aim assist
            <span className="pool-switch is-on">
              <span />
            </span>
          </span>
        </div>
        <p className="pool-banner">
          {query.isError
            ? offline
              ? "Reconnecting"
              : "This match is not available."
            : "Loading the table…"}
        </p>
      </Shell>
    );
  }

  const winnerName =
    view.winner_id === view.creator_id
      ? names.A
      : view.winner_id === view.opponent_id
        ? names.B
        : null;
  const balls = state?.balls ?? [];
  const groupA = state ? seatGroup(state, "A") : null;
  const groupB = state ? seatGroup(state, "B") : null;
  const clock = Math.max(0, Math.ceil(left / 1000));
  const lastEvent = view.events[view.events.length - 1];
  const fouled =
    lastEvent?.kind === "shot" && lastEvent.event["foul"] === true && !!state?.ballInHand;
  const youWon = view.status === "COMPLETED" && userId != null && view.winner_id === userId;
  const youLost =
    view.status === "COMPLETED" &&
    userId != null &&
    view.winner_id != null &&
    view.winner_id !== userId;
  const pays = view.payout_amount ?? view.pot - Math.floor((view.pot * view.fee_bps) / 10_000);
  const fee = view.fee_amount ?? view.pot - pays;
  const notice = matchNotice({
    status: view.status,
    youWon,
    youLost,
    payout: dollars(youWon ? pays : (view.payout_amount ?? pays)),
    winReason: view.win_reason,
    cancelReason: view.cancel_reason,
    fouled,
    ballInHand: !!state?.ballInHand,
    kitchenOnly: !!state?.kitchenOnly,
    shootingEight,
    pocketChosen: called != null,
    mine,
    group,
    breakShot: !!state?.breakShot,
    busy,
    rolling: frames != null,
    offline,
    reconnecting: query.isError && view.status !== "COMPLETED" && view.status !== "CANCELLED",
    seat,
  });
  const banner =
    aimHint && mine && frames == null && !busy && !fouled && view.status === "PLAYING"
      ? aimHint
      : notice;
  const showTutorial =
    tutorialStep != null &&
    mine &&
    frames == null &&
    !busy &&
    view.status === "PLAYING" &&
    !rulesOpen &&
    !confirmForfeit;
  const closeTutorial = () => {
    dismissPoolTutorial();
    setTutorialStep(null);
  };

  const leave = () => {
    if (seat && view.status === "PLAYING") setConfirmForfeit(true);
  };

  return (
    <Shell>
      <div className="pool-brand">
        <span className="pool-brand-mark" aria-hidden>
          8
        </span>
        <span>
          <strong>POOL</strong>
          <small>
            Pot {dollars(view.pot)} · pays {dollars(pays)}
          </small>
        </span>
      </div>

      <div className="pool-vs" aria-label="Players">
        <SeatCard
          name={names.A}
          you={seat === "A"}
          avatar={view.creator?.avatar_url}
          stake={view.stake}
          ids={pips(balls, groupA)}
          group={groupA}
          active={state?.turn === "A" && view.status === "PLAYING"}
          clock={state?.turn === "A" && view.status === "PLAYING" ? clock : null}
        />
        <span className="pool-vs-mark">VS</span>
        <SeatCard
          name={names.B}
          you={seat === "B"}
          avatar={view.opponent?.avatar_url}
          stake={view.opponent_id ? view.stake : 0}
          ids={pips(balls, groupB)}
          group={groupB}
          active={state?.turn === "B" && view.status === "PLAYING"}
          clock={state?.turn === "B" && view.status === "PLAYING" ? clock : null}
          align="end"
        />
      </div>

      <div className="pool-tools">
        {seat && view.status === "PLAYING" ? (
          <button type="button" className="pool-leave" onClick={leave}>
            Leave game
          </button>
        ) : (
          <Link to="/8-ball-pool" className="pool-leave">
            {view.status === "WAITING" ? "Back to lobby" : "Leave game"}
          </Link>
        )}
        <button
          type="button"
          className="pool-leave"
          aria-expanded={rulesOpen}
          onClick={() => setRulesOpen((open) => !open)}
        >
          Rules
        </button>
        <button
          type="button"
          className="pool-gear"
          aria-expanded={sheet}
          aria-label="Shot settings and fairness"
          onClick={() => setSheet((open) => !open)}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="pool-prize">
        <span className="pool-prize-icon" aria-hidden>
          $
        </span>
        <span>
          <small>
            {view.status === "CANCELLED"
              ? "Stakes refunded"
              : view.status === "WAITING"
                ? "Stake locked until the match starts"
                : `Pot · 5% fee ${dollars(fee)}`}
          </small>
          <strong>{dollars(view.pot)}</strong>
          <em>Winner receives {dollars(pays)}</em>
        </span>
      </div>

      <label className="pool-power">
        <span className="sr-only">Power</span>
        <input
          type="range"
          min={1}
          max={10000}
          value={power}
          disabled
          tabIndex={-1}
          aria-valuetext={`${Math.round(power / 100)} percent`}
          style={{
            background: `linear-gradient(to top, #7c3aed ${Math.round(power / 100)}%, rgba(255,255,255,0.16) ${Math.round(power / 100)}%)`,
          }}
        />
        <span>{Math.round(power / 100)}%</span>
      </label>

      <div
        className="pool-felt"
        data-angle={angle}
        data-power={power}
        data-spin-x={spinX}
        data-spin-y={spinY}
        data-rolling={frames ? "1" : "0"}
      >
        <div className="pool-felt-frame">
          <PoolTable
            balls={balls}
            angleMilli={angle}
            power={power}
            spinX={spinX}
            spinY={spinY}
            ghost={ghost}
            kitchenOnly={!!state?.kitchenOnly}
            calledPocket={called}
            showAim={!!mine && frames == null && aimAssist}
            showCue={!!mine && frames == null}
            replay={frames}
            stroke={stroke}
            legalAt={(x, y) => (state ? legalPlacement(state, x, y) : false)}
            placing={!!mine && !!state?.ballInHand && frames == null}
            onAim={(next) => {
              setAimHint(null);
              setAngle(next);
            }}
            onPower={(next) => {
              setAimHint(null);
              setPower(next);
            }}
            onShoot={(pulled) => {
              tickSound();
              void takeShot(pulled);
            }}
            onAimHint={setAimHint}
            onSample={onSample}
            onReplayDone={onReplayDone}
            onPlace={(x, y) => {
              if (state && legalPlacement(state, x, y)) setPlace({ x, y });
            }}
          />
        </div>
      </div>

      {banner && view.status !== "COMPLETED" ? (
        <p className="pool-banner" role="status" aria-live="polite">
          {banner}
        </p>
      ) : null}

      {view.status === "COMPLETED" ? (
        <div className="pool-result" role="status">
          <p>{youWon ? `You won ${dollars(pays)}` : youLost ? "You lost" : "Match over"}</p>
          <p>
            Winner receives {dollars(pays)}. Fee {dollars(fee)}.
            {youWon ? "" : winnerName ? ` ${winnerName} won.` : ""}
          </p>
          {replayNote ? <p>{replayNote}</p> : null}
          <Link to="/8-ball-pool">Back to the lobby</Link>
          {view.server_seed ? (
            <button type="button" onClick={() => void checkReplay()}>
              Check this match
            </button>
          ) : null}
        </div>
      ) : null}

      {shootingEight ? (
        <div className="pool-pockets" role="group" aria-label="Choose a pocket for the 8-ball">
          {POCKETS.map((pocket) => (
            <button
              key={pocket.id}
              type="button"
              className={called === pocket.id ? "is-on" : ""}
              aria-pressed={called === pocket.id}
              onClick={() => setCalled(pocket.id)}
            >
              {POCKET_LABELS[pocket.id] ?? `Pocket ${pocket.id + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      <div className="pool-dock">
        <button
          type="button"
          className="pool-chip"
          aria-expanded={sheet}
          onClick={() => setSheet((open) => !open)}
        >
          Spin <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <span className={state?.ballInHand ? "pool-chip is-on" : "pool-chip"} aria-live="polite">
          {state?.ballInHand ? "Place the cue ball" : "Cue ball set"}
        </span>
        <label className="pool-assist">
          Aim assist
          <button
            type="button"
            role="switch"
            aria-checked={aimAssist}
            className={aimAssist ? "pool-switch is-on" : "pool-switch"}
            onClick={() => setAimAssist((on) => !on)}
          >
            <span />
          </button>
        </label>
      </div>

      {sheet ? (
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
            Drag on the table to aim. Drag back and release to shoot. On a phone, drag with your
            finger. Hold Shift while you drag for a finer angle. The dot is where the tip meets the
            cue ball.
          </p>
          <button type="button" onClick={() => toggleSoundMuted()}>
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
            {muted ? "Unmute" : "Mute"}
          </button>
          <p className="pool-seed">
            Fairness check {view.server_seed_hash.slice(0, 16)}…
            {seedOk === true ? " The rack matches the commitment." : ""}
            {seedOk === false ? " The rack does not match the commitment." : ""}
          </p>
          {view.server_seed ? (
            <button type="button" onClick={() => void checkReplay()}>
              Replay the shots
            </button>
          ) : null}
        </div>
      ) : null}

      {showTutorial && tutorialStep != null ? (
        <div className="pool-tutorial" role="dialog" aria-label="How to play">
          <p>
            {tutorialStep + 1} / {TUTORIAL_STEPS.length}
          </p>
          <strong>{TUTORIAL_STEPS[tutorialStep]?.title}</strong>
          <p>{TUTORIAL_STEPS[tutorialStep]?.body}</p>
          <button
            type="button"
            onClick={() => {
              if (tutorialStep >= TUTORIAL_STEPS.length - 1) closeTutorial();
              else setTutorialStep(tutorialStep + 1);
            }}
          >
            {tutorialStep >= TUTORIAL_STEPS.length - 1 ? "Got it" : "Next"}
          </button>
          <button type="button" onClick={closeTutorial}>
            Skip
          </button>
        </div>
      ) : null}

      {rulesOpen ? (
        <div className="pool-rules-pop" role="dialog" aria-label="Rules">
          <ul>
            {POOL_RULES.map((rule) => (
              <li key={rule.title}>
                <strong>{rule.title}. </strong>
                {rule.body}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setRulesOpen(false)}>
            Close
          </button>
        </div>
      ) : null}

      {confirmForfeit ? (
        <div className="pool-confirm">
          <p>Forfeit gives the match and the payout to your opponent.</p>
          <button
            type="button"
            onClick={() => {
              void poolForfeit(view.id).then(() => {
                void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
              });
            }}
          >
            Confirm forfeit
          </button>
          <button type="button" onClick={() => setConfirmForfeit(false)}>
            Keep playing
          </button>
        </div>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="pool-screen">
      <img src={room} alt="" width={1280} height={720} className="pool-room" decoding="async" />
      {children}
    </div>
  );
}

function dollars(cents: number | null | undefined): string {
  const v = Number(cents ?? 0) / 100;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PIP = ["#f4d35e", "#3a86ff", "#e63946", "#9b5de5", "#f77f00", "#2a9d8f", "#9b2226"];

function pipColor(id: number): string {
  const n = id > 8 ? id - 9 : id - 1;
  return PIP[n] ?? "#cccccc";
}

function pips(
  balls: readonly { id: number; pocketed: boolean }[],
  group: "solids" | "stripes" | null,
) {
  if (!group) return [];
  return balls
    .filter((ball) => groupOf(ball.id) === group && !ball.pocketed)
    .map((ball) => ball.id)
    .sort((a, b) => a - b);
}

function SeatCard({
  name,
  you,
  avatar,
  stake,
  ids,
  group,
  active,
  clock,
  align = "start",
}: {
  name: string;
  you: boolean;
  avatar?: string | null | undefined;
  stake: number;
  ids: number[];
  group: "solids" | "stripes" | null;
  active: boolean;
  clock: number | null;
  align?: "start" | "end";
}) {
  const initial = name.slice(0, 1).toUpperCase();
  const groupLabel = group === "solids" ? "Solids" : group === "stripes" ? "Stripes" : null;
  return (
    <div className={`pool-seat${align === "end" ? " is-end" : ""}${active ? " is-live" : ""}`}>
      {align === "end" ? null : <Face avatar={avatar} initial={initial} active={active} />}
      <span className="pool-seat-copy">
        <strong>
          {you ? `${name} (you)` : name}
          {active ? <span className="sr-only">, your turn</span> : null}
          {clock != null ? <em aria-label={`Shot clock ${clock} seconds`}>{clock}s</em> : null}
        </strong>
        <small>
          {dollars(stake)}
          {groupLabel ? ` · ${groupLabel}` : ""}
        </small>
        <span className="pool-pips" aria-hidden>
          {ids.map((id) => (
            <i
              key={id}
              className={id > 8 ? "is-stripe" : ""}
              style={{ background: pipColor(id) }}
            />
          ))}
        </span>
      </span>
      {align === "end" ? <Face avatar={avatar} initial={initial} active={active} /> : null}
    </div>
  );
}

function impactOf(prev: readonly Ball[], next: readonly Ball[]) {
  let pocket = false;
  let ball = 0;
  let rail = 0;
  for (const nb of next) {
    const ob = prev.find((item) => item.id === nb.id);
    if (!ob) continue;
    if (!ob.pocketed && nb.pocketed) pocket = true;
    const before = Math.hypot(ob.vx, ob.vy);
    const after = Math.hypot(nb.vx, nb.vy);
    const drop = before - after;
    if (drop < 700 || before < 1200) continue;
    const nearRail =
      nb.x < BALL_R + 14_000 ||
      nb.y < BALL_R + 14_000 ||
      nb.x > TABLE_W - BALL_R - 14_000 ||
      nb.y > TABLE_H - BALL_R - 14_000;
    if (nearRail) rail = Math.max(rail, drop);
    else ball = Math.max(ball, drop);
  }
  return { pocket, ball, rail };
}

function clampSpin(value: number): number {
  return Math.max(-1000, Math.min(1000, value));
}

function SpinPad({
  spinX,
  spinY,
  disabled,
  onChange,
}: {
  spinX: number;
  spinY: number;
  disabled: boolean;
  onChange: (spinX: number, spinY: number) => void;
}) {
  const pad = useRef<HTMLDivElement>(null);
  const setFrom = (clientX: number, clientY: number) => {
    const el = pad.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const max = rect.width * 0.36;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > max && dist > 0) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    onChange(clampSpin(Math.round((dx / max) * 1000)), clampSpin(Math.round((-dy / max) * 1000)));
  };
  return (
    <div
      ref={pad}
      className="pool-spin"
      role="group"
      aria-label="Spin. Drag the red dot. Up is follow, down is draw, sideways is side spin."
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setFrom(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          setFrom(event.clientX, event.clientY);
      }}
      onDoubleClick={() => onChange(0, 0)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 40 : 120;
        if (event.key === "ArrowLeft") onChange(clampSpin(spinX - step), spinY);
        else if (event.key === "ArrowRight") onChange(clampSpin(spinX + step), spinY);
        else if (event.key === "ArrowUp") onChange(spinX, clampSpin(spinY + step));
        else if (event.key === "ArrowDown") onChange(spinX, clampSpin(spinY - step));
        else if (event.key === "Home") onChange(0, 0);
        else return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <i style={{ left: `${50 + (spinX / 1000) * 36}%`, top: `${50 - (spinY / 1000) * 36}%` }} />
    </div>
  );
}

function Face({
  avatar,
  initial,
  active,
}: {
  avatar?: string | null | undefined;
  initial: string;
  active: boolean;
}) {
  return (
    <span className={active ? "pool-face is-on" : "pool-face"}>
      {avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}
    </span>
  );
}
