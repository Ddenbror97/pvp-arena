# Deposit watcher and withdrawal worker (Base Sepolia, test coins only)

Continues the approved crypto testnet plan. Base Sepolia only (chain 84532), test USDC and test ETH only. Jackpot, Coinflip and Roulette are not touched.

## What users will see
- **Wallet page, Deposit:** the site's deposit address, a "send only from your verified wallet" warning, and a live list of deposits: Detected, Confirming, Credited (with Basescan link).
- **Wallet page, Withdraw:** pick USDC or ETH, enter a USD amount. See the fee and, for ETH, a 60-second price quote. Confirm. The status moves from Requested to Approved to Sent to Confirmed. The payout always goes to your verified wallet.
- **Admin page:** withdrawals waiting for review (above $100), approve/reject buttons, a pause switch, the hot-wallet balance and alerts when the numbers don't match.
- A "TESTNET · no real value" badge on every crypto screen.

## How it works
```text
Deposit:  MetaMask -> treasury address -> watcher (every minute) -> "safe" block reached
          -> sender = exactly one verified wallet? -> value in USD cents -> ledger credit
Withdraw: request -> balance held at once -> checks -> auto/admin approval
          -> worker signs from hot wallet -> confirmed -> hold settled (or released on failure)
```
- Transfers from unknown or unverified senders are recorded as "Unmatched" and never credited automatically. An admin can review them.
- ETH is valued with the on-chain Chainlink price, which must be under 5 minutes old. If the price is older, the deposit waits.
- If a block is rolled back before crediting, the deposit is dropped. Each deposit can be credited only once (keyed on transaction + log position).
- The withdrawal worker controls its own nonce and fees. If it crashes after a send, it recovers without paying twice.
- Hourly reconciliation checks the ledger against on-chain balances. It only raises alerts and never changes balances.

## Limits (all changeable in settings)
Minimum deposit $1, minimum withdrawal $5, auto-approve up to $100, $1,000 per day per user. At most one withdrawal can be pending at a time. Withdrawals are blocked for self-excluded accounts.

## Build steps
1. Database money functions: credit a deposit, hold/approve/reject/settle/release a withdrawal, record a price snapshot. Each one locks rows, keeps the ledger balanced and can be retried safely.
2. Deposit watcher route plus a once-per-minute schedule.
3. Withdrawal request, quote and cancel actions for signed-in users, plus a withdrawal worker route on the same schedule.
4. Hourly reconciliation route.
5. Wallet page deposit/withdraw panels and the admin review queue.
6. Tests: double credit, replay, rollback, stale price, expired quote, parallel withdraw vs bet, hold/release, limits, access rules. No-mainnet tests: refuses chain 8453, the mainnet USDC address and mainnet RPC hosts. Workers stop if the config doesn't match the allowlist.
7. A full round trip with test coins: deposit, play, withdraw. Then run the full existing test suite.

## Needed from you
- Test ETH and test USDC in the payout wallet (from the free Base Sepolia faucet and Circle's faucet), so withdrawals can be paid.
- Afterwards: replace the payout key that was pasted in chat.

## Technical details
- Server routes under `/api/public/cron/crypto-*`, protected by the cron secret and scheduled via pg_cron + pg_net. The existing tick job stays unchanged.
- `viem` handles reads and signing on the server only. The browser's MetaMask setup stays identity-only, and no transaction methods are enabled.
- USDC is picked up through `Transfer` logs to the treasury address. Native ETH is picked up by scanning block transactions to the treasury address from the last processed block, with the cursor stored in the database.
- Crediting happens at the `safe` block tag, and the confirmation depth is configurable.
- All new functions are SECURITY DEFINER with a fixed search_path. Only the specific user actions can be called by signed-in users; everything else is service-role only.
