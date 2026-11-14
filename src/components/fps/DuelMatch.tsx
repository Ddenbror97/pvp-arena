import { openMatchSocket, type MatchSocketLink } from "@/lib/fps/match-socket";
import { NetworkObservations, readNetworkReport, type NetworkReport } from "@/lib/fps/network";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Volume2, VolumeX, Maximize, Copy, Crosshair, Skull } from "lucide-react";
import { createCombatAudio, type CombatAudio } from "@/lib/fps/audio";
import { SIDE_RIFLE } from "@/lib/fps/combat";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { useAuth } from "@/lib/auth";
import { duelAdmission, duelAction } from "@/lib/fps/duel.functions";
import { fetchDuelView, duelError } from "@/lib/fps/api";
import { duelMoney, duelQuote, type DuelView } from "@/lib/fps/quote";
import { supabase } from "@/integrations/supabase/client";
import type { Input, Seat } from "@/lib/fps/protocol";
import type { ArenaControls, ArenaFrame } from "@/lib/fps/renderer";
import { loadArenaRenderer } from "@/lib/fps/renderer-loader";
import { DEFAULT_MAP_ID, getMap, isMapId } from "@/lib/fps/maps/registry";
import { loadingImageFor } from "@/lib/fps/maps/loading-screens";
import { matchLoadProgress, type ArenaLoadProgress } from "@/lib/fps/loading";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
import {
  reserveArenaPointer,
  releaseArenaPointer,
  claimArenaPointer,
} from "@/lib/fps/entry-capture";
import { RoundBreak, type DuelProfile } from "./RoundBreak";
import { MatchResult } from "./MatchResult";
import { walletQuery } from "@/lib/jackpot/api";
import { DeathFeedback } from "./DeathFeedback";
import { isDefeatedView } from "@/lib/fps/death-presentation";
import { characterSide, isHalftime, sideName } from "@/lib/fps/sides";
import { useMatchLeaveGuard } from "@/lib/fps/match-guard";
import "./duel.css";
import "./sniper-scope.css";
import { GameSettings, StrikeCrosshair } from "./GameSettings";
import { GrenadeHud } from "./GrenadeHud";
import { FeedWeaponIcon, HeldWeapon } from "./WeaponIcon";
import { duelKills, heldWeapon, type DuelKill } from "@/lib/fps/kill-feed";
import { GRENADE_NAMES } from "@/lib/fps/grenades/rules";
import { FpsReadyAction } from "./FpsQueueNotice";
import { BuyMenu } from "./BuyMenu";
import { buyBlocked, type BuyItem } from "@/lib/fps/buy";
import { DEAGLE } from "@/lib/fps/sidearm";
import { duelBuyWindow, primaryStats } from "@/lib/fps/simulation";
import { primaryOf, type Primary } from "@/lib/fps/primary";
import {
  DEFAULT_STRIKE_SETTINGS,
  readStrikeSettings,
  saveStrikeSettings,
} from "@/lib/fps/settings";

