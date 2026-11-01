import { afterEach, expect, it, vi } from "vitest";
import {
  readStrikeSettings,
  saveStrikeSettings,
  DEFAULT_STRIKE_SETTINGS,
} from "../src/lib/fps/settings";
afterEach(() => vi.unstubAllGlobals());
it("restores, bounds and validates device preferences", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      JSON.stringify({ sensitivity: 50, volume: -2, crosshair: 8, color: "url(secret)" }),
  });
  expect(readStrikeSettings()).toEqual({ ...DEFAULT_STRIKE_SETTINGS, sensitivity: 3, volume: 0 });
});
it("survives blocked storage and malformed preferences", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "null",
    setItem: () => {
      throw Error("blocked");
    },
  });
  expect(readStrikeSettings()).toEqual(DEFAULT_STRIKE_SETTINGS);
  expect(() => saveStrikeSettings(DEFAULT_STRIKE_SETTINGS)).not.toThrow();
});
it("saves and restores all five crosshairs and custom colors", () => {
  let stored = "";
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
  for (let crosshair = 0; crosshair < 5; crosshair++) {
    const value = { sensitivity: 1.45, volume: 0.35, crosshair, color: "#12abcd" };
    saveStrikeSettings(value);
    expect(readStrikeSettings()).toEqual(value);
  }
});
