# BUILD FEATURE — PVPSPINARENA BATTLE ROYALE
## RARE TACTICAL IPAD + 10 PERKS + 3 ACTIVE PERK SLOTS

### 1. MAIN OBJECTIVE

Implement a complete, production-grade tactical perk system for my existing browser-based battle royale FPS game.

The game is inspired by modern survival battle royale games such as H1Z1, but the implementation must follow the existing PVPSPINARENA game architecture, original game design, and current gameplay systems.

This is a real gameplay feature, not a visual mockup.

The system must include:

- A rare tactical iPad that players can discover during a match.
- A fully functional perk interface.
- 10 different tactical perks.
- The ability to activate and use exactly 3 perks simultaneously.
- Perk unlocking, selection, activation, deactivation, and replacement.
- Proper integration with existing weapons, ammunition, armor, healing, sprinting, reviving, inventory, loot containers, and multiplayer.
- A polished, modern military-survival interface.
- Reliable synchronization between players and the server-authoritative game state.

The player must be able to develop a tactical playstyle by choosing which 3 perks to activate.

One player might specialize in weapon damage, another in movement, and another in survival and team support.

The system must be balanced, responsive, and optimized for a browser-based multiplayer FPS.

---

# 2. FIRST: INSPECT THE EXISTING PROJECT

Before implementing anything, inspect the entire relevant game architecture.

Identify:

- The existing battle royale gameplay loop.
- Player entity and character state.
- Player inventory and equipment.
- Weapon firing and damage calculations.
- Weapon reload mechanics.
- Ammunition consumption and reloading.
- Weapon switching.
- Armor and armor durability.
- Sprinting and movement.
- Healing and medical items.
- Player revival and teammate interaction.
- Loot container generation and interaction.
- Match lifecycle and player elimination.
- Multiplayer networking and synchronization.
- Server-authoritative gameplay logic.
- Existing UI architecture.
- Existing interaction prompts.
- Existing item rarity and loot systems.
- Existing player progression.
- Existing 3D asset loading and rendering.
- Existing sound and animation systems.

Locate the actual source files responsible for these systems.

Do not assume the project uses a particular framework, networking library, or game engine.

Use the actual existing architecture.

### Critical requirements

Do not rebuild the entire game.

Do not replace existing weapon systems.

Do not create a separate mock gameplay system.

Do not introduce a second player inventory.

Do not duplicate existing movement, reload, damage, healing, or revival logic.

Do not create isolated perk functions that are disconnected from actual gameplay.

The perk system must integrate directly with the existing authoritative gameplay systems.

If a relevant system already exists, extend it instead of replacing it.

If an existing feature is incomplete, determine the correct integration point before implementing the perk.

---

# 3. RARE TACTICAL IPAD

I will provide a tactical iPad model through a Sketchfab 3D asset.

The provided iPad is the actual device that should be used in the game.

## 3.1 Use my provided asset

When I provide the model:

- Inspect the actual model format.
- Inspect its materials and textures.
- Inspect its scale and orientation.
- Inspect its existing screen geometry.
- Inspect whether the screen has a separate material.
- Inspect its texture maps.
- Inspect its animations, if any.
- Determine the correct interaction and attachment points.

Use the supplied model instead of creating an unrelated tablet.

Do not replace the provided model with a generic primitive.

Do not create a different iPad design.

Do not distort the model.

Do not change its proportions to make it fit.

Do not modify unrelated player equipment or weapon models.

If the asset needs optimization, preserve its original appearance and functionality.

If the screen material supports it, integrate the tactical interface directly into the screen.

If the model does not have a usable screen material, implement the interface using the correct existing rendering approach for the game.

The final device must look like a real 3D tactical tablet inside the game.

## 3.2 Item identity

Item name:

TACTICAL IPAD

Item classification:

RARE MILITARY TECHNOLOGY

Description:

"Advanced military field terminal used to access tactical combat upgrades."

The tablet is a rare loot item.

Players must discover it during the match.

It must not be automatically granted to every player at the beginning of a match.

The tablet should be obtainable through the existing loot system.

Possible loot locations:

- Military buildings.
- High-value loot containers.
- Rare supply drops.
- Special military locations.

Use the existing loot spawning architecture.

Do not create a separate incompatible loot system.

The tablet must have an appropriate item icon, rarity, inventory representation, world representation, and interaction prompt.

## 3.3 Tablet interaction

When the player discovers the tablet:

