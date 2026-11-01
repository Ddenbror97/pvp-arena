import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleHelp, Settings, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { poolMessage, poolNudge, poolTouch, usePoolState, type PoolView } from "@/lib/pool/api";
import { nudgePoolStandIn, openPool, submitPoolShot } from "@/lib/pool/pool.functions";
import {
  planStandInShot,
  STAND_IN_CUE_MS,
  STAND_IN_RELEASE_MS,
  STAND_IN_STROKE_MS,
  standInDue,
} from "@/lib/pool/stand-in";
import {
  standInCuePlaying,
  standInRackAction,
  standInRackReady,
  standInShouldAim,
  type StandInTableView,
} from "@/lib/pool/stand-in-show";
import { rollStandIn, warmStandIn } from "@/lib/pool/stand-in-roll";
import { MAX_PULL_POWER } from "@/lib/pool/aim-gesture";
import { recordAcceptedShot, recordShot } from "@/lib/pool/play";
import { simulate, type Ball, type ShotInput } from "@/lib/pool/physics";
import {
  applyPlayedShot,
  calledPocketChoice,
  freshTable,
  groupClear,
  defaultCueSpot,
  legalPlacement,
  placeCue,
  seatGroup,
  seedHash,
  stateHash,
  type TableState,
} from "@/lib/pool/rules";
import { ballSound, cueSound, cushionSound, pocketSound } from "@/lib/pool/sfx";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { WatchedAim } from "@/components/pool/PoolTable";
import {
  bytesFromHex,
  replayMatch,
  resumeReplay,
  stepsFromRecord,
  type ReplayCursor,
} from "@/lib/pool/verify";

type GhostStroke = {
  x: number;
  y: number;
  angle: number;
  power: number;
  holdMs?: number;
  ghost?: boolean;
  released?: boolean;
};

import {
  formatCents,
  leaveTake,
  matchNotice,
  POOL_RULES,
  spinSentence,
  TUTORIAL_STEPS,
} from "@/lib/pool/copy";
import { dismissPoolTutorial, poolTutorialDismissed } from "@/lib/pool/prefs";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { PoolShell as Shell, SeatCard, SpinPad } from "./PoolMatchView";
import { ballRack, ballsAhead, impactOf } from "@/lib/pool/presentation";
import { PoolTable } from "./PoolTable";

function shotKey(input: ShotInput): string {
  return [
    input.angleMilli,
    input.power,
    input.spinX,
    input.spinY,
    input.placeX ?? "",
    input.placeY ?? "",
    input.calledPocket ?? "",
  ].join(":");
}

function standInLive(
  status: string | undefined,
  standIn: PoolView["stand_in"],
  table: TableState | null,
  events: PoolView["events"] | undefined,
): StandInTableView {
  const last = events?.[events.length - 1];
  const mark = last?.event;
  return {
    status: status ?? "",
    standIn: standIn === "A" || standIn === "B" ? standIn : null,
    turn: table?.turn ?? null,
    shot: table?.shot ?? 0,
    winner: table?.winner ?? null,
    lastKind: last?.kind ?? null,
    lastStandIn: mark?.["standIn"] === true || mark?.["standIn"] === "true",
  };
}

function seatOf(view: PoolView, userId: string | null): "A" | "B" | null {
  if (!userId) return null;
  if (userId === view.creator_id) return "A";
  if (userId === view.opponent_id) return "B";
  return null;
}

