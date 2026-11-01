import { NetworkObservations, readNetworkReport, type NetworkReport } from "@/lib/fps/network";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Volume2, VolumeX, Maximize, Copy, ShieldCheck } from "lucide-react";
import { createCombatAudio, type CombatAudio } from "@/lib/fps/audio";
import { SEAT_RIFLE } from "@/lib/fps/combat";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { useAuth } from "@/lib/auth";
import { duelAdmission, duelAction } from "@/lib/fps/duel.functions";
import { fetchDuelView, duelError } from "@/lib/fps/api";
import { duelMoney, duelQuote, type DuelView } from "@/lib/fps/quote";
import { supabase } from "@/integrations/supabase/client";
import type { Input, Seat } from "@/lib/fps/protocol";
import type { ArenaControls, ArenaFrame } from "@/lib/fps/renderer";
import { loadArenaRenderer } from "@/lib/fps/renderer-loader";
import { STRIKE_LOADING_IMAGE, matchLoadProgress, type ArenaLoadProgress } from "@/lib/fps/loading";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
import {
  reserveArenaPointer,
  releaseArenaPointer,
  claimArenaPointer,
} from "@/lib/fps/entry-capture";
import { RoundBreak, type DuelProfile } from "./RoundBreak";
import { DeathFeedback } from "./DeathFeedback";
import { isDefeatedView } from "@/lib/fps/death-presentation";
import "./duel.css";
import { GameSettings, StrikeCrosshair } from "./GameSettings";
import { FpsReadyAction } from "./FpsQueueNotice";
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
    [arenaReady, setArenaReady] = useState(false),
    [renderError, setRenderError] = useState<string | null>(null),
    [muted, setMuted] = useState(false),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [ready, setReady] = useState(false),
    [seat, setSeat] = useState<Seat | null>(null);
  const [desktop, setDesktop] = useState<boolean | null>(null),
    [accepted, setAccepted] = useState(false),
    [copied, setCopied] = useState(false);
  const [network, setNetwork] = useState<NetworkReport | null>(null);
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
  const [rematchReview, setRematchReview] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_STRIKE_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    setSettings(readStrikeSettings());
  }, []);
  useEffect(() => {
    arena.current?.setSensitivity(settings.sensitivity);
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
  const me = seat && frame?.state.players[seat],
    other = seat && frame?.state.players[seat === "A" ? "B" : "A"];
  const terminal =
    frame?.state.phase === "completed" ||
    frame?.state.phase === "cancelled" ||
    (!spectate && ["COMPLETED", "CANCELLED", "REFUNDED"].includes(match?.status ?? ""));
  const needsArena = !!desktop && (playable || terminal || !userId);
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
    if (!host.current || !needsArena) return;
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
              } else if (hadCapturedMouse.current) setSettingsOpen(true);
            },
            (weapon, seq) => {
              observations.current.shot(seq, performance.now());
              sound.current?.localShot(weapon, seq);
            },
            (progress) => {
              if (!disposed) setVisualProgress(progress);
            },
          );
          arena.current.setSensitivity(settingsRef.current.sensitivity);
          void arena.current.ready
            .then(() => {
              if (!disposed) {
                // Decode before the first trigger pull; resume stays in Ready's
                // user gesture so browser autoplay rules remain respected.
                try {
                  sound.current ??= createCombatAudio();
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
  }, [needsArena, matchId]);

  useEffect(() => {
    if (!playable || !userId || !desktop) return;
    let stopped = false,
      retry: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    let lastHud = 0;
    const connect = async () => {
      if (stopped) return;
      setConnection(attempt ? "Reconnecting" : "Connecting");
      setNetwork(null);
      observations.current.reset();
      setError(null);
      try {
        const ticket = await admission({ data: { matchId, spectate } });
        if (stopped) return;
        const ws = new WebSocket(ticket.url);
        socket.current = ws;
        ws.onopen = () => {
          if (stopped) {
            ws.close();
            return;
          }
          setConnection("Connected");
          attempt = 0;
        };
        ws.onmessage = (event) => {
          if (stopped || typeof event.data !== "string" || event.data.length > 50_000) return;
          try {
            const data = JSON.parse(event.data) as ArenaFrame & {
              type: string;
              seat?: Seat | null;
              v?: number;
              paused?: boolean;
              id?: unknown;
              report?: unknown;
            };
            if (data.v !== 1) return;
            if (data.type === "ping") {
              if (
                typeof data.id === "string" &&
                data.id.length <= 64 &&
                ws.readyState === WebSocket.OPEN
              )
                ws.send(JSON.stringify({ v: 1, type: "pong", id: data.id }));
              return;
            }
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
                  a.reloadUntil !== b.reloadUntil
                );
              });
            currentFrame.current = data;
            if (
              ["completed", "cancelled"].includes(data.state.phase) &&
              document.pointerLockElement
            )
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
            setError("An invalid match update was received. Reconnecting.");
            ws.close(1002, "Invalid snapshot");
          }
        };
        ws.onerror = () => setConnection("Connection interrupted");
        ws.onclose = (event) => {
          if (stopped) return;
          arena.current?.suspend(true);
          setLocked(false);
          setReady(false);
          if (document.pointerLockElement) document.exitPointerLock();
          if (event.code === 4001) {
            setConnection("Opened in another tab");
            setError(
              "This seat is active in another connection. Close that tab before reconnecting.",
            );
            return;
          }
          if (event.code === 1008 || event.code === 1009) {
            if (event.reason === "Client update required") {
              setConnection("Update required");
              setError(
                "Reload PvPStrike to use the current combat rules. Your unstarted match will refund automatically.",
              );
              return;
            }
            if (event.reason === "Session revoked" || event.reason === "Session expired") {
              setConnection("Session ended");
              setError("Your session ended. Sign in again before reconnecting.");
              return;
            }
            setConnection("Input rejected");
            setError("The server rejected this connection. Return to the lobby.");
            return;
          }
          if (currentFrame.current?.settled) {
            setConnection("Match complete");
            return;
          }
          setConnection("Reconnecting");
          retry = setTimeout(
            () => void connect(),
            Math.min(5000, 500 * 2 ** Math.min(attempt++, 4)),
          );
        };
      } catch (e) {
        if (!stopped) {
          setError(duelError(e));
          retry = setTimeout(() => void connect(), Math.min(5000, 1000 * ++attempt));
        }
      }
    };
    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      const s = socket.current;
      socket.current = null;
      if (s) {
        s.onclose = null;
        s.onmessage = null;
        s.close(1000, "Leaving view");
      }
    };
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
        if (!sound.current) sound.current = createCombatAudio();
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
    setBusy(true);
    setError(null);
    requestKey.current ??= crypto.randomUUID();
    if (kind === "join") reserveArenaPointer(matchId);
    else if (kind === "rematch" && match?.practice) reserveArenaPointer();
    try {
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
      })) as { match_id?: string; id?: string };
      if ("status" in r && "creator_id" in r && r.id)
        qc.setQueryData(["fps-view", r.id, userId], r);
      requestKey.current = null;
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      if (kind === "cancel") await navigate({ to: "/fps-duel" });
      else
        await navigate({
          to: "/fps/$matchId",
          params: { matchId: r.match_id ?? r.id ?? matchId },
          search: {},
          replace: true,
        });
    } catch (e) {
      releaseArenaPointer();
      setError(duelError(e));
    } finally {
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
  const phase = frame?.state.phase ?? "waiting";
  const networkSummary = observations.current.summary();
  const shotAckText =
    networkSummary.shotAckP50 === null
      ? "not measured"
      : `${Math.round(networkSummary.shotAckP50)} ms`;
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
    ? visualProgress.label
    : connection !== "Connected"
      ? connection
      : !frame
        ? "Synchronizing match"
        : waitingForOpponent
          ? "Waiting for opponent"
          : "Entering Dustfront";
  return (
    <div className="duel-game" data-arena-ready={arenaReady}>
      {!arenaReady && !showLoading && (
        <div className="duel-loading-backdrop" aria-hidden>
          <img
            src={STRIKE_LOADING_IMAGE}
            alt=""
            width={1672}
            height={941}
            fetchPriority="high"
            decoding="async"
          />
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
        />
      )}
      {ready && !locked && !spectate && !terminal && !settingsOpen && !showLoading && (
        <div className="duel-capture-hint" role="status">
          Click the arena to enable mouse control
        </div>
      )}
      <header className="duel-hud-top">
        <Link to="/fps-duel" className="duel-back">
          <ArrowLeft size={17} /> Lobby
        </Link>
        <div className="duel-score">
          <span className={seat === "A" ? "you" : ""}>
            A <b>{frame?.state.score.A ?? match?.score_a ?? 0}</b>
          </span>
          <div>
            <small>
              BEST OF {match?.best_of ?? 5} · ROUND {frame?.state.round ?? 1}
            </small>
            <strong>
              {phase === "live"
                ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                : "PVPSTRIKE"}
            </strong>
          </div>
          <span className={seat === "B" ? "you" : ""}>
            <b>{frame?.state.score.B ?? match?.score_b ?? 0}</b> B
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
            title={
              network
                ? `Round trip: ${Math.round(network.rttMs)} ms median / ${Math.round(network.rttP95Ms)} ms p95 · Jitter: ${Math.round(network.jitterMs)} ms · Snapshots: ${Math.round(networkSummary.snapshotHz)}/s · Server: ${network.tickHz.toFixed(1)} ticks/s · Session check: ${Math.round(network.authMs)} ms · Shot acknowledgement: ${shotAckText}`
                : undefined
            }
          >
            {connection}
            {network && connection === "Connected" && <small>{Math.round(network.rttMs)} ms</small>}
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
      {frame && isDefeatedView(frame.state, seat, spectate) && (
        <DeathFeedback key={`${matchId}-${frame.state.round}`} round={frame.state.round} />
      )}
      <StrikeCrosshair settings={settings} />
      <GameSettings
        matchNotice={<FpsReadyAction practiceId={matchId} />}
        open={settingsOpen && ready && !terminal}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
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
        <div className="duel-controls-hint">
          W A S D <span>Move</span> · R <span>Reload</span> · 1 / 2 <span>Weapon</span> · SHIFT{" "}
          <span>Silent walk</span> · SPACE <span>Jump</span> · CTRL <span>Crouch</span> · ESC{" "}
          <span>Release mouse</span>
        </div>
        <div className="duel-ammo">
          <small>
            {me?.weapon === "pistol"
              ? "PISTOL · SEMI-AUTO"
              : `${SEAT_RIFLE[seat ?? "B"]} · FULL AUTO`}
          </small>
          <strong>
            {me?.ammo ?? 30}
            <span>/ {me?.reserve ?? 90}</span>
          </strong>
          {me?.reloadUntil ? <em>RELOADING</em> : null}
        </div>
      </footer>
      {roundBreak && (
        <RoundBreak
          recap={frame?.state.lastRound}
          seconds={seconds}
          profiles={players}
          countdown={phase === "countdown"}
        />
      )}
      {!showLoading && needsInteraction && (
        <div className={`duel-game-overlay ${locked ? "duel-game-overlay-passive" : ""}`}>
          <section className="duel-match-card">
            <span className="duel-eyebrow">AIM ARENA / PVP ORIGINALS</span>
            <p className="duel-combat-rules">
              {frame && (frame.state.combatVersion ?? 1) !== 2
                ? "Earlier combat rules retained for this match."
                : frame?.state.armorVersion === 1
                  ? `${SEAT_RIFLE[seat ?? "B"]} · Full auto · Kevlar: Chest 26 · Stomach 23 · Head 34 · Legs 20`
                  : `${SEAT_RIFLE[seat ?? "B"]}: full auto · Head 34 · Chest 34 · Stomach 30 · Legs 20`}
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
            ) : terminal ? (
              <>
                <ShieldCheck size={32} />
                <h1>
                  {frame?.state.phase === "cancelled" || match?.status === "CANCELLED"
                    ? "Match cancelled"
                    : (seat !== null && frame?.state.winner === seat) || match?.winner_id === userId
                      ? "Your arena. Your win."
                      : "Duel complete."}
                </h1>
                <p>
                  {frame?.state.score.A ?? match?.score_a ?? 0} —{" "}
                  {frame?.state.score.B ?? match?.score_b ?? 0}
                  <br />
                  {frame?.settled || ["COMPLETED", "CANCELLED"].includes(match?.status ?? "")
                    ? match?.practice
                      ? "Practice complete. No wager or rating changes."
                      : "Result recorded. Your wallet reflects the server's settlement."
                    : "Settlement pending. The server is retrying safely; no client payout is required."}
                </p>
                <button
                  className="duel-primary"
                  disabled={
                    busy ||
                    spectate ||
                    !(frame?.settled || ["COMPLETED", "CANCELLED"].includes(match?.status ?? ""))
                  }
                  onClick={() =>
                    match?.practice ? void perform("rematch") : setRematchReview(true)
                  }
                >
                  {match?.practice ? "Practice again" : "Accept fresh rematch"}
                </button>
                {rematchReview && (
                  <div className="duel-rematch-review">
                    <p>
                      New match · Best of {match?.best_of ?? 5}
                      <br />
                      {duelMoney(match?.stake ?? 0)} entry · 5% fee · Winner receives{" "}
                      {duelMoney(duelQuote(match?.stake ?? 0).payout)}
                    </p>
                    <button
                      className="duel-primary"
                      disabled={busy}
                      onClick={() => {
                        setRematchReview(false);
                        void perform("rematch");
                      }}
                    >
                      Confirm new entry
                    </button>
                    <button
                      className="duel-secondary"
                      disabled={busy}
                      onClick={() => setRematchReview(false)}
                    >
                      Keep result
                    </button>
                  </div>
                )}
                <Link className="duel-secondary" to="/fps-duel">
                  Return to lobby
                </Link>
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
