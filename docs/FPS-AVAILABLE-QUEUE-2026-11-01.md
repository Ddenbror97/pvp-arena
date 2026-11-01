# Human cash queue and free Practice

Cash PvPStrike seats are human-only. No bot plays a user's paid seat, and joining
another cash room still requires explicit agreement to its stake and terms.

## Player flow

- Create reserves the displayed entry and leaves the creator in the lobby.
- The creator can browse any site page or play free, unrated solo Practice.
- A persistent site-wide **Join now** notice appears after a human joins. During
  Practice the pointer is released and the same action appears inside the game
  menu, avoiding the dialog focus trap. Acceptance cancels only that user's free
  Practice before entering the human match.
- Both humans must ready within 60 seconds of the database pairing. An absent
  player causes a full refund to both; no fee or bot substitute.
- Desktop notifications are optional and requested by an explicit button. The
  site must remain open; closed-site push notifications are not implemented.

## Authoritative availability

`fps_queue_status()` authenticates the live session and finds only the caller's
cash seat and private Practice. While WAITING it leases the creator's availability,
writing at most once every 20 seconds. A new room initially uses its creation time.
After 120 seconds without a lease the room is no longer joinable. A returning tab
cannot revive that stale room: it refunds it instead.

The WAITING-to-FUNDED database trigger enforces availability for public rooms,
private invitations and legacy entry paths. A rejected stale join rolls back the
joiner's debit. Active online waiting rooms have a 24-hour absolute cap.

The independent one-minute runtime maintenance job calls `fps_expire`. It refunds
offline WAITING seats and unstarted FUNDED seats past the ready deadline, even if
neither browser initializes a game server. This means an offline room becomes
unjoinable at two minutes and its refund normally follows by the next maintenance
cycle. The runtime records `fps_mark_started` once before the first countdown;
started games retain the existing match/reconnect/settlement rules.

Browser polling is shared site-wide: every two seconds while waiting/readying,
every 30 seconds otherwise, including during active play. No per-frame request,
rendering change, public match-table grant or broad realtime subscription is added.
Multiple authenticated tabs can maintain the same lease.
Cached clients that still poll their own waiting room through `fps_view` also
renew that lease. Service/spectator reads do not announce creator availability.

## Security and recovery

The two new tables live in `fps_private`, have RLS enabled and deny direct access
to browser roles. The status RPC returns only the authenticated user's matches;
only the service role can mark a funded game started. Existing ledger debit,
promo/partner attribution, refund and settlement functions remain authoritative.
Expiry is bounded, locks selected matches with SKIP LOCKED and uses idempotent
refunds. The deployment must drain active matches before replacing the runtime.

## Validation

- PGlite executes the real migration and existing financial RPCs: warmup with a
  waiting cash seat, no-charge stale private joins, owner-only status, timeout
  refunds, duplicate expiry, and started-match preservation.
- On isolated Supabase, simultaneous human joins produce one winner/two ledger
  entries; simultaneous expiry refunds once and restores all three test balances.
  Direct private-table/anonymous status/user start permissions are denied.
- Real two-browser staging tests cover browsing to Guides before Join now, a full
  paid BO5 including reconnect and ledger reconciliation, and bot Practice to
  human-match handoff through the focused settings dialog.
- Staging and production-schema migration rehearsals roll back cleanly with
  financial invariant checks. CLI dry runs preserve recorded remote history and
  select only the two new availability/compatibility migrations.
- Staging advisory access was denied. Production security/performance advisors
  were available and reviewed after deployment. The new tables intentionally
  use private, default-deny RLS ([linter explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).
  The authenticated security-definer status RPC is intentional and constrained
  to `_fps_user()` and that caller's seats ([linter explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)).
  Direct SQL confirms anonymous execution, user start execution and browser
  table SELECT are denied. No performance advisor finding targets the new objects.
- Final unit suite: 803 tests passed across 97 files. The browser BO5 completed
  all three winning rounds, reconnected the rival, and reconciled the cash ledger;
  the separate Practice/menu handoff test passed without browser exceptions.

## Production release

[PR #33](https://github.com/Ddenbror97/pvp-arena/pull/33) merged as
`eecce9fd060afecea1f91a0842a464213b1e4b38`; GitHub's DB rollout integration job passed.
Both migrations were applied with the CLI while FPS entries were paused and no
cash or Practice matches were active. Entry/cash/Practice settings were restored
and financial invariants passed.

- App version: `9c0657b7-4a10-4ce5-b0b4-aa7babfc6d2e`.
- Runtime version: `6ed2c498-ebb9-446d-bc59-8eb376074d29`.
- The live queue JavaScript matches the tested production build by SHA-256.
- An authenticated production owner-status call passed.
- Live zero-funded Practice completed seven winning rounds, reconnected and
  started again without money or rating effects. Temporary QA accounts were
  disabled afterward; their balances and ledger transaction counts remain zero.
