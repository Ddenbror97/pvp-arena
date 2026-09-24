# Production wallet deposit and withdrawal UX

## Goal
Replace the current address-only deposit card and ambiguous withdrawal form with a guided, one-click MetaMask flow. Keep all funds on Base Sepolia, accept only the account’s verified sender address, and preserve the server-authoritative ledger and existing testnet safety controls.

## Confirmed current issues
- Deposit only displays a treasury address; the player must manually choose the correct network, token, recipient, and amount.
- Deposit has no asset selector, amount field, review step, transaction status, or direct MetaMask action.
- Withdrawal asks for “Amount in USD” before clearly showing what crypto will be received.
- Deposit, withdrawal, crypto history, and the separate game ledger compete on one long page, especially on mobile.
- The wallet connection currently permits connection/signature methods only, so it cannot initiate a deposit or request a safe network switch.

## User flow

### Add funds
1. Show a clear `Add funds / Withdraw` switch, with **Add funds** selected first.
2. Show **Base Sepolia · Testnet** prominently before any amount entry.
3. Let the player choose **USDC** or **ETH** and enter an amount.
   - USDC: show the exact test-credit result, e.g. `10 test USDC → $10.00 test credits`.
   - ETH: show an estimate and state that the final test-credit value is determined by the server price when the confirmed deposit is credited.
4. Provide useful preset amounts without replacing manual entry.
5. Show the verified sending address, destination, expected credit, minimum, and approximate confirmation time in a compact review summary.
6. Primary action: **Deposit with MetaMask**.
7. If MetaMask is on another network, offer **Switch to Base Sepolia** before enabling the transfer.
8. Ask MetaMask to submit exactly one direct transaction:
   - native ETH transfer to the allowlisted treasury; or
   - direct USDC `transfer` to the allowlisted treasury contract/address.
   No token approval, unlimited allowance, arbitrary contract call, or client-side balance credit.
9. After submission, show the transaction immediately as `Submitted`, link to the Base Sepolia explorer, and let the existing watcher independently verify and credit it at the safe block.
10. Keep a secondary **Copy details** option for troubleshooting, but not as the main experience.

### Withdraw
1. Choose USDC or ETH, enter a test-credit/USD amount, and show available and maximum withdrawable balance beside the field.
2. Add presets and a **Max** action.
3. Before submission, show destination address, fee, amount deducted, crypto received, review threshold, and confirmation expectations.
4. For ETH, retain the existing 60-second server quote and make its expiry visible in the review step.
5. Require a final **Confirm withdrawal** action. Keep existing hold, review, cancellation, worker, and release behavior unchanged.

### Activity and mobile layout
- Put crypto activity directly below the active flow with asset, amount, status, timestamp, explorer link, and cancellation only where currently permitted.
- Keep the game ledger in its own separate section below crypto activity.
- Use one full-width flow on mobile rather than two compressed cards; keep stable reserved heights so loading and quote changes do not shift the page.
- Clearly distinguish **test credits** from **test USDC/test ETH** throughout.

## Network and wallet rules
- Base Sepolia remains mandatory because the product is explicitly test-only. Ethereum/Base mainnet would introduce real-value funds and is hard-blocked.
- Base Sepolia can be used through compatible EVM wallet apps; the first implementation uses the already integrated MetaMask connection.
- “Any wallet” does not mean any blockchain network or any sender address. With the shared treasury design, deposits are automatically credited only when the on-chain sender exactly matches the address verified on that PVPspinArena account.
- Transfers from another address remain unmatched and are never auto-credited.

## Technical implementation
- Extend the wallet adapter with narrowly scoped `wallet_switchEthereumChain`, optional `wallet_addEthereumChain`, and `eth_sendTransaction` support used only by the deposit flow.
- Do not expose a generic transaction method to unrelated app code. Build and validate deposit requests against the hardcoded/testnet server allowlist.
- Add authenticated server functions that return verified deposit instructions and an ETH estimate from the existing server-side price source. The browser never supplies treasury, token contract, chain, or authoritative price values.
- Continue treating the blockchain receipt as the source for deposit detection and the database ledger as the source for playable balance. A submitted browser transaction never credits itself.
- Preserve existing withdrawal RPCs, idempotency, holds, review threshold, payout worker, reconciliation, and no-mainnet checks.
- Update wallet/profile wording so the verified address is clearly the required deposit sender and withdrawal destination.

## Validation
- Unit tests for chain switching, rejected switches, rejected transactions, wrong account/network, malformed amounts, exact USDC units, ETH value encoding, and blocked arbitrary/mainnet transactions.
- Integration tests confirming a submitted transaction cannot credit the ledger, unmatched senders remain uncredited, duplicate chain observations credit once, and existing withdrawal protections still hold.
- Browser tests on desktop and Samsung-sized mobile for USDC/ETH deposit, withdrawal review, MetaMask rejection, wrong network, loading/error states, activity refresh, and no layout shift.
- Run the existing full test suite and verify no changes to Jackpot, Coinflip, Roulette, fairness, game balances, or settlement behavior.

## Out of scope
- Mainnet or real-value deposits.
- Supporting unverified sender addresses.
- Per-player deposit addresses, xpub derivation, a second custody system, or another wallet provider.
- Changes to game logic, fairness, payouts, chat, authentication, or the ledger model.
