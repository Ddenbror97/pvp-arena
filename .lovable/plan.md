# Roulette (TEST CREDITS only) — Plan

A multiplayer color roulette in the style of the 2015-era games in your reference picture, with a cleaner, modern look. Every round lands on one server-picked result. Multiple players can win the same round. It uses the same wallet, ledger, fairness system, worker, chat and security rules as Jackpot and Coinflip. There are no deposits, withdrawals, real money or MetaMask transactions.

## 1. Math (fixed, version 1) — for your approval

The wheel has 15 fixed slots. Displayed multipliers are **gross**: they are the total paid back, including your own wager. For example, a $10 bet on Green that wins pays $140 (a $130 profit).

| Color | Slots | Chance | Pays (gross) | Return to player |
|---|---|---|---|---|
| RED | 5 | 33.33% | 2.8x | 5/15 x 2.8 = 93.33% |
| BLACK | 5 | 33.33% | 2.8x | 93.33% |
| YELLOW | 4 | 26.67% | 3.5x | 4/15 x 3.5 = 93.33% |
| GREEN | 1 | 6.67% | 14x | 1/15 x 14 = 93.33% |
| Total | 15 | 100% | | |

- Every color returns exactly 14/15 = **93.33%** to players, so the house edge is **6.67%**, the same as the classic 15-slot game. No color is a better bet than another.
- Winnings are rounded down to the cent, so the house edge can only be very slightly higher, never lower.
- The chances never depend on how much is bet. If the math ever changes, it becomes version 2. Version 1 is locked in the database and cannot be edited.
- Fixed slot order, spread out so the colors don't bunch together: `G R B Y R B R Y B R B Y R B Y`.
- Limits (test credits):
  - Bets: $1.00 minimum, $10,000 maximum per bet.
  - Up to 10 bets per player per round.
  - Round pot: $1,000,000 maximum.
  - All limits are enforced by the server under simultaneous bets.

## 2. Round flow

```text
WAITING --first bet--> BETTING (20s countdown) --> LOCKED (1s) --> SPINNING (5s) --> SETTLEMENT --> COMPLETED
                         \--> CANCELLED (only if the round is stuck more than 10 minutes: every bet refunded once, no payouts)
```

- The next round opens automatically as soon as one finishes.
- The result is fixed by the server the moment betting closes. The spin only shows it.
- After the round locks, nobody can add, edit or move a bet.

## 2b. Corrections (from your review)

1. **Fairness uses the exact existing method.**
   - It is the same keyed HMAC-SHA256 as Jackpot and Coinflip: the secret seed is the key and the Roulette message is the input. There is no new "hash(seed + message)" method.
   - It uses the same kind of redraw (rejection sampling) as the Jackpot ticket draw.
   - Fixed test examples will be checked against a separate implementation. They cover every color, the first and last slot, the redraw limit, and the maximum value.
2. **Who can cancel.**
   - Only the internal recovery step, run by the server worker, can cancel a round. No player can call it, and there is no cancel button.
   - A round can be cancelled only while it is still in BETTING and more than 10 minutes past its database betting deadline. The database clock decides the timing, not the browser.
   - Locking and cancelling both take the same lock on the round row and re-check the status after taking it. So once LOCKED is saved, a round can never be cancelled or refunded.
   - A round in SPINNING or SETTLEMENT can't be cancelled either. It can only be retried until it settles.
   - Tests will run cancel against lock, and cancel against settlement, as real simultaneous transactions.
3. **Why the public `roulette_tick()` is safe.**
   - Browsers call it only so rounds move on time between worker runs. It takes no input: no round number, color, amount or state.
   - All it can do is apply the next step that is already due by the database clock. The actual steps stay internal and can't be called by browsers.
   - It uses the existing global throttle and a lock, so repeated or simultaneous calls just merge into one run.
   - Even with the right timing, a malicious caller can't create, change, speed up or pay out anything.
   - Tests will make these calls signed out, signed in, and with forged or malicious requests.
4. **Timing.**
   - The server keeps rounds moving on its own every few seconds (a short loop inside the existing every-minute job, under the same lock). The throttled browser tick just adds extra nudges.
   - Browser timers only drive the display. Server timestamps decide every step, and the result is drawn inside the lock step.
5. **History is display only.** The last-100 counts never affect chances, the slot picked, payouts, settings, seeds or timing.
6. **The database is the authority on the math.**
   - The wheel settings can't be changed once any round has used them; a database guard blocks edits and deletes.
   - Settlement reads each round's stored version and multipliers inside the same transaction.
   - The app's own copy of the numbers is only used for display, and tests check it matches the database.

