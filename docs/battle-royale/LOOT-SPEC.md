# PVPSPINARENA — PRODUCTION-GRADE BATTLE ROYALE LOOT, INVENTORY, WEAPONS, ARMOR AND VEHICLE SYSTEM

## MAIN OBJECTIVE

Build a complete, production-grade loot, inventory, equipment, weapon, armor, healing and vehicle system for my existing browser-based PVPSPINARENA battle royale FPS.

The game is inspired by modern survival battle royale games such as H1Z1.

The objective is to create a realistic survival gameplay loop where players explore the map, discover randomized equipment, pick up items directly from the ground, equip better gear, manage ammunition, heal themselves, find transportation and fight other players.

Players must be able to discover and drive cars and motorbikes scattered throughout the map.

This is NOT a redesign of the entire game.

This is NOT a separate inventory prototype.

This is NOT a visual-only interface.

The complete system must work with the existing:

- Player movement.
- First-person camera.
- Weapon systems.
- AK-47.
- M4.
- AWP.
- Existing 1v1 maps.
- Existing 5v5 maps.
- Battle royale map.
- Player health.
- Damage system.
- Armor system.
- Multiplayer.
- Existing item architecture.
- Existing vehicle and rendering architecture, if present.
- Existing UI architecture.
- Existing input/keybind system.

The final system must feel like a modern, polished battle royale game.

Players should be able to:

1. Explore the map.
2. Discover randomized equipment.
3. Run toward items.
4. Press E to pick them up.
5. Open inventory using I.
6. Inspect their equipment.
7. Equip weapons and armor.
8. Manage ammunition.
9. Equip up to 3 Kevlar plates.
10. Use bandages and healing items.
11. Replace weaker equipment with better equipment.
12. Drop unwanted equipment.
13. Find cars and motorbikes.
14. Enter vehicles using E.
15. Drive vehicles across the map.
16. Exit vehicles using E.
17. Continue playing without unnecessary menu interruptions.

The system must be easy to understand for new players and efficient for experienced FPS players.

---

# 1. FIRST: INSPECT THE EXISTING GAME

Before making any changes, inspect the actual project.

Identify:

- Current game engine and rendering architecture.
- Existing player movement system.
- Existing player inventory, if any.
- Existing weapon system.
- Existing AK-47 implementation.
- Existing M4 implementation.
- Existing AWP implementation.
- Existing weapon models.
- Existing weapon textures.
- Existing weapon animations.
- Existing weapon sounds.
- Existing ammunition types.
- Existing reload system.
- Existing damage system.
- Existing health system.
- Existing armor implementation.
- Existing multiplayer architecture.
- Existing item interaction system.
- Existing 1v1 map.
- Existing 5v5 map.
- Existing battle royale map.
- Existing map geometry.
- Existing loot-related assets.
- Existing vehicle assets.
- Existing vehicle controller, if any.
- Existing collision architecture.
- Existing UI architecture.
- Existing input/keybind system.
- Existing player death and respawn logic.
- Existing server-authoritative gameplay architecture.

Determine which weapon definitions and assets are already available.

Do not assume the 1v1 and 5v5 weapon systems are identical.

Inspect the actual implementation.

The battle royale must reuse the existing weapon assets and gameplay implementations wherever technically compatible.

Do not create new AK-47, M4 or AWP models if the existing models can be reused.

Do not create duplicate weapon systems.

Do not rebuild the existing FPS mechanics.

Do not replace the existing weapon controller.

Do not modify the existing 1v1 or 5v5 gameplay unnecessarily.

The battle royale should reuse the existing weapons while maintaining its own appropriate loot, ammunition and inventory rules.

If the existing weapon system needs an adapter to work with battle royale inventory, implement a proper integration layer rather than duplicating the entire weapon implementation.

Apply the same principle to vehicles.

If a vehicle system already exists, extend and reuse it.

If no vehicle system exists, implement a proper battle royale vehicle system using the existing rendering, physics, input and multiplayer architecture.

Do not create a separate vehicle game.

---

# 2. MAP-WIDE RANDOMIZED LOOT SYSTEM

## MAIN DESIGN

Loot must be scattered throughout the entire battle royale map.

Players should discover equipment naturally while exploring.

The map must not feel empty.

However, loot should not be placed randomly without considering the environment.

The distribution must reflect the locations where equipment would reasonably be found.

### Loot distribution

The entire map should contain loot.

Examples:

- Houses.
- Residential buildings.
- Cities.
- Apartment buildings.
- Warehouses.
- Military buildings.
- Industrial areas.
- Abandoned vehicles.
- Small settlements.
- Rural locations.
- Other appropriate existing map locations.

Use the existing map geometry and environment.

Do not redesign the map to accommodate the loot system.

Do not create unnecessary buildings.

Do not add loot to every single building.

The existing environment must determine where loot can spawn.

## 2.1 Cities and residential areas

Cities and areas containing many houses must have higher loot density.

The player should have a meaningful reason to explore residential areas.

Examples:

- Small houses contain basic equipment.
- Larger houses contain more potential loot locations.
- Apartment buildings contain several possible loot locations.
- Larger cities contain more equipment opportunities.
- Warehouses contain more ammunition and weapon-related equipment.
- Military locations contain better chances of higher-level equipment.

The higher density must come from more valid loot locations and appropriate spawn probabilities.

Do not simply place more items directly on the street.

Loot should be distributed naturally inside buildings and around appropriate environmental locations.

## 2.2 Loot must be physically placed in the world

Items must exist as actual world objects.

Examples:

- AK-47 lying on the floor.
- M4 lying on a table.
- AWP leaning against an appropriate surface.
- Helmet lying on the ground.
- Kevlar vest lying on a floor.
- Ammunition placed near a weapon.
- Bandages on a table.
- Medical supplies inside a building.
- Backpack near appropriate furniture.
- Armor plates inside military or residential locations.

The item should look like something the player can physically discover.

Use existing assets wherever possible.

If existing assets are missing, create or source appropriate assets that fit the current game.

Do not replace existing weapon models with generic placeholder objects.

Do not use floating icons as the only representation of loot.

The actual item must be visible in the 3D world.

---

# 3. NO LOOT BOXES

This is a strict gameplay requirement.

There must be NO normal loot boxes.

There must be NO loot crates that players need to open to obtain normal equipment.

There must be NO inventory containers that require an opening animation before players can collect their contents.

There must be NO unnecessary loot-opening menus.

The player should simply run toward an item and pick it up.

### Pickup interaction

The player approaches an item.

The item becomes interactable within the existing interaction distance.

The game displays a small interaction prompt.

Example:

AK-47

PRESS E TO PICK UP

The player presses E.

The item enters their inventory.

The world item disappears.

The inventory updates.

The pickup sound plays.

The player can continue moving.

The same interaction should work for:

- Weapons.
- Ammunition.
- Helmets.
- Armor.
- Kevlar plates.
- Backpacks.
- Bandages.
- Medical kits.
- Tactical equipment.
- Other supported loot.

Use the existing interaction system.

If E is already used by another gameplay action, inspect the current keybind architecture and implement a proper interaction priority.

Do not create conflicting input behavior.

## 3.1 Automatic pickup behavior

Do not automatically pick up every item when the player walks over it.

The player must deliberately press E.

The interaction prompt should only appear when the item is within the appropriate distance and can be interacted with.

When multiple items are close together:

- Display the item the player is actually looking at.
- Prioritize the item under the crosshair or existing interaction raycast.
- Avoid picking up the wrong item.
- Avoid collecting several items from one E press.
- Avoid interaction spam.

If an item cannot be picked up because the inventory is full, show an appropriate message.

Example:

INVENTORY FULL

If the player already owns the item and cannot equip another copy, explain what is preventing pickup.

Do not silently discard the item.

---

# 4. RANDOMIZED LOOT EVERY MATCH

The loot distribution must change every match.

The same buildings must not contain exactly the same items every time.

Players should not be able to memorize a fixed loot layout.

The system must use proper randomized loot generation.

## 4.1 Match-specific loot generation

At the beginning of each match:

1. Generate a match-specific loot seed.
2. Identify valid loot locations across the map.
3. Determine loot density based on location type.
4. Generate loot using centralized loot tables.
5. Assign item rarity.
6. Place the items in the world.
7. Synchronize the generated loot with the multiplayer game state.

