# Solo Practice release — 2026-10-31

Practice is now one free, private match against the server-owned Arena Bot, first to seven wins (best of 13). The lobby exposes a direct Practice vs bot action; cash rooms retain best-of-five/nine and the existing stake/fee rules. Practice again creates another solo session without a wager confirmation.

The bot uses ordinary validated inputs and the existing movement, occlusion, ammunition, recoil, damage and hitbox simulation. It searches a bounded navigation grid around inflated cover, remembers only the last visible position briefly, reacts after 360 ms, samples imperfect body-level aim at 8 Hz, turns at a bounded speed and fires short bursts separated by pauses. It moves between bursts and reloads. There is one fixed moderate difficulty, with no configurable modes.

Solo sessions live in the private `fps_private.practice_matches` table, separate from `fps_matches`, wallet accounts, ledger transactions, cash ratings and public SEO results. The virtual bot seat is not an Auth user or wallet. Browser APIs require a live session and ownership; bot-seat admission and spectators are denied. Only the trusted runtime can finish a solo session. The database validates seven-win round results. New human zero-stake matchmaking is rejected; already funded legacy rooms can finish normally.

Validation:

- 734 unit tests pass, including an entire seven-win bot series, visible-target/reaction/input checks, real Durable Object single-human readiness and admission checks, and the SQL migration's ownership, ledger/rating isolation, idempotency, cancellation and cash-entry compatibility checks.
- Hosted staging: two browser tests pass in 2.7 minutes. Solo completes seven rounds, reloads during play, records a 0–7 result, starts again and leaves funds/ratings unchanged. A separate paid human-v-human BO5 completes three rounds and reconciles the actual synthetic staging ledger and recap flow.
- TypeScript and targeted lint pass. Private-schema/table/finish permissions and RLS are verified against staging.
- The paid test now reads actual outgoing headings and delivers relative mouse deltas through the production input handler; its previous absolute WebDriver positioning lost heading under pointer lock. No gameplay state is injected.

Deployment applies migration `20261031135055_fps_solo_practice.sql`, preserves the Durable Object namespace and pauses only new FPS admissions while funded cash rooms drain. Existing rounds and settlement continue during that pause. The original entry and cash configuration is restored even if deployment fails. Production verification uses a zero-funded QA account, followed by account/session cleanup and configuration/financial checks. Production outcomes are recorded separately in local `test-results/practice-production-*` evidence after deployment.

The preceding motion release is PR #16: camera-only crouch/correction smoothing and separated upper-wall/deck surfaces, validated in Chrome and Firefox. Native Safari pointer capture still requires macOS validation; these tests do not establish zero lag on every device.
