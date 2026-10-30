# FPS ledger and runtime contract

This implementation is local source, **not a production deployment**. No live database was mutated. Apply both migrations in order: `20261029192715_fps_ledger_matchmaking.sql` adds transaction enum values; `20261029192803_fps_ledger_rpcs.sql` creates tables and RPCs atomically after the enum commit. Both files were created with `supabase migration new`.

## RPC signatures

All functions return `jsonb`. PostgREST callers must use the exact named arguments below.

```sql
-- Public reads (anon or authenticated)
fps_lobby()
fps_stats()

-- Authenticated, live session required
fps_enter(p_stake bigint, p_best_of int, p_key text,
          p_private boolean default false, p_invite text default null)
fps_join(p_match uuid, p_key text, p_invite text default null)
fps_invite_preview(p_match uuid, p_invite text)
fps_cancel(p_match uuid)
fps_view(p_match uuid) -- also granted to service_role
fps_rematch(p_match uuid, p_key text)

-- Trusted service_role ONLY; never expose the service key to a browser
fps_record_result(p_match uuid, p_winner uuid, p_score_a int, p_score_b int,
                  p_reason text, p_runtime text)
fps_finish(p_match uuid, p_winner uuid, p_score_a int, p_score_b int,
           p_reason text, p_runtime text)
fps_expire(p_limit int default 100)
fps_reconcile(p_limit int default 100)
```

`fps_enter`, `fps_join`, `fps_cancel`, `fps_view`, `fps_record_result`, and `fps_finish` return a match object directly, not an envelope. Its fields are `id`, `status`, `creator_id`, `opponent_id`, `stake`, `best_of`, `private`, `runtime_id`, `region`, `score_a`, `score_b`, `winner_id`, `payout_amount`, `fee_amount`, `fee_bps`, `pot`, `reason`, `expires_at`, `funded_at`, `rematch_id`, `result_recorded`, `reconnect_seconds`, `pre_start_seconds`, and `max_runtime_seconds`. `id` is a random UUID serialized as a string. **`runtime_id` is exactly `id::text`**, which the worker must pass as `p_runtime`.

The only database states are **`WAITING`, `FUNDED`, `COMPLETED`, `CANCELLED`**. Both seats reserved means `FUNDED`; there is no separate database `STARTING` or `PLAYING` transition. Round phases remain in the authoritative runtime.

## Lobby, entry and explicit terms

`fps_lobby()` returns `{enabled,cash_enabled,practice_allowed,stakes,fee_bps,region,open,live,mine}`. `open` contains at most 100 unexpired public waiting rooms with `id`, `creator_id`, `opponent_id: null`, `username`, `stake`, `best_of`, `private: false`, `status`, `fee_bps`, and `expires_at`. `live` contains at most 20 public, unexpired `FUNDED` rooms without recorded results, newest funded first, with only `{id,creator_id,opponent_id,username,stake,best_of,private:false,status}`. Neither list exposes invite fields or private rooms. `mine` is the signed user's active match object or null; anonymous callers receive null. Cleanup is required to remove expired reservations from `mine`.

Defaults are `enabled=false`, `cash_enabled=false`, `practice_allowed=true`. The enabled switch gates both practice and cash. Zero stake is practice and creates no ledger transactions. Paid stakes accept every integer from **100 through 5000 USD cents**, inclusive. The `stakes` array is a list of display presets, not a fractional currency or a restriction to those six values. Best-of is **5 or 9**. The fee is fixed at **500 basis points (5% of the combined pot)**, rounded down in cents. A 101-cent stake per player produces a 202-cent pot, 10-cent fee and 192-cent payout. Region is fixed to `single`; there is no user-selected region or cross-region matching.

Before calling entry/join/rematch, the client must explicitly show and confirm stake, series, combined pot, 5% fee, winner payout, and cancellation/disconnect terms. A public `fps_enter` atomically joins the oldest compatible waiting room, or creates a fresh room if none is available. `fps_join` selects a specific room. All match terms are immutable at the database level, so preview then join cannot silently change stake/series. Parameter/idempotency conflicts fail instead of accepting changed terms.

New entries use a per-user transaction advisory lock, a unique `(user_id,idempotency_key)` record, and the selected waiting row `FOR UPDATE SKIP LOCKED`. One active FPS reservation per user is allowed, including waiting rooms. Keys must be 8–100 characters. New `fps_enter` calls are limited to eight recent entries per ten minutes. An old key returns its original result without another debit, even after the match closes; a different match or different enter terms rejects with `IDEMPOTENCY_CONFLICT`. A new rematch needs a fresh key.

