import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Maximize } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { brAdmission } from "@/lib/fps/br/br.functions";
import type { BrArenaControls, BrHud, BrView } from "@/lib/fps/br/br-arena";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
import { TacticalMap } from "./TacticalMap";
import {
  BrCentre,
  BrEnd,
  BrFeedView,
  BrGasFx,
  BrInventory,
  BrStatus,
  BrTablet,
  BrTopStatus,
  BrZone,
  useBrFeed,
} from "./BrHud";
import "./duel.css";
import "./br.css";

let arenaModule: Promise<typeof import("@/lib/fps/br/br-arena")> | undefined;
const loadArena = () =>
  (arenaModule ??= import("@/lib/fps/br/br-arena").catch((e) => {
    arenaModule = undefined;
    throw e;
  }));

/** Battle royale practice on Project Island: 100 seats (bots fill the rest), joined via the lobby. */
export function BrMatch() {
  const { userId } = useAuth();
  const admission = useServerFn(brAdmission);
  const host = useRef<HTMLDivElement>(null),
    arena = useRef<BrArenaControls | null>(null),
    socket = useRef<WebSocket | null>(null);
  const [hud, setHud] = useState<BrHud | null>(null),
    [connection, setConnection] = useState("Connecting"),
    [error, setError] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [locked, setLocked] = useState(false),
    [desktop, setDesktop] = useState<boolean | null>(null),
    [progress, setProgress] = useState({ value: 0, label: "Loading Project Island" }),
    [inventory, setInventory] = useState(false),
    [map, setMap] = useState(false),
    [tablet, setTablet] = useState(false);
  const feed = useBrFeed();
  const onFeed = useRef(feed.onFeed);
  onFeed.current = feed.onFeed;

  useEffect(() => {
    const d = matchMedia("(pointer:fine) and (hover:hover)");
    const f = () => setDesktop(d.matches);
    f();
    d.addEventListener("change", f);
    return () => d.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const f = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", f);
    return () => document.removeEventListener("pointerlockchange", f);
  }, []);

  // The island and the renderer (loaded behind the loading screen).
  useEffect(() => {
    if (!host.current || !desktop || !userId) return;
    let stopped = false;
    void loadArena()
      .then(({ createBrArena }) => {
        if (stopped || !host.current) return;
        const a = createBrArena(host.current, location.origin + "/", (value, label) =>
          setProgress({ value: Math.round(value * 100), label }),
        );
        arena.current = a;
        a.onHud(setHud);
        a.onFeed((e) => onFeed.current(e));
        a.setSender((m) => {
          if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(m);
        });
        return a.ready.then(() => !stopped && setReady(true));
      })
      .catch(() => setError("The island could not be loaded. Reload the page to try again."));
    return () => {
      stopped = true;
      arena.current?.dispose();
      arena.current = null;
    };
  }, [desktop, userId]);

  // The connection: lobby admission, then the room's socket; reconnects keep the seat (60 s).
  useEffect(() => {
    if (!userId || !desktop) return;
    let stopped = false,
      retry: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    const connect = async () => {
      if (stopped) return;
      setConnection(attempt ? "Reconnecting" : "Finding a match");
      try {
        const ticket = await admission({});
        if (stopped) return;
        const ws = new WebSocket(ticket.url);
        socket.current = ws;
        ws.onopen = () => setConnection("Connected");
        ws.onmessage = (event) => {
          if (stopped || typeof event.data !== "string" || event.data.length > 200_000) return;
          let data: BrView | { type: "welcome" } | { type: "ping"; id: string };
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data.type === "ping") {
            ws.send(JSON.stringify({ v: 1, type: "pong", id: data.id }));
            return;
          }
          if (data.type === "welcome") {
            attempt = 0;
            return;
          }
          if (data.type === "br-snapshot") arena.current?.snapshot(data);
        };
        ws.onclose = (e) => {
          if (stopped) return;
          if (e.code === 1008 && e.reason === "Session revoked") {
            setError("Your session ended. Sign in again to play.");
            return;
          }
          attempt++;
          retry = setTimeout(() => void connect(), Math.min(5000, 500 * attempt));
        };
      } catch {
        attempt++;
        setConnection("Waiting for the server");
        retry = setTimeout(() => void connect(), Math.min(10_000, 1000 * attempt));
      }
    };
    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close(1000, "Left");
      socket.current = null;
    };
  }, [userId, desktop, admission]);

  // Overlays (one at a time, owner's UI spec §14): B or I the inventory (on foot), M the
  // tactical map (any time, the plane and the parachute included), T the Tactical Tablet when
  // carried; the same key or Esc closes. Opening one frees the cursor (the gun is lowered,
  // movement goes on: the match never pauses); closing with a key takes the pointer back.
  const overlay: "inventory" | "map" | "tablet" | null = inventory
    ? "inventory"
    : map
      ? "map"
      : tablet
        ? "tablet"
        : null;
  const hasTablet = !!hud?.kit?.tablet;
  const onFoot = !!hud?.onFoot;
  useEffect(() => {
    const set = (next: typeof overlay) => {
      setInventory(next === "inventory");
      setMap(next === "map");
      setTablet(next === "tablet");
    };
    const f = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const want =
        e.code === "KeyB" || e.code === "KeyI"
          ? "inventory"
          : e.code === "KeyM"
            ? "map"
            : e.code === "KeyT"
              ? "tablet"
              : e.code === "Escape"
                ? "close"
                : null;
      if (!want) return;
      if (want === "close") {
        if (overlay) {
          e.preventDefault();
          set(null);
        }
        return;
      }
      if (want === "inventory" && !onFoot && overlay !== "inventory") return;
      if (want === "tablet" && !hasTablet && overlay !== "tablet") return;
      e.preventDefault();
      if (overlay === want) {
        set(null);
        arena.current?.relock();
      } else set(want);
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [overlay, onFoot, hasTablet]);
  // An eliminated player's inventory closes (the map stays: spectators may look).
  useEffect(() => {
    if (hud?.kit?.dead && inventory) setInventory(false);
  }, [hud?.kit?.dead, inventory]);
  useEffect(() => {
    arena.current?.setInventoryOpen(!!overlay);
  }, [overlay]);

  if (desktop === false)
    return (
      <div className="duel-game br-game">
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <h1>Desktop only.</h1>
            <p>Battle royale needs a mouse and keyboard.</p>
            <Link className="duel-primary" to="/fps-duel">
              Back to PvPStrike
            </Link>
          </section>
        </div>
      </div>
    );
  if (!userId)
    return (
      <div className="duel-game br-game">
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <h1>Sign in to play.</h1>
            <p>Battle royale practice is free, but needs your account.</p>
            <Link className="duel-primary" to="/auth">
              Sign in
            </Link>
          </section>
        </div>
      </div>
    );
  const showLoading = !ready || !hud;
  return (
    <div className="duel-game br-game" data-arena-ready={ready}>
      <div className="duel-render-host" ref={host} />
      {showLoading && (
        <ArenaLoadingScreen
          progress={Math.min(progress.value, hud ? 100 : 92)}
          label={hud ? progress.label : `${progress.label} · ${connection}`}
          error={error}
          mapName="Project Island"
          modeName="Battle royale"
        />
      )}
      {!showLoading && !locked && !overlay && !feed.out && (
        <div className="duel-capture-hint" role="status">
          Click to play
        </div>
      )}
      {hud && !showLoading && (
        <>
          <BrCentre hud={hud} hit={feed.hit} />
          <BrStatus hud={hud} />
          <BrFeedView feed={feed} />
          {hud.myPhase !== "plane" && (
            <BrZone
              hud={hud}
              map={arena.current?.mapImage() ?? null}
              waypoint={arena.current?.mapState().waypoint ?? null}
            />
          )}
          {(hud.phase === "active" || (hud.phase === "plane" && hud.myPhase !== "plane")) && (
            <BrTopStatus hud={hud} />
          )}
          <BrGasFx hud={hud} />
          <BrEnd
            hud={hud}
            out={feed.out}
            leave={
              <Link className="duel-primary" to="/fps-duel">
                Leave
              </Link>
            }
          />
        </>
      )}
      {map && arena.current && (
        <TacticalMap arena={arena.current} alive={hud?.alive ?? null} close={() => setMap(false)} />
      )}
      {tablet && hud?.kit?.tablet && (
        <BrTablet kit={hud.kit} act={(a) => arena.current?.act(a)} close={() => setTablet(false)} />
      )}
      {inventory && hud?.kit && (
        <BrInventory
          kit={hud.kit}
          nearby={hud.nearby}
          act={(a) => arena.current?.act(a)}
          close={() => setInventory(false)}
        />
      )}

      <header className="duel-hud-top">
        <Link to="/fps-duel" className="duel-back">
          <ArrowLeft size={17} /> Leave
        </Link>
        {hud && !(hud.phase === "active" || (hud.phase === "plane" && hud.myPhase !== "plane")) && (
          <div className="br-banner">{banner(hud)}</div>
        )}
        <div className="duel-hud-actions">
          <button
            aria-label="Fullscreen"
            onClick={() => void host.current?.parentElement?.requestFullscreen().catch(() => {})}
          >
            <Maximize size={17} />
          </button>
        </div>
      </header>
      {hud && hud.myPhase !== "ground" && hud.myPhase !== "swim" && hud.myPhase !== "plane" && (
        <div className="br-altimeter" aria-live="off">
          <b>{Math.round(hud.agl)} m</b>
          <small>{Math.round(hud.speedKmh)} km/h</small>
        </div>
      )}
      {hud && <div className="br-hint">{hint(hud)}</div>}
    </div>
  );
}