Every match should have a different loot arrangement.

Examples:

Match 1:

- AK-47 inside a residential building.
- M4 inside a warehouse.
- Level 2 helmet in a larger house.
- Level 1 armor in a small house.
- Bandages in an apartment.

Match 2:

- M4 in the residential building.
- AK-47 in another location.
- Level 3 helmet in a rare military location.
- Level 2 armor in a warehouse.
- Medical supplies in a different apartment.

These are examples only.

The system must generate the actual distribution dynamically.

## 4.2 Randomness must remain controlled

Randomization must not mean that every match becomes unbalanced.

Use centralized loot tables.

Use configurable spawn probabilities.

Use location-specific loot categories.

Use rarity restrictions.

Use reasonable item quantity limits.

Do not generate unlimited high-level equipment.

Do not allow all players to find Level 3 armor immediately.

Do not allow every building to contain a powerful weapon.

The system must create variety while preserving competitive gameplay.

## 4.3 Prevent repeated loot layouts

Use a match-specific random seed.

Ensure that different matches generate different loot arrangements.

Do not reuse the previous match's exact generated item locations.

If the server uses match identifiers, integrate the random seed with the existing match lifecycle.

The server must determine the actual loot distribution.

The client must not generate its own authoritative loot.

---

# 5. LOOT DENSITY AND ITEM RARITY

Create a centralized loot configuration.

The configuration must define:

- Loot categories.
- Item rarity.
- Spawn probability.
- Quantity.
- Valid locations.
- Item-specific restrictions.
- Minimum and maximum quantities.
- Loot density.
- Location-specific modifiers.

The system must be easy to balance.

Do not hardcode spawn probabilities inside individual buildings.

Do not create a separate loot table for every map object.

Use a maintainable configuration structure.

## Suggested location distribution

### Residential areas

Higher density of:

- Basic weapons.
- Level 1 helmets.
- Level 1 armor.
- Bandages.
- Basic ammunition.
- Backpacks.
- Common equipment.

### Larger cities

Higher overall loot density.

More opportunities to discover:

- AK-47.
- M4.
- Level 2 helmets.
- Level 2 armor.
- Larger ammunition quantities.
- Medical supplies.
- Better backpacks.

### Warehouses

Higher chances of:

- Ammunition.
- Weapon-related equipment.
- AK-47.
- M4.
- Armor.
- Backpack upgrades.

### Military locations

Higher chances of:

- AWP.
- Level 3 helmets.
- Level 3 armor.
- Higher-level equipment.
- Rare tactical items.
- More valuable loot.

These are probability modifiers, not guarantees.

The loot must still be randomized.

---

# 6. WEAPON SYSTEM — REUSE EXISTING AK-47, M4 AND AWP

The battle royale must use the existing weapons from the 1v1 and 5v5 maps.

This is mandatory.

## Weapons

Implement these weapons as obtainable battle royale loot:

1. AK-47.
2. M4.
3. AWP.

Use the existing models, materials, animations, sounds and gameplay implementations.

Do not create visually different replacement weapons.

Do not import a second copy of the same weapon unnecessarily.

Do not change the existing 1v1 and 5v5 weapon systems just to make the battle royale inventory work.

## 6.1 Weapon pickup

When a player finds a weapon:

- Display the correct weapon name.
- Display its 3D model.
- Display the interaction prompt.
- Allow pickup using E.
- Add the weapon to the correct inventory slot.
- Update the equipped weapon state.
- Update ammunition information.
- Preserve the existing weapon behavior.

The player must be able to equip and use the weapon after pickup.

The weapon must retain its correct:

- Damage.
- Recoil.
- Firing behavior.
- Reload behavior.
- Fire rate.
- Magazine capacity.
- Ammunition type.
- Animation.
- Sound.
- Weapon model.

Do not create separate battle royale damage values unless the existing game architecture explicitly requires a separate game mode configuration.

## 6.2 Weapon slots

The inventory should support:

- Primary weapon.
- Secondary weapon.
- Additional weapon storage if the existing game supports it.

Use the existing weapon slot architecture if available.

If the existing game has no inventory weapon slots, implement a clean battle royale-specific inventory system that integrates with the existing weapon controller.

The player must not be able to equip unlimited weapons.

If a weapon slot is occupied:

- Allow replacing the existing weapon.
- Clearly show which weapon will be replaced.
- Drop the replaced weapon into the world if the game rules permit.
- Preserve the replaced weapon's correct ammunition state.
- Do not silently delete valuable equipment.

The player should be able to switch between equipped weapons using the existing weapon switching controls.

Do not create new conflicting weapon keybinds.

---

# 7. THREE HELMET LEVELS

Implement exactly 3 helmet levels.

Helmet levels must be visually distinguishable.

Higher levels must be rarer and provide better protection.

Use the existing armor and damage architecture.

## LEVEL 1 HELMET

Name:

HELMET LEVEL 1

Rarity:

COMMON

Appearance:

Basic military or tactical helmet.

Gameplay:

Provides basic head protection.

The helmet should reduce incoming head damage according to the configured armor system.

It must have limited durability if the existing armor system supports durability.

## LEVEL 2 HELMET

Name:

HELMET LEVEL 2

Rarity:

RARE

Appearance:

Improved tactical helmet.

Gameplay:

Provides better head protection than Level 1.

It must be less common.

It should have improved protection or durability.

## LEVEL 3 HELMET

Name:

HELMET LEVEL 3

Rarity:

EPIC

Appearance:

Advanced military helmet.

Gameplay:

Provides the best head protection.

It must be significantly rarer than Level 1 and Level 2.

## 7.1 Helmet damage behavior

Helmets must protect the player's head.

The damage system must distinguish:

- Head damage.
- Body damage.
- Other existing damage types.

The helmet must not automatically protect every body part.

The helmet must integrate with the existing hit detection.

The helmet must not create a separate damage system.

The actual incoming damage must be calculated correctly.

Higher-level helmets must provide better protection.

Use centralized armor configuration.

If the game already has a helmet durability system, preserve it.

If helmets do not currently have durability, implement a proper helmet durability system that integrates with the existing damage architecture.

Do not create fake durability displayed only in the UI.

The actual gameplay protection must reflect the helmet's state.

When a helmet reaches zero durability:

- Remove its protection.
- Update the inventory.
- Update the HUD.
- Preserve correct equipment state.

If a helmet is destroyed, the player must not continue receiving protection from it.

---

# 8. THREE ARMOR / KEVLAR LEVELS

Implement exactly 3 armor levels.

The equipment must be represented as a physical wearable item.

Use the existing player character and armor architecture.

Do not create a completely new character model.

Do not replace existing clothing.

The armor should integrate with the existing player appearance.

## LEVEL 1 ARMOR

Name:

KEVLAR LEVEL 1

Rarity:

COMMON

Gameplay:

Basic body protection.

Provides lower damage protection.

## LEVEL 2 ARMOR

Name:

KEVLAR LEVEL 2

Rarity:

RARE

Gameplay:

Improved body protection.

Better protection than Level 1.

## LEVEL 3 ARMOR

Name:

KEVLAR LEVEL 3

Rarity:

EPIC

Gameplay:

Advanced body protection.

Best protection available from the standard armor levels.

Must be rare.

## 8.1 Armor behavior

Armor must protect the player's body.

It must integrate with the actual damage system.

It must not:

- Make the player invulnerable.
- Ignore damage.
- Ignore armor durability.
- Apply protection twice.
- Continue protecting after being destroyed.
- Apply armor protection to unrelated damage types.

Higher levels must provide better protection.

Use centralized configuration for:

- Damage reduction.
- Armor durability.
- Rarity.
- Spawn probability.
- Visual representation.

The actual values must be configurable.

Inspect the existing damage system before deciding the correct calculation.

Do not create a second independent armor calculation.

---

# 9. KEVLAR PLATES — EXACTLY 3 EQUIPPED SLOTS

The player must be able to equip up to 3 Kevlar plates simultaneously.

Create 3 dedicated armor plate slots.

Example:

PLATE SLOT 1

PLATE SLOT 2

PLATE SLOT 3

Each slot must show:

