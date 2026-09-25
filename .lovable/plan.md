# Go live on Base Mainnet with real funds (Base only first, Ethereum later)

Switch on Base Mainnet (chain 8453) for USDC + ETH using the multi-chain rails already built. Ethereum Mainnet stays registered but switched off until Base has run cleanly. Games, fairness and settlement stay the same.

## Decisions baked in
- **Deposit matching: shared treasury + verified sender** (no xpub, no hardware wallet needed). Players send from the MetaMask address they verified on /profile. Deposits from unknown senders go to admin review and are never credited automatically.
- **Two separate wallets:** a Treasury address that receives deposits (you hold the key, it never goes on the server) and a small Payout hot wallet (server holds its key, only a small working float).
- **Base Sepolia test rails are switched off** after mainnet passes its live test. The hourly test-credit faucet and all "TEST CREDITS" labels are removed.
- **Existing test balances:** test credits are wiped to $0 before real money goes on, so nobody can withdraw real USDC against free test coins. History is kept for audit.

## Stage 1 - Safety fixes before any real money (code)
1. `allowlist.ts` is still hard-wired to "testnet only" and blocks chain 8453. Replace with registry-driven checks: exact chain ID, exact Circle USDC contract `0x8335…2913`, 6 decimals, Chainlink ETH/USD feed `0x7104…Bb70`, https RPC, and live `eth_chainId` must match.
2. Fix `crypto_credit_deposit`: the unknown-sender branch can reference a missing price snapshot for USDC.
3. Deposit scan: confirm the `to` filter works with the treasury address; one filter per address if not.
4. Confirmation tag: use a block-number threshold (configurable, default 10 blocks on Base) instead of relying on the `safe` tag.
5. Withdrawals in USDC: check the payout wallet has enough ETH for gas before broadcast; otherwise put the withdrawal in `LIQUIDITY_PENDING` and alert admin.
6. Hard limits for launch (all adjustable in admin): min deposit $2, min withdrawal $5, auto-approve up to $25, anything above needs admin approval, $250/day per user, $1,000/day global, payout wallet max float $500.
7. Emergency stop switch in admin that halts deposits, withdrawals, or both instantly.
8. Two RPC providers must agree on the same block hash before crediting - fail closed on disagreement (already built, verified again here).

## Stage 2 - Secrets and wallet setup (you)
You create these; the app opens a secure form for each, nothing is pasted in chat:
- `BASE_MAINNET_RPC_URL` - Alchemy or QuickNode (free tier fine).
- `BASE_MAINNET_RPC_URL_SECONDARY` - a second, different provider.
- `BASE_MAINNET_PAYOUT_PRIVATE_KEY` - a **brand new** MetaMask account used only for payouts, funded with ~$10 ETH on Base + a small USDC float.
- Treasury public address (not a key) - registered in the database.
- The old Base Sepolia payout key that was pasted in chat is retired and never reused.

## Stage 3 - Site changes
- Remove TEST badges, test-credit faucet (UI and server function disabled), "test coins" copy on wallet, header, games, footer.
- Wallet page: Base is the default and only live network; shows min deposit, confirmation time (~20s), "Send only USDC or ETH on Base" warning.
- Terms, Privacy, Responsible Gambling updated for real money: 18+, self-exclusion, withdrawal rules, no guarantee of availability. Geo-block page for blocked countries (country list chosen by you).
- Update project memory: the "test credits only" rule is replaced by "real money on Base Mainnet, limits enforced".

## Stage 4 - Tests
- Existing 119 unit + database money-path tests must pass unchanged.
- New: mainnet allowlist accept/reject, wrong USDC contract rejected, unknown sender held for review, USDC withdrawal with no gas goes to liquidity-pending, limits and emergency stop, test balances reset.

## Stage 5 - Live rollout
1. Publish with Base Mainnet in **watch-only** mode (detects deposits, credits nothing). Send $2 USDC from your player account, confirm it appears as "seen" only.
2. Turn on crediting. Send $5 USDC, confirm balance credited exactly once.
3. Play one round of each game.
4. Withdraw $5 USDC, then repeat with ETH. Confirm reconciliation shows treasury + payout wallet = player balances.
5. Switch off Base Sepolia. Ethereum Mainnet remains off until you ask.

## Your responsibility (not something the app can solve)
Accepting real-money bets is regulated gambling in most countries (licence, KYC/AML, geo restrictions, tax). The plan adds age confirmation, geo-blocking and limits, but it does not make the site licensed. Please confirm you have checked the rules for where you and your players are before Stage 5.

## Technical details
- Files: `src/lib/crypto/allowlist.ts`, `chain.server.ts`, `crypto.functions.ts`, `jobs.server.ts`, `CryptoRails.tsx`, `CryptoAdmin.tsx`, `SiteHeader.tsx`, legal routes, tests in `tests/`.
- Migrations: fix `crypto_credit_deposit`; add limits/emergency-stop columns to `crypto_settings`; register Base treasury in `chain_treasury_accounts`; enable 8453 in `chain_networks`/`chain_assets` behind a `watch_only` flag; disable `claim_test_credits`.
- Test-balance reset is a one-time balanced ledger transaction per user with audit rows.
