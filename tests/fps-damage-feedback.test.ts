import { describe, expect, it } from "vitest";
import {
  ARC_MS,
  CLEAR_CENTRE,
  CRITICAL_HEALTH,
  DamageArcs,
  LOW_H,
  LOW_HEALTH,
  LOW_W,
  bearingOnScreen,
  createDamageFeedback,
  flashStrength,
  lowHealthIntensity,
  lowHealthPicture,
} from "@/lib/fps/damage-feedback";

describe("low health: how strong the blood overlay is", () => {
  it("shows nothing at half health or more, and starts just under it", () => {
    for (const hp of [100, 75, 50.1, 50]) expect(lowHealthIntensity(hp)).toBe(0);
    expect(lowHealthIntensity(49.9)).toBeGreaterThan(0.25);
  });
  it("grows as health falls and is full at a tenth", () => {
    let last = 0;
    for (let hp = 49; hp >= 1; hp--) {
      const now = lowHealthIntensity(hp);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    expect(lowHealthIntensity(100 * CRITICAL_HEALTH)).toBe(1);
    expect(lowHealthIntensity(3)).toBe(1);
    expect(lowHealthIntensity(25)).toBeGreaterThan(lowHealthIntensity(40));
    expect(LOW_HEALTH).toBe(0.5);
  });
  it("shows nothing for the dead or for nonsense", () => {
    for (const hp of [0, -5, NaN, Infinity]) expect(lowHealthIntensity(hp)).toBe(0);
    expect(lowHealthIntensity(20, 0)).toBe(0);
  });
});

describe("where a shooter is on the ring, for the camera as it is now", () => {
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  it("is clockwise from straight ahead", () => {
    // Looking along −z from the origin: +x is to the right.
    expect(deg(bearingOnScreen(0, -10, 0, 0, 0, -1))).toBe(0);
    expect(deg(bearingOnScreen(10, 0, 0, 0, 0, -1))).toBe(90);
    expect(deg(bearingOnScreen(-10, 0, 0, 0, 0, -1))).toBe(-90);
    expect(Math.abs(deg(bearingOnScreen(0, 10, 0, 0, 0, -1)))).toBe(180);
    expect(deg(bearingOnScreen(-10, -10, 0, 0, 0, -1))).toBe(-45);
  });
  it("follows the camera: turn toward the shooter and the crescent comes to the top", () => {
    // The shooter is at +x. Turned a quarter left (looking along −x) they are behind;
    // turned a quarter right (looking along +x) they are ahead.
    expect(Math.abs(deg(bearingOnScreen(10, 0, 0, 0, -1, 0)))).toBe(180);
    expect(deg(bearingOnScreen(10, 0, 0, 0, 1, 0))).toBe(0);
    // And it is measured from where the player stands now.
    expect(deg(bearingOnScreen(10, 0, 20, 0, 0, -1))).toBe(-90);
  });
});

describe("the edge flash", () => {
  it("is as strong as the damage, and the gas barely shows", () => {
    expect(flashStrength(0)).toBe(0);
    expect(flashStrength(-3)).toBe(0);
    expect(flashStrength(1)).toBeLessThan(0.05);
    expect(flashStrength(30)).toBeGreaterThan(0.6);
    expect(flashStrength(250)).toBe(1);
    let last = 0;
    for (let d = 0; d <= 120; d += 0.5) {
      expect(flashStrength(d)).toBeGreaterThanOrEqual(last - 0.21); // (one step, at 3 hp)
      last = flashStrength(d);
    }
  });
});

describe("the direction crescents' slots", () => {
  it("keeps one per shooter, several shooters at once", () => {
    const arcs = new DamageArcs();
    const a = arcs.add(4, 10, 0, false, 1000);
    const b = arcs.add(9, -10, 0, true, 1100);
    expect(b).not.toBe(a);
    // The same shooter again: their crescent is renewed, moved to where they are now.
    expect(arcs.add(4, 12, 3, false, 1300)).toBe(a);
    expect(a).toMatchObject({ x: 12, z: 3, at: 1300 });
    expect(arcs.slots.filter((s) => arcs.opacity(s, 1400) > 0)).toHaveLength(2);
    expect(b.armoured).toBe(true);
  });
  it("never grows: a seventh shooter takes the oldest crescent", () => {
    const arcs = new DamageArcs();
    for (let seat = 0; seat < 40; seat++) arcs.add(seat, seat, 0, false, 1000 + seat * 10);
    expect(arcs.slots).toHaveLength(6);
    expect(arcs.slots.map((s) => s.key).sort((x, y) => x - y)).toEqual([34, 35, 36, 37, 38, 39]);
  });
  it("holds, fades and is gone", () => {
    const arcs = new DamageArcs();
    const a = arcs.add(1, 0, 0, false, 0);
    expect(arcs.opacity(a, 100)).toBe(1);
    expect(arcs.opacity(a, ARC_MS - 100)).toBeGreaterThan(0);
    expect(arcs.opacity(a, ARC_MS - 100)).toBeLessThan(1);
    expect(arcs.opacity(a, ARC_MS)).toBe(0);
    arcs.add(2, 0, 0, false, 50);
    arcs.clear();
    expect(arcs.slots.every((s) => arcs.opacity(s, 60) === 0)).toBe(true);
  });
});

describe("the low-health picture", () => {
  const data = lowHealthPicture();
  const alpha = (x: number, y: number) => data[(y * LOW_W + x) * 4 + 3]!;
  it("is computed once", () => {
    expect(data).toHaveLength(LOW_W * LOW_H * 4);
    expect(lowHealthPicture()).toBe(data);
  });
  it("leaves the middle of the screen completely clear for the aim", () => {
    let inside = 0;
    for (let y = 0; y < LOW_H; y++)
      for (let x = 0; x < LOW_W; x++) {
        const u = (x + 0.5) / LOW_W - 0.5,
          v = (y + 0.5) / LOW_H - 0.5;
        if ((u / CLEAR_CENTRE.rx) ** 2 + (v / CLEAR_CENTRE.ry) ** 2 <= 1) {
          inside++;
          expect(alpha(x, y)).toBe(0);
        }
      }
    // (That is over a fifth of the screen, round the crosshair.)
    expect(inside / (LOW_W * LOW_H)).toBeGreaterThan(0.2);
  });
  it("lies mostly along the bottom, then the sides, least at the top", () => {
    const mean = (x0: number, x1: number, y0: number, y1: number) => {
      let sum = 0,
        n = 0;
      for (let y = Math.floor(y0 * LOW_H); y < y1 * LOW_H; y++)
        for (let x = Math.floor(x0 * LOW_W); x < x1 * LOW_W; x++) {
          sum += alpha(x, y);
          n++;
        }
      return sum / n / 255;
    };
    const bottom = mean(0, 1, 0.85, 1),
      top = mean(0, 1, 0, 0.15),
      sides = (mean(0, 0.08, 0.3, 0.7) + mean(0.92, 1, 0.3, 0.7)) / 2,
      middle = mean(0.3, 0.7, 0.3, 0.7);
    expect(bottom).toBeGreaterThan(0.45);
    expect(bottom).toBeGreaterThan(sides);
    expect(sides).toBeGreaterThan(top);
    expect(middle).toBeLessThan(0.01);
  });
  it("is blots of blood, not a flat tint: its alpha varies along the bottom edge", () => {
    const row = Math.floor(LOW_H * 0.8);
    let low = 255,
      high = 0;
    for (let x = 0; x < LOW_W; x++) {
      low = Math.min(low, alpha(x, row));
      high = Math.max(high, alpha(x, row));
    }
    expect(high - low).toBeGreaterThan(120);
  });
});

// ---- the page's part, against a stand-in for the page (no browser in these tests)

type FakeEl = {
  tag: string;
  className: string;
  style: Record<string, string>;
  children: FakeEl[];
  parent: FakeEl | null;
  classes: Set<string>;
  classList: { toggle(name: string, on?: boolean): void };
  innerHTML: string;
  width: number;
  height: number;
  setAttribute(): void;
  append(...els: FakeEl[]): void;
  appendChild(el: FakeEl): void;
  remove(): void;
  ownerDocument: { createElement(tag: string): FakeEl };
};
function fakePage() {
  let made = 0;
  const doc = {
    createElement(tag: string): FakeEl {
      made++;
      const el: FakeEl = {
        tag,
        className: "",
        style: {},
        children: [],
        parent: null,
        classes: new Set(),
        classList: {
          toggle(name, on) {
            if (on ?? !el.classes.has(name)) el.classes.add(name);
            else el.classes.delete(name);
          },
        },
        innerHTML: "",
        width: 0,
        height: 0,
        setAttribute() {},
        append(...els) {
          for (const c of els) el.appendChild(c);
        },
        appendChild(c) {
          c.parent = el;
          el.children.push(c);
        },
        remove() {
          if (el.parent) el.parent.children = el.parent.children.filter((c) => c !== el);
          el.parent = null;
        },
        ownerDocument: doc,
      };
      return el;
    },
  };
  const host = doc.createElement("div");
  return { host, made: () => made };
}
/** The feedback over a stand-in page, with its parts found. */
function mount(reducedMotion = true) {
  const page = fakePage();
  const fx = createDamageFeedback(page.host as unknown as HTMLElement, { reducedMotion });
  const root = page.host.children[0]!;
  const low = root.children.find((c) => c.className === "fps-dmg-low")!,
    flash = root.children.find((c) => c.className === "fps-dmg-flash")!,
    arcs = root.children.filter((c) => c.className === "fps-dmg-arc");
  /** `ms` of frames, looking along (fx, fz) from the origin. */
  let now = 10_000;
  const run = (ms: number, health: number | null, look: [number, number] = [0, -1]) => {
    for (const end = now + ms; now < end; now += 16) fx.update(now, 0, 0, look[0], look[1], health);
  };
  const angle = (el: FakeEl) =>
    Number(/rotate\(([-\d.]+)deg\)/.exec(el.style["transform"] ?? "")?.[1]);
  return { page, fx, root, low, flash, arcs, run, angle, clock: () => now };
}

describe("the incoming-damage overlay on the page", () => {
  it("is nine elements made once, hidden and silent at full health", () => {
    const m = mount();
    const made = m.page.made();
    expect(m.root.className).toBe("fps-dmg");
    expect(m.arcs).toHaveLength(6);
    expect(m.fx.stats().elements).toBe(9);
    m.run(5000, 1);
    // Five seconds of frames at full health: nothing shown, nothing written to the page.
    expect(m.root.style["display"]).toBe("none");
    expect(m.fx.stats().writes).toBe(0);
    // A hundred hits later it is still the same nine elements.
    for (let i = 0; i < 100; i++) {
      m.fx.hit({ key: i % 9, x: i, z: -5 }, 20, i % 2 === 0, m.clock());
      m.run(48, 0.6);
    }
    expect(m.page.made()).toBe(made);
    expect(m.root.children).toHaveLength(8);
  });

  it("points a crescent at the shooter and keeps it on them as the camera turns", () => {
    const m = mount();
    // Shot from the right (+x) while looking along −z.
    m.fx.hit({ key: 3, x: 20, z: 0 }, 30, false, m.clock());
    m.run(200, 0.7);
    expect(m.root.style["display"]).toBe("");
    const arc = m.arcs.find((a) => Number(a.style["opacity"]) > 0)!;
    expect(m.angle(arc)).toBeCloseTo(90, 0);
    // Turn to face them: it comes to the top. Turn away: it goes behind.
    m.run(100, 0.7, [1, 0]);
    expect(m.angle(arc)).toBeCloseTo(0, 0);
    m.run(100, 0.7, [-1, 0]);
    expect(Math.abs(m.angle(arc))).toBeCloseTo(180, 0);
    // Looking straight down there is no heading: it stays where it was.
    m.run(100, 0.7, [0, 0]);
    expect(Math.abs(m.angle(arc))).toBeCloseTo(180, 0);
    // Then it fades and the overlay hides again.
    m.run(ARC_MS + 200, 0.7);
    expect(Number(arc.style["opacity"])).toBe(0);
    expect(m.root.style["display"]).toBe("none");
  });

  it("shows hits from several directions at once, armour in its own colour", () => {
    const m = mount();
    m.fx.hit({ key: 1, x: 0, z: -30 }, 25, false, m.clock());
    m.fx.hit({ key: 2, x: 30, z: 0 }, 10, true, m.clock());
    m.fx.hit({ key: 3, x: 0, z: 30 }, 25, false, m.clock());
    m.run(100, 0.5);
    const live = m.arcs.filter((a) => Number(a.style["opacity"]) > 0);
    expect(live).toHaveLength(3);
    expect(live.map((a) => Math.abs(Math.round(m.angle(a)))).sort((x, y) => x - y)).toEqual([
      0, 90, 180,
    ]);
    expect(live.filter((a) => a.classes.has("armoured"))).toHaveLength(1);
  });

  it("flashes the screen's edge for any damage, with or without a direction, and lets it go", () => {
    const m = mount();
    m.fx.hit(null, 40, false, m.clock());
    m.run(32, 1);
    expect(Number(m.flash.style["opacity"])).toBeGreaterThan(0.5);
    // (A fall or the gas has no direction: no crescent.)
    expect(m.arcs.every((a) => !(Number(a.style["opacity"]) > 0))).toBe(true);
    m.run(1200, 1);
    expect(Number(m.flash.style["opacity"])).toBe(0);
    expect(m.root.style["display"]).toBe("none");
  });

  it("brings the blood in under half health, further as health falls, and clears it on healing", () => {
    const m = mount();
    const seen = () => Number(m.low.style["opacity"]);
    const reach = () => Number(/scale\(([\d.]+)\)/.exec(m.low.style["transform"] ?? "")?.[1]);
    m.run(1000, 0.51);
    expect(seen()).toBe(0);
    m.run(1000, 0.45);
    const at45 = seen(),
      reach45 = reach();
    expect(at45).toBeGreaterThan(0.5);
    m.run(1000, 0.25);
    const at25 = seen();
    expect(at25).toBeGreaterThan(at45);
    // (Drawn larger than the screen while faint: only its rim shows. Smaller scale = further in.)
    expect(reach()).toBeLessThan(reach45);
    m.run(1000, 0.05);
    expect(seen()).toBe(1);
    expect(reach()).toBe(1);
    // A heal: it eases off (not at a stroke) and is gone at half health.
    m.run(120, 0.8);
    expect(seen()).toBeGreaterThan(0);
    expect(seen()).toBeLessThan(1);
    m.run(2000, 0.8);
    expect(seen()).toBe(0);
    expect(m.root.style["display"]).toBe("none");
  });

  it("pulses under a quarter health, unless the player asked for less motion", () => {
    const values = (reducedMotion: boolean) => {
      const m = mount(reducedMotion);
      m.run(1500, 0.2);
      const seen = new Set<string>();
      for (let i = 0; i < 120; i++) {
        m.run(16, 0.2);
        seen.add(m.low.style["opacity"]!);
      }
      return seen.size;
    };
    expect(values(false)).toBeGreaterThan(3);
    expect(values(true)).toBe(1);
  });

  it("clears everything at once when the player is eliminated, and on a reset", () => {
    for (const how of ["eliminated", "reset"] as const) {
      const m = mount();
      m.fx.hit({ key: 1, x: 5, z: 5 }, 60, false, m.clock());
      m.run(300, 0.1);
      expect(m.root.style["display"]).toBe("");
      if (how === "eliminated") m.run(16, null);
      else m.fx.reset();
      expect(m.root.style["display"]).toBe("none");
      expect(Number(m.low.style["opacity"])).toBe(0);
      expect(Number(m.flash.style["opacity"])).toBe(0);
      expect(m.arcs.every((a) => Number(a.style["opacity"]) === 0)).toBe(true);
      expect(m.fx.stats()).toMatchObject({ shown: false, low: 0, flash: 0 });
      // Back alive at full health (a new match): still nothing, and the old crescent is gone.
      m.run(500, 1);
      expect(m.root.style["display"]).toBe("none");
    }
  });

  it("leaves nothing behind when the match is left", () => {
    const m = mount();
    m.fx.hit({ key: 1, x: 5, z: 5 }, 60, false, m.clock());
    m.run(100, 0.2);
    m.fx.dispose();
    expect(m.page.host.children).toHaveLength(0);
    // (The picture's memory is released with its canvas.)
    expect(m.low.width).toBe(0);
    // Late calls from a frame already under way do nothing.
    const writes = m.fx.stats().writes;
    m.fx.hit({ key: 2, x: 1, z: 1 }, 50, false, m.clock());
    m.run(100, 0.1);
    m.fx.dispose();
    expect(m.fx.stats().writes).toBe(writes);
  });
});
