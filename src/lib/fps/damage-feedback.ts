/**
 * What being shot looks like on your own screen (owner, 2026-11-27, with Warzone as the
 * reference: "a curved, boomerang-shaped indicator showing the direction from which the player
 * received damage", "temporary red screen-edge feedback", and under half health "a persistent
 * blood-red damage overlay primarily around the bottom and edges of the screen").
 *
 *  - Direction: one crescent per shooter on a ring round the crosshair, pointing at where the
 *    shot came from. Placed every frame from the shooter's place when the hit landed and the
 *    camera as it is now, so it stays on the shooter as you turn. Up to six at once (the
 *    oldest gives way); a second hit from the same shooter renews theirs. Red when the hit
 *    took health, pale blue when armour took it (Warzone's reading, and the reference's arc).
 *  - Edge flash: a red vignette at the screen's edges, as strong as the damage, gone in half a
 *    second. Any damage shows it, with or without a direction (a fall, a blast, the gas).
 *  - Low health: blood on the lens at the bottom and the edges, from just under half health,
 *    denser and reaching further in as health falls, with a slow pulse under a quarter. It
 *    eases off as you heal and is gone at half health. The middle of the screen is erased
 *    from the picture itself, so the aim is never covered.
 *
 * Cost: three layers the browser's compositor blends (opacity and transform only: no layout,
 * no repaint, no pass in the game's renderer), and only while there is something to show: the
 * whole overlay is `display: none` at full health with no recent hit, and `update` then
 * writes nothing to the page. The elements are made once (no per-hit allocation); `dispose`
 * removes them. Nothing here decides damage: it shows what the server reported.
 */

import { lattice, layered, smooth } from "./flesh-mist";

/** Health (of 1) under which the blood overlay shows, and where it is at its strongest. */
export const LOW_HEALTH = 0.5,
  CRITICAL_HEALTH = 0.1;
/** Health under which the overlay pulses. */
const PULSE_HEALTH = 0.25;
/** A direction crescent's life (ms): held, then faded over the last part. */
export const ARC_MS = 1500;
const ARC_FADE_MS = 550,
  ARCS = 6,
  /** The edge flash's decay (ms, to 1/e). */
  FLASH_MS = 190;

/**
 * How strong the low-health overlay is (0–1) at `hp` of `max`: nothing at half health or
 * more, visible at once just under it (0.3: the threshold reads), full at a tenth.
 */
export function lowHealthIntensity(hp: number, max = 100): number {
  if (!(max > 0) || !Number.isFinite(hp)) return 0;
  const f = hp / max;
  if (f >= LOW_HEALTH || f <= 0) return 0;
  const t = Math.min(1, (LOW_HEALTH - f) / (LOW_HEALTH - CRITICAL_HEALTH));
  return 0.3 + 0.7 * t ** 0.85;
}

/**
 * Where on the ring a source is: radians clockwise from straight ahead (0 ahead, π/2 to the
 * right, ±π behind), for a camera at (x, z) looking along (fx, fz) on the ground plane.
 */
export function bearingOnScreen(
  sx: number,
  sz: number,
  x: number,
  z: number,
  fx: number,
  fz: number,
): number {
  const dx = sx - x,
    dz = sz - z;
  // (The camera's right on the ground plane: forward turned a quarter clockwise from above.)
  return Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
}

/** How strong the edge flash is for one hit of `damage` health (0–1). */
export function flashStrength(damage: number): number {
  if (!(damage > 0)) return 0;
  // (Small, continuous damage such as the gas barely shows; a rifle round is half way.)
  return damage < 3 ? damage / 30 : Math.min(1, 0.3 + damage / 55);
}

export type DamageArc = {
  /** Who (a seat): one crescent per source. −1: free. */
  key: number;
  x: number;
  z: number;
  at: number;
  armoured: boolean;
};

/**
 * The live direction crescents: a fixed set of slots, one per source, the oldest reused when
 * all are taken. (Pure: the page's part reads it.)
 */
export class DamageArcs {
  readonly slots: DamageArc[] = Array.from({ length: ARCS }, () => ({
    key: -1,
    x: 0,
    z: 0,
    at: -Infinity,
    armoured: false,
  }));
  /** A hit from `key` at (x, z): its slot (renewed), or the oldest one. */
  add(key: number, x: number, z: number, armoured: boolean, now: number): DamageArc {
    let slot = this.slots[0]!;
    for (const s of this.slots) {
      if (s.key === key && now - s.at < ARC_MS) {
        slot = s;
        break;
      }
      if (s.at < slot.at) slot = s;
    }
    slot.key = key;
    slot.x = x;
    slot.z = z;
    slot.at = now;
    slot.armoured = armoured;
    return slot;
  }
  /** 0–1: how visible a slot is at `now` (0: free). */
  opacity(slot: DamageArc, now: number): number {
    const age = now - slot.at;
    if (slot.key < 0 || age < 0 || age >= ARC_MS) return 0;
    return age < ARC_MS - ARC_FADE_MS ? 1 : (ARC_MS - age) / ARC_FADE_MS;
  }
  clear() {
    for (const s of this.slots) {
      s.key = -1;
      s.at = -Infinity;
    }
  }
}

