# npm and local-checkout recovery — 2026-11-02

Use `npm ci` with `package-lock.json`. The repository declares npm as its package
manager. The stale `bun.lock` and unused `bunfig.toml` were removed; no dependency
versions were upgraded. `npm run check:guides` runs the existing TypeScript guide
audit through the already-declared esbuild package, without a Bun installation.
Lovable's build-time packages remain because the current build imports them.
The obsolete Lovable connection notice in `AGENTS.md` was replaced with general
instructions to preserve published history and keep one install lockfile.

## Cloudflare build check

The user inspected Workers & Pages → pvpspinarena → Settings → Build and confirmed
“Connect Git / no repository.” This is user-confirmed dashboard evidence. The
Cloudflare Builds API could not be used to verify it independently: the account
token returned 401 and the Wrangler OAuth credential returned 403. Existing CI
uses `npm ci`; production releases in this chat use the maintained npm checkout.
If a Git-connected build is added later, configure it to install with `npm ci`.

## Old laptop copy

`C:/Users/Wesc9/Projects/pvp-arena` was clean, with `main` at `5b1e19d` from
October 17. Its original remote-tracking main was `0225ef12`; the twelve local
commits are not exact patch-equivalent commits on current GitHub main. Some work
was incorporated differently, so this does not prove that twelve features are
missing. They were not cherry-picked or discarded.

Recovery performed:

- Saved and verified a complete Git bundle, including all branches and stash, at
  `C:/Users/Wesc9/.codex/backups/pvp-arena-2026-11-02/legacy-project-before-sync.bundle`.
- Renamed the old local main to `archive/legacy-main-2026-11-02`, preserving all
  original commits. The existing stash and other local branch were preserved.
- Fetched GitHub main and created a clean tracking `main` at `5e190ab`.
- Reinstalled that checkout with `npm ci`. No saved environment files were changed.

The recovered checkout passes its production build and type check. A fresh copy
must run the build before the type check because the build generates the ignored
guide catalog. The npm guide audit and install/lockfile consistency check also
pass in the maintained checkout. The isolated-schema regression checks verify
that the recovered production-only DROP is excluded from test migrations.

The archived self-exclusion and partner-credit migration paths already exist on
GitHub main, with different blobs. Their old versions were not copied over the
current files. The missing `20261017060000` test-schema migration was restored
separately from its exact archived blob after a read-only production check showed
that its version was already applied and `pvp_test` no longer exists. See
`docs/DATABASE-RELEASES.md`; no database migration was executed.

The 18:04 São Paulo deployment referenced during this review was the Codex release
of `1956192` from
`C:/Users/Wesc9/.codex/worktrees/gsc-seo-release/pvpspinarena`. Its recorded public
verification was `2026-11-02T21:04:35.336Z` (18:04 local), rather than a deployment
from the old Projects checkout.

## Scope kept separate

The eleven React hook dependency warnings remain unchanged for their own
behavioral review. No financial policy, wallet data, production schema or game
rules were changed by this recovery. Unconfirmed archived feature changes remain
available for a separate comparison rather than being replayed onto current main.
