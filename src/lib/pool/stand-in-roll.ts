import { recordShot } from "./play";
import { chooseStandInShot } from "./stand-in";
import type { Ball, ShotInput } from "./physics";
import type { TableState } from "./rules";
import type { StandInRoll } from "./stand-in.worker";

export type RolledStandIn = {
  shot: ShotInput;
  sequence: Ball[][];
  cue: { x: number; y: number };
  state: TableState;
  hash: string;
};

type Pending = {
  resolve: (value: RolledStandIn | null) => void;
};

let worker: Worker | null = null;
let failed = false;
let nextId = 0;
const pending = new Map<number, Pending>();

function rollHere(table: TableState, seed: Uint8Array, physicsId: string): RolledStandIn | null {
  const shot = chooseStandInShot(table, seed);
  const played = recordShot(table, shot, physicsId);
  if (!played) return null;
  return {
    shot,
    sequence: played.sequence,
    cue: { x: played.cue.x, y: played.cue.y },
    state: played.state,
    hash: played.hash,
  };
}

function cueWorker(): Worker | null {
  if (failed || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    const next = new Worker(new URL("./stand-in.worker.ts", import.meta.url), { type: "module" });
    next.onmessage = (event: MessageEvent<StandInRoll | { id: number; ok: false }>) => {
      const row = pending.get(event.data.id);
      if (!row) return;
      pending.delete(event.data.id);
      row.resolve(event.data.ok ? event.data : null);
    };
    next.onerror = () => {
      failed = true;
      worker = null;
      for (const row of pending.values()) row.resolve(null);
      pending.clear();
    };
    worker = next;
    return next;
  } catch {
    failed = true;
    return null;
  }
}

/** Start the stand-in worker before the first away shot, so that shot does not wait on module load. */
export function warmStandIn(): void {
  cueWorker();
}

/**
 * Roll the away shot off the canvas thread.
 * The cue pull keeps drawing while this runs. A worker that cannot start
 * rolls on the next turn of the event loop instead of the current frame.
 */
export function rollStandIn(
  table: TableState,
  seed: Uint8Array,
  physicsId: string,
): Promise<RolledStandIn | null> {
  const thread = cueWorker();
  if (!thread) {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          resolve(rollHere(table, seed, physicsId));
        } catch {
          resolve(null);
        }
      }, 0);
    });
  }
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    try {
      thread.postMessage({ id, table, seed: Array.from(seed), physicsId });
    } catch {
      pending.delete(id);
      resolve(rollHere(table, seed, physicsId));
    }
  });
}
