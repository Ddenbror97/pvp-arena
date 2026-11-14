import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openMatchSocket,
  REFUSED_LIMIT,
  type MatchSocketOptions,
} from "../src/lib/fps/match-socket";

/** The shared match connection (1v1, Defuse the Bomb, Battle Royale) against a scripted socket. */
class FakeSocket {
  static all: FakeSocket[] = [];
  readonly OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  closedWith: [number?, string?] | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  constructor(readonly url: string | URL) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number, reason?: string) {
    this.closedWith = [code, reason];
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  drop(code: number, reason = "") {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}
const tick = () => vi.advanceTimersByTimeAsync(0);
function connection(over: Partial<MatchSocketOptions<{ url: string }>> = {}) {
  const ref = { current: null as WebSocket | null };
  const frames: unknown[] = [];
  const attempts: number[] = [];
  const link = openMatchSocket<{ url: string }>({
    ref,
    connecting: (attempt) => void attempts.push(attempt),
    admit: async () => ({ url: "wss://room.test/socket" }),
    address: (ticket) => ticket.url,
    maxFrame: 100,
    frame: (data) => void frames.push(data),
    closed: (event, attempt) => (event.code === 1008 ? null : 500 * (attempt + 1)),
    admitFailed: (_, attempt) => 1000 * attempt,
    ...over,
  });
  return { ref, frames, attempts, link };
}

describe("match socket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.all = [];
    vi.stubGlobal("WebSocket", FakeSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("answers pings and hands the mode every other frame", async () => {
    const c = connection();
    await tick();
    const ws = FakeSocket.all[0]!;
    ws.open();
    ws.onmessage!({ data: JSON.stringify({ v: 1, type: "ping", id: "abc" }) });
    ws.onmessage!({ data: JSON.stringify({ v: 1, type: "ping", id: "x".repeat(65) }) });
    ws.onmessage!({ data: JSON.stringify({ v: 1, type: "welcome" }) });
    ws.onmessage!({ data: "not json" });
    ws.onmessage!({ data: "x".repeat(101) });
    ws.onmessage!({ data: new ArrayBuffer(4) });
    expect(ws.sent).toEqual([JSON.stringify({ v: 1, type: "pong", id: "abc" })]);
    expect(c.frames).toEqual([{ v: 1, type: "welcome" }]);
  });

  it("reconnects with the mode's back-off until the connection is settled again", async () => {
    const c = connection({ opened: (link) => link.settled() });
    await tick();
    FakeSocket.all[0]!.drop(1006);
    expect(c.ref.current).toBeNull();
    await vi.advanceTimersByTimeAsync(499);
    expect(FakeSocket.all).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1]!.drop(1006);
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(3);
    expect(c.attempts).toEqual([0, 1, 2]);
    FakeSocket.all[2]!.open();
    FakeSocket.all[2]!.drop(1006);
    await vi.advanceTimersByTimeAsync(500);
    expect(c.attempts).toEqual([0, 1, 2, 1]);
  });

  it("stops on a final close, and on the mode's stop()", async () => {
    connection();
    await tick();
    FakeSocket.all[0]!.drop(1008, "Session revoked");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(1);

    const closed = vi.fn(() => 100);
    connection({
      closed,
      frame: (_, link) => {
        link.stop();
        link.ws.close(4409, "Game version mismatch");
      },
    });
    await tick();
    const ws = FakeSocket.all[1]!;
    ws.open();
    ws.onmessage!({ data: JSON.stringify({ type: "welcome" }) });
    ws.drop(4409);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(closed).not.toHaveBeenCalled();
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("retries a failed admission, and leaving ends everything", async () => {
    let fail = true;
    const c = connection({
      admit: async () => {
        if (fail) throw new Error("down");
        return { url: "wss://room.test/socket" };
      },
    });
    await tick();
    expect(FakeSocket.all).toHaveLength(0);
    fail = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(1);
    const ws = FakeSocket.all[0]!;
    ws.open();
    c.link.close("Leaving");
    expect(ws.closedWith).toEqual([1000, "Leaving"]);
    expect(ws.onmessage).toBeNull();
    expect(c.ref.current).toBeNull();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it("stops after REFUSED_LIMIT sockets refused before opening, and starts over on `again`", async () => {
    let again: (() => void) | null = null;
    const c = connection({ unreachable: (a) => void (again = a) });
    for (let k = 0; k < REFUSED_LIMIT; k++) {
      await tick();
      FakeSocket.all[k]!.drop(1006);
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(again).not.toBeNull();
    // No more sockets while the page shows the error.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(REFUSED_LIMIT);
    again!();
    await tick();
    expect(FakeSocket.all).toHaveLength(REFUSED_LIMIT + 1);
    expect(c.attempts.at(-1)).toBe(0);
    c.link.close("left");
  });

  it("an opened socket resets the refusals (drops mid-match keep reconnecting)", async () => {
    const unreachable = vi.fn();
    connection({ unreachable });
    for (let k = 0; k < REFUSED_LIMIT * 2; k++) {
      await tick();
      const ws = FakeSocket.all[k]!;
      if (k % 2 === 0) ws.open();
      ws.drop(1006);
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(unreachable).not.toHaveBeenCalled();
  });

  it("`again` after leaving does nothing", async () => {
    let again: (() => void) | null = null;
    const c = connection({ unreachable: (a) => void (again = a) });
    for (let k = 0; k < REFUSED_LIMIT; k++) {
      await tick();
      FakeSocket.all[k]!.drop(1006);
      await vi.advanceTimersByTimeAsync(5000);
    }
    c.link.close("left");
    again!();
    await tick();
    expect(FakeSocket.all).toHaveLength(REFUSED_LIMIT);
  });
});
