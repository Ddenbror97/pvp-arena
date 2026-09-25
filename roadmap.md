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
- [x] Recent games: no auto page switching
- [x] Coinflip: remove "(you)" and Cancel & refund
- [x] Jackpot: countdown/effect inside wheel instead of "drawing"
- [x] Roulette: hold winning coin longer, reveal green/red names ~1.5s later, slower reset
- [x] MetaMask connect error "Algo deu errado com a carteira" — fix; all wallet messages in English
- [x] Cold-start CLS on Jackpot/Coinflip/Roulette (live measured)
- [x] Mobile scroll smoothness (Jackpot/Roulette jank)
- [x] Roulette: rounds run continuously (no "Waiting for the first bet"), previous rolls edge to edge
- [x] Coinflip open games last 24h before auto-cancel+refund (not 1 min)
- [x] Jackpot #20: wheel did not spin before winner announced — investigate
- [x] Roulette countdown starts at the full configured window after the prior result; previous rolls stay edge-to-edge without cache swaps
- [x] Wallet UX: guided one-click MetaMask deposits, review-first withdrawals, and mobile-safe activity layout
- [x] Header: balance + Deposit/Withdraw in one control, deep-linked to the wallet tab; fits 320-1280px, no added page movement
- [x] MetaMask connect on ddenbror97: direct installed-extension discovery, mobile fallback, duplicate-request guard, actionable errors, safe failure logging
- [x] MetaMask pending-request recovery: shared single-flight request, authorized-account reuse, safe polling, and explicit stale site-connection reset
- [x] Final CLS hardening pass (header auth swap, balance slot, Jackpot round #)
- [ ] Full Base Sepolia round trip (deposit -> play -> withdraw) — waits on test coins in the payout wallet and a publish
- [ ] Rotate the payout wallet key that was pasted in chat — after testing

## Multi-chain rails (Base Mainnet + Ethereum Mainnet) — in progress
- [x] Chain registry extended: per-chain confirmations, minimums, network_mode (Base Sepolia unchanged, still the only enabled chain)
- [x] Base Mainnet (8453) + Ethereum Mainnet (1) seeded in registry — DISABLED until gates pass
- [x] Personal deposit addresses table (xpub-derived, watcher holds no keys, no auto-sweep)
- [x] Chain-aware DB functions: observe/credit deposits, quotes, withdrawals, per-chain worker queue, LIQUIDITY_PENDING
- [x] Server: per-chain watchers/workers, two-RPC block-hash agreement (fail closed), exact gas estimation, per-chain hot-wallet keys
- [x] Wallet UI: network selector, chain-aware deposits/withdrawals, per-chain explorer links
- [x] Tests: 119 unit + 13 DB crypto money-path tests pass; build clean
- [ ] Secrets needed to activate: CRYPTO_DEPOSIT_XPUB, per-chain RPC URLs (primary+secondary), per-chain payout keys
- [ ] Legal/custody gates before enabling mainnet: licensing, KYC/AML, geo-fencing, custody setup
- [ ] Staged round-trip test on Base Sepolia, then enable Base Mainnet, then Ethereum
- [x] Base Mainnet go-live Stage 1+2: secrets saved (RPC primary/backup, payout key), treasury 0x9EAf…7987 + payout 0xd293…dA24 registered, chain 8453 + USDC/ETH enabled in watch-only mode
- [x] Watch-only end-to-end check passed: both RPCs agree on chain 8453, payout key derives to registered address, watcher/withdrawal worker/reconcile all run clean; adaptive log-chunking fix for free-tier RPC 10-block cap
- [x] Automatic deposit crediting ON (watch-only off, owner approved); house-wallet senders never auto-credited; $2 house-origin deposit admin-credited once to ddenbror97
- [ ] Stage 4: full test suite pass + new mainnet safety tests
- [ ] Stage 5: live rollout — publish, $2 watch-only deposit detection, $5 credit test, $5 withdrawal, ETH round trip, reconcile, then enable crediting (watch_only=false) and disable Base Sepolia
- [ ] Stage 3 remainder: real-money Terms/Privacy/Responsible Gambling copy, geo-block page, memory update

- [x] Roulette rounds run non-stop while real play is off
- [x] Roulette lifecycle uses an independent one-second server clock; logged-out viewers no longer depend on signed-in tabs
- [x] Base Mainnet withdrawals on; Base Sepolia removed
- [x] Full adversarial audit per uploaded spec (report delivered)