## 3. Betting

- You can place several bets on one or more colors. Each bet is its own record: bet number, round, player, color, amount, time, status.
- The server takes each wager from the same wallet as the other games. Each winning bet gets exactly one payout, linked to that bet. A repeated request with the same key has no extra effect.

## 4. Fairness (same method as Jackpot and Coinflip)

- **Seed:** each round gets a secret 32-byte random seed. Its fingerprint is published when the round opens, and the seed itself is revealed after payouts.
- **Result:** the server hashes the seed with the round's unique message `PVPCasino:roulette:v1:{round}:{draw_version}:{counter}`. That gives a number which picks one of the 15 slots, and the slot gives the color. Numbers that would make some slots slightly more likely are thrown away and redrawn, so every slot has exactly the same chance.
- The Fairness page gets a Roulette tab with a verifier and fixed test examples.

## 5. Screens

- **New Roulette page** in the site menu and the phone bottom bar.
- **Main area:** a wide strip of coins that scrolls, speeds up, slows down and stops exactly on the server's slot under a center marker (modern version of your reference), plus:
  - the countdown and round status;
  - the last 10 results with Red/Black/Yellow/Green counts over the last 100 rounds;
  - an amount box with quick buttons (Clear, +1, +10, +100, ½, 2x, Max).
- **Four bet columns** (Red 2.8x, Black 2.8x, Yellow 3.5x, Green 14x), each showing its total, player count and the list of bets.
- **Coins:** the Red, Black and Yellow coins reuse the existing Heads/Tails coin art, recolored. Green uses your new green coin.
- **Chat and phone:** the same shared live chat sits on the left. On phones the chat can be collapsed, and space is reserved so nothing jumps around.
- **Wording:** calm and factual. Green is described as rarer with a bigger payout. There are no "hot", "due", "lucky" or "easy win" words.
- **Recent rounds list:** round number, winning color, pot, number of bets, time, and a "verified" mark.

## 6. Security, tests, report

- **Attack tests:** before calling it done, I'll try to:
  - fake the result or a Green win;
  - bet after the round closes;
  - edit, duplicate or replay a bet;
  - get paid twice, or get both a payout and a refund;
  - bypass the bet and pot limits;
  - call internal functions directly;
  - read or write other players' data;
  - change money through realtime messages.
- **Automated tests:**
  - the math and payouts;
  - fairness examples for every color, the first and last slot, and redraw cases;
  - round steps and refunds;
  - 30 bets at the same instant, a bet at the exact moment betting closes, cancel against bet, and duplicate or crashed workers;
  - balance checks after every test.
- The hourly balance check will also check Roulette.
- **Speed and layout:** I'll measure load size and page jumping before and after, on desktop, tablet, phone and slow 4G, signed in and out, with refresh, back/forward and a direct link.
- **Final report:** math, design, changed files, test and race results, speed numbers, remaining weaknesses, and confirmation that Jackpot and Coinflip were not changed and everything stays test credits only.

## Technical details

- **New tables:**
  - `roulette_config` (versioned, locked once used);
  - `roulette_wheels` (version 1 slot layout and multipliers in basis points, which can't be changed);
  - `roulette_games`, `roulette_game_secrets`, `roulette_bets`, `roulette_results`, `roulette_payouts`.
- **Access rules:** browsers can only read; revealed seeds are published only after completion. Existing no-truncate and live-session guards are added to the new tables.
- **Shared money pieces:**
  - Wallet and ledger: `_post`, `_user_account`, `_system_account`, locking in a fixed order.
  - New transaction types `roulette_entry`, `roulette_settlement`, `roulette_refund` are added.
  - Chat: `game_type = 'roulette'`.
- **Functions:**
  - Players: `roulette_bet(p_color, p_amount, p_idempotency_key)`.
  - Internal only: `roulette_advance(game)` and `roulette_draw_slot`.
  - The public `roulette_tick()` goes behind the existing throttle.
  - The existing every-minute worker also runs Roulette.
- **Settlement:** one transaction for everything, with row locks and one idempotency key per bet.
- **Client code:**
  - The page and components go in `src/routes/roulette.tsx`, `src/components/roulette/*` and `src/lib/roulette/{config,fairness,api}.ts`.
  - The page loads its own code only when opened, and the chat stays on its own lazy load.
  - No new libraries; the animation is plain CSS/requestAnimationFrame using server time, like the coin.
- **Green coin:** your uploaded image is stored as a hosted file.
