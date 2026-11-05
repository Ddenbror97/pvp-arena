# Perks: what is fun and fair (research for PERKS-SPEC.md)

Owner request (2026-11-03): "research what perks will be fun and fair to use". The spec fixes 10 perks and their values; this note rates each against how comparable games fared and against our own numbers, and recommends what to keep, guard or change. Nothing here changes the spec on its own: the owner decides.

## What other games learned

- **Raw damage perks break balance.** Call of Duty's Stopping Power (extra bullet damage) is the classic case. Treyarch's design director said it "isn't a viable solution" to weapon balance: balance should come from the weapons' own tuning [1]. Warzone first reduced how often its Stopping Power rounds spawned, then removed them entirely in the Pacific update [2][3].
- **Information perks get nerfed when they are mandatory.** Warzone's Ghost (hidden from radar) was so dominant in its slot that nothing else was picked. It was changed to work only while moving, with an on-screen indicator, to open up other choices [4].
- **Small utility perks are the healthy ones.** Faster reload (Sleight of Hand), faster weapon swap (Fast Hands), faster healing (Quick Fix) and armour perks (Tempered) are the long-lived Warzone staples. They shorten windows of vulnerability without changing how many hits a kill takes [5].
- **Earned in the match, visible to opponents.** Apex Legends' Season 20 upgrades are earned during the match, not before it [6]. That keeps a fresh drop fair, and others can see what you have.

## Our numbers (src/lib/fps)

- **Health and rifle damage:** 100 health. The rifle does 34 to the head and chest, 30 to the stomach and 20 to the legs (combat.ts `HIT_DAMAGE`, the modern table: three head hits at full health). Correction 2026-11-03: an earlier version of this note said ×3 to the head; that is the old table.
- **Deadly Bullets (+15%):**
  - chest 34 → 39.1: still 3 hits;
  - legs 20 → 23: still 5 hits;
  - head 34 → 39.1: still 3 hits;
  - **stomach 30 → 34.5: 4 hits → 3 hits** (3 × 34.5 = 103.5).

  So the perk changes a real kill threshold. Once helmets and plates arrive (LOOT-SPEC), it will shift more of them.

- **AWP:** already one-shots most hits, so the perk does little there.

## Rating the 10 perks

| #   | Perk (spec value)                          | Fun        | Fair                                                                      | Recommendation                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Deadly Bullets (+15% damage)               | High       | **Low**: changes hits-to-kill (stomach 4 → 3); the Stopping Power problem | Keep for free practice as the spec says. **Before paid matches, consider** +15% only against armour/plates (armour damage), or 8–10%, or making it the tablet's rarest perk.                                                                                                                                          |
| 02  | Faster Reload (−20%)                       | High       | Good                                                                      | Keep. The gameplay reload time and the animation shorten together (spec).                                                                                                                                                                                                                                             |
| 03  | Ammo Efficiency (10% chance)               | Low/medium | Good (small, server-rolled)                                               | Keep. Roll on the server with the match seed so it cannot be gamed.                                                                                                                                                                                                                                                   |
| 04  | Armor Specialist (+15% effectiveness)      | Medium     | Medium: stacks with Deadly Bullets' opposite                              | Keep. Apply to plate/armour durability only, not as a second damage reduction (spec).                                                                                                                                                                                                                                 |
| 05  | Fast Revive (−30%)                         | — today    | —                                                                         | **Has no effect yet**: the BR is solo (no teammates or revives until squads, Phase 5). Show it as "squads only" or hold it back until squads exist.                                                                                                                                                                   |
| 06  | Adrenaline Chip (−25% sprint recovery)     | Medium     | Good                                                                      | **No sprint stamina exists today** (sprint is unlimited in the shared movement). Adding stamina only to give this perk something to change would alter the base feel of every mode. Options: add stamina to the BR only (and tune it), or swap the effect for "+10% sprint duration" once stamina exists. Owner call. |
| 07  | Combat Chip (−20% weapon switch)           | Medium     | Good                                                                      | Keep (Fast Hands equivalent).                                                                                                                                                                                                                                                                                         |
| 08  | Recon Chip (gunfire direction in a radius) | High       | Good _if_ it gives only what sound already gives                          | Keep, within the existing hearing ranges (shot 70 m): a direction cue, never a position, never through walls beyond what audio implies. Do not send anything the 5v5 audio redaction would not.                                                                                                                       |
| 09  | Survival Chip (−20% healing time)          | High       | Good                                                                      | Keep (Quick Fix equivalent).                                                                                                                                                                                                                                                                                          |
| 10  | Scavenger Chip                             | Medium     | Good                                                                      | Keep (loot quality-of-life).                                                                                                                                                                                                                                                                                          |

## How the tablet should work (fairness)

- **One tablet, many perks?** The spec makes the tablet rare. If perks only come from a rare item, luck decides more of the match. Two ways to keep that in check:
  1. Put tablets where risk is high (hot drops, airdrops), so the reward follows the risk.
  2. Make perks lootable: a dead player's tablet drops with their gear (spec §18 looting), so perks change hands through fights.
- **Visible:** show an opponent's active perks on their kill card or when spectating, as Warzone and Apex do, so a loss is explainable.
- **Server-authoritative values in one config file** (spec §13), with the 15% / 20% / 30% values there, so tuning after playtests is one line.
- **Paid matches:** the plan keeps paid BR for later (Phase 5). Before then, decide whether perks are on in paid lobbies. Raw damage (01) is the one to settle first.

## Assets

The spec's tablet model ("iPad Mini", Graham Rust) is under the Sketchfab Standard licence, not CC0 / CC BY, so it is not used (owner rule). It is also Apple's product design and trademark. The tablet will be an original low-poly "Tactical Tablet" built in code (cheap to draw) unless a CC0 / CC BY tablet arrives.

## Sources

1. [CoD Dev: "Stopping Power Isn't a Viable Solution" to Perk and Weapon Balance (MP1st)](https://mp1st.com/features/cod-dev-stopping-power-isnt-a-viable-solution-to-perk-and-weapon-balance)
2. [Warzone devs explain why they've reduced Stopping Power spawn rates (Charlie INTEL)](https://www.charlieintel.com/call-of-duty-warzone/warzone-devs-explain-why-theyve-reduced-stopping-power-spawn-rates-103070/)
3. [Warzone Pacific update will nerf Dead Silence and remove Stopping Power (The Loadout)](https://www.theloadout.com/call-of-duty-warzone/stopping-power-removed)
4. [Ghost nerf and 4 more wild Warzone perk changes (Inverse)](https://inverse.com/gaming/warzone-perk-changes)
5. [Best perks in Warzone (Pro Game Guides)](https://progameguides.com/call-of-duty/best-perks-in-warzone/)
6. [Apex Legends' New Upgrade System Makes Balancing Heroes Easier (GameSpot)](https://Gamespot.Com/articles/apex-legends-new-upgrade-system-makes-balancing-heroes-easier/1100-6523139/)
