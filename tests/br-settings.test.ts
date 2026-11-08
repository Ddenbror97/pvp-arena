import { beforeEach, describe, expect, it } from "vitest";
import {
  BR_ACTION_IDS,
  DEFAULT_BR_SETTINGS,
  VIEW_RANGE,
  keyLabel,
  readBrSettings,
  rebind,
  saveBrSettings,
  viewParams,
} from "@/lib/fps/br/br-settings";

describe("battle royale settings", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });
  it("defaults to a 1,800 m view and unique keys for every action", () => {
    const s = readBrSettings();
    expect(s.view).toBe(1800);
    expect(new Set(Object.values(s.binds)).size).toBe(BR_ACTION_IDS.length);
  });
  it("swaps keys when one is taken, and refuses reserved keys", () => {
    const b = rebind(DEFAULT_BR_SETTINGS.binds, "crouch", "KeyW");
    expect(b.crouch).toBe("KeyW");
    expect(b.forward).toBe("KeyC");
    expect(rebind(b, "jump", "Escape")).toBe(b);
    expect(new Set(Object.values(b)).size).toBe(BR_ACTION_IDS.length);
  });
  it("saves and reads back, ignoring broken or duplicate stored values", () => {
    saveBrSettings({ view: 2650, binds: rebind(DEFAULT_BR_SETTINGS.binds, "interact", "KeyF") });
    expect(readBrSettings().view).toBe(2650);
    expect(readBrSettings().binds.interact).toBe("KeyF");
    localStorage.setItem(
      "br-settings",
      JSON.stringify({ view: "giant", binds: { forward: "KeyZ", back: "KeyZ", jump: "F3" } }),
    );
    const s = readBrSettings();
    expect(s.view).toBe(1800);
    expect(s.binds.forward).toBe("KeyZ");
    expect(s.binds.back).toBe("KeyS"); // the duplicate falls back to its default
    expect(s.binds.jump).toBe("Space"); // reserved
  });
  it("puts the knife on 3 and the bandage on 6, also for a set saved before the knife", () => {
    expect(DEFAULT_BR_SETTINGS.binds.knife).toBe("Digit3");
    expect(DEFAULT_BR_SETTINGS.binds.bandage).toBe("Digit6");
    expect(DEFAULT_BR_SETTINGS.binds.inspect).toBe("KeyF");
    const old = { ...DEFAULT_BR_SETTINGS.binds, bandage: "Digit3", crouch: "KeyQ" } as Record<
      string,
      string
    >;
    delete old["knife"];
    delete old["inspect"];
    localStorage.setItem("br-settings", JSON.stringify({ view: 1800, binds: old }));
    const s = readBrSettings();
    expect(s.binds.knife).toBe("Digit3");
    expect(s.binds.bandage).toBe("Digit6");
    expect(s.binds.inspect).toBe("KeyF");
    expect(s.binds.crouch).toBe("KeyQ"); // the rest of the stored set is kept
    // A stored key already on F: inspect takes a free spare key instead of resetting everything.
    localStorage.setItem(
      "br-settings",
      JSON.stringify({ view: 1800, binds: { ...old, bandage: "Digit6", interact: "KeyF" } }),
    );
    const t = readBrSettings();
    expect(t.binds.interact).toBe("KeyF");
    expect(t.binds.inspect).toBe("Digit7");
    expect(new Set(Object.values(t.binds)).size).toBe(BR_ACTION_IDS.length);
  });
  it("reads the old presets and out-of-range values onto the slider", () => {
    localStorage.setItem("br-settings", JSON.stringify({ view: "ultra" }));
    expect(readBrSettings().view).toBe(3000);
    localStorage.setItem("br-settings", JSON.stringify({ view: 99999 }));
    expect(readBrSettings().view).toBe(VIEW_RANGE.max);
    localStorage.setItem("br-settings", JSON.stringify({ view: 10 }));
    expect(readBrSettings().view).toBe(VIEW_RANGE.min);
  });
  it("keeps the cover range for everyone along the whole slider, and grows with it", () => {
    let last = viewParams(VIEW_RANGE.min);
    for (let m = VIEW_RANGE.min; m <= VIEW_RANGE.max; m += VIEW_RANGE.step) {
      const v = viewParams(m);
      expect(v.trees).toBeGreaterThanOrEqual(1500);
      expect(v.fog[0]).toBeGreaterThan(1000); // players are sent within 1 km: never fogged out
      expect(v.fog[1]).toBeGreaterThan(v.fog[0]);
      expect(v.far).toBeGreaterThanOrEqual(v.fog[1]);
      for (const k of ["far", "trees", "detail", "ground"] as const)
        expect(v[k]).toBeGreaterThanOrEqual(last[k]);
      last = v;
    }
    expect(viewParams(1800)).toEqual({
      fog: [1800, 9500],
      far: 14000,
      trees: 1500,
      detail: 1,
      ground: 140,
    });
    expect(keyLabel("ShiftLeft")).toBe("Left Shift");
    expect(keyLabel("KeyQ")).toBe("Q");
  });
});
