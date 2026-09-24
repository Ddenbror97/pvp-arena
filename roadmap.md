# PVPCasino roadmap

- [x] Backend schema, double-entry ledger, invariants, immutability
- [x] Jackpot engine: join, timer, lock, draw, settle, recoverable payout
- [x] Fairness protocol v1 + test vectors + in-browser verifier
- [x] Background worker (every minute) + client-triggered settlement
- [x] Accounts (email/password), profiles, test-credit wallet
- [x] UI: wheel, reveal animation, celebration, player list, entry panel, history, game detail
- [x] Fairness, admin (read-only), terms/privacy/responsible-gambling pages
- [x] Test suite: unit, integration, concurrency, failure injection, access rules
- [x] Coinflip engine: schema, create/join/cancel, state machine, fairness v1, settlement, worker, 32 vectors, tests
- [x] Coinflip UI: lobby, room, coin animation, history, fairness verifier, admin view
- [x] Resend 6-digit email code sign-up (no links): code storage, limits, email template, code-entry screen, tests (RESEND_API_KEY connected; pvpspinarena.com verified — test email delivered 2026-09-23)
- [ ] End-to-end check of a live two-player round in the browser (user testing themselves)
- [ ] Before real money: independent randomness source, crypto review, KYC/AML/geo providers, legal review
- [ ] Review: Jackpot settle locks wallets in a different order than joins (possible deadlock under heavy load; retry-safe)
- [ ] Live two-player Coinflip round in the browser (user testing themselves)
- [x] Replace favicon with PVP logo, remove Lovable icon
- [x] Resend 6-digit sign-up codes (built)
- [ ] Live sign-up with a real inbox (user testing themselves)
- [x] Fix first-login profile creation blocked by unbalanced welcome-credit transaction
- [x] MetaMask wallet connection + signature verification (Phase 1, identity only)
- [x] Replace header logo with new casino_logo.png
- [x] Shared live chat (Jackpot + Coinflip) with Broadcast, moderation, rate limits
- [x] Jackpot: chat left of wheel; Players list auto-height (no scroll)
- [x] Light page background with dark panels
- [x] Background: black (replaced grey)
- [x] Compact Coinflip game room (players/coin/result panels)

- [x] Coinflip winner animation: more exciting celebration (visual only, no timing/logic change)
- [x] Chat "No messages yet" flash fixed; [x] one shared chat room on all game pages — flashes before history loads — scan site for similar late-load flashes
- [x] Replace Coinflip coin faces with user's Heads/Tails images (same size)
- [x] Chat header late load-in: "Start of chat" and "1 online" pop in late — reserve space / gate on historyLoaded
- [x] Fix chat "Start of chat" drop-in: it appears late and makes the username row shift/drop — remove entrance animation / reserve geometry
- [x] Fairness page UX: too much content / too big — simplify layout, fix mobile
- [x] Fix chat "Start of chat" drop-in: reserved constant-height top strip in GameChat (verified: message + marker render in same commit)
- [x] Fairness page UX: Jackpot/Coinflip tabs, verifier card first, specs/vectors collapsed, compact mobile layout (no overflow at 1280/390px; both verifiers tested)

## Security remediation (audit findings)
- [x] F-1 least-privilege grants + truncate guard
- [x] F-2 hide self-exclusion/age fields; own-status RPC
- [x] F-3 tick gate (throttle + try-lock)
- [x] F-4 avatar allowlist + same-origin proxy
- [x] F-5 sign-up rate limit before account creation
- [x] F-6 server-counted online players (heartbeat), remove browser presence
- [x] F-7 pot ceilings
- [x] Session-liveness check on wagers/faucet/cancel (logout/reset tests)
- [x] Integrity monitor (detective) + schedule
- [x] New tests: join vs cancel, refund vs payout, gates, sessions, grants
- [x] Production build secret scan; full suite
- [x] Coinflip: better navigation after create/join; show chosen coin side instead of avatar; flip slows after 70%

- [x] Roulette: database, round engine, page, chat, menu links
- [ ] Roulette: dedicated automated tests, attack/concurrency tests, performance check, audit report
- [x] Jackpot/Coinflip dead-code cleanup only (no logic changes), then run tests + build
- [x] Roulette v2 wheel: Purple/Silver 2x (7 each), Green 14x (1), slower spin

- [x] Coinflip finished-game screen: merge coin + winner into one panel, compact collapsible provably-fair section
- [x] Roulette adversarial audit: 15 attack tests + 4 verifier tests, Fairness page Roulette tab, report

- [x] Jackpot cold-start/LCP/FCP/JS audit (measure first, minimal fixes)
- [x] Coinflip cold-start/LCP/FCP/JS audit (measure first, minimal fixes)
- [x] Roulette cold-start/LCP/FCP/JS audit (measure first, minimal fixes)
- [x] Zero movement on cold start inside Jackpot entry/players, Coinflip create, Roulette strip (signed in)
- [ ] Fairness page: reduce dead space left/right on desktop (senior UX pass)
- [x] Recent games all 3 games: edge-to-edge, 8/page, auto-advancing pages + Prev/Next (Jackpot, Coinflip, new Roulette table)
- [x] Fairness page desktop: widened to max-w-6xl, two-column layout per game tab
- [x] Multi-column site footer with games, how it works, about, and legal sections
- [ ] Review uploaded USDC/ETH production-money architecture before any real-value implementation

## Crypto testnet rails (Base Sepolia) — plan approved
- [x] Step 0 checks: Chainlink ETH/USD 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1 (8 dec, live, ~57s old); Circle USDC 0x036CbD53842c5426634e7929541eC2318f3dCF7e (6 dec); chain 84532; safe head lags ~172 blocks (~6 min), finalized ~544 blocks (~18 min) → credit at "safe" tag, configurable
- [x] Secrets in place: CRYPTO_HOT_WALLET_PRIVATE_KEY, BASE_SEPOLIA_RPC_URL (public https://sepolia.base.org)
- [x] Deposit matching decided: match by sender's verified MetaMask address — no xpub, no per-player addresses
- [x] Phase 1: DB allowlist + deposits + withdrawals + price snapshots + custody kind (additive migrations, guard functions locked down)
- [x] Review changes folded in (testnet flags, ETH quotes, overlap re-scan, 3 switches)
- [x] Deposit watcher, withdrawal worker, reconciliation, wallet + admin UI, minutely schedule
- [x] No-mainnet + valuation unit tests (9/9)
- [ ] Live round trip (deposit, play, withdraw): waits on test ETH/USDC in payout wallet + publish
- [ ] DB integration tests for double-credit/parallel withdraw/quote reuse
- [ ] Rotate payout key pasted in chat

## Game UX fixes (requested 2026-09-24)
- [ ] Recent games: no auto page switching
- [ ] Coinflip: remove "(you)" and Cancel & refund
- [ ] Jackpot: countdown/effect inside wheel instead of "drawing"
- [ ] Roulette: hold winning coin longer, reveal green/red names ~1.5s later, slower reset
