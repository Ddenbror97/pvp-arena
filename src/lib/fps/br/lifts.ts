import skylinePlan from "./skyline-plan.json";

/**
 * Working lifts (owner, 2026-11-13: "enterble, floors,rooms,elevator working"). A lift is a
 * column of storeys of the same building (art/blender/br/build_condo.mjs: the lobby, the
 * floors, the roof all carry the shaft and its cab at the same place): every storey placed at
 * the same x, z and turn adds a stop at its walking level. The cab is part of every storey, so
 * there is a cab waiting on every floor; riding one moves the rider up or down the shaft (the
 * body is carried by the ride's clock, like the zip-line) and steps them out on the floor they
 * chose.
 *
 * Shared by the server (authority) and the client (prediction, the cab drawn round the rider).
 * Frames: world metres (x east, y up, z south).
 */
export const LIFT = {
  /** The doors close (ms) before the cab moves, and open after it stops. */
  closeMs: 1_000,
  openMs: 700,
  /** Travel: a floor-to-floor minimum, and the cruising speed between (m/s). */
  minTravelMs: 1_600,
  speed: 5,
  /** How far inside the cab's walls you must stand to use it (m), and off its floor. */
  inset: 0.15,
  reachUp: 0.6,
} as const;

export type Lift = {
  id: number;
  /** The cab's centre and half-sizes (world, the turn applied). */
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Facing out of the cab door (rad, three's yaw: 0 looks down −z). */
  yaw: number;
  /** Walking levels, bottom up. */
  stops: number[];
  /**
   * The button panel inside the cab (on its wall right of the door): its centre (world x, z;
   * `panelY` above the floor), the unit vector into the cab (its face's normal) and the one
   * along it to the right as you face it.
   */
  panel: { x: number; z: number; nx: number; nz: number; rx: number; rz: number };
};

/** The panel: 1.6 m wide, 0.9 m tall, its middle 1.35 m up; buttons in rows of five. */
export const PANEL = { w: 1.6, h: 0.9, y: 1.35, cols: 5 } as const;

export type LiftState = { id: number; from: number; to: number; ms: number };

type Placed = { model: string; x: number; y: number; z: number; turn: number };
type Plan = {
  cab: { x0: number; x1: number; z0: number; z1: number };
  models: Record<string, { lift: { y: number } | null }>;
};
const PLAN = skylinePlan as unknown as Plan;

const turned = (x: number, z: number, turn: number): [number, number] => {
  switch (turn & 3) {
    case 1:
      return [z, -x];
    case 2:
      return [-x, -z];
    case 3:
      return [-z, x];
    default:
      return [x, z];
  }
};

/** The lifts in a layout (the same layout → the same lifts, same ids, everywhere). */
export function findLifts(layout: readonly Placed[]): Lift[] {
  const cols = new Map<string, { p: Placed; ys: number[] }>();
  for (const p of layout) {
    const m = PLAN.models[p.model];
    if (!m?.lift) continue;
    const key = `${p.x.toFixed(2)},${p.z.toFixed(2)},${p.turn & 3}`;
    const col = cols.get(key) ?? { p, ys: [] };
    col.ys.push(p.y + m.lift.y);
    cols.set(key, col);
  }
  const c = PLAN.cab;
  const out: Lift[] = [];
  for (const { p, ys } of cols.values()) {
    if (ys.length < 2) continue;
    const [cx, cz] = turned((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2, p.turn);
    const [hx, hz] =
      (p.turn & 1) === 1
        ? [(c.z1 - c.z0) / 2, (c.x1 - c.x0) / 2]
        : [(c.x1 - c.x0) / 2, (c.z1 - c.z0) / 2];
    // The door is on the cab's +z side (model space): out of it is +z, three's yaw π.
    const yaw = Math.PI + (p.turn & 3) * (Math.PI / 2);
    // The panel on the cab's +x wall (model space), facing −x; its right (as you face it) +z.
    const [px, pz] = turned(c.x1 - 0.02, (c.z0 + c.z1) / 2, p.turn);
    const [nx, nz] = turned(-1, 0, p.turn);
    const [rx, rz] = turned(0, 1, p.turn);
    out.push({
      id: out.length,
      x: +(p.x + cx).toFixed(3),
      z: +(p.z + cz).toFixed(3),
      hx,
      hz,
      yaw,
      stops: ys.sort((a, b) => a - b).map((y) => +y.toFixed(3)),
      panel: { x: +(p.x + px).toFixed(3), z: +(p.z + pz).toFixed(3), nx, nz, rx, rz },
    });
  }
  return out;
}

const registered = new WeakMap<object, Lift[]>();
/** Registered per terrain by buildIsland (server and every client alike). */
export function registerLifts(key: object, layout: readonly Placed[]) {
  registered.set(key, findLifts(layout));
}
export const lifts = (key: object): Lift[] => registered.get(key) ?? [];

/** The lift whose cab you stand in, and the stop you are at; null outside every cab. */
export function liftAt(all: readonly Lift[], x: number, y: number, z: number) {
  for (const l of all) {
    if (Math.abs(x - l.x) > l.hx - LIFT.inset || Math.abs(z - l.z) > l.hz - LIFT.inset) continue;
    const stop = l.stops.findIndex((s) => Math.abs(y - s) <= LIFT.reachUp);
    if (stop >= 0) return { lift: l, stop };
  }
  return null;
}

/** The ride's length (ms) from stop to stop. */
export function rideMs(l: Lift, from: number, to: number) {
  const d = Math.abs(l.stops[to]! - l.stops[from]!);
  return LIFT.closeMs + Math.max(LIFT.minTravelMs, (d / LIFT.speed) * 1000) + LIFT.openMs;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Where the rider is (feet) `ms` into the ride. */
export function ridePoint(l: Lift, st: LiftState) {
  const total = rideMs(l, st.from, st.to);
  const travel = total - LIFT.closeMs - LIFT.openMs;
  const t = ease((st.ms - LIFT.closeMs) / travel);
  const y0 = l.stops[st.from]!,
    y1 = l.stops[st.to]!;
  return { x: l.x, y: y0 + (y1 - y0) * t, z: l.z, done: st.ms >= total };
}

type Rider = {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  vx: number;
  vz: number;
  grounded: boolean;
  lift?: LiftState;
};

/** Start a ride (the server has checked the rider stands in the cab at `from`). */
export function startRide(body: Rider, l: Lift, from: number, to: number) {
  body.lift = { id: l.id, from, to, ms: 0 };
  body.x = l.x;
  body.z = l.z;
  body.velocityY = body.vx = body.vz = 0;
}

/** One step of the ride; true when it is over (the rider stands on the chosen floor). */
export function stepRide(all: readonly Lift[], body: Rider, dtMs: number): boolean {
  const st = body.lift;
  const l = st && all[st.id];
  if (!st || !l) {
    delete body.lift;
    return true;
  }
  st.ms += dtMs;
  const p = ridePoint(l, st);
  body.x = p.x;
  body.y = p.y;
  body.z = p.z;
  body.velocityY = body.vx = body.vz = 0;
  body.grounded = true;
  if (!p.done) return false;
  body.y = l.stops[st.to]!;
  delete body.lift;
  return true;
}

/** A floor's name in the lift (the lobby, numbered floors, the roof). */
export function stopLabel(l: Lift, i: number) {
  if (i === 0) return "L";
  if (i === l.stops.length - 1) return "R";
  return String(i);
}

/** A button's place on the panel: its centre (u right, v up from the panel's middle), size. */
export function buttonRect(l: Lift, i: number) {
  const rows = Math.ceil(l.stops.length / PANEL.cols);
  const cw = PANEL.w / PANEL.cols,
    ch = PANEL.h / rows;
  const col = i % PANEL.cols,
    row = Math.floor(i / PANEL.cols);
  return { u: -PANEL.w / 2 + (col + 0.5) * cw, v: -PANEL.h / 2 + (row + 0.5) * ch, w: cw, h: ch };
}

/** The button the ray (eye, unit dir) points at on the panel of the cab at `stop`; −1 none. */
export function buttonAt(
  l: Lift,
  stop: number,
  ex: number,
  ey: number,
  ez: number,
  dx: number,
  dy: number,
  dz: number,
  reach = 2.4,
): number {
  const p = l.panel;
  const cy = l.stops[stop]! + PANEL.y;
  // The plane through the panel facing into the cab.
  const denom = dx * p.nx + dz * p.nz;
  if (denom >= -1e-4) return -1;
  const t = ((p.x - ex) * p.nx + (p.z - ez) * p.nz) / denom;
  if (t < 0 || t > reach) return -1;
  const hx = ex + dx * t - p.x,
    hy = ey + dy * t - cy,
    hz = ez + dz * t - p.z;
  const u = hx * p.rx + hz * p.rz;
  if (Math.abs(u) > PANEL.w / 2 || Math.abs(hy) > PANEL.h / 2) return -1;
  for (let i = 0; i < l.stops.length; i++) {
    const r = buttonRect(l, i);
    if (Math.abs(u - r.u) <= r.w / 2 && Math.abs(hy - r.v) <= r.h / 2) return i;
  }
  return -1;
}
