import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Settings } from "lucide-react";
import { toast } from "sonner";
import room from "@/assets/pool/room.webp";
import { useAuth } from "@/lib/auth";
import {
  poolCancel,
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
import { PoolTable } from "./PoolTable";

const REASONS: Record<string, string> = {
  EIGHT_BALL: "8-ball",
  EIGHT_ON_BREAK: "8 on the break",
  EIGHT_EARLY: "8-ball early",
  EIGHT_WRONG_POCKET: "8-ball in the wrong pocket",
  SCRATCH_ON_EIGHT: "scratch on the 8-ball",
  EIGHT_AND_SCRATCH_ON_BREAK: "scratch on the break 8",
  FORFEIT: "forfeit",
  TIMEOUT_FORFEIT: "three shot-clock timeouts",
};

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
  const [power, setPower] = useState(4500);
  const [spinX, setSpinX] = useState(0);
  const [spinY, setSpinY] = useState(0);
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [called, setCalled] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [aimAssist, setAimAssist] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [frames, setFrames] = useState<Ball[][] | null>(null);
  const [frame, setFrame] = useState(0);
  const [seedOk, setSeedOk] = useState<boolean | null>(null);
  const [replayNote, setReplayNote] = useState<string | null>(null);
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
  const tableHash = view?.state_hash ?? null;

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
    const beat = window.setInterval(() => {
      void poolTouch(liveId);
    }, 8_000);
    void poolTouch(liveId);
    return () => window.clearInterval(beat);
  }, [liveId, liveStatus, seat]);

  useEffect(() => {
    if (liveId == null || liveStatus !== "PLAYING" || left > 0) return;
    void poolNudge(liveId);
  }, [liveId, liveStatus, left]);

  useEffect(() => {
    const shots = shotsRef.current;
    if (!serverSeed || !shots?.length || reduce) {
      setFrames(null);
      return;
    }
    const last = shots[shots.length - 1];
    if (!last || last.kind !== "shot") {
      setFrames(null);
      return;
    }
    const prior = stepsFromRecord(shots.slice(0, -1));
    const input = stepsFromRecord([last])?.[0];
    if (!prior || !input || input.kind !== "shot") return;
    let table = freshTable(bytesFromHex(serverSeed));
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
    const sim = simulate(placed.balls, input.input, true);
    setFrames(sim.frames);
    setFrame(0);
    cueSound();
  }, [serverSeed, tableHash, reduce]);

  useEffect(() => {
    if (!view) return;
    if (view.status === "PLAYING" || view.status === "STARTING") sawLive.current = true;
    if (view.status !== "COMPLETED" || !sawLive.current || userId == null || view.winner_id == null)
      return;
    sawLive.current = false;
    resultSound(view.winner_id === userId);
  }, [view, userId]);

  useEffect(() => {
    if (!frames || frames.length === 0) return;
    let i = 0;
    let prev = frames[0];
    let lastNoise = 0;
    const shots = shotsRef.current;
    const last = shots?.[shots.length - 1];
    const fouled = last?.kind === "shot" && last.event["foul"] === true;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        window.clearInterval(id);
        if (fouled) foulSound();
        setFrames(null);
        return;
      }
      const next = frames[i];
      if (prev && next) {
        const hit = impactOf(prev, next);
        const now = performance.now();
        if (hit.pocket) pocketSound();
        else if (now - lastNoise > 48) {
          if (hit.ball > 700) {
            ballSound(Math.min(1, hit.ball / 9000));
            lastNoise = now;
          } else if (hit.rail > 700) {
            cushionSound(Math.min(1, hit.rail / 9000));
            lastNoise = now;
          }
        }
      }
      prev = next;
      setFrame(i);
    }, 16);
    return () => window.clearInterval(id);
  }, [frames]);

  const shown = frames?.[frame] ?? state?.balls ?? [];
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

  const takeShot = async () => {
    if (!state || !mine) return;
    const input: ShotInput = {
      angleMilli: angle,
      power,
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
      toast.error(poolMessage("ILLEGAL_PLACEMENT"));
      return;
    }
    if (shootingEight && called == null) {
      toast.error(poolMessage("CALL_POCKET"));
      return;
    }
    setBusy(true);
    try {
      const result = await shoot({ data: { matchId, key: crypto.randomUUID(), shot: input } });
      if (!result.ok) toast.error(poolMessage(result.error));
      else setPlace(null);
      void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch {
      toast.error(poolMessage("REQUEST_FAILED"));
    } finally {
      setBusy(false);
    }
  };

  const checkReplay = async () => {
    if (!view?.server_seed || !view.state) return;
    const steps = stepsFromRecord(view.events);
    if (!steps) {
      setReplayNote("The shot list could not be read.");
      return;
    }
    const replay = await replayMatch(bytesFromHex(view.server_seed), view.server_seed_hash, steps);
    const paid =
      view.winner_id == null
        ? replay.winner == null
        : (replay.winner === "A" && view.winner_id === view.creator_id) ||
          (replay.winner === "B" && view.winner_id === view.opponent_id);
    setReplayNote(
      replay.ok && paid
        ? `Replay matches. ${replay.winner ? `Seat ${replay.winner} wins` : "No winner yet"} by the rules.`
        : "Replay does not match the paid result.",
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
          <Link to="/pool" className="pool-leave">
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
          <input type="range" min={1} max={10000} defaultValue={5000} disabled />
          <span>50%</span>
        </label>
        <div className="pool-felt">
          <div className="pool-felt-frame">
            <PoolTable
              balls={previewBalls}
              angleMilli={0}
              power={5000}
              ghost={null}
              kitchenOnly={false}
              calledPocket={null}
              showAim
              showCue
              rolling={false}
              placing={false}
              legalAt={() => true}
              onAim={() => {}}
              onPlace={() => {}}
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
          <button type="button" className="pool-shoot" disabled>
            Shoot
          </button>
        </div>
        <p className="pool-banner">
          {query.isError ? "This match is not available." : "Loading the table…"}
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
  const notice =
    view.status === "WAITING"
      ? "Waiting for an opponent. The rack seed stays hidden until someone sits."
      : view.status === "STARTING"
        ? "Match starting."
        : view.status === "CANCELLED"
          ? `Cancelled${view.cancel_reason ? `: ${view.cancel_reason}` : ""}. Stakes were refunded with no fee.`
          : view.status === "COMPLETED" && winnerName
            ? `${youWon ? "Victory" : youLost ? "Defeat" : "Match over"}. ${winnerName} wins${view.win_reason ? ` · ${REASONS[view.win_reason] ?? view.win_reason}` : ""}. Payout ${dollars(view.payout_amount)}, fee ${dollars(view.fee_amount)}.`
            : fouled
              ? state?.kitchenOnly
                ? "Foul. Ball in hand, in the kitchen."
                : "Foul. Ball in hand."
              : state?.ballInHand
                ? state.kitchenOnly
                  ? "Ball in hand. Place the cue ball in the kitchen."
                  : "Ball in hand."
                : shootingEight
                  ? "Final 8-ball. Call a pocket, then shoot."
                  : mine
                    ? "Your turn."
                    : view.status === "PLAYING"
                      ? "Opponent's turn."
                      : null;

  const leave = () => {
    if (view.status === "WAITING" && seat === "A") {
      void poolCancel(view.id).then(() => {
        void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
        void qc.invalidateQueries({ queryKey: ["wallet"] });
      });
      return;
    }
    if (seat && view.status === "PLAYING") {
      setConfirmForfeit(true);
      return;
    }
  };

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

      <div className="pool-vs" aria-label="Players">
        <SeatCard
          name={names.A}
          avatar={view.creator?.avatar_url}
          stake={view.stake}
          ids={pips(balls, groupA)}
          active={state?.turn === "A" && view.status === "PLAYING"}
          clock={state?.turn === "A" && view.status === "PLAYING" ? clock : null}
        />
        <span className="pool-vs-mark">VS</span>
        <SeatCard
          name={names.B}
          avatar={view.opponent?.avatar_url}
          stake={view.opponent_id ? view.stake : 0}
          ids={pips(balls, groupB)}
          active={state?.turn === "B" && view.status === "PLAYING"}
          clock={state?.turn === "B" && view.status === "PLAYING" ? clock : null}
          align="end"
        />
      </div>

      <div className="pool-tools">
        {(view.status === "WAITING" && seat === "A") || (seat && view.status === "PLAYING") ? (
          <button type="button" className="pool-leave" onClick={leave}>
            Leave game
          </button>
        ) : (
          <Link to="/pool" className="pool-leave">
            Leave game
          </Link>
        )}
        <button
          type="button"
          className="pool-gear"
          aria-expanded={sheet}
          aria-label="Shot settings"
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
          <small>Prize pool</small>
          <strong>{dollars(view.pot)}</strong>
          <em>Pays {dollars(pays)}</em>
        </span>
      </div>

      <label className="pool-power">
        <span className="sr-only">Power</span>
        <input
          type="range"
          min={1}
          max={10000}
          value={power}
          disabled={!mine}
          style={{
            background: `linear-gradient(to top, #7c3aed ${Math.round(power / 100)}%, rgba(255,255,255,0.16) ${Math.round(power / 100)}%)`,
          }}
          onChange={(event) => setPower(Number(event.target.value))}
        />
        <span>{Math.round(power / 100)}%</span>
      </label>

      <div className="pool-felt">
        <div className="pool-felt-frame">
          <PoolTable
            balls={shown}
            angleMilli={angle}
            power={power}
            ghost={ghost}
            kitchenOnly={!!state?.kitchenOnly}
            calledPocket={called}
            showAim={!!mine && frames == null && aimAssist}
            showCue={!!mine && frames == null}
            rolling={frames != null}
            legalAt={(x, y) => (state ? legalPlacement(state, x, y) : false)}
            placing={!!mine && !!state?.ballInHand}
            onAim={setAngle}
            onPlace={(x, y) => {
              if (state && legalPlacement(state, x, y)) setPlace({ x, y });
            }}
          />
        </div>
      </div>

      {notice ? <p className="pool-banner">{notice}</p> : null}
      {replayNote ? <p className="pool-banner">{replayNote}</p> : null}

      {shootingEight ? (
        <div className="pool-pockets" role="group" aria-label="Called pocket">
          {POCKETS.map((pocket) => (
            <button
              key={pocket.id}
              type="button"
              className={called === pocket.id ? "is-on" : ""}
              onClick={() => setCalled(pocket.id)}
            >
              Pocket {pocket.id + 1}
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
          Standard <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={state?.ballInHand ? "pool-chip is-on" : "pool-chip"}
          aria-pressed={!!state?.ballInHand}
        >
          White ball <ChevronDown className="h-3.5 w-3.5" />
        </button>
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
        <button
          type="button"
          className="pool-shoot"
          disabled={!mine || busy}
          onClick={() => {
            tickSound();
            void takeShot();
          }}
        >
          {busy ? "Playing…" : "Shoot"}
        </button>
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
          <p className="pool-spin-read">
            Side {spinX} · Follow {spinY}
          </p>
          <p>
            Hold Shift while aiming for a finer angle. The dot is where the tip meets the cue ball.
          </p>
          <p className="pool-seed">
            Seed {view.server_seed_hash.slice(0, 16)}…
            {seedOk === true ? " Rack matches the commitment." : ""}
            {seedOk === false ? " Rack seed does not match the commitment." : ""}
          </p>
          {view.server_seed ? (
            <button type="button" onClick={() => void checkReplay()}>
              Replay the shots
            </button>
          ) : null}
        </div>
      ) : null}

      {confirmForfeit ? (
        <div className="pool-confirm">
          <p>Forfeit gives the match to your opponent.</p>
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
  avatar,
  stake,
  ids,
  active,
  clock,
  align = "start",
}: {
  name: string;
  avatar?: string | null | undefined;
  stake: number;
  ids: number[];
  active: boolean;
  clock: number | null;
  align?: "start" | "end";
}) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className={`pool-seat${align === "end" ? " is-end" : ""}${active ? " is-live" : ""}`}>
      {align === "end" ? null : <Face avatar={avatar} initial={initial} active={active} />}
      <span className="pool-seat-copy">
        <strong>
          {name}
          {clock != null ? <em>{clock}s</em> : null}
        </strong>
        <small>{dollars(stake)}</small>
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
      aria-label="Cue tip contact"
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
