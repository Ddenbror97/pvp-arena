import { beforeEach, describe, expect, it } from "vitest";
import {
  BR_ACTION_IDS,
  DEFAULT_BR_SETTINGS,
  VIEW_DISTANCES,
  keyLabel,
  readBrSettings,
  rebind,
  saveBrSettings,
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
  it("defaults to medium view and unique keys for every action", () => {
    const s = readBrSettings();
    expect(s.view).toBe("medium");
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
    saveBrSettings({ view: "low", binds: rebind(DEFAULT_BR_SETTINGS.binds, "interact", "KeyF") });
    expect(readBrSettings().view).toBe("low");
    expect(readBrSettings().binds.interact).toBe("KeyF");
    localStorage.setItem(
      "br-settings",
      JSON.stringify({ view: "giant", binds: { forward: "KeyZ", back: "KeyZ", jump: "F3" } }),
    );
    const s = readBrSettings();
    expect(s.view).toBe("medium");
    expect(s.binds.forward).toBe("KeyZ");
    expect(s.binds.back).toBe("KeyS"); // the duplicate falls back to its default
    expect(s.binds.jump).toBe("Space"); // reserved
  });
  it("keeps the cover range for everyone at every view distance", () => {
    for (const v of Object.values(VIEW_DISTANCES)) {
      expect(v.trees).toBeGreaterThanOrEqual(1500);
      expect(v.fog[0]).toBeGreaterThan(1000); // players are sent within 1 km: never fogged out
    }
    expect(keyLabel("ShiftLeft")).toBe("Left Shift");
    expect(keyLabel("KeyQ")).toBe("Q");
  });
});
