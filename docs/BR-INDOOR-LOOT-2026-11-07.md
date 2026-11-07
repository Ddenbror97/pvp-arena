# BR indoor loot correction — 2026-11-07

## Cause and change

The old classifier required a ceiling, which also admits roof eaves, porches and covered outdoor ground. It did not distinguish an enclosed room from those surfaces. Cars and outdoor military props additionally generated intentional `beside` loot. The coarse 0.5 m reachability grid could miss narrow stair treads, leaving otherwise accessible raised rooms empty.

- Require an exact overhead ceiling plus enclosure at torso height in at least 12 of 16 horizontal directions. Door openings remain allowed; open-sided porches and carports fail. Voxel wall segments are sampled at one height rather than requiring a single box to span a whole wall.
- Seed reachability just inside authored, traversal-tested entrances in addition to the ground border. Standing clearance and floor-height checks still apply. No teleportation or movement changes.
- Recheck the final settled floor and companion-ammo offsets with the same room test.
- Remove initial roadside loot from cars, military crates, radar trucks and helipads. Initial building loot stays inside; player drops, airdrops and the explicitly authored Iron Peaks summit caches retain their existing behavior.
- Register the enterable Bauhaus block as residential loot space.

## Validation

Regression coverage includes an independently bounded room with an extended roof/porch, all four rotations, companion ammunition, roadside props, and all building types in the authored entrance routes. Real collision tests include the raised mobile home and fire station upper floor. Existing loot caps, repeatable seeds, item support, rarity mix, door behavior and whole-island density are checked.

A local full-island sample (seeds 1234, 7, 99, 4242) produced 6,123–6,228 items. Cold loot generation was approximately 825 ms; repeated rolls were 152–168 ms on this workstation. Room candidates are memoized per model; no per-frame rendering work is added. These are local generation timings, not field FPS or regional latency measurements.

The existing military-quality test now compares rare-or-epic share rather than one seed's epic share: global epic caps can be exhausted before a region is rolled. No loot rarity tuning or caps changed.

## Release

No database migration or asset rebuild. Deploy the site and FPS Worker with the generated production configuration. Battle Royale remains admin-only. New loot is rolled at match creation; existing matches retain their current item positions.

Validation result: 47 focused loot/door/match tests pass. Native Chrome rendered-client checks successfully picked up server-rolled loot in a house, cabin, raised mobile home and fire-station upper floor, with zero page errors. A before/after comparison of every model's door definitions was identical.

