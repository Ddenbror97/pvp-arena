import { useEffect, useRef, useState } from "react";
import type { BrArenaControls, BrMapState } from "@/lib/fps/br/br-arena";
import { gridRefAt, MAP_SIZE, mapToWorld, worldToMap } from "@/lib/fps/br/tactical-map";

/**
 * The full-screen tactical map (M; owner's BR spec §5). The island's picture is built once from
 * the game's own world data (tactical-map.ts); everything live — the gas, the current and next
 * circles, you, the waypoint, the plane's path, supply drops — is drawn on one canvas every
 * animation frame from the arena's state (no React re-render per frame). The zone drawn here is
 * the same server state the gas uses, interpolated on the server clock.
 *
 * Mouse: wheel to zoom at the cursor, drag to pan, click to set a waypoint, right-click to clear
 * it. Keys: R recentres on you, F fits the whole island, M or Esc closes (BrMatch).
 */
const ZOOM_MAX = 12;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TacticalMap({
  arena,
  alive,
  close,
}: {
  arena: BrArenaControls;
  alive: number | null;
  close: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  // The side panel's figures (a few times a second is plenty for text).
  const [info, setInfo] = useState<{
    phase: string;
    timer: string;
    status: string;
    grid: string;
    toSafe: number | null;
    waypoint: number | null;
  } | null>(null);

  useEffect(() => {
    const el = canvas.current,
      box = host.current;
    if (!el || !box) return;
    const base = arena.tacticalMap();
    const g = el.getContext("2d")!;
    // View: map pixel at the viewport's centre, and screen pixels per map pixel.
    let size = 0,
      fit = 1,
      zoom = 1,
      cx = MAP_SIZE / 2,
      cy = MAP_SIZE / 2;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => {
      size = Math.floor(Math.min(box.clientWidth, box.clientHeight));
      el.width = el.height = Math.floor(size * dpr);
      el.style.width = el.style.height = `${size}px`;
      fit = size / MAP_SIZE;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const scale = () => fit * zoom;
    const clamp = () => {
      const half = size / 2 / scale();
      const lo = Math.min(half, MAP_SIZE / 2),
        hi = Math.max(MAP_SIZE - half, MAP_SIZE / 2);
      cx = Math.min(hi, Math.max(lo, cx));
      cy = Math.min(hi, Math.max(lo, cy));
    };
    const toScreen = (px: number, py: number): [number, number] => [
      (px - cx) * scale() + size / 2,
      (py - cy) * scale() + size / 2,
    ];
    const toMap = (sx: number, sy: number): [number, number] => [
      (sx - size / 2) / scale() + cx,
      (sy - size / 2) / scale() + cy,
    ];
    const recenter = () => {
      const s = arena.mapState();
      [cx, cy] = worldToMap(s.me.x, s.me.z);
      zoom = Math.max(zoom, 3);
      clamp();
    };

    // ---------------------------------------------------------------- input
    let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
    const local = (e: MouseEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [sx, sy] = local(e);
      const [mx, my] = toMap(sx, sy);
      zoom = Math.min(ZOOM_MAX, Math.max(1, zoom * Math.exp(-e.deltaY * 0.0015)));
      // Keep the point under the cursor where it is.
      cx = mx - (sx - size / 2) / scale();
      cy = my - (sy - size / 2) / scale();
      clamp();
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, cx, cy, moved: false };
    };
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      cx = drag.cx - dx / scale();
      cy = drag.cy - dy / scale();
      clamp();
    };
    const onUp = (e: MouseEvent) => {
      if (drag && !drag.moved && e.button === 0) {
        const [mx, my] = toMap(...local(e));
        if (mx >= 0 && my >= 0 && mx <= MAP_SIZE && my <= MAP_SIZE)
          arena.setWaypoint(mapToWorld(mx, my));
      }
      drag = null;
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      arena.setWaypoint(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") recenter();
      if (e.code === "KeyF") {
        zoom = 1;
        cx = cy = MAP_SIZE / 2;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    addEventListener("mousemove", onMove);
    addEventListener("mouseup", onUp);
    el.addEventListener("contextmenu", onContext);
    addEventListener("keydown", onKey);

    // ---------------------------------------------------------------- drawing
    let raf = 0,
      lastInfo = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const s: BrMapState = arena.mapState();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#0b0f12";
      g.fillRect(0, 0, size, size);
      const k = scale();
      const [ox, oy] = toScreen(0, 0);
      if (base) {
        g.imageSmoothingEnabled = zoom < 4;
        g.drawImage(base, ox, oy, MAP_SIZE * k, MAP_SIZE * k);
      }
      const W = (x: number, z: number) => toScreen(...worldToMap(x, z));
      const M = (m: number) => (m / 10_000) * MAP_SIZE * k; // metres → screen px
      // The plane's path (while it flies).
      if (s.plane) {
        g.strokeStyle = "rgba(255,255,255,0.55)";
        g.lineWidth = 1.5;
        g.setLineDash([8, 6]);
        g.beginPath();
        g.moveTo(...W(s.plane.a[0], s.plane.a[1]));
        g.lineTo(...W(s.plane.b[0], s.plane.b[1]));
        g.stroke();
        g.setLineDash([]);
      }
      // Gas: everything outside the current circle, the terrain still visible beneath.
      const z = s.zone;
      if (z) {
        const [zx, zy] = W(z.x, z.z);
        g.beginPath();
        g.rect(ox, oy, MAP_SIZE * k, MAP_SIZE * k);
        if (z.r > 0) g.arc(zx, zy, M(z.r), 0, Math.PI * 2, true);
        g.fillStyle = "rgba(214, 84, 40, 0.28)";
        g.fill("evenodd");
        if (z.r > 0) {
          g.beginPath();
          g.arc(zx, zy, M(z.r), 0, Math.PI * 2);
          g.strokeStyle = "rgba(255,255,255,0.95)";
          g.lineWidth = 2;
          g.stroke();
        }
        // The next circle (once announced: it differs from the current one).
        if (z.nr > 0 && (z.nr !== z.r || z.nx !== z.x || z.nz !== z.z)) {
          const [nx, ny] = W(z.nx, z.nz);
          g.beginPath();
          g.arc(nx, ny, M(z.nr), 0, Math.PI * 2);
          g.strokeStyle = "rgba(255, 212, 64, 0.95)";
          g.lineWidth = 2;
          g.setLineDash([10, 6]);
          g.stroke();
          g.setLineDash([]);
          // Outside the next circle: a dotted line to its nearest edge.
          const d = Math.hypot(s.me.x - z.nx, s.me.z - z.nz);
          if (d > z.nr && s.me.phase !== "plane") {
            const ex = z.nx + ((s.me.x - z.nx) / d) * z.nr,
              ez = z.nz + ((s.me.z - z.nz) / d) * z.nr;
            g.beginPath();
            g.moveTo(...W(s.me.x, s.me.z));
            g.lineTo(...W(ex, ez));
            g.strokeStyle = "rgba(255,255,255,0.8)";
            g.lineWidth = 1.5;
            g.setLineDash([3, 5]);
            g.stroke();
            g.setLineDash([]);
          }
        }
      }
      // Supply drops.
      for (const d of s.drops) {
        const [x, y] = W(d.x, d.z);
        g.fillStyle = d.falling ? "#ff9b3d" : "#e8463c";
        g.fillRect(x - 5, y - 5, 10, 10);
        g.strokeStyle = "#111";
        g.lineWidth = 1.5;
        g.strokeRect(x - 5, y - 5, 10, 10);
      }
      // The waypoint: a pin.
      if (s.waypoint) {
        const [x, y] = W(s.waypoint[0], s.waypoint[1]);
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y - 16, 7, Math.PI * 0.8, Math.PI * 0.2, false);
        g.closePath();
        g.fillStyle = "#ffd34d";
        g.fill();
        g.strokeStyle = "#1a1a1a";
        g.lineWidth = 1.5;
        g.stroke();
      }
      // You: a bright arrow pointing where you look, with a pulse.
      {
        const [x, y] = W(s.me.x, s.me.z);
        const pulse = 10 + ((t / 60) % 14);
        g.beginPath();
        g.arc(x, y, pulse, 0, Math.PI * 2);
        g.strokeStyle = `rgba(80, 220, 255, ${0.6 - (pulse - 10) / 24})`;
        g.lineWidth = 2;
        g.stroke();
        g.save();
        g.translate(x, y);
        // yaw 0 faces −z (up on the map); positive yaw turns left (counter-clockwise).
        g.rotate(-s.me.yaw);
        g.beginPath();
        g.moveTo(0, -11);
        g.lineTo(7.5, 8);
        g.lineTo(0, 4);
        g.lineTo(-7.5, 8);
        g.closePath();
        g.fillStyle = "#5fe0ff";
        g.fill();
        g.strokeStyle = "#06222b";
        g.lineWidth = 2;
        g.stroke();
        g.restore();
      }
      // The scale bar (bottom left).
      const bar = [100, 250, 500, 1000, 2000].find((m) => M(m) > 60) ?? 2000;
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(10, size - 30, M(bar) + 16, 20);
      g.fillStyle = "#fff";
      g.fillRect(18, size - 18, M(bar), 2);
      g.font = "600 11px Inter, system-ui, sans-serif";
      g.fillText(bar >= 1000 ? `${bar / 1000} km` : `${bar} m`, 18, size - 22);
      if (t - lastInfo > 250) {
        lastInfo = t;
        const toSafe =
          z && z.nr > 0 ? Math.max(0, Math.hypot(s.me.x - z.nx, s.me.z - z.nz) - z.nr) : null;
        setInfo({
          phase: z ? (z.phase >= z.of ? "Final circle" : `Phase ${z.phase} of ${z.of}`) : "—",
          timer: z && z.left !== null ? clock(z.left) : "—",
          status: !z
            ? "The circle appears at take-off"
            : z.shrinking
              ? "Gas advancing"
              : z.phase === 1 && z.left !== null
                ? "Safe zone marked"
                : "Next zone marked",
          grid: gridRefAt(s.me.x, s.me.z),
          toSafe,
          waypoint: s.waypoint ? Math.hypot(s.waypoint[0] - s.me.x, s.waypoint[1] - s.me.z) : null,
        });
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      removeEventListener("mousemove", onMove);
      removeEventListener("mouseup", onUp);
      el.removeEventListener("contextmenu", onContext);
      removeEventListener("keydown", onKey);
    };
  }, [arena]);

  return (
    <div className="br-tmap" role="dialog" aria-label="Map">
      <div className="br-tmap-view" ref={host}>
        <canvas ref={canvas} />
      </div>
      <aside className="br-tmap-side">
        <header>
          <span className="br-tmap-title">Project Island</span>
          <button onClick={close} aria-label="Close map">
            M
          </button>
        </header>
        <dl>
          <div>
            <dt>Zone</dt>
            <dd>{info?.phase ?? "—"}</dd>
          </div>
          <div>
            <dt>{info?.status ?? ""}</dt>
            <dd className="mono">{info?.timer ?? "—"}</dd>
          </div>
          <div>
            <dt>Alive</dt>
            <dd className="mono">{alive ?? "—"}</dd>
          </div>
          <div>
            <dt>You</dt>
            <dd className="mono">{info?.grid ?? "—"}</dd>
          </div>
          {info?.toSafe !== null && info?.toSafe !== undefined && (
            <div>
              <dt>To next zone</dt>
              <dd className={`mono ${info.toSafe > 0 ? "warn" : "ok"}`}>
                {info.toSafe > 0 ? `${Math.round(info.toSafe)} m` : "Inside"}
              </dd>
            </div>
          )}
          {info?.waypoint !== null && info?.waypoint !== undefined && (
            <div>
              <dt>Marker</dt>
              <dd className="mono">{Math.round(info.waypoint)} m</dd>
            </div>
          )}
        </dl>
        <ul className="br-tmap-legend">
          <li>
            <i className="you" /> You
          </li>
          <li>
            <i className="now" /> Safe zone
          </li>
          <li>
            <i className="next" /> Next zone
          </li>
          <li>
            <i className="gas" /> Gas
          </li>
          <li>
            <i className="pin" /> Marker
          </li>
          <li>
            <i className="drop" /> Supply drop
          </li>
        </ul>
        <footer>
          <span>
            <kbd>Wheel</kbd> zoom
          </span>
          <span>
            <kbd>Drag</kbd> pan
          </span>
          <span>
            <kbd>Click</kbd> marker · <kbd>Right</kbd> clear
          </span>
          <span>
            <kbd>R</kbd> on me · <kbd>F</kbd> whole map
          </span>
          <span>
            <kbd>M</kbd>/<kbd>Esc</kbd> close
          </span>
        </footer>
      </aside>
    </div>
  );
}
