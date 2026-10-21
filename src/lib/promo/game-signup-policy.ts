/** Pure rules for the game-page PVP1 invite. No I/O. */

export const GAME_SIGNUP_FLAG = "GAME_SIGNUP_PROMO_ENABLED";
export const GAME_SIGNUP_CAMPAIGN = "game_signup_pvp1_v1";
export const GAME_SIGNUP_CODE = "PVP1";
export const GAME_SIGNUP_IDLE_MS = 6000;
export const GAME_SIGNUP_MODAL_MS = 200;
export const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

export const GAME_SIGNUP_ROUTES = [
  { path: "/", game: "jackpot" },
  { path: "/roulette", game: "roulette" },
  { path: "/coinflip", game: "coinflip" },
  { path: "/poker", game: "poker" },
  { path: "/slott", game: "slott" },
] as const;

export type GamePath = (typeof GAME_SIGNUP_ROUTES)[number]["path"];
export type GameId = (typeof GAME_SIGNUP_ROUTES)[number]["game"];

export const GAME_SIGNUP_CLIENT_EVENTS = [
  "promo_modal_impression",
  "promo_modal_cta_click",
  "promo_modal_dismiss",
  "promo_signup_completed",
  "promo_claim_success",
  "promo_claim_failure",
] as const;

export type GameSignupClientEvent = (typeof GAME_SIGNUP_CLIENT_EVENTS)[number];

export const GAME_SIGNUP_COPY = {
  headline: "Get $1 to Play",
  amount: "$1",
  support: "Create your free account and use code PVP1 to claim $1 in promotional play credit.",
  code: "PVP1",
  primary: "Create Account & Claim $1",
  secondary: "Maybe Later",
  small:
    "Promotional play credit, not a direct USDC deposit. Eligibility and wagering requirements apply.",
  termsLabel: "Promotional terms",
  termsHref: "/terms#promotional-credit",
  close: "Close",
} as const;

/** 26.25rem is 420px, inside the 400–440px desktop width. */
export const GAME_SIGNUP_DIALOG_CLASS =
  "w-[calc(100%-2rem)] max-w-[26.25rem] gap-5 border-border/80 bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl duration-200 motion-reduce:animate-none motion-reduce:duration-0 sm:rounded-xl";

export const INVITE_DECISION_KEY = "pvp-play-invite";
export const INVITE_FROM_KEY = "pvp-play-invite-from";
export const AUTH_NEXT_KEY = "pvp-auth-next";

export type InviteStore = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export type InviteDecision = "unknown" | "open" | "closed";

export type AuthSearch = {
  mode?: "signup";
  next?: GamePath;
  code?: typeof GAME_SIGNUP_CODE;
};

export function gameSignupPromoEnabled(value: string | null | undefined): boolean {
  return value === "true";
}

export function isGameId(value: unknown): value is GameId {
  return GAME_SIGNUP_ROUTES.some((row) => row.game === value);
}

export function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function gameFromPathname(pathname: string | null | undefined): GameId | null {
  if (!pathname) return null;
  const path = normalizePath(pathname);
  return GAME_SIGNUP_ROUTES.find((row) => row.path === path)?.game ?? null;
}

export function gamePathFromPathname(pathname: string | null | undefined): GamePath | null {
  if (!pathname) return null;
  const path = normalizePath(pathname);
  return GAME_SIGNUP_ROUTES.find((row) => row.path === path)?.path ?? null;
}

export function parseAuthSearch(search: Record<string, unknown>): AuthSearch {
  const out: AuthSearch = {};
  if (search["mode"] === "signup") out.mode = "signup";
  const nextValue = search["next"];
  const next = typeof nextValue === "string" ? gamePathFromPathname(nextValue) : null;
  if (next) out.next = next;
  const code = search["code"];
  if (typeof code === "string" && code.toUpperCase() === GAME_SIGNUP_CODE) {
    out.code = GAME_SIGNUP_CODE;
  }
  return out;
}

/** Cloudflare's connecting IP only. Forwarded headers are ignored. */
export function trustedClientIp(headers: {
  cfConnectingIp?: string | null | undefined;
  forwardedFor?: string | null | undefined;
}): string | null {
  void headers.forwardedFor;
  const ip = headers.cfConnectingIp?.trim() ?? "";
  if (!ip || ip.length > 64) return null;
  if (/[\s,]/.test(ip)) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  if (!ip.includes(".") && !ip.includes(":")) return null;
  return ip;
}

export function gameSignupGeoAllowed(input: {
  enabled: boolean;
  blockedCountries: readonly string[];
  country: string | null | undefined;
}): boolean {
  if (!input.enabled) return true;
  const country = input.country?.trim().toUpperCase() ?? "";
  // Cloudflare uses XX for an unknown country and T1 for Tor.
  if (!/^[A-Z]{2}$/.test(country) || country === "XX" || country === "T1") return false;
  return !input.blockedCountries.some((item) => item.toUpperCase() === country);
}

export function gameSignupReserveAllowed(input: {
  flag: string | null | undefined;
  cfConnectingIp: string | null | undefined;
  forwardedFor: string | null | undefined;
  country: string | null | undefined;
  geoEnabled: boolean;
  blockedCountries: readonly string[];
  game: string | null | undefined;
}): { ok: true; ip: string; game: GameId } | { ok: false } {
  if (!gameSignupPromoEnabled(input.flag)) return { ok: false };
  const ip = trustedClientIp({
    cfConnectingIp: input.cfConnectingIp,
    forwardedFor: input.forwardedFor,
  });
  if (!ip) return { ok: false };
  if (
    !gameSignupGeoAllowed({
      enabled: input.geoEnabled,
      blockedCountries: input.blockedCountries,
      country: input.country,
    })
  ) {
    return { ok: false };
  }
  if (!isGameId(input.game)) return { ok: false };
  return { ok: true, ip, game: input.game };
}

