# Battle Royale reference research: H1Z1 KotK, PUBG EA, Warzone Verdansk

Researched 2026-11-03, using web sources only. **Tags:** `SRC` = stated by the developer or official patch notes. `EST` = community-measured or approximate. `DERIVED` = my arithmetic on a sourced table. `PICK` = no source found, so this is a design choice and not a historical fact. Bracketed numbers like [3] point to the Sources list.

## 1. Recommended defaults

| Parameter | Recommended default | Basis | Tag |
|---|---|---|---|
| Lobby size | 100 (PUBG) to 150 (H1Z1/Warzone) | PUBG: 100 people per match [9][10]. H1Z1 KotK solo: "149 other players" [1][14]. Warzone: 150 [20] | SRC |
| Min players / countdown | e.g. 60 s countdown; start at ≥50% full | No 2017 PUBG countdown or min-player figure found. H1Z1 (May 2016) held everyone until all clients loaded, with a 45 s cap for slow loaders, then parachuted everyone at once [3] | PICK (45 s load cap is SRC) |
| Map size | 8×8 km | Erangel is 8×8 km [11]. H1Z1's original KotK map size was never stated; its 2018 replacement, Outbreak, was 8×8 km [15] | SRC |
| Jump window opens | ~10 s after the plane spawns | PUBG wiki: jumping is possible about 10 s after entering the plane [8] | EST |
| Plane altitude / speed | **not found** | No PUBG source gives plane altitude or speed (C-130 wiki lists speed "N/A") [10] | PICK |
| Plane path | Random straight line across the map | Flight path is randomized each game [5] | SRC (qualitative) |
| Freefall, neutral | 180 km/h vertical | Appuals, Sep 2017 [5] | EST |
| Freefall, slow/glide (look up + W) | 126 km/h vertical, 122 km/h lateral | [5]. The fandom wiki also gives 126 km/h [6] | EST |
| Freefall, dive | 234 km/h | [5]. Other measurements: ~232 [7], 230 [12], 235 (Steam, Apr 2017) [13] | EST |
| Parachute auto-deploy | 300 m above the terrain below (AGL), not sea level | [5]. PC Gamer confirms the threshold rises over high terrain but gives no number [7] | EST |
| Parachute, neutral | 54 km/h descent | [5] | EST |
| Parachute, forward | 64 km/h descent, 47 km/h lateral | [5]. ~60–64 km/h cap [7] | EST |
| Max horizontal travel from path | ~1–3 km (sources conflict) | Up to 3 km with ~2 min airtime [5]. ~1 km [16]. Note that PUBG overhauled parachuting in Dec 2018, so later numbers differ [6] | EST |
| Circle phases | 9 phases, PUBG Erangel table below | [8] | SRC/EST |
| Out-of-zone damage | Ramps from 0.4 to 11 %HP/s (PUBG) | [8]. From 24 Oct 2017, damage also grows with distance outside the zone, except in phase 1 [17][18] | EST |
| Airdrops | 1 C-130 per drop, random time, random point on path | Plane audible well before the drop; crate on one parachute; red smoke on landing [19] | SRC (qualitative) |
| Airdrop count | **not found** for 2017 | No per-match count published | PICK (e.g. 3–5 for 100 players) |
| Red zone | One at a time, random location, possibly outside the safe zone; buildings protect | [21][22]. No radius or duration found | SRC (qualitative) |

### Circle table: PUBG Erangel (scale radii ×1.25 for a 10 km map)

Sourced from pubg.wiki.gg, which cites battlegrounds.party; damage values are before the distance multiplier [8]. Shrink seconds and radius are **DERIVED** by me as total − delay − wait, and diameter ÷ 2. The derived numbers check out: listed shrink rate × my shrink time equals the change in diameter for every phase.

| Phase | Wait (s) | Shrink (s) | End radius (m) | DPS (%HP/s) |
|---|---|---|---|---|
| 1 | 120 delay + 270 | 300 | 1,997 | 0.4 |
| 2 | 180 | 120 | 1,198 | 0.6 |
| 3 | 130 | 90 | 659 | 0.8 |
| 4 | 120 | 60 | 362 | 1.0 |
| 5 | 100 | 60 | 181 | 3 |
| 6 | 90 | 30 | 91 | 5 |
| 7 | 70 | 30 | 45 | 7 |
| 8 | 60 | 30 | 23 | 9 |
| 9 | 30 + 30 | 30 | 0 | 11 |