## Private rooms, previews and spectators

Private room invites are server-generated 32-byte random tokens encoded as 64 hex characters. Matches store SHA-256 hashes. The raw secret is stored separately in `fps_invite_secrets`, with RLS enabled and no client grants; this allows a creator to recover a lost initial response. Only the creator's participant response includes `invite`; other players, lobby `open`, and service views do not receive it. Keep the token out of logs and public analytics.

`fps_invite_preview` requires a live signed session and the exact match/token pair. It returns only `{id,stake,best_of,username,status,private:true}` and reserves nothing. The UI should preview those terms and require explicit Join confirmation. `fps_join` validates the token and reserves the joining user's funds. The optional `p_invite` on `fps_enter` supports joining by token only when `p_private=true` and the supplied stake/series exactly match.

`fps_view` permits live signed participants in all states, trusted service-role initialization, and **live signed spectators of nonprivate FUNDED matches**. Other requests receive `MATCH_NOT_FOUND`; anonymous users cannot call it. It never returns entry ledger IDs or the internal bigint ledger reference. Raw tables have RLS with no client grants or policies, and are not added to Realtime. Spectator metadata access does not itself issue a runtime ticket: the application must enforce its signed ticket policy separately. Private spectators are unsupported. Participant ticket issuance must check the caller against `creator_id`/`opponent_id`, even though public spectator metadata can be read by other signed users.

## Cash accounting and restricted funds

This repository has no `_new_tx` or `_lock_game_stake` function. FPS uses the pool's actual ledger insertion pattern and exact existing signatures:

```sql
_post(p_tx uuid, p_account uuid, p_amount bigint)
_user_account(p_user uuid, p_kind account_kind, p_asset text, p_type text)
_system_account(p_kind account_kind, p_asset text, p_type text)
_coinflip_lock_wallets(p_users uuid[], p_asset text, p_type text)
_lock_system_accounts(p_kinds account_kind[], p_asset text, p_type text)
_withdraw_basis_sync()
_assert_live_session()
```

Latest pool permits bonuses; FPS deliberately adds back its earlier cash-only guard. Paid entry requires the existing real-money domain to be open and exactly `USD`/`real`. It locks wallets, rejects bots, self-exclusion, active partners and any outstanding promo, referral reward, prize, partner release or partner profit hold, then checks `withdraw_basis_bucket.eligible >= stake`. It posts available → locked and synchronizes withdrawal basis in the same transaction. Missing or nonzero `withdraw_basis_ledger_stake.bonus` aborts the entire entry. The existence of otherwise unlocked bonus funds does not make them eligible FPS cash.

`fps_entry`, `fps_settlement`, and `fps_refund` use the existing generic basis classifier without modifying it. External match UUIDs map to a separate unique identity `ledger_game_id` because the ledger's existing `game_id` is bigint. The generic basis namespace is `fps`; it cannot collide with pool/poker/other-game stake references. Existing generic deposit-wager accounting recognizes FPS entry/refund kinds under its existing rules. Refunds undo that entry's basis and wager contribution.

Settlement locks match → immutable entry records → participant wallets ordered by user/kind → house accounts, rechecks the exact two cash-funded stakes, and posts the full pot in one transaction. Fee plus payout equals pot exactly. It never directly edits a balance or reconstructs a missing cash basis. A failure propagates and rolls back all postings, audit, match and rating updates. Entries, private secrets, audit rows and existing ledger primitives preserve immutable evidence; ledger keys contain the external match UUID.

FPS **does not add itself to promo/referral/prize/partner game allowlists, issue bonuses, release partner holds, or award referral playthrough**. Existing attribution rows and all six games' functions/constraints remain unchanged. Restricted money is rejected instead of pretending an unsupported attribution hook succeeded. Any future bonus/referral eligibility expansion needs its own reviewed migration and tests.

## Results, refunds and cleanup

Only `service_role` can execute `fps_record_result`, `fps_finish`, `fps_reconcile`, and `fps_expire`; helpers have no public/client execute grants. The runtime must authenticate its result transport before calling the service RPC. Matching `p_runtime` is an authority binding, not a substitute for server credentials or proof of gameplay.

