import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  money,
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
import { POCKETS, simulate, type Ball, type ShotInput } from "@/lib/pool/physics";
import {
  applyForfeit,
  applyTimeout,
  freshTable,
  groupClear,
  legalPlacement,
  placeCue,
  seatGroup,
  seedHash,
} from "@/lib/pool/rules";
import { cueSound, foulSound, pocketSound } from "@/lib/pool/sfx";
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
    if (Array.isArray(last.event["pocketed"]) && last.event["pocketed"].length > 0) pocketSound();
    if (last.event["foul"] === true) foulSound();
  }, [serverSeed, tableHash, reduce]);

  useEffect(() => {
    if (!frames || frames.length === 0) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        window.clearInterval(id);
        setFrames(null);
        return;
      }
      setFrame(i);
    }, 16);
    return () => window.clearInterval(id);
  }, [frames]);

  const shown = frames?.[frame] ?? state?.balls ?? [];
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
      <p className="text-sm text-muted-foreground">
        {query.isError ? "This match is not available." : "Loading the table…"}
      </p>
    );
  }

  const winnerName =
    view.winner_id === view.creator_id
      ? names.A
      : view.winner_id === view.opponent_id
        ? names.B
        : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/pool" className="text-sm text-primary hover:underline">
          Lobby
        </Link>
        <p className="text-sm text-muted-foreground">
          {money(view.stake)} each · pot {money(view.pot)} · winner receives{" "}
          {money(Math.floor((view.pot * (10000 - view.fee_bps)) / 10000))}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <PlayerChip
          name={names.A}
          label="Breaks"
          active={state?.turn === "A" && view.status === "PLAYING"}
        />
        <PlayerChip
          name={names.B}
          label="Challenger"
          active={state?.turn === "B" && view.status === "PLAYING"}
        />
      </div>

      <div className="aspect-[2/1] w-full overflow-hidden rounded-2xl border border-border bg-[#123]">
        <PoolTable
          balls={shown}
          angleMilli={angle}
          power={power}
          ghost={ghost}
          kitchenOnly={!!state?.kitchenOnly}
          calledPocket={called}
          showAim={!!mine && frames == null}
          placing={!!mine && !!state?.ballInHand}
          onAim={setAngle}
          onPlace={(x, y) => {
            if (state && legalPlacement(state, x, y)) setPlace({ x, y });
          }}
        />
      </div>

      {view.status === "WAITING" ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p>Waiting for an opponent. The rack seed stays hidden until someone sits.</p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {view.server_seed_hash}
          </p>
          {seat === "A" ? (
            <Button
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => {
                void poolCancel(view.id).then(() => {
                  void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
                  void qc.invalidateQueries({ queryKey: ["wallet"] });
                });
              }}
            >
              Cancel and refund
            </Button>
          ) : null}
        </div>
      ) : null}

      {view.status === "CANCELLED" ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">
          Cancelled{view.cancel_reason ? `: ${view.cancel_reason}` : ""}. Stakes were refunded with
          no fee.
        </p>
      ) : null}

      {view.status === "COMPLETED" && winnerName ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">
          {winnerName} wins
          {view.win_reason ? ` · ${REASONS[view.win_reason] ?? view.win_reason}` : ""}. Payout{" "}
          {money(view.payout_amount)}, fee {money(view.fee_amount)}.
        </p>
      ) : null}

      {view.status === "PLAYING" ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span>{mine ? "Your shot" : `${names[state?.turn ?? "A"]}'s shot`}</span>
            <span className="tabular">{Math.max(0, Math.ceil(left / 1000))}s</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {state?.open
              ? "Table is open."
              : `Groups: ${names.A} ${state?.groupA ?? "—"}, ${names.B} the other.`}
            {state?.ballInHand ? " Ball in hand." : ""}
            {state?.kitchenOnly ? " Break from the kitchen." : ""}
          </p>
          {mine ? (
            <div className="mt-3 grid gap-3">
              <label className="text-xs text-muted-foreground">
                Power {Math.round(power / 100)}
                <input
                  className="mt-1 w-full"
                  type="range"
                  min={1}
                  max={10000}
                  value={power}
                  onChange={(event) => setPower(Number(event.target.value))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-muted-foreground">
                  Side
                  <input
                    className="mt-1 w-full"
                    type="range"
                    min={-1000}
                    max={1000}
                    value={spinX}
                    onChange={(event) => setSpinX(Number(event.target.value))}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Follow
                  <input
                    className="mt-1 w-full"
                    type="range"
                    min={-1000}
                    max={1000}
                    value={spinY}
                    onChange={(event) => setSpinY(Number(event.target.value))}
                  />
                </label>
              </div>
              {shootingEight ? (
                <div className="grid grid-cols-3 gap-2">
                  {POCKETS.map((pocket) => (
                    <button
                      key={pocket.id}
                      type="button"
                      className={`min-h-11 rounded-lg border text-xs ${called === pocket.id ? "border-primary text-primary" : "border-border"}`}
                      onClick={() => setCalled(pocket.id)}
                    >
                      Pocket {pocket.id + 1}
                    </button>
                  ))}
                </div>
              ) : null}
              <Button className="min-h-11" disabled={busy} onClick={() => void takeShot()}>
                {busy ? "Playing the shot…" : "Shoot"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="break-all">Seed hash {view.server_seed_hash.slice(0, 16)}…</span>
        {seedOk === true ? <span>Rack matches the committed seed.</span> : null}
        {seedOk === false ? <span>Rack seed does not match the commitment.</span> : null}
        {view.server_seed ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => void checkReplay()}
          >
            Replay the shots
          </button>
        ) : null}
        {seat && view.status === "PLAYING" ? (
          confirmForfeit ? (
            <>
              <span>Forfeit gives the match to your opponent.</span>
              <button
                type="button"
                className="text-destructive"
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
            </>
          ) : (
            <button type="button" onClick={() => setConfirmForfeit(true)}>
              Forfeit
            </button>
          )
        ) : null}
      </div>
      {replayNote ? <p className="text-sm">{replayNote}</p> : null}
    </div>
  );
}

function PlayerChip({ name, label, active }: { name: string; label: string; active: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${active ? "border-primary" : "border-border"}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-sm">{name}</p>
    </div>
  );
}
