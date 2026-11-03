# AWP sniper rifle: handoff (2026-11-03)

## Status

- AWP merged to `main` as `4d1b6e1`, including the Sandgate roof and sponsor update.
- The owner authorized production release and a unified free loadout dialog. Equipment remains
  free in Practice and cash 1v1; it does not debit wallets or introduce a competitive economy.
- Deploy order: **the FPS Worker first** (`workers/fps`), then the site.
  - The new client sends `{v:1,type:"buy"}` and `input.scope`.
  - An old Worker rejects `buy` as an invalid input and closes the socket.
  - No Durable Object migration is needed.

## What the player gets

- **Buy menu (B in spawn), in the 1v1 aim maps and 5v5:**
  - Two cards: the AWP, and the side's rifle (M4A1-S for Police, AK-47 for Terrorists). Keys 1 and 2.
  - In 5v5, Police also get a third card during freeze time: the free defuse kit, key 3. This is main's kit, folded into the menu so that B does both.
  - The server decides whether the window is open:
    - before the round starts: countdown or round end in 1v1, freeze time in 5v5;
    - or the first 20 s of a live round within 7 m of your own spawn.
  - When the window is closed, the menu shows the reason. A "B Buy" hint shows while the window is open.
  - Practice has no economy, so both weapons are free. A purchase gives a full magazine and reserve.
- **The AWP carries over between rounds.** In 1v1 it carries to the next spawn; in 5v5 it keeps through rounds and respawns. A bot that takes over a human's slot reverts to the rifle.
- **CS:GO numbers** (`src/lib/fps/primary.ts`):

  | Stat | Value |
  | --- | --- |
  | Damage | head 459, chest 115, stomach 143, legs 85 |
  | With a vest | chest 112, stomach 140; head and legs ignore the vest (there are no helmets) |
  | Armour penetration | 97.5% |
  | Fire rate | 41 rpm: a 1.463 s bolt cycle, semi-automatic (trigger edge) |
  | Magazine | 5 / 30 (CS:GO since the Nov 2022 update) |
  | Reload | 3.67 s |
  | Movement | 200 / 215 of the rifle speed; scoped 100 / 215 |
  | Accuracy | very inaccurate unscoped; scoped near-perfect after 120 ms; inaccurate while moving fast or in the air |

- **Scope (right mouse):**
  - It is a true 4× zoom: the 70° vertical FOV becomes 19.86°, and mouse sensitivity drops to ×0.25.
  - A circular lens overlay with a reticle is drawn, and the viewmodel is hidden.
  - A shot unzooms. The zoom comes back after the bolt cycle while the wish is still held, as in CS.
  - A reload, a weapon switch, death or a new round cancels the zoom.
  - The server validates `input.scope` (`updateScope`) and the client predicts the same rule.
  - A hidden enemy's zoom state is redacted from 1v1 snapshots.
- **No hip crosshair** while the AWP is held. CSS: `[data-awp="1"]` on the HUD root.
- **First-person animations** (`awp-animation.ts`, `awp-timeline.ts`):
  - idle and the draw (0.95 s);
  - walk, jump and land through the shared `viewmodel-motion`;
  - zoom in and out;
  - shot kick;
  - **the bolt worked by the right hand**: it leaves the pistol grip, closes on the knob, lifts it 65°, draws it back 0.198 rig units (the case ejects at 650 ms), pushes it home, turns it down and returns to the grip;
  - a tactical reload, and an empty reload that ends with the bolt;
  - inspect (F; reuses the M4 inspect clip).
- **Third person:** `awp-world.glb` (3k triangles) replaces the operator's rifle in both modes.
- **Sounds** (procedural, `scripts/fps/build-awp-audio.mjs`): shot plus bolt, reloads, zoom in and out, draw. Enemies hear the AWP report; in 5v5 the bearing-only sound event carries `awp: true`.

## Assets

