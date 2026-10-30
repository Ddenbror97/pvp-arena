/** Only classifications escape RPC errors: never log URLs, keys, bodies or messages. */
export function rpcFailure(error: unknown) {
  let current = error,
    status: number | undefined,
    code: number | undefined;
  let kind = "NETWORK";
  for (let depth = 0; depth < 6 && current && typeof current === "object"; depth++) {
    const row = current as Record<string, unknown>;
    if (typeof row["status"] === "number") status = row["status"];
    if (typeof row["code"] === "number") code = row["code"];
    const message = typeof row["message"] === "string" ? row["message"] : "";
    if (/Too many subrequests/i.test(message)) kind = "SUBREQUEST_LIMIT";
    else if (/Illegal invocation/i.test(message)) kind = "ILLEGAL_INVOCATION";
    else if (/timed? ?out|timeout/i.test(message)) kind = "TIMEOUT";
    current = row["cause"];
  }
  if (status === 401 || status === 403) kind = "AUTH_REJECTED";
  else if (status === 429) kind = "RATE_LIMITED";
  return {
    kind,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
  };
}
