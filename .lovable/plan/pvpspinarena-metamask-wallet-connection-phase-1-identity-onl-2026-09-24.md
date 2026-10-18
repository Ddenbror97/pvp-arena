# PVPspinArena — MetaMask wallet connection (Phase 1, identity only)

An optional, verified MetaMask address on a signed-in account. It has no link to test credits, the ledger, Jackpot, Coinflip or fairness. None of those change.

## What you'll see

A new **Wallet** card on the Profile page:

```text
Not connected:      Connect your MetaMask wallet     [Connect MetaMask]
Connected, new:     0x71A4...A92F  Verification required   [Verify wallet]
Verified:           ● Verified  0x71A4...A92F  [copy]  [Disconnect]
```

- Connect opens MetaMask: the desktop extension, a QR code for the mobile app, or a deeplink on mobile browsers.
- Verify asks you to sign a plain text message in MetaMask. There is no transaction, no gas, no approval and no spending permission.
- Disconnect only ends the browser connection. The verified link stays saved.
- If MetaMask switches to another account, the new address shows as "Verification required". The verified one is never replaced silently.
- The wrong network shows a clear message naming the required network. The app never switches networks automatically.
- Errors show in Portuguese, using the messages from your brief. Raw technical errors are never shown.

## How verification works

```text
Signed-in user -> Connect (MetaMask Connect EVM) -> address
  -> server: validate + normalise address, create challenge
       (32-byte random nonce, issued/expires from DB clock, 10 min)
  -> MetaMask personal_sign of the exact server message
  -> server: recover the signer from the signature, then in one locked
     transaction: challenge belongs to user, not expired, not consumed,
     address matches -> consume challenge -> mark wallet verified
```

The message is built by the server in a deterministic format (version 1):

```text
PVPspinArena Wallet Verification

Domain: pvpspinarena.com
Address: 0x<checksummed>
Nonce: <64 hex>
Issued At: <ISO UTC>
Expiration: <ISO UTC>
Purpose: wallet_verification
Version: 1
```

## Technical details

**Dependencies**
- MetaMask Connect EVM: before installing, confirm the package name and current API against the official MetaMask documentation at that time (currently documented as `@metamask/connect-evm`). No deprecated MetaMask SDK APIs are used. It covers the extension, mobile QR and deeplink flows, and is loaded only in the browser, after the page has finished loading.
- `viem`: used server-side for address validation, checksum normalisation (`getAddress`) and `recoverMessageAddress`. It works in the edge runtime, and the tests also use it to sign messages with throwaway test keys.

**Config**: `src/lib/web3/config.ts` is the one place for chain settings. Ethereum Mainnet (`0x1`) is the initial supported network. The app only reads `eth_chainId` from the connected wallet. There is no custom RPC, no paid provider API key, no transactions and no other RPC calls. Changing the network is a one-line edit.

**Database (one additive migration)**
- `user_wallets`: `id, user_id, chain_type ('EVM'), address (checksummed), normalized_address (lowercase), wallet_provider ('metamask'), is_verified, is_primary, created_at, updated_at, verified_at, last_seen_at`.
  - Checks: the address is 42 characters of `0x` plus hex; the normalized address is lowercase.
  - Unique `(user_id, normalized_address)`.
  - Unique partial index on `normalized_address WHERE is_verified`, so the database itself stops one wallet being verified on two accounts.
- `wallet_verification_challenges`: `id, user_id, wallet_address, normalized_address, nonce, message_version, issued_at, expires_at, consumed_at, created_at`.
  - Checks: expiry is at most 10 minutes after issue; the nonce is 64 hex characters.
- Access rules:
  - Signed-in users can read only their own wallet rows.
  - No one can insert, update or delete these rows directly from the browser.
  - Challenges have no browser access at all.