- Whether a plate is equipped.
- Plate level.
- Plate durability.
- Plate protection.
- Whether the slot is empty.

The player can carry additional plates in their inventory.

However, only 3 plates may be equipped at the same time.

## 9.1 Plate levels

Implement:

- Level 1 Kevlar Plate.
- Level 2 Kevlar Plate.
- Level 3 Kevlar Plate.

Higher-level plates must be rarer.

Higher-level plates must provide better protection.

Use appropriate physical models and inventory icons.

The player must be able to replace a plate with a better one.

## 9.2 Plate damage behavior

The 3 equipped plates must reduce incoming damage through the actual armor system.

Do not simply display 3 plates without implementing their protection.

The damage system must correctly determine:

- Whether the player has armor.
- Which armor is equipped.
- Which plates are equipped.
- Which plates are damaged.
- Which plates are destroyed.
- Whether damage protection remains available.

The player must never receive protection from an empty slot.

The player must never receive protection from a destroyed plate.

Do not apply the full protection of all 3 plates as an unlimited additive damage reduction.

Do not allow 3 plates to make the player invulnerable.

Use a proper armor damage calculation.

## 9.2.1 Plates need a vest; one plate type (owner decisions, 2026-11-04)

There is one plate item (the black "Armour plate"; no levels, §9.1 is superseded). Plates fit
into the worn vest: without a vest a picked-up plate goes into the bag, cannot be fitted, and
plates already in the slots do not protect until a vest is worn again. Up to three are fitted;
spares ride in the bag to replace broken ones. Each intact plate adds 5 % on top of the vest
(20 / 28 / 35 %), with the total body reduction capped at 50 % (vest 3 + three plates reaches
it exactly), so full armour at most doubles a rifle's body shots to kill (3 → 6). The plates'
share wears the first intact plate until it breaks (25 durability), then the next, so plates
are used up one by one. Helmets: 30 / 45 / 55 % (rifle headshots to kill 5 / 6 / 7).
Backpacks: 6 slots without, 10 / 14 / 18 with level 1 / 2 / 3. The tables live in
src/lib/fps/br/items.ts and are pinned by tests/br-loot.test.ts.

## 9.3 Plate durability

Each plate must have its own durability.

When the player receives eligible damage:

- Apply the correct protection.
- Reduce the appropriate plate durability.
- Update the plate UI.
- Preserve remaining durability.
- Remove the plate when it is destroyed.

If the existing game has an armor durability architecture, extend it.

Do not create an unrelated durability system.

The actual durability must be synchronized with the server.

## 9.4 Plate replacement

The player must be able to replace a damaged plate.

Example:

The player has:

- Slot 1: Level 1 plate, 20% durability.
- Slot 2: Level 2 plate, 70% durability.
- Slot 3: Level 1 plate, 50% durability.

The player discovers a Level 3 plate.

They should be able to:

1. Pick up the new plate.
2. Open inventory.
3. Select the new plate.
4. Replace a selected equipped plate.
5. Move the old plate into inventory or drop it.
6. Equip the new plate.

Do not silently delete the old plate.

Do not allow more than 3 equipped plates.

Do not allow the same plate item to occupy multiple slots.

---

# 10. BANDAGES AND HEALING ITEMS

Implement a complete healing inventory system.

Players must be able to find medical supplies across the map.

Healing items should be distributed through residential areas, medical locations and other appropriate locations.

The player must be able to pick up medical supplies using E.

The player must be able to inspect their medical inventory using I.

The player must be able to use healing items during gameplay.

Use the existing health and healing system.

## 10.1 Bandages

Item name:

BANDAGES

Purpose:

Restore a small amount of health.

Bandages should be common.

The player must be able to carry multiple bandages in a stack.

Example:

BANDAGES x5

The player can use one bandage at a time.

Using a bandage must:

- Consume one bandage.
- Restore the configured health amount.
- Respect maximum health.
- Respect healing restrictions.
- Respect interruption rules.
- Respect existing animation timing.

Do not allow bandages to heal beyond maximum health.

Do not allow bandages to be used while dead.

## 10.2 Medical kit

Item name:

MEDICAL KIT

Purpose:

Restore a larger amount of health.

The medical kit should be less common than bandages.

It should take longer to use than a bandage if the existing healing architecture supports different use durations.

The player must not receive unlimited healing.

The medical kit must consume one item when successfully used.

## 10.3 Other healing items

Inspect the existing game.

If the game already has additional healing items, integrate them.

Do not create unnecessary duplicate medical items.

The final inventory must support the actual healing items available in the game.

## 10.4 Healing feedback

When the player uses a healing item:

- Display the item being used.
- Display a progress indicator.
- Display the remaining use time.
- Play the appropriate animation.
- Play the appropriate sound.
- Update health when the healing action completes.
- Update the inventory quantity.

If healing is interrupted, follow the existing game rules.

Do not consume additional items.

Do not allow multiple simultaneous healing actions.

---

# 11. BACKPACK SYSTEM

The player should have a backpack inventory.

The backpack is an actual equipment item.

It must be obtainable through world loot.

It must be visible in the inventory interface.

It must integrate with the existing player character appearance if the game supports backpack models.

## Backpack levels

Implement:

- Backpack Level 1.
- Backpack Level 2.
- Backpack Level 3.

Higher levels must be rarer.

Higher levels must provide greater inventory capacity.

Suggested design:

Level 1:

Basic inventory capacity.

Level 2:

Increased inventory capacity.

Level 3:

Maximum standard inventory capacity.

Use centralized configuration.

Do not create unlimited inventory space.

Do not allow inventory capacity to be exceeded.

## Backpack replacement

If the player discovers a better backpack:

- Show the new backpack.
- Show its capacity.
- Show the currently equipped backpack.
- Show whether the new backpack is an upgrade.
- Allow replacement.
- Preserve existing inventory items.
- Prevent inventory loss.

If the new backpack has less capacity than the player's current inventory:

Do not silently delete items.

Require the player to manage the inventory before equipping the smaller backpack.

---

# 12. INVENTORY SYSTEM — PRESS I

Pressing I must open the inventory.

Pressing I again should close it if the existing input architecture supports toggle behavior.

Escape must close the inventory.

The inventory must be a proper in-game interface.

It must not open a separate browser page.

It must not reload the game.

It must not interrupt the match unnecessarily.

## 12.1 Inventory layout

Create a modern, professional battle royale inventory.

### LEFT SIDE — PLAYER EQUIPMENT

Display the player's equipment.

Include:

- Primary weapon.
- Secondary weapon.
- Backpack.
- Helmet.
- Armor / Kevlar.
- Kevlar Plate Slot 1.
- Kevlar Plate Slot 2.
- Kevlar Plate Slot 3.
- Healing equipment.
- Tactical equipment.
- Active perk equipment if the tactical tablet system exists.

Each slot must show:

- Item icon.
- Item name.
- Item level.
- Item rarity.
- Durability where applicable.
- Equipped status.

The equipment slots must be visually clear.

The player must immediately understand what they are wearing and what they have equipped.

### RIGHT SIDE — INVENTORY

Display the items the player is carrying.

Include:

- Weapons.
- Ammunition.
- Helmets.
- Armor.
- Kevlar plates.
- Backpacks.
- Bandages.
- Medical kits.
- Tactical equipment.
- Other supported loot.

Use a clean grid or organized list.

The player must be able to distinguish different item categories.

The inventory must not become a cluttered collection of tiny icons.

Use appropriate item grouping.

### BOTTOM — PLAYER STATUS

Display:

- Health.
- Armor status.
- Helmet status.
- Equipped plate count.
- Inventory capacity.
- Current weapon.
- Ammunition.

The player should be able to understand their equipment status without opening multiple menus.

## 12.2 Inventory visual design

Design direction:

- Modern military survival interface.
- Dark charcoal background.
- Clean black panels.
- Subtle military green accents.
- Clear item rarity colors.
- Professional typography.
- Compact layout.
- High readability.
- Proper spacing.
- Consistent item icons.
- Clear active equipment highlights.
- No unnecessary decoration.

The inventory must match the existing PVPSPINARENA game.

Do not redesign the entire game UI.

Do not use oversized cards.

Do not create excessive empty space.

Do not use a generic mobile shopping interface.

Do not use cartoon-style icons.