1. The player can pick it up.
2. The tablet becomes available in their inventory.
3. The player can activate it using the existing inventory or equipment interaction.
4. The tactical interface opens.
5. The player can inspect available perks.
6. The player can unlock perks when the requirements are satisfied.
7. The player can select up to 3 active perks.
8. The player can replace an active perk with another unlocked perk.
9. Changes must be reflected in actual gameplay.

The tablet should be accessible through an appropriate inventory action or dedicated equipment key.

Inspect the existing keybind system before selecting a key.

Do not overwrite existing keybinds.

Do not create a key conflict.

If a dedicated key is appropriate, make it configurable through the existing input architecture.

The tablet must not open automatically when picked up.

It must not interrupt combat unnecessarily.

Opening and closing it must work correctly with the existing gameplay state.

---

# 4. TACTICAL IPAD UI DESIGN

Create a modern, premium military tactical interface.

The UI should feel like an advanced military field computer used in a modern battle royale.

Design direction:

- Dark tactical interface.
- Black and charcoal background.
- Subtle military green accents.
- Clean typography.
- Compact information hierarchy.
- Sharp but restrained borders.
- Clear perk icons.
- Professional military computer styling.
- Minimal unnecessary decoration.
- Smooth, responsive transitions.
- Excellent readability.
- No excessive glow.
- No oversized empty spaces.
- No cartoon appearance.
- No mobile-app-looking generic cards.

The design should match the existing PVPSPINARENA game.

Do not redesign the entire game interface.

Only create the tactical tablet and the necessary perk integration.

## 4.1 Main tablet screen

The interface should contain:

HEADER:

TACTICAL SYSTEM

FIELD UPGRADE TERMINAL

PLAYER STATUS:

- Current player.
- Current match.
- Tactical Data available.
- Unlocked perks.
- Active perk count.

PERK SLOTS:

Display exactly 3 active perk slots.

Example:

SLOT 01 — ACTIVE

SLOT 02 — ACTIVE

SLOT 03 — EMPTY

The player must clearly understand that only 3 perks can be active simultaneously.

AVAILABLE PERKS:

Display all 10 perks.

Each perk must have:

- Unique icon.
- Perk name.
- Short description.
- Rarity.
- Unlock status.
- Upgrade cost.
- Current tier, if applicable.
- Active or inactive status.
- Equip or unlock interaction.

The interface must distinguish:

LOCKED

UNLOCKED

ACTIVE

AVAILABLE

INSUFFICIENT DATA

Do not allow the player to accidentally activate more than 3 perks.

## 4.2 Active perk selection

The player can activate any 3 unlocked perks.

Example:

ACTIVE PERKS

1. Deadly Bullets
2. Combat Chip
3. Survival Chip

The player can replace one of these with another unlocked perk.

When replacing a perk:

- Clearly identify the selected active slot.
- Show the replacement action.
- Require a deliberate interaction.
- Apply the new perk correctly.
- Remove the previous perk's gameplay effects.
- Prevent duplicate activation.
- Update the active perk display immediately.

If all 3 slots are occupied, activating another perk must require replacing one of the existing perks.

Never allow 4 active perks.

Never allow a hidden fourth perk.

Never allow the UI to display 3 active perks while the player has 4 active effects.

## 4.3 Tablet opening and closing

The interface must support:

- Open tablet.
- Close tablet.
- Escape to close.
- Appropriate mouse interaction.
- Existing input handling.
- Correct mouse cursor behavior.
- Correct pointer lock behavior.
- Correct game input state.
- Responsive layout.
- Proper UI focus.

When the tablet is open:

- The player must not accidentally fire weapons.
- The player must not accidentally reload.
- The player must not accidentally switch weapons.
- The player must not accidentally move through UI interactions.
- Mouse movement must not rotate the camera when the UI requires cursor interaction.
- Closing the tablet must restore the correct gameplay input state.

Use the existing game UI architecture.

Do not create a separate browser page or external website.

The tablet is an in-game interface.

---

# 5. EXACTLY 10 PERKS

Implement the following 10 perks.

All 10 must be individually functional.

All 10 must have unique descriptions, icons, gameplay effects, and unlock states.

The player may activate a maximum of 3 simultaneously.

Do not replace these perks with different ideas.

Do not remove any perk.

Do not implement only the first few.

---

## PERK 01 — DEADLY BULLETS

Category:

COMBAT

Description:

"Deal increased weapon damage."

Effect:

Increase the player's actual weapon damage by 15%.

The damage increase must apply to the existing weapon damage calculation.

Requirements:

- Apply the 15% damage bonus consistently.
- Integrate with existing weapon damage.
- Integrate with existing hit detection.
- Integrate with existing armor calculations.
- Integrate with existing player damage handling.
- Ensure the bonus applies only to the player who has the perk active.
- Ensure it applies only once.
- Ensure damage cannot be multiplied by activating the perk multiple times.
- Ensure damage values remain server-authoritative.

The damage bonus must not affect:

- Other players.
- AI or NPCs unless the existing game explicitly supports the perk for them.
- Environmental damage.
- Damage caused by other players.

Do not apply the perk through a client-only visual effect.

The actual damage calculation must be modified.

IMPORTANT BALANCING:

The 15% bonus is intentional.

Do not silently change it to 5%, 10%, or another value.

If the existing weapon system uses different damage types, preserve those mechanics and apply the perk at the correct damage calculation stage.

Prevent incorrect double application when the player changes weapons, respawns, reconnects, or activates another perk.

---

## PERK 02 — FASTER RELOAD

Category:

COMBAT

Description:

"Reload weapons faster."

Effect:

Reduce the actual reload duration by 20%.

The perk must integrate with the existing reload system.

Requirements:

- Apply the reduction to compatible weapons.
- Preserve weapon-specific reload durations.
- Preserve magazine and ammunition rules.
- Preserve reload animations.
- Preserve reload sound timing.
- Preserve interruption behavior.
- Preserve reload cancellation.
- Preserve weapon switching behavior.
- Preserve server-authoritative reload completion.

Do not simply speed up the reload animation while ammunition is still loaded at the original timing.

The gameplay reload duration and animation must remain synchronized.

Do not allow the player to fire before the actual reload is complete.

Do not allow repeated reload events to duplicate ammunition.

If a weapon has multiple reload stages, such as shell-by-shell loading, preserve those mechanics and implement the bonus correctly.

---

## PERK 03 — AMMO EFFICIENCY

Category:

COMBAT

Description:

"Use ammunition more efficiently."

Effect:

Give the player a 10% chance to avoid consuming one round when firing.

Requirements:

- Integrate with the actual ammunition consumption system.
- Apply the effect to compatible firearms.
- Do not affect weapon damage.
- Do not create ammunition.
- Do not bypass magazine capacity.
- Do not bypass reload requirements.
- Do not allow ammunition duplication.
- Do not affect other players.
- Do not apply the chance twice.

The perk must work with the existing weapon firing architecture.

The server must determine whether ammunition is consumed.

The player must not be able to manipulate the chance through client-side actions.

If the weapon system does not support a particular ammunition type, do not apply the perk to that type.

---

## PERK 04 — ARMOR SPECIALIST

Category:

SURVIVAL

Description:

"Get more protection from armor."

Effect:

Increase armor durability effectiveness by 15%.

Integrate with the existing armor system.

The perk should improve the actual armor durability or protection calculation.

Requirements:

- Preserve the existing armor types.
- Preserve armor durability.
- Preserve armor damage calculations.
- Preserve armor destruction.
- Preserve armor replacement.
- Preserve inventory behavior.
- Preserve armor visual changes.

Do not create a separate armor system.

Do not make the player invulnerable.

Do not allow the perk to bypass the existing armor durability limit.

The effect must be consistent with the current game damage and armor architecture.

If armor currently has separate damage absorption and durability mechanics, determine the correct implementation before applying the bonus.

Do not create an unintended damage reduction multiplier on top of the armor system.

---

## PERK 05 — FAST REVIVE

Category:

TEAM SUPPORT

Description:

"Revive teammates faster."

Effect:

Reduce the actual teammate revive duration by 30%.

Requirements:

- Integrate with the existing teammate revival system.
- Apply the bonus only to the player performing the revive.
- Preserve the existing revive interaction.
- Preserve revive interruption.
- Preserve revive distance requirements.
- Preserve player movement restrictions.
- Preserve revive animations.
- Preserve revive completion.
- Preserve revive rewards, if applicable.

The perk must not:

- Revive enemies.
- Revive dead players if the existing system does not permit it.
- Automatically revive teammates.
- Remove the existing revive interaction.
- Allow revival through walls.
- Allow revival from an invalid distance.

The server must determine the actual revive completion time.

If the game has no functional teammate revive system, inspect the existing player lifecycle and implement the perk only after integrating with the correct revive architecture.

Do not create a fake revive timer disconnected from gameplay.

---

## PERK 06 — ADRENALINE CHIP

Category:

MOVEMENT

Description:

"Recover faster after sprinting."

Effect:

Reduce sprint recovery time by 25%.

The perk must integrate with the existing sprint and movement system.

Requirements:

