# Practice route and style variation

Practice remains one mode and the same approachable difficulty. Each round draws
push, slow or lurk from a shuffled bag, and independently draws center, north or
south from another bag. Each bag uses every option before refilling and avoids
back-to-back repeats, including across bag boundaries. New rooms get new random
plans; mirrored spawn rounds mirror the waypoint coordinates.

Push sprints while hidden and investigates sightings promptly. Slow uses ordinary
pace, silent corner approaches and brief cover stops. Lurk uses longer angle holds
and a delayed investigation after losing sight. All variants still search the enemy
spawn and another flank. Aim error, 600 ms perception delay, burst duration and
recovery are unchanged. The bot never uses hidden enemy positions as navigation
targets; only a recent last-seen position can be investigated.

Routes reuse the collision-inflated static graph and existing 800 ms planning
interval. Round plans are selected once, not jittered per frame. Five seconds
without movement outside deliberate holds or combat advances the patrol target;
this recovery emits ordinary movement and never teleports.

The numeric ping and latency hover tooltip are removed for Practice and PvP.
Connection status, ping replies, internal observations and server telemetry remain.
Unused numeric-badge CSS was removed.

Verification: 35 bot/simulation checks pass, including three complete seeded
first-to-seven series, route/style bags, mirrored paths, valid inputs and no fire
through hidden cover. Hosted staging passed Practice and two authenticated PvP
seats with no ping badge/tooltip. Synthetic balances matched after cleanup.
Typecheck and changed-file lint pass. No schema, cash rules or dependencies change.
