# Poker v1: six-max No-Limit Texas Hold'em

Status: engine, ledger integration, fairness and tests are in
`supabase/migrations/20261014330000_poker.sql`. **Not applied to production.**
`poker_config.enabled` defaults to `false`, so applying the migration opens no tables.

Postgres is the only authority for seats, cards, stacks, actions and settlement. The
browser renders state from `poker_table_state` and sends intents. Animations never gate
game progress.

## Stakes

All amounts are integer cents. The tier label is the maximum buy-in. The schema enforces
`min_buy_in >= 20 bb`, `max_buy_in <= 250 bb` and `big_blind >= small_blind`. Each table
snapshots its blinds, buy-in range and `fee_bps` at creation, so a later config change
never alters a running table.

| id  | Label  | Category | SB  | BB   | Min buy-in | Max buy-in |
| --- | ------ | -------- | --- | ---- | ---------- | ---------- |
| 1   | $5     | Micro    | 2   | 5    | 200        | 500        |
| 2   | $10    | Micro    | 5   | 10   | 400        | 1,000      |
| 3   | $25    | Low      | 10  | 25   | 1,000      | 2,500      |
| 4   | $50    | Low      | 25  | 50   | 2,000      | 5,000      |
| 5   | $100   | Mid      | 50  | 100  | 4,000      | 10,000     |
| 6   | $250   | Mid      | 100 | 200  | 10,000     | 25,000     |
| 7   | $500   | High     | 200 | 500  | 20,000     | 50,000     |
| 8   | $1,000 | VIP      | 500 | 1000 | 40,000     | 100,000    |

These match the site's other games, which use USD cents on the `real` account type
through `money_domain_config`. Tier 1's $0.02/$0.05 blinds are the smallest units the
ledger can represent.

## Money model

This model uses the existing ledger and accounts with no new balances. It adds three
`tx_kind` values.

| Event            | Kind               | game_id | Postings                                                                  |
| ---------------- | ------------------ | ------- | ------------------------------------------------------------------------- |
| Buy-in / top-up  | `poker_entry`      | seat id | user_available → user_locked                                              |
| Each hand        | `poker_hand`       | hand id | players' user_locked → game_escrow → winners' user_locked + house_revenue |
| Leave / cash-out | `poker_settlement` | seat id | user_locked → user_available                                              |

- **Promo credit, same as every other game.** A buy-in spends the player's available
  balance. The withdrawal basis takes eligible (deposited or won) cash first, then bonus,
  exactly like a jackpot, coinflip, roulette or slot entry
  (`20261015020000_poker_promo_parity`).
- **Withdrawal basis.** `poker_entry` (suffix `_entry`) opens a stake keyed by the seat id
  as (eligible, bonus). Each `poker_hand` mixes the pot: every contributor's seat stake
  gives up `put` cents in its own eligible:bonus ratio, and every winner's seat stake gains
  its share in the pot's ratio. Bonus lost to another player therefore stays bonus and
  cannot be cashed out as eligible. `poker_settlement` (suffix `_settlement`) pays the
  cash-out pro rata to the seat stake. A busted seat (0 cashed out) leaves a stale,
  harmless stake row, the same as a lost bet in any other game. Full-rebuild parity
  (`_withdraw_basis_assert_rebuild_idempotent`) is part of the test suite.
- **Disjoint ids.** Seat ids start at 1,000,000,000,000,001 and hand ids at
  2,000,000,000,000,001. The basis keys open stakes by `game_id` alone, and these ranges
  can never collide with jackpot, coinflip, roulette or slot ids. They are also below
  `Number.MAX_SAFE_INTEGER`.
- **Top-ups during a hand** are locked immediately into `pending` and join the stack when
  the next hand opens. The in-hand stack is frozen.
- **Reconciliation.** `poker_reconcile()` checks every open seat, closed seat and completed
  hand against the ledger postings, and that `user_locked` covers all seated chips.

## Fee (5%)