- Preserve the existing sprint speed.
- Preserve sprint stamina.
- Preserve sprint duration.
- Preserve movement acceleration.
- Preserve weapon movement restrictions.
- Preserve movement animations.
- Preserve existing stamina recovery.
- Preserve existing sprint interruption.

The perk improves recovery after sprinting.

It must not simply increase the player's movement speed.

It must not allow unlimited sprinting.

It must not bypass stamina restrictions.

If the game currently has no sprint recovery mechanic, inspect the existing movement system and implement the smallest appropriate extension.

Do not replace the movement controller.

---

## PERK 07 — COMBAT CHIP

Category:

COMBAT

Description:

"Switch weapons slightly faster."

Effect:

Reduce weapon switching duration by 20%.

Requirements:

- Integrate with the existing weapon switching system.
- Preserve weapon equip animations.
- Preserve weapon switching restrictions.
- Preserve weapon availability.
- Preserve inventory checks.
- Preserve weapon state.
- Preserve existing switching behavior.

The player must not be able to fire a weapon before the weapon is actually ready.

Do not create instant weapon switching.

Do not bypass weapon switching animations.

Do not allow the player to switch to a weapon they do not possess.

The actual gameplay weapon readiness must remain synchronized with the animation.

---

## PERK 08 — RECON CHIP

Category:

RECON

Description:

"Improve awareness of nearby activity."

Effect:

Provide improved awareness of nearby combat activity.

The perk must use the existing game world and multiplayer systems.

The desired feature:

- Detect nearby gunfire.
- Identify approximate direction.
- Indicate activity within a limited radius.
- Provide a short-lived tactical indicator.
- Avoid exposing exact enemy coordinates.

The player should be able to understand that combat is occurring nearby without automatically knowing the exact enemy position.

Requirements:

- Use actual gameplay events.
- Use the existing audio or combat event architecture where appropriate.
- Do not reveal enemies through walls.
- Do not reveal exact enemy health.
- Do not reveal exact enemy distance unless the existing game already supports it.
- Do not reveal players outside the configured radius.
- Do not reveal inactive or disconnected players.
- Do not create wallhack behavior.
- Do not create a full map of enemy positions.

The effect must be implemented as a tactical awareness feature.

If the game already has a sound detection system, integrate with it.

If the game has no such system, implement a lightweight server-authoritative combat activity event system.

The recon perk must not transmit unnecessary enemy state to the client.

---

## PERK 09 — SURVIVAL CHIP

Category:

SURVIVAL

Description:

"Use healing items faster."

Effect:

Reduce healing item use duration by 20%.

Requirements:

- Integrate with the existing healing system.
- Preserve the existing healing items.
- Preserve healing amounts.
- Preserve healing animations.
- Preserve healing interruption.
- Preserve healing restrictions.
- Preserve item consumption.
- Preserve health limits.
- Preserve existing cooldowns.

The perk must not increase the actual healing amount.

It must not allow healing beyond maximum health.

It must not duplicate healing items.

It must not allow healing while the player is dead.

It must not allow the player to use healing items that they do not possess.

The server must determine when healing completes.

The healing animation and gameplay timing must remain synchronized.

---

## PERK 10 — SCAVENGER CHIP

Category:

LOOT

Description:

"Find more ammunition in loot containers."

Effect:

Increase ammunition obtained from compatible loot containers by 20%.

Requirements:

- Integrate with the existing loot generation system.
- Preserve the existing loot tables.
- Preserve item rarity.
- Preserve container opening.
- Preserve inventory capacity.
- Preserve ammunition types.
- Preserve ammunition stack limits.

The perk must not create ammunition outside the existing loot system.

It must not affect ammunition dropped by other players.

It must not duplicate loot.

It must not allow inventory capacity to be exceeded.

It must not guarantee ammunition in containers where ammunition is not available.

If the existing loot system uses randomized ammunition quantities, apply the bonus to the actual generated quantity using a consistent rounding method.

The server must determine the final loot quantity.

---

# 6. PERK BALANCING AND STACKING

The player may activate exactly 3 perks simultaneously.

This is the main progression limitation.

The player may unlock all 10 perks but must choose only 3 to activate.

The following restrictions are mandatory:

- No more than 3 active perks.
- No duplicate perks.
- No duplicate effect application.
- No stacking the same perk.
- No activating the same perk in multiple slots.
- No activating locked perks.
- No activating perks without the required tablet.
- No activating perks that the player does not own.
- No client-side perk manipulation.

Each perk must have a unique identifier.

Do not identify perks by display name alone.

Use stable perk IDs.

Example IDs:

deadly_bullets

