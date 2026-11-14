/**
 * Wallhack canaries for the battle royale (anti-cheat, 2026-11-14; owner: "really focus on aim
 * hacks / wall hacks. Be creative how to solve this issue for a browser based game").
 *
 * The fog of war (BrSight.near) keeps hidden players off the wire, but within BR_RULES.fogAlwaysM
 * everyone is sent (footsteps are placed by position), and that is what a modified client reads
 * to draw boxes through walls. A canary turns that ring into a test: now and then a viewer is
 * sent one more player, crouched and still behind solid cover, who is not there.
 *
 *  - **Nobody honest can know of it.** The spot, out on open ground, is hidden from the
 *    viewer's eye (and from where that eye could be a moment later) by terrain or walls, with a
 *    margin: every ray to the crouched body, to either side of it and along the shadow the sun
 *    would cast is stopped by ground the client also draws there, well under it, or by a wall
 *    it meets well inside the wall's edges, so that the views between those rays meet the same
 *    wall (never through a window's edge, a fence, a rail or a trunk). It stands still and crouched, so the client makes no footsteps for it; it never
 *    shoots. The client draws nothing through walls (no name tags, no radar), so on an honest
 *    screen it is never drawn. If the viewer moves so that it could come into view, it is
 *    gone before it could be seen.
 *  - **It looks like a real player.** It carries the seat number and the kit of a real player
 *    more than CANARY.donorFarM away on foot, whom this viewer has not been sent for a while
 *    (so no client has seen that seat anywhere near), and it appears and leaves the way a real
 *    hidden camper does inside the always-sent ring.
 *  - **The test is a randomised one, so its error rate is exact.** Each trial draws two such
 *    spots and a coin decides which one gets the canary; the other is the control, never sent.
 *    The viewer's attention to each (ticks the view points at it, shots towards it) is scored
 *    over the same window, which ends when either spot could come into view. An honest player
 *    has no information about which spot is which, so whatever their skill, map knowledge or
 *    habits, the canary "wins" a decisive trial with probability exactly ½. A player who sees
 *    it wins far more. Across trials and matches the evidence is an e-value (`canaryEvidence`):
 *    a mixture likelihood ratio that, under honest play, exceeds 1/α with probability at most α
 *    however many times it is looked at (Ville's inequality), so there is no multiple-testing
 *    inflation from checking it after every match.
 *
 * Pure logic, no I/O: the room (workers/fps/br.ts) calls `step` once a simulation step and
 * `inject` for each view it sends. CPU: a few dozen rays when a trial starts and while it runs,
 * at most CANARY.maxTrials at a time per room.
 */
import { BR_RULES, type BrMatchState } from "./match";
import type { StaticWorld } from "./static-world";
import { BR_SUN_SHADOW } from "./sun-shadow";

export const CANARY = {
  /** Between trials for one viewer (ms), plus up to `gapJitterMs` at random. */
  gapMs: 18_000,
  gapJitterMs: 12_000,
  /** Trials running at once in one room (the CPU budget). */
  maxTrials: 6,
  /** The spots: this far from the viewer (m), inside the always-sent ring. */
  nearM: 12,
  farM: BR_RULES.fogAlwaysM - 3,
  /** Candidate spots tried for one trial. */
  candidates: 24,
  /** Whose seat a canary wears: a player on foot at least this far away (m)… */
  donorFarM: 1500,
  /** …who has been on the ground (not flying, not driving) at least this long (ms). */
  donorGroundedMs: 20_000,
  /** The viewer: no shot by them or at them this long before a trial (ms). */
  calmMs: 4000,
  /** A trial's longest run (ms). */
  maxMs: 4000,
  /** Attention: the view within this angle of the spot (degrees), and a shot towards it. */
  aimDeg: 5,
  shotWeight: 4,
  /** Rays to a spot must be stopped this far before its end (m). */
  marginM: 0.3,
  /**
   * A box counts as cover where a ray enters its face at least `fatM` inside the face's edges:
   * then every ray within `fatM` of that one, the ones between the samples included, meets the
   * same face (a window, a door or a slit between two wall boxes is further off than that). And
   * only a box this thick and this tall (m): never a fence, a rail or a mesh the client draws
   * see-through.
   */
  fatM: 0.3,
  coverThickM: 0.15,
  coverTallM: 1.0,
  /** Ground counts as cover where the ray runs this deep under both grounds (m). */
  groundDepthM: 0.25,
} as const;