function useCountdown(deadline: string | null, serverNow: string | undefined) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline || !serverNow) {
      setLeft(null);
      return;
    }
    const skew = Date.now() - Date.parse(serverNow);
    const tick = () => setLeft(Date.parse(deadline) - (Date.now() - skew));
    tick();
    const id = window.setInterval(tick, 1_000);
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
  const openRack = useServerFn(openPool);
  const playAway = useServerFn(nudgePoolStandIn);
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(1);
  const [spinX, setSpinX] = useState(0);
  const [spinY, setSpinY] = useState(0);
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [called, setCalled] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [frames, setFrames] = useState<Ball[][] | null>(null);
  const [stroke, setStroke] = useState<GhostStroke | null>(null);
  const [pulling, setPulling] = useState(false);
  const [systemShot, setSystemShot] = useState<ShotInput | null>(null);
  const [seedOk, setSeedOk] = useState<boolean | null>(null);
  const [replayNote, setReplayNote] = useState<string | null>(null);
  const [aimHint, setAimHint] = useState<string | null>(null);
  const [watch, setWatch] = useState<WatchedAim | null>(null);
  const [aimOpen, setAimOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [muted, setMuted] = useState(false);
  const turnDeadline = view?.turn_deadline ?? null;
  const opensLeft = useCountdown(
    view?.status === "STARTING" ? (view.opens_at ?? null) : null,
    view?.server_now,
  );
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
  const shotLock = useRef(false);
  const replayCursor = useRef<ReplayCursor | null>(null);
  const nudgedDeadline = useRef<string | null>(null);
  const pendingShot = useRef<number | null>(null);
  const previewKey = useRef<string | null>(null);
  const previewHash = useRef<string | null>(null);
  const previewTable = useRef<TableState | null>(null);
  const previewFrames = useRef<Ball[][] | null>(null);
  const framesRef = useRef<Ball[][] | null>(null);
  framesRef.current = frames;
  const serverReady = useRef(false);
  const heldPreview = useRef(false);
  const presenceWarned = useRef(false);
  const opening = useRef(false);
  const awayAt = useRef(0);
  const askedShot = useRef<number | null>(null);
  const lined = useRef<number | null>(null);
  const asking = useRef(false);
  const shotLive = useRef(true);
  const readyStroke = useRef<{
    key: string;
    sequence: Ball[][];
    stroke: GhostStroke;
    hash: string;
    state: TableState;
  } | null>(null);
  const pullFinished = useRef(false);
  const released = useRef(false);
  const liveRoll = useRef<{ shot: number; failed: boolean } | null>(null);
  const [rollNonce, setRollNonce] = useState(0);
  /** Pre-shot rack for the stand-in cue. The server rack replaces it only after the shot is watched. */
  const [heldRack, setHeldRack] = useState<Ball[] | null>(null);
  const [presentTick, setPresentTick] = useState(0);
  const showShot = useRef<number | null>(null);
  const showMatch = useRef<number | null>(null);
  const framesShot = useRef<number | null>(null);
  const watchedShot = useRef<number | null>(null);
  const rollGen = useRef(0);
  const pullLatched = useRef(false);
  const releaseTimer = useRef<number | null>(null);
  const shotRef = useRef(0);
  shotRef.current = state?.shot ?? 0;
  const clearRelease = () => {
    pullLatched.current = false;
    if (releaseTimer.current != null) {
      window.clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
  };
  const abortStandIn = useRef<() => void>(() => {});
  abortStandIn.current = () => {
    rollGen.current += 1;
    clearRelease();
    showShot.current = null;
    showMatch.current = null;
    framesShot.current = null;
    readyStroke.current = null;
    pullFinished.current = false;
    released.current = false;
    shotLive.current = false;
    liveRoll.current = null;
    lined.current = null;
    previewKey.current = null;
    previewHash.current = null;
    previewTable.current = null;
    previewFrames.current = null;
    serverReady.current = false;
    heldPreview.current = false;
    setHeldRack(null);
    setSystemShot(null);
    setFrames(null);
    setStroke(null);
    setPulling(false);
    setPresentTick((n) => n + 1);
  };
  const finishStandIn = useRef<() => boolean>(() => false);
  finishStandIn.current = () => {
    const shown = showShot.current;
    if (shown == null || !standInRackReady(shown, shotRef.current)) return false;
    watchedShot.current = shown;
    clearRelease();
    showShot.current = null;
    framesShot.current = null;
    if (lined.current === shown) lined.current = null;
    if (liveRoll.current?.shot === shown) liveRoll.current = null;
    readyStroke.current = null;
    previewKey.current = null;
    previewHash.current = null;
    previewTable.current = null;
    previewFrames.current = null;
    serverReady.current = false;
    heldPreview.current = false;
    setHeldRack(null);
    setSystemShot(null);
    setPulling(false);
    setPresentTick((n) => n + 1);
    return true;
  };
  const tableHash = view?.state_hash ?? null;
  const physicsId = view?.state?.physics ?? null;
  const noiseAt = useRef(0);
  const onSample = useCallback(
    (prev: readonly Ball[], next: readonly Ball[]) => {
      const hit = impactOf(prev, next, physicsId);
      const now = performance.now();
      if (hit.pocket) {
        pocketSound();
        return;
      }
      if (now - noiseAt.current <= 32) return;
      if (hit.ball > 700) {
        ballSound(Math.min(1, hit.ball / 9000));
        noiseAt.current = now;
      } else if (hit.rail > 700) {
        cushionSound(Math.min(1, hit.rail / 9000));
        noiseAt.current = now;
      }
    },
    [physicsId],
  );
  const onReplayDone = useCallback((finished?: readonly Ball[][] | null) => {
    if (finished && finished !== framesRef.current) return;
    const thisPreview = previewFrames.current != null && finished === previewFrames.current;
    // The stand-in rack stays on the last frame until the server shot is in.
    if (
      showShot.current != null &&
      framesShot.current === showShot.current &&
      !standInRackReady(showShot.current, shotRef.current)
    ) {
      heldPreview.current = true;
      return;
    }
    const showed = finishStandIn.current();
    if (!showed && previewKey.current && !serverReady.current && thisPreview) {
      heldPreview.current = true;
      return;
    }
    if (thisPreview || showed) {
      previewKey.current = null;
      previewHash.current = null;
      previewTable.current = null;
      previewFrames.current = null;
      serverReady.current = false;
    }
    heldPreview.current = false;
    setFrames(null);
    setStroke(null);
  }, []);

  useEffect(() => {
    warmStandIn();
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
      return defaultCueSpot(state);
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
  }, [liveId, liveStatus, seat]);

  useEffect(() => {
    if (liveId == null || liveStatus !== "PLAYING" || !turnDeadline) return;
    if (nudgedDeadline.current === turnDeadline) return;
    const serverNow = view?.server_now;
    const skew = serverNow ? Date.now() - Date.parse(serverNow) : 0;
    const delay = Math.max(0, Date.parse(turnDeadline) - (Date.now() - skew));
    const id = window.setTimeout(() => {
      nudgedDeadline.current = turnDeadline;
      void poolNudge(liveId);
    }, delay);
    return () => window.clearTimeout(id);
  }, [liveId, liveStatus, turnDeadline]);

  useEffect(() => {
    if (liveId == null || liveStatus !== "STARTING" || opensLeft == null || opensLeft > 1_200)
      return;
    if (opening.current) return;
    opening.current = true;
    void openRack({ data: { matchId: liveId } }).finally(() => {
      window.setTimeout(() => {
        opening.current = false;
      }, 2_000);
    });
  }, [liveId, liveStatus, opensLeft, openRack]);

  useEffect(() => {
    const away = view?.stand_in;
    const live =
      !!view &&
      view.status === "PLAYING" &&
      (away === "A" || away === "B") &&
      view.state?.turn === away &&
      !view.state?.winner &&
      !!view.turn_deadline &&
      !!view.server_now;
    const armRelease = () => {
      if (releaseTimer.current != null) return;
      releaseTimer.current = window.setTimeout(() => {
        releaseTimer.current = null;
        pullFinished.current = true;
        const shotShown = showShot.current;
        if (shotShown == null || framesRef.current || released.current) return;
        const ready = readyStroke.current;
        if (ready && !released.current && shotLive.current) {
          released.current = true;
          previewFrames.current = ready.sequence;
          framesShot.current = shotShown;
          setFrames(ready.sequence);
          setStroke(ready.stroke);
          cueSound(ready.stroke.power);
          return;
        }
        // The cue never got a sequence. The published server shot still has to play.
        if (standInRackReady(shotShown, shotRef.current)) {
          liveRoll.current = { shot: shotShown, failed: true };
          setRollNonce((n) => n + 1);
        }
      }, STAND_IN_CUE_MS + 400);
    };
    const holdCue = () => {
      if (showShot.current == null) {
        pullLatched.current = false;
        return;
      }
      if (!pullLatched.current && standInRackReady(showShot.current, shotRef.current)) {
        pullLatched.current = true;
        armRelease();
      }
    };
    if (!live || !view.turn_deadline || !view.server_now) {
      holdCue();
      setPulling(standInCuePlaying(showShot.current, false, pullLatched.current));
      return;
    }
    const deadline = view.turn_deadline;
    const skew = Date.now() - Date.parse(view.server_now);
    const seconds = view.shot_seconds ?? 30;
    const matchId = view.id;
    const shotN = view.state?.shot ?? -1;
    const undo = () => {
      if (serverReady.current) return;
      // The shot is already on the server. Dropping the picture would skip the balls.
      if (showShot.current != null && standInRackReady(showShot.current, shotRef.current)) return;
      abortStandIn.current();
    };
    const tick = () => {
      const due = standInDue(deadline, Date.now() - skew, seconds);
      if (showShot.current == null) pullLatched.current = false;
      else if (due && !pullLatched.current) {
        pullLatched.current = true;
        armRelease();
      }
      const playing = standInCuePlaying(showShot.current, due, pullLatched.current);
      setPulling((on) => (on === playing ? on : playing));
      if (!due || askedShot.current === shotN || asking.current) return;
      if (Date.now() - awayAt.current < 1_500) return;
      awayAt.current = Date.now();
      asking.current = true;
      shotLive.current = true;
      void playAway({ data: { matchId } })
        .then((result) => {
          if (result.ok) {
            if (result.played) askedShot.current = shotN;
            return;
          }
          if (result.error === "SHOT_IN_PROGRESS") return;
          if (result.error === "STAND_IN_CLEARED" || result.error === "NOT_YOUR_TURN") {
            undo();
            return;
          }
          undo();
        })
        .catch(() => {
          undo();
        })
        .finally(() => {
          asking.current = false;
        });
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [
    view?.id,
    view?.status,
    view?.stand_in,
    view?.state?.turn,
    view?.state?.shot,
    view?.state?.winner,
    view?.turn_deadline,
    view?.server_now,
    view?.shot_seconds,
    playAway,
  ]);

  useEffect(() => {
    const shots = shotsRef.current;
    if (!serverSeed || !shots?.length || reduce || !physicsId) {
      if (previewKey.current || showShot.current != null) return;
      setFrames(null);
      setStroke(null);
      return;
    }
    const last = shots[shots.length - 1];
    if (!last || last.kind !== "shot") {
      if (previewKey.current && last?.kind !== "timeout" && last?.kind !== "forfeit") return;
      if ((last?.kind === "timeout" || last?.kind === "forfeit") && showShot.current != null) {
        abortStandIn.current();
        return;
      }
      previewKey.current = null;
      previewHash.current = null;
      previewTable.current = null;
      previewFrames.current = null;
      setFrames(null);
      setStroke(null);
      return;
    }
    const prior = stepsFromRecord(shots.slice(0, -1));
    const input = stepsFromRecord([last])?.[0];
    if (!prior || !input || input.kind !== "shot") return;
    const mark = last.event;
    const tableShot = mark?.["standIn"] === true || mark?.["standIn"] === "true";
    const owned =
      tableShot &&
      liveRoll.current != null &&
      !liveRoll.current.failed &&
      state != null &&
      state.shot === liveRoll.current.shot + 1;
    const storedKey = shotKey(input.input);
    // The cue already finished. The server rack can take over even if the
    // stored power differs from the aim that was on screen.
    if (
      heldPreview.current &&
      showShot.current != null &&
      state != null &&
      standInRackReady(showShot.current, state.shot)
    ) {
      finishStandIn.current();
      setFrames(null);
      setStroke(null);
      return;
    }
    // The worker already owns this stand-in. Replaying it here hitches the cue
    // and skips the ball that cue is aimed at.
    if (owned && previewKey.current !== storedKey) return;
    if (
      (previewKey.current === storedKey && input.hash === previewHash.current) ||
      (tableShot && framesRef.current && previewKey.current === storedKey)
    ) {
      serverReady.current = true;
      const linked = previewTable.current;
      if (linked) {
        replayCursor.current = {
          seedKey: `${liveId ?? 0}:${serverSeed}:${physicsId}`,
          physics: physicsId,
          steps: prior.length + 1,
          lastHash: input.hash,
          state: linked,
        };
      }
      if (heldPreview.current && (showShot.current == null || finishStandIn.current())) {
        previewKey.current = null;
        previewHash.current = null;
        previewTable.current = null;
        previewFrames.current = null;
        serverReady.current = false;
        heldPreview.current = false;
        setFrames(null);
        setStroke(null);
      }
      return;
    }
    // Balls are already leaving on the local roll. A second sequence restarts them.
    if (tableShot && framesRef.current) return;
    // The local cue owns this shot. A server replay would skip the ball it is on.
    if (tableShot && showShot.current != null && !liveRoll.current?.failed) return;
    if (
      tableShot &&
      watchedShot.current != null &&
      state != null &&
      state.shot === watchedShot.current + 1
    ) {
      return;
    }
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (cancel || (tableShot && framesRef.current)) return;
      previewKey.current = null;
      previewHash.current = null;
      previewTable.current = null;
      previewFrames.current = null;
      serverReady.current = false;
      heldPreview.current = false;
      try {
        const seedBytes = bytesFromHex(serverSeed);
        const seedKey = `${liveId ?? 0}:${serverSeed}:${physicsId}`;
        let rolled = resumeReplay(seedBytes, seedKey, prior, physicsId, replayCursor.current);
        if (!rolled.ok) rolled = resumeReplay(seedBytes, seedKey, prior, physicsId, null);
        if (cancel) return;
        if (!rolled.ok) {
          replayCursor.current = null;
          abortStandIn.current();
          return;
        }
        const carried = resumeReplay(
          seedBytes,
          seedKey,
          [...prior, input],
          physicsId,
          rolled.cursor,
        );
        replayCursor.current = carried.ok ? carried.cursor : rolled.cursor;
        const played = recordAcceptedShot(rolled.state, input.input, input.hash, physicsId);
        if (cancel || (tableShot && framesRef.current)) return;
        if (!carried.ok || !played) {
          // The authoritative rack is already in `state`. Discard an invalid
          // local picture instead of leaving input blocked by a held replay.
          abortStandIn.current();
          return;
        }
        const seenPull = tableShot && pullFinished.current;
        previewKey.current = storedKey;
        previewHash.current = played.hash;
        previewTable.current = played.state;
        previewFrames.current = played.sequence;
        // This replay came FROM the committed server event. Waiting for a
        // second acknowledgement leaves the opponent's finished replay held
        // forever when subsequent polls return the same state hash.
        serverReady.current = true;
        if (tableShot) {
          released.current = true;
          framesShot.current = showShot.current;
        }
        setFrames(played.sequence);
        setStroke(
          played.cue
            ? {
                x: played.cue.x,
                y: played.cue.y,
                angle: input.input.angleMilli,
                power: input.input.power,
                ...(tableShot
                  ? {
                      holdMs: seenPull ? STAND_IN_RELEASE_MS : STAND_IN_STROKE_MS,
                      ghost: true,
                      released: seenPull,
                    }
                  : {}),
              }
            : null,
        );
        cueSound(input.input.power);
      } catch (error) {
        console.error(error);
        if (!cancel) abortStandIn.current();
      }
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
    // `state` is the rack for this hash. Depending on the object resimulates on
    // every poll and freezes the cue in the middle of its draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSeed, tableHash, reduce, physicsId, liveId, rollNonce, state?.shot]);

  useEffect(() => {
    if (!shotLock.current || pendingShot.current == null) return;
    const shot = state?.shot ?? 0;
    const turnGone = state != null && seat != null && state.turn !== seat;
    const finished = liveStatus !== "PLAYING" && liveStatus !== "STARTING";
    if (shot >= pendingShot.current || turnGone || finished) {
      shotLock.current = false;
      pendingShot.current = null;
    }
  }, [state?.shot, state?.turn, seat, liveStatus]);

  const previewBalls = useMemo(
    () => freshTable(Uint8Array.from({ length: 32 }, (_, i) => (i * 17 + 3) & 255)).balls,
    [],
  );
  const group = state && seat ? seatGroup(state, seat) : null;
  const turnGroup = state ? seatGroup(state, state.turn) : null;
  const eightForShooter =
    !!state &&
    state.winner == null &&
    !!turnGroup &&
    groupClear(state.balls, turnGroup) &&
    !state.breakShot;
  const shootingEight = eightForShooter && mine;
  const eightShot = shootingEight ? (state?.shot ?? -1) : -1;
  useEffect(() => {
    setCalled(null);
  }, [eightShot]);
  const ghost = mine && state?.ballInHand ? place : null;
  useEffect(() => {
    const live = standInLive(liveStatus, view?.stand_in, state, shotsRef.current);
    if (showShot.current != null && showMatch.current !== liveId) {
      abortStandIn.current();
      return;
    }
    const action = standInRackAction(showShot.current, live);
    // The server shot lands while the cue is still drawing. Keep this rack and
    // this roll; cancelling here is what made the aimed ball vanish.
    if (action === "keep") return;
    if (action === "abort") {
      abortStandIn.current();
      return;
    }
    if (!serverSeed || !state || reduce || !physicsId || state.winner || !standInShouldAim(live)) {
      if (showShot.current == null) setSystemShot(null);
      return;
    }
    const bytes = bytesFromHex(serverSeed);
    if (bytes.length !== 32) {
      setSystemShot(null);
      return;
    }
    const table = state;
    const id = physicsId;
    const shotN = table.shot;
    showShot.current = shotN;
    showMatch.current = liveId ?? null;
    setHeldRack(table.balls.map((ball) => ({ ...ball })));
    lined.current = shotN;
    pullFinished.current = false;
    released.current = false;
    shotLive.current = true;
    readyStroke.current = null;
    heldPreview.current = false;
    serverReady.current = false;
    // The aim is geometry. The roll happens off this thread, so the draw can start now.
    setSystemShot(planStandInShot(table, bytes));
    liveRoll.current = { shot: shotN, failed: false };
    const myGen = rollGen.current;
    void rollStandIn(table, bytes, id)
      .then((played) => {
        if (rollGen.current !== myGen || lined.current !== shotN) return;
        if (!played) {
          liveRoll.current = { shot: shotN, failed: true };
          setRollNonce((n) => n + 1);
          return;
        }
        const key = shotKey(played.shot);
        if (previewKey.current === key && readyStroke.current?.hash === played.hash) return;
        const stroke = {
          x: played.cue.x,
          y: played.cue.y,
          angle: played.shot.angleMilli,
          power: played.shot.power,
          holdMs: STAND_IN_RELEASE_MS,
          ghost: true,
          released: true,
        };
        readyStroke.current = {
          key,
          sequence: played.sequence,
          hash: played.hash,
          state: played.state,
          stroke,
        };
        previewKey.current = key;
        previewHash.current = played.hash;
        previewTable.current = played.state;
        previewFrames.current = null;
        setSystemShot(played.shot);
        if (!pullFinished.current || released.current || !shotLive.current) return;
        released.current = true;
        previewFrames.current = played.sequence;
        framesShot.current = shotN;
        setFrames(played.sequence);
        setStroke(stroke);
        cueSound(played.shot.power);
      })
      .catch(() => {
        if (rollGen.current !== myGen || lined.current !== shotN) return;
        liveRoll.current = { shot: shotN, failed: true };
        setRollNonce((n) => n + 1);
      });
    return () => {
      // A server tick keeps showShot on this number. Only a real abort drops the roll.
      if (showShot.current !== shotN) rollGen.current += 1;
    };
    // `state` is read on the render whose hash or shot changed. Depending on the
    // object would resimulate on every one-second poll and hitch the cue pull.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    serverSeed,
    view?.state_hash,
    view?.stand_in,
    state?.shot,
    state?.turn,
    state?.winner,
    liveStatus,
    physicsId,
    reduce,
    presentTick,
    liveId,
  ]);
  const onCuePulled = useCallback(() => {
    pullFinished.current = true;
    const ready = readyStroke.current;
    if (!ready || released.current || !shotLive.current) return;
    released.current = true;
    previewFrames.current = ready.sequence;
    framesShot.current = showShot.current;
    setFrames(ready.sequence);
    setStroke(ready.stroke);
    cueSound(ready.stroke.power);
  }, []);
  const aimBus = useRef<RealtimeChannel | null>(null);
  const aimSeat = useRef(seat);
  aimSeat.current = seat;

  useEffect(() => {
    if (liveId == null || liveStatus !== "PLAYING") {
      setWatch(null);
      return;
    }
    const channel = supabase.channel(`pool-aim-${liveId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    channel.on("broadcast", { event: "aim" }, (msg) => {
      const payload = (msg as { payload?: Record<string, unknown> }).payload ?? {};
      const from = payload["seat"];
      const angleMilli = payload["angle"];
      const pulled = payload["power"];
      if (typeof from !== "string" || from === aimSeat.current) return;
      if (typeof angleMilli !== "number" || typeof pulled !== "number") return;
      const x = payload["x"];
      const y = payload["y"];
      setWatch({
        angle: angleMilli,
        power: pulled,
        ...(typeof x === "number" && typeof y === "number" ? { x, y } : {}),
      });
    });
    channel.subscribe((status) => {
      setAimOpen(status === "SUBSCRIBED");
    });
    aimBus.current = channel;
    return () => {
      aimBus.current = null;
      setAimOpen(false);
      setWatch(null);
      void supabase.removeChannel(channel);
    };
  }, [liveId, liveStatus]);

  useEffect(() => {
    if (mine) setWatch(null);
  }, [mine]);

  useEffect(() => {
    if (!mine || !aimOpen || liveStatus !== "PLAYING" || seat == null) return;
    const channel = aimBus.current;
    if (!channel) return;
    const handle = window.setTimeout(() => {
      void channel.send({
        type: "broadcast",
        event: "aim",
        payload: {
          seat,
          angle,
          power,
          ...(ghost ? { x: ghost.x, y: ghost.y } : {}),
        },
      });
    }, 50);
    return () => window.clearTimeout(handle);
  }, [mine, aimOpen, liveStatus, seat, angle, power, ghost]);

  const names = useMemo(() => {
    if (!view) return { A: "Player A", B: "Player B" };
    return {
      A: view.creator?.username ?? "Player A",
      B: view.opponent?.username ?? "Waiting",
    };
  }, [view]);

  const takeShot = useCallback(
    async (pulled?: number, angleMilli = angle) => {
      const shotPower = pulled ?? power;
      if (shotLock.current || !state || !mine || frames) return;
      shotLock.current = true;
      pendingShot.current = state.shot + 1;
      const input: ShotInput = {
        angleMilli,
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
        shotLock.current = false;
        pendingShot.current = null;
        toast.error(poolMessage("ILLEGAL_PLACEMENT"));
        return;
      }
      if (shootingEight && called == null) {
        shotLock.current = false;
        pendingShot.current = null;
        toast.error(poolMessage("CALL_POCKET"));
        return;
      }
      if (!reduce && physicsId) {
        const placed = structuredClone(state);
        if (!placeCue(placed, input)) {
          const opening = placed.balls.map((ball) => ({ ...ball }));
          const cue = opening.find((ball) => ball.id === 0);
          const sim = simulate(placed.balls, input, true, physicsId);
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
          const applied = applyPlayedShot(placed, sim, input.calledPocket);
          previewKey.current = shotKey(input);
          previewHash.current = stateHash(applied.state);
          previewTable.current = applied.state;
          previewFrames.current = sequence;
          serverReady.current = false;
          heldPreview.current = false;
          setFrames(sequence);
          setStroke(
            cue ? { x: cue.x, y: cue.y, angle: input.angleMilli, power: input.power } : null,
          );
          cueSound(input.power);
        }
      }
      setBusy(true);
      try {
        const result = await shoot({ data: { matchId, key: crypto.randomUUID(), shot: input } });
        if (!result.ok) {
          previewKey.current = null;
          previewHash.current = null;
          previewTable.current = null;
          previewFrames.current = null;
          serverReady.current = false;
          heldPreview.current = false;
          shotLock.current = false;
          pendingShot.current = null;
          setFrames(null);
          setStroke(null);
          toast.error(poolMessage(result.error));
        } else {
          setPlace(null);
          setPower(1);
        }
        void qc.invalidateQueries({ queryKey: ["pool-match", matchId] });
        void qc.invalidateQueries({ queryKey: ["wallet"] });
      } catch {
        previewKey.current = null;
        previewHash.current = null;
        previewTable.current = null;
        previewFrames.current = null;
        serverReady.current = false;
        heldPreview.current = false;
        shotLock.current = false;
        pendingShot.current = null;
        setFrames(null);
        setStroke(null);
        toast.error(poolMessage("REQUEST_FAILED"));
      } finally {
        setBusy(false);
      }
    },
    [
      angle,
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
      physicsId,
      reduce,
      spinY,
      state,
    ],
  );

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
        setPower((current) => Math.min(MAX_PULL_POWER, current + 500));
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
        <div className="pool-vs" aria-hidden>
          <span className="pool-seat">
            <span className="pool-face">
              <span>A</span>
            </span>
            <span className="pool-seat-copy">
              <strong>Player</strong>
              <small>$0.00</small>
              <span className="pool-down">Open</span>
              <span className="pool-pips">
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} className="is-up" />
                ))}
              </span>
            </span>
          </span>
          <span className="pool-vs-mark">VS</span>
          <span className="pool-seat is-end">
            <span className="pool-seat-copy">
              <strong>Waiting</strong>
              <small>$0.00</small>
              <span className="pool-down">Waiting</span>
              <span className="pool-pips">
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} className="is-up" />
                ))}
              </span>
            </span>
            <span className="pool-face">
              <span>B</span>
            </span>
          </span>
        </div>
        <div className="pool-tools">
          <Link to="/8-ball-pool" className="pool-leave">
            Back to lobby
          </Link>
          <span className="pool-gear" aria-hidden>
            <Settings className="h-4 w-4" />
          </span>
        </div>
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
  const systemWatch: WatchedAim | null =
    systemShot && frames == null
      ? {
          angle: systemShot.angleMilli,
          power: pulling ? systemShot.power : 1,
          playing: pulling,
          ...(systemShot.placeX != null && systemShot.placeY != null
            ? { x: systemShot.placeX, y: systemShot.placeY }
            : {}),
        }
      : null;
  const tableGhost =
    systemWatch && systemWatch.x != null && systemWatch.y != null
      ? { x: systemWatch.x, y: systemWatch.y }
      : ghost;
  // The committed rack arrives while the cue is still on the ball. Hold the aim's rack.
  const balls = heldRack ?? state?.balls ?? [];
  const groupA = state ? seatGroup(state, "A") : null;
  const groupB = state ? seatGroup(state, "B") : null;
  const lastEvent = view.events[view.events.length - 1];
  const fouled =
    lastEvent?.kind === "shot" && lastEvent.event["foul"] === true && !!state?.ballInHand;
  const foulReason =
    fouled && lastEvent?.kind === "shot" && typeof lastEvent.event["foulReason"] === "string"
      ? lastEvent.event["foulReason"]
      : null;
  const rackWinner = state?.winner ?? null;
  const youWon =
    userId != null &&
    (view.status === "COMPLETED" ? view.winner_id === userId : rackWinner === seat);
  const youLost =
    userId != null &&
    (view.status === "COMPLETED"
      ? view.winner_id != null && view.winner_id !== userId
      : rackWinner != null && rackWinner !== seat);
  const pays = view.payout_amount ?? view.pot - Math.floor((view.pot * view.fee_bps) / 10_000);
  const fee = view.fee_amount ?? view.pot - pays;
  const notice = matchNotice({
    status: view.status,
    youWon,
    youLost,
    payout: formatCents(youWon ? pays : (view.payout_amount ?? pays)),
    winReason: view.win_reason ?? state?.reason ?? null,
    cancelReason: view.cancel_reason,
    youLeft: userId != null && view.left_by === userId,
    stakeCents: view.stake,
    fouled,
    ballInHand: !!state?.ballInHand,
    kitchenOnly: !!state?.kitchenOnly,
    shootingEight: eightForShooter,
    pocketChosen: called != null,
    foulReason,
    decided: rackWinner != null && view.status !== "COMPLETED",
    mine,
    group,
    breakShot: !!state?.breakShot,
    busy,
    rolling: frames != null,
    offline,
    reconnecting: query.isError && view.status !== "COMPLETED" && view.status !== "CANCELLED",
    seat,
    opensIn: view.status === "STARTING" ? opensLeft : null,
    standIn:
      view.stand_in && view.status === "PLAYING"
        ? view.stand_in === seat
          ? "mine"
          : "theirs"
        : null,
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
    !rulesOpen;
  const closeTutorial = () => {
    dismissPoolTutorial();
    setTutorialStep(null);
  };

  const closed = view.status === "CANCELLED" && view.cancel_reason === "PLAYER_LEFT";
  const youLeft = userId != null && view.left_by === userId;
  const split = leaveTake(view.stake);
  const otherName = seat === "B" ? names.A : names.B;
  const charging = !!mine && frames == null && !systemWatch && power > 1;
  const powerPct = Math.max(0, Math.min(100, Math.round((power / MAX_PULL_POWER) * 100)));

  return (
    <Shell>
      <div className="pool-vs" aria-label="Players">
        <SeatCard
          name={names.A}
          avatar={view.creator?.avatar_url}
          stake={view.stake}
          rack={ballRack(balls, groupA)}
          group={groupA}
          ahead={ballsAhead(balls, groupA, groupB)}
          present
          away={view.stand_in === "A" && view.status === "PLAYING"}
          active={state?.turn === "A" && view.status === "PLAYING"}
          hand={!!state?.ballInHand && state?.turn === "A" && view.status === "PLAYING"}
          deadline={state?.turn === "A" && view.status === "PLAYING" ? turnDeadline : null}
          serverNow={view.server_now}
        />
        <span className="pool-vs-mark">VS</span>
        <SeatCard
          name={names.B}
          avatar={view.opponent?.avatar_url}
          stake={view.opponent_id ? view.stake : 0}
          rack={ballRack(balls, groupB)}
          group={groupB}
          ahead={ballsAhead(balls, groupB, groupA)}
          present={view.opponent_id != null}
          away={view.stand_in === "B" && view.status === "PLAYING"}
          active={state?.turn === "B" && view.status === "PLAYING"}
          hand={!!state?.ballInHand && state?.turn === "B" && view.status === "PLAYING"}
          deadline={state?.turn === "B" && view.status === "PLAYING" ? turnDeadline : null}
          serverNow={view.server_now}
          align="end"
        />
      </div>

      <div className="pool-tools">
        {view.status === "PLAYING" ? null : (
          <Link to="/8-ball-pool" className="pool-leave">
            Back to lobby
          </Link>
        )}
        <button
          type="button"
          className="pool-gear"
          aria-expanded={sheet}
          aria-label="Shot settings and fairness"
          onClick={() => setSheet((open) => !open)}
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="pool-gear"
          aria-expanded={rulesOpen}
          aria-label="Rules"
          onClick={() => setRulesOpen((open) => !open)}
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </div>

      <div className="pool-felt">
        <div className="pool-felt-frame">
          <PoolTable
            balls={balls}
            angleMilli={angle}
            power={power}
            spinX={spinX}
            spinY={spinY}
            physicsId={state?.physics}
            ghost={tableGhost}
            kitchenOnly={!!state?.kitchenOnly}
            calledPocket={systemWatch ? (systemShot?.calledPocket ?? null) : called}
            calling={shootingEight && frames == null}
            onCallPocket={(id) => setCalled((current) => calledPocketChoice(current, id))}
            showCue={!!mine && frames == null && !systemWatch}
            watch={systemWatch ?? (!mine && frames == null ? watch : null)}
            replay={frames}
            stroke={stroke}
            legalAt={(x, y) => (state ? legalPlacement(state, x, y) : false)}
            placing={!!mine && !!state?.ballInHand && frames == null && !systemWatch}
            onAim={(next) => {
              setAimHint(null);
              setAngle(next);
            }}
            onPower={(next) => {
              setAimHint(null);
              setPower(next);
            }}
            onShoot={(pulled, shotAngle) => {
              void takeShot(pulled, shotAngle);
            }}
            onAimHint={setAimHint}
            onSample={onSample}
            onReplayDone={onReplayDone}
            onCuePulled={onCuePulled}
            onPlace={(x, y) => {
              if (state && legalPlacement(state, x, y)) setPlace({ x, y });
            }}
          />
        </div>
      </div>

      {charging ? (
        <div
          className="pool-energy"
          role="meter"
          aria-label="Shot power"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={powerPct}
        >
          <div className="pool-energy-track">
            <div className="pool-energy-fill" style={{ height: `${powerPct}%` }} />
          </div>
          <span>{powerPct}</span>
        </div>
      ) : null}

      {banner && view.status !== "COMPLETED" && !closed ? (
        <p className="pool-banner" role="status" aria-live="polite">
          {banner}
        </p>
      ) : null}

      {view.status === "COMPLETED" ? (
        <div className="pool-result" role="status">
          <div className="pool-result-card">
            <strong>{youWon ? "You won" : youLost ? "You lost" : "Match over"}</strong>
            {youWon ? <p className="pool-result-pay">{formatCents(pays)}</p> : null}
            <p>
              Winner receives {formatCents(pays)}. Fee {formatCents(fee)}.
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
        </div>
      ) : null}

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

      {closed ? (
        <div className="pool-closed" role="status">
          <div className="pool-closed-card">
            <strong>
              {youLeft
                ? "You left this table"
                : seat
                  ? `${otherName} left`
                  : "This table is closed"}
            </strong>
            <p>
              {youLeft
                ? `${formatCents(split.fee)} stayed with the site. ${formatCents(split.back)} is back in your balance.`
                : seat
                  ? `Your ${formatCents(view.stake)} is back. This table is closed.`
                  : "A player left, and the table is closed."}
            </p>
            <Link to="/8-ball-pool">Back to the lobby</Link>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
