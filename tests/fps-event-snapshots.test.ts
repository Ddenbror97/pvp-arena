import { expect, it } from "vitest";
import { DuelRoom } from "../workers/fps/index";
import { createMatch } from "../src/lib/fps/simulation";

it("does not replay raw last-tick shots when a settled room sends its final state", () => {
  const state = createMatch({ A: "a", B: "b" }, 5, 0);
  state.phase = "completed";
  state.events = [{ type: "shot", seat: "A", text: "rifle fired", shotSeq: 12 }];
  const room = { saved: { state, settled: true }, events: [] as typeof state.events };
  const frame = Reflect.get(DuelRoom.prototype, "snapshot").call(room);
  expect(frame.state.events).toEqual([]);
  expect(frame.state).not.toHaveProperty("server");
  expect(state.events).toHaveLength(1);
  room.events = [{ type: "shot", seat: "A", text: "rifle fired", shotSeq: 15, id: 42 }];
  expect(Reflect.get(DuelRoom.prototype, "snapshot").call(room).state.events[0].id).toBe(42);
});