faster_reload

ammo_efficiency

armor_specialist

fast_revive

adrenaline_chip

combat_chip

recon_chip

survival_chip

scavenger_chip

Use these IDs consistently across the gameplay system, UI, inventory, networking, and persistence.

The perk system must have one authoritative source of truth.

Do not create separate active perk arrays that can become inconsistent.

## 6.1 Perk effect lifecycle

Every perk must have a clearly defined lifecycle.

When activated:

- Validate ownership.
- Validate the tablet requirement.
- Validate available slots.
- Validate match state.
- Validate the perk ID.
- Apply the effect through the existing gameplay architecture.

When deactivated:

- Remove the effect.
- Restore the normal gameplay calculation.
- Preserve unrelated effects.
- Preserve other active perks.
- Update the UI.

When replaced:

- Remove the old perk effect.
- Activate the new perk.
- Update the selected slot.
- Synchronize the change.
- Prevent an intermediate state where both effects are active.

When the player dies:

- Follow the existing player lifecycle.
- Remove temporary perk effects when appropriate.
- Prevent dead players from using active perks.
- Prevent perks from remaining attached to a reused player entity.

When the player respawns:

- Follow the existing match rules.
- Do not automatically duplicate the previous active perk effects.
- Restore the correct state only if the existing game supports respawning.

When the match ends:

- Remove temporary match perk effects.
- Clear match-specific ownership and state.
- Prevent perks from carrying into the next match unless explicitly designed as persistent progression.

Do not leave stale perk effects in the player state.

---

# 7. PERK UNLOCKING AND TACTICAL DATA

The tablet should support a proper unlock system.

Players must be able to unlock perks through gameplay.

Use the existing loot and inventory architecture wherever possible.

Implement Tactical Data as a match-specific resource only if the existing game does not already have an appropriate resource.

Tactical Data must not become a permanent currency unless the existing game progression explicitly supports that behavior.

## Suggested starting balance

Tactical Data:

- Basic perk unlock: 3 Data.
- Advanced perk unlock: 5 Data.
- Specialized perk unlock: 6 Data.

Use the following suggested rarity:

| Perk | Rarity | Unlock cost |
|---|---|---:|
| Deadly Bullets | Epic | 6 |
| Faster Reload | Rare | 3 |
| Ammo Efficiency | Rare | 3 |
| Armor Specialist | Rare | 4 |
| Fast Revive | Rare | 3 |
| Adrenaline Chip | Rare | 4 |
| Combat Chip | Rare | 3 |
| Recon Chip | Epic | 6 |
| Survival Chip | Rare | 4 |
| Scavenger Chip | Rare | 3 |

These values are the initial design configuration.

Implement the cost and rarity in centralized perk configuration.

Do not hardcode costs separately in UI components.

If the game already has a suitable loot currency or progression architecture, inspect it before introducing Tactical Data.

The tablet must show:

- Available Tactical Data.
- Perk unlock cost.
- Current unlock status.
- Whether the player can afford the perk.
- Whether the perk is active.
- Whether the player has available slots.

The player must receive clear feedback when unlocking or activating a perk.

The server must validate the unlock.

The client must never be allowed to create Tactical Data or unlock perks by modifying local state.

---

# 8. RARE LOOT SPAWNING

Integrate the tactical tablet into the existing loot generation system.

The tablet should be rare.

It must not spawn in every building.

It must not be guaranteed in every match.

It must not replace normal weapons, ammunition, armor, healing, or equipment.

Use existing loot rarity and spawn logic.

Suggested initial spawn behavior:

- Rare military loot locations.
- High-value containers.
- Military supply drops.
- Special loot areas.

The tablet should have a configurable spawn probability.

The spawn probability must be controlled by centralized configuration.

Do not hardcode spawn probability in individual loot containers.

The tablet must be visible as a 3D world item.

Use the provided iPad model.

When the player looks at it, show an interaction prompt.

Example:

TACTICAL IPAD

RARE MILITARY TECHNOLOGY

PRESS E TO PICK UP

Use the existing interaction system and actual keybind configuration.

If the existing interaction key is not E, use the current configured key.

Do not create an interaction key conflict.

---

# 9. MULTIPLAYER AND SERVER AUTHORITY

This is a multiplayer battle royale.

The perk system must work correctly in multiplayer.

The server must be authoritative for:

- Tablet ownership.
- Perk unlocking.
- Tactical Data.
- Active perk selection.
- Perk effect calculations.
- Weapon damage.
- Reload timing.
- Ammunition consumption.
- Armor calculations.
- Revive timing.
- Sprint recovery.
- Weapon switching.
- Healing timing.
- Recon detection.
- Loot ammunition quantities.