- Functions (`SECURITY DEFINER`, `search_path = public`, fully qualified tables, execute revoked from public/anon/authenticated, granted only to the server role):
  - `wallet_issue_challenge`: rate-limited. It replaces an earlier unconsumed challenge for the same address.
  - `wallet_consume_and_verify(challenge_id, user_id, normalized_address)`: locks the challenge with `FOR UPDATE`, checks owner, expiry and consumed state against `clock_timestamp()`, then consumes it and upserts the verified wallet.
    - The unique partial index is the final authority. If two accounts verify the same wallet at the same moment, one succeeds. The other's `unique_violation` is caught inside the function, which rolls back that account's challenge use and returns `ALREADY_LINKED`.
    - A dedicated test runs two accounts verifying the same wallet in parallel and expects exactly one success and one `ALREADY_LINKED`.
  - `wallet_touch`: records a connected but unverified address.
- Audit: events go to the existing `auth_events` table: `WALLET_CONNECTION_STARTED`, `WALLET_CONNECTED`, `WALLET_VERIFICATION_REQUESTED`, `WALLET_VERIFICATION_FAILED`, `WALLET_VERIFIED`, `WALLET_DISCONNECTED`. They store only the masked address and an outcome code. No signatures, messages or tokens are logged.

**Server functions** (`src/lib/web3/wallet.functions.ts` + `wallet.server.ts`, all behind `requireSupabaseAuth`):
- `requestWalletChallenge({address})`
- `verifyWalletSignature({challengeId, signature})`: rebuilds the message from the stored row, never from browser text, and recovers the signer with viem.
- `recordWalletEvent({event})`: accepts only allowed event names.
- The browser's "verified" claim is never trusted.

**Frontend**
- `src/lib/web3/metamask.ts`: lazily creates the EVM client. Uses only `connect`, `personal_sign`, `eth_chainId`, the `accountsChanged` / `chainChanged` / `disconnect` events, and `disconnect`. A code guard blocks every other method, including `eth_sendTransaction`.
- `src/lib/web3/errors.ts`: maps provider codes (4001 rejected, timeout, unavailable, unsupported chain) to the Portuguese messages.
- `src/components/wallet/WalletCard.tsx` on `src/routes/_authenticated/profile.tsx`. Verified state comes from the database via a query. Two open tabs stay in sync because each rereads after changes and on tab focus.
- Nothing wallet-related is stored in localStorage or sessionStorage apart from MetaMask's own session persistence.

**Untouched**: wallet balances, ledger, Jackpot, Coinflip, fairness, workers and email sign-in. Wallet connection never creates an account and never signs anyone in.

## Tests (all will actually be run and reported)

- **Unit** (`tests/wallet.test.ts`):
  - Address validation and normalisation: mixed-case and lowercase count as the same wallet.
  - Message format is deterministic.
  - Nonce is secure random.
  - Signatures made with viem test keys:
    - A valid one passes.
    - A wrong signature, a changed message, a changed address, a different signer or an expired challenge all fail.
  - Provider error mapping and the transaction-method guard.
- **Database integration** (`tests/db/wallet.integration.test.ts`, isolated test copy):
  - Challenge expiry comes from the database clock.
  - An expired challenge is rejected.
  - Another user's challenge is rejected.
  - A challenge can't be reused.
  - 20 simultaneous verifications with one challenge give exactly one success.
  - One wallet can't be verified on two accounts.
  - Audit rows are written.
- **Access rules** (extend `tests/db/rls.integration.test.ts`):
  - Browser clients can't read or write the tables.
  - They can't call the internal functions.
  - Signed-out calls are rejected.
- **E2E** (Playwright script with a mocked EIP-1193 provider injected in place of MetaMask, signed in via a minted test session for your existing account):
  - Main path: connect, then verify, then "Verified".
  - Refresh keeps the state.
  - Rejected connection, rejected signature, wrong network, MetaMask missing and account switch each show the right message.
  - Expired challenge path.
- **Regression**: existing auth-OTP, Jackpot, Coinflip, fairness, math and RLS suites, plus typecheck, lint and a production build.

The final report lists every file, dependency, table, index, constraint, rule and function, with real test results.

## Not included

Deposits, withdrawals, balances, tokens, contracts, on-chain games, network switching, and a "Remove wallet" feature.
