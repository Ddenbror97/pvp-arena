import type { TableState } from "./rules";
import type { ShotInput } from "./physics";
import type { PracticeRoll } from "./practice.worker";
/** One worker per Practice table, terminated on leave/restart. No main-thread search fallback. */
export function createPracticeClient() {
  const worker = new Worker(new URL("./practice.worker.ts", import.meta.url), { type: "module" });
  let next = 0,
    stopped = false;
  const pending = new Map<
    number,
    {
      resolve: (r: PracticeRoll) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const dispose = (reason = Error("Practice stopped.")) => {
    stopped = true;
    worker.terminate();
    for (const job of pending.values()) {
      clearTimeout(job.timer);
      job.reject(reason);
    }
    pending.clear();
  };
  worker.onmessage = ({ data }: MessageEvent<PracticeRoll | { id: number; error: string }>) => {
    const job = pending.get(data.id);
    if (!job) return;
    clearTimeout(job.timer);
    pending.delete(data.id);
    if ("error" in data) job.reject(Error(data.error));
    else job.resolve(data);
  };
  worker.onerror = () =>
    dispose(Error("The Practice worker could not continue. Start a fresh rack to retry."));
  return {
    dispose,
    roll(table: TableState, shot?: ShotInput): Promise<PracticeRoll> {
      return new Promise((resolve, reject) => {
        if (stopped) {
          reject(Error("Practice is stopped. Start a fresh rack to retry."));
          return;
        }
        if (pending.size) {
          reject(Error("A shot is already being prepared."));
          return;
        }
        const id = ++next;
        const timer = setTimeout(() => {
          dispose(Error("Shot planning took too long. Start a new rack to retry."));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        worker.postMessage({ id, table, ...(shot ? { shot } : {}) });
      });
    },
  };
}
