# FPS open-games browser

The lobby uses the existing authenticated/public `fps_lobby` API, which returns
the latest twenty public waiting rooms. The browser filters invalid, expired,
filled, private or disallowed entries and displays five rooms per page. Entry
filters and sorting apply to this recent window; the UI does not claim to search
every room on the site. No per-room profile request is made.

Active-room polling runs roughly every 5–6 seconds. Empty/error responses back
off to roughly 15–16 seconds, with stable per-page jitter. Polling pauses in hidden
tabs; window focus refreshes the query. A response older than thirty seconds, or
a failed refresh, blocks new joins while keeping cached rooms visible. Errors
are distinct from a successful empty lobby.

Reviewing a room does not reserve funds. The single explicit `Join for $X` button
shows the entry, format, 5% fee and winner's payout. Changed/missing room terms,
expired entries, an existing match and insufficient available funds are handled
before entry, with the same server-side atomic checks remaining authoritative.
Cash and eligible credits use the existing real available wallet balance; no
funding or settlement policy was changed.

A new entry refreshes its wallet balance before sending the request. A synchronous
guard prevents concurrent actions. Uncertain network failures retain the original
idempotency key so an already-reserved entry can be recovered without a second
charge; known rejected transactions clear it. Retrying an uncertain join is left
to the server even if that room has disappeared from the public waiting list.

The page retains human-only cash matches and bot Practice while waiting. The
Escape menu now includes Leave practice, backed by the existing owner-checked
`fps_cancel` action. Successful actions refresh the lobby, queue and wallet cache.

Validation uses fixtures for the room browser and settings menu, plus unit tests
for the room window, expiry/status filtering, quote changes and polling policy.
No production wagers are placed by those tests. These changes need an app release;
no database migration or match Worker deployment is required.
