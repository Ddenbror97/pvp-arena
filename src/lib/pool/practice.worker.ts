import { choosePracticeShot } from "./practice-bot";
import { recordShot } from "./play";
import type { TableState } from "./rules";
import type { ShotInput } from "./physics";
export type PracticeJob = { id: number; table: TableState; shot?: ShotInput };
export type PracticeRoll = {
  id: number;
  shot: ShotInput;
  played: NonNullable<ReturnType<typeof recordShot>>;
};
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PracticeJob>) => void) | null;
  postMessage: (message: PracticeRoll | { id: number; error: string }) => void;
};
scope.onmessage = ({ data }) => {
  try {
    const shot = data.shot ?? choosePracticeShot(data.table);
    const played = recordShot(data.table, shot);
    if (!played)
      throw Error("That shot is not legal. Place the cue ball and call a pocket for the 8.");
    scope.postMessage({ id: data.id, shot, played });
  } catch (error) {
    scope.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : "Could not plan this shot.",
    });
  }
};
