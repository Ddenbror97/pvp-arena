# pvparena

Lovable Cloud: 🇺🇸 US
Frontend/CDN: Cloudflare global
Database: same Lovable Cloud US region
Jackpot engine: same region
Wallet ledger: same region
Winner selection: same region. use my connected github # Build PVPCasino — Production-Grade Crypto PvP Jackpot Casino

Build a production-grade crypto PvP casino called **PVPCasino**.

The product should initially contain **ONE game only: Jackpot**.

Do not build additional casino games yet. The goal of this first version is to create an extremely polished, secure, scalable and visually exciting Jackpot experience that can later become the foundation for additional PvP games.

The design should feel like a modern crypto gaming platform inspired by the classic CS:GO betting Jackpot era around 2015, but with a completely original modern UI and branding. Do **not** copy copyrighted designs, logos, assets or exact layouts from existing gambling websites.

---

# 1. Core Game: Jackpot

Jackpot is a multiplayer pot game where users purchase tickets by contributing funds to a common pot.

The user's chance of winning is proportional to the amount they contribute.

### Example

Player A deposits $25.

Player B deposits $50.

Player C deposits $25.

Total pot = $100.

Their ticket ownership is:

* Player A: 25%
* Player B: 50%
* Player C: 25%

When the countdown reaches zero, exactly one player wins the entire pot.

The winner should be selected using a **server-side cryptographically secure random process**, never by the client.

The frontend animation must only visualize the already-determined result.

---

# 2. Important: Production-Grade Architecture

Do NOT build this as a frontend-only demo.

The game must be designed around authoritative server-side state.

The client must NEVER be trusted for:

* wallet balances
* deposits
* ticket amounts
* pot amounts
* player chances
* countdown state
* winner selection
* payout calculations
* game state transitions

All financial and game-critical operations must happen server-side.

Use Supabase/Postgres if that is the project's existing backend architecture.

Use:

* PostgreSQL transactions
* Row-level security
* Server-side validation
* Atomic balance updates
* Idempotency keys
* Database constraints
* Server-generated timestamps
* Server-side game state
* Secure random winner selection
* Immutable game/audit records

Design the system so concurrent users joining at exactly the same time cannot corrupt the pot or balances.

---

# 3. Game Lifecycle

Create a proper state machine.

Suggested states:

```text
WAITING
ACTIVE
DRAWING
COMPLETED
CANCELLED
```

A game begins in:

```text
WAITING
```

The first player can create/join the upcoming jackpot.

The countdown does NOT start with only one player.

The countdown begins when the **second unique player joins**.

At that moment:

```text
countdown = 60 seconds
```

---

# 4. Joining the Jackpot

A player enters an amount.

For example:

```text
$5
$10
$25
$100
```

The system validates:

* authenticated user
* sufficient available balance
* minimum wager
* maximum wager
* game is still accepting entries
* user is allowed to participate
* transaction has not already been processed

Then the amount is atomically deducted from the player's available balance and added to the jackpot.

Create a ticket/entry record containing at minimum:

```text
game_id
user_id
amount
ticket_start
ticket_end
created_at
transaction_id
```

Tickets should represent proportional ownership of the pot.

---

# 5. Ticket System

Use a continuous ticket range rather than rendering thousands of individual tickets.

Example:

Pot:

```text
$100
```

Player A:

```text
$25
```

Player B:

```text
$50
```

Player C:

```text
$25
```

Ticket ranges could conceptually be:

```text
Player A: 0 → 25
Player B: 25 → 75
Player C: 75 → 100
```

A secure random value between 0 and 100 determines the winner.

This means:

```text
Player A = 25% probability
Player B = 50% probability
Player C = 25% probability
```

The implementation should avoid floating-point financial calculations.

Use integer-based smallest currency units wherever possible.

---

# 6. Timer Extension

When the second player joins:

```text
60 second countdown
```