- Uncalled chips (the top contributor's excess over the second-highest) are returned first
  and never feed a pot or the fee.
- Pots are built per contribution level. Adjacent levels with the same contenders merge.
  Chips from folded players above every live player's level join the last pot.
- The fee per pot is `floor(pot × fee_bps / 10000)`, and is charged only if the flop was
  dealt. A hand that ends preflop pays no fee. There is no cap.
- Each pot's net is split evenly among the tied best hands. Odd cents go one at a time
  starting from the first winner left of the button.
- The fee is collected once, inside the same `poker_hand` transaction, whose idempotency
  key is `poker:hand:{id}:settle`. A voided hand (before cards are dealt) moves no money.
- **Fee tickets.** `_fee_ticket_take` is not used. Fee tickets refund one player's fee on a
  single-winner settlement. Poker pots can have several winners and side pots, and the fee
  is charged per hand from all contributors. Adding ticket semantics here would be a new
  fee policy, not a reuse, so it is left out of v1.

## Hooks traced

| Hook                                                                                                                        | Poker v1                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Promo / referral / leaderboard-prize playthrough (`_playthrough_stake`, `promo_apply_wager`, `referral_apply_reward_wager`) | Counted. `_poker_hand_hooks` calls `referral_note_play(user, 'poker', '{hand}:{user}', wagered)` when a real-table hand completes, only for hands that reached the flop.        |
| Referral qualification (`referral_note_play`)                                                                               | Counted, same rule (flop hands, contested chips).                                                                                                                               |
| Partner profit holds (`_partner_profit_record`)                                                                             | Counted. An active partner's net loss in a hand is held against each non-partner net winner, split by their share of the winnings.                                              |
| Wager leaderboard campaigns (`_lb_sync`)                                                                                    | Not counted (separate feature).                                                                                                                                                 |
| Prestige XP                                                                                                                 | Counted. `prestige_award_wager(user, 'poker', 'hand:{id}:{seat}', wagered)`, only for hands that reached the flop. "Wagered" means contested chips (uncalled returns excluded). |
| `get_profile_stats`                                                                                                         | Includes poker. Played = hands with chips in; wagered = contested chips; won = gross pot shares; wins = hands with a share > 0.                                                 |
| Admin cash-flow report                                                                                                      | `admin_ledger_cashflow()` adds a Poker row: real-money USD pot shares won (today and since the epoch), excluding uncalled returns. Fees are already in the platform fee totals. |

Preflop folds do not count toward playthrough: blinds alone would let two accounts clear
wagering requirements cheaply without risk. "Wagered" is contested chips, so uncalled
returns never count.

## Provably fair deck

### Protocol (`v1`)

1. **Player chain.** Each seat commits a SHA-256 hash-chain head `L0` at sit-down. The
   browser generates a 32-byte secret `S` and derives
   `L_k = SHA-256(L_{k+1})`, with `L_N = S`. Only `L0` is sent. A fresh chain is required
   per seat: the server rejects heads that ever appeared as a link or reveal, or that
   another open seat currently holds (`CHAIN_REUSED`).
2. **Server commitment.** At hand open, the server draws a 32-byte `server_seed`, publishes
   `server_seed_hash = SHA-256(server_seed)`, and freezes each participant's current link.
3. **Reveal.** Each participant reveals the next preimage `v` with `SHA-256(v) = link`. The
   reveal becomes the seat's new link.
4. **Entropy.** Once everyone has revealed:
   `entropy = SHA-256("PVPCasino:poker:v1:entropy:{hand}:" + join("|", "{seat}={v}" sorted by seat))`.
5. **Shuffle.** Fisher–Yates over `[0..51]`, from `i = 51` down to `1`. Each draw takes
   the first 4 bytes, big-endian, of
   `HMAC-SHA256(server_seed, "PVPCasino:poker:v1:{hand}:{entropy}:{i}:{counter}")`. Draws
   at or above `floor(2^32 / (i+1)) × (i+1)` are rejected (counter + 1), which makes
   `j = draw mod (i+1)` exactly uniform.
6. **Cards.** For card `c`, `rank = c mod 13` (2..A) and `suit = floor(c / 13)`
   (c, d, h, s).
7. **Deal.** With `n` participants ordered from the first seat left of the button, hole
   cards go round-robin to positions `0..2n−1`. Then come a burn, the flop `2n+1..2n+3`, a
   burn, the turn `2n+5`, a burn, and the river `2n+7`.
8. **Disclosure.** Private cards are readable only by their owner (RLS on
   `poker_hole_cards`). The deck and seed sit in tables with no browser grants. The seed is
   published only when the hand is `COMPLETED` or `VOIDED` (schema constraint
   `seed_hidden_until_done`).

Verification uses `verifyPokerHand` in `src/lib/fairness/poker.ts`. It checks the
commitment against the one this browser saw before the deal (when it did), the seed
against the commitment, every reveal against the frozen link, the entropy, and recomputes
the deck.
The SQL and TS shuffles and evaluators are tested for equality.

### Edge cases

- **Multiple players.** Every dealt player contributes. One honest participant's reveal is
  enough to make the deck unpredictable to the server at commitment time.
- **Disconnected or missing reveal.** The reveal window is 5 s. If any participant has not
  revealed by the deadline, the hand is **voided**: no cards were dealt, no blinds were
  posted, no money moves, and the seed is published. The non-revealers are sat out, and
  the next hand gets a fresh server seed.
- **Leaving during the reveal window** also voids the hand.
- **Timeouts during betting** check when possible, otherwise fold. After `max_timeouts`
  (2) consecutive timeouts, the player is sat out. Sitting out for 300 s cashes the seat
  out.

### Limitations

- **Withholding.** Any participant, or an operator sock puppet seated at the table, can
  refuse to reveal and force a void. That is a choice between "this deck" and "a re-roll".
  Voids are public, recorded with a reason, and attributable to the seats that withheld
  (`poker_hands.voided_by`).
  This reduces operator trust but does **not** make the shuffle operator-independent.
  Concretely, a withholder who learns something before the reveal deadline can trade the
  current deal for a fresh one; each void is one reroll, bounded by the strike limits
  below, and visible in the hand history.
  Mitigations: each missed reveal increments `poker_seats.missed_reveals`; at
  `max_missed_reveals` (2) the seat is cashed out after the hand. A player who caused
  `void_strikes_per_day` (3) voids in 24 hours gets `VOID_COOLDOWN` on sit and sit-back-in.
- **Post-hand disclosure.** Publishing the seed after completion lets anyone recompute the
  whole deck, including cards that were folded or mucked. This is inherent to verifiable
  shuffles and is disclosed here.
- **Operator as a player.** The server sees all hole cards during the hand (it deals
  them). The protocol proves the deck was not chosen; it cannot prove the operator did not
  look. Account-level controls apply as for every other game.
- **Commitment swap.** The published `server_seed_hash` is only meaningful if it is the
  one shown before the deal. The browser stores the hash it saw while each hand was live
  (`src/lib/poker/commitments.ts`, first sighting wins) and the verifier compares the
  final hash with it. A hand not watched live on that device can only be checked against
  the published hash.

## Rules

- Six-max. The button moves one occupied seat per hand. With three or more players, the
  blinds sit left of the button. Heads-up, the button posts the small blind, acts first
  preflop, and acts last postflop.
- Min bet is 1 bb. A min raise is the previous full raise increment. An all-in short of a
  full raise does not reopen betting for players who already acted (TDA rule).
- If every other contender is all-in, the call target is capped at the largest opposing
  street bet, so no one is forced to over-call into nothing.
- New and returning players post a live big blind unless they are in the big blind.
- Side pots, split pots, uncalled returns and odd chips work as described in the fee
  section.
- Leaving folds the player at their next turn, immediately, then cashes out after the hand.
- No voice chat, push-to-talk or microphone access. Text chat is the shared `GameChat`;
  each table has a Hands log.

## Timers and worker

There is no new scheduled job. The Slott job (`pvp-slot-worker`, 1 s) calls the procedure
`slot_tick_worker()`. It runs `slot_tick()` first, unchanged, and commits. It then takes
the due poker tables (most overdue first, then id, at most `tick_tables` = 20) and handles
each in its own committed transaction through `_poker_tick_one`, which uses
`FOR UPDATE SKIP LOCKED` and catches errors, so one table never fails another or the Slott
tick. It stops starting tables after 400 ms; the rest are first in the next run. The name
keeps `slot_tick` in the query text, so `settlement_worker_health` still recognises a
running Slott job. `poker_tick()` is the same loop in a single transaction, for tests and
manual recovery only.

Every run records its duration, processed, failed and skipped counts, backlog, oldest
overdue table and stuck settlements in `poker_worker_stats`. `poker_worker_health()`
(admins and service role) returns that row, its age and the stuck hands.

`poker_nudge` is the browser recovery hint and only performs work already due on that
table, through `_poker_tick_one` like the worker: one concurrent caller does the work
(`SKIP LOCKED`), the others get `not_due`, and a failing table is audited and backed off.
It counts against the shared RPC limit and its own `nudge_rate_limit` (20) per
`nudge_rate_window_seconds` (10). Player RPCs share a per-user limit of `rpc_rate_limit` (40) calls per
`rpc_rate_window_seconds` (10); buy-ins and top-ups also have `buy_in_rate_limit` (10)
per `buy_in_rate_window_seconds` (60). A refused call rolls back with its increments. Calls that change nothing (`poker_commit_chain`
with the current head, sitting out twice, sitting in while active, leaving twice) return
`unchanged` without bumping the table version. The browser coalesces realtime refetches
to one per 250 ms.

At most `max_active_tables` (10) tables can have seated players. Joining a table already in
play is always allowed; taking the first seat at an empty table, or creating one, fails with
`TABLE_CAP_REACHED` at the cap. The cap was set when every real ledger insert queued on
one global withdraw-basis lock. That lock is gone (below); keep the cap until staging
measurements on production-sized hardware support a higher one.

## Withdraw basis without a global lock

`20261014355000_withdraw_basis_per_user.sql`. Each real ledger transaction applies its
basis effect at commit (a deferred constraint trigger) and records a sequence number in
`withdraw_basis_applied`. `_post` locks both of the owner's real wallets before changing
either, and every game path locks its game row, so two transactions that affect the same
user's basis or the same game's stakes are never in flight together, and the commit-time
sequence is a valid serial order. `_withdraw_basis_rebuild_full` replays in that order and
must reproduce the cache; the migration ends by asserting it. Readers (withdrawals,
`crypto_my_activity`) lock the user's wallets first, so they wait only for that user's
in-flight transaction. The advisory lock is now shared for writers and readers and
exclusive only for the maintenance rebuild.

System accounts (`house_revenue`, `house_bankroll`, `game_escrow`, `external_custody`)
are still single rows, so unrelated users' transactions that post to the same system
account still queue on it. See the stress figures in the audit report before raising the cap.

## Lock order

`20261014356000_lock_order.sql`. Every real-money transaction takes locks in this order:

1. game rows: table, then hand, then seats by id (jackpot game, leaderboard campaign);
2. participant wallets (`user_available`, `user_locked`) of every participant, by owner id,
   then kind (`_coinflip_lock_wallets`), all before any ledger write;
3. system accounts by kind name (`_lock_system_accounts`);
4. the Slott bonus budget and prestige rows.

`jackpot_settle` locks every player, then escrow and revenue, before posting.
`prestige_claim` locks the claimant's wallets before `user_prestige`. Leaderboard payouts
lock all pending winners before the bankroll. Promo claims and partner top-ups lock the
user before the bankroll; Slott and roulette lock escrow, revenue and bank after the
players. `referral_try_pay` runs inside other users' transactions (a referred player's
deposit or game), so it takes the inviter's wallets and the bankroll with `NOWAIT`. If
either is busy the reward is deferred (audited `referral_reward_deferred`, status stays
`QUALIFIED`) and paid by the next progress call. Tests: `tests/db/lock-order.integration.test.ts`.
Without the migration the same tests deadlock.

