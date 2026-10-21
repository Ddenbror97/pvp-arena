import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

// Non-secret "probably signed in" hint so the server-rendered page reserves the
// same panel sizes the signed-in browser will show (avoids first-load movement).
// Never used for access decisions.
const NAME = "pvp_si";

// Captured on the first client read. The shell's session check can clear a stale
// cookie before a streamed lobby hydrates; the first paint still has to match
// the HTML that was rendered with the cookie.
let hinted: boolean | undefined;

export const readAuthHint = createIsomorphicFn()
  .server(() => getCookie(NAME) === "1")
  .client(() => {
    if (hinted === undefined) hinted = document.cookie.split("; ").includes(`${NAME}=1`);
    return hinted;
  });

/**
 * The header, poker seats, and other chrome follow this on the first paint.
 * The cookie is only a size hint: once the session is known, the session wins.
 */
export function paintSignedIn(
  ready: boolean,
  userId: string | null | undefined,
  hint: boolean,
): boolean {
  return ready ? Boolean(userId) : hint;
}

export function writeAuthHint(signedIn: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = signedIn
    ? `${NAME}=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    : `${NAME}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}