Every subsequent NEW player who joins adds:

```text
+10 seconds
```

However, the timer must have an absolute maximum.

Use:

```text
MAX_GAME_DURATION = 180 seconds
```

This means the countdown can never exceed 3 minutes.

Example:

Current countdown:

```text
42 seconds
```

New player joins:

```text
52 seconds
```

Another player joins:

```text
62 seconds
```

But if the timer is already:

```text
175 seconds
```

a new player may only increase it to:

```text
180 seconds
```

Never exceed the maximum.

Important:

Only a **new player entering the current jackpot** triggers the +10 seconds extension.

Do not extend the timer because an existing player adds more money.

---

# 7. Pot

Display the live jackpot pot prominently.

Example:

```text
JACKPOT

$12,485.00

14 PLAYERS
38 ENTRIES
01:24
```

The pot must update in real time for every connected user.

Use Supabase realtime subscriptions or an equivalent production-grade realtime mechanism.

Do not rely on browser timers as the authoritative game clock.

The server timestamp determines the real countdown.

The frontend calculates the visual countdown from server state.

---

# 8. Multiple Entries

Decide and document whether one user can enter multiple times.

Implement support for multiple entries from the same user.

Each entry should remain individually recorded.

The player's total chance should equal:

```text
sum of their entries / total pot
```

The UI should aggregate their entries in the player list while still preserving individual database entries.

Example:

```text
John
$250 total
25.00% chance
3 entries
```

---

# 9. Player List

Create a live player list.

Each player row should display:

* profile avatar
* username
* total contribution
* percentage chance
* number of entries

Example:

```text
[avatar] John
         $250.00
         25.00% chance

[avatar] Maria
         $150.00
         15.00% chance

[avatar] Alex
         $600.00
         60.00% chance
```

Sort dynamically according to the current game state.

---

# 10. Jackpot Wheel

The central visual element should be a large animated Jackpot wheel.

The wheel should visually represent player ownership.

Players with larger ticket percentages should receive proportionally larger slices.

For example:

```text
Player A 10%
Player B 20%
Player C 70%
```

The wheel should visually communicate that distribution.

Use player avatars and/or usernames inside the wheel segments where practical.

Do not attempt to render thousands of individual tickets.

Aggregate by player.

---

# 11. Drawing Sequence

When the server countdown reaches zero:

1. Lock the game.
2. Prevent new entries.
3. Change state to:

```text
DRAWING
```

4. Server determines the winner using secure randomness.
5. Store the winner permanently.
6. Calculate the payout.
7. Create the payout transaction.
8. Then trigger the client-side drawing animation.

VERY IMPORTANT:

The animation must NOT determine the winner.

The server determines the winner first.

The animation simply reveals the result dramatically.

This prevents cheating/manipulation through browser JavaScript.

---

# 12. Exciting Drawing Animation

Make the drawing feel extremely polished.

Suggested sequence:

### Phase 1 — Lock

Display:

```text
NO MORE ENTRIES

DRAWING...
```

Freeze the player list.

### Phase 2 — Wheel acceleration

The wheel begins spinning quickly.

Use smooth GPU-accelerated animation.

### Phase 3 — Dramatic slowdown

The wheel gradually slows down.

Use realistic easing rather than linear movement.

### Phase 4 — Winner selection

The wheel stops exactly on the server-selected winning player.

### Phase 5 — Celebration

Highlight the winner.

Show the winner's profile image prominently in the center.

Example:

```text
        [WINNER AVATAR]

           WINNER

        @username

       37.42% CHANCE

       WON $4,825.00
```

Use:

* glow
* particles
* subtle confetti
* light burst
* smooth scale animation
* sound hooks
* celebratory transitions

Do not make the animation visually cheap or overly flashy.

It should feel like a premium crypto gaming product.

---

# 13. Winner Probability

The winner announcement must display the winner's actual probability at the moment the game closed.

Example:

```text
37.42% WIN CHANCE
```

Do not calculate this from the final payout.

It must be:

```text
winner_total_contribution / final_pot
```

The value shown must match the immutable game record.

---

# 14. Winner Payout

The winner receives the complete jackpot according to the configured game rules.

Create an immutable payout transaction.

Example:

```text
Game #18492

Final pot:
$12,485.00

Winner:
@john

Win probability:
37.42%

Payout:
$12,485.00
```

Do not modify balances through frontend code.

The payout must be performed atomically and idempotently.

If the payout process fails, the game must not be incorrectly marked as successfully paid.

Build a robust transaction/state model that can recover from failures.

---

# 15. Game History

Create a Jackpot history section.

Show completed games:

```text
Game #18492

$12,485.00

Winner:
@john

37.42% chance

14 players

[avatar]
```

Clicking a completed game should open its details.

Display:

* game ID
* final pot
* number of players
* total entries
* winner
* winner avatar
* winner probability
* payout
* game start time
* game end time
* all participants
* each participant's contribution
* each participant's final probability

Historical game data must be immutable.

---

# 16. Provably Fair / Auditability

Build the architecture so the game can support a transparent provably-fair mechanism.

Do not claim that a system is "provably fair" unless the actual implementation supports the claim.

At minimum, structure the game so the final random selection can later be independently verified.

Prefer a commit/reveal or equivalent cryptographic mechanism where appropriate.

Store the relevant cryptographic data with the game.

For example:

```text
server_seed_hash
server_seed
random_nonce
winner_ticket
```

Do not expose sensitive randomness before the game is finalized if doing so would allow manipulation.

Create a clear technical separation between:

```text
randomness generation
winner selection
animation
```

---

# 17. Wallet

Build a basic internal wallet architecture.

Users should have:

```text
Available balance
Locked/in-game balance
Transaction history
```

Transactions should include:

```text
deposit
withdrawal
jackpot_entry
jackpot_payout
refund
```

Every balance-changing operation must have an immutable ledger record.

Never simply update:

```text
users.balance = users.balance - amount
```

without a corresponding transactional ledger.

Design the wallet for future crypto integrations.

---

# 18. Crypto Architecture

PVPCasino is intended to become a crypto casino.

Do not fake blockchain transactions.

For the MVP, create a clean abstraction layer:

```text
WalletProvider
DepositProvider
WithdrawalProvider
BalanceProvider
```

This allows actual crypto providers/blockchains to be integrated later without rewriting the Jackpot engine.

Do not hard-code a specific blockchain unless required.

Use configuration/environment variables for:

* supported assets
* network
* minimum deposit
* minimum withdrawal
* wallet addresses
* provider configuration

---

# 19. Security

Treat the Jackpot engine as a financial system.

Implement protections against:

* double spending
* duplicate submissions
* race conditions
* replay attacks
* manipulating game state from DevTools
* modifying wager amounts client-side
* manipulating countdowns
* selecting a client-side winner
* duplicate payouts
* negative balances
* invalid currency amounts
* joining closed games
* joining during DRAWING
* unauthorized access to other users' wallets
* unauthorized modification of game records

Use:

* database constraints
* transactions
* server-side authorization
* RLS
* idempotency keys
* audit logs
* rate limiting
* validation
* secure random generation

---

# 20. Authentication

Implement user authentication with:

* email/password
* social login architecture ready for future providers
* username
* avatar
* account creation date

The user profile should have:

```text
username
avatar
wallet balance
games played
games won
total wagered
total won
```

Do not expose sensitive financial/account information publicly.

---

# 21. Main UI

Create a premium dark crypto-gaming interface.

Brand:

# PVPCasino

The visual identity should communicate:

* crypto
* PvP
* competition
* jackpot
* premium gaming
* modern technology

Avoid making it look like a generic crypto dashboard.

The Jackpot game should be the visual centerpiece.

Suggested layout:

