/**
 * Dealer frame clips. The director still owns when a pose starts. These tests
 * cover the player that turns a pose into ordered stills, and the files those
 * stills come from.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/assets/poker/dealer/manifest.json";
import {
  DEALER_CLIPS,
  DEALER_RESTING,
  DealerClipRunner,
  clipActiveMs,
  clipForPose,
  clipFrames,
  type DealerClipId,
} from "../src/lib/poker/dealer-clips";
import type { DealerPose } from "../src/lib/poker/director";
import { loadDealerFrame } from "../src/lib/poker/dealer-frames";

const root = process.cwd();
const poses: DealerPose[] = ["intro", "idle", "shuffle", "deal", "reveal", "wait", "acknowledge"];

describe("dealer clips", () => {
  it("keeps shuffle, deal, wink, and the win reaction inside their timing ranges", () => {
    expect(clipActiveMs("shuffle")).toBeGreaterThanOrEqual(1000);
    expect(clipActiveMs("shuffle")).toBeLessThanOrEqual(1800);
    expect(clipActiveMs("deal")).toBeGreaterThanOrEqual(500);
    expect(clipActiveMs("deal")).toBeLessThanOrEqual(900);
    expect(clipActiveMs("wink")).toBeGreaterThanOrEqual(300);
    expect(clipActiveMs("wink")).toBeLessThanOrEqual(500);
    expect(clipActiveMs("celebrate")).toBeGreaterThanOrEqual(1000);
    expect(clipActiveMs("celebrate")).toBeLessThanOrEqual(1500);
  });

  it("orders the shuffle and the deal from the poses that actually show that motion", () => {
    expect(clipFrames("shuffle")).toEqual([
      "shuffle-01",
      "shuffle-02",
      "shuffle-03",
      "shuffle-05",
      "shuffle-01",
    ]);
    expect(clipFrames("deal")).toEqual(["deal-out-1", "deal-out-2", "deal-back-1", "deal-back-2"]);
    expect(clipFrames("deal")).not.toContain("deal-03");
    expect(clipFrames("deal")).not.toContain("deal-04");
    expect(clipFrames("deal")).not.toContain("deal-06");
  });

  it("does not restart a pose the director is already showing", () => {
    const runner = new DealerClipRunner();
    const token = runner.pose("shuffle", 0, false);
    const mid = runner.sample(400).frame;
    expect(mid).not.toBe("shuffle-01");
    expect(runner.pose("shuffle", 5000, false)).toBe(token);
    expect(runner.sample(400).frame).toBe(mid);
  });

  it("lets a deal replace a shuffle on the first dealing pose", () => {
    const runner = new DealerClipRunner();
    runner.pose("shuffle", 0, false);
    runner.pose("deal", 400, false);
    expect(runner.sample(400)).toMatchObject({ clip: "deal", frame: "deal-out-1" });
  });

  it("ignores an idle wink during a deal and during a player's turn", () => {
    const runner = new DealerClipRunner();
    const token = runner.pose("deal", 0, false);
    expect(runner.nudge("wink", 30)).toBe(token);
    expect(runner.sample(30).clip).toBe("deal");
    const waiting = runner.pose("wait", 40, false);
    expect(runner.nudge("wink", 50)).toBe(waiting);
    expect(runner.sample(50).clip).toBe("wait");
  });

  it("returns a wink to idle and lets a win replace waiting", () => {
    const runner = new DealerClipRunner();
    runner.pose("idle", 0, false);
    runner.nudge("wink", 100);
    expect(runner.sample(100).frame).toBe("wink");
    expect(runner.sample(519).frame).toBe("wink");
    expect(runner.sample(520)).toMatchObject({ frame: "idle", clip: "idle" });

    const table = new DealerClipRunner();
    table.pose("wait", 0, false);
    expect(table.sample(0).frame).toBe("waiting");
    expect(table.sample(8000).frame).toBe("waiting");
    table.pose("acknowledge", 9000, false);
    expect(table.sample(9000)).toMatchObject({ clip: "celebrate", frame: "celebrate" });
    expect(table.sample(10200)).toMatchObject({ clip: "idle", frame: "idle" });
  });

  it("holds one resting pose when motion is reduced", () => {
    const runner = new DealerClipRunner();
    runner.pose("shuffle", 0, true);
    expect(runner.sample(0)).toMatchObject({ frame: "shuffle-01", nextAt: null });
    expect(runner.sample(5000)).toMatchObject({ frame: "shuffle-01", nextAt: null });
    runner.play("deal", 6000, true);
    expect(runner.sample(6000).frame).toBe("deal-out-2");
    expect(runner.sample(9000).frame).toBe("deal-out-2");
  });

  it("freezes elapsed time while the page is hidden", () => {
    const runner = new DealerClipRunner();
    runner.pose("shuffle", 0, false);
    const at = runner.sample(200).frame;
    runner.pause(200);
    expect(runner.sample(900)).toMatchObject({ frame: at, nextAt: null });
    runner.resume(900);
    expect(runner.sample(900).frame).toBe(at);
    expect(runner.sample(900).nextAt).not.toBeNull();
  });

  it("starts from the current pose after a reconnect and drops a disposed player", () => {
    const runner = new DealerClipRunner();
    runner.pose("shuffle", 0, false);
    runner.pose("idle", 10, false);
    expect(runner.sample(10).frame).toBe("idle");
    expect(runner.sample(500)).toMatchObject({ frame: "idle", clip: "idle" });

    const gone = new DealerClipRunner();
    gone.pose("deal", 0, false);
    gone.dispose();
    const token = gone.pose("shuffle", 20, false);
    expect(gone.play("celebrate", 30)).toBe(token);
    expect(gone.sample(40)).toEqual({ frame: "idle", clip: "idle", nextAt: null });
  });

  it("keeps only the latest pose when updates arrive together", () => {
    const runner = new DealerClipRunner();
    runner.pose("shuffle", 0, false);
    runner.pose("deal", 10, false);
    runner.pose("wait", 20, false);
    runner.pose("acknowledge", 30, false);
    runner.pose("idle", 40, false);
    expect(runner.sample(40).clip).toBe("idle");
    expect(runner.play("missing" as DealerClipId, 50)).toBeTypeOf("number");
    expect(runner.sample(50).clip).toBe("idle");
  });

  it("maps every director pose onto a clip whose frames exist", () => {
    const ids = new Set(manifest.frames.map((frame) => frame.id));
    for (const pose of poses) {
      const clip = clipForPose(pose);
      expect(DEALER_CLIPS[clip].frames.length).toBeGreaterThan(0);
      expect(ids.has(DEALER_RESTING[pose])).toBe(true);
      for (const frame of clipFrames(clip)) expect(ids.has(frame)).toBe(true);
    }
    for (const id of Object.keys(DEALER_CLIPS) as DealerClipId[]) {
      for (const frame of clipFrames(id)) expect(ids.has(frame)).toBe(true);
    }
    const overlap = [
      "deal-03",
      "deal-04",
      "deal-06",
      "deal-reach",
      "shuffle-04",
      "playful-2",
      "thoughtful",
      "celebrate-b2",
      "point-b2",
      "wait-b2",
      "fan-b2",
      "blow-kiss",
    ];
    for (const id of ["idle", "wink", "intro", "shuffle", "deal", "reveal", "wait", "celebrate"] as const) {
      for (const frame of clipFrames(id)) expect(overlap).not.toContain(frame);
    }
  });
});

describe("dealer frame files", () => {
  it("extracts 10 poses from sheet A and 21 from sheet B onto one canvas", () => {
    const ids = manifest.frames.map((frame) => frame.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(manifest.frames.filter((frame) => frame.sheet === "a")).toHaveLength(10);
    expect(manifest.frames.filter((frame) => frame.sheet === "b")).toHaveLength(21);
    expect(manifest.frames.filter((frame) => frame.sheet === "c")).toHaveLength(4);
    expect(manifest.canvas).toEqual({ w: 640, h: 674 });
    for (const frame of manifest.frames) {
      expect(frame.anchor).toEqual(manifest.anchor);
      expect(frame.file).toBe(`frames/${frame.id}.webp`);
    }
    const ax = manifest.anchor[0] / manifest.canvas.w;
    expect(ax).toBeGreaterThan(0.32);
    expect(ax).toBeLessThan(0.42);
  });

  it("stores transparent webp frames and the original sheets", () => {
    for (const frame of manifest.frames) {
      const bytes = readFileSync(join(root, "src/assets/poker/dealer", frame.file));
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(bytes.includes(Buffer.from("ALPH"))).toBe(true);
    }
    for (const name of ["sheet-a.png", "sheet-b.png", "sheet-c.png"]) {
      const png = readFileSync(join(root, "src/assets/poker/dealer/source", name));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png[25]).toBe(6);
    }
  });

  it("rejects an unknown pose and does not alias it to idle", async () => {
    await expect(loadDealerFrame("not-a-pose")).rejects.toThrow(/missing dealer frame/);
    const first = loadDealerFrame("wink");
    const second = loadDealerFrame("wink");
    const url = await first;
    expect(await second).toBe(url);
    expect(url).toContain("wink");
    expect(url).not.toContain("idle.webp");
  });

  it("keeps the head on the anchor and leaves the poker director alone", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain('.poker-stage-dealer.poker-dealer[data-frames="1"]');
    expect(css).toContain("poker-dealer-breath");
    expect(css).toContain("animation: none");
    const director = readFileSync(join(root, "src/lib/poker/director.ts"), "utf8");
    expect(director).not.toContain("dealer-clips");
    expect(director).not.toContain("dealer-frames");
    const dealer = readFileSync(join(root, "src/components/poker/Dealer.tsx"), "utf8");
    expect(dealer).toContain("DEALER_IMAGE");
    expect(dealer).toContain("setFramesOk(false)");
    expect(dealer).toContain("poker-dealer-fallback");
  });
});