Do not use excessive neon effects.

The inventory should feel like a modern PC battle royale game.

---

# 13. INVENTORY INTERACTIONS

The inventory must be functional.

The player must be able to interact with items.

## Required interactions

- Select item.
- Equip item.
- Unequip item.
- Replace equipment.
- Move item.
- Drop item.
- Inspect item.
- Use healing item.
- Manage ammunition.
- Manage armor plates.
- Replace backpack.
- Replace helmet.
- Replace armor.

Use the existing interaction architecture where possible.

## 13.1 Equipment replacement

If the player has a Level 1 helmet and finds a Level 3 helmet:

The inventory should show both items.

The player can equip the Level 3 helmet.

The Level 1 helmet should be moved to inventory or dropped.

Do not delete the old helmet without a clear reason.

The same behavior applies to:

- Armor.
- Backpacks.
- Weapons.
- Kevlar plates.
- Other replaceable equipment.

## 13.2 Item inspection

When the player selects an item, display its details.

Example:

AK-47

ASSAULT RIFLE

AMMUNITION: [actual type]

MAGAZINE: [actual capacity]

RARITY: COMMON

Use the actual weapon configuration.

Do not invent ammunition values that conflict with the existing weapon implementation.

For armor:

LEVEL 2 HELMET

PROTECTION: [actual configured value]

DURABILITY: [actual current value]

For healing:

BANDAGES

QUANTITY: 5

HEALING: [actual configured value]

All item information must come from centralized item configuration and actual player state.

Do not hardcode item statistics separately in the UI.

---

# 14. HOTBAR AND QUICK ACCESS

The player must be able to use important equipment without constantly opening inventory.

Inspect the existing HUD and keybind system.

Implement an appropriate quick-access hotbar.

Suggested structure:

- Slot 1: Primary weapon.
- Slot 2: Secondary weapon.
- Slot 3: Healing item.
- Slot 4: Tactical equipment.
- Slot 5: Additional supported equipment.

Use the existing weapon switching and inventory architecture.

Do not overwrite existing keybinds.

If the existing game already has a weapon hotbar, extend it.

Do not create a duplicate hotbar.

The player should be able to:

- Switch weapons.
- Select healing items.
- Use supported equipment.
- See current ammunition.
- See selected equipment.

The hotbar must update when inventory changes.

The hotbar must not show items that are no longer available.

---

# 15. WORLD ITEM VISUALS

Every loot item must have a proper world representation.

The player must be able to recognize items before picking them up.

Use the existing models wherever available.

### Weapons

Use the actual existing:

- AK-47.
- M4.
- AWP.

### Helmets

Use appropriate helmet models.

The three levels must be distinguishable.

### Armor

Use appropriate tactical armor models.

### Kevlar plates

Use proper plate models.

### Healing items

Use recognizable medical equipment.

### Backpacks

Use appropriate backpack models.

Do not use the same generic object for every item.

Do not use floating UI icons as world objects.

Do not create unnecessary 3D models if the project already has suitable assets.

## 15.1 Ground placement

Loot should be placed naturally.

Examples:

- Weapons on floors.
- Weapons near walls.
- Helmets on tables.
- Armor near furniture.
- Ammunition near weapons.
- Medical supplies on surfaces.
- Backpacks in appropriate locations.

The system must use existing collision and placement architecture.

Loot must not:

- Float in the air.
- Spawn inside walls.
- Spawn inside inaccessible geometry.
- Spawn outside the map.
- Spawn underneath terrain.
- Spawn in unreachable locations.
- Spawn inside player collision.
- Block player movement unnecessarily.

Use valid placement locations.

If the existing map has navigation or collision data, use it.

Do not manually hardcode every item position.

---

# 16. ITEM PICKUP INTERFACE

When the player approaches an item, display a clean interaction prompt.

Example:

[ AK-47 ICON ]

AK-47

PRESS E TO PICK UP

The prompt must:

- Display the correct item name.
- Display the correct icon.
- Display item rarity.
- Display the interaction key.
- Display whether the player can pick it up.

If the item is a weapon:

Show its weapon name.

If the item is armor:

Show the armor level.

If the item is ammunition:

Show the ammunition type and quantity.

If the item is healing:

Show the healing item name and quantity.

The interface must not cover the crosshair unnecessarily.

It must not occupy a large area of the screen.

It must be readable while moving.

## Pickup feedback

When an item is successfully picked up:

- Play the pickup sound.
- Remove the world item.
- Update inventory.
- Update the hotbar if necessary.
- Display a short pickup notification.

Example:

PICKED UP

AK-47

The notification should be compact.

Do not create large full-screen pickup animations.

Do not interrupt movement.

---

# 17. ARMOR AND HEALTH HUD

Create a compact HUD showing the player's current survival status.

Display:

- Health.
- Helmet.
- Armor.
- Kevlar plate count.
- Armor durability.
- Healing item availability.

The HUD must reflect actual gameplay state.

If the player has:

Level 2 helmet.

Level 1 armor.

Two equipped plates.

The HUD must show that exact configuration.

If a plate is destroyed:

Update the HUD.

If a helmet is destroyed:

Update the HUD.

If the player equips a different armor level:

Update the HUD.

Do not display incorrect armor values.

Do not use a static HUD.

The HUD must synchronize with actual server-authoritative equipment.

Keep the interface compact.

Do not cover:

- Crosshair.
- Weapon viewmodel.
- Important combat information.
- Minimap.

---

# 18. PLAYER LOOTING AFTER ELIMINATION

Inspect the existing player death and inventory systems.

If the game supports player loot, integrate the new inventory with it.

When a player is eliminated:

- Follow the existing death behavior.
- Drop eligible equipment.
- Drop eligible ammunition.
- Drop eligible healing items.
- Drop eligible armor.
- Drop eligible weapons.
- Preserve correct item quantities.
- Preserve durability.
- Preserve item rarity.

Do not automatically drop every item if the existing game rules require some items to remain.

Do not duplicate equipment.

Do not create a second inventory from the eliminated player.

The surviving player should be able to approach dropped items and press E to pick them up.

Do not introduce loot boxes.

The player must interact directly with the actual items.

If the existing game does not support player looting, implement a proper integration with the death and inventory architecture.

Do not create fake loot that is disconnected from the eliminated player's actual equipment.

---

# 19. NEW FEATURE — RANDOMIZED CARS AND MOTORBIKES

## MAIN OBJECTIVE

Implement a complete, production-grade vehicle system integrated into the existing battle royale.

Players must be able to discover cars and motorbikes scattered throughout the map and use them to travel across the battlefield.

Vehicles must be actual functional gameplay objects.

They must not be static decorations.

They must not be separate from the existing game.

The vehicle system must integrate with:

- Existing map geometry.
- Existing player movement.
- Existing interaction system.
- Existing rendering architecture.
- Existing collision architecture.
- Existing input system.
- Existing multiplayer.
- Existing player health.
- Existing game lifecycle.

Do not rebuild the map.

Do not create a separate vehicle game.

Do not replace the existing player controller.

Do not break existing FPS movement.

---

# 20. VEHICLE TYPES

Implement two primary vehicle categories.

## TYPE 1 — CARS

Cars are the primary ground transportation vehicles.

Use existing vehicle assets if the project already contains them.

If the project does not contain suitable assets, create or source realistic 3D vehicle models appropriate for the existing environment.

Possible vehicle types:

- Civilian sedan.
- SUV.
- Pickup truck.
- Off-road vehicle.
- Damaged civilian car.

Vehicles should fit the existing modern survival battle royale environment.

Do not introduce unnecessary branded vehicle models.

### Cars must have

- Four wheels.
- Proper vehicle collision.
- Realistic proportions.
- Appropriate ground contact.
- Driver seat.
- Enter and exit interaction.
- Driving controls.
- Vehicle camera.
- Engine sound.
- Acceleration.
- Deceleration.
- Steering.
- Braking.
- Reverse.
- Collision handling.
- Multiplayer synchronization.

Use appropriate vehicle physics.

Do not create a car that simply slides around the map.

Do not create a floating car.

Do not create a vehicle that players can walk through.

## TYPE 2 — MOTORBIKES

Motorbikes provide faster and more agile transportation.

Players should be able to discover motorbikes in suitable areas throughout the map.