The client may display the tablet and perk interface.

The client must not determine authoritative gameplay outcomes.

All perk activation requests must be validated.

All perk state changes must be synchronized using the existing networking architecture.

Do not introduce a separate networking layer.

Do not broadcast unnecessary player inventory information.

Do not reveal hidden enemy information through perk synchronization.

## Multiplayer edge cases

Handle:

- Two players attempting to pick up the same tablet.
- Player disconnecting while the tablet UI is open.
- Player disconnecting during perk activation.
- Player dying while using the tablet.
- Player dying during healing.
- Player dying during reload.
- Player dying during revival.
- Player switching weapons during reload.
- Player reconnecting.
- Player changing active perks.
- Player attempting to activate 4 perks.
- Player attempting to activate a locked perk.
- Player attempting to activate a perk they do not own.
- Player attempting to exploit perk activation timing.

All state changes must remain consistent.

---

# 10. UI AND GAMEPLAY FEEDBACK

Every perk must have a clear visual representation.

Create or reuse the existing icon system.

Do not use random placeholder icons for the final implementation.

Each perk should have its own identifiable icon.

Suggested icon themes:

Deadly Bullets:

Bullet or ammunition icon.

Faster Reload:

Magazine or reload icon.

Ammo Efficiency:

Ammunition conservation icon.

Armor Specialist:

Armor plate icon.

Fast Revive:

Medical revive icon.

Adrenaline Chip:

Movement or sprint icon.

Combat Chip:

Weapon switching icon.

Recon Chip:

Radar or tactical detection icon.

Survival Chip:

Medical kit icon.

Scavenger Chip:

Loot container or ammunition icon.

Use the existing UI icon library if appropriate.

If the project uses custom icons, integrate with the existing system.

Do not introduce an incompatible icon framework.

## Active perk HUD

The player should have a compact HUD element displaying the 3 active perks.

Requirements:

- Show all active perks.
- Use small but readable icons.
- Show the perk name on hover or through an appropriate tooltip.
- Clearly indicate active status.
- Avoid covering the crosshair.
- Avoid blocking weapon information.
- Avoid blocking the minimap.
- Avoid unnecessary screen space.

The HUD must update when perks change.

It must not show perks that are inactive.

It must not show perks belonging to another player.

The HUD should match the current PVPSPINARENA visual style.

---

# 11. ANIMATIONS AND SOUND

Integrate the tactical tablet with the existing game animation and audio architecture.

The tablet should feel like a real piece of equipment.

Suggested interactions:

- Pick up tablet.
- Equip tablet.
- Open tablet.
- Close tablet.
- Unlock perk.
- Activate perk.
- Replace active perk.

Use the existing animation system.

Do not create unrelated player animations.

If the existing game supports first-person hands or weapon viewmodels, inspect how they work before implementing tablet presentation.

Do not break:

- Weapon viewmodels.
- Reload animations.
- Weapon switching.
- Player movement.
- Existing first-person camera.
- Existing third-person character presentation.

If the game has a dedicated inventory UI, the tablet may open as an in-game overlay while the world remains in the correct gameplay state.

The player must not lose their weapon permanently when opening or closing the tablet.

Do not create fake animations that visually imply gameplay actions without performing the actual action.

---

# 12. PERFORMANCE REQUIREMENTS

The game runs in a browser.

The implementation must be lightweight.

Requirements:

- No unnecessary rendering loops.
- No unnecessary network polling.
- No expensive UI rerenders.
- No repeated perk configuration creation.
- No duplicated event listeners.
- No memory leaks.
- No stale player references.
- No unnecessary full-player state synchronization.
- No unnecessary enemy position synchronization.
- No excessive network events.
- No large additional assets without justification.

Use the existing React, rendering, networking, and game state architecture.

Avoid introducing unnecessary dependencies.

Do not load the tablet 3D asset repeatedly.

Use the existing asset caching system where available.

The perk UI must not reduce FPS during combat.

The recon system must be especially lightweight.

Do not continuously scan every player every frame.

Use appropriate existing events, server-side queries, or spatial systems.

---

# 13. CONFIGURATION AND MAINTAINABILITY

Create a centralized perk configuration system.

Each perk must have:

- Stable ID.
- Display name.
- Description.
- Category.
- Rarity.
- Unlock cost.
- Effect configuration.
- Maximum active slots.
- Eligibility requirements.
- Icon reference.
- Enabled status.

Do not hardcode perk effects inside UI components.