## Integrity guarantees in the schema

- Hand status can only move COMMIT → BETTING | VOIDED, BETTING → SETTLEMENT, and
  SETTLEMENT → COMPLETED. Finished hands, actions, decks, secrets and hole cards are
  immutable.
- The commitment and entropy can't change once set. Per player,
  `stack + total_bet = start_stack` and `end_stack = stack + won + refund`.
- Settlement re-checks the commitment, chip conservation, the board, and
  `payouts + fee = total contributed` before posting. It runs in one savepoint, so a
  failure leaves no ledger entry and the hand stays in SETTLEMENT for the worker to retry.
  Every failure is kept in `poker_settlement_failures`. After 8 failures the worker stops
  revisiting the hand, one `poker_settlement_stuck` incident and warning are raised, and
  `poker_reconcile()` and `poker_worker_health()` report it.
- Recovery is `poker_admin_recover_settlement(hand, mode, reason)` (admin with step-up, or
  a server caller with no user; a userless browser JWT is rejected; reason required; audited;
  idempotent). `retry` runs the same
  settlement again. `refund` voids the hand and returns every contribution, and is
  refused unless no settlement ledger transaction exists and every seat still holds its
  start stack. Chips stay in `user_locked` during a hand, so a refund moves no money. The
  hand guard allows SETTLEMENT → VOIDED only inside that refund.
