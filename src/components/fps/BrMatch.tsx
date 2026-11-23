import { openMatchSocket, PAGE_ID } from "@/lib/fps/match-socket";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { brAdmission } from "@/lib/fps/br/br.functions";
import { BR_RULESET_VERSION } from "@/lib/fps/br/ruleset";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
import type { BrArenaControls, BrGraphics, BrHud, BrView } from "@/lib/fps/br/br-arena";
import { BrGraphicsNotice } from "./BrGraphicsNotice";
import { ArenaLoadingScreen } from "./ArenaLoadingScreen";
import { GameSettings } from "./GameSettings";
import { BrKeyBindings, BrSettingsGeneral } from "./BrSettings";
import { LeaveConfirm } from "./LeaveConfirm";
import {
  DEFAULT_STRIKE_SETTINGS,
  readStrikeSettings,
  saveStrikeSettings,
} from "@/lib/fps/settings";
import {
  DEFAULT_BR_SETTINGS,
  VIEW_RANGE,
  keyLabel,
  readBrSettings,
  saveBrSettings,
  type BrAction,
  type BrBinds,
} from "@/lib/fps/br/br-settings";
import { detectBrTier } from "@/lib/fps/br/quality-tier";
import { BR_LOADING_IMAGE, warmBrLoadingImage } from "@/lib/fps/br/loading";
import { TacticalMap } from "./TacticalMap";
import {
  BrCanopyGauges,
  BrFlight,
  BrAirdropAlert,
  BrCentre,
  BrEnd,
  BrFeedView,
  BrGasFx,
  BrInventory,
  BrLobbyCard,
  BrStatus,
  BrTablet,
  BrTopStatus,
  BrZone,
  useBrFeed,
} from "./BrHud";
import { reloadIfStale } from "@/lib/build-freshness";
import "./duel.css";
import "./br.css";

let arenaModule: Promise<typeof import("@/lib/fps/br/br-arena")> | undefined;
const loadArena = () =>
  (arenaModule ??= import("@/lib/fps/br/br-arena").catch(async (e) => {
    arenaModule = undefined;
    // (The chunk of a build that is no longer deployed: the page reloads into the new one.)
    if (await reloadIfStale()) await new Promise<never>(() => {});
    throw e;
  }));

