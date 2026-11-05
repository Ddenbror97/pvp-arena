import { createHash } from "node:crypto";

/** JSON formatting varies across Git checkouts; binary texture/cover bytes must stay exact. */
export function surfaceSourceHash(file, bytes) {
  const value = file.endsWith(".json") ? JSON.stringify(JSON.parse(bytes.toString("utf8"))) : bytes;
  return createHash("sha256").update(value).digest("hex");
}