Use existing motorbike assets if available.

Otherwise, integrate realistic 3D motorbike models.

Motorbikes must have:

- Functional wheels.
- Proper ground contact.
- Steering.
- Acceleration.
- Braking.
- Appropriate maneuvering.
- Driver interaction.
- Enter and exit behavior.
- Vehicle camera.
- Engine sound.
- Multiplayer synchronization.
- Collision with existing environment.

Motorbikes should feel different from cars.

They should be:

- More agile.
- Better suited to narrower roads.
- Easier to maneuver in smaller spaces.
- Less stable at high speed.
- More vulnerable to collisions than cars.

Do not simply use the car controller with a motorbike model.

Implement the appropriate vehicle behavior through the existing architecture.

---

# 21. RANDOM VEHICLE SPAWNING

Vehicles must be spread throughout the existing map.

The system must generate vehicle locations at the beginning of each match.

Vehicles must not always appear at the same locations.

Players should have to explore to find transportation.

## Vehicle spawn locations

Possible locations:

- Roads.
- Residential streets.
- City parking areas.
- Houses with driveways.
- Industrial areas.
- Warehouses.
- Abandoned parking lots.
- Gas stations.
- Rural roads.
- Military locations.
- Other appropriate existing map locations.

Use the actual existing map.

Do not create new roads.

Do not redesign the environment.

Do not place vehicles randomly without considering map geometry.

## 21.1 Residential areas

Residential areas should have a reasonable chance of containing:

- Civilian cars.
- SUVs.
- Motorbikes.

Larger residential areas should have more potential vehicle spawn locations.

## 21.2 Cities

Cities should have higher vehicle density than remote areas.

Possible vehicles:

- Cars.
- SUVs.
- Pickup trucks.
- Motorbikes.

However, not every city location should contain a vehicle.

## 21.3 Industrial areas

Industrial areas should have higher chances of:

- Pickup trucks.
- Utility vehicles.
- Cars.

## 21.4 Rural areas

Rural areas should contain fewer vehicles.

Possible vehicles:

- Motorbikes.
- Cars.
- Off-road vehicles.

## 21.5 Military locations

Military locations may contain:

- Utility vehicles.
- Off-road vehicles.
- Appropriate transport vehicles.

Do not guarantee a vehicle at every military location.

---

# 22. VEHICLE RANDOMIZATION

Every match must have a different vehicle distribution.

The same car must not always spawn in the same city.

The same motorbike must not always spawn at the same road.

Use the existing match-specific random generation architecture.

At match start:

1. Generate the match-specific vehicle spawn seed.
2. Identify valid vehicle spawn locations.
3. Determine the appropriate vehicle category.
4. Select a vehicle model.
5. Determine vehicle condition.
6. Place the vehicle.
7. Synchronize vehicle state with the server.
8. Make the vehicle available for interaction.

Use centralized vehicle spawn configuration.

Do not hardcode vehicle positions inside individual map objects.

Do not spawn unlimited vehicles.

Do not spawn vehicles in every building.

Do not make every match contain exactly the same number of vehicles.

The distribution should be randomized but controlled.

The game must remain balanced.

## 22.1 Vehicle condition

Vehicles may have different starting conditions.

Possible conditions:

- Good condition.
- Used condition.
- Damaged condition.

Condition must affect actual vehicle gameplay if implemented.

For example:

- Vehicle durability.
- Maximum health.
- Cosmetic damage.
- Engine performance if supported.

Do not make vehicle condition purely visual.

Do not spawn vehicles that are already unusable.

Do not make every vehicle have identical condition.

Use centralized configuration.

---

# 23. VEHICLE SPAWN VALIDATION

Vehicle spawning must use valid world placement.

Vehicles must not spawn:

- Inside buildings.
- Inside walls.
- Inside other vehicles.
- Inside trees.
- Inside obstacles.
- Under the map.
- Outside the map.
- On inaccessible terrain.
- On steep surfaces where they cannot function.
- In locations where the player cannot enter.
- In locations that block important gameplay paths.

Use the existing collision and map geometry systems.

Validate vehicle placement before spawning.

If a location is invalid, select another valid location.

Do not repeatedly spawn vehicles in invalid locations.

Do not create a vehicle that becomes permanently stuck immediately after spawning.

Vehicle spawn placement must respect the existing map.

---

# 24. VEHICLE INTERACTION — PRESS E

Players must be able to enter vehicles using the existing interaction system.

The player approaches a vehicle.

The game displays an interaction prompt.

Example:

CAR

PRESS E TO ENTER

For a motorbike:

MOTORBIKE

PRESS E TO RIDE

Use the existing interaction key.

Do not create conflicting keybinds.

The interaction prompt must only appear when:

- The vehicle is within interaction distance.
- The vehicle is available.
- The player is alive.
- The player is not already inside another vehicle.
- The vehicle has a valid entry position.
- The player can enter the vehicle.

When the player presses E:

1. Validate the interaction on the server.
2. Check the vehicle is available.
3. Check the player is alive.
4. Check the player is within interaction distance.
5. Check the vehicle has an available seat.
6. Check the player is not already occupying another vehicle.
7. Enter the vehicle.
8. Attach the player to the correct seat.
9. Update player movement state.
10. Activate vehicle controls.
11. Synchronize the vehicle and player state.

The player must not teleport into the vehicle from an invalid distance.

The player must not enter a vehicle that is occupied.

The player must not enter a vehicle that is destroyed or unavailable.

Use the existing interaction architecture.

---

# 25. VEHICLE EXIT

The player must be able to exit the vehicle using E.

When the player is inside a vehicle:

Display:

PRESS E TO EXIT

When the player presses E:

1. Validate the exit request.
2. Identify a valid exit position.
3. Check that the exit position is not blocked.
4. Detach the player from the vehicle.
5. Restore normal player movement.
6. Restore the appropriate camera.
7. Restore the correct input state.
8. Synchronize the player and vehicle state.

Do not allow the player to exit inside:

- Walls.
- Buildings.
- Other vehicles.
- Obstacles.
- Invalid terrain.

If the normal exit location is blocked, search for a valid nearby exit.

If no safe exit exists, prevent the player from exiting until a valid position becomes available.

Do not teleport the player through walls.

Do not allow the player to exit beneath the map.

Do not leave the player permanently attached to the vehicle.

---

# 26. VEHICLE CONTROLS

Use the existing game input system.

Inspect the current keybinds before implementing vehicle controls.

Suggested controls:

- W: Accelerate.
- S: Brake / reverse.
- A: Steer left.
- D: Steer right.
- E: Enter / exit.
- Space: Handbrake if compatible with the existing input architecture.

Use the existing keybind configuration where possible.

Do not overwrite existing controls unnecessarily.

Do not introduce conflicting inputs.

When the player enters a vehicle:

- Vehicle controls become active.
- Normal FPS movement becomes inactive.
- The player cannot accidentally fire their weapon.
- The vehicle responds to driving inputs.
- The camera switches to the appropriate vehicle camera.

When the player exits:

- Vehicle controls become inactive.
- Normal FPS movement becomes active.
- The player can use their weapon again.
- The correct first-person camera is restored.

The transition must work reliably.

---

# 27. VEHICLE PHYSICS AND MOVEMENT

Vehicles must have actual movement behavior.

Do not implement vehicles as simple teleporting objects.

Use the existing physics or movement architecture.

Cars should have:

- Acceleration.
- Steering.
- Braking.
- Reverse.
- Momentum.
- Collision.
- Wheel contact.
- Appropriate suspension behavior if supported.

Motorbikes should have:

- Acceleration.
- Steering.
- Braking.
- Momentum.
- Collision.
- Appropriate turning behavior.
- Appropriate stability.

The vehicle must interact correctly with the existing map.

It must not:

- Float above terrain.
- Fall through the ground.
- Pass through buildings.
- Pass through other vehicles.
- Teleport unexpectedly.
- Move without player input.
- Remain uncontrollable after exiting.

Do not use unrealistic instant acceleration.

Do not make vehicles move at unlimited speed.

Use centralized vehicle configuration for:

- Maximum speed.
- Acceleration.
- Braking.
- Steering.
- Vehicle health.
- Collision behavior.
- Vehicle condition.