The radius ratio between phases is about 0.60, then 0.55, 0.55, and 0.5 for the rest. The whole match runs about 32.5 min.

**Era caveat:** the table is undated. Before phase 9 it shows a 180 s + 15 s (195 s) wait, and Update #10 (Apr 2018) cut exactly that wait from 195 s to 90 s [23]. So the table is **pre-April 2018**, which likely means the late-2017 / 1.0 ruleset. I could not confirm the March 2017 launch values.

**Warzone Verdansk (2020) for comparison.** Patch 1.20, May 2020, wait / close [24]: 3:40/4:30, 1:30/3:40, 1:15/2:50, 1:00/1:50, 1:00/1:10, 0:45/0:50, 0:30/0:50, with full closure at about 27:00. A Reddit-sourced estimate from Apr 2020 is close to this [25]. Gas damage is flat at roughly 8.5 HP/s and ignores armour: a player without a mask survives about 12 s, and a gas mask doubles that [24]. **EST.**

## 2. H1Z1 King of the Kill specifics

- **Players:** 150 in KotK solo, 2016–17 [1][14][26]. The 2015 Battle Royale prototype had about 70–80 players at first [27], and a guide from Feb 2015 says 200 [28].
- **Insertion:** There was no player-chosen plane jump. All players were parachuted in at the same time [3][4][29], at a random location [26], and you could steer the chute but not cross the map [29]. PCGamesN says there was no skydiving phase [30]. From June 2017, spawns were placed relative to the first gas ring [31]. I found **no altitude or speed data**.
- **Gas:** A green toxic cloud [30]. Being inside it builds up toxicity, which damages you and slows healing [1]. Early gas is survivable for a long time, and healing items can offset it [30][32]. Damage rises sharply in later stages, and a red flare on the HUD marks each damage tick [29]. From Sep 2016 the first ring appeared at the 2:00 mark and was slightly larger [2]. From June 2017 phase durations scaled with players remaining, and final circles could land anywhere on the map [31][33]. **No DPS numbers were ever published.**
- **Airdrops:** In the 2015 BR, a cargo plane dropped a crate that left a trail of smoke; the colour is unspecified [27]. In H1Z1 *survival* mode (Jan 2015, not BR), players paid to call drops, and the plane trailed green smoke [34]. KotK made Air Drop tickets worthless (Sep 2016) [2], so KotK drops were apparently game-spawned; this is my inference. Drops carried top gear: laminated armour was guaranteed in crates from June 2017 [33]. Ignition mode spawned "special airdrops" at ring locks [3]. KotK also had **bombing runs**, which stopped when fewer than 20 players remained [31].
- **Loot density:** Never quantified. Loot was random inside buildings and campsites [30][28]. One spacing rule is documented: laminated armour never spawns within 250 m of another [31].

**Not retrievable:** the "KotK glossary / new UI features (Sept 2016)" post. The fetch tool blocked both that page and its archive.org copies. The "Solo gameplay 101" and "Producer's update May 18th" posts were read [1][3].

## 3. Design notes: what felt "old-school"

- **Long sightlines and long fights.** 8×8 km maps, a 1,997 m first-circle radius, and slow early damage (0.4 %/s) let players fight at range and rotate late. H1Z1 players deliberately sat in early gas to catch late rotators [30]. Keep early damage low enough that "edge play" is a valid tactic.
- **Brutal late game.** Damage jumps about 25× from phase 1 to 9, and PUBG made it scale with distance outside the zone [17]. Final circles that can land anywhere, including hard terrain such as the dam, stop the map centre from being solved [33].
- **Airdrops as bait.** The plane is audible well before the drop, the crate drifts slowly on one chute, and red smoke marks the landing [19]. Exclusive top-tier gear makes them worth the risk, from early 2015 [34][27] through 2017 [33].
- **Shared start.** In H1Z1 everyone landed at the same moment [3]. PUBG's 1 to 3 km glide made the jump itself a skill choice.
- **Warzone POI lessons:** Players died crossing open ground between POIs, so Raven made Verdansk '84 "denser" at the same size and added covered traversal [35]. Superstore became "too campy" because players inside were hard to flush out [35]. POI archetypes [36]: a maze-like big-box store (Superstore); 30+ low garages with climbable roofs and ambush alleys (Storage Town); an airport with a control-tower sniper perch, terminals, and an underground road; a plateau military base with hangars, barracks, and a killhouse; and a downtown with the most vertical and horizontal mixing (broadcast tower, City Hall, museum roof). Source [36] describes the 2025 rebuild, which its developers call faithful to the 2020 design [37].