For `p_reason='ROUNDS'`, the seated winner must have exactly the best-of majority (3 for BO5, 5 for BO9), and the other score must be lower. Scores must be nonnegative and bounded. `DISCONNECT` permits an unfinished series after the runtime's reconnect policy, with neither side already at majority. Unknown reasons, unknown winners, conflicting retries, and wrong authorities fail. An identical completed result returns the original response without any financial or Elo changes.

For `p_winner=null`, reasons `SERVER_RESTART`, `BOTH_DISCONNECTED`, `NO_SHOW`, `INCONCLUSIVE`, `MATCH_TIMEOUT`, or `RUNTIME_ERROR` refund both original reservations in full with zero fee. These include three drawn rounds, the runtime hard cap and caught runtime failures. Score arguments are ignored for refunds and stored scores remain zero. Creator cancellation is only for `WAITING`, authenticated and creator-only; it refunds once. A funded match cannot be cancelled by a player RPC.

Waiting rooms expire after ten minutes. Funding sets a fixed deadline **20 minutes after funding**. The runtime configuration returned by the DB specifies **30-second reconnect**, **60-second pre-start**, **1200-second hard cap**. The trusted runtime must enforce reconnect/pre-start timing and call a refund reason when needed. The database refuses late winning settlement **unless the identical authoritative result has been durably recorded**. `fps_expire` refunds expired waiting and funded rooms without recorded results, including a runtime that died before its first request. It handles 1–100 rooms per call with `SKIP LOCKED` and returns `{expired:n}`; an error aborts the batch and is not swallowed.

### Durable result intent and the settlement/expiry race

The required runtime sequence is: persist the final result in the Durable Object, call **`fps_record_result` in a separate request and await its successful commit**, then call `fps_finish` with identical arguments. Retry either request with the original outcome if its response is lost. The worker is not changed by this ledger patch; its owner must wire this sequence before deployment.

`fps_record_result` locks the match and applies the same runtime, winner, reason and majority validation as `fps_finish`. It writes one immutable `fps_result_intents` row and sets the match's monotonic `result_recorded` flag atomically. It moves no funds, updates no rating, and returns the match with `result_recorded:true`. Repeated identical intent succeeds, including after settlement; a different winner, winning score or reason raises `RESULT_CONFLICT`. Refund scores normalize to zero, matching the existing ignored-score refund contract. Intents have RLS, no client table access, immutable triggers and service-only read access for reconciliation.

Intent recording and expiry lock/update the **same match row**. Expiry's selection includes `not result_recorded`; updating the parent when recording the intent makes PostgreSQL recheck that condition if an expiry scan's snapshot preceded the committed intent. An immutable child row plus `NOT EXISTS` alone would not provide that guarantee. Once recorded, both ordinary expiry and later contradictory refund callbacks are blocked. The intent remains after settlement for audit and retry validation. Financial settlement may be retried after `expires_at`, but must exactly match the recorded result. Posting failures leave the previously committed intent and all reservations intact while rolling back the failed settlement.

The service may first record a result after the deadline **only if the match is still FUNDED**. This supports delayed delivery from a trusted runtime; it is not evidence that play finished before the hard cap, so runtime enforcement remains required. If expiry already committed a refund before the first SQL intent, recording fails with `MATCH_NOT_FUNDED` and cannot resurrect the match. There is no atomic transaction spanning Durable Object storage and PostgreSQL: a result saved only in the DO remains exposed to expiry until SQL records it. If recording and finishing are combined in one transaction, a posting failure also rolls back the intent, defeating this protection.

Pending intents intentionally have **no automatic refund timeout**. `fps_reconcile(p_limit int default 100)` recovers them: it selects immutable intents joined to `FUNDED` matches, ordered by intent recording time then match UUID, and locks only the match rows with `FOR UPDATE SKIP LOCKED`. It processes 1–100 matches per call and invokes `fps_finish` with the exact stored winner, scores, reason and authority, including after expiry and while new entries are disabled. It returns **`{settled,failed}`**. A refund intent successfully applied counts as settled. Already completed/cancelled matches are skipped, so subsequent calls do not pay again.

Each settlement attempt runs in a subtransaction. An ordinary per-match exception rolls back that attempt, retains its intent and reservations, increments `failed`, emits a `FPS_RECONCILE_FAILED` database warning with match ID/SQLSTATE/error, and allows other selected matches to continue. The scheduler must inspect `failed`, alert when nonzero, and monitor oldest pending intent age. Cancellation/transaction-wide failures may abort the whole RPC and must also be reported. Repeated failures among the oldest 100 can delay later intents; operators must repair the cause rather than discard or refund recorded outcomes. A missing intent behind a true flag fails direct settlement with `RESULT_INTENT_MISSING`; reconciliation only selects existing intent rows, so monitor inconsistent flags separately. Normal `fps_expire` will not release pending-intent funds.

