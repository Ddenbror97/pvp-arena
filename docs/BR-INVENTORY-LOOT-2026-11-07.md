# BR inventory interaction and loot density — 2026-11-07

## Inventory / match exit protection

The report was that clicking with B inventory open exited the whole game window. Inspection found that the panels covered only part of the viewport, global mouse handlers did not explicitly exclude inventory mode, and leave actions were direct navigation links. No application call that closes a browser window was found; the exact original window-exit symptom was not independently reproduced.

- Put inventory inside a full-game input shield. Item selection/drag/use still work; blank-space clicks cannot reach the canvas, global firing handlers or other HUD actions behind it.
- Explicitly ignore mouse look/shoot while inventory is open, including the pointer-unlock transition; clear pending fire/aim/grenade mouse buttons on opening it.
- Give inventory buttons explicit non-submit semantics.
- Match/menu leave actions now request a separate confirmation inside the game/fullscreen root. Stay is focused by default, Tab stays within the prompt, and Escape cancels. Only the final Leave link navigates out. Browser-level close/Escape behavior is not trapped.

## More initial loot

Town multipliers increase (0.33–0.5 → 0.55–0.7), with a modest increase in residential/city/warehouse spot density. Every loot-bearing building starts with at least two pickups if it has two valid positions (one if only one is usable). Candidate positions are validated against the actual placed world before choosing the minimum and shuffled deterministically across rooms/floors. Exhausted capped categories fall back to ordinary ammunition for guaranteed spots. Legendary caps remain unchanged.

This affects initial loot in new matches, not already-looted homes or player drops. Sealed/nonenterable buildings still do not get hidden loot, and the indoor-only placement constraints remain.

Four seeded full-island samples produced 12,103–12,125 items, compared with roughly 6,200 before. A seed-1234 building-centre sweep of the 70 m interest radius found at most 106 nearby items / 25 of one item type, within existing instance capacities. Cold local generation was about 1.04 s; subsequent seeded rolls about 0.42 s. These are local generation/visibility checks, not universal FPS measurements.

## Validation

The real React BrMatch and BrInventory run in Chrome with isolated admission/arena fixtures. The test enters native fullscreen, opens B, clicks every bag item and the background, verifies no gameplay mouse-event leakage, navigation, window closure or fullscreen loss, closes B, opens the match menu, requests leave, checks focus containment and cancels. No page errors. The three existing startup regression checks also pass.

32 geometry/indoor-loot/inventory tests pass, including 20 seeds for six small-home models at every rotation with the minimum indoors, plus existing item caps and determinism. Worker lobby/two-player insertion checks and typecheck/build are part of release validation. Lint has no errors; the pre-existing BrHud mixed-export refresh warning remains.

Deploy app and match Worker to publish client input safeguards and server loot rolls. No protocol bump, database migration or access-control changes. BR remains admin-only.
