# FPS settings and spectator refresh

The Esc menu uses separate Game, Crosshair and Key bindings sections in all three modes.
Resume and Leave stay outside the scrolling panel. Audio/fullscreen actions are compact;
crosshair styles have a live preview and color swatches. Narrow windows use a horizontal tab bar.

1v1 and Bomb Defusal share editable device-local key bindings. Reassigning an occupied key
swaps the actions; Escape cancels capture. Existing movement/weapon input messages and server
rules are unchanged. Remapped defaults stop activating their old actions. Existing secondary
modifier and grenade aliases remain available until that action is reassigned.

5v5 and BR share a compact translucent spectator window with the selected player's avatar,
name, health, kills, equipped weapon and magazine count when available. Bots have a robot avatar.
Missing/failed photos use the existing initials fallback. Avatar URLs pass through the existing
allowlisted PlayerAvatar renderer. No user IDs or full inventories are added to spectator views.

Avatars are read alongside the username at authenticated admission and carried in the signed
ticket as presentation data. No additional per-frame database requests. BR health and weapon
details are emitted only for an eliminated viewer's selected spectator target.

PR #259's mouse-resampling fix is included by a regular merge from main.

Release: site plus both match Workers. No schema migration, ruleset change, new secret or
production feature-flag change. Older clients safely ignore the optional spectator fields.

Validation: focused binding, ticket, spectator, settings and mouse tests; site type check;
isolated browser checks of all three settings menus, rebind/cancel interaction, crosshair
selection and footer visibility at 1440×900, 1366×768, 1280×720, 1024×600 and 390×844.
These UI checks use the real components with fixture data, not a signed-in production match.
