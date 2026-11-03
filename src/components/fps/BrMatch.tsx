import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Maximize } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { brAdmission } from "@/lib/fps/br/br.functions";
import type { BrArenaControls, BrHud, BrView } from "@/lib/fps/br/br-arena";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
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
    [progress, setProgress] = useState({ value: 0, label: "Loading Project Island" });

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
      {!showLoading && !locked && (
        <div className="duel-capture-hint" role="status">
          Click to play
        </div>
      )}
      <header className="duel-hud-top">
        <Link to="/fps-duel" className="duel-back">
          <ArrowLeft size={17} /> Leave
        </Link>
        {hud && <div className="br-banner">{banner(hud)}</div>}
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
  return "Battle royale";
}

function hint(h: BrHud) {
  switch (h.myPhase) {
    case "plane":
      return h.jumpOpen ? "Space: jump · mouse: look" : "Mouse: look around";
    case "freefall":
      return "WASD: glide · Ctrl: dive · Space: open parachute (opens itself at 300 m)";
    case "parachute":
      return "WASD: steer";
    case "swim":
      return "WASD: swim to shore";
    default:
      return "";
  }
}
