import { describe, expect, it } from "vitest";
import {
  wheelAvatarCenter,
  wheelShowsAvatar,
  wheelTextureQuiet,
  winnerShade,
  WHEEL_AVATAR_MIN_DEG,
  WHEEL_R,
} from "../src/lib/jackpot/wheel-picture";

describe("jackpot wheel picture", () => {
  it("hides faces that would stack, including a full 100-player wheel", () => {
    expect(wheelShowsAvatar(WHEEL_AVATAR_MIN_DEG)).toBe(false);
    expect(wheelShowsAvatar(WHEEL_AVATAR_MIN_DEG + 0.1)).toBe(true);
    expect(wheelShowsAvatar(360 / 100)).toBe(false);
    expect(wheelShowsAvatar(180)).toBe(true);
  });

  it("places a face on the ring, not the hub", () => {
    const center = wheelAvatarCenter(0, 180);
    const dx = center.x - WHEEL_R;
    const dy = center.y - WHEEL_R;
    const radius = Math.hypot(dx, dy);
    expect(radius).toBeGreaterThan(140);
    expect(radius).toBeLessThan(190);
  });

  it("dims every slice except the winner without touching the rotor", () => {
    const shade = winnerShade(20, 70);
    expect(shade).toContain("from 20.000deg");
    expect(shade).toContain("transparent 0deg 50.000deg");
    expect(shade).toContain("color-mix(in srgb, var(--background) 78%, transparent)");
  });

  it("holds a new texture back during the crawl and allows it once the wheel has stopped", () => {
    expect(wheelTextureQuiet(800, true)).toBe(true);
    expect(wheelTextureQuiet(800, false)).toBe(false);
    expect(wheelTextureQuiet(4_000, true)).toBe(false);
    expect(wheelTextureQuiet(-10, true)).toBe(false);
  });
});
