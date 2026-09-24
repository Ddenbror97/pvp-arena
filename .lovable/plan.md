# Crypto deposits and withdrawals: USDC + ETH on Base (testnet first)

## Scope
This follows your architecture documents, with one firm limit: **it runs on Base Sepolia (the Base test network) with free test coins only.** Real-money mainnet stays switched off. It can only be switched on after a gambling license, legal review, a KYC/AML provider and an outside security audit are in place. That keeps the project's "test credits only" rule.

Jackpot, Coinflip and Roulette stay unchanged. They keep using the one USD-cents balance. Crypto only moves money into and out of that balance.

```text
MetaMask (Base Sepolia) -> deposit address -> listener -> confirmations -> ledger credit (USD cents)
                                                                                 |
                                                                        Jackpot / Coinflip / Roulette
                                                                                 |
ledger debit (held) <- withdrawal request <- verified wallet <- withdrawal worker -> on-chain send
```

## What users will see
- **Deposit page:** pick USDC or ETH, see your personal deposit address, send from MetaMask, and watch the status move from Pending to Confirming (x/N) to Credited.
- **Withdraw page:** pick USDC or ETH, enter an amount in USD, and it goes only to your verified MetaMask wallet. You see a fee and ETH-rate preview, then Requested, Approved, Sent and Confirmed, with a link to the transaction on Basescan.
- **History:** deposits and withdrawals, each with its transaction hash.
- **Admin page:** withdrawal review queue, pause switches, treasury balances and reconciliation alerts.
- A clear "TESTNET · no real value" badge everywhere.

## Money rules
- Your balance stays in USD cents. USDC counts as $1 each, rounded down to the cent.
- ETH is valued with the Chainlink ETH/USD price on Base at the moment of confirmation. The price must be under 5 minutes old, or the deposit waits in "Awaiting valuation". A client-supplied price is never used. Each deposit records the price, when it was read and the rounding used.
- Withdrawals in ETH use the current price, converted when the request is made. There is a 2% maximum drift guard, or the request is re-quoted.
- Minimums, maximums, daily limits, a set number of confirmations (e.g. 12 on Base) and manual review above a threshold can all be changed in settings.

## Build phases
1. **Database (added on top, nothing existing changes):** chain/asset config, per-user deposit addresses, deposits, withdrawals, price snapshots, treasury accounts, and new ledger entry types (deposit, withdrawal hold/release/settle, fee). Access rules on every table. All balance changes go through database functions that lock rows. Idempotency is keyed on chain + transaction hash + log index.
2. **Deposit addresses:** addresses derived from one extended public key (xpub) that you supply as a secret, so the server never holds keys for deposit addresses. A sweep step moves funds to the treasury, run from a separate signer.
3. **Listener:** a once-per-minute worker reads Base Sepolia through an RPC provider (Alchemy or similar, needs your key). It picks up USDC Transfer events and native ETH transfers to known addresses, waits for enough confirmations, handles chain reorganisations (drops unconfirmed deposits that disappear), then credits the ledger.
4. **Withdrawals:** a request places a ledger hold straight away. Requests go through risk checks (only a verified wallet, account age, limits, self-exclusion, pending games), then automatic approval under the threshold or admin review above it. The worker signs from a hot wallet whose key is kept as a secret and never reaches the browser. It controls nonces and fees, confirms the send, then finalises the ledger or releases the hold. A global pause switch covers it.
5. **Reconciliation:** hourly, detect-only (the same pattern as the existing integrity checks). It compares the ledger against on-chain treasury and deposit balances and raises an incident if they differ. It never changes balances.
6. **User pages and admin pages** as described above.
7. **Tests:** double-credit and replay attempts, reorganisation, stale price, parallel withdraw vs bet vs withdraw, hold/release, limits, access rules, and a full testnet round trip (deposit, play, withdraw) with test coins.

## Needed from you before building
- An RPC provider key for Base Sepolia (Alchemy, Infura or QuickNode).
- A testnet deposit xpub and a testnet hot-wallet private key (a fresh wallet used only for testing).
- The withdrawal auto-approve threshold and daily limits (defaults: $100 auto-approve, $1,000 a day).

## Not included
Mainnet, real money, fiat, KYC provider, other chains/tokens, putting bets on-chain. Game logic, fairness and settlement are not touched.

## Technical details
- Server functions plus `/api/public/cron/*` routes, each protected by a shared secret, for the listener, withdrawal worker and reconciliation. They are scheduled by the database's existing once-per-minute job scheduler.
- Uses `viem` (already installed) for reading the chain, verifying events and signing on the server. The Chainlink ETH/USD feed on Base Sepolia is read on the server.
- Amounts on-chain are stored as whole-number smallest units (6 decimals for USDC, 18 for ETH). Only the ledger uses USD cents.
- A single setting (`network_mode`) is locked to `testnet`. A database check rejects mainnet chain IDs until it is changed through a migration.
