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
- [ ] Resend 6-digit email code sign-up (no links): code storage, limits, email template, code-entry screen, tests (needs RESEND_API_KEY + AUTH_EMAIL_FROM on a verified domain)
- [ ] End-to-end check of a live two-player round in the browser (user testing themselves)
- [ ] Before real money: independent randomness source, crypto review, KYC/AML/geo providers, legal review
- [ ] Review: Jackpot settle locks wallets in a different order than joins (possible deadlock under heavy load; retry-safe)
- [ ] Live two-player Coinflip round in the browser (user testing themselves)
- [x] Replace favicon with PVP logo, remove Lovable icon
- [x] Resend 6-digit sign-up codes (built) — [ ] sending blocked until AUTH_EMAIL_FROM (verified Resend sender) is saved
