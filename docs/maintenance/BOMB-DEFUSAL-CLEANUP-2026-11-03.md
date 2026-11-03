# Bomb Defusal final entry, teamwork and cleanup — 2026-11-03

## Entry and display

The normal loading screen no longer has a Lobby link. Its now-unused CSS rule and router import are removed.

Bomb Defusal now reserves mouse capture in the lobby's original click gesture, using the same SPA handoff already used by 1v1. Once assets and a snapshot are ready, the canvas claims capture automatically. Escape during loading cancels automatic entry, and failed capture releases the reservation. Opening equipment/settings does not trigger unwanted recapture. Browser permission refusals still use the existing arena-click fallback; no browser security restriction is bypassed.

Native `node scripts/fps/entry-capture-check.mjs` verifies body-to-canvas transfer after a 6.5-second load with no second click, in Chromium and Firefox.

Displayed Police team labels are now Anti-Terrorist / Anti-Terrorists, including round winners, scoreboard/HUD, 1v1 side names, halftime and equipment feedback. Internal team IDs, character assets and saved state remain compatible.

## Defender behavior

Previously, every defender eventually targeted the bomb's exact position. The regroup test was recomputed without latching, so leaving a staging radius could make a pushing bot turn back. Repeated post-plant spot indices could also select the same position.

The team now selects one defuser (retaining any human already defusing), and reassigns if that operator dies. Other bots clear and cover from separated positions. Retake commitment stays latched for the round, staging goals are spread, and local steering yields to teammates, including exact overlaps. Cover bots watch entrances instead of staring at the defuser. Desperate late defuses are permitted when fighting would lose the round on time.

Callouts expire and come from actual audible events or a bot's visible contact. Silent movement and hidden plan information do not trigger rotations. Utility still uses the existing input, inventory, trajectory and cooldown rules; aim skill is unchanged.

## Cleanup evidence and scope

- Removed the unused loading-link import/CSS, orphaned minimap footer styles and two unused HUD theme variables.
- Removed the duplicate Bomb renderer `previousWeapon` state; grenade follow-through now returns through the shared grenade client's existing `back` state, as 1v1 does.
- Consolidated bot role lookup, selected the defuser once per input batch, removed an immediately overwritten planning call, and corrected stale navigation/callout comments.
- Removed one compiler-confirmed unused shared viewmodel import.
- Import-graph traversal from the Bomb route and FPS Worker reaches all 12 modules in `src/lib/fps/bomb`; there are no orphan modules to delete.
- An additional unused-locals/parameters audit found no diagnostics in the Bomb modules/components. Findings in unrelated casino/wallet code were not changed. All current dependencies remain shared/used; no package-manager or dependency changes.
- Kept checkpoint/cached-client compatibility paths, shader/model warmup, collision, visibility redaction and session checks. These are not obsolete merely because the new UI does not exercise every legacy state.

## Validation and release

Focused bot/HUD/scoreboard/spectator/pointer tests and the real Bomb Durable Object suite pass. A complete seeded bot match exercises plants, defuses, kills and all three utility types. The native renderer checks actual grenade throws returning to the Karambit via shared state, plus plant/defuse spectating, with no new shaders. Typecheck, targeted lint and the configured production build pass.

Deploy the generated production FPS Worker configuration first, then the website. No database migration, financial behavior, jump physics or model changes.
