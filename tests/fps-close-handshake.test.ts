import { describe, expect, it, vi } from "vitest";
import { DuelRoom } from "../workers/fps/index";
describe("Durable Object peer close replies", () => {
  it("replies to valid close codes and normalizes reserved wire sentinels", () => {
    for (const [received, expected] of [
      [1000, 1000],
      [1005, 1000],
      [1006, 1000],
      [4001, 4001],
    ]) {
      const socket = {
        readyState: 2,
        close: vi.fn(),
        deserializeAttachment: () => ({ seat: "A" }),
      };
      const room = { ctx: { getWebSockets: () => [] }, absent: { A: null }, inputs: { A: [1] } };
      DuelRoom.prototype.webSocketClose.call(room as never, socket as never, received);
      expect(socket.close).toHaveBeenCalledWith(expected, "Connection closed");
      expect(room.inputs.A).toEqual([]);
      expect(room.absent.A).toBeTypeOf("number");
    }
  });
  it("does not replace a server-initiated policy close", () => {
    const socket = { readyState: 2, close: vi.fn(), deserializeAttachment: () => ({ seat: null }) };
    DuelRoom.prototype.webSocketClose.call({} as never, socket as never);
    expect(socket.close).not.toHaveBeenCalled();
  });
});
