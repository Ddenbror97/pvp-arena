import { describe, it, expect, vi } from "vitest";
import { capturePointer } from "../src/lib/fps/pointer-capture";

function setup(request: (raw: boolean, capture: () => void) => Promise<void> | void) {
  const target = new EventTarget();
  const doc = Object.assign(target, { pointerLockElement: null as object | null });
  const canvas = {
    requestPointerLock: vi.fn((options?: { unadjustedMovement?: boolean }) =>
      request(!!options?.unadjustedMovement, () => {
        doc.pointerLockElement = canvas;
        doc.dispatchEvent(new Event("pointerlockchange"));
      }),
    ),
  };
  return {
    doc: doc as unknown as Document,
    canvas: canvas as unknown as HTMLCanvasElement,
    request: canvas.requestPointerLock,
  };
}
describe("browser pointer capture", () => {
  it("requests raw movement and waits for the actual lock event", async () => {
    const f = setup((_raw, capture) => {
      queueMicrotask(capture);
      return Promise.resolve();
    });
    await capturePointer(f.canvas, f.doc);
    expect(f.request.mock.calls[0]?.[0]).toEqual({ unadjustedMovement: true });
  });
  it("falls back once when raw input is unsupported", async () => {
    const f = setup((raw, capture) => {
      if (raw) return Promise.reject(new DOMException("raw unavailable", "NotSupportedError"));
      queueMicrotask(capture);
      return Promise.resolve();
    });
    await capturePointer(f.canvas, f.doc);
    expect(f.request).toHaveBeenCalledTimes(2);
    expect(f.request.mock.calls[1]).toEqual([]);
  });
  it("does not retry a user or browser permission denial", async () => {
    const f = setup(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    await expect(capturePointer(f.canvas, f.doc)).rejects.toThrow("denied");
    expect(f.request).toHaveBeenCalledTimes(1);
  });
  it("supports browsers that return void instead of a promise", async () => {
    const f = setup((_raw, capture) => {
      queueMicrotask(capture);
    });
    await capturePointer(f.canvas, f.doc);
    expect(f.doc.pointerLockElement).toBe(f.canvas);
  });
});
