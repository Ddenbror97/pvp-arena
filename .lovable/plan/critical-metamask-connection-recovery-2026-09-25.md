# Critical MetaMask connection recovery

## Confirmed issue

Recent records show many `WALLET_CONNECTION_STARTED` events for both affected accounts, but no matching success or failure. The current code gives `eth_requestAccounts` a 120-second app timeout; that timeout cannot cancel MetaMask's underlying request. The page then clears its cached session, so another page visit or retry can submit a second request and MetaMask returns `-32002` (“request already pending”). The button-level lock only protects one mounted screen, not navigation, remounts, or another signed-in account.

## Changes

1. **Stop creating duplicate MetaMask requests**
   - Add a module-level single-flight guard shared across every wallet screen and remount.
   - Never discard an unresolved `eth_requestAccounts` request merely because the app’s display timeout elapsed.
   - Clear the guard only when MetaMask actually resolves or rejects the underlying request.

2. **Reconnect without unnecessary prompts**
   - Check `eth_accounts` first and immediately reuse an already-authorized MetaMask address.
   - Call `eth_requestAccounts` only when no authorized account exists.
   - On `-32002`, re-check `eth_accounts`; if permission has completed, connect successfully instead of showing an error.

3. **Make stale-request recovery actionable**
   - Replace the dead-end pending message with a recovery state that tells the player to open MetaMask and finish or reject the existing request.
   - Keep Retry safe: it rechecks authorization and cannot launch another overlapping request.
   - Preserve explicit rejection, locked-wallet, wrong-network, one-wallet-per-account, and verification behavior.

4. **Add regression coverage**
   - Concurrent connect calls produce exactly one `eth_requestAccounts` call.
   - A remount/retry shares the original request rather than creating another.
   - Already-authorized accounts connect through `eth_accounts` with no popup.
   - `-32002` recovers when an authorized account is available and remains safely actionable otherwise.
   - A display timeout does not release the underlying request guard.

5. **Verify**
   - Run the wallet-focused tests and inspect the preview build result.
   - Test connect, reject, retry, account switch, and navigation/remount behavior with a mocked provider.
   - Confirm no game, balance, ledger, fairness, or crypto-rail logic changed.

## Scope

This fixes the preview code only. The live domains will receive it after publishing; publication is not included in this change.
