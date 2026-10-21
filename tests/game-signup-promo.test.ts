import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GAME_SIGNUP_CAMPAIGN,
  GAME_SIGNUP_COPY,
  GAME_SIGNUP_DIALOG_CLASS,
  GAME_SIGNUP_IDLE_MS,
  GAME_SIGNUP_ROUTES,
  accountCreatedRecently,
  createIdleState,
  createSingleFlight,
  gameFromPathname,
  gameSignupGeoAllowed,
  gameSignupPromoEnabled,
  gameSignupReserveAllowed,
  initialInvitePhase,
  inviteUi,
  parseAuthSearch,
  promoClaimAnalyticsEvent,
  promoClaimSucceeded,
  readAuthNext,
  shouldRequestGameSignup,
  stepIdle,
  trustedClientIp,
  writeAuthNext,
  type InviteStore,
} from "@/lib/promo/game-signup-policy";

function memoryStore(seed: Record<string, string> = {}): InviteStore {
  const data = { ...seed };
  return {
    get: (key) => data[key] ?? null,
    set: (key, value) => {
      data[key] = value;
    },
    remove: (key) => {
      delete data[key];
    },
  };
}

const openVisitor = {
  authReady: true,
  authenticated: false,
  game: "roulette" as const,
  decision: "unknown" as const,
  idleReady: true,
  visible: true,
  blocked: false,
};