/** A crouched body's points (m over the feet), for the safety test. */
/** (Top first: the likeliest to be in view, so a spot that fails fails on its first ray.) */
const BODY = [1.4, 0.9, 0.5, 0.1] as const;
const SIDE_M = 0.45,
  SIDE_Y = 0.8;
/** Where the eye could be a moment from now: either side, up (a jump) and forward. */
const EYE_SIDE_M = 1.2,
  EYE_UP_M = 0.7,
  EYE_AHEAD_M = 1.0,
  EYE = 1.6;
/** The middle of a crouched body (m over the feet), what the attention score aims at. */
const AIM_Y = 0.75;

type Spot = { x: number; y: number; z: number };

export type CanaryTrial = {
  viewer: number;
  /** The seat it wears, its yaw, and which spot it stands on (the other is the control). */
  donor: number;
  yaw: number;
  ghost: 0 | 1;
  spots: [Spot, Spot];
  start: number;
  score: [number, number];
};

/** One player's canary record: trials, decisive ones, and those the canary won. */
export type CanaryTally = { trials: number; decisive: number; won: number };

/** The room's random numbers (crypto in the room; seeded in tests). */
export type Rand = () => number;

export class BrCanaries {
  private trials = new Map<number, CanaryTrial>();
  private next = new Map<number, number>();
  private lastCombat = new Map<number, number>();
  private groundedSince = new Map<number, number>();
  private tallies = new Map<string, CanaryTally>();
  /** Rays traced, and trial starts tried and why they failed (profiling). */
  rays = 0;
  tries = { asked: 0, noDonor: 0, noSpots: 0, started: 0, candidates: 0, ground: 0, open: 0 };

  constructor(
    private readonly rand: Rand,
    private readonly water: (x: number, z: number, ground: number) => boolean = () => false,
  ) {}

  /** The trial running for a viewer, if any (tests, the room's logs). */
  trialOf(seat: number) {
    return this.trials.get(seat);
  }

  /**
   * Once a simulation step, after the step: start, score and end trials. `humans`: the seats
   * that are people (bots are not watched).
   */
  step(state: BrMatchState, world: StaticWorld, now: number, humans: (seat: number) => boolean) {
    for (const s of state.seats) {
      const onGround = !s.dead && s.vehicle === undefined && s.body.phase === "ground";
      if (!onGround) this.groundedSince.delete(s.seat);
      else if (!this.groundedSince.has(s.seat)) this.groundedSince.set(s.seat, now);
    }
    for (const e of state.combat) {
      if (e.type === "shot") this.lastCombat.set(e.seat, now);
      else if (e.type === "hit" || e.type === "hurt") {
        this.lastCombat.set(e.seat, now);
        this.lastCombat.set(e.victim, now);
      }
    }
    if (state.phase !== "active") {
      for (const t of this.trials.values()) this.finish(state, t);
      this.trials.clear();
      return;
    }
    // Running trials: score this tick, then end those that must end.
    for (const t of [...this.trials.values()]) {
      const viewer = state.seats[t.viewer]!;
      const end =
        !this.viewerReady(state, t.viewer, now) ||
        state.seats[t.donor]!.dead ||
        now - t.start >= CANARY.maxMs ||
        // Every third step (0.1 s: a sprint's 0.7 m, inside the eye's margins).
        (state.tick % 3 === 0 &&
          (!this.hidden(world, viewer.body, t.spots[0]) ||
            !this.hidden(world, viewer.body, t.spots[1])));
      if (!end) this.score(state, t);
      if (end) {
        this.finish(state, t);
        this.trials.delete(t.viewer);
        this.next.set(t.viewer, now + CANARY.gapMs + this.rand() * CANARY.gapJitterMs);
      }
    }
    if (this.trials.size >= CANARY.maxTrials) return;
    // At most one start tried a step (spreads the search's rays over ticks).
    for (const s of state.seats) {
      if (this.trials.size >= CANARY.maxTrials) break;
      if (!humans(s.seat) || this.trials.has(s.seat)) continue;
      const due = this.next.get(s.seat);
      if (due === undefined) {
        // First trial a while after landing, at a random time.
        this.next.set(s.seat, now + CANARY.gapJitterMs * (0.5 + this.rand()));
        continue;
      }
      if (now < due || !this.viewerReady(state, s.seat, now)) continue;
      const t = this.start(state, world, s.seat, now);
      // No trial possible here (no cover, no donor): try again a little later.
      this.next.set(s.seat, now + (t ? CANARY.maxMs : 2000 + this.rand() * 2000));
      if (t) this.trials.set(s.seat, t);
      break;
    }
  }