/** Battle royale practice on Project Island: 100 seats (bots fill the rest), joined via the lobby. */
export function BrMatch() {
  const { userId } = useAuth();
  const admission = useServerFn(brAdmission);
  const host = useRef<HTMLDivElement>(null),
    arena = useRef<BrArenaControls | null>(null),
    socket = useRef<WebSocket | null>(null),
    startupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const presented = useRef(false),
    failed = useRef(false);
  const [hud, setHud] = useState<BrHud | null>(null),
    [connection, setConnection] = useState("Connecting"),
    [error, setError] = useState<string | null>(null),
    [startupError, setStartupError] = useState<string | null>(null),
    /** Set when the server refused every connection: the loading screen's "Try again". */
    [retry, setRetry] = useState<(() => void) | null>(null),
    [retryLabel, setRetryLabel] = useState<string | undefined>(undefined),
    [ready, setReady] = useState(false),
    [graphics, setGraphics] = useState<BrGraphics | null>(null),
    [locked, setLocked] = useState(false),
    [desktop, setDesktop] = useState<boolean | null>(null),
    [progress, setProgress] = useState({ value: 0, label: "Loading Project Island" }),
    [inventory, setInventory] = useState(false),
    [map, setMap] = useState(false),
    [tablet, setTablet] = useState(false),
    // Settings (Escape): sensitivity, volume, view distance and key bindings, saved per device.
    [settingsOpen, setSettingsOpen] = useState(false),
    [confirmLeave, setConfirmLeave] = useState(false),
    [settings, setSettings] = useState(DEFAULT_STRIKE_SETTINGS),
    [brSettings, setBrSettings] = useState(DEFAULT_BR_SETTINGS),
    [lowNotice, setLowNotice] = useState(false);
  const feed = useBrFeed();
  const scenePresented = ready && hud !== null;
  useEffect(() => {
    arena.current?.setScenePresented(scenePresented);
  }, [scenePresented]);
  useEffect(() => {
    warmBrLoadingImage();
    setSettings(readStrikeSettings());
    // An old machine (quality-tier.ts) starts at the shortest view distance unless one is saved.
    const tier = detectBrTier();
    setBrSettings(readBrSettings(tier.tier !== "standard" ? VIEW_RANGE.min : undefined));
    // Chosen automatically: say so once, or the coarse picture looks like a fault.
    if (tier.tier === "low") {
      setLowNotice(true);
      const t = setTimeout(() => setLowNotice(false), 20_000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);
  useEffect(() => {
    const a = arena.current;
    if (!a) return;
    // The 1v1/5v5 sensitivity multiplier on the battle royale's base turn rate.
    a.setSensitivity(0.0022 * settings.sensitivity);
    a.setVolume(settings.volume);
    a.setBinds(brSettings.binds);
    a.setViewDistance(brSettings.view);
  }, [settings, brSettings, ready]);
  useEffect(() => saveStrikeSettings(settings), [settings]);
  useEffect(() => saveBrSettings(brSettings), [brSettings]);
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
    setReady(false);
    setHud(null);
    setError(null);
    setGraphics(null);
    setProgress({ value: 0, label: "Loading Project Island" });
    void loadArena()
      .then(({ createBrArena }) => {
        if (stopped || !host.current) return;
        const a = createBrArena(host.current, location.origin + "/", (value, label) => {
          if (!stopped && !failed.current)
            setProgress((previous) => ({
              value: Math.max(previous.value, Math.round(value * 100)),
              label,
            }));
        });
        arena.current = a;
        a.onHud((value) => {
          if (stopped || failed.current) return;
          presented.current = true;
          clearTimeout(startupTimer.current);
          setStartupError(null);
          setHud(value);
        });
        a.onFeed((e) => onFeed.current(e));
        a.onGraphics((g) => {
          if (!stopped) setGraphics(g);
        });
        // E on a supply crate opens the inventory, which lists what is in the crate.
        a.onOpenCrate(() => {
          if (stopped) return;
          setMap(false);
          setTablet(false);
          setInventory(true);
        });
        a.setSender((m) => {
          if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(m);
        });
        return a.ready.then(() => {
          if (!stopped && !failed.current) setReady(true);
        });
      })
      .catch(() => {
        if (!stopped) {
          failed.current = true;
          setError("The island assets are unavailable. Please return to the lobby.");
        }
      });
    return () => {
      stopped = true;
      arena.current?.dispose();
      arena.current = null;
    };
  }, [desktop, userId]);

  // The connection: lobby admission, then the room's socket; reconnects keep the seat (60 s).
  useEffect(() => {
    // The first snapshot includes the route, loot and door baselines only once per
    // connection. Do not admit a seat until their renderer exists and can consume them.
    if (!userId || !desktop || !ready || !arena.current) return;
    let left = false,
      receivedSnapshot = false,
      /**
       * The next connection takes the seat from another page of the account: this page's
       * first (a newly opened tab or a reload wins, as before) and "Play here". The page that
       * loses it stops (`replaced`), and a client without a page name can never take it
       * (workers/fps/seat-claim.ts), so nothing takes it back on its own.
       */
      takeover = true;
    const watchStartup = () => {
      if (left || presented.current || failed.current) return;
      setStartupError(
        receivedSnapshot ? "Preparing the first frame…" : "Restoring match connection…",
      );
      // Keep the prepared island. A fresh connection resends the one-time route,
      // kit, door and loot baselines instead of abandoning a recoverable first frame.
      if (!receivedSnapshot) socket.current?.close(1000, "Retry startup");
      startupTimer.current = setTimeout(watchStartup, 30_000);
    };
    startupTimer.current = setTimeout(watchStartup, 30_000);
    /** A close or a frame after which this page cannot play on: said once, no reconnect. */
    const fail = (message: string) => {
      failed.current = true;
      setError(message);
      return null;
    };
    const link = openMatchSocket({
      ref: socket,
      connecting: (attempt) => setConnection(attempt ? "Reconnecting" : "Finding a match"),
      async admit() {
        // A page from before a deploy cannot join the new match servers (its admission call
        // no longer exists there): reload into the deployed build instead of retrying forever.
        if (await reloadIfStale()) return new Promise<never>(() => {});
        let deadline: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            admission({}),
            new Promise<never>((_, reject) => {
              deadline = setTimeout(() => reject(new Error("Admission timed out")), 15_000);
            }),
          ]);
        } finally {
          clearTimeout(deadline);
        }
      },
      address(ticket) {
        const url = new URL(ticket.url);
        url.searchParams.set("worldRevision", WORLD_ASSETS.revision);
        url.searchParams.set("rulesVersion", String(BR_RULESET_VERSION));
        // This page's name, and "Play here" (workers/fps/seat-claim.ts): another page of the
        // account that plays the seat keeps it unless the player takes it over here.
        url.searchParams.set("page", PAGE_ID);
        if (takeover) url.searchParams.set("takeover", "1");
        return url;
      },
      created: () => void (receivedSnapshot = false),
      opened: () => {
        takeover = false;
        setConnection("Connected");
      },
      maxFrame: 200_000,
      oversize(link) {
        link.stop();
        fail("The match sent an unsupported update. Please return to the lobby.");
        link.ws.close(1009, "Snapshot too large");
      },
      frame(raw, link) {
        const data = raw as
          | BrView
          | { type: "welcome"; worldRevision?: string; rulesVersion?: number }
          | { type: "br-fast"; combat?: NonNullable<BrView["combat"]> };
        if (data.type === "welcome") {
          if (
            data.worldRevision !== WORLD_ASSETS.revision ||
            data.rulesVersion !== BR_RULESET_VERSION
          ) {
            link.stop();
            fail("The game server is updating. Reload the page in a moment.");
            link.ws.close(4409, "Game version mismatch");
            return;
          }
          link.settled();
          return;
        }
        if (data.type === "br-fast") {
          if (receivedSnapshot && Array.isArray(data.combat)) arena.current?.fast(data.combat);
          return;
        }
        if (data.type === "br-snapshot") {
          arena.current?.snapshot(data);
          receivedSnapshot = true;
        }
      },
      closed(e, attempt) {
        if (e.code === 4409) return fail("The game was updated. Reload the page to continue.");
        if (e.code === 1008 && e.reason === "BR sign-in required")
          return fail("Sign in to play Battle Royale.");
        if (e.code === 1008 && e.reason === "Session revoked")
          return fail("Your session ended. Sign in again to play.");
        return Math.min(5000, 500 * (attempt + 1));
      },
      admitFailed(error, attempt) {
        if (error instanceof Error && error.message.includes("BR_SIGN_IN_REQUIRED"))
          return fail("Sign in to play Battle Royale.");
        setConnection("Waiting for the server");
        return Math.min(10_000, 1000 * attempt);
      },
      replaced(again) {
        // Open on this account somewhere else, which has the seat now: this page stops instead
        // of taking it back every few seconds (match-socket.ts REPLACED_CLOSE).
        failed.current = true;
        if (document.pointerLockElement) document.exitPointerLock();
        setConnection("Opened in another tab");
        setError(
          "Battle Royale is open on this account in another tab or window. Close it there, or play here instead.",
        );
        setRetryLabel("Play here");
        setRetry(() => () => {
          failed.current = false;
          setError(null);
          setRetry(null);
          setRetryLabel(undefined);
          takeover = true;
          again();
        });
      },
      unreachable(again) {
        failed.current = true;
        setRetryLabel(undefined);
        setConnection("Server unreachable");
        setError("The Battle Royale server is temporarily unavailable. Try again in a moment.");
        setRetry(() => () => {
          failed.current = false;
          setError(null);
          setRetry(null);
          again();
        });
      },
    });
    return () => {
      left = true;
      clearTimeout(startupTimer.current);
      link.close("Left");
    };
  }, [userId, desktop, ready, admission]);

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
  // The tablet's first pickup (owner, 2026-11-11: "picked up the tablet but did not understand
  // how to use it"): a callout over the hotbar until it has been opened once, or for 15 s.
  const [tabletCoach, setTabletCoach] = useState(false);
  const tabletOpened = useRef(false);
  const hadTablet = useRef(false);
  useEffect(() => {
    if (hasTablet && !hadTablet.current && !tabletOpened.current) setTabletCoach(true);
    hadTablet.current = hasTablet;
  }, [hasTablet]);
  // A tablet used up by its third perk (owner, 2026-11-14) closes itself, back to the game.
  useEffect(() => {
    if (tablet && hud?.kit && !hasTablet) {
      setTablet(false);
      arena.current?.relock();
    }
  }, [tablet, hasTablet, hud?.kit]);
  useEffect(() => {
    if (tablet) {
      tabletOpened.current = true;
      setTabletCoach(false);
    }
  }, [tablet]);
  useEffect(() => {
    if (!tabletCoach) return;
    const t = setTimeout(() => setTabletCoach(false), 15_000);
    return () => clearTimeout(t);
  }, [tabletCoach]);
  const onFoot = !!hud?.onFoot;
  useEffect(() => {
    const set = (next: typeof overlay) => {
      setInventory(next === "inventory");
      setMap(next === "map");
      setTablet(next === "tablet");
    };
    const b = brSettings.binds;
    const taken = new Set(Object.values(b));
    const f = (e: KeyboardEvent) => {
      if (e.repeat || settingsOpen || confirmLeave) return;
      const want =
        e.code === b.inventory || (e.code === "KeyI" && !taken.has("KeyI"))
          ? "inventory"
          : e.code === b.map
            ? "map"
            : e.code === b.tablet
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
  }, [overlay, onFoot, hasTablet, brSettings.binds, settingsOpen, confirmLeave]);
  // Escape releases the mouse (the browser's rule); with no screen open, the settings open.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const wasLocked = useRef(false);
  useEffect(() => {
    if (wasLocked.current && !locked && !overlayRef.current && ready && !feed.out)
      setSettingsOpen(true);
    if (locked) setSettingsOpen(false);
    wasLocked.current = locked;
  }, [locked, ready, feed.out]);
  // An eliminated player's inventory closes (the map stays: spectators may look).
  useEffect(() => {
    if (hud?.kit?.dead && inventory) setInventory(false);
  }, [hud?.kit?.dead, inventory]);
  useEffect(() => {
    arena.current?.setInventoryOpen(!!overlay || settingsOpen || confirmLeave);
  }, [overlay, settingsOpen, confirmLeave]);
  const requestLeave = () => {
    setSettingsOpen(false);
    setConfirmLeave(true);
  };

  if (desktop === false)
    return (
      <div className="duel-game br-game">
        <div className="duel-game-overlay">
          <section className="duel-match-card">
            <h1>Desktop only.</h1>
            <p>Battle royale needs a mouse and keyboard.</p>
            <Link className="duel-primary" to="/">
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
  const showLoading = !!error || !ready || !hud;
  return (
    <div className="duel-game br-game" data-arena-ready={ready}>
      <div className="duel-render-host" ref={host} />
      {showLoading && (
        <ArenaLoadingScreen
          progress={Math.min(progress.value, 99)}
          label={ready ? connection : progress.label}
          error={error ?? startupError}
          onRetry={error && retry ? retry : undefined}
          retryLabel={retryLabel}
          mapName="Project Island"
          modeName="Battle royale"
          image={BR_LOADING_IMAGE}
        />
      )}
      {!error && <BrGraphicsNotice graphics={graphics} />}
      {!showLoading && !locked && !overlay && !feed.out && (
        <div className="duel-capture-hint" role="status">
          Click to play
        </div>
      )}
      {hud && !showLoading && (
        <>
          <BrLobbyCard hud={hud} connection={connection} />
          <BrCentre hud={hud} hit={feed.hit} />
          <BrAirdropAlert hud={hud} />
          <BrStatus hud={hud} tabletKey={keyLabel(brSettings.binds.tablet)} />
          {tabletCoach && hasTablet && !tablet && (
            <div className="br-tablet-coach" role="status">
              <kbd>{keyLabel(brSettings.binds.tablet)}</kbd>
              <span>
                <b>Tactical Tablet</b> Press {keyLabel(brSettings.binds.tablet)} to open it and
                choose your perks
              </span>
            </div>
          )}
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
          <BrCanopyGauges hud={hud} />
          <BrFlight hud={hud} />
          <BrEnd
            hud={hud}
            out={feed.out}
            leave={
              hud.result ? (
                <Link to="/" className="duel-primary">
                  Back to lobby
                </Link>
              ) : (
                <button type="button" className="duel-primary" onClick={requestLeave}>
                  Leave match
                </button>
              )
            }
          />
        </>
      )}
      <GameSettings
        mode="Battle Royale"
        open={settingsOpen && ready}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        onResume={() => {
          setSettingsOpen(false);
          arena.current?.relock();
        }}
        general={<BrSettingsGeneral value={brSettings} onChange={setBrSettings} />}
        extra={<BrKeyBindings value={brSettings} onChange={setBrSettings} />}
        leaveAction={
          <button type="button" className="duel-secondary" onClick={requestLeave}>
            Leave match
          </button>
        }
      />
      {map && arena.current && (
        <TacticalMap
          arena={arena.current}
          alive={hud?.alive ?? null}
          close={() => {
            setMap(false);
            arena.current?.relock();
          }}
        />
      )}
      {tablet && hud?.kit?.tablet && (
        <BrTablet
          kit={hud.kit}
          act={(a) => arena.current?.act(a)}
          close={() => {
            setTablet(false);
            arena.current?.relock();
          }}
        />
      )}
      {inventory && hud?.kit && (
        <div
          className="br-inventory-layer"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <BrInventory
            kit={hud.kit}
            nearby={hud.nearby}
            act={(a) => arena.current?.act(a)}
            close={() => {
              setInventory(false);
              arena.current?.relock();
            }}
            figure={arena.current?.operatorFigure() ?? null}
            tabletKey={keyLabel(brSettings.binds.tablet)}
            {...(hud.kit.tablet
              ? {
                  openTablet: () => {
                    setInventory(false);
                    setTablet(true);
                  },
                }
              : {})}
          />
        </div>
      )}
      {confirmLeave && (
        <LeaveConfirm
          title="Leave this match?"
          detail="You go back to the PvPStrike lobby."
          stayLabel="Stay in match"
          leaveLabel="Leave match"
          onStay={() => setConfirmLeave(false)}
        />
      )}

      <header className="duel-hud-top">
        {/* Leave is in the Escape menu (owner, 2026-11-05). */}
        <span />
        {hud &&
          hud.phase !== "waiting" &&
          hud.phase !== "starting" &&
          !(hud.phase === "active" || (hud.phase === "plane" && hud.myPhase !== "plane")) && (
            <div className="br-banner">{banner(hud)}</div>
          )}
      </header>
      {hud &&
        hud.myPhase !== "ground" &&
        hud.myPhase !== "swim" &&
        hud.myPhase !== "plane" &&
        hud.myPhase !== "ladder" &&
        hud.myPhase !== "rappel" && (
          <div className="br-altimeter" aria-live="off">
            <b>{Math.round(hud.agl)} m</b>
            <small>{Math.round(hud.speedKmh)} km/h</small>
          </div>
        )}
      {hud && <div className="br-hint">{hint(hud, brSettings.binds)}</div>}
      {hud && lowNotice && (
        <div className="br-low-notice" role="status">
          Performance graphics are on for this computer (chosen automatically). Esc → Settings shows
          which graphics the browser is using.
        </div>
      )}
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

function hint(h: BrHud, b: BrBinds) {
  const k = (a: BrAction) => keyLabel(b[a]);
  switch (h.myPhase) {
    case "plane":
      return h.jumpOpen
        ? `${k("jump")}: jump (the parachute opens at once) · mouse: look · ${k("map")}: map`
        : `Mouse: look around · ${k("map")}: map`;
    case "freefall":
      return `${k("forward")}: glide · ${k("dive")}: dive · ${k("map")}: map`;
    case "parachute":
      return `Mouse: steer · hold right mouse: look around · ${k("forward")}: glide · ${k("back")}: brake · ${k("dive")}: dive · ${k("camera")}: camera`;
    case "ground":
      if (h.nade)
        return `Left mouse: throw · right mouse: underhand · ${k("grenade")}: next grenade · ${k("primary")}/${k("secondary")}: guns`;
      return !h.flight && h.kit && h.kit.active < 0 && !h.prompt
        ? `Find a weapon · ${k("interact")}: pick up · ${k("inventory")}: inventory`
        : "";
    case "swim":
      return `${k("forward")}${k("left")}${k("back")}${k("right")}: swim to shore`;
    case "ladder":
      return h.onRope
        ? `${k("forward")}: climb up · ${k("back")}: climb down · ${k("interact")}: let go (steps off at either end) · mouse: camera`
        : `${k("forward")}: climb up · ${k("back")}: climb down · ${k("jump")}: let go`;
    case "rappel":
      return `The rope takes you down · ${k("back")}: climb back up · ${k("left")}/${k("right")}: along the wall · ${k("interact")}: let go near the ground · mouse: camera`;
    case "lift":
      return "The doors are shut: the lift takes you to your floor";
    case "zip":
      return `Mouse: look around · the line takes you to ${h.zipLine === 1 ? "the Iron Peaks watchtower" : "Pine Ridge"}`;
    default:
      return "";
  }
}