Vehicle physics must be appropriate for a modern browser-based battle royale.

---

# 28. VEHICLE CAMERA

When a player enters a vehicle, use an appropriate vehicle camera.

The camera must follow the vehicle.

The player should be able to see:

- The vehicle.
- The road.
- Nearby obstacles.
- Other vehicles.
- The surrounding environment.

Use the existing camera architecture.

Do not create a completely separate camera system if the existing camera can be extended.

The camera should:

- Follow smoothly.
- Maintain appropriate distance.
- Avoid unnecessary clipping.
- Avoid passing through the environment.
- Avoid excessive movement.
- Preserve visibility during driving.

When the player exits:

Restore the correct FPS camera.

Do not leave the camera attached to the vehicle.

Do not break the existing first-person weapon viewmodel.

---

# 29. VEHICLE DAMAGE AND HEALTH

Inspect the existing player and damage architecture.

Implement vehicle durability if compatible with the existing system.

Vehicles should have their own health.

Damage may come from:

- Collisions.
- Other vehicles.
- Weapons if the existing damage architecture supports vehicle damage.

Use the existing damage system.

Do not create a separate incompatible damage architecture.

Vehicle health must be server-authoritative.

When vehicle health reaches zero:

- Mark the vehicle as destroyed.
- Prevent further driving.
- Update the vehicle state.
- Apply the appropriate destruction behavior.
- Prevent players from entering a destroyed vehicle.
- Synchronize the destroyed state.

Do not make vehicles invulnerable.

Do not allow vehicles to regenerate health automatically unless explicitly supported by the game rules.

Do not create unnecessary explosions that damage unrelated players unless the existing game supports that behavior.

Vehicle destruction must not crash the game.

Vehicle cleanup must remove invalid references.

---

# 30. VEHICLE MULTIPLAYER

Vehicles must work correctly in multiplayer.

The server must determine:

- Vehicle spawning.
- Vehicle ownership state.
- Vehicle occupancy.
- Driver.
- Vehicle movement.
- Vehicle collision.
- Vehicle health.
- Vehicle destruction.
- Vehicle entry.
- Vehicle exit.

The client may render the vehicle and display interaction prompts.

The client must not determine authoritative vehicle movement or damage.

Use the existing networking architecture.

Do not create a separate networking system.

## Multiplayer requirements

- Vehicle positions synchronize correctly.
- Vehicle rotations synchronize correctly.
- Vehicle movement is authoritative.
- Vehicle occupancy is authoritative.
- Vehicle health is authoritative.
- Vehicle destruction is authoritative.
- Entering a vehicle is validated.
- Exiting a vehicle is validated.
- Only one player can occupy the driver seat.
- Two players cannot drive the same vehicle simultaneously.
- Players cannot duplicate vehicles.
- Players cannot teleport into vehicles.
- Vehicle state remains correct after disconnects.

If the existing game supports passengers, preserve that architecture.

If it does not, implement driver-only vehicles initially rather than introducing unnecessary passenger complexity.

## Disconnect behavior

If the driver disconnects:

- Release vehicle occupancy.
- Prevent stale player references.
- Preserve vehicle state according to existing match rules.
- Allow another player to enter if the vehicle remains available.

Do not destroy a valid vehicle simply because its driver disconnects unless the existing game rules require it.

---

# 31. VEHICLE HUD

When the player enters a vehicle, display a compact vehicle HUD.

Display:

- Vehicle type.
- Current speed.
- Vehicle health.
- Driving controls.
- Exit interaction.

Example:

CAR

SPEED: [ACTUAL SPEED]

VEHICLE HEALTH: [ACTUAL HEALTH]

PRESS E TO EXIT

For motorbikes:

MOTORBIKE

SPEED: [ACTUAL SPEED]

VEHICLE HEALTH: [ACTUAL HEALTH]

PRESS E TO EXIT

Use the actual vehicle state.

Do not display fake speed values.

Do not display static health.

The HUD must update in real time.

The vehicle HUD must match the existing PVPSPINARENA interface.

Do not cover important driving information.

Do not create an oversized interface.

When the player exits:

- Hide the vehicle HUD.
- Restore the normal FPS HUD.
- Restore the correct weapon information.
- Restore the correct player status.

---

# 32. VEHICLES AND THE INVENTORY SYSTEM

Cars and motorbikes are world vehicles, not ordinary inventory items.

Do not place complete vehicles inside the player's backpack.

Do not make vehicles occupy a normal weapon slot.

Do not require the player to open inventory to enter a vehicle.

Vehicle interaction must happen directly in the world.

The player approaches a vehicle and presses E.

The inventory must still display the player's equipment while they are driving.

If the player opens inventory while inside a vehicle:

- Follow the existing game input rules.
- Do not allow inventory actions to break vehicle control.
- Do not allow the player to duplicate equipment.
- Do not allow the player to exit the vehicle through invalid inventory interactions.

If the game rules permit inventory access while driving, implement it safely.

Otherwise, prevent inventory opening while driving and explain the restriction through the UI.

The vehicle system must integrate with the existing tactical tablet and 10-perk system.

Do not create a second perk system.

Do not allow vehicles to bypass the tactical tablet requirements.

---

# 33. VEHICLE AND LOOT BALANCING

The vehicle system must be balanced.

Vehicles should improve map traversal without making the player invulnerable.

Use centralized configuration.

Suggested design:

### Cars

- Better protection than motorbikes.
- More stable.
- Suitable for longer distances.
- Less maneuverable in narrow spaces.
- Higher collision resistance.

### Motorbikes

- More agile.
- Easier to maneuver.
- Suitable for narrow roads.
- Faster to accelerate.
- Less protective.
- More vulnerable to collisions.

Vehicle spawn probability must be configurable.

Vehicle density must be configurable.

Vehicle health must be configurable.

Vehicle speed must be configurable.

Vehicle acceleration must be configurable.

Vehicle handling must be configurable.

Do not hardcode these values in the vehicle controller.

Do not spawn vehicles everywhere.

Do not guarantee transportation for every player.

Finding a vehicle should be useful but should not be mandatory to survive.

---

# 34. INTEGRATION WITH THE TACTICAL IPAD PERK SYSTEM

The game already has a separate tactical tablet and 10-perk feature.

The loot and inventory system must support that feature.

The tactical tablet should be represented as a valid inventory item.

The player must be able to inspect it.

The player must be able to equip or activate it through the existing tactical system.

The tactical tablet must not be confused with:

- Backpack.
- Primary weapon.
- Secondary weapon.
- Helmet.
- Armor.
- Kevlar plates.
- Vehicles.

The tablet must have its own item ID.

The perk system must retain its existing 3-active-perk limit.

Do not create a second perk system.

Do not allow the inventory system to bypass the tablet's ownership requirements.

If the player loses the tablet, follow the defined tactical system rules.

If the player dies, follow the existing match lifecycle.

Do not allow perks to persist incorrectly between matches.

---

# 35. PERFORMANCE AND BROWSER OPTIMIZATION

This game runs in the browser.

The loot and vehicle system must be optimized for the existing game.

Do not create thousands of unnecessary active loot objects.

Do not render every loot item with expensive materials.

Do not introduce unnecessary physics simulations.

Do not create a new rendering loop for inventory.

Do not continuously scan the entire map.

Do not continuously poll every loot item.

Use the existing rendering, interaction and networking architecture.

## Performance requirements

- Efficient loot spawning.
- Efficient item interaction.
- Efficient item rendering.
- Efficient inventory updates.
- Efficient vehicle spawning.
- Efficient vehicle physics.
- Efficient vehicle rendering.
- Efficient multiplayer synchronization.
- Proper item cleanup.
- Proper vehicle cleanup.
- Proper asset caching.
- No duplicated event listeners.
- No unnecessary React rerenders.
- No memory leaks.
- No unnecessary network traffic.

The game must remain responsive during combat.

The inventory must not cause significant FPS drops.

The loot system must scale to the actual map size.

Vehicles must not cause significant FPS drops.

Do not simulate unnecessary vehicle physics for objects that are not being used if the existing architecture supports optimization.

Do not perform expensive global searches every frame.

---

# 36. CENTRALIZED ITEM AND VEHICLE CONFIGURATION

Create a maintainable item configuration system.

