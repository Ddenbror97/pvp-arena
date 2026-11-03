import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Maximize, Volume2, VolumeX, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createCombatAudio, type CombatAudio } from "@/lib/fps/audio";
import { soundMuted, subscribeSound, toggleSoundMuted } from "@/lib/sound";
import { bombAdmission } from "@/lib/fps/bomb/bomb.functions";
import type { BombArenaControls } from "@/lib/fps/bomb/bomb-renderer";
import type { BombView } from "@/lib/fps/bomb/snapshot";
import {
  aliveByTeam,
  beepInterval,
  clockText,
  matchResult,
  myGroup,
  myPlayer,
  myTeam,
  objective,
  otherGroup,
  roundBanner,
  scoreboard,
  teamLabel,
} from "@/lib/fps/bomb/hud";
import { BOMB_LOADING_IMAGE, warmBombLoadingImage } from "@/lib/fps/bomb/loading";
import type { ArenaLoadProgress } from "@/lib/fps/loading";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
import { BombMinimap } from "./BombMinimap";
import { bombStepGain } from "@/lib/fps/bomb/footstep-gain";
import { GameSettings, StrikeCrosshair } from "./GameSettings";
import {
  DEFAULT_STRIKE_SETTINGS,
  readStrikeSettings,
  saveStrikeSettings,
} from "@/lib/fps/settings";
import "./duel.css";
import "./bomb.css";

/** Hearing ranges (m), as the room's: friendly events carry positions, enemy ones only bearings. */
const HEARING = { shot: 70, step: 25, reload: 12, bomb: 200 } as const;
type Kill = { id: number; killer: string; victim: string; headshot: boolean; mine: boolean };

let rendererModule: Promise<typeof import("@/lib/fps/bomb/bomb-renderer")> | undefined;
const loadBombRenderer = () =>
  (rendererModule ??= import("@/lib/fps/bomb/bomb-renderer").catch((e) => {
    rendererModule = undefined;
    throw e;
  }));