/** The part of the picture (as fractions of its size) that is erased round the middle. */
export const CLEAR_CENTRE = { rx: 0.27, ry: 0.25 };
/** The low-health picture's size (stretched over the screen: blood on a lens is out of focus). */
export const LOW_W = 480,
  LOW_H = 270;

let lowPicture: Uint8ClampedArray | null = null;
/**
 * The low-health picture, RGBA bytes (LOW_W × LOW_H, row-major), computed once: blood on the
 * lens. A dark red wash rising from the bottom and in from the sides, and over it splashes
 * and drops whose outlines come from layered noise (ragged blots, none of them round), many
 * and large at the bottom, fewer up the sides, a few along the top; deep red where a blot is
 * thick, softened as a thing too near to focus on. The middle is erased from the picture
 * itself (nothing at all inside CLEAR_CENTRE, feathered out to nearly twice that), so nothing
 * can lie over the aim.
 */
export function lowHealthPicture(): Uint8ClampedArray {
  if (lowPicture) return lowPicture;
  const data = new Uint8ClampedArray(LOW_W * LOW_H * 4);
  const big = lattice(20261127),
    mid = lattice(977),
    fine = lattice(31337),
    bend = lattice(4409);
  for (let py = 0; py < LOW_H; py++)
    for (let px = 0; px < LOW_W; px++) {
      const u = (px + 0.5) / LOW_W,
        v = (py + 0.5) / LOW_H;
      // Where blood may lie: the bottom most of all, then the lower sides, a little at the top.
      const side = 1 - Math.min(u, 1 - u) * 2, // 1 at a side, 0 in the middle
        weight = Math.max(
          v ** 2.6,
          side ** 4 * 0.85 * (0.3 + 0.7 * v),
          (1 - v) ** 9 * 0.3 * (0.4 + 0.6 * side),
        );
      // The middle: 0 inside the cleared ellipse, 1 from 1.9 times it.
      const e = Math.hypot((u - 0.5) / CLEAR_CENTRE.rx, (v - 0.5) / CLEAR_CENTRE.ry),
        open = smooth(1, 1.9, e);
      let r = 140,
        g = 0,
        b = 14,
        a = 0.36 * weight ** 1.6;
      if (open > 0 && weight > 0.015) {
        // (In picture pixels, so the blots are as wide as they are tall; bent, so none is
        // a disc.)
        const x = px + (layered(bend, px / 40, py / 40, 2) - 0.5) * 30,
          y = py + (layered(bend, px / 40 + 9, py / 40 + 4, 2) - 0.5) * 30;
        const n1 = layered(big, x / 30, y / 30, 3),
          n2 = layered(mid, x / 13 + 50, y / 13 + 80, 2),
          n3 = layered(fine, x / 4.5 + 20, y / 4.5 + 60, 1);
        // Splashes (they join into pools at the very bottom), drops, and a fine spatter:
        // more of each where the weight is high, none where it is not.
        const lift = 0.2 * weight;
        const splash = smooth(0.6 - lift, 0.72 - lift, n1) * smooth(0.02, 0.2, weight),
          drops = smooth(0.68 - lift * 0.6, 0.79 - lift * 0.6, n2) * smooth(0.04, 0.25, weight),
          spatter = smooth(0.81 - lift * 0.4, 0.88 - lift * 0.4, n3) * smooth(0.06, 0.3, weight);
        const blood = Math.max(splash, drops * 0.95, spatter * 0.8);
        if (blood > 0) {
          // Crimson, deep where a splash is thick.
          const thick = smooth(0.72 - lift, 0.9 - lift, n1) * splash;
          r += (222 - 92 * thick - r) * blood;
          g += (6 - g) * blood;
          b += (34 - 20 * thick - b) * blood;
          a = Math.max(a, blood * (0.84 + 0.14 * thick));
        }
      }
      const o = (py * LOW_W + px) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = Math.round(Math.min(1, a) * open * 255);
    }
  // Out of focus, as blood on a lens is: every pixel with its eight neighbours, twice. (The
  // middle stays empty: it is cleared well beyond the blur's reach.)
  const blurred = new Uint8ClampedArray(data.length);
  let from: Uint8ClampedArray = data,
    to: Uint8ClampedArray = blurred;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < LOW_H; y++)
      for (let x = 0; x < LOW_W; x++)
        for (let c = 0; c < 4; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const yy = Math.min(LOW_H - 1, Math.max(0, y + dy));
            for (let dx = -1; dx <= 1; dx++)
              sum += from[(yy * LOW_W + Math.min(LOW_W - 1, Math.max(0, x + dx))) * 4 + c]!;
          }
          to[(y * LOW_W + x) * 4 + c] = sum / 9;
        }
    [from, to] = [to, from];
  }
  return (lowPicture = from);
}