Every item must have a stable item ID.

Each item must define:

- Item ID.
- Display name.
- Category.
- Rarity.
- World model.
- Inventory icon.
- Stackability.
- Maximum stack.
- Pickup eligibility.
- Equipment eligibility.
- Inventory size.
- Spawn probability.
- Valid spawn locations.
- Gameplay configuration.

Weapons must reference existing weapon definitions.

Armor must reference centralized armor configuration.

Healing items must reference existing health and healing configuration.

Vehicles must reference centralized vehicle configuration.

Vehicle configuration must define:

- Vehicle ID.
- Display name.
- Vehicle category.
- World model.
- Vehicle rarity.
- Spawn probability.
- Valid spawn locations.
- Vehicle health.
- Maximum speed.
- Acceleration.
- Braking.
- Steering.
- Vehicle condition.
- Interaction configuration.

Do not duplicate item statistics in the UI.

Do not hardcode item values inside interaction handlers.

Do not hardcode loot probabilities inside map objects.

Do not hardcode vehicle positions inside vehicle controllers.

The configuration must be easy to balance.

---

# 37. SUGGESTED ITEM CONFIGURATION

Use the following as the initial design.

Inspect the existing game and preserve compatible values.

## Weapons

AK-47:

Reuse existing weapon.

M4:

Reuse existing weapon.

AWP:

Reuse existing weapon.

Do not invent new weapon implementations.

## Helmets

Helmet Level 1:

Common.

Basic protection.

Helmet Level 2:

Rare.

Improved protection.

Helmet Level 3:

Epic.

Best standard helmet protection.

## Armor

Kevlar Level 1:

Common.

Basic body protection.

Kevlar Level 2:

Rare.

Improved body protection.

Kevlar Level 3:

Epic.

Best standard body protection.

## Kevlar plates

Plate Level 1:

Common.

Plate Level 2:

Rare.

Plate Level 3:

Epic.

Maximum equipped plates:

3.

## Healing

Bandages:

Common.

Small health restoration.

Medical Kit:

Uncommon.

Larger health restoration.

## Backpack

Backpack Level 1:

Common.

Backpack Level 2:

Rare.

Backpack Level 3:

Epic.

## Vehicles

Cars:

Common to uncommon depending on vehicle type and location.

Motorbikes:

Common to uncommon depending on vehicle type and location.

Higher-performance or specialized vehicles must have controlled spawn probabilities.

All values must be centralized and configurable.

Do not change the specified equipment levels.

Do not add unnecessary equipment tiers.

---

# 38. MULTIPLAYER AND SERVER AUTHORITY

The loot system must work correctly in multiplayer.

The server must determine:

- Loot generation.
- Loot locations.
- Loot rarity.
- Loot quantities.
- Item pickup.
- Item ownership.
- Inventory contents.
- Equipment state.
- Armor durability.
- Helmet durability.
- Plate durability.
- Ammunition.
- Healing.
- Item drops.
- Player looting.
- Vehicle spawning.
- Vehicle occupancy.
- Vehicle movement.
- Vehicle collision.
- Vehicle health.
- Vehicle destruction.
- Vehicle entry.
- Vehicle exit.

The client must display the actual authoritative state.

Do not allow the client to create items.

Do not allow the client to duplicate items.

Do not allow the client to change item quantities.

Do not allow the client to equip invalid equipment.

Do not allow the client to pick up the same item twice.

Do not allow two players to obtain the same world item.

Do not allow the client to create vehicles.

Do not allow the client to manipulate vehicle health.

Do not allow the client to teleport vehicles.

Do not allow unauthorized vehicle occupancy.

Use the existing multiplayer architecture.

Do not introduce a separate networking system.

---

# 39. SECURITY AND EXPLOIT PREVENTION

Inspect the existing security and server validation architecture.

The system must prevent:

- Duplicate items.
- Duplicate ammunition.
- Negative ammunition.
- Unlimited inventory.
- Invalid equipment.
- Invalid armor levels.
- Invalid helmet levels.
- More than 3 equipped plates.
- Equipping items that do not exist.
- Picking up unavailable items.
- Dropping items the player does not own.
- Using healing items the player does not possess.
- Invalid equipment replacement.
- Client-side loot generation.
- Client-side durability manipulation.
- Client-side vehicle spawning.
- Client-side vehicle teleportation.
- Client-side vehicle speed manipulation.
- Invalid vehicle entry.
- Invalid vehicle exit.
- Duplicate vehicle occupancy.

The server must validate all important inventory and vehicle actions.

Do not trust client-provided item quantities.

Do not trust client-provided equipment state.

Do not trust client-provided armor values.

Do not trust client-provided loot positions.

Do not trust client-provided vehicle positions.

Do not trust client-provided vehicle health.

Use the existing security architecture.

---

# 40. TESTING REQUIREMENTS

Implement proper tests using the existing testing architecture.

Do not report success because the inventory UI renders.

Test actual gameplay.

## Loot tests

- Loot generates at match start.
- Loot locations vary between matches.
- Loot is distributed across the map.
- Cities have higher loot density.
- Residential areas have appropriate loot density.
- Military areas have better loot probabilities.
- Loot does not spawn inside invalid geometry.
- Loot does not spawn outside the map.
- Loot does not duplicate.
- Loot can be picked up using E.
- Loot disappears after successful pickup.
- Loot cannot be picked up twice.

## Weapon tests

- AK-47 uses the existing weapon implementation.
- M4 uses the existing weapon implementation.
- AWP uses the existing weapon implementation.
- Weapons can be picked up.
- Weapons can be equipped.
- Weapons can be switched.
- Weapons can be dropped.
- Ammunition remains correct.
- Existing weapon animations remain functional.
- Existing weapon damage remains functional.

## Helmet tests

- Level 1 helmet protects correctly.
- Level 2 helmet provides better protection.
- Level 3 helmet provides better protection.
- Helmet durability works.
- Helmet destruction removes protection.
- Helmet replacement works.
- Helmet levels are correctly displayed.

## Armor tests

- Level 1 armor works.
- Level 2 armor provides better protection.
- Level 3 armor provides better protection.
- Armor durability works.
- Armor replacement works.
- Armor destruction removes protection.
- Armor levels are correctly displayed.

## Kevlar plate tests

- Player can equip 1 plate.
- Player can equip 2 plates.
- Player can equip 3 plates.
- Player cannot equip a fourth plate.
- Plate durability works.
- Plate destruction works.
- Plate replacement works.
- Plate inventory quantities remain correct.
- Armor protection remains valid.

## Healing tests

- Bandages can be picked up.
- Bandages can be stacked.
- Bandages can be used.
- Medical kits can be picked up.
- Medical kits can be used.
- Healing respects maximum health.
- Healing consumes the correct item.
- Healing interruption works.
- Dead players cannot heal.

## Inventory tests

- I opens inventory.
- I closes inventory.
- Escape closes inventory.
- Equipment is displayed correctly.
- Weapons are displayed correctly.
- Armor is displayed correctly.
- Helmets are displayed correctly.
- Kevlar plates are displayed correctly.
- Backpack is displayed correctly.
- Healing items are displayed correctly.
- Equipment can be replaced.
- Items can be dropped.
- Inventory capacity is respected.
- Items cannot be duplicated.

## Vehicle tests

- Cars spawn correctly.
- Motorbikes spawn correctly.
- Vehicle locations vary between matches.
- Vehicle density reflects map locations.
- Vehicles do not spawn inside buildings.
- Vehicles do not spawn inside obstacles.
- Vehicles do not spawn outside the map.
- Vehicles can be entered using E.
- Vehicles can be driven.
- Vehicles can be exited using E.
- Vehicle collision works.
- Vehicle camera works.
- Vehicle HUD works.
- Vehicle health works.
- Destroyed vehicles cannot be driven.
- Vehicles cannot be duplicated.
- Two players cannot occupy the same driver seat.
- Vehicle state synchronizes correctly.
- Disconnecting does not leave stale vehicle occupancy.

## Multiplayer tests

Test at least two players.

Verify:

