/**
 * Client-visible product configuration. Financial rules (min/max entry, rake,
 * timers) are authoritative on the server (jackpot_config) — values here are
 * display and compliance feature flags only.
 */
export const APP = {
  name: "PVPCasino",
  currencyLabel: "USD",
  creditsLabel: "TEST CREDITS",
} as const;

export const COMPLIANCE = {
  realMoneyEnabled: false, // hard-disabled; server also enforces via jackpot_config check
  minimumAge: 18,
  ageVerification: "self_attested" as "self_attested" | "provider",
  kycProvider: null as string | null,
  amlProvider: null as string | null,
  geoRestriction: { enabled: false, blockedCountries: [] as string[] },
  responsibleGambling: {
    selfExclusion: true, // enforced server-side via profiles.self_excluded_until
    depositLimits: false,
    wagerLimits: false,
  },
  withdrawalControls: { enabled: false },
} as const;

export const CRYPTO = {
  supportedAssets: [] as string[],
  network: null as string | null,
  minDeposit: null as number | null,
  minWithdrawal: null as number | null,
} as const;

export const QUICK_AMOUNTS = [500, 1000, 2500, 5000] as const;
