import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Crosshair, Volume2, VolumeX, Maximize, Copy, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { duelAdmission, duelAction } from "@/lib/fps/duel.functions";
import { fetchDuelView, duelError } from "@/lib/fps/api";
import { duelMoney, duelQuote, type DuelView } from "@/lib/fps/quote";
import { supabase } from "@/integrations/supabase/client";
import type { Input, Seat } from "@/lib/fps/protocol";
import type { ArenaControls, ArenaFrame } from "@/lib/fps/renderer";
import "./duel.css";

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
    refetchInterval: 3000,
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
    [renderError, setRenderError] = useState<string | null>(null),
    [muted, setMuted] = useState(false),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [ready, setReady] = useState(false),
    [seat, setSeat] = useState<Seat | null>(null);
  const [desktop, setDesktop] = useState(true),
    [accepted, setAccepted] = useState(false),
    [copied, setCopied] = useState(false);
  const currentFrame = useRef<ArenaFrame | null>(null),
    sound = useRef<AudioContext | null>(null),
    muteRef = useRef(false),
    lastSound = useRef(0);
  const requestKey = useRef<string | null>(null);
  const serverOffset = useRef(0);
  const settledMatch = useRef<string | null>(null);
  const match = view.data;
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
  useEffect(() => {
    const d = matchMedia("(pointer:fine) and (hover:hover)");
    setDesktop(d.matches);
    const f = () => setDesktop(d.matches);
    d.addEventListener("change", f);
    return () => d.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    muteRef.current = muted;
  }, [muted]);
  useEffect(
    () => () => {
      void sound.current?.close();
    },
    [],
  );

  useEffect(() => {
    if (!host.current || !desktop) return;
    let disposed = false;
    void import("@/lib/fps/renderer").then(({ mountArena }) => {
      if (disposed || !host.current) return;
      try {
        arena.current = mountArena(
          host.current,
          (input: Input) => {
            if (socket.current?.readyState === WebSocket.OPEN)
              socket.current.send(JSON.stringify(input));
          },
          setLocked,
        );
        if (currentFrame.current) arena.current.snapshot(currentFrame.current, seatRef.current);
      } catch {
        setRenderError(
          "This browser could not start WebGL. Try a desktop browser with hardware acceleration.",
        );
      }
    });
    return () => {
      disposed = true;
      arena.current?.dispose();
      arena.current = null;
    };
  }, [desktop, matchId]);

  useEffect(() => {
    if (!playable || !userId || !desktop) return;
    let stopped = false,
      retry: ReturnType<typeof setTimeout> | undefined,
      attempt = 0;
    let lastHud = 0;
    const connect = async () => {
      if (stopped) return;
      setConnection(attempt ? "Reconnecting" : "Connecting");
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
            };
            if (data.v !== 1) return;
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
            setConnection("Connected");
            serverOffset.current = data.serverNow - Date.now();
            currentFrame.current = data;
            arena.current?.snapshot(data, seatRef.current);
            if (
              Date.now() - lastHud > 90 ||
              ["completed", "cancelled"].includes(data.state.phase)
            ) {
              lastHud = Date.now();
              setFrame(data);
            }
            const own = seatRef.current;
            if (
              own &&
              data.state.tick !== lastSound.current &&
              data.state.events.some(
                (e) => e.seat === own && ["shot", "hit", "headshot", "impact"].includes(e.type),
              )
            ) {
              lastSound.current = data.state.tick;
              if (!muteRef.current && sound.current?.state === "running") {
                const hit = data.state.events.some(
                    (e) => e.seat === own && ["hit", "headshot"].includes(e.type),
                  ),
                  impact = data.state.events.find(
                    (e) => e.seat === own && e.type === "impact",
                  )?.impact,
                  osc = sound.current.createOscillator(),
                  gain = sound.current.createGain();
                osc.type = hit ? "sine" : impact?.surface === "metal" ? "square" : "triangle";
                osc.frequency.setValueAtTime(
                  hit
                    ? 850
                    : impact?.surface === "metal"
                      ? 520
                      : impact?.surface === "wood"
                        ? 200
                        : 130,
                  sound.current.currentTime,
                );
                gain.gain.setValueAtTime(
                  hit ? 0.06 : impact?.surface === "metal" ? 0.02 : 0.04,
                  sound.current.currentTime,
                );
                gain.gain.exponentialRampToValueAtTime(0.001, sound.current.currentTime + 0.08);
                osc.connect(gain);
                gain.connect(sound.current.destination);
                osc.start();
                osc.stop(sound.current.currentTime + 0.09);
              }
            }
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
          if (document.pointerLockElement) document.exitPointerLock();
          if (event.code === 4001) {
            setConnection("Opened in another tab");
            setError(
              "This seat is active in another connection. Close that tab before reconnecting.",
            );
            return;
          }
          if (event.code === 1008 || event.code === 1009) {
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

  const activate = async () => {
    try {
      if (!sound.current) sound.current = new AudioContext();
      await sound.current.resume();
      await arena.current?.lock();
      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ v: 1, type: "ready" }));
        setReady(true);
      }
    } catch {
      setError("Click the arena to allow mouse capture. Press Esc to release it.");
    }
  };
  const perform = async (kind: "cancel" | "join" | "rematch") => {
    setBusy(true);
    setError(null);
    requestKey.current ??= crypto.randomUUID();
    try {
      const r = (await action({
        data:
          kind === "cancel"
            ? { action: kind, matchId }
            : kind === "join"
              ? { action: kind, matchId, key: requestKey.current, ...(invite ? { invite } : {}) }
              : { action: kind, matchId, key: requestKey.current },
      })) as { match_id?: string; id?: string };
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
  const seconds = frame
    ? Math.max(0, Math.ceil((frame.state.phaseEndsAt - now - serverOffset.current) / 1000))
    : 0;
  return (
    <div className="duel-game">
      <div className="duel-render-host" ref={host} />
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
                : "FPS DUEL"}
            </strong>
          </div>
          <span className={seat === "B" ? "you" : ""}>
            <b>{frame?.state.score.B ?? match?.score_b ?? 0}</b> B
          </span>
        </div>
        <div className="duel-hud-actions">
          <span className={connection === "Connected" ? "duel-connected" : ""}>{connection}</span>
          <button
            aria-label={muted ? "Enable game audio" : "Mute game audio"}
            onClick={() => setMuted((v) => !v)}
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
      <div className="duel-crosshair" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
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
          .filter((e) => e.type !== "shot" && e.type !== "impact")
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
          <span>Sprint</span> · SPACE <span>Jump</span> · CTRL <span>Crouch</span> · ESC{" "}
          <span>Release mouse</span>
        </div>
        <div className="duel-ammo">
          <small>{me?.weapon === "pistol" ? "SIDEARM" : "AK-47 · PVP EDITION"}</small>
          <strong>
            {me?.ammo ?? 30}
            <span>/ {me?.reserve ?? 90}</span>
          </strong>
          {me?.reloadUntil ? <em>RELOADING</em> : null}
        </div>
      </footer>
      {((!spectate && !locked) || phase !== "live" || renderError || !desktop || terminal) && (
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <span className="duel-eyebrow">THE FOUNDRY / PVP ORIGINALS</span>
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
                    ? "Result recorded. Your wallet reflects the server's settlement."
                    : "Settlement pending. The server is retrying safely; no client payout is required."}
                </p>
                <button
                  className="duel-primary"
                  disabled={
                    busy ||
                    spectate ||
                    !(frame?.settled || ["COMPLETED", "CANCELLED"].includes(match?.status ?? ""))
                  }
                  onClick={() => {
                    if (
                      window.confirm(
                        `Request/accept a fresh rematch: ${duelMoney(match?.stake ?? 0)} entry, best of ${match?.best_of ?? 5}?`,
                      )
                    )
                      void perform("rematch");
                  }}
                >
                  Accept fresh rematch
                </button>
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
            ) : (
              <>
                <Crosshair size={32} />
                <h1>
                  {phase === "countdown"
                    ? `Round starts in ${seconds}`
                    : phase === "round-end"
                      ? "Reset. Read the next angle."
                      : active
                        ? "Back into the duel."
                        : "Both players. Ready up."}
                </h1>
                <p>
                  {spectate
                    ? "Read-only view · delayed 5 seconds"
                    : phase === "waiting"
                      ? ready
                        ? "Ready. Waiting for your opponent."
                        : "Click to capture your mouse and confirm readiness."
                      : "Your match keeps running while the mouse is released. Reconnect within 30 seconds if disconnected."}
                </p>
                {!spectate && (
                  <button
                    className="duel-primary"
                    onClick={() => void activate()}
                    disabled={connection !== "Connected"}
                  >
                    {active ? "Resume aiming" : "Ready & enter arena"}
                  </button>
                )}
              </>
            )}
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