- Loot is synchronized.
- Item pickup is authoritative.
- Inventory is independent.
- Equipment is independent.
- Armor durability is synchronized.
- Helmet durability is synchronized.
- Plate durability is synchronized.
- Weapon ammunition is synchronized.
- Healing is synchronized.
- Item drops are synchronized.
- Two players cannot pick up the same item.
- Disconnects do not duplicate loot.
- Death does not duplicate equipment.
- Vehicle positions synchronize correctly.
- Vehicle occupancy is synchronized.
- Vehicle health is synchronized.
- Vehicle destruction is synchronized.
- Vehicle entry and exit are authoritative.

---

# 41. IMPLEMENTATION ORDER

PHASE 1:

Inspect the existing game architecture.

Identify the existing weapons, inventory, player state, interaction system, map geometry, vehicle architecture, multiplayer architecture and UI.

PHASE 2:

Implement centralized item configuration.

Implement item IDs, item categories, rarity, equipment eligibility, inventory capacity and item metadata.

PHASE 3:

Implement match-specific loot generation.

Create randomized loot locations across the existing map.

Implement location-specific loot density.

Implement valid world placement.

PHASE 4:

Integrate existing AK-47, M4 and AWP.

Implement battle royale weapon pickup and inventory integration.

PHASE 5:

Implement helmet levels 1, 2 and 3.

Integrate helmet protection and durability.

PHASE 6:

Implement armor levels 1, 2 and 3.

Integrate armor protection and durability.

PHASE 7:

Implement 3 Kevlar plate slots.

Integrate plate durability, protection and replacement.

PHASE 8:

Implement bandages, medical kits and healing inventory.

Integrate with existing health and healing systems.

PHASE 9:

Implement backpack levels.

Integrate inventory capacity and replacement.

PHASE 10:

Implement cars and motorbikes.

Integrate vehicle assets, vehicle spawning, driving, collision, entry, exit and multiplayer synchronization.

PHASE 11:

Build the inventory interface.

Implement I, E interactions, item selection, equipment replacement, item inspection, dropping and quick access.

PHASE 12:

Implement vehicle interaction prompts and vehicle HUD.

PHASE 13:

Integrate player death and loot dropping.

Ensure all dropped items represent actual player inventory.

PHASE 14:

Implement multiplayer validation and synchronization.

PHASE 15:

Run the existing tests.

Add loot, inventory, weapon, armor, healing, vehicle and multiplayer tests.

PHASE 16:

Optimize performance.

Verify the complete system inside the actual browser game.

---

# 42. FINAL ACCEPTANCE CRITERIA

The feature is complete only when:

## Loot

- Loot is spread across the entire map.
- Cities have higher loot density.
- Residential areas have appropriate loot.
- Loot changes every match.
- Loot is randomized.
- Loot uses the existing map.
- Loot has valid world placement.
- There are no normal loot boxes.
- Players can pick up items using E.

## Weapons

- Existing AK-47 is reused.
- Existing M4 is reused.
- Existing AWP is reused.
- Weapon models remain correct.
- Weapon animations remain correct.
- Weapon sounds remain correct.
- Weapon gameplay remains correct.
- Inventory integration works.

## Helmets

- Level 1 exists.
- Level 2 exists.
- Level 3 exists.
- Higher levels are rarer.
- Higher levels provide better protection.
- Helmet durability works.
- Helmet replacement works.

## Armor

- Level 1 exists.
- Level 2 exists.
- Level 3 exists.
- Higher levels are rarer.
- Higher levels provide better protection.
- Armor durability works.
- Armor replacement works.

## Kevlar plates

- Exactly 3 equipped plate slots.
- Three plates can be equipped simultaneously.
- A fourth plate cannot be equipped.
- Plate levels exist.
- Plate durability works.
- Plate protection works.
- Plate replacement works.

## Healing

- Bandages work.
- Medical kits work.
- Healing items can be picked up.
- Healing items can be used.
- Healing items are displayed in inventory.
- Healing respects existing health rules.

## Inventory

- I opens the inventory.
- I closes the inventory.
- Escape closes the inventory.
- All equipment is displayed.
- Equipment can be replaced.
- Items can be dropped.
- Inventory capacity works.
- The interface is clean and readable.

## Vehicles

- Cars exist.
- Motorbikes exist.
- Vehicles spawn throughout the existing map.
- Vehicle locations change every match.
- Cities and residential areas have appropriate vehicle density.
- Vehicles use valid world placement.
- Players can enter using E.
- Players can drive.
- Players can exit using E.
- Vehicle collision works.
- Vehicle physics work.
- Vehicle camera works.
- Vehicle HUD works.
- Vehicle health works.
- Destroyed vehicles cannot be driven.
- Vehicles synchronize correctly in multiplayer.

## Multiplayer

- Loot is server-authoritative.
- Pickup is server-authoritative.
- Equipment is server-authoritative.
- Armor is server-authoritative.
- Healing is server-authoritative.
- Vehicle spawning is server-authoritative.
- Vehicle movement is server-authoritative.
- No duplicated items.
- No duplicated ammunition.
- No invalid equipment.
- No unauthorized inventory changes.
- No unauthorized vehicle changes.

## Performance

- No unnecessary rendering loops.
- No unnecessary polling.
- No unnecessary network traffic.
- No memory leaks.
- No significant FPS regression.
- Vehicles do not create unnecessary physics overhead.

## Existing game

- Existing map remains intact.
- Existing 1v1 remains intact.
- Existing 5v5 remains intact.
- Existing weapon systems remain intact.
- Existing player movement remains intact.
- Existing multiplayer remains intact.

---

# 43. FINAL INSTRUCTIONS

Implement the complete loot, inventory, armor, healing and vehicle system in the existing game.

Do not stop after creating the inventory interface.

Do not stop after placing weapons on the ground.

Do not stop after implementing randomized item positions.

Do not stop after making helmets appear in the inventory.

Do not stop after creating armor icons.

Do not stop after creating vehicle models.

Do not stop after making vehicles move visually.

All items must be connected to actual gameplay.

All equipment must work.

All item pickups must work.

All inventory actions must work.

All armor calculations must work.

All healing must work.

All vehicles must work.

All vehicle interactions must work.

All multiplayer synchronization must work.

Do not rebuild the entire game.

Do not replace the existing weapons.

Do not create a separate weapon system.

Do not create loot boxes.

Do not introduce unnecessary map redesign.

Do not create temporary workarounds.

Do not use visual-only armor.

Do not use client-authoritative gameplay calculations.

Do not create duplicate inventory systems.

Do not create duplicate vehicle systems.

Do not change unrelated gameplay.

If an existing system is missing, implement the smallest proper extension required.

If an existing system can be reused, reuse it.

If a requirement cannot be implemented correctly, explain the actual technical blocker.

## FINAL REPORT

After implementation, report:

1. Files created.
2. Files modified.
3. Existing weapon systems reused.
4. Loot generation architecture.
5. How random loot changes between matches.
6. How loot density works across cities and residential areas.
7. How item pickup using E works.
8. How inventory using I works.
9. How the 3 helmet levels work.
10. How the 3 armor levels work.
11. How the 3 Kevlar plate slots work.
12. How healing works.
13. How backpack capacity works.
14. How cars and motorbikes spawn.
15. How vehicle driving and entry/exit work.
16. How vehicle collision and damage work.
17. How multiplayer synchronization works.
18. Which tests were executed.
19. Actual test results.
20. Build and lint results.
21. Any remaining issues.

Do not claim that multiplayer is verified unless it has actually been tested.

Do not claim that the loot system is complete unless the items can actually be picked up, equipped, used and synchronized.

Do not claim that vehicles are functional unless players can actually enter, drive, exit and interact with them inside the game.

**BUILD A COMPLETE, MODERN, RANDOMIZED BATTLE ROYALE LOOT, INVENTORY AND VEHICLE SYSTEM USING THE EXISTING GAME.**

**PRESERVE THE EXISTING FPS GAMEPLAY.**

**NO NORMAL LOOT BOXES. RUN, LOOK AT THE ITEM, PRESS E, PICK IT UP, AND KEEP PLAYING.**

**CARS AND MOTORBIKES MUST BE RANDOMLY DISTRIBUTED THROUGHOUT THE MAP AND FULLY DRIVEABLE.**

**PRESS E TO ENTER OR EXIT VEHICLES.**

**DO NOT REBUILD THE GAME AROUND THIS FEATURE.**
