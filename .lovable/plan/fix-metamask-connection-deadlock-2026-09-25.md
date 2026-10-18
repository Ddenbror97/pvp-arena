# Fix MetaMask connection deadlock

## Goal
Make wallet connection recover reliably when MetaMask has retained an old permission request, without allowing duplicate prompts or weakening wallet ownership checks.

## Changes
- Replace the dead-end “Check connection” state with an explicit recovery state that continues watching for approval but also lets the player reset a stale site connection.
- Add a guarded MetaMask permission reset using the extension-supported revoke-permissions method, then rediscover the injected provider and start exactly one fresh connection request.
- Remove the app-side timeout around account connection so the page cannot abandon a request that MetaMask still owns.
- Preserve one-wallet-per-account, Base Sepolia, signature verification, server-side wallet checks, and safe audit logging.
- Add tests for stale-request reset, single-flight behavior, rejection, remounts, and already-authorized account reuse.

## Verification
- Run the wallet test suite and type checks.
- Exercise the wallet screen with mocked provider states: pending, reset, approval, rejection, and account switch.
- Confirm the preview build is clean and that no raw wallet error or private data is logged.