- Self-exclusion: `poker_sit`, `poker_top_up` and sitting back in refuse an excluded
  player. A running hand plays out; at the next hand the excluded player is cashed out in
  full instead of being dealt in.
- A chain head can't be shared with another open seat (unique index, plus an advisory lock
  per head so concurrent sits fail with `CHAIN_REUSED`). Players need one chain per table.
- A zero-stack cash-out writes no ledger transaction, so it removes the seat's
  withdraw-basis stake directly; the full basis rebuild does the same.
- Browsers can't read `poker_hands.last_error` or `settle_attempts`.
- `poker_admin_collusion_signals(days, min_hands, limit)` (admin with step-up, audited,
  read-only) lists pairs of players with one-way chip flow in shared hands, how much of it
  was conceded without a showdown, and how many tables they shared. Flow is attributed
  per pot (`_poker_hand_transfers`): each contributor's chips in a pot go to that pot's
  winners in proportion to their shares, and the fee to the house. A multiway loser is
  therefore never counted once per winner. Contributions are rebuilt from `wagered` with
  `_poker_pots`' rules and must reproduce every stored pot, or the hand is reported as
  `ambiguous` and left out. Limits: the window holds at most the latest 20,000 hands
  (`truncated`); a third player's chips are attributed by share, not by intent; soft play
  (not betting into a partner) moves no chips and is invisible here; a strong player
  against a weak one looks the same over a short sample. These are leads for review, not
  evidence. Nothing is blocked or penalised automatically.