  /** The canary's row for this viewer's view, if a trial runs (rows as brViewFor's). */
  inject(
    state: BrMatchState,
    seat: number,
    rows: number[][],
    frameRow: (seat: number) => number[],
  ) {
    const t = this.trials.get(seat);
    if (!t) return;
    // Never twice, and never over a real row of the same seat (the donor is far away and not
    // sent, but a view could still carry them, e.g. a spectator's).
    if (rows.some((r) => r[0] === t.donor)) return;
    const spot = t.spots[t.ghost];
    const row = frameRow(t.donor).slice();
    const cm = (v: number) => Math.round(v * 100) / 100;
    row[1] = cm(spot.x);
    row[2] = cm(spot.y);
    row[3] = cm(spot.z);
    row[4] = 4; // on the ground
    row[5] = Math.round(t.yaw * 1000) / 1000;
    row[7] = 1; // crouched
    row[8] = -1; // no vehicle
    rows.push(row);
  }

  /** A player's record this match (added to the account's across matches by the backend). */
  tally(id: string): CanaryTally | undefined {
    return this.tallies.get(id);
  }

  forget() {
    this.trials.clear();
    this.next.clear();
    this.lastCombat.clear();
    this.groundedSince.clear();
    this.tallies.clear();
  }

  private viewerReady(state: BrMatchState, seat: number, now: number) {
    const s = state.seats[seat]!;
    return (
      !s.dead &&
      s.vehicle === undefined &&
      s.body.phase === "ground" &&
      now - (this.lastCombat.get(seat) ?? -1e9) >= CANARY.calmMs
    );
  }