## Sources

1. https://www.h1z1.com/news/kotk-solo-gameplay-experience-101-september-2016
2. https://www.h1z1.com/news/producers-letter-new-map-new-ui-september-2016
3. https://www.h1z1.com/news/producers-update-may-18th (18 May 2016)
4. https://www.h1z1.com/news/h1z1-producers-update-may5
5. https://appuals.com/playerunknowns-battlegrounds-skydiving-parachuting-guide/ (Sep 2017)
6. https://pubg.fandom.com/wiki/Parachute
7. https://pcgamer.com/pubg-how-to-land-fast-battlegrounds
8. https://pubg.wiki.gg/wiki/The_Playzone
9. https://www.gameinformer.com/b/news/archive/2018/01/25/playerunknowns-battlegrounds-changes-chaotic-pregame-lobbies-to-help-performance.aspx
10. https://pubg.wiki.gg/wiki/C-130
11. https://pubg.wiki.gg/wiki/Erangel_(Classic)
12. https://samurai-gamers.com/playerunknowns-battlegrounds-pubg/parachuting-strategy-guide/
13. https://steamcommunity.com/app/578080/discussions/1/135513421440990897
14. https://www.tomsguide.com/us/h1z1-pax-west-hands-on,news-25773.html
15. https://www.pcgamer.com/h1z1-outbreak/
16. https://www.gamepressure.com/playerunknowns-battlegrounds/the-landing/zaa12f
17. https://www.pcgamer.com/au/pubgs-deadlier-blue-zone-has-arrived-the-farther-you-are-from-safety-the-more-damage-you-take
18. https://samurai-gamers.com/playerunknowns-battlegrounds-pubg/october-battlegrounds-patch-notes/
19. https://pubg.wiki.gg/wiki/Airdrop
20. https://www.ggrecon.com/articles/warzone-200-players
21. https://support.pubg.com/hc/en-us/articles/115004198974-What-is-the-red-zone
22. https://www.gamepressure.com/playerunknowns-battlegrounds/red-zone/zba136
23. https://mp1st.com/news/pubg-update-10-pc-patch-notes-blue-zone-tweaks-miramar-improvements-more
24. https://mein-mmo.de/en/cod-warzone-all-information-about-gas-gas-mask-and-tips-for-survival,502973
25. https://www.charlieintel.com/call-of-duty-warzone/circle-closing-times-adjusted-in-new-warzone-update-60405/
26. https://www.gamegrin.com/previews/h1z1-king-of-the-kill-gamescom-preview/
27. https://www.pcgamer.com/h1z1-diary-part-3-battle-royale
28. https://gameranx.com/features/id/26498/article/h1z1-top-8-tips-to-winning-battle-royale-guide
29. https://www.tentonhammer.com/guides/h1z1-how-to-throw-down-in-a-battle-royal.amp
30. https://www.pcgamesn.com/h1z1-king-of-the-kill/h1z1-king-of-the-kill-guide-graphics-settings-weapons-tips
31. https://www.pcgamer.com/h1z1-update-adds-new-nighttime-skirmish-and-team-scoring
32. https://www.stackup.org/post/king-of-the-kill-beginners-guide
33. https://www.thesixthaxis.com/?p=291437 (also https://www.altchar.com/game-news/h1z1-king-of-the-kill-update-gas-system-redesigned-a2Zhu1B43rmo)
34. https://www.tentonhammer.com/editorial/h1z1-airdrops-lets-gain-some-perspective
35. https://www.videogameschronicle.com/features/interviews/warzone-verdansk-84/
36. https://www.callofduty.com/blog/2025/03/call-of-duty-warzone-verdansk-map-tour-intel-drop
37. https://jamtest.dexerto.com/call-of-duty/warzone-devs-reveal-how-verdansk-remake-is-faithful-to-original-design-3168711