function banner(h: BrHud) {
  if (h.phase === "waiting") return "Waiting for players";
  if (h.phase === "starting") return `Take-off in ${Math.ceil(h.countdown ?? 0)}`;
  if (h.phase === "plane" && h.myPhase === "plane")
    return h.jumpOpen
      ? `Jump! ${Math.ceil(h.countdown ?? 0)} s left · ${h.aboard} aboard`
      : `Doors open in ${Math.ceil(h.countdown ?? 0)}`;
  if (h.phase === "plane") return `${h.aboard} still aboard`;
  if (h.phase === "ending" || h.phase === "completed") return "Match over";
  return h.alive !== null ? `${h.alive} alive` : "Battle royale";
}

function hint(h: BrHud) {
  switch (h.myPhase) {
    case "plane":
      return h.jumpOpen ? "Space: jump · mouse: look · M: map" : "Mouse: look around · M: map";
    case "freefall":
      return "WASD: glide · Ctrl: dive · Space: open the parachute (opens itself at 300 m) · M: map";
    case "parachute":
      return "W: glide · S: brake · A/D: turn · mouse: look · V: camera · M: map";
    case "ground":
      if (h.nade) return "Left mouse: throw · right mouse: underhand · 4: next grenade · 1/2: guns";
      return h.kit && h.kit.active < 0 && !h.prompt
        ? "Find a weapon · E: pick up · I: inventory"
        : "";
    case "swim":
      return "WASD: swim to shore";
    default:
      return "";
  }
}
