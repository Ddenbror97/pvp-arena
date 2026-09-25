# Fix the persistent MetaMask connection failure

## Confirmed diagnosis

- Recent attempts for `ddenbror97` record “connection started” but never record a connected address, so the failure occurs inside the browser-to-MetaMask connection step, before verification or the already-linked check.
- The app currently routes desktop extension connections through MetaMask Connect and retries generic failures through the same client. That leaves extension users exposed to stale sessions and already-pending requests.
- Removing the wallet from `testbot123` therefore cannot fix this generic error; account ownership is checked only after MetaMask has returned an address and the user signs.

## Implementation

1. **Use the installed MetaMask extension directly on desktop**
   - Discover the genuine MetaMask provider through the standard multi-wallet provider event, with a safe `window.ethereum` fallback.
   - Request accounts directly from that provider instead of sending installed-extension users through the MetaMask Connect session layer.
   - Keep MetaMask Connect only as the mobile/no-extension fallback.

2. **Make connection recovery deterministic**
   - Recreate failed connector sessions rather than reusing a rejected cached promise/client.
   - Recognize MetaMask’s “request already pending” error separately and avoid opening duplicate requests.
   - Prevent repeated clicks while one connection request is active.

3. **Replace the generic dead end**
   - Show specific actions for: unlock MetaMask, finish an already-open request, select an account, install/open MetaMask, timeout, and unsupported network.
   - Keep raw provider details private while recording a safe diagnostic code for every failed attempt.
   - Ensure failure logging itself cannot disappear silently.

4. **Verify the full path**
   - Add tests for injected-extension discovery, multiple injected wallets, pending requests, locked/no-account responses, stale connector recreation, user rejection, and mobile fallback.
   - Verify connect → Base Sepolia switch → ownership signature → verified wallet state.
   - Confirm an address already linked elsewhere still produces the explicit “already linked” message only at verification.

## Boundaries

- No changes to balances, game logic, fairness, ledger accounting, deposit matching, or withdrawal processing.
- Base Sepolia remains the only supported test network.