/** Practice Bomb Defusal: one 5v5 room (bots fill the empty slots), joined through the lobby. */
export function BombMatch() {
  const { userId } = useAuth();
  const admission = useServerFn(bombAdmission);
  const host = useRef<HTMLDivElement>(null),
    arena = useRef<BombArenaControls | null>(null),
    socket = useRef<WebSocket | null>(null),
    sound = useRef<CombatAudio | null>(null),
    latest = useRef<BombView | null>(null),
    serverOffset = useRef(0),
    spectateWanted = useRef<number | null>(null);
  const [view, setView] = useState<BombView | null>(null),
    [connection, setConnection] = useState("Connecting"),
    [error, setError] = useState<string | null>(null),
    [arenaReady, setArenaReady] = useState(false),
    [locked, setLocked] = useState(false),
    [muted, setMuted] = useState(false),
    [desktop, setDesktop] = useState<boolean | null>(null),
    [tab, setTab] = useState(false),
    [kills, setKills] = useState<Kill[]>([]),
    [now, setNow] = useState(Date.now()),
    [progress, setProgress] = useState<ArenaLoadProgress>({
      value: 0,
      label: "Loading arena engine",
    });
  const [settings, setSettings] = useState(DEFAULT_STRIKE_SETTINGS),
    [settingsOpen, setSettingsOpen] = useState(false);
  const [kitPending, setKitPending] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const hadCaptured = useRef(false);

  useEffect(() => {
    warmBombLoadingImage();
    setSettings(readStrikeSettings());
  }, []);
  useEffect(() => {
    arena.current?.setSensitivity(settings.sensitivity);
    arena.current?.setReducedMotion(settings.reducedMotion);
    sound.current?.setVolume(settings.volume);
    saveStrikeSettings(settings);
  }, [settings]);
  useEffect(() => {
    const sync = () => setMuted(soundMuted());
    sync();
    const unsubscribe = subscribeSound(sync);
    return () => {
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    sound.current?.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    const d = matchMedia("(pointer:fine) and (hover:hover)");
    const f = () => setDesktop(d.matches);
    f();
    d.addEventListener("change", f);
    return () => d.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const chooseKit = () => {
    const v = latest.current;
    if (
      !v ||
      v.phase !== "freeze" ||
      v.players[v.you]?.team !== "police" ||
      v.self.hp <= 0 ||
      v.self.defuseKit ||
      socket.current?.readyState !== WebSocket.OPEN
    )
      return;
    setKitPending(true);
    setKitError(null);
    socket.current.send(JSON.stringify({ v: 1, type: "equip-kit" }));
  };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.code !== "KeyB" ||
        event.repeat ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      const v = latest.current;
      if (v?.phase === "freeze" && v.players[v.you]?.team === "police") {
        event.preventDefault();
        if (!v.self.defuseKit && v.self.hp > 0 && socket.current?.readyState === WebSocket.OPEN) {
          setKitPending(true);
          setKitError(null);
          socket.current.send(JSON.stringify({ v: 1, type: "equip-kit" }));
        }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  useEffect(() => {
    setKitPending(false);
    setKitError(null);
  }, [view?.round, view?.phase]);
  // TAB: hold for the scoreboard (works while the mouse is captured).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Tab") return;
      e.preventDefault();
      setTab(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Tab") setTab(false);
    };
    const blur = () => setTab(false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  // Dead: left click watches the next living teammate, right click the previous one.
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const v = latest.current;
      if (!v || v.self.hp > 0 || !v.spectateTargets.length || (e.button !== 0 && e.button !== 2))
        return;
      const list = v.spectateTargets,
        at = Math.max(0, list.indexOf(v.spectating ?? list[0]!)),
        next = list[(at + (e.button === 0 ? 1 : list.length - 1)) % list.length]!;
      spectateWanted.current = next;
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send(JSON.stringify({ v: 1, type: "spectate", slot: next }));
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);
  // Audio unlock on the first gesture (autoplay rules).
  useEffect(() => {
    if (!arenaReady) return;
    const unlock = () => {
      void sound.current?.unlock().catch(() => {});
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, [arenaReady]);
  // The planted bomb's beeps (the room never sends a timer; the beep rate is the cue).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined,
      stopped = false;
    const tick = () => {
      if (stopped) return;
      const v = latest.current,
        b = v?.bomb;
      let wait = 400;
      if (v && b?.state === "planted" && v.phase === "live") {
        const left = b.explodesAt - (Date.now() + serverOffset.current);
        if (left > 0) {
          wait = beepInterval(left);
          const listener = arena.current?.audioPresentation();
          if (b.x !== undefined && listener) {
            const dx = b.x - listener.x,
              dz = (b.z ?? 0) - listener.z,
              d = Math.hypot(dx, dz);
            sound.current?.cue("beep", {
              gain: Math.max(0.15, 1 - d / 45),
              bearing: Math.atan2(dx, -dz),
            });
          } else sound.current?.cue("beep", { gain: 0.35 });
        }
      }
      timer = setTimeout(tick, wait);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  // ---------------------------------------------------------------- the scene
  useEffect(() => {
    if (!host.current || !desktop || !userId) return;
    let disposed = false;
    setArenaReady(false);
    void loadBombRenderer()
      .then(async ({ mountBombArena }) => {
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        if (disposed || !host.current) return;
        try {
          arena.current = mountBombArena(
            host.current,
            (input) => {
              if (socket.current?.readyState === WebSocket.OPEN)
                socket.current.send(JSON.stringify(input));
            },
            (value) => {
              setLocked(value);
              if (value) {
                hadCaptured.current = true;
                setSettingsOpen(false);
              } else if (hadCaptured.current) setSettingsOpen(true);
            },
            {
              onLoadProgress: (p) => {
                if (!disposed) setProgress(p);
              },
              onLocalShot: (m4) => sound.current?.cue("shot", { own: true, m4 }),
              onC4Cue: (name) => {
                const kind = name.startsWith("press:")
                  ? "c4-key"
                  : name === "armed" || name === "safe"
                    ? "c4-confirm"
                    : name === "place"
                      ? "c4-place"
                      : name === "grab" || name === "release" || name === "cancel"
                        ? "c4-handle"
                        : null;
                if (kind) sound.current?.cue(kind);
              },
            },
          );
          arena.current.setSensitivity(settingsRef.current.sensitivity);
          arena.current.setReducedMotion(settingsRef.current.reducedMotion);
          void arena.current.ready
            .then(() => {
              if (disposed) return;
              try {
                sound.current ??= createCombatAudio(() => arena.current?.audioPresentation(), {
                  bomb: true,
                });
                sound.current.setMuted(soundMuted());
                sound.current.setVolume(settingsRef.current.volume);
                void sound.current.ready();
              } catch {
                /* Audio never blocks play. */
              }
              setArenaReady(true);
            })
            .catch(() => !disposed && setError("The arena could not finish preparing. Reload."));
          if (latest.current) arena.current.snapshot(latest.current);
        } catch {
          setError("This browser could not start WebGL. Use a desktop browser with acceleration.");
        }
      })
      .catch(() => !disposed && setError("The arena download failed. Reload to retry."));
    return () => {
      disposed = true;
      arena.current?.dispose();
      arena.current = null;
      sound.current?.dispose();
      sound.current = null;
    };
  }, [desktop, userId]);

  // ---------------------------------------------------------------- the connection
  useEffect(() => {
    if (!userId || !desktop) return;
    let stopped = false,
      retry: ReturnType<typeof setTimeout> | undefined,
      attempt = 0,
      lastHud = 0,
      lastEvent = -1;
    const exclude: string[] = [];
    const connect = async () => {
      if (stopped) return;
      setConnection(attempt ? "Reconnecting" : "Finding a match");
      try {
        const ticket = await admission({ data: { exclude: exclude.slice(-8) } });
        if (stopped) return;
        const ws = new WebSocket(ticket.url);
        socket.current = ws;
        let welcomed = false;
        ws.onopen = () => setConnection("Connected");
        ws.onmessage = (event) => {
          if (stopped || typeof event.data !== "string" || event.data.length > 200_000) return;
          let data:
            | BombView
            | { v: 1; type: "welcome"; slot: number }
            | { v: 1; type: "ping"; id: string }
            | { v: 1; type: "equipment"; ok: boolean };
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data.type === "equipment") {
            setKitPending(false);
            setKitError(data.ok ? null : "Kits are available to living Police during freeze time.");
            return;
          }
          if (data.type === "ping") {
            ws.send(JSON.stringify({ v: 1, type: "pong", id: data.id }));
            return;
          }
          if (data.type === "welcome") {
            welcomed = true;
            attempt = 0;
            if (spectateWanted.current !== null)
              ws.send(JSON.stringify({ v: 1, type: "spectate", slot: spectateWanted.current }));
            return;
          }
          if (data.type !== "bomb-snapshot" || data.v !== 1) return;
          serverOffset.current = data.serverNow - Date.now();
          const previous = latest.current;
          latest.current = data;
          arena.current?.snapshot(data);
          present(data);
          const important =
            !previous ||
            previous.phase !== data.phase ||
            previous.round !== data.round ||
            previous.self.hp !== data.self.hp ||
            previous.self.ammo !== data.self.ammo ||
            previous.bomb.state !== data.bomb.state ||
            previous.spectating !== data.spectating;
          if (important || Date.now() - lastHud > 120) {
            lastHud = Date.now();
            setView(data);
          }
          if (data.phase === "completed" && document.pointerLockElement) document.exitPointerLock();
        };
        ws.onclose = (event) => {
          if (stopped) return;
          setKitPending(false);
          arena.current?.suspend(true);
          setLocked(false);
          if (event.code === 1008) {
            setConnection("Disconnected");
            setError(
              event.reason === "Session revoked"
                ? "Your session ended. Sign in again to play."
                : "The server closed this connection. Reload to rejoin.",
            );
            return;
          }
          // Refused before the welcome: most likely that match just filled. Ask for another.
          if (!welcomed) exclude.push(ticket.matchId);
          setConnection("Reconnecting");
          retry = setTimeout(
            () => void connect(),
            Math.min(5000, 400 * 2 ** Math.min(attempt++, 4)),
          );
        };
      } catch {
        if (stopped) return;
        setError("The Bomb Defusal server is unavailable right now. Retrying…");
        retry = setTimeout(() => void connect(), Math.min(8000, 1000 * ++attempt));
      }
    };
    /** Sounds and the kill feed for each new event (the renderer draws the visuals). */
    const present = (v: BombView) => {
      const listener = arena.current?.audioPresentation();
      const mine = myTeam(v);
      const fresh: Kill[] = [];
      for (const e of v.events) {
        if (e.id !== undefined) {
          if (e.id <= lastEvent) continue;
          lastEvent = e.id;
        }
        if (e.type === "sound") {
          const s = e as { kind: string; bearing: number; gain: number };
          // Room bearings are relative to the listener's view; the audio layer wants a world
          // bearing so the pan follows later turns.
          const bearing = listener ? -(s.bearing + listener.yaw) : undefined;
          const enemyM4 = mine === "terrorist";
          if (s.kind === "shot") sound.current?.cue("shot", { gain: s.gain, bearing, m4: enemyM4 });
          else if (s.kind === "step") sound.current?.cue("step", { gain: s.gain, bearing });
          else if (s.kind === "reload")
            sound.current?.cue("reload", { gain: s.gain, bearing, m4: enemyM4 });
          else if (s.kind === "bomb") sound.current?.cue("explosion", { gain: s.gain, bearing });
          continue;
        }
        const ev = e as Exclude<typeof e, { type: "sound" }>;
        const own = ev.slot === v.you;
        const pos = ev.audio?.position;
        let gain = 1,
          bearing: number | undefined;
        if (pos && listener && !own) {
          const dx = pos.x - listener.x,
            dz = pos.z - listener.z,
            d = Math.hypot(dx, dz),
            range = HEARING[ev.audio!.kind as keyof typeof HEARING] ?? 30;
          gain = Math.max(0, 1 - d / range);
          bearing = Math.atan2(dx, -dz);
        }
        const actor = ev.slot !== undefined ? v.players[ev.slot] : undefined;
        if (ev.type === "shot" && !own && gain > 0)
          sound.current?.cue("shot", { gain, bearing, m4: actor?.team === "police" });
        if (ev.type === "step" && gain > 0)
          sound.current?.cue("step", {
            gain: bombStepGain(gain, own, actor?.team, mine, ev.audio?.soft),
            bearing,
            own,
            ...(ev.audio?.surface ? { surface: ev.audio.surface } : {}),
          });
        if ((ev.type === "hit" || ev.type === "headshot") && ev.victim === v.you)
          sound.current?.cue("hurt");
        if (ev.type === "bomb-exploded") sound.current?.cue("explosion", { gain: 1, bearing });
        // Arming and defusing: the bomb's keypad chirps (only events this player may know).
        if (ev.type === "plant-start" || ev.type === "defuse-start")
          sound.current?.cue("beep", { gain: own ? 0.9 : Math.max(0.3, gain), bearing, own });
        // "Planting the bomb." over the Terrorist radio: the planter and his team, never the
        // Police (an enemy who sees the planter still only hears the keypad).
        if (ev.type === "plant-start" && actor?.team === "terrorist" && mine === "terrorist")
          sound.current?.cue("voice-t-planting");
        // "Defuse the bomb." over the Police radio when a Police player starts the defuse, and
        // "The bomb has been defused." announced to everyone when the room confirms it.
        if (ev.type === "defuse-start" && actor?.team === "police" && mine === "police")
          sound.current?.cue("voice-p-defuse");
        if (ev.type === "round-end" && v.lastRound)
          sound.current?.cue(
            v.lastRound.winner === "terrorist" ? "voice-terrorist-win" : "voice-police-win",
            { afterDefused: v.lastRound.reason === "defuse" },
          );
        if (ev.type === "bomb-planted") sound.current?.cue("voice-bomb-planted");
        if (ev.type === "bomb-defused") sound.current?.cue("voice-bomb-defused");
        if (ev.type === "bomb-planted" || ev.type === "bomb-defused") sound.current?.cue("kill");
        if (ev.type === "kill" && ev.victim !== undefined) {
          const victim = v.players[ev.victim];
          const killer = ev.slot !== undefined ? v.players[ev.slot] : undefined;
          if (ev.slot === v.you) sound.current?.cue("kill");
          fresh.push({
            id: ev.id ?? Math.random(),
            killer: killer?.name ?? "The bomb",
            victim: victim?.name ?? "?",
            headshot: !!ev.headshot,
            mine: ev.slot === v.you || ev.victim === v.you,
          });
        }
      }
      // Own reloads: start the sample when the reload starts.
      const prev = lastReload;
      lastReload = v.self.reloadUntil;
      if (v.self.reloadUntil && v.self.reloadUntil !== prev)
        sound.current?.cue("reload", {
          own: true,
          m4: mine === "police",
          empty: v.self.ammo === 0,
        });
      if (fresh.length) setKills((k) => [...k, ...fresh].slice(-6));
      if (v.phase === "freeze" && v.round !== lastFeedRound) {
        lastFeedRound = v.round;
        setKills([]);
      }
    };
    let lastReload = 0,
      lastFeedRound = 0;
    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      const s = socket.current;
      socket.current = null;
      if (s) {
        s.onclose = null;
        s.onmessage = null;
        s.close(1000, "Leaving");
      }
    };
  }, [userId, desktop, admission]);

  const activate = () => {
    if (!arenaReady || !latest.current) return;
    void arena.current?.lock().catch(() => {});
    void sound.current?.unlock().catch(() => {});
  };

  // ---------------------------------------------------------------- render
  if (desktop === false)
    return (
      <div className="duel-game bomb-game">
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <h1>Desktop only.</h1>
            <p>Bomb Defusal needs a mouse and keyboard.</p>
            <Link className="duel-primary" to="/fps-duel">
              Back to PvPStrike
            </Link>
          </section>
        </div>
      </div>
    );
  if (!userId)
    return (
      <div className="duel-game bomb-game">
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <h1>Sign in to play.</h1>
            <p>Practice Bomb Defusal is free, but needs your account.</p>
            <Link className="duel-primary" to="/auth">
              Sign in
            </Link>
          </section>
        </div>
      </div>
    );
  const serverNow = now + serverOffset.current;
  const showLoading = !arenaReady || !view;
  const me = view ? myPlayer(view) : null;
  const self = view?.self;
  const teams = view ? aliveByTeam(view) : null;
  const goal = view ? objective(view, serverNow) : null;
  const banner = view ? roundBanner(view) : null;
  const result = view ? matchResult(view) : null;
  const board =
    view && (tab || view.phase === "halftime" || view.phase === "completed")
      ? scoreboard(view)
      : null;
  const mineGroup = view ? myGroup(view) : "alpha";
  const watched = view?.spectating !== null && view ? view.players[view.spectating] : null;
  return (
    <div className="duel-game bomb-game" data-arena-ready={arenaReady}>
      <div className="duel-render-host" ref={host} onClick={() => !locked && activate()} />
      {showLoading && (
        <ArenaLoadingScreen
          progress={Math.min(progress.value, view ? 100 : 92)}
          label={view ? progress.label : `${progress.label} · ${connection}`}
          error={error}
          mapName="Sandgate"
          modeName="Defuse the bomb"
          image={BOMB_LOADING_IMAGE}
        />
      )}
      {!showLoading && !locked && !settingsOpen && view?.phase !== "completed" && (
        <div className="duel-capture-hint" role="status">
          Click to play
        </div>
      )}
      <header className="duel-hud-top">
        <Link to="/fps-duel" className="duel-back">
          <ArrowLeft size={17} /> Leave
        </Link>
        {view && me && teams && (
          <div className="bomb-topbar">
            <TeamBar players={teams[me.team]} side="mine" />
            <div className="bomb-score">
              <b className={`team-${me.team}`}>{view.score[mineGroup]}</b>
              <div>
                <small>
                  ROUND {Math.min(view.round, 30)} · {view.half === 1 ? "1ST" : "2ND"} HALF
                </small>
                <strong className={view.bomb.state === "planted" ? "bomb-planted" : ""}>
                  {clockText(view, serverNow)}
                </strong>
              </div>
              <b className={`team-${me.team === "police" ? "terrorist" : "police"}`}>
                {view.score[otherGroup(mineGroup)]}
              </b>
            </div>
            <TeamBar players={teams[me.team === "police" ? "terrorist" : "police"]} side="enemy" />
          </div>
        )}
        <div className="duel-hud-actions">
          <button
            aria-label={muted ? "Enable game audio" : "Mute game audio"}
            onClick={() => toggleSoundMuted()}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button
            aria-label="Fullscreen"
            onClick={() => void host.current?.parentElement?.requestFullscreen().catch(() => {})}
          >
            <Maximize size={17} />
          </button>
        </div>
      </header>
      {view && self && self.hp > 0 && view.phase !== "completed" && (
        <StrikeCrosshair settings={settings} />
      )}
      <div className="duel-hit-marker" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      {view?.phase === "freeze" &&
        view.players[view.you]?.team === "police" &&
        view.self.hp > 0 &&
        !view.self.defuseKit &&
        !showLoading && (
          <aside className="bomb-equipment" aria-label="Police equipment">
            <strong>Police equipment</strong>
            <p>Defuse kit · Free</p>
            <button
              type="button"
              onClick={chooseKit}
              disabled={kitPending || !!view.self.defuseKit}
            >
              {kitPending ? "Equipping…" : "Equip defuse kit · B"}
            </button>

            {kitError && <p role="alert">{kitError}</p>}
          </aside>
        )}
      {view && !showLoading && <BombMinimap view={view} />}
      <div className="bomb-killfeed" aria-live="polite">
        {kills.map((k) => (
          <p key={k.id} className={k.mine ? "mine" : ""}>
            <span>{k.killer}</span> {k.headshot ? "⌖" : "›"} <span>{k.victim}</span>
          </p>
        ))}
      </div>
      {goal && (
        <div className={`bomb-objective tone-${goal.tone}`} role="status">
          <span>{goal.text}</span>
          {goal.progress !== undefined && (
            <div>
              <i style={{ width: `${Math.round(goal.progress * 100)}%` }} />
            </div>
          )}
        </div>
      )}
      {banner && (
        <div className={`bomb-banner ${banner.mine ? "won" : "lost"}`} role="status">
          <strong>{banner.title}</strong>
          <span>{banner.detail}</span>
        </div>
      )}
      {view && self && self.hp <= 0 && view.phase === "live" && (
        <div className="bomb-spectate" role="status">
          {watched ? (
            <>
              <small>SPECTATING</small>
              <strong className={`team-${watched.team}`}>
                {watched.name} · {teamLabel(watched.team)}
              </strong>
            </>
          ) : (
            <>
              <small>YOUR TEAM IS DOWN</small>
              <strong>No living teammates to watch</strong>
              <span>Waiting for the round to end</span>
            </>
          )}
        </div>
      )}
      {view && me && self && (
        <footer className="duel-hud-bottom">
          <div className="duel-health">
            <small>HEALTH</small>
            {self.armor !== undefined && <small>KEVLAR {Math.ceil(self.armor)}</small>}

            <strong>
              {Math.max(0, self.hp)}
              <span>/100</span>
            </strong>
            <div>
              <i style={{ width: `${Math.max(0, self.hp)}%` }} />
            </div>
          </div>
          <div className="duel-ammo">
            <small>
              {me.team === "police" ? "M4A1-S" : "AK-47"} · {teamLabel(me.team).toUpperCase()}
              {me.carrier ? " · BOMB" : ""}
            </small>
            <div className="bomb-ammo-row">
              {self.defuseKit && me.team === "police" && (
                <span
                  className="bomb-kit-icon"
                  role="img"
                  aria-label="Defuse kit equipped: five-second defuse"
                  title="Defuse kit · 5 seconds"
                >
                  <Wrench size={18} aria-hidden />
                </span>
              )}
              <strong>
                {self.ammo}
                <span>/ {self.reserve}</span>
              </strong>
            </div>
            {self.reloadUntil ? <em>RELOADING</em> : null}
          </div>
        </footer>
      )}
      {board && view && (
        <section className="bomb-scoreboard" aria-label="Scoreboard">
          <header>
            {view.phase === "halftime" ? (
              <h2>Halftime · teams switch sides</h2>
            ) : result ? (
              <h2 className={`result-${result}`}>
                {result === "victory" ? "Victory" : result === "defeat" ? "Defeat" : "Draw · 15–15"}
              </h2>
            ) : (
              <h2>Sandgate · Bomb Defusal</h2>
            )}
            <small>
              Round {Math.min(view.round, 30)} of 30 · {view.half === 1 ? "First" : "Second"} half
              {view.firstHalf
                ? ` · First half ${view.firstHalf[mineGroup]}–${view.firstHalf[otherGroup(mineGroup)]}`
                : ""}
            </small>
          </header>
          {board.map((side) => (
            <table key={side.team} className={`team-${side.team}`}>
              <caption>
                <b>{side.score}</b> {teamLabel(side.team)}
              </caption>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>K</th>
                  <th>A</th>
                  <th>D</th>
                  <th>HS%</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {side.rows.map((r) => (
                  <tr key={r.slot} className={`${r.you ? "you" : ""}${r.alive ? "" : " dead"}`}>
                    <td>
                      {r.name}
                      {r.bot && !r.name.startsWith("BOT") ? (
                        <span className="bomb-bot-tag">BOT</span>
                      ) : null}
                      {r.carrier ? <em> · bomb</em> : null}
                    </td>
                    <td>{r.kills}</td>
                    <td>{r.assists}</td>
                    <td>{r.deaths}</td>
                    <td>{r.hsPercent}</td>
                    <td>{r.alive ? "Alive" : "Dead"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          {view.phase === "completed" && (
            <footer>
              A new match starts here in a few seconds. <Link to="/fps-duel">Back to lobby</Link>
            </footer>
          )}
        </section>
      )}
      <GameSettings
        open={settingsOpen && arenaReady && view?.phase !== "completed"}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        onResume={activate}
      />
      {error && !showLoading && (
        <p className="bomb-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TeamBar({
  players,
  side,
}: {
  players: { slot: number; alive: boolean; team: string; name: string }[];
  side: "mine" | "enemy";
}) {
  return (
    <div
      className={`bomb-teambar ${side}`}
      aria-label={`${side === "mine" ? "Your" : "Enemy"} team`}
    >
      {players.map((p) => (
        <i
          key={p.slot}
          title={p.name}
          className={`team-${p.team}${p.alive ? "" : " dead"}`}
          aria-label={`${p.name}${p.alive ? "" : " (dead)"}`}
        />
      ))}
    </div>
  );
}