Do not hardcode perk costs in interaction handlers.

Do not hardcode perk descriptions in multiple files.

The game must be able to balance perks by modifying centralized configuration.

The active perk limit must be centralized.

The initial active perk limit is exactly 3.

The initial maximum number of perks is exactly 10.

Do not introduce a complicated generic RPG framework.

Implement the smallest maintainable architecture that supports the actual feature.

---

# 14. SECURITY AND EXPLOIT PREVENTION

Inspect the existing security and server validation architecture.

The perk system must not allow:

- Client-side damage manipulation.
- Client-side ammunition duplication.
- Client-side perk unlocking.
- Client-side currency manipulation.
- Client-side armor manipulation.
- Client-side revive timing manipulation.
- Client-side healing manipulation.
- Client-side recon information injection.
- Duplicate perk activation.
- More than 3 active perks.
- Perk effects persisting after removal.
- Perk effects persisting after match completion.
- Unauthorized perk activation through network messages.

Validate every relevant action on the server.

Use the existing security architecture.

Do not trust the client to provide the final perk state.

Do not trust client-provided damage values.

Do not trust client-provided reload completion.

Do not trust client-provided loot quantities.

---

# 15. TESTING REQUIREMENTS

Implement proper tests using the existing testing architecture.

Do not merely report that the feature works because the UI renders.

Test actual gameplay effects.

## Perk tests

DEADLY BULLETS:

- Damage increases by exactly 15%.
- Damage is not increased twice.
- Removing the perk restores normal damage.

FASTER RELOAD:

- Reload duration decreases by 20%.
- Ammunition is not duplicated.
- Reload animations remain synchronized.

AMMO EFFICIENCY:

- Ammunition conservation chance is applied correctly.
- The client cannot manipulate the chance.
- Magazine capacity remains valid.

ARMOR SPECIALIST:

- Armor effectiveness increases correctly.
- Armor durability remains valid.
- Armor cannot exceed its existing maximum.

FAST REVIVE:

- Revive duration decreases by 30%.
- Invalid revives remain invalid.
- Revive interruption still works.

ADRENALINE CHIP:

- Sprint recovery decreases by 25%.
- Sprint speed is unchanged.
- Stamina restrictions remain valid.

COMBAT CHIP:

- Weapon switching decreases by 20%.
- Weapon readiness remains valid.
- Weapon switching cannot bypass animations.

RECON CHIP:

- Nearby activity can be detected.
- Exact enemy positions are not revealed.
- Players outside the radius remain hidden.

SURVIVAL CHIP:

- Healing duration decreases by 20%.
- Healing amount remains unchanged.
- Healing items cannot be duplicated.

SCAVENGER CHIP:

- Compatible loot ammunition increases by 20%.
- Loot quantity remains within valid limits.
- Non-ammunition loot remains unchanged.

## Slot tests

Test:

- One active perk.
- Two active perks.
- Three active perks.
- Attempting to activate a fourth.
- Attempting to activate the same perk twice.
- Replacing an active perk.
- Removing a perk.
- Unlocking a perk.
- Activating a locked perk.
- Losing the tablet.
- Player death.
- Player respawn.
- Match completion.

The player must never have more than 3 active perks.

## Multiplayer tests

Test at least two players.

Verify that:

- Each player has independent perk state.
- One player's perks do not affect another player's damage.
- One player's reload bonus does not affect another player.
- One player's armor bonus does not affect another player.
- One player's healing bonus does not affect another player.
- One player's recon does not reveal information to unauthorized players.
- One player's Tactical Data does not change another player's currency.
- Perk activation is synchronized correctly.

---

# 16. IMPLEMENTATION ORDER

Implement the feature in the following order.

PHASE 1 — ARCHITECTURE

Inspect the existing project.

Identify the relevant gameplay systems.

Document the correct integration points.

Determine how the provided tablet asset will be loaded.

Determine how perk state should be stored and synchronized.

PHASE 2 — PERK CONFIGURATION

Implement the centralized 10-perk configuration.

Implement stable perk IDs.

Implement the 3-slot limit.

Implement validation.

PHASE 3 — TABLET ITEM

Integrate the provided iPad model.

Add it to the existing loot system.

Implement pickup and inventory handling.

Implement the interaction prompt.

PHASE 4 — TABLET UI

Build the tactical interface.

Display all 10 perks.

Implement unlock actions.

Implement active perk selection.

Implement perk replacement.

Implement correct mouse and keyboard behavior.

PHASE 5 — GAMEPLAY EFFECTS

Integrate all 10 perks into their actual gameplay systems.

