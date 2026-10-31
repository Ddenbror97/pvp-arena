type AbortableRead = PromiseLike<unknown> & {
  abortSignal: (signal: AbortSignal) => PromiseLike<unknown>;
};

/** Only for read-only state requests. Never retry a wager or payment through
 * this helper: a timed-out write may already have committed on the server. */
export async function boundedRead<Query extends AbortableRead>(
  query: Query,
  timeoutMs = 8000,
): Promise<Awaited<Query>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("READ_TIMEOUT"));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return (await Promise.race([query.abortSignal(controller.signal), deadline])) as Awaited<Query>;
  } finally {
    clearTimeout(timer);
  }
}