```text
------------------------------------------------
PVPCasino        Jackpot       Wallet  Profile
------------------------------------------------

              CURRENT JACKPOT

                $12,485.00

                  01:24

              [ JACKPOT WHEEL ]

                 DRAWING AREA


Players                                  Your Entry

[avatar] John     25.4%                 $250
[avatar] Maria    18.2%
[avatar] Alex     12.1%
[avatar] Lucas     9.4%

------------------------------------------------
Recent Jackpot Games
------------------------------------------------
```

Responsive design is mandatory.

Desktop should feel immersive.

Mobile should remain fully usable.

---

# 22. Entry Panel

Create a prominent entry panel.

Display:

```text
Your balance:
$420.00

Enter amount

[$ 25.00]

Quick amounts:

$5   $10   $25   $50   MAX

Your estimated chance:
2.84%

[ENTER JACKPOT]
```

The chance preview should update instantly.

Before submitting, clearly show the amount being committed.

Prevent accidental double-click submissions.

After successful entry, immediately update the user's entry and the jackpot state.

---

# 23. Live State

The entire game should feel alive.

Realtime updates should include:

* new player
* new entry
* pot increase
* percentage changes
* player count
* countdown
* timer extension
* game state
* drawing
* winner announcement
* completed game

Use optimistic UI only where it cannot affect financial correctness.

Financial state must always be confirmed by the server.

---

# 24. Notifications

Create polished notifications such as:

```text
You entered the Jackpot with $25.00

+10 seconds added

New player joined

The Jackpot is now $4,250

Your chance: 12.84%

No more entries

Drawing winner...

You won $4,250!
```

Do not spam notifications.

---

# 25. Database Structure

Create a clean relational schema.

At minimum consider:

```text
profiles
wallets
wallet_transactions
jackpot_games
jackpot_entries
jackpot_players
jackpot_results
audit_logs
```

Potential jackpot_games fields:

```text
id
status
pot_amount
player_count
entry_count
started_at
countdown_started_at
scheduled_end_at
actual_end_at
max_end_at
winner_id
winner_ticket
server_seed_hash
server_seed
random_nonce
created_at
updated_at
```

Potential jackpot_entries:

```text
id
game_id
user_id
amount
ticket_start
ticket_end
transaction_id
created_at
```

Use proper indexes.

Do not duplicate financial truth unnecessarily.

---

# 26. Game Engine

Create a dedicated Jackpot service/module.

Example architecture:

```text
jackpot/
  engine
  state
  entries
  timer
  drawing
  payout
  fairness
  validation
```

The frontend should communicate with this backend service rather than implementing game logic itself.

Keep business logic isolated and testable.

---

# 27. Edge Cases

Handle all of these explicitly.

### Only one player

If only one player exists, countdown does not begin.

### Second player joins

Start the 60-second countdown.

### New player joins

Add 10 seconds, capped at 180 seconds total.

### Existing player adds more

Increase their contribution but do NOT add another 10 seconds.

### Player disconnects

Their participation remains valid.

A browser disconnect must never cancel their wager.

### User closes browser during drawing

The game continues server-side.

### Two players join simultaneously

Both transactions must be handled safely.

### Timer reaches zero while an entry request arrives

The server decides whether the request arrived before the authoritative closing time.

The frontend must not decide.

### Payout failure

Do not create a fake success state.

Create a recoverable payout state and audit record.

### Duplicate request

Idempotency prevents duplicate entry/payout.

---

# 28. Testing

This is production-grade code.

Write tests for:

* ticket calculation
* probability calculation
* timer initialization
* timer extension
* timer maximum
* multiple entries
* concurrent entries
* insufficient balance
* duplicate requests
* game locking
* winner selection
* payout
* idempotency
* race conditions
* unauthorized access
* RLS policies
* wallet ledger consistency

Include integration tests for the complete lifecycle:

