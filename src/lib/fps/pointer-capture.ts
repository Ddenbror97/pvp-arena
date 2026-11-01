/** Prefer raw deltas; only retry when the browser cannot provide raw input. */
export function capturePointer(canvas: HTMLElement, doc: Document = document): Promise<void> {
  if (doc.pointerLockElement === canvas) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false,
      promisePending = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      doc.removeEventListener("pointerlockchange", changed);
      doc.removeEventListener("pointerlockerror", failed);
      if (error) reject(error);
      else resolve();
    };
    const changed = () => {
      if (doc.pointerLockElement === canvas) finish();
    };
    const failed = () => {
      if (!promisePending) finish(new Error("Mouse capture was not granted"));
    };
    const request = (raw: boolean) => {
      try {
        const result = raw
          ? canvas.requestPointerLock({ unadjustedMovement: true })
          : canvas.requestPointerLock();
        promisePending = !!result && typeof result.catch === "function";
        if (promisePending)
          void result.catch((error: unknown) => {
            if (settled) return;
            if (
              raw &&
              error instanceof Error &&
              (error.name === "NotSupportedError" || error.name === "TypeError")
            )
              request(false);
            else
              finish(error instanceof Error ? error : new Error("Mouse capture was not granted"));
          });
      } catch (error) {
        if (
          raw &&
          error instanceof Error &&
          (error.name === "NotSupportedError" || error.name === "TypeError")
        )
          request(false);
        else finish(error instanceof Error ? error : new Error("Mouse capture was not granted"));
      }
    };
    const timeout = setTimeout(() => finish(new Error("Mouse capture timed out")), 8000);
    doc.addEventListener("pointerlockchange", changed);
    doc.addEventListener("pointerlockerror", failed);
    request(true);
  });
}