- Actions are serialized by the table row lock. Each action carries the hand `version`
  (stale actions get `STALE_STATE`) and an idempotency key.

## Table presentation and dealer (visual only)

Everything on screen is driven by the authoritative `poker_table_state` snapshot. The
presentation never decides an outcome, never waits on the server, and never delays an
action.

- **Events.** `src/lib/poker/events.ts` diffs consecutive snapshots into typed events
  (`hand_started`, `hole_cards_dealt`, `player_action_accepted`,
  `community_cards_revealed`, `turn_changed`, `pot_updated`, `showdown`, `player_won`,
  `hand_completed`, `hand_voided`). Each has a stable id. The first snapshot, including a
  reload or reconnect, yields only `state_restored`, so nothing replays. Hole-card events
  carry deal order only, never card values.
- **Director.** `src/lib/poker/director.ts` turns events into a serial timeline: dealer
  pose, face-down card flights in real deal order (`deal_index`, two rounds), burns, board
  flips, chips to bets and pot, the showdown and the payout. A card face appears only when
  its flight lands, and only if the snapshot already contains it. If earlier snapshots are
  still playing more than 2.6 s behind when a new one arrives, they settle instantly. Fast
  mode scales durations by 0.45; reduced motion sets them to 0.
- **Dealer art.** `src/assets/poker/dealer.webp` (override with `VITE_POKER_DEALER_IMAGE`)
  is the supplied character, cut out with transparent edges. `Dealer.tsx` is a **layered
  2D cutout**, not a rigged model. Three feathered layers of the same image move
  independently: the head tilts about the neck, the torso breathes, and the hands nudge
  during the shuffle and deal. Card flights start at her deck (`DEALER_RIG.deck`). There
  is no facial animation: no blinking, lip sync or expressions. To use a rigged character
  later, replace `Dealer` with any component that accepts the same `pose` prop.
- **Voice (optional, off by default).** `voice.ts` defines a `VoiceProvider` interface;
  the shipped provider is the browser's Web Speech API, so no API key exists anywhere. A
  server-side TTS provider can be swapped in behind the same interface. `VoiceService`
  dedupes by event id and keeps a priority queue: lines never overlap, stale lines expire,
  and nothing plays before a user gesture or while the site is muted. Settings: on/off,
  voice volume, effects volume, fast mode, plus the site-wide mute.
- **Sound.** All effects are synthesized with Web Audio in `audio.ts`. There are no audio
  files and no third-party recordings.
- **Turn ring.** The ring is bound to `action_deadline` using server-clock offset.
- **Onboarding.** Three short tips on the first visit, dismissible, stored in
  `localStorage`.
- **Dev replay.** `/poker/replay` (dev builds only; production returns not found and the
  fixture is not bundled) plays `src/lib/poker/replay/recorded-hands.json`. Those
  snapshots were recorded from the real database engine by
  `tests/db/poker-record.integration.test.ts` (`RECORD_POKER_FIXTURE=1`). Query options:
  `?frame=N&play=0&coach=0`.

Limitations: the dealer is an image cutout with subtle layer motion, not a 3D or motion
captured performer. Web Speech voices differ by OS and browser. Hidden cards are never
sent to the browser, so opponents' cards stay face down until the server publishes a
showdown.

## Cross-game id collision in the withdrawal basis (fixed, applied 2026-10-14)

Each game has its own id sequence, so production already has ids used by more than one
game. `withdraw_basis_stake` was keyed by `game_id` alone. A settlement or refund in one
game pooled or deleted another game's open stake with the same id, which misattributed
eligible versus bonus between players. `20261014325000_withdraw_basis_game_scope.sql`
keys stakes by `(user, game, game_id)`, where `game` is the tx kind prefix, and replays the
basis from the ledger. Regression test:
`tests/db/withdraw-basis-game-scope.integration.test.ts`. Poker's disjoint id ranges remain
as defence in depth.
