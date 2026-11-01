import type { MatchState, Seat } from "./protocol";
type Sides = Pick<MatchState, "round" | "bestOf" | "sideVersion">;
export const halftimeRound = (state: Pick<MatchState, "bestOf">) => Math.floor(state.bestOf / 2);
/** Seats identify people and scores; sides identify spawns and character models. */
export function spawnSide(state: Sides, seat: Seat): Seat {
  const switched =
    state.sideVersion === 1 ? state.round > halftimeRound(state) : state.round % 2 === 0;
  return switched ? (seat === "A" ? "B" : "A") : seat;
}
export function characterSide(state: Sides, seat: Seat): Seat {
  return state.sideVersion === 1 ? spawnSide(state, seat) : seat;
}
export function sideName(state: Sides, seat: Seat) {
  return characterSide(state, seat) === "A" ? "Police" : "Terrorist";
}
export function isHalftime(state: Pick<MatchState, "round" | "bestOf" | "sideVersion" | "phase">) {
  return (
    state.sideVersion === 1 && state.phase === "round-end" && state.round === halftimeRound(state)
  );
}