Do not implement effects as visual-only modifiers.

Do not bypass the existing authoritative gameplay architecture.

PHASE 6 — MULTIPLAYER

Implement server validation.

Implement synchronization.

Test ownership, activation, replacement, death, disconnect, and match completion.

PHASE 7 — HUD AND FEEDBACK

Add active perk HUD.

Add necessary animations and sounds.

Ensure the UI matches the existing game design.

PHASE 8 — TESTING

Run the existing test suite.

Add perk-specific tests.

Run the existing lint and build commands.

Inspect the actual game.

Verify that the tablet works inside a real match.

Verify that the perk effects work during gameplay.

PHASE 9 — OPTIMIZATION

Inspect performance.

Remove unnecessary event listeners.

Remove duplicate state.

Ensure the tablet asset is cached.

Ensure the UI does not affect combat FPS.

---

# 17. ACCEPTANCE CRITERIA

The implementation is complete only when all of the following are true.

### Tablet

- The supplied Sketchfab iPad asset is integrated.
- The tablet appears as a rare loot item.
- Players can pick it up.
- Players can open and close it.
- The tablet interface is functional.
- The tablet does not break existing inventory or weapon behavior.

### Perks

- All 10 specified perks exist.
- Every perk has its own icon.
- Every perk has a unique ID.
- Every perk has a real gameplay effect.
- All 10 can be unlocked.
- The player can select exactly 3 active perks.
- The player can replace active perks.
- The system prevents duplicate activation.
- The system prevents more than 3 active perks.

### Gameplay

- Deadly Bullets applies the intended 15% damage bonus.
- Faster Reload applies the intended 20% reload reduction.
- Ammo Efficiency applies the intended 10% ammunition conservation chance.
- Armor Specialist applies the intended 15% armor effectiveness bonus.
- Fast Revive applies the intended 30% revive duration reduction.
- Adrenaline Chip applies the intended 25% sprint recovery reduction.
- Combat Chip applies the intended 20% weapon switching reduction.
- Recon Chip provides the intended nearby activity awareness.
- Survival Chip applies the intended 20% healing duration reduction.
- Scavenger Chip applies the intended 20% ammunition loot increase.

All effects must work through actual gameplay systems.

### Multiplayer

- Perk state is server-authoritative.
- Perk effects are synchronized correctly.
- Perks cannot be exploited through client-side state.
- Each player has independent perk effects.
- Death and match completion correctly clean up temporary effects.

### Performance

- No unnecessary frame loops.
- No unnecessary network polling.
- No duplicate listeners.
- No significant FPS regression.
- No unnecessary asset reloads.

### Existing game

- Existing weapons remain functional.
- Existing inventory remains functional.
- Existing movement remains functional.
- Existing armor remains functional.
- Existing healing remains functional.
- Existing loot remains functional.
- Existing multiplayer remains functional.
- Existing map remains unchanged.
- Existing game modes remain unchanged.

---

# 18. FINAL INSTRUCTIONS

This is a production implementation task.

Do not stop after designing the UI.

Do not stop after creating the tablet model.

Do not stop after implementing the perk configuration.

Do not stop after making the perks appear in the inventory.

Implement the complete feature.

Inspect the existing code before making changes.

Use the actual existing game systems.

Preserve the existing game architecture.

Do not rewrite unrelated systems.

Do not introduce fake functionality.

Do not use temporary hacks.

Do not use visual-only perk effects.

Do not use client-authoritative gameplay calculations.

Do not change the specified perk values.

Do not remove any of the 10 perks.

Do not allow more than 3 active perks.

Do not change unrelated gameplay or map design.

If an existing system is missing, implement the smallest proper extension needed to support the feature.

If a technical limitation prevents a requirement from being implemented correctly, explain the limitation and identify the actual blocker instead of pretending it works.

After implementation:

1. Report the files created.
2. Report the files modified.
3. Explain how the tablet integrates with the existing inventory.
4. Explain how the 10 perks integrate with the existing gameplay systems.
5. Explain how server authority is enforced.
6. Explain how the 3-perk limit is enforced.
7. Report which tests were executed.
8. Report actual test results.
9. Report build and lint results.
10. Report any remaining issues.

Do not claim that multiplayer functionality is verified unless it has actually been tested.

Do not claim that all perks are functional unless each perk has been integrated into its actual gameplay system.

The final result must be a complete, maintainable, production-quality tactical perk system for PVPSPINARENA.

**BUILD THE FEATURE IN THE EXISTING GAME. DO NOT REBUILD THE GAME AROUND THE FEATURE.**