- Source model: "Sniper" by stevennvh (Sketchfab), CC BY 4.0. It is credited in `public/fps/models/ATTRIBUTION.md`.
- Built by `art/blender/awp/build_awp_viewmodel.py` and merged by `art/blender/merge_awp_viewmodel.mjs`. See `art/blender/awp/README.md` for the node contract.

| File | Size | Triangles (whole file) |
| --- | --- | --- |
| `awp-terrorist.glb` | 3.2 MB | 76k |
| `awp-police.glb` | 4.4 MB | 99k |
| `awp-world.glb` | 0.1 MB | 3k |

- For comparison, the AK and M4 viewmodel files are 96k and 124k triangles. The AWP itself is 10.6k triangles.
- Known model limits:
  - no thumbhole stock;
  - base-colour maps only;
  - no cartridge in the ejection port.

## Code map

| Area | Files |
| --- | --- |
| Rules | `primary.ts` (stats, damage, spread, scope), `buy.ts` (`validateBuy`, `buyBlocked` reasons, `applyPurchase`), `simulation.ts` (`buyPrimary`, `duelBuyWindow`, `primaryStats`), `bomb/match.ts` (`buyBombPrimary`, `bombBuyWindow`, `bombSpawnOf`) |
| Servers | `workers/fps/index.ts`, `workers/fps/bomb.ts`: buys queued from socket messages and applied in the tick |
| Client | `BuyMenu.tsx` + `buy-menu.css`, `DuelMatch.tsx`, `BombMatch.tsx`, `awp-scope.ts`, `renderer.ts`, `bomb/bomb-renderer.ts`, `authored-viewmodel.ts` (AWP variants, trigger-arm rig), `authored-character.ts`, `audio.ts` |
| Tooling | `scripts/fps/awp-review` (runtime viewmodel renders), `scripts/fps/bomb-harness/awp.mjs` (5v5 end-to-end), `compile-check` with `AWP=1`, `gpu-bench` with the "AWP · all maps" button or `?awp=1` |

## Verified

- After the merge with main, the full FPS suite passes: 750 tests, 1 skipped. tsc and eslint are clean.

- **Unit tests:**
  - `tests/fps-awp.test.ts` (12): damage table, kills, bolt and trigger edge, reload, scope, spread, movement, wire validation, buy windows.
  - `tests/fps-awp-animation.test.ts` (8): timeline against the server clocks, sounds against the animation frames, clip ordering, bolt pose, 4× FOV, scope prediction.
- **Two-player match on the real Durable Object runtime** (`tests/fps-runtime.test.ts`):
  - A buys the AWP and B's snapshot shows it;
  - A is zoomed and kills B with a single one-shot body/head hit;
  - every shot is at least 1.463 s apart;
  - A re-buys the rifle the next round and gets 30/90.
- **5v5 browser harness**, all checks passing: buy (5/30), zoom (lens on, room scoped), one scoped body shot through a vest at 20 m kills, bolt gate, zoom resumes, reload unzooms (5/28), re-buy the rifle, no page errors.
- **Shader warm-up:** 0 programs compiled after Ready with the AWP on all five 1v1 maps and in 5v5.
  - Found and fixed along the way: the 5v5 lens hid the rifle while a case was still falling. That compiled the brass shader mid-round; casings now hide with the weapon group, as in 1v1.

## Not done / follow-ups

- **Real-GPU frame timing with the AWP.** Run the GPU benchmark's "AWP · all maps" button in the desktop app's browser pane, with the pane visible.
- **Load size:** the AWP adds about 7.7 MB of downloads to every match. Both team viewmodels are loaded before Ready, so neither a side swap nor a purchase compiles shaders. A later optimisation would be to share the arm rig and textures with the AK/M4 files.
- **Cash 1v1 duels** get the AWP too. That is a balance decision for the owner.
- The right hand's index finger stays extended on the bolt knob (the trigger pose); a curled bolt grip would need a second right-hand bake.
- No Firefox pass.