describe("game signup invite policy", () => {
  it("lists the five game pages and no table routes", () => {
    expect(GAME_SIGNUP_ROUTES.map((row) => row.path)).toEqual([
      "/",
      "/roulette",
      "/coinflip",
      "/poker",
      "/slott",
    ]);
    expect(gameFromPathname("/")).toBe("jackpot");
    expect(gameFromPathname("/poker/")).toBe("poker");
    expect(gameFromPathname("/poker/table-1")).toBeNull();
    expect(gameFromPathname("/slott/match")).toBeNull();
    expect(gameFromPathname("/coinflip/x")).toBeNull();
    expect(gameFromPathname("/auth")).toBeNull();
  });

  it("keeps the offer off unless the flag is exactly true", () => {
    expect(gameSignupPromoEnabled(undefined)).toBe(false);
    expect(gameSignupPromoEnabled("false")).toBe(false);
    expect(gameSignupPromoEnabled("TRUE")).toBe(false);
    expect(gameSignupPromoEnabled("true")).toBe(true);
    expect(readFileSync(".env.example", "utf8")).not.toMatch(/^GAME_SIGNUP_PROMO_ENABLED=true/m);
  });

  it("uses only the Cloudflare connecting IP and fails closed without it", () => {
    expect(trustedClientIp({ cfConnectingIp: "203.0.113.8", forwardedFor: "198.51.100.2" })).toBe(
      "203.0.113.8",
    );
    expect(trustedClientIp({ cfConnectingIp: null, forwardedFor: "198.51.100.2" })).toBeNull();
    expect(trustedClientIp({ cfConnectingIp: "203.0.113.8, 198.51.100.2" })).toBeNull();
    expect(
      gameSignupReserveAllowed({
        flag: "true",
        cfConnectingIp: null,
        forwardedFor: "198.51.100.2",
        country: "US",
        geoEnabled: false,
        blockedCountries: [],
        game: "poker",
      }).ok,
    ).toBe(false);
    const allowed = gameSignupReserveAllowed({
      flag: "true",
      cfConnectingIp: "2001:db8::1",
      forwardedFor: "198.51.100.2",
      country: null,
      geoEnabled: false,
      blockedCountries: ["US"],
      game: "slott",
    });
    expect(allowed).toEqual({ ok: true, ip: "2001:db8::1", game: "slott" });
  });

  it("fails closed on a blocked or unknown country when geo rules are on", () => {
    expect(gameSignupGeoAllowed({ enabled: false, blockedCountries: ["US"], country: "US" })).toBe(
      true,
    );
    expect(gameSignupGeoAllowed({ enabled: true, blockedCountries: ["US"], country: "US" })).toBe(
      false,
    );
    expect(gameSignupGeoAllowed({ enabled: true, blockedCountries: [], country: null })).toBe(
      false,
    );
    expect(gameSignupGeoAllowed({ enabled: true, blockedCountries: [], country: "XX" })).toBe(
      false,
    );
    expect(gameSignupGeoAllowed({ enabled: true, blockedCountries: ["US"], country: "CA" })).toBe(
      true,
    );
  });

  it("waits for six idle seconds and resets on interaction, hiding, or another dialog", () => {
    let idle = createIdleState(0);
    idle = stepIdle(idle, { now: 5_999, visible: true, blocked: false, interacted: false });
    expect(idle.ready).toBe(false);
    idle = stepIdle(idle, { now: 6_000, visible: true, blocked: false, interacted: false });
    expect(idle.ready).toBe(true);
    expect(GAME_SIGNUP_IDLE_MS).toBe(6000);

    idle = stepIdle(idle, { now: 7_000, visible: true, blocked: false, interacted: true });
    expect(idle).toMatchObject({ idleMs: 0, ready: false });

    idle = stepIdle(
      { idleMs: 5_000, lastNow: 5_000 },
      { now: 9_000, visible: false, blocked: false, interacted: false },
    );
    expect(idle.ready).toBe(false);
    expect(idle.idleMs).toBe(0);

    idle = stepIdle(
      { idleMs: 5_000, lastNow: 5_000 },
      { now: 9_000, visible: true, blocked: true, interacted: false },
    );
    expect(idle.ready).toBe(false);
  });

  it("requests once, and never for a signed-in player or a decided visit", () => {
    expect(shouldRequestGameSignup(openVisitor)).toBe(true);
    expect(shouldRequestGameSignup({ ...openVisitor, authenticated: true })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, authReady: false })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, idleReady: false })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, visible: false })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, blocked: true })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, decision: "closed" })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, decision: "open" })).toBe(false);
    expect(shouldRequestGameSignup({ ...openVisitor, game: null })).toBe(false);
  });

  it("shows at most one dialog across game changes, refresh, and dismissal", () => {
    expect(initialInvitePhase("unknown")).toEqual({ phase: "wait" });
    expect(initialInvitePhase("open")).toEqual({ phase: "off" });
    expect(initialInvitePhase("closed")).toEqual({ phase: "off" });

    let state = inviteUi({ phase: "wait" }, { type: "eligible" });
    expect(state).toEqual({ phase: "asking" });
    state = inviteUi(state, { type: "answer", show: false });
    expect(state).toEqual({ phase: "off" });

    state = inviteUi({ phase: "asking" }, { type: "answer", show: true });
    expect(state).toEqual({ phase: "granted" });
    expect(inviteUi(state, { type: "surface", clear: false })).toEqual({ phase: "granted" });
    state = inviteUi(state, { type: "game-changed", game: "coinflip" });
    expect(state).toEqual({ phase: "granted" });
    state = inviteUi(state, { type: "surface", clear: true });
    expect(state).toEqual({ phase: "open" });
    expect(inviteUi(state, { type: "game-changed", game: "poker" })).toEqual({ phase: "off" });
    expect(inviteUi({ phase: "open" }, { type: "dismiss" })).toEqual({ phase: "off" });
    expect(inviteUi({ phase: "granted" }, { type: "game-changed", game: null })).toEqual({
      phase: "off",
    });
    expect(inviteUi({ phase: "off" }, { type: "eligible" })).toEqual({ phase: "off" });
  });

  it("shares one in-flight eligibility request across tabs in the same document", async () => {
    const once = createSingleFlight<boolean>();
    let calls = 0;
    const run = () => {
      calls += 1;
      return Promise.resolve(true);
    };
    const [a, b] = await Promise.all([once(run), once(run)]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(calls).toBe(1);

    const flaky = createSingleFlight<boolean>();
    await expect(flaky(() => Promise.reject(new Error("down")))).rejects.toThrow("down");
    await expect(flaky(() => Promise.resolve(false))).resolves.toBe(false);
  });

  it("keeps signup on the originating game and prefills only PVP1", () => {
    expect(parseAuthSearch({ mode: "signup", next: "/roulette", code: "pvp1" })).toEqual({
      mode: "signup",
      next: "/roulette",
      code: "PVP1",
    });
    expect(parseAuthSearch({ next: "https://evil.example", code: "FREE", mode: "signin" })).toEqual(
      {},
    );
    expect(parseAuthSearch({ next: "/poker/table-1", code: "PVP1" })).toEqual({ code: "PVP1" });
    const store = memoryStore();
    writeAuthNext(store, "/slott");
    expect(readAuthNext(store, undefined)).toBe("/slott");
    expect(readAuthNext(store, "/coinflip")).toBe("/coinflip");
    expect(readAuthNext(memoryStore({ "pvp-auth-next": "/wallet" }), undefined)).toBeNull();
  });

  it("reports claim success only after the backend confirms the credit", () => {
    expect(promoClaimSucceeded({ ok: true })).toBe(true);
    expect(promoClaimSucceeded({ ok: false })).toBe(false);
    expect(promoClaimSucceeded(null)).toBe(false);
    expect(promoClaimSucceeded({})).toBe(false);
    expect(promoClaimAnalyticsEvent({ status: "done", ok: true })).toBe("promo_claim_success");
    expect(promoClaimAnalyticsEvent({ status: "done", ok: false })).toBe("promo_claim_failure");
    expect(promoClaimAnalyticsEvent({ status: "retry" })).toBeNull();
    expect(promoClaimAnalyticsEvent({ status: "none" })).toBeNull();
    const claim = readFileSync("src/lib/promo/claim.ts", "utf8");
    expect(claim).toContain("promoClaimSucceeded(result)");
    expect(claim).not.toContain("if (result.ok)");
  });

  it("treats only a brand-new account as a signup conversion", () => {
    const now = Date.parse("2026-10-21T12:00:00.000Z");
    expect(accountCreatedRecently("2026-10-21T11:59:30.000Z", now)).toBe(true);
    expect(accountCreatedRecently("2026-10-21T11:00:00.000Z", now)).toBe(false);
    expect(accountCreatedRecently(undefined, now)).toBe(false);
  });

  it("states the offer as promotional credit and links the terms", () => {
    expect(GAME_SIGNUP_COPY.headline).toBe("Get $1 to Play");
    expect(GAME_SIGNUP_COPY.primary).toBe("Create Account & Claim $1");
    expect(GAME_SIGNUP_COPY.secondary).toBe("Maybe Later");
    expect(GAME_SIGNUP_COPY.small).toMatch(/not a direct USDC deposit/i);
    expect(GAME_SIGNUP_COPY.termsHref).toBe("/terms#promotional-credit");
    const text = Object.values(GAME_SIGNUP_COPY).join(" ");
    expect(text).not.toMatch(/guaranteed|instantly withdraw|direct USDC transfer/i);
    expect(GAME_SIGNUP_DIALOG_CLASS).toContain("max-w-[26.25rem]");
    expect(GAME_SIGNUP_DIALOG_CLASS).toContain("w-[calc(100%-2rem)]");
    expect(GAME_SIGNUP_DIALOG_CLASS).toContain("env(safe-area-inset-bottom)");
    expect(GAME_SIGNUP_DIALOG_CLASS).toContain("motion-reduce:animate-none");
    expect(GAME_SIGNUP_DIALOG_CLASS).toContain("duration-200");
    const migration = readFileSync(
      "supabase/migrations/20261021152412_game_signup_promo.sql",
      "utf8",
    );
    expect(migration).toContain(GAME_SIGNUP_CAMPAIGN);
    expect(migration).toContain("enable row level security");
    expect(migration).not.toMatch(/inet|client_ip/);
    const terms = readFileSync("src/routes/terms.tsx", "utf8");
    expect(terms).toContain('id="promotional-credit"');
    expect(terms).toContain("at least half of the dollars you have");
  });
});