/**
 * The crescent: an arc of the ring (radius 100, 28° either side of the top) whose inner edge
 * is a flatter arc through the same ends, so it is thickest in the middle and comes to a
 * point at each end. A wide faint stroke under it is its glow (no CSS filter: nothing to
 * re-rasterise as it turns).
 */
const ARC_PATH = "M-46.95,-88.29 A100,100 0 0 1 46.95,-88.29 A236.4,236.4 0 0 0 -46.95,-88.29Z";
const ARC_SVG =
  '<svg viewBox="-52 -106 104 22" aria-hidden="true">' +
  `<path class="glow" d="${ARC_PATH}"/>` +
  `<path class="core" d="${ARC_PATH}"/>` +
  // (The lit outer edge: the same outer arc, a tighter inner one.)
  '<path class="edge" d="M-46.95,-88.29 A100,100 0 0 1 46.95,-88.29 A125.5,125.5 0 0 0 -46.95,-88.29Z"/>' +
  "</svg>";

export type DamageFeedback = {
  /**
   * A hit on you. `source`: who and where from (world metres), or null when the damage has no
   * direction (a fall, a blast, the gas). `damage`: the health it took.
   */
  hit(
    source: { key: number; x: number; z: number } | null,
    damage: number,
    armoured: boolean,
    now: number,
  ): void;
  /**
   * Once a frame: the camera's place and the way it looks on the ground plane, and your
   * health (0–1), or null when there is none to show for (eliminated, watching, no match):
   * everything is cleared then.
   */
  update(now: number, x: number, z: number, fx: number, fz: number, health: number | null): void;
  /** Clear everything now (a new match, a respawn). */
  reset(): void;
  dispose(): void;
  /** For the tests and the performance report: what exists and what was written. */
  stats(): { elements: number; writes: number; shown: boolean; low: number; flash: number };
};

/** The element `createDamageFeedback` adds to `host` (above the game's canvas). */
export const DAMAGE_FEEDBACK_CLASS = "fps-dmg";

/**
 * The overlay, inside `host` (the element the game's canvas is in; the HUD is drawn over it).
 * Styles: `.fps-dmg*` in duel.css.
 */