export type IdleState = { idleMs: number; lastNow: number };

export function createIdleState(now: number): IdleState {
  return { idleMs: 0, lastNow: now };
}

export function stepIdle(
  state: IdleState,
  sample: { now: number; visible: boolean; blocked: boolean; interacted: boolean },
  delayMs = GAME_SIGNUP_IDLE_MS,
): IdleState & { ready: boolean } {
  if (sample.interacted || !sample.visible || sample.blocked) {
    return { idleMs: 0, lastNow: sample.now, ready: false };
  }
  const idleMs = state.idleMs + Math.max(0, sample.now - state.lastNow);
  return { idleMs, lastNow: sample.now, ready: idleMs >= delayMs };
}

export function readSignupSurface(input: {
  hidden: boolean;
  introLocked: boolean;
  dialogCount: number;
}): boolean {
  return input.hidden || input.introLocked || input.dialogCount > 0;
}

export function shouldRequestGameSignup(input: {
  authReady: boolean;
  authenticated: boolean;
  game: GameId | null;
  decision: InviteDecision;
  idleReady: boolean;
  visible: boolean;
  blocked: boolean;
}): boolean {
  return (
    input.authReady &&
    !input.authenticated &&
    input.game !== null &&
    input.decision === "unknown" &&
    input.idleReady &&
    input.visible &&
    !input.blocked
  );
}

export function readInviteDecision(store: InviteStore): InviteDecision {
  const value = store.get(INVITE_DECISION_KEY);
  if (value === "show") return "open";
  if (value === "hide") return "closed";
  return "unknown";
}

export function writeInviteDecision(store: InviteStore, shown: boolean) {
  store.set(INVITE_DECISION_KEY, shown ? "show" : "hide");
}

export function writeInviteOrigin(store: InviteStore, game: GameId) {
  store.set(INVITE_FROM_KEY, game);
}

export function readInviteOrigin(store: InviteStore): GameId | null {
  const value = store.get(INVITE_FROM_KEY);
  return isGameId(value) ? value : null;
}

export function clearInviteOrigin(store: InviteStore) {
  store.remove(INVITE_FROM_KEY);
}

export function writeAuthNext(store: InviteStore, path: GamePath) {
  store.set(AUTH_NEXT_KEY, path);
}

export function readAuthNext(store: InviteStore, searchNext: string | undefined): GamePath | null {
  return gamePathFromPathname(searchNext) ?? gamePathFromPathname(store.get(AUTH_NEXT_KEY));
}

export function clearAuthNext(store: InviteStore) {
  store.remove(AUTH_NEXT_KEY);
}

export function accountCreatedRecently(createdAt: string | undefined, now: number): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  return age < NEW_ACCOUNT_WINDOW_MS && age > -2 * 60 * 1000;
}

export function promoClaimSucceeded(result: { ok?: boolean } | null | undefined): boolean {
  return result?.ok === true;
}

export function promoClaimAnalyticsEvent(result: {
  status: "none" | "retry" | "done";
  ok?: boolean;
}): "promo_claim_success" | "promo_claim_failure" | null {
  if (result.status !== "done") return null;
  if (result.ok === true) return "promo_claim_success";
  if (result.ok === false) return "promo_claim_failure";
  return null;
}

export type InviteUi =
  | { phase: "wait" }
  | { phase: "asking" }
  | { phase: "granted" }
  | { phase: "open" }
  | { phase: "off" };

export type InviteUiEvent =
  | { type: "eligible" }
  | { type: "answer"; show: boolean }
  | { type: "surface"; clear: boolean }
  | { type: "dismiss" }
  | { type: "cta" }
  | { type: "game-changed"; game: GameId | null };

export function initialInvitePhase(decision: InviteDecision): InviteUi {
  return decision === "unknown" ? { phase: "wait" } : { phase: "off" };
}

export function inviteUi(state: InviteUi, event: InviteUiEvent): InviteUi {
  if (event.type === "game-changed") {
    if (state.phase === "open") return { phase: "off" };
    if (event.game === null && (state.phase === "granted" || state.phase === "asking")) {
      return { phase: "off" };
    }
    return state;
  }
  if (state.phase === "off") return state;
  if (state.phase === "open") {
    if (event.type === "dismiss" || event.type === "cta") return { phase: "off" };
    return state;
  }
  if (event.type === "eligible" && state.phase === "wait") return { phase: "asking" };
  if (event.type === "answer" && state.phase === "asking") {
    return event.show ? { phase: "granted" } : { phase: "off" };
  }
  if (event.type === "surface" && state.phase === "granted" && event.clear) {
    return { phase: "open" };
  }
  if (event.type === "dismiss" || event.type === "cta") return { phase: "off" };
  return state;
}

export function createSingleFlight<T>() {
  let pending: Promise<T> | null = null;
  return (run: () => Promise<T>): Promise<T> => {
    if (!pending) {
      pending = run().catch((error: unknown) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}

export function browserStore(): InviteStore {
  return {
    get(key) {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        /* Private mode can block storage. The server still dedupes. */
      }
    },
    remove(key) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Private mode can block storage. The server still dedupes. */
      }
    },
  };
}
