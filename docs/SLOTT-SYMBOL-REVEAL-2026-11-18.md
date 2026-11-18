# P2P Slott symbol reveal repair — 2026-11-18

The reported missing treatment on every spin came from the reel's spinning flag. Its
`live` value used the mount-time `since` offset pinned for CSS delays as though that
value were a running clock. Once a reel was marked live, it could stay live after
landing. Desktop spin optimization intentionally disables rarity medallions, masks,
filters and glow on moving strips; that optimization consequently kept suppressing
the landed symbols. Comparing the stylesheet before the November 13 extraction
with the current styles found all 168 slot selectors/keyframes unchanged.

The reel now clears its moving state on its own Web Animation completion, guarded
by the active run token so cancelled or replaced spins cannot finish a new run.
The landed parent state is also a stop boundary. This requires at most one state
update per reel stop; moving strips keep the existing performance treatment.
The finite 380 ms stop flash is separate from the moving overlay so the final reel's
flash can finish rather than being removed at landing. Pending spins do not emit a
premature stop flash. Reduced motion keeps the existing static reveal behavior.

Validation: the real Reel/SlotCabinet/SpinFx browser fixture reproduced the stale
flag before the fix (five moving reels after the first stopped). Both browser
regressions now pass: stopped symbol treatment/final flash/subsequent pending and
resolved spins, and reduced motion. The test awaits animation completion rather
than assuming a fast GPU. A landed-frame screenshot was visually checked. All 39
slot presentation/concurrency tests pass, as do typecheck and targeted lint.

Browser regression (requires the normal production build's global CSS):
`npx playwright test tests/e2e/slott-reveal.spec.ts --reporter=line`.

Site-only change. No game outcomes, paylines, weights, payouts, wallets, database,
match Workers, secrets or flags are changed.