export function createDamageFeedback(
  host: HTMLElement,
  options: { reducedMotion?: boolean } = {},
): DamageFeedback {
  const doc = host.ownerDocument;
  const root = doc.createElement("div");
  root.className = DAMAGE_FEEDBACK_CLASS;
  root.setAttribute("aria-hidden", "true");
  root.style.display = "none";
  const low = doc.createElement("canvas");
  low.className = `${DAMAGE_FEEDBACK_CLASS}-low`;
  low.width = LOW_W;
  low.height = LOW_H;
  low.style.opacity = "0";
  // (No 2D context, as in a test's page stand-in: the layer stays empty.)
  const pen = low.getContext?.("2d");
  if (pen) {
    const image = pen.createImageData(LOW_W, LOW_H);
    image.data.set(lowHealthPicture());
    pen.putImageData(image, 0, 0);
  }
  const flash = doc.createElement("div");
  flash.className = `${DAMAGE_FEEDBACK_CLASS}-flash`;
  flash.style.opacity = "0";
  root.append(low, flash);
  const arcs = new DamageArcs();
  const arcEls = arcs.slots.map(() => {
    const el = doc.createElement("div");
    el.className = `${DAMAGE_FEEDBACK_CLASS}-arc`;
    el.innerHTML = ARC_SVG;
    el.style.opacity = "0";
    root.appendChild(el);
    return { el, opacity: 0, angle: NaN, armoured: false, scale: 1 };
  });
  host.appendChild(root);

  let writes = 0,
    shown = false,
    lowNow = 0,
    lowShown = 0,
    lowScale = -1,
    flashNow = 0,
    flashShown = 0,
    last = NaN,
    disposed = false;
  const reducedMotion = options.reducedMotion ?? false;
  const show = (on: boolean) => {
    if (shown === on) return;
    shown = on;
    root.style.display = on ? "" : "none";
    writes++;
  };
  const clear = () => {
    arcs.clear();
    lowNow = 0;
    flashNow = 0;
    for (const a of arcEls)
      if (a.opacity !== 0) {
        a.opacity = 0;
        a.el.style.opacity = "0";
        writes++;
      }
    if (lowShown !== 0) {
      lowShown = 0;
      low.style.opacity = "0";
      writes++;
    }
    if (flashShown !== 0) {
      flashShown = 0;
      flash.style.opacity = "0";
      writes++;
    }
    show(false);
  };

  return {
    hit(source, damage, armoured, now) {
      if (disposed) return;
      flashNow = Math.min(1, Math.max(flashNow, flashStrength(damage)));
      if (source) arcs.add(source.key, source.x, source.z, armoured, now);
    },
    update(now, x, z, fx, fz, health) {
      if (disposed) return;
      const dt = Number.isFinite(last) ? Math.min(100, Math.max(0, now - last)) : 0;
      last = now;
      if (health === null) {
        if (shown || lowNow || flashNow) clear();
        else arcs.clear();
        return;
      }
      // Low health: toward its strength for this health, quickly up, slowly down (a heal
      // clears the screen over about a second rather than at a stroke).
      const target = lowHealthIntensity(health, 1);
      if (lowNow !== target) {
        const rate = target > lowNow ? 1 / 180 : 1 / 900;
        const step = dt * rate;
        lowNow =
          Math.abs(target - lowNow) <= step ? target : lowNow + Math.sign(target - lowNow) * step;
      }
      if (flashNow > 0) {
        flashNow *= Math.exp(-dt / FLASH_MS);
        if (flashNow < 0.01) flashNow = 0;
      }
      let any = lowNow > 0 || flashNow > 0;
      const facing = Math.hypot(fx, fz) > 1e-4;
      for (let i = 0; i < arcEls.length; i++) {
        const slot = arcs.slots[i]!,
          a = arcEls[i]!;
        const o = arcs.opacity(slot, now);
        if (o > 0) {
          any = true;
          // (Looking straight up or down there is no heading: the crescent keeps its place.)
          const angle = facing
            ? (bearingOnScreen(slot.x, slot.z, x, z, fx, fz) * 180) / Math.PI
            : a.angle;
          // A fresh hit lands a little large and settles.
          const age = now - slot.at,
            scale = reducedMotion || age > 160 ? 1 : 1.16 - 0.16 * (age / 160);
          if (
            !(Math.abs(angle - a.angle) < 0.15) ||
            Math.abs(scale - a.scale) > 0.004 ||
            (scale === 1 && a.scale !== 1)
          ) {
            a.angle = angle;
            a.scale = scale;
            a.el.style.transform = `rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
            writes++;
          }
          if (a.armoured !== slot.armoured) {
            a.armoured = slot.armoured;
            a.el.classList.toggle("armoured", slot.armoured);
            writes++;
          }
        }
        if (Math.abs(o - a.opacity) > 0.01 || (o === 0 && a.opacity !== 0)) {
          a.opacity = o;
          a.el.style.opacity = o.toFixed(2);
          writes++;
          if (o === 0) slot.key = -1;
        }
      }
      // The pulse under a quarter health: two beats and a rest, about 66 a minute.
      let lowOut = lowNow;
      if (lowNow > 0 && !reducedMotion && health < PULSE_HEALTH) {
        const p = (now % 900) / 900;
        const beat = Math.max(0, Math.sin(p * Math.PI * 4)) * (p < 0.5 ? 1 : 0);
        lowOut = Math.min(1, lowNow * (0.9 + 0.14 * beat));
      }
      if (Math.abs(lowOut - lowShown) > 0.006 || (lowOut === 0 && lowShown !== 0)) {
        lowShown = lowOut;
        // (Present at once under half health, then mostly a matter of how far it reaches.)
        const seen = lowOut < 0.3 ? lowOut * 2 : 0.6 + (lowOut - 0.3) * (0.4 / 0.7);
        low.style.opacity = seen.toFixed(3);
        writes++;
      }
      // The reach: drawn larger than the screen while it is faint (only its rim shows), at
      // the screen's size at full strength (the blood has come in as far as it goes).
      const scale = 1 + 0.3 * (1 - lowNow);
      if (lowNow > 0 && Math.abs(scale - lowScale) > 0.002) {
        lowScale = scale;
        low.style.transform = `scale(${scale.toFixed(3)})`;
        writes++;
      }
      if (Math.abs(flashNow - flashShown) > 0.01 || (flashNow === 0 && flashShown !== 0)) {
        flashShown = flashNow;
        flash.style.opacity = flashNow.toFixed(2);
        writes++;
      }
      show(any);
    },
    reset() {
      if (!disposed) clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      arcs.clear();
      root.remove();
      // (The picture's memory goes with its canvas; shrinking it frees it at once.)
      low.width = low.height = 0;
    },
    stats: () => ({
      elements: 3 + arcEls.length,
      writes,
      shown,
      low: lowNow,
      flash: flashNow,
    }),
  };
}
