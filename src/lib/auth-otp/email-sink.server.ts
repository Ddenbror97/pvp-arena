import { isAbsolute, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

export const emailSinkRoot = () => resolve(tmpdir(), "pvpspinarena-e2e-mail");
/** Development only; a dedicated OS temp directory replaces the Linux-only /tmp prefix. */
export function developmentEmailSink(value: string | undefined, environment: string | undefined) {
  if (environment !== "development" || !value || !isAbsolute(value)) return undefined;
  const sink = resolve(value),
    rel = relative(emailSinkRoot(), sink);
  if (!rel || isAbsolute(rel) || rel === ".." || rel.startsWith("../") || rel.startsWith("..\\"))
    return undefined;
  return sink;
}
