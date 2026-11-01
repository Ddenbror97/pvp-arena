import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("../src/lib/fps/pointer-capture", () => ({ capturePointer: capture }));

describe("automatic match-entry mouse handoff", () => {
  const body = {};
  const doc = { body, pointerLockElement: null as unknown, exitPointerLock: vi.fn() };
  beforeEach(() => {
    vi.resetModules();
    capture.mockReset().mockResolvedValue(undefined);
    doc.exitPointerLock.mockReset();
    doc.pointerLockElement = body;
    vi.stubGlobal("document", doc);
  });
  afterEach(() => vi.unstubAllGlobals());
  it("retains the incoming cash match's permission when the previous Practice unmounts", async () => {
    const entry = await import("../src/lib/fps/entry-capture");
    entry.reserveArenaPointer("cash-match");
    entry.releaseArenaPointer("previous-practice");
    await Promise.resolve();
    expect(doc.exitPointerLock).not.toHaveBeenCalled();
    entry.releaseArenaPointer("cash-match");
    expect(doc.exitPointerLock).toHaveBeenCalledOnce();
  });
  it("releases a late mouse grant if the start request failed", async () => {
    let grant!: () => void;
    capture.mockReturnValue(
      new Promise<void>((resolve) => {
        grant = resolve;
      }),
    );
    const entry = await import("../src/lib/fps/entry-capture");
    doc.pointerLockElement = null;
    entry.reserveArenaPointer();
    entry.releaseArenaPointer();
    doc.pointerLockElement = body;
    grant();
    await Promise.resolve();
    expect(doc.exitPointerLock).toHaveBeenCalledOnce();
  });
  it("does not let an old cancelled grant release a newer match's mouse permission", async () => {
    let oldGrant!: () => void;
    capture.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        oldGrant = resolve;
      }),
    );
    const entry = await import("../src/lib/fps/entry-capture");
    doc.pointerLockElement = null;
    entry.reserveArenaPointer("old");
    entry.releaseArenaPointer("old");
    entry.reserveArenaPointer("new");
    doc.pointerLockElement = body;
    oldGrant();
    await Promise.resolve();
    expect(doc.exitPointerLock).not.toHaveBeenCalled();
  });
});
