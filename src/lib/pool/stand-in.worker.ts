import { recordShot } from "./play";
import { chooseStandInShot } from "./stand-in";
import type { Ball, ShotInput } from "./physics";
import type { TableState } from "./rules";

type Job = {
  id: number;
  table: TableState;
  seed: number[];
  physicsId: string;
};

export type StandInRoll = {
  id: number;
  ok: true;
  shot: ShotInput;
  sequence: Ball[][];
  cue: { x: number; y: number };
  state: TableState;
  hash: string;
};

type Miss = { id: number; ok: false };

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Job>) => void) | null;
  postMessage: (message: StandInRoll | Miss) => void;
};

scope.onmessage = (event) => {
  const job = event.data;
  try {
    const shot = chooseStandInShot(job.table, Uint8Array.from(job.seed));
    const played = recordShot(job.table, shot, job.physicsId);
    if (!played) {
      scope.postMessage({ id: job.id, ok: false });
      return;
    }
    scope.postMessage({
      id: job.id,
      ok: true,
      shot,
      sequence: played.sequence,
      cue: { x: played.cue.x, y: played.cue.y },
      state: played.state,
      hash: played.hash,
    });
  } catch {
    scope.postMessage({ id: job.id, ok: false });
  }
};
