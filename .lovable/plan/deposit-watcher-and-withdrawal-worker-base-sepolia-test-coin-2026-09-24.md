# Deposit watcher and withdrawal worker (Base Sepolia, test coins only)

Continues the approved crypto testnet plan. Base Sepolia only (chain 84532), test USDC and test ETH only. Jackpot, Coinflip and Roulette are not touched.

## Deposit model (unchanged: match by verified wallet)
You chose **"Match by verified address"** earlier, not personal deposit addresses. So there is no xpub and no deposit-address table. One shared treasury address receives every deposit. The watcher credits a deposit only when the sender is exactly one player's verified MetaMask wallet. Transfers from any other sender are kept as "Unmatched" and never credited automatically. An admin can review them. The review's points 1–2 apply only to the personal-address model, so they don't change this plan. The hot-wallet key stays separate and is used only by the withdrawal worker.

## What users will see
- **Wallet page, Deposit:** the site's deposit address, a warning to send only from your verified wallet, and a live list of deposits: Detected, Confirming, Credited (with Basescan link).
- **Wallet page, Withdraw:** pick USDC or ETH and enter a USD amount. For ETH you get a quote that shows the price, the exact ETH amount and a 60-second countdown. Confirm, and the status moves from Requested to Approved to Sent to Confirmed. The payout always goes to your verified wallet.
- **Admin page:** withdrawals waiting for review, approve/reject, three separate switches (whole crypto system, deposits, withdrawals), the hot-wallet balance, and alerts when the numbers don't match.
- A "TESTNET · no real value" badge on every crypto screen.

## How it works
```text
Deposit:  MetaMask -> treasury address -> watcher (every minute, re-checks recent blocks)
          -> "safe" block reached -> sender = one verified wallet? -> USD cents -> ledger credit
Withdraw: request (+ ETH quote) -> balance held at once -> checks -> auto/admin approval
          -> worker signs from hot wallet -> confirmed -> hold settled (or released on failure)
```

## Ledger rules
- Balances come only from the internal double-entry ledger, never from blockchain balances.
- Every money step has its own idempotency key:
  - deposit: `chain_id + tx_hash + log_index`
  - withdrawal hold, settle and release: `withdrawal_id + step`
- The ledger precision is integer USD cents. USDC counts as 1 USD each and is rounded down to the cent. The leftover is recorded.

## ETH withdrawal quotes
- A quote records: quote_id, the Chainlink price and round, the USD amount, the exact ETH amount (in wei), and expires_at (60 s).
- A quote can be used only once. Once it expires it can't be reused, and the user has to request a new one.
- The worker sends exactly the quoted wei.
- USDC needs no quote: the USD amount converts to units at 1:1 with a fixed precision.

## Rollback (reorg) handling
- The database stores a `last_processed_block`. Every run re-scans an overlap window below it (default 200 blocks, which is more than the ~172-block safe lag measured on Base Sepolia).
- Deposits are only credited at the "safe" block. A deposit that has been seen but isn't safe yet stays "Confirming". If it disappears during a re-scan, it goes back to being re-evaluated and is not permanently dropped. If it shows up again in another block, it's picked up again.
- A unique key on the transaction and log position, plus idempotent crediting, means a re-scan can never pay twice.

## Testnet-only safety
- Fixed configuration: `ENVIRONMENT = testnet`, `CHAIN_ID = 84532`, `MAINNET_ENABLED = false`. It's stored in the migration-only allowlist.
- Every worker refuses to start, and raises an alert, unless all of these hold: the RPC reports chain 84532, the USDC contract matches the allowlisted Base Sepolia test USDC, the price feed matches, and the RPC host isn't a mainnet host.
- Auto-approval (up to $100) only works when all of the above pass. Otherwise every withdrawal goes to admin review.
- Switches: `crypto_system_enabled` stops everything. `deposits_enabled` and `withdrawals_enabled` work independently, so withdrawals can be stopped while deposit watching and reconciliation keep running.

## Limits (changeable in settings)
Minimum deposit $1, minimum withdrawal $5, auto-approve up to $100 (testnet only), $1,000 per day per user, and one pending withdrawal at a time. Withdrawals are blocked for self-excluded accounts.

## Build steps
1. Database: switches and a settings table, the block cursor, a withdrawal quotes table, and money functions (credit a deposit, hold/approve/reject/settle/release a withdrawal, record price snapshots). Each function locks rows, keeps the ledger balanced and can be safely retried.
2. Deposit watcher route with overlap re-scan, run on a once-per-minute schedule.
3. Actions for signed-in users (quote, request, cancel), plus the withdrawal worker route.
4. Hourly reconciliation, which only detects problems.
5. Wallet page deposit and withdraw panels, and the admin queue with the switches.
6. Tests:
   - double credit, replay, a rollback that disappears and then reappears, stale price, expired or reused quote
   - parallel withdraw vs bet, hold/release, limits, each switch, access rules
   - no-mainnet tests: chain 8453, mainnet USDC, mainnet RPC host, `MAINNET_ENABLED` flip attempt
7. Full round trip with test coins (deposit, play, withdraw), then the full existing test suite.

## Needed from you
- Test ETH and test USDC in the payout wallet (from the free Base Sepolia faucet and Circle's faucet).
- Later, replace the payout key that was pasted in chat. Enter the new key only in the secure secret form, never in chat.

## Technical details
- Server routes under `/api/public/cron/crypto-*`, protected by the cron secret and scheduled with pg_cron + pg_net.
- `viem` reads and signs on the server only. The browser's MetaMask setup stays identity-only, with no transaction methods.
- USDC is detected through `Transfer` logs to the treasury. Native ETH is detected by scanning the transactions in each block.
- All new functions are SECURITY DEFINER with a fixed search_path. Signed-in users can only call quote, request and cancel. Everything else is service-role only.