```text
WAITING
→ ACTIVE
→ DRAWING
→ COMPLETED
```

---

# 29. Admin Architecture

Create the foundations for an admin dashboard, but do not overbuild it yet.

Admin should eventually be able to see:

* active games
* completed games
* total volume
* players
* transactions
* payouts
* errors
* suspicious activity
* game audit trail

Do not create admin controls that can secretly manipulate winners or financial records.

All administrative financial actions must be auditable.

---

# 30. Responsible Gambling / Compliance Foundations

Because this is a real-money/crypto gambling product, build the product so jurisdiction-specific compliance can be added before real-money launch.

Create configuration points for:

* age verification
* KYC
* AML
* geolocation restrictions
* responsible gambling limits
* self-exclusion
* deposit limits
* wager limits
* withdrawal controls
* terms and conditions
* privacy policy
* responsible gambling information

Do not represent the MVP as legally approved or licensed unless the required approvals actually exist.

Before enabling real-money gambling for the public, the product must be reviewed for the jurisdictions where it will operate.

---

# 31. Important Product Principle

The first release should be **one exceptionally polished game**, not a large casino with many unfinished features.

Do NOT build:

* roulette
* blackjack
* crash
* slots
* sports betting
* poker

yet.

Focus entirely on making:

# PVPCasino Jackpot

feel fast, exciting, trustworthy and production-grade.

---

# 32. Implementation Order

Build in this order:

### Phase 1

Project architecture and design system.

### Phase 2

Authentication and profiles.

### Phase 3

Wallet and immutable transaction ledger.

### Phase 4

Jackpot database schema.

### Phase 5

Server-side Jackpot engine.

### Phase 6

Entry/ticket system.

### Phase 7

Realtime game state.

### Phase 8

Countdown and timer extension.

### Phase 9

Secure winner selection.

### Phase 10

Payout engine.

### Phase 11

Jackpot wheel.

### Phase 12

Drawing animation.

### Phase 13

Winner celebration.

### Phase 14

Game history.

### Phase 15

Security/RLS/rate limiting.

### Phase 16

Automated tests.

### Phase 17

Production hardening.

---

# 33. Do Not Cut Corners

Do not implement this as a mockup.

Do not hard-code:

* winner
* percentages
* balances
* pot
* countdown
* payouts

Do not trust client-side values.

Do not use Math.random() for winner selection.

Do not let the frontend determine the winner.

Do not create fake wallet transactions.

Do not create fake crypto deposits.

Do not use placeholder logic in the core Jackpot engine.

If something cannot safely be implemented yet, create a clearly isolated interface/abstraction rather than pretending it works.

---

# 34. Final Acceptance Criteria

The implementation is considered successful only when:

1. Multiple authenticated users can join the same Jackpot.
2. Contributions are securely deducted.
3. The pot updates in realtime.
4. Ticket ownership is proportional to contribution.
5. The second player starts the 60-second timer.
6. New players add 10 seconds.
7. The timer cannot exceed 180 seconds.
8. Existing players adding money do not extend the timer.
9. The server exclusively controls game state.
10. The server exclusively determines the winner.
11. Winner selection uses cryptographically secure randomness.
12. The wheel animation reveals the predetermined winner.
13. The winner's actual probability is displayed.
14. The complete pot is paid according to the configured payout rules.
15. The payout is atomic/idempotent.
16. Completed games are permanently auditable.
17. Concurrent users cannot corrupt balances or the pot.
18. Client-side manipulation cannot alter financial/game results.
19. The game continues if users disconnect.
20. The interface feels like a polished modern crypto PvP casino.
21. The experience works perfectly on desktop and mobile.
22. Automated tests cover the critical game and financial logic.

Start by building the **Jackpot game and its production-grade backend architecture**.

Do not add additional games until this Jackpot implementation is complete, tested and stable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pvp-arena.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21c592a2-8b02-4d94-8cf9-bc1f7f5a2fd3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
