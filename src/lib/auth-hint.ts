import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

// Non-secret "probably signed in" hint so the server-rendered page reserves the
// same panel sizes the signed-in browser will show (avoids first-load movement).
// Never used for access decisions.
const NAME = "pvp_si";

export const readAuthHint = createIsomorphicFn()
  .server(() => getCookie(NAME) === "1")
  .client(() => document.cookie.split("; ").includes(`${NAME}=1`));

export function writeAuthHint(signedIn: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = signedIn
    ? `${NAME}=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    : `${NAME}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
