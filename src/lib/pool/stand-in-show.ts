import type { Seat } from "./rules";

/**
 * What the table is allowed to show while a stand-in shot is on screen.
 * The server commits that shot during the cue pull. The picture keeps the
 * rack the cue aimed at until the balls have been watched and the server
 * shot is the one on the table.
 */
export type StandInTableView = {
  status: string;
  standIn: Seat | null;
  turn: Seat | null;
  shot: number;
  winner: Seat | null;
  lastKind: "shot" | "timeout" | "forfeit" | null;
  lastStandIn: boolean;
};

export type StandInRackAction = "keep" | "abort" | "idle";

function awayTurn(live: StandInTableView): boolean {
  return (
    live.status === "PLAYING" &&
    live.winner == null &&
    (live.standIn === "A" || live.standIn === "B") &&
    live.turn === live.standIn
  );
}

/** True when this view is an away seat's turn and a cue may aim. */
export function standInShouldAim(live: StandInTableView): boolean {
  return awayTurn(live);
}

/**
 * `showing` is the shot number whose pre-shot rack is frozen.
 * Null means the live server rack is on screen.
 */
export function standInRackAction(
  showing: number | null,
  live: StandInTableView,
): StandInRackAction {
  if (showing == null) return "idle";
  if (live.status === "CANCELLED") return "abort";
  if (live.shot === showing) return awayTurn(live) ? "keep" : "abort";
  if (live.lastKind === "timeout" || live.lastKind === "forfeit") return "abort";
  if (live.lastKind === "shot" && !live.lastStandIn) return "abort";
  return "keep";
}

/** The frozen rack can leave once the server has published this shot. */
export function standInRackReady(showing: number, serverShot: number): boolean {
  return serverShot > showing;
}