  private start(
    state: BrMatchState,
    world: StaticWorld,
    seat: number,
    now: number,
  ): CanaryTrial | null {
    const viewer = state.seats[seat]!;
    const eye = viewer.body;
    // The donor: a real player on foot far away, on the ground long enough that this viewer
    // cannot have been sent them lately (BR_RULES.sightSendM is 1 km; nobody covers 500 m on
    // foot in CANARY.donorGroundedMs).
    const far2 = CANARY.donorFarM ** 2;
    const donors = state.seats.filter(
      (o) =>
        o.seat !== seat &&
        !o.dead &&
        o.vehicle === undefined &&
        o.body.phase === "ground" &&
        now - (this.groundedSince.get(o.seat) ?? now) >= CANARY.donorGroundedMs &&
        (o.body.x - eye.x) ** 2 + (o.body.z - eye.z) ** 2 >= far2,
    );
    this.tries.asked++;
    if (!donors.length) {
      this.tries.noDonor++;
      return null;
    }
    const donor = donors[Math.floor(this.rand() * donors.length)]!;
    // Two spots in front of or beside the viewer (where a box through a wall would be seen),
    // each standing room on open ground, dry, and hidden with the margin.
    const spots: Spot[] = [];
    for (let i = 0; i < CANARY.candidates && spots.length < 2; i++) {
      const bearing = viewer.yaw + (this.rand() * 2 - 1) * ((2 * Math.PI) / 3);
      const r = CANARY.nearM + this.rand() * (CANARY.farM - CANARY.nearM);
      // (yaw 0 looks along −z.)
      const x = eye.x - Math.sin(bearing) * r,
        z = eye.z - Math.cos(bearing) * r;
      const ground = world.hf.heightAt(x, z);
      this.tries.candidates++;
      const y = world.supportAt(x, z, 0.35, ground + 0.6);
      // Out on the open ground (never on a floor or a roof: buildings are not cover here).
      if (y - ground > 0.3 || Math.abs(y - eye.y) > 12 || this.water(x, z, ground)) continue;
      this.tries.ground++;
      if (world.blocked(x, y + 0.05, z, 1.3, 0.4)) continue;
      this.tries.open++;
      // Not on top of a spot already taken, and not where a real player is.
      if (spots.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 36)) continue;
      if (
        state.seats.some(
          (o) => !o.dead && (o.body.x - x) ** 2 + (o.body.z - z) ** 2 < 100 && o.seat !== seat,
        )
      )
        continue;
      const spot = { x, y, z };
      if (this.hidden(world, eye, spot)) spots.push(spot);
    }
    if (spots.length < 2) {
      this.tries.noSpots++;
      return null;
    }
    this.tries.started++;
    return {
      viewer: seat,
      donor: donor.seat,
      yaw: (this.rand() * 2 - 1) * Math.PI,
      ghost: this.rand() < 0.5 ? 0 : 1,
      spots: [spots[0]!, spots[1]!],
      start: now,
      score: [0, 0],
    };
  }

  /** The viewer's attention to each spot this tick (the same rule for both). */
  private score(state: BrMatchState, t: CanaryTrial) {
    const v = state.seats[t.viewer]!;
    const b = v.body;
    const cp = Math.cos(v.pitch);
    const fx = -Math.sin(v.yaw) * cp,
      fy = Math.sin(v.pitch),
      fz = -Math.cos(v.yaw) * cp;
    const cos = Math.cos((CANARY.aimDeg * Math.PI) / 180);
    let shot = false;
    for (const e of state.combat) if (e.type === "shot" && e.seat === t.viewer) shot = true;
    for (const k of [0, 1] as const) {
      const p = t.spots[k];
      const dx = p.x - b.x,
        dy = p.y + AIM_Y - (b.y + EYE),
        dz = p.z - b.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      if ((dx * fx + dy * fy + dz * fz) / d >= cos) t.score[k] += shot ? CANARY.shotWeight : 1;
    }
  }

  private finish(state: BrMatchState, t: CanaryTrial) {
    const id = state.seats[t.viewer]!.id;
    let tally = this.tallies.get(id);
    if (!tally) this.tallies.set(id, (tally = { trials: 0, decisive: 0, won: 0 }));
    tally.trials++;
    const [a, b] = t.score;
    if (a === b) return;
    tally.decisive++;
    if ((a > b ? 0 : 1) === t.ghost) tally.won++;
  }

  /**
   * The spot is out of sight of the eye, and of where it could be a moment from now, by cover
   * the client draws as solid: see the file's comment.
   */
  hidden(world: StaticWorld, eye: { x: number; y: number; z: number }, spot: Spot): boolean {
    const hx = spot.x - eye.x,
      hz = spot.z - eye.z;
    const flat = Math.hypot(hx, hz) || 1;
    const ux = hx / flat,
      uz = hz / flat;
    // Sideways (unit): +x of the line's right.
    const sx = -uz,
      sz = ux;
    // (The raised eye first: it sees over the most.)
    const eyes: Array<[number, number, number]> = [
      [eye.x, eye.y + EYE + EYE_UP_M, eye.z],
      [eye.x, eye.y + EYE, eye.z],
      [eye.x + ux * EYE_AHEAD_M, eye.y + EYE, eye.z + uz * EYE_AHEAD_M],
      [eye.x + sx * EYE_SIDE_M, eye.y + EYE, eye.z + sz * EYE_SIDE_M],
      [eye.x - sx * EYE_SIDE_M, eye.y + EYE, eye.z - sz * EYE_SIDE_M],
    ];
    const points: Array<[number, number, number]> = [];
    for (const h of BODY) points.push([spot.x, spot.y + h, spot.z]);
    points.push([spot.x + sx * SIDE_M, spot.y + SIDE_Y, spot.z + sz * SIDE_M]);
    points.push([spot.x - sx * SIDE_M, spot.y + SIDE_Y, spot.z - sz * SIDE_M]);
    // The shadow on the ground (the sun is fixed: sun-shadow.ts), with a margin in length.
    // (Every 0.4 m along it to a quarter past its tip, and its edges at the middle.)
    const shadow = BR_SUN_SHADOW.perMetre * BODY[0] * 1.25;
    const cx = -BR_SUN_SHADOW.z,
      cz = BR_SUN_SHADOW.x;
    for (let along = 0.4; along <= shadow + 1e-6; along += 0.4) {
      const x = spot.x + BR_SUN_SHADOW.x * along,
        z = spot.z + BR_SUN_SHADOW.z * along;
      points.push([x, world.hf.heightAt(x, z) + 0.05, z]);
    }
    for (const side of [-0.3, 0.3]) {
      const x = spot.x + BR_SUN_SHADOW.x * shadow * 0.5 + cx * side,
        z = spot.z + BR_SUN_SHADOW.z * shadow * 0.5 + cz * side;
      points.push([x, world.hf.heightAt(x, z) + 0.05, z]);
    }
    for (const [px, py, pz] of points)
      for (const [ex, ey, ez] of eyes)
        if (!this.covered(world, ex, ey, ez, px, py, pz)) return false;
    return true;
  }

  private covered(
    world: StaticWorld,
    ox: number,
    oy: number,
    oz: number,
    px: number,
    py: number,
    pz: number,
  ) {
    this.rays++;
    const dx = px - ox,
      dy = py - oy,
      dz = pz - oz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(len > CANARY.marginM * 2)) return false;
    const hit = world.raycast(ox, oy, oz, dx, dy, dz, len);
    if (!hit || hit.distance >= len - CANARY.marginM) return false;
    if (hit.kind === "trunk") return false;
    if (hit.kind === "box") {
      const o = hit.box! * 6,
        b = world.boxes;
      const x0 = b[o]!,
        y0 = b[o + 1]!,
        z0 = b[o + 2]!,
        x1 = b[o + 3]!,
        y1 = b[o + 4]!,
        z1 = b[o + 5]!;
      if (Math.min(x1 - x0, z1 - z0) < CANARY.coverThickM || y1 - y0 < CANARY.coverTallM)
        return false;
      // The face it entered by (the axis whose slab it entered last), and how far inside that
      // face's edges it entered.
      const ux = dx / len,
        uy = dy / len,
        uz = dz / len;
      const enter = (o0: number, d: number, lo: number, hi: number) =>
        Math.abs(d) < 1e-12 ? -Infinity : Math.min((lo - o0) / d, (hi - o0) / d);
      const ex = enter(ox, ux, x0, x1),
        ey = enter(oy, uy, y0, y1),
        ez = enter(oz, uz, z0, z1);
      const t = hit.distance;
      const x = ox + ux * t,
        y = oy + uy * t,
        z = oz + uz * t;
      const inX = Math.min(x - x0, x1 - x),
        inY = Math.min(y - y0, y1 - y),
        inZ = Math.min(z - z0, z1 - z);
      const inside =
        ex >= ey && ex >= ez
          ? Math.min(inY, inZ)
          : ey >= ez
            ? Math.min(inX, inZ)
            : Math.min(inX, inY);
      return inside >= CANARY.fatM;
    }
    // Ground: a little past where it went in, the ray is under both the server's ground and
    // the triangles the client draws.
    const t = Math.min(hit.distance + 0.3, len - CANARY.marginM);
    const x = ox + (dx / len) * t,
      y = oy + (dy / len) * t,
      z = oz + (dz / len) * t;
    const ground = Math.min(world.hf.heightAt(x, z), world.hf.meshAt(x, z, MESH).y);
    return y < ground - CANARY.groundDepthM;
  }
}
const MESH = { y: 0, ny: 1 };

/**
 * The evidence of a player's canary record: an e-value against honest play (the canary wins a
 * decisive trial with probability ½). A mixture of likelihood ratios over how often a cheat
 * would look at it (60 %, 75 %, 90 %); its expectation under honest play is 1, so it reaches
 * 1/α with probability at most α however often it is checked. Returned as ln(e).
 */
export function canaryEvidence(t: { decisive: number; won: number }): number {
  const lost = t.decisive - t.won;
  const terms = [0.6, 0.75, 0.9].map((p) => t.won * Math.log(2 * p) + lost * Math.log(2 * (1 - p)));
  const top = Math.max(...terms);
  return top + Math.log(terms.reduce((s, x) => s + Math.exp(x - top), 0) / terms.length);
}