**Scheduler source is prepared in `workers/fps`**: its every-minute scheduled handler calls bounded `fps_reconcile` and `fps_expire`. The worker and Wrangler schedule require deployment and service credentials; source preparation does **not** install a live production cron. Verify scheduled invocation, RPC errors and nonzero reconciliation failures before enabling cash, and drain additional bounded batches if volume requires it. Without a deployed scheduler, an unresponsive runtime can leave funds reserved until a service operator invokes recovery. Refunds, reconciliation and expiry remain available while FPS/cash entry is disabled. A callback conflicting with a prior expiry refund raises `RESULT_CONFLICT`; the runtime must reconcile from the durable record instead of retrying a different outcome indefinitely. This ledger assignment does not edit the worker.

## Rematches and ratings

`fps_rematch(p_match,p_key)` requires an original participant of a completed/cancelled **two-player** match. First acceptance creates a new private room with the original immutable stake/series, fresh invite and UUID, checks current config/eligibility and reserves only the accepting user's stake. The original match stores `rematch_id`; the child stores `rematch_of`. Second acceptance must come from the original peer and performs fresh checks/reservation. Even a leaked invite cannot let a third party join a rematch. Responses contain the complete new match plus `match_id` equal to `id`; only its creator receives `invite`. Both original participants can discover the request from their original `fps_view`.

Retries using the same key return the same child without a second charge. There is one rematch proposal per original match; a cancelled proposal is not silently recreated or recharged. A waiting match that never acquired an opponent has no peer and cannot request a rematch. A rejected peer acceptance leaves the creator's waiting proposal intact for cancellation or expiration. No peer is autocharged.

Elo uses K=24 with the standard logistic expected score, applied once under ordered rating locks on settlement. Only paid **public** matches count; practice/private/rematch rooms do not farm ratings. `fps_stats()` returns an array of the top 20 `{id,username,rating,played,wins}`, ordered by rating, played, then UUID. It does not expose private match history.

## Verification and remaining deployment work

Run `npx vitest run tests/fps-ledger.test.ts --maxWorkers=1`. The isolated PGlite suite executes the new migrations and actual current `_post`, wallet locking, live-session validation, withdrawal classifier and per-user basis sync helpers. Only external configuration/hold functions and pgcrypto availability are fixture adapters. Tests cover disabled/practice modes, exact cent conservation and rounding, cash/bonus restrictions, idempotency conflicts, BO5/BO9 results, preview/spectator/privacy ACLs, live-session revocation, cancellations, expiry, rematches, intent ACLs/immutability/conflicts, after-deadline settlement, a separately committed intent surviving an injected posting failure, and bounded service-only reconciliation with visible failure counts, continued processing, retained intents and no duplicate payout. A basis replay test applies `fps_entry`, `fps_settlement` and `fps_refund` through the **unchanged production `_withdraw_basis_apply_tx`** in recorded application order and verifies exact bucket/stake/ledger-stake parity. Another test proves FPS settlement leaves a pool stake with an equal bigint game reference untouched.

PGlite is a single connection: this is **not multi-connection race/deadlock proof**, a full migration-history replay, a production Supabase advisor run, or end-to-end runtime/ticket validation. Before enabling cash, use a disposable Supabase/Postgres instance to verify migrations against the deployed schema, run database advisors, race join/cancel/record-result/finish/expire and opposite rematch acceptances with separate sessions, verify the full deployed withdrawal basis rebuild, authenticate the runtime result transport, deploy participant/spectator ticket policy, and demonstrate scheduled crash cleanup plus pending-intent reconciliation. Specifically race an expiry scan with intent recording both before and after it locks the match. No new UI, dependencies, worker edits, live cron or deployment is included in this ledger assignment. Defaults remain `enabled=false`, `cash_enabled=false`.

Relevant primary references consulted: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [PostgreSQL SELECT locking](https://www.postgresql.org/docs/current/sql-select.html), and the [Supabase changelog](https://supabase.com/changelog). Security-definer RPCs pin their search path, qualify extension calls, explicitly revoke default PUBLIC execution and authorize access inside the endpoint; application roles receive only the required RPC grants.
