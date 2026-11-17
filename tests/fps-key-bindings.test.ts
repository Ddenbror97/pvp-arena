import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultStrikeBinds,
  readStrikeBinds,
  rebindStrike,
  saveStrikeBinds,
  strikeKey,
} from "../src/lib/fps/key-bindings";
afterEach(() => vi.unstubAllGlobals());
describe("1v1 and 5v5 device key bindings", () => {
  it("swaps occupied keys and maps movement into the existing wire vocabulary", () => {
    const keys = rebindStrike(defaultStrikeBinds(), "forward", "KeyS");
    expect(strikeKey("KeyS", keys)).toBe("KeyW");
    expect(strikeKey("KeyW", keys)).toBe("KeyS");
    expect(new Set(Object.values(keys)).size).toBe(Object.keys(keys).length);
  });
  it("releases rebound keys using the same translation and disables their old default", () => {
    const keys = rebindStrike(defaultStrikeBinds(), "use", "KeyG");
    const held = new Set([strikeKey("KeyG", keys)]);
    expect(held.has("KeyE")).toBe(true);
    held.delete(strikeKey("KeyG", keys));
    expect(held.size).toBe(0);
    expect(strikeKey("KeyE", keys)).toBe("");
  });
  it("keeps the old grenade and modifier aliases until their action is rebound", () => {
    const keys = defaultStrikeBinds();
    expect(strikeKey("Digit5", keys)).toBe("Digit4");
    expect(strikeKey("ControlRight", keys)).toBe("ControlLeft");
    expect(strikeKey("Digit5", rebindStrike(keys, "grenade", "KeyG"))).toBe("");
    expect(strikeKey("ShiftRight", rebindStrike(keys, "walk", "KeyV"))).toBe("");
  });
  it("does not bind the settings, reload-page or diagnostic keys", () => {
    const keys = defaultStrikeBinds();
    for (const code of ["Escape", "F3", "F5", "F11", "MetaLeft", "bad key"])
      expect(rebindStrike(keys, "reload", code)).toBe(keys);
  });
  it("persists bindings and safely rejects duplicate or corrupted storage", () => {
    let saved = "{}";
    vi.stubGlobal("localStorage", {
      getItem: () => saved,
      setItem: (_: string, v: string) => {
        saved = v;
      },
    });
    const keys = rebindStrike(defaultStrikeBinds(), "buy", "KeyP");
    saveStrikeBinds(keys);
    expect(readStrikeBinds()).toEqual(keys);
    saved = JSON.stringify({ forward: "KeyS" });
    expect(readStrikeBinds()).toEqual(defaultStrikeBinds());
    saved = "broken";
    expect(readStrikeBinds()).toEqual(defaultStrikeBinds());
  });
});