type Preview = DuelView & { username: string };
type Rpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function DuelMatch({
  matchId,
  invite,
  spectate = false,
}: {
  matchId: string;
  invite?: string;
  spectate?: boolean;
}) {
  const { userId } = useAuth(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const admission = useServerFn(duelAdmission),
    action = useServerFn(duelAction);
  const view = useQuery({
    queryKey: ["fps-view", matchId, userId],
    queryFn: () => fetchDuelView(matchId),
    enabled: !!userId && !invite,
    // Once paired, the authenticated room socket owns live state and settlement.
    refetchInterval: (query) => (query.state.data?.opponent_id ? false : 1000),
    staleTime: 750,
    retry: 1,
  });
  const preview = useQuery({
    queryKey: ["fps-invite", matchId, invite],
    enabled: !!userId && !!invite,
    queryFn: async () => {
      const r = await (supabase as unknown as Rpc).rpc("fps_invite_preview", {
        p_match: matchId,
        p_invite: invite,
      });
      if (r.error) throw new Error(r.error.message);
      return r.data as Preview;
    },
    retry: false,
  });
  const host = useRef<HTMLDivElement>(null),
    arena = useRef<ArenaControls | null>(null),
    socket = useRef<WebSocket | null>(null),
    seatRef = useRef<Seat | null>(null);
  const [frame, setFrame] = useState<ArenaFrame | null>(null),
    [locked, setLocked] = useState(false),
    [connection, setConnection] = useState("Connecting"),
    [error, setError] = useState<string | null>(null),
    /** Set when the server refused every connection: the loading screen's "Try again". */
    [retry, setRetry] = useState<(() => void) | null>(null),
    [arenaReady, setArenaReady] = useState(false),
    [renderError, setRenderError] = useState<string | null>(null),
    // The map the runtime fixed for this match (explicit or drawn from the rotation), returned
    // with the admission ticket so the right scene starts loading before the socket connects.
    [admittedMapId, setAdmittedMapId] = useState<string | null>(null),
    [muted, setMuted] = useState(false),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [ready, setReady] = useState(false),
    [seat, setSeat] = useState<Seat | null>(null);
  const [desktop, setDesktop] = useState<boolean | null>(null),
    [accepted, setAccepted] = useState(false),
    [copied, setCopied] = useState(false);
  const [network, setNetwork] = useState<NetworkReport | null>(null);
  /** The kill feed: this round's kills and the last round's until the next one starts. */
  const [kills, setKills] = useState<Array<DuelKill & { id: string; round: number }>>([]);
  const [visualProgress, setVisualProgress] = useState<ArenaLoadProgress>({
    value: 0,
    label: "Loading arena engine",
  });
  const observations = useRef(new NetworkObservations());
  const currentFrame = useRef<ArenaFrame | null>(null),
    sound = useRef<CombatAudio | null>(null);
  const requestKey = useRef<string | null>(null);
  const serverOffset = useRef(0);
  const settledMatch = useRef<string | null>(null);
  const capturePending = useRef(false);
  const hadCapturedMouse = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const actionInFlight = useRef(false);
  const [settings, setSettings] = useState(DEFAULT_STRIKE_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Spawn buy menu (B). While it is open, releasing the mouse does not open the settings. */
  const [buyOpen, setBuyOpen] = useState(false);
  const buyOpenRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    setSettings(readStrikeSettings());
  }, []);
  useEffect(() => {
    arena.current?.setSensitivity(settings.sensitivity);
    // The OS reduced-motion preference stays on even when this toggle is off.
    if (settings.reducedMotion) arena.current?.setReducedMotion(true);
    else
      arena.current?.setReducedMotion(
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    sound.current?.setVolume(settings.volume);
    saveStrikeSettings(settings);
  }, [settings]);
  const match = view.data;
  const profiles = useQuery({
    queryKey: ["fps-players", match?.creator_id, match?.opponent_id],
    enabled: !!match?.creator_id,
    staleTime: 60000,
    queryFn: async () => {
      const ids = [match!.creator_id, match!.opponent_id].filter((id): id is string => !!id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", ids);
      if (error) throw error;
      return data as DuelProfile[];
    },
  });
  const players = [match?.creator_id, match?.opponent_id].map(
    (id, index) =>
      profiles.data?.find((p) => p.id === id) ?? {
        id: id ?? String(index),
        username:
          match?.practice && index === 1 ? "Arena Bot" : `Player ${index === 0 ? "A" : "B"}`,
        avatar_url: null,
      },
  );
  const playable =
    !!match &&
    !!match.opponent_id &&
    (["FUNDED", "STARTING", "PLAYING"].includes(match.status) ||
      (spectate && !!frame && !frame.settled));
  const active = frame?.state.phase === "live";
  // The rifle follows the character side (Police M4A1-S / Terrorist AK-47), which swaps at halftime.
  const mySide = seat && frame ? characterSide(frame.state, seat) : (seat ?? "B");
  const me = seat && frame?.state.players[seat],
    other = seat && frame?.state.players[seat === "A" ? "B" : "A"];
  const terminal =
    frame?.state.phase === "completed" ||
    frame?.state.phase === "cancelled" ||
    (!spectate && ["COMPLETED", "CANCELLED", "REFUNDED"].includes(match?.status ?? ""));
  // A match being played (not watched) asks before the tab closes; Ctrl shortcuts are held.
  useMatchLeaveGuard(!spectate && !!seat && !!frame && !terminal);
  const resultSettled =
    !!frame?.settled || ["COMPLETED", "CANCELLED"].includes(match?.status ?? "");
  const replayWallet = useQuery({
    ...walletQuery(userId),
    enabled: !!userId && !!terminal && !spectate && !!match && !match.practice && resultSettled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const needsArena = !!desktop && (playable || terminal || !userId);
  // The runtime fixes each match's map. Snapshots are authoritative; the admission ticket tells a
  // player which map it is before the socket opens, so the scene and loading art start at once.
  // Players wait for it (never load a guessed map); viewers of finished or open matches fall back
  // to the match row or Dustfront. A changed id (client/server skew) remounts the arena.
  const awaitingMap = playable && !!userId && !frame && !admittedMapId;
  const mapId: string | null = awaitingMap
    ? null
    : (frame?.state.mapId ?? admittedMapId ?? match?.map_id ?? DEFAULT_MAP_ID);
  const knownMap = mapId !== null && isMapId(mapId);
  const mapName = knownMap ? getMap(mapId).name : "PvPStrike";
  const loadingImage = knownMap ? loadingImageFor(mapId) : null;
  useEffect(() => {
    const sync = () => setMuted(soundMuted());
    sync();
    const unsubscribe = subscribeSound(sync);
    return () => {
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    const d = matchMedia("(pointer:fine) and (hover:hover)");
    setDesktop(d.matches);
    const f = () => setDesktop(d.matches);
    d.addEventListener("change", f);
    return () => d.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), active ? 1000 : 100);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => {
    sound.current?.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    if (!arenaReady) return;
    const remove = () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
    const unlock = () => {
      // Automatic entry must retain sound on browsers that gate audio separately.
      void sound.current
        ?.unlock()
        .then(remove)
        .catch(() => {});
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return remove;
  }, [arenaReady]);
  useEffect(() => {
    claimArenaPointer(matchId);
    return () => {
      sound.current?.dispose();
      releaseArenaPointer(matchId);
    };
  }, [matchId]);

  useEffect(() => {
    if (!host.current || !needsArena || mapId === null) return;
    if (!knownMap) {
      setRenderError("This match uses a map this version doesn't have yet. Reload to update.");
      return;
    }
    let disposed = false;
    setArenaReady(false);
    setVisualProgress({ value: 0, label: "Loading arena engine" });
    void loadArenaRenderer()
      .then(async ({ mountArena }) => {
        // Paint the room and its loading state before expensive WebGL setup.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (disposed || !host.current) return;
        try {
          arena.current = mountArena(
            host.current,
            (input: Input) => {
              if (socket.current?.readyState === WebSocket.OPEN)
                socket.current.send(JSON.stringify(input));
            },
            (value) => {
              setLocked(value);
              if (value) {
                hadCapturedMouse.current = true;
                setSettingsOpen(false);
              } else if (
                hadCapturedMouse.current &&
                !buyOpenRef.current &&
                !["completed", "cancelled"].includes(currentFrame.current?.state.phase ?? "")
              )
                setSettingsOpen(true);
            },
            (weapon, seq, primary) => {
              observations.current.shot(seq, performance.now());
              sound.current?.localShot(weapon, seq, primary);
            },
            (progress) => {
              if (!disposed) setVisualProgress(progress);
            },
            {
              mapId,
              onKnifeCue: (cue) => sound.current?.knifeCue(cue),
              onHitConfirmed: () => sound.current?.cue("hit-marker"),
              onShotAt: () => sound.current?.cue("shot-at"),
              onScope: (entering) => sound.current?.zoom(entering),
              onGrenadeSound: (cue, o) => sound.current?.grenade(cue, o),
            },
          );
          arena.current.setSensitivity(settingsRef.current.sensitivity);
          if (settingsRef.current.reducedMotion) arena.current.setReducedMotion(true);
          void arena.current.ready
            .then(() => {
              if (!disposed) {
                // Decode before the first trigger pull; resume stays in Ready's
                // user gesture so browser autoplay rules remain respected.
                try {
                  sound.current ??= createCombatAudio(() => arena.current?.audioPresentation());
                  sound.current.setMuted(soundMuted());
                  sound.current.setVolume(settingsRef.current.volume);
                  void sound.current.ready();
                } catch {
                  /* Audio availability must never block mouse capture. */
                }
                setArenaReady(true);
              }
            })
            .catch(() => {
              if (!disposed)
                setRenderError("The arena could not finish preparing. Reload to try again.");
            });
          if (currentFrame.current) arena.current.snapshot(currentFrame.current, seatRef.current);
        } catch {
          setRenderError(
            "This browser could not start WebGL. Try a desktop browser with hardware acceleration.",
          );
        }
      })
      .catch(() => {
        if (!disposed) setRenderError("The arena download failed. Reload to retry.");
      });
    return () => {
      disposed = true;
      arena.current?.dispose();
      arena.current = null;
    };
  }, [needsArena, matchId, mapId, knownMap]);

  useEffect(() => {
    if (!playable || !userId || !desktop) return;
    let lastHud = 0;
    const invalid = (link: MatchSocketLink) => {
      setError("An invalid match update was received. Reconnecting.");
      link.ws.close(1002, "Invalid snapshot");
    };
    const link = openMatchSocket({
      ref: socket,
      connecting(attempt) {
        setConnection(attempt ? "Reconnecting" : "Connecting");
        setNetwork(null);
        observations.current.reset();
        setError(null);
      },
      admit: () => admission({ data: { matchId, spectate } }),
      address: (ticket) => ticket.url,
      // Older runtimes and fixtures don't report a map: they play Dustfront.
      created: (ticket) => setAdmittedMapId(ticket.mapId ?? DEFAULT_MAP_ID),
      opened(link) {
        setConnection("Connected");
        link.settled();
      },
      maxFrame: 50_000,
      invalid,
      frame(raw, link) {
        try {
          const data = raw as ArenaFrame & {
            type: string;
            seat?: Seat | null;
            v?: number;
            paused?: boolean;
            report?: unknown;
          };
          if (data.v !== 1) return;
          if (data.type === "network") {
            const report = readNetworkReport(data.report);
            if (report) setNetwork(report);
            return;
          }
          if (data.type === "authorization" && data.paused) {
            arena.current?.suspend(true);
            setConnection("Authorization paused");
            return;
          }
          if (data.type === "welcome") {
            seatRef.current = data.seat ?? null;
            setSeat(data.seat ?? null);
            return;
          }
          if (data.type !== "snapshot" || !data.state?.players || !data.state.score) return;
          observations.current.snapshot(performance.now());
          for (const event of data.state.events)
            if (
              event.type === "shot" &&
              event.seat === seatRef.current &&
              event.shotSeq !== undefined
            )
              observations.current.acknowledge(event.shotSeq, performance.now());
          setConnection("Connected");
          serverOffset.current = data.serverNow - Date.now();
          const previous = currentFrame.current;
          const fresh = duelKills(previous?.state, data.state);
          if (fresh.length || (previous && previous.state.round !== data.state.round))
            setKills((list) => [
              ...list.filter((k) => k.round >= data.state.round - 1).slice(-3),
              ...fresh.map((k) => ({
                ...k,
                id: `${data.state.round}-${data.state.tick}-${k.victim}`,
                round: data.state.round,
              })),
            ]);
          const important =
            !previous ||
            previous.state.phase !== data.state.phase ||
            previous.state.round !== data.state.round ||
            previous.settled !== data.settled ||
            (["A", "B"] as const).some((s) => {
              const a = previous.state.players[s],
                b = data.state.players[s];
              return (
                a.hp !== b.hp ||
                a.ammo !== b.ammo ||
                a.weapon !== b.weapon ||
                a.nade !== b.nade ||
                JSON.stringify(a.grenades) !== JSON.stringify(b.grenades) ||
                a.reloadUntil !== b.reloadUntil
              );
            });
          currentFrame.current = data;
          if (["completed", "cancelled"].includes(data.state.phase) && document.pointerLockElement)
            document.exitPointerLock();
          arena.current?.snapshot(data, seatRef.current);
          if (
            important ||
            Date.now() - lastHud > 250 ||
            ["completed", "cancelled"].includes(data.state.phase)
          ) {
            lastHud = Date.now();
            setFrame(data);
          }
          sound.current?.snapshot(data.state, seatRef.current, data.serverNow);
          if (data.settled && settledMatch.current !== matchId) {
            settledMatch.current = matchId;
            void qc.invalidateQueries({ queryKey: ["wallet"] });
            void qc.invalidateQueries({ queryKey: ["fps-view", matchId] });
          }
        } catch {
          invalid(link);
        }
      },
      failed: () => setConnection("Connection interrupted"),
      closed(event, attempt) {
        arena.current?.suspend(true);
        setLocked(false);
        setReady(false);
        if (document.pointerLockElement) document.exitPointerLock();
        if (event.code === 4001) {
          setConnection("Opened in another tab");
          setError(
            "This seat is active in another connection. Close that tab before reconnecting.",
          );
          return null;
        }
        if (event.code === 1008 || event.code === 1009) {
          if (event.reason === "Client update required") {
            setConnection("Update required");
            setError(
              "Reload PvPStrike to use the current combat rules. Your unstarted match will refund automatically.",
            );
            return null;
          }
          if (event.reason === "Session revoked" || event.reason === "Session expired") {
            setConnection("Session ended");
            setError("Your session ended. Sign in again before reconnecting.");
            return null;
          }
          setConnection("Input rejected");
          setError("The server rejected this connection. Return to the lobby.");
          return null;
        }
        if (currentFrame.current?.settled) {
          setConnection("Match complete");
          return null;
        }
        setConnection("Reconnecting");
        return Math.min(5000, 500 * 2 ** Math.min(attempt, 4));
      },
      admitFailed(e, attempt) {
        setError(duelError(e));
        return Math.min(5000, 1000 * attempt);
      },
      unreachable(again) {
        setConnection("Server unreachable");
        setError("The match server is temporarily unavailable. Try again in a moment.");
        setRetry(() => () => {
          setError(null);
          setRetry(null);
          again();
        });
      },
    });
    return () => link.close("Leaving view");
  }, [playable, userId, desktop, matchId, spectate, admission, qc]);

  const activate = async (automatic = false) => {
    if (
      !arenaReady ||
      !currentFrame.current ||
      socket.current?.readyState !== WebSocket.OPEN ||
      capturePending.current
    )
      return;
    capturePending.current = true;
    setCapturing(true);
    let capturedMouse = false;
    const confirmReady = () => {
      if (socket.current?.readyState !== WebSocket.OPEN) return;
      socket.current.send(
        JSON.stringify({
          v: 1,
          type: "ready",
          combatVersion: currentFrame.current?.state.combatVersion ?? 1,
        }),
      );
      setReady(true);
    };
    if (automatic) {
      setSettingsOpen(false);
      confirmReady();
    }
    try {
      // Capture in the original click gesture; never wait for asynchronous audio.
      const captured = arena.current?.lock();
      try {
        if (!sound.current)
          sound.current = createCombatAudio(() => arena.current?.audioPresentation());
        sound.current.setMuted(muted);
        sound.current.setVolume(settingsRef.current.volume);
        void sound.current.unlock().catch(() => {});
      } catch {
        /* Audio availability must not prevent entering an authenticated match. */
      }
      await captured;
      capturedMouse = true;
      setError(null);
    } catch {
      if (automatic) releaseArenaPointer(matchId);
      else setError("Click the arena to allow mouse capture. Press Esc to release it.");
    } finally {
      // Readiness is automatic. Mouse permission is cosmetic and must not create
      // another acceptance step or leave a fully loaded match behind a popup.
      if (!automatic && capturedMouse) confirmReady();
      capturePending.current = false;
      setCapturing(false);
    }
  };
  const activateRef = useRef(activate);
  activateRef.current = activate;
  useEffect(() => {
    if (
      !spectate &&
      !terminal &&
      !ready &&
      !capturing &&
      arenaReady &&
      frame &&
      connection === "Connected"
    )
      void activateRef.current(true);
  }, [spectate, terminal, ready, capturing, arenaReady, frame, connection]);
  const perform = async (kind: "cancel" | "join" | "rematch") => {
    if (actionInFlight.current) return;
    if (kind === "rematch" && (!match || spectate || !resultSettled)) return;
    actionInFlight.current = true;
    setBusy(true);
    setError(null);
    if (kind === "join") reserveArenaPointer(matchId);
    else if (kind === "rematch") reserveArenaPointer();
    try {
      // Preflight improves feedback; the ledger RPC still locks and checks funds
      // atomically. Preserve an existing key on retries: an earlier request may
      // already have reserved the entry even if its response was interrupted.
      if (kind === "rematch" && !match?.practice && !requestKey.current) {
        const funds = await qc.fetchQuery({ ...walletQuery(userId), staleTime: 0 }).catch(() => {
          throw new Error("BALANCE_CHECK_FAILED");
        });
        if (funds.available < match!.stake) throw new Error("INSUFFICIENT_BALANCE");
      }
      requestKey.current ??= crypto.randomUUID();
      const r = (await action({
        data:
          kind === "cancel"
            ? { action: kind, matchId }
            : kind === "join"
              ? {
                  action: kind,
                  combatVersion: 2,
                  matchId,
                  key: requestKey.current,
                  ...(invite ? { invite } : {}),
                }
              : match?.practice
                ? { action: "practice", combatVersion: 2, key: requestKey.current }
                : { action: kind, combatVersion: 2, matchId, key: requestKey.current },
      })) as { match_id?: string; id?: string; status?: string };
      // A first cash replay creates a waiting room; leave its controls clickable.
      // Joining the opponent's funded replay retains this click's mouse permission.
      if (kind === "rematch" && !match?.practice && r.status !== "FUNDED") releaseArenaPointer();
      if ("status" in r && "creator_id" in r && r.id)
        qc.setQueryData(["fps-view", r.id, userId], r);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["fps-lobby"] });
      if (kind === "cancel") await navigate({ to: "/fps-duel" });
      else
        await navigate({
          to: "/fps/$matchId",
          params: { matchId: r.match_id ?? r.id ?? matchId },
          search: {},
          replace: true,
        });
      requestKey.current = null;
    } catch (e) {
      releaseArenaPointer();
      setError(duelError(e));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };
  const copy = async () => {
    const token = match?.invite;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/fps/${matchId}?invite=${encodeURIComponent(token)}`,
      );
      setCopied(true);
    } catch {
      setError("Copy the invitation from the room details using your browser.");
    }
  };
  const canBuy = ready && !spectate && !terminal && !!seat && !!frame;
  const closeBuy = (relock: boolean) => {
    buyOpenRef.current = false;
    setBuyOpen(false);
    if (relock) void activate();
  };
  const buy = (item: BuyItem) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ v: 1, type: "buy", item }));
    if (item === "awp" && primaryOf(me || {}) !== "awp") sound.current?.awpDraw();
    closeBuy(true);
  };
  const canBuyRef = useRef(canBuy);
  canBuyRef.current = canBuy;
  useEffect(() => {
    const open = (e: KeyboardEvent) => {
      if (e.code !== "KeyB" || e.repeat || buyOpenRef.current || !canBuyRef.current) return;
      if (document.querySelector(".strike-settings")) return;
      e.preventDefault();
      buyOpenRef.current = true;
      setBuyOpen(true);
      setSettingsOpen(false);
      if (document.pointerLockElement) document.exitPointerLock();
    };
    document.addEventListener("keydown", open);
    return () => document.removeEventListener("keydown", open);
  }, []);
  useEffect(() => {
    if (!canBuy && buyOpenRef.current) closeBuy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canBuy]);
  const buyStatus =
    frame && seat ? buyBlocked(duelBuyWindow(frame.state, seat, now + serverOffset.current)) : null;
  const myPrimary: Primary = me ? primaryOf(me) : "rifle";
  const phase = frame?.state.phase ?? "waiting";
  const seconds = frame
    ? Math.max(0, Math.ceil((frame.state.phaseEndsAt - now - serverOffset.current) / 1000))
    : 0;
  const roundBreak =
    !!frame &&
    ["countdown", "round-end"].includes(phase) &&
    !terminal &&
    !invite &&
    !renderError &&
    desktop;
  const needsInteraction =
    !userId || !desktop || !!renderError || !!invite || terminal || !playable;
  const showResult = !!terminal && !!userId && !!desktop && !renderError && !invite;
  const cancelledResult =
    frame?.state.phase === "cancelled" || ["CANCELLED", "REFUNDED"].includes(match?.status ?? "");
  const winningSeat =
    frame?.state.winner ??
    (match?.winner_id && match.winner_id === match.creator_id
      ? "A"
      : match?.winner_id && match.winner_id === match.opponent_id
        ? "B"
        : null);
  const resultWinner =
    !cancelledResult && winningSeat ? players[winningSeat === "A" ? 0 : 1] : undefined;
  const showLoading =
    !invite &&
    !terminal &&
    !renderError &&
    (desktop === null ||
      (!!desktop &&
        !!userId &&
        (view.isPending ||
          (playable &&
            (!arenaReady || !frame || connection !== "Connected" || (!spectate && !ready))))));
  const waitingForOpponent = ready && phase === "waiting" && connection === "Connected";
  const loadLabel = !arenaReady
    ? mapId === null
      ? "Choosing map"
      : visualProgress.label
    : connection !== "Connected"
      ? connection
      : !frame
        ? "Synchronizing match"
        : waitingForOpponent
          ? "Waiting for opponent"
          : `Entering ${mapName}`;
  return (
    <div
      className={`duel-game${showResult ? " duel-show-result" : ""}`}
      data-arena-ready={arenaReady}
    >
      {!arenaReady && !showLoading && (
        <div className="duel-loading-backdrop" aria-hidden>
          {loadingImage && (
            <img
              src={loadingImage}
              alt=""
              width={1672}
              height={941}
              fetchPriority="high"
              decoding="async"
            />
          )}
        </div>
      )}
      <div
        className="duel-render-host"
        ref={host}
        onClick={() => {
          if (ready && !locked && !spectate && !terminal) void activate();
        }}
      />
      {showLoading && (
        <ArenaLoadingScreen
          progress={matchLoadProgress(visualProgress.value, connection === "Connected", !!frame)}
          label={loadLabel}
          error={error}
          onRetry={retry ?? undefined}
          mapName={mapName}
          image={loadingImage}
        />
      )}
      {ready && !locked && !spectate && !terminal && !settingsOpen && !showLoading && (
        <div className="duel-capture-hint" role="status">
          Click the arena to enable mouse control
        </div>
      )}
      <header className="duel-hud-top">
        <div className="duel-score">
          <span className={seat === "A" ? "you" : ""}>
            {frame ? sideName(frame.state, "A") : "Anti-Terrorist"}{" "}
            <b>{frame?.state.score.A ?? match?.score_a ?? 0}</b>
          </span>
          <div>
            <small>
              BEST OF {match?.best_of ?? 5} · ROUND {frame?.state.round ?? 1}
            </small>
            <strong>
              {phase === "live"
                ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                : frame && isHalftime(frame.state)
                  ? "HALFTIME"
                  : "PVPSTRIKE"}
            </strong>
          </div>
          <span className={seat === "B" ? "you" : ""}>
            <b>{frame?.state.score.B ?? match?.score_b ?? 0}</b>{" "}
            {frame ? sideName(frame.state, "B") : "Terrorist"}
          </span>
        </div>
        <div className="duel-hud-actions">
          <span
            className={connection === "Connected" ? "duel-connected duel-network-status" : ""}
            data-quality={
              network && network.rttP95Ms > 180
                ? "delayed"
                : network && network.jitterMs > 25
                  ? "unstable"
                  : "stable"
            }
          >
            {connection}
          </span>
          <button
            aria-label={muted ? "Enable game audio" : "Mute game audio"}
            onClick={() => toggleSoundMuted()}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button
            aria-label="Fullscreen arena"
            onClick={() =>
              void host.current?.parentElement
                ?.requestFullscreen()
                .catch(() => setError("Fullscreen is unavailable in this browser."))
            }
          >
            <Maximize size={17} />
          </button>
        </div>
      </header>
      {!terminal && frame && isDefeatedView(frame.state, seat, spectate) && (
        <DeathFeedback key={`${matchId}-${frame.state.round}`} round={frame.state.round} />
      )}
      {!terminal && <StrikeCrosshair settings={settings} />}
      <div className="awp-scope" aria-hidden>
        <i className="h" />
        <i className="v" />
      </div>
      {canBuy && locked && !buyStatus && (
        <div className="buy-hint" role="status">
          <kbd>B</kbd> Buy weapons
        </div>
      )}
      <BuyMenu
        open={buyOpen && canBuy}
        side={mySide === "A" ? "police" : "terrorist"}
        current={myPrimary}
        status={buyStatus}
        onBuy={buy}
        onClose={() => closeBuy(true)}
      />
      <GameSettings
        matchNotice={<FpsReadyAction practiceId={matchId} />}
        open={settingsOpen && ready && !terminal}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        onLeavePractice={match?.practice && !spectate ? () => void perform("cancel") : undefined}
        leavingPractice={busy}
        leaveError={error}
        leaveAction={
          !match?.practice || spectate ? (
            <Link to="/fps-duel" className="duel-secondary">
              Leave game
            </Link>
          ) : undefined
        }
        onResume={() => {
          void activate();
        }}
      />
      <div className="duel-hit-marker" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      {frame?.state.events
        .filter((e) => ["hit", "headshot"].includes(e.type) && e.seat === seat)
        .map((e, i) => (
          <div key={`${frame.state.tick}-${i}`} className="duel-hit">
            {e.text}
          </div>
        ))}
      <div className="duel-killfeed" aria-live="polite">
        {kills.map((k) => (
          <p key={k.id} className={k.killer === seat || k.victim === seat ? "mine" : ""}>
            <span>{players[k.killer === "A" ? 0 : 1]?.username}</span>
            <FeedWeaponIcon weapon={k.weapon} />
            {k.headshot ? (
              <Crosshair size={14} aria-label="Headshot" role="img" />
            ) : (
              <Skull size={14} aria-hidden />
            )}
            <span>{players[k.victim === "A" ? 0 : 1]?.username}</span>
          </p>
        ))}
      </div>
      <div className="duel-event-feed">
        {frame?.state.events
          .filter((e) => !["shot", "impact", "step"].includes(e.type))
          .slice(-3)
          .map((e, i) => (
            <p key={i}>{e.text}</p>
          ))}
      </div>
      {active && other && frame?.visibility?.[seat === "A" ? "B" : "A"] !== false && (
        <div className="duel-opponent-state">Opponent · {other.hp} HP</div>
      )}
      <footer className="duel-hud-bottom">
        <div className="duel-health">
          <small>HEALTH</small>
          {me?.armor !== undefined && <small>KEVLAR {Math.ceil(me.armor)}</small>}
          <strong>
            {me?.hp ?? 100}
            <span>/100</span>
          </strong>
          <div>
            <i style={{ width: `${me?.hp ?? 100}%` }} />
          </div>
        </div>
        <div className="duel-ammo">
          <GrenadeHud
            inventory={me?.grenades}
            drawn={me?.weapon === "grenade" ? (me.nade ?? null) : null}
          />
          {me && (
            <HeldWeapon
              weapon={heldWeapon({ weapon: me.weapon, primary: myPrimary }, mySide === "A")}
            />
          )}
          <small>
            {me?.weapon === "grenade" && me.nade
              ? `${GRENADE_NAMES[me.nade].toUpperCase()} · LMB THROW / RMB TOSS / BOTH MEDIUM`
              : me?.weapon === "knife"
                ? "KARAMBIT · SLASH / RMB STAB"
                : me?.weapon === "sidearm"
                  ? "DESERT EAGLE · SEMI-AUTO"
                  : myPrimary === "awp"
                    ? "AWP · SNIPER RIFLE"
                    : myPrimary === "mp5"
                      ? "MP5 · FULL AUTO"
                      : myPrimary === "hunting"
                        ? "HUNTING RIFLE · SNIPER RIFLE"
                        : myPrimary === "spas12"
                          ? "SPAS-12 · AUTO SHOTGUN"
                          : `${SIDE_RIFLE[mySide]} · FULL AUTO`}
          </small>
          {me?.weapon === "knife" || me?.weapon === "grenade" ? (
            <strong>
              —<span>/ —</span>
            </strong>
          ) : me?.weapon === "sidearm" ? (
            <strong>
              {me.sidearmAmmo ?? DEAGLE.magazine}
              <span>/ {me.sidearmReserve ?? DEAGLE.reserve}</span>
            </strong>
          ) : (
            <strong>
              {me?.ammo ?? primaryStats({ primary: myPrimary }).magazine}
              <span>/ {me?.reserve ?? primaryStats({ primary: myPrimary }).reserve}</span>
            </strong>
          )}
          {me?.reloadUntil ? <em>RELOADING</em> : null}
        </div>
      </footer>
      {roundBreak && (
        <RoundBreak
          recap={frame?.state.lastRound}
          seconds={seconds}
          profiles={players}
          countdown={phase === "countdown"}
          halftime={!!frame && isHalftime(frame.state)}
        />
      )}
      {showResult && (
        <MatchResult
          winner={resultWinner}
          score={[
            frame?.state.score.A ?? match?.score_a ?? 0,
            frame?.state.score.B ?? match?.score_b ?? 0,
          ]}
          mapName={mapName}
          practice={!!match?.practice}
          cancelled={cancelledResult}
          settled={resultSettled}
          spectate={spectate}
          stake={match?.stake ?? 0}
          available={error && requestKey.current ? undefined : replayWallet.data?.available}
          checkingBalance={!match?.practice && replayWallet.isFetching}
          balanceError={replayWallet.isError}
          busy={busy}
          error={error}
          onPlayAgain={() => void perform("rematch")}
          lobbyLink={<Link to="/fps-duel">Back to lobby</Link>}
          walletLink={<Link to="/wallet">Open wallet</Link>}
        />
      )}
      {!showLoading && needsInteraction && !showResult && (
        <div className={`duel-game-overlay ${locked ? "duel-game-overlay-passive" : ""}`}>
          <section className="duel-match-card">
            <span className="duel-eyebrow">AIM ARENA / PVP ORIGINALS</span>
            <p className="duel-combat-rules">
              {frame && (frame.state.combatVersion ?? 1) !== 2
                ? "Earlier combat rules retained for this match."
                : frame?.state.armorVersion === 1
                  ? `${SIDE_RIFLE[mySide]} · Full auto · Kevlar: Chest 26 · Stomach 23 · Head 34 · Legs 20`
                  : `${SIDE_RIFLE[mySide]}: full auto · Head 34 · Chest 34 · Stomach 30 · Legs 20`}
              <br />
              Tap or burst to reset; pull down, then counter the sideways spray.
            </p>
            {!userId ? (
              <>
                <h1>Take your seat.</h1>
                <p>Sign in with your casino account to join an authenticated duel.</p>
                <Link className="duel-primary" to="/auth">
                  Sign in
                </Link>
              </>
            ) : !desktop ? (
              <>
                <h1>Desktop arena.</h1>
                <p>
                  This competitive mode requires a mouse and keyboard. Your wallet and other games
                  remain available on mobile.
                </p>
                <Link className="duel-primary" to="/fps-duel">
                  Back to lobby
                </Link>
              </>
            ) : renderError ? (
              <>
                <h1>Graphics unavailable</h1>
                <p>{renderError}</p>
              </>
            ) : invite ? (
              <>
                <h1>Private invitation.</h1>
                {preview.data ? (
                  <>
                    <p>
                      {preview.data.username} · Best of {preview.data.best_of}
                      <br />
                      {duelMoney(preview.data.stake)} entry · Winner receives{" "}
                      {duelMoney(duelQuote(preview.data.stake).payout)}
                    </p>
                    <label className="duel-checkbox">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                      />
                      I accept these match terms and the 5% fee.
                    </label>
                    <button
                      className="duel-primary"
                      disabled={!accepted || busy}
                      onClick={() => void perform("join")}
                    >
                      Accept and join
                    </button>
                  </>
                ) : (
                  <p>
                    {preview.isError
                      ? "This invitation is invalid, expired, or unavailable."
                      : "Loading invitation terms…"}
                  </p>
                )}
              </>
            ) : !playable ? (
              <>
                <h1>
                  Room created.
                  <br />
                  <em>Waiting for a rival.</em>
                </h1>
                <p>
                  Best of {match?.best_of ?? 5} · {duelMoney(match?.stake ?? 0)} per player
                  <br />
                  Both players confirm readiness before the first round.
                </p>
                <Link className="duel-secondary" to="/fps-duel">
                  Browse or play free Practice while waiting
                </Link>
                {match?.private && (
                  <button
                    className="duel-secondary"
                    onClick={() => void copy()}
                    disabled={!match.invite}
                  >
                    <Copy size={15} />
                    {copied ? "Invitation copied" : "Copy private invitation"}
                  </button>
                )}
                {match?.creator_id === userId && match?.status === "WAITING" && (
                  <button
                    className="duel-secondary"
                    disabled={busy}
                    onClick={() => void perform("cancel")}
                  >
                    Cancel room and release entry
                  </button>
                )}
                {view.isError && <p className="duel-error">{duelError(view.error)}</p>}
              </>
            ) : null}
            {error && (
              <p className="duel-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
