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
- ETH is valued on the server with a Chainlink ETH/USD price feed. **Step 0 of the build checks Chainlink's official list** to confirm an ETH/USD feed exists on Base Sepolia and is working (it updates regularly and gives sensible prices). If no feed passes this check, the build stops and I report back. No feed address is assumed. The price must be under 5 minutes old, or the deposit waits in "Awaiting valuation". A price sent from the browser is never used. Each valuation stores the feed address, round ID, answer, update time, block number, valuation time and the rounding used.
- ETH withdrawals work in steps: USD amount, then a quote, then the quote expires (e.g. after 60 seconds), then approval, then the send. When the quote expires or the price moves more than the allowed drift, it is re-quoted and the money stays held. It is never sent at an old price.
- Minimums, maximums, daily limits and manual review above a threshold can all be changed in settings. **The number of confirmations is also a setting.** Its default is based on how Base Sepolia actually finalises blocks and how often it rolls them back (measured during Step 0 and written down with evidence), not simply assumed to be 12.

## Hard testnet allowlist
- Network, chain ID (84532 only), the USDC contract address, the price-feed address and the RPC host are fixed in a database allowlist table that only a migration can change. No settings page, admin page or browser request can change them.
- `network_mode` is fixed to `testnet`. Signed-in users and admins can only read it, never change it.
- Every worker checks its live configuration against the allowlist at startup and before each action. If the chain ID reported by the RPC or any address doesn't match, it refuses to run and raises an incident.

## Build phases
0. **Checks:** confirm the Chainlink feed on Base Sepolia, the official Circle test USDC contract, and Base Sepolia's finality and rollback behaviour. Record all three with evidence in the report.
1. **Database (added on top, nothing existing changes):** chain/asset allowlist, per-user deposit addresses, deposits, withdrawals, withdrawal quotes, price snapshots, treasury accounts, and new ledger entry types (deposit, withdrawal hold/release/settle, fee). Access rules on every table. All balance changes go through database functions that lock rows. Idempotency is keyed on chain + transaction hash + log index.
2. **Deposit addresses:** derived from a **watch-only extended public key (xpub)**. This is sensitive infrastructure data, but it is not a private key, and the server can never work out any private key from it. Each address records its exact derivation path and version (e.g. `m/44'/60'/0'/0/i`) and is given out only once, never reused. Moving funds from deposit addresses to the treasury is done by a separate signer that is not part of this app. Testnet keys and wallets are fully separate from any future mainnet setup.
3. **Listener:** a once-per-minute worker reads Base Sepolia through an RPC provider (Alchemy or similar, needs your key). It picks up USDC Transfer events and native ETH transfers to known addresses, waits for enough confirmations, handles chain reorganisations (drops unconfirmed deposits that disappear), then credits the ledger.
4. **Withdrawals:** a request places a ledger hold straight away. Requests go through risk checks (only a verified wallet, account age, limits, self-exclusion, pending games), then automatic approval under the threshold or admin review above it. The worker signs from a hot wallet whose key is kept as a secret and never reaches the browser. It controls nonces and fees, confirms the send, then finalises the ledger or releases the hold. A global pause switch covers it.
5. **Reconciliation:** hourly, detect-only (the same pattern as the existing integrity checks). It compares the ledger against on-chain treasury and deposit balances and raises an incident if they differ. It never changes balances.
6. **User pages and admin pages** as described above.
7. **Tests:** double-credit and replay attempts, reorganisation, stale price, expired quote and drift re-quote, parallel withdraw vs bet vs withdraw, hold/release, limits, access rules, and a full testnet round trip (deposit, play, withdraw) with test coins.
8. **No-mainnet tests (must pass before any release):** the system rejects a mainnet chain ID (8453), the mainnet USDC address, and a mainnet RPC URL. A private or production key cannot be set through normal settings. `network_mode` cannot be changed from the browser. The deposit and withdrawal workers refuse to run when the configuration doesn't match the allowlist.

## Needed from you before building
- An RPC provider key for Base Sepolia (Alchemy, Infura or QuickNode).
- A testnet watch-only deposit xpub (with its derivation path).
- A testnet hot-wallet private key from a fresh wallet used only for testing. This one is stored as a protected secret.
- The withdrawal auto-approve threshold and daily limits (defaults: $100 auto-approve, $1,000 a day).

## Not included
Mainnet, real money, fiat, KYC provider, other chains/tokens, putting bets on-chain. Game logic, fairness and settlement are not touched.

## Technical details
- Server functions plus `/api/public/cron/*` routes, each protected by a shared secret, for the listener, withdrawal worker and reconciliation. They are scheduled by the database's existing once-per-minute job scheduler.
- Uses `viem` (already installed) for reading the chain, verifying events and signing on the server. The Chainlink ETH/USD feed on Base Sepolia is read on the server.
- Amounts on-chain are stored as whole-number smallest units (6 decimals for USDC, 18 for ETH). Only the ledger uses USD cents.
- The allowlist is kept in a read-only table, protected by triggers and database checks. There is no update path for users or admins; only a migration can change it.
