# Slimmer, edge-aligned layout for Jackpot and Coinflip

## What's wrong today
- Every page sits in a centered box capped at about 1280px wide. On wide screens the side panels float inward, leaving empty space at the edges.
- On Jackpot, the Players and Your balance panels each take about a quarter of the width (a 1 : 1.35 : 1 split), so they grow as the screen gets wider.
- On Coinflip, "Create a coinflip" is a fixed 360px column with a lot of padding and a large summary block.
- Recent games show as large cards in a grid of four across. The more games there are, the longer the page gets.

## What changes

### Page width (Jackpot and Coinflip only)
- These two pages go full width, with a small side margin (16–24px). Other pages keep the current centered width.

### Jackpot
```text
| Players (~260px) |      Wheel (takes the rest)      | Your balance (~280px) |
```
- The side panels have fixed slim widths and sit against the screen edges. The wheel gets all the space that's freed up.
- **Players:** smaller rows (28px avatar, one line with name, amount and chance), less padding, and a scrollable list with a fixed height that matches the wheel section.
- **Your balance:** tighter spacing, a smaller balance number, a 40px amount box, a compact row of quick-amount buttons, and a 44px Join button.
- **Mobile:** the same stacked order as today (wheel, then balance, then players).

### Coinflip
```text
| Create a coinflip (~280px) |        Open games (takes the rest)        |
```
- The panel sits against the left edge with a slim fixed width. It gets smaller padding and inputs, a smaller Heads/Tails picker, and the You wager / Pot / Win summary becomes a compact 2-line block.

### Recent games (both pages)
- The big card grid becomes a compact table-style list, one slim row per game:
  - Jackpot: game number, winner (small avatar and name), pot, chance, players, time.
  - Coinflip: game number, both players, winning side, pot, time.
- The list has a fixed height (about 8 rows) and scrolls inside itself, so the page stays short however many games are played.
- On mobile, less important columns (time, players) are hidden.

## Out of scope
- No changes to game logic, timing, the wheel or coin animation, fairness, balances or any server behavior. This is presentation only.

## Technical details
- `__root.tsx` `<main>`: keep `max-w-7xl` as the default. Add a full-width variant for `/` and `/coinflip` only, using `useRouterState` pathname: `max-w-none px-4 lg:px-6`.
- `JackpotStage.tsx`: grid becomes `lg:grid-cols-[260px_minmax(0,1fr)_280px] xl:grid-cols-[280px_minmax(0,1fr)_300px]`, keeping the existing `order-*` classes.
- `PlayerList.tsx`: compact rows. The list gets `max-h` plus `overflow-y-auto`.
- `EntryPanel.tsx`: the `Panel` wrapper changes from `p-5` to `p-4`. Input `h-12` → `h-10`, button `h-14` → `h-11`, and smaller type.
- `coinflip.tsx`: grid `lg:grid-cols-[280px_minmax(0,1fr)]`. `CreatePanel.tsx` spacing and sizes tightened the same way.
- `RecentGames.tsx` and `RecentCoinflips`: a compact list component with `max-h-[22rem] overflow-y-auto`, a sticky header row, and `min-w-0`/`truncate` on names. The query limit is unchanged.
- Verify with Playwright screenshots at 1280, 1920 and 390px widths on both pages. The build and type check must pass.
