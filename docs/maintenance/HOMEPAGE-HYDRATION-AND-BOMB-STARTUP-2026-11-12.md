# Homepage hydration and 5v5 startup

## Confirmed homepage fault

The production homepage reported React error 418. A development server running in UTC
reproduced the full component diff: chat inserted a day-separator `<li>` on the server
where the browser expected a `ChatMessageRow`. Messages on either side of UTC midnight
can belong to one local evening in America/Sao_Paulo. Suppressing text warnings does
not fix a different number or type of rows.

Chat now uses deterministic UTC grouping, clocks and absolute labels for SSR and the
hydration render. React's existing `useSyncExternalStore` hydration signal switches
all of these together to browser-local formatting after hydration. Local day grouping
and continued-message folding remain available. The date text warning suppression
was removed. The font bootstrap also stops writing an inline body opacity: the
existing `fonts-ready` CSS class already reveals the page, so the extra mutation
only produced another hydration attribute warning.

The UTC development server and local browser reproduced the original failure before
the change and reported no console errors after it. Regression checks cover UTC,
America/Sao_Paulo and Asia/Tokyo across midnight.

## Map investigation

No selection defect was found. Both Sandgate and Iron District are enabled. Each
receives half of the random interval in `pickBombMap`. A new draw happens when the
room creates a match; a lobby join intentionally fills an existing open room before
creating another. Rejoining that room is not an independent map draw.

`tests/fps-bomb-map-startup.test.ts` builds the actual Worker twice with test-only
fixed entropy, selecting each map deterministically. Both runs admit an authenticated
test player, supply the correct welcome and snapshot map, populate ten slots, advance
simulation snapshots and route another lobby join to the same open room. No production
test flag, map-selection override, security bypass or rotation change was added.

Live practice again selected Iron District and ran with bots fighting. Sandgate's live
browser startup is still not independently observed; its Worker startup is now covered
directly instead of relying on repeated random production joins. The previous release
also verified its published GLB bytes, prop rendering and bot/navigation checks.

## Release scope

Site code and regression tests only. No match Worker, database, secret or feature-flag
change is required. Validation: typecheck, targeted lint, 22 chat/map checks and the
production build.
